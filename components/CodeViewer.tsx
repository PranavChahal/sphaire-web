import React, { useState, useImperativeHandle, forwardRef, useCallback, useEffect } from 'react';

interface CodeFile {
  id: string;
  name: string;
  content: string;
  language: string;
  lastModified: Date;
  isGenerated?: boolean;
  generatedBy?: 'babylon' | 'opencascade';
}

export interface CodeViewerRef {
  addGeneratedFile: (name: string, content: string, backend: 'babylon' | 'opencascade') => void;
  openFile: (fileId: string) => void;
  clearOldFiles: () => void;
}

const CodeViewer = forwardRef<CodeViewerRef>((_, ref) => {
  const [files, setFiles] = useState<CodeFile[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [showFileList, setShowFileList] = useState(false);

  const activeFile = files.find(f => f.id === activeFileId) || files[0] || null;

  // Memory-efficient cleanup - keep only last 5 files
  const cleanupOldFiles = useCallback(() => {
    setFiles(prev => {
      if (prev.length <= 5) return prev;
      return prev.slice(-5);
    });
  }, []);

  useEffect(() => {
    const cleanup = setInterval(cleanupOldFiles, 120000);
    return () => clearInterval(cleanup);
  }, [cleanupOldFiles]);

  const switchToFile = useCallback((fileId: string) => {
    setActiveFileId(fileId);
    setShowFileList(false);
  }, []);

  const deleteFile = useCallback((fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
    if (activeFileId === fileId) {
      setActiveFileId(null);
    }
  }, [activeFileId]);

  useImperativeHandle(ref, () => ({
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
      
      setTimeout(cleanupOldFiles, 100);
    },
    openFile: (fileId: string) => {
      setActiveFileId(fileId);
    },
    clearOldFiles: () => {
      cleanupOldFiles();
    }
  }));

  const formatCode = useCallback((code: string) => {
    return code
      .replace(/(\/\/.*$)/gm, '<span style="color: #6a9955;">$1</span>')
      .replace(/(\/\*[\s\S]*?\*\/)/g, '<span style="color: #6a9955;">$1</span>')
      .replace(/\b(function|const|let|var|if|else|for|while|return|import|export|class|extends)\b/g, '<span style="color: #569cd6;">$1</span>')
      .replace(/\b(true|false|null|undefined)\b/g, '<span style="color: #4fc1ff;">$1</span>')
      .replace(/"([^"]*)"/g, '<span style="color: #ce9178;">"$1"</span>')
      .replace(/'([^']*)'/g, "<span style='color: #ce9178;'>'$1'</span>");
  }, []);

  if (files.length === 0) {
    return (
      <div className="h-full flex flex-col bg-sphaire-dark-lighter">
        <div className="flex items-center justify-between p-3 bg-sphaire-dark border-b border-sphaire-purple-light border-opacity-30">
          <h3 className="text-sm font-medium text-sphaire-purple-light">Code Viewer</h3>
        </div>
        <div className="flex-1 flex items-center justify-center text-sphaire-purple-light/70 text-sm">
          <div className="text-center">
            <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
            <p>No generated code files to view</p>
            <p className="text-xs mt-1">AI-generated code will appear here</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-sphaire-dark-lighter">
      <div className="flex items-center justify-between p-2 bg-sphaire-dark border-b border-sphaire-purple-light border-opacity-30">
        <div className="flex items-center space-x-2">
          <h3 className="text-sm font-medium text-sphaire-purple-light">Code Viewer</h3>
          
          {/* File selector dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowFileList(!showFileList)}
              className="flex items-center space-x-1 px-2 py-1 bg-sphaire-purple-dark rounded text-xs text-sphaire-purple-light hover:text-sphaire-pink-light transition-colors"
            >
              <span className="truncate max-w-20">{activeFile?.name || 'No file'}</span>
              <svg className={`w-3 h-3 transition-transform ${showFileList ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {showFileList && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowFileList(false)} />
                <div className="absolute top-full left-0 mt-1 w-48 bg-sphaire-dark border border-sphaire-purple-light/50 rounded shadow-lg z-20 max-h-48 overflow-y-auto">
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
                            <span className="text-[10px] bg-sphaire-purple-dark px-1 rounded text-sphaire-purple-light">
                              {file.generatedBy}
                            </span>
                          )}
                        </div>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteFile(file.id); }}
                        className="opacity-0 group-hover:opacity-100 px-2 py-2 text-red-400 hover:text-red-300 transition-all"
                        title="Delete file"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2 text-xs text-sphaire-purple-light/70">
          <span>{files.length} file{files.length !== 1 ? 's' : ''}</span>
        </div>
      </div>
      
      {/* Code Display Area */}
      <div className="flex-1 overflow-auto">
        {activeFile ? (
          <div className="p-4">
            <div className="bg-sphaire-dark rounded border border-sphaire-purple-light/30">
              {/* File header */}
              <div className="flex items-center justify-between px-3 py-2 bg-sphaire-purple-dark/20 border-b border-sphaire-purple-light/20">
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-sphaire-purple-light font-mono">{activeFile.name}</span>
                  {activeFile.isGenerated && (
                    <span className="text-[10px] bg-sphaire-purple-dark px-1.5 py-0.5 rounded text-sphaire-pink-light">
                      Generated by {activeFile.generatedBy}
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-sphaire-purple-light/50">
                  {activeFile.lastModified.toLocaleTimeString()}
                </span>
              </div>
              
              {/* Code content */}
              <div className="p-3 overflow-x-auto">
                <pre className="text-xs text-sphaire-purple-light font-mono leading-relaxed whitespace-pre-wrap">
                  <code 
                    dangerouslySetInnerHTML={{ 
                      __html: formatCode(activeFile.content) 
                    }} 
                  />
                </pre>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-sphaire-purple-light/50 text-sm">
            Select a file to view its contents
          </div>
        )}
      </div>
    </div>
  );
});

CodeViewer.displayName = 'CodeViewer';
export default CodeViewer;
