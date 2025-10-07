/**
 * UNIFIED GIZMO SYSTEM - BABYLON.JS 8 ARCHITECTURE
 * 
 * Single unified system replacing AdvancedGizmoSystem + useLighting dual approach
 * Features:
 * Single GizmoManager + UtilityLayerRenderer (eliminates conflicts)
 * Plugin-based extensibility for future tools (measurement, constraints, CAD)
 * Unified undo/redo for all transforms (meshes + lights)
 * React integration with centralized state management
 * Performance optimized with gizmo reuse and proper cleanup
 * Light integration via LightGizmo + TransformNode helpers
 */

import {
  Scene, AbstractMesh, GizmoManager, Vector3, UtilityLayerRenderer, 
  Observer, Camera, DirectionalLight, Light, 
  Mesh, LightGizmo, Matrix, Constants
} from '@babylonjs/core';
import '@babylonjs/core/Gizmos/positionGizmo';
import '@babylonjs/core/Gizmos/rotationGizmo';
import '@babylonjs/core/Gizmos/scaleGizmo';
import '@babylonjs/core/Gizmos/boundingBoxGizmo';
import '@babylonjs/core/Gizmos/lightGizmo';

// =============================================================================
// CORE TYPES & INTERFACES
// =============================================================================

export type GizmoMode = 'position' | 'rotation' | 'scale' | 'boundingBox' | 'none';
export type CoordinateSpace = 'local' | 'world';
export type SelectableObject = AbstractMesh | Light;

export interface GizmoSettings {
  scaleRatio: number;
  snapDistance: number;
  rotationSnapValue: number;
  scaleSnapValue: number;
  coordinateSpace: CoordinateSpace;
  planarGizmoEnabled: boolean;
}

export interface TransformState {
  objectId: string;
  objectType: 'mesh' | 'light';
  position?: Vector3;
  rotation?: Vector3;
  scale?: Vector3;
  lightDirection?: Vector3;
  matrix?: Matrix;
}

export interface UndoRedoAction {
  type: 'transform';
  objectId: string;
  previousState: TransformState;
  newState: TransformState;
  timestamp: number;
}

export interface GizmoCallbacks {
  onTransformStart?: (object: SelectableObject, mode: GizmoMode) => void;
  onTransformEnd?: (object: SelectableObject, mode: GizmoMode, previousState: TransformState, newState: TransformState) => void;
  onSelectionChanged?: (object: SelectableObject | null) => void;
  onModeChanged?: (mode: GizmoMode) => void;
  onUndoRedoAction?: (action: UndoRedoAction) => void;
}

// =============================================================================
// PLUGIN ARCHITECTURE
// =============================================================================

export interface IGizmoPlugin {
  readonly name: string;
  readonly supportedObjectTypes: string[];
  readonly supportedModes: GizmoMode[];
  
  canHandle(object: SelectableObject, mode: GizmoMode): boolean;
  activate(object: SelectableObject, mode: GizmoMode, gizmoManager: GizmoManager): void;
  deactivate(): void;
  dispose(): void;
}

export abstract class BaseGizmoPlugin implements IGizmoPlugin {
  abstract readonly name: string;
  abstract readonly supportedObjectTypes: string[];
  abstract readonly supportedModes: GizmoMode[];
  
  protected scene: Scene;
  protected utilityLayer: UtilityLayerRenderer;
  protected isActive = false;
  protected observers: Observer<any>[] = [];
  
  constructor(scene: Scene, utilityLayer: UtilityLayerRenderer) {
    this.scene = scene;
    this.utilityLayer = utilityLayer;
  }
  
  abstract canHandle(object: SelectableObject, mode: GizmoMode): boolean;
  abstract activate(object: SelectableObject, mode: GizmoMode, gizmoManager: GizmoManager): void;
  
  deactivate(): void {
    this.isActive = false;
    this.cleanupObservers();
  }
  
  dispose(): void {
    this.deactivate();
  }
  
  protected cleanupObservers(): void {
    this.observers.forEach(observer => observer.remove());
    this.observers = [];
  }
  
