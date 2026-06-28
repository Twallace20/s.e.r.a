import fs from "node:fs";
import path from "node:path";

const declaredPaths = [
  "docs/phases/PHASE_104_WORKER_ACTIVATION_GATE_V1.md",
  "scripts/lib/worker-activation-gate-v1.mjs",
  "scripts/run-worker-activation-gate-v1.mjs",
  "tests/integration/worker-activation-gate-v1.test.ts",
  "apps/operator-console/src/worker-activation-gate.ts",
];

const workerActivationGateRequirements = [
  { id: "phase-103-ready", label: "Phase 103 Worker Activation Review Queue ready", state: "required" },
  { id: "phase-103-lineage", label: "Phase 103 lineage required", state: "required" },
  { id: "owner-approval-required", label: "Tyler Wallace activation gate approval required", state: "required" },
  { id: "operator-authority-preserved", label: "Driana Smith-Wallace operator authority preserved", state: "required" },
  { id: "activation-gate-review-only", label: "Worker Activation Gate is review evidence only", state: "required" },
  { id: "gate-catalog", label: "Activation gate catalog required", state: "required" },
  { id: "eligibility-reviews", label: "Eligibility review required for every queued worker", state: "required" },
  { id: "gate-decision-drafts", label: "Activation gate decision drafts required for every worker", state: "required" },
  { id: "readiness-gate-checklists", label: "Readiness gate checklist required for every worker", state: "required" },
  { id: "activation-gate-boundaries", label: "Activation gate boundaries required for every worker", state: "required" },
  { id: "owner-review-manifest", label: "Owner review manifest required", state: "required" },
  { id: "queue-evidence-references", label: "Phase 103 queue evidence references required", state: "required" },
  { id: "eligibility-scoring", label: "Eligibility status is review-only and non-activating", state: "required" },
  { id: "safe-artifact-paths", label: "Activation gate artifact paths must remain safe relative paths", state: "required" },
  { id: "no-worker-activation", label: "Worker activation is blocked", state: "required" },
  { id: "no-worker-execution", label: "Worker execution is blocked", state: "required" },
  { id: "no-worker-spawning", label: "Worker spawning is blocked", state: "required" },
  { id: "no-autonomous-delegation", label: "Autonomous delegation is blocked", state: "required" },
  { id: "no-away-mode", label: "Away-mode execution is blocked", state: "required" },
  { id: "no-fleet-execution", label: "Fleet execution is blocked", state: "required" },
  { id: "no-scheduler-mutation", label: "Scheduler and workflow mutation are blocked", state: "required" },
  { id: "no-iphone-mutation", label: "iPhone automation mutation is blocked", state: "required" },
  { id: "no-apply", label: "Apply execution is blocked", state: "required" },
  { id: "no-patch", label: "Patch execution is blocked", state: "required" },
  { id: "source-mutation-blocked", label: "Project repo source mutation blocked", state: "required" },
  { id: "branch-creation-blocked", label: "Real branch creation blocked", state: "required" },
  { id: "merge-blocked", label: "Real merge execution blocked", state: "required" },
  { id: "git-push-blocked", label: "Git push blocked", state: "required" },
  { id: "tag-blocked", label: "Tag creation blocked", state: "required" },
  { id: "shell-blocked", label: "Shell and arbitrary command execution blocked", state: "required" },
  { id: "self-governance-blocked", label: "Self-approval, self-merge, self-deploy blocked", state: "required" },
  { id: "production-blocked", label: "Production deployment blocked", state: "required" },
  { id: "multi-language-doctrine-preserved", label: "Multi-language production doctrine preserved", state: "required" },
  { id: "fail-closed", label: "Worker Activation Gate validation must fail closed", state: "required" },
  { id: "activation-gate-count", label: "Twelve activation gate items required", state: "required" },
  { id: "eligibility-review-count", label: "Twelve eligibility reviews required", state: "required" },
  { id: "gate-decision-count", label: "Twelve gate decision drafts required", state: "required" },
  { id: "readiness-gate-count", label: "Twelve readiness gate checklists required", state: "required" },
  { id: "manual-gate-review-only", label: "Gate items remain pending manual owner review", state: "required" },
  { id: "no-auto-approval", label: "Automatic gate approval is blocked", state: "required" },
  { id: "no-secret-activation", label: "No hidden activation permissions allowed", state: "required" },
  { id: "human-operator-visible", label: "Activation gate status must be visible to the operator console", state: "required" },
  { id: "bounded-gate-language", label: "Every gate item requires bounded activation language", state: "required" },
  { id: "phase-105-handoff", label: "Phase 105 handoff notes required", state: "required" },
  { id: "review-only-gate-level", label: "Every activation gate item remains review-only", state: "required" },
  { id: "activation-token-blocked", label: "No activation token may be issued in Phase 104", state: "required" },
];

