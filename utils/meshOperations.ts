/**
 * Mesh Operations Module
 * Provides utilities for manipulating mesh geometry in Babylon.js
 * This is a companion module to subObjectEditor.ts
 */

import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { VertexBuffer } from '@babylonjs/core/Meshes/buffer';

/**
 * Extrude selected faces of a mesh along their normals
 * 
 * @param mesh - Target mesh to extrude
 * @param selectedFaces - Array of selected face indices
 * @param distance - Extrusion distance along face normals
 * @returns Promise resolving to whether extrusion was successful
 */
export async function extrudeFaces(
  mesh: Mesh,
  selectedFaces: number[],
  distance: number
): Promise<boolean> {
  if (!mesh || selectedFaces.length === 0 || distance === 0) {
    return false;
  }
  
  console.log(`Extruding ${selectedFaces.length} faces by distance ${distance}`);
  
  try {
    // Get current mesh data
    const positions = mesh.getVerticesData(VertexBuffer.PositionKind);
    const indices = mesh.getIndices();
    const normals = mesh.getVerticesData(VertexBuffer.NormalKind);
    
    if (!positions || !indices || !normals) {
      console.error('Missing vertex data for extrusion');
      return false;
    }
    
    // Convert to arrays for processing
    const positionsArray = Array.from(positions);
    const indicesArray = Array.from(indices);
    
    // Calculate face normals for selected faces
    const faceNormals = calculateFaceNormals(positionsArray, indicesArray, selectedFaces);
    
    // Find boundary edges and vertices of selected faces
    const { boundaryVertices, faceVertices } = findFaceBoundaries(indicesArray, selectedFaces);
    
    // Create vertex mapping (original -> new)
    const vertexMap = new Map<number, number>();
    const newPositions = [...positions];
    const newNormals = [...normals];
    const newIndices = [...indices];
    
    let nextVertexIndex = positions.length / 3;
    
    // Create extruded vertices
    faceVertices.forEach(vertexIndex => {
      if (!vertexMap.has(vertexIndex)) {
        const newIndex = nextVertexIndex++;
        vertexMap.set(vertexIndex, newIndex);
        
        // Calculate average normal for this vertex from selected faces
        const avgNormal = calculateVertexNormalFromFaces(vertexIndex, selectedFaces, indicesArray, faceNormals);
        
        // Create extruded position
        const originalPos = new Vector3(
          positions[vertexIndex * 3],
          positions[vertexIndex * 3 + 1],
          positions[vertexIndex * 3 + 2]
        );
        
        const extrudedPos = originalPos.add(avgNormal.scale(distance));
        
        // Add new vertex
        newPositions.push(extrudedPos.x, extrudedPos.y, extrudedPos.z);
        newNormals.push(avgNormal.x, avgNormal.y, avgNormal.z);
      }
    });
    
    // Update selected faces to use new vertices
    selectedFaces.forEach(faceIndex => {
      const startIdx = faceIndex * 3;
      const v1 = indicesArray[startIdx];
      const v2 = indicesArray[startIdx + 1];
      const v3 = indicesArray[startIdx + 2];
      
      newIndices[startIdx] = vertexMap.get(v1) || v1;
      newIndices[startIdx + 1] = vertexMap.get(v2) || v2;
      newIndices[startIdx + 2] = vertexMap.get(v3) || v3;
    });
    
    // Create side faces to connect original and extruded faces
    createSideFaces(newIndices, boundaryVertices, vertexMap);
    
    // Update mesh with new geometry
    mesh.updateVerticesData(VertexBuffer.PositionKind, newPositions);
    mesh.updateVerticesData(VertexBuffer.NormalKind, newNormals);
    mesh.setIndices(newIndices);
    
    // Recalculate normals for proper lighting
    const computedNormals: number[] = [];
    VertexData.ComputeNormals(newPositions, newIndices, computedNormals);
    mesh.updateVerticesData(VertexBuffer.NormalKind, computedNormals);
    
    console.log(`Successfully extruded faces. New vertex count: ${newPositions.length / 3}`);
    return true;
    
  } catch (error) {
    console.error('Face extrusion failed:', error);
    return false;
  }
}

/**
 * Calculate face normals for given face indices
 */
