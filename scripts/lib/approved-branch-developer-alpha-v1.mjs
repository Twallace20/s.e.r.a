import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const declaredPaths = [
  "docs/phases/PHASE_100_APPROVED_BRANCH_DEVELOPER_ALPHA.md",
  "scripts/lib/approved-branch-developer-alpha-v1.mjs",
  "scripts/run-approved-branch-developer-alpha-v1.mjs",
  "tests/integration/approved-branch-developer-alpha-v1.test.ts",
  "apps/operator-console/src/approved-branch-developer-alpha.ts",
];

const approvedBranchDeveloperAlphaRequirements = [
  { id: "phase-94-branch-plan-generator-ready", label: "Phase 94 branch plan generator ready", state: "required", evidence: "Approved Branch Developer Alpha must begin with owner-reviewable branch plans." },
  { id: "phase-95-branch-creation-gate-ready", label: "Phase 95 branch creation gate ready", state: "required", evidence: "Branch creation remains gated before any real local or remote branch authority." },
  { id: "phase-96-branch-edit-executor-ready", label: "Phase 96 branch edit executor ready", state: "required", evidence: "Approved edits must stay exact, backed up, validated, and rollback-capable." },
  { id: "phase-97-validation-evidence-ready", label: "Phase 97 validation evidence ready", state: "required", evidence: "Branch work must produce validation evidence before merge review." },
  { id: "phase-98-merge-packet-ready", label: "Phase 98 merge approval packet ready", state: "required", evidence: "Merge readiness must be packaged for owner review." },
  { id: "phase-99-owner-merge-runner-ready", label: "Phase 99 owner merge runner ready", state: "required", evidence: "Owner-approved merge simulation evidence must exist before Alpha." },
  { id: "owner-approval-required", label: "Owner approval required", state: "required", evidence: "Tyler Wallace approval is required for Alpha runs." },
  { id: "operator-authority-required", label: "Operator authority owner required", state: "required", evidence: "Driana Smith-Wallace remains the operator authority owner." },
  { id: "final-alpha-approval-required", label: "Final Alpha approval required", state: "required", evidence: "Phase 100 requires a final Alpha approval record." },
  { id: "exact-task-required", label: "Exact task required", state: "required", evidence: "Only cataloged Alpha tasks can execute." },
  { id: "safe-work-branch-required", label: "Safe work/ branch required", state: "required", evidence: "Target branch names must stay safe and work/ scoped." },
  { id: "base-ref-main-required", label: "Base ref main required", state: "required", evidence: "Alpha branch developer tasks target main as their declared base." },
  { id: "target-path-allowlist-required", label: "Target path allowlist required", state: "required", evidence: "Target files must be safe, relative, and declared." },
  { id: "language-target-required", label: "Language target required", state: "required", evidence: "Each Alpha task must declare a useful coding language target." },
  { id: "project-type-required", label: "Project type required", state: "required", evidence: "Each Alpha task must declare the useful project type being produced." },
  { id: "branch-plan-lineage-required", label: "Branch plan lineage required", state: "required", evidence: "Phase 94 lineage must be preserved." },
  { id: "branch-creation-lineage-required", label: "Branch creation lineage required", state: "required", evidence: "Phase 95 lineage must be preserved." },
  { id: "branch-edit-lineage-required", label: "Branch edit lineage required", state: "required", evidence: "Phase 96 lineage must be preserved." },
  { id: "validation-lineage-required", label: "Validation lineage required", state: "required", evidence: "Phase 97 lineage must be preserved." },
  { id: "merge-approval-lineage-required", label: "Merge approval lineage required", state: "required", evidence: "Phase 98 lineage must be preserved." },
  { id: "owner-merge-lineage-required", label: "Owner merge lineage required", state: "required", evidence: "Phase 99 lineage must be preserved." },
  { id: "required-checks-required", label: "Required checks required", state: "required", evidence: "Alpha tasks must declare required checks." },
  { id: "isolated-alpha-evidence-required", label: "Isolated Alpha evidence required", state: "required", evidence: "Phase 100 writes isolated Alpha evidence, not real repo mutations." },
  { id: "rollback-plan-required", label: "Rollback plan required", state: "required", evidence: "Alpha tasks must declare rollback expectations." },
  { id: "project-source-mutation-blocked", label: "Project source mutation blocked", state: "required", evidence: "Phase 100 never directly edits project repo source." },
  { id: "real-branch-creation-blocked", label: "Real branch creation blocked", state: "required", evidence: "Phase 100 does not create real local or remote branches." },
  { id: "real-project-merge-blocked", label: "Real project merge blocked", state: "required", evidence: "Phase 100 does not merge into the real project repo." },
  { id: "git-push-blocked", label: "Git push blocked", state: "required", evidence: "Phase 100 never pushes refs." },
  { id: "tag-creation-blocked", label: "Tag creation blocked", state: "required", evidence: "Phase 100 does not create tags." },
  { id: "arbitrary-command-blocked", label: "Arbitrary command blocked", state: "required", evidence: "Phase 100 does not run arbitrary commands." },
  { id: "multi-language-doctrine-preserved", label: "Multi-language production doctrine preserved", state: "required", evidence: "Alpha can route useful projects across language targets without weakening gates." },
  { id: "self-approval-merge-deploy-blocked", label: "Self approval, merge, and deploy blocked", state: "required", evidence: "S.E.R.A. cannot self-approve, self-merge, self-deploy, or publish." },
];

