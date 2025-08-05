import React, { useState, useRef, useEffect } from 'react';

export interface DropdownOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  description?: string;
}

interface CustomDropdownProps {
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'accent' | 'minimal';
}

const CustomDropdown: React.FC<CustomDropdownProps> = ({
  options,
  value,
  onChange,
  placeholder = "Select option...",
  disabled = false,
  className = "",
  size = 'md',
  variant = 'default'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);

  // Get the selected option
  const selectedOption = options.find(option => option.value === value);

  // Size classes
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-5 py-3 text-base'
  };

  // Variant classes
  const variantClasses = {
    default: 'bg-gray-800/90 border-gray-600/50 text-white focus:border-pink-400/80 focus:ring-pink-400/20',
    accent: 'bg-pink-900/20 border-pink-400/30 text-pink-100 focus:border-pink-400 focus:ring-pink-400/30',
    minimal: 'bg-transparent border-gray-500/30 text-gray-300 focus:border-gray-400 focus:ring-gray-400/20'
  };

  // Handle outside clicks
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          setHighlightedIndex(prev => 
            prev < options.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          event.preventDefault();
          setHighlightedIndex(prev => 
            prev > 0 ? prev - 1 : options.length - 1
          );
          break;
        case 'Enter':
          event.preventDefault();
          if (highlightedIndex >= 0) {
            onChange(options[highlightedIndex].value);
            setIsOpen(false);
            setHighlightedIndex(-1);
          }
          break;
        case 'Escape':
          setIsOpen(false);
          setHighlightedIndex(-1);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, highlightedIndex, options, onChange]);

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      if (!isOpen) {
        setHighlightedIndex(-1);
      }
    }
  };

  const handleOptionClick = (option: DropdownOption) => {
    onChange(option.value);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  return (
    <div 
      ref={dropdownRef}
      className={`relative ${className}`}
    >
      {/* Trigger Button */}
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className={`
          w-full flex items-center justify-between 
          border rounded-xl transition-all duration-300
          focus:outline-none focus:ring-2 backdrop-blur-sm
          hover:shadow-lg hover:shadow-pink-500/10
          ${sizeClasses[size]}
          ${variantClasses[variant]}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-pink-400/60'}
          ${isOpen ? 'ring-2 ring-pink-400/30 border-pink-400/80' : ''}
        `}
      >
        <div className="flex items-center flex-1 min-w-0">
          {selectedOption?.icon && (
            <div className="mr-3 flex-shrink-0 text-pink-400">
              {selectedOption.icon}
            </div>
          )}
          <div className="flex-1 text-left truncate">
            {selectedOption ? (
              <div>
                <div className="font-medium">{selectedOption.label}</div>
                {selectedOption.description && (
                  <div className="text-xs text-gray-400 mt-0.5 truncate">
                    {selectedOption.description}
                  </div>
                )}
              </div>
            ) : (
              <span className="text-gray-400">{placeholder}</span>
            )}
          </div>
        </div>
        
        {/* Dropdown Arrow */}
        <div className={`ml-2 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Dropdown Options */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50">
          <div 
            ref={optionsRef}
            className="
              bg-gray-800/95 backdrop-blur-lg border border-gray-600/50 
              rounded-xl shadow-2xl shadow-black/50 
              max-h-64 overflow-y-auto
              animate-in fade-in slide-in-from-top-2 duration-200
            "
          >
            {options.map((option, index) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleOptionClick(option)}
                className={`
                  w-full flex items-center px-4 py-3 text-left
                  border-b border-gray-700/50 last:border-b-0
                  transition-all duration-150
                  hover:bg-pink-900/20 hover:border-pink-400/30
                  focus:outline-none focus:bg-pink-900/30
                  ${highlightedIndex === index ? 'bg-pink-900/30 border-pink-400/50' : ''}
                  ${option.value === value ? 'bg-pink-900/40 text-pink-200' : 'text-white'}
                `}
              >
                {option.icon && (
                  <div className="mr-3 flex-shrink-0 text-pink-400">
                    {option.icon}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{option.label}</div>
                  {option.description && (
                    <div className="text-xs text-gray-400 mt-0.5 truncate">
                      {option.description}
                    </div>
                  )}
                </div>
                {option.value === value && (
                  <div className="ml-2 flex-shrink-0 text-pink-400">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomDropdown;
