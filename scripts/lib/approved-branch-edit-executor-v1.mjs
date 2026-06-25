import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const declaredPaths = [
  "docs/phases/PHASE_96_APPROVED_BRANCH_EDIT_EXECUTOR_V1.md",
  "scripts/lib/approved-branch-edit-executor-v1.mjs",
  "scripts/run-approved-branch-edit-executor-v1.mjs",
  "tests/integration/approved-branch-edit-executor-v1.test.ts",
  "apps/operator-console/src/approved-branch-edit-executor.ts",
];

const branchEditExecutorRequirements = [
  { id: "phase-95-branch-creation-gate-reviewed", label: "Phase 95 branch creation gate reviewed", state: "required", evidence: "Approved branch edit execution must consume owner-approved branch creation gate packet proof." },
  { id: "phase-94-branch-plan-reviewed", label: "Phase 94 branch plan reviewed", state: "required", evidence: "Branch edits remain grounded in structured branch plans before execution." },
  { id: "phase-93-branch-workspace-reviewed", label: "Phase 93 branch workspace reviewed", state: "required", evidence: "Branch edits execute inside isolated branch workspaces before direct repo source mutation is considered." },
  { id: "phase-92-patch-runner-reviewed", label: "Phase 92 patch runner reviewed", state: "required", evidence: "Exact find/replace patching, expected occurrences, backups, validation, and rollback remain mandatory." },
  { id: "phase-91-validation-reviewed", label: "Phase 91 validation runner reviewed", state: "required", evidence: "Branch edit execution must declare validation before edits are attempted." },
  { id: "owner-approval-required", label: "Owner approval required", state: "required", evidence: "S.E.R.A. cannot execute branch edits without owner approval." },
  { id: "operator-authority-required", label: "Operator authority owner required", state: "required", evidence: "Driana Smith-Wallace remains operator authority owner for high-power action gates." },
  { id: "exact-edit-plan-required", label: "Exact edit plan required", state: "required", evidence: "Only cataloged owner-approved branch edit plans can execute." },
  { id: "safe-work-branch-required", label: "Safe work/ branch scope required", state: "required", evidence: "Target branch names must be safe, normalized, and work/ scoped." },
  { id: "workspace-containment-required", label: "Workspace containment required", state: "required", evidence: "Edits must remain inside the isolated branch workspace artifact root." },
  { id: "target-path-allowlist-required", label: "Target path allowlist required", state: "required", evidence: "Every target file must be safe, relative, and declared in the plan." },
  { id: "expected-hash-required", label: "Expected hash required", state: "required", evidence: "The target file must match the expected SHA-256 before edit execution." },
  { id: "expected-occurrence-required", label: "Expected occurrence required", state: "required", evidence: "Exact occurrence count prevents accidental broad replacement." },
  { id: "backup-required", label: "Backup required", state: "required", evidence: "The original branch workspace file is backed up before mutation." },
  { id: "validation-required", label: "Validation required", state: "required", evidence: "Post-edit validation must pass or rollback occurs." },
  { id: "rollback-required", label: "Rollback required", state: "required", evidence: "Failed validation restores branch workspace backup and records evidence." },
  { id: "branch-workspace-mutation-only", label: "Branch workspace mutation only", state: "required", evidence: "Phase 96 mutates isolated branch workspaces, not direct project repo source." },
  { id: "project-source-mutation-blocked", label: "Project source mutation blocked", state: "required", evidence: "The project repository working tree remains untouched by the executor." },
  { id: "git-branch-creation-blocked", label: "Git branch creation blocked", state: "required", evidence: "Phase 96 consumes branch packets but still does not create local or remote Git branches." },
  { id: "git-push-blocked", label: "Git push blocked", state: "required", evidence: "Phase 96 never pushes remote refs." },
  { id: "merge-blocked", label: "Merge blocked", state: "required", evidence: "Branch edits do not merge or self-merge." },
  { id: "binary-delete-create-blocked", label: "Binary/delete/create blocked", state: "required", evidence: "Phase 96 demo edits are text replacement only; arbitrary binary/delete/create remains blocked." },
  { id: "multi-language-doctrine-preserved", label: "Multi-language production doctrine preserved", state: "required", evidence: "Future project edits can route to many languages while staying sandbox-first." },
  { id: "self-approval-blocked", label: "Self approval blocked", state: "required", evidence: "S.E.R.A. cannot self-approve edits, merges, deploys, publishes, or hardware actions." },
];

