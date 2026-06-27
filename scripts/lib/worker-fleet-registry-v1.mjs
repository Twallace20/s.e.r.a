import fs from "node:fs";
import path from "node:path";

const declaredPaths = [
  "docs/phases/PHASE_101_WORKER_FLEET_REGISTRY_V1.md",
  "scripts/lib/worker-fleet-registry-v1.mjs",
  "scripts/run-worker-fleet-registry-v1.mjs",
  "tests/integration/worker-fleet-registry-v1.test.ts",
  "apps/operator-console/src/worker-fleet-registry.ts",
];

const workerFleetRegistryRequirements = [
  { id: "phase-100h-ready", label: "Phase 100H Phase Factory Alpha ready", state: "required" },
  { id: "phase-100h-lineage", label: "Phase 100H lineage required", state: "required" },
  { id: "owner-approval-required", label: "Tyler Wallace worker fleet registry review approval required", state: "required" },
  { id: "operator-authority-preserved", label: "Driana Smith-Wallace operator authority preserved", state: "required" },
  { id: "registry-only", label: "Worker Fleet Registry is planning evidence only", state: "required" },
  { id: "worker-lane-catalog", label: "Worker lane catalog required", state: "required" },
  { id: "worker-definition-catalog", label: "Worker definition catalog required", state: "required" },
  { id: "worker-ownership-model", label: "Worker ownership model required", state: "required" },
  { id: "worker-permission-model", label: "Worker permission model required", state: "required" },
  { id: "worker-evidence-model", label: "Worker evidence model required", state: "required" },
  { id: "worker-readiness-model", label: "Worker readiness model required", state: "required" },
  { id: "owner-review-manifest", label: "Owner review manifest required", state: "required" },
  { id: "future-phase-handoff", label: "Worker fleet foundation handoff required", state: "required" },
  { id: "safe-artifact-paths", label: "Registry artifact paths must remain safe relative paths", state: "required" },
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
  { id: "fail-closed", label: "Worker Fleet Registry validation must fail closed", state: "required" },
  { id: "worker-lane-count", label: "Ten worker fleet lanes required", state: "required" },
  { id: "worker-definition-count", label: "Twelve worker definitions required", state: "required" },
  { id: "manual-activation-only", label: "Future activation requires manual owner approval", state: "required" },
  { id: "human-operator-visible", label: "Registry status must be visible to the operator console", state: "required" },
  { id: "no-secret-permissions", label: "No hidden worker permissions allowed", state: "required" },
  { id: "bounded-responsibilities", label: "Every worker requires bounded responsibilities", state: "required" },
  { id: "phase-102-handoff", label: "Phase 102 handoff notes required", state: "required" },
];

const workerFleetRegistryFields = [
  "workerFleetRegistryId",
  "status",
  "owner",
  "operatorAuthorityOwner",
  "sourcePhase",
  "sourcePhaseFactoryAlphaId",
  "phase100HPhaseFactoryAlphaReady",
  "workerFleetLaneCount",
  "workerDefinitionCount",
  "roadmapTrackCount",
  "multiLanguageProductionTargetCount",
  "safetyGateCount",
  "workerFleetRegistryAllowed",
  "phaseFactoryAlphaReadAllowed",
  "workerDefinitionCatalogAllowed",
  "ownerReviewFleetPacketAllowed",
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
  "workerFleetLanes",
  "workerDefinitions",
  "workerOwnershipModel",
  "workerPermissionModel",
  "workerEvidenceModel",
  "workerReadinessModel",
  "registryManifest",
  "ownerReviewManifest",
  "futurePhaseHandoff",
  "requirements",
  "declaredPaths",
  "roadmapTracks",
  "multiLanguageProductionTargets",
  "checks",
  "blockers",
  "validationFailedCount",
  "registryPacketProduced",
  "workerDefinitionCatalogProduced",
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
  "registryManifestPath",
  "workerCatalogPath",
  "ownerReviewManifestPath",
];

const workerFleetLanes = [
  "phase-development",
  "validation-and-qa",
  "evidence-and-audit",
  "knowledge-and-ingest",
  "operator-console",
  "local-worker-ops",
  "release-readiness",
  "workflow-intake",
  "client-surface-prep",
  "safety-and-governance",
];

