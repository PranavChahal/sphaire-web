import React from 'react';

interface TransformControlsProps {
  activeMode: string;
  onSelectMode: (mode: string) => void;
}

const TransformControls: React.FC<TransformControlsProps> = ({ 
  activeMode, 
  onSelectMode 
}) => {
  return (
    <div className="transform-controls">
      <button 
        className={`transform-btn ${activeMode === 'position' ? 'active' : ''}`}
        onClick={() => onSelectMode('position')}
        title="Move (W)"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
          <path fillRule="evenodd" d="M10 3a1 1 0 011 1v12a1 1 0 11-2 0V4a1 1 0 011-1z" clipRule="evenodd" />
        </svg>
      </button>
      <button 
        className={`transform-btn ${activeMode === 'rotation' ? 'active' : ''}`}
        onClick={() => onSelectMode('rotation')}
        title="Rotate (E)"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
        </svg>
      </button>
      <button 
        className={`transform-btn ${activeMode === 'scale' ? 'active' : ''}`}
        onClick={() => onSelectMode('scale')}
        title="Scale (R)"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M3 3a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 01-1.414 1.414L5 5.414V7a1 1 0 01-2 0V3zm5 4a1 1 0 011-1h4a1 1 0 010 2h-4a1 1 0 01-1-1zm5 3a1 1 0 00-1 1v4a1 1 0 002 0v-1.586l2.293 2.293a1 1 0 001.414-1.414L14.414 13H16a1 1 0 000-2h-3z" clipRule="evenodd" />
        </svg>
      </button>
      
      <style jsx>{`
        .transform-controls {
          position: absolute;
          top: 10px;
          left: 10px;
          background: rgba(10, 5, 15, 0.8);
          border-radius: 4px;
          padding: 5px;
          display: flex;
          flex-direction: column;
          gap: 5px;
          box-shadow: 0 0 10px rgba(128, 90, 213, 0.5);
          z-index: 10;
          backdrop-filter: blur(5px);
          border: 1px solid rgba(186, 104, 200, 0.3);
        }
        
        .transform-btn {
          width: 36px;
          height: 36px;
          display: flex;
          justify-content: center;
          align-items: center;
          background: rgba(20, 10, 30, 0.7);
          border: 1px solid rgba(128, 90, 213, 0.4);
          border-radius: 4px;
          color: rgba(186, 104, 200, 0.7);
          cursor: pointer;
          font-size: 16px;
          transition: all 0.2s;
        }
        
        .transform-btn:hover {
          background: rgba(60, 30, 90, 0.8);
          color: rgba(255, 105, 180, 0.9);
          border-color: rgba(255, 105, 180, 0.6);
          box-shadow: 0 0 8px rgba(255, 105, 180, 0.3);
        }
        
        .transform-btn.active {
          background: rgba(100, 50, 130, 0.9);
          color: rgba(255, 105, 180, 1);
          border-color: rgba(255, 105, 180, 0.7);
          box-shadow: 0 0 12px rgba(255, 105, 180, 0.6);
        }
      `}</style>
    </div>
  );
};

export default TransformControls;
