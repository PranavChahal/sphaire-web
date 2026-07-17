# Contributing to Sphaire

Thanks for helping build browser-native AI CAD. This is early, fast-moving software —
issues and PRs of all sizes are welcome.

## Setup

```bash
npm install
cp .env.example .env.local     # add an OpenAI key, or use BYO-key / Ollama in the UI
npm run dev
```

Before opening a PR:

```bash
npm run typecheck   # tsc --noEmit — must be clean
npm run build       # must succeed
npm test            # jest
```

## Ground rules

- **Never commit secrets.** `.env.example` uses placeholders only. If you find real keys
  in history, report it and rotate — treat them as compromised.
- **New AI calls go through `services/providers/llmProvider.ts`.** Don't call OpenAI
  (or any provider) directly from feature code — that breaks BYO-key and Ollama support.
- **Degrade gracefully.** Any feature depending on vision / embeddings / a WASM module
  must no-op (not throw) when that capability is missing, so the pipeline keeps working.
- **Keep verification deterministic.** DFM and geometry checks (`services/dfm/`,
  `services/sandbox/geometryValidator.ts`) must not depend on an LLM.

## Where things live

| Area | Path |
|------|------|
| Pipeline orchestrator | `services/pipeline/enhancedBuilder.ts` |
| Providers (chat/vision/embed) | `services/providers/` + `pages/api/llm.ts` |
| RAG flywheel | `services/rag/` (+ `database/pgvector.sql`) |
| CAD backends | `services/backends/`, `services/occMainThreadExecutor.ts` |
| Geometry validation / sandbox | `services/sandbox/` |
| Manufacturability (DFM) | `services/dfm/` |
| Vision critic | `services/vision/` |
| Constraint solver | `services/constraints/` |
| Mesh generation (organic) | `services/generative/` + `pages/api/generate-mesh.ts` |
| Mesh → parametric | `services/reverse/` |
| Collaboration | `services/collab/`, `hooks/useCollabDocument.ts` |

See [`ARCHITECTURE.md`](ARCHITECTURE.md) for how they connect.

## Adding a fabrication profile (DFM)

Add an entry to `FAB_PROFILES` in `services/dfm/dfmRules.ts` with your process's
`minWallThickness`, `minFeatureSize`, `maxOverhangAngleDeg`, and `buildVolume`. New
rules are pure functions `(mesh, profile) => DFMFinding[]`; register them in
`services/dfm/dfmChecker.ts`.
