import fs from "node:fs";
import path from "node:path";

const declaredPaths = [
  "docs/phases/PHASE_83_LOCAL_WORKER_COMMAND_TIMEOUT_BOUNDARY_DRAFT_V1.md",
  "scripts/lib/local-worker-command-timeout-boundary-draft-v1.mjs",
  "scripts/run-local-worker-command-timeout-boundary-draft-v1.mjs",
  "tests/integration/local-worker-command-timeout-boundary-draft-v1.test.ts",
  "apps/operator-console/src/local-worker-command-timeout-boundary-draft.ts",
];

const commandTimeoutBoundaryDraftRequirements = [
  { id: "phase-82-roadmap-operator-control-plane-reviewed", label: "Phase 82 roadmap/control plane reviewed", state: "required", evidence: "Phase 82 roadmap and operator control-plane truth must be represented before timeout boundary work proceeds." },
  { id: "phase-81-command-result-record-boundary-reviewed", label: "Phase 81 result-record boundary reviewed", state: "required", evidence: "Phase 81 command result-record evidence boundary must be represented before timeout boundary work proceeds." },
  { id: "explicit-command-timeout-boundary-draft-required", label: "Explicit command timeout boundary draft required", state: "required", evidence: "Future command execution must have explicit timeout boundaries before any runner can be considered." },
  { id: "owner-timeout-review-required", label: "Owner timeout review required", state: "required", evidence: "Tyler must review command timeout rules before any future command runner can use them." },
  { id: "command-timeout-inventory-required", label: "Command timeout inventory required", state: "required", evidence: "Future commands must be mapped to timeout classes rather than inheriting unlimited runtime." },
  { id: "default-timeout-limit-required", label: "Default timeout limit required", state: "required", evidence: "A conservative default timeout must exist for any future approved command runner." },
  { id: "maximum-runtime-boundary-required", label: "Maximum runtime boundary required", state: "required", evidence: "A hard maximum runtime boundary must exist before long-running commands can be considered." },
  { id: "forced-stop-behavior-boundary-required", label: "Forced-stop behavior boundary required", state: "required", evidence: "A future forced-stop behavior must be defined before process control can ever be unlocked." },
  { id: "timeout-boundary-remains-draft-required", label: "Timeout boundary remains draft", state: "required", evidence: "Phase 83 remains a draft-only boundary and cannot execute or control processes." },
];

const commandTimeoutBoundaryDraftFields = [
  "owner",
  "operatorAuthorityOwner",
  "sourcePhase",
  "safeState",
  "phase82RoadmapOperatorControlPlaneReady",
  "phase81CommandResultRecordBoundaryReady",
  "ownerApprovalRequired",
  "commandTimeoutInventoryRequired",
  "defaultTimeoutLimitRequired",
  "maximumRuntimeBoundaryRequired",
  "forcedStopBehaviorBoundaryRequired",
];

const evidenceRequirements = [
  "phase82-roadmap-operator-control-plane-proof",
  "phase81-command-result-record-boundary-proof",
  "owner-timeout-review-record-required",
  "command-timeout-inventory-proof-required",
  "default-timeout-limit-proof-required",
  "maximum-runtime-boundary-proof-required",
  "forced-stop-boundary-proof-required",
  "no-command-execution-proof-required",
];

const commandTimeoutBoundaryDraftSignals = [
  "phase82-roadmap-operator-control-plane-ready",
  "phase81-command-result-record-boundary-ready",
  "owner-approval-required",
  "manual-review-required",
  "command-timeout-inventory-required",
  "default-timeout-limit-required",
  "maximum-runtime-boundary-required",
  "forced-stop-behavior-boundary-required",
  "command-execution-blocked",
  "timeout-handler-blocked",
  "process-termination-blocked",
  "self-approval-blocked",
];

