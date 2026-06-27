import fs from "node:fs";
import path from "node:path";

const declaredPaths = [
  "docs/phases/PHASE_100H_PHASE_FACTORY_ALPHA_V1.md",
  "scripts/lib/phase-factory-alpha-v1.mjs",
  "scripts/run-phase-factory-alpha-v1.mjs",
  "tests/integration/phase-factory-alpha-v1.test.ts",
  "apps/operator-console/src/phase-factory-alpha.ts",
];

const phaseFactoryAlphaRequirements = [
  { id: "phase-100g-ready", label: "Phase 100G evidence pack ready", state: "required" },
  { id: "phase-100a-lineage", label: "Phase 100A backlog lineage required", state: "required" },
  { id: "phase-100b-lineage", label: "Phase 100B spec lineage required", state: "required" },
  { id: "phase-100c-lineage", label: "Phase 100C overlay manifest lineage required", state: "required" },
  { id: "phase-100d-lineage", label: "Phase 100D ZIP validation lineage required", state: "required" },
  { id: "phase-100e-lineage", label: "Phase 100E apply queue lineage required", state: "required" },
  { id: "phase-100f-lineage", label: "Phase 100F troubleshooting lineage required", state: "required" },
  { id: "phase-100g-lineage", label: "Phase 100G evidence pack lineage required", state: "required" },
  { id: "owner-approval-required", label: "Tyler Wallace Phase Factory Alpha review approval required", state: "required" },
  { id: "operator-authority-preserved", label: "Driana Smith-Wallace operator authority preserved", state: "required" },
  { id: "alpha-integration-only", label: "Phase Factory Alpha is integration evidence only", state: "required" },
  { id: "phase-factory-coverage", label: "Phase Factory 100A through 100H coverage required", state: "required" },
  { id: "integration-item-catalog", label: "Integration item catalog required", state: "required" },
  { id: "lineage-summary", label: "Lineage summary required for every item", state: "required" },
  { id: "evidence-pack-reference", label: "Evidence pack reference required for every item", state: "required" },
  { id: "validation-summary", label: "Validation summary required for every item", state: "required" },
  { id: "safety-summary", label: "Safety boundary summary required for every item", state: "required" },
  { id: "owner-review-summary", label: "Owner review summary required for every item", state: "required" },
  { id: "rollback-reference", label: "Rollback reference required for every item", state: "required" },
  { id: "artifact-path-safety", label: "Alpha evidence artifact paths must remain safe relative paths", state: "required" },
  { id: "alpha-manifest", label: "Phase Factory Alpha manifest required", state: "required" },
  { id: "owner-review-manifest", label: "Owner review manifest required", state: "required" },
  { id: "no-autofix", label: "Automatic fix execution is blocked", state: "required" },
  { id: "no-auto-apply", label: "Automatic apply execution is blocked", state: "required" },
  { id: "no-patch", label: "Patch execution is blocked", state: "required" },
  { id: "source-mutation-blocked", label: "Project repo source mutation blocked", state: "required" },
  { id: "branch-creation-blocked", label: "Real branch creation blocked", state: "required" },
  { id: "merge-blocked", label: "Real merge execution blocked", state: "required" },
  { id: "git-push-blocked", label: "Git push blocked", state: "required" },
  { id: "tag-blocked", label: "Tag creation blocked", state: "required" },
  { id: "shell-blocked", label: "Shell and arbitrary command execution blocked", state: "required" },
  { id: "scheduler-blocked", label: "Scheduler, workflow, and iPhone automation mutation blocked", state: "required" },
  { id: "fleet-blocked", label: "Fleet and away-mode execution blocked", state: "required" },
  { id: "self-governance-blocked", label: "Self-approval, self-merge, self-deploy blocked", state: "required" },
  { id: "production-blocked", label: "Production deployment blocked", state: "required" },
  { id: "future-phase-execution-blocked", label: "Future phase auto-run execution blocked", state: "required" },
  { id: "multi-language-doctrine-preserved", label: "Multi-language production doctrine preserved", state: "required" },
  { id: "fail-closed", label: "Phase Factory Alpha validation must fail closed", state: "required" },
];

