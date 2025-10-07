/**
 * AI Questioning Service
 * Intelligently asks clarifying questions to refine user's design intent
 */

interface Question {
  id: string;
  question: string;
  type: 'choice' | 'text' | 'number';
  options?: string[];
  defaultValue?: string | number;
}

interface QuestionResponse {
  questionId: string;
  answer: string | number;
}

export interface QuestioningResult {
  questions: Question[];
  context: string; // Additional context gathered
}

/**
 * Generate clarifying questions based on user's initial prompt
 */
export async function generateQuestions(
  initialPrompt: string,
  apiKey: string
): Promise<QuestioningResult> {
  try {
    console.log('[AI-QUESTIONS] Generating questions for:', initialPrompt);
    
    const systemPrompt = `You are an EXPERT CAD design assistant with deep knowledge of real-world objects.

YOUR JOB: Ask 3-5 clarifying questions to create the most REALISTIC, DETAILED model possible.

CRITICAL INSTRUCTIONS:
1. Think about what makes this object RECOGNIZABLE and FUNCTIONAL
2. Ask about KEY FEATURES that define the object
3. Focus on DETAILS that make it look real

Scale: All models are desktop scale (10-30 units)
- Cars: ~25 units long
- Buildings: ~20 units tall  
- Tools: ~15 units long

RULES:
- Ask ONLY 3-5 questions maximum
- Focus on: SPECIFIC FEATURES, detail elements, functional parts, materials
- Ask about REALISTIC details (e.g., "Grip texture?", "Wheel spoke pattern?", "Door handle style?")
- Provide 2-4 choice options
- DON'T ask about size (we use standard scale)

CRITICAL: Return ONLY valid JSON, NO CODE, NO EXPLANATIONS!

JSON format ONLY:
{
  "questions": [
    {
      "id": "q1",
      "question": "What size do you want?",
      "type": "choice",
      "options": ["Small (5cm)", "Medium (10cm)", "Large (20cm)"]
    },
    {
      "id": "q2", 
      "question": "Any specific style preferences?",
      "type": "text"
    }
  ],
  "context": "Brief summary of what you understood from the request"
}

EXAMPLES:

User: "Create a screwdriver"
{
  "questions": [
    {"id": "q1", "question": "Screwdriver tip type?", "type": "choice", "options": ["Flathead (single slot)", "Phillips (cross)", "Torx (6-point star)", "Robertson (square)"]},
    {"id": "q2", "question": "Handle grip texture?", "type": "choice", "options": ["Smooth plastic", "Rubberized with ridges", "Textured with diamond pattern"]},
    {"id": "q3", "question": "Professional or DIY style?", "type": "choice", "options": ["Professional (thin precision)", "DIY (thick comfortable)"]},
    {"id": "q4", "question": "Include metal collar between handle and shaft?", "type": "choice", "options": ["Yes (realistic)", "No (simple)"]},
    {"id": "q5", "question": "Handle color?", "type": "text", "defaultValue": "red"}
  ],
  "context": "User wants DETAILED screwdriver with realistic tip geometry, grip texture, metal collar, ~15 units long"
}

User: "Make a car"
{
  "questions": [
    {"id": "q1", "question": "Car type?", "type": "choice", "options": ["Sports car (low aerodynamic)", "SUV (tall boxy)", "Sedan (balanced)", "Muscle car (aggressive)"]},
    {"id": "q2", "question": "Detail level?", "type": "choice", "options": ["Basic (body + wheels)", "Detailed (doors, windows, bumpers)", "Ultra detailed (mirrors, lights, spoilers, exhausts)"]},
    {"id": "q3", "question": "Wheel rim style?", "type": "choice", "options": ["Simple black tires", "5-spoke alloy rims", "Multi-spoke racing wheels", "Deep-dish chrome rims"]},
    {"id": "q4", "question": "Include realistic features?", "type": "choice", "options": ["Yes (door handles, side mirrors, headlights, grille)", "No (simplified)"]},
    {"id": "q5", "question": "Body color?", "type": "text", "defaultValue": "red"}
  ],
  "context": "User wants REALISTIC car (~25 units long) with detailed wheels, doors, windows, lights, proper car features"
}

User: "Create a house"
{
  "questions": [
    {"id": "q1", "question": "House style?", "type": "choice", "options": ["Modern (flat roof, minimal)", "Traditional (pitched roof)", "Cottage (small, cozy)"]},
    {"id": "q2", "question": "Number of floors?", "type": "choice", "options": ["1 floor", "2 floors", "3 floors"]},
    {"id": "q3", "question": "Include garage?", "type": "choice", "options": ["Yes", "No"]},
    {"id": "q4", "question": "Wall color?", "type": "text", "defaultValue": "white"}
  ],
  "context": "User wants an architectural house model"
}`;

    const userPrompt = `User request: "${initialPrompt}"

Think about what makes this object REALISTIC and RECOGNIZABLE.
What KEY FEATURES and DETAILS does it need?

Generate 3-5 clarifying questions about these SPECIFIC FEATURES.

CRITICAL: Return ONLY JSON object, NO markdown, NO code, NO explanations!
Start your response with { and end with }`;

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
    
    console.log('[AI-QUESTIONS] Raw response:', code.substring(0, 200));
    
    // FIX: Aggressively extract JSON from response
    // Sometimes AI returns code or explanations, we need ONLY the JSON
    
    // Try to find JSON object in the response
    const jsonMatch = code.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      code = jsonMatch[0];
      console.log('[AI-QUESTIONS] Extracted JSON from response');
    }
    
    // Parse JSON response
    const cleaned = code
      .replace(/```json/g, '')
      .replace(/```javascript/g, '')
      .replace(/```/g, '')
      .trim();
    
    const result = JSON.parse(cleaned);
    
    console.log('[AI-QUESTIONS] Generated questions:', result);
    
    return result;
    
  } catch (error) {
    console.error('[AI-QUESTIONS] Failed to generate questions:', error);
    
    // Fallback: return generic questions
    return {
      questions: [
        {
          id: 'q1',
          question: 'What size do you want?',
          type: 'choice',
          options: ['Small', 'Medium', 'Large']
        },
        {
          id: 'q2',
          question: 'Any color preferences?',
          type: 'text',
          defaultValue: 'default'
        },
        {
          id: 'q3',
          question: 'Level of detail?',
          type: 'choice',
          options: ['Simple', 'Medium', 'Complex']
        }
      ],
      context: 'Generic questions due to error'
    };
  }
}

/**
 * Refine the original prompt with question responses
 */
export async function refinePrompt(
  originalPrompt: string,
  questionContext: string,
  responses: QuestionResponse[],
  apiKey: string
): Promise<string> {
  try {
    console.log('[AI-REFINE] Refining prompt with answers...');
    
    const systemPrompt = `You are an EXPERT CAD design specification writer who creates DETAILED, REALISTIC specifications.

YOUR JOB: Combine the user's request with their answers into a COMPREHENSIVE technical specification DESCRIPTION (NOT CODE!).

CRITICAL INSTRUCTIONS:
1. Write a DESCRIPTION of what to build (NOT code!)
2. Include SPECIFIC FEATURES that define the object
3. Mention REALISTIC DETAILS (grip texture, tip geometry, collar rings, chamfered edges, etc.)
4. Describe HOW each part should look (tapered, ridged, curved, beveled)
5. DO NOT write code with occ.* functions!
6. DO NOT mention function names!
7. Write in NATURAL LANGUAGE describing the object!

Scale: Desktop model scale (10-30 units)
- Cars: ~25 units long (NOT 200!)
- Buildings: ~20 units tall (NOT 3000!)
- Tools: ~15 units long (NOT 200!)

RULES:
- Write ONE detailed DESCRIPTION paragraph (4-6 sentences)
- Include ALL specific features and realistic details
- **ALWAYS mention scale AND specific features**
- Describe textures, shapes, connections between parts
- Focus on REALISM and ACCURACY
- NO CODE! NO occ.* functions! ONLY DESCRIPTION!

CRITICAL: Return ONLY the specification DESCRIPTION text, NO JSON, NO markdown, NO code, NO function calls!

EXAMPLE:

Original: "Create a screwdriver"
Context: "User wants a screwdriver tool"
Answers:
- Head type: Phillips (cross)
- Handle: Thick comfortable grip
- Length: Medium (20cm)
- Color: red

Refined DESCRIPTION (NOT CODE): "Create a realistic desktop model screwdriver at approximately 15 units total length with maximum detail. The handle (6 units) should be a thick ergonomic cylinder colored red with 8 textured grip ridges cut around its circumference for realism. Include a metal collar ring (0.8 units) between the handle and shaft. The metal shaft (7 units) should be a thin cylinder (0.6 diameter) with a tapered tip. The tip must have an ACCURATE Phillips cross geometry: two perpendicular slots (0.3 units deep) cut into the tip to form the characteristic cross pattern. Add subtle chamfer to handle edges for a polished look. All proportions should be realistic and functional-looking."

EXAMPLE 2:

Original: "Make a car"
Context: "User wants a car model"
Answers:
- Type: Sports car (low, sleek)
- Detail: Medium (doors, windows)
- Size: Model size (30cm)
- Color: blue

Refined: "Create a HIGHLY DETAILED sports car at desktop model scale, approximately 25 units in total length with maximum realism. The body should be low-profile and aerodynamic blue with smooth curved surfaces, streamlined hood, and integrated rear spoiler. Include DETAILED features: separate doors with visible handles, side mirrors, clear windows with defined frames, front grille with horizontal slats, realistic headlight housings (oval-shaped), and a lower front bumper with air intakes. The four wheels (2 units diameter each) must have 5-spoke alloy rims with detailed spoke geometry and black rubber tires with visible tread patterns. Add subtle chamfer to body edges for a polished look. Position wheels accurately at corners with proper spacing. All components should be proportional and create a recognizable sports car silhouette."`;

    const answersText = responses
      .map(r => `- ${r.questionId}: ${r.answer}`)
      .join('\n');

    const userPrompt = `Original request: "${originalPrompt}"
Context: "${questionContext}"
User's answers:
${answersText}

Think about what SPECIFIC FEATURES and REALISTIC DETAILS this object needs to look authentic.

Write ONE comprehensive, HIGHLY DETAILED design specification DESCRIPTION paragraph (4-6 sentences).
Include specific features, realistic details, textures, proportions, and connections.
Describe WHAT to build, not HOW to code it.

CRITICAL: Return ONLY the DESCRIPTION text (natural language), NO markdown, NO code, NO occ.* functions, NO JSON!

EXAMPLE OUTPUT FORMAT:
"Create a realistic bolt at 10 units length with a hexagonal head (3 units across) and threaded cylindrical shaft. The head should be 2 units tall. The shaft (1.5 units diameter) should have realistic thread grooves with 1 unit pitch spacing. Include a chamfered edge on the head for a polished look."`;

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
    const refinedPrompt = (data.code || data.response || '').trim();
    
    console.log('[AI-REFINE] Refined prompt:', refinedPrompt);
    
    return refinedPrompt;
    
  } catch (error) {
    console.error('[AI-REFINE] Failed to refine prompt:', error);
    
    // Fallback: concatenate original with answers
    const answersText = responses.map(r => `${r.answer}`).join(', ');
    return `${originalPrompt}. Details: ${answersText}`;
  }
}
