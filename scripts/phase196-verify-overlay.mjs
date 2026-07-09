import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const repoRoot = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
const manifestPath = path.join(repoRoot, '.overlay', 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const failures = [];
if (manifest.phase !== 196) failures.push(`phase mismatch: ${manifest.phase}`);
if (manifest.phaseSlug !== 'phase196_closeout_integrity_remote_truth_gate_v1') failures.push(`phaseSlug mismatch: ${manifest.phaseSlug}`);
if (manifest.expectedZipFilename !== 's.e.r.a_phase196_closeout_integrity_remote_truth_gate_v1_overlay.zip') failures.push(`expectedZipFilename mismatch: ${manifest.expectedZipFilename}`);
for (const entry of manifest.files || []) {
  const rel = entry.path.replace(/^repo[\\/]/, '');
  const full = path.join(repoRoot, rel);
  if (!fs.existsSync(full)) { failures.push(`missing ${entry.path}`); continue; }
  const bytes = fs.statSync(full).size;
  const sha = crypto.createHash('sha256').update(fs.readFileSync(full)).digest('hex');
  if (entry.bytes !== bytes) failures.push(`bytes mismatch ${entry.path}: expected ${entry.bytes} actual ${bytes}`);
  if (entry.sha256 !== sha) failures.push(`sha mismatch ${entry.path}: expected ${entry.sha256} actual ${sha}`);
}
if (failures.length) {
  console.error('PHASE196_OVERLAY_VERIFY_BLOCKED');
  for (const failure of failures) console.error(failure);
  process.exit(1);
}
console.log(`PHASE196_OVERLAY_VERIFY_PASS files=${(manifest.files || []).length}`);
