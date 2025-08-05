import React from 'react';

interface AxisToggleProps {
  showAxis: boolean;
  onToggle: () => void;
}

const AxisToggle: React.FC<AxisToggleProps> = ({ showAxis, onToggle }) => {
  return (
    <div className="axis-toggle">
      <button 
        className={`axis-toggle-btn ${showAxis ? 'active' : ''}`}
        onClick={onToggle}
        title="Toggle Axis Visibility"
      >
        {showAxis ? '✓ 3D Axes' : '□ 3D Axes'}
      </button>
      
      <style jsx>{`
        .axis-toggle {
          position: absolute;
          bottom: 10px;
          left: 10px;
          z-index: 10;
        }
        
        .axis-toggle-btn {
          padding: 5px 10px;
          background: rgba(10, 5, 15, 0.8);
          color: rgba(186, 104, 200, 0.7);
          border: 1px solid rgba(128, 90, 213, 0.4);
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          transition: all 0.2s;
          backdrop-filter: blur(5px);
          display: flex;
          align-items: center;
          box-shadow: 0 0 8px rgba(128, 90, 213, 0.3);
        }
        
        .axis-toggle-btn:hover {
          background: rgba(60, 30, 90, 0.8);
          color: rgba(255, 105, 180, 0.9);
          border-color: rgba(255, 105, 180, 0.6);
          box-shadow: 0 0 10px rgba(255, 105, 180, 0.4);
        }
        
        .axis-toggle-btn.active {
          background: rgba(100, 50, 130, 0.9);
          color: rgba(255, 105, 180, 1);
          border-color: rgba(255, 105, 180, 0.7);
          box-shadow: 0 0 12px rgba(255, 105, 180, 0.6);
        }
      `}</style>
    </div>
  );
};

export default AxisToggle;
