// This script imports the OpenCascade.js ES module and exposes it globally
// for compatibility with the existing opencascade-loader.js

// Import the OpenCascade.js module with the correct wasm path
const initOpenCascadeModule = async (options = {}) => {
    try {
        console.log('Initializing OpenCascade.js module with options:', options);
        
        // Import the module with the correct wasm path
        const module = await import('../lib/opencascade.js');
        console.log('OpenCascade.js module imported successfully');
        
        // Determine the WASM path from options or use default
        const wasmPath = options.wasmPath || '/lib/opencascade.wasm';
        console.log('Using WASM path:', wasmPath);
        
        // Set the wasm location and merge with any options passed in
        const moduleOptions = {
            ...options,
            locateFile: (path) => {
                // If the path ends with .wasm, use our custom path
                if (path.endsWith('.wasm')) {
                    console.log(`Resolving WASM path: ${path} -> ${wasmPath}`);
                    return wasmPath;
                }
                return path;
            }
        };
        
        console.log('Initializing OpenCascade.js with options:', moduleOptions);
        
        // Initialize the module
        console.log('Calling module.default...');
        const instance = await module.default(moduleOptions);
        console.log('OpenCascade.js instance created successfully');
        
        // For compatibility with older code that might expect these properties
        window.opencascade = instance;
        console.log('Set window.opencascade to the instance');
        
        // Check for required modules
        const requiredModules = ['FS', 'TDocStd_Document', 'RWGltf_CafWriter'];
        const missingModules = requiredModules.filter(mod => !instance[mod]);
        
        if (missingModules.length > 0) {
            console.warn('Missing required modules:', missingModules);
        } else {
            console.log('All required modules are available');
        }
        
        // Log available methods for debugging
        console.log('OpenCascade.js module initialized successfully');
        
        // Log data exchange classes
        const dataExchangeClasses = Object.keys(instance).filter(key => 
            key.startsWith('RWGltf') || 
            key.startsWith('RWMesh') || 
            key.startsWith('TDocStd') ||
            key.startsWith('XCAFDoc')
        );
        console.log('Data exchange classes found:', dataExchangeClasses);
        
        return instance;
    } catch (error) {
        console.error('Error initializing OpenCascade.js module:', error);
        throw error;
    }
};

// Expose it globally
window.initOpenCascade = initOpenCascadeModule;

console.log('OpenCascade.js module loader registered');