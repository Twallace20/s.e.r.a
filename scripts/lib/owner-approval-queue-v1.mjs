import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const RUNTIME_DIR = ".sera-owner-approval-queue";
const REPORT_DIR = "reports";
const EVENTS_FILE = "events.jsonl";
const SUMMARY_JSON = "owner-approval-queue-summary.json";
const SUMMARY_MD = "owner-approval-queue-summary.md";
const HISTORY_JSONL = "owner-approval-queue-history.jsonl";

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

function normalizeRequest(request) {
  return {
    approvalId: String(request?.approvalId || ""),
    action: String(request?.action || ""),
    status: String(request?.status || ""),
    requiredApprover: String(request?.requiredApprover || ""),
    ownerDecisionRequired: request?.ownerDecisionRequired === true,
    selfApprovalAllowed: request?.selfApprovalAllowed === true,
    executionAllowedAfterApproval: request?.executionAllowedAfterApproval === true,
    evidenceRequired: request?.evidenceRequired === true,
    expiresWithoutOwnerDecision: request?.expiresWithoutOwnerDecision === true,
  };
}

export function createDefaultOwnerApprovalQueueV1() {
  return {
    schemaVersion: 1,
    queueId: "phase36_owner_approval_queue_plan",
    phaseId: "phase-36-owner-approval-queue-v1",
    phaseNumber: 36,
    title: "Owner Approval Queue v1",
    branchName: "phase-36-owner-approval-queue-v1",
    sourcePhaseIds: [
      "phase-33-branch-proposal-builder-v1",
      "phase-34-branch-readiness-inspector-v1",
      "phase-35-remote-phase-runner-blueprint-v1",
    ],
    declaredPaths: [
      "docs/phases/PHASE_36_OWNER_APPROVAL_QUEUE_V1.md",
      "scripts/lib/owner-approval-queue-v1.mjs",
      "scripts/run-owner-approval-queue-v1.mjs",
      "tests/integration/owner-approval-queue-v1.test.ts",
    ],
    declaredFileStates: {
      "docs/phases/PHASE_36_OWNER_APPROVAL_QUEUE_V1.md": "new",
      "scripts/lib/owner-approval-queue-v1.mjs": "new",
      "scripts/run-owner-approval-queue-v1.mjs": "new",
      "tests/integration/owner-approval-queue-v1.test.ts": "new",
    },
    validationCommands: [
      "npm run phase36:demo",
      "npm run phase36:verify",
      "npm run hygiene",
      "npm run build",
      "npm test",
      "npm run certify",
      "npm run verify",
    ],
    approvalStages: [
      "remote run activation approval",
      "branch creation approval",
      "patch application approval",
      "validation evidence approval",
      "merge approval",
      "cleanup and tagging approval",
      "emergency stop acknowledgement",
      "session lock acknowledgement",
      "owner review handoff",
    ],
    approvalRequests: [
      {
        approvalId: "phase36_remote_run_activation",
        action: "remote run activation",
        status: "pending_owner_approval",
        requiredApprover: "owner",
        ownerDecisionRequired: true,
        selfApprovalAllowed: false,
        executionAllowedAfterApproval: false,
        evidenceRequired: true,
        expiresWithoutOwnerDecision: true,
      },
      {
        approvalId: "phase36_branch_creation",
        action: "branch creation",
        status: "pending_owner_approval",
        requiredApprover: "owner",
        ownerDecisionRequired: true,
        selfApprovalAllowed: false,
        executionAllowedAfterApproval: false,
        evidenceRequired: true,
        expiresWithoutOwnerDecision: true,
      },
      {
        approvalId: "phase36_patch_application",
        action: "patch application",
        status: "pending_owner_approval",
        requiredApprover: "owner",
        ownerDecisionRequired: true,
        selfApprovalAllowed: false,
        executionAllowedAfterApproval: false,
        evidenceRequired: true,
        expiresWithoutOwnerDecision: true,
      },
      {
        approvalId: "phase36_merge",
        action: "merge",
        status: "pending_owner_approval",
        requiredApprover: "owner",
        ownerDecisionRequired: true,
        selfApprovalAllowed: false,
        executionAllowedAfterApproval: false,
        evidenceRequired: true,
        expiresWithoutOwnerDecision: true,
      },
      {
        approvalId: "phase36_cleanup_and_tagging",
        action: "cleanup and tagging",
        status: "pending_owner_approval",
        requiredApprover: "owner",
        ownerDecisionRequired: true,
        selfApprovalAllowed: false,
        executionAllowedAfterApproval: false,
        evidenceRequired: true,
        expiresWithoutOwnerDecision: true,
      },
    ],
    evidenceRequirements: [
      "phase36 demo output includes queue status",
      "phase36 verify output passes free-core and knowledge checks",
      "source hygiene passes",
      "runtime artifact hygiene passes",
      "TypeScript build passes",
      "Vitest suite passes",
      "certification passes",
      "full verify passes",
      "approval queue JSON report is written",
      "approval queue Markdown report is written",
      "approval queue history is appended",
      "pending owner approvals are listed",
      "self approval fixture remains blocked",
      "execution after approval remains disabled in Phase 36",
    ],
    riskChecks: [
      "owner approval is required for every dangerous action",
      "self approval remains blocked",
      "remote execution remains disabled",
      "execution after approval remains disabled in this phase",
      "branch creation is not performed",
      "patch application is not performed",
      "pull request opening is not performed",
      "merge and tag actions are not performed",
      "secrets are not required",
      "source mutation is not allowed",
      "emergency stop acknowledgement is required",
      "session lock acknowledgement is required",
    ],
    ownerApprovalGates: [
      "owner approval required for remote run activation",
      "owner approval required for branch creation",
      "owner approval required for patch application",
      "owner approval required for validation evidence acceptance",
      "owner approval required for merge",
      "owner approval required for cleanup and tagging",
    ],
    localOnly: true,
    queueOnly: true,
    approvalQueueOnly: true,
    remoteExecutionAllowed: false,
    executionAllowedAfterApproval: false,
    cloudRequired: false,
    paidProviderRequired: false,
    freeCoreDependency: false,
    requiresSecrets: false,
    usesCloudRunner: false,
    usesSelfHostedRunner: false,
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
    ownerApprovalRequiredForRemoteRunActivation: true,
    ownerApprovalRequiredForBranchCreation: true,
    ownerApprovalRequiredForPatchApplication: true,
    ownerApprovalRequiredForValidationEvidenceAcceptance: true,
    ownerApprovalRequiredForMerge: true,
    ownerApprovalRequiredForCleanupAndTagging: true,
    proposalActivationAllowed: false,
  };
}