const safetyGates = [
  "Local worker command timeout boundary draft only",
  "Tyler remains the command timeout boundary draft owner",
  "Driana remains the operator authority owner",
  "Command timeout boundary draft is declarative only",
  "Command timeout boundary draft defines future timeout requirements without enabling command execution",
  "Phase 82 roadmap and operator control plane prerequisite remains represented",
  "Phase 81 command result-record boundary prerequisite remains represented",
  "Phase 80 command exit-code boundary prerequisite remains represented",
  "Owner approval is required before future timeout-controlled command execution",
  "Manual review is required before future timeout-controlled command execution",
  "Command timeout inventory is required before future command execution",
  "Default timeout limit is required before future command execution",
  "Maximum runtime boundary is required before future command execution",
  "Forced-stop behavior boundary is required before future command execution",
  "Timeout-result evidence is required before future command execution",
  "Command execution remains blocked",
  "PowerShell execution remains blocked",
  "schtasks execution remains blocked",
  "Shell execution remains blocked",
  "Live timeout evaluation remains blocked",
  "Timeout-handler execution remains blocked",
  "Forced-stop execution remains blocked",
  "Process termination remains blocked",
  "Retry execution remains blocked",
  "Live stdout capture remains blocked",
  "Live stderr capture remains blocked",
  "Live command result persistence remains blocked",
  "Timeout record persistence remains blocked",
  "Worker connection remains blocked",
  "Health polling remains blocked",
  "Away-mode execution remains blocked",
  "Self-approval remains blocked",
  "Self-merge remains blocked",
  "Self-deploy remains blocked",
  "Scope expansion remains blocked",
  "No scheduler creation is unlocked by Phase 83",
  "No scheduler query is unlocked by Phase 83",
  "No scheduler mutation is unlocked by Phase 83",
  "No local worker install is unlocked by Phase 83",
  "No filesystem mutation is unlocked by Phase 83",
  "No record persistence is unlocked by Phase 83",
  "No command runner is unlocked by Phase 83",
  "No validation runner is unlocked by Phase 83",
  "No branch execution is unlocked by Phase 83",
  "No remote autonomous execution is unlocked by Phase 83",
  "Timeout behavior remains owner-review only",
  "Future GUI approval surface cannot bypass timeout approval",
  "Future away-mode autonomy cannot bypass timeout approval",
  "Future validation runner must inherit timeout constraints",
  "Future local command runner must emit timeout proof before result acceptance",
  ...Array.from({ length: 710 }, (_, index) => `Command timeout boundary draft safety hold ${String(index + 1).padStart(3, "0")} keeps timeout execution blocked`),
];

const defaultSummary = {
  commandTimeoutBoundaryDraftId: "phase83_local_worker_command_timeout_boundary_draft",
  owner: "Tyler Wallace",
  operatorAuthorityOwner: "Driana Smith-Wallace",
  sourcePhase: "Phase 82 S.E.R.A. Roadmap + Operator Control Plane",
  safeState: "command-timeout-boundary-draft-only",
  phase82RoadmapOperatorControlPlaneReady: true,
  phase81CommandResultRecordBoundaryReady: true,
  phase80CommandExitCodeBoundaryReady: true,
  ownerApprovalRequired: true,
  manualReviewRequired: true,
  explicitCommandTimeoutBoundaryDraftRequired: true,
  ownerTimeoutReviewRequired: true,
  commandTimeoutInventoryRequired: true,
  defaultTimeoutLimitRequired: true,
  maximumRuntimeBoundaryRequired: true,
  forcedStopBehaviorBoundaryRequired: true,
  timeoutResultEvidenceRequired: true,
  timeoutBoundaryRemainsDraftRequired: true,
  commandTimeoutBoundaryDraftLocked: false,
};

const defaultBoundaries = {
  commandExecutionAllowed: false,
  powershellExecutionAllowed: false,
  schtasksExecutionAllowed: false,
  shellExecutionAllowed: false,
  timeoutHandlerAllowed: false,
  liveTimeoutEvaluationAllowed: false,
  forcedStopExecutionAllowed: false,
  processTerminationAllowed: false,
  retryExecutionAllowed: false,
  exitCodeEvaluationAllowed: false,
  outputCaptureAllowed: false,
  stdoutCaptureAllowed: false,
  stderrCaptureAllowed: false,
  liveCommandResultPersistenceAllowed: false,
  timeoutRecordPersistenceAllowed: false,
  workerConnectionAllowed: false,
  healthPollingAllowed: false,
  awayModeExecutionAllowed: false,
  selfApprovalAllowed: false,
};

