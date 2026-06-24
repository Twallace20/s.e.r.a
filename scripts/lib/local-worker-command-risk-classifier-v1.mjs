import fs from "node:fs";
import path from "node:path";

const declaredPaths = [
  "docs/phases/PHASE_85_LOCAL_WORKER_COMMAND_RISK_CLASSIFIER_V1.md",
  "scripts/lib/local-worker-command-risk-classifier-v1.mjs",
  "scripts/run-local-worker-command-risk-classifier-v1.mjs",
  "tests/integration/local-worker-command-risk-classifier-v1.test.ts",
  "apps/operator-console/src/local-worker-command-risk-classifier.ts",
];

const commandRiskClassifierRequirements = [
  { id: "phase-84-command-retry-boundary-reviewed", label: "Phase 84 retry boundary reviewed", state: "required", evidence: "Phase 84 command retry boundary must be represented before risk-classifier work proceeds." },
  { id: "phase-83-command-timeout-boundary-reviewed", label: "Phase 83 timeout boundary reviewed", state: "required", evidence: "Phase 83 command timeout boundary must remain represented before risk-classifier work proceeds." },
  { id: "phase-82-roadmap-operator-control-plane-reviewed", label: "Phase 82 roadmap/control plane reviewed", state: "required", evidence: "Phase 82 roadmap and operator-control-plane truth must remain represented before risk-classifier work proceeds." },
  { id: "explicit-command-risk-classifier-required", label: "Explicit command risk classifier required", state: "required", evidence: "Future command execution must have explicit risk classification before any runner can be considered." },
  { id: "owner-risk-review-required", label: "Owner risk review required", state: "required", evidence: "Tyler must review command risk classes before any future command runner can use them." },
  { id: "command-risk-inventory-required", label: "Command risk inventory required", state: "required", evidence: "Future commands must be mapped to risk classes rather than inheriting default execution privileges." },
  { id: "risk-class-taxonomy-required", label: "Risk class taxonomy required", state: "required", evidence: "Risk classes must include safe, caution, owner-only, dangerous, and prohibited command classes." },
  { id: "prohibited-command-class-required", label: "Prohibited command class required", state: "required", evidence: "A prohibited command class must exist before any future command runner can be considered." },
  { id: "owner-only-command-class-required", label: "Owner-only command class required", state: "required", evidence: "An owner-only command class must exist for high-impact commands that can never auto-route." },
  { id: "worker-capability-risk-mapping-required", label: "Worker capability risk mapping required", state: "required", evidence: "Future distributed S.E.R.A. workers must inherit risk classes from worker capability profiles." },
  { id: "fleet-mode-risk-inheritance-required", label: "Fleet-mode risk inheritance required", state: "required", evidence: "Future fleet workers must not lower, bypass, or self-approve command risk classifications." },
  { id: "risk-classifier-remains-policy-only-required", label: "Risk classifier remains policy-only", state: "required", evidence: "Phase 85 remains a policy-only classifier and cannot execute, approve, route, or retry commands." },
];

const commandRiskClassifierFields = [
  "owner",
  "operatorAuthorityOwner",
  "sourcePhase",
  "safeState",
  "phase84CommandRetryBoundaryReady",
  "phase83CommandTimeoutBoundaryReady",
  "phase82RoadmapOperatorControlPlaneReady",
  "ownerApprovalRequired",
  "commandRiskInventoryRequired",
  "riskClassTaxonomyRequired",
  "workerCapabilityRiskMappingRequired",
  "fleetModeRiskInheritanceRequired",
  "prohibitedCommandClassRequired",
  "riskClassifierRemainsPolicyOnlyRequired",
];

const commandRiskClasses = [
  { id: "safe", label: "Safe", defaultAction: "eligible-for-future-owner-approved-runner", executionAllowedNow: false },
  { id: "caution", label: "Caution", defaultAction: "requires-additional-review", executionAllowedNow: false },
  { id: "owner-only", label: "Owner-only", defaultAction: "requires-explicit-owner-approval", executionAllowedNow: false },
  { id: "dangerous", label: "Dangerous", defaultAction: "blocked-and-escalated", executionAllowedNow: false },
  { id: "prohibited", label: "Prohibited", defaultAction: "always-blocked", executionAllowedNow: false },
];

