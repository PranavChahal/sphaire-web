# Architecture

Sphaire is a Next.js app where all geometry runs in the browser. This document maps the
AI pipeline added in v0.2. For the original OpenCascade prompt system, see
[`prompts/README-PROMPT-ENGINEERING.md`](prompts/README-PROMPT-ENGINEERING.md).

## Layers

```
UI (components/, pages/)
  └─ Zustand stores (store/): shapes, ui, aiSettings
       └─ Pipeline orchestrator (services/pipeline/enhancedBuilder.ts)
            ├─ Provider layer (services/providers/)         ← chat / vision / embed
            ├─ RAG flywheel (services/rag/)                 ← retrieve + remember
            ├─ Backends (services/backends/, occ*)          ← generate + execute
            ├─ Sandbox + validation (services/sandbox/)     ← safe exec + Manifold
            ├─ DFM (services/dfm/)                          ← deterministic rules
            ├─ Vision (services/vision/)                    ← render + critique
            ├─ Constraints (services/constraints/)          ← planegcs solver
            ├─ Generative mesh (services/generative/)       ← organic route
            ├─ Reverse (services/reverse/)                  ← mesh → parametric
            └─ Collab (services/collab/)                    ← Yjs code document
```

## The provider abstraction

Everything AI goes through `services/providers/llmProvider.ts`, which exposes three
capabilities — `chat`, `vision`, `embed` — over two provider kinds:

- **OpenAI-compatible** → proxied through `pages/api/llm.ts`. The key comes from the
  server env (default) or from a browser-supplied "bring your own key" value. Works
  with any OpenAI-compatible base URL.
- **Ollama** → called directly from the browser to `localhost:11434`, so nothing leaves
  the user's machine.

Config lives in `store/aiSettingsStore.ts` (persisted) and is editable via
`components/AISettingsPanel.tsx`. Every capability degrades gracefully: if vision or
embeddings are unavailable, that pipeline stage is skipped, never fatal.

## The closed loop

`enhancedBuild(request, options)` in `services/pipeline/enhancedBuilder.ts` is the entry
point. Sketch of the flow:

1. **Classify** the request (`organicClassifier`). Organic → try `generateMesh`; on
   success return a GLB, else fall back to parametric.
2. **Retrieve** proven examples for the prompt+backend (`generationMemory`) and prepend
   them to the system prompt.
3. **Generate** code — OpenCascade via the existing `/api/ai-code` (rich prompt system)
   or replicad via the provider `chat`.
4. **Iterate** up to `maxIterations`:
   - `safeExecuteOCC` / `replicadExecutor` — static-scan + timeout + execute → mesh.
   - `runDFM` — Manifold validity + deterministic manufacturability rules.
   - `critiqueScene` — render current scene from 4 angles, ask a VLM if it matches.
   - If DFM or vision object, their **machine-readable findings** become the fix prompt
     and we regenerate. If nothing objects, we converge.
5. **Remember** the converged (prompt, code, backend) tuple for the flywheel.

The caller injects `renderAndCapture()` (which uses `sceneCapture.ts` against the live
Babylon scene) so the pipeline stays decoupled from the renderer.

## Key integration seams (for wiring into UI)

- **Execution** → `services/occMainThreadExecutor.ts` `executeCode(code)` returns
  `{positions, indices}` or an array of `{positions, indices, position, name}`.
- **State** → `store/store.ts` (`addParametricShape`, `updateParametricParameters`); a
  `ParametricShape` already carries `constructionCode` + `parameters` + `metadata`.
- **Scene** → the live Babylon scene is published at `window.BABYLON_SCENE`.

## Determinism boundary

Generation (LLM) is probabilistic. **Validation and DFM are pure geometry math** —
`services/dfm/dfmRules.ts` (ray casting, Euler characteristic, overhang area) and
Manifold. The fixer only ever receives deterministic ground truth, which is what makes
the correction loop converge instead of thrash.
