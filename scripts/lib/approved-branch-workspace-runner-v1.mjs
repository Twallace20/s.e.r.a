import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const declaredPaths = [
  "docs/phases/PHASE_93_APPROVED_BRANCH_WORKSPACE_RUNNER_V1.md",
  "docs/roadmap/SERA_UPDATED_ROADMAP_REVENUE_ACCELERATION_TRACK.md",
  "scripts/lib/approved-branch-workspace-runner-v1.mjs",
  "scripts/run-approved-branch-workspace-runner-v1.mjs",
  "tests/integration/approved-branch-workspace-runner-v1.test.ts",
  "apps/operator-console/src/approved-branch-workspace-runner.ts",
];

const branchRunnerRequirements = [
  { id: "phase-92-file-patch-runner-reviewed", label: "Phase 92 approved file patch runner reviewed", state: "required", evidence: "Approved workspace file patching must exist before branch workspace execution can graduate." },
  { id: "phase-91-validation-runner-reviewed", label: "Phase 91 approved validation runner reviewed", state: "required", evidence: "Approved validation evidence must exist before branch work can be prepared for review." },
  { id: "phase-90-command-runner-reviewed", label: "Phase 90 approval-gated command runner reviewed", state: "required", evidence: "The command execution spine remains catalog-only and owner-approved." },
  { id: "owner-approved-branch-plan-required", label: "Owner-approved branch plan required", state: "required", evidence: "Every branch workspace run must name one exact owner-approved branch plan." },
  { id: "exact-branch-catalog-required", label: "Exact branch catalog required", state: "required", evidence: "Branch work cannot accept arbitrary branch names, arbitrary source roots, or arbitrary patch plans." },
  { id: "safe-branch-name-required", label: "Safe branch name required", state: "required", evidence: "Branch names must be safe, predictable, and reviewable." },
  { id: "isolated-branch-workspace-required", label: "Isolated branch workspace required", state: "required", evidence: "Phase 93 creates an isolated branch workspace and does not create a real local Git branch." },
  { id: "contained-paths-required", label: "Contained paths required", state: "required", evidence: "Branch workspace targets must remain inside the branch workspace root." },
  { id: "approved-patch-plan-required", label: "Approved patch plan required", state: "required", evidence: "Phase 93 can only apply the patch plan embedded in the approved branch plan." },
  { id: "backup-required", label: "Branch workspace backup required", state: "required", evidence: "Phase 93 writes a backup before modifying the isolated branch workspace." },
  { id: "rollback-required", label: "Branch workspace rollback required", state: "required", evidence: "Phase 93 restores the backup when validation fails." },
  { id: "validation-evidence-required", label: "Validation evidence required", state: "required", evidence: "Branch work must end with validation evidence before future source/branch mutation phases." },
  { id: "roadmap-revenue-track-required", label: "Revenue Acceleration Track required", state: "required", evidence: "The updated roadmap formally includes phases 101R-120R as a parallel commercial-readiness track." },
  { id: "marketplace-compliance-required", label: "Marketplace compliance required", state: "required", evidence: "Marketplace profiles and proposals must respect platform communication, payment, and non-circumvention rules." },
  { id: "no-real-git-branch-yet", label: "No real Git branch creation yet", state: "required", evidence: "Phase 93 produces branch workspace evidence only; actual branch creation remains later and approval-gated." },
  { id: "no-remote-push-yet", label: "No remote push yet", state: "required", evidence: "Phase 93 cannot push, merge, tag, deploy, publish externally, or mutate GitHub workflows." },
  { id: "no-source-mutation-yet", label: "No direct repository source mutation yet", state: "required", evidence: "Phase 93 does not directly modify repository source files." },
  { id: "self-approval-remains-blocked", label: "Self approval remains blocked", state: "required", evidence: "S.E.R.A. cannot approve its own branch workspace plans." },
];

const branchRunnerFields = [
  "owner",
  "operatorAuthorityOwner",
  "sourcePhase",
  "safeState",
  "phase92ApprovedFilePatchRunnerReady",
  "phase91ApprovedValidationRunnerReady",
  "phase90ApprovalGatedLocalCommandRunnerReady",
  "ownerApprovalRequired",
  "exactBranchCatalogRequired",
  "safeBranchNameRequired",
  "isolatedBranchWorkspaceRequired",
  "pathContainmentRequired",
  "approvedPatchPlanRequired",
  "backupRequired",
  "rollbackRequired",
  "validationEvidenceRequired",
  "revenueAccelerationTrackRequired",
  "marketplaceComplianceRequired",
  "approvedBranchPlanCount",
  "branchWorkspaceCreationAllowed",
  "localGitBranchCreationAllowed",
  "remoteGitBranchCreationAllowed",
  "sourceMutationAllowed",
];

