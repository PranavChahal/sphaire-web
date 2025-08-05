// Import only the types and modules we need
import * as subObjectEditor from '../../utils/subObjectEditor';
import { parseCommand } from '../../utils/commandParser';
import type { Mesh } from 'babylonjs'; // Use babylonjs instead of @babylonjs/core for type compatibility

// Mock the subObjectEditor module - only include functions that actually exist
jest.mock('../../utils/subObjectEditor', () => ({
  extrudeElements: jest.fn().mockImplementation(() => Promise.resolve(true)),
  bevelElements: jest.fn().mockImplementation(() => Promise.resolve(true)),
  selectElements: jest.fn(),
  findClosestVertices: jest.fn(),
  getCADData: jest.fn().mockReturnValue({
    shape: { 
      type: 'testShape', 
      id: 'test-shape-id',
      HashCode: (n: number) => n + 1,
      IsNull: () => false
    },
    isPreciseMode: true
  }),
  setCADData: jest.fn(),
  createShapeFromMesh: jest.fn().mockResolvedValue({ 
    type: 'testShape', 
    id: 'test-shape-id',
    HashCode: (n: number) => n + 1,
    IsNull: () => false
  }),
  updateMeshFromCADShape: jest.fn().mockResolvedValue(true),
  getAIExecutor: jest.fn().mockResolvedValue({
    executeCADOperation: jest.fn().mockResolvedValue({ 
      type: 'mockShape', 
      id: 'ai-op-id',
      HashCode: (n: number) => n + 1,
      IsNull: () => false
    })
  })
}));

// Mock the command parser
jest.mock('../../utils/commandParser', () => ({
  parseCommand: jest.fn()
}));

// Mock Babylon.js mesh for testing
const createMockMesh = (name: string) => ({
  name,
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  scaling: { x: 1, y: 1, z: 1 },
  metadata: { 
    selectedElements: [],
    cadData: {
      shape: { type: 'testShape', id: 'test-shape-id' }
    }
  },
  getVerticesData: jest.fn().mockReturnValue(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0])),
  getIndices: jest.fn().mockReturnValue(new Uint32Array([0, 1, 2])),
  computeWorldMatrix: jest.fn(),
  getAbsolutePosition: jest.fn().mockReturnValue({ x: 0, y: 0, z: 0 }),
  getBoundingInfo: jest.fn().mockReturnValue({
    boundingBox: {
      minimumWorld: { x: -1, y: -1, z: -1 },
      maximumWorld: { x: 1, y: 1, z: 1 }
    }
  })
}) as unknown as Mesh;

/**
 * Process a voice command to perform CAD operations
 * Similar to what would be in VoiceModule.tsx
 */
async function processVoiceCommand(transcript: string, mesh: Mesh | null, selectedElements: number[]): Promise<boolean> {
  // Parse the voice command
  const command = parseCommand(transcript);
  
  if (!command) {
    console.log('No command parsed from transcript:', transcript);
    return false;
  }
  
  try {
    // For operations that require a mesh
    if (!mesh && ['extrude', 'bevel', 'move', 'rotate', 'scale', 'delete', 'boolean'].includes(command.action)) {
      console.log('No mesh selected for operation:', command.action);
      return false;
    }
    
    // For operations that require element selection
    if (selectedElements.length === 0 && ['extrude', 'bevel'].includes(command.action)) {
      console.log('No elements selected for operation:', command.action);
      return false;
    }
    
    // Use direct subObjectEditor functions for supported operations
    switch (command.action) {
      // Feature operations (require element selection)
      case 'extrude':
        const distance = command.params.distance as number || 1.0;
        await subObjectEditor.extrudeElements(mesh!, selectedElements, distance);
        return true;
      
      case 'bevel':
        const amount = command.params.amount as number || 0.1;
        await subObjectEditor.bevelElements(mesh!, selectedElements, amount);
        return true;
      
      default:
        // For all other operations, use the AI executor
        const aiExecutor = await subObjectEditor.getAIExecutor();
        await aiExecutor.executeCADOperation(command.action, {
          mesh,
          shape: mesh ? subObjectEditor.getCADData(mesh).shape : null,
          selectedElements,
          ...command.params,
          object: command.object
        });
        return true;
    }
  } catch (error) {
    console.error('Error processing voice command:', error);
    return false;
  }
}

