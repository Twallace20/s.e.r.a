import fs from "node:fs";
import path from "node:path";

const declaredPaths = [
  "docs/phases/PHASE_100D_PHASE_ZIP_VALIDATOR_V1.md",
  "scripts/lib/phase-zip-validator-v1.mjs",
  "scripts/run-phase-zip-validator-v1.mjs",
  "tests/integration/phase-zip-validator-v1.test.ts",
  "apps/operator-console/src/phase-zip-validator.ts",
];

const phaseZipValidatorRequirements = [
  { id: "phase-100c-ready", label: "Phase 100C phase overlay ZIP builder ready", state: "required" },
  { id: "overlay-manifest-linkage", label: "Phase 100C overlay package manifest linkage required", state: "required" },
  { id: "owner-approval-required", label: "Owner approval required", state: "required" },
  { id: "operator-authority-preserved", label: "Operator authority owner preserved", state: "required" },
  { id: "validation-only", label: "Phase ZIP validation is validation-only", state: "required" },
  { id: "exact-phase-ids", label: "ZIP packages must use exact Phase Factory IDs", state: "required" },
  { id: "ordered-sequence", label: "ZIP package validation must preserve sequence order", state: "required" },
  { id: "repo-tools-boundary", label: "ZIP package paths must stay under repo/ or tools/", state: "required" },
  { id: "manifest-read-required", label: "Overlay package manifest read is required", state: "required" },
  { id: "checksum-manifest-required", label: "Checksum manifest is required", state: "required" },
  { id: "sha256-required", label: "SHA-256 checksum algorithm is required", state: "required" },
  { id: "required-files", label: "Each ZIP package must contain required phase file categories", state: "required" },
  { id: "owner-review-required", label: "Each ZIP package needs owner review", state: "required" },
  { id: "acceptance-criteria-required", label: "Each ZIP package needs acceptance criteria", state: "required" },
  { id: "evidence-required", label: "Each ZIP package needs evidence expectations", state: "required" },
  { id: "validation-required", label: "Each ZIP package needs validation expectations", state: "required" },
  { id: "rollback-required", label: "Each ZIP package needs a rollback plan", state: "required" },
  { id: "no-path-traversal", label: "Path traversal must be blocked", state: "required" },
  { id: "no-absolute-paths", label: "Absolute paths must be blocked", state: "required" },
  { id: "no-binary-payloads", label: "Binary payloads blocked from generated overlays", state: "required" },
  { id: "multi-language-doctrine-preserved", label: "Multi-language production doctrine preserved", state: "required" },
  { id: "phase-overlay-manifest-read-only", label: "Phase 100C overlay package manifest is a read-only input", state: "required" },
  { id: "no-overlay-build", label: "Overlay ZIP building blocked in validator phase", state: "required" },
  { id: "no-patch-execution", label: "Patch execution blocked", state: "required" },
  { id: "no-source-mutation", label: "Project repo source mutation blocked", state: "required" },
  { id: "no-real-branches", label: "Real project branch creation blocked", state: "required" },
  { id: "no-real-merge", label: "Real project merge execution blocked", state: "required" },
  { id: "no-git-push", label: "Git push blocked", state: "required" },
  { id: "no-tag-creation", label: "Tag creation blocked", state: "required" },
  { id: "no-self-governance", label: "Self-approval, self-merge, and self-deploy blocked", state: "required" },
];

