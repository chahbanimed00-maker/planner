#!/usr/bin/env node
// Scan planner.js for occurrences of setDataValidation and print context
const fs = require('fs');
const path = require('path');

const FILE = path.resolve(__dirname, '..', 'planner.js');
const CONTEXT = 3;

try {
  const text = fs.readFileSync(FILE, 'utf8');
  const lines = text.split(/\r?\n/);
  const matches = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('setDataValidation(') || lines[i].includes('setDataValidations(')) {
      const start = Math.max(0, i - CONTEXT);
      const end = Math.min(lines.length - 1, i + CONTEXT);
      const snippet = lines.slice(start, end + 1).map((l, idx) => {
        const lineNo = start + idx + 1;
        return `${lineNo.toString().padStart(4)} | ${l}`;
      }).join('\n');
      matches.push({line: i + 1, snippet});
    }
  }

  if (matches.length === 0) {
    console.log('No occurrences of setDataValidation found in planner.js');
    process.exit(0);
  }

  console.log(`Found ${matches.length} occurrence(s) of setDataValidation / setDataValidations in planner.js`);
  matches.forEach(m => {
    console.log('\n--- Occurrence at line ' + m.line + ' ---\n');
    console.log(m.snippet);
  });
} catch (err) {
  console.error('Error reading planner.js:', err);
  process.exit(2);
}
