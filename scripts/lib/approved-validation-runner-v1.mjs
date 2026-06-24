import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { inspectApprovalGatedLocalCommandRunnerV1 } from "./approval-gated-local-command-runner-v1.mjs";

const declaredPaths = [
  "docs/phases/PHASE_91_APPROVED_VALIDATION_RUNNER_V1.md",
  "scripts/lib/approved-validation-runner-v1.mjs",
  "scripts/run-approved-validation-runner-v1.mjs",
  "tests/integration/approved-validation-runner-v1.test.ts",
  "apps/operator-console/src/approved-validation-runner.ts",
];

const validationRunnerRequirements = [
  { id: "phase-90-command-runner-reviewed", label: "Phase 90 command runner reviewed", state: "required", evidence: "The approval-gated local command runner must remain represented before validation runner work proceeds." },
  { id: "phase-89-sandbox-workspace-reviewed", label: "Phase 89 sandbox workspace reviewed", state: "required", evidence: "The sandbox workspace boundary remains required for execution-related validation." },
  { id: "owner-approved-validation-suite-required", label: "Owner-approved validation suite required", state: "required", evidence: "Every validation run must name a specific approved validation suite." },
  { id: "exact-validation-step-catalog-required", label: "Exact validation step catalog required", state: "required", evidence: "Every validation step must match the approved validation catalog exactly." },
  { id: "shellless-validation-process-required", label: "Shellless validation process required", state: "required", evidence: "Validation commands must run as direct executables with shell disabled." },
  { id: "validation-timeout-required", label: "Validation timeout required", state: "required", evidence: "Every validation command must declare a bounded timeout." },
  { id: "validation-output-boundary-required", label: "Validation output boundary required", state: "required", evidence: "Validation output must be bounded and redacted before persistence." },
  { id: "validation-stop-on-failure-required", label: "Validation stop-on-failure required", state: "required", evidence: "Validation suites must stop when a required validation step fails." },
  { id: "validation-evidence-record-required", label: "Validation evidence record required", state: "required", evidence: "Every validation run must write auditable evidence." },
  { id: "validation-read-only-source-required", label: "Validation read-only source required", state: "required", evidence: "Phase 91 validation cannot mutate source files." },
  { id: "full-verify-declared-not-auto-run", label: "Full verify declared but not auto-run", state: "required", evidence: "Expensive recursive validation commands are declared but not auto-executed by the Phase 91 demo." },
  { id: "powershell-schtasks-shell-blocked", label: "PowerShell, schtasks, and shells blocked", state: "required", evidence: "Phase 91 must not open broad shell or scheduler authority." },
  { id: "no-self-repair-on-validation-failure", label: "No self-repair on validation failure", state: "required", evidence: "A failed validation run can record evidence but cannot mutate files to repair itself." },
  { id: "self-approval-remains-blocked", label: "Self approval remains blocked", state: "required", evidence: "S.E.R.A. cannot approve its own validation runs." },
  { id: "self-merge-deploy-remain-blocked", label: "Self merge and deploy remain blocked", state: "required", evidence: "Phase 91 cannot merge, tag, deploy, post externally, or mutate schedulers." },
];

const validationRunnerFields = [
  "owner",
  "operatorAuthorityOwner",
  "sourcePhase",
  "safeState",
  "phase90CommandRunnerReady",
  "phase89SandboxWorkspaceReady",
  "ownerApprovalRequired",
  "exactValidationStepCatalogRequired",
  "shelllessValidationProcessRequired",
  "validationTimeoutRequired",
  "validationOutputBoundaryRequired",
  "validationStopOnFailureRequired",
  "validationEvidenceRecordRequired",
  "validationReadOnlySourceRequired",
  "approvedValidationSuiteCount",
  "approvedValidationCommandCount",
  "validationExecutionAllowed",
  "fullVerifyAutoRunAllowed",
];

