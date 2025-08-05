import React, { useState } from 'react';
import { Mesh } from '@babylonjs/core';

interface SubObjectOperationsProps {
  active: boolean;
  selectedElements: number[];
  mode: string;
  onExtrude: (mesh: Mesh, distance: number) => Promise<void>;
  onBevel: (mesh: Mesh, amount: number) => Promise<void>;
  selectedMesh: Mesh | null;
}

const SubObjectOperations: React.FC<SubObjectOperationsProps> = ({ 
  active,
  selectedElements,
  mode,
  onExtrude,
  onBevel,
  selectedMesh
}) => {
  const [extrudeDistance, setExtrudeDistance] = useState<number>(0.5);
  const [bevelAmount, setBevelAmount] = useState<number>(0.2);

  if (!active || selectedElements.length === 0 || !selectedMesh) {
    return null;
  }

  const handleExtrude = () => {
    if (selectedMesh) {
      onExtrude(selectedMesh, extrudeDistance);
    }
  };

  const handleBevel = () => {
    if (selectedMesh) {
      onBevel(selectedMesh, bevelAmount);
    }
  };

  // Only show operations applicable to current mode
  const showExtrudeButton = mode === 'face' || mode === 'edge';
  const showBevelButton = mode === 'face' || mode === 'edge';

  return (
    <div className="sub-object-operations">
      <div className="operation-title">
        {selectedElements.length} {mode}(s) selected
      </div>
      
      <div className="operations-container">
        {showExtrudeButton && (
          <div className="operation-group">
            <div className="slider-container">
              <label>Extrude Distance</label>
              <input
                type="range"
                min="0.1"
                max="5"
                step="0.1"
                value={extrudeDistance}
                onChange={(e) => setExtrudeDistance(parseFloat(e.target.value))}
              />
              <span>{extrudeDistance.toFixed(1)}</span>
            </div>
            <button 
              className="operation-btn extrude-btn"
              onClick={handleExtrude}
            >
              Extrude
            </button>
          </div>
        )}
        
        {showBevelButton && (
          <div className="operation-group">
            <div className="slider-container">
              <label>Bevel Amount</label>
              <input
                type="range"
                min="0.05"
                max="1"
                step="0.05"
                value={bevelAmount}
                onChange={(e) => setBevelAmount(parseFloat(e.target.value))}
              />
              <span>{bevelAmount.toFixed(2)}</span>
            </div>
            <button 
              className="operation-btn bevel-btn"
              onClick={handleBevel}
            >
              Bevel
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        .sub-object-operations {
          position: absolute;
          top: 80px;
          right: 10px;
          background: rgba(20, 10, 30, 0.7);
          backdrop-filter: blur(5px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 4px;
          padding: 10px;
          width: 220px;
          color: white;
          z-index: 10;
        }
        
        .operation-title {
          font-size: 14px;
          margin-bottom: 10px;
          text-align: center;
          color: rgba(255, 200, 255, 0.9);
          font-weight: bold;
        }
        
        .operations-container {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }
        
        .operation-group {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }
        
        .slider-container {
          display: flex;
          align-items: center;
          gap: 5px;
          margin-bottom: 5px;
        }
        
        .slider-container label {
          font-size: 12px;
          flex: 1;
        }
        
        .slider-container input {
          flex: 2;
        }
        
        .slider-container span {
          width: 30px;
          text-align: right;
          font-size: 12px;
        }
        
        .operation-btn {
          padding: 5px 10px;
          background: rgba(100, 50, 140, 0.7);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 3px;
          cursor: pointer;
          font-size: 12px;
          transition: all 0.2s;
        }
        
        .operation-btn:hover {
          background: rgba(160, 80, 200, 0.8);
          border-color: rgba(255, 255, 255, 0.5);
        }
        
        .extrude-btn {
          background: rgba(70, 50, 140, 0.8);
        }
        
        .bevel-btn {
          background: rgba(140, 50, 100, 0.8);
        }
      `}</style>
    </div>
  );
};

export default SubObjectOperations;
