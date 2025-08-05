

import initOpenCascade from 'opencascade.js';
type OpenCascadeInstance = any;

declare const self: Worker & { postMessage: any; };


const DEBUG = false;
function log(...args: any[]) { if (DEBUG) console.log('[OCCT-WORKER]', ...args); }


let oc: OpenCascadeInstance;
let occ: Record<string, any>;

let initPromise: Promise<void> | null = null;


type ExecRequest = { id: string; code: string };
const queue: ExecRequest[] = [];
let processing = false;


function calculateFaceNormal(surface: any, face: any, oc: OpenCascadeInstance) {
  try {
    const uMin = surface.FirstUParameter();
    const uMax = surface.LastUParameter(); 
    const vMin = surface.FirstVParameter();
    const vMax = surface.LastVParameter();
    
    const uMid = (uMin + uMax) / 2;
    const vMid = (vMin + vMax) / 2;
    
    const props = new oc.GeomLProp_SLProps_2(surface, uMid, vMid, 1, 1e-6);
    
    if (props.IsNormalDefined()) {
      const normal = props.Normal();
     
      if (face.Orientation_1() === oc.TopAbs_Orientation.TopAbs_REVERSED) {
        return new oc.gp_Dir_4(-normal.X(), -normal.Y(), -normal.Z());
      }
      return new oc.gp_Dir_4(normal.X(), normal.Y(), normal.Z());
    }
  } catch (e) {
    
    return new oc.gp_Dir_4(0, 0, 1);
  }
  

  return new oc.gp_Dir_4(0, 0, 1);
}

function createFallbackBox() {
  const vertices = new Float32Array([
    
    -1, -1,  1,   1, -1,  1,   1,  1,  1,  -1,  1,  1, 
    -1, -1, -1,  -1,  1, -1,   1,  1, -1,   1, -1, -1,
  
    -1,  1, -1,  -1,  1,  1,   1,  1,  1,   1,  1, -1,
    
    -1, -1, -1,   1, -1, -1,   1, -1,  1,  -1, -1,  1,
    
     1, -1, -1,   1,  1, -1,   1,  1,  1,   1, -1,  1,
 
    -1, -1, -1,  -1, -1,  1,  -1,  1,  1,  -1,  1, -1
  ]);
  
  const normals = new Float32Array([
    
     0,  0,  1,   0,  0,  1,   0,  0,  1,   0,  0,  1,
    
     0,  0, -1,   0,  0, -1,   0,  0, -1,   0,  0, -1,
     
     0,  1,  0,   0,  1,  0,   0,  1,  0,   0,  1,  0,
    
     0, -1,  0,   0, -1,  0,   0, -1,  0,   0, -1,  0,
    
     1,  0,  0,   1,  0,  0,   1,  0,  0,   1,  0,  0,
   
    -1,  0,  0,  -1,  0,  0,  -1,  0,  0,  -1,  0,  0
  ]);
  
  const indices = new Uint32Array([
     0,  1,  2,   0,  2,  3,    ]
     4,  5,  6,   4,  6,  7,   
     8,  9, 10,   8, 10, 11,   
    12, 13, 14,  12, 14, 15,    
    16, 17, 18,  16, 18, 19,    
    20, 21, 22,  20, 22, 23     
  ]);
  
  return { vertices, normals, indices };
}


