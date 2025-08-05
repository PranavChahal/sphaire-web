import { useState, useEffect, useCallback, useRef } from 'react';

// Native debounce implementation to avoid lodash dependency
const debounce = <T extends (...args: any[]) => void>(func: T, wait: number): T => {
  let timeout: NodeJS.Timeout | null = null;
  return ((...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }) as T;
};

// Define Window interface extension for Speech Recognition
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

// Define window SpeechRecognition interfaces
interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  grammars: any;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onaudioend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onaudiostart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onnomatch: ((this: SpeechRecognition, ev: Event) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onsoundend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onsoundstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onspeechend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onspeechstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

type SpeechRecognitionConstructor = {
  new (): SpeechRecognition;
};

// Define MediaRecorder types
interface MediaRecorderOptions {
  mimeType?: string;
  audioBitsPerSecond?: number;
  videoBitsPerSecond?: number;
  bitsPerSecond?: number;
}

// Define return interface for our hook
interface VoiceCommandHook {
  isSupported: boolean;
  listening: boolean;
  transcript: string;
  error?: string;
  statusMessage: string;
  startListening: () => void;
  stopListening: () => void;
  clearTranscript: () => void;
}

// Define Whisper API response type
interface WhisperResponse {
  text: string;
  error?: string;
}

/**
 * Hook for voice command recognition using Web Speech API with Whisper fallback
 * Provides voice-to-text functionality with proper cleanup and high-fidelity transcription
 */
export const useVoiceCommand = (): VoiceCommandHook => {
  // Reference to the SpeechRecognition instance
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  
  // Reference to the MediaRecorder instance for Whisper fallback
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  // State for the hook
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [listening, setListening] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('');
  const [error, setError] = useState<string | undefined>(undefined);
  const [statusMessage, setStatusMessage] = useState<string>('Ready to listen');
  
  // Previous transcript ref for deduplication
  const prevTranscriptRef = useRef<string>('');
  
  // Initialize and check browser support
  useEffect(() => {
    // Check if the browser supports SpeechRecognition
    const SpeechRecognitionAPI: SpeechRecognitionConstructor | undefined = 
      (window as any).SpeechRecognition || 
      (window as any).webkitSpeechRecognition || 
      undefined;
    
    if (SpeechRecognitionAPI) {
      setIsSupported(true);
      
      // Create the recognition instance
      const recognition = new SpeechRecognitionAPI();
      
      // Configure as required
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.lang = 'en-US';
      recognitionRef.current = recognition;
      
      // Debounced function to update transcript
      const updateTranscriptDebounced = debounce((text: string, isFinal: boolean) => {
        // Filter out duplicate results
        if (prevTranscriptRef.current === text) return;
        
        setTranscript(prev => {
          if (isFinal) {
            // Only add when it's a final transcript to avoid repetition
            prevTranscriptRef.current = text;
            return text;
          }
          return prev;
        });
      }, 300);

      // Setup event handlers
      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = '';
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const transcript = result[0].transcript.trim();
          
          if (result.isFinal) {
            finalTranscript = transcript;
            updateTranscriptDebounced(finalTranscript, true);
          } else {
            interimTranscript = transcript;
            updateTranscriptDebounced(interimTranscript, false);
          }
        }
      };
      
      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (event.error === 'not-allowed') {
          setError('Microphone access denied. Please allow microphone access in your browser settings.');
        } else {
          setError(`Speech recognition error: ${event.error}`);
        }
        setStatusMessage('Error occurred');
        setListening(false);
      };
      
      recognition.onend = () => {
        setListening(false);
        
        // Start recording for Whisper fallback if we have something in the transcript
        if (transcript) {
          startWhisperFallbackRecording();
        }
      };
      
      recognition.onstart = () => {
        setStatusMessage('Listening...');
      };
    } else {
      setError('Speech recognition is not supported in this browser');
      setIsSupported(false);
      setStatusMessage('Browser not supported');
    }
    
    // Initialize MediaRecorder for Whisper fallback
    const initMediaRecorder = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const options: MediaRecorderOptions = { 
          mimeType: 'audio/webm',
          audioBitsPerSecond: 128000 
        };
        
        const recorder = new MediaRecorder(stream, options);
        
        recorder.ondataavailable = (e: BlobEvent) => {
          if (e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };
        
        recorder.onstop = async () => {
          if (audioChunksRef.current.length === 0) return;
          
          setStatusMessage('Transcribing with Whisper...');
          
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          audioChunksRef.current = [];
          
          await sendToWhisperAPI(audioBlob);
          
          // Release the media stream
          stream.getTracks().forEach(track => track.stop());
        };
        
        mediaRecorderRef.current = recorder;
      } catch (err) {
        if (err instanceof Error) {
          const permissionError = err.name === 'NotAllowedError' || 
                                  err.name === 'PermissionDeniedError' || 
                                  err.message.includes('Permission');
          
          if (permissionError) {
            setError('Microphone access denied. Please allow microphone access in your browser settings.');
          } else {
            setError(`MediaRecorder initialization error: ${err.message}`);
          }
        } else {
          setError('Failed to initialize audio recording');
        }
        setStatusMessage('Error occurred');
      }
    };
    
    initMediaRecorder();
    
    // Cleanup function to abort recognition and media recorder on unmount
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, [transcript]);
  
  /**
   * Starts recording audio for Whisper fallback
   */
  const startWhisperFallbackRecording = useCallback(() => {
    if (!mediaRecorderRef.current) return;
    
    try {
      // Clear previous audio chunks
      audioChunksRef.current = [];
      
      // Start recording for 2-3 seconds
      mediaRecorderRef.current.start();
      
      // Stop recording after 3 seconds
      setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
      }, 3000);
    } catch (err) {
      if (err instanceof Error) {
        setError(`Failed to start audio recording: ${err.message}`);
      }
    }
  }, []);
  
  /**
   * Sends recorded audio to Whisper API via Next.js API route
   */
  const sendToWhisperAPI = async (audioBlob: Blob): Promise<void> => {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`);
      }
      
      const data: WhisperResponse = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      if (data.text && data.text.trim()) {
        // Replace the transcript with the higher-fidelity Whisper result
        setTranscript(data.text.trim());
      }
      
      setStatusMessage('Ready to listen');
    } catch (err) {
      if (err instanceof Error) {
        console.error('Whisper API error:', err);
        // Don't set error state - just log, since we already have a transcript from the browser
      }
      setStatusMessage('Ready to listen');
    }
  };
  
  /**
   * Starts the voice recognition process
   */
  const startListening = useCallback(() => {
    if (!isSupported || !recognitionRef.current) {
      setError('Speech recognition not supported or not initialized');
      return;
    }
    
    // Clear any previous errors and transcript
    setError(undefined);
    clearTranscript();
    prevTranscriptRef.current = '';
    
    try {
      recognitionRef.current.start();
      setListening(true);
    } catch (err) {
      // Handle cases where recognition is already started
      if (err instanceof Error) {
        setError(`Failed to start speech recognition: ${err.message}`);
      } else {
        setError('Failed to start speech recognition');
      }
      setStatusMessage('Error occurred');
      setListening(false);
    }
  }, [isSupported]);
  
  /**
   * Stops the voice recognition process
   */
  const stopListening = useCallback(() => {
    if (!isSupported || !recognitionRef.current) return;
    
    try {
      recognitionRef.current.stop();
      // We don't set listening to false here, as the onend event will do that
    } catch (err) {
      // In case stop fails for some reason
      if (err instanceof Error) {
        setError(`Failed to stop speech recognition: ${err.message}`);
      }
      setStatusMessage('Error occurred');
      setListening(false);
    }
  }, [isSupported]);
  
  /**
   * Clears the current transcript
   */
  const clearTranscript = useCallback(() => {
    setTranscript('');
    prevTranscriptRef.current = '';
  }, []);
  
  return {
    isSupported,
    listening,
    transcript,
    error,
    statusMessage,
    startListening,
    stopListening,
    clearTranscript
  };
};

export default useVoiceCommand;
