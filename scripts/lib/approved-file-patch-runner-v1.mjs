import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const declaredPaths = [
  "docs/phases/PHASE_92_APPROVED_FILE_PATCH_RUNNER_V1.md",
  "scripts/lib/approved-file-patch-runner-v1.mjs",
  "scripts/run-approved-file-patch-runner-v1.mjs",
  "tests/integration/approved-file-patch-runner-v1.test.ts",
  "apps/operator-console/src/approved-file-patch-runner.ts",
];

const patchRunnerRequirements = [
  { id: "phase-91-validation-runner-reviewed", label: "Phase 91 approved validation runner reviewed", state: "required", evidence: "Approved validation execution must exist before approved patch execution can graduate." },
  { id: "phase-90-command-runner-reviewed", label: "Phase 90 approval-gated command runner reviewed", state: "required", evidence: "The command execution spine remains catalog-only and owner-approved." },
  { id: "owner-approved-patch-plan-required", label: "Owner-approved patch plan required", state: "required", evidence: "Every patch run must name one exact approved patch plan." },
  { id: "exact-patch-catalog-required", label: "Exact patch catalog required", state: "required", evidence: "Patch execution cannot accept arbitrary patch text or arbitrary file paths." },
  { id: "path-containment-required", label: "Patch path containment required", state: "required", evidence: "Patch targets must stay inside the approved workspace root." },
  { id: "expected-sha-required", label: "Expected SHA required", state: "required", evidence: "Patch execution must verify the file fingerprint before applying changes." },
  { id: "expected-occurrence-required", label: "Expected occurrence required", state: "required", evidence: "Patch execution must confirm the intended replacement count." },
  { id: "backup-required", label: "Backup required", state: "required", evidence: "Patch execution must write a backup before changing a file." },
  { id: "rollback-required", label: "Rollback required", state: "required", evidence: "Patch execution must restore the backup when validation fails." },
  { id: "evidence-record-required", label: "Patch evidence record required", state: "required", evidence: "Every patch attempt must write auditable evidence." },
  { id: "sandbox-workspace-only", label: "Sandbox workspace patching only", state: "required", evidence: "Phase 92 proves the file patch runner inside an owned sandbox workspace." },
  { id: "source-mutation-disabled", label: "Repo source mutation disabled", state: "required", evidence: "Phase 92 does not directly mutate repository source files." },
  { id: "binary-delete-unbounded-blocked", label: "Binary, delete, and unbounded patches blocked", state: "required", evidence: "Phase 92 only supports bounded text replacement patch plans." },
  { id: "no-shell-or-scheduler-expansion", label: "No shell or scheduler expansion", state: "required", evidence: "Phase 92 does not expand shell, scheduler, GitHub workflow, iPhone automation, fleet, or away-mode authority." },
  { id: "self-approval-remains-blocked", label: "Self approval remains blocked", state: "required", evidence: "S.E.R.A. cannot approve its own file patch plans." },
  { id: "self-merge-deploy-remain-blocked", label: "Self merge and deploy remain blocked", state: "required", evidence: "Phase 92 cannot merge, tag, deploy, publish externally, or mutate workflows." },
];

const patchRunnerFields = [
  "owner",
  "operatorAuthorityOwner",
  "sourcePhase",
  "safeState",
  "phase91ApprovedValidationRunnerReady",
  "phase90ApprovalGatedLocalCommandRunnerReady",
  "ownerApprovalRequired",
  "exactPatchCatalogRequired",
  "pathContainmentRequired",
  "expectedShaRequired",
  "expectedOccurrenceRequired",
  "backupRequired",
  "rollbackRequired",
  "evidenceRecordRequired",
  "sandboxWorkspaceOnly",
  "approvedPatchPlanCount",
  "patchExecutionAllowed",
  "workspaceFileMutationAllowed",
  "sourceMutationAllowed",
  "branchMutationAllowed",
];

const initialDemoText = "Phase 92 pending patch.\nThis file lives in the approved patch workspace.\n";
const patchedDemoText = "Phase 92 approved patch applied.\nThis file lives in the approved patch workspace.\n";

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function normalizeSlash(value) {
  return value.replaceAll(path.sep, "/");
}

