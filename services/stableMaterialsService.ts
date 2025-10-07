import { PBRMaterial, StandardMaterial, Texture, Color3 } from '@babylonjs/core';


export interface PBRTextureStack {
  baseColor: string;     // Albedo/diffuse map URL
  normal: string;        // Normal map URL
  roughness: string;     // Roughness map URL
  metallic: string;      // Metallic map URL
  height: string;        // Height map URL
  ao?: string;           // Ambient Occlusion map URL
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
    scene: any,
    materialName?: string
  ): Promise<PBRMaterial> {
    if (!scene) {
      throw new Error('Babylon.js scene not found');
    }

    try {
      const material = new PBRMaterial(materialName || `PBRMaterial_${Date.now()}`, scene);

      // Create textures with proxy URLs to bypass CORS
      const baseColorTexture = new Texture(this.getProxyUrl(textureStack.baseColor), scene);
      const normalTexture = new Texture(this.getProxyUrl(textureStack.normal), scene);
      const metallicTexture = new Texture(this.getProxyUrl(textureStack.metallic), scene);
      const heightTexture = new Texture(this.getProxyUrl(textureStack.height), scene);
      const aoTexture = textureStack.ao ? new Texture(this.getProxyUrl(textureStack.ao), scene) : null;

      // Ensure textures tile seamlessly if the images are tileable
      [baseColorTexture, normalTexture, metallicTexture, heightTexture, aoTexture]
        .filter((t): t is Texture => !!t)
        .forEach((t) => {
          t.wrapU = Texture.WRAP_ADDRESSMODE;
          t.wrapV = Texture.WRAP_ADDRESSMODE;
        });

      // Apply PBR textures (Metal/Rough workflow)
      material.albedoTexture = baseColorTexture;
      material.bumpTexture = normalTexture; // keep normal map
      material.metallicTexture = metallicTexture; // metallic channel mapping handled by Babylon

      // If AO provided, map it
      if (aoTexture) {
        material.ambientTexture = aoTexture;
      }

      // NOTE: We intentionally do NOT assign roughness texture to microSurfaceTexture,
      // as microSurface is used for the specular-glossiness workflow. If you later
      // provide a packed metallicRoughness texture, enable Babylon's channel usage flags.

      // Height/parallax: do not override normal map; only enable if explicitly desired
      // Leaving disabled by default avoids replacing bump (normal) texture.
      // material.useParallax = true;
      // material.useParallaxOcclusion = true;
      // material.parallaxScaleBias = 0.03;
      // material.bumpTexture = heightTexture; // Would replace normal map

      // Baseline PBR scalar properties
      material.metallic = 0.0; // drive metallic via texture
      material.roughness = 1.0; // fallback scalar roughness
      material.albedoColor = new Color3(1, 1, 1);

      // Double-sided for better visibility of thin geometry
      material.backFaceCulling = false;
      material.twoSidedLighting = true;

      // Enable environment reflections (scene env set in ViewportProduction)
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
      console.log('applyPBRMaterialToMesh called with:', {
        mesh: mesh ? mesh.name : 'null',
        meshType: mesh ? mesh.constructor.name : 'null',
        hasGetScene: mesh ? typeof mesh.getScene === 'function' : false,
        textureStack: !!textureStack
      });
      
      if (!mesh || !textureStack) {
        throw new Error('Mesh and texture stack are required');
      }

      console.log('Getting scene from mesh...');
      const scene = mesh.getScene();
      console.log('Scene result:', {
        hasScene: !!scene,
        sceneType: scene ? scene.constructor.name : 'null',
        meshDisposed: mesh.isDisposed ? mesh.isDisposed() : 'unknown'
      });
      
      if (!scene) {
        throw new Error('Babylon.js scene not found');
      }

      console.log('Creating PBR material...');
      const material = await this.createPBRMaterial(textureStack, scene, materialName);
      console.log('Applying material to mesh...');
      // If a transform/container was selected, apply to all child meshes
      const hasChildren = typeof (mesh as any).getChildMeshes === 'function';
      if (hasChildren) {
        const children = (mesh as any).getChildMeshes(false) || [];
        if (children.length > 0) {
          console.log(`Applying to ${children.length} child mesh(es)`);
          children.forEach((child: any) => {
            if (child && 'material' in child) {
              child.material = material;
            }
          });
        } else {
          mesh.material = material;
        }
      } else {
        mesh.material = material;
      }
      
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
      material.backFaceCulling = false; // match imported model double-sided behavior
      
      // Apply material to mesh or its children if it's a transform/container
      const hasChildren = typeof (mesh as any).getChildMeshes === 'function';
      if (hasChildren) {
        const children = (mesh as any).getChildMeshes(false) || [];
        if (children.length > 0) {
          console.log(`Applying simple material to ${children.length} child mesh(es)`);
          children.forEach((child: any) => {
            if (child && 'material' in child) {
              child.material = material;
            }
          });
        } else {
          mesh.material = material;
        }
      } else {
        mesh.material = material;
      }
      
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
    try {
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

// Export default for convenience
export default stableMaterialsService;
