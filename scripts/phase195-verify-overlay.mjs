#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const repo = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
const required = [
  '.overlay/manifest.json',
  '.sera-proof/phase195_full_autopilot_cold_run_v1_overlay_proof.json',
  'commands/phase195-full-autopilot-cold-run-v1.command.json',
  'docs/phases/PHASE_195_FULL_AUTOPILOT_COLD_RUN_V1.md',
  'src/chatgpt/phase195FullAutopilotColdRun.ts',
  'scripts/phase195-full-autopilot-cold-run.ts',
  'scripts/verify-phase195-full-autopilot-cold-run-v1.ps1',
  'scripts/qa-phase195-full-autopilot-cold-run-v1.ps1',
  'tests/phase195-full-autopilot-cold-run.contract.test.ts'
];

function sha256(file) {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(file));
  return hash.digest('hex');
}

const missing = required.filter((rel) => !fs.existsSync(path.join(repo, rel)));
if (missing.length) {
  console.error(JSON.stringify({ ok: false, missing }, null, 2));
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(path.join(repo, '.overlay/manifest.json'), 'utf8'));
const proof = JSON.parse(fs.readFileSync(path.join(repo, '.sera-proof/phase195_full_autopilot_cold_run_v1_overlay_proof.json'), 'utf8'));

const badHashes = [];
for (const entry of manifest.files) {
  const abs = path.join(repo, entry.path.replace(/^repo\//, ''));
  if (!fs.existsSync(abs)) {
    badHashes.push({ path: entry.path, error: 'missing' });
    continue;
  }
  const actual = sha256(abs);
  if (entry.sha256 && actual !== entry.sha256) {
    badHashes.push({ path: entry.path, expected: entry.sha256, actual });
  }
}

const ok = badHashes.length === 0 && proof.commandContract.expectedZipFilename === 's.e.r.a_phase195_full_autopilot_cold_run_v1_overlay.zip';
console.log(JSON.stringify({
  ok,
  phaseSlug: manifest.phaseSlug,
  commandId: proof.commandContract.commandId,
  fileCount: manifest.files.length,
  badHashes
}, null, 2));
process.exit(ok ? 0 : 1);
