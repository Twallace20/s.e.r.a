import fs from "node:fs";
import path from "node:path";

export function createDefaultWorkflowComposerV1() {
  return {
    phase: 51,
    name: "workflow-composer-v1",
    declaredPaths: [
      "docs/phases/PHASE_51_WORKFLOW_COMPOSER_V1.md",
      "apps/operator-console/src/workflow-composer.ts",
      "scripts/lib/workflow-composer-v1.mjs",
      "scripts/run-workflow-composer-v1.mjs",
      "tests/integration/workflow-composer-v1.test.ts",
    ],
    compositionFields: [
      "requestSignal",
      "fileSignal",
      "workflowSignal",
      "composedPlan",
      "steps",
      "evidenceRequirements",
      "suggestedQueue",
      "ownerGate",
    ],
    compositionSignals: [
      "request title",
      "request details",
      "file metadata",
      "workflow selection",
      "suggested queue",
      "owner gate",
      "evidence requirements",
      "plan preview",
    ],
    requiredPlanSteps: [
      "review-request-signal",
      "review-file-signal",
      "select-workflow-signal",
      "compose-plan-preview",
    ],
    requiredEvidenceRequirements: [
      "request intake evidence",
      "file metadata evidence",
      "workflow catalog evidence",
      "owner approval checkpoint",
      "validation proof before any future execution",
    ],
    requiredSafetyGates: [
      "Composition preview only",
      "Request signal remains capture-only",
      "File signal remains metadata-only",
      "Workflow signal remains catalog-only",
      "Owner review required before task creation",
      "No command execution",
      "No runner connectivity",
      "No backend workflow service",
      "No authentication changes",
      "No source mutation",
      "No file mutation",
      "No auto-processing",
      "No auto-routing",
      "No auto-merge",
      "No self-approval",
    ],
    requiredAppBindings: [
      "workflowComposerPacket.composedPlan.title",
      "workflowComposerPacket.workflowSignal.label",
      "workflowComposerPacket.routing.suggestedQueue",
      "workflowComposerPacket.boundaries.commandExecutionAllowed",
    ],
    boundaries: {
      localOnly: true,
      privateAppOnly: true,
      compositionOnly: true,
      planPreviewOnly: true,
      readOnly: true,
      frontendOnly: true,
      noBackendLogic: true,
      noAuthentication: true,
      commandExecutionAllowed: false,
      runnerConnectivityAllowed: false,
      mutatesSource: false,
      fileMutationAllowed: false,
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
  const reportDir = path.join(rootDir, ".sera-workflow-composer");
  fs.mkdirSync(reportDir, { recursive: true });
  const jsonPath = path.join(reportDir, "phase51-workflow-composer-status.json");
  const markdownPath = path.join(reportDir, "phase51-workflow-composer-status.md");

  fs.writeFileSync(jsonPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  fs.writeFileSync(
    markdownPath,
    [
      "# Phase 51 Workflow Composer v1",
      "",
      `Status: ${result.workflowComposerStatus}`,
      `Validation failed count: ${result.validationFailedCount}`,
      `Declared file count: ${result.declaredFileCount}`,
      `Composition field count: ${result.compositionFieldCount}`,
      `Composition signal count: ${result.compositionSignalCount}`,
      `Plan step count: ${result.planStepCount}`,
      `Evidence requirement count: ${result.evidenceRequirementCount}`,
      `Safety gate count: ${result.safetyGateCount}`,
      "",
      "## Boundaries",
      "",
      `- Local only: ${result.localOnly}`,
      `- Private app only: ${result.privateAppOnly}`,
      `- Composition only: ${result.compositionOnly}`,
      `- Plan preview only: ${result.planPreviewOnly}`,
      `- Read only: ${result.readOnly}`,
      `- Frontend only: ${result.frontendOnly}`,
      `- Backend logic disabled: ${result.noBackendLogic}`,
      `- Authentication disabled: ${result.noAuthentication}`,
      `- Command execution allowed: ${result.commandExecutionAllowed}`,
      `- Runner connectivity allowed: ${result.runnerConnectivityAllowed}`,
      `- Mutates source: ${result.mutatesSource}`,
      `- File mutation allowed: ${result.fileMutationAllowed}`,
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

export function inspectWorkflowComposerV1(config = createDefaultWorkflowComposerV1(), options = {}) {
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
  const workflowComposerPath = path.join(rootDir, "apps/operator-console/src/workflow-composer.ts");
  const packagePath = path.join(rootDir, "package.json");

  const appContent = fs.existsSync(appPath) ? fs.readFileSync(appPath, "utf8") : "";
  const workflowComposerContent = fs.existsSync(workflowComposerPath) ? fs.readFileSync(workflowComposerPath, "utf8") : "";
  const packageContent = fs.existsSync(packagePath) ? fs.readFileSync(packagePath, "utf8") : "";

  if (!workflowComposerContent.includes("workflowComposerPacket")) {
    blockers.push("workflow-composer.ts must export workflowComposerPacket");
  }

  if (!workflowComposerContent.includes("Phase 51 · Workflow Composer v1")) {
    blockers.push("workflow composer packet must identify Phase 51");
  }

  for (const field of config.compositionFields) {
    if (!workflowComposerContent.includes(field)) {
      blockers.push(`workflow composer packet missing composition field: ${field}`);
    }
  }

  for (const signal of config.compositionSignals) {
    if (!workflowComposerContent.includes(signal)) {
      blockers.push(`workflow composer packet missing composition signal: ${signal}`);
    }
  }

  for (const stepId of config.requiredPlanSteps) {
    if (!workflowComposerContent.includes(stepId)) {
      blockers.push(`workflow composer missing plan step: ${stepId}`);
    }
  }

  for (const evidence of config.requiredEvidenceRequirements) {
    if (!workflowComposerContent.includes(evidence)) {
      blockers.push(`workflow composer missing evidence requirement: ${evidence}`);
    }
  }

  for (const gate of config.requiredSafetyGates) {
    if (!workflowComposerContent.includes(gate)) {
      blockers.push(`workflow composer packet missing safety gate: ${gate}`);
    }
  }

  for (const binding of config.requiredAppBindings) {
    if (!appContent.includes(binding)) {
      blockers.push(`operator app missing workflow composer binding: ${binding}`);
    }
  }

  if (!appContent.includes("Workflow Composer Review")) {
    blockers.push("operator app missing Workflow Composer Review card");
  }

  if (!packageContent.includes('"phase51:demo"')) {
    blockers.push("package.json missing phase51:demo script");
  }

  if (!packageContent.includes('"phase51:verify"')) {
    blockers.push("package.json missing phase51:verify script");
  }

  const boundaries = config.boundaries;
  if (!boundaries.localOnly) blockers.push("localOnly must remain true");
  if (!boundaries.privateAppOnly) blockers.push("privateAppOnly must remain true");
  if (!boundaries.compositionOnly) blockers.push("compositionOnly must remain true");
  if (!boundaries.planPreviewOnly) blockers.push("planPreviewOnly must remain true");
  if (!boundaries.readOnly) blockers.push("readOnly must remain true");
  if (!boundaries.frontendOnly) blockers.push("frontendOnly must remain true");
  if (!boundaries.noBackendLogic) blockers.push("noBackendLogic must remain true");
  if (!boundaries.noAuthentication) blockers.push("noAuthentication must remain true");
  if (boundaries.commandExecutionAllowed) blockers.push("commandExecutionAllowed must remain false");
  if (boundaries.runnerConnectivityAllowed) blockers.push("runnerConnectivityAllowed must remain false");
  if (boundaries.mutatesSource) blockers.push("mutatesSource must remain false");
  if (boundaries.fileMutationAllowed) blockers.push("fileMutationAllowed must remain false");
  if (boundaries.autoProcessingAllowed) blockers.push("autoProcessingAllowed must remain false");
  if (boundaries.autoRouteAllowed) blockers.push("autoRouteAllowed must remain false");
  if (boundaries.autoMergeAllowed) blockers.push("autoMergeAllowed must remain false");
  if (boundaries.selfApprovalAllowed) blockers.push("selfApprovalAllowed must remain false");

  const result = {
    ok: blockers.length === 0,
    status: blockers.length === 0 ? "passed" : "failed",
    workflowComposerStatus: blockers.length === 0 ? "ready" : "blocked",
    validationFailedCount: blockers.length,
    blockers,
    declaredFileCount: config.declaredPaths.length,
    compositionFieldCount: config.compositionFields.length,
    compositionSignalCount: config.compositionSignals.length,
    planStepCount: config.requiredPlanSteps.length,
    evidenceRequirementCount: config.requiredEvidenceRequirements.length,
    safetyGateCount: config.requiredSafetyGates.length,
    appBindingCount: config.requiredAppBindings.length,
    localOnly: boundaries.localOnly,
    privateAppOnly: boundaries.privateAppOnly,
    compositionOnly: boundaries.compositionOnly,
    planPreviewOnly: boundaries.planPreviewOnly,
    readOnly: boundaries.readOnly,
    frontendOnly: boundaries.frontendOnly,
    noBackendLogic: boundaries.noBackendLogic,
    noAuthentication: boundaries.noAuthentication,
    commandExecutionAllowed: boundaries.commandExecutionAllowed,
    runnerConnectivityAllowed: boundaries.runnerConnectivityAllowed,
    mutatesSource: boundaries.mutatesSource,
    fileMutationAllowed: boundaries.fileMutationAllowed,
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
