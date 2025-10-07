/**
 * ADVANCED GIZMO CONTROLS UI COMPONENT
 * 
 * Production-ready UI for the new AdvancedGizmoSystem with:
 * Move/Scale/Rotate mode selection
 * Coordinate space toggle (Local/World)
 * Snap settings controls
 * Multi-selection support indicators
 * Sphaire design system integration
 */

import React from 'react';
import { GizmoMode, CoordinateSpace } from '../utils/AdvancedGizmoSystem';

interface AdvancedGizmoControlsProps {
  currentMode: GizmoMode;
  onModeChange: (mode: GizmoMode) => void;
  coordinateSpace: CoordinateSpace;
  onCoordinateSpaceChange: (space: CoordinateSpace) => void;
  snapEnabled: boolean;
  onSnapToggle: (enabled: boolean) => void;
  selectedMeshCount: number;
  isEnabled: boolean;
  className?: string;
  style?: React.CSSProperties;
}

interface GizmoModeConfig {
  mode: GizmoMode;
  label: string;
  icon: string;
  description: string;
  hotkey: string;
}

const GIZMO_MODES: GizmoModeConfig[] = [
  {
    mode: 'position',
    label: 'Move',
    icon: '↔️',
    description: 'Move objects in 3D space',
    hotkey: 'W'
  },
  {
    mode: 'rotation',
    label: 'Rotate',
    icon: '',
    description: 'Rotate objects around axes',
    hotkey: 'E'
  },
  {
    mode: 'scale',
    label: 'Scale',
    icon: '📏',
    description: 'Scale objects proportionally',
    hotkey: 'R'
  },
  {
    mode: 'boundingBox',
    label: 'Multi',
    icon: '',
    description: 'Multi-selection bounding box',
    hotkey: 'T'
  }
];

