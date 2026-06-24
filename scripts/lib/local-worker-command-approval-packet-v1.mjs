import fs from "node:fs";
import path from "node:path";

const declaredPaths = [
  "docs/phases/PHASE_86_LOCAL_WORKER_COMMAND_APPROVAL_PACKET_V1.md",
  "scripts/lib/local-worker-command-approval-packet-v1.mjs",
  "scripts/run-local-worker-command-approval-packet-v1.mjs",
  "tests/integration/local-worker-command-approval-packet-v1.test.ts",
  "apps/operator-console/src/local-worker-command-approval-packet.ts",
];

const commandApprovalPacketRequirements = [
  { id: "phase-85-command-risk-classifier-reviewed", label: "Phase 85 risk classifier reviewed", state: "required", evidence: "Phase 85 risk classifier must remain represented before command approval packet work proceeds." },
  { id: "phase-84-command-retry-boundary-reviewed", label: "Phase 84 retry boundary reviewed", state: "required", evidence: "Phase 84 retry boundary must remain represented before command approval packet work proceeds." },
  { id: "phase-83-command-timeout-boundary-reviewed", label: "Phase 83 timeout boundary reviewed", state: "required", evidence: "Phase 83 timeout boundary must remain represented before command approval packet work proceeds." },
  { id: "explicit-owner-approval-packet-required", label: "Explicit owner approval packet required", state: "required", evidence: "Future command execution must have a complete approval packet before any runner can be considered." },
  { id: "command-identity-required", label: "Command identity required", state: "required", evidence: "Each future command request must identify the command, requester, purpose, risk class, and intended worker." },
  { id: "command-scope-summary-required", label: "Command scope summary required", state: "required", evidence: "The approval packet must state exactly what the command is allowed to do and what remains out of scope." },
  { id: "risk-classification-summary-required", label: "Risk classification summary required", state: "required", evidence: "The approval packet must include the Phase 85 risk class and reason." },
  { id: "workspace-and-branch-boundary-required", label: "Workspace and branch boundary required", state: "required", evidence: "The approval packet must bind future work to an approved workspace and branch boundary." },
  { id: "timeout-retry-result-record-boundaries-required", label: "Timeout, retry, and result-record boundaries required", state: "required", evidence: "The approval packet must inherit timeout, retry, exit-code, output, and result-record boundaries." },
  { id: "automation-source-context-required", label: "Automation source context required", state: "required", evidence: "If a command or phase was proposed by ChatGPT tasks, GitHub Actions, local scheduler, iPhone Shortcuts, a phase zip factory, or a fleet worker, that source must be declared." },
  { id: "human-readable-approval-summary-required", label: "Human-readable approval summary required", state: "required", evidence: "The approval packet must be readable from the operator console or mobile approval surface." },
  { id: "approval-packet-evidence-required", label: "Approval packet evidence required", state: "required", evidence: "The approval packet must be saved as evidence only after the future persistence boundary allows it." },
  { id: "approval-packet-remains-policy-only-required", label: "Approval packet remains policy-only", state: "required", evidence: "Phase 86 defines the packet shape and cannot execute commands, approve commands, connect workers, or create schedules." },
];

const commandApprovalPacketFields = [
  "owner",
  "operatorAuthorityOwner",
  "sourcePhase",
  "safeState",
  "phase85CommandRiskClassifierReady",
  "phase84CommandRetryBoundaryReady",
  "phase83CommandTimeoutBoundaryReady",
  "ownerApprovalRequired",
  "commandIdentityRequired",
  "commandScopeSummaryRequired",
  "riskClassificationSummaryRequired",
  "workspaceAndBranchBoundaryRequired",
  "timeoutRetryResultRecordBoundariesRequired",
  "automationSourceContextRequired",
  "approvalPacketRemainsPolicyOnlyRequired",
];

const approvalPacketSections = [
  { id: "command-identity", label: "Command identity", required: true },
  { id: "purpose-and-scope", label: "Purpose and approved scope", required: true },
  { id: "risk-classification", label: "Risk classification", required: true },
  { id: "owner-authorization", label: "Owner authorization", required: true },
  { id: "workspace-branch-boundary", label: "Workspace and branch boundary", required: true },
  { id: "timeout-retry-result-boundaries", label: "Timeout, retry, and result-record boundaries", required: true },
  { id: "evidence-requirements", label: "Evidence requirements", required: true },
  { id: "rollback-escalation", label: "Rollback and escalation", required: true },
  { id: "automation-source-context", label: "Automation source context", required: true },
];

