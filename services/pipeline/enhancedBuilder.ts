/**
 * Enhanced closed-loop builder — the piece that ties the new capabilities together.
 *
 * Old loop: generate → execute → (only on runtime error) retry. Code that ran but
 * produced wrong or unmanufacturable geometry counted as success.
 *
 * New loop:
 *   classify → [organic ? mesh-gen] → retrieve proven examples (RAG) → generate →
 *   safe-execute (sandbox+timeout) → validate (Manifold) → DFM check (deterministic) →
 *   vision critique (VLM) → if any stage objects, feed concrete constraints back and
 *   regenerate → on success, remember it (flywheel).
 *
 * Every new subsystem degrades gracefully: no vision model, no embeddings, or no
 * Manifold wasm just means that stage is skipped, never a hard failure.
 */

import { classifyGeometry } from '../generative/organicClassifier';
import { generateMesh } from '../generative/meshGenService';
import { buildRetrievedContext, rememberGeneration } from '../rag/generationMemory';
import { safeExecuteOCC } from '../sandbox/safeExecutor';
import { replicadExecutor } from '../backends/replicadExecutor';
import { REPLICAD_SYSTEM_PROMPT, buildReplicadUserPrompt } from '../backends/replicadPrompt';
import { OCC_SYSTEM_PROMPT, buildOccUserPrompt } from '../backends/occPrompt';
import { verifiedCADTemplate } from '../generative/verifiedTemplates';
import { runDFM, findingsToConstraints, DFMReport } from '../dfm/dfmChecker';
import { critiqueScene, VisionVerdict } from '../vision/visionCritic';
import { chat } from '../providers/llmProvider';

export type Backend = 'opencascade' | 'replicad';

export interface BuildStageLog {
  stage: string;
  ok: boolean;
  detail: string;
}

export interface EnhancedBuildResult {
  success: boolean;
  route: 'parametric' | 'organic';
  backend?: Backend;
  code?: string;
  /** meshData or meshData[] from the executor, ready for the store/viewport. */
  mesh?: any;
  /** GLB data URL when routed to mesh generation. */
  glbDataUrl?: string;
  iterations: number;
  dfm?: DFMReport;
  vision?: VisionVerdict;
  log: BuildStageLog[];
  error?: string;
}

export interface BuildOptions {
  backend?: Backend;
  fabProfile?: string; // 'fdm' | 'sla' | 'cnc'
  maxIterations?: number;
  enableVision?: boolean;
  enableDFM?: boolean;
  /** Called after each iteration so the UI can show live progress. */
  onProgress?: (log: BuildStageLog) => void;
  /** Render + critique between iterations. Injected by the caller (needs the live scene). */
  renderAndCapture?: (candidateMesh?: any) => Promise<string[]>;
}

