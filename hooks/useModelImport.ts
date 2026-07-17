/**
 * Shared model import pipeline (extracted from the legacy header so the
 * studio shell, library drawer and AI organic route can all use it).
 *
 * Flow: File -> SceneLoader (blob URL) -> container mesh -> auto-scale ->
 * lift to grid -> frame camera -> base64 -> unified store entry.
 */

import { useCallback, useState } from 'react';
import * as BABYLON from '@babylonjs/core';
import useStore from '../store/store';
import useSceneStore from '../store/sceneStore';

const SUPPORTED = ['.glb', '.gltf', '.obj', '.stl'];

function calculateImportScale(meshes: BABYLON.AbstractMesh[]): number {
  if (!meshes || meshes.length === 0) return 1;
  meshes.forEach((m) => m.computeWorldMatrix(true));
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, minZ = Infinity, maxZ = -Infinity;
  meshes.forEach((mesh) => {
    const bb = mesh.getBoundingInfo().boundingBox;
    minX = Math.min(minX, bb.minimumWorld.x);
    maxX = Math.max(maxX, bb.maximumWorld.x);
    minY = Math.min(minY, bb.minimumWorld.y);
    maxY = Math.max(maxY, bb.maximumWorld.y);
    minZ = Math.min(minZ, bb.minimumWorld.z);
    maxZ = Math.max(maxZ, bb.maximumWorld.z);
  });
  const maxDimension = Math.max(maxX - minX, maxY - minY, maxZ - minZ);
  const targetSize = 5;
  return maxDimension > targetSize ? targetSize / maxDimension : 1;
}

export function useModelImport() {
  const { addModel, selectShape } = useStore();
  const { scene } = useSceneStore();
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState('');

  const importFile = useCallback(
    async (file: File): Promise<string | null> => {
      if (!scene) throw new Error('Scene is not ready yet.');
      const fileExtension = '.' + file.name.toLowerCase().split('.').pop();
      if (!SUPPORTED.includes(fileExtension)) {
        throw new Error(`Unsupported format ${fileExtension}. Use: ${SUPPORTED.join(', ')}`);
      }

      setIsImporting(true);
      setProgress(`Importing ${file.name}…`);
      let blobUrl = '';
      try {
        const { SceneLoader } = await import('@babylonjs/core/Loading/sceneLoader');
        const arrayBuffer = await file.arrayBuffer();
        blobUrl = URL.createObjectURL(new Blob([arrayBuffer], { type: file.type }));

        const importResult = await SceneLoader.ImportMeshAsync(
          '', '', blobUrl, scene, undefined, fileExtension
        );
        if (!importResult.meshes || importResult.meshes.length === 0) {
          throw new Error('No 3D objects were found in the file.');
        }

        const modelContainer = new BABYLON.Mesh(`imported-model-${Date.now()}`, scene);
        modelContainer.isPickable = false;

        const root = importResult.meshes.find((m) => m && m.name === '__root__');
        if (root) {
          root.parent = modelContainer;
        } else {
          importResult.meshes.forEach((mesh) => {
            if (mesh && mesh.name !== '__root__') mesh.parent = modelContainer;
          });
        }
        importResult.meshes.forEach((m: any) => {
          if (m && m !== modelContainer) {
            m.metadata = { ...(m.metadata || {}), isModelChild: true };
          }
        });

        const scaleFactor = calculateImportScale(importResult.meshes);
        if (scaleFactor !== 1) {
          modelContainer.scaling = new BABYLON.Vector3(scaleFactor, scaleFactor, scaleFactor);
        }

        // Sit on the grid
        try {
          modelContainer.computeWorldMatrix(true);
          const bounds = modelContainer.getHierarchyBoundingVectors(true);
          if (isFinite(bounds.min.y)) modelContainer.position.y += -bounds.min.y;
        } catch {}

        // Frame the camera
        try {
          const cam = scene.activeCamera as BABYLON.ArcRotateCamera | null;
          if (cam && cam instanceof BABYLON.ArcRotateCamera) {
            const bv = modelContainer.getHierarchyBoundingVectors(true);
            const center = bv.min.add(bv.max).scale(0.5);
            const size = bv.max.subtract(bv.min);
            cam.target = center;
            cam.radius = Math.max(2, Math.min(100, Math.max(size.x, size.y, size.z) * 1.5 + 2));
          }
        } catch {}

        // Base64-encode for the unified store (chunked to avoid stack overflow)
        const uint8Array = new Uint8Array(arrayBuffer);
        let base64String = '';
        const chunk = 8192;
        for (let i = 0; i < uint8Array.length; i += chunk) {
          const slice = uint8Array.slice(i, i + chunk);
          base64String += btoa(String.fromCharCode.apply(null, Array.from(slice)));
        }

        const modelId = addModel({
          type: 'model',
          position: {
            x: modelContainer.position.x,
            y: modelContainer.position.y,
            z: modelContainer.position.z,
          },
          rotation: {
            x: (modelContainer.rotation.x || 0) * 180 / Math.PI,
            y: (modelContainer.rotation.y || 0) * 180 / Math.PI,
            z: (modelContainer.rotation.z || 0) * 180 / Math.PI,
          },
          scaling: {
            x: modelContainer.scaling.x,
            y: modelContainer.scaling.y,
            z: modelContainer.scaling.z,
          },
          format: fileExtension.replace('.', ''),
          fileName: file.name,
          data: base64String,
          originalSize: file.size,
          name: file.name.replace(/\.[^/.]+$/, ''),
        });

        modelContainer.name = modelId;
        modelContainer.metadata = { shapeId: modelId, isModelContainer: true };
        importResult.meshes.forEach((m: any) => {
          if (!m) return;
          m.metadata = { ...(m.metadata || {}), shapeId: modelId, isModelChild: true };
          if (m.material) {
            try {
              m.material.backFaceCulling = false;
              if ((m.material as any).twoSidedLighting !== undefined) {
                (m.material as any).twoSidedLighting = true;
              }
            } catch {}
          }
        });

        selectShape(modelId);
        return modelId;
      } finally {
        if (blobUrl) URL.revokeObjectURL(blobUrl);
        setIsImporting(false);
        setProgress('');
      }
    },
    [scene, addModel, selectShape]
  );

  /** Import from a URL (Thingi10K API route, generated GLB data URLs, …). */
  const importFromUrl = useCallback(
    async (url: string, fileName: string): Promise<string | null> => {
      setIsImporting(true);
      setProgress(`Loading ${fileName}…`);
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Download failed (${response.status})`);
        const arrayBuffer = await response.arrayBuffer();
        const file = new File([new Blob([arrayBuffer])], fileName);
        return await importFile(file);
      } finally {
        setIsImporting(false);
        setProgress('');
      }
    },
    [importFile]
  );

  return { importFile, importFromUrl, isImporting, progress, sceneReady: !!scene };
}