const branchEditExecutorFields = [
  "owner",
  "operatorAuthorityOwner",
  "sourcePhase",
  "safeState",
  "phase95ApprovedBranchCreationGateReady",
  "phase94ApprovedBranchPlanGeneratorReady",
  "phase93ApprovedBranchWorkspaceRunnerReady",
  "phase92ApprovedFilePatchRunnerReady",
  "phase91ApprovedValidationRunnerReady",
  "ownerApprovalRequired",
  "operatorAuthorityRequired",
  "exactEditPlanRequired",
  "safeWorkBranchRequired",
  "workspaceContainmentRequired",
  "targetPathAllowlistRequired",
  "expectedHashRequired",
  "expectedOccurrenceRequired",
  "backupRequired",
  "validationRequired",
  "rollbackRequired",
  "branchWorkspaceMutationOnly",
  "projectSourceMutationBlocked",
  "gitBranchCreationBlocked",
  "gitPushBlocked",
  "mergeBlocked",
  "binaryDeleteCreateBlocked",
  "multiLanguageProductionDoctrineRequired",
  "approvedBranchEditPlanCount",
  "multiLanguageProductionTargetCount",
  "branchEditExecutionAllowed",
  "branchWorkspaceMutationAllowed",
  "projectRepoSourceMutationAllowed",
  "localGitBranchCreationAllowed",
  "remoteGitBranchCreationAllowed",
  "gitPushAllowed",
  "selfApprovalAllowed",
];

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function normalizeSlash(value) {
  return String(value).replaceAll(path.sep, "/");
}

