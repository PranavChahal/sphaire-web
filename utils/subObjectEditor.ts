/**
 * Sub-Object Editor Utilities
 * Advanced mesh topology editing for vertices, edges, and faces
 * with Babylon.js + OpenCascade.js integration
 */

import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { PickingInfo } from '@babylonjs/core/Collisions/pickingInfo';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { Matrix } from '@babylonjs/core/Maths/math';

/**
 * Selection mode for sub-object editing
 */
export type SubObjectMode = 'vertex' | 'edge' | 'face';

/**
 * Interface for OpenCascade.js shape operations
 */
export interface OCCShape {
  delete(): void;
  [key: string]: any;
}

/**
 * Interface for tessellation results from OpenCascade.js
 */
export interface TessellationResult {
  positions: Float32Array;
  indices: Uint32Array;
  normals?: Float32Array;
}

/**
 * Vertex information for sub-object operations
 */
export interface VertexInfo {
  index: number;
  position: Vector3;
  distance: number;
}

/**
 * CAD data associated with a mesh
 */
export interface CADData {
  shape: OCCShape | null;
  isPreciseMode: boolean;
  originalVertices?: Float32Array;
  originalIndices?: Uint32Array;
}

// Global map to store CAD data for meshes
const meshCADDataMap = new Map<string, CADData>();

/**
 * Get or create CAD data for a mesh
 * @param mesh - Target mesh
 * @returns CAD data for the mesh
 */
export function getCADData(mesh: Mesh): CADData {
  if (!meshCADDataMap.has(mesh.name)) {
    meshCADDataMap.set(mesh.name, {
      shape: null,
      isPreciseMode: false
    });
  }
  return meshCADDataMap.get(mesh.name)!;
}

/**
 * Set CAD data for a mesh
 * @param mesh - Target mesh
 * @param shape - CAD shape to associate with the mesh
 * @param isPreciseMode - Whether to use precise CAD operations
 */
export function setCADData(mesh: Mesh, shape: OCCShape, isPreciseMode: boolean = true): void {
  const positions = mesh.getVerticesData('position');
  const indices = mesh.getIndices();
  
  meshCADDataMap.set(mesh.name, {
    shape,
    isPreciseMode,
    originalVertices: positions ? new Float32Array(positions) : undefined,
    originalIndices: indices ? new Uint32Array(indices) : undefined
  });
}

/**
 * Select mesh elements based on picking information and mode
 * @param mesh - Target Babylon.js mesh
 * @param mode - Selection mode (vertex, edge, face)
 * @param pickInfo - Picking result from scene interaction
 * @param radius - Selection radius for vertex/edge selection
 * @returns Array of selected element IDs
 */
export function selectElements(
  mesh: Mesh,
  mode: SubObjectMode,
  pickInfo: PickingInfo,
  radius: number = 0.1
): number[] {
  // Null checks and validation
  if (!mesh || !pickInfo || !pickInfo.hit || !pickInfo.pickedPoint) {
    console.warn('Invalid mesh or pick info for element selection');
    return [];
  }

  const pickPosition = pickInfo.pickedPoint;
  
  try {
    switch (mode) {
      case 'vertex':
        return selectVertices(mesh, pickPosition, radius);
      
      case 'edge':
        return selectEdges(mesh, pickPosition, radius);
      
      case 'face':
        return selectFaces(mesh, pickInfo);
      
      default:
        console.warn(`Unknown selection mode: ${mode}`);
        return [];
    }
  } catch (error) {
    console.error('Error in selectElements:', error);
    return [];
  }
}

/**
 * Select vertices near the picked position
 * @param mesh - Target mesh
 * @param pickPosition - World position of pick
 * @param radius - Selection radius
 * @returns Array of vertex indices
 */
function selectVertices(mesh: Mesh, pickPosition: Vector3, radius: number): number[] {
  const positions = mesh.getVerticesData('position');
  if (!positions) {
    console.warn('Mesh has no position data for vertex selection');
    return [];
  }

  const selectedVertices: number[] = [];
  
  // Index-based loop for performance
  for (let i = 0; i < positions.length; i += 3) {
    const vertexPos = new Vector3(positions[i], positions[i + 1], positions[i + 2]);
    
    // Transform to world space
    const worldPos = Vector3.TransformCoordinates(vertexPos, mesh.getWorldMatrix());
    
    // Check distance to pick position
    const distance = Vector3.Distance(worldPos, pickPosition);
    if (distance <= radius) {
      selectedVertices.push(i / 3); // Vertex index
    }
  }
  
  console.log(`Selected ${selectedVertices.length} vertices`);
  return selectedVertices;
}

