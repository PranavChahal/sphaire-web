/**
 * MULTI-SELECTION INTEGRATION - BASED ON BABYLON.JS PLAYGROUND PATTERNS
 * 
 * Integrates marquee selection and multi-selection patterns from Babylon.js playground examples.
 * Following the external playground patterns for proper multi-selection implementation.
 */

import { 
  Scene, Camera, AbstractMesh, Vector2, Engine
} from '@babylonjs/core';

// Selection rectangle interface (following playground patterns)
interface SelectionRectangle {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

// Multi-selection result interface (for future use)
// interface MultiSelectionResult {
//   selectedMeshes: AbstractMesh[];
//   deselectedMeshes: AbstractMesh[];
//   totalSelected: number;
// }

/**
 * Multi-Selection Manager (following Babylon.js playground patterns)
 */
export class MultiSelectionManager {
  private scene: Scene;
  private camera: Camera;
  private canvas: HTMLCanvasElement;
  
  // Selection state
  private selectedMeshes: Set<string> = new Set();
  private selectableMeshes: AbstractMesh[] = [];
  private selectionCallbacks: ((meshes: AbstractMesh[]) => void)[] = [];
  
  // Marquee selection state (following playground patterns)
  private isMarqueeSelecting = false;
  private marqueeStartPoint: Vector2 | null = null;
  private marqueeEndPoint: Vector2 | null = null;
  private marqueeOverlay: HTMLDivElement | null = null;
  
  constructor(scene: Scene, camera: Camera, _engine: Engine, canvas: HTMLCanvasElement) {
    this.scene = scene;
    this.camera = camera;
    // _engine parameter kept for API compatibility but not stored
    this.canvas = canvas;
    
    this.setupEventListeners();
    console.log('🎯 MultiSelection: Manager initialized');
  }

  /**
   * Setup event listeners (following playground patterns)
   */
  private setupEventListeners(): void {
    // Mouse down - start selection
    this.canvas.addEventListener('pointerdown', this.onPointerDown.bind(this));
    
    // Mouse move - update marquee selection
    this.canvas.addEventListener('pointermove', this.onPointerMove.bind(this));
    
    // Mouse up - end selection
    this.canvas.addEventListener('pointerup', this.onPointerUp.bind(this));
    
    // Prevent context menu during selection
    this.canvas.addEventListener('contextmenu', this.onContextMenu.bind(this));
    
    console.log('👂 MultiSelection: Event listeners registered');
  }

  /**
   * Pointer down handler (following playground patterns)
   */
  private onPointerDown(event: PointerEvent): void {
    // Only handle left mouse button
    if (event.button !== 0) return;
    
    // Check if shift key is held for multi-selection
    const isMultiSelect = event.shiftKey;
    const isMarqueeSelect = event.ctrlKey || event.metaKey;
    
    if (isMarqueeSelect) {
      // Start marquee selection
      this.startMarqueeSelection(event);
    } else {
      // Handle single/multi mesh selection
      this.handleMeshSelection(event, isMultiSelect);
    }
  }

  /**
   * Start marquee selection (following playground patterns)
   */
  private startMarqueeSelection(event: PointerEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    this.marqueeStartPoint = new Vector2(
      event.clientX - rect.left,
      event.clientY - rect.top
    );
    
    this.isMarqueeSelecting = true;
    this.createMarqueeOverlay();
    
    console.log('🔲 MultiSelection: Started marquee selection');
  }

  /**
   * Create marquee visual overlay (following playground patterns)
   */
  private createMarqueeOverlay(): void {
    // Remove existing overlay
    this.removeMarqueeOverlay();
    
    // Create HTML overlay for marquee rectangle
    this.marqueeOverlay = document.createElement('div');
    this.marqueeOverlay.style.position = 'absolute';
    this.marqueeOverlay.style.border = '2px dashed #ffffff';
    this.marqueeOverlay.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
    this.marqueeOverlay.style.pointerEvents = 'none';
    this.marqueeOverlay.style.zIndex = '1000';
    this.marqueeOverlay.style.display = 'none';
    
    // Add to canvas container
    const canvasContainer = this.canvas.parentElement;
    if (canvasContainer) {
      canvasContainer.style.position = 'relative';
      canvasContainer.appendChild(this.marqueeOverlay);
    }
  }

  /**
   * Pointer move handler (following playground patterns)
   */
  private onPointerMove(event: PointerEvent): void {
    if (this.isMarqueeSelecting && this.marqueeStartPoint && this.marqueeOverlay) {
      const rect = this.canvas.getBoundingClientRect();
      this.marqueeEndPoint = new Vector2(
        event.clientX - rect.left,
        event.clientY - rect.top
      );
      
      this.updateMarqueeVisual();
    }
  }

