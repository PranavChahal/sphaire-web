import React, { useState, useEffect } from 'react';
import { useVoiceCommand } from '../hooks/useVoiceCommand';
import useStore from '../store/store';
import { parseCommand, CommandResult } from '../utils/commandParser';

const VoiceModule: React.FC = () => {
  const { 
    isSupported, 
    listening, 
    transcript, 
    error, 
    startListening, 
    stopListening, 
    clearTranscript 
  } = useVoiceCommand();
  
  const [processingResult, setProcessingResult] = useState<string>('');
  const [parsedCommand, setParsedCommand] = useState<CommandResult | null>(null);
  
 
  const addShape = useStore((state: any) => state.addShape);
  

  const [selectedElements] = useState<number[]>([]);
  // Selection mode and scene ref removed - not currently used
  
  // AI commands integration removed - not currently used in voice module
  // const { listening: aiListening, start: startAI, stop: stopAI, statusMessage: aiStatus } = useAICommands();
  
  // Process voice commands using command parser
  const processCommand = () => {
    if (!transcript) return;
    
    const command = parseCommand(transcript);
    setParsedCommand(command);
    
    let result = 'Command not recognized';
    
    const store = useStore.getState();
    const selectedShape = store.shapes.find(shape => shape.id === store.selectedShapeId);
    
    console.log('Processing voice command:', command);
    
    if (command) {
      switch (command.action) {
        case 'create':
          if (command.object === 'sphere') {
            const radius = command.params.radius as number || 1;
            result = `Creating sphere${command.params.radius ? ` with radius ${command.params.radius}` : ''}...`;
            
            const scaling = { 
              x: radius || 1, 
              y: radius || 1, 
              z: radius || 1 
            };
            
            addShape({ 
              type: 'sphere',
              radius,
              scaling,
              position: { x: 0, y: 1, z: 0 },
              color: '#ff00ff'
            });
          } else if (command.object === 'cube' || command.object === 'box') {
            const dimensions = command.params.width ? 
              { width: command.params.width as number, height: command.params.height as number, depth: command.params.depth as number } :
              { width: 1, height: 1, depth: 1 };
            result = `Creating box with dimensions ${dimensions.width}x${dimensions.height}x${dimensions.depth}...`;
            
            const scaling = { 
              x: dimensions.width || 1, 
              y: dimensions.height || 1, 
              z: dimensions.depth || 1 
            };
            
            addShape({ 
              type: 'box',
              dimensions,
              scaling,
              position: { x: 0, y: 1, z: 0 },
              color: '#ff00ff'
            });
          } else if (command.object === 'cylinder') {
            const radius = command.params.radius as number || 0.5;
            const height = command.params.height as number || 2;
            result = `Creating cylinder${command.params.radius ? ` with radius ${command.params.radius}` : ''}...`;
            
            const scaling = { 
              x: radius || 1, 
              y: height || 2, 
              z: radius || 1 
            };
            
            addShape({ 
              type: 'cylinder',
              radius,
              height,
              scaling, // Use the defensive scaling object
              position: { x: 0, y: 1, z: 0 },
              color: '#ff00ff'
            });
          } else if (command.object === 'collection') {
            result = 'Creating a collection of basic shapes...';
            // Create a grid of basic shapes
            const shapes = Array.isArray(command.params.shapes) ? 
              command.params.shapes.map(shape => String(shape)) : 
              ['cube', 'sphere', 'cylinder', 'cone'];
            const spacing = 2.5;
            
            shapes.forEach((shape, index) => {
              const position = { 
                x: (index % 2) * spacing, 
                y: 0, 
                z: Math.floor(index / 2) * spacing 
              };
              
              if (shape === 'cube') {
                addShape({ 
                  type: 'box',
                  position,
                  dimensions: { width: 1, height: 1, depth: 1 }
                });
              } else if (shape === 'sphere') {
                addShape({ 
                  type: 'sphere',
                  position,
                  radius: 0.75
                });
              } else if (shape === 'cylinder') {
                addShape({ 
                  type: 'cylinder',
                  position,
                  radius: 0.5,
                  height: 1.5
                });
              } else if (shape === 'cone') {
                // If you support cone in your application
                addShape({
                  type: 'cylinder', // Using cylinder as placeholder for cone
                  position,
                  radius: 0.5,
                  height: 1.5,
                  material: 'cone' // Tag it as cone for future reference
                });
              }
            });
          }
          break;
          
        case 'move':
          if (command.object && command.params.axis && command.params.distance) {
            const direction: {x?: number, y?: number, z?: number} = {};
            const axis = command.params.axis as string;
            const distance = command.params.distance as number;
            
            direction[axis as 'x' | 'y' | 'z'] = distance;
            result = `Moving ${command.object} ${distance} units along ${axis} axis...`;
            // Example implementation would need shape selection logic
          }
          break;
          
        case 'rotate':
          if (command.object && command.params.axis && command.params.degrees) {
            result = `Rotating ${command.object} ${command.params.degrees} degrees around ${command.params.axis} axis...`;
            // Example implementation would need shape selection logic
          }
          break;
          
        case 'scale':
          if (command.object && command.params.factor) {
            result = `Scaling ${command.object} by factor of ${command.params.factor}...`;
            // Implementation would depend on your scaling mechanism
          }
          break;
          
        case 'extrude':
          if (selectedShape && selectedShape.babylonMesh && selectedElements.length > 0) {
            const distance = command.params.distance as number || 1.0;
            const axis = command.params.axis as string || 'y';
            
            // Direction vector logic removed - not used without extrusion implementation
            // TODO: Restore direction vector when extrusion is implemented
            
            result = `Extruding ${selectedElements.length} elements by ${distance} units along ${axis} axis...`;
            
            // TODO: Implement extrusion functionality
            // extrudeElements(selectedShape.babylonMesh, selectedElements, distance);
            console.log('Extrusion not yet implemented');
          } else {
            result = 'No shape or elements selected for extrusion';
          }
          break;
          
        case 'bevel':
          if (selectedShape && selectedShape.babylonMesh && selectedElements.length > 0) {
            const amount = command.params.amount as number || 0.1;
            
            result = `Beveling ${selectedElements.length} elements by ${amount}...`;
            
            // TODO: Implement beveling functionality
            // bevelElements(selectedShape.babylonMesh, selectedElements, amount);
            console.log('Beveling not yet implemented');
          } else {
            result = 'No shape or elements selected for beveling';
          }
          break;
          
        case 'modeSwitch':
          const mode = command.params.mode as string;
          result = `Switching to ${mode} mode...`;
          // Implementation would depend on your mode switching mechanism
          break;
          
        default:
          result = 'Command recognized but not implemented yet';
      }
    }
    
    setProcessingResult(result);
    clearTranscript();
    
    // Clear result message after 3 seconds
    setTimeout(() => {
      setProcessingResult('');
      setParsedCommand(null);
    }, 3000);
  };
  
  // Automatically process command when transcript changes
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    
    if (transcript && !listening) {
      timeout = setTimeout(() => {
        processCommand();
      }, 500); // Process sooner to be more responsive
    }
    
    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [transcript, listening]);

  return (
    <div className="h-full bg-sphaire-dark flex flex-col overflow-hidden">
      <div className="p-4 overflow-y-auto flex-1 scrollbar-thin">
        <h3 className="text-lg font-medium text-gradient mb-4">Voice Commands</h3>
        
        {!isSupported ? (
          <div className="card glass p-4 border border-sphaire-purple-light">
            <div className="text-sphaire-pink-light flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Speech recognition not supported in this browser.
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <button 
              onClick={listening ? stopListening : startListening}
              className={`btn shadow-md w-full flex items-center justify-center ${listening ? 'shadow-neon-pink text-sphaire-pink-light animate-pulse' : 'text-sphaire-purple-light hover:text-sphaire-pink-light'}`}
            >
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 01-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
              </svg>
              {listening ? 'Listening... Click to Stop' : 'Start Voice Input'}
            </button>
            
            {error && (
              <div className="text-red-400 text-sm card glass p-2">
                {error}
              </div>
            )}
            
            {transcript && (
              <div className="card glass p-3 border border-sphaire-purple-light">
                <p className="text-sphaire-pink-light text-sm mb-2">Recognized text:</p>
                <p className="text-white">{transcript}</p>
                <div className="flex justify-end mt-2">
                  <button 
                    onClick={processCommand}
                    className="btn-primary text-sm py-1 px-3 hover:shadow-neon-pink"
                  >
                    Process Command
                  </button>
                </div>
              </div>
            )}
            
            {processingResult && (
              <div className="card glass p-3 border border-sphaire-pink-light animate-fade-in">
                <p className="text-sphaire-pink-light">⚙️ {processingResult}</p>
                {parsedCommand && (
                  <div className="mt-2 pt-2 border-t border-sphaire-purple-light/30 text-xs">
                    <p className="text-sphaire-purple-light mb-1">Parsed command:</p>
                    <pre className="bg-black/30 p-2 rounded overflow-auto max-h-32 text-white/70">
                      {JSON.stringify(parsedCommand, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
            
            <div className="card glass p-3 border border-sphaire-purple-light">
              <p className="mb-2 text-sphaire-pink-light text-sm">Try saying:</p>
              <ul className="list-disc pl-4 space-y-1 text-white">
                <li>"Create a sphere with radius 1.5"</li>
                <li>"Add a box"</li>
                <li>"Rotate cube 45 degrees around x"</li>
                <li>"Move sphere by 2 units on z axis"</li>
                <li>"Scale cylinder by 1.5"</li>
                <li>"Basic everyday shapes"</li>
                <li>"Switch to edit mode"</li>
              </ul>
            </div>
          </div>
        )}
      </div>
      <div className="p-2 bg-black bg-opacity-40 border-t border-sphaire-purple-light text-xs text-sphaire-purple-light">
        <p>Status: {listening ? 'Listening...' : 'Ready'}</p>
      </div>
    </div>
  );
};

export default VoiceModule;