function calculateFaceNormals(
  positions: number[],
  indices: number[],
  faceIndices: number[]
): Map<number, Vector3> {
  const faceNormals = new Map<number, Vector3>();
  
  faceIndices.forEach(faceIndex => {
    const startIdx = faceIndex * 3;
    const v1Index = indices[startIdx];
    const v2Index = indices[startIdx + 1];
    const v3Index = indices[startIdx + 2];
    
    const v1 = new Vector3(
      positions[v1Index * 3],
      positions[v1Index * 3 + 1],
      positions[v1Index * 3 + 2]
    );
    const v2 = new Vector3(
      positions[v2Index * 3],
      positions[v2Index * 3 + 1],
      positions[v2Index * 3 + 2]
    );
    const v3 = new Vector3(
      positions[v3Index * 3],
      positions[v3Index * 3 + 1],
      positions[v3Index * 3 + 2]
    );
    
    // Calculate normal using cross product
    const edge1 = v2.subtract(v1);
    const edge2 = v3.subtract(v1);
    const normal = Vector3.Cross(edge1, edge2).normalize();
    
    faceNormals.set(faceIndex, normal);
  });
  
  return faceNormals;
}

/**
 * Find boundary vertices and all vertices of selected faces
 */
function findFaceBoundaries(
  indices: number[],
  selectedFaces: number[]
): { boundaryVertices: number[], faceVertices: Set<number> } {
  const faceVertices = new Set<number>();
  const edgeFaceCount = new Map<string, number>();
  
  // Collect all vertices and count edge usage
  selectedFaces.forEach(faceIndex => {
    const startIdx = faceIndex * 3;
    const v1 = indices[startIdx];
    const v2 = indices[startIdx + 1];
    const v3 = indices[startIdx + 2];
    
    faceVertices.add(v1);
    faceVertices.add(v2);
    faceVertices.add(v3);
    
    // Count edges (use consistent ordering)
    const edges = [
      `${Math.min(v1, v2)}_${Math.max(v1, v2)}`,
      `${Math.min(v2, v3)}_${Math.max(v2, v3)}`,
      `${Math.min(v3, v1)}_${Math.max(v3, v1)}`
    ];
    
    edges.forEach(edge => {
      edgeFaceCount.set(edge, (edgeFaceCount.get(edge) || 0) + 1);
    });
  });
  
  // Boundary edges appear only once in selected faces
  const boundaryEdges: string[] = [];
  edgeFaceCount.forEach((count, edge) => {
    if (count === 1) {
      boundaryEdges.push(edge);
    }
  });
  
  // Extract boundary vertices
  const boundaryVertexSet = new Set<number>();
  boundaryEdges.forEach(edge => {
    const [v1, v2] = edge.split('_').map(Number);
    boundaryVertexSet.add(v1);
    boundaryVertexSet.add(v2);
  });
  
  return {
    boundaryVertices: Array.from(boundaryVertexSet),
    faceVertices
  };
}

/**
 * Calculate average normal for a vertex from selected faces
 */
function calculateVertexNormalFromFaces(
  vertexIndex: number,
  selectedFaces: number[],
  indices: number[],
  faceNormals: Map<number, Vector3>
): Vector3 {
  let avgNormal = Vector3.Zero();
  let count = 0;
  
  selectedFaces.forEach(faceIndex => {
    const startIdx = faceIndex * 3;
    const faceVertices = [
      indices[startIdx],
      indices[startIdx + 1],
      indices[startIdx + 2]
    ];
    
    if (faceVertices.includes(vertexIndex)) {
      const faceNormal = faceNormals.get(faceIndex);
      if (faceNormal) {
        avgNormal.addInPlace(faceNormal);
        count++;
      }
    }
  });
  
  return count > 0 ? avgNormal.scale(1 / count).normalize() : Vector3.Up();
}

/**
 * Create side faces connecting original and extruded boundary vertices
 */
function createSideFaces(
  indices: number[],
  boundaryVertices: number[],
  vertexMap: Map<number, number>
): void {
  // For now, this is a placeholder for the complex boundary face creation
  // A full implementation would require:
  // 1. Proper boundary edge ordering
  // 2. Quad generation between original and extruded edges
  // 3. Watertight topology preservation
  
  console.log(`Creating side faces for ${boundaryVertices.length} boundary vertices`);
  console.log(`Vertex mapping available for ${vertexMap.size} vertices`);
  console.log(`Working with ${indices.length / 3} total faces`);
}

/**
 * Legacy function for backward compatibility
 */
export async function extrudeElements(
  mesh: Mesh,
  selectedElements: number[],
  distance: number,
  mode: 'face' | 'edge'
): Promise<boolean> {
  if (mode === 'face') {
    return extrudeFaces(mesh, selectedElements, distance);
  } else {
    console.warn('Edge extrusion not yet implemented');
    return false;
  }
}

