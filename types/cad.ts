/**
 * CAD module shared types
 * Centralizes all type definitions used across the Sphaire CAD system
 */

import { OCCShape as ImportedOCCShape } from '../hooks/useOCC';

/**
 * SubObject selection modes for 3D editing
 */
export type SubObjectMode = 'vertex' | 'edge' | 'face';

/**
 * Re-export the OCCShape type from useOCC
 */
export type OCCShape = ImportedOCCShape;

/**
 * CAD data interface for linking meshes with their CAD representation
 */
export interface CADData {
  shape: OCCShape | null;
  isPreciseMode: boolean;
}

/**
 * Interface for AI executor operations
 */
export interface AIExecutor {
  executeCADOperation(operation: string, params: any): Promise<any>;
}

/**
 * Result of tessellating an OCC shape into mesh data
 */
export interface TessellationResult {
  positions: Float32Array;
  normals: Float32Array;
  indices: Uint32Array;
}

/**
 * Vertex information for closest vertex calculations
 */
export interface VertexInfo {
  index: number;
  position: { x: number; y: number; z: number };
  distance: number;
}
