/**
 * Modification Executor
 * Executes AI-generated modification code on existing shapes
 */

import { Shape, BoxShape, SphereShape, CylinderShape, ParametricShape, CustomShape } from '../store/store';
import { createOccWrapper } from '@/utils/occ-wrapper';

export interface ModificationResult {
  success: boolean;
  modifiedShape?: Shape;
  error?: string;
  executionTime?: number;
}

export interface TransformUpdate {
  position?: { x?: number; y?: number; z?: number };
  rotation?: { x?: number; y?: number; z?: number };
  scaling?: { x?: number; y?: number; z?: number };
  relative?: boolean; // If true, add to existing values
}

/**
 * Execute modification code on an existing shape
 */
export async function executeModification(
  code: string,
  targetShapeId: string,
  shapes: Shape[],
  ocInstance: any
): Promise<ModificationResult> {
  const startTime = performance.now();
  
  try {
    // Find target shape
    const targetShape = shapes.find(s => s.id === targetShapeId);
    if (!targetShape) {
      return {
        success: false,
        error: `Shape with ID "${targetShapeId}" not found`
      };
    }
    
    console.log('[MOD-EXEC] Executing modification on shape:', targetShape.id);
    
    // Get or recreate OCC shape
    const occShape = await getOCCShape(targetShape, ocInstance);
    if (!occShape) {
      return {
        success: false,
        error: 'Failed to get OpenCascade shape for modification'
      };
    }
    
    // Create wrapper
    const occ = createOccWrapper(ocInstance);
    
    // Execute modification function
    console.log('[MOD-EXEC] Executing code:', code.substring(0, 100) + '...');
    
    // Clean code: Remove markdown code blocks and extra whitespace
    let cleanedCode = code.trim();
    
    // Remove markdown code blocks (```javascript ... ```)
    cleanedCode = cleanedCode.replace(/^```(?:javascript|js)?\s*/i, '').replace(/```\s*$/, '');
    
    // Remove any remaining backticks
    cleanedCode = cleanedCode.replace(/^`+|`+$/g, '');
    
    console.log('[MOD-EXEC] Cleaned code:', cleanedCode.substring(0, 100) + '...');
    
    // Wrap code in function context
    const wrappedCode = `
      ${cleanedCode}
      return modifyShape(existingShape);
    `;
    
    const modifyFunction = new Function('occ', 'existingShape', wrappedCode);
    let modifiedOccShape = modifyFunction(occ, occShape);
    
    if (!modifiedOccShape || typeof modifiedOccShape.ShapeType !== 'function') {
      return {
        success: false,
        error: 'Modification function did not return a valid OpenCascade shape'
      };
    }
    
    // Log shape type for debugging
    const shapeType = modifiedOccShape.ShapeType();
    console.log('[MOD-EXEC] Modified shape type:', shapeType);
    
    // FIX: If result is a COMPOUND, extract the first solid
    // Boolean operations often return compounds that need to be unwrapped
    // Note: Use TopAbs_ShapeEnum path as that's what OCCT.js uses
    if (shapeType === ocInstance.TopAbs_ShapeEnum.TopAbs_COMPOUND) {
      console.log('[MOD-EXEC] Result is COMPOUND, extracting solid...');
      try {
        const solidExtractor = new ocInstance.TopExp_Explorer_2(
          modifiedOccShape,
          ocInstance.TopAbs_ShapeEnum.TopAbs_SOLID,
          ocInstance.TopAbs_ShapeEnum.TopAbs_SHAPE
        );
        
        if (solidExtractor.More()) {
          const extractedSolid = ocInstance.TopoDS.Solid_1(solidExtractor.Current());
          console.log('[MOD-EXEC] Extracted solid from compound');
          modifiedOccShape = extractedSolid;
          console.log('[MOD-EXEC] Final shape type after extraction:', modifiedOccShape.ShapeType());
        } else {
          // Compound has no solid - try to get first shape of any type
          console.warn('[MOD-EXEC] Compound contains no solids, trying to extract any shape...');
          
          const anyShapeExplorer = new ocInstance.TopExp_Explorer_2(
            modifiedOccShape,
            ocInstance.TopAbs_ShapeEnum.TopAbs_SHAPE,
            ocInstance.TopAbs_ShapeEnum.TopAbs_SHAPE
          );
          
          if (anyShapeExplorer.More()) {
            modifiedOccShape = anyShapeExplorer.Current();
            console.log('[MOD-EXEC] Extracted first shape from compound, type:', modifiedOccShape.ShapeType());
          } else {
            console.error('[MOD-EXEC] Compound is empty! Boolean operation may have failed.');
            return {
              success: false,
              error: 'Boolean operation produced empty compound - shapes may not overlap correctly'
            };
          }
        }
      } catch (error) {
        console.error('[MOD-EXEC] Failed to extract from compound:', error);
        return {
          success: false,
          error: `Compound extraction failed: ${error}`
        };
      }
    }
    
    console.log('[MOD-EXEC] Shape modified successfully, tessellating...');
    
    // Tessellate the modified shape
    const meshData = tessellateShape(modifiedOccShape, ocInstance);
    
    if (!meshData || !meshData.positions || !meshData.indices) {
      return {
        success: false,
        error: 'Failed to tessellate modified shape'
      };
    }
    
    // Create updated shape preserving original properties
    const modifiedShape: CustomShape = {
      id: targetShape.id,
      type: 'custom',
      position: targetShape.position,
      rotation: targetShape.rotation,
      scaling: targetShape.scaling,
      color: targetShape.color,
      material: targetShape.material,
      name: `${targetShape.name || targetShape.id}-modified`,
      meshData: {
        positions: meshData.positions,
        indices: meshData.indices
      },
      // CRITICAL: Store OCC shape for subsequent modifications
      babylonMesh: modifiedOccShape // Reuse babylonMesh field to store OCC shape (runtime only)
    };
    
    const executionTime = performance.now() - startTime;
    console.log(`[MOD-EXEC] Modification completed in ${executionTime.toFixed(0)}ms`);
    
    return {
      success: true,
      modifiedShape,
      executionTime
    };
    
  } catch (error: any) {
    console.error('[MOD-EXEC] Modification failed:', error);
    return {
      success: false,
      error: error.message || 'Unknown modification error'
    };
  }
}

