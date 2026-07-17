/**
 * Inspector — appears only when something is selected.
 * Ask (AI edit) · Parameters (live regeneration) · Transform · Actions.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import useStore, { ParametricShape, Shape } from '../../store/store';
import useSceneStore from '../../store/sceneStore';
import { useAIModelingContextAware } from '../../hooks/useAIModelingContextAware';
import { regenerateParametricShape } from '../../services/parametricRegenerator';
import { formatParameterName } from '../../utils/parameterExtractor';
import { exportSTL, downloadBlob } from '../../utils/exporters';
import { Label, NumField } from './ui';
import { IconClose, IconSparkle, IconSpinner, IconTrash, IconExport } from './icons';

const Inspector: React.FC = () => {
  const { shapes, selectedShapeId, selectShape, removeShape, updateShape, updateParametricParameters } =
    useStore();
  const { scene } = useSceneStore();
  const { generateWithContext, isProcessing } = useAIModelingContextAware();
  const [askText, setAskText] = useState('');
  const [askError, setAskError] = useState<string | null>(null);

  const shape = shapes.find((s) => s.id === selectedShapeId);
  if (!shape) return null;

  const isParametric = shape.type === 'parametric';

  const ask = async () => {
    if (!askText.trim() || isProcessing) return;
    setAskError(null);
    try {
      const result = await generateWithContext({
        prompt: askText.trim(),
        shapes,
        selectedShapeId,
        backend: 'opencascade',
      });
      if (result.success) {
        if (result.modifiedShape && selectedShapeId) {
          updateShape(selectedShapeId, result.modifiedShape);
        } else if (result.parameterUpdate && selectedShapeId && isParametric) {
          updateParametricParameters(selectedShapeId, result.parameterUpdate);
        }
        setAskText('');
      } else {
        setAskError(result.error || 'Could not apply that change.');
      }
    } catch (e: any) {
      setAskError(e?.message || 'Could not apply that change.');
    }
  };

  const exportSelected = () => {
    if (!scene) return;
    const mesh = scene.meshes.find(
      (m: any) => m?.metadata?.shapeId === shape.id || m?.name === shape.id
    );
    if (mesh) {
      downloadBlob(exportSTL(mesh as any), `${shape.name || shape.id}.stl`);
    }
  };

  const setTransform = (
    group: 'position' | 'rotation' | 'scaling',
    axis: 'x' | 'y' | 'z',
    value: number
  ) => {
    updateShape(shape.id, {
      [group]: { ...shape[group], [axis]: value },
    } as Partial<Shape>);
  };

  return (
    <div className="st-layer st-glass st-inspector">
      <div className="st-drawer-head">
        <span className="st-drawer-title">
          {shape.name || (isParametric ? (shape as ParametricShape).shapeType : shape.type)}
        </span>
        <div className="st-row" style={{ gap: 0 }}>
          <button className="st-iconbtn" data-tip="Export STL" onClick={exportSelected}>
            <IconExport size={15} />
          </button>
          <button
            className="st-iconbtn"
            data-tip="Delete"
            onClick={() => removeShape(shape.id)}
          >
            <IconTrash size={15} />
          </button>
          <button className="st-iconbtn" data-tip="Deselect" onClick={() => selectShape(null)}>
            <IconClose size={15} />
          </button>
        </div>
      </div>

      <div className="st-drawer-body">
        {/* Ask — natural-language edits on the selection */}
        <div className="st-row" style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: 11, top: 9, color: 'var(--st-text-3)' }}>
            {isProcessing ? <IconSpinner size={14} /> : <IconSparkle size={14} />}
          </span>
          <input
            className="st-input"
            style={{ paddingLeft: 33 }}
            placeholder="Make it taller, round the edges…"
            value={askText}
            disabled={isProcessing}
            onChange={(e) => setAskText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && ask()}
          />
        </div>
        {askError && (
          <p className="st-hint" style={{ color: 'var(--st-err)' }}>
            {askError}
          </p>
        )}

        {isParametric && (
          <ParametricSliders
            shape={shape as ParametricShape}
            onParams={(params) => updateParametricParameters(shape.id, params)}
          />
        )}

        <Label>Position</Label>
        <div className="st-row">
          {(['x', 'y', 'z'] as const).map((axis) => (
            <NumField
              key={axis}
              label={axis.toUpperCase()}
              value={shape.position[axis]}
              onCommit={(v) => setTransform('position', axis, v)}
            />
          ))}
        </div>

        <Label>Rotation</Label>
        <div className="st-row">
          {(['x', 'y', 'z'] as const).map((axis) => (
            <NumField
              key={axis}
              label={axis.toUpperCase()}
              value={shape.rotation[axis]}
              step={1}
              onCommit={(v) => setTransform('rotation', axis, v)}
            />
          ))}
        </div>

        <Label>Scale</Label>
        <div className="st-row">
          {(['x', 'y', 'z'] as const).map((axis) => (
            <NumField
              key={axis}
              label={axis.toUpperCase()}
              value={shape.scaling[axis]}
              onCommit={(v) => setTransform('scaling', axis, v)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * Live parametric sliders: instant UI, throttled OCC regeneration
 * (same engine path the old context panel used, rehoused).
 */
const ParametricSliders: React.FC<{
  shape: ParametricShape;
  onParams: (params: Record<string, number>) => void;
}> = ({ shape, onParams }) => {
  const { updateShape } = useStore();
  const [localParams, setLocalParams] = useState(shape.parameters);
  const [regenerating, setRegenerating] = useState(false);
  const latestRef = useRef(shape.parameters);
  const lastRunRef = useRef(0);
  const pendingRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLocalParams(shape.parameters);
    latestRef.current = shape.parameters;
  }, [shape.id]);

  const scheduleRegen = useCallback(() => {
    if (pendingRef.current) clearTimeout(pendingRef.current);
    const wait = Math.max(0, 120 - (Date.now() - lastRunRef.current));
    pendingRef.current = setTimeout(async () => {
      if (!shape.constructionCode) return;
      lastRunRef.current = Date.now();
      setRegenerating(true);
      const params = latestRef.current;
      const result = await regenerateParametricShape(shape.constructionCode, params);
      if (result.success && result.meshData) {
        updateShape(shape.id, {
          meshData: result.meshData,
          parameters: params,
          version: (shape.version || 1) + 1,
        } as Partial<ParametricShape>);
      }
      setRegenerating(false);
      // If the user kept dragging while we were busy, run once more.
      if (JSON.stringify(latestRef.current) !== JSON.stringify(params)) scheduleRegen();
    }, wait);
  }, [shape.id, shape.constructionCode, shape.version, updateShape]);

  useEffect(() => () => {
    if (pendingRef.current) clearTimeout(pendingRef.current);
  }, []);

  const change = (key: string, value: number) => {
    const next = { ...latestRef.current, [key]: value };
    setLocalParams(next);
    latestRef.current = next;
    onParams(next);
    scheduleRegen();
  };

  const keys = Object.keys(localParams || {});
  if (keys.length === 0) return null;

  return (
    <>
      <div className="st-row" style={{ justifyContent: 'space-between' }}>
        <Label>Parameters</Label>
        {regenerating && (
          <span style={{ color: 'var(--st-text-3)', display: 'inline-flex' }}>
            <IconSpinner size={12} />
          </span>
        )}
      </div>
      {keys.map((key) => {
        const value = localParams[key];
        const meta = shape.metadata?.[key];
        const min = meta?.min ?? Math.min(0, value);
        const max = meta?.max ?? Math.max(value * 3 || 10, value + 1);
        const step = meta?.step ?? (Number.isInteger(value) ? 1 : 0.1);
        return (
          <div className="st-slider-row" key={key}>
            <div className="st-slider-head">
              <span className="st-slider-name">{formatParameterName(key)}</span>
              <span className="st-slider-val">{Math.round(value * 100) / 100}</span>
            </div>
            <input
              type="range"
              className="st-slider"
              min={min}
              max={max}
              step={step}
              value={value}
              onChange={(e) => change(key, parseFloat(e.target.value))}
            />
          </div>
        );
      })}
    </>
  );
};

export default Inspector;