/**
 * Inset selected faces of a mesh (shrink faces inward)
 * 
 * @param mesh - Target mesh to inset
 * @param selectedFaces - Array of selected face indices
 * @param amount - Inset amount (0-1, where 0.5 shrinks to half size)
 * @returns Promise resolving to whether inset was successful
 */
export async function insetFaces(
  mesh: Mesh,
  selectedFaces: number[],
  amount: number
): Promise<boolean> {
  if (!mesh || selectedFaces.length === 0 || amount <= 0 || amount >= 1) {
    return false;
  }
  
  console.log(`Insetting ${selectedFaces.length} faces by amount ${amount}`);
  
  try {
    // Get current mesh data
    const positions = mesh.getVerticesData(VertexBuffer.PositionKind);
    const indices = mesh.getIndices();
    
    if (!positions || !indices) {
      console.error('Missing vertex data for inset');
      return false;
    }
    
    const newPositions = [...positions];
    const newIndices = [...indices];
    let nextVertexIndex = positions.length / 3;
    
    // Process each selected face
    selectedFaces.forEach(faceIndex => {
      const startIdx = faceIndex * 3;
      const v1Index = indices[startIdx];
      const v2Index = indices[startIdx + 1];
      const v3Index = indices[startIdx + 2];
      
      // Get face vertices
      const v1 = new Vector3(
        positions[v1Index * 3],
        positions[v1Index * 3 + 1],
        positions[v1Index * 3 + 2]
      );
      const v2 = new Vector3(
        positions[v2Index * 3],
        positions[v2Index * 3 + 1],
        positions[v2Index * 3 + 2]
      );
      const v3 = new Vector3(
        positions[v3Index * 3],
        positions[v3Index * 3 + 1],
        positions[v3Index * 3 + 2]
      );
      
      // Calculate face center
      const center = v1.add(v2).add(v3).scale(1/3);
      
      // Create inset vertices
      const insetV1 = Vector3.Lerp(center, v1, 1 - amount);
      const insetV2 = Vector3.Lerp(center, v2, 1 - amount);
      const insetV3 = Vector3.Lerp(center, v3, 1 - amount);
      
      // Add new vertices
      const newV1Index = nextVertexIndex++;
      const newV2Index = nextVertexIndex++;
      const newV3Index = nextVertexIndex++;
      
      newPositions.push(insetV1.x, insetV1.y, insetV1.z);
      newPositions.push(insetV2.x, insetV2.y, insetV2.z);
      newPositions.push(insetV3.x, insetV3.y, insetV3.z);
      
      // Update face to use new vertices
      newIndices[startIdx] = newV1Index;
      newIndices[startIdx + 1] = newV2Index;
      newIndices[startIdx + 2] = newV3Index;
      
      // Create connecting faces between original and inset vertices
      // Triangle 1: v1 -> v2 -> newV1
      newIndices.push(v1Index, v2Index, newV1Index);
      // Triangle 2: v2 -> newV2 -> newV1
      newIndices.push(v2Index, newV2Index, newV1Index);
      
      // Triangle 3: v2 -> v3 -> newV2
      newIndices.push(v2Index, v3Index, newV2Index);
      // Triangle 4: v3 -> newV3 -> newV2
      newIndices.push(v3Index, newV3Index, newV2Index);
      
      // Triangle 5: v3 -> v1 -> newV3
      newIndices.push(v3Index, v1Index, newV3Index);
      // Triangle 6: v1 -> newV1 -> newV3
      newIndices.push(v1Index, newV1Index, newV3Index);
    });
    
    // Update mesh
    mesh.updateVerticesData(VertexBuffer.PositionKind, newPositions);
    mesh.setIndices(newIndices);
    
    // Recalculate normals
    const normals: number[] = [];
    VertexData.ComputeNormals(newPositions, newIndices, normals);
    mesh.updateVerticesData(VertexBuffer.NormalKind, normals);
    
    console.log(`Successfully inset faces. New vertex count: ${newPositions.length / 3}`);
    return true;
    
  } catch (error) {
    console.error('Face inset failed:', error);
    return false;
  }
}

/**
 * Utility function to ensure mesh is updatable
 * Clones mesh if it's not updatable (e.g., imported meshes)
 */
export function ensureUpdatableMesh(mesh: Mesh): Mesh {
  if (!mesh.isVerticesDataPresent(VertexBuffer.PositionKind) || mesh.areNormalsFrozen) {
    console.log(`Cloning non-updatable mesh: ${mesh.name}`);
    const cloned = mesh.clone(`${mesh.name}_editable`);
    cloned.makeGeometryUnique();
    return cloned;
  }
  return mesh;
}

