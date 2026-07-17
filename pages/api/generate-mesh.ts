/**
 * Text -> 3D mesh generation route.
 *
 * Runs an open image-to-3D model on Replicate (TRELLIS / Hunyuan3D-2 / Stable Fast 3D)
 * or any self-hosted endpoint. Pipeline: prompt -> image (OpenAI) -> 3D (Replicate) -> GLB.
 *
 * Configuration (env, all optional — route returns 501 with guidance if unset):
 *   REPLICATE_API_TOKEN   Replicate token (or send `apiToken` in the body for BYO)
 *   MESH_GEN_MODEL        Replicate model "owner/name:version" (image-to-3D)
 *   MESH_GEN_INPUT_KEY    input field name for the image (default: "images")
 *
 * This keeps the heavy, provider-specific bits server-side and out of the client bundle.
 */

import { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';

export const config = { api: { bodyParser: { sizeLimit: '4mb' } } };

async function generateConceptImage(prompt: string): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY || (process.env.OPENAI_API_KEYS || '').split(',')[0]?.trim();
  if (!key) return null;
  try {
    const client = new OpenAI({ apiKey: key });
    const img = await client.images.generate({
      model: 'dall-e-3',
      prompt: `A single ${prompt}, centered, plain neutral background, full object visible, product photo, no text.`,
      n: 1,
      size: '1024x1024',
      response_format: 'b64_json',
    });
    const b64 = img.data?.[0]?.b64_json;
    return b64 ? `data:image/png;base64,${b64}` : null;
  } catch (e) {
    console.warn('[MESH-GEN] concept image failed:', e);
    return null;
  }
}

async function replicateImageTo3D(
  token: string,
  model: string,
  imageDataUrl: string
): Promise<string | null> {
  const inputKey = process.env.MESH_GEN_INPUT_KEY || 'images';
  const version = model.includes(':') ? model.split(':')[1] : model;

  // Some models accept a single "image", others an array "images"; support both.
  const inputValue = inputKey === 'images' ? [imageDataUrl] : imageDataUrl;

  const createRes = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ version, input: { [inputKey]: inputValue } }),
  });
  if (!createRes.ok) {
    throw new Error(`Replicate create failed (${createRes.status}): ${await createRes.text()}`);
  }
  let prediction = await createRes.json();

  // Poll until the prediction settles.
  const started = Date.now();
  while (prediction.status !== 'succeeded' && prediction.status !== 'failed') {
    if (Date.now() - started > 180000) throw new Error('Mesh generation timed out (3 min).');
    await new Promise((r) => setTimeout(r, 2500));
    const poll = await fetch(prediction.urls.get, { headers: { Authorization: `Bearer ${token}` } });
    prediction = await poll.json();
  }
  if (prediction.status === 'failed') {
    throw new Error(`Replicate prediction failed: ${prediction.error || 'unknown'}`);
  }

  // Output is usually a GLB URL (or an object containing one).
  const out = prediction.output;
  const glbUrl =
    typeof out === 'string'
      ? out
      : out?.model_file || out?.glb || (Array.isArray(out) ? out.find((u: string) => /\.glb/i.test(u)) : null);
  if (!glbUrl) throw new Error('No GLB in model output.');
  return glbUrl;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { prompt, apiToken } = req.body || {};
  if (!prompt) return res.status(400).json({ error: 'prompt required' });

  const token = (apiToken && apiToken.trim()) || process.env.REPLICATE_API_TOKEN;
  const model = process.env.MESH_GEN_MODEL;

  if (!token || !model) {
    return res.status(501).json({
      error:
        'Mesh generation not configured. Set REPLICATE_API_TOKEN and MESH_GEN_MODEL (an image-to-3D model version) on the server, or paste a Replicate token in AI settings.',
    });
  }

  try {
    const image = await generateConceptImage(prompt);
    if (!image) {
      return res.status(500).json({ error: 'Could not create a concept image (OpenAI key missing?).' });
    }
    const glbUrl = await replicateImageTo3D(token, model, image);
    if (!glbUrl) return res.status(500).json({ error: 'Mesh generation produced no output.' });

    // Fetch the GLB and inline it as a data URL so the client can load it directly.
    const glbRes = await fetch(glbUrl);
    const buf = Buffer.from(await glbRes.arrayBuffer());
    const glbDataUrl = `data:model/gltf-binary;base64,${buf.toString('base64')}`;

    return res.status(200).json({ glbDataUrl });
  } catch (e: any) {
    console.error('[MESH-GEN] error:', e?.message);
    return res.status(500).json({ error: e?.message || 'Mesh generation failed' });
  }
}
