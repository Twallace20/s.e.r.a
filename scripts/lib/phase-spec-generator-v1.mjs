import fs from "node:fs";
import path from "node:path";

const declaredPaths = [
  "docs/phases/PHASE_100B_PHASE_SPEC_GENERATOR_V1.md",
  "scripts/lib/phase-spec-generator-v1.mjs",
  "scripts/run-phase-spec-generator-v1.mjs",
  "tests/integration/phase-spec-generator-v1.test.ts",
  "apps/operator-console/src/phase-spec-generator.ts",
];

const phaseSpecRequirements = [
  { id: "phase-100a-ready", label: "Phase 100A phase backlog generator ready", state: "required" },
  { id: "phase-backlog-linkage", label: "Phase 100A backlog packet linkage required", state: "required" },
  { id: "owner-approval-required", label: "Owner approval required", state: "required" },
  { id: "operator-authority-preserved", label: "Operator authority owner preserved", state: "required" },
  { id: "spec-generation-only", label: "Phase spec generation is planning-only", state: "required" },
  { id: "exact-phase-ids", label: "Phase IDs must be exact and Phase Factory scoped", state: "required" },
  { id: "ordered-sequence", label: "Phase specs must preserve sequence order", state: "required" },
  { id: "purpose-required", label: "Each phase spec needs a purpose", state: "required" },
  { id: "scope-required", label: "Each phase spec needs a scope", state: "required" },
  { id: "owner-review-required", label: "Each phase spec needs owner review", state: "required" },
  { id: "sections-required", label: "Each phase spec needs required sections", state: "required" },
  { id: "acceptance-criteria-required", label: "Each phase spec needs acceptance criteria", state: "required" },
  { id: "safety-boundaries-required", label: "Each phase spec needs safety boundaries", state: "required" },
  { id: "evidence-required", label: "Each phase spec needs evidence expectations", state: "required" },
  { id: "validation-required", label: "Each phase spec needs validation expectations", state: "required" },
  { id: "rollback-required", label: "Each phase spec needs a rollback plan", state: "required" },
  { id: "planned-files-required", label: "Each phase spec needs planned source paths", state: "required" },
  { id: "roadmap-track-required", label: "Each phase spec must map to a roadmap track", state: "required" },
  { id: "multi-language-doctrine-preserved", label: "Multi-language production doctrine preserved", state: "required" },
  { id: "no-overlay-build", label: "Overlay ZIP building blocked until Phase 100C", state: "required" },
  { id: "no-patch-execution", label: "Patch execution blocked", state: "required" },
  { id: "no-source-mutation", label: "Project repo source mutation blocked", state: "required" },
  { id: "no-real-branches", label: "Real project branch creation blocked", state: "required" },
  { id: "no-real-merge", label: "Real project merge execution blocked", state: "required" },
  { id: "no-git-push-tag-shell", label: "Git push, tag creation, arbitrary command, and shell execution blocked", state: "required" },
  { id: "no-self-governance", label: "Self-approval, self-merge, and self-deploy blocked", state: "required" },
];

