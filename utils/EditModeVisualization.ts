import { Scene } from '@babylonjs/core/scene';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { InstancedMesh } from '@babylonjs/core/Meshes/instancedMesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { Quaternion } from '@babylonjs/core/Maths/math.vector';
import { Observer } from '@babylonjs/core/Misc/observable';
import { PointerInfo, PointerEventTypes } from '@babylonjs/core/Events/pointerEvents';
import { SubObjectMode } from '../types/cad';

export interface EditModeVisualizationOptions {
  vertexSize?: number;
  vertexColor?: Color3;
  vertexHoverColor?: Color3;
  vertexSelectedColor?: Color3;
  
  edgeSize?: number;
  edgeColor?: Color3;
  edgeHoverColor?: Color3;
  edgeSelectedColor?: Color3;
  
  faceColor?: Color4;
  faceHoverColor?: Color4;
  faceSelectedColor?: Color4;
  
  showVertices?: boolean;
  showEdges?: boolean;
  showFaces?: boolean;
}

export class EditModeVisualization {
  private scene: Scene;
  private targetMesh: Mesh | null = null;
  private mode: SubObjectMode | null = null;
  private isActive: boolean = false;
  
  // Visualization meshes
  private vertexMeshes: InstancedMesh[] = [];
  private edgeMeshes: Mesh[] = [];
  private faceOverlays: Mesh[] = [];
  
  // Selection state
  private selectedIndices: Set<number> = new Set();
  private hoveredIndex: number = -1;
  
  // Pointer event observers
  private pointerMoveObserver: Observer<PointerInfo> | null = null;
  private pointerDownObserver: Observer<PointerInfo> | null = null;
  private pointerOutObserver: Observer<PointerInfo> | null = null;
  
  // Gizmo for sub-element editing
  private subElementGizmo: any = null;
  private subElementGizmoTarget: Mesh | null = null;
  
  // Materials
  private vertexMaterial: StandardMaterial;
  private vertexHoverMaterial: StandardMaterial;
  private vertexSelectedMaterial: StandardMaterial;
  private edgeMaterial: StandardMaterial;
  private edgeHoverMaterial: StandardMaterial;
  private edgeSelectedMaterial: StandardMaterial;
  private faceMaterial: StandardMaterial;
  private faceHoverMaterial: StandardMaterial;
  private faceSelectedMaterial: StandardMaterial;
  
  // Options
  private options: Required<EditModeVisualizationOptions>;
  
  // Parent container for all visualization elements
  private visualizationContainer: TransformNode;
  
  constructor(scene: Scene, options: EditModeVisualizationOptions = {}) {
    this.scene = scene;
    this.options = {
      vertexSize: options.vertexSize || 0.03,
      vertexColor: options.vertexColor || new Color3(0.3, 0.3, 0.3),
      vertexHoverColor: options.vertexHoverColor || new Color3(1, 0.8, 0),
      vertexSelectedColor: options.vertexSelectedColor || new Color3(1, 0.5, 0),
      
      edgeSize: options.edgeSize || 0.01,
      edgeColor: options.edgeColor || new Color3(0.5, 0.5, 0.5),
      edgeHoverColor: options.edgeHoverColor || new Color3(1, 0.8, 0),
      edgeSelectedColor: options.edgeSelectedColor || new Color3(1, 0.5, 0),
      
      faceColor: options.faceColor || new Color4(0.3, 0.3, 0.3, 0.2),
      faceHoverColor: options.faceHoverColor || new Color4(1, 0.8, 0, 0.3),
      faceSelectedColor: options.faceSelectedColor || new Color4(1, 0.5, 0, 0.4),
      
      showVertices: options.showVertices !== false,
      showEdges: options.showEdges !== false,
      showFaces: options.showFaces !== false
    };
    
    // Create visualization container
    this.visualizationContainer = new TransformNode('editModeVisualization', scene);
    
    // Initialize materials
    this.vertexMaterial = this.createVertexMaterial('vertex', this.options.vertexColor);
    this.vertexHoverMaterial = this.createVertexMaterial('vertexHover', this.options.vertexHoverColor);
    this.vertexSelectedMaterial = this.createVertexMaterial('vertexSelected', this.options.vertexSelectedColor);
    
    this.edgeMaterial = this.createEdgeMaterial('edge', this.options.edgeColor);
    this.edgeHoverMaterial = this.createEdgeMaterial('edgeHover', this.options.edgeHoverColor);
    this.edgeSelectedMaterial = this.createEdgeMaterial('edgeSelected', this.options.edgeSelectedColor);
    
    this.faceMaterial = this.createFaceMaterial('face', this.options.faceColor);
    this.faceHoverMaterial = this.createFaceMaterial('faceHover', this.options.faceHoverColor);
    this.faceSelectedMaterial = this.createFaceMaterial('faceSelected', this.options.faceSelectedColor);
  }
  
  private createVertexMaterial(name: string, color: Color3): StandardMaterial {
    const material = new StandardMaterial(name, this.scene);
    material.emissiveColor = color;
    material.diffuseColor = color;
    material.specularColor = new Color3(0, 0, 0);
    material.disableLighting = true;
    return material;
  }
  
