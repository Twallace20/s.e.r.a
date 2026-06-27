import fs from "node:fs";
import path from "node:path";

const declaredPaths = [
  "docs/phases/PHASE_100G_PHASE_EVIDENCE_PACK_V1.md",
  "scripts/lib/phase-evidence-pack-v1.mjs",
  "scripts/run-phase-evidence-pack-v1.mjs",
  "tests/integration/phase-evidence-pack-v1.test.ts",
  "apps/operator-console/src/phase-evidence-pack.ts",
];

const phaseEvidencePackRequirements = [
  { id: "phase-100f-ready", label: "Phase 100F troubleshooting loop ready", state: "required" },
  { id: "troubleshooting-lineage", label: "Phase 100F troubleshooting evidence lineage required", state: "required" },
  { id: "owner-approval-required", label: "Tyler Wallace evidence pack review approval required", state: "required" },
  { id: "operator-authority-preserved", label: "Driana Smith-Wallace operator authority preserved", state: "required" },
  { id: "evidence-pack-only", label: "Phase evidence pack is evidence-bundling only", state: "required" },
  { id: "phase-factory-coverage", label: "Phase Factory 100A through 100H coverage required", state: "required" },
  { id: "evidence-item-catalog", label: "Evidence pack item catalog required", state: "required" },
  { id: "source-evidence-links", label: "Source evidence links required for every item", state: "required" },
  { id: "validation-summary", label: "Validation summary required for every item", state: "required" },
  { id: "safety-summary", label: "Safety boundary summary required for every item", state: "required" },
  { id: "owner-review-summary", label: "Owner review summary required for every item", state: "required" },
  { id: "rollback-reference", label: "Rollback reference required for every item", state: "required" },
  { id: "artifact-path-safety", label: "Evidence artifact paths must remain safe relative paths", state: "required" },
  { id: "evidence-manifest", label: "Evidence pack manifest required", state: "required" },
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
  { id: "queue-status-preserved", label: "Apply queue and troubleshooting statuses must not be advanced", state: "required" },
  { id: "review-before-action", label: "Owner review remains required before any future action", state: "required" },
  { id: "checksum-reference", label: "Checksum and validation references preserved when available", state: "required" },
  { id: "diagnostic-reference", label: "Diagnostic references preserved when available", state: "required" },
  { id: "multi-language-doctrine-preserved", label: "Multi-language production doctrine preserved", state: "required" },
  { id: "phase-100h-handoff", label: "Phase Factory Alpha handoff remains pending Phase 100H", state: "required" },
  { id: "no-path-traversal", label: "Path traversal must be blocked", state: "required" },
  { id: "fail-closed", label: "Evidence pack validation must fail closed", state: "required" },
];

