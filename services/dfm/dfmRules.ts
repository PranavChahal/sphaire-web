/**
 * Deterministic design-for-manufacturing rules.
 *
 * Pure geometry math on the triangle mesh — no AI, no randomness beyond bounded
 * sampling. Each rule returns findings that are both human-readable and machine-
 * readable so they can be (a) shown to the user and (b) fed back into the AI
 * correction loop as hard constraints. This is the "deterministic verifier" half of
 * the generate → verify → fix architecture.
 */

export type Severity = 'error' | 'warning' | 'info';

export interface DFMFinding {
  ruleId: string;
  severity: Severity;
  message: string;
  detail?: string;
  /** Concrete instruction the AI fixer can act on. */
  suggestion?: string;
}

export interface FabProfile {
  id: string;
  label: string;
  process: 'fdm' | 'sla' | 'cnc' | 'sls';
  /** mm. Model units are treated as mm unless you scale. */
  minWallThickness: number;
  minFeatureSize: number;
  maxOverhangAngleDeg: number; // beyond this from vertical needs support (FDM/SLA)
  buildVolume?: { x: number; y: number; z: number }; // mm
  supportsOverhang: boolean; // CNC/injection can't do internal overhangs; FDM can with support
}

export const FAB_PROFILES: Record<string, FabProfile> = {
  fdm: {
    id: 'fdm',
    label: 'FDM 3D print (0.4mm nozzle)',
    process: 'fdm',
    minWallThickness: 0.8,
    minFeatureSize: 0.4,
    maxOverhangAngleDeg: 45,
    buildVolume: { x: 220, y: 220, z: 250 },
    supportsOverhang: true,
  },
  sla: {
    id: 'sla',
    label: 'SLA/resin 3D print',
    process: 'sla',
    minWallThickness: 0.5,
    minFeatureSize: 0.2,
    maxOverhangAngleDeg: 30,
    buildVolume: { x: 145, y: 145, z: 175 },
    supportsOverhang: true,
  },
  cnc: {
    id: 'cnc',
    label: 'CNC 3-axis mill',
    process: 'cnc',
    minWallThickness: 1.0,
    minFeatureSize: 1.0,
    maxOverhangAngleDeg: 90, // no "overhang" concept, but undercuts are unreachable
    buildVolume: { x: 300, y: 300, z: 150 },
    supportsOverhang: false,
  },
};

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface MeshView {
  positions: ArrayLike<number>;
  indices: ArrayLike<number>;
}

function v(positions: ArrayLike<number>, i: number): Vec3 {
  return { x: positions[i * 3], y: positions[i * 3 + 1], z: positions[i * 3 + 2] };
}
const sub = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const cross = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});
const dot = (a: Vec3, b: Vec3): number => a.x * b.x + a.y * b.y + a.z * b.z;
const len = (a: Vec3): number => Math.sqrt(dot(a, a));
function norm(a: Vec3): Vec3 {
  const l = len(a) || 1;
  return { x: a.x / l, y: a.y / l, z: a.z / l };
}

export function boundingBox(mesh: MeshView): { min: Vec3; max: Vec3; size: Vec3; center: Vec3 } {
  const p = mesh.positions;
  const min = { x: Infinity, y: Infinity, z: Infinity };
  const max = { x: -Infinity, y: -Infinity, z: -Infinity };
  for (let i = 0; i < p.length; i += 3) {
    min.x = Math.min(min.x, p[i]);
    min.y = Math.min(min.y, p[i + 1]);
    min.z = Math.min(min.z, p[i + 2]);
    max.x = Math.max(max.x, p[i]);
    max.y = Math.max(max.y, p[i + 1]);
    max.z = Math.max(max.z, p[i + 2]);
  }
  const center = { x: (min.x + max.x) / 2, y: (min.y + max.y) / 2, z: (min.z + max.z) / 2 };
  return { min, max, size: sub(max, min), center };
}

