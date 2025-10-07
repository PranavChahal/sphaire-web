/**
 * ParametricBridge - THE MISSING PIECE
 * Preserves parametric data while converting OpenCascade shapes to Babylon.js meshes
 */

import { Mesh, Scene, VertexData, Vector3, StandardMaterial, Color3 } from '@babylonjs/core';
import { OpenCascadeLoader, OpenCascadeInstance } from './OpenCascadeLoader';

/**
 * Parametric metadata attached to Babylon.js meshes
 */
export interface ParametricMetadata {
  // Type of parametric shape
  shapeType: ParametricShapeType;
  
  // All parameters that define the shape
  parameters: Record<string, number>;
  
  // Construction code (for export/regeneration)
  constructionCode: string;
  
  // Original OpenCascade shape (runtime only - not serialized)
  occShape?: any;
  
  // Version tracking
  version: number;
  
  // Creation timestamp
  createdAt: number;
  
  // Last modified timestamp
  modifiedAt: number;
}

/**
 * Supported parametric shape types
 */
export type ParametricShapeType = 
  | 'box'
  | 'cylinder' 
  | 'sphere'
  | 'cone'
  | 'torus'
  | 'gear'
  | 'bottle'
  | 'threaded-rod'
  | 'custom';

/**
 * Result of creating a parametric shape
 */
export interface ParametricShapeResult {
  mesh: Mesh;
  metadata: ParametricMetadata;
}

/**
 * ParametricBridge class - Converts OCC shapes to Babylon meshes while preserving parameters
 */
export class ParametricBridge {
  private oc: OpenCascadeInstance | null = null;
  private scene: Scene;

  constructor(scene: Scene) {
    this.scene = scene;
  }

  /**
   * Initialize OpenCascade.js if not already loaded
   */
  async initialize(): Promise<void> {
    if (!this.oc) {
      this.oc = await OpenCascadeLoader.initialize();
    }
  }

  /**
   * Create a parametric shape with preserved metadata
   */
  async createParametricShape(
    shapeType: ParametricShapeType,
    parameters: Record<string, number>,
    name?: string
  ): Promise<ParametricShapeResult> {
    await this.initialize();
    
    if (!this.oc) {
      throw new Error('OpenCascade.js not initialized');
    }

    // 1. Build the OpenCascade shape based on type
    const occShape = this.buildOCCShape(shapeType, parameters);
    
    // 2. Convert to Babylon.js mesh via tessellation
    const mesh = await this.convertOCCShapeToBabylonMesh(
      occShape, 
      name || `parametric-${shapeType}-${Date.now()}`
    );
    
    // 3. ⭐ CRITICAL: Attach parametric metadata to the mesh
    const metadata: ParametricMetadata = {
      shapeType,
      parameters: { ...parameters },
      constructionCode: this.generateConstructionCode(shapeType, parameters),
      occShape: occShape, // Store original shape for regeneration
      version: 1,
      createdAt: Date.now(),
      modifiedAt: Date.now()
    };
    
    mesh.metadata = metadata;
    
    return { mesh, metadata };
  }

  /**
   * Update parameters of an existing parametric shape
   * Regenerates the mesh geometry in-place
   */
  async updateParameters(
    mesh: Mesh,
    newParameters: Record<string, number>
  ): Promise<void> {
    await this.initialize();
    
    const metadata = mesh.metadata as ParametricMetadata;
    if (!metadata || !metadata.shapeType) {
      throw new Error('Mesh does not have parametric metadata');
    }

    // Regenerate the OpenCascade shape with new parameters
    const newOccShape = this.buildOCCShape(metadata.shapeType, newParameters);
    
    // Tessellate the new shape
    const newVertexData = this.tessellateOCCShape(newOccShape);
    
    // Update the mesh geometry in-place (preserves transforms, materials, etc.)
    newVertexData.applyToMesh(mesh, true);
    
    // Update metadata
    metadata.parameters = { ...newParameters };
    metadata.occShape = newOccShape;
    metadata.constructionCode = this.generateConstructionCode(metadata.shapeType, newParameters);
    metadata.version += 1;
    metadata.modifiedAt = Date.now();
  }