const phaseFactoryAlphaFields = [
  "phaseFactoryAlphaId",
  "status",
  "owner",
  "operatorAuthorityOwner",
  "sourcePhase",
  "sourceEvidencePackId",
  "phase100GPhaseEvidencePackReady",
  "phaseFactoryStageCount",
  "phaseFactoryIntegrationCount",
  "roadmapTrackCount",
  "multiLanguageProductionTargetCount",
  "safetyGateCount",
  "phaseFactoryAlphaAllowed",
  "phaseBacklogReadAllowed",
  "phaseSpecReadAllowed",
  "phaseOverlayManifestReadAllowed",
  "phaseZipValidationReadAllowed",
  "phaseApplyQueueReadAllowed",
  "phaseTroubleshootingReadAllowed",
  "phaseEvidencePackReadAllowed",
  "ownerReviewAlphaPacketAllowed",
  "autoRunFuturePhasesAllowed",
  "autoFixAllowed",
  "applyExecutionAllowed",
  "patchExecutionAllowed",
  "projectRepoSourceMutationAllowed",
  "realProjectBranchCreationAllowed",
  "realProjectMergeExecutionAllowed",
  "gitPushAllowed",
  "tagCreationAllowed",
  "arbitraryCommandAllowed",
  "shellExecutionAllowed",
  "schedulerWorkflowMutationAllowed",
  "iPhoneAutomationMutationAllowed",
  "fleetExecutionAllowed",
  "awayModeExecutionAllowed",
  "selfApprovalAllowed",
  "selfMergeAllowed",
  "selfDeployAllowed",
  "productionDeploymentAllowed",
  "approvalRecord",
  "phaseFactoryStages",
  "phaseFactoryIntegrationItems",
  "roadmapTracks",
  "multiLanguageProductionTargets",
  "requirements",
  "declaredPaths",
  "checks",
  "blockers",
  "validationFailedCount",
  "packetPath",
  "alphaManifestPath",
  "ownerReviewManifestPath",
  "generatedAt",
  "requiredLineageTypes",
  "acceptanceCriteria",
  "rollbackPlan",
  "alphaManifest",
  "ownerReviewManifest",
  "phaseFactoryAlphaIntegrated",
  "alphaManifestProduced",
  "ownerReviewManifestProduced",
  "readyForOwnerReview",
  "projectRepoSourceMutated",
  "futurePhaseAutoRunExecuted",
  "autoFixExecuted",
  "applyExecuted",
  "patchExecuted",
  "realProjectBranchCreated",
  "realProjectMergePerformed",
  "gitPushPerformed",
  "tagCreated",
  "shellExecuted",
  "productionDeployed",
];

const phaseFactoryStages = [
  { phaseId: "100A", title: "Phase Backlog Generator", outputMode: "owner-review-backlog-packet" },
  { phaseId: "100B", title: "Phase Spec Generator", outputMode: "owner-review-spec-packet" },
  { phaseId: "100C", title: "Phase Overlay ZIP Builder", outputMode: "owner-review-overlay-package" },
  { phaseId: "100D", title: "Phase ZIP Validator", outputMode: "validation-evidence-packet" },
  { phaseId: "100E", title: "Phase Apply Queue", outputMode: "manual-apply-queue-packet" },
  { phaseId: "100F", title: "Phase Troubleshooting Loop", outputMode: "diagnostic-evidence-packet" },
  { phaseId: "100G", title: "Phase Evidence Pack", outputMode: "phase-evidence-bundle" },
  { phaseId: "100H", title: "Phase Factory Alpha", outputMode: "integrated-alpha-evidence" },
];

const lineageIds = {
  "100A": "phase100a-demo-phase-backlog",
  "100B": "phase100b-demo-phase-spec",
  "100C": "phase100c-demo-phase-overlay-zip",
  "100D": "phase100d-demo-phase-zip-validator",
  "100E": "phase100e-demo-phase-apply-queue",
  "100F": "phase100f-demo-phase-troubleshooting-loop",
  "100G": "phase100g-demo-phase-evidence-pack",
  "100H": "phase100h-demo-phase-factory-alpha",
};

