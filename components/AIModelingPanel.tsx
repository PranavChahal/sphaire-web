import React, { useState, useRef, useCallback } from 'react';
import { useAIModeling, AIModelRequest } from '../hooks/useAIModeling';
import useStore from '../store/store';
import type { Scene } from '@babylonjs/core';
import { autonomousBuild } from '../services/aiAutonomousBuilder';
import { extractParametersFromCode } from '../utils/parameterExtractor';
import { aiLogger } from '../services/aiLogger';

// Removed CustomDropdown - no longer needed with simplified UI

interface AIModelingPanelProps {
  scene: Scene | null;
  onModelCreated?: (meshes: any[]) => void;
  className?: string;
}

const AIModelingPanel: React.FC<AIModelingPanelProps> = ({
  scene,
  onModelCreated,
  className = ''
}) => {
  const {
    isGenerating,
    isExecuting,
    lastResponse,
    error,
    generateAndExecute,
    clearError,
  } = useAIModeling();
  
  // Get store functions for unified architecture
  const { addParametricShape } = useStore();

  const [prompt, setPrompt] = useState('');
  const backend = 'opencascade'; // Always use OpenCascade for precision
  const [complexity, setComplexity] = useState<'simple' | 'medium' | 'complex'>('complex'); // Default to max complexity
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // MAXIMUM POWER: Autonomous AI System
  const [autonomousMode, setAutonomousMode] = useState(true); // Enable by default for max power!
  const [autonomousStatus, setAutonomousStatus] = useState<string>('');
  
  // Meta-function system
  const [enableMetaFunctions, setEnableMetaFunctions] = useState(true); // Enabled by default
  const [generatedMetaFunctions, setGeneratedMetaFunctions] = useState<any[]>([]);
  const [showMetaFunctions, setShowMetaFunctions] = useState(false);
  
  // Skip questions toggle
  const [skipQuestions, setSkipQuestions] = useState(false); // Ask questions by default
  
  // Interactive questioning flow
  const [flowStage, setFlowStage] = useState<'input' | 'questions' | 'analyzing' | 'generating'>('input');
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const queryLoggerRef = useRef<any>(null); // Store logger across async operations

  /**
   * Start interactive questioning flow
   */
  const handleStartFlow = useCallback(async () => {
    if (!prompt.trim()) {
      alert('Please enter a model description');
      return;
    }

    if (!scene) {
      alert('Scene not ready. Please wait for the viewport to initialize.');
      return;
    }
    
    try {
      clearError();
      
      // ========================================
      // CREATE LOGGER FOR THIS QUERY
      // ========================================
      queryLoggerRef.current = aiLogger.createQueryLogger(prompt.trim());
      
      // ========================================
      // MAXIMUM POWER: AUTONOMOUS MODE
      // ========================================
      if (autonomousMode) {
        console.log('[MAXIMUM POWER] Autonomous AI Research & Build System activated!');
        
        // First, ask clarifying questions
        setFlowStage('analyzing');
        setAutonomousStatus('Generating clarifying questions...');
        
        const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY || localStorage.getItem('openai_api_key') || '';
        const { generateQuestions } = await import('@/services/aiQuestioningService');
        
        const questionResult = await generateQuestions(prompt, apiKey);
        setQuestions(questionResult.questions);
        
        console.log('Generated questions:', questionResult.questions.length);
        setFlowStage('questions');
        
        // Wait for user to answer questions, then proceed
        // (User answers will trigger handleSubmitAnswers which will call autonomousBuild)
        return;
      }
      
      // If we got here from autonomous mode with answers, proceed with autonomous build
      if (answers && Object.keys(answers).length > 0 && autonomousMode) {
        console.log('[MAXIMUM POWER] Proceeding with autonomous build using answers...');
        setAutonomousStatus('Researching object structure...');
        setFlowStage('analyzing');
        
        try {
          queryLoggerRef.current?.startGeneration();
          const result = await autonomousBuild(prompt, answers);
          
          if (result.success && result.code) {
            queryLoggerRef.current?.startExecution();
            console.log(`[MAXIMUM POWER] Autonomous build successful!`);
            console.log(`Iterations: ${result.iterations}`);
            console.log(`Custom functions: ${result.functionsGenerated.join(', ') || 'None'}`);
            
            setAutonomousStatus(`Success! ${result.iterations} iteration(s), ${result.functionsGenerated.length} custom functions`);
            setFlowStage('generating');
            
            // Execute the autonomous-generated code
            const { occMainThreadExecutor } = await import("@/services/occMainThreadExecutor");
            const meshData = await occMainThreadExecutor.executeCode(result.code);
            
            // FIX: Don't create meshes here - add directly to store
            // ViewportProduction will create the persistent meshes
            const meshDataArray = Array.isArray(meshData) ? meshData : [meshData];
            
            // Extract parameters from AI-generated code
            const { parameters: extractedParams, parameterMetadata } = extractParametersFromCode(result.code || '');
            console.log('[AI-PANEL] Extracted parameters:', extractedParams);
            
            meshDataArray.forEach((data, i) => {
              const meshName = data.name || `autonomous_${i}_${Date.now()}`;
              
              if (data.positions && data.indices) {
                addParametricShape({
                  type: 'parametric',
                  shapeType: 'custom',
                  parameters: extractedParams, // Use extracted parameters
                  constructionCode: result.code || '',
                  version: 1,
                  position: { x: 0, y: 0, z: 0 },
                  rotation: { x: 0, y: 0, z: 0 },
                  scaling: { x: 1, y: 1, z: 1 },
                  occShape: null,
                  name: meshName,
                  meshData: {
                    positions: new Float32Array(data.positions),
                    indices: new Uint32Array(data.indices)
                  },
                  // Store parameter metadata for smart slider ranges
                  metadata: parameterMetadata
                });
              }
            });
            
            console.log(`[MAXIMUM POWER] Added ${meshDataArray.length} shape(s) to store`);
            
            // ========================================
            // LOG SUCCESS - AUTONOMOUS MODE
            // ========================================
            await queryLoggerRef.current?.logSuccess({
              questions_asked: questions,
              user_answers: answers,
              generated_code: result.code,
              used_research_mode: true,
              research_iterations: result.iterations,
              mesh_created: meshDataArray.length > 0,
              vertex_count: meshDataArray[0]?.meshData?.positions?.length / 3,
              triangle_count: meshDataArray[0]?.meshData?.indices?.length / 3
            });
            
            setFlowStage('input');
            setAutonomousStatus('');
            
            return; // Exit - autonomous mode handled everything!
            
          } else {
            console.warn('[MAXIMUM POWER] Autonomous mode failed, falling back to standard flow');
            console.warn('Error:', result.error);
            setAutonomousStatus('Autonomous mode failed, using standard flow');
            // Fall through to standard flow
          }
        } catch (autoError) {
          console.error('[MAXIMUM POWER] Autonomous mode error:', autoError);
          
          // ========================================
          // LOG FAILURE - AUTONOMOUS MODE
          // ========================================
          await queryLoggerRef.current?.logFailure(autoError as Error, {
            questions_asked: questions,
            user_answers: answers,
            used_research_mode: true,
            stage: 'autonomous_generation'
          });
          
          setAutonomousStatus('Error, using standard flow');
          // Fall through to standard flow
        }
      }
      
      // ========================================
      // STANDARD FLOW (Questions + Generation)
      // ========================================
      
      // Check if we should skip questions
      if (skipQuestions) {
        console.log('Skipping questions, going directly to generation...');
        await handleDirectGenerate();
        return;
      }
      
      setFlowStage('questions');
      
      // Get API key from env or localStorage
      const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY || localStorage.getItem('openai_api_key') || '';
      
      // Import questioning service dynamically
      const { generateQuestions } = await import('@/services/aiQuestioningService');
      
      // Generate clarifying questions
      const result = await generateQuestions(prompt, apiKey);
      setQuestions(result.questions);
      
      console.log('Generated questions:', result.questions.length);
      
    } catch (error) {
      console.error('Failed to generate questions:', error);
      setFlowStage('input');
      alert('Failed to generate questions. Proceeding with direct generation...');
      handleDirectGenerate();
    }
  }, [prompt, scene, clearError, autonomousMode, onModelCreated]);
  
  /**
   * Process answers and refine prompt
   */
  const handleProceedWithAnswers = useCallback(async () => {
    try {
      setFlowStage('generating');
      
      const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY || localStorage.getItem('openai_api_key') || '';
      
      // Import services
      const { refinePrompt } = await import('@/services/aiQuestioningService');
      const { generateAssemblyPlan, generateComponentPrompt } = await import('@/services/aiMultiComponentService');
      
      // Convert answers to response format
      const responses = questions.map(q => ({
        questionId: q.id,
        answer: answers[q.id] || q.defaultValue || q.options?.[0] || ''
      }));
      
      // Refine the prompt with answers
      const refined = await refinePrompt(prompt, '', responses, apiKey);
      
      console.log('Refined prompt:', refined);
      
      // ========================================
      // META-FUNCTION SYSTEM
      // ========================================
      if (enableMetaFunctions) {
        try {
          console.log('[META-FUNC] Analyzing if meta-functions needed...');
          setFlowStage('analyzing');
          
          const { analyzeAndGenerateMetaFunctions, generateCodeWithMetaFunctions } = await import('@/services/aiMetaFunctionService');
          
          // Analyze if meta-functions are needed
          const metaAnalysis = await analyzeAndGenerateMetaFunctions(prompt, refined, apiKey);
          
          if (metaAnalysis.needsMetaFunctions && metaAnalysis.functions.length > 0) {
            console.log('[META-FUNC] Using meta-functions:', metaAnalysis.functions.length);
            console.log('📋 [META-FUNC] Reasoning:', metaAnalysis.reasoning);
            
            // Store generated meta-functions for display
            setGeneratedMetaFunctions(metaAnalysis.functions);
            setFlowStage('generating');
            
            queryLoggerRef.current?.startGeneration();
            
            // Generate code using meta-functions
            const codeWithHelpers = await generateCodeWithMetaFunctions(prompt, metaAnalysis.functions, apiKey);
            
            queryLoggerRef.current?.startExecution();
            
            console.log('[META-FUNC] Executing code with helpers directly...');
            
            // CRITICAL: Execute code DIRECTLY, don't send back to AI!
            // Import executor directly
            const { occMainThreadExecutor } = await import("@/services/occMainThreadExecutor");
            
            try {
              // Execute the code with helpers prepended
              const meshData = await occMainThreadExecutor.executeCode(codeWithHelpers);
              
              console.log('[META-FUNC] Execution successful!', meshData);
              
              // Create Babylon meshes from the result
              const { Mesh, VertexData, StandardMaterial, Color3 } = await import('@babylonjs/core');
              
              const meshDataArray = Array.isArray(meshData) ? meshData : [meshData];
              const createdMeshes = [];
              
              for (const data of meshDataArray) {
                if (data && data.positions && data.indices) {
                  const mesh = new Mesh(data.name || 'MetaFunc-Generated', scene!);
                  const vertexData = new VertexData();
                  vertexData.positions = data.positions;
                  vertexData.indices = data.indices;
                  
                  const normals: number[] = [];
                  VertexData.ComputeNormals(data.positions, data.indices, normals);
                  vertexData.normals = normals;
                  vertexData.applyToMesh(mesh);
                  
                  // Apply position if provided in component metadata
                  if ((data as any).position) {
                    mesh.position.set(
                      (data as any).position.x || 0,
                      (data as any).position.y || 0,
                      (data as any).position.z || 0
                    );
                    console.log(`[META-FUNC] Positioned ${data.name} at (${(data as any).position.x}, ${(data as any).position.y}, ${(data as any).position.z})`);
                  }
                  
                  const material = new StandardMaterial('meta-func-mat-' + Date.now(), scene!);
                  material.diffuseColor = new Color3(0.7, 0.9, 1.0);
                  material.specularColor = new Color3(0.3, 0.3, 0.3);
                  material.backFaceCulling = false;
                  material.twoSidedLighting = true;
                  mesh.material = material;
                  
                  createdMeshes.push(mesh);
                  console.log('[META-FUNC] Created mesh:', mesh.name);
                }
              }
              
              // FIX: Dispose temporary meshes immediately, then add to store
              // Store will create proper persistent meshes via ViewportProduction
              const meshDataForStore = createdMeshes.map(mesh => {
                const positions = mesh.getVerticesData('position');
                const indices = mesh.getIndices();
                return {
                  name: mesh.name,
                  position: { x: mesh.position.x, y: mesh.position.y, z: mesh.position.z },
                  rotation: { x: mesh.rotation.x, y: mesh.rotation.y, z: mesh.rotation.z },
                  scaling: { x: mesh.scaling.x, y: mesh.scaling.y, z: mesh.scaling.z },
                  positions: positions ? new Float32Array(positions) : null,
                  indices: indices ? new Uint32Array(indices) : null
                };
              });
              
              // Dispose temporary meshes BEFORE adding to store
              createdMeshes.forEach(mesh => {
                if (mesh && !mesh.isDisposed()) {
                  mesh.dispose();
                }
              });
              
              // Add to store - ViewportProduction will create persistent meshes
              // Extract parameters from meta-function code
              const { parameters: extractedParams2, parameterMetadata: paramMeta2 } = extractParametersFromCode(codeWithHelpers);
              console.log('[META-FUNC] Extracted parameters:', extractedParams2);
              
              meshDataForStore.forEach(data => {
                if (data.positions && data.indices) {
                  addParametricShape({
                    type: 'parametric',
                    shapeType: 'custom',
                    parameters: extractedParams2, // Use extracted parameters
                    constructionCode: codeWithHelpers,
                    version: 1,
                    position: data.position,
                    rotation: data.rotation,
                    scaling: data.scaling,
                    occShape: null,
                    name: data.name,
                    meshData: {
                      positions: data.positions,
                      indices: data.indices
                    },
                    metadata: paramMeta2 // Store parameter ranges
                  });
                }
              });
              
              console.log(`[META-FUNC] Added ${meshDataForStore.length} shapes to store (temp meshes disposed)`);
              
              // ========================================
              // LOG SUCCESS - META-FUNCTIONS
              // ========================================
              await queryLoggerRef.current?.logSuccess({
                questions_asked: questions,
                user_answers: answers,
                generated_code: codeWithHelpers,
                used_meta_functions: true,
                meta_functions: metaAnalysis.functions,
                mesh_created: meshDataForStore.length > 0,
                vertex_count: meshDataForStore[0]?.positions?.length ? meshDataForStore[0].positions.length / 3 : undefined,
                triangle_count: meshDataForStore[0]?.indices?.length ? meshDataForStore[0].indices.length / 3 : undefined
              });
              
            } catch (execError) {
              console.error('[META-FUNC] Execution failed:', execError);
              throw execError;
            }
            
            // Reset flow
            setPrompt('');
            setFlowStage('input');
            setQuestions([]);
            setAnswers({});
            
            return; // Exit early - meta-function path complete
          } else {
            console.log('[META-FUNC] No meta-functions needed, using standard flow');
            console.log('[META-FUNC] Reasoning:', metaAnalysis.reasoning);
            setGeneratedMetaFunctions([]);
          }
        } catch (metaError) {
          console.error('[META-FUNC] Meta-function analysis failed, falling back to standard flow:', metaError);
          
          // ========================================
          // LOG FAILURE - META-FUNCTIONS
          // ========================================
          await queryLoggerRef.current?.logFailure(metaError as Error, {
            questions_asked: questions,
            user_answers: answers,
            used_meta_functions: true,
            stage: 'meta_function_generation'
          });
          
          setGeneratedMetaFunctions([]);
        }
      }
      
      // ========================================
      // STANDARD FLOW (if meta-functions disabled or not needed)
      // ========================================
      setFlowStage('generating');
      
      // Check if multi-component assembly needed
      const assemblyPlan = await generateAssemblyPlan(refined, apiKey);
      
      if (assemblyPlan && assemblyPlan.components.length > 1) {
        console.log('Multi-component assembly detected:', assemblyPlan.components.length, 'components');
        
        // Generate each component separately
        for (const component of assemblyPlan.components) {
          const componentPrompt = await generateComponentPrompt(component, refined);
          
          // Generate this component
          const request: AIModelRequest = {
            prompt: componentPrompt,
            backend,
            complexity
          };
          
          await generateAndExecute(request, scene!);
          
          // Small delay between components
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } else {
        // Single component generation
        const request: AIModelRequest = {
          prompt: refined,
          backend,
          complexity
        };
        
        await generateAndExecute(request, scene!);
      }
      
      // Reset flow
      setPrompt('');
      setFlowStage('input');
      setQuestions([]);
      setAnswers({});
      
    } catch (error) {
      console.error('Generation flow failed:', error);
      
      // ========================================
      // LOG FAILURE - GENERAL ERROR
      // ========================================
      await queryLoggerRef.current?.logFailure(error as Error, {
        questions_asked: questions,
        user_answers: answers,
        stage: 'generation_flow'
      });
      
      setFlowStage('input');
    }
  }, [prompt, questions, answers, backend, complexity, scene, generateAndExecute]);
  
  /**
   * Direct generation (skip questions)
   */
  const handleDirectGenerate = useCallback(async () => {
    if (!prompt.trim() || !scene) return;

    try {
      clearError();
      setFlowStage('generating');
      
      // ========================================
      // CREATE LOGGER FOR DIRECT GENERATION
      // ========================================
      const logger = aiLogger.createQueryLogger(prompt.trim());
      logger.startGeneration();
      
      const request: AIModelRequest = {
        prompt: prompt.trim(),
        backend,
        complexity
      };

      console.log('AI-MODELING: Starting direct generation...', request);
      
      logger.startExecution();
      
      const result = await generateAndExecute(request, scene);
      const { meshes: createdMeshes, response } = result;
      
      console.log('AI-MODELING: Generation complete, adding to store...');
      
      // FIXED: Add AI-generated meshes to unified store for persistence
      if (createdMeshes && createdMeshes.length > 0 && response) {
        // Extract parameters from direct generation code
        const { parameters: extractedParams3, parameterMetadata: paramMeta3 } = extractParametersFromCode(response.code || '');
        console.log('[DIRECT-GEN] Extracted parameters:', extractedParams3);
        
        // Add each AI-generated mesh to the unified store
        createdMeshes.forEach(mesh => {
          // Extract mesh geometry data for store persistence
          const positions = mesh.getVerticesData('position');
          const indices = mesh.getIndices();
          
          if (positions && indices) {
            const meshData = {
              positions: new Float32Array(positions),
              indices: new Uint32Array(indices)
            };
            
            // Add to store as parametric shape (so it can be edited)
            const shapeId = addParametricShape({
              type: 'parametric',
              shapeType: 'custom',
              parameters: extractedParams3, // Use extracted parameters
              constructionCode: response.code, // Store the generation code
              version: 1,
              position: {
                x: mesh.position.x,
                y: mesh.position.y,
                z: mesh.position.z
              },
              rotation: {
                x: mesh.rotation.x,
                y: mesh.rotation.y,
                z: mesh.rotation.z
              },
              scaling: {
                x: mesh.scaling.x,
                y: mesh.scaling.y,
                z: mesh.scaling.z
              },
              occShape: null, // Will be recreated when needed
              name: `AI-${request.prompt.substring(0, 20)}-${Date.now()}`,
              meshData: meshData,
              metadata: paramMeta3 // Store parameter ranges
            });
            
            console.log(`Added AI mesh '${mesh.name}' to store as parametric shape: ${shapeId}`);
            
            // FIX: Dispose temporary mesh immediately - store will create persistent one
            try {
              if (mesh && !mesh.isDisposed()) {
                console.log(`Disposing temporary AI mesh: ${mesh.name}`);
                mesh.dispose();
              }
            } catch (e) {
              console.warn('Failed to dispose temporary AI mesh:', e);
            }
          }
        });
        
        console.log(`Added ${createdMeshes.length} AI-generated shapes to store - they will persist and can be edited!`);
      } else {
        console.error('Failed to add shapes to store:', { 
          hasMeshes: !!createdMeshes, 
          meshCount: createdMeshes?.length || 0,
          hasResponse: !!response 
        });
      }
      
      // Notify parent component
      if (onModelCreated) {
        onModelCreated(createdMeshes);
      }
      
      // ========================================
      // LOG SUCCESS - DIRECT GENERATION
      // ========================================
      const firstMeshVertices = createdMeshes[0]?.getVerticesData('position');
      const firstMeshIndices = createdMeshes[0]?.getIndices();
      
      await logger.logSuccess({
        generated_code: response?.code || '',
        mesh_created: createdMeshes.length > 0,
        vertex_count: firstMeshVertices ? firstMeshVertices.length / 3 : undefined,
        triangle_count: firstMeshIndices ? firstMeshIndices.length / 3 : undefined,
        skip_questions: true
      });
      
      // Clear prompt on success
      setPrompt('');
      setFlowStage('input');
      
      console.log(`AI-MODELING: Successfully created ${createdMeshes.length} mesh(es)`);
      
    } catch (error) {
      console.error('AI-MODELING: Generation failed:', error);
      
      // ========================================
      // LOG FAILURE - DIRECT GENERATION
      // ========================================
      const logger = aiLogger.createQueryLogger(prompt.trim());
      await logger.logFailure(error as Error, {
        skip_questions: true
      });
      
      // Also log to error table
      await aiLogger.logError({
        error_type: 'generation',
        error_message: (error as Error).message,
        error_stack: (error as Error).stack,
        prompt: prompt.trim(),
        stage: 'direct_generation'
      });
      
      setFlowStage('input');
    }
  }, [prompt, backend, complexity, scene, generateAndExecute, clearError, onModelCreated, addParametricShape]);

  // Removed handleExamplePrompt - no longer using quick examples

  /**
   * Handle keyboard shortcuts
   */
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      if (flowStage === 'input') {
        handleStartFlow();
      }
    }
  }, [flowStage, handleStartFlow]);

  const isProcessing = isGenerating || isExecuting || flowStage === 'generating' || flowStage === 'analyzing';

  return (
    <div className={`bg-gradient-to-br from-sphaire-dark via-sphaire-purple-dark to-sphaire-dark text-sphaire-purple-light h-full flex flex-col rounded-lg shadow-2xl ${className}`}>
      {/* Header */}
      <div className="p-5 border-b border-sphaire-purple-light/10 flex-shrink-0 bg-gradient-to-r from-sphaire-purple-dark/50 to-transparent">
        <h3 className="text-xl font-bold bg-gradient-to-r from-sphaire-pink-light to-purple-400 bg-clip-text text-transparent mb-2 tracking-tight">
          AI Designer
        </h3>
        <div className="text-xs text-sphaire-purple-light/60">
          {isProcessing && (
            <div className="flex items-center space-x-2 text-sphaire-pink-light">
              <div className="w-3 h-3 border-2 border-sphaire-pink-light border-t-transparent rounded-full animate-spin"></div>
              <span>
                {autonomousStatus ? autonomousStatus :
                 flowStage === 'questions' ? 'Preparing questions...' : 
                 flowStage === 'analyzing' ? (autonomousMode ? 'MAXIMUM POWER: Researching & Planning...' : 'Analyzing meta-functions...') : 
                 flowStage === 'generating' ? (autonomousMode ? 'MAXIMUM POWER: Building & Self-Correcting...' : 'Creating your design...') : 
                 'Processing...'}
              </span>
            </div>
          )}
          {!isProcessing && lastResponse && (
            <div className="text-green-400/80">
              Design created successfully
            </div>
          )}
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Error Display */}
        {error && (
          <div className="mx-5 mt-4 p-3 bg-red-900/20 border border-red-500/30 rounded-lg text-red-200 text-sm flex items-center justify-between backdrop-blur-sm">
            <div className="flex items-center space-x-2">
              <span></span>
              <span>{error}</span>
            </div>
            <button 
              className="text-red-400 hover:text-red-200 p-1 rounded-full hover:bg-red-800/20 transition-all"
              onClick={clearError}
            >
              ×
            </button>
          </div>
        )}

        {flowStage === 'input' && (
          <div className="p-5 space-y-5">
            {/* Settings Toggles */}
            <div className="space-y-4">
              {/* Research Mode Toggle */}
              <div className="bg-sphaire-dark/50 border border-sphaire-purple-light/20 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <label className="text-sm font-medium text-sphaire-purple-light/80">
                      Research Mode
                    </label>
                    <p className="text-xs text-sphaire-purple-light/50 mt-1">
                      {autonomousMode ? 'Researches unknown objects & self-corrects' : 'Standard mode (faster, no research)'}
                    </p>
                  </div>
                  <button
                    onClick={() => setAutonomousMode(!autonomousMode)}
                    className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ml-3 ${
                      autonomousMode 
                        ? 'bg-sphaire-pink' 
                        : 'bg-sphaire-dark border border-sphaire-purple-light/30'
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                        autonomousMode ? 'transform translate-x-5' : ''
                      }`}
                    />
                  </button>
                </div>
              </div>
              
              {/* Skip Questions Toggle */}
              <div className="bg-sphaire-dark/50 border border-sphaire-purple-light/20 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <label className="text-sm font-medium text-sphaire-purple-light/80">
                      Skip Questions
                    </label>
                    <p className="text-xs text-sphaire-purple-light/50 mt-1">
                      {skipQuestions ? 'Generate directly without questions' : 'Ask clarifying questions first'}
                    </p>
                  </div>
                  <button
                    onClick={() => setSkipQuestions(!skipQuestions)}
                    className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ml-3 ${
                      skipQuestions 
                        ? 'bg-sphaire-pink' 
                        : 'bg-sphaire-dark border border-sphaire-purple-light/30'
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                        skipQuestions ? 'transform translate-x-5' : ''
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Main Input */}
            <div>
              <label className="block text-sm font-medium text-sphaire-purple-light/80 mb-3">
                What would you like to create?
              </label>
              <textarea
                ref={textareaRef}
                className="w-full h-36 bg-sphaire-dark/50 border border-sphaire-purple-light/20 rounded-lg px-4 py-3 text-sphaire-purple-light text-sm placeholder-sphaire-purple-light/40 focus:outline-none focus:ring-2 focus:ring-sphaire-pink-light/50 focus:border-transparent resize-none backdrop-blur-sm transition-all"
                placeholder="e.g., A sports car, a screwdriver, a medieval castle..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isProcessing}
              />
              <div className="text-xs text-sphaire-purple-light/50 mt-2 flex items-center">
                <span className="mr-2"></span>
                <span>Press Cmd/Ctrl + Enter to continue</span>
              </div>
            </div>

            {/* Generate Button */}
            <button
              className="w-full bg-gradient-to-r from-sphaire-pink to-purple-600 hover:from-sphaire-pink-light hover:to-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white px-5 py-4 rounded-lg text-sm font-semibold transition-all shadow-lg hover:shadow-pink-500/25 disabled:shadow-none flex items-center justify-center gap-3"
              onClick={handleStartFlow}
              disabled={isProcessing || !prompt.trim() || !scene}
            >
              {isProcessing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Processing...
                </>
              ) : (
                <>
                  <span className="text-lg"></span>
                  <span>Start Design</span>
                </>
              )}
            </button>
            
            {/* Meta-Functions Toggle */}
            <div className="mt-6 pt-6 border-t border-sphaire-purple-light/10">
              <div className="bg-sphaire-dark/50 border border-sphaire-purple-light/20 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <label className="text-sm font-medium text-sphaire-purple-light/80">
                      Meta-Functions
                    </label>
                    <p className="text-xs text-sphaire-purple-light/50 mt-1">
                      {enableMetaFunctions ? 'Auto-generates helper functions' : 'Use standard OpenCascade only'}
                    </p>
                  </div>
                  <button
                    onClick={() => setEnableMetaFunctions(!enableMetaFunctions)}
                    className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ml-3 ${
                      enableMetaFunctions 
                        ? 'bg-sphaire-pink' 
                        : 'bg-sphaire-dark border border-sphaire-purple-light/30'
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                        enableMetaFunctions ? 'transform translate-x-5' : ''
                      }`}
                    />
                  </button>
                </div>
              </div>
              
              {/* Meta-Functions Info Panel */}
              {generatedMetaFunctions.length > 0 && (
                <div className="mt-4 bg-sphaire-dark/30 border border-sphaire-pink/20 rounded-lg p-4 backdrop-blur-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-sphaire-pink-light">
                        {generatedMetaFunctions.length} Helper Function{generatedMetaFunctions.length !== 1 ? 's' : ''} Generated
                      </span>
                    </div>
                    <button
                      onClick={() => setShowMetaFunctions(!showMetaFunctions)}
                      className="text-xs text-sphaire-purple-light/60 hover:text-sphaire-purple-light transition-colors"
                    >
                      {showMetaFunctions ? 'Hide' : 'Show'} Details
                    </button>
                  </div>
                  
                  {showMetaFunctions && (
                    <div className="space-y-3 mt-3 pt-3 border-t border-sphaire-pink/10">
                      {generatedMetaFunctions.map((func, idx) => (
                        <div key={idx} className="bg-sphaire-dark/50 rounded p-3 border border-sphaire-purple-light/10">
                          <div className="text-xs font-mono text-sphaire-pink-light mb-1">
                            {func.name}
                          </div>
                          <div className="text-xs text-sphaire-purple-light/60">
                            {func.description}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {flowStage === 'questions' && questions.length > 0 && (
          <div className="p-5 space-y-5">
            <div className="text-center mb-6">
              <h4 className="text-lg font-semibold text-sphaire-purple-light mb-2">
                Let's refine your design
              </h4>
              <p className="text-xs text-sphaire-purple-light/60">
                Answer these questions to get the perfect result
              </p>
            </div>

            {/* Questions */}
            {questions.map((q, idx) => (
              <div key={q.id} className="bg-sphaire-dark/30 border border-sphaire-purple-light/10 rounded-lg p-4 backdrop-blur-sm">
                <label className="block text-sm font-medium text-sphaire-purple-light mb-3">
                  {idx + 1}. {q.question}
                </label>
                
                {q.type === 'choice' && q.options ? (
                  <div className="grid grid-cols-1 gap-2">
                    {q.options.map((option: string) => (
                      <button
                        key={option}
                        className={`px-4 py-3 text-sm rounded-lg border transition-all text-left ${
                          answers[q.id] === option
                            ? 'bg-sphaire-pink/20 border-sphaire-pink-light text-sphaire-pink-light'
                            : 'bg-sphaire-dark/50 border-sphaire-purple-light/20 text-sphaire-purple-light hover:border-sphaire-pink-light/40'
                        }`}
                        onClick={() => setAnswers(prev => ({ ...prev, [q.id]: option }))}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                ) : (
                  <input
                    type="text"
                    className="w-full bg-sphaire-dark/50 border border-sphaire-purple-light/20 rounded-lg px-4 py-3 text-sphaire-purple-light text-sm focus:outline-none focus:ring-2 focus:ring-sphaire-pink-light/50"
                    placeholder={q.defaultValue as string || 'Enter your answer...'}
                    value={answers[q.id] || ''}
                    onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                  />
                )}
              </div>
            ))}

            {/* Action Buttons */}
            <div className="flex gap-3 mt-6">
              <button
                className="flex-1 bg-sphaire-dark/50 hover:bg-sphaire-dark border border-sphaire-purple-light/20 text-sphaire-purple-light px-4 py-3 rounded-lg text-sm font-medium transition-all"
                onClick={() => {
                  setFlowStage('input');
                  setQuestions([]);
                  setAnswers({});
                }}
              >
                ← Back
              </button>
              <button
                className="flex-1 bg-gradient-to-r from-sphaire-pink to-purple-600 hover:from-sphaire-pink-light hover:to-purple-500 text-white px-4 py-3 rounded-lg text-sm font-semibold transition-all shadow-lg"
                onClick={handleProceedWithAnswers}
              >
                Create Design →
              </button>
            </div>
          </div>
        )}

        {/* Advanced Settings - Always at bottom */}
        {flowStage === 'input' && (
          <div className="border-t border-sphaire-purple-light/10 px-5 py-4 mt-auto">
            <button
              className="w-full text-left text-sm text-sphaire-purple-light/70 hover:text-sphaire-purple-light transition-colors flex items-center justify-between mb-3"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              <span>Advanced Settings</span>
              <span className="text-xs">{showAdvanced ? '▼' : '▶'}</span>
            </button>

            {showAdvanced && (
              <div className="space-y-3 pt-2">
                <div className="text-xs text-sphaire-purple-light/60 mb-3">
                  Default: OpenCascade (Precise) • Complex Detail
                </div>
                <div>
                  <label className="block text-xs text-sphaire-purple-light/70 mb-2">Complexity:</label>
                  <div className="flex gap-2">
                    {[
                      { value: 'simple', label: 'Simple' },
                      { value: 'medium', label: 'Medium' },
                      { value: 'complex', label: 'Complex' }
                    ].map(opt => (
                      <button
                        key={opt.value}
                        className={`flex-1 px-3 py-2 text-xs rounded-lg transition-all ${
                          complexity === opt.value
                            ? 'bg-sphaire-pink/20 border border-sphaire-pink-light text-sphaire-pink-light'
                            : 'bg-sphaire-dark/50 border border-sphaire-purple-light/20 text-sphaire-purple-light/70 hover:border-sphaire-purple-light/40'
                        }`}
                        onClick={() => setComplexity(opt.value as any)}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Removed EXAMPLE_PROMPTS - using interactive questioning flow instead

export default AIModelingPanel;
