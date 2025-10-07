/**
 * OpenCascade.js Module Loader - TypeScript Version
 * Handles ES module import and WASM path resolution
 */

export interface OpenCascadeInstance {
  // Core classes
  BRepPrimAPI_MakeBox_3: any;
  BRepPrimAPI_MakeCylinder_3: any;
  BRepPrimAPI_MakeSphere_3: any;
  BRepMesh_IncrementalMesh_2: any;
  BRepAlgoAPI_Cut_3: any;
  BRepAlgoAPI_Fuse_3: any;
  BRepAlgoAPI_Common_3: any;
  
  // Geometry classes
  gp_Pnt_3: any;
  gp_Vec_4: any;
  gp_Dir_4: any;
  gp_Ax2_3: any;
  gp_Trsf_1: any;
  
  // Topology classes
  TopoDS: any;
  TopExp_Explorer_2: any;
  TopAbs_ShapeEnum: any;
  TopLoc_Location_1: any;
  BRep_Tool: any;
  
  // File system
  FS?: any;
  
  // Data exchange
  TDocStd_Document?: any;
  RWGltf_CafWriter?: any;
  XCAFDoc_DocumentTool?: any;
  TCollection_ExtendedString_1?: any;
  TCollection_AsciiString_2?: any;
  Handle_TDocStd_Document_2?: any;
  TColStd_IndexedDataMapOfStringString_1?: any;
  Message_ProgressRange_1?: any;
  
  [key: string]: any;
}

export interface OpenCascadeOptions {
  wasmPath?: string;
  locateFile?: (path: string) => string;
  [key: string]: any;
}

/**
 * Singleton loader for OpenCascade.js
 */
export class OpenCascadeLoader {
  private static instance: OpenCascadeInstance | null = null;
  private static initPromise: Promise<OpenCascadeInstance> | null = null;

  /**
   * Initialize OpenCascade.js module
   * Returns cached instance if already initialized
   */
  static async initialize(options: OpenCascadeOptions = {}): Promise<OpenCascadeInstance> {
    // Return cached instance if already initialized
    if (this.instance) {
      console.log('OpenCascade.js already initialized, returning cached instance');
      return this.instance;
    }

    // Return in-progress initialization
    if (this.initPromise) {
      console.log('OpenCascade.js initialization in progress, waiting...');
      return this.initPromise;
    }

    // Start new initialization
    this.initPromise = this.loadModule(options);
    
    try {
      this.instance = await this.initPromise;
      return this.instance;
    } catch (error) {
      this.initPromise = null; // Reset on error to allow retry
      throw error;
    }
  }

  /**
   * Load the OpenCascade.js ES module
   */
  private static async loadModule(options: OpenCascadeOptions): Promise<OpenCascadeInstance> {
    try {
      console.log('Initializing OpenCascade.js module with options:', options);
      
      // Import the module - this assumes opencascade.js is in public/lib
      const module = await import('/lib/opencascade.js');
      console.log('OpenCascade.js module imported successfully');
      
      // Determine the WASM path from options or use default
      const wasmPath = options.wasmPath || '/lib/opencascade.wasm';
      console.log('Using WASM path:', wasmPath);
      
      // Set the wasm location and merge with any options passed in
      const moduleOptions: OpenCascadeOptions = {
        ...options,
        locateFile: (path: string) => {
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
      
      // Expose globally for compatibility with existing code
      if (typeof window !== 'undefined') {
        (window as any).opencascade = instance;
        console.log('Set window.opencascade to the instance');
      }
      
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
  }

  /**
   * Get the current instance (returns null if not initialized)
   */
  static getInstance(): OpenCascadeInstance | null {
    return this.instance;
  }

  /**
   * Check if OpenCascade.js is initialized
   */
  static isInitialized(): boolean {
    return this.instance !== null;
  }

  /**
   * Reset the instance (useful for testing)
   */
  static reset(): void {
    this.instance = null;
    this.initPromise = null;
    
    if (typeof window !== 'undefined') {
      (window as any).opencascade = undefined;
    }
  }
}

// Export a convenience function
export const initOpenCascade = (options?: OpenCascadeOptions) => 
  OpenCascadeLoader.initialize(options);