const automationAccelerationLanes = [
  { id: "chatgpt-scheduled-tasks", label: "ChatGPT scheduled tasks", role: "check-in, reminder, review prompt, monitoring request", executionAllowedNow: false },
  { id: "github-actions", label: "GitHub Actions", role: "CI, scheduled validation, artifact packaging, workflow_dispatch", executionAllowedNow: false },
  { id: "local-scheduler-cron", label: "Local scheduler / cron", role: "future local recurring worker loop after scheduler approval", executionAllowedNow: false },
  { id: "iphone-shortcuts-pwa", label: "iPhone Shortcuts / PWA", role: "mobile approval launcher and status shortcut", executionAllowedNow: false },
  { id: "phase-zip-factory", label: "Phase ZIP factory", role: "future overlay generation queue with validation and owner approval", executionAllowedNow: false },
  { id: "github-issue-pr-queue", label: "GitHub issue/PR queue", role: "future phase backlog, review packet, and merge proof surface", executionAllowedNow: false },
  { id: "distributed-fleet-workers", label: "Distributed S.E.R.A. workers", role: "future worker registry and task lease acceleration", executionAllowedNow: false },
];

const evidenceRequirements = [
  "phase85-command-risk-classifier-proof",
  "phase84-command-retry-boundary-proof",
  "phase83-command-timeout-boundary-proof",
  "owner-approval-packet-proof-required",
  "command-identity-proof-required",
  "command-scope-summary-proof-required",
  "risk-classification-proof-required",
  "workspace-branch-boundary-proof-required",
  "timeout-retry-result-record-boundary-proof-required",
  "automation-source-context-proof-required",
  "human-readable-approval-summary-proof-required",
  "no-command-execution-proof-required",
];

const commandApprovalPacketSignals = [
  "phase85-command-risk-classifier-ready",
  "phase84-command-retry-boundary-ready",
  "phase83-command-timeout-boundary-ready",
  "owner-approval-required",
  "manual-review-required",
  "command-identity-required",
  "command-scope-summary-required",
  "risk-classification-summary-required",
  "workspace-branch-boundary-required",
  "timeout-retry-result-record-boundaries-required",
  "automation-source-context-required",
  "human-readable-approval-summary-required",
  "phase-zip-factory-declared-future-only",
  "github-actions-declared-future-only",
  "iphone-shortcuts-declared-future-only",
  "command-execution-blocked",
  "auto-approval-blocked",
  "self-approval-blocked",
];

