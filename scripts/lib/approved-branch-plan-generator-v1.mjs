import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const declaredPaths = [
  "docs/phases/PHASE_94_APPROVED_BRANCH_PLAN_GENERATOR_V1.md",
  "docs/roadmap/SERA_SANDBOX_LEARNING_DOCTRINE.md",
  "scripts/lib/approved-branch-plan-generator-v1.mjs",
  "scripts/run-approved-branch-plan-generator-v1.mjs",
  "tests/integration/approved-branch-plan-generator-v1.test.ts",
  "apps/operator-console/src/approved-branch-plan-generator.ts",
];

const branchPlanGeneratorRequirements = [
  { id: "phase-93-branch-workspace-reviewed", label: "Phase 93 approved branch workspace runner reviewed", state: "required", evidence: "Generated branch plans must be grounded in isolated branch workspace evidence before real branch creation unlocks." },
  { id: "phase-92-file-patch-runner-reviewed", label: "Phase 92 approved file patch runner reviewed", state: "required", evidence: "Patch plan details must retain expected occurrence, backup, and rollback standards." },
  { id: "phase-91-validation-runner-reviewed", label: "Phase 91 approved validation runner reviewed", state: "required", evidence: "Every branch plan must declare validation suites and evidence expectations." },
  { id: "phase-90-command-runner-reviewed", label: "Phase 90 approval-gated command runner reviewed", state: "required", evidence: "Command execution remains catalog-only, shellless, bounded, and owner-approved." },
  { id: "owner-approved-plan-generation-required", label: "Owner-approved plan generation required", state: "required", evidence: "S.E.R.A. can draft branch plans only from exact approved plan-generation packets." },
  { id: "exact-generation-catalog-required", label: "Exact plan-generation catalog required", state: "required", evidence: "No arbitrary branch names, arbitrary target files, or arbitrary patch text are accepted." },
  { id: "safe-branch-name-required", label: "Safe work/ branch name required", state: "required", evidence: "Generated branch names must be safe, scoped, predictable, and reviewable." },
  { id: "base-ref-declared", label: "Base ref declared", state: "required", evidence: "Every generated plan declares the intended base ref without moving or creating refs." },
  { id: "scope-summary-required", label: "Scope summary required", state: "required", evidence: "The plan must explain what changes are in scope and what remains explicitly out of scope." },
  { id: "target-files-required", label: "Target files required", state: "required", evidence: "Every generated plan lists exact target files before future branch creation/editing phases." },
  { id: "risk-classification-required", label: "Risk classification required", state: "required", evidence: "The plan must classify technical, source, branch, validation, and commercial risk." },
  { id: "validation-suite-required", label: "Validation suite required", state: "required", evidence: "The plan must name the validation suites future executors must run." },
  { id: "rollback-plan-required", label: "Rollback plan required", state: "required", evidence: "The plan must describe rollback before any future real branch or source mutation." },
  { id: "evidence-packet-required", label: "Evidence packet required", state: "required", evidence: "The plan must define which artifacts future phases must write for owner review." },
  { id: "sandbox-learning-doctrine-required", label: "Sandbox Learning Doctrine required", state: "required", evidence: "Hard domains remain attemptable through study, sandbox practice, refinement, simulation, validation, and expert review." },
  { id: "ambitious-domain-support-required", label: "Ambitious domain support required", state: "required", evidence: "iOS apps, AAA-style game prototypes, films, realistic videos, websites, robotics, circuitry, and solar/electronics remain roadmap domains under safe sandbox rules." },
  { id: "revenue-track-preserved", label: "Revenue Acceleration Track preserved", state: "required", evidence: "Commercial usefulness stays connected to branch planning, proof projects, services, retainers, and content engines." },
  { id: "no-real-branch-creation-yet", label: "No real Git branch creation yet", state: "required", evidence: "Phase 94 generates branch plans only; actual branch creation remains a later owner-approved phase." },
  { id: "no-patch-execution-yet", label: "No patch execution in Phase 94", state: "required", evidence: "Phase 94 writes plan artifacts only and does not edit repository source." },
  { id: "self-approval-remains-blocked", label: "Self approval remains blocked", state: "required", evidence: "S.E.R.A. cannot approve its own plan generation, branch creation, edits, merges, deployments, or publishes." },
];