/**
 * Select edges near the picked position
 * @param mesh - Target mesh
 * @param pickPosition - World position of pick
 * @param radius - Selection radius
 * @returns Array of edge indices
 */
function selectEdges(mesh: Mesh, pickPosition: Vector3, radius: number): number[] {
  const indices = mesh.getIndices();
  const positions = mesh.getVerticesData('position');
  
  if (!indices || !positions) {
    console.warn('Mesh missing geometry data for edge selection');
    return [];
  }

  const selectedEdges: number[] = [];
  
  // Process triangular faces to find edges
  for (let i = 0; i < indices.length; i += 3) {
    const face = [indices[i], indices[i + 1], indices[i + 2]];
    
    // Check each edge of the triangle
    for (let j = 0; j < 3; j++) {
      const v1Index = face[j] * 3;
      const v2Index = face[(j + 1) % 3] * 3;
      
      const v1 = new Vector3(positions[v1Index], positions[v1Index + 1], positions[v1Index + 2]);
      const v2 = new Vector3(positions[v2Index], positions[v2Index + 1], positions[v2Index + 2]);
      
      // Transform to world space
      const worldV1 = Vector3.TransformCoordinates(v1, mesh.getWorldMatrix());
      const worldV2 = Vector3.TransformCoordinates(v2, mesh.getWorldMatrix());
      
      // Calculate distance from pick point to edge
      const edgeDistance = distancePointToLine(pickPosition, worldV1, worldV2);
      
      if (edgeDistance <= radius) {
        const edgeId = face[j] * 1000 + face[(j + 1) % 3]; // Unique edge ID
        if (!selectedEdges.includes(edgeId)) {
          selectedEdges.push(edgeId);
        }
      }
    }
  }
  
  console.log(`Selected ${selectedEdges.length} edges`);
  return selectedEdges;
}

/**
 * Select faces based on pick information
 * @param pickInfo - Pick information containing face ID
 * @returns Array of face indices
 */
function selectFaces(mesh: Mesh, pickInfo: PickingInfo): number[] {
  if (pickInfo.faceId === undefined || pickInfo.faceId === null) {
    console.warn('No face ID in pick info');
    return [];
  }

  const positions = mesh.getVerticesData('position');
  const indices = mesh.getIndices();
  if (!positions || !indices) return [pickInfo.faceId];

  const clickedOffset = pickInfo.faceId * 3;
  if (clickedOffset + 2 >= indices.length) return [pickInfo.faceId];

  const point = (vertexIndex: number) => {
    const offset = vertexIndex * 3;
    return new Vector3(positions[offset], positions[offset + 1], positions[offset + 2]);
  };
  const a = point(indices[clickedOffset]);
  const b = point(indices[clickedOffset + 1]);
  const c = point(indices[clickedOffset + 2]);
  const normal = Vector3.Cross(b.subtract(a), c.subtract(a)).normalize();
  const tolerance = Math.max(1e-4, mesh.getBoundingInfo().boundingBox.extendSize.length() * 1e-3);
  const coplanar: number[] = [];

  // Babylon primitives split each flat side into two triangles. Treat those
  // triangles as one face so clicking a box side selects the whole side.
  for (let faceId = 0; faceId < indices.length / 3; faceId += 1) {
    const offset = faceId * 3;
    const p0 = point(indices[offset]);
    const p1 = point(indices[offset + 1]);
    const p2 = point(indices[offset + 2]);
    const candidateNormal = Vector3.Cross(p1.subtract(p0), p2.subtract(p0)).normalize();
    const aligned = Math.abs(Vector3.Dot(normal, candidateNormal)) > 0.999;
    const distance = Math.abs(Vector3.Dot(normal, p0.subtract(a)));
    if (aligned && distance <= tolerance) coplanar.push(faceId);
  }

  console.log(`Selected face group: ${coplanar.join(', ')}`);
  return coplanar.length ? coplanar : [pickInfo.faceId];
}

function elementVertexIndices(
  mesh: Mesh,
  selectedElements: number[],
  mode: SubObjectMode
): number[] {
  if (mode === 'vertex') return Array.from(new Set(selectedElements));
  if (mode === 'edge') {
    const vertices = new Set<number>();
    selectedElements.forEach((edgeId) => {
      vertices.add(Math.floor(edgeId / 1000));
      vertices.add(edgeId % 1000);
    });
    return Array.from(vertices);
  }

  const indices = mesh.getIndices();
  if (!indices) return [];
  const vertices = new Set<number>();
  selectedElements.forEach((faceId) => {
    const offset = faceId * 3;
    if (offset + 2 < indices.length) {
      vertices.add(indices[offset]);
      vertices.add(indices[offset + 1]);
      vertices.add(indices[offset + 2]);
    }
  });
  return Array.from(vertices);
}