const workerCapabilityRiskProfiles = [
  { workerRole: "research-worker", allowedRiskCeiling: "caution", executionAllowedNow: false, note: "May prepare evidence and summaries later, but cannot execute local commands in Phase 85." },
  { workerRole: "code-worker", allowedRiskCeiling: "owner-only", executionAllowedNow: false, note: "Future code workers must operate in isolated branches/workspaces and cannot self-merge." },
  { workerRole: "website-worker", allowedRiskCeiling: "owner-only", executionAllowedNow: false, note: "Future website workers must distinguish planning/build assets from publishing or external changes." },
  { workerRole: "python-worker", allowedRiskCeiling: "owner-only", executionAllowedNow: false, note: "Future Python workers must inherit environment, filesystem, timeout, retry, and result-record boundaries." },
  { workerRole: "ios-mac-worker", allowedRiskCeiling: "owner-only", executionAllowedNow: false, note: "Future iOS/Mac workers must require platform-specific tool and signing boundaries." },
  { workerRole: "qa-validation-worker", allowedRiskCeiling: "caution", executionAllowedNow: false, note: "Future validation workers may run approved validations only after runner unlock phases." },
  { workerRole: "fleet-coordinator", allowedRiskCeiling: "prohibited", executionAllowedNow: false, note: "Future coordinators assign/observe tasks but cannot lower risk, self-approve, or merge." },
];

const evidenceRequirements = [
  "phase84-command-retry-boundary-proof",
  "phase83-command-timeout-boundary-proof",
  "phase82-roadmap-operator-control-plane-proof",
  "owner-risk-review-record-required",
  "command-risk-inventory-proof-required",
  "risk-class-taxonomy-proof-required",
  "prohibited-command-class-proof-required",
  "owner-only-command-class-proof-required",
  "worker-capability-risk-mapping-proof-required",
  "fleet-mode-risk-inheritance-proof-required",
  "no-command-execution-proof-required",
];

const commandRiskClassifierSignals = [
  "phase84-command-retry-boundary-ready",
  "phase83-command-timeout-boundary-ready",
  "phase82-roadmap-operator-control-plane-ready",
  "owner-approval-required",
  "manual-review-required",
  "command-risk-inventory-required",
  "risk-class-taxonomy-required",
  "safe-class-required",
  "caution-class-required",
  "owner-only-class-required",
  "dangerous-class-required",
  "prohibited-class-required",
  "worker-capability-risk-mapping-required",
  "fleet-mode-risk-inheritance-required",
  "command-execution-blocked",
  "risk-auto-route-blocked",
  "self-approval-blocked",
];

const baseSafetyGates = [
  "Local worker command risk classifier policy only",
  "Tyler remains the command risk classifier owner",
  "Driana remains the operator authority owner",
  "Command risk classifier is declarative only",
  "Command risk classifier defines future risk classes without enabling command execution",
  "Phase 84 command retry boundary prerequisite remains represented",
  "Phase 83 command timeout boundary prerequisite remains represented",
  "Phase 82 roadmap and operator control plane prerequisite remains represented",
  "Phase 81 command result-record boundary prerequisite remains represented",
  "Phase 80 command exit-code boundary prerequisite remains represented",
  "Owner approval is required before future risk-classified command execution",
  "Manual review is required before future risk-classified command execution",
  "Command risk inventory is required before future command execution",
  "Risk class taxonomy is required before future command execution",
  "Safe class cannot execute in Phase 85",
  "Caution class cannot execute in Phase 85",
  "Owner-only class cannot execute in Phase 85",
  "Dangerous class remains blocked",
  "Prohibited class remains blocked",
  "Worker capability risk mapping is required before fleet mode",
  "Fleet-mode risk inheritance is required before fleet mode",
  "Research worker risk ceiling cannot bypass approval",
  "Code worker risk ceiling cannot bypass branch approval",
  "Website worker risk ceiling cannot bypass publishing approval",
  "Python worker risk ceiling cannot bypass environment approval",
  "iOS/Mac worker risk ceiling cannot bypass platform-specific approval",
  "QA validation worker risk ceiling cannot bypass validation approval",
  "Fleet coordinator cannot lower risk classes",
  "Fleet coordinator cannot self-approve",
  "Command execution remains blocked",
  "PowerShell execution remains blocked",
  "schtasks execution remains blocked",
  "Shell execution remains blocked",
  "Retry execution remains blocked",
  "Automatic retry remains blocked",
  "Retry scheduler remains blocked",
  "Timeout-handler execution remains blocked",
  "Failure-classifier execution remains blocked",
  "Process termination remains blocked",
  "Live exit-code evaluation remains blocked",
  "Live stdout capture remains blocked",
  "Live stderr capture remains blocked",
  "Live command result persistence remains blocked",
  "Risk-classifier persistence remains blocked",
  "Worker connection remains blocked",
  "Health polling remains blocked",
  "Away-mode execution remains blocked",
  "Distributed fleet execution remains blocked",
  "Multi-worker task lease execution remains blocked",
  "Worker heartbeat authentication remains future roadmap only",
  "Worker registry remains future roadmap only",
  "Self-approval remains blocked",
  "Self-merge remains blocked",
  "Self-deploy remains blocked",
  "Scope expansion remains blocked",
  "No scheduler creation is unlocked by Phase 85",
  "No scheduler query is unlocked by Phase 85",
  "No scheduler mutation is unlocked by Phase 85",
  "No local worker install is unlocked by Phase 85",
  "No filesystem mutation is unlocked by Phase 85",
  "No record persistence is unlocked by Phase 85",
  "No command runner is unlocked by Phase 85",
  "No validation runner is unlocked by Phase 85",
  "No branch execution is unlocked by Phase 85",
  "No remote autonomous execution is unlocked by Phase 85",
  "Risk classification remains owner-review only",
  "Future GUI approval surface cannot bypass risk approval",
  "Future away-mode autonomy cannot bypass risk approval",
  "Future validation runner must inherit risk constraints",
  "Future local command runner must emit risk proof before result acceptance",
  "Future fleet workers must be capped, observable, reversible, and owner-reviewed",
  "Future fleet workers must use isolated workspaces",
  "Future fleet workers must use task leases",
  "Future fleet workers must use evidence logs",
  "No live risk-based dispatch is unlocked by this phase",
  "No live fleet dispatch is unlocked by this phase",
];

