/**
 * UNIFIED GIZMO REACT INTEGRATION HOOK
 * 
 * React hook providing clean integration with UnifiedGizmoSystem
 * Replaces both AdvancedGizmoSystem and useLighting.ts approaches
 * Features:
 * ✅ Single source of truth for all gizmo interactions
 * ✅ React state synchronization 
 * ✅ Automatic cleanup and lifecycle management
 * ✅ Unified undo/redo integration
 * ✅ Type-safe API for mesh and light manipulation
 */

import { useCallback, useRef, useEffect, useState } from 'react';
import { Scene, Camera } from '@babylonjs/core';
import UnifiedGizmoSystem, { 
  GizmoMode, 
  CoordinateSpace, 
  SelectableObject, 
  GizmoSettings, 
  TransformState,
  GizmoCallbacks 
} from '../utils/UnifiedGizmoSystem';

export interface UseUnifiedGizmoOptions {
  settings?: Partial<GizmoSettings>;
  onTransformStart?: (object: SelectableObject, mode: GizmoMode) => void;
  onTransformEnd?: (object: SelectableObject, mode: GizmoMode, previousState: TransformState, newState: TransformState) => void;
  onSelectionChanged?: (object: SelectableObject | null) => void;
  onModeChanged?: (mode: GizmoMode) => void;
}

export interface UseUnifiedGizmoReturn {
  // Core API
  selectObject: (object: SelectableObject | null) => void;
  setMode: (mode: GizmoMode) => void;
  
  // Settings
  setCoordinateSpace: (space: CoordinateSpace) => void;
  setSnapEnabled: (enabled: boolean) => void;
  updateSettings: (settings: Partial<GizmoSettings>) => void;
  
  // Undo/Redo
  undo: () => boolean;
  redo: () => boolean;
  canUndo: boolean;
  canRedo: boolean;
  
  // Light-specific methods (for UI compatibility)
  activateLightGizmo: (lightName: string, gizmoMode: 'position' | 'rotation') => void;
  hideLightHelpers: () => void;
  showLightHelpers: () => void;
  
  // State
  currentSelection: SelectableObject | null;
  currentMode: GizmoMode;
  isInitialized: boolean;
}

