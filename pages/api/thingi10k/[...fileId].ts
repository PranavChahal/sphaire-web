import { NextApiRequest, NextApiResponse } from 'next';

// Public storage base URL for Thingi10K models
const STORAGE_BASE_URL = 'https://mvqfkhyxrcymuvorjeru.supabase.co/storage/v1/object/public/thingi10k';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { fileId } = req.query;
    
    if (!fileId || !Array.isArray(fileId)) {
      return res.status(400).json({ error: 'Invalid file ID' });
    }

    // Reconstruct the file path from the route segments
    let fileIdStr = fileId.join('/');
    
    // Remove 'raw_meshes/' prefix if present (search index contains local paths)
    if (fileIdStr.startsWith('raw_meshes/')) {
      fileIdStr = fileIdStr.replace('raw_meshes/', '');
    }
    
    console.log('API: Requesting Thingi10K file:', fileIdStr);
    
    // Construct storage URL
    const storageUrl = `${STORAGE_BASE_URL}/${fileIdStr}`;
    
    // Fetch from storage
    const response = await fetch(storageUrl);
    
    if (!response.ok) {
      console.error('API: File not found in storage:', storageUrl);
      return res.status(404).json({ error: 'Model file not found' });
    }

    // Get file extension to determine content type
    const ext = fileIdStr.split('.').pop()?.toLowerCase();
    let contentType = 'application/octet-stream';
    
    switch (ext) {
      case 'stl':
        contentType = 'application/sla';
        break;
      case 'obj':
        contentType = 'text/plain';
        break;
      case 'ply':
        contentType = 'application/octet-stream';
        break;
      case 'glb':
      case 'gltf':
        contentType = 'model/gltf-binary';
        break;
      default:
        contentType = 'application/octet-stream';
    }

    // Set headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileIdStr.split('/').pop()}"`);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour

    const contentLength = response.headers.get('content-length');
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
      console.log(`API: Serving file: ${fileIdStr.split('/').pop()} (${(parseInt(contentLength) / 1024 / 1024).toFixed(2)} MB)`);
    }

    // Stream the response to client
    if (response.body) {
      const reader = response.body.getReader();
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
        res.end();
      } catch (streamError) {
        console.error('API: Error streaming file:', streamError);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Error streaming file' });
        }
      }
    } else {
      res.status(500).json({ error: 'No file data received' });
    }

  } catch (error) {
    console.error('API: File serving error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to fetch model file' });
    }
  }
}

// Increase the API route timeout for large files
export const config = {
  api: {
    responseLimit: '100mb', // Allow large model files
    bodyParser: false, // Disable body parsing for file streaming
  },
};
