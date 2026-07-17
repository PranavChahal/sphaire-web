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

// ⭐ NEW: Parametric shape with preserved parameters
export interface ParametricShape extends BaseShape {
  type: 'parametric';
  shapeType: 'box' | 'cylinder' | 'sphere' | 'cone' | 'torus' | 'gear' | 'bottle' | 'threaded-rod' | 'custom';
  parameters: Record<string, number>; // e.g., { width: 2, height: 3, depth: 1 }
  constructionCode: string; // For regeneration
  version: number; // For tracking parameter updates
  meshData?: { positions: Float32Array; indices: Uint32Array }; // Mesh geometry for rendering
  // Runtime only - not serialized
  occShape?: any;
  // Parameter metadata for UI controls (min, max, step)
  metadata?: Record<string, { min: number; max: number; step: number }>;
}

// Union of all shape types
export type Shape = BoxShape | SphereShape | CylinderShape | CustomShape | ModelShape | ParametricShape;

export interface ShapeState {
  shapes: Shape[];
  selectedShapeId: string | null;
  lastCreatedId: number;
  selectedVertices: Record<string, number[]>;
  
  addShape: (shapeData: Partial<Shape>) => void;
  addModel: (modelData: Omit<ModelShape, 'id'>) => string;
  addParametricShape: (parametricData: Omit<ParametricShape, 'id'>) => string;
  updateParametricParameters: (id: string, newParameters: Record<string, number>) => void;
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
  
  // CRITICAL FIX: Internal methods for direct state updates (bypass undo/redo)
  _addShapeDirect: (shape: Shape) => void;
  _removeShapeDirect: (id: string) => void;
  _updateShapeDirect: (id: string, updates: Partial<Shape>) => void;
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
      
      case 'parametric':
        const parametricData = shapeData as Partial<ParametricShape>;
        if (!parametricData.shapeType || !parametricData.parameters) {
          console.error('Parametric shape requires shapeType and parameters');
          return state;
        }
        newShape = {
          id,
          type: 'parametric',
          position: shapeData.position || { x: 0, y: 0, z: 0 },
          rotation: shapeData.rotation || { x: 0, y: 0, z: 0 },
          scaling: shapeData.scaling || { x: 1, y: 1, z: 1 },
          color: shapeData.color,
          shapeType: parametricData.shapeType,
          parameters: parametricData.parameters,
          constructionCode: parametricData.constructionCode || '',
          version: parametricData.version || 1,
          occShape: parametricData.occShape,
        };
        break;
        
