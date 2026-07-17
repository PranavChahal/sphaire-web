-- Optional shared generation flywheel (Tier-1 ②).
-- Run this in Supabase (SQL editor) only if you want a team/hosted memory instead of
-- the default per-browser localStorage store. Requires the pgvector extension.

create extension if not exists vector;

-- 1536 dims = OpenAI text-embedding-3-small. Change if you embed with another model
-- (e.g. nomic-embed-text = 768). The column dim must match your embeddingModel.
create table if not exists generation_memory (
  id uuid primary key default gen_random_uuid(),
  prompt text not null,
  code text not null,
  backend text not null default 'opencascade',
  thumbnail text,
  embedding vector(1536),
  created_at timestamptz not null default now()
);

create index if not exists generation_memory_embedding_idx
  on generation_memory using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- Cosine-similarity retrieval used by SupabaseVectorStore.search().
create or replace function match_generations(query_embedding vector(1536), match_count int)
returns table (
  id uuid,
  prompt text,
  code text,
  backend text,
  thumbnail text,
  created_at timestamptz,
  similarity float
)
language sql stable
as $$
  select
    g.id, g.prompt, g.code, g.backend, g.thumbnail, g.created_at,
    1 - (g.embedding <=> query_embedding) as similarity
  from generation_memory g
  where g.embedding is not null
  order by g.embedding <=> query_embedding
  limit match_count;
$$;