  protected captureTransformState(object: SelectableObject): TransformState {
    const objectId = object.name || object.id;
    
    if (object instanceof AbstractMesh) {
      return {
        objectId,
        objectType: 'mesh',
        position: object.position.clone(),
        rotation: object.rotation.clone(),
        scale: object.scaling.clone(),
        matrix: object.getWorldMatrix().clone()
      };
    } else if (object instanceof Light) {
      const state: TransformState = {
        objectId,
        objectType: 'light'
      };
      
      if (object instanceof DirectionalLight) {
        state.lightDirection = object.direction.clone();
      }
      
      return state;
    }
    
    throw new Error(`Unsupported object type for transform state capture`);
  }
}

// =============================================================================
// UNIFIED GIZMO SYSTEM
// =============================================================================

export class UnifiedGizmoSystem {
  private scene: Scene;
  private camera: Camera;
  
  // Core Babylon.js gizmo infrastructure
  private gizmoManager: GizmoManager | null = null;
  private utilityLayerRenderer: UtilityLayerRenderer | null = null;
  
  // System state
  private currentMode: GizmoMode = 'none';
  private selectedObject: SelectableObject | null = null;
  private settings: GizmoSettings;
  private callbacks: GizmoCallbacks;
  
  // Plugin architecture
  private plugins = new Map<string, IGizmoPlugin>();
  
  // Undo/redo system
  private undoStack: UndoRedoAction[] = [];
  private redoStack: UndoRedoAction[] = [];
  private maxUndoStackSize = 100;
  
  // Light helpers for unified system
  private lightHelpers = new Map<string, { helper: Mesh, gizmo: LightGizmo }>();
  private observers: Observer<any>[] = [];
  private disposed = false;
  private gizmoMaterialConfigurer?: (gizmo: any) => void;
  
  constructor(
    scene: Scene,
    camera: Camera,
    settings?: Partial<GizmoSettings>,
    callbacks?: GizmoCallbacks
  ) {
    console.log('UnifiedGizmoSystem: Initializing with plugin architecture...');
    
    this.scene = scene;
    this.camera = camera;
    this.callbacks = callbacks || {};
    
    // Initialize settings with robust defaults
    this.settings = {
      scaleRatio: 1.0,
      snapDistance: 0.5,
      rotationSnapValue: Math.PI / 24, // 15 degrees
      scaleSnapValue: 0.1,
      coordinateSpace: 'world',
      planarGizmoEnabled: true,
      ...settings
    };
    
    this.initialize();
  }
  
  // =============================================================================
  // INITIALIZATION
  // =============================================================================
  
  private initialize(): void {
    try {
      console.log('UnifiedGizmoSystem: Setting up core infrastructure...');
      
      // Create utility layer renderer for gizmos
      this.utilityLayerRenderer = new UtilityLayerRenderer(this.scene, false);
      this.utilityLayerRenderer.shouldRender = true;
      
      // CRITICAL FIX: Set render camera and configure utility layer (from old working system)
      console.log('DEBUGGING: Setting utility layer render camera...');
      this.utilityLayerRenderer.setRenderCamera(this.camera);
      this.utilityLayerRenderer.utilityLayerScene.autoClearDepthAndStencil = false;
      
      // GIZMO VISIBILITY FIX: Configure utility layer to always render on top
      // This ensures gizmos are always visible even when objects are large
      this.utilityLayerRenderer.utilityLayerScene.autoClear = false;
      this.utilityLayerRenderer.utilityLayerScene.autoClearDepthAndStencil = false;
      
      // Create GizmoManager with utility layer
      this.gizmoManager = new GizmoManager(this.scene, /*thickness=*/1, this.utilityLayerRenderer);
      
      console.log('DEBUGGING: GizmoManager and UtilityLayer created with camera configuration:', {
        cameraSet: !!this.camera,
        cameraName: this.camera.name,
        utilityLayerExists: !!this.utilityLayerRenderer,
        gizmoManagerExists: !!this.gizmoManager
      });
      
      this.setupGizmoManager();
      
      // Apply initial settings
      this.applySettings();
      
      console.log('UnifiedGizmoSystem: Initialization complete');
      
    } catch (error) {
      console.error('UnifiedGizmoSystem: Initialization failed:', error);
      throw new Error(`Failed to initialize UnifiedGizmoSystem: ${error}`);
    }
  }
  
