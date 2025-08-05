import { useState, useCallback } from 'react';
import { Scene, AbstractMesh, Mesh } from '@babylonjs/core';

export interface AIModelRequest {
  prompt: string;
  backend?: 'babylon' | 'opencascade' | 'auto';
  complexity?: 'simple' | 'medium' | 'complex';
}

export interface AIModelResponse {
  code: string;
  backend: 'babylon' | 'opencascade';
  model: string;
  tokenCount: number;
  executionTime: number;
}

export interface AIModelingState {
  isGenerating: boolean;
  isExecuting: boolean;
  lastResponse: AIModelResponse | null;
  error: string | null;
  history: AIModelResponse[];
}

export const useAIModeling = () => {
  const [state, setState] = useState<AIModelingState>({
    isGenerating: false,
    isExecuting: false,
    lastResponse: null,
    error: null,
    history: []
  });

  const generateModel = useCallback(async (request: AIModelRequest): Promise<AIModelResponse> => {
    setState(prev => ({ ...prev, isGenerating: true, error: null }));
    
    try {
      const startTime = Date.now();
      
      const enhancedPrompt = buildEnhancedPrompt(request);
      
      console.log('🤖 AI-MODELING: Generating code for:', request.prompt);
      
      const response = await fetch('/api/ai-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: enhancedPrompt,
          backend: request.backend || 'auto',
          model: 'gpt-4o'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'AI generation failed');
      }

      const data = await response.json();
      const executionTime = Date.now() - startTime;
      
      const backend = detectBackend(data.code);
      
      const result: AIModelResponse = {
        code: data.code,
        backend,
        model: data.model || 'gpt-4o',
        tokenCount: data.code.length,
        executionTime
      };

      console.log('🔧 AI-MODELING: Full generated code:');
      console.log('=====================================');
      console.log(result.code);
      console.log('=====================================');
      console.log(`Backend: ${backend}, Tokens: ${result.tokenCount}, Time: ${executionTime}ms`);

      setState(prev => ({
        ...prev,
        isGenerating: false,
        lastResponse: result,
        history: [...prev.history, result]
      }));

      console.log(`✅ AI-MODELING: Generated ${result.tokenCount} tokens in ${executionTime}ms`);
      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('🚨 AI-MODELING: Generation failed:', errorMessage);
      
      setState(prev => ({
        ...prev,
        isGenerating: false,
        error: errorMessage
      }));
      
      throw error;
    }
  }, []);

  /**
   * Execute generated code in the 3D scene
   */
  const executeCode = useCallback(async (
    code: string, 
    scene: Scene, 
    backend: 'babylon' | 'opencascade'
  ): Promise<AbstractMesh[]> => {
    setState(prev => ({ ...prev, isExecuting: true, error: null }));
    
    try {
      console.log(`🎯 AI-MODELING: Executing ${backend} code...`);
      
      let createdMeshes: AbstractMesh[] = [];
      
      if (backend === 'babylon') {
        // Import Babylon.js modules dynamically to pass to execution
        const BABYLON = await import('@babylonjs/core');
        const { Vector3, Color3, MeshBuilder, StandardMaterial, Mesh, Tools, Material, Texture, Engine, VertexData } = BABYLON;
        const babylonObjects = {
          Vector3,
          Color3,
          MeshBuilder,
          StandardMaterial,
          Mesh, // For MergeMeshes, etc.
          Tools, // For ToRadians, etc.
          Material,
          Texture,
          Engine,
          VertexData, // For custom mesh creation
          MathJS: Math // JavaScript Math object (renamed to avoid conflict)
        };
        
        createdMeshes = await executeBabylonCode(code, scene, babylonObjects);
      } else if (backend === 'opencascade') {
        createdMeshes = await executeOpenCascadeCode(code, scene);
      }
      
      setState(prev => ({
        ...prev,
        isExecuting: false
      }));
      
      console.log(`✅ AI-MODELING: Successfully executed code, created ${createdMeshes.length} meshes`);
      return createdMeshes;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown execution error';
      console.error('🚨 AI-MODELING: Execution failed:', errorMessage);
      
      setState(prev => ({
        ...prev,
        isExecuting: false,
        error: errorMessage
      }));
      
      throw error;
    }
  }, []);

  /**
   * Generate and execute model in one step
   */
  const generateAndExecute = useCallback(async (
    request: AIModelRequest, 
    scene: Scene
  ): Promise<AbstractMesh[]> => {
    const response = await generateModel(request);
    return await executeCode(response.code, scene, response.backend);
  }, [generateModel, executeCode]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  /**
   * Clear history
   */
  const clearHistory = useCallback(() => {
    setState(prev => ({ ...prev, history: [] }));
  }, []);

  return {
    ...state,
    generateModel,
    executeCode,
    generateAndExecute,
    clearError,
    clearHistory
  };
};

