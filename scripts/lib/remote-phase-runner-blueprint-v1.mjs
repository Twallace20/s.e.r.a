import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const RUNTIME_DIR = ".sera-remote-phase-runner-blueprints";
const REPORT_DIR = "reports";
const EVENTS_FILE = "events.jsonl";
const SUMMARY_JSON = "remote-phase-runner-blueprint-summary.json";
const SUMMARY_MD = "remote-phase-runner-blueprint-summary.md";
const HISTORY_JSONL = "remote-phase-runner-blueprint-history.jsonl";

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

export function createDefaultRemotePhaseRunnerBlueprintV1() {
  return {
    schemaVersion: 1,
    blueprintId: "phase35_remote_phase_runner_blueprint_plan",
    phaseId: "phase-35-remote-phase-runner-blueprint-v1",
    phaseNumber: 35,
    title: "Remote Phase Runner Blueprint v1",
    branchName: "phase-35-remote-phase-runner-blueprint-v1",
    sourcePhaseIds: [
      "phase-33-branch-proposal-builder-v1",
      "phase-34-branch-readiness-inspector-v1",
    ],
    declaredPaths: [
      "docs/phases/PHASE_35_REMOTE_PHASE_RUNNER_BLUEPRINT_V1.md",
      "scripts/lib/remote-phase-runner-blueprint-v1.mjs",
      "scripts/run-remote-phase-runner-blueprint-v1.mjs",
      "tests/integration/remote-phase-runner-blueprint-v1.test.ts",
    ],
    declaredFileStates: {
      "docs/phases/PHASE_35_REMOTE_PHASE_RUNNER_BLUEPRINT_V1.md": "new",
      "scripts/lib/remote-phase-runner-blueprint-v1.mjs": "new",
      "scripts/run-remote-phase-runner-blueprint-v1.mjs": "new",
      "tests/integration/remote-phase-runner-blueprint-v1.test.ts": "new",
    },
    validationCommands: [
      "npm run phase35:demo",
      "npm run phase35:verify",
      "npm run hygiene",
      "npm run build",
      "npm test",
      "npm run certify",
      "npm run verify",
    ],
    runnerStages: [
      "owner approval intake",
      "clean main preflight",
      "phase branch creation plan",
      "workspace preparation plan",
      "overlay or patch application plan",
      "validation command sequence",
      "evidence capture",
      "owner review handoff",
      "merge tag and cleanup plan",
      "emergency stop path",
      "session lock boundary",
    ],
    evidenceRequirements: [
      "phase35 demo output includes blueprint status",
      "phase35 verify output passes free-core and knowledge checks",
      "source hygiene passes",
      "runtime artifact hygiene passes",
      "TypeScript build passes",
      "Vitest suite passes",
      "certification passes",
      "full verify passes",
      "blueprint JSON report is written",
      "blueprint Markdown report is written",
      "blueprint history is appended",
      "blocked remote execution fixture remains blocked",
      "emergency stop requirement is present",
      "session lock requirement is present",
    ],
    riskChecks: [
      "remote execution remains disabled",
      "cloud runner use remains disabled",
      "self-hosted runner use remains disabled until a later phase",
      "secrets are not required",
      "source mutation is not allowed",
      "branch creation is not performed",
      "patch application is not performed",
      "pull request opening is not performed",
      "merge and tag actions are not performed",
      "owner approval gates are mandatory",
      "emergency stop is required",
      "session lock is required",
    ],
    ownerApprovalGates: [
      "owner approval required for remote run activation",
      "owner approval required for branch creation",
      "owner approval required for patch application",
      "owner approval required for merge",
      "owner approval required for cleanup and tagging",
    ],
    localOnly: true,
    blueprintOnly: true,
    remoteExecutionAllowed: false,
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
    selfApprovesPlan: false,
    emergencyStopRequired: true,
    sessionLockRequired: true,
    ownerApprovalRequiredForRemoteRunActivation: true,
    ownerApprovalRequiredForBranchCreation: true,
    ownerApprovalRequiredForPatchApplication: true,
    ownerApprovalRequiredForMerge: true,
    ownerApprovalRequiredForCleanupAndTagging: true,
    proposalActivationAllowed: false,
  };
}

