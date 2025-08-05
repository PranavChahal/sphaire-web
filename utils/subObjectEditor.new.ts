/**
 * Sub-Object Editor
 * Provides utilities for manipulating mesh sub-objects (vertices, edges, faces)
 * with integration to OpenCascade.js for CAD operations and voice control
 */

import { Mesh, Vector3, PickingInfo, VertexData } from '@babylonjs/core';
import { SubObjectMode, CADData, OCCShape, AIExecutor, VertexInfo } from '../types/cad';
import useOCC from '../hooks/useOCC';

// Create a map to store CAD data for each mesh
const meshCADDataMap = new Map<string, CADData>();

/**
 * Mock AI executor for development and testing
 */
const mockAIExecutor: AIExecutor = {
  executeCADOperation: async (operation: string, params: any): Promise<any> => {
    console.log(`Mock AI executor called with operation ${operation}:`, params);
    return { success: true, message: 'Mock operation completed' };
  }
};

/**
 * Safe dynamic import for AI executor module
 * @returns AI executor instance or mock if import fails
 */
async function getAIExecutor(): Promise<AIExecutor> {
  try {
    // Dynamic import with timeout
    const importPromise = new Promise<any>((resolve, reject) => {
      try {
        // Use Function constructor to avoid TypeScript errors with dynamic imports
        const importFunc = new Function('return import("../services/aiExecutor")');
        importFunc()
          .then((module: any) => resolve(module.default || module))
          .catch(reject);
      } catch (error) {
        reject(error);
      }
      
      // Set timeout to avoid hanging
      setTimeout(() => reject(new Error('AI executor import timeout')), 3000);
    });
    
    const module = await importPromise;
    return module.default || module;
  } catch (error) {
    console.warn('Failed to import AI executor, using mock:', error);
    return mockAIExecutor;
  }
}

/**
 * Selects mesh elements based on picking information and mode
 * 
 * @param mesh - Target Babylon.js mesh
 * @param pickResult - Picking result from scene
 * @param mode - Selection mode (vertex, edge, face)
 * @param radius - Selection radius for vertex mode
 * @returns Array of selected element indices
 */