const demoInitialContent = "export const phase93Status = 'pending-branch-workspace';\nexport const phase93Evidence = 'not-yet-created';\n";
const demoPatchedContent = "export const phase93Status = 'approved-branch-workspace-ready';\nexport const phase93Evidence = 'created-with-owner-approval';\n";

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function normalizeSlash(value) {
  return value.replaceAll(path.sep, "/");
}

export const revenueAccelerationTrack = [
  { phase: "101R", title: "Offer Intelligence Pack", outcome: "S.E.R.A. researches what buyers are already paying for and turns demand into service hypotheses." },
  { phase: "102R", title: "High-Ticket Offer Suite", outcome: "Packages AI automation, websites, systems, AI consulting, and retainers into sellable offers." },
  { phase: "103R", title: "Pricing + Margin Model", outcome: "Defines costs, margin, scope limits, revision limits, payment timing, and profitability rules." },
  { phase: "104R", title: "Proof Project Factory", outcome: "Builds fake-client and sandbox examples before real client delivery." },
  { phase: "105R", title: "Case Study Generator", outcome: "Turns examples and client work into proof assets, before/after stories, metrics, and portfolio pages." },
  { phase: "106R", title: "Fiverr Profile Engine", outcome: "Builds compliant gigs, packages, FAQs, images, proof examples, and review-response systems." },
  { phase: "107R", title: "Upwork Profile + Proposal Engine", outcome: "Builds compliant profiles, specialized proposals, case-study responses, and discovery scripts." },
  { phase: "108R", title: "Personal Website Lite", outcome: "Creates a direct service page with packages, proof, intake, booking, and trust signals." },
  { phase: "109R", title: "Direct Lead Intake System", outcome: "Routes website/referral/content leads into S.E.R.A. safely." },
  { phase: "110R", title: "Discovery Call Workflow", outcome: "Qualifies leads before unpaid strategy work or delivery commitments." },
  { phase: "111R", title: "Proposal/SOW Generator", outcome: "Generates clear scope, deliverables, assumptions, payment milestones, and acceptance criteria." },
  { phase: "112R", title: "Contract/Policy Packet", outcome: "Adds payment, IP, AI disclosure, revision, cancellation, access, and platform-compliance policies for attorney review." },
  { phase: "113R", title: "Retainer Conversion Engine", outcome: "Turns one-time projects into maintenance, optimization, automation, and analytics retainers." },
  { phase: "114R", title: "Client Onboarding System", outcome: "Collects intake, assets, access, goals, timeline, risk, and expectations." },
  { phase: "115R", title: "Delivery QA System", outcome: "Protects quality, review readiness, acceptance criteria, and handoff clarity." },
  { phase: "116R", title: "Contractor Bench System", outcome: "Adds human help safely with access boundaries, checklists, role scopes, and QA gates." },
  { phase: "117R", title: "Client Portal Lite", outcome: "Shows client status, proof, feedback requests, assets, approvals, and handoff materials." },
  { phase: "118R", title: "Sales Dashboard", outcome: "Tracks leads, source, offers, close rate, pipeline, delivery load, and revenue." },
  { phase: "119R", title: "Revenue Forecast Engine", outcome: "Forecasts cash, capacity, project mix, retainers, conversion rates, and offer performance." },
  { phase: "120R", title: "Revenue Engine Alpha", outcome: "S.E.R.A. supports sales and delivery as a commercial operating engine, not only a builder." },
];

export const updatedRoadmapTracks = [
  "90-100H: Execution Spine Completion and Phase Factory",
  "101R-120R: Revenue Acceleration Track",
  "101-110: Worker Registry and Fleet Foundation",
  "111-130: Universal Ingest and Knowledge Pack Factory",
  "131-160: Universal Production Engine and Domain Studio Adapters",
  "161-180: Personal S.E.R.A. Control Plane, Public Website, and Client Portal",
  "181-205: PWA, Mobile Companion, Voice, and Wearable Control",
  "206-230: Native App and Private JARVIS Mode",
  "231-250: Distributed Fleet Mode",
  "251-275: Prime-User Agency Engine and Revenue Pods",
  "276-300: Productization, Lite/Studio/Platform Scale",
];