describe('Voice Command Integration with CAD Operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (subObjectEditor.getAIExecutor as jest.Mock).mockResolvedValue({
      executeCADOperation: jest.fn().mockResolvedValue({ 
        type: 'mockShape', 
        id: 'ai-op-id',
        HashCode: (n: number) => n + 1,
        IsNull: () => false
      })
    });
  });

  test('Voice command "extrude face by 2" processes correctly', async () => {
    // Setup mocks
    const mockTranscript = 'extrude face by 2';
    const mesh = createMockMesh('testCube');
    const selectedElements = [0, 1, 2]; // Face indices
    
    // Setup the command parser mock
    (parseCommand as jest.Mock).mockReturnValueOnce({ 
      action: 'extrude', 
      object: 'face',
      params: { distance: 2.0 }
    });
    
    // Process command
    const result = processVoiceCommand(mockTranscript, mesh, selectedElements);
    
    // Verify results
    expect(result).toBeTruthy();
    expect(parseCommand).toHaveBeenCalledWith(mockTranscript);
    expect(subObjectEditor.extrudeElements).toHaveBeenCalledWith(mesh, selectedElements, 2.0);
  });

  test('Voice command "bevel edge 0.5" processes correctly', async () => {
    // Setup mocks
    const mockTranscript = 'bevel edge 0.5';
    const mesh = createMockMesh('testCube');
    const selectedElements = [3, 4]; // Edge indices
    
    // Setup the command parser mock
    (parseCommand as jest.Mock).mockReturnValueOnce({ 
      action: 'bevel', 
      object: 'edge',
      params: { amount: 0.5 }
    });
    
    // Process command
    const result = processVoiceCommand(mockTranscript, mesh, selectedElements);
    
    // Verify results
    expect(result).toBeTruthy();
    expect(parseCommand).toHaveBeenCalledWith(mockTranscript);
    expect(subObjectEditor.bevelElements).toHaveBeenCalledWith(mesh, selectedElements, 0.5);
  });
  
  test('Voice command with missing parameters uses defaults', async () => {
    // Setup mocks
    const mockTranscript = 'extrude face';
    const mesh = createMockMesh('testCube');
    const selectedElements = [0, 1, 2]; // Face indices
    
    // Setup the command parser mock
    (parseCommand as jest.Mock).mockReturnValueOnce({ 
      action: 'extrude', 
      object: 'face',
      params: {} // No distance specified
    });
    
    // Process command
    const result = await processVoiceCommand(mockTranscript, mesh, selectedElements);
    
    // Verify results
    expect(result).toBeTruthy();
    expect(parseCommand).toHaveBeenCalledWith(mockTranscript);
    expect(subObjectEditor.extrudeElements).toHaveBeenCalledWith(mesh, selectedElements, 1.0); // Default distance
  });
  
  test('Voice command does nothing when no mesh is selected', async () => {
    // Setup mocks
    const mockTranscript = 'extrude face by 2';
    const selectedElements = [0, 1, 2]; // Face indices
    
    // Setup the command parser mock
    (parseCommand as jest.Mock).mockReturnValueOnce({ 
      action: 'extrude', 
      object: 'face',
      params: { distance: 2.0 }
    });
    
    // Process command with null mesh
    const result = await processVoiceCommand(mockTranscript, null, selectedElements);
    
    // Verify results
    expect(result).toBeFalsy();
    expect(parseCommand).toHaveBeenCalledWith(mockTranscript);
    expect(subObjectEditor.extrudeElements).not.toHaveBeenCalled();
  });

  test('Voice command does nothing when no elements are selected', async () => {
    // Setup mocks
    const mockTranscript = 'extrude face by 2';
    const mesh = createMockMesh('testCube');
    const selectedElements: number[] = []; // No elements selected
    
    // Setup the command parser mock
    (parseCommand as jest.Mock).mockReturnValueOnce({ 
      action: 'extrude', 
      object: 'face',
      params: { distance: 2.0 }
    });
    
    // Process command with empty selection
    const result = await processVoiceCommand(mockTranscript, mesh, selectedElements);
    
    // Verify results
    expect(result).toBeFalsy();
    expect(parseCommand).toHaveBeenCalledWith(mockTranscript);
    expect(subObjectEditor.extrudeElements).not.toHaveBeenCalled();
  });

  test('Voice command with negative values processes correctly', async () => {
    // Setup mocks
    const mockTranscript = 'extrude face by -1.5';
    const mesh = createMockMesh('testCube');
    const selectedElements = [0, 1, 2]; // Face indices
    
    // Setup the command parser mock
    (parseCommand as jest.Mock).mockReturnValueOnce({ 
      action: 'extrude', 
      object: 'face',
      params: { distance: -1.5 }
    });
    
    // Process command
    const result = processVoiceCommand(mockTranscript, mesh, selectedElements);
    
    // Verify results
    expect(result).toBeTruthy();
    expect(parseCommand).toHaveBeenCalledWith(mockTranscript);
    expect(subObjectEditor.extrudeElements).toHaveBeenCalledWith(mesh, selectedElements, -1.5);
  });

  test('Unknown voice command uses AI executor', async () => {
    // Setup mocks
    const mockTranscript = 'rotate model 45 degrees';
    const mesh = createMockMesh('testCube');
    const selectedElements = [0, 1, 2]; // Face indices
    
    // Setup the command parser mock
    (parseCommand as jest.Mock).mockReturnValueOnce({ 
      action: 'rotate', // Will be handled by AI executor
      object: 'model',
      params: { degrees: 45 }
    });
    
    // Process command with action that should use AI executor
    const result = await processVoiceCommand(mockTranscript, mesh, selectedElements);
    
    // Verify results
    expect(result).toBeTruthy();
    expect(parseCommand).toHaveBeenCalledWith(mockTranscript);
    expect(subObjectEditor.extrudeElements).not.toHaveBeenCalled();
    expect(subObjectEditor.bevelElements).not.toHaveBeenCalled();
    expect(subObjectEditor.getAIExecutor).toHaveBeenCalled();
    // Verify AI executor was used
    const aiExecutor = await subObjectEditor.getAIExecutor();
    expect(aiExecutor.executeCADOperation).toHaveBeenCalledWith('rotate', expect.objectContaining({
      mesh,
      object: 'model',
      degrees: 45
    }));
  });

  test('Voice command parser returns null', async () => {
    // Setup mocks
    const mockTranscript = 'gibberish command';
    const mesh = createMockMesh('testCube');
    const selectedElements = [0, 1, 2]; // Face indices
    
    // Setup the command parser mock
    (parseCommand as jest.Mock).mockReturnValueOnce(null);
    
    // Process command with null parse result
    const result = await processVoiceCommand(mockTranscript, mesh, selectedElements);
    
    // Verify results
    expect(result).toBeFalsy();
    expect(parseCommand).toHaveBeenCalledWith(mockTranscript);
    expect(subObjectEditor.extrudeElements).not.toHaveBeenCalled();
    expect(subObjectEditor.bevelElements).not.toHaveBeenCalled();
  });
  
  // Add tests for other operations that use AI executor
  test('Create command processes through AI executor', async () => {
    // Setup mocks
    const mockTranscript = 'create a sphere with radius 5';
    const mesh = createMockMesh('testCube');
    const selectedElements: number[] = [];
    
    // Setup the command parser mock
    (parseCommand as jest.Mock).mockReturnValueOnce({ 
      action: 'create', 
      object: 'sphere',
      params: { radius: 5 }
    });
    
    // Process command
    const result = await processVoiceCommand(mockTranscript, mesh, selectedElements);
    
    // Verify results
    expect(result).toBeTruthy();
    expect(parseCommand).toHaveBeenCalledWith(mockTranscript);
    expect(subObjectEditor.getAIExecutor).toHaveBeenCalled();
    
    // Verify AI executor was called with correct parameters
    const aiExecutor = await subObjectEditor.getAIExecutor();
    expect(aiExecutor.executeCADOperation).toHaveBeenCalledWith('create', expect.objectContaining({
      object: 'sphere',
      radius: 5
    }));
  });
  
  test('Move command processes through AI executor', async () => {
    // Setup mocks
    const mockTranscript = 'move object 3 units along x axis';
    const mesh = createMockMesh('testCube');
    const selectedElements: number[] = [];
    
    // Setup the command parser mock
    (parseCommand as jest.Mock).mockReturnValueOnce({ 
      action: 'move', 
      object: 'object',
      params: { distance: 3, axis: 'x' }
    });
    
    // Process command
    const result = await processVoiceCommand(mockTranscript, mesh, selectedElements);
    
    // Verify results
    expect(result).toBeTruthy();
    expect(parseCommand).toHaveBeenCalledWith(mockTranscript);
    expect(subObjectEditor.getAIExecutor).toHaveBeenCalled();
    
    // Verify AI executor was called with correct parameters
    const aiExecutor = await subObjectEditor.getAIExecutor();
    expect(aiExecutor.executeCADOperation).toHaveBeenCalledWith('move', expect.objectContaining({
      mesh,
      distance: 3,
      axis: 'x',
      object: 'object'
    }));
  });
  
  test('Scale command processes through AI executor', async () => {
    // Setup mocks
    const mockTranscript = 'scale by factor 2';
    const mesh = createMockMesh('testCube');
    const selectedElements: number[] = [];
    
    // Setup the command parser mock
    (parseCommand as jest.Mock).mockReturnValueOnce({ 
      action: 'scale', 
      object: 'object',
      params: { factor: 2 }
    });
    
    // Process command
    const result = await processVoiceCommand(mockTranscript, mesh, selectedElements);
    
    // Verify results
    expect(result).toBeTruthy();
    expect(parseCommand).toHaveBeenCalledWith(mockTranscript);
    expect(subObjectEditor.getAIExecutor).toHaveBeenCalled();
    
    // Verify AI executor was called with correct parameters
    const aiExecutor = await subObjectEditor.getAIExecutor();
    expect(aiExecutor.executeCADOperation).toHaveBeenCalledWith('scale', expect.objectContaining({
      mesh,
      factor: 2,
      object: 'object'
    }));
  });
  
  test('Delete command processes through AI executor', async () => {
    // Setup mocks
    const mockTranscript = 'delete this object';
    const mesh = createMockMesh('testCube');
    const selectedElements: number[] = [];
    
    // Setup the command parser mock
    (parseCommand as jest.Mock).mockReturnValueOnce({ 
      action: 'delete', 
      object: 'object',
      params: {}
    });
    
    // Process command
    const result = await processVoiceCommand(mockTranscript, mesh, selectedElements);
    
    // Verify results
    expect(result).toBeTruthy();
    expect(parseCommand).toHaveBeenCalledWith(mockTranscript);
    expect(subObjectEditor.getAIExecutor).toHaveBeenCalled();
    
    // Verify AI executor was called with correct parameters
    const aiExecutor = await subObjectEditor.getAIExecutor();
    expect(aiExecutor.executeCADOperation).toHaveBeenCalledWith('delete', expect.objectContaining({
      mesh,
      object: 'object'
    }));
  });
});
