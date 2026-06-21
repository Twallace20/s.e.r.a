import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const RUNTIME_DIR = ".sera-command-allowlist-gate";
const REPORT_DIR = "reports";
const EVENTS_FILE = "events.jsonl";
const SUMMARY_JSON = "command-allowlist-gate-summary.json";
const SUMMARY_MD = "command-allowlist-gate-summary.md";
const HISTORY_JSONL = "command-allowlist-gate-history.jsonl";

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

function normalizeAllowlistEntry(entry) {
  if (typeof entry === "string") {
    return {
      command: entry,
      commandFamily: inferCommandFamily(entry),
      ownerApprovalRequired: true,
      evidenceRequired: true,
      executionAllowed: false,
      sourceMutationAllowed: false,
      remoteExecutionAllowed: false,
    };
  }

  return {
    command: String(entry?.command || ""),
    commandFamily: String(entry?.commandFamily || inferCommandFamily(entry?.command || "")),
    purpose: String(entry?.purpose || ""),
    ownerApprovalRequired: entry?.ownerApprovalRequired === true,
    evidenceRequired: entry?.evidenceRequired === true,
    executionAllowed: entry?.executionAllowed === true,
    sourceMutationAllowed: entry?.sourceMutationAllowed === true,
    remoteExecutionAllowed: entry?.remoteExecutionAllowed === true,
  };
}

function inferCommandFamily(command) {
  const normalized = String(command || "").trim();
  if (normalized === "npm test") return "npm-test";
  if (normalized.startsWith("npm run phase")) return "phase-validation";
  if (normalized.startsWith("npm run knowledge")) return "knowledge-validation";
  if (normalized.startsWith("npm run free-core")) return "free-core-validation";
  if (normalized.startsWith("npm run hygiene")) return "hygiene-validation";
  if (normalized.startsWith("npm run build")) return "build-validation";
  if (normalized.startsWith("npm run certify")) return "certification-validation";
  if (normalized.startsWith("npm run verify")) return "full-verification";
  return "unknown";
}

