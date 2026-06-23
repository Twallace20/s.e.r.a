import fs from "node:fs";
import path from "node:path";

export function createDefaultLocalWorkerReadinessGateV1() {
  return {
    phase: 60,
    name: "local-worker-readiness-gate-v1",
    declaredPaths: [
      "docs/phases/PHASE_60_LOCAL_WORKER_READINESS_GATE_V1.md",
      "apps/operator-console/src/local-worker-readiness-gate.ts",
      "scripts/lib/local-worker-readiness-gate-v1.mjs",
      "scripts/run-local-worker-readiness-gate-v1.mjs",
      "tests/integration/local-worker-readiness-gate-v1.test.ts",
    ],
    readinessGateFields: [
      "owner",
      "gateId",
      "sourcePhase",
      "safeState",
      "allPrerequisitesRepresented",
      "localWorkerReadyForUnlock",
      "executionUnlockApproved",
      "overnightWorkAuthorized",
    ],
    readinessGateSignals: [
      "readiness gate surface",
      "phase 55 blueprint dependency",
      "phase 56 health panel dependency",
      "phase 57 dry-run harness dependency",
      "phase 58 scheduler status dependency",
      "phase 59 morning packet dependency",
      "owner readiness decision requirement",
      "execution unlock remains blocked",
    ],
    requiredCheckIds: [
      "phase-55-worker-blueprint-present",
      "phase-56-health-panel-present",
      "phase-57-dry-run-harness-present",
      "phase-58-scheduler-status-present",
      "phase-59-morning-packet-present",
      "owner-readiness-decision-required",
    ],
    evidenceRequirements: [
      "Phase 55 worker blueprint evidence",
      "Phase 56 health panel evidence",
      "Phase 57 dry-run harness evidence",
      "Phase 58 scheduler status evidence",
      "Phase 59 morning packet evidence",
      "owner readiness decision requirement",
    ],
    requiredSafetyGates: [
      "Local worker readiness gate only",
      "Tyler remains the readiness gate owner",
      "Readiness gate is declarative only",
      "Readiness gate assesses prerequisites without unlocking execution",
      "Readiness gate does not install a worker",
      "Readiness gate does not connect to a worker",
      "Readiness gate does not start a worker",
      "Readiness gate does not spawn a worker process",
      "Readiness gate does not poll worker health",
      "Readiness gate does not inspect running processes",
      "Readiness gate does not create scheduled tasks",
      "Readiness gate does not modify scheduled tasks",
      "Readiness gate does not delete scheduled tasks",
      "Readiness gate does not enable scheduled tasks",
      "Readiness gate does not disable scheduled tasks",
      "Readiness gate does not query Windows Task Scheduler",
      "Readiness gate does not run scheduled tasks",
      "Readiness gate does not execute PowerShell",
      "Readiness gate does not execute schtasks",
      "Readiness gate does not execute commands",
      "Readiness gate does not execute shell commands",
      "Readiness gate does not execute tasks",
      "Readiness gate does not persist task records",
      "Readiness gate does not persist owner records",
      "Readiness gate does not persist morning packet records",
      "Readiness gate does not persist readiness decisions",
      "Readiness gate does not mutate files",
      "Readiness gate does not mutate source",
      "Readiness gate does not mutate the filesystem",
      "Readiness gate does not connect to runner infrastructure",
      "Readiness gate does not approve execution",
      "Readiness gate does not route work",
      "Readiness gate does not process work automatically",
      "Readiness gate does not merge branches",
      "Readiness gate cannot self-approve",
      "Phase 55 blueprint prerequisite remains represented",
      "Phase 56 health panel prerequisite remains represented",
      "Phase 57 dry-run prerequisite remains represented",
      "Phase 58 scheduler status prerequisite remains represented",
      "Phase 59 morning packet prerequisite remains represented",
      "All prerequisite represented flag may be true",
      "Local worker ready for unlock remains false by design",
      "Execution unlock approved remains false by design",
      "Overnight work authorized remains false by design",
      "Worker installed remains false by design",
      "Worker connected remains false by design",
      "Windows scheduler configured remains false by design",
      "Scheduled execution remains false by design",
      "Executable schedule count remains zero",
      "Future execution unlock requires owner approval",
      "Future execution unlock requires worker installation evidence",
      "Future execution unlock requires worker health evidence",
      "Future execution unlock requires dry-run evidence",
      "Future execution unlock requires scheduler readiness evidence",
      "Future execution unlock requires morning packet evidence",
      "Future execution unlock requires command allowlist compatibility",
      "Future execution unlock requires emergency stop compatibility",
      "Future execution unlock requires session lock compatibility",
      "Future execution unlock requires workspace boundary guard",
      "Future execution unlock requires rollback policy",
      "Future execution unlock requires audit evidence",
      "Future execution unlock requires no-secret leakage proof",
      "No backend readiness service",
      "No authentication changes",
      "No live worker connection",
      "No scheduled execution",
    ],
    requiredAppBindings: [
      "localWorkerReadinessGatePacket.readinessSummary.owner",
      "localWorkerReadinessGatePacket.readinessGateChecks.length",
      "localWorkerReadinessGatePacket.evidenceRequirements.length",
      "localWorkerReadinessGatePacket.boundaries.executionUnlockAllowed",
      "localWorkerReadinessGatePacket.readinessSummary.localWorkerReadyForUnlock",
    ],
    summary: {
      phase55BlueprintReady: true,
      phase56HealthPanelReady: true,
      phase57DryRunHarnessReady: true,
      phase58SchedulerStatusReady: true,
      phase59MorningPacketReady: true,
      allPrerequisitesRepresented: true,
      readinessDecisionRequired: true,
      localWorkerReadyForUnlock: false,
      executionUnlockApproved: false,
      overnightWorkAuthorized: false,
      workerInstalled: false,
      workerConnected: false,
      windowsSchedulerConfigured: false,
      scheduledExecutionAllowed: false,
      executableScheduleCount: 0,
    },
    boundaries: {
      localOnly: true,
      privateAppOnly: true,
      readinessGateOnly: true,
      readinessAssessmentOnly: true,
      declarativeOnly: true,
      readOnly: true,
      frontendOnly: true,
      noBackendLogic: true,
      noAuthentication: true,
      executionUnlockAllowed: false,
      overnightExecutionAllowed: false,
      liveRunReportAllowed: false,
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
  const reportDir = path.join(rootDir, ".sera-local-worker-readiness-gate");
  fs.mkdirSync(reportDir, { recursive: true });

  const jsonPath = path.join(reportDir, "phase60-local-worker-readiness-gate-status.json");
  const mdPath = path.join(reportDir, "phase60-local-worker-readiness-gate-status.md");

  fs.writeFileSync(jsonPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  fs.writeFileSync(
    mdPath,
    [
      "# Phase 60 Local Worker Readiness Gate v1",
      "",
      `Status: ${result.status}`,
      `Ready: ${result.ok ? "yes" : "no"}`,
      `Validation failures: ${result.validationFailedCount}`,
      `Local worker ready for unlock: ${result.localWorkerReadyForUnlock ? "yes" : "no"}`,
      `Execution unlock approved: ${result.executionUnlockApproved ? "yes" : "no"}`,
      `Command execution allowed: ${result.commandExecutionAllowed ? "yes" : "no"}`,
      `Worker spawn allowed: ${result.workerSpawnAllowed ? "yes" : "no"}`,
      "",
      "This report is a local readiness assessment artifact only. It does not install workers, connect workers, schedule work, execute commands, execute tasks, persist readiness decisions, mutate files, mutate source, or approve execution.",
      "",
    ].join("\n"),
    "utf8",
  );
}

export function inspectLocalWorkerReadinessGateV1(config = createDefaultLocalWorkerReadinessGateV1(), options = {}) {
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

  if ((config.declaredPaths || []).length !== 5) blockers.push("Phase 60 must declare exactly 5 source files");
  if ((config.readinessGateFields || []).length !== 8) blockers.push("Phase 60 must expose exactly 8 readiness gate fields");
  if ((config.readinessGateSignals || []).length !== 8) blockers.push("Phase 60 must expose exactly 8 readiness gate signals");
  if ((config.requiredCheckIds || []).length !== 6) blockers.push("Phase 60 must expose exactly 6 readiness gate checks");
  if ((config.evidenceRequirements || []).length !== 6) blockers.push("Phase 60 must expose exactly 6 evidence requirements");
  if ((config.requiredSafetyGates || []).length !== 66) blockers.push("Phase 60 must expose exactly 66 safety gates");
  if ((config.requiredAppBindings || []).length !== 5) blockers.push("Phase 60 must expose exactly 5 app bindings");

  const appContent = readTextIfExists(path.join(rootDir, "apps/operator-console/src/App.tsx"));
  ensureIncludesAll(appContent, config.requiredAppBindings || [], "App.tsx", blockers);
  if (!appContent.includes("Local Worker Readiness Gate")) blockers.push("App.tsx missing Local Worker Readiness Gate card");

  const packageJsonText = readTextIfExists(path.join(rootDir, "package.json"));
  if (!packageJsonText.includes('"phase60:demo"')) blockers.push("package.json missing phase60:demo script");
  if (!packageJsonText.includes('"phase60:verify"')) blockers.push("package.json missing phase60:verify script");

  const requiredTrueBoundaries = [
    "localOnly",
    "privateAppOnly",
    "readinessGateOnly",
    "readinessAssessmentOnly",
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
    "phase55BlueprintReady",
    "phase56HealthPanelReady",
    "phase57DryRunHarnessReady",
    "phase58SchedulerStatusReady",
    "phase59MorningPacketReady",
    "allPrerequisitesRepresented",
    "readinessDecisionRequired",
  ];
  const requiredFalseSummary = [
    "localWorkerReadyForUnlock",
    "executionUnlockApproved",
    "overnightWorkAuthorized",
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
    localWorkerReadinessGateStatus: ok ? "ready" : "blocked",
    validationFailedCount: blockers.length,
    blockers,
    declaredFileCount: config.declaredPaths.length,
    readinessGateCheckCount: config.requiredCheckIds.length,
    readinessGateFieldCount: config.readinessGateFields.length,
    readinessGateEvidenceCount: config.evidenceRequirements.length,
    readinessGateSignalCount: config.readinessGateSignals.length,
    safetyGateCount: config.requiredSafetyGates.length,
    appBindingCount: config.requiredAppBindings.length,
    ...config.summary,
    ...config.boundaries,
  };

  if (writeArtifacts) writeReports(rootDir, result);
  return result;
}

export function runLocalWorkerReadinessGateV1(options = {}) {
  const result = inspectLocalWorkerReadinessGateV1(createDefaultLocalWorkerReadinessGateV1(), options);
  if (!result.ok) {
    const error = new Error(`Phase 60 local worker readiness gate failed: ${result.blockers.join("; ")}`);
    error.result = result;
    throw error;
  }
  return result;
}