/**
 * Get OCC shape from store shape (recreate if necessary)
 */
async function getOCCShape(shape: Shape, ocInstance: any): Promise<any> {
  // If parametric shape with stored OCC shape, use it
  if (shape.type === 'parametric') {
    const paramShape = shape as ParametricShape;
    if (paramShape.occShape) {
      console.log('[MOD-EXEC] Using stored OCC shape from parametric');
      return paramShape.occShape;
    }
  }
  
  // Otherwise, recreate from primitive definition
  return recreateOCCShape(shape, ocInstance);
}

/**
 * Recreate OpenCascade shape from primitive definition
 */
function recreateOCCShape(shape: Shape, ocInstance: any): any {
  const occ = createOccWrapper(ocInstance);
  
  console.log('[MOD-EXEC] Recreating OCC shape from', shape.type);
  
  try {
    switch (shape.type) {
      case 'box': {
        const box = shape as BoxShape;
        return occ.createBox(
          box.dimensions.width,
          box.dimensions.height,
          box.dimensions.depth
        );
      }
      
      case 'sphere': {
        const sphere = shape as SphereShape;
        return occ.createSphere(sphere.radius);
      }
      
      case 'cylinder': {
        const cylinder = shape as CylinderShape;
        return occ.createCylinder(
          cylinder.diameter / 2,
          cylinder.height
        );
      }
      
      case 'parametric': {
        const param = shape as ParametricShape;
        if (param.constructionCode) {
          // Try to regenerate from construction code
          try {
            console.log('[MOD-EXEC] Regenerating from constructionCode:', param.constructionCode.substring(0, 100) + '...');
            const codeFunc = new Function('occ', param.constructionCode);
            const regeneratedShape = codeFunc(occ);
            
            if (regeneratedShape && typeof regeneratedShape.ShapeType === 'function') {
              console.log('[MOD-EXEC] Successfully regenerated shape from constructionCode');
              return regeneratedShape;
            } else {
              console.warn('[MOD-EXEC] constructionCode did not return valid shape');
            }
          } catch (error) {
            console.error('[MOD-EXEC] Failed to execute constructionCode:', error);
          }
        }
        
        // If shape has meshData, we can't recreate the OCC shape but can use fallback
        if (param.meshData) {
          console.warn('[MOD-EXEC] Parametric shape has meshData but no valid constructionCode, using fallback box');
        }
        
        // Fallback to simple shape
        console.warn('[MOD-EXEC] Using fallback box for parametric shape');
        return occ.createBox(10, 10, 10); // Use same size as typical generated cube
      }
      
      case 'custom': {
        // CRITICAL FIX: Try to use stored OCC shape from previous modifications
        const customShape = shape as any;
        if (customShape.babylonMesh && typeof customShape.babylonMesh.ShapeType === 'function') {
          console.log('[MOD-EXEC] Using stored OCC shape from previous modification');
          return customShape.babylonMesh; // This is actually the OCC shape, not Babylon mesh
        }
        
        // If no stored OCC shape, can't modify further
        console.error('[MOD-EXEC] Custom shape has no stored OCC shape - cannot modify further');
        console.error('[MOD-EXEC] Shape can only be modified once after creation. To modify again, start from original.');
        throw new Error('Cannot modify custom shape without stored OCC geometry. Please start from the original parametric shape.');
      }
      
      case 'model':
        // Can't recreate model shapes
        console.warn('[MOD-EXEC] Cannot recreate model shapes');
        throw new Error('Cannot modify imported models');
      
      default:
        console.warn('[MOD-EXEC] Unknown shape type, using unit box');
        return occ.createBox(1, 1, 1);
    }
  } catch (error) {
    console.error('[MOD-EXEC] Failed to recreate shape:', error);
    return occ.createBox(1, 1, 1); // Ultimate fallback
  }
}

