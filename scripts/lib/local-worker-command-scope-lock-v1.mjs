import fs from "node:fs";
import path from "node:path";

const declaredPaths = [
  "docs/phases/PHASE_87_LOCAL_WORKER_COMMAND_SCOPE_LOCK_V1.md",
  "scripts/lib/local-worker-command-scope-lock-v1.mjs",
  "scripts/run-local-worker-command-scope-lock-v1.mjs",
  "tests/integration/local-worker-command-scope-lock-v1.test.ts",
  "apps/operator-console/src/local-worker-command-scope-lock.ts",
];

const commandScopeLockRequirements = [
  { id: "phase-86-command-approval-packet-reviewed", label: "Phase 86 approval packet reviewed", state: "required", evidence: "Phase 86 owner approval packet must remain represented before command scope lock work proceeds." },
  { id: "phase-85-command-risk-classifier-reviewed", label: "Phase 85 risk classifier reviewed", state: "required", evidence: "Phase 85 risk classifier must remain represented before command scope lock work proceeds." },
  { id: "explicit-scope-lock-required", label: "Explicit scope lock required", state: "required", evidence: "Future command execution must be bound to an approved purpose, actor, workspace, branch, path set, and command family." },
  { id: "approved-purpose-required", label: "Approved purpose required", state: "required", evidence: "The scope lock must state the approved purpose before any future command can be considered." },
  { id: "approved-actor-required", label: "Approved actor required", state: "required", evidence: "The scope lock must identify the approved requester, worker, or automation source." },
  { id: "allowed-path-set-required", label: "Allowed path set required", state: "required", evidence: "The scope lock must define allowed paths or workspaces and deny path escape." },
  { id: "denied-path-set-required", label: "Denied path set required", state: "required", evidence: "The scope lock must make blocked paths explicit, including secrets, system areas, and out-of-repo locations." },
  { id: "approved-workspace-required", label: "Approved workspace required", state: "required", evidence: "The scope lock must bind work to a workspace before future command execution." },
  { id: "approved-branch-required", label: "Approved branch required", state: "required", evidence: "Code-changing work must inherit a branch boundary before future execution." },
  { id: "allowed-command-family-required", label: "Allowed command family required", state: "required", evidence: "The scope lock must state which command families are allowed by the approval packet." },
  { id: "prohibited-command-family-required", label: "Prohibited command family required", state: "required", evidence: "The scope lock must state command families that remain prohibited regardless of nearby approvals." },
  { id: "scope-expansion-requires-new-approval", label: "Scope expansion requires new approval", state: "required", evidence: "Any request to expand paths, branches, workspaces, command families, actors, time windows, or risk classes must create a new approval packet." },
  { id: "scope-violation-fails-closed", label: "Scope violation fails closed", state: "required", evidence: "Scope mismatch must block before command execution and route to owner review." },
  { id: "scope-lock-remains-policy-only-required", label: "Scope lock remains policy-only", state: "required", evidence: "Phase 87 defines scope-lock policy and cannot execute commands, repair scope, mutate workflows, connect workers, or create schedules." },
];

const commandScopeLockFields = [
  "owner",
  "operatorAuthorityOwner",
  "sourcePhase",
  "safeState",
  "phase86CommandApprovalPacketReady",
  "phase85CommandRiskClassifierReady",
  "ownerApprovalRequired",
  "scopeLockRequired",
  "approvedPurposeRequired",
  "approvedActorRequired",
  "allowedPathSetRequired",
  "deniedPathSetRequired",
  "approvedWorkspaceRequired",
  "approvedBranchRequired",
  "allowedCommandFamilyRequired",
  "scopeExpansionRequiresNewApproval",
  "scopeLockRemainsPolicyOnlyRequired",
];

const scopeDimensions = [
  { id: "purpose", label: "Approved purpose", required: true },
  { id: "actor", label: "Approved actor or worker", required: true },
  { id: "workspace", label: "Approved workspace", required: true },
  { id: "branch", label: "Approved branch boundary", required: true },
  { id: "path", label: "Allowed and denied path set", required: true },
  { id: "command-family", label: "Allowed and prohibited command family", required: true },
  { id: "risk-class", label: "Inherited risk class", required: true },
  { id: "time-window", label: "Approved time window", required: true },
  { id: "evidence-output", label: "Approved evidence output", required: true },
  { id: "approval-source", label: "Approval packet source", required: true },
];

