import React, { createContext, useContext, useRef, useState, useCallback } from 'react';
import {
  Engine, Scene, Camera, AbstractMesh, Vector3
} from '@babylonjs/core';
import EditControlManager from '../utils/EditControlIntegration';

interface BabylonContextValue {
  // Core Babylon.js references
  engine: Engine | null;
  scene: Scene | null;
  camera: Camera | null;
  canvas: HTMLCanvasElement | null;
  
  editControlManager: EditControlManager | null;
  
  // Selection system (following external patterns)
  selectedMeshes: AbstractMesh[];
  setSelectedMeshes: (meshes: AbstractMesh[]) => void;
  selectMesh: (mesh: AbstractMesh, addToSelection?: boolean) => void;
  deselectMesh: (mesh: AbstractMesh) => void;
  clearSelection: () => void;
  
  transformMode: 'translate' | 'rotate' | 'scale';
  setTransformMode: (mode: 'translate' | 'rotate' | 'scale') => void;
  isTransforming: boolean;
  
  startMarqueeSelection: (startPoint: Vector3) => void;
  updateMarqueeSelection: (currentPoint: Vector3) => void;
  endMarqueeSelection: () => void;
  isMarqueeSelecting: boolean;
  
  undo: () => boolean;
  redo: () => boolean;
  canUndo: () => boolean;
  canRedo: () => boolean;
  
  initializeBabylon: (engine: Engine, scene: Scene, camera: Camera, canvas: HTMLCanvasElement) => void;
  cleanup: () => void;
}

const BabylonContext = createContext<BabylonContextValue | null>(null);

