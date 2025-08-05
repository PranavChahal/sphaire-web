/**
 * useRenderCamera.ts
 * 
 * React hook for managing render camera functionality in Babylon.js
 * Creates a moveable camera cuboid with live preview and high-quality capture
 */

import { useCallback, useState, useRef } from 'react';
import { 
  MeshBuilder, 
  StandardMaterial, 
  Color3, 
  FreeCamera, 
  RenderTargetTexture, 
  Vector3,
  AbstractMesh,
  Scene
} from '@babylonjs/core';
import useSceneStore from '../store/sceneStore';

interface RenderCameraState {
  isActive: boolean;
  cameraMesh: AbstractMesh | null;
  renderCamera: FreeCamera | null;
  renderTexture: RenderTargetTexture | null;
  previewEnabled: boolean;
  fieldOfView: number;
  resolution: {
    width: number;
    height: number;
  };
}

interface RenderCameraActions {
  addCameraToScene: () => Promise<boolean>;
  removeCameraFromScene: () => void;
  setFieldOfView: (fov: number) => void;
  setPreviewEnabled: (enabled: boolean) => void;
  setResolution: (width: number, height: number) => void;
  captureHighQualityRender: () => Promise<string | null>;
  saveImage: (dataUrl: string, filename?: string) => void;
}

interface UseRenderCameraReturn {
  state: RenderCameraState;
  actions: RenderCameraActions;
}

