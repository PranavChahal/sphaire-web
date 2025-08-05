import { useState, useEffect } from 'react';

import * as occMock from '../lib/opencascadeMock';

/**
 * Interface for shape results from the hook
 */
export interface OCCShape {
  HashCode: (n: number) => number;
  IsNull: () => boolean;
}

type InitOCCFn = (options?: {
  wasmBinary?: ArrayBuffer;
  locateFile?: (path: string) => string;
}) => Promise<OCCModule>;

export interface OCCModule {
  // Core methods
  initialize?: () => Promise<void>;
  
  TopoDS_Shape: new () => OCCShape;
  tessellate: (shape: OCCShape) => {
    vertices: Float32Array;
    indices: Uint32Array;
    normals?: Float32Array;
  };
  
  gp_Pnt: new (x: number, y: number, z: number) => any;
  gp_Dir: new (x: number, y: number, z: number) => any;
  gp_Vec?: new (x: number, y: number, z: number) => any;
  gp_Ax2: new (origin: any, direction: any) => any;
  
  BRepPrimAPI_MakeBox: new (...args: any[]) => {
    Shape: () => OCCShape;
  };
  BRepPrimAPI_MakeSphere: new (...args: any[]) => {
    Shape: () => OCCShape;
  };
}

interface OCCResult {
  ready: boolean;
  createBox: (width: number, height: number, depth: number) => OCCShape | null;
  createSphere: (radius: number) => OCCShape | null;
  tessellate: (shape: OCCShape) => { positions: Float32Array; indices: Uint32Array } | null;
}

export const useOCC = (): OCCResult => {
  const [occ, setOCC] = useState<OCCModule | null>(null);
  const [ready, setReady] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    const loadOCC = async () => {
      if (typeof window === 'undefined') {
        console.log('Skipping OCC load on server side');
        return;
      }

      try {
        console.log('Fetching OpenCascade WebAssembly from public directory...');
        const wasmResponse = await fetch('/wasm/opencascade.wasm');
        
        if (!wasmResponse.ok) {
          throw new Error(`Failed to fetch WebAssembly: ${wasmResponse.status} ${wasmResponse.statusText}`);
        }
        
        const wasmBinary = await wasmResponse.arrayBuffer();
        console.log('WebAssembly binary fetched successfully:', Math.round(wasmBinary.byteLength / 1024), 'KB');
        
        console.log('Importing OpenCascade.js module...');
        const openCascadeModule = await import('opencascade.js');
        
        const initOCC = openCascadeModule.default as InitOCCFn;
        
        // 3. Initialize the module with our fetched WebAssembly binary
        console.log('Initializing OpenCascade.js with WebAssembly binary...');
        const occInstance = await initOCC({ 
          wasmBinary,
          // Optionally provide a locateFile function to tell OpenCascade where to find additional files
          locateFile: (filename) => `/wasm/${filename}`
        });
        
        // Update state if component is still mounted
        if (isMounted) {
          setOCC(occInstance);
          setReady(true);
          console.log('OpenCascade.js initialized successfully');
        }
      } catch (error) {
        console.error('Failed to load or initialize OpenCascade.js:', error);
        
        // Fallback to mock implementation
        console.log('Falling back to mock implementation');
        if (isMounted) {
          // @ts-ignore - Types aren't perfectly compatible, but the mock works for our use case
          setOCC(occMock);
          setReady(true);
        }
      }
    };

    loadOCC();

    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, []);

  /**
   * Creates a box with the specified dimensions
   * @param width Width of the box in mm
   * @param height Height of the box in mm
   * @param depth Depth of the box in mm
   * @returns OCCShape or null if OCC isn't ready
   */
  const createBox = (width: number, height: number, depth: number): OCCShape | null => {
    if (!ready || !occ) return null;
    
    try {
      // Create a box centered at origin
      const box = new occ.BRepPrimAPI_MakeBox(
        -width/2, -height/2, -depth/2,  // starting point 
        width/2, height/2, depth/2      // ending point
      );
      return box.Shape();
    } catch (error) {
      console.error('Failed to create box:', error);
      return null;
    }
  };

  /**
   * Creates a sphere with the specified radius
   * @param radius Radius of the sphere in mm
   * @returns OCCShape or null if OCC isn't ready
   */
  const createSphere = (radius: number): OCCShape | null => {
    if (!ready || !occ) return null;
    
    try {
      // Create a sphere centered at origin
      const sphere = new occ.BRepPrimAPI_MakeSphere(
        0, 0, 0,  // center point
        radius     // radius
      );
      return sphere.Shape();
    } catch (error) {
      console.error('Failed to create sphere:', error);
      return null;
    }
  };

  /**
   * Tessellates an OCC shape into triangles for rendering
   * @param shape The OCCShape to tessellate
   * @returns Object containing positions and indices arrays for rendering, or null if fails
   */
  const tessellate = (shape: OCCShape): { positions: Float32Array; indices: Uint32Array } | null => {
    if (!ready || !occ || !shape) return null;

    try {
      // Use the direct tessellate function from OCC
      // This will already be optimized for the WebAssembly module
      const result = occ.tessellate(shape);
      
      return {
        positions: result.vertices,
        indices: result.indices
      };
    } catch (error) {
      console.error('Failed to tessellate shape:', error);
      return null;
    }
  };
  
  // Return the public API
  return {
    ready,
    createBox,
    createSphere,
    tessellate
  };
}

export default useOCC;