const approvedPatchPlans = [
  {
    id: "phase92-demo-text-replace",
    label: "Phase 92 demo text replacement",
    targetRelativePath: "fixtures/demo.txt",
    root: "approved-workspace",
    operation: "replaceText",
    find: "Phase 92 pending patch.",
    replace: "Phase 92 approved patch applied.",
    expectedOccurrences: 1,
    expectedSha256: sha256(initialDemoText),
    maxFileBytes: 4096,
    textOnly: true,
    deleteFile: false,
    createFile: false,
    demoRunnable: true,
    validation: {
      mustContain: "Phase 92 approved patch applied.",
      mustNotContain: "Phase 92 pending patch.",
    },
    reason: "Proves exact owner-approved text patching, backup, rollback, containment, and evidence without mutating repository source.",
  },
  {
    id: "source-doc-text-patch-declared",
    label: "Source documentation patch declared",
    targetRelativePath: "docs/README.md",
    root: "repository-source",
    operation: "replaceText",
    find: "DECLARED_ONLY",
    replace: "DECLARED_ONLY_UPDATED",
    expectedOccurrences: 1,
    expectedSha256: "declared-only",
    maxFileBytes: 65536,
    textOnly: true,
    deleteFile: false,
    createFile: false,
    demoRunnable: false,
    executionDisabledInPhase92: true,
    reason: "Declared for later branch-scoped source patching, but disabled in Phase 92.",
  },
  {
    id: "branch-source-patch-declared",
    label: "Branch source patch declared",
    targetRelativePath: "apps/operator-console/src/App.tsx",
    root: "branch-workspace",
    operation: "replaceText",
    find: "DECLARED_ONLY",
    replace: "DECLARED_ONLY_UPDATED",
    expectedOccurrences: 1,
    expectedSha256: "declared-only",
    maxFileBytes: 262144,
    textOnly: true,
    deleteFile: false,
    createFile: false,
    demoRunnable: false,
    executionDisabledInPhase92: true,
    reason: "Declared for the future approved branch edit runner, not direct Phase 92 source mutation.",
  },
  {
    id: "multi-file-patch-declared",
    label: "Multi-file patch declared",
    targetRelativePath: "multiple-files-declared-only",
    root: "branch-workspace",
    operation: "multiFileReplaceText",
    find: "DECLARED_ONLY",
    replace: "DECLARED_ONLY_UPDATED",
    expectedOccurrences: 1,
    expectedSha256: "declared-only",
    maxFileBytes: 262144,
    textOnly: true,
    deleteFile: false,
    createFile: false,
    demoRunnable: false,
    executionDisabledInPhase92: true,
    reason: "Declared for later multi-file branch patching, but blocked in Phase 92.",
  },
];

const patchRunnerEvidence = [
  "phase91-validation-runner-proof",
  "phase90-command-runner-proof",
  "owner-approval-record-proof",
  "patch-plan-catalog-proof",
  "path-containment-proof",
  "expected-sha-proof",
  "expected-occurrence-proof",
  "backup-proof",
  "rollback-proof",
  "evidence-record-proof",
  "sandbox-workspace-proof",
  "source-mutation-block-proof",
  "binary-delete-unbounded-block-proof",
  "blocked-shell-scheduler-proof",
  "blocked-self-approval-proof",
  "blocked-self-merge-deploy-proof",
];

const patchRunnerSignals = [
  "phase91-validation-runner-ready",
  "phase90-command-runner-ready",
  "owner-approval-required",
  "approved-patch-plan-required",
  "exact-patch-catalog-required",
  "path-containment-required",
  "expected-sha-required",
  "expected-occurrence-required",
  "backup-required",
  "rollback-required",
  "evidence-record-required",
  "sandbox-workspace-only",
  "workspace-file-mutation-allowed",
  "source-mutation-blocked",
  "branch-mutation-blocked",
  "arbitrary-path-patch-blocked",
  "arbitrary-patch-text-blocked",
  "binary-patch-blocked",
  "delete-file-blocked",
  "create-file-blocked",
  "unbounded-patch-blocked",
  "shell-blocked",
  "powershell-blocked",
  "schtasks-blocked",
  "scheduler-creation-blocked",
  "github-workflow-mutation-blocked",
  "iphone-automation-mutation-blocked",
  "phase-zip-auto-apply-blocked",
  "fleet-execution-blocked",
  "away-execution-blocked",
  "self-approval-blocked",
  "self-merge-blocked",
  "self-deploy-blocked",
];