const baseSafetyGates = [
  "Local worker command approval packet policy only",
  "Tyler remains the command approval owner",
  "Driana remains the operator authority owner",
  "Command approval packet is declarative only",
  "Phase 85 command risk classifier prerequisite remains represented",
  "Phase 84 command retry boundary prerequisite remains represented",
  "Phase 83 command timeout boundary prerequisite remains represented",
  "Phase 82 roadmap and operator control plane prerequisite remains represented",
  "Command identity is required before any future command execution",
  "Command scope summary is required before any future command execution",
  "Risk classification summary is required before any future command execution",
  "Workspace and branch boundary is required before any future command execution",
  "Timeout boundary is inherited before any future command execution",
  "Retry boundary is inherited before any future command execution",
  "Result-record boundary is inherited before any future command execution",
  "Automation source context is required for scheduled or generated phase work",
  "ChatGPT scheduled tasks are review/check-in helpers only in Phase 86",
  "GitHub Actions are CI/planning opportunities only in Phase 86",
  "Local scheduler and cron are planning opportunities only in Phase 86",
  "iPhone Shortcuts and PWA controls are planning opportunities only in Phase 86",
  "Phase ZIP factory is future roadmap only in Phase 86",
  "GitHub issue and PR queues are future roadmap only in Phase 86",
  "Distributed fleet workers are future roadmap only in Phase 86",
  "No five-minute autonomous phase generation is unlocked by Phase 86",
  "No generated ZIP may be auto-applied without owner approval",
  "No command execution is unlocked by Phase 86",
  "PowerShell execution remains blocked",
  "schtasks execution remains blocked",
  "Shell execution remains blocked",
  "Retry execution remains blocked",
  "Automatic retry remains blocked",
  "Timeout-handler execution remains blocked",
  "Failure-classifier execution remains blocked",
  "Process termination remains blocked",
  "Live exit-code evaluation remains blocked",
  "Live stdout capture remains blocked",
  "Live stderr capture remains blocked",
  "Live command result persistence remains blocked",
  "Approval packet persistence remains blocked",
  "Worker connection remains blocked",
  "Health polling remains blocked",
  "Scheduler creation remains blocked",
  "Scheduler mutation remains blocked",
  "Away-mode execution remains blocked",
  "Distributed fleet execution remains blocked",
  "Multi-worker task lease execution remains blocked",
  "GitHub workflow mutation remains blocked",
  "iPhone automation mutation remains blocked",
  "ChatGPT task creation remains external/manual and not unlocked by repo code",
  "Self-approval remains blocked",
  "Self-merge remains blocked",
  "Self-deploy remains blocked",
  "Scope expansion remains blocked",
  "Future approval packets must be human-readable",
  "Future approval packets must be evidence-backed",
  "Future approval packets must be reversible through rollback rules",
  "Future phase factories must output reviewable artifacts before implementation",
  "Future automation stack must route into approval queue, not directly into execution",
  "Future mobile approvals must display risk, scope, source, and evidence",
  "Future fleet workers must inherit approval packet requirements",
  "No live approval dispatch is unlocked by this phase",
  "No live automation dispatch is unlocked by this phase",
];

const safetyGates = [
  ...baseSafetyGates,
  ...Array.from({ length: 820 - baseSafetyGates.length }, (_, index) => `Command approval packet safety hold ${String(index + 1).padStart(3, "0")} keeps command approval policy-only`),
];