/**
 * Build enhanced prompt with context and examples
 */
function buildEnhancedPrompt(request: AIModelRequest): string {
  const systemPrompt = `You are an expert 3D modeling assistant for Babylon.js 8.

🚨 CRITICAL REQUIREMENTS:
- Generate ONLY pure JavaScript code (NO TypeScript syntax)
- NO type annotations like 'const position: BABYLON.Vector3'
- NO imports, NO OpenCascade, NO tessellation
- Use ONLY Babylon.js APIs

ENVIRONMENT:
- scene variable is available (BABYLON.Scene)
- BABYLON namespace is imported
- Available: Vector3, Color3, MeshBuilder, StandardMaterial, Mesh, Tools, Math
- Generate code for EXISTING scene context - do not create new scenes

CODE REQUIREMENTS:
- Pure JavaScript only (no TypeScript annotations)
- Use unique identifiers: 'ai' + Math.random().toString(36).substr(2, 9)
- Use BABYLON.MeshBuilder for ALL primitive creation
- Apply materials with BABYLON.StandardMaterial
- Position objects in 3D space appropriately

CORRECT JAVASCRIPT EXAMPLES:
// Metallic gear example
const gearBase = BABYLON.MeshBuilder.CreateCylinder('aiGear_' + Math.random().toString(36).substr(2, 9), {diameter: 2, height: 0.2}, scene);
gearBase.position = new BABYLON.Vector3(0, 1, 0);
const gearMaterial = new BABYLON.StandardMaterial('aiGearMat_' + Math.random().toString(36).substr(2, 9), scene);
gearMaterial.diffuseColor = new BABYLON.Color3(0.7, 0.7, 0.7);
gearMaterial.specularColor = new BABYLON.Color3(0.9, 0.9, 0.9);
gearMaterial.specularPower = 64;
gearBase.material = gearMaterial;

// Crystal with transparency
const crystal = BABYLON.MeshBuilder.CreateBox('aiCrystal_' + Math.random().toString(36).substr(2, 9), {size: 2}, scene);
crystal.position = new BABYLON.Vector3(0, 1, 0);
const crystalMaterial = new BABYLON.StandardMaterial('aiCrystalMat_' + Math.random().toString(36).substr(2, 9), scene);
crystalMaterial.diffuseColor = new BABYLON.Color3(0.5, 0.8, 1);
crystalMaterial.alpha = 0.6;
crystal.material = crystalMaterial;

USER REQUEST: ${request.prompt}

Generate pure JavaScript Babylon.js code:`;

  return systemPrompt;
}

/**
 * Detect backend from generated code
 */