  private createEdgeMaterial(name: string, color: Color3): StandardMaterial {
    const material = new StandardMaterial(name, this.scene);
    material.emissiveColor = color;
    material.diffuseColor = color;
    material.specularColor = new Color3(0, 0, 0);
    material.disableLighting = true;
    material.wireframe = true;
    return material;
  }
  
  private createFaceMaterial(name: string, color: Color4): StandardMaterial {
    const material = new StandardMaterial(name, this.scene);
    material.emissiveColor = new Color3(color.r, color.g, color.b);
    material.diffuseColor = new Color3(color.r, color.g, color.b);
    material.alpha = color.a;
    material.specularColor = new Color3(0, 0, 0);
    material.disableLighting = true;
    material.backFaceCulling = false;
    return material;
  }
  
  /**
   * Enter edit mode for a mesh
   */
  public enterEditMode(mesh: Mesh) {
    console.log(`EDIT MODE: Entering edit mode for mesh ${mesh.name}`);
    this.targetMesh = mesh;
    this.isActive = true;
    this.mode = 'face'; // Default to face mode
    this.activate(mesh, 'face');
  }
  
  /**
   * Exit edit mode
   */
  public exitEditMode() {
    console.log(`EDIT MODE: Exiting edit mode`);
    this.isActive = false;
    this.deactivate();
  }
  
  /**
   * Switch between vertex/edge/face modes
   */
  public switchMode(mode: SubObjectMode) {
    if (!this.targetMesh || !this.isActive) return;
    console.log(`EDIT MODE: Switching to ${mode} mode`);
    this.activate(this.targetMesh, mode, true);
  }
  
  /**
   * Activate edit mode visualization for a mesh
   */
  public activate(mesh: Mesh, mode: SubObjectMode, preserveSelection = false) {
    console.log(`🔸 Activating EditModeVisualization for mesh ${mesh.name} in ${mode} mode`);
    
    const previousMode = this.mode;
    let convertedSelection: number[] = [];
    
    // Convert selection if switching modes on same mesh
    if (preserveSelection && this.targetMesh === mesh && previousMode && previousMode !== mode) {
      convertedSelection = this.convertSelectionToMode(mode);
      console.log(`Converting selection from ${previousMode} to ${mode}:`, convertedSelection);
    }
    
    this.cleanup();
    
    this.targetMesh = mesh;
    this.mode = mode;
    this.selectedIndices.clear();
    this.hoveredIndex = -1;
    
    switch (mode) {
      case 'vertex':
        this.createVertexVisualization();
        break;
      case 'edge':
        this.createEdgeVisualization();
        break;
      case 'face':
        this.createFaceVisualization();
        break;
    }
    
    // Apply converted selection
    if (convertedSelection.length > 0) {
      this.setSelection(convertedSelection);
    }
    
    this.setupHoverEvents();
    this.setupClickEvents();
  }
  
  /**
   * Deactivate edit mode visualization
   */
  public deactivate() {
    console.log('🔹 Deactivating EditModeVisualization');
    this.cleanup();
    this.cleanupHoverEvents();
    this.cleanupClickEvents();
    this.cleanupSubElementGizmo();
    this.targetMesh = null;
    this.mode = null;
    this.selectedIndices.clear();
    this.hoveredIndex = -1;
    this.isActive = false;
  }
  
  /**
   * Create vertex visualization
   */
  private createVertexVisualization() {
    if (!this.targetMesh) return;
    
    const positions = this.targetMesh.getVerticesData(VertexBuffer.PositionKind);
    if (!positions) return;
    
    const vertexCount = positions.length / 3;
    
    // Create a base sphere for instancing
    const baseSphere = MeshBuilder.CreateSphere('vertexBase', {
      diameter: this.options.vertexSize,
      segments: 8
    }, this.scene);
    baseSphere.material = this.vertexMaterial;
    baseSphere.isVisible = false;
    baseSphere.parent = this.visualizationContainer;
    
    // Create instances for each vertex
    for (let i = 0; i < vertexCount; i++) {
      const instance = baseSphere.createInstance(`vertex_${i}`);
      const x = positions[i * 3];
      const y = positions[i * 3 + 1];
      const z = positions[i * 3 + 2];
      
      // Apply mesh transform to vertex position
      const worldPos = Vector3.TransformCoordinates(
        new Vector3(x, y, z),
        this.targetMesh.getWorldMatrix()
      );
      
      instance.position = worldPos;
      instance.isPickable = true;
      instance.metadata = { 
        type: 'vertex', 
        index: i,
        editModeElement: true 
      };
      
      this.vertexMeshes.push(instance);
    }
  }
  
