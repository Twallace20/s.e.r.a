import fs from "node:fs";
import path from "node:path";

const declaredPaths = [
  "docs/phases/PHASE_106_WORKER_ACTIVATION_TOKEN_DRAFT_V1.md",
  "scripts/lib/worker-activation-token-draft-v1.mjs",
  "scripts/run-worker-activation-token-draft-v1.mjs",
  "tests/integration/worker-activation-token-draft-v1.test.ts",
  "apps/operator-console/src/worker-activation-token-draft.ts",
];

const workerActivationTokenDraftRequirements = [
  {
    "id": "phase-105-ready",
    "label": "Phase 105 Worker Activation Decision Record ready",
    "state": "required"
  },
  {
    "id": "phase-105-lineage",
    "label": "Phase 105 lineage required",
    "state": "required"
  },
  {
    "id": "owner-approval-required",
    "label": "Tyler Wallace activation token draft approval required",
    "state": "required"
  },
  {
    "id": "operator-authority-preserved",
    "label": "Driana Smith-Wallace operator authority preserved",
    "state": "required"
  },
  {
    "id": "token-draft-review-only",
    "label": "Worker Activation Token Draft is evidence only",
    "state": "required"
  },
  {
    "id": "token-draft-catalog",
    "label": "Activation token draft catalog required",
    "state": "required"
  },
  {
    "id": "owner-token-review-required",
    "label": "Owner token review draft required for every worker",
    "state": "required"
  },
  {
    "id": "token-policy-draft-required",
    "label": "Token policy draft required for every worker",
    "state": "required"
  },
  {
    "id": "token-audit-draft-required",
    "label": "Token audit draft required for every worker",
    "state": "required"
  },
  {
    "id": "token-denial-records",
    "label": "Token denial record required for every worker",
    "state": "required"
  },
  {
    "id": "decision-record-references",
    "label": "Phase 105 decision record references required",
    "state": "required"
  },
  {
    "id": "owner-review-manifest",
    "label": "Owner review manifest required",
    "state": "required"
  },
  {
    "id": "safe-artifact-paths",
    "label": "Activation token draft artifact paths must remain safe relative paths",
    "state": "required"
  },
  {
    "id": "no-token-issuance",
    "label": "Activation token issuance is blocked",
    "state": "required"
  },
  {
    "id": "no-credential-issuance",
    "label": "Activation credential issuance is blocked",
    "state": "required"
  },
  {
    "id": "no-token-material",
    "label": "Token material generation is blocked",
    "state": "required"
  },
  {
    "id": "no-secret-material",
    "label": "Secret material generation is blocked",
    "state": "required"
  },
  {
    "id": "no-worker-activation",
    "label": "Worker activation is blocked",
    "state": "required"
  },
  {
    "id": "no-worker-execution",
    "label": "Worker execution is blocked",
    "state": "required"
  },
  {
    "id": "no-worker-spawning",
    "label": "Worker spawning is blocked",
    "state": "required"
  },
  {
    "id": "no-autonomous-delegation",
    "label": "Autonomous delegation is blocked",
    "state": "required"
  },
  {
    "id": "no-away-mode",
    "label": "Away-mode execution is blocked",
    "state": "required"
  },
  {
    "id": "no-fleet-execution",
    "label": "Fleet execution is blocked",
    "state": "required"
  },
  {
    "id": "no-scheduler-mutation",
    "label": "Scheduler and workflow mutation are blocked",
    "state": "required"
  },
  {
    "id": "no-iphone-mutation",
    "label": "iPhone automation mutation is blocked",
    "state": "required"
  },
  {
    "id": "no-apply",
    "label": "Apply execution is blocked",
    "state": "required"
  },
  {
    "id": "no-patch",
    "label": "Patch execution is blocked",
    "state": "required"
  },
  {
    "id": "source-mutation-blocked",
    "label": "Project repo source mutation blocked",
    "state": "required"
  },
  {
    "id": "branch-creation-blocked",
    "label": "Real branch creation blocked",
    "state": "required"
  },
  {
    "id": "merge-blocked",
    "label": "Real merge execution blocked",
    "state": "required"
  },
  {
    "id": "git-push-blocked",
    "label": "Git push blocked",
    "state": "required"
  },
  {
    "id": "tag-blocked",
    "label": "Tag creation blocked",
    "state": "required"
  },
  {
    "id": "shell-blocked",
    "label": "Shell and arbitrary command execution blocked",
    "state": "required"
  },
  {
    "id": "self-governance-blocked",
    "label": "Self-approval, self-merge, self-deploy blocked",
    "state": "required"
  },
  {
    "id": "production-blocked",
    "label": "Production deployment blocked",
    "state": "required"
  },
  {
    "id": "multi-language-doctrine-preserved",
    "label": "Multi-language production doctrine preserved",
    "state": "required"
  },
  {
    "id": "fail-closed",
    "label": "Worker Activation Token Draft validation must fail closed",
    "state": "required"
  },
  {
    "id": "activation-token-draft-count",
    "label": "Twelve activation token drafts required",
    "state": "required"
  },
  {
    "id": "owner-token-decision-draft-count",
    "label": "Twelve owner token decision drafts required",
    "state": "required"
  },
  {
    "id": "token-policy-draft-count",
    "label": "Twelve token policy drafts required",
    "state": "required"
  },
  {
    "id": "token-audit-draft-count",
    "label": "Twelve token audit drafts required",
    "state": "required"
  },
  {
    "id": "manual-token-review-only",
    "label": "Token drafts remain pending manual owner implementation",
    "state": "required"
  },
  {
    "id": "no-auto-token",
    "label": "Automatic token issuance from decision records is blocked",
    "state": "required"
  },
  {
    "id": "no-secret-activation",
    "label": "No hidden activation permissions allowed",
    "state": "required"
  },
  {
    "id": "human-operator-visible",
    "label": "Activation token draft status must be visible to the operator console",
    "state": "required"
  },
  {
    "id": "bounded-token-language",
    "label": "Every token draft requires bounded activation language",
    "state": "required"
  },
  {
    "id": "phase-107-handoff",
    "label": "Phase 107 handoff notes required",
    "state": "required"
  },
  {
    "id": "draft-only-token-level",
    "label": "Every activation token draft remains draft-only",
    "state": "required"
  },
  {
    "id": "decision-does-not-equal-token",
    "label": "Recorded decision does not issue a token",
    "state": "required"
  },
  {
    "id": "implementation-phase-required",
    "label": "Future token implementation phase required before token issuance",
    "state": "required"
  }
];

