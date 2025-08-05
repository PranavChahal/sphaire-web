import { PBRMaterial, StandardMaterial, Texture, Color3 } from '@babylonjs/core';

export interface PBRTextureStack {
  baseColor: string;
  normal: string;
  roughness: string;
  metallic: string;
  height: string;
  ao?: string;
}

export interface TextureGenerationOptions {
  seamless?: boolean;
  tileable?: boolean;
  size?: '512x512' | '1024x1024' | '2048x2048';
  quality?: 'standard' | 'hd';
}

export interface SimpleTextureResponse {
  success: boolean;
  textureUrl?: string;
  error?: string;
}

class StableMaterialsService {
  private static instance: StableMaterialsService;

  private constructor() {}

  public static getInstance(): StableMaterialsService {
    if (!StableMaterialsService.instance) {
      StableMaterialsService.instance = new StableMaterialsService();
    }
    return StableMaterialsService.instance;
  }

  public async generateSimpleTexture(prompt: string): Promise<string> {
    try {
      const response = await fetch('/api/generateSimpleTexture', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: SimpleTextureResponse = await response.json();

      if (!data.success || !data.textureUrl) {
        throw new Error(data.error || 'Failed to generate simple texture');
      }

      return data.textureUrl;
    } catch (error) {
      console.error('Error generating simple texture:', error);
      throw error instanceof Error ? error : new Error('Unknown error occurred');
    }
  }

  public async generatePBRTextures(prompt: string, options: TextureGenerationOptions = {}): Promise<PBRTextureStack> {
    try {
      const response = await fetch('/api/generatePBRTextures', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt, options }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success || !data.textures) {
        throw new Error(data.error || 'Failed to generate PBR textures');
      }

      return data.textures;
    } catch (error) {
      console.error('Error generating PBR textures:', error);
      throw error instanceof Error ? error : new Error('Unknown error occurred');
    }
  }

  /**
   * Get proxy URL to bypass CORS for DALL-E images
   */
  private getProxyUrl(originalUrl: string): string {
    return `/api/proxyImage?url=${encodeURIComponent(originalUrl)}`;
  }

  /**
   * Create PBR Material from texture stack
   */
  private async createPBRMaterial(
    textureStack: PBRTextureStack,
    materialName?: string
  ): Promise<PBRMaterial> {
    const scene = (window as any).scene;
    if (!scene) {
      throw new Error('Babylon.js scene not found');
    }

    try {
      const material = new PBRMaterial(materialName || `PBRMaterial_${Date.now()}`, scene);

      // Create textures with proxy URLs to bypass CORS
      const baseColorTexture = new Texture(this.getProxyUrl(textureStack.baseColor), scene);
      const normalTexture = new Texture(this.getProxyUrl(textureStack.normal), scene);
      const roughnessTexture = new Texture(this.getProxyUrl(textureStack.roughness), scene);
      const metallicTexture = new Texture(this.getProxyUrl(textureStack.metallic), scene);
      const heightTexture = new Texture(this.getProxyUrl(textureStack.height), scene);

      // Apply PBR textures
      material.albedoTexture = baseColorTexture;
      material.bumpTexture = normalTexture;
      material.metallicTexture = metallicTexture;
      material.microSurfaceTexture = roughnessTexture;
      material.ambientTexture = heightTexture;

      // Set PBR properties
      material.metallic = 0.0;
      material.roughness = 1.0;
      material.albedoColor = new Color3(1, 1, 1);

      // Enable environment reflections
      material.environmentIntensity = 1.0;

      console.log(`Created PBR material: ${materialName}`);
      return material;

    } catch (error) {
      console.error('Error creating Babylon.js PBR material:', error);
      throw error;
    }
  }

  /**
   * Apply PBR material to a mesh
   */
  public async applyPBRMaterialToMesh(
    mesh: any, 
    textureStack: PBRTextureStack,
    materialName?: string
  ): Promise<void> {
    try {
      if (!mesh || !textureStack) {
        throw new Error('Mesh and texture stack are required');
      }

      const material = await this.createPBRMaterial(textureStack, materialName);
      mesh.material = material;
      
      console.log(`Applied PBR material to mesh: ${mesh.name}`);
    } catch (error) {
      console.error('Error applying PBR material to mesh:', error);
      throw error;
    }
  }

  /**
   * Apply simple texture to a mesh using StandardMaterial
   */
  public async applySimpleTextureToMesh(
    mesh: any,
    textureUrl: string,
    materialName?: string
  ): Promise<void> {
    try {
      if (!mesh || !textureUrl) {
        throw new Error('Mesh and texture URL are required');
      }

      const scene = mesh.getScene();
      if (!scene) {
        throw new Error('Scene not found');
      }

      // Create a StandardMaterial for simple textures
      const material = new StandardMaterial(materialName || `SimpleMaterial_${Date.now()}`, scene);
      
      // Create texture with proxy URL to bypass CORS
      const proxyUrl = this.getProxyUrl(textureUrl);
      const diffuseTexture = new Texture(proxyUrl, scene);
      
      // Apply the texture
      material.diffuseTexture = diffuseTexture;
      material.specularColor = new Color3(0.1, 0.1, 0.1); // Reduce specular for better texture visibility
      
      // Apply material to mesh
      mesh.material = material;
      
      console.log(`Applied simple texture to mesh: ${mesh.name}`);
    } catch (error) {
      console.error('Error applying simple texture to mesh:', error);
      throw error;
    }
  }

  /**
   * Preload texture images for better performance
   */
  public async preloadTextures(textureStack: PBRTextureStack): Promise<void> {
    const urls = [
      textureStack.baseColor,
      textureStack.normal,
      textureStack.roughness,
      textureStack.metallic,
      textureStack.height
    ];

    if (textureStack.ao) {
      urls.push(textureStack.ao);
    }

    const loadPromises = urls.map(url => this.loadImage(url));
    
    try {
      await Promise.all(loadPromises);
      console.log('All PBR textures preloaded successfully');
    } catch (error) {
      console.warn('Some textures failed to preload:', error);
    }
  }

  /**
   * Load image helper for preloading
   */
  private loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = this.getProxyUrl(url);
    });
  }

  /**
   * Clean up resources
   */
  public dispose(): void {
    // Clean up resources if needed
    console.log('StableMaterialsService disposed');
  }
}

// Export singleton instance
export const stableMaterialsService = StableMaterialsService.getInstance();
export default stableMaterialsService;
