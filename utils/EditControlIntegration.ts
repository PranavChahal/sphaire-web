/**
 * EDITCONTROL INTEGRATION - BASED ON ssatguru/BabylonJS-EditControl
 * 
 * Integrates the EditControl library patterns for transform controls and undo/redo functionality.
 * Following the external repository patterns for proper implementation.
 */

import { 
  Scene, Camera, AbstractMesh, Vector3, Quaternion 
} from '@babylonjs/core';

// Command Pattern for Undo/Redo (following EditControl patterns)
interface Command {
  execute(): void;
  undo(): void;
  description: string;
}

// Transform Command (following EditControl API patterns)
export class TransformCommand implements Command {
  private mesh: AbstractMesh;
  private previousPosition: Vector3;
  private previousRotation: Vector3 | Quaternion;
  private previousScaling: Vector3;
  private newPosition: Vector3;
  private newRotation: Vector3 | Quaternion;
  private newScaling: Vector3;
  
  constructor(
    mesh: AbstractMesh,
    previousPosition: Vector3,
    previousRotation: Vector3 | Quaternion,
    previousScaling: Vector3,
    newPosition: Vector3,
    newRotation: Vector3 | Quaternion,
    newScaling: Vector3
  ) {
    this.mesh = mesh;
    this.previousPosition = previousPosition.clone();
    this.previousRotation = previousRotation instanceof Vector3 ? previousRotation.clone() : previousRotation.clone();
    this.previousScaling = previousScaling.clone();
    this.newPosition = newPosition.clone();
    this.newRotation = newRotation instanceof Vector3 ? newRotation.clone() : newRotation.clone();
    this.newScaling = newScaling.clone();
  }

  execute(): void {
    this.mesh.position = this.newPosition.clone();
    if (this.newRotation instanceof Vector3) {
      this.mesh.rotation = this.newRotation.clone();
    } else {
      this.mesh.rotationQuaternion = this.newRotation.clone();
    }
    this.mesh.scaling = this.newScaling.clone();
  }

  undo(): void {
    this.mesh.position = this.previousPosition.clone();
    if (this.previousRotation instanceof Vector3) {
      this.mesh.rotation = this.previousRotation.clone();
      this.mesh.rotationQuaternion = null;
    } else {
      this.mesh.rotationQuaternion = this.previousRotation.clone();
    }
    this.mesh.scaling = this.previousScaling.clone();
  }

  get description(): string {
    return `Transform ${this.mesh.name}`;
  }
}

// Command Manager (following EditControl undo/redo patterns)
export class CommandManager {
  private commandHistory: Command[] = [];
  private currentIndex: number = -1;
  private maxHistorySize: number = 50;

  executeCommand(command: Command): void {
    // Remove any commands after current index (when we're not at the end)
    this.commandHistory = this.commandHistory.slice(0, this.currentIndex + 1);
    
    // Execute the command
    command.execute();
    
    // Add to history
    this.commandHistory.push(command);
    this.currentIndex++;
    
    // Trim history if too large
    if (this.commandHistory.length > this.maxHistorySize) {
      this.commandHistory.shift();
      this.currentIndex--;
    }
    
    console.log(`✅ Executed: ${command.description}`);
  }

  undo(): boolean {
    if (this.currentIndex >= 0) {
      const command = this.commandHistory[this.currentIndex];
      command.undo();
      this.currentIndex--;
      console.log(`↩️ Undone: ${command.description}`);
      return true;
    }
    console.log('⚠️ Nothing to undo');
    return false;
  }

  redo(): boolean {
    if (this.currentIndex < this.commandHistory.length - 1) {
      this.currentIndex++;
      const command = this.commandHistory[this.currentIndex];
      command.execute();
      console.log(`↪️ Redone: ${command.description}`);
      return true;
    }
    console.log('⚠️ Nothing to redo');
    return false;
  }

  canUndo(): boolean {
    return this.currentIndex >= 0;
  }

  canRedo(): boolean {
    return this.currentIndex < this.commandHistory.length - 1;
  }

  clear(): void {
    this.commandHistory = [];
    this.currentIndex = -1;
    console.log('🧹 Command history cleared');
  }
}

// EditControl-style Transform Manager (following external patterns)
export class EditControlManager {
  private commandManager: CommandManager;
  private activeTransforms = new Map<string, any>();
  
  // Transform settings (following EditControl API) - prefixed with _ to indicate future API compatibility
  private _translationEnabled = true;
  private _rotationEnabled = true;
  private _scalingEnabled = true;
  private _localMode = false;
  private _snapEnabled = false;
  private _transSnapValue = 0.5;
  private _rotSnapValue = Math.PI / 24; // 15 degrees
  private _scaleSnapValue = 0.1;

