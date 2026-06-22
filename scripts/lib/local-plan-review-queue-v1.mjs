import fs from "node:fs";
import path from "node:path";

export function createDefaultLocalPlanReviewQueueV1() {
  return {
    phase: 52,
    name: "local-plan-review-queue-v1",
    declaredPaths: [
      "docs/phases/PHASE_52_LOCAL_PLAN_REVIEW_QUEUE_V1.md",
      "apps/operator-console/src/plan-review-queue.ts",
      "scripts/lib/local-plan-review-queue-v1.mjs",
      "scripts/run-local-plan-review-queue-v1.mjs",
      "tests/integration/local-plan-review-queue-v1.test.ts",
    ],
    reviewFields: [
      "id",
      "title",
      "status",
      "priority",
      "workflow",
      "reviewGate",
      "ownerDecisionState",
      "allowedNextAction",
    ],
    queueSignals: [
      "composed plan id",
      "source request",
      "source file metadata",
      "workflow selection",
      "review status",
      "owner decision state",
      "evidence references",
      "allowed next action",
    ],
    requiredReviewItemIds: [
      "review-phase-build-plan",
      "review-file-context-plan",
      "review-validation-plan",
      "review-evidence-plan",
    ],
    requiredSafetyGates: [
      "Local plan review queue only",
      "Plans remain preview-only",
      "Owner decision required before task creation",
      "Owner decision required before execution",
      "Review queue cannot record final approval",
      "No command execution",
      "No runner connectivity",
      "No backend workflow service",
      "No authentication changes",
      "No source mutation",
      "No file mutation",
      "No auto-approval",
      "No auto-processing",
      "No auto-routing",
      "No auto-merge",
      "No self-approval",
    ],
    requiredAppBindings: [
      "planReviewQueuePacket.queueSummary.queueName",
      "planReviewQueuePacket.reviewItems.length",
      "planReviewQueuePacket.routing.suggestedQueue",
      "planReviewQueuePacket.boundaries.commandExecutionAllowed",
    ],
    boundaries: {
      localOnly: true,
      privateAppOnly: true,
      reviewQueueOnly: true,
      planIntakeOnly: true,
      readOnly: true,
      frontendOnly: true,
      noBackendLogic: true,
      noAuthentication: true,
      commandExecutionAllowed: false,
      runnerConnectivityAllowed: false,
      mutatesSource: false,
      fileMutationAllowed: false,
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
  const reportDir = path.join(rootDir, ".sera-plan-review-queue");
  fs.mkdirSync(reportDir, { recursive: true });
  const jsonPath = path.join(reportDir, "phase52-local-plan-review-queue-status.json");
  const markdownPath = path.join(reportDir, "phase52-local-plan-review-queue-status.md");

  fs.writeFileSync(jsonPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  fs.writeFileSync(
    markdownPath,
    [
      "# Phase 52 Local Plan Review Queue v1",
      "",
      `Status: ${result.planReviewQueueStatus}`,
      `Validation failed count: ${result.validationFailedCount}`,
      `Declared file count: ${result.declaredFileCount}`,
      `Review item count: ${result.reviewItemCount}`,
      `Review field count: ${result.reviewFieldCount}`,
      `Queue signal count: ${result.queueSignalCount}`,
      `Safety gate count: ${result.safetyGateCount}`,
      "",
      "## Boundaries",
      "",
      `- Local only: ${result.localOnly}`,
      `- Private app only: ${result.privateAppOnly}`,
      `- Review queue only: ${result.reviewQueueOnly}`,
      `- Plan intake only: ${result.planIntakeOnly}`,
      `- Command execution allowed: ${result.commandExecutionAllowed}`,
      `- Runner connectivity allowed: ${result.runnerConnectivityAllowed}`,
      `- File mutation allowed: ${result.fileMutationAllowed}`,
      `- Auto approval allowed: ${result.autoApprovalAllowed}`,
      `- Auto processing allowed: ${result.autoProcessingAllowed}`,
      `- Auto route allowed: ${result.autoRouteAllowed}`,
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

export function inspectLocalPlanReviewQueueV1(config = createDefaultLocalPlanReviewQueueV1(), options = {}) {
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

  const queueContent = readIfExists(rootDir, "apps/operator-console/src/plan-review-queue.ts") || "";
  const appContent = readIfExists(rootDir, "apps/operator-console/src/App.tsx") || "";
  const packageContent = readIfExists(rootDir, "package.json") || "";

  if (!queueContent.includes("export const planReviewQueuePacket")) {
    blockers.push("plan review queue file must export planReviewQueuePacket");
  }

  if (!queueContent.includes("Phase 52 · Local Plan Review Queue v1")) {
    blockers.push("plan review queue packet must identify Phase 52");
  }

  for (const field of config.reviewFields) {
    if (!queueContent.includes(field)) {
      blockers.push(`plan review queue packet missing review field: ${field}`);
    }
  }

  for (const signal of config.queueSignals) {
    if (!queueContent.includes(signal)) {
      blockers.push(`plan review queue packet missing queue signal: ${signal}`);
    }
  }

  for (const itemId of config.requiredReviewItemIds) {
    if (!queueContent.includes(itemId)) {
      blockers.push(`plan review queue missing review item: ${itemId}`);
    }
  }

  for (const gate of config.requiredSafetyGates) {
    if (!queueContent.includes(gate)) {
      blockers.push(`plan review queue packet missing safety gate: ${gate}`);
    }
  }

  for (const binding of config.requiredAppBindings) {
    if (!appContent.includes(binding)) {
      blockers.push(`operator app missing plan review queue binding: ${binding}`);
    }
  }

  if (!appContent.includes("Local Plan Review Queue")) {
    blockers.push("operator app missing Local Plan Review Queue card");
  }

  if (!packageContent.includes('"phase52:demo"')) {
    blockers.push("package.json missing phase52:demo script");
  }

  if (!packageContent.includes('"phase52:verify"')) {
    blockers.push("package.json missing phase52:verify script");
  }

  const boundaries = config.boundaries;
  if (!boundaries.localOnly) blockers.push("localOnly must remain true");
  if (!boundaries.privateAppOnly) blockers.push("privateAppOnly must remain true");
  if (!boundaries.reviewQueueOnly) blockers.push("reviewQueueOnly must remain true");
  if (!boundaries.planIntakeOnly) blockers.push("planIntakeOnly must remain true");
  if (!boundaries.readOnly) blockers.push("readOnly must remain true");
  if (!boundaries.frontendOnly) blockers.push("frontendOnly must remain true");
  if (!boundaries.noBackendLogic) blockers.push("noBackendLogic must remain true");
  if (!boundaries.noAuthentication) blockers.push("noAuthentication must remain true");
  if (boundaries.commandExecutionAllowed) blockers.push("commandExecutionAllowed must remain false");
  if (boundaries.runnerConnectivityAllowed) blockers.push("runnerConnectivityAllowed must remain false");
  if (boundaries.mutatesSource) blockers.push("mutatesSource must remain false");
  if (boundaries.fileMutationAllowed) blockers.push("fileMutationAllowed must remain false");
  if (boundaries.autoApprovalAllowed) blockers.push("autoApprovalAllowed must remain false");
  if (boundaries.autoProcessingAllowed) blockers.push("autoProcessingAllowed must remain false");
  if (boundaries.autoRouteAllowed) blockers.push("autoRouteAllowed must remain false");
  if (boundaries.autoMergeAllowed) blockers.push("autoMergeAllowed must remain false");
  if (boundaries.selfApprovalAllowed) blockers.push("selfApprovalAllowed must remain false");

  const result = {
    ok: blockers.length === 0,
    status: blockers.length === 0 ? "passed" : "failed",
    planReviewQueueStatus: blockers.length === 0 ? "ready" : "blocked",
    validationFailedCount: blockers.length,
    blockers,
    declaredFileCount: config.declaredPaths.length,
    reviewItemCount: config.requiredReviewItemIds.length,
    reviewFieldCount: config.reviewFields.length,
    queueSignalCount: config.queueSignals.length,
    safetyGateCount: config.requiredSafetyGates.length,
    appBindingCount: config.requiredAppBindings.length,
    localOnly: boundaries.localOnly,
    privateAppOnly: boundaries.privateAppOnly,
    reviewQueueOnly: boundaries.reviewQueueOnly,
    planIntakeOnly: boundaries.planIntakeOnly,
    readOnly: boundaries.readOnly,
    frontendOnly: boundaries.frontendOnly,
    noBackendLogic: boundaries.noBackendLogic,
    noAuthentication: boundaries.noAuthentication,
    commandExecutionAllowed: boundaries.commandExecutionAllowed,
    runnerConnectivityAllowed: boundaries.runnerConnectivityAllowed,
    mutatesSource: boundaries.mutatesSource,
    fileMutationAllowed: boundaries.fileMutationAllowed,
    autoApprovalAllowed: boundaries.autoApprovalAllowed,
    autoProcessingAllowed: boundaries.autoProcessingAllowed,
    autoRouteAllowed: boundaries.autoRouteAllowed,
    autoMergeAllowed: boundaries.autoMergeAllowed,
    selfApprovalAllowed: boundaries.selfApprovalAllowed,
  };

  if (writeArtifacts) writeReports(rootDir, result);
  return result;
}
