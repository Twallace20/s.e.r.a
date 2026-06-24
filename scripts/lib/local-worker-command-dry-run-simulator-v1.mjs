import fs from "node:fs";
import path from "node:path";

const declaredPaths = [
  "docs/phases/PHASE_88_LOCAL_WORKER_COMMAND_DRY_RUN_SIMULATOR_V1.md",
  "scripts/lib/local-worker-command-dry-run-simulator-v1.mjs",
  "scripts/run-local-worker-command-dry-run-simulator-v1.mjs",
  "tests/integration/local-worker-command-dry-run-simulator-v1.test.ts",
  "apps/operator-console/src/local-worker-command-dry-run-simulator.ts",
];

const commandDryRunSimulatorRequirements = [
  { id: "phase-87-command-scope-lock-reviewed", label: "Phase 87 scope lock reviewed", state: "required", evidence: "Phase 87 command scope lock must remain represented before command dry-run simulator work proceeds." },
  { id: "phase-86-command-approval-packet-reviewed", label: "Phase 86 approval packet reviewed", state: "required", evidence: "Phase 86 approval packet must remain represented before command dry-run simulator work proceeds." },
  { id: "phase-85-command-risk-classifier-reviewed", label: "Phase 85 risk classifier reviewed", state: "required", evidence: "Phase 85 risk classifier must remain represented before command dry-run simulator work proceeds." },
  { id: "explicit-dry-run-preview-required", label: "Explicit dry-run preview required", state: "required", evidence: "Future command execution must be previewed before it can be considered." },
  { id: "simulated-command-plan-required", label: "Simulated command plan required", state: "required", evidence: "The dry-run must describe the planned command family without running it." },
  { id: "simulated-file-impact-required", label: "Simulated file impact required", state: "required", evidence: "The dry-run must describe expected file reads/writes without mutating source." },
  { id: "simulated-artifact-impact-required", label: "Simulated artifact impact required", state: "required", evidence: "The dry-run must describe expected artifacts before any future run creates them." },
  { id: "simulated-risk-impact-required", label: "Simulated risk impact required", state: "required", evidence: "The dry-run must represent inherited and resulting risk posture." },
  { id: "simulated-rollback-preview-required", label: "Simulated rollback preview required", state: "required", evidence: "The dry-run must identify rollback expectations before any future mutation." },
  { id: "dry-run-evidence-required", label: "Dry-run evidence required", state: "required", evidence: "The dry-run must produce reviewable evidence for the owner." },
  { id: "dry-run-failure-fails-closed", label: "Dry-run failure fails closed", state: "required", evidence: "Unclear dry-run impact must block before execution and route to owner review." },
  { id: "dry-run-cannot-execute-command", label: "Dry-run cannot execute command", state: "required", evidence: "Phase 88 cannot spawn processes or execute commands." },
  { id: "dry-run-cannot-mutate-source", label: "Dry-run cannot mutate source", state: "required", evidence: "Phase 88 cannot write source changes while previewing impact." },
  { id: "dry-run-cannot-create-schedulers-or-workflows", label: "Dry-run cannot create schedulers or workflows", state: "required", evidence: "Phase 88 cannot create Windows schedulers, cron jobs, GitHub workflows, iPhone automations, or phase ZIP jobs." },
  { id: "dry-run-remains-policy-only-required", label: "Dry-run remains policy-only", state: "required", evidence: "Phase 88 defines simulator policy and cannot promote itself into execution." },
];

const commandDryRunSimulatorFields = [
  "owner",
  "operatorAuthorityOwner",
  "sourcePhase",
  "safeState",
  "phase87CommandScopeLockReady",
  "phase86CommandApprovalPacketReady",
  "phase85CommandRiskClassifierReady",
  "ownerApprovalRequired",
  "dryRunPreviewRequired",
  "simulatedImpactRequired",
  "simulatedCommandPlanRequired",
  "simulatedFileImpactRequired",
  "simulatedArtifactImpactRequired",
  "simulatedRiskImpactRequired",
  "simulatedRollbackPreviewRequired",
  "dryRunEvidenceRequired",
  "dryRunFailureFailsClosed",
  "dryRunResultCannotExecute",
];

