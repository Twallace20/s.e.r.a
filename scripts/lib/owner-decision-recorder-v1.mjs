import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const RUNTIME_DIR = ".sera-owner-decision-recorder";
const REPORT_DIR = "reports";
const EVENTS_FILE = "events.jsonl";
const SUMMARY_JSON = "owner-decision-recorder-summary.json";
const SUMMARY_MD = "owner-decision-recorder-summary.md";
const HISTORY_JSONL = "owner-decision-recorder-history.jsonl";

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
  return {
    id,
    passed: Boolean(passed),
    severity,
    message,
  };
}

function uniqueStrings(values) {
  return Array.from(new Set((values || []).filter((value) => typeof value === "string" && value.trim())));
}

function normalizeOwnerDecisionEntry(entry) {
  if (typeof entry === "string") {
    return {
      id: entry.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      label: entry,
      targetAction: entry,
      decisionStatus: "approved",
      ownerIdentity: "local-owner",
      ownerDecisionRecorded: true,
      explicitOwnerDecisionPhrase: "OWNER DECISION RECORDED",
      reason: "Default Phase 41 owner-decision fixture.",
      evidenceReferences: ["phase41-default-evidence"],
      queueReferenceRequired: true,
      evidenceBundleReferenceRequired: true,
      redactionReviewRequired: true,
      immutableAuditTrailRequired: true,
      selfApproved: false,
      executesAfterDecision: false,
      mutatesSourceAfterDecision: false,
      createsBranchesAfterDecision: false,
      appliesPatchesAfterDecision: false,
      mergesAfterDecision: false,
      storesSecrets: false,
    };
  }

  const label = String(entry?.label || entry?.id || entry?.targetAction || "");
  return {
    id: String(entry?.id || label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")),
    label,
    targetAction: String(entry?.targetAction || label),
    decisionStatus: String(entry?.decisionStatus || "pending"),
    ownerIdentity: String(entry?.ownerIdentity || ""),
    ownerDecisionRecorded: entry?.ownerDecisionRecorded === true,
    explicitOwnerDecisionPhrase: String(entry?.explicitOwnerDecisionPhrase || ""),
    reason: String(entry?.reason || ""),
    evidenceReferences: uniqueStrings(entry?.evidenceReferences || []),
    queueReferenceRequired: entry?.queueReferenceRequired !== false,
    evidenceBundleReferenceRequired: entry?.evidenceBundleReferenceRequired !== false,
    redactionReviewRequired: entry?.redactionReviewRequired !== false,
    immutableAuditTrailRequired: entry?.immutableAuditTrailRequired !== false,
    selfApproved: entry?.selfApproved === true,
    executesAfterDecision: entry?.executesAfterDecision === true,
    mutatesSourceAfterDecision: entry?.mutatesSourceAfterDecision === true,
    createsBranchesAfterDecision: entry?.createsBranchesAfterDecision === true,
    appliesPatchesAfterDecision: entry?.appliesPatchesAfterDecision === true,
    mergesAfterDecision: entry?.mergesAfterDecision === true,
    storesSecrets: entry?.storesSecrets === true,
  };
}

const ACCEPTED_DECISION_STATUSES = new Set(["approved", "rejected", "needs_changes"]);

function ownerDecisionEntryIsSafe(entry) {
  const reasons = [];
  if (!entry.id) reasons.push("owner decision entry id is required");
  if (!entry.label) reasons.push("owner decision entry label is required");
  if (!entry.targetAction) reasons.push("owner decision target action is required");
  if (!ACCEPTED_DECISION_STATUSES.has(entry.decisionStatus)) reasons.push("owner decision status must be approved, rejected, or needs_changes");
  if (!entry.ownerIdentity) reasons.push("owner identity is required");
  if (entry.ownerDecisionRecorded !== true) reasons.push("owner decision must be explicitly recorded by owner");
  if (entry.explicitOwnerDecisionPhrase !== "OWNER DECISION RECORDED") reasons.push("explicit owner decision phrase is required");
  if (!entry.reason) reasons.push("owner decision reason is required");
  if (entry.evidenceReferences.length < 1) reasons.push("at least one evidence reference is required");
  if (entry.queueReferenceRequired !== true) reasons.push("approval queue reference must be required");
  if (entry.evidenceBundleReferenceRequired !== true) reasons.push("evidence bundle reference must be required");
  if (entry.redactionReviewRequired !== true) reasons.push("redaction review must be required");
  if (entry.immutableAuditTrailRequired !== true) reasons.push("immutable audit trail must be required");
  if (entry.selfApproved !== false) reasons.push("self approval must be blocked");
  if (entry.executesAfterDecision !== false) reasons.push("execution after decision must remain disabled");
  if (entry.mutatesSourceAfterDecision !== false) reasons.push("source mutation after decision must remain disabled");
  if (entry.createsBranchesAfterDecision !== false) reasons.push("branch creation after decision must remain disabled");
  if (entry.appliesPatchesAfterDecision !== false) reasons.push("patch application after decision must remain disabled");
  if (entry.mergesAfterDecision !== false) reasons.push("merge after decision must remain disabled");
  if (entry.storesSecrets !== false) reasons.push("secret storage must remain disabled");
  return {
    allowed: reasons.length === 0,
    reasons,
  };
}

export function createDefaultOwnerDecisionRecorderV1() {
  const ownerDecisionEntries = [
    ["overnight-worker-activation", "Overnight worker activation", "approved"],
    ["phase-packet-selection", "Phase packet selection", "approved"],
    ["branch-proposal-selection", "Branch proposal selection", "approved"],
    ["branch-readiness-acceptance", "Branch readiness acceptance", "approved"],
    ["command-sequence-acceptance", "Command sequence acceptance", "needs_changes"],
    ["evidence-bundle-acceptance", "Evidence bundle acceptance", "approved"],
    ["owner-review-handoff", "Owner review handoff", "approved"],
    ["emergency-stop-release", "Emergency stop release", "rejected"],
  ].map(([id, label, decisionStatus]) => ({
    id,
    label,
    targetAction: label,
    decisionStatus,
    ownerIdentity: "local-owner",
    ownerDecisionRecorded: true,
    explicitOwnerDecisionPhrase: "OWNER DECISION RECORDED",
    reason: `Phase 41 records the local owner decision for ${label} without enabling execution.`,
    evidenceReferences: [
      "owner-approval-queue-summary.json",
      "evidence-capture-bundle-summary.json",
    ],
    queueReferenceRequired: true,
    evidenceBundleReferenceRequired: true,
    redactionReviewRequired: true,
    immutableAuditTrailRequired: true,
    selfApproved: false,
    executesAfterDecision: false,
    mutatesSourceAfterDecision: false,
    createsBranchesAfterDecision: false,
    appliesPatchesAfterDecision: false,
    mergesAfterDecision: false,
    storesSecrets: false,
  }));

  return {
    schemaVersion: 1,
    recorderId: "phase41_owner_decision_recorder",
    phaseId: "phase-41-owner-decision-recorder-v1",
    phaseNumber: 41,
    title: "Owner Decision Recorder v1",
    branchName: "phase-41-owner-decision-recorder-v1",
    sourcePhaseIds: [
      "phase-36-owner-approval-queue-v1",
      "phase-39-evidence-capture-bundle-v1",
      "phase-40-overnight-branch-worker-v1",
    ],
    declaredPaths: [
      "docs/phases/PHASE_41_OWNER_DECISION_RECORDER_V1.md",
      "scripts/lib/owner-decision-recorder-v1.mjs",
      "scripts/run-owner-decision-recorder-v1.mjs",
      "tests/integration/owner-decision-recorder-v1.test.ts",
    ],
    declaredFileStates: {
      "docs/phases/PHASE_41_OWNER_DECISION_RECORDER_V1.md": "new",
      "scripts/lib/owner-decision-recorder-v1.mjs": "new",
      "scripts/run-owner-decision-recorder-v1.mjs": "new",
      "tests/integration/owner-decision-recorder-v1.test.ts": "new",
    },
    validationCommands: [
      "npm run phase41:demo",
      "npm run phase41:verify",
      "npm run hygiene",
      "npm run build",
      "npm test",
      "npm run certify",
      "npm run verify",
    ],
    ownerDecisionEntries,
    evidenceRequirements: [
      "phase41 demo output includes owner decision recorder status",
      "phase41 verify output passes free-core and knowledge checks",
      "source hygiene passes",
      "runtime artifact hygiene passes",
      "TypeScript build passes",
      "Vitest suite passes",
      "certification passes",
      "full verify passes",
      "owner decision recorder JSON report is written",
      "owner decision recorder Markdown report is written",
      "owner decision recorder history is appended",
      "approval queue reference is captured",
      "evidence bundle reference is captured",
      "redaction review requirement is captured",
      "owner identity requirement is captured",
      "explicit owner decision phrase requirement is captured",
      "execution remains disabled after recorded decisions",
      "self-approval remains blocked",
    ],
    riskChecks: [
      "owner decision recorder remains local-only",
      "owner decision recorder remains recorder-only",
      "owner decisions require explicit owner identity",
      "owner decisions require an evidence reference",
      "owner decisions require approval queue linkage",
      "owner decisions require evidence bundle linkage",
      "owner decisions require redaction review",
      "recorded decisions cannot activate execution",
      "recorded decisions cannot create branches",
      "recorded decisions cannot apply patches",
      "recorded decisions cannot merge branches",
      "recorded decisions cannot push branches",
      "recorded decisions cannot open pull requests",
      "recorded decisions cannot store secrets",
      "recorded decisions cannot release emergency stop automatically",
      "S.E.R.A. cannot self-approve decisions",
    ],
    ownerApprovalGates: [
      "owner approval required for decision recorder activation",
      "owner approval required for approval queue item selection",
      "owner approval required for evidence bundle selection",
      "owner approval required for decision identity confirmation",
      "owner approval required for decision reason acceptance",
      "owner approval required for decision status changes",
      "owner approval required for decision audit export",
      "owner approval required for emergency stop release",
    ],
    boundaries: {
      localOnly: true,
      recorderOnly: true,
      ownerDecisionRecorderOnly: true,
      recordsOwnerDecision: true,
      decisionRecordingAllowed: true,
      executionAllowedAfterApproval: false,
      decisionCanAuthorizeExecution: false,
      commandExecutionAllowed: false,
      arbitraryCommandExecutionAllowed: false,
      shellExpansionAllowed: false,
      shellChainingAllowed: false,
      remoteExecutionAllowed: false,
      overnightExecutionAllowed: false,
      workerActivationAllowed: false,
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
      acceptsEvidenceAsOwnerApproved: false,
      selfApprovesPlan: false,
      selfApprovalAllowed: false,
      proposalActivationAllowed: false,
    },
    requirements: {
      localOnly: true,
      recorderOnly: true,
      ownerDecisionRecorderOnly: true,
      ownerIdentityRequired: true,
      explicitOwnerDecisionPhraseRequired: true,
      decisionReasonRequired: true,
      approvalQueueBindingRequired: true,
      evidenceCaptureRequired: true,
      evidenceBundleBindingRequired: true,
      evidenceItemRedactionRequired: true,
      immutableAuditTrailRequired: true,
      ownerDecisionRequired: true,
      emergencyStopRequired: true,
      sessionLockRequired: true,
      commandAllowlistRequired: true,
      branchReadinessRequired: true,
      branchProposalRequired: true,
      phasePacketRequired: true,
      ownerApprovalRequiredForDecisionRecorderActivation: true,
      ownerApprovalRequiredForApprovalQueueItemSelection: true,
      ownerApprovalRequiredForEvidenceBundleSelection: true,
      ownerApprovalRequiredForDecisionIdentityConfirmation: true,
      ownerApprovalRequiredForDecisionReasonAcceptance: true,
      ownerApprovalRequiredForDecisionStatusChanges: true,
      ownerApprovalRequiredForDecisionAuditExport: true,
      ownerApprovalRequiredForEmergencyStopRelease: true,
    },
  };
}

function validateDeclaredPaths(recorder, rootDir) {
  const checks = [];
  const declaredPaths = uniqueStrings(recorder.declaredPaths || []);
  for (const declaredPath of declaredPaths) {
    const safe = isSafeRelativePath(declaredPath);
    checks.push(makeCheck(`declared-path-safe:${declaredPath}`, safe, `Declared path must be safe and relative: ${declaredPath}`));
    if (safe) {
      const exists = fs.existsSync(path.join(rootDir, declaredPath));
      checks.push(makeCheck(`declared-path-exists:${declaredPath}`, exists, `Declared path must exist: ${declaredPath}`));
    }
  }
  return checks;
}

function validateRequiredCommands(recorder) {
  const commands = uniqueStrings(recorder.validationCommands || []);
  const required = [
    "npm run phase41:demo",
    "npm run phase41:verify",
    "npm run hygiene",
    "npm run build",
    "npm test",
    "npm run certify",
    "npm run verify",
  ];
  return required.map((command) => makeCheck(
    `validation-command:${command}`,
    commands.includes(command),
    `Validation commands must include: ${command}`,
  ));
}

function validateOwnerDecisionEntries(recorder) {
  const entries = (recorder.ownerDecisionEntries || []).map(normalizeOwnerDecisionEntry);
  const checks = [];
  for (const entry of entries) {
    const safety = ownerDecisionEntryIsSafe(entry);
    checks.push(makeCheck(`owner-decision-safe:${entry.id}`, safety.allowed, `Owner decision entry must pass Phase 41 safety checks: ${entry.id}${safety.reasons.length ? ` — ${safety.reasons.join("; ")}` : ""}`));
    checks.push(makeCheck(`owner-decision-owner-identity:${entry.id}`, Boolean(entry.ownerIdentity), `Owner identity is required for decision entry: ${entry.id}`));
    checks.push(makeCheck(`owner-decision-no-self-approval:${entry.id}`, entry.selfApproved === false, `Self approval must be blocked for decision entry: ${entry.id}`));
    checks.push(makeCheck(`owner-decision-no-execution:${entry.id}`, entry.executesAfterDecision === false, `Execution after decision must remain disabled for decision entry: ${entry.id}`));
    checks.push(makeCheck(`owner-decision-no-source-mutation:${entry.id}`, entry.mutatesSourceAfterDecision === false, `Source mutation after decision must remain disabled for decision entry: ${entry.id}`));
    checks.push(makeCheck(`owner-decision-evidence:${entry.id}`, entry.evidenceReferences.length >= 1, `Evidence reference is required for decision entry: ${entry.id}`));
    checks.push(makeCheck(`owner-decision-redaction:${entry.id}`, entry.redactionReviewRequired === true, `Redaction review is required for decision entry: ${entry.id}`));
  }
  checks.push(makeCheck("owner-decision-entry-count", entries.length >= 8, "At least eight owner decision entries are required."));
  return { entries, checks };
}

function validateCounts(recorder) {
  const evidence = uniqueStrings(recorder.evidenceRequirements || []);
  const risks = uniqueStrings(recorder.riskChecks || []);
  const gates = uniqueStrings(recorder.ownerApprovalGates || []);
  const requiredGates = [
    "owner approval required for decision recorder activation",
    "owner approval required for approval queue item selection",
    "owner approval required for evidence bundle selection",
    "owner approval required for decision identity confirmation",
    "owner approval required for decision reason acceptance",
    "owner approval required for decision status changes",
    "owner approval required for decision audit export",
    "owner approval required for emergency stop release",
  ];

  return [
    makeCheck("evidence-count", evidence.length >= 12, "At least 12 evidence requirements are required."),
    makeCheck("risk-count", risks.length >= 12, "At least 12 risk checks are required."),
    makeCheck("owner-gate-count", gates.length >= 8, "At least eight owner approval gates are required."),
    ...requiredGates.map((gate) => makeCheck(`owner-gate:${gate}`, gates.includes(gate), `Owner gate is required: ${gate}`)),
  ];
}

function validateBoundaries(recorder) {
  const boundaries = recorder.boundaries || {};
  const requirements = recorder.requirements || {};
  const mustBeFalse = [
    "executionAllowedAfterApproval",
    "decisionCanAuthorizeExecution",
    "commandExecutionAllowed",
    "arbitraryCommandExecutionAllowed",
    "shellExpansionAllowed",
    "shellChainingAllowed",
    "remoteExecutionAllowed",
    "overnightExecutionAllowed",
    "workerActivationAllowed",
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
    "acceptsEvidenceAsOwnerApproved",
    "selfApprovesPlan",
    "selfApprovalAllowed",
    "proposalActivationAllowed",
  ];
  const mustBeTrue = [
    "localOnly",
    "recorderOnly",
    "ownerDecisionRecorderOnly",
    "recordsOwnerDecision",
    "decisionRecordingAllowed",
  ];
  const requiredTrue = [
    "localOnly",
    "recorderOnly",
    "ownerDecisionRecorderOnly",
    "ownerIdentityRequired",
    "explicitOwnerDecisionPhraseRequired",
    "decisionReasonRequired",
    "approvalQueueBindingRequired",
    "evidenceCaptureRequired",
    "evidenceBundleBindingRequired",
    "evidenceItemRedactionRequired",
    "immutableAuditTrailRequired",
    "ownerDecisionRequired",
    "emergencyStopRequired",
    "sessionLockRequired",
    "commandAllowlistRequired",
    "branchReadinessRequired",
    "branchProposalRequired",
    "phasePacketRequired",
    "ownerApprovalRequiredForDecisionRecorderActivation",
    "ownerApprovalRequiredForApprovalQueueItemSelection",
    "ownerApprovalRequiredForEvidenceBundleSelection",
    "ownerApprovalRequiredForDecisionIdentityConfirmation",
    "ownerApprovalRequiredForDecisionReasonAcceptance",
    "ownerApprovalRequiredForDecisionStatusChanges",
    "ownerApprovalRequiredForDecisionAuditExport",
    "ownerApprovalRequiredForEmergencyStopRelease",
  ];

  return [
    ...mustBeTrue.map((field) => makeCheck(`boundary:${field}`, boundaries[field] === true, `${field} must remain true in Phase 41.`)),
    ...mustBeFalse.map((field) => makeCheck(`boundary:${field}`, boundaries[field] === false, `${field} must remain false in Phase 41.`)),
    ...requiredTrue.map((field) => makeCheck(`required:${field}`, requirements[field] === true, `${field} must remain true in Phase 41.`)),
  ];
}

export function renderOwnerDecisionRecorderMarkdownV1(result) {
  const lines = [];
  lines.push("# S.E.R.A. Phase 41 — Owner Decision Recorder v1");
  lines.push("");
  lines.push(`- Status: ${result.status}`);
  lines.push(`- Recorder status: ${result.ownerDecisionRecorderStatus}`);
  lines.push(`- Validation failures: ${result.validationFailedCount}`);
  lines.push(`- Owner decision entries: ${result.ownerDecisionEntryCount}`);
  lines.push(`- Accepted owner decision entries: ${result.acceptedOwnerDecisionEntryCount}`);
  lines.push(`- Rejected owner decision entries: ${result.rejectedOwnerDecisionEntryCount}`);
  lines.push(`- Records owner decision: ${result.recordsOwnerDecision}`);
  lines.push(`- Decision can authorize execution: ${result.decisionCanAuthorizeExecution}`);
  lines.push(`- Execution allowed after approval: ${result.executionAllowedAfterApproval}`);
  lines.push(`- Command execution allowed: ${result.commandExecutionAllowed}`);
  lines.push(`- Remote execution allowed: ${result.remoteExecutionAllowed}`);
  lines.push(`- Mutates source: ${result.mutatesSource}`);
  lines.push(`- Self approval allowed: ${result.selfApprovalAllowed}`);
  lines.push("");
  lines.push("## Blockers");
  if (result.blockers.length === 0) {
    lines.push("");
    lines.push("None.");
  } else {
    for (const blocker of result.blockers) lines.push(`- ${blocker}`);
  }
  lines.push("");
  lines.push("## Checks");
  for (const check of result.checks) {
    lines.push(`- ${check.passed ? "PASS" : "FAIL"}: ${check.id} — ${check.message}`);
  }
  lines.push("");
  return `${lines.join("\n")}\n`;
}

export function inspectOwnerDecisionRecorderV1(recorder = createDefaultOwnerDecisionRecorderV1(), options = {}) {
  const rootDir = options.rootDir || process.cwd();
  const runtimeDir = options.runtimeDir || path.join(rootDir, RUNTIME_DIR);
  const reportDir = path.join(runtimeDir, REPORT_DIR);
  const eventPath = path.join(runtimeDir, EVENTS_FILE);
  const jsonPath = path.join(reportDir, SUMMARY_JSON);
  const markdownPath = path.join(reportDir, SUMMARY_MD);
  const historyPath = path.join(reportDir, HISTORY_JSONL);

  ensureDir(reportDir);

  const normalizedRecorder = {
    ...recorder,
    declaredPaths: uniqueStrings(recorder.declaredPaths || []),
    validationCommands: uniqueStrings(recorder.validationCommands || []),
    evidenceRequirements: uniqueStrings(recorder.evidenceRequirements || []),
    riskChecks: uniqueStrings(recorder.riskChecks || []),
    ownerApprovalGates: uniqueStrings(recorder.ownerApprovalGates || []),
  };

  const { entries: ownerDecisionEntries, checks: ownerDecisionChecks } = validateOwnerDecisionEntries(normalizedRecorder);
  const checks = [
    ...validateDeclaredPaths(normalizedRecorder, rootDir),
    ...validateRequiredCommands(normalizedRecorder),
    ...ownerDecisionChecks,
    ...validateCounts(normalizedRecorder),
    ...validateBoundaries(normalizedRecorder),
  ];

  const failures = checks.filter((check) => !check.passed);
  const blockers = failures.filter((check) => check.severity === "blocker").map((check) => check.message);
  const acceptedOwnerDecisionEntries = ownerDecisionEntries.filter((entry) => ownerDecisionEntryIsSafe(entry).allowed);
  const rejectedOwnerDecisionEntries = ownerDecisionEntries.filter((entry) => !ownerDecisionEntryIsSafe(entry).allowed);

  const result = {
    ok: failures.length === 0,
    status: failures.length === 0 ? "passed" : "failed",
    schemaVersion: 1,
    createdAt: nowIso(),
    phaseId: normalizedRecorder.phaseId,
    phaseNumber: normalizedRecorder.phaseNumber,
    ownerDecisionRecorderStatus: failures.length === 0 ? "ready" : "blocked",
    recorderHash: sha256(normalizedRecorder),
    declaredFileCount: normalizedRecorder.declaredPaths.length,
    validationCommandCount: normalizedRecorder.validationCommands.length,
    ownerDecisionEntryCount: ownerDecisionEntries.length,
    acceptedOwnerDecisionEntryCount: acceptedOwnerDecisionEntries.length,
    rejectedOwnerDecisionEntryCount: rejectedOwnerDecisionEntries.length,
    evidenceRequirementCount: normalizedRecorder.evidenceRequirements.length,
    riskCheckCount: normalizedRecorder.riskChecks.length,
    ownerApprovalGateCount: normalizedRecorder.ownerApprovalGates.length,
    validationFailedCount: failures.length,
    blockers,
    recordsOwnerDecision: normalizedRecorder.boundaries?.recordsOwnerDecision === true,
    decisionRecordingAllowed: normalizedRecorder.boundaries?.decisionRecordingAllowed === true,
    decisionCanAuthorizeExecution: normalizedRecorder.boundaries?.decisionCanAuthorizeExecution === true,
    executionAllowedAfterApproval: normalizedRecorder.boundaries?.executionAllowedAfterApproval === true,
    commandExecutionAllowed: normalizedRecorder.boundaries?.commandExecutionAllowed === true,
    remoteExecutionAllowed: normalizedRecorder.boundaries?.remoteExecutionAllowed === true,
    runnerConnectivityAllowed: normalizedRecorder.boundaries?.runnerConnectivityAllowed === true,
    requiresSecrets: normalizedRecorder.boundaries?.requiresSecrets === true,
    mutatesSource: normalizedRecorder.boundaries?.mutatesSource === true,
    recordsOwnerDecisionBoundary: normalizedRecorder.boundaries?.recordsOwnerDecision === true,
    acceptsEvidenceAsOwnerApproved: normalizedRecorder.boundaries?.acceptsEvidenceAsOwnerApproved === true,
    selfApprovesPlan: normalizedRecorder.boundaries?.selfApprovesPlan === true,
    selfApprovalAllowed: normalizedRecorder.boundaries?.selfApprovalAllowed === true,
    ownerIdentityRequired: normalizedRecorder.requirements?.ownerIdentityRequired === true,
    explicitOwnerDecisionPhraseRequired: normalizedRecorder.requirements?.explicitOwnerDecisionPhraseRequired === true,
    approvalQueueBindingRequired: normalizedRecorder.requirements?.approvalQueueBindingRequired === true,
    evidenceBundleBindingRequired: normalizedRecorder.requirements?.evidenceBundleBindingRequired === true,
    immutableAuditTrailRequired: normalizedRecorder.requirements?.immutableAuditTrailRequired === true,
    checks,
    ownerDecisionEntries,
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

  const markdown = renderOwnerDecisionRecorderMarkdownV1(result);
  writeJson(jsonPath, result);
  writeText(markdownPath, markdown);
  appendJsonl(historyPath, {
    createdAt: result.createdAt,
    phaseId: result.phaseId,
    status: result.status,
    ownerDecisionRecorderStatus: result.ownerDecisionRecorderStatus,
    validationFailedCount: result.validationFailedCount,
    recorderHash: result.recorderHash,
  });
  appendJsonl(eventPath, {
    createdAt: result.createdAt,
    event: "phase41_owner_decision_recorder_inspected",
    status: result.status,
    ownerDecisionRecorderStatus: result.ownerDecisionRecorderStatus,
  });

  return result;
}
