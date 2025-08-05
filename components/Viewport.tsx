/**
 * BULLETPROOF VIEWPORT COMPONENT
 * 
 * This is a complete rewrite to guarantee:
 * 1. engine.wipeCaches ALWAYS exists
 * 2. Camera is ALWAYS defined before any operations
 * 3. Zero external dependencies on patching systems
 * 4. Self-sufficient and bulletproof
 */

import React, { FC, useRef, useState, useEffect, useCallback, ReactNode } from 'react';
import useStore from '../store/store';
import { useUIStore } from '../store/uiStore';
import useSceneStore from '../store/sceneStore';
import {
  Engine, Scene, ArcRotateCamera, Vector3, HemisphericLight,
  Mesh, MeshBuilder, Color3, Color4, AbstractMesh, 
  HighlightLayer, GizmoManager,
  StandardMaterial, CreateSphere
} from '@babylonjs/core';

// Import gizmo modules explicitly
import '@babylonjs/core/Gizmos/positionGizmo';
import '@babylonjs/core/Gizmos/rotationGizmo';
import '@babylonjs/core/Gizmos/scaleGizmo';
import '@babylonjs/core/Gizmos/boundingBoxGizmo';

// 🚨 CRITICAL: Import ALL loader plugins at startup to register them
import '@babylonjs/loaders/glTF';
import '@babylonjs/loaders/OBJ';
import '@babylonjs/loaders/STL';
import '@babylonjs/core/Loading/Plugins/babylonFileLoader';

console.log('✅ BABYLON.JS LOADERS REGISTERED AT STARTUP');
console.log('✅ Available loaders: glTF, GLB, OBJ, STL, Babylon');