const workerActivationTokenDraftFields = [
  "workerActivationTokenDraftId",
  "status",
  "owner",
  "operatorAuthorityOwner",
  "sourcePhase",
  "sourceWorkerActivationDecisionRecordId",
  "phase105WorkerActivationDecisionRecordReady",
  "activationTokenDraftCount",
  "ownerTokenDecisionDraftCount",
  "tokenPolicyDraftCount",
  "tokenAuditDraftCount",
  "activationTokenDenialRecordCount",
  "roadmapTrackCount",
  "multiLanguageProductionTargetCount",
  "safetyGateCount",
  "workerActivationTokenDraftAllowed",
  "workerActivationDecisionRecordReadAllowed",
  "activationTokenDraftManifestAllowed",
  "ownerReviewTokenDraftPacketAllowed",
  "ownerTokenDecisionDraftAllowed",
  "tokenPolicyDraftAllowed",
  "tokenDenialRecordAllowed",
  "activationTokenIssuanceAllowed",
  "activationCredentialIssuanceAllowed",
  "tokenMaterialGenerationAllowed",
  "secretMaterialGenerationAllowed",
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
  "activationTokenDrafts",
  "ownerTokenDecisionDrafts",
  "tokenPolicyDrafts",
  "tokenAuditDrafts",
  "activationTokenDenialRecords",
  "activationTokenBoundaryCatalog",
  "decisionRecordReferenceCatalog",
  "activationDecisionRecordReferences",
  "activationTokenDraftManifest",
  "ownerReviewManifest",
  "futurePhaseHandoff",
  "requirements",
  "declaredPaths",
  "roadmapTracks",
  "multiLanguageProductionTargets",
  "checks",
  "blockers",
  "validationFailedCount",
  "activationTokenDraftPacketProduced",
  "activationTokenDraftManifestProduced",
  "ownerTokenDecisionDraftManifestProduced",
  "tokenPolicyDraftManifestProduced",
  "tokenAuditDraftManifestProduced",
  "activationTokenDenialManifestProduced",
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
  "activationTokenIssued",
  "activationCredentialIssued",
  "tokenMaterialGenerated",
  "secretMaterialGenerated",
  "generatedAt",
  "packetPath",
  "activationTokenDraftManifestPath",
  "activationTokenDraftsPath",
  "ownerTokenDecisionDraftManifestPath",
  "tokenPolicyDraftManifestPath",
  "tokenAuditDraftManifestPath",
  "activationTokenDenialManifestPath",
  "ownerReviewManifestPath",
  "activationTokenBoundaryManifestPath",
  "decisionRecordReferenceManifestPath",
  "activationDecisionRecordReferenceManifestPath",
  "activationTokenSummaryPath",
  "tokenIssuanceBlockManifestPath",
  "tokenDraftLedgerPath",
  "tokenDraftLedgerProduced",
  "tokenImplementationBlocked",
  "activationImplementationBlocked",
  "tokenDraftAuditTrailPath",
  "tokenLevel",
  "activationTokenDraftStatus",
  "ownerTokenDecisionStatus",
  "futureImplementationRequired",
  "tokenIssuanceBlocked",
  "tokenCredentialIssued",
  "tokenSecretMaterialPath",
  "tokenSecretMaterialProduced"
];

