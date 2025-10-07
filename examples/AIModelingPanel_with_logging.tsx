/**
 * INTEGRATION EXAMPLE: AIModelingPanel with Complete Logging
 * 
 * This shows how to integrate the AI logging system into your AIModelingPanel
 * to track all queries, questions/answers, generated code, and errors.
 */

import { aiLogger } from '../services/aiLogger';

// Example integration points in your handleStartFlow function:

async function handleStartFlow() {
  if (!prompt.trim() || !scene) return;
  
  // ========================================
  // 1. CREATE LOGGER AT START
  // ========================================
  const logger = aiLogger.createQueryLogger(prompt);
  
  setIsProcessing(true);
  setFlowStage('questions');
  setError(null);
  
  try {
    // Get API key
    const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY || localStorage.getItem('openai_api_key') || '';
    
    // ========================================
    // 2. AUTONOMOUS MODE (if enabled)
    // ========================================
    if (autonomousMode) {
      try {
        console.log('[MAXIMUM POWER] Entering autonomous build mode...');
        logger.startGeneration();
        
        const result = await autonomousBuild(prompt, apiKey, setAutonomousStatus);
        
        if (result.success && result.meshData) {
          logger.startExecution();
          
          // Add to store...
          const { parameters: extractedParams, parameterMetadata: paramMeta } = extractParametersFromCode(result.code);
          
          addParametricShape({
            type: 'parametric',
            constructionCode: result.code,
            parameters: extractedParams,
            metadata: paramMeta,
            meshData: result.meshData,
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            scaling: { x: 1, y: 1, z: 1 }
          });
          
          // ========================================
          // LOG SUCCESS WITH RESEARCH MODE
          // ========================================
          await logger.logSuccess({
            generated_code: result.code,
            used_research_mode: true,
            research_iterations: result.iterations || 1,
            mesh_created: true,
            vertex_count: result.meshData.positions.length / 3,
            triangle_count: result.meshData.indices.length / 3,
            skip_questions: true
          });
          
          setLastResponse(result.code);
          setFlowStage('input');
          setPrompt('');
          return;
        }
      } catch (autoError) {
        console.error('[MAXIMUM POWER] Autonomous mode error:', autoError);
        
        // ========================================
        // LOG FAILURE IN AUTONOMOUS MODE
        // ========================================
        await logger.logFailure(autoError as Error, {
          used_research_mode: true,
          stage: 'autonomous_generation'
        });
      }
    }
    
    // ========================================
    // 3. META-FUNCTION SYSTEM (if enabled)
    // ========================================
    if (enableMetaFunctions) {
      try {
        logger.startGeneration();
        setFlowStage('analyzing');
        
        const { analyzeAndGenerateMetaFunctions, generateCodeWithMetaFunctions } = await import('@/services/aiMetaFunctionService');
        
        const metaAnalysis = await analyzeAndGenerateMetaFunctions(prompt, refined, apiKey);
        
        if (metaAnalysis.needsMetaFunctions && metaAnalysis.functions.length > 0) {
          setGeneratedMetaFunctions(metaAnalysis.functions);
          setFlowStage('generating');
          
          const codeWithHelpers = await generateCodeWithMetaFunctions(prompt, metaAnalysis.functions, apiKey);
          
          logger.startExecution();
          
          const result = await occMainThreadExecutor.executeCode(codeWithHelpers, scene);
          
          if (result.success && result.meshData) {
            // Add to store...
            const { parameters: extractedParams2, parameterMetadata: paramMeta2 } = extractParametersFromCode(codeWithHelpers);
            
            addParametricShape({
              type: 'parametric',
              constructionCode: codeWithHelpers,
              parameters: extractedParams2,
              metadata: paramMeta2,
              meshData: result.meshData,
              position: { x: 0, y: 0, z: 0 },
              rotation: { x: 0, y: 0, z: 0 },
              scaling: { x: 1, y: 1, z: 1 }
            });
            
            // ========================================
            // LOG SUCCESS WITH META-FUNCTIONS
            // ========================================
            await logger.logSuccess({
              generated_code: codeWithHelpers,
              used_meta_functions: true,
              meta_functions: metaAnalysis.functions,
              mesh_created: true,
              vertex_count: result.meshData.positions.length / 3,
              triangle_count: result.meshData.indices.length / 3,
              skip_questions: true
            });
            
            setLastResponse(codeWithHelpers);
            setFlowStage('input');
            setPrompt('');
            setQuestions([]);
            setAnswers({});
            return;
          }
        }
      } catch (metaError) {
        console.error('[META-FUNC] Meta-function analysis failed:', metaError);
        
        // ========================================
        // LOG META-FUNCTION ERROR
        // ========================================
        await logger.logFailure(metaError as Error, {
          used_meta_functions: true,
          stage: 'meta_function_generation'
        });
      }
    }
    
    // ========================================
    // 4. STANDARD FLOW WITH QUESTIONS
    // ========================================
    
    // Check if we should skip questions
    if (skipQuestions) {
      console.log('Skipping questions, going directly to generation...');
      await handleDirectGenerate();
      return;
    }
    
    setFlowStage('questions');
    
    const { generateQuestions } = await import('@/services/aiQuestioningService');
    
    // Generate clarifying questions
    const result = await generateQuestions(prompt, apiKey);
    const questions = result.questions;
    setQuestions(questions);
    
    console.log('Generated questions:', questions.length);
    
  } catch (error) {
    console.error('Error in handleStartFlow:', error);
    setError((error as Error).message || 'An error occurred during generation');
    
    // ========================================
    // LOG ERROR IN FLOW START
    // ========================================
    await logger.logFailure(error as Error, {
      stage: 'flow_start'
    });
    
  } finally {
    setIsProcessing(false);
  }
}

