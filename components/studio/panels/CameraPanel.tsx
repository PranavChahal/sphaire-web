/**
 * Camera — a render camera you can place, aim, and shoot with.
 */

import React, { useState } from 'react';
import useRenderCamera from '../../../hooks/useRenderCamera';
import { Drawer, Label, SliderRow, Toggle } from '../ui';
import { IconSpinner } from '../icons';

const RESOLUTIONS = [
  { id: 'hd', label: 'HD', w: 1280, h: 720 },
  { id: 'fhd', label: 'FHD', w: 1920, h: 1080 },
  { id: '4k', label: '4K', w: 3840, h: 2160 },
  { id: 'sq', label: '1:1', w: 2048, h: 2048 },
];

const CameraPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { state, actions } = useRenderCamera();
  const [resolution, setResolution] = useState('fhd');
  const [rendering, setRendering] = useState(false);

  const pickResolution = (id: string) => {
    setResolution(id);
    const r = RESOLUTIONS.find((x) => x.id === id)!;
    actions.setResolution(r.w, r.h);
  };

  const render = async () => {
    setRendering(true);
    try {
      const dataUrl = await actions.captureHighQualityRender();
      if (dataUrl) actions.saveImage(dataUrl, `sphaire-render-${Date.now()}.png`);
    } finally {
      setRendering(false);
    }
  };

  return (
    <Drawer title="Camera" onClose={onClose}>
      {!state.isActive ? (
        <>
          <div className="st-empty">
            Add a render camera to compose a shot of your scene.
          </div>
          <button
            className="st-textbtn"
            style={{ width: '100%', justifyContent: 'center', background: 'rgba(255,255,255,0.07)' }}
            onClick={() => actions.addCameraToScene()}
          >
            Add render camera
          </button>
        </>
      ) : (
        <>
          <Label>Frame</Label>
          <div className="st-seg">
            {RESOLUTIONS.map((r) => (
              <button
                key={r.id}
                className={resolution === r.id ? 'st-active' : ''}
                onClick={() => pickResolution(r.id)}
              >
                {r.label}
              </button>
            ))}
          </div>

          <Label>Lens</Label>
          <SliderRow
            name="Field of view"
            value={state.fieldOfView}
            min={20}
            max={100}
            step={1}
            format={(v) => `${v}°`}
            onChange={(v) => actions.setFieldOfView(v)}
          />
          <Toggle
            on={state.previewEnabled}
            onChange={(v) => actions.setPreviewEnabled(v)}
            label="Live preview"
          />

          <button
            className="st-cb-generate"
            style={{ width: '100%', marginTop: 14 }}
            disabled={rendering}
            onClick={render}
          >
            {rendering ? <IconSpinner size={15} /> : 'Render image'}
          </button>
          <button
            className="st-textbtn"
            style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
            onClick={() => actions.removeCameraFromScene()}
          >
            Remove camera
          </button>
        </>
      )}
    </Drawer>
  );
};

export default CameraPanel;
