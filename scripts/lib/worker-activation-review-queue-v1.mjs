import fs from "node:fs";
import path from "node:path";

const declaredPaths = [
  "docs/phases/PHASE_103_WORKER_ACTIVATION_REVIEW_QUEUE_V1.md",
  "scripts/lib/worker-activation-review-queue-v1.mjs",
  "scripts/run-worker-activation-review-queue-v1.mjs",
  "tests/integration/worker-activation-review-queue-v1.test.ts",
  "apps/operator-console/src/worker-activation-review-queue.ts",
];

const workerActivationReviewQueueRequirements = [
  { id: "phase-102-ready", label: "Phase 102 Worker Capability Cards ready", state: "required" },
  { id: "phase-102-lineage", label: "Phase 102 lineage required", state: "required" },
  { id: "owner-approval-required", label: "Tyler Wallace activation review approval required", state: "required" },
  { id: "operator-authority-preserved", label: "Driana Smith-Wallace operator authority preserved", state: "required" },
  { id: "activation-review-only", label: "Worker Activation Review Queue is review evidence only", state: "required" },
  { id: "queue-catalog", label: "Activation review queue catalog required", state: "required" },
  { id: "queue-manifest", label: "Activation queue manifest required", state: "required" },
  { id: "decision-drafts", label: "Activation decision drafts required for every worker", state: "required" },
  { id: "readiness-checklists", label: "Readiness checklist required for every worker", state: "required" },
  { id: "activation-boundaries", label: "Activation boundaries required for every queue item", state: "required" },
  { id: "owner-review-manifest", label: "Owner review manifest required", state: "required" },
  { id: "evidence-references", label: "Capability card evidence references required", state: "required" },
  { id: "future-phase-handoff", label: "Worker activation gate handoff required", state: "required" },
  { id: "safe-artifact-paths", label: "Activation review artifact paths must remain safe relative paths", state: "required" },
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
  { id: "fail-closed", label: "Worker Activation Review Queue validation must fail closed", state: "required" },
  { id: "activation-queue-count", label: "Twelve activation review queue items required", state: "required" },
  { id: "decision-template-count", label: "Twelve activation decision drafts required", state: "required" },
  { id: "readiness-checklist-count", label: "Twelve readiness checklists required", state: "required" },
  { id: "manual-review-only", label: "Queue items remain pending manual owner review", state: "required" },
  { id: "no-auto-approval", label: "Automatic approval is blocked", state: "required" },
  { id: "no-secret-activation", label: "No hidden activation permissions allowed", state: "required" },
  { id: "human-operator-visible", label: "Activation review queue status must be visible to the operator console", state: "required" },
  { id: "bounded-activation-language", label: "Every queue item requires bounded activation language", state: "required" },
  { id: "phase-104-handoff", label: "Phase 104 handoff notes required", state: "required" },
  { id: "review-only-queue-level", label: "Every activation queue item remains review-only", state: "required" },
];