/**
 * Tessellate OpenCascade shape to mesh
 */
function tessellateShape(occShape: any, ocInstance: any): {
  positions: Float32Array;
  indices: Uint32Array;
} | null {
  try {
    const linearDeflection = 0.1;
    const angularDeflection = 0.5;
    
    // Validate shape before tessellation
    if (!occShape || typeof occShape.ShapeType !== 'function') {
      console.error('[MOD-EXEC] Invalid shape provided for tessellation');
      return null;
    }
    
    console.log('[MOD-EXEC] Shape type:', occShape.ShapeType());
    
    // Tessellate the shape (meshing happens as side effect)
    try {
      new ocInstance.BRepMesh_IncrementalMesh_2(
        occShape,
        linearDeflection,
        false,
        angularDeflection,
        true
      );
    } catch (meshError) {
      console.error('[MOD-EXEC] Mesh generation failed:', meshError);
      return null;
    }
    
    // Extract mesh data
    const positions: number[] = [];
    const indices: number[] = [];
    
    let explorer;
    try {
      explorer = new ocInstance.TopExp_Explorer_2(
        occShape,
        ocInstance.TopAbs_ShapeEnum.TopAbs_FACE,
        ocInstance.TopAbs_ShapeEnum.TopAbs_SHAPE
      );
    } catch (explorerError) {
      console.error('[MOD-EXEC] Failed to create shape explorer:', explorerError);
      return null;
    }
    
    let faceIndex = 0;
    while (explorer.More()) {
      const face = ocInstance.TopoDS.Face_1(explorer.Current());
      const location = new ocInstance.TopLoc_Location_1();
      
      const triangulation = ocInstance.BRep_Tool.Triangulation(face, location, 0);
      
      if (triangulation.IsNull()) {
        explorer.Next();
        continue;
      }
      
      // FIX: Properly validate triangulation before calling .get()
      let tri;
      try {
        tri = triangulation.get();
      } catch (error) {
        console.warn('[MOD-EXEC] Failed to get triangulation data:', error);
        explorer.Next();
        continue;
      }
      
      // Validate that triangulation data has required methods
      if (!tri || typeof tri.NbNodes !== 'function' || typeof tri.NbTriangles !== 'function') {
        console.warn('[MOD-EXEC] Invalid triangulation data for face, skipping');
        explorer.Next();
        continue;
      }
      
      const nodeCount = tri.NbNodes();
      const triangleCount = tri.NbTriangles();
      
      if (nodeCount === 0 || triangleCount === 0) {
        console.warn('[MOD-EXEC] Empty triangulation data, skipping');
        explorer.Next();
        continue;
      }
      
      const baseIndex = positions.length / 3;
      
      // Extract vertices
      for (let i = 1; i <= nodeCount; i++) {
        const node = tri.Node(i);
        positions.push(node.X(), node.Y(), node.Z());
      }
      
      // Extract indices
      const orientation = face.Orientation_1();
      const reversed = orientation === ocInstance.TopAbs_Orientation.TopAbs_REVERSED;
      
      for (let i = 1; i <= triangleCount; i++) {
        const triangle = tri.Triangle(i);
        let n1 = triangle.Value(1);
        let n2 = triangle.Value(2);
        let n3 = triangle.Value(3);
        
        if (reversed) {
          [n2, n3] = [n3, n2];
        }
        
        indices.push(
          baseIndex + n1 - 1,
          baseIndex + n2 - 1,
          baseIndex + n3 - 1
        );
      }
      
      faceIndex++;
      explorer.Next();
    }
    
    if (positions.length === 0 || indices.length === 0) {
      console.warn('[MOD-EXEC] Tessellation produced no geometry');
      return null;
    }
    
    console.log(`[MOD-EXEC] Tessellated: ${positions.length / 3} vertices, ${indices.length / 3} triangles`);
    
    return {
      positions: new Float32Array(positions),
      indices: new Uint32Array(indices)
    };
    
  } catch (error) {
    console.error('[MOD-EXEC] Tessellation failed:', error);
    return null;
  }
}

/**
 * Apply transform update to shape
 */
