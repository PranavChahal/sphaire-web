/**
 * Multi-angle scene capture.
 *
 * Renders the current Babylon scene from several orbit angles into base64 PNGs so a
 * vision model can judge whether the geometry actually matches the request. Uses a
 * throwaway ArcRotateCamera framed on the scene's world bounds, then restores the
 * user's active camera. Never mutates persistent scene state.
 */

import {
  ArcRotateCamera,
  Color3,
  Mesh,
  StandardMaterial,
  Tools,
  Vector3,
  VertexData,
} from '@babylonjs/core';

export interface CaptureOptions {
  /** Number of orbit views (default 4: front, side, back-quarter, top-quarter). */
  views?: number;
  /** Square render size in px (default 512). */
  size?: number;
}

const SCREENSHOT_TIMEOUT_MS = 4000;

function withCaptureDeadline<T>(promise: Promise<T>, ms = SCREENSHOT_TIMEOUT_MS): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('Render capture timed out.')), ms);
  });
  return Promise.race([promise, deadline]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

function getScene(): any | null {
  if (typeof window === 'undefined') return null;
  return (window as any).BABYLON_SCENE || null;
}

/**
 * Capture the scene from multiple angles.
 * Returns an array of `data:image/png;base64,...` strings (empty if no scene/meshes).
 */
export async function captureScene(opts: CaptureOptions = {}): Promise<string[]> {
  const scene = getScene();
  if (!scene) return [];

  const engine = scene.getEngine?.();
  if (!engine) return [];

  // Only consider real, visible meshes (skip ground/gizmos/helpers if flagged).
  const meshes = (scene.meshes || []).filter(
    (m: any) => {
      const name = String(m.name || '').toLowerCase();
      const helper = [
        'transparentgrid',
        'centeraxis',
        'groundplane',
        'helper',
        'gizmo',
        'camera',
        'light',
      ].some((token) => name.includes(token));
      return m.isVisible !== false && m.getTotalVertices?.() > 0 && !helper;
    }
  );
  if (meshes.length === 0) return [];

  const { min, max } = scene.getWorldExtends
    ? scene.getWorldExtends((m: any) => meshes.includes(m))
    : { min: new Vector3(-5, -5, -5), max: new Vector3(5, 5, 5) };

  const center = Vector3.Center(min, max);
  const diagonal = max.subtract(min).length() || 10;
  const radius = diagonal * 1.6;

  const views = opts.views ?? 4;
  const size = opts.size ?? 512;

  const previousCamera = scene.activeCamera;
  const cam = new ArcRotateCamera('__critic_cam', -Math.PI / 2, Math.PI / 3, radius, center, scene);
  cam.minZ = 0.01;
  cam.maxZ = radius * 10;

  const angles: Array<[number, number]> = (
    [
      [-Math.PI / 2, Math.PI / 3], // front
      [0, Math.PI / 3], // right
      [Math.PI / 2, Math.PI / 2.4], // back-ish
      [-Math.PI / 2, Math.PI / 8], // top-down quarter
    ] as Array<[number, number]>
  ).slice(0, views);

  const shots: string[] = [];
  try {
    scene.activeCamera = cam;
    for (const [alpha, beta] of angles) {
      cam.alpha = alpha;
      cam.beta = beta;
      cam.radius = radius;
      scene.render();
      // eslint-disable-next-line no-await-in-loop
      const dataUrl: string = await withCaptureDeadline(
        Tools.CreateScreenshotUsingRenderTargetAsync(
          engine,
          cam,
          { width: size, height: size },
          'image/png'
        )
      );
      shots.push(dataUrl);
    }
  } catch (e) {
    console.warn('[SCENE-CAPTURE] screenshot failed:', e);
  } finally {
    scene.activeCamera = previousCamera;
    cam.dispose();
  }
  return shots;
}

/**
 * Review an executor result before it is committed to the user's scene. The
 * candidate is mounted temporarily, existing design geometry is hidden, and
 * everything is restored after the multi-angle capture.
 */
export async function captureMeshData(meshData: any, opts: CaptureOptions = {}): Promise<string[]> {
  const scene = getScene();
  if (!scene || !meshData) return [];

  const items = (Array.isArray(meshData) ? meshData : [meshData]).filter(
    (item: any) => item?.positions?.length && item?.indices?.length
  );
  if (items.length === 0) return [];

  const previousVisibility = new Map<any, boolean>();
  const candidates: Mesh[] = [];
  let candidateMaterial: StandardMaterial | null = null;

  try {
    for (const mesh of scene.meshes || []) {
      const name = String(mesh.name || '').toLowerCase();
      const isHelper = ['transparentgrid', 'centeraxis', 'groundplane', 'helper', 'gizmo', 'camera', 'light'].some(
        (token) => name.includes(token)
      );
      if (!isHelper && mesh.getTotalVertices?.() > 0) {
        previousVisibility.set(mesh, mesh.isVisible);
        mesh.isVisible = false;
      }
    }

    candidateMaterial = new StandardMaterial('__critic_material', scene);
    candidateMaterial.diffuseColor = new Color3(0.64, 0.68, 0.78);
    candidateMaterial.specularColor = new Color3(0.35, 0.35, 0.4);

    items.forEach((item: any, index: number) => {
      const positions = Array.from(item.positions as ArrayLike<number>);
      const indices = Array.from(item.indices as ArrayLike<number>);
      const normals: number[] = [];
      VertexData.ComputeNormals(positions, indices, normals);
      const vertexData = new VertexData();
      vertexData.positions = positions;
      vertexData.indices = indices;
      vertexData.normals = normals;
      const mesh = new Mesh(`__critic_candidate_${index}`, scene);
      vertexData.applyToMesh(mesh);
      mesh.material = candidateMaterial;
      mesh.isPickable = false;
      candidates.push(mesh);
    });

    // Put the generated candidate on the ground for a stable, legible review.
    const bounds = scene.getWorldExtends((mesh: any) => candidates.includes(mesh));
    if (Number.isFinite(bounds?.min?.y)) {
      candidates.forEach((mesh) => {
        mesh.position.y -= bounds.min.y;
        mesh.computeWorldMatrix(true);
      });
    }

    return await captureScene(opts);
  } finally {
    previousVisibility.forEach((visible, mesh) => {
      if (!mesh.isDisposed?.()) mesh.isVisible = visible;
    });
    candidates.forEach((mesh) => mesh.dispose(false, false));
    candidateMaterial?.dispose();
  }
}
