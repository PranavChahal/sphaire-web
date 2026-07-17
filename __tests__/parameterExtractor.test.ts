/**
 * Regression tests for the parameter extractor fix.
 * The old substring filter dropped legit params containing "if"/"for"/"while".
 */
import { extractParametersFromCode } from '../utils/parameterExtractor';

describe('extractParametersFromCode', () => {
  it('keeps params whose names merely contain if/for/while as substrings', () => {
    const code = `
      const platformWidth = 40;   // contains "for"
      const liftHeight = 12;      // contains "if"
      const shiftX = 3;           // contains "if"
      let wallThickness = 2;
    `;
    const { parameters } = extractParametersFromCode(code);
    expect(parameters.platformWidth).toBe(40);
    expect(parameters.liftHeight).toBe(12);
    expect(parameters.shiftX).toBe(3);
    expect(parameters.wallThickness).toBe(2);
  });

  it('skips loop-counter variables', () => {
    const code = `const teeth = 20; let i = 0; let idx = 5; const width = 10;`;
    const { parameters } = extractParametersFromCode(code);
    expect(parameters.teeth).toBe(20);
    expect(parameters.width).toBe(10);
    expect(parameters).not.toHaveProperty('i');
    expect(parameters).not.toHaveProperty('idx');
  });

  it('handles negative and decimal literals', () => {
    const { parameters } = extractParametersFromCode(`const offset = -2.5; const r = 0.8;`);
    expect(parameters.offset).toBe(-2.5);
    expect(parameters.r).toBe(0.8);
  });
});