export const useUnifiedGizmo = (
  scene: Scene | null,
  camera: Camera | null,
  canvas: HTMLCanvasElement | null,
  options: UseUnifiedGizmoOptions = {}
): UseUnifiedGizmoReturn => {
  
  // ✅ BULLETPROOF GIZMO LIFECYCLE MANAGEMENT - EXPERT PATTERN
  // Core state
  const gizmoSystemRef = useRef<UnifiedGizmoSystem | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentSelection, setCurrentSelection] = useState<SelectableObject | null>(null);
  const [currentMode, setCurrentMode] = useState<GizmoMode>('none');
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  
  // 🎯 EXPERT PATTERN: Initialize GizmoManager ONCE with stable dependencies
  useEffect(() => {
    if (!scene || !camera || !canvas) {
      console.log('⏳ useUnifiedGizmo: Waiting for scene/camera/canvas...');
      return;
    }
    
    if (gizmoSystemRef.current) {
      console.log('✅ useUnifiedGizmo: System already initialized');
      return;
    }
    
    console.log('🚀 useUnifiedGizmo: Initializing GizmoManager ONCE...');
    
    try {
      // Create stable callbacks that are setup ONCE and persist
      const callbacks: GizmoCallbacks = {
        onSelectionChanged: (object) => {
          console.log('🎯 Selection changed to:', object?.name || 'null');
          // Defer state update to prevent re-render during interaction
          requestAnimationFrame(() => {
            setCurrentSelection(object);
            options.onSelectionChanged?.(object);
          });
        },
        onModeChanged: (mode) => {
          console.log('🔄 Mode changed to:', mode);
          requestAnimationFrame(() => {
            setCurrentMode(mode);
            options.onModeChanged?.(mode);
          });
        },
        onTransformStart: (object, mode) => {
          console.log('🎨 Transform START:', object.name, mode);
          options.onTransformStart?.(object, mode);
        },
        onTransformEnd: (object, mode, prevState, newState) => {
          console.log('✅ Transform END:', object.name, mode);
          
          // CRITICAL: Defer ALL state updates until AFTER drag completes
          requestAnimationFrame(() => {
            if (gizmoSystemRef.current) {
              setCanUndo(gizmoSystemRef.current.canUndo);
              setCanRedo(gizmoSystemRef.current.canRedo);
            }
            // Call user callback after state updates
            options.onTransformEnd?.(object, mode, prevState, newState);
          });
        },
        onUndoRedoAction: () => {
          // Defer undo/redo state updates
          requestAnimationFrame(() => {
            if (gizmoSystemRef.current) {
              setCanUndo(gizmoSystemRef.current.canUndo);
              setCanRedo(gizmoSystemRef.current.canRedo);
            }
          });
        }
      };
      
      // Initialize with settings and callbacks - OBSERVERS SETUP ONCE HERE
      gizmoSystemRef.current = new UnifiedGizmoSystem(
        scene,
        camera,
        options.settings || {},
        callbacks
      );
      
      console.log('✅ UnifiedGizmoSystem created with stable observers');
      setIsInitialized(true);
      
      // Initial state sync
      setCanUndo(gizmoSystemRef.current.canUndo);
      setCanRedo(gizmoSystemRef.current.canRedo);
      
    } catch (error) {
      console.error('❌ Failed to create UnifiedGizmoSystem:', error);
      gizmoSystemRef.current = null;
      setIsInitialized(false);
    }
    
    // ✅ EXPERT PATTERN: Cleanup ONLY on unmount, never on state changes
    return () => {
      if (gizmoSystemRef.current) {
        console.log('🗑️ useUnifiedGizmo: Disposing on unmount ONLY');
        gizmoSystemRef.current.dispose();
        gizmoSystemRef.current = null;
        setIsInitialized(false);
      }
    };
  }, [scene]); // ✅ BULLETPROOF: Only scene dependency (camera is stable after scene init)
  
  // =============================================================================
  // CORE API METHODS
  // =============================================================================
  
  const selectObject = useCallback((object: SelectableObject | null) => {
    const debugInfo = {
      timestamp: Date.now(),
      objectName: object?.name || 'null',
      systemExists: !!gizmoSystemRef.current,
      isInitialized,
      currentSelection: currentSelection?.name || 'null',
      scene: !!scene,
      camera: !!camera,
      canvas: !!canvas,
      callStack: new Error().stack?.split('\n').slice(1, 4).join('\n')
    };
    
    console.log('🚀 DEBUGGING: useUnifiedGizmo.selectObject() called:', debugInfo);
    
    if (!gizmoSystemRef.current) {
      console.error('❌ DEBUGGING: selectObject FAILED - System not initialized:', debugInfo);
      return;
    }
    
    try {
      console.log('🎯 DEBUGGING: Calling gizmoSystemRef.current.select()...');
      gizmoSystemRef.current.select(object);
      
      console.log('🔄 DEBUGGING: Updating React state after selection...');
      setCurrentSelection(object);
      
      console.log('✅ DEBUGGING: selectObject completed successfully at', Date.now());
    } catch (error) {
      console.error('🚨 DEBUGGING: Error during selectObject:', error);
      console.error('🚨 DEBUGGING: Error stack:', (error as Error).stack);
    }
  }, [isInitialized, currentSelection, scene, camera, canvas]);
  
  const setMode = useCallback((mode: GizmoMode) => {
    if (!gizmoSystemRef.current) {
      console.warn('⚠️ useUnifiedGizmo: System not initialized, cannot set mode');
      return;
    }
    
    gizmoSystemRef.current.setMode(mode);
  }, []);
  
  // =============================================================================
  // SETTINGS METHODS
  // =============================================================================
  
  const setCoordinateSpace = useCallback((space: CoordinateSpace) => {
    if (!gizmoSystemRef.current) return;
    gizmoSystemRef.current.setCoordinateSpace(space);
  }, []);
  
  const setSnapEnabled = useCallback((enabled: boolean) => {
    if (!gizmoSystemRef.current) return;
    gizmoSystemRef.current.setSnapEnabled(enabled);
  }, []);
  
  const updateSettings = useCallback((settings: Partial<GizmoSettings>) => {
    if (!gizmoSystemRef.current) return;
    gizmoSystemRef.current.updateSettings(settings);
  }, []);
  
  // =============================================================================
  // UNDO/REDO METHODS
  // =============================================================================
  
  const undo = useCallback((): boolean => {
    if (!gizmoSystemRef.current) return false;
    
    const result = gizmoSystemRef.current.undo();
    if (result) {
      setCanUndo(gizmoSystemRef.current.canUndo);
      setCanRedo(gizmoSystemRef.current.canRedo);
    }
    return result;
  }, []);
  
  const redo = useCallback((): boolean => {
    if (!gizmoSystemRef.current) return false;
    
    const result = gizmoSystemRef.current.redo();
    if (result) {
      setCanUndo(gizmoSystemRef.current.canUndo);
      setCanRedo(gizmoSystemRef.current.canRedo);
    }
    return result;
  }, []);
  
  // =============================================================================
  // LIGHT-SPECIFIC METHODS (for UI compatibility)
  // =============================================================================
  
  const activateLightGizmo = useCallback((lightName: string, gizmoMode: 'position' | 'rotation') => {
    if (!scene || !gizmoSystemRef.current) {
      console.warn('⚠️ useUnifiedGizmo: Cannot activate light gizmo, system not ready');
      return;
    }
    
    // Find the light by name
    const light = scene.getLightByName(lightName);
    if (!light) {
      console.warn(`⚠️ useUnifiedGizmo: Light '${lightName}' not found`);
      return;
    }
    
    // Select the light and set the mode
    selectObject(light);
    setMode(gizmoMode);
    
    console.log(`✅ useUnifiedGizmo: Activated ${gizmoMode} gizmo for light: ${lightName}`);
  }, [scene, selectObject, setMode]);
  
  const hideLightHelpers = useCallback(() => {
    if (!gizmoSystemRef.current) return;
    gizmoSystemRef.current.hideLightHelpers();
  }, []);
  
  const showLightHelpers = useCallback(() => {
    if (!gizmoSystemRef.current) return;
    gizmoSystemRef.current.showLightHelpers();
  }, []);
  
  // =============================================================================
  // LIGHT-SPECIFIC METHODS (for UI compatibility)
  // =============================================================================
  
  // =============================================================================
  // RETURN API
  // =============================================================================
  
  return {
    // Core API
    selectObject,
    setMode,
    
    // Settings
    setCoordinateSpace,
    setSnapEnabled,
    updateSettings,
    
    // Undo/Redo
    undo,
    redo,
    canUndo,
    canRedo,
    
    // Light-specific methods (for UI compatibility)
    activateLightGizmo,
    hideLightHelpers,
    showLightHelpers,
    
    // State
    currentSelection,
    currentMode,
    isInitialized
  };
};

export default useUnifiedGizmo;
