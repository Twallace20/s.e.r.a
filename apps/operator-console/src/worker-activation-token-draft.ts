export const workerActivationTokenDraft = {
  workerActivationTokenDraftStatus: "worker-activation-token-draft-ready",
  workerActivationTokenDraftId: "phase106-demo-worker-activation-token-draft",
  sourceWorkerActivationDecisionRecordId: "phase105-demo-worker-activation-decision-record",
  phase105WorkerActivationDecisionRecordReady: true,
  activationTokenDraftCount: 12,
  ownerTokenDecisionDraftCount: 12,
  tokenPolicyDraftCount: 12,
  tokenAuditDraftCount: 12,
  activationTokenDenialRecordCount: 12,
  readyForOwnerReview: true,
};

export const workerActivationTokenDraftSafetyGates = [
  { label: "Activation Token Issuance", value: "blocked", tone: "blocked" as const },
  { label: "Activation Credential Issuance", value: "blocked", tone: "blocked" as const },
  { label: "Token Material Generation", value: "blocked", tone: "blocked" as const },
  { label: "Secret Material Generation", value: "blocked", tone: "blocked" as const },
  { label: "Worker Activation", value: "blocked", tone: "blocked" as const },
  { label: "Worker Execution", value: "blocked", tone: "blocked" as const },
  { label: "Fleet Execution", value: "blocked", tone: "blocked" as const },
  { label: "Self Approval", value: "blocked", tone: "blocked" as const },
];
