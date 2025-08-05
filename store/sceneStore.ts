import { create } from 'zustand';
import { Scene as BabylonScene, Light as BabylonLight, DirectionalLight, PointLight, SpotLight, AbstractMesh } from '@babylonjs/core';
import { Color3, Vector3 } from '@babylonjs/core';

export type LightType = 'directional' | 'point' | 'spot' | 'hdr';

export interface Light {
  id: string;
  type: LightType;
  name: string;
  intensity: number;
  position?: { x: number; y: number; z: number };
  direction?: { x: number; y: number; z: number };
  color: string;
  angle?: number;
  exponent?: number;
  range?: number;
  environmentTexture?: string;
  babylonRef?: BabylonLight;
}

interface SceneState {
  scene: BabylonScene | null;
  setScene: (scene: BabylonScene) => void;
  
  selectedMeshes: AbstractMesh[];
  setSelectedMeshes: (meshes: AbstractMesh[]) => void;
  
  lights: Light[];
  selectedLightId: string | null;
  
  addLight: (light: Omit<Light, 'id'> & { babylonRef?: BabylonLight }) => string;
  removeLight: (id: string) => void;
  updateLight: (id: string, updates: Partial<Light>) => void;
  selectLight: (id: string | null) => void;
  
  environmentIntensity: number;
  setEnvironmentIntensity: (intensity: number) => void;
  environmentTexture: string | null;
  setEnvironmentTexture: (url: string | null) => void;
}

const generateId = (prefix: string, counter: number) => `${prefix}-${counter}`;

const useSceneStore = create<SceneState>((set, get) => ({
  // Scene state
  scene: null,
  
  selectedMeshes: [],
  setSelectedMeshes: (meshes: AbstractMesh[]) => set({ selectedMeshes: meshes }),
  setScene: (scene) => set({ scene }),
  
  lights: [],
  selectedLightId: null,
  
  environmentIntensity: 1.0,
  environmentTexture: null,
  
  setEnvironmentTexture: (url) => set({ environmentTexture: url }),
  
  setEnvironmentIntensity: (intensity) => set({ environmentIntensity: intensity }),
  
  addLight: (lightData) => {
    // Generate unique id
    const newId = generateId(lightData.type, get().lights.length);
    
    const newLight: Light = {
      id: newId,
      name: lightData.name || `${lightData.type} Light ${get().lights.length + 1}`,
      type: lightData.type,
      intensity: lightData.intensity || 1.0,
      color: lightData.color || '#FFFFFF',
      position: lightData.position,
      direction: lightData.direction,
      angle: lightData.angle,
      exponent: lightData.exponent,
      range: lightData.range,
      environmentTexture: lightData.environmentTexture,
      babylonRef: lightData.babylonRef,
    };
    
    set((state) => ({
      lights: [...state.lights, newLight],
      selectedLightId: newId,
    }));
    
    return newId;
  },
  
  removeLight: (id) => {
    const light = get().lights.find(l => l.id === id);
    const scene = get().scene;
    
    if (light?.babylonRef && scene) {
      light.babylonRef.dispose();
    }
    
    set((state) => ({
      lights: state.lights.filter(light => light.id !== id),
      selectedLightId: state.selectedLightId === id ? null : state.selectedLightId,
    }));
  },
  
  updateLight: (id, updates) => {
    const light = get().lights.find(l => l.id === id);
    const scene = get().scene;
    
    if (!light || !scene) return;
    
    if (light.babylonRef) {
      // Update intensity
      if (updates.intensity !== undefined) {
        light.babylonRef.intensity = updates.intensity;
      }
      
      if (updates.color !== undefined) {
        const color = Color3.FromHexString(updates.color);
        if (light.babylonRef instanceof DirectionalLight ||
            light.babylonRef instanceof PointLight ||
            light.babylonRef instanceof SpotLight) {
          light.babylonRef.diffuse = color;
          light.babylonRef.specular = color;
        }
      }
      
      if (updates.position && (light.type === 'point' || light.type === 'spot')) {
        const pos = updates.position;
        if (light.babylonRef instanceof PointLight ||
            light.babylonRef instanceof SpotLight) {
          light.babylonRef.position = new Vector3(pos.x, pos.y, pos.z);
        }
      }
      
      if (updates.direction && (light.type === 'directional' || light.type === 'spot')) {
        const dir = updates.direction;
        if (light.babylonRef instanceof DirectionalLight) {
          light.babylonRef.direction = new Vector3(dir.x, dir.y, dir.z);
        } else if (light.babylonRef instanceof SpotLight) {
          light.babylonRef.direction = new Vector3(dir.x, dir.y, dir.z);
        }
      }
      
      if (updates.angle !== undefined && light.type === 'spot') {
        if (light.babylonRef instanceof SpotLight) {
          light.babylonRef.angle = updates.angle;
        }
      }
      
      if (updates.exponent !== undefined && light.type === 'spot') {
        if (light.babylonRef instanceof SpotLight) {
          light.babylonRef.exponent = updates.exponent;
        }
      }
      
      if (updates.range !== undefined && (light.type === 'point' || light.type === 'spot')) {
        if (light.babylonRef instanceof PointLight) {
          light.babylonRef.range = updates.range;
        } else if (light.babylonRef instanceof SpotLight) {
          light.babylonRef.range = updates.range;
        }
      }
    }
    
    set((state) => ({
      lights: state.lights.map(l => 
        l.id === id ? { ...l, ...updates } : l
      ),
    }));
  },
  
  selectLight: (id) => set({ selectedLightId: id }),
}));

export default useSceneStore;