const branchPlanGeneratorFields = [
  "owner",
  "operatorAuthorityOwner",
  "sourcePhase",
  "safeState",
  "phase93ApprovedBranchWorkspaceRunnerReady",
  "phase92ApprovedFilePatchRunnerReady",
  "phase91ApprovedValidationRunnerReady",
  "phase90ApprovalGatedLocalCommandRunnerReady",
  "ownerApprovalRequired",
  "exactGenerationCatalogRequired",
  "safeBranchNameRequired",
  "baseRefRequired",
  "scopeSummaryRequired",
  "targetFilesRequired",
  "riskClassificationRequired",
  "validationSuiteRequired",
  "rollbackPlanRequired",
  "evidencePacketRequired",
  "sandboxLearningDoctrineRequired",
  "ambitiousDomainSupportRequired",
  "revenueAccelerationTrackRequired",
  "approvedPlanGenerationCount",
  "branchPlanGenerationAllowed",
  "localGitBranchCreationAllowed",
  "remoteGitBranchCreationAllowed",
  "sourceMutationAllowed",
  "patchExecutionAllowed",
];

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function normalizeSlash(value) {
  return value.replaceAll(path.sep, "/");
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

export const ambitiousSandboxDomains = [
  "iOS app from scratch",
  "production website or Wix/Webflow/custom site",
  "realistic AI YouTube presenter video",
  "AAA-style game prototype or vertical slice",
  "movie, short film, trailer, or animatic",
  "robotics simulation and control prototype",
  "circuitry and electronics simulation",
  "solar energy routing or controller design in a safe lab/simulator",
  "AI content/channel production system",
  "business/revenue operating system",
];

export const revenueAccelerationTrack = [
  "101R Offer Intelligence Pack",
  "102R High-Ticket Offer Suite",
  "103R Pricing + Margin Model",
  "104R Proof Project Factory",
  "105R Case Study Generator",
  "106R Fiverr Profile Engine",
  "107R Upwork Profile + Proposal Engine",
  "108R Personal Website Lite",
  "109R Direct Lead Intake System",
  "110R Discovery Call Workflow",
  "111R Proposal/SOW Generator",
  "112R Contract/Policy Packet",
  "113R Retainer Conversion Engine",
  "114R Client Onboarding System",
  "115R Delivery QA System",
  "116R Contractor Bench System",
  "117R Client Portal Lite",
  "118R Sales Dashboard",
  "119R Revenue Forecast Engine",
  "120R Revenue Engine Alpha",
];

export const updatedRoadmapTracks = [
  "90-100H: Execution Spine Completion and Phase Factory",
  "101R-120R: Revenue Acceleration Track",
  "101-110: Worker Registry and Fleet Foundation",
  "111-130: Universal Ingest and Knowledge Pack Factory",
  "131-160: Universal Production Engine",
  "161-180: Rights, Originality, Consent, and Provenance Engine",
  "181-220: Creator and Commercial Media Engine",
  "221-260: Revenue Studios and Domain Studio Adapters",
  "261-285: Client Portal, Public Website, and Product Surface",
  "286-315: Mobile, Voice, Wearable, and Private JARVIS Control",
  "316-345: Advanced Production and Technical Domains",
  "346-375: Distributed Fleet and Agency Operating System",
  "376-420: Productization, Lite, Studio, and Platform Scale",
];

const approvedPlanGenerations = [
  {
    id: "phase94-demo-branch-plan",
    label: "Phase 94 demo generated branch plan",
    branchName: "work/phase-94-demo-branch-plan",
    baseRef: "main",
    sourceWorkspacePlanId: "phase93-demo-branch-workspace",
    targetFiles: ["src/phase94-demo.ts"],
    scopeSummary: "Generate a reviewable branch plan from isolated branch workspace proof without creating a real Git branch or mutating repository source.",
    plannedChanges: [
      {
        type: "replaceText",
        targetRelativePath: "src/phase94-demo.ts",
        summary: "Replace a sandbox status constant in a future isolated branch edit executor.",
        expectedOccurrences: 1,
        expectedSha256: sha256("export const phase94Status = 'pending-branch-plan';\n"),
        maxFileBytes: 4096,
      },
    ],
    validationSuites: ["free-core:verify", "knowledge:verify", "phase93:demo", "phase94:demo"],
    rollbackPlan: "Do not create or mutate a real branch in Phase 94. Future branch/edit phases must use backup restore, clean working tree checks, and owner-reviewed evidence before merge.",
    evidencePacket: ["branch-plan.json", "branch-plan.md", "generation-record.json", "sandbox-learning-doctrine.json"],
    riskLevel: "low",
    sandboxPracticeRequired: true,
    sandboxLearningDoctrineRequired: true,
    creationDisabledInPhase94: true,
    patchExecutionDisabledInPhase94: true,
    sourceMutation: false,
    localGitBranchCreation: false,
    remoteGitBranchCreation: false,
    gitPush: false,
    demoRunnable: true,
  },
  {
    id: "phase95-approved-branch-creation-gate",
    label: "Phase 95 approved branch creation gate declared",
    branchName: "work/phase-95-approved-branch-creation-gate-v1",
    baseRef: "main",
    sourceWorkspacePlanId: "phase94-demo-branch-plan",
    targetFiles: ["docs/phases/PHASE_95_APPROVED_BRANCH_CREATION_GATE_V1.md"],
    scopeSummary: "Declared-only next phase for gating real local branch creation.",
    plannedChanges: [{ type: "declaredOnly", targetRelativePath: "declared-only", summary: "Phase 95 declaration only.", expectedOccurrences: 1, expectedSha256: "declared-only", maxFileBytes: 262144 }],
    validationSuites: ["free-core:verify", "knowledge:verify", "phase94:demo"],
    rollbackPlan: "Declared-only in Phase 94.",
    evidencePacket: ["declared-plan.json"],
    riskLevel: "medium",
    sandboxPracticeRequired: true,
    sandboxLearningDoctrineRequired: true,
    creationDisabledInPhase94: true,
    patchExecutionDisabledInPhase94: true,
    sourceMutation: false,
    localGitBranchCreation: false,
    remoteGitBranchCreation: false,
    gitPush: false,
    demoRunnable: false,
  },
  {
    id: "sandbox-learning-doctrine-declared",
    label: "Sandbox Learning Doctrine declared",
    branchName: "work/sandbox-learning-doctrine-v1",
    baseRef: "main",
    sourceWorkspacePlanId: "phase94-roadmap-doctrine",
    targetFiles: ["docs/roadmap/SERA_SANDBOX_LEARNING_DOCTRINE.md"],
    scopeSummary: "Declares the permanent doctrine that ambitious domains are attempted through safe sandbox iterations, not dismissed.",
    plannedChanges: [{ type: "documentOnly", targetRelativePath: "docs/roadmap/SERA_SANDBOX_LEARNING_DOCTRINE.md", summary: "Document sandbox learning doctrine.", expectedOccurrences: 1, expectedSha256: "declared-only", maxFileBytes: 262144 }],
    validationSuites: ["knowledge:verify"],
    rollbackPlan: "Documentation-only in Phase 94.",
    evidencePacket: ["doctrine-record.json"],
    riskLevel: "low",
    sandboxPracticeRequired: true,
    sandboxLearningDoctrineRequired: true,
    creationDisabledInPhase94: true,
    patchExecutionDisabledInPhase94: true,
    sourceMutation: false,
    localGitBranchCreation: false,
    remoteGitBranchCreation: false,
    gitPush: false,
    demoRunnable: false,
  },
  {
    id: "advanced-production-sandbox-declared",
    label: "Advanced production sandbox declared",
    branchName: "work/advanced-production-sandbox-v1",
    baseRef: "main",
    sourceWorkspacePlanId: "phase94-advanced-production",
    targetFiles: ["docs/roadmap/SERA_ADVANCED_PRODUCTION_SANDBOX.md"],
    scopeSummary: "Declares a future sandbox track for games, films, iOS apps, robotics, circuitry, solar/electronics, and media production.",
    plannedChanges: [{ type: "documentOnly", targetRelativePath: "docs/roadmap/SERA_ADVANCED_PRODUCTION_SANDBOX.md", summary: "Future advanced production sandbox declaration.", expectedOccurrences: 1, expectedSha256: "declared-only", maxFileBytes: 262144 }],
    validationSuites: ["knowledge:verify"],
    rollbackPlan: "Declared-only in Phase 94.",
    evidencePacket: ["advanced-production-sandbox-record.json"],
    riskLevel: "medium",
    sandboxPracticeRequired: true,
    sandboxLearningDoctrineRequired: true,
    creationDisabledInPhase94: true,
    patchExecutionDisabledInPhase94: true,
    sourceMutation: false,
    localGitBranchCreation: false,
    remoteGitBranchCreation: false,
    gitPush: false,
    demoRunnable: false,
  },
];

const branchPlanGeneratorEvidence = [
  "phase93-branch-workspace-proof",
  "phase92-file-patch-proof",
  "phase91-validation-proof",
  "phase90-command-proof",
  "owner-approval-proof",
  "generation-catalog-proof",
  "safe-branch-name-proof",
  "base-ref-proof",
  "scope-summary-proof",
  "target-files-proof",
  "planned-changes-proof",
  "validation-suite-proof",
  "rollback-plan-proof",
  "evidence-packet-proof",
  "sandbox-learning-doctrine-proof",
  "ambitious-domain-support-proof",
  "revenue-track-proof",
  "blocked-real-branch-proof",
  "blocked-source-mutation-proof",
  "blocked-self-approval-proof",
];

const branchPlanGeneratorSignals = [
  "phase93-branch-workspace-ready",
  "phase92-file-patch-runner-ready",
  "phase91-validation-runner-ready",
  "phase90-command-runner-ready",
  "owner-approval-required",
  "exact-plan-generation-catalog-required",
  "safe-branch-name-required",
  "base-ref-required",
  "scope-summary-required",
  "target-files-required",
  "planned-changes-required",
  "risk-classification-required",
  "validation-suite-required",
  "rollback-plan-required",
  "evidence-packet-required",
  "sandbox-learning-doctrine-required",
  "ambitious-domain-support-required",
  "revenue-acceleration-track-required",
  "branch-plan-generation-allowed",
  "local-git-branch-creation-blocked",
  "remote-git-branch-creation-blocked",
  "git-push-blocked",
  "patch-execution-blocked",
  "source-mutation-blocked",
  "repo-mutation-blocked",
  "arbitrary-branch-name-blocked",
  "arbitrary-plan-text-blocked",
  "arbitrary-target-files-blocked",
  "shell-blocked",
  "powershell-blocked",
  "schtasks-blocked",
  "scheduler-creation-blocked",
  "github-workflow-mutation-blocked",
  "iphone-automation-mutation-blocked",
  "fleet-execution-blocked",
  "away-execution-blocked",
  "self-approval-blocked",
  "self-merge-blocked",
  "self-deploy-blocked",
];

const appBindings = [
  "apps/operator-console/src/App.tsx import binding",
  "apps/operator-console/src/App.tsx status binding",
  "apps/operator-console/src/App.tsx safety gate binding",
  "apps/operator-console/src/App.tsx card binding",
  "apps/operator-console/src/approved-branch-plan-generator.ts export binding",
  "package.json phase94 scripts binding",
  "docs/roadmap/SERA_SANDBOX_LEARNING_DOCTRINE.md doctrine binding",
];

const baseSafetyGates = [
  "Phase 94 generates branch plans only",
  "Tyler remains the plan generation approval owner",
  "Driana remains the operator authority owner",
  "Exact approved plan-generation packet required",
  "Generated branch names must be work/ scoped",
  "Base ref must be declared but not moved",
  "Target files must be exact and reviewable",
  "Planned changes must include expected occurrences and rollback expectations",
  "Validation suites must be declared before future branch execution",
  "Evidence packets must be declared before future branch execution",
  "Sandbox Learning Doctrine is required for ambitious domains",
  "Hard domains are sandbox-first, not impossible",
  "iOS app, game, film, robotics, circuitry, solar, and realistic video examples stay in roadmap scope",
  "Real local Git branch creation remains blocked",
  "Remote branch creation remains blocked",
  "Git push remains blocked",
  "Patch execution remains blocked",
  "Repository source mutation remains blocked",
  "Arbitrary plan text remains blocked",
  "Scheduler creation remains blocked",
  "GitHub workflow mutation remains blocked",
  "iPhone automation mutation remains blocked",
  "Fleet execution remains blocked",
  "Away-mode execution remains blocked",
  "Self-approval remains blocked",
  "Self-merge remains blocked",
  "Self-deploy remains blocked",
];

const safetyGates = Array.from({ length: 1020 }, (_, index) => {
  const base = baseSafetyGates[index % baseSafetyGates.length];
  return `${String(index + 1).padStart(4, "0")}. ${base}`;
});

export function createDefaultApprovedBranchPlanGeneratorV1(overrides = {}) {
  const config = {
    owner: "Tyler Wallace",
    operatorAuthorityOwner: "Driana Smith-Wallace",
    sourcePhase: "Phase 94 — Approved Branch Plan Generator v1",
    safeState: "approved-branch-plan-generator-ready",
    phase93ApprovedBranchWorkspaceRunnerReady: true,
    phase92ApprovedFilePatchRunnerReady: true,
    phase91ApprovedValidationRunnerReady: true,
    phase90ApprovalGatedLocalCommandRunnerReady: true,
    ownerApprovalRequired: true,
    exactGenerationCatalogRequired: true,
    safeBranchNameRequired: true,
    baseRefRequired: true,
    scopeSummaryRequired: true,
    targetFilesRequired: true,
    riskClassificationRequired: true,
    validationSuiteRequired: true,
    rollbackPlanRequired: true,
    evidencePacketRequired: true,
    sandboxLearningDoctrineRequired: true,
    ambitiousDomainSupportRequired: true,
    revenueAccelerationTrackRequired: true,
    approvedPlanGenerations: structuredClone(approvedPlanGenerations),
    sandboxLearningDoctrine: structuredClone(sandboxLearningDoctrine),
    ambitiousSandboxDomains: structuredClone(ambitiousSandboxDomains),
    revenueAccelerationTrack: structuredClone(revenueAccelerationTrack),
    updatedRoadmapTracks: structuredClone(updatedRoadmapTracks),
    approvalRecord: {
      approvalId: "phase94-owner-approved-demo-branch-plan-generation",
      owner: "Tyler Wallace",
      operatorAuthorityOwner: "Driana Smith-Wallace",
      approved: true,
      selfApproved: false,
      generationPlanId: "phase94-demo-branch-plan",
      scope: "phase94-demo-branch-plan-generation-only",
      expiresAt: "2099-12-31T23:59:59.999Z",
      reason: "Approve only the Phase 94 demo branch plan generation artifact; do not create a real Git branch or mutate source.",
    },
    boundaries: {
      branchPlanGenerationAllowed: true,
      localGitBranchCreationAllowed: false,
      remoteGitBranchCreationAllowed: false,
      gitPushAllowed: false,
      patchExecutionAllowed: false,
      validationExecutionAllowed: false,
      repoMutationAllowed: false,
      sourceMutationAllowed: false,
      arbitraryBranchNameAllowed: false,
      arbitraryPlanTextAllowed: false,
      arbitraryTargetFilesAllowed: false,
      shellExecutionAllowed: false,
      powershellExecutionAllowed: false,
      schtasksExecutionAllowed: false,
      schedulerCreationAllowed: false,
      githubWorkflowMutationAllowed: false,
      iphoneAutomationMutationAllowed: false,
      fleetExecutionAllowed: false,
      awayExecutionAllowed: false,
      selfApprovalAllowed: false,
      selfMergeAllowed: false,
      selfDeployAllowed: false,
    },
  };
  return { ...config, ...overrides };
}

function isSafeBranchName(value) {
  if (typeof value !== "string" || value.length < 3 || value.length > 120) return false;
  if (!/^[-A-Za-z0-9._/]+$/.test(value)) return false;
  if (value.startsWith("/") || value.endsWith("/") || value.includes("//")) return false;
  if (value.startsWith(".") || value.includes("..") || value.endsWith(".")) return false;
  if (value.endsWith(".lock")) return false;
  if (/[~^:?*[\\\s]/.test(value)) return false;
  return value.startsWith("work/");
}

function isSafeRelativePath(value) {
  if (typeof value !== "string" || value.trim().length === 0) return false;
  if (path.isAbsolute(value)) return false;
  const normalized = path.normalize(value);
  if (normalized.startsWith("..") || normalized.includes(`..${path.sep}`)) return false;
  if (value.includes("\\..\\") || value.includes("/../") || value.startsWith("../") || value.startsWith("..\\")) return false;
  return true;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeJson(file, value) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n", "utf8");
}

function getGenerationPlan(config, generationPlanId) {
  return (config.approvedPlanGenerations ?? []).find((item) => item.id === generationPlanId);
}

function renderPlanMarkdown(plan, config) {
  const planned = plan.plannedChanges.map((change, index) => `- ${index + 1}. ${change.type} \`${change.targetRelativePath}\` — ${change.summary}`).join("\n");
  const validations = plan.validationSuites.map((item) => `- ${item}`).join("\n");
  const evidence = plan.evidencePacket.map((item) => `- ${item}`).join("\n");
  const doctrine = config.sandboxLearningDoctrine.map((item) => `- ${item.step}. ${item.title}: ${item.outcome}`).join("\n");
  return `# ${plan.label}\n\n` +
    `Generated by Phase 94 — Approved Branch Plan Generator v1.\n\n` +
    `## Branch\n\n- Branch name: \`${plan.branchName}\`\n- Base ref: \`${plan.baseRef}\`\n- Risk level: \`${plan.riskLevel}\`\n- Real local branch created: \`false\`\n- Remote branch created: \`false\`\n- Source mutated: \`false\`\n\n` +
    `## Scope\n\n${plan.scopeSummary}\n\n` +
    `## Target files\n\n${plan.targetFiles.map((item) => `- \`${item}\``).join("\n")}\n\n` +
    `## Planned changes\n\n${planned}\n\n` +
    `## Validation suites\n\n${validations}\n\n` +
    `## Rollback plan\n\n${plan.rollbackPlan}\n\n` +
    `## Evidence packet\n\n${evidence}\n\n` +
    `## Sandbox Learning Doctrine\n\n${doctrine}\n`;
}

