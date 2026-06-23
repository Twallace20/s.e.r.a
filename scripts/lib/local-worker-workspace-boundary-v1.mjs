import fs from "node:fs";
import path from "node:path";

const declaredPaths = [
  "docs/phases/PHASE_65_LOCAL_WORKER_WORKSPACE_BOUNDARY_V1.md",
  "scripts/lib/local-worker-workspace-boundary-v1.mjs",
  "scripts/run-local-worker-workspace-boundary-v1.mjs",
  "tests/integration/local-worker-workspace-boundary-v1.test.ts",
  "apps/operator-console/src/local-worker-workspace-boundary.ts"
];

const workspaceBoundaryRequirements = [
  "phase-64-scope-lock-reviewed",
  "exact-workspace-root-required",
  "allowed-path-inventory-required",
  "blocked-path-inventory-required",
  "rollback-workspace-required",
  "workspace-evidence-target-required"
];
const workspaceBoundaryFields = [
  "owner",
  "sourcePhase",
  "safeState",
  "phase64ScopeLockReady",
  "exactWorkspaceRootRequired",
  "workspaceBoundaryLocked",
  "workerInstallApproved",
  "workerInstalled"
];
const workspaceBoundarySignals = [
  "workspace boundary surface",
  "phase 64 scope lock dependency",
  "exact workspace root requirement",
  "allowed path inventory requirement",
  "blocked path inventory requirement",
  "rollback workspace requirement",
  "workspace boundary not locked signal",
  "actual install remains blocked"
];
const evidenceRequirements = [
  "Phase 64 scope lock proof",
  "Exact workspace root requirement",
  "Allowed workspace path inventory requirement",
  "Blocked workspace path inventory requirement",
  "Rollback workspace target requirement",
  "Blocked install proof"
];
const safetyGates = [
  "Local worker workspace boundary only",
  "Tyler remains the workspace boundary owner",
  "Workspace boundary is declarative only",
  "Workspace boundary prepares owner review without approving installation",
  "Workspace boundary does not sign approval",
  "Workspace boundary does not lock workspace as approved",
  "Workspace boundary does not mark the worker ready for install",
  "Workspace boundary does not approve the install plan",
  "Workspace boundary does not approve the install approval record",
  "Workspace boundary does not approve the scope lock",
  "Workspace boundary does not approve worker installation",
  "Workspace boundary does not approve execution",
  "Workspace boundary does not authorize overnight work",
  "Workspace boundary does not install a worker",
  "Workspace boundary does not download dependencies",
  "Workspace boundary does not execute installers",
  "Workspace boundary does not create files",
  "Workspace boundary does not mutate files",
  "Workspace boundary does not mutate source",
  "Workspace boundary does not mutate the filesystem",
  "Workspace boundary does not connect to a worker",
  "Workspace boundary does not start a worker",
  "Workspace boundary does not spawn a worker process",
  "Workspace boundary does not poll worker health",
  "Workspace boundary does not inspect running processes",
  "Workspace boundary does not create scheduled tasks",
  "Workspace boundary does not modify scheduled tasks",
  "Workspace boundary does not delete scheduled tasks",
  "Workspace boundary does not enable scheduled tasks",
  "Workspace boundary does not disable scheduled tasks",
  "Workspace boundary does not query Windows Task Scheduler",
  "Workspace boundary does not run scheduled tasks",
  "Workspace boundary does not execute PowerShell",
  "Workspace boundary does not execute schtasks",
  "Workspace boundary does not execute commands",
  "Workspace boundary does not execute shell commands",
  "Workspace boundary does not execute tasks",
  "Workspace boundary does not persist task records",
  "Workspace boundary does not persist owner records",
  "Workspace boundary does not persist unlock proposal decisions",
  "Workspace boundary does not persist install plan decisions",
  "Workspace boundary does not persist approval records",
  "Workspace boundary does not persist scope lock records",
  "Workspace boundary does not persist workspace boundary records",
  "Workspace boundary does not connect to runner infrastructure",
  "Workspace boundary does not route work",
  "Workspace boundary does not process work automatically",
  "Workspace boundary does not merge branches",
  "Workspace boundary cannot self-approve",
  "Phase 64 scope lock prerequisite remains represented",
  "Phase 63 approval record prerequisite remains represented",
  "Owner approval is required before any future install",
  "Manual review is required before any future install",
  "Explicit workspace boundary is required before any future install",
  "Exact workspace root is required before any future install",
  "Allowed path inventory is required before any future install",
  "Blocked path inventory is required before any future install",
  "Rollback workspace target is required before any future install",
  "Workspace evidence target is required before any future install",
  "Local worker ready for install remains false by design",
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
  "Future install requires exact workspace path boundary",
  "Future install requires allowed workspace path inventory",
  "Future install requires blocked workspace path inventory",
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
  "Future install requires owner re-approval for workspace changes",
  "No backend workspace boundary service",
  "No authentication changes",
  "No approval signing in this phase",
  "No scope lock signing in this phase",
  "No workspace boundary signing in this phase",
  "No approval persistence in this phase",
  "No scope lock persistence in this phase",
  "No workspace boundary persistence in this phase",
  "No live worker connection",
  "No actual worker install",
  "No installer execution",
  "No dependency download",
  "No workspace probing",
  "No filesystem scanning",
  "No path creation",
  "No path deletion"
];

