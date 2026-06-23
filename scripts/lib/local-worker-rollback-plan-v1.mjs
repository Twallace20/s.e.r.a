import fs from "node:fs";
import path from "node:path";

const declaredPaths = [
  "docs/phases/PHASE_66_LOCAL_WORKER_ROLLBACK_PLAN_V1.md",
  "scripts/lib/local-worker-rollback-plan-v1.mjs",
  "scripts/run-local-worker-rollback-plan-v1.mjs",
  "tests/integration/local-worker-rollback-plan-v1.test.ts",
  "apps/operator-console/src/local-worker-rollback-plan.ts"
];

const rollbackPlanRequirements = [
  "phase-65-workspace-boundary-reviewed",
  "rollback-target-required",
  "rollback-trigger-required",
  "state-restore-boundary-required",
  "rollback-evidence-target-required",
  "owner-rollback-approval-required"
];
const rollbackPlanFields = [
  "owner",
  "sourcePhase",
  "safeState",
  "phase65WorkspaceBoundaryReady",
  "rollbackTargetRequired",
  "rollbackPlanLocked",
  "workerInstallApproved",
  "workerInstalled"
];
const rollbackPlanSignals = [
  "rollback plan surface",
  "phase 65 workspace boundary dependency",
  "rollback target requirement",
  "rollback trigger requirement",
  "state restore boundary requirement",
  "rollback evidence target requirement",
  "rollback plan not locked signal",
  "actual install remains blocked"
];
const evidenceRequirements = [
  "Phase 65 workspace boundary proof",
  "Rollback target requirement",
  "Rollback trigger requirement",
  "State restore boundary requirement",
  "Rollback evidence target requirement",
  "Blocked install proof"
];
const safetyGates = [
  "Local worker rollback plan only",
  "Tyler remains the rollback plan owner",
  "Rollback plan is declarative only",
  "Rollback plan prepares owner review without approving installation",
  "Rollback plan does not sign approval",
  "Rollback plan does not lock rollback as approved",
  "Rollback plan does not execute rollback",
  "Rollback plan does not restore state",
  "Rollback plan does not create backups",
  "Rollback plan does not mark the worker ready for install",
  "Rollback plan does not approve the install plan",
  "Rollback plan does not approve the install approval record",
  "Rollback plan does not approve the scope lock",
  "Rollback plan does not approve the workspace boundary",
  "Rollback plan does not approve worker installation",
  "Rollback plan does not approve execution",
  "Rollback plan does not authorize overnight work",
  "Rollback plan does not install a worker",
  "Rollback plan does not download dependencies",
  "Rollback plan does not execute installers",
  "Rollback plan does not create files",
  "Rollback plan does not mutate files",
  "Rollback plan does not mutate source",
  "Rollback plan does not mutate the filesystem",
  "Rollback plan does not connect to a worker",
  "Rollback plan does not start a worker",
  "Rollback plan does not spawn a worker process",
  "Rollback plan does not poll worker health",
  "Rollback plan does not inspect running processes",
  "Rollback plan does not create scheduled tasks",
  "Rollback plan does not modify scheduled tasks",
  "Rollback plan does not delete scheduled tasks",
  "Rollback plan does not enable scheduled tasks",
  "Rollback plan does not disable scheduled tasks",
  "Rollback plan does not query Windows Task Scheduler",
  "Rollback plan does not run scheduled tasks",
  "Rollback plan does not execute PowerShell",
  "Rollback plan does not execute schtasks",
  "Rollback plan does not execute commands",
  "Rollback plan does not execute shell commands",
  "Rollback plan does not execute tasks",
  "Rollback plan does not persist task records",
  "Rollback plan does not persist owner records",
  "Rollback plan does not persist unlock proposal decisions",
  "Rollback plan does not persist install plan decisions",
  "Rollback plan does not persist approval records",
  "Rollback plan does not persist scope lock records",
  "Rollback plan does not persist workspace boundary records",
  "Rollback plan does not persist rollback records",
  "Rollback plan does not connect to runner infrastructure",
  "Rollback plan does not route work",
  "Rollback plan does not process work automatically",
  "Rollback plan does not merge branches",
  "Rollback plan cannot self-approve",
  "Phase 65 workspace boundary prerequisite remains represented",
  "Phase 64 scope lock prerequisite remains represented",
  "Owner approval is required before any future install",
  "Manual review is required before any future install",
  "Explicit rollback plan is required before any future install",
  "Rollback target is required before any future install",
  "Rollback trigger is required before any future install",
  "State restore boundary is required before any future install",
  "Rollback evidence target is required before any future install",
  "Owner rollback approval is required before any future install",
  "Local worker ready for install remains false by design",
  "Rollback plan locked remains false by design",
  "Workspace boundary locked remains false by design",
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
  "Future install requires signed workspace boundary",
  "Future install requires signed rollback plan",
  "Future install requires exact workspace path boundary",
  "Future install requires allowed workspace path inventory",
  "Future install requires blocked workspace path inventory",
  "Future install requires dependency inventory boundary",
  "Future install requires environment variable boundary",
  "Future install requires secret handling boundary",
  "Future install requires rollback target",
  "Future install requires rollback trigger map",
  "Future install requires state restore boundary",
  "Future install requires rollback evidence target",
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
  "Future install requires owner re-approval for rollback changes",
  "No backend rollback service",
  "No authentication changes",
  "No approval signing in this phase",
  "No scope lock signing in this phase",
  "No workspace boundary signing in this phase",
  "No rollback plan signing in this phase",
  "No approval persistence in this phase",
  "No scope lock persistence in this phase",
  "No workspace boundary persistence in this phase",
  "No rollback plan persistence in this phase",
  "No live worker connection",
  "No actual worker install",
  "No installer execution",
  "No dependency download",
  "No workspace probing",
  "No filesystem scanning",
  "No path creation",
  "No path deletion",
  "No rollback execution",
  "No state restore execution",
  "No backup creation"
];