const sourceActivationDecisionRecords = [
  {
    "workerId": "worker.phase-planner",
    "decisionRecordId": "activation-decision-record.worker.phase-planner",
    "lane": "phase-development",
    "cardId": "card.worker.phase-planner"
  },
  {
    "workerId": "worker.spec-writer",
    "decisionRecordId": "activation-decision-record.worker.spec-writer",
    "lane": "phase-development",
    "cardId": "card.worker.spec-writer"
  },
  {
    "workerId": "worker.overlay-packager",
    "decisionRecordId": "activation-decision-record.worker.overlay-packager",
    "lane": "phase-development",
    "cardId": "card.worker.overlay-packager"
  },
  {
    "workerId": "worker.validator",
    "decisionRecordId": "activation-decision-record.worker.validator",
    "lane": "validation-and-qa",
    "cardId": "card.worker.validator"
  },
  {
    "workerId": "worker.evidence",
    "decisionRecordId": "activation-decision-record.worker.evidence",
    "lane": "evidence-and-audit",
    "cardId": "card.worker.evidence"
  },
  {
    "workerId": "worker.knowledge",
    "decisionRecordId": "activation-decision-record.worker.knowledge",
    "lane": "knowledge-and-ingest",
    "cardId": "card.worker.knowledge"
  },
  {
    "workerId": "worker.console",
    "decisionRecordId": "activation-decision-record.worker.console",
    "lane": "operator-console",
    "cardId": "card.worker.console"
  },
  {
    "workerId": "worker.local-ops",
    "decisionRecordId": "activation-decision-record.worker.local-ops",
    "lane": "local-worker-ops",
    "cardId": "card.worker.local-ops"
  },
  {
    "workerId": "worker.release",
    "decisionRecordId": "activation-decision-record.worker.release",
    "lane": "release-management",
    "cardId": "card.worker.release"
  },
  {
    "workerId": "worker.revenue",
    "decisionRecordId": "activation-decision-record.worker.revenue",
    "lane": "revenue-acceleration",
    "cardId": "card.worker.revenue"
  },
  {
    "workerId": "worker.ingest",
    "decisionRecordId": "activation-decision-record.worker.ingest",
    "lane": "universal-ingest",
    "cardId": "card.worker.ingest"
  },
  {
    "workerId": "worker.media",
    "decisionRecordId": "activation-decision-record.worker.media",
    "lane": "creator-media",
    "cardId": "card.worker.media"
  }
];

const roadmapTracks = [
  "safe execution spine", "branch developer", "phase factory", "sandbox learning", "revenue acceleration", "universal ingest",
  "production engine", "rights/provenance", "creator/media", "domain studios", "client/public surfaces", "mobile/private JARVIS", "fleet/agency/product platform",
];

const multiLanguageProductionTargets = [
  "Python", "TypeScript", "JavaScript", "PowerShell", "Bash", "SQL", "HTML", "CSS", "Markdown",
  "JSON", "YAML", "GraphQL", "REST", "OpenAPI", "React", "Node", "Windows Task Scheduler", "Local Worker",
];

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n", "utf8");
}

function isSafeRelativePath(value) {
  return typeof value === "string" && value.length > 0 && !path.isAbsolute(value) && !value.includes("..") && !value.includes("\\");
}

function makeTokenDrafts() {
  return sourceActivationDecisionRecords.map((record) => ({
    tokenDraftId: `activation-token-draft.${record.workerId}`,
    workerId: record.workerId,
    sourceDecisionRecordId: record.decisionRecordId,
    cardId: record.cardId,
    lane: record.lane,
    tokenLevel: "draft-only",
    tokenStatus: "not-issued",
    ownerTokenDecisionStatus: "pending-owner-review",
    draftedDecision: "defer token issuance until future implementation phase",
    tokenIssuanceApproved: false,
    ownerTokenReviewRequired: true,
    futureImplementationRequired: true,
    tokenImplementationBlocked: true,
    activationImplementationBlocked: true,
    tokenIssuanceBlocked: true,
    tokenIssued: false,
    credentialIssued: false,
    tokenMaterialGenerated: false,
    secretMaterialGenerated: false,
    activationAllowed: false,
    executionAllowed: false,
    decisionRecordReferences: [record.decisionRecordId],
    tokenPolicyDraft: { policyDraftId: `token-policy-draft.${record.workerId}`, status: "drafted-for-owner-review", tokenIssuanceAllowed: false },
    tokenAuditDraft: { auditDraftId: `token-audit-draft.${record.workerId}`, auditStatus: "drafted-for-owner-review", tokenIssued: false },
    tokenDenialRecord: { denialRecordId: `activation-token-denial.${record.workerId}`, tokenIssuanceDeniedForThisPhase: true, tokenIssued: false, credentialIssued: false },
    ownerTokenDecisionDraft: { ownerTokenDecisionDraftId: `owner-token-decision-draft.${record.workerId}`, recordedDecision: "defer token issuance", tokenIssuanceApproved: false },
  }));
}

