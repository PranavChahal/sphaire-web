/**
 * Vision critic — closes the generate loop with *visual* feedback.
 *
 * The old self-correction loop only saw runtime errors, so code that executed but
 * produced wrong geometry counted as "success". This renders the result, shows it to
 * a multimodal model alongside the original request, and returns a structured verdict
 * plus a concrete code patch to try next. Inspired by CADCodeVerify (2024), which
 * showed visual feedback beats error-only feedback for text-to-CAD by a wide margin.
 */

import { vision, ProviderUnavailableError } from '../providers/llmProvider';
import { captureScene } from './sceneCapture';
import { VisionMessage } from '../providers/types';

export interface VisionVerdict {
  /** Does the render plausibly depict what the user asked for? */
  matches: boolean;
  /** 0..1 confidence that intent is satisfied. */
  score: number;
  /** Human-readable problems ("only 3 wheels visible", "roof is inverted"). */
  issues: string[];
  /** One-line summary. */
  critique: string;
  /** Natural-language instruction for the code-fixer to apply next iteration. */
  fixInstruction: string;
  /** True when we couldn't get a verdict (no vision model / no scene) — caller should skip. */
  skipped: boolean;
}

const SYSTEM = `You are a meticulous CAD reviewer. You are shown several rendered views of a
3D model and the text request it was generated from. Judge ONLY whether the geometry
matches the request's intent — component count, proportions, orientation, presence of
key features. Ignore color, material, lighting and background.

Respond with STRICT JSON, no prose:
{
  "matches": boolean,
  "score": number,          // 0..1, how well intent is satisfied
  "issues": string[],       // concrete, actionable defects
  "critique": string,       // one sentence
  "fixInstruction": string  // precise instruction to fix the code next iteration
}`;

/**
 * Render the current scene and critique it against the request.
 * `imagesOverride` lets callers pass pre-captured shots (e.g. from a test harness).
 */
export async function critiqueScene(
  request: string,
  imagesOverride?: string[]
): Promise<VisionVerdict> {
  const images = imagesOverride ?? (await captureScene({ views: 4, size: 512 }));

  if (images.length === 0) {
    return skip('No rendered geometry to critique.');
  }

  const messages: VisionMessage[] = [
    { role: 'system', text: SYSTEM },
    {
      role: 'user',
      text: `Request: "${request}"\n\nHere are ${images.length} views of the generated model. Return the JSON verdict.`,
      images,
    },
  ];

  try {
    const raw = await vision(messages, { json: true, temperature: 0.1, maxTokens: 700 });
    const parsed = safeJson(raw);
    if (!parsed) return skip('Vision model returned unparseable output.');

    return {
      matches: !!parsed.matches,
      score: clamp01(Number(parsed.score ?? (parsed.matches ? 0.7 : 0.3))),
      issues: Array.isArray(parsed.issues) ? parsed.issues.map(String) : [],
      critique: String(parsed.critique || ''),
      fixInstruction: String(parsed.fixInstruction || ''),
      skipped: false,
    };
  } catch (e) {
    if (e instanceof ProviderUnavailableError) {
      return skip('No vision model available: ' + e.message);
    }
    console.warn('[VISION-CRITIC] failed:', e);
    return skip('Vision critique errored.');
  }
}

function skip(reason: string): VisionVerdict {
  return { matches: true, score: 1, issues: [], critique: reason, fixInstruction: '', skipped: true };
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0.5;
  return Math.max(0, Math.min(1, n));
}

function safeJson(raw: string): any | null {
  try {
    return JSON.parse(raw);
  } catch {
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return JSON.parse(m[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}
