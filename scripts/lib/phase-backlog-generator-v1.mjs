import fs from "node:fs";
import path from "node:path";

const declaredPaths = [
  "docs/phases/PHASE_100A_PHASE_BACKLOG_GENERATOR_V1.md",
  "scripts/lib/phase-backlog-generator-v1.mjs",
  "scripts/run-phase-backlog-generator-v1.mjs",
  "tests/integration/phase-backlog-generator-v1.test.ts",
  "apps/operator-console/src/phase-backlog-generator.ts",
];

const phaseBacklogRequirements = [
  { id: "phase-100-alpha-ready", label: "Phase 100 approved branch developer Alpha ready", state: "required" },
  { id: "owner-approval-required", label: "Owner approval required", state: "required" },
  { id: "operator-authority-preserved", label: "Operator authority owner preserved", state: "required" },
  { id: "planning-only", label: "Phase backlog generation is planning-only", state: "required" },
  { id: "exact-phase-ids", label: "Phase IDs must be exact and roadmap-scoped", state: "required" },
  { id: "ordered-sequence", label: "Phase backlog must preserve sequence order", state: "required" },
  { id: "purpose-required", label: "Each phase needs a purpose", state: "required" },
  { id: "owner-review-required", label: "Each phase needs owner review", state: "required" },
  { id: "safety-boundaries-required", label: "Each phase needs safety boundaries", state: "required" },
  { id: "evidence-required", label: "Each phase needs evidence expectations", state: "required" },
  { id: "validation-required", label: "Each phase needs validation expectations", state: "required" },
  { id: "rollback-required", label: "Each phase needs a rollback note", state: "required" },
  { id: "roadmap-track-required", label: "Each phase must map to a roadmap track", state: "required" },
  { id: "phase-factory-stages-required", label: "Phase Factory stages 100A through 100H required", state: "required" },
  { id: "multi-language-doctrine-preserved", label: "Multi-language production doctrine preserved", state: "required" },
  { id: "no-spec-generation", label: "Phase spec generation blocked until Phase 100B", state: "required" },
  { id: "no-overlay-build", label: "Overlay ZIP building blocked until Phase 100C", state: "required" },
  { id: "no-patch-execution", label: "Patch execution blocked", state: "required" },
  { id: "no-source-mutation", label: "Project repo source mutation blocked", state: "required" },
  { id: "no-real-branches", label: "Real project branch creation blocked", state: "required" },
  { id: "no-real-merge", label: "Real project merge execution blocked", state: "required" },
  { id: "no-git-push-tag", label: "Git push and tag creation blocked", state: "required" },
  { id: "no-shell", label: "Arbitrary command and shell execution blocked", state: "required" },
  { id: "no-self-governance", label: "Self-approval, self-merge, and self-deploy blocked", state: "required" },
];

const phaseBacklogFields = [
  "phaseBacklogId",
  "status",
  "owner",
  "operatorAuthorityOwner",
  "sourcePhase",
  "phase100ApprovedBranchDeveloperAlphaReady",
  "phaseFactoryStageCount",
  "phaseBacklogItemCount",
  "roadmapTrackCount",
  "multiLanguageProductionTargetCount",
  "safetyGateCount",
  "phaseBacklogGenerationAllowed",
  "ownerReviewBacklogPacketAllowed",
  "phaseSpecGenerationAllowed",
  "overlayZipBuildAllowed",
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
  "approvalRecord",
  "phaseFactoryStages",
  "phaseBacklogItems",
  "roadmapTracks",
  "multiLanguageProductionTargets",
  "requirements",
  "declaredPaths",
  "checks",
  "validationFailedCount",
  "packetPath",
  "manifestPath",
  "generatedAt",
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
  "TypeScript",
  "JavaScript",
  "Python",
  "Swift",
  "Kotlin",
  "Dart",
  "Java",
  "C#",
  "C++",
  "C",
  "Rust",
  "Go",
  "SQL",
  "HTML/CSS",
  "PHP",
  "Ruby",
  "PowerShell",
  "Bash",
];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function isSafePhaseId(phaseId) {
  return typeof phaseId === "string" && /^100[A-H]$/.test(phaseId);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function writeJson(filePath, value) {
  ensureDir(filePath);
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + "\n", "utf8");
}

