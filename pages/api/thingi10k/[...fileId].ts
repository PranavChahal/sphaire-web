import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

const THINGI10K_BASE_PATH = '/Volumes/Untitled/Thingi10K';

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
    const fileIdStr = fileId.join('/');
    console.log('🔍 API: Requesting Thingi10K file:', fileIdStr);
    
    // Security: Ensure the path is within the Thingi10K directory
    const fullPath = path.resolve(THINGI10K_BASE_PATH, fileIdStr);
    if (!fullPath.startsWith(path.resolve(THINGI10K_BASE_PATH))) {
      console.error(' API: Path traversal attempt blocked:', fullPath);
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if file exists
    if (!fs.existsSync(fullPath)) {
      console.error(' API: File not found:', fullPath);
      return res.status(404).json({ error: 'File not found' });
    }

    // Get file stats
    const stats = fs.statSync(fullPath);
    if (!stats.isFile()) {
      console.error(' API: Not a file:', fullPath);
      return res.status(400).json({ error: 'Not a file' });
    }

    // Determine content type based on file extension
    const ext = path.extname(fullPath).toLowerCase();
    let contentType = 'application/octet-stream';
    
    switch (ext) {
      case '.stl':
        contentType = 'application/sla';
        break;
      case '.obj':
        contentType = 'text/plain';
        break;
      case '.ply':
        contentType = 'application/octet-stream';
        break;
      default:
        contentType = 'application/octet-stream';
    }

    // Set headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', stats.size);
    res.setHeader('Content-Disposition', `attachment; filename="${path.basename(fullPath)}"`);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour

    console.log(` API: Serving file: ${path.basename(fullPath)} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);

    // Stream the file
    const fileStream = fs.createReadStream(fullPath);
    fileStream.pipe(res);

    fileStream.on('error', (error) => {
      console.error(' API: Error streaming file:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error reading file' });
      }
    });

  } catch (error) {
    console.error(' API: Thingi10K file serving error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
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
