# Contributing to Sphaire

Thanks for helping build open-source, browser-native CAD. Contributions of every size
are welcome: bug reports, reproducible prompts, documentation, accessibility work,
tests, CAD recipes, provider integrations, and larger features.

## Before you start

- Search existing issues and pull requests before opening a duplicate.
- For a substantial feature or architectural change, open a focused proposal issue
  before investing in a large implementation.
- Report security problems privately using [SECURITY.md](SECURITY.md), not a public
  issue.
- Never commit API keys, private models, customer data, or third-party assets you do
  not have permission to redistribute.

## Local setup

Requirements:

- Node.js 20 or newer
- npm
- A WebGL-capable browser

```bash
git clone https://github.com/sphaire3d/shaire-web-V2-beta.git
cd shaire-web-V2-beta
npm install
cp .env.example .env.local
npm run dev
```

AI credentials are not required for manual editor work. Use placeholders in tests and
documentation; keep real credentials only in ignored local environment files.

## Development workflow

1. Fork the repository and create a descriptive branch from `main`.
2. Keep the change focused. Avoid unrelated formatting or dependency churn.
3. Add or update tests for behavior changes.
4. Update public documentation when behavior, configuration, or architecture changes.
5. Run the quality checks below.
6. Open a pull request explaining the problem, the chosen approach, and how it was
   verified.

```bash
npm run typecheck
npm test -- --runInBand
npm run build
```

## Pull-request checklist

- [ ] The change solves one clearly described problem.
- [ ] TypeScript passes without ignored errors.
- [ ] Supported tests pass.
- [ ] The production build completes.
- [ ] New optional capabilities degrade gracefully when unavailable.
- [ ] No keys, tokens, private URLs, or generated binaries are committed.
- [ ] User-visible changes include documentation or screenshots where useful.
- [ ] Geometry or DFM changes include representative test meshes or assertions.

## Engineering principles

### Keep geometry deterministic

LLMs may propose construction code, but geometry validation and manufacturability
checks must remain deterministic. An AI response must not decide whether a solid is
watertight or printable.

### Keep provider access centralized

New chat, vision, and embedding calls belong in
`services/providers/llmProvider.ts`. Feature code should not call a provider directly,
because that bypasses BYO-key, compatible endpoints, local Ollama, and timeout behavior.

### Fail optional systems gracefully

Vision, embeddings, organic mesh generation, Supabase memory, and other optional
systems should skip with a useful status when unavailable. They must not break manual
modeling or strand the UI in a loading state.

### Treat generated code as untrusted input

All generated CAD code must go through the sandbox/static-screening path and bounded
execution. Do not introduce a direct `eval` or `new Function` path outside the guarded
executor.

### Preserve editability

Prefer construction code and parameters over irreversible mesh-only output when the
geometry backend supports them. Imported meshes are valid workflows, but should remain
clearly distinguished from parametric solids.

## Repository map

| Area | Path |
| --- | --- |
| Studio shell and tools | `components/studio/` |
| Babylon.js viewport | `components/ViewportProduction.tsx` |
| Application state | `store/` |
| Closed-loop builder | `services/pipeline/enhancedBuilder.ts` |
| Provider abstraction | `services/providers/` and `pages/api/llm.ts` |
| CAD backends | `services/backends/` and `services/occMainThreadExecutor.ts` |
| Sandbox and geometry validation | `services/sandbox/` |
| DFM rules | `services/dfm/` |
| Visual review | `services/vision/` |
| Imports and exports | `hooks/useModelImport.ts`, `utils/exporters.ts` |
| Optional shared memory | `services/rag/`, `database/pgvector.sql` |

Read [ARCHITECTURE.md](ARCHITECTURE.md) before changing cross-layer behavior.

## Adding a deterministic CAD recipe

Common engineering parts can use a verified recipe instead of an unconstrained model
response.

1. Add the request matcher and construction code in
   `services/generative/verifiedTemplates.ts`.
2. Use only calls supported by the relevant backend wrapper.
3. Add parameter-extraction and template tests.
4. Confirm the result is committed even when DFM produces a review note.
5. Document a representative prompt in `docs/EXAMPLE_PROMPTS.md`.

## Adding a fabrication profile or DFM rule

Profiles live in `services/dfm/dfmRules.ts`. Rules are pure functions that take mesh
data and a fabrication profile and return structured findings.

- Use explicit units and thresholds.
- Distinguish errors, warnings, and information.
- Include a concrete remediation suggestion.
- Add small deterministic tests; do not call an LLM.

## Commit style

Use concise, imperative commit messages, for example:

```text
Fix imported model material targeting
Add SLA build-volume profile
Document Ollama self-hosting
```

By contributing, you agree that your contribution may be distributed under the
project's [MIT License](LICENSE).
