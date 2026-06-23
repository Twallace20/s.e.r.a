import fs from "node:fs";
import path from "node:path";

const declaredPaths = [
  "docs/phases/PHASE_63_LOCAL_WORKER_INSTALL_APPROVAL_RECORD_V1.md",
  "scripts/lib/local-worker-install-approval-record-v1.mjs",
  "scripts/run-local-worker-install-approval-record-v1.mjs",
  "tests/integration/local-worker-install-approval-record-v1.test.ts",
  "apps/operator-console/src/local-worker-install-approval-record.ts",
];

const installApprovalRecordRequirements = [
  "phase-62-install-plan-reviewed",
  "explicit-owner-approval-required",
  "signed-scope-required",
  "rollback-acknowledgement-required",
  "emergency-stop-acknowledgement-required",
  "install-evidence-target-required",
];

const installApprovalRecordFields = [
  "owner",
  "sourcePhase",
  "safeState",
  "phase62InstallPlanReady",
  "explicitApprovalRecordRequired",
  "installApprovalRecordApproved",
  "workerInstallApproved",
  "workerInstalled",
];

const installApprovalRecordSignals = [
  "approval record surface",
  "phase 62 install plan dependency",
  "owner signature requirement",
  "install scope requirement",
  "rollback acknowledgement requirement",
  "emergency stop acknowledgement requirement",
  "approval not granted signal",
  "actual install remains blocked",
];

const evidenceRequirements = [
  "Phase 62 install plan proof",
  "Owner approval record draft",
  "Signed install scope requirement",
  "Rollback acknowledgement requirement",
  "Emergency stop acknowledgement requirement",
  "Blocked install proof",
];

const safetyGates = [
  "Local worker install approval record only",
  "Tyler remains the install approval record owner",
  "Install approval record is declarative only",
  "Install approval record prepares owner review without approving installation",
  "Install approval record does not sign approval",
  "Install approval record does not mark the worker ready for install",
  "Install approval record does not approve the install plan",
  "Install approval record does not approve worker installation",
  "Install approval record does not approve execution",
  "Install approval record does not authorize overnight work",
  "Install approval record does not install a worker",
  "Install approval record does not download dependencies",
  "Install approval record does not execute installers",
  "Install approval record does not create files",
  "Install approval record does not mutate files",
  "Install approval record does not mutate source",
  "Install approval record does not mutate the filesystem",
  "Install approval record does not connect to a worker",
  "Install approval record does not start a worker",
  "Install approval record does not spawn a worker process",
  "Install approval record does not poll worker health",
  "Install approval record does not inspect running processes",
  "Install approval record does not create scheduled tasks",
  "Install approval record does not modify scheduled tasks",
  "Install approval record does not delete scheduled tasks",
  "Install approval record does not enable scheduled tasks",
  "Install approval record does not disable scheduled tasks",
  "Install approval record does not query Windows Task Scheduler",
  "Install approval record does not run scheduled tasks",
  "Install approval record does not execute PowerShell",
  "Install approval record does not execute schtasks",
  "Install approval record does not execute commands",
  "Install approval record does not execute shell commands",
  "Install approval record does not execute tasks",
  "Install approval record does not persist task records",
  "Install approval record does not persist owner records",
  "Install approval record does not persist unlock proposal decisions",
  "Install approval record does not persist install plan decisions",
  "Install approval record does not persist approval records",
  "Install approval record does not connect to runner infrastructure",
  "Install approval record does not route work",
  "Install approval record does not process work automatically",
  "Install approval record does not merge branches",
  "Install approval record cannot self-approve",
  "Phase 62 install plan prerequisite remains represented",
  "Phase 61 unlock proposal prerequisite remains represented",
  "Owner approval is required before any future install",
  "Manual review is required before any future install",
  "Explicit approval record is required before any future install",
  "Approval signature is required before any future install",
  "Approval scope is required before any future install",
  "Rollback acknowledgement is required before any future install",
  "Emergency stop acknowledgement is required before any future install",
  "Install evidence target is required before any future install",
  "Local worker ready for install remains false by design",
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
  "Future install requires signed install scope",
  "Future install requires timestamped approval",
  "Future install requires rollback acknowledgement",
  "Future install requires emergency stop acknowledgement",
  "Future install requires command allowlist acknowledgement",
  "Future install requires workspace boundary acknowledgement",
  "Future install requires dependency inventory acknowledgement",
  "Future install requires install evidence target acknowledgement",
  "Future install requires worker health evidence target acknowledgement",
  "Future install requires dry-run smoke test acknowledgement",
  "Future install requires scheduler hold acknowledgement",
  "Future install requires morning packet review acknowledgement",
  "Future install requires session lock acknowledgement",
  "Future install requires secret handling acknowledgement",
  "Future install requires audit evidence acknowledgement",
  "Future install requires no-secret leakage acknowledgement",
  "Future install requires approval revocation path",
  "No backend approval service",
  "No authentication changes",
  "No approval signing in this phase",
  "No approval persistence in this phase",
  "No live worker connection",
  "No actual worker install",
  "No installer execution",
];

