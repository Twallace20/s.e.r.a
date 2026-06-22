import fs from "node:fs";
import path from "node:path";

export function createDefaultRequestIntakeV1() {
  return {
    phase: 48,
    name: "request-intake-v1",
    declaredPaths: [
      "docs/phases/PHASE_48_REQUEST_INTAKE_V1.md",
      "apps/operator-console/src/request-intake.ts",
      "scripts/lib/request-intake-v1.mjs",
      "scripts/run-request-intake-v1.mjs",
      "tests/integration/request-intake-v1.test.ts",
    ],
    requestFields: [
      "title",
      "details",
      "requestedBy",
      "priority",
      "workflowType",
      "intakeStatus",
      "safetyClassification",
      "routing.suggestedQueue",
    ],
    intakeSignals: [
      "request title",
      "request details",
      "priority",
      "workflow type",
      "suggested queue",
      "safety classification",
    ],
    requiredSafetyGates: [
      "Capture request drafts only",
      "Owner review required before routing",
      "No autonomous submission",
      "No command execution",
      "No runner connectivity",
      "No backend intake service",
      "No authentication changes",
      "No source mutation",
      "No auto-merge",
      "No self-approval",
    ],
    requiredAppBindings: [
      "requestIntakeDraft.title",
      "requestIntakeDraft.details",
      "requestIntakeDraft.routing.suggestedQueue",
      "requestIntakeDraft.boundaries.commandExecutionAllowed",
    ],
    boundaries: {
      localOnly: true,
      privateAppOnly: true,
      captureOnly: true,
      readOnly: true,
      frontendOnly: true,
      noBackendLogic: true,
      noAuthentication: true,
      commandExecutionAllowed: false,
      runnerConnectivityAllowed: false,
      mutatesSource: false,
      autoSubmitAllowed: false,
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

function writeReports(rootDir, result) {
  const reportDir = path.join(rootDir, ".sera-request-intake");
  fs.mkdirSync(reportDir, { recursive: true });
  const jsonPath = path.join(reportDir, "phase48-request-intake-status.json");
  const markdownPath = path.join(reportDir, "phase48-request-intake-status.md");

  fs.writeFileSync(jsonPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  fs.writeFileSync(
    markdownPath,
    [
      "# Phase 48 Request Intake v1",
      "",
      `Status: ${result.requestIntakeStatus}`,
      `Validation failed count: ${result.validationFailedCount}`,
      `Declared file count: ${result.declaredFileCount}`,
      `Request field count: ${result.requestFieldCount}`,
      `Intake signal count: ${result.intakeSignalCount}`,
      `Safety gate count: ${result.safetyGateCount}`,
      "",
      "## Boundaries",
      "",
      `- Local only: ${result.localOnly}`,
      `- Private app only: ${result.privateAppOnly}`,
      `- Capture only: ${result.captureOnly}`,
      `- Read only: ${result.readOnly}`,
      `- Frontend only: ${result.frontendOnly}`,
      `- Backend logic disabled: ${result.noBackendLogic}`,
      `- Authentication disabled: ${result.noAuthentication}`,
      `- Command execution allowed: ${result.commandExecutionAllowed}`,
      `- Runner connectivity allowed: ${result.runnerConnectivityAllowed}`,
      `- Mutates source: ${result.mutatesSource}`,
      `- Auto-submit allowed: ${result.autoSubmitAllowed}`,
      `- Auto-route allowed: ${result.autoRouteAllowed}`,
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

export function inspectRequestIntakeV1(config = createDefaultRequestIntakeV1(), options = {}) {
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
  const requestIntakePath = path.join(rootDir, "apps/operator-console/src/request-intake.ts");
  const packagePath = path.join(rootDir, "package.json");

  const appContent = fs.existsSync(appPath) ? fs.readFileSync(appPath, "utf8") : "";
  const requestIntakeContent = fs.existsSync(requestIntakePath)
    ? fs.readFileSync(requestIntakePath, "utf8")
    : "";
  const packageContent = fs.existsSync(packagePath) ? fs.readFileSync(packagePath, "utf8") : "";

  if (!requestIntakeContent.includes("requestIntakeDraft")) {
    blockers.push("request-intake.ts must export requestIntakeDraft");
  }

  if (!requestIntakeContent.includes("Phase 48 · Request Intake v1")) {
    blockers.push("request intake packet must identify Phase 48");
  }

  for (const field of config.requestFields) {
    const fieldName = field.split(".").at(-1);
    if (!requestIntakeContent.includes(fieldName)) {
      blockers.push(`request intake packet missing field: ${field}`);
    }
  }

  for (const gate of config.requiredSafetyGates) {
    if (!requestIntakeContent.includes(gate)) {
      blockers.push(`request intake packet missing safety gate: ${gate}`);
    }
  }

  for (const binding of config.requiredAppBindings) {
    if (!appContent.includes(binding)) {
      blockers.push(`operator app missing request intake binding: ${binding}`);
    }
  }

  if (!appContent.includes("Request Intake Review")) {
    blockers.push("operator app missing Request Intake Review card");
  }

  if (!packageContent.includes('"phase48:demo"')) {
    blockers.push("package.json missing phase48:demo script");
  }

  if (!packageContent.includes('"phase48:verify"')) {
    blockers.push("package.json missing phase48:verify script");
  }

  const boundaries = config.boundaries;
  if (!boundaries.localOnly) blockers.push("localOnly must remain true");
  if (!boundaries.privateAppOnly) blockers.push("privateAppOnly must remain true");
  if (!boundaries.captureOnly) blockers.push("captureOnly must remain true");
  if (!boundaries.readOnly) blockers.push("readOnly must remain true");
  if (!boundaries.frontendOnly) blockers.push("frontendOnly must remain true");
  if (!boundaries.noBackendLogic) blockers.push("noBackendLogic must remain true");
  if (!boundaries.noAuthentication) blockers.push("noAuthentication must remain true");
  if (boundaries.commandExecutionAllowed) blockers.push("commandExecutionAllowed must remain false");
  if (boundaries.runnerConnectivityAllowed) blockers.push("runnerConnectivityAllowed must remain false");
  if (boundaries.mutatesSource) blockers.push("mutatesSource must remain false");
  if (boundaries.autoSubmitAllowed) blockers.push("autoSubmitAllowed must remain false");
  if (boundaries.autoRouteAllowed) blockers.push("autoRouteAllowed must remain false");
  if (boundaries.autoMergeAllowed) blockers.push("autoMergeAllowed must remain false");
  if (boundaries.selfApprovalAllowed) blockers.push("selfApprovalAllowed must remain false");

  const result = {
    ok: blockers.length === 0,
    status: blockers.length === 0 ? "passed" : "failed",
    requestIntakeStatus: blockers.length === 0 ? "ready" : "blocked",
    validationFailedCount: blockers.length,
    blockers,
    declaredFileCount: config.declaredPaths.length,
    requestFieldCount: config.requestFields.length,
    intakeSignalCount: config.intakeSignals.length,
    safetyGateCount: config.requiredSafetyGates.length,
    appBindingCount: config.requiredAppBindings.length,
    localOnly: boundaries.localOnly,
    privateAppOnly: boundaries.privateAppOnly,
    captureOnly: boundaries.captureOnly,
    readOnly: boundaries.readOnly,
    frontendOnly: boundaries.frontendOnly,
    noBackendLogic: boundaries.noBackendLogic,
    noAuthentication: boundaries.noAuthentication,
    commandExecutionAllowed: boundaries.commandExecutionAllowed,
    runnerConnectivityAllowed: boundaries.runnerConnectivityAllowed,
    mutatesSource: boundaries.mutatesSource,
    autoSubmitAllowed: boundaries.autoSubmitAllowed,
    autoRouteAllowed: boundaries.autoRouteAllowed,
    autoMergeAllowed: boundaries.autoMergeAllowed,
    selfApprovalAllowed: boundaries.selfApprovalAllowed,
  };

  if (writeArtifacts) {
    Object.assign(result, writeReports(rootDir, result));
  }

  return result;
}
