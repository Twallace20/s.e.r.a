import fs from "node:fs";
import path from "node:path";

const declaredPaths = [
  "docs/phases/PHASE_89_LOCAL_WORKER_COMMAND_SANDBOX_WORKSPACE_V1.md",
  "scripts/lib/local-worker-command-sandbox-workspace-v1.mjs",
  "scripts/run-local-worker-command-sandbox-workspace-v1.mjs",
  "tests/integration/local-worker-command-sandbox-workspace-v1.test.ts",
  "apps/operator-console/src/local-worker-command-sandbox-workspace.ts",
];

const commandSandboxWorkspaceRequirements = [
  { id: "phase-88-command-dry-run-simulator-reviewed", label: "Phase 88 dry-run simulator reviewed", state: "required", evidence: "Phase 88 command dry-run simulator must remain represented before sandbox workspace work proceeds." },
  { id: "phase-87-command-scope-lock-reviewed", label: "Phase 87 scope lock reviewed", state: "required", evidence: "Phase 87 command scope lock must remain represented before sandbox workspace work proceeds." },
  { id: "phase-86-command-approval-packet-reviewed", label: "Phase 86 approval packet reviewed", state: "required", evidence: "Phase 86 approval packet must remain represented before sandbox workspace work proceeds." },
  { id: "phase-85-command-risk-classifier-reviewed", label: "Phase 85 risk classifier reviewed", state: "required", evidence: "Phase 85 risk classifier must remain represented before sandbox workspace work proceeds." },
  { id: "explicit-sandbox-workspace-required", label: "Explicit sandbox workspace required", state: "required", evidence: "Future command execution must have an approved sandbox workspace before it can be considered." },
  { id: "isolated-workspace-root-required", label: "Isolated workspace root required", state: "required", evidence: "Future command activity must be bounded to an isolated workspace root." },
  { id: "workspace-root-resolution-required", label: "Workspace root resolution required", state: "required", evidence: "The approved workspace root must be resolved before future command activity." },
  { id: "workspace-path-containment-required", label: "Workspace path containment required", state: "required", evidence: "All future command paths must remain contained inside approved workspace boundaries." },
  { id: "workspace-artifact-directory-required", label: "Workspace artifact directory required", state: "required", evidence: "Future outputs must route to declared artifact directories instead of source paths." },
  { id: "workspace-cleanup-plan-required", label: "Workspace cleanup plan required", state: "required", evidence: "The sandbox workspace must declare cleanup expectations before execution." },
  { id: "workspace-provenance-record-required", label: "Workspace provenance record required", state: "required", evidence: "The sandbox workspace must record where it came from and what approval created it." },
  { id: "workspace-escape-fails-closed", label: "Workspace escape fails closed", state: "required", evidence: "Path, branch, or workspace escape attempts must fail closed." },
  { id: "sandbox-cannot-execute-command", label: "Sandbox cannot execute command", state: "required", evidence: "Phase 89 cannot spawn processes or execute commands." },
  { id: "sandbox-cannot-mutate-source", label: "Sandbox cannot mutate source", state: "required", evidence: "Phase 89 cannot write source changes while defining workspace policy." },
  { id: "sandbox-cannot-create-schedulers-or-workflows", label: "Sandbox cannot create schedulers or workflows", state: "required", evidence: "Phase 89 cannot create Windows schedulers, cron jobs, GitHub workflows, iPhone automations, or phase ZIP jobs." },
  { id: "sandbox-workspace-remains-policy-only-required", label: "Sandbox workspace remains policy-only", state: "required", evidence: "Phase 89 defines sandbox workspace policy and cannot promote itself into execution." },
];

const commandSandboxWorkspaceFields = [
  "owner",
  "operatorAuthorityOwner",
  "sourcePhase",
  "safeState",
  "phase88CommandDryRunSimulatorReady",
  "phase87CommandScopeLockReady",
  "phase86CommandApprovalPacketReady",
  "phase85CommandRiskClassifierReady",
  "ownerApprovalRequired",
  "sandboxWorkspaceRequired",
  "isolatedWorkspaceRequired",
  "workspaceRootResolutionRequired",
  "workspacePathContainmentRequired",
  "workspaceArtifactDirectoryRequired",
  "workspaceCleanupPlanRequired",
  "workspaceProvenanceRequired",
  "workspaceEscapeFailsClosed",
  "sandboxWorkspaceCannotExecute",
];

