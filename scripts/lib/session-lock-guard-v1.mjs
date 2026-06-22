import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const RUNTIME_DIR = ".sera-session-lock-guard";
const REPORT_DIR = "reports";
const EVENTS_FILE = "events.jsonl";
const SUMMARY_JSON = "session-lock-guard-summary.json";
const SUMMARY_MD = "session-lock-guard-summary.md";
const HISTORY_JSONL = "session-lock-guard-history.jsonl";

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

function normalizeLockStep(step) {
  if (typeof step === "string") {
    const id = step.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    return {
      id,
      label: step,
      required: true,
      ownerReviewRequired: true,
      ownerReleaseRequired: true,
      staleLockCheckRequired: true,
      overlappingSessionCheckRequired: true,
      heartbeatPlanRequired: true,
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
    staleLockCheckRequired: step?.staleLockCheckRequired !== false,
    overlappingSessionCheckRequired: step?.overlappingSessionCheckRequired !== false,
    heartbeatPlanRequired: step?.heartbeatPlanRequired !== false,
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

function lockStepIsSafe(step) {
  const reasons = [];
  if (!step.id) reasons.push("lock step id is required");
  if (!step.label) reasons.push("lock step label is required");
  if (step.required !== true) reasons.push("lock step must be required");
  if (step.ownerReviewRequired !== true) reasons.push("owner review must be required");
  if (step.ownerReleaseRequired !== true) reasons.push("owner release must be required");
  if (step.staleLockCheckRequired !== true) reasons.push("stale lock check must be required");
  if (step.overlappingSessionCheckRequired !== true) reasons.push("overlapping session check must be required");
  if (step.heartbeatPlanRequired !== true) reasons.push("heartbeat plan must be required");
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

export function createDefaultSessionLockGuardV1() {
  const lockSteps = [
    "session-lock-contract-load",
    "owner-decision-recorder-binding",
    "approval-gated-action-plan-binding",
    "lock-acquire-preflight-plan",
    "overlapping-session-check",
    "stale-lock-check",
    "lock-heartbeat-plan",
    "lock-release-plan",
    "emergency-stop-binding",
    "owner-review-handoff",
  ].map((id) => normalizeLockStep({ id, label: id.replaceAll("-", " ") }));

  return {
    schemaVersion: 1,
    guardId: "phase43_session_lock_guard_plan",
    phaseId: "phase-43-session-lock-guard-v1",
    phaseNumber: 43,
    title: "Session Lock Guard v1",
    branchName: "phase-43-session-lock-guard-v1",
    sourcePhaseIds: [
      "phase-36-owner-approval-queue-v1",
      "phase-39-evidence-capture-bundle-v1",
      "phase-40-overnight-branch-worker-v1",
      "phase-41-owner-decision-recorder-v1",
      "phase-42-approval-gated-action-plan-v1",
    ],
    declaredPaths: [
      "docs/phases/PHASE_43_SESSION_LOCK_GUARD_V1.md",
      "scripts/lib/session-lock-guard-v1.mjs",
      "scripts/run-session-lock-guard-v1.mjs",
      "tests/integration/session-lock-guard-v1.test.ts",
    ],
    validationCommands: [
      "npm run phase43:demo",
      "npm run phase43:verify",
      "npm run hygiene",
      "npm run build",
      "npm test",
      "npm run certify",
      "npm run verify",
    ],
    lockSteps,
    evidenceRequirements: [
      "owner decision recorder summary",
      "approval gated action plan summary",
      "approval queue summary",
      "evidence bundle summary",
      "command allowlist summary",
      "branch readiness summary",
      "overnight worker summary",
      "session lock acquisition preflight",
      "overlapping session check",
      "stale lock check",
      "heartbeat plan",
      "release plan",
      "emergency stop state",
      "owner review handoff",
    ],
    riskChecks: [
      "stale lock cannot be ignored",
      "overlapping session cannot proceed",
      "lock cannot authorize execution",
      "lock release requires owner review",
      "no command execution",
      "no remote execution",
      "no runner connectivity",
      "no source mutation",
      "no branch mutation",
      "no patch application",
      "no merge or tag",
      "no secret storage",
      "no self approval",
      "emergency stop remains binding",
    ],
    ownerApprovalGates: [
      "owner approval required for session lock guard activation",
      "owner approval required for session lock acquisition plan",
      "owner approval required for overlapping session override",
      "owner approval required for stale lock override",
      "owner approval required for heartbeat policy changes",
      "owner approval required for lock release plan",
      "owner approval required for lock audit export",
      "owner approval required for emergency stop release",
    ],
    boundaries: {
      localOnly: true,
      lockGuardOnly: true,
      sessionLockGuardOnly: true,
      planningOnly: true,
      dryRunOnly: true,
      sessionLockRequired: true,
      sessionLockCanAuthorizeExecution: false,
      sessionLockAcquisitionAllowed: false,
      sessionLockReleaseAllowed: false,
      overlappingSessionMustBlock: true,
      staleLockMustBlock: true,
      ownerReleaseRequired: true,
      heartbeatPlanRequired: true,
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
      ownerDecisionRequired: true,
      emergencyStopRequired: true,
      ownerApprovalRequiredForSessionLockGuardActivation: true,
      ownerApprovalRequiredForSessionLockAcquisitionPlan: true,
      ownerApprovalRequiredForOverlappingSessionOverride: true,
      ownerApprovalRequiredForStaleLockOverride: true,
      ownerApprovalRequiredForHeartbeatPolicyChanges: true,
      ownerApprovalRequiredForLockReleasePlan: true,
      ownerApprovalRequiredForLockAuditExport: true,
      ownerApprovalRequiredForEmergencyStopRelease: true,
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

export function renderSessionLockGuardMarkdownV1(result) {
  const lines = [
    "# S.E.R.A. Phase 43 Session Lock Guard v1",
    "",
    `- Status: ${result.status}`,
    `- Session lock guard status: ${result.sessionLockGuardStatus}`,
    `- Validation failed count: ${result.validationFailedCount}`,
    `- Lock step count: ${result.lockStepCount}`,
    `- Safe lock step count: ${result.safeLockStepCount}`,
    `- Unsafe lock step count: ${result.unsafeLockStepCount}`,
    `- Session lock can authorize execution: ${result.sessionLockCanAuthorizeExecution}`,
    `- Session lock acquisition allowed: ${result.sessionLockAcquisitionAllowed}`,
    `- Session lock release allowed: ${result.sessionLockReleaseAllowed}`,
    `- Overlapping session must block: ${result.overlappingSessionMustBlock}`,
    `- Stale lock must block: ${result.staleLockMustBlock}`,
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

export function inspectSessionLockGuardV1(guard = createDefaultSessionLockGuardV1(), options = {}) {
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
    "npm run phase43:demo",
    "npm run phase43:verify",
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

  const lockSteps = (guard.lockSteps || []).map(normalizeLockStep);
  for (const step of lockSteps) {
    const safety = lockStepIsSafe(step);
    checks.push(makeCheck(`lock-step-safe:${step.id}`, safety.allowed, `Lock step must pass Phase 43 safety checks: ${step.id}`));
    for (const reason of safety.reasons) {
      checks.push(makeCheck(`lock-step-reason:${step.id}:${reason}`, false, `Unsafe lock step ${step.id}: ${reason}`));
    }
  }

  const evidenceRequirements = uniqueStrings(guard.evidenceRequirements || []);
  const riskChecks = uniqueStrings(guard.riskChecks || []);
  const ownerApprovalGates = uniqueStrings(guard.ownerApprovalGates || []);
  checks.push(makeCheck("lock-step-count", lockSteps.length >= 10, "At least 10 lock steps are required."));
  checks.push(makeCheck("evidence-count", evidenceRequirements.length >= 12, "At least 12 evidence requirements are required."));
  checks.push(makeCheck("risk-count", riskChecks.length >= 12, "At least 12 risk checks are required."));
  checks.push(makeCheck("owner-gate-count", ownerApprovalGates.length >= 8, "At least eight owner approval gates are required."));

  const requiredOwnerGates = [
    "owner approval required for session lock guard activation",
    "owner approval required for session lock acquisition plan",
    "owner approval required for overlapping session override",
    "owner approval required for stale lock override",
    "owner approval required for heartbeat policy changes",
    "owner approval required for lock release plan",
    "owner approval required for lock audit export",
    "owner approval required for emergency stop release",
  ];
  const lowerGates = ownerApprovalGates.map((gate) => gate.toLowerCase());
  for (const gate of requiredOwnerGates) {
    checks.push(makeCheck(`owner-gate:${gate}`, lowerGates.includes(gate), `Owner gate is required: ${gate}`));
  }

  const boundaries = guard.boundaries || {};
  const falseBoundaryNames = [
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
    checks.push(makeCheck(`boundary:${name}`, boundaries[name] === false, `${name} must remain false in Phase 43.`));
  }

  const trueBoundaryNames = [
    "localOnly",
    "lockGuardOnly",
    "sessionLockGuardOnly",
    "planningOnly",
    "dryRunOnly",
    "sessionLockRequired",
    "overlappingSessionMustBlock",
    "staleLockMustBlock",
    "ownerReleaseRequired",
    "heartbeatPlanRequired",
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
    "ownerDecisionRequired",
    "emergencyStopRequired",
    "ownerApprovalRequiredForSessionLockGuardActivation",
    "ownerApprovalRequiredForSessionLockAcquisitionPlan",
    "ownerApprovalRequiredForOverlappingSessionOverride",
    "ownerApprovalRequiredForStaleLockOverride",
    "ownerApprovalRequiredForHeartbeatPolicyChanges",
    "ownerApprovalRequiredForLockReleasePlan",
    "ownerApprovalRequiredForLockAuditExport",
    "ownerApprovalRequiredForEmergencyStopRelease",
  ];
  for (const name of trueBoundaryNames) {
    checks.push(makeCheck(`required:${name}`, boundaries[name] === true, `${name} must remain true in Phase 43.`));
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

  const safeLockStepCount = lockSteps.filter((step) => lockStepIsSafe(step).allowed).length;
  const result = {
    ok: blockers.length === 0,
    status: blockers.length === 0 ? "passed" : "failed",
    sessionLockGuardStatus: blockers.length === 0 ? "ready" : "blocked",
    createdAt,
    phaseId: guard.phaseId,
    phaseNumber: guard.phaseNumber,
    title: guard.title,
    branchName: guard.branchName,
    declaredFileCount: declaredPaths.length,
    validationCommandCount: validationCommands.length,
    lockStepCount: lockSteps.length,
    safeLockStepCount,
    unsafeLockStepCount: lockSteps.length - safeLockStepCount,
    evidenceRequirementCount: evidenceRequirements.length,
    riskCheckCount: riskChecks.length,
    ownerApprovalGateCount: ownerApprovalGates.length,
    validationFailedCount: checks.filter((check) => !check.passed).length,
    blockers,
    sessionLockGuardHash: sha256(guard),
    ...boundaries,
    checks,
    lockSteps,
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
  writeText(markdownPath, renderSessionLockGuardMarkdownV1(result));
  appendJsonl(historyPath, {
    createdAt: result.createdAt,
    phaseId: result.phaseId,
    status: result.status,
    sessionLockGuardStatus: result.sessionLockGuardStatus,
    validationFailedCount: result.validationFailedCount,
    sessionLockGuardHash: result.sessionLockGuardHash,
  });
  appendJsonl(eventPath, {
    createdAt: result.createdAt,
    event: "phase43_session_lock_guard_inspected",
    status: result.status,
    sessionLockGuardStatus: result.sessionLockGuardStatus,
  });

  return result;
}
