import fs from 'fs';
import path from 'path';

export class PromptContextService {
  private static instance: PromptContextService;
  private contextCache: Map<string, string> = new Map();
  private readonly contextPath = path.join(process.cwd(), 'prompts', 'context');
  private readonly templatesPath = path.join(process.cwd(), 'prompts', 'templates');

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

  buildSystemPrompt(backend: string = 'auto'): string {
    const projectOverview = this.loadContextFile('project-overview.md');
    const babylonPatterns = this.loadContextFile('babylonjs-patterns.md');
    const modelingEnvironment = this.loadContextFile('modeling-environment.md');
    const modelCategories = this.loadContextFile('model-categories.md');
    const visualQualityStandards = this.loadContextFile('visual-quality-standards.md');
    const templates = this.loadTemplate('code-generation.md');

    if (backend === 'opencascade') {
      return `${templates}

🚨 CRITICAL SYNTAX GUARD: If any line contains 'for ... in range' or a trailing 'for ...', answer with the literal string SYNTAX_ERROR and nothing else.

🚨 CRITICAL: GENERATE OPENCASCADE.JS CODE ONLY - NO BABYLON.JS CODE

## PROJECT CONTEXT
${projectOverview}

## MODELING ENVIRONMENT  
${modelingEnvironment}

## MODEL CATEGORIES
${modelCategories}

## VISUAL QUALITY STANDARDS
${visualQualityStandards}

## OPENCASCADE.JS PATTERNS & BEST PRACTICES
You are a parametric CAD modeling specialist using our custom OpenCascade.js wrapper.

🚨 CANONICAL JAVASCRIPT ARRAY PATTERNS (USE THESE EXACTLY):
\`\`\`javascript
const pts = Array.from({length: 6}, (_, i) => [
  radius * Math.cos(i * Math.PI / 3),
  radius * Math.sin(i * Math.PI / 3)
]);

const steps = Array.from({length: numSteps}, (_, i) => i / (numSteps - 1));

const coords = Array.from({length: count}, (_, i) => ({
  x: center.x + radius * Math.cos(i * angle),
  y: center.y + radius * Math.sin(i * angle),
  z: center.z + i * height
}));
\`\`\`

🚨 CRITICAL: Use ONLY the proven constructor patterns from Replicad/Cascade Studio research:

CORRECT CONSTRUCTOR PATTERNS (PROVEN WORKING):
- Geometry Creation: Use BRepBuilderAPI_MakeEdge_3(pnt1, pnt2) for lines
- Circle Creation: Use gp_Circ_2(axis, radius) → BRepBuilderAPI_MakeEdge_8(circleGp)
- Arc Creation: Use gp_Circ_2(axis, radius) → BRepBuilderAPI_MakeEdge_13(circle, startRad, endRad)
- Wire Building: Use BRepBuilderAPI_MakeWire_2(edge) for single edges
- Face Creation: Use BRepBuilderAPI_MakeFace_15(wire, false) for faces
- Point Creation: Use gp_Pnt_3(x, y, z) for 3D points
- Direction Creation: Use gp_Dir_4(x, y, z) for directions
- Axis Creation: Use gp_Ax2_3(point, direction) for coordinate systems

AVOID THESE BROKEN PATTERNS:
- GC_MakeSegment_1 + BRepBuilderAPI_MakeEdge_24 (causes Handle errors)
- GC_MakeCircle_3 with wrong parameters (parameter mismatch)
- GC_MakeArcOfCircle_4 + BRepBuilderAPI_MakeEdge_24 (complex chain errors)

MANDATORY PATTERNS:
- Use occ.createBox(), occ.createCylinder(), occ.createSphere() for primitives
- Use occ.extrude(), occ.revolve(), occ.sweep() for complex shapes
- Use occ.union(), occ.difference(), occ.intersect() for booleans
- Use occ.filletEdges(), occ.chamferEdges() for edge modifications
- Use occ.circularPattern(), occ.linearPattern() for repetition
- Always include tessellation: const tessellated = occ.tessellate(geometry);
- Use parametric variables for all dimensions
- NO Babylon.js patterns (no MeshBuilder, no BABYLON namespace)
- Focus on precision engineering geometry

AVAILABLE API FUNCTIONS:
- Primitives: createBox, createSphere, createCylinder, createCone, createTorus
- 2D Profiles: createCircle, createPolygon, createPolyline, createLine, createArc
- Sweeps: extrude, revolve, sweep, loft
- Transforms: translate, rotate, scale, mirror
- Booleans: union, difference, intersect
- Modifications: filletEdges, chamferEdges, shell, offset
- Patterns: circularPattern, linearPattern
- Utilities: makeCompound, tessellate

PROVEN OPENCASCADE.JS EXAMPLES:
\`\`\`javascript
const radius = 1.0;
const height = 3.0;
const cylinder = occ.createCylinder(radius, height); 
const tessellated = occ.tessellate(cylinder);

const centerPnt = new oc.gp_Pnt_3(0, 0, 0);
const normalDir = new oc.gp_Dir_4(0, 0, 1);
const axis = new oc.gp_Ax2_3(centerPnt, normalDir);
const circleGp = new oc.gp_Circ_2(axis, radius);
const edgeMaker = new oc.BRepBuilderAPI_MakeEdge_8(circleGp);
const wire = new oc.BRepBuilderAPI_MakeWire_2(edgeMaker.Edge());
\`\`\`

Remember: Generate ONLY OpenCascade.js code using our custom occ wrapper. NO Babylon.js code allowed.`;
    } else {
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
  }

  /**
   * Build enhanced user prompt with context injection
   */
  buildUserPrompt(userInput: string, type: 'model' | 'code' = 'model', backend: string = 'auto'): string {
    // Generate backend-specific prompts
    if (backend === 'opencascade') {
      const basePrompt = type === 'model' 
        ? `Generate OpenCascade.js code using the custom occ wrapper to create a parametric CAD model: "${userInput}"`
        : `Generate or enhance OpenCascade.js code for: "${userInput}"`;

      return `${basePrompt}

🚨 CRITICAL: YOU MUST GENERATE OPENCASCADE.JS CODE, NOT BABYLON.JS CODE

REQUIREMENTS:
- Use custom OpenCascade.js wrapper (occ) ONLY with PROVEN constructor patterns
- Use occ.createBox(), occ.createCylinder(), occ.createSphere() for primitives
- Use occ.extrude(), occ.revolve(), occ.union(), occ.difference() for complex shapes
- Use occ.filletEdges(), occ.circularPattern() for advanced features
- Include tessellation: occ.tessellate() for mesh conversion
- Use parametric modeling with variables
- NO Babylon.js patterns (no MeshBuilder, no BABYLON namespace)
- Focus on precision CAD geometry with proven constructor patterns from Replicad research
- Return immediately executable OCCT code

🚨 CRITICAL CONSTRUCTOR PATTERNS (PROVEN WORKING):
- Lines: BRepBuilderAPI_MakeEdge_3(pnt1, pnt2)
- Circles: gp_Circ_2(axis, radius) → BRepBuilderAPI_MakeEdge_8(circleGp)
- Arcs: gp_Circ_2(axis, radius) → BRepBuilderAPI_MakeEdge_13(circle, startRad, endRad)
- Wires: BRepBuilderAPI_MakeWire_2(edge)
- Points: gp_Pnt_3(x, y, z)
- Directions: gp_Dir_4(x, y, z)
- Avoid: GC_MakeSegment_1, GC_MakeCircle_3, GC_MakeArcOfCircle_4 patterns

AVAILABLE FUNCTIONS:
- Primitives: createBox, createSphere, createCylinder, createCone, createTorus
- 2D: createCircle, createPolygon, createLine, createArc
- Sweeps: extrude, revolve, sweep, loft
- Transforms: translate, rotate, scale, mirror
- Booleans: union, difference, intersect
- Modifications: filletEdges, chamferEdges, shell, offset
- Patterns: circularPattern, linearPattern
- Utilities: makeCompound, tessellate

EXAMPLE PATTERN:
\`\`\`javascript
// Create parametric cylinder with custom OpenCascade wrapper
const radius = 1.0;
const height = 3.0;
const cylinder = occ.createCylinder(radius, height);
const tessellated = occ.tessellate(cylinder);
\`\`\`

Focus on parametric, precision CAD modeling suitable for professional engineering workflows.`;
    } else {
      // Default Babylon.js prompts
      const basePrompt = type === 'model' 
        ? `Generate Babylon.js code to create a 3D model based on this specification: "${userInput}"`
        : `Generate or enhance Babylon.js code for: "${userInput}"`;

      return `${basePrompt}

REQUIREMENTS:
- Create all necessary meshes, materials, and positioning
- Use unique identifiers for all objects
- Apply appropriate materials and colors  
- Position objects logically in 3D space
- Ensure TypeScript compatibility
- Follow Sphaire architectural patterns
- Return immediately executable code

Focus on creating visually appealing, geometrically sound 3D objects suitable for a professional CAD environment.`;
    }
  }

  /**
   * Clear context cache (useful for development)
   */
  clearCache(): void {
    this.contextCache.clear();
  }
}

export default PromptContextService.getInstance();
