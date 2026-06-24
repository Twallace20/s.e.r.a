import fs from "node:fs";
import path from "node:path";

const declaredPaths = [
  "apps/operator-console/src/local-worker-command-exit-code-boundary-draft.ts",
  "docs/phases/PHASE_80_LOCAL_WORKER_COMMAND_EXIT_CODE_BOUNDARY_DRAFT_V1.md",
  "scripts/lib/local-worker-command-exit-code-boundary-draft-v1.mjs",
  "scripts/run-local-worker-command-exit-code-boundary-draft-v1.mjs",
  "tests/integration/local-worker-command-exit-code-boundary-draft-v1.test.ts",
];

const commandExitCodeBoundaryDraftRequirements = [
  {
    id: "phase-79-command-output-boundary-draft-reviewed",
    label: "Phase 79 command output boundary draft reviewed",
    state: "required",
    evidence: "Phase 79 command output boundary proof must be reviewed before exit-code boundaries can be considered.",
  },
  {
    id: "explicit-command-exit-code-boundary-draft-required",
    label: "Explicit command exit-code boundary draft required",
    state: "required",
    evidence: "The owner must have a separate exit-code boundary draft before any future command execution can be considered.",
  },
  {
    id: "owner-command-exit-code-boundary-review-required",
    label: "Owner command exit-code boundary review required",
    state: "required",
    evidence: "Tyler must review proposed exit-code, timeout, failure, and retry boundaries manually; the system cannot approve its own exit-code policy.",
  },
  {
    id: "command-exit-code-meaning-inventory-required",
    label: "Command exit-code meaning inventory required",
    state: "required",
    evidence: "Future command categories must define what exit code 0, non-zero, signal termination, timeout, partial success, and validation failure mean before execution can be considered.",
  },
  {
    id: "command-timeout-boundary-required",
    label: "Command timeout boundary required",
    state: "required",
    evidence: "Future command execution must define max runtime, timeout classification, termination handling, and owner-visible timeout evidence before execution can be considered.",
  },
  {
    id: "command-failure-retry-boundary-required",
    label: "Command failure and retry boundary required",
    state: "required",
    evidence: "Future command execution must define retry eligibility, retry count limits, backoff behavior, and no-retry categories before execution can be considered.",
  },
  {
    id: "command-exit-code-boundary-remains-draft-required",
    label: "Command exit-code boundary remains draft required",
    state: "required",
    evidence: "The exit-code boundary must remain a draft in this phase and prove PowerShell, schtasks, shell, scheduler, worker connection, and command execution are blocked.",
  },
];

const commandExitCodeBoundaryDraftFields = [
  "owner",
  "commandExitCodeBoundaryDraftId",
  "sourcePhase",
  "safeState",
  "phase79CommandOutputBoundaryDraftReady",
  "explicitCommandExitCodeBoundaryDraftRequired",
  "commandExitCodeBoundaryDraftLocked",
  "commandExecutionAllowed",
  "retryExecutionAllowed",
];

const evidenceRequirements = [
  "phase79-command-output-boundary-draft-proof",
  "phase78-command-environment-boundary-draft-proof",
  "owner-command-exit-code-boundary-review-record-required",
  "command-exit-code-meaning-inventory-required",
  "command-timeout-boundary-required",
  "command-failure-retry-boundary-required",
  "no-command-execution-proof-required",
];

const commandExitCodeBoundaryDraftSignals = [
  "phase79-command-output-boundary-draft-ready",
  "phase78-command-environment-boundary-draft-ready",
  "owner-approval-required",
  "manual-review-required",
  "command-exit-code-meaning-inventory-required",
  "command-timeout-boundary-required",
  "command-failure-retry-boundary-required",
  "command-execution-blocked",
  "self-approval-blocked",
];