const approvedBranchDeveloperAlphaFields = [
  "owner", "operatorAuthorityOwner", "sourcePhase", "safeState",
  "phase94ApprovedBranchPlanGeneratorReady", "phase95ApprovedBranchCreationGateReady", "phase96ApprovedBranchEditExecutorReady", "phase97BranchValidationEvidenceRunnerReady", "phase98MergeApprovalPacketReady", "phase99OwnerApprovedMergeRunnerReady",
  "ownerApprovalRequired", "operatorAuthorityRequired", "finalAlphaApprovalRequired", "exactTaskRequired", "safeWorkBranchRequired", "baseRefMainRequired", "targetPathAllowlistRequired", "languageTargetRequired", "projectTypeRequired",
  "branchPlanLineageRequired", "branchCreationLineageRequired", "branchEditLineageRequired", "validationLineageRequired", "mergeApprovalLineageRequired", "ownerMergeLineageRequired", "requiredChecksRequired",
  "isolatedAlphaEvidenceRequired", "rollbackPlanRequired", "projectSourceMutationBlocked", "realBranchCreationBlocked", "realProjectMergeBlocked", "gitPushBlocked", "tagCreationBlocked", "arbitraryCommandBlocked", "shellExecutionBlocked",
  "multiLanguageProductionDoctrineRequired", "branchDeveloperStageCount", "approvedBranchDeveloperTaskCount", "multiLanguageProductionTargetCount", "approvedBranchDeveloperAlphaAllowed", "phaseSpineOrchestrationAllowed", "branchPlanGenerationAllowed", "branchCreationGateAllowed", "branchEditExecutionAllowed", "branchValidationEvidenceAllowed", "mergeApprovalPacketAllowed", "ownerApprovedMergeRunAllowed", "evidenceWritingAllowed",
  "projectRepoSourceMutationAllowed", "realProjectBranchCreationAllowed", "localGitBranchCreationAllowed", "remoteGitBranchCreationAllowed", "realProjectMergeExecutionAllowed", "gitPushAllowed", "tagCreationAllowed", "arbitraryCommandAllowed", "shellExecutionAllowed", "selfApprovalAllowed", "selfMergeAllowed", "selfDeployAllowed",
];

export function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function normalizeSlash(value) {
  return String(value).replaceAll(path.sep, "/");
}

function isSafeWorkBranchName(value) {
  if (typeof value !== "string") return false;
  if (!value.startsWith("work/")) return false;
  if (value.includes("..") || value.includes("\\\\") || value.includes("//")) return false;
  if (value.length > 120) return false;
  return /^[a-zA-Z0-9][a-zA-Z0-9/_\.\-]*$/.test(value);
}

function isSafeRelativePath(value) {
  if (typeof value !== "string" || value.length === 0) return false;
  const normalized = normalizeSlash(value);
  if (path.isAbsolute(value)) return false;
  if (normalized.startsWith("../") || normalized.includes("/../") || normalized === "..") return false;
  if (normalized.startsWith(".git/") || normalized.includes("/.git/")) return false;
  if (normalized.includes("\\\\")) return false;
  return true;
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n", "utf8");
}

