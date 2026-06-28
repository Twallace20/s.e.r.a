export type AutopilotReliabilityScaffoldV1 = {
  phaseId: 'phase108-autopilot-reliability-scaffold-v1';
  status: 'autopilot-reliability-scaffold-ready';
  safetyGateCount: 2280;
  declaredFileCount: 5;
  allowedCapabilities: string[];
  blockedCapabilities: string[];
  nextPhases: string[];
};

export const autopilotReliabilityScaffoldV1: AutopilotReliabilityScaffoldV1 = {
  phaseId: 'phase108-autopilot-reliability-scaffold-v1',
  status: 'autopilot-reliability-scaffold-ready',
  safetyGateCount: 2280,
  declaredFileCount: 5,
  allowedCapabilities: [
    'autopilot-policy-read',
    'owner-run-card-parse',
    'pause-file-detection',
    'needs-attention-packet-draft',
    'rollback-packet-draft',
    'evidence-packet-draft',
    'idempotent-merge-completion-classification',
    'milestone-review-shell-draft',
  ],
  blockedCapabilities: [
    'real-project-merge-execution',
    'git-push-execution',
    'tag-creation-execution',
    'remote-branch-deletion-execution',
    'chatgpt-browser-execution',
    'token-exposure',
    'paid-service-activation',
    'self-approval',
    'self-deploy',
  ],
  nextPhases: [
    'phase109-proof-of-use-simulation-harness-v1',
    'phase110-chatgpt-bridge-dry-run-v1',
  ],
};