const useRenderCamera = (): UseRenderCameraReturn => {
  const { scene } = useSceneStore();
  
  const [state, setState] = useState<RenderCameraState>({
    isActive: false,
    cameraMesh: null,
    renderCamera: null,
    renderTexture: null,
    previewEnabled: true,
    fieldOfView: 45,
    resolution: { width: 1920, height: 1080 }
  });

  const stateRef = useRef(state);
  stateRef.current = state;

  /**
   * Create the camera cuboid mesh in the scene
   */
  const addCameraToScene = useCallback(async (): Promise<boolean> => {
    if (!scene) {
      console.error('🎬 Scene not available');
      return false;
    }

    if (state.isActive && state.cameraMesh) {
      console.log('🎬 Camera already exists in scene');
      return true;
    }

    try {
      console.log('🎬 Loading GLTF camera model...');

      // Import GLTF loader
      const { SceneLoader } = await import('@babylonjs/core');
      
      let cameraMesh: AbstractMesh;
      
      try {
        // Try to load custom GLTF camera model
        const result = await SceneLoader.ImportMeshAsync('', '/models/camera/', 'camera.gltf', scene);
        
        if (result.meshes && result.meshes.length > 0) {
          // Use the imported GLTF model
          cameraMesh = result.meshes[0];
          cameraMesh.name = 'renderCameraMesh';
          console.log('✅ Loaded custom GLTF camera model');
          
          // Scale the imported model to a reasonable size
          const boundingInfo = cameraMesh.getBoundingInfo();
          const size = boundingInfo.boundingBox.extendSize;
          const maxSize = Math.max(size.x, size.y, size.z);
          const scaleFactor = 1.0 / maxSize; // Scale to 1 unit max dimension
          cameraMesh.scaling = new Vector3(scaleFactor, scaleFactor, scaleFactor);
        } else {
          throw new Error('No meshes found in GLTF file');
        }
      } catch (error) {
        console.warn('⚠️ Failed to load GLTF camera model, using fallback:', error);
        
        // Fallback: Create simple trapezium mesh
        cameraMesh = MeshBuilder.CreateBox('renderCameraMesh', {
          width: 1.2,
          height: 0.7,
          depth: 0.8
        }, scene);
        
        // Apply scaling to create trapezium effect (taper towards front)
        cameraMesh.scaling = new Vector3(1, 1, 0.6);
        
        console.log('📷 Using fallback trapezium camera mesh');
      }
      
      // Position the camera in a good default location
      cameraMesh.position = new Vector3(3, 2, 3);
      cameraMesh.rotation = new Vector3(0, Math.PI / 4, 0);

      // Create distinctive material for the camera body
      const cameraMaterial = new StandardMaterial('renderCameraMaterial', scene);
      cameraMaterial.diffuseColor = new Color3(0.15, 0.15, 0.15); // Darker camera color
      cameraMaterial.emissiveColor = new Color3(0.05, 0.05, 0.05);
      cameraMaterial.specularColor = new Color3(0.4, 0.4, 0.4);
      cameraMaterial.roughness = 0.7; // Matte camera finish
      cameraMesh.material = cameraMaterial;

      // Create the actual Babylon camera and parent it to the mesh
      const renderCamera = new FreeCamera('renderCamera', cameraMesh.position.clone(), scene);
      renderCamera.parent = cameraMesh;
      
      // Position camera at the front face of the cuboid
      renderCamera.position = new Vector3(0, 0, 0.25); // Move forward from center
      renderCamera.setTarget(Vector3.Zero()); // Look at origin initially
      
      // Set initial field of view
      renderCamera.fov = (state.fieldOfView * Math.PI) / 180; // Convert degrees to radians

      // Create render target texture for live preview and capture
      console.log('🎬 Creating render target texture...');
      const renderTexture = new RenderTargetTexture(
        'renderCameraTarget', 
        { width: 1024, height: 576 }, 
        scene, 
        false, 
        true
      );
      
      console.log('🎬 Setting active camera and render targets...');
      renderTexture.activeCamera = renderCamera;
      renderTexture.refreshRate = 1; // Update every frame for live preview
      scene.customRenderTargets.push(renderTexture);
      
      console.log('🎬 Render texture setup complete:', {
        textureSize: renderTexture.getSize(),
        activeCamera: !!renderTexture.activeCamera,
        renderList: renderTexture.renderList?.length || 'all'
      });

      // Create viewfinder screen on the camera
      await createViewfinderScreen(cameraMesh, renderTexture, scene);

      // Enable gizmo for movement (if gizmo manager is available)
      const gizmoManager = (scene as any).gizmoManager;
      if (gizmoManager) {
        gizmoManager.attachToMesh(cameraMesh);
        console.log('🎬 Gizmo attached to camera mesh');
      }

      setState(prev => ({
        ...prev,
        isActive: true,
        cameraMesh,
        renderCamera,
        renderTexture,
      }));

      console.log('✅ Render camera added to scene successfully');
      return true;

    } catch (error) {
      console.error('❌ Error adding camera to scene:', error);
      return false;
    }
  }, [scene, state.isActive, state.cameraMesh, state.fieldOfView]);

  /**
   * Create a viewfinder screen on the camera showing live preview
   */
  const createViewfinderScreen = async (
    cameraMesh: AbstractMesh, 
    renderTexture: RenderTargetTexture, 
    scene: Scene
  ): Promise<void> => {
    try {
      console.log('📺 Creating viewfinder screen...');
      console.log('📺 Render texture info:', {
        isReady: renderTexture.isReady(),
        size: renderTexture.getSize(),
        hasActiveCamera: !!renderTexture.activeCamera,
        renderList: renderTexture.renderList?.length || 'all meshes'
      });
      
      // Create a plane for the viewfinder screen
      const viewfinder = MeshBuilder.CreatePlane('renderCameraViewfinder', {
        width: 0.8,
        height: 0.45
      }, scene);

      // Position it at the back of the camera (like an LCD screen)
      viewfinder.position = new Vector3(0, 0, -0.21);
      viewfinder.rotation = new Vector3(0, Math.PI, 0); // Flip to face backwards
      viewfinder.parent = cameraMesh;

      // Create material with live preview texture
      const viewfinderMaterial = new StandardMaterial('renderCameraViewfinderMaterial', scene);
      
      // Wait for render texture to be ready
      await new Promise<void>((resolve) => {
        if (renderTexture.isReady()) {
          resolve();
        } else {
          renderTexture.onAfterRenderObservable.addOnce(() => {
            console.log('📺 Render texture is now ready');
            resolve();
          });
        }
      });
      
      viewfinderMaterial.diffuseTexture = renderTexture;
      viewfinderMaterial.emissiveTexture = renderTexture; // Make it glow slightly
      viewfinderMaterial.emissiveColor = new Color3(0.3, 0.3, 0.3);
      viewfinderMaterial.disableLighting = true; // Ensure it's always visible
      viewfinder.material = viewfinderMaterial;

      console.log('📺 Viewfinder screen created successfully with material:', {
        hasDiffuseTexture: !!viewfinderMaterial.diffuseTexture,
        hasEmissiveTexture: !!viewfinderMaterial.emissiveTexture,
        textureIsReady: renderTexture.isReady()
      });
    } catch (error) {
      console.error('❌ Error creating viewfinder screen:', error);
    }
  };

  /**
   * Remove the camera from the scene
   */
  const removeCameraFromScene = useCallback(() => {
    if (!state.isActive) return;

    try {
      // Dispose of render texture
      if (state.renderTexture) {
        const scene = state.renderTexture.getScene();
        if (scene && scene.customRenderTargets) {
          const index = scene.customRenderTargets.indexOf(state.renderTexture);
          if (index > -1) {
            scene.customRenderTargets.splice(index, 1);
          }
        }
        state.renderTexture.dispose();
      }

      // Dispose of camera
      if (state.renderCamera) {
        state.renderCamera.dispose();
      }

      // Dispose of mesh (this will also dispose children like viewfinder)
      if (state.cameraMesh) {
        state.cameraMesh.dispose();
      }

      setState(prev => ({
        ...prev,
        isActive: false,
        cameraMesh: null,
        renderCamera: null,
        renderTexture: null,
      }));

      console.log('🗑️ Render camera removed from scene');
    } catch (error) {
      console.error('❌ Error removing camera from scene:', error);
    }
  }, [state.isActive, state.renderTexture, state.renderCamera, state.cameraMesh]);

  /**
   * Update camera field of view
   */
  const setFieldOfView = useCallback((fov: number) => {
    setState(prev => ({ ...prev, fieldOfView: fov }));
    
    if (state.renderCamera) {
      state.renderCamera.fov = (fov * Math.PI) / 180;
      console.log(`🎬 Camera FOV updated to ${fov}°`);
    }
  }, [state.renderCamera]);

  /**
   * Toggle live preview
   */
  const setPreviewEnabled = useCallback((enabled: boolean) => {
    setState(prev => ({ ...prev, previewEnabled: enabled }));
    
    if (state.renderTexture) {
      // Enable/disable render target updates
      if (enabled) {
        state.renderTexture.refreshRate = 1; // Update every frame
      } else {
        state.renderTexture.refreshRate = 0; // Stop updating
      }
      console.log(`📺 Live preview ${enabled ? 'enabled' : 'disabled'}`);
    }
  }, [state.renderTexture]);

  /**
   * Set render resolution
   */
  const setResolution = useCallback((width: number, height: number) => {
    setState(prev => ({ 
      ...prev, 
      resolution: { width, height } 
    }));
    console.log(`🎬 Render resolution set to ${width}x${height}`);
  }, []);

  /**
   * Capture high-quality render
   */
  const captureHighQualityRender = useCallback(async (): Promise<string | null> => {
    console.log('📸 Starting capture render process...');
    
    if (!state.renderCamera || !scene) {
      console.error('🎬 Camera or scene not available for capture');
      return null;
    }

    const engine = scene.getEngine();
    if (!engine) {
      console.error('🎬 Engine not available for capture');
      return null;
    }

    try {
      const { width, height } = state.resolution;
      console.log(`📸 Capturing at resolution: ${width}x${height}`);
      
      // Store current active camera
      const originalCamera = scene.activeCamera;
      
      return new Promise<string | null>((resolve) => {
        try {
          // Store original camera
          const originalCamera = scene.activeCamera;
          
          console.log('📸 Camera switched, taking canvas screenshot...');
          
          // Set timeout protection
          const timeoutId = setTimeout(() => {
            console.error('❌ Screenshot timeout - restoring camera');
            scene.activeCamera = originalCamera;
            resolve(null);
          }, 5000);
          
          // Temporarily switch to render camera
          scene.activeCamera = state.renderCamera;
          
          // Force a render frame
          scene.render();
          
          // Use requestAnimationFrame to ensure render is complete
          requestAnimationFrame(() => {
            try {
              clearTimeout(timeoutId);
              
              // Get the engine's canvas
              const engineCanvas = engine.getRenderingCanvas();
              
              if (engineCanvas) {
                // Create a new canvas for our screenshot
                const screenshotCanvas = document.createElement('canvas');
                screenshotCanvas.width = width;
                screenshotCanvas.height = height;
                const ctx = screenshotCanvas.getContext('2d');
                
                if (ctx) {
                  // Draw the engine canvas to our screenshot canvas
                  ctx.drawImage(engineCanvas, 0, 0, width, height);
                  
                  // Convert to data URL
                  const dataUrl = screenshotCanvas.toDataURL('image/png', 1.0);
                  
                  // Restore original camera
                  scene.activeCamera = originalCamera;
                  
                  console.log('📸 Camera restored to original view');
                  console.log(`✅ High-quality render captured successfully (${dataUrl.length} chars)`);
                  resolve(dataUrl);
                } else {
                  console.error('❌ Failed to get canvas context');
                  scene.activeCamera = originalCamera;
                  resolve(null);
                }
              } else {
                console.error('❌ Failed to get engine canvas');
                scene.activeCamera = originalCamera;
                resolve(null);
              }
            } catch (error) {
              console.error('❌ Error in canvas screenshot:', error);
              scene.activeCamera = originalCamera;
              resolve(null);
            }
          });
          
        } catch (screenshotError) {
          console.error('❌ Error in screenshot creation:', screenshotError);
          scene.activeCamera = originalCamera;
          resolve(null);
        }
      });
      
    } catch (error) {
      console.error('❌ Error capturing render:', error);
      return null;
    }
  }, [state.renderCamera, state.resolution, scene]);

  /**
   * Save image to download
   */
  const saveImage = useCallback((dataUrl: string, filename: string = 'render.png') => {
    try {
      const link = document.createElement('a');
      link.download = filename;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log(`💾 Image saved as ${filename}`);
    } catch (error) {
      console.error('❌ Error saving image:', error);
    }
  }, []);

  return {
    state,
    actions: {
      addCameraToScene,
      removeCameraFromScene,
      setFieldOfView,
      setPreviewEnabled,
      setResolution,
      captureHighQualityRender,
      saveImage,
    }
  };
};

export default useRenderCamera;
