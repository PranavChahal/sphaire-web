/**
 * TextureGeneratorDemo.tsx
 * 
 * Complete demo component showing how to integrate StableMaterials texture generation
 * with Babylon.js scene and mesh selection
 */

import React, { useState } from 'react';
import TextureGenerator from './TextureGenerator';
import { useTextureGenerator } from '../hooks/useTextureGenerator';
import { PBRTextureStack } from '../services/stableMaterialsService';

interface TextureGeneratorDemoProps {
  scene?: any; // Babylon.js scene
  selectedMesh?: any; // Currently selected mesh
}

const TextureGeneratorDemo: React.FC<TextureGeneratorDemoProps> = ({ scene, selectedMesh }) => {
  const [apiToken, setApiToken] = useState('');
  const [showApiTokenInput, setShowApiTokenInput] = useState(false);
  
  // Use the custom hook for advanced texture generation
  const {
    isGenerating,
    error,
    pbrTextures,
    simpleTexture,
    generatePBRTextures,
    generateSimpleTexture,
    applyPBRToMesh,
    clearError,
    mode
  } = useTextureGenerator({ scene });

  // Handle texture generation from the TextureGenerator component
  const handleTextureGenerated = (url: string) => {
    console.log('Simple texture generated:', url);
  };

  const handlePBRTextureGenerated = (textureStack: PBRTextureStack) => {
    console.log('PBR texture stack generated:', textureStack);
  };

  // Quick generation examples
  const generateExampleTextures = async () => {
    const examples = [
      'rusty metal surface, weathered, seamless, tileable',
      'polished marble with gold veins, seamless, tileable', 
      'weathered brick wall texture, old, seamless, tileable',
      'dark leather surface, cracked, seamless, tileable'
    ];
    
    const randomExample = examples[Math.floor(Math.random() * examples.length)];
    
    if (mode === 'pbr') {
      await generatePBRTextures(randomExample);
    } else {
      await generateSimpleTexture(randomExample);
    }
  };

  // Apply current textures to selected mesh
  const applyToSelectedMesh = async () => {
    if (!selectedMesh) {
      alert('Please select a mesh first');
      return;
    }

    if (pbrTextures) {
      const success = await applyPBRToMesh(selectedMesh, pbrTextures);
      if (success) {
        alert('PBR material applied successfully!');
      }
    } else if (simpleTexture && scene) {
      // Apply simple texture using basic material
      try {
        const BABYLON = (window as any).BABYLON;
        const material = new BABYLON.StandardMaterial(`texture_${Date.now()}`, scene);
        material.diffuseTexture = new BABYLON.Texture(simpleTexture, scene);
        selectedMesh.material = material;
        alert('Simple texture applied successfully!');
      } catch (err) {
        console.error('Failed to apply simple texture:', err);
        alert('Failed to apply simple texture');
      }
    } else {
      alert('No texture available to apply');
    }
  };

  const updateApiToken = () => {
    setShowApiTokenInput(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-sphaire-dark-lighter rounded-lg p-6">
        <h1 className="text-2xl font-bold text-sphaire-pink-light mb-4">
          🎨 StableMaterials Texture Generator Demo
        </h1>
        <p className="text-gray-300 mb-6">
          Generate professional PBR texture stacks using AI. Create basecolor, normal, roughness, 
          metallic, and height maps from simple text descriptions.
        </p>

        {/* API Token Setup */}
        <div className="mb-6 p-4 bg-sphaire-dark rounded-lg border border-sphaire-purple">
          <h3 className="text-lg font-semibold text-sphaire-pink-light mb-3">🔑 Setup</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Hugging Face API Token:</span>
              <button
                onClick={() => setShowApiTokenInput(!showApiTokenInput)}
                className="px-3 py-1 bg-sphaire-purple text-white text-sm rounded hover:bg-sphaire-pink transition-colors"
              >
                {showApiTokenInput ? 'Hide' : 'Configure'}
              </button>
            </div>
            
            {showApiTokenInput && (
              <div className="flex space-x-2">
                <input
                  type="password"
                  value={apiToken}
                  onChange={(e) => setApiToken(e.target.value)}
                  placeholder="hf_..."
                  className="flex-1 px-3 py-2 bg-sphaire-dark border border-sphaire-purple rounded text-white"
                />
                <button
                  onClick={updateApiToken}
                  className="px-4 py-2 bg-sphaire-pink text-white rounded hover:bg-sphaire-purple transition-colors"
                >
                  Save
                </button>
              </div>
            )}
            
            <p className="text-xs text-gray-400">
              Get your free API token from{' '}
              <a 
                href="https://huggingface.co/settings/tokens" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sphaire-pink-light underline hover:text-sphaire-pink"
              >
                Hugging Face Settings
              </a>
            </p>
          </div>
        </div>

        {/* Quick Examples */}
        <div className="mb-6 p-4 bg-sphaire-dark rounded-lg border border-sphaire-purple">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-sphaire-pink-light">⚡ Quick Examples</h3>
            <button
              onClick={generateExampleTextures}
              disabled={isGenerating}
              className="px-4 py-2 bg-sphaire-purple text-white rounded hover:bg-sphaire-pink transition-colors disabled:opacity-50"
            >
              {isGenerating ? 'Generating...' : 'Generate Random Example'}
            </button>
          </div>
          <div className="text-sm text-gray-400">
            <p>• "rusty metal surface, weathered, seamless, tileable"</p>
            <p>• "polished marble with gold veins, seamless, tileable"</p>
            <p>• "weathered brick wall texture, old, seamless, tileable"</p>
          </div>
        </div>

        {/* Results and Application */}
        {(pbrTextures || simpleTexture) && (
          <div className="mb-6 p-4 bg-sphaire-dark rounded-lg border border-sphaire-purple">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-sphaire-pink-light">🎯 Apply to Mesh</h3>
              <button
                onClick={applyToSelectedMesh}
                className="px-4 py-2 bg-sphaire-pink text-white rounded hover:bg-sphaire-purple transition-colors"
              >
                Apply to Selected Mesh
              </button>
            </div>
            <p className="text-sm text-gray-400">
              {selectedMesh ? 
                `Ready to apply to: ${selectedMesh.name || 'Selected Mesh'}` :
                'Select a mesh in the 3D viewport to apply textures'
              }
            </p>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-500 rounded-lg">
            <div className="flex items-center justify-between">
              <p className="text-red-200">{error}</p>
              <button
                onClick={clearError}
                className="text-red-400 hover:text-red-300"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Texture Generator Component */}
      <TextureGenerator
        onTextureGenerated={handleTextureGenerated}
        onPBRTextureGenerated={handlePBRTextureGenerated}
        scene={scene}
      />

      {/* Usage Instructions */}
      <div className="bg-sphaire-dark-lighter rounded-lg p-6">
        <h3 className="text-lg font-semibold text-sphaire-pink-light mb-4">📚 How to Use</h3>
        <div className="space-y-4 text-gray-300">
          <div className="flex items-start space-x-3">
            <span className="flex-shrink-0 w-6 h-6 bg-sphaire-purple rounded-full flex items-center justify-center text-white text-sm font-bold">1</span>
            <div>
              <p className="font-medium">Set up your API token</p>
              <p className="text-sm text-gray-400">Get a free token from Hugging Face and enter it above</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <span className="flex-shrink-0 w-6 h-6 bg-sphaire-purple rounded-full flex items-center justify-center text-white text-sm font-bold">2</span>
            <div>
              <p className="font-medium">Choose generation mode</p>
              <p className="text-sm text-gray-400">PBR Stack for complete materials, Simple for basic textures</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <span className="flex-shrink-0 w-6 h-6 bg-sphaire-purple rounded-full flex items-center justify-center text-white text-sm font-bold">3</span>
            <div>
              <p className="font-medium">Describe your material</p>
              <p className="text-sm text-gray-400">Be specific: "rusty metal", "polished marble", include "seamless, tileable"</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <span className="flex-shrink-0 w-6 h-6 bg-sphaire-purple rounded-full flex items-center justify-center text-white text-sm font-bold">4</span>
            <div>
              <p className="font-medium">Apply to your 3D models</p>
              <p className="text-sm text-gray-400">Select a mesh and click apply to see realistic PBR materials</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TextureGeneratorDemo;
