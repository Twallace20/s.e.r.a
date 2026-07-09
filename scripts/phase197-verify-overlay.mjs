#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const root = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
const manifestPath = path.join(root, '.overlay', 'manifest.json');
function fail(msg) { console.error(`PHASE197_OVERLAY_VERIFY_FAIL ${msg}`); process.exit(1); }
function sha256(file) { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }
if (!fs.existsSync(manifestPath)) fail(`missing manifest ${manifestPath}`);
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
if (manifest.phase !== 197) fail(`wrong phase ${manifest.phase}`);
if (manifest.phaseSlug !== 'phase197_full_autopilot_json_to_remote_truth_closeout_proof_v1') fail(`wrong slug ${manifest.phaseSlug}`);
if (manifest.expectedZipFilename !== 's.e.r.a_phase197_full_autopilot_json_to_remote_truth_closeout_proof_v1_overlay.zip') fail(`wrong expected zip ${manifest.expectedZipFilename}`);
if (manifest.zipRoot !== 'repo/') fail(`wrong zip root ${manifest.zipRoot}`);
if (!manifest.phase196TrustedBaseline || manifest.phase196TrustedBaseline.commit !== '7a060e9eb81af79b37b581ca9147b36869866e17') fail('missing Phase196 trusted baseline');
for (const item of manifest.files || []) {
  const rel = item.path.replace(/^repo\//, '');
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) fail(`missing ${item.path}`);
  const actual = sha256(file);
  if (actual !== item.sha256) fail(`sha mismatch ${item.path} expected=${item.sha256} actual=${actual}`);
}
const proof = path.join(root, '.sera-proof', 'phase197_full_autopilot_json_to_remote_truth_closeout_proof_v1_overlay_proof.json');
if (!fs.existsSync(proof)) fail('missing proof file');
const proofJson = JSON.parse(fs.readFileSync(proof, 'utf8'));
if (proofJson.phaseSlug !== manifest.phaseSlug) fail('proof slug mismatch');
console.log(`PHASE197_OVERLAY_VERIFY_PASS files=${(manifest.files || []).length}`);