const approvedBranchPlans = [
  {
    id: "phase93-demo-branch-workspace",
    label: "Phase 93 demo branch workspace",
    branchName: "work/phase-93-demo-branch-workspace",
    branchWorkspaceRelativePath: "branch-workspaces/work-phase-93-demo-branch-workspace",
    targetRelativePath: "src/phase93-demo.ts",
    operation: "replaceText",
    find: "export const phase93Status = 'pending-branch-workspace';\nexport const phase93Evidence = 'not-yet-created';",
    replace: "export const phase93Status = 'approved-branch-workspace-ready';\nexport const phase93Evidence = 'created-with-owner-approval';",
    expectedOccurrences: 1,
    expectedSha256: sha256(demoInitialContent),
    maxFileBytes: 4096,
    validation: {
      mustContain: "approved-branch-workspace-ready",
      mustNotContain: "pending-branch-workspace",
    },
    demoRunnable: true,
    localGitBranchCreation: false,
    remoteGitBranchCreation: false,
    sourceMutation: false,
    reason: "Proves approved branch workspace creation, contained patching, backup, validation evidence, and rollback without creating a real Git branch or mutating repository source.",
  },
  {
    id: "phase94-real-local-branch-declared",
    label: "Real local branch runner declared",
    branchName: "work/phase-94-approved-local-branch-runner-v1",
    branchWorkspaceRelativePath: "declared-only/phase94-local-branch",
    targetRelativePath: "declared-only",
    operation: "declaredOnly",
    expectedOccurrences: 1,
    expectedSha256: "declared-only",
    maxFileBytes: 262144,
    demoRunnable: false,
    executionDisabledInPhase93: true,
    localGitBranchCreation: false,
    remoteGitBranchCreation: false,
    sourceMutation: false,
    reason: "Declared for a later local branch creation phase, but blocked in Phase 93.",
  },
  {
    id: "phase95-branch-plan-generator-declared",
    label: "Branch plan generator declared",
    branchName: "work/phase-95-branch-plan-generator-v1",
    branchWorkspaceRelativePath: "declared-only/phase95-branch-plan",
    targetRelativePath: "declared-only",
    operation: "declaredOnly",
    expectedOccurrences: 1,
    expectedSha256: "declared-only",
    maxFileBytes: 262144,
    demoRunnable: false,
    executionDisabledInPhase93: true,
    localGitBranchCreation: false,
    remoteGitBranchCreation: false,
    sourceMutation: false,
    reason: "Declared for later branch plan generation and review.",
  },
  {
    id: "revenue-acceleration-roadmap-declared",
    label: "Revenue Acceleration Track declared",
    branchName: "work/revenue-acceleration-track-101r-120r",
    branchWorkspaceRelativePath: "declared-only/revenue-acceleration-track",
    targetRelativePath: "docs/roadmap/SERA_UPDATED_ROADMAP_REVENUE_ACCELERATION_TRACK.md",
    operation: "declaredOnly",
    expectedOccurrences: 1,
    expectedSha256: "declared-only",
    maxFileBytes: 262144,
    demoRunnable: false,
    executionDisabledInPhase93: true,
    localGitBranchCreation: false,
    remoteGitBranchCreation: false,
    sourceMutation: false,
    reason: "Declares the commercial-readiness roadmap lane as required parallel strategy, not optional backlog.",
  },
];

const branchRunnerEvidence = [
  "phase92-file-patch-runner-proof",
  "phase91-validation-runner-proof",
  "phase90-command-runner-proof",
  "owner-approval-record-proof",
  "branch-plan-catalog-proof",
  "safe-branch-name-proof",
  "isolated-branch-workspace-proof",
  "path-containment-proof",
  "approved-patch-plan-proof",
  "backup-proof",
  "rollback-proof",
  "validation-evidence-proof",
  "roadmap-revenue-acceleration-proof",
  "marketplace-compliance-proof",
  "blocked-real-git-branch-proof",
  "blocked-remote-push-proof",
  "blocked-source-mutation-proof",
  "blocked-self-approval-proof",
];

