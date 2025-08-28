import { NextApiRequest, NextApiResponse } from 'next';

// Direct Supabase URL for the public bucket
const BUCKET_URL = 'https://mvqfkhyxrcymuvorjeru.supabase.co/storage/v1/object/public/thingi10k';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const listUrl = `${BUCKET_URL}?prefix=`;
    console.log(`Fetching bucket contents from: ${listUrl}`);
    
    const response = await fetch(listUrl);
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error listing bucket:', response.status, errorText);
      return res.status(500).json({ 
        error: 'Failed to list bucket contents',
        status: response.status,
        details: errorText
      });
    }
    
    const items = await response.json();
    console.log(`Found ${items.length} items in bucket`);
    
    // Add public URL to each item
    const itemsWithUrls = items.map((item: any) => ({
      ...item,
      publicUrl: `${BUCKET_URL}/${item.name}`
    }));
    
    return res.status(200).json({ 
      items: itemsWithUrls,
      bucketUrl: BUCKET_URL
    });
  } catch (error: any) {
    console.error('❌ Unexpected error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
}
