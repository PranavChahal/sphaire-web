/**
 * OPENAI GPT-4o 3D MODEL GENERATION API ROUTE
 * 
 * Production-ready endpoint for generating 3D Babylon.js models
 * using OpenAI GPT-4o model with intelligent prompt context injection
 */

import { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';
import promptContext from '../../services/promptContext';

// Response types
interface GenerateModelResponse {
  code?: string;
  backend?: 'babylonjs' | 'opencascade';
  model?: string;
  error?: string;
}

// Initialize OpenAI with API key
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * API handler that generates 3D model code based on a text specification using OpenAI GPT-4o
 * 
 * @param req Next.js API request with a JSON body containing {prompt: string}
 * @param res Next.js API response returning either generated code or an error
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GenerateModelResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt } = req.body;

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid prompt' });
  }

  try {
    console.log('Generating 3D model with GPT-4o for prompt:', prompt.substring(0, 100) + '...');
    
    // Build context-aware prompts using our prompt engineering system
    const systemPrompt = promptContext.buildSystemPrompt() + `

SPECIAL INSTRUCTIONS FOR 3D MODEL GENERATION:
- Focus on creating complete, visually appealing 3D models
- Use appropriate geometric primitives and combinations
- Apply realistic materials and colors
- Position objects logically in 3D space
- Return JSON format: {"code": "...", "backend": "babylonjs"}
- Ensure all generated code is immediately executable`;
    
    const userPrompt = promptContext.buildUserPrompt(prompt, 'model');
    
    // Generate 3D model using OpenAI GPT-4o
    const response = await openai.chat.completions.create({
      model: 'gpt-4o', // Best OpenAI model for complex code generation
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 2000, // More tokens for complex 3D models
      temperature: 0.2, // Low temperature for consistent, precise code
      top_p: 0.9
    });

    const generatedResponse = response.choices[0]?.message?.content?.trim() || '';
    
    if (!generatedResponse) {
      console.error('OpenAI returned empty response');
      return res.status(500).json({ 
        error: 'AI returned empty response. Please try again.' 
      });
    }

    console.log('Raw AI response length:', generatedResponse.length);
    
    // Try to parse JSON response
    let parsedResponse: { code: string; backend: string };
    try {
      // Clean the response - remove markdown formatting if present
      let cleanResponse = generatedResponse.trim();
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.replace(/```json\s*/, '').replace(/```\s*$/, '');
      } else if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.replace(/```\s*/, '').replace(/```\s*$/, '');
      }
      
      parsedResponse = JSON.parse(cleanResponse);
    } catch (parseError) {
      console.error('Failed to parse JSON response, using fallback:', parseError);
      
      // Fallback: treat the entire response as code
      parsedResponse = {
        code: generatedResponse,
        backend: 'babylonjs'
      };
    }
    
    if (!parsedResponse.code || parsedResponse.code.trim() === '') {
      console.error('Parsed response contains no code');
      return res.status(500).json({ 
        error: 'Generated response contains no executable code.' 
      });
    }

    console.log('Generated 3D model code length:', parsedResponse.code.length);
    console.log('Using backend:', parsedResponse.backend);
    
    return res.status(200).json({
      code: parsedResponse.code,
      backend: (parsedResponse.backend as 'babylonjs' | 'opencascade') || 'babylonjs',
      model: 'gpt-4o'
    });
  } catch (error: any) {
    console.error('Error in 3D model generation:', error);
    return res.status(500).json({ 
      error: `3D model generation failed: ${error.message || 'Unknown error'}` 
    });
  }
}
