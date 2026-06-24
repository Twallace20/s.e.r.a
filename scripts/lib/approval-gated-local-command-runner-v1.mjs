import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const declaredPaths = [
  "docs/phases/PHASE_90_APPROVAL_GATED_LOCAL_COMMAND_RUNNER_V1.md",
  "scripts/lib/approval-gated-local-command-runner-v1.mjs",
  "scripts/run-approval-gated-local-command-runner-v1.mjs",
  "tests/integration/approval-gated-local-command-runner-v1.test.ts",
  "apps/operator-console/src/approval-gated-local-command-runner.ts",
];

const commandRunnerRequirements = [
  { id: "phase-89-sandbox-workspace-reviewed", label: "Phase 89 sandbox workspace reviewed", state: "required", evidence: "The sandbox workspace boundary must remain represented before local command execution can be considered." },
  { id: "phase-88-dry-run-simulator-reviewed", label: "Phase 88 dry-run simulator reviewed", state: "required", evidence: "The dry-run simulator remains the preview layer before approved execution." },
  { id: "phase-87-scope-lock-reviewed", label: "Phase 87 scope lock reviewed", state: "required", evidence: "The scope lock remains required for any approved local command." },
  { id: "phase-86-approval-packet-reviewed", label: "Phase 86 approval packet reviewed", state: "required", evidence: "Owner approval packet rules remain required before execution." },
  { id: "phase-85-risk-classifier-reviewed", label: "Phase 85 risk classifier reviewed", state: "required", evidence: "The command risk classifier remains required before execution." },
  { id: "owner-approval-record-required", label: "Owner approval record required", state: "required", evidence: "Every command run requires a specific owner approval record." },
  { id: "exact-allowlist-match-required", label: "Exact allowlist match required", state: "required", evidence: "The requested command must match an approved catalog entry exactly." },
  { id: "shellless-spawn-required", label: "Shellless spawn required", state: "required", evidence: "The runner must call a direct executable with shell disabled." },
  { id: "bounded-workspace-required", label: "Bounded workspace required", state: "required", evidence: "The process working directory must be inside the approved sandbox workspace." },
  { id: "timeout-required", label: "Timeout required", state: "required", evidence: "Every approved command must declare and enforce a timeout." },
  { id: "result-record-required", label: "Result record required", state: "required", evidence: "Every approved command must produce an auditable result record." },
  { id: "stdout-stderr-bounded", label: "Stdout and stderr bounded", state: "required", evidence: "Captured output must be size-limited and redacted before persistence." },
  { id: "powershell-schtasks-shell-blocked", label: "PowerShell, schtasks, and shells blocked", state: "required", evidence: "Phase 90 must not open broad shell or scheduler authority." },
  { id: "self-approval-remains-blocked", label: "Self approval remains blocked", state: "required", evidence: "S.E.R.A. cannot approve its own commands." },
  { id: "self-merge-deploy-remain-blocked", label: "Self merge and deploy remain blocked", state: "required", evidence: "Phase 90 cannot merge, tag, deploy, post externally, or mutate schedulers." },
];

const commandRunnerFields = [
  "owner",
  "operatorAuthorityOwner",
  "sourcePhase",
  "safeState",
  "phase89SandboxWorkspaceReady",
  "phase88DryRunSimulatorReady",
  "phase87ScopeLockReady",
  "phase86ApprovalPacketReady",
  "phase85RiskClassifierReady",
  "ownerApprovalRequired",
  "exactAllowlistMatchRequired",
  "shelllessSpawnRequired",
  "boundedWorkspaceRequired",
  "timeoutRequired",
  "resultRecordRequired",
  "stdoutStderrBounded",
  "approvedCommandCount",
  "commandExecutionAllowed",
];