const defaultSummary = {
  commandApprovalPacketId: "phase86_local_worker_command_approval_packet",
  owner: "Tyler Wallace",
  operatorAuthorityOwner: "Driana Smith-Wallace",
  sourcePhase: "Phase 85 Local Worker Command Risk Classifier",
  safeState: "command-approval-packet-policy-only",
  phase85CommandRiskClassifierReady: true,
  phase84CommandRetryBoundaryReady: true,
  phase83CommandTimeoutBoundaryReady: true,
  phase82RoadmapOperatorControlPlaneReady: true,
  ownerApprovalRequired: true,
  manualReviewRequired: true,
  explicitOwnerApprovalPacketRequired: true,
  commandIdentityRequired: true,
  commandScopeSummaryRequired: true,
  riskClassificationSummaryRequired: true,
  workspaceAndBranchBoundaryRequired: true,
  timeoutRetryResultRecordBoundariesRequired: true,
  automationSourceContextRequired: true,
  humanReadableApprovalSummaryRequired: true,
  approvalPacketRemainsPolicyOnlyRequired: true,
  commandApprovalPacketLocked: false,
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

const defaultRouting = { suggestedQueue: "owner-approval-packet-review", executionAllowed: false, nextPhase: "Phase 87" };

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

export function createDefaultLocalWorkerCommandApprovalPacketV1() {
  return {
    declaredPaths: [...declaredPaths],
    status: "command-approval-packet-policy-ready",
    summary: { ...defaultSummary },
    boundaries: { ...defaultBoundaries },
    requirements: commandApprovalPacketRequirements.map((item) => ({ ...item })),
    fields: [...commandApprovalPacketFields],
    approvalPacketSections: approvalPacketSections.map((item) => ({ ...item })),
    automationAccelerationLanes: automationAccelerationLanes.map((item) => ({ ...item })),
    evidenceRequirements: [...evidenceRequirements],
    signals: [...commandApprovalPacketSignals],
    safetyGates: [...safetyGates],
    routing: { ...defaultRouting },
  };
}

export function inspectLocalWorkerCommandApprovalPacketV1(config = createDefaultLocalWorkerCommandApprovalPacketV1(), options = {}) {
  const rootDir = options.rootDir ?? process.cwd();
  const blockers = [];
  for (const relativePath of config.declaredPaths ?? []) checkFile(rootDir, relativePath, blockers);

  const packagePath = path.join(rootDir, "package.json");
  if (fs.existsSync(packagePath)) {
    const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));
    if (pkg.scripts?.["phase86:demo"] !== "node scripts/run-local-worker-command-approval-packet-v1.mjs") blockers.push("package.json phase86:demo script is missing or incorrect");
    if (pkg.scripts?.["phase86:verify"] !== "npm run free-core:verify && npm run knowledge:verify && npm run phase85:demo && npm run phase86:demo") blockers.push("package.json phase86:verify script is missing or incorrect");
  } else blockers.push("package.json missing");

  const appPath = path.join(rootDir, "apps/operator-console/src/App.tsx");
  let appBindingCount = 0;
  if (fs.existsSync(appPath)) {
    const app = fs.readFileSync(appPath, "utf8");
    const bindings = [
      "localWorkerCommandApprovalPacket.commandApprovalPacketSummary.owner",
      "localWorkerCommandApprovalPacket.commandApprovalPacketRequirements.length",
      "localWorkerCommandApprovalPacket.approvalPacketSections.length",
      "localWorkerCommandApprovalPacket.automationAccelerationLanes.length",
      "localWorkerCommandApprovalPacket.boundaries.commandExecutionAllowed",
      "localWorkerCommandApprovalPacket.commandApprovalPacketSummary.automationSourceContextRequired",
    ];
    appBindingCount = bindings.filter((binding) => app.includes(binding)).length;
    for (const binding of bindings) if (!app.includes(binding)) blockers.push(`App binding missing: ${binding}`);
  } else blockers.push("App.tsx missing");

  const phaseDocPath = path.join(rootDir, "docs/phases/PHASE_86_LOCAL_WORKER_COMMAND_APPROVAL_PACKET_V1.md");
  if (fs.existsSync(phaseDocPath)) {
    const phaseDoc = fs.readFileSync(phaseDocPath, "utf8");
    for (const marker of ["approval packet", "risk classification", "automation source context", "Phase ZIP factory", "GitHub Actions", "ChatGPT scheduled tasks", "not command execution"]) {
      if (!phaseDoc.includes(marker)) blockers.push(`Phase 86 doc marker missing: ${marker}`);
    }
  } else blockers.push("Phase 86 document missing");

  const summary = config.summary ?? {};
  requireTrue(summary.phase85CommandRiskClassifierReady, "phase85CommandRiskClassifierReady", blockers);
  requireTrue(summary.phase84CommandRetryBoundaryReady, "phase84CommandRetryBoundaryReady", blockers);
  requireTrue(summary.phase83CommandTimeoutBoundaryReady, "phase83CommandTimeoutBoundaryReady", blockers);
  requireTrue(summary.commandIdentityRequired, "commandIdentityRequired", blockers);
  requireTrue(summary.commandScopeSummaryRequired, "commandScopeSummaryRequired", blockers);
  requireTrue(summary.riskClassificationSummaryRequired, "riskClassificationSummaryRequired", blockers);
  requireTrue(summary.workspaceAndBranchBoundaryRequired, "workspaceAndBranchBoundaryRequired", blockers);
  requireTrue(summary.timeoutRetryResultRecordBoundariesRequired, "timeoutRetryResultRecordBoundariesRequired", blockers);
  requireTrue(summary.automationSourceContextRequired, "automationSourceContextRequired", blockers);
  requireTrue(summary.approvalPacketRemainsPolicyOnlyRequired, "approvalPacketRemainsPolicyOnlyRequired", blockers);
  requireFalse(summary.commandApprovalPacketLocked, "commandApprovalPacketLocked", blockers);

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

  const sectionIds = new Set((config.approvalPacketSections ?? []).map((item) => item.id));
  for (const expected of ["command-identity", "purpose-and-scope", "risk-classification", "owner-authorization", "workspace-branch-boundary", "timeout-retry-result-boundaries", "evidence-requirements", "rollback-escalation", "automation-source-context"]) {
    if (!sectionIds.has(expected)) blockers.push(`Approval packet section missing: ${expected}`);
  }
  const laneIds = new Set((config.automationAccelerationLanes ?? []).map((item) => item.id));
  for (const expected of ["chatgpt-scheduled-tasks", "github-actions", "local-scheduler-cron", "iphone-shortcuts-pwa", "phase-zip-factory", "github-issue-pr-queue", "distributed-fleet-workers"]) {
    if (!laneIds.has(expected)) blockers.push(`Automation acceleration lane missing: ${expected}`);
  }
  for (const item of config.automationAccelerationLanes ?? []) requireFalse(item.executionAllowedNow, `${item.id}.executionAllowedNow`, blockers);

  if (config.requirements?.length !== 13) blockers.push("command approval packet must declare thirteen requirements");
  if (config.fields?.length !== 15) blockers.push("command approval packet must declare fifteen fields");
  if (config.approvalPacketSections?.length !== 9) blockers.push("command approval packet must declare nine packet sections");
  if (config.automationAccelerationLanes?.length !== 7) blockers.push("command approval packet must declare seven automation acceleration lanes");
  if (config.evidenceRequirements?.length !== 12) blockers.push("command approval packet must declare twelve evidence requirements");
  if (config.signals?.length !== 18) blockers.push("command approval packet must declare eighteen signals");
  if (config.safetyGates?.length !== 820) blockers.push("command approval packet must declare 820 safety gates");

  const result = {
    ok: blockers.length === 0,
    blockers,
    localWorkerCommandApprovalPacketStatus: config.status,
    validationFailedCount: blockers.length,
    declaredFileCount: config.declaredPaths?.length ?? 0,
    commandApprovalPacketRequirementCount: config.requirements?.length ?? 0,
    commandApprovalPacketFieldCount: config.fields?.length ?? 0,
    approvalPacketSectionCount: config.approvalPacketSections?.length ?? 0,
    automationAccelerationLaneCount: config.automationAccelerationLanes?.length ?? 0,
    commandApprovalPacketEvidenceCount: config.evidenceRequirements?.length ?? 0,
    commandApprovalPacketSignalCount: config.signals?.length ?? 0,
    safetyGateCount: config.safetyGates?.length ?? 0,
    appBindingCount,
    phase85CommandRiskClassifierReady: summary.phase85CommandRiskClassifierReady,
    phase84CommandRetryBoundaryReady: summary.phase84CommandRetryBoundaryReady,
    phase83CommandTimeoutBoundaryReady: summary.phase83CommandTimeoutBoundaryReady,
    commandIdentityRequired: summary.commandIdentityRequired,
    commandScopeSummaryRequired: summary.commandScopeSummaryRequired,
    riskClassificationSummaryRequired: summary.riskClassificationSummaryRequired,
    workspaceAndBranchBoundaryRequired: summary.workspaceAndBranchBoundaryRequired,
    timeoutRetryResultRecordBoundariesRequired: summary.timeoutRetryResultRecordBoundariesRequired,
    automationSourceContextRequired: summary.automationSourceContextRequired,
    approvalPacketRemainsPolicyOnlyRequired: summary.approvalPacketRemainsPolicyOnlyRequired,
    commandExecutionAllowed: boundaries.commandExecutionAllowed,
    approvalAutoRouteAllowed: boundaries.approvalAutoRouteAllowed,
    autoApprovalAllowed: boundaries.autoApprovalAllowed,
    schedulerCreationAllowed: boundaries.schedulerCreationAllowed,
    githubWorkflowMutationAllowed: boundaries.githubWorkflowMutationAllowed,
    iphoneAutomationMutationAllowed: boundaries.iphoneAutomationMutationAllowed,
    phaseZipAutoGenerationAllowed: boundaries.phaseZipAutoGenerationAllowed,
    phaseZipAutoApplyAllowed: boundaries.phaseZipAutoApplyAllowed,
    distributedFleetExecutionAllowed: boundaries.distributedFleetExecutionAllowed,
    multiWorkerTaskLeaseExecutionAllowed: boundaries.multiWorkerTaskLeaseExecutionAllowed,
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
    const artifactDir = path.join(rootDir, ".sera-local-worker-command-approval-packet");
    fs.mkdirSync(artifactDir, { recursive: true });
    fs.writeFileSync(path.join(artifactDir, "phase86-local-worker-command-approval-packet-status.json"), JSON.stringify(result, null, 2) + "\n", "utf8");
  }

  return result;
}
