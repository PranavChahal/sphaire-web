/**
 * Context-Aware AI Modeling Hook
 * Extends useAIModeling with scene context awareness for object modification
 */

import { useState, useCallback } from 'react';
import { Scene } from '@babylonjs/core';
import { occMainThreadExecutor } from '@/services/occMainThreadExecutor';
import { serializeSceneContext, getCompactSceneContext } from '@/services/sceneContextSerializer';
import { detectIntent, UserIntent, explainIntent, extractNumbers, extractAxis } from '@/services/intentDetector';
import { 
  executeModification, 
  applyTransform, 
  parseTransformJSON, 
  updateParametricParameters 
} from '@/services/modificationExecutor';
import promptContext from '@/services/promptContext';
import { Shape, ParametricShape } from '@/store/store';

export interface ContextAwareRequest {
  prompt: string;
  shapes: Shape[];
  selectedShapeId: string | null;
  backend?: 'opencascade';
}

export interface ContextAwareResponse {
  intent: UserIntent;
  success: boolean;
  modifiedShape?: Shape;
  transformUpdate?: any;
  parameterUpdate?: Record<string, number>;
  code?: string;
  error?: string;
  explanation?: string;
}

export const useAIModelingContextAware = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastIntent, setLastIntent] = useState<UserIntent | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Main context-aware generation function
   */
  const generateWithContext = useCallback(async (
    request: ContextAwareRequest
  ): Promise<ContextAwareResponse> => {
    setIsProcessing(true);
    setError(null);

    try {
      const { prompt, shapes, selectedShapeId } = request;
      
      // 1. Detect user intent
      const analysis = detectIntent(prompt, selectedShapeId !== null, shapes.length);
      setLastIntent(analysis.intent);
      
      console.log('CONTEXT-AI: Intent detected:', analysis);
      console.log('CONTEXT-AI:', explainIntent(analysis));
      
      // 2. Handle based on intent
      switch (analysis.intent) {
        case UserIntent.CREATE_NEW:
          return await handleCreateNew(prompt);
          
        case UserIntent.MODIFY_EXISTING:
          if (!selectedShapeId) {
            throw new Error('No shape selected for modification');
          }
          return await handleModification(prompt, shapes, selectedShapeId);
          
        case UserIntent.TRANSFORM:
          if (!selectedShapeId) {
            throw new Error('No shape selected for transformation');
          }
          return await handleTransform(prompt, shapes, selectedShapeId);
          
        case UserIntent.UPDATE_PARAMETERS:
          if (!selectedShapeId) {
            throw new Error('No shape selected for parameter update');
          }
          return await handleParameterUpdate(
            prompt, 
            shapes, 
            selectedShapeId, 
            analysis.targetParameter!,
            analysis.targetValue!
          );
          
        case UserIntent.DELETE:
          return {
            intent: UserIntent.DELETE,
            success: true,
            explanation: 'Delete operation - handle in UI'
          };
          
        case UserIntent.QUERY:
          return {
            intent: UserIntent.QUERY,
            success: true,
            explanation: 'Query operation - not yet implemented'
          };
          
        default:
          throw new Error(`Unsupported intent: ${analysis.intent}`);
      }
      
    } catch (err: any) {
      const errorMsg = err.message || 'Context-aware generation failed';
      console.error('CONTEXT-AI: Error:', errorMsg);
      setError(errorMsg);
      
      return {
        intent: UserIntent.CREATE_NEW,
        success: false,
        error: errorMsg
      };
    } finally {
      setIsProcessing(false);
    }
  }, []);

  /**
   * Handle CREATE_NEW intent (existing flow)
   */
  async function handleCreateNew(prompt: string): Promise<ContextAwareResponse> {
    console.log('CONTEXT-AI: Creating new object');
    
    // Use existing generation flow
    const response = await fetch('/api/ai-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        backend: 'opencascade'
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Code generation failed');
    }
    
    const data = await response.json();
    
    return {
      intent: UserIntent.CREATE_NEW,
      success: true,
      code: data.code,
      explanation: 'New object created'
    };
  }

  /**
   * Handle MODIFY_EXISTING intent
   */
  async function handleModification(
    prompt: string,
    shapes: Shape[],
    selectedShapeId: string
  ): Promise<ContextAwareResponse> {
    console.log('✏️ CONTEXT-AI: Modifying existing object');
    
    // Get scene context
    const sceneContext = serializeSceneContext(shapes, selectedShapeId);
    const compactContext = getCompactSceneContext(shapes, selectedShapeId);
    
    console.log('📋 Scene context:', compactContext);
    
    // Build modification-specific prompt
    const selectedShape = shapes.find(s => s.id === selectedShapeId)!;
    const systemPrompt = promptContext.buildSystemPrompt('opencascade', prompt);
    const userPrompt = promptContext.buildModificationPrompt(
      prompt,
      selectedShape,
      compactContext
    );
    
    // Call AI
    const response = await fetch('/api/ai-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: userPrompt,
        backend: 'opencascade'
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Modification code generation failed');
    }
    
    const data = await response.json();
    console.log('Generated modification code:', data.code.substring(0, 200) + '...');
    
    // Execute modification
    const ocInstance = occMainThreadExecutor.getOCInstance();
    if (!ocInstance) {
      throw new Error('OpenCascade not initialized');
    }
    
    const result = await executeModification(
      data.code,
      selectedShapeId,
      shapes,
      ocInstance
    );
    
    if (!result.success) {
      throw new Error(result.error || 'Modification execution failed');
    }
    
    return {
      intent: UserIntent.MODIFY_EXISTING,
      success: true,
      modifiedShape: result.modifiedShape,
      code: data.code,
      explanation: `Object modified successfully in ${result.executionTime?.toFixed(0)}ms`
    };
  }

  /**
   * Handle TRANSFORM intent
   */
  async function handleTransform(
    prompt: string,
    shapes: Shape[],
    selectedShapeId: string
  ): Promise<ContextAwareResponse> {
    console.log('CONTEXT-AI: Transforming object');
    
    // Get scene context
    const compactContext = getCompactSceneContext(shapes, selectedShapeId);
    const selectedShape = shapes.find(s => s.id === selectedShapeId)!;
    
    // Build transform-specific prompt
    const systemPrompt = promptContext.buildSystemPrompt('opencascade', prompt);
    const userPrompt = promptContext.buildTransformPrompt(
      prompt,
      selectedShape,
      compactContext
    );
    
    // Call AI
    const response = await fetch('/api/ai-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: userPrompt,
        backend: 'opencascade'
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Transform generation failed');
    }
    
    const data = await response.json();
    console.log('Generated transform:', data.code);
    
    // Parse JSON transform
    const transform = parseTransformJSON(data.code);
    if (!transform) {
      throw new Error('Failed to parse transform JSON');
    }
    
    // Apply transform
    const transformedShape = applyTransform(selectedShape, transform);
    
    return {
      intent: UserIntent.TRANSFORM,
      success: true,
      modifiedShape: transformedShape,
      transformUpdate: transform,
      explanation: 'Transform applied successfully'
    };
  }

  /**
   * Handle UPDATE_PARAMETERS intent
   */
  async function handleParameterUpdate(
    prompt: string,
    shapes: Shape[],
    selectedShapeId: string,
    parameter: string,
    value: number
  ): Promise<ContextAwareResponse> {
    console.log(`CONTEXT-AI: Updating parameter ${parameter} = ${value}`);
    
    const selectedShape = shapes.find(s => s.id === selectedShapeId);
    if (!selectedShape || selectedShape.type !== 'parametric') {
      throw new Error('Selected shape is not parametric');
    }
    
    const paramShape = selectedShape as ParametricShape;
    
    // Update parameters
    const newParameters = updateParametricParameters(paramShape, {
      [parameter]: value
    });
    
    return {
      intent: UserIntent.UPDATE_PARAMETERS,
      success: true,
      parameterUpdate: newParameters,
      explanation: `Parameter ${parameter} updated to ${value}`
    };
  }

  return {
    generateWithContext,
    isProcessing,
    lastIntent,
    error
  };
};