const workerDefinitions = [
  { workerId: "worker.phase-planner", lane: "phase-development", title: "Phase Planner Worker", responsibilities: ["draft phase tasks", "prepare owner-review plans"], permissionLevel: "review-only", ownerReviewRequired: true },
  { workerId: "worker.spec-writer", lane: "phase-development", title: "Spec Writer Worker", responsibilities: ["draft phase specs", "preserve acceptance criteria"], permissionLevel: "review-only", ownerReviewRequired: true },
  { workerId: "worker.overlay-packager", lane: "phase-development", title: "Overlay Packager Worker", responsibilities: ["prepare overlay package drafts", "write manifest evidence"], permissionLevel: "review-only", ownerReviewRequired: true },
  { workerId: "worker.validator", lane: "validation-and-qa", title: "Validation Worker", responsibilities: ["summarize validation commands", "record validation expectations"], permissionLevel: "review-only", ownerReviewRequired: true },
  { workerId: "worker.evidence", lane: "evidence-and-audit", title: "Evidence Worker", responsibilities: ["bundle evidence references", "prepare audit summaries"], permissionLevel: "review-only", ownerReviewRequired: true },
  { workerId: "worker.knowledge", lane: "knowledge-and-ingest", title: "Knowledge Worker", responsibilities: ["catalog source references", "preserve source map requirements"], permissionLevel: "review-only", ownerReviewRequired: true },
  { workerId: "worker.console", lane: "operator-console", title: "Console Status Worker", responsibilities: ["surface status fields", "surface blocked gates"], permissionLevel: "review-only", ownerReviewRequired: true },
  { workerId: "worker.local-ops", lane: "local-worker-ops", title: "Local Ops Worker", responsibilities: ["track local readiness", "preserve local boundaries"], permissionLevel: "review-only", ownerReviewRequired: true },
  { workerId: "worker.release", lane: "release-readiness", title: "Release Readiness Worker", responsibilities: ["prepare release checklists", "preserve tag requirements"], permissionLevel: "review-only", ownerReviewRequired: true },
  { workerId: "worker.intake", lane: "workflow-intake", title: "Workflow Intake Worker", responsibilities: ["classify intake", "prepare owner-review packets"], permissionLevel: "review-only", ownerReviewRequired: true },
  { workerId: "worker.client-surface", lane: "client-surface-prep", title: "Client Surface Prep Worker", responsibilities: ["prepare future surface requirements", "preserve QA gates"], permissionLevel: "review-only", ownerReviewRequired: true },
  { workerId: "worker.safety", lane: "safety-and-governance", title: "Safety Governance Worker", responsibilities: ["audit blocked powers", "preserve approval gates"], permissionLevel: "review-only", ownerReviewRequired: true },
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
  "typescript", "javascript", "node", "python", "markdown", "json", "yaml", "sql", "html", "css", "powershell", "bash", "react", "vite", "sqlite", "api", "workflow", "documentation",
];

const trueBoundaryKeys = [
  "workerFleetRegistryAllowed",
  "phaseFactoryAlphaReadAllowed",
  "workerDefinitionCatalogAllowed",
  "ownerReviewFleetPacketAllowed",
];

const falseBoundaryKeys = [
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
];

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + "\n", "utf8");
}