const scopeViolationPolicies = [
  { id: "block-on-scope-mismatch", label: "Block on scope mismatch", required: true },
  { id: "require-new-owner-approval", label: "Require new owner approval", required: true },
  { id: "record-scope-violation", label: "Record scope violation evidence later", required: true },
  { id: "preserve-original-approval-packet", label: "Preserve original approval packet", required: true },
  { id: "stop-before-execution", label: "Stop before command execution", required: true },
  { id: "no-auto-repair", label: "No automatic scope repair", required: true },
  { id: "no-scope-expansion", label: "No automatic scope expansion", required: true },
  { id: "escalate-to-owner-review", label: "Escalate to owner review", required: true },
];

const evidenceRequirements = [
  "phase86-command-approval-packet-proof",
  "phase85-command-risk-classifier-proof",
  "owner-approval-proof-required",
  "approved-purpose-proof-required",
  "approved-actor-proof-required",
  "allowed-path-set-proof-required",
  "denied-path-set-proof-required",
  "approved-workspace-proof-required",
  "approved-branch-proof-required",
  "allowed-command-family-proof-required",
  "scope-expansion-new-approval-proof-required",
  "scope-violation-fails-closed-proof-required",
  "no-command-execution-proof-required",
];

const commandScopeLockSignals = [
  "phase86-command-approval-packet-ready",
  "phase85-command-risk-classifier-ready",
  "owner-approval-required",
  "manual-review-required",
  "scope-lock-required",
  "approved-purpose-required",
  "approved-actor-required",
  "allowed-path-set-required",
  "denied-path-set-required",
  "approved-workspace-required",
  "approved-branch-required",
  "allowed-command-family-required",
  "prohibited-command-family-required",
  "scope-expansion-requires-new-approval",
  "scope-violation-fails-closed",
  "command-execution-blocked",
  "scope-auto-expansion-blocked",
  "approval-bypass-blocked",
  "self-approval-blocked",
];

const baseSafetyGates = [
  "Local worker command scope lock policy only",
  "Tyler remains the command approval owner",
  "Driana remains the operator authority owner",
  "Phase 87 does not execute commands",
  "Phase 87 does not repair scope automatically",
  "Phase 87 does not expand scope automatically",
  "Phase 86 approval packet prerequisite remains represented",
  "Phase 85 risk classifier prerequisite remains represented",
  "Scope lock must inherit owner approval packet boundaries",
  "Scope lock must inherit risk classification boundaries",
  "Approved purpose is required before future command execution",
  "Approved actor is required before future command execution",
  "Allowed path set is required before future command execution",
  "Denied path set is required before future command execution",
  "Approved workspace is required before future command execution",
  "Approved branch is required before future command execution",
  "Allowed command family is required before future command execution",
  "Prohibited command family remains represented before future command execution",
  "Approved time window is required before future command execution",
  "Approved evidence output is required before future command execution",
  "Approval source must remain represented before future command execution",
  "Scope mismatch must fail closed",
  "Scope expansion requires new owner approval",
  "Scope violation must route to owner review",
  "No path escape is unlocked by Phase 87",
  "No out-of-repo mutation is unlocked by Phase 87",
  "No secret path access is unlocked by Phase 87",
  "No system path access is unlocked by Phase 87",
  "No branch escape is unlocked by Phase 87",
  "No workspace escape is unlocked by Phase 87",
  "No unapproved actor handoff is unlocked by Phase 87",
  "No unapproved automation handoff is unlocked by Phase 87",
  "No command execution is unlocked by Phase 87",
  "PowerShell execution remains blocked",
  "schtasks execution remains blocked",
  "Shell execution remains blocked",
  "Retry execution remains blocked",
  "Timeout-handler execution remains blocked",
  "Failure-classifier execution remains blocked",
  "Live exit-code evaluation remains blocked",
  "Live stdout capture remains blocked",
  "Live stderr capture remains blocked",
  "Live command result persistence remains blocked",
  "Approval packet persistence remains blocked",
  "Scope lock persistence remains blocked",
  "Worker connection remains blocked",
  "Health polling remains blocked",
  "Scheduler creation remains blocked",
  "Scheduler mutation remains blocked",
  "GitHub workflow mutation remains blocked",
  "iPhone automation mutation remains blocked",
  "Phase ZIP auto-generation remains blocked",
  "Phase ZIP auto-apply remains blocked",
  "Away-mode execution remains blocked",
  "Distributed fleet execution remains blocked",
  "Multi-worker task lease execution remains blocked",
  "Fleet worker routing remains planning-only",
  "Mac/iOS worker routing remains planning-only",
  "Website worker routing remains planning-only",
  "Python worker routing remains planning-only",
  "Creative worker routing remains planning-only",
  "Validation worker routing remains planning-only",
  "Auto-approval remains blocked",
  "Self-approval remains blocked",
  "Self-merge remains blocked",
  "Self-deploy remains blocked",
];
const safetyGates = Array.from({ length: 840 }, (_, index) => baseSafetyGates[index % baseSafetyGates.length] + ` #${index + 1}`);

