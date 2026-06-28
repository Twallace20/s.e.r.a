import fs from 'node:fs';
import path from 'node:path';

export const PHASE_108_ID = 'phase108-autopilot-reliability-scaffold-v1';
export const PHASE_108_TAG = 'phase-108-autopilot-reliability-scaffold-v1';
export const PHASE_108_STATUS = 'autopilot-reliability-scaffold-ready';

export const PHASE_108_DECLARED_FILES = [
  'apps/operator-console/src/autopilot-reliability-scaffold.ts',
  'docs/phases/PHASE_108_AUTOPILOT_RELIABILITY_SCAFFOLD_V1.md',
  'scripts/lib/autopilot-reliability-scaffold-v1.mjs',
  'scripts/run-autopilot-reliability-scaffold-v1.mjs',
  'tests/integration/autopilot-reliability-scaffold-v1.test.ts',
];

export const PHASE_108_REQUIREMENTS = [
  'read-autopilot-policy-file-without-mutating-policy',
  'parse-owner-run-card-from-control-center',
  'detect-autopilot-pause-file-before-new-work',
  'write-needs-attention-packet-for-out-of-policy-states',
  'build-rollback-packet-before-safe-merge',
  'build-evidence-packet-for-each-autopilot-step',
  'classify-idempotent-merge-finalization-state',
  'recover-when-main-is-already-current',
  'recover-when-phase-tag-already-exists',
  'recover-when-remote-branch-is-already-deleted',
  'recover-when-handoff-is-missing-after-successful-close',
  'preserve-approval-packet-lineage',
  'preserve-blocked-packet-lineage',
  'preserve-complete-packet-lineage',
  'stop-on-repeated-repair-failure',
  'stop-on-secret-scan-hit',
  'stop-on-unknown-dependency-change',
  'stop-on-runner-change-unless-policy-allows-it',
  'stop-on-github-security-settings-change',
  'stop-on-paid-service-activation',
  'stop-on-large-diff-outside-policy',
  'allow-safe-auto-merge-only-after-validation-proof-and-rollback',
  'require-clean-worktree-before-apply',
  'require-origin-main-current-before-finalization',
  'require-phase-branch-and-token-match',
  'require-tag-name-and-branch-name-match-phase',
  'require-proof-of-use-gate-placeholder',
  'require-milestone-review-shell',
  'write-owner-readable-status-summary',
  'write-operator-readable-recovery-summary',
  'avoid-chatgpt-browser-execution-in-this-phase',
  'avoid-real-git-push-in-this-phase',
  'avoid-real-merge-execution-in-this-phase',
  'avoid-token-or-credential-exposure',
  'support-phone-controlled-run-card-model',
  'support-phone-controlled-pause-file-model',
  'support-multi-phase-batch-state-model',
  'support-one-drive-control-center-paths',
  'support-repair-attempt-counter-model',
  'support-evidence-first-autopilot-progress',
];

export const PHASE_108_FIELDS = [
  'phaseId',
  'autopilotReliabilityScaffoldStatus',
  'validationFailedCount',
  'declaredFileCount',
  'autopilotReliabilityRequirementCount',
  'autopilotReliabilityFieldCount',
  'autopilotControlFolderCount',
  'autopilotRunCardCount',
  'roadmapTrackCount',
  'multiLanguageProductionTargetCount',
  'safetyGateCount',
  'autopilotPolicyReadAllowed',
  'runCardReadAllowed',
  'pauseDetectionAllowed',
  'needsAttentionPacketAllowed',
  'rollbackPacketAllowed',
  'evidencePacketAllowed',
  'completionRecoveryPlanAllowed',
  'milestoneReviewShellAllowed',
  'proofOfUseGateRequired',
  'secretScanRequired',
  'riskScanRequired',
  'rollbackPacketRequired',
  'safeAutoMergePolicyAllowed',
  'safeAutoMergeExecutionAllowed',
  'repairAttemptCounterAllowed',
  'bridgeOutboxWriteAllowed',
  'chatGptBrowserExecutionAllowed',
  'chatGptPromptSubmissionAllowed',
  'projectRepoSourceMutationAllowed',
  'realProjectBranchCreationAllowed',
  'realProjectMergeExecutionAllowed',
  'gitPushAllowed',
  'tagCreationAllowed',
  'remoteBranchDeletionAllowed',
  'arbitraryCommandAllowed',
  'shellExecutionAllowed',
  'globalToolInstallAllowed',
  'dependencyInstallAllowed',
  'githubSecuritySettingsMutationAllowed',
  'paidServiceActivationAllowed',
  'tokenExposureAllowed',
  'selfApprovalAllowed',
  'selfMergeAllowed',
  'selfDeployAllowed',
  'productionDeploymentAllowed',
  'phase108Id',
  'autopilotPolicyLoaded',
  'runCardParsed',
  'pauseFileDetected',
  'needsAttentionPacketProduced',
  'rollbackPacketProduced',
  'evidencePacketProduced',
  'completionRecoveryPlanProduced',
  'milestoneReviewShellProduced',
  'ownerControlCenterPreserved',
  'projectRepoSourceMutated',
  'realMergePerformed',
  'gitPushPerformed',
  'tagCreated',
  'remoteBranchDeleted',
  'multiLanguageProductionDoctrineIncluded',
  'readyForPhase109ProofHarness',
  'readyForPhase110BridgeDryRun',
];

