export type WorkflowLibraryReadiness = "catalog-ready" | "blocked";

export type WorkflowDefinition = {
  id: string;
  name: string;
  category: string;
  description: string;
  inputSignals: string[];
  outputMode: string;
  ownerGate: string;
  executionAuthority: string;
};

export type WorkflowLibraryPacket = {
  phase: {
    number: 50;
    label: string;
    milestone: string;
  };
  workflowLibraryStatus: WorkflowLibraryReadiness;
  catalogMode: string;
  primaryWorkflow: WorkflowDefinition;
  workflows: WorkflowDefinition[];
  workflowFields: string[];
  catalogSignals: string[];
  routing: {
    suggestedQueue: string;
    reviewRequired: boolean;
    runnerConnectionAllowed: boolean;
    autoRouteAllowed: boolean;
  };
  boundaries: {
    localOnly: boolean;
    privateAppOnly: boolean;
    catalogOnly: boolean;
    readOnly: boolean;
    frontendOnly: boolean;
    noBackendLogic: boolean;
    noAuthentication: boolean;
    commandExecutionAllowed: boolean;
    runnerConnectivityAllowed: boolean;
    mutatesSource: boolean;
    autoProcessingAllowed: boolean;
    autoRouteAllowed: boolean;
    autoMergeAllowed: boolean;
    selfApprovalAllowed: boolean;
  };
};

export const workflowLibrarySafetyGates = [
  "Catalog workflow definitions only",
  "Owner review required before workflow routing",
  "No command execution",
  "No runner connectivity",
  "No backend workflow service",
  "No authentication changes",
  "No source mutation",
  "No file processing",
  "No auto-processing",
  "No auto-routing",
  "No auto-merge",
  "No self-approval",
] as const;

export const workflowLibraryCatalogSignals = [
  "workflow id",
  "workflow name",
  "workflow category",
  "input signals",
  "output mode",
  "owner gate",
  "execution authority",
] as const;

const workflows: WorkflowDefinition[] = [
  {
    id: "phase-build",
    name: "Phase Build",
    category: "development",
    description: "Prepare a scoped S.E.R.A. phase with docs, scripts, tests, safety contracts, and validation evidence.",
    inputSignals: ["phase brief", "repo status", "safety boundaries", "expected proof"],
    outputMode: "branch-ready implementation packet",
    ownerGate: "owner approval before merge",
    executionAuthority: "planning only in Phase 50",
  },
  {
    id: "validation-review",
    name: "Validation Review",
    category: "quality",
    description: "Review hygiene, build, tests, certification, and phase-specific verification results.",
    inputSignals: ["terminal log", "test summary", "certification result"],
    outputMode: "validation summary",
    ownerGate: "owner confirms pass/fail decision",
    executionAuthority: "read-only review",
  },
  {
    id: "evidence-packet",
    name: "Evidence Packet",
    category: "governance",
    description: "Collect proof lines, safety boundaries, changed files, branch status, and tag status for closeout.",
    inputSignals: ["phase report", "git status", "tag list"],
    outputMode: "closeout evidence packet",
    ownerGate: "owner verifies clean state",
    executionAuthority: "no execution",
  },
  {
    id: "file-review",
    name: "File Review",
    category: "intake",
    description: "Classify owner-selected local files by metadata and review readiness without reading or processing contents.",
    inputSignals: ["file metadata", "request context", "review status"],
    outputMode: "metadata-only file review",
    ownerGate: "owner approval before processing",
    executionAuthority: "metadata display only",
  },
  {
    id: "research-brief",
    name: "Research Brief",
    category: "knowledge",
    description: "Prepare a governed research plan with source expectations and evidence requirements.",
    inputSignals: ["research question", "source needs", "recency requirement"],
    outputMode: "research plan",
    ownerGate: "owner approval before retrieval or synthesis",
    executionAuthority: "planning only",
  },
  {
    id: "app-improvement",
    name: "Operator App Improvement",
    category: "product",
    description: "Prepare safe improvements to the private operator console UI and operator workflow surfaces.",
    inputSignals: ["UI feedback", "workflow friction", "phase goal"],
    outputMode: "proposal-ready improvement plan",
    ownerGate: "owner approval before implementation",
    executionAuthority: "proposal only",
  },
];

export const workflowLibraryPacket: WorkflowLibraryPacket = {
  phase: {
    number: 50,
    label: "Phase 50 · Workflow Library v1",
    milestone: "Private operator workflow catalog",
  },
  workflowLibraryStatus: "catalog-ready",
  catalogMode: "local private workflow catalog only",
  primaryWorkflow: workflows[0],
  workflows,
  workflowFields: [
    "id",
    "name",
    "category",
    "description",
    "inputSignals",
    "outputMode",
    "ownerGate",
    "executionAuthority",
  ],
  catalogSignals: [...workflowLibraryCatalogSignals],
  routing: {
    suggestedQueue: "Owner workflow review queue",
    reviewRequired: true,
    runnerConnectionAllowed: false,
    autoRouteAllowed: false,
  },
  boundaries: {
    localOnly: true,
    privateAppOnly: true,
    catalogOnly: true,
    readOnly: true,
    frontendOnly: true,
    noBackendLogic: true,
    noAuthentication: true,
    commandExecutionAllowed: false,
    runnerConnectivityAllowed: false,
    mutatesSource: false,
    autoProcessingAllowed: false,
    autoRouteAllowed: false,
    autoMergeAllowed: false,
    selfApprovalAllowed: false,
  },
};