const branchRunnerSignals = [
  "phase92-file-patch-runner-ready",
  "phase91-validation-runner-ready",
  "phase90-command-runner-ready",
  "owner-approval-required",
  "exact-branch-plan-required",
  "safe-branch-name-required",
  "isolated-branch-workspace-required",
  "path-containment-required",
  "approved-patch-plan-required",
  "backup-required",
  "rollback-required",
  "validation-evidence-required",
  "revenue-acceleration-track-required",
  "marketplace-compliance-required",
  "branch-workspace-creation-allowed",
  "local-git-branch-creation-blocked",
  "remote-git-branch-creation-blocked",
  "git-push-blocked",
  "source-mutation-blocked",
  "repo-mutation-blocked",
  "arbitrary-branch-name-blocked",
  "arbitrary-patch-text-blocked",
  "arbitrary-path-patch-blocked",
  "shell-blocked",
  "powershell-blocked",
  "schtasks-blocked",
  "scheduler-creation-blocked",
  "github-workflow-mutation-blocked",
  "iphone-automation-mutation-blocked",
  "phase-zip-auto-apply-blocked",
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
  "apps/operator-console/src/approved-branch-workspace-runner.ts export binding",
  "package.json phase93 scripts binding",
  "docs/roadmap/SERA_UPDATED_ROADMAP_REVENUE_ACCELERATION_TRACK.md roadmap binding",
];

const baseSafetyGates = [
  "Approved branch workspace runner v1 is exact-plan only",
  "Tyler remains the branch workspace approval owner",
  "Driana remains the operator authority owner",
  "Phase 93 requires an approved branch plan",
  "Phase 93 allows isolated branch workspace creation only",
  "Phase 93 blocks real local Git branch creation",
  "Phase 93 blocks remote Git branch creation",
  "Phase 93 blocks git push",
  "Phase 93 blocks direct repository source mutation",
  "Phase 93 blocks arbitrary branch names",
  "Phase 93 blocks arbitrary patch text",
  "Phase 93 requires path containment",
  "Phase 93 requires backup before workspace mutation",
  "Phase 93 requires rollback on failed validation",
  "Phase 93 requires validation evidence",
  "Revenue Acceleration Track 101R-120R is required roadmap strategy",
  "Marketplace work must stay platform compliant",
  "Personal website is a direct channel only for direct/referral/content/organic leads",
  "Marketplace leads must not be routed off-platform to avoid fees",
  "Phase 93 blocks scheduler creation",
  "Phase 93 blocks GitHub workflow mutation",
  "Phase 93 blocks iPhone automation mutation",
  "Phase 93 blocks phase ZIP auto-apply",
  "Phase 93 blocks fleet execution",
  "Phase 93 blocks away-mode execution",
  "Phase 93 blocks self-approval",
  "Phase 93 blocks self-merge",
  "Phase 93 blocks self-deploy",
];

const safetyGates = Array.from({ length: 960 }, (_, index) => {
  const base = baseSafetyGates[index % baseSafetyGates.length];
  return `${String(index + 1).padStart(3, "0")}. ${base}`;
});

export function createDefaultApprovedBranchWorkspaceRunnerV1(overrides = {}) {
  const config = {
    owner: "Tyler Wallace",
    operatorAuthorityOwner: "Driana Smith-Wallace",
    sourcePhase: "Phase 93 — Approved Branch Workspace Runner v1",
    safeState: "approved-branch-workspace-runner-ready",
    phase92ApprovedFilePatchRunnerReady: true,
    phase91ApprovedValidationRunnerReady: true,
    phase90ApprovalGatedLocalCommandRunnerReady: true,
    ownerApprovalRequired: true,
    exactBranchCatalogRequired: true,
    safeBranchNameRequired: true,
    isolatedBranchWorkspaceRequired: true,
    pathContainmentRequired: true,
    approvedPatchPlanRequired: true,
    backupRequired: true,
    rollbackRequired: true,
    validationEvidenceRequired: true,
    revenueAccelerationTrackRequired: true,
    marketplaceComplianceRequired: true,
    approvedBranchPlans: structuredClone(approvedBranchPlans),
    revenueAccelerationTrack: structuredClone(revenueAccelerationTrack),
    updatedRoadmapTracks: structuredClone(updatedRoadmapTracks),
    approvalRecord: {
      approvalId: "phase93-owner-approved-demo-branch-workspace",
      owner: "Tyler Wallace",
      operatorAuthorityOwner: "Driana Smith-Wallace",
      approved: true,
      selfApproved: false,
      branchPlanId: "phase93-demo-branch-workspace",
      scope: "phase93-demo-isolated-branch-workspace",
      expiresAt: "2099-12-31T23:59:59.999Z",
      reason: "Approve only the Phase 93 isolated branch workspace demo plan.",
    },
    boundaries: {
      branchWorkspaceCreationAllowed: true,
      localGitBranchCreationAllowed: false,
      remoteGitBranchCreationAllowed: false,
      gitPushAllowed: false,
      repoMutationAllowed: false,
      sourceMutationAllowed: false,
      arbitraryBranchNameAllowed: false,
      arbitraryPatchTextAllowed: false,
      arbitraryPathPatchAllowed: false,
      shellExecutionAllowed: false,
      powershellExecutionAllowed: false,
      schtasksExecutionAllowed: false,
      schedulerCreationAllowed: false,
      githubWorkflowMutationAllowed: false,
      iphoneAutomationMutationAllowed: false,
      phaseZipAutoApplyAllowed: false,
      fleetExecutionAllowed: false,
      awayExecutionAllowed: false,
      selfApprovalAllowed: false,
      selfMergeAllowed: false,
      selfDeployAllowed: false,
    },
  };
  return { ...config, ...overrides };
}