      default:
        console.error('Unknown shape type:', shapeType);
        return state;
    }
    
    if (state.undoRedoEnabled && state._undoRedoSystem) {
      const undoRedoSystem = state._undoRedoSystem;
      
      // Create undo/redo action using direct methods to avoid multiple subscriptions
      const action = {
        type: 'CREATE_SHAPE',
        description: `Create ${newShape.type}`,
        data: newShape,
        redo: async () => {
          // executeAction calls redo once when it records the action. The shape is
          // already visible by then, so only add it during a genuine redo.
          if (!useStore.getState().shapes.some((shape) => shape.id === newShape.id)) {
            useStore.getState()._addShapeDirect(newShape);
          }
        },
        undo: async () => {
          // Use direct method to avoid triggering subscription multiple times
          useStore.getState()._removeShapeDirect(newShape.id);
        }
      };
      
      // Commit the object first. Calling executeAction from inside this Zustand
      // setter used to run a nested setter and then overwrite it with `state`,
      // leaving a visible Babylon mesh with no object in the application store.
      queueMicrotask(() => void undoRedoSystem.executeAction(action));
    }

    return { 
      shapes: [...state.shapes, newShape],
      selectedShapeId: id,
      lastCreatedId: state.lastCreatedId + 1
    };
  }),
  
  addModel: (modelData: Omit<ModelShape, 'id'>) => {
    let createdId = '';
    set((state) => {
      const id = generateId('model', state.lastCreatedId + 1);
      createdId = id;
      const newModel: ModelShape = { id, ...modelData };

      if (state.undoRedoEnabled && state._undoRedoSystem) {
        const undoRedoSystem = state._undoRedoSystem;
        const action = {
          type: 'CREATE_MODEL',
          description: `Create model ${newModel.fileName}`,
          data: newModel,
          redo: async () => {
            if (!useStore.getState().shapes.some((shape) => shape.id === newModel.id)) {
              useStore.getState()._addShapeDirect(newModel);
            }
          },
          undo: async () => {
            // Use direct method to avoid multiple subscriptions
            useStore.getState()._removeShapeDirect(newModel.id);
          }
        };
        queueMicrotask(() => void undoRedoSystem.executeAction(action));
      }

      return {
        shapes: [...state.shapes, newModel],
        selectedShapeId: id,
        lastCreatedId: state.lastCreatedId + 1
      };
    });
    return createdId;
  },
  
  // ⭐ NEW: Add parametric shape with preserved parameters
  addParametricShape: (parametricData: Omit<ParametricShape, 'id'>) => {
    let createdId = '';
    set((state) => {
      const id = generateId('parametric', state.lastCreatedId + 1);
      createdId = id;
      const newParametric: ParametricShape = { id, ...parametricData };

      if (state.undoRedoEnabled && state._undoRedoSystem) {
        const undoRedoSystem = state._undoRedoSystem;
        
        // CRITICAL FIX: Add to state immediately to prevent race conditions
        // The shape must be in state BEFORE subscriptions fire
        const newState = {
          shapes: [...state.shapes, newParametric],
          selectedShapeId: id,
          lastCreatedId: state.lastCreatedId + 1
        };
        
        // Create undo/redo action (redo will check if shape exists to prevent duplicates)
        const action = {
          type: 'CREATE_PARAMETRIC',
          description: `Create parametric ${newParametric.shapeType}`,
          data: newParametric,
          redo: async () => {
            // Only add if it doesn't exist (for actual redo operations)
            const currentShapes = useStore.getState().shapes;
            if (!currentShapes.find(s => s.id === newParametric.id)) {
              useStore.getState()._addShapeDirect(newParametric);
            }
          },
          undo: async () => {
            useStore.getState()._removeShapeDirect(newParametric.id);
          }
        };
        
        // Record after the state transaction commits. This prevents nested Zustand
        // writes from racing the viewport subscription.
        queueMicrotask(() => void undoRedoSystem.executeAction(action));
        
        return newState;
      }

      return {
        shapes: [...state.shapes, newParametric],
        selectedShapeId: id,
        lastCreatedId: state.lastCreatedId + 1
      };
    });
    return createdId;
  },
  
  // ⭐ NEW: Update parametric shape parameters
  updateParametricParameters: (id: string, newParameters: Record<string, number>) => {
    set((state) => {
      const shape = state.shapes.find(s => s.id === id);
      if (!shape || shape.type !== 'parametric') {
        console.error('Shape not found or not parametric:', id);
        return state;
      }

      const oldShape = shape as ParametricShape;
      const updatedShape: ParametricShape = {
        ...oldShape,
        parameters: newParameters,
        version: oldShape.version + 1,
      };

      if (state.undoRedoEnabled && state._undoRedoSystem) {
        const undoRedoSystem = state._undoRedoSystem;
        const action = {
          type: 'UPDATE_PARAMETRIC_PARAMS',
          description: `Update ${oldShape.shapeType} parameters`,
          data: { id, oldParameters: oldShape.parameters, newParameters },
          redo: async () => {
            useStore.getState()._updateShapeDirect(id, {
              parameters: newParameters,
              version: oldShape.version + 1
            } as Partial<ParametricShape>);
          },
          undo: async () => {
            useStore.getState()._updateShapeDirect(id, {
              parameters: oldShape.parameters,
              version: oldShape.version
            } as Partial<ParametricShape>);
          }
        };
        queueMicrotask(() => void undoRedoSystem.executeAction(action));
        return {
          ...state,
          shapes: state.shapes.map((item) => item.id === id ? updatedShape : item)
        };
      }

      return {
        ...state,
        shapes: state.shapes.map(s => s.id === id ? updatedShape : s)
      };
    });
  },
  
  removeShape: (id) => set((state) => {
    const shapeToRemove = state.shapes.find(s => s.id === id);
    if (!shapeToRemove) return state;
    
    // If undo/redo is enabled, create an action instead of directly modifying state
    if (state.undoRedoEnabled && state._undoRedoSystem) {
      const undoRedoSystem = state._undoRedoSystem;
      
      // Create undo/redo action using direct methods
      const action = {
        type: 'DELETE_SHAPE',
        description: `Delete ${shapeToRemove.type}`,
        data: shapeToRemove,
        redo: async () => {
          // Use direct method to avoid multiple subscriptions
          useStore.getState()._removeShapeDirect(id);
        },
        undo: async () => {
          // Use direct method to avoid multiple subscriptions
          useStore.getState()._addShapeDirect(shapeToRemove);
        }
      };
      
      queueMicrotask(() => void undoRedoSystem.executeAction(action));
      return {
        shapes: state.shapes.filter((shape) => shape.id !== id),
        selectedShapeId: state.selectedShapeId === id ? null : state.selectedShapeId
      };
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
      
      // Create undo/redo action using direct methods
      const action = {
        type: 'UPDATE_SHAPE',
        description: `Update ${oldShape.type}`,
        data: { id, oldShape, newShape },
        redo: async () => {
          // Use direct method to avoid multiple subscriptions
          useStore.getState()._updateShapeDirect(id, newShape);
        },
        undo: async () => {
          // Use direct method to avoid multiple subscriptions
          useStore.getState()._updateShapeDirect(id, oldShape);
        }
      };
      
      // Make the edit visible now, then record it once this setter has committed.
      queueMicrotask(() => void undoRedoSystem.executeAction(action));
      
      // CRITICAL FIX: Also update state immediately so viewport gets new data
      // The undo/redo action is already registered, this just makes the change visible immediately
      return {
        ...state,
        shapes: state.shapes.map((shape) =>
          shape.id === id ? newShape : shape
        )
      };
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
  
  setUndoRedoSystem: (undoRedoState) => set({ _undoRedoSystem: undoRedoState }),
  
  // CRITICAL FIX: Direct state update methods (bypass undo/redo to prevent multiple subscriptions)
  _addShapeDirect: (shape: Shape) => set((state) => {
    if (state.shapes.some((item) => item.id === shape.id)) return state;
    return {
      shapes: [...state.shapes, shape],
      selectedShapeId: shape.id,
      lastCreatedId: state.lastCreatedId + 1
    };
  }),
  
  _removeShapeDirect: (id: string) => set((state) => ({
    shapes: state.shapes.filter(s => s.id !== id),
    selectedShapeId: state.selectedShapeId === id ? null : state.selectedShapeId
  })),
  
  _updateShapeDirect: (id: string, updates: Partial<Shape>) => set((state) => ({
    ...state,
    shapes: state.shapes.map(shape => shape.id === id ? { ...shape, ...updates } as Shape : shape)
  }))
}));

export default useStore;
