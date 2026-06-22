import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const RUNTIME_DIR = ".sera-approval-gated-action-plan";
const REPORT_DIR = "reports";
const EVENTS_FILE = "events.jsonl";
const SUMMARY_JSON = "approval-gated-action-plan-summary.json";
const SUMMARY_MD = "approval-gated-action-plan-summary.md";
const HISTORY_JSONL = "approval-gated-action-plan-history.jsonl";

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

const ACCEPTED_DECISION_STATUSES = new Set(["approved", "rejected", "needs_changes"]);
const ACCEPTED_ACTION_STATUSES = new Set(["planned", "blocked_rejected", "blocked_needs_changes"]);

function normalizeActionPlanItem(item) {
  if (typeof item === "string") {
    const id = item.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    return {
      id,
      label: item,
      targetAction: item,
      ownerDecisionReference: id,
      ownerDecisionStatus: "approved",
      ownerDecisionRecorded: true,
      ownerIdentity: "local-owner",
      actionPlanStatus: "planned",
      evidenceBundleReferences: ["phase42-default-evidence"],
      approvalQueueReferenceRequired: true,
      ownerDecisionRecorderReferenceRequired: true,
      evidenceBundleReferenceRequired: true,
      commandAllowlistReferenceRequired: true,
      branchReadinessReferenceRequired: true,
      branchProposalReferenceRequired: true,
      phasePacketReferenceRequired: true,
      redactionReviewRequired: true,
      immutableAuditTrailRequired: true,
      executionBlockedUntilFuturePhase: true,
      selfApproved: false,
      executesAfterGate: false,
      mutatesSourceAfterGate: false,
      createsBranchesAfterGate: false,
      switchesBranchesAfterGate: false,
      pushesBranchesAfterGate: false,
      opensPullRequestsAfterGate: false,
      appliesPatchesAfterGate: false,
      mergesAfterGate: false,
      tagsReleasesAfterGate: false,
      deletesBranchesAfterGate: false,
      storesSecrets: false,
    };
  }

  const label = String(item?.label || item?.targetAction || item?.id || "");
  const id = String(item?.id || label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
  return {
    id,
    label,
    targetAction: String(item?.targetAction || label),
    ownerDecisionReference: String(item?.ownerDecisionReference || ""),
    ownerDecisionStatus: String(item?.ownerDecisionStatus || "pending"),
    ownerDecisionRecorded: item?.ownerDecisionRecorded === true,
    ownerIdentity: String(item?.ownerIdentity || ""),
    actionPlanStatus: String(item?.actionPlanStatus || "pending"),
    evidenceBundleReferences: uniqueStrings(item?.evidenceBundleReferences || []),
    approvalQueueReferenceRequired: item?.approvalQueueReferenceRequired !== false,
    ownerDecisionRecorderReferenceRequired: item?.ownerDecisionRecorderReferenceRequired !== false,
    evidenceBundleReferenceRequired: item?.evidenceBundleReferenceRequired !== false,
    commandAllowlistReferenceRequired: item?.commandAllowlistReferenceRequired !== false,
    branchReadinessReferenceRequired: item?.branchReadinessReferenceRequired !== false,
    branchProposalReferenceRequired: item?.branchProposalReferenceRequired !== false,
    phasePacketReferenceRequired: item?.phasePacketReferenceRequired !== false,
    redactionReviewRequired: item?.redactionReviewRequired !== false,
    immutableAuditTrailRequired: item?.immutableAuditTrailRequired !== false,
    executionBlockedUntilFuturePhase: item?.executionBlockedUntilFuturePhase !== false,
    selfApproved: item?.selfApproved === true,
    executesAfterGate: item?.executesAfterGate === true,
    mutatesSourceAfterGate: item?.mutatesSourceAfterGate === true,
    createsBranchesAfterGate: item?.createsBranchesAfterGate === true,
    switchesBranchesAfterGate: item?.switchesBranchesAfterGate === true,
    pushesBranchesAfterGate: item?.pushesBranchesAfterGate === true,
    opensPullRequestsAfterGate: item?.opensPullRequestsAfterGate === true,
    appliesPatchesAfterGate: item?.appliesPatchesAfterGate === true,
    mergesAfterGate: item?.mergesAfterGate === true,
    tagsReleasesAfterGate: item?.tagsReleasesAfterGate === true,
    deletesBranchesAfterGate: item?.deletesBranchesAfterGate === true,
    storesSecrets: item?.storesSecrets === true,
  };
}

function expectedActionPlanStatus(ownerDecisionStatus) {
  if (ownerDecisionStatus === "approved") return "planned";
  if (ownerDecisionStatus === "needs_changes") return "blocked_needs_changes";
  if (ownerDecisionStatus === "rejected") return "blocked_rejected";
  return "blocked_rejected";
}

function actionPlanItemIsSafe(item) {
  const reasons = [];
  if (!item.id) reasons.push("action plan item id is required");
  if (!item.label) reasons.push("action plan item label is required");
  if (!item.targetAction) reasons.push("target action is required");
  if (!item.ownerDecisionReference) reasons.push("owner decision reference is required");
  if (!ACCEPTED_DECISION_STATUSES.has(item.ownerDecisionStatus)) reasons.push("owner decision status must be approved, rejected, or needs_changes");
  if (!ACCEPTED_ACTION_STATUSES.has(item.actionPlanStatus)) reasons.push("action plan status must be planned, blocked_rejected, or blocked_needs_changes");
  if (ACCEPTED_DECISION_STATUSES.has(item.ownerDecisionStatus) && item.actionPlanStatus !== expectedActionPlanStatus(item.ownerDecisionStatus)) {
    reasons.push("action plan status must mirror the recorded owner decision status");
  }
  if (item.ownerDecisionRecorded !== true) reasons.push("owner decision must be recorded before action planning");
  if (!item.ownerIdentity) reasons.push("owner identity is required for action planning");
  if (item.evidenceBundleReferences.length < 1) reasons.push("evidence bundle reference is required");
  if (item.approvalQueueReferenceRequired !== true) reasons.push("approval queue reference must be required");
  if (item.ownerDecisionRecorderReferenceRequired !== true) reasons.push("owner decision recorder reference must be required");
  if (item.evidenceBundleReferenceRequired !== true) reasons.push("evidence bundle reference must be required");
  if (item.commandAllowlistReferenceRequired !== true) reasons.push("command allowlist reference must be required");
  if (item.branchReadinessReferenceRequired !== true) reasons.push("branch readiness reference must be required");
  if (item.branchProposalReferenceRequired !== true) reasons.push("branch proposal reference must be required");
  if (item.phasePacketReferenceRequired !== true) reasons.push("phase packet reference must be required");
  if (item.redactionReviewRequired !== true) reasons.push("redaction review must be required");
  if (item.immutableAuditTrailRequired !== true) reasons.push("immutable audit trail must be required");
  if (item.executionBlockedUntilFuturePhase !== true) reasons.push("execution must remain blocked until a future phase");
  if (item.selfApproved !== false) reasons.push("self approval must be blocked");
  if (item.executesAfterGate !== false) reasons.push("execution after gate must remain disabled");
  if (item.mutatesSourceAfterGate !== false) reasons.push("source mutation after gate must remain disabled");
  if (item.createsBranchesAfterGate !== false) reasons.push("branch creation after gate must remain disabled");
  if (item.switchesBranchesAfterGate !== false) reasons.push("branch switching after gate must remain disabled");
  if (item.pushesBranchesAfterGate !== false) reasons.push("branch push after gate must remain disabled");
  if (item.opensPullRequestsAfterGate !== false) reasons.push("pull request creation after gate must remain disabled");
  if (item.appliesPatchesAfterGate !== false) reasons.push("patch application after gate must remain disabled");
  if (item.mergesAfterGate !== false) reasons.push("merge after gate must remain disabled");
  if (item.tagsReleasesAfterGate !== false) reasons.push("tagging after gate must remain disabled");
  if (item.deletesBranchesAfterGate !== false) reasons.push("branch deletion after gate must remain disabled");
  if (item.storesSecrets !== false) reasons.push("secret storage must remain disabled");
  return {
    allowed: reasons.length === 0,
    reasons,
  };
}

export function createDefaultApprovalGatedActionPlanV1() {
  const actionPlanItems = [
    ["overnight-worker-activation-plan", "Overnight worker activation plan", "overnight-worker-activation", "approved"],
    ["phase-packet-selection-plan", "Phase packet selection plan", "phase-packet-selection", "approved"],
    ["branch-proposal-selection-plan", "Branch proposal selection plan", "branch-proposal-selection", "approved"],
    ["branch-readiness-acceptance-plan", "Branch readiness acceptance plan", "branch-readiness-acceptance", "approved"],
    ["command-sequence-acceptance-plan", "Command sequence acceptance plan", "command-sequence-acceptance", "needs_changes"],
    ["evidence-bundle-acceptance-plan", "Evidence bundle acceptance plan", "evidence-bundle-acceptance", "approved"],
    ["owner-review-handoff-plan", "Owner review handoff plan", "owner-review-handoff", "approved"],
    ["emergency-stop-release-plan", "Emergency stop release plan", "emergency-stop-release", "rejected"],
  ].map(([id, label, ownerDecisionReference, ownerDecisionStatus]) => ({
    id,
    label,
    targetAction: label,
    ownerDecisionReference,
    ownerDecisionStatus,
    ownerDecisionRecorded: true,
    ownerIdentity: "local-owner",
    actionPlanStatus: expectedActionPlanStatus(ownerDecisionStatus),
    evidenceBundleReferences: [
      "owner-decision-recorder-summary.json",
      "evidence-capture-bundle-summary.json",
    ],
    approvalQueueReferenceRequired: true,
    ownerDecisionRecorderReferenceRequired: true,
    evidenceBundleReferenceRequired: true,
    commandAllowlistReferenceRequired: true,
    branchReadinessReferenceRequired: true,
    branchProposalReferenceRequired: true,
    phasePacketReferenceRequired: true,
    redactionReviewRequired: true,
    immutableAuditTrailRequired: true,
    executionBlockedUntilFuturePhase: true,
    selfApproved: false,
    executesAfterGate: false,
    mutatesSourceAfterGate: false,
    createsBranchesAfterGate: false,
    switchesBranchesAfterGate: false,
    pushesBranchesAfterGate: false,
    opensPullRequestsAfterGate: false,
    appliesPatchesAfterGate: false,
    mergesAfterGate: false,
    tagsReleasesAfterGate: false,
    deletesBranchesAfterGate: false,
    storesSecrets: false,
  }));

  return {
    schemaVersion: 1,
    actionPlanId: "phase42_approval_gated_action_plan",
    phaseId: "phase-42-approval-gated-action-plan-v1",
    phaseNumber: 42,
    title: "Approval-Gated Action Plan v1",
    branchName: "phase-42-approval-gated-action-plan-v1",
    sourcePhaseIds: [
      "phase-36-owner-approval-queue-v1",
      "phase-39-evidence-capture-bundle-v1",
      "phase-40-overnight-branch-worker-v1",
      "phase-41-owner-decision-recorder-v1",
    ],
    declaredPaths: [
      "docs/phases/PHASE_42_APPROVAL_GATED_ACTION_PLAN_V1.md",
      "scripts/lib/approval-gated-action-plan-v1.mjs",
      "scripts/run-approval-gated-action-plan-v1.mjs",
      "tests/integration/approval-gated-action-plan-v1.test.ts",
    ],
    declaredFileStates: {
      "docs/phases/PHASE_42_APPROVAL_GATED_ACTION_PLAN_V1.md": "new",
      "scripts/lib/approval-gated-action-plan-v1.mjs": "new",
      "scripts/run-approval-gated-action-plan-v1.mjs": "new",
      "tests/integration/approval-gated-action-plan-v1.test.ts": "new",
    },
    validationCommands: [
      "npm run phase42:demo",
      "npm run phase42:verify",
      "npm run hygiene",
      "npm run build",
      "npm test",
      "npm run certify",
      "npm run verify",
    ],
    actionPlanItems,
    evidenceRequirements: [
      "phase42 demo output includes approval-gated action plan status",
      "phase42 verify output passes free-core and knowledge checks",
      "source hygiene passes",
      "runtime artifact hygiene passes",
      "TypeScript build passes",
      "Vitest suite passes",
      "certification passes",
      "full verify passes",
      "approval-gated action plan JSON report is written",
      "approval-gated action plan Markdown report is written",
      "approval-gated action plan history is appended",
      "owner decision recorder reference is captured",
      "approval queue reference is captured",
      "evidence bundle reference is captured",
      "command allowlist reference is captured",
      "branch readiness reference is captured",
      "non-approved decisions remain blocked",
      "execution remains disabled after action planning",
    ],
    riskChecks: [
      "approval-gated action plan remains local-only",
      "approval-gated action plan remains planning-only",
      "action plan requires owner decision recorder binding",
      "action plan requires approval queue binding",
      "action plan requires evidence bundle binding",
      "action plan requires command allowlist binding",
      "action plan requires branch readiness binding",
      "non-approved decisions must block actions",
      "approved decisions cannot activate execution",
      "action plans cannot create branches",
      "action plans cannot apply patches",
      "action plans cannot merge branches",
      "action plans cannot push branches",
      "action plans cannot open pull requests",
      "action plans cannot store secrets",
      "S.E.R.A. cannot self-approve action plans",
    ],
    ownerApprovalGates: [
      "owner approval required for action plan recorder activation",
      "owner approval required for owner decision record selection",
      "owner approval required for approval queue binding selection",
      "owner approval required for evidence bundle binding selection",
      "owner approval required for command allowlist binding selection",
      "owner approval required for branch readiness binding selection",
      "owner approval required for action plan export",
      "owner approval required for emergency stop release",
    ],
    boundaries: {
      localOnly: true,
      actionPlanOnly: true,
      approvalGatedActionPlanOnly: true,
      mapsOwnerDecisionsToActionPlan: true,
      planningOnly: true,
      dryRunOnly: true,
      recordsOwnerDecision: false,
      decisionRecordingAllowed: false,
      actionCanAuthorizeExecution: false,
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
      actionPlanOnly: true,
      approvalGatedActionPlanOnly: true,
      mapsOwnerDecisionsToActionPlanRequired: true,
      planningOnly: true,
      dryRunOnly: true,
      ownerDecisionRecorderBindingRequired: true,
      approvalQueueBindingRequired: true,
      evidenceCaptureRequired: true,
      evidenceBundleBindingRequired: true,
      commandAllowlistRequired: true,
      branchReadinessRequired: true,
      branchProposalRequired: true,
      phasePacketRequired: true,
      redactionReviewRequired: true,
      immutableAuditTrailRequired: true,
      nonApprovedDecisionMustBlockAction: true,
      approvedDecisionStillCannotAuthorizeExecution: true,
      ownerDecisionRequired: true,
      emergencyStopRequired: true,
      sessionLockRequired: true,
      ownerApprovalRequiredForActionPlanRecorderActivation: true,
      ownerApprovalRequiredForOwnerDecisionRecordSelection: true,
      ownerApprovalRequiredForApprovalQueueBindingSelection: true,
      ownerApprovalRequiredForEvidenceBundleBindingSelection: true,
      ownerApprovalRequiredForCommandAllowlistBindingSelection: true,
      ownerApprovalRequiredForBranchReadinessBindingSelection: true,
      ownerApprovalRequiredForActionPlanExport: true,
      ownerApprovalRequiredForEmergencyStopRelease: true,
    },
  };
}

function validateDeclaredPaths(plan, rootDir) {
  const checks = [];
  const declaredPaths = uniqueStrings(plan.declaredPaths || []);
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

function validateRequiredCommands(plan) {
  const commands = uniqueStrings(plan.validationCommands || []);
  const required = [
    "npm run phase42:demo",
    "npm run phase42:verify",
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

function validateActionPlanItems(plan) {
  const items = (plan.actionPlanItems || []).map(normalizeActionPlanItem);
  const checks = [];
  for (const item of items) {
    const safety = actionPlanItemIsSafe(item);
    checks.push(makeCheck(`action-plan-item-safe:${item.id}`, safety.allowed, `Action plan item must pass Phase 42 safety checks: ${item.id}${safety.reasons.length ? ` — ${safety.reasons.join("; ")}` : ""}`));
    checks.push(makeCheck(`action-plan-owner-decision-reference:${item.id}`, Boolean(item.ownerDecisionReference), `Owner decision reference is required for action plan item: ${item.id}`));
    checks.push(makeCheck(`action-plan-no-self-approval:${item.id}`, item.selfApproved === false, `Self approval must be blocked for action plan item: ${item.id}`));
    checks.push(makeCheck(`action-plan-no-execution:${item.id}`, item.executesAfterGate === false, `Execution after gate must remain disabled for action plan item: ${item.id}`));
    checks.push(makeCheck(`action-plan-no-source-mutation:${item.id}`, item.mutatesSourceAfterGate === false, `Source mutation after gate must remain disabled for action plan item: ${item.id}`));
    checks.push(makeCheck(`action-plan-no-branch-creation:${item.id}`, item.createsBranchesAfterGate === false, `Branch creation after gate must remain disabled for action plan item: ${item.id}`));
    checks.push(makeCheck(`action-plan-evidence:${item.id}`, item.evidenceBundleReferences.length >= 1, `Evidence bundle reference is required for action plan item: ${item.id}`));
    checks.push(makeCheck(`action-plan-redaction:${item.id}`, item.redactionReviewRequired === true, `Redaction review is required for action plan item: ${item.id}`));
    if (item.ownerDecisionStatus !== "approved") {
      checks.push(makeCheck(`action-plan-non-approved-blocked:${item.id}`, item.actionPlanStatus.startsWith("blocked_"), `Non-approved owner decision must keep action blocked: ${item.id}`));
    }
  }
  checks.push(makeCheck("action-plan-item-count", items.length >= 8, "At least eight action plan items are required."));
  return { items, checks };
}

function validateCounts(plan) {
  const evidence = uniqueStrings(plan.evidenceRequirements || []);
  const risks = uniqueStrings(plan.riskChecks || []);
  const gates = uniqueStrings(plan.ownerApprovalGates || []);
  const requiredGates = [
    "owner approval required for action plan recorder activation",
    "owner approval required for owner decision record selection",
    "owner approval required for approval queue binding selection",
    "owner approval required for evidence bundle binding selection",
    "owner approval required for command allowlist binding selection",
    "owner approval required for branch readiness binding selection",
    "owner approval required for action plan export",
    "owner approval required for emergency stop release",
  ];

  return [
    makeCheck("evidence-count", evidence.length >= 12, "At least 12 evidence requirements are required."),
    makeCheck("risk-count", risks.length >= 12, "At least 12 risk checks are required."),
    makeCheck("owner-gate-count", gates.length >= 8, "At least eight owner approval gates are required."),
    ...requiredGates.map((gate) => makeCheck(`owner-gate:${gate}`, gates.includes(gate), `Owner gate is required: ${gate}`)),
  ];
}

function validateBoundaries(plan) {
  const boundaries = plan.boundaries || {};
  const requirements = plan.requirements || {};
  const mustBeFalse = [
    "recordsOwnerDecision",
    "decisionRecordingAllowed",
    "actionCanAuthorizeExecution",
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
    "actionPlanOnly",
    "approvalGatedActionPlanOnly",
    "mapsOwnerDecisionsToActionPlan",
    "planningOnly",
    "dryRunOnly",
  ];
  const requiredTrue = [
    "localOnly",
    "actionPlanOnly",
    "approvalGatedActionPlanOnly",
    "mapsOwnerDecisionsToActionPlanRequired",
    "planningOnly",
    "dryRunOnly",
    "ownerDecisionRecorderBindingRequired",
    "approvalQueueBindingRequired",
    "evidenceCaptureRequired",
    "evidenceBundleBindingRequired",
    "commandAllowlistRequired",
    "branchReadinessRequired",
    "branchProposalRequired",
    "phasePacketRequired",
    "redactionReviewRequired",
    "immutableAuditTrailRequired",
    "nonApprovedDecisionMustBlockAction",
    "approvedDecisionStillCannotAuthorizeExecution",
    "ownerDecisionRequired",
    "emergencyStopRequired",
    "sessionLockRequired",
    "ownerApprovalRequiredForActionPlanRecorderActivation",
    "ownerApprovalRequiredForOwnerDecisionRecordSelection",
    "ownerApprovalRequiredForApprovalQueueBindingSelection",
    "ownerApprovalRequiredForEvidenceBundleBindingSelection",
    "ownerApprovalRequiredForCommandAllowlistBindingSelection",
    "ownerApprovalRequiredForBranchReadinessBindingSelection",
    "ownerApprovalRequiredForActionPlanExport",
    "ownerApprovalRequiredForEmergencyStopRelease",
  ];

  return [
    ...mustBeTrue.map((field) => makeCheck(`boundary:${field}`, boundaries[field] === true, `${field} must remain true in Phase 42.`)),
    ...mustBeFalse.map((field) => makeCheck(`boundary:${field}`, boundaries[field] === false, `${field} must remain false in Phase 42.`)),
    ...requiredTrue.map((field) => makeCheck(`required:${field}`, requirements[field] === true, `${field} must remain true in Phase 42.`)),
  ];
}

export function renderApprovalGatedActionPlanMarkdownV1(result) {
  const lines = [];
  lines.push("# S.E.R.A. Phase 42 — Approval-Gated Action Plan v1");
  lines.push("");
  lines.push(`- Status: ${result.status}`);
  lines.push(`- Action plan status: ${result.approvalGatedActionPlanStatus}`);
  lines.push(`- Validation failures: ${result.validationFailedCount}`);
  lines.push(`- Action plan items: ${result.actionPlanItemCount}`);
  lines.push(`- Safe action plan items: ${result.safeActionPlanItemCount}`);
  lines.push(`- Blocked action plan items: ${result.blockedActionPlanItemCount}`);
  lines.push(`- Executable action plan items: ${result.executableActionPlanItemCount}`);
  lines.push(`- Maps owner decisions to action plan: ${result.mapsOwnerDecisionsToActionPlan}`);
  lines.push(`- Action can authorize execution: ${result.actionCanAuthorizeExecution}`);
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

export function inspectApprovalGatedActionPlanV1(plan = createDefaultApprovalGatedActionPlanV1(), options = {}) {
  const rootDir = options.rootDir || process.cwd();
  const runtimeDir = options.runtimeDir || path.join(rootDir, RUNTIME_DIR);
  const reportDir = path.join(runtimeDir, REPORT_DIR);
  const eventPath = path.join(runtimeDir, EVENTS_FILE);
  const jsonPath = path.join(reportDir, SUMMARY_JSON);
  const markdownPath = path.join(reportDir, SUMMARY_MD);
  const historyPath = path.join(reportDir, HISTORY_JSONL);

  ensureDir(reportDir);

  const normalizedPlan = {
    ...plan,
    declaredPaths: uniqueStrings(plan.declaredPaths || []),
    validationCommands: uniqueStrings(plan.validationCommands || []),
    evidenceRequirements: uniqueStrings(plan.evidenceRequirements || []),
    riskChecks: uniqueStrings(plan.riskChecks || []),
    ownerApprovalGates: uniqueStrings(plan.ownerApprovalGates || []),
  };

  const { items: actionPlanItems, checks: actionPlanChecks } = validateActionPlanItems(normalizedPlan);
  const checks = [
    ...validateDeclaredPaths(normalizedPlan, rootDir),
    ...validateRequiredCommands(normalizedPlan),
    ...actionPlanChecks,
    ...validateCounts(normalizedPlan),
    ...validateBoundaries(normalizedPlan),
  ];

  const failures = checks.filter((check) => !check.passed);
  const blockers = failures.filter((check) => check.severity === "blocker").map((check) => check.message);
  const safeActionPlanItems = actionPlanItems.filter((item) => actionPlanItemIsSafe(item).allowed);
  const unsafeActionPlanItems = actionPlanItems.filter((item) => !actionPlanItemIsSafe(item).allowed);
  const blockedActionPlanItems = safeActionPlanItems.filter((item) => item.actionPlanStatus.startsWith("blocked_"));
  const executableActionPlanItems = actionPlanItems.filter((item) => item.executesAfterGate === true);

  const result = {
    ok: failures.length === 0,
    status: failures.length === 0 ? "passed" : "failed",
    schemaVersion: 1,
    createdAt: nowIso(),
    phaseId: normalizedPlan.phaseId,
    phaseNumber: normalizedPlan.phaseNumber,
    approvalGatedActionPlanStatus: failures.length === 0 ? "ready" : "blocked",
    actionPlanHash: sha256(normalizedPlan),
    declaredFileCount: normalizedPlan.declaredPaths.length,
    validationCommandCount: normalizedPlan.validationCommands.length,
    actionPlanItemCount: actionPlanItems.length,
    safeActionPlanItemCount: safeActionPlanItems.length,
    unsafeActionPlanItemCount: unsafeActionPlanItems.length,
    blockedActionPlanItemCount: blockedActionPlanItems.length,
    executableActionPlanItemCount: executableActionPlanItems.length,
    evidenceRequirementCount: normalizedPlan.evidenceRequirements.length,
    riskCheckCount: normalizedPlan.riskChecks.length,
    ownerApprovalGateCount: normalizedPlan.ownerApprovalGates.length,
    validationFailedCount: failures.length,
    blockers,
    mapsOwnerDecisionsToActionPlan: normalizedPlan.boundaries?.mapsOwnerDecisionsToActionPlan === true,
    actionCanAuthorizeExecution: normalizedPlan.boundaries?.actionCanAuthorizeExecution === true,
    executionAllowedAfterApproval: normalizedPlan.boundaries?.executionAllowedAfterApproval === true,
    commandExecutionAllowed: normalizedPlan.boundaries?.commandExecutionAllowed === true,
    remoteExecutionAllowed: normalizedPlan.boundaries?.remoteExecutionAllowed === true,
    runnerConnectivityAllowed: normalizedPlan.boundaries?.runnerConnectivityAllowed === true,
    requiresSecrets: normalizedPlan.boundaries?.requiresSecrets === true,
    mutatesSource: normalizedPlan.boundaries?.mutatesSource === true,
    recordsOwnerDecision: normalizedPlan.boundaries?.recordsOwnerDecision === true,
    decisionRecordingAllowed: normalizedPlan.boundaries?.decisionRecordingAllowed === true,
    acceptsEvidenceAsOwnerApproved: normalizedPlan.boundaries?.acceptsEvidenceAsOwnerApproved === true,
    selfApprovesPlan: normalizedPlan.boundaries?.selfApprovesPlan === true,
    selfApprovalAllowed: normalizedPlan.boundaries?.selfApprovalAllowed === true,
    ownerDecisionRecorderBindingRequired: normalizedPlan.requirements?.ownerDecisionRecorderBindingRequired === true,
    approvalQueueBindingRequired: normalizedPlan.requirements?.approvalQueueBindingRequired === true,
    evidenceBundleBindingRequired: normalizedPlan.requirements?.evidenceBundleBindingRequired === true,
    commandAllowlistRequired: normalizedPlan.requirements?.commandAllowlistRequired === true,
    nonApprovedDecisionMustBlockAction: normalizedPlan.requirements?.nonApprovedDecisionMustBlockAction === true,
    actionPlanItems,
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

  const markdown = renderApprovalGatedActionPlanMarkdownV1(result);
  writeJson(jsonPath, result);
  writeText(markdownPath, markdown);
  appendJsonl(historyPath, {
    createdAt: result.createdAt,
    phaseId: result.phaseId,
    status: result.status,
    approvalGatedActionPlanStatus: result.approvalGatedActionPlanStatus,
    validationFailedCount: result.validationFailedCount,
    actionPlanHash: result.actionPlanHash,
  });
  appendJsonl(eventPath, {
    createdAt: result.createdAt,
    event: "phase42_approval_gated_action_plan_inspected",
    status: result.status,
    approvalGatedActionPlanStatus: result.approvalGatedActionPlanStatus,
  });

  return result;
}
