/**
 * ParametricQuickTest - Quick test component for parametric modeling
 * 
 * Usage:
 * 1. Import in your page: import { ParametricQuickTest } from '../components/ParametricQuickTest';
 * 2. Add to JSX: <ParametricQuickTest />
 * 3. Click buttons to test parametric shapes
 */

import React, { useState } from 'react';
import { useParametricModeling } from '../hooks/useParametricModeling';
import { useBabylon } from '../contexts/BabylonContext';

export function ParametricQuickTest() {
  const { scene } = useBabylon();
  const { 
    isInitialized, 
    isLoading, 
    error, 
    createShape,
    updateParameters,
    getParameters
  } = useParametricModeling(scene);

  const [createdShapeId, setCreatedShapeId] = useState<string | null>(null);
  const [width, setWidth] = useState(2);
  const [height, setHeight] = useState(3);
  const [depth, setDepth] = useState(1);

  const handleCreateBox = async () => {
    console.log('Creating parametric box...');
    const id = await createShape('box', { width, height, depth }, 'test-box');
    setCreatedShapeId(id);
    console.log('Created box with ID:', id);
  };

  const handleCreateCylinder = async () => {
    console.log('Creating parametric cylinder...');
    const id = await createShape('cylinder', { radius: 1, height: 2 }, 'test-cylinder');
    setCreatedShapeId(id);
    console.log('Created cylinder with ID:', id);
  };

  const handleCreateSphere = async () => {
    console.log('Creating parametric sphere...');
    const id = await createShape('sphere', { radius: 1.5 }, 'test-sphere');
    setCreatedShapeId(id);
    console.log('Created sphere with ID:', id);
  };

  const handleCreateGear = async () => {
    console.log('Creating parametric gear...');
    const id = await createShape('gear', {
      teeth: 20,
      module: 0.2,
      thickness: 0.5,
      innerRadius: 0.8
    }, 'test-gear');
    setCreatedShapeId(id);
    console.log('Created gear with ID:', id);
  };

  const handleUpdateBox = async () => {
    if (!createdShapeId) {
      alert('Create a shape first!');
      return;
    }
    console.log('Updating box parameters...');
    await updateParameters(createdShapeId, { width, height, depth });
    console.log('Updated box parameters');
  };

  const handleGetParams = () => {
    if (!createdShapeId) {
      alert('Create a shape first!');
      return;
    }
    const params = getParameters(createdShapeId);
    console.log('Current parameters:', params);
    alert(`Parameters: ${JSON.stringify(params, null, 2)}`);
  };

  return (
    <div className="fixed top-4 right-4 bg-gray-800 text-white p-4 rounded-lg shadow-lg z-50 max-w-sm">
      <h2 className="text-xl font-bold mb-3">Parametric Test</h2>
      
      {/* Status */}
      <div className="mb-3 text-sm">
        <div className={isInitialized ? 'text-green-400' : 'text-yellow-400'}>
          {isInitialized ? 'OpenCascade Ready' : '⏳ Initializing...'}
        </div>
        {isLoading && <div className="text-blue-400">⏳ Loading...</div>}
        {error && <div className="text-red-400">{error}</div>}
      </div>

      {/* Create Buttons */}
      <div className="space-y-2 mb-3">
        <button
          onClick={handleCreateBox}
          disabled={!isInitialized || isLoading}
          className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded transition"
        >
          Create Box
        </button>
        <button
          onClick={handleCreateCylinder}
          disabled={!isInitialized || isLoading}
          className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded transition"
        >
          🛢️ Create Cylinder
        </button>
        <button
          onClick={handleCreateSphere}
          disabled={!isInitialized || isLoading}
          className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 rounded transition"
        >
          ⚽ Create Sphere
        </button>
        <button
          onClick={handleCreateGear}
          disabled={!isInitialized || isLoading}
          className="w-full px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 rounded transition"
        >
          Create Gear
        </button>
      </div>

      {/* Parameter Controls */}
      {createdShapeId && (
        <div className="border-t border-gray-600 pt-3 space-y-2">
          <h3 className="text-sm font-semibold">Edit Box Parameters:</h3>
          
          <label className="block">
            <span className="text-xs">Width: {width}</span>
            <input
              type="range"
              min="0.5"
              max="5"
              step="0.1"
              value={width}
              onChange={(e) => setWidth(parseFloat(e.target.value))}
              className="w-full"
            />
          </label>

          <label className="block">
            <span className="text-xs">Height: {height}</span>
            <input
              type="range"
              min="0.5"
              max="5"
              step="0.1"
              value={height}
              onChange={(e) => setHeight(parseFloat(e.target.value))}
              className="w-full"
            />
          </label>

          <label className="block">
            <span className="text-xs">Depth: {depth}</span>
            <input
              type="range"
              min="0.5"
              max="5"
              step="0.1"
              value={depth}
              onChange={(e) => setDepth(parseFloat(e.target.value))}
              className="w-full"
            />
          </label>

          <button
            onClick={handleUpdateBox}
            className="w-full px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded transition text-sm"
          >
            Update Parameters
          </button>

          <button
            onClick={handleGetParams}
            className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded transition text-sm"
          >
            Show Parameters
          </button>
        </div>
      )}

      <div className="mt-3 text-xs text-gray-400">
        {createdShapeId ? `Active: ${createdShapeId}` : 'No shape created yet'}
      </div>
    </div>
  );
}