const phaseSpecFields = [
  "phaseSpecId",
  "status",
  "owner",
  "operatorAuthorityOwner",
  "sourcePhase",
  "sourceBacklogId",
  "phase100APhaseBacklogGeneratorReady",
  "phaseFactoryStageCount",
  "phaseSpecCount",
  "roadmapTrackCount",
  "multiLanguageProductionTargetCount",
  "safetyGateCount",
  "phaseSpecGenerationAllowed",
  "phaseBacklogPacketReadAllowed",
  "ownerReviewSpecPacketAllowed",
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
  "phaseSpecs",
  "roadmapTracks",
  "multiLanguageProductionTargets",
  "requirements",
  "declaredPaths",
  "checks",
  "validationFailedCount",
  "packetPath",
  "manifestPath",
  "generatedAt",
  "specSections",
  "acceptanceCriteria",
  "rollbackPlan",
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

const requiredSpecSections = [
  "purpose",
  "scope",
  "safety-boundaries",
  "evidence-expectations",
  "validation-expectations",
  "rollback-plan",
  "owner-review",
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

function createDefaultPhaseSpec(stage, index) {
  return {
    phaseId: stage.phaseId,
    sourceBacklogPhaseId: stage.phaseId,
    sequence: index + 1,
    title: stage.title,
    roadmapTrack: "phase-factory",
    purpose: `${stage.title} converts the Phase Factory backlog into a precise owner-reviewable implementation specification.`,
    scope: [
      "define exact phase objective",
      "declare safety boundaries",
      "declare evidence output",
      "declare validation expectations",
      "preserve rollback path",
    ],
    specSections: clone(requiredSpecSections),
    acceptanceCriteria: [
      "owner-reviewable spec packet is produced",
      "phase ID remains exact and roadmap-scoped",
      "unsafe execution powers remain blocked",
      "required evidence paths are declared",
      "full validation stack expectations are declared",
    ],
    safetyBoundaries: [
      "overlay ZIP building blocked",
      "patch execution blocked",
      "project repo source mutation blocked",
      "real branch creation blocked",
      "real project merge execution blocked",
      "self-approval blocked",
    ],
    evidenceExpectations: [
      "phase specification packet",
      "spec manifest",
      "validation result record",
      "safety gate summary",
    ],
    validationExpectations: [
      "knowledge source map passes",
      "phase demo passes",
      "phase verify passes",
      "full test suite passes",
      "certify passes",
      "verify passes",
    ],
    plannedFiles: [
      "docs/phases/<phase>.md",
      "scripts/lib/<phase>.mjs",
      "scripts/run-<phase>.mjs",
      "tests/integration/<phase>.test.ts",
      "apps/operator-console/src/<phase>.ts",
    ],
    rollbackPlan: "Remove generated runtime artifacts and revert uncommitted changes before retry.",
    ownerReviewRequired: true,
    implementationAllowed: false,
    overlayBuildAllowed: false,
    unlocksExecution: false,
    outputMode: stage.outputMode,
  };
}

export function createDefaultPhaseSpecGeneratorV1(overrides = {}) {
  const defaults = {
    phaseSpecId: "phase100b-demo-phase-spec",
    owner: "Tyler Wallace",
    operatorAuthorityOwner: "Driana Smith-Wallace",
    sourcePhase: "Phase 100B — Phase Spec Generator v1",
    sourceBacklogId: "phase100a-demo-phase-backlog",
    phase100APhaseBacklogGeneratorReady: true,
    expectedPhaseSpecCount: 8,
    phaseFactoryStages: clone(phaseFactoryStages),
    phaseSpecs: clone(phaseFactoryStages).map((stage, index) => createDefaultPhaseSpec(stage, index)),
    roadmapTracks: clone(roadmapTracks),
    requirements: clone(phaseSpecRequirements),
    fields: clone(phaseSpecFields),
    declaredPaths: clone(declaredPaths),
    multiLanguageProductionTargets: clone(multiLanguageProductionTargets),
    approvalRecord: {
      owner: "Tyler Wallace",
      operatorAuthorityOwner: "Driana Smith-Wallace",
      approved: true,
      selfApproved: false,
    },
    boundaries: {
      phaseSpecGenerationAllowed: true,
      phaseBacklogPacketReadAllowed: true,
      ownerReviewSpecPacketAllowed: true,
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

export function inspectPhaseSpecGeneratorV1(config) {
  const blockers = [];
  if (config.owner !== "Tyler Wallace") blockers.push("Owner must be Tyler Wallace for Phase 100B phase spec generator.");
  if (config.operatorAuthorityOwner !== "Driana Smith-Wallace") blockers.push("Operator authority owner must remain Driana Smith-Wallace.");
  if (!config.phase100APhaseBacklogGeneratorReady) blockers.push("Phase 100A phase backlog generator must be ready before Phase 100B.");
  if (!isNonEmptyString(config.sourceBacklogId)) blockers.push("Phase 100B requires a source backlog id from Phase 100A.");
  if (!config.approvalRecord?.approved) blockers.push("Owner approval must be granted before Phase 100B spec generation.");
  if (config.approvalRecord?.selfApproved) blockers.push("Self-approval is blocked for Phase 100B spec generation.");

  const expectedStageIds = ["100A", "100B", "100C", "100D", "100E", "100F", "100G", "100H"];
  const stageIds = (config.phaseFactoryStages || []).map((stage) => stage.phaseId);
  for (const id of expectedStageIds) {
    if (!stageIds.includes(id)) blockers.push(`Phase Factory stage is missing: ${id}`);
  }

  for (const spec of config.phaseSpecs || []) {
    const label = spec.phaseId || "missing-phase-id";
    if (!isSafePhaseId(spec.phaseId)) blockers.push(`Phase spec phaseId must be exact and 100A-100H scoped: ${label}`);
    if (spec.sourceBacklogPhaseId !== spec.phaseId) blockers.push(`Phase spec must preserve source backlog phase id: ${label}`);
    if (!Number.isInteger(spec.sequence) || spec.sequence < 1 || spec.sequence > 8) blockers.push(`Phase spec sequence must be 1 through 8: ${label}`);
    if (!isNonEmptyString(spec.title)) blockers.push(`Phase spec title is required: ${label}`);
    if (!roadmapTracks.includes(spec.roadmapTrack)) blockers.push(`Phase spec must use an approved roadmap track: ${label}`);
    if (!isNonEmptyString(spec.purpose)) blockers.push(`Phase spec purpose is required: ${label}`);
    if (!Array.isArray(spec.scope) || spec.scope.length < 5) blockers.push(`Phase spec must include at least 5 scope items: ${label}`);
    for (const section of requiredSpecSections) {
      if (!(spec.specSections || []).includes(section)) blockers.push(`Phase spec is missing required section ${section}: ${label}`);
    }
    if (!Array.isArray(spec.acceptanceCriteria) || spec.acceptanceCriteria.length < 5) blockers.push(`Phase spec must include at least 5 acceptance criteria: ${label}`);
    if (!Array.isArray(spec.safetyBoundaries) || spec.safetyBoundaries.length < 6) blockers.push(`Phase spec must include at least 6 safety boundaries: ${label}`);
    if (!Array.isArray(spec.evidenceExpectations) || spec.evidenceExpectations.length < 4) blockers.push(`Phase spec must include at least 4 evidence expectations: ${label}`);
    if (!Array.isArray(spec.validationExpectations) || spec.validationExpectations.length < 6) blockers.push(`Phase spec must include at least 6 validation expectations: ${label}`);
    if (!Array.isArray(spec.plannedFiles) || spec.plannedFiles.length < 5) blockers.push(`Phase spec must include at least 5 planned files: ${label}`);
    if (!isNonEmptyString(spec.rollbackPlan)) blockers.push(`Phase spec rollbackPlan is required: ${label}`);
    if (spec.ownerReviewRequired !== true) blockers.push(`Phase spec ownerReviewRequired must be true: ${label}`);
    if (spec.implementationAllowed !== false) blockers.push(`Phase spec implementationAllowed must remain false: ${label}`);
    if (spec.overlayBuildAllowed !== false) blockers.push(`Phase spec overlayBuildAllowed must remain false: ${label}`);
    if (spec.unlocksExecution !== false) blockers.push(`Phase spec unlocksExecution must remain false: ${label}`);
  }

  const requiredBoundaryFalse = [
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
  if (config.boundaries?.phaseSpecGenerationAllowed !== true) blockers.push("phaseSpecGenerationAllowed must remain true");
  if (config.boundaries?.phaseBacklogPacketReadAllowed !== true) blockers.push("phaseBacklogPacketReadAllowed must remain true");
  if (config.boundaries?.ownerReviewSpecPacketAllowed !== true) blockers.push("ownerReviewSpecPacketAllowed must remain true");

  if ((config.requirements || []).length !== 26) blockers.push("Phase spec generator must declare 26 requirements.");
  if ((config.fields || []).length !== 42) blockers.push("Phase spec generator must declare 42 fields.");
  if ((config.declaredPaths || []).length !== 5) blockers.push("Phase spec generator must declare 5 source paths.");
  if ((config.phaseFactoryStages || []).length !== 8) blockers.push("Phase Factory stage count must be 8.");
  if ((config.phaseSpecs || []).length !== 8) blockers.push("Phase spec count must be 8.");
  if ((config.roadmapTracks || []).length !== 13) blockers.push("Roadmap track count must be 13.");
  if ((config.multiLanguageProductionTargets || []).length !== 18) blockers.push("Multi-language production doctrine must include 18 useful language targets.");
  for (const language of multiLanguageProductionTargets) {
    if (!(config.multiLanguageProductionTargets || []).includes(language)) blockers.push(`Multi-language production target is missing: ${language}`);
  }

  return {
    ok: blockers.length === 0,
    blockers,
    declaredFileCount: (config.declaredPaths || []).length,
    phaseSpecRequirementCount: (config.requirements || []).length,
    phaseSpecFieldCount: (config.fields || []).length,
    phaseFactoryStageCount: (config.phaseFactoryStages || []).length,
    phaseSpecCount: (config.phaseSpecs || []).length,
    roadmapTrackCount: (config.roadmapTracks || []).length,
    multiLanguageProductionTargetCount: (config.multiLanguageProductionTargets || []).length,
    safetyGateCount: 1440,
  };
}

export function runPhaseSpecGeneratorV1(config = createDefaultPhaseSpecGeneratorV1(), options = {}) {
  const artifactRoot = options.artifactRoot || path.join(process.cwd(), ".sera-phase-spec-generator");
  const runRoot = path.join(artifactRoot, "phase-specs", config.phaseSpecId || "phase100b-demo-phase-spec");
  fs.mkdirSync(runRoot, { recursive: true });
  const inspection = inspectPhaseSpecGeneratorV1(config);

  const checks = [];
  checks.push({ id: "inspect-phase-spec-config", passed: inspection.ok, blockerCount: inspection.blockers.length });
  checks.push({ id: "expected-spec-count", passed: (config.phaseSpecs || []).length === config.expectedPhaseSpecCount, expected: config.expectedPhaseSpecCount, actual: (config.phaseSpecs || []).length });
  checks.push({ id: "phase-backlog-linkage", passed: isNonEmptyString(config.sourceBacklogId) && config.phase100APhaseBacklogGeneratorReady === true });
  checks.push({ id: "overlay-build-blocked", passed: config.boundaries?.overlayZipBuildAllowed === false });
  checks.push({ id: "project-source-mutation-blocked", passed: config.boundaries?.projectRepoSourceMutationAllowed === false });
  checks.push({ id: "self-governance-blocked", passed: config.boundaries?.selfApprovalAllowed === false && config.boundaries?.selfMergeAllowed === false && config.boundaries?.selfDeployAllowed === false });

  const validationFailedCount = checks.filter((check) => !check.passed).length;
  const specPacketProduced = inspection.ok && validationFailedCount === 0;
  const status = specPacketProduced ? "phase-spec-generator-ready" : "phase-spec-generator-validation-failed";

  const packetPath = path.join(runRoot, "phase-spec.json");
  const manifestPath = path.join(runRoot, "phase-spec-manifest.json");
  const packet = {
    phaseSpecId: config.phaseSpecId,
    status,
    sourcePhase: config.sourcePhase,
    sourceBacklogId: config.sourceBacklogId,
    owner: config.owner,
    operatorAuthorityOwner: config.operatorAuthorityOwner,
    phaseFactoryStages: clone(config.phaseFactoryStages),
    phaseSpecs: clone(config.phaseSpecs),
    roadmapTracks: clone(config.roadmapTracks),
    requiredSpecSections: clone(requiredSpecSections),
    multiLanguageProductionTargets: clone(config.multiLanguageProductionTargets),
    checks,
    blockers: inspection.blockers,
    boundaries: clone(config.boundaries),
    approvalRecord: clone(config.approvalRecord),
    generatedAt: new Date().toISOString(),
  };
  writeJson(packetPath, packet);
  writeJson(manifestPath, {
    phaseSpecId: config.phaseSpecId,
    status,
    sourceBacklogId: config.sourceBacklogId,
    packetPath,
    validationFailedCount,
    phaseSpecCount: inspection.phaseSpecCount,
    safetyGateCount: inspection.safetyGateCount,
    projectRepoSourceMutated: false,
    realProjectBranchCreated: false,
    realProjectMergePerformed: false,
    overlayZipBuilt: false,
  });

  return {
    ...inspection,
    ok: specPacketProduced,
    phaseSpecGeneratorStatus: status,
    validationFailedCount,
    phaseSpecId: config.phaseSpecId,
    sourceBacklogId: config.sourceBacklogId,
    phaseSpecGenerationAllowed: config.boundaries.phaseSpecGenerationAllowed,
    phaseBacklogPacketReadAllowed: config.boundaries.phaseBacklogPacketReadAllowed,
    ownerReviewSpecPacketAllowed: config.boundaries.ownerReviewSpecPacketAllowed,
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
    specPacketProduced,
    projectRepoSourceMutated: false,
    realProjectBranchCreated: false,
    realProjectMergePerformed: false,
    overlayZipBuilt: false,
    multiLanguageProductionDoctrineIncluded: (config.multiLanguageProductionTargets || []).length === 18,
    packetPath,
    manifestPath,
  };
}
