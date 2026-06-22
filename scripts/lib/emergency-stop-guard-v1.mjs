import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const RUNTIME_DIR = ".sera-emergency-stop-guard";
const REPORT_DIR = "reports";
const EVENTS_FILE = "events.jsonl";
const SUMMARY_JSON = "emergency-stop-guard-summary.json";
const SUMMARY_MD = "emergency-stop-guard-summary.md";
const HISTORY_JSONL = "emergency-stop-guard-history.jsonl";

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function nowIso() {
  return new Date().toISOString();
}

function sha256(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function writeJson(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function appendJsonl(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.appendFileSync(filePath, `${JSON.stringify(value)}\n`, "utf8");
}

function writeText(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, value, "utf8");
}

function normalizePath(value) {
  return String(value || "").replaceAll("\\", "/");
}

function isSafeRelativePath(value) {
  const normalized = normalizePath(value);
  return Boolean(normalized)
    && !path.isAbsolute(normalized)
    && !normalized.startsWith("../")
    && !normalized.includes("/../")
    && !normalized.startsWith(".git/")
    && !normalized.includes("/.git/");
}

function makeCheck(id, passed, message, severity = "blocker") {
  return { id, passed: Boolean(passed), severity, message };
}

function uniqueStrings(values) {
  return Array.from(new Set((values || []).filter((value) => typeof value === "string" && value.trim())));
}

function normalizeStopStep(step) {
  if (typeof step === "string") {
    const id = step.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    return {
      id,
      label: step,
      required: true,
      ownerReviewRequired: true,
      ownerReleaseRequired: true,
      stopSignalCheckRequired: true,
      stopStateLatchRequired: true,
      sessionLockCheckRequired: true,
      evidenceCaptureRequired: true,
      redactionReviewRequired: true,
      immutableAuditTrailRequired: true,
      commandExecutionAllowed: false,
      remoteExecutionAllowed: false,
      runnerConnectivityAllowed: false,
      mutatesSource: false,
      createsBranches: false,
      switchesBranches: false,
      pushesBranches: false,
      appliesPatches: false,
      mergesBranches: false,
      storesSecrets: false,
      selfApproved: false,
    };
  }

  const label = String(step?.label || step?.id || "");
  const id = String(step?.id || label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
  return {
    id,
    label,
    required: step?.required !== false,
    ownerReviewRequired: step?.ownerReviewRequired !== false,
    ownerReleaseRequired: step?.ownerReleaseRequired !== false,
    stopSignalCheckRequired: step?.stopSignalCheckRequired !== false,
    stopStateLatchRequired: step?.stopStateLatchRequired !== false,
    sessionLockCheckRequired: step?.sessionLockCheckRequired !== false,
    evidenceCaptureRequired: step?.evidenceCaptureRequired !== false,
    redactionReviewRequired: step?.redactionReviewRequired !== false,
    immutableAuditTrailRequired: step?.immutableAuditTrailRequired !== false,
    commandExecutionAllowed: step?.commandExecutionAllowed === true,
    remoteExecutionAllowed: step?.remoteExecutionAllowed === true,
    runnerConnectivityAllowed: step?.runnerConnectivityAllowed === true,
    mutatesSource: step?.mutatesSource === true,
    createsBranches: step?.createsBranches === true,
    switchesBranches: step?.switchesBranches === true,
    pushesBranches: step?.pushesBranches === true,
    appliesPatches: step?.appliesPatches === true,
    mergesBranches: step?.mergesBranches === true,
    storesSecrets: step?.storesSecrets === true,
    selfApproved: step?.selfApproved === true,
  };
}

function stopStepIsSafe(step) {
  const reasons = [];
  if (!step.id) reasons.push("stop step id is required");
  if (!step.label) reasons.push("stop step label is required");
  if (step.required !== true) reasons.push("stop step must be required");
  if (step.ownerReviewRequired !== true) reasons.push("owner review must be required");
  if (step.ownerReleaseRequired !== true) reasons.push("owner release must be required");
  if (step.stopSignalCheckRequired !== true) reasons.push("stop signal check must be required");
  if (step.stopStateLatchRequired !== true) reasons.push("stop state latch must be required");
  if (step.sessionLockCheckRequired !== true) reasons.push("session lock check must be required");
  if (step.evidenceCaptureRequired !== true) reasons.push("evidence capture must be required");
  if (step.redactionReviewRequired !== true) reasons.push("redaction review must be required");
  if (step.immutableAuditTrailRequired !== true) reasons.push("immutable audit trail must be required");
  if (step.commandExecutionAllowed !== false) reasons.push("command execution must remain disabled");
  if (step.remoteExecutionAllowed !== false) reasons.push("remote execution must remain disabled");
  if (step.runnerConnectivityAllowed !== false) reasons.push("runner connectivity must remain disabled");
  if (step.mutatesSource !== false) reasons.push("source mutation must remain disabled");
  if (step.createsBranches !== false) reasons.push("branch creation must remain disabled");
  if (step.switchesBranches !== false) reasons.push("branch switching must remain disabled");
  if (step.pushesBranches !== false) reasons.push("branch pushing must remain disabled");
  if (step.appliesPatches !== false) reasons.push("patch application must remain disabled");
  if (step.mergesBranches !== false) reasons.push("merge must remain disabled");
  if (step.storesSecrets !== false) reasons.push("secret storage must remain disabled");
  if (step.selfApproved !== false) reasons.push("self approval must be blocked");
  return { allowed: reasons.length === 0, reasons };
}

export function createDefaultEmergencyStopGuardV1() {
  const stopSteps = [
    "emergency-stop-contract-load",
    "owner-decision-recorder-binding",
    "approval-gated-action-plan-binding",
    "session-lock-guard-binding",
    "stop-signal-detection-plan",
    "stop-state-latch-plan",
    "blocked-action-handoff",
    "restart-preflight-plan",
    "owner-release-plan",
    "audit-export-plan",
  ].map((id) => normalizeStopStep({ id, label: id.replaceAll("-", " ") }));

  return {
    schemaVersion: 1,
    guardId: "phase44_emergency_stop_guard_plan",
    phaseId: "phase-44-emergency-stop-guard-v1",
    phaseNumber: 44,
    title: "Emergency Stop Guard v1",
    branchName: "phase-44-emergency-stop-guard-v1",
    sourcePhaseIds: [
      "phase-36-owner-approval-queue-v1",
      "phase-39-evidence-capture-bundle-v1",
      "phase-41-owner-decision-recorder-v1",
      "phase-42-approval-gated-action-plan-v1",
      "phase-43-session-lock-guard-v1",
    ],
    declaredPaths: [
      "docs/phases/PHASE_44_EMERGENCY_STOP_GUARD_V1.md",
      "scripts/lib/emergency-stop-guard-v1.mjs",
      "scripts/run-emergency-stop-guard-v1.mjs",
      "tests/integration/emergency-stop-guard-v1.test.ts",
    ],
    validationCommands: [
      "npm run phase44:demo",
      "npm run phase44:verify",
      "npm run hygiene",
      "npm run build",
      "npm test",
      "npm run certify",
      "npm run verify",
    ],
    stopSteps,
    evidenceRequirements: [
      "owner decision recorder summary",
      "approval gated action plan summary",
      "approval queue summary",
      "evidence bundle summary",
      "command allowlist summary",
      "branch readiness summary",
      "session lock summary",
      "emergency stop contract",
      "stop signal detection plan",
      "stop state latch plan",
      "blocked action handoff",
      "restart preflight plan",
      "owner release plan",
      "audit export plan",
    ],
    riskChecks: [
      "emergency stop cannot be ignored",
      "stop state cannot authorize execution",
      "stop release requires owner review",
      "session lock remains binding",
      "non approved action remains blocked",
      "no command execution",
      "no remote execution",
      "no runner connectivity",
      "no source mutation",
      "no branch mutation",
      "no patch application",
      "no merge or tag",
      "no secret storage",
      "no self approval",
    ],
    ownerApprovalGates: [
      "owner approval required for emergency stop guard activation",
      "owner approval required for stop signal policy changes",
      "owner approval required for stop state latch policy changes",
      "owner approval required for blocked action handoff",
      "owner approval required for restart preflight plan",
      "owner approval required for emergency stop release plan",
      "owner approval required for stop audit export",
      "owner approval required for session lock override",
    ],
    boundaries: {
      localOnly: true,
      guardOnly: true,
      emergencyStopGuardOnly: true,
      planningOnly: true,
      dryRunOnly: true,
      emergencyStopRequired: true,
      emergencyStopMustBlock: true,
      emergencyStopReleaseRequiresOwner: true,
      stopStateLatchRequired: true,
      stopSignalCheckRequired: true,
      blockedActionHandoffRequired: true,
      restartPreflightRequired: true,
      sessionLockGuardBindingRequired: true,
      sessionLockRequired: true,
      sessionLockCheckRequired: true,
      ownerDecisionRecorderBindingRequired: true,
      approvalGatedActionPlanBindingRequired: true,
      approvalQueueBindingRequired: true,
      evidenceCaptureRequired: true,
      evidenceBundleBindingRequired: true,
      commandAllowlistRequired: true,
      branchReadinessRequired: true,
      branchProposalRequired: true,
      phasePacketRequired: true,
      redactionReviewRequired: true,
      immutableAuditTrailRequired: true,
      nonApprovedDecisionMustBlockAction: true,
      approvedDecisionStillCannotAuthorizeExecution: true,
      ownerDecisionRequired: true,
      ownerApprovalRequiredForEmergencyStopGuardActivation: true,
      ownerApprovalRequiredForStopSignalPolicyChanges: true,
      ownerApprovalRequiredForStopStateLatchPolicyChanges: true,
      ownerApprovalRequiredForBlockedActionHandoff: true,
      ownerApprovalRequiredForRestartPreflightPlan: true,
      ownerApprovalRequiredForEmergencyStopReleasePlan: true,
      ownerApprovalRequiredForStopAuditExport: true,
      ownerApprovalRequiredForSessionLockOverride: true,
      emergencyStopCanAuthorizeExecution: false,
      emergencyStopActivationAllowed: false,
      emergencyStopReleaseAllowed: false,
      emergencyStopOverrideAllowed: false,
      sessionLockCanAuthorizeExecution: false,
      sessionLockAcquisitionAllowed: false,
      sessionLockReleaseAllowed: false,
      mapsOwnerDecisionsToActionPlan: false,
      actionCanAuthorizeExecution: false,
      decisionCanAuthorizeExecution: false,
      executionAllowedAfterApproval: false,
      overnightExecutionAllowed: false,
      workerActivationAllowed: false,
      commandExecutionAllowed: false,
      arbitraryCommandExecutionAllowed: false,
      shellExpansionAllowed: false,
      shellChainingAllowed: false,
      remoteExecutionAllowed: false,
      adapterEnabled: false,
      adapterActivationAllowed: false,
      runnerConnectivityAllowed: false,
      cloudRequired: false,
      paidProviderRequired: false,
      freeCoreDependency: false,
      requiresSecrets: false,
      usesCloudRunner: false,
      usesSelfHostedRunner: false,
      selfHostedRunnerActivated: false,
      mutatesSource: false,
      executesArbitraryCode: false,
      executesRemoteCommands: false,
      performsNetworkRefresh: false,
      createsBranches: false,
      switchesBranches: false,
      pushesBranches: false,
      opensPullRequests: false,
      appliesPatches: false,
      mergesBranches: false,
      tagsReleases: false,
      deletesBranches: false,
      recordsOwnerDecision: false,
      decisionRecordingAllowed: false,
      acceptsEvidenceAsOwnerApproved: false,
      selfApprovesPlan: false,
      selfApprovalAllowed: false,
      proposalActivationAllowed: false,
    },
  };
}

export function renderEmergencyStopGuardMarkdownV1(result) {
  const lines = [
    "# S.E.R.A. Phase 44 Emergency Stop Guard v1",
    "",
    `- Status: ${result.status}`,
    `- Emergency stop guard status: ${result.emergencyStopGuardStatus}`,
    `- Validation failed count: ${result.validationFailedCount}`,
    `- Stop step count: ${result.stopStepCount}`,
    `- Safe stop step count: ${result.safeStopStepCount}`,
    `- Unsafe stop step count: ${result.unsafeStopStepCount}`,
    `- Emergency stop must block: ${result.emergencyStopMustBlock}`,
    `- Emergency stop release requires owner: ${result.emergencyStopReleaseRequiresOwner}`,
    `- Emergency stop can authorize execution: ${result.emergencyStopCanAuthorizeExecution}`,
    `- Emergency stop activation allowed: ${result.emergencyStopActivationAllowed}`,
    `- Emergency stop release allowed: ${result.emergencyStopReleaseAllowed}`,
    "",
    "## Blockers",
    ...(result.blockers.length ? result.blockers.map((blocker) => `- ${blocker}`) : ["- none"]),
    "",
    "## Reports",
    `- JSON: ${result.jsonPath}`,
    `- Markdown: ${result.markdownPath}`,
    `- History: ${result.historyPath}`,
  ];
  return `${lines.join("\n")}\n`;
}

export function inspectEmergencyStopGuardV1(guard = createDefaultEmergencyStopGuardV1(), options = {}) {
  const rootDir = options.rootDir || process.cwd();
  const createdAt = nowIso();
  const checks = [];
  const blockers = [];

  const declaredPaths = uniqueStrings(guard.declaredPaths || []);
  for (const declaredPath of declaredPaths) {
    const safe = isSafeRelativePath(declaredPath);
    const exists = safe && fs.existsSync(path.join(rootDir, declaredPath));
    checks.push(makeCheck(`declared-path-safe:${declaredPath}`, safe, `Declared path must be safe and relative: ${declaredPath}`));
    checks.push(makeCheck(`declared-path-exists:${declaredPath}`, exists, `Declared path must exist: ${declaredPath}`));
  }

  const requiredValidationCommands = [
    "npm run phase44:demo",
    "npm run phase44:verify",
    "npm run hygiene",
    "npm run build",
    "npm test",
    "npm run certify",
    "npm run verify",
  ];
  const validationCommands = uniqueStrings(guard.validationCommands || []);
  for (const command of requiredValidationCommands) {
    checks.push(makeCheck(`validation-command:${command}`, validationCommands.includes(command), `Validation command is required: ${command}`));
  }

  const stopSteps = (guard.stopSteps || []).map(normalizeStopStep);
  for (const step of stopSteps) {
    const safety = stopStepIsSafe(step);
    checks.push(makeCheck(`stop-step-safe:${step.id}`, safety.allowed, `Stop step must pass Phase 44 safety checks: ${step.id}`));
    for (const reason of safety.reasons) {
      checks.push(makeCheck(`stop-step-reason:${step.id}:${reason}`, false, `Unsafe stop step ${step.id}: ${reason}`));
    }
  }

  const evidenceRequirements = uniqueStrings(guard.evidenceRequirements || []);
  const riskChecks = uniqueStrings(guard.riskChecks || []);
  const ownerApprovalGates = uniqueStrings(guard.ownerApprovalGates || []);
  checks.push(makeCheck("stop-step-count", stopSteps.length >= 10, "At least 10 stop steps are required."));
  checks.push(makeCheck("evidence-count", evidenceRequirements.length >= 12, "At least 12 evidence requirements are required."));
  checks.push(makeCheck("risk-count", riskChecks.length >= 12, "At least 12 risk checks are required."));
  checks.push(makeCheck("owner-gate-count", ownerApprovalGates.length >= 8, "At least eight owner approval gates are required."));

  const requiredOwnerGates = [
    "owner approval required for emergency stop guard activation",
    "owner approval required for stop signal policy changes",
    "owner approval required for stop state latch policy changes",
    "owner approval required for blocked action handoff",
    "owner approval required for restart preflight plan",
    "owner approval required for emergency stop release plan",
    "owner approval required for stop audit export",
    "owner approval required for session lock override",
  ];
  const lowerGates = ownerApprovalGates.map((gate) => gate.toLowerCase());
  for (const gate of requiredOwnerGates) {
    checks.push(makeCheck(`owner-gate:${gate}`, lowerGates.includes(gate), `Owner gate is required: ${gate}`));
  }

  const boundaries = guard.boundaries || {};
  const falseBoundaryNames = [
    "emergencyStopCanAuthorizeExecution",
    "emergencyStopActivationAllowed",
    "emergencyStopReleaseAllowed",
    "emergencyStopOverrideAllowed",
    "sessionLockCanAuthorizeExecution",
    "sessionLockAcquisitionAllowed",
    "sessionLockReleaseAllowed",
    "mapsOwnerDecisionsToActionPlan",
    "actionCanAuthorizeExecution",
    "decisionCanAuthorizeExecution",
    "executionAllowedAfterApproval",
    "overnightExecutionAllowed",
    "workerActivationAllowed",
    "commandExecutionAllowed",
    "arbitraryCommandExecutionAllowed",
    "shellExpansionAllowed",
    "shellChainingAllowed",
    "remoteExecutionAllowed",
    "adapterEnabled",
    "adapterActivationAllowed",
    "runnerConnectivityAllowed",
    "cloudRequired",
    "paidProviderRequired",
    "freeCoreDependency",
    "requiresSecrets",
    "usesCloudRunner",
    "usesSelfHostedRunner",
    "selfHostedRunnerActivated",
    "mutatesSource",
    "executesArbitraryCode",
    "executesRemoteCommands",
    "performsNetworkRefresh",
    "createsBranches",
    "switchesBranches",
    "pushesBranches",
    "opensPullRequests",
    "appliesPatches",
    "mergesBranches",
    "tagsReleases",
    "deletesBranches",
    "recordsOwnerDecision",
    "decisionRecordingAllowed",
    "acceptsEvidenceAsOwnerApproved",
    "selfApprovesPlan",
    "selfApprovalAllowed",
    "proposalActivationAllowed",
  ];
  for (const name of falseBoundaryNames) {
    checks.push(makeCheck(`boundary:${name}`, boundaries[name] === false, `${name} must remain false in Phase 44.`));
  }

  const trueBoundaryNames = [
    "localOnly",
    "guardOnly",
    "emergencyStopGuardOnly",
    "planningOnly",
    "dryRunOnly",
    "emergencyStopRequired",
    "emergencyStopMustBlock",
    "emergencyStopReleaseRequiresOwner",
    "stopStateLatchRequired",
    "stopSignalCheckRequired",
    "blockedActionHandoffRequired",
    "restartPreflightRequired",
    "sessionLockGuardBindingRequired",
    "sessionLockRequired",
    "sessionLockCheckRequired",
    "ownerDecisionRecorderBindingRequired",
    "approvalGatedActionPlanBindingRequired",
    "approvalQueueBindingRequired",
    "evidenceCaptureRequired",
    "evidenceBundleBindingRequired",
    "commandAllowlistRequired",
    "branchReadinessRequired",
    "branchProposalRequired",
    "phasePacketRequired",
    "redactionReviewRequired",
    "immutableAuditTrailRequired",
    "nonApprovedDecisionMustBlockAction",
    "approvedDecisionStillCannotAuthorizeExecution",
    "ownerDecisionRequired",
    "ownerApprovalRequiredForEmergencyStopGuardActivation",
    "ownerApprovalRequiredForStopSignalPolicyChanges",
    "ownerApprovalRequiredForStopStateLatchPolicyChanges",
    "ownerApprovalRequiredForBlockedActionHandoff",
    "ownerApprovalRequiredForRestartPreflightPlan",
    "ownerApprovalRequiredForEmergencyStopReleasePlan",
    "ownerApprovalRequiredForStopAuditExport",
    "ownerApprovalRequiredForSessionLockOverride",
  ];
  for (const name of trueBoundaryNames) {
    checks.push(makeCheck(`required:${name}`, boundaries[name] === true, `${name} must remain true in Phase 44.`));
  }

  for (const check of checks) {
    if (!check.passed && check.severity === "blocker") blockers.push(check.message);
  }

  const runtimeDir = path.join(rootDir, RUNTIME_DIR);
  const reportDir = path.join(runtimeDir, REPORT_DIR);
  const eventPath = path.join(runtimeDir, EVENTS_FILE);
  const jsonPath = path.join(reportDir, SUMMARY_JSON);
  const markdownPath = path.join(reportDir, SUMMARY_MD);
  const historyPath = path.join(reportDir, HISTORY_JSONL);
  ensureDir(reportDir);

  const safeStopStepCount = stopSteps.filter((step) => stopStepIsSafe(step).allowed).length;
  const result = {
    ok: blockers.length === 0,
    status: blockers.length === 0 ? "passed" : "failed",
    emergencyStopGuardStatus: blockers.length === 0 ? "ready" : "blocked",
    createdAt,
    phaseId: guard.phaseId,
    phaseNumber: guard.phaseNumber,
    title: guard.title,
    branchName: guard.branchName,
    declaredFileCount: declaredPaths.length,
    validationCommandCount: validationCommands.length,
    stopStepCount: stopSteps.length,
    safeStopStepCount,
    unsafeStopStepCount: stopSteps.length - safeStopStepCount,
    evidenceRequirementCount: evidenceRequirements.length,
    riskCheckCount: riskChecks.length,
    ownerApprovalGateCount: ownerApprovalGates.length,
    validationFailedCount: checks.filter((check) => !check.passed).length,
    blockers,
    emergencyStopGuardHash: sha256(guard),
    ...boundaries,
    checks,
    stopSteps,
    init: {
      ok: true,
      status: "completed",
      schemaVersion: 1,
      runtimeDir,
      eventPath,
      reportDir,
    },
    jsonPath,
    markdownPath,
    historyPath,
  };

  writeJson(jsonPath, result);
  writeText(markdownPath, renderEmergencyStopGuardMarkdownV1(result));
  appendJsonl(historyPath, {
    createdAt: result.createdAt,
    phaseId: result.phaseId,
    status: result.status,
    emergencyStopGuardStatus: result.emergencyStopGuardStatus,
    validationFailedCount: result.validationFailedCount,
    emergencyStopGuardHash: result.emergencyStopGuardHash,
  });
  appendJsonl(eventPath, {
    createdAt: result.createdAt,
    event: "phase44_emergency_stop_guard_inspected",
    status: result.status,
    emergencyStopGuardStatus: result.emergencyStopGuardStatus,
  });

  return result;
}
