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
async function executeOpenCascadeCode(code: string, _context: ExecutionContext): Promise<ExecutionResult> {
  try {
    // Use the real singleton executor (runs on the WASM kernel with the static safety
    // screen). The previous implementation called the `useOCC` React hook outside a
    // component, which always threw — this path was effectively dead.
    const { occMainThreadExecutor } = await import('./occMainThreadExecutor');
    const { extractParametersFromCode } = await import('../utils/parameterExtractor');

    const meshData = await occMainThreadExecutor.executeCode(code);
    const meshArray = Array.isArray(meshData) ? meshData : [meshData];
    const { parameters, parameterMetadata } = extractParametersFromCode(code);

    const store = useStore.getState() as any;
    let firstId = '';

    meshArray.forEach((data: any, i: number) => {
      if (data && data.positions && data.indices) {
        const id = store.addParametricShape({
          type: 'parametric',
          shapeType: 'custom',
          parameters,
          constructionCode: code,
          version: 1,
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          scaling: { x: 1, y: 1, z: 1 },
          occShape: null,
          name: data.name || `ai_occ_${i}_${Date.now()}`,
          meshData: {
            positions: new Float32Array(data.positions),
            indices: new Uint32Array(data.indices),
          },
          metadata: parameterMetadata,
        });
        if (!firstId) firstId = id;
      }
    });

    if (!firstId) {
      throw new Error('OpenCascade code produced no valid shapes');
    }

    return { shapeId: firstId, success: true };
  } catch (error) {
    return {
      shapeId: '',
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error in OpenCascade code execution'
    };
  }
}

/**
 * Exported default object for named imports
 */
const aiExecutor = {
  executeModelCode,
};

export default aiExecutor;