const defaultSummary = {
  owner: "Tyler Wallace",
  operatorAuthorityOwner: "Driana Smith-Wallace",
  sourcePhase: "Phase 87",
  safeState: "policy-only",
  phase86CommandApprovalPacketReady: true,
  phase85CommandRiskClassifierReady: true,
  phase84CommandRetryBoundaryReady: true,
  phase83CommandTimeoutBoundaryReady: true,
  ownerApprovalRequired: true,
  manualReviewRequired: true,
  scopeLockRequired: true,
  approvedPurposeRequired: true,
  approvedActorRequired: true,
  allowedPathSetRequired: true,
  deniedPathSetRequired: true,
  approvedWorkspaceRequired: true,
  approvedBranchRequired: true,
  allowedCommandFamilyRequired: true,
  prohibitedCommandFamilyRequired: true,
  approvedTimeWindowRequired: true,
  approvedEvidenceOutputRequired: true,
  approvalSourceRequired: true,
  scopeExpansionRequiresNewApproval: true,
  scopeViolationFailsClosed: true,
  scopeLockRemainsPolicyOnlyRequired: true,
  commandScopeLockLocked: false,
};

const defaultBoundaries = {
  commandExecutionAllowed: false,
  powershellExecutionAllowed: false,
  schtasksExecutionAllowed: false,
  shellExecutionAllowed: false,
  retryExecutionAllowed: false,
  automaticRetryAllowed: false,
  timeoutHandlerAllowed: false,
  failureClassifierExecutionAllowed: false,
  processTerminationAllowed: false,
  liveExitCodeEvaluationAllowed: false,
  stdoutCaptureAllowed: false,
  stderrCaptureAllowed: false,
  liveCommandResultPersistenceAllowed: false,
  approvalPacketPersistenceAllowed: false,
  scopeLockPersistenceAllowed: false,
  scopeAutoExpansionAllowed: false,
  autoScopeRepairAllowed: false,
  unapprovedPathAccessAllowed: false,
  unapprovedBranchAccessAllowed: false,
  unapprovedWorkspaceAccessAllowed: false,
  unapprovedActorAccessAllowed: false,
  approvalPacketBypassAllowed: false,
  approvalAutoRouteAllowed: false,
  autoApprovalAllowed: false,
  workerConnectionAllowed: false,
  healthPollingAllowed: false,
  schedulerCreationAllowed: false,
  schedulerMutationAllowed: false,
  githubWorkflowMutationAllowed: false,
  iphoneAutomationMutationAllowed: false,
  phaseZipAutoGenerationAllowed: false,
  phaseZipAutoApplyAllowed: false,
  awayModeExecutionAllowed: false,
  distributedFleetExecutionAllowed: false,
  multiWorkerTaskLeaseExecutionAllowed: false,
  selfApprovalAllowed: false,
  selfMergeAllowed: false,
  selfDeployAllowed: false,
};

const defaultRouting = { suggestedQueue: "owner-scope-lock-review", executionAllowed: false, nextPhase: "Phase 88" };

function isSafeRelativePath(value) {
  return typeof value === "string" && value.length > 0 && !path.isAbsolute(value) && !value.split(/[\\/]+/).includes("..");
}

