import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const RUNTIME_DIR = ".sera-free-core-covenant-checkpoint";
const REPORT_DIR = "reports";
const EVENTS_FILE = "events.jsonl";
const SUMMARY_JSON = "free-core-covenant-checkpoint-summary.json";
const SUMMARY_MD = "free-core-covenant-checkpoint-summary.md";
const HISTORY_JSONL = "free-core-covenant-checkpoint-history.jsonl";

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

function normalizeCovenantItem(item) {
  if (typeof item === "string") {
    const id = item.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    return {
      id,
      label: item,
      required: true,
      ownerReviewRequired: true,
      evidenceCaptureRequired: true,
      redactionReviewRequired: true,
      immutableAuditTrailRequired: true,
      localOnly: true,
      freeCoreCompatible: true,
      paidProviderRequired: false,
      cloudRequired: false,
      usesCloudRunner: false,
      usesSelfHostedRunner: false,
      requiresSecrets: false,
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
      commercialActivationAllowed: false,
      selfApproved: false,
    };
  }

  const label = String(item?.label || item?.id || "");
  const id = String(item?.id || label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
  return {
    id,
    label,
    required: item?.required !== false,
    ownerReviewRequired: item?.ownerReviewRequired !== false,
    evidenceCaptureRequired: item?.evidenceCaptureRequired !== false,
    redactionReviewRequired: item?.redactionReviewRequired !== false,
    immutableAuditTrailRequired: item?.immutableAuditTrailRequired !== false,
    localOnly: item?.localOnly !== false,
    freeCoreCompatible: item?.freeCoreCompatible !== false,
    paidProviderRequired: item?.paidProviderRequired === true,
    cloudRequired: item?.cloudRequired === true,
    usesCloudRunner: item?.usesCloudRunner === true,
    usesSelfHostedRunner: item?.usesSelfHostedRunner === true,
    requiresSecrets: item?.requiresSecrets === true,
    commandExecutionAllowed: item?.commandExecutionAllowed === true,
    remoteExecutionAllowed: item?.remoteExecutionAllowed === true,
    runnerConnectivityAllowed: item?.runnerConnectivityAllowed === true,
    mutatesSource: item?.mutatesSource === true,
    createsBranches: item?.createsBranches === true,
    switchesBranches: item?.switchesBranches === true,
    pushesBranches: item?.pushesBranches === true,
    appliesPatches: item?.appliesPatches === true,
    mergesBranches: item?.mergesBranches === true,
    storesSecrets: item?.storesSecrets === true,
    commercialActivationAllowed: item?.commercialActivationAllowed === true,
    selfApproved: item?.selfApproved === true,
  };
}

function covenantItemIsSafe(item) {
  const reasons = [];
  if (!item.id) reasons.push("covenant item id is required");
  if (!item.label) reasons.push("covenant item label is required");
  if (item.required !== true) reasons.push("covenant item must be required");
  if (item.ownerReviewRequired !== true) reasons.push("owner review must be required");
  if (item.evidenceCaptureRequired !== true) reasons.push("evidence capture must be required");
  if (item.redactionReviewRequired !== true) reasons.push("redaction review must be required");
  if (item.immutableAuditTrailRequired !== true) reasons.push("immutable audit trail must be required");
  if (item.localOnly !== true) reasons.push("covenant item must remain local-only");
  if (item.freeCoreCompatible !== true) reasons.push("covenant item must remain free-core compatible");
  if (item.paidProviderRequired !== false) reasons.push("paid providers must remain prohibited");
  if (item.cloudRequired !== false) reasons.push("cloud requirements must remain prohibited");
  if (item.usesCloudRunner !== false) reasons.push("cloud runner use must remain disabled");
  if (item.usesSelfHostedRunner !== false) reasons.push("self-hosted runner use must remain disabled");
  if (item.requiresSecrets !== false) reasons.push("secret use must remain disabled");
  if (item.commandExecutionAllowed !== false) reasons.push("command execution must remain disabled");
  if (item.remoteExecutionAllowed !== false) reasons.push("remote execution must remain disabled");
  if (item.runnerConnectivityAllowed !== false) reasons.push("runner connectivity must remain disabled");
  if (item.mutatesSource !== false) reasons.push("source mutation must remain disabled");
  if (item.createsBranches !== false) reasons.push("branch creation must remain disabled");
  if (item.switchesBranches !== false) reasons.push("branch switching must remain disabled");
  if (item.pushesBranches !== false) reasons.push("branch pushing must remain disabled");
  if (item.appliesPatches !== false) reasons.push("patch application must remain disabled");
  if (item.mergesBranches !== false) reasons.push("merge must remain disabled");
  if (item.storesSecrets !== false) reasons.push("secret storage must remain disabled");
  if (item.commercialActivationAllowed !== false) reasons.push("commercial activation must remain deferred");
  if (item.selfApproved !== false) reasons.push("self approval must be blocked");
  return { allowed: reasons.length === 0, reasons };
}

export function createDefaultFreeCoreCovenantCheckpointV1() {
  const covenantItems = [
    "free-core-covenant-contract-load",
    "phase-45-through-boundary-declaration",
    "paid-provider-prohibition",
    "cloud-runner-prohibition",
    "secret-use-prohibition",
    "local-runtime-only",
    "command-execution-prohibition",
    "remote-execution-prohibition",
    "runner-connectivity-prohibition",
    "source-mutation-prohibition",
    "branch-mutation-prohibition",
    "owner-approval-boundary-binding",
    "session-lock-and-emergency-stop-binding",
    "commercial-activation-deferral",
  ].map((id) => normalizeCovenantItem({ id, label: id.replaceAll("-", " ") }));

  return {
    schemaVersion: 1,
    checkpointId: "phase45_free_core_covenant_checkpoint_plan",
    phaseId: "phase-45-free-core-covenant-checkpoint-v1",
    phaseNumber: 45,
    title: "Free Core Covenant Checkpoint v1",
    branchName: "phase-45-free-core-covenant-checkpoint-v1",
    sourcePhaseIds: [
      "phase-35-remote-phase-runner-blueprint-v1",
      "phase-38-command-allowlist-gate-v1",
      "phase-40-overnight-branch-worker-v1",
      "phase-41-owner-decision-recorder-v1",
      "phase-42-approval-gated-action-plan-v1",
      "phase-43-session-lock-guard-v1",
      "phase-44-emergency-stop-guard-v1",
    ],
    declaredPaths: [
      "docs/phases/PHASE_45_FREE_CORE_COVENANT_CHECKPOINT_V1.md",
      "scripts/lib/free-core-covenant-checkpoint-v1.mjs",
      "scripts/run-free-core-covenant-checkpoint-v1.mjs",
      "tests/integration/free-core-covenant-checkpoint-v1.test.ts",
    ],
    validationCommands: [
      "npm run phase45:demo",
      "npm run phase45:verify",
      "npm run hygiene",
      "npm run build",
      "npm test",
      "npm run certify",
      "npm run verify",
    ],
    covenantItems,
    evidenceRequirements: [
      "free core covenant verifier output",
      "phase 45 boundary declaration",
      "package script validation",
      "knowledge source map validation",
      "runtime artifact hygiene validation",
      "build validation",
      "test suite validation",
      "certification validation",
      "full verify validation",
      "paid provider prohibition proof",
      "cloud runner prohibition proof",
      "secret use prohibition proof",
      "local runtime proof",
      "commercial activation deferral proof",
    ],
    riskChecks: [
      "paid provider cannot be required",
      "cloud cannot be required",
      "secrets cannot be required",
      "runner connectivity cannot activate",
      "command execution cannot activate",
      "remote execution cannot activate",
      "source mutation cannot activate",
      "branch mutation cannot activate",
      "patch application cannot activate",
      "merge or tag cannot activate",
      "commercial activation remains deferred",
      "owner approval remains required",
      "session lock remains binding",
      "emergency stop remains binding",
      "no self approval",
    ],
    ownerApprovalGates: [
      "owner approval required for free core covenant checkpoint activation",
      "owner approval required for free core boundary changes",
      "owner approval required for paid provider policy changes",
      "owner approval required for cloud runner policy changes",
      "owner approval required for secret policy changes",
      "owner approval required for commercial activation review",
      "owner approval required for runtime boundary audit export",
      "owner approval required for emergency stop release",
    ],
    boundaries: {
      localOnly: true,
      checkpointOnly: true,
      freeCoreCovenantCheckpointOnly: true,
      planningOnly: true,
      dryRunOnly: true,
      freeCoreCovenantRequired: true,
      freeCoreThroughPhase45: true,
      paidProviderProhibited: true,
      cloudRunnerProhibited: true,
      secretUseProhibited: true,
      localRuntimeOnly: true,
      commercialActivationDeferred: true,
      ownerApprovalRequired: true,
      ownerDecisionRequired: true,
      emergencyStopRequired: true,
      sessionLockRequired: true,
      commandAllowlistRequired: true,
      approvalQueueBindingRequired: true,
      evidenceCaptureRequired: true,
      evidenceBundleBindingRequired: true,
      ownerDecisionRecorderBindingRequired: true,
      approvalGatedActionPlanBindingRequired: true,
      sessionLockGuardBindingRequired: true,
      emergencyStopGuardBindingRequired: true,
      redactionReviewRequired: true,
      immutableAuditTrailRequired: true,
      ownerApprovalRequiredForFreeCoreCovenantCheckpointActivation: true,
      ownerApprovalRequiredForFreeCoreBoundaryChanges: true,
      ownerApprovalRequiredForPaidProviderPolicyChanges: true,
      ownerApprovalRequiredForCloudRunnerPolicyChanges: true,
      ownerApprovalRequiredForSecretPolicyChanges: true,
      ownerApprovalRequiredForCommercialActivationReview: true,
      ownerApprovalRequiredForRuntimeBoundaryAuditExport: true,
      ownerApprovalRequiredForEmergencyStopRelease: true,
      freeCoreDependency: false,
      paidProviderRequired: false,
      cloudRequired: false,
      requiresSecrets: false,
      usesCloudRunner: false,
      usesSelfHostedRunner: false,
      selfHostedRunnerActivated: false,
      runnerConnectivityAllowed: false,
      remoteExecutionAllowed: false,
      commandExecutionAllowed: false,
      arbitraryCommandExecutionAllowed: false,
      shellExpansionAllowed: false,
      shellChainingAllowed: false,
      executesArbitraryCode: false,
      executesRemoteCommands: false,
      performsNetworkRefresh: false,
      mutatesSource: false,
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
      commercialActivationAllowed: false,
      paidFeatureActivationAllowed: false,
      executionAllowedAfterApproval: false,
      overnightExecutionAllowed: false,
      workerActivationAllowed: false,
      actionCanAuthorizeExecution: false,
      decisionCanAuthorizeExecution: false,
      emergencyStopCanAuthorizeExecution: false,
      sessionLockCanAuthorizeExecution: false,
      proposalActivationAllowed: false,
    },
  };
}

export function renderFreeCoreCovenantCheckpointMarkdownV1(result) {
  const lines = [
    "# S.E.R.A. Phase 45 Free Core Covenant Checkpoint v1",
    "",
    `- Status: ${result.status}`,
    `- Free core covenant checkpoint status: ${result.freeCoreCovenantCheckpointStatus}`,
    `- Free core through phase: ${result.freeCoreThroughPhase}`,
    `- Validation failed count: ${result.validationFailedCount}`,
    `- Covenant item count: ${result.covenantItemCount}`,
    `- Safe covenant item count: ${result.safeCovenantItemCount}`,
    `- Unsafe covenant item count: ${result.unsafeCovenantItemCount}`,
    `- Paid provider required: ${result.paidProviderRequired}`,
    `- Cloud required: ${result.cloudRequired}`,
    `- Requires secrets: ${result.requiresSecrets}`,
    `- Command execution allowed: ${result.commandExecutionAllowed}`,
    `- Runner connectivity allowed: ${result.runnerConnectivityAllowed}`,
    `- Commercial activation allowed: ${result.commercialActivationAllowed}`,
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

export function inspectFreeCoreCovenantCheckpointV1(checkpoint = createDefaultFreeCoreCovenantCheckpointV1(), options = {}) {
  const rootDir = options.rootDir || process.cwd();
  const createdAt = nowIso();
  const checks = [];
  const blockers = [];

  const declaredPaths = uniqueStrings(checkpoint.declaredPaths || []);
  for (const declaredPath of declaredPaths) {
    const safe = isSafeRelativePath(declaredPath);
    const exists = safe && fs.existsSync(path.join(rootDir, declaredPath));
    checks.push(makeCheck(`declared-path-safe:${declaredPath}`, safe, `Declared path must be safe and relative: ${declaredPath}`));
    checks.push(makeCheck(`declared-path-exists:${declaredPath}`, exists, `Declared path must exist: ${declaredPath}`));
  }

  const requiredValidationCommands = [
    "npm run phase45:demo",
    "npm run phase45:verify",
    "npm run hygiene",
    "npm run build",
    "npm test",
    "npm run certify",
    "npm run verify",
  ];
  const validationCommands = uniqueStrings(checkpoint.validationCommands || []);
  for (const command of requiredValidationCommands) {
    checks.push(makeCheck(`validation-command:${command}`, validationCommands.includes(command), `Validation command is required: ${command}`));
  }

  const covenantItems = (checkpoint.covenantItems || []).map(normalizeCovenantItem);
  for (const item of covenantItems) {
    const safety = covenantItemIsSafe(item);
    checks.push(makeCheck(`covenant-item-safe:${item.id}`, safety.allowed, `Covenant item must pass Phase 45 safety checks: ${item.id}`));
    for (const reason of safety.reasons) {
      checks.push(makeCheck(`covenant-item-reason:${item.id}:${reason}`, false, `Unsafe covenant item ${item.id}: ${reason}`));
    }
  }

  const evidenceRequirements = uniqueStrings(checkpoint.evidenceRequirements || []);
  const riskChecks = uniqueStrings(checkpoint.riskChecks || []);
  const ownerApprovalGates = uniqueStrings(checkpoint.ownerApprovalGates || []);
  checks.push(makeCheck("covenant-item-count", covenantItems.length >= 12, "At least 12 covenant items are required."));
  checks.push(makeCheck("evidence-count", evidenceRequirements.length >= 12, "At least 12 evidence requirements are required."));
  checks.push(makeCheck("risk-count", riskChecks.length >= 12, "At least 12 risk checks are required."));
  checks.push(makeCheck("owner-gate-count", ownerApprovalGates.length >= 8, "At least eight owner approval gates are required."));

  const requiredOwnerGates = [
    "owner approval required for free core covenant checkpoint activation",
    "owner approval required for free core boundary changes",
    "owner approval required for paid provider policy changes",
    "owner approval required for cloud runner policy changes",
    "owner approval required for secret policy changes",
    "owner approval required for commercial activation review",
    "owner approval required for runtime boundary audit export",
    "owner approval required for emergency stop release",
  ];
  const lowerGates = ownerApprovalGates.map((gate) => gate.toLowerCase());
  for (const gate of requiredOwnerGates) {
    checks.push(makeCheck(`owner-gate:${gate}`, lowerGates.includes(gate), `Owner gate is required: ${gate}`));
  }

  const boundaries = checkpoint.boundaries || {};
  const falseBoundaryNames = [
    "freeCoreDependency",
    "paidProviderRequired",
    "cloudRequired",
    "requiresSecrets",
    "usesCloudRunner",
    "usesSelfHostedRunner",
    "selfHostedRunnerActivated",
    "runnerConnectivityAllowed",
    "remoteExecutionAllowed",
    "commandExecutionAllowed",
    "arbitraryCommandExecutionAllowed",
    "shellExpansionAllowed",
    "shellChainingAllowed",
    "executesArbitraryCode",
    "executesRemoteCommands",
    "performsNetworkRefresh",
    "mutatesSource",
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
    "commercialActivationAllowed",
    "paidFeatureActivationAllowed",
    "executionAllowedAfterApproval",
    "overnightExecutionAllowed",
    "workerActivationAllowed",
    "actionCanAuthorizeExecution",
    "decisionCanAuthorizeExecution",
    "emergencyStopCanAuthorizeExecution",
    "sessionLockCanAuthorizeExecution",
    "proposalActivationAllowed",
  ];
  for (const name of falseBoundaryNames) {
    checks.push(makeCheck(`boundary:${name}`, boundaries[name] === false, `${name} must remain false in Phase 45.`));
  }

  const trueBoundaryNames = [
    "localOnly",
    "checkpointOnly",
    "freeCoreCovenantCheckpointOnly",
    "planningOnly",
    "dryRunOnly",
    "freeCoreCovenantRequired",
    "freeCoreThroughPhase45",
    "paidProviderProhibited",
    "cloudRunnerProhibited",
    "secretUseProhibited",
    "localRuntimeOnly",
    "commercialActivationDeferred",
    "ownerApprovalRequired",
    "ownerDecisionRequired",
    "emergencyStopRequired",
    "sessionLockRequired",
    "commandAllowlistRequired",
    "approvalQueueBindingRequired",
    "evidenceCaptureRequired",
    "evidenceBundleBindingRequired",
    "ownerDecisionRecorderBindingRequired",
    "approvalGatedActionPlanBindingRequired",
    "sessionLockGuardBindingRequired",
    "emergencyStopGuardBindingRequired",
    "redactionReviewRequired",
    "immutableAuditTrailRequired",
    "ownerApprovalRequiredForFreeCoreCovenantCheckpointActivation",
    "ownerApprovalRequiredForFreeCoreBoundaryChanges",
    "ownerApprovalRequiredForPaidProviderPolicyChanges",
    "ownerApprovalRequiredForCloudRunnerPolicyChanges",
    "ownerApprovalRequiredForSecretPolicyChanges",
    "ownerApprovalRequiredForCommercialActivationReview",
    "ownerApprovalRequiredForRuntimeBoundaryAuditExport",
    "ownerApprovalRequiredForEmergencyStopRelease",
  ];
  for (const name of trueBoundaryNames) {
    checks.push(makeCheck(`required:${name}`, boundaries[name] === true, `${name} must remain true in Phase 45.`));
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

  const safeCovenantItemCount = covenantItems.filter((item) => covenantItemIsSafe(item).allowed).length;
  const result = {
    ok: blockers.length === 0,
    status: blockers.length === 0 ? "passed" : "failed",
    freeCoreCovenantCheckpointStatus: blockers.length === 0 ? "ready" : "blocked",
    freeCoreThroughPhase: 45,
    createdAt,
    phaseId: checkpoint.phaseId,
    phaseNumber: checkpoint.phaseNumber,
    title: checkpoint.title,
    branchName: checkpoint.branchName,
    declaredFileCount: declaredPaths.length,
    validationCommandCount: validationCommands.length,
    covenantItemCount: covenantItems.length,
    safeCovenantItemCount,
    unsafeCovenantItemCount: covenantItems.length - safeCovenantItemCount,
    evidenceRequirementCount: evidenceRequirements.length,
    riskCheckCount: riskChecks.length,
    ownerApprovalGateCount: ownerApprovalGates.length,
    validationFailedCount: checks.filter((check) => !check.passed).length,
    blockers,
    freeCoreCovenantCheckpointHash: sha256(checkpoint),
    ...boundaries,
    checks,
    covenantItems,
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
  writeText(markdownPath, renderFreeCoreCovenantCheckpointMarkdownV1(result));
  appendJsonl(historyPath, {
    createdAt: result.createdAt,
    phaseId: result.phaseId,
    status: result.status,
    freeCoreCovenantCheckpointStatus: result.freeCoreCovenantCheckpointStatus,
    validationFailedCount: result.validationFailedCount,
    freeCoreCovenantCheckpointHash: result.freeCoreCovenantCheckpointHash,
  });
  appendJsonl(eventPath, {
    createdAt: result.createdAt,
    event: "phase45_free_core_covenant_checkpoint_inspected",
    status: result.status,
    freeCoreCovenantCheckpointStatus: result.freeCoreCovenantCheckpointStatus,
  });

  return result;
}