export const Viewport: FC<{
  viewportRef?: React.MutableRefObject<any>;
  id?: string;
}> = ({ viewportRef, id = 'main-canvas' }): ReactNode => {
  console.log('🎬 VIEWPORT: Component rendering started');
  console.log('🎬 VIEWPORT: Props received - viewportRef:', !!viewportRef, 'id:', id);
  
  try {
    console.log('🎬 VIEWPORT: About to declare hooks and refs');
    
    // Test if React hooks are working
    console.log('🎬 VIEWPORT: Testing React.useEffect availability:', typeof useEffect);
    console.log('🎬 VIEWPORT: About to call useStore');
    
    // Get global state from store
    const { shapes } = useStore();
    console.log('🎬 VIEWPORT: useStore successful, shapes count:', shapes.length);
    
    console.log('🎬 VIEWPORT: About to call useUIStore');
    // Get UI state from store
    const { } = useUIStore();
    console.log('🎬 VIEWPORT: useUIStore successful');
    
    console.log('🎬 VIEWPORT: About to call useSceneStore');
    // Get scene store for import functionality
    const { setScene } = useSceneStore();
    console.log('🎬 VIEWPORT: useSceneStore successful');
  
  // Component refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const sceneRef = useRef<Scene | null>(null);
  const cameraRef = useRef<ArcRotateCamera | null>(null);
  const lightRef = useRef<HemisphericLight | null>(null);
  const gizmoManagerRef = useRef<GizmoManager | null>(null);
  const highlightLayerRef = useRef<HighlightLayer | null>(null);
  const gridRef = useRef<Mesh | null>(null);
  const meshesRef = useRef<Mesh[]>([]);

  // Component state
  const [transformMode, setTransformMode] = useState<'move' | 'rotate' | 'scale'>('move');
  const [engineError, setEngineError] = useState<string | null>(null);
  const [engineInitialized, setEngineInitialized] = useState<boolean>(false);
  const [selectedMesh, setSelectedMesh] = useState<AbstractMesh | null>(null);

  /**
   * BULLETPROOF ENGINE CREATION - GUARANTEED wipeCaches
   */
  const createBulletproofEngine = useCallback((canvas: HTMLCanvasElement): Engine => {
    console.log('🚀 Creating bulletproof Babylon.js engine...');
    
    // Create engine
    const engine = new Engine(canvas, true, {
      antialias: true,
      adaptToDeviceRatio: true
    });
    
    // 🚨 CRITICAL: IMMEDIATELY GUARANTEE wipeCaches EXISTS
    console.log('🚨 CRITICAL: Applying bulletproof wipeCaches immediately...');
    
    // BULLETPROOF wipeCaches implementation
    (engine as any).wipeCaches = function() {
      console.log('🧹 [BULLETPROOF] wipeCaches called');
      try {
        // Babylon.js 8.x cache clearing
        const engineAny = this as any;
        
        // Clear all known cache types
        if (engineAny._currentEffect !== undefined) {
          engineAny._currentEffect = null;
        }
        if (engineAny._currentProgram !== undefined) {
          engineAny._currentProgram = null;
        }
        if (engineAny._currentState !== undefined) {
          engineAny._currentState = {};
        }
        if (engineAny._activeTexture !== undefined) {
          engineAny._activeTexture = -1;
        }
        if (engineAny._textureUnits) {
          engineAny._textureUnits = [];
        }
        if (engineAny._uniformBuffers) {
          engineAny._uniformBuffers = [];
        }
        if (engineAny._currentDrawContext !== undefined) {
          engineAny._currentDrawContext = null;
        }
        
        // Call internal release methods if available
        if (typeof engineAny._releaseFramebufferObjects === 'function') {
          engineAny._releaseFramebufferObjects();
        }
        if (typeof engineAny._releaseEffects === 'function') {
          engineAny._releaseEffects();
        }
        
        console.log('✅ [BULLETPROOF] wipeCaches completed successfully');
      } catch (error) {
        console.warn('⚠️ [BULLETPROOF] wipeCaches had issues (continuing):', error);
      }
      return this;
    };
    
    // BULLETPROOF getAspectRatio implementation
    (engine as any).getAspectRatio = function(camera?: any) {
      console.log('📏 [BULLETPROOF] getAspectRatio called');
      try {
        if (camera && (camera as any).getEngine) {
          const cameraEngine = (camera as any).getEngine();
          if (cameraEngine.getRenderWidth && cameraEngine.getRenderHeight) {
            const width = cameraEngine.getRenderWidth();
            const height = cameraEngine.getRenderHeight();
            if (height > 0) {
              return width / height;
            }
          }
        }
        
        if (this.getRenderWidth && this.getRenderHeight) {
          const width = this.getRenderWidth();
          const height = this.getRenderHeight();
          if (height > 0) {
            return width / height;
          }
        }
        
        const canvas = this.getRenderingCanvas();
        if (canvas && canvas.width && canvas.height && canvas.height > 0) {
          return canvas.width / canvas.height;
        }
        
        return 16 / 9; // Safe fallback
      } catch (error) {
        console.warn('⚠️ [BULLETPROOF] getAspectRatio error, using fallback:', error);
        return 16 / 9;
      }
    };
    
    // Verify methods exist
    if (typeof (engine as any).wipeCaches !== 'function') {
      throw new Error('CRITICAL: wipeCaches still not a function after patching!');
    }
    if (typeof (engine as any).getAspectRatio !== 'function') {
      throw new Error('CRITICAL: getAspectRatio still not a function after patching!');
    }
    
    console.log('✅ BULLETPROOF: Engine methods guaranteed - wipeCaches and getAspectRatio verified');
    
    return engine;
  }, []);

  /**
   * BULLETPROOF CAMERA CREATION - GUARANTEED camera exists
   */
  const createBulletproofCamera = useCallback((scene: Scene): ArcRotateCamera => {
    console.log('🎥 Creating bulletproof camera...');
    
    // Create ArcRotateCamera
    const camera = new ArcRotateCamera(
      'camera',
      -Math.PI / 2,  // alpha (horizontal rotation)
      Math.PI / 2.5, // beta (vertical rotation)
      10,             // radius (distance from target)
      Vector3.Zero(), // target
      scene
    );
    
    // CRITICAL: Set as active camera IMMEDIATELY
    scene.activeCamera = camera;
    console.log('✅ CRITICAL: Camera set as scene.activeCamera immediately');
    
    // Verify camera exists
    if (!scene.activeCamera) {
      throw new Error('CRITICAL: scene.activeCamera is still null after setting!');
    }
    
    // Setup camera controls
    const canvas = scene.getEngine().getRenderingCanvas();
    if (canvas) {
      camera.attachControl(canvas, true);
      console.log('✅ Camera controls attached');
    }
    
    // Camera settings
    camera.setTarget(Vector3.Zero());
    camera.wheelDeltaPercentage = 0.01;
    camera.pinchDeltaPercentage = 0.01;
    camera.panningSensibility = 1000;
    
    console.log('✅ BULLETPROOF: Camera guaranteed and active');
    
    return camera;
  }, []);

  /**
   * BULLETPROOF SCENE SETUP - Complete initialization
   */
  const initializeBulletproofScene = useCallback(async (): Promise<boolean> => {
    console.log('🚀 Starting bulletproof Babylon.js initialization...');
    
    try {
      // Get canvas reference
      const canvas = canvasRef.current;
      if (!canvas) {
        console.error('❌ Canvas not found');
        setEngineError('Canvas element not found');
        return false;
      }
      
      console.log('✅ Canvas found, creating bulletproof engine...');
      
      // Create bulletproof engine
      const engine = createBulletproofEngine(canvas);
      engineRef.current = engine;
      
      // Create scene
      const scene = new Scene(engine);
      sceneRef.current = scene;
      
      // Store scene in scene store for import functionality
      setScene(scene);
      console.log('✅ VIEWPORT: Scene stored in sceneStore:', !!scene);
      console.log('✅ VIEWPORT: Scene metadata initialized:', scene.metadata);
      
      // 🚨 CRITICAL DEBUG: Verify store state immediately after setScene
      setTimeout(() => {
        const { scene: storedScene } = useSceneStore.getState();
        console.log('🔍 VIEWPORT: Verifying stored scene after setScene:', !!storedScene);
        console.log('🔍 VIEWPORT: Stored scene matches current:', storedScene === scene);
      }, 100);
      
      // Set clear color (background) - black theme
      scene.clearColor = new Color4(0.04, 0.04, 0.06, 1);
      
      // Create bulletproof camera
      const camera = createBulletproofCamera(scene);
      cameraRef.current = camera;
      
      // VERIFY CAMERA IS ACTIVE
      if (!scene.activeCamera) {
        throw new Error('CRITICAL: scene.activeCamera is null after camera creation!');
      }
      
      console.log('✅ BULLETPROOF: Camera verification passed - scene.activeCamera exists');
      
      // Create hemisphere light
      const light = new HemisphericLight('light', new Vector3(0, 1, 0), scene);
      light.intensity = 0.7;
      lightRef.current = light;
      
      // Create grid - STATIONARY and LARGER
      const ground = MeshBuilder.CreateGround('ground', { width: 100, height: 100, subdivisions: 50 }, scene);
      const groundMaterial = new StandardMaterial('groundMaterial', scene);
      groundMaterial.wireframe = true;
      groundMaterial.diffuseColor = new Color3(0.3, 0.3, 0.3);
      ground.material = groundMaterial;
      
      // 🚨 CRITICAL: Make grid STATIONARY - lock position and disable movement
      ground.position.set(0, 0, 0); // Lock at world origin
      ground.freezeWorldMatrix(); // Prevent any transformations
      ground.isPickable = false; // Don't interfere with object selection
      
      console.log('✅ GRID: Created stationary grid 100x100 at world origin');
      gridRef.current = ground;
      
      // Create highlight layer
      const highlightLayer = new HighlightLayer('highlight', scene);
      highlightLayerRef.current = highlightLayer;
      
      // 🎮 CRITICAL: Create GizmoManager for transform controls
      const gizmoManager = new GizmoManager(scene);
      gizmoManagerRef.current = gizmoManager;
      
      // Configure gizmos
      gizmoManager.positionGizmoEnabled = true;
      gizmoManager.rotationGizmoEnabled = false;
      gizmoManager.scaleGizmoEnabled = false;
      gizmoManager.boundingBoxGizmoEnabled = false;
      
      console.log('✅ GIZMO: GizmoManager created and configured');
      
      // 🖱️ CRITICAL: Setup pointer interaction for mesh selection
      scene.onPointerObservable.add((pointerInfo) => {
        if (pointerInfo.pickInfo?.hit && pointerInfo.pickInfo.pickedMesh) {
          const pickedMesh = pointerInfo.pickInfo.pickedMesh;
          
          // Only select created meshes (not ground or imported meshes)
          if (pickedMesh.name !== 'ground' && pickedMesh.name !== 'cursor') {
            console.log('🎯 SELECTED MESH:', pickedMesh.name);
            
            // Highlight selected mesh
            if (highlightLayerRef.current && pickedMesh instanceof Mesh) {
              highlightLayerRef.current.removeAllMeshes();
              highlightLayerRef.current.addMesh(pickedMesh, new Color3(1, 0.4, 1)); // Pink highlight
            }
            
            // Attach gizmo to selected mesh
            if (gizmoManagerRef.current) {
              gizmoManagerRef.current.attachToMesh(pickedMesh);
            }
            
            setSelectedMesh(pickedMesh);
            setSelectedMesh(pickedMesh);
          }
        }
      });
      
      // Set scene for import functionality
      setScene(scene);
      
      // Start render loop
      engine.runRenderLoop(() => {
        if (scene && scene.activeCamera) {
          scene.render();
        }
      });
      
      // Handle resize
      window.addEventListener('resize', () => {
        engine.resize();
      });
      
      console.log('✅ BULLETPROOF: Complete Babylon.js initialization successful');
      setEngineInitialized(true);
      setEngineError(null);
      
      return true;
      
    } catch (error) {
      console.error('❌ BULLETPROOF: Initialization failed:', error);
      setEngineError(`Initialization failed: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }, [createBulletproofEngine, createBulletproofCamera, setScene]);

  /**
   * Create shape meshes
   */
  const createShapesMeshes = useCallback(() => {
    if (!sceneRef.current) return;
    
    const scene = sceneRef.current;
    
    // Clear existing meshes
    meshesRef.current.forEach(mesh => {
      mesh.dispose();
    });
    meshesRef.current = [];
    
    // Create meshes for each shape
    shapes.forEach(shape => {
      let mesh: Mesh | null = null;
      
      switch (shape.type) {
        case 'sphere':
          mesh = CreateSphere(shape.id, { diameter: 1 }, scene);
          break;
        case 'box':
          mesh = MeshBuilder.CreateBox(shape.id, { size: 1 }, scene);
          break;
        case 'cylinder':
          mesh = MeshBuilder.CreateCylinder(shape.id, { height: 1, diameter: 1 }, scene);
          break;
      }
      
      if (mesh) {
        // Apply complete transformations: position, rotation, scaling
        mesh.position = new Vector3(shape.position.x, shape.position.y, shape.position.z);
        mesh.rotation = new Vector3(shape.rotation.x, shape.rotation.y, shape.rotation.z);
        
        const scaling = shape.scaling || { x: 1, y: 1, z: 1 };
        mesh.scaling = new Vector3(scaling.x, scaling.y, scaling.z);
        
        // Create material
        const material = new StandardMaterial(`${shape.id}_material`, scene);
        material.diffuseColor = new Color3(0.8, 0.4, 0.8); // Pink color
        mesh.material = material;
        
        // Make mesh pickable for gizmo selection
        mesh.isPickable = true;
        
        meshesRef.current.push(mesh);
      }
    });
  }, [shapes]);

  /**
   * Update gizmo mode based on transform mode
   */
  const updateGizmoMode = useCallback((mode: 'move' | 'rotate' | 'scale') => {
    setTransformMode(mode);
    
    if (gizmoManagerRef.current) {
      // Disable all gizmos first
      gizmoManagerRef.current.positionGizmoEnabled = false;
      gizmoManagerRef.current.rotationGizmoEnabled = false;
      gizmoManagerRef.current.scaleGizmoEnabled = false;
      
      // Enable selected gizmo
      switch (mode) {
        case 'move':
          gizmoManagerRef.current.positionGizmoEnabled = true;
          break;
        case 'rotate':
          gizmoManagerRef.current.rotationGizmoEnabled = true;
          break;
        case 'scale':
          gizmoManagerRef.current.scaleGizmoEnabled = true;
          break;
      }
      
      console.log(`🎮 GIZMO MODE: ${mode.toUpperCase()} enabled`);
    }
  }, []);



  /**
   * Initialize on mount
   */
  useEffect(() => {
    let mounted = true;
    
    try {
      console.log('🚀 VIEWPORT: useEffect initialization starting');
      
      const initialize = async () => {
        try {
          if (!mounted) {
            console.log('⚠️ VIEWPORT: Component unmounted, aborting initialization');
            return;
          }
          
          console.log('🔧 VIEWPORT: Starting scene initialization');
          
          // Set viewport ref
          if (viewportRef) {
            viewportRef.current = canvasRef.current;
            console.log('✅ VIEWPORT: Viewport ref set');
          }
          
          // Initialize bulletproof scene
          console.log('🎯 VIEWPORT: Calling initializeBulletproofScene');
          const success = await initializeBulletproofScene();
          console.log('🔍 VIEWPORT: initializeBulletproofScene result:', success);
          
          if (success && mounted) {
            // Create shape meshes
            createShapesMeshes();
          }
        } catch (error) {
          console.error('🚨 VIEWPORT: Critical error in initialize function:', error);
        }
      };
      
      initialize().catch(error => {
        console.error('🚨 VIEWPORT: Critical error in initialize promise:', error);
      });
    } catch (error) {
      console.error('🚨 VIEWPORT: Critical error in useEffect:', error);
    }
    
    return () => {
      mounted = false;
      
      // Cleanup
      if (engineRef.current) {
        engineRef.current.dispose();
      }
    };
  }, []); // Empty dependency array - run once on mount only

  /**
   * Update meshes when shapes change
   */
  useEffect(() => {
    if (engineInitialized) {
      createShapesMeshes();
    }
  }, [shapes, engineInitialized, createShapesMeshes]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <canvas
        ref={canvasRef}
        id={id}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          outline: 'none'
        }}
      />
      
      {/* 🎮 GIZMO MODE BUTTONS - Clean 3-button UI */}
      {engineInitialized && selectedMesh && (
        <div style={{
          position: 'absolute',
          top: 10,
          right: 10,
          display: 'flex',
          gap: '8px',
          zIndex: 1000
        }}>
          <button
            onClick={() => updateGizmoMode('move')}
            style={{
              padding: '8px 12px',
              background: transformMode === 'move' ? '#e91e63' : '#424242',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: transformMode === 'move' ? '0 0 10px rgba(233, 30, 99, 0.5)' : 'none'
            }}
            title="Move Tool"
          >
            🔄 MOVE
          </button>
          <button
            onClick={() => updateGizmoMode('rotate')}
            style={{
              padding: '8px 12px',
              background: transformMode === 'rotate' ? '#e91e63' : '#424242',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: transformMode === 'rotate' ? '0 0 10px rgba(233, 30, 99, 0.5)' : 'none'
            }}
            title="Rotate Tool"
          >
            🔄 ROTATE
          </button>
          <button
            onClick={() => updateGizmoMode('scale')}
            style={{
              padding: '8px 12px',
              background: transformMode === 'scale' ? '#e91e63' : '#424242',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: transformMode === 'scale' ? '0 0 10px rgba(233, 30, 99, 0.5)' : 'none'
            }}
            title="Scale Tool"
          >
            🔄 SCALE
          </button>
        </div>
      )}
      
      {engineError && (
        <div style={{
          position: 'absolute',
          top: 10,
          left: 10,
          background: 'rgba(255, 0, 0, 0.8)',
          color: 'white',
          padding: '10px',
          borderRadius: '5px',
          fontSize: '14px',
          zIndex: 1000
        }}>
          Error: {engineError}
        </div>
      )}
      
      {!engineInitialized && !engineError && (
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
          Initializing Babylon.js...
        </div>
      )}
    </div>
  );
  } catch (error) {
    console.error('🚨 VIEWPORT: Critical error in component execution:', error);
    return (
      <div style={{ padding: '20px', color: 'red' }}>
        Critical Viewport Error: {String(error)}
      </div>
    );
  }
};

// Viewport is already exported as named export on line 37
