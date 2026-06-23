export type LocalWorkerRollbackPlanStatus = "rollback-plan-ready" | "blocked";

export type LocalWorkerRollbackPlanRequirementId =
  | "phase-65-workspace-boundary-reviewed"
  | "rollback-target-required"
  | "rollback-trigger-required"
  | "state-restore-boundary-required"
  | "rollback-evidence-target-required"
  | "owner-rollback-approval-required";

export type LocalWorkerRollbackPlanRequirement = {
  id: LocalWorkerRollbackPlanRequirementId;
  label: string;
  state: "required" | "blocked";
  evidence: string;
  authority: "rollback_plan_only";
};

export type LocalWorkerRollbackPlanPacket = {
  phase: { number: 66; label: string; milestone: string };
  localWorkerRollbackPlanStatus: LocalWorkerRollbackPlanStatus;
  rollbackPlanMode: string;
  rollbackPlanSummary: {
    rollbackPlanId: string;
    owner: string;
    sourcePhase: string;
    safeState: string;
    phase65WorkspaceBoundaryReady: boolean;
    phase64ScopeLockReady: boolean;
    ownerApprovalRequired: boolean;
    manualReviewRequired: boolean;
    explicitRollbackPlanRequired: boolean;
    rollbackTargetRequired: boolean;
    rollbackTriggerRequired: boolean;
    stateRestoreBoundaryRequired: boolean;
    rollbackEvidenceTargetRequired: boolean;
    ownerRollbackApprovalRequired: boolean;
    localWorkerReadyForInstall: boolean;
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
  rollbackPlanFields: string[];
  rollbackPlanSignals: string[];
  rollbackPlanRequirements: LocalWorkerRollbackPlanRequirement[];
  evidenceRequirements: string[];
  routing: {
    suggestedQueue: string;
    reviewRequired: boolean;
    ownerDecisionRequired: boolean;
    rollbackPlanSigningAllowed: boolean;
    workspaceBoundarySigningAllowed: boolean;
    scopeLockSigningAllowed: boolean;
    approvalRecordSigningAllowed: boolean;
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
    rollbackPlanOnly: boolean;
    ownerReviewOnly: boolean;
    declarativeOnly: boolean;
    readOnly: boolean;
    frontendOnly: boolean;
    noBackendLogic: boolean;
    noAuthentication: boolean;
    rollbackPlanSigningAllowed: boolean;
    workspaceBoundarySigningAllowed: boolean;
    scopeLockSigningAllowed: boolean;
    approvalRecordSigningAllowed: boolean;
    rollbackExecutionAllowed: boolean;
    stateRestoreAllowed: boolean;
    backupCreationAllowed: boolean;
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
    rollbackPlanPersistenceAllowed: boolean;
    finalApprovalAllowed: boolean;
    autoApprovalAllowed: boolean;
    autoProcessingAllowed: boolean;
    autoRouteAllowed: boolean;
    autoMergeAllowed: boolean;
    selfApprovalAllowed: boolean;
  };
};

export const localWorkerRollbackPlanSafetyGates = [
  "Local worker rollback plan only",
  "Tyler remains the rollback plan owner",
  "Rollback plan is declarative only",
  "Rollback plan prepares owner review without approving installation",
  "Rollback plan does not sign approval",
  "Rollback plan does not lock rollback as approved",
  "Rollback plan does not execute rollback",
  "Rollback plan does not restore state",
  "Rollback plan does not create backups",
  "Rollback plan does not mark the worker ready for install",
  "Rollback plan does not approve the install plan",
  "Rollback plan does not approve the install approval record",
  "Rollback plan does not approve the scope lock",
  "Rollback plan does not approve the workspace boundary",
  "Rollback plan does not approve worker installation",
  "Rollback plan does not approve execution",
  "Rollback plan does not authorize overnight work",
  "Rollback plan does not install a worker",
  "Rollback plan does not download dependencies",
  "Rollback plan does not execute installers",
  "Rollback plan does not create files",
  "Rollback plan does not mutate files",
  "Rollback plan does not mutate source",
  "Rollback plan does not mutate the filesystem",
  "Rollback plan does not connect to a worker",
  "Rollback plan does not start a worker",
  "Rollback plan does not spawn a worker process",
  "Rollback plan does not poll worker health",
  "Rollback plan does not inspect running processes",
  "Rollback plan does not create scheduled tasks",
  "Rollback plan does not modify scheduled tasks",
  "Rollback plan does not delete scheduled tasks",
  "Rollback plan does not enable scheduled tasks",
  "Rollback plan does not disable scheduled tasks",
  "Rollback plan does not query Windows Task Scheduler",
  "Rollback plan does not run scheduled tasks",
  "Rollback plan does not execute PowerShell",
  "Rollback plan does not execute schtasks",
  "Rollback plan does not execute commands",
  "Rollback plan does not execute shell commands",
  "Rollback plan does not execute tasks",
  "Rollback plan does not persist task records",
  "Rollback plan does not persist owner records",
  "Rollback plan does not persist unlock proposal decisions",
  "Rollback plan does not persist install plan decisions",
  "Rollback plan does not persist approval records",
  "Rollback plan does not persist scope lock records",
  "Rollback plan does not persist workspace boundary records",
  "Rollback plan does not persist rollback records",
  "Rollback plan does not connect to runner infrastructure",
  "Rollback plan does not route work",
  "Rollback plan does not process work automatically",
  "Rollback plan does not merge branches",
  "Rollback plan cannot self-approve",
  "Phase 65 workspace boundary prerequisite remains represented",
  "Phase 64 scope lock prerequisite remains represented",
  "Owner approval is required before any future install",
  "Manual review is required before any future install",
  "Explicit rollback plan is required before any future install",
  "Rollback target is required before any future install",
  "Rollback trigger is required before any future install",
  "State restore boundary is required before any future install",
  "Rollback evidence target is required before any future install",
  "Owner rollback approval is required before any future install",
  "Local worker ready for install remains false by design",
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
  "Future install requires exact workspace path boundary",
  "Future install requires allowed workspace path inventory",
  "Future install requires blocked workspace path inventory",
  "Future install requires dependency inventory boundary",
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
  "Future install requires out-of-scope request handling",
  "Future install requires owner re-approval for rollback changes",
  "No backend rollback service",
  "No authentication changes",
  "No approval signing in this phase",
  "No scope lock signing in this phase",
  "No workspace boundary signing in this phase",
  "No rollback plan signing in this phase",
  "No approval persistence in this phase",
  "No scope lock persistence in this phase",
  "No workspace boundary persistence in this phase",
  "No rollback plan persistence in this phase",
  "No live worker connection",
  "No actual worker install",
  "No installer execution",
  "No dependency download",
  "No workspace probing",
  "No filesystem scanning",
  "No path creation",
  "No path deletion",
  "No rollback execution",
  "No state restore execution",
  "No backup creation"
] as const;

export const localWorkerRollbackPlanSignals = [
  "rollback plan surface",
  "phase 65 workspace boundary dependency",
  "rollback target requirement",
  "rollback trigger requirement",
  "state restore boundary requirement",
  "rollback evidence target requirement",
  "rollback plan not locked signal",
  "actual install remains blocked",
] as const;

export const localWorkerRollbackPlanPacket: LocalWorkerRollbackPlanPacket = {
  phase: {
    number: 66,
    label: "Phase 66 · Local Worker Rollback Plan v1",
    milestone: "Owner-review rollback plan for any future local worker install path",
  },
  localWorkerRollbackPlanStatus: "rollback-plan-ready",
  rollbackPlanMode: "declarative-only owner review rollback plan",
  rollbackPlanSummary: {
    rollbackPlanId: "phase66_local_worker_rollback_plan",
    owner: "Tyler Wallace",
    sourcePhase: "Phase 65 Local Worker Workspace Boundary",
    safeState: "rollback-plan-only",
    phase65WorkspaceBoundaryReady: true,
    phase64ScopeLockReady: true,
    ownerApprovalRequired: true,
    manualReviewRequired: true,
    explicitRollbackPlanRequired: true,
    rollbackTargetRequired: true,
    rollbackTriggerRequired: true,
    stateRestoreBoundaryRequired: true,
    rollbackEvidenceTargetRequired: true,
    ownerRollbackApprovalRequired: true,
    localWorkerReadyForInstall: false,
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
  rollbackPlanFields: [
    "owner",
    "sourcePhase",
    "safeState",
    "phase65WorkspaceBoundaryReady",
    "rollbackTargetRequired",
    "rollbackPlanLocked",
    "workerInstallApproved",
    "workerInstalled",
  ],
  rollbackPlanSignals: [...localWorkerRollbackPlanSignals],
  rollbackPlanRequirements: [
    { id: "phase-65-workspace-boundary-reviewed", label: "Review Phase 65 workspace boundary proof", state: "required", evidence: "Phase 65 must remain represented before any rollback path can be considered.", authority: "rollback_plan_only" },
    { id: "rollback-target-required", label: "Rollback target required", state: "required", evidence: "A future install path must identify the exact rollback target before install approval can be considered.", authority: "rollback_plan_only" },
    { id: "rollback-trigger-required", label: "Rollback trigger required", state: "required", evidence: "A future install path must define what conditions trigger rollback before installation can be considered.", authority: "rollback_plan_only" },
    { id: "state-restore-boundary-required", label: "State restore boundary required", state: "required", evidence: "A future install path must define what state may be restored and what remains out of scope.", authority: "rollback_plan_only" },
    { id: "rollback-evidence-target-required", label: "Rollback evidence target required", state: "required", evidence: "A future install path must define evidence that proves rollback readiness without executing rollback.", authority: "rollback_plan_only" },
    { id: "owner-rollback-approval-required", label: "Owner rollback approval required", state: "required", evidence: "Tyler must review and approve rollback requirements in a later phase before installation can proceed.", authority: "rollback_plan_only" },
  ],
  evidenceRequirements: [
    "Phase 65 workspace boundary proof",
    "Rollback target requirement",
    "Rollback trigger requirement",
    "State restore boundary requirement",
    "Rollback evidence target requirement",
    "Blocked install proof",
  ],
  routing: {
    suggestedQueue: "owner-review-local-worker-rollback-plan",
    reviewRequired: true,
    ownerDecisionRequired: true,
    rollbackPlanSigningAllowed: false,
    workspaceBoundarySigningAllowed: false,
    scopeLockSigningAllowed: false,
    approvalRecordSigningAllowed: false,
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
    rollbackPlanOnly: true,
    ownerReviewOnly: true,
    declarativeOnly: true,
    readOnly: true,
    frontendOnly: true,
    noBackendLogic: true,
    noAuthentication: true,
    rollbackPlanSigningAllowed: false,
    workspaceBoundarySigningAllowed: false,
    scopeLockSigningAllowed: false,
    approvalRecordSigningAllowed: false,
    rollbackExecutionAllowed: false,
    stateRestoreAllowed: false,
    backupCreationAllowed: false,
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
    rollbackPlanPersistenceAllowed: false,
    finalApprovalAllowed: false,
    autoApprovalAllowed: false,
    autoProcessingAllowed: false,
    autoRouteAllowed: false,
    autoMergeAllowed: false,
    selfApprovalAllowed: false,
  },
};
