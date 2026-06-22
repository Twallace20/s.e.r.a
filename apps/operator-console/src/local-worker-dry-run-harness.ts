export type LocalWorkerDryRunHarnessStatus = "dry-run-ready" | "blocked";

export type LocalWorkerDryRunStepId =
  | "accept-plan-preview"
  | "validate-worker-boundaries"
  | "simulate-worker-preflight"
  | "simulate-task-handshake"
  | "generate-dry-run-evidence";

export type LocalWorkerDryRunStep = {
  id: LocalWorkerDryRunStepId;
  label: string;
  state: "simulated" | "blocked" | "evidence-only";
  intent: string;
  evidence: string;
  authority: "simulation_only" | "evidence_only";
};

export type LocalWorkerDryRunHarnessPacket = {
  phase: {
    number: 57;
    label: string;
    milestone: string;
  };
  dryRunHarnessStatus: LocalWorkerDryRunHarnessStatus;
  dryRunHarnessMode: string;
  dryRunSummary: {
    dryRunHarnessId: string;
    owner: string;
    sourcePhase: string;
    safeState: string;
    workerInstalled: boolean;
    workerConnected: boolean;
    dryRunOnly: boolean;
    simulatedTaskCount: number;
    executableTaskCount: number;
    evidenceBundleRequired: boolean;
  };
  dryRunFields: string[];
  workerDryRunSignals: string[];
  dryRunSteps: LocalWorkerDryRunStep[];
  evidenceRequirements: string[];
  routing: {
    suggestedQueue: string;
    reviewRequired: boolean;
    ownerDecisionRequired: boolean;
    workerConnectionAllowed: boolean;
    dryRunAllowed: boolean;
    simulationAllowed: boolean;
    workerSpawnAllowed: boolean;
    taskExecutionAllowed: boolean;
    commandExecutionAllowed: boolean;
    autoRouteAllowed: boolean;
    autoProcessingAllowed: boolean;
  };
  boundaries: {
    localOnly: boolean;
    privateAppOnly: boolean;
    dryRunHarnessOnly: boolean;
    simulatedOnly: boolean;
    evidenceOnly: boolean;
    workerContractOnly: boolean;
    readOnly: boolean;
    frontendOnly: boolean;
    noBackendLogic: boolean;
    noAuthentication: boolean;
    commandExecutionAllowed: boolean;
    shellExecutionAllowed: boolean;
    runnerConnectivityAllowed: boolean;
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
    finalApprovalAllowed: boolean;
    autoApprovalAllowed: boolean;
    autoProcessingAllowed: boolean;
    autoRouteAllowed: boolean;
    autoMergeAllowed: boolean;
    selfApprovalAllowed: boolean;
  };
};

export const localWorkerDryRunHarnessSafetyGates = [
  "Local worker dry-run harness only",
  "Tyler remains the dry-run owner",
  "Dry run is simulated only",
  "Dry run produces evidence only",
  "Dry run does not install a worker",
  "Dry run does not connect to a worker",
  "Dry run does not start a worker",
  "Dry run does not poll worker health",
  "Dry run does not inspect running processes",
  "Dry run does not execute commands",
  "Dry run does not execute shell commands",
  "Dry run does not execute tasks",
  "Dry run does not create completed task state",
  "Dry run does not persist task records",
  "Dry run does not persist owner records",
  "Dry run does not mutate files",
  "Dry run does not mutate source",
  "Dry run does not connect to runner infrastructure",
  "Dry run does not approve execution",
  "Dry run does not route work",
  "Dry run does not process work automatically",
  "Dry run does not merge branches",
  "Dry run cannot self-approve",
  "Worker installed remains false by design",
  "Worker connected remains false by design",
  "Executable task count remains zero",
  "Future execution requires owner approval",
  "Future execution requires command allowlist",
  "Future execution requires workspace boundary guard",
  "Future execution requires emergency stop compatibility",
  "Future execution requires evidence capture",
  "Future execution requires rollback policy",
  "Future execution requires validation gate",
  "Future execution requires branch readiness inspection",
  "No backend worker service",
  "No authentication changes",
  "No worker spawn",
  "No task execution",
  "No command execution",
  "No runner connectivity",
  "No filesystem mutation",
  "No self-approval",
] as const;

