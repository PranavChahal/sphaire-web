/**
 * GRID SYSTEM INTEGRATION - BASED ON BABYLON.JS PLAYGROUND PATTERNS
 * 
 * Integrates grid system patterns from Babylon.js playground examples.
 * Following the external playground patterns for proper grid implementation.
 */

import { 
  Scene, Mesh, MeshBuilder, StandardMaterial, Color3, Vector3
} from '@babylonjs/core';
import { GridMaterial } from '@babylonjs/materials/grid';

export interface GridConfig {
  size: number;
  divisions: number;
  majorUnitFrequency: number;
  minorUnitVisibility: number;
  gridRatio: number;
  mainColor: Color3;
  lineColor: Color3;
  opacity: number;
  backFaceCulling: boolean;
  position: Vector3;
}

// Default grid configuration (following playground examples)
export const DEFAULT_GRID_CONFIG: GridConfig = {
  size: 100,
  divisions: 100,
  majorUnitFrequency: 10,
  minorUnitVisibility: 0.8,
  gridRatio: 1,
  mainColor: new Color3(0, 0, 0), // Transparent background
  lineColor: new Color3(0.8, 0.8, 0.9), // Silver lines
  opacity: 1.0,
  backFaceCulling: false,
  position: new Vector3(0, -0.01, 0)
};

/**
 * Grid System Manager (following Babylon.js playground patterns)
 */
export class GridSystemManager {
  protected scene: Scene;
  private gridMesh: Mesh | null = null;
  private gridMaterial: GridMaterial | null = null;
  private config: GridConfig;

  constructor(scene: Scene, config: GridConfig = DEFAULT_GRID_CONFIG) {
    this.scene = scene;
    this.config = { ...config };
    console.log('📐 GridSystem: Manager initialized');
  }

  /**
   * Create grid following playground patterns
   */
  createGrid(): Mesh {
    console.log('📐 GridSystem: Creating grid...');

    // Dispose existing grid
    this.disposeGrid();

    // Create ground mesh for grid (following playground patterns)
    this.gridMesh = MeshBuilder.CreateGround(
      'grid-ground',
      { 
        width: this.config.size, 
        height: this.config.size, 
        subdivisions: this.config.divisions 
      },
      this.scene
    );

    // Create grid material (following playground patterns)
    this.gridMaterial = new GridMaterial('grid-material', this.scene);
    this.gridMaterial.majorUnitFrequency = this.config.majorUnitFrequency;
    this.gridMaterial.minorUnitVisibility = this.config.minorUnitVisibility;
    this.gridMaterial.gridRatio = this.config.gridRatio;
    this.gridMaterial.backFaceCulling = this.config.backFaceCulling;
    this.gridMaterial.mainColor = this.config.mainColor;
    this.gridMaterial.lineColor = this.config.lineColor;
    this.gridMaterial.opacity = this.config.opacity;

    // Apply material and positioning
    this.gridMesh.material = this.gridMaterial;
    this.gridMesh.position = this.config.position.clone();
    this.gridMesh.isPickable = false; // Grid should not interfere with picking

    console.log('✅ GridSystem: Grid created successfully');
    return this.gridMesh;
  }

  /**
   * Update grid configuration (following playground patterns)
   */
  updateGridConfig(newConfig: Partial<GridConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (this.gridMaterial && this.gridMesh) {
      // Update material properties
      this.gridMaterial.majorUnitFrequency = this.config.majorUnitFrequency;
      this.gridMaterial.minorUnitVisibility = this.config.minorUnitVisibility;
      this.gridMaterial.gridRatio = this.config.gridRatio;
      this.gridMaterial.backFaceCulling = this.config.backFaceCulling;
      this.gridMaterial.mainColor = this.config.mainColor;
      this.gridMaterial.lineColor = this.config.lineColor;
      this.gridMaterial.opacity = this.config.opacity;

      // Update mesh position
      this.gridMesh.position = this.config.position.clone();

      console.log('🔄 GridSystem: Configuration updated');
    }
  }

  /**
   * Show/hide grid
   */
  setVisible(visible: boolean): void {
    if (this.gridMesh) {
      this.gridMesh.setEnabled(visible);
      console.log(`👁️ GridSystem: Grid ${visible ? 'shown' : 'hidden'}`);
    }
  }

  /**
   * Set grid size dynamically (following playground patterns)
   */
  setGridSize(size: number, divisions?: number): void {
    this.config.size = size;
    if (divisions) {
      this.config.divisions = divisions;
    }

    // Recreate grid with new size
    this.createGrid();
    console.log(`📏 GridSystem: Size set to ${size} with ${this.config.divisions} divisions`);
  }

  /**
   * Set grid colors (following playground patterns)
   */
  setGridColors(lineColor?: Color3, mainColor?: Color3): void {
    if (lineColor) {
      this.config.lineColor = lineColor;
    }
    if (mainColor) {
      this.config.mainColor = mainColor;
    }

    if (this.gridMaterial) {
      this.gridMaterial.lineColor = this.config.lineColor;
      this.gridMaterial.mainColor = this.config.mainColor;
      console.log('🎨 GridSystem: Colors updated');
    }
  }

