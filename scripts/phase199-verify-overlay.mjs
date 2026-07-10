import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const zipRoot = process.argv[2] || process.cwd();
const expectedSlug = "phase199_post_closeout_clean_repo_endurance_autopilot_v1";
const expectedZip = "s.e.r.a_phase199_post_closeout_clean_repo_endurance_autopilot_v1_overlay.zip";
function sha256(file) { return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex"); }
function readJson(file) { return JSON.parse(fs.readFileSync(file, "utf8")); }
const manifestPath = path.join(zipRoot, "repo", ".overlay", "manifest.json");
if (!fs.existsSync(manifestPath)) throw new Error(`Missing manifest: ${manifestPath}`);
const manifest = readJson(manifestPath);
if (manifest.phaseSlug !== expectedSlug) throw new Error(`phaseSlug mismatch: ${manifest.phaseSlug}`);
if (manifest.expectedZipFilename !== expectedZip) throw new Error(`expectedZipFilename mismatch: ${manifest.expectedZipFilename}`);
for (const entry of manifest.files || []) {
  if (entry.path === "repo/.overlay/manifest.json") continue;
  const file = path.join(zipRoot, entry.path.replaceAll("/", path.sep));
  if (!fs.existsSync(file)) throw new Error(`Missing manifest file: ${entry.path}`);
  if (entry.sha256 && sha256(file) !== entry.sha256) throw new Error(`sha256 mismatch: ${entry.path}`);
}
console.log(`PHASE199_OVERLAY_VERIFY_PASS files=${manifest.files.length}`);