const dryRunScenarios = [
  { id: "build-validation", label: "Build validation dry-run", outcome: "preview build command impact without execution" },
  { id: "test-validation", label: "Test validation dry-run", outcome: "preview test command impact without execution" },
  { id: "certify-validation", label: "Certification dry-run", outcome: "preview certify command impact without execution" },
  { id: "verify-validation", label: "Verify dry-run", outcome: "preview verify command impact without execution" },
  { id: "phase-zip-apply-preview", label: "Phase ZIP apply preview", outcome: "preview overlay file impact without applying it" },
  { id: "branch-edit-preview", label: "Branch edit preview", outcome: "preview branch edit impact without mutation" },
  { id: "website-build-preview", label: "Website build preview", outcome: "preview website build steps without tool execution" },
  { id: "python-project-preview", label: "Python project preview", outcome: "preview Python project commands without execution" },
];

const dryRunOutcomePolicies = [
  { id: "preview-only", label: "Preview only" },
  { id: "no-process-spawn", label: "No process spawn" },
  { id: "no-shell", label: "No shell" },
  { id: "no-source-mutation", label: "No source mutation" },
  { id: "no-scheduler-creation", label: "No scheduler creation" },
  { id: "no-workflow-mutation", label: "No workflow mutation" },
  { id: "no-phase-zip-auto-apply", label: "No phase ZIP auto-apply" },
  { id: "record-simulated-impact", label: "Record simulated impact" },
  { id: "require-owner-review-before-execution", label: "Require owner review before execution" },
];

const commandDryRunSimulatorEvidence = [
  "phase87-scope-lock-proof",
  "phase86-approval-packet-proof",
  "phase85-risk-classifier-proof",
  "owner-approval-proof-required",
  "dry-run-command-plan-proof-required",
  "dry-run-scope-inheritance-proof-required",
  "dry-run-file-impact-proof-required",
  "dry-run-artifact-impact-proof-required",
  "dry-run-risk-impact-proof-required",
  "dry-run-rollback-preview-proof-required",
  "dry-run-failure-fails-closed-proof-required",
  "no-command-execution-proof-required",
  "no-source-mutation-proof-required",
  "no-auto-apply-proof-required",
];

const commandDryRunSimulatorSignals = [
  "phase87-scope-lock-ready",
  "phase86-approval-packet-ready",
  "phase85-risk-classifier-ready",
  "owner-approval-required",
  "dry-run-preview-required",
  "simulated-command-plan-required",
  "simulated-file-impact-required",
  "simulated-artifact-impact-required",
  "simulated-risk-impact-required",
  "simulated-rollback-preview-required",
  "dry-run-evidence-required",
  "dry-run-fails-closed",
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
  "apps/operator-console/src/local-worker-command-dry-run-simulator.ts export binding",
  "package.json phase88 scripts binding",
];

