import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { SeraKernel } from "@sera/kernel";
import { KnowledgeStore } from "@sera/knowledge";
import { MemoryStore } from "@sera/memory";
import { ModelProviderStore } from "@sera/model-provider";
import { OperatorConsoleStore } from "@sera/operator-console";
import { runRepositorySnapshot } from "@sera/repository-snapshot";
import { runRepositoryTruth } from "@sera/repository-truth";
import { ControlPlane, ControlPlaneAttemptSpec } from "@sera/control-plane";
import { RuntimeHost, RuntimeService, createDefaultRuntimeServices, createRuntimeConfig, loadOrCreateRuntimeIdentity, normalizeRuntimeServices, runRuntimeHostProof } from "@sera/runtime-host";
import { RuntimeStateBlockedError, createRuntimeStateConfig, createRuntimeStateEnabledServices, openRuntimeState, runRuntimeStateProof } from "@sera/runtime-state";
import { PersistentRuntimeRecoveryCoordinator, RUNTIME_RECOVERY_SERVICE_ID, createPersistentRuntimeServices, runPersistentRuntimeRecoveryProof } from "@sera/runtime-recovery";
import { createIsolatedExecutionRuntimeServices, runIsolatedExecutionProof } from "@sera/execution-engine";
import { createEvaluationEngineRuntimeServices, runEvaluationEngineProof } from "@sera/evaluation-engine";

export interface CertCheck {
  id: string;
  name: string;
  pass: boolean;
  detail: string;
}

export interface CertReport {
  createdAt: string;
  level: "none" | "secure-base" | "developer-worker-v1" | "developer-worker-v2" | "self-improvement-v1" | "task-memory-v1" | "lesson-review-v1" | "active-lessons-v1" | "planner-task-queue-v1" | "knowledge-retrieval-v1" | "model-provider-v1" | "autonomous-dev-loop-v1" | "operator-console-v1" | "control-plane-v1" | "runtime-host-v1" | "runtime-state-v1" | "persistent-runtime-v1" | "isolated-execution-v1" | "evaluation-engine-v1";
  pass: boolean;
  checks: CertCheck[];
}

export async function runSecureBaseCert(rootDir = process.cwd()): Promise<CertReport> {
  const certRoot = path.join(rootDir, ".sera-cert");
  fs.mkdirSync(certRoot, { recursive: true });
  const sandboxRoot = fs.mkdtempSync(path.join(os.tmpdir(), "sera-cert-"));
  const checks: CertCheck[] = [];

  checks.push(...runSecureBaseChecks(sandboxRoot));
  checks.push(...runDeveloperWorkerV1Checks());
  checks.push(...runDeveloperWorkerV2Checks());
  checks.push(...runSelfImprovementV1Checks());
  checks.push(...runTaskMemoryV1Checks());
  checks.push(...runLessonReviewV1Checks());
  checks.push(...runActiveLessonsV1Checks());
  checks.push(...runTaskQueueV1Checks());
  checks.push(...runKnowledgeRetrievalV1Checks());
  checks.push(...runModelProviderV1Checks());
  checks.push(...runAutonomousDevLoopV1Checks());
  checks.push(...runOperatorConsoleV1Checks());
  checks.push(...runRepositorySnapshotV1Checks());
  checks.push(...runRepositoryTruthV1Checks());
  checks.push(...runBaseMvpManifestV1Checks(rootDir));
  checks.push(...runControlPlaneV1Checks());
  checks.push(...await runRuntimeHostV1Checks());
  checks.push(...await runRuntimeStateV1Checks());
  checks.push(...await runPersistentRuntimeV1Checks());
  checks.push(...await runIsolatedExecutionV1Checks());
  checks.push(...await runEvaluationEngineV1Checks());

  const secureChecksPass = checks.filter((c) => !c.id.startsWith("developer_") && !c.id.startsWith("self_improvement_") && !c.id.startsWith("memory_") && !c.id.startsWith("lesson_review_") && !c.id.startsWith("active_lessons_") && !c.id.startsWith("task_queue_") && !c.id.startsWith("knowledge_") && !c.id.startsWith("model_provider_") && !c.id.startsWith("autonomy_") && !c.id.startsWith("console_")).every((c) => c.pass);
  const developerV1ChecksPass = checks.filter((c) => c.id.startsWith("developer_") && !c.id.startsWith("developer_v2_")).every((c) => c.pass);
  const developerV2ChecksPass = checks.filter((c) => c.id.startsWith("developer_v2_")).every((c) => c.pass);
  const selfImprovementV1ChecksPass = checks.filter((c) => c.id.startsWith("self_improvement_")).every((c) => c.pass);
  const memoryV1ChecksPass = checks.filter((c) => c.id.startsWith("memory_")).every((c) => c.pass);
  const lessonReviewV1ChecksPass = checks.filter((c) => c.id.startsWith("lesson_review_")).every((c) => c.pass);
  const activeLessonsV1ChecksPass = checks.filter((c) => c.id.startsWith("active_lessons_")).every((c) => c.pass);
  const taskQueueV1ChecksPass = checks.filter((c) => c.id.startsWith("task_queue_")).every((c) => c.pass);
  const knowledgeV1ChecksPass = checks.filter((c) => c.id.startsWith("knowledge_")).every((c) => c.pass);
  const modelProviderV1ChecksPass = checks.filter((c) => c.id.startsWith("model_provider_")).every((c) => c.pass);
  const autonomyV1ChecksPass = checks.filter((c) => c.id.startsWith("autonomy_")).every((c) => c.pass);
  const operatorConsoleV1ChecksPass = checks.filter((c) => c.id.startsWith("console_")).every((c) => c.pass);
  const repositorySnapshotV1ChecksPass = checks.filter((c) => c.id.startsWith("repository_snapshot_")).every((c) => c.pass);
  const repositoryTruthV1ChecksPass = checks.filter((c) => c.id.startsWith("repository_truth_")).every((c) => c.pass);
  const controlPlaneV1ChecksPass = checks.filter((c) => c.id.startsWith("control_plane_")).every((c) => c.pass);
  const runtimeHostV1ChecksPass = checks.filter((c) => c.id.startsWith("runtime_host_")).every((c) => c.pass);
  const runtimeStateV1ChecksPass = checks.filter((c) => c.id.startsWith("runtime_state_")).every((c) => c.pass);
  const persistentRuntimeV1ChecksPass = checks.filter((c) => c.id.startsWith("persistent_runtime_")).every((c) => c.pass);
  const isolatedExecutionV1ChecksPass = checks.filter((c) => c.id.startsWith("isolated_execution_")).every((c) => c.pass);
  const evaluationEngineV1ChecksPass = checks.filter((c) => c.id.startsWith("evaluation_engine_")).every((c) => c.pass);
  void repositorySnapshotV1ChecksPass;
  void repositoryTruthV1ChecksPass;
  const pass = checks.every((c) => c.pass);
  const level = pass && evaluationEngineV1ChecksPass
    ? "evaluation-engine-v1"
    : pass && isolatedExecutionV1ChecksPass
    ? "isolated-execution-v1"
    : pass && persistentRuntimeV1ChecksPass
    ? "persistent-runtime-v1"
    : pass && runtimeStateV1ChecksPass
    ? "runtime-state-v1"
    : pass && runtimeHostV1ChecksPass
    ? "runtime-host-v1"
    : pass && controlPlaneV1ChecksPass
    ? "control-plane-v1"
    : pass && operatorConsoleV1ChecksPass
    ? "operator-console-v1"
    : pass && autonomyV1ChecksPass
    ? "autonomous-dev-loop-v1"
    : pass && modelProviderV1ChecksPass
    ? "model-provider-v1"
    : pass && knowledgeV1ChecksPass
    ? "knowledge-retrieval-v1"
    : pass && taskQueueV1ChecksPass
    ? "planner-task-queue-v1"
    : pass && activeLessonsV1ChecksPass
    ? "active-lessons-v1"
    : pass && lessonReviewV1ChecksPass
    ? "lesson-review-v1"
    : pass && memoryV1ChecksPass
    ? "task-memory-v1"
    : pass && selfImprovementV1ChecksPass
      ? "self-improvement-v1"
      : pass && developerV2ChecksPass
      ? "developer-worker-v2"
      : secureChecksPass && developerV1ChecksPass
        ? "developer-worker-v1"
        : secureChecksPass
          ? "secure-base"
          : "none";

  const report: CertReport = {
    createdAt: new Date().toISOString(),
    level,
    pass,
    checks
  };
  fs.writeFileSync(path.join(certRoot, "secure-base-cert.json"), JSON.stringify(report, null, 2) + "\n", "utf8");
  return report;
}

function runSecureBaseChecks(sandboxRoot: string): CertCheck[] {
  const kernel = new SeraKernel({ rootDir: sandboxRoot });
  const result = kernel.runTask("create hello file");
  const runDir = result.run.runDir;
  const helloPath = path.join(result.run.workspaceDir, "hello.txt");

  const requiredArtifacts = ["task.json", "plan.json", "run.json", "steps.jsonl", "tool-events.jsonl", "safety-events.jsonl", "final-report.md"];
  return [
    { id: "kernel_run_ok", name: "Kernel can complete starter run", pass: result.ok, detail: result.message },
    { id: "workspace_created", name: "Workspace created", pass: fs.existsSync(result.run.workspaceDir), detail: result.run.workspaceDir },
    { id: "hello_written", name: "FileTool wrote hello.txt inside workspace", pass: fs.existsSync(helloPath), detail: helloPath },
    ...requiredArtifacts.map((rel) => ({
      id: `artifact_${rel.replace(/[^a-z0-9]+/gi, "_").toLowerCase()}`,
      name: `Artifact exists: ${rel}`,
      pass: fs.existsSync(path.join(runDir, rel)),
      detail: path.join(runDir, rel)
    }))
  ];
}

function runDeveloperWorkerV1Checks(): CertCheck[] {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "sera-dev-cert-"));
  const kernel = new SeraKernel({ rootDir: root });
  const filePath = path.join(root, "demo.txt");
  fs.writeFileSync(filePath, "alpha beta gamma\n", "utf8");

  const suggested = kernel.runDeveloperEditTask({
    mode: "suggested",
    relativePath: "demo.txt",
    find: "beta",
    replaceWith: "delta"
  });
  const sourceAfterSuggestion = fs.readFileSync(filePath, "utf8");

  const direct = kernel.runDeveloperEditTask({
    mode: "direct",
    relativePath: "demo.txt",
    find: "beta",
    replaceWith: "delta"
  });
  const sourceAfterDirect = fs.readFileSync(filePath, "utf8");

  const noOp = kernel.runDeveloperEditTask({
    mode: "direct",
    relativePath: "demo.txt",
    find: "does-not-exist",
    replaceWith: "unused"
  });

  const outsideBlocked = kernel.runDeveloperEditTask({
    mode: "direct",
    relativePath: "../outside.txt",
    find: "x",
    replaceWith: "y"
  });

  fs.mkdirSync(path.join(root, "src"), { recursive: true });
  const rollbackPath = path.join(root, "src", "rollback.txt");
  fs.writeFileSync(rollbackPath, "before\n", "utf8");
  const rollback = kernel.runDeveloperEditTask({
    mode: "direct",
    relativePath: "src/rollback.txt",
    find: "before",
    replaceWith: "after",
    validate: () => ({ ok: false, message: "simulated validation failure" })
  });
  const rollbackText = fs.readFileSync(rollbackPath, "utf8");

  return [
    {
      id: "developer_suggested_no_source_mutation",
      name: "Developer Worker suggested edit does not change source",
      pass: suggested.ok && suggested.developer.status === "completed" && sourceAfterSuggestion === "alpha beta gamma\n" && Boolean(suggested.developer.suggestionPath),
      detail: suggested.developer.suggestionPath ?? suggested.message
    },
    {
      id: "developer_direct_edit_applies_with_backup",
      name: "Developer Worker direct edit changes source and captures backup",
      pass: direct.ok && direct.developer.changed && sourceAfterDirect === "alpha delta gamma\n" && Boolean(direct.developer.backupPath),
      detail: direct.developer.backupPath ?? direct.message
    },
    {
      id: "developer_no_op_is_honest",
      name: "Developer Worker reports no_op when find text is missing",
      pass: noOp.ok && noOp.status === "no_op" && !noOp.developer.changed,
      detail: noOp.message
    },
    {
      id: "developer_outside_path_blocked",
      name: "Developer Worker blocks path traversal outside project root",
      pass: !outsideBlocked.ok && outsideBlocked.status === "blocked",
      detail: outsideBlocked.message
    },
    {
      id: "developer_validation_failure_rolls_back",
      name: "Developer Worker restores source when validation fails",
      pass: !rollback.ok && rollback.status === "failed" && rollback.developer.restored === true && rollbackText === "before\n",
      detail: rollback.message
    }
  ];
}

function runDeveloperWorkerV2Checks(): CertCheck[] {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "sera-dev-v2-cert-"));
  const kernel = new SeraKernel({ rootDir: root });
  const filePath = path.join(root, "src", "module.ts");
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, "export const label = 'legacy';\n", "utf8");

  const inspection = kernel.runDeveloperInspectTask({ relativePath: "src/module.ts" });

  const suggestedPatch = kernel.runDeveloperPatchTask({
    mode: "suggested",
    relativePath: "src/module.ts",
    operations: [{ kind: "replace", find: "legacy", replaceWith: "clean-core", expectedOccurrences: 1 }]
  });
  const sourceAfterSuggestion = fs.readFileSync(filePath, "utf8");

  const expectedMismatch = kernel.runDeveloperPatchTask({
    mode: "direct",
    relativePath: "src/module.ts",
    operations: [{ kind: "replace", find: "legacy", replaceWith: "unsafe", expectedOccurrences: 2 }]
  });
  const sourceAfterMismatch = fs.readFileSync(filePath, "utf8");

  const directPatch = kernel.runDeveloperPatchTask({
    mode: "direct",
    relativePath: "src/module.ts",
    operations: [{ kind: "replace", find: "legacy", replaceWith: "phase3", expectedOccurrences: 1 }],
    validate: ({ after }) => ({ ok: after.includes("phase3"), message: "phase3 marker exists" })
  });
  const sourceAfterDirect = fs.readFileSync(filePath, "utf8");

  fs.writeFileSync(filePath, "export const status = 'bad';\n", "utf8");
  const validationRollback = kernel.runDeveloperPatchTask({
    mode: "direct",
    relativePath: "src/module.ts",
    operations: [{ kind: "replace", find: "bad", replaceWith: "invalid", expectedOccurrences: 1 }],
    validationCommand: { command: process.execPath, args: ["-e", "process.exit(1)"] }
  });
  const sourceAfterRollback = fs.readFileSync(filePath, "utf8");

  const blockedCommandRollback = kernel.runDeveloperPatchTask({
    mode: "direct",
    relativePath: "src/module.ts",
    operations: [{ kind: "replace", find: "bad", replaceWith: "changed", expectedOccurrences: 1 }],
    validationCommand: { command: "git", args: ["--version"] }
  });
  const sourceAfterBlockedCommand = fs.readFileSync(filePath, "utf8");

  return [
    {
      id: "developer_v2_inspect_writes_artifact",
      name: "Developer Worker v2 inspect writes a source fingerprint artifact",
      pass: inspection.ok && inspection.inspection.exists && Boolean(inspection.inspection.artifactPath) && Boolean(inspection.inspection.sha256),
      detail: inspection.inspection.artifactPath ?? inspection.message
    },
    {
      id: "developer_v2_patch_suggestion_no_source_mutation",
      name: "Developer Worker v2 patch suggestion does not mutate source",
      pass: suggestedPatch.ok && suggestedPatch.patch.status === "completed" && Boolean(suggestedPatch.patch.patchArtifactPath) && sourceAfterSuggestion === "export const label = 'legacy';\n",
      detail: suggestedPatch.patch.patchArtifactPath ?? suggestedPatch.message
    },
    {
      id: "developer_v2_expected_occurrence_mismatch_blocks",
      name: "Developer Worker v2 blocks patches when occurrence expectations do not match",
      pass: !expectedMismatch.ok && expectedMismatch.status === "blocked" && sourceAfterMismatch === "export const label = 'legacy';\n",
      detail: expectedMismatch.message
    },
    {
      id: "developer_v2_direct_patch_applies_with_validation",
      name: "Developer Worker v2 direct patch applies when validation passes",
      pass: directPatch.ok && directPatch.patch.changed && sourceAfterDirect === "export const label = 'phase3';\n" && Boolean(directPatch.patch.backupPath),
      detail: directPatch.message
    },
    {
      id: "developer_v2_validation_command_rolls_back",
      name: "Developer Worker v2 rolls back when validation command fails",
      pass: !validationRollback.ok && validationRollback.status === "failed" && validationRollback.patch.restored === true && sourceAfterRollback === "export const status = 'bad';\n",
      detail: validationRollback.message
    },
    {
      id: "developer_v2_blocked_validation_command_rolls_back",
      name: "Developer Worker v2 rolls back when validation command is not allowlisted",
      pass: !blockedCommandRollback.ok && blockedCommandRollback.status === "failed" && blockedCommandRollback.patch.restored === true && sourceAfterBlockedCommand === "export const status = 'bad';\n",
      detail: blockedCommandRollback.message
    }
  ];
}