export function selectElements(
  mesh: Mesh,
  pickResult: PickingInfo,
  mode: SubObjectMode,
  radius: number = 0.1
): number[] {
  // Bail early if no valid pick or not on this mesh
  if (!pickResult.hit || !pickResult.pickedMesh || pickResult.pickedMesh !== mesh) {
    return [];
  }
  
  // Get vertex data from mesh
  const positions = mesh.getVerticesData('position');
  const indices = mesh.getIndices();
  
  if (!positions || !indices) {
    console.error('Mesh is missing vertex data');
    return [];
  }
  
  const selectedElements: number[] = [];
  
  // Convert world to local coordinates
  const worldInverse = mesh.getWorldMatrix().clone().invert();
  const localPickPos = Vector3.Zero();
  
  if (pickResult.pickedPoint) {
    Vector3.TransformCoordinatesToRef(pickResult.pickedPoint, worldInverse, localPickPos);
  } else {
    return []; // No picked point, can't select anything
  }
  
  // Handle different selection modes
  switch (mode) {
    case 'vertex': {
      // Find vertices close to picking point
      if (positions instanceof Float32Array) {
        // Use index-based iteration for typed arrays
        for (let i = 0; i < positions.length; i += 3) {
          // Check array bounds
          if (i + 2 >= positions.length) continue;
          
          const vertex = new Vector3(positions[i], positions[i + 1], positions[i + 2]);
          const distance = Vector3.Distance(localPickPos, vertex);
          
          if (distance < radius) {
            // Add vertex index to selected elements
            selectedElements.push(i / 3);
          }
        }
      }
      break;
    }
      
    case 'edge': {
      // Only handle edge selection if we have a valid face ID
      if (pickResult.faceId === undefined || pickResult.faceId < 0) break;
      
      // Get the face ID
      const faceId = pickResult.faceId;
      
      // Get vertices of the face
      const vertIdx1 = indices[faceId * 3];
      const vertIdx2 = indices[faceId * 3 + 1];
      const vertIdx3 = indices[faceId * 3 + 2];
      
      // Define edges as pairs of vertex indices
      const edges = [
        [vertIdx1, vertIdx2],
        [vertIdx2, vertIdx3],
        [vertIdx3, vertIdx1]
      ];
      
      // Find closest edge to picking point
      let minDistance = Number.MAX_VALUE;
      let closestEdgeIndex = 0;
      
      // Calculate distance to each edge
      for (let i = 0; i < edges.length; i++) {
        const edge = edges[i];
        
        // Get vertex positions
        const v1 = new Vector3(
          positions[edge[0] * 3],
          positions[edge[0] * 3 + 1],
          positions[edge[0] * 3 + 2]
        );
        
        const v2 = new Vector3(
          positions[edge[1] * 3],
          positions[edge[1] * 3 + 1],
          positions[edge[1] * 3 + 2]
        );
        
        // Calculate distance from point to line segment
        const edgeLength = Vector3.Distance(v1, v2);
        if (edgeLength === 0) continue;
        
        const v1ToPoint = localPickPos.subtract(v1);
        const v1ToV2 = v2.subtract(v1).normalize();
        
        // Project v1ToPoint onto v1ToV2
        const dot = Vector3.Dot(v1ToPoint, v1ToV2);
        
        // Calculate closest point on line
        let closestPoint: Vector3;
        
        if (dot <= 0) {
          // Closest to v1
          closestPoint = v1;
        } else if (dot >= edgeLength) {
          // Closest to v2
          closestPoint = v2;
        } else {
          // Closest to point on line
          closestPoint = v1.add(v1ToV2.scale(dot));
        }
        
        // Calculate distance to closest point
        const distance = Vector3.Distance(localPickPos, closestPoint);
        
        if (distance < minDistance) {
          minDistance = distance;
          closestEdgeIndex = i;
        }
      }
      
      // Add the closest edge
      selectedElements.push(faceId * 3 + closestEdgeIndex);
      break;
    }
      
    case 'face': {
      // Simply return the face ID if valid
      if (pickResult.faceId !== undefined && pickResult.faceId >= 0) {
        selectedElements.push(pickResult.faceId);
      }
      break;
    }
  }
  
  return selectedElements;
}

