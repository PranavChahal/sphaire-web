/**
 * Module declarations for custom utilities
 */

declare module '../utils/meshOperations' {
  import { Mesh } from '@babylonjs/core';
  
  export function extrudeElements(
    mesh: Mesh,
    selectedElements: number[],
    distance: number,
    mode: 'face' | 'edge'
  ): Promise<boolean>;
  
  export function bevelElements(
    mesh: Mesh,
    selectedElements: number[],
    amount: number,
    mode: 'face' | 'edge'
  ): Promise<boolean>;
}
