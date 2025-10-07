/**
 * AI Meta-Function Service
 * Generates temporary specialized functions for complex objects
 */

export interface MetaFunction {
  name: string;
  code: string;
  description: string;
}

export interface MetaFunctionAnalysis {
  needsMetaFunctions: boolean;
  functions: MetaFunction[];
  reasoning: string;
}

/**
 * Analyze if the request needs custom helper functions
 */
export async function analyzeAndGenerateMetaFunctions(
  userRequest: string,
  refinedDescription: string,
  apiKey: string,
  researchData?: any
): Promise<MetaFunctionAnalysis> {
  try {
    console.log('[META-FUNC] Analyzing if custom functions needed...');
    
    // Build research context if available
    const researchContext = researchData ? `
## RESEARCH FINDINGS (Use this to guide your approach):

Object: ${researchData.objectName || userRequest}

Key Features: ${researchData.commonFeatures?.join(', ') || 'N/A'}
Main Parts: ${researchData.anatomy?.mainParts?.join(', ') || 'N/A'}
Details: ${researchData.anatomy?.details?.join(', ') || 'N/A'}
Visual Characteristics: ${researchData.visualCharacteristics?.join(', ') || 'N/A'}

STRATEGY: Use this research to determine:
1. What mathematical/geometric approach is needed
2. What level of detail is required
3. Which OpenCascade.js APIs are most appropriate
4. Minimum vertex/triangle count for visual accuracy
` : '';
    
    const systemPrompt = `You are an EXPERT CAD function architect with RESEARCH-DRIVEN decision making.

YOUR JOB: Analyze the request AND research data to decide the BEST approach for generating this object.

${researchContext}

## AVAILABLE BASE FUNCTIONS (59 total):
- Primitives: createBox, createCylinder, createSphere, createCone, createTorus, createWedge
- 2D Shapes: createRegularPolygon, createCircle, createEllipse, createArc, createLine, createHelix, createRoundedRectangle
- Specialized: createHexPrism, createThreadedCylinder, createKnurledCylinder, createSpring, createStar, createCountersunkHole, etc.
- Transforms: translate, rotate, scale, mirror
- Booleans: union, difference, intersection
- Edge Ops: chamfer, fillet
- Advanced: extrude, revolve, loft, pipe, shell, offset, thicken
- Patterns: circularPattern, linearPattern, rectangularPattern
- Utils: compound, getBoundingBox, getProperties, getFaces, getEdges

## QUALITY REQUIREMENTS (Learn from research):

Based on research findings, your generated functions MUST meet these standards:

1. **Vertex Count**:
   - Simple objects (box, cylinder): 100-500 vertices minimum
   - Complex objects (organic shapes): 1,000-5,000 vertices minimum
   - Highly detailed objects (intricate topology): 5,000-20,000 vertices

2. **Geometric Accuracy**:
   - Use parametric equations for mathematical surfaces
   - For complex topology (Klein bottle, etc.), use raw oc.* API with proper u,v parameterization
   - Create sufficient point grids (32x32 minimum for parametric surfaces)

3. **Visual Fidelity**:
   - Smooth curves require proper tessellation (use smaller linear deflection)
   - Match proportions from research findings
   - Include details mentioned in research (texture, features, etc.)

## WHEN TO CREATE META-FUNCTIONS:

**YES, create meta-functions** if research shows:
- Complex topology not achievable with base functions
- Repeated patterns or components
- Need for parametric surface control
- Mathematical/algorithmic generation required

**NO, use base functions** if research shows:
- Simple primitive combinations work
- Existing specialized functions match requirements

## OUTPUT FORMAT:

Return JSON ONLY:
{
  "needsMetaFunctions": true/false,
  "reasoning": "Brief explanation why",
  "functions": [
    {
      "name": "createCarWheel",
      "description": "Creates a car wheel with 5-spoke alloy rim and tire",
      "code": "function createCarWheel(occ, diameter, width, spokeCount) { ... }"
    }
  ]
}

CRITICAL: 
- If needsMetaFunctions is false, functions array should be empty
- Functions can use EITHER occ.* wrapper functions OR raw OpenCascade.js API (oc.*) directly
- For complex topology (Klein bottle, Mobius strip, etc.), use raw oc.* API for precision
- Functions should be parametric (take parameters)
- Code must be complete and executable
- Use 'oc' for raw OpenCascade API access: oc.BRepPrimAPI_MakeSphere, oc.gp_Pnt, etc.

EXAMPLES:

Request: "Create a sports car"
{
  "needsMetaFunctions": true,
  "reasoning": "Car has complex repeated components (wheels, doors, headlights) that would be tedious to recreate 4 times",
  "functions": [
    {
      "name": "createCarWheel",
      "description": "5-spoke alloy wheel with tire",
      "code": "function createCarWheel(occ, oc, diameter, width, spokeCount) { const rim = occ.createCylinder(diameter/2, width); const tire = occ.createTorus(diameter/2, width/3); let wheel = occ.union(rim, tire); const spoke = occ.createBox(0.2, diameter, width); const spokes = occ.circularPattern(spoke, spokeCount, 360/spokeCount); for(let s of spokes) { wheel = occ.union(wheel, s); } return wheel; }"
    },
    {
      "name": "createDoorHandle",
      "description": "Door handle with mounting plate",
      "code": "function createDoorHandle(occ, oc, length, height) { const handle = occ.createCylinder(0.3, length); const plate = occ.createBox(0.5, 0.2, height); return occ.union(handle, plate); }"
    }
  ]
}

Request: "Create a Klein bottle"
{
  "needsMetaFunctions": true,
  "reasoning": "Klein bottle requires complex parametric surface with non-orientable topology, best created with raw OpenCascade API",
  "functions": [
    {
      "name": "createKleinBottle",
      "description": "Creates Klein bottle using parametric surface equations",
      "code": "function createKleinBottle(occ, oc, height, radius) { /* Use oc.BRepBuilderAPI_MakePolygon, oc.gp_Pnt, etc. to construct parametric surface with u,v parameters for Klein bottle topology */ return kleinBottleShape; }"
    }
  ]
}

Request: "Create a bolt"
{
  "needsMetaFunctions": false,
  "reasoning": "Bolt can be built with base functions: createHexPrism + createThreadedCylinder + union",
  "functions": []
}`;

    const userPrompt = `Request: "${userRequest}"
Description: "${refinedDescription}"

Analyze if this needs custom meta-functions.

Return ONLY JSON, NO markdown, NO explanations.`;

    const response = await fetch('/api/ai-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: userPrompt,
        systemPrompt,
        apiKey
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    let code = data.code || data.response || '';
    
    console.log('[META-FUNC] Raw response:', code.substring(0, 200));
    
    // Extract JSON
    const jsonMatch = code.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      code = jsonMatch[0];
    }
    
    const cleaned = code
      .replace(/```json/g, '')
      .replace(/```javascript/g, '')
      .replace(/```/g, '')
      .trim();
    
    const result = JSON.parse(cleaned);
    
    console.log('[META-FUNC] Analysis complete:', result.needsMetaFunctions ? 'YES' : 'NO');
    console.log('[META-FUNC] Functions to generate:', result.functions?.length || 0);
    
    return result;
    
  } catch (error) {
    console.error('[META-FUNC] Failed to analyze:', error);
    
    // Fallback: assume no meta-functions needed
    return {
      needsMetaFunctions: false,
      reasoning: 'Analysis failed, using base functions only',
      functions: []
    };
  }
}

/**
 * Generate final code using meta-functions
 */
export async function generateCodeWithMetaFunctions(
  userRequest: string,
  metaFunctions: MetaFunction[],
  apiKey: string
): Promise<string> {
  try {
    console.log('[META-FUNC] Generating final code with', metaFunctions.length, 'helper functions...');
    
    // Build helper functions string
    const helperFunctionsCode = metaFunctions
      .map(f => `// Helper: ${f.description}\n${f.code}`)
      .join('\n\n');
    
    const systemPrompt = `You are an EXPERT CAD programmer with FULL OpenCascade.js access.

YOU HAVE ACCESS TO THESE CUSTOM HELPER FUNCTIONS:
${metaFunctions.map(f => `- ${f.name}: ${f.description}`).join('\n')}

USE THESE HELPERS to build the object efficiently!

HELPER FUNCTION CODE:
\`\`\`javascript
${helperFunctionsCode}
\`\`\`

ALSO AVAILABLE:
- All 59 base occ.* wrapper functions (createBox, createCylinder, union, etc.)
- Raw OpenCascade.js API via 'oc' global (oc.BRepPrimAPI_*, oc.gp_*, etc.)

CRITICAL RULES:
- Use the helper functions wherever appropriate
- Helpers take (occ, oc, ...params) as arguments - BOTH wrapper and raw API
- Example: const wheel = createCarWheel(occ, oc, 2, 0.5, 5);
- Helper functions have direct access to 'oc' for advanced geometry
- Use \`let\` for parameters that need validation, NOT \`const\`

**IMPORTANT - RETURN MULTIPLE PARTS (NOT MERGED):**
- If object has distinct parts (car: body, wheels, doors), return ARRAY of separate shapes
- Do NOT union/merge parts into one shape - keep them separate for individual selection
- Example: return [body, wheel1, wheel2, wheel3, wheel4, door1, door2];
- ONLY merge if parts must be physically connected (like a solid block)
- Separate parts = better user experience (can select/edit individually)

VALIDATION PATTERN:
\`\`\`javascript
// CORRECT (use let):
let width = 10;
if (width <= 0) width = 10;

// WRONG (const can't be reassigned):
const width = 10;
if (width <= 0) width = 10; // TypeError!
\`\`\`

OUTPUT: Pure JavaScript code, NO markdown blocks, NO explanations.`;

    const userPrompt = `Build: "${userRequest}"

Use the helper functions provided above to build this object efficiently.
You have access to 'occ' (wrapper API) and 'oc' (raw OpenCascade.js).

CRITICAL: Return ARRAY of separate parts (not merged) for multi-part objects!

Example structure for CAR (multiple parts):
// Use helpers for complex parts (pass both occ and oc)
const wheel1 = occ.translate(createCarWheel(occ, oc, 2, 0.5, 5), -3, 0, -1);
const wheel2 = occ.translate(createCarWheel(occ, oc, 2, 0.5, 5), 3, 0, -1);
const wheel3 = occ.translate(createCarWheel(occ, oc, 2, 0.5, 5), -3, 0, 1);
const wheel4 = occ.translate(createCarWheel(occ, oc, 2, 0.5, 5), 3, 0, 1);

// Use base functions for simple parts
const body = occ.createBox(10, 5, 3);
const door1 = occ.translate(occ.createBox(0.2, 2, 3), -5, 0, 0);
const door2 = occ.translate(occ.createBox(0.2, 2, 3), 5, 0, 0);

// Return array of separate parts (user can select each individually)
return [body, wheel1, wheel2, wheel3, wheel4, door1, door2];

Example for SINGLE OBJECT (e.g., box, sphere):
const box = occ.createBox(10, 10, 10);
return box; // Single object, no array needed`;

    const response = await fetch('/api/ai-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: userPrompt,
        systemPrompt,
        apiKey
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const generatedCode = (data.code || data.response || '').trim();
    
    // Prepend helper functions to the code
    const finalCode = `
// ========================================
// TEMPORARY HELPER FUNCTIONS (Auto-generated)
// ========================================

${helperFunctionsCode}

// ========================================
// MAIN CONSTRUCTION CODE
// ========================================

${generatedCode}
`;
    
    console.log('[META-FUNC] Final code generated with helpers');
    
    return finalCode;
    
  } catch (error) {
    console.error('[META-FUNC] Failed to generate code:', error);
    throw error;
  }
}
