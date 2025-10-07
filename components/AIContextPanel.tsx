/**
 * AI Context Panel - Bottom Right Collapsible Panel
 * Features:
 * - Context-aware AI for modifications
 * - Parametric design controls
 * - Smart intent detection
 * - Quick action buttons
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp, Target, Sparkles, Settings, Zap } from 'lucide-react';
import { useAIModelingContextAware } from '@/hooks/useAIModelingContextAware';
import { explainIntent, UserIntent } from '@/services/intentDetector';
import useStore from '@/store/store';
import { ParametricShape } from '@/store/store';
import { occMainThreadExecutor } from '@/services/occMainThreadExecutor';
import { formatParameterName } from '@/utils/parameterExtractor';
import { regenerateParametricShape } from '@/services/parametricRegenerator';
import { aiLogger } from '@/services/aiLogger';

interface AIContextPanelProps {
  className?: string;
}

export const AIContextPanel: React.FC<AIContextPanelProps> = ({ className = '' }) => {
  const [isOpen, setIsOpen] = useState(true);
  const [prompt, setPrompt] = useState('');
  const [activeTab, setActiveTab] = useState<'ai' | 'parametric'>('ai');
  const [localError, setLocalError] = useState<string | null>(null);
  
  console.log('AI PANEL: Rendering...');
  
  const { generateWithContext, isProcessing, lastIntent, error } = useAIModelingContextAware();
  const { 
    shapes, 
    selectedShapeId, 
    updateShape, 
    addParametricShape,
    updateParametricParameters 
  } = useStore();
  
  console.log('AI PANEL: Hook state -', { isProcessing, lastIntent, error });
  
  const selectedShape = shapes.find(s => s.id === selectedShapeId);
  const isParametric = selectedShape?.type === 'parametric';
  
  // Check OpenCascade initialization
  useEffect(() => {
    const checkOCC = async () => {
      try {
        await occMainThreadExecutor.initialize();
        console.log('AI PANEL: OpenCascade initialized');
      } catch (err) {
        console.error('AI PANEL: OpenCascade init failed:', err);
        setLocalError('OpenCascade not initialized. Please wait...');
      }
    };
    checkOCC();
  }, []);

  /**
   * Handle AI generation with context
   */
  const handleGenerate = useCallback(async () => {
    console.log('AI PANEL: handleGenerate called');
    console.log('Prompt:', prompt);
    console.log('Shapes count:', shapes.length);
    console.log('Selected ID:', selectedShapeId);
    
    if (!prompt.trim()) {
      console.warn('AI PANEL: Empty prompt, returning');
      alert('Please enter a prompt');
      return;
    }

    console.log('AI PANEL: Calling generateWithContext...');
    
    // Create logger for code-based modifications only
    const logger = aiLogger.createQueryLogger(prompt.trim());
    
    try {
      logger.startGeneration();
      
      const result = await generateWithContext({
        prompt: prompt.trim(),
        shapes,
        selectedShapeId,
        backend: 'opencascade'
      });
      
      logger.startExecution();
      
      console.log('AI PANEL: Result received:', result);

      if (result.success) {
        // Handle different intent types
        switch (result.intent) {
          case UserIntent.MODIFY_EXISTING:
            // Update existing shape with modification
            if (result.modifiedShape && selectedShapeId) {
              console.log('Updating existing shape:', selectedShapeId);
              updateShape(selectedShapeId, result.modifiedShape);
              showToast('Shape modified successfully', 'success');
              
              // LOG CODE-BASED MODIFICATION
              await logger.logSuccess({
                generated_code: result.code || 'modification code',
                mesh_created: true,
                skip_questions: true
              });
            }
            break;

          case UserIntent.TRANSFORM:
            // Update transform (NOT LOGGED - not code-based)
            if (result.modifiedShape && selectedShapeId) {
              console.log('Applying transform to:', selectedShapeId);
              updateShape(selectedShapeId, result.modifiedShape);
              showToast('Transform applied', 'success');
            }
            break;

          case UserIntent.UPDATE_PARAMETERS:
            // Update parameters (NOT LOGGED - parametric slider changes)
            if (result.parameterUpdate && selectedShapeId && isParametric) {
              console.log('Updating parameters:', result.parameterUpdate);
              updateParametricParameters(selectedShapeId, result.parameterUpdate);
              showToast('Parameters updated', 'success');
            }
            break;

          case UserIntent.CREATE_NEW:
            // AI Assistant is ONLY for editing, not creating
            showToast('Use AI Modeling panel (sidebar) to create new objects', 'error');
            console.warn('AI Assistant: Creation disabled. Use AI Modeling panel instead.');
            break;
        }

        // Clear prompt on success (except for CREATE_NEW which is disabled)
        if (result.intent !== UserIntent.CREATE_NEW) {
          setPrompt('');
        }
      } else {
        showToast(result.error || 'Operation failed', 'error');
      }
    } catch (err: any) {
      console.error('AI generation error:', err);
      showToast(err.message || 'Generation failed', 'error');
      
      // LOG ERROR (only for code-based modifications)
      await logger.logFailure(err, {
        skip_questions: true
      });
    }
  }, [prompt, shapes, selectedShapeId, generateWithContext, updateShape, addParametricShape, updateParametricParameters, isParametric]);

  /**
   * Toast notification
   */
  const showToast = (message: string, type: 'success' | 'error') => {
    const icon = type === 'success' ? '' : '';
    console.log(`[${type.toUpperCase()}] ${message}`);
    
    // Set local error for display
    if (type === 'error') {
      setLocalError(message);
      // Clear after 5 seconds
      setTimeout(() => setLocalError(null), 5000);
    } else {
      // Clear any errors on success
      setLocalError(null);
    }
    
    // You can add a proper toast library here later
    // For now, using alert for important messages
    if (type === 'error' && !selectedShapeId) {
      // Don't alert for "no selection" error, it's shown in UI
      return;
    }
  };

  return (
    <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
      <div 
        className={`bg-gradient-to-br from-sphaire-dark/95 to-sphaire-purple-dark/95 backdrop-blur-md border border-sphaire-purple-light/30 rounded-lg shadow-2xl shadow-purple-500/20 transition-all duration-300 ${
          isOpen ? 'w-96' : 'w-auto'
        }`}
      >
        {/* Header - Always Visible */}
        <div 
          className="flex items-center justify-between px-4 py-3 border-b border-sphaire-purple-light/20 cursor-pointer hover:bg-sphaire-purple-dark/30 transition-colors"
          onClick={() => setIsOpen(!isOpen)}
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-sphaire-pink-light" />
            <span className="font-semibold text-sm text-sphaire-purple-light">
              AI Assistant
            </span>
            {lastIntent && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-sphaire-pink/20 text-sphaire-pink-light">
                {lastIntent}
              </span>
            )}
          </div>
          {isOpen ? (
            <ChevronDown className="w-4 h-4 text-sphaire-purple-light" />
          ) : (
            <ChevronUp className="w-4 h-4 text-sphaire-purple-light" />
          )}
        </div>

        {/* Expanded Content */}
        {isOpen && (
          <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto custom-scrollbar">
            {/* Context Indicator */}
            {selectedShape && (
              <div className="flex items-center gap-2 px-3 py-2 bg-sphaire-pink/10 border border-sphaire-pink/30 rounded-md">
                <Target className="w-4 h-4 text-sphaire-pink-light" />
                <div className="flex-1 text-xs">
                  <div className="text-sphaire-pink-light font-medium">
                    Selected: {selectedShape.name || selectedShape.id}
                  </div>
                  <div className="text-sphaire-purple-light/70">
                    {selectedShape.type} {isParametric && '(parametric)'}
                  </div>
                </div>
              </div>
            )}

            {/* Tabs */}
            <div className="flex gap-2 border-b border-sphaire-purple-light/20">
              <button
                className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                  activeTab === 'ai'
                    ? 'text-sphaire-pink-light border-b-2 border-sphaire-pink-light'
                    : 'text-sphaire-purple-light hover:text-sphaire-pink-light/70'
                }`}
                onClick={() => setActiveTab('ai')}
              >
                <Sparkles className="w-3 h-3 inline mr-1" />
                AI Commands
              </button>
              <button
                className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                  !isParametric
                    ? 'text-sphaire-purple-light/30 cursor-not-allowed opacity-50'
                    : activeTab === 'parametric'
                    ? 'text-sphaire-pink-light border-b-2 border-sphaire-pink-light'
                    : 'text-sphaire-purple-light hover:text-sphaire-pink-light/70 cursor-pointer'
                }`}
                onClick={() => isParametric && setActiveTab('parametric')}
                disabled={!isParametric}
                title={!isParametric ? 'Select a parametric shape to view parameters' : 'View and edit parameters'}
              >
                <Settings className="w-3 h-3 inline mr-1" />
                Parameters
              </button>
            </div>

            {/* AI Tab */}
            {activeTab === 'ai' && (
              <div className="space-y-3">
                {/* Warning when nothing selected */}
                {!selectedShape && (
                  <div className="px-3 py-2 bg-yellow-900/20 border border-yellow-500/30 rounded-md text-yellow-200 text-xs">
                    Select an object to edit it. Use <strong>AI Modeling panel</strong> (sidebar) to create new objects.
                  </div>
                )}

                {/* Prompt Input */}
                <div>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder={
                      selectedShape
                        ? "e.g., 'make a hole through this' or 'rotate it 45 degrees'"
                        : "Select an object first, then describe the modification..."
                    }
                    className="w-full h-20 px-3 py-2 text-xs bg-sphaire-dark border border-sphaire-purple-light/30 rounded-md text-sphaire-purple-light placeholder-sphaire-purple-light/50 focus:outline-none focus:ring-1 focus:ring-sphaire-pink-light resize-none"
                    disabled={isProcessing || !selectedShape}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault();
                        if (selectedShape) {
                          handleGenerate();
                        }
                      }
                    }}
                  />
                  <div className="text-[10px] text-sphaire-purple-light/60 mt-1">
                    {selectedShape ? 'Cmd/Ctrl + Enter to apply' : 'Select an object first'}
                  </div>
                </div>

                {/* Generate Button */}
                <button
                  onClick={handleGenerate}
                  disabled={isProcessing || !prompt.trim() || !selectedShape}
                  className="w-full px-4 py-2 bg-sphaire-pink hover:bg-sphaire-pink-light disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      Generate
                    </>
                  )}
                </button>

                {/* Error Display */}
                {(error || localError) && (
                  <div className="px-3 py-2 bg-red-900/30 border border-red-500/50 rounded-md text-red-200 text-xs">
                    {error || localError}
                  </div>
                )}
                
                {/* Debug Info (remove in production) */}
                {process.env.NODE_ENV === 'development' && (
                  <div className="px-3 py-2 bg-blue-900/20 border border-blue-500/30 rounded-md text-blue-200 text-[10px]">
                    <div>Debug: isProcessing={String(isProcessing)}</div>
                    <div>Shapes: {shapes.length}</div>
                    <div>Selected: {selectedShapeId || 'none'}</div>
                  </div>
                )}

                {/* Quick Actions - Only for Selected Objects */}
                {selectedShape && (
                  <div className="space-y-2">
                    <div className="text-xs text-sphaire-purple-light font-medium">Quick Actions:</div>
                    <div className="grid grid-cols-2 gap-2">
                      <QuickActionButton
                        icon="🕳️"
                        label="Add Hole"
                        onClick={() => setPrompt("make a hole through this diameter 4")}
                      />
                      <QuickActionButton
                        icon="📏"
                        label="Add Slot"
                        onClick={() => setPrompt("cut a slot 5mm wide on top")}
                      />
                      <QuickActionButton
                        icon=""
                        label="Rotate 45°"
                        onClick={() => setPrompt("rotate it 45 degrees")}
                      />
                      <QuickActionButton
                        icon="➕"
                        label="Add Boss"
                        onClick={() => setPrompt("add a boss radius 3mm on top")}
                      />
                      <QuickActionButton
                        icon="✂️"
                        label="Chamfer Edge"
                        onClick={() => setPrompt("chamfer the edges 2mm")}
                      />
                      <QuickActionButton
                        icon="↔️"
                        label="Scale 2x"
                        onClick={() => setPrompt("scale it by 2")}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Parametric Tab */}
            {activeTab === 'parametric' && (
              <div className="space-y-3">
                {isParametric && selectedShape ? (
                  <ParametricControls
                    shape={selectedShape as ParametricShape}
                    onUpdate={(params) => {
                      if (selectedShapeId) {
                        updateParametricParameters(selectedShapeId, params);
                      }
                    }}
                  />
                ) : (
                  <div className="text-xs text-sphaire-purple-light/70 text-center py-8">
                    Select a parametric shape to edit parameters
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Quick Action Button Component
 */
const QuickActionButton: React.FC<{
  icon: string;
  label: string;
  onClick: () => void;
}> = ({ icon, label, onClick }) => (
  <button
    onClick={onClick}
    className="px-3 py-2 bg-sphaire-dark border border-sphaire-purple-light/30 hover:border-sphaire-pink-light/50 hover:bg-sphaire-purple-dark/30 rounded-md transition-colors text-left"
  >
    <div className="text-xs">
      <span className="mr-1">{icon}</span>
      <span className="text-sphaire-purple-light">{label}</span>
    </div>
  </button>
);

/**
 * Parametric Controls Component - SMOOTH LIVE UPDATES! */
const ParametricControls: React.FC<{
  shape: ParametricShape;
  onUpdate: (params: Record<string, number>) => void;
}> = ({ shape, onUpdate }) => {
  const [localParams, setLocalParams] = useState(shape.parameters);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const { updateShape } = useStore();
  const latestParamsRef = useRef<Record<string, number>>(shape.parameters);
  const lastRegenerationTimeRef = useRef<number>(0);
  const pendingRegenerationRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setLocalParams(shape.parameters);
    latestParamsRef.current = shape.parameters;
  }, [shape.parameters]);

  // SMOOTH SLIDER: Non-blocking UI update with throttled regeneration
  const handleSliderChange = useCallback((key: string, value: number) => {
    const newParams = { ...localParams, [key]: value };
    
    // INSTANT UI UPDATE (never block the slider!)
    setLocalParams(newParams);
    onUpdate(newParams);
    latestParamsRef.current = newParams;
    
    // THROTTLED REGENERATION: Max once per 100ms
    const now = Date.now();
    const timeSinceLastRegen = now - lastRegenerationTimeRef.current;
    
    // Clear any pending regeneration
    if (pendingRegenerationRef.current) {
      clearTimeout(pendingRegenerationRef.current);
      pendingRegenerationRef.current = null;
    }
    
    // Calculate delay
    const delay = timeSinceLastRegen >= 100 ? 0 : (100 - timeSinceLastRegen);
    
    // Schedule regeneration
    pendingRegenerationRef.current = setTimeout(async () => {
      if (!shape.constructionCode) return;
      
      lastRegenerationTimeRef.current = Date.now();
      setIsRegenerating(true);
      
      const paramsToUse = latestParamsRef.current;
      console.log('[PARAM-UI] Regenerating:', paramsToUse);
      
      const result = await regenerateParametricShape(shape.constructionCode, paramsToUse);
      
      if (result.success && result.meshData) {
        updateShape(shape.id, {
          meshData: result.meshData,
          parameters: paramsToUse,
          version: (shape.version || 1) + 1
        });
        console.log('[PARAM-UI] Updated');
      } else {
        console.error('[PARAM-UI] Failed:', result.error);
      }
      
      setIsRegenerating(false);
      
      // Check if params changed - regenerate again
      if (JSON.stringify(latestParamsRef.current) !== JSON.stringify(paramsToUse)) {
        console.log('[PARAM-UI] Changed during regen, updating again...');
        
        // Recursively call handleSliderChange with latest params
        const latestKey = Object.keys(latestParamsRef.current).find(k => 
          latestParamsRef.current[k] !== paramsToUse[k]
        );
        if (latestKey) {
          handleSliderChange(latestKey, latestParamsRef.current[latestKey]);
        }
      }
    }, delay);
  }, [localParams, onUpdate, shape, updateShape]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pendingRegenerationRef.current) {
        clearTimeout(pendingRegenerationRef.current);
      }
    };
  }, []);


  if (!shape.parameters || Object.keys(shape.parameters).length === 0) {
    return (
      <div className="text-xs text-sphaire-purple-light/70 text-center py-4 px-3">
        <Settings className="w-8 h-8 mx-auto mb-2 opacity-30" />
        <div>No parameters available</div>
        <div className="text-[10px] mt-1 opacity-50">This shape has no adjustable parameters</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-2">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div className="text-xs text-sphaire-purple-light/80 font-medium flex items-center gap-1.5">
          <Settings className="w-3.5 h-3.5" />
          Live Parameters
        </div>
        {isRegenerating && (
          <div className="text-[10px] text-sphaire-pink-light flex items-center gap-1">
            <div className="w-2 h-2 border border-sphaire-pink-light border-t-transparent rounded-full animate-spin" />
            Updating...
          </div>
        )}
      </div>
      
      {/* Parameter Controls */}
      <div className="space-y-4">
        {Object.entries(localParams).map(([key, value]) => {
          // Get metadata for smart ranges
          const metadata = shape.metadata?.[key] || {
            min: Math.min(0.1, value * 0.1),
            max: Math.max(value * 3, 10),
            step: value < 1 ? 0.01 : (value < 10 ? 0.1 : 1)
          };
          
          const percentage = ((value - metadata.min) / (metadata.max - metadata.min)) * 100;
          
          return (
            <div key={key} className="space-y-2 px-1">
              {/* Label and Value */}
              <div className="flex justify-between items-center">
                <label className="text-xs text-sphaire-purple-light font-medium">
                  {formatParameterName(key)}
                </label>
                <span className="text-xs text-sphaire-pink-light font-mono bg-sphaire-purple-dark/50 px-2 py-0.5 rounded">
                  {value.toFixed(metadata.step < 0.1 ? 2 : 1)}
                </span>
              </div>
              
              {/* Slider with gradient */}
              <div className="relative">
                <input
                  type="range"
                  min={metadata.min}
                  max={metadata.max}
                  step={metadata.step}
                  value={value}
                  onInput={(e) => handleSliderChange(key, parseFloat((e.target as HTMLInputElement).value))}
                  disabled={isRegenerating}
                  className="w-full h-2 bg-transparent rounded-lg appearance-none cursor-grab active:cursor-grabbing focus:outline-none focus:ring-2 focus:ring-sphaire-pink-light/50"
                  style={{
                    background: `linear-gradient(to right, 
                      rgb(236, 72, 153) 0%, 
                      rgb(168, 85, 247) ${percentage}%, 
                      rgba(168, 85, 247, 0.2) ${percentage}%, 
                      rgba(168, 85, 247, 0.2) 100%)
                    `,
                    WebkitAppearance: 'none',
                    MozAppearance: 'none'
                  }}
                />
                {/* Min/Max labels */}
                <div className="flex justify-between mt-1">
                  <span className="text-[9px] text-sphaire-purple-light/40">
                    {metadata.min.toFixed(metadata.step < 0.1 ? 2 : 1)}
                  </span>
                  <span className="text-[9px] text-sphaire-purple-light/40">
                    {metadata.max.toFixed(metadata.step < 0.1 ? 2 : 1)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Info footer */}
      <div className="text-[10px] text-sphaire-purple-light/50 text-center pt-2 border-t border-sphaire-purple-light/10">
        Drag sliders to see live updates
      </div>
    </div>
  );
};

export default AIContextPanel;