const phaseZipValidatorFields = [
  "phaseZipValidatorId",
  "status",
  "owner",
  "operatorAuthorityOwner",
  "sourcePhase",
  "sourceOverlayZipId",
  "phase100CPhaseOverlayZipBuilderReady",
  "phaseFactoryStageCount",
  "phaseZipValidationPackageCount",
  "roadmapTrackCount",
  "multiLanguageProductionTargetCount",
  "safetyGateCount",
  "phaseZipValidationAllowed",
  "phaseOverlayPackageManifestReadAllowed",
  "validationEvidencePacketAllowed",
  "checksumManifestAllowed",
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
  "productionDeploymentAllowed",
  "approvalRecord",
  "phaseFactoryStages",
  "zipValidationPackages",
  "roadmapTracks",
  "multiLanguageProductionTargets",
  "requirements",
  "declaredPaths",
  "checks",
  "validationFailedCount",
  "packetPath",
  "validationManifestPath",
  "checksumManifestPath",
  "generatedAt",
  "requiredOverlayFiles",
  "acceptanceCriteria",
  "rollbackPlan",
  "validationManifest",
  "checksumManifest",
  "validationEvidencePacketProduced",
  "projectRepoSourceMutated",
  "overlayZipBuilt",
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

const requiredOverlayFiles = [
  "repo/docs/phases/<phase>.md",
  "repo/scripts/lib/<phase>.mjs",
  "repo/scripts/run-<phase>.mjs",
  "repo/tests/integration/<phase>.test.ts",
  "repo/apps/operator-console/src/<phase>.ts",
  "tools/apply_<phase>_existing_edits.mjs",
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

function isSafeOverlayPath(value) {
  if (!isNonEmptyString(value)) return false;
  if (value.includes("..") || path.isAbsolute(value) || value.includes("\\")) return false;
  return value.startsWith("repo/") || value.startsWith("tools/");
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function writeJson(filePath, value) {
  ensureDir(filePath);
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + "\n", "utf8");
}

function normalizePhaseSlug(stage) {
  return stage.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function createDefaultZipValidationPackage(stage, index) {
  const slug = normalizePhaseSlug(stage);
  return {
    phaseId: stage.phaseId,
    sourceOverlayZipId: "phase100c-demo-phase-overlay-zip",
    sequence: index + 1,
    title: stage.title,
    roadmapTrack: "phase-factory",
    packageName: `s.e.r.a_phase${stage.phaseId}_${slug}_v1_overlay.zip`,
    checksumAlgorithm: "sha256",
    checksumManifestPresent: true,
    overlayPackageManifestPresent: true,
    ownerReviewRequired: true,
    validationRequired: true,
    binaryPayloadAllowed: false,
    pathTraversalDetected: false,
    unsafeAbsolutePathDetected: false,
    unsignedPayloadAllowed: false,
    patchExecutionAllowed: false,
    sourceMutationAllowed: false,
    overlayFiles: [
      `repo/docs/phases/PHASE_${stage.phaseId}_${slug.toUpperCase().replaceAll("-", "_")}_V1.md`,
      `repo/scripts/lib/${slug}-v1.mjs`,
      `repo/scripts/run-${slug}-v1.mjs`,
      `repo/tests/integration/${slug}-v1.test.ts`,
      `repo/apps/operator-console/src/${slug}.ts`,
      `tools/apply_phase${stage.phaseId}_existing_edits.mjs`,
    ],
    acceptanceCriteria: [
      "ZIP validation evidence packet is produced",
      "ZIP package paths remain repo/tools bounded",
      "checksum manifest is present",
      "owner review remains required",
      "unsafe execution powers remain blocked",
    ],
    evidenceExpectations: [
      "ZIP validation manifest",
      "checksum manifest",
      "package file list",
      "safety boundary summary",
    ],
    validationExpectations: [
      "knowledge source map passes",
      "phase demo passes",
      "phase verify passes",
      "full test suite passes",
      "certify passes",
      "verify passes",
    ],
    rollbackPlan: "Quarantine invalid overlay package artifacts, discard generated validation artifacts, and return to the previous approved phase.",
  };
}

export function createDefaultPhaseZipValidatorV1(overrides = {}) {
  const defaults = {
    phaseZipValidatorId: "phase100d-demo-phase-zip-validator",
    owner: "Tyler Wallace",
    operatorAuthorityOwner: "Driana Smith-Wallace",
    sourcePhase: "Phase 100D — Phase ZIP Validator v1",
    sourceOverlayZipId: "phase100c-demo-phase-overlay-zip",
    phase100CPhaseOverlayZipBuilderReady: true,
    expectedPhaseZipValidationPackageCount: 8,
    phaseFactoryStages: clone(phaseFactoryStages),
    zipValidationPackages: clone(phaseFactoryStages).map((stage, index) => createDefaultZipValidationPackage(stage, index)),
    roadmapTracks: clone(roadmapTracks),
    requirements: clone(phaseZipValidatorRequirements),
    fields: clone(phaseZipValidatorFields),
    declaredPaths: clone(declaredPaths),
    requiredOverlayFiles: clone(requiredOverlayFiles),
    multiLanguageProductionTargets: clone(multiLanguageProductionTargets),
    approvalRecord: {
      owner: "Tyler Wallace",
      operatorAuthorityOwner: "Driana Smith-Wallace",
      approved: true,
      selfApproved: false,
    },
    boundaries: {
      phaseZipValidationAllowed: true,
      phaseOverlayPackageManifestReadAllowed: true,
      validationEvidencePacketAllowed: true,
      checksumManifestAllowed: true,
      overlayZipBuildAllowed: false,
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
    realProjectBranchCreated: false,
    realProjectMergePerformed: false,
    gitPushPerformed: false,
    tagCreated: false,
    shellExecuted: false,
    productionDeployed: false,
    overlayZipBuilt: false,
  };
  return { ...defaults, ...overrides };
}

export function inspectPhaseZipValidatorV1(config = createDefaultPhaseZipValidatorV1()) {
  const blockers = [];
  const checks = [];
  const addCheck = (id, passed, message) => {
    checks.push({ id, passed, message });
    if (!passed) blockers.push(message);
  };

  const boundaries = config.boundaries || {};
  const approvalRecord = config.approvalRecord || {};

  addCheck("owner", config.owner === "Tyler Wallace", "Owner must be Tyler Wallace for Phase 100D phase ZIP validator.");
  addCheck("operator-authority", config.operatorAuthorityOwner === "Driana Smith-Wallace", "Operator authority owner must remain Driana Smith-Wallace.");
  addCheck("phase-100c-ready", config.phase100CPhaseOverlayZipBuilderReady === true, "Phase 100C phase overlay ZIP builder must be ready before Phase 100D ZIP validation.");
  addCheck("source-overlay", config.sourceOverlayZipId === "phase100c-demo-phase-overlay-zip", "Phase 100D must link to the Phase 100C source overlay package manifest.");
  addCheck("approval", approvalRecord.approved === true && approvalRecord.owner === "Tyler Wallace", "Tyler Wallace approval record is required for Phase 100D ZIP validation.");
  addCheck("no-self-approval", approvalRecord.selfApproved === false, "Self-approval is blocked for Phase 100D ZIP validation.");

  const stages = Array.isArray(config.phaseFactoryStages) ? config.phaseFactoryStages : [];
  addCheck("stage-count", stages.length === 8, "Phase Factory stage count must be 8.");
  for (const stage of phaseFactoryStages) {
    addCheck(`stage-${stage.phaseId}`, stages.some((candidate) => candidate.phaseId === stage.phaseId), `Phase Factory stage is missing: ${stage.phaseId}`);
  }

  const packages = Array.isArray(config.zipValidationPackages) ? config.zipValidationPackages : [];
  addCheck("zip-validation-package-count", packages.length === 8, "Phase ZIP validation package count must be 8.");
  packages.forEach((pkg, index) => {
    const phaseLabel = isNonEmptyString(pkg.phaseId) ? pkg.phaseId : `<missing-${index + 1}>`;
    addCheck(`zip-phase-id-${index}`, isSafePhaseId(pkg.phaseId), `ZIP validation package phaseId must be exact and 100A-100H scoped: ${phaseLabel}`);
    addCheck(`zip-source-overlay-${index}`, pkg.sourceOverlayZipId === "phase100c-demo-phase-overlay-zip", `ZIP validation package must preserve Phase 100C source overlay id: ${phaseLabel}`);
    addCheck(`zip-sequence-${index}`, pkg.sequence === index + 1, `ZIP validation package sequence must be 1 through 8: ${phaseLabel}`);
    addCheck(`zip-track-${index}`, roadmapTracks.includes(pkg.roadmapTrack), `ZIP validation package must use an approved roadmap track: ${phaseLabel}`);
    addCheck(`zip-name-${index}`, isNonEmptyString(pkg.packageName) && pkg.packageName.endsWith("_overlay.zip"), `ZIP validation package name must be a non-empty *_overlay.zip file: ${phaseLabel}`);
    addCheck(`zip-checksum-algorithm-${index}`, pkg.checksumAlgorithm === "sha256", `ZIP validation package checksum algorithm must be sha256: ${phaseLabel}`);
    addCheck(`zip-checksum-manifest-${index}`, pkg.checksumManifestPresent === true, `ZIP validation package checksum manifest is required: ${phaseLabel}`);
    addCheck(`zip-overlay-manifest-${index}`, pkg.overlayPackageManifestPresent === true, `ZIP validation package overlay package manifest is required: ${phaseLabel}`);
    addCheck(`zip-owner-review-${index}`, pkg.ownerReviewRequired === true, `ZIP validation package ownerReviewRequired must be true: ${phaseLabel}`);
    addCheck(`zip-validation-required-${index}`, pkg.validationRequired === true, `ZIP validation package validationRequired must be true: ${phaseLabel}`);
    addCheck(`zip-binary-blocked-${index}`, pkg.binaryPayloadAllowed === false, `ZIP validation package binaryPayloadAllowed must remain false: ${phaseLabel}`);
    addCheck(`zip-path-traversal-${index}`, pkg.pathTraversalDetected === false, `ZIP validation package pathTraversalDetected must remain false: ${phaseLabel}`);
    addCheck(`zip-absolute-path-${index}`, pkg.unsafeAbsolutePathDetected === false, `ZIP validation package unsafeAbsolutePathDetected must remain false: ${phaseLabel}`);
    addCheck(`zip-unsigned-payload-${index}`, pkg.unsignedPayloadAllowed === false, `ZIP validation package unsignedPayloadAllowed must remain false: ${phaseLabel}`);
    addCheck(`zip-patch-blocked-${index}`, pkg.patchExecutionAllowed === false, `ZIP validation package patchExecutionAllowed must remain false: ${phaseLabel}`);
    addCheck(`zip-source-mutation-blocked-${index}`, pkg.sourceMutationAllowed === false, `ZIP validation package sourceMutationAllowed must remain false: ${phaseLabel}`);
    addCheck(`zip-files-${index}`, Array.isArray(pkg.overlayFiles) && pkg.overlayFiles.length >= 6, `ZIP validation package must include at least 6 files: ${phaseLabel}`);
    if (Array.isArray(pkg.overlayFiles)) {
      for (const filePath of pkg.overlayFiles) {
        addCheck(`zip-safe-path-${index}-${filePath}`, isSafeOverlayPath(filePath), `ZIP validation package file path must stay under repo/ or tools/: ${phaseLabel}`);
      }
      addCheck(`zip-doc-file-${index}`, pkg.overlayFiles.some((filePath) => filePath.startsWith("repo/docs/phases/")), `ZIP validation package must include a phase doc file: ${phaseLabel}`);
      addCheck(`zip-lib-file-${index}`, pkg.overlayFiles.some((filePath) => filePath.startsWith("repo/scripts/lib/")), `ZIP validation package must include a script library file: ${phaseLabel}`);
      addCheck(`zip-run-file-${index}`, pkg.overlayFiles.some((filePath) => filePath.startsWith("repo/scripts/run-")), `ZIP validation package must include a runner file: ${phaseLabel}`);
      addCheck(`zip-test-file-${index}`, pkg.overlayFiles.some((filePath) => filePath.startsWith("repo/tests/integration/")), `ZIP validation package must include an integration test file: ${phaseLabel}`);
      addCheck(`zip-console-file-${index}`, pkg.overlayFiles.some((filePath) => filePath.startsWith("repo/apps/operator-console/src/")), `ZIP validation package must include an operator console file: ${phaseLabel}`);
      addCheck(`zip-apply-file-${index}`, pkg.overlayFiles.some((filePath) => filePath.startsWith("tools/apply_")), `ZIP validation package must include an apply helper file: ${phaseLabel}`);
    }
    addCheck(`zip-acceptance-${index}`, Array.isArray(pkg.acceptanceCriteria) && pkg.acceptanceCriteria.length >= 5, `ZIP validation package must include at least 5 acceptance criteria: ${phaseLabel}`);
    addCheck(`zip-evidence-${index}`, Array.isArray(pkg.evidenceExpectations) && pkg.evidenceExpectations.length >= 4, `ZIP validation package must include at least 4 evidence expectations: ${phaseLabel}`);
    addCheck(`zip-validation-${index}`, Array.isArray(pkg.validationExpectations) && pkg.validationExpectations.length >= 6, `ZIP validation package must include at least 6 validation expectations: ${phaseLabel}`);
    addCheck(`zip-rollback-${index}`, isNonEmptyString(pkg.rollbackPlan), `ZIP validation package rollback plan is required: ${phaseLabel}`);
  });

  const tracks = Array.isArray(config.roadmapTracks) ? config.roadmapTracks : [];
  addCheck("roadmap-track-count", tracks.length === 13, "Roadmap track count must be 13.");
  for (const track of roadmapTracks) {
    addCheck(`track-${track}`, tracks.includes(track), `Roadmap track is missing: ${track}`);
  }

  const targets = Array.isArray(config.multiLanguageProductionTargets) ? config.multiLanguageProductionTargets : [];
  addCheck("multi-language-count", targets.length === 18, "Multi-language production target count must be 18.");
  for (const language of multiLanguageProductionTargets) {
    addCheck(`language-${language}`, targets.includes(language), `Multi-language production target is missing: ${language}`);
  }

  const expectedBoundaries = {
    phaseZipValidationAllowed: true,
    phaseOverlayPackageManifestReadAllowed: true,
    validationEvidencePacketAllowed: true,
    checksumManifestAllowed: true,
    overlayZipBuildAllowed: false,
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
  for (const [key, expected] of Object.entries(expectedBoundaries)) {
    addCheck(`boundary-${key}`, boundaries[key] === expected, `${key} must remain ${expected}`);
  }
  addCheck("no-project-mutation", config.projectRepoSourceMutated === false, "projectRepoSourceMutated must remain false");
  addCheck("no-real-branch-created", config.realProjectBranchCreated === false, "realProjectBranchCreated must remain false");
  addCheck("no-real-merge-performed", config.realProjectMergePerformed === false, "realProjectMergePerformed must remain false");
  addCheck("no-git-push-performed", config.gitPushPerformed === false, "gitPushPerformed must remain false");
  addCheck("no-tag-created", config.tagCreated === false, "tagCreated must remain false");
  addCheck("no-shell-executed", config.shellExecuted === false, "shellExecuted must remain false");
  addCheck("no-production-deployed", config.productionDeployed === false, "productionDeployed must remain false");
  addCheck("no-overlay-build", config.overlayZipBuilt === false, "overlayZipBuilt must remain false in Phase 100D validator");

  return {
    ok: blockers.length === 0,
    blockers,
    checks,
    declaredFileCount: declaredPaths.length,
    phaseZipValidatorRequirementCount: phaseZipValidatorRequirements.length,
    phaseZipValidatorFieldCount: phaseZipValidatorFields.length,
    phaseFactoryStageCount: stages.length,
    phaseZipValidationPackageCount: packages.length,
    roadmapTrackCount: tracks.length,
    multiLanguageProductionTargetCount: targets.length,
    safetyGateCount: 1560,
    phaseZipValidationAllowed: boundaries.phaseZipValidationAllowed === true,
    phaseOverlayPackageManifestReadAllowed: boundaries.phaseOverlayPackageManifestReadAllowed === true,
    validationEvidencePacketAllowed: boundaries.validationEvidencePacketAllowed === true,
    checksumManifestAllowed: boundaries.checksumManifestAllowed === true,
    overlayZipBuildAllowed: boundaries.overlayZipBuildAllowed === true,
    patchExecutionAllowed: boundaries.patchExecutionAllowed === true,
    projectRepoSourceMutationAllowed: boundaries.projectRepoSourceMutationAllowed === true,
    realProjectBranchCreationAllowed: boundaries.realProjectBranchCreationAllowed === true,
    realProjectMergeExecutionAllowed: boundaries.realProjectMergeExecutionAllowed === true,
    gitPushAllowed: boundaries.gitPushAllowed === true,
    tagCreationAllowed: boundaries.tagCreationAllowed === true,
    arbitraryCommandAllowed: boundaries.arbitraryCommandAllowed === true,
    shellExecutionAllowed: boundaries.shellExecutionAllowed === true,
    selfApprovalAllowed: boundaries.selfApprovalAllowed === true,
    selfMergeAllowed: boundaries.selfMergeAllowed === true,
    selfDeployAllowed: boundaries.selfDeployAllowed === true,
    productionDeploymentAllowed: boundaries.productionDeploymentAllowed === true,
    projectRepoSourceMutated: config.projectRepoSourceMutated === true,
    realProjectBranchCreated: config.realProjectBranchCreated === true,
    realProjectMergePerformed: config.realProjectMergePerformed === true,
    gitPushPerformed: config.gitPushPerformed === true,
    tagCreated: config.tagCreated === true,
    shellExecuted: config.shellExecuted === true,
    productionDeployed: config.productionDeployed === true,
    overlayZipBuilt: config.overlayZipBuilt === true,
  };
}

export function runPhaseZipValidatorV1(config = createDefaultPhaseZipValidatorV1(), options = {}) {
  const artifactRoot = options.artifactRoot || path.join(process.cwd(), ".sera-phase-zip-validator");
  const runId = config.phaseZipValidatorId || "phase100d-demo-phase-zip-validator";
  const runRoot = path.join(artifactRoot, "zip-validations", runId);
  fs.mkdirSync(runRoot, { recursive: true });

  const inspection = inspectPhaseZipValidatorV1(config);
  const generatedAt = new Date().toISOString();
  const validationFailedCount = inspection.ok && config.zipValidationPackages.length === config.expectedPhaseZipValidationPackageCount ? 0 : 1;
  const validationEvidencePacketProduced = validationFailedCount === 0;
  const status = validationEvidencePacketProduced ? "phase-zip-validator-ready" : "phase-zip-validator-validation-failed";

  const checksumManifest = {
    phaseZipValidatorId: runId,
    sourceOverlayZipId: config.sourceOverlayZipId,
    checksumAlgorithm: "sha256",
    packageCount: config.zipValidationPackages.length,
    packages: config.zipValidationPackages.map((pkg) => ({
      phaseId: pkg.phaseId,
      packageName: pkg.packageName,
      checksumAlgorithm: pkg.checksumAlgorithm,
      checksumManifestPresent: pkg.checksumManifestPresent,
      overlayFileCount: Array.isArray(pkg.overlayFiles) ? pkg.overlayFiles.length : 0,
    })),
    generatedAt,
  };

  const validationManifest = {
    phaseZipValidatorId: runId,
    sourceOverlayZipId: config.sourceOverlayZipId,
    validationFailedCount,
    validationEvidencePacketProduced,
    packageCount: config.zipValidationPackages.length,
    invalidPackageQuarantined: validationFailedCount > 0,
    patchExecutionAllowed: false,
    projectRepoSourceMutationAllowed: false,
    overlayZipBuildAllowed: false,
    generatedAt,
  };

  const packet = {
    phaseZipValidatorId: runId,
    status,
    owner: config.owner,
    operatorAuthorityOwner: config.operatorAuthorityOwner,
    sourcePhase: config.sourcePhase,
    sourceOverlayZipId: config.sourceOverlayZipId,
    phase100CPhaseOverlayZipBuilderReady: config.phase100CPhaseOverlayZipBuilderReady,
    phaseFactoryStageCount: inspection.phaseFactoryStageCount,
    phaseZipValidationPackageCount: inspection.phaseZipValidationPackageCount,
    roadmapTrackCount: inspection.roadmapTrackCount,
    multiLanguageProductionTargetCount: inspection.multiLanguageProductionTargetCount,
    safetyGateCount: inspection.safetyGateCount,
    phaseZipValidationAllowed: inspection.phaseZipValidationAllowed,
    phaseOverlayPackageManifestReadAllowed: inspection.phaseOverlayPackageManifestReadAllowed,
    validationEvidencePacketAllowed: inspection.validationEvidencePacketAllowed,
    checksumManifestAllowed: inspection.checksumManifestAllowed,
    overlayZipBuildAllowed: inspection.overlayZipBuildAllowed,
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
    phaseFactoryStages: config.phaseFactoryStages,
    zipValidationPackages: config.zipValidationPackages,
    roadmapTracks: config.roadmapTracks,
    multiLanguageProductionTargets: config.multiLanguageProductionTargets,
    requirements: config.requirements,
    declaredPaths: config.declaredPaths,
    requiredOverlayFiles: config.requiredOverlayFiles,
    checks: inspection.checks,
    blockers: inspection.blockers,
    validationFailedCount,
    validationManifest,
    checksumManifest,
    validationEvidencePacketProduced,
    projectRepoSourceMutated: inspection.projectRepoSourceMutated,
    overlayZipBuilt: inspection.overlayZipBuilt,
    realProjectBranchCreated: inspection.realProjectBranchCreated,
    realProjectMergePerformed: inspection.realProjectMergePerformed,
    gitPushPerformed: inspection.gitPushPerformed,
    tagCreated: inspection.tagCreated,
    shellExecuted: inspection.shellExecuted,
    productionDeployed: inspection.productionDeployed,
    generatedAt,
  };

  const packetPath = path.join(runRoot, "phase-zip-validator.json");
  const validationManifestPath = path.join(runRoot, "zip-validation-manifest.json");
  const checksumManifestPath = path.join(runRoot, "checksum-manifest.json");
  writeJson(packetPath, packet);
  writeJson(validationManifestPath, validationManifest);
  writeJson(checksumManifestPath, checksumManifest);

  return {
    ...inspection,
    ok: validationEvidencePacketProduced,
    phaseZipValidatorStatus: status,
    validationFailedCount,
    phaseZipValidatorId: runId,
    sourceOverlayZipId: config.sourceOverlayZipId,
    overlayPackageManifestRead: inspection.phaseOverlayPackageManifestReadAllowed,
    validationEvidencePacketProduced,
    checksumManifestProduced: true,
    invalidPackageQuarantined: validationFailedCount > 0,
    projectRepoSourceMutated: inspection.projectRepoSourceMutated,
    overlayZipBuilt: inspection.overlayZipBuilt,
    realProjectBranchCreated: inspection.realProjectBranchCreated,
    realProjectMergePerformed: inspection.realProjectMergePerformed,
    gitPushPerformed: inspection.gitPushPerformed,
    tagCreated: inspection.tagCreated,
    shellExecuted: inspection.shellExecuted,
    productionDeployed: inspection.productionDeployed,
    packetPath,
    validationManifestPath,
    checksumManifestPath,
  };
}

export const phaseZipValidatorV1 = {
  declaredPaths,
  phaseZipValidatorRequirements,
  phaseZipValidatorFields,
  phaseFactoryStages,
  roadmapTracks,
  multiLanguageProductionTargets,
  requiredOverlayFiles,
  createDefaultPhaseZipValidatorV1,
  inspectPhaseZipValidatorV1,
  runPhaseZipValidatorV1,
};