const workerActivationReviewQueueFields = [
  "workerActivationReviewQueueId",
  "status",
  "owner",
  "operatorAuthorityOwner",
  "sourcePhase",
  "sourceWorkerCapabilityCardsId",
  "phase102WorkerCapabilityCardsReady",
  "activationQueueItemCount",
  "decisionTemplateCount",
  "readinessChecklistCount",
  "roadmapTrackCount",
  "multiLanguageProductionTargetCount",
  "safetyGateCount",
  "workerActivationReviewQueueAllowed",
  "workerCapabilityCardsReadAllowed",
  "activationQueueManifestAllowed",
  "ownerReviewActivationPacketAllowed",
  "activationDecisionDraftAllowed",
  "workerActivationAllowed",
  "workerExecutionAllowed",
  "workerSpawningAllowed",
  "autonomousDelegationAllowed",
  "schedulerWorkflowMutationAllowed",
  "iPhoneAutomationMutationAllowed",
  "awayModeExecutionAllowed",
  "fleetExecutionAllowed",
  "applyExecutionAllowed",
  "patchExecutionAllowed",
  "projectRepoSourceMutationAllowed",
  "realProjectBranchCreationAllowed",
  "realProjectMergeExecutionAllowed",
  "gitPushAllowed",
  "tagCreationAllowed",
  "arbitraryCommandAllowed",
  "shellExecutionAllowed",
  "selfApprovalAllowed",
  "selfMergeAllowed",
  "selfDeployAllowed",
  "productionDeploymentAllowed",
  "approvalRecord",
  "activationReviewQueue",
  "activationDecisionDrafts",
  "readinessChecklists",
  "activationBoundaryCatalog",
  "evidenceReferenceCatalog",
  "capabilityCardReferences",
  "activationQueueManifest",
  "ownerReviewManifest",
  "futurePhaseHandoff",
  "requirements",
  "declaredPaths",
  "roadmapTracks",
  "multiLanguageProductionTargets",
  "checks",
  "blockers",
  "validationFailedCount",
  "activationReviewPacketProduced",
  "activationQueueManifestProduced",
  "activationDecisionDraftsProduced",
  "readinessChecklistManifestProduced",
  "ownerReviewManifestProduced",
  "readyForOwnerReview",
  "projectRepoSourceMutated",
  "workerActivated",
  "workerExecuted",
  "workerSpawned",
  "autonomousDelegationExecuted",
  "schedulerWorkflowMutated",
  "iPhoneAutomationMutated",
  "awayModeExecuted",
  "fleetExecuted",
  "applyExecuted",
  "patchExecuted",
  "realProjectBranchCreated",
  "realProjectMergePerformed",
  "gitPushPerformed",
  "tagCreated",
  "shellExecuted",
  "productionDeployed",
  "generatedAt",
  "packetPath",
  "activationQueueManifestPath",
  "activationReviewQueuePath",
  "activationDecisionDraftsPath",
  "readinessChecklistManifestPath",
  "ownerReviewManifestPath",
  "activationBoundaryManifestPath",
  "evidenceReferenceManifestPath",
  "capabilityCardReferenceManifestPath",
  "activationReviewSummaryPath",
];

const sourceCapabilityCards = [
  { workerId: "worker.phase-planner", cardId: "card.worker.phase-planner", lane: "phase-development", title: "Phase Planner Worker Capability Card" },
  { workerId: "worker.spec-writer", cardId: "card.worker.spec-writer", lane: "phase-development", title: "Spec Writer Worker Capability Card" },
  { workerId: "worker.overlay-packager", cardId: "card.worker.overlay-packager", lane: "phase-development", title: "Overlay Packager Worker Capability Card" },
  { workerId: "worker.validator", cardId: "card.worker.validator", lane: "validation-and-qa", title: "Validation Worker Capability Card" },
  { workerId: "worker.evidence", cardId: "card.worker.evidence", lane: "evidence-and-audit", title: "Evidence Worker Capability Card" },
  { workerId: "worker.knowledge", cardId: "card.worker.knowledge", lane: "knowledge-and-ingest", title: "Knowledge Worker Capability Card" },
  { workerId: "worker.console", cardId: "card.worker.console", lane: "operator-console", title: "Console Status Worker Capability Card" },
  { workerId: "worker.local-ops", cardId: "card.worker.local-ops", lane: "local-worker-ops", title: "Local Ops Worker Capability Card" },
  { workerId: "worker.release", cardId: "card.worker.release", lane: "release-readiness", title: "Release Readiness Worker Capability Card" },
  { workerId: "worker.intake", cardId: "card.worker.intake", lane: "workflow-intake", title: "Workflow Intake Worker Capability Card" },
  { workerId: "worker.client-surface", cardId: "card.worker.client-surface", lane: "client-surface-prep", title: "Client Surface Prep Worker Capability Card" },
  { workerId: "worker.safety", cardId: "card.worker.safety", lane: "safety-and-governance", title: "Safety Governance Worker Capability Card" },
];

const roadmapTracks = [
  "worker-fleet-foundation",
  "universal-ingest",
  "knowledge-pack-factory",
  "universal-production-engine",
  "rights-provenance",
  "creator-media",
  "domain-studios",
  "client-public-surfaces",
  "mobile-private-jarvis",
  "advanced-technical-domains",
  "fleet-agency",
  "product-platform",
  "revenue-acceleration",
];