const workerActivationGateFields = [
  "workerActivationGateId", "status", "owner", "operatorAuthorityOwner", "sourcePhase",
  "sourceWorkerActivationReviewQueueId", "phase103WorkerActivationReviewQueueReady",
  "activationGateItemCount", "eligibilityReviewCount", "gateDecisionDraftCount", "readinessGateChecklistCount",
  "roadmapTrackCount", "multiLanguageProductionTargetCount", "safetyGateCount",
  "workerActivationGateAllowed", "workerActivationReviewQueueReadAllowed", "activationGateManifestAllowed",
  "ownerReviewActivationGatePacketAllowed", "activationEligibilityReviewAllowed", "activationGateDecisionDraftAllowed",
  "workerActivationAllowed", "workerExecutionAllowed", "workerSpawningAllowed", "autonomousDelegationAllowed",
  "schedulerWorkflowMutationAllowed", "iPhoneAutomationMutationAllowed", "awayModeExecutionAllowed", "fleetExecutionAllowed",
  "applyExecutionAllowed", "patchExecutionAllowed", "projectRepoSourceMutationAllowed", "realProjectBranchCreationAllowed",
  "realProjectMergeExecutionAllowed", "gitPushAllowed", "tagCreationAllowed", "arbitraryCommandAllowed", "shellExecutionAllowed",
  "selfApprovalAllowed", "selfMergeAllowed", "selfDeployAllowed", "productionDeploymentAllowed",
  "approvalRecord", "activationGateItems", "eligibilityReviews", "activationGateDecisionDrafts",
  "readinessGateChecklists", "activationGateBoundaryCatalog", "queueEvidenceReferenceCatalog", "activationReviewQueueReferences",
  "activationGateManifest", "ownerReviewManifest", "futurePhaseHandoff", "requirements", "declaredPaths", "roadmapTracks",
  "multiLanguageProductionTargets", "checks", "blockers", "validationFailedCount", "activationGatePacketProduced",
  "activationGateManifestProduced", "eligibilityReviewManifestProduced", "activationGateDecisionDraftsProduced",
  "readinessGateChecklistManifestProduced", "ownerReviewManifestProduced", "readyForOwnerReview", "projectRepoSourceMutated",
  "workerActivated", "workerExecuted", "workerSpawned", "autonomousDelegationExecuted", "schedulerWorkflowMutated",
  "iPhoneAutomationMutated", "awayModeExecuted", "fleetExecuted", "applyExecuted", "patchExecuted", "realProjectBranchCreated",
  "realProjectMergePerformed", "gitPushPerformed", "tagCreated", "shellExecuted", "productionDeployed", "activationTokenIssued",
  "generatedAt", "packetPath", "activationGateManifestPath", "activationGateItemsPath", "eligibilityReviewManifestPath",
  "activationGateDecisionDraftsPath", "readinessGateChecklistManifestPath", "ownerReviewManifestPath",
  "activationGateBoundaryManifestPath", "queueEvidenceReferenceManifestPath", "activationReviewQueueReferenceManifestPath",
  "activationGateSummaryPath", "gateLevel", "activationGateStatus", "activationEligibilityStatus", "activationTokenManifestPath",
];