/**
 * Find closest vertices to a given point within a maximum distance
 * 
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
  if (!positions) return [];
  
  const worldInverse = mesh.getWorldMatrix().clone().invert();
  const localPoint = Vector3.TransformCoordinates(pickPos, worldInverse);
  
  const result: VertexInfo[] = [];
  
  // Use indexed iteration for typed arrays
  for (let i = 0; i < positions.length; i += 3) {
    // Bounds check
    if (i + 2 >= positions.length) continue;
    
    const x = positions[i];
    const y = positions[i + 1];
    const z = positions[i + 2];
    
    // Create vertex vector
    const vertexPos = new Vector3(x, y, z);
    const distance = Vector3.Distance(localPoint, vertexPos);
    
    if (distance <= maxDistance) {
      result.push({
        index: i / 3,
        position: { x, y, z },
        distance
      });
    }
  }
  
  // Sort by distance
  result.sort((a, b) => a.distance - b.distance);
  
  return result;
}

/**
 * Extrude selected elements of a mesh
 * 
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
  direction?: Vector3
): Promise<boolean> {
  if (!mesh || !selectedElements || selectedElements.length === 0) {
    console.warn('Cannot extrude: No mesh or selected elements');
    return false;
  }
  
  // Check if we have CAD data for this mesh
  const meshId = mesh.uniqueId.toString();
  const cadData = meshCADDataMap.get(meshId);
  
  if (cadData?.isPreciseMode && cadData?.shape) {
    // Use precise CAD operations via AI executor
    try {
      const aiExecutor = await getAIExecutor();
      const result = await aiExecutor.executeCADOperation('extrude', {
        shape: cadData.shape,
        elements: selectedElements,
        distance,
        direction: direction ? { x: direction.x, y: direction.y, z: direction.z } : undefined
      });
      
      if (result.success && result.shape) {
        // Update the CAD shape
        cadData.shape = result.shape;
        
        // Update the mesh geometry from the new shape
        if (cadData.shape) {
          await updateMeshFromCADShape(mesh, cadData.shape);
        }
        return true;
      }
    } catch (error) {
      console.error('Failed to extrude with AI executor:', error);
      // Fall back to non-precise extrusion
    }
  }
  
  // Non-precise extrusion using mesh manipulation
  const vertexData = VertexData.ExtractFromMesh(mesh);
  const positions = vertexData.positions;
  const indices = vertexData.indices;
  const normals = vertexData.normals;
  
  if (!positions || !indices || !normals) {
    console.error('Mesh is missing required vertex data for extrusion');
    return false;
  }
  
  // For simplicity, let's only handle face extrusion in non-precise mode
  const mode: SubObjectMode = 'face';
  
  // Calculate extrusion direction for each selected element
  if (mode === 'face') {
    for (let i = 0; i < selectedElements.length; i++) {
      const faceIdx = selectedElements[i];
      const idx1 = indices[faceIdx * 3];
      const idx2 = indices[faceIdx * 3 + 1];
      const idx3 = indices[faceIdx * 3 + 2];
      
      // Calculate average normal for the face
      const normal = new Vector3(
        (normals[idx1 * 3] + normals[idx2 * 3] + normals[idx3 * 3]) / 3,
        (normals[idx1 * 3 + 1] + normals[idx2 * 3 + 1] + normals[idx3 * 3 + 1]) / 3,
        (normals[idx1 * 3 + 2] + normals[idx2 * 3 + 2] + normals[idx3 * 3 + 2]) / 3
      ).normalize();
      
      // Use provided direction or face normal
      const extrudeDir = direction || normal;
      const scaledDir = extrudeDir.scale(distance);
      
      // Move the vertices along the extrusion direction
      // Note: This is a simplified approach and won't create proper extrusions
      // with side faces, just moves the existing face
      positions[idx1 * 3] += scaledDir.x;
      positions[idx1 * 3 + 1] += scaledDir.y;
      positions[idx1 * 3 + 2] += scaledDir.z;
      
      positions[idx2 * 3] += scaledDir.x;
      positions[idx2 * 3 + 1] += scaledDir.y;
      positions[idx2 * 3 + 2] += scaledDir.z;
      
      positions[idx3 * 3] += scaledDir.x;
      positions[idx3 * 3 + 1] += scaledDir.y;
      positions[idx3 * 3 + 2] += scaledDir.z;
    }
    
    // Update the mesh with modified positions
    const newVertexData = new VertexData();
    newVertexData.positions = positions;
    newVertexData.indices = indices;
    newVertexData.normals = normals;
    
    if (vertexData.uvs) {
      newVertexData.uvs = vertexData.uvs;
    }
    
    newVertexData.applyToMesh(mesh);
    
    // Ensure normals are recalculated
    mesh.createNormals(true);
    
    return true;
  }
  
  return false;
}

/**
 * Bevel selected elements of a mesh
 * 
 * @param mesh - Target mesh to bevel
 * @param selectedElements - Array of selected element indices
 * @param amount - Bevel amount
 * @returns Whether bevel was successful
 */
export async function bevelElements(
  mesh: Mesh,
  selectedElements: number[],
  amount: number
): Promise<boolean> {
  if (!mesh || !selectedElements || selectedElements.length === 0 || amount <= 0) {
    console.warn('Cannot bevel: Invalid parameters');
    return false;
  }
  
  // Check if we have CAD data for this mesh
  const meshId = mesh.uniqueId.toString();
  const cadData = meshCADDataMap.get(meshId);
  
  if (cadData?.isPreciseMode && cadData?.shape) {
    // Use precise CAD operations via AI executor
    try {
      const aiExecutor = await getAIExecutor();
      const result = await aiExecutor.executeCADOperation('bevel', {
        shape: cadData.shape,
        elements: selectedElements,
        amount
      });
      
      if (result.success && result.shape) {
        // Update the CAD shape
        cadData.shape = result.shape;
        
        // Update the mesh geometry from the new shape
        if (cadData.shape) {
          await updateMeshFromCADShape(mesh, cadData.shape);
        }
        return true;
      }
    } catch (error) {
      console.error('Failed to bevel with AI executor:', error);
      // Fall back to non-precise beveling
    }
  }
  
  // Non-precise beveling is complex and would require extensive mesh manipulation
  // that's beyond the scope of this implementation
  console.warn('Non-precise beveling is not implemented yet');
  return false;
}