  private setupGizmoManager(): void {
    if (!this.gizmoManager) return;
    
    console.log('UnifiedGizmoSystem: Configuring GizmoManager with official patterns...');
    
    // Configure with official Babylon.js patterns
    this.gizmoManager.scaleRatio = this.settings.scaleRatio;
    this.gizmoManager.usePointerToAttachGizmos = false; // Manual control
    
    // Initial state - all gizmos disabled
    this.gizmoManager.positionGizmoEnabled = false;
    this.gizmoManager.rotationGizmoEnabled = false;
    this.gizmoManager.scaleGizmoEnabled = false;
    this.gizmoManager.boundingBoxGizmoEnabled = false;
    
    // Configure gizmos for always-on-top rendering
    this.configureGizmoVisibility();
  }
  
  /**
   * X-RAY GIZMO FIX: Configure gizmos to be visible THROUGH all objects
   * This creates an X-ray effect so gizmos are never hidden by large objects
   */
  private configureGizmoVisibility(): void {
    if (!this.gizmoManager) return;
    
    console.log('Configuring X-ray gizmo visibility (visible through all objects)...');
    
    // Function to apply X-ray effect to gizmo materials
    const configureXRayGizmoMaterials = (gizmo: any) => {
      if (!gizmo) return;
      
      // Get all meshes from the gizmo
      const gizmoMeshes = gizmo.gizmoLayer?.utilityLayerScene?.meshes || [];
      
      gizmoMeshes.forEach((mesh: any) => {
        if (mesh.material) {
          // X-RAY EFFECT: Make gizmo visible through all objects
          mesh.material.disableDepthWrite = true;  // Don't write to depth buffer
          mesh.material.depthFunction = Constants.ALWAYS; // Always pass depth test
          mesh.material.alphaMode = Constants.ALPHA_ADD; // Additive blending for visibility
          
          // Enhanced visibility settings
          mesh.material.backFaceCulling = false; // Render both sides
          mesh.renderingGroupId = 3; // Very high rendering group (renders last)
          
          // For materials with multiple sub-materials
          if (mesh.material.subMaterials) {
            mesh.material.subMaterials.forEach((subMat: any) => {
              if (subMat) {
                subMat.disableDepthWrite = true;
                subMat.depthFunction = Constants.ALWAYS;
                subMat.alphaMode = Constants.ALPHA_ADD;
                subMat.backFaceCulling = false;
              }
            });
          }
        }
        
        // Set very high rendering group for X-ray effect
        mesh.renderingGroupId = 3;
        mesh.alwaysOnTop = true; // Force always on top if supported
      });
    };
    
    // Configure existing gizmos with X-ray effect
    if (this.gizmoManager.gizmos) {
      configureXRayGizmoMaterials(this.gizmoManager.gizmos.positionGizmo);
      configureXRayGizmoMaterials(this.gizmoManager.gizmos.rotationGizmo);
      configureXRayGizmoMaterials(this.gizmoManager.gizmos.scaleGizmo);
      configureXRayGizmoMaterials(this.gizmoManager.gizmos.boundingBoxGizmo);
    }
    
    // Store the configuration function for later use when gizmos are created
    this.gizmoMaterialConfigurer = configureXRayGizmoMaterials;
    
    console.log('X-ray gizmo visibility configuration applied - gizmos now visible through all objects!');
  }
  
  // =============================================================================
  // PUBLIC API
  // =============================================================================
  
  select(object: SelectableObject | null): void {
    if (this.disposed) {
      console.error('DEBUGGING: select() called on DISPOSED system!');
      return;
    }
    
    console.log(`DEBUGGING: UnifiedGizmoSystem.select() called:`, {
      objectName: object?.name || 'null',
      currentSelection: this.selectedObject?.name || 'null',
      currentMode: this.currentMode,
      gizmoManagerExists: !!this.gizmoManager,
      systemDisposed: this.disposed,
      timestamp: Date.now()
    });
    
    if (this.selectedObject !== object) {
      console.log('DEBUGGING: Selection is changing, clearing current selection...');
      this.clearCurrentSelection();
      this.selectedObject = object;
      
      console.log('📢 DEBUGGING: Calling onSelectionChanged callback...');
      this.callbacks.onSelectionChanged?.(object);
      
      if (object && this.currentMode !== 'none') {
        console.log('DEBUGGING: Object selected and mode is not none, activating gizmo...');
        this.activateGizmoForSelection();
      } else {
        console.log('⏹️ DEBUGGING: No object or mode is none, not activating gizmo');
      }
    } else {
      console.log('➡️ DEBUGGING: Same object selected, no change needed');
    }
  }
  
