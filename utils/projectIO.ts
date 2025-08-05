/**
 * projectIO.ts
 * 
 * Utility for saving and loading Babylon.js scenes as Sphaire projects
 * Handles serialization of 3D scene data, including meshes and cursor position
 */

import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';

/**
 * Interface for serialized mesh data
 */
interface SerializedMesh {
  id: string;
  name: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scaling: { x: number; y: number; z: number };
  isVisible: boolean;
  geometryData: {
    positions: number[];
    indices: number[];
    normals: number[];
    uvs?: number[];
  };
  materialData?: {
    diffuseColor?: { r: number; g: number; b: number };
    emissiveColor?: { r: number; g: number; b: number };
    specularColor?: { r: number; g: number; b: number };
    ambientColor?: { r: number; g: number; b: number };
    alpha?: number;
  };
}

/**
 * Interface for serialized scene data
 */
interface SerializedScene {
  meshes: SerializedMesh[];
  cursorPosition: { x: number; y: number; z: number };
  metadata: {
    version: string;
    savedAt: string;
    name: string;
  };
}

/**
 * Serializes a Babylon.js scene and cursor position into a JSON format and triggers a download
 * 
 * @param scene - The Babylon.js scene to serialize
 * @param cursorPos - The current cursor position in 3D space
 */
export const saveProject = (scene: Scene, cursorPos: Vector3): void => {
  // Initialize serialized scene data
  const sceneData: SerializedScene = {
    meshes: [],
    cursorPosition: {
      x: cursorPos.x,
      y: cursorPos.y,
      z: cursorPos.z
    },
    metadata: {
      version: '1.0.0',
      savedAt: new Date().toISOString(),
      name: 'Sphaire Project'
    }
  };

  // Process each mesh in the scene
  scene.meshes.forEach((mesh) => {
    // Skip internal or helper meshes (like gizmos)
    if (mesh.name.startsWith('__') || mesh.name.includes('gizmo') || mesh.name.includes('utilityLayer')) {
      return;
    }

    try {
      const babylonMesh = mesh as Mesh;
      
      // Get vertex data from the mesh
      const vertexData = VertexData.ExtractFromMesh(babylonMesh);
      
      // Ensure we have the required data
      if (vertexData && vertexData.positions && vertexData.indices && vertexData.normals) {
        // Convert typed arrays to regular arrays for JSON serialization
        const posArray = Array.from(vertexData.positions);
        const indexArray = Array.from(vertexData.indices);
        const normalArray = Array.from(vertexData.normals);
        const uvArray = vertexData.uvs ? Array.from(vertexData.uvs) : undefined;
        
        // Material data if available
        let materialData = undefined;
        if (babylonMesh.material) {
          const material = babylonMesh.material as any;
          // For standard material
          if ('diffuseColor' in material) {
            materialData = {
              diffuseColor: material.diffuseColor ? 
                { r: material.diffuseColor.r, g: material.diffuseColor.g, b: material.diffuseColor.b } : 
                undefined,
              emissiveColor: material.emissiveColor ? 
                { r: material.emissiveColor.r, g: material.emissiveColor.g, b: material.emissiveColor.b } : 
                undefined,
              specularColor: material.specularColor ? 
                { r: material.specularColor.r, g: material.specularColor.g, b: material.specularColor.b } : 
                undefined,
              alpha: material.alpha
            };
          }
        }

        // Create serialized mesh object
        const serializedMesh: SerializedMesh = {
          id: babylonMesh.id,
          name: babylonMesh.name,
          position: {
            x: babylonMesh.position.x,
            y: babylonMesh.position.y,
            z: babylonMesh.position.z
          },
          rotation: {
            x: babylonMesh.rotation.x,
            y: babylonMesh.rotation.y,
            z: babylonMesh.rotation.z
          },
          scaling: {
            x: babylonMesh.scaling.x,
            y: babylonMesh.scaling.y,
            z: babylonMesh.scaling.z
          },
          isVisible: babylonMesh.isVisible,
          geometryData: {
            positions: posArray,
            indices: indexArray,
            normals: normalArray,
            uvs: uvArray
          },
          materialData: materialData
        };

        sceneData.meshes.push(serializedMesh);
      }
    } catch (error) {
      console.error(`Error serializing mesh ${mesh.name}:`, error);
    }
  });

  // Convert scene data to JSON
  const jsonData = JSON.stringify(sceneData, null, 2);
  
  // Create a blob from the JSON data
  const blob = new Blob([jsonData], { type: 'application/json' });
  
  // Create a download URL and trigger download
  const url = URL.createObjectURL(blob);
  const downloadLink = document.createElement('a');
  downloadLink.href = url;
  downloadLink.download = 'sphaire_project.json';
  downloadLink.click();
  
  // Clean up the URL object
  setTimeout(() => URL.revokeObjectURL(url), 100);
};