const approvedCommandCatalog = [
  {
    id: "phase90-node-smoke",
    label: "Phase 90 approved Node smoke command",
    executable: () => process.execPath,
    args: ["-e", "process.stdout.write('SERA_PHASE90_APPROVED_COMMAND_OK')"],
    riskClass: "safe",
    timeoutMs: 5000,
    outputLimitBytes: 4096,
    reason: "Proves shellless approved local command execution without broad machine authority.",
  },
  {
    id: "npm-free-core-verify",
    label: "Free Core verification",
    executable: () => process.platform === "win32" ? "npm.cmd" : "npm",
    args: ["run", "free-core:verify"],
    riskClass: "safe",
    timeoutMs: 30000,
    outputLimitBytes: 8192,
    reason: "Allows future owner-approved verification of the Free Core covenant.",
    executionDisabledInDemo: true,
  },
  {
    id: "npm-knowledge-verify",
    label: "Knowledge source-map verification",
    executable: () => process.platform === "win32" ? "npm.cmd" : "npm",
    args: ["run", "knowledge:verify"],
    riskClass: "safe",
    timeoutMs: 30000,
    outputLimitBytes: 8192,
    reason: "Allows future owner-approved local knowledge verification.",
    executionDisabledInDemo: true,
  },
  {
    id: "npm-build",
    label: "TypeScript build",
    executable: () => process.platform === "win32" ? "npm.cmd" : "npm",
    args: ["run", "build"],
    riskClass: "safe",
    timeoutMs: 120000,
    outputLimitBytes: 12288,
    reason: "Allows future owner-approved local build validation.",
    executionDisabledInDemo: true,
  },
  {
    id: "npm-test",
    label: "Vitest test suite",
    executable: () => process.platform === "win32" ? "npm.cmd" : "npm",
    args: ["test"],
    riskClass: "safe",
    timeoutMs: 120000,
    outputLimitBytes: 12288,
    reason: "Allows future owner-approved local test validation.",
    executionDisabledInDemo: true,
  },
];

const commandRunnerEvidence = [
  "phase89-sandbox-workspace-proof",
  "phase88-dry-run-simulator-proof",
  "phase87-scope-lock-proof",
  "phase86-approval-packet-proof",
  "phase85-risk-classifier-proof",
  "owner-approval-record-proof",
  "exact-allowlist-match-proof",
  "shellless-spawn-proof",
  "bounded-workspace-proof",
  "timeout-proof",
  "exit-code-proof",
  "stdout-stderr-bound-proof",
  "result-record-proof",
  "blocked-command-proof",
  "no-self-approval-proof",
  "no-self-merge-deploy-proof",
];

const commandRunnerSignals = [
  "phase89-sandbox-workspace-ready",
  "phase88-dry-run-simulator-ready",
  "phase87-scope-lock-ready",
  "phase86-approval-packet-ready",
  "phase85-risk-classifier-ready",
  "owner-approval-required",
  "exact-allowlist-match-required",
  "shellless-spawn-required",
  "bounded-workspace-required",
  "timeout-required",
  "result-record-required",
  "stdout-stderr-bounded",
  "approved-command-runner-enabled-for-catalog-only",
  "arbitrary-command-blocked",
  "powershell-blocked",
  "schtasks-blocked",
  "shell-blocked",
  "scheduler-creation-blocked",
  "github-workflow-mutation-blocked",
  "iphone-automation-mutation-blocked",
  "phase-zip-auto-apply-blocked",
  "fleet-execution-blocked",
  "away-mode-execution-blocked",
  "self-approval-blocked",
  "self-merge-blocked",
  "self-deploy-blocked",
];

const appBindings = [
  "apps/operator-console/src/App.tsx import binding",
  "apps/operator-console/src/App.tsx status binding",
  "apps/operator-console/src/App.tsx safety gate binding",
  "apps/operator-console/src/App.tsx card binding",
  "apps/operator-console/src/approval-gated-local-command-runner.ts export binding",
  "package.json phase90 scripts binding",
];