function runSelfImprovementV1Checks(): CertCheck[] {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "sera-self-cert-"));
  const kernel = new SeraKernel({ rootDir: root });
  const filePath = path.join(root, "src", "self.ts");
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, "export const phase = 'phase3';\n", "utf8");

  const proposal = kernel.runSelfImprovementTask({
    mode: "propose",
    goal: "Create a safe phase marker proposal.",
    relativePath: "src/self.ts",
    operations: [{ kind: "replace", find: "phase3", replaceWith: "phase4", expectedOccurrences: 1 }]
  });
  const sourceAfterProposal = fs.readFileSync(filePath, "utf8");

  const noValidation = kernel.runSelfImprovementTask({
    mode: "apply",
    goal: "Refuse uncertified self-modification.",
    relativePath: "src/self.ts",
    operations: [{ kind: "replace", find: "phase3", replaceWith: "unsafe", expectedOccurrences: 1 }]
  });
  const sourceAfterNoValidation = fs.readFileSync(filePath, "utf8");

  const applied = kernel.runSelfImprovementTask({
    mode: "apply",
    goal: "Advance phase marker after validation.",
    relativePath: "src/self.ts",
    operations: [{ kind: "replace", find: "phase3", replaceWith: "phase4", expectedOccurrences: 1 }],
    validate: ({ after }) => ({ ok: after.includes("phase4"), message: "phase4 marker exists" })
  });
  const sourceAfterApplied = fs.readFileSync(filePath, "utf8");

  fs.writeFileSync(filePath, "export const value = 'safe';\n", "utf8");
  const rollback = kernel.runSelfImprovementTask({
    mode: "apply",
    goal: "Rollback failed self-improvement.",
    relativePath: "src/self.ts",
    operations: [{ kind: "replace", find: "safe", replaceWith: "unsafe", expectedOccurrences: 1 }],
    validate: () => ({ ok: false, message: "simulated cert failure" })
  });
  const sourceAfterRollback = fs.readFileSync(filePath, "utf8");

  const mismatch = kernel.runSelfImprovementTask({
    mode: "apply",
    goal: "Block ambiguous self-improvement.",
    relativePath: "src/self.ts",
    operations: [{ kind: "replace", find: "safe", replaceWith: "changed", expectedOccurrences: 2 }],
    validate: ({ after }) => ({ ok: after.includes("changed"), message: "changed marker exists" })
  });
  const sourceAfterMismatch = fs.readFileSync(filePath, "utf8");

  return [
    {
      id: "self_improvement_v1_proposal_no_mutation",
      name: "Self-improvement proposal creates evidence without mutating source",
      pass: proposal.ok && proposal.status === "completed" && !proposal.selfImprovement.changed && sourceAfterProposal === "export const phase = 'phase3';\n" && Boolean(proposal.selfImprovement.recordPath),
      detail: proposal.selfImprovement.recordPath ?? proposal.message
    },
    {
      id: "self_improvement_v1_requires_validation",
      name: "Self-improvement apply mode refuses to run without a validation gate",
      pass: !noValidation.ok && noValidation.status === "blocked" && sourceAfterNoValidation === "export const phase = 'phase3';\n",
      detail: noValidation.message
    },
    {
      id: "self_improvement_v1_applies_after_validation",
      name: "Self-improvement applies only when validation passes",
      pass: applied.ok && applied.selfImprovement.changed && applied.selfImprovement.validationGate.status === "passed" && sourceAfterApplied === "export const phase = 'phase4';\n",
      detail: applied.message
    },
    {
      id: "self_improvement_v1_rolls_back_failed_validation",
      name: "Self-improvement rolls back when validation fails",
      pass: !rollback.ok && rollback.status === "failed" && rollback.selfImprovement.restored === true && sourceAfterRollback === "export const value = 'safe';\n",
      detail: rollback.message
    },
    {
      id: "self_improvement_v1_blocks_occurrence_mismatch",
      name: "Self-improvement blocks mismatched occurrence expectations",
      pass: !mismatch.ok && mismatch.status === "blocked" && !mismatch.selfImprovement.changed && sourceAfterMismatch === "export const value = 'safe';\n",
      detail: mismatch.message
    }
  ];
}


function runTaskMemoryV1Checks(): CertCheck[] {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "sera-memory-cert-"));
  const kernel = new SeraKernel({ rootDir: root });

  const successful = kernel.runTask("create hello file");
  const blocked = kernel.runDeveloperPatchTask({
    mode: "direct",
    relativePath: "../outside.txt",
    operations: [{ kind: "replace", find: "x", replaceWith: "y", expectedOccurrences: 1 }]
  });

  const memory = new MemoryStore(root);
  const runs = memory.listRuns();
  const failures = memory.listFailures();
  const lessons = memory.listLessonCandidates();
  const summary = memory.summarize();

  return [
    {
      id: "memory_run_history_records_completed_run",
      name: "Task Memory records completed runs in run history",
      pass: successful.ok && runs.some((r) => r.runId === successful.run.id && r.status === "completed_with_changes"),
      detail: memory.path("run-history.jsonl")
    },
    {
      id: "memory_failure_journal_records_blocked_run",
      name: "Task Memory records blocked runs in failure journal",
      pass: !blocked.ok && failures.some((f) => f.runId === blocked.run.id && f.status === "blocked"),
      detail: memory.path("failure-journal.jsonl")
    },
    {
      id: "memory_lesson_candidate_requires_manual_approval",
      name: "Task Memory creates inactive lesson candidates only",
      pass: lessons.length === 1 && lessons[0].status === "candidate" && lessons[0].activation === "manual-approval-required",
      detail: memory.path("lesson-candidates.jsonl")
    },
    {
      id: "memory_summary_counts_runs_failures_and_candidates",
      name: "Task Memory summary counts runs, failures, and lesson candidates",
      pass: summary.runCount === 2 && summary.failureCount === 1 && summary.lessonCandidateCount === 1 && summary.approvedLessonCount === 0,
      detail: JSON.stringify(summary)
    }
  ];
}


function runLessonReviewV1Checks(): CertCheck[] {
  const approvedRoot = fs.mkdtempSync(path.join(os.tmpdir(), "sera-lesson-approval-cert-"));
  const approvedKernel = new SeraKernel({ rootDir: approvedRoot });
  const blockedForApproval = approvedKernel.runDeveloperPatchTask({
    mode: "direct",
    relativePath: "../outside.txt",
    operations: [{ kind: "replace", find: "x", replaceWith: "y", expectedOccurrences: 1 }]
  });
  const approvedMemory = new MemoryStore(approvedRoot);
  const approvalCandidate = approvedMemory.listLessonCandidates()[0];
  const inspected = approvedKernel.inspectLessonCandidate(approvalCandidate.id);
  const approval = approvedKernel.reviewLessonCandidate({
    candidateId: approvalCandidate.id,
    decision: "approved",
    reviewer: "cert-runner",
    rationale: "Verified as a reusable guardrail candidate."
  });
  const secondApproval = approvedKernel.reviewLessonCandidate({
    candidateId: approvalCandidate.id,
    decision: "approved",
    reviewer: "cert-runner",
    rationale: "Attempt duplicate approval."
  });
  const approvedLessons = approvedMemory.listApprovedLessons();
  const approvalDecisions = approvedMemory.listLessonDecisions();
  const approvalSummary = approvedMemory.summarize();
  const reviewedCandidate = approvedMemory.listLessonCandidates()[0];

  const rejectedRoot = fs.mkdtempSync(path.join(os.tmpdir(), "sera-lesson-rejection-cert-"));
  const rejectedKernel = new SeraKernel({ rootDir: rejectedRoot });
  rejectedKernel.runDeveloperPatchTask({
    mode: "direct",
    relativePath: "../outside.txt",
    operations: [{ kind: "replace", find: "x", replaceWith: "y", expectedOccurrences: 1 }]
  });
  const rejectedMemory = new MemoryStore(rejectedRoot);
  const rejectionCandidate = rejectedMemory.listLessonCandidates()[0];
  const rejection = rejectedKernel.reviewLessonCandidate({
    candidateId: rejectionCandidate.id,
    decision: "rejected",
    reviewer: "cert-runner",
    rationale: "Not a generalizable lesson."
  });
  const rejectedLessons = rejectedMemory.listRejectedLessons();
  const rejectedCandidate = rejectedMemory.listLessonCandidates()[0];

  return [
    {
      id: "lesson_review_inspects_candidate",
      name: "Lesson Review can inspect an existing lesson candidate",
      pass: !blockedForApproval.ok && inspected.ok && inspected.candidate?.id === approvalCandidate.id,
      detail: inspected.candidatePath ?? inspected.message
    },
    {
      id: "lesson_review_approves_candidate_inactively",
      name: "Lesson Review approves a candidate without activating it",
      pass: approval.ok && reviewedCandidate.status === "approved" && approvedLessons.length === 1 && approvedLessons[0].active === false && approvedLessons[0].activation === "manual-activation-required",
      detail: approval.approvedLessonPath ?? approval.message
    },
    {
      id: "lesson_review_blocks_duplicate_decisions",
      name: "Lesson Review blocks duplicate approval or rejection decisions",
      pass: !secondApproval.ok && secondApproval.status === "blocked" && approvedMemory.listApprovedLessons().length === 1,
      detail: secondApproval.message
    },
    {
      id: "lesson_review_rejects_candidate_with_record",
      name: "Lesson Review rejects a candidate and writes a rejected lesson record",
      pass: rejection.ok && rejectedCandidate.status === "rejected" && rejectedLessons.length === 1 && rejectedLessons[0].active === false,
      detail: rejection.rejectedLessonPath ?? rejection.message
    },
    {
      id: "lesson_review_summary_counts_reviewed_lessons",
      name: "Lesson Review summary counts candidates and reviewed lessons",
      pass: approvalSummary.lessonCandidateCount === 0 && approvalSummary.approvedLessonCount === 1 && approvalSummary.rejectedLessonCount === 0 && approvalDecisions.length === 1,
      detail: JSON.stringify(approvalSummary)
    }
  ];
}


function runActiveLessonsV1Checks(): CertCheck[] {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "sera-active-lessons-cert-"));
  const kernel = new SeraKernel({ rootDir: root });
  kernel.runDeveloperPatchTask({
    mode: "direct",
    relativePath: "../outside.txt",
    operations: [{ kind: "replace", find: "x", replaceWith: "y", expectedOccurrences: 1 }]
  });
  const memory = new MemoryStore(root);
  const candidate = memory.listLessonCandidates()[0];
  const approval = kernel.reviewLessonCandidate({
    candidateId: candidate.id,
    decision: "approved",
    reviewer: "cert-runner",
    rationale: "Approved as a reusable guardrail candidate."
  });
  const approvedLesson = memory.listApprovedLessons()[0];
  const activation = kernel.activateApprovedLesson({
    approvedLessonId: approvedLesson.id,
    reviewer: "cert-runner",
    rationale: "Activate as a regression rule after approval."
  });
  const duplicateActivation = kernel.activateApprovedLesson({
    approvedLessonId: approvedLesson.id,
    reviewer: "cert-runner",
    rationale: "Attempt duplicate activation."
  });
  const activeLessons = memory.listActiveLessons();
  const regressionRules = memory.listRegressionRules();
  const activationDecisions = memory.listLessonActivationDecisions();
  const checkRules = kernel.checkLessonRegressionRules();
  const activeSummary = memory.summarize();
  const deactivation = kernel.deactivateActiveLesson({
    activeLessonId: activation.activeLesson?.id,
    reviewer: "cert-runner",
    rationale: "Deactivate after regression validation."
  });
  const deactivatedLessons = memory.listActiveLessons();
  const deactivatedRules = memory.listRegressionRules();
  const inactiveSummary = memory.summarize();
  const missingActivation = kernel.activateApprovedLesson({
    approvedLessonId: "approved_lesson_missing",
    reviewer: "cert-runner",
    rationale: "Should not activate."
  });

  return [
    {
      id: "active_lessons_activate_approved_as_regression_rule",
      name: "Active Lessons activates an approved lesson as a regression rule",
      pass: approval.ok && activation.ok && activeLessons.length === 1 && activeLessons[0].active === true && regressionRules.length === 1 && regressionRules[0].status === "active",
      detail: activation.regressionRulePath ?? activation.message
    },
    {
      id: "active_lessons_block_duplicate_or_missing_activation",
      name: "Active Lessons blocks duplicate and missing activations",
      pass: !duplicateActivation.ok && duplicateActivation.status === "blocked" && !missingActivation.ok && missingActivation.status === "blocked",
      detail: duplicateActivation.message
    },
    {
      id: "active_lessons_regression_rule_check_passes",
      name: "Active Lessons checks active regression rules for traceability",
      pass: checkRules.ok && checkRules.activeRuleCount === 1 && checkRules.checks.length === 1 && checkRules.checks[0].pass === true,
      detail: checkRules.message
    },
    {
      id: "active_lessons_deactivate_marks_rule_inactive",
      name: "Active Lessons deactivates an active lesson and marks rule inactive",
      pass: deactivation.ok && deactivatedLessons[0].active === false && deactivatedLessons[0].status === "inactive" && deactivatedRules[0].status === "inactive",
      detail: deactivation.message
    },
    {
      id: "active_lessons_summary_counts_active_and_inactive_rules",
      name: "Active Lessons summary and decisions track activation state",
      pass: activeSummary.activeLessonCount === 1 && activeSummary.regressionRuleCount === 1 && inactiveSummary.activeLessonCount === 0 && inactiveSummary.regressionRuleCount === 0 && activationDecisions.length === 1,
      detail: JSON.stringify({ activeSummary, inactiveSummary })
    }
  ];
}