/**
 * Bevel selected edges of a mesh (single segment MVP)
 * Creates a chamfer along selected edges by splitting the edge and creating new faces
 * 
 * @param mesh - Target mesh to bevel
 * @param selectedEdges - Array of selected edge indices (pairs of vertex indices)
 * @param amount - Bevel amount (distance from original edge)
 * @returns Promise resolving to whether bevel was successful
 */
export async function bevelEdges(
  mesh: Mesh,
  selectedEdges: number[][],
  amount: number
): Promise<boolean> {
  if (!mesh || selectedEdges.length === 0 || amount <= 0) {
    return false;
  }
  
  console.log(`Beveling ${selectedEdges.length} edges with amount ${amount}`);
  
  try {
    // Get current mesh data
    const positions = mesh.getVerticesData(VertexBuffer.PositionKind);
    const indices = mesh.getIndices();
    const normals = mesh.getVerticesData(VertexBuffer.NormalKind);
    
    if (!positions || !indices || !normals) {
      console.error('Missing vertex data for edge bevel');
      return false;
    }
    
    const newPositions = [...positions];
    const newNormals = [...normals];
    const newIndices = [...indices];
    let nextVertexIndex = positions.length / 3;
    
    // Store mapping of original vertices to new bevel vertices
    const bevelVertexMap = new Map<number, number[]>();
    
    // Process each selected edge
    for (const edge of selectedEdges) {
      if (edge.length !== 2) continue;
      
      const [v1Index, v2Index] = edge;
      
      // Get edge vertices
      const v1 = new Vector3(
        positions[v1Index * 3],
        positions[v1Index * 3 + 1],
        positions[v1Index * 3 + 2]
      );
      const v2 = new Vector3(
        positions[v2Index * 3],
        positions[v2Index * 3 + 1],
        positions[v2Index * 3 + 2]
      );
      
      // Calculate edge direction and length
      const edgeDir = v2.subtract(v1).normalize();
      const edgeLength = Vector3.Distance(v1, v2);
      
      // Calculate bevel positions along the edge
      const bevelAmount = Math.min(amount, edgeLength * 0.4); // Limit to 40% of edge length
      const bevelV1 = v1.add(edgeDir.scale(bevelAmount));
      const bevelV2 = v2.subtract(edgeDir.scale(bevelAmount));
      
      // Find faces that share this edge to calculate perpendicular directions
      const adjacentFaces = findFacesContainingEdge(indices, v1Index, v2Index);
      
      if (adjacentFaces.length === 0) continue;
      
      // Calculate average normal direction for bevel offset
      let avgNormal = Vector3.Zero();
      adjacentFaces.forEach(faceIndex => {
        const faceNormal = calculateFaceNormal(positions, indices, faceIndex);
        avgNormal.addInPlace(faceNormal);
      });
      
      if (adjacentFaces.length > 0) {
        avgNormal = avgNormal.scale(1 / adjacentFaces.length).normalize();
      }
      
      // Create bevel vertices offset from the edge
      const perpDir = Vector3.Cross(edgeDir, avgNormal).normalize();
      const bevelOffset = bevelAmount * 0.5;
      
      // Create 4 new vertices for the bevel quad
      const bevelV1_pos = bevelV1.add(perpDir.scale(bevelOffset));
      const bevelV1_neg = bevelV1.subtract(perpDir.scale(bevelOffset));
      const bevelV2_pos = bevelV2.add(perpDir.scale(bevelOffset));
      const bevelV2_neg = bevelV2.subtract(perpDir.scale(bevelOffset));
      
      // Add new vertices
      const bevelV1PosIndex = nextVertexIndex++;
      const bevelV1NegIndex = nextVertexIndex++;
      const bevelV2PosIndex = nextVertexIndex++;
      const bevelV2NegIndex = nextVertexIndex++;
      
      newPositions.push(bevelV1_pos.x, bevelV1_pos.y, bevelV1_pos.z);
      newPositions.push(bevelV1_neg.x, bevelV1_neg.y, bevelV1_neg.z);
      newPositions.push(bevelV2_pos.x, bevelV2_pos.y, bevelV2_pos.z);
      newPositions.push(bevelV2_neg.x, bevelV2_neg.y, bevelV2_neg.z);
      
      // Add normals (use average face normal)
      for (let i = 0; i < 4; i++) {
        newNormals.push(avgNormal.x, avgNormal.y, avgNormal.z);
      }
      
      // Create bevel faces (quads as two triangles)
      // Quad 1: bevelV1_pos -> bevelV2_pos -> bevelV2_neg -> bevelV1_neg
      newIndices.push(bevelV1PosIndex, bevelV2PosIndex, bevelV1NegIndex);
      newIndices.push(bevelV2PosIndex, bevelV2NegIndex, bevelV1NegIndex);
      
      // Store bevel vertex mapping for potential face updates
      if (!bevelVertexMap.has(v1Index)) {
        bevelVertexMap.set(v1Index, []);
      }
      if (!bevelVertexMap.has(v2Index)) {
        bevelVertexMap.set(v2Index, []);
      }
      
      bevelVertexMap.get(v1Index)!.push(bevelV1PosIndex, bevelV1NegIndex);
      bevelVertexMap.get(v2Index)!.push(bevelV2PosIndex, bevelV2NegIndex);
    }
    
    // Update mesh with new geometry
    mesh.updateVerticesData(VertexBuffer.PositionKind, newPositions);
    mesh.updateVerticesData(VertexBuffer.NormalKind, newNormals);
    mesh.setIndices(newIndices);
    
    // Recalculate normals for proper lighting
    const computedNormals: number[] = [];
    VertexData.ComputeNormals(newPositions, newIndices, computedNormals);
    mesh.updateVerticesData(VertexBuffer.NormalKind, computedNormals);
    
    console.log(`Successfully beveled ${selectedEdges.length} edges. New vertex count: ${newPositions.length / 3}`);
    return true;
    
  } catch (error) {
    console.error('Edge bevel failed:', error);
    return false;
  }
}

