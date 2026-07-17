/**
 * OPENAI GPT-4o AI CODE GENERATION API ROUTE
 * 
 * Production-ready endpoint for generating Babylon.js/OpenCascade.js code
 * using OpenAI GPT-4o model with intelligent prompt context injection
 */

import { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';
import promptContext from '../../services/promptContext';
import { getKeyPool } from '../../services/apiKeyPool';

interface APIResponse {
  code?: string;
  model?: string;
  error?: string;
}

// DO NOT initialize OpenAI client at module level!
// Next.js API routes may not have env vars loaded yet
// Initialize it inside the handler function instead

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<APIResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt, backend, systemPrompt: customSystemPrompt, apiKey: customApiKey } = req.body;
  
  // Get API key from pool or fallback to custom/env
  let apiKey: string;
  let usingKeyPool = false;
  
  if (customApiKey) {
    apiKey = customApiKey;
    console.log('Using custom API key from request');
  } else {
    try {
      // SERVER-SIDE INITIALIZATION: Check for multiple keys first
      const multiKeysEnv = process.env.OPENAI_API_KEYS;
      
      if (multiKeysEnv && multiKeysEnv.includes(',')) {
        // Multiple keys found - initialize pool if not already done
        const keys = multiKeysEnv.split(',').map(k => k.trim()).filter(k => k.length > 0);
        
        if (keys.length > 1) {
          // Initialize pool (will reuse existing if already initialized)
          try {
            const { initializeKeyPool } = require('../../services/apiKeyPool');
            initializeKeyPool(keys);
          } catch (initError) {
            // Pool might already be initialized, that's OK
          }
        }
      }
      
      // Get key from pool
      const keyPool = getKeyPool();
      apiKey = keyPool.getNextKey();
      usingKeyPool = true;
      
      // Log pool stats
      const stats = keyPool.getStats();
      console.log(`[KEY-POOL] Using key from pool (${stats.available}/${stats.total} available, ${stats.totalRequests} total requests)`);
    } catch (error) {
      // Fallback to env if pool not initialized
      apiKey = process.env.OPENAI_API_KEY || '';
      console.log('Using single API key from env (pool not initialized)');
    }
  }
  
  // Never log key material or env-var names — only presence and provenance.
  console.log('API Key check:', {
    present: !!apiKey,
    pooled: usingKeyPool,
  });

  if (!apiKey) {
    console.error('OpenAI API key not configured');
    return res.status(500).json({
      error: 'OpenAI API key not configured. Please add OPENAI_API_KEY to .env.local and restart the server.' 
    });
  }

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid prompt' });
  }

  // Validate backend parameter (default to OpenCascade for CAD precision)
  const validBackends = ['babylon', 'opencascade', 'auto'];
  const selectedBackend = backend && validBackends.includes(backend) ? backend : 'opencascade';
  
  console.log('AI-CODE: Backend requested:', selectedBackend);

  try {
    console.log('Generating code with GPT-4o for prompt:', prompt.substring(0, 100) + '...');
    
    // Initialize OpenAI client with API key from environment
    const openai = new OpenAI({
      apiKey: apiKey,
    });
    
    // Build context-aware prompts using our prompt engineering system with backend-specific context
    // Pass user input to buildSystemPrompt for domain detection and targeted examples
    // Allow custom system prompt for questioning service
    const systemPrompt = customSystemPrompt || promptContext.buildSystemPrompt(selectedBackend, prompt);
    const userPrompt = promptContext.buildUserPrompt(prompt, 'code', selectedBackend);
    
    console.log('AI-CODE: Using backend-specific context for:', selectedBackend);
    console.log('AI-CODE: Domain-specific examples loaded based on user prompt');
    
    // Generate code, escalating from a fast/cheap default to a higher-quality model
    // on failure. Configurable via OPENAI_MODEL. (Legacy gpt-3.5-turbo / gpt-4-turbo-
    // preview removed — they were slower AND lower quality than the 4o family.)
    const models = [
      process.env.OPENAI_MODEL || 'gpt-4o-mini', // default: fast, cheap, capable
      'gpt-4o',                                  // escalate to higher quality on failure
    ];
    
    let response;
    let modelUsed = '';
    let lastError;
    
    for (const modelToUse of models) {
      try {
        console.log(`Trying OpenAI API with model: ${modelToUse}`);
        
        response = await openai.chat.completions.create({
          model: modelToUse,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          max_tokens: 3000, // Increased - condensed prompts allow more output
          temperature: 0.1, // Low temperature for precise, consistent code generation
          top_p: 0.95
        });

        const generatedCode = response.choices[0]?.message?.content?.trim() || '';
        
        if (!generatedCode) {
          console.warn(`Model ${modelToUse} returned empty response, trying next model...`);
          continue;
        }

        modelUsed = modelToUse;
        console.log(`Generated ${generatedCode.length} characters using ${modelUsed}`);
        console.log('Code preview:', generatedCode.substring(0, 200) + '...');
        
        return res.status(200).json({ 
          code: generatedCode, 
          model: modelUsed
        });
        
      } catch (modelError: any) {
        lastError = modelError;
        console.warn(`Model ${modelToUse} failed:`, modelError.message);
        
        // Check if it's a rate limit error
        if (usingKeyPool && (modelError.status === 429 || modelError.code === 'rate_limit_exceeded')) {
          try {
            const keyPool = getKeyPool();
            keyPool.markRateLimited(apiKey, 60); // Mark as rate-limited for 60 seconds
            console.warn(`Marked current key as rate-limited, will rotate to next key on retry`);
          } catch (e) {
            // Ignore if pool not available
          }
        }
        
        // If it's the last model, throw the error
        if (modelToUse === models[models.length - 1]) {
          throw modelError;
        }
        
        // Otherwise, try the next model
        console.log(`Trying next fallback model...`);
        continue;
      }
    }
    
    // If we get here, all models failed
    throw new Error('All AI models failed to generate code');
  } catch (error: any) {
    console.error('Error in AI code generation:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      type: error.type,
      status: error.status
    });
    
    // Provide specific error messages
    let errorMessage = 'Code generation failed';
    
    if (error.code === 'invalid_api_key') {
      errorMessage = 'Invalid OpenAI API key. Please check your .env.local file.';
    } else if (error.code === 'insufficient_quota') {
      errorMessage = 'OpenAI API quota exceeded. Please add credits to your account.';
    } else if (error.status === 429 || error.message?.includes('rate limit')) {
      errorMessage = 'OpenAI is experiencing high demand. Please wait 30-60 seconds and try again.';
    } else if (error.message?.includes('resource_exhausted')) {
      errorMessage = 'OpenAI model is overloaded. The system has switched to a backup model. Please try again.';
    } else if (error.message) {
      errorMessage = `${errorMessage}: ${error.message}`;
    }
    
    return res.status(500).json({ 
      error: errorMessage
    });
  }
}
