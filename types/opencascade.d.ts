/**
 * Type declarations for opencascade.js WebAssembly module
 */
declare module 'opencascade.js' {
  // Basic initialization function for WebAssembly module
  export interface EmscriptenModule {
    initialize(): Promise<void>;
    TopoDS_Shape: new () => TopoDS_Shape;
    gp_Pnt: new (x: number, y: number, z: number) => any;
    gp_Dir: new (x: number, y: number, z: number) => any;
    gp_Vec: new (x: number, y: number, z: number) => any;
    gp_Ax2: new (origin: any, direction: any) => any;
    BRepPrimAPI_MakeBox: new (x1: number, y1: number, z1: number, x2: number, y2: number, z2: number) => {
      Shape(): TopoDS_Shape;
    };
    BRepPrimAPI_MakeSphere: new (x: number, y: number, z: number, radius: number) => {
      Shape(): TopoDS_Shape;
    };
    BRepPrimAPI_MakeCylinder: new (radius: number, height: number) => {
      Shape(): TopoDS_Shape;
    };
    BRepPrimAPI_MakeCylinder: new (axes: gp_Ax2, radius: number, height: number) => {
      Shape(): TopoDS_Shape;
    };
    BRepMesh_IncrementalMesh: new (shape: TopoDS_Shape, linearDeflection: number) => any;
    StlAPI_Writer: new () => {
      Write(shape: TopoDS_Shape, filename: string): boolean;
    };
    tessellate(shape: TopoDS_Shape): {
      vertices: Float32Array;
      indices: Uint32Array;
      normals?: Float32Array;
    };
    // Add other OpenCascade types as needed
  }
  
  // The initOCC function that accepts a WebAssembly binary
  function initOCC(options?: {
    wasmBinary?: ArrayBuffer;
    locateFile?: (path: string) => string;
  }): Promise<EmscriptenModule>;
  
  export default initOCC;
  export type OCCModule = EmscriptenModule;
  
  // Core shape types
  export class TopoDS_Shape {
    HashCode(n: number): number;
    IsNull(): boolean;
  }
  export class gp_Pnt {
    constructor(x: number, y: number, z: number);
  }
  export class gp_Dir {
    constructor(x: number, y: number, z: number);
  }
  export class gp_Vec {
    constructor(x: number, y: number, z: number);
  }
  export class gp_Ax2 {
    constructor(origin: gp_Pnt, direction: gp_Dir);
  }
  
  // Shape creation classes
  export class BRepPrimAPI_MakeBox {
    constructor(width: number, height: number, depth: number);
    constructor(point: gp_Pnt, width: number, height: number, depth: number);
    Shape(): TopoDS_Shape;
  }
  
  export class BRepPrimAPI_MakeSphere {
    constructor(radius: number);
    constructor(center: gp_Pnt, radius: number);
    Shape(): TopoDS_Shape;
  }
  
  export class BRepPrimAPI_MakeCylinder {
    constructor(radius: number, height: number);
    constructor(axes: gp_Ax2, radius: number, height: number);
    Shape(): TopoDS_Shape;
  }
  
  // Mesh conversion utilities
  export class BRepMesh_IncrementalMesh {
    constructor(shape: TopoDS_Shape, linearDeflection: number);
  }
  
  export class StlAPI_Writer {
    constructor();
    Write(shape: TopoDS_Shape, filename: string): boolean;
  }
  
  // Tessellation utilities
  export function tessellate(shape: TopoDS_Shape): {
    vertices: Float32Array;
    indices: Uint32Array;
    normals?: Float32Array;
  };
}
