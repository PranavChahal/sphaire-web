/**
 * AI Autonomous Builder Service
 * 
 * Takes research data and autonomously builds CAD models
 * - Generates custom functions if needed
 * - Self-corrects errors
 * - Iterates until success
 */

import { researchObject } from './aiResearchService';

interface BuildResult {
  success: boolean;
  code?: string;
  meshes?: any[];
  error?: string;
  iterations: number;
  functionsGenerated: string[];
}

export async function autonomousBuild(
  userRequest: string, 
  questionAnswers?: { [key: string]: string }
): Promise<BuildResult> {
  console.log(`[AUTONOMOUS] Starting autonomous build for: "${userRequest}"`);
  
  const maxIterations = 3;
  let currentIteration = 0;
  const functionsGenerated: string[] = [];
  
  try {
    // Step 1: Research the object
    console.log('[AUTONOMOUS] Phase 1: Research');
    const research = await researchObject(userRequest);
    
    if (research.confidence < 0.3) {
      console.warn(`[AUTONOMOUS] Low confidence (${research.confidence}), proceeding cautiously`);
    }
    
    // Step 1.5: Apply question answers to refine understanding (if provided)
    let refinedRequest = userRequest;
    if (questionAnswers && Object.keys(questionAnswers).length > 0) {
      console.log('[AUTONOMOUS] Phase 1.5: Applying question answers');
      refinedRequest = await refinePromptWithAnswers(userRequest, questionAnswers, research);
      console.log('[AUTONOMOUS] Refined request:', refinedRequest);
    }
    
    // Step 2: Generate build plan from research
    console.log('📋 [AUTONOMOUS] Phase 2: Build Planning');
    const buildPlan = await generateBuildPlan(research, refinedRequest);
    
    // Step 3: Generate custom functions if needed
    console.log('[AUTONOMOUS] Phase 3: Function Generation');
    const customFunctions = await generateCustomFunctions(buildPlan, research);
    functionsGenerated.push(...customFunctions.map(f => f.name));
    
    // Step 4: Generate CAD code
    console.log('[AUTONOMOUS] Phase 4: Code Generation');
    let code = await generateCADCode(buildPlan, customFunctions, research);
    
    // Step 5: Iterative execution with self-correction
    console.log('[AUTONOMOUS] Phase 5: Execution & Self-Correction');
    while (currentIteration < maxIterations) {
      currentIteration++;
      console.log(`[AUTONOMOUS] Iteration ${currentIteration}/${maxIterations}`);
      
      try {
        // Attempt execution
        const result = await executeCode(code);
        
        if (result.success) {
          console.log(`[AUTONOMOUS] Build successful on iteration ${currentIteration}!`);
          return {
            success: true,
            code,
            meshes: result.meshes,
            iterations: currentIteration,
            functionsGenerated
          };
        }
      } catch (error: any) {
        console.error(`[AUTONOMOUS] Iteration ${currentIteration} failed:`, error.message);
        
        // Self-correct based on error
        if (currentIteration < maxIterations) {
          console.log('[AUTONOMOUS] Attempting self-correction...');
          code = await selfCorrect(code, error.message, research);
        }
      }
    }
    
    return {
      success: false,
      error: 'Max iterations reached without success',
      iterations: currentIteration,
      functionsGenerated
    };
    
  } catch (error: any) {
    console.error('[AUTONOMOUS] Autonomous build failed:', error);
    return {
      success: false,
      error: error.message,
      iterations: currentIteration,
      functionsGenerated
    };
  }
}

/**
 * Refine prompt using question answers
 */
async function refinePromptWithAnswers(
  originalRequest: string,
  answers: { [key: string]: string },
  research: any
): Promise<string> {
  const answersText = Object.entries(answers)
    .map(([qId, answer]) => `- ${qId}: ${answer}`)
    .join('\n');
  
  const prompt = `Original request: "${originalRequest}"

User provided these clarifications:
${answersText}

Research findings:
- Features: ${research.commonFeatures.join(', ')}
- Parts: ${research.anatomy.mainParts.join(', ')}

Create a detailed, refined description incorporating the user's preferences.
Focus on specific dimensions, materials, style, and details they want.

Return ONLY the refined description text, no JSON, no explanations.`;
  
  const response = await fetch('/api/ai-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      backend: 'opencascade',
      prompt,
      customSystemPrompt: 'You are a prompt refinement expert. Take user requirements and create detailed descriptions.'
    })
  });
  
  if (response.ok) {
    const data = await response.json();
    return data.code || originalRequest;
  }
  
  return originalRequest;
}

/**
 * Generate build plan from research data
 */