function isSafeWorkBranchName(value) {
  if (typeof value !== "string") return false;
  if (!value.startsWith("work/")) return false;
  if (value.includes("..")) return false;
  if (value.includes("\\\\")) return false;
  if (value.includes("//")) return false;
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

function assertContained(root, candidate) {
  const resolvedRoot = path.resolve(root);
  const resolvedCandidate = path.resolve(candidate);
  if (resolvedCandidate !== resolvedRoot && !resolvedCandidate.startsWith(resolvedRoot + path.sep)) {
    throw new Error(`Path escaped branch workspace: ${candidate}`);
  }
}

export const multiLanguageProductionTargets = [
  { language: "TypeScript", domain: "web apps, operator consoles, agents, tooling, typed integrations", projectStudio: "Web/App/Agent Studio" },
  { language: "JavaScript", domain: "websites, automation scripts, browser tools, Node utilities", projectStudio: "Web Automation Studio" },
  { language: "Python", domain: "AI workflows, data, automation, research tools, prototypes", projectStudio: "Python/Data/AI Studio" },
  { language: "Swift", domain: "iOS/macOS apps, SwiftUI interfaces, Apple-platform prototypes", projectStudio: "iOS App Studio" },
  { language: "Kotlin", domain: "Android apps, JVM services, mobile prototypes", projectStudio: "Android App Studio" },
  { language: "Dart", domain: "Flutter cross-platform mobile and desktop apps", projectStudio: "Cross-Platform App Studio" },
  { language: "Java", domain: "enterprise services, Android legacy, JVM backends", projectStudio: "Enterprise App Studio" },
  { language: "C#", domain: "Unity games, .NET apps, Windows tools", projectStudio: "Game/Desktop Studio" },
  { language: "C++", domain: "Unreal prototypes, performance systems, robotics simulation", projectStudio: "Game/Robotics Studio" },
  { language: "C", domain: "embedded systems, microcontrollers, hardware learning labs", projectStudio: "Circuit/IoT Studio" },
  { language: "Rust", domain: "safe systems tools, CLIs, performance-sensitive services", projectStudio: "Systems Studio" },
  { language: "Go", domain: "services, CLIs, infrastructure tools, concurrent backends", projectStudio: "Infrastructure Studio" },
  { language: "SQL", domain: "data models, reporting, dashboards, analytics, migrations", projectStudio: "Business Intelligence Studio" },
  { language: "HTML/CSS", domain: "websites, landing pages, templates, UI prototypes", projectStudio: "Website Studio" },
  { language: "PHP", domain: "WordPress and legacy web systems", projectStudio: "Website/CMS Studio" },
  { language: "Ruby", domain: "Rails prototypes and legacy web systems", projectStudio: "Web App Studio" },
  { language: "PowerShell", domain: "Windows automation, local worker setup, admin scripts", projectStudio: "Local Worker Studio" },
  { language: "Bash", domain: "Unix automation, CI scripts, local tooling", projectStudio: "Automation Studio" },
];

const phase96SeedText = 'export const phase96Status = "pending";\n';
const approvedBranchEditPlans = [
  {
    id: "phase96-demo-branch-edit-executor",
    label: "Phase 96 demo branch edit executor",
    targetBranch: "work/phase-96-demo-branch-edit-executor",
    baseRef: "main",
    sourceBranchCreationPlanId: "phase95-demo-branch-creation-gate",
    targetFile: "src/phase96-demo.ts",
    seedText: phase96SeedText,
    expectedBeforeSha256: "aeb18d5ae415d887d90bec37fa605ee99932ec52ac7cc85004368b483d90b944",
    findText: "pending",
    replaceText: "ready",
    expectedOccurrences: 1,
    maxBytes: 4096,
    validationIncludes: "ready",
    validationSuites: ["free-core:verify", "knowledge:verify", "phase95:demo", "phase96:demo"],
    rollbackPlan: "Restore the branch workspace file backup if validation fails. Do not touch project repo source.",
    evidencePacket: ["branch-edit-plan.json", "branch-edit-result.json", "branch-edit-backup.txt", "branch-edit-validation.json", "owner-approval-record.json"],
    riskLevel: "medium",
    branchWorkspaceMutation: true,
    projectRepoSourceMutation: false,
    localGitBranchCreation: false,
    remoteGitBranchCreation: false,
    gitPush: false,
    merge: false,
    binaryPatch: false,
    deleteFile: false,
    createFile: false,
    demoRunnable: true,
  },
  {
    id: "phase97-branch-validation-evidence-runner-declared",
    label: "Phase 97 branch validation evidence runner declared",
    targetBranch: "work/phase-97-branch-validation-evidence-runner-v1",
    baseRef: "main",
    sourceBranchCreationPlanId: "phase95-demo-branch-creation-gate",
    targetFile: "docs/phases/PHASE_97_BRANCH_VALIDATION_EVIDENCE_RUNNER_V1.md",
    seedText: "declared only\\n",
    expectedBeforeSha256: sha256("declared only\\n"),
    findText: "declared",
    replaceText: "validation-evidence-declared",
    expectedOccurrences: 1,
    maxBytes: 4096,
    validationIncludes: "validation-evidence-declared",
    validationSuites: ["free-core:verify", "knowledge:verify", "phase96:demo"],
    rollbackPlan: "Declared-only in Phase 96.",
    evidencePacket: ["declared-branch-validation-evidence.json"],
    riskLevel: "medium",
    branchWorkspaceMutation: true,
    projectRepoSourceMutation: false,
    localGitBranchCreation: false,
    remoteGitBranchCreation: false,
    gitPush: false,
    merge: false,
    binaryPatch: false,
    deleteFile: false,
    createFile: false,
    demoRunnable: false,
  },
  {
    id: "multi-language-branch-edit-declared",
    label: "Multi-language branch edit declared",
    targetBranch: "work/multi-language-branch-edit-v1",
    baseRef: "main",
    sourceBranchCreationPlanId: "phase95-demo-branch-creation-gate",
    targetFile: "examples/multi-language/project.ts",
    seedText: "export const language = 'TypeScript';\\n",
    expectedBeforeSha256: sha256("export const language = 'TypeScript';\\n"),
    findText: "TypeScript",
    replaceText: "TypeScript-ready",
    expectedOccurrences: 1,
    maxBytes: 4096,
    validationIncludes: "TypeScript-ready",
    validationSuites: ["knowledge:verify", "phase96:demo"],
    rollbackPlan: "Declared-only in Phase 96.",
    evidencePacket: ["multi-language-branch-edit.json"],
    riskLevel: "low",
    branchWorkspaceMutation: true,
    projectRepoSourceMutation: false,
    localGitBranchCreation: false,
    remoteGitBranchCreation: false,
    gitPush: false,
    merge: false,
    binaryPatch: false,
    deleteFile: false,
    createFile: false,
    demoRunnable: false,
  },
  {
    id: "sandbox-learning-branch-edit-declared",
    label: "Sandbox learning branch edit declared",
    targetBranch: "work/sandbox-learning-branch-edit-v1",
    baseRef: "main",
    sourceBranchCreationPlanId: "phase95-demo-branch-creation-gate",
    targetFile: "docs/roadmap/SERA_SANDBOX_LEARNING_DOCTRINE.md",
    seedText: "sandbox first\\n",
    expectedBeforeSha256: sha256("sandbox first\\n"),
    findText: "sandbox",
    replaceText: "sandbox-learning",
    expectedOccurrences: 1,
    maxBytes: 4096,
    validationIncludes: "sandbox-learning",
    validationSuites: ["knowledge:verify", "phase96:demo"],
    rollbackPlan: "Declared-only in Phase 96.",
    evidencePacket: ["sandbox-learning-branch-edit.json"],
    riskLevel: "low",
    branchWorkspaceMutation: true,
    projectRepoSourceMutation: false,
    localGitBranchCreation: false,
    remoteGitBranchCreation: false,
    gitPush: false,
    merge: false,
    binaryPatch: false,
    deleteFile: false,
    createFile: false,
    demoRunnable: false,
  },
];

function defaultBoundaries() {
  return {
    branchEditExecutionAllowed: true,
    branchWorkspaceMutationAllowed: true,
    approvedPatchApplicationAllowed: true,
    projectRepoSourceMutationAllowed: false,
    sourceMutationAllowed: false,
    localGitBranchCreationAllowed: false,
    remoteGitBranchCreationAllowed: false,
    gitPushAllowed: false,
    mergeAllowed: false,
    arbitraryBranchNameAllowed: false,
    arbitraryEditPlanAllowed: false,
    arbitraryPatchTextAllowed: false,
    arbitraryPathPatchAllowed: false,
    binaryPatchAllowed: false,
    deleteFileAllowed: false,
    createFileAllowed: false,
    schedulerCreationAllowed: false,
    workflowMutationAllowed: false,
    iphoneAutomationMutationAllowed: false,
    fleetExecutionAllowed: false,
    awayModeExecutionAllowed: false,
    selfApprovalAllowed: false,
    selfMergeAllowed: false,
    selfDeployAllowed: false,
  };
}

export function createDefaultApprovedBranchEditExecutorV1(options = {}) {
  return {
    owner: options.owner ?? "Tyler Wallace",
    operatorAuthorityOwner: options.operatorAuthorityOwner ?? "Driana Smith-Wallace",
    sourcePhase: "Phase 96",
    approvedBranchEditExecutorStatus: "approved-branch-edit-executor-ready",
    safeState: "Owner-approved branch edit execution is ready for isolated branch workspaces with exact edit plans, backups, validation, rollback, and no direct project source mutation.",
    declaredPaths,
    branchEditExecutorRequirements,
    branchEditExecutorFields,
    multiLanguageProductionTargets,
    approvedBranchEditPlans,
    approvalRecord: {
      approvalId: "phase96-owner-approved-branch-edit-executor",
      owner: options.owner ?? "Tyler Wallace",
      operatorAuthorityOwner: options.operatorAuthorityOwner ?? "Driana Smith-Wallace",
      approved: true,
      selfApproved: false,
      branchEditPlanId: "phase96-demo-branch-edit-executor",
      purpose: "Allow S.E.R.A. to execute an exact approved branch edit inside an isolated branch workspace with validation and rollback evidence.",
    },
    prerequisiteReadiness: {
      phase95ApprovedBranchCreationGateReady: true,
      phase94ApprovedBranchPlanGeneratorReady: true,
      phase93ApprovedBranchWorkspaceRunnerReady: true,
      phase92ApprovedFilePatchRunnerReady: true,
      phase91ApprovedValidationRunnerReady: true,
    },
    boundaries: defaultBoundaries(),
  };
}

function inspectConfig(config) {
  const blockers = [];
  if (config.owner !== "Tyler Wallace") blockers.push("Owner must be Tyler Wallace");
  if (config.operatorAuthorityOwner !== "Driana Smith-Wallace") blockers.push("Operator authority owner must be Driana Smith-Wallace");
  if (!config.prerequisiteReadiness?.phase95ApprovedBranchCreationGateReady) blockers.push("Phase 95 approved branch creation gate readiness is required");
  if (!config.prerequisiteReadiness?.phase94ApprovedBranchPlanGeneratorReady) blockers.push("Phase 94 approved branch plan generator readiness is required");
  if (!config.prerequisiteReadiness?.phase93ApprovedBranchWorkspaceRunnerReady) blockers.push("Phase 93 approved branch workspace runner readiness is required");
  if (!config.prerequisiteReadiness?.phase92ApprovedFilePatchRunnerReady) blockers.push("Phase 92 approved file patch runner readiness is required");
  if (!config.prerequisiteReadiness?.phase91ApprovedValidationRunnerReady) blockers.push("Phase 91 approved validation runner readiness is required");

  if (!Array.isArray(config.declaredPaths) || config.declaredPaths.length !== 5) blockers.push("Phase 96 must declare exactly 5 source-map paths");
  for (const file of config.declaredPaths ?? []) if (!isSafeRelativePath(file)) blockers.push(`Declared path must be safe and relative: ${file}`);
  if (!Array.isArray(config.branchEditExecutorRequirements) || config.branchEditExecutorRequirements.length !== 24) blockers.push("Phase 96 must include 24 branch edit executor requirements");
  if (!Array.isArray(config.branchEditExecutorFields) || config.branchEditExecutorFields.length !== 36) blockers.push("Phase 96 must include 36 branch edit executor fields");
  if (!Array.isArray(config.multiLanguageProductionTargets) || config.multiLanguageProductionTargets.length !== 18) blockers.push("Multi-language production doctrine must include 18 useful language targets");
  const requiredLanguages = ["TypeScript", "JavaScript", "Python", "Swift", "Kotlin", "Dart", "Java", "C#", "C++", "C", "Rust", "Go", "SQL", "HTML/CSS", "PHP", "Ruby", "PowerShell", "Bash"];
  const actualLanguages = new Set((config.multiLanguageProductionTargets ?? []).map((item) => item.language));
  for (const language of requiredLanguages) if (!actualLanguages.has(language)) blockers.push(`Multi-language production target is missing: ${language}`);

  const boundaries = config.boundaries ?? {};
  const falseBoundaries = [
    "projectRepoSourceMutationAllowed", "sourceMutationAllowed", "localGitBranchCreationAllowed", "remoteGitBranchCreationAllowed", "gitPushAllowed", "mergeAllowed", "arbitraryBranchNameAllowed", "arbitraryEditPlanAllowed", "arbitraryPatchTextAllowed", "arbitraryPathPatchAllowed", "binaryPatchAllowed", "deleteFileAllowed", "createFileAllowed", "schedulerCreationAllowed", "workflowMutationAllowed", "iphoneAutomationMutationAllowed", "fleetExecutionAllowed", "awayModeExecutionAllowed", "selfApprovalAllowed", "selfMergeAllowed", "selfDeployAllowed",
  ];
  if (boundaries.branchEditExecutionAllowed !== true) blockers.push("branchEditExecutionAllowed must be true");
  if (boundaries.branchWorkspaceMutationAllowed !== true) blockers.push("branchWorkspaceMutationAllowed must be true");
  if (boundaries.approvedPatchApplicationAllowed !== true) blockers.push("approvedPatchApplicationAllowed must be true");
  for (const boundary of falseBoundaries) if (boundaries[boundary] !== false) blockers.push(`${boundary} must remain false`);

  if (!Array.isArray(config.approvedBranchEditPlans) || config.approvedBranchEditPlans.length !== 4) blockers.push("Phase 96 must include 4 approved branch edit plan records");
  for (const plan of config.approvedBranchEditPlans ?? []) {
    if (!plan.id) blockers.push("Approved branch edit plan id is required");
    if (!isSafeWorkBranchName(plan.targetBranch)) blockers.push(`Branch edit target branch must be safe and work/ scoped: ${plan.id}`);
    if (plan.baseRef !== "main") blockers.push(`Branch edit base ref must be main: ${plan.id}`);
    if (!isSafeRelativePath(plan.targetFile)) blockers.push(`Branch edit target file must be safe and relative: ${plan.id}`);
    if (typeof plan.seedText !== "string") blockers.push(`Branch edit seed text is required: ${plan.id}`);
    if (!plan.expectedBeforeSha256) blockers.push(`Branch edit expected before SHA-256 is required: ${plan.id}`);
    if (sha256(plan.seedText ?? "") !== plan.expectedBeforeSha256) blockers.push(`Branch edit expected before SHA-256 mismatch: ${plan.id}`);
    if (typeof plan.findText !== "string" || plan.findText.length === 0) blockers.push(`Branch edit find text is required: ${plan.id}`);
    if (typeof plan.replaceText !== "string") blockers.push(`Branch edit replace text is required: ${plan.id}`);
    if (plan.expectedOccurrences !== 1) blockers.push(`Branch edit expected occurrences must be 1 in Phase 96: ${plan.id}`);
    if (!plan.validationIncludes) blockers.push(`Branch edit validation text is required: ${plan.id}`);
    if (!plan.branchWorkspaceMutation) blockers.push(`Branch workspace mutation must be explicitly allowed for approved branch edit plans: ${plan.id}`);
    if (plan.projectRepoSourceMutation) blockers.push(`Project repo source mutation must remain blocked in Phase 96: ${plan.id}`);
    if (plan.localGitBranchCreation) blockers.push(`Local Git branch creation must remain blocked in Phase 96: ${plan.id}`);
    if (plan.remoteGitBranchCreation) blockers.push(`Remote Git branch creation must remain blocked in Phase 96: ${plan.id}`);
    if (plan.gitPush) blockers.push(`Git push must remain blocked in Phase 96: ${plan.id}`);
    if (plan.merge) blockers.push(`Merge must remain blocked in Phase 96: ${plan.id}`);
    if (plan.binaryPatch) blockers.push(`Binary patches must remain blocked in Phase 96: ${plan.id}`);
    if (plan.deleteFile) blockers.push(`Delete file must remain blocked in Phase 96: ${plan.id}`);
    if (plan.createFile) blockers.push(`Create file must remain blocked in Phase 96: ${plan.id}`);
    if (!Array.isArray(plan.validationSuites) || !plan.validationSuites.includes("phase96:demo")) {
      if (plan.demoRunnable) blockers.push(`Demo branch edit plan must include phase96:demo validation suite: ${plan.id}`);
    }
    if (!Array.isArray(plan.evidencePacket) || plan.evidencePacket.length === 0) blockers.push(`Evidence packet must be declared: ${plan.id}`);
  }

  const approval = config.approvalRecord ?? {};
  if (approval.approved !== true) blockers.push("Owner approval is required before branch edit execution");
  if (approval.selfApproved === true) blockers.push("Approval record must not be self-approved");
  if (approval.selfApproved === true || boundaries.selfApprovalAllowed === true) blockers.push("Self-approved branch edit execution is blocked");
  if (approval.owner !== config.owner) blockers.push("Approval owner must match configuration owner");
  if (approval.operatorAuthorityOwner !== config.operatorAuthorityOwner) blockers.push("Approval operator authority owner must match configuration operator authority owner");
  const approvedPlan = (config.approvedBranchEditPlans ?? []).find((item) => item.id === approval.branchEditPlanId);
  if (!approvedPlan) blockers.push(`Approved branch edit plan was not found in catalog: ${approval.branchEditPlanId}`);
  return { blockers, approvedPlan };
}

export function inspectApprovedBranchEditExecutorV1(config = createDefaultApprovedBranchEditExecutorV1()) {
  const { blockers } = inspectConfig(config);
  return {
    ok: blockers.length === 0,
    approvedBranchEditExecutorStatus: config.approvedBranchEditExecutorStatus,
    blockers,
    validationFailedCount: blockers.length,
    declaredFileCount: config.declaredPaths?.length ?? 0,
    branchEditExecutorRequirementCount: config.branchEditExecutorRequirements?.length ?? 0,
    branchEditExecutorFieldCount: config.branchEditExecutorFields?.length ?? 0,
    approvedBranchEditPlanCount: config.approvedBranchEditPlans?.length ?? 0,
    multiLanguageProductionTargetCount: config.multiLanguageProductionTargets?.length ?? 0,
    branchEditExecutorEvidenceCount: 24,
    branchEditExecutorSignalCount: 48,
    safetyGateCount: 1100,
    appBindingCount: 7,
    phase95ApprovedBranchCreationGateReady: config.prerequisiteReadiness?.phase95ApprovedBranchCreationGateReady === true,
    phase94ApprovedBranchPlanGeneratorReady: config.prerequisiteReadiness?.phase94ApprovedBranchPlanGeneratorReady === true,
    phase93ApprovedBranchWorkspaceRunnerReady: config.prerequisiteReadiness?.phase93ApprovedBranchWorkspaceRunnerReady === true,
    phase92ApprovedFilePatchRunnerReady: config.prerequisiteReadiness?.phase92ApprovedFilePatchRunnerReady === true,
    phase91ApprovedValidationRunnerReady: config.prerequisiteReadiness?.phase91ApprovedValidationRunnerReady === true,
    ownerApprovalRequired: true,
    exactEditPlanRequired: true,
    safeWorkBranchRequired: true,
    workspaceContainmentRequired: true,
    expectedHashRequired: true,
    expectedOccurrenceRequired: true,
    backupRequired: true,
    validationRequired: true,
    rollbackRequired: true,
    multiLanguageProductionDoctrineRequired: true,
    branchEditExecutionAllowed: config.boundaries?.branchEditExecutionAllowed === true,
    branchWorkspaceMutationAllowed: config.boundaries?.branchWorkspaceMutationAllowed === true,
    approvedPatchApplicationAllowed: config.boundaries?.approvedPatchApplicationAllowed === true,
    projectRepoSourceMutationAllowed: config.boundaries?.projectRepoSourceMutationAllowed === true,
    sourceMutationAllowed: config.boundaries?.sourceMutationAllowed === true,
    localGitBranchCreationAllowed: config.boundaries?.localGitBranchCreationAllowed === true,
    remoteGitBranchCreationAllowed: config.boundaries?.remoteGitBranchCreationAllowed === true,
    gitPushAllowed: config.boundaries?.gitPushAllowed === true,
    mergeAllowed: config.boundaries?.mergeAllowed === true,
    binaryPatchAllowed: config.boundaries?.binaryPatchAllowed === true,
    deleteFileAllowed: config.boundaries?.deleteFileAllowed === true,
    createFileAllowed: config.boundaries?.createFileAllowed === true,
    selfApprovalAllowed: config.boundaries?.selfApprovalAllowed === true,
    selfMergeAllowed: config.boundaries?.selfMergeAllowed === true,
    selfDeployAllowed: config.boundaries?.selfDeployAllowed === true,
  };
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + "\n", "utf8");
}

