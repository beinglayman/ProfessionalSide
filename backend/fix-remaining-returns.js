#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Function to fix return statements in a file
function fixReturnStatements(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return false;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Fix sendPaginated calls missing returns
  const sendPaginatedPattern = /(^[ ]*)(sendPaginated\(res,[\s\S]*?\);)/gm;
  const newContent1 = content.replace(sendPaginatedPattern, (match, indent, call) => {
    if (!call.startsWith('return ')) {
      modified = true;
      return indent + 'return ' + call;
    }
    return match;
  });
  content = newContent1;

  // Fix sendSuccess calls missing returns
  const sendSuccessPattern = /(^[ ]*)(sendSuccess\(res,[\s\S]*?\);)/gm;
  const newContent2 = content.replace(sendSuccessPattern, (match, indent, call) => {
    if (!call.startsWith('return ')) {
      modified = true;
      return indent + 'return ' + call;
    }
    return match;
  });
  content = newContent2;

  // Fix sendError calls missing returns (but skip ones already after return statements)
  const sendErrorPattern = /(^[ ]*)(sendError\(res,[\s\S]*?\);)/gm;
  const newContent3 = content.replace(sendErrorPattern, (match, indent, call, offset, string) => {
    // Skip if this is already after a return statement
    const beforeMatch = string.substring(0, offset);
    const lines = beforeMatch.split('\n');
    const currentLineIndex = lines.length - 1;

    // Check previous few lines for return statements
    for (let i = Math.max(0, currentLineIndex - 3); i < currentLineIndex; i++) {
      if (lines[i] && lines[i].trim().startsWith('return ')) {
        return match; // Don't modify, already has return
      }
    }

    if (!call.startsWith('return ')) {
      modified = true;
      return indent + 'return ' + call;
    }
    return match;
  });
  content = newContent3;

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed remaining return statements in: ${filePath}`);
    return true;
  }

  return false;
}

// Get list of controller files and app.ts
const files = [
  'src/app.ts',
  'src/controllers/audit.controller.ts',
  'src/controllers/export.controller.ts',
  'src/controllers/journal.controller.ts',
  'src/controllers/onboarding.controller.ts',
  'src/controllers/search.controller.ts',
  'src/controllers/user.controller.ts',
  'src/controllers/skills-benchmark.controller.ts'
];

let fixedCount = 0;

for (const file of files) {
  const filePath = path.join(__dirname, file);
  if (fixReturnStatements(filePath)) {
    fixedCount++;
  }
}

console.log(`Fixed return statements in ${fixedCount} additional files`);