const roadmapTracks = [
  "approved-branch-developer",
  "phase-factory",
  "revenue-acceleration",
  "worker-registry-fleet",
  "universal-ingest-knowledge-pack-factory",
  "universal-production-engine",
  "rights-originality-consent-provenance",
  "creator-commercial-media-engine",
  "revenue-studios-domain-adapters",
  "client-portal-public-website",
  "mobile-voice-wearable-private-jarvis",
  "advanced-production-technical-domains",
  "distributed-fleet-agency-productization",
];

const multiLanguageProductionTargets = [
  "TypeScript", "JavaScript", "Python", "Swift", "Kotlin", "Dart", "Java", "C#", "C++", "C", "Rust", "Go", "SQL", "HTML/CSS", "PHP", "Ruby", "PowerShell", "Bash",
];

const requiredLineageTypes = [
  "phase id",
  "lineage id",
  "evidence pack reference",
  "validation summary",
  "safety summary",
  "owner review summary",
  "rollback reference",
  "multi-language doctrine reference",
  "future phase execution block",
];

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function isNonEmptyString(value) { return typeof value === "string" && value.trim().length > 0; }
function isSafePhaseId(phaseId) { return typeof phaseId === "string" && /^100[A-H]$/.test(phaseId); }
function isSafeRelativePath(value) {
  if (!isNonEmptyString(value)) return false;
  if (value.includes("..") || path.isAbsolute(value) || value.includes("\\")) return false;
  return value.startsWith("repo/") || value.startsWith("tools/") || value.startsWith(".sera-") || value.startsWith("docs/") || value.startsWith("scripts/") || value.startsWith("tests/") || value.startsWith("apps/");
}
function ensureDir(filePath) { fs.mkdirSync(path.dirname(filePath), { recursive: true }); }
function writeJson(filePath, value) {
  ensureDir(filePath);
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + "\n", "utf8");
}

function createDefaultFactoryIntegrationItem(stage, index) {
  return {
    phaseId: stage.phaseId,
    sequence: index + 1,
    title: stage.title,
    lineageId: lineageIds[stage.phaseId],
    integrationStatus: "owner-review-alpha-integrated",
    lineageReady: true,
    evidencePackReference: `.sera-phase-evidence-pack/evidence-packs/phase100g-demo-phase-evidence-pack/items/${stage.phaseId}.json`,
    evidenceLinks: [
      `.sera-phase-evidence-pack/evidence-packs/phase100g-demo-phase-evidence-pack/items/${stage.phaseId}.json`,
      `.sera-phase-factory-alpha/integrations/phase100h-demo-phase-factory-alpha/items/${stage.phaseId}.json`,
    ],
    lineageSummary: `${stage.phaseId} ${stage.title} lineage is represented in the Phase Factory Alpha integration packet.`,
    validationSummary: `${stage.phaseId} validation evidence is present for owner review before any future phase action.`,
    safetySummary: `${stage.phaseId} remains review-only: no autofix, auto-run, apply, patch, source mutation, branch, merge, push, tag, shell, scheduler, fleet, self-governance, or production powers.`,
    ownerReviewSummary: `Tyler Wallace review remains required before ${stage.phaseId} can drive any future action path.`,
    rollbackReference: `If ${stage.phaseId} alpha integration is rejected, preserve evidence and return to the last clean tagged main state.`,
    ownerReviewRequired: true,
    futurePhaseAutoRunAllowed: false,
    autoFixAllowed: false,
    applyExecutionAllowed: false,
    patchExecutionAllowed: false,
    sourceMutationAllowed: false,
    realBranchCreationAllowed: false,
    realMergeExecutionAllowed: false,
  };
}