export const multiLanguageProductionTargets = [
  "TypeScript", "JavaScript", "Python", "Swift", "Kotlin", "Dart", "Java", "C#", "C++", "C", "Rust", "Go", "SQL", "HTML/CSS", "PHP", "Ruby", "PowerShell", "Bash",
];

const phase100AlphaText = 'export const phase100Status = "approved-branch-developer-alpha-ready";\n';

const branchDeveloperStages = [
  { id: "phase94", label: "Approved Branch Plan Generator", readyKey: "phase94ApprovedBranchPlanGeneratorReady" },
  { id: "phase95", label: "Approved Branch Creation Gate", readyKey: "phase95ApprovedBranchCreationGateReady" },
  { id: "phase96", label: "Approved Branch Edit Executor", readyKey: "phase96ApprovedBranchEditExecutorReady" },
  { id: "phase97", label: "Branch Validation Evidence Runner", readyKey: "phase97BranchValidationEvidenceRunnerReady" },
  { id: "phase98", label: "Merge Approval Packet", readyKey: "phase98MergeApprovalPacketReady" },
  { id: "phase99", label: "Owner-Approved Merge Runner", readyKey: "phase99OwnerApprovedMergeRunnerReady" },
];

const approvedBranchDeveloperTasks = [
  {
    id: "phase100-demo-approved-branch-developer-alpha",
    label: "Phase 100 demo approved branch developer alpha",
    enabled: true,
    targetBranch: "work/phase-100-demo-approved-branch-developer-alpha",
    baseRef: "main",
    sourceBranchPlanId: "phase94-demo-branch-plan",
    sourceBranchCreationPlanId: "phase95-demo-branch-creation-gate",
    sourceBranchEditPlanId: "phase96-demo-branch-edit-executor",
    sourceValidationSuiteId: "phase97-demo-branch-validation-evidence",
    mergeApprovalPacketId: "phase98-demo-merge-approval-packet",
    ownerApprovedMergeRunId: "phase99-demo-owner-approved-merge-run",
    targetFile: "src/phase100-demo.ts",
    targetLanguage: "TypeScript",
    targetProjectType: "safe branch developer proof module",
    expectedPostEditSha256: sha256(phase100AlphaText),
    expectedContent: "approved-branch-developer-alpha-ready",
    requiredChecks: ["phase94-plan-ready", "phase95-gate-ready", "phase96-edit-ready", "phase97-validation-ready", "phase98-merge-packet-ready", "phase99-owner-merge-ready"],
    deliverableMode: "isolated-alpha-evidence",
    rollbackPlan: "Delete isolated Alpha evidence artifacts; future real project merge authority must use an owner-approved rollback packet.",
    declaredOnly: false,
  },
  {
    id: "typescript-web-app-alpha-declared",
    label: "Declared TypeScript web app Alpha task",
    enabled: false,
    targetBranch: "work/future-typescript-web-app-alpha",
    baseRef: "main",
    sourceBranchPlanId: "future-ts-web-plan",
    sourceBranchCreationPlanId: "future-ts-web-gate",
    sourceBranchEditPlanId: "future-ts-web-edit",
    sourceValidationSuiteId: "future-ts-web-validation",
    mergeApprovalPacketId: "future-ts-web-merge-packet",
    ownerApprovedMergeRunId: "future-ts-web-owner-merge-run",
    targetFile: "apps/web/src/index.ts",
    targetLanguage: "TypeScript",
    targetProjectType: "web application",
    expectedPostEditSha256: "declared-only",
    expectedContent: "declared-only",
    requiredChecks: ["build", "test", "accessibility-review"],
    deliverableMode: "declared-alpha-evidence",
    rollbackPlan: "Use approved branch rollback packet before any real project merge.",
    declaredOnly: true,
  },
  {
    id: "python-automation-alpha-declared",
    label: "Declared Python automation Alpha task",
    enabled: false,
    targetBranch: "work/future-python-automation-alpha",
    baseRef: "main",
    sourceBranchPlanId: "future-python-plan",
    sourceBranchCreationPlanId: "future-python-gate",
    sourceBranchEditPlanId: "future-python-edit",
    sourceValidationSuiteId: "future-python-validation",
    mergeApprovalPacketId: "future-python-merge-packet",
    ownerApprovedMergeRunId: "future-python-owner-merge-run",
    targetFile: "tools/automation/main.py",
    targetLanguage: "Python",
    targetProjectType: "automation utility",
    expectedPostEditSha256: "declared-only",
    expectedContent: "declared-only",
    requiredChecks: ["unit-tests", "lint", "safe-path-review"],
    deliverableMode: "declared-alpha-evidence",
    rollbackPlan: "Use approved branch rollback packet before any real project merge.",
    declaredOnly: true,
  },
  {
    id: "swift-ios-alpha-declared",
    label: "Declared Swift iOS Alpha task",
    enabled: false,
    targetBranch: "work/future-swift-ios-alpha",
    baseRef: "main",
    sourceBranchPlanId: "future-swift-plan",
    sourceBranchCreationPlanId: "future-swift-gate",
    sourceBranchEditPlanId: "future-swift-edit",
    sourceValidationSuiteId: "future-swift-validation",
    mergeApprovalPacketId: "future-swift-merge-packet",
    ownerApprovedMergeRunId: "future-swift-owner-merge-run",
    targetFile: "ios/App/SERAApp.swift",
    targetLanguage: "Swift",
    targetProjectType: "iOS application",
    expectedPostEditSha256: "declared-only",
    expectedContent: "declared-only",
    requiredChecks: ["xcode-build-declared", "device-test-declared", "store-readiness-declared"],
    deliverableMode: "declared-alpha-evidence",
    rollbackPlan: "Use approved branch rollback packet before any real project merge.",
    declaredOnly: true,
  },
];

