/**
 * Deterministic geometry/DFM tests — no LLM, no browser, no WASM.
 * These exercise the pure math that the AI correction loop relies on for ground truth.
 */
import {
  boundingBox,
  checkBuildVolume,
  checkWallThickness,
  checkMinFeature,
  FAB_PROFILES,
  MeshView,
} from '../services/dfm/dfmRules';
import { fitPrimitive } from '../services/reverse/primitiveFitter';

/** Axis-aligned closed box mesh centered at origin. */
function makeBox(w: number, h: number, d: number): MeshView {
  const x = w / 2, y = h / 2, z = d / 2;
  const v = [
    -x, -y, -z,  x, -y, -z,  x, y, -z,  -x, y, -z, // back
    -x, -y, z,   x, -y, z,   x, y, z,   -x, y, z,  // front
  ];
  // Consistent outward-facing winding (as OCCT/replicad tessellation produces).
  const idx = [
    0, 3, 2, 0, 2, 1, // -Z
    4, 5, 6, 4, 6, 7, // +Z
    0, 1, 5, 0, 5, 4, // -Y
    2, 3, 7, 2, 7, 6, // +Y
    0, 4, 7, 0, 7, 3, // -X
    1, 2, 6, 1, 6, 5, // +X
  ];
  return { positions: new Float32Array(v), indices: new Uint32Array(idx) };
}

describe('bounding box', () => {
  it('measures a box correctly', () => {
    const bb = boundingBox(makeBox(10, 20, 30));
    expect(bb.size.x).toBeCloseTo(10);
    expect(bb.size.y).toBeCloseTo(20);
    expect(bb.size.z).toBeCloseTo(30);
    expect(bb.center.x).toBeCloseTo(0);
  });
});

describe('primitive fitter', () => {
  it('classifies a filled box as a box', () => {
    const desc = fitPrimitive(makeBox(10, 12, 8));
    expect(desc.primitive).toBe('box');
    expect(desc.confidence).toBeGreaterThan(0.8);
    expect(desc.params.width).toBeCloseTo(10);
    expect(desc.params.height).toBeCloseTo(12);
    expect(desc.params.depth).toBeCloseTo(8);
  });
});

describe('DFM: build volume', () => {
  it('flags a model larger than the platform', () => {
    const findings = checkBuildVolume(makeBox(500, 500, 500), FAB_PROFILES.fdm);
    expect(findings.length).toBe(1);
    expect(findings[0].ruleId).toBe('build-volume');
    expect(findings[0].severity).toBe('error');
  });
  it('passes a model that fits', () => {
    const findings = checkBuildVolume(makeBox(50, 50, 50), FAB_PROFILES.fdm);
    expect(findings.length).toBe(0);
  });
});

describe('DFM: wall thickness', () => {
  it('flags a plate thinner than the process minimum', () => {
    // 0.3mm-thick plate, FDM min wall = 0.8mm.
    const findings = checkWallThickness(makeBox(40, 40, 0.3), FAB_PROFILES.fdm);
    expect(findings.length).toBe(1);
    expect(findings[0].ruleId).toBe('wall-thickness');
  });
  it('passes a thick block', () => {
    const findings = checkWallThickness(makeBox(20, 20, 20), FAB_PROFILES.fdm);
    expect(findings.length).toBe(0);
  });
});

describe('DFM: min feature', () => {
  it('flags a sub-minimum-feature sliver', () => {
    const findings = checkMinFeature(makeBox(20, 20, 0.1), FAB_PROFILES.fdm);
    expect(findings.length).toBe(1);
    expect(findings[0].ruleId).toBe('min-feature');
  });
});
