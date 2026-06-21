import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const RUNTIME_DIR = ".sera-self-hosted-runner-adapter";
const REPORT_DIR = "reports";
const EVENTS_FILE = "events.jsonl";
const SUMMARY_JSON = "self-hosted-runner-adapter-summary.json";
const SUMMARY_MD = "self-hosted-runner-adapter-summary.md";
const HISTORY_JSONL = "self-hosted-runner-adapter-history.jsonl";

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

function normalizeAdapterStage(stage) {
  return {
    stageId: String(stage?.stageId || ""),
    name: String(stage?.name || ""),
    status: String(stage?.status || ""),
    ownerApprovalRequired: stage?.ownerApprovalRequired === true,
    executionAllowed: stage?.executionAllowed === true,
    evidenceRequired: stage?.evidenceRequired === true,
  };
}

export function createDefaultSelfHostedRunnerAdapterV1() {
  return {
    schemaVersion: 1,
    adapterId: "phase37_self_hosted_runner_adapter_plan",
    phaseId: "phase-37-self-hosted-runner-adapter-v1",
    phaseNumber: 37,
    title: "Self-Hosted Runner Adapter v1",
    branchName: "phase-37-self-hosted-runner-adapter-v1",
    sourcePhaseIds: [
      "phase-35-remote-phase-runner-blueprint-v1",
      "phase-36-owner-approval-queue-v1",
    ],
    declaredPaths: [
      "docs/phases/PHASE_37_SELF_HOSTED_RUNNER_ADAPTER_V1.md",
      "scripts/lib/self-hosted-runner-adapter-v1.mjs",
      "scripts/run-self-hosted-runner-adapter-v1.mjs",
      "tests/integration/self-hosted-runner-adapter-v1.test.ts",
    ],
    declaredFileStates: {
      "docs/phases/PHASE_37_SELF_HOSTED_RUNNER_ADAPTER_V1.md": "new",
      "scripts/lib/self-hosted-runner-adapter-v1.mjs": "new",
      "scripts/run-self-hosted-runner-adapter-v1.mjs": "new",
      "tests/integration/self-hosted-runner-adapter-v1.test.ts": "new",
    },
    validationCommands: [
      "npm run phase37:demo",
      "npm run phase37:verify",
      "npm run hygiene",
      "npm run build",
      "npm test",
      "npm run certify",
      "npm run verify",
    ],
    adapterStages: [
      {
        stageId: "adapter_contract_load",
        name: "adapter contract load",
        status: "defined_disabled",
        ownerApprovalRequired: true,
        executionAllowed: false,
        evidenceRequired: true,
      },
      {
        stageId: "runner_identity_check",
        name: "runner identity check",
        status: "defined_disabled",
        ownerApprovalRequired: true,
        executionAllowed: false,
        evidenceRequired: true,
      },
      {
        stageId: "workspace_preflight_check",
        name: "workspace preflight check",
        status: "defined_disabled",
        ownerApprovalRequired: true,
        executionAllowed: false,
        evidenceRequired: true,
      },
      {
        stageId: "approval_queue_binding",
        name: "approval queue binding",
        status: "defined_disabled",
        ownerApprovalRequired: true,
        executionAllowed: false,
        evidenceRequired: true,
      },
      {
        stageId: "command_allowlist_binding",
        name: "command allowlist binding",
        status: "defined_disabled",
        ownerApprovalRequired: true,
        executionAllowed: false,
        evidenceRequired: true,
      },
      {
        stageId: "evidence_capture_binding",
        name: "evidence capture binding",
        status: "defined_disabled",
        ownerApprovalRequired: true,
        executionAllowed: false,
        evidenceRequired: true,
      },
      {
        stageId: "emergency_stop_binding",
        name: "emergency stop binding",
        status: "defined_disabled",
        ownerApprovalRequired: true,
        executionAllowed: false,
        evidenceRequired: true,
      },
      {
        stageId: "session_lock_binding",
        name: "session lock binding",
        status: "defined_disabled",
        ownerApprovalRequired: true,
        executionAllowed: false,
        evidenceRequired: true,
      },
    ],
    evidenceRequirements: [
      "phase37 demo output includes adapter status",
      "phase37 verify output passes free-core and knowledge checks",
      "source hygiene passes",
      "runtime artifact hygiene passes",
      "TypeScript build passes",
      "Vitest suite passes",
      "certification passes",
      "full verify passes",
      "adapter JSON report is written",
      "adapter Markdown report is written",
      "adapter history is appended",
      "adapter remains disabled",
      "runner connectivity remains disabled",
      "remote command execution remains disabled",
      "owner approval queue binding is required",
      "emergency stop and session lock bindings are required",
    ],
    riskChecks: [
      "adapter contract is local-only",
      "adapter remains disabled in this phase",
      "runner connectivity is not attempted",
      "remote command execution is not allowed",
      "self-hosted runner is not activated",
      "cloud runner is not used",
      "secrets are not required",
      "source mutation is not allowed",
      "branch creation is not performed",
      "patch application is not performed",
      "merge, tag, and cleanup actions are not performed",
      "owner approval queue binding is required",
      "emergency stop binding is required",
      "session lock binding is required",
    ],
    ownerApprovalGates: [
      "owner approval required for adapter activation",
      "owner approval required for runner identity trust",
      "owner approval required for command allowlist changes",
      "owner approval required for workspace access",
      "owner approval required for evidence acceptance",
      "owner approval required for emergency stop release",
    ],
    localOnly: true,
    adapterOnly: true,
    adapterContractOnly: true,
    adapterEnabled: false,
    adapterActivationAllowed: false,
    runnerConnectivityAllowed: false,
    commandExecutionAllowed: false,
    remoteExecutionAllowed: false,
    executionAllowedAfterApproval: false,
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
    ownerApprovalRequiredForAdapterActivation: true,
    ownerApprovalRequiredForRunnerIdentityTrust: true,
    ownerApprovalRequiredForCommandAllowlistChanges: true,
    ownerApprovalRequiredForWorkspaceAccess: true,
    ownerApprovalRequiredForEvidenceAcceptance: true,
    ownerApprovalRequiredForEmergencyStopRelease: true,
    proposalActivationAllowed: false,
  };
}

