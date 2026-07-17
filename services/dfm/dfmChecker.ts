/**
 * DFM checker orchestrator.
 *
 * Runs every deterministic rule against a mesh for a chosen fabrication profile,
 * merges the findings with the Manifold validity report, and produces:
 *   - a human report (for the UI panel), and
 *   - a compact machine-readable constraints block (for the AI correction loop).
 *
 * This is the mechanical-CAD analogue of BoardMint's PCB DRC: generation is
 * probabilistic, verification is deterministic, and the fixer only sees ground truth.
 */

import {
  DFMFinding,
  FabProfile,
  FAB_PROFILES,
  MeshView,
  checkBuildVolume,
  checkMinFeature,
  checkOverhangs,
  checkWallThickness,
  checkDegenerate,
} from './dfmRules';
import { validateMesh, GeometryReport } from '../sandbox/geometryValidator';

export interface DFMReport {
  profile: string;
  findings: DFMFinding[];
  geometry: GeometryReport;
  passed: boolean; // no error-severity findings and geometry valid
  summary: string;
}

export async function runDFM(
  mesh: MeshView,
  profileId: keyof typeof FAB_PROFILES | string = 'fdm'
): Promise<DFMReport> {
  const profile: FabProfile = FAB_PROFILES[profileId] || FAB_PROFILES.fdm;

  const geometry = await validateMesh(mesh);

  const findings: DFMFinding[] = [];
  // Manifold/watertight is a hard printability gate.
  if (!geometry.skipped && !geometry.valid) {
    findings.push({
      ruleId: 'watertight',
      severity: 'error',
      message: geometry.issues[0] || 'Geometry is not a valid, watertight solid.',
      detail: geometry.issues.slice(1).join(' '),
      suggestion:
        'Ensure the model is a single closed solid (booleans fully fused, no open shells or self-intersections).',
    });
  }

  findings.push(
    ...checkBuildVolume(mesh, profile),
    ...checkMinFeature(mesh, profile),
    ...checkWallThickness(mesh, profile),
    ...checkOverhangs(mesh, profile),
    ...checkDegenerate(mesh)
  );

  const errors = findings.filter((f) => f.severity === 'error');
  const passed = errors.length === 0 && (geometry.valid || geometry.skipped);

  const summary = passed
    ? `Passes ${profile.label} manufacturability checks${geometry.skipped ? ' (geometry validity inconclusive)' : ''}.`
    : `${errors.length} blocking issue(s) for ${profile.label}.`;

  return { profile: profile.id, findings, geometry, passed, summary };
}

/** Aggregate DFM across a multi-part model. */
export async function runDFMComponents(
  meshes: Array<MeshView & { name?: string }>,
  profileId: string = 'fdm'
): Promise<{ passed: boolean; reports: Array<DFMReport & { part: string }> }> {
  const reports = await Promise.all(
    meshes.map(async (m, i) => ({ ...(await runDFM(m, profileId)), part: m.name || `part_${i}` }))
  );
  return { passed: reports.every((r) => r.passed), reports };
}

/**
 * Render findings as a constraints block for the AI fixer. Only actionable
 * (error/warning) items are included so the model gets signal, not noise.
 */
export function findingsToConstraints(report: DFMReport): string {
  const actionable = report.findings.filter((f) => f.severity !== 'info');
  if (actionable.length === 0) return '';
  const lines = actionable.map(
    (f) => `- [${f.severity.toUpperCase()}] ${f.message}${f.suggestion ? ` FIX: ${f.suggestion}` : ''}`
  );
  return `## MANUFACTURABILITY CONSTRAINTS (deterministic checks — you MUST satisfy these)\nTarget process: ${report.profile}\n${lines.join('\n')}`;
}