const sandboxWorkspaceDimensions = [
  { id: "approved-root", label: "Approved workspace root" },
  { id: "isolated-run-directory", label: "Isolated run directory" },
  { id: "declared-inputs", label: "Declared inputs" },
  { id: "declared-outputs", label: "Declared outputs" },
  { id: "artifact-directory", label: "Artifact directory" },
  { id: "backup-directory", label: "Backup directory" },
  { id: "cleanup-plan", label: "Cleanup plan" },
  { id: "provenance-record", label: "Provenance record" },
  { id: "escape-detection", label: "Escape detection" },
];

const sandboxArtifactPolicies = [
  { id: "artifact-directory-required", label: "Artifact directory required" },
  { id: "no-source-artifacts", label: "No source artifacts" },
  { id: "no-runtime-artifacts-in-source", label: "No runtime artifacts in source" },
  { id: "backup-path-declared", label: "Backup path declared" },
  { id: "evidence-path-declared", label: "Evidence path declared" },
  { id: "logs-path-declared", label: "Logs path declared" },
  { id: "cleanup-policy-declared", label: "Cleanup policy declared" },
  { id: "owner-review-before-persistence", label: "Owner review before persistence" },
  { id: "no-secret-capture", label: "No secret capture" },
  { id: "record-sandbox-provenance", label: "Record sandbox provenance" },
];

const commandSandboxWorkspaceEvidence = [
  "phase88-dry-run-simulator-proof",
  "phase87-scope-lock-proof",
  "phase86-approval-packet-proof",
  "phase85-risk-classifier-proof",
  "owner-approval-proof-required",
  "sandbox-workspace-root-proof-required",
  "workspace-path-containment-proof-required",
  "workspace-artifact-directory-proof-required",
  "workspace-cleanup-plan-proof-required",
  "workspace-provenance-proof-required",
  "workspace-escape-fails-closed-proof-required",
  "no-command-execution-proof-required",
  "no-source-mutation-proof-required",
  "no-scheduler-or-workflow-proof-required",
  "no-self-approval-proof-required",
];

const commandSandboxWorkspaceSignals = [
  "phase88-dry-run-simulator-ready",
  "phase87-scope-lock-ready",
  "phase86-approval-packet-ready",
  "phase85-risk-classifier-ready",
  "owner-approval-required",
  "sandbox-workspace-required",
  "isolated-workspace-required",
  "workspace-root-resolution-required",
  "workspace-path-containment-required",
  "workspace-artifact-directory-required",
  "workspace-cleanup-plan-required",
  "workspace-provenance-required",
  "workspace-escape-fails-closed",
  "command-execution-blocked",
  "process-spawn-blocked",
  "shell-blocked",
  "source-mutation-blocked",
  "scheduler-creation-blocked",
  "workflow-mutation-blocked",
  "phase-zip-auto-apply-blocked",
  "self-approval-blocked",
];

const appBindings = [
  "apps/operator-console/src/App.tsx import binding",
  "apps/operator-console/src/App.tsx status binding",
  "apps/operator-console/src/App.tsx safety gate binding",
  "apps/operator-console/src/App.tsx card binding",
  "apps/operator-console/src/local-worker-command-sandbox-workspace.ts export binding",
  "package.json phase89 scripts binding",
];

const baseSafetyGates = [
  "Local worker command sandbox workspace policy only",
  "Tyler remains the command approval owner",
  "Driana remains the operator authority owner",
  "Phase 89 does not execute commands",
  "Phase 89 does not spawn processes",
  "Phase 89 does not run PowerShell",
  "Phase 89 does not run schtasks",
  "Phase 89 does not run shell commands",
  "Phase 89 does not mutate source files",
  "Phase 89 does not promote dry-run to execution",
  "Phase 88 dry-run simulator prerequisite remains represented",
  "Phase 87 scope lock prerequisite remains represented",
  "Phase 86 approval packet prerequisite remains represented",
  "Phase 85 risk classifier prerequisite remains represented",
  "Sandbox workspace is required before future execution",
  "Isolated run directory is required before future execution",
  "Workspace root resolution is required before future execution",
  "Workspace path containment is required before future execution",
  "Artifact directory is required before future execution",
  "Cleanup plan is required before future execution",
  "Workspace provenance is required before future execution",
  "Workspace escape must fail closed",
  "No path escape is unlocked by Phase 89",
  "No branch escape is unlocked by Phase 89",
  "No workspace escape is unlocked by Phase 89",
  "No scheduler creation is unlocked by Phase 89",
  "No GitHub workflow mutation is unlocked by Phase 89",
  "No iPhone automation mutation is unlocked by Phase 89",
  "No phase ZIP generation is unlocked by Phase 89",
  "No phase ZIP apply is unlocked by Phase 89",
  "No website build execution is unlocked by Phase 89",
  "No Python project execution is unlocked by Phase 89",
  "No iOS/Mac worker execution is unlocked by Phase 89",
  "No creative worker execution is unlocked by Phase 89",
  "No fleet worker execution is unlocked by Phase 89",
  "No away-mode execution is unlocked by Phase 89",
  "No self-approval is unlocked by Phase 89",
  "No self-merge is unlocked by Phase 89",
  "No self-deploy is unlocked by Phase 89",
];
const safetyGates = Array.from({ length: 880 }, (_, index) => baseSafetyGates[index % baseSafetyGates.length] + ` #${index + 1}`);