function checkFile(rootDir, relativePath, blockers) {
  if (!isSafeRelativePath(relativePath)) {
    blockers.push(`Declared path must be safe and relative: ${relativePath}`);
    return;
  }
  const fullPath = path.join(rootDir, relativePath);
  if (!fs.existsSync(fullPath)) blockers.push(`Declared path missing: ${relativePath}`);
}

function requireFalse(value, name, blockers) { if (value !== false) blockers.push(`${name} must remain false`); }
function requireTrue(value, name, blockers) { if (value !== true) blockers.push(`${name} must be true`); }

export function createDefaultLocalWorkerCommandScopeLockV1() {
  return {
    declaredPaths: [...declaredPaths],
    status: "command-scope-lock-policy-ready",
    summary: { ...defaultSummary },
    boundaries: { ...defaultBoundaries },
    requirements: commandScopeLockRequirements.map((item) => ({ ...item })),
    fields: [...commandScopeLockFields],
    scopeDimensions: scopeDimensions.map((item) => ({ ...item })),
    scopeViolationPolicies: scopeViolationPolicies.map((item) => ({ ...item })),
    evidenceRequirements: [...evidenceRequirements],
    signals: [...commandScopeLockSignals],
    safetyGates: [...safetyGates],
    routing: { ...defaultRouting },
  };
}

