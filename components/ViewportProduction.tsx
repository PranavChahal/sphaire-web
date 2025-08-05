import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Engine, Scene, ArcRotateCamera, Vector3, HemisphericLight, DirectionalLight,
  MeshBuilder, StandardMaterial, Color3, Color4, AbstractMesh, Mesh,
  UtilityLayerRenderer, GizmoManager
} from '@babylonjs/core';
import { GizmoMode } from '../utils/UnifiedGizmoSystem';

import '@babylonjs/core/Materials/standardMaterial';

import '@babylonjs/loaders/glTF/2.0/glTFLoader';
import '@babylonjs/loaders/OBJ/objFileLoader';
import '@babylonjs/loaders/STL/stlFileLoader';

import useStore from '../store/store';
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
  
  // Get fileId from router for collaborative features
  const router = useRouter();
  const { fileId } = router.query;
  
  const { 
    shapes,
    updateShape
  } = useStore();
  const { setScene, selectedMeshes, setSelectedMeshes } = useSceneStore();
  
  // 🚀 COLLABORATIVE FEATURES: Initialize real-time collaboration hook
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
      console.log('📡 COLLABORATION: Received realtime event:', event);
      handleRemoteEvent(event);
    }
  });
  

  

  

  const gizmoLayerRef = useRef<UtilityLayerRenderer | null>(null);
  const gizmoManagerRef = useRef<GizmoManager | null>(null);
  
  // Shape mesh references
  const shapeMeshesRef = useRef<Map<string, Mesh>>(new Map());
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // 🚀 COLLABORATIVE FEATURES: Cursor and presence tracking
  const collaboratorCursorsRef = useRef<Map<string, Mesh>>(new Map());
  const cursorUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Keyboard state for multi-selection
  const keyboardStateRef = useRef({ shift: false, ctrl: false });

  // 🚀 COLLABORATIVE FEATURES: Handle incoming real-time events from other users
  const handleRemoteEvent = useCallback((event: any) => {
    // Skip our own events to avoid double-processing
    if (event.user_id === router.query.userId) return;
    
    console.log('📥 COLLABORATION: Processing remote event:', event.type, event);
    
    switch (event.type) {
      case 'transform':
        // Find the object in local state and update its transform
        console.log('🔄 COLLABORATION: Applying remote transform to object:', event.object_id);
        updateObjectTransform(event.object_id, event.data.newTransform);
        break;
        
      case 'add_object':
        // Add new object to scene
        console.log('➕ COLLABORATION: Adding remote object:', event.data);
        addObjectToScene(event.data.objectData);
        break;
        
      case 'delete_object':
        // Remove object from scene
        console.log('🗑️ COLLABORATION: Removing remote object:', event.object_id);
        removeObjectFromScene(event.object_id);
        break;
        
      default:
        console.log('❓ COLLABORATION: Unknown event type:', event.type);
    }
  }, [router.query.userId]);
  
  // 🚀 COLLABORATIVE FEATURES: Update object transform from remote event
  const updateObjectTransform = useCallback((objectId: string, newTransform: any) => {
    const mesh = shapeMeshesRef.current.get(objectId);
    if (mesh && newTransform) {
      // Apply transform to Babylon.js mesh
      if (newTransform.position) {
        mesh.position.copyFrom(new Vector3(newTransform.position.x, newTransform.position.y, newTransform.position.z));
      }
      if (newTransform.rotation) {
        mesh.rotation.copyFrom(new Vector3(newTransform.rotation.x, newTransform.rotation.y, newTransform.rotation.z));
      }
      if (newTransform.scaling) {
        mesh.scaling.copyFrom(new Vector3(newTransform.scaling.x, newTransform.scaling.y, newTransform.scaling.z));
      }
      console.log('✅ COLLABORATION: Applied remote transform to mesh:', objectId);
    }
  }, []);
  
  // 🚀 COLLABORATIVE FEATURES: Add object from remote event  
  const addObjectToScene = useCallback((objectData: any) => {
    // This will be implemented to handle remote object additions
    console.log('🔄 COLLABORATION: Remote object addition not yet implemented:', objectData);
  }, []);
  
  // 🚀 COLLABORATIVE FEATURES: Remove object from remote event
  const removeObjectFromScene = useCallback((objectId: string) => {
    // This will be implemented to handle remote object deletions
    console.log('🔄 COLLABORATION: Remote object deletion not yet implemented:', objectId);
  }, []);
  
  // 🚀 COLLABORATIVE FEATURES: Create 3D cursor for remote user
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
    
    console.log(`✨ COLLABORATION: Created 3D cursor for ${email} at`, position);
    return cursorSphere;
  }, []);
  
  // 🚀 COLLABORATIVE FEATURES: Update remote cursor position
  const updateRemoteCursor = useCallback((collaboratorId: string, position: {x: number, y: number, z: number}) => {
    const cursor = collaboratorCursorsRef.current.get(collaboratorId);
    if (cursor) {
      cursor.position.copyFrom(new Vector3(position.x, position.y, position.z));
    }
  }, []);
  
  // 🚀 COLLABORATIVE FEATURES: Remove remote cursor
  const removeRemoteCursor = useCallback((collaboratorId: string) => {
    const cursor = collaboratorCursorsRef.current.get(collaboratorId);
    if (cursor) {
      cursor.dispose();
      collaboratorCursorsRef.current.delete(collaboratorId);
      console.log(`🗑️ COLLABORATION: Removed cursor for collaborator ${collaboratorId}`);
    }
  }, []);
  
  // 🚀 COLLABORATIVE FEATURES: Handle cursor position tracking
  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!sceneRef.current || !cameraRef.current || !updateCursorPosition) return;
    
    // Throttle cursor updates to avoid flooding
    if (cursorUpdateTimeoutRef.current) return;
    
    cursorUpdateTimeoutRef.current = setTimeout(() => {
      cursorUpdateTimeoutRef.current = null;
      
      // Get 3D position under mouse cursor
      const target = event.currentTarget;
      const rect = target.getBoundingClientRect();
      if (!rect) return;
      
      const pickResult = sceneRef.current!.pick(
        event.clientX - rect.left,
        event.clientY - rect.top
      );
      
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
  
  // 🚀 COLLABORATIVE FEATURES: Update collaborator cursors based on presence
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
    
    console.log(`🚀 COLLABORATION: Updated cursors for ${activeCursors.size} active collaborators`);
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
    
    console.log('🚀 PRODUCTION: Starting optimized render loop...');
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
    console.log('🎬 PRODUCTION: Creating high-quality dark 3D environment...');
    
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
    camera.upperBetaLimit = Math.PI / 2.2;
    camera.lowerRadiusLimit = 2;
    camera.upperRadiusLimit = 100;
    
    // ENABLE FULL GRID MOVEMENT (including negative Z)
    // Remove any implicit target constraints to allow movement in all directions
    camera.setTarget(Vector3.Zero()); // Center at origin
    
    // Enable panning to allow camera target movement in X/Z plane
    camera.panningAxis = new Vector3(1, 0, 1); // Allow X and Z panning only
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
    
    // ENHANCED TRANSPARENT GRID SYSTEM
    const createTransparentGrid = () => {
      const gridSize = 100;
      const gridDivisions = 100; // INCREASED NUMBER OF GRID SQUARES for finer precision
      const gridSpacing = gridSize / gridDivisions;
      
      console.log(`📦 Creating grid: ${gridSize}x${gridSize} with ${gridDivisions} divisions (${gridSpacing} unit squares)`);
      
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
      
      console.log('✅ Enhanced transparent grid created successfully');
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
      console.log('🎯 UnifiedGizmoSystem initialization handled by React hook');
      // UnifiedGizmoSystem is now managed by the useUnifiedGizmo hook above
      // This provides better React integration and lifecycle management
      
    } catch (error) {
      console.error('❌ Failed to initialize gizmo system:', error);
      // GizmoManager errors are handled below
    }
    
    // 🎯 OLD WORKING APPROACH: Initialize GizmoManager directly (simple & functional)
    try {
      console.log('⚙️ 🔍 ENHANCED DEBUG: Starting GizmoManager initialization...');
      console.log('🔍 Scene ready:', !!scene, 'Camera ready:', !!camera);
      console.log('🔍 Current gizmoMode:', gizmoMode);
      console.log('🔍 Existing gizmoManagerRef:', !!gizmoManagerRef.current);
      
      // 1. Create utility layer renderer
      const utilLayer = new UtilityLayerRenderer(scene);
      console.log('🔍 UtilityLayerRenderer created:', !!utilLayer);
      
      const gizmoManager = new GizmoManager(scene, /*thickness=*/1, utilLayer);
      console.log('🔍 GizmoManager created:', !!gizmoManager);
      
      // 2. CRITICAL: Set render camera and configure depth settings
      utilLayer.setRenderCamera(camera);
      utilLayer.utilityLayerScene.autoClearDepthAndStencil = false;
      console.log('🔍 Camera set on utility layer:', camera.name);
      
      // 3. Configure GizmoManager settings
      gizmoManager.clearGizmoOnEmptyPointerEvent = true; // Detach when clicking empty space
      gizmoManager.usePointerToAttachGizmos = false; // Manual attach mode
      gizmoManager.scaleRatio = 2; // Larger gizmo size
      
      // 🔍 X-RAY GIZMO FIX: Make gizmos visible THROUGH all objects (even when extremely large)
      // This prevents large objects from obscuring gizmo handles completely
      utilLayer.utilityLayerScene.autoClearDepthAndStencil = false;
      utilLayer.shouldRender = true;
      
      // 🚀 CRITICAL X-RAY CONFIGURATION: Apply after gizmos are created
      const applyXRayToGizmos = () => {
        const configureXRayMaterials = (gizmo: any) => {
          if (!gizmo) return;
          
          // Get all meshes from the gizmo's utility layer
          const gizmoMeshes = utilLayer.utilityLayerScene.meshes || [];
          
          gizmoMeshes.forEach((mesh: any) => {
            if (mesh.material) {
              // 🔍 X-RAY EFFECT: Make gizmo visible through all objects
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
        
        console.log('✅ X-ray gizmo configuration applied - gizmos now visible through all objects!');
      };
      
      // Apply X-ray effect with delay to ensure gizmos are created
      setTimeout(applyXRayToGizmos, 200);
      
      console.log('🔍 GizmoManager configuration applied with always-visible settings');
      
      // 4. Enable desired gizmos based on current mode
      const enabled = gizmoMode !== 'none';
      gizmoManager.positionGizmoEnabled = gizmoMode === 'position' && enabled;
      gizmoManager.rotationGizmoEnabled = gizmoMode === 'rotation' && enabled;
      gizmoManager.scaleGizmoEnabled = gizmoMode === 'scale' && enabled;
      gizmoManager.boundingBoxGizmoEnabled = false;
      console.log('🔍 Gizmo modes enabled:', {
        position: gizmoManager.positionGizmoEnabled,
        rotation: gizmoManager.rotationGizmoEnabled,
        scale: gizmoManager.scaleGizmoEnabled
      });
      
      // 5. Store references for cleanup and usage
      gizmoLayerRef.current = utilLayer;
      gizmoManagerRef.current = gizmoManager;
      
      console.log('✅ 🔍 Direct GizmoManager system initialized successfully!');
      console.log('🔍 Final refs set:', {
        gizmoManager: !!gizmoManagerRef.current,
        utilityLayer: !!gizmoLayerRef.current
      });
    } catch (error) {
      console.error('❌ 🔍 Failed to initialize direct GizmoManager:', error);
      console.error('🔍 Error stack:', error);
    }
    
    // 🎯 OLD WORKING PATTERN: NO Babylon.js pointer observers (they interfere with gizmos)
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
    
    console.log('✨ HIGH-QUALITY DARK 3D ENVIRONMENT CREATED SUCCESSFULLY');
    return scene;
  }, []);

  // 🎯 INCREMENTAL MESH REGISTRY (preserves object transforms)
  const syncShapeMeshes = useCallback(() => {
    if (!sceneRef.current) return;
    
    console.log('🔄 PRODUCTION: Syncing shape meshes (incremental approach)...');
    
    // 1. ADD any brand-new shapes (never dispose existing meshes)
    shapes.forEach((shape) => {
      if (!shapeMeshesRef.current.has(shape.id)) {
        console.log(`✨ Creating new mesh for shape: ${shape.id} (${shape.type})`);
        
        let mesh: Mesh;
        
        switch (shape.type) {
          case 'box':
            mesh = MeshBuilder.CreateBox(shape.id, { size: 2 }, sceneRef.current!);
            break;
          case 'sphere':
            mesh = MeshBuilder.CreateSphere(shape.id, { diameter: 2 }, sceneRef.current!);
            break;
          case 'cylinder':
            mesh = MeshBuilder.CreateCylinder(shape.id, { height: 2, diameter: 2 }, sceneRef.current!);
            break;
          case 'model':
            // 🚨 CRITICAL FIX: Handle imported models!
            // Find the imported mesh by ID and apply transformations
            const importedMesh = sceneRef.current!.getMeshByName(shape.id);
            if (importedMesh) {
              // Apply stored transformations to imported model
              importedMesh.position = new Vector3(shape.position.x, shape.position.y, shape.position.z);
              importedMesh.rotation = new Vector3(shape.rotation.x, shape.rotation.y, shape.rotation.z);
              
              const scaling = shape.scaling || { x: 1, y: 1, z: 1 };
              importedMesh.scaling = new Vector3(scaling.x, scaling.y, scaling.z);
              
              console.log(`✅ Applied transformations to imported model:`, shape.id, {
                position: shape.position,
                rotation: shape.rotation,
                scaling: scaling
              });
              
              // Store the imported mesh reference
              shapeMeshesRef.current.set(shape.id, importedMesh as Mesh);
            } else {
              console.warn(`⚠️ Imported model mesh not found for shape:`, shape.id);
            }
            return; // Skip primitive mesh creation for imported models
          case 'custom':
            // 🚨 CRITICAL FIX: Do NOT create primitive meshes for 'custom' types!
            // Custom shapes (including imported meshes) already exist from SceneLoader
            console.log(`⏭️ SKIPPING primitive mesh creation for custom/imported shape:`, shape.id);
            return; // Skip this iteration - don't create overlapping white cube
          default:
            // 🚨 CRITICAL FIX: Do NOT create white boxes for unrecognized types!
            console.warn(`⚠️ Unknown shape type '${(shape as any).type}' - skipping mesh creation:`, (shape as any).id);
            return; // Skip this iteration - don't create default white cube
        }
        
        // Set mesh name for identification
        mesh.name = shape.id;
        
        // Apply INITIAL position, rotation, and scaling from store data
        mesh.position = new Vector3(shape.position.x, shape.position.y, shape.position.z);
        mesh.rotation = new Vector3(shape.rotation.x, shape.rotation.y, shape.rotation.z);
        
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
        
        // 🚀 REMOVED: onAfterWorldMatrixUpdateObservable to prevent conflicts with gizmo handlers
        // Transform sync is now handled directly by gizmo drag events for maximum smoothness
        
        // Store mesh reference (never clear this unless shape is deleted)
        shapeMeshesRef.current.set(shape.id, mesh);
        
        console.log(`✅ Created mesh for new shape: ${shape.id}`);
      } else {
        // 🎯 EXISTING MESH: Update transforms to match store data
        const existingMesh = shapeMeshesRef.current.get(shape.id)!;
        
        // Apply stored transformations to existing mesh
        existingMesh.position = new Vector3(shape.position.x, shape.position.y, shape.position.z);
        existingMesh.rotation = new Vector3(shape.rotation.x, shape.rotation.y, shape.rotation.z);
        
        const scaling = shape.scaling || { x: 1, y: 1, z: 1 };
        existingMesh.scaling = new Vector3(scaling.x, scaling.y, scaling.z);
        
        console.log(`🔄 Updated existing mesh transforms for: ${shape.id}`, {
          position: shape.position,
          rotation: shape.rotation,
          scaling: scaling
        });
      }
    });
    
    // 2. REMOVE meshes that no longer exist in the shapes array
    const existingIds = Array.from(shapeMeshesRef.current.keys());
    existingIds.forEach((existingId) => {
      if (!shapes.find(s => s.id === existingId)) {
        console.log(`🗑️ Removing deleted shape mesh: ${existingId}`);
        const mesh = shapeMeshesRef.current.get(existingId);
        if (mesh) {
          mesh.dispose();
          shapeMeshesRef.current.delete(existingId);
        }
      }
    });
    
    console.log(`🎯 INCREMENTAL SYNC COMPLETE: ${shapeMeshesRef.current.size} total meshes`);
  }, [shapes]);

  // GIZMO-SAFE pointer events for selection (avoid interfering with gizmo interaction)
  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!sceneRef.current || !cameraRef.current) return;
    
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    const pickInfo = sceneRef.current.pick(x, y);
    
    // 🚨 CRITICAL FIX: Do NOT interfere with gizmo interactions
    if (pickInfo.hit && pickInfo.pickedMesh) {
      const mesh = pickInfo.pickedMesh as AbstractMesh;
      
      // Check if this is a gizmo mesh - if so, let the gizmo handle it
      if (mesh.name.includes('gizmo') || mesh.name.includes('Gizmo') || 
          mesh.parent?.name.includes('gizmo') || mesh.parent?.name.includes('Gizmo')) {
        console.log('🎯 GIZMO INTERACTION: Letting gizmo handle the click');
        return; // Do NOT interfere with gizmo interaction
      }
      
      // Handle regular mesh selection (non-gizmo meshes only)
      if (keyboardStateRef.current.shift) {
        const currentSelection = [...selectedMeshes];
        const meshIndex = currentSelection.indexOf(mesh);
        
        if (meshIndex >= 0) {
          // Remove from selection
          currentSelection.splice(meshIndex, 1);
        } else {
          // Add to selection
          currentSelection.push(mesh);
        }
        
        setSelectedMeshes(currentSelection);
      } else {
        // Single selection
        setSelectedMeshes([mesh]);
      }
    } else {
      // 🚨 CRITICAL FIX: Only clear selection if NOT interacting with gizmos
      // Check if we're clicking on utility layer (where gizmos live)
      if (gizmoLayerRef.current) {
        const utilLayerPickInfo = gizmoLayerRef.current.utilityLayerScene.pick(x, y);
        if (utilLayerPickInfo?.hit) {
          console.log('🎯 UTILITY LAYER INTERACTION: Preserving selection for gizmo use');
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

  // 🎯 OLD WORKING APPROACH: Simple gizmo mode handler
  useEffect(() => {
    if (!gizmoManagerRef.current) {
      console.warn('⚠️ GizmoManager not available for mode change');
      return;
    }
    
    console.log(`🎯 Setting gizmo mode to: ${gizmoMode}`);
    
    // OLD WORKING PATTERN: Enable/disable gizmos based on mode
    const enabled = gizmoMode !== 'none';
    gizmoManagerRef.current.positionGizmoEnabled = gizmoMode === 'position' && enabled;
    gizmoManagerRef.current.rotationGizmoEnabled = gizmoMode === 'rotation' && enabled;
    gizmoManagerRef.current.scaleGizmoEnabled = gizmoMode === 'scale' && enabled;
    gizmoManagerRef.current.boundingBoxGizmoEnabled = false; // Keep disabled
    
    // 🔍 APPLY X-RAY EFFECT: Ensure newly created gizmos get X-ray configuration
    if (enabled && gizmoLayerRef.current) {
      setTimeout(() => {
        const applyXRayToCurrentGizmo = () => {
          const utilLayer = gizmoLayerRef.current!;
          
          // Get all meshes from the utility layer
          const gizmoMeshes = utilLayer.utilityLayerScene.meshes || [];
          
          gizmoMeshes.forEach((mesh: any) => {
            if (mesh.material) {
              // 🔍 X-RAY EFFECT: Make gizmo visible through all objects
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
          
          console.log(`🔍 X-ray effect applied to ${gizmoMode} gizmo`);
        };
        
        applyXRayToCurrentGizmo();
      }, 150); // Small delay to ensure gizmo is created
    }
    
    console.log(`✅ Gizmo mode set to: ${gizmoMode}`);
  }, [gizmoMode]);

  // 🎯 OLD WORKING APPROACH: Simple gizmo selection handler
  useEffect(() => {
    if (!gizmoManagerRef.current) {
      console.warn('⚠️ GizmoManager not available for selection update');
      return;
    }
    
    console.log(`🎯 Selection changed: ${selectedMeshes.length} meshes selected`);
    
    if (selectedMeshes.length > 0) {
      const lastSelected = selectedMeshes[selectedMeshes.length - 1];
      const objectId = lastSelected.metadata?.shapeId || lastSelected.name;
      console.log(`🎯 Attaching gizmo to: ${lastSelected.name} (${objectId})`);
      
      // 🚀 COLLABORATIVE FEATURES: Check if object is locked by another user
      const lockedBy = isObjectLocked && isObjectLocked(objectId);
      if (lockedBy) {
        console.log(`🔒 COLLABORATION: Object ${objectId} is locked by ${lockedBy.email}`);
        // TODO: Show visual indicator that object is locked
        gizmoManagerRef.current.attachToMesh(null);
        return;
      }
      
      // 🚀 COLLABORATIVE FEATURES: Lock object for editing
      if (startEditingObject && fileId) {
        startEditingObject(objectId).then((canEdit) => {
          if (!canEdit) {
            console.log(`🚫 COLLABORATION: Failed to lock object ${objectId}`);
            if (gizmoManagerRef.current) {
              gizmoManagerRef.current.attachToMesh(null);
            }
            return;
          }
          console.log(`🔐 COLLABORATION: Successfully locked object ${objectId} for editing`);
        });
      }
      
      // OLD WORKING PATTERN: Attach gizmo to selected mesh
      gizmoManagerRef.current.attachToMesh(lastSelected);
      
      // 🚀 COLLABORATIVE FEATURES: Wire up transform broadcasting
      const currentGizmo = gizmoManagerRef.current;
      if (currentGizmo && broadcastEvent) {
        // Setup transform event listeners for real-time collaboration
        const setupTransformBroadcasting = () => {
          // Position gizmo events
          if (currentGizmo.gizmos.positionGizmo) {
            const posGizmo = currentGizmo.gizmos.positionGizmo;
            posGizmo.onDragEndObservable.add(() => {
              const newTransform = {
                position: { x: lastSelected.position.x, y: lastSelected.position.y, z: lastSelected.position.z },
                rotation: { x: lastSelected.rotation.x, y: lastSelected.rotation.y, z: lastSelected.rotation.z },
                scaling: { x: lastSelected.scaling.x, y: lastSelected.scaling.y, z: lastSelected.scaling.z }
              };
              
              // 🚨 CRITICAL FIX: Update local store with new transforms
              console.log('🔄 GIZMO FIX: Updating store with position change:', objectId, newTransform);
              updateShape(objectId, newTransform);
              
              console.log('📡 COLLABORATION: Broadcasting position change:', objectId, newTransform);
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
            rotGizmo.onDragEndObservable.add(() => {
              const newTransform = {
                position: { x: lastSelected.position.x, y: lastSelected.position.y, z: lastSelected.position.z },
                rotation: { x: lastSelected.rotation.x, y: lastSelected.rotation.y, z: lastSelected.rotation.z },
                scaling: { x: lastSelected.scaling.x, y: lastSelected.scaling.y, z: lastSelected.scaling.z }
              };
              
              // 🚨 CRITICAL FIX: Update local store with new transforms
              console.log('🔄 GIZMO FIX: Updating store with rotation change:', objectId, newTransform);
              updateShape(objectId, newTransform);
              
              console.log('📡 COLLABORATION: Broadcasting rotation change:', objectId, newTransform);
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
            scaleGizmo.onDragEndObservable.add(() => {
              const newTransform = {
                position: { x: lastSelected.position.x, y: lastSelected.position.y, z: lastSelected.position.z },
                rotation: { x: lastSelected.rotation.x, y: lastSelected.rotation.y, z: lastSelected.rotation.z },
                scaling: { x: lastSelected.scaling.x, y: lastSelected.scaling.y, z: lastSelected.scaling.z }
              };
              
              // 🚨 CRITICAL FIX: Update local store with new transforms
              console.log('🔄 GIZMO FIX: Updating store with scale change:', objectId, newTransform);
              updateShape(objectId, newTransform);
              
              console.log('📡 COLLABORATION: Broadcasting scale change:', objectId, newTransform);
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
      
      console.log(`✅ Gizmo attached and configured for ${gizmoMode} mode with collaborative features`);
    } else {
      // 🚀 COLLABORATIVE FEATURES: Release object lock when deselecting
      if (stopEditingObject) {
        stopEditingObject();
        console.log('🔓 COLLABORATION: Released object lock (deselected)');
      }
      
      // No selection - detach gizmos
      console.log(`🚫 Detaching gizmo (no selection)`);
      gizmoManagerRef.current.attachToMesh(null);
    }
  }, [selectedMeshes, gizmoMode]);

  // 🎯 OLD WORKING APPROACH: Initialize GizmoManager directly in scene initialization
  const handleGizmoModeChange = useCallback((mode: GizmoMode) => {
    console.log(`🎯 GIZMO: Switching to ${mode} mode`);
    setGizmoMode(mode);
  }, []);

  // PRODUCTION initialization
  const initializeBabylonScene = useCallback(async () => {
    if (!canvasRef.current) {
      console.error('❌ PRODUCTION: Canvas not available');
      return;
    }
    
    try {
      console.log('🎬 PRODUCTION: Starting initialization...');
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
      
      console.log('✅ PRODUCTION: Initialization complete');
      
      // Return cleanup function
      return () => {
        console.log('🧹 PRODUCTION: Cleaning up...');
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
      console.error('❌ PRODUCTION: Initialization failed:', err);
      setError(String(err));
      return undefined;
    }
  }, []); // 🎯 CRITICAL FIX: Empty dependencies to prevent infinite re-initialization loop

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

  // Update shapes when store changes (incremental sync)
  useEffect(() => {
    if (isInitialized) {
      syncShapeMeshes();
    }
  }, [shapes, isInitialized, syncShapeMeshes]);

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
        onPointerDown={handlePointerDown} // 🎯 OLD WORKING PATTERN: React handles selection, Babylon handles gizmos
        onMouseMove={handleMouseMove} // 🚀 COLLABORATIVE FEATURES: Track cursor for real-time sharing
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
              {mode === 'position' && '↔️'} {mode === 'rotation' && '🔄'} {mode === 'scale' && '📏'} {mode === 'position' ? 'Move' : mode === 'rotation' ? 'Rotate' : 'Scale'}
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
          <span style={{ opacity: 0.7, marginRight: '6px' }}>⚡</span>
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
          🚨 Production Error: {error}
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
          🚀 Initializing Production Viewport...
        </div>
      )}
    </div>
  );
};

export default ViewportProduction;