function selectedFaceNormal(mesh: Mesh, faceIds: number[]): Vector3 | null {
  const positions = mesh.getVerticesData('position');
  const indices = mesh.getIndices();
  if (!positions || !indices || faceIds.length === 0) return null;
  const normal = Vector3.Zero();
  for (const faceId of faceIds) {
    const offset = faceId * 3;
    if (offset + 2 >= indices.length) continue;
    const read = (index: number) => {
      const i = index * 3;
      return new Vector3(positions[i], positions[i + 1], positions[i + 2]);
    };
    const a = read(indices[offset]);
    const b = read(indices[offset + 1]);
    const c = read(indices[offset + 2]);
    normal.addInPlace(Vector3.Cross(b.subtract(a), c.subtract(a)).normalize());
  }
  return normal.lengthSquared() > 1e-8 ? normal.normalize() : null;
}

/**
 * Calculate distance from point to line segment
 * @param point - Point to measure from
 * @param lineStart - Start of line segment
 * @param lineEnd - End of line segment
 * @returns Distance from point to line
 */
function distancePointToLine(point: Vector3, lineStart: Vector3, lineEnd: Vector3): number {
  const lineVec = lineEnd.subtract(lineStart);
  const pointVec = point.subtract(lineStart);
  
  const lineLength = lineVec.length();
  if (lineLength === 0) return Vector3.Distance(point, lineStart);
  
  const t = Math.max(0, Math.min(1, Vector3.Dot(pointVec, lineVec) / (lineLength * lineLength)));
  const projection = lineStart.add(lineVec.scale(t));
  
  return Vector3.Distance(point, projection);
}

/**
 * Safely recalculate normals for a mesh
 * @param mesh - Target mesh
 * @param positions - New position data
 * @returns Whether normals were successfully recalculated
 */
function recalculateNormals(mesh: Mesh, positions: number[]): boolean {
  try {
    const vertexData = VertexData.ExtractFromMesh(mesh);
    const indices = mesh.getIndices();
    
    if (!vertexData || !indices || !vertexData.normals) {
      console.warn('Cannot recalculate normals: missing vertex data or indices');
      return false;
    }
    
    // Create new normals array
    const newNormals = new Float32Array(positions.length);
    VertexData.ComputeNormals(positions, indices, newNormals);
    
    // Update mesh with new normals
    mesh.setVerticesData('normal', newNormals);
    return true;
    
  } catch (error) {
    console.error('Error recalculating normals:', error);
    return false;
  }
}

/**
 * Transform selected elements with arbitrary transformation
 * @param mesh - Target mesh
 * @param selectedElements - Array of selected element indices
 * @param mode - Selection mode (vertex, edge, face)
 * @param transform - Transformation matrix to apply
 * @returns Whether transformation was successful
 */
export function transformElements(
  mesh: Mesh,
  selectedElements: number[],
  mode: SubObjectMode,
  transform: Matrix
): boolean {
  if (!mesh || selectedElements.length === 0) {
    console.warn('Invalid mesh or no elements selected for transformation');
    return false;
  }

  try {
    const positions = mesh.getVerticesData('position');
    if (!positions) {
      console.warn('Mesh has no position data for transformation');
      return false;
    }

    const newPositions = [...positions];
    
    switch (mode) {
      case 'vertex':
        // Transform selected vertices
        for (const vertexIndex of selectedElements) {
          const i = vertexIndex * 3;
          if (i + 2 < newPositions.length) {
            const vertex = new Vector3(newPositions[i], newPositions[i + 1], newPositions[i + 2]);
            const transformedVertex = Vector3.TransformCoordinates(vertex, transform);
            
            newPositions[i] = transformedVertex.x;
            newPositions[i + 1] = transformedVertex.y;
            newPositions[i + 2] = transformedVertex.z;
          }
        }
        break;
        
      case 'edge':
        // Transform vertices of selected edges
        const edgeVertices = new Set<number>();
        for (const edgeId of selectedElements) {
          const v1 = Math.floor(edgeId / 1000);
          const v2 = edgeId % 1000;
          edgeVertices.add(v1);
          edgeVertices.add(v2);
        }
        
        for (const vertexIndex of edgeVertices) {
          const i = vertexIndex * 3;
          if (i + 2 < newPositions.length) {
            const vertex = new Vector3(newPositions[i], newPositions[i + 1], newPositions[i + 2]);
            const transformedVertex = Vector3.TransformCoordinates(vertex, transform);
            
            newPositions[i] = transformedVertex.x;
            newPositions[i + 1] = transformedVertex.y;
            newPositions[i + 2] = transformedVertex.z;
          }
        }
        break;
        
      case 'face':
        // Transform vertices of selected faces
        const indices = mesh.getIndices();
        if (!indices) {
          console.warn('Mesh has no indices for face transformation');
          return false;
        }
        
        const faceVertices = new Set<number>();
        for (const faceId of selectedElements) {
          const baseIndex = faceId * 3;
          if (baseIndex + 2 < indices.length) {
            faceVertices.add(indices[baseIndex]);
            faceVertices.add(indices[baseIndex + 1]);
            faceVertices.add(indices[baseIndex + 2]);
          }
        }
        
        for (const vertexIndex of faceVertices) {
          const i = vertexIndex * 3;
          if (i + 2 < newPositions.length) {
            const vertex = new Vector3(newPositions[i], newPositions[i + 1], newPositions[i + 2]);
            const transformedVertex = Vector3.TransformCoordinates(vertex, transform);
            
            newPositions[i] = transformedVertex.x;
            newPositions[i + 1] = transformedVertex.y;
            newPositions[i + 2] = transformedVertex.z;
          }
        }
        break;
    }
    
    // Update mesh with new positions
    mesh.setVerticesData('position', newPositions);
    
    // Safely recalculate normals
    recalculateNormals(mesh, newPositions);
    
    console.log(`Transformed ${selectedElements.length} ${mode} elements`);
    return true;
    
  } catch (error) {
    console.error('Error in transformElements:', error);
    return false;
  }
}

