/**
 * Intent Detector
 * Analyzes user input to determine what type of operation they want
 */

export enum UserIntent {
  CREATE_NEW = 'CREATE_NEW',           // "create a cube"
  MODIFY_EXISTING = 'MODIFY_EXISTING', // "make a hole through this"
  TRANSFORM = 'TRANSFORM',             // "rotate it 45 degrees"
  UPDATE_PARAMETERS = 'UPDATE_PARAMETERS', // "make the gear teeth 25"
  RELATIONSHIP = 'RELATIONSHIP',       // "align these two", "pattern around"
  QUERY = 'QUERY',                     // "what's the volume", "how big is this"
  DELETE = 'DELETE'                    // "remove this", "delete the hole"
}

export interface IntentAnalysis {
  intent: UserIntent;
  confidence: number; // 0-1
  requiresSelection: boolean;
  operation?: string; // Specific operation (e.g., 'hole', 'rotate', 'scale')
  targetParameter?: string; // For parameter updates
  targetValue?: number; // For parameter updates
  reasoning: string;
}

/**
 * Main intent detection function
 */
export function detectIntent(
  userInput: string,
  hasSelection: boolean,
  objectCount: number = 0
): IntentAnalysis {
  const input = userInput.toLowerCase().trim();
  
  // Priority order: most specific first
  
  // 1. Check for deletion
  if (matchesDelete(input)) {
    return {
      intent: UserIntent.DELETE,
      confidence: 0.95,
      requiresSelection: true,
      operation: 'delete',
      reasoning: 'User wants to delete/remove object'
    };
  }
  
  // 2. Check for queries
  if (matchesQuery(input)) {
    return {
      intent: UserIntent.QUERY,
      confidence: 0.9,
      requiresSelection: false,
      reasoning: 'User is asking a question'
    };
  }
  
  // 3. Check for parameter updates (only if has selection)
  if (hasSelection) {
    const paramUpdate = detectParameterUpdate(input);
    if (paramUpdate) {
      return {
        intent: UserIntent.UPDATE_PARAMETERS,
        confidence: 0.9,
        requiresSelection: true,
        operation: 'update_parameter',
        targetParameter: paramUpdate.parameter,
        targetValue: paramUpdate.value,
        reasoning: `User wants to update ${paramUpdate.parameter} to ${paramUpdate.value}`
      };
    }
  }
  
  // 4. Check for transforms
  if (matchesTransform(input, hasSelection)) {
    const operation = getTransformOperation(input);
    return {
      intent: UserIntent.TRANSFORM,
      confidence: 0.85,
      requiresSelection: true,
      operation,
      reasoning: `User wants to ${operation} the object`
    };
  }
  
  // 5. Check for modifications (requires selection)
  if (hasSelection && matchesModification(input)) {
    const operation = getModificationOperation(input);
    return {
      intent: UserIntent.MODIFY_EXISTING,
      confidence: 0.9,
      requiresSelection: true,
      operation,
      reasoning: `User wants to modify existing object: ${operation}`
    };
  }
  
  // 6. Check for relationships (requires multiple objects)
  if (objectCount >= 2 && matchesRelationship(input)) {
    const operation = getRelationshipOperation(input);
    return {
      intent: UserIntent.RELATIONSHIP,
      confidence: 0.8,
      requiresSelection: objectCount >= 1,
      operation,
      reasoning: `User wants to create relationship: ${operation}`
    };
  }
  
  // 7. Default: Create new
  return {
    intent: UserIntent.CREATE_NEW,
    confidence: 0.7,
    requiresSelection: false,
    reasoning: 'User wants to create a new object'
  };
}

/**
 * Check if input is a deletion request
 */
function matchesDelete(input: string): boolean {
  const deleteKeywords = [
    'delete', 'remove', 'erase', 'clear', 'get rid of'
  ];
  return deleteKeywords.some(keyword => input.includes(keyword));
}

