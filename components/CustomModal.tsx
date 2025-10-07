import React, { useEffect } from 'react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error' | 'confirm';
  confirmText?: string;
  cancelText?: string;
}

const CustomModal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  type = 'info',
  confirmText = 'OK',
  cancelText = 'Cancel'
}) => {
  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent background scrolling
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Get theme colors based on type
  const getThemeColors = () => {
    switch (type) {
      case 'success':
        return {
          icon: '',
          iconColor: 'text-green-400',
          buttonBg: 'bg-green-600 hover:bg-green-700',
          borderColor: 'border-green-400/30'
        };
      case 'warning':
        return {
          icon: '',
          iconColor: 'text-yellow-400',
          buttonBg: 'bg-yellow-600 hover:bg-yellow-700',
          borderColor: 'border-yellow-400/30'
        };
      case 'error':
        return {
          icon: '',
          iconColor: 'text-red-400',
          buttonBg: 'bg-red-600 hover:bg-red-700',
          borderColor: 'border-red-400/30'
        };
      case 'confirm':
        return {
          icon: '❓',
          iconColor: 'text-pink-400',
          buttonBg: 'bg-pink-600 hover:bg-pink-700',
          borderColor: 'border-pink-400/30'
        };
      default:
        return {
          icon: 'ℹ️',
          iconColor: 'text-blue-400',
          buttonBg: 'bg-blue-600 hover:bg-blue-700',
          borderColor: 'border-blue-400/30'
        };
    }
  };

  const theme = getThemeColors();

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className={`
        relative bg-gradient-to-b from-gray-900 to-black
        border ${theme.borderColor}
        rounded-2xl shadow-2xl
        max-w-md w-full mx-4
        transform transition-all duration-300 ease-out
        animate-in fade-in-0 zoom-in-95
      `}>
        {/* Header */}
        <div className="flex items-center space-x-3 p-6 border-b border-gray-700/50">
          <div className={`text-2xl ${theme.iconColor}`}>
            {theme.icon}
          </div>
          <h3 className="text-lg font-semibold text-white">
            {title}
          </h3>
        </div>
        
        {/* Content */}
        <div className="p-6">
          <p className="text-gray-300 leading-relaxed whitespace-pre-line">
            {message}
          </p>
        </div>
        
        {/* Actions */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-700/50">
          {type === 'confirm' && onConfirm ? (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors duration-200 hover:bg-gray-800 rounded-lg"
              >
                {cancelText}
              </button>
              <button
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className={`
                  px-6 py-2 ${theme.buttonBg}
                  text-white font-medium rounded-lg
                  transition-all duration-200 transform hover:scale-105
                  shadow-lg
                `}
              >
                {confirmText}
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              className={`
                px-6 py-2 ${theme.buttonBg}
                text-white font-medium rounded-lg
                transition-all duration-200 transform hover:scale-105
                shadow-lg
              `}
            >
              {confirmText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomModal;
