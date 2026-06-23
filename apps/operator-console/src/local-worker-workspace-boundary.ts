export type LocalWorkerWorkspaceBoundaryStatus = "workspace-boundary-ready" | "blocked";

export type LocalWorkerWorkspaceBoundaryRequirementId =
  | "phase-64-scope-lock-reviewed"
  | "exact-workspace-root-required"
  | "allowed-path-inventory-required"
  | "blocked-path-inventory-required"
  | "rollback-workspace-required"
  | "workspace-evidence-target-required";

export type LocalWorkerWorkspaceBoundaryRequirement = {
  id: LocalWorkerWorkspaceBoundaryRequirementId;
  label: string;
  state: "required" | "blocked";
  evidence: string;
  authority: "workspace_boundary_only";
};

export type LocalWorkerWorkspaceBoundaryPacket = {
  phase: { number: 65; label: string; milestone: string };
  localWorkerWorkspaceBoundaryStatus: LocalWorkerWorkspaceBoundaryStatus;
  workspaceBoundaryMode: string;
  workspaceBoundarySummary: {
    workspaceBoundaryId: string;
    owner: string;
    sourcePhase: string;
    safeState: string;
    phase64ScopeLockReady: boolean;
    phase63ApprovalRecordReady: boolean;
    ownerApprovalRequired: boolean;
    manualReviewRequired: boolean;
    explicitWorkspaceBoundaryRequired: boolean;
    exactWorkspaceRootRequired: boolean;
    allowedPathInventoryRequired: boolean;
    blockedPathInventoryRequired: boolean;
    rollbackWorkspaceRequired: boolean;
    workspaceEvidenceTargetRequired: boolean;
    localWorkerReadyForInstall: boolean;
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
  workspaceBoundaryFields: string[];
  workspaceBoundarySignals: string[];
  workspaceBoundaryRequirements: LocalWorkerWorkspaceBoundaryRequirement[];
  evidenceRequirements: string[];
  routing: {
    suggestedQueue: string;
    reviewRequired: boolean;
    ownerDecisionRequired: boolean;
    workspaceBoundarySigningAllowed: boolean;
    scopeLockSigningAllowed: boolean;
    approvalRecordSigningAllowed: boolean;
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
    workspaceBoundaryOnly: boolean;
    ownerReviewOnly: boolean;
    declarativeOnly: boolean;
    readOnly: boolean;
    frontendOnly: boolean;
    noBackendLogic: boolean;
    noAuthentication: boolean;
    workspaceBoundarySigningAllowed: boolean;
    scopeLockSigningAllowed: boolean;
    approvalRecordSigningAllowed: boolean;
    executionUnlockAllowed: boolean;
    overnightExecutionAllowed: boolean;
    liveRunReportAllowed: boolean;
    dependencyDownloadAllowed: boolean;
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
    finalApprovalAllowed: boolean;
    autoApprovalAllowed: boolean;
    autoProcessingAllowed: boolean;
    autoRouteAllowed: boolean;
    autoMergeAllowed: boolean;
    selfApprovalAllowed: boolean;
  };
};

export const localWorkerWorkspaceBoundarySafetyGates = [
  "Local worker workspace boundary only",
  "Tyler remains the workspace boundary owner",
  "Workspace boundary is declarative only",
  "Workspace boundary prepares owner review without approving installation",
  "Workspace boundary does not sign approval",
  "Workspace boundary does not lock workspace as approved",
  "Workspace boundary does not mark the worker ready for install",
  "Workspace boundary does not approve the install plan",
  "Workspace boundary does not approve the install approval record",
  "Workspace boundary does not approve the scope lock",
  "Workspace boundary does not approve worker installation",
  "Workspace boundary does not approve execution",
  "Workspace boundary does not authorize overnight work",
  "Workspace boundary does not install a worker",
  "Workspace boundary does not download dependencies",
  "Workspace boundary does not execute installers",
  "Workspace boundary does not create files",
  "Workspace boundary does not mutate files",
  "Workspace boundary does not mutate source",
  "Workspace boundary does not mutate the filesystem",
  "Workspace boundary does not connect to a worker",
  "Workspace boundary does not start a worker",
  "Workspace boundary does not spawn a worker process",
  "Workspace boundary does not poll worker health",
  "Workspace boundary does not inspect running processes",
  "Workspace boundary does not create scheduled tasks",
  "Workspace boundary does not modify scheduled tasks",
  "Workspace boundary does not delete scheduled tasks",
  "Workspace boundary does not enable scheduled tasks",
  "Workspace boundary does not disable scheduled tasks",
  "Workspace boundary does not query Windows Task Scheduler",
  "Workspace boundary does not run scheduled tasks",
  "Workspace boundary does not execute PowerShell",
  "Workspace boundary does not execute schtasks",
  "Workspace boundary does not execute commands",
  "Workspace boundary does not execute shell commands",
  "Workspace boundary does not execute tasks",
  "Workspace boundary does not persist task records",
  "Workspace boundary does not persist owner records",
  "Workspace boundary does not persist unlock proposal decisions",
  "Workspace boundary does not persist install plan decisions",
  "Workspace boundary does not persist approval records",
  "Workspace boundary does not persist scope lock records",
  "Workspace boundary does not persist workspace boundary records",
  "Workspace boundary does not connect to runner infrastructure",
  "Workspace boundary does not route work",
  "Workspace boundary does not process work automatically",
  "Workspace boundary does not merge branches",
  "Workspace boundary cannot self-approve",
  "Phase 64 scope lock prerequisite remains represented",
  "Phase 63 approval record prerequisite remains represented",
  "Owner approval is required before any future install",
  "Manual review is required before any future install",
  "Explicit workspace boundary is required before any future install",
  "Exact workspace root is required before any future install",
  "Allowed path inventory is required before any future install",
  "Blocked path inventory is required before any future install",
  "Rollback workspace target is required before any future install",
  "Workspace evidence target is required before any future install",
  "Local worker ready for install remains false by design",
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
  "Future install requires exact workspace path boundary",
  "Future install requires allowed workspace path inventory",
  "Future install requires blocked workspace path inventory",
  "Future install requires dependency inventory boundary",
  "Future install requires environment variable boundary",
  "Future install requires secret handling boundary",
  "Future install requires rollback target",
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
  "Future install requires out-of-scope request handling",
  "Future install requires owner re-approval for workspace changes",
  "No backend workspace boundary service",
  "No authentication changes",
  "No approval signing in this phase",
  "No scope lock signing in this phase",
  "No workspace boundary signing in this phase",
  "No approval persistence in this phase",
  "No scope lock persistence in this phase",
  "No workspace boundary persistence in this phase",
  "No live worker connection",
  "No actual worker install",
  "No installer execution",
  "No dependency download",
  "No workspace probing",
  "No filesystem scanning",
  "No path creation",
  "No path deletion"
] as const;

export const localWorkerWorkspaceBoundarySignals = [
  "workspace boundary surface",
  "phase 64 scope lock dependency",
  "exact workspace root requirement",
  "allowed path inventory requirement",
  "blocked path inventory requirement",
  "rollback workspace requirement",
  "workspace boundary not locked signal",
  "actual install remains blocked"
] as const;

export const localWorkerWorkspaceBoundaryPacket: LocalWorkerWorkspaceBoundaryPacket = {
  phase: {
    number: 65,
    label: "Phase 65 · Local Worker Workspace Boundary v1",
    milestone: "Owner-review workspace boundary structure for a future local worker install without locking, approving, scanning, creating, deleting, or installing anything",
  },
  localWorkerWorkspaceBoundaryStatus: "workspace-boundary-ready",
  workspaceBoundaryMode: "declarative-only owner review workspace boundary",
  workspaceBoundarySummary: {
    workspaceBoundaryId: "phase65_local_worker_workspace_boundary",
    owner: "Tyler Wallace",
    sourcePhase: "Phase 64 Local Worker Install Scope Lock",
    safeState: "workspace-boundary-only",
    phase64ScopeLockReady: true,
    phase63ApprovalRecordReady: true,
    ownerApprovalRequired: true,
    manualReviewRequired: true,
    explicitWorkspaceBoundaryRequired: true,
    exactWorkspaceRootRequired: true,
    allowedPathInventoryRequired: true,
    blockedPathInventoryRequired: true,
    rollbackWorkspaceRequired: true,
    workspaceEvidenceTargetRequired: true,
    localWorkerReadyForInstall: false,
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
  workspaceBoundaryFields: [
    "owner",
    "sourcePhase",
    "safeState",
    "phase64ScopeLockReady",
    "exactWorkspaceRootRequired",
    "workspaceBoundaryLocked",
    "workerInstallApproved",
    "workerInstalled"
],
  workspaceBoundarySignals: [...localWorkerWorkspaceBoundarySignals],
  workspaceBoundaryRequirements: [
    { id: "phase-64-scope-lock-reviewed", label: "Phase 64 scope lock reviewed", state: "required", evidence: "The owner must review Phase 64 scope lock evidence before any workspace boundary can be locked.", authority: "workspace_boundary_only" },
    { id: "exact-workspace-root-required", label: "Exact workspace root required", state: "required", evidence: "A future phase must identify the exact local workspace root before installation can become eligible.", authority: "workspace_boundary_only" },
    { id: "allowed-path-inventory-required", label: "Allowed path inventory required", state: "required", evidence: "A future phase must identify every allowed workspace path, file category, and operation boundary before installation can become eligible.", authority: "workspace_boundary_only" },
    { id: "blocked-path-inventory-required", label: "Blocked path inventory required", state: "required", evidence: "A future phase must identify blocked paths, protected directories, secrets, user data, and out-of-scope locations.", authority: "workspace_boundary_only" },
    { id: "rollback-workspace-required", label: "Rollback workspace target required", state: "required", evidence: "A future phase must identify the exact rollback target and workspace restoration expectation before installation can become eligible.", authority: "workspace_boundary_only" },
    { id: "workspace-evidence-target-required", label: "Workspace evidence target required", state: "required", evidence: "A future phase must define what evidence proves workspace boundary compliance and blocked install behavior.", authority: "workspace_boundary_only" },
  ],
  evidenceRequirements: [
    "Phase 64 scope lock proof",
    "Exact workspace root requirement",
    "Allowed workspace path inventory requirement",
    "Blocked workspace path inventory requirement",
    "Rollback workspace target requirement",
    "Blocked install proof"
],
  routing: {
    suggestedQueue: "Tyler local worker workspace boundary review",
    reviewRequired: true,
    ownerDecisionRequired: true,
    workspaceBoundarySigningAllowed: false,
    scopeLockSigningAllowed: false,
    approvalRecordSigningAllowed: false,
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
    workspaceBoundaryOnly: true,
    ownerReviewOnly: true,
    declarativeOnly: true,
    readOnly: true,
    frontendOnly: true,
    noBackendLogic: true,
    noAuthentication: true,
    workspaceBoundarySigningAllowed: false,
    scopeLockSigningAllowed: false,
    approvalRecordSigningAllowed: false,
    executionUnlockAllowed: false,
    overnightExecutionAllowed: false,
    liveRunReportAllowed: false,
    dependencyDownloadAllowed: false,
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
    finalApprovalAllowed: false,
    autoApprovalAllowed: false,
    autoProcessingAllowed: false,
    autoRouteAllowed: false,
    autoMergeAllowed: false,
    selfApprovalAllowed: false,
  },
};