  setMode(mode: GizmoMode): void {
    if (this.disposed) return;
    
    console.log(`UnifiedGizmoSystem: Setting mode to: ${mode}`);
    
    if (this.currentMode !== mode) {
      this.currentMode = mode;
      this.callbacks.onModeChanged?.(mode);
      
      // Enable the new gizmo mode immediately if we have an active selection
      if (this.selectedObject && mode !== 'none' && this.gizmoManager) {
        console.log(`DEBUGGING: Enabling new gizmo mode: ${mode}`);
        this.enableGizmoMode(mode);
      }
      
      // If we have a selected object, reactivate gizmo with new mode
      if (this.selectedObject && mode !== 'none') {
        this.activateGizmoForSelection();
      }
    }
  }
  
  // CRITICAL MISSING METHOD: Enable specific gizmo mode
  private enableGizmoMode(mode: GizmoMode): void {
    if (!this.gizmoManager) {
      console.error('DEBUGGING: enableGizmoMode called without GizmoManager');
      return;
    }
    
    console.log(`DEBUGGING: enableGizmoMode(${mode}) called`);
    
    // Disable all gizmos first
    this.gizmoManager.positionGizmoEnabled = false;
    this.gizmoManager.rotationGizmoEnabled = false;
    this.gizmoManager.scaleGizmoEnabled = false;
    this.gizmoManager.boundingBoxGizmoEnabled = false;
    
    // Enable the specific gizmo mode
    switch (mode) {
      case 'position':
        this.gizmoManager.positionGizmoEnabled = true;
        console.log('DEBUGGING: Position gizmo enabled');
        break;
      case 'rotation':
        this.gizmoManager.rotationGizmoEnabled = true;
        console.log('DEBUGGING: Rotation gizmo enabled');
        break;
      case 'scale':
        this.gizmoManager.scaleGizmoEnabled = true;
        console.log('DEBUGGING: Scale gizmo enabled');
        break;
      case 'boundingBox':
        this.gizmoManager.boundingBoxGizmoEnabled = true;
        console.log('DEBUGGING: BoundingBox gizmo enabled');
        break;
      case 'none':
        console.log('DEBUGGING: All gizmos disabled (none mode)');
        break;
      default:
        console.warn(`DEBUGGING: Unknown gizmo mode: ${mode}`);
    }
    
    // Apply X-ray configuration after enabling gizmo
    if (mode !== 'none' && this.gizmoMaterialConfigurer) {
      // Small delay to ensure gizmo is fully created before applying X-ray effect
      setTimeout(() => {
        if (this.gizmoManager?.gizmos && this.gizmoMaterialConfigurer) {
          console.log('Applying X-ray effect to newly enabled gizmo...');
          switch (mode) {
            case 'position':
              this.gizmoMaterialConfigurer!(this.gizmoManager.gizmos.positionGizmo);
              break;
            case 'rotation':
              this.gizmoMaterialConfigurer!(this.gizmoManager.gizmos.rotationGizmo);
              break;
            case 'scale':
              this.gizmoMaterialConfigurer!(this.gizmoManager.gizmos.scaleGizmo);
              break;
            case 'boundingBox':
              this.gizmoMaterialConfigurer!(this.gizmoManager.gizmos.boundingBoxGizmo);
              break;
          }
        }
      }, 100); // 100ms delay to ensure gizmo creation is complete
    }
    
    console.log(`DEBUGGING: Gizmo mode ${mode} enabled successfully`);
  }
  
