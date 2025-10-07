/**
 * Parametric Regenerator
 * Regenerates OpenCascade shapes with new parameter values in real-time
 */

import { regenerateCodeWithParameters } from '../utils/parameterExtractor';

export interface RegenerationResult {
  success: boolean;
  meshData?: {
    positions: Float32Array;
    indices: Uint32Array;
  };
  error?: string;
}

/**
 * Regenerate a parametric shape with new parameters
 */
export async function regenerateParametricShape(
  constructionCode: string,
  newParameters: Record<string, number>
): Promise<RegenerationResult> {
  try {
    console.log('[REGEN] Regenerating shape with new parameters:', newParameters);
    
    // Step 1: Update the code with new parameter values
    const updatedCode = regenerateCodeWithParameters(constructionCode, newParameters);
    
    console.log('[REGEN] Updated code generated');
    
    // Step 2: Execute the updated code
    const { occMainThreadExecutor } = await import('./occMainThreadExecutor');
    const result = await occMainThreadExecutor.executeCode(updatedCode);
    
    if (!result) {
      throw new Error('Execution returned no result');
    }
    
    // Handle array or single result
    const meshData = Array.isArray(result) ? result[0] : result;
    
    if (!meshData.positions || !meshData.indices) {
      throw new Error('No mesh data generated');
    }
    
    console.log('[REGEN] Shape regenerated successfully:', {
      vertices: meshData.positions.length / 3,
      triangles: meshData.indices.length / 3
    });
    
    return {
      success: true,
      meshData: {
        positions: new Float32Array(meshData.positions),
        indices: new Uint32Array(meshData.indices)
      }
    };
    
  } catch (error) {
    console.error('[REGEN] Regeneration failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
