import { useState, useEffect, useCallback, useRef } from 'react';
import useVoiceCommand from './useVoiceCommand';
import useStore from '../store/store';
import useSceneStore from '../store/sceneStore';
import { executeModelCode } from '../services/aiExecutor';

// API response types
interface GenerateModelResponse {
  code: string;
  backend: 'OpenCascade' | 'Babylon';
}

interface ErrorResponse {
  error: string;
}

// Hook return interface
interface AICommandHook {
  listening: boolean;
  start: () => void;
  stop: () => void;
  statusMessage: string;
  loading: boolean;
}

/**
 * Hook to handle voice commands that trigger AI model generation
 * This orchestrates the flow from voice input → AI generation → scene updates
 */
const useAICommands = (): AICommandHook => {
  // Get voice recognition capabilities from useVoiceCommand
  const { 
    isSupported, 
    listening, 
    transcript, 
    startListening, 
    stopListening, 
    clearTranscript,
    statusMessage: voiceStatusMessage
  } = useVoiceCommand();
  
  // Get store actions
  const { addShape } = useStore();
  const { scene } = useSceneStore();
  
  // Local state
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('Ready for voice commands');
  const lastTranscriptRef = useRef<string>('');
  const processingRef = useRef<boolean>(false);

  /**
   * Call the secure API to generate model code from transcript
   */
  const generateModelFromTranscript = useCallback(async (transcript: string): Promise<GenerateModelResponse> => {
    const response = await fetch('/api/generateModel', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ spec: transcript }),
    });

    if (!response.ok) {
      const errorData: ErrorResponse = await response.json();
      throw new Error(errorData.error || `API request failed with status ${response.status}`);
    }

    const data: GenerateModelResponse = await response.json();
    return data;
  }, []);

  /**
   * Execute the AI-generated code and create meshes in the scene
   */
  const executeAndAddToScene = useCallback(async (code: string, backend: 'OpenCascade' | 'Babylon') => {
    try {
      setStatusMessage('Executing generated code...');
      
      // Execute the model code with scene context
      const shapeId = await executeModelCode(code, backend, { scene });
      
      // DISABLED: useAICommands addShape call causing mesh sync interference
      // Create a shape entry for the store
      // Note: The executeModelCode function should handle the actual mesh creation
      // This is just to track the shape in our store
      // addShape({
      //   type: 'custom',
      //   position: { x: 0, y: 0, z: 0 },
      //   rotation: { x: 0, y: 0, z: 0 },
      //   scaling: { x: 1, y: 1, z: 1 },
      //   name: `AI Generated Model ${new Date().toLocaleTimeString()}`,
      //   color: '#8B5CF6' // Purple theme color
      // });
      console.log('DISABLED: useAICommands addShape call to prevent mesh sync interference');

      setStatusMessage('Model created successfully!');
      
      // Reset status after a delay
      setTimeout(() => {
        setStatusMessage('Ready for voice commands');
      }, 3000);
      
      return shapeId;
    } catch (error) {
      console.error('Error executing model code:', error);
      throw error;
    }
  }, [addShape, scene]);

  /**
   * Process the final transcript to generate and execute AI model
   */
  const processTranscript = useCallback(async (transcript: string) => {
    if (processingRef.current || !transcript.trim()) {
      return;
    }

    try {
      processingRef.current = true;
      setLoading(true);
      setStatusMessage('Generating model...');

      console.log('Processing transcript:', transcript);

      // Step 1: Generate model code from transcript
      const modelData = await generateModelFromTranscript(transcript);
      console.log('Generated model data:', modelData);

      setStatusMessage('Applying generated model...');

      // Step 2: Execute the code and add to scene
      await executeAndAddToScene(modelData.code, modelData.backend);

      // Clear the transcript after successful processing
      clearTranscript();

    } catch (error) {
      console.error('Error processing AI command:', error);
      setStatusMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
      
      // Reset error message after a delay
      setTimeout(() => {
        setStatusMessage('Ready for voice commands');
      }, 5000);
    } finally {
      setLoading(false);
      processingRef.current = false;
    }
  }, [generateModelFromTranscript, executeAndAddToScene, clearTranscript]);

  /**
   * Effect to handle transcript changes
   * Only process when we have a new, non-empty transcript
   */
  useEffect(() => {
    if (transcript && 
        transcript.trim() !== '' && 
        transcript !== lastTranscriptRef.current &&
        !loading &&
        !processingRef.current) {
      
      lastTranscriptRef.current = transcript;
      
      // Add a small delay to ensure transcript is final
      const timeoutId = setTimeout(() => {
        processTranscript(transcript);
      }, 1000);

      return () => clearTimeout(timeoutId);
    }
    
    // Return undefined for other code paths
    return undefined;
  }, [transcript, loading, processTranscript]);

  /**
   * Update status message based on voice command status
   */
  useEffect(() => {
    if (!loading && !processingRef.current) {
      if (listening) {
        setStatusMessage('Listening for voice commands...');
      } else if (voiceStatusMessage && voiceStatusMessage !== 'Ready for voice commands') {
        setStatusMessage(voiceStatusMessage);
      } else {
        setStatusMessage('Ready for voice commands');
      }
    }
  }, [listening, voiceStatusMessage, loading]);

  /**
   * Start listening for voice commands
   */
  const start = useCallback(() => {
    if (!isSupported) {
      setStatusMessage('Voice recognition not supported in this browser');
      return;
    }

    if (loading) {
      setStatusMessage('Please wait for current operation to complete');
      return;
    }

    startListening();
  }, [isSupported, loading, startListening]);

  /**
   * Stop listening for voice commands
   */
  const stop = useCallback(() => {
    stopListening();
    processingRef.current = false;
  }, [stopListening]);

  return {
    listening,
    start,
    stop,
    statusMessage,
    loading
  };
};

export default useAICommands;
