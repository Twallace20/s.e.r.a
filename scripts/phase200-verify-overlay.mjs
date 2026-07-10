#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(__dirname, '..');
function fail(msg) { console.error('PHASE200_OVERLAY_VERIFY_FAIL ' + msg); process.exit(1); }
function sha256(p) { return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'); }
const manifestPath = path.join(repoRoot, '.overlay', 'manifest.json');
if (!fs.existsSync(manifestPath)) fail('missing manifest');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
if (manifest.phase !== 200) fail('phase mismatch');
if (manifest.phaseSlug !== 'phase200_repeat_full_autopilot_clean_baseline_proof_v1') fail('phaseSlug mismatch');
if (manifest.expectedZipFilename !== 's.e.r.a_phase200_repeat_full_autopilot_clean_baseline_proof_v1_overlay.zip') fail('expectedZipFilename mismatch');
const required = [
  'repo/.sera-proof/phase200_repeat_full_autopilot_clean_baseline_proof_v1_overlay_proof.json',
  'repo/commands/phase200-repeat-full-autopilot-clean-baseline-proof-v1.command.json',
  'repo/scripts/verify-phase200-repeat-full-autopilot-clean-baseline-proof-v1.ps1',
  'repo/scripts/qa-phase200-repeat-full-autopilot-clean-baseline-proof-v1.ps1',
  'repo/scripts/sera-phase200-repeatability-proof-v1.ps1',
  'repo/scripts/sera-phase200-current-phase-pointer-clean-repo-proof-v1.ps1',
  'repo/scripts/sera-phase200-direct-closeout-gate-v1.ps1'
];
const paths = new Set((manifest.files || []).map(f => f.path));
for (const p of required) if (!paths.has(p)) fail('missing required path in manifest: ' + p);
for (const entry of manifest.files || []) {
  const rel = entry.path.replace(/^repo[\/]/i, '');
  const abs = path.join(repoRoot, rel);
  if (!fs.existsSync(abs)) fail('missing file: ' + entry.path);
  if (entry.sha256 && sha256(abs) !== entry.sha256) fail('hash mismatch: ' + entry.path);
}
console.log('PHASE200_OVERLAY_VERIFY_PASS files=' + (manifest.files || []).length);