  /**
   * Setup click events for selection
   */
  private setupClickEvents() {
    if (!this.scene) return;
    
    this.pointerDownObserver = this.scene.onPointerObservable.add((pointerInfo) => {
      if (pointerInfo.type !== PointerEventTypes.POINTERDOWN) return;
      if (!pointerInfo.pickInfo?.hit || !pointerInfo.pickInfo.pickedMesh) return;
      
      const mesh = pointerInfo.pickInfo.pickedMesh;
      const metadata = mesh.metadata as any;
      
      // Check if this is an edit mode element
      if (!metadata?.editModeElement) return;
      
      const index = metadata.index;
      if (index === undefined) return;
      
      // Handle selection
      const event = pointerInfo.event as PointerEvent;
      
      if (event.shiftKey) {
        // Toggle selection with shift
        if (this.selectedIndices.has(index)) {
          this.selectedIndices.delete(index);
        } else {
          this.selectedIndices.add(index);
        }
      } else if (event.ctrlKey || event.metaKey) {
        // Add to selection with ctrl/cmd
        this.selectedIndices.add(index);
      } else {
        // Single selection
        this.selectedIndices.clear();
        this.selectedIndices.add(index);
      }
      
      this.updateSelectionVisuals();
      console.log(`Selected ${this.mode} ${index}, total selected: ${this.selectedIndices.size}`);
    });
  }
  
  /**
   * Cleanup click events
   */
  private cleanupClickEvents() {
    if (this.pointerDownObserver) {
      this.scene.onPointerObservable.remove(this.pointerDownObserver);
      this.pointerDownObserver = null;
    }
  }
  
  /**
   * Enable gizmo for sub-element editing
   */
  public enableSubElementGizmo(gizmoType: 'position' | 'rotation' | 'scale', selectedIndices: number[]) {
    if (!this.targetMesh || selectedIndices.length === 0) return;
    
    this.cleanupSubElementGizmo();
    
    // Create a temporary mesh at the center of selected elements
    const centerPos = this.getSelectionCenter(selectedIndices);
    
    this.subElementGizmoTarget = MeshBuilder.CreateBox('gizmoTarget', { size: 0.1 }, this.scene);
    this.subElementGizmoTarget.position = centerPos;
    this.subElementGizmoTarget.isVisible = false;
    
    // Import and create gizmo
    import('@babylonjs/core/Gizmos').then(({ PositionGizmo, RotationGizmo, ScaleGizmo }) => {
      switch (gizmoType) {
        case 'position':
          this.subElementGizmo = new PositionGizmo();
          break;
        case 'rotation':
          this.subElementGizmo = new RotationGizmo();
          break;
        case 'scale':
          this.subElementGizmo = new ScaleGizmo();
          break;
      }
      
      if (this.subElementGizmo && this.subElementGizmoTarget) {
        this.subElementGizmo.attachedMesh = this.subElementGizmoTarget;
        
        // Handle gizmo drag to update selected elements
        this.subElementGizmo.onDragEndObservable.add(() => {
          this.applyTransformToSelection(selectedIndices, this.subElementGizmoTarget!.position);
        });
      }
    });
  }
  
  /**
   * Cleanup sub-element gizmo
   */
  private cleanupSubElementGizmo() {
    if (this.subElementGizmo) {
      this.subElementGizmo.dispose();
      this.subElementGizmo = null;
    }
    if (this.subElementGizmoTarget) {
      this.subElementGizmoTarget.dispose();
      this.subElementGizmoTarget = null;
    }
  }
  
  /**
   * Get center position of selected elements
   */
  private getSelectionCenter(indices: number[]): Vector3 {
    if (!this.targetMesh || indices.length === 0) return Vector3.Zero();
    
    const positions = this.targetMesh.getVerticesData(VertexBuffer.PositionKind);
    if (!positions) return Vector3.Zero();
    
    let sumX = 0, sumY = 0, sumZ = 0;
    let count = 0;
    
    if (this.mode === 'vertex') {
      indices.forEach(i => {
        sumX += positions[i * 3];
        sumY += positions[i * 3 + 1];
        sumZ += positions[i * 3 + 2];
        count++;
      });
    } else if (this.mode === 'face') {
      const indices_array = this.targetMesh.getIndices();
      if (!indices_array) return Vector3.Zero();
      
      indices.forEach(faceIdx => {
        const baseIdx = faceIdx * 3;
        for (let j = 0; j < 3; j++) {
          const vertIdx = indices_array[baseIdx + j];
          sumX += positions[vertIdx * 3];
          sumY += positions[vertIdx * 3 + 1];
          sumZ += positions[vertIdx * 3 + 2];
          count++;
        }
      });
    }
    
    if (count === 0) return Vector3.Zero();
    
    const localCenter = new Vector3(sumX / count, sumY / count, sumZ / count);
    return Vector3.TransformCoordinates(localCenter, this.targetMesh.getWorldMatrix());
  }
  
  /**
   * Apply transform to selected elements
   */
  private applyTransformToSelection(indices: number[], newPosition: Vector3) {
    // This would apply the transform to the actual mesh vertices
    // For now, just log the action
    console.log(`Applying transform to ${indices.length} ${this.mode}s`);
  }
  
