import React, { useState } from 'react';
import { generateModelCode } from '../services/aiModelService';
import { executeModelCode } from '../services/aiExecutor';
import useStore from '../store/store';
import useSceneStore from '../store/sceneStore';

interface AIModelGeneratorProps {
  onCodeGenerated?: (code: string, backend: 'OpenCascade' | 'Babylon') => void;
}

const AIModelGenerator: React.FC<AIModelGeneratorProps> = ({ onCodeGenerated }) => {
  const { scene } = useSceneStore();
  const [spec, setSpec] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!spec.trim()) return;

    if (!scene) {
      setError('Scene not ready. Please wait for the 3D environment to load.');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      console.log('🤖 AI-GENERATOR: Starting AI model generation for:', spec);
      
      const result = await generateModelCode(spec);
      console.log('✅ AI-GENERATOR: Generated code length:', result.code.length);
      console.log('📝 AI-GENERATOR: Code preview:', result.code.substring(0, 200) + '...');
      console.log('🔧 AI-GENERATOR: Backend:', result.backend);
      
      if (onCodeGenerated) {
        onCodeGenerated(result.code, result.backend as 'OpenCascade' | 'Babylon');
        return;
      }

      console.log('🎯 AI-GENERATOR: Executing AI-generated code in scene...');
      const shapeId = await executeModelCode(
        result.code, 
        result.backend as 'OpenCascade' | 'Babylon',
        { scene, store: useStore.getState() }
      );
      
      console.log('✅ AI-GENERATOR: Successfully created shape with ID:', shapeId);
      console.log('🏁 AI-GENERATOR: AI model generation completed successfully!');
      
    } catch (err) {
      console.error('🚨 AI-GENERATOR: Error in AI model generation:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-gradient-to-b from-sphaire-dark to-sphaire-purple-dark text-sphaire-purple-light rounded-md shadow-purple-glow-sm p-4">
      <h3 className="text-lg font-medium text-gradient-purple mb-2">AI</h3>
      
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm text-sphaire-purple-light mb-1">
            Describe your 3D model
          </label>
          <textarea
            value={spec}
            onChange={(e) => setSpec(e.target.value)}
            placeholder="Example: Create a red sports car with curved body and black wheels"
            className="w-full bg-sphaire-dark border border-sphaire-purple-light border-opacity-50 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-sphaire-pink-light text-sm resize-none"
            rows={3}
            disabled={isGenerating}
          />
        </div>
        
        <div className="flex items-center justify-between">
          <div className="text-xs text-sphaire-purple-light opacity-75">
            {scene ? '✅ Scene ready' : '⏳ Waiting for scene...'}
          </div>
          <button
            type="submit"
            disabled={isGenerating || !spec.trim() || !scene}
            className="bg-sphaire-pink hover:bg-sphaire-pink-light disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded text-sm font-medium transition-colors flex items-center gap-2"
          >
            {isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Generating...
              </>
            ) : (
              <>
                🤖 Generate Model
              </>
            )}
          </button>
        </div>
        
        {isGenerating && (
          <div className="text-xs text-sphaire-purple-light animate-pulse">
            <span className="text-gray-300 text-sm">AI is creating your 3D model...</span>
          </div>
        )}
      </form>

      {error && (
        <div className="mt-4 p-3 bg-red-900/30 border border-red-500 rounded-md text-red-200 text-sm">
          {error}
        </div>
      )}

      <div className="mt-4 text-xs text-gray-400">
        <p>Hint: Be specific about dimensions, shapes, and features.</p>
        <p className="mt-1">Example: "Create a 50mm tall vase with a 30mm base diameter and a wavy rim."</p>
      </div>
    </div>
  );
};

export default AIModelGenerator;
