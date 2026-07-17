/**
 * Deterministic primitive fitting.
 *
 * Given a triangle mesh (e.g. an STL pulled from the Thingi10k search the app already
 * ships), extract geometric descriptors — bounding box, volume fill, radial symmetry,
 * principal axes — and classify it against basic primitives. This is the deterministic
 * front-end to mesh→parametric recovery: it tells the LLM reconstructor "this is a
 * cylinder r≈8 h≈20 about Z" instead of asking it to guess from raw triangles.
 *
 * For true B-rep recovery of complex parts, the upgrade path is a learned model like
 * CAD-Recode (point-cloud → CadQuery); this covers the common primitive-ish cases now.
 */

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface ShapeDescriptor {
  primitive: 'box' | 'cylinder' | 'sphere' | 'cone' | 'complex';
  confidence: number;
  boundingBox: { size: Vec3; center: Vec3 };
  volume: number;
  surfaceArea: number;
  /** Dominant axis for cylinders/cones ('x'|'y'|'z'). */
  axis?: 'x' | 'y' | 'z';
  /** Best-fit parameters, primitive-specific. */
  params: Record<string, number>;
  /** Human summary for the LLM prompt. */
  summary: string;
}

function bbox(p: ArrayLike<number>): { min: Vec3; max: Vec3; size: Vec3; center: Vec3 } {
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
  const size = { x: max.x - min.x, y: max.y - min.y, z: max.z - min.z };
  const center = { x: (min.x + max.x) / 2, y: (min.y + max.y) / 2, z: (min.z + max.z) / 2 };
  return { min, max, size, center };
}

function meshVolumeAndArea(p: ArrayLike<number>, idx: ArrayLike<number>): { volume: number; area: number } {
  let vol = 0;
  let area = 0;
  for (let i = 0; i < idx.length; i += 3) {
    const a = { x: p[idx[i] * 3], y: p[idx[i] * 3 + 1], z: p[idx[i] * 3 + 2] };
    const b = { x: p[idx[i + 1] * 3], y: p[idx[i + 1] * 3 + 1], z: p[idx[i + 1] * 3 + 2] };
    const c = { x: p[idx[i + 2] * 3], y: p[idx[i + 2] * 3 + 1], z: p[idx[i + 2] * 3 + 2] };
    // Signed volume of tetra (origin, a, b, c).
    vol +=
      (a.x * (b.y * c.z - b.z * c.y) - a.y * (b.x * c.z - b.z * c.x) + a.z * (b.x * c.y - b.y * c.x)) / 6;
    // Triangle area.
    const ux = b.x - a.x, uy = b.y - a.y, uz = b.z - a.z;
    const vx = c.x - a.x, vy = c.y - a.y, vz = c.z - a.z;
    const cx = uy * vz - uz * vy, cy = uz * vx - ux * vz, cz = ux * vy - uy * vx;
    area += Math.sqrt(cx * cx + cy * cy + cz * cz) / 2;
  }
  return { volume: Math.abs(vol), area };
}

/** Analyse a mesh and return its best-fit primitive descriptor. */
export function fitPrimitive(mesh: { positions: ArrayLike<number>; indices: ArrayLike<number> }): ShapeDescriptor {
  const p = mesh.positions;
  const idx = mesh.indices;
  const bb = bbox(p);
  const { volume, area } = meshVolumeAndArea(p, idx);
  const bboxVolume = bb.size.x * bb.size.y * bb.size.z || 1e-9;
  const fill = volume / bboxVolume; // 1.0 => fills its box (a box); ~0.52 => sphere; ~0.785 => cylinder

  // Radial symmetry about centroid (sphere test).
  const center = bb.center;
  let n = 0;
  let rMean = 0;
  for (let i = 0; i < p.length; i += 3) {
    const dx = p[i] - center.x, dy = p[i + 1] - center.y, dz = p[i + 2] - center.z;
    rMean += Math.sqrt(dx * dx + dy * dy + dz * dz);
    n++;
  }
  rMean /= n || 1;
  let rVar = 0;
  for (let i = 0; i < p.length; i += 3) {
    const dx = p[i] - center.x, dy = p[i + 1] - center.y, dz = p[i + 2] - center.z;
    const r = Math.sqrt(dx * dx + dy * dy + dz * dz);
    rVar += (r - rMean) ** 2;
  }
  const rStd = Math.sqrt(rVar / (n || 1));
  const sphericity = 1 - Math.min(1, rStd / (rMean || 1)); // ~1 for a sphere

  // Cylinder test: pick the longest axis, check cross-section radius consistency.
  const axes: Array<'x' | 'y' | 'z'> = ['x', 'y', 'z'];
  const sizes = [bb.size.x, bb.size.y, bb.size.z];
  const longIdx = sizes.indexOf(Math.max(...sizes));
  const axis = axes[longIdx];
  const cylRadius = (sizes[(longIdx + 1) % 3] + sizes[(longIdx + 2) % 3]) / 4;

  // Classify.
  let primitive: ShapeDescriptor['primitive'] = 'complex';
  let confidence = 0.4;
  const params: Record<string, number> = {};
  let summary = '';

  if (sphericity > 0.9 && Math.abs(fill - 0.52) < 0.12) {
    primitive = 'sphere';
    confidence = sphericity;
    params.radius = rMean;
    summary = `Sphere, radius ≈ ${rMean.toFixed(2)}`;
  } else if (fill > 0.9) {
    primitive = 'box';
    confidence = Math.min(0.95, fill);
    params.width = bb.size.x;
    params.height = bb.size.y;
    params.depth = bb.size.z;
    summary = `Box, ${bb.size.x.toFixed(2)} × ${bb.size.y.toFixed(2)} × ${bb.size.z.toFixed(2)}`;
  } else if (Math.abs(fill - Math.PI / 4) < 0.1) {
    primitive = 'cylinder';
    confidence = 0.8;
    params.radius = cylRadius;
    params.height = sizes[longIdx];
    summary = `Cylinder about ${axis.toUpperCase()}, radius ≈ ${cylRadius.toFixed(2)}, height ≈ sizes[longIdx].toFixed(2)`;
    summary = `Cylinder about ${axis.toUpperCase()}, radius ≈ ${cylRadius.toFixed(2)}, height ≈ ${sizes[longIdx].toFixed(2)}`;
  } else if (fill > 0.25 && fill < 0.45) {
    primitive = 'cone';
    confidence = 0.55;
    params.radius = cylRadius;
    params.height = sizes[longIdx];
    summary = `Cone-like about ${axis.toUpperCase()}, base radius ≈ ${cylRadius.toFixed(2)}, height ≈ ${sizes[longIdx].toFixed(2)}`;
  } else {
    primitive = 'complex';
    confidence = 0.3;
    summary = `Complex form (bbox fill ${(fill * 100).toFixed(0)}%). Approximate with combined primitives.`;
  }

  return {
    primitive,
    confidence,
    boundingBox: { size: bb.size, center: bb.center },
    volume,
    surfaceArea: area,
    axis: primitive === 'cylinder' || primitive === 'cone' ? axis : undefined,
    params,
    summary,
  };
}
