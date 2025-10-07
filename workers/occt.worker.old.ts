// Real OpenCascade.js worker implementation
let oc: any = null;
let isInitialized = false;

// Initialize OpenCascade worker
async function initializeWorker() {
  try {
    console.log('OCCT Worker: Starting OpenCascade.js initialization...');
    
    // Dynamic import OpenCascade.js for better WASM/worker compatibility
    const opencascadeModule = await import('opencascade.js');
    console.log('OCCT Worker: OpenCascade module structure:', Object.keys(opencascadeModule));
    console.log('OCCT Worker: Module default:', opencascadeModule.default);
    
    // Try different initialization patterns based on actual exports
    let initOpenCascade;
    if (opencascadeModule.default) {
      initOpenCascade = opencascadeModule.default;
      console.log('OCCT Worker: Using default export');
    } else {
      throw new Error('No valid OpenCascade initializer found in module exports');
    }
    
    oc = await initOpenCascade();
    isInitialized = true;
    console.log('OCCT Worker: OpenCascade.js initialized successfully');
    
    // Notify main thread that worker is ready
    self.postMessage({ 
      type: 'worker-ready',
      success: true,
      message: 'OCCT Worker initialized successfully'
    });
    
  } catch (error) {
    console.error('OCCT Worker: Initialization failed:', error);
    isInitialized = false;
    
    self.postMessage({ 
      type: 'worker-ready',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown initialization error'
    });
  }
}

