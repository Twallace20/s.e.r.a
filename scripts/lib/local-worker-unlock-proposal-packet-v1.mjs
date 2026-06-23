import fs from "node:fs";
import path from "node:path";

export function createDefaultLocalWorkerUnlockProposalPacketV1() {
  return {
    phase: 61,
    name: "local-worker-unlock-proposal-packet-v1",
    declaredPaths: [
      "docs/phases/PHASE_61_LOCAL_WORKER_UNLOCK_PROPOSAL_PACKET_V1.md",
      "apps/operator-console/src/local-worker-unlock-proposal-packet.ts",
      "scripts/lib/local-worker-unlock-proposal-packet-v1.mjs",
      "scripts/run-local-worker-unlock-proposal-packet-v1.mjs",
      "tests/integration/local-worker-unlock-proposal-packet-v1.test.ts",
    ],
    unlockProposalFields: [
      "owner",
      "proposalId",
      "sourcePhase",
      "safeState",
      "ownerApprovalRequired",
      "localWorkerReadyForUnlock",
      "unlockProposalApproved",
      "executionUnlockApproved"
],
    unlockProposalSignals: [
      "unlock proposal surface",
      "phase 60 readiness gate dependency",
      "owner approval requirement",
      "manual review requirement",
      "command allowlist compatibility requirement",
      "emergency stop compatibility requirement",
      "rollback and audit evidence requirement",
      "execution unlock remains blocked"
],
    requiredRequirementIds: ['phase-60-readiness-gate-reviewed', 'owner-approval-required', 'command-allowlist-required', 'emergency-stop-required', 'rollback-policy-required', 'audit-evidence-required'],
    evidenceRequirements: [
      "Phase 60 readiness gate closeout proof",
      "owner approval record requirement",
      "command allowlist compatibility evidence requirement",
      "emergency stop compatibility evidence requirement",
      "rollback policy evidence requirement",
      "audit and no-secret leakage evidence requirement"
],
    requiredSafetyGates: [
      "Local worker unlock proposal packet only",
      "Tyler remains the unlock proposal owner",
      "Unlock proposal is declarative only",
      "Unlock proposal prepares owner review without unlocking execution",
      "Unlock proposal does not approve execution",
      "Unlock proposal does not mark the worker ready for unlock",
      "Unlock proposal does not approve overnight work",
      "Unlock proposal does not approve worker installation",
      "Unlock proposal does not install a worker",
      "Unlock proposal does not connect to a worker",
      "Unlock proposal does not start a worker",
      "Unlock proposal does not spawn a worker process",
      "Unlock proposal does not poll worker health",
      "Unlock proposal does not inspect running processes",
      "Unlock proposal does not create scheduled tasks",
      "Unlock proposal does not modify scheduled tasks",
      "Unlock proposal does not delete scheduled tasks",
      "Unlock proposal does not enable scheduled tasks",
      "Unlock proposal does not disable scheduled tasks",
      "Unlock proposal does not query Windows Task Scheduler",
      "Unlock proposal does not run scheduled tasks",
      "Unlock proposal does not execute PowerShell",
      "Unlock proposal does not execute schtasks",
      "Unlock proposal does not execute commands",
      "Unlock proposal does not execute shell commands",
      "Unlock proposal does not execute tasks",
      "Unlock proposal does not persist task records",
      "Unlock proposal does not persist owner records",
      "Unlock proposal does not persist morning packet records",
      "Unlock proposal does not persist readiness decisions",
      "Unlock proposal does not persist unlock proposal decisions",
      "Unlock proposal does not mutate files",
      "Unlock proposal does not mutate source",
      "Unlock proposal does not mutate the filesystem",
      "Unlock proposal does not connect to runner infrastructure",
      "Unlock proposal does not route work",
      "Unlock proposal does not process work automatically",
      "Unlock proposal does not merge branches",
      "Unlock proposal cannot self-approve",
      "Phase 60 readiness gate prerequisite remains represented",
      "All readiness surfaces remain represented",
      "Owner approval is required before any future unlock",
      "Manual review is required before any future unlock",
      "Emergency stop compatibility is required before any future unlock",
      "Command allowlist compatibility is required before any future unlock",
      "Rollback policy is required before any future unlock",
      "Audit evidence is required before any future unlock",
      "Local worker ready for unlock remains false by design",
      "Unlock proposal approved remains false by design",
      "Execution unlock approved remains false by design",
      "Overnight work authorized remains false by design",
      "Worker install approved remains false by design",
      "Worker installed remains false by design",
      "Worker connected remains false by design",
      "Windows scheduler configured remains false by design",
      "Scheduled execution remains false by design",
      "Executable schedule count remains zero",
      "Future unlock requires owner approval record",
      "Future unlock requires signed scope for allowed worker responsibilities",
      "Future unlock requires worker installation plan",
      "Future unlock requires worker health evidence plan",
      "Future unlock requires dry-run evidence plan",
      "Future unlock requires scheduler readiness plan",
      "Future unlock requires morning packet review plan",
      "Future unlock requires command allowlist review",
      "Future unlock requires emergency stop review",
      "Future unlock requires session lock review",
      "Future unlock requires workspace boundary review",
      "Future unlock requires rollback review",
      "Future unlock requires audit evidence review",
      "Future unlock requires no-secret leakage review",
      "No backend unlock service",
      "No authentication changes",
      "No live worker connection"
],
    requiredAppBindings: [
      "localWorkerUnlockProposalPacket.proposalSummary.owner",
      "localWorkerUnlockProposalPacket.unlockProposalRequirements.length",
      "localWorkerUnlockProposalPacket.evidenceRequirements.length",
      "localWorkerUnlockProposalPacket.boundaries.executionUnlockAllowed",
      "localWorkerUnlockProposalPacket.proposalSummary.unlockProposalApproved",
    ],
    summary: {
      phase60ReadinessGateReady: true,
      allReadinessSurfacesRepresented: true,
      ownerApprovalRequired: true,
      manualReviewRequired: true,
      emergencyStopRequired: true,
      commandAllowlistRequired: true,
      rollbackPolicyRequired: true,
      auditEvidenceRequired: true,
      localWorkerReadyForUnlock: false,
      unlockProposalApproved: false,
      executionUnlockApproved: false,
      overnightWorkAuthorized: false,
      workerInstallApproved: false,
      workerInstalled: false,
      workerConnected: false,
      windowsSchedulerConfigured: false,
      scheduledExecutionAllowed: false,
      executableScheduleCount: 0,
    },
    boundaries: {
      localOnly: true,
      privateAppOnly: true,
      unlockProposalOnly: true,
      ownerReviewOnly: true,
      declarativeOnly: true,
      readOnly: true,
      frontendOnly: true,
      noBackendLogic: true,
      noAuthentication: true,
      executionUnlockAllowed: false,
      overnightExecutionAllowed: false,
      liveRunReportAllowed: false,
      schedulerCreationAllowed: false,
      schedulerMutationAllowed: false,
      schedulerDeletionAllowed: false,
      schedulerEnableDisableAllowed: false,
      scheduledExecutionAllowed: false,
      schedulerQueryAllowed: false,
      powershellExecutionAllowed: false,
      schtasksExecutionAllowed: false,
      commandExecutionAllowed: false,
      shellExecutionAllowed: false,
      runnerConnectivityAllowed: false,
      liveWorkerConnectionAllowed: false,
      workerInstallAllowed: false,
      workerConnectionAllowed: false,
      workerSpawnAllowed: false,
      taskExecutionAllowed: false,
      healthPollingAllowed: false,
      liveHeartbeatAllowed: false,
      processInspectionAllowed: false,
      mutatesSource: false,
      fileMutationAllowed: false,
      filesystemMutationAllowed: false,
      recordPersistenceAllowed: false,
      taskPersistenceAllowed: false,
      morningPacketPersistenceAllowed: false,
      readinessGatePersistenceAllowed: false,
      unlockProposalPersistenceAllowed: false,
      finalApprovalAllowed: false,
      autoApprovalAllowed: false,
      autoProcessingAllowed: false,
      autoRouteAllowed: false,
      autoMergeAllowed: false,
      selfApprovalAllowed: false,
    },
  };
}