export function inspectRemotePhaseRunnerBlueprintV1(blueprint = createDefaultRemotePhaseRunnerBlueprintV1(), options = {}) {
  const rootDir = options.rootDir || process.cwd();
  const runtimeDir = path.join(rootDir, RUNTIME_DIR);
  const reportDir = path.join(runtimeDir, REPORT_DIR);
  const eventPath = path.join(runtimeDir, EVENTS_FILE);
  const jsonPath = path.join(reportDir, SUMMARY_JSON);
  const markdownPath = path.join(reportDir, SUMMARY_MD);
  const historyPath = path.join(reportDir, HISTORY_JSONL);

  ensureDir(reportDir);

  const declaredPaths = uniqueStrings(blueprint.declaredPaths);
  const validationCommands = uniqueStrings(blueprint.validationCommands);
  const runnerStages = uniqueStrings(blueprint.runnerStages);
  const evidenceRequirements = uniqueStrings(blueprint.evidenceRequirements);
  const riskChecks = uniqueStrings(blueprint.riskChecks);
  const ownerApprovalGates = uniqueStrings(blueprint.ownerApprovalGates);
  const sourcePhaseIds = uniqueStrings(blueprint.sourcePhaseIds);
  const declaredFileStates = blueprint.declaredFileStates || {};

  const checks = [];
  const expectedPaths = [
    "docs/phases/PHASE_35_REMOTE_PHASE_RUNNER_BLUEPRINT_V1.md",
    "scripts/lib/remote-phase-runner-blueprint-v1.mjs",
    "scripts/run-remote-phase-runner-blueprint-v1.mjs",
    "tests/integration/remote-phase-runner-blueprint-v1.test.ts",
  ];
  const requiredCommands = [
    "npm run phase35:demo",
    "npm run phase35:verify",
    "npm run hygiene",
    "npm run build",
    "npm test",
    "npm run certify",
    "npm run verify",
  ];
  const requiredStages = [
    "owner approval intake",
    "clean main preflight",
    "validation command sequence",
    "evidence capture",
    "owner review handoff",
    "emergency stop path",
    "session lock boundary",
  ];
  const expectedOwnerGates = [
    "owner approval required for remote run activation",
    "owner approval required for branch creation",
    "owner approval required for patch application",
    "owner approval required for merge",
    "owner approval required for cleanup and tagging",
  ];

  checks.push(makeCheck("phase-id", blueprint.phaseId === "phase-35-remote-phase-runner-blueprint-v1", "Phase id must be phase-35-remote-phase-runner-blueprint-v1."));
  checks.push(makeCheck("phase-number", blueprint.phaseNumber === 35, "Phase number must be 35."));
  checks.push(makeCheck("blueprint-id", Boolean(blueprint.blueprintId), "Remote phase runner blueprint must have a blueprint id."));
  checks.push(makeCheck("branch-name-format", /^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(blueprint.branchName || ""), "Blueprint branch name must use safe lowercase kebab-case."));
  checks.push(makeCheck("source-phase-33", sourcePhaseIds.includes("phase-33-branch-proposal-builder-v1"), "Blueprint must preserve Phase 33 branch proposal lineage."));
  checks.push(makeCheck("source-phase-34", sourcePhaseIds.includes("phase-34-branch-readiness-inspector-v1"), "Blueprint must preserve Phase 34 readiness inspection lineage."));

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
    checks.push(makeCheck(`runner-stage:${stage}`, runnerStages.includes(stage), `Runner blueprint must include stage: ${stage}`));
  }

  checks.push(makeCheck("evidence-count", evidenceRequirements.length >= 12, "At least 12 evidence requirements are required."));
  checks.push(makeCheck("risk-count", riskChecks.length >= 10, "At least 10 risk checks are required."));

  for (const gate of expectedOwnerGates) {
    checks.push(makeCheck(`owner-gate:${gate}`, ownerApprovalGates.includes(gate), `Owner gate is required: ${gate}`));
  }

  const requiredFalse = [
    "remoteExecutionAllowed",
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
    "selfApprovesPlan",
    "proposalActivationAllowed",
  ];

  const requiredTrue = [
    "localOnly",
    "blueprintOnly",
    "emergencyStopRequired",
    "sessionLockRequired",
    "ownerApprovalRequiredForRemoteRunActivation",
    "ownerApprovalRequiredForBranchCreation",
    "ownerApprovalRequiredForPatchApplication",
    "ownerApprovalRequiredForMerge",
    "ownerApprovalRequiredForCleanupAndTagging",
  ];

  for (const key of requiredFalse) {
    checks.push(makeCheck(`boundary:${key}`, blueprint[key] === false, `${key} must remain false in Phase 35.`));
  }

  for (const key of requiredTrue) {
    checks.push(makeCheck(`required:${key}`, blueprint[key] === true, `${key} must remain true in Phase 35.`));
  }

  const blockers = checks.filter((check) => !check.passed && check.severity === "blocker").map((check) => check.message);
  const warnings = checks.filter((check) => !check.passed && check.severity === "warning").map((check) => check.message);
  const validationPassedCount = checks.filter((check) => check.passed).length;
  const validationFailedCount = checks.length - validationPassedCount;
  const blueprintStatus = blockers.length > 0 ? "blocked" : warnings.length > 0 ? "attention" : "ready";
  const ok = blockers.length === 0;

  const result = {
    ok,
    status: ok ? "passed" : "blocked",
    blueprintStatus,
    blueprintId: blueprint.blueprintId,
    blueprintHash: sha256(blueprint),
    phaseId: blueprint.phaseId,
    branchName: blueprint.branchName,
    sourcePhaseIds,
    declaredFileCount: declaredPaths.length,
    declaredFileTypeCount: new Set(declaredPaths.map((declaredPath) => normalizePath(declaredPath).split("/")[0])).size,
    validationCommandCount: validationCommands.length,
    runnerStageCount: runnerStages.length,
    evidenceRequirementCount: evidenceRequirements.length,
    riskCheckCount: riskChecks.length,
    ownerApprovalGateCount: ownerApprovalGates.length,
    validationCheckCount: checks.length,
    validationPassedCount,
    validationFailedCount,
    blockers,
    warnings,
    localOnly: blueprint.localOnly === true,
    blueprintOnly: blueprint.blueprintOnly === true,
    remoteExecutionAllowed: blueprint.remoteExecutionAllowed === true,
    cloudRequired: blueprint.cloudRequired === true,
    paidProviderRequired: blueprint.paidProviderRequired === true,
    freeCoreDependency: blueprint.freeCoreDependency === true,
    requiresSecrets: blueprint.requiresSecrets === true,
    usesCloudRunner: blueprint.usesCloudRunner === true,
    usesSelfHostedRunner: blueprint.usesSelfHostedRunner === true,
    mutatesSource: blueprint.mutatesSource === true,
    executesArbitraryCode: blueprint.executesArbitraryCode === true,
    executesRemoteCommands: blueprint.executesRemoteCommands === true,
    performsNetworkRefresh: blueprint.performsNetworkRefresh === true,
    createsBranches: blueprint.createsBranches === true,
    switchesBranches: blueprint.switchesBranches === true,
    pushesBranches: blueprint.pushesBranches === true,
    opensPullRequests: blueprint.opensPullRequests === true,
    appliesPatches: blueprint.appliesPatches === true,
    mergesBranches: blueprint.mergesBranches === true,
    tagsReleases: blueprint.tagsReleases === true,
    deletesBranches: blueprint.deletesBranches === true,
    selfApprovesPlan: blueprint.selfApprovesPlan === true,
    emergencyStopRequired: blueprint.emergencyStopRequired === true,
    sessionLockRequired: blueprint.sessionLockRequired === true,
    ownerApprovalRequiredForRemoteRunActivation: blueprint.ownerApprovalRequiredForRemoteRunActivation === true,
    ownerApprovalRequiredForBranchCreation: blueprint.ownerApprovalRequiredForBranchCreation === true,
    ownerApprovalRequiredForPatchApplication: blueprint.ownerApprovalRequiredForPatchApplication === true,
    ownerApprovalRequiredForMerge: blueprint.ownerApprovalRequiredForMerge === true,
    ownerApprovalRequiredForCleanupAndTagging: blueprint.ownerApprovalRequiredForCleanupAndTagging === true,
    proposalActivationAllowed: blueprint.proposalActivationAllowed === true,
    declaredPaths,
    validationCommands,
    runnerStages,
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
    type: "remote_phase_runner_blueprint_inspected",
    blueprintId: result.blueprintId,
    phaseId: result.phaseId,
    branchName: result.branchName,
    blueprintStatus: result.blueprintStatus,
    ok: result.ok,
    validationCheckCount: result.validationCheckCount,
    validationFailedCount: result.validationFailedCount,
  };

  writeJson(jsonPath, result);
  writeText(markdownPath, renderRemotePhaseRunnerBlueprintMarkdownV1(result));
  appendJsonl(historyPath, event);
  appendJsonl(eventPath, event);

  return result;
}