// --- Rule: fits in build volume ------------------------------------------------
export function checkBuildVolume(mesh: MeshView, profile: FabProfile): DFMFinding[] {
  if (!profile.buildVolume) return [];
  const { size } = boundingBox(mesh);
  const bv = profile.buildVolume;
  // Allow the largest footprint on the largest platform axes (simple orientation check).
  const dims = [size.x, size.y, size.z].sort((a, b) => b - a);
  const plat = [bv.x, bv.y, bv.z].sort((a, b) => b - a);
  const overflow = dims.some((d, i) => d > plat[i] + 1e-6);
  if (overflow) {
    return [
      {
        ruleId: 'build-volume',
        severity: 'error',
        message: `Model (${fmt(size)}) exceeds the ${profile.label} build volume (${bv.x}×${bv.y}×${bv.z}mm).`,
        suggestion: `Scale the model down to fit within ${bv.x}×${bv.y}×${bv.z}mm, or split it into printable sections.`,
      },
    ];
  }
  return [];
}

// --- Rule: minimum feature size ------------------------------------------------
export function checkMinFeature(mesh: MeshView, profile: FabProfile): DFMFinding[] {
  const { size } = boundingBox(mesh);
  const smallest = Math.min(size.x, size.y, size.z);
  if (smallest > 0 && smallest < profile.minFeatureSize) {
    return [
      {
        ruleId: 'min-feature',
        severity: 'warning',
        message: `Smallest overall dimension is ${smallest.toFixed(2)}mm, below the ${profile.minFeatureSize}mm minimum feature size for ${profile.label}.`,
        suggestion: `Increase the thinnest dimension to at least ${profile.minFeatureSize}mm.`,
      },
    ];
  }
  return [];
}

// --- Rule: overhangs need support ---------------------------------------------
// Fraction of downward-facing surface area steeper than the self-support angle.
export function checkOverhangs(mesh: MeshView, profile: FabProfile): DFMFinding[] {
  if (!profile.supportsOverhang && profile.process !== 'cnc') return [];
  const p = mesh.positions;
  const idx = mesh.indices;
  const threshold = Math.cos((90 - profile.maxOverhangAngleDeg) * (Math.PI / 180));
  let overhangArea = 0;
  let totalArea = 0;
  const down = { x: 0, y: 0, z: -1 }; // build direction is +Z; gravity/support is -Z

  for (let i = 0; i < idx.length; i += 3) {
    const a = v(p, idx[i]);
    const b = v(p, idx[i + 1]);
    const c = v(p, idx[i + 2]);
    const n = cross(sub(b, a), sub(c, a));
    const area = len(n) / 2;
    if (area < 1e-9) continue;
    totalArea += area;
    const un = norm(n);
    // How much the face points downward (its normal · down).
    const downFacing = dot(un, down);
    if (downFacing > threshold) overhangArea += area;
  }
  if (totalArea === 0) return [];
  const frac = overhangArea / totalArea;
  if (frac > 0.08) {
    const sev: Severity = profile.process === 'cnc' ? 'error' : 'warning';
    return [
      {
        ruleId: 'overhang',
        severity: sev,
        message: `${(frac * 100).toFixed(0)}% of the surface overhangs beyond ${profile.maxOverhangAngleDeg}° from vertical.`,
        detail:
          profile.process === 'cnc'
            ? 'CNC milling cannot reach steep undercuts.'
            : 'These areas will need support material and may show scarring.',
        suggestion:
          profile.process === 'cnc'
            ? 'Remove undercuts or redesign so all faces are tool-accessible from ±Z.'
            : 'Add chamfers/fillets to bring overhang angles under the self-support limit, or reorient the part.',
      },
    ];
  }
  return [];
}