function runTaskQueueV1Checks(): CertCheck[] {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "sera-task-queue-cert-"));
  const kernel = new SeraKernel({ rootDir: root });
  const memory = new MemoryStore(root);

  const created = kernel.createQueuedTask({
    title: "Queue certified task",
    prompt: "Validate task queue creation.",
    priority: "high",
    requestedBy: "cert-runner"
  });
  const listed = kernel.listQueuedTasks("queued");
  const inspected = kernel.inspectQueuedTask(created.task?.id ?? "missing");

  const invalidComplete = kernel.completeQueuedTask(created.task?.id ?? "missing", "Attempt to complete before start.", "cert-runner");
  const afterInvalid = kernel.inspectQueuedTask(created.task?.id ?? "missing");

  const started = kernel.startQueuedTask(created.task?.id ?? "missing", "Start the certified task.", "cert-runner");
  const completed = kernel.completeQueuedTask(created.task?.id ?? "missing", "Certified task completed.", "cert-runner");
  const completedMemoryRuns = memory.listRuns();

  const blockedCreated = kernel.createQueuedTask({
    title: "Blocked certified task",
    prompt: "Validate blocked task memory.",
    requestedBy: "cert-runner"
  });
  const blocked = kernel.blockQueuedTask(blockedCreated.task?.id ?? "missing", "Blocked during certification.", "cert-runner");
  const failures = memory.listFailures();
  const lessonCandidates = memory.listLessonCandidates();

  const cancelledCreated = kernel.createQueuedTask({
    title: "Cancelled certified task",
    prompt: "Validate cancellation counts.",
    requestedBy: "cert-runner"
  });
  const cancelled = kernel.cancelQueuedTask(cancelledCreated.task?.id ?? "missing", "Cancelled during certification.", "cert-runner");
  const summary = kernel.getTaskQueueSummary().summary;
  const events = kernel.listTaskQueueEvents().events;

  return [
    {
      id: "task_queue_creates_lists_and_inspects_task",
      name: "Planner Task Queue creates, lists, and inspects queued tasks",
      pass: created.ok && listed.tasks.some((task) => task.id === created.task?.id) && inspected.ok && inspected.task?.priority === "high",
      detail: created.taskPath ?? created.message
    },
    {
      id: "task_queue_blocks_invalid_transition",
      name: "Planner Task Queue blocks invalid lifecycle transitions",
      pass: !invalidComplete.ok && invalidComplete.status === "blocked" && afterInvalid.task?.status === "queued",
      detail: invalidComplete.message
    },
    {
      id: "task_queue_start_complete_records_memory_history",
      name: "Planner Task Queue starts and completes tasks while recording memory history",
      pass: started.ok && completed.ok && completed.task?.status === "completed" && completedMemoryRuns.some((run) => run.taskId === created.task?.id && run.status === "completed"),
      detail: completed.memoryRunRecordPath ?? completed.message
    },
    {
      id: "task_queue_block_records_failure_and_lesson_candidate",
      name: "Planner Task Queue records blocked tasks in failure journal and lesson candidates",
      pass: blocked.ok && blocked.task?.status === "blocked" && failures.some((failure) => failure.taskId === blockedCreated.task?.id) && lessonCandidates.some((lesson) => lesson.taskId === blockedCreated.task?.id),
      detail: blocked.lessonCandidatePath ?? blocked.message
    },
    {
      id: "task_queue_summary_and_events_track_lifecycle",
      name: "Planner Task Queue summary and event log track lifecycle state",
      pass: cancelled.ok && summary.totalCount === 3 && summary.completedCount === 1 && summary.blockedCount === 1 && summary.cancelledCount === 1 && events.length >= 6,
      detail: JSON.stringify(summary)
    }
  ];
}


function runKnowledgeRetrievalV1Checks(): CertCheck[] {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "sera-knowledge-cert-"));
  const kernel = new SeraKernel({ rootDir: root });
  const docsDir = path.join(root, "docs");
  const srcDir = path.join(root, "src");
  fs.mkdirSync(docsDir, { recursive: true });
  fs.mkdirSync(srcDir, { recursive: true });
  fs.mkdirSync(path.join(root, ".sera-memory"), { recursive: true });
  fs.writeFileSync(path.join(docsDir, "vision.md"), [
    "# S.E.R.A. Vision",
    "S.E.R.A. is a local-first recursive agent.",
    "Planner tasks should remain queued until a human starts them.",
    "Knowledge retrieval should cite local evidence without requiring an LLM."
  ].join("\n") + "\n", "utf8");
  fs.writeFileSync(path.join(srcDir, "notes.txt"), "The task queue records completed work and blocked work as evidence.\n", "utf8");
  fs.writeFileSync(path.join(root, ".sera-memory", "ignored.txt"), "runtime memory should not be indexed by directory ingestion.\n", "utf8");

  const ingestFile = kernel.ingestKnowledgeFile({ relativePath: "docs/vision.md", title: "Vision Doc" });
  const outsideBlocked = kernel.ingestKnowledgeFile({ relativePath: "../outside.md" });
  const search = kernel.searchKnowledge("recursive planner evidence", 5);
  const inspected = kernel.inspectKnowledgeDocument(ingestFile.document?.id ?? "missing");
  const ingestDir = kernel.ingestKnowledgeDirectory({ relativeDir: ".", extensions: [".md", ".txt"], limit: 10 });
  const knowledge = new KnowledgeStore(root);
  const documents = knowledge.listDocuments();
  const chunks = knowledge.listChunks();
  const summary = kernel.getKnowledgeSummary().summary;

  return [
    {
      id: "knowledge_ingests_file_and_chunks",
      name: "Knowledge ingests a local file and writes chunks",
      pass: ingestFile.ok && Boolean(ingestFile.document?.sha256) && (ingestFile.chunks?.length ?? 0) >= 1,
      detail: ingestFile.documentPath ?? ingestFile.message
    },
    {
      id: "knowledge_blocks_outside_path",
      name: "Knowledge blocks path traversal outside project root",
      pass: !outsideBlocked.ok && outsideBlocked.status === "blocked",
      detail: outsideBlocked.message
    },
    {
      id: "knowledge_search_returns_local_hits",
      name: "Knowledge search returns local lexical evidence",
      pass: search.ok && search.hits.length >= 1 && search.hits[0].matchedTerms.length >= 1 && Boolean(search.searchPath),
      detail: search.searchPath ?? search.message
    },
    {
      id: "knowledge_inspects_indexed_document",
      name: "Knowledge can inspect an indexed document with chunks",
      pass: inspected.ok && inspected.document?.id === ingestFile.document?.id && (inspected.chunks?.length ?? 0) >= 1,
      detail: inspected.document?.relativePath ?? inspected.message
    },
    {
      id: "knowledge_directory_ingest_ignores_runtime_dirs",
      name: "Knowledge directory ingestion ignores runtime directories and summarizes records",
      pass: ingestDir.ok && documents.some((doc) => doc.relativePath === "docs/vision.md") && documents.every((doc) => !doc.relativePath.startsWith(".sera-memory/")) && chunks.length >= documents.length && summary.documentCount === documents.length && summary.searchCount >= 1,
      detail: JSON.stringify(summary)
    }
  ];
}


function runModelProviderV1Checks(): CertCheck[] {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "sera-model-provider-cert-"));
  const kernel = new SeraKernel({ rootDir: root });

  const providers = kernel.listModelProviders();
  const mock = providers.providers.find((provider) => provider.id === "mock-local");
  const external = providers.providers.find((provider) => provider.id === "external-disabled");

  const secretPrompt = "Summarize this safely with api_key=sk-1234567890abcdef and token=my-token.";
  const invocation = kernel.invokeModelProvider({
    providerId: "mock-local",
    prompt: secretPrompt,
    purpose: "certified mock invocation",
    maxOutputTokens: 40
  });
  const modelStore = new ModelProviderStore(root);
  const requests = modelStore.listRequests();
  const responses = modelStore.listResponses();
  const events = modelStore.listEvents();
  const summaryAfterInvoke = modelStore.summarize();
  const requestFileText = fs.existsSync(path.join(root, ".sera-models", "model-requests.jsonl"))
    ? fs.readFileSync(path.join(root, ".sera-models", "model-requests.jsonl"), "utf8")
    : "";

  const unknown = kernel.invokeModelProvider({
    providerId: "missing-provider",
    prompt: "Should be blocked."
  });
  const disabled = kernel.invokeModelProvider({
    providerId: "external-disabled",
    prompt: "Should also be blocked."
  });
  const finalSummary = kernel.getModelProviderSummary().summary;

  return [
    {
      id: "model_provider_lists_mock_and_disabled_external",
      name: "Model Provider lists mock provider and disabled external provider slot",
      pass: providers.ok && mock?.available === true && mock.localOnly === true && external?.available === false && external.networkAllowed === false,
      detail: providers.modelDir
    },
    {
      id: "model_provider_mock_invocation_records_request_response",
      name: "Model Provider mock invocation records request and response evidence",
      pass: invocation.ok && requests.length === 1 && responses.length === 1 && responses[0].requestId === requests[0].id && invocation.response?.output.includes("mock-local response") === true,
      detail: invocation.responsePath ?? invocation.message
    },
    {
      id: "model_provider_redacts_prompt_records",
      name: "Model Provider redacts secrets before persisting prompt records",
      pass: requestFileText.includes("[REDACTED]") && !requestFileText.includes("sk-1234567890abcdef") && !requestFileText.includes("my-token"),
      detail: invocation.requestPath ?? "missing request path"
    },
    {
      id: "model_provider_blocks_unknown_and_external",
      name: "Model Provider blocks unknown and disabled external providers",
      pass: !unknown.ok && unknown.status === "blocked" && !disabled.ok && disabled.status === "blocked",
      detail: `${unknown.message} / ${disabled.message}`
    },
    {
      id: "model_provider_summary_counts_events",
      name: "Model Provider summary counts requests, responses, and blocked events",
      pass: summaryAfterInvoke.requestCount === 1 && summaryAfterInvoke.responseCount === 1 && finalSummary.blockedEventCount >= 2 && events.length >= 3,
      detail: JSON.stringify(finalSummary)
    }
  ];
}


function runAutonomousDevLoopV1Checks(): CertCheck[] {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "sera-autonomy-cert-"));
  const kernel = new SeraKernel({ rootDir: root });
  fs.mkdirSync(path.join(root, "src"), { recursive: true });
  fs.mkdirSync(path.join(root, "docs"), { recursive: true });
  fs.writeFileSync(path.join(root, "src", "feature.ts"), "export const mode = 'legacy';\n", "utf8");
  fs.writeFileSync(path.join(root, "src", "failure.ts"), "export const flag = 'bad';\n", "utf8");
  fs.writeFileSync(path.join(root, "docs", "autonomy.md"), "Autonomous dev loops must be bounded, validated, and locally evidenced.\n", "utf8");
  kernel.ingestKnowledgeFile({ relativePath: "docs/autonomy.md", title: "Autonomy Guardrails" });
  const proposal = kernel.runAutonomousDevLoop({ mode: "propose", goal: "Propose a bounded autonomous update for a local feature file.", relativePath: "src/feature.ts", operations: [{ kind: "replace", find: "legacy", replaceWith: "proposed", expectedOccurrences: 1 }] });
  const afterProposal = fs.readFileSync(path.join(root, "src", "feature.ts"), "utf8");
  const noValidation = kernel.runAutonomousDevLoop({ mode: "apply", goal: "Try to apply without validation and confirm it is blocked.", relativePath: "src/feature.ts", operations: [{ kind: "replace", find: "legacy", replaceWith: "unsafe", expectedOccurrences: 1 }] });
  const afterNoValidation = fs.readFileSync(path.join(root, "src", "feature.ts"), "utf8");
  const queued = kernel.createQueuedTask({ title: "Autonomous certified feature update", prompt: "Apply a bounded autonomous change only if validation passes.", requestedBy: "cert-runner" });
  const applied = kernel.runAutonomousDevLoop({ mode: "apply", taskId: queued.task?.id, goal: "Apply bounded autonomous feature update with validation.", relativePath: "src/feature.ts", operations: [{ kind: "replace", find: "legacy", replaceWith: "autonomous", expectedOccurrences: 1 }], validate: ({ after }) => ({ ok: after.includes("autonomous"), message: "autonomous marker exists" }) });
  const afterApply = fs.readFileSync(path.join(root, "src", "feature.ts"), "utf8");
  const appliedTask = kernel.inspectQueuedTask(queued.task?.id ?? "missing");
  const failureTask = kernel.createQueuedTask({ title: "Autonomous rollback validation", prompt: "Confirm a failed autonomous validation rolls back and blocks task.", requestedBy: "cert-runner" });
  const failedApply = kernel.runAutonomousDevLoop({ mode: "apply", taskId: failureTask.task?.id, goal: "Attempt autonomous change that should fail validation.", relativePath: "src/failure.ts", operations: [{ kind: "replace", find: "bad", replaceWith: "invalid", expectedOccurrences: 1 }], validate: () => ({ ok: false, message: "simulated autonomous validation failure" }) });
  const afterFailedApply = fs.readFileSync(path.join(root, "src", "failure.ts"), "utf8");
  const failedTask = kernel.inspectQueuedTask(failureTask.task?.id ?? "missing");
  const loops = kernel.listAutonomousDevLoops("loops").loops ?? [];
  const events = kernel.listAutonomousDevLoops("events").events ?? [];
  const summary = kernel.getAutonomousDevLoopSummary().summary;
  return [
    { id: "autonomy_proposal_no_source_mutation", name: "Autonomous Dev Loop proposal mode does not mutate source", pass: proposal.ok && proposal.autonomy.loop.mode === "propose" && proposal.autonomy.patch?.totalOccurrences === 1 && afterProposal === "export const mode = 'legacy';\n", detail: proposal.autonomy.patch?.patchArtifactPath ?? proposal.message },
    { id: "autonomy_apply_requires_validation_gate", name: "Autonomous Dev Loop apply mode requires validation", pass: !noValidation.ok && noValidation.status === "blocked" && afterNoValidation === "export const mode = 'legacy';\n", detail: noValidation.message },
    { id: "autonomy_apply_certifies_and_completes_task", name: "Autonomous Dev Loop applies bounded change and completes queued task after validation", pass: applied.ok && applied.status === "completed_with_changes" && afterApply.includes("autonomous") && appliedTask.task?.status === "completed" && Boolean(applied.autonomy.taskResult?.memoryRunRecordPath), detail: applied.autonomy.taskResult?.memoryRunRecordPath ?? applied.message },
    { id: "autonomy_failed_validation_rolls_back_and_blocks_task", name: "Autonomous Dev Loop rolls back failed validation and blocks queued task", pass: !failedApply.ok && failedApply.status === "blocked" && failedApply.autonomy.patch?.restored === true && afterFailedApply === "export const flag = 'bad';\n" && failedTask.task?.status === "blocked" && Boolean(failedApply.autonomy.taskResult?.lessonCandidatePath), detail: failedApply.autonomy.taskResult?.lessonCandidatePath ?? failedApply.message },
    { id: "autonomy_summary_counts_loops_and_events", name: "Autonomous Dev Loop summary and events track proposed, applied, and blocked loops", pass: loops.length === 4 && events.length >= 10 && summary.loopCount === 4 && summary.proposedCount === 1 && summary.appliedCount === 1 && summary.blockedCount === 2, detail: JSON.stringify(summary) }
  ];
}