export function createDefaultWorkerActivationTokenDraftV1(overrides = {}) {
  const tokenDrafts = makeTokenDrafts();
  const boundaries = {
    activationTokenIssuanceAllowed: false,
    activationCredentialIssuanceAllowed: false,
    tokenMaterialGenerationAllowed: false,
    secretMaterialGenerationAllowed: false,
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
    ...(overrides.boundaries ?? {}),
  };
  return {
    workerActivationTokenDraftId: "phase106-demo-worker-activation-token-draft",
    status: "worker-activation-token-draft-ready",
    owner: "Tyler Wallace",
    operatorAuthorityOwner: "Driana Smith-Wallace",
    sourcePhase: "Phase 105 — Worker Activation Decision Record v1",
    sourceWorkerActivationDecisionRecordId: "phase105-demo-worker-activation-decision-record",
    phase105WorkerActivationDecisionRecordReady: true,
    approvalRecord: { approved: true, approvedBy: "Tyler Wallace", selfApproved: false, approvalMode: "manual-owner-review" },
    activationTokenDrafts: cloneJson(tokenDrafts),
    ownerTokenDecisionDrafts: cloneJson(tokenDrafts.map((item) => item.ownerTokenDecisionDraft)),
    tokenPolicyDrafts: cloneJson(tokenDrafts.map((item) => item.tokenPolicyDraft)),
    tokenAuditDrafts: cloneJson(tokenDrafts.map((item) => item.tokenAuditDraft)),
    activationTokenDenialRecords: cloneJson(tokenDrafts.map((item) => item.tokenDenialRecord)),
    activationTokenBoundaryCatalog: cloneJson(tokenDrafts.map((item) => ({ workerId: item.workerId, tokenLevel: item.tokenLevel, tokenIssuanceAllowed: false, tokenMaterialGenerationAllowed: false }))),
    decisionRecordReferenceCatalog: cloneJson(sourceActivationDecisionRecords),
    activationDecisionRecordReferences: cloneJson(sourceActivationDecisionRecords.map((item) => item.decisionRecordId)),
    futurePhaseHandoff: { phase: "Phase 107", title: "Worker Activation Token Review Record v1", note: "Review drafted token requirements without issuing tokens or credentials." },
    requirements: cloneJson(workerActivationTokenDraftRequirements),
    declaredPaths: [...declaredPaths],
    roadmapTracks: [...roadmapTracks],
    multiLanguageProductionTargets: [...multiLanguageProductionTargets],
    expectedActivationTokenDraftCount: 12,
    expectedOwnerTokenDecisionDraftCount: 12,
    expectedTokenPolicyDraftCount: 12,
    expectedTokenAuditDraftCount: 12,
    expectedActivationTokenDenialRecordCount: 12,
    safetyGateCount: 2160,
    workerActivationTokenDraftAllowed: true,
    workerActivationDecisionRecordReadAllowed: true,
    activationTokenDraftManifestAllowed: true,
    ownerReviewTokenDraftPacketAllowed: true,
    ownerTokenDecisionDraftAllowed: true,
    tokenPolicyDraftAllowed: true,
    tokenDenialRecordAllowed: true,
    boundaries,
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
    tokenCredentialIssued: false,
    tokenMaterialGenerated: false,
    secretMaterialGenerated: false,
    tokenImplementationBlocked: true,
    activationImplementationBlocked: true,
    ...overrides,
    boundaries,
  };
}

function checkFalse(blockers, config, keys) {
  for (const key of keys) {
    if (config.boundaries?.[key] !== false) blockers.push(`${key} must remain false`);
  }
}

function checkRuntimeFalse(blockers, config, keys) {
  for (const key of keys) {
    if (config[key] !== false) blockers.push(`${key} must remain false`);
  }
}

