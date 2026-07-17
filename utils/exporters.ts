/**
 * exporters.ts
 * 
 * Utility functions for exporting 3D models in various formats:
 * - STL: Standard Tessellation Language for 3D printing
 * - OBJ: Wavefront OBJ format for 3D models
 * - GLTF: GL Transmission Format for 3D scenes and models
 * - STEP: ISO 10303 STEP format for CAD models
 */

import { Scene } from '@babylonjs/core/scene';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { STLExport } from '@babylonjs/serializers';
import { OBJExport } from '@babylonjs/serializers';
import { GLTF2Export } from '@babylonjs/serializers';
import { OCCShape } from '../hooks/useOCC';

/**
 * Export a mesh as an STL file
 * @param mesh The Babylon.js mesh to export
 * @returns A Blob containing the STL data
 */
export const exportSTL = (mesh: Mesh | Mesh[]): Blob => {
  const meshes = Array.isArray(mesh) ? mesh : [mesh];
  // Generate the STL string content
  const stlContent = STLExport.CreateSTL(meshes, false);
  
  // Create a blob with the STL content
  return new Blob([stlContent], { type: 'application/octet-stream' });
};

/**
 * Export a mesh as an OBJ file
 * @param mesh The Babylon.js mesh to export
 * @returns A Blob containing the OBJ data
 */
export const exportOBJ = (mesh: Mesh | Mesh[]): Blob => {
  const meshes = Array.isArray(mesh) ? mesh : [mesh];
  // Generate the OBJ content
  const objContent = OBJExport.OBJ(meshes, true);
  
  // Create a blob with the OBJ content
  return new Blob([objContent], { type: 'application/octet-stream' });
};

/**
 * Export a scene as a GLTF file
 * @param scene The Babylon.js scene to export
 * @returns A Promise resolving to a Blob containing the GLTF data
 */
export const exportGLTF = async (
  scene: Scene,
  shouldExportNode?: (node: import('@babylonjs/core/node').Node) => boolean
): Promise<Blob> => {
  // Create a GLTF with the scene data
  const gltfData = await GLTF2Export.GLBAsync(
    scene,
    'model',
    shouldExportNode ? { shouldExportNode } : undefined
  );
  
  // Return the blob from the GLTF data
  return gltfData.glTFFiles['model.glb'] as Blob;
};

/**
 * Export an OpenCascade shape as a STEP file
 * @param shape The OpenCascade shape to export
 * @returns A Promise resolving to a Blob containing the STEP data
 */
export const exportSTEP = async (shape: OCCShape): Promise<Blob> => {
  try {
    // Dynamically import OpenCascade.js
    const initOCC = (await import('opencascade.js')).default;
    const openCascade = await initOCC();
    await openCascade.initialize();
    
    // Create a STEP exporter
    const stepExporter = new (openCascade as any).STEPControl_Writer();
    
    // Set the assembly mode to ON (1)
    stepExporter.SetAssemblyMode(1);
    
    // Transfer the shape with a specific mode
    // Mode values:
    // - 0: Undefined
    // - 1: ManifoldSolid
    // - 2: ShellBasedSurfaceModel
    // - 3: GeometricCurveSet
    // - 4: FacetedBrep
    const transferResult = stepExporter.Transfer(shape, 1);
    
    if (transferResult <= 0) {
      throw new Error('Failed to transfer shape to STEP format');
    }
    
    // Write the STEP file to a string
    const writeResult = stepExporter.Write('');
    
    if (writeResult <= 0) {
      throw new Error('Failed to write STEP data');
    }
    
    // Get the STEP file content
    const stepContent = stepExporter.GetStepFileAsString();
    
    // Create a blob with the STEP content
    return new Blob([stepContent], { type: 'application/octet-stream' });
  } catch (error) {
    console.error('Error exporting STEP file:', error);
    throw error;
  }
};

/**
 * Helper function to trigger file download
 * @param blob The Blob to download
 * @param filename The filename to use for the download
 */
export const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 100);
};