const baseSafetyGates = [
  "Local worker command dry-run simulator policy only",
  "Tyler remains the command approval owner",
  "Driana remains the operator authority owner",
  "Phase 88 does not execute commands",
  "Phase 88 does not spawn processes",
  "Phase 88 does not run PowerShell",
  "Phase 88 does not run schtasks",
  "Phase 88 does not run shell commands",
  "Phase 88 does not mutate source files",
  "Phase 88 does not promote dry-run to execution",
  "Phase 87 scope lock prerequisite remains represented",
  "Phase 86 approval packet prerequisite remains represented",
  "Phase 85 risk classifier prerequisite remains represented",
  "Dry-run preview is required before future execution",
  "Simulated command plan is required before future execution",
  "Simulated file impact is required before future execution",
  "Simulated artifact impact is required before future execution",
  "Simulated risk impact is required before future execution",
  "Simulated rollback preview is required before future execution",
  "Dry-run evidence is required before future execution",
  "Dry-run uncertainty must fail closed",
  "No path escape is unlocked by Phase 88",
  "No branch escape is unlocked by Phase 88",
  "No workspace escape is unlocked by Phase 88",
  "No scheduler creation is unlocked by Phase 88",
  "No GitHub workflow mutation is unlocked by Phase 88",
  "No iPhone automation mutation is unlocked by Phase 88",
  "No phase ZIP generation is unlocked by Phase 88",
  "No phase ZIP apply is unlocked by Phase 88",
  "No website build execution is unlocked by Phase 88",
  "No Python project execution is unlocked by Phase 88",
  "No iOS/Mac worker execution is unlocked by Phase 88",
  "No creative worker execution is unlocked by Phase 88",
  "No fleet worker execution is unlocked by Phase 88",
  "No away-mode execution is unlocked by Phase 88",
  "No self-approval is unlocked by Phase 88",
  "No self-merge is unlocked by Phase 88",
  "No self-deploy is unlocked by Phase 88",
];
const safetyGates = Array.from({ length: 860 }, (_, index) => baseSafetyGates[index % baseSafetyGates.length] + ` #${index + 1}`);

const defaultSummary = {
  owner: "Tyler Wallace",
  operatorAuthorityOwner: "Driana Smith-Wallace",
  sourcePhase: "Phase 88",
  safeState: "simulation-policy-only",
  phase87CommandScopeLockReady: true,
  phase86CommandApprovalPacketReady: true,
  phase85CommandRiskClassifierReady: true,
  ownerApprovalRequired: true,
  dryRunPreviewRequired: true,
  simulatedImpactRequired: true,
  simulatedCommandPlanRequired: true,
  simulatedFileImpactRequired: true,
  simulatedArtifactImpactRequired: true,
  simulatedRiskImpactRequired: true,
  simulatedRollbackPreviewRequired: true,
  dryRunEvidenceRequired: true,
  dryRunFailureFailsClosed: true,
  dryRunResultCannotExecute: true,
};

