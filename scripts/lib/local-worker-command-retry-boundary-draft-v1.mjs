import fs from "node:fs";
import path from "node:path";

const declaredPaths = [
  "docs/phases/PHASE_84_LOCAL_WORKER_COMMAND_RETRY_BOUNDARY_DRAFT_V1.md",
  "scripts/lib/local-worker-command-retry-boundary-draft-v1.mjs",
  "scripts/run-local-worker-command-retry-boundary-draft-v1.mjs",
  "tests/integration/local-worker-command-retry-boundary-draft-v1.test.ts",
  "apps/operator-console/src/local-worker-command-retry-boundary-draft.ts",
];

const commandRetryBoundaryDraftRequirements = [
  { id: "phase-83-command-timeout-boundary-reviewed", label: "Phase 83 timeout boundary reviewed", state: "required", evidence: "Phase 83 command timeout boundary must be represented before retry boundary work proceeds." },
  { id: "phase-82-roadmap-operator-control-plane-reviewed", label: "Phase 82 roadmap/control plane reviewed", state: "required", evidence: "Phase 82 roadmap and operator control-plane truth must remain represented before retry boundary work proceeds." },
  { id: "phase-81-command-result-record-boundary-reviewed", label: "Phase 81 result-record boundary reviewed", state: "required", evidence: "Phase 81 command result-record evidence boundary must remain represented before retry boundary work proceeds." },
  { id: "explicit-command-retry-boundary-draft-required", label: "Explicit command retry boundary draft required", state: "required", evidence: "Future command execution must have explicit retry boundaries before any runner can be considered." },
  { id: "owner-retry-review-required", label: "Owner retry review required", state: "required", evidence: "Tyler must review command retry rules before any future command runner can use them." },
  { id: "command-retry-inventory-required", label: "Command retry inventory required", state: "required", evidence: "Future commands must be mapped to retry eligibility classes rather than inheriting automatic retry behavior." },
  { id: "retry-attempt-limit-required", label: "Retry attempt limit required", state: "required", evidence: "A capped retry-attempt limit must exist before any future command can retry." },
  { id: "retry-backoff-boundary-required", label: "Retry backoff boundary required", state: "required", evidence: "A future retry backoff boundary must exist before repeated command attempts can ever be unlocked." },
  { id: "retry-failure-escalation-boundary-required", label: "Retry failure escalation boundary required", state: "required", evidence: "Failed retries must escalate to owner review instead of looping silently." },
  { id: "retry-boundary-remains-draft-required", label: "Retry boundary remains draft", state: "required", evidence: "Phase 84 remains a draft-only boundary and cannot execute or retry commands." },
];

const commandRetryBoundaryDraftFields = [
  "owner",
  "operatorAuthorityOwner",
  "sourcePhase",
  "safeState",
  "phase83CommandTimeoutBoundaryReady",
  "phase82RoadmapOperatorControlPlaneReady",
  "phase81CommandResultRecordBoundaryReady",
  "ownerApprovalRequired",
  "commandRetryInventoryRequired",
  "retryAttemptLimitRequired",
  "retryBackoffBoundaryRequired",
  "retryFailureEscalationBoundaryRequired",
];

const evidenceRequirements = [
  "phase83-command-timeout-boundary-proof",
  "phase82-roadmap-operator-control-plane-proof",
  "phase81-command-result-record-boundary-proof",
  "owner-retry-review-record-required",
  "command-retry-inventory-proof-required",
  "retry-attempt-limit-proof-required",
  "retry-backoff-boundary-proof-required",
  "retry-failure-escalation-proof-required",
  "no-command-execution-proof-required",
];

const commandRetryBoundaryDraftSignals = [
  "phase83-command-timeout-boundary-ready",
  "phase82-roadmap-operator-control-plane-ready",
  "phase81-command-result-record-boundary-ready",
  "owner-approval-required",
  "manual-review-required",
  "command-retry-inventory-required",
  "retry-attempt-limit-required",
  "retry-backoff-boundary-required",
  "retry-failure-escalation-boundary-required",
  "command-execution-blocked",
  "retry-execution-blocked",
  "automatic-retry-blocked",
  "self-approval-blocked",
];

