/**
 * AI Multi-Component Assembly Service
 * Breaks complex objects into individual components and assembles them
 */

export interface Component {
  name: string;
  description: string;
  position: { x: number; y: number; z: number };
  rotation?: { x: number; y: number; z: number };
  count: number; // How many of this component
}

export interface AssemblyPlan {
  components: Component[];
  assemblyInstructions: string;
}

/**
 * Generate an assembly plan for complex objects
 */
export async function generateAssemblyPlan(
  refinedPrompt: string,
  apiKey: string
): Promise<AssemblyPlan | null> {
  try {
    console.log('[AI-ASSEMBLY] Analyzing if multi-component needed...');
    
    const systemPrompt = `You are a CAD assembly planner. Analyze if the request needs multiple components assembled together.

CRITICAL SCALE: All models are DESKTOP SCALE (10-30 units total)
- Cars: ~25 units long
- Buildings: ~20 units tall
- Positions must match this scale!

CRITICAL RULE: BREAK INTO MANY SEPARATE COMPONENTS!
- Each movable/selectable part = separate component
- Car: body_chassis (ONLY), wheel (x4), door (x2), spoiler, headlight (x2), mirror (x2), etc.
- Building: foundation, wall (x4), roof, door, window (each separate!)
- Robot: body, head, arm_left, arm_right, leg_left, leg_right, etc.

Component descriptions MUST say "ONLY X - do NOT include Y" to prevent merging!

WHEN TO USE MULTI-COMPONENT:
Vehicles (car, truck, plane) - MANY components (10-15+)
Buildings (house, castle) - MANY components (walls separate, each window separate)
Furniture (chair, table) - MANY components (each leg separate)
Complex machines (robot, mechanical device) - MANY components (each arm/leg separate)

WHEN NOT TO USE:
Simple primitives (box, sphere, cylinder)
Single-piece objects (knife, pencil, simple tool)
Abstract shapes

If multi-component is needed, return JSON:
{
  "needsAssembly": true,
  "components": [
    {
      "name": "body",
      "description": "Main car body, sleek sports car shape, blue color, curved surfaces",
      "position": {"x": 0, "y": 0, "z": 0},
      "count": 1
    },
    {
      "name": "wheel",
      "description": "Black tire wheel, circular, with rim details",
      "position": {"x": -8, "y": -3, "z": 5},
      "count": 4
    }
  ],
  "assemblyInstructions": "Place 4 wheels at corners of body (front-left, front-right, back-left, back-right). Body centered at origin."
}

If simple single-component, return:
{
  "needsAssembly": false
}

EXAMPLE 1 - Sports Car (MUST BREAK INTO MANY COMPONENTS - 12+ minimum):
{
  "needsAssembly": true,
  "components": [
    {
      "name": "bonnet_front",
      "description": "Front bonnet/hood ONLY - angled/tilted wedge shape 10 units long for aerodynamics. DO NOT include cabin, trunk, wheels, doors, lights",
      "position": {"x": 12, "y": 0, "z": 1},
      "count": 1
    },
    {
      "name": "cabin_passenger",
      "description": "Passenger cabin/cockpit ONLY - box shape 8 units where driver sits. DO NOT include bonnet, trunk, wheels, doors",
      "position": {"x": 0, "y": 0, "z": 1},
      "count": 1
    },
    {
      "name": "trunk_rear",
      "description": "Rear trunk/boot ONLY - storage box 6 units. DO NOT include cabin, bonnet, spoiler",
      "position": {"x": -8, "y": 0, "z": 1},
      "count": 1
    },
    {
      "name": "wheel",
      "description": "Single wheel ONLY - cylinder 2 units diameter. MUST be at CORNER positions (FL/FR/RL/RR), NOT center",
      "position": {"x": 10, "y": -3.5, "z": 0},
      "count": 4
    },
    {
      "name": "door",
      "description": "Single door ONLY - flat box on SIDE of car with handle. DO NOT include windows",
      "position": {"x": 2, "y": -3.3, "z": 1.5},
      "count": 2
    },
    {
      "name": "headlight",
      "description": "Single headlight ONLY - sphere 0.6 units at FRONT of car",
      "position": {"x": 16, "y": -2, "z": 2},
      "count": 2
    },
    {
      "name": "spoiler_rear",
      "description": "Rear spoiler wing ONLY - thin box ELEVATED above trunk for downforce",
      "position": {"x": -12, "y": 0, "z": 4},
      "count": 1
    },
    {
      "name": "grille_front",
      "description": "Front grille ONLY - rectangular box at FRONT center for air intake",
      "position": {"x": 17, "y": 0, "z": 2},
      "count": 1
    },
    {
      "name": "mirror",
      "description": "Side mirror ONLY - small box on door",
      "position": {"x": 8, "y": -4, "z": 3},
      "count": 2
    },
    {
      "name": "exhaust",
      "description": "Exhaust pipe ONLY - small cylinder at REAR BOTTOM",
      "position": {"x": -14, "y": -2, "z": 0.5},
      "count": 2
    }
  ],
  "assemblyInstructions": "Body (25 units long) at center. 4 wheels (2 unit diameter) at corners: front-left (-8, 0, 4), front-right (-8, 0, -4), back-left (8, 0, 4), back-right (8, 0, -4). 2 doors on sides. 2 headlights at front."
}

EXAMPLE 2 - House:
{
  "needsAssembly": true,
  "components": [
    {
      "name": "walls",
      "description": "White rectangular walls forming house base, with cutouts for doors and windows",
      "position": {"x": 0, "y": 0, "z": 0},
      "count": 1
    },
    {
      "name": "roof",
      "description": "Red triangular pitched roof covering the walls",
      "position": {"x": 0, "y": 10, "z": 0},
      "count": 1
    },
    {
      "name": "door",
      "description": "Brown wooden door, rectangular, with handle",
      "position": {"x": 0, "y": 0, "z": 8},
      "count": 1
    },
    {
      "name": "window",
      "description": "Square window frame with glass panes, white frame",
      "position": {"x": 5, "y": 5, "z": 8},
      "count": 4
    }
  ],
  "assemblyInstructions": "Walls form base. Roof sits on top. Door at front center. 4 windows distributed on walls (2 front, 2 sides)."
}

EXAMPLE 3 - Simple tool (NO assembly):
{
  "needsAssembly": false
}`;

    const userPrompt = `Design request: "${refinedPrompt}"

Analyze if this needs multi-component assembly. Return ONLY JSON.`;

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
    const code = data.code || data.response || '';
    
    console.log('[AI-ASSEMBLY] Raw response:', code.substring(0, 200));
    
    // Parse JSON response
    const cleaned = code
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();
    
    const result = JSON.parse(cleaned);
    
    if (!result.needsAssembly) {
      console.log('[AI-ASSEMBLY] Single component, no assembly needed');
      return null;
    }
    
    console.log('[AI-ASSEMBLY] Assembly plan generated:', result.components.length, 'components');
    
    return {
      components: result.components,
      assemblyInstructions: result.assemblyInstructions
    };
    
  } catch (error) {
    console.error('[AI-ASSEMBLY] Failed to generate assembly plan:', error);
    return null;
  }
}

/**
 * Generate individual component using specialized prompt
 */
export function generateComponentPrompt(
  component: Component,
  overallContext: string
): string {
  const positionDesc = component.count > 1 
    ? `This is one of ${component.count} identical components that will be positioned at different locations.`
    : `This component will be positioned at (${component.position.x}, ${component.position.y}, ${component.position.z}).`;
  
  return `Create component: ${component.name}

Description: ${component.description}

Context: This is part of a larger assembly - ${overallContext}

${positionDesc}

Focus on creating this specific component with accurate dimensions and details. It will be assembled with other components later.

CRITICAL COMPONENT RULES:
1. Create ONLY this specific part - nothing else!
2. Use a SINGLE primitive shape or simple extrusion
3. Do NOT add sub-parts like wheels, doors, windows, spoilers - those are SEPARATE components
4. Do NOT use union(), fuse(), or compound() - just return one shape
5. Example: If this is "body_chassis", create ONLY the main body box/wedge - NOT the wheels!`;
}
