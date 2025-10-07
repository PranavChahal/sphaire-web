// OpenCascade.js integration with Babylon.js
window.addEventListener('DOMContentLoaded', function() {
    // Create OpenCascade loader functionality
    function createOpenCascadeLoader(scene) {
        // Check if OpenCascade.js is loaded - but continue anyway to provide the API
        const isOpenCascadeLoaded = (typeof initOpenCascade === 'function' || typeof window.opencascade !== 'undefined');
        if (!isOpenCascadeLoaded) {
            console.warn('OpenCascade.js is not loaded. Some functionality will be limited.');
            // We'll continue anyway to provide the API structure
        }

        // Create a StackPanel for OpenCascade controls
        const advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI('OpenCascadeLoaderUI');
        
        const panel = new BABYLON.GUI.StackPanel();
        panel.width = '220px';
        panel.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
        panel.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
        panel.top = '20px';
        panel.right = '20px';
        panel.background = 'rgba(43, 43, 43, 0.7)';
        panel.paddingTop = '10px';
        panel.paddingBottom = '10px';
        panel.paddingLeft = '10px';
        panel.paddingRight = '10px';
        panel.cornerRadius = 10;
        advancedTexture.addControl(panel);
        
        // Add a header
        const header = new BABYLON.GUI.TextBlock();
        header.text = 'OpenCascade Loader';
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
        statusText.paddingTop = '10px';
        panel.addControl(statusText);
        
        // Initialize OpenCascade.js
        let ocInstance = null;
        
        // Function to initialize OpenCascade.js
        async function initOC() {
            try {
                statusText.text = 'Initializing OpenCascade.js...';
                
                // Check which initialization method is available
                if (typeof initOpenCascade === 'function') {
                    // New beta version approach
                    try {
                        ocInstance = await initOpenCascade({
                            libs: [
                                // Include all necessary modules
                                window.ocCore,
                                window.ocModelingAlgorithms,
                                window.ocVisualApplication,
                                window.ocDataExchangeBase,
                                window.ocDataExchangeExtra
                            ]
                        });
                    } catch (e) {
                        console.warn('Failed to initialize OpenCascade.js with modules:', e);
                        // Try without modules specification
                        ocInstance = await initOpenCascade();
                    }
                } else if (typeof window.opencascade !== 'undefined') {
                    // Fallback to older version or direct global object
                    ocInstance = window.opencascade;
                } else {
                    // Show a more helpful message in the UI
                    statusText.text = 'OpenCascade.js not available - See instructions';
                    
                    // Add instructions text
                    const instructionsText = new BABYLON.GUI.TextBlock();
                    instructionsText.text = 'To use OpenCascade.js:\n1. Download from GitHub\n2. Include in your project\n3. Use the API provided here';
                    instructionsText.height = '80px';
                    instructionsText.color = 'white';
                    instructionsText.fontSize = 12;
                    instructionsText.textWrapping = true;
                    panel.addControl(instructionsText);
                    
                    throw new Error('OpenCascade.js initialization method not found');
                }
                
                statusText.text = 'OpenCascade.js initialized';
                return true;
            } catch (error) {
                statusText.text = 'OpenCascade.js not available';
                console.warn('OpenCascade.js initialization failed:', error);
                return false;
            }
        }
        
        // Function to convert OpenCascade shape to Babylon.js mesh
        function ocShapeToBabylonMesh(shape, name, scene) {
            if (!ocInstance) {
                statusText.text = 'OpenCascade.js not available';
                console.warn('Cannot convert shape: OpenCascade.js not initialized');
                return null;
            }
            
            try {
                statusText.text = 'Converting shape to mesh...';
                console.log('Starting OpenCascade shape to Babylon.js mesh conversion');
                
                // Log available classes for debugging
                console.log('Available RWGltf classes:', 
                    Object.keys(ocInstance).filter(key => key.startsWith('RWGltf')));
                console.log('Available TDocStd classes:', 
                    Object.keys(ocInstance).filter(key => key.startsWith('TDocStd')));
                
                // Create a document and add the shape to it
                console.log('Creating TDocStd_Document...');
                const doc = new ocInstance.TDocStd_Document(new ocInstance.TCollection_ExtendedString_1());
                console.log('Document created successfully');
                
                console.log('Getting shape tool...');
                const shapeTool = ocInstance.XCAFDoc_DocumentTool.ShapeTool(doc.Main()).get();
                console.log('Shape tool obtained successfully');
                
                console.log('Setting shape...');
                shapeTool.SetShape(shapeTool.NewShape(), shape);
                console.log('Shape set successfully');
                
                // Mesh the shape
                console.log('Meshing shape...');
                new ocInstance.BRepMesh_IncrementalMesh_2(shape, 0.1, false, 0.1, false);
                console.log('Shape meshed successfully');
                
                // Export to GLB
                console.log('Exporting to GLB...');
                const tempGlbPath = "./temp.glb";
                console.log('GLB path:', tempGlbPath);
                
                try {
                    const asciiString = new ocInstance.TCollection_AsciiString_2(tempGlbPath);
                    console.log('AsciiString created successfully');
                    
                    const cafWriter = new ocInstance.RWGltf_CafWriter(asciiString, true);
                    console.log('RWGltf_CafWriter created successfully');
                    
                    const docHandle = new ocInstance.Handle_TDocStd_Document_2(doc);
                    console.log('Handle_TDocStd_Document_2 created successfully');
                    
                    const stringMap = new ocInstance.TColStd_IndexedDataMapOfStringString_1();
                    console.log('TColStd_IndexedDataMapOfStringString_1 created successfully');
                    
                    const progressRange = new ocInstance.Message_ProgressRange_1();
                    console.log('Message_ProgressRange_1 created successfully');
                    
                    console.log('Calling Perform_2...');
                    cafWriter.Perform_2(docHandle, stringMap, progressRange);
                    console.log('GLB export successful');
                } catch (exportError) {
                    console.error('Error during GLB export:', exportError);
                    statusText.text = 'Error exporting to GLB: ' + exportError.message;
                    throw exportError;
                }
                
                // Read the GLB file from the virtual file system
                console.log('Reading GLB file from virtual file system...');
                let glbFile;
                try {
                    glbFile = ocInstance.FS.readFile(tempGlbPath, { encoding: "binary" });
                    console.log('GLB file read successfully, size:', glbFile.length);
                } catch (readError) {
                    console.error('Error reading GLB file:', readError);
                    statusText.text = 'Error reading GLB file: ' + readError.message;
                    throw readError;
                }
                
                console.log('Creating Blob and URL...');
                const glbBlob = new Blob([glbFile.buffer], { type: "model/gltf-binary" });
                const glbUrl = URL.createObjectURL(glbBlob);
                console.log('GLB URL created:', glbUrl);
                
                // Load the GLB into Babylon.js
                console.log('Loading GLB into Babylon.js...');
                return new Promise((resolve, reject) => {
                    // More comprehensive BABYLON availability check
                    if (!window.BABYLON) {
                        reject(new Error('BABYLON is not available on window object'));
                        return;
                    }
                    if (!window.BABYLON.SceneLoader) {
                        reject(new Error('BABYLON.SceneLoader is not available'));
                        return;
                    }
                    if (!window.BABYLON.SceneLoader.ImportMesh) {
                        reject(new Error('BABYLON.SceneLoader.ImportMesh is not available'));
                        return;
                    }
                    
                    console.log('BABYLON ImportMesh available, loading GLB from blob:', glbUrl);
                    
                    window.BABYLON.SceneLoader.ImportMesh(
                        "", 
                        glbUrl, 
                        "", 
                        scene, 
                        function(meshes) {
                            console.log('GLB imported successfully, meshes:', meshes.length);
                            
                            // Set a name for all loaded meshes for easy identification
                            meshes.forEach(mesh => {
                                mesh.name = name || 'ocMesh';
                            });
                            
                            // Create a parent mesh to hold all imported meshes
                            const parentMesh = new BABYLON.Mesh(name || 'ocMesh', scene);
                            meshes.forEach(mesh => {
                                if (mesh !== parentMesh) {
                                    mesh.parent = parentMesh;
                                }
                            });
                            
                            statusText.text = 'Shape converted successfully';
                            resolve(parentMesh);
                            
                            // Clean up the URL
                            URL.revokeObjectURL(glbUrl);
                        }, 
                        null, 
                        function(scene, message) {
                            console.error('Error loading GLB:', message);
                            statusText.text = 'Error loading GLB: ' + message;
                            reject(new Error('Error loading GLB: ' + message));
                            URL.revokeObjectURL(glbUrl);
                        }
                    );
                });
            } catch (error) {
                statusText.text = 'Error converting shape: ' + error.message;
                console.error('Error converting OpenCascade shape to Babylon.js mesh:', error);
                return null;
            }
        }
        
        // Alternative method: Direct conversion from OpenCascade to Babylon.js
        function ocShapeToBabylonMeshDirect(shape, name, scene) {
            if (!ocInstance) {
                statusText.text = 'OpenCascade.js not available';
                console.warn('Cannot convert shape directly: OpenCascade.js not initialized');
                return null;
            }
            
            try {
                statusText.text = 'Converting shape to mesh directly...';
                
                // Mesh the shape
                new ocInstance.BRepMesh_IncrementalMesh_2(shape, 0.1, false, 0.1, false);
                
                // Create a new Babylon.js mesh
                const babylonMesh = new BABYLON.Mesh(name || 'ocMesh', scene);
                
                // Create vertex data to hold the mesh data
                const vertexData = new BABYLON.VertexData();
                const positions = [];
                const indices = [];
                const normals = [];
                
                // Extract faces from the shape
                const explorer = new ocInstance.TopExp_Explorer_2(shape, ocInstance.TopAbs_ShapeEnum.TopAbs_FACE);
                let faceIndex = 0;
                
                while (explorer.More()) {
                    const face = ocInstance.TopoDS.Face_1(explorer.Current());
                    const location = new ocInstance.TopLoc_Location_1();
                    
                    // Get triangulation of the face
                    const triangulation = ocInstance.BRep_Tool.Triangulation(face, location);
                    
                    if (!triangulation.IsNull()) {
                        const tri = triangulation.get();
                        const nbTriangles = tri.NbTriangles();
                        const nbNodes = tri.NbNodes();
                        
                        // Get transformation matrix
                        const trsf = location.Transformation();
                        
                        // Add vertices
                        const vertexOffset = positions.length / 3;
                        for (let i = 1; i <= nbNodes; i++) {
                            const node = tri.Node(i);
                            let p = new ocInstance.gp_Pnt_1(node.X(), node.Y(), node.Z());
                            
                            // Apply transformation
                            p.Transform(trsf);
                            
                            positions.push(p.X());
                            positions.push(p.Y());
                            positions.push(p.Z());
                        }
                        
                        // Add triangles
                        const isReversed = (face.Orientation() === ocInstance.TopAbs_Orientation.TopAbs_REVERSED);
                        
                        for (let i = 1; i <= nbTriangles; i++) {
                            const triangle = tri.Triangle(i);
                            let n1, n2, n3;
                            triangle.Get(n1, n2, n3);
                            
                            // Adjust for 0-based indexing
                            n1 = n1 - 1 + vertexOffset;
                            n2 = n2 - 1 + vertexOffset;
                            n3 = n3 - 1 + vertexOffset;
                            
                            // Reverse orientation if needed
                            if (isReversed) {
                                indices.push(n1, n3, n2);
                            } else {
                                indices.push(n1, n2, n3);
                            }
                        }
                    }
                    
                    explorer.Next();
                    faceIndex++;
                }
                
                // Compute normals
                BABYLON.VertexData.ComputeNormals(positions, indices, normals);
                
                // Apply vertex data to the mesh
                vertexData.positions = positions;
                vertexData.indices = indices;
                vertexData.normals = normals;
                vertexData.applyToMesh(babylonMesh);
                
                // Create and apply material with backface culling disabled
                const material = new BABYLON.StandardMaterial(name + '_material', scene);
                material.diffuseColor = new BABYLON.Color3(0.7, 0.7, 0.9);
                material.specularColor = new BABYLON.Color3(0.3, 0.3, 0.3);
                material.backFaceCulling = false; // Disable backface culling to make all faces visible
                material.twoSidedLighting = true; // Enable two-sided lighting for better visibility
                babylonMesh.material = material;
                
                statusText.text = 'Shape converted successfully';
                return babylonMesh;
            } catch (error) {
                statusText.text = 'Error converting shape: ' + error.message;
                console.error('Error converting OpenCascade shape to Babylon.js mesh directly:', error);
                return null;
            }
        }
        
        // Create sample OpenCascade shapes
        function createSampleBox(scene) {
            if (!ocInstance) {
                statusText.text = 'Cannot create box: OpenCascade.js not available';
                console.warn('Cannot create sample box: OpenCascade.js not initialized');
                return;
            }
            
            try {
                // Remove any previously loaded models
                const existingModels = scene.meshes.filter(mesh => mesh.name === 'ocBox');
                existingModels.forEach(mesh => mesh.dispose());
                
                // Create a box using OpenCascade
                const box = new ocInstance.BRepPrimAPI_MakeBox_2(1, 1, 1).Shape();
                
                // Convert to Babylon.js mesh
                ocShapeToBabylonMesh(box, 'ocBox', scene).then(mesh => {
                    // Apply material
                    const material = new BABYLON.StandardMaterial('boxMaterial', scene);
                    material.diffuseColor = new BABYLON.Color3(0.4, 0.6, 0.9);
                    mesh.material = material;
                    
                    statusText.text = 'Box created';
                });
            } catch (error) {
                statusText.text = 'Error creating box: ' + error.message;
                console.error('Error creating OpenCascade box:', error);
            }
        }
        
        function createSampleCylinder(scene) {
            if (!ocInstance) {
                statusText.text = 'Cannot create cylinder: OpenCascade.js not available';
                console.warn('Cannot create sample cylinder: OpenCascade.js not initialized');
                return;
            }
            
            try {
                // Remove any previously loaded models
                const existingModels = scene.meshes.filter(mesh => mesh.name === 'ocCylinder');
                existingModels.forEach(mesh => mesh.dispose());
                
                // Create a cylinder using OpenCascade
                const cylinder = new ocInstance.BRepPrimAPI_MakeCylinder_3(
                    new ocInstance.gp_Ax2_3(
                        new ocInstance.gp_Pnt_3(0, 0, 0),
                        new ocInstance.gp_Dir_4(0, 0, 1)
                    ),
                    0.5, // radius
                    1    // height
                ).Shape();
                
                // Convert to Babylon.js mesh
                ocShapeToBabylonMesh(cylinder, 'ocCylinder', scene).then(mesh => {
                    // Apply material
                    const material = new BABYLON.StandardMaterial('cylinderMaterial', scene);
                    material.diffuseColor = new BABYLON.Color3(0.9, 0.4, 0.5);
                    mesh.material = material;
                    
                    statusText.text = 'Cylinder created';
                });
            } catch (error) {
                statusText.text = 'Error creating cylinder: ' + error.message;
                console.error('Error creating OpenCascade cylinder:', error);
            }
        }
        
        function createBottleDemo(scene) {
            if (!ocInstance) {
                statusText.text = 'Cannot create bottle: OpenCascade.js not available';
                console.warn('Cannot create bottle demo: OpenCascade.js not initialized');
                return;
            }
            
            try {
                // Remove any previously loaded models
                const existingModels = scene.meshes.filter(mesh => mesh.name === 'ocBottle');
                existingModels.forEach(mesh => mesh.dispose());
                
                // Parameters for the bottle
                const myWidth = 50;
                const myHeight = 70;
                const myThickness = 30;
                
                // Profile: Define support points
                const aPnt1 = new ocInstance.gp_Pnt_3(-myWidth / 2, 0, 0);
                const aPnt2 = new ocInstance.gp_Pnt_3(-myWidth / 2, -myThickness / 4, 0);
                const aPnt3 = new ocInstance.gp_Pnt_3(0, -myThickness / 2, 0);
                const aPnt4 = new ocInstance.gp_Pnt_3(myWidth / 2, -myThickness / 4, 0);
                const aPnt5 = new ocInstance.gp_Pnt_3(myWidth / 2, 0, 0);
                
                // Profile: Define the geometry
                const aArcOfCircle = new ocInstance.GC_MakeArcOfCircle_4(aPnt2, aPnt3, aPnt4).Value();
                const aSegment1 = new ocInstance.GC_MakeSegment_1(aPnt1, aPnt2).Value();
                const aSegment2 = new ocInstance.GC_MakeSegment_1(aPnt4, aPnt5).Value();
                
                // Profile: Define the topology
                const aEdge1 = new ocInstance.BRepBuilderAPI_MakeEdge_24(aSegment1).Edge();
                const aEdge2 = new ocInstance.BRepBuilderAPI_MakeEdge_24(aArcOfCircle).Edge();
                const aEdge3 = new ocInstance.BRepBuilderAPI_MakeEdge_24(aSegment2).Edge();
                
                const aWire = new ocInstance.BRepBuilderAPI_MakeWire_1();
                aWire.Add_2(aEdge1);
                aWire.Add_2(aEdge2);
                aWire.Add_2(aEdge3);
                
                // Complete the profile
                const myWireProfile = aWire.Wire();
                
                // Body: Prism the profile
                const myFaceProfile = new ocInstance.BRepBuilderAPI_MakeFace_15(myWireProfile).Face();
                const aPrismVec = new ocInstance.gp_Vec_4(0, 0, myHeight);
                const myBody = new ocInstance.BRepPrimAPI_MakePrism_1(myFaceProfile, aPrismVec).Shape();
                
                // Create a fillet on all edges
                const mkFillet = new ocInstance.BRepFilletAPI_MakeFillet(myBody);
                const anEdgeExplorer = new ocInstance.TopExp_Explorer_2(myBody, ocInstance.TopAbs_ShapeEnum.TopAbs_EDGE);
                
                while (anEdgeExplorer.More()) {
                    const anEdge = ocInstance.TopoDS.Edge_1(anEdgeExplorer.Current());
                    mkFillet.Add_2(myThickness / 12, anEdge);
                    anEdgeExplorer.Next();
                }
                
                const myBodyWithFillet = mkFillet.Shape();
                
                // Convert to Babylon.js mesh
                ocShapeToBabylonMesh(myBodyWithFillet, 'ocBottle', scene).then(mesh => {
                    // Apply material
                    const material = new BABYLON.StandardMaterial('bottleMaterial', scene);
                    material.diffuseColor = new BABYLON.Color3(0.6, 0.8, 1.0);
                    material.alpha = 0.7; // Make it slightly transparent
                    mesh.material = material;
                    
                    statusText.text = 'Bottle created';
                });
            } catch (error) {
                statusText.text = 'Error creating bottle: ' + error.message;
                console.error('Error creating OpenCascade bottle:', error);
            }
        }
        
        // Add sample model buttons
        function addSampleModelButton(panel, scene, label, createModelFunction) {
            const button = BABYLON.GUI.Button.CreateSimpleButton('sample' + label.replace(' ', ''), label);
            button.width = '200px';
            button.height = '30px';
            button.color = 'white';
            button.background = '#607D8B';
            button.cornerRadius = 5;
            button.paddingTop = '5px';
            button.paddingBottom = '5px';
            button.paddingLeft = '10px';
            button.paddingRight = '10px';
            button.onPointerUpObservable.add(function() {
                createModelFunction(scene);
            });
            panel.addControl(button);
        }
        
        // Add sample model buttons
        addSampleModelButton(panel, scene, 'Create OC Box', createSampleBox);
        addSampleModelButton(panel, scene, 'Create OC Cylinder', createSampleCylinder);
        addSampleModelButton(panel, scene, 'Create OC Bottle', createBottleDemo);
        
        // Add a button to manually initialize OpenCascade.js
        const initButton = BABYLON.GUI.Button.CreateSimpleButton('initOCButton', 'Initialize OpenCascade.js');
        initButton.width = '200px';
        initButton.height = '30px';
        initButton.color = 'white';
        initButton.background = '#4CAF50';
        initButton.cornerRadius = 5;
        initButton.paddingTop = '5px';
        initButton.paddingBottom = '5px';
        initButton.paddingLeft = '10px';
        initButton.paddingRight = '10px';
        initButton.onPointerUpObservable.add(function() {
            initOC().then(success => {
                if (success) {
                    statusText.text = 'OpenCascade.js initialized successfully';
                    initButton.isVisible = false;
                }
            });
        });
        panel.addControl(initButton);
        
        // Try to initialize OpenCascade.js
        if (isOpenCascadeLoaded) {
            initOC().then(success => {
                if (success) {
                    initButton.isVisible = false;
                }
            });
        }
        
        // Return the API for external use
        return {
            panel,
            initOC,
            ocShapeToBabylonMesh,
            ocShapeToBabylonMeshDirect,
            createSampleBox,
            createSampleCylinder,
            createBottleDemo
        };
    }
    
    // Export the createOpenCascadeLoader function to make it available to app.js
    window.createOpenCascadeLoader = createOpenCascadeLoader;
});