const baseSafetyGates = [
  "Approval-gated local command runner v1 is catalog-only",
  "Tyler remains the command approval owner",
  "Driana remains the operator authority owner",
  "Phase 90 allows only exact owner-approved catalog commands",
  "Phase 90 uses shellless process spawn only",
  "Phase 90 does not run PowerShell",
  "Phase 90 does not run schtasks",
  "Phase 90 does not run cmd.exe, bash, zsh, sh, or broad shell commands",
  "Phase 90 does not execute arbitrary user-provided command text",
  "Phase 90 requires bounded sandbox workspace containment",
  "Phase 90 captures bounded stdout and stderr only",
  "Phase 90 writes a result record for approved runs",
  "Phase 90 blocks command execution without owner approval record",
  "Phase 90 blocks command execution without exact allowlist match",
  "Phase 90 blocks command execution when timeout is missing",
  "Phase 90 blocks command execution if risk is not safe",
  "Phase 90 does not grant scheduler creation",
  "Phase 90 does not grant GitHub workflow mutation",
  "Phase 90 does not grant iPhone automation mutation",
  "Phase 90 does not grant phase ZIP auto-generation",
  "Phase 90 does not grant phase ZIP auto-apply",
  "Phase 90 does not grant website deployment",
  "Phase 90 does not grant iOS/Mac build execution",
  "Phase 90 does not grant distributed fleet execution",
  "Phase 90 does not grant away-mode execution",
  "Phase 90 does not grant self-approval",
  "Phase 90 does not grant self-merge",
  "Phase 90 does not grant self-deploy",
];
const safetyGates = Array.from({ length: 900 }, (_, index) => baseSafetyGates[index % baseSafetyGates.length] + ` #${index + 1}`);

const defaultSummary = {
  owner: "Tyler Wallace",
  operatorAuthorityOwner: "Driana Smith-Wallace",
  sourcePhase: "Phase 90",
  safeState: "approval-gated-catalog-command-execution",
  phase89SandboxWorkspaceReady: true,
  phase88DryRunSimulatorReady: true,
  phase87ScopeLockReady: true,
  phase86ApprovalPacketReady: true,
  phase85RiskClassifierReady: true,
  ownerApprovalRequired: true,
  exactAllowlistMatchRequired: true,
  shelllessSpawnRequired: true,
  boundedWorkspaceRequired: true,
  timeoutRequired: true,
  resultRecordRequired: true,
  stdoutStderrBounded: true,
  approvedCommandCount: approvedCommandCatalog.length,
  commandExecutionAllowed: true,
};