const multiLanguageProductionTargets = [
  "typescript", "javascript", "node", "python", "markdown", "json", "yaml", "sql", "html", "css", "powershell", "bash", "react", "sqlite", "api", "cli", "mobile", "local-desktop"
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

function isSafeWorkerId(value) {
  return /^worker\.[a-z0-9-]+$/.test(value);
}

function isSafeCardId(value) {
  return /^card\.worker\.[a-z0-9-]+$/.test(value);
}

function isSafeQueueItemId(value) {
  return /^activation-review\.worker\.[a-z0-9-]+$/.test(value);
}

function buildActivationReviewQueue() {
  return sourceCapabilityCards.map((card) => ({
    queueItemId: `activation-review.${card.workerId}`,
    workerId: card.workerId,
    cardId: card.cardId,
    lane: card.lane,
    title: `${card.title} Activation Review`,
    queueStatus: "pending-owner-review",
    activationState: "not-activated",
    reviewLevel: "review-only",
    requiredApprovalOwner: "Tyler Wallace",
    ownerReviewRequired: true,
    autoApprovalAllowed: false,
    hiddenActivationPermissions: false,
    activationBoundary: "manual-owner-approval-only",
    activationAllowed: false,
    executionAllowed: false,
    evidenceReferences: ["capability card", "blocked power summary", "readiness checklist"],
    readinessChecklist: ["source lineage verified", "permissions reviewed", "activation remains blocked"],
    decisionDraft: { recommendedDecision: "hold-for-owner-review", activationApproved: false, rationaleRequired: true },
    blockedCapabilities: ["activate worker", "execute worker", "spawn worker", "self-approve"],
  }));
}

function createCheck(id, label, passed, detail) {
  return { id, label, passed, detail: detail ?? (passed ? "passed" : "failed") };
}

export function createDefaultWorkerActivationReviewQueueV1(overrides = {}) {
  const activationReviewQueue = buildActivationReviewQueue();
  return {
    workerActivationReviewQueueId: "phase103-demo-worker-activation-review-queue",
    status: "worker-activation-review-queue-ready",
    owner: "Tyler Wallace",
    operatorAuthorityOwner: "Driana Smith-Wallace",
    sourcePhase: "102",
    sourceWorkerCapabilityCardsId: "phase102-demo-worker-capability-cards",
    phase102WorkerCapabilityCardsReady: true,
    expectedActivationQueueItemCount: 12,
    expectedDecisionTemplateCount: 12,
    expectedReadinessChecklistCount: 12,
    roadmapTrackCount: 13,
    multiLanguageProductionTargetCount: 18,
    safetyGateCount: 1980,
    boundaries: { ...defaultBoundaries },
    approvalRecord: { approved: true, owner: "Tyler Wallace", selfApproved: false, approvalType: "owner-review" },
    activationReviewQueue: cloneJson(activationReviewQueue),
    activationDecisionDrafts: activationReviewQueue.map((item) => ({ workerId: item.workerId, decisionDraft: cloneJson(item.decisionDraft) })),
    readinessChecklists: activationReviewQueue.map((item) => ({ workerId: item.workerId, readinessChecklist: [...item.readinessChecklist] })),
    activationBoundaryCatalog: activationReviewQueue.map((item) => ({ workerId: item.workerId, activationBoundary: item.activationBoundary })),
    evidenceReferenceCatalog: activationReviewQueue.map((item) => ({ workerId: item.workerId, evidenceReferences: [...item.evidenceReferences] })),
    capabilityCardReferences: sourceCapabilityCards.map((card) => ({ workerId: card.workerId, cardId: card.cardId })),
    futurePhaseHandoff: { nextPhase: "104", title: "Worker Activation Gate v1", status: "manual-owner-review-required" },
    requirements: cloneJson(workerActivationReviewQueueRequirements),
    declaredPaths: [...declaredPaths],
    roadmapTracks: [...roadmapTracks],
    multiLanguageProductionTargets: [...multiLanguageProductionTargets],
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
    ...overrides,
  };
}

export function inspectWorkerActivationReviewQueueV1(config = createDefaultWorkerActivationReviewQueueV1()) {
  const checks = [];
  const blockers = [];
  const addCheck = (id, label, passed, failure) => {
    checks.push(createCheck(id, label, passed, failure));
    if (!passed) blockers.push(failure || label);
  };

  addCheck("phase-102-ready", "Phase 102 Worker Capability Cards ready", config.phase102WorkerCapabilityCardsReady === true, "Phase 102 Worker Capability Cards must be ready before Phase 103.");
  addCheck("phase-102-lineage", "Phase 102 lineage", config.sourceWorkerCapabilityCardsId === "phase102-demo-worker-capability-cards", "Phase 103 must link to the Phase 102 Worker Capability Cards.");
  addCheck("tyler-approval", "Tyler Wallace approval", config.approvalRecord?.approved === true && config.approvalRecord?.owner === "Tyler Wallace", "Tyler Wallace approval record is required for Phase 103 Worker Activation Review Queue.");
  addCheck("self-approval-blocked", "Self approval blocked", config.approvalRecord?.selfApproved === false, "Self-approval is blocked for Phase 103 Worker Activation Review Queue.");
  addCheck("declared-paths", "Declared paths are safe", Array.isArray(config.declaredPaths) && config.declaredPaths.length === 5 && config.declaredPaths.every(isSafeRelativePath), "Phase 103 declared paths must be safe relative paths.");
  addCheck("requirements", "Requirement count", Array.isArray(config.requirements) && config.requirements.length === 44, "Phase 103 requires exactly 44 requirements.");
  addCheck("fields", "Field count", workerActivationReviewQueueFields.length === 90, "Phase 103 requires exactly 90 fields.");
  addCheck("roadmap-tracks", "Roadmap track count", Array.isArray(config.roadmapTracks) && config.roadmapTracks.length === 13, "Phase 103 requires thirteen roadmap tracks.");
  addCheck("multi-language", "Multi-language target count", Array.isArray(config.multiLanguageProductionTargets) && config.multiLanguageProductionTargets.length === 18, "Phase 103 requires eighteen multi-language production targets.");

  const queue = Array.isArray(config.activationReviewQueue) ? config.activationReviewQueue : [];
  const knownCards = new Set(sourceCapabilityCards.map((card) => card.cardId));
  const knownWorkers = new Set(sourceCapabilityCards.map((card) => card.workerId));
  addCheck("queue-count", "Activation queue item count", queue.length === config.expectedActivationQueueItemCount, `Expected ${config.expectedActivationQueueItemCount} activation queue items but found ${queue.length}.`);
  addCheck("decision-template-count", "Decision template count", Array.isArray(config.activationDecisionDrafts) && config.activationDecisionDrafts.length === config.expectedDecisionTemplateCount, `Expected ${config.expectedDecisionTemplateCount} activation decision drafts but found ${Array.isArray(config.activationDecisionDrafts) ? config.activationDecisionDrafts.length : 0}.`);
  addCheck("readiness-checklist-count", "Readiness checklist count", Array.isArray(config.readinessChecklists) && config.readinessChecklists.length === config.expectedReadinessChecklistCount, `Expected ${config.expectedReadinessChecklistCount} readiness checklists but found ${Array.isArray(config.readinessChecklists) ? config.readinessChecklists.length : 0}.`);

  for (const item of queue) {
    addCheck(`safe-queue-${item?.queueItemId ?? "missing"}`, "Safe queue item id", isSafeQueueItemId(item?.queueItemId), "Every activation queue item requires a safe activation-review.worker.* id.");
    addCheck(`safe-worker-${item?.workerId ?? "missing"}`, "Safe worker id", isSafeWorkerId(item?.workerId), "Every activation queue item requires a safe worker.* id.");
    addCheck(`safe-card-${item?.cardId ?? "missing"}`, "Safe card id", isSafeCardId(item?.cardId), "Every activation queue item requires a safe card.worker.* id.");
    addCheck(`known-worker-${item?.workerId ?? "missing"}`, "Known worker id", knownWorkers.has(item?.workerId), "Every activation queue item must reference a known Phase 102 worker.");
    addCheck(`known-card-${item?.cardId ?? "missing"}`, "Known capability card", knownCards.has(item?.cardId), "Every activation queue item must reference a known Phase 102 capability card.");
    addCheck(`pending-review-${item?.workerId ?? "missing"}`, "Pending owner review", item?.queueStatus === "pending-owner-review", "Every activation queue item must remain pending-owner-review.");
    addCheck(`not-activated-${item?.workerId ?? "missing"}`, "Not activated", item?.activationState === "not-activated", "Every activation queue item must remain not-activated.");
    addCheck(`review-only-${item?.workerId ?? "missing"}`, "Review-only queue level", item?.reviewLevel === "review-only", "Every activation queue item must remain review-only.");
    addCheck(`owner-review-${item?.workerId ?? "missing"}`, "Owner review required", item?.ownerReviewRequired === true, "Every activation queue item requires owner review.");
    addCheck(`manual-activation-${item?.workerId ?? "missing"}`, "Manual activation only", item?.activationBoundary === "manual-owner-approval-only", "Every activation queue item requires manual-owner-approval-only activation.");
    addCheck(`no-auto-approval-${item?.workerId ?? "missing"}`, "No auto approval", item?.autoApprovalAllowed === false, "Automatic worker activation approval is blocked.");
    addCheck(`no-hidden-activation-${item?.workerId ?? "missing"}`, "No hidden activation permissions", item?.hiddenActivationPermissions === false, "No hidden worker activation permissions allowed.");
    addCheck(`activation-blocked-${item?.workerId ?? "missing"}`, "Activation remains blocked", item?.activationAllowed === false, "Worker activation must remain blocked in Phase 103.");
    addCheck(`execution-blocked-${item?.workerId ?? "missing"}`, "Execution remains blocked", item?.executionAllowed === false, "Worker execution must remain blocked in Phase 103.");
    addCheck(`evidence-${item?.workerId ?? "missing"}`, "Evidence references", Array.isArray(item?.evidenceReferences) && item.evidenceReferences.length > 0, "Every activation queue item requires evidence references.");
    addCheck(`readiness-${item?.workerId ?? "missing"}`, "Readiness checklist", Array.isArray(item?.readinessChecklist) && item.readinessChecklist.length > 0, "Every activation queue item requires a readiness checklist.");
    addCheck(`decision-${item?.workerId ?? "missing"}`, "Decision draft", item?.decisionDraft?.activationApproved === false && item?.decisionDraft?.recommendedDecision === "hold-for-owner-review", "Every activation queue item requires a hold-for-owner-review decision draft.");
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
  })) {
    addCheck(`execution-${name}`, `${name} blocked`, value === false, `${name} must remain false`);
  }

  const ok = blockers.length === 0;
  return {
    ok,
    checks,
    blockers,
    validationFailedCount: blockers.length,
    workerActivationReviewQueueId: config.workerActivationReviewQueueId,
    workerActivationReviewQueueStatus: ok ? "worker-activation-review-queue-ready" : "worker-activation-review-queue-validation-failed",
    declaredFileCount: declaredPaths.length,
    workerActivationReviewQueueRequirementCount: workerActivationReviewQueueRequirements.length,
    workerActivationReviewQueueFieldCount: workerActivationReviewQueueFields.length,
    activationQueueItemCount: queue.length,
    decisionTemplateCount: Array.isArray(config.activationDecisionDrafts) ? config.activationDecisionDrafts.length : 0,
    readinessChecklistCount: Array.isArray(config.readinessChecklists) ? config.readinessChecklists.length : 0,
    roadmapTrackCount: Array.isArray(config.roadmapTracks) ? config.roadmapTracks.length : 0,
    multiLanguageProductionTargetCount: Array.isArray(config.multiLanguageProductionTargets) ? config.multiLanguageProductionTargets.length : 0,
    safetyGateCount: config.safetyGateCount,
    workerActivationReviewQueueAllowed: true,
    workerCapabilityCardsReadAllowed: true,
    activationQueueManifestAllowed: true,
    ownerReviewActivationPacketAllowed: true,
    activationDecisionDraftAllowed: true,
    ...config.boundaries,
    sourceWorkerCapabilityCardsId: config.sourceWorkerCapabilityCardsId,
    phase102WorkerCapabilityCardsReady: config.phase102WorkerCapabilityCardsReady,
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
    multiLanguageProductionDoctrineIncluded: Array.isArray(config.multiLanguageProductionTargets) && config.multiLanguageProductionTargets.length === 18,
  };
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n", "utf8");
}

