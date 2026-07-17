/**
 * Client-side AI provider dispatcher.
 *
 * A single place the whole app calls for chat / vision / embeddings. It routes to:
 *   - OpenAI-compatible APIs  -> POST /api/llm  (server proxy; key from env or BYO)
 *   - Ollama                  -> direct browser fetch to the local runtime
 *
 * Everything degrades gracefully: if a capability is unavailable, callers get a
 * typed error they can catch and skip that stage of the pipeline.
 */

import {
  ProviderConfig,
  ChatMessage,
  VisionMessage,
  ChatOptions,
} from './types';
import { getProviderConfig } from '../../store/aiSettingsStore';

export class ProviderUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProviderUnavailableError';
  }
}

function resolveConfig(override?: Partial<ProviderConfig>): {
  config: ProviderConfig;
  useServerKey: boolean;
} {
  const { config, useServerKey } = getProviderConfig();
  return { config: { ...config, ...override }, useServerKey };
}

/** Plain text/code completion. */
export async function chat(
  messages: ChatMessage[],
  opts: ChatOptions = {},
  override?: Partial<ProviderConfig>
): Promise<string> {
  const { config, useServerKey } = resolveConfig(override);

  if (config.provider === 'ollama') {
    return ollamaChat(config, messages, opts);
  }
  return openaiProxyChat(config, useServerKey, messages, opts);
}

/** Multimodal completion (images + text). Used by the vision critic. */
export async function vision(
  messages: VisionMessage[],
  opts: ChatOptions = {},
  override?: Partial<ProviderConfig>
): Promise<string> {
  const { config, useServerKey } = resolveConfig(override);

  if (config.provider === 'ollama') {
    return ollamaVision(config, messages, opts);
  }
  return openaiProxyVision(config, useServerKey, messages, opts);
}

/** Embed a batch of strings into vectors. Used by the RAG retriever. */
export async function embed(
  input: string[],
  override?: Partial<ProviderConfig>
): Promise<number[][]> {
  const { config, useServerKey } = resolveConfig(override);

  if (config.provider === 'ollama') {
    return ollamaEmbed(config, input);
  }
  return openaiProxyEmbed(config, useServerKey, input);
}

// --------------------------------------------------------------------------
// OpenAI-compatible path (server proxy at /api/llm)
// --------------------------------------------------------------------------

async function callProxy(op: string, payload: any, config: ProviderConfig, useServerKey: boolean) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), op === 'vision' ? 35000 : 45000);
  let res: Response;
  try {
    res = await fetch('/api/llm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        op,
        ...payload,
        provider: {
          baseUrl: config.baseUrl,
          // only forward a key when the user opted out of the server key
          apiKey: useServerKey ? undefined : config.apiKey,
        },
      }),
    });
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      throw new ProviderUnavailableError(`${op === 'vision' ? 'Visual review' : 'AI request'} timed out.`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new ProviderUnavailableError(err.error || `LLM proxy failed (${res.status})`);
  }
  return res.json();
}

async function openaiProxyChat(
  config: ProviderConfig,
  useServerKey: boolean,
  messages: ChatMessage[],
  opts: ChatOptions
): Promise<string> {
  const data = await callProxy(
    'chat',
    { model: normalizeOpenAIModelId(config.chatModel), messages, options: opts },
    config,
    useServerKey
  );
  return data.text || '';
}

async function openaiProxyVision(
  config: ProviderConfig,
  useServerKey: boolean,
  messages: VisionMessage[],
  opts: ChatOptions
): Promise<string> {
  const data = await callProxy(
    'vision',
    { model: normalizeOpenAIModelId(config.visionModel), messages, options: opts },
    config,
    useServerKey
  );
  return data.text || '';
}

async function openaiProxyEmbed(
  config: ProviderConfig,
  useServerKey: boolean,
  input: string[]
): Promise<number[][]> {
  const data = await callProxy(
    'embed',
    { model: config.embeddingModel, input },
    config,
    useServerKey
  );
  return data.embeddings || [];
}

// --------------------------------------------------------------------------
// Ollama path (direct browser -> localhost, nothing leaves the machine)
// --------------------------------------------------------------------------

function ollamaBase(config: ProviderConfig): string {
  return (config.baseUrl || 'http://localhost:11434').replace(/\/$/, '');
}

async function ollamaChat(
  config: ProviderConfig,
  messages: ChatMessage[],
  opts: ChatOptions
): Promise<string> {
  const res = await fetch(`${ollamaBase(config)}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: config.chatModel,
      messages,
      stream: false,
      format: opts.json ? 'json' : undefined,
      options: { temperature: opts.temperature ?? 0.2 },
    }),
  }).catch(() => {
    throw new ProviderUnavailableError(
      'Cannot reach Ollama at ' + ollamaBase(config) + '. Is it running?'
    );
  });
  if (!res.ok) throw new ProviderUnavailableError(`Ollama chat failed (${res.status})`);
  const data = await res.json();
  return data.message?.content || '';
}

async function ollamaVision(
  config: ProviderConfig,
  messages: VisionMessage[],
  opts: ChatOptions
): Promise<string> {
  // Ollama wants raw base64 (no data: prefix) in an `images` array per message.
  const olMessages = messages.map((m) => ({
    role: m.role,
    content: m.text,
    images: (m.images || []).map(stripDataUrl),
  }));
  const res = await fetch(`${ollamaBase(config)}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: config.visionModel,
      messages: olMessages,
      stream: false,
      format: opts.json ? 'json' : undefined,
      options: { temperature: opts.temperature ?? 0.2 },
    }),
  }).catch(() => {
    throw new ProviderUnavailableError('Cannot reach Ollama for vision.');
  });
  if (!res.ok) throw new ProviderUnavailableError(`Ollama vision failed (${res.status})`);
  const data = await res.json();
  return data.message?.content || '';
}

async function ollamaEmbed(config: ProviderConfig, input: string[]): Promise<number[][]> {
  const out: number[][] = [];
  // Ollama's /api/embeddings is one-prompt-at-a-time.
  for (const text of input) {
    const res = await fetch(`${ollamaBase(config)}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: config.embeddingModel, prompt: text }),
    }).catch(() => {
      throw new ProviderUnavailableError('Cannot reach Ollama for embeddings.');
    });
    if (!res.ok) throw new ProviderUnavailableError(`Ollama embed failed (${res.status})`);
    const data = await res.json();
    out.push(data.embedding || []);
  }
  return out;
}

function stripDataUrl(s: string): string {
  const idx = s.indexOf('base64,');
  return idx >= 0 ? s.slice(idx + 'base64,'.length) : s;
}

/** Accept friendly entries such as "GPT-5.6 Sol" without sending an invalid ID. */
export function normalizeOpenAIModelId(model: string): string {
  const trimmed = (model || '').trim();
  if (/^gpt(?:[-\s]\d)/i.test(trimmed)) {
    return trimmed.toLowerCase().replace(/\s+/g, '-');
  }
  return trimmed;
}