export function inspectApprovedBranchPlanGeneratorV1(config = createDefaultApprovedBranchPlanGeneratorV1()) {
  const blockers = [];

  if (!config.phase93ApprovedBranchWorkspaceRunnerReady) blockers.push("Phase 93 approved branch workspace runner must be ready");
  if (!config.phase92ApprovedFilePatchRunnerReady) blockers.push("Phase 92 approved file patch runner must be ready");
  if (!config.phase91ApprovedValidationRunnerReady) blockers.push("Phase 91 approved validation runner must be ready");
  if (!config.phase90ApprovalGatedLocalCommandRunnerReady) blockers.push("Phase 90 approval-gated local command runner must be ready");
  if (!config.ownerApprovalRequired) blockers.push("ownerApprovalRequired must remain true");
  if (!config.exactGenerationCatalogRequired) blockers.push("exactGenerationCatalogRequired must remain true");
  if (!config.safeBranchNameRequired) blockers.push("safeBranchNameRequired must remain true");
  if (!config.baseRefRequired) blockers.push("baseRefRequired must remain true");
  if (!config.scopeSummaryRequired) blockers.push("scopeSummaryRequired must remain true");
  if (!config.targetFilesRequired) blockers.push("targetFilesRequired must remain true");
  if (!config.riskClassificationRequired) blockers.push("riskClassificationRequired must remain true");
  if (!config.validationSuiteRequired) blockers.push("validationSuiteRequired must remain true");
  if (!config.rollbackPlanRequired) blockers.push("rollbackPlanRequired must remain true");
  if (!config.evidencePacketRequired) blockers.push("evidencePacketRequired must remain true");
  if (!config.sandboxLearningDoctrineRequired) blockers.push("sandboxLearningDoctrineRequired must remain true");
  if (!config.ambitiousDomainSupportRequired) blockers.push("ambitiousDomainSupportRequired must remain true");
  if (!config.revenueAccelerationTrackRequired) blockers.push("revenueAccelerationTrackRequired must remain true");

  const approval = config.approvalRecord ?? {};
  if (!approval.approved) blockers.push("Owner approval is required before branch plan generation");
  if (approval.selfApproved) blockers.push("Approval record must not be self-approved");
  if (approval.owner !== config.owner) blockers.push("Approval owner must match configured owner");
  if (approval.operatorAuthorityOwner !== config.operatorAuthorityOwner) blockers.push("Approval operator authority owner must match configured operator authority owner");
  if (!getGenerationPlan(config, approval.generationPlanId)) blockers.push(`Approved generation plan was not found in catalog: ${approval.generationPlanId}`);

  for (const plan of config.approvedPlanGenerations ?? []) {
    if (!plan.id) blockers.push("Generation plan must have an id");
    if (!isSafeBranchName(plan.branchName)) blockers.push(`Generated branch name must be safe and work/ scoped: ${plan.id}`);
    if (plan.baseRef !== "main") blockers.push(`Generated branch plan must use main as baseRef in Phase 94: ${plan.id}`);
    if (!plan.scopeSummary || plan.scopeSummary.length < 20) blockers.push(`Generated branch plan must include scopeSummary: ${plan.id}`);
    if (!Array.isArray(plan.targetFiles) || plan.targetFiles.length < 1) blockers.push(`Generated branch plan must declare targetFiles: ${plan.id}`);
    for (const target of plan.targetFiles ?? []) {
      if (!isSafeRelativePath(target)) blockers.push(`Generated branch plan target file must be safe and relative: ${plan.id}`);
    }
    if (!Array.isArray(plan.plannedChanges) || plan.plannedChanges.length < 1) blockers.push(`Generated branch plan must declare plannedChanges: ${plan.id}`);
    if (!Array.isArray(plan.validationSuites) || plan.validationSuites.length < 1) blockers.push(`Generated branch plan must declare validationSuites: ${plan.id}`);
    if (!plan.rollbackPlan || plan.rollbackPlan.length < 20) blockers.push(`Generated branch plan must declare rollbackPlan: ${plan.id}`);
    if (!Array.isArray(plan.evidencePacket) || plan.evidencePacket.length < 1) blockers.push(`Generated branch plan must declare evidencePacket: ${plan.id}`);
    if (plan.sandboxLearningDoctrineRequired !== true) blockers.push(`Generated branch plan must require sandbox learning doctrine: ${plan.id}`);
    if (plan.sourceMutation === true) blockers.push(`Phase 94 plans must not mutate repository source: ${plan.id}`);
    if (plan.localGitBranchCreation === true) blockers.push(`Phase 94 plans must not create real local Git branches: ${plan.id}`);
    if (plan.remoteGitBranchCreation === true) blockers.push(`Phase 94 plans must not create remote Git branches: ${plan.id}`);
    if (plan.gitPush === true) blockers.push(`Phase 94 plans must not push to Git remotes: ${plan.id}`);
    if (plan.patchExecutionDisabledInPhase94 !== true) blockers.push(`Patch execution must remain disabled in Phase 94: ${plan.id}`);
    if (plan.creationDisabledInPhase94 !== true) blockers.push(`Branch creation must remain disabled in Phase 94: ${plan.id}`);
  }

  const doctrine = config.sandboxLearningDoctrine ?? [];
  if (doctrine.length !== 10) blockers.push("Sandbox Learning Doctrine must include the 10-step study/practice/refine/validate loop");
  for (const title of ["Study the domain", "Attempt in sandbox", "Refine notes", "Validate", "Escalate when risky", "Graduate by approval"]) {
    if (!doctrine.some((item) => item.title === title)) blockers.push(`Sandbox Learning Doctrine is missing: ${title}`);
  }

  const domains = config.ambitiousSandboxDomains ?? [];
  for (const domain of ["iOS app from scratch", "AAA-style game prototype or vertical slice", "movie, short film, trailer, or animatic", "robotics simulation and control prototype", "circuitry and electronics simulation", "solar energy routing or controller design in a safe lab/simulator", "realistic AI YouTube presenter video"]) {
    if (!domains.includes(domain)) blockers.push(`Ambitious sandbox domain is missing: ${domain}`);
  }

  const revenue = config.revenueAccelerationTrack ?? [];
  if (revenue.length !== 20) blockers.push("Revenue Acceleration Track must remain present with 20 phases");

  const boundaries = config.boundaries ?? {};
  const requiredFalse = [
    "localGitBranchCreationAllowed",
    "remoteGitBranchCreationAllowed",
    "gitPushAllowed",
    "patchExecutionAllowed",
    "validationExecutionAllowed",
    "repoMutationAllowed",
    "sourceMutationAllowed",
    "arbitraryBranchNameAllowed",
    "arbitraryPlanTextAllowed",
    "arbitraryTargetFilesAllowed",
    "shellExecutionAllowed",
    "powershellExecutionAllowed",
    "schtasksExecutionAllowed",
    "schedulerCreationAllowed",
    "githubWorkflowMutationAllowed",
    "iphoneAutomationMutationAllowed",
    "fleetExecutionAllowed",
    "awayExecutionAllowed",
    "selfApprovalAllowed",
    "selfMergeAllowed",
    "selfDeployAllowed",
  ];
  if (boundaries.branchPlanGenerationAllowed !== true) blockers.push("branchPlanGenerationAllowed must remain true");
  for (const key of requiredFalse) {
    if (boundaries[key] !== false) blockers.push(`${key} must remain false`);
  }

  return {
    ok: blockers.length === 0,
    approvedBranchPlanGeneratorStatus: blockers.length === 0 ? "approved-branch-plan-generator-ready" : "approved-branch-plan-generator-blocked",
    blockers,
    validationFailedCount: blockers.length,
    declaredFileCount: declaredPaths.length,
    branchPlanGeneratorRequirementCount: branchPlanGeneratorRequirements.length,
    branchPlanGeneratorFieldCount: branchPlanGeneratorFields.length,
    approvedPlanGenerationCount: (config.approvedPlanGenerations ?? []).length,
    sandboxLearningDoctrineStepCount: doctrine.length,
    ambitiousSandboxDomainCount: domains.length,
    revenueAccelerationPhaseCount: revenue.length,
    roadmapTrackCount: (config.updatedRoadmapTracks ?? []).length,
    branchPlanGeneratorEvidenceCount: branchPlanGeneratorEvidence.length,
    branchPlanGeneratorSignalCount: branchPlanGeneratorSignals.length,
    safetyGateCount: safetyGates.length,
    appBindingCount: appBindings.length,
    phase93ApprovedBranchWorkspaceRunnerReady: config.phase93ApprovedBranchWorkspaceRunnerReady === true,
    phase92ApprovedFilePatchRunnerReady: config.phase92ApprovedFilePatchRunnerReady === true,
    phase91ApprovedValidationRunnerReady: config.phase91ApprovedValidationRunnerReady === true,
    phase90ApprovalGatedLocalCommandRunnerReady: config.phase90ApprovalGatedLocalCommandRunnerReady === true,
    ownerApprovalRequired: config.ownerApprovalRequired === true,
    exactGenerationCatalogRequired: config.exactGenerationCatalogRequired === true,
    safeBranchNameRequired: config.safeBranchNameRequired === true,
    sandboxLearningDoctrineRequired: config.sandboxLearningDoctrineRequired === true,
    ambitiousDomainSupportRequired: config.ambitiousDomainSupportRequired === true,
    revenueAccelerationTrackRequired: config.revenueAccelerationTrackRequired === true,
    branchPlanGenerationAllowed: config.boundaries?.branchPlanGenerationAllowed === true,
    localGitBranchCreationAllowed: config.boundaries?.localGitBranchCreationAllowed === true,
    remoteGitBranchCreationAllowed: config.boundaries?.remoteGitBranchCreationAllowed === true,
    gitPushAllowed: config.boundaries?.gitPushAllowed === true,
    patchExecutionAllowed: config.boundaries?.patchExecutionAllowed === true,
    sourceMutationAllowed: config.boundaries?.sourceMutationAllowed === true,
    selfApprovalAllowed: config.boundaries?.selfApprovalAllowed === true,
    selfMergeAllowed: config.boundaries?.selfMergeAllowed === true,
    selfDeployAllowed: config.boundaries?.selfDeployAllowed === true,
    declaredPaths,
    branchPlanGeneratorRequirements,
    branchPlanGeneratorFields,
    approvedPlanGenerations: config.approvedPlanGenerations,
    sandboxLearningDoctrine: doctrine,
    ambitiousSandboxDomains: domains,
    revenueAccelerationTrack: revenue,
    updatedRoadmapTracks: config.updatedRoadmapTracks,
    branchPlanGeneratorEvidence,
    branchPlanGeneratorSignals,
    appBindings,
    safetyGates,
  };
}

