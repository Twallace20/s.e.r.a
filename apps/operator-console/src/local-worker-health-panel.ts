export type LocalWorkerHealthPanelStatus = "health-panel-ready" | "blocked";

export type LocalWorkerHealthSignalId =
  | "worker-installation-status"
  | "worker-connection-status"
  | "worker-heartbeat-status"
  | "workspace-readiness-status"
  | "command-allowlist-status"
  | "emergency-stop-status";

export type LocalWorkerHealthSignal = {
  id: LocalWorkerHealthSignalId;
  label: string;
  state: "offline-by-design" | "not-connected" | "ready-for-future-check" | "blocked";
  value: string;
  evidence: string;
  authority: string;
};

export type LocalWorkerHealthPanelPacket = {
  phase: {
    number: 56;
    label: string;
    milestone: string;
  };
  healthPanelStatus: LocalWorkerHealthPanelStatus;
  healthPanelMode: string;
  healthSummary: {
    healthPanelId: string;
    owner: string;
    sourcePhase: string;
    safeState: string;
    workerInstalled: boolean;
    workerConnected: boolean;
    heartbeatStatus: string;
    healthPollingAllowed: boolean;
    liveHeartbeatAllowed: boolean;
    executableTaskCount: number;
  };
  healthPanelFields: string[];
  workerHealthSignals: string[];
  healthSignals: LocalWorkerHealthSignal[];
  routing: {
    suggestedQueue: string;
    reviewRequired: boolean;
    ownerDecisionRequired: boolean;
    workerConnectionAllowed: boolean;
    healthPollingAllowed: boolean;
    workerSpawnAllowed: boolean;
    taskExecutionAllowed: boolean;
    autoRouteAllowed: boolean;
    autoProcessingAllowed: boolean;
  };
  boundaries: {
    localOnly: boolean;
    privateAppOnly: boolean;
    healthPanelOnly: boolean;
    healthSurfaceOnly: boolean;
    declarativeOnly: boolean;
    readOnly: boolean;
    frontendOnly: boolean;
    noBackendLogic: boolean;
    noAuthentication: boolean;
    commandExecutionAllowed: boolean;
    runnerConnectivityAllowed: boolean;
    workerSpawnAllowed: boolean;
    taskExecutionAllowed: boolean;
    healthPollingAllowed: boolean;
    liveHeartbeatAllowed: boolean;
    processInspectionAllowed: boolean;
    mutatesSource: boolean;
    fileMutationAllowed: boolean;
    recordPersistenceAllowed: boolean;
    finalApprovalAllowed: boolean;
    autoApprovalAllowed: boolean;
    autoProcessingAllowed: boolean;
    autoRouteAllowed: boolean;
    autoMergeAllowed: boolean;
    selfApprovalAllowed: boolean;
  };
};

export const localWorkerHealthPanelSafetyGates = [
  "Local worker health panel only",
  "Tyler remains the worker health owner",
  "Health panel is declarative only",
  "Health panel does not poll a process",
  "Health panel does not inspect running processes",
  "Health panel does not start a worker",
  "Health panel cannot execute commands",
  "Health panel cannot connect to a runner",
  "Health panel cannot create tasks",
  "Health panel cannot approve execution",
  "Worker installed remains false by design",
  "Worker connected remains false by design",
  "Live heartbeat remains blocked",
  "Future health polling requires owner approval",
  "Future worker connection requires command allowlist",
  "Future worker connection requires workspace boundary guard",
  "Future worker connection requires emergency stop compatibility",
  "Future worker connection requires evidence capture",
  "No backend worker service",
  "No authentication changes",
  "No worker spawn",
  "No task execution",
  "No health polling",
  "No live heartbeat",
  "No process inspection",
  "No command execution",
  "No runner connectivity",
  "No source mutation",
  "No file mutation",
  "No record persistence",
  "No final approval",
  "No auto-routing",
  "No auto-merge",
  "No self-approval",
] as const;

