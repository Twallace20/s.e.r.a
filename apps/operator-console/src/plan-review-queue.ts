export type PlanReviewQueueStatus = "review-queue-ready" | "blocked";

export type PlanReviewQueueItemStatus = "pending_owner_review" | "needs_changes" | "approved_preview_only" | "blocked";

export type PlanReviewQueueItem = {
  id: string;
  title: string;
  source: string;
  status: PlanReviewQueueItemStatus;
  priority: "standard" | "high";
  requestedBy: string;
  workflow: string;
  reviewGate: string;
  ownerDecisionState: string;
  allowedNextAction: string;
  evidenceReferences: string[];
  executionAuthority: string;
};

export type PlanReviewQueuePacket = {
  phase: {
    number: 52;
    label: string;
    milestone: string;
  };
  planReviewQueueStatus: PlanReviewQueueStatus;
  queueMode: string;
  queueSummary: {
    queueId: string;
    queueName: string;
    owner: string;
    sourcePhase: string;
    itemCount: number;
    pendingReviewCount: number;
    approvedPreviewOnlyCount: number;
    blockedCount: number;
  };
  reviewItems: PlanReviewQueueItem[];
  reviewFields: string[];
  queueSignals: string[];
  routing: {
    suggestedQueue: string;
    reviewRequired: boolean;
    ownerDecisionRequired: boolean;
    runnerConnectionAllowed: boolean;
    autoRouteAllowed: boolean;
    autoProcessingAllowed: boolean;
  };
  boundaries: {
    localOnly: boolean;
    privateAppOnly: boolean;
    reviewQueueOnly: boolean;
    planIntakeOnly: boolean;
    readOnly: boolean;
    frontendOnly: boolean;
    noBackendLogic: boolean;
    noAuthentication: boolean;
    commandExecutionAllowed: boolean;
    runnerConnectivityAllowed: boolean;
    mutatesSource: boolean;
    fileMutationAllowed: boolean;
    autoApprovalAllowed: boolean;
    autoProcessingAllowed: boolean;
    autoRouteAllowed: boolean;
    autoMergeAllowed: boolean;
    selfApprovalAllowed: boolean;
  };
};

export const planReviewQueueSafetyGates = [
  "Local plan review queue only",
  "Plans remain preview-only",
  "Owner decision required before task creation",
  "Owner decision required before execution",
  "Review queue cannot record final approval",
  "No command execution",
  "No runner connectivity",
  "No backend workflow service",
  "No authentication changes",
  "No source mutation",
  "No file mutation",
  "No auto-approval",
  "No auto-processing",
  "No auto-routing",
  "No auto-merge",
  "No self-approval",
] as const;

export const planReviewQueueSignals = [
  "composed plan id",
  "source request",
  "source file metadata",
  "workflow selection",
  "review status",
  "owner decision state",
  "evidence references",
  "allowed next action",
] as const;

export const planReviewQueuePacket: PlanReviewQueuePacket = {
  phase: {
    number: 52,
    label: "Phase 52 · Local Plan Review Queue v1",
    milestone: "Local review queue for composed plan previews",
  },
  planReviewQueueStatus: "review-queue-ready",
  queueMode: "local private review queue only",
  queueSummary: {
    queueId: "phase52_local_plan_review_queue",
    queueName: "Tyler local plan review queue",
    owner: "Tyler Wallace",
    sourcePhase: "Phase 51 workflow composer",
    itemCount: 4,
    pendingReviewCount: 3,
    approvedPreviewOnlyCount: 1,
    blockedCount: 0,
  },
  reviewItems: [
    {
      id: "review-phase-build-plan",
      title: "Review phase build plan preview",
      source: "Phase 51 composed plan preview",
      status: "pending_owner_review",
      priority: "high",
      requestedBy: "Tyler Wallace",
      workflow: "Phase Build",
      reviewGate: "Tyler confirms scope before task creation",
      ownerDecisionState: "pending",
      allowedNextAction: "review_only",
      evidenceReferences: ["request intake evidence", "workflow composer evidence"],
      executionAuthority: "no execution",
    },
    {
      id: "review-file-context-plan",
      title: "Review metadata-only file context",
      source: "Phase 49 file intake",
      status: "pending_owner_review",
      priority: "standard",
      requestedBy: "Tyler Wallace",
      workflow: "File Review",
      reviewGate: "Tyler confirms file context before processing",
      ownerDecisionState: "pending",
      allowedNextAction: "review_only",
      evidenceReferences: ["file metadata evidence"],
      executionAuthority: "metadata-only",
    },
    {
      id: "review-validation-plan",
      title: "Review validation plan preview",
      source: "Phase 50 workflow library",
      status: "approved_preview_only",
      priority: "standard",
      requestedBy: "Tyler Wallace",
      workflow: "Validation Review",
      reviewGate: "Tyler confirms validation expectations before any worker handoff",
      ownerDecisionState: "preview accepted, not executable",
      allowedNextAction: "prepare_review_notes_only",
      evidenceReferences: ["workflow catalog evidence", "validation proof requirement"],
      executionAuthority: "read-only",
    },
    {
      id: "review-evidence-plan",
      title: "Review evidence requirements",
      source: "Phase 51 composed evidence requirements",
      status: "pending_owner_review",
      priority: "standard",
      requestedBy: "Tyler Wallace",
      workflow: "Evidence Packet",
      reviewGate: "Tyler confirms evidence requirements before task queue conversion",
      ownerDecisionState: "pending",
      allowedNextAction: "review_only",
      evidenceReferences: ["owner approval checkpoint", "evidence requirement list"],
      executionAuthority: "no execution",
    },
  ],
  reviewFields: [
    "id",
    "title",
    "status",
    "priority",
    "workflow",
    "reviewGate",
    "ownerDecisionState",
    "allowedNextAction",
  ],
  queueSignals: [...planReviewQueueSignals],
  routing: {
    suggestedQueue: "Tyler local plan review queue",
    reviewRequired: true,
    ownerDecisionRequired: true,
    runnerConnectionAllowed: false,
    autoRouteAllowed: false,
    autoProcessingAllowed: false,
  },
  boundaries: {
    localOnly: true,
    privateAppOnly: true,
    reviewQueueOnly: true,
    planIntakeOnly: true,
    readOnly: true,
    frontendOnly: true,
    noBackendLogic: true,
    noAuthentication: true,
    commandExecutionAllowed: false,
    runnerConnectivityAllowed: false,
    mutatesSource: false,
    fileMutationAllowed: false,
    autoApprovalAllowed: false,
    autoProcessingAllowed: false,
    autoRouteAllowed: false,
    autoMergeAllowed: false,
    selfApprovalAllowed: false,
  },
};
