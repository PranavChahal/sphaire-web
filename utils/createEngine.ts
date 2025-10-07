import { Engine } from '@babylonjs/core/Engines/engine';

const engineRegistry: Engine[] = [];

/**
 * Patches the Engine prototype to ensure wipeCaches is available
 */
function patchEnginePrototype() {
  if (typeof window === 'undefined') return;
  
  const global = window as any;
  
  let engineProto = null;
  
  // Method 1: BABYLON global
  if (global.BABYLON && global.BABYLON.Engine) {
    engineProto = global.BABYLON.Engine.prototype;
  }
  else if (global.Engine) {
    engineProto = global.Engine.prototype;
  }
  
  if (engineProto && typeof engineProto.wipeCaches !== 'function') {
    const safeWipeCaches = function(this: any) {
      console.log('🛡️ Prototype wipeCaches called');
      if (this && typeof this.clearCaches === 'function') {
        try {
          this.clearCaches();
        } catch (e) {
          console.warn('Failed prototype clearCaches call, suppressing error', e);
        }
      }
      return this;
    };
    
    Object.defineProperty(engineProto, 'wipeCaches', {
      value: safeWipeCaches,
      configurable: true,
      writable: true,
      enumerable: true
    });
    
    console.log('Applied wipeCaches patch to Engine prototype');
  }
}

function createEngineImpl(canvas: HTMLCanvasElement, options?: any): Engine {
  try {
    console.log('Creating ultra-defensive engine instance');
    
    patchEnginePrototype();
    
    // Create engine with defense-in-depth options
    const safeOptions = {
      ...options,
      deterministicLockstep: false,
      doNotHandleContextLost: false,
      adaptToDeviceRatio: true,
      powerPreference: 'high-performance',
      failIfMajorPerformanceCaveat: false,
      useWebGPU: false
    };
    
    const engine = new Engine(canvas, true, safeOptions);
    
    // Register this instance in both our closure variable and global tracker
    engineRegistry.push(engine);
    
    if (typeof window !== 'undefined') {
      const global = window as any;
      global.__BABYLON_ENGINES = global.__BABYLON_ENGINES || [];
      global.__BABYLON_ENGINES.push(engine);
    }
    
    if (typeof engine.wipeCaches !== 'function') {
      console.warn('CRITICAL: wipeCaches not found on engine! Adding emergency implementation...');
      
      const safeWipeCaches = function(this: any) {
        console.log('🧯 Emergency wipeCaches invoked');  
        if (this && typeof this.clearCaches === 'function') {
          try {
            this.clearCaches();
          } catch (e) {
            console.warn('Failed to call clearCaches(), but suppressing error', e);
          }
        }
        return this;
      };
      
      // Apply patch in multiple ways to maximize chances of success
      // Method 1: Direct assignment
      (engine as any).wipeCaches = safeWipeCaches;
      
      // Method 2: Object.defineProperty for robust definition
      Object.defineProperty(engine, 'wipeCaches', {
        value: safeWipeCaches,
        configurable: true,
        writable: true,
        enumerable: true
      });
    } else {
      // Native wipeCaches exists, but wrap it for monitoring and error protection
      const originalWipeCaches = engine.wipeCaches;
      
      // Create a robust wrapper with error handling
      const safeWrapperWipeCaches = function(this: any) {
        try {
          console.log('Monitored wipeCaches called');
          return originalWipeCaches.call(this);
        } catch (error) {
          console.warn('🛑 Native wipeCaches failed with error, using fallback', error);
          if (this && typeof this.clearCaches === 'function') {
            try {
              this.clearCaches();
            } catch (e) {
              console.warn('Even clearCaches failed, suppressing error', e);
            }
          }
          return this;
        }
      };
      
      // Apply the wrapper
      (engine as any).wipeCaches = safeWrapperWipeCaches;
    }
    
    return engine;
  } catch (error) {
    console.error('💥 Error creating engine:', error);
    throw error;
  }
}

// Ensure the patch is applied early in browser context
if (typeof window !== 'undefined') {
  setTimeout(() => {
    console.log('Auto-applying engine prototype patch');
    patchEnginePrototype();
  }, 0);
}

// Export the createEngine function
const createEngine = createEngineImpl;
export default createEngine;
export { createEngine };
