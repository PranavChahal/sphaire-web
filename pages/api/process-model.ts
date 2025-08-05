import { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';

export const config = {
  api: {
    bodyParser: false,
    sizeLimit: '500mb',
  },
};

// Manual OBJ parser for server-side processing
function parseOBJToJSON(objContent: string) {
  const lines = objContent.split('\n');
  const vertices: number[][] = [];
  const faces: number[][] = [];
  
  for (const line of lines) {
    const parts = line.trim().split(/\s+/);
    
    if (parts[0] === 'v') {
      // Vertex
      vertices.push([
        parseFloat(parts[1]) || 0,
        parseFloat(parts[2]) || 0,
        parseFloat(parts[3]) || 0
      ]);
    } else if (parts[0] === 'f') {
      // Face (convert to 0-based indexing)
      const face = parts.slice(1).map(vertex => {
        const vertexIndex = vertex.split('/')[0];
        return parseInt(vertexIndex) - 1;
      });
      faces.push(face);
    }
  }
  
  return { vertices, faces };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const form = formidable({
      maxFileSize: 500 * 1024 * 1024, // 500MB
      keepExtensions: true,
    });

    const [fields, files] = await form.parse(req);
    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    const extension = Array.isArray(fields.extension) ? fields.extension[0] : fields.extension;

    if (!file || !extension) {
      return res.status(400).json({ error: 'File and extension required' });
    }

    console.log('🚀 Processing model:', file.originalFilename, 'Extension:', extension);

    // Read file content
    const fileContent = fs.readFileSync(file.filepath);
    
    // Create processed directory if it doesn't exist
    const processedDir = path.join(process.cwd(), 'public', 'processed-models');
    if (!fs.existsSync(processedDir)) {
      fs.mkdirSync(processedDir, { recursive: true });
    }

    const timestamp = Date.now();
    const baseName = `processed-${timestamp}`;

    if (extension === '.obj') {
      // Parse OBJ and convert to JSON format
      const objText = fileContent.toString('utf-8');
      const parsedData = parseOBJToJSON(objText);
      
      // Save as JSON
      const jsonPath = path.join(processedDir, `${baseName}.json`);
      fs.writeFileSync(jsonPath, JSON.stringify(parsedData, null, 2));
      
      console.log('✅ OBJ processed and saved as JSON:', jsonPath);
      
      return res.status(200).json({
        success: true,
        type: 'parsed-obj',
        rootUrl: '/processed-models/',
        filename: `${baseName}.json`,
        originalName: file.originalFilename,
        vertices: parsedData.vertices.length,
        faces: parsedData.faces.length
      });
      
    } else {
      // For other formats, save directly and let client handle
      const outputPath = path.join(processedDir, `${baseName}${extension}`);
      fs.writeFileSync(outputPath, fileContent);
      
      console.log('✅ Model saved for direct import:', outputPath);
      
      return res.status(200).json({
        success: true,
        type: 'direct',
        rootUrl: '/processed-models/',
        filename: `${baseName}${extension}`,
        originalName: file.originalFilename,
        size: fileContent.length
      });
    }

  } catch (error) {
    console.error('❌ Model processing error:', error);
    return res.status(500).json({ 
      error: 'Model processing failed',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}
