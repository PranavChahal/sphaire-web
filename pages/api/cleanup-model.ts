import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { fileName } = req.body;

    if (!fileName) {
      return res.status(400).json({ message: 'Missing fileName' });
    }

    // Only clean up temporary files (those starting with 'temp-')
    if (!fileName.startsWith('temp-')) {
      return res.status(400).json({ message: 'Can only clean up temporary files' });
    }

    // Construct file path
    const filePath = path.join(process.cwd(), 'public', 'models', fileName);

    // Check if file exists and delete it
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log('Cleaned up temporary model:', filePath);
    }

    res.status(200).json({ 
      success: true, 
      message: 'Model cleanup completed'
    });

  } catch (error) {
    console.error('Error cleaning up model:', error);
    res.status(500).json({ 
      message: 'Failed to cleanup model', 
      error: (error as Error).message 
    });
  }
}