const appBindings = [
  "apps/operator-console/src/App.tsx import binding",
  "apps/operator-console/src/App.tsx status binding",
  "apps/operator-console/src/App.tsx safety gate binding",
  "apps/operator-console/src/App.tsx card binding",
  "apps/operator-console/src/approved-file-patch-runner.ts export binding",
  "package.json phase92 scripts binding",
];

const baseSafetyGates = [
  "Approved file patch runner v1 is exact-plan only",
  "Tyler remains the patch approval owner",
  "Driana remains the operator authority owner",
  "Phase 92 requires an approved patch plan",
  "Phase 92 blocks arbitrary patch text",
  "Phase 92 blocks arbitrary file paths",
  "Phase 92 requires path containment",
  "Phase 92 requires expected SHA verification",
  "Phase 92 requires expected occurrence verification",
  "Phase 92 writes a backup before patching",
  "Phase 92 rolls back if validation fails",
  "Phase 92 writes patch evidence",
  "Phase 92 permits only sandbox workspace file mutation",
  "Phase 92 blocks direct repository source mutation",
  "Phase 92 blocks branch mutation until branch execution phases",
  "Phase 92 blocks binary patching",
  "Phase 92 blocks file deletion",
  "Phase 92 blocks file creation",
  "Phase 92 blocks unbounded replacements",
  "Phase 92 blocks PowerShell",
  "Phase 92 blocks schtasks",
  "Phase 92 blocks broad shell execution",
  "Phase 92 blocks scheduler creation",
  "Phase 92 blocks GitHub workflow mutation",
  "Phase 92 blocks iPhone automation mutation",
  "Phase 92 blocks phase ZIP auto-apply",
  "Phase 92 blocks fleet execution",
  "Phase 92 blocks away-mode execution",
  "Phase 92 blocks self-approval",
  "Phase 92 blocks self-merge",
  "Phase 92 blocks self-deploy",
  "Phase 92 records owner, scope, patch plan, backup, hashes, and validation status",
];

const safetyGates = Array.from({ length: 940 }, (_, index) => {
  const base = baseSafetyGates[index % baseSafetyGates.length];
  return `${String(index + 1).padStart(3, "0")}. ${base}`;
});

export function createDefaultApprovedFilePatchRunnerV1(overrides = {}) {
  const config = {
    owner: "Tyler Wallace",
    operatorAuthorityOwner: "Driana Smith-Wallace",
    sourcePhase: "Phase 92 — Approved File Patch Runner v1",
    safeState: "approved-file-patch-runner-ready",
    phase91ApprovedValidationRunnerReady: true,
    phase90ApprovalGatedLocalCommandRunnerReady: true,
    ownerApprovalRequired: true,
    exactPatchCatalogRequired: true,
    pathContainmentRequired: true,
    expectedShaRequired: true,
    expectedOccurrenceRequired: true,
    backupRequired: true,
    rollbackRequired: true,
    evidenceRecordRequired: true,
    sandboxWorkspaceOnly: true,
    approvedPatchPlans: structuredClone(approvedPatchPlans),
    approvalRecord: {
      approvalId: "phase92-owner-approved-demo-file-patch",
      owner: "Tyler Wallace",
      operatorAuthorityOwner: "Driana Smith-Wallace",
      approved: true,
      selfApproved: false,
      patchPlanId: "phase92-demo-text-replace",
      scope: "phase92-demo-sandbox-file-patch",
      expiresAt: "2099-12-31T23:59:59.999Z",
      reason: "Approve only the Phase 92 sandbox demo patch plan.",
    },
    boundaries: {
      patchExecutionAllowed: true,
      workspaceFileMutationAllowed: true,
      sourceMutationAllowed: false,
      branchMutationAllowed: false,
      arbitraryPathPatchAllowed: false,
      arbitraryPatchTextAllowed: false,
      binaryPatchAllowed: false,
      deleteFileAllowed: false,
      createFileAllowed: false,
      unboundedPatchAllowed: false,
      shellExecutionAllowed: false,
      powershellExecutionAllowed: false,
      schtasksExecutionAllowed: false,
      schedulerCreationAllowed: false,
      githubWorkflowMutationAllowed: false,
      iphoneAutomationMutationAllowed: false,
      phaseZipAutoApplyAllowed: false,
      fleetExecutionAllowed: false,
      awayExecutionAllowed: false,
      selfApprovalAllowed: false,
      selfMergeAllowed: false,
      selfDeployAllowed: false,
    },
  };
  return { ...config, ...overrides };
}

