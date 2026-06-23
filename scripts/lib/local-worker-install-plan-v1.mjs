import fs from "node:fs";
import path from "node:path";

export function createDefaultLocalWorkerInstallPlanV1() {
  return {
    phase: 62,
    name: "local-worker-install-plan-v1",
    declaredPaths: [
      "docs/phases/PHASE_62_LOCAL_WORKER_INSTALL_PLAN_V1.md",
      "apps/operator-console/src/local-worker-install-plan.ts",
      "scripts/lib/local-worker-install-plan-v1.mjs",
      "scripts/run-local-worker-install-plan-v1.mjs",
      "tests/integration/local-worker-install-plan-v1.test.ts",
    ],
    installPlanFields: [
      "owner",
      "installPlanId",
      "sourcePhase",
      "safeState",
      "ownerApprovalRequired",
      "localWorkerReadyForInstall",
      "installPlanApproved",
      "workerInstallApproved",
    ],
    installPlanSignals: [
      "install plan surface",
      "phase 61 unlock proposal dependency",
      "owner approval requirement",
      "rollback plan requirement",
      "installation evidence requirement",
      "worker health check plan requirement",
      "workspace boundary requirement",
      "actual install remains blocked",
    ],
    requiredRequirementIds: [
      "phase-61-unlock-proposal-reviewed",
      "owner-approval-required",
      "rollback-policy-required",
      "install-evidence-required",
      "worker-health-check-plan-required",
      "workspace-boundary-required",
    ],
    evidenceRequirements: [
      "Phase 61 unlock proposal closeout proof",
      "owner approval record requirement",
      "rollback plan evidence requirement",
      "installation evidence and log requirement",
      "worker health check plan evidence requirement",
      "workspace boundary and no-secret leakage evidence requirement",
    ],
    requiredSafetyGates: [
      "Local worker install plan only",
      "Tyler remains the install plan owner",
      "Install plan is declarative only",
      "Install plan prepares owner review without installing a worker",
      "Install plan does not approve execution",
      "Install plan does not mark the worker ready for install",
      "Install plan does not approve the install plan",
      "Install plan does not approve worker installation",
      "Install plan does not install a worker",
      "Install plan does not download dependencies",
      "Install plan does not create files",
      "Install plan does not mutate files",
      "Install plan does not mutate source",
      "Install plan does not mutate the filesystem",
      "Install plan does not connect to a worker",
      "Install plan does not start a worker",
      "Install plan does not spawn a worker process",
      "Install plan does not poll worker health",
      "Install plan does not inspect running processes",
      "Install plan does not create scheduled tasks",
      "Install plan does not modify scheduled tasks",
      "Install plan does not delete scheduled tasks",
      "Install plan does not enable scheduled tasks",
      "Install plan does not disable scheduled tasks",
      "Install plan does not query Windows Task Scheduler",
      "Install plan does not run scheduled tasks",
      "Install plan does not execute PowerShell",
      "Install plan does not execute schtasks",
      "Install plan does not execute commands",
      "Install plan does not execute shell commands",
      "Install plan does not execute tasks",
      "Install plan does not persist task records",
      "Install plan does not persist owner records",
      "Install plan does not persist unlock proposal decisions",
      "Install plan does not persist install decisions",
      "Install plan does not connect to runner infrastructure",
      "Install plan does not route work",
      "Install plan does not process work automatically",
      "Install plan does not merge branches",
      "Install plan cannot self-approve",
      "Phase 61 unlock proposal prerequisite remains represented",
      "Phase 60 readiness gate prerequisite remains represented",
      "Owner approval is required before any future install",
      "Manual review is required before any future install",
      "Emergency stop compatibility is required before any future install",
      "Command allowlist compatibility is required before any future install",
      "Rollback policy is required before any future install",
      "Workspace boundary is required before any future install",
      "Install evidence is required before any future install",
      "Worker health evidence plan is required before any future install",
      "Local worker ready for install remains false by design",
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
      "Future install requires install location plan",
      "Future install requires dependency inventory",
      "Future install requires rollback plan",
      "Future install requires recovery checkpoint plan",
      "Future install requires worker health check plan",
      "Future install requires dry-run smoke test plan",
      "Future install requires scheduler hold plan",
      "Future install requires morning packet review plan",
      "Future install requires command allowlist review",
      "Future install requires emergency stop review",
      "Future install requires session lock review",
      "Future install requires workspace boundary review",
      "Future install requires secret handling review",
      "Future install requires audit evidence review",
      "Future install requires no-secret leakage review",
      "No backend install service",
      "No authentication changes",
      "No live worker connection",
      "No actual worker install",
      "No installer execution",
    ],
    requiredAppBindings: [
      "localWorkerInstallPlanPacket.installPlanSummary.owner",
      "localWorkerInstallPlanPacket.installPlanRequirements.length",
      "localWorkerInstallPlanPacket.evidenceRequirements.length",
      "localWorkerInstallPlanPacket.boundaries.workerInstallAllowed",
      "localWorkerInstallPlanPacket.installPlanSummary.installPlanApproved",
    ],
    summary: {
      phase61UnlockProposalReady: true,
      phase60ReadinessGateReady: true,
      ownerApprovalRequired: true,
      manualReviewRequired: true,
      emergencyStopRequired: true,
      commandAllowlistRequired: true,
      rollbackPolicyRequired: true,
      workspaceBoundaryRequired: true,
      installEvidenceRequired: true,
      workerHealthEvidencePlanRequired: true,
      localWorkerReadyForInstall: false,
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
    boundaries: {
      localOnly: true,
      privateAppOnly: true,
      installPlanOnly: true,
      ownerReviewOnly: true,
      declarativeOnly: true,
      readOnly: true,
      frontendOnly: true,
      noBackendLogic: true,
      noAuthentication: true,
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
      finalApprovalAllowed: false,
      autoApprovalAllowed: false,
      autoProcessingAllowed: false,
      autoRouteAllowed: false,
      autoMergeAllowed: false,
      selfApprovalAllowed: false,
    },
  };
}

function isSafeRelativePath(value) {
  return typeof value === "string" && value.length > 0 && !path.isAbsolute(value) && !value.split(/[\\/]+/).includes("..");
}

function readTextIfExists(filePath) {
  if (!fs.existsSync(filePath)) return "";
  return fs.readFileSync(filePath, "utf8");
}

function ensureIncludesAll(content, required, label, blockers) {
  for (const item of required) {
    if (!content.includes(item)) blockers.push(`${label} missing required binding: ${item}`);
  }
}

function writeReports(rootDir, result) {
  const reportDir = path.join(rootDir, ".sera-local-worker-install-plan");
  fs.mkdirSync(reportDir, { recursive: true });

  const jsonPath = path.join(reportDir, "phase62-local-worker-install-plan-status.json");
  const mdPath = path.join(reportDir, "phase62-local-worker-install-plan-status.md");

  fs.writeFileSync(jsonPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  fs.writeFileSync(
    mdPath,
    [
      "# Phase 62 Local Worker Install Plan v1",
      "",
      `Status: ${result.status}`,
      `Ready: ${result.ok ? "yes" : "no"}`,
      `Validation failures: ${result.validationFailedCount}`,
      `Owner approval required: ${result.ownerApprovalRequired ? "yes" : "no"}`,
      `Install plan approved: ${result.installPlanApproved ? "yes" : "no"}`,
      `Worker install approved: ${result.workerInstallApproved ? "yes" : "no"}`,
      `Worker install allowed: ${result.workerInstallAllowed ? "yes" : "no"}`,
      `Installer execution allowed: ${result.installerExecutionAllowed ? "yes" : "no"}`,
      "",
      "This report is a local install plan artifact only. It does not install workers, download dependencies, execute installers, connect workers, schedule work, execute commands, execute tasks, persist install decisions, mutate files, mutate source, or approve execution.",
      "",
    ].join("\n"),
    "utf8",
  );
}

export function inspectLocalWorkerInstallPlanV1(config = createDefaultLocalWorkerInstallPlanV1(), options = {}) {
  const rootDir = options.rootDir || process.cwd();
  const writeArtifacts = options.writeArtifacts !== false;
  const blockers = [];

  for (const declaredPath of config.declaredPaths || []) {
    if (!isSafeRelativePath(declaredPath)) {
      blockers.push(`Declared path must be safe and relative: ${declaredPath}`);
      continue;
    }
    if (!fs.existsSync(path.join(rootDir, declaredPath))) blockers.push(`Declared file missing: ${declaredPath}`);
  }

  if ((config.declaredPaths || []).length !== 5) blockers.push("Phase 62 must declare exactly 5 source files");
  if ((config.installPlanFields || []).length !== 8) blockers.push("Phase 62 must expose exactly 8 install plan fields");
  if ((config.installPlanSignals || []).length !== 8) blockers.push("Phase 62 must expose exactly 8 install plan signals");
  if ((config.requiredRequirementIds || []).length !== 6) blockers.push("Phase 62 must expose exactly 6 install plan requirements");
  if ((config.evidenceRequirements || []).length !== 6) blockers.push("Phase 62 must expose exactly 6 evidence requirements");
  if ((config.requiredSafetyGates || []).length !== 82) blockers.push("Phase 62 must expose exactly 82 safety gates");
  if ((config.requiredAppBindings || []).length !== 5) blockers.push("Phase 62 must expose exactly 5 app bindings");

  const appContent = readTextIfExists(path.join(rootDir, "apps/operator-console/src/App.tsx"));
  ensureIncludesAll(appContent, config.requiredAppBindings || [], "App.tsx", blockers);
  if (!appContent.includes("Local Worker Install Plan")) blockers.push("App.tsx missing Local Worker Install Plan card");

  const packageJsonText = readTextIfExists(path.join(rootDir, "package.json"));
  if (!packageJsonText.includes('"phase62:demo"')) blockers.push("package.json missing phase62:demo script");
  if (!packageJsonText.includes('"phase62:verify"')) blockers.push("package.json missing phase62:verify script");

  const requiredTrueBoundaries = [
    "localOnly",
    "privateAppOnly",
    "installPlanOnly",
    "ownerReviewOnly",
    "declarativeOnly",
    "readOnly",
    "frontendOnly",
    "noBackendLogic",
    "noAuthentication",
  ];
  const requiredFalseBoundaries = [
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
    "finalApprovalAllowed",
    "autoApprovalAllowed",
    "autoProcessingAllowed",
    "autoRouteAllowed",
    "autoMergeAllowed",
    "selfApprovalAllowed",
  ];

  for (const key of requiredTrueBoundaries) {
    if (config.boundaries[key] !== true) blockers.push(`${key} must remain true`);
  }
  for (const key of requiredFalseBoundaries) {
    if (config.boundaries[key] !== false) blockers.push(`${key} must remain false`);
  }

  const requiredTrueSummary = [
    "phase61UnlockProposalReady",
    "phase60ReadinessGateReady",
    "ownerApprovalRequired",
    "manualReviewRequired",
    "emergencyStopRequired",
    "commandAllowlistRequired",
    "rollbackPolicyRequired",
    "workspaceBoundaryRequired",
    "installEvidenceRequired",
    "workerHealthEvidencePlanRequired",
  ];
  const requiredFalseSummary = [
    "localWorkerReadyForInstall",
    "installPlanApproved",
    "executionUnlockApproved",
    "overnightWorkAuthorized",
    "workerInstallApproved",
    "workerInstalled",
    "workerConnected",
    "windowsSchedulerConfigured",
    "scheduledExecutionAllowed",
  ];
  for (const key of requiredTrueSummary) {
    if (config.summary[key] !== true) blockers.push(`${key} must remain true`);
  }
  for (const key of requiredFalseSummary) {
    if (config.summary[key] !== false) blockers.push(`${key} must remain false`);
  }
  if (config.summary.executableScheduleCount !== 0) blockers.push("executableScheduleCount must remain zero");

  const ok = blockers.length === 0;
  const result = {
    ok,
    status: ok ? "passed" : "blocked",
    localWorkerInstallPlanStatus: ok ? "ready" : "blocked",
    validationFailedCount: blockers.length,
    blockers,
    declaredFileCount: config.declaredPaths.length,
    installPlanRequirementCount: config.requiredRequirementIds.length,
    installPlanFieldCount: config.installPlanFields.length,
    installPlanEvidenceCount: config.evidenceRequirements.length,
    installPlanSignalCount: config.installPlanSignals.length,
    safetyGateCount: config.requiredSafetyGates.length,
    appBindingCount: config.requiredAppBindings.length,
    ...config.summary,
    ...config.boundaries,
  };

  if (writeArtifacts) writeReports(rootDir, result);
  return result;
}

export function runLocalWorkerInstallPlanV1(options = {}) {
  const result = inspectLocalWorkerInstallPlanV1(createDefaultLocalWorkerInstallPlanV1(), options);
  if (!result.ok) {
    const error = new Error(`Phase 62 local worker install plan failed: ${result.blockers.join("; ")}`);
    error.result = result;
    throw error;
  }
  return result;
}
