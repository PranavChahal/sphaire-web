import { useCallback, useRef } from 'react';
import { DirectionalLight, HemisphericLight, Color3, Vector3, Mesh, MeshBuilder, StandardMaterial, UtilityLayerRenderer, PositionGizmo, RotationGizmo } from '@babylonjs/core';
import useSceneStore from '../store/sceneStore';

export interface LightSettings {
  keyLight: {
    intensity: number;
    color: Color3;
    direction: Vector3;
  };
  fillLight: {
    intensity: number;
    color: Color3;
  };
  rimLight: {
    intensity: number;
    color: Color3;
    direction: Vector3;
  };
}

export const defaultLightSettings: LightSettings = {
  keyLight: {
    intensity: 1.2,
    color: new Color3(1, 0.95, 0.8),
    direction: new Vector3(-0.5, -1, -0.3)
  },
  fillLight: {
    intensity: 0.3,
    color: new Color3(0.7, 0.8, 1.0)
  },
  rimLight: {
    intensity: 0.6,
    color: new Color3(0.9, 0.9, 1.0),
    direction: new Vector3(1, 0.2, 0.5)
  }
};

export const lightingPresets = {
  studio: defaultLightSettings,
  natural: {
    keyLight: {
      intensity: 0.8,
      color: new Color3(1, 1, 0.95),
      direction: new Vector3(-0.3, -1, -0.5)
    },
    fillLight: {
      intensity: 0.5,
      color: new Color3(0.8, 0.9, 1.0)
    },
    rimLight: {
      intensity: 0.3,
      color: new Color3(1, 0.98, 0.9),
      direction: new Vector3(1, 0.3, 0.3)
    }
  },
  dramatic: {
    keyLight: {
      intensity: 2.0,
      color: new Color3(1, 0.9, 0.7),
      direction: new Vector3(-0.8, -1, -0.2)
    },
    fillLight: {
      intensity: 0.1,
      color: new Color3(0.5, 0.6, 0.8)
    },
    rimLight: {
      intensity: 1.2,
      color: new Color3(0.8, 0.8, 1.0),
      direction: new Vector3(1.2, 0.1, 0.8)
    }
  },
  soft: {
    keyLight: {
      intensity: 0.6,
      color: new Color3(1, 1, 1),
      direction: new Vector3(-0.2, -1, -0.4)
    },
    fillLight: {
      intensity: 0.7,
      color: new Color3(0.9, 0.9, 1.0)
    },
    rimLight: {
      intensity: 0.2,
      color: new Color3(1, 1, 1),
      direction: new Vector3(0.5, 0.5, 0.5)
    }
  }
};