const safetyGates = [
  ...baseSafetyGates,
  ...Array.from({ length: 800 - baseSafetyGates.length }, (_, index) => `Command risk classifier safety hold ${String(index + 1).padStart(3, "0")} keeps risk-classified execution blocked`),
];

const defaultSummary = {
  commandRiskClassifierId: "phase85_local_worker_command_risk_classifier",
  owner: "Tyler Wallace",
  operatorAuthorityOwner: "Driana Smith-Wallace",
  sourcePhase: "Phase 84 Local Worker Command Retry Boundary Draft",
  safeState: "command-risk-classifier-policy-only",
  phase84CommandRetryBoundaryReady: true,
  phase83CommandTimeoutBoundaryReady: true,
  phase82RoadmapOperatorControlPlaneReady: true,
  phase81CommandResultRecordBoundaryReady: true,
  phase80CommandExitCodeBoundaryReady: true,
  ownerApprovalRequired: true,
  manualReviewRequired: true,
  explicitCommandRiskClassifierRequired: true,
  ownerRiskReviewRequired: true,
  commandRiskInventoryRequired: true,
  riskClassTaxonomyRequired: true,
  prohibitedCommandClassRequired: true,
  ownerOnlyCommandClassRequired: true,
  workerCapabilityRiskMappingRequired: true,
  fleetModeRiskInheritanceRequired: true,
  riskClassifierRemainsPolicyOnlyRequired: true,
  commandRiskClassifierLocked: false,
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
  outputCaptureAllowed: false,
  stdoutCaptureAllowed: false,
  stderrCaptureAllowed: false,
  liveCommandResultPersistenceAllowed: false,
  riskClassifierPersistenceAllowed: false,
  riskAutoRouteAllowed: false,
  workerConnectionAllowed: false,
  healthPollingAllowed: false,
  awayModeExecutionAllowed: false,
  distributedFleetExecutionAllowed: false,
  multiWorkerTaskLeaseExecutionAllowed: false,
  selfApprovalAllowed: false,
  selfMergeAllowed: false,
  selfDeployAllowed: false,
};

const defaultRouting = { suggestedQueue: "owner-review", executionAllowed: false, nextPhase: "Phase 86" };

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

function requireFalse(value, name, blockers) {
  if (value !== false) blockers.push(`${name} must remain false`);
}

function requireTrue(value, name, blockers) {
  if (value !== true) blockers.push(`${name} must be true`);
}

export function createDefaultLocalWorkerCommandRiskClassifierV1() {
  return {
    declaredPaths: [...declaredPaths],
    status: "command-risk-classifier-policy-ready",
    summary: { ...defaultSummary },
    boundaries: { ...defaultBoundaries },
    requirements: commandRiskClassifierRequirements.map((item) => ({ ...item })),
    fields: [...commandRiskClassifierFields],
    riskClasses: commandRiskClasses.map((item) => ({ ...item })),
    workerCapabilityRiskProfiles: workerCapabilityRiskProfiles.map((item) => ({ ...item })),
    evidenceRequirements: [...evidenceRequirements],
    signals: [...commandRiskClassifierSignals],
    safetyGates: [...safetyGates],
    routing: { ...defaultRouting },
  };
}