export function createDefaultLocalWorkerInstallApprovalRecordV1() {
  return {
    declaredPaths: [...declaredPaths],
    summary: {
      localWorkerInstallApprovalRecordStatus: "approval-record-ready",
      phase62InstallPlanReady: true,
      phase61UnlockProposalReady: true,
      ownerApprovalRequired: true,
      manualReviewRequired: true,
      explicitApprovalRecordRequired: true,
      approvalSignatureRequired: true,
      approvalScopeRequired: true,
      rollbackAcknowledgementRequired: true,
      emergencyStopAcknowledgementRequired: true,
      installEvidenceTargetRequired: true,
      localWorkerReadyForInstall: false,
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
      installApprovalRecordRequirements,
      installApprovalRecordFields,
      installApprovalRecordSignals,
      evidenceRequirements,
      safetyGates,
    },
    boundaries: {
      localOnly: true,
      privateAppOnly: true,
      installApprovalRecordOnly: true,
      ownerReviewOnly: true,
      declarativeOnly: true,
      readOnly: true,
      frontendOnly: true,
      noBackendLogic: true,
      noAuthentication: true,
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
  return typeof filePath === "string" && filePath.length > 0 && !path.isAbsolute(filePath) && !filePath.split(/[\\/]+/).includes("..");
}

function readIfExists(rootDir, relativePath) {
  const fullPath = path.join(rootDir, relativePath);
  return fs.existsSync(fullPath) ? fs.readFileSync(fullPath, "utf8") : "";
}

function writeReport(rootDir, result) {
  const outDir = path.join(rootDir, ".sera-local-worker-install-approval-record");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "phase63-local-worker-install-approval-record-status.json"), JSON.stringify(result, null, 2), "utf8");
  const markdown = [
    "# Phase 63 Local Worker Install Approval Record v1",
    "",
    `Status: ${result.status}`,
    `Validation failed count: ${result.validationFailedCount}`,
    `Install approval record status: ${result.localWorkerInstallApprovalRecordStatus}`,
    `Safety gates: ${result.safetyGateCount}`,
    `App bindings: ${result.appBindingCount}`,
    "",
    "This report is generated by the declarative Phase 63 approval-record checker. It does not approve installation, sign approval, install a worker, download dependencies, execute installers, connect to a worker, run a scheduler, execute commands, execute tasks, persist approval records, mutate source, or self-approve.",
  ].join("\n");
  fs.writeFileSync(path.join(outDir, "phase63-local-worker-install-approval-record-status.md"), `${markdown}\n`, "utf8");
}

