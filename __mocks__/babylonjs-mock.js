// Mock of Babylon.js for testing
const BABYLON = {
  Vector3: class {
    constructor(x = 0, y = 0, z = 0) {
      this.x = x;
      this.y = y;
      this.z = z;
    }
    
    length() { return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z); }
    normalize() { return this; }
    scale(scale) { return new BABYLON.Vector3(this.x * scale, this.y * scale, this.z * scale); }
    add(vector) { return new BABYLON.Vector3(this.x + vector.x, this.y + vector.y, this.z + vector.z); }
    subtract(vector) { return new BABYLON.Vector3(this.x - vector.x, this.y - vector.y, this.z - vector.z); }
    clone() { return new BABYLON.Vector3(this.x, this.y, this.z); }
    distanceTo(vector) { 
      const dx = this.x - vector.x;
      const dy = this.y - vector.y;
      const dz = this.z - vector.z;
      return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
  },
  
  Matrix: {
    Identity: () => ({ elements: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1] }),
  },
  
  Mesh: class {
    constructor(name) {
      this.name = name;
      this.position = new BABYLON.Vector3(0, 0, 0);
      this.rotation = new BABYLON.Vector3(0, 0, 0);
      this.scaling = new BABYLON.Vector3(1, 1, 1);
    }
    
    getVerticesData(kind) {
      if (kind === BABYLON.VertexBuffer.PositionKind) {
        return new Float32Array([
          -1, -1, -1,
           1, -1, -1,
           1,  1, -1,
          -1,  1, -1
        ]);
      }
      return null;
    }
    
    getIndices() {
      return new Uint32Array([0, 1, 2, 0, 2, 3]);
    }
    
    getBoundingInfo() {
      return {
        minimum: new BABYLON.Vector3(-1, -1, -1),
        maximum: new BABYLON.Vector3(1, 1, 1)
      };
    }
  },
  
  VertexData: class {
    constructor() {
      this.positions = null;
      this.indices = null;
      this.normals = null;
    }
    
    applyToMesh(mesh) {
      // Mock implementation
    }
    
    static ComputeNormals(positions, indices, normals) {
      // Fill normals with dummy data
      if (normals && positions) {
        for (let i = 0; i < positions.length; i++) {
          normals[i] = i % 3 === 2 ? 1 : 0; // Simple normal pointing in Z direction
        }
      }
    }
  },
  
  VertexBuffer: {
    PositionKind: 'position',
    NormalKind: 'normal',
    UVKind: 'uv',
    ColorKind: 'color',
  },
  
  PickingInfo: class {
    constructor() {
      this.hit = true;
      this.pickedPoint = new BABYLON.Vector3(0, 0, 0);
      this.pickedMesh = null;
      this.faceId = 0;
    }
  }
};

module.exports = BABYLON;
module.exports.default = BABYLON;
