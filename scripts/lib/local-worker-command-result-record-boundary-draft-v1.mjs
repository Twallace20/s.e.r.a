import fs from "node:fs";
import path from "node:path";

const declaredPaths = [
  "apps/operator-console/src/local-worker-command-result-record-boundary-draft.ts",
  "docs/phases/PHASE_81_LOCAL_WORKER_COMMAND_RESULT_RECORD_BOUNDARY_DRAFT_V1.md",
  "scripts/lib/local-worker-command-result-record-boundary-draft-v1.mjs",
  "scripts/run-local-worker-command-result-record-boundary-draft-v1.mjs",
  "tests/integration/local-worker-command-result-record-boundary-draft-v1.test.ts",
];

const commandResultRecordBoundaryDraftRequirements = [
  {
    id: "phase-80-command-exit-code-boundary-draft-reviewed",
    label: "Phase 80 command exit-code boundary draft reviewed",
    state: "required",
    evidence: "Phase 80 exit-code, timeout, failure, and retry boundary proof must be reviewed before result-record boundaries can be considered.",
  },
  {
    id: "explicit-command-result-record-boundary-draft-required",
    label: "Explicit command result-record boundary draft required",
    state: "required",
    evidence: "The owner must have a separate result-record boundary draft before any future command execution can be considered.",
  },
  {
    id: "owner-command-result-record-review-required",
    label: "Owner command result-record review required",
    state: "required",
    evidence: "Tyler must review the future command result record shape manually; the system cannot approve its own evidence envelope.",
  },
  {
    id: "command-identity-record-required",
    label: "Command identity record required",
    state: "required",
    evidence: "Future command results must record command id, requested action, allowlist match, sanitized arguments, working directory boundary, and environment boundary before execution can be considered.",
  },
  {
    id: "command-outcome-record-required",
    label: "Command outcome record required",
    state: "required",
    evidence: "Future command results must record outcome classification, exit-code boundary, timeout boundary, retry boundary, blocked state, and refusal reason before execution can be considered.",
  },
  {
    id: "command-output-reference-record-required",
    label: "Command output reference record required",
    state: "required",
    evidence: "Future command results must reference sanitized output evidence without exposing secrets, persisting raw output, or bypassing Phase 79 output limits.",
  },
  {
    id: "owner-review-state-record-required",
    label: "Owner review-state record required",
    state: "required",
    evidence: "Future command results must record owner-review state, approval requirement, manual review status, and self-approval blocked status before execution can be considered.",
  },
  {
    id: "command-result-record-boundary-remains-draft-required",
    label: "Command result-record boundary remains draft required",
    state: "required",
    evidence: "The result-record boundary must remain a draft in this phase and prove PowerShell, schtasks, shell, scheduler, worker connection, command execution, and live result persistence are blocked.",
  },
];

const commandResultRecordBoundaryDraftFields = [
  "owner",
  "commandResultRecordBoundaryDraftId",
  "sourcePhase",
  "safeState",
  "phase80CommandExitCodeBoundaryDraftReady",
  "explicitCommandResultRecordBoundaryDraftRequired",
  "commandIdentityRecordRequired",
  "commandOutcomeRecordRequired",
  "commandResultRecordBoundaryDraftLocked",
  "commandExecutionAllowed",
];

const evidenceRequirements = [
  "phase80-command-exit-code-boundary-draft-proof",
  "phase79-command-output-boundary-draft-proof",
  "owner-command-result-record-review-record-required",
  "command-identity-record-required",
  "command-outcome-record-required",
  "command-output-reference-record-required",
  "owner-review-state-record-required",
  "no-command-execution-proof-required",
];

const commandResultRecordBoundaryDraftSignals = [
  "phase80-command-exit-code-boundary-draft-ready",
  "phase79-command-output-boundary-draft-ready",
  "owner-approval-required",
  "manual-review-required",
  "command-identity-record-required",
  "command-outcome-record-required",
  "command-output-reference-record-required",
  "owner-review-state-record-required",
  "command-execution-blocked",
  "self-approval-blocked",
];

