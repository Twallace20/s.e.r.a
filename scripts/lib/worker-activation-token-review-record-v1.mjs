import fs from "node:fs";
import path from "node:path";

const declaredPaths = [
  "docs/phases/PHASE_107_WORKER_ACTIVATION_TOKEN_REVIEW_RECORD_V1.md",
  "scripts/lib/worker-activation-token-review-record-v1.mjs",
  "scripts/run-worker-activation-token-review-record-v1.mjs",
  "tests/integration/worker-activation-token-review-record-v1.test.ts",
  "apps/operator-console/src/worker-activation-token-review-record.ts",
];

const workerActivationTokenReviewRecordRequirements = [
  {
    "id": "phase-105-ready",
    "label": "Phase 106 Worker Activation Token Draft ready",
    "state": "required"
  },
  {
    "id": "phase-105-lineage",
    "label": "Phase 106 lineage required",
    "state": "required"
  },
  {
    "id": "owner-approval-required",
    "label": "Tyler Wallace activation token review record approval required",
    "state": "required"
  },
  {
    "id": "operator-authority-preserved",
    "label": "Driana Smith-Wallace operator authority preserved",
    "state": "required"
  },
  {
    "id": "token-review-record-review-only",
    "label": "Worker Activation Token Review Record is evidence only",
    "state": "required"
  },
  {
    "id": "token-review-record-catalog",
    "label": "Activation token review record catalog required",
    "state": "required"
  },
  {
    "id": "owner-token-review-required",
    "label": "Owner token review draft required for every worker",
    "state": "required"
  },
  {
    "id": "token-policy-review-record-required",
    "label": "Token policy draft required for every worker",
    "state": "required"
  },
  {
    "id": "token-audit-review-record-required",
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
    "label": "Phase 106 token draft references required",
    "state": "required"
  },
  {
    "id": "owner-review-manifest",
    "label": "Owner review manifest required",
    "state": "required"
  },
  {
    "id": "safe-artifact-paths",
    "label": "Activation token review record artifact paths must remain safe relative paths",
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
    "label": "Worker Activation Token Review Record validation must fail closed",
    "state": "required"
  },
  {
    "id": "activation-token-review-record-count",
    "label": "Twelve activation token review records required",
    "state": "required"
  },
  {
    "id": "owner-token-review-record-count",
    "label": "Twelve owner token review records required",
    "state": "required"
  },
  {
    "id": "token-policy-review-record-count",
    "label": "Twelve token policy review records required",
    "state": "required"
  },
  {
    "id": "token-audit-review-record-count",
    "label": "Twelve token audit review records required",
    "state": "required"
  },
  {
    "id": "manual-token-review-only",
    "label": "Token Review Records remain pending manual owner implementation",
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
    "label": "Activation token review record status must be visible to the operator console",
    "state": "required"
  },
  {
    "id": "bounded-token-language",
    "label": "Every token review record requires bounded activation language",
    "state": "required"
  },
  {
    "id": "phase-107-handoff",
    "label": "Phase 107 handoff notes required",
    "state": "required"
  },
  {
    "id": "draft-only-token-level",
    "label": "Every activation token review record remains draft-only",
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

const workerActivationTokenReviewRecordFields = [
  "workerActivationTokenReviewRecordId",
  "status",
  "owner",
  "operatorAuthorityOwner",
  "sourcePhase",
  "sourceWorkerActivationTokenDraftId",
  "phase106WorkerActivationTokenDraftReady",
  "activationTokenReviewRecordCount",
  "ownerTokenReviewRecordCount",
  "tokenPolicyReviewRecordCount",
  "tokenAuditReviewRecordCount",
  "activationTokenReviewDenialRecordCount",
  "roadmapTrackCount",
  "multiLanguageProductionTargetCount",
  "safetyGateCount",
  "workerActivationTokenReviewRecordAllowed",
  "workerActivationTokenDraftReadAllowed",
  "activationTokenReviewRecordManifestAllowed",
  "ownerReviewTokenReviewRecordPacketAllowed",
  "ownerTokenReviewRecordAllowed",
  "tokenPolicyReviewRecordAllowed",
  "tokenReviewDenialRecordAllowed",
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
  "activationTokenReviewRecords",
  "ownerTokenReviewRecords",
  "tokenPolicyReviewRecords",
  "tokenAuditReviewRecords",
  "activationTokenReviewDenialRecords",
  "activationTokenBoundaryCatalog",
  "tokenReviewRecordReferenceCatalog",
  "activationTokenReviewRecordReferences",
  "activationTokenReviewRecordManifest",
  "ownerReviewManifest",
  "futurePhaseHandoff",
  "requirements",
  "declaredPaths",
  "roadmapTracks",
  "multiLanguageProductionTargets",
  "checks",
  "blockers",
  "validationFailedCount",
  "activationTokenReviewRecordPacketProduced",
  "activationTokenReviewRecordManifestProduced",
  "ownerTokenReviewRecordManifestProduced",
  "tokenPolicyReviewRecordManifestProduced",
  "tokenAuditReviewRecordManifestProduced",
  "activationTokenReviewDenialRecordManifestProduced",
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
  "activationTokenReviewRecordManifestPath",
  "activationTokenReviewRecordsPath",
  "ownerTokenReviewRecordManifestPath",
  "tokenPolicyReviewRecordManifestPath",
  "tokenAuditReviewRecordManifestPath",
  "activationTokenDenialManifestPath",
  "ownerReviewManifestPath",
  "activationTokenBoundaryManifestPath",
  "tokenReviewRecordReferenceManifestPath",
  "activationTokenReviewRecordReferenceManifestPath",
  "activationTokenSummaryPath",
  "tokenIssuanceBlockManifestPath",
  "tokenReviewRecordLedgerPath",
  "tokenReviewRecordLedgerProduced",
  "tokenImplementationBlocked",
  "activationImplementationBlocked",
  "tokenReviewRecordAuditTrailPath",
  "tokenLevel",
  "activationTokenReviewRecordStatus",
  "ownerTokenDecisionStatus",
  "futureImplementationRequired",
  "tokenIssuanceBlocked",
  "tokenCredentialIssued",
  "tokenSecretMaterialPath",
  "tokenSecretMaterialProduced"
];

const sourceActivationTokenDrafts = [
  {
    "workerId": "worker.phase-planner",
    "tokenDraftId": "activation-token-draft.worker.phase-planner",
    "lane": "phase-development",
    "cardId": "card.worker.phase-planner"
  },
  {
    "workerId": "worker.spec-writer",
    "tokenDraftId": "activation-token-draft.worker.spec-writer",
    "lane": "phase-development",
    "cardId": "card.worker.spec-writer"
  },
  {
    "workerId": "worker.overlay-packager",
    "tokenDraftId": "activation-token-draft.worker.overlay-packager",
    "lane": "phase-development",
    "cardId": "card.worker.overlay-packager"
  },
  {
    "workerId": "worker.validator",
    "tokenDraftId": "activation-token-draft.worker.validator",
    "lane": "validation-and-qa",
    "cardId": "card.worker.validator"
  },
  {
    "workerId": "worker.evidence",
    "tokenDraftId": "activation-token-draft.worker.evidence",
    "lane": "evidence-and-audit",
    "cardId": "card.worker.evidence"
  },
  {
    "workerId": "worker.knowledge",
    "tokenDraftId": "activation-token-draft.worker.knowledge",
    "lane": "knowledge-and-ingest",
    "cardId": "card.worker.knowledge"
  },
  {
    "workerId": "worker.console",
    "tokenDraftId": "activation-token-draft.worker.console",
    "lane": "operator-console",
    "cardId": "card.worker.console"
  },
  {
    "workerId": "worker.local-ops",
    "tokenDraftId": "activation-token-draft.worker.local-ops",
    "lane": "local-worker-ops",
    "cardId": "card.worker.local-ops"
  },
  {
    "workerId": "worker.release",
    "tokenDraftId": "activation-token-draft.worker.release",
    "lane": "release-management",
    "cardId": "card.worker.release"
  },
  {
    "workerId": "worker.revenue",
    "tokenDraftId": "activation-token-draft.worker.revenue",
    "lane": "revenue-acceleration",
    "cardId": "card.worker.revenue"
  },
  {
    "workerId": "worker.ingest",
    "tokenDraftId": "activation-token-draft.worker.ingest",
    "lane": "universal-ingest",
    "cardId": "card.worker.ingest"
  },
  {
    "workerId": "worker.media",
    "tokenDraftId": "activation-token-draft.worker.media",
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
  return sourceActivationTokenDrafts.map((record) => ({
    tokenDraftId: `activation-token-review-record.${record.workerId}`,
    workerId: record.workerId,
    sourceTokenDraftId: record.tokenDraftId,
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
    tokenReviewRecordReferences: [record.tokenDraftId],
    tokenPolicyReviewRecord: { policyDraftId: `token-policy-review-record.${record.workerId}`, status: "drafted-for-owner-review", tokenIssuanceAllowed: false },
    tokenAuditReviewRecord: { auditDraftId: `token-audit-review-record.${record.workerId}`, auditStatus: "drafted-for-owner-review", tokenIssued: false },
    tokenDenialRecord: { denialRecordId: `activation-token-review-denial.${record.workerId}`, tokenIssuanceDeniedForThisPhase: true, tokenIssued: false, credentialIssued: false },
    ownerTokenReviewRecord: { ownerTokenReviewRecordId: `owner-token-review-record.${record.workerId}`, recordedDecision: "defer token issuance", tokenIssuanceApproved: false },
  }));
}

export function createDefaultWorkerActivationTokenReviewRecordV1(overrides = {}) {
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
    workerActivationTokenReviewRecordId: "phase107-demo-worker-activation-token-review-record",
    status: "worker-activation-token-review-record-ready",
    owner: "Tyler Wallace",
    operatorAuthorityOwner: "Driana Smith-Wallace",
    sourcePhase: "Phase 106 — Worker Activation Token Draft v1",
    sourceWorkerActivationTokenDraftId: "phase106-demo-worker-activation-token-draft",
    phase106WorkerActivationTokenDraftReady: true,
    approvalRecord: { approved: true, approvedBy: "Tyler Wallace", selfApproved: false, approvalMode: "manual-owner-review" },
    activationTokenReviewRecords: cloneJson(tokenDrafts),
    ownerTokenReviewRecords: cloneJson(tokenDrafts.map((item) => item.ownerTokenReviewRecord)),
    tokenPolicyReviewRecords: cloneJson(tokenDrafts.map((item) => item.tokenPolicyReviewRecord)),
    tokenAuditReviewRecords: cloneJson(tokenDrafts.map((item) => item.tokenAuditReviewRecord)),
    activationTokenReviewDenialRecords: cloneJson(tokenDrafts.map((item) => item.tokenDenialRecord)),
    activationTokenBoundaryCatalog: cloneJson(tokenDrafts.map((item) => ({ workerId: item.workerId, tokenLevel: item.tokenLevel, tokenIssuanceAllowed: false, tokenMaterialGenerationAllowed: false }))),
    tokenReviewRecordReferenceCatalog: cloneJson(sourceActivationTokenDrafts),
    activationTokenReviewRecordReferences: cloneJson(sourceActivationTokenDrafts.map((item) => item.tokenDraftId)),
    futurePhaseHandoff: { phase: "Phase 108", title: "Worker Activation Token Control Register v1", note: "Register token control requirements while still blocking token issuance and worker execution." },
    requirements: cloneJson(workerActivationTokenReviewRecordRequirements),
    declaredPaths: [...declaredPaths],
    roadmapTracks: [...roadmapTracks],
    multiLanguageProductionTargets: [...multiLanguageProductionTargets],
    expectedActivationTokenReviewRecordCount: 12,
    expectedOwnerTokenReviewRecordCount: 12,
    expectedTokenPolicyReviewRecordCount: 12,
    expectedTokenAuditReviewRecordCount: 12,
    expectedActivationTokenReviewDenialRecordCount: 12,
    safetyGateCount: 2220,
    workerActivationTokenReviewRecordAllowed: true,
    workerActivationTokenDraftReadAllowed: true,
    activationTokenReviewRecordManifestAllowed: true,
    ownerReviewTokenReviewRecordPacketAllowed: true,
    ownerTokenReviewRecordAllowed: true,
    tokenPolicyReviewRecordAllowed: true,
    tokenReviewDenialRecordAllowed: true,
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

export function inspectWorkerActivationTokenReviewRecordV1(config = createDefaultWorkerActivationTokenReviewRecordV1()) {
  const blockers = [];
  const checks = [];
  const addCheck = (id, passed, message) => { checks.push({ id, passed, message }); if (!passed) blockers.push(message); };

  addCheck("phase-105-ready", config.phase106WorkerActivationTokenDraftReady === true, "Phase 106 Worker Activation Token Draft must be ready before Phase 107.");
  addCheck("phase-105-lineage", config.sourceWorkerActivationTokenDraftId === "phase106-demo-worker-activation-token-draft", "Phase 107 must link to the Phase 106 Worker Activation Token Draft.");
  addCheck("owner-approval", config.approvalRecord?.approved === true && config.approvalRecord?.approvedBy === "Tyler Wallace", "Tyler Wallace approval record is required for Phase 107 Worker Activation Token Review Record.");
  addCheck("self-approval-blocked", config.approvalRecord?.selfApproved === false, "Self-approval is blocked for Phase 107 Worker Activation Token Review Record.");
  addCheck("safe-paths", (config.declaredPaths ?? []).every(isSafeRelativePath), "Phase 107 declared paths must be safe relative paths.");

  const tokenDrafts = config.activationTokenReviewRecords ?? [];
  const expectedTokenDraftCount = config.expectedActivationTokenReviewRecordCount ?? 12;
  addCheck("activation-token-review-record-count", tokenDrafts.length === expectedTokenDraftCount, `Expected ${expectedTokenDraftCount} activation token review records.`);
  addCheck("owner-token-review-record-count", (config.ownerTokenReviewRecords ?? []).length === (config.expectedOwnerTokenReviewRecordCount ?? 12), "Expected 12 owner token review records.");
  addCheck("token-policy-review-record-count", (config.tokenPolicyReviewRecords ?? []).length === (config.expectedTokenPolicyReviewRecordCount ?? 12), "Expected 12 token policy review records.");
  addCheck("token-audit-review-record-count", (config.tokenAuditReviewRecords ?? []).length === (config.expectedTokenAuditReviewRecordCount ?? 12), "Expected 12 token audit review records.");
  addCheck("activation-token-review-denial-record-count", (config.activationTokenReviewDenialRecords ?? []).length === (config.expectedActivationTokenReviewDenialRecordCount ?? 12), "Expected 12 activation token review denial records.");

  for (const item of tokenDrafts) {
    const id = item?.tokenDraftId ?? "activation-token-review-record.worker.unknown";
    if (!String(id).startsWith("activation-token-review-record.worker.")) blockers.push(`${id} must use activation-token-review-record.worker.* id.`);
    if (!String(item?.workerId ?? "").startsWith("worker.")) blockers.push(`${id} must reference a safe worker id.`);
    if (!String(item?.sourceTokenDraftId ?? "").startsWith("activation-token-draft.worker.")) blockers.push(`${id} must reference a Phase 106 activation-token-draft.worker record.`);
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
    if (!Array.isArray(item?.tokenReviewRecordReferences) || item.tokenReviewRecordReferences.length === 0) blockers.push(`${id} requires token draft references.`);
    if (item?.tokenPolicyReviewRecord?.status !== "drafted-for-owner-review") blockers.push(`${id} token policy review record must be drafted-for-owner-review.`);
    if (item?.tokenAuditReviewRecord?.auditStatus !== "drafted-for-owner-review") blockers.push(`${id} token audit review record must be drafted-for-owner-review.`);
    if (item?.tokenDenialRecord?.tokenIssuanceDeniedForThisPhase !== true || item?.tokenDenialRecord?.tokenIssued !== false) blockers.push(`${id} activation token review denial record must deny issuance for this phase.`);
    if (item?.ownerTokenReviewRecord?.recordedDecision !== "defer token issuance" || item?.ownerTokenReviewRecord?.tokenIssuanceApproved !== false) blockers.push(`${id} owner token review record must defer token issuance.`);
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
    workerActivationTokenReviewRecordStatus: blockers.length === 0 ? "worker-activation-token-review-record-ready" : "worker-activation-token-review-record-validation-failed",
    validationFailedCount,
    declaredFileCount: (config.declaredPaths ?? []).length,
    workerActivationTokenReviewRecordRequirementCount: workerActivationTokenReviewRecordRequirements.length,
    workerActivationTokenReviewRecordFieldCount: workerActivationTokenReviewRecordFields.length,
    activationTokenReviewRecordCount: tokenDrafts.length,
    ownerTokenReviewRecordCount: (config.ownerTokenReviewRecords ?? []).length,
    tokenPolicyReviewRecordCount: (config.tokenPolicyReviewRecords ?? []).length,
    tokenAuditReviewRecordCount: (config.tokenAuditReviewRecords ?? []).length,
    activationTokenReviewDenialRecordCount: (config.activationTokenReviewDenialRecords ?? []).length,
    roadmapTrackCount: roadmapTracks.length,
    multiLanguageProductionTargetCount: multiLanguageProductionTargets.length,
    safetyGateCount: config.safetyGateCount,
    workerActivationTokenReviewRecordAllowed: config.workerActivationTokenReviewRecordAllowed,
    workerActivationTokenDraftReadAllowed: config.workerActivationTokenDraftReadAllowed,
    activationTokenReviewRecordManifestAllowed: config.activationTokenReviewRecordManifestAllowed,
    ownerReviewTokenReviewRecordPacketAllowed: config.ownerReviewTokenReviewRecordPacketAllowed,
    ownerTokenReviewRecordAllowed: config.ownerTokenReviewRecordAllowed,
    tokenPolicyReviewRecordAllowed: config.tokenPolicyReviewRecordAllowed,
    tokenReviewDenialRecordAllowed: config.tokenReviewDenialRecordAllowed,
    ...config.boundaries,
    workerActivationTokenReviewRecordId: config.workerActivationTokenReviewRecordId,
    sourceWorkerActivationTokenDraftId: config.sourceWorkerActivationTokenDraftId,
    phase106WorkerActivationTokenDraftReady: config.phase106WorkerActivationTokenDraftReady,
    approvalRecord: config.approvalRecord,
    activationTokenReviewRecords: tokenDrafts,
    ownerTokenReviewRecords: config.ownerTokenReviewRecords ?? [],
    tokenPolicyReviewRecords: config.tokenPolicyReviewRecords ?? [],
    tokenAuditReviewRecords: config.tokenAuditReviewRecords ?? [],
    activationTokenReviewDenialRecords: config.activationTokenReviewDenialRecords ?? [],
    activationTokenBoundaryCatalog: config.activationTokenBoundaryCatalog ?? [],
    tokenReviewRecordReferenceCatalog: config.tokenReviewRecordReferenceCatalog ?? [],
    activationTokenReviewRecordReferences: config.activationTokenReviewRecordReferences ?? [],
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
    activationTokenReviewRecordStatus: blockers.length === 0 ? "not-issued" : "validation-failed",
    ownerTokenDecisionStatus: blockers.length === 0 ? "pending-owner-review" : "validation-failed",
    futureImplementationRequired: true,
    tokenIssuanceBlocked: true,
    tokenSecretMaterialProduced: false,
    multiLanguageProductionDoctrineIncluded: true,
  };
}

export function runWorkerActivationTokenReviewRecordV1(config = createDefaultWorkerActivationTokenReviewRecordV1(), options = {}) {
  const inspection = inspectWorkerActivationTokenReviewRecordV1(config);
  const artifactRoot = options.artifactRoot ?? process.cwd();
  const runRoot = path.join(artifactRoot, inspection.ok ? ".sera-worker-activation-token-review-record" : ".sera-worker-activation-token-review-record-test-failure");
  fs.mkdirSync(runRoot, { recursive: true });
  const generatedAt = new Date().toISOString();
  const activationTokenReviewRecordManifest = { status: inspection.workerActivationTokenReviewRecordStatus, count: inspection.activationTokenReviewRecordCount, tokenIssuanceAllowed: false, generatedAt };
  const ownerTokenReviewRecordManifest = { count: inspection.ownerTokenReviewRecordCount, owner: config.owner, generatedAt };
  const tokenPolicyReviewRecordManifest = { count: inspection.tokenPolicyReviewRecordCount, tokenIssuanceAllowed: false, generatedAt };
  const tokenAuditReviewRecordManifest = { count: inspection.tokenAuditReviewRecordCount, generatedAt };
  const activationTokenDenialManifest = { count: inspection.activationTokenReviewDenialRecordCount, tokenIssuanceDeniedForThisPhase: true, generatedAt };
  const ownerReviewManifest = { readyForOwnerReview: inspection.ok, owner: config.owner, operatorAuthorityOwner: config.operatorAuthorityOwner, generatedAt };
  const activationTokenBoundaryManifest = { boundaries: config.boundaries, tokenImplementationBlocked: config.tokenImplementationBlocked, generatedAt };
  const tokenReviewRecordReferenceManifest = { references: config.activationTokenReviewRecordReferences, source: config.sourceWorkerActivationTokenDraftId, generatedAt };
  const activationTokenReviewRecordReferenceManifest = { sourceWorkerActivationTokenDraftId: config.sourceWorkerActivationTokenDraftId, phase106WorkerActivationTokenDraftReady: config.phase106WorkerActivationTokenDraftReady, generatedAt };
  const activationTokenSummary = { status: inspection.workerActivationTokenReviewRecordStatus, tokenIssued: false, credentialIssued: false, tokenMaterialGenerated: false, secretMaterialGenerated: false, generatedAt };
  const tokenIssuanceBlockManifest = { activationTokenIssued: false, activationCredentialIssued: false, tokenMaterialGenerated: false, secretMaterialGenerated: false, tokenImplementationBlocked: true, generatedAt };
  const tokenDraftLedger = { tokenDrafts: config.activationTokenReviewRecords, ownerTokenReviewRecords: config.ownerTokenReviewRecords, tokenPolicyReviewRecords: config.tokenPolicyReviewRecords, generatedAt };
  const packet = {
    ...inspection,
    status: inspection.workerActivationTokenReviewRecordStatus,
    generatedAt,
    activationTokenReviewRecordManifest,
    ownerTokenReviewRecordManifest,
    tokenPolicyReviewRecordManifest,
    tokenAuditReviewRecordManifest,
    activationTokenDenialManifest,
    ownerReviewManifest,
    activationTokenBoundaryManifest,
    tokenReviewRecordReferenceManifest,
    activationTokenReviewRecordReferenceManifest,
    activationTokenSummary,
    tokenIssuanceBlockManifest,
    tokenDraftLedger,
  };
  const packetPath = path.join(runRoot, "worker-activation-token-review-record-packet.json");
  const activationTokenReviewRecordManifestPath = path.join(runRoot, "activation-token-review-record-manifest.json");
  const activationTokenReviewRecordsPath = path.join(runRoot, "activation-token-review-records.json");
  const ownerTokenReviewRecordManifestPath = path.join(runRoot, "owner-token-review-record-manifest.json");
  const tokenPolicyReviewRecordManifestPath = path.join(runRoot, "token-policy-review-record-manifest.json");
  const tokenAuditReviewRecordManifestPath = path.join(runRoot, "token-audit-review-record-manifest.json");
  const activationTokenDenialManifestPath = path.join(runRoot, "activation-token-review-denial-manifest.json");
  const ownerReviewManifestPath = path.join(runRoot, "owner-review-manifest.json");
  const activationTokenBoundaryManifestPath = path.join(runRoot, "activation-token-boundary-manifest.json");
  const tokenReviewRecordReferenceManifestPath = path.join(runRoot, "decision-record-reference-manifest.json");
  const activationTokenReviewRecordReferenceManifestPath = path.join(runRoot, "activation-token-draft-reference-manifest.json");
  const activationTokenSummaryPath = path.join(runRoot, "activation-token-summary.json");
  const tokenIssuanceBlockManifestPath = path.join(runRoot, "token-issuance-block-manifest.json");
  const tokenReviewRecordLedgerPath = path.join(runRoot, "token-review-record-ledger.json");
  const tokenReviewRecordAuditTrailPath = path.join(runRoot, "token-review-record-audit-trail.json");
  const tokenSecretMaterialPath = path.join(runRoot, "token-secret-material-blocked.json");
  writeJson(packetPath, packet);
  writeJson(activationTokenReviewRecordManifestPath, activationTokenReviewRecordManifest);
  writeJson(activationTokenReviewRecordsPath, config.activationTokenReviewRecords);
  writeJson(ownerTokenReviewRecordManifestPath, ownerTokenReviewRecordManifest);
  writeJson(tokenPolicyReviewRecordManifestPath, tokenPolicyReviewRecordManifest);
  writeJson(tokenAuditReviewRecordManifestPath, tokenAuditReviewRecordManifest);
  writeJson(activationTokenDenialManifestPath, activationTokenDenialManifest);
  writeJson(ownerReviewManifestPath, ownerReviewManifest);
  writeJson(activationTokenBoundaryManifestPath, activationTokenBoundaryManifest);
  writeJson(tokenReviewRecordReferenceManifestPath, tokenReviewRecordReferenceManifest);
  writeJson(activationTokenReviewRecordReferenceManifestPath, activationTokenReviewRecordReferenceManifest);
  writeJson(activationTokenSummaryPath, activationTokenSummary);
  writeJson(tokenIssuanceBlockManifestPath, tokenIssuanceBlockManifest);
  writeJson(tokenReviewRecordLedgerPath, tokenDraftLedger);
  writeJson(tokenReviewRecordAuditTrailPath, { tokenAuditReviewRecords: config.tokenAuditReviewRecords, generatedAt });
  writeJson(tokenSecretMaterialPath, { tokenSecretMaterialProduced: false, secretMaterialGenerated: false, generatedAt });

  return {
    ...inspection,
    ok: inspection.ok,
    activationTokenReviewRecordPacketProduced: true,
    activationTokenReviewRecordManifestProduced: true,
    ownerTokenReviewRecordManifestProduced: true,
    tokenPolicyReviewRecordManifestProduced: true,
    tokenAuditReviewRecordManifestProduced: true,
    activationTokenReviewDenialRecordManifestProduced: true,
    ownerReviewManifestProduced: true,
    tokenReviewRecordLedgerProduced: true,
    readyForOwnerReview: ownerReviewManifest.readyForOwnerReview,
    generatedAt,
    packetPath,
    activationTokenReviewRecordManifestPath,
    activationTokenReviewRecordsPath,
    ownerTokenReviewRecordManifestPath,
    tokenPolicyReviewRecordManifestPath,
    tokenAuditReviewRecordManifestPath,
    activationTokenDenialManifestPath,
    ownerReviewManifestPath,
    activationTokenBoundaryManifestPath,
    tokenReviewRecordReferenceManifestPath,
    activationTokenReviewRecordReferenceManifestPath,
    activationTokenSummaryPath,
    tokenIssuanceBlockManifestPath,
    tokenReviewRecordLedgerPath,
    tokenReviewRecordAuditTrailPath,
    tokenSecretMaterialPath,
  };
}

export const workerActivationTokenReviewRecordV1 = {
  declaredPaths,
  workerActivationTokenReviewRecordRequirements,
  workerActivationTokenReviewRecordFields,
  sourceActivationTokenDrafts,
  roadmapTracks,
  multiLanguageProductionTargets,
  createDefaultWorkerActivationTokenReviewRecordV1,
  inspectWorkerActivationTokenReviewRecordV1,
  runWorkerActivationTokenReviewRecordV1,
};