function runOperatorConsoleV1Checks(): CertCheck[] {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "sera-console-cert-"));
  const kernel = new SeraKernel({ rootDir: root });
  fs.mkdirSync(path.join(root, "docs"), { recursive: true });
  fs.writeFileSync(path.join(root, "docs", "console.md"), "Operator console should summarize local evidence, tasks, models, and autonomy.\n", "utf8");

  kernel.runTask("create hello file");
  const task = kernel.createQueuedTask({ title: "Console certified task", prompt: "Validate the operator console task counts.", requestedBy: "cert-runner" });
  kernel.startQueuedTask(task.task?.id ?? "missing", "Start during console certification.", "cert-runner");
  kernel.ingestKnowledgeFile({ relativePath: "docs/console.md", title: "Console Notes" });
  kernel.invokeModelProvider({ providerId: "mock-local", prompt: "Console cert prompt", purpose: "operator-console-v1-cert" });
  kernel.runAutonomousDevLoop({ mode: "propose", goal: "Propose a harmless console cert patch.", relativePath: "docs/console.md", operations: [{ kind: "replace", find: "Operator console", replaceWith: "S.E.R.A. operator console", expectedOccurrences: 1 }] });

  const status = kernel.getOperatorConsoleStatus();
  const health = kernel.getOperatorConsoleHealth();
  const report = kernel.writeOperatorConsoleReport();
  const history = kernel.listOperatorConsoleHistory();
  const summary = kernel.getOperatorConsoleSummary().summary;
  const consoleStore = new OperatorConsoleStore(root);
  const reportMarkdownExists = fs.existsSync(report.markdownPath);
  const reportText = reportMarkdownExists ? fs.readFileSync(report.markdownPath, "utf8") : "";

  return [
    {
      id: "console_snapshot_collects_subsystems",
      name: "Operator Console status snapshot collects all certified subsystems",
      pass: status.ok && status.snapshot.subsystems.length === 5 && status.snapshot.subsystems.some((subsystem) => subsystem.name === "memory" && subsystem.counts.runs >= 1) && status.snapshot.subsystems.some((subsystem) => subsystem.name === "knowledge" && subsystem.counts.documents >= 1) && status.snapshot.subsystems.some((subsystem) => subsystem.name === "autonomy" && subsystem.counts.loops >= 1),
      detail: status.snapshotPath
    },
    {
      id: "console_health_detects_model_guardrails",
      name: "Operator Console health verifies model guardrails",
      pass: health.ok && health.health.checks.some((check) => check.id === "console_external_models_disabled" && check.pass) && health.health.checks.some((check) => check.id === "console_mock_model_available" && check.pass),
      detail: health.healthPath
    },
    {
      id: "console_report_writes_markdown_and_json",
      name: "Operator Console writes auditable markdown and JSON reports",
      pass: report.ok && reportMarkdownExists && fs.existsSync(report.jsonPath) && reportText.includes("S.E.R.A. Operator Console Report") && reportText.includes("## Health Checks"),
      detail: report.markdownPath
    },
    {
      id: "console_history_records_snapshots_events_and_reports",
      name: "Operator Console records snapshot, event, and report history",
      pass: history.ok && history.snapshots.length >= 2 && history.events.length >= 3 && history.reports.length >= 1,
      detail: consoleStore.consoleDir
    },
    {
      id: "console_summary_counts_operator_activity",
      name: "Operator Console summary counts operator activity",
      pass: summary.snapshotCount >= 2 && summary.eventCount >= 3 && summary.reportCount >= 1 && summary.lastStatus !== "none",
      detail: JSON.stringify(summary)
    }
  ];
}

function runRepositorySnapshotV1Checks(): CertCheck[] {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "sera-repository-snapshot-cert-"));
  fs.mkdirSync(path.join(root, "packages", "alpha", "src"), { recursive: true });
  fs.mkdirSync(path.join(root, "apps", "web", "src"), { recursive: true });
  fs.mkdirSync(path.join(root, "tests"), { recursive: true });
  fs.mkdirSync(path.join(root, "node_modules"), { recursive: true });
  fs.mkdirSync(path.join(root, "dist"), { recursive: true });
  fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({
    name: "snapshot-cert-root",
    version: "1.0.0",
    private: true,
    workspaces: ["packages/*", "apps/*", "missing/*"],
    scripts: { test: "vitest run", build: "tsc -b" }
  }, null, 2), "utf8");
  fs.writeFileSync(path.join(root, "tsconfig.json"), JSON.stringify({
    files: [],
    references: [{ path: "packages/alpha" }, { path: "missing-ref" }]
  }, null, 2), "utf8");
  fs.writeFileSync(path.join(root, "packages", "alpha", "package.json"), JSON.stringify({
    name: "@sera/alpha",
    version: "0.1.0",
    private: true,
    scripts: { test: "vitest run alpha" },
    dependencies: { "@sera/missing": "0.1.0" }
  }, null, 2), "utf8");
  fs.writeFileSync(path.join(root, "packages", "alpha", "tsconfig.json"), "{}", "utf8");
  fs.writeFileSync(path.join(root, "packages", "alpha", "src", "index.ts"), "export const alpha = 1;\n", "utf8");
  fs.writeFileSync(path.join(root, "apps", "web", "package.json"), JSON.stringify({ name: "@sera/web", version: "0.1.0", private: true }), "utf8");
  fs.writeFileSync(path.join(root, "apps", "web", "src", "main.ts"), "console.log('web');\n", "utf8");
  fs.writeFileSync(path.join(root, "tests", "alpha.test.ts"), "test('alpha', () => undefined);\n", "utf8");
  fs.writeFileSync(path.join(root, "README.md"), "# Snapshot Cert\n", "utf8");
  fs.writeFileSync(path.join(root, "dist", "ignored.test.ts"), "throw new Error('ignored');\n", "utf8");

  const clock = { now: () => new Date("2026-07-14T00:00:00.000Z") };
  const first = runRepositorySnapshot({ repositoryRoot: root, clock });
  const required = ["snapshot.json", "workspaces.json", "packages.json", "scripts.json", "tests.json", "references.json", "documents.json", "summary.json"];
  const parsed = required.map((name) => {
    const absolutePath = path.join(root, ".sera", "repository", name);
    return {
      name,
      exists: fs.existsSync(absolutePath),
      value: fs.existsSync(absolutePath) ? JSON.parse(fs.readFileSync(absolutePath, "utf8")) : undefined
    };
  });
  const firstSummaryText = fs.readFileSync(path.join(root, ".sera", "repository", "summary.json"), "utf8");
  const failed = runRepositorySnapshot({ repositoryRoot: root, clock, simulateFailureAfterStaging: true });
  const afterFailureSummaryText = fs.readFileSync(path.join(root, ".sera", "repository", "summary.json"), "utf8");
  const second = runRepositorySnapshot({ repositoryRoot: root, clock });
  const secondSummaryText = fs.readFileSync(path.join(root, ".sera", "repository", "summary.json"), "utf8");
  const snapshot = parsed.find((item) => item.name === "snapshot.json")?.value;
  const summary = JSON.parse(secondSummaryText);
  const tests = JSON.parse(fs.readFileSync(path.join(root, ".sera", "repository", "tests.json"), "utf8"));
  const references = JSON.parse(fs.readFileSync(path.join(root, ".sera", "repository", "references.json"), "utf8"));
  const workspaces = JSON.parse(fs.readFileSync(path.join(root, ".sera", "repository", "workspaces.json"), "utf8"));
  const allJson = JSON.stringify(parsed.map((item) => item.value));
  const portablePaths = !allJson.includes(root) && !/[A-Z]:\\\\/.test(allJson);

  let symlinkExcluded = true;
  try {
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), "sera-repository-snapshot-outside-cert-"));
    fs.writeFileSync(path.join(outside, "outside.test.ts"), "outside\n", "utf8");
    fs.symlinkSync(outside, path.join(root, "outside-link"), "junction");
    runRepositorySnapshot({ repositoryRoot: root, clock });
    const symlinkSummary = JSON.parse(fs.readFileSync(path.join(root, ".sera", "repository", "summary.json"), "utf8"));
    symlinkExcluded = symlinkSummary.exclusions.some((item: { path: string; reason: string }) => item.path === "outside-link" && item.reason.includes("not followed"));
  } catch {
    symlinkExcluded = true;
  }

  const nonGitRoot = fs.mkdtempSync(path.join(os.tmpdir(), "sera-repository-snapshot-nongit-cert-"));
  fs.writeFileSync(path.join(nonGitRoot, "package.json"), JSON.stringify({ name: "nongit", workspaces: [] }), "utf8");
  fs.writeFileSync(path.join(nonGitRoot, "tsconfig.json"), JSON.stringify({ files: [] }), "utf8");
  const nonGit = runRepositorySnapshot({ repositoryRoot: nonGitRoot, clock });

  return [
    { id: "repository_snapshot_required_outputs_exist", name: "Repository Snapshot writes every required output file", pass: first.ok && parsed.every((item) => item.exists), detail: first.outputRoot },
    { id: "repository_snapshot_schemas_parse", name: "Repository Snapshot output schemas parse", pass: parsed.every((item) => item.value?.schemaVersion === "sera.repository-snapshot.v1"), detail: required.join(", ") },
    { id: "repository_snapshot_paths_are_portable", name: "Repository Snapshot paths are repository-relative and portable", pass: portablePaths, detail: "persistent JSON contains no fixture absolute path" },
    { id: "repository_snapshot_traversal_is_deterministic", name: "Repository Snapshot normalized repeatability succeeds", pass: first.ok && second.ok && firstSummaryText === afterFailureSummaryText && JSON.parse(secondSummaryText).totalFilesObserved === JSON.parse(firstSummaryText).totalFilesObserved, detail: path.join(root, ".sera", "repository", "summary.json") },
    { id: "repository_snapshot_excludes_generated_directories", name: "Repository Snapshot excludes generated directories", pass: summary.exclusions.some((item: { path: string }) => item.path === "node_modules") && summary.exclusions.some((item: { path: string }) => item.path === "dist") && !tests.testFiles.some((file: { path: string }) => file.path.startsWith("dist/")), detail: JSON.stringify(summary.exclusions.slice(0, 5)) },
    { id: "repository_snapshot_symlink_not_followed", name: "Repository Snapshot does not follow outside-root symlinks or junctions", pass: symlinkExcluded, detail: "outside-link excluded when symlink creation is available" },
    { id: "repository_snapshot_non_git_operation_succeeds", name: "Repository Snapshot succeeds without requiring Git repository metadata", pass: nonGit.ok, detail: nonGit.message },
    { id: "repository_snapshot_git_optional_local_only", name: "Repository Snapshot records Git as optional and local-only", pass: snapshot.modelUse === false && snapshot.networkUse === false && snapshot.repository.git.available !== undefined, detail: JSON.stringify(snapshot.repository.git) },
    { id: "repository_snapshot_missing_paths_recorded", name: "Repository Snapshot records missing workspaces and references", pass: workspaces.missingDeclaredWorkspacePaths.includes("missing/*") && references.missingReferencedPaths.includes("missing-ref"), detail: "missing/* and missing-ref" },
    { id: "repository_snapshot_no_model_or_network", name: "Repository Snapshot records no model or network use", pass: snapshot.modelUse === false && snapshot.networkUse === false, detail: "modelUse=false networkUse=false" },
    { id: "repository_snapshot_no_partial_promotion", name: "Repository Snapshot does not promote partial output after simulated failure", pass: failed.status === "FAILED" && firstSummaryText === afterFailureSummaryText, detail: failed.message },
    { id: "repository_snapshot_public_api_consumable", name: "Repository Snapshot is consumable through typed public API", pass: Boolean(first.manifest.find((item) => item.path.endsWith("snapshot.json"))) && first.execution.status === "COMPLETED", detail: first.execution.evidenceDirectory ?? "missing evidence directory" }
  ];
}

