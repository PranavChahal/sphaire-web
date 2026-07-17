/**
 * 2D constraint solver (planegcs / FreeCAD's solver, compiled to wasm).
 *
 * LLMs are bad at emitting mutually-consistent coordinates — the classic "four lines
 * that don't quite close into a rectangle". This lets the model instead declare a
 * sketch as points + lines + *constraints* ("these two lines are perpendicular",
 * "this edge is 20mm", "this point is coincident with that one"), and a real
 * geometric constraint solver finds coordinates that satisfy them exactly. This is
 * how professional parametric CAD sketches actually work.
 */

import { make_gcs_wrapper } from '@salusoft89/planegcs';

// ---- High-level sketch spec (what the LLM produces) -----------------------

export interface SketchPointSpec {
  id: string;
  x: number; // initial guess
  y: number;
  fixed?: boolean;
}

export interface SketchLineSpec {
  id: string;
  p1: string; // point id
  p2: string; // point id
}

export interface SketchCircleSpec {
  id: string;
  center: string; // point id
  radius: number;
}

export type ConstraintSpec =
  | { kind: 'coincident'; a: string; b: string } // point, point
  | { kind: 'distance'; a: string; b: string; value: number } // point, point
  | { kind: 'horizontal'; line: string }
  | { kind: 'vertical'; line: string }
  | { kind: 'parallel'; a: string; b: string } // line, line
  | { kind: 'perpendicular'; a: string; b: string } // line, line
  | { kind: 'equalLength'; a: string; b: string } // line, line
  | { kind: 'pointOnLine'; point: string; line: string }
  | { kind: 'radius'; circle: string; value: number };

export interface SketchSpec {
  points: SketchPointSpec[];
  lines?: SketchLineSpec[];
  circles?: SketchCircleSpec[];
  constraints: ConstraintSpec[];
}

export interface SolvedSketch {
  ok: boolean;
  status: string;
  points: Record<string, { x: number; y: number }>;
  conflicts?: string[];
  /** Ordered polygon loops (list of point-ids) inferred from the lines, for extrusion. */
  loops: string[][];
  skipped?: boolean;
}

let wrapperPromise: Promise<any> | null = null;
async function getWrapper(): Promise<any> {
  if (!wrapperPromise) {
    // planegcs resolves its own wasm from the package by default.
    wrapperPromise = make_gcs_wrapper();
  }
  return wrapperPromise;
}

/**
 * Solve a constrained sketch. Falls back to the initial guesses (skipped=true) if the
 * solver wasm can't load, so the pipeline degrades instead of failing hard.
 */