/**
 * Check if input is a query
 */
function matchesQuery(input: string): boolean {
  const queryKeywords = [
    'what', 'how', 'why', 'when', 'where', 'which',
    'volume', 'size', 'dimension', 'measure', 'area',
    'tell me', 'show me', 'list', 'count'
  ];
  return queryKeywords.some(keyword => input.includes(keyword));
}

/**
 * Check if input is a transform operation
 */
function matchesTransform(input: string, hasSelection: boolean): boolean {
  if (!hasSelection) return false;
  
  const transformKeywords = [
    'rotate', 'move', 'translate', 'position', 'scale',
    'resize', 'turn', 'spin', 'shift', 'place'
  ];
  
  const referenceKeywords = ['it', 'this', 'that', 'the'];
  
  const hasTransform = transformKeywords.some(keyword => input.includes(keyword));
  const hasReference = referenceKeywords.some(keyword => input.includes(keyword));
  
  return hasTransform && (hasReference || hasSelection);
}

/**
 * Get specific transform operation
 */
function getTransformOperation(input: string): string {
  if (input.includes('rotate') || input.includes('turn') || input.includes('spin')) {
    return 'rotate';
  }
  if (input.includes('move') || input.includes('translate') || input.includes('shift')) {
    return 'move';
  }
  if (input.includes('scale') || input.includes('resize')) {
    return 'scale';
  }
  if (input.includes('position') || input.includes('place')) {
    return 'position';
  }
  return 'transform';
}

/**
 * Check if input is a modification operation
 */
function matchesModification(input: string): boolean {
  const modificationKeywords = [
    // Boolean operations
    'hole', 'cut', 'subtract', 'remove', 'drill',
    'slot', 'groove', 'notch', 'chamfer', 'fillet',
    'bore', 'pocket', 'cavity',
    
    // Additive operations
    'add', 'attach', 'join', 'combine', 'merge',
    'boss', 'rib', 'feature', 'extrusion',
    
    // Material removal
    'through', 'into', 'from'
  ];
  
  const referenceKeywords = ['this', 'it', 'the', 'that'];
  
  const hasModification = modificationKeywords.some(keyword => input.includes(keyword));
  const hasReference = referenceKeywords.some(keyword => input.includes(keyword));
  
  return hasModification || (hasReference && 
    (input.includes('in') || input.includes('on') || input.includes('to')));
}

/**
 * Get specific modification operation
 */
function getModificationOperation(input: string): string {
  // Boolean subtraction
  if (input.includes('hole') || input.includes('drill') || input.includes('bore')) {
    return 'hole';
  }
  if (input.includes('slot')) {
    return 'slot';
  }
  if (input.includes('groove') || input.includes('notch')) {
    return 'groove';
  }
  if (input.includes('cut') || input.includes('subtract')) {
    return 'cut';
  }
  if (input.includes('chamfer')) {
    return 'chamfer';
  }
  if (input.includes('fillet') || input.includes('round')) {
    return 'fillet';
  }
  
  // Boolean union
  if (input.includes('add') || input.includes('attach')) {
    return 'add';
  }
  if (input.includes('boss')) {
    return 'boss';
  }
  if (input.includes('rib')) {
    return 'rib';
  }
  
  return 'modify';
}

/**
 * Check if input is a relationship operation
 */
function matchesRelationship(input: string): boolean {
  const relationshipKeywords = [
    'align', 'center', 'distribute', 'space',
    'pattern', 'array', 'repeat', 'copy',
    'around', 'between', 'along', 'parallel',
    'perpendicular', 'tangent', 'concentric'
  ];
  
  return relationshipKeywords.some(keyword => input.includes(keyword));
}

/**
 * Get specific relationship operation
 */