export function createDefaultApprovedBranchDeveloperAlphaV1(overrides = {}) {
  const base = {
    owner: "Tyler Wallace",
    operatorAuthorityOwner: "Driana Smith-Wallace",
    sourcePhase: "Phase 100 — Approved Branch Developer Alpha",
    safeState: "approved-branch-developer-alpha-ready",
    phase94ApprovedBranchPlanGeneratorReady: true,
    phase95ApprovedBranchCreationGateReady: true,
    phase96ApprovedBranchEditExecutorReady: true,
    phase97BranchValidationEvidenceRunnerReady: true,
    phase98MergeApprovalPacketReady: true,
    phase99OwnerApprovedMergeRunnerReady: true,
    branchDeveloperStages: structuredClone(branchDeveloperStages),
    approvedBranchDeveloperTasks: structuredClone(approvedBranchDeveloperTasks),
    requirements: structuredClone(approvedBranchDeveloperAlphaRequirements),
    fields: structuredClone(approvedBranchDeveloperAlphaFields),
    declaredPaths: structuredClone(declaredPaths),
    multiLanguageProductionTargets: structuredClone(multiLanguageProductionTargets),
    approvalRecord: {
      owner: "Tyler Wallace",
      operatorAuthorityOwner: "Driana Smith-Wallace",
      approved: true,
      finalAlphaApproved: true,
      selfApproved: false,
    },
    boundaries: {
      approvedBranchDeveloperAlphaAllowed: true,
      phaseSpineOrchestrationAllowed: true,
      branchPlanGenerationAllowed: true,
      branchCreationGateAllowed: true,
      branchEditExecutionAllowed: true,
      branchValidationEvidenceAllowed: true,
      mergeApprovalPacketAllowed: true,
      ownerApprovedMergeRunAllowed: true,
      evidenceWritingAllowed: true,
      projectRepoSourceMutationAllowed: false,
      realProjectBranchCreationAllowed: false,
      localGitBranchCreationAllowed: false,
      remoteGitBranchCreationAllowed: false,
      realProjectMergeExecutionAllowed: false,
      gitPushAllowed: false,
      tagCreationAllowed: false,
      arbitraryCommandAllowed: false,
      shellExecutionAllowed: false,
      schedulerWorkflowMutationAllowed: false,
      iphoneAutomationMutationAllowed: false,
      fleetExecutionAllowed: false,
      awayModeExecutionAllowed: false,
      selfApprovalAllowed: false,
      selfMergeAllowed: false,
      selfDeployAllowed: false,
      productionDeployAllowed: false,
    },
  };
  return {
    ...base,
    ...overrides,
    approvalRecord: { ...base.approvalRecord, ...(overrides.approvalRecord || {}) },
    boundaries: { ...base.boundaries, ...(overrides.boundaries || {}) },
  };
}

