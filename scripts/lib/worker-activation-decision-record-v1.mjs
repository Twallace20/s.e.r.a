import fs from "node:fs";
import path from "node:path";

const declaredPaths = [
  "docs/phases/PHASE_105_WORKER_ACTIVATION_DECISION_RECORD_V1.md",
  "scripts/lib/worker-activation-decision-record-v1.mjs",
  "scripts/run-worker-activation-decision-record-v1.mjs",
  "tests/integration/worker-activation-decision-record-v1.test.ts",
  "apps/operator-console/src/worker-activation-decision-record.ts",
];

const workerActivationDecisionRecordRequirements = [
  { id: "phase-104-ready", label: "Phase 104 Worker Activation Gate ready", state: "required" },
  { id: "phase-104-lineage", label: "Phase 104 lineage required", state: "required" },
  { id: "owner-approval-required", label: "Tyler Wallace activation decision record approval required", state: "required" },
  { id: "operator-authority-preserved", label: "Driana Smith-Wallace operator authority preserved", state: "required" },
  { id: "activation-decision-review-only", label: "Worker Activation Decision Record is evidence only", state: "required" },
  { id: "decision-record-catalog", label: "Activation decision record catalog required", state: "required" },
  { id: "owner-decision-records", label: "Owner activation decision record required for every gated worker", state: "required" },
  { id: "decision-audit-records", label: "Decision audit record required for every worker", state: "required" },
  { id: "activation-denial-records", label: "Activation denial record required for every worker", state: "required" },
  { id: "decision-record-boundaries", label: "Decision record boundaries required for every worker", state: "required" },
  { id: "owner-review-manifest", label: "Owner review manifest required", state: "required" },
  { id: "gate-evidence-references", label: "Phase 104 gate evidence references required", state: "required" },
  { id: "decision-status", label: "Decision status is recorded-only and non-activating", state: "required" },
  { id: "safe-artifact-paths", label: "Activation decision artifact paths must remain safe relative paths", state: "required" },
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
  { id: "fail-closed", label: "Worker Activation Decision Record validation must fail closed", state: "required" },
  { id: "activation-decision-record-count", label: "Twelve activation decision records required", state: "required" },
  { id: "owner-decision-record-count", label: "Twelve owner activation decision records required", state: "required" },
  { id: "decision-audit-count", label: "Twelve decision audit records required", state: "required" },
  { id: "activation-denial-count", label: "Twelve activation denial records required", state: "required" },
  { id: "manual-decision-review-only", label: "Decision records remain pending manual owner implementation", state: "required" },
  { id: "no-auto-activation", label: "Automatic activation from decision records is blocked", state: "required" },
  { id: "no-secret-activation", label: "No hidden activation permissions allowed", state: "required" },
  { id: "human-operator-visible", label: "Activation decision record status must be visible to the operator console", state: "required" },
  { id: "bounded-decision-language", label: "Every decision record requires bounded activation language", state: "required" },
  { id: "phase-106-handoff", label: "Phase 106 handoff notes required", state: "required" },
  { id: "record-only-decision-level", label: "Every activation decision record remains record-only", state: "required" },
  { id: "activation-token-blocked", label: "No activation token may be issued in Phase 105", state: "required" },
  { id: "decision-does-not-equal-activation", label: "Recorded decision does not activate a worker", state: "required" },
  { id: "implementation-phase-required", label: "Future activation implementation phase required before execution", state: "required" },
];

