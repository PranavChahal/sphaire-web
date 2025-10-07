/**
 * Test OpenAI API Key Configuration
 * Run this to verify your .env.local is set up correctly
 */

const fs = require('fs');
const path = require('path');

// Manually load .env.local (don't need dotenv package)
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=:#]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  });
}

console.log('Testing OpenAI API Configuration...\n');

// Check if API key exists
const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  console.error('OPENAI_API_KEY not found in environment variables');
  console.error('\nTo fix:');
  console.error('1. Make sure .env.local exists in project root');
  console.error('2. Add this line to .env.local:');
  console.error('   OPENAI_API_KEY=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');
  console.error('3. Restart your dev server completely (Ctrl+C then npm run dev)');
  process.exit(1);
}

console.log('OPENAI_API_KEY found');
console.log(`   Length: ${apiKey.length} characters`);
console.log(`   Starts with: ${apiKey.substring(0, 10)}...`);
console.log(`   Ends with: ...${apiKey.substring(apiKey.length - 4)}`);

// Test OpenAI connection
async function testOpenAI() {
  try {
    const OpenAI = require('openai');
    const openai = new OpenAI({ apiKey });
    
    console.log('\nTesting OpenAI API connection...');
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'Say "Hello!"' }],
      max_tokens: 10
    });
    
    console.log('OpenAI API connection successful!');
    console.log(`   Response: "${response.choices[0].message.content}"`);
    console.log('\nYour API key is working correctly!');
    
  } catch (error) {
    console.error('\nOpenAI API test failed:');
    console.error(`   Error: ${error.message}`);
    
    if (error.code === 'invalid_api_key') {
      console.error('\nYour API key is invalid. Please check:');
      console.error('   1. The key is copied correctly (no extra spaces)');
      console.error('   2. The key hasn\'t been revoked');
      console.error('   3. Your OpenAI account is active');
    } else if (error.status === 429) {
      console.error('\nRate limit exceeded. Your key works but you need to wait.');
    } else if (error.code === 'insufficient_quota') {
      console.error('\nYour OpenAI account has no credits. Please add credits.');
    }
  }
}

testOpenAI();
