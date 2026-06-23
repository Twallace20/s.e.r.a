import fs from "node:fs";
import path from "node:path";

const declaredPaths = [
  "docs/phases/PHASE_69_LOCAL_WORKER_INSTALL_EVIDENCE_PACKET_V1.md",
  "scripts/lib/local-worker-install-evidence-packet-v1.mjs",
  "scripts/run-local-worker-install-evidence-packet-v1.mjs",
  "tests/integration/local-worker-install-evidence-packet-v1.test.ts",
  "apps/operator-console/src/local-worker-install-evidence-packet.ts"
];
const installEvidencePacketRequirements = [
  "phase-68-install-dry-run-reviewed",
  "evidence-packet-script-required",
  "evidence-packet-inputs-required",
  "evidence-packet-output-evidence-required",
  "no-install-mutation-required",
  "owner-evidence-packet-review-required",
];
const installEvidencePacketFields = ["owner", "installEvidencePacketId", "sourcePhase", "safeState", "evidenceSourceInventoryRequired", "evidenceBundleManifestRequired", "validationEvidenceRequired", "noInstallMutationProofRequired"];
const installEvidencePacketSignals = ["install evidence packet surface", "phase 68 install dry-run dependency", "evidence-packet script plan requirement", "evidence-packet inputs requirement", "evidence-packet output evidence requirement", "no-install mutation requirement", "install evidence packet not locked signal", "actual install remains blocked"];
const evidenceRequirements = ["Phase 68 install dry-run proof", "Evidence source inventory requirement", "Evidence bundle manifest requirement", "Validation evidence requirement", "No-install mutation proof requirement", "Blocked install proof"];
const safetyGates = [
  "Local worker install evidence packet only",
  "Tyler remains the install evidence packet owner",
  "Install evidence packet is declarative only",
  "Install evidence packet prepares owner review without approving installation",
  "Install evidence packet does not sign approval",
  "Install evidence packet does not lock evidence-packet as approved",
  "Install evidence packet does not download dependencies",
  "Install evidence packet does not install packages",
  "Install evidence packet does not run package managers",
  "Install evidence packet does not execute installers",
  "Install evidence packet does not create lockfiles",
  "Install evidence packet does not mutate dependency manifests",
  "Install evidence packet does not run smoke tests",
  "Install evidence packet does not create evidence-packet artifacts outside its local report folder",
  "Install evidence packet does not mark the worker ready for install",
  "Install evidence packet does not approve the dependency allowlist",
  "Install evidence packet does not approve the rollback plan",
  "Install evidence packet does not approve the workspace boundary",
  "Install evidence packet does not approve the scope lock",
  "Install evidence packet does not approve the install approval record",
  "Install evidence packet does not approve the install plan",
  "Install evidence packet does not approve worker installation",
  "Install evidence packet does not approve execution",
  "Install evidence packet does not authorize overnight work",
  "Install evidence packet does not install a worker",
  "Install evidence packet does not create files",
  "Install evidence packet does not mutate files",
  "Install evidence packet does not mutate source",
  "Install evidence packet does not mutate the filesystem",
  "Install evidence packet does not connect to a worker",
  "Install evidence packet does not start a worker",
  "Install evidence packet does not spawn a worker process",
  "Install evidence packet does not poll worker health",
  "Install evidence packet does not inspect running processes",
  "Install evidence packet does not create scheduled tasks",
  "Install evidence packet does not modify scheduled tasks",
  "Install evidence packet does not delete scheduled tasks",
  "Install evidence packet does not enable scheduled tasks",
  "Install evidence packet does not disable scheduled tasks",
  "Install evidence packet does not query Windows Task Scheduler",
  "Install evidence packet does not run scheduled tasks",
  "Install evidence packet does not execute PowerShell",
  "Install evidence packet does not execute schtasks",
  "Install evidence packet does not execute commands",
  "Install evidence packet does not execute shell commands",
  "Install evidence packet does not execute tasks",
  "Install evidence packet does not persist task records",
  "Install evidence packet does not persist owner records",
  "Install evidence packet does not persist unlock proposal decisions",
  "Install evidence packet does not persist install plan decisions",
  "Install evidence packet does not persist approval records",
  "Install evidence packet does not persist scope lock records",
  "Install evidence packet does not persist workspace boundary records",
  "Install evidence packet does not persist rollback records",
  "Install evidence packet does not persist dependency allowlist records",
  "Install evidence packet does not persist install evidence packet records",
  "Install evidence packet does not connect to runner infrastructure",
  "Install evidence packet does not route work",
  "Install evidence packet does not process work automatically",
  "Install evidence packet does not merge branches",
  "Install evidence packet cannot self-approve",
  "Phase 67 dependency allowlist prerequisite remains represented",
  "Phase 66 rollback plan prerequisite remains represented",
  "Owner approval is required before any future install",
  "Manual review is required before any future install",
  "Explicit install evidence packet is required before any future install",
  "Evidence packet script plan is required before any future install",
  "Evidence packet input inventory is required before any future install",
  "Evidence packet output evidence target is required before any future install",
  "No-install mutation policy is required before any future install",
  "Owner evidence review is required before any future install",
  "Local worker ready for install remains false by design",
  "Install evidence packet locked remains false by design",
  "Dependency allowlist locked remains false by design",
  "Rollback plan locked remains false by design",
  "Workspace boundary locked remains false by design",
  "Install scope locked remains false by design",
  "Install approval record approved remains false by design",
  "Install plan approved remains false by design",
  "Worker install approved remains false by design",
  "Execution unlock approved remains false by design",
  "Overnight work authorized remains false by design",
  "Worker installed remains false by design",
  "Worker connected remains false by design",
  "Windows scheduler configured remains false by design",
  "Scheduled execution remains false by design",
  "Executable schedule count remains zero",
  "Future install requires signed owner approval record",
  "Future install requires signed install scope lock",
  "Future install requires signed workspace boundary",
  "Future install requires signed rollback plan",
  "Future install requires signed dependency allowlist",
  "Future install requires signed install evidence packet review",
  "Future install requires exact workspace path boundary",
  "Future install requires allowed workspace path inventory",
  "Future install requires blocked workspace path inventory",
  "Future install requires dependency inventory boundary",
  "Future install requires package manager boundary",
  "Future install requires pinned dependency versions",
  "Future install requires dependency provenance evidence",
  "Future install requires environment variable boundary",
  "Future install requires secret handling boundary",
  "Future install requires rollback target",
  "Future install requires rollback trigger map",
  "Future install requires state restore boundary",
  "Future install requires rollback evidence target",
  "Future install requires install evidence target",
  "Future install requires worker health evidence target",
  "Future install requires evidence-packet script review",
  "Future install requires evidence-packet input inventory",
  "Future install requires evidence-packet output evidence",
  "Future install requires evidence-packet smoke test acknowledgement",
  "Future install requires scheduler hold acknowledgement",
  "Future install requires command allowlist acknowledgement",
  "Future install requires emergency stop acknowledgement",
  "Future install requires session lock acknowledgement",
  "Future install requires audit evidence acknowledgement",
  "Future install requires no-secret leakage acknowledgement",
  "Future install requires approval revocation path",
  "Future install requires out-of-scope dependency handling",
  "Future install requires owner re-approval for dependency changes",
  "Future install requires blocked dependency policy",
  "Future install requires dependency update policy",
  "Future install requires dependency vulnerability review policy",
  "Future install requires license review policy",
  "Future install requires transitive dependency review policy",
  "Future install requires dependency source trust policy",
  "Future install requires no-network evidence-packet boundary",
  "Future install requires no-write evidence-packet boundary",
  "Future install requires no-execution evidence-packet boundary",
  "Future install requires simulated install checklist",
  "Future install requires simulated dependency checklist",
  "Future install requires simulated rollback checklist",
  "Future install requires simulated health checklist",
  "Future install requires evidence-packet failure handling plan",
  "Future install requires evidence-packet retry policy",
  "Future install requires evidence-packet log redaction policy",
  "Future install requires evidence-packet artifact boundary",
  "Future install requires evidence-packet owner review queue",
  "Future install requires evidence-packet blocker reporting",
  "Future install requires evidence-packet risk rating",
  "Future install requires evidence-packet pass/fail criteria",
  "Future install requires evidence-packet smoke evidence plan",
  "Future install requires evidence-packet no-secret check",
  "Future install requires evidence-packet no-mutation proof",
  "Future install requires evidence-packet no-network proof",
  "Future install requires evidence-packet no-command proof",
  "No backend install evidence packet service",
  "No authentication changes",
  "No approval signing in this phase",
  "No scope lock signing in this phase",
  "No workspace boundary signing in this phase",
  "No rollback plan signing in this phase",
  "No dependency allowlist signing in this phase",
  "No install evidence packet signing in this phase",
  "No approval persistence in this phase",
  "No scope lock persistence in this phase",
  "No workspace boundary persistence in this phase",
  "No rollback plan persistence in this phase",
  "No dependency allowlist persistence in this phase",
  "No install evidence packet persistence in this phase",
  "No live worker connection",
  "No actual worker install",
  "No installer execution",
  "No dependency download",
  "No package install",
  "No package manager execution",
  "No dependency manifest mutation",
  "No lockfile mutation",
  "No workspace probing",
  "No filesystem scanning",
  "No path creation",
  "No path deletion",
  "No rollback execution",
  "No state restore execution",
  "No backup creation",
  "No network access",
  "No command evidence-packet execution",
  "No smoke test execution",
  "No artifact writes except local phase report",
  "Install evidence packet requires dry-run proof manifest",
  "Install evidence packet requires dependency allowlist proof reference",
  "Install evidence packet requires rollback plan proof reference",
  "Install evidence packet requires workspace boundary proof reference",
  "Install evidence packet requires scope lock proof reference",
  "Install evidence packet requires approval record proof reference",
  "Install evidence packet requires install plan proof reference",
  "Install evidence packet requires no-download proof reference",
  "Install evidence packet requires no-install proof reference",
  "Install evidence packet requires no-command proof reference",
  "Install evidence packet requires no-network proof reference",
  "Install evidence packet requires no-filesystem-mutation proof reference",
  "Install evidence packet requires no-artifact-mutation proof reference",
  "Install evidence packet requires no-secret-leakage proof reference",
  "Install evidence packet requires owner review checklist",
  "Install evidence packet requires blocker inventory",
  "Install evidence packet requires evidence source inventory",
  "Install evidence packet requires evidence bundle manifest",
  "Install evidence packet requires validation evidence inventory",
  "Install evidence packet requires readiness non-approval statement",
  "Install evidence packet cannot convert evidence into approval",
  "Install evidence packet cannot mark dry-run locked",
  "Install evidence packet cannot mark dependency allowlist locked",
  "Install evidence packet cannot mark rollback plan locked",
  "Install evidence packet cannot mark workspace boundary locked",
  "Install evidence packet cannot mark install scope locked",
  "Install evidence packet cannot mark worker ready for install",
  "Install evidence packet cannot approve worker installation",
  "Install evidence packet cannot persist approval records",
  "Install evidence packet cannot persist evidence approvals",
  "Install evidence packet remains frontend-only",
  "Install evidence packet remains local-only",
  "Install evidence packet remains private-app-only",
  "Install evidence packet remains owner-review-only",
  "Install evidence packet remains declarative-only",
  "Install evidence packet remains read-only",
  "Install evidence packet blocks report signing",
  "Install evidence packet blocks evidence promotion",
  "Install evidence packet blocks install execution",
  "Install evidence packet blocks self-approval"
];

