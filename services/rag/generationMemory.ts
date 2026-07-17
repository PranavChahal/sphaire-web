/**
 * Generation memory — the self-improving flywheel.
 *
 * Replaces static keyword→examples matching with real semantic retrieval. Every
 * successful generation is embedded and stored; future prompts retrieve the nearest
 * proven examples and inject them as few-shot context. The corpus that results is
 * also exactly the dataset you'd fine-tune an open code model on later.
 */

import { embed } from '../providers/llmProvider';
import {
  VectorStore,
  LocalVectorStore,
  SupabaseVectorStore,
  GenerationRecord,
  RetrievedRecord,
} from './vectorStore';

let store: VectorStore = new LocalVectorStore();

/** Swap in the shared pgvector store (call once after creating a supabase client). */
export function useSupabaseMemory(supabase: any) {
  store = new SupabaseVectorStore(supabase);
}

/** Force back to the local store (default). */
export function useLocalMemory() {
  store = new LocalVectorStore();
}

async function embedOne(text: string): Promise<number[] | null> {
  try {
    const [v] = await embed([text]);
    return v && v.length ? v : null;
  } catch {
    return null; // embeddings unavailable -> flywheel silently disabled
  }
}

/** Record a proven-good generation. Safe to call fire-and-forget. */
export async function rememberGeneration(input: {
  prompt: string;
  code: string;
  backend: string;
  thumbnail?: string;
}): Promise<void> {
  const embedding = await embedOne(input.prompt);
  if (!embedding) return;
  const record: GenerationRecord = {
    id: `gen-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    prompt: input.prompt,
    code: input.code,
    backend: input.backend,
    thumbnail: input.thumbnail,
    createdAt: Date.now(),
    embedding,
  };
  try {
    await store.add(record);
  } catch (e) {
    console.warn('[GEN-MEMORY] add failed:', e);
  }
}

/** Retrieve nearest proven examples for a new prompt. */
export async function retrieveExamples(
  prompt: string,
  k = 3,
  minSimilarity = 0.75
): Promise<RetrievedRecord[]> {
  const embedding = await embedOne(prompt);
  if (!embedding) return [];
  try {
    const hits = await store.search(embedding, k);
    return hits.filter((h) => h.similarity >= minSimilarity);
  } catch (e) {
    console.warn('[GEN-MEMORY] search failed:', e);
    return [];
  }
}

/**
 * Build a few-shot context block from retrieved examples, ready to prepend to a
 * system prompt. Returns '' when the flywheel is empty/unavailable.
 */
export async function buildRetrievedContext(prompt: string, backend: string): Promise<string> {
  const hits = (await retrieveExamples(prompt)).filter((h) => h.backend === backend);
  if (hits.length === 0) return '';
  const blocks = hits
    .map(
      (h, i) =>
        `### Proven example ${i + 1} (similarity ${h.similarity.toFixed(2)})\n` +
        `Request: ${h.prompt}\n\`\`\`javascript\n${h.code.trim()}\n\`\`\``
    )
    .join('\n\n');
  return `\n\n## RETRIEVED PROVEN EXAMPLES (these executed successfully before — adapt them)\n${blocks}\n`;
}

export async function memorySize(): Promise<number> {
  try {
    return await store.count();
  } catch {
    return 0;
  }
}