const workerActivationDecisionRecordFields = [
  "workerActivationDecisionRecordId", "status", "owner", "operatorAuthorityOwner", "sourcePhase",
  "sourceWorkerActivationGateId", "phase104WorkerActivationGateReady",
  "activationDecisionRecordCount", "ownerActivationDecisionRecordCount", "decisionAuditRecordCount", "activationDenialRecordCount",
  "roadmapTrackCount", "multiLanguageProductionTargetCount", "safetyGateCount",
  "workerActivationDecisionRecordAllowed", "workerActivationGateReadAllowed", "activationDecisionRecordManifestAllowed",
  "ownerReviewDecisionRecordPacketAllowed", "ownerActivationDecisionDraftAllowed", "activationDenialRecordAllowed",
  "workerActivationAllowed", "workerExecutionAllowed", "workerSpawningAllowed", "autonomousDelegationAllowed",
  "schedulerWorkflowMutationAllowed", "iPhoneAutomationMutationAllowed", "awayModeExecutionAllowed", "fleetExecutionAllowed",
  "applyExecutionAllowed", "patchExecutionAllowed", "projectRepoSourceMutationAllowed", "realProjectBranchCreationAllowed",
  "realProjectMergeExecutionAllowed", "gitPushAllowed", "tagCreationAllowed", "arbitraryCommandAllowed", "shellExecutionAllowed",
  "selfApprovalAllowed", "selfMergeAllowed", "selfDeployAllowed", "productionDeploymentAllowed",
  "approvalRecord", "activationDecisionRecords", "ownerActivationDecisionRecords", "decisionAuditRecords",
  "activationDenialRecords", "activationDecisionBoundaryCatalog", "gateEvidenceReferenceCatalog", "activationGateReferences",
  "activationDecisionRecordManifest", "ownerReviewManifest", "futurePhaseHandoff", "requirements", "declaredPaths", "roadmapTracks",
  "multiLanguageProductionTargets", "checks", "blockers", "validationFailedCount", "activationDecisionRecordPacketProduced",
  "activationDecisionRecordManifestProduced", "ownerActivationDecisionRecordManifestProduced", "decisionAuditManifestProduced",
  "activationDenialManifestProduced", "ownerReviewManifestProduced", "readyForOwnerReview", "projectRepoSourceMutated",
  "workerActivated", "workerExecuted", "workerSpawned", "autonomousDelegationExecuted", "schedulerWorkflowMutated",
  "iPhoneAutomationMutated", "awayModeExecuted", "fleetExecuted", "applyExecuted", "patchExecuted", "realProjectBranchCreated",
  "realProjectMergePerformed", "gitPushPerformed", "tagCreated", "shellExecuted", "productionDeployed", "activationTokenIssued",
  "generatedAt", "packetPath", "activationDecisionRecordManifestPath", "activationDecisionRecordsPath", "ownerActivationDecisionRecordManifestPath",
  "decisionAuditManifestPath", "activationDenialManifestPath", "ownerReviewManifestPath", "activationDecisionBoundaryManifestPath",
  "gateEvidenceReferenceManifestPath", "activationGateReferenceManifestPath", "activationDecisionSummaryPath", "activationTokenManifestPath",
  "decisionLevel", "activationDecisionRecordStatus", "ownerDecisionStatus", "futureImplementationRequired", "decisionRecordLedgerPath",
  "decisionRecordLedgerProduced", "activationImplementationBlocked", "activationCredentialIssued", "decisionRecordAuditTrailPath",
];

