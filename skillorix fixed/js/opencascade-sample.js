// OpenCascade.js Sample Code with Parametric Modeling Examples
window.addEventListener('DOMContentLoaded', function() {
    // Create the sample OpenCascade code functionality
    window.createOpenCascadeSample = function(scene) {
        console.log('createOpenCascadeSample called');
        // Check if OpenCascade.js is loaded
        const isOpenCascadeLoaded = (typeof initOpenCascade === 'function' || typeof window.opencascade !== 'undefined');
        console.log('OpenCascade loaded:', isOpenCascadeLoaded, 'initOpenCascade:', typeof initOpenCascade, 'window.opencascade:', typeof window.opencascade);
        if (!isOpenCascadeLoaded) {
            console.warn('OpenCascade.js is not loaded. Sample code will not be available.');
            return;
        }

        let ocInstance = null;
        let currentModel = null;
        let currentMesh = null;
        
        // Create a StackPanel for sample code controls
        const advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI('OpenCascadeSampleUI');
        
        const panel = new BABYLON.GUI.StackPanel();
        panel.width = '300px';
        panel.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        panel.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
        panel.left = '20px';
        panel.bottom = '20px';
        panel.background = 'rgba(43, 43, 43, 0.7)';
        panel.paddingTop = '10px';
        panel.paddingBottom = '10px';
        panel.paddingLeft = '10px';
        panel.paddingRight = '10px';
        panel.cornerRadius = 10;
        panel.isVisible = true; // Show initially for debugging
        advancedTexture.addControl(panel);
        
        // Add a header
        const header = new BABYLON.GUI.TextBlock();
        header.text = 'OpenCascade Sample Models';
        header.height = '30px';
        header.color = 'white';
        header.fontSize = 16;
        header.fontWeight = 'bold';
        header.paddingBottom = '10px';
        panel.addControl(header);
        
        // Add status text
        const statusText = new BABYLON.GUI.TextBlock();
        statusText.name = 'statusText';
        statusText.text = 'Ready';
        statusText.height = '30px';
        statusText.color = 'white';
        statusText.fontSize = 12;
        statusText.paddingTop = '5px';
        statusText.paddingBottom = '10px';
        panel.addControl(statusText);
        
        // Create sample buttons
        const samples = [
            { name: 'Gear', function: createGear },
            { name: 'Bottle', function: createBottle },
            { name: 'Threaded Rod', function: createThreadedRod },
            { name: 'Fillet Box', function: createFilletBox },
            { name: 'Boolean Operations', function: createBooleanOperations }
        ];
        
        samples.forEach(sample => {
            const button = BABYLON.GUI.Button.CreateSimpleButton(sample.name + 'Button', sample.name);
            button.width = '280px';
            button.height = '40px';
            button.color = 'white';
            button.background = 'rgba(70, 70, 70, 1)';
            button.paddingTop = '5px';
            button.paddingBottom = '5px';
            button.cornerRadius = 5;
            button.onPointerUpObservable.add(function() {
                sample.function();
            });
            panel.addControl(button);
        });
        
        // Initialize OpenCascade.js
        async function initOC() {
            try {
                statusText.text = 'Initializing OpenCascade.js...';
                
                // Check which initialization method is available
                if (typeof initOpenCascade === 'function') {
                    ocInstance = await initOpenCascade();
                } else if (typeof window.opencascade !== 'undefined') {
                    ocInstance = window.opencascade;
                } else {
                    throw new Error('OpenCascade.js initialization method not found');
                }
                
                statusText.text = 'OpenCascade.js initialized';
                panel.isVisible = true;
                return true;
            } catch (error) {
                statusText.text = 'OpenCascade.js initialization failed';
                console.error('OpenCascade.js initialization failed:', error);
                return false;
            }
        }
        
        // Sample 1: Create a parametric gear
        async function createGear() {
            if (!ocInstance) {
                const initialized = await initOC();
                if (!initialized) return;
            }
            
            // Remove previous model if exists
            if (currentMesh) {
                currentMesh.dispose();
                currentMesh = null;
            }
            
            statusText.text = 'Creating gear...';
            
            try {
                // Parameters for the gear
                const teeth = 20;
                const module = 0.2;
                const pressureAngle = 20 * (Math.PI / 180); // 20 degrees in radians
                const thickness = 0.5;
                const innerRadius = 0.8;
                
                // Calculate pitch radius
                const pitchRadius = module * teeth / 2;
                const addendum = module;
                const dedendum = 1.25 * module;
                const outerRadius = pitchRadius + addendum;
                const rootRadius = pitchRadius - dedendum;
                
                // Create the base circle for the gear
                const baseCircle = new ocInstance.gp_Circ_2(
                    new ocInstance.gp_Ax2_3(
                        new ocInstance.gp_Pnt_3(0, 0, 0),
                        new ocInstance.gp_Dir_4(0, 0, 1)
                    ),
                    pitchRadius
                );
                
                const baseCircleEdge = new ocInstance.BRepBuilderAPI_MakeEdge_24(baseCircle).Edge();
                const baseCircleWire = new ocInstance.BRepBuilderAPI_MakeWire_2(baseCircleEdge).Wire();
                const baseCircleFace = new ocInstance.BRepBuilderAPI_MakeFace_15(baseCircleWire, true).Face();
                
                // Create the outer circle
                const outerCircle = new ocInstance.gp_Circ_2(
                    new ocInstance.gp_Ax2_3(
                        new ocInstance.gp_Pnt_3(0, 0, 0),
                        new ocInstance.gp_Dir_4(0, 0, 1)
                    ),
                    outerRadius
                );
                
                const outerCircleEdge = new ocInstance.BRepBuilderAPI_MakeEdge_24(outerCircle).Edge();
                const outerCircleWire = new ocInstance.BRepBuilderAPI_MakeWire_2(outerCircleEdge).Wire();
                const outerCircleFace = new ocInstance.BRepBuilderAPI_MakeFace_15(outerCircleWire, true).Face();
                
                // Create the inner circle (hole)
                const innerCircle = new ocInstance.gp_Circ_2(
                    new ocInstance.gp_Ax2_3(
                        new ocInstance.gp_Pnt_3(0, 0, 0),
                        new ocInstance.gp_Dir_4(0, 0, 1)
                    ),
                    innerRadius
                );
                
                const innerCircleEdge = new ocInstance.BRepBuilderAPI_MakeEdge_24(innerCircle).Edge();
                const innerCircleWire = new ocInstance.BRepBuilderAPI_MakeWire_2(innerCircleEdge).Wire();
                const innerCircleFace = new ocInstance.BRepBuilderAPI_MakeFace_15(innerCircleWire, true).Face();
                
                // Create the gear disk by cutting the inner circle from the outer circle
                const gearDisk = new ocInstance.BRepAlgoAPI_Cut_3(outerCircleFace, innerCircleFace).Shape();
                
                // Extrude the gear disk to create a 3D gear
                const gearBody = new ocInstance.BRepPrimAPI_MakePrism_1(
                    gearDisk,
                    new ocInstance.gp_Vec_4(0, 0, thickness),
                    false,
                    true
                ).Shape();
                
                // Create teeth by making a series of cuts around the perimeter
                let finalGear = gearBody;
                
                for (let i = 0; i < teeth; i++) {
                    const angle = (i * 2 * Math.PI) / teeth;
                    
                    // Create a tooth cutter
                    const toothWidth = (Math.PI * pitchRadius) / teeth * 0.4; // 40% of tooth pitch
                    const toothHeight = addendum * 0.9;
                    
                    // Position the tooth cutter
                    const toothX = (pitchRadius + toothHeight/2) * Math.cos(angle);
                    const toothY = (pitchRadius + toothHeight/2) * Math.sin(angle);
                    
                    // Create a box for the tooth
                    const toothCutter = new ocInstance.BRepPrimAPI_MakeBox_3(
                        toothWidth,
                        toothHeight,
                        thickness * 1.2
                    ).Shape();
                    
                    // Position and rotate the tooth cutter
                    const toothTransform = new ocInstance.gp_Trsf_1();
                    toothTransform.SetRotation(
                        new ocInstance.gp_Ax1_2(
                            new ocInstance.gp_Pnt_3(0, 0, 0),
                            new ocInstance.gp_Dir_4(0, 0, 1)
                        ),
                        angle + Math.PI/2
                    );
                    toothTransform.SetTranslationPart(
                        new ocInstance.gp_Vec_4(toothX, toothY, -thickness * 0.1)
                    );
                    
                    const toothLocation = new ocInstance.TopLoc_Location_2(toothTransform);
                    const transformedToothCutter = new ocInstance.BRepBuilderAPI_Transform_2(
                        toothCutter,
                        toothTransform,
                        true
                    ).Shape();
                    
                    // Cut the tooth shape from the gear
                    finalGear = new ocInstance.BRepAlgoAPI_Cut_3(finalGear, transformedToothCutter).Shape();
                }
                
                currentModel = finalGear;
                
                // Convert to mesh for Babylon.js
                const mesh = await convertOCShapeToBabylonMesh(finalGear, 'gear');
                currentMesh = mesh;
                
                statusText.text = 'Gear created successfully';
            } catch (error) {
                statusText.text = 'Error creating gear: ' + error.message;
                console.error('Error creating gear:', error);
            }
        }
        
        // Sample 2: Create a parametric bottle (classic OpenCascade example)
        async function createBottle() {
            if (!ocInstance) {
                const initialized = await initOC();
                if (!initialized) return;
            }
            
            // Remove previous model if exists
            if (currentMesh) {
                currentMesh.dispose();
                currentMesh = null;
            }
            
            statusText.text = 'Creating bottle...';
            
            try {
                // Bottle parameters
                const width = 5.0;
                const height = 10.0;
                const thickness = 0.5;
                
                // The bottle is created in the xz plane
                const aProfile = new ocInstance.TColgp_Array1OfPnt_2(1, 6);
                const aPnt1 = new ocInstance.gp_Pnt_3(-width / 2.0, 0, 0);
                const aPnt2 = new ocInstance.gp_Pnt_3(-width / 2.0, 0, thickness);
                const aPnt3 = new ocInstance.gp_Pnt_3(0, 0, height - thickness);
                const aPnt4 = new ocInstance.gp_Pnt_3(0, 0, height);
                const aPnt5 = new ocInstance.gp_Pnt_3(width / 2.0, 0, 0);
                const aPnt6 = new ocInstance.gp_Pnt_3(width / 2.0, 0, thickness);
                
                aProfile.SetValue(1, aPnt1);
                aProfile.SetValue(2, aPnt2);
                aProfile.SetValue(3, aPnt3);
                aProfile.SetValue(4, aPnt4);
                aProfile.SetValue(5, aPnt5);
                aProfile.SetValue(6, aPnt6);
                
                // Create a wire from the points
                const aWire = new ocInstance.BRepBuilderAPI_MakePolygon_1();
                for (let i = 1; i <= 6; i++) {
                    aWire.Add(aProfile.Value(i));
                }
                aWire.Close();
                
                // Create a face from the wire
                const aFace = new ocInstance.BRepBuilderAPI_MakeFace_15(aWire.Wire(), true).Face();
                
                // Create a revolution around the Z-axis
                const anAxis = new ocInstance.gp_Ax1_2(
                    new ocInstance.gp_Pnt_3(0, 0, 0),
                    new ocInstance.gp_Dir_4(0, 1, 0)
                );
                
                const aRevol = new ocInstance.BRepPrimAPI_MakeRevol_1(
                    aFace,
                    anAxis,
                    2.0 * Math.PI,
                    true
                );
                
                const aBottle = aRevol.Shape();
                
                // Create a neck for the bottle
                const neckRadius = width / 6.0;
                const neckHeight = height / 6.0;
                
                const neckLocation = new ocInstance.gp_Pnt_3(0, 0, height - neckHeight / 2.0);
                const neckAxis = new ocInstance.gp_Ax2_3(
                    neckLocation,
                    new ocInstance.gp_Dir_4(0, 0, 1)
                );
                
                const neckCylinder = new ocInstance.BRepPrimAPI_MakeCylinder_3(
                    neckAxis,
                    neckRadius,
                    neckHeight
                ).Shape();
                
                // Create a boolean operation to add the neck to the bottle
                const bottleWithNeck = new ocInstance.BRepAlgoAPI_Fuse_3(
                    aBottle,
                    neckCylinder
                ).Shape();
                
                // Create a thread on the neck
                const threadRadius = neckRadius * 1.1;
                const threadPitch = neckHeight / 10.0;
                const threadHeight = neckHeight * 0.8;
                const threadStartZ = height - threadHeight;
                
                // Create a helix for the thread
                const threadAxis = new ocInstance.gp_Ax2_3(
                    new ocInstance.gp_Pnt_3(0, 0, threadStartZ),
                    new ocInstance.gp_Dir_4(0, 0, 1)
                );
                
                const threadHelix = new ocInstance.Geom_Helix(
                    threadAxis,
                    threadRadius,
                    threadPitch,
                    0.0,
                    true
                );
                
                const threadEdge = new ocInstance.BRepBuilderAPI_MakeEdge_24(
                    new ocInstance.Handle_Geom_Curve_2(threadHelix)
                ).Edge();
                
                const threadWire = new ocInstance.BRepBuilderAPI_MakeWire_2(threadEdge).Wire();
                
                // Create a circular profile for the thread
                const threadProfileRadius = threadPitch * 0.2;
                const threadProfileCenter = new ocInstance.gp_Pnt_3(threadRadius, 0, threadStartZ);
                const threadProfileAxis = new ocInstance.gp_Ax2_3(
                    threadProfileCenter,
                    new ocInstance.gp_Dir_4(1, 0, 0)
                );
                
                const threadProfile = new ocInstance.gp_Circ_2(threadProfileAxis, threadProfileRadius);
                const threadProfileEdge = new ocInstance.BRepBuilderAPI_MakeEdge_24(threadProfile).Edge();
                const threadProfileWire = new ocInstance.BRepBuilderAPI_MakeWire_2(threadProfileEdge).Wire();
                const threadProfileFace = new ocInstance.BRepBuilderAPI_MakeFace_15(threadProfileWire, true).Face();
                
                // Sweep the profile along the helix
                const threadPipe = new ocInstance.BRepOffsetAPI_MakePipe_2(
                    threadWire,
                    threadProfileFace
                ).Shape();
                
                // Add the thread to the bottle
                const finalBottle = new ocInstance.BRepAlgoAPI_Fuse_3(
                    bottleWithNeck,
                    threadPipe
                ).Shape();
                
                currentModel = finalBottle;
                
                // Convert to mesh for Babylon.js
                const mesh = await convertOCShapeToBabylonMesh(finalBottle, 'bottle');
                currentMesh = mesh;
                
                statusText.text = 'Bottle created successfully';
            } catch (error) {
                statusText.text = 'Error creating bottle: ' + error.message;
                console.error('Error creating bottle:', error);
            }
        }
        
        // Sample 3: Create a threaded rod
        async function createThreadedRod() {
            if (!ocInstance) {
                const initialized = await initOC();
                if (!initialized) return;
            }
            
            // Remove previous model if exists
            if (currentMesh) {
                currentMesh.dispose();
                currentMesh = null;
            }
            
            statusText.text = 'Creating threaded rod...';
            
            try {
                // Parameters
                const rodLength = 5.0;
                const rodRadius = 0.5;
                const threadPitch = 0.125;
                const threadDepth = 0.05;
                
                // Create the base cylinder
                const cylinder = new ocInstance.BRepPrimAPI_MakeCylinder_3(
                    rodRadius,
                    rodLength
                ).Shape();
                
                // Create a helix for the thread
                const threadAxis = new ocInstance.gp_Ax2_3(
                    new ocInstance.gp_Pnt_3(0, 0, 0),
                    new ocInstance.gp_Dir_4(0, 0, 1)
                );
                
                const threadHelix = new ocInstance.Geom_Helix(
                    threadAxis,
                    rodRadius,
                    threadPitch,
                    0.0,
                    true
                );
                
                const threadEdge = new ocInstance.BRepBuilderAPI_MakeEdge_24(
                    new ocInstance.Handle_Geom_Curve_2(threadHelix)
                ).Edge();
                
                const threadWire = new ocInstance.BRepBuilderAPI_MakeWire_2(threadEdge).Wire();
                
                // Create a triangular profile for the thread
                const profilePoints = [];
                profilePoints.push(new ocInstance.gp_Pnt_3(rodRadius, 0, 0));
                profilePoints.push(new ocInstance.gp_Pnt_3(rodRadius + threadDepth, threadPitch / 4, 0));
                profilePoints.push(new ocInstance.gp_Pnt_3(rodRadius, threadPitch / 2, 0));
                
                const profileWire = new ocInstance.BRepBuilderAPI_MakePolygon_1();
                profilePoints.forEach(point => profileWire.Add(point));
                profileWire.Close();
                
                const profileFace = new ocInstance.BRepBuilderAPI_MakeFace_15(profileWire.Wire(), true).Face();
                
                // Sweep the profile along the helix
                const threadPipe = new ocInstance.BRepOffsetAPI_MakePipe_2(
                    threadWire,
                    profileFace
                ).Shape();
                
                // Create the threaded rod by fusing the cylinder and thread
                const threadedRod = new ocInstance.BRepAlgoAPI_Fuse_3(
                    cylinder,
                    threadPipe
                ).Shape();
                
                currentModel = threadedRod;
                
                // Convert to mesh for Babylon.js
                const mesh = await convertOCShapeToBabylonMesh(threadedRod, 'threadedRod');
                currentMesh = mesh;
                
                statusText.text = 'Threaded rod created successfully';
            } catch (error) {
                statusText.text = 'Error creating threaded rod: ' + error.message;
                console.error('Error creating threaded rod:', error);
            }
        }
        
        // Sample 4: Create a box with fillets
        async function createFilletBox() {
            if (!ocInstance) {
                const initialized = await initOC();
                if (!initialized) return;
            }
            
            // Remove previous model if exists
            if (currentMesh) {
                currentMesh.dispose();
                currentMesh = null;
            }
            
            statusText.text = 'Creating filleted box...';
            
            try {
                // Create a box
                const box = new ocInstance.BRepPrimAPI_MakeBox_3(2, 2, 2).Shape();
                
                // Get all the edges of the box
                const edgeExplorer = new ocInstance.TopExp_Explorer_2(box, ocInstance.TopAbs_ShapeEnum.TopAbs_EDGE);
                
                // Create a fillet maker
                const filletMaker = new ocInstance.BRepFilletAPI_MakeFillet_2(box);
                
                // Add all edges with a radius
                while (edgeExplorer.More()) {
                    const edge = edgeExplorer.Current();
                    filletMaker.Add(0.2, edge);
                    edgeExplorer.Next();
                }
                
                // Create the filleted box
                const filletedBox = filletMaker.Shape();
                
                currentModel = filletedBox;
                
                // Convert to mesh for Babylon.js
                const mesh = await convertOCShapeToBabylonMesh(filletedBox, 'filletedBox');
                currentMesh = mesh;
                
                statusText.text = 'Filleted box created successfully';
            } catch (error) {
                statusText.text = 'Error creating filleted box: ' + error.message;
                console.error('Error creating filleted box:', error);
            }
        }
        
        // Sample 5: Create boolean operations example
        async function createBooleanOperations() {
            if (!ocInstance) {
                const initialized = await initOC();
                if (!initialized) return;
            }
            
            // Remove previous model if exists
            if (currentMesh) {
                currentMesh.dispose();
                currentMesh = null;
            }
            
            statusText.text = 'Creating boolean operations example...';
            
            try {
                // Create a box
                const box = new ocInstance.BRepPrimAPI_MakeBox_3(2, 2, 2).Shape();
                
                // Create a sphere
                const sphereCenter = new ocInstance.gp_Pnt_3(1, 1, 1);
                const sphere = new ocInstance.BRepPrimAPI_MakeSphere_3(sphereCenter, 1.2).Shape();
                
                // Create a cylinder
                const cylinderAxis = new ocInstance.gp_Ax2_3(
                    new ocInstance.gp_Pnt_3(1, 1, 0),
                    new ocInstance.gp_Dir_4(0, 0, 1)
                );
                const cylinder = new ocInstance.BRepPrimAPI_MakeCylinder_3(
                    cylinderAxis,
                    0.5,
                    3
                ).Shape();
                
                // Perform boolean operations
                // 1. Intersection of box and sphere
                const intersection = new ocInstance.BRepAlgoAPI_Common_3(box, sphere).Shape();
                
                // 2. Subtract cylinder from the intersection
                const result = new ocInstance.BRepAlgoAPI_Cut_3(intersection, cylinder).Shape();
                
                currentModel = result;
                
                // Convert to mesh for Babylon.js
                const mesh = await convertOCShapeToBabylonMesh(result, 'booleanOperations');
                currentMesh = mesh;
                
                statusText.text = 'Boolean operations example created successfully';
            } catch (error) {
                statusText.text = 'Error creating boolean operations example: ' + error.message;
                console.error('Error creating boolean operations example:', error);
            }
        }
        
        // Convert OpenCascade shape to Babylon.js mesh
        async function convertOCShapeToBabylonMesh(shape, name) {
            // Mesh the shape
            new ocInstance.BRepMesh_IncrementalMesh_2(shape, 0.1, false, 0.1, false);
            
            // Get the faces
            const explorer = new ocInstance.TopExp_Explorer_2(shape, ocInstance.TopAbs_ShapeEnum.TopAbs_FACE);
            
            // Create a new mesh
            const mesh = new BABYLON.Mesh(name, scene);
            const positions = [];
            const indices = [];
            const normals = [];
            
            let faceIndex = 0;
            
            while (explorer.More()) {
                const face = ocInstance.TopoDS.Face_1(explorer.Current());
                const location = new ocInstance.TopLoc_Location_1();
                const triangulation = ocInstance.BRep_Tool.Triangulation(face, location);
                
                if (triangulation.IsNull()) {
                    explorer.Next();
                    continue;
                }
                
                const transform = location.Transformation();
                const triangleCount = triangulation.NbTriangles();
                
                // Get vertices
                const vertices = [];
                for (let i = 1; i <= triangulation.NbNodes(); i++) {
                    const point = triangulation.Node(i);
                    const transformedPoint = point.Transformed(transform);
                    vertices.push(new BABYLON.Vector3(
                        transformedPoint.X(),
                        transformedPoint.Y(),
                        transformedPoint.Z()
                    ));
                }
                
                // Get triangles
                for (let i = 1; i <= triangleCount; i++) {
                    const triangle = triangulation.Triangle(i);
                    const idx1 = triangle.Value(1);
                    const idx2 = triangle.Value(2);
                    const idx3 = triangle.Value(3);
                    
                    // Add vertices to positions array
                    positions.push(vertices[idx1-1].x, vertices[idx1-1].y, vertices[idx1-1].z);
                    positions.push(vertices[idx2-1].x, vertices[idx2-1].y, vertices[idx2-1].z);
                    positions.push(vertices[idx3-1].x, vertices[idx3-1].y, vertices[idx3-1].z);
                    
                    // Add indices
                    indices.push(faceIndex, faceIndex + 1, faceIndex + 2);
                    faceIndex += 3;
                }
                
                explorer.Next();
            }
            
            // Compute normals
            BABYLON.VertexData.ComputeNormals(positions, indices, normals);
            
            // Apply vertex data to mesh
            const vertexData = new BABYLON.VertexData();
            vertexData.positions = positions;
            vertexData.indices = indices;
            vertexData.normals = normals;
            vertexData.applyToMesh(mesh);
            
            // Create a default material
            const material = new BABYLON.StandardMaterial('material', scene);
            material.diffuseColor = new BABYLON.Color3(0.7, 0.7, 0.7);
            material.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
            mesh.material = material;
            
            return mesh;
        }
        
        // Initialize OpenCascade.js
        initOC();
        
        // Return the API
        return {
            panel,
            createGear,
            createBottle,
            createThreadedRod,
            createFilletBox,
            createBooleanOperations
        };
    };
});