export function createDefaultPhaseBacklogGeneratorV1(overrides = {}) {
  const defaults = {
    phaseBacklogId: "phase100a-demo-phase-backlog",
    owner: "Tyler Wallace",
    operatorAuthorityOwner: "Driana Smith-Wallace",
    sourcePhase: "Phase 100A — Phase Backlog Generator v1",
    phase100ApprovedBranchDeveloperAlphaReady: true,
    expectedPhaseBacklogItemCount: 8,
    phaseFactoryStages: clone(phaseFactoryStages),
    phaseBacklogItems: clone(phaseFactoryStages).map((stage, index) => ({
      phaseId: stage.phaseId,
      sequence: index + 1,
      title: stage.title,
      roadmapTrack: "phase-factory",
      purpose: `${stage.title} prepares the next safe Phase Factory layer for owner review.`,
      ownerReviewRequired: true,
      safetyBoundaries: [
        "project repo source mutation blocked",
        "real branch creation blocked",
        "real project merge execution blocked",
        "git push and tag creation blocked",
        "self-approval blocked",
      ],
      evidenceExpectations: [
        "owner-reviewable packet",
        "validation result record",
        "safety gate summary",
      ],
      validationExpectations: [
        "knowledge source map passes",
        "phase demo passes",
        "full test suite passes",
        "certify passes",
        "verify passes",
      ],
      rollbackPlan: "Remove generated runtime artifacts and revert uncommitted changes before retry.",
      outputMode: stage.outputMode,
      unlocksExecution: false,
    })),
    roadmapTracks: clone(roadmapTracks),
    requirements: clone(phaseBacklogRequirements),
    fields: clone(phaseBacklogFields),
    declaredPaths: clone(declaredPaths),
    multiLanguageProductionTargets: clone(multiLanguageProductionTargets),
    approvalRecord: {
      owner: "Tyler Wallace",
      operatorAuthorityOwner: "Driana Smith-Wallace",
      approved: true,
      selfApproved: false,
    },
    boundaries: {
      phaseBacklogGenerationAllowed: true,
      ownerReviewBacklogPacketAllowed: true,
      phaseSpecGenerationAllowed: false,
      overlayZipBuildAllowed: false,
      patchExecutionAllowed: false,
      projectRepoSourceMutationAllowed: false,
      realProjectBranchCreationAllowed: false,
      realProjectMergeExecutionAllowed: false,
      gitPushAllowed: false,
      tagCreationAllowed: false,
      arbitraryCommandAllowed: false,
      shellExecutionAllowed: false,
      schedulerMutationAllowed: false,
      workflowMutationAllowed: false,
      iPhoneAutomationMutationAllowed: false,
      fleetExecutionAllowed: false,
      awayModeExecutionAllowed: false,
      selfApprovalAllowed: false,
      selfMergeAllowed: false,
      selfDeployAllowed: false,
      productionDeploymentAllowed: false,
    },
  };
  return { ...defaults, ...overrides };
}

