export type FileIntakeReadiness = "metadata-ready" | "blocked";

export type FileIntakePacket = {
  phase: {
    number: 49;
    label: string;
    milestone: string;
  };
  fileIntakeStatus: FileIntakeReadiness;
  intakeMode: string;
  primaryFile: {
    name: string;
    extension: string;
    category: string;
    sizeLabel: string;
    source: string;
    classification: string;
    reviewState: string;
  };
  metadataFields: string[];
  routing: {
    suggestedQueue: string;
    reviewRequired: boolean;
    runnerConnectionAllowed: boolean;
    autoProcessingAllowed: boolean;
  };
  boundaries: {
    localOnly: boolean;
    privateAppOnly: boolean;
    metadataCaptureOnly: boolean;
    readOnly: boolean;
    frontendOnly: boolean;
    noBackendLogic: boolean;
    noAuthentication: boolean;
    arbitraryFileAccessAllowed: boolean;
    fileExecutionAllowed: boolean;
    fileMutationAllowed: boolean;
    runnerConnectivityAllowed: boolean;
    mutatesSource: boolean;
    autoProcessingAllowed: boolean;
    autoRouteAllowed: boolean;
    autoMergeAllowed: boolean;
    selfApprovalAllowed: boolean;
  };
};

export const fileIntakeSafetyGates = [
  "Capture file metadata only",
  "Owner review required before file processing",
  "No arbitrary file access",
  "No file execution",
  "No file mutation",
  "No source mutation",
  "No runner connectivity",
  "No backend file service",
  "No authentication changes",
  "No auto-processing",
  "No auto-routing",
  "No auto-merge",
  "No self-approval",
] as const;

export const fileIntakeSignals = [
  "file name",
  "file extension",
  "file category",
  "file size label",
  "file source",
  "file classification",
  "review state",
] as const;

export const fileIntakePacket: FileIntakePacket = {
  phase: {
    number: 49,
    label: "Phase 49 · File Intake v1",
    milestone: "Capture-only private file metadata intake",
  },
  fileIntakeStatus: "metadata-ready",
  intakeMode: "local metadata review only",
  primaryFile: {
    name: "phase-50-workflow-library-brief.md",
    extension: ".md",
    category: "planning document",
    sizeLabel: "metadata only",
    source: "owner-selected local file placeholder",
    classification: "review-only · no processing authority",
    reviewState: "waiting for owner review",
  },
  metadataFields: [
    "name",
    "extension",
    "category",
    "sizeLabel",
    "source",
    "classification",
    "reviewState",
    "suggestedQueue",
  ],
  routing: {
    suggestedQueue: "Owner file review queue",
    reviewRequired: true,
    runnerConnectionAllowed: false,
    autoProcessingAllowed: false,
  },
  boundaries: {
    localOnly: true,
    privateAppOnly: true,
    metadataCaptureOnly: true,
    readOnly: true,
    frontendOnly: true,
    noBackendLogic: true,
    noAuthentication: true,
    arbitraryFileAccessAllowed: false,
    fileExecutionAllowed: false,
    fileMutationAllowed: false,
    runnerConnectivityAllowed: false,
    mutatesSource: false,
    autoProcessingAllowed: false,
    autoRouteAllowed: false,
    autoMergeAllowed: false,
    selfApprovalAllowed: false,
  },
};