export function renderRemotePhaseRunnerBlueprintMarkdownV1(result) {
  const blockerLines = result.blockers.length ? result.blockers.map((blocker) => `- ${blocker}`).join("\n") : "- None";
  const warningLines = result.warnings.length ? result.warnings.map((warning) => `- ${warning}`).join("\n") : "- None";
  const pathLines = result.declaredPaths.map((declaredPath) => `- ${declaredPath}`).join("\n");
  const commandLines = result.validationCommands.map((command) => `- \`${command}\``).join("\n");
  const stageLines = result.runnerStages.map((stage) => `- ${stage}`).join("\n");

  return `# Remote Phase Runner Blueprint v1\n\n` +
    `Status: **${result.status}**\n\n` +
    `Blueprint status: **${result.blueprintStatus}**\n\n` +
    `Blueprint: \`${result.blueprintId}\`\n\n` +
    `Branch: \`${result.branchName}\`\n\n` +
    `Validation checks: ${result.validationPassedCount}/${result.validationCheckCount} passed\n\n` +
    `## Blockers\n\n${blockerLines}\n\n` +
    `## Warnings\n\n${warningLines}\n\n` +
    `## Runner stages\n\n${stageLines}\n\n` +
    `## Declared paths\n\n${pathLines}\n\n` +
    `## Validation commands\n\n${commandLines}\n\n` +
    `## Safety boundary\n\n` +
    `- Blueprint only: ${result.blueprintOnly}\n` +
    `- Remote execution allowed: ${result.remoteExecutionAllowed}\n` +
    `- Requires secrets: ${result.requiresSecrets}\n` +
    `- Uses cloud runner: ${result.usesCloudRunner}\n` +
    `- Uses self-hosted runner: ${result.usesSelfHostedRunner}\n` +
    `- Mutates source: ${result.mutatesSource}\n` +
    `- Applies patches: ${result.appliesPatches}\n` +
    `- Opens pull requests: ${result.opensPullRequests}\n` +
    `- Emergency stop required: ${result.emergencyStopRequired}\n` +
    `- Session lock required: ${result.sessionLockRequired}\n`;
}