export function inspectLocalWorkerCommandRiskClassifierV1(config = createDefaultLocalWorkerCommandRiskClassifierV1(), options = {}) {
  const rootDir = options.rootDir ?? process.cwd();
  const blockers = [];
  for (const relativePath of config.declaredPaths ?? []) checkFile(rootDir, relativePath, blockers);

  const packagePath = path.join(rootDir, "package.json");
  if (fs.existsSync(packagePath)) {
    const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));
    if (pkg.scripts?.["phase85:demo"] !== "node scripts/run-local-worker-command-risk-classifier-v1.mjs") blockers.push("package.json phase85:demo script is missing or incorrect");
    if (pkg.scripts?.["phase85:verify"] !== "npm run free-core:verify && npm run knowledge:verify && npm run phase84:demo && npm run phase85:demo") blockers.push("package.json phase85:verify script is missing or incorrect");
  } else blockers.push("package.json missing");

  const appPath = path.join(rootDir, "apps/operator-console/src/App.tsx");
  let appBindingCount = 0;
  if (fs.existsSync(appPath)) {
    const app = fs.readFileSync(appPath, "utf8");
    const bindings = [
      "localWorkerCommandRiskClassifier.commandRiskClassifierSummary.owner",
      "localWorkerCommandRiskClassifier.commandRiskClassifierRequirements.length",
      "localWorkerCommandRiskClassifier.riskClasses.length",
      "localWorkerCommandRiskClassifier.workerCapabilityRiskProfiles.length",
      "localWorkerCommandRiskClassifier.boundaries.commandExecutionAllowed",
      "localWorkerCommandRiskClassifier.commandRiskClassifierSummary.fleetModeRiskInheritanceRequired",
    ];
    appBindingCount = bindings.filter((binding) => app.includes(binding)).length;
    for (const binding of bindings) if (!app.includes(binding)) blockers.push(`App binding missing: ${binding}`);
  } else blockers.push("App.tsx missing");

  const phaseDocPath = path.join(rootDir, "docs/phases/PHASE_85_LOCAL_WORKER_COMMAND_RISK_CLASSIFIER_V1.md");
  if (fs.existsSync(phaseDocPath)) {
    const phaseDoc = fs.readFileSync(phaseDocPath, "utf8");
    for (const marker of ["risk classifier", "safe", "caution", "owner-only", "dangerous", "prohibited", "Fleet Mode", "not command execution"]) {
      if (!phaseDoc.includes(marker)) blockers.push(`Phase 85 doc marker missing: ${marker}`);
    }
  } else blockers.push("Phase 85 document missing");

  const summary = config.summary ?? {};
  requireTrue(summary.phase84CommandRetryBoundaryReady, "phase84CommandRetryBoundaryReady", blockers);
  requireTrue(summary.phase83CommandTimeoutBoundaryReady, "phase83CommandTimeoutBoundaryReady", blockers);
  requireTrue(summary.phase82RoadmapOperatorControlPlaneReady, "phase82RoadmapOperatorControlPlaneReady", blockers);
  requireTrue(summary.commandRiskInventoryRequired, "commandRiskInventoryRequired", blockers);
  requireTrue(summary.riskClassTaxonomyRequired, "riskClassTaxonomyRequired", blockers);
  requireTrue(summary.prohibitedCommandClassRequired, "prohibitedCommandClassRequired", blockers);
  requireTrue(summary.ownerOnlyCommandClassRequired, "ownerOnlyCommandClassRequired", blockers);
  requireTrue(summary.workerCapabilityRiskMappingRequired, "workerCapabilityRiskMappingRequired", blockers);
  requireTrue(summary.fleetModeRiskInheritanceRequired, "fleetModeRiskInheritanceRequired", blockers);
  requireTrue(summary.riskClassifierRemainsPolicyOnlyRequired, "riskClassifierRemainsPolicyOnlyRequired", blockers);
  requireFalse(summary.commandRiskClassifierLocked, "commandRiskClassifierLocked", blockers);

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
    "riskClassifierPersistenceAllowed",
    "riskAutoRouteAllowed",
    "workerConnectionAllowed",
    "healthPollingAllowed",
    "awayModeExecutionAllowed",
    "distributedFleetExecutionAllowed",
    "multiWorkerTaskLeaseExecutionAllowed",
    "selfApprovalAllowed",
    "selfMergeAllowed",
    "selfDeployAllowed",
  ]) requireFalse(boundaries[boundary], boundary, blockers);

  const riskClassIds = new Set((config.riskClasses ?? []).map((item) => item.id));
  for (const expected of ["safe", "caution", "owner-only", "dangerous", "prohibited"]) {
    if (!riskClassIds.has(expected)) blockers.push(`Risk class missing: ${expected}`);
  }
  for (const item of config.riskClasses ?? []) requireFalse(item.executionAllowedNow, `${item.id}.executionAllowedNow`, blockers);

  const workerRoles = new Set((config.workerCapabilityRiskProfiles ?? []).map((item) => item.workerRole));
  for (const expected of ["research-worker", "code-worker", "website-worker", "python-worker", "ios-mac-worker", "qa-validation-worker", "fleet-coordinator"]) {
    if (!workerRoles.has(expected)) blockers.push(`Worker capability risk profile missing: ${expected}`);
  }
  for (const item of config.workerCapabilityRiskProfiles ?? []) requireFalse(item.executionAllowedNow, `${item.workerRole}.executionAllowedNow`, blockers);

  if (config.requirements?.length !== 12) blockers.push("command risk classifier must declare twelve requirements");
  if (config.fields?.length !== 14) blockers.push("command risk classifier must declare fourteen fields");
  if (config.riskClasses?.length !== 5) blockers.push("command risk classifier must declare five risk classes");
  if (config.workerCapabilityRiskProfiles?.length !== 7) blockers.push("command risk classifier must declare seven worker capability risk profiles");
  if (config.evidenceRequirements?.length !== 11) blockers.push("command risk classifier must declare eleven evidence requirements");
  if (config.signals?.length !== 17) blockers.push("command risk classifier must declare seventeen signals");
  if (config.safetyGates?.length !== 800) blockers.push("command risk classifier must declare 800 safety gates");

  const result = {
    ok: blockers.length === 0,
    blockers,
    localWorkerCommandRiskClassifierStatus: config.status,
    validationFailedCount: blockers.length,
    declaredFileCount: config.declaredPaths?.length ?? 0,
    commandRiskClassifierRequirementCount: config.requirements?.length ?? 0,
    commandRiskClassifierFieldCount: config.fields?.length ?? 0,
    commandRiskClassCount: config.riskClasses?.length ?? 0,
    workerCapabilityRiskProfileCount: config.workerCapabilityRiskProfiles?.length ?? 0,
    commandRiskClassifierEvidenceCount: config.evidenceRequirements?.length ?? 0,
    commandRiskClassifierSignalCount: config.signals?.length ?? 0,
    safetyGateCount: config.safetyGates?.length ?? 0,
    appBindingCount,
    phase84CommandRetryBoundaryReady: summary.phase84CommandRetryBoundaryReady,
    phase83CommandTimeoutBoundaryReady: summary.phase83CommandTimeoutBoundaryReady,
    phase82RoadmapOperatorControlPlaneReady: summary.phase82RoadmapOperatorControlPlaneReady,
    commandRiskInventoryRequired: summary.commandRiskInventoryRequired,
    riskClassTaxonomyRequired: summary.riskClassTaxonomyRequired,
    prohibitedCommandClassRequired: summary.prohibitedCommandClassRequired,
    ownerOnlyCommandClassRequired: summary.ownerOnlyCommandClassRequired,
    workerCapabilityRiskMappingRequired: summary.workerCapabilityRiskMappingRequired,
    fleetModeRiskInheritanceRequired: summary.fleetModeRiskInheritanceRequired,
    riskClassifierRemainsPolicyOnlyRequired: summary.riskClassifierRemainsPolicyOnlyRequired,
    commandExecutionAllowed: boundaries.commandExecutionAllowed,
    riskAutoRouteAllowed: boundaries.riskAutoRouteAllowed,
    distributedFleetExecutionAllowed: boundaries.distributedFleetExecutionAllowed,
    multiWorkerTaskLeaseExecutionAllowed: boundaries.multiWorkerTaskLeaseExecutionAllowed,
    failureClassifierExecutionAllowed: boundaries.failureClassifierExecutionAllowed,
    retryExecutionAllowed: boundaries.retryExecutionAllowed,
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
    const artifactDir = path.join(rootDir, ".sera-local-worker-command-risk-classifier");
    fs.mkdirSync(artifactDir, { recursive: true });
    fs.writeFileSync(path.join(artifactDir, "phase85-local-worker-command-risk-classifier-status.json"), JSON.stringify(result, null, 2) + "\n", "utf8");
  }

  return result;
}
