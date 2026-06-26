import fs from "node:fs";
import path from "node:path";

const declaredPaths = [
  "docs/phases/PHASE_100E_PHASE_APPLY_QUEUE_V1.md",
  "scripts/lib/phase-apply-queue-v1.mjs",
  "scripts/run-phase-apply-queue-v1.mjs",
  "tests/integration/phase-apply-queue-v1.test.ts",
  "apps/operator-console/src/phase-apply-queue.ts",
];

const phaseApplyQueueRequirements = [
  { id: "phase-100d-ready", label: "Phase 100D phase ZIP validator ready", state: "required" },
  { id: "zip-validation-lineage", label: "Phase 100D ZIP validation evidence lineage required", state: "required" },
  { id: "owner-approval-required", label: "Tyler Wallace owner approval required", state: "required" },
  { id: "operator-authority-preserved", label: "Driana Smith-Wallace operator authority preserved", state: "required" },
  { id: "queue-only", label: "Phase apply queue is queue-only", state: "required" },
  { id: "manual-apply-review", label: "Manual owner apply review required before any phase application", state: "required" },
  { id: "exact-phase-ids", label: "Apply queue items must use exact Phase Factory IDs", state: "required" },
  { id: "ordered-sequence", label: "Apply queue items must preserve sequence order", state: "required" },
  { id: "validated-package-required", label: "Validated ZIP package evidence is required for every item", state: "required" },
  { id: "repo-tools-boundary", label: "Apply queue paths must stay under repo/ or tools/", state: "required" },
  { id: "owner-review-status", label: "Queue items must remain queued for owner review", state: "required" },
  { id: "apply-execution-blocked", label: "Apply execution is blocked in Phase 100E", state: "required" },
  { id: "source-mutation-blocked", label: "Source mutation is blocked in Phase 100E", state: "required" },
  { id: "branch-creation-blocked", label: "Real branch creation is blocked in Phase 100E", state: "required" },
  { id: "merge-blocked", label: "Real merge execution is blocked in Phase 100E", state: "required" },
  { id: "git-push-blocked", label: "Git push is blocked in Phase 100E", state: "required" },
  { id: "tag-blocked", label: "Tag creation is blocked in Phase 100E", state: "required" },
  { id: "shell-blocked", label: "Shell execution is blocked in Phase 100E", state: "required" },
  { id: "scheduler-blocked", label: "Scheduler, workflow, and iPhone automation mutation blocked", state: "required" },
  { id: "fleet-blocked", label: "Fleet and away-mode execution blocked", state: "required" },
  { id: "self-governance-blocked", label: "Self-approval, self-merge, and self-deploy blocked", state: "required" },
  { id: "production-blocked", label: "Production deployment blocked", state: "required" },
  { id: "queue-packet-required", label: "Owner-reviewable apply queue packet required", state: "required" },
  { id: "queue-manifest-required", label: "Apply queue manifest required", state: "required" },
  { id: "review-manifest-required", label: "Owner review manifest required", state: "required" },
  { id: "rollback-required", label: "Rollback plan required for every queued phase", state: "required" },
  { id: "validation-required", label: "Validation expectations required for every queued phase", state: "required" },
  { id: "evidence-required", label: "Evidence expectations required for every queued phase", state: "required" },
  { id: "no-path-traversal", label: "Path traversal must be blocked", state: "required" },
  { id: "no-absolute-paths", label: "Absolute paths must be blocked", state: "required" },
  { id: "multi-language-doctrine-preserved", label: "Multi-language production doctrine preserved", state: "required" },
  { id: "phase-100f-handoff", label: "Troubleshooting-loop handoff remains pending Phase 100F", state: "required" },
];