  /**
   * Build an OpenCascade shape based on type and parameters
   */
  private buildOCCShape(shapeType: ParametricShapeType, params: Record<string, number>): any {
    if (!this.oc) throw new Error('OpenCascade not initialized');

    switch (shapeType) {
      case 'box':
        return this.createBox(params);
      
      case 'cylinder':
        return this.createCylinder(params);
      
      case 'sphere':
        return this.createSphere(params);
      
      case 'cone':
        return this.createCone(params);
      
      case 'torus':
        return this.createTorus(params);
      
      case 'gear':
        return this.createGear(params);
      
      case 'bottle':
        return this.createBottle(params);
      
      case 'threaded-rod':
        return this.createThreadedRod(params);
      
      default:
        throw new Error(`Unsupported shape type: ${shapeType}`);
    }
  }

  /**
   * Create a parametric box
   */
  private createBox(params: Record<string, number>): any {
    const { width = 1, height = 1, depth = 1 } = params;
    return new this.oc!.BRepPrimAPI_MakeBox_3(width, height, depth).Shape();
  }

  /**
   * Create a parametric cylinder
   */
  private createCylinder(params: Record<string, number>): any {
    const { radius = 0.5, height = 1 } = params;
    return new this.oc!.BRepPrimAPI_MakeCylinder_3(radius, height).Shape();
  }

  /**
   * Create a parametric sphere
   */
  private createSphere(params: Record<string, number>): any {
    const { radius = 1 } = params;
    return new this.oc!.BRepPrimAPI_MakeSphere_3(radius).Shape();
  }

  /**
   * Create a parametric cone
   */
  private createCone(params: Record<string, number>): any {
    const { baseRadius = 1, topRadius = 0, height = 2 } = params;
    return new this.oc!.BRepPrimAPI_MakeCone_3(baseRadius, topRadius, height).Shape();
  }

  /**
   * Create a parametric torus
   */
  private createTorus(params: Record<string, number>): any {
    const { majorRadius = 1, minorRadius = 0.3 } = params;
    return new this.oc!.BRepPrimAPI_MakeTorus_3(majorRadius, minorRadius).Shape();
  }

  /**
   * Create a parametric gear (simplified version)
   */
  private createGear(params: Record<string, number>): any {
    const { 
      teeth = 20,
      module = 0.2,
      thickness = 0.5,
      innerRadius = 0.8
    } = params;

    const pitchRadius = module * teeth / 2;
    const outerRadius = pitchRadius + module;
    
    // Create outer cylinder
    const outerCylinder = new this.oc!.BRepPrimAPI_MakeCylinder_3(outerRadius, thickness).Shape();
    
    // Create inner hole
    const innerCylinder = new this.oc!.BRepPrimAPI_MakeCylinder_3(innerRadius, thickness * 1.1).Shape();
    
    // Cut the hole
    return new this.oc!.BRepAlgoAPI_Cut_3(outerCylinder, innerCylinder).Shape();
  }

  /**
   * Create a parametric bottle (simplified version)
   */
  private createBottle(params: Record<string, number>): any {
    const { 
      bodyRadius = 2,
      bodyHeight = 5,
      neckRadius = 0.5,
      neckHeight = 2
    } = params;

    // Create body
    const body = new this.oc!.BRepPrimAPI_MakeCylinder_3(bodyRadius, bodyHeight).Shape();
    
    // Create neck
    const neckAxis = new this.oc!.gp_Ax2_3(
      new this.oc!.gp_Pnt_3(0, 0, bodyHeight),
      new this.oc!.gp_Dir_4(0, 0, 1)
    );
    const neck = new this.oc!.BRepPrimAPI_MakeCylinder_3(neckAxis, neckRadius, neckHeight).Shape();
    
    // Fuse body and neck
    return new this.oc!.BRepAlgoAPI_Fuse_3(body, neck).Shape();
  }

