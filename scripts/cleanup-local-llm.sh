#!/bin/bash

# Cleanup script for removing local LLM dependencies and files
# Run after switching to OpenAI GPT-4o backend

echo "🧹 Cleaning up local LLM dependencies..."

# Remove llm-server directory (if you want to keep the model files, comment this out)
if [ -d "llm-server" ]; then
    echo "📁 Removing llm-server directory..."
    rm -rf llm-server
fi

# Remove local LLM service file
if [ -f "services/localLLM.ts" ]; then
    echo "🗑️  Removing localLLM.ts service..."
    mv services/localLLM.ts services/localLLM.ts.backup
fi

# Update .env.local to remove LOCAL_LLM_URL (keep other vars)
if [ -f ".env.local" ]; then
    echo "⚙️  Updating .env.local..."
    grep -v "LOCAL_LLM_URL" .env.local > .env.local.tmp && mv .env.local.tmp .env.local
fi

# Remove any background LLM server processes
echo "🛑 Stopping any running llama.cpp servers..."
pkill -f "llama-server" || true
pkill -f "llama.cpp" || true

echo "✅ Local LLM cleanup complete!"
echo "🚀 Your app is now running purely on OpenAI GPT-4o"

# Test the API endpoints
echo "🧪 Testing API endpoints..."
echo "Run: npm run dev"
echo "Then test the AI generation features in your app!"
