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
  "apps/cli/src/index.ts",
  "docs/phases/PHASE_16_LIVE_AUTONOMOUS_DEV_HAPPY_PATH_V1.md",
  "tests/integration/live-autonomy-happy-path.test.ts",
  "packages/memory/src/memory-store.ts",
  "docs/phases/PHASE_17_LESSON_REVIEW_WORKBENCH_V1.md",
  "scripts/run-lesson-review-workbench.mjs",
  "tests/integration/lesson-review-workbench.test.ts",
  "docs/governance/FREE_CORE_COVENANT.md",
  "docs/phases/PHASE_18_LOCAL_MODEL_PROVIDER_V1.md",
  "packages/model-provider/src/model-provider-store.ts",
  "scripts/check-free-core-covenant.mjs",
  "scripts/run-local-model-provider.mjs",
  "tests/integration/local-model-provider.test.ts",
  "docs/phases/PHASE_19_RECURSIVE_LEARNING_V1.md",
  "scripts/run-recursive-learning.mjs",
  "tests/integration/recursive-learning.test.ts",
  "packages/workers/src/multi-file-developer-worker.ts",
  "docs/phases/PHASE_20_MULTI_FILE_DEV_WORKER_V3.md",
  "scripts/run-multi-file-dev-worker.mjs",
  "tests/integration/multi-file-dev-worker.test.ts",
  "packages/research/src/research-knowledge-worker.ts",
  "docs/phases/PHASE_21_RESEARCH_KNOWLEDGE_WORKER_V1.md",
  "scripts/run-research-knowledge-worker.mjs",
  "tests/integration/research-knowledge-worker.test.ts",
  "tests/integration/operator-console-v2.test.ts",
  "scripts/run-operator-console-v2.mjs",
  "scripts/lib/operator-console-v2.mjs",
  "docs/phases/PHASE_22_OPERATOR_CONSOLE_V2_TERMINAL_UI.md"
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