async function generateBuildPlan(research: any, requestDescription?: string): Promise<any> {
  const prompt = `Based on this research about "${research.objectName}":

Request: ${requestDescription || research.objectName}

Common Features: ${research.commonFeatures.join(', ')}
Main Parts: ${research.anatomy.mainParts.join(', ')}
Details: ${research.anatomy.details.join(', ')}
Visual Characteristics: ${research.visualCharacteristics.join(', ')}

Create a detailed build plan as JSON:
{
  "components": [
    {
      "name": "component_name",
      "description": "detailed description",
      "shape": "box|cylinder|sphere|wedge|custom",
      "customFunction": "function name if custom shape needed",
      "position": {"x": 0, "y": 0, "z": 0},
      "dimensions": {"...": "..."}
    }
  ],
  "customFunctionsNeeded": [
    {"name": "functionName", "purpose": "what it does"}
  ]
}

Be EXTREMELY detailed. Include ALL features from research. Return ONLY JSON.`;

  const response = await fetch('/api/ai-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      backend: 'opencascade',
      prompt,
      customSystemPrompt: 'You are a CAD planning expert. Create detailed component breakdowns. Return valid JSON only.'
    })
  });
  
  if (response.ok) {
    const data = await response.json();
    const jsonMatch = data.code.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (parseError) {
        // Auto-fix common JSON errors
        console.warn('[AUTONOMOUS] JSON parse error, attempting fix...');
        try {
          let fixedJson = jsonMatch[0]
            .replace(/,\s*}/g, '}')  // Remove trailing commas in objects
            .replace(/,\s*]/g, ']')   // Remove trailing commas in arrays
            .replace(/[\u0000-\u001F]+/g, ''); // Remove control characters
          
          return JSON.parse(fixedJson);
        } catch (fixError) {
          console.error('[AUTONOMOUS] Could not fix JSON, using fallback');
        }
      }
    }
  }
  
  return { components: [], customFunctionsNeeded: [] };
}

/**
 * Generate custom functions based on build plan
 */
async function generateCustomFunctions(buildPlan: any, research: any): Promise<any[]> {
  const customFunctions: any[] = [];
  
  if (!buildPlan.customFunctionsNeeded || buildPlan.customFunctionsNeeded.length === 0) {
    return customFunctions;
  }
  
  console.log(`[AUTONOMOUS] Generating ${buildPlan.customFunctionsNeeded.length} custom functions...`);
  
  for (const funcSpec of buildPlan.customFunctionsNeeded) {
    const prompt = `Create a custom OpenCascade.js function: ${funcSpec.name}

Purpose: ${funcSpec.purpose}
Context: Building ${research.objectName}

The function should:
- Use the occ wrapper functions (occ.createBox, occ.createCylinder, etc.)
- Return a single TopoDS_Shape
- Have proper parameter validation
- Be well-documented

Generate the function code. Example format:
\`\`\`javascript
function ${funcSpec.name}(param1, param2) {
  // Validation
  if (param1 <= 0) param1 = 1;
  
  // Create shape
  const shape = occ.createBox(param1, param2, 1);
  
  // Return
  return shape;
}
\`\`\`

Return ONLY the function code, no explanations.`;

    const response = await fetch('/api/ai-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        backend: 'opencascade',
        prompt,
        customSystemPrompt: 'You are an expert CAD function developer. Generate clean, executable OpenCascade.js functions.'
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      const codeMatch = data.code.match(/```javascript\n([\s\S]*?)\n```/) || 
                       data.code.match(/function[\s\S]*?}/);
      
      if (codeMatch) {
        customFunctions.push({
          name: funcSpec.name,
          code: codeMatch[1] || codeMatch[0]
        });
      }
    }
  }
  
  return customFunctions;
}

/**
 * Generate final CAD code
 */
async function generateCADCode(buildPlan: any, customFunctions: any[], research: any): Promise<string> {
  const functionsCode = customFunctions.map(f => f.code).join('\n\n');
  
  const prompt = `Build "${research.objectName}" using this plan:

${JSON.stringify(buildPlan, null, 2)}

Features to include: ${research.commonFeatures.slice(0, 10).join(', ')}

${functionsCode ? `Custom functions available:\n${functionsCode}\n` : ''}

Generate OpenCascade.js code that:
1. Creates ALL components from the plan
2. Uses component array format: [{shape, name, position}, ...]
3. NEVER uses union(), fuse(), or compound()
4. Each component is ONE simple shape
5. Includes proper validation

Return ONLY executable JavaScript code, no markdown, no explanations.`;

  const response = await fetch('/api/ai-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      backend: 'opencascade',
      prompt,
      customSystemPrompt: 'You are an expert CAD code generator. Generate clean, executable OpenCascade.js code following all rules.'
    })
  });
  
  if (response.ok) {
    const data = await response.json();
    // Remove markdown blocks if present
    let code = data.code;
    code = code.replace(/```javascript\n/g, '');
    code = code.replace(/```\n/g, '');
    code = code.replace(/```/g, '');
    return code;
  }
  
  throw new Error('Failed to generate CAD code');
}

/**
 * Execute code (placeholder - integrate with your executor)
 */
async function executeCode(code: string): Promise<any> {
  // This should integrate with your existing executor
  // For now, returning a mock result
  return {
    success: true,
    meshes: []
  };
}

/**
 * Self-correct code based on error
 */
async function selfCorrect(code: string, errorMessage: string, research: any): Promise<string> {
  console.log('[AUTONOMOUS] Analyzing error and correcting...');
  
  const prompt = `This code for "${research.objectName}" failed with error:
${errorMessage}

Original code:
${code}

Analyze the error and fix it. Common issues:
- Wrong parameter types (e.g., passing number instead of gp_Ax2)
- Wrong number of parameters to constructors
- Invalid OpenCascade.js API usage
- Using undefined functions

Return the CORRECTED code only, no explanations.`;

  const response = await fetch('/api/ai-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      backend: 'opencascade',
      prompt,
      customSystemPrompt: 'You are a debugging expert. Fix OpenCascade.js errors precisely. Return only corrected code.'
    })
  });
  
  if (response.ok) {
    const data = await response.json();
    let correctedCode = data.code;
    correctedCode = correctedCode.replace(/```javascript\n/g, '');
    correctedCode = correctedCode.replace(/```\n/g, '');
    correctedCode = correctedCode.replace(/```/g, '');
    return correctedCode;
  }
  
  return code; // Return original if correction fails
}

export default {
  autonomousBuild
};