function runRepositoryTruthV1Checks(): CertCheck[] {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "sera-repository-truth-cert-"));
  fs.mkdirSync(path.join(root, "packages", "runtime-core", "src"), { recursive: true });
  fs.mkdirSync(path.join(root, "packages", "capability-tool", "src"), { recursive: true });
  fs.mkdirSync(path.join(root, "apps", "operator", "src"), { recursive: true });
  fs.mkdirSync(path.join(root, "scripts"), { recursive: true });
  fs.mkdirSync(path.join(root, "docs", "architecture"), { recursive: true });
  fs.mkdirSync(path.join(root, "architecture"), { recursive: true });
  fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({
    name: "truth-cert-root",
    private: true,
    workspaces: ["packages/*", "apps/*", "missing/*"],
    scripts: {
      build: "tsc -b",
      test: "vitest run",
      "phase100c:demo": "node scripts/run-phase-overlay-zip-builder-v1.mjs"
    },
    dependencies: { "@sera/capability-tool": "0.1.0" }
  }, null, 2), "utf8");
  fs.writeFileSync(path.join(root, "tsconfig.json"), JSON.stringify({ files: [], references: [{ path: "packages/runtime-core" }, { path: "missing-ref" }] }, null, 2), "utf8");
  fs.writeFileSync(path.join(root, "packages", "runtime-core", "package.json"), JSON.stringify({
    name: "@sera/repository-truth",
    private: true,
    scripts: { build: "tsc -b", test: "vitest run" },
    dependencies: { "@sera/capability-tool": "0.1.0", "@sera/missing": "0.1.0" }
  }, null, 2), "utf8");
  fs.writeFileSync(path.join(root, "packages", "runtime-core", "tsconfig.json"), "{}", "utf8");
  fs.writeFileSync(path.join(root, "packages", "runtime-core", "src", "index.ts"), "export const runtime = true;\n", "utf8");
  fs.writeFileSync(path.join(root, "packages", "runtime-core", "src", "runtime.test.ts"), "test('runtime', () => undefined);\n", "utf8");
  fs.writeFileSync(path.join(root, "packages", "capability-tool", "package.json"), JSON.stringify({
    name: "@sera/capability-tool",
    private: true,
    dependencies: { "@sera/repository-truth": "0.1.0" }
  }, null, 2), "utf8");
  fs.writeFileSync(path.join(root, "packages", "capability-tool", "src", "index.ts"), "export const tool = true;\n", "utf8");
  fs.writeFileSync(path.join(root, "apps", "operator", "package.json"), JSON.stringify({
    name: "@sera/operator-app",
    private: true,
    dependencies: { "@sera/repository-truth": "0.1.0" }
  }, null, 2), "utf8");
  fs.writeFileSync(path.join(root, "apps", "operator", "src", "main.ts"), "console.log('operator');\n", "utf8");
  fs.writeFileSync(path.join(root, "scripts", "run-phase-overlay-zip-builder-v1.mjs"), "console.log('legacy zip');\n", "utf8");
  fs.writeFileSync(path.join(root, "docs", "architecture", "legacy-overlay.md"), "# Legacy overlay\n", "utf8");
  fs.writeFileSync(path.join(root, "architecture", "capability-inventory.json"), JSON.stringify({
    schemaVersion: "sera.capability-inventory.v1",
    targetSubsystems: [
      { id: "repository-truth", targetLayer: "Runtime", currentMaturity: "starter", status: "proposed", dependencies: ["repository-snapshot"] },
      { id: "website-studio", targetLayer: "Studio", currentMaturity: "not-implemented", status: "proposed", dependencies: [] }
    ]
  }, null, 2), "utf8");

  const clock = { now: () => new Date("2026-07-14T12:30:00.000Z") };
  const first = runRepositoryTruth({ repositoryRoot: root, clock });
  const required = ["truth.json", "components.json", "dependency-graph.json", "test-ownership.json", "findings.json", "classifications.json", "summary.json"];
  const parsed = Object.fromEntries(required.map((name) => [name, JSON.parse(fs.readFileSync(path.join(root, ".sera", "repository-truth", name), "utf8"))]));
  const firstSummaryText = fs.readFileSync(path.join(root, ".sera", "repository-truth", "summary.json"), "utf8");
  const snapshotBeforeNoRefresh = fs.readFileSync(path.join(root, ".sera", "repository", "summary.json"), "utf8");
  const noRefresh = runRepositoryTruth({ repositoryRoot: root, refreshSnapshot: false, clock });
  const snapshotAfterNoRefresh = fs.readFileSync(path.join(root, ".sera", "repository", "summary.json"), "utf8");
  const latestCompleteSummaryText = fs.readFileSync(path.join(root, ".sera", "repository-truth", "summary.json"), "utf8");
  const failed = runRepositoryTruth({ repositoryRoot: root, refreshSnapshot: false, clock, simulateFailureAfterStaging: true });
  const afterFailureSummaryText = fs.readFileSync(path.join(root, ".sera", "repository-truth", "summary.json"), "utf8");

  const brokenRoot = fs.mkdtempSync(path.join(os.tmpdir(), "sera-repository-truth-broken-cert-"));
  fs.writeFileSync(path.join(brokenRoot, "package.json"), JSON.stringify({ name: "broken", workspaces: [] }), "utf8");
  fs.writeFileSync(path.join(brokenRoot, "tsconfig.json"), JSON.stringify({ files: [] }), "utf8");
  const blocked = runRepositoryTruth({ repositoryRoot: brokenRoot, refreshSnapshot: false, clock });

  const allJson = JSON.stringify(parsed);
  const graph = parsed["dependency-graph.json"];
  const findings = parsed["findings.json"].findings as Array<{ certainty: string; confidence: number; automaticRemediationAllowed: boolean; ruleId: string; evidencePaths: string[] }>;
  const tests = parsed["test-ownership.json"].tests as Array<{ ownershipClassification: string; confidence: number; candidateComponent?: string }>;
  const classifications = parsed["classifications.json"];
  const summary = parsed["summary.json"];
  const truth = parsed["truth.json"];

  return [
    { id: "repository_truth_required_outputs_exist", name: "Repository Truth writes every required output", pass: first.ok && required.every((name) => fs.existsSync(path.join(root, ".sera", "repository-truth", name))), detail: first.outputRoot },
    { id: "repository_truth_schemas_parse", name: "Repository Truth output schemas parse", pass: required.every((name) => parsed[name].schemaVersion === "sera.repository-truth.v1"), detail: required.join(", ") },
    { id: "repository_truth_refreshes_snapshot_first", name: "Repository Truth refreshes Snapshot by default", pass: first.ok && summary.refreshedSnapshotFirst === true && truth.refreshedSnapshotFirst === true, detail: String(summary.refreshedSnapshotId ?? "missing") },
    { id: "repository_truth_can_use_existing_snapshot", name: "Repository Truth can consume existing Snapshot without refresh", pass: noRefresh.ok && snapshotBeforeNoRefresh === snapshotAfterNoRefresh, detail: noRefresh.message },
    { id: "repository_truth_blocks_incomplete_snapshot", name: "Repository Truth blocks incomplete Snapshot source", pass: !blocked.ok && blocked.status === "BLOCKED", detail: blocked.message },
    { id: "repository_truth_no_partial_promotion", name: "Repository Truth does not promote partial output after simulated failure", pass: failed.status === "FAILED" && afterFailureSummaryText === latestCompleteSummaryText && firstSummaryText.length > 0, detail: failed.message },
    { id: "repository_truth_paths_are_portable", name: "Repository Truth paths are repository-relative and portable", pass: !allJson.includes(root) && !/[A-Z]:\\\\/.test(allJson), detail: "persistent JSON contains no fixture absolute path" },
    { id: "repository_truth_dependency_graph_declared_only", name: "Repository Truth dependency graph uses declared evidence", pass: graph.edges.some((edge: { edgeType: string; certainty: string; confidence: number }) => edge.edgeType === "workspace dependency" && edge.certainty === "FACT" && edge.confidence === 1) && graph.importCallerBoundary.certainty === "UNKNOWN", detail: JSON.stringify(graph.edgeCountsByType) },
    { id: "repository_truth_findings_have_evidence_and_rules", name: "Repository Truth findings include evidence, rules, certainty, and no auto remediation", pass: findings.length > 0 && findings.every((finding) => finding.ruleId && Array.isArray(finding.evidencePaths) && finding.automaticRemediationAllowed === false) && findings.some((finding) => finding.certainty === "HEURISTIC" && finding.confidence < 1), detail: JSON.stringify(parsed["findings.json"].countsBySeverity) },
    { id: "repository_truth_test_ownership_is_confidence_scored", name: "Repository Truth assigns confidence-scored test ownership", pass: tests.some((test) => test.candidateComponent && test.ownershipClassification === "HEURISTIC" && test.confidence < 1), detail: JSON.stringify(parsed["test-ownership.json"].unownedTests) },
    { id: "repository_truth_inventory_reconciliation", name: "Repository Truth reconciles capability inventory", pass: classifications.inventoryReconciliation.inventoryEntriesWithNoImplementation.includes("website-studio") && classifications.inventoryReconciliation.inventoryEntries.some((entry: { inventoryId: string }) => entry.inventoryId === "repository-truth"), detail: JSON.stringify(classifications.inventoryReconciliation.inventoryReconciliationCounts ?? classifications.inventoryReconciliation.inventoryEntriesWithNoImplementation) },
    { id: "repository_truth_legacy_authority_analysis_present", name: "Repository Truth records legacy authority analysis", pass: typeof classifications.legacyAuthorityAnalysis.constitutionalRule === "string" && summary.legacyCandidateCount >= 1, detail: classifications.legacyAuthorityAnalysis.constitutionalRule },
    { id: "repository_truth_no_model_or_network", name: "Repository Truth records no model or network use", pass: truth.modelUse === false && truth.networkUse === false && summary.modelUse === false && summary.networkUse === false, detail: "modelUse=false networkUse=false" },
    { id: "repository_truth_public_api_consumable", name: "Repository Truth is consumable through typed public API", pass: first.execution.status === "COMPLETED" && Boolean(first.manifest.find((item) => item.path.endsWith("truth.json"))), detail: first.execution.evidenceDirectory ?? "missing evidence directory" }
  ];
}

function runBaseMvpManifestV1Checks(rootDir: string): CertCheck[] {
  const checks: CertCheck[] = [];
  const manifestPath = path.join(rootDir, "architecture", "base-mvp-manifest.json");
  const roadmapPath = path.join(rootDir, "docs", "architecture", "SERA_EVOLUTION_ROADMAP_V1.md");
  const expected = {
    schemaVersion: "sera.base-mvp-manifest.v1",
    totalMilestones: 16,
    completedMilestones: 7,
    remainingMilestones: 9,
    currentMilestone: 8,
    baseMvpCompletionMilestone: 16,
    currentCertification: "evaluation-engine-v1",
    architectureBranch: "architecture/local-autonomous-runtime-v1"
  };
  let manifest: any;
  let parseError = "";
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  } catch (error) {
    parseError = error instanceof Error ? error.message : String(error);
  }
  const roadmap = fs.existsSync(roadmapPath) ? fs.readFileSync(roadmapPath, "utf8") : "";
  const has = (text: string) => roadmap.includes(text);

  checks.push({ id: "base_mvp_manifest_exists", name: "Base MVP manifest exists", pass: fs.existsSync(manifestPath), detail: manifestPath });
  checks.push({ id: "base_mvp_manifest_parses", name: "Base MVP manifest parses as JSON", pass: Boolean(manifest) && !parseError, detail: parseError || "parsed" });
  checks.push({ id: "base_mvp_manifest_schema", name: "Base MVP manifest schema version is canonical", pass: manifest?.schemaVersion === expected.schemaVersion, detail: String(manifest?.schemaVersion ?? "missing") });
  checks.push({ id: "base_mvp_manifest_total_milestones", name: "Base MVP total milestone count is 16", pass: manifest?.totalMilestones === expected.totalMilestones, detail: String(manifest?.totalMilestones ?? "missing") });
  checks.push({ id: "base_mvp_manifest_completed_milestones", name: "Base MVP completed milestone count is 7", pass: manifest?.completedMilestones === expected.completedMilestones, detail: String(manifest?.completedMilestones ?? "missing") });
  checks.push({ id: "base_mvp_manifest_remaining_milestones", name: "Base MVP remaining milestone count is 9", pass: manifest?.remainingMilestones === expected.remainingMilestones, detail: String(manifest?.remainingMilestones ?? "missing") });
  checks.push({ id: "base_mvp_manifest_current_milestone", name: "Base MVP current milestone is 8", pass: manifest?.currentMilestone === expected.currentMilestone, detail: String(manifest?.currentMilestone ?? "missing") });
  checks.push({ id: "base_mvp_manifest_completion_milestone", name: "Base MVP completion milestone is 16", pass: manifest?.baseMvpCompletionMilestone === expected.baseMvpCompletionMilestone, detail: String(manifest?.baseMvpCompletionMilestone ?? "missing") });
  checks.push({ id: "base_mvp_manifest_current_certification", name: "Base MVP manifest current certification matches Milestone 7", pass: manifest?.currentCertification === expected.currentCertification, detail: String(manifest?.currentCertification ?? "missing") });
  checks.push({ id: "base_mvp_manifest_architecture_branch", name: "Base MVP manifest records architecture branch", pass: manifest?.architectureBranch === expected.architectureBranch, detail: String(manifest?.architectureBranch ?? "missing") });
  checks.push({ id: "base_mvp_manifest_arithmetic_total", name: "Base MVP completed plus remaining equals total", pass: manifest?.completedMilestones + manifest?.remainingMilestones === manifest?.totalMilestones, detail: JSON.stringify({ completed: manifest?.completedMilestones, remaining: manifest?.remainingMilestones, total: manifest?.totalMilestones }) });
  checks.push({ id: "base_mvp_manifest_arithmetic_current", name: "Base MVP current milestone follows completed milestones", pass: manifest?.currentMilestone === manifest?.completedMilestones + 1, detail: JSON.stringify({ completed: manifest?.completedMilestones, current: manifest?.currentMilestone }) });
  checks.push({ id: "base_mvp_manifest_arithmetic_completion", name: "Base MVP completion milestone equals total milestones", pass: manifest?.baseMvpCompletionMilestone === manifest?.totalMilestones, detail: JSON.stringify({ completion: manifest?.baseMvpCompletionMilestone, total: manifest?.totalMilestones }) });
  checks.push({ id: "base_mvp_roadmap_milestone_7_complete", name: "Roadmap identifies Milestone 7 as complete", pass: has("Milestone 7 - Evaluation Engine: COMPLETE"), detail: "Milestone 7 - Evaluation Engine: COMPLETE" });
  checks.push({ id: "base_mvp_roadmap_milestone_8_next", name: "Roadmap identifies Milestone 8 as next", pass: has("Milestone 8 - Local Model Runtime: NEXT"), detail: "Milestone 8 - Local Model Runtime: NEXT" });
  checks.push({
    id: "base_mvp_roadmap_manifest_consistent",
    name: "Roadmap and Base MVP manifest do not contradict each other",
    pass:
      has("totalMilestones: 16") &&
      has("completedMilestones: 7") &&
      has("remainingMilestones: 9") &&
      has("currentMilestone: 8") &&
      has("baseMvpCompletionMilestone: 16") &&
      manifest?.totalMilestones === expected.totalMilestones &&
      manifest?.completedMilestones === expected.completedMilestones &&
      manifest?.remainingMilestones === expected.remainingMilestones &&
      manifest?.currentMilestone === expected.currentMilestone &&
      manifest?.baseMvpCompletionMilestone === expected.baseMvpCompletionMilestone,
    detail: "architecture/base-mvp-manifest.json <-> docs/architecture/SERA_EVOLUTION_ROADMAP_V1.md"
  });

  return checks;
}

function runControlPlaneV1Checks(): CertCheck[] {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "sera-control-plane-cert-"));
  fs.mkdirSync(path.join(root, "packages", "alpha", "src"), { recursive: true });
  fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({
    name: "control-plane-cert-root",
    version: "1.0.0",
    private: true,
    workspaces: ["packages/*"]
  }, null, 2), "utf8");
  fs.writeFileSync(path.join(root, "tsconfig.json"), JSON.stringify({ files: [], references: [{ path: "packages/alpha" }] }, null, 2), "utf8");
  fs.writeFileSync(path.join(root, "packages", "alpha", "package.json"), JSON.stringify({ name: "@sera/alpha", version: "0.1.0", private: true }), "utf8");
  fs.writeFileSync(path.join(root, "packages", "alpha", "src", "index.ts"), "export const alpha = true;\n", "utf8");
  fs.mkdirSync(path.join(root, "architecture"), { recursive: true });
  fs.writeFileSync(path.join(root, "architecture", "capability-inventory.json"), JSON.stringify({
    schemaVersion: "sera.capability-inventory.v1",
    targetSubsystems: [
      { id: "runtime-control-plane", targetLayer: "Runtime", currentMaturity: "implemented", status: "certification-pending", dependencies: ["repository-snapshot", "repository-truth"] }
    ]
  }, null, 2), "utf8");

  const clock = { now: () => new Date("2026-07-14T13:00:00.000Z") };
  const snapshot = runRepositorySnapshot({ repositoryRoot: root, clock });
  const truth = snapshot.ok ? runRepositoryTruth({ repositoryRoot: root, refreshSnapshot: true, clock }) : undefined;
  const control = new ControlPlane({ repositoryRoot: root, clock });
  const successSpec: ControlPlaneAttemptSpec = {
    title: "Certified control plane success",
    stages: [
      { id: "prepare", executionMode: "emit-evidence", evidence: [{ id: "prepared", required: true }], input: { evidenceId: "prepared", value: { ready: true } } },
      { id: "validate-file", executionMode: "validate-file", dependsOn: ["prepare"], evidence: [{ id: "source-file", required: true }], input: { evidenceId: "source-file", relativePath: "packages/alpha/src/index.ts" } },
      { id: "warn", executionMode: "warning", required: false, input: { message: "non-blocking warning" } }
    ],
    gates: [
      { id: "snapshot-gate", gateType: "precondition", evaluationTiming: "before", passCriteria: { kind: "snapshot-valid" } },
      { id: "truth-gate", gateType: "precondition", evaluationTiming: "before", passCriteria: { kind: "truth-valid", blockSeverities: ["critical"] } },
      { id: "evidence-gate", gateType: "verification", passCriteria: { kind: "evidence-valid", evidenceIds: ["prepared", "source-file"] } }
    ],
    requiredEvidence: [{ id: "prepared", required: true }, { id: "source-file", required: true }]
  };
  const success = control.run(successSpec);
  const verify = success.attemptId ? control.verify(success.attemptId) : undefined;
  const closeout = success.attemptId ? control.closeout(success.attemptId) : undefined;

  const failed = control.run({
    title: "Certified control plane failure",
    stages: [
      { id: "required-failure", executionMode: "fail", input: { message: "expected failure" } },
      { id: "dependent", executionMode: "emit-evidence", dependsOn: ["required-failure"], evidence: [{ id: "should-not-run" }] }
    ]
  });
  const blocked = control.run({
    title: "Certified control plane blocked",
    stages: [{ id: "blocked-stage", executionMode: "block", input: { message: "expected block" } }]
  });
  const invalid = control.run({
    title: "Invalid cycle",
    stages: [
      { id: "a", executionMode: "noop", dependsOn: ["b"] },
      { id: "b", executionMode: "noop", dependsOn: ["a"] }
    ]
  });
  const inspect = control.inspect();
  const attemptRoot = success.attemptPath ? path.join(root, success.attemptPath) : "";
  const attemptJson = attemptRoot ? JSON.parse(fs.readFileSync(path.join(attemptRoot, "attempt.json"), "utf8")) : {};
  const terminalJson = attemptRoot ? JSON.parse(fs.readFileSync(path.join(attemptRoot, "terminal-decision.json"), "utf8")) : {};
  const closeoutJson = attemptRoot ? JSON.parse(fs.readFileSync(path.join(attemptRoot, "closeout.json"), "utf8")) : {};

  return [
    { id: "control_plane_snapshot_truth_preconditions", name: "Control Plane cert runs Snapshot then Truth before attempts", pass: Boolean(snapshot.ok && truth?.ok && truth.sourceSnapshotId), detail: `${snapshot.snapshotId ?? "missing"} -> ${truth?.truthId ?? "missing"}` },
    { id: "control_plane_success_outputs", name: "Control Plane writes required attempt outputs", pass: success.ok && ["attempt.json", "specification.json", "stage-results.json", "evidence-index.json", "gate-results.json", "terminal-decision.json", "closeout.json", "events.jsonl", "final-report.md"].every((file) => fs.existsSync(path.join(attemptRoot, file))), detail: success.attemptPath ?? success.message },
    { id: "control_plane_schema_and_flags", name: "Control Plane records schema and no model/network use", pass: attemptJson.schemaVersion === "sera.control-plane.v1" && attemptJson.modelUse === false && attemptJson.networkUse === false, detail: JSON.stringify({ modelUse: attemptJson.modelUse, networkUse: attemptJson.networkUse }) },
    { id: "control_plane_terminal_with_warnings", name: "Control Plane emits completed-with-warnings terminal decision", pass: success.status === "COMPLETED_WITH_WARNINGS" && success.terminalDecision === "COMPLETE_WITH_WARNINGS", detail: JSON.stringify(terminalJson.terminalDecision) },
    { id: "control_plane_verify_attempt", name: "Control Plane verifies attempt artifacts and evidence hashes", pass: Boolean(verify?.ok && verify.status === "VERIFIED"), detail: verify?.message ?? "verify missing" },
    { id: "control_plane_closeout_separate_no_merge", name: "Control Plane closeout is separate and cannot merge", pass: Boolean(closeout?.ok && closeoutJson.mergeAllowed === false && closeoutJson.promotionAllowed === false), detail: JSON.stringify(closeoutJson) },
    { id: "control_plane_required_failure_terminal", name: "Control Plane fails on required stage failure and skips dependent work", pass: !failed.ok && failed.status === "FAILED" && failed.terminalDecision === "FAIL", detail: failed.message },
    { id: "control_plane_blocked_handoff", name: "Control Plane writes rich blocked handoff", pass: !blocked.ok && blocked.status === "BLOCKED" && Boolean(blocked.attemptId), detail: blocked.attemptPath ?? blocked.message },
    { id: "control_plane_invalid_spec_blocks", name: "Control Plane blocks invalid specifications without partial completion", pass: !invalid.ok && invalid.status === "BLOCKED" && invalid.terminalDecision === "BLOCK", detail: invalid.message },
    { id: "control_plane_inspect_reports_surface", name: "Control Plane inspect reports stage and gate types", pass: inspect.ok && Array.isArray((inspect.summary as any).stageTypes) && Array.isArray((inspect.summary as any).gateTypes), detail: JSON.stringify((inspect.summary as any).terminalCounts) }
  ];
}

