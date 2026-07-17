/**
 * Parameter Extractor
 * Extracts variable declarations from AI-generated OpenCascade code
 * 
 * Example:
 * Input: "let rimWidth = 0.5; let tireThickness = 5;"
 * Output: { rimWidth: 0.5, tireThickness: 5 }
 */

export interface ExtractedParameter {
  name: string;
  value: number;
  min: number;
  max: number;
  step: number;
}

export interface ParameterExtractionResult {
  parameters: Record<string, number>;
  parameterMetadata: Record<string, { min: number; max: number; step: number }>;
  cleanedCode: string; // Code with parameters replaced by function params
}

/**
 * Extract parameters from AI-generated code
 */
export function extractParametersFromCode(code: string): ParameterExtractionResult {
  const parameters: Record<string, number> = {};
  const parameterMetadata: Record<string, { min: number; max: number; step: number }> = {};
  
  // Regex to match numeric-literal variable declarations:
  // let/const/var variableName = numberValue;
  // NOTE: this intentionally only captures literal numbers. Derived parameters such as
  // `const pitch = module * teeth;` are not extracted (and would not track changes to
  // their inputs via literal substitution), so they are left out of the slider UI.
  const varRegex = /(?:let|const|var)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(-?\d+\.?\d*)\s*;/g;

  // Exact loop-counter / index names to skip (NOT substring matching — the old
  // `includes('if'|'for'|'while')` wrongly dropped real params like `platformWidth`,
  // `liftHeight`, `shiftX`).
  const SKIP_NAMES = new Set(['i', 'j', 'k', 'n', 'm', 'idx', 'index', 'iter', 'iterator', 'counter']);

  let match;
  while ((match = varRegex.exec(code)) !== null) {
    const [, varName, value] = match;
    const numValue = parseFloat(value);

    if (SKIP_NAMES.has(varName.toLowerCase())) {
      continue;
    }

    parameters[varName] = numValue;
    
    // Intelligent range detection based on value
    parameterMetadata[varName] = inferParameterRange(varName, numValue);
  }
  
  console.log('[PARAM-EXTRACT] Extracted parameters:', parameters);
  
  return {
    parameters,
    parameterMetadata,
    cleanedCode: code // For now, return original code
  };
}

/**
 * Infer smart parameter ranges based on variable name and value
 */
function inferParameterRange(varName: string, value: number): { min: number; max: number; step: number } {
  const nameLower = varName.toLowerCase();
  
  // Count-based parameters (discrete integers)
  if (nameLower.includes('count') || 
      nameLower.includes('num') || 
      nameLower.includes('segments') ||
      nameLower.includes('teeth') ||
      nameLower.includes('lug')) {
    return {
      min: 1,
      max: Math.max(50, value * 3),
      step: 1
    };
  }
  
  // Angle parameters (degrees)
  if (nameLower.includes('angle') || 
      nameLower.includes('rotation') ||
      nameLower.includes('degree')) {
    return {
      min: 0,
      max: 360,
      step: 1
    };
  }
  
  // Diameter/radius (positive, reasonable range)
  if (nameLower.includes('diameter') || 
      nameLower.includes('radius')) {
    return {
      min: 0.1,
      max: Math.max(20, value * 3),
      step: 0.1
    };
  }
  
  // Thickness (small positive values)
  if (nameLower.includes('thickness') || 
      nameLower.includes('width') ||
      nameLower.includes('height') ||
      nameLower.includes('depth')) {
    return {
      min: 0.1,
      max: Math.max(10, value * 3),
      step: 0.1
    };
  }
  
  // Length parameters
  if (nameLower.includes('length')) {
    return {
      min: 0.1,
      max: Math.max(20, value * 3),
      step: 0.1
    };
  }
  
  // Default range for unknown parameters
  if (value === 0) {
    return { min: -10, max: 10, step: 0.1 };
  }
  
  return {
    min: Math.min(0.1, value * 0.1),
    max: Math.max(value * 3, 10),
    step: value < 1 ? 0.01 : (value < 10 ? 0.1 : 1)
  };
}

/**
 * Generate new code with updated parameter values
 * MORE ROBUST: Handles multiple declaration patterns
 */
export function regenerateCodeWithParameters(
  originalCode: string,
  newParameters: Record<string, number>
): string {
  let modifiedCode = originalCode;
  
  console.log('[REGEN] Original parameters to replace:', newParameters);
  
  // Replace each parameter value in the code
  Object.entries(newParameters).forEach(([varName, newValue]) => {
    // Pattern 1: let/const/var varName = value;
    const pattern1 = new RegExp(
      `((?:let|const|var)\\s+${varName}\\s*=\\s*)(-?\\d+\\.?\\d*)(\\s*;)`,
      'g'
    );
    
    // Pattern 2: varName = value; (reassignment)
    const pattern2 = new RegExp(
      `((?:^|\\n|;)\\s*${varName}\\s*=\\s*)(-?\\d+\\.?\\d*)(\\s*;)`,
      'g'
    );
    
    // Try pattern 1 first
    let replacedCount = 0;
    
    modifiedCode = modifiedCode.replace(pattern1, (_match, prefix, oldValue, suffix) => {
      replacedCount++;
      console.log(`[REGEN] Replaced ${varName}: ${oldValue} → ${newValue}`);
      return `${prefix}${newValue}${suffix}`;
    });
    
    // If pattern 1 didn't find anything, try pattern 2
    if (replacedCount === 0) {
      modifiedCode = modifiedCode.replace(pattern2, (_match, prefix, oldValue, suffix) => {
        replacedCount++;
        console.log(`[REGEN] Replaced ${varName} (reassignment): ${oldValue} → ${newValue}`);
        return `${prefix}${newValue}${suffix}`;
      });
    }
    
    if (replacedCount === 0) {
      console.warn(`[REGEN] Could not find parameter '${varName}' in code`);
      console.warn('Code snippet:', originalCode.substring(0, 200));
    }
  });
  
  return modifiedCode;
}

/**
 * Format parameter name for display (camelCase -> Title Case)
 */
export function formatParameterName(varName: string): string {
  // Insert spaces before capital letters
  const withSpaces = varName.replace(/([A-Z])/g, ' $1');
  
  // Capitalize first letter
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
}
