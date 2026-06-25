import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const declaredPaths = [
  "docs/phases/PHASE_95_APPROVED_BRANCH_CREATION_GATE_V1.md",
  "docs/roadmap/SERA_MULTI_LANGUAGE_PRODUCTION_DOCTRINE.md",
  "scripts/lib/approved-branch-creation-gate-v1.mjs",
  "scripts/run-approved-branch-creation-gate-v1.mjs",
  "tests/integration/approved-branch-creation-gate-v1.test.ts",
  "apps/operator-console/src/approved-branch-creation-gate.ts",
];

const branchCreationGateRequirements = [
  { id: "phase-94-branch-plan-reviewed", label: "Phase 94 approved branch plan reviewed", state: "required", evidence: "Branch creation gate decisions must be grounded in a structured owner-reviewable branch plan." },
  { id: "phase-93-workspace-reviewed", label: "Phase 93 approved branch workspace reviewed", state: "required", evidence: "Branch creation remains connected to isolated workspace proof before real project branch actions." },
  { id: "phase-92-patch-runner-reviewed", label: "Phase 92 approved file patch runner reviewed", state: "required", evidence: "Future branch edits must preserve expected occurrence, backup, rollback, and validation boundaries." },
  { id: "phase-91-validation-reviewed", label: "Phase 91 approved validation runner reviewed", state: "required", evidence: "Every branch creation packet must name validation suites before editing begins." },
  { id: "owner-approval-required", label: "Owner approval required", state: "required", evidence: "S.E.R.A. cannot approve or create branch packets on her own authority." },
  { id: "operator-authority-required", label: "Operator authority owner required", state: "required", evidence: "Driana Smith-Wallace remains operator authority owner for high-power action gates." },
  { id: "exact-plan-id-required", label: "Exact approved plan id required", state: "required", evidence: "Only cataloged Phase 94 branch plans can pass the creation gate." },
  { id: "safe-work-branch-required", label: "Safe work/ branch name required", state: "required", evidence: "Branch names must be relative-safe, slash-normalized, work/ scoped, and free of traversal/shell characters." },
  { id: "base-ref-main-required", label: "Base ref must be declared", state: "required", evidence: "The packet must declare the intended base ref and never move refs automatically." },
  { id: "clean-tree-required", label: "Clean working tree required", state: "required", evidence: "Future real branch creation must start from a clean working tree." },
  { id: "remote-push-blocked", label: "Remote push blocked", state: "required", evidence: "Phase 95 must not push branches, create remote refs, or change GitHub state." },
  { id: "project-repo-branch-creation-blocked", label: "Project repo branch creation blocked", state: "required", evidence: "Phase 95 is a branch creation gate; it writes packets and sandbox markers, not real repo branches." },
  { id: "source-mutation-blocked", label: "Source mutation blocked", state: "required", evidence: "Branch creation gate packets must not edit repository source." },
  { id: "patch-execution-blocked", label: "Patch execution blocked", state: "required", evidence: "Phase 95 approves/gates branch readiness only and does not apply patches." },
  { id: "sandbox-practice-allowed", label: "Sandbox branch practice allowed", state: "required", evidence: "The gate can write disposable branch-practice markers in runtime artifacts to prove naming and packet shape." },
  { id: "validation-suite-required", label: "Validation suite declaration required", state: "required", evidence: "Every branch packet declares the validation suite future edit/execution phases must run." },
  { id: "rollback-plan-required", label: "Rollback plan required", state: "required", evidence: "Every branch packet declares rollback rules before edits or merges are attempted." },
  { id: "evidence-packet-required", label: "Evidence packet required", state: "required", evidence: "Every branch creation gate must write JSON, Markdown, safety, and approval evidence." },
  { id: "sandbox-learning-doctrine-preserved", label: "Sandbox Learning Doctrine preserved", state: "required", evidence: "Hard domains remain sandbox-first, not impossible." },
  { id: "multi-language-doctrine-required", label: "Multi-language production doctrine required", state: "required", evidence: "S.E.R.A. must choose the right useful coding language for the project instead of being limited to Python." },
  { id: "self-approval-blocked", label: "Self approval blocked", state: "required", evidence: "S.E.R.A. cannot self-approve branch creation, edits, merges, deployments, publishes, or hardware actions." },
  { id: "next-phase-branch-edit-boundary", label: "Next phase boundary declared", state: "required", evidence: "Phase 96 must consume approved branch packets before any branch edit executor unlocks." },
];

