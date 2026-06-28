export type ChatGptBridgeDryRunStatus = 'chatgpt-bridge-dry-run-ready';

export type ChatGptBridgePromptType =
  | 'next-phase-request'
  | 'repair-request'
  | 'merge-review-request'
  | 'owner-attention-summary';

export type ChatGptBridgeDryRunV1 = {
  phaseId: 'phase111-chatgpt-bridge-dry-run-v1';
  status: ChatGptBridgeDryRunStatus;
  safetyGateCount: 2460;
  declaredFileCount: 5;
  supportedPromptTypes: ChatGptBridgePromptType[];
  allowedCapabilities: string[];
  blockedCapabilities: string[];
  nextPhases: string[];
};

export const chatGptBridgeDryRunV1: ChatGptBridgeDryRunV1 = {
  phaseId: 'phase111-chatgpt-bridge-dry-run-v1',
  status: 'chatgpt-bridge-dry-run-ready',
  safetyGateCount: 2460,
  declaredFileCount: 5,
  supportedPromptTypes: [
    'next-phase-request',
    'repair-request',
    'merge-review-request',
    'owner-attention-summary',
  ],
  allowedCapabilities: [
    'handoff-status-classification',
    'closed-cleanly-next-phase-prompt-generation',
    'blocked-repair-prompt-generation',
    'pass-merge-review-prompt-generation',
    'needs-attention-owner-summary-generation',
    'bridge-outbox-file-writing',
    'dom-selector-observation-recording-for-future-phase',
    'phone-readable-bridge-packet-summaries',
  ],
  blockedCapabilities: [
    'chatgpt-browser-control',
    'chatgpt-prompt-submission',
    'chatgpt-download-automation',
    'dom-element-clicking',
    'credential-reading',
    'token-exposure',
    'paid-service-activation',
    'self-approval-outside-policy',
    'real-git-push-tag-delete',
  ],
  nextPhases: [
    'phase112-chatgpt-bridge-dom-inspector-v1',
    'phase113-safe-autopilot-batch-runner-v1',
  ],
};
