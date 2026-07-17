/**
 * OpenCascade Main Thread Executor
 * Loads and executes OpenCascade code on the main thread (not in a worker)
 * Based on the working implementation from skillorix fixed
 */

import { createOccWrapper, convertOCShapeToBabylonMesh } from '@/utils/occ-wrapper';
import { staticScan } from './sandbox/staticScan';

export class OCCMainThreadExecutor {
  private ocInstance: any = null;
  private occ: any = null;
  private isInitializing = false;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize OpenCascade.js on the main thread
   */
  async initialize(): Promise<void> {
    if (this.ocInstance) {
      console.log('[OCC-MAIN] Already initialized');
      return;
    }

    if (this.isInitializing && this.initPromise) {
      console.log('[OCC-MAIN] Initialization in progress, waiting...');
      return this.initPromise;
    }

    this.isInitializing = true;
    this.initPromise = this._doInitialize();
    
    try {
      await this.initPromise;
    } finally {
      this.isInitializing = false;
    }
  }

  private async _doInitialize(): Promise<void> {
    try {
      console.log('[OCC-MAIN] Loading OpenCascade module loader script...');
      
      // Check if initOpenCascade is already available
      if (typeof (window as any).initOpenCascade === 'function') {
        console.log('[OCC-MAIN] initOpenCascade already loaded');
      } else {
        // Load the module loader script
        await this.loadScript('/js/opencascade-module-loader.js');
        console.log('[OCC-MAIN] Module loader script loaded');
        
        // Wait a bit for the script to register
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Check again
      if (typeof (window as any).initOpenCascade !== 'function') {
        throw new Error('initOpenCascade not found after loading module loader');
      }

      console.log('[OCC-MAIN] Initializing OpenCascade.js...');
      this.ocInstance = await (window as any).initOpenCascade({
        wasmPath: '/lib/opencascade.wasm'
      });

      console.log('[OCC-MAIN] Creating occ wrapper...');
      this.occ = createOccWrapper(this.ocInstance);

      console.log('[OCC-MAIN] OpenCascade.js initialized successfully!');
    } catch (error) {
      console.error('[OCC-MAIN] Initialization failed:', error);
      this.ocInstance = null;
      this.occ = null;
      throw error;
    }
  }

  /**
   * Load a script dynamically
   */
  private loadScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.type = 'module';
      script.src = src;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
      document.head.appendChild(script);
    });
  }

  /**
   * Execute OpenCascade code
   */
  async executeCode(code: string): Promise<any> {
    // Ensure initialized
    if (!this.ocInstance || !this.occ) {
      console.log('[OCC-MAIN] Not initialized, initializing now...');
      await this.initialize();
    }

    if (!this.ocInstance || !this.occ) {
      throw new Error('OpenCascade not initialized');
    }

    try {
      console.log('[OCC-MAIN] Executing code...');
      console.log('[OCC-MAIN] Code:', code.substring(0, 200) + '...');

      // Static safety screen before any execution — every caller is protected here,
      // regardless of whether they went through safeExecutor.
      const scan = staticScan(code);
      if (!scan.safe) {
        throw new Error(`Blocked unsafe code: ${scan.reason}`);
      }

      // Clean code: Remove markdown code fences if present
      let cleanedCode = code.trim();
      
      // Remove ```javascript or ```js or ``` at the start
      if (cleanedCode.startsWith('```')) {
        const firstNewline = cleanedCode.indexOf('\n');
        if (firstNewline !== -1) {
          cleanedCode = cleanedCode.substring(firstNewline + 1);
        }
      }
      
      // Remove trailing ```
      if (cleanedCode.endsWith('```')) {
        cleanedCode = cleanedCode.substring(0, cleanedCode.lastIndexOf('```')).trim();
      }
      
      console.log('[OCC-MAIN] Cleaned code:', cleanedCode.substring(0, 200) + '...');

      // Create a function with oc and occ available
      const userFunction = new Function('oc', 'occ', cleanedCode);
      const result = userFunction(this.ocInstance, this.occ);

      console.log('[OCC-MAIN] Code executed, result type:', typeof result);

      // Check if result is a shape
      if (result && typeof result.ShapeType === 'function') {
        console.log('[OCC-MAIN] Result is a valid OpenCascade shape');
        
        // Convert to mesh data
        const meshData = convertOCShapeToBabylonMesh(
          this.ocInstance, 
          result, 
          'AIGeneratedShape_' + Date.now()
        );

        if (!meshData) {
          throw new Error('Failed to convert shape to mesh data');
        }

        console.log('[OCC-MAIN] Shape converted to mesh data');
        return meshData;
      } else if (Array.isArray(result)) {
        console.log('[OCC-MAIN] Result is an array, checking format...');
        
        const meshDataArray = [];
        for (let i = 0; i < result.length; i++) {
          const item = result[i];
          
          // Check if it's a component object {shape, name, position}
          if (item && typeof item === 'object' && item.shape && item.name) {
            console.log(`[OCC-MAIN] Processing component: ${item.name}`);
            
            if (typeof item.shape.ShapeType === 'function') {
              const meshData = convertOCShapeToBabylonMesh(
                this.ocInstance,
                item.shape,
                item.name // Use the provided name
              );
              
              if (meshData) {
                // Add position metadata if provided
                if (item.position) {
                  meshDataArray.push({
                    ...meshData,
                    position: item.position
                  });
                } else {
                  meshDataArray.push(meshData);
                }
              }
            }
          }
          // Fallback: plain shape objects (legacy support)
          else if (item && typeof item.ShapeType === 'function') {
            const meshData = convertOCShapeToBabylonMesh(
              this.ocInstance,
              item,
              `AIGeneratedShape_${Date.now()}_${i}`
            );
            if (meshData) {
              meshDataArray.push(meshData);
            }
          }
        }

        if (meshDataArray.length === 0) {
          throw new Error('No valid shapes in result array');
        }

        console.log(`[OCC-MAIN] Converted ${meshDataArray.length} components to mesh data`);
        return meshDataArray;
      } else {
        throw new Error('Code did not return a valid OpenCascade shape');
      }
    } catch (error: any) {
      console.error('[OCC-MAIN] Execution failed:', error);
      throw new Error(`OpenCascade execution failed: ${error.message}`);
    }
  }

  /**
   * Get the OpenCascade instance (for advanced usage)
   */
  getOCInstance(): any {
    if (!this.ocInstance) {
      console.warn('[OCC-MAIN] OpenCascade not initialized');
      return null;
    }
    return this.ocInstance;
  }

  /**
   * Get the OCC wrapper (for advanced usage)
   */
  getOCC(): any {
    if (!this.occ) {
      console.warn('[OCC-MAIN] OCC wrapper not initialized');
      return null;
    }
    return this.occ;
  }

  /**
   * Check if initialized
   */
  isReady(): boolean {
    return this.ocInstance !== null && this.occ !== null;
  }
}

// Create singleton instance
export const occMainThreadExecutor = new OCCMainThreadExecutor();
