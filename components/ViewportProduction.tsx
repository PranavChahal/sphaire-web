import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Engine, Scene, ArcRotateCamera, Vector3, HemisphericLight, DirectionalLight,
  MeshBuilder, StandardMaterial, Color3, Color4, AbstractMesh, Mesh,
  UtilityLayerRenderer, GizmoManager, VertexData
} from '@babylonjs/core';
import { CubeTexture } from '@babylonjs/core/Materials/Textures/cubeTexture';
import { SceneLoader } from '@babylonjs/core/Loading/sceneLoader';
import { GizmoMode } from '../utils/UnifiedGizmoSystem';

import '@babylonjs/core/Materials/standardMaterial';

import '@babylonjs/loaders/glTF/2.0/glTFLoader';
import '@babylonjs/loaders/OBJ/objFileLoader';
import '@babylonjs/loaders/STL/stlFileLoader';

import useStore from '../store/store';
import type { Shape } from '../store/store';
import useSceneStore from '../store/sceneStore';
import { useRealtimeCollaboration } from '../hooks/useRealtimeCollaboration';
import { useRouter } from 'next/router';

interface ViewportProductionProps {
  viewportRef?: React.MutableRefObject<any>;
  id?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const ViewportProduction: React.FC<ViewportProductionProps> = ({ 
  viewportRef: _viewportRef, 
  id = 'production-viewport',
  className = '',
  style = {}
}) => {
  console.log(' PRODUCTION VIEWPORT: Initializing...');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const sceneRef = useRef<Scene | null>(null);
  const cameraRef = useRef<ArcRotateCamera | null>(null);
  
  const renderLoopRef = useRef<number | null>(null);
  const isRenderingRef = useRef<boolean>(false);
  
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gizmoMode, setGizmoMode] = useState<GizmoMode>('position');
  // REMOVED: modelLoadEpoch no longer needed after eliminating redundant mesh sync effect
  
  // Get fileId from router for collaborative features
  const router = useRouter();
  const { fileId } = router.query;
  
  const { 
    _updateShapeDirect: updateShapeDirectly, // Direct update without undo/redo
    _undoRedoSystem: undoRedoSystem, // Undo/redo system for proper tracking
  } = useStore();
  const { setScene, selectedMeshes, setSelectedMeshes } = useSceneStore();
  
  
  // COLLABORATIVE FEATURES: Initialize real-time collaboration hook
  const {
    broadcastEvent,       // function to broadcast events to others
    startEditingObject,   // call when user starts editing (locks object)
    stopEditingObject,    // call when user stops editing (releases lock)
    isObjectLocked,       // check if an object is locked by someone else
    updateCursorPosition, // update local user's cursor position
  } = useRealtimeCollaboration({
    fileId: fileId as string,
    onPresenceUpdate: (presence) => {
      console.log('🤝 COLLABORATION: Presence updated:', presence);
      updateCollaboratorCursors(presence);
    },
    onRealtimeEvent: (event) => {
      console.log('COLLABORATION: Received realtime event:', event);
      handleRemoteEvent(event);
    }
  });
  

  

  

  const gizmoLayerRef = useRef<UtilityLayerRenderer | null>(null);
  const gizmoManagerRef = useRef<GizmoManager | null>(null);
  
  // Shape mesh references
  const shapeMeshesRef = useRef<Map<string, Mesh>>(new Map());
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // COLLABORATIVE FEATURES: Cursor and presence tracking
  const collaboratorCursorsRef = useRef<Map<string, Mesh>>(new Map());
  const cursorUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Keyboard state for multi-selection
  const keyboardStateRef = useRef({ shift: false, ctrl: false });

  // COLLABORATIVE FEATURES: Handle incoming real-time events from other users
  const handleRemoteEvent = useCallback((event: any) => {
    // Skip our own events to avoid double-processing
    if (event.user_id === router.query.userId) return;
    
    console.log('📥 COLLABORATION: Processing remote event:', event.type, event);
    
    switch (event.type) {
      case 'transform':
        // Find the object in local state and update its transform
        console.log('COLLABORATION: Applying remote transform to object:', event.object_id);
        updateObjectTransform(event.object_id, event.data.newTransform);
        break;
        
      case 'add_object':
        // Add new object to scene
        console.log('➕ COLLABORATION: Adding remote object:', event.data);
        addObjectToScene(event.data.objectData);
        break;
        
      case 'delete_object':
        // Remove object from scene
        console.log('COLLABORATION: Removing remote object:', event.object_id);
        removeObjectFromScene(event.object_id);
        break;
        
      default:
        console.log('❓ COLLABORATION: Unknown event type:', event.type);
    }
  }, [router.query.userId]);
  
  // COLLABORATIVE FEATURES: Update object transform from remote event
  const updateObjectTransform = useCallback((objectId: string, newTransform: any) => {
    const mesh = shapeMeshesRef.current.get(objectId);
    if (mesh && newTransform) {
      // Apply transform to Babylon.js mesh
      if (newTransform.position) {
        mesh.position.copyFrom(new Vector3(newTransform.position.x, newTransform.position.y, newTransform.position.z));
      }
      if (newTransform.rotation) {
        const r = newTransform.rotation;
        mesh.rotation.copyFrom(
          new Vector3(
            (r.x || 0) * Math.PI / 180,
            (r.y || 0) * Math.PI / 180,
            (r.z || 0) * Math.PI / 180
          )
        );
      }
      if (newTransform.scaling) {
        mesh.scaling.copyFrom(new Vector3(newTransform.scaling.x, newTransform.scaling.y, newTransform.scaling.z));
      }
      console.log('COLLABORATION: Applied remote transform to mesh:', objectId);
    }
  }, []);
  
  // COLLABORATIVE FEATURES: Add object from remote event  
  const addObjectToScene = useCallback((objectData: any) => {
    // This will be implemented to handle remote object additions
    console.log('COLLABORATION: Remote object addition not yet implemented:', objectData);
  }, []);
  
  // COLLABORATIVE FEATURES: Remove object from remote event
  const removeObjectFromScene = useCallback((objectId: string) => {
    // This will be implemented to handle remote object deletions
    console.log('COLLABORATION: Remote object deletion not yet implemented:', objectId);
  }, []);
  
  // COLLABORATIVE FEATURES: Create 3D cursor for remote user
  const createRemoteCursor = useCallback((collaboratorId: string, position: {x: number, y: number, z: number}, email: string) => {
    if (!sceneRef.current) return;
    
    // Create a unique cursor mesh for this collaborator
    const cursorSphere = MeshBuilder.CreateSphere(`cursor_${collaboratorId}`, { diameter: 0.2 }, sceneRef.current);
    
    // Style the cursor with a unique color based on user ID
    const material = new StandardMaterial(`cursorMat_${collaboratorId}`, sceneRef.current);
    // Simple hash function for consistent colors
    const hash = collaboratorId.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a; }, 0);
    const hue = Math.abs(hash) % 360;
    material.diffuseColor = Color3.FromHSV(hue, 0.8, 0.9);
    material.emissiveColor = Color3.FromHSV(hue, 0.6, 0.5);
    cursorSphere.material = material;
    
    // Position the cursor
    cursorSphere.position = new Vector3(position.x, position.y, position.z);
    
    // Make cursor always visible (high rendering group)
    cursorSphere.renderingGroupId = 2;
    
    // Store cursor reference
    collaboratorCursorsRef.current.set(collaboratorId, cursorSphere);
    
