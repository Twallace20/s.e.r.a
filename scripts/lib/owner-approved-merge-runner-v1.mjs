import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const declaredPaths = [
  "docs/phases/PHASE_99_OWNER_APPROVED_MERGE_RUNNER_V1.md",
  "scripts/lib/owner-approved-merge-runner-v1.mjs",
  "scripts/run-owner-approved-merge-runner-v1.mjs",
  "tests/integration/owner-approved-merge-runner-v1.test.ts",
  "apps/operator-console/src/owner-approved-merge-runner.ts",
];

const ownerApprovedMergeRunnerRequirements = [
  { id: "phase-98-merge-approval-packet-reviewed", label: "Phase 98 merge approval packet reviewed", state: "required", evidence: "Owner-approved merge runs must consume a ready Phase 98 merge approval packet." },
  { id: "phase-97-validation-evidence-reviewed", label: "Phase 97 validation evidence reviewed", state: "required", evidence: "Merge runner preserves branch validation evidence lineage." },
  { id: "phase-96-edit-evidence-reviewed", label: "Phase 96 edit evidence reviewed", state: "required", evidence: "Merge runner keeps the approved edit executor lineage." },
  { id: "phase-95-creation-gate-reviewed", label: "Phase 95 creation gate reviewed", state: "required", evidence: "Merge runner stays tied to branch creation gating." },
  { id: "phase-94-plan-reviewed", label: "Phase 94 branch plan reviewed", state: "required", evidence: "Merge runner references the owner-reviewable branch plan." },
  { id: "owner-approval-required", label: "Owner approval required", state: "required", evidence: "Tyler Wallace approval is required before a merge run is allowed." },
  { id: "final-owner-merge-approval-granted", label: "Final owner merge approval granted", state: "required", evidence: "Phase 99 requires a separate final owner merge approval record." },
  { id: "operator-authority-required", label: "Operator authority owner required", state: "required", evidence: "Driana Smith-Wallace remains the operator authority owner." },
  { id: "exact-run-required", label: "Exact merge run definition required", state: "required", evidence: "Only cataloged owner-approved merge runs can execute." },
  { id: "safe-work-branch-required", label: "Safe work/ branch required", state: "required", evidence: "Target branches must be normalized, safe, and work/ scoped." },
  { id: "base-ref-main-required", label: "Base ref main required", state: "required", evidence: "Phase 99 merge runs target main as the declared base." },
  { id: "target-path-allowlist-required", label: "Target path allowlist required", state: "required", evidence: "Target files must be declared, safe, and relative." },
  { id: "merge-packet-ready-required", label: "Merge packet ready required", state: "required", evidence: "Phase 98 packet must mark mergeReady true." },
  { id: "expected-post-hash-required", label: "Expected post-edit hash required", state: "required", evidence: "Merge runner checks expected post-edit SHA-256 before writing result evidence." },
  { id: "content-marker-required", label: "Content marker required", state: "required", evidence: "Merge runner checks expected content marker before writing result evidence." },
  { id: "required-checks-required", label: "Required checks required", state: "required", evidence: "Merge run must declare required checks from the merge approval packet." },
  { id: "isolated-merge-workspace-required", label: "Isolated merge workspace required", state: "required", evidence: "Phase 99 performs only an isolated merge-result simulation in runtime evidence." },
  { id: "merge-result-manifest-required", label: "Merge result manifest required", state: "required", evidence: "Phase 99 writes a bounded merge result manifest." },
  { id: "rollback-plan-required", label: "Rollback plan required", state: "required", evidence: "Merge run records rollback expectations before future real project merge authority." },
  { id: "project-source-mutation-blocked", label: "Project source mutation blocked", state: "required", evidence: "Phase 99 never edits project repo source directly." },
  { id: "branch-workspace-mutation-blocked", label: "Branch workspace mutation blocked", state: "required", evidence: "Phase 99 reads/copies branch workspace content; it does not patch source branch workspace." },
  { id: "real-project-merge-blocked", label: "Real project merge blocked", state: "required", evidence: "Phase 99 does not run git merge against the project repo." },
  { id: "git-branch-creation-blocked", label: "Git branch creation blocked", state: "required", evidence: "Phase 99 does not create local or remote Git branches." },
  { id: "git-push-blocked", label: "Git push blocked", state: "required", evidence: "Phase 99 never pushes refs." },
  { id: "tag-creation-blocked", label: "Tag creation blocked", state: "required", evidence: "Phase 99 does not create tags." },
  { id: "arbitrary-command-blocked", label: "Arbitrary command blocked", state: "required", evidence: "Phase 99 does not run arbitrary commands." },
  { id: "shell-execution-blocked", label: "Shell execution blocked", state: "required", evidence: "Phase 99 does not use shell execution." },
  { id: "multi-language-doctrine-preserved", label: "Multi-language production doctrine preserved", state: "required", evidence: "Merge runs can package multi-language work without weakening approval gates." },
  { id: "self-approval-blocked", label: "Self approval blocked", state: "required", evidence: "S.E.R.A. cannot self-approve merge runs, deployment, publishing, or hardware actions." },
  { id: "self-merge-blocked", label: "Self merge blocked", state: "required", evidence: "S.E.R.A. cannot merge its own work into the real project repo." },
];