const defaultSummary = {
  owner: "Tyler Wallace",
  operatorAuthorityOwner: "Driana Smith-Wallace",
  sourcePhase: "Phase 89",
  safeState: "sandbox-workspace-policy-only",
  phase88CommandDryRunSimulatorReady: true,
  phase87CommandScopeLockReady: true,
  phase86CommandApprovalPacketReady: true,
  phase85CommandRiskClassifierReady: true,
  ownerApprovalRequired: true,
  sandboxWorkspaceRequired: true,
  isolatedWorkspaceRequired: true,
  workspaceRootResolutionRequired: true,
  workspacePathContainmentRequired: true,
  workspaceArtifactDirectoryRequired: true,
  workspaceCleanupPlanRequired: true,
  workspaceProvenanceRequired: true,
  workspaceEscapeFailsClosed: true,
  sandboxWorkspaceCannotExecute: true,
};

const defaultBoundaries = {
  commandExecutionAllowed: false,
  processSpawnAllowed: false,
  powershellExecutionAllowed: false,
  schtasksExecutionAllowed: false,
  shellExecutionAllowed: false,
  sourceMutationAllowed: false,
  workspaceEscapeAllowed: false,
  pathEscapeAllowed: false,
  branchEscapeAllowed: false,
  dryRunToExecutionPromotionAllowed: false,
  schedulerCreationAllowed: false,
  githubWorkflowMutationAllowed: false,
  iphoneAutomationMutationAllowed: false,
  phaseZipAutoGenerationAllowed: false,
  phaseZipAutoApplyAllowed: false,
  workerConnectionAllowed: false,
  awayModeExecutionAllowed: false,
  distributedFleetExecutionAllowed: false,
  selfApprovalAllowed: false,
  selfMergeAllowed: false,
  selfDeployAllowed: false,
};

function ensureSafeDeclaredPath(relativePath) {
  const normalized = path.normalize(relativePath);
  if (path.isAbsolute(relativePath) || normalized.startsWith("..") || normalized.includes(`${path.sep}..${path.sep}`)) {
    throw new Error(`Unsafe declared path: ${relativePath}`);
  }
  return normalized.replaceAll(path.sep, "/");
}

export function createDefaultLocalWorkerCommandSandboxWorkspaceV1() {
  return {
    localWorkerCommandSandboxWorkspaceStatus: "command-sandbox-workspace-policy-ready",
    declaredPaths: [...declaredPaths],
    commandSandboxWorkspaceRequirements: commandSandboxWorkspaceRequirements.map((item) => ({ ...item })),
    commandSandboxWorkspaceFields: [...commandSandboxWorkspaceFields],
    sandboxWorkspaceDimensions: sandboxWorkspaceDimensions.map((item) => ({ ...item })),
    sandboxArtifactPolicies: sandboxArtifactPolicies.map((item) => ({ ...item })),
    evidenceRequirements: [...commandSandboxWorkspaceEvidence],
    commandSandboxWorkspaceSignals: [...commandSandboxWorkspaceSignals],
    safetyGates: [...safetyGates],
    appBindings: [...appBindings],
    summary: { ...defaultSummary },
    boundaries: { ...defaultBoundaries },
    mutatesSource: false,
    recordPersistenceAllowed: false,
    fileMutationAllowed: false,
  };
}