export function inspectWorkerActivationTokenDraftV1(config = createDefaultWorkerActivationTokenDraftV1()) {
  const blockers = [];
  const checks = [];
  const addCheck = (id, passed, message) => { checks.push({ id, passed, message }); if (!passed) blockers.push(message); };

  addCheck("phase-105-ready", config.phase105WorkerActivationDecisionRecordReady === true, "Phase 105 Worker Activation Decision Record must be ready before Phase 106.");
  addCheck("phase-105-lineage", config.sourceWorkerActivationDecisionRecordId === "phase105-demo-worker-activation-decision-record", "Phase 106 must link to the Phase 105 Worker Activation Decision Record.");
  addCheck("owner-approval", config.approvalRecord?.approved === true && config.approvalRecord?.approvedBy === "Tyler Wallace", "Tyler Wallace approval record is required for Phase 106 Worker Activation Token Draft.");
  addCheck("self-approval-blocked", config.approvalRecord?.selfApproved === false, "Self-approval is blocked for Phase 106 Worker Activation Token Draft.");
  addCheck("safe-paths", (config.declaredPaths ?? []).every(isSafeRelativePath), "Phase 106 declared paths must be safe relative paths.");

  const tokenDrafts = config.activationTokenDrafts ?? [];
  const expectedTokenDraftCount = config.expectedActivationTokenDraftCount ?? 12;
  addCheck("activation-token-draft-count", tokenDrafts.length === expectedTokenDraftCount, `Expected ${expectedTokenDraftCount} activation token drafts.`);
  addCheck("owner-token-decision-draft-count", (config.ownerTokenDecisionDrafts ?? []).length === (config.expectedOwnerTokenDecisionDraftCount ?? 12), "Expected 12 owner token decision drafts.");
  addCheck("token-policy-draft-count", (config.tokenPolicyDrafts ?? []).length === (config.expectedTokenPolicyDraftCount ?? 12), "Expected 12 token policy drafts.");
  addCheck("token-audit-draft-count", (config.tokenAuditDrafts ?? []).length === (config.expectedTokenAuditDraftCount ?? 12), "Expected 12 token audit drafts.");
  addCheck("activation-token-denial-record-count", (config.activationTokenDenialRecords ?? []).length === (config.expectedActivationTokenDenialRecordCount ?? 12), "Expected 12 activation token denial records.");

  for (const item of tokenDrafts) {
    const id = item?.tokenDraftId ?? "activation-token-draft.worker.unknown";
    if (!String(id).startsWith("activation-token-draft.worker.")) blockers.push(`${id} must use activation-token-draft.worker.* id.`);
    if (!String(item?.workerId ?? "").startsWith("worker.")) blockers.push(`${id} must reference a safe worker id.`);
    if (!String(item?.sourceDecisionRecordId ?? "").startsWith("activation-decision-record.worker.")) blockers.push(`${id} must reference a Phase 105 activation-decision-record.worker record.`);
    if (item?.tokenLevel !== "draft-only") blockers.push(`${id} must remain draft-only.`);
    if (item?.tokenStatus !== "not-issued") blockers.push(`${id} token status must remain not-issued.`);
    if (item?.draftedDecision !== "defer token issuance until future implementation phase") blockers.push(`${id} must defer token issuance.`);
    if (item?.tokenIssuanceApproved !== false) blockers.push(`${id} token issuance approval must remain false.`);
    if (item?.ownerTokenReviewRequired !== true) blockers.push(`${id} requires owner token decision review.`);
    if (item?.futureImplementationRequired !== true) blockers.push(`${id} requires future token implementation phase.`);
    if (item?.tokenImplementationBlocked !== true) blockers.push(`${id} token implementation must remain blocked.`);
    if (item?.activationImplementationBlocked !== true) blockers.push(`${id} activation implementation must remain blocked.`);
    if (item?.tokenIssuanceBlocked !== true) blockers.push(`${id} token issuance must remain blocked.`);
    if (item?.tokenIssued !== false || item?.credentialIssued !== false) blockers.push(`${id} No activation token or credential may be issued.`);
    if (item?.tokenMaterialGenerated !== false || item?.secretMaterialGenerated !== false) blockers.push(`${id} No token or secret material may be generated.`);
    if (item?.activationAllowed !== false) blockers.push(`${id} activation must remain blocked.`);
    if (item?.executionAllowed !== false) blockers.push(`${id} execution must remain blocked.`);
    if (!Array.isArray(item?.decisionRecordReferences) || item.decisionRecordReferences.length === 0) blockers.push(`${id} requires decision record references.`);
    if (item?.tokenPolicyDraft?.status !== "drafted-for-owner-review") blockers.push(`${id} token policy draft must be drafted-for-owner-review.`);
    if (item?.tokenAuditDraft?.auditStatus !== "drafted-for-owner-review") blockers.push(`${id} token audit draft must be drafted-for-owner-review.`);
    if (item?.tokenDenialRecord?.tokenIssuanceDeniedForThisPhase !== true || item?.tokenDenialRecord?.tokenIssued !== false) blockers.push(`${id} activation token denial record must deny issuance for this phase.`);
    if (item?.ownerTokenDecisionDraft?.recordedDecision !== "defer token issuance" || item?.ownerTokenDecisionDraft?.tokenIssuanceApproved !== false) blockers.push(`${id} owner token decision draft must defer token issuance.`);
  }

  const falseBoundaryKeys = ["activationTokenIssuanceAllowed", "activationCredentialIssuanceAllowed", "tokenMaterialGenerationAllowed", "secretMaterialGenerationAllowed", "workerActivationAllowed", "workerExecutionAllowed", "workerSpawningAllowed", "autonomousDelegationAllowed", "schedulerWorkflowMutationAllowed", "iPhoneAutomationMutationAllowed", "awayModeExecutionAllowed", "fleetExecutionAllowed", "applyExecutionAllowed", "patchExecutionAllowed", "projectRepoSourceMutationAllowed", "realProjectBranchCreationAllowed", "realProjectMergeExecutionAllowed", "gitPushAllowed", "tagCreationAllowed", "arbitraryCommandAllowed", "shellExecutionAllowed", "selfApprovalAllowed", "selfMergeAllowed", "selfDeployAllowed", "productionDeploymentAllowed"];
  checkFalse(blockers, config, falseBoundaryKeys);
  const falseRuntimeKeys = ["projectRepoSourceMutated", "workerActivated", "workerExecuted", "workerSpawned", "autonomousDelegationExecuted", "schedulerWorkflowMutated", "iPhoneAutomationMutated", "awayModeExecuted", "fleetExecuted", "applyExecuted", "patchExecuted", "realProjectBranchCreated", "realProjectMergePerformed", "gitPushPerformed", "tagCreated", "shellExecuted", "productionDeployed", "activationTokenIssued", "activationCredentialIssued", "tokenCredentialIssued", "tokenMaterialGenerated", "secretMaterialGenerated"];
  checkRuntimeFalse(blockers, config, falseRuntimeKeys);
  if (config.tokenImplementationBlocked !== true) blockers.push("tokenImplementationBlocked must remain true");
  if (config.activationImplementationBlocked !== true) blockers.push("activationImplementationBlocked must remain true");

  const validationFailedCount = blockers.length === 0 ? 0 : 1;
  return {
    ok: blockers.length === 0,
    workerActivationTokenDraftStatus: blockers.length === 0 ? "worker-activation-token-draft-ready" : "worker-activation-token-draft-validation-failed",
    validationFailedCount,
    declaredFileCount: (config.declaredPaths ?? []).length,
    workerActivationTokenDraftRequirementCount: workerActivationTokenDraftRequirements.length,
    workerActivationTokenDraftFieldCount: workerActivationTokenDraftFields.length,
    activationTokenDraftCount: tokenDrafts.length,
    ownerTokenDecisionDraftCount: (config.ownerTokenDecisionDrafts ?? []).length,
    tokenPolicyDraftCount: (config.tokenPolicyDrafts ?? []).length,
    tokenAuditDraftCount: (config.tokenAuditDrafts ?? []).length,
    activationTokenDenialRecordCount: (config.activationTokenDenialRecords ?? []).length,
    roadmapTrackCount: roadmapTracks.length,
    multiLanguageProductionTargetCount: multiLanguageProductionTargets.length,
    safetyGateCount: config.safetyGateCount,
    workerActivationTokenDraftAllowed: config.workerActivationTokenDraftAllowed,
    workerActivationDecisionRecordReadAllowed: config.workerActivationDecisionRecordReadAllowed,
    activationTokenDraftManifestAllowed: config.activationTokenDraftManifestAllowed,
    ownerReviewTokenDraftPacketAllowed: config.ownerReviewTokenDraftPacketAllowed,
    ownerTokenDecisionDraftAllowed: config.ownerTokenDecisionDraftAllowed,
    tokenPolicyDraftAllowed: config.tokenPolicyDraftAllowed,
    tokenDenialRecordAllowed: config.tokenDenialRecordAllowed,
    ...config.boundaries,
    workerActivationTokenDraftId: config.workerActivationTokenDraftId,
    sourceWorkerActivationDecisionRecordId: config.sourceWorkerActivationDecisionRecordId,
    phase105WorkerActivationDecisionRecordReady: config.phase105WorkerActivationDecisionRecordReady,
    approvalRecord: config.approvalRecord,
    activationTokenDrafts: tokenDrafts,
    ownerTokenDecisionDrafts: config.ownerTokenDecisionDrafts ?? [],
    tokenPolicyDrafts: config.tokenPolicyDrafts ?? [],
    tokenAuditDrafts: config.tokenAuditDrafts ?? [],
    activationTokenDenialRecords: config.activationTokenDenialRecords ?? [],
    activationTokenBoundaryCatalog: config.activationTokenBoundaryCatalog ?? [],
    decisionRecordReferenceCatalog: config.decisionRecordReferenceCatalog ?? [],
    activationDecisionRecordReferences: config.activationDecisionRecordReferences ?? [],
    requirements: config.requirements,
    declaredPaths: config.declaredPaths,
    roadmapTracks,
    multiLanguageProductionTargets,
    checks,
    blockers,
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
    tokenCredentialIssued: config.tokenCredentialIssued,
    tokenMaterialGenerated: config.tokenMaterialGenerated,
    secretMaterialGenerated: config.secretMaterialGenerated,
    tokenImplementationBlocked: config.tokenImplementationBlocked,
    activationImplementationBlocked: config.activationImplementationBlocked,
    tokenLevel: "draft-only",
    activationTokenDraftStatus: blockers.length === 0 ? "not-issued" : "validation-failed",
    ownerTokenDecisionStatus: blockers.length === 0 ? "pending-owner-review" : "validation-failed",
    futureImplementationRequired: true,
    tokenIssuanceBlocked: true,
    tokenSecretMaterialProduced: false,
    multiLanguageProductionDoctrineIncluded: true,
  };
}

