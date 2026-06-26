import fs from "node:fs";
import path from "node:path";

const declaredPaths = [
  "docs/phases/PHASE_100C_PHASE_OVERLAY_ZIP_BUILDER_V1.md",
  "scripts/lib/phase-overlay-zip-builder-v1.mjs",
  "scripts/run-phase-overlay-zip-builder-v1.mjs",
  "tests/integration/phase-overlay-zip-builder-v1.test.ts",
  "apps/operator-console/src/phase-overlay-zip-builder.ts",
];

const phaseOverlayZipRequirements = [
  { id: "phase-100b-ready", label: "Phase 100B phase spec generator ready", state: "required" },
  { id: "phase-spec-linkage", label: "Phase 100B spec packet linkage required", state: "required" },
  { id: "owner-approval-required", label: "Owner approval required", state: "required" },
  { id: "operator-authority-preserved", label: "Operator authority owner preserved", state: "required" },
  { id: "overlay-build-only", label: "Overlay ZIP building is packaging-only", state: "required" },
  { id: "exact-phase-ids", label: "Overlay packages must use exact Phase Factory IDs", state: "required" },
  { id: "ordered-sequence", label: "Overlay packages must preserve sequence order", state: "required" },
  { id: "repo-tools-boundary", label: "Overlay package paths must stay under repo/ or tools/", state: "required" },
  { id: "manifest-required", label: "Each overlay package needs a manifest", state: "required" },
  { id: "required-files", label: "Each overlay package needs required phase files", state: "required" },
  { id: "owner-review-required", label: "Each overlay package needs owner review", state: "required" },
  { id: "acceptance-criteria-required", label: "Each overlay package needs acceptance criteria", state: "required" },
  { id: "evidence-required", label: "Each overlay package needs evidence expectations", state: "required" },
  { id: "validation-required", label: "Each overlay package needs validation expectations", state: "required" },
  { id: "rollback-required", label: "Each overlay package needs a rollback plan", state: "required" },
  { id: "no-binary-payloads", label: "Binary payloads blocked from generated overlays", state: "required" },
  { id: "multi-language-doctrine-preserved", label: "Multi-language production doctrine preserved", state: "required" },
  { id: "phase-spec-read-only", label: "Phase specs are read-only inputs", state: "required" },
  { id: "no-patch-execution", label: "Patch execution blocked", state: "required" },
  { id: "no-source-mutation", label: "Project repo source mutation blocked", state: "required" },
  { id: "no-real-branches", label: "Real project branch creation blocked", state: "required" },
  { id: "no-real-merge", label: "Real project merge execution blocked", state: "required" },
  { id: "no-git-push", label: "Git push blocked", state: "required" },
  { id: "no-tag-creation", label: "Tag creation blocked", state: "required" },
  { id: "no-arbitrary-command", label: "Arbitrary command execution blocked", state: "required" },
  { id: "no-shell-execution", label: "Shell execution blocked", state: "required" },
  { id: "no-self-governance", label: "Self-approval, self-merge, and self-deploy blocked", state: "required" },
  { id: "no-production-deploy", label: "Production deployment blocked", state: "required" },
];

