#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '..', 'src');

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
    } else if (entry.isFile() && full.endsWith('.ts')) {
      replaceImports(full);
    }
  }
}

function replaceImports(file) {
  const original = fs.readFileSync(file, 'utf8');
  const replaced = original.replace(/from\s+['"]src\//g, "from '@/");
  if (replaced !== original) {
    fs.writeFileSync(file, replaced, 'utf8');
    console.log(`updated: ${path.relative(process.cwd(), file)}`);
  }
}

walk(SRC_DIR);
