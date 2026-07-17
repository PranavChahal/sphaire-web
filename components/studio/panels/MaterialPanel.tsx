/** Material — direct color/texture editing plus optional AI generation. */

import React, { useMemo, useRef, useState } from 'react';
import { Color3, PBRMaterial, StandardMaterial } from '@babylonjs/core';
import useSceneStore from '../../../store/sceneStore';
import { applyTextureToMesh, generateTexture } from '../../../services/textureService';
import {
  PBRTextureStack,
  stableMaterialsService,
} from '../../../services/stableMaterialsService';
import { Drawer, SliderRow } from '../ui';
import { IconCheck, IconSpinner, IconTexture } from '../icons';

type MaterialMode = 'pbr' | 'simple';

const PBR_LABELS: Array<[keyof PBRTextureStack, string]> = [
  ['baseColor', 'Base color'],
  ['normal', 'Normal'],
  ['roughness', 'Roughness'],
  ['metallic', 'Metallic'],
  ['height', 'Height'],
  ['ao', 'Ambient occlusion'],
];

const SWATCHES = ['#e8e9ed', '#25262a', '#e5484d', '#2d7ff9', '#36a269', '#d9a441'];
const originalMaterials = new WeakMap<any, any>();

const materialTargets = (selection: any[], scene: any): any[] => {
  const targets: any[] = [];
  const seen = new Set<number>();
  const add = (mesh: any) => {
    if (!mesh?.geometry || seen.has(mesh.uniqueId)) return;
    seen.add(mesh.uniqueId);
    targets.push(mesh);
  };
  selection.forEach((mesh) => {
    add(mesh);
    if (typeof mesh?.getChildMeshes === 'function') {
      (mesh.getChildMeshes(false) || []).forEach(add);
    }
  });

  // Imported GLB/GLTF/OBJ files are represented by one logical shape and many
  // renderable child meshes. Selecting any one part should make the Material
  // tool operate on the complete model, not an arbitrary door or wheel.
  const selectedShapeIds = new Set(
    selection.map((mesh) => mesh?.metadata?.shapeId).filter(Boolean)
  );
  if (selectedShapeIds.size && Array.isArray(scene?.meshes)) {
    scene.meshes.forEach((mesh: any) => {
      if (selectedShapeIds.has(mesh?.metadata?.shapeId)) add(mesh);
    });
  }
  return targets;
};

const rememberOriginalMaterial = (mesh: any) => {
  if (!originalMaterials.has(mesh)) originalMaterials.set(mesh, mesh.material || null);
};

const editableMaterial = (mesh: any) => {
  rememberOriginalMaterial(mesh);
  const original = originalMaterials.get(mesh);
  let material = mesh.material;
  if (material && material === original && typeof material.clone === 'function') {
    material = material.clone(`${material.name || 'material'}-sphaire-${mesh.uniqueId}`);
    if (Array.isArray(material?.subMaterials)) {
      material.subMaterials = material.subMaterials.map((surface: any, index: number) =>
        surface?.clone?.(`${surface.name || 'surface'}-sphaire-${mesh.uniqueId}-${index}`) || surface
      );
    }
    mesh.material = material;
  }
  if (!material) {
    material = new StandardMaterial(`sphaire-color-${mesh.uniqueId}`, mesh.getScene());
    material.backFaceCulling = false;
    mesh.material = material;
  }
  return material;
};

const eachSurfaceMaterial = (material: any, visit: (value: any) => void) => {
  if (Array.isArray(material?.subMaterials)) {
    material.subMaterials.filter(Boolean).forEach(visit);
  } else if (material) {
    visit(material);
  }
};

const MaterialPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { scene, selectedMeshes } = useSceneStore();
  const targets = useMemo(() => materialTargets(selectedMeshes, scene), [scene, selectedMeshes]);
  const [mode, setMode] = useState<MaterialMode>('pbr');
  const [color, setColor] = useState('#5f7cff');
  const [metallic, setMetallic] = useState(0.15);
  const [roughness, setRoughness] = useState(0.55);
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pbrTextures, setPbrTextures] = useState<PBRTextureStack | null>(null);
  const textureInputRef = useRef<HTMLInputElement>(null);

  const applyAppearance = (nextColor = color) => {
    if (!targets.length) {
      setError('Select an object or model part first.');
      return;
    }
    setError(null);
    const tint = Color3.FromHexString(nextColor);
    targets.forEach((mesh) => {
      const material = editableMaterial(mesh);
      eachSurfaceMaterial(material, (surface) => {
        if (surface instanceof PBRMaterial || 'albedoColor' in surface) {
          surface.albedoColor = tint.clone();
          surface.metallic = metallic;
          surface.roughness = roughness;
        } else if (surface instanceof StandardMaterial || 'diffuseColor' in surface) {
          surface.diffuseColor = tint.clone();
          surface.specularColor = new Color3(0.05 + metallic * 0.5, 0.05 + metallic * 0.5, 0.05 + metallic * 0.5);
        }
        surface.markAsDirty?.(3);
      });
    });
    setApplied(true);
  };

  const uploadTexture = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !targets.length) return;
    setApplying(true);
    setApplied(false);
    setError(null);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Could not read that image.'));
        reader.readAsDataURL(file);
      });
      targets.forEach(rememberOriginalMaterial);
      await Promise.all(targets.map((mesh) => applyTextureToMesh(mesh, dataUrl)));
      setPreviewUrl(dataUrl);
      setPbrTextures(null);
      setApplied(true);
    } catch (cause: any) {
      setError(cause?.message || 'The texture could not be applied.');
    } finally {
      setApplying(false);
    }
  };

  const restoreOriginal = () => {
    targets.forEach((mesh) => {
      if (originalMaterials.has(mesh)) {
        mesh.material = originalMaterials.get(mesh);
        originalMaterials.delete(mesh);
      }
    });
    setApplied(false);
    setError(null);
  };

  const generate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!prompt.trim() || generating) return;
    setGenerating(true);
    setApplied(false);
    setError(null);
    try {
      if (mode === 'pbr') {
        const textures = await stableMaterialsService.generatePBRTextures(prompt.trim(), {
          seamless: true,
          tileable: true,
          quality: 'hd',
        });
        setPbrTextures(textures);
        setPreviewUrl(textures.baseColor);
        await stableMaterialsService.preloadTextures(textures);
      } else {
        const url = await generateTexture(prompt.trim());
        setPreviewUrl(url);
        setPbrTextures(null);
      }
    } catch (cause: any) {
      setError(cause?.message || 'The material could not be generated.');
    } finally {
      setGenerating(false);
    }
  };

  const apply = async () => {
    if (!targets.length) {
      setError('Select an object before applying this material.');
      return;
    }
    if (!previewUrl) return;
    setApplying(true);
    setApplied(false);
    setError(null);
    try {
      targets.forEach(rememberOriginalMaterial);
      await Promise.all(targets.map((mesh) =>
        pbrTextures
          ? stableMaterialsService.applyPBRMaterialToMesh(mesh, pbrTextures)
          : stableMaterialsService.applySimpleTextureToMesh(mesh, previewUrl)
      ));
      setApplied(true);
    } catch (cause: any) {
      setError(cause?.message || 'The material could not be applied.');
    } finally {
      setApplying(false);
    }
  };

  return (
    <Drawer title="Material" onClose={onClose}>
      <div className="st-material-host">
        <div className={`st-material-selection ${targets.length ? 'st-has-selection' : ''}`}>
          <span className="st-material-selection-icon"><IconTexture size={15} /></span>
          <span>
            <strong>{targets.length ? `${targets.length} editable ${targets.length === 1 ? 'surface' : 'surfaces'}` : 'No editable surface selected'}</strong>
            <small>{targets.length ? 'Color, upload, or generate a material below' : 'Select an object or model part first'}</small>
          </span>
        </div>

        <div className="st-label">Quick appearance</div>
        <div className="st-quick-material">
          <div className="st-color-control">
            <input
              type="color"
              value={color}
              aria-label="Object color"
              onChange={(event) => setColor(event.target.value)}
            />
            <span><strong>Color</strong><small>{color.toUpperCase()}</small></span>
            <button onClick={() => applyAppearance()}>Apply</button>
          </div>
          <div className="st-material-swatches" aria-label="Color presets">
            {SWATCHES.map((swatch) => (
              <button
                key={swatch}
                className={color === swatch ? 'st-active' : ''}
                style={{ background: swatch }}
                aria-label={`Apply ${swatch}`}
                onClick={() => { setColor(swatch); applyAppearance(swatch); }}
              />
            ))}
          </div>
          <SliderRow name="Metallic" value={metallic} min={0} max={1} step={0.05} onChange={setMetallic} />
          <SliderRow name="Roughness" value={roughness} min={0.05} max={1} step={0.05} onChange={setRoughness} />
          <div className="st-material-actions">
            <button onClick={() => textureInputRef.current?.click()} disabled={!targets.length || applying}>
              {applying ? <IconSpinner size={13} /> : <IconTexture size={13} />} Upload image
            </button>
            <button onClick={restoreOriginal} disabled={!targets.some((mesh) => originalMaterials.has(mesh))}>Original</button>
          </div>
          <input ref={textureInputRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={uploadTexture} />
        </div>

        <div className="st-label">AI material</div>

        <div className="st-label">Material type</div>
        <div className="st-seg">
          <button className={mode === 'pbr' ? 'st-active' : ''} onClick={() => setMode('pbr')}>PBR material</button>
          <button className={mode === 'simple' ? 'st-active' : ''} onClick={() => setMode('simple')}>Image texture</button>
        </div>

        <form className="st-material-form" onSubmit={generate}>
          <label className="st-label" htmlFor="st-material-prompt">Describe the surface</label>
          <textarea
            id="st-material-prompt"
            className="st-input st-material-prompt"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder={mode === 'pbr' ? 'Brushed aluminium, fine grain, soft satin finish…' : 'Dark walnut with subtle natural grain…'}
          />
          <p className="st-hint">
            {mode === 'pbr' ? 'Creates a seamless, physically based texture stack.' : 'Creates one lightweight color texture.'}
          </p>
          <button className="st-cb-generate st-material-generate" type="submit" disabled={!prompt.trim() || generating || !scene}>
            {generating ? <><IconSpinner size={14} /> Generating</> : <><IconTexture size={14} /> Generate material</>}
          </button>
        </form>

        {error && <div className="st-material-error">{error}</div>}

        {previewUrl && (
          <div className="st-material-result">
            <div className="st-material-preview-main">
              <img src={previewUrl} alt="Generated material preview" />
              <span>{pbrTextures ? 'PBR' : 'Texture'}</span>
            </div>
            {pbrTextures && (
              <div className="st-material-maps">
                {PBR_LABELS.map(([key, label]) => {
                  const url = pbrTextures[key];
                  return url ? (
                    <div key={key} className="st-material-map">
                      <img src={url} alt={`${label} map`} />
                      <span>{label}</span>
                    </div>
                  ) : null;
                })}
              </div>
            )}
            <button className="st-material-apply" onClick={apply} disabled={!targets.length || applying}>
              {applying ? <><IconSpinner size={14} /> Applying</> : applied ? <><IconCheck size={14} /> Applied</> : 'Apply to selection'}
            </button>
          </div>
        )}
      </div>
    </Drawer>
  );
};

export default MaterialPanel;
