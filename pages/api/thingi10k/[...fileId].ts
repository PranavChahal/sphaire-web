import { NextApiRequest, NextApiResponse } from 'next';

// Direct Supabase URL for the public bucket
const SUPABASE_BUCKET_URL = 'https://mvqfkhyxrcymuvorjeru.supabase.co/storage/v1/object/public/thingi10k';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { fileId } = req.query;
    
    if (!fileId || !Array.isArray(fileId)) {
      return res.status(400).json({ error: 'Invalid file ID' });
    }

    // Get the model number (first segment) and ensure it's a number
    const modelNumber = fileId[0];
    if (!/^\d+$/.test(modelNumber)) {
      return res.status(400).json({ error: 'Invalid model number' });
    }
    
    // Construct the URL to the model file
    const publicUrl = `${SUPABASE_BUCKET_URL}/${modelNumber}.stl`;
    
    console.log(' API: Requesting Thingi10K file from Supabase:', publicUrl);
    
    // Fetch the file from Supabase
    const response = await fetch(publicUrl);
    
    if (!response.ok) {
      console.error(' API: Failed to fetch file from Supabase:', response.status, response.statusText);
      return res.status(response.status).json({ 
        error: 'Failed to fetch file from Supabase',
        status: response.status,
        statusText: response.statusText,
        url: publicUrl
      });
    }

    // Get the content type from the response or determine from file extension
    let contentType = response.headers.get('content-type') || 'application/octet-stream';
    const fileName = `${modelNumber}.stl`;
    
    // Set headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);

    // Stream the response
    if (!response.body) {
      throw new Error('Response body is null');
    }
    
    const reader = response.body.getReader();
    const contentLength = response.headers.get('content-length') || '0';
    
    // Only set Content-Length if we have a valid value
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }

    // Stream the response
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
      res.end();
    } catch (error) {
      console.error('Error streaming response:', error);
      if (!res.headersSent) {
        res.status(500).end('Error streaming file');
      }
    }

  } catch (error) {
    console.error(' API: Thingi10K file serving error:', error);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        ...(process.env.NODE_ENV === 'development' && { stack: error instanceof Error ? error.stack : undefined })
      });
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