export const localWorkerDryRunHarnessSignals = [
  "dry-run input review",
  "worker boundary simulation",
  "preflight simulation",
  "task handshake simulation",
  "evidence bundle preview",
  "command allowlist check preview",
  "emergency stop check preview",
  "owner gate check preview",
] as const;

export const localWorkerDryRunHarnessPacket: LocalWorkerDryRunHarnessPacket = {
  phase: {
    number: 57,
    label: "Phase 57 · Local Worker Dry-Run Harness v1",
    milestone: "Simulation-only harness for future local worker behavior",
  },
  dryRunHarnessStatus: "dry-run-ready",
  dryRunHarnessMode: "simulation-only local worker dry-run evidence surface",
  dryRunSummary: {
    dryRunHarnessId: "phase57_local_worker_dry_run_harness",
    owner: "Tyler Wallace",
    sourcePhase: "Phase 56 local worker health panel",
    safeState: "simulated-only",
    workerInstalled: false,
    workerConnected: false,
    dryRunOnly: true,
    simulatedTaskCount: 1,
    executableTaskCount: 0,
    evidenceBundleRequired: true,
  },
  dryRunFields: [
    "owner",
    "sourcePhase",
    "safeState",
    "workerInstalled",
    "workerConnected",
    "dryRunOnly",
    "simulatedTaskCount",
    "executableTaskCount",
  ],
  workerDryRunSignals: [...localWorkerDryRunHarnessSignals],
  dryRunSteps: [
    {
      id: "accept-plan-preview",
      label: "Accept plan preview",
      state: "simulated",
      intent: "Represent how a future worker would receive a Tyler-reviewed plan preview.",
      evidence: "Plan preview is referenced as dry-run input only.",
      authority: "simulation_only",
    },
    {
      id: "validate-worker-boundaries",
      label: "Validate worker boundaries",
      state: "simulated",
      intent: "Confirm the future worker would be constrained by local, owner, command, and workspace gates.",
      evidence: "Boundary checks are represented without connecting to a worker.",
      authority: "simulation_only",
    },
    {
      id: "simulate-worker-preflight",
      label: "Simulate worker preflight",
      state: "simulated",
      intent: "Preview future preflight requirements before any worker can run.",
      evidence: "Preflight stays declarative and evidence-only.",
      authority: "simulation_only",
    },
    {
      id: "simulate-task-handshake",
      label: "Simulate task handshake",
      state: "blocked",
      intent: "Show that task handoff is not yet execution authority.",
      evidence: "Task execution and persistence remain blocked.",
      authority: "simulation_only",
    },
    {
      id: "generate-dry-run-evidence",
      label: "Generate dry-run evidence",
      state: "evidence-only",
      intent: "Produce proof that the dry-run harness is configured safely.",
      evidence: "Phase 57 runner writes local report artifacts only.",
      authority: "evidence_only",
    },
  ],
  evidenceRequirements: [
    "dry-run input summary",
    "boundary check summary",
    "simulated preflight result",
    "simulated task handshake result",
    "blocked authority summary",
    "owner review reminder",
  ],
  routing: {
    suggestedQueue: "Tyler local worker dry-run review",
    reviewRequired: true,
    ownerDecisionRequired: true,
    workerConnectionAllowed: false,
    dryRunAllowed: true,
    simulationAllowed: true,
    workerSpawnAllowed: false,
    taskExecutionAllowed: false,
    commandExecutionAllowed: false,
    autoRouteAllowed: false,
    autoProcessingAllowed: false,
  },
  boundaries: {
    localOnly: true,
    privateAppOnly: true,
    dryRunHarnessOnly: true,
    simulatedOnly: true,
    evidenceOnly: true,
    workerContractOnly: true,
    readOnly: true,
    frontendOnly: true,
    noBackendLogic: true,
    noAuthentication: true,
    commandExecutionAllowed: false,
    shellExecutionAllowed: false,
    runnerConnectivityAllowed: false,
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
    finalApprovalAllowed: false,
    autoApprovalAllowed: false,
    autoProcessingAllowed: false,
    autoRouteAllowed: false,
    autoMergeAllowed: false,
    selfApprovalAllowed: false,
  },
};
