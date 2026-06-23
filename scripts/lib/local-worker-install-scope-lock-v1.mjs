import fs from "node:fs";
import path from "node:path";

const declaredPaths = [
  "docs/phases/PHASE_64_LOCAL_WORKER_INSTALL_SCOPE_LOCK_V1.md",
  "scripts/lib/local-worker-install-scope-lock-v1.mjs",
  "scripts/run-local-worker-install-scope-lock-v1.mjs",
  "tests/integration/local-worker-install-scope-lock-v1.test.ts",
  "apps/operator-console/src/local-worker-install-scope-lock.ts"
];

const installScopeLockRequirements = [
  "phase-63-approval-record-reviewed",
  "signed-scope-lock-required",
  "workspace-boundary-lock-required",
  "dependency-scope-lock-required",
  "rollback-target-lock-required",
  "install-evidence-target-required"
];

const installScopeLockFields = [
  "owner",
  "sourcePhase",
  "safeState",
  "phase63ApprovalRecordReady",
  "explicitScopeLockRequired",
  "installScopeLocked",
  "workerInstallApproved",
  "workerInstalled"
];

const installScopeLockSignals = [
  "scope lock surface",
  "phase 63 approval record dependency",
  "signed install scope requirement",
  "workspace boundary requirement",
  "dependency scope requirement",
  "rollback target requirement",
  "scope not locked signal",
  "actual install remains blocked"
];

const evidenceRequirements = [
  "Phase 63 approval record proof",
  "Signed install scope lock requirement",
  "Workspace boundary requirement",
  "Dependency scope inventory requirement",
  "Rollback target requirement",
  "Blocked install proof"
];

const safetyGates = [
  "Local worker install scope lock only",
  "Tyler remains the install scope lock owner",
  "Install scope lock is declarative only",
  "Install scope lock prepares owner review without approving installation",
  "Install scope lock does not sign approval",
  "Install scope lock does not lock scope as approved",
  "Install scope lock does not mark the worker ready for install",
  "Install scope lock does not approve the install plan",
  "Install scope lock does not approve the install approval record",
  "Install scope lock does not approve worker installation",
  "Install scope lock does not approve execution",
  "Install scope lock does not authorize overnight work",
  "Install scope lock does not install a worker",
  "Install scope lock does not download dependencies",
  "Install scope lock does not execute installers",
  "Install scope lock does not create files",
  "Install scope lock does not mutate files",
  "Install scope lock does not mutate source",
  "Install scope lock does not mutate the filesystem",
  "Install scope lock does not connect to a worker",
  "Install scope lock does not start a worker",
  "Install scope lock does not spawn a worker process",
  "Install scope lock does not poll worker health",
  "Install scope lock does not inspect running processes",
  "Install scope lock does not create scheduled tasks",
  "Install scope lock does not modify scheduled tasks",
  "Install scope lock does not delete scheduled tasks",
  "Install scope lock does not enable scheduled tasks",
  "Install scope lock does not disable scheduled tasks",
  "Install scope lock does not query Windows Task Scheduler",
  "Install scope lock does not run scheduled tasks",
  "Install scope lock does not execute PowerShell",
  "Install scope lock does not execute schtasks",
  "Install scope lock does not execute commands",
  "Install scope lock does not execute shell commands",
  "Install scope lock does not execute tasks",
  "Install scope lock does not persist task records",
  "Install scope lock does not persist owner records",
  "Install scope lock does not persist unlock proposal decisions",
  "Install scope lock does not persist install plan decisions",
  "Install scope lock does not persist approval records",
  "Install scope lock does not persist scope lock records",
  "Install scope lock does not connect to runner infrastructure",
  "Install scope lock does not route work",
  "Install scope lock does not process work automatically",
  "Install scope lock does not merge branches",
  "Install scope lock cannot self-approve",
  "Phase 63 approval record prerequisite remains represented",
  "Phase 62 install plan prerequisite remains represented",
  "Owner approval is required before any future install",
  "Manual review is required before any future install",
  "Explicit scope lock is required before any future install",
  "Signed install scope is required before any future install",
  "Workspace boundary is required before any future install",
  "Dependency scope is required before any future install",
  "Rollback target is required before any future install",
  "Install evidence target is required before any future install",
  "Local worker ready for install remains false by design",
  "Install scope locked remains false by design",
  "Install approval record approved remains false by design",
  "Install plan approved remains false by design",
  "Worker install approved remains false by design",
  "Execution unlock approved remains false by design",
  "Overnight work authorized remains false by design",
  "Worker installed remains false by design",
  "Worker connected remains false by design",
  "Windows scheduler configured remains false by design",
  "Scheduled execution remains false by design",
  "Executable schedule count remains zero",
  "Future install requires signed owner approval record",
  "Future install requires signed install scope lock",
  "Future install requires exact workspace path boundary",
  "Future install requires dependency inventory boundary",
  "Future install requires environment variable boundary",
  "Future install requires secret handling boundary",
  "Future install requires rollback target",
  "Future install requires install evidence target",
  "Future install requires worker health evidence target",
  "Future install requires dry-run smoke test acknowledgement",
  "Future install requires scheduler hold acknowledgement",
  "Future install requires command allowlist acknowledgement",
  "Future install requires emergency stop acknowledgement",
  "Future install requires session lock acknowledgement",
  "Future install requires audit evidence acknowledgement",
  "Future install requires no-secret leakage acknowledgement",
  "Future install requires approval revocation path",
  "Future install requires out-of-scope request handling",
  "Future install requires owner re-approval for scope changes",
  "No backend scope lock service",
  "No authentication changes",
  "No approval signing in this phase",
  "No scope lock signing in this phase",
  "No approval persistence in this phase",
  "No scope lock persistence in this phase",
  "No live worker connection",
  "No actual worker install",
  "No installer execution",
  "No dependency download"
];

