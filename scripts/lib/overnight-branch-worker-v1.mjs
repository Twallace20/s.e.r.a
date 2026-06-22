import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const RUNTIME_DIR = ".sera-overnight-branch-worker";
const REPORT_DIR = "reports";
const EVENTS_FILE = "events.jsonl";
const SUMMARY_JSON = "overnight-branch-worker-summary.json";
const SUMMARY_MD = "overnight-branch-worker-summary.md";
const HISTORY_JSONL = "overnight-branch-worker-history.jsonl";

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function nowIso() {
  return new Date().toISOString();
}

function sha256(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function writeJson(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function appendJsonl(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.appendFileSync(filePath, `${JSON.stringify(value)}\n`, "utf8");
}

function writeText(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, value, "utf8");
}

function normalizePath(value) {
  return String(value || "").replaceAll("\\", "/");
}

function isSafeRelativePath(value) {
  const normalized = normalizePath(value);
  return Boolean(normalized)
    && !path.isAbsolute(normalized)
    && !normalized.startsWith("../")
    && !normalized.includes("/../")
    && !normalized.startsWith(".git/")
    && !normalized.includes("/.git/");
}

function uniqueStrings(values) {
  return Array.from(new Set((values || []).filter((value) => typeof value === "string" && value.trim())));
}

function makeCheck(id, passed, message, severity = "blocker") {
  return {
    id,
    passed: Boolean(passed),
    severity,
    message,
  };
}

function normalizeWorkerStep(step) {
  if (typeof step === "string") {
    return {
      id: step.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      label: step,
      required: true,
      ownerReviewRequired: true,
      commandExecutionAllowed: false,
      sourceMutationAllowed: false,
      remoteExecutionAllowed: false,
      branchMutationAllowed: false,
      storesSecrets: false,
      evidenceRequired: true,
      redactionRequired: true,
    };
  }

  const label = String(step?.label || step?.id || "");
  return {
    id: String(step?.id || label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")),
    label,
    category: String(step?.category || "overnight-worker-stage"),
    required: step?.required === true,
    ownerReviewRequired: step?.ownerReviewRequired === true,
    commandExecutionAllowed: step?.commandExecutionAllowed === true,
    sourceMutationAllowed: step?.sourceMutationAllowed === true,
    remoteExecutionAllowed: step?.remoteExecutionAllowed === true,
    branchMutationAllowed: step?.branchMutationAllowed === true,
    storesSecrets: step?.storesSecrets === true,
    evidenceRequired: step?.evidenceRequired !== false,
    redactionRequired: step?.redactionRequired !== false,
  };
}

function workerStepIsSafe(step) {
  const reasons = [];
  if (!step.id) reasons.push("worker step id is required");
  if (!step.label) reasons.push("worker step label is required");
  if (step.required !== true) reasons.push("worker step must be required");
  if (step.ownerReviewRequired !== true) reasons.push("owner review must be required for worker step");
  if (step.commandExecutionAllowed !== false) reasons.push("worker step must not allow command execution");
  if (step.sourceMutationAllowed !== false) reasons.push("worker step must not allow source mutation");
  if (step.remoteExecutionAllowed !== false) reasons.push("worker step must not allow remote execution");
  if (step.branchMutationAllowed !== false) reasons.push("worker step must not allow branch mutation");
  if (step.storesSecrets !== false) reasons.push("worker step must not store secrets");
  if (step.evidenceRequired !== true) reasons.push("worker step must require evidence capture");
  if (step.redactionRequired !== true) reasons.push("worker step must require redaction review");
  return {
    allowed: reasons.length === 0,
    reasons,
  };
}

export function createDefaultOvernightBranchWorkerV1() {
  const workerSteps = [
    ["owner-approval-intake", "Owner approval intake"],
    ["clean-main-preflight", "Clean main preflight"],
    ["phase-packet-ingestion", "Phase packet ingestion"],
    ["branch-proposal-ingestion", "Branch proposal ingestion"],
    ["branch-readiness-confirmation", "Branch readiness confirmation"],
    ["remote-runner-blueprint-binding", "Remote runner blueprint binding"],
    ["owner-approval-queue-binding", "Owner approval queue binding"],
    ["self-hosted-adapter-binding", "Self-hosted adapter binding"],
    ["command-allowlist-binding", "Command allowlist binding"],
    ["evidence-bundle-binding", "Evidence capture bundle binding"],
    ["dry-run-validation-sequence-plan", "Dry-run validation sequence plan"],
    ["worker-artifact-plan", "Worker artifact plan"],
    ["emergency-stop-readiness", "Emergency stop readiness"],
    ["session-lock-readiness", "Session lock readiness"],
    ["owner-review-handoff", "Owner review handoff"],
  ].map(([id, label]) => ({
    id,
    label,
    category: "overnight-worker-stage",
    required: true,
    ownerReviewRequired: true,
    commandExecutionAllowed: false,
    sourceMutationAllowed: false,
    remoteExecutionAllowed: false,
    branchMutationAllowed: false,
    storesSecrets: false,
    evidenceRequired: true,
    redactionRequired: true,
  }));

  return {
    schemaVersion: 1,
    workerId: "phase40_overnight_branch_worker_plan",
    phaseId: "phase-40-overnight-branch-worker-v1",
    phaseNumber: 40,
    title: "Overnight Branch Worker v1",
    branchName: "phase-40-overnight-branch-worker-v1",
    sourcePhaseIds: [
      "phase-32-phase-packet-generator-v1",
      "phase-33-branch-proposal-builder-v1",
      "phase-34-branch-readiness-inspector-v1",
      "phase-35-remote-phase-runner-blueprint-v1",
      "phase-36-owner-approval-queue-v1",
      "phase-37-self-hosted-runner-adapter-v1",
      "phase-38-command-allowlist-gate-v1",
      "phase-39-evidence-capture-bundle-v1",
    ],
    declaredPaths: [
      "docs/phases/PHASE_40_OVERNIGHT_BRANCH_WORKER_V1.md",
      "scripts/lib/overnight-branch-worker-v1.mjs",
      "scripts/run-overnight-branch-worker-v1.mjs",
      "tests/integration/overnight-branch-worker-v1.test.ts",
    ],
    declaredFileStates: {
      "docs/phases/PHASE_40_OVERNIGHT_BRANCH_WORKER_V1.md": "new",
      "scripts/lib/overnight-branch-worker-v1.mjs": "new",
      "scripts/run-overnight-branch-worker-v1.mjs": "new",
      "tests/integration/overnight-branch-worker-v1.test.ts": "new",
    },
    validationCommands: [
      "npm run phase40:demo",
      "npm run phase40:verify",
      "npm run hygiene",
      "npm run build",
      "npm test",
      "npm run certify",
      "npm run verify",
    ],
    workerSteps,
    evidenceRequirements: [
      "phase40 demo output includes overnight worker status",
      "phase40 verify output passes free-core and knowledge checks",
      "source hygiene passes",
      "runtime artifact hygiene passes",
      "TypeScript build passes",
      "Vitest suite passes",
      "certification passes",
      "full verify passes",
      "overnight worker JSON report is written",
      "overnight worker Markdown report is written",
      "overnight worker history is appended",
      "phase packet lineage is captured",
      "branch proposal lineage is captured",
      "branch readiness linkage is captured",
      "owner approval queue linkage is captured",
      "command allowlist linkage is captured",
      "evidence capture bundle linkage is captured",
      "emergency stop and session lock requirements are captured",
    ],
    riskChecks: [
      "overnight branch worker remains local-only",
      "overnight branch worker remains worker-only",
      "overnight branch worker remains dry-run-only",
      "overnight branch worker does not activate overnight execution",
      "overnight branch worker does not execute commands",
      "overnight branch worker does not activate runner connectivity",
      "overnight branch worker does not use cloud runners",
      "overnight branch worker does not use self-hosted runners",
      "overnight branch worker does not require secrets",
      "overnight branch worker does not mutate source",
      "overnight branch worker does not create branches",
      "overnight branch worker does not switch branches",
      "overnight branch worker does not push branches",
      "overnight branch worker does not open pull requests",
      "overnight branch worker does not apply patches",
      "overnight branch worker does not merge branches",
      "overnight branch worker does not tag releases",
      "overnight branch worker does not delete branches",
      "overnight branch worker does not record owner decisions",
      "overnight branch worker does not self-approve",
    ],
    ownerApprovalGates: [
      "owner approval required for overnight worker activation",
      "owner approval required for phase packet selection",
      "owner approval required for branch proposal selection",
      "owner approval required for branch readiness acceptance",
      "owner approval required for command sequence acceptance",
      "owner approval required for evidence bundle acceptance",
      "owner approval required for owner review handoff",
      "owner approval required for emergency stop release",
    ],
    localOnly: true,
    workerOnly: true,
    overnightBranchWorkerOnly: true,
    dryRunOnly: true,
    planningOnly: true,
    overnightExecutionAllowed: false,
    workerActivationAllowed: false,
    commandExecutionAllowed: false,
    arbitraryCommandExecutionAllowed: false,
    shellExpansionAllowed: false,
    shellChainingAllowed: false,
    remoteExecutionAllowed: false,
    executionAllowedAfterApproval: false,
    adapterEnabled: false,
    adapterActivationAllowed: false,
    runnerConnectivityAllowed: false,
    cloudRequired: false,
    paidProviderRequired: false,
    freeCoreDependency: false,
    requiresSecrets: false,
    usesCloudRunner: false,
    usesSelfHostedRunner: false,
    selfHostedRunnerActivated: false,
    mutatesSource: false,
    executesArbitraryCode: false,
    executesRemoteCommands: false,
    performsNetworkRefresh: false,
    createsBranches: false,
    switchesBranches: false,
    pushesBranches: false,
    opensPullRequests: false,
    appliesPatches: false,
    mergesBranches: false,
    tagsReleases: false,
    deletesBranches: false,
    recordsOwnerDecision: false,
    acceptsEvidenceAsOwnerApproved: false,
    selfApprovesPlan: false,
    selfApprovalAllowed: false,
    ownerDecisionRequired: true,
    emergencyStopRequired: true,
    sessionLockRequired: true,
    approvalQueueBindingRequired: true,
    commandAllowlistRequired: true,
    evidenceCaptureRequired: true,
    evidenceBundleBindingRequired: true,
    branchReadinessRequired: true,
    branchProposalRequired: true,
    phasePacketRequired: true,
    ownerApprovalRequiredForOvernightWorkerActivation: true,
    ownerApprovalRequiredForPhasePacketSelection: true,
    ownerApprovalRequiredForBranchProposalSelection: true,
    ownerApprovalRequiredForBranchReadinessAcceptance: true,
    ownerApprovalRequiredForCommandSequenceAcceptance: true,
    ownerApprovalRequiredForEvidenceBundleAcceptance: true,
    ownerApprovalRequiredForOwnerReviewHandoff: true,
    ownerApprovalRequiredForEmergencyStopRelease: true,
    proposalActivationAllowed: false,
  };
}

export function inspectOvernightBranchWorkerV1(worker = createDefaultOvernightBranchWorkerV1(), options = {}) {
  const rootDir = options.rootDir || process.cwd();
  const runtimeDir = path.join(rootDir, RUNTIME_DIR);
  const reportDir = path.join(runtimeDir, REPORT_DIR);
  const eventPath = path.join(runtimeDir, EVENTS_FILE);
  const jsonPath = path.join(reportDir, SUMMARY_JSON);
  const markdownPath = path.join(reportDir, SUMMARY_MD);
  const historyPath = path.join(reportDir, HISTORY_JSONL);

  ensureDir(reportDir);

  const declaredPaths = uniqueStrings(worker.declaredPaths);
  const validationCommands = uniqueStrings(worker.validationCommands);
  const workerSteps = (worker.workerSteps || []).map(normalizeWorkerStep);
  const stepDecisions = workerSteps.map((step) => ({
    ...step,
    decision: workerStepIsSafe(step),
  }));
  const evidenceRequirements = uniqueStrings(worker.evidenceRequirements);
  const riskChecks = uniqueStrings(worker.riskChecks);
  const ownerApprovalGates = uniqueStrings(worker.ownerApprovalGates);
  const sourcePhaseIds = uniqueStrings(worker.sourcePhaseIds);
  const declaredFileStates = worker.declaredFileStates || {};

  const checks = [];
  const expectedPaths = [
    "docs/phases/PHASE_40_OVERNIGHT_BRANCH_WORKER_V1.md",
    "scripts/lib/overnight-branch-worker-v1.mjs",
    "scripts/run-overnight-branch-worker-v1.mjs",
    "tests/integration/overnight-branch-worker-v1.test.ts",
  ];
  const requiredCommands = [
    "npm run phase40:demo",
    "npm run phase40:verify",
    "npm run hygiene",
    "npm run build",
    "npm test",
    "npm run certify",
    "npm run verify",
  ];
  const expectedWorkerStepIds = [
    "owner-approval-intake",
    "clean-main-preflight",
    "phase-packet-ingestion",
    "branch-proposal-ingestion",
    "branch-readiness-confirmation",
    "remote-runner-blueprint-binding",
    "owner-approval-queue-binding",
    "self-hosted-adapter-binding",
    "command-allowlist-binding",
    "evidence-bundle-binding",
    "dry-run-validation-sequence-plan",
    "worker-artifact-plan",
    "emergency-stop-readiness",
    "session-lock-readiness",
    "owner-review-handoff",
  ];
  const expectedOwnerGates = [
    "owner approval required for overnight worker activation",
    "owner approval required for phase packet selection",
    "owner approval required for branch proposal selection",
    "owner approval required for branch readiness acceptance",
    "owner approval required for command sequence acceptance",
    "owner approval required for evidence bundle acceptance",
    "owner approval required for owner review handoff",
    "owner approval required for emergency stop release",
  ];

  checks.push(makeCheck("phase-id", worker.phaseId === "phase-40-overnight-branch-worker-v1", "Phase id must be phase-40-overnight-branch-worker-v1."));
  checks.push(makeCheck("phase-number", worker.phaseNumber === 40, "Phase number must be 40."));
  checks.push(makeCheck("worker-id", Boolean(worker.workerId), "Overnight branch worker must have a worker id."));
  checks.push(makeCheck("branch-name-format", /^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(worker.branchName || ""), "Overnight worker branch name must use safe lowercase kebab-case."));

  for (const sourcePhaseId of [
    "phase-32-phase-packet-generator-v1",
    "phase-33-branch-proposal-builder-v1",
    "phase-34-branch-readiness-inspector-v1",
    "phase-35-remote-phase-runner-blueprint-v1",
    "phase-36-owner-approval-queue-v1",
    "phase-37-self-hosted-runner-adapter-v1",
    "phase-38-command-allowlist-gate-v1",
    "phase-39-evidence-capture-bundle-v1",
  ]) {
    checks.push(makeCheck(`source:${sourcePhaseId}`, sourcePhaseIds.includes(sourcePhaseId), `Overnight worker must preserve lineage from ${sourcePhaseId}.`));
  }

  for (const expectedPath of expectedPaths) {
    checks.push(makeCheck(`declared-path:${expectedPath}`, declaredPaths.includes(expectedPath), `Declared paths must include ${expectedPath}.`));
  }

  for (const declaredPath of declaredPaths) {
    const safe = isSafeRelativePath(declaredPath);
    checks.push(makeCheck(`path-safe:${declaredPath}`, safe, `Declared path must be safe and relative: ${declaredPath}`));
    const state = declaredFileStates[declaredPath];
    const exists = safe ? fs.existsSync(path.join(rootDir, declaredPath)) : false;
    const intentionallyNew = state === "new";
    checks.push(makeCheck(`path-state:${declaredPath}`, exists || intentionallyNew, `Declared path must exist or be marked intentionally new: ${declaredPath}`));
  }

  for (const command of requiredCommands) {
    checks.push(makeCheck(`validation-command:${command}`, validationCommands.includes(command), `Validation commands must include: ${command}`));
  }

  for (const stepId of expectedWorkerStepIds) {
    checks.push(makeCheck(`worker-step:${stepId}`, workerSteps.some((step) => step.id === stepId), `Worker step is required: ${stepId}`));
  }

  for (const step of stepDecisions) {
    checks.push(makeCheck(`worker-step-safe:${step.id}`, step.decision.allowed, `Worker step must pass Phase 40 safety checks: ${step.id}${step.decision.reasons.length ? ` (${step.decision.reasons.join("; ")})` : ""}`));
    checks.push(makeCheck(`worker-step-required:${step.id}`, step.required === true, `Worker step must be required: ${step.id}`));
    checks.push(makeCheck(`worker-step-owner-review:${step.id}`, step.ownerReviewRequired === true, `Owner review must be required for worker step: ${step.id}`));
    checks.push(makeCheck(`worker-step-no-command-execution:${step.id}`, step.commandExecutionAllowed === false, `Command execution must remain disabled for worker step: ${step.id}`));
    checks.push(makeCheck(`worker-step-no-source-mutation:${step.id}`, step.sourceMutationAllowed === false, `Source mutation must remain disabled for worker step: ${step.id}`));
    checks.push(makeCheck(`worker-step-no-remote-execution:${step.id}`, step.remoteExecutionAllowed === false, `Remote execution must remain disabled for worker step: ${step.id}`));
    checks.push(makeCheck(`worker-step-no-branch-mutation:${step.id}`, step.branchMutationAllowed === false, `Branch mutation must remain disabled for worker step: ${step.id}`));
    checks.push(makeCheck(`worker-step-no-secret-storage:${step.id}`, step.storesSecrets === false, `Secret storage must remain disabled for worker step: ${step.id}`));
    checks.push(makeCheck(`worker-step-evidence:${step.id}`, step.evidenceRequired === true, `Evidence capture must be required for worker step: ${step.id}`));
    checks.push(makeCheck(`worker-step-redaction:${step.id}`, step.redactionRequired === true, `Redaction review must be required for worker step: ${step.id}`));
  }

  checks.push(makeCheck("worker-step-count", workerSteps.length >= 15, "At least 15 worker steps are required."));
  checks.push(makeCheck("evidence-count", evidenceRequirements.length >= 12, "At least 12 evidence requirements are required."));
  checks.push(makeCheck("risk-count", riskChecks.length >= 12, "At least 12 risk checks are required."));
  checks.push(makeCheck("owner-gate-count", ownerApprovalGates.length >= 8, "At least eight owner approval gates are required."));

  for (const gateName of expectedOwnerGates) {
    checks.push(makeCheck(`owner-gate:${gateName}`, ownerApprovalGates.includes(gateName), `Owner gate is required: ${gateName}`));
  }

  const falseBoundaryFields = [
    "overnightExecutionAllowed",
    "workerActivationAllowed",
    "commandExecutionAllowed",
    "arbitraryCommandExecutionAllowed",
    "shellExpansionAllowed",
    "shellChainingAllowed",
    "remoteExecutionAllowed",
    "executionAllowedAfterApproval",
    "adapterEnabled",
    "adapterActivationAllowed",
    "runnerConnectivityAllowed",
    "cloudRequired",
    "paidProviderRequired",
    "freeCoreDependency",
    "requiresSecrets",
    "usesCloudRunner",
    "usesSelfHostedRunner",
    "selfHostedRunnerActivated",
    "mutatesSource",
    "executesArbitraryCode",
    "executesRemoteCommands",
    "performsNetworkRefresh",
    "createsBranches",
    "switchesBranches",
    "pushesBranches",
    "opensPullRequests",
    "appliesPatches",
    "mergesBranches",
    "tagsReleases",
    "deletesBranches",
    "recordsOwnerDecision",
    "acceptsEvidenceAsOwnerApproved",
    "selfApprovesPlan",
    "selfApprovalAllowed",
    "proposalActivationAllowed",
  ];

  for (const field of falseBoundaryFields) {
    checks.push(makeCheck(`boundary:${field}`, worker[field] === false, `${field} must remain false in Phase 40.`));
  }

  const trueRequiredFields = [
    "localOnly",
    "workerOnly",
    "overnightBranchWorkerOnly",
    "dryRunOnly",
    "planningOnly",
    "ownerDecisionRequired",
    "emergencyStopRequired",
    "sessionLockRequired",
    "approvalQueueBindingRequired",
    "commandAllowlistRequired",
    "evidenceCaptureRequired",
    "evidenceBundleBindingRequired",
    "branchReadinessRequired",
    "branchProposalRequired",
    "phasePacketRequired",
    "ownerApprovalRequiredForOvernightWorkerActivation",
    "ownerApprovalRequiredForPhasePacketSelection",
    "ownerApprovalRequiredForBranchProposalSelection",
    "ownerApprovalRequiredForBranchReadinessAcceptance",
    "ownerApprovalRequiredForCommandSequenceAcceptance",
    "ownerApprovalRequiredForEvidenceBundleAcceptance",
    "ownerApprovalRequiredForOwnerReviewHandoff",
    "ownerApprovalRequiredForEmergencyStopRelease",
  ];

  for (const field of trueRequiredFields) {
    checks.push(makeCheck(`required:${field}`, worker[field] === true, `${field} must remain true in Phase 40.`));
  }

  const validationFailed = checks.filter((check) => !check.passed);
  const blockers = validationFailed.filter((check) => check.severity === "blocker").map((check) => check.message);
  const warnings = validationFailed.filter((check) => check.severity !== "blocker").map((check) => check.message);
  const acceptedSteps = stepDecisions.filter((step) => step.decision.allowed);
  const rejectedSteps = stepDecisions.filter((step) => !step.decision.allowed);
  const status = blockers.length > 0 ? "blocked" : "passed";

  const result = {
    ok: status === "passed",
    status,
    schemaVersion: 1,
    createdAt: nowIso(),
    reportHash: sha256({ worker, checks }),
    workerId: worker.workerId,
    phaseId: worker.phaseId,
    phaseNumber: worker.phaseNumber,
    title: worker.title,
    branchName: worker.branchName,
    overnightWorkerStatus: status === "passed" ? "ready" : "blocked",
    declaredFileCount: declaredPaths.length,
    declaredFileTypeCount: new Set(declaredPaths.map((declaredPath) => path.extname(declaredPath) || "none")).size,
    validationCommandCount: validationCommands.length,
    workerStepCount: workerSteps.length,
    acceptedWorkerStepCount: acceptedSteps.length,
    rejectedWorkerStepCount: rejectedSteps.length,
    evidenceRequirementCount: evidenceRequirements.length,
    riskCheckCount: riskChecks.length,
    ownerApprovalGateCount: ownerApprovalGates.length,
    validationCheckCount: checks.length,
    validationPassedCount: checks.length - validationFailed.length,
    validationFailedCount: validationFailed.length,
    blockers,
    warnings,
    localOnly: worker.localOnly,
    workerOnly: worker.workerOnly,
    overnightBranchWorkerOnly: worker.overnightBranchWorkerOnly,
    dryRunOnly: worker.dryRunOnly,
    planningOnly: worker.planningOnly,
    overnightExecutionAllowed: worker.overnightExecutionAllowed,
    workerActivationAllowed: worker.workerActivationAllowed,
    commandExecutionAllowed: worker.commandExecutionAllowed,
    arbitraryCommandExecutionAllowed: worker.arbitraryCommandExecutionAllowed,
    remoteExecutionAllowed: worker.remoteExecutionAllowed,
    runnerConnectivityAllowed: worker.runnerConnectivityAllowed,
    usesSelfHostedRunner: worker.usesSelfHostedRunner,
    selfHostedRunnerActivated: worker.selfHostedRunnerActivated,
    requiresSecrets: worker.requiresSecrets,
    mutatesSource: worker.mutatesSource,
    executesRemoteCommands: worker.executesRemoteCommands,
    recordsOwnerDecision: worker.recordsOwnerDecision,
    acceptsEvidenceAsOwnerApproved: worker.acceptsEvidenceAsOwnerApproved,
    selfApprovesPlan: worker.selfApprovesPlan,
    ownerDecisionRequired: worker.ownerDecisionRequired,
    emergencyStopRequired: worker.emergencyStopRequired,
    sessionLockRequired: worker.sessionLockRequired,
    approvalQueueBindingRequired: worker.approvalQueueBindingRequired,
    commandAllowlistRequired: worker.commandAllowlistRequired,
    evidenceCaptureRequired: worker.evidenceCaptureRequired,
    evidenceBundleBindingRequired: worker.evidenceBundleBindingRequired,
    branchReadinessRequired: worker.branchReadinessRequired,
    branchProposalRequired: worker.branchProposalRequired,
    phasePacketRequired: worker.phasePacketRequired,
    declaredPaths,
    validationCommands,
    stepDecisions,
    checks,
    init: {
      ok: true,
      status: "completed",
      schemaVersion: 1,
      runtimeDir,
      eventPath,
      reportDir,
    },
    jsonPath,
    markdownPath,
    historyPath,
  };

  writeJson(jsonPath, result);
  writeText(markdownPath, renderOvernightBranchWorkerMarkdownV1(result));
  appendJsonl(historyPath, {
    createdAt: result.createdAt,
    reportHash: result.reportHash,
    status: result.status,
    overnightWorkerStatus: result.overnightWorkerStatus,
    validationFailedCount: result.validationFailedCount,
    blockers: result.blockers,
  });
  appendJsonl(eventPath, {
    createdAt: result.createdAt,
    type: "phase40.overnight_branch_worker.inspected",
    status: result.status,
    overnightWorkerStatus: result.overnightWorkerStatus,
    validationFailedCount: result.validationFailedCount,
  });

  return result;
}

export function renderOvernightBranchWorkerMarkdownV1(result) {
  const lines = [
    "# S.E.R.A. Phase 40 — Overnight Branch Worker v1",
    "",
    `Status: ${result.status}`,
    `Overnight worker status: ${result.overnightWorkerStatus}`,
    `Phase: ${result.phaseId}`,
    `Branch: ${result.branchName}`,
    `Report hash: ${result.reportHash}`,
    "",
    "## Safety boundaries",
    "",
    `- Local only: ${result.localOnly}`,
    `- Worker only: ${result.workerOnly}`,
    `- Dry-run only: ${result.dryRunOnly}`,
    `- Planning only: ${result.planningOnly}`,
    `- Overnight execution allowed: ${result.overnightExecutionAllowed}`,
    `- Worker activation allowed: ${result.workerActivationAllowed}`,
    `- Command execution allowed: ${result.commandExecutionAllowed}`,
    `- Remote execution allowed: ${result.remoteExecutionAllowed}`,
    `- Runner connectivity allowed: ${result.runnerConnectivityAllowed}`,
    `- Uses self-hosted runner: ${result.usesSelfHostedRunner}`,
    `- Requires secrets: ${result.requiresSecrets}`,
    `- Mutates source: ${result.mutatesSource}`,
    `- Records owner decision: ${result.recordsOwnerDecision}`,
    `- Self approves plan: ${result.selfApprovesPlan}`,
    "",
    "## Counts",
    "",
    `- Worker steps: ${result.workerStepCount}`,
    `- Accepted worker steps: ${result.acceptedWorkerStepCount}`,
    `- Rejected worker steps: ${result.rejectedWorkerStepCount}`,
    `- Validation checks: ${result.validationCheckCount}`,
    `- Failed checks: ${result.validationFailedCount}`,
    "",
    "## Blockers",
    "",
    ...(result.blockers.length ? result.blockers.map((blocker) => `- ${blocker}`) : ["- None"]),
    "",
  ];

  return `${lines.join("\n")}\n`;
}
