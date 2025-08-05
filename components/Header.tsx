import React, { useState, useRef, useCallback } from 'react';
import useStore from '../store/store';
import useSceneStore from '../store/sceneStore';
import { SceneLoader } from '@babylonjs/core';
import { exportSTL, exportOBJ, exportGLTF, downloadBlob } from '../utils/exporters';

// OFFICIAL BABYLON.JS GLTF LOADER PLUGIN REGISTRATION
// As per official docs: https://doc.babylonjs.com/features/featuresDeepDive/importers/glTF
import '@babylonjs/loaders/glTF'; // registers the glTF loader plugin (official pattern)

// Import other loaders using official patterns
import '@babylonjs/loaders/OBJ';
import '@babylonjs/loaders/STL';

interface HeaderProps {
  onToggleVoice: () => void;
  onToggleCursor: () => void;
  isVoiceActive: boolean;
  isCursorActive: boolean;
}

const Header: React.FC<HeaderProps> = ({ onToggleVoice, onToggleCursor, isVoiceActive, isCursorActive }) => {
  const [isImporting, setIsImporting] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addShape, selectShape } = useStore();
  const { setScene } = useSceneStore();
  const { scene } = useSceneStore();
  
  // Get engine from scene (Babylon.js pattern)
  const engine = scene?.getEngine() || null;

  const handleImport = useCallback(() => {
    if (!scene || !engine) {
      alert('❌ Scene not ready. Please wait for the 3D environment to load.');
      return;
    }

    fileInputRef.current?.click();
  }, [scene, engine]);

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !scene || !engine) return;

    const file = files[0];
    const fileName = file.name.toLowerCase();
    const fileExtension = fileName.split('.').pop();
    
    console.log('🚀 BULLETPROOF IMPORT METHOD for:', file.name);
    console.log('📁 File details:', file.name, Math.round(file.size / 1024), 'KB');
    
    // Validate supported formats
    const supportedFormats = ['glb', 'gltf', 'obj', 'stl'];
    if (!fileExtension || !supportedFormats.includes(fileExtension)) {
      alert(`❌ Unsupported file format: .${fileExtension}\n\nSupported: ${supportedFormats.join(', ')}`);
      return;
    }
    
    setIsImporting(true);
    
    try {
      console.log('📖 Reading file as ArrayBuffer...');
      
      // BULLETPROOF METHOD: ArrayBuffer + Data URI approach
      const arrayBuffer = await file.arrayBuffer();
      console.log('✅ File read as ArrayBuffer:', arrayBuffer.byteLength, 'bytes');
      
      // Convert ArrayBuffer to base64 data URI (chunked approach for large files)
      const chunkSize = 0x8000; // 32KB chunks to prevent stack overflow
      const uint8Array = new Uint8Array(arrayBuffer);
      let binaryString = '';
      
      // Process in chunks to prevent stack overflow
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.slice(i, i + chunkSize);
        binaryString += String.fromCharCode.apply(null, Array.from(chunk));
      }
      
      const base64String = btoa(binaryString);
      const mimeType = fileExtension === 'glb' || fileExtension === 'gltf' ? 'model/gltf-binary' : 
                      fileExtension === 'obj' ? 'model/obj' :
                      fileExtension === 'stl' ? 'model/stl' : 'application/octet-stream';
      
      const dataUri = `data:${mimeType};base64,${base64String}`;
      console.log('✅ Created data URI:', dataUri.substring(0, 100) + '...');
      
      // Initialize scene metadata if needed
      if (!scene.metadata) {
        scene.metadata = {};
      }
      // 🚨 UNIFIED STORE ARCHITECTURE: No longer using scene.metadata.importedMeshes
      // All model data is now stored in the unified store for perfect serialization
      
      console.log('🚀 Starting SceneLoader.ImportMeshAsync with data URI...');
      
      // Use SceneLoader.ImportMeshAsync with data URI
      const result = await SceneLoader.ImportMeshAsync(
        '', // meshNames - empty string imports all
        '', // rootUrl - not needed for data URI
        dataUri, // sceneFilename - our base64 data URI
        scene // scene to import into
      );
      
      console.log('✅ SceneLoader.ImportMeshAsync completed successfully');
      console.log('📊 Import result:', {
        meshes: result.meshes.length,
        skeletons: result.skeletons?.length || 0,
        animationGroups: result.animationGroups?.length || 0
      });
      
      let importedCount = 0;
      
      // Process imported meshes
      if (result.meshes && result.meshes.length > 0) {
        result.meshes.forEach((mesh, index) => {
          if (mesh.name && mesh.name !== '__root__') {
            console.log(`🔄 Processing imported mesh ${index + 1}:`, mesh.name);
            
            // Ensure mesh is visible and properly configured
            mesh.isVisible = true;
            mesh.setEnabled(true);
            
            // 🚨 FIX: DO NOT call addShape() for imported meshes!
            // This was causing white cube overlays because createShapeMeshes() 
            // creates primitive shapes for store entries, overlapping the imported mesh.
            // The imported mesh already exists from SceneLoader - no duplicate needed.
            
            const shapeId = `imported_${Date.now()}_${index}`;
            console.log(`✅ Imported mesh processed (no store duplication):`, shapeId, mesh.name);
            
            // Store mesh metadata
            const importedMeshData = {
              id: shapeId,
              originalName: mesh.name,
              position: { x: mesh.position.x, y: mesh.position.y, z: mesh.position.z },
              rotation: { x: mesh.rotation.x, y: mesh.rotation.y, z: mesh.rotation.z },
              scaling: { x: mesh.scaling.x, y: mesh.scaling.y, z: mesh.scaling.z },
              babylonMesh: mesh,
              name: mesh.name || `Imported Mesh ${index + 1}`
            };
            // 🚨 UNIFIED STORE ARCHITECTURE: Legacy metadata push removed
            console.log(`🔄 IMPORT: Added mesh ${index + 1} to scene.metadata:`, importedMeshData.name);
            
            importedCount++;
          }
        });
        
        // Camera position remains unchanged during import
        
        // Force scene update and render
        scene.render();
        console.log('✅ Forced scene render');
        
        // Select first imported mesh
        if (importedCount > 0) {
          selectShape(`imported_${Date.now()}_0`);
        }
        
        // Update scene in store
        setScene(scene);
        
        alert(`🎉 IMPORT SUCCESS!\n\n${importedCount} meshes imported from ${file.name}\n\nModel ready for editing!`);
      } else {
        console.warn('⚠️ No meshes found in imported scene');
        alert(`⚠️ Import completed but no visible meshes found in ${file.name}`);
      }
      
      setIsImporting(false);
      
    } catch (error) {
      console.error('❌ BULLETPROOF import failed:', error);
      alert(`❌ Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsImporting(false);
    }
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [scene, engine, addShape, selectShape, setScene]);

  const handleExport = useCallback(async (format: string) => {
    if (!scene) {
      alert('❌ Scene not ready. Please wait for the 3D environment to load.');
      return;
    }

    try {
      setIsExporting(true);
      setShowExportDropdown(false);
      
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      
      switch (format) {
        case 'STL': {
          // Get all meshes from the scene
          const meshes = scene.meshes.filter(mesh => mesh.geometry && mesh.isVisible);
          if (meshes.length === 0) {
            alert('❌ No meshes to export. Please add some 3D objects to the scene.');
            return;
          }
          
          // Export the first visible mesh or combine multiple meshes
          const mainMesh = meshes[0];
          const blob = exportSTL(mainMesh as any);
          downloadBlob(blob, `sphaire_model_${timestamp}.stl`);
          break;
        }
        
        case 'OBJ': {
          const meshes = scene.meshes.filter(mesh => mesh.geometry && mesh.isVisible);
          if (meshes.length === 0) {
            alert('❌ No meshes to export. Please add some 3D objects to the scene.');
            return;
          }
          
          const mainMesh = meshes[0];
          const blob = exportOBJ(mainMesh as any);
          downloadBlob(blob, `sphaire_model_${timestamp}.obj`);
          break;
        }
        
        case 'GLTF': {
          const blob = await exportGLTF(scene);
          downloadBlob(blob, `sphaire_scene_${timestamp}.glb`);
          break;
        }
        
        case 'STEP': {
          // For STEP export, we need an OpenCascade shape
          // This would require integration with the CAD modeling system
          alert('🚧 STEP export requires CAD shapes. This feature is coming soon!');
          break;
        }
        
        default:
          alert('❌ Unsupported export format.');
          return;
      }
      
      alert(`✅ Export successful! Your ${format} file has been downloaded.`);
      
    } catch (error) {
      console.error('❌ Export failed:', error);
      alert(`❌ Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsExporting(false);
    }
  }, [scene]);

  const exportFormats = [
    { name: 'STL', description: 'For 3D printing', icon: '🖨️' },
    { name: 'OBJ', description: 'Universal 3D format', icon: '📦' },
    { name: 'GLTF', description: 'Web-optimized scene', icon: '🌐' },
    { name: 'STEP', description: 'CAD format (beta)', icon: '⚙️' }
  ];

  return (
    <div className="bg-gradient-to-r from-gray-900 to-black text-white p-4 flex justify-between items-center shadow-lg border-b border-pink-400/20">
      {/* Logo and Title */}
      <div className="flex items-center space-x-3">
        <img 
          src="/sphaire-img/sphaire.png" 
          alt="Sphaire Logo" 
          className="w-8 h-8 object-contain"
        />
        <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-300 to-pink-500 bg-clip-text text-transparent">
          Sphaire
        </h1>
      </div>
      
      {/* Action Buttons */}
      <div className="flex items-center space-x-4">
        <button
          onClick={handleImport}
          disabled={isImporting}
          className={`px-4 py-2 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-md border ${
            isImporting
              ? 'bg-gray-800 text-gray-400 cursor-not-allowed opacity-50 border-gray-600'
              : 'bg-black text-pink-400 hover:text-pink-300 border-pink-400/20 hover:border-pink-400/40'
          }`}
        >
          {isImporting ? (
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-pink-400 border-t-transparent rounded-full animate-spin"></div>
              <span>Importing...</span>
            </div>
          ) : (
            'Import'
          )}
        </button>
        
        <div className="relative">
          <button
            onClick={() => setShowExportDropdown(!showExportDropdown)}
            disabled={isExporting}
            className={`px-4 py-2 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-md border flex items-center space-x-2 ${
              isExporting
                ? 'bg-gray-800 text-gray-400 cursor-not-allowed opacity-50 border-gray-600'
                : 'bg-black text-pink-400 hover:text-pink-300 border-pink-400/20 hover:border-pink-400/40'
            }`}
          >
            {isExporting ? (
              <>
                <div className="w-4 h-4 border-2 border-pink-400 border-t-transparent rounded-full animate-spin"></div>
                <span>Exporting...</span>
              </>
            ) : (
              <>
                <span>Export</span>
                <svg 
                  className={`w-4 h-4 transition-transform duration-200 ${
                    showExportDropdown ? 'rotate-180' : ''
                  }`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </>
            )}
          </button>
          
          {showExportDropdown && !isExporting && (
            <div className="absolute top-full left-0 mt-2 w-64 bg-gray-900 border border-pink-400/20 rounded-lg shadow-xl z-50">
              <div className="p-2">
                <div className="text-xs text-gray-400 mb-2 px-2">Export formats:</div>
                {exportFormats.map((format) => (
                  <div key={format.name} className="flex items-center justify-between p-2 hover:bg-gray-800/50 rounded-md group">
                    <div className="flex items-center space-x-3">
                      <span className="text-lg">{format.icon}</span>
                      <div>
                        <div className="text-pink-400 font-medium">{format.name}</div>
                        <div className="text-xs text-gray-500">{format.description}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleExport(format.name)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-pink-600 hover:bg-pink-500 text-white p-1.5 rounded-md text-sm flex items-center space-x-1"
                      title={`Download ${format.name}`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span>Download</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <button
          onClick={onToggleVoice}
          className={`px-4 py-2 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-md border ${
            isVoiceActive
              ? 'bg-pink-600 text-white border-pink-400'
              : 'bg-black text-pink-400 hover:text-pink-300 border-pink-400/20 hover:border-pink-400/40'
          }`}
        >
          {isVoiceActive ? '🎤️ Stop Voice' : '🎤️ Voice'}
        </button>
        
        <button
          onClick={onToggleCursor}
          className={`px-4 py-2 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-md border ${
            isCursorActive
              ? 'bg-pink-600 text-white border-pink-400'
              : 'bg-black text-pink-400 hover:text-pink-300 border-pink-400/20 hover:border-pink-400/40'
          }`}
        >
          {isCursorActive ? '👁️ Hide Cursor' : '👁️ Show Cursor'}
        </button>
      </div>
      
      <input
        ref={fileInputRef}
        type="file"
        accept=".glb,.gltf,.obj,.stl"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
};

export default Header;