export function createDefaultLocalWorkerInstallScopeLockV1() {
  return {
    declaredPaths: [...declaredPaths],
    summary: {
      localWorkerInstallScopeLockStatus: "scope-lock-ready",
      phase63ApprovalRecordReady: true,
      phase62InstallPlanReady: true,
      ownerApprovalRequired: true,
      manualReviewRequired: true,
      explicitScopeLockRequired: true,
      signedScopeRequired: true,
      workspaceBoundaryRequired: true,
      dependencyScopeRequired: true,
      rollbackTargetRequired: true,
      installEvidenceTargetRequired: true,
      localWorkerReadyForInstall: false,
      installScopeLocked: false,
      installApprovalRecordApproved: false,
      installPlanApproved: false,
      executionUnlockApproved: false,
      overnightWorkAuthorized: false,
      workerInstallApproved: false,
      workerInstalled: false,
      workerConnected: false,
      windowsSchedulerConfigured: false,
      scheduledExecutionAllowed: false,
      executableScheduleCount: 0,
    },
    counts: {
      installScopeLockRequirements,
      installScopeLockFields,
      installScopeLockSignals,
      evidenceRequirements,
      safetyGates,
    },
    boundaries: {
      localOnly: true,
      privateAppOnly: true,
      installScopeLockOnly: true,
      ownerReviewOnly: true,
      declarativeOnly: true,
      readOnly: true,
      frontendOnly: true,
      noBackendLogic: true,
      noAuthentication: true,
      scopeLockSigningAllowed: false,
      approvalRecordSigningAllowed: false,
      executionUnlockAllowed: false,
      overnightExecutionAllowed: false,
      liveRunReportAllowed: false,
      dependencyDownloadAllowed: false,
      installerExecutionAllowed: false,
      schedulerCreationAllowed: false,
      schedulerMutationAllowed: false,
      schedulerDeletionAllowed: false,
      schedulerEnableDisableAllowed: false,
      scheduledExecutionAllowed: false,
      schedulerQueryAllowed: false,
      powershellExecutionAllowed: false,
      schtasksExecutionAllowed: false,
      commandExecutionAllowed: false,
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
      mutatesSource: false,
      fileMutationAllowed: false,
      filesystemMutationAllowed: false,
      recordPersistenceAllowed: false,
      taskPersistenceAllowed: false,
      morningPacketPersistenceAllowed: false,
      readinessGatePersistenceAllowed: false,
      unlockProposalPersistenceAllowed: false,
      installPlanPersistenceAllowed: false,
      installApprovalRecordPersistenceAllowed: false,
      installScopeLockPersistenceAllowed: false,
      finalApprovalAllowed: false,
      autoApprovalAllowed: false,
      autoProcessingAllowed: false,
      autoRouteAllowed: false,
      autoMergeAllowed: false,
      selfApprovalAllowed: false,
    },
  };
}