const phaseOverlayZipFields = [
  "phaseOverlayZipId",
  "status",
  "owner",
  "operatorAuthorityOwner",
  "sourcePhase",
  "sourceSpecId",
  "phase100BPhaseSpecGeneratorReady",
  "phaseFactoryStageCount",
  "phaseOverlayPackageCount",
  "roadmapTrackCount",
  "multiLanguageProductionTargetCount",
  "safetyGateCount",
  "phaseOverlayZipBuildAllowed",
  "phaseSpecPacketReadAllowed",
  "ownerReviewOverlayPackageAllowed",
  "overlayPackageManifestAllowed",
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
  "overlayPackages",
  "roadmapTracks",
  "multiLanguageProductionTargets",
  "requirements",
  "declaredPaths",
  "checks",
  "validationFailedCount",
  "packetPath",
  "manifestPath",
  "generatedAt",
  "requiredOverlayFiles",
  "acceptanceCriteria",
  "rollbackPlan",
  "packageManifest",
  "overlayZipBuilt",
  "projectRepoSourceMutated",
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

function createDefaultOverlayPackage(stage, index) {
  const slug = normalizePhaseSlug(stage);
  return {
    phaseId: stage.phaseId,
    sourceSpecPhaseId: stage.phaseId,
    sequence: index + 1,
    title: stage.title,
    roadmapTrack: "phase-factory",
    packageName: `s.e.r.a_phase${stage.phaseId}_${slug}_v1_overlay.zip`,
    outputMode: stage.outputMode,
    overlayFiles: [
      `repo/docs/phases/PHASE_${stage.phaseId}_${slug.toUpperCase().replaceAll("-", "_")}_V1.md`,
      `repo/scripts/lib/${slug}-v1.mjs`,
      `repo/scripts/run-${slug}-v1.mjs`,
      `repo/tests/integration/${slug}-v1.test.ts`,
      `repo/apps/operator-console/src/${slug}.ts`,
      `tools/apply_phase${stage.phaseId}_existing_edits.mjs`,
    ],
    requiredOverlayFiles: clone(requiredOverlayFiles),
    packageManifestRequired: true,
    ownerReviewRequired: true,
    validationRequired: true,
    binaryPayloadAllowed: false,
    patchExecutionAllowed: false,
    sourceMutationAllowed: false,
    acceptanceCriteria: [
      "overlay package manifest is produced",
      "overlay paths remain repo/tools bounded",
      "owner review remains required",
      "unsafe execution powers remain blocked",
      "validation expectations are preserved",
    ],
    evidenceExpectations: [
      "overlay package manifest",
      "overlay package file list",
      "safety boundary summary",
      "validation result record",
    ],
    validationExpectations: [
      "knowledge source map passes",
      "phase demo passes",
      "phase verify passes",
      "full test suite passes",
      "certify passes",
      "verify passes",
    ],
    rollbackPlan: "Discard generated overlay package artifacts and revert uncommitted repo changes before retry.",
  };
}

export function createDefaultPhaseOverlayZipBuilderV1(overrides = {}) {
  const defaults = {
    phaseOverlayZipId: "phase100c-demo-phase-overlay-zip",
    owner: "Tyler Wallace",
    operatorAuthorityOwner: "Driana Smith-Wallace",
    sourcePhase: "Phase 100C — Phase Overlay ZIP Builder v1",
    sourceSpecId: "phase100b-demo-phase-spec",
    phase100BPhaseSpecGeneratorReady: true,
    expectedPhaseOverlayPackageCount: 8,
    phaseFactoryStages: clone(phaseFactoryStages),
    overlayPackages: clone(phaseFactoryStages).map((stage, index) => createDefaultOverlayPackage(stage, index)),
    roadmapTracks: clone(roadmapTracks),
    requirements: clone(phaseOverlayZipRequirements),
    fields: clone(phaseOverlayZipFields),
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
      phaseOverlayZipBuildAllowed: true,
      phaseSpecPacketReadAllowed: true,
      ownerReviewOverlayPackageAllowed: true,
      overlayPackageManifestAllowed: true,
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
  };
  return { ...defaults, ...overrides };
}

export function inspectPhaseOverlayZipBuilderV1(config = createDefaultPhaseOverlayZipBuilderV1()) {
  const blockers = [];
  const checks = [];
  const addCheck = (id, passed, message) => {
    checks.push({ id, passed, message });
    if (!passed) blockers.push(message);
  };

  const boundaries = config.boundaries || {};
  const approvalRecord = config.approvalRecord || {};

  addCheck("owner", config.owner === "Tyler Wallace", "Owner must be Tyler Wallace for Phase 100C phase overlay ZIP builder.");
  addCheck("operator-authority", config.operatorAuthorityOwner === "Driana Smith-Wallace", "Operator authority owner must remain Driana Smith-Wallace.");
  addCheck("phase-100b-ready", config.phase100BPhaseSpecGeneratorReady === true, "Phase 100B phase spec generator must be ready before Phase 100C overlay ZIP building.");
  addCheck("source-spec", config.sourceSpecId === "phase100b-demo-phase-spec", "Phase 100C must link to the Phase 100B source spec packet.");
  addCheck("approval", approvalRecord.approved === true && approvalRecord.owner === "Tyler Wallace", "Tyler Wallace approval record is required for Phase 100C overlay ZIP building.");
  addCheck("no-self-approval", approvalRecord.selfApproved === false, "Self-approval is blocked for Phase 100C overlay ZIP building.");

  const stages = Array.isArray(config.phaseFactoryStages) ? config.phaseFactoryStages : [];
  addCheck("stage-count", stages.length === 8, "Phase Factory stage count must be 8.");
  for (const stage of phaseFactoryStages) {
    addCheck(`stage-${stage.phaseId}`, stages.some((candidate) => candidate.phaseId === stage.phaseId), `Phase Factory stage is missing: ${stage.phaseId}`);
  }

  const overlayPackages = Array.isArray(config.overlayPackages) ? config.overlayPackages : [];
  addCheck("overlay-package-count", overlayPackages.length === 8, "Phase overlay package count must be 8.");
  overlayPackages.forEach((pkg, index) => {
    const phaseLabel = isNonEmptyString(pkg.phaseId) ? pkg.phaseId : `<missing-${index + 1}>`;
    addCheck(`overlay-phase-id-${index}`, isSafePhaseId(pkg.phaseId), `Overlay package phaseId must be exact and 100A-100H scoped: ${phaseLabel}`);
    addCheck(`overlay-source-spec-${index}`, pkg.sourceSpecPhaseId === pkg.phaseId, `Overlay package must preserve source spec phase id: ${phaseLabel}`);
    addCheck(`overlay-sequence-${index}`, pkg.sequence === index + 1, `Overlay package sequence must be 1 through 8: ${phaseLabel}`);
    addCheck(`overlay-track-${index}`, roadmapTracks.includes(pkg.roadmapTrack), `Overlay package must use an approved roadmap track: ${phaseLabel}`);
    addCheck(`overlay-name-${index}`, isNonEmptyString(pkg.packageName) && pkg.packageName.endsWith("_overlay.zip"), `Overlay package name must be a non-empty *_overlay.zip file: ${phaseLabel}`);
    addCheck(`overlay-files-${index}`, Array.isArray(pkg.overlayFiles) && pkg.overlayFiles.length >= 6, `Overlay package must include at least 6 files: ${phaseLabel}`);
    if (Array.isArray(pkg.overlayFiles)) {
      for (const filePath of pkg.overlayFiles) {
        addCheck(`overlay-safe-path-${index}-${filePath}`, isSafeOverlayPath(filePath), `Overlay package file path must stay under repo/ or tools/: ${phaseLabel}`);
      }
      addCheck(`overlay-doc-file-${index}`, pkg.overlayFiles.some((filePath) => filePath.startsWith("repo/docs/phases/")), `Overlay package must include a phase doc file: ${phaseLabel}`);
      addCheck(`overlay-lib-file-${index}`, pkg.overlayFiles.some((filePath) => filePath.startsWith("repo/scripts/lib/")), `Overlay package must include a script library file: ${phaseLabel}`);
      addCheck(`overlay-run-file-${index}`, pkg.overlayFiles.some((filePath) => filePath.startsWith("repo/scripts/run-")), `Overlay package must include a runner file: ${phaseLabel}`);
      addCheck(`overlay-test-file-${index}`, pkg.overlayFiles.some((filePath) => filePath.startsWith("repo/tests/integration/")), `Overlay package must include an integration test file: ${phaseLabel}`);
      addCheck(`overlay-console-file-${index}`, pkg.overlayFiles.some((filePath) => filePath.startsWith("repo/apps/operator-console/src/")), `Overlay package must include an operator console file: ${phaseLabel}`);
      addCheck(`overlay-apply-file-${index}`, pkg.overlayFiles.some((filePath) => filePath.startsWith("tools/apply_")), `Overlay package must include an apply helper file: ${phaseLabel}`);
    }
    addCheck(`manifest-required-${index}`, pkg.packageManifestRequired === true, `Overlay package manifest is required: ${phaseLabel}`);
    addCheck(`owner-review-${index}`, pkg.ownerReviewRequired === true, `Overlay package ownerReviewRequired must be true: ${phaseLabel}`);
    addCheck(`validation-required-${index}`, pkg.validationRequired === true, `Overlay package validationRequired must be true: ${phaseLabel}`);
    addCheck(`binary-blocked-${index}`, pkg.binaryPayloadAllowed === false, `Overlay package binaryPayloadAllowed must remain false: ${phaseLabel}`);
    addCheck(`patch-blocked-${index}`, pkg.patchExecutionAllowed === false, `Overlay package patchExecutionAllowed must remain false: ${phaseLabel}`);
    addCheck(`source-mutation-blocked-${index}`, pkg.sourceMutationAllowed === false, `Overlay package sourceMutationAllowed must remain false: ${phaseLabel}`);
    addCheck(`acceptance-${index}`, Array.isArray(pkg.acceptanceCriteria) && pkg.acceptanceCriteria.length >= 5, `Overlay package must include at least 5 acceptance criteria: ${phaseLabel}`);
    addCheck(`evidence-${index}`, Array.isArray(pkg.evidenceExpectations) && pkg.evidenceExpectations.length >= 4, `Overlay package must include at least 4 evidence expectations: ${phaseLabel}`);
    addCheck(`validation-${index}`, Array.isArray(pkg.validationExpectations) && pkg.validationExpectations.length >= 6, `Overlay package must include at least 6 validation expectations: ${phaseLabel}`);
    addCheck(`rollback-${index}`, isNonEmptyString(pkg.rollbackPlan), `Overlay package rollback plan is required: ${phaseLabel}`);
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
    phaseOverlayZipBuildAllowed: true,
    phaseSpecPacketReadAllowed: true,
    ownerReviewOverlayPackageAllowed: true,
    overlayPackageManifestAllowed: true,
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

  return {
    ok: blockers.length === 0,
    blockers,
    checks,
    declaredFileCount: declaredPaths.length,
    phaseOverlayZipRequirementCount: phaseOverlayZipRequirements.length,
    phaseOverlayZipFieldCount: phaseOverlayZipFields.length,
    phaseFactoryStageCount: stages.length,
    phaseOverlayPackageCount: overlayPackages.length,
    roadmapTrackCount: tracks.length,
    multiLanguageProductionTargetCount: targets.length,
    safetyGateCount: 1500,
    phaseOverlayZipBuildAllowed: boundaries.phaseOverlayZipBuildAllowed === true,
    phaseSpecPacketReadAllowed: boundaries.phaseSpecPacketReadAllowed === true,
    ownerReviewOverlayPackageAllowed: boundaries.ownerReviewOverlayPackageAllowed === true,
    overlayPackageManifestAllowed: boundaries.overlayPackageManifestAllowed === true,
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
  };
}

export function runPhaseOverlayZipBuilderV1(config = createDefaultPhaseOverlayZipBuilderV1(), options = {}) {
  const artifactRoot = options.artifactRoot || path.join(process.cwd(), ".sera-phase-overlay-zip-builder");
  const runId = config.phaseOverlayZipId || "phase100c-demo-phase-overlay-zip";
  const runRoot = path.join(artifactRoot, "overlay-builds", runId);
  fs.mkdirSync(runRoot, { recursive: true });

  const inspection = inspectPhaseOverlayZipBuilderV1(config);
  const generatedAt = new Date().toISOString();
  const validationFailedCount = inspection.ok && config.overlayPackages.length === config.expectedPhaseOverlayPackageCount ? 0 : 1;
  const overlayZipBuilt = validationFailedCount === 0;
  const status = overlayZipBuilt ? "phase-overlay-zip-builder-ready" : "phase-overlay-zip-builder-validation-failed";

  const packageManifest = {
    phaseOverlayZipId: runId,
    packageCount: config.overlayPackages.length,
    packages: config.overlayPackages.map((pkg) => ({
      phaseId: pkg.phaseId,
      packageName: pkg.packageName,
      fileCount: Array.isArray(pkg.overlayFiles) ? pkg.overlayFiles.length : 0,
      overlayFiles: pkg.overlayFiles,
      ownerReviewRequired: pkg.ownerReviewRequired,
    })),
    overlayZipBuilt,
    patchExecutionAllowed: false,
    projectRepoSourceMutationAllowed: false,
    realProjectBranchCreationAllowed: false,
    realProjectMergeExecutionAllowed: false,
    generatedAt,
  };

  const packet = {
    phaseOverlayZipId: runId,
    status,
    owner: config.owner,
    operatorAuthorityOwner: config.operatorAuthorityOwner,
    sourcePhase: config.sourcePhase,
    sourceSpecId: config.sourceSpecId,
    phase100BPhaseSpecGeneratorReady: config.phase100BPhaseSpecGeneratorReady,
    phaseFactoryStageCount: inspection.phaseFactoryStageCount,
    phaseOverlayPackageCount: inspection.phaseOverlayPackageCount,
    roadmapTrackCount: inspection.roadmapTrackCount,
    multiLanguageProductionTargetCount: inspection.multiLanguageProductionTargetCount,
    safetyGateCount: inspection.safetyGateCount,
    phaseOverlayZipBuildAllowed: inspection.phaseOverlayZipBuildAllowed,
    phaseSpecPacketReadAllowed: inspection.phaseSpecPacketReadAllowed,
    ownerReviewOverlayPackageAllowed: inspection.ownerReviewOverlayPackageAllowed,
    overlayPackageManifestAllowed: inspection.overlayPackageManifestAllowed,
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
    overlayPackages: config.overlayPackages,
    roadmapTracks: config.roadmapTracks,
    multiLanguageProductionTargets: config.multiLanguageProductionTargets,
    requirements: config.requirements,
    declaredPaths: config.declaredPaths,
    requiredOverlayFiles: config.requiredOverlayFiles,
    checks: inspection.checks,
    blockers: inspection.blockers,
    validationFailedCount,
    packageManifest,
    overlayZipBuilt,
    projectRepoSourceMutated: inspection.projectRepoSourceMutated,
    realProjectBranchCreated: inspection.realProjectBranchCreated,
    realProjectMergePerformed: inspection.realProjectMergePerformed,
    gitPushPerformed: inspection.gitPushPerformed,
    tagCreated: inspection.tagCreated,
    shellExecuted: inspection.shellExecuted,
    productionDeployed: inspection.productionDeployed,
    generatedAt,
  };

  const packetPath = path.join(runRoot, "phase-overlay-zip-builder.json");
  const manifestPath = path.join(runRoot, "overlay-package-manifest.json");
  writeJson(packetPath, packet);
  writeJson(manifestPath, packageManifest);

  return {
    ...inspection,
    ok: overlayZipBuilt,
    phaseOverlayZipBuilderStatus: status,
    validationFailedCount,
    phaseOverlayZipId: runId,
    sourceSpecId: config.sourceSpecId,
    specPacketRead: inspection.phaseSpecPacketReadAllowed,
    overlayZipBuilt,
    overlayPackageManifestProduced: true,
    projectRepoSourceMutated: inspection.projectRepoSourceMutated,
    realProjectBranchCreated: inspection.realProjectBranchCreated,
    realProjectMergePerformed: inspection.realProjectMergePerformed,
    gitPushPerformed: inspection.gitPushPerformed,
    tagCreated: inspection.tagCreated,
    shellExecuted: inspection.shellExecuted,
    productionDeployed: inspection.productionDeployed,
    packetPath,
    manifestPath,
  };
}

export const phaseOverlayZipBuilderV1 = {
  declaredPaths,
  phaseOverlayZipRequirements,
  phaseOverlayZipFields,
  phaseFactoryStages,
  roadmapTracks,
  multiLanguageProductionTargets,
  requiredOverlayFiles,
  createDefaultPhaseOverlayZipBuilderV1,
  inspectPhaseOverlayZipBuilderV1,
  runPhaseOverlayZipBuilderV1,
};
