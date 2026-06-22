export type OwnerReviewDecisionDraftStatus = "decision-draft-ready" | "blocked";

export type OwnerDecisionOptionId =
  | "approve-for-planning"
  | "needs-changes"
  | "reject"
  | "hold-for-context";

export type OwnerDecisionOption = {
  id: OwnerDecisionOptionId;
  label: string;
  meaning: string;
  allowedNextState: string;
  requiresRationale: boolean;
  requiresOwnerConfirmation: boolean;
  blockedAuthority: string[];
};

export type OwnerReviewDecisionPacket = {
  phase: {
    number: 53;
    label: string;
    milestone: string;
  };
  decisionDraftStatus: OwnerReviewDecisionDraftStatus;
  decisionMode: string;
  decisionSummary: {
    decisionSetId: string;
    owner: string;
    sourceQueue: string;
    sourcePhase: string;
    decisionOptionCount: number;
    executableApprovalCount: number;
    finalApprovalCount: number;
    draftOnlyCount: number;
  };
  activeReviewItem: {
    reviewItemId: string;
    title: string;
    source: string;
    currentState: string;
    ownerDecisionState: string;
    allowedDraftAction: string;
  };
  decisionOptions: OwnerDecisionOption[];
  decisionFields: string[];
  decisionSignals: string[];
  routing: {
    suggestedQueue: string;
    reviewRequired: boolean;
    ownerDecisionRequired: boolean;
    finalApprovalAllowed: boolean;
    taskCreationAllowed: boolean;
    runnerConnectionAllowed: boolean;
    autoRouteAllowed: boolean;
    autoProcessingAllowed: boolean;
  };
  boundaries: {
    localOnly: boolean;
    privateAppOnly: boolean;
    reviewOnly: boolean;
    decisionDraftOnly: boolean;
    planIntakeOnly: boolean;
    readOnly: boolean;
    frontendOnly: boolean;
    noBackendLogic: boolean;
    noAuthentication: boolean;
    commandExecutionAllowed: boolean;
    runnerConnectivityAllowed: boolean;
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

export const ownerReviewDecisionSafetyGates = [
  "Owner review decision drafts only",
  "Tyler remains the decision owner",
  "Draft decisions do not equal final approval",
  "Approve for planning does not create tasks",
  "Needs changes remains review-only",
  "Reject records intent only",
  "Hold for context cannot auto-route",
  "Owner rationale required before future recording",
  "No command execution",
  "No runner connectivity",
  "No backend decision service",
  "No authentication changes",
  "No task creation",
  "No source mutation",
  "No file mutation",
  "No final approval",
  "No auto-approval",
  "No self-approval",
] as const;

export const ownerReviewDecisionSignals = [
  "review item id",
  "decision option id",
  "owner rationale requirement",
  "allowed next state",
  "blocked authority",
  "source queue",
  "decision owner",
  "final approval boundary",
] as const;

export const ownerReviewDecisionPacket: OwnerReviewDecisionPacket = {
  phase: {
    number: 53,
    label: "Phase 53 · Owner Review Decision Draft v1",
    milestone: "Draft-only owner decisions for local plan review items",
  },
  decisionDraftStatus: "decision-draft-ready",
  decisionMode: "local private owner decision draft only",
  decisionSummary: {
    decisionSetId: "phase53_owner_review_decision_draft",
    owner: "Tyler Wallace",
    sourceQueue: "Tyler local plan review queue",
    sourcePhase: "Phase 52 local plan review queue",
    decisionOptionCount: 4,
    executableApprovalCount: 0,
    finalApprovalCount: 0,
    draftOnlyCount: 4,
  },
  activeReviewItem: {
    reviewItemId: "review-phase-build-plan",
    title: "Review phase build plan preview",
    source: "Phase 52 local plan review queue",
    currentState: "pending_owner_review",
    ownerDecisionState: "pending",
    allowedDraftAction: "draft_decision_only",
  },
  decisionOptions: [
    {
      id: "approve-for-planning",
      label: "Approve for planning",
      meaning: "Tyler is comfortable turning the preview into a future planning record after a later recorder phase exists.",
      allowedNextState: "planning_candidate_only",
      requiresRationale: true,
      requiresOwnerConfirmation: true,
      blockedAuthority: ["no task creation", "no execution", "no runner handoff", "no final approval"],
    },
    {
      id: "needs-changes",
      label: "Needs changes",
      meaning: "Tyler wants the plan preview revised before it can move forward.",
      allowedNextState: "revision_needed_only",
      requiresRationale: true,
      requiresOwnerConfirmation: true,
      blockedAuthority: ["no auto-revision", "no task creation", "no execution"],
    },
    {
      id: "reject",
      label: "Reject",
      meaning: "Tyler does not want this plan preview to proceed.",
      allowedNextState: "rejected_intent_only",
      requiresRationale: true,
      requiresOwnerConfirmation: true,
      blockedAuthority: ["no deletion", "no source mutation", "no runner handoff"],
    },
    {
      id: "hold-for-context",
      label: "Hold for more context",
      meaning: "Tyler needs more information before choosing a direction.",
      allowedNextState: "context_needed_only",
      requiresRationale: true,
      requiresOwnerConfirmation: true,
      blockedAuthority: ["no auto-route", "no auto-processing", "no execution"],
    },
  ],
  decisionFields: [
    "id",
    "label",
    "meaning",
    "allowedNextState",
    "requiresRationale",
    "requiresOwnerConfirmation",
    "blockedAuthority",
    "finalApprovalBoundary",
  ],
  decisionSignals: [...ownerReviewDecisionSignals],
  routing: {
    suggestedQueue: "Tyler owner decision draft queue",
    reviewRequired: true,
    ownerDecisionRequired: true,
    finalApprovalAllowed: false,
    taskCreationAllowed: false,
    runnerConnectionAllowed: false,
    autoRouteAllowed: false,
    autoProcessingAllowed: false,
  },
  boundaries: {
    localOnly: true,
    privateAppOnly: true,
    reviewOnly: true,
    decisionDraftOnly: true,
    planIntakeOnly: true,
    readOnly: true,
    frontendOnly: true,
    noBackendLogic: true,
    noAuthentication: true,
    commandExecutionAllowed: false,
    runnerConnectivityAllowed: false,
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