export function inspectSelfHostedRunnerAdapterV1(adapter = createDefaultSelfHostedRunnerAdapterV1(), options = {}) {
  const rootDir = options.rootDir || process.cwd();
  const runtimeDir = path.join(rootDir, RUNTIME_DIR);
  const reportDir = path.join(runtimeDir, REPORT_DIR);
  const eventPath = path.join(runtimeDir, EVENTS_FILE);
  const jsonPath = path.join(reportDir, SUMMARY_JSON);
  const markdownPath = path.join(reportDir, SUMMARY_MD);
  const historyPath = path.join(reportDir, HISTORY_JSONL);

  ensureDir(reportDir);

  const declaredPaths = uniqueStrings(adapter.declaredPaths);
  const validationCommands = uniqueStrings(adapter.validationCommands);
  const adapterStages = (adapter.adapterStages || []).map(normalizeAdapterStage);
  const evidenceRequirements = uniqueStrings(adapter.evidenceRequirements);
  const riskChecks = uniqueStrings(adapter.riskChecks);
  const ownerApprovalGates = uniqueStrings(adapter.ownerApprovalGates);
  const sourcePhaseIds = uniqueStrings(adapter.sourcePhaseIds);
  const declaredFileStates = adapter.declaredFileStates || {};

  const checks = [];
  const expectedPaths = [
    "docs/phases/PHASE_37_SELF_HOSTED_RUNNER_ADAPTER_V1.md",
    "scripts/lib/self-hosted-runner-adapter-v1.mjs",
    "scripts/run-self-hosted-runner-adapter-v1.mjs",
    "tests/integration/self-hosted-runner-adapter-v1.test.ts",
  ];
  const requiredCommands = [
    "npm run phase37:demo",
    "npm run phase37:verify",
    "npm run hygiene",
    "npm run build",
    "npm test",
    "npm run certify",
    "npm run verify",
  ];
  const requiredStages = [
    "adapter contract load",
    "runner identity check",
    "workspace preflight check",
    "approval queue binding",
    "command allowlist binding",
    "evidence capture binding",
    "emergency stop binding",
    "session lock binding",
  ];
  const expectedOwnerGates = [
    "owner approval required for adapter activation",
    "owner approval required for runner identity trust",
    "owner approval required for command allowlist changes",
    "owner approval required for workspace access",
    "owner approval required for evidence acceptance",
    "owner approval required for emergency stop release",
  ];

  checks.push(makeCheck("phase-id", adapter.phaseId === "phase-37-self-hosted-runner-adapter-v1", "Phase id must be phase-37-self-hosted-runner-adapter-v1."));
  checks.push(makeCheck("phase-number", adapter.phaseNumber === 37, "Phase number must be 37."));
  checks.push(makeCheck("adapter-id", Boolean(adapter.adapterId), "Self-hosted runner adapter must have an adapter id."));
  checks.push(makeCheck("branch-name-format", /^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(adapter.branchName || ""), "Adapter branch name must use safe lowercase kebab-case."));
  checks.push(makeCheck("source-phase-35", sourcePhaseIds.includes("phase-35-remote-phase-runner-blueprint-v1"), "Adapter must preserve Phase 35 remote runner blueprint lineage."));
  checks.push(makeCheck("source-phase-36", sourcePhaseIds.includes("phase-36-owner-approval-queue-v1"), "Adapter must preserve Phase 36 owner approval queue lineage."));

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

  for (const stage of requiredStages) {
    const matchingStage = adapterStages.find((entry) => entry.name === stage);
    checks.push(makeCheck(`adapter-stage:${stage}`, Boolean(matchingStage), `Adapter must include stage: ${stage}`));
    if (matchingStage) {
      checks.push(makeCheck(`adapter-stage-disabled:${stage}`, matchingStage.status === "defined_disabled", `Adapter stage must remain defined_disabled: ${stage}`));
      checks.push(makeCheck(`adapter-stage-owner-approval:${stage}`, matchingStage.ownerApprovalRequired === true, `Owner approval must be required for adapter stage: ${stage}`));
      checks.push(makeCheck(`adapter-stage-no-execution:${stage}`, matchingStage.executionAllowed === false, `Execution must remain disabled for adapter stage: ${stage}`));
      checks.push(makeCheck(`adapter-stage-evidence:${stage}`, matchingStage.evidenceRequired === true, `Evidence must be required for adapter stage: ${stage}`));
    }
  }

  checks.push(makeCheck("evidence-count", evidenceRequirements.length >= 12, "At least 12 evidence requirements are required."));
  checks.push(makeCheck("risk-count", riskChecks.length >= 12, "At least 12 risk checks are required."));
  checks.push(makeCheck("owner-gate-count", ownerApprovalGates.length >= 6, "At least six owner approval gates are required."));

  for (const gate of expectedOwnerGates) {
    checks.push(makeCheck(`owner-gate:${gate}`, ownerApprovalGates.includes(gate), `Owner gate is required: ${gate}`));
  }

  const falseBoundaryFields = [
    "adapterEnabled",
    "adapterActivationAllowed",
    "runnerConnectivityAllowed",
    "commandExecutionAllowed",
    "remoteExecutionAllowed",
    "executionAllowedAfterApproval",
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
    checks.push(makeCheck(`boundary:${field}`, adapter[field] === false, `${field} must remain false in Phase 37.`));
  }

  const trueRequiredFields = [
    "localOnly",
    "adapterOnly",
    "adapterContractOnly",
    "ownerDecisionRequired",
    "emergencyStopRequired",
    "sessionLockRequired",
    "approvalQueueBindingRequired",
    "commandAllowlistRequired",
    "evidenceCaptureRequired",
    "ownerApprovalRequiredForAdapterActivation",
    "ownerApprovalRequiredForRunnerIdentityTrust",
    "ownerApprovalRequiredForCommandAllowlistChanges",
    "ownerApprovalRequiredForWorkspaceAccess",
    "ownerApprovalRequiredForEvidenceAcceptance",
    "ownerApprovalRequiredForEmergencyStopRelease",
  ];

  for (const field of trueRequiredFields) {
    checks.push(makeCheck(`required:${field}`, adapter[field] === true, `${field} must remain true in Phase 37.`));
  }

  const validationFailed = checks.filter((check) => !check.passed);
  const blockers = validationFailed.filter((check) => check.severity === "blocker").map((check) => check.message);
  const warnings = validationFailed.filter((check) => check.severity !== "blocker").map((check) => check.message);
  const ok = blockers.length === 0;

  const summary = {
    ok,
    status: ok ? "passed" : "blocked",
    adapterStatus: ok ? "ready" : "blocked",
    adapterId: adapter.adapterId,
    adapterHash: sha256(adapter),
    phaseId: adapter.phaseId,
    branchName: adapter.branchName,
    declaredFileCount: declaredPaths.length,
    validationCommandCount: validationCommands.length,
    adapterStageCount: adapterStages.length,
    evidenceRequirementCount: evidenceRequirements.length,
    riskCheckCount: riskChecks.length,
    ownerApprovalGateCount: ownerApprovalGates.length,
    validationCheckCount: checks.length,
    validationPassedCount: checks.length - validationFailed.length,
    validationFailedCount: validationFailed.length,
    blockers,
    warnings,
    localOnly: adapter.localOnly,
    adapterOnly: adapter.adapterOnly,
    adapterContractOnly: adapter.adapterContractOnly,
    adapterEnabled: adapter.adapterEnabled,
    adapterActivationAllowed: adapter.adapterActivationAllowed,
    runnerConnectivityAllowed: adapter.runnerConnectivityAllowed,
    commandExecutionAllowed: adapter.commandExecutionAllowed,
    remoteExecutionAllowed: adapter.remoteExecutionAllowed,
    usesSelfHostedRunner: adapter.usesSelfHostedRunner,
    selfHostedRunnerActivated: adapter.selfHostedRunnerActivated,
    requiresSecrets: adapter.requiresSecrets,
    mutatesSource: adapter.mutatesSource,
    executesRemoteCommands: adapter.executesRemoteCommands,
    selfApprovesPlan: adapter.selfApprovesPlan,
    ownerDecisionRequired: adapter.ownerDecisionRequired,
    emergencyStopRequired: adapter.emergencyStopRequired,
    sessionLockRequired: adapter.sessionLockRequired,
    approvalQueueBindingRequired: adapter.approvalQueueBindingRequired,
    commandAllowlistRequired: adapter.commandAllowlistRequired,
    evidenceCaptureRequired: adapter.evidenceCaptureRequired,
    declaredPaths,
    validationCommands,
    adapterStages,
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
    event: "phase37_self_hosted_runner_adapter_inspected",
    ok: summary.ok,
    status: summary.status,
    adapterStatus: summary.adapterStatus,
    adapterHash: summary.adapterHash,
  });
  writeText(markdownPath, renderMarkdown(summary));

  return summary;
}