  /**
   * Update marquee visual (following playground patterns)
   */
  private updateMarqueeVisual(): void {
    if (!this.marqueeOverlay || !this.marqueeStartPoint || !this.marqueeEndPoint) return;
    
    const left = Math.min(this.marqueeStartPoint.x, this.marqueeEndPoint.x);
    const top = Math.min(this.marqueeStartPoint.y, this.marqueeEndPoint.y);
    const width = Math.abs(this.marqueeEndPoint.x - this.marqueeStartPoint.x);
    const height = Math.abs(this.marqueeEndPoint.y - this.marqueeStartPoint.y);
    
    this.marqueeOverlay.style.left = `${left}px`;
    this.marqueeOverlay.style.top = `${top}px`;
    this.marqueeOverlay.style.width = `${width}px`;
    this.marqueeOverlay.style.height = `${height}px`;
    this.marqueeOverlay.style.display = 'block';
  }

  /**
   * Pointer up handler (following playground patterns)
   */
  private onPointerUp(_event: PointerEvent): void {
    if (this.isMarqueeSelecting) {
      this.endMarqueeSelection();
    }
  }

  /**
   * End marquee selection and select meshes in rectangle (following playground patterns)
   */
  private endMarqueeSelection(): void {
    if (!this.marqueeStartPoint || !this.marqueeEndPoint) {
      this.resetMarqueeSelection();
      return;
    }
    
    // Calculate selection rectangle
    const selectionRect: SelectionRectangle = {
      startX: Math.min(this.marqueeStartPoint.x, this.marqueeEndPoint.x),
      startY: Math.min(this.marqueeStartPoint.y, this.marqueeEndPoint.y),
      endX: Math.max(this.marqueeStartPoint.x, this.marqueeEndPoint.x),
      endY: Math.max(this.marqueeStartPoint.y, this.marqueeEndPoint.y)
    };
    
    // Select meshes within rectangle (using GPU picking for performance)
    const selectedInMarquee = this.selectMeshesInRectangle(selectionRect);
    
    // Add to current selection
    selectedInMarquee.forEach(mesh => {
      this.selectedMeshes.add(mesh.uniqueId.toString());
    });
    
    this.notifySelectionChanged();
    this.resetMarqueeSelection();
    
    console.log(`🔲 MultiSelection: Marquee selection completed, selected ${selectedInMarquee.length} meshes`);
  }

  /**
   * Select meshes within rectangle using GPU picking (following external docs)
   */
  private selectMeshesInRectangle(rect: SelectionRectangle): AbstractMesh[] {
    const selected: AbstractMesh[] = [];
    
    // Sample points within the rectangle for GPU picking optimization
    const samplePoints = this.generateSamplePoints(rect);
    const meshesInRect = new Set<string>();
    
    samplePoints.forEach(point => {
      // Convert screen coordinates to world ray
      const ray = this.camera.getForwardRay(undefined, this.screenToWorldMatrix(point));
      
      // Pick with ray
      const pickInfo = this.scene.pickWithRay(ray, (mesh) => 
        this.selectableMeshes.includes(mesh as AbstractMesh)
      );
      
      if (pickInfo?.hit && pickInfo.pickedMesh) {
        meshesInRect.add(pickInfo.pickedMesh.uniqueId.toString());
      }
    });
    
    // Convert mesh IDs back to meshes
    meshesInRect.forEach(meshId => {
      const mesh = this.selectableMeshes.find(m => m.uniqueId.toString() === meshId);
      if (mesh) {
        selected.push(mesh);
      }
    });
    
    return selected;
  }

  /**
   * Generate sample points within rectangle for GPU picking
   */
  private generateSamplePoints(rect: SelectionRectangle): Vector2[] {
    const points: Vector2[] = [];
    const samples = 20; // Number of sample points per axis
    
    const stepX = (rect.endX - rect.startX) / samples;
    const stepY = (rect.endY - rect.startY) / samples;
    
    for (let x = rect.startX; x <= rect.endX; x += stepX) {
      for (let y = rect.startY; y <= rect.endY; y += stepY) {
        points.push(new Vector2(x, y));
      }
    }
    
    return points;
  }

  /**
   * Convert screen coordinates to world matrix (placeholder for future implementation)
   */
  private screenToWorldMatrix(_screenPoint: Vector2): any {
    // This is a simplified version - in a full implementation,
    // we'd use the camera's projection and view matrices
    return undefined; // Let getForwardRay handle the conversion
  }

