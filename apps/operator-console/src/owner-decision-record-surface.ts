export type OwnerDecisionRecordSurfaceStatus = "record-surface-ready" | "blocked";

export type OwnerDecisionRecordActionId =
  | "record-approve-for-planning"
  | "record-needs-changes"
  | "record-reject"
  | "record-hold-for-context";

export type OwnerDecisionRecordAction = {
  id: OwnerDecisionRecordActionId;
  label: string;
  sourceDecisionOptionId: string;
  recordMeaning: string;
  allowedRecordState: string;
  requiresOwnerRationale: boolean;
  persistsRecord: boolean;
  blockedAuthority: string[];
};

export type OwnerDecisionRecordSurfacePacket = {
  phase: {
    number: 54;
    label: string;
    milestone: string;
  };
  recordSurfaceStatus: OwnerDecisionRecordSurfaceStatus;
  recordMode: string;
  recordSummary: {
    surfaceId: string;
    owner: string;
    sourceDecisionSet: string;
    sourcePhase: string;
    draftDecisionCount: number;
    recordableDecisionCount: number;
    persistedRecordCount: number;
    executableApprovalCount: number;
  };
  selectedDecision: {
    decisionOptionId: string;
    label: string;
    sourceReviewItemId: string;
    sourceReviewItemTitle: string;
    sourceDecisionState: string;
    rationaleRequirement: string;
    recordState: string;
    allowedRecordAction: string;
  };
  recordDraft: {
    recordId: string;
    owner: string;
    rationale: string;
    rationaleStatus: string;
    timestampStatus: string;
    recordAuthority: string;
    evidenceReferences: string[];
    finalApprovalBoundary: string;
  };
  recordActions: OwnerDecisionRecordAction[];
  recordFields: string[];
  recordSignals: string[];
  routing: {
    suggestedQueue: string;
    reviewRequired: boolean;
    ownerDecisionRequired: boolean;
    recordPersistenceAllowed: boolean;
    taskCreationAllowed: boolean;
    finalApprovalAllowed: boolean;
    runnerConnectionAllowed: boolean;
    autoRouteAllowed: boolean;
    autoProcessingAllowed: boolean;
  };
  boundaries: {
    localOnly: boolean;
    privateAppOnly: boolean;
    reviewOnly: boolean;
    recordSurfaceOnly: boolean;
    decisionRecordDraftOnly: boolean;
    planIntakeOnly: boolean;
    readOnly: boolean;
    frontendOnly: boolean;
    noBackendLogic: boolean;
    noAuthentication: boolean;
    commandExecutionAllowed: boolean;
    runnerConnectivityAllowed: boolean;
    recordPersistenceAllowed: boolean;
    taskCreationAllowed: boolean;
    mutatesSource: boolean;
    fileMutationAllowed: boolean;
    finalApprovalAllowed: boolean;
    autoApprovalAllowed: boolean;
    autoProcessingAllowed: boolean;
    autoRouteAllowed: boolean;
    autoMergeAllowed: boolean;
    selfApprovalAllowed: boolean;
  };
};

export const ownerDecisionRecordSurfaceSafetyGates = [
  "Owner decision record surface only",
  "Tyler remains the record owner",
  "Record preview does not persist a decision",
  "Recorded intent does not equal execution approval",
  "Approve for planning remains non-executable",
  "Needs changes remains review-only",
  "Reject does not delete artifacts",
  "Hold for context cannot auto-route",
  "Owner rationale required before future persistence",
  "No command execution",
  "No runner connectivity",
  "No backend record service",
  "No authentication changes",
  "No record persistence",
  "No task creation",
  "No source mutation",
  "No file mutation",
  "No final approval",
  "No auto-approval",
  "No self-approval",
] as const;

export const ownerDecisionRecordSurfaceSignals = [
  "source decision draft",
  "selected decision option",
  "owner rationale",
  "record id",
  "decision timestamp",
  "evidence references",
  "persistence boundary",
  "execution approval boundary",
] as const;