export function runWorkerActivationReviewQueueV1(config = createDefaultWorkerActivationReviewQueueV1(), options = {}) {
  const inspection = inspectWorkerActivationReviewQueueV1(config);
  const artifactRoot = options.artifactRoot || path.join(process.cwd(), ".sera-worker-activation-review-queue");
  const runRoot = path.join(artifactRoot, "activation-review-queue", config.workerActivationReviewQueueId || "phase103-demo-worker-activation-review-queue");
  const generatedAt = new Date().toISOString();
  const activationQueueManifest = {
    id: config.workerActivationReviewQueueId,
    status: inspection.workerActivationReviewQueueStatus,
    generatedAt,
    sourceWorkerCapabilityCardsId: config.sourceWorkerCapabilityCardsId,
    activationQueueItemCount: inspection.activationQueueItemCount,
    decisionTemplateCount: inspection.decisionTemplateCount,
    readinessChecklistCount: inspection.readinessChecklistCount,
    activationRemainsBlocked: config.workerActivated === false && config.boundaries?.workerActivationAllowed === false,
    blockedPowersPreserved: blockedBoundaryNames,
  };
  const ownerReviewManifest = {
    owner: config.owner,
    operatorAuthorityOwner: config.operatorAuthorityOwner,
    readyForOwnerReview: inspection.ok,
    selfApprovalBlocked: config.approvalRecord?.selfApproved === false,
    automaticActivationBlocked: true,
    futureActivationRequiresOwnerApproval: true,
  };
  const activationBoundaryManifest = { activationBoundaryCatalog: config.activationBoundaryCatalog };
  const evidenceReferenceManifest = { evidenceReferenceCatalog: config.evidenceReferenceCatalog };
  const capabilityCardReferenceManifest = { capabilityCardReferences: config.capabilityCardReferences };
  const readinessChecklistManifest = { readinessChecklists: config.readinessChecklists };
  const activationReviewSummary = {
    status: inspection.workerActivationReviewQueueStatus,
    readyForOwnerReview: inspection.ok,
    workerActivationAllowed: false,
    workerExecutionAllowed: false,
  };
  const packet = {
    ...config,
    status: inspection.workerActivationReviewQueueStatus,
    generatedAt,
    activationQueueManifest,
    ownerReviewManifest,
    activationBoundaryManifest,
    evidenceReferenceManifest,
    capabilityCardReferenceManifest,
    readinessChecklistManifest,
    activationReviewSummary,
    checks: inspection.checks,
    blockers: inspection.blockers,
  };
  const packetPath = path.join(runRoot, "worker-activation-review-queue-packet.json");
  const activationQueueManifestPath = path.join(runRoot, "activation-queue-manifest.json");
  const activationReviewQueuePath = path.join(runRoot, "activation-review-queue.json");
  const activationDecisionDraftsPath = path.join(runRoot, "activation-decision-drafts.json");
  const readinessChecklistManifestPath = path.join(runRoot, "readiness-checklist-manifest.json");
  const ownerReviewManifestPath = path.join(runRoot, "owner-review-manifest.json");
  const activationBoundaryManifestPath = path.join(runRoot, "activation-boundary-manifest.json");
  const evidenceReferenceManifestPath = path.join(runRoot, "evidence-reference-manifest.json");
  const capabilityCardReferenceManifestPath = path.join(runRoot, "capability-card-reference-manifest.json");
  const activationReviewSummaryPath = path.join(runRoot, "activation-review-summary.json");
  writeJson(packetPath, packet);
  writeJson(activationQueueManifestPath, activationQueueManifest);
  writeJson(activationReviewQueuePath, config.activationReviewQueue);
  writeJson(activationDecisionDraftsPath, config.activationDecisionDrafts);
  writeJson(readinessChecklistManifestPath, readinessChecklistManifest);
  writeJson(ownerReviewManifestPath, ownerReviewManifest);
  writeJson(activationBoundaryManifestPath, activationBoundaryManifest);
  writeJson(evidenceReferenceManifestPath, evidenceReferenceManifest);
  writeJson(capabilityCardReferenceManifestPath, capabilityCardReferenceManifest);
  writeJson(activationReviewSummaryPath, activationReviewSummary);

  return {
    ...inspection,
    ok: inspection.ok,
    activationReviewPacketProduced: true,
    activationQueueManifestProduced: true,
    activationDecisionDraftsProduced: true,
    readinessChecklistManifestProduced: true,
    ownerReviewManifestProduced: true,
    readyForOwnerReview: ownerReviewManifest.readyForOwnerReview,
    packetPath,
    activationQueueManifestPath,
    activationReviewQueuePath,
    activationDecisionDraftsPath,
    readinessChecklistManifestPath,
    ownerReviewManifestPath,
    activationBoundaryManifestPath,
    evidenceReferenceManifestPath,
    capabilityCardReferenceManifestPath,
    activationReviewSummaryPath,
  };
}

export const workerActivationReviewQueueV1 = {
  declaredPaths,
  workerActivationReviewQueueRequirements,
  workerActivationReviewQueueFields,
  sourceCapabilityCards,
  roadmapTracks,
  multiLanguageProductionTargets,
  createDefaultWorkerActivationReviewQueueV1,
  inspectWorkerActivationReviewQueueV1,
  runWorkerActivationReviewQueueV1,
};