const branchCreationGateFields = [
  "owner",
  "operatorAuthorityOwner",
  "sourcePhase",
  "safeState",
  "phase94ApprovedBranchPlanGeneratorReady",
  "phase93ApprovedBranchWorkspaceRunnerReady",
  "phase92ApprovedFilePatchRunnerReady",
  "phase91ApprovedValidationRunnerReady",
  "ownerApprovalRequired",
  "operatorAuthorityRequired",
  "exactPlanIdRequired",
  "safeWorkBranchNameRequired",
  "baseRefRequired",
  "cleanWorkingTreeRequired",
  "validationSuiteRequired",
  "rollbackPlanRequired",
  "evidencePacketRequired",
  "sandboxLearningDoctrineRequired",
  "multiLanguageProductionDoctrineRequired",
  "approvedBranchCreationPlanCount",
  "multiLanguageProductionTargetCount",
  "branchCreationGateAllowed",
  "sandboxBranchPracticeAllowed",
  "projectRepoBranchCreationAllowed",
  "localGitBranchCreationAllowed",
  "remoteGitBranchCreationAllowed",
  "gitPushAllowed",
  "patchExecutionAllowed",
  "sourceMutationAllowed",
  "selfApprovalAllowed",
  "selfMergeAllowed",
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
  if (value.includes("\\")) return false;
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
  return true;
}

export const sandboxLearningDoctrine = [
  { step: 1, title: "Study the domain", outcome: "Build a source-backed knowledge pack before acting." },
  { step: 2, title: "Create notes", outcome: "Write domain notes, constraints, risks, assumptions, and unknowns." },
  { step: 3, title: "Design safe practice tasks", outcome: "Convert ambition into contained sandbox exercises." },
  { step: 4, title: "Attempt in sandbox", outcome: "Try the work in an isolated workspace, simulator, local build, or generated artifact area." },
  { step: 5, title: "Record evidence", outcome: "Capture inputs, outputs, failures, logs, screenshots, hashes, and decisions." },
  { step: 6, title: "Refine notes", outcome: "Update the knowledge pack and task rules based on what happened." },
  { step: 7, title: "Try again", outcome: "Repeat with tighter assumptions, better tools, and smaller tests." },
  { step: 8, title: "Validate", outcome: "Use tests, simulations, inspections, render reviews, or QA checklists." },
  { step: 9, title: "Escalate when risky", outcome: "Physical, legal, medical, financial, electrical, or high-risk work requires expert review." },
  { step: 10, title: "Graduate by approval", outcome: "Only move from sandbox to real execution after owner approval and evidence review." },
];

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

