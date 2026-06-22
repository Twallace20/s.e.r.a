import fs from "node:fs";
import path from "node:path";

export function createDefaultWindowsTaskSchedulerStatusCheckV1() {
  return {
    phase: 58,
    name: "windows-task-scheduler-status-check-v1",
    declaredPaths: [
      "docs/phases/PHASE_58_WINDOWS_TASK_SCHEDULER_STATUS_CHECK_V1.md",
      "apps/operator-console/src/windows-task-scheduler-status-check.ts",
      "scripts/lib/windows-task-scheduler-status-check-v1.mjs",
      "scripts/run-windows-task-scheduler-status-check-v1.mjs",
      "tests/integration/windows-task-scheduler-status-check-v1.test.ts",
    ],
    schedulerCheckFields: [
      "owner",
      "sourcePhase",
      "safeState",
      "windowsSchedulerConfigured",
      "scheduledExecutionAllowed",
      "workerInstalled",
      "workerConnected",
      "executableScheduleCount"
],
    schedulerStatusSignals: [
      "scheduler readiness surface",
      "Windows scheduler configured flag",
      "scheduled execution blocked flag",
      "worker offline flag",
      "manual owner schedule gate",
      "dry-run evidence dependency",
      "emergency stop dependency",
      "command allowlist dependency"
],
    requiredIndicatorIds: [
      "scheduler-not-configured",
      "scheduled-execution-blocked",
      "worker-offline",
      "dry-run-evidence-required",
      "owner-schedule-gate-required",
      "emergency-stop-required"
],
    evidenceRequirements: [
      "scheduler readiness summary",
      "blocked scheduled execution summary",
      "worker offline summary",
      "dry-run dependency summary",
      "owner schedule gate summary",
      "emergency stop dependency summary"
],
    requiredSafetyGates: [
      "Windows Task Scheduler status check only",
      "Tyler remains the scheduling readiness owner",
      "Scheduler state is declarative only",
      "Scheduler readiness is represented without querying the operating system",
      "Scheduler status check does not create scheduled tasks",
      "Scheduler status check does not modify scheduled tasks",
      "Scheduler status check does not delete scheduled tasks",
      "Scheduler status check does not enable scheduled tasks",
      "Scheduler status check does not disable scheduled tasks",
      "Scheduler status check does not run scheduled tasks",
      "Scheduler status check does not register Windows services",
      "Scheduler status check does not install a worker",
      "Scheduler status check does not start a worker",
      "Scheduler status check does not connect to a worker",
      "Scheduler status check does not poll worker health",
      "Scheduler status check does not inspect running processes",
      "Scheduler status check does not read Windows Task Scheduler live state",
      "Scheduler status check does not query PowerShell",
      "Scheduler status check does not execute schtasks",
      "Scheduler status check does not execute commands",
      "Scheduler status check does not execute shell commands",
      "Scheduler status check does not execute tasks",
      "Scheduler status check does not persist task records",
      "Scheduler status check does not persist owner records",
      "Scheduler status check does not mutate files",
      "Scheduler status check does not mutate source",
      "Scheduler status check does not mutate the filesystem",
      "Scheduler status check does not connect to runner infrastructure",
      "Scheduler status check does not approve execution",
      "Scheduler status check does not route work",
      "Scheduler status check does not process work automatically",
      "Scheduler status check does not merge branches",
      "Scheduler status check cannot self-approve",
      "Windows scheduler configured remains false by design",
      "Scheduled execution remains false by design",
      "Worker installed remains false by design",
      "Worker connected remains false by design",
      "Executable schedule count remains zero",
      "Future scheduling requires owner approval",
      "Future scheduling requires command allowlist",
      "Future scheduling requires workspace boundary guard",
      "Future scheduling requires emergency stop compatibility",
      "Future scheduling requires dry-run evidence",
      "Future scheduling requires health panel evidence",
      "Future scheduling requires validation gate",
      "Future scheduling requires rollback policy",
      "No backend scheduler service",
      "No authentication changes",
      "No scheduled execution",
      "No self-approval"
],
    requiredAppBindings: [
      "windowsTaskSchedulerStatusCheckPacket.schedulerSummary.owner",
      "windowsTaskSchedulerStatusCheckPacket.schedulerReadinessIndicators.length",
      "windowsTaskSchedulerStatusCheckPacket.evidenceRequirements.length",
      "windowsTaskSchedulerStatusCheckPacket.boundaries.scheduledExecutionAllowed",
      "windowsTaskSchedulerStatusCheckPacket.boundaries.schedulerCreationAllowed",
    ],
    boundaries: {
      localOnly: true,
      privateAppOnly: true,
      schedulerStatusCheckOnly: true,
      schedulerSurfaceOnly: true,
      declarativeOnly: true,
      readOnly: true,
      frontendOnly: true,
      noBackendLogic: true,
      noAuthentication: true,
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
      finalApprovalAllowed: false,
      autoApprovalAllowed: false,
      autoProcessingAllowed: false,
      autoRouteAllowed: false,
      autoMergeAllowed: false,
      selfApprovalAllowed: false,
    },
  };
}