    console.log(`COLLABORATION: Created 3D cursor for ${email} at`, position);
    return cursorSphere;
  }, []);
  
  // COLLABORATIVE FEATURES: Update remote cursor position
  const updateRemoteCursor = useCallback((collaboratorId: string, position: {x: number, y: number, z: number}) => {
    const cursor = collaboratorCursorsRef.current.get(collaboratorId);
    if (cursor) {
      cursor.position.copyFrom(new Vector3(position.x, position.y, position.z));
    }
  }, []);
  
  // COLLABORATIVE FEATURES: Remove remote cursor
  const removeRemoteCursor = useCallback((collaboratorId: string) => {
    const cursor = collaboratorCursorsRef.current.get(collaboratorId);
    if (cursor) {
      cursor.dispose();
      collaboratorCursorsRef.current.delete(collaboratorId);
      console.log(`COLLABORATION: Removed cursor for collaborator ${collaboratorId}`);
    }
  }, []);
  
  // COLLABORATIVE FEATURES: Handle cursor position tracking
  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!sceneRef.current || !cameraRef.current || !updateCursorPosition) return;
    
    // Throttle cursor updates to avoid flooding
    if (cursorUpdateTimeoutRef.current) return;
    
    // IMPORTANT: Read DOM and mouse values BEFORE scheduling, avoid pooled event
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const px = event.clientX - rect.left;
    const py = event.clientY - rect.top;
    
    cursorUpdateTimeoutRef.current = setTimeout(() => {
      cursorUpdateTimeoutRef.current = null;
      
      // Use precomputed coordinates; do not reference the pooled event here
      const pickResult = sceneRef.current!.pick(px, py);
      
      if (pickResult.hit && pickResult.pickedPoint) {
        const pos = pickResult.pickedPoint;
        updateCursorPosition({ x: pos.x, y: pos.y, z: pos.z });
      } else {
        // Default to ground plane position if no object hit
        const groundPos = { x: 0, y: 0, z: 0 }; // Could calculate based on camera
        updateCursorPosition(groundPos);
      }
    }, 100); // Update max every 100ms
  }, [updateCursorPosition]);
  
  // COLLABORATIVE FEATURES: Update collaborator cursors based on presence
  const updateCollaboratorCursors = useCallback((presenceList: any[]) => {
    if (!sceneRef.current) return;
    
    // Get current user ID to exclude self
    const currentUserId = router.query.userId as string;
    
    // Track which collaborators we should have cursors for
    const activeCursors = new Set<string>();
    
    presenceList.forEach((presence) => {
      // Skip self
      if (presence.user_id === currentUserId) return;
      
      // Skip if no cursor position
      if (!presence.cursor_position) return;
      
      activeCursors.add(presence.user_id);
      
      // Check if cursor already exists
      const existingCursor = collaboratorCursorsRef.current.get(presence.user_id);
      
      if (existingCursor) {
        // Update existing cursor position
        updateRemoteCursor(presence.user_id, presence.cursor_position);
      } else {
        // Create new cursor
        createRemoteCursor(presence.user_id, presence.cursor_position, presence.email || 'Unknown');
      }
    });
    
    // Remove cursors for users no longer present
    collaboratorCursorsRef.current.forEach((_, userId) => {
      if (!activeCursors.has(userId)) {
        removeRemoteCursor(userId);
      }
    });
    
    console.log(`COLLABORATION: Updated cursors for ${activeCursors.size} active collaborators`);
  }, [router.query.userId, createRemoteCursor, updateRemoteCursor, removeRemoteCursor]);

  // BULLETPROOF engine creation with all required methods
  const createBulletproofEngine = useCallback((canvas: HTMLCanvasElement): Engine => {
    console.log(' PRODUCTION: Creating bulletproof Babylon.js engine...');
    
    const engine = new Engine(canvas, true, {
      antialias: true,
      adaptToDeviceRatio: true
    });
    
    // Guarantee essential methods exist
    if (!(engine as any).wipeCaches) {
      (engine as any).wipeCaches = function() {
        console.log(' [PRODUCTION] wipeCaches called');
        try {
          this._renderingQueueLaunched = false;
          this._activeRenderLoops = [];
        } catch (e) {
          console.warn(' wipeCaches partial clear:', e);
        }
      };
    }
    
    if (!(engine as any).getAspectRatio) {
      (engine as any).getAspectRatio = function(camera?: any) {
        if (camera && camera.getViewMatrix) {
          const viewport = camera.viewport;
          return (viewport.width * this.getRenderWidth()) / (viewport.height * this.getRenderHeight());
        }
        return this.getAspectRatio(this.activeCamera);
      };
    }
    
    console.log(' PRODUCTION: Engine created with guaranteed methods');
    return engine;
  }, []);

  // BULLETPROOF render loop (60 FPS optimized)
  const startRenderLoop = useCallback(() => {
    if (!engineRef.current || !sceneRef.current) return;
    
    console.log('PRODUCTION: Starting optimized render loop...');
    isRenderingRef.current = true;
    
    let lastFrameTime = 0;
    const targetFrameTime = 1000 / 60; // 60 FPS
    
    const renderFrame = (currentTime: number) => {
      if (!isRenderingRef.current || !sceneRef.current || !engineRef.current) {
        return;
      }
      if (!isRenderingRef.current || !sceneRef.current) return;
      
      // 60 FPS throttling
      const delta = currentTime - lastFrameTime;
      if (delta >= targetFrameTime) {
        try {
          sceneRef.current.render();
          lastFrameTime = currentTime;
        } catch (err) {
          console.error(' PRODUCTION: Render error:', err);
        }
      }
      
      renderLoopRef.current = requestAnimationFrame(renderFrame);
    };
    
    renderLoopRef.current = requestAnimationFrame(renderFrame);
  }, []);

  const stopRenderLoop = useCallback(() => {
    console.log(' PRODUCTION: Stopping render loop...');
    isRenderingRef.current = false;
    if (renderLoopRef.current) {
      cancelAnimationFrame(renderLoopRef.current);
      renderLoopRef.current = null;
    }
  }, []);

  // PRODUCTION scene creation
  const createScene = useCallback((engine: Engine): Scene => {
    console.log('PRODUCTION: Creating high-quality dark 3D environment...');
    
    const scene = new Scene(engine);
    
    // DARK ENVIRONMENT SETUP
    scene.clearColor = new Color4(0.05, 0.05, 0.08, 1.0); // Dark blue-black background
    scene.ambientColor = new Color3(0.1, 0.1, 0.15); // Subtle ambient
    
    // HIGH-QUALITY CAMERA SETUP
    const camera = new ArcRotateCamera(
      'productionCamera',
      -Math.PI / 2,
      Math.PI / 2.5,
      20, // Increased distance for better perspective
      Vector3.Zero(),
      scene
    );
    camera.attachControl(canvasRef.current!, true);
    
    // PRECISION CAMERA CONTROLS
    camera.wheelPrecision = 100; // More precise zoom
    camera.pinchPrecision = 500; // Smoother touch zoom
    camera.panningSensibility = 1000; // Precise panning
    camera.angularSensibilityX = 1000; // Smooth rotation
    camera.angularSensibilityY = 1000;
    camera.minZ = 0.1; // Prevent clipping
    camera.maxZ = 1000; // Far viewing distance
    
    // CAMERA LIMITS FOR PRECISION
    camera.lowerBetaLimit = 0.1;
    // Allow orbiting below the grid for inspection under models
    camera.upperBetaLimit = Math.PI - 0.01;
    camera.lowerRadiusLimit = 2;
    camera.upperRadiusLimit = 100;
    
    // ENABLE FULL GRID MOVEMENT (including negative Z)
    // Remove any implicit target constraints to allow movement in all directions
    camera.setTarget(Vector3.Zero()); // Center at origin
    
    // Enable panning to allow camera target movement in X/Z plane
    camera.panningAxis = new Vector3(1, 1, 1); // Allow X, Y, Z panning (can move below grid)
    camera.panningInertia = 0.9; // Smooth panning
    
    cameraRef.current = camera;
    
    // PROFESSIONAL LIGHTING SETUP
    const keyLight = new DirectionalLight('keyLight', new Vector3(-0.5, -1, -0.3), scene);
    keyLight.intensity = 1.2;
    keyLight.diffuse = new Color3(1, 0.95, 0.8); // Warm white
    
    const fillLight = new HemisphericLight('fillLight', new Vector3(0, 1, 0), scene);
    fillLight.intensity = 0.3;
    fillLight.diffuse = new Color3(0.7, 0.8, 1.0); // Cool fill
    
    const rimLight = new DirectionalLight('rimLight', new Vector3(1, 0.2, 0.5), scene);
    rimLight.intensity = 0.6;
    rimLight.diffuse = new Color3(0.9, 0.9, 1.0); // Subtle rim lighting

    // ENVIRONMENT TEXTURE for proper PBR reflections (glTF materials)
    try {
      const envUrl = 'https://assets.babylonjs.com/environments/environmentSpecular.env';
      scene.environmentTexture = CubeTexture.CreateFromPrefilteredData(envUrl, scene);
      scene.environmentIntensity = 1.0;
      console.log('PRODUCTION: Environment texture set for PBR materials');
    } catch (e) {
      console.warn('PRODUCTION: Failed to set environment texture:', e);
    }
    
    // ENHANCED TRANSPARENT GRID SYSTEM
    const createTransparentGrid = () => {
      const gridSize = 100;
      const gridDivisions = 100; // INCREASED NUMBER OF GRID SQUARES for finer precision
      const gridSpacing = gridSize / gridDivisions;
      
      console.log(`Creating grid: ${gridSize}x${gridSize} with ${gridDivisions} divisions (${gridSpacing} unit squares)`);
      
      // Create line system for grid
      const gridLines: Vector3[][] = [];
      
      // Horizontal lines
      for (let i = 0; i <= gridDivisions; i++) {
        const x = -gridSize/2 + (i * gridSpacing);
        gridLines.push([
          new Vector3(x, 0, -gridSize/2),
          new Vector3(x, 0, gridSize/2)
        ]);
      }
      
      // Vertical lines
      for (let i = 0; i <= gridDivisions; i++) {
        const z = -gridSize/2 + (i * gridSpacing);
        gridLines.push([
          new Vector3(-gridSize/2, 0, z),
          new Vector3(gridSize/2, 0, z)
        ]);
      }
      
      // Create grid mesh using line system
      const grid = MeshBuilder.CreateLineSystem('transparentGrid', {
        lines: gridLines
      }, scene);
      
      // ENHANCED GRID MATERIAL (MORE VISIBLE)
      const gridMaterial = new StandardMaterial('gridMaterial', scene);
      gridMaterial.emissiveColor = new Color3(0.3, 0.35, 0.4); // INCREASED VISIBILITY (was 0.2, 0.25, 0.3)
      gridMaterial.alpha = 0.25; // INCREASED VISIBILITY (was 0.15)
      gridMaterial.disableLighting = true; // Self-illuminated
      
      grid.material = gridMaterial;
      grid.isPickable = false; // Don't interfere with selection
      
      // Center axes (more visible)
      const centerAxisX = MeshBuilder.CreateLines('centerAxisX', {
        points: [new Vector3(-gridSize/2, 0.01, 0), new Vector3(gridSize/2, 0.01, 0)]
      }, scene);
      const centerAxisZ = MeshBuilder.CreateLines('centerAxisZ', {
        points: [new Vector3(0, 0.01, -gridSize/2), new Vector3(0, 0.01, gridSize/2)]
      }, scene);
      
      const axisMaterial = new StandardMaterial('axisMaterial', scene);
      axisMaterial.emissiveColor = new Color3(0.4, 0.5, 0.6); // INCREASED VISIBILITY
      axisMaterial.alpha = 0.6; // INCREASED VISIBILITY (was 0.4)
      axisMaterial.disableLighting = true;
      
      centerAxisX.material = axisMaterial;
      centerAxisZ.material = axisMaterial;
      centerAxisX.isPickable = false;
      centerAxisZ.isPickable = false;
      
      console.log('Enhanced transparent grid created successfully');
      return { grid, centerAxisX, centerAxisZ };
    };
    
    // Create the transparent grid
    createTransparentGrid();
    
    // INVISIBLE GROUND PLANE FOR PHYSICS/INTERACTION
    const groundPlane = MeshBuilder.CreateGround('groundPlane', { width: 100, height: 100 }, scene);
    groundPlane.isVisible = false; // Invisible but still interactive
    groundPlane.receiveShadows = true;
    
    // BULLETPROOF GIZMO SYSTEM (BASIC BABYLON.JS ONLY)
    try {
      console.log('UnifiedGizmoSystem initialization handled by React hook');
      // UnifiedGizmoSystem is now managed by the useUnifiedGizmo hook above
      // This provides better React integration and lifecycle management
      
    } catch (error) {
      console.error('Failed to initialize gizmo system:', error);
      // GizmoManager errors are handled below
    }
    
    // OLD WORKING APPROACH: Initialize GizmoManager directly (simple & functional)
    try {
      console.log('ENHANCED DEBUG: Starting GizmoManager initialization...');
      console.log('Scene ready:', !!scene, 'Camera ready:', !!camera);
      console.log('Current gizmoMode:', gizmoMode);
      console.log('Existing gizmoManagerRef:', !!gizmoManagerRef.current);
      
      // 1. Create utility layer renderer
      const utilLayer = new UtilityLayerRenderer(scene);
      console.log('UtilityLayerRenderer created:', !!utilLayer);
      
      const gizmoManager = new GizmoManager(scene, /*thickness=*/1, utilLayer);
      console.log('GizmoManager created:', !!gizmoManager);
      
      // 2. CRITICAL: Set render camera and configure depth settings
      utilLayer.setRenderCamera(camera);
      utilLayer.utilityLayerScene.autoClearDepthAndStencil = false;
      console.log('Camera set on utility layer:', camera.name);
      
      // 3. Configure GizmoManager settings
      gizmoManager.clearGizmoOnEmptyPointerEvent = true; // Detach when clicking empty space
      gizmoManager.usePointerToAttachGizmos = false; // Manual attach mode
      gizmoManager.scaleRatio = 2; // Larger gizmo size
      
      // X-RAY GIZMO FIX: Make gizmos visible THROUGH all objects (even when extremely large)
      // This prevents large objects from obscuring gizmo handles completely
      utilLayer.utilityLayerScene.autoClearDepthAndStencil = false;
      utilLayer.shouldRender = true;
      
      // CRITICAL X-RAY CONFIGURATION: Apply after gizmos are created
      const applyXRayToGizmos = () => {
        const configureXRayMaterials = (gizmo: any) => {
          if (!gizmo) return;
          
          // Get all meshes from the gizmo's utility layer
          const gizmoMeshes = utilLayer.utilityLayerScene.meshes || [];
          
          gizmoMeshes.forEach((mesh: any) => {
            if (mesh.material) {
              // X-RAY EFFECT: Make gizmo visible through all objects
              mesh.material.disableDepthWrite = true;  // Don't write to depth buffer
              mesh.material.depthFunction = 519; // ALWAYS (Constants.ALWAYS = 519)
              mesh.material.backFaceCulling = false; // Render both sides
              mesh.renderingGroupId = 3; // Very high rendering group (renders last)
              
              // For materials with multiple sub-materials
              if (mesh.material.subMaterials) {
                mesh.material.subMaterials.forEach((subMat: any) => {
                  if (subMat) {
                    subMat.disableDepthWrite = true;
                    subMat.depthFunction = 519; // ALWAYS
                    subMat.backFaceCulling = false;
                  }
                });
              }
            }
            
            // Set very high rendering group for X-ray effect
            mesh.renderingGroupId = 3;
          });
        };
        
        // Apply X-ray effect to all gizmo types
        if (gizmoManager.gizmos.positionGizmo) {
          configureXRayMaterials(gizmoManager.gizmos.positionGizmo);
          gizmoManager.gizmos.positionGizmo.scaleRatio = 1.5;
        }
        if (gizmoManager.gizmos.rotationGizmo) {
          configureXRayMaterials(gizmoManager.gizmos.rotationGizmo);
          gizmoManager.gizmos.rotationGizmo.scaleRatio = 1.5;
        }
        if (gizmoManager.gizmos.scaleGizmo) {
          configureXRayMaterials(gizmoManager.gizmos.scaleGizmo);
          gizmoManager.gizmos.scaleGizmo.scaleRatio = 1.5;
        }
        
        console.log('X-ray gizmo configuration applied - gizmos now visible through all objects!');
      };
      
      // Apply X-ray effect with delay to ensure gizmos are created
      setTimeout(applyXRayToGizmos, 200);
      
      console.log('GizmoManager configuration applied with always-visible settings');
      
      // 4. Enable desired gizmos based on current mode
      const enabled = gizmoMode !== 'none';
      gizmoManager.positionGizmoEnabled = gizmoMode === 'position' && enabled;
      gizmoManager.rotationGizmoEnabled = gizmoMode === 'rotation' && enabled;
      gizmoManager.scaleGizmoEnabled = gizmoMode === 'scale' && enabled;
      gizmoManager.boundingBoxGizmoEnabled = false;
      console.log('Gizmo modes enabled:', {
        position: gizmoManager.positionGizmoEnabled,
        rotation: gizmoManager.rotationGizmoEnabled,
        scale: gizmoManager.scaleGizmoEnabled
      });
      
      // 5. Store references for cleanup and usage
      gizmoLayerRef.current = utilLayer;
      gizmoManagerRef.current = gizmoManager;
      
      console.log('Direct GizmoManager system initialized successfully!');
      console.log('Final refs set:', {
        gizmoManager: !!gizmoManagerRef.current,
        utilityLayer: !!gizmoLayerRef.current
      });
    } catch (error) {
      console.error('Failed to initialize direct GizmoManager:', error);
      console.error('Error stack:', error);
    }
    
    // OLD WORKING PATTERN: NO Babylon.js pointer observers (they interfere with gizmos)
    // NOTE: Removed main-scene pointer observables that were interfering with gizmo interaction
    // Gizmo interaction is handled by the UtilityLayerRenderer automatically
    // Mesh selection is handled by the React onPointerDown event
    
    // SCENE OPTIMIZATION FOR HIGHEST QUALITY
    scene.registerBeforeRender(() => {
      // Maintain 60fps with quality optimizations
      if (scene.getAnimationRatio() > 1.2) {
        scene.skipPointerMovePicking = true;
      } else {
        scene.skipPointerMovePicking = false;
      }
    });
    
    // Enable high-quality rendering features
    scene.blockMaterialDirtyMechanism = false; // Allow material updates
    scene.autoClear = true; // Clean rendering
    scene.autoClearDepthAndStencil = true; // Proper depth handling
    
    console.log('HIGH-QUALITY DARK 3D ENVIRONMENT CREATED SUCCESSFULLY');
    return scene;
  }, []);

  // INCREMENTAL MESH REGISTRY (preserves object transforms)
  const syncShapeMeshes = useCallback((shapeList: Shape[]) => {
    if (!sceneRef.current) return;
    const list = shapeList; // DO NOT read from `shapes` here; only use the `shapeList` param
    
    console.log('PRODUCTION: Syncing shape meshes (incremental approach)...');
    
    // 1. ADD any brand-new shapes (never dispose existing meshes)
    list.forEach((shape) => {
      if (!shapeMeshesRef.current.has(shape.id)) {
        console.log(`Creating new mesh for shape: ${shape.id} (${shape.type})`);
        
        let mesh: Mesh | undefined;
        let shouldFinalizeMesh = true; // only true for primitives
        
        switch (shape.type) {
          case 'box':
            mesh = MeshBuilder.CreateBox(shape.id, { size: 2 }, sceneRef.current!);
            if (mesh) { mesh.setEnabled(true); (mesh as any).isVisible = true; }
            break;
          case 'sphere':
            mesh = MeshBuilder.CreateSphere(shape.id, { diameter: 2 }, sceneRef.current!);
            if (mesh) { mesh.setEnabled(true); (mesh as any).isVisible = true; }
            break;
          case 'cylinder':
            mesh = MeshBuilder.CreateCylinder(shape.id, { height: 2, diameter: 2 }, sceneRef.current!);
            if (mesh) { mesh.setEnabled(true); (mesh as any).isVisible = true; }
            break;
          case 'model':
            // CRITICAL FIX: Handle imported models!
            // Try to find container/mesh by shape.id
            const scene = sceneRef.current!;
            const existingNode = (scene.getMeshByName(shape.id) as any) || (scene.getNodeByName(shape.id) as any);
            if (existingNode) {
              // Apply stored transformations to imported model container/mesh
              existingNode.position = new Vector3(shape.position.x, shape.position.y, shape.position.z);
              existingNode.rotation = new Vector3(
                (shape.rotation.x || 0) * Math.PI / 180,
                (shape.rotation.y || 0) * Math.PI / 180,
                (shape.rotation.z || 0) * Math.PI / 180
              );
              const scaling = shape.scaling || { x: 1, y: 1, z: 1 };
              existingNode.scaling = new Vector3(scaling.x, scaling.y, scaling.z);
              if ((existingNode as any).setEnabled) (existingNode as any).setEnabled(true);
              (existingNode as any).isVisible = true;
              existingNode.metadata = { ...(existingNode.metadata || {}), shapeId: shape.id };
              shapeMeshesRef.current.set(shape.id, existingNode as Mesh);
              console.log(`Applied transformations to imported model:`, shape.id, {
                position: shape.position,
                rotation: shape.rotation,
                scaling
              });
            } else {
              console.warn(`Imported model node not found for shape, reconstructing:`, shape.id);
              // Reconstruct from Base64 data in store
              const data: any = (shape as any).data;
              const base64: string | undefined = typeof data === 'string' ? data : (data?.main as string | undefined);
              if (!base64) {
                console.warn(`No model data present for shape:`, shape.id);
                shouldFinalizeMesh = false;
                break;
              }
              (async () => {
                try {
                  // Decode base64 to ArrayBuffer
                  const binary = atob(base64);
                  const bytes = new Uint8Array(binary.length);
                  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
                  const blob = new Blob([bytes.buffer], { type: 'application/octet-stream' });
                  const url = URL.createObjectURL(blob);
                  const pluginExt = `.${(shape as any).format || 'glb'}`;
                  const result = await SceneLoader.ImportMeshAsync('', '', url, sceneRef.current!, undefined, pluginExt);
                  URL.revokeObjectURL(url);
                  // Create a container Mesh named by shape.id for gizmo attachment
                  const container = new Mesh(shape.id, sceneRef.current!);
                  container.isPickable = false; // pick parts, not the group
                  container.setEnabled(true);
                  container.isVisible = true;
                  container.metadata = { shapeId: shape.id, isModelContainer: true };
                  // Parent GLTF ROOT to the container to preserve loader transforms
                  const root = result.meshes.find((m: any) => m && m.name === '__root__');
                  if (root) {
                    root.isPickable = false; // avoid selecting invisible root
                    root.parent = container;
                  } else {
                    // Fallback: reparent non-root meshes
                    result.meshes.forEach((m: any) => {
                      if (m && m.name && m.name !== '__root__') {
                        m.parent = container;
                      }
                    });
                  }
                  // Tag root and children with metadata and improve visibility
                  result.meshes.forEach((m: any) => {
                    if (!m) return;
                    m.metadata = { ...(m.metadata || {}), shapeId: shape.id, isModelChild: true };
                    if (m.setEnabled) m.setEnabled(true);
                    m.isVisible = true;
                    if (m.material) {
                      try {
                        m.material.backFaceCulling = false;
                        if ((m.material as any).twoSidedLighting !== undefined) {
                          (m.material as any).twoSidedLighting = true;
                        }
                      } catch {}
                    }
                  });
                  // Apply transforms
                  container.position = new Vector3(shape.position.x, shape.position.y, shape.position.z);
                  container.rotation = new Vector3(
                    (shape.rotation.x || 0) * Math.PI / 180,
                    (shape.rotation.y || 0) * Math.PI / 180,
                    (shape.rotation.z || 0) * Math.PI / 180
                  );
                  const sc = shape.scaling || { x: 1, y: 1, z: 1 };
                  container.scaling = new Vector3(sc.x, sc.y, sc.z);
                  // Store reference
                  shapeMeshesRef.current.set(shape.id, container as Mesh);
                  console.log('Reconstructed imported model from store data:', shape.id);
                  // REMOVED: setModelLoadEpoch no longer needed - Zustand subscription handles sync automatically
                } catch (e) {
                  console.error('Failed to reconstruct imported model:', shape.id, e);
                }
              })();
            }
            // Skip primitive finalization for models
            console.log(`SKIPPING primitive mesh creation for custom/imported shape:`, shape.id);
            shouldFinalizeMesh = false;
            break;
          
          case 'parametric':
          case 'custom':
            // CRITICAL FIX: Handle parametric and custom shapes with meshData
            console.log(`Creating parametric/custom mesh for: ${shape.id}`);
            const shapeData = shape as any;
            
            if (shapeData.meshData && shapeData.meshData.positions && shapeData.meshData.indices) {
              try {
                // Create custom mesh from vertex data
                const customMesh = new Mesh(shape.id, sceneRef.current!);
                
                const positions = shapeData.meshData.positions;
                const indices = shapeData.meshData.indices;
                const normals: number[] = [];
                
                // Compute normals if not provided
                if (!shapeData.meshData.normals) {
                  VertexData.ComputeNormals(positions, indices, normals);
                }
                
                const vertexData = new VertexData();
                vertexData.positions = positions;
                vertexData.indices = indices;
                vertexData.normals = shapeData.meshData.normals || normals;
                
                // CRITICAL: Ensure normals point outward (not inverted)
                // This is a fallback - backfaceCulling=false should handle it, but extra safety
                if (vertexData.normals && vertexData.normals.length > 0) {
                  // Check if majority of normals point inward (negative) - if so, flip them
                  let dotSum = 0;
                  for (let i = 0; i < positions.length; i += 3) {
                    const nx = vertexData.normals[i];
                    const ny = vertexData.normals[i + 1];
                    const nz = vertexData.normals[i + 2];
                    const px = positions[i];
                    const py = positions[i + 1];
                    const pz = positions[i + 2];
                    // Dot product of position with normal (should be positive for outward normals)
                    dotSum += nx * px + ny * py + nz * pz;
                  }
                  
                  // If majority point inward, flip all normals
                  if (dotSum < 0) {
                    console.log(`Detected inverted normals for ${shape.id}, flipping...`);
                    for (let i = 0; i < vertexData.normals.length; i++) {
                      vertexData.normals[i] *= -1;
                    }
                  }
                }
                
                vertexData.applyToMesh(customMesh);
                
                customMesh.setEnabled(true);
                customMesh.isVisible = true;
                customMesh.metadata = { 
                  shapeId: shape.id, 
                  isParametric: shape.type === 'parametric',
                  version: (shape as any).version || 1  // Store version for change detection
                };
                
                // FIX: Create material with proper backface culling settings
                const customMaterial = new StandardMaterial(`${shape.id}_material`, sceneRef.current!);
                customMaterial.backFaceCulling = false; // Show both sides
                customMaterial.twoSidedLighting = true; // Proper lighting on both sides
                
                if (shape.color) {
                  if (typeof shape.color === 'string') {
                    const hex = shape.color.replace('#', '');
                    const r = parseInt(hex.substr(0, 2), 16) / 255;
                    const g = parseInt(hex.substr(2, 2), 16) / 255;
                    const b = parseInt(hex.substr(4, 2), 16) / 255;
                    customMaterial.diffuseColor = new Color3(r, g, b);
                  } else {
                    const colorObj = shape.color as any;
                    customMaterial.diffuseColor = new Color3(colorObj.r || 0.7, colorObj.g || 0.7, colorObj.b || 0.7);
                  }
                } else {
                  customMaterial.diffuseColor = new Color3(0.7, 0.7, 0.7);
                }
                
                customMesh.material = customMaterial;
                
                // FIX: Store mesh reference immediately for parametric shapes
                shapeMeshesRef.current.set(shape.id, customMesh);
                
                mesh = customMesh;
                shouldFinalizeMesh = false; // Don't apply generic material - we already have custom material!
                console.log(`Created parametric/custom mesh: ${shape.id} (${positions.length/3} vertices)`);
              } catch (e) {
                console.error(`Failed to create parametric/custom mesh for ${shape.id}:`, e);
                shouldFinalizeMesh = false;
                break;
              }
            } else {
              console.warn(`Parametric/custom shape ${shape.id} has no meshData - skipping`);
              shouldFinalizeMesh = false;
              break;
            }
            break;
          
          default:
            // CRITICAL FIX: Do NOT create white boxes for unrecognized types!
            console.warn(`Unknown shape type '${(shape as any).type}' - skipping mesh creation:`, (shape as any).id);
            shouldFinalizeMesh = false;
            break; // Skip this iteration - don't create default white cube
        }
        
        if (shouldFinalizeMesh && mesh) {
          // Set mesh name for identification
          mesh.name = shape.id;
          
          // Apply INITIAL position, rotation, and scaling from store data
          mesh.position = new Vector3(shape.position.x, shape.position.y, shape.position.z);
          mesh.rotation = new Vector3(
            (shape.rotation.x || 0) * Math.PI / 180,
            (shape.rotation.y || 0) * Math.PI / 180,
            (shape.rotation.z || 0) * Math.PI / 180
          );
          
          const scaling = shape.scaling || { x: 1, y: 1, z: 1 };
          mesh.scaling = new Vector3(scaling.x, scaling.y, scaling.z);
          
          // Apply material with color fallback
          const material = new StandardMaterial(`${shape.id}_material`, sceneRef.current!);
          
          if (shape.color) {
            if (typeof shape.color === 'string') {
              const hex = shape.color.replace('#', '');
              const r = parseInt(hex.substr(0, 2), 16) / 255;
              const g = parseInt(hex.substr(2, 2), 16) / 255;
              const b = parseInt(hex.substr(4, 2), 16) / 255;
              material.diffuseColor = new Color3(r, g, b);
            } else {
              const colorObj = shape.color as any;
              material.diffuseColor = new Color3(colorObj.r || 0.7, colorObj.g || 0.7, colorObj.b || 0.7);
            }
          } else {
            material.diffuseColor = new Color3(0.7, 0.7, 0.7);
          }
          mesh.material = material;
          
          // REMOVED: onAfterWorldMatrixUpdateObservable to prevent conflicts with gizmo handlers
          // Transform sync is now handled directly by gizmo drag events for maximum smoothness
          
          // Store mesh reference (never clear this unless shape is deleted)
          shapeMeshesRef.current.set(shape.id, mesh);
          
          console.log(`Created mesh for new shape: ${shape.id}`);
        }
      } else {
        // EXISTING MESH: Check if geometry needs rebuilding or just transform update
        const existingMesh = shapeMeshesRef.current.get(shape.id)!;
        
        // CRITICAL FIX: Only rebuild geometry if vertex count ACTUALLY CHANGED
        // Don't rebuild for every update - only when meshData is different
        const shapeData = shape as any;
        
        if ((shape.type === 'parametric' || shape.type === 'custom') && 
            shapeData.meshData && 
            shapeData.meshData.positions && 
            shapeData.meshData.indices) {
          
          const currentVertexCount = existingMesh.getTotalVertices();
          const newVertexCount = shapeData.meshData.positions.length / 3;
          
          // CRITICAL FIX: Check version field for parameter changes
          // A cube always has 24 vertices regardless of size, so vertex count check alone fails!
          const currentVersion = (existingMesh.metadata as any)?.version || 0;
          const newVersion = (shape as any).version || 0;
          
          const vertexCountChanged = currentVertexCount !== newVertexCount;
          const versionChanged = newVersion > currentVersion;
          
          // Rebuild if vertex count changed OR version changed (parameters updated)
          if (vertexCountChanged || versionChanged) {
            console.log(`Geometry needs update for: ${shape.id}`, {
              reason: vertexCountChanged ? 'vertex count changed' : 'version changed',
              vertices: `${currentVertexCount} → ${newVertexCount}`,
              version: `${currentVersion} → ${newVersion}`
            });
            
            // SMOOTH UPDATE: Update geometry in-place (no dispose/recreate = no blink!)
            try {
              const positions = new Float32Array(shapeData.meshData.positions);
              const indices = new Uint32Array(shapeData.meshData.indices);
              
              // Compute normals if not provided
              let normals: Float32Array;
              if (shapeData.meshData.normals) {
                normals = new Float32Array(shapeData.meshData.normals);
              } else {
                const normalsArray: number[] = [];
                VertexData.ComputeNormals(Array.from(positions), Array.from(indices), normalsArray);
                normals = new Float32Array(normalsArray);
              }
              
              // Create new vertex data
              const vertexData = new VertexData();
              vertexData.positions = positions;
              vertexData.indices = indices;
              vertexData.normals = normals;
              
              // SMOOTH: Update mesh geometry in-place (no dispose = no blink!)
              vertexData.applyToMesh(existingMesh, true); // true = updatable
              
              // Update version in metadata
              existingMesh.metadata = {
                ...existingMesh.metadata,
                version: newVersion
              };
              
              console.log(`Smoothly updated geometry for: ${shape.id} (no blink!)`);
            } catch (e) {
              console.error(`Failed to update geometry for ${shape.id}:`, e);
            }
          }
          // If vertex count AND version are same, don't rebuild - just update transforms below
        }
        
        // Apply stored transformations to existing mesh
        existingMesh.position = new Vector3(shape.position.x, shape.position.y, shape.position.z);
        
        const rotationRadians = new Vector3(
          (shape.rotation.x || 0) * Math.PI / 180,
          (shape.rotation.y || 0) * Math.PI / 180,
          (shape.rotation.z || 0) * Math.PI / 180
        );
        existingMesh.rotation = rotationRadians;
        
        const scaling = shape.scaling || { x: 1, y: 1, z: 1 };
        existingMesh.scaling = new Vector3(scaling.x, scaling.y, scaling.z);
        existingMesh.setEnabled(true);
        (existingMesh as any).isVisible = true;
        
        console.log(`Updated existing mesh transforms for: ${shape.id}`, {
          position: shape.position,
          rotationDegrees: shape.rotation,
          rotationRadians: {
            x: rotationRadians.x,
            y: rotationRadians.y,
            z: rotationRadians.z
          },
          scaling: scaling
        });
      }
    });

    // 2. EXPERT FIX: Debounced deletions - confirm on next frame before disposing
    const existingIds = Array.from(shapeMeshesRef.current.keys());
    const currentIds = new Set(list.map(s => s.id));

    // Collect candidates for deletion (but IGNORE temporary AI meshes)
    const toMaybeDelete: string[] = [];
    for (const id of existingIds) {
      // FIX: Skip temporary AI meshes (they get disposed separately)
      if (id.startsWith('AIGeneratedShape_')) {
        console.log(`Skipping deletion check for temporary AI mesh: ${id}`);
        continue;
      }
      if (!currentIds.has(id)) toMaybeDelete.push(id);
    }

    // EXPERT KEY: Confirm on next frame before disposing (prevents false positives)
    if (toMaybeDelete.length) {
      console.log(`🕰️ Scheduling deletion confirmation for ${toMaybeDelete.length} meshes:`, toMaybeDelete);
      requestAnimationFrame(() => {
        const currentShapes = useStore.getState().shapes;
        const idsNow = new Set(currentShapes.map(s => s.id));
        console.log(`Deletion check - Current shapes in store:`, Array.from(idsNow), `(${currentShapes.length} total)`);
        
        // CRITICAL FIX: If store is empty, DON'T delete anything (likely a race condition)
        if (currentShapes.length === 0 && toMaybeDelete.length > 0) {
          console.warn(`SAFETY: Store is empty but meshes exist - skipping deletion to prevent race condition`);
          return;
        }
        
        for (const id of toMaybeDelete) {
          if (!idsNow.has(id)) {
            const mesh = shapeMeshesRef.current.get(id);
            if (mesh) {
              console.log(`CONFIRMED delete mesh: ${id}`);
              
              // Properly dispose imported models with all child meshes
              if (mesh.metadata?.isModelContainer) {
                // This is an imported model container - dispose all children first
                const disposeHierarchy = (node: any) => {
                  if (node.getChildren) {
                    const children = node.getChildren();
                    for (const child of children) {
                      disposeHierarchy(child);
                    }
                  }
                  // Dispose materials if they exist
                  if (node.material) {
                    node.material.dispose();
                  }
                  // Dispose the mesh itself
                  if (node.dispose) {
                    node.dispose();
                  }
                };
                
                console.log(`Disposing imported model hierarchy for: ${id}`);
                disposeHierarchy(mesh);
              } else {
                // Regular primitive mesh - simple disposal
                mesh.dispose();
              }
              
              shapeMeshesRef.current.delete(id);
            }
          } else {
            console.log(`✋ CANCELLED delete mesh: ${id} (still exists in store)`);
          }
        }
        sceneRef.current?.render?.();
      });
    }
    
    console.log(`EXPERT SYNC COMPLETE: ${shapeMeshesRef.current.size} total meshes`);
    // Force a render to ensure visibility updates are shown immediately
    try { sceneRef.current?.render(); } catch {}
  }, []); // EXPERT FIX: No deps - stable function

  // EXPERT FIX: Keep a live ref to the function so subscription can call newest implementation
  const syncShapeMeshesRef = useRef(syncShapeMeshes);
  useEffect(() => { syncShapeMeshesRef.current = syncShapeMeshes; }, [syncShapeMeshes]);

  // EXPERT FIX: Pending shapes queue for undo/redo execution
  const pendingShapesRef = useRef<Shape[] | null>(null);

  // GIZMO-SAFE pointer events for selection (avoid interfering with gizmo interaction)
  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!sceneRef.current || !cameraRef.current) return;
    
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    const pickInfo = sceneRef.current.pick(x, y);
    
    // CRITICAL FIX: Do NOT interfere with gizmo interactions
    if (pickInfo.hit && pickInfo.pickedMesh) {
      const mesh = pickInfo.pickedMesh as AbstractMesh;
      // Default: select the exact part (child mesh). Hold Ctrl/Cmd to select the whole model container.
      let targetMesh: AbstractMesh = mesh;
      const sid = (mesh.metadata && (mesh.metadata.shapeId as string)) || undefined;
      if (sid && sceneRef.current && keyboardStateRef.current.ctrl) {
        const container = sceneRef.current.getMeshByName(sid) as AbstractMesh | null;
        if (container) targetMesh = container;
      }
      
      // Check if this is a gizmo mesh - if so, let the gizmo handle it
      if (targetMesh.name.includes('gizmo') || targetMesh.name.includes('Gizmo') || 
          targetMesh.parent?.name.includes('gizmo') || targetMesh.parent?.name.includes('Gizmo')) {
        console.log('GIZMO INTERACTION: Letting gizmo handle the click');
        return; // Do NOT interfere with gizmo interaction
      }
      
      // Handle regular mesh selection (non-gizmo meshes only)
      if (keyboardStateRef.current.shift) {
        const currentSelection = [...selectedMeshes];
        const meshIndex = currentSelection.indexOf(targetMesh);
        
        if (meshIndex >= 0) {
          // Remove from selection
          currentSelection.splice(meshIndex, 1);
        } else {
          // Add to selection
          currentSelection.push(targetMesh);
        }
        
        setSelectedMeshes(currentSelection);
      } else {
        // Single selection
        setSelectedMeshes([targetMesh]);
      }
    } else {
      // CRITICAL FIX: Only clear selection if NOT interacting with gizmos
      // Check if we're clicking on utility layer (where gizmos live)
      if (gizmoLayerRef.current) {
        const utilLayerPickInfo = gizmoLayerRef.current.utilityLayerScene.pick(x, y);
        if (utilLayerPickInfo?.hit) {
          console.log('UTILITY LAYER INTERACTION: Preserving selection for gizmo use');
          return; // Do NOT clear selection when interacting with utility layer
        }
      }
      
      // Clear selection only when clicking truly empty space
      console.log('🔘 EMPTY SPACE CLICKED: Clearing selection');
      setSelectedMeshes([]);
    }
  }, [selectedMeshes]);

  // Keyboard event handling
  const setupKeyboardHandling = useCallback(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      keyboardStateRef.current.shift = event.shiftKey;
      keyboardStateRef.current.ctrl = event.ctrlKey || event.metaKey;
      
      // Skip if user is typing in input fields
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }
      
      // Gizmo mode shortcuts
      if (event.key === 'g' || event.key === 'G') {
        handleGizmoModeChange('position');
        return;
      }
      if (event.key === 'r' || event.key === 'R') {
        handleGizmoModeChange('rotation');
        return;
      }
      if (event.key === 's' || event.key === 'S') {
        handleGizmoModeChange('scale');
        return;
      }
      if (event.key === 'Escape') {
        handleGizmoModeChange('none');
        return;
      }
    };
    
    const handleKeyUp = (event: KeyboardEvent) => {
      keyboardStateRef.current.shift = event.shiftKey;
      keyboardStateRef.current.ctrl = event.ctrlKey || event.metaKey;
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // OLD WORKING APPROACH: Simple gizmo mode handler
  useEffect(() => {
    if (!gizmoManagerRef.current) {
      console.warn('GizmoManager not available for mode change');
      return;
    }
    
    console.log(`Setting gizmo mode to: ${gizmoMode}`);
    
    // OLD WORKING PATTERN: Enable/disable gizmos based on mode
    const enabled = gizmoMode !== 'none';
    gizmoManagerRef.current.positionGizmoEnabled = gizmoMode === 'position' && enabled;
    gizmoManagerRef.current.rotationGizmoEnabled = gizmoMode === 'rotation' && enabled;
    gizmoManagerRef.current.scaleGizmoEnabled = gizmoMode === 'scale' && enabled;
    gizmoManagerRef.current.boundingBoxGizmoEnabled = false; // Keep disabled
    
    // APPLY X-RAY EFFECT: Ensure newly created gizmos get X-ray configuration
    if (enabled && gizmoLayerRef.current) {
      setTimeout(() => {
        const applyXRayToCurrentGizmo = () => {
          const utilLayer = gizmoLayerRef.current!;
          
          // Get all meshes from the utility layer
          const gizmoMeshes = utilLayer.utilityLayerScene.meshes || [];
          
          gizmoMeshes.forEach((mesh: any) => {
            if (mesh.material) {
              // X-RAY EFFECT: Make gizmo visible through all objects
              mesh.material.disableDepthWrite = true;
              mesh.material.depthFunction = 519; // ALWAYS
              mesh.material.backFaceCulling = false;
              mesh.renderingGroupId = 3;
              
              // For materials with multiple sub-materials
              if (mesh.material.subMaterials) {
                mesh.material.subMaterials.forEach((subMat: any) => {
                  if (subMat) {
                    subMat.disableDepthWrite = true;
                    subMat.depthFunction = 519;
                    subMat.backFaceCulling = false;
                  }
                });
              }
            }
            mesh.renderingGroupId = 3;
          });
          
          console.log(`X-ray effect applied to ${gizmoMode} gizmo`);
        };
        
        applyXRayToCurrentGizmo();
      }, 150); // Small delay to ensure gizmo is created
    }
    
    console.log(`Gizmo mode set to: ${gizmoMode}`);
  }, [gizmoMode]);

  // OLD WORKING APPROACH: Simple gizmo selection handler
  useEffect(() => {
    if (!gizmoManagerRef.current) {
      console.warn('GizmoManager not available for selection update');
      return;
    }
    
    console.log(`Selection changed: ${selectedMeshes.length} meshes selected`);
    
    if (selectedMeshes.length > 0) {
      const lastSelected = selectedMeshes[selectedMeshes.length - 1];
      const objectId = lastSelected.metadata?.shapeId || lastSelected.name;
      console.log(`Attaching gizmo to: ${lastSelected.name} (${objectId})`);
      
      // COLLABORATIVE FEATURES: Check if object is locked by another user
      const lockedBy = isObjectLocked && isObjectLocked(objectId);
      if (lockedBy) {
        console.log(`COLLABORATION: Object ${objectId} is locked by ${lockedBy.email}`);
        // TODO: Show visual indicator that object is locked
        gizmoManagerRef.current.attachToMesh(null);
        return;
      }
      
      // COLLABORATIVE FEATURES: Lock object for editing
      if (startEditingObject && fileId) {
        startEditingObject(objectId).then((canEdit: boolean) => {
          if (!canEdit) {
            console.log(`COLLABORATION: Failed to lock object ${objectId}`);
            if (gizmoManagerRef.current) {
              gizmoManagerRef.current.attachToMesh(null);
            }
            return;
          }
          console.log(`COLLABORATION: Successfully locked object ${objectId} for editing`);
        });
      }
      
      // OLD WORKING PATTERN: Attach gizmo to selected mesh
      gizmoManagerRef.current.attachToMesh(lastSelected);
      
      // COLLABORATIVE FEATURES: Wire up transform broadcasting
      const currentGizmo = gizmoManagerRef.current;
      if (currentGizmo && broadcastEvent) {
        // Setup transform event listeners for real-time collaboration
        const setupTransformBroadcasting = () => {
          // Store the initial transform state BEFORE any drag starts
          let initialTransform: any = null;
          
          // Position gizmo events
          if (currentGizmo.gizmos.positionGizmo) {
            const posGizmo = currentGizmo.gizmos.positionGizmo;
            // Prevent duplicate handlers across re-attaches
            posGizmo.onDragStartObservable.clear();
            posGizmo.onDragEndObservable.clear();
            
            // Capture initial state BEFORE drag
            posGizmo.onDragStartObservable.add(() => {
              initialTransform = {
                position: { x: lastSelected.position.x, y: lastSelected.position.y, z: lastSelected.position.z },
                rotation: {
                  x: (lastSelected.rotation.x || 0) * 180 / Math.PI,
                  y: (lastSelected.rotation.y || 0) * 180 / Math.PI,
                  z: (lastSelected.rotation.z || 0) * 180 / Math.PI
                },
                scaling: { x: lastSelected.scaling.x, y: lastSelected.scaling.y, z: lastSelected.scaling.z }
              };
              console.log('GIZMO: Captured initial position state:', initialTransform.position);
            });
            
            posGizmo.onDragEndObservable.add(() => {
              const rotationDeg = {
                x: (lastSelected.rotation.x || 0) * 180 / Math.PI,
                y: (lastSelected.rotation.y || 0) * 180 / Math.PI,
                z: (lastSelected.rotation.z || 0) * 180 / Math.PI
              };
              const newTransform = {
                position: { x: lastSelected.position.x, y: lastSelected.position.y, z: lastSelected.position.z },
                rotation: rotationDeg,
                scaling: { x: lastSelected.scaling.x, y: lastSelected.scaling.y, z: lastSelected.scaling.z }
              };
              
              // PROPER TRANSFORM: Use undo/redo system with direct methods for position updates  
              if (undoRedoSystem && undoRedoSystem.executeAction && initialTransform) {
                const positionAction = {
                  type: 'UPDATE_POSITION',
                  description: `Move object`,
                  data: { objectId, oldTransform: initialTransform, newTransform },
                  redo: async () => {
                    console.log('UNDO/REDO: Applying position with direct method:', objectId, newTransform.position);
                    updateShapeDirectly(objectId, newTransform);
                  },
                  undo: async () => {
                    console.log('UNDO/REDO: Reverting position with direct method:', objectId, initialTransform.position);
                    updateShapeDirectly(objectId, initialTransform);
                  }
                };
                
                // Execute through undo/redo system (immediate + trackable)
                undoRedoSystem.executeAction(positionAction);
                console.log('PROPER GIZMO: Position updated through undo/redo system');
              } else {
                // Fallback: Direct update without tracking
                console.log('FALLBACK: Updating position directly (no undo/redo available)');
                updateShapeDirectly(objectId, newTransform);
                console.log('FALLBACK: Position updated directly');
              }
              
              console.log('COLLABORATION: Broadcasting position change:', objectId, newTransform);
              broadcastEvent({
                event: 'transform',
                object_id: objectId,
                data: { newTransform }
              });
            });
          }
          
          // Rotation gizmo events
          if (currentGizmo.gizmos.rotationGizmo) {
            const rotGizmo = currentGizmo.gizmos.rotationGizmo;
            // Prevent duplicate handlers across re-attaches
            rotGizmo.onDragStartObservable.clear();
            rotGizmo.onDragEndObservable.clear();
            
            // Store initial rotation state
            let initialRotationTransform: any = null;
            
            // Capture initial state BEFORE drag
            rotGizmo.onDragStartObservable.add(() => {
              initialRotationTransform = {
                position: { x: lastSelected.position.x, y: lastSelected.position.y, z: lastSelected.position.z },
                rotation: {
                  x: (lastSelected.rotation.x || 0) * 180 / Math.PI,
                  y: (lastSelected.rotation.y || 0) * 180 / Math.PI,
                  z: (lastSelected.rotation.z || 0) * 180 / Math.PI
                },
                scaling: { x: lastSelected.scaling.x, y: lastSelected.scaling.y, z: lastSelected.scaling.z }
              };
              console.log('GIZMO: Captured initial rotation state:', initialRotationTransform.rotation);
            });
            
            rotGizmo.onDragEndObservable.add(() => {
              const rotationDeg = {
                x: (lastSelected.rotation.x || 0) * 180 / Math.PI,
                y: (lastSelected.rotation.y || 0) * 180 / Math.PI,
                z: (lastSelected.rotation.z || 0) * 180 / Math.PI
              };
              const newTransform = {
                position: { x: lastSelected.position.x, y: lastSelected.position.y, z: lastSelected.position.z },
                rotation: rotationDeg,
                scaling: { x: lastSelected.scaling.x, y: lastSelected.scaling.y, z: lastSelected.scaling.z }
              };
              
              // PROPER TRANSFORM: Use undo/redo system with direct methods for rotation updates
              if (undoRedoSystem && undoRedoSystem.executeAction && initialRotationTransform) {
                const rotationAction = {
                  type: 'UPDATE_ROTATION',
                  description: `Rotate object`,
                  data: { objectId, oldTransform: initialRotationTransform, newTransform },
                  redo: async () => {
                    console.log('UNDO/REDO: Applying rotation with direct method:', objectId, newTransform.rotation);
                    updateShapeDirectly(objectId, newTransform);
                  },
                  undo: async () => {
                    console.log('UNDO/REDO: Reverting rotation with direct method:', objectId, initialRotationTransform.rotation);
                    updateShapeDirectly(objectId, initialRotationTransform);
                  }
                };
                
                // Execute through undo/redo system (immediate + trackable)
                undoRedoSystem.executeAction(rotationAction);
                console.log('PROPER GIZMO: Rotation updated through undo/redo system');
              } else {
                // Fallback: Direct update without tracking
                console.log('FALLBACK: Updating rotation directly (no undo/redo available)');
                updateShapeDirectly(objectId, newTransform);
                console.log('FALLBACK: Rotation updated directly');
              }
              
              console.log('COLLABORATION: Broadcasting rotation change:', objectId, newTransform);
              broadcastEvent({
                event: 'transform',
                object_id: objectId,
                data: { newTransform }
              });
            });
          }
          
          // Scale gizmo events  
          if (currentGizmo.gizmos.scaleGizmo) {
            const scaleGizmo = currentGizmo.gizmos.scaleGizmo;
            // Prevent duplicate handlers across re-attaches
            scaleGizmo.onDragStartObservable.clear();
            scaleGizmo.onDragEndObservable.clear();
            
            // Store initial scale state
            let initialScaleTransform: any = null;
            
            // Capture initial state BEFORE drag
            scaleGizmo.onDragStartObservable.add(() => {
              initialScaleTransform = {
                position: { x: lastSelected.position.x, y: lastSelected.position.y, z: lastSelected.position.z },
                rotation: {
                  x: (lastSelected.rotation.x || 0) * 180 / Math.PI,
                  y: (lastSelected.rotation.y || 0) * 180 / Math.PI,
                  z: (lastSelected.rotation.z || 0) * 180 / Math.PI
                },
                scaling: { x: lastSelected.scaling.x, y: lastSelected.scaling.y, z: lastSelected.scaling.z }
              };
              console.log('GIZMO: Captured initial scale state:', initialScaleTransform.scaling);
            });
            
            scaleGizmo.onDragEndObservable.add(() => {
              const rotationDeg = {
                x: (lastSelected.rotation.x || 0) * 180 / Math.PI,
                y: (lastSelected.rotation.y || 0) * 180 / Math.PI,
                z: (lastSelected.rotation.z || 0) * 180 / Math.PI
              };
              const newTransform = {
                position: { x: lastSelected.position.x, y: lastSelected.position.y, z: lastSelected.position.z },
                rotation: rotationDeg,
                scaling: { x: lastSelected.scaling.x, y: lastSelected.scaling.y, z: lastSelected.scaling.z }
              };
              
              // PROPER TRANSFORM: Use undo/redo system with direct methods for scaling updates
              if (undoRedoSystem && undoRedoSystem.executeAction && initialScaleTransform) {
                const scalingAction = {
                  type: 'UPDATE_SCALING',
                  description: `Scale object`,
                  data: { objectId, oldTransform: initialScaleTransform, newTransform },
                  redo: async () => {
                    console.log('UNDO/REDO: Applying scaling with direct method:', objectId, newTransform.scaling);
                    updateShapeDirectly(objectId, newTransform);
                  },
                  undo: async () => {
                    console.log('UNDO/REDO: Reverting scaling with direct method:', objectId, initialScaleTransform.scaling);
                    updateShapeDirectly(objectId, initialScaleTransform);
                  }
                };
                
                // Execute through undo/redo system (immediate + trackable)
                undoRedoSystem.executeAction(scalingAction);
                console.log('PROPER GIZMO: Scaling updated through undo/redo system');
              } else {
                // Fallback: Direct update without tracking
                console.log('FALLBACK: Updating scaling directly (no undo/redo available)');
                updateShapeDirectly(objectId, newTransform);
                console.log('FALLBACK: Scaling updated directly');
              }
              
              console.log('COLLABORATION: Broadcasting scale change:', objectId, newTransform);
              broadcastEvent({
                event: 'transform',
                object_id: objectId,
                data: { newTransform }
              });
            });
          }
        };
        
        // Setup broadcasting with delay to ensure gizmos are created
        setTimeout(setupTransformBroadcasting, 100);
      }
      
      // OLD WORKING PATTERN: Re-enable correct mode after attachment
      const enabled = gizmoMode !== 'none';
      gizmoManagerRef.current.positionGizmoEnabled = gizmoMode === 'position' && enabled;
      gizmoManagerRef.current.rotationGizmoEnabled = gizmoMode === 'rotation' && enabled;
      gizmoManagerRef.current.scaleGizmoEnabled = gizmoMode === 'scale' && enabled;
      
      console.log(`Gizmo attached and configured for ${gizmoMode} mode with collaborative features`);
    } else {
      // COLLABORATIVE FEATURES: Release object lock when deselecting
      if (stopEditingObject) {
        stopEditingObject();
        console.log('COLLABORATION: Released object lock (deselected)');
      }
      
      // No selection - detach gizmos
      console.log(`Detaching gizmo (no selection)`);
      gizmoManagerRef.current.attachToMesh(null);
    }
  }, [selectedMeshes, gizmoMode]);

  // OLD WORKING APPROACH: Initialize GizmoManager directly in scene initialization
  const handleGizmoModeChange = useCallback((mode: GizmoMode) => {
    console.log(`GIZMO: Switching to ${mode} mode`);
    setGizmoMode(mode);
  }, []);

  // PRODUCTION initialization
  const initializeBabylonScene = useCallback(async () => {
    if (!canvasRef.current) {
      console.error('PRODUCTION: Canvas not available');
      return;
    }
    
    try {
      console.log('PRODUCTION: Starting initialization...');
      setError(null);
      
      // Create engine
      const engine = createBulletproofEngine(canvasRef.current);
      engineRef.current = engine;
      
      // Create scene
      const scene = createScene(engine);
      sceneRef.current = scene;
      
      // Setup keyboard handling
      const keyboardCleanup = setupKeyboardHandling();
      
      // Start render loop
      startRenderLoop();
      
      // Update scene store
      setScene(scene);
      
      // Mark as initialized
      setIsInitialized(true);
      
      console.log('PRODUCTION: Initialization complete');
      
      // Immediately force a sync once the scene is ready to catch any shapes
      try {
        console.log('PRODUCTION: Forcing initial mesh sync right after initialization');
        const currentShapes = useStore.getState().shapes;
        syncShapeMeshes(currentShapes);
        // Also schedule a next-tick sync to avoid any potential race with React state batching
        requestAnimationFrame(() => {
          console.log('PRODUCTION: Running next-frame mesh sync');
          const latestShapes = useStore.getState().shapes;
          syncShapeMeshes(latestShapes);
        });
      } catch (e) {
        console.warn('PRODUCTION: Initial sync after init failed:', e);
      }
      
      // Return cleanup function
      return () => {
        console.log('PRODUCTION: Cleaning up...');
        keyboardCleanup();
        stopRenderLoop();
        
        // Clear any pending timeout
        if (updateTimeoutRef.current) {
          clearTimeout(updateTimeoutRef.current);
          updateTimeoutRef.current = null;
        }
        
        // Dispose scene and engine
        if (sceneRef.current) {
          sceneRef.current.dispose();
        }
        if (engineRef.current) {
          engineRef.current.dispose();
        }
      };
    } catch (err) {
      console.error('PRODUCTION: Initialization failed:', err);
      setError(String(err));
      return undefined;
    }
  }, []); // CRITICAL FIX: Empty dependencies to prevent infinite re-initialization loop

  // Initialize on mount
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    
    const initialize = async () => {
      cleanup = await initializeBabylonScene();
    };
    
    initialize();
    
    return () => {
      if (cleanup) cleanup();
    };
  }, [initializeBabylonScene]);

  // REMOVED: Redundant React effect that was causing double mesh sync triggers
  // The Zustand subscription below handles all mesh sync reliably

  // EXPERT FIX: Single subscription with queueing and debounced deletions
  useEffect(() => {
    console.log('EXPERT SUBSCRIBE: registering single stable subscription');
    
    const unsubscribe = useStore.subscribe((nextState: any, prevState: any) => {
      const nextShapes: Shape[] = nextState.shapes;
      const prevShapes: Shape[] = prevState?.shapes;

      // Only react if the array reference actually changed
      if (nextShapes === prevShapes) return;

      console.log('EXPERT SUBSCRIBE: shapes changed', { 
        count: nextShapes?.length ?? 0,
        prevCount: prevShapes?.length ?? 0 
      });

      const isExecuting = nextState._undoRedoSystem?.isExecuting;
      if (isExecuting) {
        // Defer syncing until execution finishes
        console.log('EXPERT SUBSCRIBE: queueing shapes during undo/redo execution');
        pendingShapesRef.current = nextShapes;
        return;
      }

      // Sync now using the stable ref
      console.log('EXPERT SUBSCRIBE: syncing immediately');
      syncShapeMeshesRef.current(nextShapes);
      sceneRef.current?.render?.();
    });
    
    return () => {
      console.log('EXPERT SUBSCRIBE: unsubscribing single subscription');
      try { unsubscribe && unsubscribe(); } catch {}
    };
  }, []); // EXPERT KEY: subscribe once, never re-register

  // EXPERT FIX: Flush queued shapes after undo/redo execution completes
  useEffect(() => {
    let lastExecutingState = useStore.getState()._undoRedoSystem?.isExecuting;
    const unsub = useStore.subscribe((nextState: any, _prevState: any) => {
      const isExec = nextState._undoRedoSystem?.isExecuting;
      const wasExec = lastExecutingState;
      
      if (wasExec && !isExec) {
        console.log('EXPERT FLUSH: undo/redo execution finished, flushing queued shapes');
        const list = pendingShapesRef.current ?? useStore.getState().shapes;
        pendingShapesRef.current = null;
        syncShapeMeshesRef.current(list);
        sceneRef.current?.render?.();
      }
      
      lastExecutingState = isExec;
    });
    return () => unsub();
  }, []);

  return (
    <div 
      className={className}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        ...style
      }}
    >
      <canvas
        ref={canvasRef}
        id={id}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          outline: 'none',
          touchAction: 'none'
        }}
        tabIndex={0}
        onPointerDown={handlePointerDown} // OLD WORKING PATTERN: React handles selection, Babylon handles gizmos
        onMouseMove={handleMouseMove} // COLLABORATIVE FEATURES: Track cursor for real-time sharing
      />
      
      {/* Gizmo Mode Controls */}
      {isInitialized && selectedMeshes.length > 0 && (
        <div style={{
          position: 'absolute',
          top: 20,
          right: 20,
          display: 'flex',
          gap: '8px',
          zIndex: 1000
        }}>
          {(['position', 'rotation', 'scale'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => handleGizmoModeChange(mode)}
              style={{
                padding: '10px 16px',
                borderRadius: '8px',
                border: 'none',
                background: gizmoMode === mode 
                  ? 'linear-gradient(135deg, #ff007f, #ff4da6)' 
                  : 'rgba(0, 0, 0, 0.8)',
                color: 'white',
                fontSize: '12px',
                fontWeight: 'bold',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                transition: 'all 0.2s ease',
                textTransform: 'capitalize'
              }}
            >
              {mode === 'position' && '↔️'} {mode === 'rotation' && ''} {mode === 'scale' && '📏'} {mode === 'position' ? 'Move' : mode === 'rotation' ? 'Rotate' : 'Scale'}
            </button>
          ))}
        </div>
      )}
      
      {/* Selection Info */}
      {selectedMeshes.length > 0 && (
        <div style={{
          position: 'absolute',
          bottom: 20,
          right: 20,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          color: '#e879f9',
          padding: '6px 12px',
          borderRadius: '12px',
          fontSize: '11px',
          fontWeight: '500',
          pointerEvents: 'none',
          zIndex: 1000,
          border: '1px solid rgba(232, 121, 249, 0.3)',
          boxShadow: '0 4px 12px rgba(232, 121, 249, 0.15)',
          fontFamily: 'monospace'
        }}>
          <span style={{ opacity: 0.7, marginRight: '6px' }}></span>
          {selectedMeshes.length} selected · {gizmoMode}
        </div>
      )}
      
      {/* Error Display */}
      {error && (
        <div style={{
          position: 'absolute',
          top: 50,
          left: 50,
          right: 50,
          background: 'rgba(255, 0, 0, 0.95)',
          color: 'white',
          padding: '16px 20px',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: 'bold',
          zIndex: 2000,
          boxShadow: '0 4px 16px rgba(0,0,0,0.5)'
        }}>
          Production Error: {error}
        </div>
      )}
      
      {/* Loading State */}
      {!isInitialized && !error && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '20px',
          borderRadius: '10px',
          fontSize: '16px',
          zIndex: 1000
        }}>
          Initializing Production Viewport...
        </div>
      )}
    </div>
  );
};

export default ViewportProduction;