/**
 * Extrude selected elements of a mesh
 * @param mesh - Target mesh to extrude
 * @param selectedElements - Array of selected element indices
 * @param distance - Extrusion distance
 * @param direction - Optional extrusion direction (defaults to normal)
 * @returns Whether extrusion was successful
 */
export async function extrudeElements(
  mesh: Mesh,
  selectedElements: number[],
  distance: number,
  direction?: Vector3,
  mode: SubObjectMode = 'vertex'
): Promise<boolean> {
  if (!mesh || selectedElements.length === 0) {
    console.warn('Invalid mesh or no elements selected for extrusion');
    return false;
  }

  try {
    console.log(`Extruding ${selectedElements.length} elements by distance ${distance}`);
    
    // For now, implement basic vertex extrusion
    // In a full implementation, this would use OpenCascade.js for precise CAD operations
    const positions = mesh.getVerticesData('position');
    if (!positions) {
      console.warn('Mesh has no position data for extrusion');
      return false;
    }

    const newPositions = [...positions];
    const vertexIndices = elementVertexIndices(mesh, selectedElements, mode);
    const extrudeDir = direction || (mode === 'face' ? selectedFaceNormal(mesh, selectedElements) : null) || new Vector3(0, 1, 0);
    
    // Simple vertex extrusion for demonstration
    for (const vertexIndex of vertexIndices) {
      const i = vertexIndex * 3;
      if (i + 2 < newPositions.length) {
        const offset = extrudeDir.scale(distance);
        newPositions[i] += offset.x;
        newPositions[i + 1] += offset.y;
        newPositions[i + 2] += offset.z;
      }
    }
    
    // Update mesh
    mesh.setVerticesData('position', newPositions);
    
    // Safely recalculate normals
    recalculateNormals(mesh, newPositions);
    
    console.log(`Successfully extruded ${selectedElements.length} elements`);
    return true;
    
  } catch (error) {
    console.error('Error in extrudeElements:', error);
    return false;
  }
}

/**
 * Bevel selected elements of a mesh
 * @param mesh - Target mesh to bevel
 * @param selectedElements - Array of selected element indices
 * @param amount - Bevel amount
 * @returns Whether bevel was successful
 */
