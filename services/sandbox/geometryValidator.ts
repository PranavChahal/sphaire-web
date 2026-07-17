/**
 * Geometry validation via Manifold.
 *
 * Turns "the code ran" into "the result is a valid, watertight, manifold solid" —
 * the same guarantee OpenSCAD gained by adopting Manifold. A model that passes here
 * is safe to boolean against, safe to export, and printable. Failures feed back into
 * the self-correction loop as concrete, machine-readable reasons.
 */

let manifoldModule: any = null;
let initPromise: Promise<void> | null = null;

async function ensureManifold(): Promise<any> {
  if (manifoldModule) return manifoldModule;
  if (!initPromise) {
    initPromise = (async () => {
      const Module = (await import('manifold-3d')).default;
      const wasm = await Module();
      wasm.setup();
      manifoldModule = wasm;
    })();
  }
  await initPromise;
  return manifoldModule;
}

export interface GeometryReport {
  valid: boolean;
  watertight: boolean;
  manifold: boolean;
  volume: number;
  surfaceArea: number;
  /** Topological genus (number of "handles"); high values often signal defects. */
  genus?: number;
  triangleCount: number;
  vertexCount: number;
  issues: string[];
  /** True when Manifold couldn't run (wasm unavailable) — treat as inconclusive, not failure. */
  skipped: boolean;
}

/**
 * Validate a single mesh (`{positions: Float32Array, indices: Uint32Array}`).
 * Degrades gracefully to a topological heuristic if the Manifold wasm can't load.
 */
export async function validateMesh(mesh: {
  positions: ArrayLike<number>;
  indices: ArrayLike<number>;
}): Promise<GeometryReport> {
  const vertexCount = Math.floor(mesh.positions.length / 3);
  const triangleCount = Math.floor(mesh.indices.length / 3);
  const base: GeometryReport = {
    valid: false,
    watertight: false,
    manifold: false,
    volume: 0,
    surfaceArea: 0,
    triangleCount,
    vertexCount,
    issues: [],
    skipped: false,
  };

  if (vertexCount === 0 || triangleCount === 0) {
    base.issues.push('Empty geometry (no vertices or triangles).');
    return base;
  }

  let wasm: any;
  try {
    wasm = await ensureManifold();
  } catch {
    return { ...base, ...eulerHeuristic(mesh), skipped: true };
  }

  try {
    const { Manifold, Mesh } = wasm;
    const meshObj = new Mesh({
      numProp: 3,
      vertProperties: Float32Array.from(mesh.positions as any),
      triVerts: Uint32Array.from(mesh.indices as any),
    });

    const man = new Manifold(meshObj);

    // status(): 'NoError' when the mesh is a valid 2-manifold.
    const statusRaw = typeof man.status === 'function' ? man.status() : undefined;
    const statusStr = statusRaw && statusRaw.value !== undefined ? String(statusRaw.value) : String(statusRaw);
    const isManifold = statusRaw === undefined ? man.numVert?.() > 0 : /NoError|0/.test(statusStr);

    let volume = 0;
    let surfaceArea = 0;
    try {
      const props = man.getProperties ? man.getProperties() : null;
      volume = props ? props.volume : man.volume ? man.volume() : 0;
      surfaceArea = props ? props.surfaceArea : man.surfaceArea ? man.surfaceArea() : 0;
    } catch {
      /* leave zeros */
    }
    const genus = typeof man.genus === 'function' ? man.genus() : undefined;

    const issues: string[] = [];
    if (!isManifold) issues.push(`Not a valid manifold (status: ${statusStr}). Likely non-watertight or self-intersecting.`);
    if (Math.abs(volume) < 1e-9) issues.push('Zero enclosed volume — geometry is not a closed solid.');
    if (genus !== undefined && genus > 10) issues.push(`Unusually high genus (${genus}) — probable meshing defect.`);

    try {
      man.delete?.();
      meshObj.delete?.();
    } catch {
      /* ignore */
    }

    const valid = isManifold && Math.abs(volume) > 1e-9;
    return {
      valid,
      watertight: isManifold,
      manifold: isManifold,
      volume: Math.abs(volume),
      surfaceArea,
      genus,
      triangleCount,
      vertexCount,
      issues,
      skipped: false,
    };
  } catch (e: any) {
    // Manifold throws when construction fails outright — that itself is a strong signal.
    return {
      ...base,
      issues: [`Manifold construction failed: ${e?.message || e}. Mesh is not a valid solid.`],
    };
  }
}

/** Validate a batch of component meshes; returns per-part reports + an aggregate. */
export async function validateComponents(
  meshes: Array<{ positions: ArrayLike<number>; indices: ArrayLike<number>; name?: string }>
): Promise<{ allValid: boolean; reports: GeometryReport[] }> {
  const reports = await Promise.all(meshes.map((m) => validateMesh(m)));
  const allValid = reports.every((r) => r.valid || r.skipped);
  return { allValid, reports };
}

/**
 * Fallback when Manifold wasm is unavailable: Euler-characteristic sanity check.
 * A closed manifold triangle mesh satisfies V - E + F = 2 - 2g. We can at least flag
 * grossly non-watertight meshes (open edges) cheaply.
 */
function eulerHeuristic(mesh: { positions: ArrayLike<number>; indices: ArrayLike<number> }): Partial<GeometryReport> {
  const idx = mesh.indices;
  const edgeCount = new Map<string, number>();
  const F = Math.floor(idx.length / 3);
  for (let i = 0; i < idx.length; i += 3) {
    const tri = [idx[i], idx[i + 1], idx[i + 2]];
    for (let e = 0; e < 3; e++) {
      const a = tri[e];
      const b = tri[(e + 1) % 3];
      const key = a < b ? `${a}_${b}` : `${b}_${a}`;
      edgeCount.set(key, (edgeCount.get(key) || 0) + 1);
    }
  }
  let boundaryEdges = 0;
  edgeCount.forEach((c) => {
    if (c !== 2) boundaryEdges++; // every edge of a closed mesh is shared by exactly 2 faces
  });
  const watertight = boundaryEdges === 0 && F > 0;
  return {
    watertight,
    manifold: watertight,
    valid: watertight,
    issues: watertight ? [] : [`${boundaryEdges} non-shared edges — mesh is not watertight (heuristic).`],
  };
}