  private activateGizmoForSelection(): void {
    console.log('DEBUGGING: activateGizmoForSelection() called');
    
    if (!this.selectedObject || !this.gizmoManager) {
      console.error('DEBUGGING: activateGizmoForSelection FAILED - missing dependencies:', {
        selectedObject: !!this.selectedObject,
        selectedObjectName: this.selectedObject?.name || 'null',
        gizmoManager: !!this.gizmoManager,
        gizmoManagerExists: !!this.gizmoManager,
        currentMode: this.currentMode
      });
      return;
    }

    console.log(`DEBUGGING: Activating gizmo for: ${this.selectedObject.name} in mode: ${this.currentMode}`);
    console.log('DEBUGGING: GizmoManager state before activation:', {
      attachedMesh: this.gizmoManager.attachableMeshes?.length || 0,
      positionGizmoExists: !!this.gizmoManager.gizmos?.positionGizmo,
      utilityLayer: !!this.gizmoManager.utilityLayer
    });

    try {
      // Clear any existing gizmo first
      console.log('DEBUGGING: Clearing existing gizmo attachment...');
      this.gizmoManager.attachToMesh(null);
      
      if (this.selectedObject instanceof AbstractMesh) {
        // Handle mesh selection
        console.log(`DEBUGGING: Attaching gizmo to MESH: ${this.selectedObject.name}`);
        console.log('DEBUGGING: Mesh properties:', {
          meshName: this.selectedObject.name,
          meshId: this.selectedObject.id,
          meshEnabled: this.selectedObject.isEnabled(),
          meshVisible: this.selectedObject.isVisible,
          meshPosition: this.selectedObject.position.toString(),
          meshParent: this.selectedObject.parent?.name || 'none'
        });
        
        // Attach gizmo to the selected object
        this.gizmoManager.attachToMesh(this.selectedObject);
        
        // Fix for rotation gizmo after scaling
        if (this.currentMode === 'rotation') {
          // Get the mesh's scale and calculate average scale
          const mesh = this.selectedObject;
          const avgScale = (mesh.scaling.x + mesh.scaling.y + mesh.scaling.z) / 3;
          
          // Adjust rotation gizmo size based on mesh scale
          if (this.gizmoManager.gizmos.rotationGizmo) {
            console.log(`DEBUGGING: Adjusting rotation gizmo for scaled mesh (avg scale: ${avgScale})`);
            // Ensure rotation gizmo is properly sized relative to the scaled mesh
            this.gizmoManager.gizmos.rotationGizmo.scaleRatio = Math.max(1.0, avgScale * 0.8);
            
            // Ensure rotation gizmo uses world space for consistent rotation behavior
            this.gizmoManager.gizmos.rotationGizmo.updateGizmoRotationToMatchAttachedMesh = true;
            this.gizmoManager.gizmos.rotationGizmo.updateGizmoPositionToMatchAttachedMesh = true;
          }
        }
        
        // CRITICAL FIX: Enable the specific gizmo mode after attachment!
        console.log('DEBUGGING: Enabling gizmo mode after attachment...');
        this.enableGizmoMode(this.currentMode);
        
        console.log('DEBUGGING: GizmoManager state after mesh attachment and mode activation:', {
          attachedMesh: this.gizmoManager.attachableMeshes?.length || 0,
          positionGizmoExists: !!this.gizmoManager.gizmos?.positionGizmo,
          positionGizmoEnabled: this.gizmoManager.positionGizmoEnabled,
          rotationGizmoEnabled: this.gizmoManager.rotationGizmoEnabled,
          scaleGizmoEnabled: this.gizmoManager.scaleGizmoEnabled,
          currentMode: this.currentMode
        });
        
        console.log(`DEBUGGING: Mesh gizmo activated and mode enabled successfully for ${this.selectedObject.name}`);
      } else if (this.selectedObject instanceof Light) {
        // Handle light selection via plugin
        console.log(`DEBUGGING: Handling LIGHT selection: ${this.selectedObject.name}`);
        const lightPlugin = this.plugins.get('light');
        if (lightPlugin) {
          // Note: selectLight method not available on IGizmoPlugin interface
          console.log(`DEBUGGING: Light plugin found for ${this.selectedObject.name}`);
        } else {
          console.error('DEBUGGING: Light plugin not found');
        }
      }
    } catch (error) {
      console.error('DEBUGGING: Error activating gizmo:', error);
      console.error('DEBUGGING: Error stack:', (error as Error).stack);
    }
    
    // No need to set up transform observers here as they're handled elsewhere
  }
  
