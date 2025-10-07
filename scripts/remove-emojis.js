#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Common emojis to remove (not symbols like ×, →, etc.)
const emojisToRemove = [
  '', '', '', '', '', '', '', '', '', '', 
  '', '', '', '', '', '', '', '', '', '',
  '', '', '', '', '', '', '', '', '', '',
  '', '', '', '', '', '', '', '', '', '',
  '', '', '', '', '', '', '', '', '', '',
  '', '', '', '', '', '', '', '', '', '',
  '', '', '', '', '', '', '', '', '', '',
  '', '', '', '', '', '', '', '', '', '',
  '', '', '', '', '', '', '', '', '', '',
  '', '', '', '', '', '', '', '', '', '',
  '', '', '', '', '', '', '', '', '', '',
  '', '', '', '', '', '', '', '', '', ''
];

// Files/directories to exclude
const excludePatterns = [
  '**/node_modules/**',
  '**/.next/**',
  '**/dist/**',
  '**/build/**',
  '**/.git/**',
  '**/package-lock.json',
  '**/yarn.lock'
];

// File patterns to process
const filePatterns = [
  '**/*.ts',
  '**/*.tsx',
  '**/*.js',
  '**/*.jsx'
];

function removeEmojis(content) {
  let cleaned = content;
  emojisToRemove.forEach(emoji => {
    // Remove emoji followed by optional space
    const regex = new RegExp(emoji + '\\s*', 'g');
    cleaned = cleaned.replace(regex, '');
  });
  return cleaned;
}

function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const cleaned = removeEmojis(content);
    
    if (content !== cleaned) {
      fs.writeFileSync(filePath, cleaned, 'utf8');
      console.log(`Cleaned: ${filePath}`);
      return 1;
    }
    return 0;
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
    return 0;
  }
}

function main() {
  console.log('Removing emojis from codebase...\n');
  
  let filesProcessed = 0;
  let filesModified = 0;

  filePatterns.forEach(pattern => {
    const files = glob.sync(pattern, {
      ignore: excludePatterns,
      nodir: true
    });

    files.forEach(file => {
      filesProcessed++;
      filesModified += processFile(file);
    });
  });

  console.log(`\nDone!`);
  console.log(`Files processed: ${filesProcessed}`);
  console.log(`Files modified: ${filesModified}`);
}

main();