// ========================================
// EXAMPLE: handleAnswerSubmit with logging
// ========================================
async function handleAnswerSubmit() {
  if (!prompt.trim() || !scene) return;
  
  // Create logger
  const logger = aiLogger.createQueryLogger(prompt);
  
  setIsProcessing(true);
  setFlowStage('generating');
  
  try {
    const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY || localStorage.getItem('openai_api_key') || '';
    
    logger.startGeneration();
    
    // Refine prompt with answers
    const { refinePromptWithAnswers } = await import('@/services/aiQuestioningService');
    const refined = await refinePromptWithAnswers(prompt, questions, answers, apiKey);
    
    // Generate code
    const { generateOpenCascadeCode } = await import('@/services/aiCodeGenerator');
    const generatedCode = await generateOpenCascadeCode(refined, 'opencascade', 'complex', apiKey);
    
    logger.startExecution();
    
    // Execute code
    const result = await occMainThreadExecutor.executeCode(generatedCode, scene);
    
    if (result.success && result.meshData) {
      const { parameters: extractedParams, parameterMetadata: paramMeta } = extractParametersFromCode(generatedCode);
      
      addParametricShape({
        type: 'parametric',
        constructionCode: generatedCode,
        parameters: extractedParams,
        metadata: paramMeta,
        meshData: result.meshData,
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scaling: { x: 1, y: 1, z: 1 }
      });
      
      // ========================================
      // LOG SUCCESS WITH QUESTIONS & ANSWERS
      // ========================================
      await logger.logSuccess({
        questions_asked: questions,
        user_answers: answers,
        generated_code: generatedCode,
        mesh_created: true,
        vertex_count: result.meshData.positions.length / 3,
        triangle_count: result.meshData.indices.length / 3,
        skip_questions: false
      });
      
      setLastResponse(generatedCode);
      setFlowStage('input');
      setPrompt('');
      setQuestions([]);
      setAnswers({});
      
    } else {
      throw new Error(result.error || 'Code execution failed');
    }
    
  } catch (error) {
    console.error('Error in handleAnswerSubmit:', error);
    setError((error as Error).message || 'An error occurred');
    
    // ========================================
    // LOG FAILURE WITH QUESTIONS & ANSWERS
    // ========================================
    await logger.logFailure(error as Error, {
      questions_asked: questions,
      user_answers: answers,
      stage: 'generation_with_answers'
    });
    
  } finally {
    setIsProcessing(false);
  }
}