  /**
   * Select all elements
   */
  public selectAll() {
    if (!this.targetMesh) return;
    
    this.selectedIndices.clear();
    
    if (this.mode === 'vertex') {
      const positions = this.targetMesh.getVerticesData(VertexBuffer.PositionKind);
      if (positions) {
        const vertexCount = positions.length / 3;
        for (let i = 0; i < vertexCount; i++) {
          this.selectedIndices.add(i);
        }
      }
    } else if (this.mode === 'face') {
      this.faceOverlays.forEach((_, index) => {
        this.selectedIndices.add(index);
      });
    } else if (this.mode === 'edge') {
      this.edgeMeshes.forEach((_, index) => {
        this.selectedIndices.add(index);
      });
    }
    
    this.updateSelectionVisuals();
    console.log(`Selected all ${this.selectedIndices.size} ${this.mode}s`);
  }
  
  /**
   * Deselect all elements
   */
  public deselectAll() {
    this.selectedIndices.clear();
    this.updateSelectionVisuals();
    console.log(`Deselected all ${this.mode}s`);
  }
  
  /**
   * Update selection visuals
   */
  private updateSelectionVisuals() {
    if (this.mode === 'vertex') {
      this.vertexMeshes.forEach((vertex, index) => {
        if (this.selectedIndices.has(index)) {
          vertex.material = this.vertexSelectedMaterial;
        } else if (index === this.hoveredIndex) {
          vertex.material = this.vertexHoverMaterial;
        } else {
          vertex.material = this.vertexMaterial;
        }
      });
    } else if (this.mode === 'face') {
      this.faceOverlays.forEach((face, index) => {
        if (this.selectedIndices.has(index)) {
          face.material = this.faceSelectedMaterial;
        } else if (index === this.hoveredIndex) {
          face.material = this.faceHoverMaterial;
        } else {
          face.material = this.faceMaterial;
        }
      });
    } else if (this.mode === 'edge') {
      this.edgeMeshes.forEach((edge, index) => {
        if (this.selectedIndices.has(index)) {
          edge.material = this.edgeSelectedMaterial;
        } else if (index === this.hoveredIndex) {
          edge.material = this.edgeHoverMaterial;
        } else {
          edge.material = this.edgeMaterial;
        }
      });
    }
  }
  
  /**
   * Get selected indices
   */
  public getSelectedIndices(): number[] {
    return Array.from(this.selectedIndices);
  }
  
  /**
   * Create edge visualization
   */
  private createEdgeVisualization() {
    if (!this.targetMesh) return;
    
    const positions = this.targetMesh.getVerticesData(VertexBuffer.PositionKind);
    const indices = this.targetMesh.getIndices();
    if (!positions || !indices) return;
    
    const edgeMap = new Map<string, {v1: number, v2: number}>();
    
    // Build unique edges from triangle indices (avoiding duplicates)
    for (let i = 0; i < indices.length; i += 3) {
      const i0 = indices[i];
      const i1 = indices[i + 1];
      const i2 = indices[i + 2];
      
      // Three edges per triangle
      const edges = [
        [i0, i1],
        [i1, i2],
        [i2, i0]
      ];
      
      for (const [a, b] of edges) {
        const key = `${Math.min(a, b)}_${Math.max(a, b)}`;
        if (!edgeMap.has(key)) {
          edgeMap.set(key, {v1: a, v2: b});
        }
      }
    }
    
    // Create cylinder for each edge (pickable)
    let edgeIndex = 0;
    edgeMap.forEach((edge) => {
      const p1 = new Vector3(
        positions[edge.v1 * 3],
        positions[edge.v1 * 3 + 1],
        positions[edge.v1 * 3 + 2]
      );
      const p2 = new Vector3(
        positions[edge.v2 * 3],
        positions[edge.v2 * 3 + 1],
        positions[edge.v2 * 3 + 2]
      );
      
      // Transform to world space
      const worldP1 = Vector3.TransformCoordinates(p1, this.targetMesh!.getWorldMatrix());
      const worldP2 = Vector3.TransformCoordinates(p2, this.targetMesh!.getWorldMatrix());
      
      // Calculate edge properties
      const edgeVector = worldP2.subtract(worldP1);
      const length = edgeVector.length();
      const midPoint = worldP1.add(worldP2).scale(0.5);
      
      // Create a thin cylinder for the edge
      const edgeCylinder = MeshBuilder.CreateCylinder(`edge_${edgeIndex}`, {
        height: length,
        diameter: this.options.edgeSize || 0.01,
        tessellation: 8
      }, this.scene);
      
      // Position and orient the cylinder
      edgeCylinder.position = midPoint;
      
      // Align cylinder with edge direction
      const axis = edgeVector.normalize();
      const up = new Vector3(0, 1, 0);
      const angle = Math.acos(Vector3.Dot(up, axis));
      const rotationAxis = Vector3.Cross(up, axis);
      
      if (rotationAxis.length() > 0.001) {
        edgeCylinder.rotationQuaternion = Quaternion.RotationAxis(rotationAxis.normalize(), angle);
      } else if (Vector3.Dot(up, axis) < 0) {
        // Handle 180 degree rotation case
        edgeCylinder.rotationQuaternion = Quaternion.RotationAxis(new Vector3(1, 0, 0), Math.PI);
      }
      
      edgeCylinder.material = this.edgeMaterial;
      edgeCylinder.parent = this.visualizationContainer;
      edgeCylinder.isPickable = true;
      edgeCylinder.metadata = {
        type: 'edge',
        index: edgeIndex,
        editModeElement: true,
        vertices: [edge.v1, edge.v2]
      };
      
      this.edgeMeshes.push(edgeCylinder);
      edgeIndex++;
    });
  }
  