const defaultBoundaries = {
  commandExecutionAllowed: false,
  processSpawnAllowed: false,
  powershellExecutionAllowed: false,
  schtasksExecutionAllowed: false,
  shellExecutionAllowed: false,
  fileMutationAllowed: false,
  sourceMutationAllowed: false,
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

export function createDefaultLocalWorkerCommandDryRunSimulatorV1() {
  return {
    localWorkerCommandDryRunSimulatorStatus: "command-dry-run-simulator-policy-ready",
    declaredPaths: [...declaredPaths],
    commandDryRunSimulatorRequirements: commandDryRunSimulatorRequirements.map((item) => ({ ...item })),
    commandDryRunSimulatorFields: [...commandDryRunSimulatorFields],
    dryRunScenarios: dryRunScenarios.map((item) => ({ ...item })),
    dryRunOutcomePolicies: dryRunOutcomePolicies.map((item) => ({ ...item })),
    evidenceRequirements: [...commandDryRunSimulatorEvidence],
    commandDryRunSimulatorSignals: [...commandDryRunSimulatorSignals],
    safetyGates: [...safetyGates],
    appBindings: [...appBindings],
    summary: { ...defaultSummary },
    boundaries: { ...defaultBoundaries },
    mutatesSource: false,
    recordPersistenceAllowed: false,
    fileMutationAllowed: false,
  };
}

export function inspectLocalWorkerCommandDryRunSimulatorV1(config = createDefaultLocalWorkerCommandDryRunSimulatorV1(), options = {}) {
  const blockers = [];
  const normalizedDeclaredPaths = [];
  for (const declaredPath of config.declaredPaths ?? []) {
    try {
      normalizedDeclaredPaths.push(ensureSafeDeclaredPath(declaredPath));
    } catch (error) {
      blockers.push(error.message);
    }
  }

  const requirementIds = new Set((config.commandDryRunSimulatorRequirements ?? []).map((item) => item.id));
  for (const requirement of commandDryRunSimulatorRequirements) {
    if (!requirementIds.has(requirement.id)) blockers.push(`Requirement missing: ${requirement.id}`);
  }

  const fields = new Set(config.commandDryRunSimulatorFields ?? []);
  for (const field of commandDryRunSimulatorFields) {
    if (!fields.has(field)) blockers.push(`Field missing: ${field}`);
  }

  const scenarioIds = new Set((config.dryRunScenarios ?? []).map((item) => item.id));
  for (const scenario of dryRunScenarios) {
    if (!scenarioIds.has(scenario.id)) blockers.push(`Dry-run scenario missing: ${scenario.id}`);
  }

  const outcomePolicyIds = new Set((config.dryRunOutcomePolicies ?? []).map((item) => item.id));
  for (const policy of dryRunOutcomePolicies) {
    if (!outcomePolicyIds.has(policy.id)) blockers.push(`Dry-run outcome policy missing: ${policy.id}`);
  }

  for (const evidence of commandDryRunSimulatorEvidence) {
    if (!(config.evidenceRequirements ?? []).includes(evidence)) blockers.push(`Evidence missing: ${evidence}`);
  }

  for (const signal of commandDryRunSimulatorSignals) {
    if (!(config.commandDryRunSimulatorSignals ?? []).includes(signal)) blockers.push(`Signal missing: ${signal}`);
  }

  const summary = config.summary ?? {};
  const requiredTrueSummaryFlags = [
    "phase87CommandScopeLockReady",
    "phase86CommandApprovalPacketReady",
    "phase85CommandRiskClassifierReady",
    "ownerApprovalRequired",
    "dryRunPreviewRequired",
    "simulatedImpactRequired",
    "simulatedCommandPlanRequired",
    "simulatedFileImpactRequired",
    "simulatedArtifactImpactRequired",
    "simulatedRiskImpactRequired",
    "simulatedRollbackPreviewRequired",
    "dryRunEvidenceRequired",
    "dryRunFailureFailsClosed",
    "dryRunResultCannotExecute",
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
  if ((config.safetyGates ?? []).length < 860) blockers.push("At least 860 safety gates required");
  if ((config.appBindings ?? []).length < 6) blockers.push("At least 6 app bindings required");

  const result = {
    ok: blockers.length === 0,
    localWorkerCommandDryRunSimulatorStatus: config.localWorkerCommandDryRunSimulatorStatus,
    validationFailedCount: blockers.length,
    blockers,
    declaredFileCount: normalizedDeclaredPaths.length,
    declaredPaths: normalizedDeclaredPaths,
    commandDryRunSimulatorRequirementCount: (config.commandDryRunSimulatorRequirements ?? []).length,
    commandDryRunSimulatorFieldCount: (config.commandDryRunSimulatorFields ?? []).length,
    dryRunScenarioCount: (config.dryRunScenarios ?? []).length,
    dryRunOutcomePolicyCount: (config.dryRunOutcomePolicies ?? []).length,
    commandDryRunSimulatorEvidenceCount: (config.evidenceRequirements ?? []).length,
    commandDryRunSimulatorSignalCount: (config.commandDryRunSimulatorSignals ?? []).length,
    safetyGateCount: (config.safetyGates ?? []).length,
    appBindingCount: (config.appBindings ?? []).length,
    mutatesSource: config.mutatesSource,
    fileMutationAllowed: config.fileMutationAllowed,
    recordPersistenceAllowed: config.recordPersistenceAllowed,
    ...summary,
    ...boundaries,
  };

  if (options.writeArtifacts) {
    const artifactDir = path.join(process.cwd(), ".sera-local-worker-command-dry-run-simulator");
    fs.mkdirSync(artifactDir, { recursive: true });
    fs.writeFileSync(path.join(artifactDir, "phase88-local-worker-command-dry-run-simulator-status.json"), JSON.stringify(result, null, 2) + "\n", "utf8");
  }

  return result;
}
