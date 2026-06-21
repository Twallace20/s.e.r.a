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
  ["apps/cli/src/index.ts", "CLI Source"],
  ["scripts/run-operator-console-v2.mjs", "Phase 22 Operator Console v2 Demo Script"],
  ["docs/phases/PHASE_22_OPERATOR_CONSOLE_V2_TERMINAL_UI.md", "Phase 22 Documentation"],
  ["scripts/run-sqlite-persistence-v1.mjs", "Phase 23 SQLite Persistence Demo Script"],
  ["docs/phases/PHASE_23_SQLITE_PERSISTENCE_V1.md", "Phase 23 Documentation"],
  ["scripts/run-tool-plugin-registry-v1.mjs", "Phase 24 Tool Plugin Registry Demo Script"],
  ["docs/phases/PHASE_24_TOOL_PLUGIN_REGISTRY_V1.md", "Phase 24 Documentation"],
  ["tests/integration/capability-registry-skill-graph-v1.test.ts", "Capability Registry Skill Graph Tests"],
  ["scripts/run-capability-registry-skill-graph-v1.mjs", "Capability Registry Skill Graph Demo"],
  ["scripts/lib/capability-registry-skill-graph-v1.mjs", "Capability Registry Skill Graph Source"],
  ["docs/phases/PHASE_25_CAPABILITY_REGISTRY_SKILL_GRAPH_V1.md", "Phase 25 Documentation"],
  ["tests/integration/ci-workflow-gate-v1.test.ts", "CI Workflow Gate Tests"],
  ["scripts/run-ci-workflow-gate-v1.mjs", "CI Workflow Gate Demo"],
  ["scripts/lib/ci-workflow-gate-v1.mjs", "CI Workflow Gate Source"],
  ["docs/phases/PHASE_25B_CI_WORKFLOW_GATE_V1.md", "Phase 25B Documentation"],
  ["tests/integration/phase-artifact-packet-v1.test.ts", "Phase Artifact Packet Tests"],
  ["scripts/run-phase-artifact-packet-v1.mjs", "Phase Artifact Packet Demo"],
  ["scripts/lib/phase-artifact-packet-v1.mjs", "Phase Artifact Packet Source"],
  ["docs/phases/PHASE_25C_PHASE_ARTIFACT_PACKET_V1.md", "Phase 25C Documentation"],
  ["tests/integration/evaluation-harness-v1.test.ts", "Evaluation Harness Tests"],
  ["scripts/run-evaluation-harness-v1.mjs", "Evaluation Harness Demo"],
  ["scripts/lib/evaluation-harness-v1.mjs", "Evaluation Harness Source"],
  ["docs/phases/PHASE_26_EVALUATION_HARNESS_V1.md", "Phase 26 Documentation"],
  ["tests/integration/regression-baseline-registry-v1.test.ts", "Regression Baseline Registry Tests"],
  ["scripts/run-regression-baseline-registry-v1.mjs", "Regression Baseline Registry Demo"],
  ["scripts/lib/regression-baseline-registry-v1.mjs", "Regression Baseline Registry Source"],
  ["docs/phases/PHASE_27_REGRESSION_BASELINE_REGISTRY_V1.md", "Phase 27 Documentation"],
  ["tests/integration/curriculum-builder-v1.test.ts", "Curriculum Builder Tests"],
  ["scripts/run-curriculum-builder-v1.mjs", "Curriculum Builder Demo"],
  ["scripts/lib/curriculum-builder-v1.mjs", "Curriculum Builder Source"],
  ["docs/phases/PHASE_28_CURRICULUM_BUILDER_V1.md", "Phase 28 Documentation"],
  ["tests/integration/domain-learning-packs-v1.test.ts", "Domain Learning Packs Tests"],
  ["scripts/run-domain-learning-packs-v1.mjs", "Domain Learning Packs Demo"],
  ["scripts/lib/domain-learning-packs-v1.mjs", "Domain Learning Packs Source"],
  ["docs/phases/PHASE_29_DOMAIN_LEARNING_PACKS_V1.md", "Phase 29 Documentation"],
  [".github/workflows/verify.yml", "CI Workflow Gate Definition"]
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
