import fs from "node:fs";
import path from "node:path";

const declaredPaths = [
  "docs/phases/PHASE_102_WORKER_CAPABILITY_CARDS_V1.md",
  "scripts/lib/worker-capability-cards-v1.mjs",
  "scripts/run-worker-capability-cards-v1.mjs",
  "tests/integration/worker-capability-cards-v1.test.ts",
  "apps/operator-console/src/worker-capability-cards.ts",
];

const workerCapabilityCardRequirements = [
  { id: "phase-101-ready", label: "Phase 101 Worker Fleet Registry ready", state: "required" },
  { id: "phase-101-lineage", label: "Phase 101 lineage required", state: "required" },
  { id: "owner-approval-required", label: "Tyler Wallace worker capability cards review approval required", state: "required" },
  { id: "operator-authority-preserved", label: "Driana Smith-Wallace operator authority preserved", state: "required" },
  { id: "capability-cards-only", label: "Worker Capability Cards are planning evidence only", state: "required" },
  { id: "card-catalog", label: "Worker capability card catalog required", state: "required" },
  { id: "input-contracts", label: "Input contracts required for every worker", state: "required" },
  { id: "output-contracts", label: "Output contracts required for every worker", state: "required" },
  { id: "permission-boundaries", label: "Permission boundaries required for every worker", state: "required" },
  { id: "evidence-requirements", label: "Evidence requirements required for every worker", state: "required" },
  { id: "activation-boundaries", label: "Activation boundaries required for every worker", state: "required" },
  { id: "owner-review-manifest", label: "Owner review manifest required", state: "required" },
  { id: "future-phase-handoff", label: "Worker activation handoff required", state: "required" },
  { id: "safe-artifact-paths", label: "Capability card artifact paths must remain safe relative paths", state: "required" },
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
  { id: "fail-closed", label: "Worker Capability Cards validation must fail closed", state: "required" },
  { id: "capability-card-count", label: "Twelve worker capability cards required", state: "required" },
  { id: "input-contract-count", label: "Twelve input contracts required", state: "required" },
  { id: "output-contract-count", label: "Twelve output contracts required", state: "required" },
  { id: "manual-activation-only", label: "Future activation requires manual owner approval", state: "required" },
  { id: "human-operator-visible", label: "Capability card status must be visible to the operator console", state: "required" },
  { id: "no-secret-permissions", label: "No hidden worker permissions allowed", state: "required" },
  { id: "bounded-capabilities", label: "Every worker requires bounded capability language", state: "required" },
  { id: "phase-103-handoff", label: "Phase 103 handoff notes required", state: "required" },
  { id: "review-only-capability-level", label: "Every capability card remains review-only", state: "required" },
];

const workerCapabilityCardFields = [
  "workerCapabilityCardsId",
  "status",
  "owner",
  "operatorAuthorityOwner",
  "sourcePhase",
  "sourceWorkerFleetRegistryId",
  "phase101WorkerFleetRegistryReady",
  "workerCapabilityCardCount",
  "inputContractCount",
  "outputContractCount",
  "roadmapTrackCount",
  "multiLanguageProductionTargetCount",
  "safetyGateCount",
  "workerCapabilityCardsAllowed",
  "workerFleetRegistryReadAllowed",
  "capabilityCardCatalogAllowed",
  "inputOutputContractAllowed",
  "ownerReviewCapabilityPacketAllowed",
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
  "workerCapabilityCards",
  "inputContracts",
  "outputContracts",
  "permissionBoundaryCatalog",
  "evidenceRequirementCatalog",
  "activationBoundaryCatalog",
  "capabilityCardManifest",
  "ownerReviewManifest",
  "futurePhaseHandoff",
  "requirements",
  "declaredPaths",
  "roadmapTracks",
  "multiLanguageProductionTargets",
  "checks",
  "blockers",
  "validationFailedCount",
  "capabilityCardsPacketProduced",
  "capabilityCardManifestProduced",
  "workerCapabilityCardCatalogProduced",
  "ownerReviewManifestProduced",
  "readyForOwnerReview",
  "projectRepoSourceMutated",
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
  "capabilityCardManifestPath",
  "workerCapabilityCardCatalogPath",
  "ownerReviewManifestPath",
  "activationBoundaryManifestPath",
  "permissionBoundaryManifestPath",
  "evidenceRequirementManifestPath",
];

