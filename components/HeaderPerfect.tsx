import React, { useState, useCallback, useRef, useEffect } from 'react';
import * as BABYLON from '@babylonjs/core';
import { useModal } from '../contexts/ModalContext';
import '@babylonjs/loaders/glTF';
import '@babylonjs/loaders/OBJ';
import '@babylonjs/loaders/STL';

import useStore from '../store/store';
import useSceneStore from '../store/sceneStore';
import { exportSTL, exportOBJ, exportGLTF, downloadBlob } from '../utils/exporters';

import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface HeaderPerfectProps {
  // Removed voice and cursor props as they're no longer needed
}

const HeaderPerfect: React.FC<HeaderPerfectProps> = () => {
  console.log('🎬 PERFECT HEADER: Component initialized');
  
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<string>('');
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  
  // Close dropdowns when clicking outside
  const exportDropdownRef = useRef<HTMLDivElement>(null);
  const accountDropdownRef = useRef<HTMLDivElement>(null);
  const shareModalRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [searchIndex, setSearchIndex] = useState<any[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const timeoutRefs = useRef<Set<NodeJS.Timeout>>(new Set());
  
  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach(timeout => clearTimeout(timeout));
      timeoutRefs.current.clear();
    };
  }, []);
  
  useEffect(() => {
    // Close dropdowns when clicking outside
    function handleClickOutside(event: MouseEvent) {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target as Node)) {
        setShowExportDropdown(false);
      }
      if (accountDropdownRef.current && !accountDropdownRef.current.contains(event.target as Node)) {
        setShowAccountDropdown(false);
      }
      if (shareModalRef.current && !shareModalRef.current.contains(event.target as Node) && 
          !(event.target as Element).closest('[data-share-button]')) {
        setShowShareModal(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const { addModel, selectShape, removeShape, selectedShapeId, shapes } = useStore();
  const { scene } = useSceneStore();
  const { showAlert, showConfirm } = useModal();

  // Get auth context for user info and router
  const { user, signOut } = useAuth();
  const router = useRouter();

  // Helper function to validate import readiness
  const validateImportReady = useCallback(() => {
    if (!scene) {
      showAlert('Scene Not Ready', 'Please wait for the 3D scene to initialize before importing.', 'warning');
      return false;
    }
    return true;
  }, [scene, showAlert]);

  // Helper function to check loader availability
  const checkLoaderAvailability = useCallback(async (extension: string) => {
    const supportedFormats = ['.glb', '.gltf', '.obj', '.stl'];
    if (!supportedFormats.includes(extension.toLowerCase())) {
      showAlert('Unsupported Format', `File format ${extension} is not supported. Please use: ${supportedFormats.join(', ')}`, 'error');
      return false;
    }
    return true;
  }, [showAlert]);

  const loadSearchIndex = useCallback(async () => {
    try {
      const response = await fetch('/search_index.json');
      if (response.ok) {
        const index = await response.json();
        setSearchIndex(index);
        console.log('✅ Thingi10K search index loaded:', index.length, 'models');
      } else {
        console.warn('⚠️ Search index not found. Run metadata extraction first.');
      }
    } catch (error) {
      console.error('❌ Failed to load search index:', error);
    }
  }, []);

  React.useEffect(() => {
    loadSearchIndex();
  }, [loadSearchIndex]);

  const performSearch = useCallback((query: string) => {
    if (!query.trim() || searchIndex.length === 0) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }
    
    setIsSearchLoading(true);
    const normalizedQuery = query.toLowerCase().trim();
    
    const results = searchIndex.filter(item => {
      const nameMatch = item.name.toLowerCase().includes(normalizedQuery);
      const tagMatch = item.tags.some((tag: string) => 
        tag.toLowerCase().includes(normalizedQuery)
      );
      const searchTextMatch = item.searchText.includes(normalizedQuery);
      
      return nameMatch || tagMatch || searchTextMatch;
    });
    
    // Limit results for performance
    const limitedResults = results.slice(0, 10);
    
    setSearchResults(limitedResults);
    setShowSearchResults(limitedResults.length > 0);
    setIsSearchLoading(false);
    
    console.log(`🔍 Search for "${query}" found ${limitedResults.length} results`);
  }, [searchIndex]);

  /**
   * Handle search input change
   */
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    
    // Debounce search
    const timeoutId = setTimeout(() => {
      performSearch(value);
    }, 300);
    
    return () => clearTimeout(timeoutId);
  }, [performSearch]);



  /**
   * Calculate appropriate scale factor for imported models
   */
  const calculateImportScale = useCallback((meshes: BABYLON.AbstractMesh[]): number => {
    if (!meshes || meshes.length === 0) return 1;
    
    // Calculate bounding box of all meshes
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    
    meshes.forEach(mesh => {
      if (mesh.name === '__root__') return;
      
      const boundingInfo = mesh.getBoundingInfo();
      const min = boundingInfo.minimum;
      const max = boundingInfo.maximum;
      
      minX = Math.min(minX, min.x);
      maxX = Math.max(maxX, max.x);
      minY = Math.min(minY, min.y);
      maxY = Math.max(maxY, max.y);
      minZ = Math.min(minZ, min.z);
      maxZ = Math.max(maxZ, max.z);
    });
    
    // Calculate dimensions
    const width = maxX - minX;
    const height = maxY - minY;
    const depth = maxZ - minZ;
    const maxDimension = Math.max(width, height, depth);
    
    // Scale to reasonable size (target: ~5 units max dimension)
    const targetSize = 5;
    const scaleFactor = maxDimension > targetSize ? targetSize / maxDimension : 1;
    
    console.log(`🔧 PERFECT HEADER: Calculated scale factor ${scaleFactor} (max dimension: ${maxDimension})`);
    return scaleFactor;
  }, []);

  /**
   * PERFECT FILE IMPORT HANDLER
   */
  const handleFileImport = useCallback(async (file: File): Promise<void> => {
    console.log('🚀 PERFECT HEADER: Starting perfect file import for:', file.name);
    setImportProgress(`Reading file: ${file.name}...`);
    
    const fileName = file.name.toLowerCase();
    const fileExtension = '.' + fileName.split('.').pop();
    
    try {
      // 1. Validate scene readiness
      if (!validateImportReady()) return;
      
      // 2. Check loader availability
      if (!(await checkLoaderAvailability(fileExtension))) return;
      
      setImportProgress('Preparing import...');
      
      // 3. Import SceneLoader
      const { SceneLoader } = await import('@babylonjs/core/Loading/sceneLoader');
      console.log('✅ PERFECT HEADER: SceneLoader imported');
      
      // 4. Convert file to ArrayBuffer (most reliable approach)
      setImportProgress('Converting file...');
      const arrayBuffer = await file.arrayBuffer();
      console.log('✅ PERFECT HEADER: File converted to ArrayBuffer:', arrayBuffer.byteLength, 'bytes');
      
      // 5. Create blob URL for SceneLoader (Babylon.js 5.50.0 compatible)
      const blob = new Blob([arrayBuffer], { type: file.type });
      const blobUrl = URL.createObjectURL(blob);
      console.log('✅ PERFECT HEADER: Blob URL created:', blobUrl);
      
      setImportProgress('Importing 3D model...');
      
      // 6. Import using SceneLoader.ImportMeshAsync (perfect for 5.50.0)
      const importResult = await SceneLoader.ImportMeshAsync(
        '', // Import all meshes
        '', // Base URL (empty for blob)
        blobUrl, // File URL
        scene!, // Target scene
        undefined, // onProgress callback
        fileExtension // File extension for plugin selection
      );
      
      console.log('✅ PERFECT HEADER: Import successful!');
      console.log('📊 PERFECT HEADER: Import result:', importResult);
      console.log('📊 PERFECT HEADER: Imported meshes:', importResult.meshes.length);
      
      // 7. Process imported meshes and create container
      if (importResult.meshes && importResult.meshes.length > 0) {
        setImportProgress('Processing imported meshes...');
        
        // Create a container node for all imported meshes
        const modelContainer = new BABYLON.TransformNode(`imported-model-${Date.now()}`, scene!);
        modelContainer.position = new BABYLON.Vector3(0, 0, 0);
        modelContainer.rotation = new BABYLON.Vector3(0, 0, 0);
        modelContainer.scaling = new BABYLON.Vector3(1, 1, 1);
        
        console.log('🔧 PERFECT HEADER: Created model container for imported meshes');
        
        // Parent all imported meshes to the container
        let processedCount = 0;
        importResult.meshes.forEach((mesh: BABYLON.AbstractMesh, index: number) => {
          if (mesh && mesh.name && mesh.name !== '__root__') {
            console.log(`✅ PERFECT HEADER: Processing mesh ${index + 1}:`, mesh.name);
            mesh.parent = modelContainer;
            processedCount++;
          }
        });
        
        // Calculate and apply appropriate scaling
        const scaleFactor = calculateImportScale(importResult.meshes);
        if (scaleFactor !== 1) {
          modelContainer.scaling = new BABYLON.Vector3(scaleFactor, scaleFactor, scaleFactor);
          console.log(`🔧 PERFECT HEADER: Applied scale factor ${scaleFactor} to model container`);
        }
        
        // 8. Read file content and create store entry
        console.log('📁 PERFECT HEADER: Reading file content for store...');
        const fileReader = new FileReader();
        
        await new Promise<void>((resolve, reject) => {
          fileReader.onload = () => {
            try {
              const fileContent = fileReader.result as ArrayBuffer;
              const uint8Array = new Uint8Array(fileContent);
              
              // Convert to Base64 for storage
              let base64String = '';
              const chunk = 8192;
              for (let i = 0; i < uint8Array.length; i += chunk) {
                const slice = uint8Array.slice(i, i + chunk);
                base64String += btoa(String.fromCharCode.apply(null, Array.from(slice)));
              }
              
              console.log(`💾 PERFECT HEADER: File encoded to Base64 (${base64String.length} chars)`);
              
              // 9. Create unified store entry for the imported model
              const modelEntry = {
                type: 'model' as const,
                position: {
                  x: modelContainer.position.x,
                  y: modelContainer.position.y,
                  z: modelContainer.position.z
                },
                rotation: {
                  x: modelContainer.rotation.x,
                  y: modelContainer.rotation.y,
                  z: modelContainer.rotation.z
                },
                scaling: {
                  x: modelContainer.scaling.x,
                  y: modelContainer.scaling.y,
                  z: modelContainer.scaling.z
                },
                format: fileExtension.replace('.', ''), // 'glb', 'gltf', 'obj', etc.
                fileName: file.name,
                data: base64String,
                originalSize: file.size,
                name: file.name.replace(/\.[^/.]+$/, '') // Remove extension for display
              };
              
              // 10. Add to store using the new addModel function
              addModel(modelEntry);
              
              // 11. Link container to store entry for selection/manipulation
              const modelId = modelContainer.name;
              modelContainer.metadata = { shapeId: modelId, isModelContainer: true };
              
              console.log(`✅ PERFECT HEADER: Created unified store entry for imported model:`, modelEntry.fileName);
              console.log(`🔗 PERFECT HEADER: Linked container ${modelId} to store entry`);
              
              resolve();
            } catch (error) {
              console.error('❌ PERFECT HEADER: Failed to process file content:', error);
              reject(error);
            }
          };
          
          fileReader.onerror = () => {
            console.error('❌ PERFECT HEADER: Failed to read file');
            reject(new Error('Failed to read file'));
          };
          
          fileReader.readAsArrayBuffer(file);
        });
        
        console.log(`✅ PERFECT HEADER: Successfully processed imported model with ${processedCount} meshes`);
        
        // 🚨 ELIMINATED: No longer using scene.metadata.importedMeshes
        // All model data is now in the store for unified save/load
        
        // 12. Select the imported model (container)
        if (processedCount > 0 && modelContainer) {
          selectShape(modelContainer.name);
          console.log('✅ PERFECT HEADER: Selected imported model container:', modelContainer.name);
        }
        
        setImportProgress(`✅ Successfully imported ${processedCount} object(s)!`);
        
        // Success notification with cleanup tracking
        const successTimeout = setTimeout(() => {
          showAlert(
            'Import Successful!',
            `Successfully imported ${processedCount} object(s) from ${file.name}\n\nYour model is ready for editing in the 3D viewport.`,
            'success'
          );
          setImportProgress('');
          timeoutRefs.current.delete(successTimeout);
        }, 1000);
        
        // Track timeout for cleanup
        timeoutRefs.current.add(successTimeout);
        
      } else {
        console.warn('⚠️ PERFECT HEADER: No meshes found in imported file');
        showAlert(
          'No Objects Found',
          'No 3D objects were found in the imported file.\n\nPlease check that the file contains valid 3D geometry and is not corrupted.',
          'warning'
        );
      }
      
      // 10. Clean up blob URL
      URL.revokeObjectURL(blobUrl);
      console.log('🧹 PERFECT HEADER: Blob URL cleaned up');
      
    } catch (error) {
      console.error('❌ PERFECT HEADER: Import failed:', error);
      
      // Detailed error message
      let errorMessage = 'Unknown error occurred';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      showAlert(
        'Import Failed',
        `Import failed: ${errorMessage}\n\nPlease check:\n• File format is supported (.glb, .gltf, .obj, .stl)\n• File is not corrupted\n• File size is reasonable`,
        'error'
      );
      setImportProgress('');
    }
  }, [scene, addModel]);

  /**
   * Handle model selection from search results
   */
  const handleModelSelect = useCallback(async (model: any) => {
    console.log('🎯 Loading Thingi10K model:', model.name);
    setShowSearchResults(false);
    
    try {
      if (!validateImportReady()) return;
      
      setIsImporting(true);
      setImportProgress(`Loading ${model.name}...`);
      
      // Try different extensions if needed
      const extensions = model.format ? [`.${model.format}`, ''] : ['', '.stl', '.obj'];
      
      let arrayBuffer: ArrayBuffer | null = null;
      let fileExt = '';
      
      // Try each extension until we find a valid file
      for (const ext of extensions) {
        const filePath = ext ? `${model.path}${ext}` : model.path;
        const publicUrl = `https://mvqfkhyxrcymuvorjeru.supabase.co/storage/v1/object/public/thingi10k/${filePath}`;
        
        console.log(`🔄 Attempting to load: ${publicUrl}`);
        try {
          const response = await fetch(publicUrl);
          if (response.ok) {
            arrayBuffer = await response.arrayBuffer();
            fileExt = ext;
            console.log(`✅ Successfully loaded model file: ${filePath}`);
            break;
          }
          console.log(`❌ Failed to load ${filePath}: ${response.status} ${response.statusText}`);
        } catch (err) {
          console.error(`Error loading ${filePath}:`, err);
        }
      }
      
      if (!arrayBuffer) {
        throw new Error(`Failed to load model file. Tried paths: ${extensions.map(ext => model.path + ext).join(', ')}`);
      }
      
      const blob = new Blob([arrayBuffer]);
      const file = new File([blob], model.filename || `${model.path.split('/').pop()}${fileExt}`, { 
        type: fileExt.endsWith('stl') ? 'application/sla' : 'text/plain' 
      });
      
      // Use existing import functionality
      await handleFileImport(file);
      
    } catch (error) {
      console.error('❌ Failed to load Thingi10K model:', error);
      const filePath = model.path || 'unknown';
      const fullUrl = `https://mvqfkhyxrcymuvorjeru.supabase.co/storage/v1/object/public/thingi10k/${filePath}`;
      showAlert(
        'Model Load Failed',
        `Failed to load model: ${model.name}\n\n` +
        `Error: ${error instanceof Error ? error.message : String(error)}\n\n` +
        `Model path: ${filePath}\n` +
        `Full URL: ${fullUrl}\n` +
        'Please try a different model or check your internet connection.',
        'error'
      );
    } finally {
      setIsImporting(false);
      setImportProgress('');
    }
  }, [validateImportReady, handleFileImport]);

  /**
   * HANDLE IMPORT BUTTON CLICK
   */
  const handleImportClick = useCallback(() => {
    if (isImporting) return;
    
    console.log('🎯 PERFECT HEADER: Import button clicked');
    
    if (!validateImportReady()) return;
    
    fileInputRef.current?.click();
  }, [isImporting, validateImportReady]);

  /**
   * HANDLE FILE SELECTION
   */
  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    console.log('📁 PERFECT HEADER: File selected:', file.name, file.size, 'bytes');
    
    // Validate file size (max 100MB for reasonable performance)
    if (file.size > 100 * 1024 * 1024) {
      showAlert(
        'File Too Large',
        'File too large. Please use files smaller than 100MB.\n\nLarge files may cause performance issues or crashes.',
        'warning'
      );
      return;
    }
    
    // Validate file extension
    const fileName = file.name.toLowerCase();
    const validExtensions = ['.glb', '.gltf', '.obj', '.stl'];
    const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext));
    
    if (!hasValidExtension) {
      showAlert(
        'Unsupported File Format',
        `Unsupported file format.\n\nSupported formats: ${validExtensions.join(', ')}\n\nPlease convert your file to one of the supported formats.`,
        'warning'
      );
      return;
    }
    
    setIsImporting(true);
    
    try {
      await handleFileImport(file);
    } finally {
      setIsImporting(false);
      // Clear file input for next import
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [handleFileImport]);

  /**
   * EXPORT HANDLER FUNCTION
   * Handles exporting 3D models in various formats
   */
  const handleExport = useCallback(async (format: string) => {
    if (!scene) {
      showAlert(
        'Scene Not Ready',
        'Scene not ready. Please wait for the 3D environment to load.',
        'warning'
      );
      return;
    }

    try {
      setIsExporting(true);
      setShowExportDropdown(false);
      
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      
      switch (format) {
        case 'STL': {
          // EXPERT MESH FILTERING: Exclude grid, axes, and helper objects
          const exportableMeshes = scene.meshes.filter(mesh => {
            // Must have geometry and be visible
            if (!mesh.geometry || !mesh.isVisible) return false;
            
            // EXCLUDE: Grid and helper objects by name patterns
            const excludePatterns = [
              'transparentGrid', 'centerAxis', 'grid', 'axis',
              'helper', 'gizmo', 'camera', 'light'
            ];
            
            const meshName = mesh.name.toLowerCase();
            const isHelperObject = excludePatterns.some(pattern => 
              meshName.includes(pattern)
            );
            
            // EXCLUDE: Line systems and wireframes (grid is a LineSystem)
            const isLineSystem = mesh.getClassName() === 'LinesMesh';
            
            // INCLUDE: Only real 3D objects
            return !isHelperObject && !isLineSystem;
          });
          
          console.log('🔍 STL Export - Found meshes:', exportableMeshes.map(m => `${m.name} (${m.getClassName()})`));
          
          if (exportableMeshes.length === 0) {
            showAlert(
              'No Exportable Objects',
              'No 3D objects found to export. Please add some shapes, import models, or create objects in the scene.',
              'warning'
            );
            return;
          }
          
          // Export ALL objects in the scene as a single model
          console.log(`📤 Exporting STL for ${exportableMeshes.length} objects:`, exportableMeshes.map(m => m.name));
          
          let blob: Blob;
          
          if (exportableMeshes.length === 1) {
            // Single object - export directly
            blob = exportSTL(exportableMeshes[0] as any);
          } else {
            // Multiple objects - merge them into one mesh for export
            console.log('🔄 Merging multiple objects into single STL...');
            
            // Create a temporary merged mesh
            const mergedMesh = BABYLON.Mesh.MergeMeshes(exportableMeshes as any[], true, true, undefined, false, true);
            
            if (!mergedMesh) {
              showAlert(
                'Merge Failed',
                'Could not merge objects for export. Try exporting as GLTF format instead.',
                'error'
              );
              return;
            }
            
            blob = exportSTL(mergedMesh as any);
            
            // Clean up temporary merged mesh
            mergedMesh.dispose();
          }
          
          downloadBlob(blob, `sphaire_model_${timestamp}.stl`);
          break;
        }
        
        case 'OBJ': {
          // EXPERT MESH FILTERING: Same logic as STL
          const exportableMeshes = scene.meshes.filter(mesh => {
            if (!mesh.geometry || !mesh.isVisible) return false;
            
            const excludePatterns = [
              'transparentGrid', 'centerAxis', 'grid', 'axis',
              'helper', 'gizmo', 'camera', 'light'
            ];
            
            const meshName = mesh.name.toLowerCase();
            const isHelperObject = excludePatterns.some(pattern => 
              meshName.includes(pattern)
            );
            
            const isLineSystem = mesh.getClassName() === 'LinesMesh';
            
            return !isHelperObject && !isLineSystem;
          });
          
          console.log('🔍 OBJ Export - Found meshes:', exportableMeshes.map(m => `${m.name} (${m.getClassName()})`));
          
          if (exportableMeshes.length === 0) {
            showAlert(
              'No Exportable Objects',
              'No 3D objects found to export. Please add some shapes, import models, or create objects in the scene.',
              'warning'
            );
            return;
          }
          
          // Export ALL objects in the scene as a single model
          console.log(`📤 Exporting OBJ for ${exportableMeshes.length} objects:`, exportableMeshes.map(m => m.name));
          
          let blob: Blob;
          
          if (exportableMeshes.length === 1) {
            // Single object - export directly
            blob = exportOBJ(exportableMeshes[0] as any);
          } else {
            // Multiple objects - OBJ format can handle multiple meshes
            console.log('📦 Exporting multiple objects as OBJ...');
            blob = exportOBJ(exportableMeshes as any);
          }
          
          downloadBlob(blob, `sphaire_model_${timestamp}.obj`);
          break;
        }
        
        case 'GLTF': {
          // EXPERT GLTF: Create a clean scene copy without grid/helpers
          console.log('🔍 GLTF Export - Creating clean scene copy...');
          
          // Create temporary scene for clean export
          const cleanScene = new BABYLON.Scene(scene.getEngine());
          
          // Copy only exportable meshes to clean scene
          const exportableMeshes = scene.meshes.filter(mesh => {
            if (!mesh.geometry || !mesh.isVisible) return false;
            
            const excludePatterns = [
              'transparentGrid', 'centerAxis', 'grid', 'axis',
              'helper', 'gizmo', 'camera', 'light'
            ];
            
            const meshName = mesh.name.toLowerCase();
            const isHelperObject = excludePatterns.some(pattern => 
              meshName.includes(pattern)
            );
            
            const isLineSystem = mesh.getClassName() === 'LinesMesh';
            
            return !isHelperObject && !isLineSystem;
          });
          
          console.log('📋 Copying meshes to clean scene:', exportableMeshes.map(m => m.name));
          
          // Clone meshes to clean scene
          for (const mesh of exportableMeshes) {
            const clonedMesh = mesh.clone(`clean_${mesh.name}`, null);
            if (clonedMesh) {
              clonedMesh.setParent(null);
              clonedMesh.parent = null;
            }
          }
          
          // Add basic lighting for proper GLTF export
          new BABYLON.HemisphericLight('exportLight', new BABYLON.Vector3(0, 1, 0), cleanScene);
          
          try {
            const blob = await exportGLTF(cleanScene);
            downloadBlob(blob, `sphaire_scene_${timestamp}.glb`);
            
            // Cleanup temporary scene
            cleanScene.dispose();
            console.log('✅ Clean GLTF export completed');
          } catch (error) {
            cleanScene.dispose();
            throw error;
          }
          break;
        }
        
        case 'STEP': {
          // EXPERT STEP EXPORT: Check for available CAD shapes
          console.log('🔍 STEP Export - Checking for available shapes...');
          
          // Check if we have any CAD shapes from the store
          const availableShapes = shapes ? Object.keys(shapes) : [];
          console.log('📋 Available shapes in store:', availableShapes);
          
          if (availableShapes.length === 0) {
            showAlert(
              'No CAD Shapes Available',
              'STEP export requires CAD shapes created with parametric modeling tools. Currently only mesh-based objects are in the scene.\n\nTo export STEP files:\n1. Use the CAD modeling tools\n2. Create parametric shapes\n3. Then export as STEP',
              'info'
            );
            return;
          }
          
          // STEP export implementation would go here
          // This requires the OpenCascade.js integration to be fully set up
          showAlert(
            'STEP Export Implementation',
            'STEP export functionality requires additional OpenCascade.js integration. The CAD shapes are available but the export pipeline needs to be completed.\n\nThis is a complex feature that requires:\n1. CAD shape serialization\n2. OpenCascade STEP writer\n3. Browser-compatible file generation',
            'warning'
          );
          break;
        }
        
        default:
          showAlert(
            'Unsupported Format',
            'Unsupported export format.',
            'error'
          );
          return;
      }
      
      showAlert(
        'Export Successful!',
        `Your ${format} file has been downloaded successfully.`,
        'success'
      );
      
    } catch (error) {
      console.error('❌ Export failed:', error);
      showAlert(
        'Export Failed',
        `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'error'
      );
    } finally {
      setIsExporting(false);
    }
  }, [scene, showAlert]);

  const exportFormats = [
    { name: 'STL', description: 'For 3D printing', icon: '🖨️' },
    { name: 'OBJ', description: 'Universal 3D format', icon: '📦' },
    { name: 'GLTF', description: 'Web-optimized scene', icon: '🌐' },
    { name: 'STEP', description: 'CAD format (beta)', icon: '⚙️' }
  ];

  /**
   * DELETE SELECTED OBJECT HANDLER
   * Handles both AI-generated shapes and imported meshes
   */
  const handleDeleteSelected = useCallback(() => {
    if (!selectedShapeId || !scene) {
      showAlert(
        'No Selection',
        'Please select an object first before deleting.',
        'warning'
      );
      return;
    }
    
    // Check if it's an AI-generated shape in store
    const selectedShape = shapes.find(shape => shape.id === selectedShapeId);
    
    // Check if it's an imported mesh
    const importedMeshes = scene.metadata?.importedMeshes || [];
    const selectedImportedMesh = importedMeshes.find((mesh: any) => mesh.uniqueId === selectedShapeId || mesh.id === selectedShapeId);
    
    // Check if it's an AI-generated mesh (not in shapes store but in scene)
    const aiGeneratedMeshes = scene.metadata?.aiGeneratedMeshes || [];
    const selectedAIMesh = aiGeneratedMeshes.find((mesh: any) => mesh.uniqueId === selectedShapeId || mesh.id === selectedShapeId);
    
    // Find mesh in scene by ID for AI-generated meshes
    const sceneAIMesh = scene.meshes.find(m => m.id === selectedShapeId || m.uniqueId.toString() === selectedShapeId);
    
    let objectName = 'Unknown Object';
    let objectType = 'unknown';
    
    if (selectedShape) {
      objectName = selectedShape.name || selectedShape.id;
      objectType = 'shape';
    } else if (selectedImportedMesh) {
      objectName = selectedImportedMesh.name || selectedImportedMesh.id || 'Imported Object';
      objectType = 'imported';
    } else if (selectedAIMesh || sceneAIMesh) {
      objectName = (selectedAIMesh?.name || sceneAIMesh?.name) || 'AI Generated Model';
      objectType = 'ai-generated';
    }
    
    showConfirm(
      'Delete Object',
      `Are you sure you want to delete "${objectName}"?\n\nThis action cannot be undone.`,
      () => {
        if (objectType === 'imported') {
          // Delete imported mesh from scene and metadata
          const meshToDelete = scene.getMeshByUniqueID(parseInt(selectedShapeId)) || 
                              scene.meshes.find(m => m.id === selectedShapeId);
          
          if (meshToDelete) {
            meshToDelete.dispose();
            console.log('🗑️ Deleted imported mesh:', objectName);
          }
          
          // 🚨 UNIFIED STORE ARCHITECTURE: No longer using scene.metadata.importedMeshes
          // All model deletion is now handled by the store-based system
          // Legacy metadata filtering logic removed (previously filtered by uniqueId and id)
        } else if (objectType === 'ai-generated') {
          // Delete AI-generated mesh from scene and metadata
          const meshToDelete = scene.getMeshByUniqueID(parseInt(selectedShapeId)) || 
                              scene.meshes.find(m => m.id === selectedShapeId || m.uniqueId.toString() === selectedShapeId);
          
          if (meshToDelete) {
            meshToDelete.dispose();
            console.log('🗑️ Deleted AI-generated mesh:', objectName);
          }
          
          // Remove from AI-generated meshes metadata
          if (scene.metadata?.aiGeneratedMeshes) {
            scene.metadata.aiGeneratedMeshes = scene.metadata.aiGeneratedMeshes.filter(
              (mesh: any) => mesh.uniqueId !== selectedShapeId && mesh.id !== selectedShapeId && mesh.uniqueId.toString() !== selectedShapeId
            );
          }
        } else if (objectType === 'shape') {
          // Delete shape from store
          removeShape(selectedShapeId);
        }
        
        showAlert(
          'Object Deleted',
          `"${objectName}" has been successfully deleted from the scene.`,
          'success'
        );
      }
    );
  }, [selectedShapeId, shapes, scene, removeShape, showAlert, showConfirm]);

  const handleSignOut = useCallback(() => {
    showConfirm(
      'Sign Out',
      'Are you sure you want to sign out? Any unsaved changes will be lost.',
      async () => {
        await signOut();
        router.push('/login');
      }
    );
  }, [signOut, router, showConfirm]);

  const copyShareLink = useCallback(() => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      showAlert(
        'Link Copied',
        'The share link has been copied to your clipboard.',
        'success'
      );
    }
  }, [showAlert]);

  const handleShare = useCallback(() => {
    setShowShareModal(true);
  }, []);
  
  // Handle saving design
  const handleSaveDesign = useCallback(async () => {
    if (!scene) {
      showAlert(
        'Scene Not Ready',
        'Scene not ready. Please wait for the 3D environment to load.',
        'error'
      );
      return;
    }
    
    try {
      // Show saving indicator
      showAlert(
        'Saving Design',
        'Saving your design...',
        'info'
      );
      
      // Get scene data to save - safely serialize only essential properties
      const sceneData = {
        objects: shapes.map(shape => {
          // Create a safe serializable object by explicitly selecting only the properties we need
          const safeShape: any = {
            id: shape.id,
            type: shape.type,
            position: shape.position,
            rotation: shape.rotation,
            scaling: shape.scaling
          };
          
          // Add optional properties if they exist
          if (shape.color) safeShape.color = shape.color;
          if (shape.material) safeShape.material = shape.material;
          if (shape.name) safeShape.name = shape.name;
          
          // Handle type-specific properties using discriminated union
          if (shape.type === 'box' && 'dimensions' in shape) {
            safeShape.dimensions = shape.dimensions;
          }
          if (shape.type === 'sphere' && 'radius' in shape) {
            safeShape.radius = shape.radius;
          }
          if (shape.type === 'cylinder' && 'height' in shape && 'diameter' in shape) {
            safeShape.height = shape.height;
            safeShape.diameter = shape.diameter;
          }
          if (shape.type === 'custom' && 'meshData' in shape && shape.meshData) {
            safeShape.meshData = {
              positions: Array.from(shape.meshData.positions),
              indices: Array.from(shape.meshData.indices)
            };
          }
          if (shape.type === 'model' && 'format' in shape && 'fileName' in shape && 'data' in shape) {
            safeShape.format = shape.format;
            safeShape.fileName = shape.fileName;
            safeShape.data = shape.data;
            if (shape.originalSize) safeShape.originalSize = shape.originalSize;
          }
          
          // Explicitly exclude babylonMesh and other non-serializable properties
          return safeShape;
        }),
        // 🚨 UNIFIED STORE ARCHITECTURE: No longer using scene.metadata
        // All data is now stored in the unified store for perfect serialization
        metadata: {
          version: '2.0',
          architecture: 'unified-store',
          timestamp: new Date().toISOString(),
          objectCount: shapes.length
        }
      };
      
      // If we have a user, save to Supabase
      if (user) {
        const { data, error } = await supabase
          .from('design_files')
          .insert([
            {
              owner_id: user.id,
              name: `Design ${new Date().toLocaleDateString()}`,
              content: JSON.stringify(sceneData),
              is_shared: false,
              shared_with: []
            }
          ])
          .select()
          .single();
          
        if (error) {
          throw new Error(error.message);
        }
        
        showAlert(
          'Design Saved',
          'Your design has been saved successfully!',
          'success'
        );
        
        // Redirect to the design page
        router.push(`/design/${data.id}`);
      } else {
        // For non-logged in users, save to local storage
        localStorage.setItem('sphaire_temp_design', JSON.stringify(sceneData));
        
        showAlert(
          'Design Saved Locally',
          'Your design has been saved locally. Sign in to save it to your account.',
          'success'
        );
      }
    } catch (error) {
      console.error('Failed to save design:', error);
      showAlert(
        'Save Failed',
        `Failed to save design: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'error'
      );
    }
  }, [scene, shapes, user, router, showAlert, supabase]);

  return (
    <div className="bg-gradient-to-r from-gray-900 to-black text-white p-4 flex justify-between items-center shadow-lg border-b border-pink-400/20">
      {/* Logo and Title */}
      <div className="flex items-center space-x-3">
        <a 
          href="https://sphaire3d.com" 
          target="_blank" 
          rel="noopener noreferrer"
          className="hover:opacity-80 transition-opacity"
        >
          <img 
            src="/sphaire-img/sphaire.png" 
            alt="Sphaire Logo" 
            className="w-8 h-8 object-contain"
            onError={(e) => {
              // Fallback if logo image fails to load
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </a>
        <Link href="/dashboard">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-300 to-pink-500 bg-clip-text text-transparent cursor-pointer hover:opacity-80 transition-opacity">
            Sphaire
          </h1>
        </Link>
        <div className="text-xs text-gray-400 ml-2 self-end mb-1">
          <span className="bg-gray-800/50 px-2 py-1 rounded border border-gray-600/30">
            web v1 <span className="text-yellow-400">(beta)</span>
          </span>
        </div>
      </div>
      
      {/* Thingi10K Search Bar */}
      <div className="flex-1 max-w-md mx-8 relative">
        <div className="relative">
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search models (e.g., 'screw', 'bracket', 'gear')..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="w-full pl-10 pr-10 py-3 bg-gray-800/90 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-pink-400/80 focus:ring-2 focus:ring-pink-400/20 focus:bg-gray-800 transition-all duration-300 text-sm backdrop-blur-sm"
          />
          {isSearchLoading && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-pink-400 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
          {/* Search Icon - Will be replaced with custom icon */}
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm font-medium">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
        
        {/* Search Results Dropdown */}
        {showSearchResults && searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-50 max-h-80 overflow-y-auto">
            {searchResults.map((model) => (
              <div
                key={model.id}
                onClick={() => handleModelSelect(model)}
                className="px-4 py-3 hover:bg-gray-700 cursor-pointer border-b border-gray-700 last:border-b-0 transition-colors duration-150"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="text-white font-medium text-sm">{model.name}</div>
                    <div className="text-gray-400 text-xs mt-1">
                      {model.format.toUpperCase()} • ID: {model.id}
                    </div>
                    {model.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {model.tags.slice(0, 4).map((tag: string, tagIndex: number) => (
                          <span
                            key={tagIndex}
                            className="px-2 py-1 bg-pink-900/30 text-pink-300 text-xs rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                        {model.tags.length > 4 && (
                          <span className="text-gray-500 text-xs">+{model.tags.length - 4} more</span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="text-gray-500 text-xs ml-4">
                    Click to load →
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* No Results Message */}
        {showSearchResults && searchResults.length === 0 && searchQuery.trim() && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-50">
            <div className="px-4 py-3 text-gray-400 text-sm text-center">
              No models found for "{searchQuery}"
            </div>
          </div>
        )}
        
        {/* Search Index Status */}
        {searchIndex.length === 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-50">
            <div className="px-4 py-3 text-yellow-400 text-sm text-center">
              ⚠️ Search index not loaded. Run metadata extraction first.
            </div>
          </div>
        )}
      </div>
      
      {/* Action Buttons */}
      <div className="flex items-center space-x-4">
        {/* Share Button */}
        <button
          data-share-button
          onClick={handleShare}
          className="px-5 py-2.5 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg border bg-black text-pink-400 hover:text-pink-300 border-pink-400/20 hover:border-pink-400/40 hover:shadow-lg hover:shadow-pink-400/20"
          title="Share your design"
        >
          <div className="flex items-center space-x-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
            </svg>
            <span>Share</span>
          </div>
        </button>
        
        {/* Import Button with Progress */}
        <button
          onClick={handleImportClick}
          disabled={isImporting}
          className={`px-5 py-2.5 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg border relative group ${
            isImporting
              ? 'bg-gray-800 text-gray-400 cursor-not-allowed opacity-50 border-gray-600'
              : 'bg-black text-pink-400 hover:text-pink-300 border-pink-400/20 hover:border-pink-400/40 hover:shadow-lg hover:shadow-pink-400/20'
          }`}
          title="Import 3D models (.glb, .gltf, .obj, .stl)"
        >
          {isImporting ? (
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-pink-400 border-t-transparent rounded-full animate-spin"></div>
              <span>Importing...</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
              <span>Import</span>
            </div>
          )}
        </button>
        
        {/* Export Button with Dropdown */}
        <div className="relative" ref={exportDropdownRef}>
          <button
            onClick={() => setShowExportDropdown(!showExportDropdown)}
            disabled={isExporting}
            className={`px-5 py-2.5 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg border flex items-center space-x-2 group ${
              isExporting
                ? 'bg-gray-800 text-gray-400 cursor-not-allowed opacity-50 border-gray-600'
                : 'bg-black text-pink-400 hover:text-pink-300 border-pink-400/20 hover:border-pink-400/40 hover:shadow-lg hover:shadow-pink-400/20'
            }`}
            title="Export 3D models"
          >
            {isExporting ? (
              <>
                <div className="w-4 h-4 border-2 border-pink-400 border-t-transparent rounded-full animate-spin"></div>
                <span>Exporting...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3V8" />
                </svg>
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
            <div className="absolute top-full left-0 mt-2 w-72 bg-gray-900/95 border border-pink-400/20 rounded-xl shadow-xl z-50 backdrop-blur-sm">
              <div className="p-3">
                <div className="text-xs text-gray-400 mb-3 px-2 font-medium">Export formats:</div>
                {exportFormats.map((format) => (
                  <div key={format.name} className="flex items-center justify-between p-3 hover:bg-gray-800/50 rounded-lg group transition-all duration-200">
                    <div className="flex items-center space-x-3">
                      <span className="text-lg">{format.icon}</span>
                      <div>
                        <div className="text-pink-400 font-medium text-sm">{format.name}</div>
                        <div className="text-xs text-gray-500">{format.description}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleExport(format.name)}
                      className="opacity-0 group-hover:opacity-100 transition-all duration-200 bg-pink-600 hover:bg-pink-500 text-white p-2 rounded-lg text-xs flex items-center space-x-1.5 transform hover:scale-105 shadow-md"
                      title={`Download ${format.name}`}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        
        {/* Save Button */}
        <button
          onClick={handleSaveDesign}
          className="px-5 py-2.5 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg border bg-black text-pink-400 hover:text-pink-300 border-pink-400/20 hover:border-pink-400/40 hover:shadow-lg hover:shadow-pink-400/20"
          title="Save your design"
        >
          <div className="flex items-center space-x-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            <span>Save</span>
          </div>
        </button>
        
        <button
          onClick={handleDeleteSelected}
          disabled={!selectedShapeId}
          className={`px-5 py-2.5 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg border group ${
            selectedShapeId
              ? 'bg-red-900/30 text-red-400 hover:text-red-300 border-red-400/30 hover:border-red-400/50 hover:shadow-lg hover:shadow-red-400/20 hover:bg-red-900/50'
              : 'bg-gray-800 text-gray-500 cursor-not-allowed opacity-50 border-gray-600'
          }`}
          title={selectedShapeId ? 'Delete selected object' : 'No object selected'}
        >
          <div className="flex items-center space-x-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span>Delete</span>
          </div>
        </button>
        
        {/* Account Button with Dropdown */}
        <div className="relative" ref={accountDropdownRef}>
          <button
            onClick={() => setShowAccountDropdown(!showAccountDropdown)}
            className="px-5 py-2.5 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg border bg-black text-pink-400 hover:text-pink-300 border-pink-400/20 hover:border-pink-400/40 hover:shadow-lg hover:shadow-pink-400/20 flex items-center space-x-2"
            title="Account options"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span>Account</span>
            <svg 
              className={`w-4 h-4 transition-transform duration-200 ${
                showAccountDropdown ? 'rotate-180' : ''
              }`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {showAccountDropdown && (
            <div className="absolute top-full right-0 mt-2 w-64 bg-gray-900/95 border border-pink-400/20 rounded-xl shadow-xl z-50 backdrop-blur-sm">
              <div className="p-4 border-b border-gray-700/50">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white font-bold">
                    {user?.email ? user.email[0].toUpperCase() : '?'}
                  </div>
                  <div>
                    <div className="text-white font-medium">{user?.email?.split('@')[0]}</div>
                    <div className="text-gray-400 text-xs truncate">{user?.email}</div>
                  </div>
                </div>
              </div>
              
              <div className="p-2">
                <Link href="/dashboard">
                  <div className="flex items-center space-x-3 p-3 hover:bg-gray-800/50 rounded-lg transition-colors">
                    <svg className="w-5 h-5 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                    <span className="text-white">Dashboard</span>
                  </div>
                </Link>
                
                <button 
                  onClick={handleSignOut}
                  className="w-full flex items-center space-x-3 p-3 hover:bg-gray-800/50 rounded-lg transition-colors text-left"
                >
                  <svg className="w-5 h-5 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span className="text-white">Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div 
            ref={shareModalRef}
            className="bg-gray-900 border border-pink-400/30 rounded-xl shadow-xl p-6 max-w-md w-full mx-4"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">Share Your Design</h3>
              <button 
                onClick={() => setShowShareModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-300 mb-4">Share this link with others to let them view your design:</p>
              <div className="flex">
                <input 
                  type="text" 
                  value={typeof window !== 'undefined' ? window.location.href : ''}
                  readOnly
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-l-lg px-4 py-3 text-white focus:outline-none focus:border-pink-400"
                />
                <button
                  onClick={copyShareLink}
                  className="bg-pink-600 hover:bg-pink-500 text-white px-4 py-3 rounded-r-lg transition-colors"
                >
                  Copy
                </button>
              </div>
            </div>
            
            <div className="border-t border-gray-700 pt-4">
              <h4 className="text-white font-medium mb-3">Sharing Options</h4>
              <div className="space-y-3">
                <div className="flex items-center">
                  <input 
                    type="checkbox" 
                    id="view-only" 
                    className="w-5 h-5 rounded border-gray-600 text-pink-500 focus:ring-pink-500 bg-gray-800"
                    defaultChecked
                  />
                  <label htmlFor="view-only" className="ml-3 text-gray-300">
                    View only (recommended)
                  </label>
                </div>
                <div className="flex items-center">
                  <input 
                    type="checkbox" 
                    id="allow-edit" 
                    className="w-5 h-5 rounded border-gray-600 text-pink-500 focus:ring-pink-500 bg-gray-800"
                  />
                  <label htmlFor="allow-edit" className="ml-3 text-gray-300">
                    Allow editing
                  </label>
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowShareModal(false)}
                className="bg-pink-600 hover:bg-pink-500 text-white px-6 py-3 rounded-lg transition-colors shadow-lg"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".glb,.gltf,.obj,.stl"
        onChange={handleFileSelect}
        className="hidden"
      />
      
      {/* Import Progress Overlay */}
      {importProgress && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-900 text-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-6 h-6 border-3 border-pink-400 border-t-transparent rounded-full animate-spin"></div>
              <h3 className="text-lg font-bold">Importing 3D Model</h3>
            </div>
            <p className="text-gray-300">{importProgress}</p>
            <div className="mt-4 w-full bg-gray-700 rounded-full h-2">
              <div className="bg-pink-400 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HeaderPerfect;
