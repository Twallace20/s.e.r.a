import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const RUNTIME_DIR = ".sera-branch-readiness";
const REPORT_DIR = "reports";
const EVENTS_FILE = "events.jsonl";
const SUMMARY_JSON = "branch-readiness-inspector-summary.json";
const SUMMARY_MD = "branch-readiness-inspector-summary.md";
const HISTORY_JSONL = "branch-readiness-inspector-history.jsonl";

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

export function createDefaultBranchReadinessProposalV1() {
  return {
    schemaVersion: 1,
    proposalId: "phase34_branch_readiness_inspector_plan",
    phaseId: "phase-34-branch-readiness-inspector-v1",
    phaseNumber: 34,
    title: "Branch Readiness Inspector v1",
    branchName: "phase-34-branch-readiness-inspector-v1",
    sourceProposalId: "phase33_branch_proposal_builder_plan",
    sourcePhaseId: "phase-33-branch-proposal-builder-v1",
    packetId: "phase32_generated_phase_packet",
    declaredPaths: [
      "docs/phases/PHASE_34_BRANCH_READINESS_INSPECTOR_V1.md",
      "scripts/lib/branch-readiness-inspector-v1.mjs",
      "scripts/run-branch-readiness-inspector-v1.mjs",
      "tests/integration/branch-readiness-inspector-v1.test.ts",
    ],
    declaredFileStates: {
      "docs/phases/PHASE_34_BRANCH_READINESS_INSPECTOR_V1.md": "new",
      "scripts/lib/branch-readiness-inspector-v1.mjs": "new",
      "scripts/run-branch-readiness-inspector-v1.mjs": "new",
      "tests/integration/branch-readiness-inspector-v1.test.ts": "new",
    },
    validationCommands: [
      "npm run phase34:demo",
      "npm run phase34:verify",
      "npm run hygiene",
      "npm run build",
      "npm test",
      "npm run certify",
      "npm run verify",
    ],
    evidenceRequirements: [
      "phase34 demo output includes readiness status",
      "phase34 verify output passes free-core and knowledge checks",
      "source hygiene passes",
      "runtime artifact hygiene passes",
      "TypeScript build passes",
      "Vitest suite passes",
      "certification passes",
      "full verify passes",
      "readiness JSON report is written",
      "readiness Markdown report is written",
      "readiness history is appended",
      "blocked proposal fixture remains blocked",
    ],
    riskChecks: [
      "branch name is valid and not main/master",
      "declared paths are safe relative paths",
      "validation commands include phase demo and full verify gates",
      "evidence requirements are sufficient",
      "owner approval gates are present",
      "proposal does not mutate source",
      "proposal does not execute arbitrary code",
      "proposal does not require secrets",
      "proposal does not require paid providers",
      "proposal does not create or switch branches",
      "proposal cannot self-approve",
    ],
    ownerApprovalGates: [
      "owner approval required for proposal changes",
      "owner approval required for branch creation",
      "owner approval required for execution",
      "owner approval required for merge",
    ],
    localOnly: true,
    paidProviderRequired: false,
    cloudRequired: false,
    freeCoreDependency: false,
    mutatesSource: false,
    requiresSecrets: false,
    executesArbitraryCode: false,
    performsNetworkRefresh: false,
    createsBranches: false,
    switchesBranches: false,
    pushesBranches: false,
    opensPullRequests: false,
    appliesPatches: false,
    executesProposal: false,
    selfApprovesProposal: false,
    ownerApprovalRequiredForProposalChanges: true,
    ownerApprovalRequiredForBranchCreation: true,
    ownerApprovalRequiredForExecution: true,
    ownerApprovalRequiredForMerge: true,
    proposalActivationAllowed: false,
  };
}