// --- Rule: minimum wall thickness (ray-cast probe) -----------------------------
// Sample a bounded set of triangles, shoot a ray inward along -normal, and measure
// the distance to the first back-facing triangle it hits. Small distances = thin walls.
export function checkWallThickness(mesh: MeshView, profile: FabProfile): DFMFinding[] {
  const p = mesh.positions;
  const idx = mesh.indices;
  const triCount = Math.floor(idx.length / 3);
  if (triCount < 4) return [];

  const bbox = boundingBox(mesh);
  const diag = len(bbox.size) || 1;
  const maxProbe = Math.min(profile.minWallThickness * 4, diag);

  // Precompute triangles once.
  const tris: Array<{ a: Vec3; b: Vec3; c: Vec3; n: Vec3; centroid: Vec3 }> = [];
  for (let i = 0; i < idx.length; i += 3) {
    const a = v(p, idx[i]);
    const b = v(p, idx[i + 1]);
    const c = v(p, idx[i + 2]);
    const n = norm(cross(sub(b, a), sub(c, a)));
    const centroid = { x: (a.x + b.x + c.x) / 3, y: (a.y + b.y + c.y) / 3, z: (a.z + b.z + c.z) / 3 };
    tris.push({ a, b, c, n, centroid });
  }

  const sampleCount = Math.min(150, tris.length);
  const step = Math.max(1, Math.floor(tris.length / sampleCount));
  let minThickness = Infinity;
  let thinHits = 0;

  for (let s = 0; s < tris.length; s += step) {
    const t = tris[s];
    // Ray origin just inside the surface, direction into the material (-normal).
    const eps = diag * 1e-4;
    const origin = {
      x: t.centroid.x - t.n.x * eps,
      y: t.centroid.y - t.n.y * eps,
      z: t.centroid.z - t.n.z * eps,
    };
    const dir = { x: -t.n.x, y: -t.n.y, z: -t.n.z };

    let nearest = Infinity;
    for (let j = 0; j < tris.length; j++) {
      if (j === s) continue;
      const u = tris[j];
      // The opposing wall is the one the inward ray exits through: its outward
      // normal points roughly ALONG the ray direction.
      if (dot(u.n, dir) <= 0.2) continue;
      const dist = rayTri(origin, dir, u.a, u.b, u.c);
      if (dist !== null && dist > eps && dist < nearest) nearest = dist;
    }
    if (nearest < maxProbe) {
      minThickness = Math.min(minThickness, nearest);
      if (nearest < profile.minWallThickness) thinHits++;
    }
  }

  if (thinHits > 0 && minThickness < profile.minWallThickness) {
    return [
      {
        ruleId: 'wall-thickness',
        severity: 'error',
        message: `Thinnest wall ≈ ${minThickness.toFixed(2)}mm, below the ${profile.minWallThickness}mm minimum for ${profile.label}.`,
        detail: `${thinHits} sampled region(s) fall under the limit.`,
        suggestion: `Thicken walls to at least ${profile.minWallThickness}mm (add material or use shell thickness ≥ ${profile.minWallThickness}mm).`,
      },
    ];
  }
  return [];
}

// --- Rule: degenerate/sliver triangles ----------------------------------------
export function checkDegenerate(mesh: MeshView): DFMFinding[] {
  const p = mesh.positions;
  const idx = mesh.indices;
  let degenerate = 0;
  const total = Math.floor(idx.length / 3);
  for (let i = 0; i < idx.length; i += 3) {
    const a = v(p, idx[i]);
    const b = v(p, idx[i + 1]);
    const c = v(p, idx[i + 2]);
    const area = len(cross(sub(b, a), sub(c, a))) / 2;
    if (area < 1e-10) degenerate++;
  }
  if (degenerate > 0) {
    return [
      {
        ruleId: 'degenerate-tris',
        severity: 'warning',
        message: `${degenerate}/${total} triangles are degenerate (near-zero area).`,
        suggestion: 'Regenerate with cleaner topology; avoid coincident vertices and zero-length edges.',
      },
    ];
  }
  return [];
}

// Möller–Trumbore ray/triangle intersection. Returns distance t or null.
function rayTri(orig: Vec3, dir: Vec3, a: Vec3, b: Vec3, c: Vec3): number | null {
  const EPS = 1e-9;
  const e1 = sub(b, a);
  const e2 = sub(c, a);
  const pv = cross(dir, e2);
  const det = dot(e1, pv);
  if (det > -EPS && det < EPS) return null; // parallel
  const inv = 1 / det;
  const tv = sub(orig, a);
  const u = dot(tv, pv) * inv;
  if (u < 0 || u > 1) return null;
  const qv = cross(tv, e1);
  const vv = dot(dir, qv) * inv;
  if (vv < 0 || u + vv > 1) return null;
  const t = dot(e2, qv) * inv;
  return t > EPS ? t : null;
}

function fmt(s: Vec3): string {
  return `${s.x.toFixed(1)}×${s.y.toFixed(1)}×${s.z.toFixed(1)}mm`;
}