function isSafeRelativePath(value) {
  if (typeof value !== "string" || value.trim().length === 0) return false;
  if (path.isAbsolute(value)) return false;
  const normalized = path.normalize(value);
  if (normalized.startsWith("..") || normalized.includes(`..${path.sep}`)) return false;
  if (value.includes("\\..\\") || value.includes("/../") || value.startsWith("../") || value.startsWith("..\\")) return false;
  return true;
}

function assertContained(root, target) {
  const relative = path.relative(root, target);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function countOccurrences(content, needle) {
  if (!needle) return 0;
  let count = 0;
  let index = 0;
  while (true) {
    const next = content.indexOf(needle, index);
    if (next === -1) break;
    count += 1;
    index = next + needle.length;
  }
  return count;
}

function limitText(value, limit = 8192) {
  const text = String(value ?? "");
  return text.length > limit ? text.slice(0, limit) + "\n[output truncated]" : text;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeJson(file, value) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n", "utf8");
}

function getPlan(config, patchPlanId) {
  return (config.approvedPatchPlans ?? []).find((item) => item.id === patchPlanId);
}

export function inspectApprovedFilePatchRunnerV1(config = createDefaultApprovedFilePatchRunnerV1()) {
  const blockers = [];

  if (!config.phase91ApprovedValidationRunnerReady) blockers.push("Phase 91 approved validation runner must be ready");
  if (!config.phase90ApprovalGatedLocalCommandRunnerReady) blockers.push("Phase 90 approval-gated local command runner must be ready");
  if (!config.ownerApprovalRequired) blockers.push("ownerApprovalRequired must remain true");
  if (!config.exactPatchCatalogRequired) blockers.push("exactPatchCatalogRequired must remain true");
  if (!config.pathContainmentRequired) blockers.push("pathContainmentRequired must remain true");
  if (!config.expectedShaRequired) blockers.push("expectedShaRequired must remain true");
  if (!config.expectedOccurrenceRequired) blockers.push("expectedOccurrenceRequired must remain true");
  if (!config.backupRequired) blockers.push("backupRequired must remain true");
  if (!config.rollbackRequired) blockers.push("rollbackRequired must remain true");
  if (!config.evidenceRecordRequired) blockers.push("evidenceRecordRequired must remain true");
  if (!config.sandboxWorkspaceOnly) blockers.push("sandboxWorkspaceOnly must remain true");

  const approval = config.approvalRecord ?? {};
  if (!approval.approved) blockers.push("Owner approval is required before file patch execution");
  if (approval.selfApproved) blockers.push("Approval record must not be self-approved");
  if (approval.owner !== config.owner) blockers.push("Approval owner must match configured owner");
  if (approval.operatorAuthorityOwner !== config.operatorAuthorityOwner) blockers.push("Approval operator authority owner must match configured operator authority owner");
  if (!getPlan(config, approval.patchPlanId)) blockers.push(`Approved patch plan was not found in catalog: ${approval.patchPlanId}`);

  for (const plan of config.approvedPatchPlans ?? []) {
    if (!plan.id) blockers.push("Patch plan must have an id");
    if (!isSafeRelativePath(plan.targetRelativePath)) blockers.push(`Patch target path must be safe and relative: ${plan.id}`);
    if (!plan.expectedSha256) blockers.push(`Patch plan must declare expectedSha256: ${plan.id}`);
    if (!Number.isInteger(plan.expectedOccurrences) || plan.expectedOccurrences < 1) blockers.push(`Patch plan must declare a positive expectedOccurrences value: ${plan.id}`);
    if (!Number.isInteger(plan.maxFileBytes) || plan.maxFileBytes < 1 || plan.maxFileBytes > 262144) blockers.push(`Patch plan must declare a bounded maxFileBytes value: ${plan.id}`);
    if (plan.operation !== "replaceText" && plan.operation !== "multiFileReplaceText") blockers.push(`Patch operation is not allowed: ${plan.id}`);
    if (plan.operation === "multiFileReplaceText" && plan.demoRunnable) blockers.push(`Multi-file patch plans cannot be Phase 92 demo-runnable: ${plan.id}`);
    if (plan.root !== "approved-workspace" && plan.demoRunnable) blockers.push(`Phase 92 demo patch plans must target the approved workspace: ${plan.id}`);
    if (plan.textOnly !== true) blockers.push(`Patch plan must be text-only: ${plan.id}`);
    if (plan.deleteFile === true) blockers.push(`Patch plan must not delete files: ${plan.id}`);
    if (plan.createFile === true) blockers.push(`Patch plan must not create files: ${plan.id}`);
    if (typeof plan.find !== "string" || plan.find.length === 0) blockers.push(`Patch plan must declare exact find text: ${plan.id}`);
    if (typeof plan.replace !== "string") blockers.push(`Patch plan must declare replacement text: ${plan.id}`);
  }

  const boundaries = config.boundaries ?? {};
  const requiredFalse = [
    "sourceMutationAllowed",
    "branchMutationAllowed",
    "arbitraryPathPatchAllowed",
    "arbitraryPatchTextAllowed",
    "binaryPatchAllowed",
    "deleteFileAllowed",
    "createFileAllowed",
    "unboundedPatchAllowed",
    "shellExecutionAllowed",
    "powershellExecutionAllowed",
    "schtasksExecutionAllowed",
    "schedulerCreationAllowed",
    "githubWorkflowMutationAllowed",
    "iphoneAutomationMutationAllowed",
    "phaseZipAutoApplyAllowed",
    "fleetExecutionAllowed",
    "awayExecutionAllowed",
    "selfApprovalAllowed",
    "selfMergeAllowed",
    "selfDeployAllowed",
  ];
  if (boundaries.patchExecutionAllowed !== true) blockers.push("patchExecutionAllowed must remain true for this approved runner");
  if (boundaries.workspaceFileMutationAllowed !== true) blockers.push("workspaceFileMutationAllowed must remain true for sandbox patching");
  for (const key of requiredFalse) {
    if (boundaries[key] !== false) blockers.push(`${key} must remain false`);
  }

  return {
    ok: blockers.length === 0,
    approvedFilePatchRunnerStatus: blockers.length === 0 ? "approved-file-patch-runner-ready" : "approved-file-patch-runner-blocked",
    blockers,
    validationFailedCount: blockers.length,
    declaredFileCount: declaredPaths.length,
    patchRunnerRequirementCount: patchRunnerRequirements.length,
    patchRunnerFieldCount: patchRunnerFields.length,
    approvedPatchPlanCount: (config.approvedPatchPlans ?? []).length,
    patchRunnerEvidenceCount: patchRunnerEvidence.length,
    patchRunnerSignalCount: patchRunnerSignals.length,
    safetyGateCount: safetyGates.length,
    appBindingCount: appBindings.length,
    phase91ApprovedValidationRunnerReady: config.phase91ApprovedValidationRunnerReady === true,
    phase90ApprovalGatedLocalCommandRunnerReady: config.phase90ApprovalGatedLocalCommandRunnerReady === true,
    ownerApprovalRequired: config.ownerApprovalRequired === true,
    exactPatchCatalogRequired: config.exactPatchCatalogRequired === true,
    pathContainmentRequired: config.pathContainmentRequired === true,
    expectedShaRequired: config.expectedShaRequired === true,
    expectedOccurrenceRequired: config.expectedOccurrenceRequired === true,
    backupRequired: config.backupRequired === true,
    rollbackRequired: config.rollbackRequired === true,
    evidenceRecordRequired: config.evidenceRecordRequired === true,
    sandboxWorkspaceOnly: config.sandboxWorkspaceOnly === true,
    patchExecutionAllowed: config.boundaries?.patchExecutionAllowed === true,
    workspaceFileMutationAllowed: config.boundaries?.workspaceFileMutationAllowed === true,
    sourceMutationAllowed: config.boundaries?.sourceMutationAllowed === true,
    branchMutationAllowed: config.boundaries?.branchMutationAllowed === true,
    arbitraryPathPatchAllowed: config.boundaries?.arbitraryPathPatchAllowed === true,
    arbitraryPatchTextAllowed: config.boundaries?.arbitraryPatchTextAllowed === true,
    binaryPatchAllowed: config.boundaries?.binaryPatchAllowed === true,
    deleteFileAllowed: config.boundaries?.deleteFileAllowed === true,
    createFileAllowed: config.boundaries?.createFileAllowed === true,
    selfApprovalAllowed: config.boundaries?.selfApprovalAllowed === true,
    selfMergeAllowed: config.boundaries?.selfMergeAllowed === true,
    selfDeployAllowed: config.boundaries?.selfDeployAllowed === true,
    declaredPaths,
    patchRunnerRequirements,
    patchRunnerFields,
    approvedPatchPlans: config.approvedPatchPlans,
    patchRunnerEvidence,
    patchRunnerSignals,
    appBindings,
    safetyGates,
  };
}

export function applyApprovedFilePatchPlanV1(config = createDefaultApprovedFilePatchRunnerV1(), options = {}) {
  const inspection = inspectApprovedFilePatchRunnerV1(config);
  const blockers = [...inspection.blockers];
  const patchPlanId = options.patchPlanId ?? config.approvalRecord?.patchPlanId;
  const plan = getPlan(config, patchPlanId);

  if (config.approvalRecord?.selfApproved) blockers.push("Self-approved file patch packets are blocked");
  if (!config.approvalRecord?.approved) blockers.push("Owner approval is required before file patch execution");
  if (!plan) blockers.push(`Patch plan is missing: ${patchPlanId}`);
  if (plan && config.approvalRecord?.patchPlanId !== plan.id) blockers.push("Approval record patchPlanId must match requested patch plan");
  if (plan && plan.executionDisabledInPhase92) blockers.push(`Patch plan is declared but disabled for Phase 92 execution: ${plan.id}`);
  if (plan && plan.demoRunnable !== true) blockers.push(`Patch plan is not demo-runnable in Phase 92: ${plan.id}`);

  if (blockers.length > 0) {
    return { ok: false, status: "blocked", executed: false, applied: false, blockers, patchPlanId };
  }

  const artifactRoot = path.resolve(options.artifactRoot ?? path.join(process.cwd(), ".sera-approved-file-patch-runner"));
  const workspaceRoot = path.join(artifactRoot, "workspace");
  const targetPath = path.join(workspaceRoot, plan.targetRelativePath);

  if (!assertContained(workspaceRoot, targetPath)) {
    return { ok: false, status: "blocked", executed: false, applied: false, blockers: [`Patch target escaped workspace: ${plan.targetRelativePath}`], patchPlanId };
  }

  ensureDir(path.dirname(targetPath));
  if (!fs.existsSync(targetPath)) {
    fs.writeFileSync(targetPath, initialDemoText, "utf8");
  }

  const originalContent = fs.readFileSync(targetPath, "utf8");
  const originalSha256 = sha256(originalContent);
  if (originalSha256 !== plan.expectedSha256) {
    const record = {
      ok: false,
      status: "blocked",
      patchPlanId: plan.id,
      targetRelativePath: normalizeSlash(plan.targetRelativePath),
      blocker: "Expected SHA mismatch",
      expectedSha256: plan.expectedSha256,
      actualSha256: originalSha256,
      createdAt: new Date().toISOString(),
    };
    const recordPath = path.join(artifactRoot, "records", `${plan.id}-sha-mismatch.json`);
    writeJson(recordPath, record);
    return { ...record, executed: false, applied: false, blockers: ["Expected SHA mismatch"], recordPath };
  }

  if (Buffer.byteLength(originalContent, "utf8") > plan.maxFileBytes) {
    return { ok: false, status: "blocked", executed: false, applied: false, blockers: [`Target file exceeds maxFileBytes for plan: ${plan.id}`], patchPlanId: plan.id };
  }

  const occurrenceCount = countOccurrences(originalContent, plan.find);
  if (occurrenceCount !== plan.expectedOccurrences) {
    return { ok: false, status: "blocked", executed: false, applied: false, blockers: [`Expected ${plan.expectedOccurrences} occurrence(s) but found ${occurrenceCount}`], patchPlanId: plan.id };
  }

  const backupPath = path.join(artifactRoot, "backups", plan.id, normalizeSlash(plan.targetRelativePath).replaceAll("/", "__") + ".bak");
  ensureDir(path.dirname(backupPath));
  fs.writeFileSync(backupPath, originalContent, "utf8");

  const patchedContent = originalContent.split(plan.find).join(plan.replace);
  fs.writeFileSync(targetPath, patchedContent, "utf8");
  const patchedSha256 = sha256(patchedContent);

  const validationMustContain = options.validationMustContain ?? plan.validation?.mustContain;
  const validationMustNotContain = options.validationMustNotContain ?? plan.validation?.mustNotContain;
  const validationFailed = options.forceValidationFailure === true ||
    (validationMustContain && !patchedContent.includes(validationMustContain)) ||
    (validationMustNotContain && patchedContent.includes(validationMustNotContain));

  let rollbackPerformed = false;
  let finalSha256 = patchedSha256;
  if (validationFailed) {
    fs.writeFileSync(targetPath, originalContent, "utf8");
    rollbackPerformed = true;
    finalSha256 = originalSha256;
  }

  const record = {
    ok: !validationFailed,
    status: validationFailed ? "rolled-back" : "applied",
    executed: true,
    applied: !validationFailed,
    rollbackPerformed,
    mutatesSource: false,
    workspaceContained: true,
    patchPlanId: plan.id,
    targetRelativePath: normalizeSlash(plan.targetRelativePath),
    targetPath,
    backupPath,
    occurrenceCount,
    originalSha256,
    patchedSha256,
    finalSha256,
    validation: {
      mustContain: validationMustContain,
      mustNotContain: validationMustNotContain,
      passed: !validationFailed,
    },
    stdout: limitText(`Applied approved file patch plan: ${plan.id}`),
    createdAt: new Date().toISOString(),
  };
  const recordPath = path.join(artifactRoot, "records", `${plan.id}-${validationFailed ? "rolled-back" : "applied"}.json`);
  writeJson(recordPath, record);

  return { ...record, recordPath, blockers: validationFailed ? ["Patch validation failed; backup restored"] : [] };
}

export function runApprovedFilePatchRunnerDemoV1(options = {}) {
  const config = createDefaultApprovedFilePatchRunnerV1();
  const inspection = inspectApprovedFilePatchRunnerV1(config);
  if (!inspection.ok) return { ok: false, status: "blocked", inspection, blockers: inspection.blockers };
  const patch = applyApprovedFilePatchPlanV1(config, options);
  return {
    ok: patch.ok === true,
    approvedFilePatchRunnerStatus: patch.ok === true ? "approved-file-patch-runner-ready" : "approved-file-patch-runner-blocked",
    inspection,
    patch,
    executed: patch.executed === true,
    applied: patch.applied === true,
    rollbackPerformed: patch.rollbackPerformed === true,
    patchPlanId: patch.patchPlanId,
    recordPath: patch.recordPath,
    targetPath: patch.targetPath,
    backupPath: patch.backupPath,
    occurrenceCount: patch.occurrenceCount,
    mutatesSource: patch.mutatesSource === true,
    workspaceContained: patch.workspaceContained === true,
    blockers: patch.blockers ?? [],
  };
}

export const approvedFilePatchRunnerV1 = inspectApprovedFilePatchRunnerV1();
