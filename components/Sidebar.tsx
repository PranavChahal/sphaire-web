import React, { useState, useEffect, useRef } from 'react';
import { useUIStore } from '../store/uiStore';
import useStore from '../store/store';
import useSceneStore from '../store/sceneStore';
import ObjectManager from './ObjectManager';
import AIModelingPanel from './AIModelingPanel';
import CustomDropdown, { DropdownOption } from './CustomDropdown';
import { useLighting } from '../hooks/useLighting';
import useRenderCamera from '../hooks/useRenderCamera';
import TextureGenerator from './TextureGenerator';
import { PBRTextureStack } from '../services/stableMaterialsService';
import { Vector3 } from '@babylonjs/core';

import * as SubObjectEditor from '../utils/subObjectEditor';
import { Shape, BoxShape, SphereShape, CylinderShape } from '../store/store';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

type SidebarMode = 'expanded' | 'compact';

const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange }) => {
  const posXRef = useRef<HTMLInputElement>(null);
  const posYRef = useRef<HTMLInputElement>(null);
  const posZRef = useRef<HTMLInputElement>(null);
  const rotXRef = useRef<HTMLInputElement>(null);
  const rotYRef = useRef<HTMLInputElement>(null);
  const rotZRef = useRef<HTMLInputElement>(null);
  const scaleXRef = useRef<HTMLInputElement>(null);
  const scaleYRef = useRef<HTMLInputElement>(null);
  const scaleZRef = useRef<HTMLInputElement>(null);
  

  
  const addShape = useStore(state => state.addShape);
  
  // Get scene and selected meshes from scene store for AI modeling and texture generation
  const { scene, selectedMeshes } = useSceneStore();
  
  const selectedMesh = selectedMeshes.length > 0 ? selectedMeshes[0] : null;
  
  const { 
    updateKeyLight, 
    updateFillLight, 
    updateRimLight, 
    applyLightingPreset, 
    color3ToHex, 
    hexToColor3, 
    lightingPresets,
    activateLightGizmo,
    hideLightHelpers 
  } = useLighting();
  
  const [selectedLightingPreset, setSelectedLightingPreset] = useState('studio');
  const [keyLightIntensity, setKeyLightIntensity] = useState(1.2);
  const [fillLightIntensity, setFillLightIntensity] = useState(0.3);
  const [rimLightIntensity, setRimLightIntensity] = useState(0.6);
  const [keyLightColor, setKeyLightColor] = useState('#fff2cc');
  const [fillLightColor, setFillLightColor] = useState('#b3ccff');
  const [rimLightColor, setRimLightColor] = useState('#e6e6ff');
  const [keyLightDirection, setKeyLightDirection] = useState({ x: -0.5, y: -1, z: -0.3 });
  const [rimLightDirection, setRimLightDirection] = useState({ x: 1, y: 0.2, z: 0.5 });
  
  const [selectedLight, setSelectedLight] = useState<'key' | 'fill' | 'rim' | null>(null);
  const [gizmoMode, setGizmoMode] = useState<'position' | 'rotation'>('position');
  
  const { state: renderCameraState, actions: renderCameraActions } = useRenderCamera();
  
  // Resolution preset state
  const [selectedResolution, setSelectedResolution] = useState('fhd');
  
  useEffect(() => {
    if (activeTab === 'lighting') {
      setSelectedLight(null);
    } else {
      // Hide light helpers when switching away from lighting tab
      hideLightHelpers();
      setSelectedLight(null);
    }
  }, [activeTab, hideLightHelpers]);
  useEffect(() => {
    console.log('Sidebar mounted - running preemptive cleanup');
    try {
      if (typeof window !== 'undefined' && (window as any).__babylonEmergencyCleanup) {
        (window as any).__babylonEmergencyCleanup();
      }
    } catch (e) {
      console.error('Error in sidebar preemptive cleanup:', e);
    }
  }, []);

  // State for sidebar mode (expanded or compact)
  const [sidebarMode, setSidebarMode] = useState<SidebarMode>('expanded');
  
  // State for custom dropdowns
  const [selectedShapeType, setSelectedShapeType] = useState<string>('box');
  
  // Shape options with icons
  const shapeOptions: DropdownOption[] = [
    {
      value: 'box',
      label: 'Box',
      description: 'Rectangular cuboid shape',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      )
    },
    {
      value: 'sphere',
      label: 'Sphere',
      description: 'Perfect round ball shape',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" strokeWidth={2} />
        </svg>
      )
    },
    {
      value: 'cylinder',
      label: 'Cylinder',
      description: 'Circular tube shape',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16h10" />
        </svg>
      )
    }
  ];
  
  // Sub-object editing states - using local state for UI-specific values
  const [_selectionRadius, _setSelectionRadius] = useState<number>(0.1); // Kept for future use
  const [operationAmount, setOperationAmount] = useState<number>(0.5);
  const [precisionMode, setPrecisionMode] = useState<boolean>(true);
  
  // Get state from the store
  const { 
    activeMesh,
    subObjectMode,
    subObjectSelectedElements: selectedElements, 
    setSubObjectMode,
    // setSubObjectSelectedElements omitted as it's unused
    clearSubObjectSelection
  } = useUIStore();
  
  // Handler for extrude operation
  const handleExtrude = async () => {
    if (!activeMesh || selectedElements.length === 0) return;
    
    try {
      // Update mesh CAD data with precision mode
      if (precisionMode) {
        const shape = await SubObjectEditor.createShapeFromMesh(activeMesh);
        if (shape) {
          SubObjectEditor.setCADData(activeMesh, shape, precisionMode);
        }
      }
      
      // Perform extrusion
      await SubObjectEditor.extrudeElements(
        activeMesh,
        selectedElements,
        operationAmount
      );
      
      // Reset selection after operation
      clearSubObjectSelection();
    } catch (error) {
      console.error('Failed to extrude elements:', error);
    }
  };
  
  // Handler for bevel operation
  const handleBevel = async () => {
    if (!activeMesh || selectedElements.length === 0) return;
    
    try {
      // Update mesh CAD data with precision mode
      if (precisionMode) {
        const shape = await SubObjectEditor.createShapeFromMesh(activeMesh);
        if (shape) {
          SubObjectEditor.setCADData(activeMesh, shape, precisionMode);
        }
      }
      
      // Perform bevel
      await SubObjectEditor.bevelElements(
        activeMesh,
        selectedElements,
        operationAmount
      );
      
      // Reset selection after operation
      clearSubObjectSelection();
    } catch (error) {
      console.error('Failed to bevel elements:', error);
    }
  };
  
  // Toggle between expanded and compact mode
  const toggleSidebarMode = () => {
    setSidebarMode(sidebarMode === 'expanded' ? 'compact' : 'expanded');
  };
  
  // Handler for adding a new shape from the sidebar form
  const handleAddShape = () => {
    try {
      // Get values from form inputs
      const type = selectedShapeType as 'box' | 'sphere' | 'cylinder';
      
      // Parse numeric values with defaults
      const parseInputValue = (ref: React.RefObject<HTMLInputElement>, defaultValue: number): number => {
        const value = ref.current?.value;
        return value ? parseFloat(value) : defaultValue;
      };
      
      // Get position values
      const position = {
        x: parseInputValue(posXRef, 0),
        y: parseInputValue(posYRef, 1),
        z: parseInputValue(posZRef, 0)
      };
      
      // Get rotation values
      const rotation = {
        x: parseInputValue(rotXRef, 0),
        y: parseInputValue(rotYRef, 0),
        z: parseInputValue(rotZRef, 0)
      };
      
      // Get scaling values
      const scaling = {
        x: parseInputValue(scaleXRef, 1),
        y: parseInputValue(scaleYRef, 1),
        z: parseInputValue(scaleZRef, 1)
      };
      
      // Prepare shape data based on type
      const shapeData: Partial<Shape> = {
        type,
        position,
        rotation,
        scaling,
        color: '#ff00ff' // Default color
      };
      
      // Add type-specific properties with proper typing
      if (type === 'box') {
        (shapeData as Partial<BoxShape>).dimensions = {
          width: scaling.x,
          height: scaling.y,
          depth: scaling.z
        };
      } else if (type === 'sphere') {
        (shapeData as Partial<SphereShape>).radius = scaling.x;
      } else if (type === 'cylinder') {
        (shapeData as Partial<CylinderShape>).height = scaling.y;
        (shapeData as Partial<CylinderShape>).diameter = scaling.x * 2;
      }
      
      // Ensure the shape has an ID before adding it
      if (!shapeData.id) {
        shapeData.id = `shape_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }
      
      // Add the shape to the store
      addShape(shapeData);
      
      console.log('Shape added to store:', shapeData);
    } catch (error) {
      console.error('Error adding shape:', error);
    }
  };

  // We've simplified the sidebar by moving some tabs to the header (lighting, voice, export, AI)
  const { setActiveTab } = useUIStore(state => ({ setActiveTab: state.setActiveTab }));
  
  const tabs = [
    { id: 'object', name: 'Object', icon: (
      <svg className="w-6 h-6 group-hover:text-sphaire-pink-light transition-colors duration-300" fill="currentColor" viewBox="0 0 20 20">
        <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
      </svg>
    )},
    { id: 'ai-modeling', name: 'AI Modeling', icon: (
      <span className="text-sm font-bold group-hover:text-sphaire-pink-light transition-colors duration-300">
        AI
      </span>
    )},
    { id: 'code-editor', name: 'Code Editor', icon: (
      <svg className="w-6 h-6 group-hover:text-sphaire-pink-light transition-colors duration-300" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
      </svg>
    )},
    { id: 'edit', name: 'Edit', icon: (
      <svg className="w-6 h-6 group-hover:text-sphaire-pink-light transition-colors duration-300" fill="currentColor" viewBox="0 0 20 20">
        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
      </svg>
    )},
    { id: 'texture', name: 'Texture', icon: (
      <svg className="w-6 h-6 group-hover:text-sphaire-pink-light transition-colors duration-300" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M4 2a2 2 0 00-2 2v11a3 3 0 106 0V4a2 2 0 00-2-2H4zm1 14a1 1 0 100-2 1 1 0 000 2zm5-1.757l4.9-4.9a2 2 0 000-2.828L13.485 5.1a2 2 0 00-2.828 0L10 5.757v8.486zM16 18H9.071l6-6H16a2 2 0 012 2v2a2 2 0 01-2 2z" clipRule="evenodd" />
      </svg>
    )},
    { id: 'lighting', name: 'Lighting', icon: (
      <svg className="w-6 h-6 group-hover:text-sphaire-pink-light transition-colors duration-300" fill="currentColor" viewBox="0 0 20 20">
        <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.477.859h4z" />
      </svg>
    )},
    { id: 'render-camera', name: 'Render', icon: (
      <svg className="w-6 h-6 group-hover:text-sphaire-pink-light transition-colors duration-300" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v6a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586l-.707-.707A1 1 0 0013 4H7a1 1 0 00-.707.293L5.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
      </svg>
    )}
  ];
  
  // Function to perform emergency Babylon.js cleanup before navigation
  const performEmergencyCleanup = () => {
    try {
      console.log('Performing emergency Babylon.js cleanup before tab change');
      if (typeof window !== 'undefined' && (window as any).__babylonEmergencyCleanup) {
        (window as any).__babylonEmergencyCleanup();
      }
    } catch (error) {
      console.error('Error during emergency cleanup:', error);
    }
  };

  // Handle tab changes and cleanup
  const handleTabChange = (tabId: string) => {
    // Always do emergency cleanup before switching tabs
    performEmergencyCleanup();
    
    // Additional safety - try to dispose any engines
    try {
      if (typeof window !== 'undefined' && (window as any).BABYLON) {
        const BABYLON = (window as any).BABYLON;
        // Filter the console.error function to silence Babylon.js errors during tab change
        const originalConsoleError = console.error;
        console.error = (...args: any[]) => {
          const message = args?.[0]?.toString() || '';
          // Ignore known Babylon.js errors during cleanup
          if (
            message.includes('Unable to get property') ||
            message.includes('Cannot read') ||
            message.includes('null is not an object') ||
            message.includes('undefined is not an object')
          ) {
            return;
          }
          originalConsoleError(...args);
        };
        
        // Force cleanup of any lingering engines
        if (BABYLON && BABYLON.Engine && BABYLON.Engine.Instances) {
          const engines = BABYLON.Engine.Instances;
          for (let i = 0; i < engines.length; i++) {
            const engine = engines[i];
            if (engine && typeof engine.dispose === 'function') {
              try {
                engine.dispose();
              } catch (e) {
                // Ignore errors during cleanup
              }
            }
          }
          engines.length = 0;
        }
        
        // Restore original console.error
        console.error = originalConsoleError;
      }
    } catch (e) {
      console.warn('Error with Babylon engine cleanup:', e);
    }

    onTabChange(tabId);
    setActiveTab(tabId);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'object':
        return (
          <div className="p-4 overflow-y-auto h-full flex flex-col gap-4">
            {/* Add Shape Section */}
            <div className="bg-sphaire-dark-lighter p-4 rounded-lg border border-sphaire-purple-light border-opacity-30 shadow-purple-glow">
              <h3 className="text-md font-medium text-sphaire-pink-light mb-3">Add Shape</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-sphaire-purple-light mb-2">Shape Type</label>
                  <CustomDropdown
                    options={shapeOptions}
                    value={selectedShapeType}
                    onChange={setSelectedShapeType}
                    placeholder="Select a shape..."
                    className="w-full"
                    variant="default"
                    size="md"
                  />
                </div>
              
                <div>
                  <label className="block text-sm text-sphaire-pink-light mb-1">Position</label>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs text-sphaire-purple-light mb-1">X</label>
                      <input type="number" className="w-full bg-sphaire-dark border border-sphaire-purple-light border-opacity-50 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-sphaire-pink-light text-sm" step="0.1" defaultValue="0" ref={posXRef} />
                    </div>
                    <div>
                      <label className="block text-xs text-sphaire-purple-light mb-1">Y</label>
                      <input type="number" className="w-full bg-sphaire-dark border border-sphaire-purple-light border-opacity-50 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-sphaire-pink-light text-sm" step="0.1" defaultValue="1" ref={posYRef} />
                    </div>
                    <div>
                      <label className="block text-xs text-sphaire-purple-light mb-1">Z</label>
                      <input type="number" className="w-full bg-sphaire-dark border border-sphaire-purple-light border-opacity-50 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-sphaire-pink-light text-sm" step="0.1" defaultValue="0" ref={posZRef} />
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm text-sphaire-pink-light mb-1">Rotation</label>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs text-sphaire-purple-light mb-1">X</label>
                      <input type="number" className="w-full bg-sphaire-dark border border-sphaire-purple-light border-opacity-50 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-sphaire-pink-light text-sm" step="1" defaultValue="0" ref={rotXRef} />
                    </div>
                    <div>
                      <label className="block text-xs text-sphaire-purple-light mb-1">Y</label>
                      <input type="number" className="w-full bg-sphaire-dark border border-sphaire-purple-light border-opacity-50 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-sphaire-pink-light text-sm" step="1" defaultValue="0" ref={rotYRef} />
                    </div>
                    <div>
                      <label className="block text-xs text-sphaire-purple-light mb-1">Z</label>
                      <input type="number" className="w-full bg-sphaire-dark border border-sphaire-purple-light border-opacity-50 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-sphaire-pink-light text-sm" step="1" defaultValue="0" ref={rotZRef} />
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm text-sphaire-pink-light mb-1">Scale</label>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs text-sphaire-purple-light mb-1">X</label>
                      <input type="number" className="w-full bg-sphaire-dark border border-sphaire-purple-light border-opacity-50 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-sphaire-pink-light text-sm" step="0.1" defaultValue="1.0" ref={scaleXRef} />
                    </div>
                    <div>
                      <label className="block text-xs text-sphaire-purple-light mb-1">Y</label>
                      <input type="number" className="w-full bg-sphaire-dark border border-sphaire-purple-light border-opacity-50 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-sphaire-pink-light text-sm" step="0.1" defaultValue="1.0" ref={scaleYRef} />
                    </div>
                    <div>
                      <label className="block text-xs text-sphaire-purple-light mb-1">Z</label>
                      <input type="number" className="w-full bg-sphaire-dark border border-sphaire-purple-light border-opacity-50 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-sphaire-pink-light text-sm" step="0.1" defaultValue="1.0" ref={scaleZRef} />
                    </div>
                  </div>
                </div>
                
                <button 
                  className="w-full bg-sphaire-dark hover:bg-sphaire-purple-dark text-sphaire-pink-light border border-sphaire-purple-light hover:border-sphaire-pink-light rounded-md py-2 px-4 flex items-center justify-center mt-4 transition-all duration-300 shadow-purple-glow-sm hover:shadow-pink-glow-sm"
                  onClick={handleAddShape}
                >
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 01-1 1h-5a1 1 0 01-1-1v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  Add Shape
                </button>
              </div>
            </div>
            
            <ObjectManager />
          </div>
        );
      case 'ai':
        return (
          <div className="h-full">
            <AIModelingPanel 
              scene={scene} // Pass the actual Babylon.js scene from the scene store
              onModelCreated={(meshes) => {
                console.log(`🤖 AI-MODELING: Created ${meshes.length} mesh(es) in scene`);
                // Additional mesh handling can be added here
              }}
              className="h-full"
            />
            
            <div className="mt-6 bg-sphaire-dark-lighter p-4 rounded-lg border border-sphaire-purple-light border-opacity-30 shadow-purple-glow-sm">
              <h4 className="text-md font-medium text-sphaire-pink-light mb-3">Quick Prompts</h4>
              <div className="space-y-2">
                <button className="w-full bg-sphaire-dark hover:bg-sphaire-purple-dark text-sphaire-purple-light hover:text-sphaire-pink-light border border-sphaire-purple-light hover:border-sphaire-pink-light rounded py-1 px-2 text-sm text-left transition-all duration-300">
                  Generate futuristic chair
                </button>
                <button className="w-full bg-sphaire-dark hover:bg-sphaire-purple-dark text-sphaire-purple-light hover:text-sphaire-pink-light border border-sphaire-purple-light hover:border-sphaire-pink-light rounded py-1 px-2 text-sm text-left transition-all duration-300">
                  Create sci-fi vehicle
                </button>
                <button className="w-full bg-sphaire-dark hover:bg-sphaire-purple-dark text-sphaire-purple-light hover:text-sphaire-pink-light border border-sphaire-purple-light hover:border-sphaire-pink-light rounded py-1 px-2 text-sm text-left transition-all duration-300">
                  Design fantasy castle
                </button>
              </div>
            </div>
          </div>
        );
      case 'edit':
        return (
          <div className="p-4 w-full">
            <h3 className="text-lg font-medium text-gradient-purple mb-4">Edit Options</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-sphaire-pink-light mb-1">Sub-Object Selection</label>
                <div className="grid grid-cols-3 gap-2">
                  <button 
                    className={`btn-secondary py-1 px-2 text-xs flex items-center justify-center ${subObjectMode === 'vertex' ? 'bg-sphaire-pink text-white' : ''}`}
                    onClick={() => setSubObjectMode('vertex')}
                  >
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4zm5-1.757l4.9-4.9a2 2 0 000-2.828L13.485 5.1a2 2 0 00-2.828 0L10 5.757v8.486zM16 18H9.071l6-6H16a2 2 0 012 2v2a2 2 0 01-2 2z" />
                    </svg>
                    Vertex
                  </button>
                  <button 
                    className={`btn-secondary py-1 px-2 text-xs flex items-center justify-center ${subObjectMode === 'edge' ? 'bg-sphaire-pink text-white' : ''}`}
                    onClick={() => setSubObjectMode('edge')}
                  >
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                    </svg>
                    Edge
                  </button>
                  <button 
                    className={`btn-secondary py-1 px-2 text-xs flex items-center justify-center ${subObjectMode === 'face' ? 'bg-sphaire-pink text-white' : ''}`}
                    onClick={() => setSubObjectMode('face')}
                  >
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                    Face
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm text-sphaire-pink-light mb-1">Operations</label>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    className="btn-secondary py-1 px-2 text-xs flex items-center justify-center"
                    onClick={handleExtrude}
                  >
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 6.707 6.293a1 1 0 00-1.414 1.414l4 4a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Extrude
                  </button>
                  <button 
                    className="btn-secondary py-1 px-2 text-xs flex items-center justify-center"
                    onClick={handleBevel}
                  >
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                    Bevel
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm text-sphaire-pink-light mb-1">Operation Amount</label>
                <input 
                  type="range" 
                  min="0.1" 
                  max="2" 
                  step="0.1" 
                  className="w-full accent-sphaire-pink" 
                  value={operationAmount}
                  onChange={(e) => setOperationAmount(parseFloat(e.target.value))}
                />
                <div className="flex justify-between text-xs text-sphaire-purple-light">
                  <span>0.1</span>
                  <span>{operationAmount}</span>
                  <span>2.0</span>
                </div>
              </div>
              
              <div>
                <label className="flex items-center space-x-2 text-sm text-sphaire-pink-light">
                  <input 
                    type="checkbox" 
                    className="accent-sphaire-pink" 
                    checked={precisionMode}
                    onChange={(e) => setPrecisionMode(e.target.checked)}
                  />
                  <span>Precision Mode</span>
                </label>
                <p className="text-xs text-sphaire-purple-light mt-1">Enable for more accurate but slower operations</p>
              </div>
            </div>
          </div>
        );
      case 'ai-modeling':
        return (
          <div className="h-full">
            <AIModelingPanel 
              scene={scene} // Pass the actual Babylon.js scene from the scene store
              onModelCreated={(meshes) => {
                console.log(`🤖 AI-MODELING: Created ${meshes.length} mesh(es) in scene`);
                // Additional mesh handling can be added here
              }}
              className="h-full"
            />
          </div>
        );
      case 'code-editor':
        return (
          <div className="p-4 overflow-y-auto h-full flex flex-col gap-4">
            <div className="bg-sphaire-dark-lighter p-4 rounded-lg border border-sphaire-purple-light border-opacity-30 shadow-purple-glow">
              <h3 className="text-md font-medium text-sphaire-pink-light mb-3">File Management</h3>
              <div className="space-y-3">
                <button className="w-full bg-sphaire-dark hover:bg-sphaire-purple-dark text-sphaire-pink-light border border-sphaire-purple-light hover:border-sphaire-pink-light rounded-md py-2 px-4 flex items-center justify-center transition-all duration-300 shadow-purple-glow-sm hover:shadow-pink-glow-sm">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                  New File
                </button>
                <button className="w-full bg-sphaire-dark hover:bg-sphaire-purple-dark text-sphaire-purple-light border border-sphaire-purple-light hover:border-sphaire-pink-light rounded-md py-2 px-4 flex items-center justify-center transition-all duration-300">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5L7 5a2 2 0 00-2 2z" />
                  </svg>
                  Open File
                </button>
                <button className="w-full bg-sphaire-dark hover:bg-sphaire-purple-dark text-sphaire-purple-light border border-sphaire-purple-light hover:border-sphaire-pink-light rounded-md py-2 px-4 flex items-center justify-center transition-all duration-300">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 0V6a2 2 0 00-2-2H9a2 2 0 00-2 2v1m1 0h4m-4 0v3a1 1 0 001 1h2a1 1 0 001-1V8" />
                  </svg>
                  Save File
                </button>
              </div>
            </div>
            <div className="text-xs text-sphaire-purple-light/70 mt-2">
              
            </div>
          </div>
        );
      case 'texture':
        return (
          <div className="h-full overflow-y-auto">
            {/* Selected Mesh Info */}
            {selectedMesh && (
              <div className="p-3 mb-2 bg-sphaire-purple-dark/30 border-l-4 border-sphaire-pink">
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-sphaire-pink-light" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm font-medium text-sphaire-pink-light">
                    Selected: {selectedMesh.name || 'Mesh'}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Ready to apply AI-generated textures
                </p>
              </div>
            )}
            

            
            {/* AI Texture Generator */}
            <TextureGenerator
              onTextureGenerated={(url) => {
                console.log('Simple texture generated:', url);
              }}
              onPBRTextureGenerated={(textureStack: PBRTextureStack) => {
                console.log('PBR texture stack generated:', textureStack);
              }}
              scene={scene}
              selectedMeshes={selectedMeshes}
            />
          </div>
        );
      case 'lighting':
        return (
          <div className="p-4 overflow-y-auto h-full flex flex-col gap-4">
            {/* Lighting Section */}
            <div className="bg-sphaire-dark-lighter p-4 rounded-lg border border-sphaire-purple-light border-opacity-30 shadow-purple-glow">
              <h3 className="text-md font-medium text-sphaire-pink-light mb-3">Scene Lighting</h3>
              
              {/* Light Gizmo Controls */}
              <div className="bg-sphaire-dark/50 border border-sphaire-purple-light/30 rounded-lg p-3 mb-4">
                <label className="block text-sm font-medium text-sphaire-purple-light mb-2">Interactive Light Controls</label>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-sphaire-purple-light/80 mb-1">Select Light</label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => {
                          if (selectedLight === 'key') {
                            setSelectedLight(null);
                            hideLightHelpers();
                          } else {
                            setSelectedLight('key');
                            activateLightGizmo('key', gizmoMode);
                          }
                        }}
                        className={`px-2 py-1 text-xs rounded transition-colors ${
                          selectedLight === 'key'
                            ? 'bg-sphaire-pink-light text-sphaire-dark'
                            : 'bg-sphaire-dark border border-sphaire-purple-light/50 text-sphaire-purple-light hover:border-sphaire-pink-light/50'
                        }`}
                      >
                        Key Light
                      </button>
                      <button
                        onClick={() => {
                          if (selectedLight === 'fill') {
                            setSelectedLight(null);
                            hideLightHelpers();
                          } else {
                            setSelectedLight('fill');
                            activateLightGizmo('fill', gizmoMode);
                          }
                        }}
                        className={`px-2 py-1 text-xs rounded transition-colors ${
                          selectedLight === 'fill'
                            ? 'bg-sphaire-pink-light text-sphaire-dark'
                            : 'bg-sphaire-dark border border-sphaire-purple-light/50 text-sphaire-purple-light hover:border-sphaire-pink-light/50'
                        }`}
                      >
                        Fill Light
                      </button>
                      <button
                        onClick={() => {
                          if (selectedLight === 'rim') {
                            setSelectedLight(null);
                            hideLightHelpers();
                          } else {
                            setSelectedLight('rim');
                            activateLightGizmo('rim', gizmoMode);
                          }
                        }}
                        className={`px-2 py-1 text-xs rounded transition-colors ${
                          selectedLight === 'rim'
                            ? 'bg-sphaire-pink-light text-sphaire-dark'
                            : 'bg-sphaire-dark border border-sphaire-purple-light/50 text-sphaire-purple-light hover:border-sphaire-pink-light/50'
                        }`}
                      >
                        Rim Light
                      </button>
                    </div>
                  </div>
                  {selectedLight && (
                    <div>
                      <label className="block text-xs text-sphaire-purple-light/80 mb-1">Gizmo Mode</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => {
                            setGizmoMode('position');
                            if (selectedLight) {
                              activateLightGizmo(selectedLight, 'position');
                            }
                          }}
                          className={`px-2 py-1 text-xs rounded transition-colors ${
                            gizmoMode === 'position'
                              ? 'bg-sphaire-pink-light text-sphaire-dark'
                              : 'bg-sphaire-dark border border-sphaire-purple-light/50 text-sphaire-purple-light hover:border-sphaire-pink-light/50'
                          }`}
                        >
                          Move
                        </button>
                        <button
                          onClick={() => {
                            setGizmoMode('rotation');
                            if (selectedLight) {
                              activateLightGizmo(selectedLight, 'rotation');
                            }
                          }}
                          className={`px-2 py-1 text-xs rounded transition-colors ${
                            gizmoMode === 'rotation'
                              ? 'bg-sphaire-pink-light text-sphaire-dark'
                              : 'bg-sphaire-dark border border-sphaire-purple-light/50 text-sphaire-purple-light hover:border-sphaire-pink-light/50'
                          }`}
                          disabled={selectedLight === 'fill'}
                        >
                          Rotate
                        </button>
                      </div>
                      {selectedLight === 'fill' && gizmoMode === 'rotation' && (
                        <p className="text-xs text-sphaire-purple-light/60 mt-1">Fill light (hemispheric) cannot be rotated</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Key Light Controls */}
              <div className="space-y-4 mb-6">
                <h4 className="text-sm font-medium text-sphaire-purple-light">Key Light (Main)</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-sphaire-purple-light mb-1">Intensity</label>
                    <input 
                      type="range" 
                      min="0" 
                      max="3" 
                      step="0.1" 
                      value={keyLightIntensity}
                      onChange={(e) => {
                        const intensity = parseFloat(e.target.value);
                        setKeyLightIntensity(intensity);
                        updateKeyLight(intensity, hexToColor3(keyLightColor), new Vector3(keyLightDirection.x, keyLightDirection.y, keyLightDirection.z));
                      }}
                      className="w-full accent-sphaire-pink-light" 
                    />
                    <span className="text-xs text-sphaire-purple-light">{keyLightIntensity.toFixed(1)}</span>
                  </div>
                  <div>
                    <label className="block text-xs text-sphaire-purple-light mb-1">Color</label>
                    <div className="flex gap-2">
                      <input 
                        type="color" 
                        value={keyLightColor} 
                        onChange={(e) => {
                          const color = e.target.value;
                          setKeyLightColor(color);
                          updateKeyLight(keyLightIntensity, hexToColor3(color), new Vector3(keyLightDirection.x, keyLightDirection.y, keyLightDirection.z));
                        }}
                        className="w-12 h-8 rounded border border-sphaire-purple-light" 
                      />
                      <span className="text-xs text-sphaire-purple-light self-center">Warm White</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-sphaire-purple-light mb-1">Direction</label>
                    <div className="grid grid-cols-3 gap-2">
                      <input 
                        type="number" 
                        placeholder="X" 
                        value={keyLightDirection.x} 
                        step="0.1" 
                        onChange={(e) => {
                          const newDirection = { ...keyLightDirection, x: parseFloat(e.target.value) || 0 };
                          setKeyLightDirection(newDirection);
                          updateKeyLight(keyLightIntensity, hexToColor3(keyLightColor), new Vector3(newDirection.x, newDirection.y, newDirection.z));
                        }}
                        className="w-full bg-sphaire-dark border border-sphaire-purple-light border-opacity-50 rounded px-2 py-1 text-xs" 
                      />
                      <input 
                        type="number" 
                        placeholder="Y" 
                        value={keyLightDirection.y} 
                        step="0.1" 
                        onChange={(e) => {
                          const newDirection = { ...keyLightDirection, y: parseFloat(e.target.value) || 0 };
                          setKeyLightDirection(newDirection);
                          updateKeyLight(keyLightIntensity, hexToColor3(keyLightColor), new Vector3(newDirection.x, newDirection.y, newDirection.z));
                        }}
                        className="w-full bg-sphaire-dark border border-sphaire-purple-light border-opacity-50 rounded px-2 py-1 text-xs" 
                      />
                      <input 
                        type="number" 
                        placeholder="Z" 
                        value={keyLightDirection.z} 
                        step="0.1" 
                        onChange={(e) => {
                          const newDirection = { ...keyLightDirection, z: parseFloat(e.target.value) || 0 };
                          setKeyLightDirection(newDirection);
                          updateKeyLight(keyLightIntensity, hexToColor3(keyLightColor), new Vector3(newDirection.x, newDirection.y, newDirection.z));
                        }}
                        className="w-full bg-sphaire-dark border border-sphaire-purple-light border-opacity-50 rounded px-2 py-1 text-xs" 
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Fill Light Controls */}
              <div className="space-y-4 mb-6">
                <h4 className="text-sm font-medium text-sphaire-purple-light">Fill Light (Ambient)</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-sphaire-purple-light mb-1">Intensity</label>
                    <input 
                      type="range" 
                      min="0" 
                      max="1" 
                      step="0.05" 
                      value={fillLightIntensity}
                      onChange={(e) => {
                        const intensity = parseFloat(e.target.value);
                        setFillLightIntensity(intensity);
                        updateFillLight(intensity, hexToColor3(fillLightColor));
                      }}
                      className="w-full accent-sphaire-pink-light" 
                    />
                    <span className="text-xs text-sphaire-purple-light">{fillLightIntensity.toFixed(2)}</span>
                  </div>
                  <div>
                    <label className="block text-xs text-sphaire-purple-light mb-1">Color</label>
                    <div className="flex gap-2">
                      <input 
                        type="color" 
                        value={fillLightColor} 
                        onChange={(e) => {
                          const color = e.target.value;
                          setFillLightColor(color);
                          updateFillLight(fillLightIntensity, hexToColor3(color));
                        }}
                        className="w-12 h-8 rounded border border-sphaire-purple-light" 
                      />
                      <span className="text-xs text-sphaire-purple-light self-center">Cool Fill</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Rim Light Controls */}
              <div className="space-y-4 mb-6">
                <h4 className="text-sm font-medium text-sphaire-purple-light">Rim Light (Accent)</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-sphaire-purple-light mb-1">Intensity</label>
                    <input 
                      type="range" 
                      min="0" 
                      max="2" 
                      step="0.1" 
                      value={rimLightIntensity}
                      onChange={(e) => {
                        const intensity = parseFloat(e.target.value);
                        setRimLightIntensity(intensity);
                        updateRimLight(intensity, hexToColor3(rimLightColor), new Vector3(rimLightDirection.x, rimLightDirection.y, rimLightDirection.z));
                      }}
                      className="w-full accent-sphaire-pink-light" 
                    />
                    <span className="text-xs text-sphaire-purple-light">{rimLightIntensity.toFixed(1)}</span>
                  </div>
                  <div>
                    <label className="block text-xs text-sphaire-purple-light mb-1">Color</label>
                    <div className="flex gap-2">
                      <input 
                        type="color" 
                        value={rimLightColor} 
                        onChange={(e) => {
                          const color = e.target.value;
                          setRimLightColor(color);
                          updateRimLight(rimLightIntensity, hexToColor3(color), new Vector3(rimLightDirection.x, rimLightDirection.y, rimLightDirection.z));
                        }}
                        className="w-12 h-8 rounded border border-sphaire-purple-light" 
                      />
                      <span className="text-xs text-sphaire-purple-light self-center">Subtle Rim</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-sphaire-purple-light mb-1">Direction</label>
                    <div className="grid grid-cols-3 gap-2">
                      <input 
                        type="number" 
                        placeholder="X" 
                        value={rimLightDirection.x} 
                        step="0.1" 
                        onChange={(e) => {
                          const newDirection = { ...rimLightDirection, x: parseFloat(e.target.value) || 0 };
                          setRimLightDirection(newDirection);
                          updateRimLight(rimLightIntensity, hexToColor3(rimLightColor), new Vector3(newDirection.x, newDirection.y, newDirection.z));
                        }}
                        className="w-full bg-sphaire-dark border border-sphaire-purple-light border-opacity-50 rounded px-2 py-1 text-xs" 
                      />
                      <input 
                        type="number" 
                        placeholder="Y" 
                        value={rimLightDirection.y} 
                        step="0.1" 
                        onChange={(e) => {
                          const newDirection = { ...rimLightDirection, y: parseFloat(e.target.value) || 0 };
                          setRimLightDirection(newDirection);
                          updateRimLight(rimLightIntensity, hexToColor3(rimLightColor), new Vector3(newDirection.x, newDirection.y, newDirection.z));
                        }}
                        className="w-full bg-sphaire-dark border border-sphaire-purple-light border-opacity-50 rounded px-2 py-1 text-xs" 
                      />
                      <input 
                        type="number" 
                        placeholder="Z" 
                        value={rimLightDirection.z} 
                        step="0.1" 
                        onChange={(e) => {
                          const newDirection = { ...rimLightDirection, z: parseFloat(e.target.value) || 0 };
                          setRimLightDirection(newDirection);
                          updateRimLight(rimLightIntensity, hexToColor3(rimLightColor), new Vector3(newDirection.x, newDirection.y, newDirection.z));
                        }}
                        className="w-full bg-sphaire-dark border border-sphaire-purple-light border-opacity-50 rounded px-2 py-1 text-xs" 
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Preset & Actions */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-sphaire-purple-light mb-2">Lighting Presets</label>
                  <CustomDropdown
                    options={[
                      { value: 'studio', label: 'Studio Lighting', description: 'Professional 3-point setup' },
                      { value: 'natural', label: 'Natural Light', description: 'Soft daylight simulation' },
                      { value: 'dramatic', label: 'Dramatic', description: 'High contrast lighting' },
                      { value: 'soft', label: 'Soft Ambient', description: 'Even, diffused lighting' },
                      { value: 'custom', label: 'Custom', description: 'Manual control' }
                    ]}
                    value={selectedLightingPreset}
                    onChange={(presetName) => {
                      setSelectedLightingPreset(presetName);
                      if (presetName !== 'custom') {
                        applyLightingPreset(presetName as keyof typeof lightingPresets);
                        // Update local state to match preset values
                        const preset = lightingPresets[presetName as keyof typeof lightingPresets];
                        if (preset) {
                          setKeyLightIntensity(preset.keyLight.intensity);
                          setKeyLightColor(color3ToHex(preset.keyLight.color));
                          setKeyLightDirection({ x: preset.keyLight.direction.x, y: preset.keyLight.direction.y, z: preset.keyLight.direction.z });
                          setFillLightIntensity(preset.fillLight.intensity);
                          setFillLightColor(color3ToHex(preset.fillLight.color));
                          setRimLightIntensity(preset.rimLight.intensity);
                          setRimLightColor(color3ToHex(preset.rimLight.color));
                          setRimLightDirection({ x: preset.rimLight.direction.x, y: preset.rimLight.direction.y, z: preset.rimLight.direction.z });
                        }
                      }
                    }}
                    className="w-full"
                  />
                </div>
                
                <button className="w-full bg-sphaire-dark hover:bg-sphaire-purple-dark text-sphaire-pink-light border border-sphaire-purple-light hover:border-sphaire-pink-light rounded-md py-2 px-4 flex items-center justify-center transition-all duration-300 shadow-purple-glow-sm hover:shadow-pink-glow-sm">
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" />
                  </svg>
                  Apply Lighting
                </button>
              </div>
            </div>
          </div>
        );
      case 'render-camera':
        return (
          <div className="p-4 overflow-y-auto h-full flex flex-col gap-4">
            {/* Camera Setup Section */}
            <div className="bg-sphaire-dark-lighter p-4 rounded-lg border border-sphaire-purple-light border-opacity-30 shadow-purple-glow">
              <h3 className="text-md font-medium text-sphaire-pink-light mb-3">Camera Setup</h3>
              <div className="space-y-3">
                <button 
                  onClick={renderCameraActions.addCameraToScene}
                  disabled={renderCameraState.isActive}
                  className={`w-full ${renderCameraState.isActive ? 'bg-green-600 text-white cursor-not-allowed' : 'bg-sphaire-dark hover:bg-sphaire-purple-dark text-sphaire-pink-light hover:border-sphaire-pink-light'} border border-sphaire-purple-light rounded-md py-2 px-4 flex items-center justify-center transition-all duration-300 shadow-purple-glow-sm hover:shadow-pink-glow-sm`}
                >
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v6a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586l-.707-.707A1 1 0 0013 4H7a1 1 0 00-.707.293L5.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                  </svg>
                  {renderCameraState.isActive ? '✓ Camera Active' : 'Add Camera to Scene'}
                </button>
                
                <div className="text-xs text-sphaire-purple-light">
                  Creates a moveable camera cuboid in your scene with live preview
                </div>
              </div>
            </div>
            
            {/* Camera Settings Section */}
            <div className="bg-sphaire-dark-lighter p-4 rounded-lg border border-sphaire-purple-light border-opacity-30 shadow-purple-glow">
              <h3 className="text-md font-medium text-sphaire-pink-light mb-3">Camera Settings</h3>
              <div className="space-y-4">
                {/* Field of View */}
                <div>
                  <label className="block text-sm text-sphaire-purple-light mb-2">Field of View</label>
                  <input 
                    type="range" 
                    min="10" 
                    max="120" 
                    step="5" 
                    value={renderCameraState.fieldOfView}
                    onChange={(e) => renderCameraActions.setFieldOfView(parseInt(e.target.value))}
                    className="w-full accent-sphaire-pink-light" 
                  />
                  <div className="flex justify-between text-xs text-sphaire-purple-light mt-1">
                    <span>10°</span>
                    <span>{renderCameraState.fieldOfView}°</span>
                    <span>120°</span>
                  </div>
                </div>
                
                {/* Viewport Preview Toggle */}
                <div className="flex items-center justify-between">
                  <label className="text-sm text-sphaire-purple-light">Live Preview</label>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={renderCameraState.previewEnabled}
                      onChange={(e) => renderCameraActions.setPreviewEnabled(e.target.checked)}
                      className="sr-only peer" 
                    />
                    <div className="w-11 h-6 bg-sphaire-dark rounded-full peer peer-focus:ring-2 peer-focus:ring-sphaire-pink-light peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sphaire-pink-light"></div>
                  </label>
                </div>
              </div>
            </div>
            
            {/* Render Quality Section */}
            <div className="bg-sphaire-dark-lighter p-4 rounded-lg border border-sphaire-purple-light border-opacity-30 shadow-purple-glow">
              <h3 className="text-md font-medium text-sphaire-pink-light mb-3">Render Quality</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-sphaire-purple-light mb-2">Resolution Preset</label>
                  <CustomDropdown
                    options={[
                      { value: 'hd', label: 'HD (1280 × 720)', description: '720p resolution' },
                      { value: 'fhd', label: 'Full HD (1920 × 1080)', description: '1080p resolution' },
                      { value: 'qhd', label: 'QHD (2560 × 1440)', description: '1440p resolution' },
                      { value: '4k', label: '4K (3840 × 2160)', description: '2160p resolution' },
                      { value: 'custom', label: 'Custom', description: 'Custom resolution' }
                    ]}
                    value={selectedResolution}
                    onChange={(value) => {
                      setSelectedResolution(value);
                      const resolutions = {
                        'hd': { width: 1280, height: 720 },
                        'fhd': { width: 1920, height: 1080 },
                        'qhd': { width: 2560, height: 1440 },
                        '4k': { width: 3840, height: 2160 },
                        'custom': { width: 1920, height: 1080 }
                      };
                      const res = resolutions[value as keyof typeof resolutions];
                      renderCameraActions.setResolution(res.width, res.height);
                    }}
                    placeholder="Select resolution..."
                    className="w-full"
                    variant="default"
                    size="md"
                  />
                </div>
                
                {/* Anti-aliasing */}
                <div className="flex items-center justify-between">
                  <label className="text-sm text-sphaire-purple-light">Anti-aliasing</label>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-11 h-6 bg-sphaire-dark rounded-full peer peer-focus:ring-2 peer-focus:ring-sphaire-pink-light peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sphaire-pink-light"></div>
                  </label>
                </div>
              </div>
            </div>
            
            {/* Render Actions Section */}
            <div className="bg-sphaire-dark-lighter p-4 rounded-lg border border-sphaire-purple-light border-opacity-30 shadow-purple-glow">
              <h3 className="text-md font-medium text-sphaire-pink-light mb-3">Render</h3>
              <div className="space-y-3">
                <button 
                  onClick={async () => {
                    try {
                      console.log('🎬 UI: Starting capture process...');
                      const dataUrl = await renderCameraActions.captureHighQualityRender();
                      
                      if (dataUrl && dataUrl.length > 0) {
                        console.log('🎬 UI: Got dataUrl, starting download...');
                        const filename = `render-${Date.now()}.png`;
                        renderCameraActions.saveImage(dataUrl, filename);
                        console.log(`🎬 UI: Download initiated for ${filename}`);
                      } else {
                        console.error('🎬 UI: Capture failed - no data returned');
                        alert('Capture failed - please try again');
                      }
                    } catch (error) {
                      console.error('🎬 UI: Capture error:', error);
                      alert('Error during capture - please try again');
                    }
                  }}
                  disabled={!renderCameraState.isActive}
                  className={`w-full ${!renderCameraState.isActive ? 'opacity-50 cursor-not-allowed' : ''} bg-gradient-to-r from-sphaire-pink-light to-sphaire-purple-light hover:from-sphaire-pink-dark hover:to-sphaire-purple-dark text-white font-medium border-0 rounded-md py-3 px-4 flex items-center justify-center transition-all duration-300 shadow-pink-glow hover:shadow-pink-glow-lg`}
                >
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                  </svg>
                  Capture High-Quality Render
                </button>
                
                <button 
                  onClick={() => {
                    // Force restore to main camera view
                    const { scene } = useSceneStore.getState();
                    if (scene && scene.cameras && scene.cameras.length > 0) {
                      // Find the main camera (not our render camera)
                      const mainCamera = scene.cameras.find(cam => cam.name !== 'renderCamera');
                      if (mainCamera) {
                        scene.activeCamera = mainCamera;
                        console.log('🎬 Forced exit from render camera view');
                      }
                    }
                  }}
                  className="w-full bg-sphaire-dark hover:bg-sphaire-purple-dark text-sphaire-pink-light border border-sphaire-purple-light hover:border-sphaire-pink-light rounded-md py-2 px-4 flex items-center justify-center transition-all duration-300 shadow-purple-glow-sm hover:shadow-pink-glow-sm"
                >
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  Exit Camera View
                </button>
                
                <div className="text-xs text-sphaire-purple-light mt-2">
                  Position your camera, adjust settings, then capture your scene in high quality
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`flex h-full ${sidebarMode === 'expanded' ? 'w-80' : 'w-16'} bg-gradient-to-b from-sphaire-dark to-sphaire-purple-dark border-r border-sphaire-purple-light border-opacity-30 transition-all duration-300 shadow-purple-glow-sm`}>
      {/* Sidebar tabs */}
      <div className="w-16 bg-sphaire-dark pt-2 flex flex-col justify-between border-r border-sphaire-purple-light border-opacity-20">
        <div>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`w-full aspect-square p-2 flex items-center justify-center group ${activeTab === tab.id ? 'bg-sphaire-purple-dark text-sphaire-pink-light shadow-pink-glow-sm' : 'text-sphaire-purple-light hover:text-sphaire-pink-light hover:bg-sphaire-purple-dark/50'}`}
              title={tab.name}
            >
              {tab.icon}
              {sidebarMode === 'compact' && activeTab === tab.id && (
                <span className="absolute left-16 bg-sphaire-purple-dark text-sphaire-pink-light text-xs px-2 py-1 rounded whitespace-nowrap border border-sphaire-pink-light border-opacity-30 shadow-pink-glow-sm">
                  {tab.name}
                </span>
              )}
            </button>
          ))}
        </div>
        
        {/* Toggle sidebar mode button */}
        <button 
          onClick={toggleSidebarMode}
          className="w-full aspect-square p-2 flex items-center justify-center group text-white hover:bg-sphaire-purple-dark/50 mt-auto mb-4"
          title={sidebarMode === 'expanded' ? 'Collapse Sidebar' : 'Expand Sidebar'}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            {sidebarMode === 'expanded' ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            )}
          </svg>
        </button>
      </div>

      {/* Tab content - hidden in compact mode */}
      {sidebarMode === 'expanded' && (
        <div className="flex-grow overflow-y-auto custom-scrollbar w-64 min-w-64">
          {renderTabContent()}
        </div>
      )}
    </div>
  );
};

export default Sidebar;