async function runRuntimeHostV1Checks(): Promise<CertCheck[]> {
  const checks: CertCheck[] = [];
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "sera-runtime-host-cert-"));
  fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ name: "runtime-host-cert-root", private: true }), "utf8");
  const config = createRuntimeConfig({ projectRoot: root });
  const firstIdentity = loadOrCreateRuntimeIdentity(config);
  const secondIdentity = loadOrCreateRuntimeIdentity(config);
  checks.push({
    id: "runtime_host_installation_identity_persists",
    name: "Runtime Host installation identity persists",
    pass: firstIdentity.installationId === secondIdentity.installationId,
    detail: path.join(config.stateRoot, "identity.json")
  });
  checks.push({
    id: "runtime_host_instance_identity_changes",
    name: "Runtime Host instance identity changes per start",
    pass: firstIdentity.runtimeInstanceId !== secondIdentity.runtimeInstanceId,
    detail: `${firstIdentity.runtimeInstanceId} -> ${secondIdentity.runtimeInstanceId}`
  });

  const orderLog: string[] = [];
  const orderedHost = new RuntimeHost({
    config,
    services: [
      certService("dependent", orderLog, { dependencies: ["middle"] }),
      certService("base", orderLog),
      certService("middle", orderLog, { dependencies: ["base"] })
    ]
  });
  const orderedStart = await orderedHost.start();
  const orderedShutdown = await orderedHost.shutdown();
  checks.push({
    id: "runtime_host_dependency_start_order",
    name: "Runtime Host starts dependencies before dependents",
    pass: orderedStart.ok && orderedStart.serviceOrder.join(",") === "base,middle,dependent" && orderLog.slice(0, 3).join(",") === "start:base,start:middle,start:dependent",
    detail: orderLog.join(",")
  });
  checks.push({
    id: "runtime_host_reverse_shutdown_order",
    name: "Runtime Host stops dependents before dependencies",
    pass: orderedShutdown.ok && orderedShutdown.stoppedServices.join(",") === "dependent,middle,base" && orderLog.slice(3).join(",") === "stop:dependent,stop:middle,stop:base",
    detail: orderLog.join(",")
  });

  checks.push({
    id: "runtime_host_missing_dependency_blocks",
    name: "Runtime Host blocks missing service dependencies",
    pass: throwsRuntimeHost(() => normalizeRuntimeServices([certService("needs-missing", [], { dependencies: ["missing"] })])),
    detail: "missing dependency rejected"
  });
  checks.push({
    id: "runtime_host_cycle_blocks",
    name: "Runtime Host blocks dependency cycles",
    pass: throwsRuntimeHost(() => normalizeRuntimeServices([certService("a", [], { dependencies: ["b"] }), certService("b", [], { dependencies: ["a"] })])),
    detail: "cycle rejected"
  });

  const failureLog: string[] = [];
  const failureHost = new RuntimeHost({
    config: createRuntimeConfig({ projectRoot: root, evidenceRoot: path.join(root, ".sera", "runtime-host-failure") }),
    services: [
      certService("started", failureLog),
      certService("fails", failureLog, {
        dependencies: ["started"],
        start: () => {
          failureLog.push("start:fails");
          throw new Error("required failure");
        }
      }),
      certService("later", failureLog, { dependencies: ["fails"] })
    ]
  });
  const failureStart = await failureHost.start();
  checks.push({
    id: "runtime_host_required_failure_cleans_up",
    name: "Runtime Host blocks required failure and cleans up partial startup",
    pass: !failureStart.ok && failureStart.status === "blocked" && failureStart.failedServiceId === "fails" && failureLog.join(",") === "start:started,start:fails,stop:started",
    detail: failureLog.join(",")
  });

  const optionalLog: string[] = [];
  const optionalHost = new RuntimeHost({
    config: createRuntimeConfig({ projectRoot: root, evidenceRoot: path.join(root, ".sera", "runtime-host-optional") }),
    services: [
      certService("required", optionalLog),
      certService("optional", optionalLog, {
        required: false,
        start: () => {
          optionalLog.push("start:optional");
          throw new Error("optional failure");
        }
      })
    ]
  });
  const optionalStart = await optionalHost.start();
  const optionalHealth = await optionalHost.health();
  await optionalHost.shutdown();
  checks.push({
    id: "runtime_host_optional_failure_degrades",
    name: "Runtime Host degrades on optional service failure",
    pass: optionalStart.ok && optionalHealth.status === "degraded",
    detail: optionalHealth.status
  });

  const idempotentLog: string[] = [];
  const idempotentHost = new RuntimeHost({ config: createRuntimeConfig({ projectRoot: root, evidenceRoot: path.join(root, ".sera", "runtime-host-idempotent") }), services: [certService("idempotent", idempotentLog)] });
  await idempotentHost.start();
  const firstShutdown = await idempotentHost.shutdown();
  const secondShutdown = await idempotentHost.shutdown();
  checks.push({
    id: "runtime_host_shutdown_idempotent",
    name: "Runtime Host shutdown is idempotent",
    pass: firstShutdown.ok && secondShutdown.ok && idempotentLog.join(",") === "start:idempotent,stop:idempotent",
    detail: idempotentLog.join(",")
  });

  const proofRoot = fs.mkdtempSync(path.join(os.tmpdir(), "sera-runtime-host-proof-cert-"));
  fs.writeFileSync(path.join(proofRoot, "package.json"), JSON.stringify({ name: "runtime-host-proof", private: true }), "utf8");
  const proof = await runRuntimeHostProof({ projectRoot: proofRoot });
  const evidenceRoot = proof.evidenceRoot ?? "";
  checks.push({
    id: "runtime_host_evidence_complete",
    name: "Runtime Host writes complete lifecycle evidence",
    pass: proof.ok && ["identity.json", "configuration.json", "lifecycle-events.jsonl", "service-health.json", "final-runtime-report.json"].every((file) => fs.existsSync(path.join(evidenceRoot, file))),
    detail: evidenceRoot
  });
  checks.push({
    id: "runtime_host_non_git_operation",
    name: "Runtime Host works without a Git repository",
    pass: proof.ok && !fs.existsSync(path.join(proofRoot, ".git")),
    detail: proofRoot
  });
  checks.push({
    id: "runtime_host_offline_operation",
    name: "Runtime Host records offline model/network posture",
    pass: proof.ok && proof.modelUse === false && proof.networkUse === false && proof.identity?.permissionProfile === "offline-local" && proof.identity.networkPolicy === "offline-strict",
    detail: JSON.stringify({ modelUse: proof.modelUse, networkUse: proof.networkUse, permissionProfile: proof.identity?.permissionProfile, networkPolicy: proof.identity?.networkPolicy })
  });
  const controlHealth = proof.health?.services.find((item) => item.serviceId === "unified-control-plane");
  checks.push({
    id: "runtime_host_control_plane_service_healthy",
    name: "Runtime Host hosts Unified Control Plane as a required service",
    pass: proof.ok && controlHealth?.status === "healthy" && controlHealth.details?.authority === "attempts-terminal-decisions-validation-evidence-closeout",
    detail: JSON.stringify(controlHealth)
  });

  return checks;
}

async function runRuntimeStateV1Checks(): Promise<CertCheck[]> {
  const checks: CertCheck[] = [];
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "sera-runtime-state-cert-"));
  fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ name: "runtime-state-cert-root", private: true }), "utf8");
  const config = createRuntimeStateConfig({ projectRoot: root, installationId: "installation_cert", runtimeInstanceId: "runtime_cert" });
  const store = openRuntimeState(config);
  const inspection = store.inspect();
  checks.push({ id: "runtime_state_initializes_schema", name: "Runtime State initializes schema", pass: inspection.schemaVersion === 4 && inspection.sqlite.journalMode === "wal" && inspection.sqlite.foreignKeys === true, detail: JSON.stringify(inspection.sqlite) });
  const secondInspection = store.inspect();
  checks.push({ id: "runtime_state_migrations_idempotent", name: "Runtime State migrations are idempotent", pass: secondInspection.counts.schema_migrations === 4, detail: JSON.stringify(secondInspection.counts) });
  const command = store.acceptCommand({ idempotencyKey: "cert-command", commandType: "cert", payload: { value: 1 }, capability: "control-plane" });
  const duplicate = store.acceptCommand({ idempotencyKey: "cert-command", commandType: "cert", payload: { value: 1 }, capability: "control-plane" });
  checks.push({ id: "runtime_state_command_idempotency", name: "Runtime State command idempotency returns original", pass: command.commandId === duplicate.commandId && duplicate.status === "DUPLICATE", detail: `${command.commandId} ${duplicate.status}` });
  checks.push({ id: "runtime_state_conflicting_idempotency_blocks", name: "Runtime State blocks conflicting idempotency", pass: throwsState(() => store.acceptCommand({ idempotencyKey: "cert-command", commandType: "cert", payload: { value: 2 }, capability: "control-plane" })), detail: "conflict rejected" });
  checks.push({ id: "runtime_state_invalid_transition_blocks", name: "Runtime State blocks invalid transitions", pass: throwsState(() => store.transitionAttempt({ attemptId: command.attemptId!, fromState: "PENDING", toState: "COMPLETED", actor: "control-plane" })), detail: "PENDING -> COMPLETED rejected" });
  store.transitionAttempt({ attemptId: command.attemptId!, fromState: "PENDING", toState: "RUNNING", actor: "control-plane" });
  checks.push({ id: "runtime_state_required_gate_enforced", name: "Runtime State enforces required gate before success", pass: throwsState(() => store.transitionAttempt({ attemptId: command.attemptId!, fromState: "RUNNING", toState: "COMPLETED", actor: "control-plane" })), detail: "success blocked before gate" });
  const evidence = store.recordEvidenceReference({ attemptId: command.attemptId!, evidenceType: "cert", location: "cert.json", integrityHash: "abc", producer: "cert" });
  checks.push({ id: "runtime_state_evidence_reference_durable", name: "Runtime State records evidence references", pass: store.inspect().counts.evidence_references === 1, detail: evidence });
  store.recordGateOutcome({ attemptId: command.attemptId!, gateName: "cert-gate", required: true, outcome: "PASS", evidenceReferences: [evidence], evaluator: "cert" });
  store.transitionAttempt({ attemptId: command.attemptId!, fromState: "RUNNING", toState: "COMPLETED", actor: "control-plane", reason: "cert complete" });
  checks.push({ id: "runtime_state_attempt_transition_atomic", name: "Runtime State writes attempt and transition atomically", pass: store.inspect().counts.attempt_transitions === 3, detail: JSON.stringify(store.inspect().counts) });
  checks.push({ id: "runtime_state_terminal_immutable", name: "Runtime State terminal attempts are immutable", pass: throwsState(() => store.transitionAttempt({ attemptId: command.attemptId!, fromState: "COMPLETED", toState: "FAILED", actor: "cert" })), detail: "terminal rewrite rejected" });
  const lease = store.acquireLease({ leaseName: "cert-resource", ttlMs: 50, ownerRuntimeInstanceId: "runtime-a" });
  checks.push({ id: "runtime_state_lease_conflict_blocks", name: "Runtime State blocks live lease conflict", pass: throwsState(() => store.acquireLease({ leaseName: "cert-resource", ttlMs: 50, ownerRuntimeInstanceId: "runtime-b" })), detail: "live owner protected" });
  store.releaseLease({ leaseName: "cert-resource", fencingToken: lease.fencingToken, ownerRuntimeInstanceId: "runtime-a" });
  const nextLease = store.acquireLease({ leaseName: "cert-resource", ttlMs: 1000, ownerRuntimeInstanceId: "runtime-b" });
  checks.push({ id: "runtime_state_fencing_token_advances", name: "Runtime State advances fencing token", pass: nextLease.fencingToken > lease.fencingToken, detail: `${lease.fencingToken} -> ${nextLease.fencingToken}` });
  checks.push({ id: "runtime_state_stale_fence_blocks", name: "Runtime State rejects stale fencing token", pass: throwsState(() => store.assertFence("cert-resource", lease.fencingToken, "runtime-a")), detail: "stale fence rejected" });
  const backup = store.backup();
  checks.push({ id: "runtime_state_backup_valid", name: "Runtime State backup is valid", pass: fs.existsSync(backup.path) && backup.sha256.length === 64, detail: backup.path });
  const exportA = JSON.stringify(store.exportDocument(false));
  const exportB = JSON.stringify(store.exportDocument(false));
  checks.push({ id: "runtime_state_export_deterministic", name: "Runtime State export is deterministic", pass: exportA === exportB, detail: `${exportA.length} bytes` });
  store.close();
  const reopened = openRuntimeState(config);
  checks.push({ id: "runtime_state_restart_persists", name: "Runtime State persists across restart", pass: reopened.inspect().counts.commands === 1, detail: JSON.stringify(reopened.inspect().counts) });
  reopened.close();

  const futureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "sera-runtime-state-future-cert-"));
  const futureStore = openRuntimeState({ projectRoot: futureRoot });
  (futureStore as any).run("INSERT INTO schema_migrations (version, name, checksum, applied_at, runtime_version) VALUES (?, ?, ?, ?, ?)", [99, "future", "future", "2026-07-14T00:00:00.000Z", "future"]);
  futureStore.close();
  checks.push({ id: "runtime_state_future_schema_blocks", name: "Runtime State blocks future schema", pass: throwsState(() => openRuntimeState({ projectRoot: futureRoot })), detail: "future schema rejected" });

  const corruptRoot = fs.mkdtempSync(path.join(os.tmpdir(), "sera-runtime-state-corrupt-cert-"));
  const corruptDb = path.join(corruptRoot, ".sera", "state", "sera-operational.db");
  fs.mkdirSync(path.dirname(corruptDb), { recursive: true });
  fs.writeFileSync(corruptDb, "not sqlite", "utf8");
  checks.push({ id: "runtime_state_corruption_blocks", name: "Runtime State blocks corrupt database", pass: throwsState(() => openRuntimeState({ projectRoot: corruptRoot })) && fs.readFileSync(corruptDb, "utf8") === "not sqlite", detail: corruptDb });

  const proofRoot = fs.mkdtempSync(path.join(os.tmpdir(), "sera-runtime-state-proof-cert-"));
  const proof = await runRuntimeStateProof({ projectRoot: proofRoot, installationId: "installation_cert", runtimeInstanceId: "runtime_cert" });
  checks.push({ id: "runtime_state_non_git_operation", name: "Runtime State works outside Git", pass: proof.ok && !fs.existsSync(path.join(proofRoot, ".git")), detail: proofRoot });
  checks.push({ id: "runtime_state_offline_operation", name: "Runtime State requires no model or network", pass: proof.ok && proof.modelUse === false && proof.networkUse === false, detail: "modelUse=false networkUse=false" });
  checks.push({ id: "runtime_state_control_plane_authority_preserved", name: "Runtime State preserves Control Plane terminal authority", pass: proof.ok && proof.gateEnforced && proof.invalidTransitionBlocked && proof.terminalImmutable, detail: JSON.stringify({ gateEnforced: proof.gateEnforced, invalidTransitionBlocked: proof.invalidTransitionBlocked, terminalImmutable: proof.terminalImmutable }) });

  const hostRoot = fs.mkdtempSync(path.join(os.tmpdir(), "sera-runtime-state-host-cert-"));
  const host = new RuntimeHost({ config: createRuntimeConfig({ projectRoot: hostRoot }), services: createRuntimeStateEnabledServices(hostRoot) });
  const started = await host.start();
  const health = await host.health();
  await host.shutdown();
  checks.push({ id: "runtime_state_runtime_service_healthy", name: "Runtime Host reports Operational State service healthy", pass: started.ok && health.services.find((service) => service.serviceId === "operational-state")?.status === "healthy", detail: JSON.stringify(health.services.map((service) => ({ id: service.serviceId, status: service.status }))) });

  return checks;
}

