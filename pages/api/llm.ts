/**
 * Unified OpenAI-compatible LLM proxy.
 *
 * One endpoint for chat / vision / embeddings so the browser never needs the
 * server's key. Works with OpenAI and any OpenAI-compatible backend (Together,
 * Groq, OpenRouter, vLLM) via `provider.baseUrl`.
 *
 * Key resolution order:
 *   1. `provider.apiKey` sent from the client (bring-your-own-key)
 *   2. server env key from the rotating pool / OPENAI_API_KEY
 */

import { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';
import { getKeyPool, initializeKeyPool } from '../../services/apiKeyPool';

export const config = { api: { bodyParser: { sizeLimit: '12mb' } } }; // vision images

function resolveKey(clientKey?: string): string {
  if (clientKey && clientKey.trim()) return clientKey.trim();
  const multi = process.env.OPENAI_API_KEYS;
  if (multi && multi.includes(',')) {
    const keys = multi.split(',').map((k) => k.trim()).filter(Boolean);
    if (keys.length > 1) {
      try {
        initializeKeyPool(keys);
      } catch {
        /* already initialized */
      }
      try {
        return getKeyPool().getNextKey();
      } catch {
        /* fall through */
      }
    }
  }
  return process.env.OPENAI_API_KEY || '';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { op, model, messages, input, options = {}, provider = {} } = req.body || {};

  const apiKey = resolveKey(provider.apiKey);
  if (!apiKey) return res.status(400).json({ error: 'No API key available (server or BYO).' });

  const client = new OpenAI({
    apiKey,
    baseURL: provider.baseUrl || undefined,
    timeout: 30000,
    maxRetries: 1,
  });

  try {
    if (op === 'chat') {
      const completion = await client.chat.completions.create({
        model: model || 'gpt-4o',
        messages,
        temperature: options.temperature ?? 0.2,
        max_tokens: options.maxTokens,
        ...(options.json ? { response_format: { type: 'json_object' } } : {}),
      });
      return res.status(200).json({ text: completion.choices[0]?.message?.content || '' });
    }

    if (op === 'vision') {
      // Map our VisionMessage[] into OpenAI multimodal content parts.
      const oaMessages = (messages || []).map((m: any) => ({
        role: m.role,
        content: [
          { type: 'text', text: m.text },
          ...(m.images || []).map((url: string) => ({
            type: 'image_url',
            image_url: { url, detail: 'low' },
          })),
        ],
      }));
      const completion = await client.chat.completions.create({
        model: model || 'gpt-4o',
        messages: oaMessages,
        temperature: options.temperature ?? 0.2,
        max_tokens: options.maxTokens ?? 800,
        ...(options.json ? { response_format: { type: 'json_object' } } : {}),
      });
      return res.status(200).json({ text: completion.choices[0]?.message?.content || '' });
    }

    if (op === 'embed') {
      const emb = await client.embeddings.create({
        model: model || 'text-embedding-3-small',
        input,
      });
      return res.status(200).json({ embeddings: emb.data.map((d) => d.embedding) });
    }

    return res.status(400).json({ error: `Unknown op: ${op}` });
  } catch (err: any) {
    console.error('[LLM-PROXY] error:', err?.message);
    return res.status(500).json({ error: err?.message || 'LLM request failed' });
  }
}
