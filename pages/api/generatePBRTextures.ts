/**
 * generatePBRTextures.ts
 * 
 * API endpoint for generating PBR texture stacks using StableMaterials from Hugging Face
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';

interface PBRTextureStack {
  baseColor: string;
  normal: string;
  roughness: string;
  metallic: string;
  height: string;
  ao?: string;
}

interface ApiResponse {
  success: boolean;
  textures?: PBRTextureStack;
  error?: string;
}

interface RequestBody {
  prompt: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use POST.'
    });
  }

  try {
    // Get OpenAI API key from environment
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      return res.status(500).json({
        success: false,
        error: 'OpenAI API key not configured. Please set OPENAI_API_KEY in your environment.'
      });
    }

    // Parse request body
    const { prompt }: RequestBody = req.body;

    // Validate input
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Prompt is required and must be a non-empty string'
      });
    }

    console.log('Generating PBR textures for prompt:', prompt);

    // Initialize OpenAI client
    const openai = new OpenAI({ apiKey: openaiKey });

    // Generate base texture using DALL-E
    try {
      const baseTextureResponse = await openai.images.generate({
        model: 'dall-e-3',
        prompt: `seamless 4K ${prompt} PBR texture, tileable, material texture, high resolution`,
        n: 1,
        size: '1024x1024',
        response_format: 'url'
      });

      if (!baseTextureResponse.data || !baseTextureResponse.data[0]?.url) {
        throw new Error('Failed to generate base texture - no URL returned');
      }
      const baseColorUrl = baseTextureResponse.data[0].url;
      
      // Generate additional PBR maps using DALL-E with specific prompts
      const [normalResponse, roughnessResponse, metallicResponse, heightResponse] = await Promise.all([
        // Normal map
        openai.images.generate({
          model: 'dall-e-3',
          prompt: `normal map for ${prompt} texture, blue-purple tinted, surface detail, bump map style`,
          n: 1,
          size: '1024x1024',
          response_format: 'url'
        }),
        // Roughness map
        openai.images.generate({
          model: 'dall-e-3', 
          prompt: `roughness map for ${prompt} texture, grayscale, surface roughness detail`,
          n: 1,
          size: '1024x1024',
          response_format: 'url'
        }),
        // Metallic map
        openai.images.generate({
          model: 'dall-e-3',
          prompt: `metallic map for ${prompt} texture, black and white, metallic areas in white`,
          n: 1,
          size: '1024x1024', 
          response_format: 'url'
        }),
        // Height/displacement map
        openai.images.generate({
          model: 'dall-e-3',
          prompt: `height displacement map for ${prompt} texture, grayscale, surface elevation detail`,
          n: 1,
          size: '1024x1024',
          response_format: 'url'
        })
      ]);

      // Validate all responses have URLs
      if (!normalResponse.data?.[0]?.url || !roughnessResponse.data?.[0]?.url || 
          !metallicResponse.data?.[0]?.url || !heightResponse.data?.[0]?.url) {
        throw new Error('Failed to generate one or more PBR texture maps');
      }

      // Create complete PBR texture stack from OpenAI generated maps
      const textureStack: PBRTextureStack = {
        baseColor: baseColorUrl,
        normal: normalResponse.data[0].url,
        roughness: roughnessResponse.data[0].url,
        metallic: metallicResponse.data[0].url,
        height: heightResponse.data[0].url,
      };

      console.log('Successfully generated complete PBR texture stack using OpenAI DALL-E');

      return res.status(200).json({
        success: true,
        textures: textureStack
      });

    } catch (openaiError: any) {
      console.error('OpenAI API error:', openaiError);
      
      // Handle specific OpenAI errors
      if (openaiError.code === 'rate_limit_exceeded') {
        return res.status(429).json({
          success: false,
          error: 'Rate limit exceeded. Please try again later.'
        });
      }
      
      if (openaiError.code === 'insufficient_quota') {
        return res.status(402).json({
          success: false,
          error: 'Insufficient OpenAI credits. Please check your account balance.'
        });
      }

      return res.status(500).json({
        success: false,
        error: `Texture generation failed: ${openaiError.message || 'Unknown error'}`
      });
    }

  } catch (error) {
    console.error('API endpoint error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
}

// All PBR maps are now generated directly by OpenAI DALL-E
// No need for fallback texture generation functions

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
}