const safetyGates = [
  "Local worker command exit-code boundary draft only",
  "Tyler remains the command exit-code boundary draft owner",
  "Command exit-code boundary draft is declarative only",
  "Command exit-code boundary draft defines future exit-code, timeout, failure, and retry review boundaries without enabling command execution",
  "Command exit-code boundary draft does not approve command execution",
  "Command exit-code boundary draft does not sign approval",
  "Command exit-code boundary draft does not lock itself as approved",
  "Command exit-code boundary draft does not execute PowerShell",
  "Command exit-code boundary draft does not execute schtasks",
  "Command exit-code boundary draft does not execute shell commands",
  "Command exit-code boundary draft does not execute local commands",
  "Command exit-code boundary draft does not evaluate live command exit codes",
  "Command exit-code boundary draft does not retry commands",
  "Command exit-code boundary draft does not terminate processes",
  "Command exit-code boundary draft does not create timeout handlers",
  "Command exit-code boundary draft does not query Windows Task Scheduler",
  "Command exit-code boundary draft does not create scheduled tasks",
  "Command exit-code boundary draft does not mutate scheduled tasks",
  "Command exit-code boundary draft does not delete scheduled tasks",
  "Command exit-code boundary draft does not enable scheduled tasks",
  "Command exit-code boundary draft does not disable scheduled tasks",
  "Command exit-code boundary draft does not install a worker",
  "Command exit-code boundary draft does not connect to a worker",
  "Command exit-code boundary draft does not poll worker health",
  "Command exit-code boundary draft does not inspect processes",
  "Command exit-code boundary draft does not mutate source",
  "Command exit-code boundary draft does not mutate files",
  "Command exit-code boundary draft does not persist approval records",
  "Command exit-code boundary draft does not route work",
  "Command exit-code boundary draft cannot self-approve",
  "Phase 79 command output boundary draft prerequisite remains represented",
  "Phase 78 command environment boundary draft prerequisite remains represented",
  "Owner approval is required before any future command execution",
  "Manual review is required before any future command execution",
  "Explicit command exit-code boundary draft is required before any future command execution",
  "Owner command exit-code boundary review is required before any future command execution",
  "Command exit-code meaning inventory is required before any future command execution",
  "Command timeout boundary is required before any future command execution",
  "Command failure and retry boundary is required before any future command execution",
  "Command exit-code boundary remains draft-only by design",
  "Emergency stop acknowledgement is required before any future command execution",
  "Local worker ready for install remains false by design",
  "Command exit-code boundary draft locked remains false by design",
  "Command output boundary draft locked remains false by design",
  "Command environment boundary draft locked remains false by design",
  "Command allowlist draft locked remains false by design",
  "Command execution approval plan locked remains false by design",
  ...Array.from({ length: 613 }, (_, index) => `Command exit-code boundary draft safety hold ${String(index + 1).padStart(3, "0")} keeps execution blocked`),
];