  private clearCurrentSelection(): void {
    if (this.gizmoManager) {
      this.gizmoManager.attachToMesh(null);
      this.gizmoManager.positionGizmoEnabled = false;
      this.gizmoManager.rotationGizmoEnabled = false;
      this.gizmoManager.scaleGizmoEnabled = false;
      this.gizmoManager.boundingBoxGizmoEnabled = false;
    }
    
    this.cleanupObservers();
  }
  
  // =============================================================================
  // LIGHT HELPER MANAGEMENT
  // =============================================================================
  

  
  // =============================================================================
  // TRANSFORM OBSERVERS
  // =============================================================================
  

  

  

  

  
  // =============================================================================
  // UTILITY METHODS
  // =============================================================================
  

  
  // =============================================================================
  // SETTINGS & CONFIGURATION
  // =============================================================================
  
  updateSettings(newSettings: Partial<GizmoSettings>): void {
    if (this.disposed) return;
    
    this.settings = { ...this.settings, ...newSettings };
    this.applySettings();
  }
  
  private applySettings(): void {
    if (!this.gizmoManager) return;
    
    this.gizmoManager.scaleRatio = this.settings.scaleRatio;
    
    // Apply coordinate space
    const useLocal = this.settings.coordinateSpace === 'local';
    if (this.gizmoManager.gizmos.positionGizmo) {
      this.gizmoManager.gizmos.positionGizmo.updateGizmoRotationToMatchAttachedMesh = useLocal;
    }
    if (this.gizmoManager.gizmos.rotationGizmo) {
      this.gizmoManager.gizmos.rotationGizmo.updateGizmoRotationToMatchAttachedMesh = useLocal;
    }
    
    // Apply snapping
    if (this.gizmoManager.gizmos.positionGizmo) {
      this.gizmoManager.gizmos.positionGizmo.snapDistance = this.settings.snapDistance;
    }
    if (this.gizmoManager.gizmos.rotationGizmo) {
      this.gizmoManager.gizmos.rotationGizmo.snapDistance = this.settings.rotationSnapValue;
    }
    if (this.gizmoManager.gizmos.scaleGizmo) {
      this.gizmoManager.gizmos.scaleGizmo.snapDistance = this.settings.scaleSnapValue;
    }
  }
  
  setCoordinateSpace(space: CoordinateSpace): void {
    this.updateSettings({ coordinateSpace: space });
  }
  
  setSnapEnabled(enabled: boolean): void {
    if (!this.gizmoManager) return;
    
    const snapDistance = enabled ? this.settings.snapDistance : 0;
    const rotationSnap = enabled ? this.settings.rotationSnapValue : 0;
    const scaleSnap = enabled ? this.settings.scaleSnapValue : 0;
    
    if (this.gizmoManager.gizmos.positionGizmo) {
      this.gizmoManager.gizmos.positionGizmo.snapDistance = snapDistance;
    }
    if (this.gizmoManager.gizmos.rotationGizmo) {
      this.gizmoManager.gizmos.rotationGizmo.snapDistance = rotationSnap;
    }
    if (this.gizmoManager.gizmos.scaleGizmo) {
      this.gizmoManager.gizmos.scaleGizmo.snapDistance = scaleSnap;
    }
  }
  
  // =============================================================================
  // UNDO/REDO SYSTEM
  // =============================================================================
  
  pushUndoAction(action: UndoRedoAction): void {
    if (this.disposed) return;
    
    this.undoStack.push(action);
    this.redoStack = []; // Clear redo stack
    
    // Limit stack size
    if (this.undoStack.length > this.maxUndoStackSize) {
      this.undoStack.shift();
    }
    
    this.callbacks.onUndoRedoAction?.(action);
  }
  
  undo(): boolean {
    if (this.undoStack.length === 0) return false;
    
    const action = this.undoStack.pop()!;
    this.redoStack.push(action);
    
    // Apply undo
    this.applyTransformState(action.objectId, action.previousState);
    
    return true;
  }
  
  redo(): boolean {
    if (this.redoStack.length === 0) return false;
    
    const action = this.redoStack.pop()!;
    this.undoStack.push(action);
    
    // Apply redo
    this.applyTransformState(action.objectId, action.newState);
    
    return true;
  }
  