export const localWorkerHealthPanelSignals = [
  "worker installation status",
  "worker connection status",
  "heartbeat status",
  "workspace readiness status",
  "command allowlist readiness",
  "emergency stop readiness",
  "evidence capture readiness",
  "owner gate readiness",
] as const;

export const localWorkerHealthPanelPacket: LocalWorkerHealthPanelPacket = {
  phase: {
    number: 56,
    label: "Phase 56 · Local Worker Health Panel v1",
    milestone: "Private app health surface for the future local desktop worker",
  },
  healthPanelStatus: "health-panel-ready",
  healthPanelMode: "declarative local worker health surface only",
  healthSummary: {
    healthPanelId: "phase56_local_worker_health_panel",
    owner: "Tyler Wallace",
    sourcePhase: "Phase 55 local desktop worker blueprint",
    safeState: "offline-by-design",
    workerInstalled: false,
    workerConnected: false,
    heartbeatStatus: "not available until a future approved worker connection phase",
    healthPollingAllowed: false,
    liveHeartbeatAllowed: false,
    executableTaskCount: 0,
  },
  healthPanelFields: [
    "owner",
    "sourcePhase",
    "safeState",
    "workerInstalled",
    "workerConnected",
    "heartbeatStatus",
    "healthPollingAllowed",
    "executableTaskCount",
  ],
  workerHealthSignals: [...localWorkerHealthPanelSignals],
  healthSignals: [
    {
      id: "worker-installation-status",
      label: "Worker installation",
      state: "offline-by-design",
      value: "not installed",
      evidence: "Phase 56 is a health surface only",
      authority: "display_only",
    },
    {
      id: "worker-connection-status",
      label: "Worker connection",
      state: "not-connected",
      value: "not connected",
      evidence: "Runner and worker connection remain blocked",
      authority: "display_only",
    },
    {
      id: "worker-heartbeat-status",
      label: "Worker heartbeat",
      state: "blocked",
      value: "no live heartbeat",
      evidence: "No polling or process inspection in Phase 56",
      authority: "declarative_only",
    },
    {
      id: "workspace-readiness-status",
      label: "Workspace boundary",
      state: "ready-for-future-check",
      value: "future guard required",
      evidence: "Phase 55 defined the workspace boundary requirement",
      authority: "readiness_signal_only",
    },
    {
      id: "command-allowlist-status",
      label: "Command allowlist",
      state: "ready-for-future-check",
      value: "future allowlist required",
      evidence: "Execution remains blocked until allowlist and owner gates are active",
      authority: "readiness_signal_only",
    },
    {
      id: "emergency-stop-status",
      label: "Emergency stop",
      state: "ready-for-future-check",
      value: "future compatibility required",
      evidence: "Worker connection requires emergency stop compatibility before activation",
      authority: "readiness_signal_only",
    },
  ],
  routing: {
    suggestedQueue: "Tyler local worker health readiness review",
    reviewRequired: true,
    ownerDecisionRequired: true,
    workerConnectionAllowed: false,
    healthPollingAllowed: false,
    workerSpawnAllowed: false,
    taskExecutionAllowed: false,
    autoRouteAllowed: false,
    autoProcessingAllowed: false,
  },
  boundaries: {
    localOnly: true,
    privateAppOnly: true,
    healthPanelOnly: true,
    healthSurfaceOnly: true,
    declarativeOnly: true,
    readOnly: true,
    frontendOnly: true,
    noBackendLogic: true,
    noAuthentication: true,
    commandExecutionAllowed: false,
    runnerConnectivityAllowed: false,
    workerSpawnAllowed: false,
    taskExecutionAllowed: false,
    healthPollingAllowed: false,
    liveHeartbeatAllowed: false,
    processInspectionAllowed: false,
    mutatesSource: false,
    fileMutationAllowed: false,
    recordPersistenceAllowed: false,
    finalApprovalAllowed: false,
    autoApprovalAllowed: false,
    autoProcessingAllowed: false,
    autoRouteAllowed: false,
    autoMergeAllowed: false,
    selfApprovalAllowed: false,
  },
};