function renderMarkdown(summary) {
  return [
    "# S.E.R.A. Phase 37 Self-Hosted Runner Adapter v1",
    "",
    `- Status: ${summary.status}`,
    `- Adapter Status: ${summary.adapterStatus}`,
    `- Adapter ID: ${summary.adapterId}`,
    `- Phase ID: ${summary.phaseId}`,
    `- Branch Name: ${summary.branchName}`,
    `- Validation Checks: ${summary.validationPassedCount}/${summary.validationCheckCount}`,
    `- Blockers: ${summary.blockers.length}`,
    `- Adapter Enabled: ${summary.adapterEnabled}`,
    `- Runner Connectivity Allowed: ${summary.runnerConnectivityAllowed}`,
    `- Command Execution Allowed: ${summary.commandExecutionAllowed}`,
    `- Uses Self-Hosted Runner: ${summary.usesSelfHostedRunner}`,
    `- Self-Hosted Runner Activated: ${summary.selfHostedRunnerActivated}`,
    `- Owner Decision Required: ${summary.ownerDecisionRequired}`,
    `- Emergency Stop Required: ${summary.emergencyStopRequired}`,
    `- Session Lock Required: ${summary.sessionLockRequired}`,
    "",
    "## Declared Paths",
    ...summary.declaredPaths.map((declaredPath) => `- ${declaredPath}`),
    "",
    "## Adapter Stages",
    ...summary.adapterStages.map((stage) => `- ${stage.name} — ${stage.status}`),
    "",
    "## Validation Commands",
    ...summary.validationCommands.map((command) => `- ${command}`),
    "",
    "## Blockers",
    ...(summary.blockers.length ? summary.blockers.map((blocker) => `- ${blocker}`) : ["- None"]),
    "",
  ].join("\n");
}
