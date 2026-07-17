/**
 * Unified AI provider types.
 *
 * Sphaire supports two ways of talking to models:
 *  - `openai`  : any OpenAI-compatible HTTP API (OpenAI, Together, Groq, OpenRouter,
 *                or a self-hosted vLLM). Calls are proxied through `/api/llm` so the
 *                key can come from the server env OR from a user-supplied "bring your
 *                own key" value.
 *  - `ollama`  : a fully-local runtime (http://localhost:11434). Calls go directly
 *                from the browser to the user's machine, so nothing leaves their box.
 *
 * The same three capabilities — chat, vision, embeddings — are expressed for both.
 */

export type ProviderKind = 'openai' | 'ollama';

export interface ProviderConfig {
  provider: ProviderKind;
  /** OpenAI-compatible API key (BYO). Ignored for ollama. */
  apiKey?: string;
  /**
   * Base URL override.
   *  - openai: defaults to https://api.openai.com/v1 (set for Together/Groq/OpenRouter/vLLM)
   *  - ollama: defaults to http://localhost:11434
   */
  baseUrl?: string;
  /** Text/code model, e.g. `gpt-4o`, `qwen2.5-coder:32b`. */
  chatModel: string;
  /** Multimodal model for the vision critic, e.g. `gpt-4o`, `llava:13b`. */
  visionModel: string;
  /** Embedding model, e.g. `text-embedding-3-small`, `nomic-embed-text`. */
  embeddingModel: string;
}

export type ChatRole = 'system' | 'user' | 'assistant';

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface VisionMessage {
  role: ChatRole;
  text: string;
  /** data: URLs or https URLs of images attached to this turn. */
  images?: string[];
}

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  /** Request a JSON object back (uses response_format when the provider supports it). */
  json?: boolean;
}

export const DEFAULT_OPENAI_CONFIG: ProviderConfig = {
  provider: 'openai',
  chatModel: 'gpt-4o',
  visionModel: 'gpt-4o',
  embeddingModel: 'text-embedding-3-small',
};

export const DEFAULT_OLLAMA_CONFIG: ProviderConfig = {
  provider: 'ollama',
  baseUrl: 'http://localhost:11434',
  chatModel: 'qwen2.5-coder:14b',
  visionModel: 'llava:13b',
  embeddingModel: 'nomic-embed-text',
};
