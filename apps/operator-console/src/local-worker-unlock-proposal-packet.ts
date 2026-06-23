export type LocalWorkerUnlockProposalPacketStatus = "unlock-proposal-ready" | "blocked";

export type LocalWorkerUnlockProposalRequirementId =
  | "phase-60-readiness-gate-reviewed"
  | "owner-approval-required"
  | "command-allowlist-required"
  | "emergency-stop-required"
  | "rollback-policy-required"
  | "audit-evidence-required";

export type LocalWorkerUnlockProposalRequirement = {
  id: LocalWorkerUnlockProposalRequirementId;
  label: string;
  state: "required" | "blocked";
  evidence: string;
  authority: "unlock_proposal_only";
};

export type LocalWorkerUnlockProposalPacket = {
  phase: {
    number: 61;
    label: string;
    milestone: string;
  };
  localWorkerUnlockProposalPacketStatus: LocalWorkerUnlockProposalPacketStatus;
  unlockProposalMode: string;
  proposalSummary: {
    proposalId: string;
    owner: string;
    sourcePhase: string;
    safeState: string;
    phase60ReadinessGateReady: boolean;
    allReadinessSurfacesRepresented: boolean;
    ownerApprovalRequired: boolean;
    manualReviewRequired: boolean;
    emergencyStopRequired: boolean;
    commandAllowlistRequired: boolean;
    rollbackPolicyRequired: boolean;
    auditEvidenceRequired: boolean;
    localWorkerReadyForUnlock: boolean;
    unlockProposalApproved: boolean;
    executionUnlockApproved: boolean;
    overnightWorkAuthorized: boolean;
    workerInstallApproved: boolean;
    workerInstalled: boolean;
    workerConnected: boolean;
    windowsSchedulerConfigured: boolean;
    scheduledExecutionAllowed: boolean;
    executableScheduleCount: number;
  };
  unlockProposalFields: string[];
  unlockProposalSignals: string[];
  unlockProposalRequirements: LocalWorkerUnlockProposalRequirement[];
  evidenceRequirements: string[];
  routing: {
    suggestedQueue: string;
    reviewRequired: boolean;
    ownerDecisionRequired: boolean;
    unlockProposalApprovalAllowed: boolean;
    readinessUnlockAllowed: boolean;
    overnightExecutionAllowed: boolean;
    schedulerQueryAllowed: boolean;
    workerInstallAllowed: boolean;
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
    unlockProposalOnly: boolean;
    ownerReviewOnly: boolean;
    declarativeOnly: boolean;
    readOnly: boolean;
    frontendOnly: boolean;
    noBackendLogic: boolean;
    noAuthentication: boolean;
    executionUnlockAllowed: boolean;
    overnightExecutionAllowed: boolean;
    liveRunReportAllowed: boolean;
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
    finalApprovalAllowed: boolean;
    autoApprovalAllowed: boolean;
    autoProcessingAllowed: boolean;
    autoRouteAllowed: boolean;
    autoMergeAllowed: boolean;
    selfApprovalAllowed: boolean;
  };
};

export const localWorkerUnlockProposalPacketSafetyGates = [
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
] as const;

export const localWorkerUnlockProposalPacketSignals = [
  "unlock proposal surface",
  "phase 60 readiness gate dependency",
  "owner approval requirement",
  "manual review requirement",
  "command allowlist compatibility requirement",
  "emergency stop compatibility requirement",
  "rollback and audit evidence requirement",
  "execution unlock remains blocked"
] as const;

export const localWorkerUnlockProposalPacket: LocalWorkerUnlockProposalPacket = {
  phase: {
    number: 61,
    label: "Phase 61 · Local Worker Unlock Proposal Packet v1",
    milestone: "Owner-review proposal packet for any future local worker unlock path",
  },
  localWorkerUnlockProposalPacketStatus: "unlock-proposal-ready",
  unlockProposalMode: "declarative-only owner review proposal",
  proposalSummary: {
    proposalId: "phase61_local_worker_unlock_proposal_packet",
    owner: "Tyler Wallace",
    sourcePhase: "Phase 60 Local Worker Readiness Gate",
    safeState: "unlock-proposal-only",
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
  unlockProposalSignals: [...localWorkerUnlockProposalPacketSignals],
  unlockProposalRequirements: [
    {
      id: "phase-60-readiness-gate-reviewed",
      label: "Phase 60 readiness gate reviewed",
      state: "required",
      evidence: "Phase 60 closed with all readiness surfaces represented while execution remained blocked.",
      authority: "unlock_proposal_only",
    },
    {
      id: "owner-approval-required",
      label: "Owner approval required",
      state: "required",
      evidence: "Tyler must explicitly approve any future unlock path before implementation work can move beyond proposal.",
      authority: "unlock_proposal_only",
    },
    {
      id: "command-allowlist-required",
      label: "Command allowlist compatibility required",
      state: "required",
      evidence: "Any future worker path must be compatible with the existing command allowlist gate before execution is considered.",
      authority: "unlock_proposal_only",
    },
    {
      id: "emergency-stop-required",
      label: "Emergency stop compatibility required",
      state: "required",
      evidence: "Any future worker path must remain subordinate to the emergency stop guard.",
      authority: "unlock_proposal_only",
    },
    {
      id: "rollback-policy-required",
      label: "Rollback policy required",
      state: "required",
      evidence: "Any future worker path must define rollback behavior before mutation or execution can be considered.",
      authority: "unlock_proposal_only",
    },
    {
      id: "audit-evidence-required",
      label: "Audit evidence required",
      state: "required",
      evidence: "Any future worker path must produce reviewable evidence before and after approved activity.",
      authority: "unlock_proposal_only",
    }
  ],
  evidenceRequirements: [
    "Phase 60 readiness gate closeout proof",
    "owner approval record requirement",
    "command allowlist compatibility evidence requirement",
    "emergency stop compatibility evidence requirement",
    "rollback policy evidence requirement",
    "audit and no-secret leakage evidence requirement"
],
  routing: {
    suggestedQueue: "owner-review-local-worker-unlock-proposal",
    reviewRequired: true,
    ownerDecisionRequired: true,
    unlockProposalApprovalAllowed: false,
    readinessUnlockAllowed: false,
    overnightExecutionAllowed: false,
    schedulerQueryAllowed: false,
    workerInstallAllowed: false,
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
