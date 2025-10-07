// OpenCascade.js Module Loader for Sphaire
// Loads OpenCascade as an ES module and exposes it globally

const initOpenCascadeModule = async (options = {}) => {
    try {
        console.log('[OC-LOADER] Initializing OpenCascade.js module with options:', options);
        
        // Import the module with the correct wasm path
        const module = await import('/lib/opencascade.js');
        console.log('[OC-LOADER] OpenCascade.js module imported successfully');
        
        // Determine the WASM path from options or use default
        const wasmPath = options.wasmPath || '/lib/opencascade.wasm';
        console.log('[OC-LOADER] Using WASM path:', wasmPath);
        
        // Set the wasm location and merge with any options passed in
        const moduleOptions = {
            ...options,
            locateFile: (path) => {
                // If the path ends with .wasm, use our custom path
                if (path.endsWith('.wasm')) {
                    console.log(`[OC-LOADER] Resolving WASM path: ${path} -> ${wasmPath}`);
                    return wasmPath;
                }
                return path;
            }
        };
        
        console.log('[OC-LOADER] Initializing OpenCascade.js with options');
        
        // Initialize the module
        const instance = await module.default(moduleOptions);
        console.log('[OC-LOADER] OpenCascade.js instance created successfully');
        
        // For compatibility with older code
        window.opencascade = instance;
        console.log('[OC-LOADER] Set window.opencascade to the instance');
        
        // Check for required modules
        const requiredModules = ['FS', 'TDocStd_Document', 'BRepPrimAPI_MakeBox_3'];
        const missingModules = requiredModules.filter(mod => !instance[mod]);
        
        if (missingModules.length > 0) {
            console.warn('[OC-LOADER] Missing modules:', missingModules);
        } else {
            console.log('[OC-LOADER] All required modules are available');
        }
        
        console.log('[OC-LOADER] OpenCascade.js initialized successfully!');
        
        return instance;
    } catch (error) {
        console.error('[OC-LOADER] Error initializing OpenCascade.js module:', error);
        throw error;
    }
};

// Expose it globally
window.initOpenCascade = initOpenCascadeModule;

console.log('[OC-LOADER] OpenCascade.js module loader registered');