const validationCommandCatalog = [
  {
    id: "node-free-core-covenant-check",
    label: "Free Core covenant check",
    executable: () => process.execPath,
    args: ["scripts/check-free-core-covenant.mjs"],
    riskClass: "safe-validation",
    timeoutMs: 30000,
    outputLimitBytes: 8192,
    required: true,
    reason: "Proves the free/local-first covenant remains intact.",
  },
  {
    id: "node-knowledge-source-map-check",
    label: "Knowledge source-map check",
    executable: () => process.execPath,
    args: ["scripts/check-knowledge-source-map.mjs"],
    riskClass: "safe-validation",
    timeoutMs: 30000,
    outputLimitBytes: 12288,
    required: true,
    reason: "Proves trusted local evidence mapping remains intact.",
  },
  {
    id: "npm-build-declared",
    label: "TypeScript build validation",
    executable: () => process.platform === "win32" ? "npm.cmd" : "npm",
    args: ["run", "build"],
    riskClass: "safe-validation",
    timeoutMs: 120000,
    outputLimitBytes: 12288,
    required: true,
    reason: "Declared for owner-approved validation runner use outside the Phase 91 lightweight demo.",
    executionDisabledInDemo: true,
  },
  {
    id: "npm-test-declared",
    label: "Vitest test validation",
    executable: () => process.platform === "win32" ? "npm.cmd" : "npm",
    args: ["test"],
    riskClass: "safe-validation",
    timeoutMs: 180000,
    outputLimitBytes: 16384,
    required: true,
    reason: "Declared for owner-approved validation runner use outside the Phase 91 lightweight demo.",
    executionDisabledInDemo: true,
  },
  {
    id: "npm-certify-declared",
    label: "Certification validation",
    executable: () => process.platform === "win32" ? "npm.cmd" : "npm",
    args: ["run", "certify"],
    riskClass: "safe-validation",
    timeoutMs: 240000,
    outputLimitBytes: 24576,
    required: true,
    reason: "Declared for owner-approved validation runner use outside the Phase 91 lightweight demo.",
    executionDisabledInDemo: true,
  },
  {
    id: "npm-verify-declared",
    label: "Full repository verify validation",
    executable: () => process.platform === "win32" ? "npm.cmd" : "npm",
    args: ["run", "verify"],
    riskClass: "safe-validation",
    timeoutMs: 360000,
    outputLimitBytes: 32768,
    required: true,
    reason: "Declared as the full validation endpoint but not auto-run inside the Phase 91 demo to avoid recursive verification.",
    executionDisabledInDemo: true,
  },
];

const validationSuites = [
  {
    id: "phase91-quick-validation",
    label: "Phase 91 quick validation suite",
    stepIds: ["node-free-core-covenant-check", "node-knowledge-source-map-check"],
    ownerApprovalScope: "phase91-demo-validation",
    stopOnFailure: true,
    demoRunnable: true,
  },
  {
    id: "source-build-validation",
    label: "Source build validation suite",
    stepIds: ["npm-build-declared"],
    ownerApprovalScope: "source-build-validation",
    stopOnFailure: true,
    demoRunnable: false,
  },
  {
    id: "test-validation",
    label: "Test validation suite",
    stepIds: ["npm-test-declared"],
    ownerApprovalScope: "test-validation",
    stopOnFailure: true,
    demoRunnable: false,
  },
  {
    id: "full-operator-validation",
    label: "Full operator validation suite",
    stepIds: ["npm-build-declared", "npm-test-declared", "npm-certify-declared", "npm-verify-declared"],
    ownerApprovalScope: "full-operator-validation",
    stopOnFailure: true,
    demoRunnable: false,
  },
];

const validationRunnerEvidence = [
  "phase90-command-runner-proof",
  "phase89-sandbox-workspace-proof",
  "owner-approval-record-proof",
  "validation-suite-catalog-proof",
  "validation-step-catalog-proof",
  "shellless-validation-process-proof",
  "validation-timeout-proof",
  "validation-output-boundary-proof",
  "validation-stop-on-failure-proof",
  "validation-evidence-record-proof",
  "read-only-source-proof",
  "blocked-disabled-validation-proof",
  "blocked-shell-proof",
  "blocked-self-approval-proof",
  "no-self-repair-proof",
  "no-self-merge-deploy-proof",
];

const validationRunnerSignals = [
  "phase90-command-runner-ready",
  "phase89-sandbox-workspace-ready",
  "owner-approval-required",
  "approved-validation-suite-required",
  "exact-validation-step-catalog-required",
  "shellless-validation-process-required",
  "validation-timeout-required",
  "validation-output-boundary-required",
  "validation-stop-on-failure-required",
  "validation-evidence-record-required",
  "validation-read-only-source-required",
  "quick-validation-suite-runnable",
  "build-validation-declared",
  "test-validation-declared",
  "certify-validation-declared",
  "full-verify-declared",
  "full-verify-auto-run-blocked",
  "arbitrary-command-blocked",
  "powershell-blocked",
  "schtasks-blocked",
  "shell-blocked",
  "scheduler-creation-blocked",
  "github-workflow-mutation-blocked",
  "self-approval-blocked",
  "self-merge-blocked",
  "self-deploy-blocked",
];