// ========================================
// EXAMPLE: handleDirectGenerate with logging
// ========================================
async function handleDirectGenerate() {
  if (!prompt.trim() || !scene) return;
  
  const logger = aiLogger.createQueryLogger(prompt);
  
  setIsProcessing(true);
  setFlowStage('generating');
  
  try {
    const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY || localStorage.getItem('openai_api_key') || '';
    
    logger.startGeneration();
    
    const { generateOpenCascadeCode } = await import('@/services/aiCodeGenerator');
    const generatedCode = await generateOpenCascadeCode(prompt, 'opencascade', 'complex', apiKey);
    
    logger.startExecution();
    
    const result = await occMainThreadExecutor.executeCode(generatedCode, scene);
    
    if (result.success && result.meshData) {
      const { parameters: extractedParams, parameterMetadata: paramMeta } = extractParametersFromCode(generatedCode);
      
      addParametricShape({
        type: 'parametric',
        constructionCode: generatedCode,
        parameters: extractedParams,
        metadata: paramMeta,
        meshData: result.meshData,
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scaling: { x: 1, y: 1, z: 1 }
      });
      
      // ========================================
      // LOG SUCCESS (DIRECT, NO QUESTIONS)
      // ========================================
      await logger.logSuccess({
        generated_code: generatedCode,
        mesh_created: true,
        vertex_count: result.meshData.positions.length / 3,
        triangle_count: result.meshData.indices.length / 3,
        skip_questions: true
      });
      
      setLastResponse(generatedCode);
      setFlowStage('input');
      setPrompt('');
      
    } else {
      throw new Error(result.error || 'Direct generation failed');
    }
    
  } catch (error) {
    console.error('Error in direct generate:', error);
    setError((error as Error).message || 'Direct generation failed');
    
    // ========================================
    // LOG FAILURE (DIRECT GENERATE)
    // ========================================
    await logger.logFailure(error as Error, {
      skip_questions: true,
      stage: 'direct_generation'
    });
    
  } finally {
    setIsProcessing(false);
  }
}

// ========================================
// EXAMPLE: Standalone error logging
// ========================================
async function logAPIError(error: Error, context: string) {
  await aiLogger.logError({
    error_type: 'api',
    error_message: error.message,
    error_stack: error.stack,
    stage: context,
    error_details: {
      name: error.name,
      timestamp: new Date().toISOString()
    }
  });
}

// ========================================
// EXAMPLE: Get user statistics
// ========================================
async function showUserStats() {
  const stats = await aiLogger.getUserStats();
  
  if (stats) {
    console.log('=== User AI Statistics ===');
    console.log('Total queries:', stats.total_queries);
    console.log('Successful:', stats.successful_queries);
    console.log('Failed:', stats.failed_queries);
    console.log('Success rate:', ((stats.successful_queries / stats.total_queries) * 100).toFixed(1) + '%');
    console.log('Avg generation time:', stats.avg_generation_time_ms + 'ms');
    console.log('Total meshes created:', stats.total_meshes_created);
  }
}

// ========================================
// EXAMPLE: View recent queries
// ========================================
async function showRecentActivity() {
  const queries = await aiLogger.getRecentQueries(5);
  
  console.log('=== Recent Queries ===');
  queries.forEach((q, i) => {
    console.log(`${i + 1}. "${q.prompt}" - ${q.status}`);
    console.log(`   Time: ${q.total_time_ms}ms`);
    if (q.questions_asked) {
      console.log(`   Questions: ${JSON.parse(q.questions_asked as any).length}`);
    }
    console.log('---');
  });
}

export {
  handleStartFlow,
  handleAnswerSubmit,
  handleDirectGenerate,
  logAPIError,
  showUserStats,
  showRecentActivity
};