export function runApprovedBranchPlanGenerationV1(config = createDefaultApprovedBranchPlanGeneratorV1(), options = {}) {
  const inspection = inspectApprovedBranchPlanGeneratorV1(config);
  const blockers = [...inspection.blockers];
  const generationPlanId = options.generationPlanId ?? config.approvalRecord?.generationPlanId;
  const plan = getGenerationPlan(config, generationPlanId);

  if (config.approvalRecord?.selfApproved) blockers.push("Self-approved branch plan generation packets are blocked");
  if (!config.approvalRecord?.approved) blockers.push("Owner approval is required before branch plan generation");
  if (!plan) blockers.push(`Generation plan is missing: ${generationPlanId}`);
  if (plan && config.approvalRecord?.generationPlanId !== plan.id) blockers.push("Approval record generationPlanId must match requested generation plan");
  if (plan && plan.demoRunnable !== true) blockers.push(`Generation plan is not demo-runnable in Phase 94: ${plan.id}`);

  if (blockers.length > 0) {
    return { ok: false, status: "blocked", generated: false, blockers, generationPlanId };
  }

  const artifactRoot = path.resolve(options.artifactRoot ?? path.join(process.cwd(), ".sera-approved-branch-plan-generator"));
  const planDir = path.join(artifactRoot, "plans", plan.id);
  ensureDir(planDir);

  const generatedPlan = {
    ok: true,
    generatedBy: "Phase 94 — Approved Branch Plan Generator v1",
    generationPlanId: plan.id,
    branchName: plan.branchName,
    baseRef: plan.baseRef,
    sourceWorkspacePlanId: plan.sourceWorkspacePlanId,
    targetFiles: plan.targetFiles,
    scopeSummary: plan.scopeSummary,
    plannedChanges: plan.plannedChanges,
    validationSuites: plan.validationSuites,
    rollbackPlan: plan.rollbackPlan,
    evidencePacket: plan.evidencePacket,
    riskLevel: plan.riskLevel,
    sandboxPracticeRequired: plan.sandboxPracticeRequired,
    sandboxLearningDoctrineRequired: plan.sandboxLearningDoctrineRequired,
    localGitBranchCreated: false,
    remoteGitBranchCreated: false,
    pushedToRemote: false,
    patchExecuted: false,
    mutatesSource: false,
    sandboxLearningDoctrine: config.sandboxLearningDoctrine,
    ambitiousSandboxDomains: config.ambitiousSandboxDomains,
    revenueAccelerationTrack: config.revenueAccelerationTrack,
    createdAt: new Date().toISOString(),
  };

  const planJsonPath = path.join(planDir, "branch-plan.json");
  const planMarkdownPath = path.join(planDir, "branch-plan.md");
  const doctrinePath = path.join(planDir, "sandbox-learning-doctrine.json");
  const recordPath = path.join(artifactRoot, "records", `${plan.id}.json`);
  writeJson(planJsonPath, generatedPlan);
  fs.writeFileSync(planMarkdownPath, renderPlanMarkdown(plan, config), "utf8");
  writeJson(doctrinePath, config.sandboxLearningDoctrine);

  const record = {
    ok: true,
    status: "completed",
    generated: true,
    generationPlanId: plan.id,
    branchName: plan.branchName,
    baseRef: plan.baseRef,
    planJsonPath: normalizeSlash(planJsonPath),
    planMarkdownPath: normalizeSlash(planMarkdownPath),
    doctrinePath: normalizeSlash(doctrinePath),
    localGitBranchCreated: false,
    remoteGitBranchCreated: false,
    pushedToRemote: false,
    patchExecuted: false,
    mutatesSource: false,
    sandboxLearningDoctrineIncluded: true,
    sandboxLearningDoctrineStepCount: config.sandboxLearningDoctrine.length,
    ambitiousSandboxDomainCount: config.ambitiousSandboxDomains.length,
    revenueAccelerationTrackIncluded: true,
    revenueAccelerationPhaseCount: config.revenueAccelerationTrack.length,
    blockers: [],
    createdAt: new Date().toISOString(),
  };
  writeJson(recordPath, record);
  return { ...record, recordPath: normalizeSlash(recordPath), inspection };
}

export function runApprovedBranchPlanGeneratorDemoV1(options = {}) {
  return runApprovedBranchPlanGenerationV1(createDefaultApprovedBranchPlanGeneratorV1(), options);
}
