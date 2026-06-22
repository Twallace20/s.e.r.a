import fs from "node:fs";
import path from "node:path";

export function createDefaultOperatorAppRuntimeReaderV1() {
  return {
    phase: 47,
    name: "operator-app-runtime-reader-v1",
    declaredPaths: [
      "docs/phases/PHASE_47_OPERATOR_APP_RUNTIME_READER_V1.md",
      "apps/operator-console/src/runtime-status.ts",
      "apps/operator-console/src/App.tsx",
      "scripts/run-operator-app-runtime-reader-v1.mjs",
      "tests/integration/operator-app-runtime-reader-v1.test.ts",
    ],
    runtimeSignals: [
      "phase label",
      "certification level",
      "free-core status",
      "source-map status",
      "next recommended action",
    ],
    requiredSafetyGates: [
      "Read-only runtime status packet",
      "Frontend-consumable status only",
      "No backend logic",
      "No authentication yet",
      "No command execution",
      "No runner connectivity",
      "No source mutation",
      "No auto-merge",
      "Manual approval required",
    ],
    requiredAppBindings: [
      "operatorRuntimeStatus.phase.label",
      "operatorRuntimeStatus.status.desktopWorker",
      "operatorRuntimeStatus.status.localRuntime",
      "operatorRuntimeStatus.nextRecommendedAction",
    ],
    boundaries: {
      localOnly: true,
      privateAppOnly: true,
      readOnly: true,
      frontendConsumableStatus: true,
      noBackendLogic: true,
      noAuthentication: true,
      commandExecutionAllowed: false,
      remoteExecutionAllowed: false,
      runnerConnectivityAllowed: false,
      mutatesSource: false,
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

function writeReports(rootDir, result) {
  const reportDir = path.join(rootDir, ".sera-operator-runtime-reader");
  fs.mkdirSync(reportDir, { recursive: true });
  const jsonPath = path.join(reportDir, "phase47-runtime-reader-status.json");
  const markdownPath = path.join(reportDir, "phase47-runtime-reader-status.md");

  fs.writeFileSync(jsonPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  fs.writeFileSync(
    markdownPath,
    [
      "# Phase 47 Operator App Runtime Reader v1",
      "",
      `Status: ${result.operatorAppRuntimeReaderStatus}`,
      `Validation failed count: ${result.validationFailedCount}`,
      `Declared file count: ${result.declaredFileCount}`,
      `Runtime signal count: ${result.runtimeSignalCount}`,
      `Safety gate count: ${result.safetyGateCount}`,
      "",
      "## Boundaries",
      "",
      `- Local only: ${result.localOnly}`,
      `- Private app only: ${result.privateAppOnly}`,
      `- Read only: ${result.readOnly}`,
      `- Frontend-consumable status: ${result.frontendConsumableStatus}`,
      `- Backend logic disabled: ${result.noBackendLogic}`,
      `- Command execution allowed: ${result.commandExecutionAllowed}`,
      `- Runner connectivity allowed: ${result.runnerConnectivityAllowed}`,
      `- Mutates source: ${result.mutatesSource}`,
      `- Auto-merge allowed: ${result.autoMergeAllowed}`,
      `- Self-approval allowed: ${result.selfApprovalAllowed}`,
      "",
      "## Blockers",
      "",
      ...(result.blockers.length === 0 ? ["- none"] : result.blockers.map((blocker) => `- ${blocker}`)),
      "",
    ].join("\n"),
    "utf8",
  );

  return { jsonPath, markdownPath };
}

export function inspectOperatorAppRuntimeReaderV1(
  config = createDefaultOperatorAppRuntimeReaderV1(),
  options = {},
) {
  const rootDir = options.rootDir ?? process.cwd();
  const writeArtifacts = options.writeArtifacts ?? true;
  const blockers = [];

  for (const declaredPath of config.declaredPaths) {
    if (!isSafeRelativePath(declaredPath)) {
      blockers.push(`Declared path must be safe and relative: ${declaredPath}`);
      continue;
    }

    if (!fs.existsSync(path.join(rootDir, declaredPath))) {
      blockers.push(`Missing declared file: ${declaredPath}`);
    }
  }

  const appPath = path.join(rootDir, "apps/operator-console/src/App.tsx");
  const runtimeStatusPath = path.join(rootDir, "apps/operator-console/src/runtime-status.ts");
  const packagePath = path.join(rootDir, "package.json");

  const appContent = fs.existsSync(appPath) ? fs.readFileSync(appPath, "utf8") : "";
  const runtimeStatusContent = fs.existsSync(runtimeStatusPath) ? fs.readFileSync(runtimeStatusPath, "utf8") : "";
  const packageContent = fs.existsSync(packagePath) ? fs.readFileSync(packagePath, "utf8") : "";

  if (!runtimeStatusContent.includes("operatorRuntimeStatus")) {
    blockers.push("runtime-status.ts must export operatorRuntimeStatus");
  }

  if (!runtimeStatusContent.includes("Phase 47 · Operator App Runtime Reader v1")) {
    blockers.push("runtime status packet must identify Phase 47");
  }

  if (!runtimeStatusContent.includes("operator-console-v1")) {
    blockers.push("runtime status packet must preserve the current certification level");
  }

  for (const gate of config.requiredSafetyGates) {
    if (!runtimeStatusContent.includes(gate)) {
      blockers.push(`runtime status packet missing safety gate: ${gate}`);
    }
  }

  for (const binding of config.requiredAppBindings) {
    if (!appContent.includes(binding)) {
      blockers.push(`operator app missing runtime status binding: ${binding}`);
    }
  }

  if (!packageContent.includes('"phase47:demo"')) {
    blockers.push("package.json missing phase47:demo script");
  }

  if (!packageContent.includes('"phase47:verify"')) {
    blockers.push("package.json missing phase47:verify script");
  }

  const boundaries = config.boundaries;
  if (!boundaries.localOnly) blockers.push("localOnly must remain true");
  if (!boundaries.privateAppOnly) blockers.push("privateAppOnly must remain true");
  if (!boundaries.readOnly) blockers.push("readOnly must remain true");
  if (!boundaries.frontendConsumableStatus) blockers.push("frontendConsumableStatus must remain true");
  if (!boundaries.noBackendLogic) blockers.push("noBackendLogic must remain true");
  if (!boundaries.noAuthentication) blockers.push("noAuthentication must remain true");
  if (boundaries.commandExecutionAllowed) blockers.push("commandExecutionAllowed must remain false");
  if (boundaries.remoteExecutionAllowed) blockers.push("remoteExecutionAllowed must remain false");
  if (boundaries.runnerConnectivityAllowed) blockers.push("runnerConnectivityAllowed must remain false");
  if (boundaries.mutatesSource) blockers.push("mutatesSource must remain false");
  if (boundaries.autoMergeAllowed) blockers.push("autoMergeAllowed must remain false");
  if (boundaries.selfApprovalAllowed) blockers.push("selfApprovalAllowed must remain false");

  const result = {
    ok: blockers.length === 0,
    status: blockers.length === 0 ? "passed" : "failed",
    operatorAppRuntimeReaderStatus: blockers.length === 0 ? "ready" : "blocked",
    validationFailedCount: blockers.length,
    blockers,
    declaredFileCount: config.declaredPaths.length,
    runtimeSignalCount: config.runtimeSignals.length,
    safetyGateCount: config.requiredSafetyGates.length,
    appStatusBindingCount: config.requiredAppBindings.length,
    localOnly: boundaries.localOnly,
    privateAppOnly: boundaries.privateAppOnly,
    readOnly: boundaries.readOnly,
    frontendConsumableStatus: boundaries.frontendConsumableStatus,
    noBackendLogic: boundaries.noBackendLogic,
    noAuthentication: boundaries.noAuthentication,
    commandExecutionAllowed: boundaries.commandExecutionAllowed,
    remoteExecutionAllowed: boundaries.remoteExecutionAllowed,
    runnerConnectivityAllowed: boundaries.runnerConnectivityAllowed,
    mutatesSource: boundaries.mutatesSource,
    autoMergeAllowed: boundaries.autoMergeAllowed,
    selfApprovalAllowed: boundaries.selfApprovalAllowed,
  };

  if (writeArtifacts) {
    Object.assign(result, writeReports(rootDir, result));
  }

  return result;
}
