/**
 * Pluggable vector store for the generation flywheel.
 *
 * Two backends implement the same interface:
 *   - LocalVectorStore   : cosine search in memory, persisted to localStorage.
 *                          Zero setup — works the moment you open the app.
 *   - SupabaseVectorStore : pgvector-backed, for a shared team/hosted flywheel.
 *
 * Records are (prompt, code, backend, screenshot?, embedding) tuples captured from
 * *successful* generations, then retrieved as few-shot context for future prompts.
 */

export interface GenerationRecord {
  id: string;
  prompt: string;
  code: string;
  backend: string; // 'opencascade' | 'replicad' | 'mesh'
  thumbnail?: string; // small data URL, optional
  createdAt: number;
  embedding?: number[];
}

export interface RetrievedRecord extends GenerationRecord {
  similarity: number;
}

export interface VectorStore {
  add(record: GenerationRecord): Promise<void>;
  search(embedding: number[], k: number): Promise<RetrievedRecord[]>;
  count(): Promise<number>;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

// ---------------------------------------------------------------------------
// Local (browser) store — the default, no infra required.
// ---------------------------------------------------------------------------

const LS_KEY = 'sphaire-generation-memory';
const MAX_LOCAL_RECORDS = 500;

export class LocalVectorStore implements VectorStore {
  private records: GenerationRecord[] = [];
  private loaded = false;

  private load() {
    if (this.loaded || typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(LS_KEY);
      if (raw) this.records = JSON.parse(raw);
    } catch {
      this.records = [];
    }
    this.loaded = true;
  }

  private persist() {
    if (typeof window === 'undefined') return;
    try {
      // keep newest N to bound localStorage usage
      const trimmed = this.records.slice(-MAX_LOCAL_RECORDS);
      window.localStorage.setItem(LS_KEY, JSON.stringify(trimmed));
      this.records = trimmed;
    } catch (e) {
      // localStorage full: drop thumbnails and retry once
      try {
        const slim = this.records.slice(-MAX_LOCAL_RECORDS).map((r) => ({ ...r, thumbnail: undefined }));
        window.localStorage.setItem(LS_KEY, JSON.stringify(slim));
        this.records = slim;
      } catch {
        /* give up silently */
      }
    }
  }

  async add(record: GenerationRecord): Promise<void> {
    this.load();
    this.records.push(record);
    this.persist();
  }

  async search(embedding: number[], k: number): Promise<RetrievedRecord[]> {
    this.load();
    return this.records
      .filter((r) => r.embedding && r.embedding.length === embedding.length)
      .map((r) => ({ ...r, similarity: cosineSimilarity(embedding, r.embedding!) }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, k);
  }

  async count(): Promise<number> {
    this.load();
    return this.records.length;
  }
}

// ---------------------------------------------------------------------------
// Supabase pgvector store — opt-in shared flywheel.
// Requires a `generation_memory` table with a `vector` column + an RPC
// `match_generations(query_embedding vector, match_count int)`. See db/pgvector.sql.
// ---------------------------------------------------------------------------

export class SupabaseVectorStore implements VectorStore {
  constructor(private supabase: any) {}

  async add(record: GenerationRecord): Promise<void> {
    await this.supabase.from('generation_memory').insert({
      prompt: record.prompt,
      code: record.code,
      backend: record.backend,
      thumbnail: record.thumbnail || null,
      embedding: record.embedding,
      created_at: new Date(record.createdAt).toISOString(),
    });
  }

  async search(embedding: number[], k: number): Promise<RetrievedRecord[]> {
    const { data, error } = await this.supabase.rpc('match_generations', {
      query_embedding: embedding,
      match_count: k,
    });
    if (error || !data) return [];
    return data.map((row: any) => ({
      id: row.id,
      prompt: row.prompt,
      code: row.code,
      backend: row.backend,
      thumbnail: row.thumbnail,
      createdAt: new Date(row.created_at).getTime(),
      similarity: row.similarity,
    }));
  }

  async count(): Promise<number> {
    const { count } = await this.supabase
      .from('generation_memory')
      .select('*', { count: 'exact', head: true });
    return count || 0;
  }
}
