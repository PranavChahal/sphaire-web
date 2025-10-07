// Model Loader for the 3D Viewer
window.addEventListener('DOMContentLoaded', function() {
    // Create model loading functionality
    function createModelLoader(scene) {
        // Create a StackPanel for model loading controls
        const advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI('ModelLoaderUI');
        
        const panel = new BABYLON.GUI.StackPanel();
        panel.width = '220px';
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
        advancedTexture.addControl(panel);
        
        // Add a header
        const header = new BABYLON.GUI.TextBlock();
        header.text = 'Model Loader';
        header.height = '30px';
        header.color = 'white';
        header.fontSize = 16;
        header.fontWeight = 'bold';
        header.paddingBottom = '10px';
        panel.addControl(header);
        
        // Add file input button
        const loadButton = BABYLON.GUI.Button.CreateSimpleButton('loadModel', 'Load 3D Model');
        loadButton.width = '200px';
        loadButton.height = '30px';
        loadButton.color = 'white';
        loadButton.background = '#2196F3';
        loadButton.cornerRadius = 5;
        loadButton.paddingTop = '5px';
        loadButton.paddingBottom = '5px';
        loadButton.paddingLeft = '10px';
        loadButton.paddingRight = '10px';
        loadButton.onPointerUpObservable.add(function() {
            // Create a file input element
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = '.glb,.gltf,.obj,.stl,.babylon';
            fileInput.style.display = 'none';
            document.body.appendChild(fileInput);
            
            // Trigger click on the file input
            fileInput.click();
            
            // Handle file selection
            fileInput.onchange = function() {
                if (fileInput.files && fileInput.files.length > 0) {
                    const file = fileInput.files[0];
                    const fileName = file.name.toLowerCase();
                    const fileExtension = fileName.split('.').pop();
                    
                    // Create a URL for the file
                    const fileURL = URL.createObjectURL(file);
                    
                    // Remove any previously loaded models
                    const existingModels = scene.meshes.filter(mesh => mesh.name === 'loadedModel');
                    existingModels.forEach(mesh => mesh.dispose());
                    
                    // Load the model based on file extension
                    loadModel(scene, fileURL, fileExtension);
                }
                
                // Clean up
                document.body.removeChild(fileInput);
            };
        });
        panel.addControl(loadButton);
        
        // Add sample models
        addSampleModelButton(panel, scene, 'Load Cube', createCube);
        addSampleModelButton(panel, scene, 'Load Sphere', createSphere);
        addSampleModelButton(panel, scene, 'Load Cylinder', createCylinder);
        
        // Add status text
        const statusText = new BABYLON.GUI.TextBlock();
        statusText.text = 'Ready';
        statusText.height = '30px';
        statusText.color = 'white';
        statusText.fontSize = 12;
        statusText.paddingTop = '10px';
        panel.addControl(statusText);
        
        return panel;
    }
    
    // Function to load a model based on file extension
    function loadModel(scene, fileURL, fileExtension) {
        // Update status
        const statusText = scene.getTextureByName('ModelLoaderUI')
            .getControlByName('statusText');
        if (statusText) {
            statusText.text = 'Loading...';
        }
        
        // Choose the appropriate loader based on file extension
        switch (fileExtension) {
            case 'glb':
            case 'gltf':
                // Check BABYLON availability
                if (!window.BABYLON || !window.BABYLON.SceneLoader || !window.BABYLON.SceneLoader.ImportMesh) {
                    console.error('BABYLON.SceneLoader.ImportMesh is not available');
                    if (statusText) statusText.text = 'Error: BABYLON.js not loaded';
                    return;
                }
                
                window.BABYLON.SceneLoader.ImportMesh('', fileURL, '', scene, function(meshes) {
                    // Set a name for all loaded meshes for easy identification
                    meshes.forEach(mesh => {
                        mesh.name = 'loadedModel';
                    });
                    
                    // Update status
                    if (statusText) {
                        statusText.text = 'Model loaded successfully';
                    }
                }, null, function(scene, message) {
                    // Handle error
                    if (statusText) {
                        statusText.text = 'Error: ' + message;
                    }
                });
                break;
                
            case 'obj':
                // Check BABYLON availability
                if (!window.BABYLON || !window.BABYLON.SceneLoader || !window.BABYLON.SceneLoader.ImportMesh) {
                    console.error('BABYLON.SceneLoader.ImportMesh is not available');
                    if (statusText) statusText.text = 'Error: BABYLON.js not loaded';
                    return;
                }
                
                window.BABYLON.SceneLoader.ImportMesh('', fileURL, '', scene, function(meshes) {
                    // Set a name for all loaded meshes for easy identification
                    meshes.forEach(mesh => {
                        mesh.name = 'loadedModel';
                    });
                    
                    // Update status
                    if (statusText) {
                        statusText.text = 'Model loaded successfully';
                    }
                }, null, function(scene, message) {
                    // Handle error
                    if (statusText) {
                        statusText.text = 'Error: ' + message;
                    }
                });
                break;
                
            case 'stl':
                // Check BABYLON availability
                if (!window.BABYLON || !window.BABYLON.SceneLoader || !window.BABYLON.SceneLoader.ImportMesh) {
                    console.error('BABYLON.SceneLoader.ImportMesh is not available');
                    if (statusText) statusText.text = 'Error: BABYLON.js not loaded';
                    return;
                }
                
                window.BABYLON.SceneLoader.ImportMesh('', fileURL, '', scene, function(meshes) {
                    // Set a name for all loaded meshes for easy identification
                    meshes.forEach(mesh => {
                        mesh.name = 'loadedModel';
                    });
                    
                    // Update status
                    if (statusText) {
                        statusText.text = 'Model loaded successfully';
                    }
                }, null, function(scene, message) {
                    // Handle error
                    if (statusText) {
                        statusText.text = 'Error: ' + message;
                    }
                });
                break;
                
            case 'babylon':
                // Check BABYLON availability
                if (!window.BABYLON || !window.BABYLON.SceneLoader || !window.BABYLON.SceneLoader.ImportMesh) {
                    console.error('BABYLON.SceneLoader.ImportMesh is not available');
                    if (statusText) statusText.text = 'Error: BABYLON.js not loaded';
                    return;
                }
                
                window.BABYLON.SceneLoader.ImportMesh('', fileURL, '', scene, function(meshes) {
                    // Set a name for all loaded meshes for easy identification
                    meshes.forEach(mesh => {
                        mesh.name = 'loadedModel';
                    });
                    
                    // Update status
                    if (statusText) {
                        statusText.text = 'Model loaded successfully';
                    }
                }, null, function(scene, message) {
                    // Handle error
                    if (statusText) {
                        statusText.text = 'Error: ' + message;
                    }
                });
                break;
                
            default:
                // Unsupported format
                if (statusText) {
                    statusText.text = 'Unsupported file format: ' + fileExtension;
                }
                break;
        }
    }
    
    // Helper function to add a sample model button
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
            // Remove any previously loaded models
            const existingModels = scene.meshes.filter(mesh => mesh.name === 'loadedModel');
            existingModels.forEach(mesh => mesh.dispose());
            
            // Create the sample model
            createModelFunction(scene);
            
            // Update status
            const statusText = scene.getTextureByName('ModelLoaderUI')
                .getControlByName('statusText');
            if (statusText) {
                statusText.text = label + ' loaded';
            }
        });
        panel.addControl(button);
    }
    
    // Sample model creation functions
    function createCube(scene) {
        const cube = BABYLON.MeshBuilder.CreateBox('loadedModel', { size: 2 }, scene);
        const material = new BABYLON.StandardMaterial('cubeMaterial', scene);
        material.diffuseColor = new BABYLON.Color3(0.4, 0.6, 0.9);
        cube.material = material;
        return cube;
    }
    
    function createSphere(scene) {
        const sphere = BABYLON.MeshBuilder.CreateSphere('loadedModel', { diameter: 2 }, scene);
        const material = new BABYLON.StandardMaterial('sphereMaterial', scene);
        material.diffuseColor = new BABYLON.Color3(0.9, 0.4, 0.5);
        sphere.material = material;
        return sphere;
    }
    
    function createCylinder(scene) {
        const cylinder = BABYLON.MeshBuilder.CreateCylinder('loadedModel', { 
            height: 2, 
            diameter: 1.5 
        }, scene);
        const material = new BABYLON.StandardMaterial('cylinderMaterial', scene);
        material.diffuseColor = new BABYLON.Color3(0.5, 0.8, 0.3);
        cylinder.material = material;
        return cylinder;
    }
    
    // Export the createModelLoader function to make it available to app.js
    window.createModelLoader = createModelLoader;
});