const sourceActivationQueueItems = [
  { workerId: "worker.phase-planner", queueItemId: "activation-review.worker.phase-planner", lane: "phase-development", cardId: "card.worker.phase-planner" },
  { workerId: "worker.spec-writer", queueItemId: "activation-review.worker.spec-writer", lane: "phase-development", cardId: "card.worker.spec-writer" },
  { workerId: "worker.overlay-packager", queueItemId: "activation-review.worker.overlay-packager", lane: "phase-development", cardId: "card.worker.overlay-packager" },
  { workerId: "worker.validator", queueItemId: "activation-review.worker.validator", lane: "validation-and-qa", cardId: "card.worker.validator" },
  { workerId: "worker.evidence", queueItemId: "activation-review.worker.evidence", lane: "evidence-and-audit", cardId: "card.worker.evidence" },
  { workerId: "worker.knowledge", queueItemId: "activation-review.worker.knowledge", lane: "knowledge-and-ingest", cardId: "card.worker.knowledge" },
  { workerId: "worker.console", queueItemId: "activation-review.worker.console", lane: "operator-console", cardId: "card.worker.console" },
  { workerId: "worker.local-ops", queueItemId: "activation-review.worker.local-ops", lane: "local-worker-ops", cardId: "card.worker.local-ops" },
  { workerId: "worker.release", queueItemId: "activation-review.worker.release", lane: "release-readiness", cardId: "card.worker.release" },
  { workerId: "worker.intake", queueItemId: "activation-review.worker.intake", lane: "workflow-intake", cardId: "card.worker.intake" },
  { workerId: "worker.client-surface", queueItemId: "activation-review.worker.client-surface", lane: "client-surface-prep", cardId: "card.worker.client-surface" },
  { workerId: "worker.safety", queueItemId: "activation-review.worker.safety", lane: "safety-and-governance", cardId: "card.worker.safety" },
];

const roadmapTracks = [
  "worker-fleet-foundation", "universal-ingest", "knowledge-pack-factory", "universal-production-engine", "rights-provenance",
  "creator-media", "domain-studios", "client-public-surfaces", "mobile-private-jarvis", "advanced-technical-domains",
  "fleet-agency", "product-platform", "revenue-acceleration",
];

const multiLanguageProductionTargets = [
  "typescript", "javascript", "node", "python", "markdown", "json", "yaml", "sql", "html", "css", "powershell", "bash", "react", "sqlite", "api", "cli", "mobile", "local-desktop",
];

const defaultBoundaries = {
  workerActivationAllowed: false,
  workerExecutionAllowed: false,
  workerSpawningAllowed: false,
  autonomousDelegationAllowed: false,
  schedulerWorkflowMutationAllowed: false,
  iPhoneAutomationMutationAllowed: false,
  awayModeExecutionAllowed: false,
  fleetExecutionAllowed: false,
  applyExecutionAllowed: false,
  patchExecutionAllowed: false,
  projectRepoSourceMutationAllowed: false,
  realProjectBranchCreationAllowed: false,
  realProjectMergeExecutionAllowed: false,
  gitPushAllowed: false,
  tagCreationAllowed: false,
  arbitraryCommandAllowed: false,
  shellExecutionAllowed: false,
  selfApprovalAllowed: false,
  selfMergeAllowed: false,
  selfDeployAllowed: false,
  productionDeploymentAllowed: false,
};

const blockedBoundaryNames = Object.keys(defaultBoundaries);

