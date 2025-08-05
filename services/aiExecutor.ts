import useStore from '../store/store';
import { Shape } from '../store/store';

interface ExecutionContext {
  scene: any;
  store: any;
  mesh?: any;
}

interface ExecutionResult {
  shapeId: string;
  success: boolean;
  message?: string;
}

export const executeModelCode = async (
  code: string, 
  backend: 'OpenCascade' | 'Babylon',
  context?: Partial<ExecutionContext>
): Promise<string> => {
  try {
    if (!code || typeof code !== 'string') {
      throw new Error('Invalid code: must be a non-empty string');
    }

    const store = useStore.getState() as any;
    
    const scene = context?.scene || (window as any).BABYLON_SCENE || {}; 
    
    const executionContext: ExecutionContext = {
      scene,
      store,
      ...context
    };

    let result: ExecutionResult;

    if (backend === 'Babylon') {
      result = await executeBabylonCode(code, executionContext);
    } else if (backend === 'OpenCascade') {
      result = await executeOpenCascadeCode(code, executionContext);
    } else {
      throw new Error(`Unsupported backend: ${backend}`);
    }

    if (!result.success) {
      throw new Error(result.message || 'Code execution failed');
    }

    return result.shapeId;
  } catch (error) {
    if (error instanceof Error) {
      console.error(`AI Code Execution failed: ${error.message}`, error);
      throw new Error(`AI Code Execution failed: ${error.message}`);
    }
    console.error('AI Code Execution failed with an unknown error');
    throw new Error('AI Code Execution failed with an unknown error');
  }
};

async function executeBabylonCode(code: string, context: ExecutionContext): Promise<ExecutionResult> {
  try {
    const { scene, store } = context;
    
    let babylonGlobals: any = {};
    if (typeof window !== 'undefined' && (window as any).BABYLON) {
      const babylonObj = (window as any).BABYLON;
      babylonGlobals = {
        BABYLON: babylonObj,
        Vector3: babylonObj.Vector3,
        Color3: babylonObj.Color3,
        MeshBuilder: babylonObj.MeshBuilder,
        StandardMaterial: babylonObj.StandardMaterial,
      };
    }
    
    const sandbox = {
      scene,
      ...babylonGlobals,
      console: {
        log: console.log,
        error: console.error,
        warn: console.warn
      },
      // Functions to interact with the store
      addShape: (shapeData: Partial<Shape>) => store.addShape(shapeData),
      getShapes: () => store.shapes,
      getSelectedShape: () => {
        const selectedId = store.selectedShapeId;
        return selectedId ? store.shapes.find((s: any) => s.id === selectedId) : null;
      },
      // Result object that will be returned by the executed code
      result: {
        shapeId: '',
        success: false,
        message: ''
      }
    };
    
    // Create a function from the code string that will execute in our sandbox
    const executeFunction = new Function(
      ...Object.keys(sandbox),
      `
        "use strict";
        try {
          ${code}
          return result;
        } catch (error) {
          console.error("Error executing Babylon code:", error);
          result.success = false;
          result.message = error.message || "Unknown error";
          return result;
        }
      `
    );
    
    // Execute the function with the sandbox context
    const result = executeFunction(...Object.values(sandbox));
    
    return result as ExecutionResult;
  } catch (error) {
    return {
      shapeId: '',
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error in Babylon code execution'
    };
  }
}

/**
 * Execute OpenCascade.js code in a sandboxed environment
 */
async function executeOpenCascadeCode(code: string, context: ExecutionContext): Promise<ExecutionResult> {
  try {
    const { store } = context;
    
    // Dynamically import OpenCascade - this should be your existing OCC hook/service
    const occModule = await import('../hooks/useOCC');
    const useOCC = occModule.default;
    const occ = useOCC();
    
    if (!occ.ready) {
      throw new Error('OpenCascade.js is not ready or available');
    }
    
    // Create a safe execution context with limited access
    const sandbox = {
      occ,
      BRepPrimAPI_MakeBox: (occ as any).BRepPrimAPI_MakeBox,
      BRepPrimAPI_MakeCylinder: (occ as any).BRepPrimAPI_MakeCylinder,
      BRepPrimAPI_MakeSphere: (occ as any).BRepPrimAPI_MakeSphere,
      gp_Pnt: (occ as any).gp_Pnt,
      gp_Dir: (occ as any).gp_Dir,
      gp_Vec: (occ as any).gp_Vec,
      console: {
        log: console.log,
        error: console.error,
        warn: console.warn
      },
      // Functions to interact with the store
      addShape: (shapeData: Partial<Shape>) => store.addShape(shapeData),
      getShapes: () => store.shapes,
      getSelectedShape: () => {
        const selectedId = store.selectedShapeId;
        return selectedId ? store.shapes.find((s: any) => s.id === selectedId) : null;
      },
      // Result object
      result: {
        shapeId: '',
        success: false,
        message: ''
      }
    };
    
    // Create a function from the code string
    const executeFunction = new Function(
      ...Object.keys(sandbox),
      `
        "use strict";
        try {
          ${code}
          return result;
        } catch (error) {
          console.error("Error executing OpenCascade code:", error);
          result.success = false;
          result.message = error.message || "Unknown error";
          return result;
        }
      `
    );
    
    // Execute the function with the sandbox context
    const result = executeFunction(...Object.values(sandbox));
    
    return result as ExecutionResult;
  } catch (error) {
    return {
      shapeId: '',
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error in OpenCascade code execution'
    };
  }
}

/**
 * Execute a boolean operation or other complex CAD operation on mesh elements
 * 
 * @param operation - Operation type (union, subtract, intersect, etc.)
 * @param meshId - Target mesh ID
 * @param elementIds - Array of element indices to operate on
 * @param params - Additional operation parameters
 */
export const executeOperation = async (
  operation: string,
  meshId: string,
  elementIds: number[],
  _params: Record<string, any> = {}
): Promise<string> => {
  try {
    // Get the store state
    const store = useStore.getState();
    
    // Find the target mesh
    const targetShape = (store as any).shapes.find((s: any) => s.id === meshId);
    if (!targetShape) {
      throw new Error(`Mesh with ID ${meshId} not found`);
    }
    
    // This would connect to your subObjectEditor implementation
    // For now, we'll just return a mock result
    console.log(`Executing ${operation} on ${meshId} elements: ${elementIds}`);
    
    // In a real implementation, this would call the appropriate subObjectEditor methods
    
    return meshId; // Return the ID of the modified shape
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Operation execution failed: ${error.message}`);
    }
    throw new Error('Operation execution failed with an unknown error');
  }
};

/**
 * Exported default object for named imports
 */
const aiExecutor = {
  executeModelCode,
  executeOperation
};

export default aiExecutor;