export function createDefaultLocalWorkerInstallEvidencePacketV1() {
  return {
    declaredPaths: [...declaredPaths],
    summary: {
      localWorkerInstallEvidencePacketStatus: "install-evidence-packet-ready",
      phase68InstallDryRunReady: true,
      phase67DependencyAllowlistReady: true,
      ownerApprovalRequired: true,
      manualReviewRequired: true,
      explicitInstallEvidencePacketRequired: true,
      evidenceSourceInventoryRequired: true,
      evidenceBundleManifestRequired: true,
      validationEvidenceRequired: true,
      noInstallMutationProofRequired: true,
      ownerEvidenceReviewRequired: true,
      localWorkerReadyForInstall: false,
      installEvidencePacketLocked: false,
      dependencyAllowlistLocked: false,
      rollbackPlanLocked: false,
      workspaceBoundaryLocked: false,
      installScopeLocked: false,
      installApprovalRecordApproved: false,
      installPlanApproved: false,
      executionUnlockApproved: false,
      overnightWorkAuthorized: false,
      workerInstallApproved: false,
      workerInstalled: false,
      workerConnected: false,
      windowsSchedulerConfigured: false,
      scheduledExecutionAllowed: false,
      executableScheduleCount: 0,
    },
    counts: { installEvidencePacketRequirements, installEvidencePacketFields, installEvidencePacketSignals, evidenceRequirements, safetyGates },
    boundaries: {
      localOnly: true,
      privateAppOnly: true,
      installEvidencePacketOnly: true,
      ownerReviewOnly: true,
      declarativeOnly: true,
      readOnly: true,
      frontendOnly: true,
      noBackendLogic: true,
      noAuthentication: true,
      installEvidencePacketSigningAllowed: false,
      dependencyAllowlistSigningAllowed: false,
      rollbackPlanSigningAllowed: false,
      workspaceBoundarySigningAllowed: false,
      scopeLockSigningAllowed: false,
      approvalRecordSigningAllowed: false,
      evidencePacketExecutionAllowed: false,
      smokeTestExecutionAllowed: false,
      networkAccessAllowed: false,
      artifactMutationAllowed: false,
      dependencyDownloadAllowed: false,
      packageInstallAllowed: false,
      packageManagerExecutionAllowed: false,
      dependencyManifestMutationAllowed: false,
      lockfileMutationAllowed: false,
      rollbackExecutionAllowed: false,
      stateRestoreAllowed: false,
      backupCreationAllowed: false,
      executionUnlockAllowed: false,
      overnightExecutionAllowed: false,
      liveRunReportAllowed: false,
      installerExecutionAllowed: false,
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
      workspaceProbeAllowed: false,
      filesystemScanAllowed: false,
      mutatesSource: false,
      fileMutationAllowed: false,
      filesystemMutationAllowed: false,
      pathCreationAllowed: false,
      pathDeletionAllowed: false,
      recordPersistenceAllowed: false,
      taskPersistenceAllowed: false,
      morningPacketPersistenceAllowed: false,
      readinessGatePersistenceAllowed: false,
      unlockProposalPersistenceAllowed: false,
      installPlanPersistenceAllowed: false,
      installApprovalRecordPersistenceAllowed: false,
      installScopeLockPersistenceAllowed: false,
      workspaceBoundaryPersistenceAllowed: false,
      rollbackPlanPersistenceAllowed: false,
      dependencyAllowlistPersistenceAllowed: false,
      installEvidencePacketPersistenceAllowed: false,
      finalApprovalAllowed: false,
      autoApprovalAllowed: false,
      autoProcessingAllowed: false,
      autoRouteAllowed: false,
      autoMergeAllowed: false,
      selfApprovalAllowed: false,
    },
  };
}