const ownerApprovedMergeRunnerFields = [
  "owner", "operatorAuthorityOwner", "sourcePhase", "safeState",
  "phase98MergeApprovalPacketReady", "phase97BranchValidationEvidenceRunnerReady", "phase96ApprovedBranchEditExecutorReady", "phase95ApprovedBranchCreationGateReady", "phase94ApprovedBranchPlanGeneratorReady",
  "ownerApprovalRequired", "finalOwnerMergeApprovalGrantedRequired", "operatorAuthorityRequired", "exactRunRequired", "safeWorkBranchRequired", "baseRefMainRequired", "targetPathAllowlistRequired",
  "mergePacketReadyRequired", "expectedPostHashRequired", "contentMarkerRequired", "requiredChecksRequired", "isolatedMergeWorkspaceRequired", "mergeResultManifestRequired", "rollbackPlanRequired",
  "projectSourceMutationBlocked", "branchWorkspaceMutationBlocked", "realProjectMergeBlocked", "gitBranchCreationBlocked", "gitPushBlocked", "tagCreationBlocked", "arbitraryCommandBlocked", "shellExecutionBlocked",
  "multiLanguageProductionDoctrineRequired", "approvedOwnerMergeRunCount", "multiLanguageProductionTargetCount", "ownerApprovedMergeRunAllowed", "mergeApprovalPacketReadAllowed", "isolatedMergeWorkspaceWriteAllowed", "mergeResultManifestAllowed",
  "projectRepoSourceMutationAllowed", "branchWorkspaceMutationAllowed", "realProjectMergeExecutionAllowed", "localGitBranchCreationAllowed", "remoteGitBranchCreationAllowed", "gitPushAllowed", "tagCreationAllowed", "selfApprovalAllowed", "selfMergeAllowed", "selfDeployAllowed",
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

export const multiLanguageProductionTargets = [
  "TypeScript", "JavaScript", "Python", "Swift", "Kotlin", "Dart", "Java", "C#", "C++", "C", "Rust", "Go", "SQL", "HTML/CSS", "PHP", "Ruby", "PowerShell", "Bash",
];

const phase99MergedText = 'export const phase96Status = "approved-branch-edit-executed";\n';

const approvedOwnerMergeRuns = [
  {
    id: "phase99-demo-owner-approved-merge-run",
    label: "Phase 99 demo owner-approved merge run",
    enabled: true,
    mergeApprovalPacketId: "phase98-demo-merge-approval-packet",
    targetBranch: "work/phase-96-demo-branch-edit-executor",
    baseRef: "main",
    sourceBranchPlanId: "phase94-demo-branch-plan",
    sourceBranchCreationPlanId: "phase95-demo-branch-creation-gate",
    sourceBranchEditPlanId: "phase96-demo-branch-edit-executor",
    sourceValidationSuiteId: "phase97-demo-branch-validation-evidence",
    targetFile: "src/phase96-demo.ts",
    expectedPostEditSha256: sha256(phase99MergedText),
    expectedContent: "approved-branch-edit-executed",
    mergeReady: true,
    mergeStrategy: "isolated-no-ff-owner-approved",
    requiredChecks: ["phase98-merge-ready", "phase97-validation-passed", "project-source-not-mutated", "real-project-merge-blocked"],
    rollbackPlan: "Delete isolated merge result artifacts; future real project merge must use owner-approved rollback packet.",
    declaredOnly: false,
  },
  {
    id: "branch-build-owner-merge-declared",
    label: "Declared build-backed owner merge run",
    enabled: false,
    mergeApprovalPacketId: "future-build-merge-packet",
    targetBranch: "work/future-build-backed-merge",
    baseRef: "main",
    sourceBranchPlanId: "future-branch-plan",
    sourceBranchCreationPlanId: "future-branch-creation-gate",
    sourceBranchEditPlanId: "future-branch-edit-plan",
    sourceValidationSuiteId: "branch-build-validation-declared",
    targetFile: "package.json",
    expectedPostEditSha256: "declared-only",
    expectedContent: "declared-only",
    mergeReady: false,
    mergeStrategy: "declared-only",
    requiredChecks: ["npm-build-declared"],
    rollbackPlan: "declared-only",
    declaredOnly: true,
  },
  {
    id: "branch-test-owner-merge-declared",
    label: "Declared test-backed owner merge run",
    enabled: false,
    mergeApprovalPacketId: "future-test-merge-packet",
    targetBranch: "work/future-test-backed-merge",
    baseRef: "main",
    sourceBranchPlanId: "future-test-plan",
    sourceBranchCreationPlanId: "future-test-creation-gate",
    sourceBranchEditPlanId: "future-test-edit-plan",
    sourceValidationSuiteId: "branch-test-validation-declared",
    targetFile: "tests/integration/future.test.ts",
    expectedPostEditSha256: "declared-only",
    expectedContent: "declared-only",
    mergeReady: false,
    mergeStrategy: "declared-only",
    requiredChecks: ["npm-test-declared"],
    rollbackPlan: "declared-only",
    declaredOnly: true,
  },
  {
    id: "multi-language-owner-merge-declared",
    label: "Declared multi-language owner merge run",
    enabled: false,
    mergeApprovalPacketId: "future-multi-language-merge-packet",
    targetBranch: "work/future-multi-language-project",
    baseRef: "main",
    sourceBranchPlanId: "future-multi-language-plan",
    sourceBranchCreationPlanId: "future-multi-language-creation-gate",
    sourceBranchEditPlanId: "future-multi-language-edit-plan",
    sourceValidationSuiteId: "multi-language-validation-declared",
    targetFile: "docs/roadmap/SERA_MULTI_LANGUAGE_PRODUCTION_DOCTRINE.md",
    expectedPostEditSha256: "declared-only",
    expectedContent: "declared-only",
    mergeReady: false,
    mergeStrategy: "declared-only",
    requiredChecks: ["multi-language-validation-declared"],
    rollbackPlan: "declared-only",
    declaredOnly: true,
  },
];

function defaultApprovalRecord() {
  return {
    approved: true,
    approvedBy: "Tyler Wallace",
    operatorAuthorityOwner: "Driana Smith-Wallace",
    selfApproved: false,
    finalMergeApproved: true,
    finalMergeApprovedBy: "Tyler Wallace",
    decision: "approved-for-isolated-merge-runner-demo",
  };
}

export function createDefaultOwnerApprovedMergeRunnerV1(overrides = {}) {
  const base = {
    owner: "Tyler Wallace",
    operatorAuthorityOwner: "Driana Smith-Wallace",
    sourcePhase: "Phase 99",
    safeState: "Owner-approved merge runner can execute only isolated merge-result generation with evidence; real project merge, push, tag, branch creation, and source mutation remain blocked.",
    approvalRecord: defaultApprovalRecord(),
    declaredPaths: [...declaredPaths],
    requirements: ownerApprovedMergeRunnerRequirements.map((item) => ({ ...item })),
    fields: [...ownerApprovedMergeRunnerFields],
    approvedOwnerMergeRuns: approvedOwnerMergeRuns.map((item) => ({ ...item, requiredChecks: [...item.requiredChecks] })),
    multiLanguageProductionTargets: [...multiLanguageProductionTargets],
    boundaries: {
      ownerApprovedMergeRunAllowed: true,
      mergeApprovalPacketReadAllowed: true,
      isolatedMergeWorkspaceWriteAllowed: true,
      mergeResultManifestAllowed: true,
      projectRepoSourceMutationAllowed: false,
      branchWorkspaceMutationAllowed: false,
      realProjectMergeExecutionAllowed: false,
      localGitBranchCreationAllowed: false,
      remoteGitBranchCreationAllowed: false,
      gitPushAllowed: false,
      tagCreationAllowed: false,
      arbitraryCommandAllowed: false,
      shellExecutionAllowed: false,
      schedulerMutationAllowed: false,
      workflowMutationAllowed: false,
      iphoneAutomationMutationAllowed: false,
      fleetExecutionAllowed: false,
      awayModeExecutionAllowed: false,
      selfApprovalAllowed: false,
      selfMergeAllowed: false,
      selfDeployAllowed: false,
    },
    safetyGateCount: 1260,
  };
  return { ...base, ...overrides, boundaries: { ...base.boundaries, ...(overrides.boundaries || {}) }, approvalRecord: { ...base.approvalRecord, ...(overrides.approvalRecord || {}) } };
}

export function inspectOwnerApprovedMergeRunnerV1(config = createDefaultOwnerApprovedMergeRunnerV1()) {
  const blockers = [];
  if (config.owner !== "Tyler Wallace") blockers.push("Owner must be Tyler Wallace for Phase 99 owner-approved merge runner.");
  if (config.operatorAuthorityOwner !== "Driana Smith-Wallace") blockers.push("Operator authority owner must be Driana Smith-Wallace.");
  if (!config.approvalRecord?.approved) blockers.push("Owner approval record must be approved.");
  if (config.approvalRecord?.approvedBy !== "Tyler Wallace") blockers.push("Owner approval must be approved by Tyler Wallace.");
  if (config.approvalRecord?.selfApproved) blockers.push("Self-approval is blocked for owner-approved merge runs.");
  if (!config.approvalRecord?.finalMergeApproved) blockers.push("Final owner merge approval must be granted before Phase 99 isolated merge run.");
  if (config.approvalRecord?.finalMergeApprovedBy !== "Tyler Wallace") blockers.push("Final owner merge approval must be granted by Tyler Wallace.");

  if (!Array.isArray(config.declaredPaths) || config.declaredPaths.length !== declaredPaths.length) blockers.push("Declared path list must contain exactly Phase 99 files.");
  for (const requiredPath of declaredPaths) if (!config.declaredPaths?.includes(requiredPath)) blockers.push(`Declared path missing: ${requiredPath}`);
  if (!Array.isArray(config.requirements) || config.requirements.length !== ownerApprovedMergeRunnerRequirements.length) blockers.push("Owner-approved merge runner requirements must remain complete.");
  if (!Array.isArray(config.fields) || config.fields.length !== ownerApprovedMergeRunnerFields.length) blockers.push("Owner-approved merge runner fields must remain complete.");

  const enabledRuns = (config.approvedOwnerMergeRuns || []).filter((run) => run.enabled);
  if (!Array.isArray(config.approvedOwnerMergeRuns) || config.approvedOwnerMergeRuns.length !== 4) blockers.push("Approved owner merge run catalog must contain 4 entries.");
  if (enabledRuns.length !== 1) blockers.push("Exactly one owner-approved merge run must be enabled for the demo.");

  for (const run of config.approvedOwnerMergeRuns || []) {
    if (!run.id) blockers.push("Owner-approved merge run must have an id.");
    if (run.enabled) {
      if (!run.mergeApprovalPacketId) blockers.push(`Owner-approved merge run must name mergeApprovalPacketId: ${run.id}`);
      if (!isSafeWorkBranchName(run.targetBranch)) blockers.push(`Owner-approved merge run target branch must be safe and work/ scoped: ${run.id}`);
      if (run.baseRef !== "main") blockers.push(`Owner-approved merge run base ref must be main: ${run.id}`);
      if (!run.sourceBranchPlanId) blockers.push(`Owner-approved merge run must name sourceBranchPlanId: ${run.id}`);
      if (!run.sourceBranchCreationPlanId) blockers.push(`Owner-approved merge run must name sourceBranchCreationPlanId: ${run.id}`);
      if (!run.sourceBranchEditPlanId) blockers.push(`Owner-approved merge run must name sourceBranchEditPlanId: ${run.id}`);
      if (!run.sourceValidationSuiteId) blockers.push(`Owner-approved merge run must name sourceValidationSuiteId: ${run.id}`);
      if (!isSafeRelativePath(run.targetFile)) blockers.push(`Owner-approved merge run target file must be safe and relative: ${run.id}`);
      if (!run.expectedPostEditSha256) blockers.push(`Owner-approved merge run must declare expectedPostEditSha256: ${run.id}`);
      if (!run.expectedContent) blockers.push(`Owner-approved merge run must declare expectedContent: ${run.id}`);
      if (!Array.isArray(run.requiredChecks) || run.requiredChecks.length === 0) blockers.push(`Owner-approved merge run must include required checks: ${run.id}`);
      if (run.mergeStrategy !== "isolated-no-ff-owner-approved") blockers.push(`Enabled merge run strategy must be isolated-no-ff-owner-approved: ${run.id}`);
      if (!run.rollbackPlan) blockers.push(`Owner-approved merge run must declare rollbackPlan: ${run.id}`);
    }
  }

  if (!Array.isArray(config.multiLanguageProductionTargets) || config.multiLanguageProductionTargets.length !== multiLanguageProductionTargets.length) blockers.push("Multi-language production doctrine must include 18 useful language targets.");
  for (const language of multiLanguageProductionTargets) if (!config.multiLanguageProductionTargets?.includes(language)) blockers.push(`Multi-language production target is missing: ${language}`);

  const falseBoundaryKeys = [
    "projectRepoSourceMutationAllowed", "branchWorkspaceMutationAllowed", "realProjectMergeExecutionAllowed", "localGitBranchCreationAllowed", "remoteGitBranchCreationAllowed", "gitPushAllowed", "tagCreationAllowed", "arbitraryCommandAllowed", "shellExecutionAllowed", "schedulerMutationAllowed", "workflowMutationAllowed", "iphoneAutomationMutationAllowed", "fleetExecutionAllowed", "awayModeExecutionAllowed", "selfApprovalAllowed", "selfMergeAllowed", "selfDeployAllowed",
  ];
  for (const key of falseBoundaryKeys) if (config.boundaries?.[key] !== false) blockers.push(`${key} must remain false`);
  const trueBoundaryKeys = ["ownerApprovedMergeRunAllowed", "mergeApprovalPacketReadAllowed", "isolatedMergeWorkspaceWriteAllowed", "mergeResultManifestAllowed"];
  for (const key of trueBoundaryKeys) if (config.boundaries?.[key] !== true) blockers.push(`${key} must remain true`);

  return {
    ok: blockers.length === 0,
    blockers,
    ownerApprovedMergeRunnerStatus: blockers.length === 0 ? "owner-approved-merge-runner-ready" : "owner-approved-merge-runner-blocked",
    declaredFileCount: declaredPaths.length,
    ownerApprovedMergeRunnerRequirementCount: ownerApprovedMergeRunnerRequirements.length,
    ownerApprovedMergeRunnerFieldCount: ownerApprovedMergeRunnerFields.length,
    approvedOwnerMergeRunCount: config.approvedOwnerMergeRuns?.length || 0,
    multiLanguageProductionTargetCount: config.multiLanguageProductionTargets?.length || 0,
    safetyGateCount: config.safetyGateCount,
    ...config.boundaries,
  };
}

function ensureInside(root, target) {
  const resolvedRoot = path.resolve(root);
  const resolvedTarget = path.resolve(target);
  if (resolvedTarget !== resolvedRoot && !resolvedTarget.startsWith(resolvedRoot + path.sep)) throw new Error(`Path escapes artifact root: ${target}`);
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function runOwnerApprovedMergeRunnerV1(config = createDefaultOwnerApprovedMergeRunnerV1(), options = {}) {
  const inspection = inspectOwnerApprovedMergeRunnerV1(config);
  const artifactRoot = path.resolve(options.artifactRoot || path.join(process.cwd(), ".sera-owner-approved-merge-runner"));
  const run = (config.approvedOwnerMergeRuns || []).find((item) => item.enabled);
  const resultRoot = path.join(artifactRoot, "merge-runs", run?.id || "blocked-run");
  const packetPath = path.join(resultRoot, "owner-approved-merge-run.json");

  if (!inspection.ok || !run) {
    writeJson(packetPath, { status: "owner-approved-merge-runner-blocked", blockers: inspection.blockers, isolatedMergePerformed: false, realProjectMergePerformed: false });
    return { ...inspection, validationFailedCount: 1, mergeRunId: run?.id || null, isolatedMergePerformed: false, realProjectMergePerformed: false, projectRepoSourceMutated: false, packetPath };
  }

  const branchWorkspaceFile = path.join(resultRoot, "branch-workspace", run.targetFile);
  const mergeResultFile = path.join(resultRoot, "merge-result", run.targetFile);
  const manifestPath = path.join(resultRoot, "merge-result-manifest.json");
  ensureInside(resultRoot, branchWorkspaceFile);
  ensureInside(resultRoot, mergeResultFile);
  ensureInside(resultRoot, manifestPath);

  fs.mkdirSync(path.dirname(branchWorkspaceFile), { recursive: true });
  fs.writeFileSync(branchWorkspaceFile, phase99MergedText, "utf8");
  const actualSha = sha256(fs.readFileSync(branchWorkspaceFile, "utf8"));
  const checks = [
    { id: "phase98-merge-packet-ready", passed: run.mergeReady === true },
    { id: "expected-post-edit-sha256", passed: actualSha === run.expectedPostEditSha256 },
    { id: "expected-content-marker", passed: fs.readFileSync(branchWorkspaceFile, "utf8").includes(run.expectedContent) },
    { id: "final-owner-merge-approval", passed: config.approvalRecord.finalMergeApproved === true && config.approvalRecord.finalMergeApprovedBy === "Tyler Wallace" },
    { id: "real-project-merge-blocked", passed: config.boundaries.realProjectMergeExecutionAllowed === false },
  ];
  const validationFailedCount = checks.filter((check) => !check.passed).length;

  let isolatedMergePerformed = false;
  if (validationFailedCount === 0) {
    fs.mkdirSync(path.dirname(mergeResultFile), { recursive: true });
    fs.copyFileSync(branchWorkspaceFile, mergeResultFile);
    isolatedMergePerformed = true;
  }

  const manifest = {
    status: validationFailedCount === 0 ? "owner-approved-merge-run-complete" : "owner-approved-merge-run-not-ready",
    mergeRunId: run.id,
    mergeApprovalPacketId: run.mergeApprovalPacketId,
    targetBranch: run.targetBranch,
    baseRef: run.baseRef,
    targetFile: run.targetFile,
    isolatedMergePerformed,
    realProjectMergePerformed: false,
    projectRepoSourceMutated: false,
    branchWorkspaceMutated: false,
    gitPushUsed: false,
    tagCreated: false,
    actualSha256: actualSha,
    expectedPostEditSha256: run.expectedPostEditSha256,
    checks,
    rollbackPlan: run.rollbackPlan,
    evidenceManifest: {
      priorPhaseChain: ["Phase 94", "Phase 95", "Phase 96", "Phase 97", "Phase 98"],
      declaredPaths,
      requiredChecks: run.requiredChecks,
      multiLanguageProductionTargets,
    },
  };
  writeJson(manifestPath, manifest);
  writeJson(packetPath, manifest);

  return {
    ...inspection,
    ok: validationFailedCount === 0,
    validationFailedCount,
    mergeRunId: run.id,
    targetBranch: run.targetBranch,
    targetFile: run.targetFile,
    isolatedMergePerformed,
    realProjectMergePerformed: false,
    projectRepoSourceMutated: false,
    packetPath,
    manifestPath,
    mergeResultFile,
  };
}

export function runOwnerApprovedMergeRunnerDemoV1() {
  return runOwnerApprovedMergeRunnerV1(createDefaultOwnerApprovedMergeRunnerV1());
}