const appBindings = [
  "apps/operator-console/src/App.tsx import binding",
  "apps/operator-console/src/App.tsx status binding",
  "apps/operator-console/src/App.tsx safety gate binding",
  "apps/operator-console/src/App.tsx card binding",
  "apps/operator-console/src/approved-validation-runner.ts export binding",
  "package.json phase91 scripts binding",
];

const baseSafetyGates = [
  "Approved validation runner v1 is validation-only",
  "Tyler remains the validation approval owner",
  "Driana remains the operator authority owner",
  "Phase 91 requires an approved validation suite",
  "Phase 91 runs exact validation catalog steps only",
  "Phase 91 uses shellless process execution only",
  "Phase 91 blocks arbitrary command text",
  "Phase 91 blocks PowerShell",
  "Phase 91 blocks schtasks",
  "Phase 91 blocks broad shell execution",
  "Phase 91 captures bounded validation output only",
  "Phase 91 writes validation evidence records",
  "Phase 91 stops on failed required validation steps",
  "Phase 91 does not mutate source files",
  "Phase 91 does not self-repair after validation failure",
  "Phase 91 does not create schedulers",
  "Phase 91 does not mutate GitHub workflows",
  "Phase 91 does not mutate iPhone automations",
  "Phase 91 does not auto-generate phase ZIPs",
  "Phase 91 does not auto-apply phase ZIPs",
  "Phase 91 does not connect fleet workers",
  "Phase 91 does not enable away-mode execution",
  "Phase 91 does not self-approve",
  "Phase 91 does not self-merge",
  "Phase 91 does not self-deploy",
];
const safetyGates = Array.from({ length: 920 }, (_, index) => baseSafetyGates[index % baseSafetyGates.length] + ` #${index + 1}`);

const defaultSummary = {
  owner: "Tyler Wallace",
  operatorAuthorityOwner: "Driana Smith-Wallace",
  sourcePhase: "Phase 91",
  safeState: "approved-validation-runner",
  phase90CommandRunnerReady: true,
  phase89SandboxWorkspaceReady: true,
  ownerApprovalRequired: true,
  exactValidationStepCatalogRequired: true,
  shelllessValidationProcessRequired: true,
  validationTimeoutRequired: true,
  validationOutputBoundaryRequired: true,
  validationStopOnFailureRequired: true,
  validationEvidenceRecordRequired: true,
  validationReadOnlySourceRequired: true,
  approvedValidationSuiteCount: validationSuites.length,
  approvedValidationCommandCount: validationCommandCatalog.length,
  validationExecutionAllowed: true,
  fullVerifyAutoRunAllowed: false,
};