function isSafeRelativePath(filePath) {
  return typeof filePath === "string" && filePath.length > 0 && !path.isAbsolute(filePath) && !filePath.split(/[\/]+/).includes("..");
}

function readIfExists(rootDir, relativePath) {
  const fullPath = path.join(rootDir, relativePath);
  return fs.existsSync(fullPath) ? fs.readFileSync(fullPath, "utf8") : "";
}

function writeReport(rootDir, result) {
  const outDir = path.join(rootDir, ".sera-local-worker-install-scope-lock");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "phase64-local-worker-install-scope-lock-status.json"), JSON.stringify(result, null, 2), "utf8");
  const markdown = [
    "# Phase 64 Local Worker Install Scope Lock v1",
    "",
    `Status: ${result.status}`,
    `Validation failed count: ${result.validationFailedCount}`,
    `Install scope lock status: ${result.localWorkerInstallScopeLockStatus}`,
    `Safety gates: ${result.safetyGateCount}`,
    `App bindings: ${result.appBindingCount}`,
    "",
    "This report is generated by the declarative Phase 64 scope-lock checker. It does not lock scope as approved, sign approval, approve installation, install a worker, download dependencies, execute installers, connect to a worker, run a scheduler, execute commands, execute tasks, persist scope records, mutate source, or self-approve.",
  ].join("\n");
  fs.writeFileSync(path.join(outDir, "phase64-local-worker-install-scope-lock-status.md"), `${markdown}
`, "utf8");
}

