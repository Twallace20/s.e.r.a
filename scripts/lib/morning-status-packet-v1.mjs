import fs from "node:fs";
import path from "node:path";

export function createDefaultMorningStatusPacketV1() {
  return {
    phase: 59,
    name: "morning-status-packet-v1",
    declaredPaths: [
      "docs/phases/PHASE_59_MORNING_STATUS_PACKET_V1.md",
      "apps/operator-console/src/morning-status-packet.ts",
      "scripts/lib/morning-status-packet-v1.mjs",
      "scripts/run-morning-status-packet-v1.mjs",
      "tests/integration/morning-status-packet-v1.test.ts",
    ],
    morningPacketFields: [
      "owner",
      "sourcePhase",
      "reportWindow",
      "safeState",
      "overnightWorkExecuted",
      "workerConnected",
      "windowsSchedulerConfigured",
      "reportGeneratedFromLiveRun",
    ],
    morningStatusSignals: [
      "morning review surface",
      "overnight work not-run flag",
      "scheduler readiness dependency",
      "worker offline dependency",
      "dry-run evidence dependency",
      "validation summary dependency",
      "owner morning review requirement",
      "emergency stop dependency",
    ],
    requiredSectionIds: [
      "overnight-work-not-run",
      "scheduler-readiness-summary",
      "worker-readiness-summary",
      "dry-run-evidence-summary",
      "validation-summary",
      "owner-morning-review",
    ],
    evidenceRequirements: [
      "no overnight execution statement",
      "scheduler readiness summary",
      "worker readiness summary",
      "dry-run harness summary",
      "validation gate summary",
      "owner morning review requirement",
    ],
    requiredSafetyGates: [
      "Morning status packet only",
      "Tyler remains the morning review owner",
      "Morning packet is declarative only",
      "Morning packet summarizes readiness without claiming overnight work ran",
      "Morning packet does not create scheduled tasks",
      "Morning packet does not modify scheduled tasks",
      "Morning packet does not delete scheduled tasks",
      "Morning packet does not enable scheduled tasks",
      "Morning packet does not disable scheduled tasks",
      "Morning packet does not run scheduled tasks",
      "Morning packet does not query Windows Task Scheduler",
      "Morning packet does not query PowerShell",
      "Morning packet does not execute schtasks",
      "Morning packet does not install a worker",
      "Morning packet does not start a worker",
      "Morning packet does not connect to a worker",
      "Morning packet does not poll worker health",
      "Morning packet does not inspect running processes",
      "Morning packet does not execute commands",
      "Morning packet does not execute shell commands",
      "Morning packet does not execute tasks",
      "Morning packet does not persist tasks",
      "Morning packet does not persist owner records",
      "Morning packet does not persist morning reports as product records",
      "Morning packet does not mutate files",
      "Morning packet does not mutate source",
      "Morning packet does not mutate the filesystem",
      "Morning packet does not connect to runner infrastructure",
      "Morning packet does not approve execution",
      "Morning packet does not route work",
      "Morning packet does not process work automatically",
      "Morning packet does not merge branches",
      "Morning packet cannot self-approve",
      "Overnight work executed remains false by design",
      "Live run report remains false by design",
      "Windows scheduler configured remains false by design",
      "Scheduled execution remains false by design",
      "Worker installed remains false by design",
      "Worker connected remains false by design",
      "Executable schedule count remains zero",
      "Future morning reports require owner approval",
      "Future morning reports require scheduler status evidence",
      "Future morning reports require dry-run evidence",
      "Future morning reports require worker health evidence",
      "Future morning reports require validation evidence",
      "Future morning reports require emergency stop compatibility",
      "Future morning reports require command allowlist compatibility",
      "Future morning reports require workspace boundary guard",
      "Future morning reports require rollback policy",
      "Future morning reports require source diff evidence",
      "Future morning reports require test result evidence",
      "Future morning reports require blocked-run evidence when applicable",
      "Future morning reports require no-secret leakage proof",
      "No backend morning report service",
      "No authentication changes",
      "No live overnight execution",
      "No scheduled execution",
      "No self-approval",
    ],
    requiredAppBindings: [
      "morningStatusPacket.packetSummary.owner",
      "morningStatusPacket.packetSections.length",
      "morningStatusPacket.evidenceRequirements.length",
      "morningStatusPacket.boundaries.overnightExecutionAllowed",
      "morningStatusPacket.packetSummary.reportGeneratedFromLiveRun",
    ],
    summary: {
      overnightWorkExecuted: false,
      reportGeneratedFromLiveRun: false,
      windowsSchedulerConfigured: false,
      scheduledExecutionAllowed: false,
      workerInstalled: false,
      workerConnected: false,
      executableScheduleCount: 0,
    },
    boundaries: {
      localOnly: true,
      privateAppOnly: true,
      morningStatusPacketOnly: true,
      morningReviewSurfaceOnly: true,
      declarativeOnly: true,
      readOnly: true,
      frontendOnly: true,
      noBackendLogic: true,
      noAuthentication: true,
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
    !relativePath.split(/[\\/]+/).includes("..")
  );
}

function readIfExists(rootDir, relativePath) {
  const fullPath = path.join(rootDir, relativePath);
  if (!fs.existsSync(fullPath)) return null;
  return fs.readFileSync(fullPath, "utf8");
}

function writeReports(rootDir, result) {
  const reportDir = path.join(rootDir, ".sera-morning-status-packet");
  fs.mkdirSync(reportDir, { recursive: true });
  const jsonPath = path.join(reportDir, "phase59-morning-status-packet-status.json");
  const markdownPath = path.join(reportDir, "phase59-morning-status-packet-status.md");

  fs.writeFileSync(jsonPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  fs.writeFileSync(
    markdownPath,
    [
      "# Phase 59 Morning Status Packet v1",
      "",
      `Status: ${result.morningStatusPacketStatus}`,
      `Validation failed count: ${result.validationFailedCount}`,
      `Declared file count: ${result.declaredFileCount}`,
      `Morning packet section count: ${result.morningPacketSectionCount}`,
      `Morning packet field count: ${result.morningPacketFieldCount}`,
      `Morning packet evidence count: ${result.morningPacketEvidenceCount}`,
      `Morning status signal count: ${result.morningStatusSignalCount}`,
      `Safety gate count: ${result.safetyGateCount}`,
      "",
      "## Morning state",
      "",
      `- Overnight work executed: ${result.overnightWorkExecuted}`,
      `- Report generated from live run: ${result.reportGeneratedFromLiveRun}`,
      `- Windows scheduler configured: ${result.windowsSchedulerConfigured}`,
      `- Worker connected: ${result.workerConnected}`,
      "",
      "## Boundaries",
      "",
      `- Local only: ${result.localOnly}`,
      `- Private app only: ${result.privateAppOnly}`,
      `- Morning status packet only: ${result.morningStatusPacketOnly}`,
      `- Declarative only: ${result.declarativeOnly}`,
      `- Overnight execution allowed: ${result.overnightExecutionAllowed}`,
      `- Live run report allowed: ${result.liveRunReportAllowed}`,
      `- Command execution allowed: ${result.commandExecutionAllowed}`,
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

export function inspectMorningStatusPacketV1(config = createDefaultMorningStatusPacketV1(), options = {}) {
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

  const packetContent = readIfExists(rootDir, "apps/operator-console/src/morning-status-packet.ts") || "";
  const appContent = readIfExists(rootDir, "apps/operator-console/src/App.tsx") || "";
  const packageContent = readIfExists(rootDir, "package.json") || "";

  if (!packetContent.includes("export const morningStatusPacket")) {
    blockers.push("Morning status packet file must export morningStatusPacket");
  }
  if (!packetContent.includes("Phase 59")) {
    blockers.push("Morning status packet must include Phase 59 marker");
  }
  if (!packetContent.includes("Tyler Wallace")) {
    blockers.push("Morning status packet must keep Tyler Wallace as owner");
  }

  for (const binding of config.requiredAppBindings) {
    if (!appContent.includes(binding)) {
      blockers.push(`App.tsx missing required Phase 59 binding: ${binding}`);
    }
  }

  if (!packageContent.includes("phase59:demo")) blockers.push("package.json missing phase59:demo script");
  if (!packageContent.includes("phase59:verify")) blockers.push("package.json missing phase59:verify script");

  if (config.declaredPaths.length !== 5) blockers.push("Phase 59 must declare exactly 5 owned files");
  if (config.morningPacketFields.length !== 8) blockers.push("Morning status packet must expose 8 packet fields");
  if (config.morningStatusSignals.length !== 8) blockers.push("Morning status packet must expose 8 status signals");
  if (config.requiredSectionIds.length !== 6) blockers.push("Morning status packet must expose 6 packet sections");
  if (config.evidenceRequirements.length !== 6) blockers.push("Morning status packet must require 6 evidence summaries");
  if (config.requiredSafetyGates.length !== 58) blockers.push("Morning status packet must expose 58 safety gates");
  if (config.requiredAppBindings.length !== 5) blockers.push("Morning status packet must require 5 app bindings");

  const requiredTrueBoundaries = [
    "localOnly",
    "privateAppOnly",
    "morningStatusPacketOnly",
    "morningReviewSurfaceOnly",
    "declarativeOnly",
    "readOnly",
    "frontendOnly",
    "noBackendLogic",
    "noAuthentication",
  ];

  const requiredFalseBoundaries = [
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

  const requiredFalseSummary = [
    "overnightWorkExecuted",
    "reportGeneratedFromLiveRun",
    "windowsSchedulerConfigured",
    "scheduledExecutionAllowed",
    "workerInstalled",
    "workerConnected",
  ];
  for (const key of requiredFalseSummary) {
    if (config.summary[key] !== false) blockers.push(`${key} must remain false`);
  }
  if (config.summary.executableScheduleCount !== 0) blockers.push("executableScheduleCount must remain zero");

  const ok = blockers.length === 0;
  const result = {
    ok,
    status: ok ? "passed" : "blocked",
    morningStatusPacketStatus: ok ? "ready" : "blocked",
    validationFailedCount: blockers.length,
    blockers,
    declaredFileCount: config.declaredPaths.length,
    morningPacketSectionCount: config.requiredSectionIds.length,
    morningPacketFieldCount: config.morningPacketFields.length,
    morningPacketEvidenceCount: config.evidenceRequirements.length,
    morningStatusSignalCount: config.morningStatusSignals.length,
    safetyGateCount: config.requiredSafetyGates.length,
    appBindingCount: config.requiredAppBindings.length,
    ...config.summary,
    ...config.boundaries,
  };

  if (writeArtifacts) writeReports(rootDir, result);
  return result;
}

export function runMorningStatusPacketV1(options = {}) {
  const result = inspectMorningStatusPacketV1(createDefaultMorningStatusPacketV1(), options);
  if (!result.ok) {
    const error = new Error(`Phase 59 morning status packet failed: ${result.blockers.join("; ")}`);
    error.result = result;
    throw error;
  }
  return result;
}
