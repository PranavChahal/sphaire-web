import React, { useState, useCallback } from 'react';
import useStore from '../store/store';
import { generateTexture, applyTextureToMesh } from '../services/textureService';

/**
 * TexturePanel component for AI-powered texture generation and application
 * Provides a complete workflow for creating and applying textures to 3D objects
 */
const TexturePanel: React.FC = () => {
  // Local state for UI management
  const [prompt, setPrompt] = useState<string>('');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isApplying, setIsApplying] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [error, setError] = useState<string>('');

  // Get store state and actions
  const { selectedShapeId, shapes } = useStore();

  // Get the selected shape and its mesh
  const selectedShape = selectedShapeId ? shapes.find(shape => shape.id === selectedShapeId) : null;
  const selectedMesh = selectedShape?.babylonMesh;

  /**
   * Handle texture generation from prompt
   */
  const handleGenerateTexture = useCallback(async () => {
    if (!prompt.trim()) {
      setError('Please enter a texture description');
      return;
    }

    setIsGenerating(true);
    setError('');
    setStatusMessage('Generating texture...');

    try {
      const textureUrl = await generateTexture(prompt);
      setImageUrl(textureUrl);
      setStatusMessage('Texture generated successfully!');
      
      // Clear status message after 3 seconds
      setTimeout(() => setStatusMessage(''), 3000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate texture';
      setError(errorMessage);
      setStatusMessage('');
    } finally {
      setIsGenerating(false);
    }
  }, [prompt]);

  /**
   * Handle applying texture to selected mesh
   */
  const handleApplyTexture = useCallback(async () => {
    if (!imageUrl) {
      setError('Please generate a texture first');
      return;
    }

    if (!selectedMesh) {
      setError('Please select a 3D object to apply the texture to');
      return;
    }

    setIsApplying(true);
    setError('');
    setStatusMessage('Applying texture...');

    try {
      await applyTextureToMesh(selectedMesh, imageUrl);
      setStatusMessage('Texture applied successfully!');
      
      // Clear status message after 3 seconds
      setTimeout(() => setStatusMessage(''), 3000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to apply texture';
      setError(errorMessage);
      setStatusMessage('');
    } finally {
      setIsApplying(false);
    }
  }, [imageUrl, selectedMesh]);

  /**
   * Handle Enter key press in textarea
   */
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleGenerateTexture();
    }
  };

  return (
    <div className="bg-sphaire-dark-lighter rounded-lg p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-sphaire-pink-light">
          AI Texture Generator
        </h2>
        <div className="text-sm text-gray-400">
          {selectedShape ? `Selected: ${selectedShape.name || selectedShape.type}` : 'No object selected'}
        </div>
      </div>

      {/* Texture Prompt Input */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-300">
          Texture Description
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Describe the texture you want to generate (e.g., 'rusty metal with scratches', 'smooth marble with veins', 'wood grain texture')"
          className="w-full h-20 px-3 py-2 bg-sphaire-dark border border-sphaire-purple rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sphaire-pink-light focus:border-transparent resize-none"
          disabled={isGenerating}
        />
        <div className="text-xs text-gray-400">
          Press Enter to generate, Shift+Enter for new line
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={handleGenerateTexture}
          disabled={isGenerating || !prompt.trim()}
          className="flex-1 bg-sphaire-purple hover:bg-sphaire-purple-light disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-md transition-colors duration-200 flex items-center justify-center gap-2"
        >
          {isGenerating ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Generating...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Generate Texture
            </>
          )}
        </button>

        <button
          onClick={handleApplyTexture}
          disabled={isApplying || !imageUrl || !selectedMesh}
          className="flex-1 bg-sphaire-pink hover:bg-sphaire-pink-light disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-md transition-colors duration-200 flex items-center justify-center gap-2"
        >
          {isApplying ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Applying...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
              Apply to Selected
            </>
          )}
        </button>
      </div>

      {/* Status Messages */}
      {statusMessage && (
        <div className="bg-green-900/20 border border-green-500/30 text-green-400 px-4 py-2 rounded-md">
          {statusMessage}
        </div>
      )}

      {error && (
        <div className="bg-red-900/20 border border-red-500/30 text-red-400 px-4 py-2 rounded-md">
          {error}
        </div>
      )}

      {/* Texture Preview */}
      {imageUrl && (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-sphaire-purple-light">
            Generated Texture Preview
          </h3>
          <div className="relative bg-sphaire-dark border border-sphaire-purple rounded-md overflow-hidden">
            <img
              src={imageUrl}
              alt="Generated texture preview"
              className="w-full h-64 object-cover"
              onError={() => setError('Failed to load generated texture image')}
            />
            
            {/* Overlay with texture info */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-300">
                  Generated from: "{prompt}"
                </div>
                <a
                  href={imageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sphaire-pink-light hover:text-sphaire-pink text-sm underline"
                >
                  View Full Size
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Help Text */}
      <div className="text-xs text-gray-400 space-y-1">
        <p><strong>Tips:</strong></p>
        <ul className="list-disc list-inside space-y-1 ml-4">
          <li>Be specific about materials (metal, wood, fabric, stone)</li>
          <li>Include surface details (smooth, rough, scratched, polished)</li>
          <li>Mention colors or patterns for better results</li>
          <li>Select a 3D object before applying the texture</li>
        </ul>
      </div>
    </div>
  );
};

export default TexturePanel;