export async function bevelElements(
  mesh: Mesh,
  selectedElements: number[],
  amount: number,
  mode: SubObjectMode = 'vertex'
): Promise<boolean> {
  if (!mesh || selectedElements.length === 0) {
    console.warn('Invalid mesh or no elements selected for bevel');
    return false;
  }

  try {
    console.log(`Beveling ${selectedElements.length} elements with amount ${amount}`);
    
    // For now, implement basic vertex smoothing as a bevel approximation
    // In a full implementation, this would use OpenCascade.js for precise CAD operations
    const positions = mesh.getVerticesData('position');
    if (!positions) {
      console.warn('Mesh has no position data for bevel');
      return false;
    }

    const newPositions = [...positions];
    const vertexIndices = elementVertexIndices(mesh, selectedElements, mode);
    if (vertexIndices.length === 0) return false;
    const center = vertexIndices.reduce((sum, vertexIndex) => {
      const i = vertexIndex * 3;
      return sum.add(new Vector3(newPositions[i], newPositions[i + 1], newPositions[i + 2]));
    }, Vector3.Zero()).scale(1 / vertexIndices.length);
    const diagonal = Math.max(0.01, mesh.getBoundingInfo().boundingBox.extendSize.length() * 2);
    const factor = Math.max(0.5, Math.min(0.98, 1 - amount / diagonal));

    // Pull selected vertices toward their local selection centre. This provides
    // an immediate mesh bevel for primitives while retaining an editable solid.
    for (const vertexIndex of vertexIndices) {
      const i = vertexIndex * 3;
      if (i + 2 < newPositions.length) {
        const vertex = new Vector3(newPositions[i], newPositions[i + 1], newPositions[i + 2]);
        const moved = center.add(vertex.subtract(center).scale(factor));

        newPositions[i] = moved.x;
        newPositions[i + 1] = moved.y;
        newPositions[i + 2] = moved.z;
      }
    }
    
    // Update mesh
    mesh.setVerticesData('position', newPositions);
    
    // Safely recalculate normals
    recalculateNormals(mesh, newPositions);
    
    console.log(`Successfully beveled ${selectedElements.length} elements`);
    return true;
    
  } catch (error) {
    console.error('Error in bevelElements:', error);
    return false;
  }
}

/**
 * Find closest vertices to a given point within a maximum distance
 * @param mesh - Target mesh
 * @param pickPos - Position to find closest vertices to
 * @param maxDistance - Maximum distance to consider vertices
 * @returns Array of vertex information objects
 */
export function findClosestVertices(
  mesh: Mesh,
  pickPos: Vector3,
  maxDistance: number = 0.1
): VertexInfo[] {
  const positions = mesh.getVerticesData('position');
  if (!positions) {
    console.warn('Mesh has no position data for vertex search');
    return [];
  }

  const vertices: VertexInfo[] = [];
  
  for (let i = 0; i < positions.length; i += 3) {
    const vertexPos = new Vector3(positions[i], positions[i + 1], positions[i + 2]);
    const worldPos = Vector3.TransformCoordinates(vertexPos, mesh.getWorldMatrix());
    const distance = Vector3.Distance(worldPos, pickPos);
    
    if (distance <= maxDistance) {
      vertices.push({
        index: i / 3,
        position: worldPos,
        distance: distance
      });
    }
  }
  
  // Sort by distance (closest first)
  vertices.sort((a, b) => a.distance - b.distance);
  
  return vertices;
}

/**
 * Create a CAD shape from a mesh using OpenCascade.js
 * @param mesh - Source mesh
 * @returns Promise resolving to the created CAD shape or null if failed
 */
export async function createShapeFromMesh(mesh: Mesh): Promise<OCCShape | null> {
  try {
    console.log('Creating CAD shape from mesh (mock implementation)');
    
    // This is a mock implementation
    // In a real implementation, this would:
    // 1. Extract mesh geometry (vertices, indices, normals)
    // 2. Use OpenCascade.js to create a solid from the mesh
    // 3. Return the resulting OCC shape
    
    const positions = mesh.getVerticesData('position');
    const indices = mesh.getIndices();
    
    const mockShape: OCCShape = {
      delete: () => console.log('Mock shape deleted'),
      type: 'mock_shape',
      vertices: positions,
      indices: indices
    };
    
    // Store the shape in CAD data
    setCADData(mesh, mockShape, true);
    
    return mockShape;
    
  } catch (error) {
    console.error('Error creating shape from mesh:', error);
    return null;
  }
}

/**
 * Update mesh geometry from a CAD shape
 * @param _mesh - Target mesh to update
 * @param _shape - Source CAD shape
 * @returns Whether update was successful
 */
export async function updateMeshFromCADShape(_mesh: Mesh, _shape: OCCShape): Promise<boolean> {
  try {
    console.log('Updating mesh from CAD shape (mock implementation)');
    
    // This is a mock implementation
    // In a real implementation, this would:
    // 1. Tessellate the CAD shape using OpenCascade.js
    // 2. Extract vertices, indices, and normals from tessellation
    // 3. Update the Babylon.js mesh with new geometry
    
    // For now, just log the operation
    console.log('Mock: Mesh updated from CAD shape');
    
    return true;
    
  } catch (error) {
    console.error('Error updating mesh from CAD shape:', error);
    return false;
  }
}

// Export the meshCADDataMap for external access if needed
export { meshCADDataMap };
