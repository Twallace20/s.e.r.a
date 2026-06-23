export type LocalWorkerDependencyAllowlistStatus = "dependency-allowlist-ready" | "blocked";

export type LocalWorkerDependencyAllowlistRequirementId =
  | "phase-66-rollback-plan-reviewed"
  | "dependency-inventory-required"
  | "package-manager-boundary-required"
  | "version-pinning-required"
  | "provenance-evidence-required"
  | "owner-dependency-approval-required";

export type LocalWorkerDependencyAllowlistRequirement = {
  id: LocalWorkerDependencyAllowlistRequirementId;
  label: string;
  state: "required" | "blocked";
  evidence: string;
  authority: "dependency_allowlist_only";
};

export type LocalWorkerDependencyAllowlistPacket = {
  phase: { number: 67; label: string; milestone: string };
  localWorkerDependencyAllowlistStatus: LocalWorkerDependencyAllowlistStatus;
  dependencyAllowlistMode: string;
  dependencyAllowlistSummary: {
    dependencyAllowlistId: string;
    owner: string;
    sourcePhase: string;
    safeState: string;
    phase66RollbackPlanReady: boolean;
    phase65WorkspaceBoundaryReady: boolean;
    ownerApprovalRequired: boolean;
    manualReviewRequired: boolean;
    explicitDependencyAllowlistRequired: boolean;
    dependencyInventoryRequired: boolean;
    packageManagerBoundaryRequired: boolean;
    versionPinningRequired: boolean;
    provenanceEvidenceRequired: boolean;
    ownerDependencyApprovalRequired: boolean;
    localWorkerReadyForInstall: boolean;
    dependencyAllowlistLocked: boolean;
    rollbackPlanLocked: boolean;
    workspaceBoundaryLocked: boolean;
    installScopeLocked: boolean;
    installApprovalRecordApproved: boolean;
    installPlanApproved: boolean;
    executionUnlockApproved: boolean;
    overnightWorkAuthorized: boolean;
    workerInstallApproved: boolean;
    workerInstalled: boolean;
    workerConnected: boolean;
    windowsSchedulerConfigured: boolean;
    scheduledExecutionAllowed: boolean;
    executableScheduleCount: number;
  };
  dependencyAllowlistFields: string[];
  dependencyAllowlistSignals: string[];
  dependencyAllowlistRequirements: LocalWorkerDependencyAllowlistRequirement[];
  evidenceRequirements: string[];
  routing: {
    suggestedQueue: string;
    reviewRequired: boolean;
    ownerDecisionRequired: boolean;
    dependencyAllowlistSigningAllowed: boolean;
    rollbackPlanSigningAllowed: boolean;
    workspaceBoundarySigningAllowed: boolean;
    scopeLockSigningAllowed: boolean;
    approvalRecordSigningAllowed: boolean;
    dependencyAllowlistApprovalAllowed: boolean;
    rollbackPlanApprovalAllowed: boolean;
    workspaceBoundaryApprovalAllowed: boolean;
    installScopeLockApprovalAllowed: boolean;
    installPlanApprovalAllowed: boolean;
    workerInstallAllowed: boolean;
    readinessUnlockAllowed: boolean;
    overnightExecutionAllowed: boolean;
    schedulerQueryAllowed: boolean;
    workerConnectionAllowed: boolean;
    workerSpawnAllowed: boolean;
    taskExecutionAllowed: boolean;
    commandExecutionAllowed: boolean;
    shellExecutionAllowed: boolean;
    autoRouteAllowed: boolean;
    autoProcessingAllowed: boolean;
  };
  boundaries: {
    localOnly: boolean;
    privateAppOnly: boolean;
    dependencyAllowlistOnly: boolean;
    ownerReviewOnly: boolean;
    declarativeOnly: boolean;
    readOnly: boolean;
    frontendOnly: boolean;
    noBackendLogic: boolean;
    noAuthentication: boolean;
    dependencyAllowlistSigningAllowed: boolean;
    rollbackPlanSigningAllowed: boolean;
    workspaceBoundarySigningAllowed: boolean;
    scopeLockSigningAllowed: boolean;
    approvalRecordSigningAllowed: boolean;
    dependencyDownloadAllowed: boolean;
    packageInstallAllowed: boolean;
    packageManagerExecutionAllowed: boolean;
    dependencyManifestMutationAllowed: boolean;
    lockfileMutationAllowed: boolean;
    rollbackExecutionAllowed: boolean;
    stateRestoreAllowed: boolean;
    backupCreationAllowed: boolean;
    executionUnlockAllowed: boolean;
    overnightExecutionAllowed: boolean;
    liveRunReportAllowed: boolean;
    installerExecutionAllowed: boolean;
    schedulerCreationAllowed: boolean;
    schedulerMutationAllowed: boolean;
    schedulerDeletionAllowed: boolean;
    schedulerEnableDisableAllowed: boolean;
    scheduledExecutionAllowed: boolean;
    schedulerQueryAllowed: boolean;
    powershellExecutionAllowed: boolean;
    schtasksExecutionAllowed: boolean;
    commandExecutionAllowed: boolean;
    shellExecutionAllowed: boolean;
    runnerConnectivityAllowed: boolean;
    liveWorkerConnectionAllowed: boolean;
    workerInstallAllowed: boolean;
    workerConnectionAllowed: boolean;
    workerSpawnAllowed: boolean;
    taskExecutionAllowed: boolean;
    healthPollingAllowed: boolean;
    liveHeartbeatAllowed: boolean;
    processInspectionAllowed: boolean;
    workspaceProbeAllowed: boolean;
    filesystemScanAllowed: boolean;
    mutatesSource: boolean;
    fileMutationAllowed: boolean;
    filesystemMutationAllowed: boolean;
    pathCreationAllowed: boolean;
    pathDeletionAllowed: boolean;
    recordPersistenceAllowed: boolean;
    taskPersistenceAllowed: boolean;
    morningPacketPersistenceAllowed: boolean;
    readinessGatePersistenceAllowed: boolean;
    unlockProposalPersistenceAllowed: boolean;
    installPlanPersistenceAllowed: boolean;
    installApprovalRecordPersistenceAllowed: boolean;
    installScopeLockPersistenceAllowed: boolean;
    workspaceBoundaryPersistenceAllowed: boolean;
    rollbackPlanPersistenceAllowed: boolean;
    dependencyAllowlistPersistenceAllowed: boolean;
    finalApprovalAllowed: boolean;
    autoApprovalAllowed: boolean;
    autoProcessingAllowed: boolean;
    autoRouteAllowed: boolean;
    autoMergeAllowed: boolean;
    selfApprovalAllowed: boolean;
  };
};