/**
 * Loads and parses a previously saved project file
 * 
 * @param file - The project file to load
 * @returns A promise resolving to the parsed scene data and cursor position
 */
export const loadProject = async (file: File): Promise<{ sceneData: SerializedScene; cursorPos: Vector3 }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        if (!event.target || typeof event.target.result !== 'string') {
          throw new Error('Failed to read file content');
        }
        
        // Parse the JSON data
        const sceneData: SerializedScene = JSON.parse(event.target.result);
        
        // Extract cursor position
        const cursorPos = new Vector3(
          sceneData.cursorPosition.x,
          sceneData.cursorPosition.y,
          sceneData.cursorPosition.z
        );
        
        // Return the parsed data
        resolve({ sceneData, cursorPos });
      } catch (error) {
        reject(new Error(`Failed to parse project file: ${error}`));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Error reading file'));
    };
    
    // Start reading the file as text
    reader.readAsText(file);
  });
};

/**
 * Helper function to recreate meshes from serialized data
 * 
 * @param sceneData - The serialized scene data
 * @param scene - The Babylon.js scene to add meshes to
 * @returns Recreated meshes
 */
export const recreateMeshesFromData = (sceneData: SerializedScene, scene: Scene): Mesh[] => {
  const meshes: Mesh[] = [];
  
  sceneData.meshes.forEach(meshData => {
    // Create a new mesh
    const mesh = new Mesh(meshData.name, scene);
    
    // Apply transforms
    mesh.position = new Vector3(
      meshData.position.x, 
      meshData.position.y, 
      meshData.position.z
    );
    
    mesh.rotation = new Vector3(
      meshData.rotation.x, 
      meshData.rotation.y, 
      meshData.rotation.z
    );
    
    mesh.scaling = new Vector3(
      meshData.scaling.x, 
      meshData.scaling.y, 
      meshData.scaling.z
    );
    
    // Set visibility
    mesh.isVisible = meshData.isVisible;
    
    // Apply geometry
    const vertexData = new VertexData();
    vertexData.positions = new Float32Array(meshData.geometryData.positions);
    vertexData.indices = new Uint32Array(meshData.geometryData.indices);
    vertexData.normals = new Float32Array(meshData.geometryData.normals);
    
    if (meshData.geometryData.uvs) {
      vertexData.uvs = new Float32Array(meshData.geometryData.uvs);
    }
    
    // Apply the vertex data to the mesh
    vertexData.applyToMesh(mesh);
    
    // Apply material if available
    if (meshData.materialData) {
      const material = new StandardMaterial(mesh.name + "_material", scene);
      
      if (meshData.materialData.diffuseColor) {
        material.diffuseColor = new Color3(
          meshData.materialData.diffuseColor.r,
          meshData.materialData.diffuseColor.g,
          meshData.materialData.diffuseColor.b
        );
      }
      
      if (meshData.materialData.emissiveColor) {
        material.emissiveColor = new Color3(
          meshData.materialData.emissiveColor.r,
          meshData.materialData.emissiveColor.g,
          meshData.materialData.emissiveColor.b
        );
      }
      
      if (meshData.materialData.specularColor) {
        material.specularColor = new Color3(
          meshData.materialData.specularColor.r,
          meshData.materialData.specularColor.g,
          meshData.materialData.specularColor.b
        );
      }
      
      if (meshData.materialData.alpha !== undefined) {
        material.alpha = meshData.materialData.alpha;
      }
      
      mesh.material = material;
    }
    
    meshes.push(mesh);
  });
  
  return meshes;
};
