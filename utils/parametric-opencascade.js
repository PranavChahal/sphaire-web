// Parametric OpenCascade.js Modeling Tool
window.addEventListener('DOMContentLoaded', function() {
    // Create the parametric modeling UI and functionality
    window.createParametricModeler = function(scene) {
        console.log('createParametricModeler called');
        // Check if OpenCascade.js is loaded
        const isOpenCascadeLoaded = (typeof initOpenCascade === 'function' || typeof window.opencascade !== 'undefined');
        console.log('OpenCascade loaded for parametric:', isOpenCascadeLoaded, 'initOpenCascade:', typeof initOpenCascade, 'window.opencascade:', typeof window.opencascade);
        if (!isOpenCascadeLoaded) {
            console.warn('OpenCascade.js is not loaded. Parametric modeling will not be available.');
            return;
        }

        let ocInstance = null;
        let currentModel = null;
        let currentMesh = null;
        let parametersUI = {};
        
        // Create a StackPanel for parametric controls
        const advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI('ParametricModelingUI');
        
        const panel = new BABYLON.GUI.StackPanel();
        panel.width = '300px';
        panel.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        panel.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
        panel.top = '20px';
        panel.left = '20px';
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
        header.text = 'Parametric Modeling';
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
        
        // Create model selection header
        const modelLabel = new BABYLON.GUI.TextBlock();
        modelLabel.text = 'Select Model:';
        modelLabel.height = '25px';
        modelLabel.color = 'white';
        modelLabel.fontSize = 14;
        modelLabel.fontWeight = 'bold';
        modelLabel.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        panel.addControl(modelLabel);
        
        // Add model options
        const modelOptions = [
            { text: 'Box', value: 'box' },
            { text: 'Cylinder', value: 'cylinder' },
            { text: 'Sphere', value: 'sphere' },
            { text: 'Torus', value: 'torus' },
            { text: 'Custom Shape', value: 'custom' }
        ];
        
        // Create buttons for model selection instead of dropdown
        const modelSelectionContainer = new BABYLON.GUI.StackPanel();
        modelSelectionContainer.isVertical = true;
        modelSelectionContainer.width = '200px';
        
        let currentModelType = null;
        
        modelOptions.forEach(option => {
            const button = BABYLON.GUI.Button.CreateSimpleButton(option.value + 'Button', option.text);
            button.width = '200px';
            button.height = '30px';
            button.color = 'white';
            button.cornerRadius = 5;
            button.background = 'rgba(70, 70, 70, 1)';
            button.hoverCursor = 'pointer';
            button.paddingTop = '2px';
            
            button.onPointerUpObservable.add(() => {
                // Update all button colors
                modelSelectionContainer.children.forEach(child => {
                    if (child.background) {
                        child.background = 'rgba(70, 70, 70, 1)';
                    }
                });
                // Highlight selected button
                button.background = '#4CAF50';
                
                currentModelType = option.value;
                updateParametersForModel(option.value);
            });
            
            modelSelectionContainer.addControl(button);
        });
        
        panel.addControl(modelSelectionContainer);
        
        // Parameters container
        const parametersContainer = new BABYLON.GUI.StackPanel();
        parametersContainer.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
        parametersContainer.paddingTop = '10px';
        panel.addControl(parametersContainer);
        
        // Create button
        const createButton = BABYLON.GUI.Button.CreateSimpleButton('createButton', 'Create Model');
        createButton.width = '150px';
        createButton.height = '30px';
        createButton.color = 'white';
        createButton.background = 'green';
        createButton.paddingTop = '10px';
        createButton.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        createButton.onPointerUpObservable.add(function() {
            createParametricModel();
        });
        panel.addControl(createButton);
        
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
        
        // Create a number input with label
        function createParameterInput(name, label, defaultValue, min, max, step) {
            const container = new BABYLON.GUI.StackPanel();
            container.isVertical = false;
            container.height = '30px';
            container.paddingTop = '5px';
            container.paddingBottom = '5px';
            
            const labelText = new BABYLON.GUI.TextBlock();
            labelText.text = label + ':';
            labelText.width = '100px';
            labelText.color = 'white';
            labelText.fontSize = 14;
            container.addControl(labelText);
            
            const input = new BABYLON.GUI.InputText();
            input.width = '180px';
            input.height = '30px';
            input.text = defaultValue.toString();
            input.color = 'white';
            input.background = 'rgba(70, 70, 70, 1)';
            input.fontSize = 14;
            container.addControl(input);
            
            parametersUI[name] = input;
            return container;
        }
        
        // Update parameters based on selected model
        function updateParametersForModel(modelType) {
            // Clear previous parameters
            parametersContainer.children.slice().forEach(child => {
                parametersContainer.removeControl(child);
            });
            parametersUI = {};
            
            // Add parameters based on selected model
            switch(modelType) {
                case 'box':
                    parametersContainer.addControl(createParameterInput('width', 'Width', 1, 0.1, 10, 0.1));
                    parametersContainer.addControl(createParameterInput('height', 'Height', 1, 0.1, 10, 0.1));
                    parametersContainer.addControl(createParameterInput('depth', 'Depth', 1, 0.1, 10, 0.1));
                    break;
                case 'cylinder':
                    parametersContainer.addControl(createParameterInput('radius', 'Radius', 0.5, 0.1, 5, 0.1));
                    parametersContainer.addControl(createParameterInput('height', 'Height', 2, 0.1, 10, 0.1));
                    break;
                case 'sphere':
                    parametersContainer.addControl(createParameterInput('radius', 'Radius', 1, 0.1, 5, 0.1));
                    break;
                case 'torus':
                    parametersContainer.addControl(createParameterInput('radius1', 'Major Radius', 1, 0.1, 5, 0.1));
                    parametersContainer.addControl(createParameterInput('radius2', 'Minor Radius', 0.3, 0.1, 2, 0.1));
                    break;
                case 'custom':
                    parametersContainer.addControl(createParameterInput('param1', 'Parameter 1', 1, 0.1, 10, 0.1));
                    parametersContainer.addControl(createParameterInput('param2', 'Parameter 2', 1, 0.1, 10, 0.1));
                    parametersContainer.addControl(createParameterInput('param3', 'Parameter 3', 1, 0.1, 10, 0.1));
                    break;
            }
        }
        
        // Function to create a parametric model
        async function createParametricModel() {
            if (!ocInstance) {
                const initialized = await initOC();
                if (!initialized) return;
            }
            
            // Remove previous model if exists
            if (currentMesh) {
                currentMesh.dispose();
                currentMesh = null;
            }
            
            statusText.text = 'Creating model...';
            
            try {
                // Get parameters from UI
                const params = {};
                Object.keys(parametersUI).forEach(key => {
                    params[key] = parseFloat(parametersUI[key].text);
                });
                
                // Create OpenCascade shape based on selected model
                const modelType = currentModelType;
                if (!modelType) {
                    statusText.text = 'Please select a model type';
                    return;
                }
                
                let shape;
                switch(modelType) {
                    case 'box':
                        const origin = new ocInstance.gp_Pnt_3(0, 0, 0);
                        shape = new ocInstance.BRepPrimAPI_MakeBox_3(
                            origin,
                            params.width || 1,
                            params.height || 1,
                            params.depth || 1
                        ).Shape();
                        break;
                    case 'cylinder':
                        shape = new ocInstance.BRepPrimAPI_MakeCylinder_1(
                            params.radius || 0.5,
                            params.height || 2
                        ).Shape();
                        break;
                    case 'sphere':
                        shape = new ocInstance.BRepPrimAPI_MakeSphere_1(
                            params.radius || 1
                        ).Shape();
                        break;
                    case 'torus':
                        shape = new ocInstance.BRepPrimAPI_MakeTorus_1(
                            params.radius1 || 1,
                            params.radius2 || 0.3
                        ).Shape();
                        break;
                    case 'custom':
                        // Example of a custom parametric shape
                        // Create a box
                        const boxOrigin = new ocInstance.gp_Pnt_3(0, 0, 0);
                        const box = new ocInstance.BRepPrimAPI_MakeBox_3(
                            boxOrigin,
                            params.param1 || 1,
                            params.param2 || 1,
                            params.param3 || 1
                        ).Shape();
                        
                        // Create a sphere for boolean operation
                        const sphere = new ocInstance.BRepPrimAPI_MakeSphere_1(
                            params.param1 / 1.5 || 0.7
                        ).Shape();
                        
                        // Perform a boolean subtraction
                        const boolOp = new ocInstance.BRepAlgoAPI_Cut_3(box, sphere);
                        shape = boolOp.Shape();
                        break;
                    default:
                        throw new Error('Unknown model type');
                }
                
                currentModel = shape;
                
                // Convert to mesh for Babylon.js
                const mesh = await convertOCShapeToBabylonMesh(shape, modelType);
                currentMesh = mesh;
                
                statusText.text = 'Model created successfully';
            } catch (error) {
                statusText.text = 'Error creating model: ' + error.message;
                console.error('Error creating parametric model:', error);
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
            material.diffuseColor = new BABYLON.Color3(0.7, 0.7, 0.9);
            material.specularColor = new BABYLON.Color3(0.3, 0.3, 0.3);
            material.backFaceCulling = false; // Disable backface culling to make all faces visible
            material.twoSidedLighting = true; // Enable two-sided lighting for better visibility
            mesh.material = material;
            
            return mesh;
        }
        
        // Initialize OpenCascade.js
        initOC();
        
        // Return the API
        return {
            panel,
            createModel: createParametricModel
        };
    };
});