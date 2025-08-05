interface TextureGenerationResponse {
  url: string;
}

export const generateTexture = async (prompt: string): Promise<string> => {
  try {
    if (!prompt || typeof prompt !== 'string') {
      throw new Error('Invalid prompt: must be a non-empty string');
    }

    const response = await fetch('/api/generateTexture', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error || `API request failed with status ${response.status}`;
      throw new Error(errorMessage);
    }

    const data = await response.json() as TextureGenerationResponse;

    // Validate the response data
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid response: Expected an object');
    }

    if (!data.url || typeof data.url !== 'string') {
      throw new Error('Invalid response: Missing or invalid texture URL');
    }

    return data.url;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Texture Generation failed: ${error.message}`);
    }
    throw new Error('Texture Generation failed with an unknown error');
  }
};

export const loadTextureImage = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    
    image.onload = () => {
      resolve(image);
    };
    
    image.onerror = () => {
      reject(new Error(`Failed to load texture image from URL: ${url}`));
    };
    
    image.src = url;
  });
};

/**
 * Applies a texture to a Babylon.js mesh
 * 
 * @param mesh - The Babylon.js mesh to apply the texture to
 * @param textureUrl - The URL of the texture image
 * @returns Promise resolving when the texture is applied
 * @throws Error if the mesh is invalid or texture application fails
 */
export const applyTextureToMesh = async (mesh: any, textureUrl: string): Promise<void> => {
  if (!mesh) {
    throw new Error('Invalid mesh: mesh is required');
  }

  if (!textureUrl || typeof textureUrl !== 'string') {
    throw new Error('Invalid texture URL: must be a non-empty string');
  }

  try {
    // Import Babylon.js modules dynamically
    const BABYLON = await import('@babylonjs/core');
    
    // Create a new standard material if the mesh doesn't have one
    if (!mesh.material) {
      mesh.material = new BABYLON.StandardMaterial('texturedMaterial', mesh.getScene());
    }
    
    // If the material is not a StandardMaterial, create a new one
    if (!(mesh.material instanceof BABYLON.StandardMaterial)) {
      mesh.material = new BABYLON.StandardMaterial('texturedMaterial', mesh.getScene());
    }
    
    // Create and apply the texture
    const texture = new BABYLON.Texture(textureUrl, mesh.getScene());
    mesh.material.diffuseTexture = texture;
    
    // Optional: Set material properties for better texture rendering
    mesh.material.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
    mesh.material.emissiveColor = new BABYLON.Color3(0, 0, 0);
    
    console.log('Texture applied successfully to mesh:', mesh.name);
  } catch (error) {
    console.error('Error applying texture to mesh:', error);
    throw new Error(`Failed to apply texture: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Exported default object for named imports
 */
const textureService = {
  generateTexture,
  loadTextureImage,
  applyTextureToMesh,
};

export default textureService;