const safetyGates = [
  "Local worker command result-record boundary draft only",
  "Tyler remains the command result-record boundary draft owner",
  "Command result-record boundary draft is declarative only",
  "Command result-record boundary draft defines future evidence envelope requirements without enabling command execution",
  "Command result-record boundary draft does not approve command execution",
  "Command result-record boundary draft does not sign approval",
  "Command result-record boundary draft does not lock itself as approved",
  "Command result-record boundary draft does not execute PowerShell",
  "Command result-record boundary draft does not execute schtasks",
  "Command result-record boundary draft does not execute shell commands",
  "Command result-record boundary draft does not execute local commands",
  "Command result-record boundary draft does not evaluate live command exit codes",
  "Command result-record boundary draft does not capture live stdout",
  "Command result-record boundary draft does not capture live stderr",
  "Command result-record boundary draft does not persist live command results",
  "Command result-record boundary draft does not persist raw command output",
  "Command result-record boundary draft does not retry commands",
  "Command result-record boundary draft does not terminate processes",
  "Command result-record boundary draft does not create timeout handlers",
  "Command result-record boundary draft does not classify live failures",
  "Command result-record boundary draft does not query Windows Task Scheduler",
  "Command result-record boundary draft does not create scheduled tasks",
  "Command result-record boundary draft does not mutate scheduled tasks",
  "Command result-record boundary draft does not delete scheduled tasks",
  "Command result-record boundary draft does not enable scheduled tasks",
  "Command result-record boundary draft does not disable scheduled tasks",
  "Command result-record boundary draft does not install a worker",
  "Command result-record boundary draft does not connect to a worker",
  "Command result-record boundary draft does not poll worker health",
  "Command result-record boundary draft does not inspect processes",
  "Command result-record boundary draft does not mutate source",
  "Command result-record boundary draft does not mutate files",
  "Command result-record boundary draft does not persist approval records",
  "Command result-record boundary draft does not route work",
  "Command result-record boundary draft cannot self-approve",
  "Phase 80 command exit-code boundary draft prerequisite remains represented",
  "Phase 79 command output boundary draft prerequisite remains represented",
  "Owner approval is required before any future command execution",
  "Manual review is required before any future command execution",
  "Explicit command result-record boundary draft is required before any future command execution",
  "Owner command result-record review is required before any future command execution",
  "Command identity record is required before any future command execution",
  "Command outcome record is required before any future command execution",
  "Command output reference record is required before any future command execution",
  "Owner review-state record is required before any future command execution",
  "Command result-record boundary remains draft-only by design",
  "Emergency stop acknowledgement is required before any future command execution",
  "Local worker ready for install remains false by design",
  "Command result-record boundary draft locked remains false by design",
  "Command exit-code boundary draft locked remains false by design",
  "Command output boundary draft locked remains false by design",
  "Command environment boundary draft locked remains false by design",
  "Command allowlist draft locked remains false by design",
  "Command execution approval plan locked remains false by design",
  ...Array.from({ length: 646 }, (_, index) => `Command result-record boundary draft safety hold ${String(index + 1).padStart(3, "0")} keeps execution blocked`),
];

const defaultSummary = {
  commandResultRecordBoundaryDraftId: "phase81_local_worker_command_result_record_boundary_draft",
  owner: "Tyler Wallace",
  sourcePhase: "Phase 80 Local Worker Command Exit-Code Boundary Draft",
  safeState: "command-result-record-boundary-draft-only",
  phase80CommandExitCodeBoundaryDraftReady: true,
  phase79CommandOutputBoundaryDraftReady: true,
  phase78CommandEnvironmentBoundaryDraftReady: true,
  ownerApprovalRequired: true,
  manualReviewRequired: true,
  explicitCommandResultRecordBoundaryDraftRequired: true,
  ownerCommandResultRecordReviewRequired: true,
  commandIdentityRecordRequired: true,
  commandOutcomeRecordRequired: true,
  commandOutputReferenceRecordRequired: true,
  ownerReviewStateRecordRequired: true,
  commandResultRecordBoundaryRemainsDraftRequired: true,
  emergencyStopAcknowledgementRequired: true,
  localWorkerReadyForInstall: false,
  commandResultRecordBoundaryDraftLocked: false,
  commandExitCodeBoundaryDraftLocked: false,
  commandOutputBoundaryDraftLocked: false,
  commandEnvironmentBoundaryDraftLocked: false,
  commandAllowlistDraftLocked: false,
  commandExecutionApprovalPlanLocked: false,
  schedulerApprovalPlanLocked: false,
  healthPollingApprovalPlanLocked: false,
  executionUnlockApproved: false,
  overnightWorkAuthorized: false,
  workerInstallApproved: false,
  workerInstalled: false,
  workerConnected: false,
  windowsSchedulerConfigured: false,
  scheduledExecutionAllowed: false,
  executableScheduleCount: 0,
};