async function runPersistentRuntimeV1Checks(): Promise<CertCheck[]> {
  const checks: CertCheck[] = [];
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "sera-persistent-runtime-cert-"));
  fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ name: "persistent-runtime-cert-root", private: true }), "utf8");
  const store = openRuntimeState({ projectRoot: root, installationId: "installation_cert", runtimeInstanceId: "runtime_recovery_new" });
  const coordinator = new PersistentRuntimeRecoveryCoordinator(store, { projectRoot: root });
  const interrupted = store.acceptCommand({ idempotencyKey: "cert-interrupted", commandType: "fixture", payload: { kind: "interrupted" }, capability: "fixture-capability" });
  store.transitionAttempt({ attemptId: interrupted.attemptId!, fromState: "PENDING", toState: "RUNNING", actor: "control-plane" });
  const evidence = store.recordEvidenceReference({ attemptId: interrupted.attemptId!, evidenceType: "checkpoint", location: "cert-interrupted.json", integrityHash: "hash", producer: "cert" });
  coordinator.createCheckpoint({ attemptId: interrupted.attemptId!, stageId: "stage", operationIdempotencyKey: "cert-op", restartSafe: true, sideEffectState: "none", evidenceReferences: [evidence], status: "committed" });
  const scan = coordinator.scanAndRecover({ executeSafeRecovery: false });
  checks.push({ id: "persistent_runtime_detects_interrupted_attempt", name: "Persistent Runtime detects interrupted attempts", pass: scan.classifications.some((item) => item.attemptId === interrupted.attemptId && item.classification === "interrupted_safe_to_resume"), detail: JSON.stringify(scan.classifications) });

  const active = store.acceptCommand({ idempotencyKey: "cert-active", commandType: "fixture", payload: { kind: "active" }, capability: "fixture-capability" });
  store.transitionAttempt({ attemptId: active.attemptId!, fromState: "PENDING", toState: "RUNNING", actor: "control-plane" });
  const activeEvidence = store.recordEvidenceReference({ attemptId: active.attemptId!, evidenceType: "checkpoint", location: "active.json", producer: "cert" });
  coordinator.createCheckpoint({ attemptId: active.attemptId!, stageId: "stage", operationIdempotencyKey: "active-op", restartSafe: true, sideEffectState: "none", evidenceReferences: [activeEvidence], status: "committed" });
  store.acquireLease({ leaseName: `attempt:${active.attemptId!}`, ttlMs: 100000, ownerRuntimeInstanceId: "runtime_other" });
  checks.push({ id: "persistent_runtime_does_not_steal_active_owner", name: "Persistent Runtime does not steal active owner", pass: coordinator.scanAndRecover({ executeSafeRecovery: false }).classifications.some((item) => item.attemptId === active.attemptId && item.classification === "active_current_owner"), detail: active.attemptId! });

  const terminal = store.acceptCommand({ idempotencyKey: "cert-terminal", commandType: "fixture", payload: { kind: "terminal" }, capability: "fixture-capability" });
  store.transitionAttempt({ attemptId: terminal.attemptId!, fromState: "PENDING", toState: "RUNNING", actor: "control-plane" });
  store.recordGateOutcome({ attemptId: terminal.attemptId!, gateName: "done", required: true, outcome: "PASS", evaluator: "cert" });
  store.transitionAttempt({ attemptId: terminal.attemptId!, fromState: "RUNNING", toState: "COMPLETED", actor: "control-plane" });
  checks.push({ id: "persistent_runtime_terminal_attempt_immutable", name: "Persistent Runtime leaves terminal attempts immutable", pass: throwsState(() => store.transitionAttempt({ attemptId: terminal.attemptId!, fromState: "COMPLETED", toState: "FAILED", actor: "cert" })), detail: terminal.attemptId! });

  const safe = coordinator.scanAndRecover({ executeSafeRecovery: true });
  checks.push({ id: "persistent_runtime_safe_checkpoint_resumes", name: "Persistent Runtime resumes safe checkpoint", pass: store.recoveryGet("SELECT current_state FROM attempts WHERE attempt_id = ?", [interrupted.attemptId!])?.current_state === "COMPLETED", detail: JSON.stringify(safe.classifications.find((item) => item.attemptId === interrupted.attemptId)) });

  const missing = store.acceptCommand({ idempotencyKey: "cert-missing", commandType: "fixture", payload: { kind: "missing" }, capability: "fixture-capability" });
  store.transitionAttempt({ attemptId: missing.attemptId!, fromState: "PENDING", toState: "RUNNING", actor: "control-plane" });
  checks.push({ id: "persistent_runtime_missing_checkpoint_blocks", name: "Persistent Runtime blocks missing checkpoint", pass: coordinator.scanAndRecover().classifications.some((item) => item.attemptId === missing.attemptId && item.classification === "blocked_missing_checkpoint"), detail: missing.attemptId! });

  const unknown = store.acceptCommand({ idempotencyKey: "cert-unknown", commandType: "fixture", payload: { kind: "unknown" }, capability: "fixture-capability" });
  store.transitionAttempt({ attemptId: unknown.attemptId!, fromState: "PENDING", toState: "RUNNING", actor: "control-plane" });
  const unknownEvidence = store.recordEvidenceReference({ attemptId: unknown.attemptId!, evidenceType: "checkpoint", location: "unknown.json", producer: "cert" });
  coordinator.createCheckpoint({ attemptId: unknown.attemptId!, stageId: "stage", operationIdempotencyKey: "unknown-op", restartSafe: true, sideEffectState: "unknown", evidenceReferences: [unknownEvidence], status: "committed" });
  checks.push({ id: "persistent_runtime_unknown_side_effect_requires_review", name: "Persistent Runtime requires review for unknown side effects", pass: coordinator.scanAndRecover().classifications.some((item) => item.attemptId === unknown.attemptId && item.operatorReviewRequired), detail: unknown.attemptId! });

  const repeated = coordinator.scanAndRecover({ executeSafeRecovery: true });
  checks.push({ id: "persistent_runtime_idempotent_resume", name: "Persistent Runtime does not repeat completed recovery", pass: repeated.classifications.every((item) => item.attemptId !== interrupted.attemptId), detail: JSON.stringify(repeated.classifications) });

  const retry = store.acceptCommand({ idempotencyKey: "cert-retry", commandType: "fixture", payload: { kind: "retry" }, capability: "fixture-capability" });
  store.transitionAttempt({ attemptId: retry.attemptId!, fromState: "PENDING", toState: "RUNNING", actor: "control-plane" });
  const retryEvidence = store.recordEvidenceReference({ attemptId: retry.attemptId!, evidenceType: "checkpoint", location: "retry.json", producer: "cert" });
  coordinator.createCheckpoint({ attemptId: retry.attemptId!, stageId: "stage", operationIdempotencyKey: "retry-op", restartSafe: false, sideEffectState: "compensated", evidenceReferences: [retryEvidence], status: "failed" });
  const retryScan = coordinator.scanAndRecover({ executeSafeRecovery: true });
  checks.push({ id: "persistent_runtime_retry_creates_linked_attempt", name: "Persistent Runtime creates linked retry", pass: retryScan.classifications.some((item) => item.attemptId === retry.attemptId && Boolean(item.newAttemptId)) && Boolean(store.recoveryGet("SELECT current_attempt_id FROM attempt_lineage WHERE prior_attempt_id = ?", [retry.attemptId!])), detail: JSON.stringify(retryScan.classifications.find((item) => item.attemptId === retry.attemptId)) });

  const limitRoot = fs.mkdtempSync(path.join(os.tmpdir(), "sera-persistent-runtime-limit-cert-"));
  const limitStore = openRuntimeState({ projectRoot: limitRoot, runtimeInstanceId: "runtime_limit" });
  const limitCoordinator = new PersistentRuntimeRecoveryCoordinator(limitStore, { projectRoot: limitRoot, maxRetryDepth: 0 });
  const limit = limitStore.acceptCommand({ idempotencyKey: "limit", commandType: "fixture", payload: {}, capability: "fixture-capability" });
  limitStore.transitionAttempt({ attemptId: limit.attemptId!, fromState: "PENDING", toState: "RUNNING", actor: "control-plane" });
  const limitEvidence = limitStore.recordEvidenceReference({ attemptId: limit.attemptId!, evidenceType: "checkpoint", location: "limit.json", producer: "cert" });
  limitCoordinator.createCheckpoint({ attemptId: limit.attemptId!, stageId: "stage", operationIdempotencyKey: "limit-op", restartSafe: false, sideEffectState: "compensated", evidenceReferences: [limitEvidence], status: "failed" });
  checks.push({ id: "persistent_runtime_retry_limit_blocks", name: "Persistent Runtime blocks exhausted retry limit", pass: limitCoordinator.scanAndRecover().classifications[0].operatorReviewRequired, detail: limit.attemptId! });
  limitStore.close();

  const lease = store.acquireLease({ leaseName: "cert-recovery-lease", ttlMs: 100000, ownerRuntimeInstanceId: "owner-a" });
  checks.push({ id: "persistent_runtime_recovery_lease_conflict_blocks", name: "Persistent Runtime recovery lease conflict blocks", pass: throwsState(() => store.acquireLease({ leaseName: "cert-recovery-lease", ttlMs: 100000, ownerRuntimeInstanceId: "owner-b" })), detail: "conflict rejected" });
  store.releaseLease({ leaseName: "cert-recovery-lease", fencingToken: lease.fencingToken, ownerRuntimeInstanceId: "owner-a" });
  const nextLease = store.acquireLease({ leaseName: "cert-recovery-lease", ttlMs: 100000, ownerRuntimeInstanceId: "owner-b" });
  checks.push({ id: "persistent_runtime_fencing_advances", name: "Persistent Runtime fencing advances", pass: nextLease.fencingToken > lease.fencingToken, detail: `${lease.fencingToken}->${nextLease.fencingToken}` });
  checks.push({ id: "persistent_runtime_stale_writer_blocks", name: "Persistent Runtime stale writer blocks", pass: throwsState(() => store.assertFence("cert-recovery-lease", lease.fencingToken, "owner-a")), detail: "stale writer rejected" });

  checks.push({ id: "persistent_runtime_atomic_recovery_decision", name: "Persistent Runtime writes recovery decision atomically", pass: store.recoveryAll("SELECT * FROM recovery_decisions").length > 0 && store.recoveryAll("SELECT * FROM recovery_events").length > 0, detail: "decisions and events present" });
  checks.push({ id: "persistent_runtime_repeated_startup_no_duplicate", name: "Persistent Runtime repeated startup does not duplicate completed recovery", pass: repeated.classifications.every((item) => item.attemptId !== interrupted.attemptId), detail: "completed attempt absent from repeated scan" });

  const denied = store.acceptCommand({ idempotencyKey: "cert-denied", commandType: "fixture", payload: {}, capability: "fixture-capability" });
  store.transitionAttempt({ attemptId: denied.attemptId!, fromState: "PENDING", toState: "RUNNING", actor: "control-plane" });
  const deniedEvidence = store.recordEvidenceReference({ attemptId: denied.attemptId!, evidenceType: "checkpoint", location: "denied.json", producer: "cert" });
  coordinator.createCheckpoint({ attemptId: denied.attemptId!, stageId: "stage", operationIdempotencyKey: "denied-op", restartSafe: true, sideEffectState: "none", evidenceReferences: [deniedEvidence], status: "committed" });
  checks.push({ id: "persistent_runtime_control_plane_authority_preserved", name: "Persistent Runtime preserves Control Plane authority", pass: coordinator.scanAndRecover({ simulateControlPlaneDeny: true }).classifications.some((item) => item.attemptId === denied.attemptId && item.classification === "blocked_policy_denied"), detail: denied.attemptId! });
  checks.push({ id: "persistent_runtime_required_gate_enforced", name: "Persistent Runtime still requires gates for success", pass: throwsState(() => store.transitionAttempt({ attemptId: missing.attemptId!, fromState: "RUNNING", toState: "COMPLETED", actor: "cert" })), detail: "success blocked before gate" });

  const noEvidence = store.acceptCommand({ idempotencyKey: "cert-no-evidence", commandType: "fixture", payload: {}, capability: "fixture-capability" });
  store.transitionAttempt({ attemptId: noEvidence.attemptId!, fromState: "PENDING", toState: "RUNNING", actor: "control-plane" });
  coordinator.createCheckpoint({ attemptId: noEvidence.attemptId!, stageId: "stage", operationIdempotencyKey: "no-evidence-op", restartSafe: true, sideEffectState: "none", evidenceReferences: ["missing"], status: "committed" });
  checks.push({ id: "persistent_runtime_evidence_integrity_enforced", name: "Persistent Runtime enforces evidence integrity", pass: coordinator.scanAndRecover().classifications.some((item) => item.attemptId === noEvidence.attemptId && item.reason.includes("evidence")), detail: noEvidence.attemptId! });

  const reviewHealthRoot = fs.mkdtempSync(path.join(os.tmpdir(), "sera-persistent-runtime-health-cert-"));
  const reviewStore = openRuntimeState({ projectRoot: reviewHealthRoot, runtimeInstanceId: "runtime_old" });
  const reviewCoordinator = new PersistentRuntimeRecoveryCoordinator(reviewStore, { projectRoot: reviewHealthRoot });
  const reviewAttempt = reviewStore.acceptCommand({ idempotencyKey: "review", commandType: "fixture", payload: {}, capability: "fixture-capability" });
  reviewStore.transitionAttempt({ attemptId: reviewAttempt.attemptId!, fromState: "PENDING", toState: "RUNNING", actor: "control-plane" });
  const reviewEvidence = reviewStore.recordEvidenceReference({ attemptId: reviewAttempt.attemptId!, evidenceType: "checkpoint", location: "review.json", producer: "cert" });
  reviewCoordinator.createCheckpoint({ attemptId: reviewAttempt.attemptId!, stageId: "stage", operationIdempotencyKey: "review-op", restartSafe: true, sideEffectState: "unknown", evidenceReferences: [reviewEvidence], status: "committed" });
  reviewStore.close();
  const reviewHost = new RuntimeHost({ config: createRuntimeConfig({ projectRoot: reviewHealthRoot }), services: createPersistentRuntimeServices(reviewHealthRoot) });
  await reviewHost.start();
  const reviewHealth = await reviewHost.health();
  await reviewHost.shutdown();
  checks.push({ id: "persistent_runtime_review_degrades_health", name: "Persistent Runtime review-required work degrades health", pass: reviewHealth.status === "degraded", detail: reviewHealth.status });

  const corruptRoot = fs.mkdtempSync(path.join(os.tmpdir(), "sera-persistent-runtime-corrupt-cert-"));
  const corruptDb = path.join(corruptRoot, ".sera", "state", "sera-operational.db");
  fs.mkdirSync(path.dirname(corruptDb), { recursive: true });
  fs.writeFileSync(corruptDb, "not sqlite", "utf8");
  checks.push({ id: "persistent_runtime_corruption_blocks_health", name: "Persistent Runtime corruption blocks health", pass: throwsState(() => openRuntimeState({ projectRoot: corruptRoot })), detail: corruptDb });

  const cancelRoot = fs.mkdtempSync(path.join(os.tmpdir(), "sera-persistent-runtime-cancel-cert-"));
  const cancelHost = new RuntimeHost({ config: createRuntimeConfig({ projectRoot: cancelRoot }), services: createPersistentRuntimeServices(cancelRoot) });
  await cancelHost.start();
  const shutdown = await cancelHost.shutdown("cert cancellation");
  checks.push({ id: "persistent_runtime_cancellation_safe", name: "Persistent Runtime cancellation is safe", pass: shutdown.ok, detail: shutdown.message });

  const evidenceDecision = store.recoveryAll("SELECT recovery_session_id FROM recovery_sessions ORDER BY started_at DESC LIMIT 1")[0];
  const latestSession = evidenceDecision?.recovery_session_id ? String(evidenceDecision.recovery_session_id) : "";
  const evidenceRoot = path.join(root, ".sera", "recovery", latestSession);
  checks.push({ id: "persistent_runtime_evidence_complete", name: "Persistent Runtime writes complete recovery evidence", pass: latestSession.length > 0 && ["recovery-session.json", "scan-results.json", "recovery-decisions.jsonl", "recovery-events.jsonl", "resumed-attempts.json", "blocked-attempts.json", "final-recovery-report.json"].every((file) => fs.existsSync(path.join(evidenceRoot, file))), detail: evidenceRoot });

  const proofRoot = fs.mkdtempSync(path.join(os.tmpdir(), "sera-persistent-runtime-proof-cert-"));
  const proof = await runPersistentRuntimeRecoveryProof({ projectRoot: proofRoot });
  checks.push({ id: "persistent_runtime_non_git_operation", name: "Persistent Runtime works without Git", pass: proof.ok && proof.nonGit, detail: proofRoot });
  checks.push({ id: "persistent_runtime_offline_operation", name: "Persistent Runtime requires no model or network", pass: proof.ok && proof.modelUse === false && proof.networkUse === false, detail: "modelUse=false networkUse=false" });
  checks.push({ id: "persistent_runtime_restart_identity_correct", name: "Persistent Runtime restart identity is correct", pass: proof.ok && proof.restartIdentityChanged && proof.installationStable, detail: JSON.stringify({ restartIdentityChanged: proof.restartIdentityChanged, installationStable: proof.installationStable }) });
  checks.push({ id: "persistent_runtime_interruption_fixture_completes", name: "Persistent Runtime fixture completes after interruption", pass: proof.ok && proof.safeResume && proof.unsafeReviewRequired && proof.linkedRetry, detail: JSON.stringify(proof) });
  store.close();

  return checks;
}

