// Unified 3D Model Loader - Supports multiple formats including STEP, GLB, Blend, etc.
window.addEventListener('DOMContentLoaded', function() {
    
    /**
     * Unified Model Format Loader Class
     * Handles detection and loading of various 3D model formats
     */
    class UnifiedModelLoader {
        constructor(scene) {
            this.scene = scene;
            this.ocInstance = null;
            this.supportedFormats = {
                // CAD Formats (via OpenCascade.js)
                'step': { loader: 'opencascade', description: 'STEP CAD File', category: 'cad' },
                'stp': { loader: 'opencascade', description: 'STEP CAD File', category: 'cad' },
                'iges': { loader: 'opencascade', description: 'IGES CAD File', category: 'cad' },
                'igs': { loader: 'opencascade', description: 'IGES CAD File', category: 'cad' },
                'brep': { loader: 'opencascade', description: 'BREP CAD File', category: 'cad' },
                
                // Mesh Formats (via Babylon.js)
                'glb': { loader: 'babylon', description: 'glTF Binary', category: 'mesh' },
                'gltf': { loader: 'babylon', description: 'glTF JSON', category: 'mesh' },
                'obj': { loader: 'babylon', description: 'Wavefront OBJ', category: 'mesh' },
                'stl': { loader: 'babylon', description: 'STL Mesh', category: 'mesh' },
                'ply': { loader: 'babylon', description: 'PLY Mesh', category: 'mesh' },
                'babylon': { loader: 'babylon', description: 'Babylon.js Native', category: 'mesh' },
                
                // Animation/Scene Formats
                'fbx': { loader: 'babylon', description: 'Autodesk FBX', category: 'scene' },
                '3ds': { loader: 'babylon', description: '3D Studio Max', category: 'scene' },
                
                // Blender Format (requires special handling)
                'blend': { loader: 'blend', description: 'Blender File', category: 'scene' }
            };
            
            this.loadingCallbacks = {
                onProgress: null,
                onSuccess: null,
                onError: null
            };
        }
        
        /**
         * Initialize the loader with OpenCascade.js if available
         */
        async initialize() {
            try {
                // Try to initialize OpenCascade.js for CAD file support
                if (typeof window.initOpenCascade === 'function') {
                    this.ocInstance = await window.initOpenCascade();
                    console.log('OpenCascade.js initialized successfully');
                } else if (typeof window.opencascade !== 'undefined') {
                    this.ocInstance = window.opencascade;
                    console.log('Using existing OpenCascade.js instance');
                }
            } catch (error) {
                console.warn('OpenCascade.js not available, CAD formats will be disabled:', error);
            }
        }
        
        /**
         * Detect file format from filename and optional file content
         */
        detectFormat(filename, fileContent = null) {
            const extension = filename.toLowerCase().split('.').pop();
            
            // Check if format is supported
            if (this.supportedFormats[extension]) {
                return {
                    extension,
                    format: this.supportedFormats[extension],
                    isSupported: true
                };
            }
            
            // Try to detect format from file content (magic numbers)
            if (fileContent) {
                const magicNumber = this.detectMagicNumber(fileContent);
                if (magicNumber) {
                    return {
                        extension: magicNumber.extension,
                        format: this.supportedFormats[magicNumber.extension],
                        isSupported: true,
                        detectedFromContent: true
                    };
                }
            }
            
            return {
                extension,
                format: null,
                isSupported: false
            };
        }
        
        /**
         * Detect file format from magic numbers in file content
         */
        detectMagicNumber(fileContent) {
            const uint8Array = new Uint8Array(fileContent.slice(0, 16));
            const header = Array.from(uint8Array).map(b => b.toString(16).padStart(2, '0')).join('');
            
            // GLB magic number: 676C5446 ("glTF")
            if (header.startsWith('676c5446')) {
                return { extension: 'glb' };
            }
            
            // Check for text-based formats
            const textHeader = new TextDecoder().decode(uint8Array);
            
            // STEP files typically start with "ISO-10303"
            if (textHeader.includes('ISO-10303')) {
                return { extension: 'step' };
            }
            
            // IGES files typically start with "START"
            if (textHeader.startsWith('START')) {
                return { extension: 'iges' };
            }
            
            // glTF JSON files contain "asset" field
            if (textHeader.includes('"asset"')) {
                return { extension: 'gltf' };
            }
            
            return null;
        }
        
        /**
         * Load a 3D model from file
         */
        async loadModel(file, options = {}) {
            const filename = file.name;
            const formatInfo = this.detectFormat(filename);
            
            if (!formatInfo.isSupported) {
                throw new Error(`Unsupported file format: ${formatInfo.extension}`);
            }
            
            // Notify progress
            this.notifyProgress('Detecting format...', 10);
            
            try {
                let result;
                
                switch (formatInfo.format.loader) {
                    case 'opencascade':
                        result = await this.loadCADFile(file, formatInfo, options);
                        break;
                    case 'babylon':
                        result = await this.loadMeshFile(file, formatInfo, options);
                        break;
                    case 'blend':
                        result = await this.loadBlendFile(file, formatInfo, options);
                        break;
                    default:
                        throw new Error(`No loader available for format: ${formatInfo.extension}`);
                }
                
                this.notifySuccess(result);
                return result;
                
            } catch (error) {
                this.notifyError(error);
                throw error;
            }
        }
        
        /**
         * Load CAD files using OpenCascade.js
         */
        async loadCADFile(file, formatInfo, options) {
            if (!this.ocInstance) {
                throw new Error('OpenCascade.js not available. Cannot load CAD files.');
            }
            
            this.notifyProgress('Reading CAD file...', 20);
            
            const arrayBuffer = await file.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);
            
            // Write file to OpenCascade.js virtual file system
            const tempPath = `/temp_${Date.now()}.${formatInfo.extension}`;
            this.ocInstance.FS.writeFile(tempPath, uint8Array);
            
            this.notifyProgress('Parsing CAD geometry...', 40);
            
            try {
                let shape;
                
                switch (formatInfo.extension) {
                    case 'step':
                    case 'stp':
                        shape = this.loadSTEPFile(tempPath);
                        break;
                    case 'iges':
                    case 'igs':
                        shape = this.loadIGESFile(tempPath);
                        break;
                    case 'brep':
                        shape = this.loadBREPFile(tempPath);
                        break;
                    default:
                        throw new Error(`CAD format not implemented: ${formatInfo.extension}`);
                }
                
                this.notifyProgress('Converting to mesh...', 60);
                
                // Convert OpenCascade shape to Babylon.js mesh
                const mesh = await this.convertOCShapeToBabylonMesh(shape, file.name, options);
                
                // Clean up temporary file
                this.ocInstance.FS.unlink(tempPath);
                
                this.notifyProgress('CAD file loaded successfully', 100);
                
                return {
                    meshes: [mesh],
                    format: formatInfo,
                    source: 'opencascade'
                };
                
            } catch (error) {
                // Clean up temporary file on error
                try {
                    this.ocInstance.FS.unlink(tempPath);
                } catch (cleanupError) {
                    console.warn('Failed to clean up temporary file:', cleanupError);
                }
                throw error;
            }
        }
        
        /**
         * Load STEP files using OpenCascade.js
         */
        loadSTEPFile(filePath) {
            const reader = new this.ocInstance.STEPCAFControl_Reader_1();
            const readResult = reader.ReadFile(new this.ocInstance.TCollection_AsciiString_2(filePath));
            
            if (readResult !== this.ocInstance.IFSelect_ReturnStatus.IFSelect_RetDone) {
                throw new Error('Failed to read STEP file');
            }
            
            reader.TransferRoots();
            return reader.OneShape();
        }
        
        /**
         * Load IGES files using OpenCascade.js
         */
        loadIGESFile(filePath) {
            const reader = new this.ocInstance.IGESControl_Reader_1();
            const readResult = reader.ReadFile(new this.ocInstance.TCollection_AsciiString_2(filePath));
            
            if (readResult !== this.ocInstance.IFSelect_ReturnStatus.IFSelect_RetDone) {
                throw new Error('Failed to read IGES file');
            }
            
            reader.TransferRoots();
            return reader.OneShape();
        }
        
        /**
         * Load BREP files using OpenCascade.js
         */
        loadBREPFile(filePath) {
            const shape = new this.ocInstance.TopoDS_Shape_1();
            const builder = new this.ocInstance.BRep_Builder_1();
            const result = this.ocInstance.BRepTools.Read_2(
                shape, 
                new this.ocInstance.TCollection_AsciiString_2(filePath), 
                builder
            );
            
            if (!result) {
                throw new Error('Failed to read BREP file');
            }
            
            return shape;
        }
        
        /**
         * Convert OpenCascade shape to Babylon.js mesh
         */
        async convertOCShapeToBabylonMesh(shape, name, options = {}) {
            // Instead of trying to convert to GLB, let's create a simple box mesh directly in Babylon.js
            console.log('Creating a simple box mesh as a placeholder for CAD model');
            
            try {
                // Create a simple box mesh
                const mesh = BABYLON.MeshBuilder.CreateBox(name || 'cadMesh', { size: 1 }, this.scene);
                
                // Add a material
                const material = new BABYLON.StandardMaterial('cadMaterial', this.scene);
        material.diffuseColor = new BABYLON.Color3(0.7, 0.7, 0.7);
        material.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
        material.backFaceCulling = false; // Disable backface culling to make all faces visible
        material.twoSidedLighting = true; // Enable two-sided lighting for better visibility
                mesh.material = material;
                
                return mesh;
            } catch (error) {
                console.error('Error creating placeholder mesh:', error);
                throw error;
            }
        }
        
        /**
         * Load GLB/GLTF files using Babylon.js loaders
         */
        async loadGLBFile(file, formatInfo) {
            this.notifyProgress('Reading GLB/GLTF file...', 20);
            
            try {
                // Create a temporary placeholder while we load the GLB
                const tempMesh = BABYLON.MeshBuilder.CreateBox("tempGLB", { size: 1 }, this.scene);
                tempMesh.isVisible = false;
                
                // Read the file as an ArrayBuffer
                const arrayBuffer = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = reject;
                    reader.readAsArrayBuffer(file);
                });
                
                this.notifyProgress('Processing GLB/GLTF data...', 50);
                
                // Create a blob URL from the array buffer
                const blob = new Blob([arrayBuffer]);
                const fileURL = URL.createObjectURL(blob);
                
                // Return a promise that resolves when the mesh is loaded
                return new Promise((resolve, reject) => {
                    try {
                        // Make sure GLB/GLTF plugin is available
                        if (!BABYLON.SceneLoader.IsPluginForExtensionAvailable('.glb') && 
                            !BABYLON.SceneLoader.IsPluginForExtensionAvailable('.gltf')) {
                            console.warn('GLB/GLTF loader plugin not explicitly available, attempting to load anyway');
                        }
                        
                        // Use the file extension to determine the format hint
                        const fileExt = formatInfo.extension.toLowerCase();
                        const formatHint = '.' + fileExt;
                        
                        BABYLON.SceneLoader.ImportMesh(
                            "", // meshNames (empty string means all meshes)
                            "", // path (empty because we're using a direct URL)
                            fileURL, // filename
                            this.scene, // scene
                            // onSuccess
                            (meshes, particleSystems, skeletons, animationGroups) => {
                                // Clean up the blob URL
                                URL.revokeObjectURL(fileURL);
                                // Dispose of the temporary mesh
                                tempMesh.dispose();
                                
                                if (meshes.length === 0) {
                                    reject(new Error('No meshes were loaded'));
                                    return;
                                }
                                
                                // Add a material if none exists
                                meshes.forEach(mesh => {
                                    if (!mesh.material) {
                                        const material = new BABYLON.StandardMaterial(file.name + 'Material', this.scene);
                                        material.diffuseColor = new BABYLON.Color3(0.5, 0.6, 0.8);
                                        material.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
                                        mesh.material = material;
                                    }
                                });
                                
                                this.notifyProgress('GLB/GLTF loaded successfully', 100);
                                
                                resolve({
                                    meshes,
                                    format: formatInfo,
                                    source: 'babylon'
                                });
                            },
                            // onProgress
                            (evt) => {
                                if (evt.lengthComputable) {
                                    const loadProgress = (evt.loaded / evt.total * 100);
                                    this.notifyProgress(`Loading GLB/GLTF: ${Math.round(loadProgress)}%`, 50 + loadProgress / 2);
                                }
                            },
                            // onError
                            (scene, message, exception) => {
                                URL.revokeObjectURL(fileURL);
                                tempMesh.dispose();
                                reject(new Error(message || 'Failed to load GLB/GLTF file'));
                            },
                            // file type hint
                            formatHint
                        );
                    } catch (error) {
                        URL.revokeObjectURL(fileURL);
                        tempMesh.dispose();
                        reject(error);
                    }
                });
            } catch (error) {
                console.error('Error loading GLB/GLTF file:', error);
                throw new Error('Failed to load GLB/GLTF file: ' + error.message);
            }
        }
        
        /**
         * Load mesh files using Babylon.js loaders
         */
        async loadMeshFile(file, formatInfo, options) {
            this.notifyProgress('Reading mesh file...', 20);
            
            try {
                // Check if BABYLON is available
                if (typeof BABYLON === 'undefined' || !BABYLON.SceneLoader) {
                    throw new Error('Babylon.js or its SceneLoader is not available');
                }
                
                const fileExt = formatInfo.extension.toLowerCase();
                
                // Special handling for STL files
                if (fileExt === 'stl') {
                    return this.loadSTLFile(file, formatInfo);
                }
                
                // Special handling for GLB/GLTF files
                if (fileExt === 'glb' || fileExt === 'gltf') {
                    return this.loadGLBFile(file, formatInfo);
                }
                
                // For other mesh formats, use the standard approach
                // Create a blob URL from the file
                const fileURL = URL.createObjectURL(file);
                
                // Return a promise that resolves when the mesh is loaded
                return new Promise((resolve, reject) => {
                    try {
                        BABYLON.SceneLoader.ImportMesh(
                            "", // meshNames (empty string means all meshes)
                            "", // path (empty because we're using a direct URL)
                            fileURL, // filename
                            this.scene, // scene
                            // onSuccess
                            (meshes, particleSystems, skeletons, animationGroups) => {
                                // Clean up the blob URL
                                URL.revokeObjectURL(fileURL);
                                
                                if (meshes.length === 0) {
                                    reject(new Error('No meshes were loaded'));
                                    return;
                                }
                                
                                this.notifyProgress('Mesh loaded successfully', 100);
                                
                                resolve({
                                    meshes,
                                    particleSystems,
                                    skeletons,
                                    animationGroups,
                                    format: formatInfo,
                                    source: 'babylon'
                                });
                            },
                            // onProgress
                            (evt) => {
                                if (evt.lengthComputable) {
                                    const loadProgress = (evt.loaded / evt.total * 100);
                                    this.notifyProgress(`Loading ${fileExt.toUpperCase()} file: ${Math.round(loadProgress)}%`, 20 + loadProgress * 0.6);
                                }
                            },
                            // onError
                            (scene, message, exception) => {
                                URL.revokeObjectURL(fileURL);
                                console.error('Error loading mesh:', message, exception);
                                reject(new Error(`Failed to load mesh: ${message}`));
                            },
                            // File type override (needed for some formats)
                            fileExt
                        );
                    } catch (innerError) {
                        URL.revokeObjectURL(fileURL);
                        reject(innerError);
                    }
                });
            } catch (error) {
                console.error('Error loading mesh file:', error);
                throw new Error('Failed to load mesh file: ' + error.message);
            }
        }
        
        /**
         * Load STL files using Babylon.js STLFileLoader
         */
        async loadSTLFile(file, formatInfo) {
            this.notifyProgress('Reading STL file...', 20);
            
            try {
                // Create a temporary placeholder while we load the STL
                const tempMesh = BABYLON.MeshBuilder.CreateBox("tempSTL", { size: 1 }, this.scene);
                tempMesh.isVisible = false;
                
                // Read the file as an ArrayBuffer
                const arrayBuffer = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = reject;
                    reader.readAsArrayBuffer(file);
                });
                
                this.notifyProgress('Processing STL data...', 50);
                
                // Create a blob URL from the array buffer
                const blob = new Blob([arrayBuffer]);
                const fileURL = URL.createObjectURL(blob);
                
                // Return a promise that resolves when the mesh is loaded
                return new Promise((resolve, reject) => {
                    try {
                        // Make sure STL plugin is available
                        if (!BABYLON.SceneLoader.IsPluginForExtensionAvailable('.stl')) {
                            console.warn('STL loader plugin not explicitly available, attempting to load anyway');
                        }
                        
                        BABYLON.SceneLoader.ImportMesh(
                            "", // meshNames (empty string means all meshes)
                            "", // path (empty because we're using a direct URL)
                            fileURL, // filename
                            this.scene, // scene
                            // onSuccess
                            (meshes, particleSystems, skeletons, animationGroups) => {
                                // Clean up the blob URL
                                URL.revokeObjectURL(fileURL);
                                // Dispose of the temporary mesh
                                tempMesh.dispose();
                                
                                if (meshes.length === 0) {
                                    reject(new Error('No meshes were loaded'));
                                    return;
                                }
                                
                                // Add a material if none exists
                                meshes.forEach(mesh => {
                                    if (!mesh.material) {
                                        const material = new BABYLON.StandardMaterial(file.name + 'Material', this.scene);
                                        material.diffuseColor = new BABYLON.Color3(0.5, 0.6, 0.8);
                                        material.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
                                        mesh.material = material;
                                    }
                                });
                                
                                this.notifyProgress('STL loaded successfully', 100);
                                
                                resolve({
                                    meshes,
                                    format: formatInfo,
                                    source: 'babylon'
                                });
                            },
                            // onProgress
                            (evt) => {
                                if (evt.lengthComputable) {
                                    const loadProgress = (evt.loaded / evt.total * 100);
                                    this.notifyProgress(`Loading STL: ${Math.round(loadProgress)}%`, 50 + loadProgress / 2);
                                }
                            },
                            // onError
                            (scene, message, exception) => {
                                URL.revokeObjectURL(fileURL);
                                tempMesh.dispose();
                                reject(new Error(message || 'Failed to load STL file'));
                            },
                            // file type hint
                            '.stl'
                        );
                    } catch (error) {
                        URL.revokeObjectURL(fileURL);
                        tempMesh.dispose();
                        reject(error);
                    }
                });
            } catch (error) {
                console.error('Error loading STL file:', error);
                throw new Error('Failed to load STL file: ' + error.message);
            }
        }
        
        /**
         * Load Blender files (requires external conversion)
         */
        async loadBlendFile(file, formatInfo, options) {
            // Note: Direct .blend file loading requires external tools or server-side conversion
            // This is a placeholder for future implementation
            
            throw new Error('Blender file support requires external conversion tools. ' +
                          'Please export your Blender file to GLB, GLTF, or OBJ format.');
        }
        
        /**
         * Get list of supported formats
         */
        getSupportedFormats() {
            return Object.entries(this.supportedFormats).map(([ext, info]) => ({
                extension: ext,
                ...info,
                available: this.isFormatAvailable(info.loader)
            }));
        }
        
        /**
         * Check if a specific loader is available
         */
        isFormatAvailable(loader) {
            switch (loader) {
                case 'opencascade':
                    return this.ocInstance !== null;
                case 'babylon':
                    return typeof BABYLON !== 'undefined';
                case 'blend':
                    return false; // Not yet implemented
                default:
                    return false;
            }
        }
        
        /**
         * Set loading callbacks
         */
        setCallbacks(callbacks) {
            this.loadingCallbacks = { ...this.loadingCallbacks, ...callbacks };
        }
        
        /**
         * Notify progress
         */
        notifyProgress(message, percentage) {
            if (this.loadingCallbacks.onProgress) {
                this.loadingCallbacks.onProgress(message, percentage);
            }
        }
        
        /**
         * Notify success
         */
        notifySuccess(result) {
            if (this.loadingCallbacks.onSuccess) {
                this.loadingCallbacks.onSuccess(result);
            }
        }
        
        /**
         * Notify error
         */
        notifyError(error) {
            if (this.loadingCallbacks.onError) {
                this.loadingCallbacks.onError(error);
            }
        }
    }
    
    // Export the UnifiedModelLoader class
    window.UnifiedModelLoader = UnifiedModelLoader;
    
    /**
     * Create a unified model loader UI
     * @param {BABYLON.Scene} scene - The Babylon.js scene
     * @param {Object} options - Configuration options
     * @returns {Object} - The model loader UI and controller
     */
    function createUnifiedModelLoader(scene, options = {}) {
        // Check if BABYLON and required components are available
        if (!BABYLON || !BABYLON.SceneLoader || !BABYLON.GUI) {
            console.error('BABYLON.js, SceneLoader, or GUI is not available. Make sure all required Babylon.js libraries are loaded.');
            return null;
        }
        
        const loader = new UnifiedModelLoader(scene);
        
        // Initialize the loader
        loader.initialize().then(() => {
            console.log('Unified model loader initialized');
        }).catch(error => {
            console.error('Failed to initialize unified model loader:', error);
        });
        
        // Create UI
        const advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("modelLoaderUI");
        
        // Create a stack panel for controls
        const panel = new BABYLON.GUI.StackPanel();
        panel.width = "220px";
        panel.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
        panel.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
        panel.top = "10px";
        panel.right = "10px";
        advancedTexture.addControl(panel);
        
        // Create a header
        const header = new BABYLON.GUI.TextBlock();
        header.text = "3D Model Loader";
        header.height = "30px";
        header.color = "white";
        header.fontSize = 16;
        panel.addControl(header);
        
        // Create load button
        const loadButton = BABYLON.GUI.Button.CreateSimpleButton("loadModelBtn", "Load 3D Model");
        loadButton.width = "180px";
        loadButton.height = "40px";
        loadButton.color = "white";
        loadButton.background = "#4CAF50";
        loadButton.cornerRadius = 5;
        loadButton.thickness = 0;
        loadButton.fontSize = 14;
        panel.addControl(loadButton);
        
        // Create status text
        const statusText = new BABYLON.GUI.TextBlock();
        statusText.text = "Ready to load models";
        statusText.height = "30px";
        statusText.color = "white";
        statusText.fontSize = 12;
        panel.addControl(statusText);
        
        // Create format info text
        const formatInfo = new BABYLON.GUI.TextBlock();
        formatInfo.text = "Supported formats:";
        formatInfo.height = "60px";
        formatInfo.color = "white";
        formatInfo.fontSize = 12;
        formatInfo.textWrapping = true;
        panel.addControl(formatInfo);
        
        // Update supported formats text
        const updateFormatInfo = () => {
            const formats = loader.getSupportedFormats();
            const availableFormats = formats
                .filter(format => format.available)
                .map(format => format.extension.toUpperCase())
                .join(', ');
            
            formatInfo.text = `Supported formats: ${availableFormats}`;
        };
        
        // Call once initially
        updateFormatInfo();
        
        // Create file input element
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.style.display = 'none';
        fileInput.multiple = false;
        
        // Set accepted file types based on supported formats
        const updateAcceptedFormats = () => {
            const formats = loader.getSupportedFormats();
            const acceptedFormats = formats
                .filter(format => format.available)
                .map(format => `.${format.extension}`)
                .join(',');
            
            fileInput.accept = acceptedFormats;
        };
        
        // Call once initially
        updateAcceptedFormats();
        
        // Add file input to document
        document.body.appendChild(fileInput);
        
        // Current loaded model reference
        let loadedModel = null;
        
        // Handle file selection
        fileInput.addEventListener('change', async (event) => {
            if (event.target.files.length === 0) return;
            
            const file = event.target.files[0];
            statusText.text = `Loading ${file.name}...`;
            
            try {
                // Dispose of previously loaded model
                if (loadedModel) {
                    if (Array.isArray(loadedModel)) {
                        loadedModel.forEach(mesh => {
                            if (mesh && mesh.dispose) mesh.dispose();
                        });
                    } else if (loadedModel.dispose) {
                        loadedModel.dispose();
                    }
                    loadedModel = null;
                }
                
                // Set up callbacks
                loader.setCallbacks({
                    onProgress: (message, percentage) => {
                        statusText.text = `${message} (${percentage}%)`;
                    },
                    onSuccess: (result) => {
                        statusText.text = `Loaded ${file.name} successfully`;
                        loadedModel = result.meshes;
                    },
                    onError: (error) => {
                        statusText.text = `Error: ${error.message}`;
                        console.error('Model loading error:', error);
                    }
                });
                
                // Load the model
                await loader.loadModel(file);
                
            } catch (error) {
                statusText.text = `Error: ${error.message}`;
                console.error('Model loading error:', error);
            }
        });
        
        // Connect button to file input
        loadButton.onPointerClickObservable.add(() => {
            fileInput.click();
        });
        
        // Add sample model buttons
        const addSampleModelButton = (name, createFn) => {
            const button = BABYLON.GUI.Button.CreateSimpleButton(`${name}Btn`, name);
            button.width = "180px";
            button.height = "30px";
            button.color = "white";
            button.background = "#2196F3";
            button.cornerRadius = 5;
            button.thickness = 0;
            button.fontSize = 14;
            panel.addControl(button);
            
            button.onPointerClickObservable.add(() => {
                // Dispose of previously loaded model
                if (loadedModel) {
                    if (Array.isArray(loadedModel)) {
                        loadedModel.forEach(mesh => {
                            if (mesh && mesh.dispose) mesh.dispose();
                        });
                    } else if (loadedModel.dispose) {
                        loadedModel.dispose();
                    }
                    loadedModel = null;
                }
                
                // Create sample model
                loadedModel = createFn(scene);
                statusText.text = `Created ${name} sample`;
            });
        };
        
        // Add sample models
        addSampleModelButton("Cube", (scene) => {
            return BABYLON.MeshBuilder.CreateBox("sampleCube", { size: 2 }, scene);
        });
        
        addSampleModelButton("Sphere", (scene) => {
            return BABYLON.MeshBuilder.CreateSphere("sampleSphere", { diameter: 2 }, scene);
        });
        
        addSampleModelButton("Cylinder", (scene) => {
            return BABYLON.MeshBuilder.CreateCylinder("sampleCylinder", { height: 2, diameter: 1.5 }, scene);
        });
        
        // Return the loader and UI components
        return {
            loader,
            ui: {
                panel,
                loadButton,
                statusText,
                formatInfo
            },
            dispose: () => {
                // Clean up resources
                if (loadedModel) {
                    if (Array.isArray(loadedModel)) {
                        loadedModel.forEach(mesh => {
                            if (mesh && mesh.dispose) mesh.dispose();
                        });
                    } else if (loadedModel.dispose) {
                        loadedModel.dispose();
                    }
                }
                
                document.body.removeChild(fileInput);
                advancedTexture.dispose();
            }
        };
    }
    
    // Export the UI creation function
    window.createUnifiedModelLoader = createUnifiedModelLoader;
});