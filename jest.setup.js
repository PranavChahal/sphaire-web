require('@testing-library/jest-dom');

// Mock for the BabylonJS canvas element and WebGL context
global.HTMLCanvasElement.prototype.getContext = () => {
  return {
    viewport: jest.fn(),
    clear: jest.fn(),
  };
};

jest.mock('opencascade.js', () => {
  return {
    // Add mock implementations as needed
  };
}, { virtual: true });

jest.mock('@/hooks/useOCC', () => {
  return {
    useOCC: jest.fn().mockReturnValue({
      createBox: jest.fn().mockResolvedValue({ type: 'box', id: 'mock-box' }),
      tessellate: jest.fn().mockResolvedValue({
        positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
        indices: new Uint32Array([0, 1, 2]),
        normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1])
      })
    })
  };
});