function createOccWrapper(oc: OpenCascadeInstance) {
  return {
    
    createBox: (width: number, depth: number, height: number, center = false) => {
      const origin = center
        ? new oc.gp_Pnt_3(-width/2, -depth/2, -height/2)
        : new oc.gp_Pnt_1();
      const boxMaker = new oc.BRepPrimAPI_MakeBox_2(origin, width, depth, height);
      return boxMaker.Shape();
    },
    createSphere: (radius: number, center = true) => {
      const cen = center ? new oc.gp_Pnt_1() : new oc.gp_Pnt_3(0, 0, 0);
      const sphMaker = new oc.BRepPrimAPI_MakeSphere_5(cen, radius);
      return sphMaker.Shape();
    },
    createCylinder: (radius: number, height: number, center = false) => {
      const base = center
        ? new oc.gp_Pnt_3(0, 0, -height/2)
        : new oc.gp_Pnt_1();
      const dir = new oc.gp_Dir_4(0, 0, 1);
      const ax2 = new oc.gp_Ax2_3(base, dir);
      const cylMaker = new oc.BRepPrimAPI_MakeCylinder_3(ax2, radius, height);
      return cylMaker.Shape();
    },
    createCone: (r1: number, r2: number, height: number) => {
      const origin = new oc.gp_Pnt_1();
      const dir = new oc.gp_Dir_4(0, 0, 1);
      const ax2 = new oc.gp_Ax2_3(origin, dir);
      const coneMaker = new oc.BRepPrimAPI_MakeCone_4(ax2, r1, r2, height);
      return coneMaker.Shape();
    },
    createTorus: (rMajor: number, rMinor: number) => {
      const origin = new oc.gp_Pnt_1();
      const dir = new oc.gp_Dir_4(0, 0, 1);
      const ax2 = new oc.gp_Ax2_3(origin, dir);
      const torusMaker = new oc.BRepPrimAPI_MakeTorus_3(ax2, rMajor, rMinor);
      return torusMaker.Shape();
    },
    
    createCircle: (r: number, center = [0,0,0], normal = [0,0,1]) => {
      const cen = new oc.gp_Pnt_3(center[0], center[1], center[2]);
      const dir = new oc.gp_Dir_4(normal[0], normal[1], normal[2]);
      const ax2 = new oc.gp_Ax2_3(cen, dir);
      const circ = new oc.gp_Circ_2(ax2, r);
      const edge = new oc.BRepBuilderAPI_MakeEdge_8(circ).Edge();
      return new oc.BRepBuilderAPI_MakeWire_2(edge).Wire();
    },
    createLine: (p1: number[], p2: number[]) => {
      const a = new oc.gp_Pnt_3(p1[0], p1[1], p1[2]||0);
      const b = new oc.gp_Pnt_3(p2[0], p2[1], p2[2]||0);
      const edge = new oc.BRepBuilderAPI_MakeEdge_3(a, b).Edge();
      
      return new oc.BRepBuilderAPI_MakeWire_2(edge).Wire();
    },
    createArc: (center: number[], r: number, start: number, end: number) => {
      const cen = new oc.gp_Pnt_3(center[0], center[1], center[2]||0);
      const dir = new oc.gp_Dir_4(0,0,1);
      const ax2 = new oc.gp_Ax2_3(cen, dir);
      const circ = new oc.gp_Circ_2(ax2, r);
      const edge = new oc.BRepBuilderAPI_MakeEdge_13(circ, start * Math.PI/180, end * Math.PI/180).Edge();
      return edge;
    },
    createPolygon: (points: number[][]) => {
      if (points.length < 3) throw new Error('Polygon needs at least 3 points');
      const wb = new oc.BRepBuilderAPI_MakeWire_1();
      for (let i = 0; i < points.length; i++) {
        const p1 = points[i];
        const p2 = points[(i + 1) % points.length];
        const pt1 = new oc.gp_Pnt_3(p1[0], p1[1], p1[2] || 0);
        const pt2 = new oc.gp_Pnt_3(p2[0], p2[1], p2[2] || 0);
        const edge = new oc.BRepBuilderAPI_MakeEdge_3(pt1, pt2).Edge();
        wb.Add_1(edge);
      }
      return wb.Wire();
    },
    createHexagon: (radius: number, center = [0,0,0]) => {
      const points: number[][] = [];
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3;
        points.push([
          center[0] + radius * Math.cos(angle),
          center[1] + radius * Math.sin(angle),
          center[2] || 0
        ]);
      }
      return occ.createPolygon(points);
    },
    createRectangle: (width: number, height: number, center = [0,0,0]) => {
      const [cx, cy, cz] = center;
      const hw = width / 2, hh = height / 2;
      const points = [
        [cx - hw, cy - hh, cz || 0],
        [cx + hw, cy - hh, cz || 0], 
        [cx + hw, cy + hh, cz || 0],
        [cx - hw, cy + hh, cz || 0]
      ];
      return occ.createPolygon(points);
    },
    createEllipse: (rMajor: number, rMinor: number, center = [0,0,0], normal = [0,0,1]) => {
      const cen = new oc.gp_Pnt_3(center[0], center[1], center[2]);
      const dir = new oc.gp_Dir_4(normal[0], normal[1], normal[2]);
      const ax2 = new oc.gp_Ax2_3(cen, dir);
      const ellipse = new oc.gp_Elips_2(ax2, rMajor, rMinor);
      const edge = new oc.BRepBuilderAPI_MakeEdge_9(ellipse).Edge();
      return new oc.BRepBuilderAPI_MakeWire_2(edge).Wire();
    },
    createSpline: (points: number[][], closed = false) => {
      if (points.length < 2) throw new Error('Spline needs at least 2 points');
      try {
        const ptArray = new oc.TColgp_Array1OfPnt_2(1, points.length);
        points.forEach((p, i) => {
          ptArray.SetValue(i + 1, new oc.gp_Pnt_3(p[0], p[1], p[2] || 0));
        });
        
       
        const splineApi = new oc.GeomAPI_PointsToBSpline_1(ptArray);
        const bsplineCurve = splineApi.Curve();
        
        
        const edge = new oc.BRepBuilderAPI_MakeEdge_25(bsplineCurve).Edge();
        return new oc.BRepBuilderAPI_MakeWire_2(edge).Wire();
      } catch (error) {
        log('Spline creation failed, creating approximation with line segments:', error);
        
        const wb = new oc.BRepBuilderAPI_MakeWire_1();
        for (let i = 0; i < points.length - 1; i++) {
          const p1 = points[i];
          const p2 = points[i + 1];
          const pt1 = new oc.gp_Pnt_3(p1[0], p1[1], p1[2] || 0);
          const pt2 = new oc.gp_Pnt_3(p2[0], p2[1], p2[2] || 0);
          const edge = new oc.BRepBuilderAPI_MakeEdge_3(pt1, pt2).Edge();
          wb.Add_1(edge);
        }
        if (closed && points.length > 2) {
          const p1 = points[points.length - 1];
          const p2 = points[0];
          const pt1 = new oc.gp_Pnt_3(p1[0], p1[1], p1[2] || 0);
          const pt2 = new oc.gp_Pnt_3(p2[0], p2[1], p2[2] || 0);
          const edge = new oc.BRepBuilderAPI_MakeEdge_3(pt1, pt2).Edge();
          wb.Add_1(edge);
        }
        return wb.Wire();
      }
    },
    createHelix: (radius: number, pitch: number, height: number, center = [0,0,0]) => {
      try {
        log(`🔧 Creating helix via cylinder + pcurve method: radius=${radius}, pitch=${pitch}, height=${height}`);
        
     
        
        const turns = height / pitch;
        const totalAngle = turns * 2 * Math.PI;
         
      
        const centerPnt = new oc.gp_Pnt_3(center[0], center[1], center[2]);
        const zAxis = new oc.gp_Dir_4(0, 0, 1);
        const cylinderAxis = new oc.gp_Ax2_3(centerPnt, zAxis);
        const cylinderSurface = new oc.Geom_CylindricalSurface_2(cylinderAxis, radius);
        
  
        const startPoint2D = new oc.gp_Pnt2d_2(0, 0);
        const endPoint2D = new oc.gp_Pnt2d_2(totalAngle, height);
        const line2D = new oc.GC_MakeSegment_1(startPoint2D, endPoint2D).Value();
        
        log(`📐 2D parametric line: U(0 → ${totalAngle.toFixed(2)}), V(0 → ${height})`);
        
        
        const helicalEdge = new oc.BRepBuilderAPI_MakeEdge_15(
          line2D,          
          cylinderSurface,  
          0,                
          Math.sqrt(totalAngle * totalAngle + height * height) 
        ).Edge();
        
        
        const helixWire = new oc.BRepBuilderAPI_MakeWire_2(helicalEdge).Wire();
        
        log('✅ Expert helix created successfully via cylinder + pcurve method!');
        log('🎯 No Handle_Geom_BSplineCurve binding issues - using native OCC geometry');
        
        return helixWire;
        
      } catch (primaryError) {
        log('⚠️ Primary cylinder + pcurve method failed:', primaryError);
        
    
        try {
          log('🔄 Attempting discrete helix approximation...');
          
          const turns = height / pitch;
          const segmentsPerTurn = 32;
          const totalSegments = Math.max(8, Math.ceil(turns * segmentsPerTurn));
          
          const wb = new oc.BRepBuilderAPI_MakeWire_1();
          
          for (let i = 0; i < totalSegments; i++) {
            const t1 = i / totalSegments;
            const t2 = (i + 1) / totalSegments;
            
            const angle1 = t1 * turns * 2 * Math.PI;
            const angle2 = t2 * turns * 2 * Math.PI;
            const z1 = t1 * height;
            const z2 = t2 * height;
            
            const p1 = new oc.gp_Pnt_3(
              center[0] + radius * Math.cos(angle1),
              center[1] + radius * Math.sin(angle1),
              center[2] + z1
            );
            const p2 = new oc.gp_Pnt_3(
              center[0] + radius * Math.cos(angle2),
              center[1] + radius * Math.sin(angle2),
              center[2] + z2
            );
            
            const edge = new oc.BRepBuilderAPI_MakeEdge_3(p1, p2).Edge();
            wb.Add_1(edge);
          }
          
          log(' Discrete helix approximation created successfully');
          return wb.Wire();
          
        } catch (fallbackError) {
          log(' Discrete helix fallback also failed:', fallbackError);
          
          
          const startPnt = new oc.gp_Pnt_3(center[0], center[1], center[2]);
          const endPnt = new oc.gp_Pnt_3(center[0], center[1], center[2] + height);
          const verticalEdge = new oc.BRepBuilderAPI_MakeEdge_3(startPnt, endPnt).Edge();
          const verticalWire = new oc.BRepBuilderAPI_MakeWire_2(verticalEdge).Wire();
          
          log(' Using simple vertical line as ultimate fallback');
          return verticalWire;
        }
      }
    },
    createWire: (edges: any[]) => {
      const wb = new oc.BRepBuilderAPI_MakeWire_1();
      edges.forEach(e => wb.Add_1(e));
      return wb.Wire();
    },
    createFaceFromWire: (wire: any) => {
      return new oc.BRepBuilderAPI_MakeFace_2(wire).Shape();
    },
   
    extrude: (shape: any, params: number[]|{dx:number,dy:number,dz:number}|{height:number,pitch?:number,radius?:number}) => {
      try {
        
        if (Array.isArray(params)) {
          
          const [dx, dy, dz] = params;
          const vec = new oc.gp_Vec_4(dx, dy, dz);
          return new oc.BRepPrimAPI_MakePrism_1(shape, vec, false, true).Shape();
        } else if (typeof params === 'object') {
          
          if ('height' in params && ('pitch' in params || 'radius' in params)) {
            
            const height = params.height;
            const pitch = params.pitch || 0.2; 
            const radius = params.radius || 1.0; 
            
            log(`Creating helical extrusion: height=${height}, pitch=${pitch}, radius=${radius}`);
            
    
            const helixPath = occ.createHelix(radius, pitch, height);
            
         
            return occ.sweep(shape, helixPath);
          } else if ('dx' in params && 'dy' in params && 'dz' in params) {
          
            const { dx, dy, dz } = params;
            const vec = new oc.gp_Vec_4(dx, dy, dz);
            return new oc.BRepPrimAPI_MakePrism_1(shape, vec, false, true).Shape();
          } else {
            throw new Error('Invalid extrude parameters: expected {dx,dy,dz} or {height,pitch?,radius?}');
          }
        } else {
          throw new Error('Invalid extrude parameters: expected array or object');
        }
      } catch (error) {
        log('Extrude operation failed:', error);
    
        const vec = new oc.gp_Vec_4(0, 0, 1); 
        return new oc.BRepPrimAPI_MakePrism_1(shape, vec, false, true).Shape();
      }
    },
    revolve: (shape: any, ...args: any[]) => {
      try {
        let ax1;
        
        if (args.length === 3) {
          
          const [point, direction, angle] = args;
          log(`Revolve with AI signature: point=[${point}], direction=[${direction}], angle=${angle}`);
          
          const pnt = Array.isArray(point) ? 
            new oc.gp_Pnt_3(point[0] || 0, point[1] || 0, point[2] || 0) : 
            new oc.gp_Pnt_1(); 
          
          const dir = Array.isArray(direction) ? 
            new oc.gp_Dir_4(direction[0] || 0, direction[1] || 0, direction[2] || 1) : 
            new oc.gp_Dir_4(0, 0, 1); 
          
          ax1 = new oc.gp_Ax1_2(pnt, dir);
          const angleRad = (angle || 360) * Math.PI / 180;
          return new oc.BRepPrimAPI_MakeRevol_1(shape, ax1, angleRad).Shape();
          
        } else if (args.length === 2) {
     
          const [axisDef, angle] = args;
          log(`Revolve with current signature: axisDef=${typeof axisDef}, angle=${angle}`);
          
          if (Array.isArray(axisDef)) {
         
            const dir = new oc.gp_Dir_4(axisDef[0] || 0, axisDef[1] || 0, axisDef[2] || 1);
            ax1 = new oc.gp_Ax1_2(new oc.gp_Pnt_1(), dir);
          } else if (axisDef && typeof axisDef === 'object') {
            
            const p = axisDef.point || [0, 0, 0];
            const d = axisDef.direction || [0, 0, 1];
            ax1 = new oc.gp_Ax1_2(
              new oc.gp_Pnt_3(p[0], p[1], p[2]), 
              new oc.gp_Dir_4(d[0], d[1], d[2])
            );
          } else {
            throw new Error('Invalid axisDef: expected array or object with point/direction');
          }
          
          const angleRad = (angle || 360) * Math.PI / 180;
          return new oc.BRepPrimAPI_MakeRevol_1(shape, ax1, angleRad).Shape();
          
        } else {
          throw new Error(`Invalid revolve parameters: expected 2 or 3 args, got ${args.length}`);
        }
        
      } catch (error) {
        log('Revolve operation failed:', error);
        
        return shape;
      }
    },

    sweep: (profile: any, path: any) => {
      return new oc.BRepOffsetAPI_MakePipe_1(path, profile).Shape();
    },
    loft: (profiles: any[], solid = true) => {
      const loft = new oc.BRepOffsetAPI_ThruSections_1(solid);
      profiles.forEach(w => loft.AddWire_1(w));
      loft.Build_1();
      return loft.Shape();
    },

    translate: (shape: any, v: number[]|{dx:number,dy:number,dz:number}) => {
      const [dx,dy,dz] = Array.isArray(v)? v: [v.dx,v.dy,v.dz];
      const tr = new oc.gp_Trsf_1(); tr.SetTranslation_1(new oc.gp_Vec_4(dx,dy,dz));
      return new oc.BRepBuilderAPI_Transform_2(shape, tr, false).Shape();
    },
    rotate: (shape: any, axis: number[], angle: number) => {
      const ax1 = new oc.gp_Ax1_2(new oc.gp_Pnt_1(), new oc.gp_Dir_4(axis[0],axis[1],axis[2]));
      const tr = new oc.gp_Trsf_1(); tr.SetRotation_1(ax1, angle*Math.PI/180);
      return new oc.BRepBuilderAPI_Transform_2(shape, tr, false).Shape();
    },
    scale: (shape: any, f: number) => {
      const tr = new oc.gp_Trsf_1(); tr.SetScale_1(new oc.gp_Pnt_1(), f);
      return new oc.BRepBuilderAPI_Transform_2(shape, tr, false).Shape();
    },
    mirror: (shape: any, normal: number[]) => {
      const ax2 = new oc.gp_Ax2_3(new oc.gp_Pnt_1(), new oc.gp_Dir_4(normal[0],normal[1],normal[2]));
      const tr = new oc.gp_Trsf_1(); tr.SetMirror_2(ax2);
      return new oc.BRepBuilderAPI_Transform_2(shape, tr, false).Shape();
    },
   
    union: (...args: any[]) => {

      const shapes = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
      if (shapes.length < 2) return shapes[0];
      return shapes.reduce((acc, s) => new oc.BRepAlgoAPI_Fuse_3(acc, s).Shape(), shapes[0]);
    },
    difference: (base: any, ...cutterArgs: any[]) => {

      const cutters = cutterArgs.length === 1 && Array.isArray(cutterArgs[0]) ? cutterArgs[0] : cutterArgs;
      if (cutters.length === 0) return base;
      return cutters.reduce((acc, c) => new oc.BRepAlgoAPI_Cut_3(acc, c).Shape(), base);
    },
    intersect: (shapes: any[]) => {
      return shapes.reduce((acc, s) => new oc.BRepAlgoAPI_Common_3(acc, s).Shape(), shapes[0]);
    },

    circularPattern: (shape: any, count: number, axis: number[]) => {
      let res = shape;
      for (let i=1; i<count; i++) {
        const ang = i*2*Math.PI/count;
        const ax1 = new oc.gp_Ax1_2(new oc.gp_Pnt_1(), new oc.gp_Dir_4(axis[0],axis[1],axis[2]));
        const tr = new oc.gp_Trsf_1(); tr.SetRotation_1(ax1, ang);
        const shp = new oc.BRepBuilderAPI_Transform_2(shape, tr, false).Shape();
        res = new oc.BRepAlgoAPI_Fuse_3(res, shp).Shape();
      }
      return res;
    },
    linearPattern: (shape: any, count: number, direction: number[], spacing: number) => {
      let res = shape;
      const [dx, dy, dz] = direction;
      const len = Math.sqrt(dx*dx + dy*dy + dz*dz);
      const unitDir = [dx/len, dy/len, dz/len];
      for (let i = 1; i < count; i++) {
        const offset = [
          unitDir[0] * spacing * i,
          unitDir[1] * spacing * i, 
          unitDir[2] * spacing * i
        ];
        const translated = occ.translate(shape, offset);
        res = new oc.BRepAlgoAPI_Fuse_3(res, translated).Shape();
      }
      return res;
    },

    fillet: (shape: any, radius: number, edges?: any[]) => {
      try {
        const filletMaker = new oc.BRepFilletAPI_MakeFillet(shape);
        if (edges && edges.length > 0) {
          edges.forEach(edge => filletMaker.Add_2(radius, edge));
        } else {
     
          const explorer = new oc.TopExp_Explorer_2(shape, oc.TopAbs_ShapeEnum.TopAbs_EDGE as any, oc.TopAbs_ShapeEnum.TopAbs_SHAPE as any);
          while (explorer.More()) {
            filletMaker.Add_2(radius, explorer.Current());
            explorer.Next();
          }
        }
        return filletMaker.Shape();
      } catch (e) {
        log('Fillet failed, returning original shape:', e);
        return shape;
      }
    },
    chamfer: (shape: any, distance: number, edges?: any[]) => {
      try {
        const chamferMaker = new oc.BRepFilletAPI_MakeChamfer(shape);
        if (edges && edges.length > 0) {
          edges.forEach(edge => chamferMaker.Add_2(distance, edge));
        } else {
        
          const explorer = new oc.TopExp_Explorer_2(shape, oc.TopAbs_ShapeEnum.TopAbs_EDGE as any, oc.TopAbs_ShapeEnum.TopAbs_SHAPE as any);
          while (explorer.More()) {
            chamferMaker.Add_2(distance, explorer.Current());
            explorer.Next();
          }
        }
        return chamferMaker.Shape();
      } catch (e) {
        log('Chamfer failed, returning original shape:', e);
        return shape;
      }
    },
    shell: (shape: any, thickness: number, faces?: any[]) => {
      try {
        const shellMaker = new oc.BRepOffsetAPI_MakeThickSolid();
        const facesToRemove = new oc.TopTools_ListOfShape_1();
        if (faces && faces.length > 0) {
          faces.forEach(face => facesToRemove.Append_1(face));
        }
        shellMaker.MakeThickSolidByJoin(shape, facesToRemove, thickness, 1e-3);
        return shellMaker.Shape();
      } catch (e) {
        log('Shell failed, returning original shape:', e);
        return shape;
      }
    },

    tessellate: (shape: any, linear = 0.1, angular = 0.5) => {
      try {

        new oc.BRepMesh_IncrementalMesh(shape, linear, false, angular, false);
        
        const vertices: number[] = [];
        const normals: number[] = [];
        const indices: number[] = [];
        let vertexIndex = 0;
        
        
        const faceExplorer = new oc.TopExp_Explorer_2(
          shape, 
          oc.TopAbs_ShapeEnum.TopAbs_FACE as any, 
          oc.TopAbs_ShapeEnum.TopAbs_SHAPE as any
        );
        
        while (faceExplorer.More()) {
          const face = oc.TopoDS.Face_1(faceExplorer.Current());
          

          const location = new oc.TopLoc_Location_1();
          const triangulation = oc.BRep_Tool.Triangulation(face, location);
          
          if (!triangulation.IsNull()) {
            const transform = location.Transformation();
            
    
            const nodeCount = triangulation.get().NbNodes();
            const nodes = triangulation.get().Nodes();
            
            for (let i = 1; i <= nodeCount; i++) {
              let pnt = nodes.Value(i);
              
         
              if (!location.IsIdentity()) {
                pnt = pnt.Transformed(transform);
              }
              
              vertices.push(pnt.X(), pnt.Y(), pnt.Z());
            }
            
          
            const surface = oc.BRep_Tool.Surface_2(face);
            const faceNormal = calculateFaceNormal(surface, face, oc);
     
            for (let i = 0; i < nodeCount; i++) {
              normals.push(faceNormal.X(), faceNormal.Y(), faceNormal.Z());
            }
            

            const triangleCount = triangulation.get().NbTriangles();
            const triangles = triangulation.get().Triangles();
            
            for (let i = 1; i <= triangleCount; i++) {
              const triangle = triangles.Value(i);
              let n1 = triangle.Value(1) - 1; 
              let n2 = triangle.Value(2) - 1;
              let n3 = triangle.Value(3) - 1;
              

              if (face.Orientation_1() === oc.TopAbs_Orientation.TopAbs_REVERSED) {
                [n2, n3] = [n3, n2];
              }
              
              indices.push(
                vertexIndex + n1,
                vertexIndex + n2, 
                vertexIndex + n3
              );
            }
            
            vertexIndex += nodeCount;
          }
          
          faceExplorer.Next();
        }
        
        log(`Tessellated shape: ${vertices.length/3} vertices, ${indices.length/3} triangles`);
        
        return {
          vertices: new Float32Array(vertices),
          normals: new Float32Array(normals),
          indices: new Uint32Array(indices)
        };
        
      } catch (error) {
        log('Tessellation failed:', error);
     
        return createFallbackBox();
      }
    }
  };
}