export function runWorkerActivationTokenDraftV1(config = createDefaultWorkerActivationTokenDraftV1(), options = {}) {
  const inspection = inspectWorkerActivationTokenDraftV1(config);
  const artifactRoot = options.artifactRoot ?? process.cwd();
  const runRoot = path.join(artifactRoot, inspection.ok ? ".sera-worker-activation-token-draft" : ".sera-worker-activation-token-draft-test-failure");
  fs.mkdirSync(runRoot, { recursive: true });
  const generatedAt = new Date().toISOString();
  const activationTokenDraftManifest = { status: inspection.workerActivationTokenDraftStatus, count: inspection.activationTokenDraftCount, tokenIssuanceAllowed: false, generatedAt };
  const ownerTokenDecisionDraftManifest = { count: inspection.ownerTokenDecisionDraftCount, owner: config.owner, generatedAt };
  const tokenPolicyDraftManifest = { count: inspection.tokenPolicyDraftCount, tokenIssuanceAllowed: false, generatedAt };
  const tokenAuditDraftManifest = { count: inspection.tokenAuditDraftCount, generatedAt };
  const activationTokenDenialManifest = { count: inspection.activationTokenDenialRecordCount, tokenIssuanceDeniedForThisPhase: true, generatedAt };
  const ownerReviewManifest = { readyForOwnerReview: inspection.ok, owner: config.owner, operatorAuthorityOwner: config.operatorAuthorityOwner, generatedAt };
  const activationTokenBoundaryManifest = { boundaries: config.boundaries, tokenImplementationBlocked: config.tokenImplementationBlocked, generatedAt };
  const decisionRecordReferenceManifest = { references: config.activationDecisionRecordReferences, source: config.sourceWorkerActivationDecisionRecordId, generatedAt };
  const activationDecisionRecordReferenceManifest = { sourceWorkerActivationDecisionRecordId: config.sourceWorkerActivationDecisionRecordId, phase105WorkerActivationDecisionRecordReady: config.phase105WorkerActivationDecisionRecordReady, generatedAt };
  const activationTokenSummary = { status: inspection.workerActivationTokenDraftStatus, tokenIssued: false, credentialIssued: false, tokenMaterialGenerated: false, secretMaterialGenerated: false, generatedAt };
  const tokenIssuanceBlockManifest = { activationTokenIssued: false, activationCredentialIssued: false, tokenMaterialGenerated: false, secretMaterialGenerated: false, tokenImplementationBlocked: true, generatedAt };
  const tokenDraftLedger = { tokenDrafts: config.activationTokenDrafts, ownerTokenDecisionDrafts: config.ownerTokenDecisionDrafts, tokenPolicyDrafts: config.tokenPolicyDrafts, generatedAt };
  const packet = {
    ...inspection,
    status: inspection.workerActivationTokenDraftStatus,
    generatedAt,
    activationTokenDraftManifest,
    ownerTokenDecisionDraftManifest,
    tokenPolicyDraftManifest,
    tokenAuditDraftManifest,
    activationTokenDenialManifest,
    ownerReviewManifest,
    activationTokenBoundaryManifest,
    decisionRecordReferenceManifest,
    activationDecisionRecordReferenceManifest,
    activationTokenSummary,
    tokenIssuanceBlockManifest,
    tokenDraftLedger,
  };
  const packetPath = path.join(runRoot, "worker-activation-token-draft-packet.json");
  const activationTokenDraftManifestPath = path.join(runRoot, "activation-token-draft-manifest.json");
  const activationTokenDraftsPath = path.join(runRoot, "activation-token-drafts.json");
  const ownerTokenDecisionDraftManifestPath = path.join(runRoot, "owner-token-decision-draft-manifest.json");
  const tokenPolicyDraftManifestPath = path.join(runRoot, "token-policy-draft-manifest.json");
  const tokenAuditDraftManifestPath = path.join(runRoot, "token-audit-draft-manifest.json");
  const activationTokenDenialManifestPath = path.join(runRoot, "activation-token-denial-manifest.json");
  const ownerReviewManifestPath = path.join(runRoot, "owner-review-manifest.json");
  const activationTokenBoundaryManifestPath = path.join(runRoot, "activation-token-boundary-manifest.json");
  const decisionRecordReferenceManifestPath = path.join(runRoot, "decision-record-reference-manifest.json");
  const activationDecisionRecordReferenceManifestPath = path.join(runRoot, "activation-decision-record-reference-manifest.json");
  const activationTokenSummaryPath = path.join(runRoot, "activation-token-summary.json");
  const tokenIssuanceBlockManifestPath = path.join(runRoot, "token-issuance-block-manifest.json");
  const tokenDraftLedgerPath = path.join(runRoot, "token-draft-ledger.json");
  const tokenDraftAuditTrailPath = path.join(runRoot, "token-draft-audit-trail.json");
  const tokenSecretMaterialPath = path.join(runRoot, "token-secret-material-blocked.json");
  writeJson(packetPath, packet);
  writeJson(activationTokenDraftManifestPath, activationTokenDraftManifest);
  writeJson(activationTokenDraftsPath, config.activationTokenDrafts);
  writeJson(ownerTokenDecisionDraftManifestPath, ownerTokenDecisionDraftManifest);
  writeJson(tokenPolicyDraftManifestPath, tokenPolicyDraftManifest);
  writeJson(tokenAuditDraftManifestPath, tokenAuditDraftManifest);
  writeJson(activationTokenDenialManifestPath, activationTokenDenialManifest);
  writeJson(ownerReviewManifestPath, ownerReviewManifest);
  writeJson(activationTokenBoundaryManifestPath, activationTokenBoundaryManifest);
  writeJson(decisionRecordReferenceManifestPath, decisionRecordReferenceManifest);
  writeJson(activationDecisionRecordReferenceManifestPath, activationDecisionRecordReferenceManifest);
  writeJson(activationTokenSummaryPath, activationTokenSummary);
  writeJson(tokenIssuanceBlockManifestPath, tokenIssuanceBlockManifest);
  writeJson(tokenDraftLedgerPath, tokenDraftLedger);
  writeJson(tokenDraftAuditTrailPath, { tokenAuditDrafts: config.tokenAuditDrafts, generatedAt });
  writeJson(tokenSecretMaterialPath, { tokenSecretMaterialProduced: false, secretMaterialGenerated: false, generatedAt });

  return {
    ...inspection,
    ok: inspection.ok,
    activationTokenDraftPacketProduced: true,
    activationTokenDraftManifestProduced: true,
    ownerTokenDecisionDraftManifestProduced: true,
    tokenPolicyDraftManifestProduced: true,
    tokenAuditDraftManifestProduced: true,
    activationTokenDenialManifestProduced: true,
    ownerReviewManifestProduced: true,
    tokenDraftLedgerProduced: true,
    readyForOwnerReview: ownerReviewManifest.readyForOwnerReview,
    generatedAt,
    packetPath,
    activationTokenDraftManifestPath,
    activationTokenDraftsPath,
    ownerTokenDecisionDraftManifestPath,
    tokenPolicyDraftManifestPath,
    tokenAuditDraftManifestPath,
    activationTokenDenialManifestPath,
    ownerReviewManifestPath,
    activationTokenBoundaryManifestPath,
    decisionRecordReferenceManifestPath,
    activationDecisionRecordReferenceManifestPath,
    activationTokenSummaryPath,
    tokenIssuanceBlockManifestPath,
    tokenDraftLedgerPath,
    tokenDraftAuditTrailPath,
    tokenSecretMaterialPath,
  };
}

export const workerActivationTokenDraftV1 = {
  declaredPaths,
  workerActivationTokenDraftRequirements,
  workerActivationTokenDraftFields,
  sourceActivationDecisionRecords,
  roadmapTracks,
  multiLanguageProductionTargets,
  createDefaultWorkerActivationTokenDraftV1,
  inspectWorkerActivationTokenDraftV1,
  runWorkerActivationTokenDraftV1,
};