export const ownerDecisionRecordSurfacePacket: OwnerDecisionRecordSurfacePacket = {
  phase: {
    number: 54,
    label: "Phase 54 · Operator Owner Decision Record Surface v1",
    milestone: "Private app surface for Tyler-owned decision record previews",
  },
  recordSurfaceStatus: "record-surface-ready",
  recordMode: "local private owner decision record surface only",
  recordSummary: {
    surfaceId: "phase54_operator_owner_decision_record_surface",
    owner: "Tyler Wallace",
    sourceDecisionSet: "Phase 53 owner review decision draft",
    sourcePhase: "Phase 53 owner review decision draft",
    draftDecisionCount: 4,
    recordableDecisionCount: 4,
    persistedRecordCount: 0,
    executableApprovalCount: 0,
  },
  selectedDecision: {
    decisionOptionId: "approve-for-planning",
    label: "Approve for planning",
    sourceReviewItemId: "review-phase-build-plan",
    sourceReviewItemTitle: "Review phase build plan preview",
    sourceDecisionState: "draft_decision_only",
    rationaleRequirement: "owner rationale required before future persistence",
    recordState: "record_surface_preview_only",
    allowedRecordAction: "prepare_record_preview_only",
  },
  recordDraft: {
    recordId: "record-preview-phase-build-plan",
    owner: "Tyler Wallace",
    rationale: "Owner rationale placeholder for future manual entry.",
    rationaleStatus: "placeholder_only",
    timestampStatus: "not_persisted",
    recordAuthority: "display_only",
    evidenceReferences: ["Phase 53 decision draft", "Phase 52 plan review queue"],
    finalApprovalBoundary: "recorded decision is not execution approval",
  },
  recordActions: [
    {
      id: "record-approve-for-planning",
      label: "Record approve for planning preview",
      sourceDecisionOptionId: "approve-for-planning",
      recordMeaning: "Prepare a future record that Tyler approved the preview to become a planning candidate only.",
      allowedRecordState: "planning_record_preview_only",
      requiresOwnerRationale: true,
      persistsRecord: false,
      blockedAuthority: ["no task creation", "no execution", "no runner handoff", "no final approval"],
    },
    {
      id: "record-needs-changes",
      label: "Record needs changes preview",
      sourceDecisionOptionId: "needs-changes",
      recordMeaning: "Prepare a future record that Tyler requested revision before movement.",
      allowedRecordState: "revision_record_preview_only",
      requiresOwnerRationale: true,
      persistsRecord: false,
      blockedAuthority: ["no auto-revision", "no task creation", "no execution"],
    },
    {
      id: "record-reject",
      label: "Record reject preview",
      sourceDecisionOptionId: "reject",
      recordMeaning: "Prepare a future record that Tyler rejected the plan preview.",
      allowedRecordState: "rejection_record_preview_only",
      requiresOwnerRationale: true,
      persistsRecord: false,
      blockedAuthority: ["no deletion", "no source mutation", "no runner handoff"],
    },
    {
      id: "record-hold-for-context",
      label: "Record hold for context preview",
      sourceDecisionOptionId: "hold-for-context",
      recordMeaning: "Prepare a future record that Tyler needs additional context before deciding.",
      allowedRecordState: "context_record_preview_only",
      requiresOwnerRationale: true,
      persistsRecord: false,
      blockedAuthority: ["no auto-route", "no auto-processing", "no execution"],
    },
  ],
  recordFields: [
    "recordId",
    "owner",
    "decisionOptionId",
    "sourceReviewItemId",
    "rationaleStatus",
    "timestampStatus",
    "recordAuthority",
    "finalApprovalBoundary",
  ],
  recordSignals: [...ownerDecisionRecordSurfaceSignals],
  routing: {
    suggestedQueue: "Tyler owner decision record review",
    reviewRequired: true,
    ownerDecisionRequired: true,
    recordPersistenceAllowed: false,
    taskCreationAllowed: false,
    finalApprovalAllowed: false,
    runnerConnectionAllowed: false,
    autoRouteAllowed: false,
    autoProcessingAllowed: false,
  },
  boundaries: {
    localOnly: true,
    privateAppOnly: true,
    reviewOnly: true,
    recordSurfaceOnly: true,
    decisionRecordDraftOnly: true,
    planIntakeOnly: true,
    readOnly: true,
    frontendOnly: true,
    noBackendLogic: true,
    noAuthentication: true,
    commandExecutionAllowed: false,
    runnerConnectivityAllowed: false,
    recordPersistenceAllowed: false,
    taskCreationAllowed: false,
    mutatesSource: false,
    fileMutationAllowed: false,
    finalApprovalAllowed: false,
    autoApprovalAllowed: false,
    autoProcessingAllowed: false,
    autoRouteAllowed: false,
    autoMergeAllowed: false,
    selfApprovalAllowed: false,
  },
};