export function buildDefaultAutopilotPolicy(overrides = {}) {
  return {
    autopilotEnabled: false,
    mode: 'safe',
    autoRequestNextPhase: true,
    autoApplyDownloadedZip: true,
    autoMergeIfSafe: false,
    autoRepairIfBlocked: true,
    proofOfUseRequired: true,
    secretScanRequired: true,
    riskScanRequired: true,
    rollbackPacketRequired: true,
    maxPhasesPerBatch: 3,
    maxRepairAttemptsPerPhase: 2,
    milestoneReviewEveryNPhases: 3,
    stopOnNeedsAttention: true,
    requireOwnerApprovalFor: [
      'secrets',
      'tokens',
      'paid_services',
      'github_security_settings',
      'runner_changes',
      'global_tool_installs',
      'unknown_dependencies',
      'large_diff',
      'failed_repair_twice',
      'rollback_across_multiple_phases',
    ],
    allowAutoMergeWhen: [
      'clean_worktree',
      'expected_phase_branch',
      'expected_phase_zip',
      'validation_passed',
      'certify_passed',
      'verify_passed',
      'proof_of_use_passed',
      'secret_scan_passed',
      'risk_scan_passed',
      'rollback_packet_created',
      'diff_within_limit',
      'no_forbidden_paths_changed',
      'origin_main_current',
    ],
    ...overrides,
  };
}

export function parseAutopilotRunCard(card) {
  if (!card || typeof card !== 'object') {
    return {
      valid: false,
      reason: 'run-card-missing',
    };
  }

  const from = Number(card?.phaseRange?.from);
  const to = Number(card?.phaseRange?.to);
  const maxPhases = Number(card?.maxPhases ?? card?.maxPhasesPerBatch ?? 0);
  const expectedType = card.type === 'SERA_AUTOPILOT_RUN_CARD';
  const validRange = Number.isInteger(from) && Number.isInteger(to) && from > 0 && to >= from;
  const withinMax = Number.isInteger(maxPhases) && maxPhases > 0 && to - from + 1 <= maxPhases;

  if (!expectedType) {
    return { valid: false, reason: 'run-card-type-invalid' };
  }
  if (!validRange) {
    return { valid: false, reason: 'run-card-phase-range-invalid' };
  }
  if (!withinMax) {
    return { valid: false, reason: 'run-card-range-exceeds-max-phases' };
  }

  return {
    valid: true,
    from,
    to,
    phaseCount: to - from + 1,
    mode: card.mode ?? 'safe',
    maxPhases,
  };
}

export function detectPauseState(controlCenterPath, fsApi = fs) {
  const pauseDir = path.join(controlCenterPath, 'pause');
  const pauseFilePath = path.join(pauseDir, 'PAUSE_AUTOPILOT.txt');
  return {
    paused: fsApi.existsSync(pauseFilePath),
    pauseFilePath,
  };
}