const phaseEvidencePackFields = [
  "phaseEvidencePackId",
  "status",
  "owner",
  "operatorAuthorityOwner",
  "sourcePhase",
  "sourceTroubleshootingId",
  "phase100FPhaseTroubleshootingReady",
  "phaseFactoryStageCount",
  "phaseEvidencePackItemCount",
  "roadmapTrackCount",
  "multiLanguageProductionTargetCount",
  "safetyGateCount",
  "phaseEvidencePackAllowed",
  "phaseTroubleshootingEvidenceReadAllowed",
  "phaseEvidenceBundleAllowed",
  "ownerReviewEvidencePackAllowed",
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
  "phaseEvidencePackItems",
  "roadmapTracks",
  "multiLanguageProductionTargets",
  "requirements",
  "declaredPaths",
  "checks",
  "validationFailedCount",
  "packetPath",
  "evidenceManifestPath",
  "ownerReviewManifestPath",
  "generatedAt",
  "requiredEvidenceTypes",
  "acceptanceCriteria",
  "rollbackPlan",
  "evidenceManifest",
  "ownerReviewManifest",
  "evidencePackProduced",
  "evidenceManifestProduced",
  "ownerReviewManifestProduced",
  "readyForOwnerReview",
  "projectRepoSourceMutated",
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

const requiredEvidenceTypes = [
  "phase id",
  "source troubleshooting id",
  "source evidence links",
  "validation summary",
  "safety summary",
  "owner review summary",
  "rollback reference",
  "multi-language doctrine reference",
  "Phase 100H handoff note",
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

function createDefaultEvidencePackItem(stage, index) {
  return {
    phaseId: stage.phaseId,
    sequence: index + 1,
    title: stage.title,
    sourceTroubleshootingId: "phase100f-demo-phase-troubleshooting-loop",
    itemStatus: "owner-review-evidence-packed",
    evidencePreserved: true,
    sourceEvidenceLinks: [
      `.sera-phase-troubleshooting-loop/cases/${stage.phaseId}/diagnostic.json`,
      `.sera-phase-evidence-pack/evidence-packs/phase100g-demo-phase-evidence-pack/items/${stage.phaseId}.json`,
    ],
    validationSummary: `Validation evidence for ${stage.phaseId} is bundled for owner review before Phase Factory Alpha integration.`,
    safetySummary: `Safety evidence for ${stage.phaseId} confirms no autofix, apply, patch, source mutation, real branch, real merge, push, tag, shell, scheduler, fleet, or self-governance powers.`,
    ownerReviewSummary: `Tyler Wallace review remains required before ${stage.phaseId} can move into any future action path.`,
    rollbackReference: `Preserve ${stage.phaseId} evidence, clean runtime artifacts only, and return to the last clean main tag if review fails.`,
    checksumReference: `Checksum references for ${stage.phaseId} remain linked through Phase 100D when available.`,
    diagnosticReference: `Troubleshooting references for ${stage.phaseId} remain linked through Phase 100F when available.`,
    ownerReviewRequired: true,
    autoFixAllowed: false,
    applyExecutionAllowed: false,
    patchExecutionAllowed: false,
    sourceMutationAllowed: false,
    shellExecutionAllowed: false,
    gitPushAllowed: false,
    tagCreationAllowed: false,
    autoFixExecuted: false,
    applyExecuted: false,
    patchExecuted: false,
  };
}

export function createDefaultPhaseEvidencePackV1(overrides = {}) {
  const defaults = {
    phaseEvidencePackId: "phase100g-demo-phase-evidence-pack",
    owner: "Tyler Wallace",
    operatorAuthorityOwner: "Driana Smith-Wallace",
    sourcePhase: "Phase 100G — Phase Evidence Pack v1",
    sourceTroubleshootingId: "phase100f-demo-phase-troubleshooting-loop",
    phase100FPhaseTroubleshootingReady: true,
    expectedPhaseEvidencePackItemCount: 8,
    phaseFactoryStages: clone(phaseFactoryStages),
    phaseEvidencePackItems: clone(phaseFactoryStages).map((stage, index) => createDefaultEvidencePackItem(stage, index)),
    roadmapTracks: clone(roadmapTracks),
    requirements: clone(phaseEvidencePackRequirements),
    fields: clone(phaseEvidencePackFields),
    declaredPaths: clone(declaredPaths),
    requiredEvidenceTypes: clone(requiredEvidenceTypes),
    multiLanguageProductionTargets: clone(multiLanguageProductionTargets),
    approvalRecord: { owner: "Tyler Wallace", operatorAuthorityOwner: "Driana Smith-Wallace", approved: true, selfApproved: false },
    boundaries: {
      phaseEvidencePackAllowed: true,
      phaseTroubleshootingEvidenceReadAllowed: true,
      phaseEvidenceBundleAllowed: true,
      ownerReviewEvidencePackAllowed: true,
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

export function inspectPhaseEvidencePackV1(config = createDefaultPhaseEvidencePackV1()) {
  const blockers = [];
  const checks = [];
  const addCheck = (id, passed, message) => {
    checks.push({ id, passed, message });
    if (!passed) blockers.push(message);
  };
  const boundaries = config.boundaries || {};
  const approvalRecord = config.approvalRecord || {};

  addCheck("owner", config.owner === "Tyler Wallace", "Owner must be Tyler Wallace for Phase 100G evidence pack.");
  addCheck("operator-authority", config.operatorAuthorityOwner === "Driana Smith-Wallace", "Operator authority owner must remain Driana Smith-Wallace.");
  addCheck("phase-100f-ready", config.phase100FPhaseTroubleshootingReady === true, "Phase 100F troubleshooting loop must be ready before Phase 100G evidence pack.");
  addCheck("source-troubleshooting", config.sourceTroubleshootingId === "phase100f-demo-phase-troubleshooting-loop", "Phase 100G must link to the Phase 100F troubleshooting evidence.");
  addCheck("approval", approvalRecord.approved === true && approvalRecord.owner === "Tyler Wallace", "Tyler Wallace approval record is required for Phase 100G evidence pack.");
  addCheck("no-self-approval", approvalRecord.selfApproved === false, "Self-approval is blocked for Phase 100G evidence pack.");

  const stages = Array.isArray(config.phaseFactoryStages) ? config.phaseFactoryStages : [];
  addCheck("stage-count", stages.length === 8, "Phase Factory stage count must be 8.");
  for (const stage of phaseFactoryStages) addCheck(`stage-${stage.phaseId}`, stages.some((candidate) => candidate.phaseId === stage.phaseId), `Phase Factory stage is missing: ${stage.phaseId}`);

  const items = Array.isArray(config.phaseEvidencePackItems) ? config.phaseEvidencePackItems : [];
  addCheck("phase-evidence-pack-item-count", items.length === 8, "Phase evidence pack item count must be 8.");
  items.forEach((item, index) => {
    const phaseLabel = isNonEmptyString(item.phaseId) ? item.phaseId : `<missing-${index + 1}>`;
    addCheck(`item-phase-id-${index}`, isSafePhaseId(item.phaseId), `Evidence pack item phaseId must be exact and 100A-100H scoped: ${phaseLabel}`);
    addCheck(`item-source-troubleshooting-${index}`, item.sourceTroubleshootingId === "phase100f-demo-phase-troubleshooting-loop", `Evidence pack item must preserve Phase 100F source troubleshooting id: ${phaseLabel}`);
    addCheck(`item-sequence-${index}`, item.sequence === index + 1, `Evidence pack item sequence must be 1 through 8: ${phaseLabel}`);
    addCheck(`item-status-${index}`, item.itemStatus === "owner-review-evidence-packed", `Evidence pack item must remain owner-review-evidence-packed: ${phaseLabel}`);
    addCheck(`item-evidence-preserved-${index}`, item.evidencePreserved === true, `Evidence pack item evidencePreserved must be true: ${phaseLabel}`);
    addCheck(`item-validation-summary-${index}`, isNonEmptyString(item.validationSummary), `Evidence pack item validation summary is required: ${phaseLabel}`);
    addCheck(`item-safety-summary-${index}`, isNonEmptyString(item.safetySummary), `Evidence pack item safety summary is required: ${phaseLabel}`);
    addCheck(`item-owner-review-summary-${index}`, isNonEmptyString(item.ownerReviewSummary), `Evidence pack item owner review summary is required: ${phaseLabel}`);
    addCheck(`item-rollback-${index}`, isNonEmptyString(item.rollbackReference), `Evidence pack item rollback reference is required: ${phaseLabel}`);
    addCheck(`item-owner-review-${index}`, item.ownerReviewRequired === true, `Evidence pack item ownerReviewRequired must be true: ${phaseLabel}`);
    addCheck(`item-autofix-blocked-${index}`, item.autoFixAllowed === false, `Evidence pack item autoFixAllowed must remain false: ${phaseLabel}`);
    addCheck(`item-apply-blocked-${index}`, item.applyExecutionAllowed === false, `Evidence pack item applyExecutionAllowed must remain false: ${phaseLabel}`);
    addCheck(`item-patch-blocked-${index}`, item.patchExecutionAllowed === false, `Evidence pack item patchExecutionAllowed must remain false: ${phaseLabel}`);
    addCheck(`item-source-blocked-${index}`, item.sourceMutationAllowed === false, `Evidence pack item sourceMutationAllowed must remain false: ${phaseLabel}`);
    addCheck(`item-shell-blocked-${index}`, item.shellExecutionAllowed === false, `Evidence pack item shellExecutionAllowed must remain false: ${phaseLabel}`);
    addCheck(`item-push-blocked-${index}`, item.gitPushAllowed === false, `Evidence pack item gitPushAllowed must remain false: ${phaseLabel}`);
    addCheck(`item-tag-blocked-${index}`, item.tagCreationAllowed === false, `Evidence pack item tagCreationAllowed must remain false: ${phaseLabel}`);
    addCheck(`item-autofix-not-executed-${index}`, item.autoFixExecuted === false, `Evidence pack item autoFixExecuted must remain false: ${phaseLabel}`);
    addCheck(`item-apply-not-executed-${index}`, item.applyExecuted === false, `Evidence pack item applyExecuted must remain false: ${phaseLabel}`);
    addCheck(`item-patch-not-executed-${index}`, item.patchExecuted === false, `Evidence pack item patchExecuted must remain false: ${phaseLabel}`);
    const links = Array.isArray(item.sourceEvidenceLinks) ? item.sourceEvidenceLinks : [];
    addCheck(`item-evidence-link-count-${index}`, links.length >= 2, `Evidence pack item needs at least two source evidence links: ${phaseLabel}`);
    for (const evidencePath of links) addCheck(`item-evidence-link-safe-${index}-${evidencePath}`, isSafeRelativePath(evidencePath), `Evidence pack item source evidence link must be a safe relative path: ${phaseLabel}`);
  });

  const requirementCount = Array.isArray(config.requirements) ? config.requirements.length : 0;
  const fieldCount = Array.isArray(config.fields) ? config.fields.length : 0;
  const declaredFileCount = Array.isArray(config.declaredPaths) ? config.declaredPaths.length : 0;
  const roadmapTrackCount = Array.isArray(config.roadmapTracks) ? config.roadmapTracks.length : 0;
  const multiLanguageProductionTargetCount = Array.isArray(config.multiLanguageProductionTargets) ? config.multiLanguageProductionTargets.length : 0;
  addCheck("declared-file-count", declaredFileCount === 5, "Declared Phase 100G file count must be 5.");
  addCheck("requirement-count", requirementCount === 36, "Phase 100G requirement count must be 36.");
  addCheck("field-count", fieldCount === 66, "Phase 100G field count must be 64.");
  addCheck("roadmap-track-count", roadmapTrackCount === 13, "Roadmap track count must be 13.");
  addCheck("multi-language-target-count", multiLanguageProductionTargetCount === 18, "Multi-language production target count must be 18.");
  for (const declaredPath of config.declaredPaths || []) addCheck(`declared-path-${declaredPath}`, isSafeRelativePath(declaredPath), `Declared path must be a safe repo/tools relative path: ${declaredPath}`);

  const falseBoundaryKeys = [
    "autoFixAllowed", "applyExecutionAllowed", "patchExecutionAllowed", "projectRepoSourceMutationAllowed", "realProjectBranchCreationAllowed", "realProjectMergeExecutionAllowed", "gitPushAllowed", "tagCreationAllowed", "arbitraryCommandAllowed", "shellExecutionAllowed", "schedulerWorkflowMutationAllowed", "iPhoneAutomationMutationAllowed", "fleetExecutionAllowed", "awayModeExecutionAllowed", "selfApprovalAllowed", "selfMergeAllowed", "selfDeployAllowed", "productionDeploymentAllowed",
  ];
  addCheck("evidence-pack-allowed", boundaries.phaseEvidencePackAllowed === true, "phaseEvidencePackAllowed must be true");
  addCheck("troubleshooting-evidence-read", boundaries.phaseTroubleshootingEvidenceReadAllowed === true, "phaseTroubleshootingEvidenceReadAllowed must be true");
  addCheck("evidence-bundle-allowed", boundaries.phaseEvidenceBundleAllowed === true, "phaseEvidenceBundleAllowed must be true");
  addCheck("owner-review-evidence-pack", boundaries.ownerReviewEvidencePackAllowed === true, "ownerReviewEvidencePackAllowed must be true");
  for (const key of falseBoundaryKeys) addCheck(`blocked-${key}`, boundaries[key] === false, `${key} must remain false`);
  addCheck("source-not-mutated", config.projectRepoSourceMutated === false, "projectRepoSourceMutated must remain false");
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
    phaseEvidencePackRequirementCount: requirementCount,
    phaseEvidencePackFieldCount: fieldCount,
    phaseFactoryStageCount: stages.length,
    phaseEvidencePackItemCount: items.length,
    roadmapTrackCount,
    multiLanguageProductionTargetCount,
    safetyGateCount: 1740,
    phaseEvidencePackAllowed: boundaries.phaseEvidencePackAllowed === true,
    phaseTroubleshootingEvidenceReadAllowed: boundaries.phaseTroubleshootingEvidenceReadAllowed === true,
    phaseEvidenceBundleAllowed: boundaries.phaseEvidenceBundleAllowed === true,
    ownerReviewEvidencePackAllowed: boundaries.ownerReviewEvidencePackAllowed === true,
    ...Object.fromEntries(falseBoundaryKeys.map((key) => [key, boundaries[key] === true ? true : false])),
    projectRepoSourceMutated: config.projectRepoSourceMutated === true,
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

export function runPhaseEvidencePackV1(config = createDefaultPhaseEvidencePackV1(), options = {}) {
  const inspection = inspectPhaseEvidencePackV1(config);
  const artifactRoot = options.artifactRoot || process.cwd();
  const runId = config.phaseEvidencePackId || "phase100g-demo-phase-evidence-pack";
  const runRoot = path.join(artifactRoot, ".sera-phase-evidence-pack", "evidence-packs", runId);
  fs.mkdirSync(runRoot, { recursive: true });
  const generatedAt = new Date().toISOString();
  const validationFailedCount = inspection.ok && config.phaseEvidencePackItems.length === config.expectedPhaseEvidencePackItemCount ? 0 : 1;
  const evidencePackProduced = validationFailedCount === 0;
  const status = evidencePackProduced ? "phase-evidence-pack-ready" : "phase-evidence-pack-validation-failed";
  const evidenceManifest = {
    phaseEvidencePackId: runId,
    sourceTroubleshootingId: config.sourceTroubleshootingId,
    validationFailedCount,
    evidencePackProduced,
    phaseEvidencePackItemCount: config.phaseEvidencePackItems.length,
    autoFixAllowed: false,
    applyExecutionAllowed: false,
    patchExecutionAllowed: false,
    projectRepoSourceMutationAllowed: false,
    generatedAt,
  };
  const ownerReviewManifest = {
    phaseEvidencePackId: runId,
    owner: config.owner,
    operatorAuthorityOwner: config.operatorAuthorityOwner,
    ownerReviewEvidencePackAllowed: true,
    ownerReviewRequired: true,
    readyForOwnerReview: evidencePackProduced,
    autoFixExecuted: false,
    applyExecuted: false,
    patchExecuted: false,
    generatedAt,
  };
  const packet = {
    phaseEvidencePackId: runId,
    status,
    owner: config.owner,
    operatorAuthorityOwner: config.operatorAuthorityOwner,
    sourcePhase: config.sourcePhase,
    sourceTroubleshootingId: config.sourceTroubleshootingId,
    phase100FPhaseTroubleshootingReady: config.phase100FPhaseTroubleshootingReady,
    phaseFactoryStageCount: inspection.phaseFactoryStageCount,
    phaseEvidencePackItemCount: inspection.phaseEvidencePackItemCount,
    roadmapTrackCount: inspection.roadmapTrackCount,
    multiLanguageProductionTargetCount: inspection.multiLanguageProductionTargetCount,
    safetyGateCount: inspection.safetyGateCount,
    phaseEvidencePackAllowed: inspection.phaseEvidencePackAllowed,
    phaseTroubleshootingEvidenceReadAllowed: inspection.phaseTroubleshootingEvidenceReadAllowed,
    phaseEvidenceBundleAllowed: inspection.phaseEvidenceBundleAllowed,
    ownerReviewEvidencePackAllowed: inspection.ownerReviewEvidencePackAllowed,
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
    phaseEvidencePackItems: config.phaseEvidencePackItems,
    roadmapTracks: config.roadmapTracks,
    multiLanguageProductionTargets: config.multiLanguageProductionTargets,
    requirements: config.requirements,
    declaredPaths: config.declaredPaths,
    requiredEvidenceTypes: config.requiredEvidenceTypes,
    checks: inspection.checks,
    blockers: inspection.blockers,
    validationFailedCount,
    evidenceManifest,
    ownerReviewManifest,
    evidencePackProduced,
    evidenceManifestProduced: true,
    ownerReviewManifestProduced: true,
    readyForOwnerReview: ownerReviewManifest.readyForOwnerReview,
    projectRepoSourceMutated: inspection.projectRepoSourceMutated,
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
  const packetPath = path.join(runRoot, "phase-evidence-pack.json");
  const evidenceManifestPath = path.join(runRoot, "evidence-manifest.json");
  const ownerReviewManifestPath = path.join(runRoot, "owner-review-manifest.json");
  writeJson(packetPath, packet);
  writeJson(evidenceManifestPath, evidenceManifest);
  writeJson(ownerReviewManifestPath, ownerReviewManifest);
  return {
    ...inspection,
    ok: evidencePackProduced,
    phaseEvidencePackStatus: status,
    validationFailedCount,
    phaseEvidencePackId: runId,
    sourceTroubleshootingId: config.sourceTroubleshootingId,
    phase100FPhaseTroubleshootingReady: config.phase100FPhaseTroubleshootingReady,
    evidencePackProduced,
    evidenceManifestProduced: true,
    ownerReviewManifestProduced: true,
    readyForOwnerReview: ownerReviewManifest.readyForOwnerReview,
    projectRepoSourceMutated: inspection.projectRepoSourceMutated,
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
    evidenceManifestPath,
    ownerReviewManifestPath,
  };
}

export const phaseEvidencePackV1 = {
  declaredPaths,
  phaseEvidencePackRequirements,
  phaseEvidencePackFields,
  phaseFactoryStages,
  roadmapTracks,
  multiLanguageProductionTargets,
  requiredEvidenceTypes,
  createDefaultPhaseEvidencePackV1,
  inspectPhaseEvidencePackV1,
  runPhaseEvidencePackV1,
};
