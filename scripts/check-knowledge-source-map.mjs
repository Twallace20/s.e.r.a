#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const sourceMapPath = path.join(rootDir, "docs", "knowledge", "SOURCE_MAP.md");

const requiredMappedPaths = [
  "README.md",
  "docs/BUILD_VALIDATION.md",
  "docs/roadmap/CERTIFICATION_LADDER.md",
  "docs/roadmap/NEXT_EVOLUTION_ROADMAP.md",
  "docs/vision/SERA_VISION.md",
  "docs/vision/NON_NEGOTIABLES.md",
  "docs/vision/DEFINITION_OF_DONE.md",
  "docs/architecture/PACKAGE_BOUNDARIES.md",
  "docs/security/SECURITY_BASELINE.md",
  "docs/phases/PHASE_14_CI_CERTIFICATION_GATE_V1.md",
  "docs/phases/PHASE_15_KNOWLEDGE_SEEDING_SOURCE_MAP_V1.md",
  "packages/kernel/src/sera-kernel.ts",
  "packages/knowledge/src/knowledge-store.ts",
  "packages/certs/src/certify.ts",
  "apps/cli/src/index.ts"
];

function fail(message) {
  console.error(`S.E.R.A. knowledge source map: FAIL ${message}`);
  process.exit(1);
}

if (!fs.existsSync(sourceMapPath)) {
  fail(`missing docs/knowledge/SOURCE_MAP.md`);
}

const sourceMap = fs.readFileSync(sourceMapPath, "utf8");
const missingFiles = [];
const missingMapEntries = [];

for (const relativePath of requiredMappedPaths) {
  const absolutePath = path.join(rootDir, relativePath);
  if (!fs.existsSync(absolutePath)) {
    missingFiles.push(relativePath);
  }
  if (!sourceMap.includes(`\`${relativePath}\``)) {
    missingMapEntries.push(relativePath);
  }
}

if (missingFiles.length > 0) {
  fail(`missing mapped source file(s): ${missingFiles.join(", ")}`);
}

if (missingMapEntries.length > 0) {
  fail(`SOURCE_MAP.md missing mapped path(s): ${missingMapEntries.join(", ")}`);
}

console.log(`S.E.R.A. knowledge source map: PASS mapped=${requiredMappedPaths.length}`);
