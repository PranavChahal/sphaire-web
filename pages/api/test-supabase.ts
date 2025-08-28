import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// Direct Supabase URL for the public bucket
const BUCKET_URL = 'https://mvqfkhyxrcymuvorjeru.supabase.co/storage/v1/object/public/thingi10k';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // List files in the bucket using direct URL
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
    
    const files = await response.json();
    console.log(`Found ${files.length} files in bucket`);
    
    // Try to access a test file if available
    if (files.length > 0) {
      const testFile = files[0];
      const fileUrl = `${BUCKET_URL}/${testFile.name}`;
      console.log(`Attempting to access test file: ${fileUrl}`);
      
      const fileResponse = await fetch(fileUrl);
      if (!fileResponse.ok) {
        const errorText = await fileResponse.text();
        console.error('Error accessing file:', fileResponse.status, errorText);
        return res.status(500).json({ 
          error: 'Failed to access test file', 
          status: fileResponse.status,
          details: errorText,
          files: files
        });
      }
      
      const fileData = await fileResponse.blob();
      console.log(`Successfully accessed test file: ${testFile.name}, size: ${fileData.size} bytes`);
      
      return res.status(200).json({ 
        message: 'Successfully connected to Supabase storage',
        files: files,
        testAccess: {
          fileName: testFile.name,
          size: fileData.size,
          type: fileData.type,
          url: fileUrl
        },
        bucketUrl: BUCKET_URL
      });
    } else {
      return res.status(200).json({ 
        message: 'No files found in bucket',
        files: files,
        bucketUrl: BUCKET_URL
      });
    }
  } catch (error: any) {
    console.error('❌ Error in test endpoint:', error);
    return res.status(500).json({ 
      error: 'Test failed', 
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