async function initialize(): Promise<void> {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    oc = await initOpenCascade();
    occ = createOccWrapper(oc);
    postMessage({ type: 'init', success: true } as const);
  })();
  return initPromise;
}


function cleanCode(code: string): string {
  try {
   
    const lines = code.split('\n');
    const cleanedLines = lines.filter((line, index) => {
      const trimmed = line.trim();
      
      if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*')) {
        return true;
      }
      
   
      if (trimmed.startsWith('return ') || trimmed === 'return;') {
        log(`🧹 Removed invalid top-level return at line ${index + 1}: ${trimmed}`);
        return false;
      }
      
      return true;
    });
    
    const cleaned = cleanedLines.join('\n');
    
 
    if (!cleaned.includes('tessellate') && !cleaned.includes('return')) {

      const shapeVariables = [];
      const variableRegex = /(?:const|let|var)\s+(\w+)\s*=\s*occ\.(union|difference|intersect|extrude|revolve|sweep|create\w+)/g;
      let match;
      while ((match = variableRegex.exec(cleaned)) !== null) {
        shapeVariables.push(match[1]);
      }
      
      if (shapeVariables.length > 0) {
        const lastShape = shapeVariables[shapeVariables.length - 1];
        log(` Auto-adding tessellation for shape: ${lastShape}`);
        return cleaned + `\n\n// Auto-tessellate the final shape\nconst tessellated = occ.tessellate(${lastShape});`;
      }
    }
    
    return cleaned;
    
  } catch (error) {
    log(' Code cleaning failed, using original:', error);
    return code;
  }
}


