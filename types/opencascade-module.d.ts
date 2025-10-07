/**
 * Type declarations for OpenCascade.js module
 * Allows TypeScript to import the dynamically loaded module
 */

declare module '/lib/opencascade.js' {
  export interface OpenCascadeModule {
    (options?: any): Promise<any>;
  }
  
  const opencascade: OpenCascadeModule;
  export default opencascade;
}
