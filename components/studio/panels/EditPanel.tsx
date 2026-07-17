/**
 * Edit — sub-object modeling (vertex / edge / face) with extrude & bevel.
 * Same engine path as before (subObjectEditor), rehoused.
 */

import React, { useEffect, useState } from 'react';
import { useUIStore } from '../../../store/uiStore';
import useSceneStore from '../../../store/sceneStore';
import useStore, { ParametricShape, Shape } from '../../../store/store';
import * as SubObjectEditor from '../../../utils/subObjectEditor';
import { Drawer, Label, NumField, SliderRow } from '../ui';

const MODES = ['vertex', 'edge', 'face'] as const;

const EditPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { selectedMeshes } = useSceneStore();
  const selectedMesh = selectedMeshes.length > 0 ? (selectedMeshes[0] as any) : null;
  const { shapes, selectedShapeId, updateShape } = useStore();
  const selectedShape = shapes.find((shape) => shape.id === selectedShapeId);

  const {
    activeMesh,
    subObjectMode,
    subObjectSelectedElements: selectedElements,
    clearSubObjectSelection,
    enterEditMode,
    exitEditMode,
  } = useUIStore();

  const [amount, setAmount] = useState(0.5);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedMesh && activeMesh) exitEditMode();
    const selectedId = selectedMesh?.metadata?.shapeId || selectedMesh?.name;
    const activeId = activeMesh?.metadata?.shapeId || activeMesh?.name;
    if (selectedMesh && activeMesh && selectedId !== activeId && subObjectMode) {
      enterEditMode(selectedMesh, subObjectMode);
    }
  }, [activeMesh, enterEditMode, exitEditMode, selectedMesh, subObjectMode]);

  const enterMode = (mode: (typeof MODES)[number]) => {
    if (!selectedMesh) return;
    if (subObjectMode === mode) exitEditMode();
    else enterEditMode(selectedMesh, mode);
  };

  const runOperation = async (op: 'extrude' | 'bevel') => {
    if (!activeMesh || !subObjectMode || selectedElements.length === 0) return;
    setBusy(op);
    try {
      const changed = op === 'extrude'
        ? await SubObjectEditor.extrudeElements(activeMesh, selectedElements, amount, undefined, subObjectMode)
        : await SubObjectEditor.bevelElements(activeMesh, selectedElements, amount, subObjectMode);
      if (changed && selectedShape) {
        const positions = activeMesh.getVerticesData('position');
        const indices = activeMesh.getIndices();
        if (positions && indices) {
          const meshData = {
            positions: new Float32Array(positions),
            indices: new Uint32Array(indices),
          };
          if (selectedShape.type === 'model') {
            // Imported models are hierarchies. Keep the edited child in place
            // instead of replacing the entire imported object with one part.
            activeMesh.metadata = { ...(activeMesh.metadata || {}), geometryEdited: true };
            activeMesh.refreshBoundingInfo();
          } else if (selectedShape.type === 'parametric') {
            updateShape(selectedShape.id, {
              meshData,
              version: ((selectedShape as ParametricShape).version || 0) + 1,
            } as Partial<ParametricShape>);
          } else {
            updateShape(selectedShape.id, {
              type: 'custom',
              name: selectedShape.name || selectedShape.type,
              meshData,
              version: Number((selectedShape as any).version || 0) + 1,
            } as any);
          }
        }
      }
      clearSubObjectSelection();
    } catch (error) {
      console.error(`Failed to ${op}:`, error);
    } finally {
      setBusy(null);
    }
  };

  const canOperate = !!activeMesh && !!subObjectMode && selectedElements.length > 0 && !busy;

  const setPrimitiveValue = (key: string, value: number) => {
    if (!selectedShape) return;
    const safe = Math.max(0.05, value);
    if (selectedShape.type === 'box') {
      updateShape(selectedShape.id, {
        dimensions: { ...selectedShape.dimensions, [key]: safe },
      } as Partial<Shape>);
    } else if (selectedShape.type === 'sphere') {
      updateShape(selectedShape.id, { radius: safe } as Partial<Shape>);
    } else if (selectedShape.type === 'cylinder') {
      updateShape(selectedShape.id, { [key]: safe } as Partial<Shape>);
    }
  };

  const isPrimitive = selectedShape && ['box', 'sphere', 'cylinder'].includes(selectedShape.type);

  return (
    <Drawer title="Edit" onClose={() => { exitEditMode(); onClose(); }}>
      {!selectedMesh && !activeMesh ? (
        <div className="st-empty">Select an object in the viewport first.</div>
      ) : (
        <>
          {isPrimitive && selectedShape && (
            <>
              <Label>Shape size</Label>
              <div className="st-row st-edit-dimensions">
                {selectedShape.type === 'box' && (
                  <>
                    <NumField label="W" value={selectedShape.dimensions.width} onCommit={(value) => setPrimitiveValue('width', value)} />
                    <NumField label="H" value={selectedShape.dimensions.height} onCommit={(value) => setPrimitiveValue('height', value)} />
                    <NumField label="D" value={selectedShape.dimensions.depth} onCommit={(value) => setPrimitiveValue('depth', value)} />
                  </>
                )}
                {selectedShape.type === 'sphere' && (
                  <NumField label="Radius" value={selectedShape.radius} onCommit={(value) => setPrimitiveValue('radius', value)} />
                )}
                {selectedShape.type === 'cylinder' && (
                  <>
                    <NumField label="Diameter" value={selectedShape.diameter} onCommit={(value) => setPrimitiveValue('diameter', value)} />
                    <NumField label="Height" value={selectedShape.height} onCommit={(value) => setPrimitiveValue('height', value)} />
                  </>
                )}
              </div>
              <p className="st-hint">Resize the primitive directly, or edit its mesh below.</p>
            </>
          )}

          <Label>Mesh component</Label>
          <div className="st-seg">
            {MODES.map((mode) => (
              <button
                key={mode}
                className={subObjectMode === mode ? 'st-active' : ''}
                onClick={() => enterMode(mode)}
              >
                {mode[0].toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>

          <div className={`st-edit-callout ${selectedElements.length ? 'st-ready' : ''}`}>
            {selectedElements.length > 0
              ? `${selectedElements.length} ${subObjectMode}${selectedElements.length === 1 ? '' : ' elements'} selected`
              : subObjectMode
                ? `Click a ${subObjectMode} on the object. Shift-click to add more.`
                : 'Choose Vertex, Edge, or Face, then click directly on the object.'}
          </div>
          {selectedShape?.type === 'model' && (
            <p className="st-hint">
              Imported models contain separate parts. Click any visible part to select its topology.
            </p>
          )}

          <Label>Operation</Label>
          <SliderRow
            name="Amount"
            value={amount}
            min={0.1}
            max={2}
            step={0.1}
            onChange={setAmount}
          />
          <div className="st-row">
            <button
              className="st-textbtn"
              style={{ flex: 1, justifyContent: 'center', background: 'rgba(255,255,255,0.06)' }}
              disabled={!canOperate}
              onClick={() => runOperation('extrude')}
            >
              {busy === 'extrude' ? 'Extruding…' : 'Extrude'}
            </button>
            <button
              className="st-textbtn"
              style={{ flex: 1, justifyContent: 'center', background: 'rgba(255,255,255,0.06)' }}
              disabled={!canOperate}
              onClick={() => runOperation('bevel')}
            >
              {busy === 'bevel' ? 'Beveling…' : 'Bevel'}
            </button>
          </div>
          {subObjectMode && (
            <button
              className="st-textbtn"
              style={{ width: '100%', justifyContent: 'center', marginTop: 10 }}
              onClick={() => exitEditMode()}
            >
              Done editing
            </button>
          )}
        </>
      )}
    </Drawer>
  );
};

export default EditPanel;