export function createDefaultLocalWorkerRollbackPlanV1() {
  return {
    declaredPaths: [...declaredPaths],
    summary: {
      localWorkerRollbackPlanStatus: "rollback-plan-ready",
      phase65WorkspaceBoundaryReady: true,
      phase64ScopeLockReady: true,
      ownerApprovalRequired: true,
      manualReviewRequired: true,
      explicitRollbackPlanRequired: true,
      rollbackTargetRequired: true,
      rollbackTriggerRequired: true,
      stateRestoreBoundaryRequired: true,
      rollbackEvidenceTargetRequired: true,
      ownerRollbackApprovalRequired: true,
      localWorkerReadyForInstall: false,
      rollbackPlanLocked: false,
      workspaceBoundaryLocked: false,
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
    counts: { rollbackPlanRequirements, rollbackPlanFields, rollbackPlanSignals, evidenceRequirements, safetyGates },
    boundaries: {
      localOnly: true,
      privateAppOnly: true,
      rollbackPlanOnly: true,
      ownerReviewOnly: true,
      declarativeOnly: true,
      readOnly: true,
      frontendOnly: true,
      noBackendLogic: true,
      noAuthentication: true,
      rollbackPlanSigningAllowed: false,
      workspaceBoundarySigningAllowed: false,
      scopeLockSigningAllowed: false,
      approvalRecordSigningAllowed: false,
      rollbackExecutionAllowed: false,
      stateRestoreAllowed: false,
      backupCreationAllowed: false,
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
      workspaceProbeAllowed: false,
      filesystemScanAllowed: false,
      mutatesSource: false,
      fileMutationAllowed: false,
      filesystemMutationAllowed: false,
      pathCreationAllowed: false,
      pathDeletionAllowed: false,
      recordPersistenceAllowed: false,
      taskPersistenceAllowed: false,
      morningPacketPersistenceAllowed: false,
      readinessGatePersistenceAllowed: false,
      unlockProposalPersistenceAllowed: false,
      installPlanPersistenceAllowed: false,
      installApprovalRecordPersistenceAllowed: false,
      installScopeLockPersistenceAllowed: false,
      workspaceBoundaryPersistenceAllowed: false,
      rollbackPlanPersistenceAllowed: false,
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
  const outDir = path.join(rootDir, ".sera-local-worker-rollback-plan");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "phase66-local-worker-rollback-plan-status.json"), JSON.stringify(result, null, 2), "utf8");
  const markdown = [
    "# Phase 66 Local Worker Rollback Plan v1",
    "",
    `Status: ${result.status}`,
    `Validation failed count: ${result.validationFailedCount}`,
    `Rollback plan status: ${result.localWorkerRollbackPlanStatus}`,
    `Safety gates: ${result.safetyGateCount}`,
    `App bindings: ${result.appBindingCount}`,
    "",
    "This report is generated by the declarative Phase 66 rollback-plan checker. It does not lock rollback as approved, sign approval, execute rollback, restore state, create backups, approve installation, install a worker, download dependencies, execute installers, connect to a worker, probe or scan the filesystem, run a scheduler, execute commands, execute tasks, persist rollback plan records, mutate source, or self-approve.",
  ].join("\n");
  fs.writeFileSync(path.join(outDir, "phase66-local-worker-rollback-plan-status.md"), `${markdown}
`, "utf8");
}

export function inspectLocalWorkerRollbackPlanV1(config = createDefaultLocalWorkerRollbackPlanV1(), options = {}) {
  const rootDir = options.rootDir ?? process.cwd();
  const blockers = [];

  for (const declaredPath of config.declaredPaths ?? []) {
    if (!isSafeRelativePath(declaredPath)) blockers.push(`Declared path must be safe and relative: ${declaredPath}`);
    else if (!fs.existsSync(path.join(rootDir, declaredPath))) blockers.push(`Declared path missing: ${declaredPath}`);
  }

  const appContent = readIfExists(rootDir, "apps/operator-console/src/App.tsx");
  const requiredAppBindings = [
    "localWorkerRollbackPlanPacket.rollbackPlanSummary.owner",
    "localWorkerRollbackPlanPacket.rollbackPlanRequirements.length",
    "localWorkerRollbackPlanPacket.evidenceRequirements.length",
    "localWorkerRollbackPlanPacket.boundaries.workerInstallAllowed",
    "localWorkerRollbackPlanPacket.rollbackPlanSummary.rollbackPlanLocked",
  ];
  const missingAppBindings = requiredAppBindings.filter((binding) => !appContent.includes(binding));
  for (const binding of missingAppBindings) blockers.push(`App binding missing: ${binding}`);
  if (!appContent.includes("Local Worker Rollback Plan")) blockers.push("App card missing: Local Worker Rollback Plan");

  const pkgContent = readIfExists(rootDir, "package.json");
  if (!pkgContent.includes("phase66:demo")) blockers.push("package script missing: phase66:demo");
  if (!pkgContent.includes("phase66:verify")) blockers.push("package script missing: phase66:verify");

  const trueRequirements = ["phase65WorkspaceBoundaryReady", "phase64ScopeLockReady", "ownerApprovalRequired", "manualReviewRequired", "explicitRollbackPlanRequired", "rollbackTargetRequired", "rollbackTriggerRequired", "stateRestoreBoundaryRequired", "rollbackEvidenceTargetRequired", "ownerRollbackApprovalRequired"];
  for (const field of trueRequirements) if (config.summary?.[field] !== true) blockers.push(`${field} must remain true`);

  const falseSummary = ["localWorkerReadyForInstall", "rollbackPlanLocked", "workspaceBoundaryLocked", "installScopeLocked", "installApprovalRecordApproved", "installPlanApproved", "executionUnlockApproved", "overnightWorkAuthorized", "workerInstallApproved", "workerInstalled", "workerConnected", "windowsSchedulerConfigured", "scheduledExecutionAllowed"];
  for (const field of falseSummary) if (config.summary?.[field] !== false) blockers.push(`${field} must remain false`);
  if (config.summary?.executableScheduleCount !== 0) blockers.push("executableScheduleCount must remain zero");

  const trueBoundaryRequirements = ["localOnly", "privateAppOnly", "rollbackPlanOnly", "ownerReviewOnly", "declarativeOnly", "readOnly", "frontendOnly", "noBackendLogic", "noAuthentication"];
  for (const field of trueBoundaryRequirements) if (config.boundaries?.[field] !== true) blockers.push(`${field} must remain true`);

  const falseBoundaryRequirements = ["rollbackPlanSigningAllowed", "workspaceBoundarySigningAllowed", "scopeLockSigningAllowed", "approvalRecordSigningAllowed", "rollbackExecutionAllowed", "stateRestoreAllowed", "backupCreationAllowed", "executionUnlockAllowed", "overnightExecutionAllowed", "liveRunReportAllowed", "dependencyDownloadAllowed", "installerExecutionAllowed", "schedulerCreationAllowed", "schedulerMutationAllowed", "schedulerDeletionAllowed", "schedulerEnableDisableAllowed", "scheduledExecutionAllowed", "schedulerQueryAllowed", "powershellExecutionAllowed", "schtasksExecutionAllowed", "commandExecutionAllowed", "shellExecutionAllowed", "runnerConnectivityAllowed", "liveWorkerConnectionAllowed", "workerInstallAllowed", "workerConnectionAllowed", "workerSpawnAllowed", "taskExecutionAllowed", "healthPollingAllowed", "liveHeartbeatAllowed", "processInspectionAllowed", "workspaceProbeAllowed", "filesystemScanAllowed", "mutatesSource", "fileMutationAllowed", "filesystemMutationAllowed", "pathCreationAllowed", "pathDeletionAllowed", "recordPersistenceAllowed", "taskPersistenceAllowed", "morningPacketPersistenceAllowed", "readinessGatePersistenceAllowed", "unlockProposalPersistenceAllowed", "installPlanPersistenceAllowed", "installApprovalRecordPersistenceAllowed", "installScopeLockPersistenceAllowed", "workspaceBoundaryPersistenceAllowed", "rollbackPlanPersistenceAllowed", "finalApprovalAllowed", "autoApprovalAllowed", "autoProcessingAllowed", "autoRouteAllowed", "autoMergeAllowed", "selfApprovalAllowed"];
  for (const field of falseBoundaryRequirements) if (config.boundaries?.[field] !== false) blockers.push(`${field} must remain false`);

  const result = {
    ok: blockers.length === 0,
    status: blockers.length === 0 ? "passed" : "blocked",
    localWorkerRollbackPlanStatus: blockers.length === 0 ? config.summary.localWorkerRollbackPlanStatus : "blocked",
    validationFailedCount: blockers.length,
    blockers,
    declaredFileCount: config.declaredPaths?.length ?? 0,
    rollbackPlanRequirementCount: config.counts?.rollbackPlanRequirements?.length ?? 0,
    rollbackPlanFieldCount: config.counts?.rollbackPlanFields?.length ?? 0,
    rollbackPlanEvidenceCount: config.counts?.evidenceRequirements?.length ?? 0,
    rollbackPlanSignalCount: config.counts?.rollbackPlanSignals?.length ?? 0,
    safetyGateCount: config.counts?.safetyGates?.length ?? 0,
    appBindingCount: requiredAppBindings.length,
    ...config.summary,
    ...config.boundaries,
  };

  if (result.declaredFileCount !== 5) result.blockers.push("declaredFileCount must equal 5");
  if (result.rollbackPlanRequirementCount !== 6) result.blockers.push("rollbackPlanRequirementCount must equal 6");
  if (result.rollbackPlanFieldCount !== 8) result.blockers.push("rollbackPlanFieldCount must equal 8");
  if (result.rollbackPlanEvidenceCount !== 6) result.blockers.push("rollbackPlanEvidenceCount must equal 6");
  if (result.rollbackPlanSignalCount !== 8) result.blockers.push("rollbackPlanSignalCount must equal 8");
  if (result.safetyGateCount !== 125) result.blockers.push("safetyGateCount must equal 125");
  if (result.appBindingCount !== 5) result.blockers.push("appBindingCount must equal 5");

  if (result.blockers.length > 0) {
    result.ok = false;
    result.status = "blocked";
    result.localWorkerRollbackPlanStatus = "blocked";
    result.validationFailedCount = result.blockers.length;
  }

  if (options.writeArtifacts) writeReport(rootDir, result);
  return result;
}