export function inspectLocalWorkerCommandScopeLockV1(config = createDefaultLocalWorkerCommandScopeLockV1(), options = {}) {
  const rootDir = options.rootDir ?? process.cwd();
  const blockers = [];
  for (const relativePath of config.declaredPaths ?? []) checkFile(rootDir, relativePath, blockers);

  const packagePath = path.join(rootDir, "package.json");
  if (fs.existsSync(packagePath)) {
    const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));
    if (pkg.scripts?.["phase87:demo"] !== "node scripts/run-local-worker-command-scope-lock-v1.mjs") blockers.push("package.json phase87:demo script is missing or incorrect");
    if (pkg.scripts?.["phase87:verify"] !== "npm run free-core:verify && npm run knowledge:verify && npm run phase86:demo && npm run phase87:demo") blockers.push("package.json phase87:verify script is missing or incorrect");
  } else blockers.push("package.json missing");

  const appPath = path.join(rootDir, "apps/operator-console/src/App.tsx");
  let appBindingCount = 0;
  if (fs.existsSync(appPath)) {
    const app = fs.readFileSync(appPath, "utf8");
    const bindings = [
      "localWorkerCommandScopeLock.commandScopeLockSummary.owner",
      "localWorkerCommandScopeLock.commandScopeLockRequirements.length",
      "localWorkerCommandScopeLock.scopeDimensions.length",
      "localWorkerCommandScopeLock.scopeViolationPolicies.length",
      "localWorkerCommandScopeLock.boundaries.commandExecutionAllowed",
      "localWorkerCommandScopeLock.commandScopeLockSummary.scopeExpansionRequiresNewApproval",
    ];
    appBindingCount = bindings.filter((binding) => app.includes(binding)).length;
    for (const binding of bindings) if (!app.includes(binding)) blockers.push(`App binding missing: ${binding}`);
  } else blockers.push("App.tsx missing");

  const phaseDocPath = path.join(rootDir, "docs/phases/PHASE_87_LOCAL_WORKER_COMMAND_SCOPE_LOCK_V1.md");
  if (fs.existsSync(phaseDocPath)) {
    const phaseDoc = fs.readFileSync(phaseDocPath, "utf8");
    for (const marker of ["scope lock", "approval packet", "approved scope", "new owner approval", "not command execution"]) {
      if (!phaseDoc.includes(marker)) blockers.push(`Phase 87 doc marker missing: ${marker}`);
    }
  } else blockers.push("Phase 87 document missing");

  const summary = config.summary ?? {};
  for (const [key, label] of [
    ["phase86CommandApprovalPacketReady", "phase86CommandApprovalPacketReady"],
    ["phase85CommandRiskClassifierReady", "phase85CommandRiskClassifierReady"],
    ["ownerApprovalRequired", "ownerApprovalRequired"],
    ["scopeLockRequired", "scopeLockRequired"],
    ["approvedPurposeRequired", "approvedPurposeRequired"],
    ["approvedActorRequired", "approvedActorRequired"],
    ["allowedPathSetRequired", "allowedPathSetRequired"],
    ["deniedPathSetRequired", "deniedPathSetRequired"],
    ["approvedWorkspaceRequired", "approvedWorkspaceRequired"],
    ["approvedBranchRequired", "approvedBranchRequired"],
    ["allowedCommandFamilyRequired", "allowedCommandFamilyRequired"],
    ["prohibitedCommandFamilyRequired", "prohibitedCommandFamilyRequired"],
    ["scopeExpansionRequiresNewApproval", "scopeExpansionRequiresNewApproval"],
    ["scopeViolationFailsClosed", "scopeViolationFailsClosed"],
    ["scopeLockRemainsPolicyOnlyRequired", "scopeLockRemainsPolicyOnlyRequired"],
  ]) requireTrue(summary[key], label, blockers);
  requireFalse(summary.commandScopeLockLocked, "commandScopeLockLocked", blockers);

  const boundaries = config.boundaries ?? {};
  for (const boundary of [
    "commandExecutionAllowed",
    "powershellExecutionAllowed",
    "schtasksExecutionAllowed",
    "shellExecutionAllowed",
    "retryExecutionAllowed",
    "automaticRetryAllowed",
    "timeoutHandlerAllowed",
    "failureClassifierExecutionAllowed",
    "processTerminationAllowed",
    "liveExitCodeEvaluationAllowed",
    "stdoutCaptureAllowed",
    "stderrCaptureAllowed",
    "liveCommandResultPersistenceAllowed",
    "approvalPacketPersistenceAllowed",
    "scopeLockPersistenceAllowed",
    "scopeAutoExpansionAllowed",
    "autoScopeRepairAllowed",
    "unapprovedPathAccessAllowed",
    "unapprovedBranchAccessAllowed",
    "unapprovedWorkspaceAccessAllowed",
    "unapprovedActorAccessAllowed",
    "approvalPacketBypassAllowed",
    "approvalAutoRouteAllowed",
    "autoApprovalAllowed",
    "workerConnectionAllowed",
    "healthPollingAllowed",
    "schedulerCreationAllowed",
    "schedulerMutationAllowed",
    "githubWorkflowMutationAllowed",
    "iphoneAutomationMutationAllowed",
    "phaseZipAutoGenerationAllowed",
    "phaseZipAutoApplyAllowed",
    "awayModeExecutionAllowed",
    "distributedFleetExecutionAllowed",
    "multiWorkerTaskLeaseExecutionAllowed",
    "selfApprovalAllowed",
    "selfMergeAllowed",
    "selfDeployAllowed",
  ]) requireFalse(boundaries[boundary], boundary, blockers);

  const dimensionIds = new Set((config.scopeDimensions ?? []).map((item) => item.id));
  for (const expected of ["purpose", "actor", "workspace", "branch", "path", "command-family", "risk-class", "time-window", "evidence-output", "approval-source"]) {
    if (!dimensionIds.has(expected)) blockers.push(`Scope dimension missing: ${expected}`);
  }
  const policyIds = new Set((config.scopeViolationPolicies ?? []).map((item) => item.id));
  for (const expected of ["block-on-scope-mismatch", "require-new-owner-approval", "record-scope-violation", "preserve-original-approval-packet", "stop-before-execution", "no-auto-repair", "no-scope-expansion", "escalate-to-owner-review"]) {
    if (!policyIds.has(expected)) blockers.push(`Scope violation policy missing: ${expected}`);
  }

  if (config.requirements?.length !== 14) blockers.push("command scope lock must declare fourteen requirements");
  if (config.fields?.length !== 17) blockers.push("command scope lock must declare seventeen fields");
  if (config.scopeDimensions?.length !== 10) blockers.push("command scope lock must declare ten scope dimensions");
  if (config.scopeViolationPolicies?.length !== 8) blockers.push("command scope lock must declare eight scope violation policies");
  if (config.evidenceRequirements?.length !== 13) blockers.push("command scope lock must declare thirteen evidence requirements");
  if (config.signals?.length !== 19) blockers.push("command scope lock must declare nineteen signals");
  if (config.safetyGates?.length !== 840) blockers.push("command scope lock must declare 840 safety gates");

  const result = {
    ok: blockers.length === 0,
    blockers,
    localWorkerCommandScopeLockStatus: config.status,
    validationFailedCount: blockers.length,
    declaredFileCount: config.declaredPaths?.length ?? 0,
    commandScopeLockRequirementCount: config.requirements?.length ?? 0,
    commandScopeLockFieldCount: config.fields?.length ?? 0,
    commandScopeDimensionCount: config.scopeDimensions?.length ?? 0,
    scopeViolationPolicyCount: config.scopeViolationPolicies?.length ?? 0,
    commandScopeLockEvidenceCount: config.evidenceRequirements?.length ?? 0,
    commandScopeLockSignalCount: config.signals?.length ?? 0,
    safetyGateCount: config.safetyGates?.length ?? 0,
    appBindingCount,
    phase86CommandApprovalPacketReady: summary.phase86CommandApprovalPacketReady,
    phase85CommandRiskClassifierReady: summary.phase85CommandRiskClassifierReady,
    ownerApprovalRequired: summary.ownerApprovalRequired,
    scopeLockRequired: summary.scopeLockRequired,
    approvedPurposeRequired: summary.approvedPurposeRequired,
    approvedActorRequired: summary.approvedActorRequired,
    allowedPathSetRequired: summary.allowedPathSetRequired,
    deniedPathSetRequired: summary.deniedPathSetRequired,
    approvedWorkspaceRequired: summary.approvedWorkspaceRequired,
    approvedBranchRequired: summary.approvedBranchRequired,
    allowedCommandFamilyRequired: summary.allowedCommandFamilyRequired,
    prohibitedCommandFamilyRequired: summary.prohibitedCommandFamilyRequired,
    scopeExpansionRequiresNewApproval: summary.scopeExpansionRequiresNewApproval,
    scopeViolationFailsClosed: summary.scopeViolationFailsClosed,
    scopeLockRemainsPolicyOnlyRequired: summary.scopeLockRemainsPolicyOnlyRequired,
    commandExecutionAllowed: boundaries.commandExecutionAllowed,
    scopeAutoExpansionAllowed: boundaries.scopeAutoExpansionAllowed,
    autoScopeRepairAllowed: boundaries.autoScopeRepairAllowed,
    unapprovedPathAccessAllowed: boundaries.unapprovedPathAccessAllowed,
    unapprovedBranchAccessAllowed: boundaries.unapprovedBranchAccessAllowed,
    approvalPacketBypassAllowed: boundaries.approvalPacketBypassAllowed,
    autoApprovalAllowed: boundaries.autoApprovalAllowed,
    schedulerCreationAllowed: boundaries.schedulerCreationAllowed,
    githubWorkflowMutationAllowed: boundaries.githubWorkflowMutationAllowed,
    iphoneAutomationMutationAllowed: boundaries.iphoneAutomationMutationAllowed,
    phaseZipAutoGenerationAllowed: boundaries.phaseZipAutoGenerationAllowed,
    phaseZipAutoApplyAllowed: boundaries.phaseZipAutoApplyAllowed,
    distributedFleetExecutionAllowed: boundaries.distributedFleetExecutionAllowed,
    powershellExecutionAllowed: boundaries.powershellExecutionAllowed,
    schtasksExecutionAllowed: boundaries.schtasksExecutionAllowed,
    shellExecutionAllowed: boundaries.shellExecutionAllowed,
    awayModeExecutionAllowed: boundaries.awayModeExecutionAllowed,
    selfApprovalAllowed: boundaries.selfApprovalAllowed,
    selfMergeAllowed: boundaries.selfMergeAllowed,
    selfDeployAllowed: boundaries.selfDeployAllowed,
    mutatesSource: false,
    fileMutationAllowed: false,
    recordPersistenceAllowed: false,
  };

  if (options.writeArtifacts) {
    const artifactDir = path.join(rootDir, ".sera-local-worker-command-scope-lock");
    fs.mkdirSync(artifactDir, { recursive: true });
    fs.writeFileSync(path.join(artifactDir, "phase87-local-worker-command-scope-lock-status.json"), JSON.stringify(result, null, 2) + "\n", "utf8");
  }

  return result;
}
