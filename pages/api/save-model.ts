import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

// CRITICAL: Remove body size limit for heavy models
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '500mb', // Support up to 500MB models
    },
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { fileName, data } = req.body;

    if (!fileName || !data) {
      return res.status(400).json({ message: 'Missing fileName or data' });
    }

    // Ensure public/models directory exists
    const modelsDir = path.join(process.cwd(), 'public', 'models');
    if (!fs.existsSync(modelsDir)) {
      fs.mkdirSync(modelsDir, { recursive: true });
    }

    // Convert array back to Buffer
    const buffer = Buffer.from(data);
    
    // Write file to public/models directory
    const filePath = path.join(modelsDir, fileName);
    fs.writeFileSync(filePath, buffer);

    console.log('Model saved to:', filePath);

    res.status(200).json({ 
      success: true, 
      message: 'Model saved successfully',
      url: `/models/${fileName}`
    });

  } catch (error) {
    console.error('Error saving model:', error);
    res.status(500).json({ 
      message: 'Failed to save model', 
      error: (error as Error).message 
    });
  }
}