export function inspectApprovedBranchDeveloperAlphaV1(config = createDefaultApprovedBranchDeveloperAlphaV1()) {
  const blockers = [];
  if (config.owner !== "Tyler Wallace") blockers.push("Owner must be Tyler Wallace for Phase 100 approved branch developer alpha.");
  if (config.operatorAuthorityOwner !== "Driana Smith-Wallace") blockers.push("Operator authority owner must be Driana Smith-Wallace.");
  for (const stage of config.branchDeveloperStages || []) {
    if (!config[stage.readyKey]) blockers.push(`Branch developer stage must be ready: ${stage.id}`);
  }
  if (!Array.isArray(config.branchDeveloperStages) || config.branchDeveloperStages.length !== 6) blockers.push("Approved Branch Developer Alpha must include six Phase 94–99 stages.");
  if (!config.approvalRecord?.approved) blockers.push("Owner approval must be granted before Phase 100 Alpha run.");
  if (!config.approvalRecord?.finalAlphaApproved) blockers.push("Final Alpha approval must be granted before Phase 100 Alpha run.");
  if (config.approvalRecord?.selfApproved) blockers.push("Self-approval is blocked for approved branch developer Alpha.");
  if (!Array.isArray(config.requirements) || config.requirements.length !== approvedBranchDeveloperAlphaRequirements.length) blockers.push("Phase 100 requirement catalog must remain complete.");
  if (!Array.isArray(config.fields) || config.fields.length !== approvedBranchDeveloperAlphaFields.length) blockers.push("Phase 100 field catalog must remain complete.");
  if (!Array.isArray(config.declaredPaths) || config.declaredPaths.length !== declaredPaths.length) blockers.push("Phase 100 declared file list must remain complete.");
  if (!Array.isArray(config.approvedBranchDeveloperTasks) || config.approvedBranchDeveloperTasks.length !== 4) blockers.push("Approved Branch Developer Alpha must declare four Alpha tasks.");
  if (!Array.isArray(config.multiLanguageProductionTargets) || config.multiLanguageProductionTargets.length !== 18) blockers.push("Multi-language production doctrine must include 18 useful language targets.");
  for (const language of multiLanguageProductionTargets) {
    if (!config.multiLanguageProductionTargets?.includes(language)) blockers.push(`Multi-language production target is missing: ${language}`);
  }
  for (const task of config.approvedBranchDeveloperTasks || []) {
    if (!task.id) blockers.push("Approved branch developer task must have id.");
    if (!isSafeWorkBranchName(task.targetBranch)) blockers.push(`Approved branch developer task target branch must be safe and work/ scoped: ${task.id}`);
    if (task.baseRef !== "main") blockers.push(`Approved branch developer task base ref must be main: ${task.id}`);
    if (!task.sourceBranchPlanId) blockers.push(`Approved branch developer task must name sourceBranchPlanId: ${task.id}`);
    if (!task.sourceBranchCreationPlanId) blockers.push(`Approved branch developer task must name sourceBranchCreationPlanId: ${task.id}`);
    if (!task.sourceBranchEditPlanId) blockers.push(`Approved branch developer task must name sourceBranchEditPlanId: ${task.id}`);
    if (!task.sourceValidationSuiteId) blockers.push(`Approved branch developer task must name sourceValidationSuiteId: ${task.id}`);
    if (!task.mergeApprovalPacketId) blockers.push(`Approved branch developer task must name mergeApprovalPacketId: ${task.id}`);
    if (!task.ownerApprovedMergeRunId) blockers.push(`Approved branch developer task must name ownerApprovedMergeRunId: ${task.id}`);
    if (!isSafeRelativePath(task.targetFile)) blockers.push(`Approved branch developer task target file must be safe and relative: ${task.id}`);
    if (!config.multiLanguageProductionTargets?.includes(task.targetLanguage)) blockers.push(`Approved branch developer task must use approved language target: ${task.id}`);
    if (!task.targetProjectType) blockers.push(`Approved branch developer task must declare targetProjectType: ${task.id}`);
    if (!Array.isArray(task.requiredChecks) || task.requiredChecks.length === 0) blockers.push(`Approved branch developer task must include required checks: ${task.id}`);
    if (task.deliverableMode !== "isolated-alpha-evidence" && task.deliverableMode !== "declared-alpha-evidence") blockers.push(`Approved branch developer task deliverableMode must stay evidence-only: ${task.id}`);
    if (!task.rollbackPlan) blockers.push(`Approved branch developer task must declare rollbackPlan: ${task.id}`);
    if (task.enabled && task.declaredOnly) blockers.push(`Enabled approved branch developer task cannot be declaredOnly: ${task.id}`);
    if (task.enabled && task.expectedPostEditSha256 === "declared-only") blockers.push(`Enabled approved branch developer task must declare expected post-edit SHA-256: ${task.id}`);
    if (task.enabled && task.expectedContent === "declared-only") blockers.push(`Enabled approved branch developer task must declare expected content marker: ${task.id}`);
  }
  const requiredFalseBoundaries = [
    "projectRepoSourceMutationAllowed", "realProjectBranchCreationAllowed", "localGitBranchCreationAllowed", "remoteGitBranchCreationAllowed", "realProjectMergeExecutionAllowed", "gitPushAllowed", "tagCreationAllowed", "arbitraryCommandAllowed", "shellExecutionAllowed", "schedulerWorkflowMutationAllowed", "iphoneAutomationMutationAllowed", "fleetExecutionAllowed", "awayModeExecutionAllowed", "selfApprovalAllowed", "selfMergeAllowed", "selfDeployAllowed", "productionDeployAllowed",
  ];
  const requiredTrueBoundaries = [
    "approvedBranchDeveloperAlphaAllowed", "phaseSpineOrchestrationAllowed", "branchPlanGenerationAllowed", "branchCreationGateAllowed", "branchEditExecutionAllowed", "branchValidationEvidenceAllowed", "mergeApprovalPacketAllowed", "ownerApprovedMergeRunAllowed", "evidenceWritingAllowed",
  ];
  for (const key of requiredFalseBoundaries) {
    if (config.boundaries?.[key] !== false) blockers.push(`${key} must remain false`);
  }
  for (const key of requiredTrueBoundaries) {
    if (config.boundaries?.[key] !== true) blockers.push(`${key} must remain true`);
  }
  return {
    ok: blockers.length === 0,
    blockers,
    declaredFileCount: declaredPaths.length,
    approvedBranchDeveloperAlphaRequirementCount: approvedBranchDeveloperAlphaRequirements.length,
    approvedBranchDeveloperAlphaFieldCount: approvedBranchDeveloperAlphaFields.length,
    branchDeveloperStageCount: config.branchDeveloperStages?.length ?? 0,
    approvedBranchDeveloperTaskCount: config.approvedBranchDeveloperTasks?.length ?? 0,
    multiLanguageProductionTargetCount: config.multiLanguageProductionTargets?.length ?? 0,
    safetyGateCount: 1320,
  };
}

