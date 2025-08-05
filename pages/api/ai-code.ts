/**
 * OPENAI GPT-4o AI CODE GENERATION API ROUTE
 * 
 * Production-ready endpoint for generating Babylon.js/OpenCascade.js code
 * using OpenAI GPT-4o model with intelligent prompt context injection
 */

import { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';
import promptContext from '../../services/promptContext';

interface APIResponse {
  code?: string;
  model?: string;
  error?: string;
}

// Initialize OpenAI with API key
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<APIResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt, backend } = req.body;

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid prompt' });
  }

  // Validate backend parameter
  const validBackends = ['babylon', 'opencascade', 'auto'];
  const selectedBackend = backend && validBackends.includes(backend) ? backend : 'auto';
  
  console.log('🔧 AI-CODE: Backend requested:', selectedBackend);

  try {
    console.log('🤖 Generating code with GPT-4o for prompt:', prompt.substring(0, 100) + '...');
    
    // Build context-aware prompts using our prompt engineering system with backend-specific context
    const systemPrompt = promptContext.buildSystemPrompt(selectedBackend);
    const userPrompt = promptContext.buildUserPrompt(prompt, 'code', selectedBackend);
    
    console.log('🔧 AI-CODE: Using backend-specific context for:', selectedBackend);
    
    // Generate code using OpenAI GPT-4o (best model for coding)
    const response = await openai.chat.completions.create({
      model: 'gpt-4o', // Best OpenAI model for JavaScript/TypeScript coding
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 1500,
      temperature: 0.1, // Low temperature for precise, consistent code generation
      top_p: 0.95
    });

    const generatedCode = response.choices[0]?.message?.content?.trim() || '';
    
    if (!generatedCode) {
      console.error('❌ OpenAI returned empty response');
      return res.status(500).json({ 
        error: 'AI returned empty response. Please try again.' 
      });
    }

    console.log(`✅ Generated ${generatedCode.length} characters using GPT-4o`);
    console.log('📝 Code preview:', generatedCode.substring(0, 200) + '...');
    
    return res.status(200).json({ 
      code: generatedCode, 
      model: 'gpt-4o' 
    });
  } catch (error: any) {
    console.error('🚨 Error in AI code generation:', error);
    return res.status(500).json({ 
      error: `Code generation failed: ${error.message || 'Unknown error'}` 
    });
  }
}
