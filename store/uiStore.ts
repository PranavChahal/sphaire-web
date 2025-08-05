import { create } from 'zustand';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { SubObjectMode } from '../types/cad';

interface VertexSelection {
  meshId: string;
  vertexIndex: number;
}

export interface UIState {
  activeTab: string;
  editorVisible: boolean;
  cursorVisible: boolean;
  selectedVertices: VertexSelection[];
  activeMesh: Mesh | null;
  subObjectMode: SubObjectMode;
  subObjectSelectedElements: number[];
  setActiveTab: (tab: string) => void;
  toggleEditor: () => void;
  showEditor: () => void;
  hideEditor: () => void;
  toggleCursor: () => void;
  setCursorVisibility: (visible: boolean) => void;
  toggleVertex: (meshId: string, vertexIndex: number) => void;
  clearSelectedVertices: () => void;
  isVertexSelected: (meshId: string, vertexIndex: number) => boolean;
  setActiveMesh: (mesh: Mesh | null) => void;
  setSubObjectMode: (mode: SubObjectMode) => void;
  setSubObjectSelectedElements: (elements: number[]) => void;
  clearSubObjectSelection: () => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  activeTab: 'object',
  editorVisible: false,
  cursorVisible: true,
  selectedVertices: [],
  activeMesh: null,
  subObjectMode: 'vertex',
  subObjectSelectedElements: [],
  
  setActiveTab: (tab) => set({ activeTab: tab }),
  toggleEditor: () => set((state) => ({ editorVisible: !state.editorVisible })),
  showEditor: () => set({ editorVisible: true }),
  hideEditor: () => set({ editorVisible: false }),
  toggleCursor: () => set((state) => ({ cursorVisible: !state.cursorVisible })),
  setCursorVisibility: (visible) => set({ cursorVisible: visible }),
  
  toggleVertex: (meshId, vertexIndex) => set((state) => {
    const existingIndex = state.selectedVertices.findIndex(
      v => v.meshId === meshId && v.vertexIndex === vertexIndex
    );
    
    if (existingIndex >= 0) {
      const updatedVertices = [...state.selectedVertices];
      updatedVertices.splice(existingIndex, 1);
      return { selectedVertices: updatedVertices };
    } else {
      return { 
        selectedVertices: [...state.selectedVertices, { meshId, vertexIndex }]
      };
    }
  }),
  
  clearSelectedVertices: () => set({ selectedVertices: [] }),
  
  isVertexSelected: (meshId, vertexIndex) => {
    return get().selectedVertices.some(
      v => v.meshId === meshId && v.vertexIndex === vertexIndex
    );
  },
  
  setActiveMesh: (mesh) => set({ activeMesh: mesh }),
  
  setSubObjectMode: (mode) => set({ subObjectMode: mode }),
  
  setSubObjectSelectedElements: (elements) => set({ subObjectSelectedElements: elements }),
  
  clearSubObjectSelection: () => set({ subObjectSelectedElements: [] })
}));