  /**
   * Create face visualization (dots at face centers)
   */
  private createFaceVisualization() {
    if (!this.targetMesh) return;
    
    const positions = this.targetMesh.getVerticesData(VertexBuffer.PositionKind);
    const indices = this.targetMesh.getIndices();
    if (!positions || !indices) return;
    
    // Process each face (triangle)
    for (let i = 0; i < indices.length; i += 3) {
      const i0 = indices[i];
      const i1 = indices[i + 1];
      const i2 = indices[i + 2];
      
      const p0 = new Vector3(
        positions[i0 * 3],
        positions[i0 * 3 + 1],
        positions[i0 * 3 + 2]
      );
      const p1 = new Vector3(
        positions[i1 * 3],
        positions[i1 * 3 + 1],
        positions[i1 * 3 + 2]
      );
      const p2 = new Vector3(
        positions[i2 * 3],
        positions[i2 * 3 + 1],
        positions[i2 * 3 + 2]
      );
      
      // Calculate face center
      const center = p0.add(p1).add(p2).scale(1/3);
      const worldCenter = Vector3.TransformCoordinates(center, this.targetMesh.getWorldMatrix());
      
      // Create a small dot at face center
      const faceDot = MeshBuilder.CreateSphere(`face_${i/3}`, {
        diameter: this.options.vertexSize * 0.8,
        segments: 6
      }, this.scene);
      
      faceDot.position = worldCenter;
      faceDot.material = this.faceMaterial;
      faceDot.isPickable = true;
      faceDot.parent = this.visualizationContainer;
      faceDot.metadata = {
        type: 'face',
        index: i / 3,
        editModeElement: true
      };
      
      this.faceOverlays.push(faceDot);
    }
  }
  
  /**
   * Update selection state
   */
  public setSelection(indices: number[]) {
    this.selectedIndices = new Set(indices);
    this.updateVisualization();
  }
  
  /**
   * Update hover state
   */
  public setHover(index: number) {
    this.hoveredIndex = index;
    this.updateVisualization();
  }
  
  /**
   * Update visual state based on selection and hover
   */
  private updateVisualization() {
    if (this.mode === 'vertex') {
      this.vertexMeshes.forEach((vertex, index) => {
        if (this.hoveredIndex === index) {
          vertex.material = this.vertexHoverMaterial;
        } else if (this.selectedIndices.has(index)) {
          vertex.material = this.vertexSelectedMaterial;
        } else {
          vertex.material = this.vertexMaterial;
        }
      });
    } else if (this.mode === 'edge') {
      this.edgeMeshes.forEach((edge, index) => {
        if (this.hoveredIndex === index) {
          edge.material = this.edgeHoverMaterial;
        } else if (this.selectedIndices.has(index)) {
          edge.material = this.edgeSelectedMaterial;
        } else {
          edge.material = this.edgeMaterial;
        }
      });
    } else if (this.mode === 'face') {
      this.faceOverlays.forEach((face, index) => {
        if (this.hoveredIndex === index) {
          face.material = this.faceHoverMaterial;
        } else if (this.selectedIndices.has(index)) {
          face.material = this.faceSelectedMaterial;
        } else {
          face.material = this.faceMaterial;
        }
      });
    }
  }
  
  
  /**
   * Clean up all visualization elements
   */
  private cleanup() {
    // Dispose vertex meshes
    this.vertexMeshes.forEach(mesh => mesh.dispose());
    this.vertexMeshes = [];
    
    // Dispose edge meshes
    this.edgeMeshes.forEach(mesh => mesh.dispose());
    this.edgeMeshes = [];
    
    // Dispose face overlays
    this.faceOverlays.forEach(mesh => mesh.dispose());
    this.faceOverlays = [];
    
    // Clear selection state
    this.selectedIndices.clear();
    this.hoveredIndex = -1;
    
    // Clean up any base meshes
    this.visualizationContainer.getChildMeshes().forEach(mesh => mesh.dispose());
  }
  
  /**
   * Refresh the visualization (recreate all visualizations)
   */
  public refresh() {
    if (!this.targetMesh || !this.mode) return;
    
    // Store current selection
    const currentSelection = Array.from(this.selectedIndices);
    
    // Cleanup and recreate
    this.cleanup();
    this.visualizationContainer = new TransformNode('editModeVisualization', this.scene);
    
    // Recreate visualizations based on mode
    if (this.mode === 'vertex') {
      this.createVertexVisualization();
    } else if (this.mode === 'edge') {
      this.createEdgeVisualization();
    } else if (this.mode === 'face') {
      this.createFaceVisualization();
    }
    
    // Restore selection
    this.selectedIndices = new Set(currentSelection);
    this.updateVisualization();
  }