// Context provider component (following external repository patterns)
export const BabylonProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [engine, setEngine] = useState<Engine | null>(null);
  const [scene, setScene] = useState<Scene | null>(null);
  const [camera, setCamera] = useState<Camera | null>(null);
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  
  const [editControlManager, setEditControlManager] = useState<EditControlManager | null>(null);
  
  // Selection system state (following external patterns)
  const [selectedMeshes, setSelectedMeshes] = useState<AbstractMesh[]>([]);
  const [transformMode, setTransformMode] = useState<'translate' | 'rotate' | 'scale'>('translate');
  const [isTransforming, setIsTransforming] = useState<boolean>(false);
  
  const [isMarqueeSelecting, setIsMarqueeSelecting] = useState<boolean>(false);
  const marqueeStartRef = useRef<Vector3 | null>(null);
  const marqueeEndRef = useRef<Vector3 | null>(null);

  const initializeBabylon = useCallback((
    engineInstance: Engine, 
    sceneInstance: Scene, 
    cameraInstance: Camera, 
    canvasInstance: HTMLCanvasElement
  ) => {
    console.log('🚀 BabylonProvider: Initializing Babylon.js systems...');
    
    setEngine(engineInstance);
    setScene(sceneInstance);
    setCamera(cameraInstance);
    setCanvas(canvasInstance);
    
    const manager = new EditControlManager(sceneInstance, cameraInstance, canvasInstance);
    manager.setupKeyboardShortcuts();
    setEditControlManager(manager);
    
    console.log('✅ BabylonProvider: Babylon.js systems initialized');
  }, []);
  const selectMesh = useCallback((mesh: AbstractMesh, addToSelection = false) => {
    if (!mesh) return;
    
    setSelectedMeshes(prev => {
      if (addToSelection) {
        // Add to selection if not already selected
        if (!prev.find(m => m.uniqueId === mesh.uniqueId)) {
          return [...prev, mesh];
        }
        return prev;
      } else {
        // Replace selection
        return [mesh];
      }
    });
    
    console.log(`🎯 Selected mesh: ${mesh.name}${addToSelection ? ' (added to selection)' : ''}`);
  }, []);

  const deselectMesh = useCallback((mesh: AbstractMesh) => {
    setSelectedMeshes(prev => prev.filter(m => m.uniqueId !== mesh.uniqueId));
    console.log(`🎯 Deselected mesh: ${mesh.name}`);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedMeshes([]);
    console.log('🎯 Selection cleared');
  }, []);

  // Multi-selection methods (following marquee selection patterns)
  const startMarqueeSelection = useCallback((startPoint: Vector3) => {
    marqueeStartRef.current = startPoint.clone();
    setIsMarqueeSelecting(true);
    console.log('🔲 Started marquee selection');
  }, []);

  const updateMarqueeSelection = useCallback((currentPoint: Vector3) => {
    if (!isMarqueeSelecting || !marqueeStartRef.current) return;
    
    marqueeEndRef.current = currentPoint.clone();
    // TODO: Implement marquee box visual feedback
  }, [isMarqueeSelecting]);

  const endMarqueeSelection = useCallback(() => {
    if (!isMarqueeSelecting || !marqueeStartRef.current || !marqueeEndRef.current || !scene) return;
    
    // TODO: Implement actual marquee selection logic using GPU picking
    // For now, just clear marquee state
    setIsMarqueeSelecting(false);
    marqueeStartRef.current = null;
    marqueeEndRef.current = null;
    console.log('🔲 Ended marquee selection');
  }, [isMarqueeSelecting, scene]);

  // Transform methods are handled directly in the components via editControlManager

  // Undo/Redo methods (following EditControl patterns)
  const undo = useCallback(() => {
    return editControlManager ? editControlManager.undo() : false;
  }, [editControlManager]);

  const redo = useCallback(() => {
    return editControlManager ? editControlManager.redo() : false;
  }, [editControlManager]);

  const canUndo = useCallback(() => {
    return editControlManager ? editControlManager.canUndo() : false;
  }, [editControlManager]);

  const canRedo = useCallback(() => {
    return editControlManager ? editControlManager.canRedo() : false;
  }, [editControlManager]);

  // Cleanup method
  const cleanup = useCallback(() => {
    console.log('🧹 BabylonProvider: Cleaning up...');
    
    if (editControlManager) {
      editControlManager.dispose();
      setEditControlManager(null);
    }
    
    setSelectedMeshes([]);
    setIsTransforming(false);
    setIsMarqueeSelecting(false);
    
    setEngine(null);
    setScene(null);
    setCamera(null);
    setCanvas(null);
    
    console.log('✅ BabylonProvider: Cleanup complete');
  }, [editControlManager]);

  // Context value (following react-babylonjs patterns)
  const contextValue: BabylonContextValue = {
    // Core references
    engine,
    scene,
    camera,
    canvas,
    
    // Management systems
    editControlManager,
    
    // Selection system
    selectedMeshes,
    setSelectedMeshes,
    selectMesh,
    deselectMesh,
    clearSelection,
    
    // Transform system
    transformMode,
    setTransformMode,
    isTransforming,
    
    // Multi-selection system
    startMarqueeSelection,
    updateMarqueeSelection,
    endMarqueeSelection,
    isMarqueeSelecting,
    
    // Undo/Redo system
    undo,
    redo,
    canUndo,
    canRedo,
    
    // Initialization
    initializeBabylon,
    cleanup
  };

  return (
    <BabylonContext.Provider value={contextValue}>
      {children}
    </BabylonContext.Provider>
  );
};

// Custom hook for using Babylon context (following react-babylonjs patterns)
export const useBabylon = (): BabylonContextValue => {
  const context = useContext(BabylonContext);
  if (!context) {
    throw new Error('useBabylon must be used within a BabylonProvider');
  }
  return context;
};

// Hook for selection management (following external patterns)
export const useBabylonSelection = () => {
  const { selectedMeshes, selectMesh, deselectMesh, clearSelection } = useBabylon();
  
  return {
    selectedMeshes,
    selectMesh,
    deselectMesh,
    clearSelection,
    hasSelection: selectedMeshes.length > 0,
    selectedCount: selectedMeshes.length
  };
};

// Hook for transform management (following EditControl patterns)
export const useBabylonTransform = () => {
  const { 
    transformMode, 
    setTransformMode, 
    isTransforming, 
    undo, 
    redo, 
    canUndo, 
    canRedo 
  } = useBabylon();
  
  return {
    transformMode,
    setTransformMode,
    isTransforming,
    undo,
    redo,
    canUndo,
    canRedo
  };
};

export default BabylonContext;