export function createDefaultPhaseFactoryAlphaV1(overrides = {}) {
  const defaults = {
    phaseFactoryAlphaId: "phase100h-demo-phase-factory-alpha",
    owner: "Tyler Wallace",
    operatorAuthorityOwner: "Driana Smith-Wallace",
    sourcePhase: "Phase 100H — Phase Factory Alpha v1",
    sourceEvidencePackId: "phase100g-demo-phase-evidence-pack",
    phase100GPhaseEvidencePackReady: true,
    expectedPhaseFactoryIntegrationCount: 8,
    phaseFactoryStages: clone(phaseFactoryStages),
    phaseFactoryIntegrationItems: clone(phaseFactoryStages).map((stage, index) => createDefaultFactoryIntegrationItem(stage, index)),
    roadmapTracks: clone(roadmapTracks),
    requirements: clone(phaseFactoryAlphaRequirements),
    fields: clone(phaseFactoryAlphaFields),
    declaredPaths: clone(declaredPaths),
    requiredLineageTypes: clone(requiredLineageTypes),
    multiLanguageProductionTargets: clone(multiLanguageProductionTargets),
    approvalRecord: { owner: "Tyler Wallace", operatorAuthorityOwner: "Driana Smith-Wallace", approved: true, selfApproved: false },
    phaseLineageReady: {
      phase100AReady: true,
      phase100BReady: true,
      phase100CReady: true,
      phase100DReady: true,
      phase100EReady: true,
      phase100FReady: true,
      phase100GReady: true,
    },
    boundaries: {
      phaseFactoryAlphaAllowed: true,
      phaseBacklogReadAllowed: true,
      phaseSpecReadAllowed: true,
      phaseOverlayManifestReadAllowed: true,
      phaseZipValidationReadAllowed: true,
      phaseApplyQueueReadAllowed: true,
      phaseTroubleshootingReadAllowed: true,
      phaseEvidencePackReadAllowed: true,
      ownerReviewAlphaPacketAllowed: true,
      autoRunFuturePhasesAllowed: false,
      autoFixAllowed: false,
      applyExecutionAllowed: false,
      patchExecutionAllowed: false,
      projectRepoSourceMutationAllowed: false,
      realProjectBranchCreationAllowed: false,
      realProjectMergeExecutionAllowed: false,
      gitPushAllowed: false,
      tagCreationAllowed: false,
      arbitraryCommandAllowed: false,
      shellExecutionAllowed: false,
      schedulerWorkflowMutationAllowed: false,
      iPhoneAutomationMutationAllowed: false,
      fleetExecutionAllowed: false,
      awayModeExecutionAllowed: false,
      selfApprovalAllowed: false,
      selfMergeAllowed: false,
      selfDeployAllowed: false,
      productionDeploymentAllowed: false,
    },
    projectRepoSourceMutated: false,
    futurePhaseAutoRunExecuted: false,
    realProjectBranchCreated: false,
    realProjectMergePerformed: false,
    gitPushPerformed: false,
    tagCreated: false,
    shellExecuted: false,
    productionDeployed: false,
    autoFixExecuted: false,
    applyExecuted: false,
    patchExecuted: false,
  };
  return { ...defaults, ...overrides };
}

