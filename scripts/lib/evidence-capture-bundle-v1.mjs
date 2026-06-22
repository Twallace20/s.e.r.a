import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const RUNTIME_DIR = ".sera-evidence-capture-bundle";
const REPORT_DIR = "reports";
const EVENTS_FILE = "events.jsonl";
const SUMMARY_JSON = "evidence-capture-bundle-summary.json";
const SUMMARY_MD = "evidence-capture-bundle-summary.md";
const HISTORY_JSONL = "evidence-capture-bundle-history.jsonl";

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

function uniqueStrings(values) {
  return Array.from(new Set((values || []).filter((value) => typeof value === "string" && value.trim())));
}

function makeCheck(id, passed, message, severity = "blocker") {
  return {
    id,
    passed: Boolean(passed),
    severity,
    message,
  };
}

function normalizeEvidenceItem(item) {
  if (typeof item === "string") {
    return {
      id: item.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      label: item,
      source: "operator-supplied evidence placeholder",
      required: true,
      ownerReviewRequired: true,
      commandExecutionAllowed: false,
      sourceMutationAllowed: false,
      remoteExecutionAllowed: false,
      storesSecrets: false,
      redactionRequired: true,
    };
  }

  const label = String(item?.label || item?.id || "");
  return {
    id: String(item?.id || label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")),
    label,
    source: String(item?.source || "operator-supplied evidence placeholder"),
    category: String(item?.category || "phase-run-evidence"),
    required: item?.required === true,
    ownerReviewRequired: item?.ownerReviewRequired === true,
    commandExecutionAllowed: item?.commandExecutionAllowed === true,
    sourceMutationAllowed: item?.sourceMutationAllowed === true,
    remoteExecutionAllowed: item?.remoteExecutionAllowed === true,
    storesSecrets: item?.storesSecrets === true,
    redactionRequired: item?.redactionRequired !== false,
  };
}

function evidenceItemIsSafe(item) {
  const reasons = [];
  if (!item.id) reasons.push("evidence item id is required");
  if (!item.label) reasons.push("evidence item label is required");
  if (item.required !== true) reasons.push("evidence item must be required");
  if (item.ownerReviewRequired !== true) reasons.push("owner review must be required for evidence item");
  if (item.commandExecutionAllowed !== false) reasons.push("evidence item must not allow command execution");
  if (item.sourceMutationAllowed !== false) reasons.push("evidence item must not allow source mutation");
  if (item.remoteExecutionAllowed !== false) reasons.push("evidence item must not allow remote execution");
  if (item.storesSecrets !== false) reasons.push("evidence item must not store secrets");
  if (item.redactionRequired !== true) reasons.push("evidence item must require redaction review");
  return {
    allowed: reasons.length === 0,
    reasons,
  };
}

export function createDefaultEvidenceCaptureBundleV1() {
  const evidenceItems = [
    ["clean-main-preflight", "Clean main preflight snapshot", "git-status-summary placeholder"],
    ["phase-packet-link", "Phase packet lineage link", "phase packet report placeholder"],
    ["branch-proposal-link", "Branch proposal summary link", "branch proposal report placeholder"],
    ["branch-readiness-link", "Branch readiness inspector report link", "branch readiness report placeholder"],
    ["remote-runner-blueprint-link", "Remote phase runner blueprint report link", "remote runner blueprint placeholder"],
    ["owner-approval-queue-link", "Owner approval queue report link", "owner approval queue placeholder"],
    ["self-hosted-adapter-link", "Self-hosted runner adapter contract report link", "self-hosted adapter placeholder"],
    ["command-allowlist-link", "Command allowlist gate report link", "command allowlist gate placeholder"],
    ["validation-command-plan", "Validation command sequence plan", "validation command plan placeholder"],
    ["test-output-summary", "Test output summary", "test output placeholder"],
    ["certification-output-summary", "Certification output summary", "certification placeholder"],
    ["full-verify-output-summary", "Full verify output summary", "verify output placeholder"],
    ["artifact-hash-summary", "Artifact hash summary", "hash summary placeholder"],
    ["emergency-stop-confirmation", "Emergency stop confirmation", "emergency stop placeholder"],
    ["session-lock-confirmation", "Session lock confirmation", "session lock placeholder"],
    ["owner-review-handoff", "Owner review handoff summary", "owner handoff placeholder"],
  ].map(([id, label, source]) => ({
    id,
    label,
    source,
    category: "phase-run-evidence",
    required: true,
    ownerReviewRequired: true,
    commandExecutionAllowed: false,
    sourceMutationAllowed: false,
    remoteExecutionAllowed: false,
    storesSecrets: false,
    redactionRequired: true,
  }));

  return {
    schemaVersion: 1,
    bundleId: "phase39_evidence_capture_bundle_plan",
    phaseId: "phase-39-evidence-capture-bundle-v1",
    phaseNumber: 39,
    title: "Evidence Capture Bundle v1",
    branchName: "phase-39-evidence-capture-bundle-v1",
    sourcePhaseIds: [
      "phase-35-remote-phase-runner-blueprint-v1",
      "phase-36-owner-approval-queue-v1",
      "phase-37-self-hosted-runner-adapter-v1",
      "phase-38-command-allowlist-gate-v1",
    ],
    declaredPaths: [
      "docs/phases/PHASE_39_EVIDENCE_CAPTURE_BUNDLE_V1.md",
      "scripts/lib/evidence-capture-bundle-v1.mjs",
      "scripts/run-evidence-capture-bundle-v1.mjs",
      "tests/integration/evidence-capture-bundle-v1.test.ts",
    ],
    declaredFileStates: {
      "docs/phases/PHASE_39_EVIDENCE_CAPTURE_BUNDLE_V1.md": "new",
      "scripts/lib/evidence-capture-bundle-v1.mjs": "new",
      "scripts/run-evidence-capture-bundle-v1.mjs": "new",
      "tests/integration/evidence-capture-bundle-v1.test.ts": "new",
    },
    validationCommands: [
      "npm run phase39:demo",
      "npm run phase39:verify",
      "npm run hygiene",
      "npm run build",
      "npm test",
      "npm run certify",
      "npm run verify",
    ],
    evidenceItems,
    evidenceRequirements: [
      "phase39 demo output includes evidence bundle status",
      "phase39 verify output passes free-core and knowledge checks",
      "source hygiene passes",
      "runtime artifact hygiene passes",
      "TypeScript build passes",
      "Vitest suite passes",
      "certification passes",
      "full verify passes",
      "evidence bundle JSON report is written",
      "evidence bundle Markdown report is written",
      "evidence bundle history is appended",
      "every evidence item requires owner review",
      "every evidence item disables command execution",
      "every evidence item disables source mutation",
      "every evidence item disables remote execution",
      "every evidence item requires redaction review",
    ],
    riskChecks: [
      "evidence capture bundle is local-only",
      "evidence capture bundle is bundle-only",
      "evidence capture does not execute commands",
      "evidence capture does not activate a runner",
      "evidence capture does not connect to cloud",
      "evidence capture does not require secrets",
      "evidence capture does not mutate source",
      "evidence capture does not create branches",
      "evidence capture does not apply patches",
      "evidence capture does not open pull requests",
      "evidence capture does not merge branches",
      "evidence capture does not tag releases",
      "evidence capture does not delete branches",
      "evidence capture does not record owner decisions",
      "owner approval queue binding is required",
      "command allowlist binding is required",
      "emergency stop binding is required",
      "session lock binding is required",
    ],
    ownerApprovalGates: [
      "owner approval required for evidence bundle schema changes",
      "owner approval required for evidence item addition",
      "owner approval required for evidence acceptance",
      "owner approval required for runner evidence handoff",
      "owner approval required for redaction policy changes",
      "owner approval required for emergency stop release",
    ],
    localOnly: true,
    bundleOnly: true,
    evidenceCaptureBundleOnly: true,
    evidenceCaptureOnly: true,
    evidenceItemRedactionRequired: true,
    commandExecutionAllowed: false,
    arbitraryCommandExecutionAllowed: false,
    shellExpansionAllowed: false,
    shellChainingAllowed: false,
    remoteExecutionAllowed: false,
    executionAllowedAfterApproval: false,
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
    acceptsEvidenceAsOwnerApproved: false,
    selfApprovesPlan: false,
    selfApprovalAllowed: false,
    ownerDecisionRequired: true,
    emergencyStopRequired: true,
    sessionLockRequired: true,
    approvalQueueBindingRequired: true,
    commandAllowlistRequired: true,
    evidenceCaptureRequired: true,
    ownerApprovalRequiredForEvidenceBundleSchemaChanges: true,
    ownerApprovalRequiredForEvidenceItemAddition: true,
    ownerApprovalRequiredForEvidenceAcceptance: true,
    ownerApprovalRequiredForRunnerEvidenceHandoff: true,
    ownerApprovalRequiredForRedactionPolicyChanges: true,
    ownerApprovalRequiredForEmergencyStopRelease: true,
    proposalActivationAllowed: false,
  };
}

export function inspectEvidenceCaptureBundleV1(bundle = createDefaultEvidenceCaptureBundleV1(), options = {}) {
  const rootDir = options.rootDir || process.cwd();
  const runtimeDir = path.join(rootDir, RUNTIME_DIR);
  const reportDir = path.join(runtimeDir, REPORT_DIR);
  const eventPath = path.join(runtimeDir, EVENTS_FILE);
  const jsonPath = path.join(reportDir, SUMMARY_JSON);
  const markdownPath = path.join(reportDir, SUMMARY_MD);
  const historyPath = path.join(reportDir, HISTORY_JSONL);

  ensureDir(reportDir);

  const declaredPaths = uniqueStrings(bundle.declaredPaths);
  const validationCommands = uniqueStrings(bundle.validationCommands);
  const evidenceItems = (bundle.evidenceItems || []).map(normalizeEvidenceItem);
  const evidenceDecisions = evidenceItems.map((item) => ({
    ...item,
    decision: evidenceItemIsSafe(item),
  }));
  const evidenceRequirements = uniqueStrings(bundle.evidenceRequirements);
  const riskChecks = uniqueStrings(bundle.riskChecks);
  const ownerApprovalGates = uniqueStrings(bundle.ownerApprovalGates);
  const sourcePhaseIds = uniqueStrings(bundle.sourcePhaseIds);
  const declaredFileStates = bundle.declaredFileStates || {};

  const checks = [];
  const expectedPaths = [
    "docs/phases/PHASE_39_EVIDENCE_CAPTURE_BUNDLE_V1.md",
    "scripts/lib/evidence-capture-bundle-v1.mjs",
    "scripts/run-evidence-capture-bundle-v1.mjs",
    "tests/integration/evidence-capture-bundle-v1.test.ts",
  ];
  const requiredCommands = [
    "npm run phase39:demo",
    "npm run phase39:verify",
    "npm run hygiene",
    "npm run build",
    "npm test",
    "npm run certify",
    "npm run verify",
  ];
  const expectedEvidenceItemIds = [
    "clean-main-preflight",
    "phase-packet-link",
    "branch-proposal-link",
    "branch-readiness-link",
    "remote-runner-blueprint-link",
    "owner-approval-queue-link",
    "self-hosted-adapter-link",
    "command-allowlist-link",
    "validation-command-plan",
    "test-output-summary",
    "certification-output-summary",
    "full-verify-output-summary",
    "artifact-hash-summary",
    "emergency-stop-confirmation",
    "session-lock-confirmation",
    "owner-review-handoff",
  ];
  const expectedOwnerGates = [
    "owner approval required for evidence bundle schema changes",
    "owner approval required for evidence item addition",
    "owner approval required for evidence acceptance",
    "owner approval required for runner evidence handoff",
    "owner approval required for redaction policy changes",
    "owner approval required for emergency stop release",
  ];

  checks.push(makeCheck("phase-id", bundle.phaseId === "phase-39-evidence-capture-bundle-v1", "Phase id must be phase-39-evidence-capture-bundle-v1."));
  checks.push(makeCheck("phase-number", bundle.phaseNumber === 39, "Phase number must be 39."));
  checks.push(makeCheck("bundle-id", Boolean(bundle.bundleId), "Evidence capture bundle must have a bundle id."));
  checks.push(makeCheck("branch-name-format", /^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(bundle.branchName || ""), "Evidence bundle branch name must use safe lowercase kebab-case."));
  checks.push(makeCheck("source-phase-35", sourcePhaseIds.includes("phase-35-remote-phase-runner-blueprint-v1"), "Evidence bundle must preserve Phase 35 remote runner blueprint lineage."));
  checks.push(makeCheck("source-phase-36", sourcePhaseIds.includes("phase-36-owner-approval-queue-v1"), "Evidence bundle must preserve Phase 36 owner approval queue lineage."));
  checks.push(makeCheck("source-phase-37", sourcePhaseIds.includes("phase-37-self-hosted-runner-adapter-v1"), "Evidence bundle must preserve Phase 37 self-hosted runner adapter lineage."));
  checks.push(makeCheck("source-phase-38", sourcePhaseIds.includes("phase-38-command-allowlist-gate-v1"), "Evidence bundle must preserve Phase 38 command allowlist gate lineage."));

  for (const expectedPath of expectedPaths) {
    checks.push(makeCheck(`declared-path:${expectedPath}`, declaredPaths.includes(expectedPath), `Declared paths must include ${expectedPath}.`));
  }

  for (const declaredPath of declaredPaths) {
    const safe = isSafeRelativePath(declaredPath);
    checks.push(makeCheck(`path-safe:${declaredPath}`, safe, `Declared path must be safe and relative: ${declaredPath}`));
    const state = declaredFileStates[declaredPath];
    const exists = safe ? fs.existsSync(path.join(rootDir, declaredPath)) : false;
    const intentionallyNew = state === "new";
    checks.push(makeCheck(`path-state:${declaredPath}`, exists || intentionallyNew, `Declared path must exist or be marked intentionally new: ${declaredPath}`));
  }

  for (const command of requiredCommands) {
    checks.push(makeCheck(`validation-command:${command}`, validationCommands.includes(command), `Validation commands must include: ${command}`));
  }

  for (const evidenceId of expectedEvidenceItemIds) {
    checks.push(makeCheck(`evidence-item:${evidenceId}`, evidenceItems.some((item) => item.id === evidenceId), `Evidence item is required: ${evidenceId}`));
  }

  for (const item of evidenceDecisions) {
    checks.push(makeCheck(`evidence-safe:${item.id}`, item.decision.allowed, `Evidence item must pass Phase 39 safety checks: ${item.id}${item.decision.reasons.length ? ` (${item.decision.reasons.join("; ")})` : ""}`));
    checks.push(makeCheck(`evidence-required:${item.id}`, item.required === true, `Evidence item must be required: ${item.id}`));
    checks.push(makeCheck(`evidence-owner-review:${item.id}`, item.ownerReviewRequired === true, `Owner review must be required for evidence item: ${item.id}`));
    checks.push(makeCheck(`evidence-no-command-execution:${item.id}`, item.commandExecutionAllowed === false, `Command execution must remain disabled for evidence item: ${item.id}`));
    checks.push(makeCheck(`evidence-no-source-mutation:${item.id}`, item.sourceMutationAllowed === false, `Source mutation must remain disabled for evidence item: ${item.id}`));
    checks.push(makeCheck(`evidence-no-remote-execution:${item.id}`, item.remoteExecutionAllowed === false, `Remote execution must remain disabled for evidence item: ${item.id}`));
    checks.push(makeCheck(`evidence-no-secret-storage:${item.id}`, item.storesSecrets === false, `Secret storage must remain disabled for evidence item: ${item.id}`));
    checks.push(makeCheck(`evidence-redaction:${item.id}`, item.redactionRequired === true, `Redaction review must be required for evidence item: ${item.id}`));
  }

  checks.push(makeCheck("evidence-item-count", evidenceItems.length >= 16, "At least 16 evidence items are required."));
  checks.push(makeCheck("evidence-count", evidenceRequirements.length >= 12, "At least 12 evidence requirements are required."));
  checks.push(makeCheck("risk-count", riskChecks.length >= 12, "At least 12 risk checks are required."));
  checks.push(makeCheck("owner-gate-count", ownerApprovalGates.length >= 6, "At least six owner approval gates are required."));

  for (const gateName of expectedOwnerGates) {
    checks.push(makeCheck(`owner-gate:${gateName}`, ownerApprovalGates.includes(gateName), `Owner gate is required: ${gateName}`));
  }

  const falseBoundaryFields = [
    "commandExecutionAllowed",
    "arbitraryCommandExecutionAllowed",
    "shellExpansionAllowed",
    "shellChainingAllowed",
    "remoteExecutionAllowed",
    "executionAllowedAfterApproval",
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
    "acceptsEvidenceAsOwnerApproved",
    "selfApprovesPlan",
    "selfApprovalAllowed",
    "proposalActivationAllowed",
  ];

  for (const field of falseBoundaryFields) {
    checks.push(makeCheck(`boundary:${field}`, bundle[field] === false, `${field} must remain false in Phase 39.`));
  }

  const trueRequiredFields = [
    "localOnly",
    "bundleOnly",
    "evidenceCaptureBundleOnly",
    "evidenceCaptureOnly",
    "evidenceItemRedactionRequired",
    "ownerDecisionRequired",
    "emergencyStopRequired",
    "sessionLockRequired",
    "approvalQueueBindingRequired",
    "commandAllowlistRequired",
    "evidenceCaptureRequired",
    "ownerApprovalRequiredForEvidenceBundleSchemaChanges",
    "ownerApprovalRequiredForEvidenceItemAddition",
    "ownerApprovalRequiredForEvidenceAcceptance",
    "ownerApprovalRequiredForRunnerEvidenceHandoff",
    "ownerApprovalRequiredForRedactionPolicyChanges",
    "ownerApprovalRequiredForEmergencyStopRelease",
  ];

  for (const field of trueRequiredFields) {
    checks.push(makeCheck(`required:${field}`, bundle[field] === true, `${field} must remain true in Phase 39.`));
  }

  const validationFailed = checks.filter((check) => !check.passed);
  const blockers = validationFailed.filter((check) => check.severity === "blocker").map((check) => check.message);
  const warnings = validationFailed.filter((check) => check.severity !== "blocker").map((check) => check.message);
  const ok = blockers.length === 0;
  const acceptedEvidenceItemCount = evidenceDecisions.filter((item) => item.decision.allowed).length;
  const rejectedEvidenceItemCount = evidenceDecisions.length - acceptedEvidenceItemCount;

  const summary = {
    ok,
    status: ok ? "passed" : "blocked",
    evidenceBundleStatus: ok ? "ready" : "blocked",
    bundleId: bundle.bundleId,
    bundleHash: sha256(bundle),
    phaseId: bundle.phaseId,
    branchName: bundle.branchName,
    declaredFileCount: declaredPaths.length,
    validationCommandCount: validationCommands.length,
    evidenceItemCount: evidenceItems.length,
    acceptedEvidenceItemCount,
    rejectedEvidenceItemCount,
    evidenceRequirementCount: evidenceRequirements.length,
    riskCheckCount: riskChecks.length,
    ownerApprovalGateCount: ownerApprovalGates.length,
    validationCheckCount: checks.length,
    validationPassedCount: checks.length - validationFailed.length,
    validationFailedCount: validationFailed.length,
    blockers,
    warnings,
    localOnly: bundle.localOnly,
    bundleOnly: bundle.bundleOnly,
    evidenceCaptureBundleOnly: bundle.evidenceCaptureBundleOnly,
    evidenceCaptureOnly: bundle.evidenceCaptureOnly,
    evidenceItemRedactionRequired: bundle.evidenceItemRedactionRequired,
    commandExecutionAllowed: bundle.commandExecutionAllowed,
    arbitraryCommandExecutionAllowed: bundle.arbitraryCommandExecutionAllowed,
    remoteExecutionAllowed: bundle.remoteExecutionAllowed,
    runnerConnectivityAllowed: bundle.runnerConnectivityAllowed,
    usesSelfHostedRunner: bundle.usesSelfHostedRunner,
    selfHostedRunnerActivated: bundle.selfHostedRunnerActivated,
    requiresSecrets: bundle.requiresSecrets,
    mutatesSource: bundle.mutatesSource,
    executesRemoteCommands: bundle.executesRemoteCommands,
    recordsOwnerDecision: bundle.recordsOwnerDecision,
    acceptsEvidenceAsOwnerApproved: bundle.acceptsEvidenceAsOwnerApproved,
    selfApprovesPlan: bundle.selfApprovesPlan,
    ownerDecisionRequired: bundle.ownerDecisionRequired,
    emergencyStopRequired: bundle.emergencyStopRequired,
    sessionLockRequired: bundle.sessionLockRequired,
    approvalQueueBindingRequired: bundle.approvalQueueBindingRequired,
    commandAllowlistRequired: bundle.commandAllowlistRequired,
    evidenceCaptureRequired: bundle.evidenceCaptureRequired,
    declaredPaths,
    validationCommands,
    evidenceDecisions,
    checks,
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

  writeJson(jsonPath, summary);
  appendJsonl(historyPath, summary);
  appendJsonl(eventPath, {
    type: "phase39.evidence_capture_bundle.inspected",
    createdAt: nowIso(),
    ok: summary.ok,
    bundleId: summary.bundleId,
    evidenceBundleStatus: summary.evidenceBundleStatus,
    validationFailedCount: summary.validationFailedCount,
  });
  writeText(markdownPath, renderEvidenceCaptureMarkdownV1(summary));

  return summary;
}

export function renderEvidenceCaptureMarkdownV1(summary) {
  const lines = [];
  lines.push("# S.E.R.A. Phase 39 Evidence Capture Bundle v1");
  lines.push("");
  lines.push(`- Status: ${summary.status}`);
  lines.push(`- Evidence bundle status: ${summary.evidenceBundleStatus}`);
  lines.push(`- Bundle ID: ${summary.bundleId}`);
  lines.push(`- Phase ID: ${summary.phaseId}`);
  lines.push(`- Branch: ${summary.branchName}`);
  lines.push(`- Evidence items: ${summary.evidenceItemCount}`);
  lines.push(`- Accepted evidence items: ${summary.acceptedEvidenceItemCount}`);
  lines.push(`- Rejected evidence items: ${summary.rejectedEvidenceItemCount}`);
  lines.push(`- Validation checks: ${summary.validationPassedCount}/${summary.validationCheckCount}`);
  lines.push(`- Blockers: ${summary.blockers.length}`);
  lines.push("");
  lines.push("## Safety boundaries");
  lines.push("");
  lines.push(`- Local only: ${summary.localOnly}`);
  lines.push(`- Bundle only: ${summary.bundleOnly}`);
  lines.push(`- Evidence capture only: ${summary.evidenceCaptureOnly}`);
  lines.push(`- Command execution allowed: ${summary.commandExecutionAllowed}`);
  lines.push(`- Remote execution allowed: ${summary.remoteExecutionAllowed}`);
  lines.push(`- Runner connectivity allowed: ${summary.runnerConnectivityAllowed}`);
  lines.push(`- Requires secrets: ${summary.requiresSecrets}`);
  lines.push(`- Mutates source: ${summary.mutatesSource}`);
  lines.push(`- Records owner decision: ${summary.recordsOwnerDecision}`);
  lines.push(`- Accepts evidence as owner approved: ${summary.acceptsEvidenceAsOwnerApproved}`);
  lines.push(`- Self-approves plan: ${summary.selfApprovesPlan}`);
  lines.push("");
  lines.push("## Evidence items");
  lines.push("");
  for (const item of summary.evidenceDecisions) {
    lines.push(`- ${item.id}: ${item.label} — ${item.decision.allowed ? "safe" : "blocked"}`);
  }
  if (summary.blockers.length) {
    lines.push("");
    lines.push("## Blockers");
    lines.push("");
    for (const blocker of summary.blockers) lines.push(`- ${blocker}`);
  }
  lines.push("");
  return `${lines.join("\n")}\n`;
}