function getRelationshipOperation(input: string): string {
  if (input.includes('align')) {
    return 'align';
  }
  if (input.includes('center')) {
    return 'center';
  }
  if (input.includes('pattern') || input.includes('array')) {
    return 'pattern';
  }
  if (input.includes('copy') || input.includes('repeat')) {
    return 'copy';
  }
  if (input.includes('distribute') || input.includes('space')) {
    return 'distribute';
  }
  return 'relate';
}

/**
 * Detect parameter update requests
 * Examples: "make the teeth 25", "change radius to 5", "set height to 10"
 */
function detectParameterUpdate(input: string): { parameter: string; value: number } | null {
  // Pattern: "make/set/change [parameter] [to] [number]"
  const patterns = [
    /(?:make|set|change)\s+(?:the\s+)?(\w+)\s+(?:to\s+)?(\d+\.?\d*)/i,
    /(\w+)\s+(?:to|=)\s+(\d+\.?\d*)/i,
    /(?:increase|decrease)\s+(?:the\s+)?(\w+)\s+(?:by|to)\s+(\d+\.?\d*)/i
  ];
  
  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match) {
      const parameter = match[1].toLowerCase();
      const value = parseFloat(match[2]);
      
      // Validate parameter name (common CAD parameters)
      const validParameters = [
        'radius', 'diameter', 'width', 'height', 'depth', 'length',
        'thickness', 'teeth', 'module', 'pitch', 'angle',
        'distance', 'offset', 'spacing', 'count'
      ];
      
      if (validParameters.includes(parameter) && !isNaN(value)) {
        return { parameter, value };
      }
    }
  }
  
  return null;
}

/**
 * Extract numeric values from input
 */
export function extractNumbers(input: string): number[] {
  const numbers: number[] = [];
  const regex = /(\d+\.?\d*)/g;
  let match;
  
  while ((match = regex.exec(input)) !== null) {
    numbers.push(parseFloat(match[1]));
  }
  
  return numbers;
}

/**
 * Extract axis from input (x, y, or z)
 */
export function extractAxis(input: string): 'x' | 'y' | 'z' | null {
  const xKeywords = ['x', 'x-axis', 'horizontal', 'left', 'right'];
  const yKeywords = ['y', 'y-axis', 'forward', 'backward', 'depth'];
  const zKeywords = ['z', 'z-axis', 'vertical', 'up', 'down', 'height'];
  
  if (xKeywords.some(keyword => input.toLowerCase().includes(keyword))) {
    return 'x';
  }
  if (yKeywords.some(keyword => input.toLowerCase().includes(keyword))) {
    return 'y';
  }
  if (zKeywords.some(keyword => input.toLowerCase().includes(keyword))) {
    return 'z';
  }
  
  return null;
}

/**
 * Detect if operation should be relative or absolute
 */
export function isRelativeOperation(input: string): boolean {
  const relativeKeywords = ['by', 'more', 'less', 'additional'];
  return relativeKeywords.some(keyword => input.toLowerCase().includes(keyword));
}

/**
 * Get user-friendly explanation of intent
 */
export function explainIntent(analysis: IntentAnalysis): string {
  const { intent, operation, requiresSelection } = analysis;
  
  let explanation = '';
  
  switch (intent) {
    case UserIntent.CREATE_NEW:
      explanation = 'Creating new object';
      break;
    case UserIntent.MODIFY_EXISTING:
      explanation = `✏️ Modifying existing object (${operation})`;
      break;
    case UserIntent.TRANSFORM:
      explanation = `Transforming object (${operation})`;
      break;
    case UserIntent.UPDATE_PARAMETERS:
      explanation = `Updating parameters`;
      break;
    case UserIntent.RELATIONSHIP:
      explanation = `Creating relationship (${operation})`;
      break;
    case UserIntent.QUERY:
      explanation = '❓ Answering query';
      break;
    case UserIntent.DELETE:
      explanation = 'Deleting object';
      break;
  }
  
  if (requiresSelection && intent !== UserIntent.CREATE_NEW) {
    explanation += ' (requires selection)';
  }
  
  return explanation;
}