/**
 * Find faces that contain a specific edge (defined by two vertex indices)
 */
function findFacesContainingEdge(indices: ArrayLike<number>, v1Index: number, v2Index: number): number[] {
  const faces: number[] = [];
  const numFaces = indices.length / 3;
  
  for (let faceIndex = 0; faceIndex < numFaces; faceIndex++) {
    const startIdx = faceIndex * 3;
    const faceVertices = [
      indices[startIdx],
      indices[startIdx + 1],
      indices[startIdx + 2]
    ];
    
    // Check if this face contains both vertices of the edge
    if (faceVertices.includes(v1Index) && faceVertices.includes(v2Index)) {
      faces.push(faceIndex);
    }
  }
  
  return faces;
}

/**
 * Calculate normal for a single face
 */
function calculateFaceNormal(positions: ArrayLike<number>, indices: ArrayLike<number>, faceIndex: number): Vector3 {
  const startIdx = faceIndex * 3;
  const v1Index = indices[startIdx];
  const v2Index = indices[startIdx + 1];
  const v3Index = indices[startIdx + 2];
  
  const v1 = new Vector3(
    positions[v1Index * 3],
    positions[v1Index * 3 + 1],
    positions[v1Index * 3 + 2]
  );
  const v2 = new Vector3(
    positions[v2Index * 3],
    positions[v2Index * 3 + 1],
    positions[v2Index * 3 + 2]
  );
  const v3 = new Vector3(
    positions[v3Index * 3],
    positions[v3Index * 3 + 1],
    positions[v3Index * 3 + 2]
  );
  
  // Calculate normal using cross product
  const edge1 = v2.subtract(v1);
  const edge2 = v3.subtract(v1);
  return Vector3.Cross(edge1, edge2).normalize();
}

/**
 * Bevel selected elements of a mesh
 * 
 * @param mesh - Target mesh to bevel
 * @param selectedElements - Array of selected element indices
 * @param amount - Bevel amount
 * @param mode - 'face' or 'edge' mode
 * @returns Promise resolving to whether bevel was successful
 */
export async function bevelElements(
  mesh: Mesh,
  selectedElements: number[],
  amount: number,
  mode: 'face' | 'edge' = 'face'
): Promise<boolean> {
  if (!mesh || selectedElements.length === 0) {
    return false;
  }
  
  console.log(`Beveling ${mode} elements:`, selectedElements, `amount: ${amount}`);
  
  if (mode === 'face') {
    // Face bevel is essentially inset + extrude
    const insetSuccess = await insetFaces(mesh, selectedElements, amount * 0.5);
    if (insetSuccess) {
      // Note: After inset, face indices change, so this is simplified
      return await extrudeFaces(mesh, selectedElements, amount);
    }
    return false;
  } else if (mode === 'edge') {
    // Convert edge indices to edge pairs (this is a simplified approach)
    // In a real implementation, selectedElements would contain edge information
    console.warn('Direct edge bevel from element indices needs edge detection');
    return false;
  } else {
    console.warn(`Unknown bevel mode: ${mode}`);
    return false;
  }
}
