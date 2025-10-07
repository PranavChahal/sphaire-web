// Initialize the Babylon.js engine and scene
window.addEventListener('DOMContentLoaded', function() {
    // Create loading overlay
    const loadingOverlay = document.createElement('div');
    loadingOverlay.className = 'loading-overlay';
    loadingOverlay.innerHTML = `
        <div class="loading-spinner"></div>
        <div>Loading 3D Viewer...</div>
    `;
    document.body.appendChild(loadingOverlay);
    
    // Get the canvas element
    const canvas = document.getElementById('renderCanvas');
    
    // Initialize the Babylon Engine
    const engine = new BABYLON.Engine(canvas, true);
    
    // Add error handling
    window.addEventListener('error', function(event) {
        showError('An error occurred: ' + event.message);
    });
    
    // Function to show error messages
    function showError(message) {
        // Remove any existing error messages
        const existingErrors = document.querySelectorAll('.error-message');
        existingErrors.forEach(el => el.remove());
        
        // Create and show new error message
        const errorMessage = document.createElement('div');
        errorMessage.className = 'error-message';
        errorMessage.textContent = message;
        document.body.appendChild(errorMessage);
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            errorMessage.remove();
        }, 5000);
    }
    
    // Create the scene
    const createScene = function() {
        // Create a new scene
        const scene = new BABYLON.Scene(engine);
        
        // Set a clear color for the scene (black background)
        scene.clearColor = new BABYLON.Color4(0.05, 0.05, 0.05, 1);
        
        // Create an ArcRotateCamera (orbital camera like in Blender)
        const camera = new BABYLON.ArcRotateCamera(
            'camera',
            -Math.PI / 2,  // alpha - rotation around y-axis
            Math.PI / 2.5, // beta - rotation around x-axis
            10,            // radius - distance from target
            BABYLON.Vector3.Zero(), // target position
            scene
        );
        
        // Attach the camera to the canvas
        camera.attachControl(canvas, true);
        
        // Set some camera limits to improve user experience
        camera.lowerRadiusLimit = 2;
        camera.upperRadiusLimit = 50;
        
        // Add a hemispheric light to illuminate the scene
        const light = new BABYLON.HemisphericLight(
            'light',
            new BABYLON.Vector3(0, 1, 0),
            scene
        );
        light.intensity = 0.7;
        
        // Create a grid system similar to Blender
        createGrid(scene);
        
        // Optional: Add axis indicators
        createAxisIndicators(scene);
        
        // Add UI controls if the createUI function is available
        if (typeof window.createUI === 'function') {
            window.createUI(scene);
        }
        
        // OLD MODEL LOADERS - Commented out to avoid conflicts with unified loader
        // Add model loader if the createModelLoader function is available
        // if (typeof window.createModelLoader === 'function') {
        //     window.createModelLoader(scene);
        // }
        
        // Add OpenCascade loader if the createOpenCascadeLoader function is available
        // if (typeof window.createOpenCascadeLoader === 'function') {
        //     window.createOpenCascadeLoader(scene);
        // }
        
        // Add unified model loader if the createUnifiedModelLoader function is available
        if (typeof window.createUnifiedModelLoader === 'function') {
            window.createUnifiedModelLoader(scene);
        }
        
        // Add parametric OpenCascade modeler if available
        console.log('Checking createParametricModeler:', typeof window.createParametricModeler);
        if (typeof window.createParametricModeler === 'function') {
            console.log('Calling createParametricModeler');
            window.createParametricModeler(scene);
        }
        
        // Add OpenCascade sample code if available
        console.log('Checking createOpenCascadeSample:', typeof window.createOpenCascadeSample);
        if (typeof window.createOpenCascadeSample === 'function') {
            console.log('Calling createOpenCascadeSample');
            window.createOpenCascadeSample(scene);
        }
        
        // Add OpenCascade code prompt if available
        console.log('Checking createOpenCascadeCodePrompt:', typeof window.createOpenCascadeCodePrompt);
        if (typeof window.createOpenCascadeCodePrompt === 'function') {
            console.log('Calling createOpenCascadeCodePrompt');
            window.createOpenCascadeCodePrompt(scene);
        }
        
        return scene;
    };
    
    // Function to create a grid similar to Blender
    function createGrid(scene) {
        // Create the main grid (ground plane)
        const gridSize = 20;
        const gridPrecision = 1; // 1 unit between each line
        
        // Check if GridMaterial is available
        if (typeof BABYLON.GridMaterial === 'function') {
            // Use GridMaterial if available
            const gridMaterial = new BABYLON.GridMaterial('gridMaterial', scene);
            
            // Configure grid material
            gridMaterial.majorUnitFrequency = 5; // Major grid line every 5 units
            gridMaterial.minorUnitVisibility = 0.45; // Opacity of minor grid lines
            gridMaterial.gridRatio = 1; // Grid ratio
            gridMaterial.backFaceCulling = false;
            gridMaterial.mainColor = new BABYLON.Color3(0.2, 0.2, 0.2); // Main color (dark gray)
            gridMaterial.lineColor = new BABYLON.Color3(0.4, 0.4, 0.4); // Line color (light gray)
            gridMaterial.opacity = 0.8;
            
            // Create a ground plane for the XZ grid (horizontal like in Blender)
            const xzGrid = BABYLON.MeshBuilder.CreateGround(
                'xzGrid',
                {
                    width: gridSize * 2,
                    height: gridSize * 2,
                    subdivisions: gridSize * 2 / gridPrecision
                },
                scene
            );
            xzGrid.material = gridMaterial;
            
            // Create additional grids for XY and YZ planes (optional)
            // XY Grid (vertical)
            const xyGrid = BABYLON.MeshBuilder.CreateGround(
                'xyGrid',
                {
                    width: gridSize * 2,
                    height: gridSize * 2,
                    subdivisions: gridSize * 2 / gridPrecision
                },
                scene
            );
            xyGrid.material = gridMaterial.clone('xyGridMaterial');
            xyGrid.material.opacity = 0.15; // Make it more transparent
            xyGrid.rotation.x = Math.PI / 2;
            xyGrid.position.z = -gridSize;
            
            // YZ Grid (vertical)
            const yzGrid = BABYLON.MeshBuilder.CreateGround(
                'yzGrid',
                {
                    width: gridSize * 2,
                    height: gridSize * 2,
                    subdivisions: gridSize * 2 / gridPrecision
                },
                scene
            );
            yzGrid.material = gridMaterial.clone('yzGridMaterial');
            yzGrid.material.opacity = 0.15; // Make it more transparent
            yzGrid.rotation.z = Math.PI / 2;
            yzGrid.position.x = -gridSize;
        } else {
            // Fallback to create grid with lines if GridMaterial is not available
            createGridWithLines(scene, gridSize);
        }
    }
    
    // Alternative grid creation using lines
    function createGridWithLines(scene, gridSize) {
        const lines = [];
        const gridColor = new BABYLON.Color3(0.5, 0.5, 0.5);
        const majorGridColor = new BABYLON.Color3(0.7, 0.7, 0.7);
        
        // Create XZ grid (horizontal)
        for (let i = -gridSize; i <= gridSize; i++) {
            const color = i % 5 === 0 ? majorGridColor : gridColor;
            const alpha = i % 5 === 0 ? 0.75 : 0.5;
            
            // X lines
            const xLine = BABYLON.MeshBuilder.CreateLines('xLine' + i, {
                points: [
                    new BABYLON.Vector3(i, 0, -gridSize),
                    new BABYLON.Vector3(i, 0, gridSize)
                ],
                colors: [
                    color.scale(alpha),
                    color.scale(alpha)
                ]
            }, scene);
            lines.push(xLine);
            
            // Z lines
            const zLine = BABYLON.MeshBuilder.CreateLines('zLine' + i, {
                points: [
                    new BABYLON.Vector3(-gridSize, 0, i),
                    new BABYLON.Vector3(gridSize, 0, i)
                ],
                colors: [
                    color.scale(alpha),
                    color.scale(alpha)
                ]
            }, scene);
            lines.push(zLine);
        }
        
        // Create a semi-transparent ground for the grid
        const ground = BABYLON.MeshBuilder.CreateGround(
            'ground',
            { width: gridSize * 2, height: gridSize * 2 },
            scene
        );
        const groundMat = new BABYLON.StandardMaterial('groundMat', scene);
        groundMat.diffuseColor = new BABYLON.Color3(0.1, 0.1, 0.1);
        groundMat.alpha = 0.1;
        groundMat.backFaceCulling = false;
        ground.material = groundMat;
        
        // Optional: Create vertical grids with lower opacity
        createVerticalGrid(scene, gridSize, 'xz', new BABYLON.Vector3(0, 0, -gridSize), 0.1);
        createVerticalGrid(scene, gridSize, 'yz', new BABYLON.Vector3(-gridSize, 0, 0), 0.1);
    }
    
    // Helper function to create vertical grids
    function createVerticalGrid(scene, gridSize, plane, position, alpha) {
        const lines = [];
        const gridColor = new BABYLON.Color3(0.4, 0.4, 0.4);
        
        for (let i = -gridSize; i <= gridSize; i += 5) { // Only major lines for vertical grids
            if (plane === 'xz') {
                // X lines (vertical)
                const xLine = BABYLON.MeshBuilder.CreateLines('xzLine' + i, {
                    points: [
                        new BABYLON.Vector3(i, -gridSize, position.z),
                        new BABYLON.Vector3(i, gridSize, position.z)
                    ],
                    colors: [
                        gridColor.scale(alpha),
                        gridColor.scale(alpha)
                    ]
                }, scene);
                lines.push(xLine);
                
                // Y lines (horizontal)
                const yLine = BABYLON.MeshBuilder.CreateLines('xzYLine' + i, {
                    points: [
                        new BABYLON.Vector3(-gridSize, i, position.z),
                        new BABYLON.Vector3(gridSize, i, position.z)
                    ],
                    colors: [
                        gridColor.scale(alpha),
                        gridColor.scale(alpha)
                    ]
                }, scene);
                lines.push(yLine);
            } else if (plane === 'yz') {
                // Y lines (vertical)
                const yLine = BABYLON.MeshBuilder.CreateLines('yzLine' + i, {
                    points: [
                        new BABYLON.Vector3(position.x, i, -gridSize),
                        new BABYLON.Vector3(position.x, i, gridSize)
                    ],
                    colors: [
                        gridColor.scale(alpha),
                        gridColor.scale(alpha)
                    ]
                }, scene);
                lines.push(yLine);
                
                // Z lines (horizontal)
                const zLine = BABYLON.MeshBuilder.CreateLines('yzZLine' + i, {
                    points: [
                        new BABYLON.Vector3(position.x, -gridSize, i),
                        new BABYLON.Vector3(position.x, gridSize, i)
                    ],
                    colors: [
                        gridColor.scale(alpha),
                        gridColor.scale(alpha)
                    ]
                }, scene);
                lines.push(zLine);
            }
        }
    }
    
    // Function to create axis indicators (X, Y, Z)
    function createAxisIndicators(scene) {
        const axisLength = 2;
        const axisWidth = 0.05;
        
        // X-axis (red)
        const xAxis = BABYLON.MeshBuilder.CreateCylinder(
            'xAxis',
            { height: axisLength, diameter: axisWidth },
            scene
        );
        xAxis.rotation.z = Math.PI / 2;
        xAxis.position = new BABYLON.Vector3(axisLength / 2, 0, 0);
        xAxis.material = new BABYLON.StandardMaterial('xAxisMat', scene);
        xAxis.material.diffuseColor = new BABYLON.Color3(1, 0, 0); // Red
        xAxis.material.specularColor = new BABYLON.Color3(0, 0, 0);
        
        // Y-axis (green)
        const yAxis = BABYLON.MeshBuilder.CreateCylinder(
            'yAxis',
            { height: axisLength, diameter: axisWidth },
            scene
        );
        yAxis.position = new BABYLON.Vector3(0, axisLength / 2, 0);
        yAxis.material = new BABYLON.StandardMaterial('yAxisMat', scene);
        yAxis.material.diffuseColor = new BABYLON.Color3(0, 1, 0); // Green
        yAxis.material.specularColor = new BABYLON.Color3(0, 0, 0);
        
        // Z-axis (blue)
        const zAxis = BABYLON.MeshBuilder.CreateCylinder(
            'zAxis',
            { height: axisLength, diameter: axisWidth },
            scene
        );
        zAxis.rotation.x = Math.PI / 2;
        zAxis.position = new BABYLON.Vector3(0, 0, axisLength / 2);
        zAxis.material = new BABYLON.StandardMaterial('zAxisMat', scene);
        zAxis.material.diffuseColor = new BABYLON.Color3(0, 0, 1); // Blue
        zAxis.material.specularColor = new BABYLON.Color3(0, 0, 0);
    }
    
    // Create the scene
    const scene = createScene();
    
    // Remove loading overlay when the scene is ready
    scene.executeWhenReady(function() {
        // Remove loading overlay
        const loadingOverlay = document.querySelector('.loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.style.opacity = '0';
            setTimeout(() => {
                loadingOverlay.remove();
            }, 500);
        }
        
        // Add info panel
        const infoPanel = document.createElement('div');
        infoPanel.className = 'info-panel';
        infoPanel.innerHTML = `
            <div><strong>Babylon.js 3D Viewer</strong></div>
            <div>Use left-click to rotate, right-click to pan, scroll to zoom</div>
            <div>Use the panels on the left and right to control the viewer</div>
        `;
        document.body.appendChild(infoPanel);
        
        // Auto-hide info panel after 10 seconds
        setTimeout(() => {
            infoPanel.style.opacity = '0';
            setTimeout(() => {
                infoPanel.remove();
            }, 500);
        }, 10000);
    });
    
    // Run the render loop
    engine.runRenderLoop(function() {
        scene.render();
    });
    
    // Handle browser resize
    window.addEventListener('resize', function() {
        engine.resize();
    });
});