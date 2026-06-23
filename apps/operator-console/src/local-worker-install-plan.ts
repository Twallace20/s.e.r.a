export type LocalWorkerInstallPlanStatus = "install-plan-ready" | "blocked";

export type LocalWorkerInstallPlanRequirementId =
  | "phase-61-unlock-proposal-reviewed"
  | "owner-approval-required"
  | "rollback-policy-required"
  | "install-evidence-required"
  | "worker-health-check-plan-required"
  | "workspace-boundary-required";

export type LocalWorkerInstallPlanRequirement = {
  id: LocalWorkerInstallPlanRequirementId;
  label: string;
  state: "required" | "blocked";
  evidence: string;
  authority: "install_plan_only";
};

export type LocalWorkerInstallPlanPacket = {
  phase: {
    number: 62;
    label: string;
    milestone: string;
  };
  localWorkerInstallPlanStatus: LocalWorkerInstallPlanStatus;
  installPlanMode: string;
  installPlanSummary: {
    installPlanId: string;
    owner: string;
    sourcePhase: string;
    safeState: string;
    phase61UnlockProposalReady: boolean;
    phase60ReadinessGateReady: boolean;
    ownerApprovalRequired: boolean;
    manualReviewRequired: boolean;
    emergencyStopRequired: boolean;
    commandAllowlistRequired: boolean;
    rollbackPolicyRequired: boolean;
    workspaceBoundaryRequired: boolean;
    installEvidenceRequired: boolean;
    workerHealthEvidencePlanRequired: boolean;
    localWorkerReadyForInstall: boolean;
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
  installPlanFields: string[];
  installPlanSignals: string[];
  installPlanRequirements: LocalWorkerInstallPlanRequirement[];
  evidenceRequirements: string[];
  routing: {
    suggestedQueue: string;
    reviewRequired: boolean;
    ownerDecisionRequired: boolean;
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
    installPlanOnly: boolean;
    ownerReviewOnly: boolean;
    declarativeOnly: boolean;
    readOnly: boolean;
    frontendOnly: boolean;
    noBackendLogic: boolean;
    noAuthentication: boolean;
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
    mutatesSource: boolean;
    fileMutationAllowed: boolean;
    filesystemMutationAllowed: boolean;
    recordPersistenceAllowed: boolean;
    taskPersistenceAllowed: boolean;
    morningPacketPersistenceAllowed: boolean;
    readinessGatePersistenceAllowed: boolean;
    unlockProposalPersistenceAllowed: boolean;
    installPlanPersistenceAllowed: boolean;
    finalApprovalAllowed: boolean;
    autoApprovalAllowed: boolean;
    autoProcessingAllowed: boolean;
    autoRouteAllowed: boolean;
    autoMergeAllowed: boolean;
    selfApprovalAllowed: boolean;
  };
};

export const localWorkerInstallPlanSafetyGates = [
  "Local worker install plan only",
  "Tyler remains the install plan owner",
  "Install plan is declarative only",
  "Install plan prepares owner review without installing a worker",
  "Install plan does not approve execution",
  "Install plan does not mark the worker ready for install",
  "Install plan does not approve the install plan",
  "Install plan does not approve worker installation",
  "Install plan does not install a worker",
  "Install plan does not download dependencies",
  "Install plan does not create files",
  "Install plan does not mutate files",
  "Install plan does not mutate source",
  "Install plan does not mutate the filesystem",
  "Install plan does not connect to a worker",
  "Install plan does not start a worker",
  "Install plan does not spawn a worker process",
  "Install plan does not poll worker health",
  "Install plan does not inspect running processes",
  "Install plan does not create scheduled tasks",
  "Install plan does not modify scheduled tasks",
  "Install plan does not delete scheduled tasks",
  "Install plan does not enable scheduled tasks",
  "Install plan does not disable scheduled tasks",
  "Install plan does not query Windows Task Scheduler",
  "Install plan does not run scheduled tasks",
  "Install plan does not execute PowerShell",
  "Install plan does not execute schtasks",
  "Install plan does not execute commands",
  "Install plan does not execute shell commands",
  "Install plan does not execute tasks",
  "Install plan does not persist task records",
  "Install plan does not persist owner records",
  "Install plan does not persist unlock proposal decisions",
  "Install plan does not persist install decisions",
  "Install plan does not connect to runner infrastructure",
  "Install plan does not route work",
  "Install plan does not process work automatically",
  "Install plan does not merge branches",
  "Install plan cannot self-approve",
  "Phase 61 unlock proposal prerequisite remains represented",
  "Phase 60 readiness gate prerequisite remains represented",
  "Owner approval is required before any future install",
  "Manual review is required before any future install",
  "Emergency stop compatibility is required before any future install",
  "Command allowlist compatibility is required before any future install",
  "Rollback policy is required before any future install",
  "Workspace boundary is required before any future install",
  "Install evidence is required before any future install",
  "Worker health evidence plan is required before any future install",
  "Local worker ready for install remains false by design",
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
  "Future install requires signed install scope",
  "Future install requires install location plan",
  "Future install requires dependency inventory",
  "Future install requires rollback plan",
  "Future install requires recovery checkpoint plan",
  "Future install requires worker health check plan",
  "Future install requires dry-run smoke test plan",
  "Future install requires scheduler hold plan",
  "Future install requires morning packet review plan",
  "Future install requires command allowlist review",
  "Future install requires emergency stop review",
  "Future install requires session lock review",
  "Future install requires workspace boundary review",
  "Future install requires secret handling review",
  "Future install requires audit evidence review",
  "Future install requires no-secret leakage review",
  "No backend install service",
  "No authentication changes",
  "No live worker connection",
  "No actual worker install",
  "No installer execution"
] as const;

export const localWorkerInstallPlanSignals = [
  "install plan surface",
  "phase 61 unlock proposal dependency",
  "owner approval requirement",
  "rollback plan requirement",
  "installation evidence requirement",
  "worker health check plan requirement",
  "workspace boundary requirement",
  "actual install remains blocked"
] as const;

export const localWorkerInstallPlanPacket: LocalWorkerInstallPlanPacket = {
  phase: {
    number: 62,
    label: "Phase 62 · Local Worker Install Plan v1",
    milestone: "Owner-review installation plan for a future local worker without installing anything",
  },
  localWorkerInstallPlanStatus: "install-plan-ready",
  installPlanMode: "declarative-only owner review installation plan",
  installPlanSummary: {
    installPlanId: "phase62_local_worker_install_plan",
    owner: "Tyler Wallace",
    sourcePhase: "Phase 61 Local Worker Unlock Proposal Packet",
    safeState: "install-plan-only",
    phase61UnlockProposalReady: true,
    phase60ReadinessGateReady: true,
    ownerApprovalRequired: true,
    manualReviewRequired: true,
    emergencyStopRequired: true,
    commandAllowlistRequired: true,
    rollbackPolicyRequired: true,
    workspaceBoundaryRequired: true,
    installEvidenceRequired: true,
    workerHealthEvidencePlanRequired: true,
    localWorkerReadyForInstall: false,
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
  installPlanFields: [
    "owner",
    "installPlanId",
    "sourcePhase",
    "safeState",
    "ownerApprovalRequired",
    "localWorkerReadyForInstall",
    "installPlanApproved",
    "workerInstallApproved"
  ],
  installPlanSignals: [...localWorkerInstallPlanSignals],
  installPlanRequirements: [
    {
      id: "phase-61-unlock-proposal-reviewed",
      label: "Phase 61 unlock proposal reviewed",
      state: "required",
      evidence: "The Phase 61 proposal must be reviewed before any installation plan can move forward.",
      authority: "install_plan_only",
    },
    {
      id: "owner-approval-required",
      label: "Owner approval required",
      state: "required",
      evidence: "Tyler must explicitly approve any future installation phase before installation can be attempted.",
      authority: "install_plan_only",
    },
    {
      id: "rollback-policy-required",
      label: "Rollback policy required",
      state: "required",
      evidence: "A future installation phase must include rollback steps before any install commands are allowed.",
      authority: "install_plan_only",
    },
    {
      id: "install-evidence-required",
      label: "Install evidence required",
      state: "required",
      evidence: "A future installation phase must define expected evidence, logs, and no-secret leakage checks.",
      authority: "install_plan_only",
    },
    {
      id: "worker-health-check-plan-required",
      label: "Worker health check plan required",
      state: "required",
      evidence: "A future installation phase must define how health will be checked after installation without granting task execution.",
      authority: "install_plan_only",
    },
    {
      id: "workspace-boundary-required",
      label: "Workspace boundary required",
      state: "required",
      evidence: "A future installation phase must keep the worker constrained to approved local workspace paths.",
      authority: "install_plan_only",
    }
  ],
  evidenceRequirements: [
    "Phase 61 unlock proposal closeout proof",
    "owner approval record requirement",
    "rollback plan evidence requirement",
    "installation evidence and log requirement",
    "worker health check plan evidence requirement",
    "workspace boundary and no-secret leakage evidence requirement"
  ],
  routing: {
    suggestedQueue: "Tyler local worker install plan review",
    reviewRequired: true,
    ownerDecisionRequired: true,
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
    installPlanOnly: true,
    ownerReviewOnly: true,
    declarativeOnly: true,
    readOnly: true,
    frontendOnly: true,
    noBackendLogic: true,
    noAuthentication: true,
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
    mutatesSource: false,
    fileMutationAllowed: false,
    filesystemMutationAllowed: false,
    recordPersistenceAllowed: false,
    taskPersistenceAllowed: false,
    morningPacketPersistenceAllowed: false,
    readinessGatePersistenceAllowed: false,
    unlockProposalPersistenceAllowed: false,
    installPlanPersistenceAllowed: false,
    finalApprovalAllowed: false,
    autoApprovalAllowed: false,
    autoProcessingAllowed: false,
    autoRouteAllowed: false,
    autoMergeAllowed: false,
    selfApprovalAllowed: false,
  },
};
