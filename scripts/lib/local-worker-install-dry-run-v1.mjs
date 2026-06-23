import fs from "node:fs";
import path from "node:path";

const declaredPaths = [
  "docs/phases/PHASE_68_LOCAL_WORKER_INSTALL_DRY_RUN_V1.md",
  "scripts/lib/local-worker-install-dry-run-v1.mjs",
  "scripts/run-local-worker-install-dry-run-v1.mjs",
  "tests/integration/local-worker-install-dry-run-v1.test.ts",
  "apps/operator-console/src/local-worker-install-dry-run.ts"
];
const installDryRunRequirements = [
  "phase-67-dependency-allowlist-reviewed",
  "dry-run-script-required",
  "dry-run-inputs-required",
  "dry-run-output-evidence-required",
  "no-install-mutation-required",
  "owner-dry-run-review-required",
];
const installDryRunFields = ["owner", "installDryRunId", "sourcePhase", "safeState", "dryRunScriptRequired", "dryRunInputsRequired", "dryRunOutputEvidenceRequired", "noInstallMutationRequired"];
const installDryRunSignals = ["install dry-run surface", "phase 67 dependency allowlist dependency", "dry-run script plan requirement", "dry-run inputs requirement", "dry-run output evidence requirement", "no-install mutation requirement", "install dry-run not locked signal", "actual install remains blocked"];
const evidenceRequirements = ["Phase 67 dependency allowlist proof", "Dry-run script plan requirement", "Dry-run input inventory requirement", "Dry-run output evidence requirement", "No-install mutation proof requirement", "Blocked install proof"];
const safetyGates = [
  "Local worker install dry-run only",
  "Tyler remains the install dry-run owner",
  "Install dry-run is declarative only",
  "Install dry-run prepares owner review without approving installation",
  "Install dry-run does not sign approval",
  "Install dry-run does not lock dry-run as approved",
  "Install dry-run does not download dependencies",
  "Install dry-run does not install packages",
  "Install dry-run does not run package managers",
  "Install dry-run does not execute installers",
  "Install dry-run does not create lockfiles",
  "Install dry-run does not mutate dependency manifests",
  "Install dry-run does not run smoke tests",
  "Install dry-run does not create dry-run artifacts outside its local report folder",
  "Install dry-run does not mark the worker ready for install",
  "Install dry-run does not approve the dependency allowlist",
  "Install dry-run does not approve the rollback plan",
  "Install dry-run does not approve the workspace boundary",
  "Install dry-run does not approve the scope lock",
  "Install dry-run does not approve the install approval record",
  "Install dry-run does not approve the install plan",
  "Install dry-run does not approve worker installation",
  "Install dry-run does not approve execution",
  "Install dry-run does not authorize overnight work",
  "Install dry-run does not install a worker",
  "Install dry-run does not create files",
  "Install dry-run does not mutate files",
  "Install dry-run does not mutate source",
  "Install dry-run does not mutate the filesystem",
  "Install dry-run does not connect to a worker",
  "Install dry-run does not start a worker",
  "Install dry-run does not spawn a worker process",
  "Install dry-run does not poll worker health",
  "Install dry-run does not inspect running processes",
  "Install dry-run does not create scheduled tasks",
  "Install dry-run does not modify scheduled tasks",
  "Install dry-run does not delete scheduled tasks",
  "Install dry-run does not enable scheduled tasks",
  "Install dry-run does not disable scheduled tasks",
  "Install dry-run does not query Windows Task Scheduler",
  "Install dry-run does not run scheduled tasks",
  "Install dry-run does not execute PowerShell",
  "Install dry-run does not execute schtasks",
  "Install dry-run does not execute commands",
  "Install dry-run does not execute shell commands",
  "Install dry-run does not execute tasks",
  "Install dry-run does not persist task records",
  "Install dry-run does not persist owner records",
  "Install dry-run does not persist unlock proposal decisions",
  "Install dry-run does not persist install plan decisions",
  "Install dry-run does not persist approval records",
  "Install dry-run does not persist scope lock records",
  "Install dry-run does not persist workspace boundary records",
  "Install dry-run does not persist rollback records",
  "Install dry-run does not persist dependency allowlist records",
  "Install dry-run does not persist install dry-run records",
  "Install dry-run does not connect to runner infrastructure",
  "Install dry-run does not route work",
  "Install dry-run does not process work automatically",
  "Install dry-run does not merge branches",
  "Install dry-run cannot self-approve",
  "Phase 67 dependency allowlist prerequisite remains represented",
  "Phase 66 rollback plan prerequisite remains represented",
  "Owner approval is required before any future install",
  "Manual review is required before any future install",
  "Explicit install dry-run is required before any future install",
  "Dry-run script plan is required before any future install",
  "Dry-run input inventory is required before any future install",
  "Dry-run output evidence target is required before any future install",
  "No-install mutation policy is required before any future install",
  "Owner dry-run review is required before any future install",
  "Local worker ready for install remains false by design",
  "Install dry-run locked remains false by design",
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
  "Future install requires signed install dry-run review",
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
  "Future install requires dry-run script review",
  "Future install requires dry-run input inventory",
  "Future install requires dry-run output evidence",
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
  "Future install requires no-network dry-run boundary",
  "Future install requires no-write dry-run boundary",
  "Future install requires no-execution dry-run boundary",
  "Future install requires simulated install checklist",
  "Future install requires simulated dependency checklist",
  "Future install requires simulated rollback checklist",
  "Future install requires simulated health checklist",
  "Future install requires dry-run failure handling plan",
  "Future install requires dry-run retry policy",
  "Future install requires dry-run log redaction policy",
  "Future install requires dry-run artifact boundary",
  "Future install requires dry-run owner review queue",
  "Future install requires dry-run blocker reporting",
  "Future install requires dry-run risk rating",
  "Future install requires dry-run pass/fail criteria",
  "Future install requires dry-run smoke evidence plan",
  "Future install requires dry-run no-secret check",
  "Future install requires dry-run no-mutation proof",
  "Future install requires dry-run no-network proof",
  "Future install requires dry-run no-command proof",
  "No backend install dry-run service",
  "No authentication changes",
  "No approval signing in this phase",
  "No scope lock signing in this phase",
  "No workspace boundary signing in this phase",
  "No rollback plan signing in this phase",
  "No dependency allowlist signing in this phase",
  "No install dry-run signing in this phase",
  "No approval persistence in this phase",
  "No scope lock persistence in this phase",
  "No workspace boundary persistence in this phase",
  "No rollback plan persistence in this phase",
  "No dependency allowlist persistence in this phase",
  "No install dry-run persistence in this phase",
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
  "No backup creation",
  "No network access",
  "No command dry-run execution",
  "No smoke test execution",
  "No artifact writes except local phase report"
];

