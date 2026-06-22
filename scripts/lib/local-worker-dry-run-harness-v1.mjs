import fs from "node:fs";
import path from "node:path";

export function createDefaultLocalWorkerDryRunHarnessV1() {
  return {
    phase: 57,
    name: "local-worker-dry-run-harness-v1",
    declaredPaths: [
      "docs/phases/PHASE_57_LOCAL_WORKER_DRY_RUN_HARNESS_V1.md",
      "apps/operator-console/src/local-worker-dry-run-harness.ts",
      "scripts/lib/local-worker-dry-run-harness-v1.mjs",
      "scripts/run-local-worker-dry-run-harness-v1.mjs",
      "tests/integration/local-worker-dry-run-harness-v1.test.ts",
    ],
    dryRunFields: [
      "owner",
      "sourcePhase",
      "safeState",
      "workerInstalled",
      "workerConnected",
      "dryRunOnly",
      "simulatedTaskCount",
      "executableTaskCount",
    ],
    workerDryRunSignals: [
      "dry-run input review",
      "worker boundary simulation",
      "preflight simulation",
      "task handshake simulation",
      "evidence bundle preview",
      "command allowlist check preview",
      "emergency stop check preview",
      "owner gate check preview",
    ],
    requiredDryRunStepIds: [
      "accept-plan-preview",
      "validate-worker-boundaries",
      "simulate-worker-preflight",
      "simulate-task-handshake",
      "generate-dry-run-evidence",
    ],
    evidenceRequirements: [
      "dry-run input summary",
      "boundary check summary",
      "simulated preflight result",
      "simulated task handshake result",
      "blocked authority summary",
      "owner review reminder",
    ],
    requiredSafetyGates: [
      "Local worker dry-run harness only",
      "Tyler remains the dry-run owner",
      "Dry run is simulated only",
      "Dry run produces evidence only",
      "Dry run does not install a worker",
      "Dry run does not connect to a worker",
      "Dry run does not start a worker",
      "Dry run does not poll worker health",
      "Dry run does not inspect running processes",
      "Dry run does not execute commands",
      "Dry run does not execute shell commands",
      "Dry run does not execute tasks",
      "Dry run does not create completed task state",
      "Dry run does not persist task records",
      "Dry run does not persist owner records",
      "Dry run does not mutate files",
      "Dry run does not mutate source",
      "Dry run does not connect to runner infrastructure",
      "Dry run does not approve execution",
      "Dry run does not route work",
      "Dry run does not process work automatically",
      "Dry run does not merge branches",
      "Dry run cannot self-approve",
      "Worker installed remains false by design",
      "Worker connected remains false by design",
      "Executable task count remains zero",
      "Future execution requires owner approval",
      "Future execution requires command allowlist",
      "Future execution requires workspace boundary guard",
      "Future execution requires emergency stop compatibility",
      "Future execution requires evidence capture",
      "Future execution requires rollback policy",
      "Future execution requires validation gate",
      "Future execution requires branch readiness inspection",
      "No backend worker service",
      "No authentication changes",
      "No worker spawn",
      "No task execution",
      "No command execution",
      "No runner connectivity",
      "No filesystem mutation",
      "No self-approval",
    ],
    requiredAppBindings: [
      "localWorkerDryRunHarnessPacket.dryRunSummary.owner",
      "localWorkerDryRunHarnessPacket.dryRunSteps.length",
      "localWorkerDryRunHarnessPacket.evidenceRequirements.length",
      "localWorkerDryRunHarnessPacket.boundaries.taskExecutionAllowed",
      "localWorkerDryRunHarnessPacket.boundaries.commandExecutionAllowed",
    ],
    boundaries: {
      localOnly: true,
      privateAppOnly: true,
      dryRunHarnessOnly: true,
      simulatedOnly: true,
      evidenceOnly: true,
      workerContractOnly: true,
      readOnly: true,
      frontendOnly: true,
      noBackendLogic: true,
      noAuthentication: true,
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
    !relativePath.split(/[\\/]+/).includes("..")
  );
}

function readIfExists(rootDir, relativePath) {
  const fullPath = path.join(rootDir, relativePath);
  if (!fs.existsSync(fullPath)) return null;
  return fs.readFileSync(fullPath, "utf8");
}

function writeReports(rootDir, result) {
  const reportDir = path.join(rootDir, ".sera-local-worker-dry-run-harness");
  fs.mkdirSync(reportDir, { recursive: true });
  const jsonPath = path.join(reportDir, "phase57-local-worker-dry-run-harness-status.json");
  const markdownPath = path.join(reportDir, "phase57-local-worker-dry-run-harness-status.md");

  fs.writeFileSync(jsonPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  fs.writeFileSync(
    markdownPath,
    [
      "# Phase 57 Local Worker Dry-Run Harness v1",
      "",
      `Status: ${result.localWorkerDryRunHarnessStatus}`,
      `Validation failed count: ${result.validationFailedCount}`,
      `Declared file count: ${result.declaredFileCount}`,
      `Dry-run step count: ${result.dryRunStepCount}`,
      `Dry-run field count: ${result.dryRunFieldCount}`,
      `Dry-run evidence count: ${result.dryRunEvidenceCount}`,
      `Worker dry-run signal count: ${result.workerDryRunSignalCount}`,
      `Safety gate count: ${result.safetyGateCount}`,
      "",
      "## Dry-run state",
      "",
      `- Worker installed: ${result.workerInstalled}`,
      `- Worker connected: ${result.workerConnected}`,
      `- Dry run only: ${result.dryRunOnly}`,
      `- Simulated only: ${result.simulatedOnly}`,
      "",
      "## Boundaries",
      "",
      `- Local only: ${result.localOnly}`,
      `- Private app only: ${result.privateAppOnly}`,
      `- Dry-run harness only: ${result.dryRunHarnessOnly}`,
      `- Evidence only: ${result.evidenceOnly}`,
      `- Command execution allowed: ${result.commandExecutionAllowed}`,
      `- Shell execution allowed: ${result.shellExecutionAllowed}`,
      `- Runner connectivity allowed: ${result.runnerConnectivityAllowed}`,
      `- Worker spawn allowed: ${result.workerSpawnAllowed}`,
      `- Task execution allowed: ${result.taskExecutionAllowed}`,
      `- Filesystem mutation allowed: ${result.filesystemMutationAllowed}`,
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

export function inspectLocalWorkerDryRunHarnessV1(config = createDefaultLocalWorkerDryRunHarnessV1(), options = {}) {
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

  const dryRunContent = readIfExists(rootDir, "apps/operator-console/src/local-worker-dry-run-harness.ts") || "";
  const appContent = readIfExists(rootDir, "apps/operator-console/src/App.tsx") || "";
  const packageContent = readIfExists(rootDir, "package.json") || "";

  if (!dryRunContent.includes("export const localWorkerDryRunHarnessPacket")) {
    blockers.push("local worker dry-run harness file must export localWorkerDryRunHarnessPacket");
  }

  if (!dryRunContent.includes("Phase 57 · Local Worker Dry-Run Harness v1")) {
    blockers.push("local worker dry-run harness packet must identify Phase 57");
  }

  if (!dryRunContent.includes("Tyler Wallace")) {
    blockers.push("local worker dry-run harness packet must identify Tyler Wallace as owner");
  }

  if (!dryRunContent.includes("simulated-only")) {
    blockers.push("local worker dry-run harness must keep run simulated-only");
  }

  if (!dryRunContent.includes("executableTaskCount: 0")) {
    blockers.push("local worker dry-run harness must keep executableTaskCount at 0");
  }

  for (const field of config.dryRunFields) {
    if (!dryRunContent.includes(field)) {
      blockers.push(`local worker dry-run harness missing field: ${field}`);
    }
  }

  for (const signal of config.workerDryRunSignals) {
    if (!dryRunContent.includes(signal)) {
      blockers.push(`local worker dry-run harness missing worker dry-run signal: ${signal}`);
    }
  }

  for (const stepId of config.requiredDryRunStepIds) {
    if (!dryRunContent.includes(stepId)) {
      blockers.push(`local worker dry-run harness missing dry-run step id: ${stepId}`);
    }
  }

  for (const evidence of config.evidenceRequirements) {
    if (!dryRunContent.includes(evidence)) {
      blockers.push(`local worker dry-run harness missing evidence requirement: ${evidence}`);
    }
  }

  for (const gate of config.requiredSafetyGates) {
    if (!dryRunContent.includes(gate)) {
      blockers.push(`local worker dry-run harness missing safety gate: ${gate}`);
    }
  }

  for (const binding of config.requiredAppBindings) {
    if (!appContent.includes(binding)) {
      blockers.push(`operator app missing local worker dry-run harness binding: ${binding}`);
    }
  }

  if (!appContent.includes("Local Worker Dry-Run Harness")) {
    blockers.push("operator app missing Local Worker Dry-Run Harness card");
  }

  if (!packageContent.includes('"phase57:demo"')) {
    blockers.push("package.json missing phase57:demo script");
  }

  if (!packageContent.includes('"phase57:verify"')) {
    blockers.push("package.json missing phase57:verify script");
  }

  const boundaries = config.boundaries;
  if (!boundaries.localOnly) blockers.push("localOnly must remain true");
  if (!boundaries.privateAppOnly) blockers.push("privateAppOnly must remain true");
  if (!boundaries.dryRunHarnessOnly) blockers.push("dryRunHarnessOnly must remain true");
  if (!boundaries.simulatedOnly) blockers.push("simulatedOnly must remain true");
  if (!boundaries.evidenceOnly) blockers.push("evidenceOnly must remain true");
  if (!boundaries.workerContractOnly) blockers.push("workerContractOnly must remain true");
  if (!boundaries.readOnly) blockers.push("readOnly must remain true");
  if (!boundaries.frontendOnly) blockers.push("frontendOnly must remain true");
  if (!boundaries.noBackendLogic) blockers.push("noBackendLogic must remain true");
  if (!boundaries.noAuthentication) blockers.push("noAuthentication must remain true");
  if (boundaries.commandExecutionAllowed) blockers.push("commandExecutionAllowed must remain false");
  if (boundaries.shellExecutionAllowed) blockers.push("shellExecutionAllowed must remain false");
  if (boundaries.runnerConnectivityAllowed) blockers.push("runnerConnectivityAllowed must remain false");
  if (boundaries.workerSpawnAllowed) blockers.push("workerSpawnAllowed must remain false");
  if (boundaries.taskExecutionAllowed) blockers.push("taskExecutionAllowed must remain false");
  if (boundaries.healthPollingAllowed) blockers.push("healthPollingAllowed must remain false");
  if (boundaries.liveHeartbeatAllowed) blockers.push("liveHeartbeatAllowed must remain false");
  if (boundaries.processInspectionAllowed) blockers.push("processInspectionAllowed must remain false");
  if (boundaries.mutatesSource) blockers.push("mutatesSource must remain false");
  if (boundaries.fileMutationAllowed) blockers.push("fileMutationAllowed must remain false");
  if (boundaries.filesystemMutationAllowed) blockers.push("filesystemMutationAllowed must remain false");
  if (boundaries.recordPersistenceAllowed) blockers.push("recordPersistenceAllowed must remain false");
  if (boundaries.taskPersistenceAllowed) blockers.push("taskPersistenceAllowed must remain false");
  if (boundaries.finalApprovalAllowed) blockers.push("finalApprovalAllowed must remain false");
  if (boundaries.autoApprovalAllowed) blockers.push("autoApprovalAllowed must remain false");
  if (boundaries.autoProcessingAllowed) blockers.push("autoProcessingAllowed must remain false");
  if (boundaries.autoRouteAllowed) blockers.push("autoRouteAllowed must remain false");
  if (boundaries.autoMergeAllowed) blockers.push("autoMergeAllowed must remain false");
  if (boundaries.selfApprovalAllowed) blockers.push("selfApprovalAllowed must remain false");

  const result = {
    ok: blockers.length === 0,
    status: blockers.length === 0 ? "passed" : "failed",
    localWorkerDryRunHarnessStatus: blockers.length === 0 ? "ready" : "blocked",
    validationFailedCount: blockers.length,
    blockers,
    declaredFileCount: config.declaredPaths.length,
    dryRunStepCount: config.requiredDryRunStepIds.length,
    dryRunFieldCount: config.dryRunFields.length,
    dryRunEvidenceCount: config.evidenceRequirements.length,
    workerDryRunSignalCount: config.workerDryRunSignals.length,
    safetyGateCount: config.requiredSafetyGates.length,
    appBindingCount: config.requiredAppBindings.length,
    workerInstalled: false,
    workerConnected: false,
    dryRunOnly: true,
    localOnly: boundaries.localOnly,
    privateAppOnly: boundaries.privateAppOnly,
    dryRunHarnessOnly: boundaries.dryRunHarnessOnly,
    simulatedOnly: boundaries.simulatedOnly,
    evidenceOnly: boundaries.evidenceOnly,
    workerContractOnly: boundaries.workerContractOnly,
    readOnly: boundaries.readOnly,
    frontendOnly: boundaries.frontendOnly,
    noBackendLogic: boundaries.noBackendLogic,
    noAuthentication: boundaries.noAuthentication,
    commandExecutionAllowed: boundaries.commandExecutionAllowed,
    shellExecutionAllowed: boundaries.shellExecutionAllowed,
    runnerConnectivityAllowed: boundaries.runnerConnectivityAllowed,
    workerSpawnAllowed: boundaries.workerSpawnAllowed,
    taskExecutionAllowed: boundaries.taskExecutionAllowed,
    healthPollingAllowed: boundaries.healthPollingAllowed,
    liveHeartbeatAllowed: boundaries.liveHeartbeatAllowed,
    processInspectionAllowed: boundaries.processInspectionAllowed,
    mutatesSource: boundaries.mutatesSource,
    fileMutationAllowed: boundaries.fileMutationAllowed,
    filesystemMutationAllowed: boundaries.filesystemMutationAllowed,
    recordPersistenceAllowed: boundaries.recordPersistenceAllowed,
    taskPersistenceAllowed: boundaries.taskPersistenceAllowed,
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
