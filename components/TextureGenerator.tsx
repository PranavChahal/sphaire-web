import React, { useState } from 'react';
import { stableMaterialsService, PBRTextureStack, TextureGenerationOptions } from '../services/stableMaterialsService';
import { generateTexture } from '../services/textureService';

interface TextureGeneratorProps {
  onTextureGenerated: (url: string) => void;
  onPBRTextureGenerated?: (textureStack: PBRTextureStack) => void;
  scene?: any; // Babylon.js scene for direct material application
  selectedMeshes?: any[]; // Array of currently selected meshes
}

const TextureGenerator: React.FC<TextureGeneratorProps> = ({ onTextureGenerated, onPBRTextureGenerated, scene, selectedMeshes }) => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pbrTextures, setPbrTextures] = useState<PBRTextureStack | null>(null);
  const [generationMode, setGenerationMode] = useState<'simple' | 'pbr'>('pbr');
  const [selectedTexture, setSelectedTexture] = useState<{type: string, url: string} | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setError(null);
    setPbrTextures(null);
    setPreviewUrl(null);

    try {
      if (generationMode === 'pbr') {
        // Generate PBR texture stack
        const options: TextureGenerationOptions = {
          seamless: true,
          tileable: true
        };

        const textureStack = await stableMaterialsService.generatePBRTextures(prompt, options);
        setPbrTextures(textureStack);
        setPreviewUrl(textureStack.baseColor);
        
        // Preload textures for better performance
        await stableMaterialsService.preloadTextures(textureStack);
        
        // Call PBR callback if provided
        if (onPBRTextureGenerated) {
          onPBRTextureGenerated(textureStack);
        }
        
        // Also call the regular callback with base color
        onTextureGenerated(textureStack.baseColor);
      } else {
        // Use the simple texture generation service
        const textureUrl = await generateTexture(prompt);
        setPreviewUrl(textureUrl);
        onTextureGenerated(textureUrl);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsGenerating(false);
    }
  };

  const applyPBRToSelectedMesh = async () => {
    if (!pbrTextures || !scene) return;
    const meshes = Array.isArray(selectedMeshes) ? selectedMeshes : [];
    if (meshes.length === 0) {
      setError('Please select at least one mesh to apply the PBR material');
      return;
    }

    try {
      await Promise.all(
        meshes.map((m) => stableMaterialsService.applyPBRMaterialToMesh(m, pbrTextures))
      );
      setError(null);
    } catch (err) {
      setError(`Failed to apply PBR material: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const applySimpleTextureToSelectedMesh = async () => {
    if (!previewUrl || !scene) return;
    const meshes = Array.isArray(selectedMeshes) ? selectedMeshes : [];
    if (meshes.length === 0) {
      setError('Please select at least one mesh to apply the texture');
      return;
    }

    try {
      await Promise.all(
        meshes.map((m) => stableMaterialsService.applySimpleTextureToMesh(m, previewUrl))
      );
      setError(null);
    } catch (err) {
      setError(`Failed to apply texture: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="p-4 bg-sphaire-dark-lighter rounded-lg shadow-md">
      <h2 className="text-xl font-bold text-sphaire-pink-light mb-4">AI Texture Generator</h2>
      
      {/* Generation Mode Toggle */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">Generation Mode</label>
        <div className="flex space-x-2">
          <button
            type="button"
            onClick={() => setGenerationMode('pbr')}
            className={`px-3 py-1 rounded-md text-sm transition-colors ${
              generationMode === 'pbr'
                ? 'bg-sphaire-pink text-white'
                : 'bg-sphaire-dark text-gray-300 hover:bg-sphaire-purple'
            }`}
          >
            PBR Stack (StableMaterials)
          </button>
          <button
            type="button"
            onClick={() => setGenerationMode('simple')}
            className={`px-3 py-1 rounded-md text-sm transition-colors ${
              generationMode === 'simple'
                ? 'bg-sphaire-pink text-white'
                : 'bg-sphaire-dark text-gray-300 hover:bg-sphaire-purple'
            }`}
          >
            Simple Texture
          </button>
        </div>
      </div>


      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Describe your texture
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full h-24 px-3 py-2 text-white bg-sphaire-dark border border-sphaire-purple rounded-md focus:outline-none focus:ring-2 focus:ring-sphaire-pink-light"
            placeholder="Example: Rusty metal with scratches"
          />
        </div>

        <div className="flex items-center justify-between">
          <button
            type="submit"
            disabled={isGenerating || !prompt.trim()}
            className={`px-4 py-2 bg-sphaire-pink text-white rounded-md hover:bg-sphaire-purple transition-colors ${
              isGenerating || !prompt.trim() ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isGenerating ? 'Generating...' : 'Generate Texture'}
          </button>

          {isGenerating && (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-sphaire-pink-light mr-2"></div>
              <span className="text-gray-300 text-sm">Processing...</span>
            </div>
          )}
        </div>
      </form>

      {error && (
        <div className="mt-4 p-3 bg-red-900/30 border border-red-500 rounded-md text-red-200 text-sm">
          {error}
        </div>
      )}

      {/* PBR Texture Stack Preview */}
      {pbrTextures && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-sphaire-pink-light">Generated PBR Texture Stack</h3>
            {scene && (
              <button
                onClick={applyPBRToSelectedMesh}
                className="px-3 py-1 bg-sphaire-purple text-white text-xs rounded hover:bg-sphaire-pink transition-colors"
              >
                Apply to Selected Mesh
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {/* Base Color */}
            <div 
              className={`bg-sphaire-dark border border-sphaire-purple-light border-opacity-30 rounded-md overflow-hidden cursor-pointer transition-all hover:border-sphaire-pink ${
                selectedTexture?.type === 'baseColor' ? 'border-sphaire-pink border-2' : ''
              }`}
              onClick={() => setSelectedTexture({type: 'baseColor', url: pbrTextures.baseColor})}
            >
              <img src={pbrTextures.baseColor} alt="Base Color" className="w-full h-24 object-cover" />
              <div className="p-2">
                <p className="text-xs text-gray-300 font-medium">Base Color</p>
                <p className="text-xs text-gray-500">Albedo/Diffuse</p>
                {selectedTexture?.type === 'baseColor' && (
                  <p className="text-xs text-sphaire-pink font-bold">✓ Selected</p>
                )}
              </div>
            </div>
            
            {/* Normal Map */}
            <div 
              className={`bg-sphaire-dark border border-sphaire-purple-light border-opacity-30 rounded-md overflow-hidden cursor-pointer transition-all hover:border-sphaire-pink ${
                selectedTexture?.type === 'normal' ? 'border-sphaire-pink border-2' : ''
              }`}
              onClick={() => setSelectedTexture({type: 'normal', url: pbrTextures.normal})}
            >
              <img src={pbrTextures.normal} alt="Normal Map" className="w-full h-24 object-cover" />
              <div className="p-2">
                <p className="text-xs text-gray-300 font-medium">Normal</p>
                <p className="text-xs text-gray-500">Surface Detail</p>
                {selectedTexture?.type === 'normal' && (
                  <p className="text-xs text-sphaire-pink font-bold">✓ Selected</p>
                )}
              </div>
            </div>
            
            {/* Roughness Map */}
            <div 
              className={`bg-sphaire-dark border border-sphaire-purple-light border-opacity-30 rounded-md overflow-hidden cursor-pointer transition-all hover:border-sphaire-pink ${
                selectedTexture?.type === 'roughness' ? 'border-sphaire-pink border-2' : ''
              }`}
              onClick={() => setSelectedTexture({type: 'roughness', url: pbrTextures.roughness})}
            >
              <img src={pbrTextures.roughness} alt="Roughness Map" className="w-full h-24 object-cover" />
              <div className="p-2">
                <p className="text-xs text-gray-300 font-medium">Roughness</p>
                <p className="text-xs text-gray-500">Surface Shine</p>
                {selectedTexture?.type === 'roughness' && (
                  <p className="text-xs text-sphaire-pink font-bold">✓ Selected</p>
                )}
              </div>
            </div>
            
            {/* Metallic Map */}
            <div 
              className={`bg-sphaire-dark border border-sphaire-purple-light border-opacity-30 rounded-md overflow-hidden cursor-pointer transition-all hover:border-sphaire-pink ${
                selectedTexture?.type === 'metallic' ? 'border-sphaire-pink border-2' : ''
              }`}
              onClick={() => setSelectedTexture({type: 'metallic', url: pbrTextures.metallic})}
            >
              <img src={pbrTextures.metallic} alt="Metallic Map" className="w-full h-24 object-cover" />
              <div className="p-2">
                <p className="text-xs text-gray-300 font-medium">Metallic</p>
                <p className="text-xs text-gray-500">Metal/Dielectric</p>
                {selectedTexture?.type === 'metallic' && (
                  <p className="text-xs text-sphaire-pink font-bold">✓ Selected</p>
                )}
              </div>
            </div>
            
            {/* Height Map */}
            <div 
              className={`bg-sphaire-dark border border-sphaire-purple-light border-opacity-30 rounded-md overflow-hidden cursor-pointer transition-all hover:border-sphaire-pink ${
                selectedTexture?.type === 'height' ? 'border-sphaire-pink border-2' : ''
              }`}
              onClick={() => setSelectedTexture({type: 'height', url: pbrTextures.height})}
            >
              <img src={pbrTextures.height} alt="Height Map" className="w-full h-24 object-cover" />
              <div className="p-2">
                <p className="text-xs text-gray-300 font-medium">Height</p>
                <p className="text-xs text-gray-500">Displacement</p>
                {selectedTexture?.type === 'height' && (
                  <p className="text-xs text-sphaire-pink font-bold">✓ Selected</p>
                )}
              </div>
            </div>
            
            {/* Ambient Occlusion (if available) */}
            {pbrTextures.ao && (
              <div className="bg-sphaire-dark border border-sphaire-purple-light border-opacity-30 rounded-md overflow-hidden">
                <img src={pbrTextures.ao} alt="AO Map" className="w-full h-24 object-cover" />
                <div className="p-2">
                  <p className="text-xs text-gray-300 font-medium">AO</p>
                  <p className="text-xs text-gray-500">Ambient Occlusion</p>
                </div>
              </div>
            )}
          </div>
          
          <div className="mt-3 text-xs text-gray-400">
            <p>Complete PBR material ready for 3D rendering with physically accurate lighting.</p>
          </div>
        </div>
      )}

      {/* Simple Texture Preview */}
      {previewUrl && !pbrTextures && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-sphaire-pink-light">Generated Texture</h3>
            {scene && (
              <button
                onClick={applySimpleTextureToSelectedMesh}
                className="px-3 py-1 bg-sphaire-purple text-white text-xs rounded hover:bg-sphaire-pink transition-colors"
              >
                Apply to Selected Mesh
              </button>
            )}
          </div>
          <div className="relative bg-sphaire-dark border border-sphaire-purple-light border-opacity-30 rounded-md overflow-hidden">
            <img 
              src={previewUrl} 
              alt="Generated texture" 
              className="w-full h-48 object-cover"
            />
            <div className="absolute bottom-2 right-2 flex space-x-2">
              <button
                onClick={() => window.open(previewUrl, '_blank')}
                className="p-2 bg-sphaire-dark-lighter rounded-full hover:bg-sphaire-purple transition-colors"
                title="Open in new tab"
              >
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                  <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                </svg>
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(previewUrl);
                }}
                className="p-2 bg-sphaire-dark-lighter rounded-full hover:bg-sphaire-purple transition-colors"
                title="Copy URL"
              >
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                  <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                </svg>
              </button>
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-400">
            <p>This texture can be applied to your 3D models.</p>
          </div>
        </div>
      )}

      <div className="mt-4 text-xs text-gray-400">
        <p><strong>Hints for {generationMode === 'pbr' ? 'PBR' : 'Simple'} Generation:</strong></p>
        {generationMode === 'pbr' ? (
          <div className="mt-1">
            <p>• Be specific about material properties: "rusty metal", "polished marble", "weathered wood"</p>
            <p>• Add surface details: "scratched", "bumpy", "smooth", "cracked"</p>
            <p>• Include "seamless" and "tileable" for better results</p>
            <p>• Examples: "seamless brick wall texture, weathered, tileable", "polished copper metal, scratched surface"</p>
          </div>
        ) : (
          <div className="mt-1">
            <p>• Be specific about material properties, patterns, and colors</p>
            <p>• Examples: "Blue marble with gold veins", "Wooden planks with knots"</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TextureGenerator;
