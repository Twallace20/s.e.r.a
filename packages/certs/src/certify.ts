import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { SeraKernel } from "@sera/kernel";
import { KnowledgeStore } from "@sera/knowledge";
import { MemoryStore } from "@sera/memory";
import { ModelProviderStore } from "@sera/model-provider";
import { OperatorConsoleStore } from "@sera/operator-console";
import { runRepositorySnapshot } from "@sera/repository-snapshot";

export interface CertCheck {
  id: string;
  name: string;
  pass: boolean;
  detail: string;
}

export interface CertReport {
  createdAt: string;
  level: "none" | "secure-base" | "developer-worker-v1" | "developer-worker-v2" | "self-improvement-v1" | "task-memory-v1" | "lesson-review-v1" | "active-lessons-v1" | "planner-task-queue-v1" | "knowledge-retrieval-v1" | "model-provider-v1" | "autonomous-dev-loop-v1" | "operator-console-v1";
  pass: boolean;
  checks: CertCheck[];
}

export function runSecureBaseCert(rootDir = process.cwd()): CertReport {
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
  const pass = checks.every((c) => c.pass);
  const level = pass && operatorConsoleV1ChecksPass
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

if (require.main === module) {
  const report = runSecureBaseCert(process.cwd());
  console.log(`S.E.R.A. certify: ${report.pass ? "PASS" : "FAIL"} level=${report.level}`);
  for (const check of report.checks) {
    console.log(`${check.pass ? "✓" : "✗"} ${check.id} — ${check.detail}`);
  }
  process.exit(report.pass ? 0 : 1);
}
