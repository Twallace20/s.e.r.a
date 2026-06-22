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
  "tests/integration/sqlite-persistence-v1.test.ts",
  "tests/integration/tool-plugin-registry-v1.test.ts",
  "tests/integration/capability-registry-skill-graph-v1.test.ts",
  "tests/integration/ci-workflow-gate-v1.test.ts",
  "tests/integration/phase-artifact-packet-v1.test.ts",
  "tests/integration/evaluation-harness-v1.test.ts",
  "tests/integration/regression-baseline-registry-v1.test.ts",
  "tests/integration/curriculum-builder-v1.test.ts",
  "tests/integration/domain-learning-packs-v1.test.ts",
  "tests/integration/knowledge-refresh-source-trust-v1.test.ts",
  "tests/integration/planner-task-decomposer-v2.test.ts",
  "tests/integration/phase-packet-generator-v1.test.ts",
  "tests/integration/branch-proposal-builder-v1.test.ts",
  "docs/phases/PHASE_34_BRANCH_READINESS_INSPECTOR_V1.md",
  "scripts/lib/branch-readiness-inspector-v1.mjs",
  "scripts/run-branch-readiness-inspector-v1.mjs",
  "tests/integration/branch-readiness-inspector-v1.test.ts",
  "docs/phases/PHASE_35_REMOTE_PHASE_RUNNER_BLUEPRINT_V1.md",
  "scripts/lib/remote-phase-runner-blueprint-v1.mjs",
  "scripts/run-remote-phase-runner-blueprint-v1.mjs",
  "tests/integration/remote-phase-runner-blueprint-v1.test.ts",
  "docs/phases/PHASE_36_OWNER_APPROVAL_QUEUE_V1.md",
  "scripts/lib/owner-approval-queue-v1.mjs",
  "scripts/run-owner-approval-queue-v1.mjs",
  "tests/integration/owner-approval-queue-v1.test.ts",
  "docs/phases/PHASE_37_SELF_HOSTED_RUNNER_ADAPTER_V1.md",
  "scripts/lib/self-hosted-runner-adapter-v1.mjs",
  "scripts/run-self-hosted-runner-adapter-v1.mjs",
  "tests/integration/self-hosted-runner-adapter-v1.test.ts",
  "docs/phases/PHASE_38_COMMAND_ALLOWLIST_GATE_V1.md",
  "scripts/lib/command-allowlist-gate-v1.mjs",
  "scripts/run-command-allowlist-gate-v1.mjs",
  "tests/integration/command-allowlist-gate-v1.test.ts",
  "docs/phases/PHASE_39_EVIDENCE_CAPTURE_BUNDLE_V1.md",
  "scripts/lib/evidence-capture-bundle-v1.mjs",
  "scripts/run-evidence-capture-bundle-v1.mjs",
  "tests/integration/evidence-capture-bundle-v1.test.ts",
  "docs/phases/PHASE_40_OVERNIGHT_BRANCH_WORKER_V1.md",
  "scripts/lib/overnight-branch-worker-v1.mjs",
  "scripts/run-overnight-branch-worker-v1.mjs",
  "tests/integration/overnight-branch-worker-v1.test.ts",
  "docs/phases/PHASE_41_OWNER_DECISION_RECORDER_V1.md",
  "scripts/lib/owner-decision-recorder-v1.mjs",
  "scripts/run-owner-decision-recorder-v1.mjs",
  "tests/integration/owner-decision-recorder-v1.test.ts",
  "docs/phases/PHASE_42_APPROVAL_GATED_ACTION_PLAN_V1.md",
  "scripts/lib/approval-gated-action-plan-v1.mjs",
  "scripts/run-approval-gated-action-plan-v1.mjs",
  "tests/integration/approval-gated-action-plan-v1.test.ts",
  "docs/phases/PHASE_43_SESSION_LOCK_GUARD_V1.md",
  "scripts/lib/session-lock-guard-v1.mjs",
  "scripts/run-session-lock-guard-v1.mjs",
  "tests/integration/session-lock-guard-v1.test.ts",
  "docs/phases/PHASE_44_EMERGENCY_STOP_GUARD_V1.md",
  "scripts/lib/emergency-stop-guard-v1.mjs",
  "scripts/run-emergency-stop-guard-v1.mjs",
  "tests/integration/emergency-stop-guard-v1.test.ts",
  "scripts/run-branch-proposal-builder-v1.mjs",
  "scripts/lib/branch-proposal-builder-v1.mjs",
  "docs/phases/PHASE_33_BRANCH_PROPOSAL_BUILDER_V1.md",
  "scripts/run-phase-packet-generator-v1.mjs",
  "scripts/lib/phase-packet-generator-v1.mjs",
  "docs/phases/PHASE_32_PHASE_PACKET_GENERATOR_V1.md",
  "scripts/run-planner-task-decomposer-v2.mjs",
  "scripts/lib/planner-task-decomposer-v2.mjs",
  "docs/phases/PHASE_31_PLANNER_TASK_DECOMPOSER_V2.md",
  "scripts/run-knowledge-refresh-source-trust-v1.mjs",
  "scripts/lib/knowledge-refresh-source-trust-v1.mjs",
  "docs/phases/PHASE_30_KNOWLEDGE_REFRESH_SOURCE_TRUST_V1.md",
  "scripts/run-domain-learning-packs-v1.mjs",
  "scripts/lib/domain-learning-packs-v1.mjs",
  "docs/phases/PHASE_29_DOMAIN_LEARNING_PACKS_V1.md",
  "scripts/run-curriculum-builder-v1.mjs",
  "scripts/lib/curriculum-builder-v1.mjs",
  "docs/phases/PHASE_28_CURRICULUM_BUILDER_V1.md",
  "scripts/run-regression-baseline-registry-v1.mjs",
  "scripts/lib/regression-baseline-registry-v1.mjs",
  "docs/phases/PHASE_27_REGRESSION_BASELINE_REGISTRY_V1.md",
  "scripts/run-evaluation-harness-v1.mjs",
  "scripts/lib/evaluation-harness-v1.mjs",
  "docs/phases/PHASE_26_EVALUATION_HARNESS_V1.md",
  "scripts/run-phase-artifact-packet-v1.mjs",
  "scripts/lib/phase-artifact-packet-v1.mjs",
  "docs/phases/PHASE_25C_PHASE_ARTIFACT_PACKET_V1.md",
  "scripts/run-ci-workflow-gate-v1.mjs",
  "scripts/lib/ci-workflow-gate-v1.mjs",
  "docs/phases/PHASE_25B_CI_WORKFLOW_GATE_V1.md",
  ".github/workflows/verify.yml",
  "scripts/run-capability-registry-skill-graph-v1.mjs",
  "scripts/lib/capability-registry-skill-graph-v1.mjs",
  "docs/phases/PHASE_25_CAPABILITY_REGISTRY_SKILL_GRAPH_V1.md",
  "scripts/run-tool-plugin-registry-v1.mjs",
  "scripts/lib/tool-plugin-registry-v1.mjs",
  "docs/phases/PHASE_24_TOOL_PLUGIN_REGISTRY_V1.md",
  "scripts/run-sqlite-persistence-v1.mjs",
  "scripts/lib/sqlite-persistence-v1.mjs",
  "docs/phases/PHASE_23_SQLITE_PERSISTENCE_V1.md",
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