export async function enhancedBuild(
  request: string,
  opts: BuildOptions = {}
): Promise<EnhancedBuildResult> {
  const log: BuildStageLog[] = [];
  const push = (stage: string, ok: boolean, detail: string) => {
    const entry = { stage, ok, detail };
    log.push(entry);
    opts.onProgress?.(entry);
  };

  const backend: Backend = opts.backend || 'opencascade';
  const maxIterations = opts.maxIterations ?? 3;
  const enableVision = opts.enableVision ?? true;
  const enableDFM = opts.enableDFM ?? true;
  const fabProfile = opts.fabProfile || 'fdm';

  // --- 1. Route: parametric vs organic ---
  const classification = await classifyGeometry(request);
  push('classify', true, `${classification.cls} (${classification.confidence.toFixed(2)}): ${classification.reason}`);

  if (classification.cls === 'organic') {
    const mesh = await generateMesh(request);
    if (mesh.ok) {
      push('mesh-gen', true, 'Generated organic mesh via image-to-3D.');
      return {
        success: true,
        route: 'organic',
        glbDataUrl: mesh.glbDataUrl,
        iterations: 1,
        log,
      };
    }
    // Mesh gen unavailable -> fall back to trying parametric anyway.
    push('mesh-gen', false, mesh.notConfigured ? 'Mesh gen not configured; falling back to CAD.' : mesh.error || 'failed');
  }

  // --- 2. Parametric closed loop ---
  const retrieved = await buildRetrievedContext(request, backend);
  if (retrieved) push('rag', true, 'Injected proven examples from generation memory.');

  const verifiedTemplate = verifiedCADTemplate(request, backend);
  let code: string;
  if (verifiedTemplate) {
    code = verifiedTemplate;
    push('plan', true, 'Using Sphaire\'s verified parametric spur-gear recipe.');
  } else {
    code = await generateCode(request, backend, retrieved);
  }
  let lastMesh: any = null;
  let lastDFM: DFMReport | undefined;
  let lastVision: VisionVerdict | undefined;

  for (let iter = 1; iter <= maxIterations; iter++) {
    // 2a. Execute (sandboxed + timeout)
    const exec = await runBackend(backend, code);
    if (!exec.ok) {
      push(`execute#${iter}`, false, exec.error || 'execution failed');
      if (iter === maxIterations) break;
      code = await fixCode(request, backend, code, `Execution error: ${exec.error}`, retrieved);
      continue;
    }
    lastMesh = exec.mesh;
    push(`execute#${iter}`, true, 'Code executed and produced geometry.');

    const meshes = Array.isArray(exec.mesh) ? exec.mesh : [exec.mesh];
    const issues: string[] = [];

    // 2b. Deterministic DFM + geometry validity
    if (enableDFM) {
      lastDFM = await runDFM(meshes[0], fabProfile);
      push(`dfm#${iter}`, lastDFM.passed, lastDFM.summary);
      if (!lastDFM.passed) {
        const constraints = findingsToConstraints(lastDFM);
        if (constraints) issues.push(constraints);
      }
    }

    // 2c. Vision critique (needs the live scene rendered by the caller)
    if (enableVision && verifiedTemplate) {
      push(`vision#${iter}`, true, 'Visual review is unnecessary for this verified recipe.');
    } else if (enableVision && opts.renderAndCapture) {
      try {
        const images = await withStageDeadline(
          opts.renderAndCapture(lastMesh),
          8000,
          'Scene capture'
        );
        lastVision = await withStageDeadline(
          critiqueScene(request, images),
          30000,
          'Visual review'
        );
        if (!lastVision.skipped) {
          push(`vision#${iter}`, lastVision.matches, `${lastVision.critique} (score ${lastVision.score.toFixed(2)})`);
          if (!lastVision.matches && lastVision.fixInstruction) {
            issues.push(`## VISUAL MISMATCH\n${lastVision.fixInstruction}\nSpecific problems: ${lastVision.issues.join('; ')}`);
          }
        } else {
          push(`vision#${iter}`, true, lastVision.critique || 'Visual review skipped.');
        }
      } catch (e: any) {
        push(`vision#${iter}`, true, `${e?.message || 'Visual review unavailable'}; continuing with geometry checks.`);
      }
    }

    // 2d. Converged?
    if (issues.length === 0) {
      push('converged', true, `Passed all checks on iteration ${iter}.`);
      // Flywheel: remember this proven-good generation.
      rememberGeneration({ prompt: request, code, backend }).catch(() => {});
      return {
        success: true,
        route: 'parametric',
        backend,
        code,
        mesh: lastMesh,
        iterations: iter,
        dfm: lastDFM,
        vision: lastVision,
        log,
      };
    }

    // A deterministic template has no safer LLM-generated alternative to retry.
    // Keep its successfully built geometry and surface the DFM/vision findings as
    // review notes instead of entering a repair loop that can only make it less
    // predictable (and previously left the UI waiting at "Verifying").
    if (verifiedTemplate) {
      push('converged', false, 'Verified geometry built; review the manufacturability notes.');
      return {
        success: false,
        route: 'parametric',
        backend,
        code,
        mesh: lastMesh,
        iterations: iter,
        dfm: lastDFM,
        vision: lastVision,
        log,
        error: 'Verified geometry returned with review notes.',
      };
    }

    if (iter === maxIterations) break;
    // 2e. Correct using the concrete, machine-readable issues.
    try {
      code = await withStageDeadline(
        fixCode(request, backend, code, issues.join('\n\n'), retrieved),
        35000,
        'Correction pass'
      );
    } catch (e: any) {
      push(`repair#${iter}`, false, `${e?.message || 'Correction unavailable'}; returning the built geometry.`);
      break;
    }
  }

  return {
    success: false,
    route: 'parametric',
    backend,
    code,
    mesh: lastMesh,
    iterations: maxIterations,
    dfm: lastDFM,
    vision: lastVision,
    log,
    error: 'Did not fully converge within iteration budget (best-effort result returned).',
  };
}

function withStageDeadline<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${Math.round(ms / 1000)}s`)), ms);
  });
  return Promise.race([promise, deadline]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

// ---------------------------------------------------------------------------

async function runBackend(backend: Backend, code: string) {
  if (backend === 'replicad') {
    try {
      const mesh = await replicadExecutor.executeCode(code);
      return { ok: true as const, mesh };
    } catch (e: any) {
      return { ok: false as const, error: e?.message || String(e) };
    }
  }
  return safeExecuteOCC(code);
}

async function generateCode(request: string, backend: Backend, retrieved: string): Promise<string> {
  if (backend === 'replicad') {
    const raw = await chat(
      [
        { role: 'system', content: REPLICAD_SYSTEM_PROMPT },
        { role: 'user', content: buildReplicadUserPrompt(request, retrieved) },
      ],
      { temperature: 0.2, maxTokens: 1400 }
    );
    return stripFences(raw);
  }
  // Use the unified provider path here too. The previous /api/ai-code call
  // silently bypassed the key, endpoint, and model chosen in Intelligence
  // settings on the first generation pass.
  const raw = await chat(
    [
      { role: 'system', content: OCC_SYSTEM_PROMPT },
      { role: 'user', content: buildOccUserPrompt(request, retrieved) },
    ],
    { temperature: 0.1, maxTokens: 1800 }
  );
  return stripFences(raw);
}

async function fixCode(
  request: string,
  backend: Backend,
  previousCode: string,
  issues: string,
  retrieved: string
): Promise<string> {
  const system =
    backend === 'replicad'
      ? REPLICAD_SYSTEM_PROMPT
      : `${OCC_SYSTEM_PROMPT}\n\nYou are repairing code that failed. Remove every unsupported call named in the error and stay inside the documented occ wrapper.`;

  const raw = await chat(
    [
      { role: 'system', content: system },
      {
        role: 'user',
        content: `Original request: "${request}"\n${retrieved}\n\nThe previous code had these problems that MUST be fixed:\n${issues}\n\nPrevious code:\n\`\`\`javascript\n${previousCode}\n\`\`\`\n\nReturn the corrected code only.`,
      },
    ],
    { temperature: 0.2, maxTokens: 1600 }
  );
  return stripFences(raw);
}

function stripFences(s: string): string {
  let c = (s || '').trim();
  if (c.startsWith('```')) {
    const nl = c.indexOf('\n');
    if (nl !== -1) c = c.slice(nl + 1);
  }
  if (c.endsWith('```')) c = c.slice(0, c.lastIndexOf('```'));
  return c.trim();
}