export function inspectLocalWorkerInstallApprovalRecordV1(config = createDefaultLocalWorkerInstallApprovalRecordV1(), options = {}) {
  const rootDir = options.rootDir ?? process.cwd();
  const blockers = [];

  for (const declaredPath of config.declaredPaths ?? []) {
    if (!isSafeRelativePath(declaredPath)) blockers.push(`Declared path must be safe and relative: ${declaredPath}`);
    else if (!fs.existsSync(path.join(rootDir, declaredPath))) blockers.push(`Declared path missing: ${declaredPath}`);
  }

  const appContent = readIfExists(rootDir, "apps/operator-console/src/App.tsx");
  const requiredAppBindings = [
    "localWorkerInstallApprovalRecordPacket.installApprovalRecordSummary.owner",
    "localWorkerInstallApprovalRecordPacket.installApprovalRecordRequirements.length",
    "localWorkerInstallApprovalRecordPacket.evidenceRequirements.length",
    "localWorkerInstallApprovalRecordPacket.boundaries.workerInstallAllowed",
    "localWorkerInstallApprovalRecordPacket.installApprovalRecordSummary.installApprovalRecordApproved",
  ];
  const missingAppBindings = requiredAppBindings.filter((binding) => !appContent.includes(binding));
  for (const binding of missingAppBindings) blockers.push(`App binding missing: ${binding}`);
  if (!appContent.includes("Local Worker Install Approval Record")) blockers.push("App card missing: Local Worker Install Approval Record");

  const pkgContent = readIfExists(rootDir, "package.json");
  if (!pkgContent.includes("phase63:demo")) blockers.push("package script missing: phase63:demo");
  if (!pkgContent.includes("phase63:verify")) blockers.push("package script missing: phase63:verify");

  const trueRequirements = [
    "phase62InstallPlanReady",
    "phase61UnlockProposalReady",
    "ownerApprovalRequired",
    "manualReviewRequired",
    "explicitApprovalRecordRequired",
    "approvalSignatureRequired",
    "approvalScopeRequired",
    "rollbackAcknowledgementRequired",
    "emergencyStopAcknowledgementRequired",
    "installEvidenceTargetRequired",
  ];
  for (const field of trueRequirements) {
    if (config.summary?.[field] !== true) blockers.push(`${field} must remain true`);
  }

  const falseSummary = [
    "localWorkerReadyForInstall",
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

  const trueBoundaryRequirements = ["localOnly", "privateAppOnly", "installApprovalRecordOnly", "ownerReviewOnly", "declarativeOnly", "readOnly", "frontendOnly", "noBackendLogic", "noAuthentication"];
  for (const field of trueBoundaryRequirements) {
    if (config.boundaries?.[field] !== true) blockers.push(`${field} must remain true`);
  }

  const falseBoundaryRequirements = [
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
    localWorkerInstallApprovalRecordStatus: blockers.length === 0 ? "ready" : "blocked",
    validationFailedCount: blockers.length,
    blockers,
    declaredFileCount: config.declaredPaths?.length ?? 0,
    installApprovalRecordRequirementCount: config.counts?.installApprovalRecordRequirements?.length ?? 0,
    installApprovalRecordFieldCount: config.counts?.installApprovalRecordFields?.length ?? 0,
    installApprovalRecordEvidenceCount: config.counts?.evidenceRequirements?.length ?? 0,
    installApprovalRecordSignalCount: config.counts?.installApprovalRecordSignals?.length ?? 0,
    safetyGateCount: config.counts?.safetyGates?.length ?? 0,
    appBindingCount: requiredAppBindings.length,
    ...config.summary,
    ...config.boundaries,
  };

  if (result.declaredFileCount !== 5) result.blockers.push("declaredFileCount must equal 5");
  if (result.installApprovalRecordRequirementCount !== 6) result.blockers.push("installApprovalRecordRequirementCount must equal 6");
  if (result.installApprovalRecordFieldCount !== 8) result.blockers.push("installApprovalRecordFieldCount must equal 8");
  if (result.installApprovalRecordEvidenceCount !== 6) result.blockers.push("installApprovalRecordEvidenceCount must equal 6");
  if (result.installApprovalRecordSignalCount !== 8) result.blockers.push("installApprovalRecordSignalCount must equal 8");
  if (result.safetyGateCount !== 90) result.blockers.push("safetyGateCount must equal 90");
  if (result.appBindingCount !== 5) result.blockers.push("appBindingCount must equal 5");

  if (result.blockers.length > 0) {
    result.ok = false;
    result.status = "blocked";
    result.localWorkerInstallApprovalRecordStatus = "blocked";
    result.validationFailedCount = result.blockers.length;
  }

  if (options.writeArtifacts) writeReport(rootDir, result);
  return result;
}