const approvedBranchCreationPlans = [
  {
    id: "phase95-demo-branch-creation-gate",
    label: "Phase 95 demo branch creation gate packet",
    branchName: "work/phase-95-demo-branch-creation-gate",
    baseRef: "main",
    sourceBranchPlanId: "phase94-demo-branch-plan",
    targetFiles: ["src/phase95-demo.ts"],
    scopeSummary: "Generate and validate an owner-approved branch creation packet without creating a real project repository branch, pushing remotes, executing patches, or mutating source.",
    validationSuites: ["free-core:verify", "knowledge:verify", "phase94:demo", "phase95:demo"],
    rollbackPlan: "Phase 95 writes packet evidence only. Future real branch creation must verify clean tree, safe branch name, base ref, owner approval, and no remote push before action.",
    evidencePacket: ["branch-creation-packet.json", "branch-creation-packet.md", "branch-safety-check.json", "owner-approval-record.json", "multi-language-production-doctrine.json"],
    riskLevel: "medium",
    cleanWorkingTreeRequired: true,
    sandboxBranchPracticeAllowed: true,
    sandboxBranchPracticeOnly: true,
    projectRepoBranchCreation: false,
    localGitBranchCreation: false,
    remoteGitBranchCreation: false,
    gitPush: false,
    sourceMutation: false,
    patchExecution: false,
    multiLanguageProductionDoctrineRequired: true,
    demoRunnable: true,
  },
  {
    id: "phase96-approved-branch-edit-executor-declared",
    label: "Phase 96 approved branch edit executor declared",
    branchName: "work/phase-96-approved-branch-edit-executor-v1",
    baseRef: "main",
    sourceBranchPlanId: "phase95-demo-branch-creation-gate",
    targetFiles: ["docs/phases/PHASE_96_APPROVED_BRANCH_EDIT_EXECUTOR_V1.md"],
    scopeSummary: "Declared-only next phase for editing inside owner-approved branch scope.",
    validationSuites: ["free-core:verify", "knowledge:verify", "phase95:demo"],
    rollbackPlan: "Declared-only in Phase 95.",
    evidencePacket: ["declared-branch-edit-plan.json"],
    riskLevel: "medium",
    cleanWorkingTreeRequired: true,
    sandboxBranchPracticeAllowed: true,
    sandboxBranchPracticeOnly: true,
    projectRepoBranchCreation: false,
    localGitBranchCreation: false,
    remoteGitBranchCreation: false,
    gitPush: false,
    sourceMutation: false,
    patchExecution: false,
    multiLanguageProductionDoctrineRequired: true,
    demoRunnable: false,
  },
  {
    id: "multi-language-project-studio-declared",
    label: "Multi-language project studio declared",
    branchName: "work/multi-language-project-studio-v1",
    baseRef: "main",
    sourceBranchPlanId: "phase95-roadmap-doctrine",
    targetFiles: ["docs/roadmap/SERA_MULTI_LANGUAGE_PRODUCTION_DOCTRINE.md"],
    scopeSummary: "Documents that S.E.R.A. should produce useful projects across the correct language for the job, not only Python.",
    validationSuites: ["knowledge:verify"],
    rollbackPlan: "Document-only declaration in Phase 95.",
    evidencePacket: ["multi-language-doctrine.json"],
    riskLevel: "low",
    cleanWorkingTreeRequired: true,
    sandboxBranchPracticeAllowed: true,
    sandboxBranchPracticeOnly: true,
    projectRepoBranchCreation: false,
    localGitBranchCreation: false,
    remoteGitBranchCreation: false,
    gitPush: false,
    sourceMutation: false,
    patchExecution: false,
    multiLanguageProductionDoctrineRequired: true,
    demoRunnable: false,
  },
  {
    id: "advanced-production-language-routing-declared",
    label: "Advanced production language routing declared",
    branchName: "work/advanced-production-language-routing-v1",
    baseRef: "main",
    sourceBranchPlanId: "phase95-roadmap-doctrine",
    targetFiles: ["docs/roadmap/SERA_MULTI_LANGUAGE_PRODUCTION_DOCTRINE.md"],
    scopeSummary: "Declares future language routing for iOS, Android, web, games, robotics, dashboards, data, and infrastructure projects.",
    validationSuites: ["knowledge:verify"],
    rollbackPlan: "Document-only declaration in Phase 95.",
    evidencePacket: ["language-routing-map.json"],
    riskLevel: "low",
    cleanWorkingTreeRequired: true,
    sandboxBranchPracticeAllowed: true,
    sandboxBranchPracticeOnly: true,
    projectRepoBranchCreation: false,
    localGitBranchCreation: false,
    remoteGitBranchCreation: false,
    gitPush: false,
    sourceMutation: false,
    patchExecution: false,
    multiLanguageProductionDoctrineRequired: true,
    demoRunnable: false,
  },
];

