import { create } from 'zustand';
import { UndoRedoState } from '../hooks/useUndoRedo';

// Multi-file model data bundle for formats like OBJ+MTL+textures
export interface ModelDataBundle {
  main: string; // Base64 of primary file (e.g., .obj, .gltf)
  materials?: string; // Base64 of material file (e.g., .mtl)
  textures?: Record<string, string>; // filename -> Base64 texture data
}

// Base shape interface for primitives
export interface BaseShape {
  id: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scaling: { x: number; y: number; z: number };
  color?: string;
  material?: string;
  name?: string;
  babylonMesh?: any; // Runtime only - never serialized
}

// Primitive shape types
export interface BoxShape extends BaseShape {
  type: 'box';
  dimensions: { width: number; height: number; depth: number };
}

export interface SphereShape extends BaseShape {
  type: 'sphere';
  radius: number;
}

export interface CylinderShape extends BaseShape {
  type: 'cylinder';
  height: number;
  diameter: number;
}

export interface CustomShape extends BaseShape {
  type: 'custom';
  meshData?: { positions: Float32Array; indices: Uint32Array };
}

// Imported model shape type with embedded file data
export interface ModelShape extends BaseShape {
  type: 'model';
  format: string; // 'glb', 'gltf', 'obj', 'stl', etc.
  fileName: string; // Original filename for reference
  data: string | ModelDataBundle; // Base64 encoded file data or multi-file bundle
  originalSize?: number; // Original file size in bytes for reference
}

// Union of all shape types
export type Shape = BoxShape | SphereShape | CylinderShape | CustomShape | ModelShape;

export interface ShapeState {
  shapes: Shape[];
  selectedShapeId: string | null;
  lastCreatedId: number;
  selectedVertices: Record<string, number[]>;
  
  addShape: (shapeData: Partial<Shape>) => void;
  addModel: (modelData: Omit<ModelShape, 'id'>) => void;
  removeShape: (id: string) => void;
  updateShape: (id: string, updates: Partial<Shape>) => void;
  selectShape: (id: string | null) => void;
  clearShapes: () => void;
  rotateShape: (id: string, axis: 'x' | 'y' | 'z', degrees: number) => void;
  moveShape: (id: string, direction: { x?: number; y?: number; z?: number }) => void;
  
  toggleVertex: (shapeId: string, vertexIndex: number) => void;
  isVertexSelected: (shapeId: string, vertexIndex: number) => boolean;
  
  undoRedoEnabled: boolean;
  setUndoRedoSystem: (undoRedoState: UndoRedoState | null) => void;
  _undoRedoSystem: UndoRedoState | null;
}

const generateId = (prefix: string, counter: number) => `${prefix}-${counter}`;

