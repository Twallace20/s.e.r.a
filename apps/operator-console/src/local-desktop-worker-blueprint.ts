export type LocalDesktopWorkerBlueprintStatus = "blueprint-ready" | "blocked";

export type LocalDesktopWorkerRoleId =
  | "worker-contract-host"
  | "workspace-boundary-guardian"
  | "validation-runner-blueprint"
  | "evidence-collector-blueprint"
  | "health-reporter-blueprint";

export type LocalDesktopWorkerRole = {
  id: LocalDesktopWorkerRoleId;
  label: string;
  responsibility: string;
  authority: string;
  blockedAuthority: string[];
};

export type LocalDesktopWorkerBlueprintPacket = {
  phase: {
    number: 55;
    label: string;
    milestone: string;
  };
  workerBlueprintStatus: LocalDesktopWorkerBlueprintStatus;
  blueprintMode: string;
  workerSummary: {
    blueprintId: string;
    owner: string;
    sourcePhase: string;
    targetRuntime: string;
    workerRoleCount: number;
    enabledWorkerCount: number;
    connectedWorkerCount: number;
    executableTaskCount: number;
  };
  workerContract: {
    workerId: string;
    owner: string;
    runtimeMode: string;
    startupMethod: string;
    allowedInputs: string[];
    forbiddenAuthorities: string[];
    healthSignals: string[];
    evidenceRequirements: string[];
  };
  workerRoles: LocalDesktopWorkerRole[];
  workerContractFields: string[];
  workerCapabilitySignals: string[];
  routing: {
    suggestedQueue: string;
    reviewRequired: boolean;
    ownerDecisionRequired: boolean;
    workerConnectionAllowed: boolean;
    workerSpawnAllowed: boolean;
    taskExecutionAllowed: boolean;
    autoRouteAllowed: boolean;
    autoProcessingAllowed: boolean;
  };
  boundaries: {
    localOnly: boolean;
    privateAppOnly: boolean;
    blueprintOnly: boolean;
    workerContractOnly: boolean;
    designOnly: boolean;
    readOnly: boolean;
    frontendOnly: boolean;
    noBackendLogic: boolean;
    noAuthentication: boolean;
    commandExecutionAllowed: boolean;
    runnerConnectivityAllowed: boolean;
    workerSpawnAllowed: boolean;
    taskExecutionAllowed: boolean;
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

export const localDesktopWorkerBlueprintSafetyGates = [
  "Local desktop worker blueprint only",
  "Tyler remains the worker contract owner",
  "Blueprint does not install a worker",
  "Blueprint does not start a worker",
  "Blueprint cannot execute commands",
  "Blueprint cannot connect to a runner",
  "Future worker requires owner decision record",
  "Future worker requires command allowlist",
  "Future worker requires workspace boundary guard",
  "Future worker requires evidence capture",
  "Future worker requires validation before completion",
  "Future worker requires emergency stop compatibility",
  "Health status is declarative only",
  "No backend worker service",
  "No authentication changes",
  "No worker spawn",
  "No task execution",
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

export const localDesktopWorkerBlueprintSignals = [
  "worker process boundary",
  "command allowlist boundary",
  "workspace root boundary",
  "task intake boundary",
  "validation command boundary",
  "evidence output boundary",
  "owner decision dependency",
  "emergency stop dependency",
] as const;

export const localDesktopWorkerBlueprintPacket: LocalDesktopWorkerBlueprintPacket = {
  phase: {
    number: 55,
    label: "Phase 55 · Local Desktop Worker Blueprint v1",
    milestone: "Private app blueprint for the future local desktop worker contract",
  },
  workerBlueprintStatus: "blueprint-ready",
  blueprintMode: "local private worker contract blueprint only",
  workerSummary: {
    blueprintId: "phase55_local_desktop_worker_blueprint",
    owner: "Tyler Wallace",
    sourcePhase: "Phase 54 operator owner decision record surface",
    targetRuntime: "Windows local desktop worker",
    workerRoleCount: 5,
    enabledWorkerCount: 0,
    connectedWorkerCount: 0,
    executableTaskCount: 0,
  },
  workerContract: {
    workerId: "sera-local-desktop-worker-blueprint",
    owner: "Tyler Wallace",
    runtimeMode: "blueprint_only_not_installed",
    startupMethod: "future manual local start or scheduled dry-run after approval",
    allowedInputs: [
      "owner-reviewed plan preview",
      "future persisted owner decision record",
      "future task queue item",
      "future validation command allowlist entry",
    ],
    forbiddenAuthorities: [
      "cannot execute commands",
      "cannot spawn a worker process",
      "cannot mutate files",
      "cannot mutate source",
      "cannot route work",
      "cannot self-approve",
    ],
    healthSignals: [
      "worker installed: no",
      "worker connected: no",
      "worker heartbeat: not available",
      "worker execution: blocked",
    ],
    evidenceRequirements: [
      "owner decision record",
      "task packet",
      "validation output",
      "safety gate report",
      "morning status packet",
    ],
  },
  workerRoles: [
    {
      id: "worker-contract-host",
      label: "Worker contract host",
      responsibility: "Defines the future local worker interface without creating a running worker.",
      authority: "describe_only",
      blockedAuthority: ["no worker spawn", "no command execution"],
    },
    {
      id: "workspace-boundary-guardian",
      label: "Workspace boundary guardian",
      responsibility: "Defines how a future worker must stay inside the approved repository/workspace boundary.",
      authority: "guardrail_blueprint_only",
      blockedAuthority: ["no file mutation", "no path traversal"],
    },
    {
      id: "validation-runner-blueprint",
      label: "Validation runner blueprint",
      responsibility: "Defines future validation expectations before any worker result can be considered complete.",
      authority: "validation_contract_only",
      blockedAuthority: ["no validation execution", "no command execution"],
    },
    {
      id: "evidence-collector-blueprint",
      label: "Evidence collector blueprint",
      responsibility: "Defines the future artifact packet a worker must produce for Tyler review.",
      authority: "evidence_contract_only",
      blockedAuthority: ["no artifact mutation beyond demo reports", "no final approval"],
    },
    {
      id: "health-reporter-blueprint",
      label: "Health reporter blueprint",
      responsibility: "Defines future worker health signals for the operator console.",
      authority: "status_contract_only",
      blockedAuthority: ["no live heartbeat", "no process control"],
    },
  ],
  workerContractFields: [
    "workerId",
    "owner",
    "runtimeMode",
    "startupMethod",
    "allowedInputs",
    "forbiddenAuthorities",
    "healthSignals",
    "evidenceRequirements",
  ],
  workerCapabilitySignals: [...localDesktopWorkerBlueprintSignals],
  routing: {
    suggestedQueue: "Tyler local desktop worker readiness review",
    reviewRequired: true,
    ownerDecisionRequired: true,
    workerConnectionAllowed: false,
    workerSpawnAllowed: false,
    taskExecutionAllowed: false,
    autoRouteAllowed: false,
    autoProcessingAllowed: false,
  },
  boundaries: {
    localOnly: true,
    privateAppOnly: true,
    blueprintOnly: true,
    workerContractOnly: true,
    designOnly: true,
    readOnly: true,
    frontendOnly: true,
    noBackendLogic: true,
    noAuthentication: true,
    commandExecutionAllowed: false,
    runnerConnectivityAllowed: false,
    workerSpawnAllowed: false,
    taskExecutionAllowed: false,
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