export const useLighting = () => {
  const scene = useSceneStore(state => state.scene);

  const createLightHelper = useCallback((light: DirectionalLight | HemisphericLight, helperName: string) => {
    if (!scene) return null;

    const existingHelper = scene.getMeshByName(helperName);
    if (existingHelper) {
      existingHelper.dispose();
    }

    let helper: Mesh;
    const material = new StandardMaterial(`${helperName}_material`, scene);
    material.emissiveColor = light.diffuse;
    material.disableLighting = true;

    if (light instanceof DirectionalLight) {
      // Create directional light helper (arrow/cone shape)
      helper = MeshBuilder.CreateCylinder(helperName, {
        diameterTop: 0,
        diameterBottom: 0.5,
        height: 1,
        tessellation: 8
      }, scene);
      
      // Position helper freely in 3D space based on light type
      // Use reasonable default positions that allow free gizmo movement
      if (helperName.includes('key')) {
        helper.position = new Vector3(-3, 3, -2);
        helper.rotation = new Vector3(Math.PI/4, -Math.PI/4, 0);
      } else if (helperName.includes('rim')) {
        helper.position = new Vector3(3, 1, 2);
        helper.rotation = new Vector3(-Math.PI/6, Math.PI/3, 0);
      } else {
        // Default directional light position
        helper.position = new Vector3(-2, 4, -1);
        helper.rotation = new Vector3(Math.PI/3, -Math.PI/6, 0);
      }
    } else {
      // Create hemispheric light helper (sphere)
      helper = MeshBuilder.CreateSphere(helperName, { diameter: 0.4 }, scene);
      
      // Position fill light helper freely above the scene
      helper.position = new Vector3(0, 4, 0); // Higher up for better visibility
    }

    helper.material = material;
    helper.isPickable = true;
    helper.metadata = { isLightHelper: true, lightName: light.name };
    
    return helper;
  }, [scene]);



  // State management for active gizmo and helper using useRef
  const activeGizmoRef = useRef<PositionGizmo | RotationGizmo | null>(null);
  const activeHelperRef = useRef<Mesh | null>(null);
  const currentLightNameRef = useRef<string | null>(null);

  // Properly dispose active gizmo and helper
  const cleanupActiveGizmo = useCallback(() => {
    // Dispose active gizmo
    if (activeGizmoRef.current) {
      activeGizmoRef.current.dispose();
      activeGizmoRef.current = null;
    }
    
    // Dispose active helper
    if (activeHelperRef.current) {
      activeHelperRef.current.dispose();
      activeHelperRef.current = null;
    }
    
    currentLightNameRef.current = null;
  }, []);

  // Hide all light helpers and gizmos
  const hideLightHelpers = useCallback(() => {
    if (!scene) return;

    // Clean up active gizmo first
    cleanupActiveGizmo();

    // Remove any remaining light helpers (fallback cleanup)
    ['keyLightHelper', 'fillLightHelper', 'rimLightHelper'].forEach(helperName => {
      const helper = scene.getMeshByName(helperName);
      if (helper) {
        helper.dispose();
      }
    });
  }, [scene, cleanupActiveGizmo]);

  // Activate a single light gizmo with proper state management
  const activateLightGizmo = useCallback((lightName: 'key' | 'fill' | 'rim', gizmoMode: 'position' | 'rotation') => {
    if (!scene) return;

    const light = scene.getLightByName(`${lightName}Light`) as DirectionalLight | HemisphericLight;
    if (!light) return;

    // If we're switching to the same light but different mode, just update the gizmo
    if (currentLightNameRef.current === lightName && activeHelperRef.current) {
      // Dispose only the gizmo, keep the helper
      if (activeGizmoRef.current) {
        activeGizmoRef.current.dispose();
        activeGizmoRef.current = null;
      }
    } else {
      // Switching to different light, clean up everything
      cleanupActiveGizmo();
      
      // Create new helper for the selected light
      activeHelperRef.current = createLightHelper(light, `${lightName}LightHelper`);
      if (!activeHelperRef.current) return;
      
      currentLightNameRef.current = lightName;
    }

    // Create and attach the appropriate gizmo
    const utilityLayer = UtilityLayerRenderer.DefaultUtilityLayer;

    if (gizmoMode === 'position') {
      activeGizmoRef.current = new PositionGizmo(utilityLayer);
      activeGizmoRef.current.attachedMesh = activeHelperRef.current;
      activeGizmoRef.current.scaleRatio = 0.8;
      
      activeGizmoRef.current.onDragEndObservable.add(() => {
        if (light instanceof DirectionalLight && activeHelperRef.current) {
          // Helper can move freely - calculate light direction from helper to origin
          // This allows unrestricted 3D movement while maintaining directional light behavior
          const helperPos = activeHelperRef.current.position;
          const targetPos = Vector3.Zero(); // Light points toward scene center
          const direction = targetPos.subtract(helperPos).normalize();
          light.direction = direction;
        }
      });
    } else if (gizmoMode === 'rotation' && light instanceof DirectionalLight) {
      activeGizmoRef.current = new RotationGizmo(utilityLayer);
      activeGizmoRef.current.attachedMesh = activeHelperRef.current;
      activeGizmoRef.current.scaleRatio = 0.8;
      
      activeGizmoRef.current.onDragEndObservable.add(() => {
        if (activeHelperRef.current) {
          // Update light direction based on helper rotation
          // Allow free rotation - use helper's forward direction
          const forward = activeHelperRef.current.getDirection(Vector3.Forward());
          light.direction = forward.normalize();
        }
      });
    }
  }, [scene, createLightHelper, cleanupActiveGizmo]);

  const updateKeyLight = useCallback((intensity: number, color: Color3, direction: Vector3) => {
    if (!scene) return;
    
    const keyLight = scene.getLightByName('keyLight') as DirectionalLight;
    if (keyLight) {
      keyLight.intensity = intensity;
      keyLight.diffuse = color;
      keyLight.direction = direction;
    }
  }, [scene]);

  const updateFillLight = useCallback((intensity: number, color: Color3) => {
    if (!scene) return;
    
    const fillLight = scene.getLightByName('fillLight') as HemisphericLight;
    if (fillLight) {
      fillLight.intensity = intensity;
      fillLight.diffuse = color;
    }
  }, [scene]);

  const updateRimLight = useCallback((intensity: number, color: Color3, direction: Vector3) => {
    if (!scene) return;
    
    const rimLight = scene.getLightByName('rimLight') as DirectionalLight;
    if (rimLight) {
      rimLight.intensity = intensity;
      rimLight.diffuse = color;
      rimLight.direction = direction;
    }
  }, [scene]);

  const applyLightingPreset = useCallback((presetName: keyof typeof lightingPresets) => {
    const preset = lightingPresets[presetName];
    if (!preset) return;

    updateKeyLight(preset.keyLight.intensity, preset.keyLight.color, preset.keyLight.direction);
    updateFillLight(preset.fillLight.intensity, preset.fillLight.color);
    updateRimLight(preset.rimLight.intensity, preset.rimLight.color, preset.rimLight.direction);
  }, [updateKeyLight, updateFillLight, updateRimLight]);

  const getLightSettings = useCallback((): LightSettings | null => {
    if (!scene) return null;

    const keyLight = scene.getLightByName('keyLight') as DirectionalLight;
    const fillLight = scene.getLightByName('fillLight') as HemisphericLight;
    const rimLight = scene.getLightByName('rimLight') as DirectionalLight;

    if (!keyLight || !fillLight || !rimLight) return null;

    return {
      keyLight: {
        intensity: keyLight.intensity,
        color: keyLight.diffuse,
        direction: keyLight.direction
      },
      fillLight: {
        intensity: fillLight.intensity,
        color: fillLight.diffuse
      },
      rimLight: {
        intensity: rimLight.intensity,
        color: rimLight.diffuse,
        direction: rimLight.direction
      }
    };
  }, [scene]);

  // Utility functions to convert between Color3 and hex
  const color3ToHex = useCallback((color: Color3): string => {
    const r = Math.round(color.r * 255);
    const g = Math.round(color.g * 255);
    const b = Math.round(color.b * 255);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }, []);

  const hexToColor3 = useCallback((hex: string): Color3 => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    return new Color3(r, g, b);
  }, []);

  return {
    updateKeyLight,
    updateFillLight,
    updateRimLight,
    applyLightingPreset,
    getLightSettings,
    color3ToHex,
    hexToColor3,
    lightingPresets,
    activateLightGizmo,
    hideLightHelpers
  };
};
