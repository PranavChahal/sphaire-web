import { NextApiRequest, NextApiResponse } from 'next';

// Direct Supabase URL for the public bucket
const BUCKET_URL = 'https://mvqfkhyxrcymuvorjeru.supabase.co/storage/v1/object/public/thingi10k';

// Log the bucket URL for debugging
console.log('Thingi10K Bucket URL:', BUCKET_URL);

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
    let filePath = fileId.join('/');
    console.log('🔍 API: Requesting Thingi10K file from Supabase:', filePath);
    
    // If the path includes 'raw_meshes', remove it since files are directly in the bucket
    if (filePath.includes('raw_meshes/')) {
      filePath = filePath.replace('raw_meshes/', '');
      console.log('🔧 Removed raw_meshes/ from path:', filePath);
    }
    
    let fileData = null;
    let foundPath = filePath;
    const extensions = ['', '.stl', '.obj'];
    
    // Try different file extensions
    for (const ext of extensions) {
      const currentPath = ext ? `${filePath}${ext}` : filePath;
      const publicUrl = `${BUCKET_URL}/${currentPath}`;
      
      console.log(`🔄 Attempting to fetch: ${publicUrl}`);
      
      try {
        const response = await fetch(publicUrl);
        if (response.ok) {
          fileData = await response.blob();
          foundPath = currentPath;
          console.log(`✅ Successfully downloaded file: ${currentPath}`);
          break;
        }
        console.log(`❌ Failed to fetch ${currentPath}: ${response.status} ${response.statusText}`);
      } catch (err) {
        console.error(`Error fetching ${currentPath}:`, err);
      }
    }
    
    if (!fileData) {
      return res.status(404).json({ 
        error: 'File not found',
        details: `Tried paths: ${extensions.map(ext => filePath + ext).join(', ')}`,
        publicUrl: `${BUCKET_URL}/${filePath}`
      });
    }
    
    const fileName = foundPath.split('/').pop() || 'model';
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    let contentType = 'application/octet-stream';
    
    // Set appropriate content type
    if (ext === 'stl') {
      contentType = 'application/sla';
    } else if (ext === 'obj') {
      contentType = 'text/plain';
    }
    
    // Set headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
    
    // Convert the Blob to a buffer and send it
    const buffer = await fileData.arrayBuffer();
    return res.status(200).send(Buffer.from(buffer));
  } catch (error: any) {
    console.error('Error in Thingi10K API:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
}

// Increase the API route timeout for large files
export const config = {
  api: {
    responseLimit: '100mb', // Allow large model files
    bodyParser: false, // Disable body parsing for file streaming
  },
};
