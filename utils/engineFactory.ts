/**
 * Babylon.js Engine Factory
 * 
 * This module provides a factory function to create properly patched Babylon.js Engine instances.
 * It ensures that all engine instances are created with complete compatibility patches,
 * preventing wipeCaches errors and other version compatibility issues.
 */

import { Engine } from '@babylonjs/core/Engines/engine';

// Type definitions for Babylon.js 8.x compatibility
interface EngineOptions {
  preserveDrawingBuffer?: boolean;
  stencil?: boolean;
  disableWebGL2Support?: boolean;
  adaptToDeviceRatio?: boolean;
  [key: string]: any;
}

/**
 * Creates a patched Babylon.js Engine instance
 * All engine instances should be created using this factory
 * 
 * @param canvas HTMLCanvasElement or canvas id string
 * @param antialias Whether to enable antialiasing (default: false)
 * @param options Engine options
 * @param adaptToDeviceRatio Whether to adapt to device ratio (default: false)
 * @returns Patched Engine instance
 */
export function createEngine(
  canvas: HTMLCanvasElement | string,
  options: EngineOptions = {}
): Engine {
  console.log('Creating patched Babylon.js Engine instance');
  
  // Extract options with defaults
  const {
    antialias = false,
    preserveDrawingBuffer = false,
    stencil = true,
    disableWebGL2Support = false,
    adaptToDeviceRatio = false,
    ...otherOptions
  } = options;
  
  // Convert canvas string to HTMLCanvasElement if needed
  const canvasElement = typeof canvas === 'string' ? document.getElementById(canvas) as unknown as HTMLCanvasElement : canvas;
  
  // Create the engine with specified options
  const engine = new Engine(
    canvasElement,
    antialias,
    {
      preserveDrawingBuffer,
      stencil,
      disableWebGL2Support,
      ...otherOptions
    },
    adaptToDeviceRatio
  );
  
  // Apply compatibility patches to this specific instance
  patchEngineInstance(engine);
  
  // Return the patched engine
  return engine;
}

/**
 * Applies compatibility patches to a specific engine instance
 * This ensures that deprecated methods like wipeCaches work properly
 * 
 * @param engine Engine instance to patch
 */
export function patchEngineInstance(engine: Engine): void {
  if (!engine) return;
  
  console.log('Patching engine instance with compatibility methods');
  
  const engineAny = engine as any;
  
  // Define missing or deprecated methods
  const compatibilityMethods = {
    wipeCaches: function(this: any) {
      console.log('Using wipeCaches compatibility method');
      if (typeof this.clearCaches === 'function') {
        this.clearCaches();
      }
      return this;
    },
    
    getAspectRatio: function(this: any) {
      console.log('Using getAspectRatio compatibility method');
      // Safely access canvas dimensions with fallbacks
      if (typeof this.getRenderingCanvas === 'function') {
        const canvas = this.getRenderingCanvas();
        if (canvas && typeof canvas.width === 'number' && typeof canvas.height === 'number') {
          return canvas.width / canvas.height;
        }
      }
      return 1; // Default to 1 if canvas not available
    },
    
    releaseFramebufferObjects: function(this: any) {
      console.log('Using releaseFramebufferObjects compatibility method');
      return this;
    },
    
    releaseEffects: function(this: any) {
      console.log('Using releaseEffects compatibility method');
      return this;
    }
  };
  
  // Apply all compatibility methods to this instance
  Object.entries(compatibilityMethods).forEach(([name, method]) => {
    // Only add if not already defined
    if (typeof engineAny[name] !== 'function') {
      engineAny[name] = method;
    }
  });
  
  console.log('Engine instance patched successfully');
}

/**
 * Ensures an existing engine instance has all necessary compatibility methods
 * This can be used on engines created outside our factory function
 * 
 * @param engine Engine instance to check and patch if needed
 */
export function ensureEngineMethods(engine: Engine | null | undefined): void {
  if (!engine) return;
  patchEngineInstance(engine);
}

// Register our factory to intercept direct Engine creations
if (typeof window !== 'undefined') {
  // Global engine factory
  (window as any).createBabylonEngine = createEngine;
  
  // Apply patches to Engine.prototype once on load
  setTimeout(() => {
    try {
      if ((window as any).BABYLON && (window as any).BABYLON.Engine) {
        const engineProto = (window as any).BABYLON.Engine.prototype;
        if (engineProto && typeof engineProto.wipeCaches !== 'function') {
          engineProto.wipeCaches = compatibilityMethods.wipeCaches;
        }
      }
    } catch (e) {
      console.error('Error patching Engine prototype:', e);
    }
  }, 0);
}

// These are the compatibility methods extracted for global use
const compatibilityMethods = {
  wipeCaches: function(this: any) {
    console.log('Using wipeCaches compatibility method');
    if (typeof this.clearCaches === 'function') {
      this.clearCaches();
    }
    return this;
  }
};

export default createEngine;
