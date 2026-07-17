import type { Backend } from '../pipeline/enhancedBuilder';

/** Extract the first sensible tooth count near the word gear/cog/sprocket. */
export function extractGearTeeth(request: string): number | null {
  if (!/\b(gear|cog|sprocket)\b/i.test(request)) return null;
  const explicit = request.match(/\b(\d{1,3})\s*(?:-|\s)?(?:teeth|tooth)\b/i);
  const reverse = request.match(/\b(?:teeth|tooth)\s*(?:count\s*)?(?:of\s*)?(\d{1,3})\b/i);
  const value = Number(explicit?.[1] || reverse?.[1] || 24);
  return Math.max(6, Math.min(120, Math.round(value)));
}

/**
 * Proven templates for common parts where deterministic construction is more
 * reliable than asking an LLM to rediscover the wrapper API on every request.
 */
export function verifiedCADTemplate(request: string, backend: Backend): string | null {
  const teeth = extractGearTeeth(request);
  if (!teeth) return null;

  if (backend === 'replicad') return replicadGear(teeth);
  return occGear(teeth);
}

function occGear(teeth: number): string {
  return `const teeth = ${teeth};
const module = 0.4;
const thickness = 2;
const boreRadius = Math.max(0.8, module * teeth * 0.16);
const rootRadius = Math.max(module * 2, (module * (teeth - 2.5)) / 2);
const outerRadius = (module * (teeth + 2)) / 2;
const toothDepth = outerRadius - rootRadius;
const toothWidth = Math.max(module * 0.9, (2 * Math.PI * rootRadius / teeth) * 0.48);
const overlap = Math.max(0.08, module * 0.22);

let gear = occ.createCylinder(rootRadius, thickness);
const tooth = occ.createBox(toothDepth + overlap, toothWidth, thickness);
const positionedTooth = occ.translate(tooth, rootRadius - overlap, -toothWidth / 2, 0);

for (let index = 0; index < teeth; index += 1) {
  const rotatedTooth = occ.rotate(positionedTooth, { x: 0, y: 0, z: 1 }, index * (360 / teeth));
  gear = occ.union(gear, rotatedTooth);
}

const bore = occ.createCylinder(boreRadius, thickness + 0.4);
const centeredBore = occ.translate(bore, 0, 0, -0.2);
gear = occ.difference(gear, centeredBore);
return gear;`;
}

function replicadGear(teeth: number): string {
  return `const teeth = ${teeth};
const module = 0.4;
const thickness = 2;
const rootRadius = Math.max(module * 2, (module * (teeth - 2.5)) / 2);
const outerRadius = (module * (teeth + 2)) / 2;
const boreRadius = Math.max(0.8, module * teeth * 0.16);
const toothDepth = outerRadius - rootRadius;
const toothWidth = Math.max(module * 0.9, (2 * Math.PI * rootRadius / teeth) * 0.48);

let gear = makeCylinder(rootRadius, thickness);
for (let index = 0; index < teeth; index += 1) {
  const tooth = makeBox(toothDepth + 0.1, toothWidth, thickness)
    .translate([rootRadius - 0.1, -toothWidth / 2, 0])
    .rotate(index * (360 / teeth), [0, 0, 0], [0, 0, 1]);
  gear = gear.fuse(tooth);
}
const bore = makeCylinder(boreRadius, thickness + 0.4).translate([0, 0, -0.2]);
return gear.cut(bore);`;
}