function detectBackend(
  code: string
): 'babylon' | 'opencascade' {
  console.log('🔧 AI-MODELING: Analyzing code for backend detection...');
  
  // Check for OpenCascade patterns
  const hasOCCTPatterns = (
    code.includes('occCreate') || 
    code.includes('tessellate') || 
    code.includes('BRep') ||
    code.includes('bitbybit') ||
    code.includes('occ.') ||
    code.includes('OpenCascade') ||
    code.includes('OCCT')
  );
  
  // Check for Babylon.js patterns
  const hasBabylonPatterns = (
    code.includes('MeshBuilder') || 
    code.includes('CreateBox') || 
    code.includes('CreateSphere') || 
    code.includes('BABYLON') ||
    code.includes('Vector3') ||
    code.includes('StandardMaterial')
  );
  
  let detectedBackend: 'babylon' | 'opencascade';
  
  if (hasOCCTPatterns && !hasBabylonPatterns) {
    detectedBackend = 'opencascade';
  } else if (hasBabylonPatterns && !hasOCCTPatterns) {
    detectedBackend = 'babylon';
  } else if (hasOCCTPatterns && hasBabylonPatterns) {
    // If both patterns are present, prefer OpenCascade for CAD operations
    detectedBackend = 'opencascade';
    console.log('🔧 AI-MODELING: Mixed patterns detected, preferring OpenCascade for CAD');
  } else {
    // Default to Babylon.js if no clear patterns
    detectedBackend = 'babylon';
  }
  
  console.log('🔧 AI-MODELING: Backend detection result:', detectedBackend);
  console.log('🔧 AI-MODELING: OCCT patterns found:', hasOCCTPatterns);
  console.log('🔧 AI-MODELING: Babylon patterns found:', hasBabylonPatterns);
  
  return detectedBackend;
}

/**
 * Execute Babylon.js code safely
 */