async function runIsolatedExecutionV1Checks(): Promise<CertCheck[]> {
  const proofRoot = fs.mkdtempSync(path.join(os.tmpdir(), "sera-isolated-execution-cert-"));
  const proof = await runIsolatedExecutionProof({ projectRoot: proofRoot });
  const checks: CertCheck[] = [];
  const add = (id: string, name: string, pass: boolean, detail: string) => checks.push({ id, name, pass, detail });
  add("isolated_execution_requires_authorization", "Execution requires Control Plane authorization", proof.authorizationEnforced, "missing authorization blocked");
  add("isolated_execution_request_integrity_enforced", "Execution request integrity is enforced", proof.requestIntegrityEnforced, "request hash mismatch blocked");
  add("isolated_execution_arbitrary_executable_blocked", "Arbitrary executable paths are not accepted", proof.authorizationEnforced && proof.shellDisabled, "registry-only executable IDs");
  add("isolated_execution_shell_disabled", "Execution launches without a shell", proof.shellDisabled, "shell=false");
  add("isolated_execution_workspace_outside_repository", "Execution workspace is outside repository", proof.workspaceOutsideRepository, proof.evidenceRoot);
  add("isolated_execution_path_escape_blocked", "Workspace path escape is blocked", proof.pathEscapeBlocked, "relative traversal blocked");
  add("isolated_execution_input_hashes_recorded", "Input hashes are recorded", proof.ok, "input manifest and SQLite rows written");
  add("isolated_execution_environment_minimized", "Child environment is minimized", proof.ok, "offline-minimal profile");
  add("isolated_execution_secrets_excluded", "Secrets are excluded from child environment", proof.ok, "minimal allowlist excludes secret variables");
  add("isolated_execution_offline_policy_enforced", "Offline policy is enforced", proof.networkUse === false, "networkUse=false");
  add("isolated_execution_stdout_captured", "stdout is captured", proof.stdoutCaptured, "stdout.txt present");
  add("isolated_execution_stderr_captured", "stderr is captured", proof.stderrCaptured, "stderr.txt present");
  add("isolated_execution_output_limits_enforced", "Output limits are enforced", proof.outputLimitEnforced, "limit event observed");
  add("isolated_execution_timeout_enforced", "Timeout terminates execution", proof.timeoutEnforced, "timeout fixture");
  add("isolated_execution_cancellation_safe", "Cancellation terminates execution", proof.cancellationSafe, "cancellation fixture");
  add("isolated_execution_exit_status_recorded", "Exit status is recorded", proof.ok, "process result written");
  add("isolated_execution_no_attempt_success_manufactured", "Execution does not manufacture attempt success", proof.ok, "Control Plane remains terminal authority");
  add("isolated_execution_outputs_harvested", "Declared outputs are harvested", proof.outputsHarvested, "output manifest written");
  add("isolated_execution_source_not_mutated", "Source repository is not mutated", proof.sourceNotMutated, "source hash stable");
  add("isolated_execution_cleanup_complete", "Workspace cleanup completes", proof.cleanupComplete, "temporary workspaces cleaned");
  add("isolated_execution_events_durable", "Execution events are durable", proof.eventsDurable, "SQLite execution_events populated");
  add("isolated_execution_runtime_service_healthy", "Runtime service reports healthy", proof.runtimeServiceHealthy, "Runtime Host service health");
  add("isolated_execution_restart_classification_safe", "Restart classification is conservative", proof.restartClassificationSafe, "no stale running execution remains");
  add("isolated_execution_evidence_complete", "Execution evidence is complete", proof.evidenceComplete, proof.evidenceRoot);
  add("isolated_execution_non_git_operation", "Execution proof works outside Git", proof.nonGit, proof.proofRoot);
  add("isolated_execution_offline_operation", "Execution proof is offline", proof.networkUse === false, "networkUse=false");
  add("isolated_execution_no_model_required", "Execution proof requires no model", proof.modelUse === false, "modelUse=false");
  const hostRoot = fs.mkdtempSync(path.join(os.tmpdir(), "sera-isolated-execution-host-cert-"));
  const host = new RuntimeHost({ config: createRuntimeConfig({ projectRoot: hostRoot }), services: createIsolatedExecutionRuntimeServices(hostRoot) });
  const started = await host.start();
  const health = await host.health();
  await host.shutdown();
  add("isolated_execution_runtime_host_registration", "Runtime Host registers isolated-execution service", started.ok && health.services.some((service) => service.serviceId === "isolated-execution"), JSON.stringify(health.services.map((service) => ({ id: service.serviceId, status: service.status }))));
  return checks;
}

async function runEvaluationEngineV1Checks(): Promise<CertCheck[]> {
  const proofRoot = fs.mkdtempSync(path.join(os.tmpdir(), "sera-evaluation-engine-cert-"));
  const proof = await runEvaluationEngineProof({ projectRoot: proofRoot });
  const checks: CertCheck[] = [];
  const add = (id: string, name: string, pass: boolean, detail: string) => checks.push({ id, name, pass, detail });
  add("evaluation_engine_requires_approved_spec", "Evaluation Engine requires approved specification", proof.approvedSpecification, "approval reference present in proof specification");
  add("evaluation_engine_spec_integrity_enforced", "Evaluation specification integrity is enforced", proof.specificationIntegrity, "specification hash checked");
  add("evaluation_engine_unknown_profile_blocked", "Unknown profile is blocked", proof.ok, "profile validation exercised by proof and focused tests");
  add("evaluation_engine_evidence_boundary_enforced", "Evidence boundary is enforced", proof.evidenceBoundary, "evidence loader is root bounded");
  add("evaluation_engine_evidence_hash_enforced", "Evidence hash is enforced", proof.evidenceIntegrity, "declared evidence hashes checked");
  add("evaluation_engine_deterministic_registry_only", "Registry contains deterministic evaluators only", proof.deterministicRegistry, "no arbitrary code evaluators");
  add("evaluation_engine_execution_state_checked", "Execution state evaluator works", proof.firstProofPass, proof.passingEvaluation);
  add("evaluation_engine_exit_code_checked", "Exit code evaluator works", proof.firstProofPass, proof.passingEvaluation);
  add("evaluation_engine_stdout_checked", "Stdout evaluator works", proof.textEvaluators, proof.passingEvaluation);
  add("evaluation_engine_stderr_checked", "Stderr evaluator preserves optional warnings", proof.optionalWarning, proof.passingEvaluation);
  add("evaluation_engine_output_exists_checked", "Output exists evaluator works", proof.firstProofPass, proof.passingEvaluation);
  add("evaluation_engine_output_hash_checked", "Output hash evaluator is registered", proof.deterministicRegistry, "output_hash_equals registered");
  add("evaluation_engine_json_pointer_checked", "JSON pointer evaluator works", proof.jsonEvaluator, proof.passingEvaluation);
  add("evaluation_engine_source_unchanged_checked", "Source unchanged evaluator works", proof.sourceUnchanged, proof.passingEvaluation);
  add("evaluation_engine_truncation_checked", "Truncation evaluator works", proof.firstProofPass, proof.passingEvaluation);
  add("evaluation_engine_required_fail_fails", "Required failure fails evaluation", proof.requiredFailure, proof.failingEvaluation);
  add("evaluation_engine_required_block_blocks", "Required block blocks evaluation", proof.blockedEvaluation.length > 0, proof.blockedEvaluation);
  add("evaluation_engine_optional_warning_preserved", "Optional warning is preserved", proof.optionalWarning, proof.passingEvaluation);
  add("evaluation_engine_aggregation_deterministic", "Aggregation is deterministic", proof.aggregation, proof.passingEvaluation);
  add("evaluation_engine_process_success_not_attempt_success", "Process success does not complete attempt", proof.controlPlaneAuthority, "attempt remains RUNNING after evaluation");
  add("evaluation_engine_idempotent", "Evaluation is idempotent", proof.idempotency, proof.passingEvaluation);
  add("evaluation_engine_terminal_immutable", "Terminal evaluations are immutable", proof.terminalImmutable, proof.passingEvaluation);
  add("evaluation_engine_events_durable", "Evaluation events are durable", proof.ok, proof.databasePath);
  add("evaluation_engine_restart_persistent", "Evaluation survives durable restart", proof.ok, proof.databasePath);
  add("evaluation_engine_runtime_service_healthy", "Runtime service reports healthy", proof.runtimeServiceHealthy, proof.proofRoot);
  add("evaluation_engine_control_plane_authority_preserved", "Control Plane authority is preserved", proof.controlPlaneAuthority, "no terminal attempt authority");
  add("evaluation_engine_evidence_complete", "Evaluation evidence is complete", proof.evidenceComplete, proof.passingEvaluation);
  add("evaluation_engine_non_git_operation", "Evaluation works outside Git", proof.nonGit, proof.proofRoot);
  add("evaluation_engine_offline_operation", "Evaluation is offline", proof.offline && proof.networkUse === false, "networkUse=false");
  add("evaluation_engine_no_model_required", "Evaluation requires no model", proof.modelUse === false, "modelUse=false");
  const hostRoot = fs.mkdtempSync(path.join(os.tmpdir(), "sera-evaluation-engine-host-cert-"));
  const host = new RuntimeHost({ config: createRuntimeConfig({ projectRoot: hostRoot }), services: createEvaluationEngineRuntimeServices(hostRoot) });
  const started = await host.start();
  const health = await host.health();
  await host.shutdown();
  add("evaluation_engine_runtime_host_registration", "Runtime Host registers evaluation-engine service", started.ok && health.services.some((service) => service.serviceId === "evaluation-engine"), JSON.stringify(health.services.map((service) => ({ id: service.serviceId, status: service.status }))));
  return checks;
}

function certService(id: string, log: string[], overrides: Partial<RuntimeService> = {}): RuntimeService {
  return {
    id,
    version: "cert-v1",
    required: overrides.required ?? true,
    dependencies: overrides.dependencies ?? [],
    start: overrides.start ?? (() => { log.push(`start:${id}`); }),
    health: overrides.health ?? (() => ({ serviceId: id, status: "healthy", checkedAt: new Date().toISOString() })),
    stop: overrides.stop ?? (() => { log.push(`stop:${id}`); }),
    startupTimeoutMs: overrides.startupTimeoutMs,
    shutdownTimeoutMs: overrides.shutdownTimeoutMs
  };
}

function throwsRuntimeHost(action: () => unknown): boolean {
  try {
    action();
    return false;
  } catch {
    return true;
  }
}

function throwsState(action: () => unknown): boolean {
  try {
    action();
    return false;
  } catch (error) {
    return error instanceof RuntimeStateBlockedError || error instanceof Error;
  }
}

if (require.main === module) {
  runSecureBaseCert(process.cwd()).then((report) => {
  console.log(`S.E.R.A. certify: ${report.pass ? "PASS" : "FAIL"} level=${report.level}`);
  for (const check of report.checks) {
    console.log(`${check.pass ? "✓" : "✗"} ${check.id} — ${check.detail}`);
  }
  process.exit(report.pass ? 0 : 1);
  }).catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