const sourceWorkerDefinitions = [
  { workerId: "worker.phase-planner", lane: "phase-development", title: "Phase Planner Worker" },
  { workerId: "worker.spec-writer", lane: "phase-development", title: "Spec Writer Worker" },
  { workerId: "worker.overlay-packager", lane: "phase-development", title: "Overlay Packager Worker" },
  { workerId: "worker.validator", lane: "validation-and-qa", title: "Validation Worker" },
  { workerId: "worker.evidence", lane: "evidence-and-audit", title: "Evidence Worker" },
  { workerId: "worker.knowledge", lane: "knowledge-and-ingest", title: "Knowledge Worker" },
  { workerId: "worker.console", lane: "operator-console", title: "Console Status Worker" },
  { workerId: "worker.local-ops", lane: "local-worker-ops", title: "Local Ops Worker" },
  { workerId: "worker.release", lane: "release-readiness", title: "Release Readiness Worker" },
  { workerId: "worker.intake", lane: "workflow-intake", title: "Workflow Intake Worker" },
  { workerId: "worker.client-surface", lane: "client-surface-prep", title: "Client Surface Prep Worker" },
  { workerId: "worker.safety", lane: "safety-and-governance", title: "Safety Governance Worker" },
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

function buildCapabilityCards() {
  return sourceWorkerDefinitions.map((worker) => ({
    cardId: `card.${worker.workerId}`,
    workerId: worker.workerId,
    lane: worker.lane,
    title: `${worker.title} Capability Card`,
    capabilityLevel: "review-only",
    ownerReviewRequired: true,
    activationBoundary: "manual-owner-approval-only",
    hiddenPermissions: false,
    inputs: ["owner-approved request", "source evidence reference", "bounded task context"],
    outputs: ["owner-review packet", "evidence summary", "next-step recommendation"],
    permissionBoundaries: ["read approved context", "draft review artifacts", "write evidence only"],
    evidenceRequirements: ["source lineage", "validation expectation", "blocked power summary"],
    blockedCapabilities: ["execute worker", "spawn worker", "mutate project source", "self-approve"],
  }));
}

function createCheck(id, label, passed, detail) {
  return { id, label, passed, detail: detail ?? (passed ? "passed" : "failed") };
}

export function createDefaultWorkerCapabilityCardsV1(overrides = {}) {
  const workerCapabilityCards = buildCapabilityCards();
  return {
    workerCapabilityCardsId: "phase102-demo-worker-capability-cards",
    status: "worker-capability-cards-ready",
    owner: "Tyler Wallace",
    operatorAuthorityOwner: "Driana Smith-Wallace",
    sourcePhase: "101",
    sourceWorkerFleetRegistryId: "phase101-demo-worker-fleet-registry",
    phase101WorkerFleetRegistryReady: true,
    expectedWorkerCapabilityCardCount: 12,
    expectedInputContractCount: 12,
    expectedOutputContractCount: 12,
    roadmapTrackCount: 13,
    multiLanguageProductionTargetCount: 18,
    safetyGateCount: 1920,
    boundaries: { ...defaultBoundaries },
    approvalRecord: { approved: true, owner: "Tyler Wallace", selfApproved: false, approvalType: "owner-review" },
    workerCapabilityCards: cloneJson(workerCapabilityCards),
    inputContracts: workerCapabilityCards.map((card) => ({ workerId: card.workerId, inputs: [...card.inputs] })),
    outputContracts: workerCapabilityCards.map((card) => ({ workerId: card.workerId, outputs: [...card.outputs] })),
    permissionBoundaryCatalog: workerCapabilityCards.map((card) => ({ workerId: card.workerId, permissionBoundaries: [...card.permissionBoundaries] })),
    evidenceRequirementCatalog: workerCapabilityCards.map((card) => ({ workerId: card.workerId, evidenceRequirements: [...card.evidenceRequirements] })),
    activationBoundaryCatalog: workerCapabilityCards.map((card) => ({ workerId: card.workerId, activationBoundary: card.activationBoundary })),
    futurePhaseHandoff: { nextPhase: "103", title: "Worker Activation Review Queue v1", status: "manual-owner-review-required" },
    requirements: cloneJson(workerCapabilityCardRequirements),
    declaredPaths: [...declaredPaths],
    roadmapTracks: [...roadmapTracks],
    multiLanguageProductionTargets: [...multiLanguageProductionTargets],
    projectRepoSourceMutated: false,
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

export function inspectWorkerCapabilityCardsV1(config = createDefaultWorkerCapabilityCardsV1()) {
  const checks = [];
  const blockers = [];
  const addCheck = (id, label, passed, failure) => {
    checks.push(createCheck(id, label, passed, failure));
    if (!passed) blockers.push(failure || label);
  };

  addCheck("phase-101-ready", "Phase 101 Worker Fleet Registry ready", config.phase101WorkerFleetRegistryReady === true, "Phase 101 Worker Fleet Registry must be ready before Phase 102.");
  addCheck("phase-101-lineage", "Phase 101 lineage", config.sourceWorkerFleetRegistryId === "phase101-demo-worker-fleet-registry", "Phase 102 must link to the Phase 101 Worker Fleet Registry.");
  addCheck("tyler-approval", "Tyler Wallace approval", config.approvalRecord?.approved === true && config.approvalRecord?.owner === "Tyler Wallace", "Tyler Wallace approval record is required for Phase 102 Worker Capability Cards.");
  addCheck("self-approval-blocked", "Self approval blocked", config.approvalRecord?.selfApproved === false, "Self-approval is blocked for Phase 102 Worker Capability Cards.");
  addCheck("declared-paths", "Declared paths are safe", Array.isArray(config.declaredPaths) && config.declaredPaths.length === 5 && config.declaredPaths.every(isSafeRelativePath), "Phase 102 declared paths must be safe relative paths.");
  addCheck("requirements", "Requirement count", Array.isArray(config.requirements) && config.requirements.length === 42, "Phase 102 requires exactly 42 requirements.");
  addCheck("fields", "Field count", workerCapabilityCardFields.length === 84, "Phase 102 requires exactly 84 fields.");
  addCheck("roadmap-tracks", "Roadmap track count", Array.isArray(config.roadmapTracks) && config.roadmapTracks.length === 13, "Phase 102 requires thirteen roadmap tracks.");
  addCheck("multi-language", "Multi-language target count", Array.isArray(config.multiLanguageProductionTargets) && config.multiLanguageProductionTargets.length === 18, "Phase 102 requires eighteen multi-language production targets.");

  const cards = Array.isArray(config.workerCapabilityCards) ? config.workerCapabilityCards : [];
  const knownWorkers = new Set(sourceWorkerDefinitions.map((worker) => worker.workerId));
  addCheck("card-count", "Capability card count", cards.length === config.expectedWorkerCapabilityCardCount, `Expected ${config.expectedWorkerCapabilityCardCount} worker capability cards but found ${cards.length}.`);
  addCheck("input-contract-count", "Input contract count", Array.isArray(config.inputContracts) && config.inputContracts.length === config.expectedInputContractCount, `Expected ${config.expectedInputContractCount} input contracts but found ${Array.isArray(config.inputContracts) ? config.inputContracts.length : 0}.`);
  addCheck("output-contract-count", "Output contract count", Array.isArray(config.outputContracts) && config.outputContracts.length === config.expectedOutputContractCount, `Expected ${config.expectedOutputContractCount} output contracts but found ${Array.isArray(config.outputContracts) ? config.outputContracts.length : 0}.`);

  for (const card of cards) {
    addCheck(`safe-card-${card?.cardId ?? "missing"}`, "Safe capability card id", isSafeCardId(card?.cardId), "Every capability card requires a safe card.worker.* id.");
    addCheck(`safe-worker-${card?.workerId ?? "missing"}`, "Safe worker id", isSafeWorkerId(card?.workerId), "Every capability card requires a safe worker.* id.");
    addCheck(`known-worker-${card?.workerId ?? "missing"}`, "Known worker id", knownWorkers.has(card?.workerId), "Every capability card must reference a known Phase 101 worker.");
    addCheck(`review-only-${card?.workerId ?? "missing"}`, "Review-only capability level", card?.capabilityLevel === "review-only", "Every capability card must remain review-only.");
    addCheck(`owner-review-${card?.workerId ?? "missing"}`, "Owner review required", card?.ownerReviewRequired === true, "Every capability card requires owner review.");
    addCheck(`manual-activation-${card?.workerId ?? "missing"}`, "Manual activation only", card?.activationBoundary === "manual-owner-approval-only", "Every capability card requires manual-owner-approval-only activation.");
    addCheck(`no-hidden-permissions-${card?.workerId ?? "missing"}`, "No hidden permissions", card?.hiddenPermissions === false, "No hidden worker permissions allowed.");
    addCheck(`inputs-${card?.workerId ?? "missing"}`, "Bounded inputs", Array.isArray(card?.inputs) && card.inputs.length > 0, "Every capability card requires bounded inputs.");
    addCheck(`outputs-${card?.workerId ?? "missing"}`, "Bounded outputs", Array.isArray(card?.outputs) && card.outputs.length > 0, "Every capability card requires bounded outputs.");
    addCheck(`permissions-${card?.workerId ?? "missing"}`, "Permission boundaries", Array.isArray(card?.permissionBoundaries) && card.permissionBoundaries.length > 0, "Every capability card requires permission boundaries.");
    addCheck(`evidence-${card?.workerId ?? "missing"}`, "Evidence requirements", Array.isArray(card?.evidenceRequirements) && card.evidenceRequirements.length > 0, "Every capability card requires evidence requirements.");
  }

  for (const name of blockedBoundaryNames) {
    addCheck(`boundary-${name}`, `${name} blocked`, config.boundaries?.[name] === false, `${name} must remain false`);
  }
  for (const [name, value] of Object.entries({
    projectRepoSourceMutated: config.projectRepoSourceMutated,
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
    workerCapabilityCardsId: config.workerCapabilityCardsId,
    workerCapabilityCardsStatus: ok ? "worker-capability-cards-ready" : "worker-capability-cards-validation-failed",
    declaredFileCount: declaredPaths.length,
    workerCapabilityCardsRequirementCount: workerCapabilityCardRequirements.length,
    workerCapabilityCardsFieldCount: workerCapabilityCardFields.length,
    workerCapabilityCardCount: cards.length,
    inputContractCount: Array.isArray(config.inputContracts) ? config.inputContracts.length : 0,
    outputContractCount: Array.isArray(config.outputContracts) ? config.outputContracts.length : 0,
    roadmapTrackCount: Array.isArray(config.roadmapTracks) ? config.roadmapTracks.length : 0,
    multiLanguageProductionTargetCount: Array.isArray(config.multiLanguageProductionTargets) ? config.multiLanguageProductionTargets.length : 0,
    safetyGateCount: config.safetyGateCount,
    workerCapabilityCardsAllowed: true,
    workerFleetRegistryReadAllowed: true,
    capabilityCardCatalogAllowed: true,
    inputOutputContractAllowed: true,
    ownerReviewCapabilityPacketAllowed: true,
    ...config.boundaries,
    sourceWorkerFleetRegistryId: config.sourceWorkerFleetRegistryId,
    phase101WorkerFleetRegistryReady: config.phase101WorkerFleetRegistryReady,
    projectRepoSourceMutated: config.projectRepoSourceMutated,
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

export function runWorkerCapabilityCardsV1(config = createDefaultWorkerCapabilityCardsV1(), options = {}) {
  const inspection = inspectWorkerCapabilityCardsV1(config);
  const artifactRoot = options.artifactRoot || path.join(process.cwd(), ".sera-worker-capability-cards");
  const runRoot = path.join(artifactRoot, "capability-cards", config.workerCapabilityCardsId || "phase102-demo-worker-capability-cards");
  const generatedAt = new Date().toISOString();
  const capabilityCardManifest = {
    id: config.workerCapabilityCardsId,
    status: inspection.workerCapabilityCardsStatus,
    generatedAt,
    sourceWorkerFleetRegistryId: config.sourceWorkerFleetRegistryId,
    workerCapabilityCardCount: inspection.workerCapabilityCardCount,
    inputContractCount: inspection.inputContractCount,
    outputContractCount: inspection.outputContractCount,
    blockedPowersPreserved: blockedBoundaryNames,
  };
  const ownerReviewManifest = {
    owner: config.owner,
    operatorAuthorityOwner: config.operatorAuthorityOwner,
    readyForOwnerReview: inspection.ok,
    selfApprovalBlocked: config.approvalRecord?.selfApproved === false,
    futureActivationRequiresOwnerApproval: true,
  };
  const activationBoundaryManifest = { activationBoundaryCatalog: config.activationBoundaryCatalog };
  const permissionBoundaryManifest = { permissionBoundaryCatalog: config.permissionBoundaryCatalog };
  const evidenceRequirementManifest = { evidenceRequirementCatalog: config.evidenceRequirementCatalog };
  const inputOutputContractManifest = { inputContracts: config.inputContracts, outputContracts: config.outputContracts };
  const packet = {
    ...config,
    status: inspection.workerCapabilityCardsStatus,
    generatedAt,
    capabilityCardManifest,
    ownerReviewManifest,
    activationBoundaryManifest,
    permissionBoundaryManifest,
    evidenceRequirementManifest,
    inputOutputContractManifest,
    checks: inspection.checks,
    blockers: inspection.blockers,
  };
  const packetPath = path.join(runRoot, "worker-capability-cards-packet.json");
  const capabilityCardManifestPath = path.join(runRoot, "capability-card-manifest.json");
  const workerCapabilityCardCatalogPath = path.join(runRoot, "worker-capability-cards.json");
  const ownerReviewManifestPath = path.join(runRoot, "owner-review-manifest.json");
  const activationBoundaryManifestPath = path.join(runRoot, "activation-boundary-manifest.json");
  const permissionBoundaryManifestPath = path.join(runRoot, "permission-boundary-manifest.json");
  const evidenceRequirementManifestPath = path.join(runRoot, "evidence-requirement-manifest.json");
  const inputOutputContractManifestPath = path.join(runRoot, "input-output-contract-manifest.json");
  writeJson(packetPath, packet);
  writeJson(capabilityCardManifestPath, capabilityCardManifest);
  writeJson(workerCapabilityCardCatalogPath, config.workerCapabilityCards);
  writeJson(ownerReviewManifestPath, ownerReviewManifest);
  writeJson(activationBoundaryManifestPath, activationBoundaryManifest);
  writeJson(permissionBoundaryManifestPath, permissionBoundaryManifest);
  writeJson(evidenceRequirementManifestPath, evidenceRequirementManifest);
  writeJson(inputOutputContractManifestPath, inputOutputContractManifest);

  return {
    ...inspection,
    ok: inspection.ok,
    capabilityCardsPacketProduced: true,
    capabilityCardManifestProduced: true,
    workerCapabilityCardCatalogProduced: true,
    ownerReviewManifestProduced: true,
    readyForOwnerReview: ownerReviewManifest.readyForOwnerReview,
    packetPath,
    capabilityCardManifestPath,
    workerCapabilityCardCatalogPath,
    ownerReviewManifestPath,
    activationBoundaryManifestPath,
    permissionBoundaryManifestPath,
    evidenceRequirementManifestPath,
    inputOutputContractManifestPath,
  };
}

export const workerCapabilityCardsV1 = {
  declaredPaths,
  workerCapabilityCardRequirements,
  workerCapabilityCardFields,
  sourceWorkerDefinitions,
  roadmapTracks,
  multiLanguageProductionTargets,
  createDefaultWorkerCapabilityCardsV1,
  inspectWorkerCapabilityCardsV1,
  runWorkerCapabilityCardsV1,
};