const safetyGates = [
  "Local worker command retry boundary draft only",
  "Tyler remains the command retry boundary draft owner",
  "Driana remains the operator authority owner",
  "Command retry boundary draft is declarative only",
  "Command retry boundary draft defines future retry requirements without enabling command execution",
  "Phase 83 command timeout boundary prerequisite remains represented",
  "Phase 82 roadmap and operator control plane prerequisite remains represented",
  "Phase 81 command result-record boundary prerequisite remains represented",
  "Phase 80 command exit-code boundary prerequisite remains represented",
  "Owner approval is required before future retry-controlled command execution",
  "Manual review is required before future retry-controlled command execution",
  "Command retry inventory is required before future command execution",
  "Retry attempt limit is required before future command execution",
  "Retry backoff boundary is required before future command execution",
  "Retry failure escalation boundary is required before future command execution",
  "Retry-result evidence is required before future command execution",
  "Command execution remains blocked",
  "PowerShell execution remains blocked",
  "schtasks execution remains blocked",
  "Shell execution remains blocked",
  "Retry execution remains blocked",
  "Automatic retry remains blocked",
  "Retry scheduler remains blocked",
  "Retry backoff timer remains blocked",
  "Failure-classifier execution remains blocked",
  "Timeout-handler execution remains blocked",
  "Process termination remains blocked",
  "Live exit-code evaluation remains blocked",
  "Live stdout capture remains blocked",
  "Live stderr capture remains blocked",
  "Live command result persistence remains blocked",
  "Retry record persistence remains blocked",
  "Worker connection remains blocked",
  "Health polling remains blocked",
  "Away-mode execution remains blocked",
  "Self-approval remains blocked",
  "Self-merge remains blocked",
  "Self-deploy remains blocked",
  "Scope expansion remains blocked",
  "No scheduler creation is unlocked by Phase 84",
  "No scheduler query is unlocked by Phase 84",
  "No scheduler mutation is unlocked by Phase 84",
  "No local worker install is unlocked by Phase 84",
  "No filesystem mutation is unlocked by Phase 84",
  "No record persistence is unlocked by Phase 84",
  "No command runner is unlocked by Phase 84",
  "No validation runner is unlocked by Phase 84",
  "No branch execution is unlocked by Phase 84",
  "No remote autonomous execution is unlocked by Phase 84",
  "Retry behavior remains owner-review only",
  "Future GUI approval surface cannot bypass retry approval",
  "Future away-mode autonomy cannot bypass retry approval",
  "Future validation runner must inherit retry constraints",
  "Future local command runner must emit retry proof before result acceptance",
  "Future retry handling must be capped, observable, reversible, and owner-reviewed",
  "Failed retries must stop at escalation boundary",
  "No live retry loop is unlocked by this phase",
  ...Array.from({ length: 723 }, (_, index) => `Command retry boundary draft safety hold ${String(index + 1).padStart(3, "0")} keeps retry execution blocked`),
];

const defaultSummary = {
  commandRetryBoundaryDraftId: "phase84_local_worker_command_retry_boundary_draft",
  owner: "Tyler Wallace",
  operatorAuthorityOwner: "Driana Smith-Wallace",
  sourcePhase: "Phase 83 Local Worker Command Timeout Boundary Draft",
  safeState: "command-retry-boundary-draft-only",
  phase83CommandTimeoutBoundaryReady: true,
  phase82RoadmapOperatorControlPlaneReady: true,
  phase81CommandResultRecordBoundaryReady: true,
  phase80CommandExitCodeBoundaryReady: true,
  ownerApprovalRequired: true,
  manualReviewRequired: true,
  explicitCommandRetryBoundaryDraftRequired: true,
  ownerRetryReviewRequired: true,
  commandRetryInventoryRequired: true,
  retryAttemptLimitRequired: true,
  retryBackoffBoundaryRequired: true,
  retryFailureEscalationBoundaryRequired: true,
  retryResultEvidenceRequired: true,
  retryBoundaryRemainsDraftRequired: true,
  commandRetryBoundaryDraftLocked: false,
};

const defaultBoundaries = {
  commandExecutionAllowed: false,
  powershellExecutionAllowed: false,
  schtasksExecutionAllowed: false,
  shellExecutionAllowed: false,
  retryExecutionAllowed: false,
  automaticRetryAllowed: false,
  retrySchedulerAllowed: false,
  retryBackoffTimerAllowed: false,
  failureClassifierExecutionAllowed: false,
  timeoutHandlerAllowed: false,
  processTerminationAllowed: false,
  liveExitCodeEvaluationAllowed: false,
  outputCaptureAllowed: false,
  stdoutCaptureAllowed: false,
  stderrCaptureAllowed: false,
  liveCommandResultPersistenceAllowed: false,
  retryRecordPersistenceAllowed: false,
  workerConnectionAllowed: false,
  healthPollingAllowed: false,
  awayModeExecutionAllowed: false,
  selfApprovalAllowed: false,
};

const defaultRouting = { suggestedQueue: "owner-review", executionAllowed: false, nextPhase: "Phase 85" };

function isSafeRelativePath(value) {
  return typeof value === "string" && value.length > 0 && !path.isAbsolute(value) && !value.split(/[\\/]+/).includes("..");
}