export async function solveSketch(spec: SketchSpec): Promise<SolvedSketch> {
  let gcs: any;
  try {
    gcs = await getWrapper();
  } catch (e) {
    return {
      ok: false,
      skipped: true,
      status: 'solver-unavailable',
      points: Object.fromEntries(spec.points.map((p) => [p.id, { x: p.x, y: p.y }])),
      loops: inferLoops(spec),
    };
  }

  try {
    gcs.clear_data();

    let nid = 1;
    const pointIds: Record<string, number> = {};
    const lineIds: Record<string, number> = {};
    const circleIds: Record<string, number> = {};

    // Points
    for (const p of spec.points) {
      const id = nid++;
      pointIds[p.id] = id;
      gcs.push_primitive({ id: String(id), type: 'point', x: p.x, y: p.y, fixed: !!p.fixed });
    }
    // Lines
    for (const l of spec.lines || []) {
      const id = nid++;
      lineIds[l.id] = id;
      gcs.push_primitive({
        id: String(id),
        type: 'line',
        p1_id: String(pointIds[l.p1]),
        p2_id: String(pointIds[l.p2]),
      });
    }
    // Circles
    for (const c of spec.circles || []) {
      const id = nid++;
      circleIds[c.id] = id;
      gcs.push_primitive({
        id: String(id),
        type: 'circle',
        c_id: String(pointIds[c.center]),
        radius: c.radius,
      });
    }

    // Constraints
    for (const c of spec.constraints) {
      const id = String(nid++);
      switch (c.kind) {
        case 'coincident':
          gcs.push_primitive({ id, type: 'p2p_coincident', p1_id: String(pointIds[c.a]), p2_id: String(pointIds[c.b]) });
          break;
        case 'distance':
          gcs.push_primitive({ id, type: 'p2p_distance', p1_id: String(pointIds[c.a]), p2_id: String(pointIds[c.b]), distance: c.value });
          break;
        case 'horizontal':
          gcs.push_primitive({ id, type: 'horizontal_l', l_id: String(lineIds[c.line]) });
          break;
        case 'vertical':
          gcs.push_primitive({ id, type: 'vertical_l', l_id: String(lineIds[c.line]) });
          break;
        case 'parallel':
          gcs.push_primitive({ id, type: 'parallel', l1_id: String(lineIds[c.a]), l2_id: String(lineIds[c.b]) });
          break;
        case 'perpendicular':
          gcs.push_primitive({ id, type: 'perpendicular_ll', l1_id: String(lineIds[c.a]), l2_id: String(lineIds[c.b]) });
          break;
        case 'equalLength':
          gcs.push_primitive({ id, type: 'equal_length', l1_id: String(lineIds[c.a]), l2_id: String(lineIds[c.b]) });
          break;
        case 'pointOnLine':
          gcs.push_primitive({ id, type: 'point_on_line_pl', p_id: String(pointIds[c.point]), l_id: String(lineIds[c.line]) });
          break;
        case 'radius':
          gcs.push_primitive({ id, type: 'circle_radius', c_id: String(circleIds[c.circle]), radius: c.value });
          break;
      }
    }

    const status = gcs.solve();
    gcs.apply_solution();

    const statusStr = String(status);
    const conflicts = gcs.has_gcs_conflicting_constraints?.()
      ? gcs.get_gcs_conflicting_constraints?.()
      : [];

    // Pull solved point coordinates back out.
    const solvedPoints: Record<string, { x: number; y: number }> = {};
    for (const p of spec.points) {
      const prim = gcs.sketch_index.get_primitive(String(pointIds[p.id]));
      solvedPoints[p.id] = prim ? { x: prim.x, y: prim.y } : { x: p.x, y: p.y };
    }

    // SolveStatus.Success === 0 in planegcs' enum.
    const ok = status === 0 || /success/i.test(statusStr);
    return { ok, status: statusStr, points: solvedPoints, conflicts, loops: inferLoops(spec) };
  } catch (e: any) {
    return {
      ok: false,
      status: 'solve-error: ' + (e?.message || e),
      points: Object.fromEntries(spec.points.map((p) => [p.id, { x: p.x, y: p.y }])),
      loops: inferLoops(spec),
    };
  }
}

/** Walk the line list into ordered closed loops (for turning a sketch into a face). */
function inferLoops(spec: SketchSpec): string[][] {
  const lines = spec.lines || [];
  if (lines.length === 0) return [];
  const adj = new Map<string, string[]>();
  for (const l of lines) {
    if (!adj.has(l.p1)) adj.set(l.p1, []);
    if (!adj.has(l.p2)) adj.set(l.p2, []);
    adj.get(l.p1)!.push(l.p2);
    adj.get(l.p2)!.push(l.p1);
  }
  const visited = new Set<string>();
  const loops: string[][] = [];
  for (const start of adj.keys()) {
    if (visited.has(start)) continue;
    const loop: string[] = [];
    let current: string | undefined = start;
    let prev: string | null = null;
    while (current && !visited.has(current)) {
      visited.add(current);
      loop.push(current);
      const neighbors: string[] = (adj.get(current) || []).filter((n: string) => n !== prev);
      prev = current;
      current = neighbors[0];
    }
    if (loop.length >= 3) loops.push(loop);
  }
  return loops;
}
