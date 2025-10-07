import fs from 'fs';
import path from 'path';

export class PromptContextService {
  private static instance: PromptContextService;
  private contextCache: Map<string, string> = new Map();
  private readonly contextPath = path.join(process.cwd(), 'prompts', 'context');
  private readonly templatesPath = path.join(process.cwd(), 'prompts', 'templates');
  private readonly examplesPath = path.join(process.cwd(), 'prompts', 'examples');
  private readonly enhancedPromptPath = path.join(process.cwd(), 'prompts');

  private constructor() {}

  static getInstance(): PromptContextService {
    if (!PromptContextService.instance) {
      PromptContextService.instance = new PromptContextService();
    }
    return PromptContextService.instance;
  }

  private loadContextFile(filename: string): string {
    const cacheKey = filename;
    
    if (this.contextCache.has(cacheKey)) {
      return this.contextCache.get(cacheKey)!;
    }

    try {
      const filePath = path.join(this.contextPath, filename);
      const content = fs.readFileSync(filePath, 'utf-8');
      this.contextCache.set(cacheKey, content);
      return content;
    } catch (error) {
      console.warn(`Failed to load context file: ${filename}`, error);
      return '';
    }
  }

  private loadTemplate(filename: string): string {
    try {
      const filePath = path.join(this.templatesPath, filename);
      return fs.readFileSync(filePath, 'utf-8');
    } catch (error) {
      console.warn(`Failed to load template: ${filename}`, error);
      return '';
    }
  }

  private loadExampleFile(filename: string): string {
    try {
      const filePath = path.join(this.examplesPath, filename);
      return fs.readFileSync(filePath, 'utf-8');
    } catch (error) {
      console.warn(`Failed to load example file: ${filename}`, error);
      return '';
    }
  }

  private loadEnhancedPrompt(filename: string): string {
    try {
      const filePath = path.join(this.enhancedPromptPath, filename);
      return fs.readFileSync(filePath, 'utf-8');
    } catch (error) {
      console.warn(`Failed to load enhanced prompt: ${filename}`, error);
      return '';
    }
  }

  private detectDomain(userInput: string): 'mechanical' | 'architectural' | 'general' {
    const input = userInput.toLowerCase();
    
    // Mechanical keywords
    const mechanicalKeywords = [
      'gear', 'bolt', 'nut', 'bearing', 'shaft', 'pulley', 'spring',
      'piston', 'engine', 'motor', 'wheel', 'axle', 'coupling',
      'flange', 'bracket', 'mount', 'screw', 'washer', 'pin',
      'valve', 'pump', 'turbine', 'rotor', 'blade'
    ];
    
    // Architectural keywords
    const architecturalKeywords = [
      'building', 'house', 'wall', 'door', 'window', 'roof',
      'stair', 'column', 'beam', 'floor', 'room', 'arch',
      'bridge', 'tower', 'truss', 'foundation', 'frame'
    ];
    
    for (const keyword of mechanicalKeywords) {
      if (input.includes(keyword)) return 'mechanical';
    }
    
    for (const keyword of architecturalKeywords) {
      if (input.includes(keyword)) return 'architectural';
    }
    
    return 'general';
  }