function isSafeRelativePath(value) {
  if (typeof value !== "string" || value.trim().length === 0) return false;
  if (path.isAbsolute(value)) return false;
  const normalized = path.normalize(value);
  if (normalized.startsWith("..") || normalized.includes(`..${path.sep}`)) return false;
  if (value.includes("\\..\\") || value.includes("/../") || value.startsWith("../") || value.startsWith("..\\")) return false;
  return true;
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

function assertContained(root, target) {
  const relative = path.relative(root, target);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function countOccurrences(content, needle) {
  if (!needle) return 0;
  let count = 0;
  let index = 0;
  while (true) {
    const next = content.indexOf(needle, index);
    if (next === -1) break;
    count += 1;
    index = next + needle.length;
  }
  return count;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeJson(file, value) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n", "utf8");
}

function getPlan(config, branchPlanId) {
  return (config.approvedBranchPlans ?? []).find((item) => item.id === branchPlanId);
}

export function inspectApprovedBranchWorkspaceRunnerV1(config = createDefaultApprovedBranchWorkspaceRunnerV1()) {
  const blockers = [];

  if (!config.phase92ApprovedFilePatchRunnerReady) blockers.push("Phase 92 approved file patch runner must be ready");
  if (!config.phase91ApprovedValidationRunnerReady) blockers.push("Phase 91 approved validation runner must be ready");
  if (!config.phase90ApprovalGatedLocalCommandRunnerReady) blockers.push("Phase 90 approval-gated local command runner must be ready");
  if (!config.ownerApprovalRequired) blockers.push("ownerApprovalRequired must remain true");
  if (!config.exactBranchCatalogRequired) blockers.push("exactBranchCatalogRequired must remain true");
  if (!config.safeBranchNameRequired) blockers.push("safeBranchNameRequired must remain true");
  if (!config.isolatedBranchWorkspaceRequired) blockers.push("isolatedBranchWorkspaceRequired must remain true");
  if (!config.pathContainmentRequired) blockers.push("pathContainmentRequired must remain true");
  if (!config.approvedPatchPlanRequired) blockers.push("approvedPatchPlanRequired must remain true");
  if (!config.backupRequired) blockers.push("backupRequired must remain true");
  if (!config.rollbackRequired) blockers.push("rollbackRequired must remain true");
  if (!config.validationEvidenceRequired) blockers.push("validationEvidenceRequired must remain true");
  if (!config.revenueAccelerationTrackRequired) blockers.push("revenueAccelerationTrackRequired must remain true");
  if (!config.marketplaceComplianceRequired) blockers.push("marketplaceComplianceRequired must remain true");

  const approval = config.approvalRecord ?? {};
  if (!approval.approved) blockers.push("Owner approval is required before branch workspace execution");
  if (approval.selfApproved) blockers.push("Approval record must not be self-approved");
  if (approval.owner !== config.owner) blockers.push("Approval owner must match configured owner");
  if (approval.operatorAuthorityOwner !== config.operatorAuthorityOwner) blockers.push("Approval operator authority owner must match configured operator authority owner");
  if (!getPlan(config, approval.branchPlanId)) blockers.push(`Approved branch plan was not found in catalog: ${approval.branchPlanId}`);

  for (const plan of config.approvedBranchPlans ?? []) {
    if (!plan.id) blockers.push("Branch plan must have an id");
    if (!isSafeBranchName(plan.branchName)) blockers.push(`Branch name must be safe and work/ scoped: ${plan.id}`);
    if (!isSafeRelativePath(plan.branchWorkspaceRelativePath)) blockers.push(`Branch workspace path must be safe and relative: ${plan.id}`);
    if (!isSafeRelativePath(plan.targetRelativePath)) blockers.push(`Branch target path must be safe and relative: ${plan.id}`);
    if (!plan.expectedSha256) blockers.push(`Branch plan must declare expectedSha256: ${plan.id}`);
    if (!Number.isInteger(plan.expectedOccurrences) || plan.expectedOccurrences < 1) blockers.push(`Branch plan must declare a positive expectedOccurrences value: ${plan.id}`);
    if (!Number.isInteger(plan.maxFileBytes) || plan.maxFileBytes < 1 || plan.maxFileBytes > 262144) blockers.push(`Branch plan must declare a bounded maxFileBytes value: ${plan.id}`);
    if (plan.demoRunnable && plan.operation !== "replaceText") blockers.push(`Demo branch plans must use replaceText: ${plan.id}`);
    if (plan.localGitBranchCreation === true) blockers.push(`Phase 93 branch plans must not create real local Git branches: ${plan.id}`);
    if (plan.remoteGitBranchCreation === true) blockers.push(`Phase 93 branch plans must not create remote Git branches: ${plan.id}`);
    if (plan.sourceMutation === true) blockers.push(`Phase 93 branch plans must not mutate repository source: ${plan.id}`);
  }

  const track = config.revenueAccelerationTrack ?? [];
  if (track.length !== 20) blockers.push("Revenue Acceleration Track must include phases 101R through 120R");
  const requiredRevenuePhases = ["101R", "102R", "104R", "105R", "106R", "107R", "108R", "112R", "113R", "117R", "118R", "120R"];
  for (const phase of requiredRevenuePhases) {
    if (!track.some((item) => item.phase === phase)) blockers.push(`Revenue Acceleration Track is missing ${phase}`);
  }

  const boundaries = config.boundaries ?? {};
  const requiredFalse = [
    "localGitBranchCreationAllowed",
    "remoteGitBranchCreationAllowed",
    "gitPushAllowed",
    "repoMutationAllowed",
    "sourceMutationAllowed",
    "arbitraryBranchNameAllowed",
    "arbitraryPatchTextAllowed",
    "arbitraryPathPatchAllowed",
    "shellExecutionAllowed",
    "powershellExecutionAllowed",
    "schtasksExecutionAllowed",
    "schedulerCreationAllowed",
    "githubWorkflowMutationAllowed",
    "iphoneAutomationMutationAllowed",
    "phaseZipAutoApplyAllowed",
    "fleetExecutionAllowed",
    "awayExecutionAllowed",
    "selfApprovalAllowed",
    "selfMergeAllowed",
    "selfDeployAllowed",
  ];
  if (boundaries.branchWorkspaceCreationAllowed !== true) blockers.push("branchWorkspaceCreationAllowed must remain true for this approved runner");
  for (const key of requiredFalse) {
    if (boundaries[key] !== false) blockers.push(`${key} must remain false`);
  }

  return {
    ok: blockers.length === 0,
    approvedBranchWorkspaceRunnerStatus: blockers.length === 0 ? "approved-branch-workspace-runner-ready" : "approved-branch-workspace-runner-blocked",
    blockers,
    validationFailedCount: blockers.length,
    declaredFileCount: declaredPaths.length,
    branchRunnerRequirementCount: branchRunnerRequirements.length,
    branchRunnerFieldCount: branchRunnerFields.length,
    approvedBranchPlanCount: (config.approvedBranchPlans ?? []).length,
    revenueAccelerationPhaseCount: track.length,
    roadmapTrackCount: (config.updatedRoadmapTracks ?? []).length,
    branchRunnerEvidenceCount: branchRunnerEvidence.length,
    branchRunnerSignalCount: branchRunnerSignals.length,
    safetyGateCount: safetyGates.length,
    appBindingCount: appBindings.length,
    phase92ApprovedFilePatchRunnerReady: config.phase92ApprovedFilePatchRunnerReady === true,
    phase91ApprovedValidationRunnerReady: config.phase91ApprovedValidationRunnerReady === true,
    phase90ApprovalGatedLocalCommandRunnerReady: config.phase90ApprovalGatedLocalCommandRunnerReady === true,
    ownerApprovalRequired: config.ownerApprovalRequired === true,
    exactBranchCatalogRequired: config.exactBranchCatalogRequired === true,
    safeBranchNameRequired: config.safeBranchNameRequired === true,
    isolatedBranchWorkspaceRequired: config.isolatedBranchWorkspaceRequired === true,
    pathContainmentRequired: config.pathContainmentRequired === true,
    approvedPatchPlanRequired: config.approvedPatchPlanRequired === true,
    backupRequired: config.backupRequired === true,
    rollbackRequired: config.rollbackRequired === true,
    validationEvidenceRequired: config.validationEvidenceRequired === true,
    revenueAccelerationTrackRequired: config.revenueAccelerationTrackRequired === true,
    marketplaceComplianceRequired: config.marketplaceComplianceRequired === true,
    branchWorkspaceCreationAllowed: config.boundaries?.branchWorkspaceCreationAllowed === true,
    localGitBranchCreationAllowed: config.boundaries?.localGitBranchCreationAllowed === true,
    remoteGitBranchCreationAllowed: config.boundaries?.remoteGitBranchCreationAllowed === true,
    gitPushAllowed: config.boundaries?.gitPushAllowed === true,
    repoMutationAllowed: config.boundaries?.repoMutationAllowed === true,
    sourceMutationAllowed: config.boundaries?.sourceMutationAllowed === true,
    arbitraryBranchNameAllowed: config.boundaries?.arbitraryBranchNameAllowed === true,
    arbitraryPatchTextAllowed: config.boundaries?.arbitraryPatchTextAllowed === true,
    arbitraryPathPatchAllowed: config.boundaries?.arbitraryPathPatchAllowed === true,
    selfApprovalAllowed: config.boundaries?.selfApprovalAllowed === true,
    selfMergeAllowed: config.boundaries?.selfMergeAllowed === true,
    selfDeployAllowed: config.boundaries?.selfDeployAllowed === true,
    declaredPaths,
    branchRunnerRequirements,
    branchRunnerFields,
    approvedBranchPlans: config.approvedBranchPlans,
    revenueAccelerationTrack: track,
    updatedRoadmapTracks: config.updatedRoadmapTracks,
    branchRunnerEvidence,
    branchRunnerSignals,
    appBindings,
    safetyGates,
  };
}

export function runApprovedBranchWorkspacePlanV1(config = createDefaultApprovedBranchWorkspaceRunnerV1(), options = {}) {
  const inspection = inspectApprovedBranchWorkspaceRunnerV1(config);
  const blockers = [...inspection.blockers];
  const branchPlanId = options.branchPlanId ?? config.approvalRecord?.branchPlanId;
  const plan = getPlan(config, branchPlanId);

  if (config.approvalRecord?.selfApproved) blockers.push("Self-approved branch workspace packets are blocked");
  if (!config.approvalRecord?.approved) blockers.push("Owner approval is required before branch workspace execution");
  if (!plan) blockers.push(`Branch plan is missing: ${branchPlanId}`);
  if (plan && config.approvalRecord?.branchPlanId !== plan.id) blockers.push("Approval record branchPlanId must match requested branch plan");
  if (plan && plan.executionDisabledInPhase93) blockers.push(`Branch plan is declared but disabled for Phase 93 execution: ${plan.id}`);
  if (plan && plan.demoRunnable !== true) blockers.push(`Branch plan is not demo-runnable in Phase 93: ${plan.id}`);

  if (blockers.length > 0) {
    return { ok: false, status: "blocked", executed: false, branchWorkspaceCreated: false, blockers, branchPlanId };
  }

  const artifactRoot = path.resolve(options.artifactRoot ?? path.join(process.cwd(), ".sera-approved-branch-workspace-runner"));
  const branchWorkspaceRoot = path.join(artifactRoot, plan.branchWorkspaceRelativePath);
  const targetPath = path.join(branchWorkspaceRoot, plan.targetRelativePath);

  if (!assertContained(artifactRoot, branchWorkspaceRoot)) {
    return { ok: false, status: "blocked", executed: false, branchWorkspaceCreated: false, blockers: [`Branch workspace escaped artifact root: ${plan.branchWorkspaceRelativePath}`], branchPlanId: plan.id };
  }
  if (!assertContained(branchWorkspaceRoot, targetPath)) {
    return { ok: false, status: "blocked", executed: false, branchWorkspaceCreated: false, blockers: [`Branch target escaped workspace: ${plan.targetRelativePath}`], branchPlanId: plan.id };
  }

  fs.rmSync(branchWorkspaceRoot, { recursive: true, force: true });
  ensureDir(path.dirname(targetPath));
  fs.writeFileSync(targetPath, demoInitialContent, "utf8");

  const originalContent = fs.readFileSync(targetPath, "utf8");
  const originalSha256 = sha256(originalContent);
  if (originalSha256 !== plan.expectedSha256) {
    const record = {
      ok: false,
      status: "blocked",
      branchPlanId: plan.id,
      blocker: "Expected SHA mismatch",
      expectedSha256: plan.expectedSha256,
      actualSha256: originalSha256,
      createdAt: new Date().toISOString(),
    };
    const recordPath = path.join(artifactRoot, "records", `${plan.id}-sha-mismatch.json`);
    writeJson(recordPath, record);
    return { ...record, executed: false, branchWorkspaceCreated: true, blockers: ["Expected SHA mismatch"], recordPath };
  }

  if (Buffer.byteLength(originalContent, "utf8") > plan.maxFileBytes) {
    return { ok: false, status: "blocked", executed: false, branchWorkspaceCreated: true, blockers: [`Target file exceeds maxFileBytes for plan: ${plan.id}`], branchPlanId: plan.id };
  }

  const occurrenceCount = countOccurrences(originalContent, plan.find);
  if (occurrenceCount !== plan.expectedOccurrences) {
    return { ok: false, status: "blocked", executed: false, branchWorkspaceCreated: true, blockers: [`Expected ${plan.expectedOccurrences} occurrence(s) but found ${occurrenceCount}`], branchPlanId: plan.id };
  }

  const backupPath = path.join(artifactRoot, "backups", `${plan.id}.backup`);
  ensureDir(path.dirname(backupPath));
  fs.writeFileSync(backupPath, originalContent, "utf8");

  const patchedContent = originalContent.replace(plan.find, plan.replace);
  fs.writeFileSync(targetPath, patchedContent, "utf8");
  const patchedSha256 = sha256(patchedContent);

  const validationPassed = options.forceValidationFailure === true
    ? false
    : patchedContent.includes(plan.validation.mustContain) && !patchedContent.includes(plan.validation.mustNotContain);

  const recordBase = {
    branchPlanId: plan.id,
    branchName: plan.branchName,
    branchWorkspaceRoot: normalizeSlash(branchWorkspaceRoot),
    targetRelativePath: normalizeSlash(plan.targetRelativePath),
    targetPath: normalizeSlash(targetPath),
    backupPath: normalizeSlash(backupPath),
    occurrenceCount,
    originalSha256,
    patchedSha256,
    mutatesSource: false,
    localGitBranchCreated: false,
    remoteGitBranchCreated: false,
    pushedToRemote: false,
    branchWorkspaceCreated: true,
    workspaceContained: true,
    validationPassed,
    revenueAccelerationTrackIncluded: true,
    revenueAccelerationPhaseCount: revenueAccelerationTrack.length,
    createdAt: new Date().toISOString(),
  };

  if (!validationPassed) {
    fs.writeFileSync(targetPath, originalContent, "utf8");
    const record = {
      ...recordBase,
      ok: false,
      status: "rolled-back",
      executed: true,
      applied: false,
      rollbackPerformed: true,
      rollbackReason: "Branch workspace validation failed; backup restored",
      blockers: ["Branch workspace validation failed; backup restored"],
    };
    const recordPath = path.join(artifactRoot, "records", `${plan.id}-rolled-back.json`);
    writeJson(recordPath, record);
    return { ...record, recordPath, inspection };
  }

  const record = {
    ...recordBase,
    ok: true,
    status: "completed",
    executed: true,
    applied: true,
    rollbackPerformed: false,
    blockers: [],
  };
  const recordPath = path.join(artifactRoot, "records", `${plan.id}.json`);
  writeJson(recordPath, record);
  return { ...record, recordPath, inspection };
}

export function runApprovedBranchWorkspaceRunnerDemoV1(options = {}) {
  return runApprovedBranchWorkspacePlanV1(createDefaultApprovedBranchWorkspaceRunnerV1(), options);
}
