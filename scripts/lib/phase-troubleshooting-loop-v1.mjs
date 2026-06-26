import fs from "node:fs";
import path from "node:path";

const declaredPaths = [
  "docs/phases/PHASE_100F_PHASE_TROUBLESHOOTING_LOOP_V1.md",
  "scripts/lib/phase-troubleshooting-loop-v1.mjs",
  "scripts/run-phase-troubleshooting-loop-v1.mjs",
  "tests/integration/phase-troubleshooting-loop-v1.test.ts",
  "apps/operator-console/src/phase-troubleshooting-loop.ts",
];

const phaseTroubleshootingRequirements = [
  { id: "phase-100e-ready", label: "Phase 100E phase apply queue ready", state: "required" },
  { id: "apply-queue-lineage", label: "Phase 100E apply queue lineage required", state: "required" },
  { id: "owner-approval-required", label: "Tyler Wallace troubleshooting review approval required", state: "required" },
  { id: "operator-authority-preserved", label: "Driana Smith-Wallace operator authority preserved", state: "required" },
  { id: "diagnostic-only", label: "Troubleshooting loop is diagnostic-only", state: "required" },
  { id: "failed-case-capture", label: "Failed phase application case capture required", state: "required" },
  { id: "symptom-summary", label: "Symptom summary required for every case", state: "required" },
  { id: "likely-cause-summary", label: "Likely cause summary required for every case", state: "required" },
  { id: "repair-guidance", label: "Repair guidance may be drafted for owner review", state: "required" },
  { id: "evidence-links", label: "Evidence links required for every troubleshooting case", state: "required" },
  { id: "validation-links", label: "Validation command links required for every troubleshooting case", state: "required" },
  { id: "rollback-guidance", label: "Rollback guidance required for every troubleshooting case", state: "required" },
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
  { id: "diagnostic-packet", label: "Diagnostic evidence packet required", state: "required" },
  { id: "diagnostic-manifest", label: "Diagnostic manifest required", state: "required" },
  { id: "repair-guidance-manifest", label: "Repair guidance manifest required", state: "required" },
  { id: "queue-status-preserved", label: "Queue status must not be advanced by troubleshooting", state: "required" },
  { id: "review-before-action", label: "Owner review remains required before any future action", state: "required" },
  { id: "no-path-traversal", label: "Path traversal must be blocked", state: "required" },
  { id: "multi-language-doctrine-preserved", label: "Multi-language production doctrine preserved", state: "required" },
  { id: "phase-100g-handoff", label: "Evidence pack handoff remains pending Phase 100G", state: "required" },
  { id: "fail-closed", label: "Troubleshooting validation must fail closed", state: "required" },
];

const phaseTroubleshootingFields = [
  "phaseTroubleshootingId",
  "status",
  "owner",
  "operatorAuthorityOwner",
  "sourcePhase",
  "sourceApplyQueueId",
  "phase100EPhaseApplyQueueReady",
  "phaseFactoryStageCount",
  "troubleshootingCaseCount",
  "roadmapTrackCount",
  "multiLanguageProductionTargetCount",
  "safetyGateCount",
  "phaseTroubleshootingAllowed",
  "phaseApplyQueueReadAllowed",
  "diagnosticEvidencePacketAllowed",
  "repairGuidanceAllowed",
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
  "troubleshootingCases",
  "roadmapTracks",
  "multiLanguageProductionTargets",
  "requirements",
  "declaredPaths",
  "checks",
  "validationFailedCount",
  "packetPath",
  "diagnosticManifestPath",
  "repairGuidanceManifestPath",
  "generatedAt",
  "requiredEvidenceTypes",
  "acceptanceCriteria",
  "rollbackPlan",
  "diagnosticManifest",
  "repairGuidanceManifest",
  "troubleshootingPacketProduced",
  "diagnosticManifestProduced",
  "repairGuidanceManifestProduced",
  "readyForOwnerReview",
  "projectRepoSourceMutated",
  "autoFixExecuted",
  "applyExecuted",
  "patchExecuted",
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
  "failed phase id",
  "source apply queue id",
  "symptom summary",
  "likely cause summary",
  "evidence links",
  "validation command references",
  "repair guidance draft",
  "rollback guidance",
  "owner review requirement",
];

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function isNonEmptyString(value) { return typeof value === "string" && value.trim().length > 0; }
function isSafePhaseId(phaseId) { return typeof phaseId === "string" && /^100[A-H]$/.test(phaseId); }
function isSafeRelativePath(value) {
  if (!isNonEmptyString(value)) return false;
  if (value.includes("..") || path.isAbsolute(value) || value.includes("\\")) return false;
  return value.startsWith("repo/") || value.startsWith("tools/") || value.startsWith(".sera-");
}
function ensureDir(filePath) { fs.mkdirSync(path.dirname(filePath), { recursive: true }); }
function writeJson(filePath, value) {
  ensureDir(filePath);
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + "\n", "utf8");
}

