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

  // Strict allowlist by parsed host (not substring) to prevent SSRF.
  const ALLOWED_HOSTS = new Set([
    'oaidalleapiprodscus.blob.core.windows.net',
    'oaiusercontent.com',
  ]);

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  const hostAllowed =
    ALLOWED_HOSTS.has(parsed.hostname) ||
    [...ALLOWED_HOSTS].some((h) => parsed.hostname === h || parsed.hostname.endsWith('.' + h));

  if (parsed.protocol !== 'https:' || !hostAllowed) {
    return res.status(400).json({ error: 'Only OpenAI image URLs over HTTPS are allowed' });
  }

  try {
    // Fetch the image from the allowlisted host.
    const imageResponse = await fetch(parsed.toString());
    
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