  const v2Pos = new Vector3(
    positions[v2 * 3],
    positions[v2 * 3 + 1],
    positions[v2 * 3 + 2]
  );
  const p2 = new Vector3(
    v2Pos.x,
    v2Pos.y,
    v2Pos.z
  );
  center.addInPlace(p1.add(p2).scale(0.5));
  count++;
      });
    } else if (this.mode === 'face') {
      this.selectedIndices.forEach(index => {
        if (index < this.faceOverlays.length && this.targetMesh) {
          const face = this.faceOverlays[index];
          const localPos = face.position.subtract(
            Vector3.TransformCoordinates(Vector3.Zero(), this.targetMesh.getWorldMatrix())
          );
          center.addInPlace(localPos);
          count++;
        }
      });
    }

    if (count === 0) return null;
    return center.scale(1 / count);
  }


  /**
   * Get selected vertex indices for transformation
   */
  public getSelectedVertices(): number[] {
    if (this.mode === 'vertex') {
      return Array.from(this.selectedIndices);
    } else if (this.mode === 'edge') {
      const vertices = new Set<number>();
      this.selectedIndices.forEach(index => {
        if (index < this.edgeMeshes.length) {
          const edge = this.edgeMeshes[index];
          if (edge.metadata?.vertices) {
            vertices.add(edge.metadata.vertices[0]);
            vertices.add(edge.metadata.vertices[1]);
          }
        }
      });
      return Array.from(vertices);
    } else if (this.mode === 'face') {
      // Get all vertices of selected faces
      const vertices = new Set<number>();
      const indices = this.targetMesh?.getIndices();
      if (!indices) return [];
      
      this.selectedIndices.forEach(faceIndex => {
        const startIdx = faceIndex * 3;
        if (startIdx + 2 < indices.length) {
          vertices.add(indices[startIdx]);
          vertices.add(indices[startIdx + 1]);
          vertices.add(indices[startIdx + 2]);
        }
      });
      return Array.from(vertices);
    }
    return [];
  }
  
  /**
   * Convert current selection to new mode and update visualization
   */
  public convertSelectionToMode(newMode: SubObjectMode): number[] {
    if (!this.targetMesh || this.mode === newMode) {
      return Array.from(this.selectedIndices);
    }
    
    const currentSelection = Array.from(this.selectedIndices);
    let convertedSelection: number[] = [];
    
    if (this.mode === 'vertex' && newMode === 'edge') {
      convertedSelection = this.convertVerticestoEdges(currentSelection);
    } else if (this.mode === 'vertex' && newMode === 'face') {
      convertedSelection = this.convertVerticestoFaces(currentSelection);
    } else if (this.mode === 'edge' && newMode === 'vertex') {
      convertedSelection = this.convertEdgesToVertices(currentSelection);
    } else if (this.mode === 'edge' && newMode === 'face') {
      convertedSelection = this.convertEdgesToFaces(currentSelection);
    } else if (this.mode === 'face' && newMode === 'vertex') {
      convertedSelection = this.convertFacesToVertices(currentSelection);
    } else if (this.mode === 'face' && newMode === 'edge') {
      convertedSelection = this.convertFacesToEdges(currentSelection);
    }
    
    return convertedSelection;
  }
  
  /**
   * Convert selected vertices to edges that connect them
   */
  private convertVerticestoEdges(vertexIndices: number[]): number[] {
    if (!this.targetMesh || vertexIndices.length === 0) return [];
    
    const selectedVertexSet = new Set(vertexIndices);
    const selectedEdges: number[] = [];
    
    // Check each edge to see if both its vertices are selected
    this.edgeMeshes.forEach((edge, index) => {
      if (edge.metadata?.vertices) {
        const [v1, v2] = edge.metadata.vertices;
        if (selectedVertexSet.has(v1) && selectedVertexSet.has(v2)) {
          selectedEdges.push(index);
        }
      }
    });
    
    return selectedEdges;
  }
  
  /**
   * Convert selected vertices to faces that contain all selected vertices
   */
  private convertVerticestoFace(vertexIndices: number[]): number[] {
    if (!this.targetMesh || vertexIndices.length === 0) return [];
    
    const selectedVertexSet = new Set(vertexIndices);
    const selectedFaces: number[] = [];
    const indices = this.targetMesh.getIndices();
    if (!indices) return [];
    
    // Check each face to see if it contains any selected vertices
    for (let faceIndex = 0; faceIndex < indices.length / 3; faceIndex++) {
      const startIdx = faceIndex * 3;
      const v1 = indices[startIdx];
      const v2 = indices[startIdx + 1];
      const v3 = indices[startIdx + 2];
      
      // If any vertex of the face is selected, select the face
      if (selectedVertexSet.has(v1) || selectedVertexSet.has(v2) || selectedVertexSet.has(v3)) {
        selectedFaces.push(faceIndex);
      }
    }
    
    return selectedFaces;
  }
  
  /**
   * Convert selected edges to their constituent vertices
   */
  private convertEdgesToVertices(edgeIndices: number[]): number[] {
    if (edgeIndices.length === 0) return [];
    
    const selectedVertices = new Set<number>();
    
    edgeIndices.forEach(edgeIndex => {
      if (edgeIndex < this.edgeMeshes.length) {
        const edge = this.edgeMeshes[edgeIndex];
        if (edge.metadata?.vertices) {
          selectedVertices.add(edge.metadata.vertices[0]);
          selectedVertices.add(edge.metadata.vertices[1]);
        }
      }
    });
    
    return Array.from(selectedVertices);
  }
  
  /**
   * Convert selected edges to faces that contain those edges
   */
  private convertEdgesToFaces(edgeIndices: number[]): number[] {
    if (!this.targetMesh || edgeIndices.length === 0) return [];
    
    const selectedEdgeVertices = new Set<string>();
    const indices = this.targetMesh.getIndices();
    if (!indices) return [];
    
    // Build set of selected edge vertex pairs
    edgeIndices.forEach(edgeIndex => {
      if (edgeIndex < this.edgeMeshes.length) {
        const edge = this.edgeMeshes[edgeIndex];
        if (edge.metadata?.vertices) {
          const [v1, v2] = edge.metadata.vertices;
          const edgeKey = `${Math.min(v1, v2)}_${Math.max(v1, v2)}`;
          selectedEdgeVertices.add(edgeKey);
        }
      }
    });
    
    const selectedFaces: number[] = [];
    
    // Check each face to see if it contains any selected edges
    for (let faceIndex = 0; faceIndex < indices.length / 3; faceIndex++) {
      const startIdx = faceIndex * 3;
      const v1 = indices[startIdx];
      const v2 = indices[startIdx + 1];
      const v3 = indices[startIdx + 2];
      
      // Check all three edges of the face
      const edges = [
        `${Math.min(v1, v2)}_${Math.max(v1, v2)}`,
        `${Math.min(v2, v3)}_${Math.max(v2, v3)}`,
        `${Math.min(v3, v1)}_${Math.max(v3, v1)}`
      ];
      
      // If any edge of the face is selected, select the face
      if (edges.some(edge => selectedEdgeVertices.has(edge))) {
        selectedFaces.push(faceIndex);
      }
    }
    
    return selectedFaces;
  }
  
  /**
   * Convert selected faces to their constituent vertices
   */
  private convertFacesToVertices(faceIndices: number[]): number[] {
    if (!this.targetMesh || faceIndices.length === 0) return [];
    
    const selectedVertices = new Set<number>();
    const indices = this.targetMesh.getIndices();
    if (!indices) return [];
    
    faceIndices.forEach(faceIndex => {
      const startIdx = faceIndex * 3;
      if (startIdx + 2 < indices.length) {
        selectedVertices.add(indices[startIdx]);
        selectedVertices.add(indices[startIdx + 1]);
        selectedVertices.add(indices[startIdx + 2]);
      }
    });
    
    return Array.from(selectedVertices);
  }
  
  /**
   * Convert selected faces to their constituent edges
   */
  private convertFacesToEdges(faceIndices: number[]): number[] {
    if (!this.targetMesh || faceIndices.length === 0) return [];
    
    const selectedEdgeKeys = new Set<string>();
    const indices = this.targetMesh.getIndices();
    if (!indices) return [];
    
    // Build set of edge keys from selected faces
    faceIndices.forEach(faceIndex => {
      const startIdx = faceIndex * 3;
      if (startIdx + 2 < indices.length) {
        const v1 = indices[startIdx];
        const v2 = indices[startIdx + 1];
        const v3 = indices[startIdx + 2];
        
        // Add all three edges of the face
        selectedEdgeKeys.add(`${Math.min(v1, v2)}_${Math.max(v1, v2)}`);
        selectedEdgeKeys.add(`${Math.min(v2, v3)}_${Math.max(v2, v3)}`);
        selectedEdgeKeys.add(`${Math.min(v3, v1)}_${Math.max(v3, v1)}`);
      }
    });
    
    // Find corresponding edge indices
    const selectedEdges: number[] = [];
    this.edgeMeshes.forEach((edge, index) => {
      if (edge.metadata?.vertices) {
        const [v1, v2] = edge.metadata.vertices;
        const edgeKey = `${Math.min(v1, v2)}_${Math.max(v1, v2)}`;
        if (selectedEdgeKeys.has(edgeKey)) {
          selectedEdges.push(index);
        }
      }
    });
    
    return selectedEdges;
  }
  
  /**
   * Setup hover events for visual feedback
   */
  private setupHoverEvents() {
    if (!this.scene) return;
    
    this.pointerMoveObserver = this.scene.onPointerObservable.add((pointerInfo) => {
      if (pointerInfo.type !== PointerEventTypes.POINTERMOVE) return;
      if (!pointerInfo.pickInfo?.hit || !pointerInfo.pickInfo.pickedMesh) return;
      
      const mesh = pointerInfo.pickInfo.pickedMesh;
      const metadata = mesh.metadata as any;
      
      // Check if this is an edit mode element
      if (!metadata?.editModeElement) return;
      
      const index = metadata.index;
      if (index === undefined || index === this.hoveredIndex) return;
      
      const previousHovered = this.hoveredIndex;
      this.hoveredIndex = index;
      
      // Update visuals for hover
      this.updateHoverVisuals(previousHovered, index);
    });
    
    this.pointerOutObserver = this.scene.onPointerObservable.add((pointerInfo) => {
      if (pointerInfo.type === PointerEventTypes.POINTEROUT) {
        const previousHovered = this.hoveredIndex;
        this.hoveredIndex = -1;
        if (previousHovered >= 0) {
          this.updateHoverVisuals(previousHovered, -1);
        }
      }
    });
  }
  
  /**
   * Cleanup hover events
   */
  private cleanupHoverEvents() {
    if (this.pointerMoveObserver) {
      this.scene.onPointerObservable.remove(this.pointerMoveObserver);
      this.pointerMoveObserver = null;
    }
    if (this.pointerOutObserver) {
      this.scene.onPointerObservable.remove(this.pointerOutObserver);
      this.pointerOutObserver = null;
    }
  }
  
  /**
   * Update hover visuals
   */
  private updateHoverVisuals(previousIndex: number, newIndex: number) {
    if (this.mode === 'vertex') {
      if (previousIndex >= 0 && previousIndex < this.vertexMeshes.length) {
        const vertex = this.vertexMeshes[previousIndex];
        if (!this.selectedIndices.has(previousIndex)) {
          vertex.material = this.vertexMaterial;
        }
      }
      if (newIndex >= 0 && newIndex < this.vertexMeshes.length) {
        const vertex = this.vertexMeshes[newIndex];
        if (!this.selectedIndices.has(newIndex)) {
          vertex.material = this.vertexHoverMaterial;
        }
      }
    } else if (this.mode === 'face') {
      if (previousIndex >= 0 && previousIndex < this.faceOverlays.length) {
        const face = this.faceOverlays[previousIndex];
        if (!this.selectedIndices.has(previousIndex)) {
          face.material = this.faceMaterial;
        }
      }
      if (newIndex >= 0 && newIndex < this.faceOverlays.length) {
        const face = this.faceOverlays[newIndex];
        if (!this.selectedIndices.has(newIndex)) {
          face.material = this.faceHoverMaterial;
        }
      }
    } else if (this.mode === 'edge') {
      if (previousIndex >= 0 && previousIndex < this.edgeMeshes.length) {
        const edge = this.edgeMeshes[previousIndex];
        if (!this.selectedIndices.has(previousIndex)) {
          edge.material = this.edgeMaterial;
        }
      }
      if (newIndex >= 0 && newIndex < this.edgeMeshes.length) {
        const edge = this.edgeMeshes[newIndex];
        if (!this.selectedIndices.has(newIndex)) {
          edge.material = this.edgeHoverMaterial;
        }
      }
    }
  }
  
  /**
   * Update visual state of an element (hover and selection)
   */
  private updateElementVisual(index: number, isHovered: boolean, isSelected: boolean) {
    if (!this.mode) return;
    
    let material: StandardMaterial;
    
    if (isSelected) {
      // Selected state overrides hover
      material = this.mode === 'vertex' ? this.vertexSelectedMaterial :
                 this.mode === 'edge' ? this.edgeSelectedMaterial :
                 this.faceSelectedMaterial;
    } else if (isHovered) {
      // Hover state
      material = this.mode === 'vertex' ? this.vertexHoverMaterial :
                 this.mode === 'edge' ? this.edgeHoverMaterial :
                 this.faceHoverMaterial;
    } else {
      // Normal state
      material = this.mode === 'vertex' ? this.vertexMaterial :
                 this.mode === 'edge' ? this.edgeMaterial :
                 this.faceMaterial;
    }
    
    // Apply material to the appropriate mesh
    if (this.mode === 'vertex' && index < this.vertexMeshes.length) {
      this.vertexMeshes[index].material = material;
    } else if (this.mode === 'edge' && index < this.edgeMeshes.length) {
      this.edgeMeshes[index].material = material;
    } else if (this.mode === 'face' && index < this.faceOverlays.length) {
      this.faceOverlays[index].material = material;
    }
  }
  
  /**
   * Dispose of all resources
   */
  public dispose() {
    this.cleanup();
    
    // Dispose materials
    this.vertexMaterial.dispose();
    this.vertexHoverMaterial.dispose();
    this.vertexSelectedMaterial.dispose();
    this.edgeMaterial.dispose();
    this.edgeHoverMaterial.dispose();
    this.edgeSelectedMaterial.dispose();
    this.faceMaterial.dispose();
    this.faceHoverMaterial.dispose();
    this.faceSelectedMaterial.dispose();
    
    // Dispose container
    this.visualizationContainer.dispose();
  }
}
