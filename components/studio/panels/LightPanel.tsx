/**
 * Light — presets first, three-point rig details on demand.
 */

import React, { useState } from 'react';
import { useLighting } from '../../../hooks/useLighting';
import { Drawer, Label, SliderRow } from '../ui';

const PRESETS = ['studio', 'natural', 'dramatic', 'soft'] as const;

const LightPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const {
    updateKeyLight,
    updateFillLight,
    updateRimLight,
    applyLightingPreset,
    color3ToHex,
    hexToColor3,
    getLightSettings,
  } = useLighting();

  const [preset, setPreset] = useState<string>('studio');

  // Local mirrors of the rig (hydrated from the scene when available)
  const initial = getLightSettings?.();
  const [key, setKey] = useState({
    intensity: initial?.keyLight?.intensity ?? 1.2,
    color: initial?.keyLight ? color3ToHex(initial.keyLight.color) : '#fff2cc',
  });
  const [fill, setFill] = useState({
    intensity: initial?.fillLight?.intensity ?? 0.3,
    color: initial?.fillLight ? color3ToHex(initial.fillLight.color) : '#b3ccff',
  });
  const [rim, setRim] = useState({
    intensity: initial?.rimLight?.intensity ?? 0.6,
    color: initial?.rimLight ? color3ToHex(initial.rimLight.color) : '#e6e6ff',
  });

  const keyDir = initial?.keyLight?.direction;
  const rimDir = initial?.rimLight?.direction;

  const applyPreset = (name: string) => {
    setPreset(name);
    applyLightingPreset(name as any);
    // Re-read the rig so sliders reflect the preset.
    const s = getLightSettings?.();
    if (s) {
      setKey({ intensity: s.keyLight.intensity, color: color3ToHex(s.keyLight.color) });
      setFill({ intensity: s.fillLight.intensity, color: color3ToHex(s.fillLight.color) });
      setRim({ intensity: s.rimLight.intensity, color: color3ToHex(s.rimLight.color) });
    }
  };

  return (
    <Drawer title="Light" onClose={onClose}>
      <Label>Mood</Label>
      <div className="st-seg">
        {PRESETS.map((p) => (
          <button key={p} className={preset === p ? 'st-active' : ''} onClick={() => applyPreset(p)}>
            {p[0].toUpperCase() + p.slice(1)}
          </button>
        ))}
      </div>

      <Label>Key light</Label>
      <div className="st-row" style={{ marginBottom: 6 }}>
        <input
          type="color"
          className="st-color"
          value={key.color}
          onChange={(e) => {
            const next = { ...key, color: e.target.value };
            setKey(next);
            updateKeyLight(next.intensity, hexToColor3(next.color), keyDir as any);
          }}
        />
        <div style={{ flex: 1 }}>
          <SliderRow
            name="Intensity"
            value={key.intensity}
            min={0}
            max={3}
            step={0.05}
            format={(v) => v.toFixed(2)}
            onChange={(v) => {
              const next = { ...key, intensity: v };
              setKey(next);
              updateKeyLight(v, hexToColor3(next.color), keyDir as any);
            }}
          />
        </div>
      </div>

      <Label>Fill light</Label>
      <div className="st-row" style={{ marginBottom: 6 }}>
        <input
          type="color"
          className="st-color"
          value={fill.color}
          onChange={(e) => {
            const next = { ...fill, color: e.target.value };
            setFill(next);
            updateFillLight(next.intensity, hexToColor3(next.color));
          }}
        />
        <div style={{ flex: 1 }}>
          <SliderRow
            name="Intensity"
            value={fill.intensity}
            min={0}
            max={3}
            step={0.05}
            format={(v) => v.toFixed(2)}
            onChange={(v) => {
              const next = { ...fill, intensity: v };
              setFill(next);
              updateFillLight(v, hexToColor3(next.color));
            }}
          />
        </div>
      </div>

      <Label>Rim light</Label>
      <div className="st-row" style={{ marginBottom: 6 }}>
        <input
          type="color"
          className="st-color"
          value={rim.color}
          onChange={(e) => {
            const next = { ...rim, color: e.target.value };
            setRim(next);
            updateRimLight(next.intensity, hexToColor3(next.color), rimDir as any);
          }}
        />
        <div style={{ flex: 1 }}>
          <SliderRow
            name="Intensity"
            value={rim.intensity}
            min={0}
            max={3}
            step={0.05}
            format={(v) => v.toFixed(2)}
            onChange={(v) => {
              const next = { ...rim, intensity: v };
              setRim(next);
              updateRimLight(v, hexToColor3(next.color), rimDir as any);
            }}
          />
        </div>
      </div>
    </Drawer>
  );
};

export default LightPanel;