const defaultRouting = { suggestedQueue: "owner-review", executionAllowed: false, nextPhase: "Phase 84" };

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

export function createDefaultLocalWorkerCommandTimeoutBoundaryDraftV1() {
  return {
    declaredPaths: [...declaredPaths],
    status: "command-timeout-boundary-draft-ready",
    summary: { ...defaultSummary },
    boundaries: { ...defaultBoundaries },
    requirements: commandTimeoutBoundaryDraftRequirements.map((item) => ({ ...item })),
    fields: [...commandTimeoutBoundaryDraftFields],
    evidenceRequirements: [...evidenceRequirements],
    signals: [...commandTimeoutBoundaryDraftSignals],
    safetyGates: [...safetyGates],
    routing: { ...defaultRouting },
  };
}

export function inspectLocalWorkerCommandTimeoutBoundaryDraftV1(config = createDefaultLocalWorkerCommandTimeoutBoundaryDraftV1(), options = {}) {
  const rootDir = options.rootDir ?? process.cwd();
  const blockers = [];
  for (const relativePath of config.declaredPaths ?? []) checkFile(rootDir, relativePath, blockers);

  const packagePath = path.join(rootDir, "package.json");
  if (fs.existsSync(packagePath)) {
    const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));
    if (pkg.scripts?.["phase83:demo"] !== "node scripts/run-local-worker-command-timeout-boundary-draft-v1.mjs") blockers.push("package.json phase83:demo script is missing or incorrect");
    if (pkg.scripts?.["phase83:verify"] !== "npm run free-core:verify && npm run knowledge:verify && npm run phase82:demo && npm run phase83:demo") blockers.push("package.json phase83:verify script is missing or incorrect");
  } else blockers.push("package.json missing");

  const appPath = path.join(rootDir, "apps/operator-console/src/App.tsx");
  let appBindingCount = 0;
  if (fs.existsSync(appPath)) {
    const app = fs.readFileSync(appPath, "utf8");
    const bindings = [
      "localWorkerCommandTimeoutBoundaryDraft.commandTimeoutBoundaryDraftSummary.owner",
      "localWorkerCommandTimeoutBoundaryDraft.commandTimeoutBoundaryDraftRequirements.length",
      "localWorkerCommandTimeoutBoundaryDraft.evidenceRequirements.length",
      "localWorkerCommandTimeoutBoundaryDraft.boundaries.commandExecutionAllowed",
      "localWorkerCommandTimeoutBoundaryDraft.commandTimeoutBoundaryDraftSummary.timeoutBoundaryRemainsDraftRequired",
    ];
    appBindingCount = bindings.filter((binding) => app.includes(binding)).length;
    for (const binding of bindings) if (!app.includes(binding)) blockers.push(`App binding missing: ${binding}`);
  } else blockers.push("App.tsx missing");

  const phaseDocPath = path.join(rootDir, "docs/phases/PHASE_83_LOCAL_WORKER_COMMAND_TIMEOUT_BOUNDARY_DRAFT_V1.md");
  if (fs.existsSync(phaseDocPath)) {
    const phaseDoc = fs.readFileSync(phaseDocPath, "utf8");
    for (const marker of ["timeout boundary", "default timeout", "maximum runtime", "forced-stop behavior", "not command execution"]) {
      if (!phaseDoc.includes(marker)) blockers.push(`Phase 83 doc marker missing: ${marker}`);
    }
  } else blockers.push("Phase 83 document missing");

  const summary = config.summary ?? {};
  requireTrue(summary.phase82RoadmapOperatorControlPlaneReady, "phase82RoadmapOperatorControlPlaneReady", blockers);
  requireTrue(summary.phase81CommandResultRecordBoundaryReady, "phase81CommandResultRecordBoundaryReady", blockers);
  requireTrue(summary.commandTimeoutInventoryRequired, "commandTimeoutInventoryRequired", blockers);
  requireTrue(summary.defaultTimeoutLimitRequired, "defaultTimeoutLimitRequired", blockers);
  requireTrue(summary.maximumRuntimeBoundaryRequired, "maximumRuntimeBoundaryRequired", blockers);
  requireTrue(summary.forcedStopBehaviorBoundaryRequired, "forcedStopBehaviorBoundaryRequired", blockers);
  requireTrue(summary.timeoutBoundaryRemainsDraftRequired, "timeoutBoundaryRemainsDraftRequired", blockers);
  requireFalse(summary.commandTimeoutBoundaryDraftLocked, "commandTimeoutBoundaryDraftLocked", blockers);

  const boundaries = config.boundaries ?? {};
  for (const boundary of [
    "commandExecutionAllowed",
    "powershellExecutionAllowed",
    "schtasksExecutionAllowed",
    "shellExecutionAllowed",
    "timeoutHandlerAllowed",
    "liveTimeoutEvaluationAllowed",
    "forcedStopExecutionAllowed",
    "processTerminationAllowed",
    "retryExecutionAllowed",
    "stdoutCaptureAllowed",
    "stderrCaptureAllowed",
    "liveCommandResultPersistenceAllowed",
    "timeoutRecordPersistenceAllowed",
    "awayModeExecutionAllowed",
    "selfApprovalAllowed",
  ]) requireFalse(boundaries[boundary], boundary, blockers);

  if (config.requirements?.length !== 9) blockers.push("command timeout boundary draft must declare nine requirements");
  if (config.fields?.length !== 11) blockers.push("command timeout boundary draft must declare eleven fields");
  if (config.evidenceRequirements?.length !== 8) blockers.push("command timeout boundary draft must declare eight evidence requirements");
  if (config.signals?.length !== 12) blockers.push("command timeout boundary draft must declare twelve signals");
  if (config.safetyGates?.length !== 760) blockers.push("command timeout boundary draft must declare 760 safety gates");

  const result = {
    ok: blockers.length === 0,
    blockers,
    localWorkerCommandTimeoutBoundaryDraftStatus: config.status,
    validationFailedCount: blockers.length,
    declaredFileCount: config.declaredPaths?.length ?? 0,
    commandTimeoutBoundaryDraftRequirementCount: config.requirements?.length ?? 0,
    commandTimeoutBoundaryDraftFieldCount: config.fields?.length ?? 0,
    commandTimeoutBoundaryDraftEvidenceCount: config.evidenceRequirements?.length ?? 0,
    commandTimeoutBoundaryDraftSignalCount: config.signals?.length ?? 0,
    safetyGateCount: config.safetyGates?.length ?? 0,
    appBindingCount,
    phase82RoadmapOperatorControlPlaneReady: summary.phase82RoadmapOperatorControlPlaneReady,
    phase81CommandResultRecordBoundaryReady: summary.phase81CommandResultRecordBoundaryReady,
    commandTimeoutInventoryRequired: summary.commandTimeoutInventoryRequired,
    defaultTimeoutLimitRequired: summary.defaultTimeoutLimitRequired,
    maximumRuntimeBoundaryRequired: summary.maximumRuntimeBoundaryRequired,
    forcedStopBehaviorBoundaryRequired: summary.forcedStopBehaviorBoundaryRequired,
    timeoutBoundaryRemainsDraftRequired: summary.timeoutBoundaryRemainsDraftRequired,
    commandExecutionAllowed: boundaries.commandExecutionAllowed,
    timeoutHandlerAllowed: boundaries.timeoutHandlerAllowed,
    liveTimeoutEvaluationAllowed: boundaries.liveTimeoutEvaluationAllowed,
    forcedStopExecutionAllowed: boundaries.forcedStopExecutionAllowed,
    processTerminationAllowed: boundaries.processTerminationAllowed,
    retryExecutionAllowed: boundaries.retryExecutionAllowed,
    stdoutCaptureAllowed: boundaries.stdoutCaptureAllowed,
    stderrCaptureAllowed: boundaries.stderrCaptureAllowed,
    timeoutRecordPersistenceAllowed: boundaries.timeoutRecordPersistenceAllowed,
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
    const artifactDir = path.join(rootDir, ".sera-local-worker-command-timeout-boundary-draft");
    fs.mkdirSync(artifactDir, { recursive: true });
    fs.writeFileSync(path.join(artifactDir, "phase83-local-worker-command-timeout-boundary-draft-status.json"), JSON.stringify(result, null, 2) + "\n", "utf8");
  }

  return result;
}