function defaultBoundaries() {
  return {
    branchCreationGateAllowed: true,
    sandboxBranchPracticeAllowed: true,
    projectRepoBranchCreationAllowed: false,
    localGitBranchCreationAllowed: false,
    remoteGitBranchCreationAllowed: false,
    gitPushAllowed: false,
    patchExecutionAllowed: false,
    sourceMutationAllowed: false,
    arbitraryBranchNameAllowed: false,
    arbitraryPlanTextAllowed: false,
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

export function createDefaultApprovedBranchCreationGateV1(options = {}) {
  return {
    owner: options.owner ?? "Tyler Wallace",
    operatorAuthorityOwner: options.operatorAuthorityOwner ?? "Driana Smith-Wallace",
    sourcePhase: "Phase 95",
    approvedBranchCreationGateStatus: "approved-branch-creation-gate-ready",
    safeState: "Owner-approved branch creation gate packets with safe branch names, clean-tree requirements, validation declarations, sandbox practice, and multi-language production doctrine are ready.",
    declaredPaths,
    branchCreationGateRequirements,
    branchCreationGateFields,
    sandboxLearningDoctrine,
    multiLanguageProductionTargets,
    approvedBranchCreationPlans,
    approvalRecord: {
      approvalId: "phase95-owner-approved-branch-creation-gate",
      owner: options.owner ?? "Tyler Wallace",
      operatorAuthorityOwner: options.operatorAuthorityOwner ?? "Driana Smith-Wallace",
      approved: true,
      selfApproved: false,
      branchCreationPlanId: "phase95-demo-branch-creation-gate",
      purpose: "Allow S.E.R.A. to generate and validate a branch creation gate packet without real repo branch creation or source mutation.",
    },
    prerequisiteReadiness: {
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
  if (!config.prerequisiteReadiness?.phase94ApprovedBranchPlanGeneratorReady) blockers.push("Phase 94 approved branch plan generator readiness is required");
  if (!config.prerequisiteReadiness?.phase93ApprovedBranchWorkspaceRunnerReady) blockers.push("Phase 93 approved branch workspace readiness is required");
  if (!config.prerequisiteReadiness?.phase92ApprovedFilePatchRunnerReady) blockers.push("Phase 92 approved file patch runner readiness is required");
  if (!config.prerequisiteReadiness?.phase91ApprovedValidationRunnerReady) blockers.push("Phase 91 approved validation runner readiness is required");

  if (!Array.isArray(config.declaredPaths) || config.declaredPaths.length !== 6) blockers.push("Phase 95 must declare exactly 6 source-map paths");
  for (const file of config.declaredPaths ?? []) {
    if (!isSafeRelativePath(file)) blockers.push(`Declared path must be safe and relative: ${file}`);
  }

  if (!Array.isArray(config.branchCreationGateRequirements) || config.branchCreationGateRequirements.length !== 22) blockers.push("Phase 95 must include 22 branch creation gate requirements");
  if (!Array.isArray(config.branchCreationGateFields) || config.branchCreationGateFields.length !== 31) blockers.push("Phase 95 must include 31 branch creation gate fields");
  if (!Array.isArray(config.sandboxLearningDoctrine) || config.sandboxLearningDoctrine.length !== 10) blockers.push("Sandbox Learning Doctrine must include the 10-step study/practice/refine/validate loop");
  if (!Array.isArray(config.multiLanguageProductionTargets) || config.multiLanguageProductionTargets.length !== 18) blockers.push("Multi-language production doctrine must include 18 useful language targets");

  const requiredLanguages = ["TypeScript", "JavaScript", "Python", "Swift", "Kotlin", "Dart", "Java", "C#", "C++", "C", "Rust", "Go", "SQL", "HTML/CSS", "PHP", "Ruby", "PowerShell", "Bash"];
  const actualLanguages = new Set((config.multiLanguageProductionTargets ?? []).map((item) => item.language));
  for (const language of requiredLanguages) {
    if (!actualLanguages.has(language)) blockers.push(`Multi-language production target is missing: ${language}`);
  }

  const boundaries = config.boundaries ?? {};
  const falseBoundaries = [
    "projectRepoBranchCreationAllowed",
    "localGitBranchCreationAllowed",
    "remoteGitBranchCreationAllowed",
    "gitPushAllowed",
    "patchExecutionAllowed",
    "sourceMutationAllowed",
    "arbitraryBranchNameAllowed",
    "arbitraryPlanTextAllowed",
    "schedulerCreationAllowed",
    "workflowMutationAllowed",
    "iphoneAutomationMutationAllowed",
    "fleetExecutionAllowed",
    "awayModeExecutionAllowed",
    "selfApprovalAllowed",
    "selfMergeAllowed",
    "selfDeployAllowed",
  ];
  if (boundaries.branchCreationGateAllowed !== true) blockers.push("branchCreationGateAllowed must be true");
  if (boundaries.sandboxBranchPracticeAllowed !== true) blockers.push("sandboxBranchPracticeAllowed must be true");
  for (const boundary of falseBoundaries) {
    if (boundaries[boundary] !== false) blockers.push(`${boundary} must remain false`);
  }

  if (!Array.isArray(config.approvedBranchCreationPlans) || config.approvedBranchCreationPlans.length !== 4) blockers.push("Phase 95 must include 4 approved branch creation plan records");
  for (const plan of config.approvedBranchCreationPlans ?? []) {
    if (!plan.id) blockers.push("Approved branch creation plan id is required");
    if (!isSafeWorkBranchName(plan.branchName)) blockers.push(`Branch creation gate branch name must be safe and work/ scoped: ${plan.id}`);
    if (plan.baseRef !== "main") blockers.push(`Branch creation base ref must be main: ${plan.id}`);
    if (!plan.cleanWorkingTreeRequired) blockers.push(`Clean working tree must be required: ${plan.id}`);
    if (!plan.multiLanguageProductionDoctrineRequired) blockers.push(`Multi-language production doctrine must be required: ${plan.id}`);
    if (plan.projectRepoBranchCreation) blockers.push(`Project repository branch creation must remain blocked in Phase 95: ${plan.id}`);
    if (plan.localGitBranchCreation) blockers.push(`Local Git branch creation must remain blocked in Phase 95: ${plan.id}`);
    if (plan.remoteGitBranchCreation) blockers.push(`Remote Git branch creation must remain blocked in Phase 95: ${plan.id}`);
    if (plan.gitPush) blockers.push(`Git push must remain blocked in Phase 95: ${plan.id}`);
    if (plan.sourceMutation) blockers.push(`Source mutation must remain blocked in Phase 95: ${plan.id}`);
    if (plan.patchExecution) blockers.push(`Patch execution must remain blocked in Phase 95: ${plan.id}`);
    for (const targetFile of plan.targetFiles ?? []) {
      if (!isSafeRelativePath(targetFile)) blockers.push(`Branch creation target file must be safe and relative: ${plan.id}`);
    }
    if (!Array.isArray(plan.validationSuites) || !plan.validationSuites.includes("phase95:demo")) {
      if (plan.demoRunnable) blockers.push(`Demo branch creation plan must include phase95:demo validation suite: ${plan.id}`);
    }
    if (!Array.isArray(plan.evidencePacket) || plan.evidencePacket.length === 0) blockers.push(`Evidence packet must be declared: ${plan.id}`);
  }

  const approval = config.approvalRecord ?? {};
  if (approval.approved !== true) blockers.push("Owner approval is required before branch creation gate packet generation");
  if (approval.selfApproved === true) blockers.push("Approval record must not be self-approved");
  if (approval.selfApproved === true || boundaries.selfApprovalAllowed === true) blockers.push("Self-approved branch creation gate packets are blocked");
  if (approval.owner !== config.owner) blockers.push("Approval owner must match configuration owner");
  if (approval.operatorAuthorityOwner !== config.operatorAuthorityOwner) blockers.push("Approval operator authority owner must match configuration operator authority owner");
  const approvedPlan = (config.approvedBranchCreationPlans ?? []).find((item) => item.id === approval.branchCreationPlanId);
  if (!approvedPlan) blockers.push(`Approved branch creation plan was not found in catalog: ${approval.branchCreationPlanId}`);

  return { blockers, approvedPlan };
}

export function inspectApprovedBranchCreationGateV1(config = createDefaultApprovedBranchCreationGateV1()) {
  const { blockers } = inspectConfig(config);
  const result = {
    ok: blockers.length === 0,
    approvedBranchCreationGateStatus: config.approvedBranchCreationGateStatus,
    blockers,
    validationFailedCount: blockers.length,
    declaredFileCount: config.declaredPaths?.length ?? 0,
    branchCreationGateRequirementCount: config.branchCreationGateRequirements?.length ?? 0,
    branchCreationGateFieldCount: config.branchCreationGateFields?.length ?? 0,
    approvedBranchCreationPlanCount: config.approvedBranchCreationPlans?.length ?? 0,
    sandboxLearningDoctrineStepCount: config.sandboxLearningDoctrine?.length ?? 0,
    multiLanguageProductionTargetCount: config.multiLanguageProductionTargets?.length ?? 0,
    branchCreationGateEvidenceCount: 22,
    branchCreationGateSignalCount: 44,
    safetyGateCount: 1060,
    appBindingCount: 7,
    phase94ApprovedBranchPlanGeneratorReady: config.prerequisiteReadiness?.phase94ApprovedBranchPlanGeneratorReady === true,
    phase93ApprovedBranchWorkspaceRunnerReady: config.prerequisiteReadiness?.phase93ApprovedBranchWorkspaceRunnerReady === true,
    phase92ApprovedFilePatchRunnerReady: config.prerequisiteReadiness?.phase92ApprovedFilePatchRunnerReady === true,
    phase91ApprovedValidationRunnerReady: config.prerequisiteReadiness?.phase91ApprovedValidationRunnerReady === true,
    ownerApprovalRequired: true,
    exactPlanIdRequired: true,
    safeWorkBranchNameRequired: true,
    cleanWorkingTreeRequired: true,
    sandboxLearningDoctrineRequired: true,
    multiLanguageProductionDoctrineRequired: true,
    branchCreationGateAllowed: config.boundaries?.branchCreationGateAllowed === true,
    sandboxBranchPracticeAllowed: config.boundaries?.sandboxBranchPracticeAllowed === true,
    projectRepoBranchCreationAllowed: config.boundaries?.projectRepoBranchCreationAllowed === true,
    localGitBranchCreationAllowed: config.boundaries?.localGitBranchCreationAllowed === true,
    remoteGitBranchCreationAllowed: config.boundaries?.remoteGitBranchCreationAllowed === true,
    gitPushAllowed: config.boundaries?.gitPushAllowed === true,
    patchExecutionAllowed: config.boundaries?.patchExecutionAllowed === true,
    sourceMutationAllowed: config.boundaries?.sourceMutationAllowed === true,
    selfApprovalAllowed: config.boundaries?.selfApprovalAllowed === true,
    selfMergeAllowed: config.boundaries?.selfMergeAllowed === true,
    selfDeployAllowed: config.boundaries?.selfDeployAllowed === true,
  };
  return result;
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + "\n", "utf8");
}

function writeText(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value, "utf8");
}

function renderBranchCreationPacketMarkdown(packet) {
  return `# ${packet.label}\n\n` +
    `- Branch name: \`${packet.branchName}\`\n` +
    `- Base ref: \`${packet.baseRef}\`\n` +
    `- Source branch plan: \`${packet.sourceBranchPlanId}\`\n` +
    `- Project repo branch created: \`${packet.projectRepoBranchCreated}\`\n` +
    `- Remote branch created: \`${packet.remoteBranchCreated}\`\n` +
    `- Git push performed: \`${packet.gitPushPerformed}\`\n` +
    `- Source mutated: \`${packet.sourceMutated}\`\n` +
    `- Multi-language doctrine included: \`${packet.multiLanguageProductionDoctrineIncluded}\`\n\n` +
    `## Scope\n\n${packet.scopeSummary}\n\n` +
    `## Validation Suites\n\n${packet.validationSuites.map((item) => `- ${item}`).join("\n")}\n\n` +
    `## Future Boundary\n\nPhase 96 may consume this packet for approved branch editing only after owner review.\n`;
}

export function runApprovedBranchCreationGateV1(config = createDefaultApprovedBranchCreationGateV1(), options = {}) {
  const { blockers, approvedPlan } = inspectConfig(config);
  const artifactRoot = options.artifactRoot ?? path.join(process.cwd(), ".sera-approved-branch-creation-gate");
  fs.mkdirSync(artifactRoot, { recursive: true });

  if (blockers.length > 0) {
    const blockedRecord = {
      ok: false,
      status: "blocked",
      blockers,
      createdAt: new Date().toISOString(),
      phase: "Phase 95",
    };
    const blockedPath = path.join(artifactRoot, "blocked-branch-creation-gate.json");
    writeJson(blockedPath, blockedRecord);
    return { ...blockedRecord, blockedPath };
  }

  const packet = {
    ok: true,
    status: "generated",
    phase: "Phase 95",
    id: approvedPlan.id,
    label: approvedPlan.label,
    branchName: approvedPlan.branchName,
    branchNameSha256: sha256(approvedPlan.branchName),
    baseRef: approvedPlan.baseRef,
    sourceBranchPlanId: approvedPlan.sourceBranchPlanId,
    targetFiles: approvedPlan.targetFiles,
    scopeSummary: approvedPlan.scopeSummary,
    validationSuites: approvedPlan.validationSuites,
    rollbackPlan: approvedPlan.rollbackPlan,
    evidencePacket: approvedPlan.evidencePacket,
    cleanWorkingTreeRequired: approvedPlan.cleanWorkingTreeRequired,
    sandboxBranchPracticeAllowed: approvedPlan.sandboxBranchPracticeAllowed,
    sandboxBranchPracticeOnly: approvedPlan.sandboxBranchPracticeOnly,
    projectRepoBranchCreated: false,
    localGitBranchCreated: false,
    remoteBranchCreated: false,
    gitPushPerformed: false,
    sourceMutated: false,
    patchExecuted: false,
    multiLanguageProductionDoctrineIncluded: true,
    multiLanguageProductionTargets,
    sandboxLearningDoctrine,
    ownerApproval: config.approvalRecord,
    createdAt: new Date().toISOString(),
  };

  const safeBranchMarkerName = approvedPlan.branchName.replaceAll("/", "__");
  const packetJsonPath = path.join(artifactRoot, "branch-creation-packet.json");
  const packetMarkdownPath = path.join(artifactRoot, "branch-creation-packet.md");
  const safetyCheckPath = path.join(artifactRoot, "branch-safety-check.json");
  const approvalPath = path.join(artifactRoot, "owner-approval-record.json");
  const doctrinePath = path.join(artifactRoot, "multi-language-production-doctrine.json");
  const sandboxMarkerPath = path.join(artifactRoot, "sandbox-branch-practice", `${safeBranchMarkerName}.json`);

  writeJson(packetJsonPath, packet);
  writeText(packetMarkdownPath, renderBranchCreationPacketMarkdown(packet));
  writeJson(safetyCheckPath, {
    branchNameSafe: true,
    baseRefDeclared: true,
    cleanWorkingTreeRequired: true,
    projectRepoBranchCreationAllowed: false,
    localGitBranchCreationAllowed: false,
    remoteGitBranchCreationAllowed: false,
    gitPushAllowed: false,
    sourceMutationAllowed: false,
    patchExecutionAllowed: false,
  });
  writeJson(approvalPath, config.approvalRecord);
  writeJson(doctrinePath, multiLanguageProductionTargets);
  writeJson(sandboxMarkerPath, {
    sandboxOnly: true,
    branchName: approvedPlan.branchName,
    branchNameSha256: sha256(approvedPlan.branchName),
    note: "This is a disposable branch-practice marker, not a real Git branch.",
  });

  return {
    ok: true,
    generated: true,
    branchCreationPlanId: approvedPlan.id,
    branchName: approvedPlan.branchName,
    baseRef: approvedPlan.baseRef,
    projectRepoBranchCreated: false,
    localGitBranchCreated: false,
    remoteBranchCreated: false,
    gitPushPerformed: false,
    patchExecuted: false,
    sourceMutated: false,
    sandboxBranchPracticeOnly: true,
    multiLanguageProductionDoctrineIncluded: true,
    packetJsonPath,
    packetMarkdownPath,
    safetyCheckPath,
    approvalPath,
    doctrinePath,
    sandboxMarkerPath,
  };
}

export function runApprovedBranchCreationGateDemoV1(options = {}) {
  const config = createDefaultApprovedBranchCreationGateV1(options);
  return runApprovedBranchCreationGateV1(config, options);
}