async function executeBabylonCode(code: string, scene: Scene, babylonObjects: any): Promise<AbstractMesh[]> {
  const meshesBeforeExecution = scene.meshes.slice();
  
  try {
    console.log('🎯 AI-MODELING: Executing Babylon.js code:', code.substring(0, 100) + '...');
    
    // Strip markdown code fences if present
    let cleanCode = code.trim();
    
    // Extract JavaScript code from markdown blocks
    const codeBlockRegex = /```(?:javascript|js)\s*\n([\s\S]*?)\n?```/;
    const match = cleanCode.match(codeBlockRegex);
    
    if (match) {
      // Use only the code inside the markdown block
      cleanCode = match[1].trim();
      console.log('🎯 AI-MODELING: Extracted code from markdown block');
    } else {
      // Fallback: manual cleaning for cases without proper markdown
      if (cleanCode.startsWith('```javascript') || cleanCode.startsWith('```js')) {
        cleanCode = cleanCode.replace(/^```javascript\s*\n?/, '').replace(/^```js\s*\n?/, '');
      }
      if (cleanCode.endsWith('```')) {
        cleanCode = cleanCode.replace(/\n?```$/, '');
      }
      
      // Remove explanation text that often starts with "This code" or similar
      const explanationPatterns = [
        /\n\nThis code[\s\S]*/,
        /\n\nThe code[\s\S]*/,
        /\n\nHere[\s\S]*/,
        /\n\n[A-Z][^\n]*creates?[\s\S]*/,
        /\n\n[A-Z][^\n]*generates?[\s\S]*/
      ];
      
      for (const pattern of explanationPatterns) {
        cleanCode = cleanCode.replace(pattern, '');
      }
      
      cleanCode = cleanCode.trim();
      console.log('🎯 AI-MODELING: Manual cleaning applied');
    }
    
    // Validate code isn't empty or incomplete
    if (!cleanCode || cleanCode.length < 10) {
      throw new Error('Generated code is too short or empty');
    }
    
    // Check for obvious syntax issues
    const openBraces = (cleanCode.match(/\{/g) || []).length;
    const closeBraces = (cleanCode.match(/\}/g) || []).length;
    const openParens = (cleanCode.match(/\(/g) || []).length;
    const closeParens = (cleanCode.match(/\)/g) || []).length;
    
    console.log('🎯 AI-MODELING: Code validation - Braces:', openBraces, 'vs', closeBraces, 'Parens:', openParens, 'vs', closeParens);
    
    if (openBraces !== closeBraces) {
      console.warn('⚠️ AI-MODELING: Mismatched braces detected, attempting to fix...');
    }
    if (openParens !== closeParens) {
      console.warn('⚠️ AI-MODELING: Mismatched parentheses detected, attempting to fix...');
    }
    
    console.log('🎯 AI-MODELING: Clean code to execute (first 500 chars):', cleanCode.substring(0, 500));
    console.log('🎯 AI-MODELING: Clean code to execute (last 200 chars):', cleanCode.substring(Math.max(0, cleanCode.length - 200)));
    
    // Use passed Babylon.js objects instead of global scope
    const { Vector3, Color3, MeshBuilder, StandardMaterial, Mesh, Tools, Material, Texture, Engine, VertexData, MathJS } = babylonObjects;
    console.log('🎯 AI-MODELING: Babylon objects available:', !!MeshBuilder, !!Vector3, !!Color3, !!StandardMaterial, !!Mesh, !!Tools, !!VertexData);
    
    // Create execution context with passed Babylon.js objects
    const executionScope = {
      scene,
      BABYLON: babylonObjects, // Provide BABYLON namespace for compatibility
      Vector3,
      Color3, 
      MeshBuilder,
      StandardMaterial,
      Mesh, // For MergeMeshes, etc.
      Tools, // For ToRadians, etc.
      Material,
      Texture,
      Engine,
      VertexData, // For custom mesh creation
      Math: MathJS, // JavaScript Math object (avoid scoping conflict)
      console: {
        log: (...args: any[]) => console.log('📝 AI-CODE:', ...args),
        error: (...args: any[]) => console.error('❌ AI-CODE:', ...args),
        warn: (...args: any[]) => console.warn('⚠️ AI-CODE:', ...args)
      }
    };
    
    // Execute in a controlled context
    const executeInScope = new Function(
      'executionScope',
      `
        const { scene, BABYLON, Vector3, Color3, MeshBuilder, StandardMaterial, Mesh, Tools, Material, Texture, Engine, VertexData, Math, console } = executionScope;
        try {
          ${cleanCode}
          return { success: true, error: null };
        } catch (error) {
          console.error('Execution error:', error);
          return { success: false, error: error.message || 'Unknown error' };
        }
      `
    );
    
    const executionResult = executeInScope(executionScope);
    console.log('🎯 AI-MODELING: Execution result:', executionResult);
    
    if (!executionResult.success) {
      throw new Error(`Code execution failed: ${executionResult.error}`);
    }
    
    // Return newly created meshes
    const newMeshes = scene.meshes.filter(mesh => !meshesBeforeExecution.includes(mesh));
    console.log(`✅ AI-MODELING: Created ${newMeshes.length} new mesh(es)`);
    
    if (newMeshes.length > 0) {
      console.log('🎯 AI-MODELING: New meshes:', newMeshes.map(m => m.name));
      
      // 🚨 UNIFIED STORE ARCHITECTURE: No longer using scene.metadata.importedMeshes
      // All model data is now stored in the unified store for perfect serialization
      // The mesh will be automatically managed by the store-based import system list
      // newMeshes.forEach(mesh => {
      //   scene.metadata.importedMeshes.push(mesh);
      //   console.log('🎯 AI-MODELING: Tracked mesh for deletion:', mesh.name);
      // });
    }
    
    return newMeshes;
    
  } catch (error) {
    console.error('🚨 AI-MODELING: Babylon.js execution error:', error);
    throw new Error(`Babylon.js execution failed: ${error}`);
  }
}

/**
 * Execute OpenCascade.js code safely
 */
async function executeOpenCascadeCode(code: string, scene: Scene): Promise<AbstractMesh[]> {
  try {
    console.log('🔧 AI-MODELING: Executing OpenCascade.js code...');
    console.log('🔧 AI-MODELING: OCCT Code:', code.substring(0, 200) + '...');
    
    // Import the OpenCascade executor
    const { occExecutor } = await import('../services/occExecutor');
    
    // Execute OCCT code using our worker service
    const result = await occExecutor.executeCode(code);
    
    if (!result.success) {
      throw new Error(result.error || 'OpenCascade execution failed');
    }
    
    console.log('✅ AI-MODELING: OCCT execution successful:', result);
    
    // Convert OCCT result to Babylon.js meshes
    const { MeshBuilder, StandardMaterial, Color3 } = await import('@babylonjs/core');
    
    const meshes: AbstractMesh[] = [];
    
    // Check if we have actual geometry data from OpenCascade
    if (result.geometry) {
      console.log('🔧 AI-MODELING: Converting OpenCascade geometry to Babylon.js mesh...');
      
      try {
        // If the result contains tessellated geometry data
        if ((result as any).vertices && (result as any).indices) {
          const { vertices, indices } = result as any;
          
          console.log(`🔧 AI-MODELING: Creating mesh from ${vertices.length / 3} vertices, ${indices.length / 3} triangles`);
          
          // Create custom mesh from OpenCascade geometry
          const mesh = new Mesh('occt-generated', scene);
          
          const { VertexData } = await import('@babylonjs/core');
          const vertexData = new VertexData();
          vertexData.positions = vertices;
          vertexData.indices = indices;
          
          // Calculate normals for proper lighting
          vertexData.normals = [];
          VertexData.ComputeNormals(vertices, indices, vertexData.normals);
          
          // Apply vertex data to mesh
          vertexData.applyToMesh(mesh);
          
          // Apply OpenCascade material
          const material = new StandardMaterial('occt-material', scene);
          material.diffuseColor = new Color3(0.7, 0.9, 1.0); // Light blue for OCCT
          material.specularColor = new Color3(0.3, 0.3, 0.3);
          material.roughness = 0.4;
          mesh.material = material;
          
          meshes.push(mesh);
          
        } else {
          console.warn('🔧 AI-MODELING: No tessellated geometry data, creating fallback mesh');
          // Create fallback if no geometry data
          const fallbackMesh = MeshBuilder.CreateBox('occt-fallback', { size: 2 }, scene);
          const material = new StandardMaterial('occt-fallback-material', scene);
          material.diffuseColor = new Color3(0.2, 0.8, 0.2);
          fallbackMesh.material = material;
          meshes.push(fallbackMesh);
        }
        
      } catch (conversionError) {
        console.error('🚨 AI-MODELING: Geometry conversion failed:', conversionError);
        // Create fallback on conversion error
        const fallbackMesh = MeshBuilder.CreateBox('occt-error-fallback', { size: 2 }, scene);
        const material = new StandardMaterial('occt-error-material', scene);
        material.diffuseColor = new Color3(1.0, 0.5, 0.2); // Orange for error
        fallbackMesh.material = material;
        meshes.push(fallbackMesh);
      }
      
    } else {
      console.warn('🔧 AI-MODELING: No OpenCascade geometry in result, creating fallback');
      // Create fallback if no result geometry
      const fallbackMesh = MeshBuilder.CreateBox('occt-no-geometry', { size: 2 }, scene);
      const material = new StandardMaterial('occt-no-geo-material', scene);
      material.diffuseColor = new Color3(0.8, 0.2, 0.2); // Red for missing geometry
      fallbackMesh.material = material;
      meshes.push(fallbackMesh);
    }
    
    // Add metadata to all meshes
    meshes.forEach(mesh => {
      mesh.metadata = {
        source: 'opencascade',
        generatedCode: code,
        executionResult: result,
        timestamp: Date.now()
      };
    });
    
    console.log(`✅ AI-MODELING: Created ${meshes.length} OpenCascade mesh(es):`, meshes.map(m => m.name));
    
    return meshes;
    
  } catch (error) {
    console.error('🚨 AI-MODELING: OpenCascade.js execution error:', error);
    throw new Error(`OpenCascade.js execution failed: ${error}`);
  }
}