export function createDefaultLocalWorkerInstallDryRunV1() {
  return {
    declaredPaths: [...declaredPaths],
    summary: {
      localWorkerInstallDryRunStatus: "install-dry-run-ready",
      phase67DependencyAllowlistReady: true,
      phase66RollbackPlanReady: true,
      ownerApprovalRequired: true,
      manualReviewRequired: true,
      explicitInstallDryRunRequired: true,
      dryRunScriptRequired: true,
      dryRunInputsRequired: true,
      dryRunOutputEvidenceRequired: true,
      noInstallMutationRequired: true,
      ownerDryRunReviewRequired: true,
      localWorkerReadyForInstall: false,
      installDryRunLocked: false,
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
    counts: { installDryRunRequirements, installDryRunFields, installDryRunSignals, evidenceRequirements, safetyGates },
    boundaries: {
      localOnly: true,
      privateAppOnly: true,
      installDryRunOnly: true,
      ownerReviewOnly: true,
      declarativeOnly: true,
      readOnly: true,
      frontendOnly: true,
      noBackendLogic: true,
      noAuthentication: true,
      installDryRunSigningAllowed: false,
      dependencyAllowlistSigningAllowed: false,
      rollbackPlanSigningAllowed: false,
      workspaceBoundarySigningAllowed: false,
      scopeLockSigningAllowed: false,
      approvalRecordSigningAllowed: false,
      dryRunExecutionAllowed: false,
      smokeTestExecutionAllowed: false,
      networkAccessAllowed: false,
      artifactMutationAllowed: false,
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
      installDryRunPersistenceAllowed: false,
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
  const outDir = path.join(rootDir, ".sera-local-worker-install-dry-run");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "phase68-local-worker-install-dry-run-status.json"), JSON.stringify(result, null, 2), "utf8");
  const markdown = [
    "# Phase 68 Local Worker Install Dry-Run v1",
    "",
    `Status: ${result.status}`,
    `Validation failed count: ${result.validationFailedCount}`,
    `Install dry-run status: ${result.localWorkerInstallDryRunStatus}`,
    `Safety gates: ${result.safetyGateCount}`,
    `App bindings: ${result.appBindingCount}`,
    "",
    "This report is generated by the declarative Phase 68 install dry-run checker. It does not execute a dry-run, run smoke tests, access the network, download dependencies, install packages, run package managers, mutate dependency manifests, create lockfiles, approve installation, install a worker, execute installers, connect to a worker, probe or scan the filesystem, run a scheduler, execute commands, execute tasks, persist install dry-run records, mutate source, or self-approve.",
  ].join("\n");
  fs.writeFileSync(path.join(outDir, "phase68-local-worker-install-dry-run-status.md"), `${markdown}
`, "utf8");
}

export function inspectLocalWorkerInstallDryRunV1(config = createDefaultLocalWorkerInstallDryRunV1(), options = {}) {
  const rootDir = options.rootDir ?? process.cwd();
  const blockers = [];

  for (const declaredPath of config.declaredPaths ?? []) {
    if (!isSafeRelativePath(declaredPath)) blockers.push(`Declared path must be safe and relative: ${declaredPath}`);
    else if (!fs.existsSync(path.join(rootDir, declaredPath))) blockers.push(`Declared path missing: ${declaredPath}`);
  }

  const appContent = readIfExists(rootDir, "apps/operator-console/src/App.tsx");
  const requiredAppBindings = [
    "localWorkerInstallDryRunPacket.installDryRunSummary.owner",
    "localWorkerInstallDryRunPacket.installDryRunRequirements.length",
    "localWorkerInstallDryRunPacket.evidenceRequirements.length",
    "localWorkerInstallDryRunPacket.boundaries.workerInstallAllowed",
    "localWorkerInstallDryRunPacket.installDryRunSummary.installDryRunLocked",
  ];
  const missingAppBindings = requiredAppBindings.filter((binding) => !appContent.includes(binding));
  for (const binding of missingAppBindings) blockers.push(`App binding missing: ${binding}`);
  if (!appContent.includes("Local Worker Install Dry-Run")) blockers.push("App card missing: Local Worker Install Dry-Run");

  const pkgContent = readIfExists(rootDir, "package.json");
  if (!pkgContent.includes("phase68:demo")) blockers.push("package script missing: phase68:demo");
  if (!pkgContent.includes("phase68:verify")) blockers.push("package script missing: phase68:verify");

  const trueRequirements = ["phase67DependencyAllowlistReady", "phase66RollbackPlanReady", "ownerApprovalRequired", "manualReviewRequired", "explicitInstallDryRunRequired", "dryRunScriptRequired", "dryRunInputsRequired", "dryRunOutputEvidenceRequired", "noInstallMutationRequired", "ownerDryRunReviewRequired"];
  for (const field of trueRequirements) if (config.summary?.[field] !== true) blockers.push(`${field} must remain true`);

  const falseSummary = ["localWorkerReadyForInstall", "installDryRunLocked", "dependencyAllowlistLocked", "rollbackPlanLocked", "workspaceBoundaryLocked", "installScopeLocked", "installApprovalRecordApproved", "installPlanApproved", "executionUnlockApproved", "overnightWorkAuthorized", "workerInstallApproved", "workerInstalled", "workerConnected", "windowsSchedulerConfigured", "scheduledExecutionAllowed"];
  for (const field of falseSummary) if (config.summary?.[field] !== false) blockers.push(`${field} must remain false`);
  if (config.summary?.executableScheduleCount !== 0) blockers.push("executableScheduleCount must remain zero");

  const trueBoundaryRequirements = ["localOnly", "privateAppOnly", "installDryRunOnly", "ownerReviewOnly", "declarativeOnly", "readOnly", "frontendOnly", "noBackendLogic", "noAuthentication"];
  for (const field of trueBoundaryRequirements) if (config.boundaries?.[field] !== true) blockers.push(`${field} must remain true`);

  const falseBoundaryRequirements = ["installDryRunSigningAllowed", "dependencyAllowlistSigningAllowed", "rollbackPlanSigningAllowed", "workspaceBoundarySigningAllowed", "scopeLockSigningAllowed", "approvalRecordSigningAllowed", "dryRunExecutionAllowed", "smokeTestExecutionAllowed", "networkAccessAllowed", "artifactMutationAllowed", "dependencyDownloadAllowed", "packageInstallAllowed", "packageManagerExecutionAllowed", "dependencyManifestMutationAllowed", "lockfileMutationAllowed", "rollbackExecutionAllowed", "stateRestoreAllowed", "backupCreationAllowed", "executionUnlockAllowed", "overnightExecutionAllowed", "liveRunReportAllowed", "installerExecutionAllowed", "schedulerCreationAllowed", "schedulerMutationAllowed", "schedulerDeletionAllowed", "schedulerEnableDisableAllowed", "scheduledExecutionAllowed", "schedulerQueryAllowed", "powershellExecutionAllowed", "schtasksExecutionAllowed", "commandExecutionAllowed", "shellExecutionAllowed", "runnerConnectivityAllowed", "liveWorkerConnectionAllowed", "workerInstallAllowed", "workerConnectionAllowed", "workerSpawnAllowed", "taskExecutionAllowed", "healthPollingAllowed", "liveHeartbeatAllowed", "processInspectionAllowed", "workspaceProbeAllowed", "filesystemScanAllowed", "mutatesSource", "fileMutationAllowed", "filesystemMutationAllowed", "pathCreationAllowed", "pathDeletionAllowed", "recordPersistenceAllowed", "taskPersistenceAllowed", "morningPacketPersistenceAllowed", "readinessGatePersistenceAllowed", "unlockProposalPersistenceAllowed", "installPlanPersistenceAllowed", "installApprovalRecordPersistenceAllowed", "installScopeLockPersistenceAllowed", "workspaceBoundaryPersistenceAllowed", "rollbackPlanPersistenceAllowed", "dependencyAllowlistPersistenceAllowed", "installDryRunPersistenceAllowed", "finalApprovalAllowed", "autoApprovalAllowed", "autoProcessingAllowed", "autoRouteAllowed", "autoMergeAllowed", "selfApprovalAllowed"];
  for (const field of falseBoundaryRequirements) if (config.boundaries?.[field] !== false) blockers.push(`${field} must remain false`);

  const result = {
    ok: blockers.length === 0,
    status: blockers.length === 0 ? "passed" : "blocked",
    localWorkerInstallDryRunStatus: blockers.length === 0 ? config.summary.localWorkerInstallDryRunStatus : "blocked",
    validationFailedCount: blockers.length,
    blockers,
    declaredFileCount: config.declaredPaths?.length ?? 0,
    installDryRunRequirementCount: config.counts?.installDryRunRequirements?.length ?? 0,
    installDryRunFieldCount: config.counts?.installDryRunFields?.length ?? 0,
    installDryRunEvidenceCount: config.counts?.evidenceRequirements?.length ?? 0,
    installDryRunSignalCount: config.counts?.installDryRunSignals?.length ?? 0,
    safetyGateCount: config.counts?.safetyGates?.length ?? 0,
    appBindingCount: requiredAppBindings.length,
    ...config.summary,
    ...config.boundaries,
  };

  if (result.declaredFileCount !== 5) result.blockers.push("declaredFileCount must equal 5");
  if (result.installDryRunRequirementCount !== 6) result.blockers.push("installDryRunRequirementCount must equal 6");
  if (result.installDryRunFieldCount !== 8) result.blockers.push("installDryRunFieldCount must equal 8");
  if (result.installDryRunEvidenceCount !== 6) result.blockers.push("installDryRunEvidenceCount must equal 6");
  if (result.installDryRunSignalCount !== 8) result.blockers.push("installDryRunSignalCount must equal 8");
  if (result.safetyGateCount !== 180) result.blockers.push("safetyGateCount must equal 180");
  if (result.appBindingCount !== 5) result.blockers.push("appBindingCount must equal 5");

  if (result.blockers.length > 0) {
    result.ok = false;
    result.status = "blocked";
    result.localWorkerInstallDryRunStatus = "blocked";
    result.validationFailedCount = result.blockers.length;
  }

  if (options.writeArtifacts) writeReport(rootDir, result);
  return result;
}
