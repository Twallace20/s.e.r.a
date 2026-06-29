#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";

const VERSION = "phase126-artifact-download-routing-idempotency-v1";
const autoOps = process.env.SERA_AUTOOPS_DIR || path.join(os.homedir(), "OneDrive", "SERA-AutoOps");
const control = path.join(autoOps, "00_control_center");
const ledgerPath = path.join(control, "artifact-routing-idempotency-ledger.json");
function ensureDir(dir){ fs.mkdirSync(dir,{recursive:true}); }
function sha(file){ return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex").toUpperCase(); }
function files(dir){ return fs.existsSync(dir) ? fs.readdirSync(dir).map(n=>path.join(dir,n)).filter(f=>fs.statSync(f).isFile()) : []; }
function main(){
  ensureDir(control);
  const summary = { version: VERSION, checkedAt: new Date().toISOString(), autoOps, queues: {} };
  for (const [name, rel] of Object.entries({ downloads:"13_chatgpt_downloads", normal:"01_apply_approved", hotfix:"02_hotfix_approved", pending:"09_merge_pending", handoff:"06_handoff" })) {
    const dir = path.join(autoOps, rel);
    summary.queues[name] = files(dir).map(file => ({ file, name:path.basename(file), size:fs.statSync(file).size, sha256: file.toLowerCase().endsWith(".zip") ? sha(file) : null })).slice(-50);
  }
  fs.writeFileSync(ledgerPath, JSON.stringify(summary,null,2)+"\n", "utf8");
  console.log(JSON.stringify({ ok:true, version:VERSION, ledgerPath }, null, 2));
}
main();
