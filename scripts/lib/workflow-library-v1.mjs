import fs from "node:fs";
import path from "node:path";

export function createDefaultWorkflowLibraryV1() {
  return {
    phase: 50,
    name: "workflow-library-v1",
    declaredPaths: [
      "docs/phases/PHASE_50_WORKFLOW_LIBRARY_V1.md",
      "apps/operator-console/src/workflow-library.ts",
      "scripts/lib/workflow-library-v1.mjs",
      "scripts/run-workflow-library-v1.mjs",
      "tests/integration/workflow-library-v1.test.ts",
    ],
    workflowFields: [
      "id",
      "name",
      "category",
      "description",
      "inputSignals",
      "outputMode",
      "ownerGate",
      "executionAuthority",
    ],
    catalogSignals: [
      "workflow id",
      "workflow name",
      "workflow category",
      "input signals",
      "output mode",
      "owner gate",
      "execution authority",
    ],
    requiredWorkflowIds: [
      "phase-build",
      "validation-review",
      "evidence-packet",
      "file-review",
      "research-brief",
      "app-improvement",
    ],
    requiredSafetyGates: [
      "Catalog workflow definitions only",
      "Owner review required before workflow routing",
      "No command execution",
      "No runner connectivity",
      "No backend workflow service",
      "No authentication changes",
      "No source mutation",
      "No file processing",
      "No auto-processing",
      "No auto-routing",
      "No auto-merge",
      "No self-approval",
    ],
    requiredAppBindings: [
      "workflowLibraryPacket.primaryWorkflow.name",
      "workflowLibraryPacket.primaryWorkflow.category",
      "workflowLibraryPacket.routing.suggestedQueue",
      "workflowLibraryPacket.boundaries.commandExecutionAllowed",
    ],
    boundaries: {
      localOnly: true,
      privateAppOnly: true,
      catalogOnly: true,
      readOnly: true,
      frontendOnly: true,
      noBackendLogic: true,
      noAuthentication: true,
      commandExecutionAllowed: false,
      runnerConnectivityAllowed: false,
      mutatesSource: false,
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

function writeReports(rootDir, result) {
  const reportDir = path.join(rootDir, ".sera-workflow-library");
  fs.mkdirSync(reportDir, { recursive: true });
  const jsonPath = path.join(reportDir, "phase50-workflow-library-status.json");
  const markdownPath = path.join(reportDir, "phase50-workflow-library-status.md");

  fs.writeFileSync(jsonPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  fs.writeFileSync(
    markdownPath,
    [
      "# Phase 50 Workflow Library v1",
      "",
      `Status: ${result.workflowLibraryStatus}`,
      `Validation failed count: ${result.validationFailedCount}`,
      `Declared file count: ${result.declaredFileCount}`,
      `Workflow count: ${result.workflowCount}`,
      `Workflow field count: ${result.workflowFieldCount}`,
      `Catalog signal count: ${result.catalogSignalCount}`,
      `Safety gate count: ${result.safetyGateCount}`,
      "",
      "## Boundaries",
      "",
      `- Local only: ${result.localOnly}`,
      `- Private app only: ${result.privateAppOnly}`,
      `- Catalog only: ${result.catalogOnly}`,
      `- Read only: ${result.readOnly}`,
      `- Frontend only: ${result.frontendOnly}`,
      `- Backend logic disabled: ${result.noBackendLogic}`,
      `- Authentication disabled: ${result.noAuthentication}`,
      `- Command execution allowed: ${result.commandExecutionAllowed}`,
      `- Runner connectivity allowed: ${result.runnerConnectivityAllowed}`,
      `- Mutates source: ${result.mutatesSource}`,
      `- Auto-processing allowed: ${result.autoProcessingAllowed}`,
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

export function inspectWorkflowLibraryV1(config = createDefaultWorkflowLibraryV1(), options = {}) {
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
  const workflowLibraryPath = path.join(rootDir, "apps/operator-console/src/workflow-library.ts");
  const packagePath = path.join(rootDir, "package.json");

  const appContent = fs.existsSync(appPath) ? fs.readFileSync(appPath, "utf8") : "";
  const workflowLibraryContent = fs.existsSync(workflowLibraryPath) ? fs.readFileSync(workflowLibraryPath, "utf8") : "";
  const packageContent = fs.existsSync(packagePath) ? fs.readFileSync(packagePath, "utf8") : "";

  if (!workflowLibraryContent.includes("workflowLibraryPacket")) {
    blockers.push("workflow-library.ts must export workflowLibraryPacket");
  }

  if (!workflowLibraryContent.includes("Phase 50 · Workflow Library v1")) {
    blockers.push("workflow library packet must identify Phase 50");
  }

  for (const field of config.workflowFields) {
    if (!workflowLibraryContent.includes(field)) {
      blockers.push(`workflow library packet missing workflow field: ${field}`);
    }
  }

  for (const workflowId of config.requiredWorkflowIds) {
    if (!workflowLibraryContent.includes(workflowId)) {
      blockers.push(`workflow library missing workflow id: ${workflowId}`);
    }
  }

  for (const gate of config.requiredSafetyGates) {
    if (!workflowLibraryContent.includes(gate)) {
      blockers.push(`workflow library packet missing safety gate: ${gate}`);
    }
  }

  for (const binding of config.requiredAppBindings) {
    if (!appContent.includes(binding)) {
      blockers.push(`operator app missing workflow library binding: ${binding}`);
    }
  }

  if (!appContent.includes("Workflow Library Review")) {
    blockers.push("operator app missing Workflow Library Review card");
  }

  if (!packageContent.includes('"phase50:demo"')) {
    blockers.push("package.json missing phase50:demo script");
  }

  if (!packageContent.includes('"phase50:verify"')) {
    blockers.push("package.json missing phase50:verify script");
  }

  const boundaries = config.boundaries;
  if (!boundaries.localOnly) blockers.push("localOnly must remain true");
  if (!boundaries.privateAppOnly) blockers.push("privateAppOnly must remain true");
  if (!boundaries.catalogOnly) blockers.push("catalogOnly must remain true");
  if (!boundaries.readOnly) blockers.push("readOnly must remain true");
  if (!boundaries.frontendOnly) blockers.push("frontendOnly must remain true");
  if (!boundaries.noBackendLogic) blockers.push("noBackendLogic must remain true");
  if (!boundaries.noAuthentication) blockers.push("noAuthentication must remain true");
  if (boundaries.commandExecutionAllowed) blockers.push("commandExecutionAllowed must remain false");
  if (boundaries.runnerConnectivityAllowed) blockers.push("runnerConnectivityAllowed must remain false");
  if (boundaries.mutatesSource) blockers.push("mutatesSource must remain false");
  if (boundaries.autoProcessingAllowed) blockers.push("autoProcessingAllowed must remain false");
  if (boundaries.autoRouteAllowed) blockers.push("autoRouteAllowed must remain false");
  if (boundaries.autoMergeAllowed) blockers.push("autoMergeAllowed must remain false");
  if (boundaries.selfApprovalAllowed) blockers.push("selfApprovalAllowed must remain false");

  const result = {
    ok: blockers.length === 0,
    status: blockers.length === 0 ? "passed" : "failed",
    workflowLibraryStatus: blockers.length === 0 ? "ready" : "blocked",
    validationFailedCount: blockers.length,
    blockers,
    declaredFileCount: config.declaredPaths.length,
    workflowCount: config.requiredWorkflowIds.length,
    workflowFieldCount: config.workflowFields.length,
    catalogSignalCount: config.catalogSignals.length,
    safetyGateCount: config.requiredSafetyGates.length,
    appBindingCount: config.requiredAppBindings.length,
    localOnly: boundaries.localOnly,
    privateAppOnly: boundaries.privateAppOnly,
    catalogOnly: boundaries.catalogOnly,
    readOnly: boundaries.readOnly,
    frontendOnly: boundaries.frontendOnly,
    noBackendLogic: boundaries.noBackendLogic,
    noAuthentication: boundaries.noAuthentication,
    commandExecutionAllowed: boundaries.commandExecutionAllowed,
    runnerConnectivityAllowed: boundaries.runnerConnectivityAllowed,
    mutatesSource: boundaries.mutatesSource,
    autoProcessingAllowed: boundaries.autoProcessingAllowed,
    autoRouteAllowed: boundaries.autoRouteAllowed,
    autoMergeAllowed: boundaries.autoMergeAllowed,
    selfApprovalAllowed: boundaries.selfApprovalAllowed,
  };

  if (writeArtifacts) {
    Object.assign(result, writeReports(rootDir, result));
  }

  return result;
}
