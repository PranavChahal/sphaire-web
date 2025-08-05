/**
 * Type definitions for OpenCascade.js worker interface
 */

import { OCCShape } from '../hooks/useOCC';

export interface OCCWorker {
  tessellate: (shape: OCCShape) => Promise<{
    positions: Float32Array;
    indices: Uint32Array;
  }>;
  
  bevel: (shape: OCCShape, faceIndices: number[], amount: number) => Promise<OCCShape>;
  
  extrude: (shape: OCCShape, faceIndices: number[], distance: number, direction: [number, number, number]) => Promise<OCCShape>;
  
  boolean: (
    shape1: OCCShape,
    shape2: OCCShape,
    operation: 'union' | 'subtract' | 'intersect'
  ) => Promise<OCCShape>;
  
  createFromMesh: (positions: Float32Array, indices: Uint32Array) => Promise<OCCShape>;
}

export interface MeshData {
  positions: number[];
  indices: number[];
  normals?: number[];
}
