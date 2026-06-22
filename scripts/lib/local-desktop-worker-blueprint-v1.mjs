import fs from "node:fs";
import path from "node:path";

export function createDefaultLocalDesktopWorkerBlueprintV1() {
  return {
    phase: 55,
    name: "local-desktop-worker-blueprint-v1",
    declaredPaths: [
      "docs/phases/PHASE_55_LOCAL_DESKTOP_WORKER_BLUEPRINT_V1.md",
      "apps/operator-console/src/local-desktop-worker-blueprint.ts",
      "scripts/lib/local-desktop-worker-blueprint-v1.mjs",
      "scripts/run-local-desktop-worker-blueprint-v1.mjs",
      "tests/integration/local-desktop-worker-blueprint-v1.test.ts",
    ],
    workerContractFields: [
      "workerId",
      "owner",
      "runtimeMode",
      "startupMethod",
      "allowedInputs",
      "forbiddenAuthorities",
      "healthSignals",
      "evidenceRequirements",
    ],
    workerCapabilitySignals: [
      "worker process boundary",
      "command allowlist boundary",
      "workspace root boundary",
      "task intake boundary",
      "validation command boundary",
      "evidence output boundary",
      "owner decision dependency",
      "emergency stop dependency",
    ],
    requiredWorkerRoleIds: [
      "worker-contract-host",
      "workspace-boundary-guardian",
      "validation-runner-blueprint",
      "evidence-collector-blueprint",
      "health-reporter-blueprint",
    ],
    requiredSafetyGates: [
      "Local desktop worker blueprint only",
      "Tyler remains the worker contract owner",
      "Blueprint does not install a worker",
      "Blueprint does not start a worker",
      "Blueprint cannot execute commands",
      "Blueprint cannot connect to a runner",
      "Future worker requires owner decision record",
      "Future worker requires command allowlist",
      "Future worker requires workspace boundary guard",
      "Future worker requires evidence capture",
      "Future worker requires validation before completion",
      "Future worker requires emergency stop compatibility",
      "Health status is declarative only",
      "No backend worker service",
      "No authentication changes",
      "No worker spawn",
      "No task execution",
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
      "localDesktopWorkerBlueprintPacket.workerSummary.owner",
      "localDesktopWorkerBlueprintPacket.workerRoles.length",
      "localDesktopWorkerBlueprintPacket.routing.suggestedQueue",
      "localDesktopWorkerBlueprintPacket.boundaries.commandExecutionAllowed",
      "localDesktopWorkerBlueprintPacket.boundaries.workerSpawnAllowed",
    ],
    boundaries: {
      localOnly: true,
      privateAppOnly: true,
      blueprintOnly: true,
      workerContractOnly: true,
      designOnly: true,
      readOnly: true,
      frontendOnly: true,
      noBackendLogic: true,
      noAuthentication: true,
      commandExecutionAllowed: false,
      runnerConnectivityAllowed: false,
      workerSpawnAllowed: false,
      taskExecutionAllowed: false,
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
  const reportDir = path.join(rootDir, ".sera-local-desktop-worker-blueprint");
  fs.mkdirSync(reportDir, { recursive: true });
  const jsonPath = path.join(reportDir, "phase55-local-desktop-worker-blueprint-status.json");
  const markdownPath = path.join(reportDir, "phase55-local-desktop-worker-blueprint-status.md");

  fs.writeFileSync(jsonPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  fs.writeFileSync(
    markdownPath,
    [
      "# Phase 55 Local Desktop Worker Blueprint v1",
      "",
      `Status: ${result.localDesktopWorkerBlueprintStatus}`,
      `Validation failed count: ${result.validationFailedCount}`,
      `Declared file count: ${result.declaredFileCount}`,
      `Worker role count: ${result.workerRoleCount}`,
      `Worker contract field count: ${result.workerContractFieldCount}`,
      `Worker capability signal count: ${result.workerCapabilitySignalCount}`,
      `Safety gate count: ${result.safetyGateCount}`,
      "",
      "## Boundaries",
      "",
      `- Local only: ${result.localOnly}`,
      `- Private app only: ${result.privateAppOnly}`,
      `- Blueprint only: ${result.blueprintOnly}`,
      `- Worker contract only: ${result.workerContractOnly}`,
      `- Command execution allowed: ${result.commandExecutionAllowed}`,
      `- Runner connectivity allowed: ${result.runnerConnectivityAllowed}`,
      `- Worker spawn allowed: ${result.workerSpawnAllowed}`,
      `- Task execution allowed: ${result.taskExecutionAllowed}`,
      `- Record persistence allowed: ${result.recordPersistenceAllowed}`,
      `- Final approval allowed: ${result.finalApprovalAllowed}`,
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

export function inspectLocalDesktopWorkerBlueprintV1(config = createDefaultLocalDesktopWorkerBlueprintV1(), options = {}) {
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

  const blueprintContent = readIfExists(rootDir, "apps/operator-console/src/local-desktop-worker-blueprint.ts") || "";
  const appContent = readIfExists(rootDir, "apps/operator-console/src/App.tsx") || "";
  const packageContent = readIfExists(rootDir, "package.json") || "";

  if (!blueprintContent.includes("export const localDesktopWorkerBlueprintPacket")) {
    blockers.push("local desktop worker blueprint file must export localDesktopWorkerBlueprintPacket");
  }

  if (!blueprintContent.includes("Phase 55 · Local Desktop Worker Blueprint v1")) {
    blockers.push("local desktop worker blueprint packet must identify Phase 55");
  }

  if (!blueprintContent.includes("Tyler Wallace")) {
    blockers.push("local desktop worker blueprint packet must identify Tyler Wallace as owner");
  }

  for (const field of config.workerContractFields) {
    if (!blueprintContent.includes(field)) {
      blockers.push(`local desktop worker blueprint missing contract field: ${field}`);
    }
  }

  for (const signal of config.workerCapabilitySignals) {
    if (!blueprintContent.includes(signal)) {
      blockers.push(`local desktop worker blueprint missing capability signal: ${signal}`);
    }
  }

  for (const roleId of config.requiredWorkerRoleIds) {
    if (!blueprintContent.includes(roleId)) {
      blockers.push(`local desktop worker blueprint missing worker role: ${roleId}`);
    }
  }

  for (const gate of config.requiredSafetyGates) {
    if (!blueprintContent.includes(gate)) {
      blockers.push(`local desktop worker blueprint missing safety gate: ${gate}`);
    }
  }

  for (const binding of config.requiredAppBindings) {
    if (!appContent.includes(binding)) {
      blockers.push(`operator app missing local desktop worker blueprint binding: ${binding}`);
    }
  }

  if (!appContent.includes("Local Desktop Worker Blueprint")) {
    blockers.push("operator app missing Local Desktop Worker Blueprint card");
  }

  if (!packageContent.includes('"phase55:demo"')) {
    blockers.push("package.json missing phase55:demo script");
  }

  if (!packageContent.includes('"phase55:verify"')) {
    blockers.push("package.json missing phase55:verify script");
  }

  const boundaries = config.boundaries;
  if (!boundaries.localOnly) blockers.push("localOnly must remain true");
  if (!boundaries.privateAppOnly) blockers.push("privateAppOnly must remain true");
  if (!boundaries.blueprintOnly) blockers.push("blueprintOnly must remain true");
  if (!boundaries.workerContractOnly) blockers.push("workerContractOnly must remain true");
  if (!boundaries.designOnly) blockers.push("designOnly must remain true");
  if (!boundaries.readOnly) blockers.push("readOnly must remain true");
  if (!boundaries.frontendOnly) blockers.push("frontendOnly must remain true");
  if (!boundaries.noBackendLogic) blockers.push("noBackendLogic must remain true");
  if (!boundaries.noAuthentication) blockers.push("noAuthentication must remain true");
  if (boundaries.commandExecutionAllowed) blockers.push("commandExecutionAllowed must remain false");
  if (boundaries.runnerConnectivityAllowed) blockers.push("runnerConnectivityAllowed must remain false");
  if (boundaries.workerSpawnAllowed) blockers.push("workerSpawnAllowed must remain false");
  if (boundaries.taskExecutionAllowed) blockers.push("taskExecutionAllowed must remain false");
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
    localDesktopWorkerBlueprintStatus: blockers.length === 0 ? "ready" : "blocked",
    validationFailedCount: blockers.length,
    blockers,
    declaredFileCount: config.declaredPaths.length,
    workerRoleCount: config.requiredWorkerRoleIds.length,
    workerContractFieldCount: config.workerContractFields.length,
    workerCapabilitySignalCount: config.workerCapabilitySignals.length,
    safetyGateCount: config.requiredSafetyGates.length,
    appBindingCount: config.requiredAppBindings.length,
    localOnly: boundaries.localOnly,
    privateAppOnly: boundaries.privateAppOnly,
    blueprintOnly: boundaries.blueprintOnly,
    workerContractOnly: boundaries.workerContractOnly,
    designOnly: boundaries.designOnly,
    readOnly: boundaries.readOnly,
    frontendOnly: boundaries.frontendOnly,
    noBackendLogic: boundaries.noBackendLogic,
    noAuthentication: boundaries.noAuthentication,
    commandExecutionAllowed: boundaries.commandExecutionAllowed,
    runnerConnectivityAllowed: boundaries.runnerConnectivityAllowed,
    workerSpawnAllowed: boundaries.workerSpawnAllowed,
    taskExecutionAllowed: boundaries.taskExecutionAllowed,
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
