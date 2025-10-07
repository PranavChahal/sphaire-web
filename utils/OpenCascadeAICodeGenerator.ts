/**
 * OpenCascade AI Code Generator
 * Integrates with LLM APIs to generate precise OpenCascade.js code
 */

export interface CodeGenerationRequest {
  userPrompt: string;
  context?: string;
  complexity?: 'simple' | 'moderate' | 'complex';
}

export interface CodeGenerationResponse {
  analysis: string;
  parameters: Record<string, number>;
  constructionSteps: string[];
  code: string;
  estimatedComplexity: string;
}

export interface AIConfig {
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * System prompt for OpenCascade code generation
 */
const SYSTEM_PROMPT = `You are an expert CAD engineer and OpenCascade.js developer. Your task is to generate precise, executable OpenCascade.js code based on user requests.

## Core Principles

1. **Decomposition First**: Break down complex objects into logical components before coding
2. **Parametric Thinking**: Always use parameters that can be adjusted
3. **Precise API Usage**: Use exact constructor signatures verified for OpenCascade.js 2.0.0-beta
4. **Structured Planning**: Plan the construction steps before writing code

## Critical API Patterns (MUST FOLLOW)

### Triangulation (3 Parameters Required)
\`\`\`javascript
const location = new oc.TopLoc_Location_1();
const triangulation = oc.BRep_Tool.Triangulation(face, location, 0); // 0 = Poly_MeshPurpose_NONE
const tri = triangulation.get();
\`\`\`

### Box Creation (4 Parameters Required)
\`\`\`javascript
const origin = new oc.gp_Pnt_3(0, 0, 0);
const box = new oc.BRepPrimAPI_MakeBox_3(origin, width, height, depth);
\`\`\`

### Wire Creation from Points
\`\`\`javascript
// For 3 points (triangular)
const poly = new oc.BRepBuilderAPI_MakePolygon_3(p1, p2, p3, true);
const wire = poly.Wire();
\`\`\`

## Available Helper Functions

Use the \`occ\` object:
- occ.createBox(width, height, depth)
- occ.createCylinder(radius, height)
- occ.createSphere(radius)
- occ.createCone(radius1, radius2, height)
- occ.createTorus(majorRadius, minorRadius)
- occ.createPoint(x, y, z)
- occ.createPolygonWire(points)
- occ.createFace(wire)
- occ.translate(shape, x, y, z)
- occ.rotate(shape, axis, angleDegrees)
- occ.union(shape1, shape2)
- occ.difference(shape1, shape2)
- occ.extrude(face, direction, distance)

## Response Format

Respond with a JSON object:
{
  "analysis": "Break down the object into components",
  "parameters": { "param1": value1, "param2": value2 },
  "constructionSteps": ["Step 1", "Step 2", ...],
  "code": "// Complete executable code\\nreturn finalShape;",
  "estimatedComplexity": "simple|moderate|complex"
}

Always return valid, executable OpenCascade.js code using the helper functions.`;

/**
 * OpenCascade AI Code Generator
 */
export class OpenCascadeAICodeGenerator {
  private config: AIConfig;

  constructor(config: AIConfig = {}) {
    this.config = {
      model: config.model || 'gpt-4',
      temperature: config.temperature || 0.3, // Lower for more precise code
      maxTokens: config.maxTokens || 2000,
      ...config
    };
  }

  /**
   * Generate OpenCascade code from natural language prompt
   */
  async generateCode(request: CodeGenerationRequest): Promise<CodeGenerationResponse> {
    const userMessage = this.buildUserMessage(request);
    
    // Call LLM API (example using OpenAI format)
    const response = await this.callLLM(userMessage);
    
    // Parse and validate response
    return this.parseResponse(response);
  }

  /**
   * Build user message with context
   */
  private buildUserMessage(request: CodeGenerationRequest): string {
    let message = `Create OpenCascade.js code for: ${request.userPrompt}\n`;
    
    if (request.context) {
      message += `\nAdditional context: ${request.context}\n`;
    }
    
    if (request.complexity) {
      message += `\nTarget complexity: ${request.complexity}\n`;
    }
    
    message += `\nProvide your response as a JSON object with: analysis, parameters, constructionSteps, code, and estimatedComplexity.`;
    
    return message;
  }

