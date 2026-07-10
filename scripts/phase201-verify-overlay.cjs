#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const repo = process.argv[2] || process.cwd();
const manifestPath = path.join(repo, '.overlay', 'manifest.json');
if (!fs.existsSync(manifestPath)) throw new Error(`Missing manifest: ${manifestPath}`);
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
for (const entry of manifest.files) {
  const rel = entry.path.replace(/^repo[\\/]/i, '');
  const abs = path.join(repo, rel);
  if (!fs.existsSync(abs)) throw new Error(`Missing file: ${entry.path}`);
  const buf = fs.readFileSync(abs);
  const sha = crypto.createHash('sha256').update(buf).digest('hex');
  if (buf.length !== entry.bytes) throw new Error(`Byte mismatch for ${entry.path}`);
  if (sha !== entry.sha256) throw new Error(`SHA mismatch for ${entry.path}`);
}
console.log(`PHASE201_OVERLAY_VERIFY_PASS files=${manifest.files.length}`);