function createDefaultTroubleshootingCase(stage, index) {
  return {
    phaseId: stage.phaseId,
    sequence: index + 1,
    title: stage.title,
    sourceApplyQueueId: "phase100e-demo-phase-apply-queue",
    caseStatus: "diagnostic-owner-review",
    failedApplyDetected: true,
    symptomSummary: `Example diagnostic symptom for ${stage.phaseId}: phase application did not complete validation.`,
    likelyCauseSummary: `Example likely cause for ${stage.phaseId}: an overlay expectation or validation result needs owner review.`,
    evidenceLinks: [
      `.sera-phase-apply-queue/apply-queues/phase100e-demo-phase-apply-queue/phase-apply-queue.json`,
      `.sera-phase-troubleshooting-loop/cases/${stage.phaseId}/diagnostic.json`,
    ],
    validationCommandReferences: [
      "npm run knowledge:verify",
      "npm run phase100f:demo",
      "npm run phase100f:verify",
      "npm test",
    ],
    repairGuidanceDraft: `Review the ${stage.phaseId} phase files, compare expected evidence against actual logs, then prepare a new owner-reviewed patch.`,
    rollbackGuidance: `Stop the queued apply attempt for ${stage.phaseId}, preserve failure evidence, clean runtime artifacts only, and return to the last clean main tag.`,
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

export function createDefaultPhaseTroubleshootingLoopV1(overrides = {}) {
  const defaults = {
    phaseTroubleshootingId: "phase100f-demo-phase-troubleshooting-loop",
    owner: "Tyler Wallace",
    operatorAuthorityOwner: "Driana Smith-Wallace",
    sourcePhase: "Phase 100F — Phase Troubleshooting Loop v1",
    sourceApplyQueueId: "phase100e-demo-phase-apply-queue",
    phase100EPhaseApplyQueueReady: true,
    expectedTroubleshootingCaseCount: 8,
    phaseFactoryStages: clone(phaseFactoryStages),
    troubleshootingCases: clone(phaseFactoryStages).map((stage, index) => createDefaultTroubleshootingCase(stage, index)),
    roadmapTracks: clone(roadmapTracks),
    requirements: clone(phaseTroubleshootingRequirements),
    fields: clone(phaseTroubleshootingFields),
    declaredPaths: clone(declaredPaths),
    requiredEvidenceTypes: clone(requiredEvidenceTypes),
    multiLanguageProductionTargets: clone(multiLanguageProductionTargets),
    approvalRecord: { owner: "Tyler Wallace", operatorAuthorityOwner: "Driana Smith-Wallace", approved: true, selfApproved: false },
    boundaries: {
      phaseTroubleshootingAllowed: true,
      phaseApplyQueueReadAllowed: true,
      diagnosticEvidencePacketAllowed: true,
      repairGuidanceAllowed: true,
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

export function inspectPhaseTroubleshootingLoopV1(config = createDefaultPhaseTroubleshootingLoopV1()) {
  const blockers = [];
  const checks = [];
  const addCheck = (id, passed, message) => {
    checks.push({ id, passed, message });
    if (!passed) blockers.push(message);
  };
  const boundaries = config.boundaries || {};
  const approvalRecord = config.approvalRecord || {};

  addCheck("owner", config.owner === "Tyler Wallace", "Owner must be Tyler Wallace for Phase 100F troubleshooting loop.");
  addCheck("operator-authority", config.operatorAuthorityOwner === "Driana Smith-Wallace", "Operator authority owner must remain Driana Smith-Wallace.");
  addCheck("phase-100e-ready", config.phase100EPhaseApplyQueueReady === true, "Phase 100E phase apply queue must be ready before Phase 100F troubleshooting loop.");
  addCheck("source-apply-queue", config.sourceApplyQueueId === "phase100e-demo-phase-apply-queue", "Phase 100F must link to the Phase 100E apply queue evidence.");
  addCheck("approval", approvalRecord.approved === true && approvalRecord.owner === "Tyler Wallace", "Tyler Wallace approval record is required for Phase 100F troubleshooting loop.");
  addCheck("no-self-approval", approvalRecord.selfApproved === false, "Self-approval is blocked for Phase 100F troubleshooting loop.");

  const stages = Array.isArray(config.phaseFactoryStages) ? config.phaseFactoryStages : [];
  addCheck("stage-count", stages.length === 8, "Phase Factory stage count must be 8.");
  for (const stage of phaseFactoryStages) addCheck(`stage-${stage.phaseId}`, stages.some((candidate) => candidate.phaseId === stage.phaseId), `Phase Factory stage is missing: ${stage.phaseId}`);

  const cases = Array.isArray(config.troubleshootingCases) ? config.troubleshootingCases : [];
  addCheck("troubleshooting-case-count", cases.length === 8, "Phase troubleshooting case count must be 8.");
  cases.forEach((item, index) => {
    const phaseLabel = isNonEmptyString(item.phaseId) ? item.phaseId : `<missing-${index + 1}>`;
    addCheck(`case-phase-id-${index}`, isSafePhaseId(item.phaseId), `Troubleshooting case phaseId must be exact and 100A-100H scoped: ${phaseLabel}`);
    addCheck(`case-source-queue-${index}`, item.sourceApplyQueueId === "phase100e-demo-phase-apply-queue", `Troubleshooting case must preserve Phase 100E source apply queue id: ${phaseLabel}`);
    addCheck(`case-sequence-${index}`, item.sequence === index + 1, `Troubleshooting case sequence must be 1 through 8: ${phaseLabel}`);
    addCheck(`case-status-${index}`, item.caseStatus === "diagnostic-owner-review", `Troubleshooting case must remain diagnostic-owner-review: ${phaseLabel}`);
    addCheck(`case-failed-apply-${index}`, item.failedApplyDetected === true, `Troubleshooting case failedApplyDetected must be true: ${phaseLabel}`);
    addCheck(`case-symptom-${index}`, isNonEmptyString(item.symptomSummary), `Troubleshooting case symptom summary is required: ${phaseLabel}`);
    addCheck(`case-cause-${index}`, isNonEmptyString(item.likelyCauseSummary), `Troubleshooting case likely cause summary is required: ${phaseLabel}`);
    addCheck(`case-repair-guidance-${index}`, isNonEmptyString(item.repairGuidanceDraft), `Troubleshooting case repair guidance draft is required: ${phaseLabel}`);
    addCheck(`case-rollback-${index}`, isNonEmptyString(item.rollbackGuidance), `Troubleshooting case rollback guidance is required: ${phaseLabel}`);
    addCheck(`case-owner-review-${index}`, item.ownerReviewRequired === true, `Troubleshooting case ownerReviewRequired must be true: ${phaseLabel}`);
    addCheck(`case-autofix-blocked-${index}`, item.autoFixAllowed === false, `Troubleshooting case autoFixAllowed must remain false: ${phaseLabel}`);
    addCheck(`case-apply-blocked-${index}`, item.applyExecutionAllowed === false, `Troubleshooting case applyExecutionAllowed must remain false: ${phaseLabel}`);
    addCheck(`case-patch-blocked-${index}`, item.patchExecutionAllowed === false, `Troubleshooting case patchExecutionAllowed must remain false: ${phaseLabel}`);
    addCheck(`case-source-blocked-${index}`, item.sourceMutationAllowed === false, `Troubleshooting case sourceMutationAllowed must remain false: ${phaseLabel}`);
    addCheck(`case-shell-blocked-${index}`, item.shellExecutionAllowed === false, `Troubleshooting case shellExecutionAllowed must remain false: ${phaseLabel}`);
    addCheck(`case-push-blocked-${index}`, item.gitPushAllowed === false, `Troubleshooting case gitPushAllowed must remain false: ${phaseLabel}`);
    addCheck(`case-tag-blocked-${index}`, item.tagCreationAllowed === false, `Troubleshooting case tagCreationAllowed must remain false: ${phaseLabel}`);
    addCheck(`case-autofix-not-executed-${index}`, item.autoFixExecuted === false, `Troubleshooting case autoFixExecuted must remain false: ${phaseLabel}`);
    addCheck(`case-apply-not-executed-${index}`, item.applyExecuted === false, `Troubleshooting case applyExecuted must remain false: ${phaseLabel}`);
    addCheck(`case-patch-not-executed-${index}`, item.patchExecuted === false, `Troubleshooting case patchExecuted must remain false: ${phaseLabel}`);
    addCheck(`case-evidence-${index}`, Array.isArray(item.evidenceLinks) && item.evidenceLinks.length >= 2, `Troubleshooting case evidence links are required: ${phaseLabel}`);
    if (Array.isArray(item.evidenceLinks)) for (const link of item.evidenceLinks) addCheck(`case-evidence-safe-${index}-${link}`, isSafeRelativePath(link), `Troubleshooting evidence link must be safe relative path: ${phaseLabel}`);
    addCheck(`case-validation-${index}`, Array.isArray(item.validationCommandReferences) && item.validationCommandReferences.length >= 4, `Troubleshooting case validation command references are required: ${phaseLabel}`);
  });

  const tracks = Array.isArray(config.roadmapTracks) ? config.roadmapTracks : [];
  addCheck("roadmap-track-count", tracks.length === 13, "Roadmap track count must be 13.");
  for (const track of roadmapTracks) addCheck(`track-${track}`, tracks.includes(track), `Roadmap track is missing: ${track}`);

  const targets = Array.isArray(config.multiLanguageProductionTargets) ? config.multiLanguageProductionTargets : [];
  addCheck("multi-language-count", targets.length === 18, "Multi-language production target count must be 18.");
  for (const language of multiLanguageProductionTargets) addCheck(`language-${language}`, targets.includes(language), `Multi-language production target is missing: ${language}`);

  const expectedBoundaries = {
    phaseTroubleshootingAllowed: true,
    phaseApplyQueueReadAllowed: true,
    diagnosticEvidencePacketAllowed: true,
    repairGuidanceAllowed: true,
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
  };
  for (const [key, expected] of Object.entries(expectedBoundaries)) addCheck(`boundary-${key}`, boundaries[key] === expected, `${key} must remain ${expected}`);
  addCheck("no-project-mutation", config.projectRepoSourceMutated === false, "projectRepoSourceMutated must remain false");
  addCheck("no-real-branch-created", config.realProjectBranchCreated === false, "realProjectBranchCreated must remain false");
  addCheck("no-real-merge-performed", config.realProjectMergePerformed === false, "realProjectMergePerformed must remain false");
  addCheck("no-git-push-performed", config.gitPushPerformed === false, "gitPushPerformed must remain false");
  addCheck("no-tag-created", config.tagCreated === false, "tagCreated must remain false");
  addCheck("no-shell-executed", config.shellExecuted === false, "shellExecuted must remain false");
  addCheck("no-production-deployed", config.productionDeployed === false, "productionDeployed must remain false");
  addCheck("no-autofix-executed", config.autoFixExecuted === false, "autoFixExecuted must remain false");
  addCheck("no-apply-executed", config.applyExecuted === false, "applyExecuted must remain false");
  addCheck("no-patch-executed", config.patchExecuted === false, "patchExecuted must remain false");

  return {
    ok: blockers.length === 0,
    blockers,
    checks,
    declaredFileCount: declaredPaths.length,
    phaseTroubleshootingRequirementCount: phaseTroubleshootingRequirements.length,
    phaseTroubleshootingFieldCount: phaseTroubleshootingFields.length,
    phaseFactoryStageCount: stages.length,
    troubleshootingCaseCount: cases.length,
    roadmapTrackCount: tracks.length,
    multiLanguageProductionTargetCount: targets.length,
    safetyGateCount: 1680,
    phaseTroubleshootingAllowed: boundaries.phaseTroubleshootingAllowed === true,
    phaseApplyQueueReadAllowed: boundaries.phaseApplyQueueReadAllowed === true,
    diagnosticEvidencePacketAllowed: boundaries.diagnosticEvidencePacketAllowed === true,
    repairGuidanceAllowed: boundaries.repairGuidanceAllowed === true,
    autoFixAllowed: boundaries.autoFixAllowed === true,
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
    autoFixExecuted: config.autoFixExecuted === true,
    applyExecuted: config.applyExecuted === true,
    patchExecuted: config.patchExecuted === true,
  };
}

export function runPhaseTroubleshootingLoopV1(config = createDefaultPhaseTroubleshootingLoopV1(), options = {}) {
  const artifactRoot = options.artifactRoot || path.join(process.cwd(), ".sera-phase-troubleshooting-loop");
  const runId = config.phaseTroubleshootingId || "phase100f-demo-phase-troubleshooting-loop";
  const runRoot = path.join(artifactRoot, "troubleshooting-runs", runId);
  fs.mkdirSync(runRoot, { recursive: true });
  const inspection = inspectPhaseTroubleshootingLoopV1(config);
  const generatedAt = new Date().toISOString();
  const validationFailedCount = inspection.ok && config.troubleshootingCases.length === config.expectedTroubleshootingCaseCount ? 0 : 1;
  const troubleshootingPacketProduced = validationFailedCount === 0;
  const status = troubleshootingPacketProduced ? "phase-troubleshooting-loop-ready" : "phase-troubleshooting-loop-validation-failed";
  const diagnosticManifest = {
    phaseTroubleshootingId: runId,
    sourceApplyQueueId: config.sourceApplyQueueId,
    validationFailedCount,
    troubleshootingPacketProduced,
    troubleshootingCaseCount: config.troubleshootingCases.length,
    autoFixAllowed: false,
    applyExecutionAllowed: false,
    patchExecutionAllowed: false,
    projectRepoSourceMutationAllowed: false,
    generatedAt,
  };
  const repairGuidanceManifest = {
    phaseTroubleshootingId: runId,
    owner: config.owner,
    operatorAuthorityOwner: config.operatorAuthorityOwner,
    repairGuidanceAllowed: true,
    ownerReviewRequired: true,
    readyForOwnerReview: troubleshootingPacketProduced,
    autoFixExecuted: false,
    applyExecuted: false,
    patchExecuted: false,
    generatedAt,
  };
  const packet = {
    phaseTroubleshootingId: runId,
    status,
    owner: config.owner,
    operatorAuthorityOwner: config.operatorAuthorityOwner,
    sourcePhase: config.sourcePhase,
    sourceApplyQueueId: config.sourceApplyQueueId,
    phase100EPhaseApplyQueueReady: config.phase100EPhaseApplyQueueReady,
    phaseFactoryStageCount: inspection.phaseFactoryStageCount,
    troubleshootingCaseCount: inspection.troubleshootingCaseCount,
    roadmapTrackCount: inspection.roadmapTrackCount,
    multiLanguageProductionTargetCount: inspection.multiLanguageProductionTargetCount,
    safetyGateCount: inspection.safetyGateCount,
    phaseTroubleshootingAllowed: inspection.phaseTroubleshootingAllowed,
    phaseApplyQueueReadAllowed: inspection.phaseApplyQueueReadAllowed,
    diagnosticEvidencePacketAllowed: inspection.diagnosticEvidencePacketAllowed,
    repairGuidanceAllowed: inspection.repairGuidanceAllowed,
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
    troubleshootingCases: config.troubleshootingCases,
    roadmapTracks: config.roadmapTracks,
    multiLanguageProductionTargets: config.multiLanguageProductionTargets,
    requirements: config.requirements,
    declaredPaths: config.declaredPaths,
    requiredEvidenceTypes: config.requiredEvidenceTypes,
    checks: inspection.checks,
    blockers: inspection.blockers,
    validationFailedCount,
    diagnosticManifest,
    repairGuidanceManifest,
    troubleshootingPacketProduced,
    diagnosticManifestProduced: true,
    repairGuidanceManifestProduced: true,
    readyForOwnerReview: repairGuidanceManifest.readyForOwnerReview,
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
  const packetPath = path.join(runRoot, "phase-troubleshooting-loop.json");
  const diagnosticManifestPath = path.join(runRoot, "diagnostic-manifest.json");
  const repairGuidanceManifestPath = path.join(runRoot, "repair-guidance-manifest.json");
  writeJson(packetPath, packet);
  writeJson(diagnosticManifestPath, diagnosticManifest);
  writeJson(repairGuidanceManifestPath, repairGuidanceManifest);
  return {
    ...inspection,
    ok: troubleshootingPacketProduced,
    phaseTroubleshootingStatus: status,
    validationFailedCount,
    phaseTroubleshootingId: runId,
    sourceApplyQueueId: config.sourceApplyQueueId,
    phase100EPhaseApplyQueueReady: config.phase100EPhaseApplyQueueReady,
    troubleshootingPacketProduced,
    diagnosticManifestProduced: true,
    repairGuidanceManifestProduced: true,
    readyForOwnerReview: repairGuidanceManifest.readyForOwnerReview,
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
    diagnosticManifestPath,
    repairGuidanceManifestPath,
  };
}

export const phaseTroubleshootingLoopV1 = {
  declaredPaths,
  phaseTroubleshootingRequirements,
  phaseTroubleshootingFields,
  phaseFactoryStages,
  roadmapTracks,
  multiLanguageProductionTargets,
  requiredEvidenceTypes,
  createDefaultPhaseTroubleshootingLoopV1,
  inspectPhaseTroubleshootingLoopV1,
  runPhaseTroubleshootingLoopV1,
};