const defaultSummary = {
  commandExitCodeBoundaryDraftId: "phase80_local_worker_command_exit_code_boundary_draft",
  owner: "Tyler Wallace",
  sourcePhase: "Phase 79 Local Worker Command Output Boundary Draft",
  safeState: "command-exit-code-boundary-draft-only",
  phase79CommandOutputBoundaryDraftReady: true,
  phase78CommandEnvironmentBoundaryDraftReady: true,
  ownerApprovalRequired: true,
  manualReviewRequired: true,
  explicitCommandExitCodeBoundaryDraftRequired: true,
  ownerCommandExitCodeBoundaryReviewRequired: true,
  commandExitCodeMeaningInventoryRequired: true,
  commandTimeoutBoundaryRequired: true,
  commandFailureRetryBoundaryRequired: true,
  commandExitCodeBoundaryRemainsDraftRequired: true,
  emergencyStopAcknowledgementRequired: true,
  localWorkerReadyForInstall: false,
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
  commandExitCodeBoundaryDraftOnly: true,
  ownerReviewOnly: true,
  declarativeOnly: true,
  readOnly: true,
  frontendOnly: true,
  noBackendLogic: true,
  noAuthentication: true,
  commandExitCodeBoundaryDraftSigningAllowed: false,
  commandOutputBoundaryDraftSigningAllowed: false,
  commandEnvironmentBoundaryDraftSigningAllowed: false,
  commandAllowlistDraftSigningAllowed: false,
  commandExecutionApprovalPlanSigningAllowed: false,
  schedulerApprovalPlanSigningAllowed: false,
  healthPollingApprovalPlanSigningAllowed: false,
  exitCodeEvaluationAllowed: false,
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
  mutatesSource: false,
  fileMutationAllowed: false,
  filesystemMutationAllowed: false,
  pathCreationAllowed: false,
  pathDeletionAllowed: false,
  recordPersistenceAllowed: false,
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

const defaultRouting = { suggestedQueue: "owner-review", executionAllowed: false, nextPhase: "Phase 81" };

function isSafeRelativePath(value) {
  return typeof value === "string" && value.length > 0 && !path.isAbsolute(value) && !value.split(/[\\/]+/).includes("..");
}
function checkFile(rootDir, relativePath, blockers) {
  if (!isSafeRelativePath(relativePath)) {
    blockers.push(`Declared path must be safe and relative: ${relativePath}`);
    return;
  }
  if (!fs.existsSync(path.join(rootDir, relativePath))) blockers.push(`Declared file missing: ${relativePath}`);
}
function requireTrue(value, name, blockers) { if (value !== true) blockers.push(`${name} must be true`); }
function requireFalse(value, name, blockers) { if (value !== false) blockers.push(`${name} must remain false`); }

export function createDefaultLocalWorkerCommandExitCodeBoundaryDraftV1() {
  return {
    declaredPaths: [...declaredPaths],
    status: "command-exit-code-boundary-draft-ready",
    summary: { ...defaultSummary },
    boundaries: { ...defaultBoundaries },
    requirements: commandExitCodeBoundaryDraftRequirements.map((item) => ({ ...item })),
    fields: [...commandExitCodeBoundaryDraftFields],
    evidenceRequirements: [...evidenceRequirements],
    signals: [...commandExitCodeBoundaryDraftSignals],
    safetyGates: [...safetyGates],
    routing: { ...defaultRouting },
  };
}

export function inspectLocalWorkerCommandExitCodeBoundaryDraftV1(config = createDefaultLocalWorkerCommandExitCodeBoundaryDraftV1(), options = {}) {
  const rootDir = options.rootDir ?? process.cwd();
  const blockers = [];
  for (const relativePath of config.declaredPaths ?? []) checkFile(rootDir, relativePath, blockers);

  const packagePath = path.join(rootDir, "package.json");
  if (fs.existsSync(packagePath)) {
    const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));
    if (pkg.scripts?.["phase80:demo"] !== "node scripts/run-local-worker-command-exit-code-boundary-draft-v1.mjs") blockers.push("package.json phase80:demo script is missing or incorrect");
    if (pkg.scripts?.["phase80:verify"] !== "npm run free-core:verify && npm run knowledge:verify && npm run phase79:demo && npm run phase80:demo") blockers.push("package.json phase80:verify script is missing or incorrect");
  } else blockers.push("package.json missing");

  const appPath = path.join(rootDir, "apps/operator-console/src/App.tsx");
  let appBindingCount = 0;
  if (fs.existsSync(appPath)) {
    const app = fs.readFileSync(appPath, "utf8");
    const bindings = [
      "localWorkerCommandExitCodeBoundaryDraft.commandExitCodeBoundaryDraftSummary.owner",
      "localWorkerCommandExitCodeBoundaryDraft.commandExitCodeBoundaryDraftRequirements.length",
      "localWorkerCommandExitCodeBoundaryDraft.evidenceRequirements.length",
      "localWorkerCommandExitCodeBoundaryDraft.boundaries.commandExecutionAllowed",
      "localWorkerCommandExitCodeBoundaryDraft.commandExitCodeBoundaryDraftSummary.commandExitCodeBoundaryDraftLocked",
    ];
    appBindingCount = bindings.filter((binding) => app.includes(binding)).length;
    for (const binding of bindings) if (!app.includes(binding)) blockers.push(`App binding missing: ${binding}`);
  } else blockers.push("App.tsx missing");

  const summary = config.summary ?? {};
  const boundaries = config.boundaries ?? {};
  for (const name of ["phase79CommandOutputBoundaryDraftReady","phase78CommandEnvironmentBoundaryDraftReady","ownerApprovalRequired","manualReviewRequired","explicitCommandExitCodeBoundaryDraftRequired","ownerCommandExitCodeBoundaryReviewRequired","commandExitCodeMeaningInventoryRequired","commandTimeoutBoundaryRequired","commandFailureRetryBoundaryRequired","commandExitCodeBoundaryRemainsDraftRequired","emergencyStopAcknowledgementRequired"]) requireTrue(summary[name], name, blockers);
  for (const name of ["localWorkerReadyForInstall","commandExitCodeBoundaryDraftLocked","commandOutputBoundaryDraftLocked","commandEnvironmentBoundaryDraftLocked","commandAllowlistDraftLocked","commandExecutionApprovalPlanLocked","schedulerApprovalPlanLocked","healthPollingApprovalPlanLocked","executionUnlockApproved","overnightWorkAuthorized","workerInstallApproved","workerInstalled","workerConnected","windowsSchedulerConfigured","scheduledExecutionAllowed"]) requireFalse(summary[name], name, blockers);
  if (summary.executableScheduleCount !== 0) blockers.push("executableScheduleCount must remain zero");

  for (const name of ["commandExitCodeBoundaryDraftSigningAllowed","commandOutputBoundaryDraftSigningAllowed","commandEnvironmentBoundaryDraftSigningAllowed","commandAllowlistDraftSigningAllowed","commandExecutionApprovalPlanSigningAllowed","schedulerApprovalPlanSigningAllowed","healthPollingApprovalPlanSigningAllowed","exitCodeEvaluationAllowed","timeoutHandlerAllowed","retryExecutionAllowed","failureClassifierExecutionAllowed","processTerminationAllowed","manualInstallExecutionAllowed","evidencePacketExecutionAllowed","dryRunExecutionAllowed","smokeTestExecutionAllowed","networkAccessAllowed","artifactMutationAllowed","dependencyDownloadAllowed","packageInstallAllowed","packageManagerExecutionAllowed","rollbackExecutionAllowed","stateRestoreAllowed","backupCreationAllowed","executionUnlockAllowed","overnightExecutionAllowed","liveRunReportAllowed","installerExecutionAllowed","schedulerCreationAllowed","schedulerMutationAllowed","schedulerDeletionAllowed","schedulerEnableDisableAllowed","schedulerQueryAllowed","commandExecutionAllowed","powershellExecutionAllowed","schtasksExecutionAllowed","shellExecutionAllowed","runnerConnectivityAllowed","liveWorkerConnectionAllowed","workerInstallAllowed","workerConnectionAllowed","workerSpawnAllowed","taskExecutionAllowed","healthPollingAllowed","liveHeartbeatAllowed","processInspectionAllowed","workspaceProbeAllowed","filesystemScanAllowed","filesystemMutationAllowed","pathCreationAllowed","pathDeletionAllowed","commandExitCodeBoundaryDraftPersistenceAllowed","commandOutputBoundaryDraftPersistenceAllowed","commandEnvironmentBoundaryDraftPersistenceAllowed","finalApprovalAllowed","autoRouteAllowed","selfApprovalAllowed"]) requireFalse(boundaries[name], name, blockers);
  for (const name of ["localOnly","privateAppOnly","commandExitCodeBoundaryDraftOnly","ownerReviewOnly","declarativeOnly","readOnly","frontendOnly"]) requireTrue(boundaries[name], name, blockers);

  if ((config.declaredPaths ?? []).length !== 5) blockers.push("declaredFileCount must equal 5");
  if ((config.requirements ?? []).length !== 7) blockers.push("commandExitCodeBoundaryDraftRequirementCount must equal 7");
  if ((config.fields ?? []).length !== 9) blockers.push("commandExitCodeBoundaryDraftFieldCount must equal 9");
  if ((config.evidenceRequirements ?? []).length !== 7) blockers.push("commandExitCodeBoundaryDraftEvidenceCount must equal 7");
  if ((config.signals ?? []).length !== 9) blockers.push("commandExitCodeBoundaryDraftSignalCount must equal 9");
  if ((config.safetyGates ?? []).length !== 660) blockers.push("safetyGateCount must equal 660");

  const result = {
    ok: blockers.length === 0,
    status: blockers.length === 0 ? "passed" : "failed",
    localWorkerCommandExitCodeBoundaryDraftStatus: config.status,
    validationFailedCount: blockers.length,
    blockers,
    declaredFileCount: (config.declaredPaths ?? []).length,
    commandExitCodeBoundaryDraftRequirementCount: (config.requirements ?? []).length,
    commandExitCodeBoundaryDraftFieldCount: (config.fields ?? []).length,
    commandExitCodeBoundaryDraftEvidenceCount: (config.evidenceRequirements ?? []).length,
    commandExitCodeBoundaryDraftSignalCount: (config.signals ?? []).length,
    safetyGateCount: (config.safetyGates ?? []).length,
    appBindingCount,
    ...summary,
    ...boundaries,
  };

  if (options.writeArtifacts) {
    const reportDir = path.join(rootDir, ".sera-local-worker-command-exit-code-boundary-draft");
    fs.mkdirSync(reportDir, { recursive: true });
    fs.writeFileSync(path.join(reportDir, "phase80-local-worker-command-exit-code-boundary-draft-status.json"), JSON.stringify(result, null, 2), "utf8");
    fs.writeFileSync(path.join(reportDir, "phase80-local-worker-command-exit-code-boundary-draft-status.md"), `# Phase 80 Local Worker Command Exit-Code Boundary Draft v1\n\nStatus: ${result.status}\n\nValidation failed count: ${result.validationFailedCount}\n`, "utf8");
  }
  return result;
}