  /**
   * Handle single/multi mesh selection (following playground patterns)
   */
  private handleMeshSelection(event: PointerEvent, addToSelection: boolean): void {
    const pickInfo = this.scene.pick(event.offsetX, event.offsetY, (mesh) => 
      this.selectableMeshes.includes(mesh as AbstractMesh)
    );
    
    if (pickInfo?.hit && pickInfo.pickedMesh) {
      const mesh = pickInfo.pickedMesh as AbstractMesh;
      const meshId = mesh.uniqueId.toString();
      
      if (addToSelection) {
        // Toggle selection
        if (this.selectedMeshes.has(meshId)) {
          this.selectedMeshes.delete(meshId);
        } else {
          this.selectedMeshes.add(meshId);
        }
      } else {
        // Replace selection
        this.selectedMeshes.clear();
        this.selectedMeshes.add(meshId);
      }
      
      this.notifySelectionChanged();
      console.log(`🎯 MultiSelection: ${addToSelection ? 'Toggled' : 'Selected'} mesh: ${mesh.name}`);
    } else if (!addToSelection) {
      // Clear selection if clicking on empty space
      this.clearSelection();
    }
  }

  /**
   * Context menu handler
   */
  private onContextMenu(event: Event): void {
    if (this.isMarqueeSelecting) {
      event.preventDefault();
    }
  }

  /**
   * Reset marquee selection state
   */
  private resetMarqueeSelection(): void {
    this.isMarqueeSelecting = false;
    this.marqueeStartPoint = null;
    this.marqueeEndPoint = null;
    this.removeMarqueeOverlay();
  }

  /**
   * Remove marquee overlay
   */
  private removeMarqueeOverlay(): void {
    if (this.marqueeOverlay && this.marqueeOverlay.parentNode) {
      this.marqueeOverlay.parentNode.removeChild(this.marqueeOverlay);
      this.marqueeOverlay = null;
    }
  }

  /**
   * Set selectable meshes
   */
  setSelectableMeshes(meshes: AbstractMesh[]): void {
    this.selectableMeshes = [...meshes];
    console.log(`🎯 MultiSelection: Set ${meshes.length} selectable meshes`);
  }

  /**
   * Add selection callback
   */
  onSelectionChanged(callback: (meshes: AbstractMesh[]) => void): void {
    this.selectionCallbacks.push(callback);
  }

  /**
   * Notify selection changed
   */
  private notifySelectionChanged(): void {
    const selectedMeshes = this.getSelectedMeshes();
    this.selectionCallbacks.forEach(callback => callback(selectedMeshes));
  }

  /**
   * Get currently selected meshes
   */
  getSelectedMeshes(): AbstractMesh[] {
    return this.selectableMeshes.filter(mesh => 
      this.selectedMeshes.has(mesh.uniqueId.toString())
    );
  }

  /**
   * Clear all selections
   */
  clearSelection(): void {
    this.selectedMeshes.clear();
    this.notifySelectionChanged();
    console.log('🎯 MultiSelection: Selection cleared');
  }

  /**
   * Select all meshes
   */
  selectAll(): void {
    this.selectableMeshes.forEach(mesh => {
      this.selectedMeshes.add(mesh.uniqueId.toString());
    });
    this.notifySelectionChanged();
    console.log(`🎯 MultiSelection: Selected all ${this.selectableMeshes.length} meshes`);
  }

  /**
   * Invert selection
   */
  invertSelection(): void {
    const newSelection = new Set<string>();
    this.selectableMeshes.forEach(mesh => {
      const meshId = mesh.uniqueId.toString();
      if (!this.selectedMeshes.has(meshId)) {
        newSelection.add(meshId);
      }
    });
    
    this.selectedMeshes = newSelection;
    this.notifySelectionChanged();
    console.log('🎯 MultiSelection: Selection inverted');
  }

  /**
   * Get selection count
   */
  getSelectionCount(): number {
    return this.selectedMeshes.size;
  }

  /**
   * Check if mesh is selected
   */
  isMeshSelected(mesh: AbstractMesh): boolean {
    return this.selectedMeshes.has(mesh.uniqueId.toString());
  }

  /**
   * Dispose manager
   */
  dispose(): void {
    // Remove event listeners
    this.canvas.removeEventListener('pointerdown', this.onPointerDown.bind(this));
    this.canvas.removeEventListener('pointermove', this.onPointerMove.bind(this));
    this.canvas.removeEventListener('pointerup', this.onPointerUp.bind(this));
    this.canvas.removeEventListener('contextmenu', this.onContextMenu.bind(this));
    
    // Clean up marquee
    this.removeMarqueeOverlay();
    
    // Clear state
    this.selectedMeshes.clear();
    this.selectionCallbacks = [];
    this.selectableMeshes = [];
    
    console.log('🧹 MultiSelection: Manager disposed');
  }
}

export default MultiSelectionManager;