function isSafeRelativePath(relativePath) {
  return (
    typeof relativePath === "string" &&
    relativePath.length > 0 &&
    !path.isAbsolute(relativePath) &&
    !relativePath.split(/[\/]+/).includes("..")
  );
}

function readIfExists(rootDir, relativePath) {
  const fullPath = path.join(rootDir, relativePath);
  if (!fs.existsSync(fullPath)) return null;
  return fs.readFileSync(fullPath, "utf8");
}

function writeReports(rootDir, result) {
  const reportDir = path.join(rootDir, ".sera-windows-task-scheduler-status-check");
  fs.mkdirSync(reportDir, { recursive: true });
  const jsonPath = path.join(reportDir, "phase58-windows-task-scheduler-status-check-status.json");
  const markdownPath = path.join(reportDir, "phase58-windows-task-scheduler-status-check-status.md");

  fs.writeFileSync(jsonPath, `${JSON.stringify(result, null, 2)}
`, "utf8");
  fs.writeFileSync(
    markdownPath,
    [
      "# Phase 58 Windows Task Scheduler Status Check v1",
      "",
      `Status: ${result.windowsTaskSchedulerStatusCheckStatus}`,
      `Validation failed count: ${result.validationFailedCount}`,
      `Declared file count: ${result.declaredFileCount}`,
      `Scheduler readiness indicator count: ${result.schedulerReadinessIndicatorCount}`,
      `Scheduler check field count: ${result.schedulerCheckFieldCount}`,
      `Scheduler status signal count: ${result.schedulerStatusSignalCount}`,
      `Safety gate count: ${result.safetyGateCount}`,
      "",
      "## Scheduler state",
      "",
      `- Windows scheduler configured: ${result.windowsSchedulerConfigured}`,
      `- Scheduled execution allowed: ${result.scheduledExecutionAllowed}`,
      `- Scheduler creation allowed: ${result.schedulerCreationAllowed}`,
      `- Scheduler query allowed: ${result.schedulerQueryAllowed}`,
      "",
      "## Boundaries",
      "",
      `- Local only: ${result.localOnly}`,
      `- Private app only: ${result.privateAppOnly}`,
      `- Scheduler status check only: ${result.schedulerStatusCheckOnly}`,
      `- Declarative only: ${result.declarativeOnly}`,
      `- Command execution allowed: ${result.commandExecutionAllowed}`,
      `- PowerShell execution allowed: ${result.powershellExecutionAllowed}`,
      `- schtasks execution allowed: ${result.schtasksExecutionAllowed}`,
      `- Worker spawn allowed: ${result.workerSpawnAllowed}`,
      `- Task execution allowed: ${result.taskExecutionAllowed}`,
      `- Self approval allowed: ${result.selfApprovalAllowed}`,
      "",
      "## Blockers",
      "",
      ...(result.blockers.length ? result.blockers.map((blocker) => `- ${blocker}`) : ["- none"]),
      "",
    ].join("\n"),
    "utf8",
  );
}