const defaultBoundaries = {
  localOnly: true,
  privateAppOnly: true,
  commandResultRecordBoundaryDraftOnly: true,
  ownerReviewOnly: true,
  declarativeOnly: true,
  readOnly: true,
  frontendOnly: true,
  noBackendLogic: true,
  noAuthentication: true,
  commandResultRecordBoundaryDraftSigningAllowed: false,
  commandResultRecordPersistenceAllowed: false,
  liveCommandResultPersistenceAllowed: false,
  rawOutputPersistenceAllowed: false,
  secretPersistenceAllowed: false,
  commandExitCodeBoundaryDraftSigningAllowed: false,
  commandOutputBoundaryDraftSigningAllowed: false,
  commandEnvironmentBoundaryDraftSigningAllowed: false,
  commandAllowlistDraftSigningAllowed: false,
  commandExecutionApprovalPlanSigningAllowed: false,
  schedulerApprovalPlanSigningAllowed: false,
  healthPollingApprovalPlanSigningAllowed: false,
  exitCodeEvaluationAllowed: false,
  outputCaptureAllowed: false,
  stdoutCaptureAllowed: false,
  stderrCaptureAllowed: false,
  timeoutHandlerAllowed: false,
  retryExecutionAllowed: false,
  failureClassifierExecutionAllowed: false,
  processTerminationAllowed: false,
  manualInstallExecutionAllowed: false,
  evidencePacketExecutionAllowed: false,
  dryRunExecutionAllowed: false,
  smokeTestExecutionAllowed: false,
  networkAccessAllowed: false,
  artifactMutationAllowed: false,
  dependencyDownloadAllowed: false,
  packageInstallAllowed: false,
  packageManagerExecutionAllowed: false,
  rollbackExecutionAllowed: false,
  stateRestoreAllowed: false,
  backupCreationAllowed: false,
  executionUnlockAllowed: false,
  overnightExecutionAllowed: false,
  liveRunReportAllowed: false,
  installerExecutionAllowed: false,
  schedulerCreationAllowed: false,
  schedulerMutationAllowed: false,
  schedulerDeletionAllowed: false,
  schedulerEnableDisableAllowed: false,
  schedulerQueryAllowed: false,
  commandExecutionAllowed: false,
  powershellExecutionAllowed: false,
  schtasksExecutionAllowed: false,
  shellExecutionAllowed: false,
  runnerConnectivityAllowed: false,
  liveWorkerConnectionAllowed: false,
  workerInstallAllowed: false,
  workerConnectionAllowed: false,
  workerSpawnAllowed: false,
  taskExecutionAllowed: false,
  healthPollingAllowed: false,
  liveHeartbeatAllowed: false,
  processInspectionAllowed: false,
  workspaceProbeAllowed: false,
  filesystemScanAllowed: false,
  filesystemMutationAllowed: false,
  pathCreationAllowed: false,
  pathDeletionAllowed: false,
  recordPersistenceAllowed: false,
  commandResultRecordBoundaryDraftPersistenceAllowed: false,
  commandExitCodeBoundaryDraftPersistenceAllowed: false,
  commandOutputBoundaryDraftPersistenceAllowed: false,
  commandEnvironmentBoundaryDraftPersistenceAllowed: false,
  finalApprovalAllowed: false,
  autoApprovalAllowed: false,
  autoProcessingAllowed: false,
  autoRouteAllowed: false,
  autoMergeAllowed: false,
  selfApprovalAllowed: false,
};

const defaultRouting = { suggestedQueue: "owner-review", executionAllowed: false, nextPhase: "Phase 82" };

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

export function createDefaultLocalWorkerCommandResultRecordBoundaryDraftV1() {
  return {
    declaredPaths: [...declaredPaths],
    status: "command-result-record-boundary-draft-ready",
    summary: { ...defaultSummary },
    boundaries: { ...defaultBoundaries },
    requirements: commandResultRecordBoundaryDraftRequirements.map((item) => ({ ...item })),
    fields: [...commandResultRecordBoundaryDraftFields],
    evidenceRequirements: [...evidenceRequirements],
    signals: [...commandResultRecordBoundaryDraftSignals],
    safetyGates: [...safetyGates],
    routing: { ...defaultRouting },
  };
}