export function createDefaultLocalWorkerWorkspaceBoundaryV1() {
  return {
    declaredPaths: [...declaredPaths],
    summary: {
      localWorkerWorkspaceBoundaryStatus: "workspace-boundary-ready",
      phase64ScopeLockReady: true,
      phase63ApprovalRecordReady: true,
      ownerApprovalRequired: true,
      manualReviewRequired: true,
      explicitWorkspaceBoundaryRequired: true,
      exactWorkspaceRootRequired: true,
      allowedPathInventoryRequired: true,
      blockedPathInventoryRequired: true,
      rollbackWorkspaceRequired: true,
      workspaceEvidenceTargetRequired: true,
      localWorkerReadyForInstall: false,
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
    counts: { workspaceBoundaryRequirements, workspaceBoundaryFields, workspaceBoundarySignals, evidenceRequirements, safetyGates },
    boundaries: {
      localOnly: true,
      privateAppOnly: true,
      workspaceBoundaryOnly: true,
      ownerReviewOnly: true,
      declarativeOnly: true,
      readOnly: true,
      frontendOnly: true,
      noBackendLogic: true,
      noAuthentication: true,
      workspaceBoundarySigningAllowed: false,
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
  const outDir = path.join(rootDir, ".sera-local-worker-workspace-boundary");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "phase65-local-worker-workspace-boundary-status.json"), JSON.stringify(result, null, 2), "utf8");
  const markdown = [
    "# Phase 65 Local Worker Workspace Boundary v1",
    "",
    `Status: ${result.status}`,
    `Validation failed count: ${result.validationFailedCount}`,
    `Workspace boundary status: ${result.localWorkerWorkspaceBoundaryStatus}`,
    `Safety gates: ${result.safetyGateCount}`,
    `App bindings: ${result.appBindingCount}`,
    "",
    "This report is generated by the declarative Phase 65 workspace-boundary checker. It does not lock workspace boundaries as approved, sign approval, approve installation, install a worker, download dependencies, execute installers, connect to a worker, probe or scan the filesystem, run a scheduler, execute commands, execute tasks, persist workspace boundary records, mutate source, or self-approve.",
  ].join("\n");
  fs.writeFileSync(path.join(outDir, "phase65-local-worker-workspace-boundary-status.md"), `${markdown}
`, "utf8");
}

export function inspectLocalWorkerWorkspaceBoundaryV1(config = createDefaultLocalWorkerWorkspaceBoundaryV1(), options = {}) {
  const rootDir = options.rootDir ?? process.cwd();
  const blockers = [];

  for (const declaredPath of config.declaredPaths ?? []) {
    if (!isSafeRelativePath(declaredPath)) blockers.push(`Declared path must be safe and relative: ${declaredPath}`);
    else if (!fs.existsSync(path.join(rootDir, declaredPath))) blockers.push(`Declared path missing: ${declaredPath}`);
  }

  const appContent = readIfExists(rootDir, "apps/operator-console/src/App.tsx");
  const requiredAppBindings = [
    "localWorkerWorkspaceBoundaryPacket.workspaceBoundarySummary.owner",
    "localWorkerWorkspaceBoundaryPacket.workspaceBoundaryRequirements.length",
    "localWorkerWorkspaceBoundaryPacket.evidenceRequirements.length",
    "localWorkerWorkspaceBoundaryPacket.boundaries.workerInstallAllowed",
    "localWorkerWorkspaceBoundaryPacket.workspaceBoundarySummary.workspaceBoundaryLocked",
  ];
  const missingAppBindings = requiredAppBindings.filter((binding) => !appContent.includes(binding));
  for (const binding of missingAppBindings) blockers.push(`App binding missing: ${binding}`);
  if (!appContent.includes("Local Worker Workspace Boundary")) blockers.push("App card missing: Local Worker Workspace Boundary");

  const pkgContent = readIfExists(rootDir, "package.json");
  if (!pkgContent.includes("phase65:demo")) blockers.push("package script missing: phase65:demo");
  if (!pkgContent.includes("phase65:verify")) blockers.push("package script missing: phase65:verify");

  const trueRequirements = ["phase64ScopeLockReady", "phase63ApprovalRecordReady", "ownerApprovalRequired", "manualReviewRequired", "explicitWorkspaceBoundaryRequired", "exactWorkspaceRootRequired", "allowedPathInventoryRequired", "blockedPathInventoryRequired", "rollbackWorkspaceRequired", "workspaceEvidenceTargetRequired"];
  for (const field of trueRequirements) if (config.summary?.[field] !== true) blockers.push(`${field} must remain true`);

  const falseSummary = ["localWorkerReadyForInstall", "workspaceBoundaryLocked", "installScopeLocked", "installApprovalRecordApproved", "installPlanApproved", "executionUnlockApproved", "overnightWorkAuthorized", "workerInstallApproved", "workerInstalled", "workerConnected", "windowsSchedulerConfigured", "scheduledExecutionAllowed"];
  for (const field of falseSummary) if (config.summary?.[field] !== false) blockers.push(`${field} must remain false`);
  if (config.summary?.executableScheduleCount !== 0) blockers.push("executableScheduleCount must remain zero");

  const trueBoundaryRequirements = ["localOnly", "privateAppOnly", "workspaceBoundaryOnly", "ownerReviewOnly", "declarativeOnly", "readOnly", "frontendOnly", "noBackendLogic", "noAuthentication"];
  for (const field of trueBoundaryRequirements) if (config.boundaries?.[field] !== true) blockers.push(`${field} must remain true`);

  const falseBoundaryRequirements = ["workspaceBoundarySigningAllowed", "scopeLockSigningAllowed", "approvalRecordSigningAllowed", "executionUnlockAllowed", "overnightExecutionAllowed", "liveRunReportAllowed", "dependencyDownloadAllowed", "installerExecutionAllowed", "schedulerCreationAllowed", "schedulerMutationAllowed", "schedulerDeletionAllowed", "schedulerEnableDisableAllowed", "scheduledExecutionAllowed", "schedulerQueryAllowed", "powershellExecutionAllowed", "schtasksExecutionAllowed", "commandExecutionAllowed", "shellExecutionAllowed", "runnerConnectivityAllowed", "liveWorkerConnectionAllowed", "workerInstallAllowed", "workerConnectionAllowed", "workerSpawnAllowed", "taskExecutionAllowed", "healthPollingAllowed", "liveHeartbeatAllowed", "processInspectionAllowed", "workspaceProbeAllowed", "filesystemScanAllowed", "mutatesSource", "fileMutationAllowed", "filesystemMutationAllowed", "pathCreationAllowed", "pathDeletionAllowed", "recordPersistenceAllowed", "taskPersistenceAllowed", "morningPacketPersistenceAllowed", "readinessGatePersistenceAllowed", "unlockProposalPersistenceAllowed", "installPlanPersistenceAllowed", "installApprovalRecordPersistenceAllowed", "installScopeLockPersistenceAllowed", "workspaceBoundaryPersistenceAllowed", "finalApprovalAllowed", "autoApprovalAllowed", "autoProcessingAllowed", "autoRouteAllowed", "autoMergeAllowed", "selfApprovalAllowed"];
  for (const field of falseBoundaryRequirements) if (config.boundaries?.[field] !== false) blockers.push(`${field} must remain false`);

  const result = {
    ok: blockers.length === 0,
    status: blockers.length === 0 ? "passed" : "blocked",
    localWorkerWorkspaceBoundaryStatus: blockers.length === 0 ? "ready" : "blocked",
    validationFailedCount: blockers.length,
    blockers,
    declaredFileCount: config.declaredPaths?.length ?? 0,
    workspaceBoundaryRequirementCount: config.counts?.workspaceBoundaryRequirements?.length ?? 0,
    workspaceBoundaryFieldCount: config.counts?.workspaceBoundaryFields?.length ?? 0,
    workspaceBoundaryEvidenceCount: config.counts?.evidenceRequirements?.length ?? 0,
    workspaceBoundarySignalCount: config.counts?.workspaceBoundarySignals?.length ?? 0,
    safetyGateCount: config.counts?.safetyGates?.length ?? 0,
    appBindingCount: requiredAppBindings.length,
    ...config.summary,
    ...config.boundaries,
  };

  if (result.declaredFileCount !== 5) result.blockers.push("declaredFileCount must equal 5");
  if (result.workspaceBoundaryRequirementCount !== 6) result.blockers.push("workspaceBoundaryRequirementCount must equal 6");
  if (result.workspaceBoundaryFieldCount !== 8) result.blockers.push("workspaceBoundaryFieldCount must equal 8");
  if (result.workspaceBoundaryEvidenceCount !== 6) result.blockers.push("workspaceBoundaryEvidenceCount must equal 6");
  if (result.workspaceBoundarySignalCount !== 8) result.blockers.push("workspaceBoundarySignalCount must equal 8");
  if (result.safetyGateCount !== 110) result.blockers.push("safetyGateCount must equal 110");
  if (result.appBindingCount !== 5) result.blockers.push("appBindingCount must equal 5");

  if (result.blockers.length > 0) {
    result.ok = false;
    result.status = "blocked";
    result.localWorkerWorkspaceBoundaryStatus = "blocked";
    result.validationFailedCount = result.blockers.length;
  }

  if (options.writeArtifacts) writeReport(rootDir, result);
  return result;
}