function isSafeRelativePath(value) {
  return typeof value === "string" && value.length > 0 && !path.isAbsolute(value) && !value.includes("..") && !value.includes("\\");
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

export function createDefaultWorkerFleetRegistryV1(overrides = {}) {
  const defaults = {
    workerFleetRegistryId: "phase101-demo-worker-fleet-registry",
    status: "draft",
    owner: "Tyler Wallace",
    operatorAuthorityOwner: "Driana Smith-Wallace",
    sourcePhase: "100H",
    sourcePhaseFactoryAlphaId: "phase100h-demo-phase-factory-alpha",
    phase100HPhaseFactoryAlphaReady: true,
    approvalRecord: {
      approved: true,
      approvedBy: "Tyler Wallace",
      approvalType: "owner-review-worker-fleet-registry",
      selfApproved: false,
    },
    workerFleetLanes: [...workerFleetLanes],
    workerDefinitions: cloneJson(workerDefinitions),
    expectedWorkerFleetLaneCount: 10,
    expectedWorkerDefinitionCount: 12,
    workerOwnershipModel: {
      owner: "Tyler Wallace",
      operatorAuthorityOwner: "Driana Smith-Wallace",
      activationRequiresOwnerApproval: true,
    },
    workerPermissionModel: {
      defaultPermissionLevel: "review-only",
      hiddenPermissionsAllowed: false,
      executionRequiresFuturePhase: true,
    },
    workerEvidenceModel: {
      evidenceRequired: true,
      evidencePathRoot: "artifacts/worker-fleet-registry",
      sourceMapRequired: true,
    },
    workerReadinessModel: {
      readinessStatus: "registry-only",
      activationStatus: "blocked-until-future-owner-approval",
      phase102HandoffRequired: true,
    },
    futurePhaseHandoff: {
      nextPhase: "102",
      nextPhasePurpose: "worker capability cards and readiness criteria",
      readyForExecution: false,
    },
    requirements: cloneJson(workerFleetRegistryRequirements),
    declaredPaths: [...declaredPaths],
    roadmapTracks: [...roadmapTracks],
    multiLanguageProductionTargets: [...multiLanguageProductionTargets],
    boundaries: {
      workerFleetRegistryAllowed: true,
      phaseFactoryAlphaReadAllowed: true,
      workerDefinitionCatalogAllowed: true,
      ownerReviewFleetPacketAllowed: true,
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
    },
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
  };
  return { ...defaults, ...overrides };
}

export function inspectWorkerFleetRegistryV1(config = createDefaultWorkerFleetRegistryV1()) {
  const blockers = [];
  const checks = [];
  const addCheck = (id, passed, message) => {
    checks.push({ id, passed, message });
    if (!passed) blockers.push(message);
  };
  const boundaries = config.boundaries || {};
  const approvalRecord = config.approvalRecord || {};
  const lanes = config.workerFleetLanes || [];
  const definitions = config.workerDefinitions || [];

  addCheck("owner", config.owner === "Tyler Wallace", "Owner must be Tyler Wallace for Phase 101 Worker Fleet Registry.");
  addCheck("operator-authority", config.operatorAuthorityOwner === "Driana Smith-Wallace", "Operator authority owner must remain Driana Smith-Wallace.");
  addCheck("phase-100h-ready", config.phase100HPhaseFactoryAlphaReady === true, "Phase 100H Phase Factory Alpha must be ready before Phase 101.");
  addCheck("source-phase-factory-alpha", config.sourcePhaseFactoryAlphaId === "phase100h-demo-phase-factory-alpha", "Phase 101 must link to the Phase 100H Phase Factory Alpha.");
  addCheck("approval-required", approvalRecord.approved === true && approvalRecord.approvedBy === "Tyler Wallace", "Tyler Wallace approval record is required for Phase 101 Worker Fleet Registry.");
  addCheck("no-self-approval", approvalRecord.selfApproved === false, "Self-approval is blocked for Phase 101 Worker Fleet Registry.");
  addCheck("lane-count", lanes.length === config.expectedWorkerFleetLaneCount, `Worker fleet lane count must be ${config.expectedWorkerFleetLaneCount}.`);
  addCheck("definition-count", definitions.length === config.expectedWorkerDefinitionCount, `Worker definition count must be ${config.expectedWorkerDefinitionCount}.`);

  for (const declaredPath of config.declaredPaths || []) {
    addCheck(`safe-declared-path-${declaredPath}`, isSafeRelativePath(declaredPath), `Declared path must be a safe relative path: ${declaredPath}`);
  }

  for (const lane of lanes) {
    addCheck(`safe-lane-${lane}`, /^[a-z0-9-]+$/.test(lane), `Worker lane must use a safe lowercase identifier: ${lane}`);
  }

  for (const worker of definitions) {
    addCheck(`worker-id-${worker.workerId}`, typeof worker.workerId === "string" && worker.workerId.startsWith("worker."), `Worker definition requires worker.* id: ${worker.workerId}`);
    addCheck(`worker-lane-${worker.workerId}`, lanes.includes(worker.lane), `Worker ${worker.workerId} must reference a known lane.`);
    addCheck(`worker-permission-${worker.workerId}`, worker.permissionLevel === "review-only", `Worker ${worker.workerId} must remain review-only.`);
    addCheck(`worker-review-${worker.workerId}`, worker.ownerReviewRequired === true, `Worker ${worker.workerId} must require owner review.`);
    addCheck(`worker-responsibilities-${worker.workerId}`, Array.isArray(worker.responsibilities) && worker.responsibilities.length > 0, `Worker ${worker.workerId} requires bounded responsibilities.`);
  }

  for (const key of trueBoundaryKeys) addCheck(`allowed-${key}`, boundaries[key] === true, `${key} must remain true`);
  for (const key of falseBoundaryKeys) addCheck(`blocked-${key}`, boundaries[key] === false, `${key} must remain false`);

  addCheck("source-not-mutated", config.projectRepoSourceMutated === false, "projectRepoSourceMutated must remain false");
  addCheck("worker-not-executed", config.workerExecuted === false, "workerExecuted must remain false");
  addCheck("worker-not-spawned", config.workerSpawned === false, "workerSpawned must remain false");
  addCheck("autonomous-delegation-not-executed", config.autonomousDelegationExecuted === false, "autonomousDelegationExecuted must remain false");
  addCheck("scheduler-not-mutated", config.schedulerWorkflowMutated === false, "schedulerWorkflowMutated must remain false");
  addCheck("iphone-not-mutated", config.iPhoneAutomationMutated === false, "iPhoneAutomationMutated must remain false");
  addCheck("away-mode-not-executed", config.awayModeExecuted === false, "awayModeExecuted must remain false");
  addCheck("fleet-not-executed", config.fleetExecuted === false, "fleetExecuted must remain false");
  addCheck("apply-not-executed", config.applyExecuted === false, "applyExecuted must remain false");
  addCheck("patch-not-executed", config.patchExecuted === false, "patchExecuted must remain false");
  addCheck("branch-not-created", config.realProjectBranchCreated === false, "realProjectBranchCreated must remain false");
  addCheck("merge-not-performed", config.realProjectMergePerformed === false, "realProjectMergePerformed must remain false");
  addCheck("git-push-not-performed", config.gitPushPerformed === false, "gitPushPerformed must remain false");
  addCheck("tag-not-created", config.tagCreated === false, "tagCreated must remain false");
  addCheck("shell-not-executed", config.shellExecuted === false, "shellExecuted must remain false");
  addCheck("production-not-deployed", config.productionDeployed === false, "productionDeployed must remain false");

  return {
    ok: blockers.length === 0,
    blockers,
    checks,
    declaredFileCount: declaredPaths.length,
    workerFleetRegistryRequirementCount: workerFleetRegistryRequirements.length,
    workerFleetRegistryFieldCount: workerFleetRegistryFields.length,
    workerFleetLaneCount: lanes.length,
    workerDefinitionCount: definitions.length,
    roadmapTrackCount: roadmapTracks.length,
    multiLanguageProductionTargetCount: multiLanguageProductionTargets.length,
    safetyGateCount: 1860,
    ...Object.fromEntries(trueBoundaryKeys.map((key) => [key, boundaries[key] === true])),
    ...Object.fromEntries(falseBoundaryKeys.map((key) => [key, boundaries[key] === true ? true : false])),
    projectRepoSourceMutated: config.projectRepoSourceMutated === true,
    workerExecuted: config.workerExecuted === true,
    workerSpawned: config.workerSpawned === true,
    autonomousDelegationExecuted: config.autonomousDelegationExecuted === true,
    schedulerWorkflowMutated: config.schedulerWorkflowMutated === true,
    iPhoneAutomationMutated: config.iPhoneAutomationMutated === true,
    awayModeExecuted: config.awayModeExecuted === true,
    fleetExecuted: config.fleetExecuted === true,
    applyExecuted: config.applyExecuted === true,
    patchExecuted: config.patchExecuted === true,
    realProjectBranchCreated: config.realProjectBranchCreated === true,
    realProjectMergePerformed: config.realProjectMergePerformed === true,
    gitPushPerformed: config.gitPushPerformed === true,
    tagCreated: config.tagCreated === true,
    shellExecuted: config.shellExecuted === true,
    productionDeployed: config.productionDeployed === true,
  };
}

export function runWorkerFleetRegistryV1(config = createDefaultWorkerFleetRegistryV1(), options = {}) {
  const inspection = inspectWorkerFleetRegistryV1(config);
  const artifactRoot = options.artifactRoot || process.cwd();
  const runId = config.workerFleetRegistryId || "phase101-demo-worker-fleet-registry";
  const runRoot = path.join(artifactRoot, ".sera-worker-fleet-registry", "registries", runId);
  fs.mkdirSync(runRoot, { recursive: true });
  const generatedAt = new Date().toISOString();
  const validationFailedCount = inspection.ok && config.workerFleetLanes.length === config.expectedWorkerFleetLaneCount && config.workerDefinitions.length === config.expectedWorkerDefinitionCount ? 0 : 1;
  const registryReady = validationFailedCount === 0;
  const status = registryReady ? "worker-fleet-registry-ready" : "worker-fleet-registry-validation-failed";
  const registryManifest = {
    workerFleetRegistryId: runId,
    sourcePhaseFactoryAlphaId: config.sourcePhaseFactoryAlphaId,
    workerFleetLaneCount: config.workerFleetLanes.length,
    workerDefinitionCount: config.workerDefinitions.length,
    workerExecutionAllowed: false,
    workerSpawningAllowed: false,
    autonomousDelegationAllowed: false,
    generatedAt,
  };
  const ownerReviewManifest = {
    workerFleetRegistryId: runId,
    owner: config.owner,
    operatorAuthorityOwner: config.operatorAuthorityOwner,
    ownerReviewFleetPacketAllowed: true,
    ownerReviewRequired: true,
    readyForOwnerReview: registryReady,
    workerExecuted: false,
    workerSpawned: false,
    autonomousDelegationExecuted: false,
    generatedAt,
  };
  const workerCatalog = {
    workerFleetRegistryId: runId,
    workerFleetLanes: config.workerFleetLanes,
    workerDefinitions: config.workerDefinitions,
    workerOwnershipModel: config.workerOwnershipModel,
    workerPermissionModel: config.workerPermissionModel,
    workerEvidenceModel: config.workerEvidenceModel,
    workerReadinessModel: config.workerReadinessModel,
    futurePhaseHandoff: config.futurePhaseHandoff,
    generatedAt,
  };
  const packet = {
    workerFleetRegistryId: runId,
    status,
    owner: config.owner,
    operatorAuthorityOwner: config.operatorAuthorityOwner,
    sourcePhase: config.sourcePhase,
    sourcePhaseFactoryAlphaId: config.sourcePhaseFactoryAlphaId,
    phase100HPhaseFactoryAlphaReady: config.phase100HPhaseFactoryAlphaReady,
    workerFleetLaneCount: inspection.workerFleetLaneCount,
    workerDefinitionCount: inspection.workerDefinitionCount,
    roadmapTrackCount: inspection.roadmapTrackCount,
    multiLanguageProductionTargetCount: inspection.multiLanguageProductionTargetCount,
    safetyGateCount: inspection.safetyGateCount,
    workerFleetRegistryAllowed: inspection.workerFleetRegistryAllowed,
    phaseFactoryAlphaReadAllowed: inspection.phaseFactoryAlphaReadAllowed,
    workerDefinitionCatalogAllowed: inspection.workerDefinitionCatalogAllowed,
    ownerReviewFleetPacketAllowed: inspection.ownerReviewFleetPacketAllowed,
    workerExecutionAllowed: inspection.workerExecutionAllowed,
    workerSpawningAllowed: inspection.workerSpawningAllowed,
    autonomousDelegationAllowed: inspection.autonomousDelegationAllowed,
    schedulerWorkflowMutationAllowed: inspection.schedulerWorkflowMutationAllowed,
    iPhoneAutomationMutationAllowed: inspection.iPhoneAutomationMutationAllowed,
    awayModeExecutionAllowed: inspection.awayModeExecutionAllowed,
    fleetExecutionAllowed: inspection.fleetExecutionAllowed,
    applyExecutionAllowed: inspection.applyExecutionAllowed,
    patchExecutionAllowed: inspection.patchExecutionAllowed,
    projectRepoSourceMutationAllowed: inspection.projectRepoSourceMutationAllowed,
    realProjectBranchCreationAllowed: inspection.realProjectBranchCreationAllowed,
    realProjectMergeExecutionAllowed: inspection.realProjectMergeExecutionAllowed,
    gitPushAllowed: inspection.gitPushAllowed,
    tagCreationAllowed: inspection.tagCreationAllowed,
    arbitraryCommandAllowed: inspection.arbitraryCommandAllowed,
    shellExecutionAllowed: inspection.shellExecutionAllowed,
    selfApprovalAllowed: inspection.selfApprovalAllowed,
    selfMergeAllowed: inspection.selfMergeAllowed,
    selfDeployAllowed: inspection.selfDeployAllowed,
    productionDeploymentAllowed: inspection.productionDeploymentAllowed,
    approvalRecord: config.approvalRecord,
    workerFleetLanes: config.workerFleetLanes,
    workerDefinitions: config.workerDefinitions,
    workerOwnershipModel: config.workerOwnershipModel,
    workerPermissionModel: config.workerPermissionModel,
    workerEvidenceModel: config.workerEvidenceModel,
    workerReadinessModel: config.workerReadinessModel,
    registryManifest,
    ownerReviewManifest,
    futurePhaseHandoff: config.futurePhaseHandoff,
    requirements: config.requirements,
    declaredPaths: config.declaredPaths,
    roadmapTracks: config.roadmapTracks,
    multiLanguageProductionTargets: config.multiLanguageProductionTargets,
    checks: inspection.checks,
    blockers: inspection.blockers,
    validationFailedCount,
    registryPacketProduced: true,
    workerDefinitionCatalogProduced: true,
    ownerReviewManifestProduced: true,
    readyForOwnerReview: ownerReviewManifest.readyForOwnerReview,
    projectRepoSourceMutated: inspection.projectRepoSourceMutated,
    workerExecuted: inspection.workerExecuted,
    workerSpawned: inspection.workerSpawned,
    autonomousDelegationExecuted: inspection.autonomousDelegationExecuted,
    schedulerWorkflowMutated: inspection.schedulerWorkflowMutated,
    iPhoneAutomationMutated: inspection.iPhoneAutomationMutated,
    awayModeExecuted: inspection.awayModeExecuted,
    fleetExecuted: inspection.fleetExecuted,
    applyExecuted: inspection.applyExecuted,
    patchExecuted: inspection.patchExecuted,
    realProjectBranchCreated: inspection.realProjectBranchCreated,
    realProjectMergePerformed: inspection.realProjectMergePerformed,
    gitPushPerformed: inspection.gitPushPerformed,
    tagCreated: inspection.tagCreated,
    shellExecuted: inspection.shellExecuted,
    productionDeployed: inspection.productionDeployed,
    generatedAt,
  };
  const packetPath = path.join(runRoot, "worker-fleet-registry.json");
  const registryManifestPath = path.join(runRoot, "registry-manifest.json");
  const workerCatalogPath = path.join(runRoot, "worker-definition-catalog.json");
  const ownerReviewManifestPath = path.join(runRoot, "owner-review-manifest.json");
  writeJson(packetPath, packet);
  writeJson(registryManifestPath, registryManifest);
  writeJson(workerCatalogPath, workerCatalog);
  writeJson(ownerReviewManifestPath, ownerReviewManifest);
  return {
    ...inspection,
    ok: registryReady,
    workerFleetRegistryStatus: status,
    validationFailedCount,
    workerFleetRegistryId: runId,
    sourcePhaseFactoryAlphaId: config.sourcePhaseFactoryAlphaId,
    phase100HPhaseFactoryAlphaReady: config.phase100HPhaseFactoryAlphaReady,
    registryPacketProduced: true,
    workerDefinitionCatalogProduced: true,
    ownerReviewManifestProduced: true,
    readyForOwnerReview: ownerReviewManifest.readyForOwnerReview,
    projectRepoSourceMutated: inspection.projectRepoSourceMutated,
    workerExecuted: inspection.workerExecuted,
    workerSpawned: inspection.workerSpawned,
    autonomousDelegationExecuted: inspection.autonomousDelegationExecuted,
    schedulerWorkflowMutated: inspection.schedulerWorkflowMutated,
    iPhoneAutomationMutated: inspection.iPhoneAutomationMutated,
    awayModeExecuted: inspection.awayModeExecuted,
    fleetExecuted: inspection.fleetExecuted,
    applyExecuted: inspection.applyExecuted,
    patchExecuted: inspection.patchExecuted,
    realProjectBranchCreated: inspection.realProjectBranchCreated,
    realProjectMergePerformed: inspection.realProjectMergePerformed,
    packetPath,
    registryManifestPath,
    workerCatalogPath,
    ownerReviewManifestPath,
  };
}

export const workerFleetRegistryV1 = {
  declaredPaths,
  workerFleetRegistryRequirements,
  workerFleetRegistryFields,
  workerFleetLanes,
  workerDefinitions,
  roadmapTracks,
  multiLanguageProductionTargets,
  createDefaultWorkerFleetRegistryV1,
  inspectWorkerFleetRegistryV1,
  runWorkerFleetRegistryV1,
};