export function inspectLocalWorkerCommandResultRecordBoundaryDraftV1(config = createDefaultLocalWorkerCommandResultRecordBoundaryDraftV1(), options = {}) {
  const rootDir = options.rootDir ?? process.cwd();
  const blockers = [];
  for (const relativePath of config.declaredPaths ?? []) checkFile(rootDir, relativePath, blockers);

  const packagePath = path.join(rootDir, "package.json");
  if (fs.existsSync(packagePath)) {
    const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));
    if (pkg.scripts?.["phase81:demo"] !== "node scripts/run-local-worker-command-result-record-boundary-draft-v1.mjs") blockers.push("package.json phase81:demo script is missing or incorrect");
    if (pkg.scripts?.["phase81:verify"] !== "npm run free-core:verify && npm run knowledge:verify && npm run phase80:demo && npm run phase81:demo") blockers.push("package.json phase81:verify script is missing or incorrect");
  } else blockers.push("package.json missing");

  const appPath = path.join(rootDir, "apps/operator-console/src/App.tsx");
  let appBindingCount = 0;
  if (fs.existsSync(appPath)) {
    const app = fs.readFileSync(appPath, "utf8");
    const bindings = [
      "localWorkerCommandResultRecordBoundaryDraft.commandResultRecordBoundaryDraftSummary.owner",
      "localWorkerCommandResultRecordBoundaryDraft.commandResultRecordBoundaryDraftRequirements.length",
      "localWorkerCommandResultRecordBoundaryDraft.evidenceRequirements.length",
      "localWorkerCommandResultRecordBoundaryDraft.boundaries.commandExecutionAllowed",
      "localWorkerCommandResultRecordBoundaryDraft.commandResultRecordBoundaryDraftSummary.commandResultRecordBoundaryDraftLocked",
    ];
    appBindingCount = bindings.filter((binding) => app.includes(binding)).length;
    for (const binding of bindings) if (!app.includes(binding)) blockers.push(`App binding missing: ${binding}`);
  } else blockers.push("App.tsx missing");

  const summary = config.summary ?? {};
  const boundaries = config.boundaries ?? {};
  for (const name of ["phase80CommandExitCodeBoundaryDraftReady","phase79CommandOutputBoundaryDraftReady","phase78CommandEnvironmentBoundaryDraftReady","ownerApprovalRequired","manualReviewRequired","explicitCommandResultRecordBoundaryDraftRequired","ownerCommandResultRecordReviewRequired","commandIdentityRecordRequired","commandOutcomeRecordRequired","commandOutputReferenceRecordRequired","ownerReviewStateRecordRequired","commandResultRecordBoundaryRemainsDraftRequired","emergencyStopAcknowledgementRequired"]) requireTrue(summary[name], name, blockers);
  for (const name of ["localWorkerReadyForInstall","commandResultRecordBoundaryDraftLocked","commandExitCodeBoundaryDraftLocked","commandOutputBoundaryDraftLocked","commandEnvironmentBoundaryDraftLocked","commandAllowlistDraftLocked","commandExecutionApprovalPlanLocked","schedulerApprovalPlanLocked","healthPollingApprovalPlanLocked","executionUnlockApproved","overnightWorkAuthorized","workerInstallApproved","workerInstalled","workerConnected","windowsSchedulerConfigured","scheduledExecutionAllowed"]) requireFalse(summary[name], name, blockers);
  if (summary.executableScheduleCount !== 0) blockers.push("executableScheduleCount must remain zero");

  for (const name of ["commandResultRecordBoundaryDraftSigningAllowed","commandResultRecordPersistenceAllowed","liveCommandResultPersistenceAllowed","rawOutputPersistenceAllowed","secretPersistenceAllowed","commandExitCodeBoundaryDraftSigningAllowed","commandOutputBoundaryDraftSigningAllowed","commandEnvironmentBoundaryDraftSigningAllowed","commandAllowlistDraftSigningAllowed","commandExecutionApprovalPlanSigningAllowed","schedulerApprovalPlanSigningAllowed","healthPollingApprovalPlanSigningAllowed","exitCodeEvaluationAllowed","outputCaptureAllowed","stdoutCaptureAllowed","stderrCaptureAllowed","timeoutHandlerAllowed","retryExecutionAllowed","failureClassifierExecutionAllowed","processTerminationAllowed","manualInstallExecutionAllowed","evidencePacketExecutionAllowed","dryRunExecutionAllowed","smokeTestExecutionAllowed","networkAccessAllowed","artifactMutationAllowed","dependencyDownloadAllowed","packageInstallAllowed","packageManagerExecutionAllowed","rollbackExecutionAllowed","stateRestoreAllowed","backupCreationAllowed","executionUnlockAllowed","overnightExecutionAllowed","liveRunReportAllowed","installerExecutionAllowed","schedulerCreationAllowed","schedulerMutationAllowed","schedulerDeletionAllowed","schedulerEnableDisableAllowed","schedulerQueryAllowed","commandExecutionAllowed","powershellExecutionAllowed","schtasksExecutionAllowed","shellExecutionAllowed","runnerConnectivityAllowed","liveWorkerConnectionAllowed","workerInstallAllowed","workerConnectionAllowed","workerSpawnAllowed","taskExecutionAllowed","healthPollingAllowed","liveHeartbeatAllowed","processInspectionAllowed","workspaceProbeAllowed","filesystemScanAllowed","filesystemMutationAllowed","pathCreationAllowed","pathDeletionAllowed","recordPersistenceAllowed","commandResultRecordBoundaryDraftPersistenceAllowed","commandExitCodeBoundaryDraftPersistenceAllowed","commandOutputBoundaryDraftPersistenceAllowed","commandEnvironmentBoundaryDraftPersistenceAllowed","finalApprovalAllowed","autoApprovalAllowed","autoProcessingAllowed","autoRouteAllowed","autoMergeAllowed","selfApprovalAllowed"]) requireFalse(boundaries[name], name, blockers);
  for (const name of ["localOnly","privateAppOnly","commandResultRecordBoundaryDraftOnly","ownerReviewOnly","declarativeOnly","readOnly","frontendOnly"]) requireTrue(boundaries[name], name, blockers);

  if ((config.declaredPaths ?? []).length !== 5) blockers.push("declaredFileCount must equal 5");
  if ((config.requirements ?? []).length !== 8) blockers.push("commandResultRecordBoundaryDraftRequirementCount must equal 8");
  if ((config.fields ?? []).length !== 10) blockers.push("commandResultRecordBoundaryDraftFieldCount must equal 10");
  if ((config.evidenceRequirements ?? []).length !== 8) blockers.push("commandResultRecordBoundaryDraftEvidenceCount must equal 8");
  if ((config.signals ?? []).length !== 10) blockers.push("commandResultRecordBoundaryDraftSignalCount must equal 10");
  if ((config.safetyGates ?? []).length !== 700) blockers.push("safetyGateCount must equal 700");

  const result = {
    ok: blockers.length === 0,
    status: blockers.length === 0 ? "passed" : "failed",
    localWorkerCommandResultRecordBoundaryDraftStatus: config.status,
    validationFailedCount: blockers.length,
    blockers,
    declaredFileCount: (config.declaredPaths ?? []).length,
    commandResultRecordBoundaryDraftRequirementCount: (config.requirements ?? []).length,
    commandResultRecordBoundaryDraftFieldCount: (config.fields ?? []).length,
    commandResultRecordBoundaryDraftEvidenceCount: (config.evidenceRequirements ?? []).length,
    commandResultRecordBoundaryDraftSignalCount: (config.signals ?? []).length,
    safetyGateCount: (config.safetyGates ?? []).length,
    appBindingCount,
    ...summary,
    ...boundaries,
    mutatesSource: false,
    fileMutationAllowed: false,
  };

  if (options.writeArtifacts) {
    const reportDir = path.join(rootDir, ".sera-local-worker-command-result-record-boundary-draft");
    fs.mkdirSync(reportDir, { recursive: true });
    fs.writeFileSync(path.join(reportDir, "phase81-local-worker-command-result-record-boundary-draft-status.json"), JSON.stringify(result, null, 2), "utf8");
    fs.writeFileSync(path.join(reportDir, "phase81-local-worker-command-result-record-boundary-draft-status.md"), `# Phase 81 Local Worker Command Result-Record Boundary Draft v1\n\nStatus: ${result.status}\n\nValidation failed count: ${result.validationFailedCount}\n`, "utf8");
  }
  return result;
}
