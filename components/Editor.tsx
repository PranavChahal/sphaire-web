import React, { useState, useRef, useImperativeHandle, forwardRef } from 'react';
import Editor from '@monaco-editor/react';
import useStore from '../store/store';

// Export ref interface for external control
export interface EditorRef {
  setContent: (content: string) => void;
  getContent: () => string;
  executeCode: () => void;
}

const CodeEditor = forwardRef<EditorRef>((_, ref) => {
  const [editorContent, setEditorContent] = useState<string>(
    '// Write your Babylon.js code here to create shapes\n' +
    '// Example:\n' +
    '// createBox({ position: [0, 1, 0], scaling: [1, 1, 1], color: "#ff00ff" });\n' +
    '// createSphere({ position: [2, 1, 0], diameter: 1.5, color: "#00ffff" });\n' +
    '\n// AI-generated code will appear here automatically when you use the AI model generator'
  );
  
  const editorRef = useRef<any>(null);
  const store = useStore();
  
  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    setContent: (content: string) => {
      setEditorContent(content);
      if (editorRef.current) {
        editorRef.current.setValue(content);
      }
    },
    getContent: () => {
      return editorRef.current ? editorRef.current.getValue() : editorContent;
    },
    executeCode: () => {
      executeCode();
    }
  }));
  
  // Function to handle editor mount
  const handleEditorDidMount = (editor: any, _monaco: any) => {
    editorRef.current = editor;
    console.log('Editor mounted successfully');
  };

  // Function to handle editor changes
  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setEditorContent(value);
    }
  };

  // Function to execute the code in the editor
  const executeCode = () => {
    if (!editorRef.current) return;
    
    const code = editorRef.current.getValue();
    console.log('Executing code:', code);
    
    try {
      // Create a function context with store functions
      const createBox = (options: any) => {
        const { position = [0, 0, 0], scaling = [1, 1, 1], color = "#ffffff" } = options;
        return store.addShape({
          type: 'box',
          position: { x: position[0], y: position[1], z: position[2] },
          rotation: { x: 0, y: 0, z: 0 },
          scaling: { x: scaling[0], y: scaling[1], z: scaling[2] },
          color: color
        });
      };
      
      const createSphere = (options: any) => {
        const { position = [0, 0, 0], diameter = 1, color = "#ffffff" } = options;
        return store.addShape({
          type: 'sphere',
          position: { x: position[0], y: position[1], z: position[2] },
          rotation: { x: 0, y: 0, z: 0 },
          scaling: { x: diameter, y: diameter, z: diameter },
          color: color
        });
      };
      
      const createCylinder = (options: any) => {
        const { position = [0, 0, 0], diameter = 1, height = 2, color = "#ffffff" } = options;
        return store.addShape({
          type: 'cylinder',
          position: { x: position[0], y: position[1], z: position[2] },
          rotation: { x: 0, y: 0, z: 0 },
          scaling: { x: diameter, y: height, z: diameter },
          color: color
        });
      };
      
      // Execute user code with available functions
      const executeUserCode = new Function(
        'createBox', 'createSphere', 'createCylinder', 
        `"use strict";\n try { ${code} } catch(e) { console.error('Code execution error:', e); }`
      );
      
      executeUserCode(createBox, createSphere, createCylinder);
      
    } catch (error) {
      console.error('Error executing code:', error);
    }
  };

  return (
    <div className="h-full flex flex-col bg-sphaire-dark-lighter">
      <div className="flex items-center justify-between p-2 bg-sphaire-dark border-b border-sphaire-purple-light border-opacity-30">
        <h3 className="text-sm font-medium text-sphaire-purple-light">Code Editor</h3>
        <button
          onClick={executeCode}
          className="bg-sphaire-pink hover:bg-sphaire-pink-light text-white px-3 py-1 rounded text-xs font-medium transition-colors"
        >
          ▶ Run Code
        </button>
      </div>
      <div className="flex-grow">
        <Editor
          height="100%"
          defaultLanguage="javascript"
          value={editorContent}
          theme="vs-dark"
          loading={<div className="h-full w-full flex items-center justify-center text-gray-400">Loading editor...</div>}
          onMount={handleEditorDidMount}
          onChange={handleEditorChange}
          options={{
            minimap: { enabled: true },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            fontSize: 14
          }}
        />
      </div>
    </div>
  );
});

export default CodeEditor;