  private applyTransformState(objectId: string, state: TransformState): void {
    // Find object by ID
    let object: SelectableObject | null = null;
    
    // Search in meshes
    const mesh = this.scene.getMeshByName(objectId);
    if (mesh) object = mesh;
    
    // Search in lights
    if (!object) {
      const light = this.scene.getLightByName(objectId);
      if (light) object = light;
    }
    
    if (!object) return;
    
    // Apply transform
    if (object instanceof AbstractMesh && state.objectType === 'mesh') {
      if (state.position) object.position = state.position.clone();
      if (state.rotation) object.rotation = state.rotation.clone();
      if (state.scale) object.scaling = state.scale.clone();
    } else if (object instanceof DirectionalLight && state.objectType === 'light') {
      if (state.lightDirection) object.direction = state.lightDirection.clone();
    }
  }
  
  // =============================================================================
  // CLEANUP & DISPOSAL
  // =============================================================================
  
  private cleanupObservers(): void {
    this.observers.forEach(observer => observer.remove());
    this.observers = [];
  }
  
  hideLightHelpers(): void {
    this.lightHelpers.forEach(({ helper, gizmo }) => {
      helper.setEnabled(false);
      // LightGizmo doesn't have standard enable/disable, dispose and recreate if needed
      try {
        gizmo.dispose();
      } catch (e) {
        // Gizmo might already be disposed
      }
    });
  }
  
  showLightHelpers(): void {
    this.lightHelpers.forEach(({ helper }) => {
      helper.setEnabled(true);
      // LightGizmo should be visible by default when created
    });
  }
  
  dispose(): void {
    if (this.disposed) {
      console.warn('DEBUGGING: dispose() called on already disposed system!');
      return;
    }
    
    console.log('DEBUGGING: UnifiedGizmoSystem.dispose() called - STARTING DISPOSAL...', {
      timestamp: Date.now(),
      selectedObject: this.selectedObject?.name || 'null',
      gizmoManagerExists: !!this.gizmoManager,
      utilityLayerExists: !!this.utilityLayerRenderer,
      pluginCount: this.plugins.size
    });
    
    this.disposed = true;
    
    console.log('DEBUGGING: Clearing current selection...');
    this.clearCurrentSelection();
    
    console.log('DEBUGGING: Cleaning up observers...');
    this.cleanupObservers();
    
    // Dispose plugins
    console.log('DEBUGGING: Disposing plugins...');
    for (const [name, plugin] of this.plugins) {
      try {
        plugin.dispose();
        console.log(`DEBUGGING: Plugin '${name}' disposed successfully`);
      } catch (error) {
        console.error(`DEBUGGING: Error disposing plugin '${name}':`, error);
      }
    }
    this.plugins.clear();
    
    // Dispose gizmo manager
    if (this.gizmoManager) {
      console.log('DEBUGGING: Disposing GizmoManager...');
      try {
        this.gizmoManager.dispose();
        console.log('DEBUGGING: GizmoManager disposed successfully');
      } catch (error) {
        console.error('DEBUGGING: Error disposing GizmoManager:', error);
      }
      this.gizmoManager = null;
    }
    
    // Dispose utility layer
    if (this.utilityLayerRenderer) {
      console.log('DEBUGGING: Disposing UtilityLayerRenderer...');
      try {
        this.utilityLayerRenderer.dispose();
        console.log('DEBUGGING: UtilityLayerRenderer disposed successfully');
      } catch (error) {
        console.error('DEBUGGING: Error disposing UtilityLayerRenderer:', error);
      }
      this.utilityLayerRenderer = null;
    }
    
    console.log('DEBUGGING: UnifiedGizmoSystem disposal completed at', Date.now());
  }
  
  // =============================================================================
  // GETTERS
  // =============================================================================
  
  get isDisposed(): boolean {
    return this.disposed;
  }
  
  get currentSelection(): SelectableObject | null {
    return this.selectedObject;
  }
  
  get mode(): GizmoMode {
    return this.currentMode;
  }
  
  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }
  
  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }
}

export default UnifiedGizmoSystem;
