#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Patterns to look for and fix
const patterns = [
  // Pattern: sendSuccess(res, ...) at end of try block - add return
  {
    search: /(^[ ]*)(sendSuccess\(res,[\s\S]*?\);)(\s*}[\s]*catch)/gm,
    replace: '$1return $2$3'
  },
  // Pattern: sendError(res, ...) at end of catch block - add return
  {
    search: /(^[ ]*)(sendError\(res,[\s\S]*?\);)(\s*}[\s]*$)/gm,
    replace: '$1return $2$3'
  },
  // Pattern: sendError(res, ...) at end of catch block before closing - add return
  {
    search: /(^[ ]*)(sendError\(res,[\s\S]*?\);)(\s*}\s*\)\s*;)/gm,
    replace: '$1return $2$3'
  }
];

// Function to fix return statements in a file
function fixReturnStatements(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return false;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Apply each pattern
  for (const pattern of patterns) {
    const newContent = content.replace(pattern.search, pattern.replace);
    if (newContent !== content) {
      content = newContent;
      modified = true;
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed return statements in: ${filePath}`);
    return true;
  }

  return false;
}

// Get list of controller files
const controllersDir = path.join(__dirname, 'src/controllers');
const serviceFiles = path.join(__dirname, 'src/app.ts');

let fixedCount = 0;

// Fix app.ts
if (fixReturnStatements(serviceFiles)) {
  fixedCount++;
}

// Fix all controller files
if (fs.existsSync(controllersDir)) {
  const files = fs.readdirSync(controllersDir);
  for (const file of files) {
    if (file.endsWith('.controller.ts')) {
      const filePath = path.join(controllersDir, file);
      if (fixReturnStatements(filePath)) {
        fixedCount++;
      }
    }
  }
}

console.log(`Fixed return statements in ${fixedCount} files`);