function classifyCommand(command, allowedExactCommands) {
  const normalized = String(command || "").trim();
  const reasons = [];

  if (!normalized) reasons.push("command is empty");
  if (normalized !== command) reasons.push("command must not contain leading or trailing whitespace");
  if (!allowedExactCommands.includes(normalized)) reasons.push("command is not in the Phase 38 exact allowlist");
  if (/[;&|<>`]/.test(normalized)) reasons.push("shell control characters are not allowed");
  if (/\$\(|\$\{|%[A-Za-z_]/.test(normalized)) reasons.push("shell expansion is not allowed");
  if (/\b(git|node|npx|pnpm|yarn|powershell|pwsh|cmd|bash|sh|curl|wget|ssh|scp|python|python3|perl|ruby)\b/i.test(normalized)) {
    reasons.push("direct shell, network, script, or VCS commands are not allowed in Phase 38");
  }
  if (!(/^(npm run [a-z0-9][a-z0-9:-]*|npm test)$/.test(normalized))) {
    reasons.push("command must use the approved npm validation command shape");
  }

  return {
    command: normalized,
    allowed: reasons.length === 0,
    reasons,
  };
}

export function createDefaultCommandAllowlistGateV1() {
  const allowedExactCommands = [
    "npm run phase38:demo",
    "npm run phase38:verify",
    "npm run free-core:verify",
    "npm run knowledge:verify",
    "npm run hygiene",
    "npm run build",
    "npm test",
    "npm run certify",
    "npm run verify",
  ];

  return {
    schemaVersion: 1,
    allowlistId: "phase38_command_allowlist_gate_plan",
    phaseId: "phase-38-command-allowlist-gate-v1",
    phaseNumber: 38,
    title: "Command Allowlist Gate v1",
    branchName: "phase-38-command-allowlist-gate-v1",
    sourcePhaseIds: [
      "phase-35-remote-phase-runner-blueprint-v1",
      "phase-36-owner-approval-queue-v1",
      "phase-37-self-hosted-runner-adapter-v1",
    ],
    declaredPaths: [
      "docs/phases/PHASE_38_COMMAND_ALLOWLIST_GATE_V1.md",
      "scripts/lib/command-allowlist-gate-v1.mjs",
      "scripts/run-command-allowlist-gate-v1.mjs",
      "tests/integration/command-allowlist-gate-v1.test.ts",
    ],
    declaredFileStates: {
      "docs/phases/PHASE_38_COMMAND_ALLOWLIST_GATE_V1.md": "new",
      "scripts/lib/command-allowlist-gate-v1.mjs": "new",
      "scripts/run-command-allowlist-gate-v1.mjs": "new",
      "tests/integration/command-allowlist-gate-v1.test.ts": "new",
    },
    validationCommands: [
      "npm run phase38:demo",
      "npm run phase38:verify",
      "npm run hygiene",
      "npm run build",
      "npm test",
      "npm run certify",
      "npm run verify",
    ],
    allowedExactCommands,
    commandAllowlist: allowedExactCommands.map((command) => ({
      command,
      commandFamily: inferCommandFamily(command),
      purpose: "validation-only command shape for owner-approved future runner plans",
      ownerApprovalRequired: true,
      evidenceRequired: true,
      executionAllowed: false,
      sourceMutationAllowed: false,
      remoteExecutionAllowed: false,
    })),
    evidenceRequirements: [
      "phase38 demo output includes allowlist status",
      "phase38 verify output passes free-core and knowledge checks",
      "source hygiene passes",
      "runtime artifact hygiene passes",
      "TypeScript build passes",
      "Vitest suite passes",
      "certification passes",
      "full verify passes",
      "allowlist JSON report is written",
      "allowlist Markdown report is written",
      "allowlist history is appended",
      "every allowed command is exact-match only",
      "shell control characters are rejected",
      "direct VCS, network, and script execution commands are rejected",
      "owner approval is required for allowlist changes",
      "command execution remains disabled",
    ],
    riskChecks: [
      "command allowlist gate is local-only",
      "allowlist is exact-match only",
      "shell chaining is rejected",
      "shell expansion is rejected",
      "direct VCS commands are rejected",
      "direct node or interpreter commands are rejected",
      "network commands are rejected",
      "command execution remains disabled",
      "remote execution remains disabled",
      "self-hosted runner usage remains disabled",
      "source mutation is not allowed",
      "branch creation is not performed",
      "patch application is not performed",
      "merge, tag, and cleanup actions are not performed",
      "owner approval queue binding is required",
      "evidence capture remains required",
    ],
    ownerApprovalGates: [
      "owner approval required for command allowlist changes",
      "owner approval required for exact command addition",
      "owner approval required for command family addition",
      "owner approval required for runner command activation",
      "owner approval required for validation evidence acceptance",
      "owner approval required for emergency stop release",
    ],
    localOnly: true,
    allowlistOnly: true,
    commandAllowlistGateOnly: true,
    exactMatchOnly: true,
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
    selfApprovesPlan: false,
    selfApprovalAllowed: false,
    ownerDecisionRequired: true,
    emergencyStopRequired: true,
    sessionLockRequired: true,
    approvalQueueBindingRequired: true,
    commandAllowlistRequired: true,
    evidenceCaptureRequired: true,
    ownerApprovalRequiredForCommandAllowlistChanges: true,
    ownerApprovalRequiredForExactCommandAddition: true,
    ownerApprovalRequiredForCommandFamilyAddition: true,
    ownerApprovalRequiredForRunnerCommandActivation: true,
    ownerApprovalRequiredForValidationEvidenceAcceptance: true,
    ownerApprovalRequiredForEmergencyStopRelease: true,
    proposalActivationAllowed: false,
  };
}

export function inspectCommandAllowlistGateV1(gate = createDefaultCommandAllowlistGateV1(), options = {}) {
  const rootDir = options.rootDir || process.cwd();
  const runtimeDir = path.join(rootDir, RUNTIME_DIR);
  const reportDir = path.join(runtimeDir, REPORT_DIR);
  const eventPath = path.join(runtimeDir, EVENTS_FILE);
  const jsonPath = path.join(reportDir, SUMMARY_JSON);
  const markdownPath = path.join(reportDir, SUMMARY_MD);
  const historyPath = path.join(reportDir, HISTORY_JSONL);

  ensureDir(reportDir);

  const declaredPaths = uniqueStrings(gate.declaredPaths);
  const validationCommands = uniqueStrings(gate.validationCommands);
  const allowedExactCommands = uniqueStrings(gate.allowedExactCommands);
  const commandAllowlist = (gate.commandAllowlist || []).map(normalizeAllowlistEntry);
  const commandDecisions = commandAllowlist.map((entry) => ({
    ...entry,
    decision: classifyCommand(entry.command, allowedExactCommands),
  }));
  const evidenceRequirements = uniqueStrings(gate.evidenceRequirements);
  const riskChecks = uniqueStrings(gate.riskChecks);
  const ownerApprovalGates = uniqueStrings(gate.ownerApprovalGates);
  const sourcePhaseIds = uniqueStrings(gate.sourcePhaseIds);
  const declaredFileStates = gate.declaredFileStates || {};

  const checks = [];
  const expectedPaths = [
    "docs/phases/PHASE_38_COMMAND_ALLOWLIST_GATE_V1.md",
    "scripts/lib/command-allowlist-gate-v1.mjs",
    "scripts/run-command-allowlist-gate-v1.mjs",
    "tests/integration/command-allowlist-gate-v1.test.ts",
  ];
  const requiredCommands = [
    "npm run phase38:demo",
    "npm run phase38:verify",
    "npm run hygiene",
    "npm run build",
    "npm test",
    "npm run certify",
    "npm run verify",
  ];
  const expectedAllowedCommands = [
    "npm run phase38:demo",
    "npm run phase38:verify",
    "npm run free-core:verify",
    "npm run knowledge:verify",
    "npm run hygiene",
    "npm run build",
    "npm test",
    "npm run certify",
    "npm run verify",
  ];
  const expectedOwnerGates = [
    "owner approval required for command allowlist changes",
    "owner approval required for exact command addition",
    "owner approval required for command family addition",
    "owner approval required for runner command activation",
    "owner approval required for validation evidence acceptance",
    "owner approval required for emergency stop release",
  ];

  checks.push(makeCheck("phase-id", gate.phaseId === "phase-38-command-allowlist-gate-v1", "Phase id must be phase-38-command-allowlist-gate-v1."));
  checks.push(makeCheck("phase-number", gate.phaseNumber === 38, "Phase number must be 38."));
  checks.push(makeCheck("allowlist-id", Boolean(gate.allowlistId), "Command allowlist gate must have an allowlist id."));
  checks.push(makeCheck("branch-name-format", /^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(gate.branchName || ""), "Allowlist branch name must use safe lowercase kebab-case."));
  checks.push(makeCheck("source-phase-35", sourcePhaseIds.includes("phase-35-remote-phase-runner-blueprint-v1"), "Allowlist gate must preserve Phase 35 remote runner blueprint lineage."));
  checks.push(makeCheck("source-phase-36", sourcePhaseIds.includes("phase-36-owner-approval-queue-v1"), "Allowlist gate must preserve Phase 36 owner approval queue lineage."));
  checks.push(makeCheck("source-phase-37", sourcePhaseIds.includes("phase-37-self-hosted-runner-adapter-v1"), "Allowlist gate must preserve Phase 37 self-hosted runner adapter lineage."));

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

  for (const command of expectedAllowedCommands) {
    checks.push(makeCheck(`allowed-command:${command}`, allowedExactCommands.includes(command), `Exact allowlist must include: ${command}`));
    checks.push(makeCheck(`allowlist-entry:${command}`, commandAllowlist.some((entry) => entry.command === command), `Command allowlist entry is required: ${command}`));
  }

  for (const entry of commandDecisions) {
    checks.push(makeCheck(`command-safe:${entry.command}`, entry.decision.allowed, `Command must pass Phase 38 allowlist safety checks: ${entry.command}${entry.decision.reasons.length ? ` (${entry.decision.reasons.join("; ")})` : ""}`));
    checks.push(makeCheck(`command-owner-approval:${entry.command}`, entry.ownerApprovalRequired === true, `Owner approval must be required for command: ${entry.command}`));
    checks.push(makeCheck(`command-evidence:${entry.command}`, entry.evidenceRequired === true, `Evidence must be required for command: ${entry.command}`));
    checks.push(makeCheck(`command-no-execution:${entry.command}`, entry.executionAllowed === false, `Execution must remain disabled for command: ${entry.command}`));
    checks.push(makeCheck(`command-no-source-mutation:${entry.command}`, entry.sourceMutationAllowed === false, `Source mutation must remain disabled for command: ${entry.command}`));
    checks.push(makeCheck(`command-no-remote-execution:${entry.command}`, entry.remoteExecutionAllowed === false, `Remote execution must remain disabled for command: ${entry.command}`));
  }

  checks.push(makeCheck("allowlist-count", commandAllowlist.length >= 9, "At least nine allowlist entries are required."));
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
    "selfApprovesPlan",
    "selfApprovalAllowed",
    "proposalActivationAllowed",
  ];

  for (const field of falseBoundaryFields) {
    checks.push(makeCheck(`boundary:${field}`, gate[field] === false, `${field} must remain false in Phase 38.`));
  }

  const trueRequiredFields = [
    "localOnly",
    "allowlistOnly",
    "commandAllowlistGateOnly",
    "exactMatchOnly",
    "ownerDecisionRequired",
    "emergencyStopRequired",
    "sessionLockRequired",
    "approvalQueueBindingRequired",
    "commandAllowlistRequired",
    "evidenceCaptureRequired",
    "ownerApprovalRequiredForCommandAllowlistChanges",
    "ownerApprovalRequiredForExactCommandAddition",
    "ownerApprovalRequiredForCommandFamilyAddition",
    "ownerApprovalRequiredForRunnerCommandActivation",
    "ownerApprovalRequiredForValidationEvidenceAcceptance",
    "ownerApprovalRequiredForEmergencyStopRelease",
  ];

  for (const field of trueRequiredFields) {
    checks.push(makeCheck(`required:${field}`, gate[field] === true, `${field} must remain true in Phase 38.`));
  }

  const validationFailed = checks.filter((check) => !check.passed);
  const blockers = validationFailed.filter((check) => check.severity === "blocker").map((check) => check.message);
  const warnings = validationFailed.filter((check) => check.severity !== "blocker").map((check) => check.message);
  const ok = blockers.length === 0;
  const approvedCommandCount = commandDecisions.filter((entry) => entry.decision.allowed).length;
  const rejectedCommandCount = commandDecisions.length - approvedCommandCount;

  const summary = {
    ok,
    status: ok ? "passed" : "blocked",
    allowlistStatus: ok ? "ready" : "blocked",
    allowlistId: gate.allowlistId,
    allowlistHash: sha256(gate),
    phaseId: gate.phaseId,
    branchName: gate.branchName,
    declaredFileCount: declaredPaths.length,
    validationCommandCount: validationCommands.length,
    allowlistCommandCount: commandAllowlist.length,
    approvedCommandCount,
    rejectedCommandCount,
    evidenceRequirementCount: evidenceRequirements.length,
    riskCheckCount: riskChecks.length,
    ownerApprovalGateCount: ownerApprovalGates.length,
    validationCheckCount: checks.length,
    validationPassedCount: checks.length - validationFailed.length,
    validationFailedCount: validationFailed.length,
    blockers,
    warnings,
    localOnly: gate.localOnly,
    allowlistOnly: gate.allowlistOnly,
    commandAllowlistGateOnly: gate.commandAllowlistGateOnly,
    exactMatchOnly: gate.exactMatchOnly,
    commandExecutionAllowed: gate.commandExecutionAllowed,
    arbitraryCommandExecutionAllowed: gate.arbitraryCommandExecutionAllowed,
    shellExpansionAllowed: gate.shellExpansionAllowed,
    shellChainingAllowed: gate.shellChainingAllowed,
    remoteExecutionAllowed: gate.remoteExecutionAllowed,
    runnerConnectivityAllowed: gate.runnerConnectivityAllowed,
    usesSelfHostedRunner: gate.usesSelfHostedRunner,
    selfHostedRunnerActivated: gate.selfHostedRunnerActivated,
    requiresSecrets: gate.requiresSecrets,
    mutatesSource: gate.mutatesSource,
    executesRemoteCommands: gate.executesRemoteCommands,
    selfApprovesPlan: gate.selfApprovesPlan,
    ownerDecisionRequired: gate.ownerDecisionRequired,
    emergencyStopRequired: gate.emergencyStopRequired,
    sessionLockRequired: gate.sessionLockRequired,
    approvalQueueBindingRequired: gate.approvalQueueBindingRequired,
    commandAllowlistRequired: gate.commandAllowlistRequired,
    evidenceCaptureRequired: gate.evidenceCaptureRequired,
    declaredPaths,
    validationCommands,
    allowedExactCommands,
    commandDecisions,
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
    createdAt: nowIso(),
    event: "phase38_command_allowlist_gate_inspected",
    ok: summary.ok,
    status: summary.status,
    allowlistStatus: summary.allowlistStatus,
    allowlistHash: summary.allowlistHash,
  });
  writeText(markdownPath, renderMarkdown(summary));

  return summary;
}

function renderMarkdown(summary) {
  return [
    "# S.E.R.A. Phase 38 Command Allowlist Gate v1",
    "",
    `- Status: ${summary.status}`,
    `- Allowlist Status: ${summary.allowlistStatus}`,
    `- Allowlist ID: ${summary.allowlistId}`,
    `- Phase ID: ${summary.phaseId}`,
    `- Branch Name: ${summary.branchName}`,
    `- Validation Checks: ${summary.validationPassedCount}/${summary.validationCheckCount}`,
    `- Blockers: ${summary.blockers.length}`,
    `- Exact Match Only: ${summary.exactMatchOnly}`,
    `- Command Execution Allowed: ${summary.commandExecutionAllowed}`,
    `- Arbitrary Command Execution Allowed: ${summary.arbitraryCommandExecutionAllowed}`,
    `- Shell Expansion Allowed: ${summary.shellExpansionAllowed}`,
    `- Shell Chaining Allowed: ${summary.shellChainingAllowed}`,
    `- Remote Execution Allowed: ${summary.remoteExecutionAllowed}`,
    `- Approved Commands: ${summary.approvedCommandCount}`,
    `- Rejected Commands: ${summary.rejectedCommandCount}`,
    `- Owner Decision Required: ${summary.ownerDecisionRequired}`,
    `- Emergency Stop Required: ${summary.emergencyStopRequired}`,
    `- Session Lock Required: ${summary.sessionLockRequired}`,
    "",
    "## Declared Paths",
    ...summary.declaredPaths.map((declaredPath) => `- ${declaredPath}`),
    "",
    "## Allowed Exact Commands",
    ...summary.allowedExactCommands.map((command) => `- ${command}`),
    "",
    "## Command Decisions",
    ...summary.commandDecisions.map((entry) => `- ${entry.command} — ${entry.decision.allowed ? "allowed" : "blocked"}`),
    "",
    "## Validation Commands",
    ...summary.validationCommands.map((command) => `- ${command}`),
    "",
    "## Blockers",
    ...(summary.blockers.length ? summary.blockers.map((blocker) => `- ${blocker}`) : ["- None"]),
    "",
  ].join("\n");
}
