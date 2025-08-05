// Mock of OpenCascade.js for testing
const OpenCascade = {
  // Mock OpenCascade shape creation functions
  BRepPrimAPI_MakeBox: class {
    constructor(x, y, z) {
      this.x = x;
      this.y = y;
      this.z = z;
    }
    Shape() {
      return { type: 'box', parameters: { x: this.x, y: this.y, z: this.z } };
    }
  },
  
  BRepPrimAPI_MakeCylinder: class {
    constructor(radius, height) {
      this.radius = radius;
      this.height = height;
    }
    Shape() {
      return { type: 'cylinder', parameters: { radius: this.radius, height: this.height } };
    }
  },
  
  BRepPrimAPI_MakeSphere: class {
    constructor(radius) {
      this.radius = radius;
    }
    Shape() {
      return { type: 'sphere', parameters: { radius: this.radius } };
    }
  },
  
  // Mock BRep operations
  BRepBuilderAPI_Transform: class {
    constructor(shape, transform) {
      this.shape = shape;
      this.transform = transform;
    }
    Shape() {
      return { type: 'transformed', originalShape: this.shape, transform: this.transform };
    }
  },
  
  BRepFilletAPI_MakeFillet: class {
    constructor(shape) {
      this.shape = shape;
      this.edges = [];
      this.radii = [];
    }
    
    Add(radius, edge) {
      this.edges.push(edge);
      this.radii.push(radius);
      return this;
    }
    
    Shape() {
      return { 
        type: 'filleted', 
        originalShape: this.shape, 
        edges: this.edges,
        radii: this.radii 
      };
    }
  },
  
  // Mock Tesselation
  BRepMesh_IncrementalMesh: class {
    constructor(shape, linearDeflection) {
      this.shape = shape;
      this.linearDeflection = linearDeflection;
    }
  },
  
  // Mock utility functions
  ShapeTesselation: {
    tessellate: (shape) => {
      return {
        vertices: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1]),
        indices: new Uint32Array([0, 1, 2, 0, 2, 3, 0, 3, 1, 1, 3, 2]),
        normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1])
      };
    }
  }
};

// Export as ES module and CommonJS
export default OpenCascade;
module.exports = OpenCascade;