export function inspectPhaseBacklogGeneratorV1(config) {
  const blockers = [];
  if (config.owner !== "Tyler Wallace") blockers.push("Owner must be Tyler Wallace for Phase 100A phase backlog generator.");
  if (config.operatorAuthorityOwner !== "Driana Smith-Wallace") blockers.push("Operator authority owner must remain Driana Smith-Wallace.");
  if (!config.phase100ApprovedBranchDeveloperAlphaReady) blockers.push("Phase 100 approved branch developer Alpha must be ready before Phase 100A.");
  if (!config.approvalRecord?.approved) blockers.push("Owner approval must be granted before Phase 100A backlog generation.");
  if (config.approvalRecord?.selfApproved) blockers.push("Self-approval is blocked for Phase 100A backlog generation.");

  const expectedStageIds = ["100A", "100B", "100C", "100D", "100E", "100F", "100G", "100H"];
  const stageIds = (config.phaseFactoryStages || []).map((stage) => stage.phaseId);
  for (const id of expectedStageIds) {
    if (!stageIds.includes(id)) blockers.push(`Phase Factory stage is missing: ${id}`);
  }

  for (const item of config.phaseBacklogItems || []) {
    const label = item.phaseId || "missing-phase-id";
    if (!isSafePhaseId(item.phaseId)) blockers.push(`Phase backlog item phaseId must be exact and 100A-100H scoped: ${label}`);
    if (!Number.isInteger(item.sequence) || item.sequence < 1 || item.sequence > 8) blockers.push(`Phase backlog item sequence must be 1 through 8: ${label}`);
    if (!isNonEmptyString(item.title)) blockers.push(`Phase backlog item title is required: ${label}`);
    if (!roadmapTracks.includes(item.roadmapTrack)) blockers.push(`Phase backlog item must use an approved roadmap track: ${label}`);
    if (!isNonEmptyString(item.purpose)) blockers.push(`Phase backlog item purpose is required: ${label}`);
    if (item.ownerReviewRequired !== true) blockers.push(`Phase backlog item ownerReviewRequired must be true: ${label}`);
    if (!Array.isArray(item.safetyBoundaries) || item.safetyBoundaries.length < 5) blockers.push(`Phase backlog item must include at least 5 safety boundaries: ${label}`);
    if (!Array.isArray(item.evidenceExpectations) || item.evidenceExpectations.length < 3) blockers.push(`Phase backlog item must include at least 3 evidence expectations: ${label}`);
    if (!Array.isArray(item.validationExpectations) || item.validationExpectations.length < 5) blockers.push(`Phase backlog item must include at least 5 validation expectations: ${label}`);
    if (!isNonEmptyString(item.rollbackPlan)) blockers.push(`Phase backlog item rollbackPlan is required: ${label}`);
    if (!isNonEmptyString(item.outputMode)) blockers.push(`Phase backlog item outputMode is required: ${label}`);
    if (item.unlocksExecution !== false) blockers.push(`Phase backlog item unlocksExecution must remain false: ${label}`);
  }

  const requiredBoundaryFalse = [
    "phaseSpecGenerationAllowed",
    "overlayZipBuildAllowed",
    "patchExecutionAllowed",
    "projectRepoSourceMutationAllowed",
    "realProjectBranchCreationAllowed",
    "realProjectMergeExecutionAllowed",
    "gitPushAllowed",
    "tagCreationAllowed",
    "arbitraryCommandAllowed",
    "shellExecutionAllowed",
    "schedulerMutationAllowed",
    "workflowMutationAllowed",
    "iPhoneAutomationMutationAllowed",
    "fleetExecutionAllowed",
    "awayModeExecutionAllowed",
    "selfApprovalAllowed",
    "selfMergeAllowed",
    "selfDeployAllowed",
    "productionDeploymentAllowed",
  ];
  for (const key of requiredBoundaryFalse) {
    if (config.boundaries?.[key] !== false) blockers.push(`${key} must remain false`);
  }
  if (config.boundaries?.phaseBacklogGenerationAllowed !== true) blockers.push("phaseBacklogGenerationAllowed must remain true");
  if (config.boundaries?.ownerReviewBacklogPacketAllowed !== true) blockers.push("ownerReviewBacklogPacketAllowed must remain true");

  if ((config.requirements || []).length !== 24) blockers.push("Phase backlog generator must declare 24 requirements.");
  if ((config.fields || []).length !== 38) blockers.push("Phase backlog generator must declare 38 fields.");
  if ((config.declaredPaths || []).length !== 5) blockers.push("Phase backlog generator must declare 5 source paths.");
  if ((config.phaseFactoryStages || []).length !== 8) blockers.push("Phase Factory stage count must be 8.");
  if ((config.phaseBacklogItems || []).length !== 8) blockers.push("Phase backlog item count must be 8.");
  if ((config.roadmapTracks || []).length !== 13) blockers.push("Roadmap track count must be 13.");
  if ((config.multiLanguageProductionTargets || []).length !== 18) blockers.push("Multi-language production doctrine must include 18 useful language targets.");
  for (const language of multiLanguageProductionTargets) {
    if (!(config.multiLanguageProductionTargets || []).includes(language)) blockers.push(`Multi-language production target is missing: ${language}`);
  }

  return {
    ok: blockers.length === 0,
    blockers,
    declaredFileCount: (config.declaredPaths || []).length,
    phaseBacklogRequirementCount: (config.requirements || []).length,
    phaseBacklogFieldCount: (config.fields || []).length,
    phaseFactoryStageCount: (config.phaseFactoryStages || []).length,
    phaseBacklogItemCount: (config.phaseBacklogItems || []).length,
    roadmapTrackCount: (config.roadmapTracks || []).length,
    multiLanguageProductionTargetCount: (config.multiLanguageProductionTargets || []).length,
    safetyGateCount: 1380,
  };
}