export function inspectLocalWorkerInstallScopeLockV1(config = createDefaultLocalWorkerInstallScopeLockV1(), options = {}) {
  const rootDir = options.rootDir ?? process.cwd();
  const blockers = [];

  for (const declaredPath of config.declaredPaths ?? []) {
    if (!isSafeRelativePath(declaredPath)) blockers.push(`Declared path must be safe and relative: ${declaredPath}`);
    else if (!fs.existsSync(path.join(rootDir, declaredPath))) blockers.push(`Declared path missing: ${declaredPath}`);
  }

  const appContent = readIfExists(rootDir, "apps/operator-console/src/App.tsx");
  const requiredAppBindings = [
    "localWorkerInstallScopeLockPacket.installScopeLockSummary.owner",
    "localWorkerInstallScopeLockPacket.installScopeLockRequirements.length",
    "localWorkerInstallScopeLockPacket.evidenceRequirements.length",
    "localWorkerInstallScopeLockPacket.boundaries.workerInstallAllowed",
    "localWorkerInstallScopeLockPacket.installScopeLockSummary.installScopeLocked",
  ];
  const missingAppBindings = requiredAppBindings.filter((binding) => !appContent.includes(binding));
  for (const binding of missingAppBindings) blockers.push(`App binding missing: ${binding}`);
  if (!appContent.includes("Local Worker Install Scope Lock")) blockers.push("App card missing: Local Worker Install Scope Lock");

  const pkgContent = readIfExists(rootDir, "package.json");
  if (!pkgContent.includes("phase64:demo")) blockers.push("package script missing: phase64:demo");
  if (!pkgContent.includes("phase64:verify")) blockers.push("package script missing: phase64:verify");

  const trueRequirements = [
    "phase63ApprovalRecordReady",
    "phase62InstallPlanReady",
    "ownerApprovalRequired",
    "manualReviewRequired",
    "explicitScopeLockRequired",
    "signedScopeRequired",
    "workspaceBoundaryRequired",
    "dependencyScopeRequired",
    "rollbackTargetRequired",
    "installEvidenceTargetRequired",
  ];
  for (const field of trueRequirements) {
    if (config.summary?.[field] !== true) blockers.push(`${field} must remain true`);
  }

  const falseSummary = [
    "localWorkerReadyForInstall",
    "installScopeLocked",
    "installApprovalRecordApproved",
    "installPlanApproved",
    "executionUnlockApproved",
    "overnightWorkAuthorized",
    "workerInstallApproved",
    "workerInstalled",
    "workerConnected",
    "windowsSchedulerConfigured",
    "scheduledExecutionAllowed",
  ];
  for (const field of falseSummary) {
    if (config.summary?.[field] !== false) blockers.push(`${field} must remain false`);
  }
  if (config.summary?.executableScheduleCount !== 0) blockers.push("executableScheduleCount must remain zero");

  const trueBoundaryRequirements = ["localOnly", "privateAppOnly", "installScopeLockOnly", "ownerReviewOnly", "declarativeOnly", "readOnly", "frontendOnly", "noBackendLogic", "noAuthentication"];
  for (const field of trueBoundaryRequirements) {
    if (config.boundaries?.[field] !== true) blockers.push(`${field} must remain true`);
  }

  const falseBoundaryRequirements = [
    "scopeLockSigningAllowed",
    "approvalRecordSigningAllowed",
    "executionUnlockAllowed",
    "overnightExecutionAllowed",
    "liveRunReportAllowed",
    "dependencyDownloadAllowed",
    "installerExecutionAllowed",
    "schedulerCreationAllowed",
    "schedulerMutationAllowed",
    "schedulerDeletionAllowed",
    "schedulerEnableDisableAllowed",
    "scheduledExecutionAllowed",
    "schedulerQueryAllowed",
    "powershellExecutionAllowed",
    "schtasksExecutionAllowed",
    "commandExecutionAllowed",
    "shellExecutionAllowed",
    "runnerConnectivityAllowed",
    "liveWorkerConnectionAllowed",
    "workerInstallAllowed",
    "workerConnectionAllowed",
    "workerSpawnAllowed",
    "taskExecutionAllowed",
    "healthPollingAllowed",
    "liveHeartbeatAllowed",
    "processInspectionAllowed",
    "mutatesSource",
    "fileMutationAllowed",
    "filesystemMutationAllowed",
    "recordPersistenceAllowed",
    "taskPersistenceAllowed",
    "morningPacketPersistenceAllowed",
    "readinessGatePersistenceAllowed",
    "unlockProposalPersistenceAllowed",
    "installPlanPersistenceAllowed",
    "installApprovalRecordPersistenceAllowed",
    "installScopeLockPersistenceAllowed",
    "finalApprovalAllowed",
    "autoApprovalAllowed",
    "autoProcessingAllowed",
    "autoRouteAllowed",
    "autoMergeAllowed",
    "selfApprovalAllowed",
  ];
  for (const field of falseBoundaryRequirements) {
    if (config.boundaries?.[field] !== false) blockers.push(`${field} must remain false`);
  }

  const result = {
    ok: blockers.length === 0,
    status: blockers.length === 0 ? "passed" : "blocked",
    localWorkerInstallScopeLockStatus: blockers.length === 0 ? "ready" : "blocked",
    validationFailedCount: blockers.length,
    blockers,
    declaredFileCount: config.declaredPaths?.length ?? 0,
    installScopeLockRequirementCount: config.counts?.installScopeLockRequirements?.length ?? 0,
    installScopeLockFieldCount: config.counts?.installScopeLockFields?.length ?? 0,
    installScopeLockEvidenceCount: config.counts?.evidenceRequirements?.length ?? 0,
    installScopeLockSignalCount: config.counts?.installScopeLockSignals?.length ?? 0,
    safetyGateCount: config.counts?.safetyGates?.length ?? 0,
    appBindingCount: requiredAppBindings.length,
    ...config.summary,
    ...config.boundaries,
  };

  if (result.declaredFileCount !== 5) result.blockers.push("declaredFileCount must equal 5");
  if (result.installScopeLockRequirementCount !== 6) result.blockers.push("installScopeLockRequirementCount must equal 6");
  if (result.installScopeLockFieldCount !== 8) result.blockers.push("installScopeLockFieldCount must equal 8");
  if (result.installScopeLockEvidenceCount !== 6) result.blockers.push("installScopeLockEvidenceCount must equal 6");
  if (result.installScopeLockSignalCount !== 8) result.blockers.push("installScopeLockSignalCount must equal 8");
  if (result.safetyGateCount !== 98) result.blockers.push("safetyGateCount must equal 98");
  if (result.appBindingCount !== 5) result.blockers.push("appBindingCount must equal 5");

  if (result.blockers.length > 0) {
    result.ok = false;
    result.status = "blocked";
    result.localWorkerInstallScopeLockStatus = "blocked";
    result.validationFailedCount = result.blockers.length;
  }

  if (options.writeArtifacts) writeReport(rootDir, result);
  return result;
}
