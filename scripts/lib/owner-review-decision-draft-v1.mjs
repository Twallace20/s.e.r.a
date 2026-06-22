import fs from "node:fs";
import path from "node:path";

export function createDefaultOwnerReviewDecisionDraftV1() {
  return {
    phase: 53,
    name: "owner-review-decision-draft-v1",
    declaredPaths: [
      "docs/phases/PHASE_53_OWNER_REVIEW_DECISION_DRAFT_V1.md",
      "apps/operator-console/src/owner-review-decision-draft.ts",
      "scripts/lib/owner-review-decision-draft-v1.mjs",
      "scripts/run-owner-review-decision-draft-v1.mjs",
      "tests/integration/owner-review-decision-draft-v1.test.ts",
    ],
    decisionFields: [
      "id",
      "label",
      "meaning",
      "allowedNextState",
      "requiresRationale",
      "requiresOwnerConfirmation",
      "blockedAuthority",
      "finalApprovalBoundary",
    ],
    decisionSignals: [
      "review item id",
      "decision option id",
      "owner rationale requirement",
      "allowed next state",
      "blocked authority",
      "source queue",
      "decision owner",
      "final approval boundary",
    ],
    requiredDecisionOptionIds: [
      "approve-for-planning",
      "needs-changes",
      "reject",
      "hold-for-context",
    ],
    requiredSafetyGates: [
      "Owner review decision drafts only",
      "Tyler remains the decision owner",
      "Draft decisions do not equal final approval",
      "Approve for planning does not create tasks",
      "Needs changes remains review-only",
      "Reject records intent only",
      "Hold for context cannot auto-route",
      "Owner rationale required before future recording",
      "No command execution",
      "No runner connectivity",
      "No backend decision service",
      "No authentication changes",
      "No task creation",
      "No source mutation",
      "No file mutation",
      "No final approval",
      "No auto-approval",
      "No self-approval",
    ],
    requiredAppBindings: [
      "ownerReviewDecisionPacket.decisionSummary.owner",
      "ownerReviewDecisionPacket.decisionOptions.length",
      "ownerReviewDecisionPacket.routing.suggestedQueue",
      "ownerReviewDecisionPacket.boundaries.commandExecutionAllowed",
      "ownerReviewDecisionPacket.boundaries.finalApprovalAllowed",
    ],
    boundaries: {
      localOnly: true,
      privateAppOnly: true,
      reviewOnly: true,
      decisionDraftOnly: true,
      planIntakeOnly: true,
      readOnly: true,
      frontendOnly: true,
      noBackendLogic: true,
      noAuthentication: true,
      commandExecutionAllowed: false,
      runnerConnectivityAllowed: false,
      taskCreationAllowed: false,
      mutatesSource: false,
      fileMutationAllowed: false,
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
  const reportDir = path.join(rootDir, ".sera-owner-review-decision-draft");
  fs.mkdirSync(reportDir, { recursive: true });
  const jsonPath = path.join(reportDir, "phase53-owner-review-decision-draft-status.json");
  const markdownPath = path.join(reportDir, "phase53-owner-review-decision-draft-status.md");

  fs.writeFileSync(jsonPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  fs.writeFileSync(
    markdownPath,
    [
      "# Phase 53 Owner Review Decision Draft v1",
      "",
      `Status: ${result.ownerReviewDecisionDraftStatus}`,
      `Validation failed count: ${result.validationFailedCount}`,
      `Declared file count: ${result.declaredFileCount}`,
      `Decision option count: ${result.decisionOptionCount}`,
      `Decision field count: ${result.decisionFieldCount}`,
      `Decision signal count: ${result.decisionSignalCount}`,
      `Safety gate count: ${result.safetyGateCount}`,
      "",
      "## Boundaries",
      "",
      `- Local only: ${result.localOnly}`,
      `- Private app only: ${result.privateAppOnly}`,
      `- Review only: ${result.reviewOnly}`,
      `- Decision draft only: ${result.decisionDraftOnly}`,
      `- Command execution allowed: ${result.commandExecutionAllowed}`,
      `- Runner connectivity allowed: ${result.runnerConnectivityAllowed}`,
      `- Task creation allowed: ${result.taskCreationAllowed}`,
      `- Final approval allowed: ${result.finalApprovalAllowed}`,
      `- Auto approval allowed: ${result.autoApprovalAllowed}`,
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

export function inspectOwnerReviewDecisionDraftV1(config = createDefaultOwnerReviewDecisionDraftV1(), options = {}) {
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

  const decisionContent = readIfExists(rootDir, "apps/operator-console/src/owner-review-decision-draft.ts") || "";
  const appContent = readIfExists(rootDir, "apps/operator-console/src/App.tsx") || "";
  const packageContent = readIfExists(rootDir, "package.json") || "";

  if (!decisionContent.includes("export const ownerReviewDecisionPacket")) {
    blockers.push("owner review decision draft file must export ownerReviewDecisionPacket");
  }

  if (!decisionContent.includes("Phase 53 · Owner Review Decision Draft v1")) {
    blockers.push("owner review decision draft packet must identify Phase 53");
  }

  if (!decisionContent.includes("Tyler Wallace")) {
    blockers.push("owner review decision draft packet must identify Tyler Wallace as owner");
  }

  for (const field of config.decisionFields) {
    if (!decisionContent.includes(field)) {
      blockers.push(`owner review decision draft packet missing decision field: ${field}`);
    }
  }

  for (const signal of config.decisionSignals) {
    if (!decisionContent.includes(signal)) {
      blockers.push(`owner review decision draft packet missing decision signal: ${signal}`);
    }
  }

  for (const optionId of config.requiredDecisionOptionIds) {
    if (!decisionContent.includes(optionId)) {
      blockers.push(`owner review decision draft missing decision option: ${optionId}`);
    }
  }

  for (const gate of config.requiredSafetyGates) {
    if (!decisionContent.includes(gate)) {
      blockers.push(`owner review decision draft packet missing safety gate: ${gate}`);
    }
  }

  for (const binding of config.requiredAppBindings) {
    if (!appContent.includes(binding)) {
      blockers.push(`operator app missing owner review decision draft binding: ${binding}`);
    }
  }

  if (!appContent.includes("Owner Review Decision Draft")) {
    blockers.push("operator app missing Owner Review Decision Draft card");
  }

  if (!packageContent.includes('"phase53:demo"')) {
    blockers.push("package.json missing phase53:demo script");
  }

  if (!packageContent.includes('"phase53:verify"')) {
    blockers.push("package.json missing phase53:verify script");
  }

  const boundaries = config.boundaries;
  if (!boundaries.localOnly) blockers.push("localOnly must remain true");
  if (!boundaries.privateAppOnly) blockers.push("privateAppOnly must remain true");
  if (!boundaries.reviewOnly) blockers.push("reviewOnly must remain true");
  if (!boundaries.decisionDraftOnly) blockers.push("decisionDraftOnly must remain true");
  if (!boundaries.planIntakeOnly) blockers.push("planIntakeOnly must remain true");
  if (!boundaries.readOnly) blockers.push("readOnly must remain true");
  if (!boundaries.frontendOnly) blockers.push("frontendOnly must remain true");
  if (!boundaries.noBackendLogic) blockers.push("noBackendLogic must remain true");
  if (!boundaries.noAuthentication) blockers.push("noAuthentication must remain true");
  if (boundaries.commandExecutionAllowed) blockers.push("commandExecutionAllowed must remain false");
  if (boundaries.runnerConnectivityAllowed) blockers.push("runnerConnectivityAllowed must remain false");
  if (boundaries.taskCreationAllowed) blockers.push("taskCreationAllowed must remain false");
  if (boundaries.mutatesSource) blockers.push("mutatesSource must remain false");
  if (boundaries.fileMutationAllowed) blockers.push("fileMutationAllowed must remain false");
  if (boundaries.finalApprovalAllowed) blockers.push("finalApprovalAllowed must remain false");
  if (boundaries.autoApprovalAllowed) blockers.push("autoApprovalAllowed must remain false");
  if (boundaries.autoProcessingAllowed) blockers.push("autoProcessingAllowed must remain false");
  if (boundaries.autoRouteAllowed) blockers.push("autoRouteAllowed must remain false");
  if (boundaries.autoMergeAllowed) blockers.push("autoMergeAllowed must remain false");
  if (boundaries.selfApprovalAllowed) blockers.push("selfApprovalAllowed must remain false");

  const result = {
    ok: blockers.length === 0,
    status: blockers.length === 0 ? "passed" : "failed",
    ownerReviewDecisionDraftStatus: blockers.length === 0 ? "ready" : "blocked",
    validationFailedCount: blockers.length,
    blockers,
    declaredFileCount: config.declaredPaths.length,
    decisionOptionCount: config.requiredDecisionOptionIds.length,
    decisionFieldCount: config.decisionFields.length,
    decisionSignalCount: config.decisionSignals.length,
    safetyGateCount: config.requiredSafetyGates.length,
    appBindingCount: config.requiredAppBindings.length,
    localOnly: boundaries.localOnly,
    privateAppOnly: boundaries.privateAppOnly,
    reviewOnly: boundaries.reviewOnly,
    decisionDraftOnly: boundaries.decisionDraftOnly,
    planIntakeOnly: boundaries.planIntakeOnly,
    readOnly: boundaries.readOnly,
    frontendOnly: boundaries.frontendOnly,
    noBackendLogic: boundaries.noBackendLogic,
    noAuthentication: boundaries.noAuthentication,
    commandExecutionAllowed: boundaries.commandExecutionAllowed,
    runnerConnectivityAllowed: boundaries.runnerConnectivityAllowed,
    taskCreationAllowed: boundaries.taskCreationAllowed,
    mutatesSource: boundaries.mutatesSource,
    fileMutationAllowed: boundaries.fileMutationAllowed,
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