export function inspectWindowsTaskSchedulerStatusCheckV1(config = createDefaultWindowsTaskSchedulerStatusCheckV1(), options = {}) {
  const rootDir = options.rootDir || process.cwd();
  const writeArtifacts = options.writeArtifacts !== false;
  const blockers = [];

  for (const declaredPath of config.declaredPaths) {
    if (!isSafeRelativePath(declaredPath)) {
      blockers.push(`Declared path must be safe and relative: ${declaredPath}`);
      continue;
    }
    if (!fs.existsSync(path.join(rootDir, declaredPath))) {
      blockers.push(`Declared path does not exist: ${declaredPath}`);
    }
  }

  const schedulerContent = readIfExists(rootDir, "apps/operator-console/src/windows-task-scheduler-status-check.ts") || "";
  const appContent = readIfExists(rootDir, "apps/operator-console/src/App.tsx") || "";
  const packageContent = readIfExists(rootDir, "package.json") || "";

  if (!schedulerContent.includes("export const windowsTaskSchedulerStatusCheckPacket")) {
    blockers.push("Windows Task Scheduler status check file must export windowsTaskSchedulerStatusCheckPacket");
  }

  if (!schedulerContent.includes("Phase 58 · Windows Task Scheduler Status Check v1")) {
    blockers.push("Windows Task Scheduler status check packet must identify Phase 58");
  }

  if (!schedulerContent.includes("Tyler Wallace")) {
    blockers.push("Windows Task Scheduler status check packet must identify Tyler Wallace as owner");
  }

  if (!schedulerContent.includes("scheduler-readiness-only")) {
    blockers.push("Windows Task Scheduler status check must keep scheduler state readiness-only");
  }

  if (!schedulerContent.includes("windowsSchedulerConfigured: false")) {
    blockers.push("Windows scheduler configured must remain false by design");
  }

  if (!schedulerContent.includes("scheduledExecutionAllowed: false")) {
    blockers.push("scheduledExecutionAllowed must remain false in source packet");
  }

  if (!schedulerContent.includes("executableScheduleCount: 0")) {
    blockers.push("executableScheduleCount must remain 0");
  }

  for (const field of config.schedulerCheckFields) {
    if (!schedulerContent.includes(field)) blockers.push(`Windows Task Scheduler status check missing field: ${field}`);
  }

  for (const signal of config.schedulerStatusSignals) {
    if (!schedulerContent.includes(signal)) blockers.push(`Windows Task Scheduler status check missing signal: ${signal}`);
  }

  for (const indicatorId of config.requiredIndicatorIds) {
    if (!schedulerContent.includes(indicatorId)) blockers.push(`Windows Task Scheduler status check missing indicator id: ${indicatorId}`);
  }

  for (const evidence of config.evidenceRequirements) {
    if (!schedulerContent.includes(evidence)) blockers.push(`Windows Task Scheduler status check missing evidence requirement: ${evidence}`);
  }

  for (const gate of config.requiredSafetyGates) {
    if (!schedulerContent.includes(gate)) blockers.push(`Windows Task Scheduler status check missing safety gate: ${gate}`);
  }

  for (const binding of config.requiredAppBindings) {
    if (!appContent.includes(binding)) blockers.push(`App.tsx missing Windows Task Scheduler status check binding: ${binding}`);
  }

  if (!packageContent.includes("phase58:demo")) blockers.push("package.json missing phase58:demo script");
  if (!packageContent.includes("phase58:verify")) blockers.push("package.json missing phase58:verify script");

  const boundaries = config.boundaries;
  for (const [key, value] of Object.entries(boundaries)) {
    if (key.endsWith("Allowed") || key === "mutatesSource") {
      if (value !== false) blockers.push(`${key} must remain false`);
    }
  }

  const requiredTrue = [
    "localOnly",
    "privateAppOnly",
    "schedulerStatusCheckOnly",
    "schedulerSurfaceOnly",
    "declarativeOnly",
    "readOnly",
    "frontendOnly",
    "noBackendLogic",
    "noAuthentication",
  ];
  for (const key of requiredTrue) {
    if (boundaries[key] !== true) blockers.push(`${key} must remain true`);
  }

  const result = {
    ok: blockers.length === 0,
    status: blockers.length === 0 ? "passed" : "failed",
    windowsTaskSchedulerStatusCheckStatus: blockers.length === 0 ? "ready" : "blocked",
    validationFailedCount: blockers.length,
    blockers,
    declaredFileCount: config.declaredPaths.length,
    schedulerReadinessIndicatorCount: config.requiredIndicatorIds.length,
    schedulerCheckFieldCount: config.schedulerCheckFields.length,
    schedulerStatusSignalCount: config.schedulerStatusSignals.length,
    schedulerEvidenceCount: config.evidenceRequirements.length,
    safetyGateCount: config.requiredSafetyGates.length,
    appBindingCount: config.requiredAppBindings.length,
    windowsSchedulerConfigured: false,
    workerInstalled: false,
    workerConnected: false,
    executableScheduleCount: 0,
    ...boundaries,
  };

  if (writeArtifacts) writeReports(rootDir, result);
  return result;
}