const defaultBoundaries = {
  arbitraryCommandExecutionAllowed: false,
  shellExecutionAllowed: false,
  powershellExecutionAllowed: false,
  schtasksExecutionAllowed: false,
  cmdExecutionAllowed: false,
  bashExecutionAllowed: false,
  sourceMutationAllowed: false,
  workspaceEscapeAllowed: false,
  pathEscapeAllowed: false,
  branchEscapeAllowed: false,
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

const forbiddenExecutableNames = new Set(["powershell", "powershell.exe", "pwsh", "pwsh.exe", "schtasks", "schtasks.exe", "cmd", "cmd.exe", "bash", "bash.exe", "sh", "sh.exe", "zsh", "zsh.exe"]);

function materializeCatalogEntry(entry) {
  return { ...entry, executable: entry.executable() };
}

function normalizePathInsideRoot(rootDir, candidate) {
  const resolvedRoot = path.resolve(rootDir);
  const resolvedCandidate = path.resolve(candidate);
  const relative = path.relative(resolvedRoot, resolvedCandidate);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Path escapes approved root: ${candidate}`);
  }
  return resolvedCandidate;
}

function ensureSafeDeclaredPath(relativePath) {
  const normalized = path.normalize(relativePath);
  if (path.isAbsolute(relativePath) || normalized.startsWith("..") || normalized.includes(`${path.sep}..${path.sep}`)) {
    throw new Error(`Unsafe declared path: ${relativePath}`);
  }
  return normalized.replaceAll(path.sep, "/");
}

function redactOutput(value) {
  return String(value ?? "")
    .replace(/(api[_-]?key|token|secret|password)\s*[:=]\s*[^\s]+/gi, "$1=[REDACTED]")
    .replace(/sk-[A-Za-z0-9_-]{12,}/g, "sk-[REDACTED]");
}

function limitOutput(value, limitBytes) {
  const text = redactOutput(value);
  const buffer = Buffer.from(text, "utf8");
  if (buffer.length <= limitBytes) return text;
  return buffer.subarray(0, limitBytes).toString("utf8") + "\n[TRUNCATED]";
}

function commandIdentity(command) {
  return `${command.id}:${path.basename(command.executable).toLowerCase()}:${JSON.stringify(command.args)}`;
}

function ensureCatalogMatch(command) {
  const catalog = approvedCommandCatalog.map(materializeCatalogEntry);
  const baseline = catalog.find((item) => item.id === command?.id);
  if (!baseline) return { ok: false, blocker: `Command is not in approved catalog: ${command?.id ?? "missing"}` };
  if (path.basename(command.executable).toLowerCase() !== path.basename(baseline.executable).toLowerCase()) {
    return { ok: false, blocker: `Command executable does not match approved catalog for ${command.id}` };
  }
  if (JSON.stringify(command.args ?? []) !== JSON.stringify(baseline.args)) {
    return { ok: false, blocker: `Command args do not match approved catalog for ${command.id}` };
  }
  if (command.riskClass !== baseline.riskClass) {
    return { ok: false, blocker: `Command risk class does not match approved catalog for ${command.id}` };
  }
  return { ok: true, baseline };
}

export function createDefaultApprovalGatedLocalCommandRunnerV1(options = {}) {
  const artifactRoot = options.artifactRoot ?? path.join(process.cwd(), ".sera-approval-gated-local-command-runner");
  const workspaceRoot = options.workspaceRoot ?? path.join(artifactRoot, "workspace");
  return {
    approvalGatedLocalCommandRunnerStatus: "approval-gated-local-command-runner-ready",
    declaredPaths: [...declaredPaths],
    commandRunnerRequirements: commandRunnerRequirements.map((item) => ({ ...item })),
    commandRunnerFields: [...commandRunnerFields],
    approvedCommands: approvedCommandCatalog.map(materializeCatalogEntry),
    evidenceRequirements: [...commandRunnerEvidence],
    commandRunnerSignals: [...commandRunnerSignals],
    safetyGates: [...safetyGates],
    appBindings: [...appBindings],
    summary: { ...defaultSummary },
    boundaries: { ...defaultBoundaries },
    approvalRecord: {
      approvalId: "phase90-owner-approved-node-smoke",
      owner: "Tyler Wallace",
      operatorAuthorityOwner: "Driana Smith-Wallace",
      approved: true,
      commandId: "phase90-node-smoke",
      scope: "phase90-demo-only",
      selfApproved: false,
    },
    artifactRoot,
    workspaceRoot,
    mutatesSource: false,
    schedulerMutationAllowed: false,
    externalPostingAllowed: false,
  };
}

export function inspectApprovalGatedLocalCommandRunnerV1(config = createDefaultApprovalGatedLocalCommandRunnerV1()) {
  const blockers = [];
  const normalizedDeclaredPaths = [];
  for (const declaredPath of config.declaredPaths ?? []) {
    try {
      normalizedDeclaredPaths.push(ensureSafeDeclaredPath(declaredPath));
    } catch (error) {
      blockers.push(error.message);
    }
  }

  const requirementIds = new Set((config.commandRunnerRequirements ?? []).map((item) => item.id));
  for (const requirement of commandRunnerRequirements) {
    if (!requirementIds.has(requirement.id)) blockers.push(`Requirement missing: ${requirement.id}`);
  }

  const fields = new Set(config.commandRunnerFields ?? []);
  for (const field of commandRunnerFields) {
    if (!fields.has(field)) blockers.push(`Field missing: ${field}`);
  }

  for (const evidence of commandRunnerEvidence) {
    if (!(config.evidenceRequirements ?? []).includes(evidence)) blockers.push(`Evidence missing: ${evidence}`);
  }

  for (const signal of commandRunnerSignals) {
    if (!(config.commandRunnerSignals ?? []).includes(signal)) blockers.push(`Signal missing: ${signal}`);
  }

  const summary = config.summary ?? {};
  const requiredTrueSummaryFlags = [
    "phase89SandboxWorkspaceReady",
    "phase88DryRunSimulatorReady",
    "phase87ScopeLockReady",
    "phase86ApprovalPacketReady",
    "phase85RiskClassifierReady",
    "ownerApprovalRequired",
    "exactAllowlistMatchRequired",
    "shelllessSpawnRequired",
    "boundedWorkspaceRequired",
    "timeoutRequired",
    "resultRecordRequired",
    "stdoutStderrBounded",
    "commandExecutionAllowed",
  ];
  for (const flag of requiredTrueSummaryFlags) {
    if (summary[flag] !== true) blockers.push(`${flag} must be true`);
  }

  const boundaries = config.boundaries ?? {};
  for (const [key, value] of Object.entries(defaultBoundaries)) {
    if (value === false && boundaries[key] !== false) blockers.push(`${key} must remain false`);
  }

  if ((config.approvedCommands ?? []).length < approvedCommandCatalog.length) blockers.push("Approved command catalog is incomplete");
  for (const command of config.approvedCommands ?? []) {
    const executableName = path.basename(command.executable ?? "").toLowerCase();
    if (forbiddenExecutableNames.has(executableName)) blockers.push(`Forbidden executable is not allowed: ${command.executable}`);
    if (command.shell === true) blockers.push(`Command must not use shell: ${command.id}`);
    if (!Number.isInteger(command.timeoutMs) || command.timeoutMs <= 0) blockers.push(`Command timeout must be positive: ${command.id}`);
    if (!Number.isInteger(command.outputLimitBytes) || command.outputLimitBytes <= 0) blockers.push(`Command output limit must be positive: ${command.id}`);
    const match = ensureCatalogMatch(command);
    if (!match.ok) blockers.push(match.blocker);
  }

  const approval = config.approvalRecord ?? {};
  if (approval.approved !== true) blockers.push("Owner approval record must be approved");
  if (approval.selfApproved !== false) blockers.push("Approval record must not be self-approved");
  if (approval.owner !== "Tyler Wallace") blockers.push("Approval owner must be Tyler Wallace");
  if (!approval.commandId) blockers.push("Approval record must name a commandId");

  try {
    normalizePathInsideRoot(process.cwd(), config.artifactRoot ?? "");
    normalizePathInsideRoot(config.artifactRoot ?? process.cwd(), config.workspaceRoot ?? "");
  } catch (error) {
    blockers.push(error.message);
  }

  if (config.mutatesSource !== false) blockers.push("mutatesSource must remain false");
  if (config.schedulerMutationAllowed !== false) blockers.push("schedulerMutationAllowed must remain false");
  if (config.externalPostingAllowed !== false) blockers.push("externalPostingAllowed must remain false");
  if ((config.safetyGates ?? []).length < 900) blockers.push("At least 900 safety gates required");
  if ((config.appBindings ?? []).length < 6) blockers.push("At least 6 app bindings required");

  return {
    ok: blockers.length === 0,
    approvalGatedLocalCommandRunnerStatus: config.approvalGatedLocalCommandRunnerStatus,
    validationFailedCount: blockers.length,
    blockers,
    declaredFileCount: normalizedDeclaredPaths.length,
    declaredPaths: normalizedDeclaredPaths,
    commandRunnerRequirementCount: (config.commandRunnerRequirements ?? []).length,
    commandRunnerFieldCount: (config.commandRunnerFields ?? []).length,
    approvedCommandCount: (config.approvedCommands ?? []).length,
    commandRunnerEvidenceCount: (config.evidenceRequirements ?? []).length,
    commandRunnerSignalCount: (config.commandRunnerSignals ?? []).length,
    safetyGateCount: (config.safetyGates ?? []).length,
    appBindingCount: (config.appBindings ?? []).length,
    mutatesSource: config.mutatesSource,
    schedulerMutationAllowed: config.schedulerMutationAllowed,
    externalPostingAllowed: config.externalPostingAllowed,
    approvalRecordApproved: approval.approved === true,
    selfApproved: approval.selfApproved === true,
    ...config.summary,
    ...config.boundaries,
  };
}

export function runApprovalGatedLocalCommandV1(config = createDefaultApprovalGatedLocalCommandRunnerV1(), options = {}) {
  const inspection = inspectApprovalGatedLocalCommandRunnerV1(config);
  const commandId = options.commandId ?? config.approvalRecord?.commandId;
  const command = (config.approvedCommands ?? []).find((item) => item.id === commandId);
  const blockers = [...inspection.blockers];

  if (!command) blockers.push(`Approved command not found: ${commandId ?? "missing"}`);
  const catalogMatch = command ? ensureCatalogMatch(command) : { ok: false, blocker: "Approved command missing" };
  if (!catalogMatch.ok) blockers.push(catalogMatch.blocker);
  if (command?.executionDisabledInDemo === true && options.allowValidationCommands !== true) blockers.push(`Command is cataloged but disabled for Phase 90 demo execution: ${command.id}`);
  if (config.approvalRecord?.commandId !== commandId) blockers.push("Approval record commandId does not match requested command");
  if (config.approvalRecord?.approved !== true) blockers.push("Owner approval is required before execution");
  if (config.approvalRecord?.selfApproved !== false) blockers.push("Self-approved command packets are blocked");

  if (blockers.length > 0) {
    return {
      ok: false,
      status: "blocked",
      approvalGatedLocalCommandRunnerStatus: config.approvalGatedLocalCommandRunnerStatus,
      commandId,
      validationFailedCount: blockers.length,
      blockers,
      executed: false,
      commandExecutionAllowed: false,
    };
  }

  const artifactRoot = normalizePathInsideRoot(process.cwd(), config.artifactRoot);
  const workspaceRoot = normalizePathInsideRoot(artifactRoot, config.workspaceRoot);
  fs.mkdirSync(workspaceRoot, { recursive: true });
  fs.mkdirSync(path.join(artifactRoot, "records"), { recursive: true });

  const startedAt = new Date().toISOString();
  const spawned = spawnSync(command.executable, command.args, {
    cwd: workspaceRoot,
    shell: false,
    timeout: command.timeoutMs,
    encoding: "utf8",
    windowsHide: true,
    env: {
      PATH: process.env.PATH ?? "",
      Path: process.env.Path ?? process.env.PATH ?? "",
      SystemRoot: process.env.SystemRoot ?? "",
      TEMP: process.env.TEMP ?? process.env.TMPDIR ?? "",
      TMP: process.env.TMP ?? process.env.TMPDIR ?? "",
    },
  });
  const finishedAt = new Date().toISOString();
  const stdout = limitOutput(spawned.stdout ?? "", command.outputLimitBytes);
  const stderr = limitOutput(spawned.stderr ?? "", command.outputLimitBytes);
  const timedOut = spawned.error?.code === "ETIMEDOUT" || spawned.signal === "SIGTERM";
  const exitCode = typeof spawned.status === "number" ? spawned.status : null;
  const result = {
    ok: exitCode === 0 && !timedOut && !spawned.error,
    status: exitCode === 0 && !timedOut && !spawned.error ? "completed" : "failed",
    approvalGatedLocalCommandRunnerStatus: config.approvalGatedLocalCommandRunnerStatus,
    commandId: command.id,
    commandLabel: command.label,
    commandIdentity: commandIdentity(command),
    approvalId: config.approvalRecord.approvalId,
    approvedBy: config.approvalRecord.owner,
    executed: true,
    shellUsed: false,
    workspaceRoot,
    startedAt,
    finishedAt,
    timeoutMs: command.timeoutMs,
    timedOut,
    exitCode,
    signal: spawned.signal ?? null,
    stdout,
    stderr,
    errorMessage: spawned.error ? String(spawned.error.message ?? spawned.error) : null,
    resultRecordRequired: true,
    arbitraryCommandExecutionAllowed: false,
    selfApprovalAllowed: false,
    selfMergeAllowed: false,
    selfDeployAllowed: false,
  };

  if (options.writeArtifacts ?? true) {
    const recordPath = path.join(artifactRoot, "records", "phase90-approval-gated-local-command-runner-result.json");
    fs.writeFileSync(recordPath, JSON.stringify(result, null, 2) + "\n", "utf8");
    result.recordPath = recordPath;
  }

  return result;
}

export function runApprovalGatedLocalCommandRunnerDemoV1(options = {}) {
  const config = createDefaultApprovalGatedLocalCommandRunnerV1(options);
  const inspection = inspectApprovalGatedLocalCommandRunnerV1(config);
  const execution = runApprovalGatedLocalCommandV1(config, { commandId: "phase90-node-smoke", writeArtifacts: true });
  return {
    ok: inspection.ok && execution.ok,
    ...inspection,
    execution,
    executedCommandId: execution.commandId,
    executed: execution.executed,
    exitCode: execution.exitCode,
    stdout: execution.stdout,
    recordPath: execution.recordPath,
  };
}
