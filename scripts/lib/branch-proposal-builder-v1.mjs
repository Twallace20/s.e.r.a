import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeJson(filePath, data) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
}

function appendJsonl(filePath, data) {
  ensureDir(path.dirname(filePath));
  fs.appendFileSync(filePath, JSON.stringify(data) + "\n", "utf8");
}

function sha256(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

function unique(values) {
  return [...new Set(values)];
}

const DEFAULT_PACKET_SUMMARY = {
  packetId: "phase32_generated_phase_packet",
  sourcePhase: "phase-32-phase-packet-generator-v1",
  declaredFileCount: 4,
  validationCommandCount: 7,
  evidenceRequirementCount: 12,
  rollbackNoteCount: 4,
  ownerApprovalGateCount: 3,
  packetActivationAllowed: false
};

const DEFAULT_PROPOSAL_FILES = [
  {
    path: "docs/phases/PHASE_33_BRANCH_PROPOSAL_BUILDER_V1.md",
    type: "documentation",
    required: true,
    reason: "Define Phase 33 objective, branch proposal boundary, validation, and completion criteria."
  },
  {
    path: "scripts/lib/branch-proposal-builder-v1.mjs",
    type: "implementation",
    required: true,
    reason: "Create, validate, summarize, and report branch proposal blueprints."
  },
  {
    path: "scripts/run-branch-proposal-builder-v1.mjs",
    type: "demo_runner",
    required: true,
    reason: "Run the Phase 33 branch proposal demo and emit proof."
  },
  {
    path: "tests/integration/branch-proposal-builder-v1.test.ts",
    type: "integration_tests",
    required: true,
    reason: "Verify proposal creation, validation, evidence reporting, and safety boundaries."
  }
];

const DEFAULT_VALIDATION_COMMANDS = [
  "npm run phase33:demo",
  "npm run phase33:verify",
  "npm run hygiene",
  "npm run build",
  "npm test",
  "npm run certify",
  "npm run verify"
];

const DEFAULT_EVIDENCE_REQUIREMENTS = [
  "branch proposal summary JSON",
  "branch proposal summary Markdown",
  "branch proposal history JSONL",
  "phase33 demo output",
  "phase33 verify output",
  "hygiene output",
  "build output",
  "test output",
  "certify output",
  "full verify output",
  "git status proof before closeout",
  "tag proof after closeout"
];

const DEFAULT_RISK_CHECKS = [
  "branch name follows phase naming convention",
  "proposal references generated packet input",
  "declared files are unique",
  "validation commands are explicit",
  "evidence requirements are explicit",
  "owner approval gates are explicit",
  "proposal does not create a branch",
  "proposal does not apply patches",
  "proposal does not execute generated work"
];

const REQUIRED_BOUNDARIES = {
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
  ownerApprovalRequiredForMerge: true
};

export class BranchProposalBuilderV1 {
  constructor(options = {}) {
    this.rootDir = options.rootDir || process.cwd();
    this.runtimeDir = options.runtimeDir || path.join(this.rootDir, ".sera-branch-proposals");
    this.proposalDir = path.join(this.runtimeDir, "proposals");
    this.reportDir = path.join(this.runtimeDir, "reports");
    this.eventPath = path.join(this.runtimeDir, "events.jsonl");
    this.defaultProposalPath = path.join(this.proposalDir, "phase33-branch-proposal.json");
    this.summaryPath = path.join(this.reportDir, "branch-proposal-builder-summary.json");
    this.markdownPath = path.join(this.reportDir, "branch-proposal-builder-summary.md");
    this.historyPath = path.join(this.reportDir, "branch-proposal-builder-history.jsonl");
  }

  initialize() {
    ensureDir(this.runtimeDir);
    ensureDir(this.proposalDir);
    ensureDir(this.reportDir);
    if (!fs.existsSync(this.eventPath)) fs.writeFileSync(this.eventPath, "", "utf8");
    const result = {
      ok: true,
      status: "completed",
      schemaVersion: 1,
      runtimeDir: this.runtimeDir,
      proposalDir: this.proposalDir,
      eventPath: this.eventPath,
      reportDir: this.reportDir,
      defaultProposalPath: this.defaultProposalPath
    };
    this.recordEvent("initialized", result);
    return result;
  }

  recordEvent(type, data = {}) {
    appendJsonl(this.eventPath, { type, createdAt: new Date().toISOString(), ...data });
  }

  createDefaultProposal(overrides = {}) {
    const branchName = overrides.branchName || "phase-33-branch-proposal-builder-v1";
    const proposal = {
      proposalVersion: 1,
      proposalId: overrides.proposalId || "phase33_branch_proposal_builder_plan",
      phaseId: "phase-33-branch-proposal-builder-v1",
      phaseName: "Branch Proposal Builder v1",
      branchName,
      purpose: "Convert generated phase packet context into a reviewable branch proposal without creating, switching, pushing, or mutating branches.",
      createdAt: new Date().toISOString(),
      packetInput: overrides.packetInput || DEFAULT_PACKET_SUMMARY,
      declaredFiles: overrides.declaredFiles || DEFAULT_PROPOSAL_FILES,
      validationCommands: overrides.validationCommands || DEFAULT_VALIDATION_COMMANDS,
      evidenceRequirements: overrides.evidenceRequirements || DEFAULT_EVIDENCE_REQUIREMENTS,
      riskChecks: overrides.riskChecks || DEFAULT_RISK_CHECKS,
      ownerApprovalGates: overrides.ownerApprovalGates || [
        "approve branch proposal before branch creation",
        "approve execution plan before applying generated work",
        "approve merge/tag/branch cleanup after validation"
      ],
      branchPlan: {
        branchName,
        baseRef: overrides.baseRef || "main",
        headRef: branchName,
        createBranchCommand: "git switch -c " + branchName,
        proposalOnly: true,
        branchMayBeCreatedByBuilder: false,
        branchMayBePushedByBuilder: false,
        pullRequestMayBeOpenedByBuilder: false,
        ownerApprovalRequiredBeforeBranchCreation: true
      },
      boundaries: { ...REQUIRED_BOUNDARIES, ...(overrides.boundaries || {}) },
      activationPolicy: {
        proposalMayBeGenerated: true,
        proposalMayBeActivatedByBuilder: false,
        proposalMayMutateSource: false,
        proposalMayCreateBranches: false,
        proposalMayPushBranches: false,
        proposalMayOpenPullRequests: false,
        ownerApprovalRequired: true
      }
    };
    proposal.proposalHash = sha256(JSON.stringify({
      proposalVersion: proposal.proposalVersion,
      proposalId: proposal.proposalId,
      phaseId: proposal.phaseId,
      branchName: proposal.branchName,
      packetInput: proposal.packetInput,
      declaredFiles: proposal.declaredFiles,
      validationCommands: proposal.validationCommands,
      evidenceRequirements: proposal.evidenceRequirements,
      riskChecks: proposal.riskChecks,
      ownerApprovalGates: proposal.ownerApprovalGates,
      branchPlan: proposal.branchPlan,
      boundaries: proposal.boundaries,
      activationPolicy: proposal.activationPolicy
    }));
    writeJson(this.defaultProposalPath, proposal);
    this.recordEvent("proposal_created", { proposalId: proposal.proposalId, branchName: proposal.branchName });
    return proposal;
  }

  validateProposal(proposal) {
    const checks = [];
    const declaredPaths = proposal.declaredFiles.map((file) => file.path);

    checks.push({ name: "proposal_version_v1", passed: proposal.proposalVersion === 1 });
    checks.push({ name: "proposal_id_present", passed: Boolean(proposal.proposalId) });
    checks.push({ name: "phase_id_present", passed: proposal.phaseId === "phase-33-branch-proposal-builder-v1" });
    checks.push({ name: "branch_name_present", passed: Boolean(proposal.branchName) });
    checks.push({ name: "branch_name_phase_prefixed", passed: proposal.branchName.startsWith("phase-33-") });
    checks.push({ name: "packet_input_present", passed: Boolean(proposal.packetInput?.packetId) });
    checks.push({ name: "packet_activation_blocked", passed: proposal.packetInput?.packetActivationAllowed === false });
    checks.push({ name: "declared_file_count_minimum", passed: proposal.declaredFiles.length >= 4 });
    checks.push({ name: "declared_paths_unique", passed: unique(declaredPaths).length === declaredPaths.length });
    checks.push({ name: "validation_command_count_minimum", passed: proposal.validationCommands.length >= 7 });
    checks.push({ name: "evidence_requirement_count_minimum", passed: proposal.evidenceRequirements.length >= 10 });
    checks.push({ name: "risk_checks_present", passed: proposal.riskChecks.length >= 8 });
    checks.push({ name: "owner_gates_present", passed: proposal.ownerApprovalGates.length >= 3 });
    checks.push({ name: "proposal_hash_present", passed: Boolean(proposal.proposalHash && proposal.proposalHash.length === 64) });
    checks.push({ name: "branch_plan_proposal_only", passed: proposal.branchPlan?.proposalOnly === true });
    checks.push({ name: "branch_plan_base_main", passed: proposal.branchPlan?.baseRef === "main" });
    checks.push({ name: "branch_plan_no_creation_authority", passed: proposal.branchPlan?.branchMayBeCreatedByBuilder === false });
    checks.push({ name: "branch_plan_no_push_authority", passed: proposal.branchPlan?.branchMayBePushedByBuilder === false });
    checks.push({ name: "branch_plan_no_pr_authority", passed: proposal.branchPlan?.pullRequestMayBeOpenedByBuilder === false });

    for (const file of proposal.declaredFiles) {
      checks.push({ name: "declared_file_path_" + file.type, passed: Boolean(file.path) });
      checks.push({ name: "declared_file_required_" + file.type, passed: file.required === true });
      checks.push({ name: "declared_file_reason_" + file.type, passed: Boolean(file.reason) });
    }

    for (const command of DEFAULT_VALIDATION_COMMANDS) {
      checks.push({ name: "validation_command_" + command.replaceAll(" ", "_"), passed: proposal.validationCommands.includes(command) });
    }

    for (const riskCheck of DEFAULT_RISK_CHECKS) {
      checks.push({ name: "risk_check_" + riskCheck.replaceAll(" ", "_"), passed: proposal.riskChecks.includes(riskCheck) });
    }

    for (const [key, value] of Object.entries(REQUIRED_BOUNDARIES)) {
      checks.push({ name: "boundary_" + key, passed: proposal.boundaries?.[key] === value });
    }

    checks.push({ name: "activation_owner_required", passed: proposal.activationPolicy?.ownerApprovalRequired === true });
    checks.push({ name: "builder_cannot_activate", passed: proposal.activationPolicy?.proposalMayBeActivatedByBuilder === false });
    checks.push({ name: "proposal_cannot_mutate_source", passed: proposal.activationPolicy?.proposalMayMutateSource === false });
    checks.push({ name: "proposal_cannot_create_branches", passed: proposal.activationPolicy?.proposalMayCreateBranches === false });
    checks.push({ name: "proposal_cannot_push_branches", passed: proposal.activationPolicy?.proposalMayPushBranches === false });
    checks.push({ name: "proposal_cannot_open_prs", passed: proposal.activationPolicy?.proposalMayOpenPullRequests === false });

    const failed = checks.filter((check) => !check.passed);
    return {
      ok: failed.length === 0,
      status: failed.length === 0 ? "passed" : "failed",
      checkCount: checks.length,
      passedCount: checks.length - failed.length,
      failedCount: failed.length,
      checks,
      blockers: failed.map((check) => check.name)
    };
  }

  summarizeProposal(proposal, validation) {
    const typeCount = unique(proposal.declaredFiles.map((file) => file.type)).length;
    return {
      ok: validation.ok,
      status: validation.status,
      proposalId: proposal.proposalId,
      proposalHash: proposal.proposalHash,
      phaseId: proposal.phaseId,
      branchName: proposal.branchName,
      packetId: proposal.packetInput.packetId,
      declaredFileCount: proposal.declaredFiles.length,
      declaredFileTypeCount: typeCount,
      validationCommandCount: proposal.validationCommands.length,
      evidenceRequirementCount: proposal.evidenceRequirements.length,
      riskCheckCount: proposal.riskChecks.length,
      ownerApprovalGateCount: proposal.ownerApprovalGates.length,
      validationCheckCount: validation.checkCount,
      validationPassedCount: validation.passedCount,
      validationFailedCount: validation.failedCount,
      blockers: validation.blockers,
      localOnly: proposal.boundaries.localOnly,
      paidProviderRequired: proposal.boundaries.paidProviderRequired,
      cloudRequired: proposal.boundaries.cloudRequired,
      freeCoreDependency: proposal.boundaries.freeCoreDependency,
      mutatesSource: proposal.boundaries.mutatesSource,
      requiresSecrets: proposal.boundaries.requiresSecrets,
      executesArbitraryCode: proposal.boundaries.executesArbitraryCode,
      performsNetworkRefresh: proposal.boundaries.performsNetworkRefresh,
      createsBranches: proposal.boundaries.createsBranches,
      switchesBranches: proposal.boundaries.switchesBranches,
      pushesBranches: proposal.boundaries.pushesBranches,
      opensPullRequests: proposal.boundaries.opensPullRequests,
      appliesPatches: proposal.boundaries.appliesPatches,
      executesProposal: proposal.boundaries.executesProposal,
      selfApprovesProposal: proposal.boundaries.selfApprovesProposal,
      ownerApprovalRequiredForProposalChanges: proposal.boundaries.ownerApprovalRequiredForProposalChanges,
      ownerApprovalRequiredForBranchCreation: proposal.boundaries.ownerApprovalRequiredForBranchCreation,
      ownerApprovalRequiredForExecution: proposal.boundaries.ownerApprovalRequiredForExecution,
      ownerApprovalRequiredForMerge: proposal.boundaries.ownerApprovalRequiredForMerge,
      proposalActivationAllowed: proposal.activationPolicy.proposalMayBeActivatedByBuilder,
      declaredPaths: proposal.declaredFiles.map((file) => file.path),
      validationCommands: proposal.validationCommands
    };
  }

  writeMarkdown(summary) {
    const lines = [
      "# S.E.R.A. Phase 33 — Branch Proposal Builder v1 Summary",
      "",
      "- Status: " + summary.status,
      "- Proposal ID: " + summary.proposalId,
      "- Proposal hash: " + summary.proposalHash,
      "- Phase ID: " + summary.phaseId,
      "- Branch name: " + summary.branchName,
      "- Packet ID: " + summary.packetId,
      "- Declared files: " + summary.declaredFileCount,
      "- Validation commands: " + summary.validationCommandCount,
      "- Evidence requirements: " + summary.evidenceRequirementCount,
      "- Risk checks: " + summary.riskCheckCount,
      "- Owner approval gates: " + summary.ownerApprovalGateCount,
      "- Validation checks: " + summary.validationPassedCount + "/" + summary.validationCheckCount,
      "- Blockers: " + (summary.blockers.length ? summary.blockers.join(", ") : "none"),
      "",
      "## Boundaries",
      "",
      "- localOnly: " + summary.localOnly,
      "- paidProviderRequired: " + summary.paidProviderRequired,
      "- cloudRequired: " + summary.cloudRequired,
      "- mutatesSource: " + summary.mutatesSource,
      "- createsBranches: " + summary.createsBranches,
      "- switchesBranches: " + summary.switchesBranches,
      "- pushesBranches: " + summary.pushesBranches,
      "- opensPullRequests: " + summary.opensPullRequests,
      "- appliesPatches: " + summary.appliesPatches,
      "- executesProposal: " + summary.executesProposal,
      "- selfApprovesProposal: " + summary.selfApprovesProposal,
      "- ownerApprovalRequiredForBranchCreation: " + summary.ownerApprovalRequiredForBranchCreation,
      "",
      "## Declared paths",
      "",
      ...summary.declaredPaths.map((declaredPath) => "- `" + declaredPath + "`")
    ];
    fs.writeFileSync(this.markdownPath, lines.join("\n") + "\n", "utf8");
  }

  writeSummaryArtifacts() {
    const init = this.initialize();
    const proposal = this.createDefaultProposal();
    const validation = this.validateProposal(proposal);
    const summary = {
      ...this.summarizeProposal(proposal, validation),
      init,
      proposalPath: this.defaultProposalPath,
      jsonPath: this.summaryPath,
      markdownPath: this.markdownPath,
      historyPath: this.historyPath
    };
    writeJson(this.summaryPath, summary);
    this.writeMarkdown(summary);
    appendJsonl(this.historyPath, { createdAt: new Date().toISOString(), ...summary });
    this.recordEvent("summary_written", { proposalId: summary.proposalId, status: summary.status });
    return summary;
  }
}

export default BranchProposalBuilderV1;