export const localWorkerDependencyAllowlistSafetyGates = [
  "Local worker dependency allowlist only",
  "Tyler remains the dependency allowlist owner",
  "Dependency allowlist is declarative only",
  "Dependency allowlist prepares owner review without approving installation",
  "Dependency allowlist does not sign approval",
  "Dependency allowlist does not lock dependencies as approved",
  "Dependency allowlist does not download dependencies",
  "Dependency allowlist does not install packages",
  "Dependency allowlist does not run package managers",
  "Dependency allowlist does not execute installers",
  "Dependency allowlist does not create lockfiles",
  "Dependency allowlist does not mutate dependency manifests",
  "Dependency allowlist does not mark the worker ready for install",
  "Dependency allowlist does not approve the install plan",
  "Dependency allowlist does not approve the install approval record",
  "Dependency allowlist does not approve the scope lock",
  "Dependency allowlist does not approve the workspace boundary",
  "Dependency allowlist does not approve the rollback plan",
  "Dependency allowlist does not approve worker installation",
  "Dependency allowlist does not approve execution",
  "Dependency allowlist does not authorize overnight work",
  "Dependency allowlist does not install a worker",
  "Dependency allowlist does not create files",
  "Dependency allowlist does not mutate files",
  "Dependency allowlist does not mutate source",
  "Dependency allowlist does not mutate the filesystem",
  "Dependency allowlist does not connect to a worker",
  "Dependency allowlist does not start a worker",
  "Dependency allowlist does not spawn a worker process",
  "Dependency allowlist does not poll worker health",
  "Dependency allowlist does not inspect running processes",
  "Dependency allowlist does not create scheduled tasks",
  "Dependency allowlist does not modify scheduled tasks",
  "Dependency allowlist does not delete scheduled tasks",
  "Dependency allowlist does not enable scheduled tasks",
  "Dependency allowlist does not disable scheduled tasks",
  "Dependency allowlist does not query Windows Task Scheduler",
  "Dependency allowlist does not run scheduled tasks",
  "Dependency allowlist does not execute PowerShell",
  "Dependency allowlist does not execute schtasks",
  "Dependency allowlist does not execute commands",
  "Dependency allowlist does not execute shell commands",
  "Dependency allowlist does not execute tasks",
  "Dependency allowlist does not persist task records",
  "Dependency allowlist does not persist owner records",
  "Dependency allowlist does not persist unlock proposal decisions",
  "Dependency allowlist does not persist install plan decisions",
  "Dependency allowlist does not persist approval records",
  "Dependency allowlist does not persist scope lock records",
  "Dependency allowlist does not persist workspace boundary records",
  "Dependency allowlist does not persist rollback records",
  "Dependency allowlist does not persist dependency allowlist records",
  "Dependency allowlist does not connect to runner infrastructure",
  "Dependency allowlist does not route work",
  "Dependency allowlist does not process work automatically",
  "Dependency allowlist does not merge branches",
  "Dependency allowlist cannot self-approve",
  "Phase 66 rollback plan prerequisite remains represented",
  "Phase 65 workspace boundary prerequisite remains represented",
  "Owner approval is required before any future install",
  "Manual review is required before any future install",
  "Explicit dependency allowlist is required before any future install",
  "Dependency inventory is required before any future install",
  "Package manager boundary is required before any future install",
  "Version pinning is required before any future install",
  "Dependency provenance evidence is required before any future install",
  "Owner dependency approval is required before any future install",
  "Local worker ready for install remains false by design",
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
  "Future install requires dry-run smoke test acknowledgement",
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
  "No backend dependency allowlist service",
  "No authentication changes",
  "No approval signing in this phase",
  "No scope lock signing in this phase",
  "No workspace boundary signing in this phase",
  "No rollback plan signing in this phase",
  "No dependency allowlist signing in this phase",
  "No approval persistence in this phase",
  "No scope lock persistence in this phase",
  "No workspace boundary persistence in this phase",
  "No rollback plan persistence in this phase",
  "No dependency allowlist persistence in this phase",
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
  "No backup creation"
] as const;