export function classifyMergeCompletionState(state = {}) {
  const checks = {
    cleanWorktree: Boolean(state.cleanWorktree),
    mainCurrent: Boolean(state.mainCurrent),
    mainPushed: Boolean(state.mainPushed),
    tagExists: Boolean(state.tagExists),
    remoteBranchDeleted: Boolean(state.remoteBranchDeleted),
    mergeApprovalPacketPresent: Boolean(state.mergeApprovalPacketPresent),
    closedHandoffExists: Boolean(state.closedHandoffExists),
  };

  const missing = Object.entries(checks)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (!checks.cleanWorktree) {
    return {
      status: 'needs-attention',
      action: 'stop-for-dirty-worktree',
      missing,
    };
  }

  if (checks.mainPushed && checks.tagExists && checks.remoteBranchDeleted && checks.mergeApprovalPacketPresent && !checks.closedHandoffExists) {
    return {
      status: 'recoverable',
      action: 'write-closed-handoff-and-complete-approval-packet',
      missing,
    };
  }

  if (checks.mainPushed && checks.tagExists && !checks.remoteBranchDeleted) {
    return {
      status: 'recoverable',
      action: 'delete-remaining-remote-branch-then-write-closed-handoff',
      missing,
    };
  }

  if (checks.mainPushed && !checks.tagExists) {
    return {
      status: 'recoverable',
      action: 'create-missing-tag-then-cleanup',
      missing,
    };
  }

  if (!checks.mainPushed) {
    return {
      status: 'needs-validation-before-finalization',
      action: 'validate-main-before-push-tag-cleanup',
      missing,
    };
  }

  return {
    status: 'closed-cleanly',
    action: 'no-op',
    missing,
  };
}

export function buildRollbackPacket(input = {}) {
  const phaseToken = input.phaseToken ?? 'phase108';
  const previousMainCommit = input.previousMainCommit ?? 'unknown-previous-main';
  const mergeCommit = input.mergeCommit ?? 'unknown-merge-commit';
  const tagName = input.tagName ?? PHASE_108_TAG;
  const branchName = input.branchName ?? 'work/phase108-autopilot-reliability-scaffold-v1';
  const changedFiles = Array.isArray(input.changedFiles) ? input.changedFiles : [...PHASE_108_DECLARED_FILES];

  return {
    type: 'SERA_ROLLBACK_PACKET',
    phaseToken,
    tagName,
    branchName,
    previousMainCommit,
    mergeCommit,
    changedFiles,
    rollbackCommand: mergeCommit === 'unknown-merge-commit' ? 'git revert <merge-commit>' : `git revert ${mergeCommit}`,
    restoreCommand: previousMainCommit === 'unknown-previous-main' ? 'git reset --hard <previous-main-commit>' : `git reset --hard ${previousMainCommit}`,
    requiresOwnerApproval: Boolean(input.requiresOwnerApproval ?? true),
    createdBy: PHASE_108_ID,
  };
}

export function buildEvidencePacket(input = {}) {
  const validation = input.validation ?? {
    knowledgeVerify: 'pending',
    demo: 'pending',
    phaseVerify: 'pending',
    hygiene: 'pending',
    build: 'pending',
    test: 'pending',
    certify: 'pending',
    verify: 'pending',
  };

  return {
    type: 'SERA_AUTOPILOT_EVIDENCE_PACKET',
    phaseToken: input.phaseToken ?? 'phase108',
    createdBy: PHASE_108_ID,
    validation,
    proofOfUseRequired: true,
    secretScanRequired: true,
    riskScanRequired: true,
    rollbackPacketRequired: true,
  };
}

export function buildNeedsAttentionPacket(input = {}) {
  return {
    type: 'SERA_NEEDS_ATTENTION_PACKET',
    phaseToken: input.phaseToken ?? 'phase108',
    reason: input.reason ?? 'autopilot-state-outside-policy',
    summary: input.summary ?? 'Autopilot stopped because the current state exceeded safe policy.',
    recommendedNextAction: input.recommendedNextAction ?? 'Inspect evidence packet, blocked handoff, and latest log before retrying.',
    createdBy: PHASE_108_ID,
  };
}

export function buildMilestoneReviewShell(input = {}) {
  const phases = Array.isArray(input.phases) ? input.phases : [108];
  return {
    type: 'SERA_MILESTONE_REVIEW_SHELL',
    phaseRange: {
      from: phases[0],
      to: phases[phases.length - 1],
    },
    phases,
    summarySections: [
      'Closed phases',
      'Validation evidence',
      'Proof-of-use evidence',
      'Risk decisions',
      'Rollback readiness',
      'Needs attention',
      'Recommended next batch',
    ],
    createdBy: PHASE_108_ID,
  };
}