function isSafeRelativePath(filePath) {
  return typeof filePath === "string" && filePath.length > 0 && !path.isAbsolute(filePath) && !filePath.split(/[\/]+/).includes("..");
}

function readIfExists(rootDir, relativePath) {
  const fullPath = path.join(rootDir, relativePath);
  return fs.existsSync(fullPath) ? fs.readFileSync(fullPath, "utf8") : "";
}

function writeReport(rootDir, result) {
  const outDir = path.join(rootDir, ".sera-local-worker-install-evidence-packet");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "phase69-local-worker-install-evidence-packet-status.json"), JSON.stringify(result, null, 2), "utf8");
  const markdown = [
    "# Phase 69 Local Worker Install Evidence Packet v1",
    "",
    `Status: ${result.status}`,
    `Validation failed count: ${result.validationFailedCount}`,
    `Install evidence packet status: ${result.localWorkerInstallEvidencePacketStatus}`,
    `Safety gates: ${result.safetyGateCount}`,
    `App bindings: ${result.appBindingCount}`,
    "",
    "This report is generated by the declarative Phase 69 install evidence packet checker. It does not execute a evidence-packet, run smoke tests, access the network, download dependencies, install packages, run package managers, mutate dependency manifests, create lockfiles, approve installation, install a worker, execute installers, connect to a worker, probe or scan the filesystem, run a scheduler, execute commands, execute tasks, persist install evidence packet records, mutate source, or self-approve.",
  ].join("\n");
  fs.writeFileSync(path.join(outDir, "phase69-local-worker-install-evidence-packet-status.md"), `${markdown}
`, "utf8");
}

