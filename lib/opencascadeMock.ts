export const initialize = async (): Promise<void> => {
  console.log('OpenCascade mock initialized');
  return Promise.resolve();
};

export class TopoDS_Shape {
  // Implement OCCShape interface
  HashCode(_n: number): number { return 0; }
  IsNull(): boolean { return false; }
}

export class gp_Pnt {
  constructor(_x: number, _y: number, _z: number) {}
}

export class gp_Dir {
  constructor(_x: number, _y: number, _z: number) {}
}

export class gp_Vec {
  constructor(_x: number, _y: number, _z: number) {}
}

export class gp_Ax2 {
  constructor(_origin: gp_Pnt, _direction: gp_Dir) {}
}

export class BRepPrimAPI_MakeBox {
  constructor(x1: number, y1: number, z1: number, x2?: number, y2?: number, z2?: number);
  constructor(..._args: number[]) {}
  
  Shape(): TopoDS_Shape {
    return new TopoDS_Shape();
  }
}

export class BRepPrimAPI_MakeSphere {
  constructor(_radius: number) {}
  
  Shape(): TopoDS_Shape {
    return new TopoDS_Shape();
  }
}

export const tessellate = (_shape: TopoDS_Shape) => {
  return {
    vertices: new Float32Array(),
    indices: new Uint32Array(),
  };
};

export class BRepMesh_IncrementalMesh {
  constructor(_shape: any, _linearDeflection: number, _angular: boolean = false) {}
  
  Mesh(): void {}
}

export class TopExp_Explorer {
  constructor(_shape: any, _typeOfElement: any, _typeOfBoundary: any = null) {}
  
  More(): boolean { return false; }
  Next(): void {}
  Current(): any { return {}; }
}

export const TopAbs_FACE = {};
export const TopAbs_WIRE = {};
export class TopLoc_Location {
  constructor() {}
}
export const TopoDS_Face = {};
export const BRep_Tool = {
  Triangulation: () => ({})
};
export const StdFail_NotDone = {};

export default {
  initialize,
  TopoDS_Shape,
  gp_Pnt,
  gp_Dir,
  gp_Vec,
  gp_Ax2,
  BRepPrimAPI_MakeBox,
  BRepPrimAPI_MakeSphere,
  BRepMesh_IncrementalMesh,
  TopExp_Explorer,
  TopAbs_FACE,
  TopAbs_WIRE,
  TopLoc_Location,
  TopoDS_Face,
  BRep_Tool,
  StdFail_NotDone,
  tessellate,
};
