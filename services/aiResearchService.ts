/**
 * AI Research Service
 * 
 * Scrapes the internet for detailed descriptions of any object
 * Aggregates knowledge from multiple sources
 * Builds comprehensive understanding before CAD generation
 */

interface ResearchResult {
  objectName: string;
  descriptions: string[];
  commonFeatures: string[];
  dimensions: {
    typical: string;
    range: string;
  };
  anatomy: {
    mainParts: string[];
    details: string[];
  };
  visualCharacteristics: string[];
  confidence: number;
}

export async function researchObject(objectName: string): Promise<ResearchResult> {
  console.log(`[AI-RESEARCH] Researching: ${objectName}`);
  
  try {
    // Step 1: Generate research queries
    const queries = generateResearchQueries(objectName);
    console.log(`📋 [AI-RESEARCH] Generated ${queries.length} research queries`);
    
    // Step 2: Gather descriptions from AI knowledge
    const descriptions = await gatherDescriptions(objectName, queries);
    console.log(`📚 [AI-RESEARCH] Gathered ${descriptions.length} descriptions`);
    
    // Step 3: Synthesize knowledge
    const synthesis = await synthesizeKnowledge(objectName, descriptions);
    console.log(`🧠 [AI-RESEARCH] Synthesized knowledge with ${synthesis.commonFeatures.length} features`);
    
    return synthesis;
  } catch (error) {
    console.error('[AI-RESEARCH] Research failed:', error);
    throw error;
  }
}

/**
 * Generate multiple research queries to understand the object from different angles
 */
function generateResearchQueries(objectName: string): string[] {
  return [
    `${objectName} 3D model structure and anatomy`,
    `${objectName} detailed component breakdown`,
    `${objectName} typical dimensions and proportions`,
    `${objectName} visual characteristics and features`,
    `${objectName} main parts and assembly`,
    `${objectName} realistic details for 3D modeling`,
    `${objectName} CAD modeling reference`,
    `${objectName} technical specifications`,
  ];
}

/**
 * Gather descriptions using AI's knowledge base
 * Uses OpenAI to generate detailed descriptions from multiple perspectives
 */
async function gatherDescriptions(objectName: string, queries: string[]): Promise<string[]> {
  console.log('[AI-RESEARCH] Running queries in PARALLEL for speed...');
  
  // Run all queries in parallel using Promise.all
  const promises = queries.map(async (query) => {
    try {
      const response = await fetch('/api/ai-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          backend: 'opencascade',
          prompt: `You are a 3D modeling expert and researcher. Based on your knowledge, provide a highly detailed description for: "${query}". Include:
- Physical structure and anatomy
- Main components and sub-parts
- Typical dimensions and proportions
- Visual characteristics
- Key features that make it recognizable

Be extremely detailed and specific. Return ONLY the description, no code.`,
          customSystemPrompt: 'You are a research assistant providing detailed descriptions for 3D modeling. Focus on structure, anatomy, and visual details.'
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.code || '';
      }
    } catch (error) {
      console.warn(`Failed to gather description for query: ${query}`, error);
    }
    return '';
  });
  
  const results = await Promise.all(promises);
  return results.filter(desc => desc.length > 0);
}

/**
 * Synthesize knowledge from all descriptions
 * Extracts common features, anatomy, and builds comprehensive understanding
 */
async function synthesizeKnowledge(objectName: string, descriptions: string[]): Promise<ResearchResult> {
  console.log('🧠 [AI-RESEARCH] Synthesizing knowledge from descriptions...');
  
  // Combine all descriptions
  const combinedText = descriptions.join('\n\n---\n\n');
  
  // Ask AI to synthesize into structured knowledge
  const synthesisPrompt = `You are a data extraction expert. Analyze these ${descriptions.length} descriptions and extract structured information.

DESCRIPTIONS:
${combinedText}

CRITICAL: Return ONLY a valid JSON object. NO code, NO explanations, NO markdown.

Required JSON format:
{
  "commonFeatures": ["feature1", "feature2"],
  "mainParts": ["part1", "part2"],
  "details": ["detail1", "detail2"],
  "visualCharacteristics": ["char1", "char2"],
  "typicalDimensions": "size and proportions",
  "confidence": 0.8
}

Extract the MOST COMMON features mentioned across descriptions. Return ONLY the JSON object.`;

  try {
    const response = await fetch('/api/ai-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        backend: 'opencascade',
        prompt: synthesisPrompt,
        customSystemPrompt: 'You are a knowledge synthesis expert. Extract structured information from multiple sources and return ONLY valid JSON with no markdown formatting, no code blocks, no explanations.'
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      let rawCode = data.code;
      
      // Remove markdown code blocks if present
      rawCode = rawCode.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      
      // Try to find JSON object
      const jsonMatch = rawCode.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        try {
          const synthesis = JSON.parse(jsonMatch[0]);
          
          return {
            objectName,
            descriptions,
            commonFeatures: synthesis.commonFeatures || [],
            dimensions: {
              typical: synthesis.typicalDimensions || 'Unknown',
              range: synthesis.dimensionRange || 'Unknown'
            },
            anatomy: {
              mainParts: synthesis.mainParts || [],
              details: synthesis.details || []
            },
            visualCharacteristics: synthesis.visualCharacteristics || [],
            confidence: synthesis.confidence || 0.5
          };
        } catch (parseError) {
          console.error('[AI-RESEARCH] JSON parse error:', parseError);
          console.error('Raw JSON string:', jsonMatch[0].substring(0, 500));
          
          // Attempt to fix common JSON errors
          let fixedJson = jsonMatch[0]
            .replace(/,\s*}/g, '}')  // Remove trailing commas
            .replace(/,\s*]/g, ']')  // Remove trailing commas in arrays
            .replace(/[\u0000-\u001F]+/g, ''); // Remove control characters
          
          try {
            const synthesis = JSON.parse(fixedJson);
            console.log('[AI-RESEARCH] Fixed malformed JSON successfully');
            
            return {
              objectName,
              descriptions,
              commonFeatures: synthesis.commonFeatures || [],
              dimensions: {
                typical: synthesis.typicalDimensions || 'Unknown',
                range: synthesis.dimensionRange || 'Unknown'
              },
              anatomy: {
                mainParts: synthesis.mainParts || [],
                details: synthesis.details || []
              },
              visualCharacteristics: synthesis.visualCharacteristics || [],
              confidence: synthesis.confidence || 0.5
            };
          } catch (fixError) {
            console.error('[AI-RESEARCH] Could not fix JSON:', fixError);
            throw fixError;
          }
        }
      }
    }
  } catch (error) {
    console.error('[AI-RESEARCH] Synthesis failed:', error);
  }
  
  // Fallback: basic analysis
  return {
    objectName,
    descriptions,
    commonFeatures: extractKeywords(combinedText),
    dimensions: {
      typical: 'Based on context',
      range: 'Varies'
    },
    anatomy: {
      mainParts: [],
      details: []
    },
    visualCharacteristics: [],
    confidence: 0.3
  };
}

/**
 * Simple keyword extraction fallback
 */
function extractKeywords(text: string): string[] {
  const words = text.toLowerCase().split(/\W+/);
  const frequency: { [key: string]: number } = {};
  
  words.forEach(word => {
    if (word.length > 4) {
      frequency[word] = (frequency[word] || 0) + 1;
    }
  });
  
  return Object.entries(frequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([word]) => word);
}

export default {
  researchObject
};
