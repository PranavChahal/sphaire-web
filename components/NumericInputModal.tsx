import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface NumericInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (value: number) => void;
  title: string;
  label: string;
  defaultValue: number;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}

export const NumericInputModal: React.FC<NumericInputModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  label,
  defaultValue,
  min,
  max,
  step = 0.1,
  unit = ''
}) => {
  const [value, setValue] = useState(defaultValue.toString());
  const [isValid, setIsValid] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setValue(defaultValue.toString());
      setIsValid(true);
    }
  }, [isOpen, defaultValue]);

  useEffect(() => {
    const numValue = parseFloat(value);
    const valid = !isNaN(numValue) && 
                 (min === undefined || numValue >= min) && 
                 (max === undefined || numValue <= max);
    setIsValid(valid);
  }, [value, min, max]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && isValid) {
      e.preventDefault();
      handleConfirm();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const handleConfirm = () => {
    if (isValid) {
      onConfirm(parseFloat(value));
      onClose();
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-80 max-w-sm mx-4 border border-gray-600">
        <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            {label}
          </label>
          <div className="relative">
            <input
              type="number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className={`w-full px-3 py-2 bg-gray-700 border rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 ${
                isValid 
                  ? 'border-gray-600 focus:ring-blue-500' 
                  : 'border-red-500 focus:ring-red-500'
              }`}
              min={min}
              max={max}
              step={step}
              autoFocus
            />
            {unit && (
              <span className="absolute right-3 top-2 text-gray-400 text-sm">
                {unit}
              </span>
            )}
          </div>
          {!isValid && (
            <p className="text-red-400 text-sm mt-1">
              {min !== undefined && max !== undefined 
                ? `Value must be between ${min} and ${max}`
                : min !== undefined 
                ? `Value must be at least ${min}`
                : max !== undefined
                ? `Value must be at most ${max}`
                : 'Invalid number'
              }
            </p>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!isValid}
            className={`flex-1 px-4 py-2 rounded-md transition-colors ${
              isValid
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-gray-500 text-gray-300 cursor-not-allowed'
            }`}
          >
            Confirm
          </button>
        </div>

        <div className="mt-3 text-xs text-gray-400 text-center">
          Press Enter to confirm • Escape to cancel
        </div>
      </div>
    </div>,
    document.body
  );
};