  buildSystemPrompt(backend: string = 'auto', userInput?: string): string {
    const projectOverview = this.loadContextFile('project-overview.md');
    const babylonPatterns = this.loadContextFile('babylonjs-patterns.md');
    const modelingEnvironment = this.loadContextFile('modeling-environment.md');
    const modelCategories = this.loadContextFile('model-categories.md');
    const visualQualityStandards = this.loadContextFile('visual-quality-standards.md');
    const templates = this.loadTemplate('code-generation.md');

    if (backend === 'opencascade') {
      // Load condensed prompt (optimized for token limits)
      const condensedPrompt = this.loadEnhancedPrompt('opencascade-condensed-prompt.md');
      
      // Detect domain for RAG-style context hints
      const domain = userInput ? this.detectDomain(userInput) : 'general';
      
      // Add targeted domain hints (lightweight)
      let domainHints = '';
      if (domain === 'mechanical') {
        domainHints = `\n\n## MECHANICAL DOMAIN HINTS\n- ISO bolt specs: M12 = 12mm dia, 18mm head, 7.5mm height\n- Gear formulas: pitch_dia = module × teeth, outer_r = (module × (teeth + 2)) / 2\n- Bearing components: inner race, outer race, balls in circular pattern\n- Standard keyway: width ≈ 0.25 × shaft diameter\n`;
      } else if (domain === 'architectural') {
        domainHints = `\n\n## ARCHITECTURAL DOMAIN HINTS\n- Door: 2.0-2.1m height, 0.8-0.9m width\n- Window: sill height 0.8-1.0m, height 1.2-1.5m\n- Stairs: riser 175-200mm, tread 250-300mm, formula: 2×riser + tread = 600-650mm\n- Walls: 200mm exterior, 100-150mm interior\n- Roof pitch: 30-45° typical\n`;
      }
      
      // Return condensed system (fits in token limit) with STRICT enforcement header
      return `\u26a0\ufe0f **CRITICAL: YOU HAVE EXACTLY 59 FUNCTIONS AVAILABLE - DO NOT INVENT ANY OTHERS!**

\u274c **FORBIDDEN**: createHexagonalBolt(), createGridOfBoxes(), createNullShape(), makeSmooth(), applyTexture(), labelKeys(), combine(), createThread()

\u2705 **USE ONLY THESE**: createBox, createCylinder, createSphere, createCone, createTorus, createWedge, createRegularPolygon (2D!), createHexPrism (3D!), createThreadedCylinder, createKnurledCylinder, createSpring, translate, rotate, union, difference, fillet, chamfer, etc.

**Full list in prompt below. If a function isn't listed, DON'T USE IT!**

---

${condensedPrompt}${domainHints}

---

## OUTPUT FORMAT REMINDER
- NO markdown \`\`\`javascript blocks
- NO explanations or comments before/after code
- ONLY executable JavaScript
- Use ONLY the 59 functions documented above
- Must return final shape

Example output:
const box = occ.createBox(10, 5, 3);
return box;`;
    }

    // Babylon.js system prompt
    return `${templates}

## PROJECT CONTEXT
${projectOverview}

## MODELING ENVIRONMENT
${modelingEnvironment}

## MODEL CATEGORIES
${modelCategories}

## VISUAL QUALITY STANDARDS
${visualQualityStandards}

## BABYLON.JS PATTERNS & BEST PRACTICES  
${babylonPatterns}

Remember: Always generate production-ready, TypeScript-compatible code that integrates seamlessly with the existing Sphaire architecture.`;
  }

  buildUserPrompt(userInput: string, type: 'model' | 'code' = 'model', backend: string = 'auto'): string {
    if (backend === 'opencascade') {
      const domain = this.detectDomain(userInput);
      
      // Brief domain hint
      let hint = '';
      if (domain === 'mechanical') {
        hint = ' (Recall: ISO standards, gear formulas, parametric relationships)';
      } else if (domain === 'architectural') {
        hint = ' (Recall: building codes, standard dimensions, proportions)';
      }
      
      const basePrompt = type === 'model'
        ? `Create parametric CAD model: "${userInput}"${hint}`
        : `Enhance code for: "${userInput}"${hint}`;

      return `${basePrompt}

Apply 6-phase framework: RECALL → CLASSIFY → DECOMPOSE → PLAN → VALIDATE → CODE

OUTPUT: Pure JavaScript only, NO markdown blocks, NO explanations.
- Define parameters
- Add validation (dimensions > 0)
- Use only occ.* functions
- Return final shape

Example:
const r = 5;
if (r <= 0) r = 1;
const cyl = occ.createCylinder(r, 10);
return cyl;`;
    }

    const basePrompt = type === 'model'
      ? `Generate Babylon.js code to create a 3D model based on this specification: "${userInput}"`
      : `Generate or enhance Babylon.js code for: "${userInput}"`;

    return basePrompt + `

CRITICAL: OUTPUT ONLY EXECUTABLE JAVASCRIPT CODE - NO MARKDOWN, NO EXPLANATIONS, NO CODE BLOCKS

REQUIREMENTS:
- Create all necessary meshes, materials, and positioning
- Use BABYLON.MeshBuilder for all meshes
- Use unique identifiers for all objects
- Apply appropriate materials and colors  
- Position objects logically in 3D space
- Store created meshes in an array called createdMeshes
- Return the array at the end
- NO markdown code blocks, NO explanations, ONLY executable JavaScript`;
  }

