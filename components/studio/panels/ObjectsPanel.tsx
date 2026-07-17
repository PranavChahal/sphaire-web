/**
 * Objects — the scene as a quiet list. Click to select, hover to delete.
 */

import React from 'react';
import useStore from '../../../store/store';
import { Drawer } from '../ui';
import {
  IconCube,
  IconSphere,
  IconCylinder,
  IconLayers,
  IconTrash,
  IconSparkle,
  IconImport,
} from '../icons';

const typeIcon = (shape: any) => {
  switch (shape.type) {
    case 'box':
      return <IconCube size={15} />;
    case 'sphere':
      return <IconSphere size={15} />;
    case 'cylinder':
      return <IconCylinder size={15} />;
    case 'parametric':
      return <IconSparkle size={15} />;
    case 'model':
      return <IconImport size={15} />;
    default:
      return <IconLayers size={15} />;
  }
};

const displayName = (shape: any) =>
  shape.name || (shape.type === 'parametric' ? shape.shapeType : shape.type) + ' · ' + shape.id.split('-').pop();

const ObjectsPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { shapes, selectedShapeId, selectShape, removeShape, clearShapes } = useStore();

  return (
    <Drawer title="Objects" onClose={onClose}>
      {shapes.length === 0 ? (
        <div className="st-empty">
          Nothing here yet.
          <br />
          Describe something below, or add a primitive.
        </div>
      ) : (
        <>
          {shapes.map((shape) => (
            <div
              key={shape.id}
              className={`st-objrow ${selectedShapeId === shape.id ? 'st-selected' : ''}`}
              onClick={() => selectShape(shape.id)}
            >
              {typeIcon(shape)}
              <span className="st-objrow-name">{displayName(shape)}</span>
              <span className="st-objrow-type">{shape.type === 'parametric' ? 'param' : shape.type}</span>
              <button
                className="st-iconbtn"
                data-tip="Delete"
                onClick={(e) => {
                  e.stopPropagation();
                  removeShape(shape.id);
                }}
              >
                <IconTrash size={14} />
              </button>
            </div>
          ))}
          <button
            className="st-textbtn"
            style={{ width: '100%', marginTop: 12, justifyContent: 'center' }}
            onClick={() => clearShapes()}
          >
            Clear scene
          </button>
        </>
      )}
    </Drawer>
  );
};

export default ObjectsPanel;
