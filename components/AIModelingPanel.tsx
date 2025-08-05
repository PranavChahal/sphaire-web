import React, { useState, useRef, useCallback } from 'react';
import { useAIModeling, AIModelRequest } from '../hooks/useAIModeling';
import useStore from '../store/store';
import type { Scene } from '@babylonjs/core';

interface CustomDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string; description?: string }>;
  className?: string;
}

const CustomDropdown: React.FC<CustomDropdownProps> = ({ value, onChange, options, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(opt => opt.value === value);
  
  return (
    <div className={`relative ${className}`}>
      <button
        className="w-full bg-sphaire-dark border border-sphaire-purple-light/50 rounded px-3 py-2 text-left text-xs text-sphaire-purple-light hover:border-sphaire-pink-light/50 focus:outline-none focus:ring-1 focus:ring-sphaire-pink-light transition-colors flex items-center justify-between"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="truncate">{selectedOption?.label || 'Select...'}</span>
        <svg className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          
          {/* Dropdown */}
          <div className="absolute top-full left-0 right-0 mt-1 bg-sphaire-dark border border-sphaire-purple-light/50 rounded shadow-lg z-20 max-h-40 overflow-y-auto">
            {options.map((option) => (
              <button
                key={option.value}
                className={`w-full px-3 py-2 text-left text-xs hover:bg-sphaire-purple-dark/50 transition-colors border-b border-sphaire-purple-light/20 last:border-b-0 ${
                  option.value === value ? 'bg-sphaire-purple-dark/30 text-sphaire-pink-light' : 'text-sphaire-purple-light'
                }`}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
              >
                <div className="font-medium">{option.label}</div>
                {option.description && (
                  <div className="text-[10px] text-sphaire-purple-light/70 mt-0.5">{option.description}</div>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

interface AIModelingPanelProps {
  scene: Scene | null;
  onModelCreated?: (meshes: any[]) => void;
  className?: string;
}

const AIModelingPanel: React.FC<AIModelingPanelProps> = ({
  scene,
  onModelCreated,
  className = ''
}) => {
  const {
    isGenerating,
    isExecuting,
    lastResponse,
    error,
    generateAndExecute,
    clearError,
  } = useAIModeling();
  
  // Get store functions for unified architecture
  const { addShape } = useStore();

  const [prompt, setPrompt] = useState('');
  const [backend, setBackend] = useState<'babylon' | 'opencascade' | 'auto'>('auto');
  const [complexity, setComplexity] = useState<'simple' | 'medium' | 'complex'>('medium');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /**
   * Handle AI model generation
   */
  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      alert('Please enter a model description');
      return;
    }

    if (!scene) {
      alert('Scene not ready. Please wait for the viewport to initialize.');
      return;
    }

    try {
      clearError();
      
      const request: AIModelRequest = {
        prompt: prompt.trim(),
        backend,
        complexity
      };

      console.log('🤖 AI-MODELING: Starting generation...', request);
      
      const createdMeshes = await generateAndExecute(request, scene);
      
      // 🚨 CRITICAL FIX: Add AI-generated meshes to unified store for persistence
      if (createdMeshes && createdMeshes.length > 0) {
        // Add each AI-generated mesh to the unified store as a CustomShape
        createdMeshes.forEach(mesh => {
          // Extract mesh geometry data for store persistence
          const positions = mesh.getVerticesData('position');
          const indices = mesh.getIndices();
          const meshData = {
            positions: positions ? new Float32Array(positions) : new Float32Array(),
            indices: indices ? new Uint32Array(indices) : new Uint32Array()
          };
          
          // Create CustomShape entry for unified store
          const customShape = {
            type: 'custom' as const,
            position: {
              x: mesh.position.x,
              y: mesh.position.y,
              z: mesh.position.z
            },
            rotation: {
              x: mesh.rotation.x,
              y: mesh.rotation.y,
              z: mesh.rotation.z
            },
            scaling: {
              x: mesh.scaling.x,
              y: mesh.scaling.y,
              z: mesh.scaling.z
            },
            color: mesh.material ? (mesh.material as any).diffuseColor?.toHexString() : '#ffffff',
            meshData: meshData,
            name: mesh.name || `AI Model ${Date.now()}`,
            // Store AI generation metadata
            metadata: {
              source: 'ai-generated',
              prompt: request.prompt,
              backend: request.backend,
              createdAt: new Date().toISOString()
            }
          };
          
          // Add to unified store for persistence
          addShape(customShape);
          
          console.log(`✅ AI-MODELING: Added AI-generated mesh '${mesh.name}' to unified store for persistence`);
        });
        
        console.log(`🚨 CRITICAL FIX: Added ${createdMeshes.length} AI-generated meshes to store - they will now persist through save/load!`);
      }
      
      // Notify parent component
      if (onModelCreated) {
        onModelCreated(createdMeshes);
      }
      
      // Clear prompt on success
      setPrompt('');
      
      console.log(`✅ AI-MODELING: Successfully created ${createdMeshes.length} mesh(es)`);
      
    } catch (error) {
      console.error('🚨 AI-MODELING: Generation failed:', error);
    }
  }, [prompt, backend, complexity, scene, generateAndExecute, clearError, onModelCreated]);

  /**
   * Handle example prompts
   */
  const handleExamplePrompt = useCallback((examplePrompt: string) => {
    setPrompt(examplePrompt);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  /**
   * Handle keyboard shortcuts
   */
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleGenerate();
    }
  }, [handleGenerate]);

  const isProcessing = isGenerating || isExecuting;

  return (
    <div className={`bg-gradient-to-b from-sphaire-dark to-sphaire-purple-dark text-sphaire-purple-light h-full flex flex-col rounded-md shadow-purple-glow-sm ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-sphaire-purple-light/20 flex-shrink-0">
        <h3 className="text-lg font-bold text-gradient-purple mb-2 tracking-wide">
          AI Modelling
        </h3>
        <div className="text-xs text-sphaire-purple-light opacity-75">
          {isProcessing && (
            <div className="flex items-center space-x-2 text-yellow-400">
              <div className="w-3 h-3 border border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
              <span>{isGenerating ? 'Generating...' : 'Creating...'}</span>
            </div>
          )}
          {!isProcessing && lastResponse && (
            <div className="text-green-400">
              ✅ Model generated ({lastResponse.executionTime}ms)
            </div>
          )}
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Error Display */}
        {error && (
          <div className="mx-4 mt-4 p-3 bg-red-900/30 border border-red-500 rounded-md text-red-200 text-sm flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
            <button 
              className="text-red-400 hover:text-red-200 p-1 rounded hover:bg-red-800/30 transition-colors"
              onClick={clearError}
              title="Dismiss error"
            >
              ×
            </button>
          </div>
        )}

        {/* Main Input */}
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm text-sphaire-purple-light mb-2">
              Describe your 3D model:
            </label>
            <textarea
              ref={textareaRef}
              className="w-full h-32 bg-sphaire-dark border border-sphaire-purple-light border-opacity-50 rounded px-3 py-2 text-sphaire-purple-light text-sm placeholder-sphaire-purple-light/50 focus:outline-none focus:ring-1 focus:ring-sphaire-pink-light resize-none"
              placeholder="e.g., Create a red sports car with smooth curves and black wheels"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isProcessing}
            />
            <div className="text-xs text-sphaire-purple-light/75 mt-2">
              💡 Press Cmd/Ctrl + Enter to generate
            </div>
          </div>

          {/* Generate Button */}
          <button
            className="w-full bg-sphaire-pink hover:bg-sphaire-pink-light disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-3 rounded text-sm font-medium transition-colors flex items-center justify-center gap-2"
            onClick={handleGenerate}
            disabled={isProcessing || !prompt.trim() || !scene}
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                {isGenerating ? 'Generating Code...' : 'Creating Model...'}
              </>
            ) : (
              <>✨ Generate 3D Model</>
            )}
          </button>
        </div>

        {/* Quick Examples */}
        <div className="px-4 pb-4 border-t border-sphaire-purple-light/20 pt-4">
          <label className="block text-sm text-sphaire-purple-light mb-3">Quick Examples:</label>
          <div className="grid grid-cols-2 gap-2">
            {EXAMPLE_PROMPTS.map((example, index) => (
              <button
                key={index}
                className="p-2 text-xs bg-sphaire-dark border border-sphaire-purple-light/30 rounded hover:border-sphaire-pink-light/50 hover:text-sphaire-pink-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left"
                onClick={() => handleExamplePrompt(example.prompt)}
                disabled={isProcessing}
                title={example.description}
              >
                <span className="block">{example.icon} {example.title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Advanced Settings */}
        <div className="border-t border-sphaire-purple-light/20 px-4 py-4">
          <button
            className="w-full text-left text-sm text-sphaire-purple-light hover:text-sphaire-pink-light transition-colors flex items-center justify-between mb-3"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            ⚙️ Advanced Settings
            <span>{showAdvanced ? '▼' : '▶'}</span>
          </button>

          {showAdvanced && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-sphaire-purple-light mb-1">Backend:</label>
                <CustomDropdown
                  value={backend}
                  onChange={(value) => setBackend(value as 'babylon' | 'opencascade' | 'auto')}
                  options={[
                    { value: 'auto', label: '🔄 Auto (Recommended)', description: 'Let AI choose the best backend' },
                    { value: 'babylon', label: '🎮 Babylon.js (Fast)', description: 'Quick generation, great for basic shapes' },
                    { value: 'opencascade', label: '🔧 OpenCascade (Precise)', description: 'CAD-quality precision, complex geometries' }
                  ]}
                />
              </div>

              <div>
                <label className="block text-xs text-sphaire-purple-light mb-1">Complexity:</label>
                <CustomDropdown
                  value={complexity}
                  onChange={(value) => setComplexity(value as 'simple' | 'medium' | 'complex')}
                  options={[
                    { value: 'simple', label: '🟢 Simple', description: 'Simple shapes, faster generation' },
                    { value: 'medium', label: '🟡 Medium', description: 'Balanced detail and speed' },
                    { value: 'complex', label: '🔴 Complex', description: 'Complex details, slower generation' }
                  ]}
                />
              </div>
            </div>
          )}
        </div>

        {/* Tips */}
        <div className="border-t border-sphaire-purple-light/20 px-4 py-4">
          <div className="text-sm text-sphaire-purple-light mb-2">💡 Tips:</div>
          <ul className="text-xs text-sphaire-purple-light/75 space-y-1">
            <li>• Be specific about colors, sizes, and shapes</li>
            <li>• Use descriptive adjectives (smooth, angular, metallic)</li>
            <li>• Mention positioning if needed (e.g., "at the center")</li>
            <li>• Try both simple and complex descriptions</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

/**
 * Example prompts for quick generation
 */
const EXAMPLE_PROMPTS = [
  {
    icon: '🏠',
    title: 'House',
    prompt: 'Create a simple house with a red roof and white walls',
    description: 'Basic architectural structure'
  },
  {
    icon: '🚗',
    title: 'Car',
    prompt: 'Generate a blue sports car with curved body',
    description: 'Vehicle with smooth design'
  },
  {
    icon: '🌳',
    title: 'Tree',
    prompt: 'Make a green tree with brown trunk and leafy crown',
    description: 'Natural organic shape'
  },
  {
    icon: '⚙️',
    title: 'Gear',
    prompt: 'Create a metallic gear with 12 teeth',
    description: 'Mechanical precision part'
  },
  {
    icon: '💎',
    title: 'Crystal',
    prompt: 'Generate a transparent crystal with sharp facets',
    description: 'Geometric crystalline structure'
  },
  {
    icon: '🏰',
    title: 'Castle',
    prompt: 'Build a medieval castle with stone towers and walls',
    description: 'Complex architectural design'
  }
];

export default AIModelingPanel;