export function inspectLocalWorkerInstallEvidencePacketV1(config = createDefaultLocalWorkerInstallEvidencePacketV1(), options = {}) {
  const rootDir = options.rootDir ?? process.cwd();
  const blockers = [];

  for (const declaredPath of config.declaredPaths ?? []) {
    if (!isSafeRelativePath(declaredPath)) blockers.push(`Declared path must be safe and relative: ${declaredPath}`);
    else if (!fs.existsSync(path.join(rootDir, declaredPath))) blockers.push(`Declared path missing: ${declaredPath}`);
  }

  const appContent = readIfExists(rootDir, "apps/operator-console/src/App.tsx");
  const requiredAppBindings = [
    "localWorkerInstallEvidencePacket.installEvidencePacketSummary.owner",
    "localWorkerInstallEvidencePacket.installEvidencePacketRequirements.length",
    "localWorkerInstallEvidencePacket.evidenceRequirements.length",
    "localWorkerInstallEvidencePacket.boundaries.workerInstallAllowed",
    "localWorkerInstallEvidencePacket.installEvidencePacketSummary.installEvidencePacketLocked",
  ];
  const missingAppBindings = requiredAppBindings.filter((binding) => !appContent.includes(binding));
  for (const binding of missingAppBindings) blockers.push(`App binding missing: ${binding}`);
  if (!appContent.includes("Local Worker Install Evidence Packet")) blockers.push("App card missing: Local Worker Install Evidence Packet");

  const pkgContent = readIfExists(rootDir, "package.json");
  if (!pkgContent.includes("phase69:demo")) blockers.push("package script missing: phase69:demo");
  if (!pkgContent.includes("phase69:verify")) blockers.push("package script missing: phase69:verify");

  const trueRequirements = ["phase68InstallDryRunReady", "phase67DependencyAllowlistReady", "ownerApprovalRequired", "manualReviewRequired", "explicitInstallEvidencePacketRequired", "evidenceSourceInventoryRequired", "evidenceBundleManifestRequired", "validationEvidenceRequired", "noInstallMutationProofRequired", "ownerEvidenceReviewRequired"];
  for (const field of trueRequirements) if (config.summary?.[field] !== true) blockers.push(`${field} must remain true`);

  const falseSummary = ["localWorkerReadyForInstall", "installEvidencePacketLocked", "dependencyAllowlistLocked", "rollbackPlanLocked", "workspaceBoundaryLocked", "installScopeLocked", "installApprovalRecordApproved", "installPlanApproved", "executionUnlockApproved", "overnightWorkAuthorized", "workerInstallApproved", "workerInstalled", "workerConnected", "windowsSchedulerConfigured", "scheduledExecutionAllowed"];
  for (const field of falseSummary) if (config.summary?.[field] !== false) blockers.push(`${field} must remain false`);
  if (config.summary?.executableScheduleCount !== 0) blockers.push("executableScheduleCount must remain zero");

  const trueBoundaryRequirements = ["localOnly", "privateAppOnly", "installEvidencePacketOnly", "ownerReviewOnly", "declarativeOnly", "readOnly", "frontendOnly", "noBackendLogic", "noAuthentication"];
  for (const field of trueBoundaryRequirements) if (config.boundaries?.[field] !== true) blockers.push(`${field} must remain true`);

  const falseBoundaryRequirements = ["installEvidencePacketSigningAllowed", "dependencyAllowlistSigningAllowed", "rollbackPlanSigningAllowed", "workspaceBoundarySigningAllowed", "scopeLockSigningAllowed", "approvalRecordSigningAllowed", "evidencePacketExecutionAllowed", "smokeTestExecutionAllowed", "networkAccessAllowed", "artifactMutationAllowed", "dependencyDownloadAllowed", "packageInstallAllowed", "packageManagerExecutionAllowed", "dependencyManifestMutationAllowed", "lockfileMutationAllowed", "rollbackExecutionAllowed", "stateRestoreAllowed", "backupCreationAllowed", "executionUnlockAllowed", "overnightExecutionAllowed", "liveRunReportAllowed", "installerExecutionAllowed", "schedulerCreationAllowed", "schedulerMutationAllowed", "schedulerDeletionAllowed", "schedulerEnableDisableAllowed", "scheduledExecutionAllowed", "schedulerQueryAllowed", "powershellExecutionAllowed", "schtasksExecutionAllowed", "commandExecutionAllowed", "shellExecutionAllowed", "runnerConnectivityAllowed", "liveWorkerConnectionAllowed", "workerInstallAllowed", "workerConnectionAllowed", "workerSpawnAllowed", "taskExecutionAllowed", "healthPollingAllowed", "liveHeartbeatAllowed", "processInspectionAllowed", "workspaceProbeAllowed", "filesystemScanAllowed", "mutatesSource", "fileMutationAllowed", "filesystemMutationAllowed", "pathCreationAllowed", "pathDeletionAllowed", "recordPersistenceAllowed", "taskPersistenceAllowed", "morningPacketPersistenceAllowed", "readinessGatePersistenceAllowed", "unlockProposalPersistenceAllowed", "installPlanPersistenceAllowed", "installApprovalRecordPersistenceAllowed", "installScopeLockPersistenceAllowed", "workspaceBoundaryPersistenceAllowed", "rollbackPlanPersistenceAllowed", "dependencyAllowlistPersistenceAllowed", "installEvidencePacketPersistenceAllowed", "finalApprovalAllowed", "autoApprovalAllowed", "autoProcessingAllowed", "autoRouteAllowed", "autoMergeAllowed", "selfApprovalAllowed"];
  for (const field of falseBoundaryRequirements) if (config.boundaries?.[field] !== false) blockers.push(`${field} must remain false`);

  const result = {
    ok: blockers.length === 0,
    status: blockers.length === 0 ? "passed" : "blocked",
    localWorkerInstallEvidencePacketStatus: blockers.length === 0 ? config.summary.localWorkerInstallEvidencePacketStatus : "blocked",
    validationFailedCount: blockers.length,
    blockers,
    declaredFileCount: config.declaredPaths?.length ?? 0,
    installEvidencePacketRequirementCount: config.counts?.installEvidencePacketRequirements?.length ?? 0,
    installEvidencePacketFieldCount: config.counts?.installEvidencePacketFields?.length ?? 0,
    installEvidencePacketEvidenceCount: config.counts?.evidenceRequirements?.length ?? 0,
    installEvidencePacketSignalCount: config.counts?.installEvidencePacketSignals?.length ?? 0,
    safetyGateCount: config.counts?.safetyGates?.length ?? 0,
    appBindingCount: requiredAppBindings.length,
    ...config.summary,
    ...config.boundaries,
  };

  if (result.declaredFileCount !== 5) result.blockers.push("declaredFileCount must equal 5");
  if (result.installEvidencePacketRequirementCount !== 6) result.blockers.push("installEvidencePacketRequirementCount must equal 6");
  if (result.installEvidencePacketFieldCount !== 8) result.blockers.push("installEvidencePacketFieldCount must equal 8");
  if (result.installEvidencePacketEvidenceCount !== 6) result.blockers.push("installEvidencePacketEvidenceCount must equal 6");
  if (result.installEvidencePacketSignalCount !== 8) result.blockers.push("installEvidencePacketSignalCount must equal 8");
  if (result.safetyGateCount !== 220) result.blockers.push("safetyGateCount must equal 220");
  if (result.appBindingCount !== 5) result.blockers.push("appBindingCount must equal 5");

  if (result.blockers.length > 0) {
    result.ok = false;
    result.status = "blocked";
    result.localWorkerInstallEvidencePacketStatus = "blocked";
    result.validationFailedCount = result.blockers.length;
  }

  if (options.writeArtifacts) writeReport(rootDir, result);
  return result;
}