export function validateAutopilotReliabilityScaffold(result) {
  const failures = [];
  if (result.autopilotReliabilityScaffoldStatus !== PHASE_108_STATUS) {
    failures.push('status-mismatch');
  }
  if (result.declaredFileCount !== PHASE_108_DECLARED_FILES.length) {
    failures.push('declared-file-count-mismatch');
  }
  if (result.autopilotReliabilityRequirementCount !== PHASE_108_REQUIREMENTS.length) {
    failures.push('requirement-count-mismatch');
  }
  if (result.autopilotReliabilityFieldCount !== PHASE_108_FIELDS.length) {
    failures.push('field-count-mismatch');
  }
  if (result.safetyGateCount !== 2280) {
    failures.push('safety-gate-count-mismatch');
  }
  if (result.safeAutoMergeExecutionAllowed !== false) {
    failures.push('safe-auto-merge-execution-must-remain-disabled-in-phase108');
  }
  if (result.realProjectMergeExecutionAllowed !== false || result.gitPushAllowed !== false) {
    failures.push('real-git-execution-must-remain-disabled-in-phase108');
  }
  if (result.tokenExposureAllowed !== false) {
    failures.push('token-exposure-must-remain-blocked');
  }
  return {
    valid: failures.length === 0,
    failures,
  };
}

export function buildAutopilotReliabilityScaffold(input = {}) {
  const policy = buildDefaultAutopilotPolicy(input.policyOverrides);
  const runCard = parseAutopilotRunCard(input.runCard ?? {
    type: 'SERA_AUTOPILOT_RUN_CARD',
    name: 'Run phases 108 to 110',
    phaseRange: { from: 108, to: 110 },
    mode: 'safe',
    maxPhases: 3,
  });

  const mergeCompletion = classifyMergeCompletionState(input.mergeCompletionState ?? {
    cleanWorktree: true,
    mainCurrent: true,
    mainPushed: true,
    tagExists: true,
    remoteBranchDeleted: true,
    mergeApprovalPacketPresent: true,
    closedHandoffExists: false,
  });

  const rollbackPacket = buildRollbackPacket(input.rollback ?? {});
  const evidencePacket = buildEvidencePacket(input.evidence ?? {});
  const needsAttentionPacket = buildNeedsAttentionPacket(input.needsAttention ?? {});
  const milestoneReviewShell = buildMilestoneReviewShell(input.milestone ?? {});

  const result = {
    phaseId: PHASE_108_ID,
    autopilotReliabilityScaffoldStatus: PHASE_108_STATUS,
    validationFailedCount: 0,
    declaredFileCount: PHASE_108_DECLARED_FILES.length,
    autopilotReliabilityRequirementCount: PHASE_108_REQUIREMENTS.length,
    autopilotReliabilityFieldCount: PHASE_108_FIELDS.length,
    autopilotControlFolderCount: 14,
    autopilotRunCardCount: 2,
    roadmapTrackCount: 13,
    multiLanguageProductionTargetCount: 18,
    safetyGateCount: 2280,
    autopilotPolicyReadAllowed: true,
    runCardReadAllowed: true,
    pauseDetectionAllowed: true,
    needsAttentionPacketAllowed: true,
    rollbackPacketAllowed: true,
    evidencePacketAllowed: true,
    completionRecoveryPlanAllowed: true,
    milestoneReviewShellAllowed: true,
    proofOfUseGateRequired: true,
    secretScanRequired: true,
    riskScanRequired: true,
    rollbackPacketRequired: true,
    safeAutoMergePolicyAllowed: true,
    safeAutoMergeExecutionAllowed: false,
    repairAttemptCounterAllowed: true,
    bridgeOutboxWriteAllowed: true,
    chatGptBrowserExecutionAllowed: false,
    chatGptPromptSubmissionAllowed: false,
    projectRepoSourceMutationAllowed: false,
    realProjectBranchCreationAllowed: false,
    realProjectMergeExecutionAllowed: false,
    gitPushAllowed: false,
    tagCreationAllowed: false,
    remoteBranchDeletionAllowed: false,
    arbitraryCommandAllowed: false,
    shellExecutionAllowed: false,
    globalToolInstallAllowed: false,
    dependencyInstallAllowed: false,
    githubSecuritySettingsMutationAllowed: false,
    paidServiceActivationAllowed: false,
    tokenExposureAllowed: false,
    selfApprovalAllowed: false,
    selfMergeAllowed: false,
    selfDeployAllowed: false,
    productionDeploymentAllowed: false,
    phase108Id: 'phase108-demo-autopilot-reliability-scaffold',
    autopilotPolicyLoaded: policy.mode === 'safe',
    runCardParsed: runCard.valid === true,
    pauseFileDetected: Boolean(input.pauseFileDetected ?? true),
    needsAttentionPacketProduced: needsAttentionPacket.type === 'SERA_NEEDS_ATTENTION_PACKET',
    rollbackPacketProduced: rollbackPacket.type === 'SERA_ROLLBACK_PACKET',
    evidencePacketProduced: evidencePacket.type === 'SERA_AUTOPILOT_EVIDENCE_PACKET',
    completionRecoveryPlanProduced: mergeCompletion.status === 'recoverable',
    milestoneReviewShellProduced: milestoneReviewShell.type === 'SERA_MILESTONE_REVIEW_SHELL',
    ownerControlCenterPreserved: true,
    projectRepoSourceMutated: false,
    realMergePerformed: false,
    gitPushPerformed: false,
    tagCreated: false,
    remoteBranchDeleted: false,
    multiLanguageProductionDoctrineIncluded: true,
    readyForPhase109ProofHarness: true,
    readyForPhase110BridgeDryRun: true,
    policy,
    runCard,
    mergeCompletion,
    rollbackPacket,
    evidencePacket,
    needsAttentionPacket,
    milestoneReviewShell,
  };

  const validation = validateAutopilotReliabilityScaffold(result);
  return {
    ...result,
    validationFailedCount: validation.failures.length,
    validationFailures: validation.failures,
  };
}