async function processQueue(): Promise<void> {
  if (processing) return;
  processing = true;
  while (queue.length) {
    const { id, code } = queue.shift()!;
    try {

      const cleanedCode = cleanCode(code);
      log(` Cleaned code length: ${cleanedCode.length} chars`);
      

      const fn = new Function('occ', `'use strict';\n${cleanedCode}`);
      const resultShape = fn(occ);
      const meshData = occ.tessellate(resultShape);
      postMessage({ type: 'result', id, success: true, meshData } as const);
    } catch (e) {
      const err = e instanceof Error ? e.stack || e.message : String(e);
      postMessage({ type: 'result', id, success: false, error: err } as const);
    }
  }
  processing = false;
}

self.onmessage = async (ev: MessageEvent) => {
  const msg = ev.data as { type: string; id?: string; code?: string };
  if (msg.type === 'init') {
    await initialize().catch(() => {});
  } else if (msg.type === 'execute') {
    if (!msg.id || !msg.code) {
      postMessage({ type: 'result', id: msg.id, success: false, error: 'Malformed execute' });
      return;
    }
    initialize()
      .then(() => { queue.push({ id: msg.id!, code: msg.code! }); processQueue(); })
      .catch(() => postMessage({ type: 'result', id: msg.id, success: false, error: 'Init failed' }));
  } else {
    log('Unknown message', msg.type);
  }
};


initialize().catch(() => {});
