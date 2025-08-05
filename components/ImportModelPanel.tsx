import React, { useState, useCallback, useRef } from 'react';
import useStore from '../store/store';
import useSceneStore from '../store/sceneStore';

/**
 * ImportModelPanel component for file-based 3D model imports
 * Supports GLTF, GLB, OBJ, and STL file formats using Babylon.js SceneLoader
 */
const ImportModelPanel: React.FC = () => {
  // Local state for UI management
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importProgress, setImportProgress] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [lastImportedFile, setLastImportedFile] = useState<string>('');

  // Get store state and actions
  const { addShape, selectShape } = useStore();
  const { scene } = useSceneStore();

  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Handle file selection and import
   */
  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validExtensions = ['.gltf', '.glb', '.obj', '.stl'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    if (!validExtensions.includes(fileExtension)) {
      setError(`Unsupported file format: ${fileExtension}. Supported formats: ${validExtensions.join(', ')}`);
      return;
    }

    // Check if scene is available
    if (!scene) {
      setError('Scene not available. Please ensure the 3D viewport is loaded.');
      return;
    }

    setIsImporting(true);
    setError('');
    setImportProgress(0);
    setStatusMessage('Reading file...');
    setLastImportedFile(file.name);

    try {
      // Create URL for the file
      const fileUrl = URL.createObjectURL(file);
      
      // Dynamically import Babylon.js SceneLoader
      const { SceneLoader } = await import('@babylonjs/core/Loading/sceneLoader');
      
      // Set status message based on file type
      if (fileExtension === '.gltf' || fileExtension === '.glb') {
        setStatusMessage('Loading GLTF/GLB file...');
      } else if (fileExtension === '.obj') {
        setStatusMessage('Loading OBJ file...');
      } else if (fileExtension === '.stl') {
        setStatusMessage('Loading STL file...');
      }

      // Import the mesh with progress tracking
      const result = await SceneLoader.ImportMeshAsync(
        '', // Import all meshes
        '', // No specific path needed for blob URL
        fileUrl,
        scene,
        (progressEvent) => {
          if (progressEvent.lengthComputable) {
            const progress = (progressEvent.loaded / progressEvent.total) * 100;
            setImportProgress(progress);
            setStatusMessage(`Loading ${file.name}... ${Math.round(progress)}%`);
          }
        }
      );

      // Clean up the object URL
      URL.revokeObjectURL(fileUrl);

      // Check if meshes were imported
      if (!result.meshes || result.meshes.length === 0) {
        throw new Error('No meshes found in the imported file');
      }

      setStatusMessage('Processing imported meshes...');

      // Add imported meshes to the store
      result.meshes.forEach((mesh, index) => {
        // Skip root nodes or empty meshes
        if (mesh.getTotalVertices() === 0 && mesh.name.includes('__root__')) {
          return;
        }

        // 🚨 CRITICAL FIX: DO NOT call addShape() for imported meshes!
        // This was causing white cube overlays because ViewportProduction.tsx
        // creates primitive shapes for store entries, overlapping the imported mesh.
        // The imported mesh already exists from SceneLoader - no duplicate needed.
        
        console.log(`✅ Imported mesh processed (no store duplication):`, mesh.name || `Imported Model ${index + 1}`);
        
        // Note: We can't get the actual ID from addShape, so we'll select the first mesh later
        if (index === 0) {
          // Set a timeout to select the first imported mesh after state updates
          setTimeout(() => {
            const shapes = useStore.getState().shapes;
            const lastShape = shapes[shapes.length - 1];
            if (lastShape) {
              selectShape(lastShape.id);
            }
          }, 100);
        }
      });

      // Import animations if present
      if (result.animationGroups && result.animationGroups.length > 0) {
        console.log(`Imported ${result.animationGroups.length} animation(s)`);
        // Start the first animation if available
        result.animationGroups[0].start(true);
      }

      setStatusMessage(`Successfully imported ${result.meshes.length} mesh(es) from ${file.name}`);
      setImportProgress(100);

      // Clear status message after delay
      setTimeout(() => {
        setStatusMessage('');
        setImportProgress(0);
      }, 4000);

    } catch (err) {
      console.error('Import error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to import model';
      setError(`Import failed: ${errorMessage}`);
      setStatusMessage('');
      setImportProgress(0);
    } finally {
      setIsImporting(false);
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [addShape, selectShape, scene]);

  /**
   * Handle browse button click
   */
  const handleBrowseClick = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, []);

  /**
   * Clear error message
   */
  const clearError = useCallback(() => {
    setError('');
  }, []);

  return (
    <div className="bg-sphaire-dark-lighter rounded-lg p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-sphaire-pink-light">
          Import 3D Model
        </h2>
        <div className="text-sm text-gray-400">
          GLTF, GLB, OBJ, STL
        </div>
      </div>

      {/* File Input Section */}
      <div className="space-y-4">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".gltf,.glb,.obj,.stl"
          onChange={handleFileSelect}
          className="hidden"
          disabled={isImporting}
        />

        {/* Custom file button */}
        <button
          onClick={handleBrowseClick}
          disabled={isImporting}
          className="w-full bg-sphaire-purple hover:bg-sphaire-purple-light disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-md transition-colors duration-200 flex items-center justify-center gap-3"
        >
          {isImporting ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              Importing...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Choose 3D Model File
            </>
          )}
        </button>

        {/* Drag and drop hint */}
        <div className="text-center text-sm text-gray-400">
          Click to browse or drag and drop your 3D model file here
        </div>
      </div>

      {/* Progress Bar */}
      {isImporting && importProgress > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-300">
            <span>Import Progress</span>
            <span>{Math.round(importProgress)}%</span>
          </div>
          <div className="w-full bg-sphaire-dark rounded-full h-2">
            <div
              className="bg-sphaire-pink h-2 rounded-full transition-all duration-200"
              style={{ width: `${importProgress}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Status Messages */}
      {statusMessage && (
        <div className="bg-blue-900/20 border border-blue-500/30 text-blue-400 px-4 py-2 rounded-md">
          {statusMessage}
        </div>
      )}

      {error && (
        <div className="bg-red-900/20 border border-red-500/30 text-red-400 px-4 py-2 rounded-md flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={clearError}
            className="text-red-400 hover:text-red-300 ml-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Last Import Info */}
      {lastImportedFile && !isImporting && !error && (
        <div className="bg-green-900/20 border border-green-500/30 text-green-400 px-4 py-2 rounded-md">
          ✅ Last imported: {lastImportedFile}
        </div>
      )}

      {/* Supported Formats Info */}
      <div className="bg-sphaire-dark border border-sphaire-purple/30 rounded-md p-4">
        <h3 className="text-sm font-semibold text-sphaire-purple-light mb-2">
          Supported File Formats
        </h3>
        <div className="grid grid-cols-2 gap-2 text-sm text-gray-300">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            <span><strong>GLTF/GLB:</strong> Recommended</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
            <span><strong>OBJ:</strong> Basic geometry</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
            <span><strong>STL:</strong> 3D printing files</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
            <span>Animations supported</span>
          </div>
        </div>
      </div>

      {/* Tips Section */}
      <div className="text-xs text-gray-400 space-y-1">
        <p>💡 <strong>Tips:</strong></p>
        <ul className="list-disc list-inside space-y-1 ml-4">
          <li>GLTF/GLB files provide the best compatibility and features</li>
          <li>Large files may take longer to import and process</li>
          <li>Imported models will be automatically selected after import</li>
          <li>Animations will start playing automatically if present</li>
        </ul>
      </div>
    </div>
  );
};

export default ImportModelPanel;