const sourceActivationGateItems = [
  { workerId: "worker.phase-planner", gateItemId: "activation-gate.worker.phase-planner", lane: "phase-development", cardId: "card.worker.phase-planner" },
  { workerId: "worker.spec-writer", gateItemId: "activation-gate.worker.spec-writer", lane: "phase-development", cardId: "card.worker.spec-writer" },
  { workerId: "worker.overlay-packager", gateItemId: "activation-gate.worker.overlay-packager", lane: "phase-development", cardId: "card.worker.overlay-packager" },
  { workerId: "worker.validator", gateItemId: "activation-gate.worker.validator", lane: "validation-and-qa", cardId: "card.worker.validator" },
  { workerId: "worker.evidence", gateItemId: "activation-gate.worker.evidence", lane: "evidence-and-audit", cardId: "card.worker.evidence" },
  { workerId: "worker.knowledge", gateItemId: "activation-gate.worker.knowledge", lane: "knowledge-and-ingest", cardId: "card.worker.knowledge" },
  { workerId: "worker.console", gateItemId: "activation-gate.worker.console", lane: "operator-console", cardId: "card.worker.console" },
  { workerId: "worker.local-ops", gateItemId: "activation-gate.worker.local-ops", lane: "local-worker-ops", cardId: "card.worker.local-ops" },
  { workerId: "worker.release", gateItemId: "activation-gate.worker.release", lane: "release-readiness", cardId: "card.worker.release" },
  { workerId: "worker.intake", gateItemId: "activation-gate.worker.intake", lane: "workflow-intake", cardId: "card.worker.intake" },
  { workerId: "worker.client-surface", gateItemId: "activation-gate.worker.client-surface", lane: "client-surface-prep", cardId: "card.worker.client-surface" },
  { workerId: "worker.safety", gateItemId: "activation-gate.worker.safety", lane: "safety-and-governance", cardId: "card.worker.safety" },
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

function buildActivationDecisionRecords() {
  return sourceActivationGateItems.map((item) => ({
    decisionRecordId: `activation-decision-record.${item.workerId}`,
    sourceGateItemId: item.gateItemId,
    workerId: item.workerId,
    cardId: item.cardId,
    lane: item.lane,
    decisionLevel: "record-only",
    ownerDecisionStatus: "recorded-hold-for-future-implementation",
    recordedDecision: "defer-activation",
    activationApproved: false,
    ownerActivationDecisionRequired: true,
    futureImplementationRequired: true,
    activationImplementationBlocked: true,
    activationTokenIssued: false,
    activationCredentialIssued: false,
    activationAllowed: false,
    executionAllowed: false,
    gateEvidenceReferences: [`phase104/${item.gateItemId}/worker-activation-gate-packet.json`],
    decisionAuditRecord: {
      workerId: item.workerId,
      recordedDecision: "defer-activation",
      reason: "Phase 105 records owner activation decisions but does not activate workers.",
      auditStatus: "recorded-for-owner-review",
    },
    activationDenialRecord: {
      workerId: item.workerId,
      activationDeniedForThisPhase: true,
      denialReason: "Activation implementation remains blocked until a future owner-approved activation implementation phase.",
      workerActivated: false,
    },
    ownerActivationDecisionRecord: {
      workerId: item.workerId,
      owner: "Tyler Wallace",
      operatorAuthorityOwner: "Driana Smith-Wallace",
      recordedDecision: "defer-activation",
      activationApproved: false,
      ownerApprovalRequiredForFutureActivation: true,
    },
  }));
}

export function createDefaultWorkerActivationDecisionRecordV1(overrides = {}) {
  const activationDecisionRecords = buildActivationDecisionRecords();
  const ownerActivationDecisionRecords = activationDecisionRecords.map((item) => cloneJson(item.ownerActivationDecisionRecord));
  const decisionAuditRecords = activationDecisionRecords.map((item) => cloneJson(item.decisionAuditRecord));
  const activationDenialRecords = activationDecisionRecords.map((item) => cloneJson(item.activationDenialRecord));
  const activationDecisionBoundaryCatalog = activationDecisionRecords.map((item) => ({ workerId: item.workerId, activationAllowed: false, executionAllowed: false, futureImplementationRequired: true, activationTokenIssued: false }));
  const gateEvidenceReferenceCatalog = activationDecisionRecords.map((item) => ({ workerId: item.workerId, gateEvidenceReferences: [...item.gateEvidenceReferences] }));
  const activationGateReferences = activationDecisionRecords.map((item) => ({ workerId: item.workerId, sourceGateItemId: item.sourceGateItemId }));
  const config = {
    workerActivationDecisionRecordId: "phase105-demo-worker-activation-decision-record",
    status: "worker-activation-decision-record-pending-validation",
    owner: "Tyler Wallace",
    operatorAuthorityOwner: "Driana Smith-Wallace",
    sourcePhase: "104",
    sourceWorkerActivationGateId: "phase104-demo-worker-activation-gate",
    phase104WorkerActivationGateReady: true,
    activationDecisionRecordCount: activationDecisionRecords.length,
    ownerActivationDecisionRecordCount: ownerActivationDecisionRecords.length,
    decisionAuditRecordCount: decisionAuditRecords.length,
    activationDenialRecordCount: activationDenialRecords.length,
    roadmapTrackCount: roadmapTracks.length,
    multiLanguageProductionTargetCount: multiLanguageProductionTargets.length,
    safetyGateCount: 2100,
    approvalRecord: { approved: true, approvedBy: "Tyler Wallace", selfApproved: false, approvalScope: "worker-activation-decision-record-review-only" },
    boundaries: { ...defaultBoundaries },
    activationDecisionRecords,
    ownerActivationDecisionRecords,
    decisionAuditRecords,
    activationDenialRecords,
    activationDecisionBoundaryCatalog,
    gateEvidenceReferenceCatalog,
    activationGateReferences,
    futurePhaseHandoff: { nextPhase: "106", phaseName: "Worker Activation Token Draft v1", activationStillBlocked: true },
    requirements: cloneJson(workerActivationDecisionRecordRequirements),
    declaredPaths: [...declaredPaths],
    roadmapTracks: [...roadmapTracks],
    multiLanguageProductionTargets: [...multiLanguageProductionTargets],
    expectedActivationDecisionRecordCount: 12,
    expectedOwnerActivationDecisionRecordCount: 12,
    expectedDecisionAuditRecordCount: 12,
    expectedActivationDenialRecordCount: 12,
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
    activationCredentialIssued: false,
    activationImplementationBlocked: true,
  };
  if (overrides.boundaries) config.boundaries = { ...config.boundaries, ...overrides.boundaries };
  return { ...config, ...overrides, boundaries: overrides.boundaries ? config.boundaries : config.boundaries };
}

export function inspectWorkerActivationDecisionRecordV1(config = createDefaultWorkerActivationDecisionRecordV1()) {
  const checks = [];
  const blockers = [];
  function addCheck(id, label, passed, blocker) {
    checks.push({ id, label, passed });
    if (!passed) blockers.push(blocker);
  }

  addCheck("phase104-ready", "Phase 104 ready", config.phase104WorkerActivationGateReady === true, "Phase 104 Worker Activation Gate must be ready before Phase 105.");
  addCheck("phase104-lineage", "Phase 104 lineage", config.sourceWorkerActivationGateId === "phase104-demo-worker-activation-gate", "Phase 105 must link to the Phase 104 Worker Activation Gate.");
  addCheck("approval-record", "Tyler approval", config.approvalRecord?.approved === true && config.approvalRecord?.approvedBy === "Tyler Wallace", "Tyler Wallace approval record is required for Phase 105 Worker Activation Decision Record.");
  addCheck("self-approval-blocked", "Self approval blocked", config.approvalRecord?.selfApproved === false, "Self-approval is blocked for Phase 105 Worker Activation Decision Record.");
  addCheck("declared-paths", "Declared paths are safe", Array.isArray(config.declaredPaths) && config.declaredPaths.every(isSafeRelativePath), "Every declared path must be a safe relative path.");
  addCheck("declared-count", "Declared file count", Array.isArray(config.declaredPaths) && config.declaredPaths.length === 5, "Phase 105 must declare exactly five repo files.");
  addCheck("requirements", "Requirement count", Array.isArray(config.requirements) && config.requirements.length === 48, "Phase 105 requires forty-eight requirements.");
  addCheck("fields", "Field count", workerActivationDecisionRecordFields.length === 106, "Phase 105 requires one hundred six fields.");
  addCheck("decision-record-count", "Activation decision record count", Array.isArray(config.activationDecisionRecords) && config.activationDecisionRecords.length === config.expectedActivationDecisionRecordCount, "Phase 105 requires twelve activation decision records.");
  addCheck("owner-decision-record-count", "Owner activation decision record count", Array.isArray(config.ownerActivationDecisionRecords) && config.ownerActivationDecisionRecords.length === config.expectedOwnerActivationDecisionRecordCount, "Phase 105 requires twelve owner activation decision records.");
  addCheck("decision-audit-count", "Decision audit record count", Array.isArray(config.decisionAuditRecords) && config.decisionAuditRecords.length === config.expectedDecisionAuditRecordCount, "Phase 105 requires twelve decision audit records.");
  addCheck("activation-denial-count", "Activation denial record count", Array.isArray(config.activationDenialRecords) && config.activationDenialRecords.length === config.expectedActivationDenialRecordCount, "Phase 105 requires twelve activation denial records.");
  addCheck("roadmap-tracks", "Roadmap tracks", Array.isArray(config.roadmapTracks) && config.roadmapTracks.length === 13, "Thirteen roadmap tracks required.");
  addCheck("multi-language", "Multi-language doctrine", Array.isArray(config.multiLanguageProductionTargets) && config.multiLanguageProductionTargets.length === 18, "Eighteen multi-language production targets required.");

  const records = Array.isArray(config.activationDecisionRecords) ? config.activationDecisionRecords : [];
  for (const record of records) {
    addCheck(`record-id-${record?.workerId ?? "missing"}`, "Safe decision record id", typeof record?.decisionRecordId === "string" && record.decisionRecordId.startsWith("activation-decision-record.worker."), "Every activation decision record needs a safe activation-decision-record.worker id.");
    addCheck(`worker-id-${record?.workerId ?? "missing"}`, "Safe worker id", typeof record?.workerId === "string" && record.workerId.startsWith("worker."), "Every activation decision record needs a safe worker id.");
    addCheck(`gate-ref-${record?.workerId ?? "missing"}`, "Phase 104 gate reference", typeof record?.sourceGateItemId === "string" && record.sourceGateItemId.startsWith("activation-gate.worker."), "Every activation decision record needs a Phase 104 activation-gate.worker reference.");
    addCheck(`decision-level-${record?.workerId ?? "missing"}`, "Record-only decision", record?.decisionLevel === "record-only", "Every activation decision record must remain record-only.");
    addCheck(`owner-status-${record?.workerId ?? "missing"}`, "Recorded hold status", record?.ownerDecisionStatus === "recorded-hold-for-future-implementation", "Every activation decision record must remain recorded-hold-for-future-implementation.");
    addCheck(`recorded-decision-${record?.workerId ?? "missing"}`, "Deferred activation", record?.recordedDecision === "defer-activation", "Every activation decision record must defer activation.");
    addCheck(`activation-approved-${record?.workerId ?? "missing"}`, "Activation not approved", record?.activationApproved === false, "Worker activation approval must remain false in Phase 105.");
    addCheck(`owner-required-${record?.workerId ?? "missing"}`, "Owner decision required", record?.ownerActivationDecisionRequired === true, "Every activation decision record requires owner activation decision review.");
    addCheck(`future-implementation-${record?.workerId ?? "missing"}`, "Future implementation required", record?.futureImplementationRequired === true, "Every activation decision record requires a future activation implementation phase.");
    addCheck(`implementation-blocked-${record?.workerId ?? "missing"}`, "Implementation blocked", record?.activationImplementationBlocked === true, "Activation implementation must remain blocked in Phase 105.");
    addCheck(`token-${record?.workerId ?? "missing"}`, "No activation token", record?.activationTokenIssued === false && record?.activationCredentialIssued === false, "No activation token or credential may be issued in Phase 105.");
    addCheck(`activation-blocked-${record?.workerId ?? "missing"}`, "Activation blocked", record?.activationAllowed === false, "Worker activation must remain blocked in Phase 105.");
    addCheck(`execution-blocked-${record?.workerId ?? "missing"}`, "Execution blocked", record?.executionAllowed === false, "Worker execution must remain blocked in Phase 105.");
    addCheck(`evidence-${record?.workerId ?? "missing"}`, "Gate evidence", Array.isArray(record?.gateEvidenceReferences) && record.gateEvidenceReferences.length > 0, "Every activation decision record requires Phase 104 gate evidence references.");
    addCheck(`audit-${record?.workerId ?? "missing"}`, "Decision audit", record?.decisionAuditRecord?.auditStatus === "recorded-for-owner-review", "Every activation decision record requires a recorded-for-owner-review audit record.");
    addCheck(`denial-${record?.workerId ?? "missing"}`, "Activation denial", record?.activationDenialRecord?.activationDeniedForThisPhase === true && record?.activationDenialRecord?.workerActivated === false, "Every activation decision record requires an activation denial record for this phase.");
    addCheck(`owner-record-${record?.workerId ?? "missing"}`, "Owner activation decision record", record?.ownerActivationDecisionRecord?.activationApproved === false && record?.ownerActivationDecisionRecord?.recordedDecision === "defer-activation", "Every activation decision record requires an owner activation decision record with deferred activation.");
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
    activationCredentialIssued: config.activationCredentialIssued,
  })) {
    addCheck(`execution-${name}`, `${name} blocked`, value === false, `${name} must remain false`);
  }
  addCheck("activation-implementation-blocked", "Activation implementation blocked", config.activationImplementationBlocked === true, "activationImplementationBlocked must remain true");

  const ok = blockers.length === 0;
  return {
    ok,
    checks,
    blockers,
    validationFailedCount: blockers.length,
    workerActivationDecisionRecordId: config.workerActivationDecisionRecordId,
    workerActivationDecisionRecordStatus: ok ? "worker-activation-decision-record-ready" : "worker-activation-decision-record-validation-failed",
    declaredFileCount: declaredPaths.length,
    workerActivationDecisionRecordRequirementCount: workerActivationDecisionRecordRequirements.length,
    workerActivationDecisionRecordFieldCount: workerActivationDecisionRecordFields.length,
    activationDecisionRecordCount: Array.isArray(config.activationDecisionRecords) ? config.activationDecisionRecords.length : 0,
    ownerActivationDecisionRecordCount: Array.isArray(config.ownerActivationDecisionRecords) ? config.ownerActivationDecisionRecords.length : 0,
    decisionAuditRecordCount: Array.isArray(config.decisionAuditRecords) ? config.decisionAuditRecords.length : 0,
    activationDenialRecordCount: Array.isArray(config.activationDenialRecords) ? config.activationDenialRecords.length : 0,
    roadmapTrackCount: Array.isArray(config.roadmapTracks) ? config.roadmapTracks.length : 0,
    multiLanguageProductionTargetCount: Array.isArray(config.multiLanguageProductionTargets) ? config.multiLanguageProductionTargets.length : 0,
    safetyGateCount: config.safetyGateCount,
    workerActivationDecisionRecordAllowed: true,
    workerActivationGateReadAllowed: true,
    activationDecisionRecordManifestAllowed: true,
    ownerReviewDecisionRecordPacketAllowed: true,
    ownerActivationDecisionDraftAllowed: true,
    activationDenialRecordAllowed: true,
    ...config.boundaries,
    sourceWorkerActivationGateId: config.sourceWorkerActivationGateId,
    phase104WorkerActivationGateReady: config.phase104WorkerActivationGateReady,
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
    activationCredentialIssued: config.activationCredentialIssued,
    activationImplementationBlocked: config.activationImplementationBlocked,
    multiLanguageProductionDoctrineIncluded: Array.isArray(config.multiLanguageProductionTargets) && config.multiLanguageProductionTargets.length === 18,
  };
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n", "utf8");
}