  /**
   * Call LLM API (placeholder - implement based on your LLM provider)
   */
  private async callLLM(userMessage: string): Promise<string> {
    // Example for OpenAI API
    if (this.config.apiKey) {
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.config.apiKey}`
          },
          body: JSON.stringify({
            model: this.config.model,
            messages: [
              { role: 'system', content: SYSTEM_PROMPT },
              { role: 'user', content: userMessage }
            ],
            temperature: this.config.temperature,
            max_tokens: this.config.maxTokens
          })
        });

        const data = await response.json();
        return data.choices[0].message.content;
      } catch (error) {
        console.error('LLM API call failed:', error);
        throw new Error('Failed to generate code via LLM');
      }
    }

    // Fallback: Use template-based generation for common objects
    return this.templateBasedGeneration(userMessage);
  }

  /**
   * Template-based code generation (fallback when no API key)
   */
  private templateBasedGeneration(userMessage: string): string {
    const prompt = userMessage.toLowerCase();
    
    // Simple pattern matching for common objects
    if (prompt.includes('box') || prompt.includes('cube')) {
      return JSON.stringify({
        analysis: "Create a simple box primitive",
        parameters: { width: 2, height: 2, depth: 2 },
        constructionSteps: ["Create box using createBox helper"],
        code: "const box = occ.createBox(2, 2, 2);\nreturn box;",
        estimatedComplexity: "simple"
      });
    }
    
    if (prompt.includes('car')) {
      return JSON.stringify({
        analysis: "Car with body, cabin, and 4 wheels",
        parameters: {
          carLength: 4.0,
          carWidth: 1.8,
          bodyHeight: 1.2,
          wheelRadius: 0.35
        },
        constructionSteps: [
          "Create main body",
          "Create cabin",
          "Create and position wheels",
          "Assemble with union"
        ],
        code: `const body = occ.createBox(4.0, 1.8, 1.2);
const cabin = occ.createBox(2.0, 1.8, 0.8);
const cabinPos = occ.translate(cabin, 1.0, 0, 1.2);
const wheel = occ.rotate(occ.createCylinder(0.35, 0.3), {x:0, y:1, z:0}, 90);
const wFL = occ.translate(wheel, 2.8, -0.8, 0.35);
const wFR = occ.translate(wheel, 2.8, 0.8, 0.35);
const wRL = occ.translate(wheel, 0.8, -0.8, 0.35);
const wRR = occ.translate(wheel, 0.8, 0.8, 0.35);
const car = occ.union(occ.union(body, cabinPos), [wFL, wFR, wRL, wRR]);
return car;`,
        estimatedComplexity: "moderate"
      });
    }
    
    if (prompt.includes('house')) {
      return JSON.stringify({
        analysis: "House with rectangular body and pitched roof",
        parameters: {
          width: 10,
          depth: 8,
          height: 6,
          roofHeight: 3
        },
        constructionSteps: [
          "Create house body",
          "Create triangular roof profile",
          "Extrude roof",
          "Union body and roof"
        ],
        code: `const body = occ.createBox(10, 8, 6);
const p1 = occ.createPoint(0, 0, 6);
const p2 = occ.createPoint(10, 0, 6);
const p3 = occ.createPoint(5, 0, 9);
const roofWire = occ.createPolygonWire([p1, p2, p3]);
const roofFace = occ.createFace(roofWire);
const roof = occ.extrude(roofFace, {x:0, y:1, z:0}, 8);
const house = occ.union(body, roof);
return house;`,
        estimatedComplexity: "moderate"
      });
    }
    
    // Default fallback
    return JSON.stringify({
      analysis: "Unable to determine object type. Creating a default box.",
      parameters: { width: 1, height: 1, depth: 1 },
      constructionSteps: ["Create default box"],
      code: "const shape = occ.createBox(1, 1, 1);\nreturn shape;",
      estimatedComplexity: "simple"
    });
  }

  /**
   * Parse LLM response into structured format
   */
  private parseResponse(response: string): CodeGenerationResponse {
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(response);
      
      return {
        analysis: parsed.analysis || 'No analysis provided',
        parameters: parsed.parameters || {},
        constructionSteps: parsed.constructionSteps || [],
        code: parsed.code || '',
        estimatedComplexity: parsed.estimatedComplexity || 'unknown'
      };
    } catch (error) {
      // If not JSON, try to extract code from markdown
      const codeMatch = response.match(/```javascript\n([\s\S]*?)\n```/);
      const code = codeMatch ? codeMatch[1] : '';
      
      return {
        analysis: 'Generated from text response',
        parameters: {},
        constructionSteps: [],
        code: code || response,
        estimatedComplexity: 'unknown'
      };
    }
  }

  /**
   * Validate generated code
   */
  validateCode(code: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check if code returns something
    if (!code.includes('return')) {
      errors.push('Code must return a shape');
    }
    
    // Check for common API mistakes
    if (code.includes('BRepPrimAPI_MakeBox_3') && !code.includes('gp_Pnt_3')) {
      errors.push('BRepPrimAPI_MakeBox_3 requires an origin point (4 params)');
    }
    
    if (code.includes('BRep_Tool.Triangulation') && code.match(/Triangulation\([^,]+,[^,]+\)/)) {
      errors.push('BRep_Tool.Triangulation requires 3 parameters');
    }
    
    // Check for use of helper functions
    const usesHelpers = code.includes('occ.');
    const usesRawAPI = code.includes('new oc.');
    
    if (usesRawAPI && !usesHelpers) {
      errors.push('Consider using occ helper functions for cleaner code');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Enhance code with better practices
   */
  enhanceCode(code: string): string {
    let enhanced = code;
    
    // Add comments if missing
    if (!enhanced.includes('//')) {
      enhanced = '// Generated OpenCascade code\n' + enhanced;
    }
    
    // Ensure proper return
    if (!enhanced.trim().endsWith('return')) {
      const lines = enhanced.split('\n');
      const lastLine = lines[lines.length - 1];
      if (!lastLine.includes('return') && lastLine.includes('const')) {
        const varName = lastLine.match(/const\s+(\w+)/)?.[1];
        if (varName) {
          enhanced += `\nreturn ${varName};`;
        }
      }
    }
    
    return enhanced;
  }
}

/**
 * Create a configured code generator instance
 */
export function createCodeGenerator(config?: AIConfig): OpenCascadeAICodeGenerator {
  return new OpenCascadeAICodeGenerator(config);
}

/**
 * Quick generate function for simple use cases
 */
export async function generateOpenCascadeCode(
  prompt: string,
  apiKey?: string
): Promise<string> {
  const generator = createCodeGenerator({ apiKey });
  const response = await generator.generateCode({ userPrompt: prompt });
  return response.code;
}
