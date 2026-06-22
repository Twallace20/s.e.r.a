export type RequestIntakePriority = "High" | "Medium" | "Low";
export type RequestWorkflowType =
  | "Phase build"
  | "Validation review"
  | "Evidence packet"
  | "Research brief"
  | "App improvement";

export type RequestIntakeDraft = {
  phase: {
    number: 48;
    label: string;
    milestone: string;
  };
  title: string;
  details: string;
  requestedBy: string;
  priority: RequestIntakePriority;
  workflowType: RequestWorkflowType;
  intakeStatus: string;
  safetyClassification: string;
  routing: {
    suggestedQueue: string;
    reviewRequired: boolean;
    executionAllowed: boolean;
    runnerConnectionAllowed: boolean;
  };
  boundaries: {
    localOnly: boolean;
    privateAppOnly: boolean;
    captureOnly: boolean;
    readOnly: boolean;
    frontendOnly: boolean;
    noBackendLogic: boolean;
    noAuthentication: boolean;
    commandExecutionAllowed: boolean;
    runnerConnectivityAllowed: boolean;
    mutatesSource: boolean;
    autoSubmitAllowed: boolean;
    autoRouteAllowed: boolean;
    autoMergeAllowed: boolean;
    selfApprovalAllowed: boolean;
  };
};

export const requestIntakeSafetyGates = [
  "Capture request drafts only",
  "Owner review required before routing",
  "No autonomous submission",
  "No command execution",
  "No runner connectivity",
  "No backend intake service",
  "No authentication changes",
  "No source mutation",
  "No auto-merge",
  "No self-approval",
] as const;

export const requestIntakeSignals = [
  "request title",
  "request details",
  "priority",
  "workflow type",
  "suggested queue",
  "safety classification",
] as const;

export const requestIntakeDraft: RequestIntakeDraft = {
  phase: {
    number: 48,
    label: "Phase 48 · Request Intake v1",
    milestone: "Capture-only private request intake",
  },
  title: "Prepare Phase 49 file intake",
  details:
    "Capture this operator request as a local-only draft. Classify the workflow, preserve owner review, and do not execute commands or route work automatically.",
  requestedBy: "Tyler · owner-operator",
  priority: "High",
  workflowType: "Phase build",
  intakeStatus: "Captured for owner review",
  safetyClassification: "planning-only · no execution authority",
  routing: {
    suggestedQueue: "Owner review queue",
    reviewRequired: true,
    executionAllowed: false,
    runnerConnectionAllowed: false,
  },
  boundaries: {
    localOnly: true,
    privateAppOnly: true,
    captureOnly: true,
    readOnly: true,
    frontendOnly: true,
    noBackendLogic: true,
    noAuthentication: true,
    commandExecutionAllowed: false,
    runnerConnectivityAllowed: false,
    mutatesSource: false,
    autoSubmitAllowed: false,
    autoRouteAllowed: false,
    autoMergeAllowed: false,
    selfApprovalAllowed: false,
  },
};
