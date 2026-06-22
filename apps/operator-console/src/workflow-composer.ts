export type WorkflowComposerReadiness = "composition-ready" | "blocked";

export type WorkflowComposerSignal = {
  id: string;
  label: string;
  source: string;
  value: string;
  reviewRequired: boolean;
};

export type WorkflowComposerPlanStep = {
  id: string;
  title: string;
  status: string;
  ownerGate: string;
  executionAuthority: string;
};

export type WorkflowComposerPacket = {
  phase: {
    number: 51;
    label: string;
    milestone: string;
  };
  workflowComposerStatus: WorkflowComposerReadiness;
  compositionMode: string;
  requestSignal: WorkflowComposerSignal;
  fileSignal: WorkflowComposerSignal;
  workflowSignal: WorkflowComposerSignal;
  composedPlan: {
    planId: string;
    title: string;
    status: string;
    summary: string;
    suggestedQueue: string;
    outputPreview: string;
    ownerGate: string;
    steps: WorkflowComposerPlanStep[];
    evidenceRequirements: string[];
  };
  compositionFields: string[];
  compositionSignals: string[];
  routing: {
    suggestedQueue: string;
    reviewRequired: boolean;
    runnerConnectionAllowed: boolean;
    autoRouteAllowed: boolean;
    autoProcessingAllowed: boolean;
  };
  boundaries: {
    localOnly: boolean;
    privateAppOnly: boolean;
    compositionOnly: boolean;
    planPreviewOnly: boolean;
    readOnly: boolean;
    frontendOnly: boolean;
    noBackendLogic: boolean;
    noAuthentication: boolean;
    commandExecutionAllowed: boolean;
    runnerConnectivityAllowed: boolean;
    mutatesSource: boolean;
    fileMutationAllowed: boolean;
    autoProcessingAllowed: boolean;
    autoRouteAllowed: boolean;
    autoMergeAllowed: boolean;
    selfApprovalAllowed: boolean;
  };
};

export const workflowComposerSafetyGates = [
  "Composition preview only",
  "Request signal remains capture-only",
  "File signal remains metadata-only",
  "Workflow signal remains catalog-only",
  "Owner review required before task creation",
  "No command execution",
  "No runner connectivity",
  "No backend workflow service",
  "No authentication changes",
  "No source mutation",
  "No file mutation",
  "No auto-processing",
  "No auto-routing",
  "No auto-merge",
  "No self-approval",
] as const;

export const workflowComposerSignals = [
  "request title",
  "request details",
  "file metadata",
  "workflow selection",
  "suggested queue",
  "owner gate",
  "evidence requirements",
  "plan preview",
] as const;

export const workflowComposerPacket: WorkflowComposerPacket = {
  phase: {
    number: 51,
    label: "Phase 51 · Workflow Composer v1",
    milestone: "Request + file + workflow composition preview",
  },
  workflowComposerStatus: "composition-ready",
  compositionMode: "local private plan preview only",
  requestSignal: {
    id: "request-signal-phase-build",
    label: "Phase build request",
    source: "Phase 48 request intake",
    value: "Prepare a safe owner-reviewed phase plan",
    reviewRequired: true,
  },
  fileSignal: {
    id: "file-signal-metadata-only",
    label: "Metadata-only file context",
    source: "Phase 49 file intake",
    value: "Owner-selected local file metadata, no content processing",
    reviewRequired: true,
  },
  workflowSignal: {
    id: "workflow-signal-phase-build",
    label: "Phase Build",
    source: "Phase 50 workflow library",
    value: "Catalog-only workflow definition selected for composition preview",
    reviewRequired: true,
  },
  composedPlan: {
    planId: "phase51_composed_plan_preview",
    title: "Owner-reviewed phase build plan preview",
    status: "preview_only",
    summary: "Combines a captured request, metadata-only file context, and catalog workflow definition into a structured plan preview for Tyler review.",
    suggestedQueue: "Tyler workflow composition review queue",
    outputPreview: "owner-reviewable plan preview",
    ownerGate: "Tyler approval required before task creation, routing, execution, or worker handoff",
    steps: [
      {
        id: "review-request-signal",
        title: "Review request signal",
        status: "preview_only",
        ownerGate: "Tyler confirms request intent",
        executionAuthority: "read-only",
      },
      {
        id: "review-file-signal",
        title: "Review metadata-only file signal",
        status: "preview_only",
        ownerGate: "Tyler confirms file context",
        executionAuthority: "metadata-only",
      },
      {
        id: "select-workflow-signal",
        title: "Select workflow definition",
        status: "preview_only",
        ownerGate: "Tyler confirms workflow fit",
        executionAuthority: "catalog-only",
      },
      {
        id: "compose-plan-preview",
        title: "Compose plan preview",
        status: "preview_only",
        ownerGate: "Tyler approval required before conversion to tasks",
        executionAuthority: "no execution",
      },
    ],
    evidenceRequirements: [
      "request intake evidence",
      "file metadata evidence",
      "workflow catalog evidence",
      "owner approval checkpoint",
      "validation proof before any future execution",
    ],
  },
  compositionFields: [
    "requestSignal",
    "fileSignal",
    "workflowSignal",
    "composedPlan",
    "steps",
    "evidenceRequirements",
    "suggestedQueue",
    "ownerGate",
  ],
  compositionSignals: [...workflowComposerSignals],
  routing: {
    suggestedQueue: "Tyler workflow composition review queue",
    reviewRequired: true,
    runnerConnectionAllowed: false,
    autoRouteAllowed: false,
    autoProcessingAllowed: false,
  },
  boundaries: {
    localOnly: true,
    privateAppOnly: true,
    compositionOnly: true,
    planPreviewOnly: true,
    readOnly: true,
    frontendOnly: true,
    noBackendLogic: true,
    noAuthentication: true,
    commandExecutionAllowed: false,
    runnerConnectivityAllowed: false,
    mutatesSource: false,
    fileMutationAllowed: false,
    autoProcessingAllowed: false,
    autoRouteAllowed: false,
    autoMergeAllowed: false,
    selfApprovalAllowed: false,
  },
};
