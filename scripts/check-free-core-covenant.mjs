#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const covenantPath = path.join(rootDir, "docs", "governance", "FREE_CORE_COVENANT.md");
const roadmapPath = path.join(rootDir, "docs", "roadmap", "NEXT_EVOLUTION_ROADMAP.md");
const packagePath = path.join(rootDir, "package.json");
const validateFullPath = path.join(rootDir, "scripts", "validate-full.mjs");

function fail(message) {
  console.error(`S.E.R.A. free core covenant: FAIL ${message}`);
  process.exit(1);
}

for (const required of [covenantPath, roadmapPath, packagePath, validateFullPath]) {
  if (!fs.existsSync(required)) fail(`missing required file: ${path.relative(rootDir, required)}`);
}

const covenant = fs.readFileSync(covenantPath, "utf8");
const roadmap = fs.readFileSync(roadmapPath, "utf8");
const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));
const validateFullSource = fs.readFileSync(validateFullPath, "utf8");

const requiredPhrases = [
  "S.E.R.A. must remain fully operational without paid subscriptions",
  "Paid services may exist only as optional adapters",
  "A phase cannot be certified if its main feature requires a paid subscription",
  "External providers must never become a core dependency"
];

for (const phrase of requiredPhrases) {
  if (!covenant.includes(phrase)) fail(`FREE_CORE_COVENANT.md missing phrase: ${phrase}`);
}

if (!roadmap.includes("free/local-first is a certification requirement")) {
  fail("NEXT_EVOLUTION_ROADMAP.md must state that free/local-first is a certification requirement.");
}

if (!pkg.scripts?.["free-core:verify"]) {
  fail("package.json missing free-core:verify script.");
}

const verifyScript = pkg.scripts?.verify ?? "";
if (pkg.scripts?.["validate:full"] !== "node scripts/validate-full.mjs") {
  fail("package.json validate:full script must invoke scripts/validate-full.mjs exactly once.");
}
const invocationCount = (script, name) => (script.match(new RegExp(`npm\\s+run\\s+${name.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}(?=\\s|&|$)`, "g")) ?? []).length;

if (invocationCount(verifyScript, "validate:full") !== 1 || invocationCount(verifyScript, "certify:evidence") !== 1) {
  fail("package.json verify script must invoke validate:full and certify:evidence exactly once.");
}

const validateFullFreeCoreCount = (validateFullSource.match(/"free-core:verify"/g) ?? []).length;
if (invocationCount(verifyScript, "free-core:verify") !== 0 || validateFullFreeCoreCount !== 1) {
  fail("free-core:verify must run exactly once through validate:full and must not be duplicated by verify.");
}

console.log("S.E.R.A. free core covenant: PASS through_phase=45");
