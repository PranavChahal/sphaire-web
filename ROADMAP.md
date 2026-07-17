# Public roadmap

This roadmap communicates direction, not a promise of dates. Priorities may change as
contributors uncover geometry, browser, or provider constraints.

## Now — reliability and trust

- Keep production dependency audits green and schedule framework upgrades before
  supported release lines reach end of life.
- Make selection, transforms, and edit-mode feedback predictable across primitives and
  imported model hierarchies.
- Improve import fidelity for materials, hierarchy, scale, and common GLB/GLTF/OBJ/STL
  edge cases.
- Expand deterministic recipes for frequently requested engineering parts.
- Keep creation, screenshot, vision, and provider operations bounded and cancellable.
- Strengthen geometry validation, DFM explanations, and best-effort labeling.
- Improve export correctness and round-trip tests.
- Grow unit tests around the store, generation pipeline, materials, and exporters.
- Stabilize self-hosting and managed deployment documentation.

## Next — deeper parametric workflows

- Expose parameters from generated construction code as first-class inspector controls.
- Add clearer construction history and feature-level regeneration.
- Improve face, edge, and vertex selection visualization and operations.
- Add robust undo/redo for topology edits, materials, imports, and generated revisions.
- Expand OpenCascade/Replicad wrapper coverage with documented, tested operations.
- Improve sketch constraints and dimensional editing.
- Add sidecar-aware OBJ/GLTF import workflows for external materials and textures.
- Add provider capability detection and model-specific guidance.

## Later — collaboration and extensibility

- Versioned Sphaire document format with migration support.
- Shareable projects and optional real-time collaboration that preserve local-first use.
- Plugin or recipe API for community geometry generators and fabrication profiles.
- Assemblies, joints, mates, interference checks, and structured bills of materials.
- Better STEP/IGES interoperability when browser kernel support is dependable.
- Batch generation and headless verification interfaces.
- Accessibility, touch, and lower-power-device improvements.

## Current non-goals

Sphaire does not currently claim to be:

- a certified manufacturing or safety-analysis system;
- a drop-in replacement for mature production CAD suites;
- a guaranteed converter from triangle meshes to exact parametric B-Rep history;
- a source of engineering approval without qualified human review.

## How priorities are chosen

Work is prioritized by:

1. data loss, security, or indefinitely stuck workflows;
2. geometry correctness and export trust;
3. core editor usability;
4. reproducible community requests with tests;
5. new capabilities that do not weaken the first four.

Open an issue with a concrete use case, example model or prompt, expected behavior, and
current result. Pull requests that include deterministic tests are easiest to review.