export const AdvancedGizmoControls: React.FC<AdvancedGizmoControlsProps> = ({
  currentMode,
  onModeChange,
  coordinateSpace,
  onCoordinateSpaceChange,
  snapEnabled,
  onSnapToggle,
  selectedMeshCount,
  isEnabled,
  className = '',
  style = {}
}) => {
  
  const handleModeClick = (mode: GizmoMode) => {
    if (!isEnabled) return;
    
    // Toggle to 'none' if clicking the current mode, otherwise switch modes
    const newMode = currentMode === mode ? 'none' : mode;
    onModeChange(newMode);
  };

  const handleCoordinateSpaceToggle = () => {
    if (!isEnabled) return;
    onCoordinateSpaceChange(coordinateSpace === 'world' ? 'local' : 'world');
  };

  const handleSnapToggle = () => {
    if (!isEnabled) return;
    onSnapToggle(!snapEnabled);
  };

  return (
    <div 
      className={`advanced-gizmo-controls ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        padding: '16px',
        background: 'rgba(20, 10, 30, 0.95)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 105, 180, 0.3)',
        borderRadius: '12px',
        minWidth: '200px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        ...style
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '8px'
      }}>
        <h3 style={{
          color: '#ff69b4',
          fontSize: '14px',
          fontWeight: 'bold',
          margin: 0,
          textShadow: '0 0 8px rgba(255, 105, 180, 0.5)'
        }}>
          Transform Controls
        </h3>
        
        {selectedMeshCount > 0 && (
          <div style={{
            background: 'rgba(255, 105, 180, 0.2)',
            color: '#ff69b4',
            padding: '4px 8px',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: 'bold',
            border: '1px solid rgba(255, 105, 180, 0.3)'
          }}>
            {selectedMeshCount} selected
          </div>
        )}
      </div>

      {/* Mode Selection Buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <label style={{
          color: '#b19cd9',
          fontSize: '12px',
          fontWeight: '500',
          marginBottom: '4px'
        }}>
          Transform Mode:
        </label>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '6px'
        }}>
          {GIZMO_MODES.map((modeConfig) => {
            const isActive = currentMode === modeConfig.mode;
            const isDisabled = !isEnabled || (selectedMeshCount === 0 && currentMode === 'none');
            
            return (
              <button
                key={modeConfig.mode}
                onClick={() => handleModeClick(modeConfig.mode)}
                disabled={isDisabled}
                title={`${modeConfig.description} (${modeConfig.hotkey})`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '10px 12px',
                  background: isActive 
                    ? 'linear-gradient(135deg, #ff69b4, #ff1493)' 
                    : isDisabled
                      ? 'rgba(40, 20, 50, 0.5)'
                      : 'rgba(60, 30, 90, 0.8)',
                  color: isActive 
                    ? 'white' 
                    : isDisabled 
                      ? '#666' 
                      : '#e0e0e0',
                  border: `1px solid ${isActive 
                    ? 'rgba(255, 105, 180, 0.8)' 
                    : isDisabled
                      ? 'rgba(100, 100, 100, 0.3)'
                      : 'rgba(255, 105, 180, 0.4)'}`,
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: isActive 
                    ? '0 0 12px rgba(255, 105, 180, 0.6)' 
                    : 'none',
                  transform: isActive ? 'scale(1.02)' : 'scale(1)',
                  opacity: isDisabled ? 0.5 : 1
                }}
                onMouseEnter={(e) => {
                  if (!isDisabled && !isActive) {
                    e.currentTarget.style.background = 'rgba(80, 40, 120, 0.9)';
                    e.currentTarget.style.transform = 'scale(1.01)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isDisabled && !isActive) {
                    e.currentTarget.style.background = 'rgba(60, 30, 90, 0.8)';
                    e.currentTarget.style.transform = 'scale(1)';
                  }
                }}
              >
                <span style={{ fontSize: '14px' }}>{modeConfig.icon}</span>
                <span>{modeConfig.label}</span>
                <span style={{ 
                  fontSize: '10px', 
                  opacity: 0.7,
                  marginLeft: 'auto'
                }}>
                  {modeConfig.hotkey}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Coordinate Space Toggle */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <label style={{
          color: '#b19cd9',
          fontSize: '12px',
          fontWeight: '500'
        }}>
          Coordinate Space:
        </label>
        
        <button
          onClick={handleCoordinateSpaceToggle}
          disabled={!isEnabled || currentMode === 'none'}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 12px',
            background: coordinateSpace === 'world' 
              ? 'rgba(60, 30, 90, 0.8)' 
              : 'rgba(40, 80, 40, 0.8)',
            color: '#e0e0e0',
            border: `1px solid ${coordinateSpace === 'world' 
              ? 'rgba(255, 105, 180, 0.4)' 
              : 'rgba(100, 255, 100, 0.4)'}`,
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: 'bold',
            cursor: (!isEnabled || currentMode === 'none') ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
            opacity: (!isEnabled || currentMode === 'none') ? 0.5 : 1
          }}
        >
          <span>
            {coordinateSpace === 'world' ? '🌐' : '📍'} {coordinateSpace.toUpperCase()}
          </span>
          <span style={{ fontSize: '10px', opacity: 0.7 }}>Click to toggle</span>
        </button>
      </div>

      {/* Snap Toggle */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <label style={{
          color: '#b19cd9',
          fontSize: '12px',
          fontWeight: '500'
        }}>
          Precision:
        </label>
        
        <button
          onClick={handleSnapToggle}
          disabled={!isEnabled || currentMode === 'none'}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 12px',
            background: snapEnabled 
              ? 'rgba(40, 80, 40, 0.8)' 
              : 'rgba(60, 30, 90, 0.8)',
            color: '#e0e0e0',
            border: `1px solid ${snapEnabled 
              ? 'rgba(100, 255, 100, 0.4)' 
              : 'rgba(255, 105, 180, 0.4)'}`,
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: 'bold',
            cursor: (!isEnabled || currentMode === 'none') ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
            opacity: (!isEnabled || currentMode === 'none') ? 0.5 : 1
          }}
        >
          <span>
            {snapEnabled ? '' : ''} {snapEnabled ? 'SNAP ON' : 'FREE MOVE'}
          </span>
          <span style={{ fontSize: '10px', opacity: 0.7 }}>
            {snapEnabled ? 'Precise' : 'Smooth'}
          </span>
        </button>
      </div>

      {/* Status Indicator */}
      <div style={{
        marginTop: '8px',
        padding: '8px',
        background: isEnabled 
          ? 'rgba(0, 200, 0, 0.15)' 
          : 'rgba(200, 200, 0, 0.15)',
        border: `1px solid ${isEnabled 
          ? 'rgba(0, 200, 0, 0.3)' 
          : 'rgba(200, 200, 0, 0.3)'}`,
        borderRadius: '6px',
        fontSize: '11px',
        color: isEnabled ? '#90ee90' : '#ffff90',
        textAlign: 'center' as const
      }}>
        {isEnabled 
          ? (currentMode === 'none' 
              ? '⭐ Ready - Select objects to transform' 
              : `${GIZMO_MODES.find(m => m.mode === currentMode)?.label || currentMode} mode active`)
          : 'Transform controls disabled'}
      </div>

      {/* Hotkey Help */}
      <div style={{
        fontSize: '10px',
        color: '#888',
        textAlign: 'center' as const,
        borderTop: '1px solid rgba(255, 105, 180, 0.2)',
        paddingTop: '8px',
        marginTop: '4px'
      }}>
        Hotkeys: W (Move) • E (Rotate) • R (Scale) • T (Multi)
      </div>
    </div>
  );
};

export default AdvancedGizmoControls;