  /**
   * Set grid opacity (following playground patterns)
   */
  setGridOpacity(opacity: number): void {
    this.config.opacity = Math.max(0, Math.min(1, opacity));
    
    if (this.gridMaterial) {
      this.gridMaterial.opacity = this.config.opacity;
      console.log(`🌫️ GridSystem: Opacity set to ${this.config.opacity}`);
    }
  }

  /**
   * Snap point to grid (following playground patterns)
   */
  snapToGrid(point: Vector3, snapSize: number = 1): Vector3 {
    const snapped = new Vector3(
      Math.round(point.x / snapSize) * snapSize,
      point.y, // Don't snap Y to preserve vertical positioning
      Math.round(point.z / snapSize) * snapSize
    );
    
    return snapped;
  }

  /**
   * Get grid intersection point for mouse picking (following playground patterns)
   */
  getGridIntersection(ray: any): Vector3 | null {
    if (!this.gridMesh) return null;

    const pickingInfo = this.scene.pickWithRay(ray, (mesh) => mesh === this.gridMesh);
    return pickingInfo?.hit ? pickingInfo.pickedPoint : null;
  }

  /**
   * Dispose grid resources
   */
  disposeGrid(): void {
    if (this.gridMesh) {
      this.gridMesh.dispose();
      this.gridMesh = null;
    }
    
    if (this.gridMaterial) {
      this.gridMaterial.dispose();
      this.gridMaterial = null;
    }
    
    console.log('🧹 GridSystem: Grid disposed');
  }

  /**
   * Get current grid mesh
   */
  getGridMesh(): Mesh | null {
    return this.gridMesh;
  }

  /**
   * Get current grid configuration
   */
  getConfig(): GridConfig {
    return { ...this.config };
  }

  /**
   * Dispose manager
   */
  dispose(): void {
    this.disposeGrid();
    console.log('🧹 GridSystem: Manager disposed');
  }
}

/**
 * Advanced grid features (following playground advanced patterns)
 */
export class AdvancedGridSystem extends GridSystemManager {
  private axisLines: Mesh[] = [];
  private originMarker: Mesh | null = null;

  /**
   * Create axis lines (X, Y, Z indicators)
   */
  createAxisLines(): void {
    console.log('📐 AdvancedGrid: Creating axis lines...');

    // Dispose existing axis lines
    this.disposeAxisLines();

    // X Axis (Red)
    const xAxis = MeshBuilder.CreateLines(
      'x-axis',
      { points: [new Vector3(-50, 0, 0), new Vector3(50, 0, 0)] },
      this.scene
    );
    xAxis.color = new Color3(1, 0, 0); // Red
    xAxis.isPickable = false;
    this.axisLines.push(xAxis);

    // Y Axis (Green)
    const yAxis = MeshBuilder.CreateLines(
      'y-axis',
      { points: [new Vector3(0, -50, 0), new Vector3(0, 50, 0)] },
      this.scene
    );
    yAxis.color = new Color3(0, 1, 0); // Green
    yAxis.isPickable = false;
    this.axisLines.push(yAxis);

    // Z Axis (Blue)
    const zAxis = MeshBuilder.CreateLines(
      'z-axis',
      { points: [new Vector3(0, 0, -50), new Vector3(0, 0, 50)] },
      this.scene
    );
    zAxis.color = new Color3(0, 0, 1); // Blue
    zAxis.isPickable = false;
    this.axisLines.push(zAxis);

    console.log('✅ AdvancedGrid: Axis lines created');
  }

  /**
   * Create origin marker
   */
  createOriginMarker(): void {
    console.log('📐 AdvancedGrid: Creating origin marker...');

    if (this.originMarker) {
      this.originMarker.dispose();
    }

    this.originMarker = MeshBuilder.CreateSphere(
      'origin-marker',
      { diameter: 0.2 },
      this.scene
    );

    const material = new StandardMaterial('origin-material', this.scene);
    material.diffuseColor = new Color3(1, 1, 0); // Yellow
    material.emissiveColor = new Color3(0.3, 0.3, 0);
    this.originMarker.material = material;
    this.originMarker.position = Vector3.Zero();
    this.originMarker.isPickable = false;

    console.log('✅ AdvancedGrid: Origin marker created');
  }

  /**
   * Dispose axis lines
   */
  disposeAxisLines(): void {
    this.axisLines.forEach(line => line.dispose());
    this.axisLines = [];
    
    if (this.originMarker) {
      this.originMarker.dispose();
      this.originMarker = null;
    }
  }

  /**
   * Enhanced dispose
   */
  dispose(): void {
    this.disposeAxisLines();
    super.dispose();
    console.log('🧹 AdvancedGrid: Advanced manager disposed');
  }
}

export default GridSystemManager;
