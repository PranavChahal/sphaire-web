export interface CommandResult {
  action: string;
  object: string | null;
  params: { [key: string]: number | string | number[] | string[] };
}

export function parseCommand(text: string): CommandResult | null {
  // Normalize input text
  const input = text.toLowerCase().trim();
  
  const createBasicMatch = input.match(/(?:create|add|make|draw)(?:\s+a)?(?:\s+new)?\s+(cube|box|sphere|cylinder|cone)/i);
  if (createBasicMatch) {
    let shape = createBasicMatch[1];
    if (shape === 'box') shape = 'cube';
    
    return {
      action: 'create',
      object: shape,
      params: {}
    };
  }
  
  const createWithDimensionsMatch = input.match(/(?:create|add|make|draw)(?:\s+a)?(?:\s+new)?\s+(cube|box|sphere|cylinder|cone)(?:\s+with)?\s+(?:size|radius|diameter|width|height|length)?\s*([\d.]+)(?:\s+(?:units|inches|cm|mm|meters))?/i);
  if (createWithDimensionsMatch) {
    let shape = createWithDimensionsMatch[1];
    if (shape === 'box') shape = 'cube';
    const size = parseFloat(createWithDimensionsMatch[2]);
    
    const params: Record<string, number> = {};
    if (shape === 'cube') {
      params.width = size;
      params.height = size;
      params.depth = size;
    } else if (shape === 'sphere') {
      params.radius = size;
    } else if (shape === 'cylinder' || shape === 'cone') {
      params.radius = size;
      params.height = size * 2;
    }
    
    return {
      action: 'create',
      object: shape,
      params
    };
  }

  const moveMatch = input.match(/move(?:\s+(?:the|this|a))?\s+([a-z]+)(?:\s+by)?\s+([\d.]+)(?:\s+(?:units|inches|cm|mm|meters))?\s+(?:on|along|in)?\s+([xyz])\s*(?:axis|direction)?/i);
  if (moveMatch) {
    return {
      action: 'move',
      object: moveMatch[1],
      params: {
        axis: moveMatch[3],
        distance: parseFloat(moveMatch[2])
      }
    };
  }
  
  const rotateMatch = input.match(/rotate(?:\s+(?:the|this|a))?\s+([a-z]+)(?:\s+by)?\s+([\d.]+)\s+degrees\s+(?:around|on)?\s+([xyz])/i);
  if (rotateMatch) {
    return {
      action: 'rotate',
      object: rotateMatch[1],
      params: {
        axis: rotateMatch[3],
        degrees: parseFloat(rotateMatch[2])
      }
    };
  }
  
  const scaleMatch = input.match(/scale(?:\s+(?:the|this|a))?\s+([a-z]+)(?:\s+(?:by|to))?\s+([\d.]+)/i);
  if (scaleMatch) {
    return {
      action: 'scale',
      object: scaleMatch[1],
      params: {
        factor: parseFloat(scaleMatch[2])
      }
    };
  }
  
  // Extrude: extrude <object> [by] <distance> [units] [on|along] <axis>
  const extrudeMatch = input.match(/extrude(?:\s+(?:the|this|a))?\s+([a-z]+)(?:\s+by)?\s+([\d.]+)(?:\s+(?:units|inches|cm|mm|meters))?\s+(?:on|along|in)?\s+([xyz])/i);
  if (extrudeMatch) {
    return {
      action: 'extrude',
      object: extrudeMatch[1],
      params: {
        distance: parseFloat(extrudeMatch[2]),
        axis: extrudeMatch[3]
      }
    };
  }
  
  // Bevel: bevel <object> [by|with] <amount>
  const bevelMatch = input.match(/bevel(?:\s+(?:the|this|a))?\s+([a-z]+)(?:\s+(?:by|with))?\s+([\d.]+)/i);
  if (bevelMatch) {
    return {
      action: 'bevel',
      object: bevelMatch[1],
      params: {
        amount: parseFloat(bevelMatch[2])
      }
    };
  }
  
  // Delete: delete <object>
  const deleteMatch = input.match(/(?:delete|remove)(?:\s+(?:the|this|a))?\s+([a-z]+)/i);
  if (deleteMatch) {
    return {
      action: 'delete',
      object: deleteMatch[1],
      params: {}
    };
  }
  
  // Mode switch: switch to <mode> mode | enter <mode> mode
  const modeSwitchMatch = input.match(/(?:switch\s+to|enter|go\s+to)\s+(object|edit)\s+mode/i);
  if (modeSwitchMatch) {
    return {
      action: 'modeSwitch',
      object: null,
      params: {
        mode: modeSwitchMatch[1].toLowerCase()
      }
    };
  }
  
  // Cursor move: move cursor to <x> <y> <z>
  const cursorMoveMatch = input.match(/move\s+cursor\s+to\s+([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)/i);
  if (cursorMoveMatch) {
    return {
      action: 'cursorMove',
      object: null,
      params: {
        position: [
          parseFloat(cursorMoveMatch[1]),
          parseFloat(cursorMoveMatch[2]), 
          parseFloat(cursorMoveMatch[3])
        ]
      }
    };
  }
  
  // Basic shapes pattern (for phrases like "basic everyday shapes")
  if (input.includes("basic") && input.includes("shape")) {
    // Interpret as a request to create a set of basic shapes
    return {
      action: "create",
      object: "collection",
      params: {
        shapes: ["cube", "sphere", "cylinder", "cone"],
        arrangement: "grid"
      }
    };
  }
  
  // If no patterns match
  return null;
}

/**
 * Process the command text and return a JSON string result
 * @param text The input command text
 * @returns JSON string with parsed command or error
 */
export function processCommandText(text: string): string {
  const result = parseCommand(text);
  
  if (result) {
    return JSON.stringify(result, null, 2);
  } else {
    return JSON.stringify({
      action: "unknown",
      object: null,
      params: { originalText: text }
    }, null, 2);
  }
}

export default processCommandText;
