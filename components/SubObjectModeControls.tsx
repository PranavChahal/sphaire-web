import React from 'react';

interface SubObjectModeControlsProps {
  activeMode: string;
  onSelectMode: (mode: string) => void;
}

const SubObjectModeControls: React.FC<SubObjectModeControlsProps> = ({ 
  activeMode, 
  onSelectMode 
}) => {
  return (
    <div className="sub-object-controls">
      <button 
        className={`sub-object-btn ${activeMode === 'none' ? 'active' : ''}`}
        onClick={() => onSelectMode('none')}
        title="Select Object"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm12 0v10H5V5h10z" clipRule="evenodd" />
        </svg>
      </button>
      <button 
        className={`sub-object-btn ${activeMode === 'vertex' ? 'active' : ''}`}
        onClick={() => onSelectMode('vertex')}
        title="Select Vertex"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <circle cx="10" cy="10" r="5" />
        </svg>
      </button>
      <button 
        className={`sub-object-btn ${activeMode === 'edge' ? 'active' : ''}`}
        onClick={() => onSelectMode('edge')}
        title="Select Edge"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M3 10h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
      <button 
        className={`sub-object-btn ${activeMode === 'face' ? 'active' : ''}`}
        onClick={() => onSelectMode('face')}
        title="Select Face"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 2l7 12H3z" />
        </svg>
      </button>
      
      <style jsx>{`
        .sub-object-controls {
          position: absolute;
          top: 10px;
          right: 10px;
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
        
        .sub-object-btn {
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
        
        .sub-object-btn:hover {
          background: rgba(60, 30, 90, 0.8);
          color: rgba(255, 105, 180, 0.9);
          border-color: rgba(255, 105, 180, 0.6);
          box-shadow: 0 0 8px rgba(255, 105, 180, 0.3);
        }
        
        .sub-object-btn.active {
          background: rgba(100, 50, 130, 0.9);
          color: rgba(255, 105, 180, 1);
          border-color: rgba(255, 105, 180, 0.7);
          box-shadow: 0 0 12px rgba(255, 105, 180, 0.6);
        }
      `}</style>
    </div>
  );
};

export default SubObjectModeControls;