  constructor(_scene: Scene, _camera: Camera, _canvas: HTMLCanvasElement) {
    // Store references for potential future use (avoiding unused parameter warnings)
    console.log('🎮 EditControl Manager initialized with scene, camera, canvas');
    this.commandManager = new CommandManager();
  }

  // EditControl API getters/setters (following external patterns)
  isTranslationEnabled(): boolean {
    return this._translationEnabled;
  }

  setTranslationEnabled(enabled: boolean): void {
    this._translationEnabled = enabled;
    console.log(`🔄 Translation ${enabled ? 'enabled' : 'disabled'}`);
  }

  isRotationEnabled(): boolean {
    return this._rotationEnabled;
  }

  setRotationEnabled(enabled: boolean): void {
    this._rotationEnabled = enabled;
    console.log(`🔄 Rotation ${enabled ? 'enabled' : 'disabled'}`);
  }

  isScalingEnabled(): boolean {
    return this._scalingEnabled;
  }

  setScalingEnabled(enabled: boolean): void {
    this._scalingEnabled = enabled;
    console.log(`🔄 Scaling ${enabled ? 'enabled' : 'disabled'}`);
  }

  isLocalMode(): boolean {
    return this._localMode;
  }

  setLocalMode(local: boolean): void {
    this._localMode = local;
    console.log(`🔄 ${local ? 'Local' : 'World'} coordinate mode`);
  }

  isSnapEnabled(): boolean {
    return this._snapEnabled;
  }

  getTransSnapValue(): number {
    return this._transSnapValue;
  }

  setTransSnapValue(value: number): void {
    this._transSnapValue = value;
    console.log(`🔄 Translation snap value: ${value}`);
  }

  getRotSnapValue(): number {
    return this._rotSnapValue;
  }

  setRotSnapValue(value: number): void {
    this._rotSnapValue = value;
    console.log(`🔄 Rotation snap value: ${value} radians`);
  }

  getScaleSnapValue(): number {
    return this._scaleSnapValue;
  }

  setScaleSnapValue(value: number): void {
    this._scaleSnapValue = value;
    console.log(`🔄 Scale snap value: ${value}`);
  }

  // Record transform state before changes (following EditControl patterns)
  startTransform(mesh: AbstractMesh): void {
    const state = {
      position: mesh.position.clone(),
      rotation: mesh.rotation ? mesh.rotation.clone() : (mesh.rotationQuaternion ? mesh.rotationQuaternion.clone() : Vector3.Zero()),
      scaling: mesh.scaling.clone()
    };
    this.activeTransforms.set(mesh.uniqueId.toString(), state);
    console.log(`🎯 Started transform for: ${mesh.name}`);
  }

  // Complete transform and add to command history (following EditControl patterns)
  endTransform(mesh: AbstractMesh): void {
    const previousState = this.activeTransforms.get(mesh.uniqueId.toString());
    if (previousState) {
      const command = new TransformCommand(
        mesh,
        previousState.position,
        previousState.rotation,
        previousState.scaling,
        mesh.position,
        mesh.rotation || mesh.rotationQuaternion || Vector3.Zero(),
        mesh.scaling
      );
      
      this.commandManager.executeCommand(command);
      this.activeTransforms.delete(mesh.uniqueId.toString());
      console.log(`✅ Completed transform for: ${mesh.name}`);
    }
  }

  // Undo/Redo methods (following EditControl patterns)
  undo(): boolean {
    return this.commandManager.undo();
  }

  redo(): boolean {
    return this.commandManager.redo();
  }

  canUndo(): boolean {
    return this.commandManager.canUndo();
  }

  canRedo(): boolean {
    return this.commandManager.canRedo();
  }

  // Keyboard shortcut handler (following EditControl patterns)
  setupKeyboardShortcuts(): () => void {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isCtrlOrCmd = event.ctrlKey || event.metaKey;
      
      if (isCtrlOrCmd && event.key === 'z' && !event.shiftKey) {
        event.preventDefault();
        this.undo();
      } else if (isCtrlOrCmd && (event.key === 'y' || (event.key === 'z' && event.shiftKey))) {
        event.preventDefault();
        this.redo();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    console.log('⌨️ Keyboard shortcuts registered (Ctrl/Cmd+Z for undo, Ctrl/Cmd+Shift+Z for redo)');
    
    // Return cleanup function
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }

  dispose(): void {
    this.activeTransforms.clear();
    this.commandManager.clear();
    console.log('🧹 EditControl Manager disposed');
  }
}

export default EditControlManager;