/**
 * Update mesh geometry from a CAD shape
 * 
 * @param mesh - Target mesh to update
 * @param shape - Source CAD shape
 * @returns Whether update was successful
 */
export async function updateMeshFromCADShape(mesh: Mesh, shape: OCCShape): Promise<boolean> {
  try {
    // Access the OCC module via the hook
    const occ = useOCC();
    
    if (!occ) {
      console.error('Failed to access OCC module');
      return false;
    }
    
    // Tessellate the shape to get mesh data
    const tessellation = await occ.tessellate(shape);
    
    if (!tessellation) {
      console.error('Failed to tessellate shape');
      return false;
    }
    
    // Create a new VertexData from tessellation
    const vertexData = new VertexData();
    vertexData.positions = tessellation.positions;
    vertexData.indices = tessellation.indices;
    
    // Generate normals if not provided in tessellation
    if ('normals' in tessellation && tessellation.normals) {
      // Cast normals to the expected Float32Array type
      vertexData.normals = tessellation.normals as unknown as Float32Array;
    } else {
      // Create a new Float32Array for normals
      const normals = new Float32Array(tessellation.positions.length);
      VertexData.ComputeNormals(tessellation.positions, tessellation.indices, normals);
      vertexData.normals = normals;
    }
    
    // Apply to mesh
    vertexData.applyToMesh(mesh);
    return true;
  } catch (error) {
    console.error('Failed to update mesh from CAD shape:', error);
    return false;
  }
}

/**
 * Get or create CAD data for a mesh
 * 
 * @param mesh - Target mesh
 * @returns CAD data for the mesh
 */
export function getCADData(mesh: Mesh): CADData {
  const meshId = mesh.uniqueId.toString();
  
  // Return existing data if available
  if (meshCADDataMap.has(meshId)) {
    return meshCADDataMap.get(meshId)!;
  }
  
  // Create new CAD data
  const newData: CADData = {
    shape: null,
    isPreciseMode: false
  };
  
  meshCADDataMap.set(meshId, newData);
  return newData;
}

/**
 * Set CAD data for a mesh
 * 
 * @param mesh - Target mesh
 * @param shape - CAD shape to associate with the mesh
 * @param isPreciseMode - Whether to use precise CAD operations
 */
export function setCADData(mesh: Mesh, shape: OCCShape, isPreciseMode: boolean = true): void {
  const meshId = mesh.uniqueId.toString();
  
  meshCADDataMap.set(meshId, {
    shape,
    isPreciseMode
  });
}

/**
 * Create a CAD shape from a mesh
 * 
 * @param mesh - Source mesh
 * @returns Promise resolving to the created CAD shape or null if failed
 */
export async function createShapeFromMesh(mesh: Mesh): Promise<OCCShape | null> {
  try {
    const occ = useOCC();
    if (!occ) return null;
    
    const positions = mesh.getVerticesData('position');
    const indices = mesh.getIndices();
    
    if (!positions || !indices) return null;
    
    // Convert mesh to CAD shape using OCC
    // Use appropriate method based on what's available in the OCC API
    // This is a placeholder - actual implementation depends on the OCC API
    let shape: OCCShape | null = null;
    
    if ('createShapeFromMesh' in occ) {
      shape = await (occ as any).createShapeFromMesh(positions, indices);
    } else if ('createBox' in occ) {
      // Fallback to a simple box if createShapeFromMesh is not available
      console.warn('createShapeFromMesh not available, creating placeholder shape');
      const boundingInfo = mesh.getBoundingInfo();
      const dimensions = boundingInfo.maximum.subtract(boundingInfo.minimum);
      shape = await (occ as any).createBox(dimensions.x, dimensions.y, dimensions.z);
    }
    
    // Store CAD data for the mesh
    if (shape) {
      setCADData(mesh, shape, true);
    }
    
    return shape;
  } catch (error) {
    console.error('Failed to create shape from mesh:', error);
    return null;
  }
}

// Export the main functions
export {
  meshCADDataMap,
  getAIExecutor
};