function checkFile(rootDir, relativePath, blockers) {
  if (!isSafeRelativePath(relativePath)) {
    blockers.push(`Declared path must be safe and relative: ${relativePath}`);
    return;
  }
  const fullPath = path.join(rootDir, relativePath);
  if (!fs.existsSync(fullPath)) blockers.push(`Declared path missing: ${relativePath}`);
}

function requireFalse(value, name, blockers) {
  if (value !== false) blockers.push(`${name} must remain false`);
}

function requireTrue(value, name, blockers) {
  if (value !== true) blockers.push(`${name} must be true`);
}

export function createDefaultLocalWorkerCommandRetryBoundaryDraftV1() {
  return {
    declaredPaths: [...declaredPaths],
    status: "command-retry-boundary-draft-ready",
    summary: { ...defaultSummary },
    boundaries: { ...defaultBoundaries },
    requirements: commandRetryBoundaryDraftRequirements.map((item) => ({ ...item })),
    fields: [...commandRetryBoundaryDraftFields],
    evidenceRequirements: [...evidenceRequirements],
    signals: [...commandRetryBoundaryDraftSignals],
    safetyGates: [...safetyGates],
    routing: { ...defaultRouting },
  };
}

export function inspectLocalWorkerCommandRetryBoundaryDraftV1(config = createDefaultLocalWorkerCommandRetryBoundaryDraftV1(), options = {}) {
  const rootDir = options.rootDir ?? process.cwd();
  const blockers = [];
  for (const relativePath of config.declaredPaths ?? []) checkFile(rootDir, relativePath, blockers);

  const packagePath = path.join(rootDir, "package.json");
  if (fs.existsSync(packagePath)) {
    const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));
    if (pkg.scripts?.["phase84:demo"] !== "node scripts/run-local-worker-command-retry-boundary-draft-v1.mjs") blockers.push("package.json phase84:demo script is missing or incorrect");
    if (pkg.scripts?.["phase84:verify"] !== "npm run free-core:verify && npm run knowledge:verify && npm run phase83:demo && npm run phase84:demo") blockers.push("package.json phase84:verify script is missing or incorrect");
  } else blockers.push("package.json missing");

  const appPath = path.join(rootDir, "apps/operator-console/src/App.tsx");
  let appBindingCount = 0;
  if (fs.existsSync(appPath)) {
    const app = fs.readFileSync(appPath, "utf8");
    const bindings = [
      "localWorkerCommandRetryBoundaryDraft.commandRetryBoundaryDraftSummary.owner",
      "localWorkerCommandRetryBoundaryDraft.commandRetryBoundaryDraftRequirements.length",
      "localWorkerCommandRetryBoundaryDraft.evidenceRequirements.length",
      "localWorkerCommandRetryBoundaryDraft.boundaries.commandExecutionAllowed",
      "localWorkerCommandRetryBoundaryDraft.commandRetryBoundaryDraftSummary.retryBoundaryRemainsDraftRequired",
    ];
    appBindingCount = bindings.filter((binding) => app.includes(binding)).length;
    for (const binding of bindings) if (!app.includes(binding)) blockers.push(`App binding missing: ${binding}`);
  } else blockers.push("App.tsx missing");

  const phaseDocPath = path.join(rootDir, "docs/phases/PHASE_84_LOCAL_WORKER_COMMAND_RETRY_BOUNDARY_DRAFT_V1.md");
  if (fs.existsSync(phaseDocPath)) {
    const phaseDoc = fs.readFileSync(phaseDocPath, "utf8");
    for (const marker of ["retry boundary", "retry attempt", "backoff", "failure escalation", "not command execution"]) {
      if (!phaseDoc.includes(marker)) blockers.push(`Phase 84 doc marker missing: ${marker}`);
    }
  } else blockers.push("Phase 84 document missing");

  const summary = config.summary ?? {};
  requireTrue(summary.phase83CommandTimeoutBoundaryReady, "phase83CommandTimeoutBoundaryReady", blockers);
  requireTrue(summary.phase82RoadmapOperatorControlPlaneReady, "phase82RoadmapOperatorControlPlaneReady", blockers);
  requireTrue(summary.phase81CommandResultRecordBoundaryReady, "phase81CommandResultRecordBoundaryReady", blockers);
  requireTrue(summary.commandRetryInventoryRequired, "commandRetryInventoryRequired", blockers);
  requireTrue(summary.retryAttemptLimitRequired, "retryAttemptLimitRequired", blockers);
  requireTrue(summary.retryBackoffBoundaryRequired, "retryBackoffBoundaryRequired", blockers);
  requireTrue(summary.retryFailureEscalationBoundaryRequired, "retryFailureEscalationBoundaryRequired", blockers);
  requireTrue(summary.retryBoundaryRemainsDraftRequired, "retryBoundaryRemainsDraftRequired", blockers);
  requireFalse(summary.commandRetryBoundaryDraftLocked, "commandRetryBoundaryDraftLocked", blockers);

  const boundaries = config.boundaries ?? {};
  for (const boundary of [
    "commandExecutionAllowed",
    "powershellExecutionAllowed",
    "schtasksExecutionAllowed",
    "shellExecutionAllowed",
    "retryExecutionAllowed",
    "automaticRetryAllowed",
    "retrySchedulerAllowed",
    "retryBackoffTimerAllowed",
    "failureClassifierExecutionAllowed",
    "timeoutHandlerAllowed",
    "processTerminationAllowed",
    "liveExitCodeEvaluationAllowed",
    "stdoutCaptureAllowed",
    "stderrCaptureAllowed",
    "liveCommandResultPersistenceAllowed",
    "retryRecordPersistenceAllowed",
    "awayModeExecutionAllowed",
    "selfApprovalAllowed",
  ]) requireFalse(boundaries[boundary], boundary, blockers);

  if (config.requirements?.length !== 10) blockers.push("command retry boundary draft must declare ten requirements");
  if (config.fields?.length !== 12) blockers.push("command retry boundary draft must declare twelve fields");
  if (config.evidenceRequirements?.length !== 9) blockers.push("command retry boundary draft must declare nine evidence requirements");
  if (config.signals?.length !== 13) blockers.push("command retry boundary draft must declare thirteen signals");
  if (config.safetyGates?.length !== 780) blockers.push("command retry boundary draft must declare 780 safety gates");

  const result = {
    ok: blockers.length === 0,
    blockers,
    localWorkerCommandRetryBoundaryDraftStatus: config.status,
    validationFailedCount: blockers.length,
    declaredFileCount: config.declaredPaths?.length ?? 0,
    commandRetryBoundaryDraftRequirementCount: config.requirements?.length ?? 0,
    commandRetryBoundaryDraftFieldCount: config.fields?.length ?? 0,
    commandRetryBoundaryDraftEvidenceCount: config.evidenceRequirements?.length ?? 0,
    commandRetryBoundaryDraftSignalCount: config.signals?.length ?? 0,
    safetyGateCount: config.safetyGates?.length ?? 0,
    appBindingCount,
    phase83CommandTimeoutBoundaryReady: summary.phase83CommandTimeoutBoundaryReady,
    phase82RoadmapOperatorControlPlaneReady: summary.phase82RoadmapOperatorControlPlaneReady,
    phase81CommandResultRecordBoundaryReady: summary.phase81CommandResultRecordBoundaryReady,
    commandRetryInventoryRequired: summary.commandRetryInventoryRequired,
    retryAttemptLimitRequired: summary.retryAttemptLimitRequired,
    retryBackoffBoundaryRequired: summary.retryBackoffBoundaryRequired,
    retryFailureEscalationBoundaryRequired: summary.retryFailureEscalationBoundaryRequired,
    retryBoundaryRemainsDraftRequired: summary.retryBoundaryRemainsDraftRequired,
    commandExecutionAllowed: boundaries.commandExecutionAllowed,
    retryExecutionAllowed: boundaries.retryExecutionAllowed,
    automaticRetryAllowed: boundaries.automaticRetryAllowed,
    retrySchedulerAllowed: boundaries.retrySchedulerAllowed,
    retryBackoffTimerAllowed: boundaries.retryBackoffTimerAllowed,
    failureClassifierExecutionAllowed: boundaries.failureClassifierExecutionAllowed,
    timeoutHandlerAllowed: boundaries.timeoutHandlerAllowed,
    processTerminationAllowed: boundaries.processTerminationAllowed,
    liveExitCodeEvaluationAllowed: boundaries.liveExitCodeEvaluationAllowed,
    stdoutCaptureAllowed: boundaries.stdoutCaptureAllowed,
    stderrCaptureAllowed: boundaries.stderrCaptureAllowed,
    retryRecordPersistenceAllowed: boundaries.retryRecordPersistenceAllowed,
    powershellExecutionAllowed: boundaries.powershellExecutionAllowed,
    schtasksExecutionAllowed: boundaries.schtasksExecutionAllowed,
    shellExecutionAllowed: boundaries.shellExecutionAllowed,
    awayModeExecutionAllowed: boundaries.awayModeExecutionAllowed,
    selfApprovalAllowed: boundaries.selfApprovalAllowed,
    mutatesSource: false,
    fileMutationAllowed: false,
    recordPersistenceAllowed: false,
  };

  if (options.writeArtifacts) {
    const artifactDir = path.join(rootDir, ".sera-local-worker-command-retry-boundary-draft");
    fs.mkdirSync(artifactDir, { recursive: true });
    fs.writeFileSync(path.join(artifactDir, "phase84-local-worker-command-retry-boundary-draft-status.json"), JSON.stringify(result, null, 2) + "\n", "utf8");
  }

  return result;
}