export const localWorkerDependencyAllowlistPacket: LocalWorkerDependencyAllowlistPacket = {
  phase: {
    number: 67,
    label: "Phase 67 · Local Worker Dependency Allowlist v1",
    milestone: "Owner-review dependency allowlist for any future local worker install path",
  },
  localWorkerDependencyAllowlistStatus: "dependency-allowlist-ready",
  dependencyAllowlistMode: "declarative-only owner review dependency allowlist",
  dependencyAllowlistSummary: {
    dependencyAllowlistId: "phase67_local_worker_dependency_allowlist",
    owner: "Tyler Wallace",
    sourcePhase: "Phase 66 Local Worker Rollback Plan",
    safeState: "dependency-allowlist-only",
    phase66RollbackPlanReady: true,
    phase65WorkspaceBoundaryReady: true,
    ownerApprovalRequired: true,
    manualReviewRequired: true,
    explicitDependencyAllowlistRequired: true,
    dependencyInventoryRequired: true,
    packageManagerBoundaryRequired: true,
    versionPinningRequired: true,
    provenanceEvidenceRequired: true,
    ownerDependencyApprovalRequired: true,
    localWorkerReadyForInstall: false,
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
  dependencyAllowlistFields: [
    "owner",
    "dependencyAllowlistId",
    "sourcePhase",
    "safeState",
    "dependencyInventoryRequired",
    "packageManagerBoundaryRequired",
    "versionPinningRequired",
    "provenanceEvidenceRequired",
  ],
  dependencyAllowlistSignals: [
    "dependency allowlist surface",
    "phase 66 rollback plan dependency",
    "dependency inventory requirement",
    "package manager boundary requirement",
    "version pinning requirement",
    "dependency provenance evidence requirement",
    "dependency allowlist not locked signal",
    "actual install remains blocked",
  ],
  dependencyAllowlistRequirements: [
    { id: "phase-66-rollback-plan-reviewed", label: "Phase 66 rollback plan reviewed", state: "required", evidence: "Owner must review Phase 66 rollback plan proof before any dependency allowlist can be considered.", authority: "dependency_allowlist_only" },
    { id: "dependency-inventory-required", label: "Dependency inventory required", state: "required", evidence: "Any future install path must identify every direct dependency before download or installation.", authority: "dependency_allowlist_only" },
    { id: "package-manager-boundary-required", label: "Package manager boundary required", state: "required", evidence: "Any future install path must state whether npm, pip, winget, Chocolatey, or any other package manager is in scope.", authority: "dependency_allowlist_only" },
    { id: "version-pinning-required", label: "Version pinning required", state: "required", evidence: "Any future install path must pin dependency versions or define an owner-approved version range.", authority: "dependency_allowlist_only" },
    { id: "provenance-evidence-required", label: "Provenance evidence required", state: "required", evidence: "Any future install path must document source, license, and trust evidence for each dependency.", authority: "dependency_allowlist_only" },
    { id: "owner-dependency-approval-required", label: "Owner dependency approval required", state: "required", evidence: "Tyler must approve the dependency allowlist in a later phase before any dependency can be downloaded or installed.", authority: "dependency_allowlist_only" },
  ],
  evidenceRequirements: [
    "Phase 66 rollback plan proof",
    "Dependency inventory requirement",
    "Package manager boundary requirement",
    "Version pinning requirement",
    "Dependency provenance evidence requirement",
    "Blocked install proof",
  ],
  routing: {
    suggestedQueue: "owner-review-local-worker-dependency-allowlist",
    reviewRequired: true,
    ownerDecisionRequired: true,
    dependencyAllowlistSigningAllowed: false,
    rollbackPlanSigningAllowed: false,
    workspaceBoundarySigningAllowed: false,
    scopeLockSigningAllowed: false,
    approvalRecordSigningAllowed: false,
    dependencyAllowlistApprovalAllowed: false,
    rollbackPlanApprovalAllowed: false,
    workspaceBoundaryApprovalAllowed: false,
    installScopeLockApprovalAllowed: false,
    installPlanApprovalAllowed: false,
    workerInstallAllowed: false,
    readinessUnlockAllowed: false,
    overnightExecutionAllowed: false,
    schedulerQueryAllowed: false,
    workerConnectionAllowed: false,
    workerSpawnAllowed: false,
    taskExecutionAllowed: false,
    commandExecutionAllowed: false,
    shellExecutionAllowed: false,
    autoRouteAllowed: false,
    autoProcessingAllowed: false,
  },
  boundaries: {
    localOnly: true,
    privateAppOnly: true,
    dependencyAllowlistOnly: true,
    ownerReviewOnly: true,
    declarativeOnly: true,
    readOnly: true,
    frontendOnly: true,
    noBackendLogic: true,
    noAuthentication: true,
    dependencyAllowlistSigningAllowed: false,
    rollbackPlanSigningAllowed: false,
    workspaceBoundarySigningAllowed: false,
    scopeLockSigningAllowed: false,
    approvalRecordSigningAllowed: false,
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
    finalApprovalAllowed: false,
    autoApprovalAllowed: false,
    autoProcessingAllowed: false,
    autoRouteAllowed: false,
    autoMergeAllowed: false,
    selfApprovalAllowed: false,
  },
};
