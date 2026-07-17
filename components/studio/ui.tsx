/**
 * Small shared building blocks for the studio shell.
 */

import React from 'react';
import { IconClose } from './icons';

export const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="st-label">{children}</div>
);

export const Toggle: React.FC<{
  on: boolean;
  onChange: (v: boolean) => void;
  label: string;
}> = ({ on, onChange, label }) => (
  <div className="st-toggle-row">
    <span>{label}</span>
    <button
      className={`st-toggle ${on ? 'st-on' : ''}`}
      onClick={() => onChange(!on)}
      aria-label={label}
      aria-pressed={on}
    />
  </div>
);

export const SliderRow: React.FC<{
  name: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format?: (v: number) => string;
  onChange: (v: number) => void;
}> = ({ name, value, min, max, step, format, onChange }) => (
  <div className="st-slider-row">
    <div className="st-slider-head">
      <span className="st-slider-name">{name}</span>
      <span className="st-slider-val">{format ? format(value) : value}</span>
    </div>
    <input
      type="range"
      className="st-slider"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
    />
  </div>
);

export const NumField: React.FC<{
  label: string;
  value: number;
  step?: number;
  onCommit: (v: number) => void;
}> = ({ label, value, step = 0.1, onCommit }) => {
  const [text, setText] = React.useState(String(round(value)));
  React.useEffect(() => setText(String(round(value))), [value]);
  const commit = () => {
    const v = parseFloat(text);
    if (!isNaN(v)) onCommit(v);
    else setText(String(round(value)));
  };
  return (
    <div className="st-numfield">
      <input
        type="number"
        step={step}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
      />
      <span>{label}</span>
    </div>
  );
};

function round(v: number): number {
  return Math.round(v * 100) / 100;
}

export const Drawer: React.FC<{
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}> = ({ title, onClose, children, className = '' }) => (
  <div className={`st-layer st-glass st-drawer ${className}`}>
    <div className="st-drawer-head">
      <span className="st-drawer-title">{title}</span>
      <button className="st-iconbtn" onClick={onClose} aria-label="Close panel">
        <IconClose size={15} />
      </button>
    </div>
    <div className="st-drawer-body">{children}</div>
  </div>
);