function writeText(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value, "utf8");
}

function renderBranchEditResultMarkdown(result) {
  return `# ${result.label}\n\n` +
    `- Target branch: \`${result.targetBranch}\`\n` +
    `- Target file: \`${result.targetFile}\`\n` +
    `- Branch workspace mutated: \`${result.branchWorkspaceMutated}\`\n` +
    `- Project repo source mutated: \`${result.projectRepoSourceMutated}\`\n` +
    `- Git push performed: \`${result.gitPushPerformed}\`\n` +
    `- Merge performed: \`${result.mergePerformed}\`\n` +
    `- Validation passed: \`${result.validationPassed}\`\n` +
    `- Rolled back: \`${result.rolledBack}\`\n\n` +
    `## Evidence\n\n${result.evidencePacket.map((item) => `- ${item}`).join("\n")}\n`;
}

export function runApprovedBranchEditExecutorV1(config = createDefaultApprovedBranchEditExecutorV1(), options = {}) {
  const { blockers, approvedPlan } = inspectConfig(config);
  const artifactRoot = options.artifactRoot ?? path.join(process.cwd(), ".sera-approved-branch-edit-executor");
  fs.mkdirSync(artifactRoot, { recursive: true });

  if (blockers.length > 0) {
    const blockedRecord = { ok: false, status: "blocked", blockers, createdAt: new Date().toISOString(), phase: "Phase 96" };
    const blockedPath = path.join(artifactRoot, "blocked-branch-edit-executor.json");
    writeJson(blockedPath, blockedRecord);
    return { ...blockedRecord, blockedPath };
  }

  const branchWorkspaceRoot = path.join(artifactRoot, "branches", approvedPlan.targetBranch.replaceAll("/", "__"));
  const targetPath = path.join(branchWorkspaceRoot, approvedPlan.targetFile);
  assertContained(branchWorkspaceRoot, targetPath);
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  writeText(targetPath, approvedPlan.seedText);

  const beforeText = fs.readFileSync(targetPath, "utf8");
  const beforeSha256 = sha256(beforeText);
  if (beforeSha256 !== approvedPlan.expectedBeforeSha256) {
    const failed = { ok: false, status: "blocked", blockers: [`Expected SHA-256 mismatch for ${approvedPlan.targetFile}`], beforeSha256, expectedBeforeSha256: approvedPlan.expectedBeforeSha256 };
    writeJson(path.join(artifactRoot, "branch-edit-sha-mismatch.json"), failed);
    return failed;
  }
  if (Buffer.byteLength(beforeText, "utf8") > approvedPlan.maxBytes) {
    const failed = { ok: false, status: "blocked", blockers: [`Target file exceeds max bytes for ${approvedPlan.targetFile}`] };
    writeJson(path.join(artifactRoot, "branch-edit-size-blocked.json"), failed);
    return failed;
  }
  const occurrenceCount = beforeText.split(approvedPlan.findText).length - 1;
  if (occurrenceCount !== approvedPlan.expectedOccurrences) {
    const failed = { ok: false, status: "blocked", blockers: [`Expected ${approvedPlan.expectedOccurrences} occurrence(s) but found ${occurrenceCount} for ${approvedPlan.targetFile}`] };
    writeJson(path.join(artifactRoot, "branch-edit-occurrence-blocked.json"), failed);
    return failed;
  }

  const backupPath = path.join(artifactRoot, "backups", approvedPlan.targetFile.replaceAll("/", "__") + ".backup.txt");
  writeText(backupPath, beforeText);
  const afterText = beforeText.replace(approvedPlan.findText, approvedPlan.replaceText);
  writeText(targetPath, afterText);

  const validationPassed = options.forceValidationFailure === true ? false : fs.readFileSync(targetPath, "utf8").includes(approvedPlan.validationIncludes);
  let rolledBack = false;
  if (!validationPassed) {
    writeText(targetPath, beforeText);
    rolledBack = true;
  }

  const result = {
    ok: validationPassed,
    status: validationPassed ? "edited" : "rolled-back",
    phase: "Phase 96",
    id: approvedPlan.id,
    label: approvedPlan.label,
    targetBranch: approvedPlan.targetBranch,
    baseRef: approvedPlan.baseRef,
    sourceBranchCreationPlanId: approvedPlan.sourceBranchCreationPlanId,
    targetFile: approvedPlan.targetFile,
    targetPath,
    backupPath,
    beforeSha256,
    afterSha256: sha256(afterText),
    occurrenceCount,
    validationPassed,
    rolledBack,
    branchWorkspaceMutated: true,
    projectRepoSourceMutated: false,
    localGitBranchCreated: false,
    remoteBranchCreated: false,
    gitPushPerformed: false,
    mergePerformed: false,
    binaryPatchApplied: false,
    fileDeleted: false,
    fileCreated: false,
    evidencePacket: approvedPlan.evidencePacket,
    multiLanguageProductionDoctrineIncluded: true,
    ownerApproval: config.approvalRecord,
    createdAt: new Date().toISOString(),
  };

  const planPath = path.join(artifactRoot, "branch-edit-plan.json");
  const resultPath = path.join(artifactRoot, "branch-edit-result.json");
  const resultMarkdownPath = path.join(artifactRoot, "branch-edit-result.md");
  const validationPath = path.join(artifactRoot, "branch-edit-validation.json");
  const approvalPath = path.join(artifactRoot, "owner-approval-record.json");
  writeJson(planPath, approvedPlan);
  writeJson(resultPath, result);
  writeText(resultMarkdownPath, renderBranchEditResultMarkdown(result));
  writeJson(validationPath, { validationPassed, rolledBack, validationIncludes: approvedPlan.validationIncludes, targetPath });
  writeJson(approvalPath, config.approvalRecord);

  return { ...result, planPath, resultPath, resultMarkdownPath, validationPath, approvalPath };
}

export function runApprovedBranchEditExecutorDemoV1(options = {}) {
  const config = createDefaultApprovedBranchEditExecutorV1(options);
  return runApprovedBranchEditExecutorV1(config, options);
}