export function inspectBranchReadinessV1(proposal = createDefaultBranchReadinessProposalV1(), options = {}) {
  const rootDir = options.rootDir || process.cwd();
  const runtimeDir = path.join(rootDir, RUNTIME_DIR);
  const reportDir = path.join(runtimeDir, REPORT_DIR);
  const eventPath = path.join(runtimeDir, EVENTS_FILE);
  const jsonPath = path.join(reportDir, SUMMARY_JSON);
  const markdownPath = path.join(reportDir, SUMMARY_MD);
  const historyPath = path.join(reportDir, HISTORY_JSONL);

  ensureDir(reportDir);

  const declaredPaths = uniqueStrings(proposal.declaredPaths);
  const validationCommands = uniqueStrings(proposal.validationCommands);
  const evidenceRequirements = uniqueStrings(proposal.evidenceRequirements);
  const riskChecks = uniqueStrings(proposal.riskChecks);
  const ownerApprovalGates = uniqueStrings(proposal.ownerApprovalGates);
  const declaredFileStates = proposal.declaredFileStates || {};

  const checks = [];
  const expectedPaths = [
    "docs/phases/PHASE_34_BRANCH_READINESS_INSPECTOR_V1.md",
    "scripts/lib/branch-readiness-inspector-v1.mjs",
    "scripts/run-branch-readiness-inspector-v1.mjs",
    "tests/integration/branch-readiness-inspector-v1.test.ts",
  ];
  const requiredCommands = [
    "npm run phase34:demo",
    "npm run phase34:verify",
    "npm run hygiene",
    "npm run build",
    "npm test",
    "npm run certify",
    "npm run verify",
  ];
  const expectedOwnerGates = [
    "owner approval required for proposal changes",
    "owner approval required for branch creation",
    "owner approval required for execution",
    "owner approval required for merge",
  ];

  checks.push(makeCheck("phase-id", proposal.phaseId === "phase-34-branch-readiness-inspector-v1", "Phase id must be phase-34-branch-readiness-inspector-v1."));
  checks.push(makeCheck("phase-number", proposal.phaseNumber === 34, "Phase number must be 34."));
  checks.push(makeCheck("branch-name-format", /^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(proposal.branchName || ""), "Branch name must use safe lowercase kebab-case."));
  checks.push(makeCheck("branch-name-not-main", !["main", "master", "develop"].includes(proposal.branchName), "Branch proposal must not target protected base branch names."));
  checks.push(makeCheck("source-proposal-link", Boolean(proposal.sourceProposalId), "Readiness inspection must identify the source branch proposal."));
  checks.push(makeCheck("packet-link", Boolean(proposal.packetId), "Readiness inspection must preserve packet lineage."));

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

  checks.push(makeCheck("evidence-count", evidenceRequirements.length >= 12, "At least 12 evidence requirements are required."));
  checks.push(makeCheck("risk-count", riskChecks.length >= 9, "At least 9 risk checks are required."));

  for (const gate of expectedOwnerGates) {
    checks.push(makeCheck(`owner-gate:${gate}`, ownerApprovalGates.includes(gate), `Owner gate is required: ${gate}`));
  }

  const requiredFalse = [
    "paidProviderRequired",
    "cloudRequired",
    "freeCoreDependency",
    "mutatesSource",
    "requiresSecrets",
    "executesArbitraryCode",
    "performsNetworkRefresh",
    "createsBranches",
    "switchesBranches",
    "pushesBranches",
    "opensPullRequests",
    "appliesPatches",
    "executesProposal",
    "selfApprovesProposal",
    "proposalActivationAllowed",
  ];

  checks.push(makeCheck("local-only", proposal.localOnly === true, "Branch readiness inspection must remain local-only."));

  for (const key of requiredFalse) {
    checks.push(makeCheck(`boundary:${key}`, proposal[key] === false, `${key} must remain false in Phase 34.`));
  }

  const requiredTrue = [
    "ownerApprovalRequiredForProposalChanges",
    "ownerApprovalRequiredForBranchCreation",
    "ownerApprovalRequiredForExecution",
    "ownerApprovalRequiredForMerge",
  ];

  for (const key of requiredTrue) {
    checks.push(makeCheck(`approval:${key}`, proposal[key] === true, `${key} must remain true in Phase 34.`));
  }

  const blockers = checks.filter((check) => !check.passed && check.severity === "blocker").map((check) => check.message);
  const warnings = checks.filter((check) => !check.passed && check.severity === "warning").map((check) => check.message);
  const validationPassedCount = checks.filter((check) => check.passed).length;
  const validationFailedCount = checks.length - validationPassedCount;
  const readinessStatus = blockers.length > 0 ? "blocked" : warnings.length > 0 ? "attention" : "ready";
  const ok = blockers.length === 0;

  const result = {
    ok,
    status: ok ? "passed" : "blocked",
    readinessStatus,
    proposalId: proposal.proposalId,
    proposalHash: sha256(proposal),
    phaseId: proposal.phaseId,
    branchName: proposal.branchName,
    sourceProposalId: proposal.sourceProposalId,
    packetId: proposal.packetId,
    declaredFileCount: declaredPaths.length,
    declaredFileTypeCount: new Set(declaredPaths.map((declaredPath) => normalizePath(declaredPath).split("/")[0])).size,
    validationCommandCount: validationCommands.length,
    evidenceRequirementCount: evidenceRequirements.length,
    riskCheckCount: riskChecks.length,
    ownerApprovalGateCount: ownerApprovalGates.length,
    validationCheckCount: checks.length,
    validationPassedCount,
    validationFailedCount,
    blockers,
    warnings,
    localOnly: proposal.localOnly === true,
    paidProviderRequired: proposal.paidProviderRequired === true,
    cloudRequired: proposal.cloudRequired === true,
    freeCoreDependency: proposal.freeCoreDependency === true,
    mutatesSource: proposal.mutatesSource === true,
    requiresSecrets: proposal.requiresSecrets === true,
    executesArbitraryCode: proposal.executesArbitraryCode === true,
    performsNetworkRefresh: proposal.performsNetworkRefresh === true,
    createsBranches: proposal.createsBranches === true,
    switchesBranches: proposal.switchesBranches === true,
    pushesBranches: proposal.pushesBranches === true,
    opensPullRequests: proposal.opensPullRequests === true,
    appliesPatches: proposal.appliesPatches === true,
    executesProposal: proposal.executesProposal === true,
    selfApprovesProposal: proposal.selfApprovesProposal === true,
    ownerApprovalRequiredForProposalChanges: proposal.ownerApprovalRequiredForProposalChanges === true,
    ownerApprovalRequiredForBranchCreation: proposal.ownerApprovalRequiredForBranchCreation === true,
    ownerApprovalRequiredForExecution: proposal.ownerApprovalRequiredForExecution === true,
    ownerApprovalRequiredForMerge: proposal.ownerApprovalRequiredForMerge === true,
    proposalActivationAllowed: proposal.proposalActivationAllowed === true,
    declaredPaths,
    validationCommands,
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
    type: "branch_readiness_inspected",
    proposalId: result.proposalId,
    phaseId: result.phaseId,
    branchName: result.branchName,
    readinessStatus: result.readinessStatus,
    ok: result.ok,
    validationCheckCount: result.validationCheckCount,
    validationFailedCount: result.validationFailedCount,
  };

  writeJson(jsonPath, result);
  writeText(markdownPath, renderBranchReadinessMarkdownV1(result));
  appendJsonl(historyPath, event);
  appendJsonl(eventPath, event);

  return result;
}

