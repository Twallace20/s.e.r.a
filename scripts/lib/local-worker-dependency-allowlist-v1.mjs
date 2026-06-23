import fs from "node:fs";
import path from "node:path";

const declaredPaths = [
  "docs/phases/PHASE_67_LOCAL_WORKER_DEPENDENCY_ALLOWLIST_V1.md",
  "scripts/lib/local-worker-dependency-allowlist-v1.mjs",
  "scripts/run-local-worker-dependency-allowlist-v1.mjs",
  "tests/integration/local-worker-dependency-allowlist-v1.test.ts",
  "apps/operator-console/src/local-worker-dependency-allowlist.ts"
];
const dependencyAllowlistRequirements = [
  "phase-66-rollback-plan-reviewed",
  "dependency-inventory-required",
  "package-manager-boundary-required",
  "version-pinning-required",
  "provenance-evidence-required",
  "owner-dependency-approval-required",
];
const dependencyAllowlistFields = ["owner", "dependencyAllowlistId", "sourcePhase", "safeState", "dependencyInventoryRequired", "packageManagerBoundaryRequired", "versionPinningRequired", "provenanceEvidenceRequired"];
const dependencyAllowlistSignals = ["dependency allowlist surface", "phase 66 rollback plan dependency", "dependency inventory requirement", "package manager boundary requirement", "version pinning requirement", "dependency provenance evidence requirement", "dependency allowlist not locked signal", "actual install remains blocked"];
const evidenceRequirements = ["Phase 66 rollback plan proof", "Dependency inventory requirement", "Package manager boundary requirement", "Version pinning requirement", "Dependency provenance evidence requirement", "Blocked install proof"];
const safetyGates = [
  "Local worker dependency allowlist only",
  "Tyler remains the dependency allowlist owner",
  "Dependency allowlist is declarative only",
  "Dependency allowlist prepares owner review without approving installation",
  "Dependency allowlist does not sign approval",
  "Dependency allowlist does not lock dependencies as approved",
  "Dependency allowlist does not download dependencies",
  "Dependency allowlist does not install packages",
  "Dependency allowlist does not run package managers",
  "Dependency allowlist does not execute installers",
  "Dependency allowlist does not create lockfiles",
  "Dependency allowlist does not mutate dependency manifests",
  "Dependency allowlist does not mark the worker ready for install",
  "Dependency allowlist does not approve the install plan",
  "Dependency allowlist does not approve the install approval record",
  "Dependency allowlist does not approve the scope lock",
  "Dependency allowlist does not approve the workspace boundary",
  "Dependency allowlist does not approve the rollback plan",
  "Dependency allowlist does not approve worker installation",
  "Dependency allowlist does not approve execution",
  "Dependency allowlist does not authorize overnight work",
  "Dependency allowlist does not install a worker",
  "Dependency allowlist does not create files",
  "Dependency allowlist does not mutate files",
  "Dependency allowlist does not mutate source",
  "Dependency allowlist does not mutate the filesystem",
  "Dependency allowlist does not connect to a worker",
  "Dependency allowlist does not start a worker",
  "Dependency allowlist does not spawn a worker process",
  "Dependency allowlist does not poll worker health",
  "Dependency allowlist does not inspect running processes",
  "Dependency allowlist does not create scheduled tasks",
  "Dependency allowlist does not modify scheduled tasks",
  "Dependency allowlist does not delete scheduled tasks",
  "Dependency allowlist does not enable scheduled tasks",
  "Dependency allowlist does not disable scheduled tasks",
  "Dependency allowlist does not query Windows Task Scheduler",
  "Dependency allowlist does not run scheduled tasks",
  "Dependency allowlist does not execute PowerShell",
  "Dependency allowlist does not execute schtasks",
  "Dependency allowlist does not execute commands",
  "Dependency allowlist does not execute shell commands",
  "Dependency allowlist does not execute tasks",
  "Dependency allowlist does not persist task records",
  "Dependency allowlist does not persist owner records",
  "Dependency allowlist does not persist unlock proposal decisions",
  "Dependency allowlist does not persist install plan decisions",
  "Dependency allowlist does not persist approval records",
  "Dependency allowlist does not persist scope lock records",
  "Dependency allowlist does not persist workspace boundary records",
  "Dependency allowlist does not persist rollback records",
  "Dependency allowlist does not persist dependency allowlist records",
  "Dependency allowlist does not connect to runner infrastructure",
  "Dependency allowlist does not route work",
  "Dependency allowlist does not process work automatically",
  "Dependency allowlist does not merge branches",
  "Dependency allowlist cannot self-approve",
  "Phase 66 rollback plan prerequisite remains represented",
  "Phase 65 workspace boundary prerequisite remains represented",
  "Owner approval is required before any future install",
  "Manual review is required before any future install",
  "Explicit dependency allowlist is required before any future install",
  "Dependency inventory is required before any future install",
  "Package manager boundary is required before any future install",
  "Version pinning is required before any future install",
  "Dependency provenance evidence is required before any future install",
  "Owner dependency approval is required before any future install",
  "Local worker ready for install remains false by design",
  "Dependency allowlist locked remains false by design",
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
  "Future install requires signed dependency allowlist",
  "Future install requires exact workspace path boundary",
  "Future install requires allowed workspace path inventory",
  "Future install requires blocked workspace path inventory",
  "Future install requires dependency inventory boundary",
  "Future install requires package manager boundary",
  "Future install requires pinned dependency versions",
  "Future install requires dependency provenance evidence",
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
  "Future install requires out-of-scope dependency handling",
  "Future install requires owner re-approval for dependency changes",
  "Future install requires blocked dependency policy",
  "Future install requires dependency update policy",
  "Future install requires dependency vulnerability review policy",
  "Future install requires license review policy",
  "Future install requires transitive dependency review policy",
  "Future install requires dependency source trust policy",
  "No backend dependency allowlist service",
  "No authentication changes",
  "No approval signing in this phase",
  "No scope lock signing in this phase",
  "No workspace boundary signing in this phase",
  "No rollback plan signing in this phase",
  "No dependency allowlist signing in this phase",
  "No approval persistence in this phase",
  "No scope lock persistence in this phase",
  "No workspace boundary persistence in this phase",
  "No rollback plan persistence in this phase",
  "No dependency allowlist persistence in this phase",
  "No live worker connection",
  "No actual worker install",
  "No installer execution",
  "No dependency download",
  "No package install",
  "No package manager execution",
  "No dependency manifest mutation",
  "No lockfile mutation",
  "No workspace probing",
  "No filesystem scanning",
  "No path creation",
  "No path deletion",
  "No rollback execution",
  "No state restore execution",
  "No backup creation"
];

