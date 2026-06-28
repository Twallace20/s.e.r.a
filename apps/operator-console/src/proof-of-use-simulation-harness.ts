export type ProofOfUseSimulationHarnessV1 = {
  phaseId: 'phase109-proof-of-use-simulation-harness-v1';
  status: 'proof-of-use-simulation-harness-ready';
  safetyGateCount: 2340;
  declaredFileCount: 5;
  requiredBeforeAutoMerge: true;
  proofFixtures: string[];
  proofScenarios: string[];
  blockedCapabilities: string[];
  nextPhases: string[];
};

export const proofOfUseSimulationHarnessV1: ProofOfUseSimulationHarnessV1 = {
  phaseId: 'phase109-proof-of-use-simulation-harness-v1',
  status: 'proof-of-use-simulation-harness-ready',
  safetyGateCount: 2340,
  declaredFileCount: 5,
  requiredBeforeAutoMerge: true,
  proofFixtures: [
    'closed_cleanly_handoff',
    'blocked_handoff',
    'pass_handoff',
    'merge_pending_packet',
    'run_card',
    'rollback_packet',
    'evidence_packet',
    'bridge_outbox_prompt',
  ],
  proofScenarios: [
    'closed-cleanly-creates-next-phase-request',
    'blocked-creates-repair-request',
    'pass-waits-for-merge-or-safe-auto-merge-policy',
    'merge-pending-validates-owner-or-policy-approval',
    'rollback-scenario-proves-recovery-command-lineage',
    'needs-attention-stops-batch-and-preserves-evidence',
    'run-card-batch-proves-phone-control-start',
    'pause-file-proves-phone-control-stop',
  ],
  blockedCapabilities: [
    'real-project-merge-execution',
    'git-push-execution',
    'tag-creation-execution',
    'remote-branch-deletion-execution',
    'chatgpt-browser-execution',
    'chatgpt-prompt-submission',
    'token-exposure',
    'paid-service-activation',
    'self-approval',
    'self-deploy',
  ],
  nextPhases: [
    'phase110-chatgpt-bridge-dry-run-v1',
    'phase111-chatgpt-bridge-dom-inspector-v1',
  ],
};
