export const workerActivationTokenReviewRecord = {
  workerActivationTokenReviewRecordStatus: "worker-activation-token-review-record-ready",
  workerActivationTokenReviewRecordId: "phase107-demo-worker-activation-token-review-record",
  sourceWorkerActivationTokenDraftId: "phase105-demo-worker-activation-decision-record",
  phase106WorkerActivationTokenDraftReady: true,
  activationTokenReviewRecordCount: 12,
  ownerTokenReviewRecordCount: 12,
  tokenPolicyReviewRecordCount: 12,
  tokenAuditReviewRecordCount: 12,
  activationTokenReviewDenialRecordCount: 12,
  readyForOwnerReview: true,
};

export const workerActivationTokenReviewRecordSafetyGates = [
  { label: "Activation Token Issuance", value: "blocked", tone: "blocked" as const },
  { label: "Activation Credential Issuance", value: "blocked", tone: "blocked" as const },
  { label: "Token Material Generation", value: "blocked", tone: "blocked" as const },
  { label: "Secret Material Generation", value: "blocked", tone: "blocked" as const },
  { label: "Worker Activation", value: "blocked", tone: "blocked" as const },
  { label: "Worker Execution", value: "blocked", tone: "blocked" as const },
  { label: "Fleet Execution", value: "blocked", tone: "blocked" as const },
  { label: "Self Approval", value: "blocked", tone: "blocked" as const },
];
