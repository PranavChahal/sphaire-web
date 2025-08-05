import { AIExecutor, OCCShape } from '../types/cad';

/**
 * Extended mock shape for testing purposes
 * Implements OCCShape interface and adds additional properties for testing
 */
interface MockShape extends OCCShape {
  id: string;
  mockType: string;
  operation?: string;
  mockParams?: any;
  tessellationResult?: {
    vertices: Float32Array;
    indices: Uint32Array;
    normals: Float32Array;
  };
  mockTransform?: {
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
    scale: { x: number; y: number; z: number };
  };
}

/**
 * Create a basic mock shape that implements the OCCShape interface
 */
function createMockShape(type = 'solid'): MockShape {
  const id = `mock-${type}-${Date.now()}`;
  
  // Create a shape that implements the OCCShape interface
  return {
    id,
    mockType: type,
    // Implement required OCCShape methods
    HashCode: (n: number) => {
      return n + 1; // Simple mock implementation
    },
    IsNull: () => false,
    // Additional mock data for testing
    tessellationResult: {
      vertices: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
      indices: new Uint32Array([0, 1, 2]),
      normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1])
    },
    mockTransform: {
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 }
    }
  };
}

/**
 * Mock implementation of the AI Executor
 * Used for development and testing when the real AI executor is not available
 */
export const mockAIExecutor: AIExecutor = {
  /**
   * Execute a CAD operation via the mock AI executor
   * 
   * @param operation The operation to perform (e.g., 'extrude', 'bevel')
   * @param params Parameters for the operation
   * @returns Promise resolving to the result shape
   */
  executeCADOperation: async (operation: string, params: any): Promise<OCCShape | null> => {
    console.log(`Mock AI Executor: ${operation} called with params:`, params);
    
    // Mock different operations based on the operation string
    switch (operation) {
      // === CREATE OPERATIONS ===
      case 'create': {
        const { object } = params;
        console.log('Mock create operation', { object });
        
        // Return a new mock shape based on the object type
        const mockShape = createMockShape(object || 'solid');
        return mockShape;
      }

      // === TRANSFORM OPERATIONS ===
      case 'move': {
        const { shape, axis, distance } = params;
        console.log('Mock move operation', { shape, axis, distance });
        
        // Get base shape or create a new one
        const baseShape = shape as MockShape || createMockShape();
        const mockShape = createMockShape();
        
        // Copy properties from base shape
        Object.assign(mockShape, baseShape);
        mockShape.operation = 'move';
        mockShape.mockParams = { axis, distance };
        
        // Update position if mockTransform exists
        if (mockShape.mockTransform && axis && distance) {
          if (axis === 'x') mockShape.mockTransform.position.x += distance;
          if (axis === 'y') mockShape.mockTransform.position.y += distance;
          if (axis === 'z') mockShape.mockTransform.position.z += distance;
        }
        
        return mockShape;
      }

      case 'rotate': {
        const { shape, axis, degrees } = params;
        console.log('Mock rotate operation', { shape, axis, degrees });
        
        // Get base shape or create a new one
        const baseShape = shape as MockShape || createMockShape();
        const mockShape = createMockShape();
        
        // Copy properties from base shape
        Object.assign(mockShape, baseShape);
        mockShape.operation = 'rotate';
        mockShape.mockParams = { axis, degrees };
        
        // Update rotation if mockTransform exists
        if (mockShape.mockTransform && axis && degrees) {
          if (axis === 'x') mockShape.mockTransform.rotation.x += degrees;
          if (axis === 'y') mockShape.mockTransform.rotation.y += degrees;
          if (axis === 'z') mockShape.mockTransform.rotation.z += degrees;
        }
        
        return mockShape;
      }

      case 'scale': {
        const { shape, factor } = params;
        console.log('Mock scale operation', { shape, factor });
        
        // Get base shape or create a new one
        const baseShape = shape as MockShape || createMockShape();
        const mockShape = createMockShape();
        
        // Copy properties from base shape
        Object.assign(mockShape, baseShape);
        mockShape.operation = 'scale';
        mockShape.mockParams = { factor };
        
        // Update scale if mockTransform exists
        if (mockShape.mockTransform && factor) {
          mockShape.mockTransform.scale.x *= factor;
          mockShape.mockTransform.scale.y *= factor;
          mockShape.mockTransform.scale.z *= factor;
        }
        
        return mockShape;
      }
      
      // === FEATURE OPERATIONS ===
      case 'extrude':
      case 'extrudeFace': {
        const { shape, faceIndices, distance, direction } = params;
        console.log('Mock extrusion operation', { shape, faceIndices, distance, direction });
        
        // Get base shape or create a new one
        const baseShape = shape as MockShape || createMockShape();
        const mockShape = createMockShape();
        
        // Copy properties from base shape
        Object.assign(mockShape, baseShape);
        mockShape.mockType = 'extruded';
        mockShape.operation = 'extrude';
        mockShape.mockParams = { faceIndices, distance, direction };
        
        return mockShape;
      }
      
      case 'bevel':
      case 'bevelEdge': {
        const { shape, edgeIndices, amount } = params;
        console.log('Mock bevel operation', { shape, edgeIndices, amount });
        
        // Get base shape or create a new one
        const baseShape = shape as MockShape || createMockShape();
        const mockShape = createMockShape();
        
        // Copy properties from base shape
        Object.assign(mockShape, baseShape);
        mockShape.mockType = 'beveled';
        mockShape.operation = 'bevel';
        mockShape.mockParams = { edgeIndices, amount };
        
        return mockShape;
      }
      
      case 'chamfer':
      case 'chamferEdge': {
        const { shape, edgeIndices, amount } = params;
        console.log('Mock chamfer operation', { shape, edgeIndices, amount });
        
        // Get base shape or create a new one
        const baseShape = shape as MockShape || createMockShape();
        const mockShape = createMockShape();
        
        // Copy properties from base shape
        Object.assign(mockShape, baseShape);
        mockShape.mockType = 'chamfered';
        mockShape.operation = 'chamfer';
        mockShape.mockParams = { edgeIndices, amount };
        
        return mockShape;
      }
      
      case 'boolean':
      case 'booleanOperation': {
        const { shape1, shape2, operation: boolOp } = params;
        console.log('Mock boolean operation', { shape1, shape2, operation: boolOp });
        
        // Get base shape or create a new one
        const baseShape = shape1 as MockShape || createMockShape();
        const mockShape = createMockShape();
        
        // Copy properties from base shape
        Object.assign(mockShape, baseShape);
        mockShape.mockType = boolOp || 'union';
        mockShape.operation = 'boolean';
        mockShape.mockParams = { operationType: boolOp };
        
        return mockShape;
      }

      case 'delete': {
        console.log('Mock delete operation', params);
        // Return null to simulate deletion
        return null;
      }
      
      default:
        console.warn(`Mock AI Executor: Unknown operation '${operation}'`);
        return null;
    }
  }
};

/**
 * Get the AI executor, with fallback to mock
 * @returns The AI executor implementation
 */
export async function getAIExecutor(): Promise<AIExecutor> {
  // In tests or development, immediately return the mock
  return mockAIExecutor;
}