  /**
   * Create a parametric threaded rod (simplified version)
   */
  private createThreadedRod(params: Record<string, number>): any {
    const { 
      radius = 0.5,
      length = 5
    } = params;

    // For now, just create a cylinder - full threading would be more complex
    return new this.oc!.BRepPrimAPI_MakeCylinder_3(radius, length).Shape();
  }

  /**
   * Tessellate an OpenCascade shape to vertex data
   */
  private tessellateOCCShape(occShape: any): VertexData {
    if (!this.oc) throw new Error('OpenCascade not initialized');

    // Mesh the shape with tessellation
    new this.oc.BRepMesh_IncrementalMesh_2(occShape, 0.1, false, 0.1, false);
    
    const positions: number[] = [];
    const indices: number[] = [];
    const normals: number[] = [];
    
    // Explore all faces
    const explorer = new this.oc.TopExp_Explorer_2(occShape, this.oc.TopAbs_ShapeEnum.TopAbs_FACE);
    
    let vertexOffset = 0;
    
    while (explorer.More()) {
      const face = this.oc.TopoDS.Face_1(explorer.Current());
      const location = new this.oc.TopLoc_Location_1();
      const triangulation = this.oc.BRep_Tool.Triangulation(face, location);
      
      if (!triangulation.IsNull()) {
        const transform = location.Transformation();
        const triangleCount = triangulation.NbTriangles();
        const nodeCount = triangulation.NbNodes();
        
        // Get vertices
        const vertices: Vector3[] = [];
        for (let i = 1; i <= nodeCount; i++) {
          const point = triangulation.Node(i);
          const transformedPoint = point.Transformed(transform);
          vertices.push(new Vector3(
            transformedPoint.X(),
            transformedPoint.Y(),
            transformedPoint.Z()
          ));
        }
        
        // Get triangles
        for (let i = 1; i <= triangleCount; i++) {
          const triangle = triangulation.Triangle(i);
          const idx1 = triangle.Value(1) - 1;
          const idx2 = triangle.Value(2) - 1;
          const idx3 = triangle.Value(3) - 1;
          
          // Add positions
          positions.push(vertices[idx1].x, vertices[idx1].y, vertices[idx1].z);
          positions.push(vertices[idx2].x, vertices[idx2].y, vertices[idx2].z);
          positions.push(vertices[idx3].x, vertices[idx3].y, vertices[idx3].z);
          
          // Add indices
          indices.push(vertexOffset, vertexOffset + 1, vertexOffset + 2);
          vertexOffset += 3;
        }
      }
      
      explorer.Next();
    }
    
    // Compute normals
    VertexData.ComputeNormals(positions, indices, normals);
    
    // Create vertex data
    const vertexData = new VertexData();
    vertexData.positions = positions;
    vertexData.indices = indices;
    vertexData.normals = normals;
    
    return vertexData;
  }

  /**
   * Convert OpenCascade shape to Babylon.js mesh
   */
  private async convertOCCShapeToBabylonMesh(occShape: any, name: string): Promise<Mesh> {
    const vertexData = this.tessellateOCCShape(occShape);
    
    const mesh = new Mesh(name, this.scene);
    vertexData.applyToMesh(mesh);
    
    // Apply default material
    const material = new StandardMaterial(`${name}-material`, this.scene);
    material.diffuseColor = new Color3(0.7, 0.7, 0.7);
    material.specularColor = new Color3(0.2, 0.2, 0.2);
    mesh.material = material;
    
    return mesh;
  }

  /**
   * Generate construction code for the shape
   */
  private generateConstructionCode(shapeType: ParametricShapeType, params: Record<string, number>): string {
    const paramString = Object.entries(params)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');
    
    return `createParametricShape('${shapeType}', { ${paramString} })`;
  }

  /**
   * Export parametric data for serialization
   */
  exportParametricData(mesh: Mesh): Omit<ParametricMetadata, 'occShape'> {
    const metadata = mesh.metadata as ParametricMetadata;
    if (!metadata) {
      throw new Error('Mesh does not have parametric metadata');
    }
    
    // Return everything except the runtime occShape
    const { occShape, ...exportData } = metadata;
    return exportData;
  }
}
