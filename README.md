# Sphaire

Sphaire is an open-source, browser-native 3D design studio. Describe a part in plain
English, create or import geometry, edit it visually, apply materials, inspect the
generated construction code, and export the result—all from the browser.

The project combines an AI-assisted workflow with real geometry tools. Parametric
models are built with OpenCascade or Replicad, displayed with Babylon.js, checked for
basic manufacturability, and kept editable instead of being reduced to a static image.

> Sphaire is early-stage software. It is useful for experimentation and rapid design,
> but generated models and manufacturability checks should be reviewed before making
> safety-critical or production parts.

## What you can do

- Create boxes, spheres, cylinders, and AI-generated parametric parts.
- Generate known parts such as spur gears with deterministic recipes.
- Import GLB, GLTF, OBJ, and STL models.
- Select, move, rotate, scale, resize, and edit mesh components.
- Apply colors, tune metallic and roughness values, upload image textures, or generate
  AI materials.
- Inspect and rebuild editable construction code.
- Check geometry and common FDM, SLA, and CNC manufacturability concerns.
- Export models for use in other 3D tools.
- Use an OpenAI-compatible provider or run supported models locally with Ollama.

## How the creation loop works

```text
Describe → classify → plan → build geometry → validate → check DFM → review → export
```

Sphaire routes engineering parts through a parametric CAD pipeline and can route more
organic requests through an optional mesh-generation provider. Every optional system
is designed to fail gracefully: missing vision, embeddings, or mesh generation should
not prevent the core editor from working.

## Quick start

Requirements:

- Node.js 18 or newer
- npm

```bash
git clone https://github.com/PranavChahal/shaire-web-V2-beta.git
cd shaire-web-V2-beta
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The development and production scripts copy the required Replicad WebAssembly asset
from `node_modules` automatically. Generated WASM output is not committed.

## AI setup

You have three options:

1. Add `OPENAI_API_KEY` to `.env.local` for the server-configured provider.
2. Open **Intelligence settings** in Sphaire and bring your own OpenAI-compatible API
   key and base URL. The key stays in that browser's local storage.
3. Choose **Local · Ollama** to use locally hosted chat, vision, and embedding models.

All environment variables are documented in [`.env.example`](.env.example). Never
commit `.env.local` or a real API key.

Optional organic mesh generation uses `REPLICATE_API_TOKEN` and `MESH_GEN_MODEL`.
Without them, Sphaire continues with its parametric workflow.

## Useful commands

```bash
npm run dev        # Start the local development server
npm run typecheck  # Check TypeScript
npm test           # Run the test suite
npm run build      # Create a production build
npm start          # Run the production build
```

## Project structure

| Area | Location |
| --- | --- |
| Studio interface | `components/studio/` |
| 3D viewport | `components/ViewportProduction.tsx` |
| Creation pipeline | `services/pipeline/` |
| CAD backends | `services/backends/`, `utils/occ-wrapper.ts` |
| Geometry validation and sandboxing | `services/sandbox/` |
| Manufacturability checks | `services/dfm/` |
| Provider integrations | `services/providers/`, `pages/api/llm.ts` |
| Visual review | `services/vision/` |
| Application state | `store/` |

For a deeper technical map, read [ARCHITECTURE.md](ARCHITECTURE.md). To contribute,
read [CONTRIBUTING.md](CONTRIBUTING.md).

## Open source means open

Sphaire is released under the [MIT License](LICENSE). You may use it for personal or
commercial work, copy it, modify it, fork it, redistribute it, include it in another
product, or sell software built with it. You do not need to ask us for permission.

The only license requirement is to keep the MIT copyright and permission notice with
copies or substantial portions of the software. The software is provided without a
warranty.

## Contributing

Issues, experiments, documentation improvements, new CAD recipes, fabrication
profiles, bug fixes, and pull requests are welcome. Please do not include secrets,
private models, or third-party assets you do not have permission to redistribute.

## License

[MIT](LICENSE) © 2026 Sphaire contributors.