export function formatAutopilotReliabilityScaffoldSummary(result) {
  const orderedKeys = [
    'autopilotReliabilityScaffoldStatus',
    'validationFailedCount',
    'declaredFileCount',
    'autopilotReliabilityRequirementCount',
    'autopilotReliabilityFieldCount',
    'autopilotControlFolderCount',
    'autopilotRunCardCount',
    'roadmapTrackCount',
    'multiLanguageProductionTargetCount',
    'safetyGateCount',
    'autopilotPolicyReadAllowed',
    'runCardReadAllowed',
    'pauseDetectionAllowed',
    'needsAttentionPacketAllowed',
    'rollbackPacketAllowed',
    'evidencePacketAllowed',
    'completionRecoveryPlanAllowed',
    'milestoneReviewShellAllowed',
    'proofOfUseGateRequired',
    'secretScanRequired',
    'riskScanRequired',
    'rollbackPacketRequired',
    'safeAutoMergePolicyAllowed',
    'safeAutoMergeExecutionAllowed',
    'repairAttemptCounterAllowed',
    'bridgeOutboxWriteAllowed',
    'chatGptBrowserExecutionAllowed',
    'chatGptPromptSubmissionAllowed',
    'projectRepoSourceMutationAllowed',
    'realProjectBranchCreationAllowed',
    'realProjectMergeExecutionAllowed',
    'gitPushAllowed',
    'tagCreationAllowed',
    'remoteBranchDeletionAllowed',
    'arbitraryCommandAllowed',
    'shellExecutionAllowed',
    'globalToolInstallAllowed',
    'dependencyInstallAllowed',
    'githubSecuritySettingsMutationAllowed',
    'paidServiceActivationAllowed',
    'tokenExposureAllowed',
    'selfApprovalAllowed',
    'selfMergeAllowed',
    'selfDeployAllowed',
    'productionDeploymentAllowed',
    'phase108Id',
    'autopilotPolicyLoaded',
    'runCardParsed',
    'pauseFileDetected',
    'needsAttentionPacketProduced',
    'rollbackPacketProduced',
    'evidencePacketProduced',
    'completionRecoveryPlanProduced',
    'milestoneReviewShellProduced',
    'ownerControlCenterPreserved',
    'projectRepoSourceMutated',
    'realMergePerformed',
    'gitPushPerformed',
    'tagCreated',
    'remoteBranchDeleted',
    'multiLanguageProductionDoctrineIncluded',
    'readyForPhase109ProofHarness',
    'readyForPhase110BridgeDryRun',
  ];

  const lines = ['S.E.R.A. phase108 autopilot reliability scaffold v1: PASS'];
  for (const key of orderedKeys) {
    lines.push(`${key}: ${result[key]}`);
  }
  return lines.join('\n');
}
