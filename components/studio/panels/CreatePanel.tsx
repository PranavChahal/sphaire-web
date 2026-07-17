/**
 * Create — instant primitives. Click and it exists; refine in the inspector.
 */

import React from 'react';
import useStore from '../../../store/store';
import { Drawer } from '../ui';
import { IconCube, IconSphere, IconCylinder } from '../icons';

const CreatePanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const addShape = useStore((s) => s.addShape);

  const add = (type: 'box' | 'sphere' | 'cylinder') => {
    // Defaults chosen so every primitive lands sitting on the grid.
    if (type === 'box') {
      addShape({ type: 'box', position: { x: 0, y: 0.5, z: 0 } });
    } else if (type === 'sphere') {
      addShape({ type: 'sphere', position: { x: 0, y: 1, z: 0 } });
    } else {
      addShape({ type: 'cylinder', position: { x: 0, y: 1, z: 0 } });
    }
  };

  return (
    <Drawer title="Create" onClose={onClose}>
      <div className="st-label">Primitives</div>
      <div className="st-tiles">
        <button className="st-tile" onClick={() => add('box')}>
          <IconCube size={22} />
          Box
        </button>
        <button className="st-tile" onClick={() => add('sphere')}>
          <IconSphere size={22} />
          Sphere
        </button>
        <button className="st-tile" onClick={() => add('cylinder')}>
          <IconCylinder size={22} />
          Cylinder
        </button>
      </div>
      <p className="st-hint" style={{ marginTop: 14 }}>
        Click to place at the origin, then shape it with the inspector — or just
        describe what you want in the bar below and let the engine build it.
      </p>
    </Drawer>
  );
};

export default CreatePanel;