export function runWorkerActivationDecisionRecordV1(config = createDefaultWorkerActivationDecisionRecordV1(), options = {}) {
  const inspection = inspectWorkerActivationDecisionRecordV1(config);
  const artifactRoot = options.artifactRoot || path.join(process.cwd(), ".sera-worker-activation-decision-record");
  const runRoot = path.join(artifactRoot, "activation-decision-record", config.workerActivationDecisionRecordId || "phase105-demo-worker-activation-decision-record");
  const generatedAt = new Date().toISOString();
  const activationDecisionRecordManifest = {
    id: config.workerActivationDecisionRecordId,
    status: inspection.workerActivationDecisionRecordStatus,
    generatedAt,
    sourceWorkerActivationGateId: config.sourceWorkerActivationGateId,
    activationDecisionRecordCount: inspection.activationDecisionRecordCount,
    ownerActivationDecisionRecordCount: inspection.ownerActivationDecisionRecordCount,
    decisionAuditRecordCount: inspection.decisionAuditRecordCount,
    activationDenialRecordCount: inspection.activationDenialRecordCount,
    activationRemainsBlocked: config.workerActivated === false && config.boundaries?.workerActivationAllowed === false,
    activationTokenIssued: false,
    activationCredentialIssued: false,
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
    activationImplementationBlocked: true,
  };
  const activationDecisionBoundaryManifest = { activationDecisionBoundaryCatalog: config.activationDecisionBoundaryCatalog };
  const gateEvidenceReferenceManifest = { gateEvidenceReferenceCatalog: config.gateEvidenceReferenceCatalog };
  const activationGateReferenceManifest = { activationGateReferences: config.activationGateReferences };
  const decisionAuditManifest = { decisionAuditRecords: config.decisionAuditRecords };
  const ownerActivationDecisionRecordManifest = { ownerActivationDecisionRecords: config.ownerActivationDecisionRecords };
  const activationDenialManifest = { activationDenialRecords: config.activationDenialRecords };
  const activationTokenManifest = { activationTokenIssued: false, activationTokenAllowed: false, activationCredentialIssued: false, phase: "105" };
  const activationDecisionSummary = {
    status: inspection.workerActivationDecisionRecordStatus,
    readyForOwnerReview: inspection.ok,
    workerActivationAllowed: false,
    workerExecutionAllowed: false,
    activationTokenIssued: false,
    activationImplementationBlocked: true,
  };
  const decisionRecordLedger = {
    generatedAt,
    ledgerStatus: inspection.ok ? "decision-record-ledger-ready" : "decision-record-ledger-validation-failed",
    recordCount: inspection.activationDecisionRecordCount,
    activationImplemented: false,
  };
  const packet = {
    ...config,
    status: inspection.workerActivationDecisionRecordStatus,
    generatedAt,
    activationDecisionRecordManifest,
    ownerReviewManifest,
    activationDecisionBoundaryManifest,
    gateEvidenceReferenceManifest,
    activationGateReferenceManifest,
    decisionAuditManifest,
    ownerActivationDecisionRecordManifest,
    activationDenialManifest,
    activationTokenManifest,
    activationDecisionSummary,
    decisionRecordLedger,
    checks: inspection.checks,
    blockers: inspection.blockers,
  };
  const packetPath = path.join(runRoot, "worker-activation-decision-record-packet.json");
  const activationDecisionRecordManifestPath = path.join(runRoot, "activation-decision-record-manifest.json");
  const activationDecisionRecordsPath = path.join(runRoot, "activation-decision-records.json");
  const ownerActivationDecisionRecordManifestPath = path.join(runRoot, "owner-activation-decision-record-manifest.json");
  const decisionAuditManifestPath = path.join(runRoot, "decision-audit-manifest.json");
  const activationDenialManifestPath = path.join(runRoot, "activation-denial-manifest.json");
  const ownerReviewManifestPath = path.join(runRoot, "owner-review-manifest.json");
  const activationDecisionBoundaryManifestPath = path.join(runRoot, "activation-decision-boundary-manifest.json");
  const gateEvidenceReferenceManifestPath = path.join(runRoot, "gate-evidence-reference-manifest.json");
  const activationGateReferenceManifestPath = path.join(runRoot, "activation-gate-reference-manifest.json");
  const activationDecisionSummaryPath = path.join(runRoot, "activation-decision-summary.json");
  const activationTokenManifestPath = path.join(runRoot, "activation-token-manifest.json");
  const decisionRecordLedgerPath = path.join(runRoot, "decision-record-ledger.json");
  const decisionRecordAuditTrailPath = path.join(runRoot, "decision-record-audit-trail.json");
  writeJson(packetPath, packet);
  writeJson(activationDecisionRecordManifestPath, activationDecisionRecordManifest);
  writeJson(activationDecisionRecordsPath, config.activationDecisionRecords);
  writeJson(ownerActivationDecisionRecordManifestPath, ownerActivationDecisionRecordManifest);
  writeJson(decisionAuditManifestPath, decisionAuditManifest);
  writeJson(activationDenialManifestPath, activationDenialManifest);
  writeJson(ownerReviewManifestPath, ownerReviewManifest);
  writeJson(activationDecisionBoundaryManifestPath, activationDecisionBoundaryManifest);
  writeJson(gateEvidenceReferenceManifestPath, gateEvidenceReferenceManifest);
  writeJson(activationGateReferenceManifestPath, activationGateReferenceManifest);
  writeJson(activationDecisionSummaryPath, activationDecisionSummary);
  writeJson(activationTokenManifestPath, activationTokenManifest);
  writeJson(decisionRecordLedgerPath, decisionRecordLedger);
  writeJson(decisionRecordAuditTrailPath, { decisionAuditRecords: config.decisionAuditRecords, generatedAt });

  return {
    ...inspection,
    ok: inspection.ok,
    activationDecisionRecordPacketProduced: true,
    activationDecisionRecordManifestProduced: true,
    ownerActivationDecisionRecordManifestProduced: true,
    decisionAuditManifestProduced: true,
    activationDenialManifestProduced: true,
    ownerReviewManifestProduced: true,
    decisionRecordLedgerProduced: true,
    readyForOwnerReview: ownerReviewManifest.readyForOwnerReview,
    packetPath,
    activationDecisionRecordManifestPath,
    activationDecisionRecordsPath,
    ownerActivationDecisionRecordManifestPath,
    decisionAuditManifestPath,
    activationDenialManifestPath,
    ownerReviewManifestPath,
    activationDecisionBoundaryManifestPath,
    gateEvidenceReferenceManifestPath,
    activationGateReferenceManifestPath,
    activationDecisionSummaryPath,
    activationTokenManifestPath,
    decisionRecordLedgerPath,
    decisionRecordAuditTrailPath,
  };
}

export const workerActivationDecisionRecordV1 = {
  declaredPaths,
  workerActivationDecisionRecordRequirements,
  workerActivationDecisionRecordFields,
  sourceActivationGateItems,
  roadmapTracks,
  multiLanguageProductionTargets,
  createDefaultWorkerActivationDecisionRecordV1,
  inspectWorkerActivationDecisionRecordV1,
  runWorkerActivationDecisionRecordV1,
};
