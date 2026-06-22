import fs from "node:fs";
import path from "node:path";

export function createDefaultOperatorOwnerDecisionRecordSurfaceV1() {
  return {
    phase: 54,
    name: "operator-owner-decision-record-surface-v1",
    declaredPaths: [
      "docs/phases/PHASE_54_OPERATOR_OWNER_DECISION_RECORD_SURFACE_V1.md",
      "apps/operator-console/src/owner-decision-record-surface.ts",
      "scripts/lib/operator-owner-decision-record-surface-v1.mjs",
      "scripts/run-operator-owner-decision-record-surface-v1.mjs",
      "tests/integration/operator-owner-decision-record-surface-v1.test.ts",
    ],
    recordFields: [
      "recordId",
      "owner",
      "decisionOptionId",
      "sourceReviewItemId",
      "rationaleStatus",
      "timestampStatus",
      "recordAuthority",
      "finalApprovalBoundary",
    ],
    recordSignals: [
      "source decision draft",
      "selected decision option",
      "owner rationale",
      "record id",
      "decision timestamp",
      "evidence references",
      "persistence boundary",
      "execution approval boundary",
    ],
    requiredRecordActionIds: [
      "record-approve-for-planning",
      "record-needs-changes",
      "record-reject",
      "record-hold-for-context",
    ],
    requiredSafetyGates: [
      "Owner decision record surface only",
      "Tyler remains the record owner",
      "Record preview does not persist a decision",
      "Recorded intent does not equal execution approval",
      "Approve for planning remains non-executable",
      "Needs changes remains review-only",
      "Reject does not delete artifacts",
      "Hold for context cannot auto-route",
      "Owner rationale required before future persistence",
      "No command execution",
      "No runner connectivity",
      "No backend record service",
      "No authentication changes",
      "No record persistence",
      "No task creation",
      "No source mutation",
      "No file mutation",
      "No final approval",
      "No auto-approval",
      "No self-approval",
    ],
    requiredAppBindings: [
      "ownerDecisionRecordSurfacePacket.recordSummary.owner",
      "ownerDecisionRecordSurfacePacket.recordActions.length",
      "ownerDecisionRecordSurfacePacket.routing.suggestedQueue",
      "ownerDecisionRecordSurfacePacket.boundaries.commandExecutionAllowed",
      "ownerDecisionRecordSurfacePacket.boundaries.recordPersistenceAllowed",
    ],
    boundaries: {
      localOnly: true,
      privateAppOnly: true,
      reviewOnly: true,
      recordSurfaceOnly: true,
      decisionRecordDraftOnly: true,
      planIntakeOnly: true,
      readOnly: true,
      frontendOnly: true,
      noBackendLogic: true,
      noAuthentication: true,
      commandExecutionAllowed: false,
      runnerConnectivityAllowed: false,
      recordPersistenceAllowed: false,
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
  const reportDir = path.join(rootDir, ".sera-owner-decision-record-surface");
  fs.mkdirSync(reportDir, { recursive: true });
  const jsonPath = path.join(reportDir, "phase54-owner-decision-record-surface-status.json");
  const markdownPath = path.join(reportDir, "phase54-owner-decision-record-surface-status.md");

  fs.writeFileSync(jsonPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  fs.writeFileSync(
    markdownPath,
    [
      "# Phase 54 Operator Owner Decision Record Surface v1",
      "",
      `Status: ${result.ownerDecisionRecordSurfaceStatus}`,
      `Validation failed count: ${result.validationFailedCount}`,
      `Declared file count: ${result.declaredFileCount}`,
      `Record action count: ${result.recordActionCount}`,
      `Record field count: ${result.recordFieldCount}`,
      `Record signal count: ${result.recordSignalCount}`,
      `Safety gate count: ${result.safetyGateCount}`,
      "",
      "## Boundaries",
      "",
      `- Local only: ${result.localOnly}`,
      `- Private app only: ${result.privateAppOnly}`,
      `- Review only: ${result.reviewOnly}`,
      `- Record surface only: ${result.recordSurfaceOnly}`,
      `- Command execution allowed: ${result.commandExecutionAllowed}`,
      `- Runner connectivity allowed: ${result.runnerConnectivityAllowed}`,
      `- Record persistence allowed: ${result.recordPersistenceAllowed}`,
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

export function inspectOperatorOwnerDecisionRecordSurfaceV1(config = createDefaultOperatorOwnerDecisionRecordSurfaceV1(), options = {}) {
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

  const recordContent = readIfExists(rootDir, "apps/operator-console/src/owner-decision-record-surface.ts") || "";
  const appContent = readIfExists(rootDir, "apps/operator-console/src/App.tsx") || "";
  const packageContent = readIfExists(rootDir, "package.json") || "";

  if (!recordContent.includes("export const ownerDecisionRecordSurfacePacket")) {
    blockers.push("owner decision record surface file must export ownerDecisionRecordSurfacePacket");
  }

  if (!recordContent.includes("Phase 54 · Operator Owner Decision Record Surface v1")) {
    blockers.push("owner decision record surface packet must identify Phase 54");
  }

  if (!recordContent.includes("Tyler Wallace")) {
    blockers.push("owner decision record surface packet must identify Tyler Wallace as owner");
  }

  for (const field of config.recordFields) {
    if (!recordContent.includes(field)) {
      blockers.push(`owner decision record surface packet missing record field: ${field}`);
    }
  }

  for (const signal of config.recordSignals) {
    if (!recordContent.includes(signal)) {
      blockers.push(`owner decision record surface packet missing record signal: ${signal}`);
    }
  }

  for (const actionId of config.requiredRecordActionIds) {
    if (!recordContent.includes(actionId)) {
      blockers.push(`owner decision record surface missing record action: ${actionId}`);
    }
  }

  for (const gate of config.requiredSafetyGates) {
    if (!recordContent.includes(gate)) {
      blockers.push(`owner decision record surface packet missing safety gate: ${gate}`);
    }
  }

  for (const binding of config.requiredAppBindings) {
    if (!appContent.includes(binding)) {
      blockers.push(`operator app missing owner decision record surface binding: ${binding}`);
    }
  }

  if (!appContent.includes("Owner Decision Record Surface")) {
    blockers.push("operator app missing Owner Decision Record Surface card");
  }

  if (!packageContent.includes('"phase54:demo"')) {
    blockers.push("package.json missing phase54:demo script");
  }

  if (!packageContent.includes('"phase54:verify"')) {
    blockers.push("package.json missing phase54:verify script");
  }

  const boundaries = config.boundaries;
  if (!boundaries.localOnly) blockers.push("localOnly must remain true");
  if (!boundaries.privateAppOnly) blockers.push("privateAppOnly must remain true");
  if (!boundaries.reviewOnly) blockers.push("reviewOnly must remain true");
  if (!boundaries.recordSurfaceOnly) blockers.push("recordSurfaceOnly must remain true");
  if (!boundaries.decisionRecordDraftOnly) blockers.push("decisionRecordDraftOnly must remain true");
  if (!boundaries.planIntakeOnly) blockers.push("planIntakeOnly must remain true");
  if (!boundaries.readOnly) blockers.push("readOnly must remain true");
  if (!boundaries.frontendOnly) blockers.push("frontendOnly must remain true");
  if (!boundaries.noBackendLogic) blockers.push("noBackendLogic must remain true");
  if (!boundaries.noAuthentication) blockers.push("noAuthentication must remain true");
  if (boundaries.commandExecutionAllowed) blockers.push("commandExecutionAllowed must remain false");
  if (boundaries.runnerConnectivityAllowed) blockers.push("runnerConnectivityAllowed must remain false");
  if (boundaries.recordPersistenceAllowed) blockers.push("recordPersistenceAllowed must remain false");
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
    ownerDecisionRecordSurfaceStatus: blockers.length === 0 ? "ready" : "blocked",
    validationFailedCount: blockers.length,
    blockers,
    declaredFileCount: config.declaredPaths.length,
    recordActionCount: config.requiredRecordActionIds.length,
    recordFieldCount: config.recordFields.length,
    recordSignalCount: config.recordSignals.length,
    safetyGateCount: config.requiredSafetyGates.length,
    appBindingCount: config.requiredAppBindings.length,
    localOnly: boundaries.localOnly,
    privateAppOnly: boundaries.privateAppOnly,
    reviewOnly: boundaries.reviewOnly,
    recordSurfaceOnly: boundaries.recordSurfaceOnly,
    decisionRecordDraftOnly: boundaries.decisionRecordDraftOnly,
    planIntakeOnly: boundaries.planIntakeOnly,
    readOnly: boundaries.readOnly,
    frontendOnly: boundaries.frontendOnly,
    noBackendLogic: boundaries.noBackendLogic,
    noAuthentication: boundaries.noAuthentication,
    commandExecutionAllowed: boundaries.commandExecutionAllowed,
    runnerConnectivityAllowed: boundaries.runnerConnectivityAllowed,
    recordPersistenceAllowed: boundaries.recordPersistenceAllowed,
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