  /**
   * Build modification prompt for existing objects
   */
  buildModificationPrompt(
    userInput: string,
    selectedShape: any,
    sceneContext: string
  ): string {
    return `TASK: Modify existing object

${sceneContext}

USER REQUEST: "${userInput}"

GENERATE MODIFICATION FUNCTION:
Create a function that takes the existing shape and returns the modified shape.

function modifyShape(existingShape) {
  // 1. Create modification geometry (hole, slot, boss, etc.)
  // 2. Position it correctly relative to existing shape
  // 3. Apply boolean operation (difference, union, intersection)
  // 4. Return modified shape
  
  return modifiedShape;
}

EXAMPLES:

**Hole through object:**
function modifyShape(existingShape) {
  const holeRadius = 2.0;
  const holeHeight = 20; // Taller than object
  const hole = occ.createCylinder(holeRadius, holeHeight);
  const holeCentered = occ.translate(hole, centerX, centerY, -2);
  return occ.difference(existingShape, holeCentered);
}

**Slot on top:**
function modifyShape(existingShape) {
  const slotWidth = 5;
  const slotDepth = 2;
  const slot = occ.createBox(slotWidth, objectDepth + 2, slotDepth);
  const slotPos = occ.translate(slot, centerX - slotWidth/2, -1, objectHeight - slotDepth);
  return occ.difference(existingShape, slotPos);
}

**Add boss (cylindrical protrusion):**
function modifyShape(existingShape) {
  const bossRadius = 3;
  const bossHeight = 2;
  const boss = occ.createCylinder(bossRadius, bossHeight);
  const bossPos = occ.translate(boss, centerX, centerY, objectHeight);
  return occ.union(existingShape, bossPos);
}

**Multiple holes in pattern:**
function modifyShape(existingShape) {
  const hole = occ.createCylinder(1.5, 15);
  const holePos = occ.translate(hole, patternRadius, 0, -2);
  const holes = occ.circularPattern(holePos, 4, 90);
  return occ.difference(existingShape, holes);
}

OUTPUT: Only the modifyShape function, no explanations.`;
  }

  /**
   * Build transform prompt
   */
  buildTransformPrompt(
    userInput: string,
    selectedShape: any,
    sceneContext: string
  ): string {
    return `TASK: Transform existing object

${sceneContext}

USER REQUEST: "${userInput}"

CRITICAL: OUTPUT ONLY RAW JSON - NO CODE, NO MARKDOWN, NO EXPLANATIONS

Return ONLY a JSON object with transformation values:
{
  "position": { "x": 10, "y": 0, "z": 5 },
  "rotation": { "x": 0, "y": 45, "z": 0 },
  "scaling": { "x": 1.5, "y": 1.5, "z": 1.5 },
  "relative": true
}

RULES:
- Set property to null to keep current value
- relative: true = add to current values, false = set absolute
- Rotation in DEGREES (not radians)
- CRITICAL: Pay attention to axis specification (X, Y, or Z)
- X-axis: roll (around horizontal axis)
- Y-axis: pitch (around vertical axis)  
- Z-axis: yaw (around depth axis)
- For "rotate 45 degrees" with NO axis specified, use Z-axis as default
- NO JavaScript code, NO occ.* functions, NO calculations - ONLY JSON

EXAMPLES:

"rotate it 45 degrees":
{"rotation": {"x": 0, "y": 0, "z": 45}, "relative": true}

"rotate 45 degrees around X axis":
{"rotation": {"x": 45, "y": 0, "z": 0}, "relative": true}

"rotate 90 degrees around Y axis":
{"rotation": {"x": 0, "y": 90, "z": 0}, "relative": true}

"rotate around Z axis by 30 degrees":
{"rotation": {"x": 0, "y": 0, "z": 30}, "relative": true}

"move it 10 units to the right":
{"position": {"x": 10, "y": 0, "z": 0}, "relative": true}

"position at (5, 5, 10)":
{"position": {"x": 5, "y": 5, "z": 10}, "relative": false}

"scale by 150%":
{"scaling": {"x": 1.5, "y": 1.5, "z": 1.5}, "relative": false}

"make it twice as big":
{"scaling": {"x": 2, "y": 2, "z": 2}, "relative": false}

OUTPUT: Only the JSON object, nothing else.`;
  }

  /**
   * Build parameter update prompt
   */
  buildParameterUpdatePrompt(
    userInput: string,
    selectedShape: any,
    parameter: string,
    value: number
  ): string {
    return `TASK: Update parametric shape parameters

SHAPE: ${selectedShape.name || selectedShape.id}
TYPE: ${selectedShape.shapeType || selectedShape.type}
CURRENT PARAMETERS: ${JSON.stringify(selectedShape.parameters || {})}

USER REQUEST: "${userInput}"
DETECTED UPDATE: ${parameter} = ${value}

RETURN JSON:
{
  "${parameter}": ${value}
}

If multiple parameters need updating, include all.

OUTPUT: Only JSON, no explanations.`;
  }

  /**
   * Clear context cache (useful for development)
   */
  clearCache(): void {
    this.contextCache.clear();
  }
}

export default PromptContextService.getInstance();