function isSafeRelativePath(value) {
  return typeof value === "string" && value.length > 0 && !path.isAbsolute(value) && !value.includes("..") && !value.includes("\\");
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function buildActivationGateItems() {
  return sourceActivationQueueItems.map((item) => ({
    gateItemId: `activation-gate.${item.workerId}`,
    sourceQueueItemId: item.queueItemId,
    workerId: item.workerId,
    cardId: item.cardId,
    lane: item.lane,
    gateStatus: "pending-owner-gate-review",
    gateLevel: "review-only",
    activationEligibilityStatus: "not-eligible-for-activation-yet",
    ownerGateReviewRequired: true,
    activationBoundary: "manual-owner-approval-only",
    autoApprovalAllowed: false,
    hiddenActivationPermissions: false,
    activationTokenIssued: false,
    activationAllowed: false,
    executionAllowed: false,
    queueEvidenceReferences: [`phase103/${item.queueItemId}/activation-review-queue-packet.json`],
    readinessGateChecklist: ["phase-103-evidence-reviewed", "owner-gate-review-required", "activation-token-blocked"],
    eligibilityReview: {
      workerId: item.workerId,
      eligibleForActivation: false,
      recommendation: "hold-for-owner-gate-review",
      reason: "Phase 104 records activation eligibility evidence but does not activate workers.",
    },
    gateDecisionDraft: {
      recommendedDecision: "hold-for-owner-gate-review",
      activationApproved: false,
      activationTokenIssued: false,
      ownerApprovalRequired: true,
    },
  }));
}

export function createDefaultWorkerActivationGateV1(overrides = {}) {
  const activationGateItems = buildActivationGateItems();
  const eligibilityReviews = activationGateItems.map((item) => cloneJson(item.eligibilityReview));
  const activationGateDecisionDrafts = activationGateItems.map((item) => ({ workerId: item.workerId, ...cloneJson(item.gateDecisionDraft) }));
  const readinessGateChecklists = activationGateItems.map((item) => ({ workerId: item.workerId, checklist: [...item.readinessGateChecklist] }));
  const activationGateBoundaryCatalog = activationGateItems.map((item) => ({ workerId: item.workerId, activationBoundary: item.activationBoundary, activationAllowed: false, executionAllowed: false, activationTokenIssued: false }));
  const queueEvidenceReferenceCatalog = activationGateItems.map((item) => ({ workerId: item.workerId, queueEvidenceReferences: [...item.queueEvidenceReferences] }));
  const activationReviewQueueReferences = activationGateItems.map((item) => ({ workerId: item.workerId, sourceQueueItemId: item.sourceQueueItemId }));
  const config = {
    workerActivationGateId: "phase104-demo-worker-activation-gate",
    status: "worker-activation-gate-pending-validation",
    owner: "Tyler Wallace",
    operatorAuthorityOwner: "Driana Smith-Wallace",
    sourcePhase: "103",
    sourceWorkerActivationReviewQueueId: "phase103-demo-worker-activation-review-queue",
    phase103WorkerActivationReviewQueueReady: true,
    activationGateItemCount: activationGateItems.length,
    eligibilityReviewCount: eligibilityReviews.length,
    gateDecisionDraftCount: activationGateDecisionDrafts.length,
    readinessGateChecklistCount: readinessGateChecklists.length,
    roadmapTrackCount: roadmapTracks.length,
    multiLanguageProductionTargetCount: multiLanguageProductionTargets.length,
    safetyGateCount: 2040,
    approvalRecord: { approved: true, approvedBy: "Tyler Wallace", selfApproved: false, approvalScope: "worker-activation-gate-review-only" },
    boundaries: { ...defaultBoundaries },
    activationGateItems,
    eligibilityReviews,
    activationGateDecisionDrafts,
    readinessGateChecklists,
    activationGateBoundaryCatalog,
    queueEvidenceReferenceCatalog,
    activationReviewQueueReferences,
    futurePhaseHandoff: { nextPhase: "105", phaseName: "Worker Activation Decision Record v1", activationStillBlocked: true },
    requirements: cloneJson(workerActivationGateRequirements),
    declaredPaths: [...declaredPaths],
    roadmapTracks: [...roadmapTracks],
    multiLanguageProductionTargets: [...multiLanguageProductionTargets],
    expectedActivationGateItemCount: 12,
    expectedEligibilityReviewCount: 12,
    expectedGateDecisionDraftCount: 12,
    expectedReadinessGateChecklistCount: 12,
    projectRepoSourceMutated: false,
    workerActivated: false,
    workerExecuted: false,
    workerSpawned: false,
    autonomousDelegationExecuted: false,
    schedulerWorkflowMutated: false,
    iPhoneAutomationMutated: false,
    awayModeExecuted: false,
    fleetExecuted: false,
    applyExecuted: false,
    patchExecuted: false,
    realProjectBranchCreated: false,
    realProjectMergePerformed: false,
    gitPushPerformed: false,
    tagCreated: false,
    shellExecuted: false,
    productionDeployed: false,
    activationTokenIssued: false,
  };
  if (overrides.boundaries) config.boundaries = { ...config.boundaries, ...overrides.boundaries };
  return { ...config, ...overrides, boundaries: overrides.boundaries ? config.boundaries : config.boundaries };
}

export function inspectWorkerActivationGateV1(config = createDefaultWorkerActivationGateV1()) {
  const checks = [];
  const blockers = [];
  function addCheck(id, label, passed, blocker) {
    checks.push({ id, label, passed });
    if (!passed) blockers.push(blocker);
  }

  addCheck("phase103-ready", "Phase 103 ready", config.phase103WorkerActivationReviewQueueReady === true, "Phase 103 Worker Activation Review Queue must be ready before Phase 104.");
  addCheck("phase103-lineage", "Phase 103 lineage", config.sourceWorkerActivationReviewQueueId === "phase103-demo-worker-activation-review-queue", "Phase 104 must link to the Phase 103 Worker Activation Review Queue.");
  addCheck("approval-record", "Tyler approval", config.approvalRecord?.approved === true && config.approvalRecord?.approvedBy === "Tyler Wallace", "Tyler Wallace approval record is required for Phase 104 Worker Activation Gate.");
  addCheck("self-approval-blocked", "Self approval blocked", config.approvalRecord?.selfApproved === false, "Self-approval is blocked for Phase 104 Worker Activation Gate.");
  addCheck("declared-paths", "Declared paths are safe", Array.isArray(config.declaredPaths) && config.declaredPaths.every(isSafeRelativePath), "Every declared path must be a safe relative path.");
  addCheck("declared-count", "Declared file count", Array.isArray(config.declaredPaths) && config.declaredPaths.length === 5, "Phase 104 must declare exactly five repo files.");
  addCheck("requirements", "Requirement count", Array.isArray(config.requirements) && config.requirements.length === 46, "Phase 104 requires forty-six requirements.");
  addCheck("fields", "Field count", workerActivationGateFields.length === 100, "Phase 104 requires one hundred fields.");
  addCheck("activation-gate-count", "Activation gate item count", Array.isArray(config.activationGateItems) && config.activationGateItems.length === config.expectedActivationGateItemCount, "Phase 104 requires twelve activation gate items.");
  addCheck("eligibility-review-count", "Eligibility review count", Array.isArray(config.eligibilityReviews) && config.eligibilityReviews.length === config.expectedEligibilityReviewCount, "Phase 104 requires twelve eligibility reviews.");
  addCheck("gate-decision-count", "Gate decision draft count", Array.isArray(config.activationGateDecisionDrafts) && config.activationGateDecisionDrafts.length === config.expectedGateDecisionDraftCount, "Phase 104 requires twelve activation gate decision drafts.");
  addCheck("readiness-gate-count", "Readiness gate checklist count", Array.isArray(config.readinessGateChecklists) && config.readinessGateChecklists.length === config.expectedReadinessGateChecklistCount, "Phase 104 requires twelve readiness gate checklists.");
  addCheck("roadmap-tracks", "Roadmap tracks", Array.isArray(config.roadmapTracks) && config.roadmapTracks.length === 13, "Thirteen roadmap tracks required.");
  addCheck("multi-language", "Multi-language doctrine", Array.isArray(config.multiLanguageProductionTargets) && config.multiLanguageProductionTargets.length === 18, "Eighteen multi-language production targets required.");

  const gateItems = Array.isArray(config.activationGateItems) ? config.activationGateItems : [];
  for (const item of gateItems) {
    addCheck(`gate-id-${item?.workerId ?? "missing"}`, "Safe gate item id", typeof item?.gateItemId === "string" && item.gateItemId.startsWith("activation-gate.worker."), "Every activation gate item needs a safe activation-gate.worker id.");
    addCheck(`worker-id-${item?.workerId ?? "missing"}`, "Safe worker id", typeof item?.workerId === "string" && item.workerId.startsWith("worker."), "Every activation gate item needs a safe worker id.");
    addCheck(`queue-ref-${item?.workerId ?? "missing"}`, "Phase 103 queue reference", typeof item?.sourceQueueItemId === "string" && item.sourceQueueItemId.startsWith("activation-review.worker."), "Every activation gate item needs a Phase 103 activation-review.worker reference.");
    addCheck(`gate-status-${item?.workerId ?? "missing"}`, "Pending gate review", item?.gateStatus === "pending-owner-gate-review", "Every activation gate item must remain pending-owner-gate-review.");
    addCheck(`eligibility-${item?.workerId ?? "missing"}`, "Not eligible yet", item?.activationEligibilityStatus === "not-eligible-for-activation-yet", "Every activation gate item must remain not-eligible-for-activation-yet.");
    addCheck(`gate-level-${item?.workerId ?? "missing"}`, "Review-only gate", item?.gateLevel === "review-only", "Every activation gate item must remain review-only.");
    addCheck(`owner-review-${item?.workerId ?? "missing"}`, "Owner gate review", item?.ownerGateReviewRequired === true, "Every activation gate item requires owner gate review.");
    addCheck(`manual-boundary-${item?.workerId ?? "missing"}`, "Manual boundary", item?.activationBoundary === "manual-owner-approval-only", "Every activation gate item must preserve manual-owner-approval-only boundary.");
    addCheck(`auto-approval-${item?.workerId ?? "missing"}`, "No auto approval", item?.autoApprovalAllowed === false, "Automatic worker activation gate approval is blocked.");
    addCheck(`hidden-${item?.workerId ?? "missing"}`, "No hidden permissions", item?.hiddenActivationPermissions === false, "No hidden worker activation permissions allowed.");
    addCheck(`token-${item?.workerId ?? "missing"}`, "No activation token", item?.activationTokenIssued === false, "No activation token may be issued in Phase 104.");
    addCheck(`activation-blocked-${item?.workerId ?? "missing"}`, "Activation blocked", item?.activationAllowed === false, "Worker activation must remain blocked in Phase 104.");
    addCheck(`execution-blocked-${item?.workerId ?? "missing"}`, "Execution blocked", item?.executionAllowed === false, "Worker execution must remain blocked in Phase 104.");
    addCheck(`evidence-${item?.workerId ?? "missing"}`, "Queue evidence", Array.isArray(item?.queueEvidenceReferences) && item.queueEvidenceReferences.length > 0, "Every activation gate item requires Phase 103 queue evidence references.");
    addCheck(`readiness-${item?.workerId ?? "missing"}`, "Readiness gate checklist", Array.isArray(item?.readinessGateChecklist) && item.readinessGateChecklist.length > 0, "Every activation gate item requires a readiness gate checklist.");
    addCheck(`decision-${item?.workerId ?? "missing"}`, "Gate decision draft", item?.gateDecisionDraft?.activationApproved === false && item?.gateDecisionDraft?.recommendedDecision === "hold-for-owner-gate-review" && item?.gateDecisionDraft?.activationTokenIssued === false, "Every activation gate item requires a hold-for-owner-gate-review decision draft with no activation token.");
  }

  for (const name of blockedBoundaryNames) {
    addCheck(`boundary-${name}`, `${name} blocked`, config.boundaries?.[name] === false, `${name} must remain false`);
  }
  for (const [name, value] of Object.entries({
    projectRepoSourceMutated: config.projectRepoSourceMutated,
    workerActivated: config.workerActivated,
    workerExecuted: config.workerExecuted,
    workerSpawned: config.workerSpawned,
    autonomousDelegationExecuted: config.autonomousDelegationExecuted,
    schedulerWorkflowMutated: config.schedulerWorkflowMutated,
    iPhoneAutomationMutated: config.iPhoneAutomationMutated,
    awayModeExecuted: config.awayModeExecuted,
    fleetExecuted: config.fleetExecuted,
    applyExecuted: config.applyExecuted,
    patchExecuted: config.patchExecuted,
    realProjectBranchCreated: config.realProjectBranchCreated,
    realProjectMergePerformed: config.realProjectMergePerformed,
    gitPushPerformed: config.gitPushPerformed,
    tagCreated: config.tagCreated,
    shellExecuted: config.shellExecuted,
    productionDeployed: config.productionDeployed,
    activationTokenIssued: config.activationTokenIssued,
  })) {
    addCheck(`execution-${name}`, `${name} blocked`, value === false, `${name} must remain false`);
  }

  const ok = blockers.length === 0;
  return {
    ok,
    checks,
    blockers,
    validationFailedCount: blockers.length,
    workerActivationGateId: config.workerActivationGateId,
    workerActivationGateStatus: ok ? "worker-activation-gate-ready" : "worker-activation-gate-validation-failed",
    declaredFileCount: declaredPaths.length,
    workerActivationGateRequirementCount: workerActivationGateRequirements.length,
    workerActivationGateFieldCount: workerActivationGateFields.length,
    activationGateItemCount: Array.isArray(config.activationGateItems) ? config.activationGateItems.length : 0,
    eligibilityReviewCount: Array.isArray(config.eligibilityReviews) ? config.eligibilityReviews.length : 0,
    gateDecisionDraftCount: Array.isArray(config.activationGateDecisionDrafts) ? config.activationGateDecisionDrafts.length : 0,
    readinessGateChecklistCount: Array.isArray(config.readinessGateChecklists) ? config.readinessGateChecklists.length : 0,
    roadmapTrackCount: Array.isArray(config.roadmapTracks) ? config.roadmapTracks.length : 0,
    multiLanguageProductionTargetCount: Array.isArray(config.multiLanguageProductionTargets) ? config.multiLanguageProductionTargets.length : 0,
    safetyGateCount: config.safetyGateCount,
    workerActivationGateAllowed: true,
    workerActivationReviewQueueReadAllowed: true,
    activationGateManifestAllowed: true,
    ownerReviewActivationGatePacketAllowed: true,
    activationEligibilityReviewAllowed: true,
    activationGateDecisionDraftAllowed: true,
    ...config.boundaries,
    sourceWorkerActivationReviewQueueId: config.sourceWorkerActivationReviewQueueId,
    phase103WorkerActivationReviewQueueReady: config.phase103WorkerActivationReviewQueueReady,
    projectRepoSourceMutated: config.projectRepoSourceMutated,
    workerActivated: config.workerActivated,
    workerExecuted: config.workerExecuted,
    workerSpawned: config.workerSpawned,
    autonomousDelegationExecuted: config.autonomousDelegationExecuted,
    schedulerWorkflowMutated: config.schedulerWorkflowMutated,
    iPhoneAutomationMutated: config.iPhoneAutomationMutated,
    awayModeExecuted: config.awayModeExecuted,
    fleetExecuted: config.fleetExecuted,
    applyExecuted: config.applyExecuted,
    patchExecuted: config.patchExecuted,
    realProjectBranchCreated: config.realProjectBranchCreated,
    realProjectMergePerformed: config.realProjectMergePerformed,
    activationTokenIssued: config.activationTokenIssued,
    multiLanguageProductionDoctrineIncluded: Array.isArray(config.multiLanguageProductionTargets) && config.multiLanguageProductionTargets.length === 18,
  };
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n", "utf8");
}

export function runWorkerActivationGateV1(config = createDefaultWorkerActivationGateV1(), options = {}) {
  const inspection = inspectWorkerActivationGateV1(config);
  const artifactRoot = options.artifactRoot || path.join(process.cwd(), ".sera-worker-activation-gate");
  const runRoot = path.join(artifactRoot, "activation-gate", config.workerActivationGateId || "phase104-demo-worker-activation-gate");
  const generatedAt = new Date().toISOString();
  const activationGateManifest = {
    id: config.workerActivationGateId,
    status: inspection.workerActivationGateStatus,
    generatedAt,
    sourceWorkerActivationReviewQueueId: config.sourceWorkerActivationReviewQueueId,
    activationGateItemCount: inspection.activationGateItemCount,
    eligibilityReviewCount: inspection.eligibilityReviewCount,
    gateDecisionDraftCount: inspection.gateDecisionDraftCount,
    readinessGateChecklistCount: inspection.readinessGateChecklistCount,
    activationRemainsBlocked: config.workerActivated === false && config.boundaries?.workerActivationAllowed === false,
    activationTokenIssued: false,
    blockedPowersPreserved: blockedBoundaryNames,
  };
  const ownerReviewManifest = {
    owner: config.owner,
    operatorAuthorityOwner: config.operatorAuthorityOwner,
    readyForOwnerReview: inspection.ok,
    selfApprovalBlocked: config.approvalRecord?.selfApproved === false,
    automaticActivationBlocked: true,
    futureActivationRequiresOwnerApproval: true,
    activationTokenBlocked: true,
  };
  const activationGateBoundaryManifest = { activationGateBoundaryCatalog: config.activationGateBoundaryCatalog };
  const queueEvidenceReferenceManifest = { queueEvidenceReferenceCatalog: config.queueEvidenceReferenceCatalog };
  const activationReviewQueueReferenceManifest = { activationReviewQueueReferences: config.activationReviewQueueReferences };
  const readinessGateChecklistManifest = { readinessGateChecklists: config.readinessGateChecklists };
  const eligibilityReviewManifest = { eligibilityReviews: config.eligibilityReviews };
  const activationTokenManifest = { activationTokenIssued: false, activationTokenAllowed: false, phase: "104" };
  const activationGateSummary = {
    status: inspection.workerActivationGateStatus,
    readyForOwnerReview: inspection.ok,
    workerActivationAllowed: false,
    workerExecutionAllowed: false,
    activationTokenIssued: false,
  };
  const packet = {
    ...config,
    status: inspection.workerActivationGateStatus,
    generatedAt,
    activationGateManifest,
    ownerReviewManifest,
    activationGateBoundaryManifest,
    queueEvidenceReferenceManifest,
    activationReviewQueueReferenceManifest,
    readinessGateChecklistManifest,
    eligibilityReviewManifest,
    activationTokenManifest,
    activationGateSummary,
    checks: inspection.checks,
    blockers: inspection.blockers,
  };
  const packetPath = path.join(runRoot, "worker-activation-gate-packet.json");
  const activationGateManifestPath = path.join(runRoot, "activation-gate-manifest.json");
  const activationGateItemsPath = path.join(runRoot, "activation-gate-items.json");
  const eligibilityReviewManifestPath = path.join(runRoot, "eligibility-review-manifest.json");
  const activationGateDecisionDraftsPath = path.join(runRoot, "activation-gate-decision-drafts.json");
  const readinessGateChecklistManifestPath = path.join(runRoot, "readiness-gate-checklist-manifest.json");
  const ownerReviewManifestPath = path.join(runRoot, "owner-review-manifest.json");
  const activationGateBoundaryManifestPath = path.join(runRoot, "activation-gate-boundary-manifest.json");
  const queueEvidenceReferenceManifestPath = path.join(runRoot, "queue-evidence-reference-manifest.json");
  const activationReviewQueueReferenceManifestPath = path.join(runRoot, "activation-review-queue-reference-manifest.json");
  const activationGateSummaryPath = path.join(runRoot, "activation-gate-summary.json");
  const activationTokenManifestPath = path.join(runRoot, "activation-token-manifest.json");
  writeJson(packetPath, packet);
  writeJson(activationGateManifestPath, activationGateManifest);
  writeJson(activationGateItemsPath, config.activationGateItems);
  writeJson(eligibilityReviewManifestPath, eligibilityReviewManifest);
  writeJson(activationGateDecisionDraftsPath, config.activationGateDecisionDrafts);
  writeJson(readinessGateChecklistManifestPath, readinessGateChecklistManifest);
  writeJson(ownerReviewManifestPath, ownerReviewManifest);
  writeJson(activationGateBoundaryManifestPath, activationGateBoundaryManifest);
  writeJson(queueEvidenceReferenceManifestPath, queueEvidenceReferenceManifest);
  writeJson(activationReviewQueueReferenceManifestPath, activationReviewQueueReferenceManifest);
  writeJson(activationGateSummaryPath, activationGateSummary);
  writeJson(activationTokenManifestPath, activationTokenManifest);

  return {
    ...inspection,
    ok: inspection.ok,
    activationGatePacketProduced: true,
    activationGateManifestProduced: true,
    eligibilityReviewManifestProduced: true,
    activationGateDecisionDraftsProduced: true,
    readinessGateChecklistManifestProduced: true,
    ownerReviewManifestProduced: true,
    readyForOwnerReview: ownerReviewManifest.readyForOwnerReview,
    packetPath,
    activationGateManifestPath,
    activationGateItemsPath,
    eligibilityReviewManifestPath,
    activationGateDecisionDraftsPath,
    readinessGateChecklistManifestPath,
    ownerReviewManifestPath,
    activationGateBoundaryManifestPath,
    queueEvidenceReferenceManifestPath,
    activationReviewQueueReferenceManifestPath,
    activationGateSummaryPath,
    activationTokenManifestPath,
  };
}

export const workerActivationGateV1 = {
  declaredPaths,
  workerActivationGateRequirements,
  workerActivationGateFields,
  sourceActivationQueueItems,
  roadmapTracks,
  multiLanguageProductionTargets,
  createDefaultWorkerActivationGateV1,
  inspectWorkerActivationGateV1,
  runWorkerActivationGateV1,
};
