import fs from "node:fs";
import path from "node:path";

export function createDefaultLocalWorkerHealthPanelV1() {
  return {
    phase: 56,
    name: "local-worker-health-panel-v1",
    declaredPaths: [
      "docs/phases/PHASE_56_LOCAL_WORKER_HEALTH_PANEL_V1.md",
      "apps/operator-console/src/local-worker-health-panel.ts",
      "scripts/lib/local-worker-health-panel-v1.mjs",
      "scripts/run-local-worker-health-panel-v1.mjs",
      "tests/integration/local-worker-health-panel-v1.test.ts",
    ],
    healthPanelFields: [
      "owner",
      "sourcePhase",
      "safeState",
      "workerInstalled",
      "workerConnected",
      "heartbeatStatus",
      "healthPollingAllowed",
      "executableTaskCount",
    ],
    workerHealthSignals: [
      "worker installation status",
      "worker connection status",
      "heartbeat status",
      "workspace readiness status",
      "command allowlist readiness",
      "emergency stop readiness",
      "evidence capture readiness",
      "owner gate readiness",
    ],
    requiredHealthSignalIds: [
      "worker-installation-status",
      "worker-connection-status",
      "worker-heartbeat-status",
      "workspace-readiness-status",
      "command-allowlist-status",
      "emergency-stop-status",
    ],
    requiredSafetyGates: [
      "Local worker health panel only",
      "Tyler remains the worker health owner",
      "Health panel is declarative only",
      "Health panel does not poll a process",
      "Health panel does not inspect running processes",
      "Health panel does not start a worker",
      "Health panel cannot execute commands",
      "Health panel cannot connect to a runner",
      "Health panel cannot create tasks",
      "Health panel cannot approve execution",
      "Worker installed remains false by design",
      "Worker connected remains false by design",
      "Live heartbeat remains blocked",
      "Future health polling requires owner approval",
      "Future worker connection requires command allowlist",
      "Future worker connection requires workspace boundary guard",
      "Future worker connection requires emergency stop compatibility",
      "Future worker connection requires evidence capture",
      "No backend worker service",
      "No authentication changes",
      "No worker spawn",
      "No task execution",
      "No health polling",
      "No live heartbeat",
      "No process inspection",
      "No command execution",
      "No runner connectivity",
      "No source mutation",
      "No file mutation",
      "No record persistence",
      "No final approval",
      "No auto-routing",
      "No auto-merge",
      "No self-approval",
    ],
    requiredAppBindings: [
      "localWorkerHealthPanelPacket.healthSummary.owner",
      "localWorkerHealthPanelPacket.healthSignals.length",
      "localWorkerHealthPanelPacket.routing.suggestedQueue",
      "localWorkerHealthPanelPacket.boundaries.healthPollingAllowed",
      "localWorkerHealthPanelPacket.boundaries.workerSpawnAllowed",
    ],
    boundaries: {
      localOnly: true,
      privateAppOnly: true,
      healthPanelOnly: true,
      healthSurfaceOnly: true,
      declarativeOnly: true,
      readOnly: true,
      frontendOnly: true,
      noBackendLogic: true,
      noAuthentication: true,
      commandExecutionAllowed: false,
      runnerConnectivityAllowed: false,
      workerSpawnAllowed: false,
      taskExecutionAllowed: false,
      healthPollingAllowed: false,
      liveHeartbeatAllowed: false,
      processInspectionAllowed: false,
      mutatesSource: false,
      fileMutationAllowed: false,
      recordPersistenceAllowed: false,
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
  const reportDir = path.join(rootDir, ".sera-local-worker-health-panel");
  fs.mkdirSync(reportDir, { recursive: true });
  const jsonPath = path.join(reportDir, "phase56-local-worker-health-panel-status.json");
  const markdownPath = path.join(reportDir, "phase56-local-worker-health-panel-status.md");

  fs.writeFileSync(jsonPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  fs.writeFileSync(
    markdownPath,
    [
      "# Phase 56 Local Worker Health Panel v1",
      "",
      `Status: ${result.localWorkerHealthPanelStatus}`,
      `Validation failed count: ${result.validationFailedCount}`,
      `Declared file count: ${result.declaredFileCount}`,
      `Health indicator count: ${result.healthIndicatorCount}`,
      `Health panel field count: ${result.healthPanelFieldCount}`,
      `Worker health signal count: ${result.workerHealthSignalCount}`,
      `Safety gate count: ${result.safetyGateCount}`,
      "",
      "## Health state",
      "",
      `- Worker installed: ${result.workerInstalled}`,
      `- Worker connected: ${result.workerConnected}`,
      `- Health polling allowed: ${result.healthPollingAllowed}`,
      `- Live heartbeat allowed: ${result.liveHeartbeatAllowed}`,
      `- Process inspection allowed: ${result.processInspectionAllowed}`,
      "",
      "## Boundaries",
      "",
      `- Local only: ${result.localOnly}`,
      `- Private app only: ${result.privateAppOnly}`,
      `- Health panel only: ${result.healthPanelOnly}`,
      `- Declarative only: ${result.declarativeOnly}`,
      `- Command execution allowed: ${result.commandExecutionAllowed}`,
      `- Runner connectivity allowed: ${result.runnerConnectivityAllowed}`,
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

export function inspectLocalWorkerHealthPanelV1(config = createDefaultLocalWorkerHealthPanelV1(), options = {}) {
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

  const healthPanelContent = readIfExists(rootDir, "apps/operator-console/src/local-worker-health-panel.ts") || "";
  const appContent = readIfExists(rootDir, "apps/operator-console/src/App.tsx") || "";
  const packageContent = readIfExists(rootDir, "package.json") || "";

  if (!healthPanelContent.includes("export const localWorkerHealthPanelPacket")) {
    blockers.push("local worker health panel file must export localWorkerHealthPanelPacket");
  }

  if (!healthPanelContent.includes("Phase 56 · Local Worker Health Panel v1")) {
    blockers.push("local worker health panel packet must identify Phase 56");
  }

  if (!healthPanelContent.includes("Tyler Wallace")) {
    blockers.push("local worker health panel packet must identify Tyler Wallace as owner");
  }

  if (!healthPanelContent.includes("offline-by-design")) {
    blockers.push("local worker health panel must keep worker offline by design");
  }

  for (const field of config.healthPanelFields) {
    if (!healthPanelContent.includes(field)) {
      blockers.push(`local worker health panel missing field: ${field}`);
    }
  }

  for (const signal of config.workerHealthSignals) {
    if (!healthPanelContent.includes(signal)) {
      blockers.push(`local worker health panel missing worker health signal: ${signal}`);
    }
  }

  for (const signalId of config.requiredHealthSignalIds) {
    if (!healthPanelContent.includes(signalId)) {
      blockers.push(`local worker health panel missing health signal id: ${signalId}`);
    }
  }

  for (const gate of config.requiredSafetyGates) {
    if (!healthPanelContent.includes(gate)) {
      blockers.push(`local worker health panel missing safety gate: ${gate}`);
    }
  }

  for (const binding of config.requiredAppBindings) {
    if (!appContent.includes(binding)) {
      blockers.push(`operator app missing local worker health panel binding: ${binding}`);
    }
  }

  if (!appContent.includes("Local Worker Health Panel")) {
    blockers.push("operator app missing Local Worker Health Panel card");
  }

  if (!packageContent.includes('"phase56:demo"')) {
    blockers.push("package.json missing phase56:demo script");
  }

  if (!packageContent.includes('"phase56:verify"')) {
    blockers.push("package.json missing phase56:verify script");
  }

  const boundaries = config.boundaries;
  if (!boundaries.localOnly) blockers.push("localOnly must remain true");
  if (!boundaries.privateAppOnly) blockers.push("privateAppOnly must remain true");
  if (!boundaries.healthPanelOnly) blockers.push("healthPanelOnly must remain true");
  if (!boundaries.healthSurfaceOnly) blockers.push("healthSurfaceOnly must remain true");
  if (!boundaries.declarativeOnly) blockers.push("declarativeOnly must remain true");
  if (!boundaries.readOnly) blockers.push("readOnly must remain true");
  if (!boundaries.frontendOnly) blockers.push("frontendOnly must remain true");
  if (!boundaries.noBackendLogic) blockers.push("noBackendLogic must remain true");
  if (!boundaries.noAuthentication) blockers.push("noAuthentication must remain true");
  if (boundaries.commandExecutionAllowed) blockers.push("commandExecutionAllowed must remain false");
  if (boundaries.runnerConnectivityAllowed) blockers.push("runnerConnectivityAllowed must remain false");
  if (boundaries.workerSpawnAllowed) blockers.push("workerSpawnAllowed must remain false");
  if (boundaries.taskExecutionAllowed) blockers.push("taskExecutionAllowed must remain false");
  if (boundaries.healthPollingAllowed) blockers.push("healthPollingAllowed must remain false");
  if (boundaries.liveHeartbeatAllowed) blockers.push("liveHeartbeatAllowed must remain false");
  if (boundaries.processInspectionAllowed) blockers.push("processInspectionAllowed must remain false");
  if (boundaries.mutatesSource) blockers.push("mutatesSource must remain false");
  if (boundaries.fileMutationAllowed) blockers.push("fileMutationAllowed must remain false");
  if (boundaries.recordPersistenceAllowed) blockers.push("recordPersistenceAllowed must remain false");
  if (boundaries.finalApprovalAllowed) blockers.push("finalApprovalAllowed must remain false");
  if (boundaries.autoApprovalAllowed) blockers.push("autoApprovalAllowed must remain false");
  if (boundaries.autoProcessingAllowed) blockers.push("autoProcessingAllowed must remain false");
  if (boundaries.autoRouteAllowed) blockers.push("autoRouteAllowed must remain false");
  if (boundaries.autoMergeAllowed) blockers.push("autoMergeAllowed must remain false");
  if (boundaries.selfApprovalAllowed) blockers.push("selfApprovalAllowed must remain false");

  const result = {
    ok: blockers.length === 0,
    status: blockers.length === 0 ? "passed" : "failed",
    localWorkerHealthPanelStatus: blockers.length === 0 ? "ready" : "blocked",
    validationFailedCount: blockers.length,
    blockers,
    declaredFileCount: config.declaredPaths.length,
    healthIndicatorCount: config.requiredHealthSignalIds.length,
    healthPanelFieldCount: config.healthPanelFields.length,
    workerHealthSignalCount: config.workerHealthSignals.length,
    safetyGateCount: config.requiredSafetyGates.length,
    appBindingCount: config.requiredAppBindings.length,
    workerInstalled: false,
    workerConnected: false,
    localOnly: boundaries.localOnly,
    privateAppOnly: boundaries.privateAppOnly,
    healthPanelOnly: boundaries.healthPanelOnly,
    healthSurfaceOnly: boundaries.healthSurfaceOnly,
    declarativeOnly: boundaries.declarativeOnly,
    readOnly: boundaries.readOnly,
    frontendOnly: boundaries.frontendOnly,
    noBackendLogic: boundaries.noBackendLogic,
    noAuthentication: boundaries.noAuthentication,
    commandExecutionAllowed: boundaries.commandExecutionAllowed,
    runnerConnectivityAllowed: boundaries.runnerConnectivityAllowed,
    workerSpawnAllowed: boundaries.workerSpawnAllowed,
    taskExecutionAllowed: boundaries.taskExecutionAllowed,
    healthPollingAllowed: boundaries.healthPollingAllowed,
    liveHeartbeatAllowed: boundaries.liveHeartbeatAllowed,
    processInspectionAllowed: boundaries.processInspectionAllowed,
    mutatesSource: boundaries.mutatesSource,
    fileMutationAllowed: boundaries.fileMutationAllowed,
    recordPersistenceAllowed: boundaries.recordPersistenceAllowed,
    finalApprovalAllowed: boundaries.finalApprovalAllowed,
    autoApprovalAllowed: boundaries.autoApprovalAllowed,
    autoProcessingAllowed: boundaries.autoProcessingAllowed,
    autoRouteAllowed: boundaries.autoRouteAllowed,
    autoMergeAllowed: boundaries.autoMergeAllowed,
    selfApprovalAllowed: boundaries.selfApprovalAllowed,
  };

  if (writeArtifacts) writeReports(rootDir, result);
  return result;
}