const useStore = create<ShapeState>((set): ShapeState => ({
  shapes: [],
  selectedShapeId: null,
  lastCreatedId: 0,
  selectedVertices: {},
  undoRedoEnabled: true,
  _undoRedoSystem: null,
  
  addShape: (shapeData: Partial<Shape>) => set((state) => {
    const id = shapeData.id || generateId(shapeData.type || 'shape', state.lastCreatedId + 1);
    const shapeType = shapeData.type || 'box';
    
    let newShape: Shape;
    
    // Create shape based on discriminated union
    switch (shapeType) {
      case 'box':
        newShape = {
          id,
          type: 'box',
          position: shapeData.position || { x: 0, y: 0, z: 0 },
          rotation: shapeData.rotation || { x: 0, y: 0, z: 0 },
          scaling: shapeData.scaling || { x: 1, y: 1, z: 1 },
          color: shapeData.color || '#ffffff',
          dimensions: (shapeData as Partial<BoxShape>).dimensions || { width: 1, height: 1, depth: 1 },
        };
        break;
        
      case 'sphere':
        newShape = {
          id,
          type: 'sphere',
          position: shapeData.position || { x: 0, y: 0, z: 0 },
          rotation: shapeData.rotation || { x: 0, y: 0, z: 0 },
          scaling: shapeData.scaling || { x: 1, y: 1, z: 1 },
          color: shapeData.color || '#ffffff',
          radius: (shapeData as Partial<SphereShape>).radius || 1,
        };
        break;
        
      case 'cylinder':
        newShape = {
          id,
          type: 'cylinder',
          position: shapeData.position || { x: 0, y: 0, z: 0 },
          rotation: shapeData.rotation || { x: 0, y: 0, z: 0 },
          scaling: shapeData.scaling || { x: 1, y: 1, z: 1 },
          color: shapeData.color || '#ffffff',
          height: (shapeData as Partial<CylinderShape>).height || 2,
          diameter: (shapeData as Partial<CylinderShape>).diameter || 1,
        };
        break;
        
      case 'custom':
        newShape = {
          id,
          type: 'custom',
          position: shapeData.position || { x: 0, y: 0, z: 0 },
          rotation: shapeData.rotation || { x: 0, y: 0, z: 0 },
          scaling: shapeData.scaling || { x: 1, y: 1, z: 1 },
          color: shapeData.color || '#ffffff',
          meshData: (shapeData as Partial<CustomShape>).meshData,
        };
        break;
        
      case 'model':
        const modelData = shapeData as Partial<ModelShape>;
        if (!modelData.format || !modelData.data || !modelData.fileName) {
          console.error('Model shape requires format, data, and fileName');
          return state;
        }
        newShape = {
          id,
          type: 'model',
          position: shapeData.position || { x: 0, y: 0, z: 0 },
          rotation: shapeData.rotation || { x: 0, y: 0, z: 0 },
          scaling: shapeData.scaling || { x: 1, y: 1, z: 1 },
          color: shapeData.color,
          format: modelData.format,
          fileName: modelData.fileName,
          data: modelData.data,
          originalSize: modelData.originalSize,
        };
        break;
        
      default:
        console.error('Unknown shape type:', shapeType);
        return state;
    }
    
    if (state.undoRedoEnabled && state._undoRedoSystem) {
      const undoRedoSystem = state._undoRedoSystem;
      
      // Create undo/redo action
      const action = {
        type: 'CREATE_SHAPE',
        description: `Create ${newShape.type}`,
        data: newShape,
        redo: async () => {
          set((state) => ({ shapes: [...state.shapes, newShape] }));
        },
        undo: async () => {
          set((state) => ({ shapes: state.shapes.filter(s => s.id !== newShape.id) }));
        }
      };
      
      // Execute through undo/redo system
      undoRedoSystem.executeAction(action);
      return state; // Don't modify state directly
    }
    
    // Default behavior when undo/redo is disabled
    return { 
      shapes: [...state.shapes, newShape],
      selectedShapeId: id,
      lastCreatedId: state.lastCreatedId + 1
    };
  }),
  
  addModel: (modelData: Omit<ModelShape, 'id'>) => set((state) => {
    const id = generateId('model', state.lastCreatedId + 1);
    
    const newModel: ModelShape = {
      id,
      ...modelData
    };
    
    // For now, add model directly without undo/redo integration
    // TODO: Integrate with undo/redo system once interface is clarified
    return { 
      shapes: [...state.shapes, newModel],
      selectedShapeId: id,
      lastCreatedId: state.lastCreatedId + 1
    };
  }),
  
  removeShape: (id) => set((state) => {
    const shapeToRemove = state.shapes.find(s => s.id === id);
    if (!shapeToRemove) return state;
    
    // If undo/redo is enabled, create an action instead of directly modifying state
    if (state.undoRedoEnabled && state._undoRedoSystem) {
      const undoRedoSystem = state._undoRedoSystem;
      
      // Create undo/redo action
      const action = {
        type: 'DELETE_SHAPE',
        description: `Delete ${shapeToRemove.type}`,
        data: shapeToRemove,
        redo: async () => {
          set((state) => ({
            shapes: state.shapes.filter((shape) => shape.id !== id),
            selectedShapeId: state.selectedShapeId === id ? null : state.selectedShapeId
          }));
        },
        undo: async () => {
          set((state) => ({ shapes: [...state.shapes, shapeToRemove] }));
        }
      };
      
      // Execute through undo/redo system
      undoRedoSystem.executeAction(action);
      return state; // Don't modify state directly
    }
    
    // Default behavior when undo/redo is disabled
    return {
      shapes: state.shapes.filter((shape) => shape.id !== id),
      selectedShapeId: state.selectedShapeId === id ? null : state.selectedShapeId
    };
  }),
  
  updateShape: (id, updates) => set((state) => {
    const oldShape = state.shapes.find(s => s.id === id);
    if (!oldShape) return state;
    
    const newShape: Shape = { ...oldShape, ...updates } as Shape;
    
    // If undo/redo is enabled, create an action instead of directly modifying state
    if (state.undoRedoEnabled && state._undoRedoSystem) {
      const undoRedoSystem = state._undoRedoSystem;
      
      // Create undo/redo action
      const action = {
        type: 'UPDATE_SHAPE',
        description: `Update ${oldShape.type}`,
        data: { id, oldShape, newShape },
        redo: async () => {
          set((state) => ({
            ...state,
            shapes: state.shapes.map((shape) =>
              shape.id === id ? newShape : shape
            )
          }));
        },
        undo: async () => {
          set((state) => ({
            ...state,
            shapes: state.shapes.map((shape) =>
              shape.id === id ? oldShape : shape
            )
          }));
        }
      };
      
      // Execute through undo/redo system
      undoRedoSystem.executeAction(action);
      return state; // Don't modify state directly
    }
    
    // Default behavior when undo/redo is disabled
    return {
      ...state,
      shapes: state.shapes.map((shape) =>
        shape.id === id ? newShape : shape
      )
    };
  }),
  
  selectShape: (id) => set({ selectedShapeId: id }),
  clearShapes: () => set({ shapes: [], selectedShapeId: null }),
  
  rotateShape: (id, axis, degrees) => set((state) => ({
    shapes: state.shapes.map(shape => {
      if (shape.id === id) {
        const updatedRotation = { ...shape.rotation };
        updatedRotation[axis] = (updatedRotation[axis] + degrees) % 360;
        return { ...shape, rotation: updatedRotation };
      }
      return shape;
    })
  })),
  
  moveShape: (id, direction) => set((state) => ({
    shapes: state.shapes.map(shape => {
      if (shape.id === id) {
        return { 
          ...shape, 
          position: {
            x: direction.x !== undefined ? shape.position.x + direction.x : shape.position.x,
            y: direction.y !== undefined ? shape.position.y + direction.y : shape.position.y,
            z: direction.z !== undefined ? shape.position.z + direction.z : shape.position.z,
          }
        };
      }
      return shape;
    })
  })),
  
  toggleVertex: (shapeId, vertexIndex) => set((state) => {
    const currentSelected = state.selectedVertices[shapeId] || [];
    let updatedSelected;
    
    if (currentSelected.includes(vertexIndex)) {
      updatedSelected = currentSelected.filter(index => index !== vertexIndex);
    } else {
      updatedSelected = [...currentSelected, vertexIndex];
    }
    
    return {
      selectedVertices: {
        ...state.selectedVertices,
        [shapeId]: updatedSelected
      }
    };
  }),
  
  isVertexSelected: (shapeId: string, vertexIndex: number): boolean => {
    const state: ShapeState = useStore.getState();
    const selectedForShape: number[] = state.selectedVertices[shapeId] || [];
    return selectedForShape.includes(vertexIndex);
  },
  
  setUndoRedoSystem: (undoRedoState) => set({ _undoRedoSystem: undoRedoState })
}));

export default useStore;
