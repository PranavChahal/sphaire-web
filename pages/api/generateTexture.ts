import { NextApiRequest, NextApiResponse } from 'next';
import Cors from 'cors';


type SuccessResponse = {
  url: string;
};

type ErrorResponse = {
  error: string;
};


const cors = Cors({
  methods: ['POST', 'OPTIONS'],
  origin: '*', 
});


function runMiddleware(
  req: NextApiRequest,
  res: NextApiResponse,
  fn: Function
) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result: any) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
}

/**
 * API route that generates a texture image using DALL-E
 * 
 * @param req Next.js API request with a JSON body containing {prompt: string}
 * @param res Next.js API response returning either image URL or error
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | ErrorResponse>
) {
  
  await runMiddleware(req, res, cors);
  
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Please use POST.' });
  }

  try {

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error('OpenAI API key not configured');
      return res.status(500).json({ error: 'OpenAI API key not configured' });
    }


    const { prompt } = req.body;
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid "prompt" in request body' });
    }
    

    const enhancedPrompt = `High quality seamless texture: ${prompt}. Suitable for 3D modeling, top-down view, flat lighting, no shadows, tileable, high resolution.`;


    const payload = {
      prompt: enhancedPrompt,
      n: 1,                   
      size: "1024x1024",     
      response_format: "url", 
      model: "dall-e-3",      
      quality: "hd"           
    };

    
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      return res.status(response.status).json({ 
        error: `OpenAI API error: ${errorData.error?.message || 'Unknown error'}` 
      });
    }

    const data = await response.json();
    
    
    const imageUrl = data.data?.[0]?.url;

    if (!imageUrl) {
      return res.status(500).json({ error: 'No image URL returned by OpenAI' });
    }

    
    return res.status(200).json({ url: imageUrl });
    
  } catch (error) {
    console.error('Error generating texture:', error);
    return res.status(500).json({ 
      error: `Error generating texture: ${error instanceof Error ? error.message : 'Unknown error'}` 
    });
  }
}