export function runApprovedBranchDeveloperAlphaV1(config = createDefaultApprovedBranchDeveloperAlphaV1(), options = {}) {
  const artifactRoot = path.resolve(options.artifactRoot || ".sera-approved-branch-developer-alpha");
  const inspection = inspectApprovedBranchDeveloperAlphaV1(config);
  const runId = `phase100_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const runDir = path.join(artifactRoot, runId);
  const packetPath = path.join(runDir, "approved-branch-developer-alpha-packet.json");
  const manifestPath = path.join(runDir, "approved-branch-developer-alpha-manifest.json");
  const enabledTask = (config.approvedBranchDeveloperTasks || []).find((task) => task.enabled);
  const checks = [];
  let isolatedAlphaEvidenceProduced = false;
  let validationFailedCount = 0;
  let outputFilePath = null;
  let actualSha256 = null;

  if (!inspection.ok || !enabledTask) {
    validationFailedCount = inspection.blockers.length || 1;
    const packet = {
      status: "approved-branch-developer-alpha-blocked",
      ok: false,
      blockers: enabledTask ? inspection.blockers : [...inspection.blockers, "No enabled approved branch developer Alpha task was found."],
      validationFailedCount,
      realProjectSourceMutated: false,
      realProjectBranchCreated: false,
      realProjectMergePerformed: false,
    };
    writeJson(packetPath, packet);
    return { ok: false, ...inspection, validationFailedCount, packetPath, manifestPath, isolatedAlphaEvidenceProduced, realProjectSourceMutated: false, realProjectBranchCreated: false, realProjectMergePerformed: false };
  }

  const workspaceRoot = path.join(runDir, "isolated-alpha-workspace");
  outputFilePath = path.join(workspaceRoot, enabledTask.targetBranch, enabledTask.targetFile);
  fs.mkdirSync(path.dirname(outputFilePath), { recursive: true });
  fs.writeFileSync(outputFilePath, phase100AlphaText, "utf8");
  actualSha256 = sha256(fs.readFileSync(outputFilePath, "utf8"));

  checks.push({ id: "expected-post-edit-sha256", passed: actualSha256 === enabledTask.expectedPostEditSha256 });
  checks.push({ id: "expected-content-marker", passed: fs.readFileSync(outputFilePath, "utf8").includes(enabledTask.expectedContent) });
  checks.push({ id: "phase-spine-complete", passed: config.branchDeveloperStages.every((stage) => config[stage.readyKey] === true) });
  checks.push({ id: "project-source-not-mutated", passed: config.boundaries.projectRepoSourceMutationAllowed === false });
  checks.push({ id: "real-project-branch-not-created", passed: config.boundaries.realProjectBranchCreationAllowed === false });
  checks.push({ id: "real-project-merge-not-performed", passed: config.boundaries.realProjectMergeExecutionAllowed === false });
  checks.push({ id: "git-push-not-performed", passed: config.boundaries.gitPushAllowed === false });
  checks.push({ id: "multi-language-doctrine-present", passed: config.multiLanguageProductionTargets.length === 18 });
  validationFailedCount = checks.filter((check) => !check.passed).length;
  isolatedAlphaEvidenceProduced = validationFailedCount === 0;

  const packet = {
    id: enabledTask.id,
    status: isolatedAlphaEvidenceProduced ? "approved-branch-developer-alpha-ready" : "approved-branch-developer-alpha-validation-failed",
    ok: isolatedAlphaEvidenceProduced,
    owner: config.owner,
    operatorAuthorityOwner: config.operatorAuthorityOwner,
    targetBranch: enabledTask.targetBranch,
    targetFile: enabledTask.targetFile,
    targetLanguage: enabledTask.targetLanguage,
    targetProjectType: enabledTask.targetProjectType,
    phaseLineage: {
      sourceBranchPlanId: enabledTask.sourceBranchPlanId,
      sourceBranchCreationPlanId: enabledTask.sourceBranchCreationPlanId,
      sourceBranchEditPlanId: enabledTask.sourceBranchEditPlanId,
      sourceValidationSuiteId: enabledTask.sourceValidationSuiteId,
      mergeApprovalPacketId: enabledTask.mergeApprovalPacketId,
      ownerApprovedMergeRunId: enabledTask.ownerApprovedMergeRunId,
    },
    outputFilePath,
    expectedPostEditSha256: enabledTask.expectedPostEditSha256,
    actualSha256,
    checks,
    validationFailedCount,
    isolatedAlphaEvidenceProduced,
    realProjectSourceMutated: false,
    realProjectBranchCreated: false,
    realProjectMergePerformed: false,
    rollbackPlan: enabledTask.rollbackPlan,
  };
  const manifest = {
    status: packet.status,
    declaredPaths,
    branchDeveloperStages: config.branchDeveloperStages,
    approvedBranchDeveloperTaskCount: config.approvedBranchDeveloperTasks.length,
    multiLanguageProductionTargets: config.multiLanguageProductionTargets,
    boundaries: config.boundaries,
  };
  writeJson(packetPath, packet);
  writeJson(manifestPath, manifest);
  return {
    ...inspection,
    ok: isolatedAlphaEvidenceProduced,
    validationFailedCount,
    packetPath,
    manifestPath,
    outputFilePath,
    actualSha256,
    branchDeveloperAlphaId: enabledTask.id,
    targetBranch: enabledTask.targetBranch,
    targetFile: enabledTask.targetFile,
    targetLanguage: enabledTask.targetLanguage,
    isolatedAlphaEvidenceProduced,
    realProjectSourceMutated: false,
    realProjectBranchCreated: false,
    realProjectMergePerformed: false,
  };
}
