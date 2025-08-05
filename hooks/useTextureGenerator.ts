/**
 * useTextureGenerator.ts
 * 
 * React hook for managing texture generation with both simple and PBR modes
 */

import { useState, useCallback } from 'react';
import { stableMaterialsService, PBRTextureStack, TextureGenerationOptions } from '../services/stableMaterialsService';
import { generateTexture } from '../services/textureService';

export interface UseTextureGeneratorOptions {
  mode?: 'simple' | 'pbr';
  scene?: any; // Babylon.js scene
}

export interface TextureGenerationState {
  isGenerating: boolean;
  error: string | null;
  simpleTexture: string | null;
  pbrTextures: PBRTextureStack | null;
  mode: 'simple' | 'pbr';
}

export interface TextureGenerationActions {
  generateSimpleTexture: (prompt: string) => Promise<string | null>;
  generatePBRTextures: (prompt: string, options?: Partial<TextureGenerationOptions>) => Promise<PBRTextureStack | null>;
  applyPBRToMesh: (mesh: any, textureStack?: PBRTextureStack) => Promise<boolean>;
  setMode: (mode: 'simple' | 'pbr') => void;
  clearTextures: () => void;
  clearError: () => void;
}

export type UseTextureGeneratorReturn = TextureGenerationState & TextureGenerationActions;

/**
 * Custom hook for texture generation with StableMaterials and simple texture support
 */
export function useTextureGenerator(options: UseTextureGeneratorOptions = {}): UseTextureGeneratorReturn {
  const [state, setState] = useState<TextureGenerationState>({
    isGenerating: false,
    error: null,
    simpleTexture: null,
    pbrTextures: null,
    mode: options.mode || 'pbr'
  });

  // StableMaterials service is auto-initialized with hardcoded API key

  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error }));
  }, []);

  const setGenerating = useCallback((isGenerating: boolean) => {
    setState(prev => ({ ...prev, isGenerating }));
  }, []);

  const generateSimpleTexture = useCallback(async (prompt: string): Promise<string | null> => {
    if (!prompt.trim()) {
      setError('Prompt cannot be empty');
      return null;
    }

    setGenerating(true);
    setError(null);

    try {
      const textureUrl = await generateTexture(prompt);
      setState(prev => ({
        ...prev,
        simpleTexture: textureUrl,
        pbrTextures: null,
        isGenerating: false
      }));
      return textureUrl;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate simple texture';
      setError(errorMessage);
      setGenerating(false);
      return null;
    }
  }, [setError, setGenerating]);

  const generatePBRTextures = useCallback(async (
    prompt: string
  ): Promise<PBRTextureStack | null> => {
    if (!prompt.trim()) {
      setError('Prompt cannot be empty');
      return null;
    }

    setGenerating(true);
    setError(null);

    try {
      const textureStack = await stableMaterialsService.generatePBRTextures(prompt);
      
      // Preload textures for better performance
      await stableMaterialsService.preloadTextures(textureStack);

      setState(prev => ({
        ...prev,
        pbrTextures: textureStack,
        simpleTexture: null,
        isGenerating: false
      }));

      return textureStack;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate PBR textures';
      setError(errorMessage);
      setGenerating(false);
      return null;
    }
  }, [setError, setGenerating]);

  const applyPBRToMesh = useCallback(async (
    mesh: any, 
    textureStack?: PBRTextureStack
  ): Promise<boolean> => {
    const textures = textureStack || state.pbrTextures;
    
    if (!textures) {
      setError('No PBR textures available to apply');
      return false;
    }

    if (!mesh) {
      setError('No mesh provided');
      return false;
    }

    try {
      await stableMaterialsService.applyPBRMaterialToMesh(mesh, textures);
      setError(null);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to apply PBR material';
      setError(`Failed to apply PBR material: ${errorMessage}`);
      return false;
    }
  }, [state.pbrTextures, setError]);

  const setMode = useCallback((mode: 'simple' | 'pbr') => {
    setState(prev => ({ ...prev, mode }));
  }, []);



  const clearTextures = useCallback(() => {
    setState(prev => ({
      ...prev,
      simpleTexture: null,
      pbrTextures: null,
      error: null
    }));
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, [setError]);

  return {
    // State
    ...state,
    
    // Actions
    generateSimpleTexture,
    generatePBRTextures,
    applyPBRToMesh,
    setMode,
    clearTextures,
    clearError
  };
}

export default useTextureGenerator;
