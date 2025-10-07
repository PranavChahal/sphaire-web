import React, { useState, useRef, useImperativeHandle, forwardRef, useCallback, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import useStore from '../store/store';
import { useModal } from '../contexts/ModalContext';

// File interface for managing multiple code files
interface CodeFile {
  id: string;
  name: string;
  content: string;
  language: string;
  lastModified: Date;
  isGenerated?: boolean; // Track if this was AI-generated
  generatedBy?: 'babylon' | 'opencascade'; // Track generation backend
}

// Export ref interface for external control
export interface MonacoEditorRef {
  setContent: (content: string) => void;
  getContent: () => string;
  executeCode: () => void;
  addGeneratedFile: (name: string, content: string, backend: 'babylon' | 'opencascade') => void;
  openFile: (fileId: string) => void;
}

const MonacoEditor = forwardRef<MonacoEditorRef>((_, ref) => {
  const editorRef = useRef<any>(null);
  const store = useStore();
  const { showAlert, showConfirm } = useModal();

  // File management state
  const [files, setFiles] = useState<CodeFile[]>([
    {
      id: 'default',
      name: 'main.js',
      content: '// Write your Babylon.js code here to create shapes\n' +
        '// Example:\n' +
        '// createBox({ position: [0, 1, 0], scaling: [1, 1, 1], color: "#ff00ff" });\n' +
        '// createSphere({ position: [2, 1, 0], diameter: 1.5, color: "#00ffff" });\n' +
        '\n// AI-generated code will appear here automatically',
      language: 'javascript',
      lastModified: new Date(),
      isGenerated: false
    }
  ]);
  
  const [activeFileId, setActiveFileId] = useState('default');
  const [showFileList, setShowFileList] = useState(false);

  // Get active file
  const activeFile = files.find(f => f.id === activeFileId) || files[0];

  // Memory-efficient cleanup
  const cleanupClosedFiles = useCallback(() => {
    setFiles(prev => prev.filter(file => 
      file.id === activeFileId || 
      file.isGenerated || 
      file.id === 'default' ||
      file.lastModified > new Date(Date.now() - 5 * 60 * 1000) // Keep files from last 5 minutes only
    ));
  }, [activeFileId]);

  // Cleanup effect to prevent memory leaks
  useEffect(() => {
    // Clean up old files every 30 seconds when component is active
    const cleanup = setInterval(() => {
      cleanupClosedFiles();
    }, 30000);

    // Cleanup on unmount
    return () => {
      clearInterval(cleanup);
      // Dispose Monaco editor instance
      if (editorRef.current) {
        try {
          editorRef.current.dispose();
        } catch (e) {
          console.warn('Monaco editor disposal failed:', e);
        }
      }
    };
  }, [cleanupClosedFiles]);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    setContent: (content: string) => {
      updateFileContent(activeFileId, content);
    },
    getContent: () => {
      return activeFile.content;
    },
    executeCode: () => {
      executeCode();
    },
    addGeneratedFile: (name: string, content: string, backend: 'babylon' | 'opencascade') => {
      const newFile: CodeFile = {
        id: `generated_${Date.now()}`,
        name,
        content,
        language: 'javascript',
        lastModified: new Date(),
        isGenerated: true,
        generatedBy: backend
      };
      
      setFiles(prev => [...prev, newFile]);
      setActiveFileId(newFile.id);
      
      // Cleanup old files for memory efficiency
      setTimeout(cleanupClosedFiles, 100);
    },
    openFile: (fileId: string) => {
      setActiveFileId(fileId);
    }
  }));

  // Update file content
  const updateFileContent = useCallback((fileId: string, content: string) => {
    setFiles(prev => prev.map(file => 
      file.id === fileId 
        ? { ...file, content, lastModified: new Date() }
        : file
    ));
    
    if (editorRef.current && fileId === activeFileId) {
      editorRef.current.setValue(content);
    }
  }, [activeFileId]);

  // Create new file
  const createNewFile = useCallback(() => {
    const fileName = `untitled_${files.length}.js`;
    const newFile: CodeFile = {
      id: `file_${Date.now()}`,
      name: fileName,
      content: '// New JavaScript file\n',
      language: 'javascript',
      lastModified: new Date(),
      isGenerated: false
    };
    
    setFiles(prev => [...prev, newFile]);
    setActiveFileId(newFile.id);
  }, [files.length]);

  // Delete file
  const deleteFile = useCallback((fileId: string) => {
    if (fileId === 'default') {
      showAlert('Cannot Delete', 'Cannot delete the main file.', 'warning');
      return;
    }

    const fileToDelete = files.find(f => f.id === fileId);
    if (!fileToDelete) return;

    showConfirm(
      'Delete File',
      `Are you sure you want to delete "${fileToDelete.name}"?`,
      () => {
        setFiles(prev => prev.filter(f => f.id !== fileId));
        if (activeFileId === fileId) {
          setActiveFileId('default');
        }
      }
    );
  }, [files, activeFileId, showAlert, showConfirm]);

  // Switch to different file
  const switchToFile = useCallback((fileId: string) => {
    // Save current file content first
    if (editorRef.current && activeFileId) {
      const currentContent = editorRef.current.getValue();
      updateFileContent(activeFileId, currentContent);
    }
    
    setActiveFileId(fileId);
    setShowFileList(false);
  }, [activeFileId, updateFileContent]);

  // Handle editor mount
  const handleEditorDidMount = useCallback((editor: any, _monaco: any) => {
    editorRef.current = editor;
    editor.setValue(activeFile.content);
  }, [activeFile.content]);

  // Handle editor content changes
  const handleEditorChange = useCallback((value: string | undefined) => {
    if (value !== undefined && activeFileId) {
      updateFileContent(activeFileId, value);
    }
  }, [activeFileId, updateFileContent]);

  // Execute code function
  const executeCode = useCallback(() => {
    if (!editorRef.current) return;
    
    const code = editorRef.current.getValue();
    
    try {
      // Create execution context with store functions
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
      
      // Execute code safely
      const executeUserCode = new Function(
        'createBox', 'createSphere', 'createCylinder', 
        `"use strict"; try { ${code}; return true; } catch(e) { console.error('Code execution error:', e); throw e; }`
      );
      
      executeUserCode(createBox, createSphere, createCylinder);
      showAlert('Success', 'Code executed successfully!', 'success');
      
    } catch (error) {
      console.error('Error executing code:', error);
      showAlert('Execution Error', `Failed to execute code: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  }, [store, showAlert]);

  return (
    <div className="h-full flex flex-col bg-sphaire-dark-lighter">
      {/* Header with file management */}
      <div className="flex items-center justify-between p-2 bg-sphaire-dark border-b border-sphaire-purple-light border-opacity-30">
        <div className="flex items-center space-x-2">
          <h3 className="text-sm font-medium text-sphaire-purple-light">Code Editor</h3>
          
          {/* File selector dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowFileList(!showFileList)}
              className="flex items-center space-x-1 px-2 py-1 bg-sphaire-purple-dark rounded text-xs text-sphaire-purple-light hover:text-sphaire-pink-light transition-colors"
            >
              <span className="truncate max-w-20">{activeFile.name}</span>
              <svg className={`w-3 h-3 transition-transform ${showFileList ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {showFileList && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowFileList(false)} />
                <div className="absolute top-full left-0 mt-1 w-48 bg-sphaire-dark border border-sphaire-purple-light/50 rounded shadow-lg z-20 max-h-48 overflow-y-auto custom-scrollbar">
                  {files.map((file) => (
                    <div key={file.id} className="flex items-center justify-between group">
                      <button
                        className={`flex-1 px-3 py-2 text-left text-xs hover:bg-sphaire-purple-dark/50 transition-colors ${
                          file.id === activeFileId ? 'bg-sphaire-purple-dark/30 text-sphaire-pink-light' : 'text-sphaire-purple-light'
                        }`}
                        onClick={() => switchToFile(file.id)}
                      >
                        <div className="flex items-center space-x-1">
                          <span className="truncate">{file.name}</span>
                          {file.isGenerated && (
                            <span className="text-[10px] bg-sphaire-pink px-1 rounded">
                              {file.generatedBy === 'babylon' ? '' : ''}
                            </span>
                          )}
                        </div>
                      </button>
                      {file.id !== 'default' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteFile(file.id); }}
                          className="opacity-0 group-hover:opacity-100 px-2 py-2 text-red-400 hover:text-red-300 transition-all"
                          title="Delete file"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Add new file button */}
          <button
            onClick={createNewFile}
            className="px-2 py-1 bg-sphaire-purple-dark hover:bg-sphaire-purple-light/20 text-sphaire-purple-light hover:text-sphaire-pink-light rounded text-xs font-medium transition-colors flex items-center space-x-1"
            title="Create new file"
          >
            <span className="text-sm">+</span>
            <span>New</span>
          </button>
          
          {/* Run code button */}
          <button
            onClick={executeCode}
            className="bg-sphaire-pink hover:bg-sphaire-pink-light text-white px-3 py-1 rounded text-xs font-medium transition-colors flex items-center space-x-1"
          >
            <span>▶</span>
            <span>Run</span>
          </button>
        </div>
      </div>
      
      {/* Monaco Editor */}
      <div className="flex-grow">
        <Editor
          height="100%"
          defaultLanguage="javascript"
          value={activeFile.content}
          theme="vs-dark"
          loading={<div className="h-full w-full flex items-center justify-center text-gray-400">Loading editor...</div>}
          onMount={handleEditorDidMount}
          onChange={handleEditorChange}
          options={{
            minimap: { enabled: true },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            fontSize: 14,
            wordWrap: 'on',
            folding: true,
            lineNumbers: 'on',
            renderLineHighlight: 'all'
          }}
        />
      </div>
    </div>
  );
});

MonacoEditor.displayName = 'MonacoEditor';
export default MonacoEditor;
