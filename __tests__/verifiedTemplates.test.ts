import { extractGearTeeth, verifiedCADTemplate } from '../services/generative/verifiedTemplates';
import { staticScan } from '../services/sandbox/staticScan';

describe('verified CAD templates', () => {
  it('extracts and clamps requested gear tooth counts', () => {
    expect(extractGearTeeth('create a 24 teeth gear')).toBe(24);
    expect(extractGearTeeth('gear with tooth count 32')).toBe(32);
    expect(extractGearTeeth('make a gear')).toBe(24);
    expect(extractGearTeeth('make a 2 tooth gear')).toBe(6);
    expect(extractGearTeeth('make a 999 teeth gear')).toBe(120);
    expect(extractGearTeeth('make a bracket')).toBeNull();
  });

  it('builds a 24-tooth gear using only supported wrapper calls', () => {
    const code = verifiedCADTemplate('create a 24 teeth gear', 'opencascade');
    expect(code).toBeTruthy();
    expect(code).toContain('const teeth = 24;');
    expect(code).not.toMatch(/gp_Pnt|makePolygon|makeWireFromPoints|\boc\./);
    expect(staticScan(code || '').safe).toBe(true);

    const calls = { union: 0, difference: 0 };
    const shape = { ShapeType: () => 2 };
    const occ = {
      createCylinder: jest.fn(() => shape),
      createBox: jest.fn(() => shape),
      translate: jest.fn(() => shape),
      rotate: jest.fn(() => shape),
      union: jest.fn(() => {
        calls.union += 1;
        return shape;
      }),
      difference: jest.fn(() => {
        calls.difference += 1;
        return shape;
      }),
    };

    const result = new Function('occ', code || '')(occ);
    expect(result).toBe(shape);
    expect(calls.union).toBe(24);
    expect(calls.difference).toBe(1);
  });
});
