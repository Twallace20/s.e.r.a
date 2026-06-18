import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { SeraKernel } from "@sera/kernel";
import { MemoryStore } from "@sera/memory";

export interface CertCheck {
  id: string;
  name: string;
  pass: boolean;
  detail: string;
}

export interface CertReport {
  createdAt: string;
  level: "none" | "secure-base" | "developer-worker-v1" | "developer-worker-v2" | "self-improvement-v1" | "task-memory-v1" | "lesson-review-v1";
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

  const secureChecksPass = checks.filter((c) => !c.id.startsWith("developer_") && !c.id.startsWith("self_improvement_") && !c.id.startsWith("memory_") && !c.id.startsWith("lesson_review_")).every((c) => c.pass);
  const developerV1ChecksPass = checks.filter((c) => c.id.startsWith("developer_") && !c.id.startsWith("developer_v2_")).every((c) => c.pass);
  const developerV2ChecksPass = checks.filter((c) => c.id.startsWith("developer_v2_")).every((c) => c.pass);
  const selfImprovementV1ChecksPass = checks.filter((c) => c.id.startsWith("self_improvement_")).every((c) => c.pass);
  const memoryV1ChecksPass = checks.filter((c) => c.id.startsWith("memory_")).every((c) => c.pass);
  const lessonReviewV1ChecksPass = checks.filter((c) => c.id.startsWith("lesson_review_")).every((c) => c.pass);
  const pass = checks.every((c) => c.pass);
  const level = pass && lessonReviewV1ChecksPass
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

if (require.main === module) {
  const report = runSecureBaseCert(process.cwd());
  console.log(`S.E.R.A. certify: ${report.pass ? "PASS" : "FAIL"} level=${report.level}`);
  for (const check of report.checks) {
    console.log(`${check.pass ? "✓" : "✗"} ${check.id} — ${check.detail}`);
  }
  process.exit(report.pass ? 0 : 1);
}