function isSafeRelativePath(value) {
  return typeof value === "string" && value.length > 0 && !path.isAbsolute(value) && !value.split(/[\/]+/).includes("..");
}

function readTextIfExists(filePath) {
  if (!fs.existsSync(filePath)) return "";
  return fs.readFileSync(filePath, "utf8");
}

function ensureIncludesAll(content, required, label, blockers) {
  for (const item of required) {
    if (!content.includes(item)) blockers.push(`${label} missing required binding: ${item}`);
  }
}

function writeReports(rootDir, result) {
  const reportDir = path.join(rootDir, ".sera-local-worker-unlock-proposal-packet");
  fs.mkdirSync(reportDir, { recursive: true });

  const jsonPath = path.join(reportDir, "phase61-local-worker-unlock-proposal-packet-status.json");
  const mdPath = path.join(reportDir, "phase61-local-worker-unlock-proposal-packet-status.md");

  fs.writeFileSync(jsonPath, `${JSON.stringify(result, null, 2)}
`, "utf8");
  fs.writeFileSync(
    mdPath,
    [
      "# Phase 61 Local Worker Unlock Proposal Packet v1",
      "",
      `Status: ${result.status}`,
      `Ready: ${result.ok ? "yes" : "no"}`,
      `Validation failures: ${result.validationFailedCount}`,
      `Owner approval required: ${result.ownerApprovalRequired ? "yes" : "no"}`,
      `Unlock proposal approved: ${result.unlockProposalApproved ? "yes" : "no"}`,
      `Execution unlock approved: ${result.executionUnlockApproved ? "yes" : "no"}`,
      `Command execution allowed: ${result.commandExecutionAllowed ? "yes" : "no"}`,
      `Worker install allowed: ${result.workerInstallAllowed ? "yes" : "no"}`,
      "",
      "This report is a local unlock proposal artifact only. It does not install workers, connect workers, schedule work, execute commands, execute tasks, persist unlock decisions, mutate files, mutate source, or approve execution.",
      "",
    ].join("\n"),
    "utf8",
  );
}