export function inspectPhaseFactoryAlphaV1(config = createDefaultPhaseFactoryAlphaV1()) {
  const blockers = [];
  const checks = [];
  const addCheck = (id, passed, message) => {
    checks.push({ id, passed, message });
    if (!passed) blockers.push(message);
  };
  const boundaries = config.boundaries || {};
  const approvalRecord = config.approvalRecord || {};
  const lineageReady = config.phaseLineageReady || {};

  addCheck("owner", config.owner === "Tyler Wallace", "Owner must be Tyler Wallace for Phase 100H Phase Factory Alpha.");
  addCheck("operator-authority", config.operatorAuthorityOwner === "Driana Smith-Wallace", "Operator authority owner must remain Driana Smith-Wallace.");
  addCheck("phase-100g-ready", config.phase100GPhaseEvidencePackReady === true, "Phase 100G evidence pack must be ready before Phase 100H Alpha.");
  addCheck("source-evidence-pack", config.sourceEvidencePackId === "phase100g-demo-phase-evidence-pack", "Phase 100H must link to the Phase 100G evidence pack.");
  addCheck("approval", approvalRecord.approved === true && approvalRecord.owner === "Tyler Wallace", "Tyler Wallace approval record is required for Phase 100H Alpha.");
  addCheck("no-self-approval", approvalRecord.selfApproved === false, "Self-approval is blocked for Phase 100H Alpha.");
  for (const key of ["phase100AReady", "phase100BReady", "phase100CReady", "phase100DReady", "phase100EReady", "phase100FReady", "phase100GReady"]) {
    addCheck(`lineage-${key}`, lineageReady[key] === true, `${key} must be true for Phase 100H Alpha.`);
  }

  const stages = Array.isArray(config.phaseFactoryStages) ? config.phaseFactoryStages : [];
  addCheck("stage-count", stages.length === 8, "Phase Factory stage count must be 8.");
  for (const stage of stages) {
    addCheck(`stage-${stage.phaseId}-safe`, isSafePhaseId(stage.phaseId), `Phase Factory stage phaseId must be 100A through 100H: ${stage.phaseId}`);
    addCheck(`stage-${stage.phaseId}-title`, isNonEmptyString(stage.title), `Phase Factory stage ${stage.phaseId} requires a title.`);
    addCheck(`stage-${stage.phaseId}-output`, isNonEmptyString(stage.outputMode), `Phase Factory stage ${stage.phaseId} requires an output mode.`);
  }

  const items = Array.isArray(config.phaseFactoryIntegrationItems) ? config.phaseFactoryIntegrationItems : [];
  addCheck("integration-count", items.length === 8, "Phase Factory Alpha integration item count must be 8.");
  const seen = new Set();
  for (const item of items) {
    const phaseId = item?.phaseId;
    addCheck(`item-${phaseId}-phase-id`, isSafePhaseId(phaseId), `Integration item phaseId must be 100A through 100H: ${phaseId}`);
    if (isSafePhaseId(phaseId)) seen.add(phaseId);
    addCheck(`item-${phaseId}-lineage-id`, item?.lineageId === lineageIds[phaseId], `Integration item ${phaseId} requires the expected lineage id.`);
    addCheck(`item-${phaseId}-status`, item?.integrationStatus === "owner-review-alpha-integrated", `Integration item ${phaseId} must remain owner-review-alpha-integrated.`);
    addCheck(`item-${phaseId}-ready`, item?.lineageReady === true, `Integration item ${phaseId} lineageReady must be true.`);
    addCheck(`item-${phaseId}-evidence-pack`, isSafeRelativePath(item?.evidencePackReference), `Integration item ${phaseId} requires a safe evidence pack reference.`);
    const links = Array.isArray(item?.evidenceLinks) ? item.evidenceLinks : [];
    addCheck(`item-${phaseId}-evidence-links`, links.length >= 2 && links.every(isSafeRelativePath), `Integration item ${phaseId} evidence links must be safe relative paths.`);
    addCheck(`item-${phaseId}-lineage-summary`, isNonEmptyString(item?.lineageSummary), `Integration item ${phaseId} requires a lineage summary.`);
    addCheck(`item-${phaseId}-validation-summary`, isNonEmptyString(item?.validationSummary), `Integration item ${phaseId} requires a validation summary.`);
    addCheck(`item-${phaseId}-safety-summary`, isNonEmptyString(item?.safetySummary), `Integration item ${phaseId} requires a safety summary.`);
    addCheck(`item-${phaseId}-owner-review-summary`, isNonEmptyString(item?.ownerReviewSummary), `Integration item ${phaseId} requires an owner review summary.`);
    addCheck(`item-${phaseId}-rollback-reference`, isNonEmptyString(item?.rollbackReference), `Integration item ${phaseId} requires a rollback reference.`);
    addCheck(`item-${phaseId}-owner-review`, item?.ownerReviewRequired === true, `Integration item ${phaseId} ownerReviewRequired must be true.`);
    addCheck(`item-${phaseId}-no-future-auto-run`, item?.futurePhaseAutoRunAllowed === false, `Integration item ${phaseId} futurePhaseAutoRunAllowed must remain false.`);
    addCheck(`item-${phaseId}-no-autofix`, item?.autoFixAllowed === false, `Integration item ${phaseId} autoFixAllowed must remain false.`);
    addCheck(`item-${phaseId}-no-apply`, item?.applyExecutionAllowed === false, `Integration item ${phaseId} applyExecutionAllowed must remain false.`);
    addCheck(`item-${phaseId}-no-patch`, item?.patchExecutionAllowed === false, `Integration item ${phaseId} patchExecutionAllowed must remain false.`);
    addCheck(`item-${phaseId}-no-source-mutation`, item?.sourceMutationAllowed === false, `Integration item ${phaseId} sourceMutationAllowed must remain false.`);
    addCheck(`item-${phaseId}-no-real-branch`, item?.realBranchCreationAllowed === false, `Integration item ${phaseId} realBranchCreationAllowed must remain false.`);
    addCheck(`item-${phaseId}-no-real-merge`, item?.realMergeExecutionAllowed === false, `Integration item ${phaseId} realMergeExecutionAllowed must remain false.`);
  }
  addCheck("integration-complete-set", seen.size === 8, "Phase Factory Alpha must include each phase 100A through 100H exactly once.");

  const declaredFileCount = Array.isArray(config.declaredPaths) ? config.declaredPaths.length : 0;
  addCheck("declared-file-count", declaredFileCount === 5, "Phase 100H must declare exactly 5 source files.");
  for (const declaredPath of config.declaredPaths || []) addCheck(`declared-path-${declaredPath}`, isSafeRelativePath(declaredPath), `Declared path must be a safe relative path: ${declaredPath}`);
  const requirementCount = Array.isArray(config.requirements) ? config.requirements.length : 0;
  addCheck("requirement-count", requirementCount === 38, "Phase 100H must track 38 requirements.");
  const fieldCount = Array.isArray(config.fields) ? config.fields.length : 0;
  addCheck("field-count", fieldCount === 74, "Phase 100H must track 74 output fields.");
  const roadmapTrackCount = Array.isArray(config.roadmapTracks) ? config.roadmapTracks.length : 0;
  addCheck("roadmap-track-count", roadmapTrackCount === 13, "Roadmap track count must remain 13.");
  const multiLanguageProductionTargetCount = Array.isArray(config.multiLanguageProductionTargets) ? config.multiLanguageProductionTargets.length : 0;
  addCheck("multi-language-target-count", multiLanguageProductionTargetCount === 18, "Multi-language production target count must remain 18.");

  const trueBoundaryKeys = [
    "phaseFactoryAlphaAllowed", "phaseBacklogReadAllowed", "phaseSpecReadAllowed", "phaseOverlayManifestReadAllowed", "phaseZipValidationReadAllowed", "phaseApplyQueueReadAllowed", "phaseTroubleshootingReadAllowed", "phaseEvidencePackReadAllowed", "ownerReviewAlphaPacketAllowed",
  ];
  const falseBoundaryKeys = [
    "autoRunFuturePhasesAllowed", "autoFixAllowed", "applyExecutionAllowed", "patchExecutionAllowed", "projectRepoSourceMutationAllowed", "realProjectBranchCreationAllowed", "realProjectMergeExecutionAllowed", "gitPushAllowed", "tagCreationAllowed", "arbitraryCommandAllowed", "shellExecutionAllowed", "schedulerWorkflowMutationAllowed", "iPhoneAutomationMutationAllowed", "fleetExecutionAllowed", "awayModeExecutionAllowed", "selfApprovalAllowed", "selfMergeAllowed", "selfDeployAllowed", "productionDeploymentAllowed",
  ];
  for (const key of trueBoundaryKeys) addCheck(`allowed-${key}`, boundaries[key] === true, `${key} must be true`);
  for (const key of falseBoundaryKeys) addCheck(`blocked-${key}`, boundaries[key] === false, `${key} must remain false`);
  addCheck("source-not-mutated", config.projectRepoSourceMutated === false, "projectRepoSourceMutated must remain false");
  addCheck("future-auto-run-not-executed", config.futurePhaseAutoRunExecuted === false, "futurePhaseAutoRunExecuted must remain false");
  addCheck("autofix-not-executed", config.autoFixExecuted === false, "autoFixExecuted must remain false");
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
    declaredFileCount,
    phaseFactoryAlphaRequirementCount: requirementCount,
    phaseFactoryAlphaFieldCount: fieldCount,
    phaseFactoryStageCount: stages.length,
    phaseFactoryIntegrationCount: items.length,
    roadmapTrackCount,
    multiLanguageProductionTargetCount,
    safetyGateCount: 1800,
    ...Object.fromEntries(trueBoundaryKeys.map((key) => [key, boundaries[key] === true])),
    ...Object.fromEntries(falseBoundaryKeys.map((key) => [key, boundaries[key] === true ? true : false])),
    projectRepoSourceMutated: config.projectRepoSourceMutated === true,
    futurePhaseAutoRunExecuted: config.futurePhaseAutoRunExecuted === true,
    autoFixExecuted: config.autoFixExecuted === true,
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

export function runPhaseFactoryAlphaV1(config = createDefaultPhaseFactoryAlphaV1(), options = {}) {
  const inspection = inspectPhaseFactoryAlphaV1(config);
  const artifactRoot = options.artifactRoot || process.cwd();
  const runId = config.phaseFactoryAlphaId || "phase100h-demo-phase-factory-alpha";
  const runRoot = path.join(artifactRoot, ".sera-phase-factory-alpha", "integrations", runId);
  fs.mkdirSync(runRoot, { recursive: true });
  const generatedAt = new Date().toISOString();
  const validationFailedCount = inspection.ok && config.phaseFactoryIntegrationItems.length === config.expectedPhaseFactoryIntegrationCount ? 0 : 1;
  const phaseFactoryAlphaIntegrated = validationFailedCount === 0;
  const status = phaseFactoryAlphaIntegrated ? "phase-factory-alpha-ready" : "phase-factory-alpha-validation-failed";
  const alphaManifest = {
    phaseFactoryAlphaId: runId,
    sourceEvidencePackId: config.sourceEvidencePackId,
    validationFailedCount,
    phaseFactoryAlphaIntegrated,
    phaseFactoryIntegrationCount: config.phaseFactoryIntegrationItems.length,
    futurePhaseAutoRunAllowed: false,
    autoFixAllowed: false,
    applyExecutionAllowed: false,
    patchExecutionAllowed: false,
    projectRepoSourceMutationAllowed: false,
    generatedAt,
  };
  const ownerReviewManifest = {
    phaseFactoryAlphaId: runId,
    owner: config.owner,
    operatorAuthorityOwner: config.operatorAuthorityOwner,
    ownerReviewAlphaPacketAllowed: true,
    ownerReviewRequired: true,
    readyForOwnerReview: phaseFactoryAlphaIntegrated,
    futurePhaseAutoRunExecuted: false,
    autoFixExecuted: false,
    applyExecuted: false,
    patchExecuted: false,
    generatedAt,
  };
  const packet = {
    phaseFactoryAlphaId: runId,
    status,
    owner: config.owner,
    operatorAuthorityOwner: config.operatorAuthorityOwner,
    sourcePhase: config.sourcePhase,
    sourceEvidencePackId: config.sourceEvidencePackId,
    phase100GPhaseEvidencePackReady: config.phase100GPhaseEvidencePackReady,
    phaseLineageReady: config.phaseLineageReady,
    phaseFactoryStageCount: inspection.phaseFactoryStageCount,
    phaseFactoryIntegrationCount: inspection.phaseFactoryIntegrationCount,
    roadmapTrackCount: inspection.roadmapTrackCount,
    multiLanguageProductionTargetCount: inspection.multiLanguageProductionTargetCount,
    safetyGateCount: inspection.safetyGateCount,
    phaseFactoryAlphaAllowed: inspection.phaseFactoryAlphaAllowed,
    phaseBacklogReadAllowed: inspection.phaseBacklogReadAllowed,
    phaseSpecReadAllowed: inspection.phaseSpecReadAllowed,
    phaseOverlayManifestReadAllowed: inspection.phaseOverlayManifestReadAllowed,
    phaseZipValidationReadAllowed: inspection.phaseZipValidationReadAllowed,
    phaseApplyQueueReadAllowed: inspection.phaseApplyQueueReadAllowed,
    phaseTroubleshootingReadAllowed: inspection.phaseTroubleshootingReadAllowed,
    phaseEvidencePackReadAllowed: inspection.phaseEvidencePackReadAllowed,
    ownerReviewAlphaPacketAllowed: inspection.ownerReviewAlphaPacketAllowed,
    autoRunFuturePhasesAllowed: inspection.autoRunFuturePhasesAllowed,
    autoFixAllowed: inspection.autoFixAllowed,
    applyExecutionAllowed: inspection.applyExecutionAllowed,
    patchExecutionAllowed: inspection.patchExecutionAllowed,
    projectRepoSourceMutationAllowed: inspection.projectRepoSourceMutationAllowed,
    realProjectBranchCreationAllowed: inspection.realProjectBranchCreationAllowed,
    realProjectMergeExecutionAllowed: inspection.realProjectMergeExecutionAllowed,
    gitPushAllowed: inspection.gitPushAllowed,
    tagCreationAllowed: inspection.tagCreationAllowed,
    arbitraryCommandAllowed: inspection.arbitraryCommandAllowed,
    shellExecutionAllowed: inspection.shellExecutionAllowed,
    schedulerWorkflowMutationAllowed: inspection.schedulerWorkflowMutationAllowed,
    iPhoneAutomationMutationAllowed: inspection.iPhoneAutomationMutationAllowed,
    fleetExecutionAllowed: inspection.fleetExecutionAllowed,
    awayModeExecutionAllowed: inspection.awayModeExecutionAllowed,
    selfApprovalAllowed: inspection.selfApprovalAllowed,
    selfMergeAllowed: inspection.selfMergeAllowed,
    selfDeployAllowed: inspection.selfDeployAllowed,
    productionDeploymentAllowed: inspection.productionDeploymentAllowed,
    approvalRecord: config.approvalRecord,
    phaseFactoryStages: config.phaseFactoryStages,
    phaseFactoryIntegrationItems: config.phaseFactoryIntegrationItems,
    roadmapTracks: config.roadmapTracks,
    multiLanguageProductionTargets: config.multiLanguageProductionTargets,
    requirements: config.requirements,
    declaredPaths: config.declaredPaths,
    requiredLineageTypes: config.requiredLineageTypes,
    checks: inspection.checks,
    blockers: inspection.blockers,
    validationFailedCount,
    alphaManifest,
    ownerReviewManifest,
    phaseFactoryAlphaIntegrated,
    alphaManifestProduced: true,
    ownerReviewManifestProduced: true,
    readyForOwnerReview: ownerReviewManifest.readyForOwnerReview,
    projectRepoSourceMutated: inspection.projectRepoSourceMutated,
    futurePhaseAutoRunExecuted: inspection.futurePhaseAutoRunExecuted,
    autoFixExecuted: inspection.autoFixExecuted,
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
  const packetPath = path.join(runRoot, "phase-factory-alpha.json");
  const alphaManifestPath = path.join(runRoot, "alpha-manifest.json");
  const ownerReviewManifestPath = path.join(runRoot, "owner-review-manifest.json");
  writeJson(packetPath, packet);
  writeJson(alphaManifestPath, alphaManifest);
  writeJson(ownerReviewManifestPath, ownerReviewManifest);
  return {
    ...inspection,
    ok: phaseFactoryAlphaIntegrated,
    phaseFactoryAlphaStatus: status,
    validationFailedCount,
    phaseFactoryAlphaId: runId,
    sourceEvidencePackId: config.sourceEvidencePackId,
    phase100GPhaseEvidencePackReady: config.phase100GPhaseEvidencePackReady,
    phaseFactoryAlphaIntegrated,
    alphaManifestProduced: true,
    ownerReviewManifestProduced: true,
    readyForOwnerReview: ownerReviewManifest.readyForOwnerReview,
    projectRepoSourceMutated: inspection.projectRepoSourceMutated,
    futurePhaseAutoRunExecuted: inspection.futurePhaseAutoRunExecuted,
    autoFixExecuted: inspection.autoFixExecuted,
    applyExecuted: inspection.applyExecuted,
    patchExecuted: inspection.patchExecuted,
    realProjectBranchCreated: inspection.realProjectBranchCreated,
    realProjectMergePerformed: inspection.realProjectMergePerformed,
    gitPushPerformed: inspection.gitPushPerformed,
    tagCreated: inspection.tagCreated,
    shellExecuted: inspection.shellExecuted,
    productionDeployed: inspection.productionDeployed,
    packetPath,
    alphaManifestPath,
    ownerReviewManifestPath,
  };
}

export const phaseFactoryAlphaV1 = {
  declaredPaths,
  phaseFactoryAlphaRequirements,
  phaseFactoryAlphaFields,
  phaseFactoryStages,
  roadmapTracks,
  multiLanguageProductionTargets,
  requiredLineageTypes,
  createDefaultPhaseFactoryAlphaV1,
  inspectPhaseFactoryAlphaV1,
  runPhaseFactoryAlphaV1,
};