export function applyTransform(
  shape: Shape,
  transform: TransformUpdate
): Shape {
  const updated = { ...shape };
  
  if (transform.position) {
    if (transform.relative) {
      updated.position = {
        x: shape.position.x + (transform.position.x || 0),
        y: shape.position.y + (transform.position.y || 0),
        z: shape.position.z + (transform.position.z || 0)
      };
    } else {
      updated.position = {
        x: transform.position.x !== undefined ? transform.position.x : shape.position.x,
        y: transform.position.y !== undefined ? transform.position.y : shape.position.y,
        z: transform.position.z !== undefined ? transform.position.z : shape.position.z
      };
    }
  }
  
  if (transform.rotation) {
    if (transform.relative) {
      updated.rotation = {
        x: shape.rotation.x + (transform.rotation.x || 0),
        y: shape.rotation.y + (transform.rotation.y || 0),
        z: shape.rotation.z + (transform.rotation.z || 0)
      };
      console.log('[MOD-EXEC] Applied relative rotation:', {
        original: shape.rotation,
        delta: transform.rotation,
        result: updated.rotation
      });
    } else {
      updated.rotation = {
        x: transform.rotation.x !== undefined ? transform.rotation.x : shape.rotation.x,
        y: transform.rotation.y !== undefined ? transform.rotation.y : shape.rotation.y,
        z: transform.rotation.z !== undefined ? transform.rotation.z : shape.rotation.z
      };
      console.log('[MOD-EXEC] Applied absolute rotation:', {
        original: shape.rotation,
        result: updated.rotation
      });
    }
  }
  
  if (transform.scaling) {
    if (transform.relative) {
      updated.scaling = {
        x: shape.scaling.x * (transform.scaling.x || 1),
        y: shape.scaling.y * (transform.scaling.y || 1),
        z: shape.scaling.z * (transform.scaling.z || 1)
      };
    } else {
      updated.scaling = {
        x: transform.scaling.x !== undefined ? transform.scaling.x : shape.scaling.x,
        y: transform.scaling.y !== undefined ? transform.scaling.y : shape.scaling.y,
        z: transform.scaling.z !== undefined ? transform.scaling.z : shape.scaling.z
      };
    }
  }
  
  return updated;
}

/**
 * Update parametric shape parameters
 */
export function updateParametricParameters(
  shape: ParametricShape,
  newParameters: Record<string, number>
): Record<string, number> {
  return {
    ...shape.parameters,
    ...newParameters
  };
}

/**
 * Parse JSON transform from AI response
 * Handles both pure JSON and JavaScript code that returns JSON
 */
export function parseTransformJSON(codeOrJson: string): TransformUpdate | null {
  try {
    console.log('[MOD-EXEC] Parsing transform JSON from:', codeOrJson.substring(0, 100) + '...');
    
    // First, try parsing as pure JSON
    try {
      const parsed = JSON.parse(codeOrJson);
      console.log('[MOD-EXEC] Parsed as pure JSON:', parsed);
      return parsed as TransformUpdate;
    } catch (jsonError) {
      // Not pure JSON, continue to code extraction
    }
    
    console.log('[MOD-EXEC] Not pure JSON, attempting to extract from code...');
    
    // Clean code: remove markdown blocks
    let cleanedCode = codeOrJson.trim();
    cleanedCode = cleanedCode.replace(/^```(?:javascript|js|json)?\s*/i, '').replace(/```\s*$/, '');
    cleanedCode = cleanedCode.replace(/^`+|`+$/g, '');
    
    // Try to extract just the JSON object from a return statement
    const returnMatch = cleanedCode.match(/return\s+(\{[\s\S]*?\});?\s*$/m);
    if (returnMatch) {
      const jsonStr = returnMatch[1];
      console.log('[MOD-EXEC] Extracted JSON from return statement:', jsonStr);
      try {
        const parsed = JSON.parse(jsonStr);
        console.log('[MOD-EXEC] Parsed extracted JSON:', parsed);
        return parsed as TransformUpdate;
      } catch (e) {
        console.warn('[MOD-EXEC] Failed to parse extracted JSON:', e);
      }
    }
    
    // Try executing the code to get the result
    console.log('[MOD-EXEC] Attempting to execute code to get JSON...');
    try {
      // Create a safe execution environment
      const func = new Function(`
        'use strict';
        ${cleanedCode}
      `);
      const result = func();
      
      if (result && typeof result === 'object') {
        console.log('[MOD-EXEC] Successfully executed code, got result:', result);
        return result as TransformUpdate;
      }
      
      console.error('[MOD-EXEC] Code execution did not return an object, got:', typeof result);
      return null;
    } catch (execError: any) {
      console.error('[MOD-EXEC] Code execution failed:', execError.message);
      return null;
    }
    
  } catch (error: any) {
    console.error('[MOD-EXEC] Failed to parse transform JSON:', error);
    return null;
  }
}
