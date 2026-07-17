/**
 * Route decision: parametric B-rep (OpenCascade/replicad) vs generative mesh.
 *
 * OCCT is perfect for gears, brackets, enclosures — anything with exact dimensions and
 * manufacturability. It's hopeless for "a dragon" or "a low-poly fox". Open-weight
 * image/text-to-3D models (TRELLIS, Hunyuan3D-2, Stable Fast 3D) are the reverse. The
 * app already has an intent detector for CRUD ops; this adds the orthogonal axis of
 * *what kind of geometry* is being asked for.
 *
 * Cheap keyword heuristic first (instant, offline); an LLM tie-breaker is available for
 * ambiguous prompts.
 */

import { chat, ProviderUnavailableError } from '../providers/llmProvider';

export type GeometryClass = 'parametric' | 'organic';

export interface Classification {
  cls: GeometryClass;
  confidence: number;
  reason: string;
}

const ENGINEERING = [
  'gear', 'bolt', 'nut', 'bracket', 'flange', 'bearing', 'shaft', 'screw', 'washer',
  'enclosure', 'box', 'case', 'mount', 'plate', 'housing', 'pulley', 'coupling',
  'pipe', 'fitting', 'valve', 'hinge', 'clip', 'spacer', 'standoff', 'gasket',
  'wheel', 'rim', 'frame', 'beam', 'panel', 'lid', 'container', 'tray', 'rack',
  'thread', 'knob', 'handle', 'grommet', 'bushing', 'cog', 'sprocket', 'nozzle',
  'wall', 'door', 'window', 'stair', 'column', 'truss', 'building', 'table', 'chair',
  'cube', 'cylinder', 'sphere', 'cone', 'torus', 'prism', 'hexagon', 'tube', 'ring',
];

const ORGANIC = [
  'dragon', 'animal', 'creature', 'character', 'figurine', 'statue', 'bust',
  'face', 'head', 'body', 'human', 'person', 'fox', 'cat', 'dog', 'bird', 'fish',
  'tree', 'plant', 'flower', 'rock', 'terrain', 'monster', 'alien', 'robot toy',
  'sculpture', 'organic', 'toy', 'doll', 'skull', 'hand', 'dinosaur', 'insect',
  'mushroom', 'coral', 'cartoon', 'stylized', 'low-poly', 'lowpoly', 'game asset',
];

export function classifyHeuristic(prompt: string): Classification {
  const p = prompt.toLowerCase();
  let eng = 0;
  let org = 0;
  for (const k of ENGINEERING) if (p.includes(k)) eng++;
  for (const k of ORGANIC) if (p.includes(k)) org++;

  if (eng === 0 && org === 0) {
    return { cls: 'parametric', confidence: 0.4, reason: 'No strong signal; defaulting to parametric.' };
  }
  if (eng >= org) {
    return {
      cls: 'parametric',
      confidence: Math.min(0.95, 0.6 + 0.1 * (eng - org)),
      reason: `Engineering vocabulary (${eng} vs ${org}).`,
    };
  }
  return {
    cls: 'organic',
    confidence: Math.min(0.95, 0.6 + 0.1 * (org - eng)),
    reason: `Organic/artistic vocabulary (${org} vs ${eng}).`,
  };
}

/** Heuristic first; LLM tie-break only when the keyword signal is weak. */
export async function classifyGeometry(prompt: string): Promise<Classification> {
  const h = classifyHeuristic(prompt);
  if (h.confidence >= 0.7) return h;

  try {
    const raw = await chat(
      [
        {
          role: 'system',
          content:
            'Classify a 3D-model request as "parametric" (mechanical/architectural, exact dimensions, manufacturable — best made with a CAD kernel) or "organic" (characters, animals, sculptures, stylized art — best made with a generative mesh model). Reply with only one word: parametric or organic.',
        },
        { role: 'user', content: prompt },
      ],
      { temperature: 0, maxTokens: 4 }
    );
    const word = raw.trim().toLowerCase();
    if (word.includes('organic')) return { cls: 'organic', confidence: 0.85, reason: 'LLM classified as organic.' };
    if (word.includes('parametric')) return { cls: 'parametric', confidence: 0.85, reason: 'LLM classified as parametric.' };
  } catch (e) {
    if (!(e instanceof ProviderUnavailableError)) console.warn('[CLASSIFY] LLM tie-break failed:', e);
  }
  return h;
}
