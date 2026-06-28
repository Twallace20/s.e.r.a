export type ValidationProfileName = 'quick' | 'gate' | 'milestone';

export type ValidationProfilesProofGateV1 = {
  phaseId: 'phase110-validation-profiles-proof-gate-v1';
  status: 'validation-profiles-proof-gate-ready';
  safetyGateCount: 2400;
  declaredFileCount: 5;
  profiles: ValidationProfileName[];
  allowedCapabilities: string[];
  blockedCapabilities: string[];
  nextPhases: string[];
};

export const validationProfilesProofGateV1: ValidationProfilesProofGateV1 = {
  phaseId: 'phase110-validation-profiles-proof-gate-v1',
  status: 'validation-profiles-proof-gate-ready',
  safetyGateCount: 2400,
  declaredFileCount: 5,
  profiles: ['quick', 'gate', 'milestone'],
  allowedCapabilities: [
    'profile-based-validation-planning',
    'single-merge-gate-command',
    'proof-of-use-targeting',
    'proof-pass-registry-evaluation',
    'pending-merge-safe-auto-approval-decision',
    'milestone-validation-scheduling',
    'certification-artifact-check-without-duplicate-test-suite',
  ],
  blockedCapabilities: [
    'skipping-related-proof-without-pass-history',
    'skipping-proof-after-file-change',
    'duplicate-full-test-chain-in-gate-profile',
    'auto-approving-merge-without-pass-packet',
    'auto-approving-merge-without-proof-gate',
    'auto-approving-merge-without-policy',
    'token-exposure',
    'paid-service-activation',
    'self-approval-outside-policy',
  ],
  nextPhases: [
    'phase111-chatgpt-bridge-dry-run-v1',
    'phase112-chatgpt-bridge-dom-inspector-v1',
  ],
};
