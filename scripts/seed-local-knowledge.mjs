#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const rootDir = process.cwd();
const args = new Set(process.argv.slice(2));
const reset = args.has("--reset");
const cliPath = path.join(rootDir, "apps", "cli", "dist", "index.js");
const knowledgeDir = path.join(rootDir, ".sera-knowledge");

const seedSources = [
  ["README.md", "S.E.R.A. README"],
  ["docs/BUILD_VALIDATION.md", "Build Validation"],
  ["docs/roadmap/CERTIFICATION_LADDER.md", "Certification Ladder"],
  ["docs/roadmap/NEXT_EVOLUTION_ROADMAP.md", "Next Evolution Roadmap"],
  ["docs/vision/SERA_VISION.md", "S.E.R.A. Vision"],
  ["docs/vision/NON_NEGOTIABLES.md", "Non-Negotiables"],
  ["docs/vision/DEFINITION_OF_DONE.md", "Definition of Done"],
  ["docs/architecture/PACKAGE_BOUNDARIES.md", "Package Boundaries"],
  ["docs/security/SECURITY_BASELINE.md", "Security Baseline"],
  ["docs/knowledge/SOURCE_MAP.md", "Knowledge Source Map"],
  ["docs/knowledge/SEEDING_GUIDE.md", "Knowledge Seeding Guide"],
  ["docs/phases/PHASE_15_KNOWLEDGE_SEEDING_SOURCE_MAP_V1.md", "Phase 15 Documentation"],
  ["packages/kernel/src/sera-kernel.ts", "Kernel Source"],
  ["packages/knowledge/src/knowledge-store.ts", "Knowledge Store Source"],
  ["packages/certs/src/certify.ts", "Certification Source"],
  ["apps/cli/src/index.ts", "CLI Source"]
];

const seedSearches = [
  "operator console certification gate",
  "knowledge source map",
  "autonomous dev loop validation",
  "approved lessons regression rules"
];

function fail(message) {
  console.error(`S.E.R.A. knowledge seed: FAIL ${message}`);
  process.exit(1);
}

function runSera(args) {
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd: rootDir,
    encoding: "utf8",
    stdio: "pipe"
  });
  if (result.stdout.trim()) console.log(result.stdout.trim());
  if (result.stderr.trim()) console.error(result.stderr.trim());
  if (result.status !== 0) {
    fail(`command failed: sera ${args.join(" ")}`);
  }
}

if (!fs.existsSync(cliPath)) {
  fail("CLI dist file missing. Run npm run build before seeding knowledge.");
}

if (reset) {
  fs.rmSync(knowledgeDir, { recursive: true, force: true });
}

for (const [relativePath, title] of seedSources) {
  if (!fs.existsSync(path.join(rootDir, relativePath))) {
    fail(`seed source missing: ${relativePath}`);
  }
  runSera(["knowledge", "ingest-file", relativePath, title]);
}

for (const query of seedSearches) {
  runSera(["knowledge", "search", query, "5"]);
}

runSera(["knowledge", "summary"]);
console.log(`S.E.R.A. knowledge seed: PASS indexed=${seedSources.length} searches=${seedSearches.length}`);