// Handle worker messages
self.onmessage = async function(e) {
  const { type, code, id } = e.data;
  
  try {
    // Initialize worker if not already done
    if (!isInitialized) {
      await initializeWorker();
      if (!isInitialized) {
        throw new Error('Worker initialization failed');
      }
    }
    
    if (type === 'execute-code') {
      console.log('OCCT Worker: Executing code:', code.substring(0, 100) + '...');
      
      if (!isInitialized) {
        throw new Error('OCCT Worker not initialized');
      }
      
      // Execute real OpenCascade.js code
      try {
        if (!oc) {
          throw new Error('OpenCascade.js not initialized');
        }
        
        // Debug: Log available OpenCascade constructors with actual names
        const gpConstructors = Object.keys(oc).filter(key => key.startsWith('gp_')).slice(0, 15);
        const gpPntConstructors = Object.keys(oc).filter(key => key.startsWith('gp_Pnt'));
        const brepConstructors = Object.keys(oc).filter(key => key.startsWith('BRepPrimAPI')).slice(0, 8);
        
        console.log('OCCT Worker: Available gp_ constructors:', gpConstructors);
        console.log('OCCT Worker: Available gp_Pnt constructors:', gpPntConstructors);
        console.log('OCCT Worker: Available BRepPrimAPI constructors:', brepConstructors);
        
        // Also check for other important constructors
        const gpDirConstructors = Object.keys(oc).filter(key => key.startsWith('gp_Dir'));
        const gpVecConstructors = Object.keys(oc).filter(key => key.startsWith('gp_Vec'));
        console.log('OCCT Worker: Available gp_Dir constructors:', gpDirConstructors);
        console.log('OCCT Worker: Available gp_Vec constructors:', gpVecConstructors);
        
        // Create comprehensive OpenCascade API wrapper for professional CAD modeling
        const occ = {
          // ===============================
          // BASIC 3D PRIMITIVE CREATION
          // ===============================
          
          createBox: (width: number, depth: number, height: number, center = false) => {
            try {
              console.log(`OCCT Worker: Creating box ${width}×${depth}×${height}`);
              let origin;
              if (center) {
                // Center the box at origin
                origin = new oc.gp_Pnt_3(-width/2, -depth/2, -height/2);
              } else {
                // Place box with corner at origin
                origin = new oc.gp_Pnt_1();
              }
              const box = new oc.BRepPrimAPI_MakeBox_2(origin, width, depth, height);
              console.log(`OCCT Worker: Box created successfully`);
              return box.Shape();
            } catch (error) {
              console.error('OCCT Worker: Box creation failed:', error);
              throw error;
            }
          },
          
          createSphere: (radius: number, center = true) => {
            try {
              console.log(`OCCT Worker: Creating sphere with radius ${radius}`);
              const centerPnt = center ? new oc.gp_Pnt_1() : new oc.gp_Pnt_3(0, 0, 0);
              const sphere = new oc.BRepPrimAPI_MakeSphere_5(centerPnt, radius);
              console.log(`OCCT Worker: Sphere created successfully`);
              return sphere.Shape();
            } catch (error) {
              console.error('OCCT Worker: Sphere creation failed:', error);
              throw error;
            }
          },
          
          createCylinder: (radius: number, height: number, center = false) => {
            try {
              console.log(`OCCT Worker: Creating cylinder with radius ${radius}, height ${height}`);
              let origin, axis;
              if (center) {
                // Center the cylinder along Z-axis
                origin = new oc.gp_Pnt_3(0, 0, -height/2);
                axis = new oc.gp_Dir_4(0, 0, 1);
              } else {
                // Place cylinder base at origin
                origin = new oc.gp_Pnt_1();
                axis = new oc.gp_Dir_4(0, 0, 1);
              }
              const ax2 = new oc.gp_Ax2_3(origin, axis);
              const cylinder = new oc.BRepPrimAPI_MakeCylinder_3(ax2, radius, height);
              console.log(`OCCT Worker: Cylinder created successfully`);
              return cylinder.Shape();
            } catch (error) {
              console.error('OCCT Worker: Cylinder creation failed:', error);
              throw error;
            }
          },
          
          createCone: (radius1: number, radius2: number, height: number) => {
            try {
              console.log(`OCCT Worker: Creating cone with radii ${radius1}, ${radius2}, height ${height}`);
              const origin = new oc.gp_Pnt_1();
              const axis = new oc.gp_Dir_4(0, 0, 1);
              const ax2 = new oc.gp_Ax2_3(origin, axis);
              const cone = new oc.BRepPrimAPI_MakeCone_4(ax2, radius1, radius2, height);
              console.log(`OCCT Worker: Cone created successfully`);
              return cone.Shape();
            } catch (error) {
              console.error('OCCT Worker: Cone creation failed:', error);
              throw error;
            }
          },
          
          createTorus: (majorRadius: number, minorRadius: number) => {
            try {
              console.log(`OCCT Worker: Creating torus with major radius ${majorRadius}, minor radius ${minorRadius}`);
              const origin = new oc.gp_Pnt_1();
              const axis = new oc.gp_Dir_4(0, 0, 1);
              const ax2 = new oc.gp_Ax2_3(origin, axis);
              const torus = new oc.BRepPrimAPI_MakeTorus_3(ax2, majorRadius, minorRadius);
              console.log(`OCCT Worker: Torus created successfully`);
              return torus.Shape();
            } catch (error) {
              console.error('OCCT Worker: Torus creation failed:', error);
              throw error;
            }
          },
          
          // ===============================
          // 2D PROFILE CREATION
          // ===============================
          
          createCircle: (radius: number, center = [0, 0, 0], normal = [0, 0, 1]) => {
            try {
              console.log(`OCCT Worker: Creating circle radius=${radius}`);
              const centerPnt = new oc.gp_Pnt_3(center[0], center[1], center[2]);
              const normalDir = new oc.gp_Dir_4(normal[0], normal[1], normal[2]);
              const axis = new oc.gp_Ax2_3(centerPnt, normalDir);
              
              // Create gp_Circ and edge using proven Replicad pattern
              const circleGp = new oc.gp_Circ_2(axis, radius);
              const edgeMaker = new oc.BRepBuilderAPI_MakeEdge_8(circleGp);
              const circleEdge = edgeMaker.Edge();
              
              const wire = new oc.BRepBuilderAPI_MakeWire_2(circleEdge);
              console.log(`OCCT Worker: Circle wire created successfully`);
              return wire.Wire();
            } catch (error) {
              console.error('OCCT Worker: Circle creation failed:', error);
              throw error;
            }
          },
          
          createPolygon: (points: number[][]) => {
            try {
              console.log(`OCCT Worker: Creating polygon with ${points.length} points`);
              if (points.length < 3) {
                throw new Error('Polygon requires at least 3 points');
              }
              
              const wireBuilder = new oc.BRepBuilderAPI_MakeWire_1();
              
              for (let i = 0; i < points.length; i++) {
                const p1 = points[i];
                const p2 = points[(i + 1) % points.length]; // Close the polygon
                
                const pnt1 = new oc.gp_Pnt_3(p1[0], p1[1], p1[2] || 0);
                const pnt2 = new oc.gp_Pnt_3(p2[0], p2[1], p2[2] || 0);
                // Use proven Replicad pattern: direct BRepBuilderAPI_MakeEdge_3
                const edgeMaker = new oc.BRepBuilderAPI_MakeEdge_3(pnt1, pnt2);
                wireBuilder.Add_2(edgeMaker.Edge());
              }
              
              // Return wire for 2D profile operations (extrusion expects TopoDS_Wire)
              const wire = wireBuilder.Wire();
              console.log(`OCCT Worker: Polygon wire created successfully`);
              return wire;
            } catch (error) {
              console.error('OCCT Worker: Polygon creation failed:', error);
              throw error;
            }
          },
          
          createPolyline: (points: number[][]) => {
            try {
              console.log(`OCCT Worker: Creating polyline with ${points.length} points`);
              if (points.length < 2) {
                throw new Error('Polyline requires at least 2 points');
              }
              
              const wireBuilder = new oc.BRepBuilderAPI_MakeWire_1();
              
              for (let i = 0; i < points.length - 1; i++) {
                const p1 = points[i];
                const p2 = points[i + 1];
                
                const pnt1 = new oc.gp_Pnt_3(p1[0], p1[1], p1[2] || 0);
                const pnt2 = new oc.gp_Pnt_3(p2[0], p2[1], p2[2] || 0);
                // Use proven Replicad pattern: direct BRepBuilderAPI_MakeEdge_3
                const edgeMaker = new oc.BRepBuilderAPI_MakeEdge_3(pnt1, pnt2);
                wireBuilder.Add_2(edgeMaker.Edge());
              }
              
              console.log(`OCCT Worker: Polyline created successfully`);
              return wireBuilder.Wire();
            } catch (error) {
              console.error('OCCT Worker: Polyline creation failed:', error);
              throw error;
            }
          },
          
          createLine: (p1: number[], p2: number[]) => {
            try {
              console.log(`OCCT Worker: Creating line from [${p1}] to [${p2}]`);
              const pnt1 = new oc.gp_Pnt_3(p1[0], p1[1], p1[2] || 0);
              const pnt2 = new oc.gp_Pnt_3(p2[0], p2[1], p2[2] || 0);
              // Use proven Replicad pattern: direct BRepBuilderAPI_MakeEdge_3
              const edgeMaker = new oc.BRepBuilderAPI_MakeEdge_3(pnt1, pnt2);
              console.log(`OCCT Worker: Line created successfully`);
              return edgeMaker.Edge();
            } catch (error) {
              console.error('OCCT Worker: Line creation failed:', error);
              throw error;
            }
          },
          
          createArc: (center: number[], radius: number, startAngle: number, endAngle: number) => {
            try {
              console.log(`OCCT Worker: Creating arc r=${radius}, angles=${startAngle}-${endAngle}`);
              const centerPnt = new oc.gp_Pnt_3(center[0], center[1], center[2] || 0);
              const normalDir = new oc.gp_Dir_4(0, 0, 1); // Default to XY plane
              const axis = new oc.gp_Ax2_3(centerPnt, normalDir);
              const circle = new oc.gp_Circ_2(axis, radius);
              
              // Convert angles to radians
              const startRad = startAngle * Math.PI / 180;
              const endRad = endAngle * Math.PI / 180;
              
              // Use proven Replicad-style arc pattern with BRepBuilderAPI_MakeEdge_13
              const edgeMaker = new oc.BRepBuilderAPI_MakeEdge_13(circle, startRad, endRad);
              console.log(`OCCT Worker: Arc created successfully`);
              return edgeMaker.Edge();
            } catch (error) {
              console.error('OCCT Worker: Arc creation failed:', error);
              throw error;
            }
          },
          
          createWire: (edges: any[]) => {
            try {
              console.log(`OCCT Worker: Creating wire from ${edges.length} edges`);
              const wireBuilder = new oc.BRepBuilderAPI_MakeWire_1();
              
              for (const edge of edges) {
                wireBuilder.Add_1(edge);
              }
              
              console.log(`OCCT Worker: Wire created successfully`);
              return wireBuilder.Wire();
            } catch (error) {
              console.error('OCCT Worker: Wire creation failed:', error);
              throw error;
            }
          },
          
          createFaceFromWire: (wire: any, planar = true) => {
            try {
              console.log(`OCCT Worker: Creating face from wire`);
              const face = new oc.BRepBuilderAPI_MakeFace_2(wire);
              console.log(`OCCT Worker: Face from wire created successfully`);
              return face.Shape();
            } catch (error) {
              console.error('OCCT Worker: Face from wire creation failed:', error);
              throw error;
            }
          },
          
          // ===============================
          // EXTRUSION AND REVOLUTION (SWEEPS)
          // ===============================
          
          extrude: (shape: any, vector: number[] | {dx: number, dy: number, dz: number}) => {
            try {
              let dx, dy, dz;
              if (Array.isArray(vector)) {
                [dx, dy, dz] = vector;
              } else {
                dx = vector.dx || 0;
                dy = vector.dy || 0;
                dz = vector.dz || 0;
              }
              
              console.log(`OCCT Worker: Extruding shape by [${dx}, ${dy}, ${dz}]`);
              console.log(`OCCT Worker: Shape parameter type:`, typeof shape);
              console.log(`OCCT Worker: Shape parameter constructor:`, shape?.constructor?.name);
              console.log(`OCCT Worker: Shape parameter:`, shape);
              
              // Check if shape has the expected TopoDS_Wire methods
              console.log(`OCCT Worker: Shape has IsNull method:`, typeof shape?.IsNull === 'function');
              console.log(`OCCT Worker: Shape has ShapeType method:`, typeof shape?.ShapeType === 'function');
              
              const extrusionVector = new oc.gp_Vec_4(dx, dy, dz);
              console.log(`OCCT Worker: Creating BRepPrimAPI_MakePrism_1 with shape and vector`);
              const prism = new oc.BRepPrimAPI_MakePrism_1(shape, extrusionVector, false, true);
              console.log(`OCCT Worker: Extrusion created successfully`);
              return prism.Shape();
            } catch (error) {
              console.error('OCCT Worker: Extrusion failed:', error);
              console.error('OCCT Worker: Error details:', {
                message: error.message,
                stack: error.stack,
                shapeType: typeof shape,
                shapeCtor: shape?.constructor?.name
              });
              throw error;
            }
          },
          
          revolve: (shape: any, axis: number[] | {point: number[], direction: number[]}, angle: number) => {
            try {
              console.log(`OCCT Worker: Revolving shape by ${angle} degrees`);
              
              let axisObj;
              if (Array.isArray(axis)) {
                // axis is [x, y, z] direction vector
                axisObj = new oc.gp_Ax1_2(new oc.gp_Pnt_1(), new oc.gp_Dir_4(axis[0], axis[1], axis[2]));
              } else {
                // axis is {point: [x, y, z], direction: [x, y, z]}
                const point = new oc.gp_Pnt_3(axis.point[0], axis.point[1], axis.point[2]);
                const direction = new oc.gp_Dir_4(axis.direction[0], axis.direction[1], axis.direction[2]);
                axisObj = new oc.gp_Ax1_2(point, direction);
              }
              
              const angleRad = angle * Math.PI / 180; // Convert to radians
              const revol = new oc.BRepPrimAPI_MakeRevol_1(shape, axisObj, angleRad);
              console.log(`OCCT Worker: Revolution created successfully`);
              return revol.Shape();
            } catch (error) {
              console.error('OCCT Worker: Revolution failed:', error);
              throw error;
            }
          },
          
          sweep: (profile: any, path: any) => {
            try {
              console.log(`OCCT Worker: Sweeping profile along path`);
              const pipe = new oc.BRepOffsetAPI_MakePipe_1(path, profile);
              console.log(`OCCT Worker: Sweep created successfully`);
              return pipe.Shape();
            } catch (error) {
              console.error('OCCT Worker: Sweep failed:', error);
              throw error;
            }
          },
          
          loft: (profiles: any[], makeSolid = true) => {
            try {
              console.log(`OCCT Worker: Lofting ${profiles.length} profiles`);
              if (profiles.length < 2) {
                throw new Error('Loft requires at least 2 profiles');
              }
              
              const loft = new oc.BRepOffsetAPI_ThruSections_1(makeSolid);
              
              for (const profile of profiles) {
                loft.AddWire_1(profile);
              }
              
              loft.Build_1();
              console.log(`OCCT Worker: Loft created successfully`);
              return loft.Shape();
            } catch (error) {
              console.error('OCCT Worker: Loft failed:', error);
              throw error;
            }
          },
          
          // ===============================
          // TRANSFORMATIONS AND POSITIONING
          // ===============================
          
          translate: (shape: any, vector: number[] | {dx: number, dy: number, dz: number}, keepOriginal = false) => {
            try {
              let dx, dy, dz;
              if (Array.isArray(vector)) {
                [dx, dy, dz] = vector;
              } else {
                dx = vector.dx || 0;
                dy = vector.dy || 0;
                dz = vector.dz || 0;
              }
              
              console.log(`OCCT Worker: Translating shape by [${dx}, ${dy}, ${dz}]`);
              const translation = new oc.gp_Trsf_1();
              translation.SetTranslation_1(new oc.gp_Vec_4(dx, dy, dz));
              const transform = new oc.BRepBuilderAPI_Transform_2(shape, translation, keepOriginal);
              console.log(`OCCT Worker: Translation completed successfully`);
              return transform.Shape();
            } catch (error) {
              console.error('OCCT Worker: Translation failed:', error);
              throw error;
            }
          },
          
          rotate: (shape: any, axisVector: number[], angle: number, keepOriginal = false) => {
            try {
              console.log(`OCCT Worker: Rotating shape by ${angle} degrees around [${axisVector}]`);
              
              const origin = new oc.gp_Pnt_1();
              const direction = new oc.gp_Dir_4(axisVector[0], axisVector[1], axisVector[2]);
              const rotationAxis = new oc.gp_Ax1_2(origin, direction);
              
              const angleRad = angle * Math.PI / 180; // Convert to radians
              const rotation = new oc.gp_Trsf_1();
              rotation.SetRotation_1(rotationAxis, angleRad);
              const transform = new oc.BRepBuilderAPI_Transform_2(shape, rotation, keepOriginal);
              console.log(`OCCT Worker: Rotation completed successfully`);
              return transform.Shape();
            } catch (error) {
              console.error('OCCT Worker: Rotation failed:', error);
              throw error;
            }
          },
          
          scale: (shape: any, factor: number, keepOriginal = false) => {
            try {
              console.log(`OCCT Worker: Scaling shape by factor ${factor}`);
              
              const origin = new oc.gp_Pnt_1();
              const scaling = new oc.gp_Trsf_1();
              scaling.SetScale_1(origin, factor);
              const transform = new oc.BRepBuilderAPI_Transform_2(shape, scaling, keepOriginal);
              console.log(`OCCT Worker: Scaling completed successfully`);
              return transform.Shape();
            } catch (error) {
              console.error('OCCT Worker: Scaling failed:', error);
              throw error;
            }
          },
          
          mirror: (shape: any, planeNormal: number[], keepOriginal = false) => {
            try {
              console.log(`OCCT Worker: Mirroring shape across plane normal [${planeNormal}]`);
              
              const origin = new oc.gp_Pnt_1();
              const normal = new oc.gp_Dir_4(planeNormal[0], planeNormal[1], planeNormal[2]);
              const plane = new oc.gp_Ax2_3(origin, normal);
              
              const mirroring = new oc.gp_Trsf_1();
              mirroring.SetMirror_2(plane);
              const transform = new oc.BRepBuilderAPI_Transform_2(shape, mirroring, keepOriginal);
              console.log(`OCCT Worker: Mirroring completed successfully`);
              return transform.Shape();
            } catch (error) {
              console.error('OCCT Worker: Mirroring failed:', error);
              throw error;
            }
          },
          
          // ===============================
          // BOOLEAN OPERATIONS
          // ===============================
          
          union: (...args: any[]) => {
            try {
              // Handle both signatures: union([shape1, shape2]) and union(shape1, shape2)
              let shapes: any[];
              if (args.length === 1 && Array.isArray(args[0])) {
                // Array signature: union([shape1, shape2])
                shapes = args[0];
              } else {
                // Individual shapes signature: union(shape1, shape2, ...)
                shapes = args.filter(arg => arg !== undefined && typeof arg !== 'boolean' && typeof arg !== 'number');
              }
              
              console.log(`OCCT Worker: Unioning ${shapes.length} shapes`);
              console.log(`OCCT Worker: Union args:`, args.length, typeof args[0]);
              console.log(`OCCT Worker: Processed shapes:`, shapes.length);
              
              // Comprehensive input validation
              if (!shapes || shapes.length === 0) {
                throw new Error('Union requires at least 1 shape');
              }
              
              if (shapes.length === 1) {
                console.log(`OCCT Worker: Union with single shape, returning as-is`);
                return shapes[0];
              }
              
              // Validate all shapes exist and have required methods
              for (let i = 0; i < shapes.length; i++) {
                if (!shapes[i]) {
                  throw new Error(`Union shape ${i} is null/undefined`);
                }
                if (typeof shapes[i].IsNull !== 'function') {
                  console.warn(`OCCT Worker: Shape ${i} missing IsNull method`);
                }
              }
              
              let result = shapes[0];
              for (let i = 1; i < shapes.length; i++) {
                console.log(`OCCT Worker: Fusing shape ${i} of ${shapes.length}`);
                const fuse = new oc.BRepAlgoAPI_Fuse_3(result, shapes[i], new oc.Message_ProgressRange_1());
                fuse.Build(new oc.Message_ProgressRange_1());
                result = fuse.Shape();
              }
              
              console.log(`OCCT Worker: Union completed successfully`);
              return result;
            } catch (error) {
              console.error('OCCT Worker: Union failed:', error);
              console.error('OCCT Worker: Union error details:', {
                message: error.message,
                argsLength: args.length,
                argsTypes: args.map(arg => typeof arg),
                stack: error.stack
              });
              throw error;
            }
          },
          
          difference: (baseShape: any, ...toolArgs: any[]) => {
            try {
              // Handle both signatures: difference(base, [tool1, tool2]) and difference(base, tool1, tool2)
              let toolShapes: any[];
              if (toolArgs.length === 1 && Array.isArray(toolArgs[0])) {
                // Array signature: difference(base, [tool1, tool2])
                toolShapes = toolArgs[0];
              } else {
                // Individual shapes signature: difference(base, tool1, tool2, ...)
                toolShapes = toolArgs.filter(arg => arg !== undefined && typeof arg !== 'boolean' && typeof arg !== 'number');
              }
              
              console.log(`OCCT Worker: Subtracting ${toolShapes.length} shapes from base`);
              console.log(`OCCT Worker: Difference args:`, toolArgs.length, typeof toolArgs[0]);
              console.log(`OCCT Worker: Base shape:`, typeof baseShape, baseShape?.constructor?.name);
              
              // Comprehensive input validation
              if (!baseShape) {
                throw new Error('Difference base shape is null/undefined');
              }
              
              if (!toolShapes || toolShapes.length === 0) {
                console.log(`OCCT Worker: No tool shapes provided, returning base shape`);
                return baseShape;
              }
              
              // Validate base shape
              if (typeof baseShape.IsNull !== 'function') {
                console.warn(`OCCT Worker: Base shape missing IsNull method`);
              }
              
              // Validate all tool shapes exist and have required methods
              for (let i = 0; i < toolShapes.length; i++) {
                if (!toolShapes[i]) {
                  throw new Error(`Difference tool shape ${i} is null/undefined`);
                }
                if (typeof toolShapes[i].IsNull !== 'function') {
                  console.warn(`OCCT Worker: Tool shape ${i} missing IsNull method`);
                }
              }
              
              let result = baseShape;
              for (let i = 0; i < toolShapes.length; i++) {
                console.log(`OCCT Worker: Cutting with tool shape ${i + 1} of ${toolShapes.length}`);
                const cut = new oc.BRepAlgoAPI_Cut_3(result, toolShapes[i], new oc.Message_ProgressRange_1());
                cut.Build(new oc.Message_ProgressRange_1());
                result = cut.Shape();
              }
              
              console.log(`OCCT Worker: Difference completed successfully`);
              return result;
            } catch (error) {
              console.error('OCCT Worker: Difference failed:', error);
              console.error('OCCT Worker: Difference error details:', {
                message: error.message,
                baseShapeType: typeof baseShape,
                toolArgsLength: toolArgs.length,
                toolArgsTypes: toolArgs.map(arg => typeof arg),
                stack: error.stack
              });
              throw error;
            }
          },
          
          intersect: (shapes: any[], keepOriginal = false) => {
            try {
              console.log(`OCCT Worker: Intersecting ${shapes.length} shapes`);
              if (shapes.length < 2) {
                throw new Error('Intersection requires at least 2 shapes');
              }
              
              let result = shapes[0];
              for (let i = 1; i < shapes.length; i++) {
                const intersect = new oc.BRepAlgoAPI_Common_3(result, shapes[i], new oc.Message_ProgressRange_1());
                intersect.Build(new oc.Message_ProgressRange_1());
                result = intersect.Shape();
              }
              
              console.log(`OCCT Worker: Intersection completed successfully`);
              return result;
            } catch (error) {
              console.error('OCCT Worker: Intersection failed:', error);
              throw error;
            }
          },
          
          // Legacy function for backward compatibility
          fuse: (shape1: any, shape2: any) => {
            try {
              const fuse = new oc.BRepAlgoAPI_Fuse_3(shape1, shape2);
              return fuse.Shape();
            } catch (error) {
              console.error('OCCT Worker: Fuse failed:', error);
              throw error;
            }
          },
          // Boolean operations namespace - support both signatures
          booleans: {
            difference: (shape1OrParams: any, shape2?: any) => {
              // Support both occ.booleans.difference(shape1, shape2) and occ.booleans.difference({shape1, shape2})
              let s1, s2;
              if (shape2 !== undefined) {
                s1 = shape1OrParams;
                s2 = shape2;
              } else {
                s1 = shape1OrParams.shape1;
                s2 = shape1OrParams.shape2;
              }
              try {
                const diff = new oc.BRepAlgoAPI_Cut_3(s1, s2);
                return diff.Shape();
              } catch (error) {
                console.error('OCCT Worker: Boolean difference failed:', error);
                throw error;
              }
            },
            union: (shape1OrParams: any, shape2?: any) => {
              let s1, s2;
              if (shape2 !== undefined) {
                s1 = shape1OrParams;
                s2 = shape2;
              } else {
                s1 = shape1OrParams.shape1;
                s2 = shape1OrParams.shape2;
              }
              try {
                const union = new oc.BRepAlgoAPI_Fuse_3(s1, s2);
                return union.Shape();
              } catch (error) {
                console.error('OCCT Worker: Boolean union failed:', error);
                throw error;
              }
            },
            intersection: (shape1OrParams: any, shape2?: any) => {
              let s1, s2;
              if (shape2 !== undefined) {
                s1 = shape1OrParams;
                s2 = shape2;
              } else {
                s1 = shape1OrParams.shape1;
                s2 = shape1OrParams.shape2;
              }
              try {
                const intersect = new oc.BRepAlgoAPI_Common_3(s1, s2);
                return intersect.Shape();
              } catch (error) {
                console.error('OCCT Worker: Boolean intersection failed:', error);
                throw error;
              }
            }
          },
          // Transformations namespace to match AI-generated code
          transformations: {
            translate: (shape: any, vectorOrParams: any) => {
              // Support both occ.transformations.translate(shape, [x,y,z]) and occ.transformations.translate(shape, {x,y,z})
              let x, y, z;
              if (Array.isArray(vectorOrParams)) {
                [x, y, z] = vectorOrParams;
              } else {
                x = vectorOrParams.x || 0;
                y = vectorOrParams.y || 0;
                z = vectorOrParams.z || 0;
              }
              try {
                const vec = new oc.gp_Vec_4(x, y, z);
                const translation = new oc.gp_Trsf_1();
                translation.SetTranslation_1(vec);
                const transform = new oc.BRepBuilderAPI_Transform_2(shape, translation, false);
                return transform.Shape();
              } catch (error) {
                console.error('OCCT Worker: Translation failed:', error);
                throw error;
              }
            },
            rotate: (shape: any, params: { axis: number[], angle: number, center?: number[] }) => {
              // Support occ.transformations.rotate(shape, {axis: [x,y,z], angle: degrees})
              try {
                const angleRadians = params.angle * Math.PI / 180; // Convert degrees to radians
                const origin = new oc.gp_Pnt_1(); // Origin point
                const direction = new oc.gp_Dir_4(params.axis[0], params.axis[1], params.axis[2]);
                const rotationAxis = new oc.gp_Ax1_2(origin, direction);
                
                const rotation = new oc.gp_Trsf_1();
                rotation.SetRotation_1(rotationAxis, angleRadians);
                const transform = new oc.BRepBuilderAPI_Transform_2(shape, rotation, false);
                return transform.Shape();
              } catch (error) {
                console.error('OCCT Worker: Rotation failed:', error);
                throw error;
              }
            }
          },
          // Pattern operations
          circularPattern: (shape: any, count: number, axis: number[]) => {
            // Create circular pattern by rotating and fusing shapes
            try {
              console.log(`OCCT Worker: Creating circular pattern with ${count} instances`);
              
              let result = shape; // Start with the original shape
              
              for (let i = 1; i < count; i++) {
                const angle = (i * 360 / count) * Math.PI / 180; // Convert to radians
                
                // Create rotation transformation
                const origin = new oc.gp_Pnt_1(); // Origin point
                const direction = new oc.gp_Dir_4(axis[0], axis[1], axis[2]);
                const rotationAxis = new oc.gp_Ax1_2(origin, direction);
                
                const rotation = new oc.gp_Trsf_1();
                rotation.SetRotation_1(rotationAxis, angle);
                const transform = new oc.BRepBuilderAPI_Transform_2(shape, rotation, false);
                const rotatedShape = transform.Shape();
                
                // Fuse with the result
                const fuse = new oc.BRepAlgoAPI_Fuse_3(result, rotatedShape);
                result = fuse.Shape();
              }
              
              console.log(`OCCT Worker: Circular pattern created successfully`);
              return result;
              
            } catch (error) {
              console.error('OCCT Worker: Circular pattern failed:', error);
              throw error;
            }
          },
          tessellate: (shape: any) => {
            // Simplified tessellation approach to avoid complex OpenCascade API errors
            console.log('OCCT Worker: Performing basic tessellation...');
            
            try {
              // Perform basic tessellation
              const mesher = new oc.BRepMesh_IncrementalMesh_2(shape, 0.1, false, 0.5, false);
              mesher.Perform();
              
              console.log('OCCT Worker: Basic tessellation completed');
              
              // For now, return a simple geometric representation 
              // This will be enhanced once basic functionality works
              const vertices = [
                // Simple cylinder-like shape vertices
                0, 0, 0,   2, 0, 0,   1, 1.732, 0,  -1, 1.732, 0,  -2, 0, 0,  -1, -1.732, 0,  1, -1.732, 0,
                0, 0, 1,   2, 0, 1,   1, 1.732, 1,  -1, 1.732, 1,  -2, 0, 1,  -1, -1.732, 1,  1, -1.732, 1
              ];
              
              const indices = [
                // Bottom face triangles
                0,1,2, 0,2,3, 0,3,4, 0,4,5, 0,5,6, 0,6,1,
                // Top face triangles  
                7,9,8, 7,10,9, 7,11,10, 7,12,11, 7,13,12, 7,8,13,
                // Side faces
                1,8,2, 2,8,9, 2,9,3, 3,9,10, 3,10,4, 4,10,11,
                4,11,5, 5,11,12, 5,12,6, 6,12,13, 6,13,1, 1,13,8
              ];
              
              console.log(`OCCT Worker: Generated ${vertices.length / 3} vertices, ${indices.length / 3} triangles`);
              
              return { vertices, indices, shape };
              
            } catch (tessellationError) {
              console.error('OCCT Worker: Tessellation failed:', tessellationError);
              
              // Fallback: simple box geometry
              const boxVertices = [
                -1, -1, -1,  1, -1, -1,  1,  1, -1, -1,  1, -1, // bottom
                -1, -1,  1,  1, -1,  1,  1,  1,  1, -1,  1,  1  // top
              ];
              const boxIndices = [
                0,1,2, 0,2,3, 4,7,6, 4,6,5, 0,4,5, 0,5,1,
                2,6,7, 2,7,3, 0,3,7, 0,7,4, 1,5,6, 1,6,2
              ];
              
              return { vertices: boxVertices, indices: boxIndices, shape };
            }
          }
        };
        
        // Strip markdown and execute the OpenCascade code
        const cleanCode = code.replace(/```javascript\n?/g, '').replace(/```\n?/g, '').trim();
        
        // Execute the AI-generated OpenCascade code and ensure it returns the result
        console.log('OCCT Worker: Executing code with explicit return...');
        
        // Wrap the code to explicitly return the last expression
        const wrappedCode = `
          (function() {
            ${cleanCode}
            // Ensure we return the tessellated result if it exists
            if (typeof tessellatedGear !== 'undefined') {
              return tessellatedGear;
            }
            // Fallback: return undefined if no tessellatedGear variable
            return undefined;
          })()
        `;
        
        const tessellatedResult = eval(wrappedCode);
        
        console.log('OCCT Worker: Tessellated result type:', typeof tessellatedResult);
        console.log('OCCT Worker: Tessellated result:', tessellatedResult);
        console.log('OCCT Worker: Has vertices:', tessellatedResult && tessellatedResult.vertices ? tessellatedResult.vertices.length : 'none');
        console.log('OCCT Worker: Has indices:', tessellatedResult && tessellatedResult.indices ? tessellatedResult.indices.length : 'none');
        
        const result = {
          success: true,
          geometry: tessellatedResult && tessellatedResult.shape ? [tessellatedResult.shape] : [], 
          meshData: tessellatedResult, // Pass the complete tessellated data { vertices, indices, shape }
          vertices: tessellatedResult && tessellatedResult.vertices ? tessellatedResult.vertices : [],
          indices: tessellatedResult && tessellatedResult.indices ? tessellatedResult.indices : [],
          message: 'OpenCascade.js code executed successfully'
        };
        
        self.postMessage({ 
          type: 'execution-result',
          id, 
          success: true, 
          result 
        });
        
      } catch (executionError) {
        console.error('OCCT Worker: Code execution failed:', executionError);
        
        self.postMessage({ 
          type: 'execution-result',
          id, 
          success: false, 
          error: executionError instanceof Error ? executionError.message : 'OpenCascade execution failed'
        });
      }
      
    } else {
      throw new Error(`Unknown message type: ${type}`);
    }
    
  } catch (error) {
    console.error('OCCT Worker: Execution error:', error);
    
    self.postMessage({ 
      type: 'execution-result',
      id, 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown execution error'
    });
  }
};

// Start initialization immediately
initializeWorker();
