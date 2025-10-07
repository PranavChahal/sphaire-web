/**
 * useParametricModeling Hook
 * Provides easy access to parametric modeling functionality
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { Scene } from '@babylonjs/core';
import { ParametricBridge, ParametricShapeType, ParametricMetadata } from '../utils/ParametricBridge';
import useStore from '../store/store';

export interface UseParametricModelingResult {
  // State
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
  
  // Actions
  initialize: () => Promise<void>;
  createShape: (
    shapeType: ParametricShapeType,
    parameters: Record<string, number>,
    name?: string
  ) => Promise<string | null>;
  updateParameters: (
    shapeId: string,
    newParameters: Record<string, number>
  ) => Promise<void>;
  getParameters: (shapeId: string) => Record<string, number> | null;
  exportParametricData: (shapeId: string) => Omit<ParametricMetadata, 'occShape'> | null;
}

/**
 * Hook for parametric modeling with OpenCascade.js
 */
export function useParametricModeling(scene: Scene | null): UseParametricModelingResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const bridgeRef = useRef<ParametricBridge | null>(null);
  const { addParametricShape, updateParametricParameters, shapes } = useStore();

  /**
   * Initialize the ParametricBridge
   */
  const initialize = useCallback(async () => {
    if (isInitialized || !scene) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const bridge = new ParametricBridge(scene);
      await bridge.initialize();
      bridgeRef.current = bridge;
      setIsInitialized(true);
      console.log('ParametricBridge initialized successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to initialize ParametricBridge: ${errorMessage}`);
      console.error('ParametricBridge initialization failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, [scene, isInitialized]);

  /**
   * Create a new parametric shape
   */
  const createShape = useCallback(async (
    shapeType: ParametricShapeType,
    parameters: Record<string, number>,
    name?: string
  ): Promise<string | null> => {
    if (!bridgeRef.current || !isInitialized) {
      setError('ParametricBridge not initialized. Call initialize() first.');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log(`Creating parametric ${shapeType} with parameters:`, parameters);
      
      // Create the shape using ParametricBridge
      const result = await bridgeRef.current.createParametricShape(
        shapeType,
        parameters,
        name
      );

      // Add to Zustand store
      const shapeId = addParametricShape({
        type: 'parametric',
        shapeType,
        parameters,
        constructionCode: result.metadata.constructionCode,
        version: 1,
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scaling: { x: 1, y: 1, z: 1 },
        color: '#808080',
        name: name || `${shapeType}-${Date.now()}`,
        babylonMesh: result.mesh,
        occShape: result.metadata.occShape
      });

      console.log(`Created parametric ${shapeType} with ID: ${shapeId}`);
      return shapeId;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to create ${shapeType}: ${errorMessage}`);
      console.error(`Failed to create parametric ${shapeType}:`, err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized, addParametricShape]);

  /**
   * Update parameters of an existing parametric shape
   */
  const updateParameters = useCallback(async (
    shapeId: string,
    newParameters: Record<string, number>
  ): Promise<void> => {
    if (!bridgeRef.current || !isInitialized) {
      setError('ParametricBridge not initialized');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log(`Updating parameters for shape ${shapeId}:`, newParameters);
      
      // Find the shape in store
      const shape = shapes.find(s => s.id === shapeId);
      if (!shape || shape.type !== 'parametric') {
        throw new Error(`Shape ${shapeId} not found or not parametric`);
      }

      // Get the Babylon mesh
      const mesh = shape.babylonMesh;
      if (!mesh) {
        throw new Error(`Mesh not found for shape ${shapeId}`);
      }

      // Update the mesh geometry using ParametricBridge
      await bridgeRef.current.updateParameters(mesh, newParameters);

      // Update the store
      updateParametricParameters(shapeId, newParameters);

      console.log(`Updated parameters for shape ${shapeId}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to update parameters: ${errorMessage}`);
      console.error(`Failed to update parameters for ${shapeId}:`, err);
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized, shapes, updateParametricParameters]);

  /**
   * Get current parameters of a parametric shape
   */
  const getParameters = useCallback((shapeId: string): Record<string, number> | null => {
    const shape = shapes.find(s => s.id === shapeId);
    if (!shape || shape.type !== 'parametric') {
      return null;
    }
    return shape.parameters;
  }, [shapes]);

  /**
   * Export parametric data (without runtime occShape)
   */
  const exportParametricData = useCallback((shapeId: string): Omit<ParametricMetadata, 'occShape'> | null => {
    if (!bridgeRef.current) {
      return null;
    }

    const shape = shapes.find(s => s.id === shapeId);
    if (!shape || shape.type !== 'parametric' || !shape.babylonMesh) {
      return null;
    }

    try {
      return bridgeRef.current.exportParametricData(shape.babylonMesh);
    } catch (err) {
      console.error('Failed to export parametric data:', err);
      return null;
    }
  }, [shapes]);

  // Auto-initialize when scene is available
  useEffect(() => {
    if (scene && !isInitialized && !isLoading) {
      initialize();
    }
  }, [scene, isInitialized, isLoading, initialize]);

  return {
    isLoading,
    error,
    isInitialized,
    initialize,
    createShape,
    updateParameters,
    getParameters,
    exportParametricData
  };
}