export function runPhaseBacklogGeneratorV1(config = createDefaultPhaseBacklogGeneratorV1(), options = {}) {
  const artifactRoot = options.artifactRoot || path.join(process.cwd(), ".sera-phase-backlog-generator");
  const runRoot = path.join(artifactRoot, "phase-backlogs", config.phaseBacklogId || "phase100a-demo-phase-backlog");
  fs.mkdirSync(runRoot, { recursive: true });
  const inspection = inspectPhaseBacklogGeneratorV1(config);

  const checks = [];
  checks.push({ id: "inspect-phase-backlog-config", passed: inspection.ok, blockerCount: inspection.blockers.length });
  checks.push({ id: "expected-backlog-count", passed: (config.phaseBacklogItems || []).length === config.expectedPhaseBacklogItemCount, expected: config.expectedPhaseBacklogItemCount, actual: (config.phaseBacklogItems || []).length });
  checks.push({ id: "phase-spec-generation-blocked", passed: config.boundaries?.phaseSpecGenerationAllowed === false });
  checks.push({ id: "overlay-build-blocked", passed: config.boundaries?.overlayZipBuildAllowed === false });
  checks.push({ id: "project-source-mutation-blocked", passed: config.boundaries?.projectRepoSourceMutationAllowed === false });
  checks.push({ id: "self-governance-blocked", passed: config.boundaries?.selfApprovalAllowed === false && config.boundaries?.selfMergeAllowed === false && config.boundaries?.selfDeployAllowed === false });

  const validationFailedCount = checks.filter((check) => !check.passed).length;
  const backlogPacketProduced = inspection.ok && validationFailedCount === 0;
  const status = backlogPacketProduced ? "phase-backlog-generator-ready" : "phase-backlog-generator-validation-failed";

  const packetPath = path.join(runRoot, "phase-backlog.json");
  const manifestPath = path.join(runRoot, "phase-backlog-manifest.json");
  const packet = {
    phaseBacklogId: config.phaseBacklogId,
    status,
    sourcePhase: config.sourcePhase,
    owner: config.owner,
    operatorAuthorityOwner: config.operatorAuthorityOwner,
    phaseFactoryStages: clone(config.phaseFactoryStages),
    phaseBacklogItems: clone(config.phaseBacklogItems),
    roadmapTracks: clone(config.roadmapTracks),
    multiLanguageProductionTargets: clone(config.multiLanguageProductionTargets),
    checks,
    blockers: inspection.blockers,
    boundaries: clone(config.boundaries),
    approvalRecord: clone(config.approvalRecord),
    generatedAt: new Date().toISOString(),
  };
  writeJson(packetPath, packet);
  writeJson(manifestPath, {
    phaseBacklogId: config.phaseBacklogId,
    status,
    packetPath,
    validationFailedCount,
    phaseBacklogItemCount: inspection.phaseBacklogItemCount,
    safetyGateCount: inspection.safetyGateCount,
    projectRepoSourceMutated: false,
    realProjectBranchCreated: false,
    realProjectMergePerformed: false,
  });

  return {
    ...inspection,
    ok: backlogPacketProduced,
    phaseBacklogGeneratorStatus: status,
    validationFailedCount,
    phaseBacklogId: config.phaseBacklogId,
    phaseBacklogGenerationAllowed: config.boundaries.phaseBacklogGenerationAllowed,
    ownerReviewBacklogPacketAllowed: config.boundaries.ownerReviewBacklogPacketAllowed,
    phaseSpecGenerationAllowed: config.boundaries.phaseSpecGenerationAllowed,
    overlayZipBuildAllowed: config.boundaries.overlayZipBuildAllowed,
    patchExecutionAllowed: config.boundaries.patchExecutionAllowed,
    projectRepoSourceMutationAllowed: config.boundaries.projectRepoSourceMutationAllowed,
    realProjectBranchCreationAllowed: config.boundaries.realProjectBranchCreationAllowed,
    realProjectMergeExecutionAllowed: config.boundaries.realProjectMergeExecutionAllowed,
    gitPushAllowed: config.boundaries.gitPushAllowed,
    tagCreationAllowed: config.boundaries.tagCreationAllowed,
    arbitraryCommandAllowed: config.boundaries.arbitraryCommandAllowed,
    shellExecutionAllowed: config.boundaries.shellExecutionAllowed,
    selfApprovalAllowed: config.boundaries.selfApprovalAllowed,
    selfMergeAllowed: config.boundaries.selfMergeAllowed,
    selfDeployAllowed: config.boundaries.selfDeployAllowed,
    backlogPacketProduced,
    projectRepoSourceMutated: false,
    realProjectBranchCreated: false,
    realProjectMergePerformed: false,
    multiLanguageProductionDoctrineIncluded: (config.multiLanguageProductionTargets || []).length === 18,
    packetPath,
    manifestPath,
  };
}
