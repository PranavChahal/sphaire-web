import { NextApiRequest, NextApiResponse } from 'next';

/**
 * Image Proxy API Endpoint
 * 
 * Proxies external image URLs (like OpenAI DALL-E) to bypass CORS restrictions
 * This allows Babylon.js to load textures from OpenAI without CORS errors
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.query;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL parameter is required' });
  }

  try {
    // Validate that it's an OpenAI image URL for security
    if (!url.includes('oaidalleapiprodscus.blob.core.windows.net')) {
      return res.status(400).json({ error: 'Only OpenAI DALL-E image URLs are allowed' });
    }

    // Fetch the image from OpenAI
    const imageResponse = await fetch(url);
    
    if (!imageResponse.ok) {
      return res.status(imageResponse.status).json({ 
        error: `Failed to fetch image: ${imageResponse.statusText}` 
      });
    }

    // Get the image data as buffer
    const imageBuffer = await imageResponse.arrayBuffer();
    const buffer = Buffer.from(imageBuffer);

    // Set appropriate headers
    const contentType = imageResponse.headers.get('content-type') || 'image/png';
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
    res.setHeader('Access-Control-Allow-Origin', '*'); // Allow CORS
    
    // Send the image
    res.send(buffer);
    
  } catch (error) {
    console.error('Image proxy error:', error);
    res.status(500).json({ error: 'Failed to proxy image' });
  }
}