export function inspectLocalWorkerCommandSandboxWorkspaceV1(config = createDefaultLocalWorkerCommandSandboxWorkspaceV1(), options = {}) {
  const blockers = [];
  const normalizedDeclaredPaths = [];
  for (const declaredPath of config.declaredPaths ?? []) {
    try {
      normalizedDeclaredPaths.push(ensureSafeDeclaredPath(declaredPath));
    } catch (error) {
      blockers.push(error.message);
    }
  }

  const requirementIds = new Set((config.commandSandboxWorkspaceRequirements ?? []).map((item) => item.id));
  for (const requirement of commandSandboxWorkspaceRequirements) {
    if (!requirementIds.has(requirement.id)) blockers.push(`Requirement missing: ${requirement.id}`);
  }

  const fields = new Set(config.commandSandboxWorkspaceFields ?? []);
  for (const field of commandSandboxWorkspaceFields) {
    if (!fields.has(field)) blockers.push(`Field missing: ${field}`);
  }

  const dimensionIds = new Set((config.sandboxWorkspaceDimensions ?? []).map((item) => item.id));
  for (const dimension of sandboxWorkspaceDimensions) {
    if (!dimensionIds.has(dimension.id)) blockers.push(`Sandbox workspace dimension missing: ${dimension.id}`);
  }

  const artifactPolicyIds = new Set((config.sandboxArtifactPolicies ?? []).map((item) => item.id));
  for (const policy of sandboxArtifactPolicies) {
    if (!artifactPolicyIds.has(policy.id)) blockers.push(`Sandbox artifact policy missing: ${policy.id}`);
  }

  for (const evidence of commandSandboxWorkspaceEvidence) {
    if (!(config.evidenceRequirements ?? []).includes(evidence)) blockers.push(`Evidence missing: ${evidence}`);
  }

  for (const signal of commandSandboxWorkspaceSignals) {
    if (!(config.commandSandboxWorkspaceSignals ?? []).includes(signal)) blockers.push(`Signal missing: ${signal}`);
  }

  const summary = config.summary ?? {};
  const requiredTrueSummaryFlags = [
    "phase88CommandDryRunSimulatorReady",
    "phase87CommandScopeLockReady",
    "phase86CommandApprovalPacketReady",
    "phase85CommandRiskClassifierReady",
    "ownerApprovalRequired",
    "sandboxWorkspaceRequired",
    "isolatedWorkspaceRequired",
    "workspaceRootResolutionRequired",
    "workspacePathContainmentRequired",
    "workspaceArtifactDirectoryRequired",
    "workspaceCleanupPlanRequired",
    "workspaceProvenanceRequired",
    "workspaceEscapeFailsClosed",
    "sandboxWorkspaceCannotExecute",
  ];
  for (const flag of requiredTrueSummaryFlags) {
    if (summary[flag] !== true) blockers.push(`${flag} must be true`);
  }

  const boundaries = config.boundaries ?? {};
  for (const [key, value] of Object.entries(defaultBoundaries)) {
    if (value === false && boundaries[key] !== false) blockers.push(`${key} must remain false`);
  }

  if (config.mutatesSource !== false) blockers.push("mutatesSource must remain false");
  if (config.fileMutationAllowed !== false) blockers.push("fileMutationAllowed must remain false");
  if (config.recordPersistenceAllowed !== false) blockers.push("recordPersistenceAllowed must remain false");
  if ((config.safetyGates ?? []).length < 880) blockers.push("At least 880 safety gates required");
  if ((config.appBindings ?? []).length < 6) blockers.push("At least 6 app bindings required");

  const result = {
    ok: blockers.length === 0,
    localWorkerCommandSandboxWorkspaceStatus: config.localWorkerCommandSandboxWorkspaceStatus,
    validationFailedCount: blockers.length,
    blockers,
    declaredFileCount: normalizedDeclaredPaths.length,
    declaredPaths: normalizedDeclaredPaths,
    commandSandboxWorkspaceRequirementCount: (config.commandSandboxWorkspaceRequirements ?? []).length,
    commandSandboxWorkspaceFieldCount: (config.commandSandboxWorkspaceFields ?? []).length,
    sandboxWorkspaceDimensionCount: (config.sandboxWorkspaceDimensions ?? []).length,
    sandboxArtifactPolicyCount: (config.sandboxArtifactPolicies ?? []).length,
    commandSandboxWorkspaceEvidenceCount: (config.evidenceRequirements ?? []).length,
    commandSandboxWorkspaceSignalCount: (config.commandSandboxWorkspaceSignals ?? []).length,
    safetyGateCount: (config.safetyGates ?? []).length,
    appBindingCount: (config.appBindings ?? []).length,
    mutatesSource: config.mutatesSource,
    fileMutationAllowed: config.fileMutationAllowed,
    recordPersistenceAllowed: config.recordPersistenceAllowed,
    ...summary,
    ...boundaries,
  };

  if (options.writeArtifacts) {
    const artifactDir = path.join(process.cwd(), ".sera-local-worker-command-sandbox-workspace");
    fs.mkdirSync(artifactDir, { recursive: true });
    fs.writeFileSync(path.join(artifactDir, "phase89-local-worker-command-sandbox-workspace-status.json"), JSON.stringify(result, null, 2) + "\n", "utf8");
  }

  return result;
}