const phaseApplyQueueFields = [
  "phaseApplyQueueId",
  "status",
  "owner",
  "operatorAuthorityOwner",
  "sourcePhase",
  "sourceZipValidatorId",
  "phase100DPhaseZipValidatorReady",
  "phaseFactoryStageCount",
  "phaseApplyQueueItemCount",
  "roadmapTrackCount",
  "multiLanguageProductionTargetCount",
  "safetyGateCount",
  "phaseApplyQueueAllowed",
  "phaseZipValidationEvidenceReadAllowed",
  "ownerReviewQueuePacketAllowed",
  "manualApplyReviewAllowed",
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
  "applyQueueItems",
  "roadmapTracks",
  "multiLanguageProductionTargets",
  "requirements",
  "declaredPaths",
  "checks",
  "validationFailedCount",
  "packetPath",
  "queueManifestPath",
  "ownerReviewManifestPath",
  "generatedAt",
  "requiredOverlayFiles",
  "acceptanceCriteria",
  "rollbackPlan",
  "queueManifest",
  "ownerReviewManifest",
  "applyQueuePacketProduced",
  "projectRepoSourceMutated",
  "realProjectBranchCreated",
  "realProjectMergePerformed",
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

function createDefaultApplyQueueItem(stage, index) {
  const slug = normalizePhaseSlug(stage);
  return {
    phaseId: stage.phaseId,
    sequence: index + 1,
    title: stage.title,
    roadmapTrack: "phase-factory",
    sourceZipValidatorId: "phase100d-demo-phase-zip-validator",
    validatedOverlayPackageName: `s.e.r.a_phase${stage.phaseId}_${slug}_v1_overlay.zip`,
    queueStatus: "queued-owner-review",
    ownerReviewRequired: true,
    manualApplyReviewRequired: true,
    validatedZipEvidencePresent: true,
    checksumManifestPresent: true,
    applyExecutionAllowed: false,
    patchExecutionAllowed: false,
    sourceMutationAllowed: false,
    branchCreationAllowed: false,
    mergeAllowed: false,
    gitPushAllowed: false,
    tagCreationAllowed: false,
    shellExecutionAllowed: false,
    applyPerformed: false,
    overlayFiles: [
      `repo/docs/phases/PHASE_${stage.phaseId}_${slug.toUpperCase().replaceAll("-", "_")}_V1.md`,
      `repo/scripts/lib/${slug}-v1.mjs`,
      `repo/scripts/run-${slug}-v1.mjs`,
      `repo/tests/integration/${slug}-v1.test.ts`,
      `repo/apps/operator-console/src/${slug}.ts`,
      `tools/apply_phase${stage.phaseId}_existing_edits.mjs`,
    ],
    acceptanceCriteria: [
      "Owner-reviewable apply queue packet is produced",
      "Validated ZIP evidence is linked",
      "Manual owner review remains required",
      "No phase apply execution is performed",
      "Unsafe execution powers remain blocked",
    ],
    evidenceExpectations: [
      "apply queue packet",
      "queue manifest",
      "owner review manifest",
      "validated ZIP lineage",
    ],
    validationExpectations: [
      "knowledge source map passes",
      "phase demo passes",
      "phase verify passes",
      "full test suite passes",
      "certify passes",
      "verify passes",
    ],
    rollbackPlan: "Remove the queued item, discard queue runtime artifacts, and return to the last validated ZIP evidence packet.",
  };
}

export function createDefaultPhaseApplyQueueV1(overrides = {}) {
  const defaults = {
    phaseApplyQueueId: "phase100e-demo-phase-apply-queue",
    owner: "Tyler Wallace",
    operatorAuthorityOwner: "Driana Smith-Wallace",
    sourcePhase: "Phase 100E — Phase Apply Queue v1",
    sourceZipValidatorId: "phase100d-demo-phase-zip-validator",
    phase100DPhaseZipValidatorReady: true,
    expectedPhaseApplyQueueItemCount: 8,
    phaseFactoryStages: clone(phaseFactoryStages),
    applyQueueItems: clone(phaseFactoryStages).map((stage, index) => createDefaultApplyQueueItem(stage, index)),
    roadmapTracks: clone(roadmapTracks),
    requirements: clone(phaseApplyQueueRequirements),
    fields: clone(phaseApplyQueueFields),
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
      phaseApplyQueueAllowed: true,
      phaseZipValidationEvidenceReadAllowed: true,
      ownerReviewQueuePacketAllowed: true,
      manualApplyReviewAllowed: true,
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
    applyExecuted: false,
    patchExecuted: false,
  };
  return { ...defaults, ...overrides };
}

export function inspectPhaseApplyQueueV1(config = createDefaultPhaseApplyQueueV1()) {
  const blockers = [];
  const checks = [];
  const addCheck = (id, passed, message) => {
    checks.push({ id, passed, message });
    if (!passed) blockers.push(message);
  };

  const boundaries = config.boundaries || {};
  const approvalRecord = config.approvalRecord || {};

  addCheck("owner", config.owner === "Tyler Wallace", "Owner must be Tyler Wallace for Phase 100E phase apply queue.");
  addCheck("operator-authority", config.operatorAuthorityOwner === "Driana Smith-Wallace", "Operator authority owner must remain Driana Smith-Wallace.");
  addCheck("phase-100d-ready", config.phase100DPhaseZipValidatorReady === true, "Phase 100D phase ZIP validator must be ready before Phase 100E apply queue.");
  addCheck("source-validator", config.sourceZipValidatorId === "phase100d-demo-phase-zip-validator", "Phase 100E must link to the Phase 100D ZIP validator evidence.");
  addCheck("approval", approvalRecord.approved === true && approvalRecord.owner === "Tyler Wallace", "Tyler Wallace approval record is required for Phase 100E apply queue.");
  addCheck("no-self-approval", approvalRecord.selfApproved === false, "Self-approval is blocked for Phase 100E apply queue.");

  const stages = Array.isArray(config.phaseFactoryStages) ? config.phaseFactoryStages : [];
  addCheck("stage-count", stages.length === 8, "Phase Factory stage count must be 8.");
  for (const stage of phaseFactoryStages) {
    addCheck(`stage-${stage.phaseId}`, stages.some((candidate) => candidate.phaseId === stage.phaseId), `Phase Factory stage is missing: ${stage.phaseId}`);
  }

  const items = Array.isArray(config.applyQueueItems) ? config.applyQueueItems : [];
  addCheck("apply-queue-item-count", items.length === 8, "Phase apply queue item count must be 8.");
  items.forEach((item, index) => {
    const phaseLabel = isNonEmptyString(item.phaseId) ? item.phaseId : `<missing-${index + 1}>`;
    addCheck(`queue-phase-id-${index}`, isSafePhaseId(item.phaseId), `Apply queue item phaseId must be exact and 100A-100H scoped: ${phaseLabel}`);
    addCheck(`queue-source-validator-${index}`, item.sourceZipValidatorId === "phase100d-demo-phase-zip-validator", `Apply queue item must preserve Phase 100D source validator id: ${phaseLabel}`);
    addCheck(`queue-sequence-${index}`, item.sequence === index + 1, `Apply queue item sequence must be 1 through 8: ${phaseLabel}`);
    addCheck(`queue-track-${index}`, roadmapTracks.includes(item.roadmapTrack), `Apply queue item must use an approved roadmap track: ${phaseLabel}`);
    addCheck(`queue-package-name-${index}`, isNonEmptyString(item.validatedOverlayPackageName) && item.validatedOverlayPackageName.endsWith("_overlay.zip"), `Apply queue item package name must be a non-empty *_overlay.zip file: ${phaseLabel}`);
    addCheck(`queue-status-${index}`, item.queueStatus === "queued-owner-review", `Apply queue item must remain queued-owner-review: ${phaseLabel}`);
    addCheck(`queue-owner-review-${index}`, item.ownerReviewRequired === true, `Apply queue item ownerReviewRequired must be true: ${phaseLabel}`);
    addCheck(`queue-manual-review-${index}`, item.manualApplyReviewRequired === true, `Apply queue item manualApplyReviewRequired must be true: ${phaseLabel}`);
    addCheck(`queue-validated-evidence-${index}`, item.validatedZipEvidencePresent === true, `Apply queue item validated ZIP evidence is required: ${phaseLabel}`);
    addCheck(`queue-checksum-${index}`, item.checksumManifestPresent === true, `Apply queue item checksum manifest is required: ${phaseLabel}`);
    addCheck(`queue-apply-blocked-${index}`, item.applyExecutionAllowed === false, `Apply queue item applyExecutionAllowed must remain false: ${phaseLabel}`);
    addCheck(`queue-patch-blocked-${index}`, item.patchExecutionAllowed === false, `Apply queue item patchExecutionAllowed must remain false: ${phaseLabel}`);
    addCheck(`queue-source-blocked-${index}`, item.sourceMutationAllowed === false, `Apply queue item sourceMutationAllowed must remain false: ${phaseLabel}`);
    addCheck(`queue-branch-blocked-${index}`, item.branchCreationAllowed === false, `Apply queue item branchCreationAllowed must remain false: ${phaseLabel}`);
    addCheck(`queue-merge-blocked-${index}`, item.mergeAllowed === false, `Apply queue item mergeAllowed must remain false: ${phaseLabel}`);
    addCheck(`queue-push-blocked-${index}`, item.gitPushAllowed === false, `Apply queue item gitPushAllowed must remain false: ${phaseLabel}`);
    addCheck(`queue-tag-blocked-${index}`, item.tagCreationAllowed === false, `Apply queue item tagCreationAllowed must remain false: ${phaseLabel}`);
    addCheck(`queue-shell-blocked-${index}`, item.shellExecutionAllowed === false, `Apply queue item shellExecutionAllowed must remain false: ${phaseLabel}`);
    addCheck(`queue-apply-not-performed-${index}`, item.applyPerformed === false, `Apply queue item applyPerformed must remain false: ${phaseLabel}`);
    addCheck(`queue-files-${index}`, Array.isArray(item.overlayFiles) && item.overlayFiles.length >= 6, `Apply queue item must include at least 6 files: ${phaseLabel}`);
    if (Array.isArray(item.overlayFiles)) {
      for (const filePath of item.overlayFiles) {
        addCheck(`queue-safe-path-${index}-${filePath}`, isSafeOverlayPath(filePath), `Apply queue item file path must stay under repo/ or tools/: ${phaseLabel}`);
      }
      addCheck(`queue-doc-file-${index}`, item.overlayFiles.some((filePath) => filePath.startsWith("repo/docs/phases/")), `Apply queue item must include a phase doc file: ${phaseLabel}`);
      addCheck(`queue-lib-file-${index}`, item.overlayFiles.some((filePath) => filePath.startsWith("repo/scripts/lib/")), `Apply queue item must include a script library file: ${phaseLabel}`);
      addCheck(`queue-run-file-${index}`, item.overlayFiles.some((filePath) => filePath.startsWith("repo/scripts/run-")), `Apply queue item must include a runner file: ${phaseLabel}`);
      addCheck(`queue-test-file-${index}`, item.overlayFiles.some((filePath) => filePath.startsWith("repo/tests/integration/")), `Apply queue item must include an integration test file: ${phaseLabel}`);
      addCheck(`queue-console-file-${index}`, item.overlayFiles.some((filePath) => filePath.startsWith("repo/apps/operator-console/src/")), `Apply queue item must include an operator console file: ${phaseLabel}`);
      addCheck(`queue-apply-file-${index}`, item.overlayFiles.some((filePath) => filePath.startsWith("tools/apply_")), `Apply queue item must include an apply helper file: ${phaseLabel}`);
    }
    addCheck(`queue-acceptance-${index}`, Array.isArray(item.acceptanceCriteria) && item.acceptanceCriteria.length >= 5, `Apply queue item must include at least 5 acceptance criteria: ${phaseLabel}`);
    addCheck(`queue-evidence-${index}`, Array.isArray(item.evidenceExpectations) && item.evidenceExpectations.length >= 4, `Apply queue item must include at least 4 evidence expectations: ${phaseLabel}`);
    addCheck(`queue-validation-${index}`, Array.isArray(item.validationExpectations) && item.validationExpectations.length >= 6, `Apply queue item must include at least 6 validation expectations: ${phaseLabel}`);
    addCheck(`queue-rollback-${index}`, isNonEmptyString(item.rollbackPlan), `Apply queue item rollback plan is required: ${phaseLabel}`);
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
    phaseApplyQueueAllowed: true,
    phaseZipValidationEvidenceReadAllowed: true,
    ownerReviewQueuePacketAllowed: true,
    manualApplyReviewAllowed: true,
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
  addCheck("no-apply-executed", config.applyExecuted === false, "applyExecuted must remain false");
  addCheck("no-patch-executed", config.patchExecuted === false, "patchExecuted must remain false");

  return {
    ok: blockers.length === 0,
    blockers,
    checks,
    declaredFileCount: declaredPaths.length,
    phaseApplyQueueRequirementCount: phaseApplyQueueRequirements.length,
    phaseApplyQueueFieldCount: phaseApplyQueueFields.length,
    phaseFactoryStageCount: stages.length,
    phaseApplyQueueItemCount: items.length,
    roadmapTrackCount: tracks.length,
    multiLanguageProductionTargetCount: targets.length,
    safetyGateCount: 1620,
    phaseApplyQueueAllowed: boundaries.phaseApplyQueueAllowed === true,
    phaseZipValidationEvidenceReadAllowed: boundaries.phaseZipValidationEvidenceReadAllowed === true,
    ownerReviewQueuePacketAllowed: boundaries.ownerReviewQueuePacketAllowed === true,
    manualApplyReviewAllowed: boundaries.manualApplyReviewAllowed === true,
    applyExecutionAllowed: boundaries.applyExecutionAllowed === true,
    patchExecutionAllowed: boundaries.patchExecutionAllowed === true,
    projectRepoSourceMutationAllowed: boundaries.projectRepoSourceMutationAllowed === true,
    realProjectBranchCreationAllowed: boundaries.realProjectBranchCreationAllowed === true,
    realProjectMergeExecutionAllowed: boundaries.realProjectMergeExecutionAllowed === true,
    gitPushAllowed: boundaries.gitPushAllowed === true,
    tagCreationAllowed: boundaries.tagCreationAllowed === true,
    arbitraryCommandAllowed: boundaries.arbitraryCommandAllowed === true,
    shellExecutionAllowed: boundaries.shellExecutionAllowed === true,
    schedulerWorkflowMutationAllowed: boundaries.schedulerWorkflowMutationAllowed === true,
    iPhoneAutomationMutationAllowed: boundaries.iPhoneAutomationMutationAllowed === true,
    fleetExecutionAllowed: boundaries.fleetExecutionAllowed === true,
    awayModeExecutionAllowed: boundaries.awayModeExecutionAllowed === true,
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
    applyExecuted: config.applyExecuted === true,
    patchExecuted: config.patchExecuted === true,
  };
}

export function runPhaseApplyQueueV1(config = createDefaultPhaseApplyQueueV1(), options = {}) {
  const artifactRoot = options.artifactRoot || path.join(process.cwd(), ".sera-phase-apply-queue");
  const runId = config.phaseApplyQueueId || "phase100e-demo-phase-apply-queue";
  const runRoot = path.join(artifactRoot, "apply-queues", runId);
  fs.mkdirSync(runRoot, { recursive: true });

  const inspection = inspectPhaseApplyQueueV1(config);
  const generatedAt = new Date().toISOString();
  const validationFailedCount = inspection.ok && config.applyQueueItems.length === config.expectedPhaseApplyQueueItemCount ? 0 : 1;
  const applyQueuePacketProduced = validationFailedCount === 0;
  const status = applyQueuePacketProduced ? "phase-apply-queue-ready" : "phase-apply-queue-validation-failed";

  const queueManifest = {
    phaseApplyQueueId: runId,
    sourceZipValidatorId: config.sourceZipValidatorId,
    validationFailedCount,
    applyQueuePacketProduced,
    queueItemCount: config.applyQueueItems.length,
    applyExecutionAllowed: false,
    patchExecutionAllowed: false,
    projectRepoSourceMutationAllowed: false,
    generatedAt,
  };

  const ownerReviewManifest = {
    phaseApplyQueueId: runId,
    owner: config.owner,
    operatorAuthorityOwner: config.operatorAuthorityOwner,
    manualApplyReviewRequired: true,
    ownerReviewRequiredForEveryItem: config.applyQueueItems.every((item) => item.ownerReviewRequired === true),
    readyForOwnerReview: applyQueuePacketProduced,
    applyPerformed: false,
    generatedAt,
  };

  const packet = {
    phaseApplyQueueId: runId,
    status,
    owner: config.owner,
    operatorAuthorityOwner: config.operatorAuthorityOwner,
    sourcePhase: config.sourcePhase,
    sourceZipValidatorId: config.sourceZipValidatorId,
    phase100DPhaseZipValidatorReady: config.phase100DPhaseZipValidatorReady,
    phaseFactoryStageCount: inspection.phaseFactoryStageCount,
    phaseApplyQueueItemCount: inspection.phaseApplyQueueItemCount,
    roadmapTrackCount: inspection.roadmapTrackCount,
    multiLanguageProductionTargetCount: inspection.multiLanguageProductionTargetCount,
    safetyGateCount: inspection.safetyGateCount,
    phaseApplyQueueAllowed: inspection.phaseApplyQueueAllowed,
    phaseZipValidationEvidenceReadAllowed: inspection.phaseZipValidationEvidenceReadAllowed,
    ownerReviewQueuePacketAllowed: inspection.ownerReviewQueuePacketAllowed,
    manualApplyReviewAllowed: inspection.manualApplyReviewAllowed,
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
    applyQueueItems: config.applyQueueItems,
    roadmapTracks: config.roadmapTracks,
    multiLanguageProductionTargets: config.multiLanguageProductionTargets,
    requirements: config.requirements,
    declaredPaths: config.declaredPaths,
    requiredOverlayFiles: config.requiredOverlayFiles,
    checks: inspection.checks,
    blockers: inspection.blockers,
    validationFailedCount,
    queueManifest,
    ownerReviewManifest,
    applyQueuePacketProduced,
    projectRepoSourceMutated: inspection.projectRepoSourceMutated,
    realProjectBranchCreated: inspection.realProjectBranchCreated,
    realProjectMergePerformed: inspection.realProjectMergePerformed,
    gitPushPerformed: inspection.gitPushPerformed,
    tagCreated: inspection.tagCreated,
    shellExecuted: inspection.shellExecuted,
    productionDeployed: inspection.productionDeployed,
    applyExecuted: inspection.applyExecuted,
    patchExecuted: inspection.patchExecuted,
    generatedAt,
  };

  const packetPath = path.join(runRoot, "phase-apply-queue.json");
  const queueManifestPath = path.join(runRoot, "apply-queue-manifest.json");
  const ownerReviewManifestPath = path.join(runRoot, "owner-review-manifest.json");
  writeJson(packetPath, packet);
  writeJson(queueManifestPath, queueManifest);
  writeJson(ownerReviewManifestPath, ownerReviewManifest);

  return {
    ...inspection,
    ok: applyQueuePacketProduced,
    phaseApplyQueueStatus: status,
    validationFailedCount,
    phaseApplyQueueId: runId,
    sourceZipValidatorId: config.sourceZipValidatorId,
    phase100DPhaseZipValidatorReady: config.phase100DPhaseZipValidatorReady,
    applyQueuePacketProduced,
    queueManifestProduced: true,
    ownerReviewManifestProduced: true,
    readyForOwnerReview: ownerReviewManifest.readyForOwnerReview,
    projectRepoSourceMutated: inspection.projectRepoSourceMutated,
    applyExecuted: inspection.applyExecuted,
    patchExecuted: inspection.patchExecuted,
    realProjectBranchCreated: inspection.realProjectBranchCreated,
    realProjectMergePerformed: inspection.realProjectMergePerformed,
    gitPushPerformed: inspection.gitPushPerformed,
    tagCreated: inspection.tagCreated,
    shellExecuted: inspection.shellExecuted,
    productionDeployed: inspection.productionDeployed,
    packetPath,
    queueManifestPath,
    ownerReviewManifestPath,
  };
}

export const phaseApplyQueueV1 = {
  declaredPaths,
  phaseApplyQueueRequirements,
  phaseApplyQueueFields,
  phaseFactoryStages,
  roadmapTracks,
  multiLanguageProductionTargets,
  requiredOverlayFiles,
  createDefaultPhaseApplyQueueV1,
  inspectPhaseApplyQueueV1,
  runPhaseApplyQueueV1,
};
