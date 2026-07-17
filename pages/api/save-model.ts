import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

// Cap upload size. (Note: on serverless/read-only hosts like Vercel, writes to
// public/ don't persist across invocations — this endpoint is for local/dev use or a
// long-lived server. Prefer object storage in production.)
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
  },
};

const ALLOWED_EXTENSIONS = new Set(['.glb', '.gltf', '.stl', '.obj', '.ply', '.step', '.stp']);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { fileName, data } = req.body;

    if (!fileName || typeof fileName !== 'string' || !data) {
      return res.status(400).json({ message: 'Missing fileName or data' });
    }

    // --- Harden against path traversal: strip any directory components, then
    // allowlist the extension, then verify the resolved path stays inside modelsDir.
    const safeName = path.basename(fileName).replace(/[^a-zA-Z0-9._-]/g, '_');
    const ext = path.extname(safeName).toLowerCase();
    if (!safeName || safeName.startsWith('.') || !ALLOWED_EXTENSIONS.has(ext)) {
      return res.status(400).json({ message: 'Invalid or unsupported file name' });
    }

    const modelsDir = path.join(process.cwd(), 'public', 'models');
    const filePath = path.join(modelsDir, safeName);
    const resolved = path.resolve(filePath);
    if (resolved !== filePath || !resolved.startsWith(path.resolve(modelsDir) + path.sep)) {
      return res.status(400).json({ message: 'Invalid file path' });
    }

    if (!fs.existsSync(modelsDir)) {
      fs.mkdirSync(modelsDir, { recursive: true });
    }

    const buffer = Buffer.from(data);
    fs.writeFileSync(resolved, buffer);

    console.log('Model saved to:', resolved);

    return res.status(200).json({
      success: true,
      message: 'Model saved successfully',
      url: `/models/${safeName}`,
    });
  } catch (error) {
    console.error('Error saving model:', error);
    return res.status(500).json({
      message: 'Failed to save model',
      error: (error as Error).message,
    });
  }
}
