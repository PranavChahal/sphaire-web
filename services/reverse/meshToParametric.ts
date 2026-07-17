/**
 * Mesh → parametric recovery.
 *
 * Turns a downloaded/imported mesh (e.g. a Thingi10k hit) into editable parametric CAD
 * code. Flow: deterministic descriptor (primitiveFitter) → LLM reconstructs code that
 * reproduces it in the chosen backend → the caller executes + validates against the
 * original's bounding box/volume. The result is a *remixable* model, not dead triangles.
 *
 * "Search Thingi10k → recover parametric → tweak parameters → re-export" is a workflow
 * no other tool offers.
 */

import { chat } from '../providers/llmProvider';
import { fitPrimitive, ShapeDescriptor } from './primitiveFitter';
import { buildRetrievedContext } from '../rag/generationMemory';

export interface RecoveryResult {
  ok: boolean;
  code?: string;
  descriptor: ShapeDescriptor;
  backend: 'opencascade' | 'replicad';
  notes?: string;
  error?: string;
}

const SYSTEM_OCC = `You reconstruct parametric CAD code from a geometric analysis of an existing mesh.
Use ONLY the occ.* wrapper API (occ.createBox, occ.createCylinder, occ.createSphere,
occ.createCone, occ.union, occ.difference, occ.translate, occ.rotate, etc.).
Rules:
- Declare every dimension as a named const at the top (make it parametric).
- Match the measured bounding box and dominant axis.
- Return ONLY executable JavaScript that returns a shape (or array of {shape,name}). No prose.`;

const SYSTEM_REPLICAD = `You reconstruct parametric CAD code from a geometric analysis of an existing mesh
using replicad (drawRectangle/drawCircle/.sketchOnPlane/.extrude/.revolve/.fillet/etc).
Rules:
- Declare every dimension as a named const at the top.
- Match the measured bounding box and dominant axis.
- Return ONLY executable JavaScript that returns a replicad Shape. No prose.`;

export async function recoverParametric(
  mesh: { positions: ArrayLike<number>; indices: ArrayLike<number> },
  backend: 'opencascade' | 'replicad' = 'opencascade',
  hint?: string
): Promise<RecoveryResult> {
  const descriptor = fitPrimitive(mesh);

  const analysis = [
    `Detected primitive: ${descriptor.primitive} (confidence ${descriptor.confidence.toFixed(2)})`,
    `Bounding box: ${descriptor.boundingBox.size.x.toFixed(2)} × ${descriptor.boundingBox.size.y.toFixed(2)} × ${descriptor.boundingBox.size.z.toFixed(2)}`,
    `Center: (${descriptor.boundingBox.center.x.toFixed(2)}, ${descriptor.boundingBox.center.y.toFixed(2)}, ${descriptor.boundingBox.center.z.toFixed(2)})`,
    `Volume ≈ ${descriptor.volume.toFixed(2)}, surface area ≈ ${descriptor.surfaceArea.toFixed(2)}`,
    descriptor.axis ? `Dominant axis: ${descriptor.axis.toUpperCase()}` : '',
    `Fit parameters: ${JSON.stringify(descriptor.params)}`,
    `Summary: ${descriptor.summary}`,
    hint ? `User hint about what this is: "${hint}"` : '',
  ]
    .filter(Boolean)
    .join('\n');

  try {
    const retrieved = await buildRetrievedContext(hint || descriptor.summary, backend);
    const raw = await chat(
      [
        { role: 'system', content: backend === 'replicad' ? SYSTEM_REPLICAD : SYSTEM_OCC },
        {
          role: 'user',
          content: `${retrieved}\nGeometric analysis of the mesh to reconstruct:\n${analysis}\n\nWrite parametric code that reproduces this shape as closely as possible. Return only the code.`,
        },
      ],
      { temperature: 0.2, maxTokens: 1200 }
    );

    const code = stripFences(raw);
    if (!code) return { ok: false, descriptor, backend, error: 'Model returned empty code.' };

    return {
      ok: true,
      code,
      descriptor,
      backend,
      notes:
        descriptor.confidence < 0.5
          ? 'Low-confidence fit — the recovered model is an approximation; refine parameters after review.'
          : undefined,
    };
  } catch (e: any) {
    return { ok: false, descriptor, backend, error: e?.message || 'Recovery failed' };
  }
}

function stripFences(s: string): string {
  let c = s.trim();
  if (c.startsWith('```')) {
    const nl = c.indexOf('\n');
    if (nl !== -1) c = c.slice(nl + 1);
  }
  if (c.endsWith('```')) c = c.slice(0, c.lastIndexOf('```'));
  return c.trim();
}