export function inspectOwnerApprovalQueueV1(queue = createDefaultOwnerApprovalQueueV1(), options = {}) {
  const rootDir = options.rootDir || process.cwd();
  const runtimeDir = path.join(rootDir, RUNTIME_DIR);
  const reportDir = path.join(runtimeDir, REPORT_DIR);
  const eventPath = path.join(runtimeDir, EVENTS_FILE);
  const jsonPath = path.join(reportDir, SUMMARY_JSON);
  const markdownPath = path.join(reportDir, SUMMARY_MD);
  const historyPath = path.join(reportDir, HISTORY_JSONL);

  ensureDir(reportDir);

  const declaredPaths = uniqueStrings(queue.declaredPaths);
  const validationCommands = uniqueStrings(queue.validationCommands);
  const approvalStages = uniqueStrings(queue.approvalStages);
  const evidenceRequirements = uniqueStrings(queue.evidenceRequirements);
  const riskChecks = uniqueStrings(queue.riskChecks);
  const ownerApprovalGates = uniqueStrings(queue.ownerApprovalGates);
  const sourcePhaseIds = uniqueStrings(queue.sourcePhaseIds);
  const declaredFileStates = queue.declaredFileStates || {};
  const approvalRequests = (queue.approvalRequests || []).map(normalizeRequest);

  const checks = [];
  const expectedPaths = [
    "docs/phases/PHASE_36_OWNER_APPROVAL_QUEUE_V1.md",
    "scripts/lib/owner-approval-queue-v1.mjs",
    "scripts/run-owner-approval-queue-v1.mjs",
    "tests/integration/owner-approval-queue-v1.test.ts",
  ];
  const requiredCommands = [
    "npm run phase36:demo",
    "npm run phase36:verify",
    "npm run hygiene",
    "npm run build",
    "npm test",
    "npm run certify",
    "npm run verify",
  ];
  const requiredStages = [
    "remote run activation approval",
    "branch creation approval",
    "patch application approval",
    "validation evidence approval",
    "merge approval",
    "cleanup and tagging approval",
    "emergency stop acknowledgement",
    "session lock acknowledgement",
    "owner review handoff",
  ];
  const requiredActions = [
    "remote run activation",
    "branch creation",
    "patch application",
    "merge",
    "cleanup and tagging",
  ];
  const expectedOwnerGates = [
    "owner approval required for remote run activation",
    "owner approval required for branch creation",
    "owner approval required for patch application",
    "owner approval required for validation evidence acceptance",
    "owner approval required for merge",
    "owner approval required for cleanup and tagging",
  ];

  checks.push(makeCheck("phase-id", queue.phaseId === "phase-36-owner-approval-queue-v1", "Phase id must be phase-36-owner-approval-queue-v1."));
  checks.push(makeCheck("phase-number", queue.phaseNumber === 36, "Phase number must be 36."));
  checks.push(makeCheck("queue-id", Boolean(queue.queueId), "Owner approval queue must have a queue id."));
  checks.push(makeCheck("branch-name-format", /^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(queue.branchName || ""), "Queue branch name must use safe lowercase kebab-case."));
  checks.push(makeCheck("source-phase-33", sourcePhaseIds.includes("phase-33-branch-proposal-builder-v1"), "Approval queue must preserve Phase 33 branch proposal lineage."));
  checks.push(makeCheck("source-phase-34", sourcePhaseIds.includes("phase-34-branch-readiness-inspector-v1"), "Approval queue must preserve Phase 34 readiness inspection lineage."));
  checks.push(makeCheck("source-phase-35", sourcePhaseIds.includes("phase-35-remote-phase-runner-blueprint-v1"), "Approval queue must preserve Phase 35 remote runner blueprint lineage."));

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
    checks.push(makeCheck(`approval-stage:${stage}`, approvalStages.includes(stage), `Approval queue must include stage: ${stage}`));
  }

  for (const action of requiredActions) {
    const matchingRequest = approvalRequests.find((request) => request.action === action);
    checks.push(makeCheck(`approval-request:${action}`, Boolean(matchingRequest), `Approval request is required for action: ${action}`));
    if (matchingRequest) {
      checks.push(makeCheck(`approval-request-status:${action}`, matchingRequest.status === "pending_owner_approval", `Approval request must remain pending owner approval for action: ${action}`));
      checks.push(makeCheck(`approval-request-owner:${action}`, matchingRequest.requiredApprover === "owner", `Approval request approver must be owner for action: ${action}`));
      checks.push(makeCheck(`approval-request-owner-decision:${action}`, matchingRequest.ownerDecisionRequired === true, `Owner decision must be required for action: ${action}`));
      checks.push(makeCheck(`approval-request-no-self-approval:${action}`, matchingRequest.selfApprovalAllowed === false, `Self approval must be blocked for action: ${action}`));
      checks.push(makeCheck(`approval-request-no-execution:${action}`, matchingRequest.executionAllowedAfterApproval === false, `Execution after approval must remain disabled in Phase 36 for action: ${action}`));
      checks.push(makeCheck(`approval-request-evidence:${action}`, matchingRequest.evidenceRequired === true, `Evidence must be required for action: ${action}`));
    }
  }

  checks.push(makeCheck("approval-request-count", approvalRequests.length >= 5, "At least five approval requests are required."));
  checks.push(makeCheck("evidence-count", evidenceRequirements.length >= 12, "At least 12 evidence requirements are required."));
  checks.push(makeCheck("risk-count", riskChecks.length >= 10, "At least 10 risk checks are required."));

  for (const gate of expectedOwnerGates) {
    checks.push(makeCheck(`owner-gate:${gate}`, ownerApprovalGates.includes(gate), `Owner gate is required: ${gate}`));
  }

  const requiredFalse = [
    "remoteExecutionAllowed",
    "executionAllowedAfterApproval",
    "cloudRequired",
    "paidProviderRequired",
    "freeCoreDependency",
    "requiresSecrets",
    "usesCloudRunner",
    "usesSelfHostedRunner",
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

  const requiredTrue = [
    "localOnly",
    "queueOnly",
    "approvalQueueOnly",
    "ownerDecisionRequired",
    "emergencyStopRequired",
    "sessionLockRequired",
    "ownerApprovalRequiredForRemoteRunActivation",
    "ownerApprovalRequiredForBranchCreation",
    "ownerApprovalRequiredForPatchApplication",
    "ownerApprovalRequiredForValidationEvidenceAcceptance",
    "ownerApprovalRequiredForMerge",
    "ownerApprovalRequiredForCleanupAndTagging",
  ];

  for (const key of requiredFalse) {
    checks.push(makeCheck(`boundary:${key}`, queue[key] === false, `${key} must remain false in Phase 36.`));
  }

  for (const key of requiredTrue) {
    checks.push(makeCheck(`required:${key}`, queue[key] === true, `${key} must remain true in Phase 36.`));
  }

  const blockers = checks.filter((check) => !check.passed && check.severity === "blocker").map((check) => check.message);
  const warnings = checks.filter((check) => !check.passed && check.severity === "warning").map((check) => check.message);
  const validationPassedCount = checks.filter((check) => check.passed).length;
  const validationFailedCount = checks.length - validationPassedCount;
  const queueStatus = blockers.length > 0 ? "blocked" : warnings.length > 0 ? "attention" : "ready";
  const ok = blockers.length === 0;

  const result = {
    ok,
    status: ok ? "passed" : "blocked",
    queueStatus,
    queueId: queue.queueId,
    queueHash: sha256(queue),
    phaseId: queue.phaseId,
    branchName: queue.branchName,
    sourcePhaseIds,
    declaredFileCount: declaredPaths.length,
    declaredFileTypeCount: new Set(declaredPaths.map((declaredPath) => normalizePath(declaredPath).split("/")[0])).size,
    validationCommandCount: validationCommands.length,
    approvalStageCount: approvalStages.length,
    approvalRequestCount: approvalRequests.length,
    pendingApprovalCount: approvalRequests.filter((request) => request.status === "pending_owner_approval").length,
    evidenceRequirementCount: evidenceRequirements.length,
    riskCheckCount: riskChecks.length,
    ownerApprovalGateCount: ownerApprovalGates.length,
    validationCheckCount: checks.length,
    validationPassedCount,
    validationFailedCount,
    blockers,
    warnings,
    localOnly: queue.localOnly === true,
    queueOnly: queue.queueOnly === true,
    approvalQueueOnly: queue.approvalQueueOnly === true,
    remoteExecutionAllowed: queue.remoteExecutionAllowed === true,
    executionAllowedAfterApproval: queue.executionAllowedAfterApproval === true,
    cloudRequired: queue.cloudRequired === true,
    paidProviderRequired: queue.paidProviderRequired === true,
    freeCoreDependency: queue.freeCoreDependency === true,
    requiresSecrets: queue.requiresSecrets === true,
    usesCloudRunner: queue.usesCloudRunner === true,
    usesSelfHostedRunner: queue.usesSelfHostedRunner === true,
    mutatesSource: queue.mutatesSource === true,
    executesArbitraryCode: queue.executesArbitraryCode === true,
    executesRemoteCommands: queue.executesRemoteCommands === true,
    performsNetworkRefresh: queue.performsNetworkRefresh === true,
    createsBranches: queue.createsBranches === true,
    switchesBranches: queue.switchesBranches === true,
    pushesBranches: queue.pushesBranches === true,
    opensPullRequests: queue.opensPullRequests === true,
    appliesPatches: queue.appliesPatches === true,
    mergesBranches: queue.mergesBranches === true,
    tagsReleases: queue.tagsReleases === true,
    deletesBranches: queue.deletesBranches === true,
    recordsOwnerDecision: queue.recordsOwnerDecision === true,
    selfApprovesPlan: queue.selfApprovesPlan === true,
    selfApprovalAllowed: queue.selfApprovalAllowed === true,
    ownerDecisionRequired: queue.ownerDecisionRequired === true,
    emergencyStopRequired: queue.emergencyStopRequired === true,
    sessionLockRequired: queue.sessionLockRequired === true,
    ownerApprovalRequiredForRemoteRunActivation: queue.ownerApprovalRequiredForRemoteRunActivation === true,
    ownerApprovalRequiredForBranchCreation: queue.ownerApprovalRequiredForBranchCreation === true,
    ownerApprovalRequiredForPatchApplication: queue.ownerApprovalRequiredForPatchApplication === true,
    ownerApprovalRequiredForValidationEvidenceAcceptance: queue.ownerApprovalRequiredForValidationEvidenceAcceptance === true,
    ownerApprovalRequiredForMerge: queue.ownerApprovalRequiredForMerge === true,
    ownerApprovalRequiredForCleanupAndTagging: queue.ownerApprovalRequiredForCleanupAndTagging === true,
    proposalActivationAllowed: queue.proposalActivationAllowed === true,
    declaredPaths,
    validationCommands,
    approvalStages,
    approvalRequests,
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

  const event = {
    createdAt: nowIso(),
    type: "owner_approval_queue_inspected",
    queueId: result.queueId,
    phaseId: result.phaseId,
    branchName: result.branchName,
    queueStatus: result.queueStatus,
    ok: result.ok,
    approvalRequestCount: result.approvalRequestCount,
    pendingApprovalCount: result.pendingApprovalCount,
    validationCheckCount: result.validationCheckCount,
    validationFailedCount: result.validationFailedCount,
  };

  writeJson(jsonPath, result);
  writeText(markdownPath, renderOwnerApprovalQueueMarkdownV1(result));
  appendJsonl(historyPath, event);
  appendJsonl(eventPath, event);

  return result;
}

export function renderOwnerApprovalQueueMarkdownV1(result) {
  const blockerLines = result.blockers.length ? result.blockers.map((blocker) => `- ${blocker}`).join("\n") : "- None";
  const warningLines = result.warnings.length ? result.warnings.map((warning) => `- ${warning}`).join("\n") : "- None";
  const pathLines = result.declaredPaths.map((declaredPath) => `- ${declaredPath}`).join("\n");
  const commandLines = result.validationCommands.map((command) => `- \`${command}\``).join("\n");
  const stageLines = result.approvalStages.map((stage) => `- ${stage}`).join("\n");
  const requestLines = result.approvalRequests.map((request) => `- ${request.approvalId}: ${request.action} — ${request.status}`).join("\n");

  return `# Owner Approval Queue v1\n\n` +
    `Status: **${result.status}**\n\n` +
    `Queue status: **${result.queueStatus}**\n\n` +
    `Queue: \`${result.queueId}\`\n\n` +
    `Branch: \`${result.branchName}\`\n\n` +
    `Validation checks: ${result.validationPassedCount}/${result.validationCheckCount} passed\n\n` +
    `Pending approvals: ${result.pendingApprovalCount}\n\n` +
    `## Blockers\n\n${blockerLines}\n\n` +
    `## Warnings\n\n${warningLines}\n\n` +
    `## Approval stages\n\n${stageLines}\n\n` +
    `## Approval requests\n\n${requestLines}\n\n` +
    `## Declared paths\n\n${pathLines}\n\n` +
    `## Validation commands\n\n${commandLines}\n\n` +
    `## Safety boundary\n\n` +
    `- Queue only: ${result.queueOnly}\n` +
    `- Approval queue only: ${result.approvalQueueOnly}\n` +
    `- Owner decision required: ${result.ownerDecisionRequired}\n` +
    `- Remote execution allowed: ${result.remoteExecutionAllowed}\n` +
    `- Execution allowed after approval: ${result.executionAllowedAfterApproval}\n` +
    `- Records owner decision: ${result.recordsOwnerDecision}\n` +
    `- Self approval allowed: ${result.selfApprovalAllowed}\n` +
    `- Requires secrets: ${result.requiresSecrets}\n` +
    `- Mutates source: ${result.mutatesSource}\n` +
    `- Applies patches: ${result.appliesPatches}\n` +
    `- Opens pull requests: ${result.opensPullRequests}\n` +
    `- Emergency stop required: ${result.emergencyStopRequired}\n` +
    `- Session lock required: ${result.sessionLockRequired}\n`;
}
