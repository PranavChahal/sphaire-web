import React, { useRef, useEffect, useState } from 'react';
import { 
  Vector3, 
  Mesh, 
  MeshBuilder, 
  Scene, 
  StandardMaterial, 
  Color3, 
  PointerEventTypes, 
  PointerInfo,
  GizmoManager,
  Observer,
  Nullable
} from '@babylonjs/core';

interface Cursor3DProps {
  position?: Vector3;
  visible?: boolean;
  onMove?: (newPos: Vector3) => void;
  scene?: Scene;
  useGizmo?: boolean;
  cursorSize?: number;
  cursorColor?: string;
  cursorOpacity?: number;
}

/**
 * A 3D cursor component that renders a semi-transparent sphere in the scene
 * with optional position gizmo and click-to-move functionality.
 */
const Cursor3D: React.FC<Cursor3DProps> = ({
  position = new Vector3(0, 0, 0),
  visible = true,
  onMove = () => {},
  scene,
  useGizmo = false,
  cursorSize = 0.2,
  cursorColor = "#FF88FF",
  cursorOpacity = 0.5
}) => {
  const cursorRef = useRef<Mesh | null>(null);
  const gizmoManagerRef = useRef<GizmoManager | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentScene, setCurrentScene] = useState<Scene | undefined>(scene);
  
  // Initialize or get the active scene
  useEffect(() => {
    if (scene) {
      setCurrentScene(scene);
    }
    // Note: No fallback to window.BABYLON as it doesn't have activeScene property
  }, [scene]);

  // Create or update cursor mesh
  useEffect(() => {
    // Add extra safety check for scene engine
    if (!currentScene || !currentScene.getEngine || !currentScene.getEngine()) {
      console.warn('Cursor3D: Scene or scene engine is not available');
      return;
    }
    
    try {
      // Create the cursor mesh if it doesn't exist
      if (!cursorRef.current) {
        // Create a sphere for the cursor
        const cursor = MeshBuilder.CreateSphere(
          "cursor3D",
          { diameter: cursorSize * 2 },
          currentScene
        );
        
        // Create a semi-transparent material
        const material = new StandardMaterial("cursorMaterial", currentScene);
        material.diffuseColor = Color3.FromHexString(cursorColor);
        material.alpha = cursorOpacity;
        
        cursor.material = material;
        cursor.isPickable = false; // Prevent the cursor from being picked by raycasts
        
        cursorRef.current = cursor;
        setIsInitialized(true);
      }
    } catch (err) {
      console.error('Error creating cursor:', err);
    }
    
    // Update position with safety check
    if (cursorRef.current) {
      try {
        // Make sure position is valid before cloning
        // Ensure we have a valid position with better defensive checks
        if (position && position.x !== undefined && position.y !== undefined && position.z !== undefined) {
          try {
            // Create a new Vector3 instead of relying on clone method
            cursorRef.current.position = new Vector3(position.x, position.y, position.z);
          } catch (err) {
            console.error('Error setting cursor position:', err);
            cursorRef.current.position = new Vector3(0, 0, 0);
          }
        } else {
          // Fallback to origin if position is invalid
          cursorRef.current.position = new Vector3(0, 0, 0);
        }
        cursorRef.current.visibility = visible ? 1 : 0;
      } catch (err) {
        console.error('Error setting cursor position:', err);
        cursorRef.current.position = new Vector3(0, 0, 0);
      }
    }
    
    // Cleanup function
    return () => {
      if (cursorRef.current && currentScene) {
        cursorRef.current.dispose();
        cursorRef.current = null;
      }
    };
  }, [currentScene, cursorSize, cursorColor, cursorOpacity]);
  
  // Update cursor position when props change with safety checks
  useEffect(() => {
    if (cursorRef.current) {
      try {
        // Make sure position is valid before cloning
        if (position && typeof position.clone === 'function') {
          cursorRef.current.position = position.clone();
        }
        cursorRef.current.visibility = visible ? 1 : 0;
      } catch (err) {
        console.error('Error updating cursor position:', err);
      }
    }
  }, [position, visible]);

  // Setup gizmo
  useEffect(() => {
    if (!currentScene || !cursorRef.current || !isInitialized || !useGizmo) return;
    
    // Create gizmo manager if it doesn't exist
    if (!gizmoManagerRef.current) {
      const gizmoManager = new GizmoManager(currentScene);
      gizmoManager.positionGizmoEnabled = true;
      gizmoManager.rotationGizmoEnabled = false;
      gizmoManager.scaleGizmoEnabled = false;
      gizmoManager.attachToMesh(cursorRef.current);
      
      // Configure position gizmo
      const positionGizmo = gizmoManager.gizmos.positionGizmo;
      if (positionGizmo) {
        // Update onDragEnd to notify parent component
        positionGizmo.onDragEndObservable.add(() => {
          if (cursorRef.current) {
            // Ensure we create a new Vector3 instead of using clone
            const currentPos = cursorRef.current.position;
            onMove(new Vector3(currentPos.x, currentPos.y, currentPos.z));
          }
        });
      }
      
      gizmoManagerRef.current = gizmoManager;
    }
    
    // Update gizmo visibility
    if (gizmoManagerRef.current) {
      gizmoManagerRef.current.positionGizmoEnabled = visible && useGizmo;
    }
    
    // Cleanup function
    return () => {
      if (gizmoManagerRef.current) {
        gizmoManagerRef.current.dispose();
        gizmoManagerRef.current = null;
      }
    };
  }, [currentScene, isInitialized, useGizmo, visible, onMove]);
  
  // Setup raycast on click
  useEffect(() => {
    // Additional safety checks
    if (!currentScene || !isInitialized || 
        !currentScene.getEngine || !currentScene.getEngine()) {
      console.warn('Cursor3D: Scene or scene engine is not available for pointer events');
      return;
    }
    
    // Handler for pointer down events
    const onPointerDown = (pointerInfo: PointerInfo) => {
      try {
        // Only handle left clicks
        if (pointerInfo.event.button !== 0 || !visible) return;
        
        // Check if we're clicking on the gizmo (don't perform raycast in this case)
        if (pointerInfo.pickInfo?.pickedMesh?.name?.includes('gizmo')) {
          return;
        }
        
        // Additional safety checks for camera and scene
        if (!currentScene.activeCamera) {
          console.warn('Cursor3D: No active camera available for raycast');
          return;
        }
        
        // Perform the raycast from the camera through the pointer position
        const ray = currentScene.createPickingRay(
          currentScene.pointerX,
          currentScene.pointerY,
          null,
          currentScene.activeCamera
        );
        
        const pickInfo = currentScene.pickWithRay(ray);
        
        // If we hit something (not the cursor itself), move the cursor to that point
        if (pickInfo?.hit && pickInfo.pickedMesh !== cursorRef.current) {
          const hitPoint = pickInfo.pickedPoint;
          if (hitPoint && cursorRef.current) {
            // Create a new Vector3 instead of using clone
            cursorRef.current.position = new Vector3(hitPoint.x, hitPoint.y, hitPoint.z);
            // Pass a new Vector3 to onMove instead of using clone
            onMove(new Vector3(hitPoint.x, hitPoint.y, hitPoint.z));
          }
        }
      } catch (err) {
        console.error('Error in cursor pointer handling:', err);
      }
    };
    
    // Register pointer down observer with safety check
    let observer: Nullable<Observer<PointerInfo>> = null;
    try {
      observer = currentScene.onPointerObservable.add(
        onPointerDown,
        PointerEventTypes.POINTERDOWN
      );
    } catch (err) {
      console.error('Error registering pointer observer:', err);
    }
    
    // Cleanup function
    return () => {
      if (currentScene) {
        currentScene.onPointerObservable.remove(observer);
      }
    };
  }, [currentScene, isInitialized, visible, onMove]);
  
  // This is a React component, but the rendering is handled by Babylon.js
  // so we don't need to return any JSX here
  return null;
};

export default Cursor3D;