export function renderBranchReadinessMarkdownV1(result) {
  const blockerLines = result.blockers.length ? result.blockers.map((blocker) => `- ${blocker}`).join("\n") : "- None";
  const warningLines = result.warnings.length ? result.warnings.map((warning) => `- ${warning}`).join("\n") : "- None";
  const pathLines = result.declaredPaths.map((declaredPath) => `- ${declaredPath}`).join("\n");
  const commandLines = result.validationCommands.map((command) => `- \`${command}\``).join("\n");

  return `# Branch Readiness Inspector v1\n\n` +
    `Status: **${result.status}**\n\n` +
    `Readiness: **${result.readinessStatus}**\n\n` +
    `Proposal: \`${result.proposalId}\`\n\n` +
    `Branch: \`${result.branchName}\`\n\n` +
    `Validation checks: ${result.validationPassedCount}/${result.validationCheckCount} passed\n\n` +
    `## Blockers\n\n${blockerLines}\n\n` +
    `## Warnings\n\n${warningLines}\n\n` +
    `## Declared paths\n\n${pathLines}\n\n` +
    `## Validation commands\n\n${commandLines}\n\n` +
    `## Safety boundary\n\n` +
    `- Mutates source: ${result.mutatesSource}\n` +
    `- Requires secrets: ${result.requiresSecrets}\n` +
    `- Creates branches: ${result.createsBranches}\n` +
    `- Applies patches: ${result.appliesPatches}\n` +
    `- Executes proposal: ${result.executesProposal}\n` +
    `- Self-approves proposal: ${result.selfApprovesProposal}\n`;
}