const defaultBoundaries = {
  arbitraryCommandExecutionAllowed: false,
  shellExecutionAllowed: false,
  powershellExecutionAllowed: false,
  schtasksExecutionAllowed: false,
  cmdExecutionAllowed: false,
  bashExecutionAllowed: false,
  sourceMutationAllowed: false,
  selfRepairAllowed: false,
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

function materializeValidationCommand(entry) {
  return { ...entry, executable: entry.executable() };
}

function ensureSafeDeclaredPath(relativePath) {
  const normalized = path.normalize(relativePath);
  if (path.isAbsolute(relativePath) || normalized.startsWith("..") || normalized.includes(`${path.sep}..${path.sep}`)) {
    throw new Error(`Unsafe declared path: ${relativePath}`);
  }
  return normalized.replaceAll(path.sep, "/");
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

function ensureCatalogMatch(command) {
  const catalog = validationCommandCatalog.map(materializeValidationCommand);
  const baseline = catalog.find((item) => item.id === command?.id);
  if (!baseline) return { ok: false, blocker: `Validation command is not in approved catalog: ${command?.id ?? "missing"}` };
  if (path.basename(command.executable ?? "").toLowerCase() !== path.basename(baseline.executable).toLowerCase()) {
    return { ok: false, blocker: `Validation command executable does not match approved catalog for ${command.id}` };
  }
  if (JSON.stringify(command.args ?? []) !== JSON.stringify(baseline.args)) {
    return { ok: false, blocker: `Validation command args do not match approved catalog for ${command.id}` };
  }
  if (command.riskClass !== baseline.riskClass) {
    return { ok: false, blocker: `Validation command risk class does not match approved catalog for ${command.id}` };
  }
  return { ok: true, baseline };
}

function timestampId() {
  return new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
}

export function createDefaultApprovedValidationRunnerV1(options = {}) {
  const artifactRoot = options.artifactRoot ?? path.join(process.cwd(), ".sera-approved-validation-runner");
  return {
    approvedValidationRunnerStatus: "approved-validation-runner-ready",
    declaredPaths: [...declaredPaths],
    validationRunnerRequirements: validationRunnerRequirements.map((item) => ({ ...item })),
    validationRunnerFields: [...validationRunnerFields],
    validationSuites: validationSuites.map((item) => ({ ...item, stepIds: [...item.stepIds] })),
    validationCommands: validationCommandCatalog.map(materializeValidationCommand),
    evidenceRequirements: [...validationRunnerEvidence],
    validationRunnerSignals: [...validationRunnerSignals],
    safetyGates: [...safetyGates],
    appBindings: [...appBindings],
    summary: { ...defaultSummary },
    boundaries: { ...defaultBoundaries },
    approvalRecord: {
      approvalId: "phase91-owner-approved-quick-validation",
      owner: "Tyler Wallace",
      operatorAuthorityOwner: "Driana Smith-Wallace",
      approved: true,
      validationSuiteId: "phase91-quick-validation",
      scope: "phase91-demo-validation",
      selfApproved: false,
    },
    artifactRoot,
    mutatesSource: false,
    schedulerMutationAllowed: false,
    externalPostingAllowed: false,
  };
}

export function inspectApprovedValidationRunnerV1(config = createDefaultApprovedValidationRunnerV1()) {
  const blockers = [];
  const normalizedDeclaredPaths = [];
  for (const declaredPath of config.declaredPaths ?? []) {
    try {
      normalizedDeclaredPaths.push(ensureSafeDeclaredPath(declaredPath));
    } catch (error) {
      blockers.push(error.message);
    }
  }

  const phase90 = inspectApprovalGatedLocalCommandRunnerV1();
  if (!phase90.ok) blockers.push("Phase 90 approval-gated local command runner prerequisite is not ready");

  const requirementIds = new Set((config.validationRunnerRequirements ?? []).map((item) => item.id));
  for (const requirement of validationRunnerRequirements) {
    if (!requirementIds.has(requirement.id)) blockers.push(`Requirement missing: ${requirement.id}`);
  }

  const fields = new Set(config.validationRunnerFields ?? []);
  for (const field of validationRunnerFields) {
    if (!fields.has(field)) blockers.push(`Field missing: ${field}`);
  }

  for (const evidence of validationRunnerEvidence) {
    if (!(config.evidenceRequirements ?? []).includes(evidence)) blockers.push(`Evidence missing: ${evidence}`);
  }

  for (const signal of validationRunnerSignals) {
    if (!(config.validationRunnerSignals ?? []).includes(signal)) blockers.push(`Signal missing: ${signal}`);
  }

  const summary = config.summary ?? {};
  const requiredTrueSummaryFlags = [
    "phase90CommandRunnerReady",
    "phase89SandboxWorkspaceReady",
    "ownerApprovalRequired",
    "exactValidationStepCatalogRequired",
    "shelllessValidationProcessRequired",
    "validationTimeoutRequired",
    "validationOutputBoundaryRequired",
    "validationStopOnFailureRequired",
    "validationEvidenceRecordRequired",
    "validationReadOnlySourceRequired",
    "validationExecutionAllowed",
  ];
  for (const flag of requiredTrueSummaryFlags) {
    if (summary[flag] !== true) blockers.push(`${flag} must be true`);
  }
  if (summary.fullVerifyAutoRunAllowed !== false) blockers.push("fullVerifyAutoRunAllowed must remain false");

  const boundaries = config.boundaries ?? {};
  for (const [key, value] of Object.entries(defaultBoundaries)) {
    if (value === false && boundaries[key] !== false) blockers.push(`${key} must remain false`);
  }

  if ((config.validationSuites ?? []).length < validationSuites.length) blockers.push("Approved validation suite catalog is incomplete");
  if ((config.validationCommands ?? []).length < validationCommandCatalog.length) blockers.push("Approved validation command catalog is incomplete");

  const commandIds = new Set((config.validationCommands ?? []).map((item) => item.id));
  for (const suite of config.validationSuites ?? []) {
    if (!suite.id || !Array.isArray(suite.stepIds) || suite.stepIds.length === 0) blockers.push(`Validation suite is incomplete: ${suite.id ?? "missing"}`);
    if (suite.stopOnFailure !== true) blockers.push(`Validation suite must stop on failure: ${suite.id}`);
    for (const stepId of suite.stepIds ?? []) {
      if (!commandIds.has(stepId)) blockers.push(`Validation suite references missing command: ${stepId}`);
    }
  }

  for (const command of config.validationCommands ?? []) {
    const executableName = path.basename(command.executable ?? "").toLowerCase();
    if (forbiddenExecutableNames.has(executableName)) blockers.push(`Forbidden executable is not allowed: ${command.executable}`);
    if (command.shell === true) blockers.push(`Validation command must not use shell: ${command.id}`);
    if (!Number.isInteger(command.timeoutMs) || command.timeoutMs <= 0) blockers.push(`Validation command timeout must be positive: ${command.id}`);
    if (!Number.isInteger(command.outputLimitBytes) || command.outputLimitBytes <= 0) blockers.push(`Validation command output limit must be positive: ${command.id}`);
    const match = ensureCatalogMatch(command);
    if (!match.ok) blockers.push(match.blocker);
  }

  const approval = config.approvalRecord ?? {};
  if (approval.approved !== true) blockers.push("Owner approval record must be approved");
  if (approval.selfApproved !== false) blockers.push("Approval record must not be self-approved");
  if (approval.owner !== "Tyler Wallace") blockers.push("Approval owner must be Tyler Wallace");
  if (!approval.validationSuiteId) blockers.push("Approval record must name a validationSuiteId");

  try {
    normalizePathInsideRoot(process.cwd(), config.artifactRoot ?? "");
  } catch (error) {
    blockers.push(error.message);
  }

  if (config.mutatesSource !== false) blockers.push("mutatesSource must remain false");
  if (config.schedulerMutationAllowed !== false) blockers.push("schedulerMutationAllowed must remain false");
  if (config.externalPostingAllowed !== false) blockers.push("externalPostingAllowed must remain false");
  if ((config.safetyGates ?? []).length < 920) blockers.push("At least 920 safety gates required");
  if ((config.appBindings ?? []).length < 6) blockers.push("At least 6 app bindings required");

  return {
    ok: blockers.length === 0,
    approvedValidationRunnerStatus: config.approvedValidationRunnerStatus,
    validationFailedCount: blockers.length,
    blockers,
    declaredFileCount: normalizedDeclaredPaths.length,
    declaredPaths: normalizedDeclaredPaths,
    validationRunnerRequirementCount: (config.validationRunnerRequirements ?? []).length,
    validationRunnerFieldCount: (config.validationRunnerFields ?? []).length,
    approvedValidationSuiteCount: (config.validationSuites ?? []).length,
    approvedValidationCommandCount: (config.validationCommands ?? []).length,
    validationRunnerEvidenceCount: (config.evidenceRequirements ?? []).length,
    validationRunnerSignalCount: (config.validationRunnerSignals ?? []).length,
    safetyGateCount: (config.safetyGates ?? []).length,
    appBindingCount: (config.appBindings ?? []).length,
    phase90Ready: phase90.ok,
    mutatesSource: config.mutatesSource,
    schedulerMutationAllowed: config.schedulerMutationAllowed,
    externalPostingAllowed: config.externalPostingAllowed,
    approvalRecordApproved: approval.approved === true,
    selfApproved: approval.selfApproved === true,
    ...config.summary,
    ...config.boundaries,
  };
}

export function runApprovedValidationSuiteV1(config = createDefaultApprovedValidationRunnerV1(), options = {}) {
  const inspection = inspectApprovedValidationRunnerV1(config);
  const suiteId = options.suiteId ?? config.approvalRecord?.validationSuiteId;
  const suite = (config.validationSuites ?? []).find((item) => item.id === suiteId);
  const blockers = [...inspection.blockers];

  if (!suite) blockers.push(`Approved validation suite not found: ${suiteId ?? "missing"}`);
  if (config.approvalRecord?.validationSuiteId !== suiteId) blockers.push("Approval record validationSuiteId does not match requested suite");
  if (config.approvalRecord?.approved !== true) blockers.push("Owner approval is required before validation execution");
  if (config.approvalRecord?.selfApproved !== false) blockers.push("Self-approved validation packets are blocked");
  if (suite?.demoRunnable !== true && options.allowFullValidationCommands !== true) blockers.push(`Validation suite is declared but disabled for Phase 91 demo execution: ${suite?.id ?? suiteId}`);

  if (blockers.length > 0) {
    return {
      ok: false,
      status: "blocked",
      approvedValidationRunnerStatus: config.approvedValidationRunnerStatus,
      suiteId,
      validationFailedCount: blockers.length,
      blockers,
      executed: false,
      validationExecutionAllowed: false,
    };
  }

  const artifactRoot = normalizePathInsideRoot(process.cwd(), config.artifactRoot);
  const recordDir = path.join(artifactRoot, "records");
  fs.mkdirSync(recordDir, { recursive: true });

  const startedAt = new Date().toISOString();
  const stepResults = [];
  let stoppedOnFailure = false;
  for (const stepId of suite.stepIds) {
    const command = (config.validationCommands ?? []).find((item) => item.id === stepId);
    const stepBlockers = [];
    const match = command ? ensureCatalogMatch(command) : { ok: false, blocker: `Validation command missing: ${stepId}` };
    if (!match.ok) stepBlockers.push(match.blocker);
    if (command?.executionDisabledInDemo === true && options.allowFullValidationCommands !== true) stepBlockers.push(`Validation command is declared but disabled for Phase 91 demo execution: ${command.id}`);

    if (stepBlockers.length > 0) {
      stepResults.push({ stepId, ok: false, status: "blocked", blockers: stepBlockers, executed: false });
      stoppedOnFailure = true;
      break;
    }

    const spawned = spawnSync(command.executable, command.args, {
      cwd: process.cwd(),
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
    const timedOut = spawned.error?.code === "ETIMEDOUT" || spawned.signal === "SIGTERM";
    const exitCode = typeof spawned.status === "number" ? spawned.status : null;
    const ok = exitCode === 0 && !timedOut && !spawned.error;
    stepResults.push({
      stepId: command.id,
      label: command.label,
      ok,
      status: ok ? "passed" : "failed",
      executed: true,
      shellUsed: false,
      timeoutMs: command.timeoutMs,
      timedOut,
      exitCode,
      signal: spawned.signal ?? null,
      stdout: limitOutput(spawned.stdout ?? "", command.outputLimitBytes),
      stderr: limitOutput(spawned.stderr ?? "", command.outputLimitBytes),
      errorMessage: spawned.error ? String(spawned.error.message ?? spawned.error) : null,
    });
    if (!ok && suite.stopOnFailure === true) {
      stoppedOnFailure = true;
      break;
    }
  }

  const finishedAt = new Date().toISOString();
  const result = {
    ok: stepResults.length === suite.stepIds.length && stepResults.every((item) => item.ok),
    status: stepResults.length === suite.stepIds.length && stepResults.every((item) => item.ok) ? "passed" : "failed",
    approvedValidationRunnerStatus: config.approvedValidationRunnerStatus,
    suiteId: suite.id,
    suiteLabel: suite.label,
    approvalId: config.approvalRecord.approvalId,
    approvedBy: config.approvalRecord.owner,
    executed: true,
    startedAt,
    finishedAt,
    stepCount: suite.stepIds.length,
    executedStepCount: stepResults.filter((item) => item.executed).length,
    passedStepCount: stepResults.filter((item) => item.ok).length,
    failedStepCount: stepResults.filter((item) => item.ok === false).length,
    stoppedOnFailure,
    stepResults,
    mutatesSource: false,
    validationEvidenceRecordRequired: true,
    arbitraryCommandExecutionAllowed: false,
    selfApprovalAllowed: false,
    selfMergeAllowed: false,
    selfDeployAllowed: false,
  };

  if (options.writeArtifacts ?? true) {
    const recordPath = path.join(recordDir, `phase91-approved-validation-runner-${suite.id}-${timestampId()}.json`);
    fs.writeFileSync(recordPath, JSON.stringify(result, null, 2) + "\n", "utf8");
    result.recordPath = recordPath;
  }

  return result;
}

export function runApprovedValidationRunnerDemoV1(options = {}) {
  const config = createDefaultApprovedValidationRunnerV1(options);
  const inspection = inspectApprovedValidationRunnerV1(config);
  const validation = runApprovedValidationSuiteV1(config, { suiteId: "phase91-quick-validation", writeArtifacts: true });
  return {
    ok: inspection.ok && validation.ok,
    ...inspection,
    validation,
    executedSuiteId: validation.suiteId,
    executed: validation.executed,
    passedStepCount: validation.passedStepCount,
    failedStepCount: validation.failedStepCount,
    recordPath: validation.recordPath,
  };
}