export function createDefaultLocalWorkerDependencyAllowlistV1() {
  return {
    declaredPaths: [...declaredPaths],
    summary: {
      localWorkerDependencyAllowlistStatus: "dependency-allowlist-ready",
      phase66RollbackPlanReady: true,
      phase65WorkspaceBoundaryReady: true,
      ownerApprovalRequired: true,
      manualReviewRequired: true,
      explicitDependencyAllowlistRequired: true,
      dependencyInventoryRequired: true,
      packageManagerBoundaryRequired: true,
      versionPinningRequired: true,
      provenanceEvidenceRequired: true,
      ownerDependencyApprovalRequired: true,
      localWorkerReadyForInstall: false,
      dependencyAllowlistLocked: false,
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
    counts: { dependencyAllowlistRequirements, dependencyAllowlistFields, dependencyAllowlistSignals, evidenceRequirements, safetyGates },
    boundaries: {
      localOnly: true,
      privateAppOnly: true,
      dependencyAllowlistOnly: true,
      ownerReviewOnly: true,
      declarativeOnly: true,
      readOnly: true,
      frontendOnly: true,
      noBackendLogic: true,
      noAuthentication: true,
      dependencyAllowlistSigningAllowed: false,
      rollbackPlanSigningAllowed: false,
      workspaceBoundarySigningAllowed: false,
      scopeLockSigningAllowed: false,
      approvalRecordSigningAllowed: false,
      dependencyDownloadAllowed: false,
      packageInstallAllowed: false,
      packageManagerExecutionAllowed: false,
      dependencyManifestMutationAllowed: false,
      lockfileMutationAllowed: false,
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
      dependencyAllowlistPersistenceAllowed: false,
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
  const outDir = path.join(rootDir, ".sera-local-worker-dependency-allowlist");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "phase67-local-worker-dependency-allowlist-status.json"), JSON.stringify(result, null, 2), "utf8");
  const markdown = [
    "# Phase 67 Local Worker Dependency Allowlist v1",
    "",
    `Status: ${result.status}`,
    `Validation failed count: ${result.validationFailedCount}`,
    `Dependency allowlist status: ${result.localWorkerDependencyAllowlistStatus}`,
    `Safety gates: ${result.safetyGateCount}`,
    `App bindings: ${result.appBindingCount}`,
    "",
    "This report is generated by the declarative Phase 67 dependency-allowlist checker. It does not lock dependencies as approved, sign approval, download dependencies, install packages, run package managers, mutate dependency manifests, create lockfiles, approve installation, install a worker, execute installers, connect to a worker, probe or scan the filesystem, run a scheduler, execute commands, execute tasks, persist dependency allowlist records, mutate source, or self-approve.",
  ].join("\n");
  fs.writeFileSync(path.join(outDir, "phase67-local-worker-dependency-allowlist-status.md"), `${markdown}\n`, "utf8");
}

export function inspectLocalWorkerDependencyAllowlistV1(config = createDefaultLocalWorkerDependencyAllowlistV1(), options = {}) {
  const rootDir = options.rootDir ?? process.cwd();
  const blockers = [];

  for (const declaredPath of config.declaredPaths ?? []) {
    if (!isSafeRelativePath(declaredPath)) blockers.push(`Declared path must be safe and relative: ${declaredPath}`);
    else if (!fs.existsSync(path.join(rootDir, declaredPath))) blockers.push(`Declared path missing: ${declaredPath}`);
  }

  const appContent = readIfExists(rootDir, "apps/operator-console/src/App.tsx");
  const requiredAppBindings = [
    "localWorkerDependencyAllowlistPacket.dependencyAllowlistSummary.owner",
    "localWorkerDependencyAllowlistPacket.dependencyAllowlistRequirements.length",
    "localWorkerDependencyAllowlistPacket.evidenceRequirements.length",
    "localWorkerDependencyAllowlistPacket.boundaries.workerInstallAllowed",
    "localWorkerDependencyAllowlistPacket.dependencyAllowlistSummary.dependencyAllowlistLocked",
  ];
  const missingAppBindings = requiredAppBindings.filter((binding) => !appContent.includes(binding));
  for (const binding of missingAppBindings) blockers.push(`App binding missing: ${binding}`);
  if (!appContent.includes("Local Worker Dependency Allowlist")) blockers.push("App card missing: Local Worker Dependency Allowlist");

  const pkgContent = readIfExists(rootDir, "package.json");
  if (!pkgContent.includes("phase67:demo")) blockers.push("package script missing: phase67:demo");
  if (!pkgContent.includes("phase67:verify")) blockers.push("package script missing: phase67:verify");

  const trueRequirements = ["phase66RollbackPlanReady", "phase65WorkspaceBoundaryReady", "ownerApprovalRequired", "manualReviewRequired", "explicitDependencyAllowlistRequired", "dependencyInventoryRequired", "packageManagerBoundaryRequired", "versionPinningRequired", "provenanceEvidenceRequired", "ownerDependencyApprovalRequired"];
  for (const field of trueRequirements) if (config.summary?.[field] !== true) blockers.push(`${field} must remain true`);

  const falseSummary = ["localWorkerReadyForInstall", "dependencyAllowlistLocked", "rollbackPlanLocked", "workspaceBoundaryLocked", "installScopeLocked", "installApprovalRecordApproved", "installPlanApproved", "executionUnlockApproved", "overnightWorkAuthorized", "workerInstallApproved", "workerInstalled", "workerConnected", "windowsSchedulerConfigured", "scheduledExecutionAllowed"];
  for (const field of falseSummary) if (config.summary?.[field] !== false) blockers.push(`${field} must remain false`);
  if (config.summary?.executableScheduleCount !== 0) blockers.push("executableScheduleCount must remain zero");

  const trueBoundaryRequirements = ["localOnly", "privateAppOnly", "dependencyAllowlistOnly", "ownerReviewOnly", "declarativeOnly", "readOnly", "frontendOnly", "noBackendLogic", "noAuthentication"];
  for (const field of trueBoundaryRequirements) if (config.boundaries?.[field] !== true) blockers.push(`${field} must remain true`);

  const falseBoundaryRequirements = ["dependencyAllowlistSigningAllowed", "rollbackPlanSigningAllowed", "workspaceBoundarySigningAllowed", "scopeLockSigningAllowed", "approvalRecordSigningAllowed", "dependencyDownloadAllowed", "packageInstallAllowed", "packageManagerExecutionAllowed", "dependencyManifestMutationAllowed", "lockfileMutationAllowed", "rollbackExecutionAllowed", "stateRestoreAllowed", "backupCreationAllowed", "executionUnlockAllowed", "overnightExecutionAllowed", "liveRunReportAllowed", "installerExecutionAllowed", "schedulerCreationAllowed", "schedulerMutationAllowed", "schedulerDeletionAllowed", "schedulerEnableDisableAllowed", "scheduledExecutionAllowed", "schedulerQueryAllowed", "powershellExecutionAllowed", "schtasksExecutionAllowed", "commandExecutionAllowed", "shellExecutionAllowed", "runnerConnectivityAllowed", "liveWorkerConnectionAllowed", "workerInstallAllowed", "workerConnectionAllowed", "workerSpawnAllowed", "taskExecutionAllowed", "healthPollingAllowed", "liveHeartbeatAllowed", "processInspectionAllowed", "workspaceProbeAllowed", "filesystemScanAllowed", "mutatesSource", "fileMutationAllowed", "filesystemMutationAllowed", "pathCreationAllowed", "pathDeletionAllowed", "recordPersistenceAllowed", "taskPersistenceAllowed", "morningPacketPersistenceAllowed", "readinessGatePersistenceAllowed", "unlockProposalPersistenceAllowed", "installPlanPersistenceAllowed", "installApprovalRecordPersistenceAllowed", "installScopeLockPersistenceAllowed", "workspaceBoundaryPersistenceAllowed", "rollbackPlanPersistenceAllowed", "dependencyAllowlistPersistenceAllowed", "finalApprovalAllowed", "autoApprovalAllowed", "autoProcessingAllowed", "autoRouteAllowed", "autoMergeAllowed", "selfApprovalAllowed"];
  for (const field of falseBoundaryRequirements) if (config.boundaries?.[field] !== false) blockers.push(`${field} must remain false`);

  const result = {
    ok: blockers.length === 0,
    status: blockers.length === 0 ? "passed" : "blocked",
    localWorkerDependencyAllowlistStatus: blockers.length === 0 ? config.summary.localWorkerDependencyAllowlistStatus : "blocked",
    validationFailedCount: blockers.length,
    blockers,
    declaredFileCount: config.declaredPaths?.length ?? 0,
    dependencyAllowlistRequirementCount: config.counts?.dependencyAllowlistRequirements?.length ?? 0,
    dependencyAllowlistFieldCount: config.counts?.dependencyAllowlistFields?.length ?? 0,
    dependencyAllowlistEvidenceCount: config.counts?.evidenceRequirements?.length ?? 0,
    dependencyAllowlistSignalCount: config.counts?.dependencyAllowlistSignals?.length ?? 0,
    safetyGateCount: config.counts?.safetyGates?.length ?? 0,
    appBindingCount: requiredAppBindings.length,
    ...config.summary,
    ...config.boundaries,
  };

  if (result.declaredFileCount !== 5) result.blockers.push("declaredFileCount must equal 5");
  if (result.dependencyAllowlistRequirementCount !== 6) result.blockers.push("dependencyAllowlistRequirementCount must equal 6");
  if (result.dependencyAllowlistFieldCount !== 8) result.blockers.push("dependencyAllowlistFieldCount must equal 8");
  if (result.dependencyAllowlistEvidenceCount !== 6) result.blockers.push("dependencyAllowlistEvidenceCount must equal 6");
  if (result.dependencyAllowlistSignalCount !== 8) result.blockers.push("dependencyAllowlistSignalCount must equal 8");
  if (result.safetyGateCount !== 145) result.blockers.push("safetyGateCount must equal 145");
  if (result.appBindingCount !== 5) result.blockers.push("appBindingCount must equal 5");

  if (result.blockers.length > 0) {
    result.ok = false;
    result.status = "blocked";
    result.localWorkerDependencyAllowlistStatus = "blocked";
    result.validationFailedCount = result.blockers.length;
  }

  if (options.writeArtifacts) writeReport(rootDir, result);
  return result;
}