export function inspectLocalWorkerUnlockProposalPacketV1(config = createDefaultLocalWorkerUnlockProposalPacketV1(), options = {}) {
  const rootDir = options.rootDir || process.cwd();
  const writeArtifacts = options.writeArtifacts !== false;
  const blockers = [];

  for (const declaredPath of config.declaredPaths || []) {
    if (!isSafeRelativePath(declaredPath)) {
      blockers.push(`Declared path must be safe and relative: ${declaredPath}`);
      continue;
    }
    if (!fs.existsSync(path.join(rootDir, declaredPath))) blockers.push(`Declared file missing: ${declaredPath}`);
  }

  if ((config.declaredPaths || []).length !== 5) blockers.push("Phase 61 must declare exactly 5 source files");
  if ((config.unlockProposalFields || []).length !== 8) blockers.push("Phase 61 must expose exactly 8 unlock proposal fields");
  if ((config.unlockProposalSignals || []).length !== 8) blockers.push("Phase 61 must expose exactly 8 unlock proposal signals");
  if ((config.requiredRequirementIds || []).length !== 6) blockers.push("Phase 61 must expose exactly 6 unlock proposal requirements");
  if ((config.evidenceRequirements || []).length !== 6) blockers.push("Phase 61 must expose exactly 6 evidence requirements");
  if ((config.requiredSafetyGates || []).length !== 74) blockers.push("Phase 61 must expose exactly 74 safety gates");
  if ((config.requiredAppBindings || []).length !== 5) blockers.push("Phase 61 must expose exactly 5 app bindings");

  const appContent = readTextIfExists(path.join(rootDir, "apps/operator-console/src/App.tsx"));
  ensureIncludesAll(appContent, config.requiredAppBindings || [], "App.tsx", blockers);
  if (!appContent.includes("Local Worker Unlock Proposal Packet")) blockers.push("App.tsx missing Local Worker Unlock Proposal Packet card");

  const packageJsonText = readTextIfExists(path.join(rootDir, "package.json"));
  if (!packageJsonText.includes('"phase61:demo"')) blockers.push("package.json missing phase61:demo script");
  if (!packageJsonText.includes('"phase61:verify"')) blockers.push("package.json missing phase61:verify script");

  const requiredTrueBoundaries = [
    "localOnly",
    "privateAppOnly",
    "unlockProposalOnly",
    "ownerReviewOnly",
    "declarativeOnly",
    "readOnly",
    "frontendOnly",
    "noBackendLogic",
    "noAuthentication",
  ];
  const requiredFalseBoundaries = [
    "executionUnlockAllowed",
    "overnightExecutionAllowed",
    "liveRunReportAllowed",
    "schedulerCreationAllowed",
    "schedulerMutationAllowed",
    "schedulerDeletionAllowed",
    "schedulerEnableDisableAllowed",
    "scheduledExecutionAllowed",
    "schedulerQueryAllowed",
    "powershellExecutionAllowed",
    "schtasksExecutionAllowed",
    "commandExecutionAllowed",
    "shellExecutionAllowed",
    "runnerConnectivityAllowed",
    "liveWorkerConnectionAllowed",
    "workerInstallAllowed",
    "workerConnectionAllowed",
    "workerSpawnAllowed",
    "taskExecutionAllowed",
    "healthPollingAllowed",
    "liveHeartbeatAllowed",
    "processInspectionAllowed",
    "mutatesSource",
    "fileMutationAllowed",
    "filesystemMutationAllowed",
    "recordPersistenceAllowed",
    "taskPersistenceAllowed",
    "morningPacketPersistenceAllowed",
    "readinessGatePersistenceAllowed",
    "unlockProposalPersistenceAllowed",
    "finalApprovalAllowed",
    "autoApprovalAllowed",
    "autoProcessingAllowed",
    "autoRouteAllowed",
    "autoMergeAllowed",
    "selfApprovalAllowed",
  ];

  for (const key of requiredTrueBoundaries) {
    if (config.boundaries[key] !== true) blockers.push(`${key} must remain true`);
  }
  for (const key of requiredFalseBoundaries) {
    if (config.boundaries[key] !== false) blockers.push(`${key} must remain false`);
  }

  const requiredTrueSummary = [
    "phase60ReadinessGateReady",
    "allReadinessSurfacesRepresented",
    "ownerApprovalRequired",
    "manualReviewRequired",
    "emergencyStopRequired",
    "commandAllowlistRequired",
    "rollbackPolicyRequired",
    "auditEvidenceRequired",
  ];
  const requiredFalseSummary = [
    "localWorkerReadyForUnlock",
    "unlockProposalApproved",
    "executionUnlockApproved",
    "overnightWorkAuthorized",
    "workerInstallApproved",
    "workerInstalled",
    "workerConnected",
    "windowsSchedulerConfigured",
    "scheduledExecutionAllowed",
  ];
  for (const key of requiredTrueSummary) {
    if (config.summary[key] !== true) blockers.push(`${key} must remain true`);
  }
  for (const key of requiredFalseSummary) {
    if (config.summary[key] !== false) blockers.push(`${key} must remain false`);
  }
  if (config.summary.executableScheduleCount !== 0) blockers.push("executableScheduleCount must remain zero");

  const ok = blockers.length === 0;
  const result = {
    ok,
    status: ok ? "passed" : "blocked",
    localWorkerUnlockProposalPacketStatus: ok ? "ready" : "blocked",
    validationFailedCount: blockers.length,
    blockers,
    declaredFileCount: config.declaredPaths.length,
    unlockProposalRequirementCount: config.requiredRequirementIds.length,
    unlockProposalFieldCount: config.unlockProposalFields.length,
    unlockProposalEvidenceCount: config.evidenceRequirements.length,
    unlockProposalSignalCount: config.unlockProposalSignals.length,
    safetyGateCount: config.requiredSafetyGates.length,
    appBindingCount: config.requiredAppBindings.length,
    ...config.summary,
    ...config.boundaries,
  };

  if (writeArtifacts) writeReports(rootDir, result);
  return result;
}

export function runLocalWorkerUnlockProposalPacketV1(options = {}) {
  const result = inspectLocalWorkerUnlockProposalPacketV1(createDefaultLocalWorkerUnlockProposalPacketV1(), options);
  if (!result.ok) {
    const error = new Error(`Phase 61 local worker unlock proposal packet failed: ${result.blockers.join("; ")}`);
    error.result = result;
    throw error;
  }
  return result;
}
