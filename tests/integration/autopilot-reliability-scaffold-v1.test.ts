import { describe, expect, it } from 'vitest';
import {
  buildAutopilotReliabilityScaffold,
  buildNeedsAttentionPacket,
  classifyMergeCompletionState,
  detectPauseState,
  parseAutopilotRunCard,
  validateAutopilotReliabilityScaffold,
} from '../../scripts/lib/autopilot-reliability-scaffold-v1.mjs';

describe('Phase 108 — Autopilot Reliability Scaffold v1', () => {
  it('produces owner-controlled autopilot reliability scaffold packets without executing merge, Git, browser, token, or paid-service actions', () => {
    const result = buildAutopilotReliabilityScaffold();

    expect(result.autopilotReliabilityScaffoldStatus).toBe('autopilot-reliability-scaffold-ready');
    expect(result.validationFailedCount).toBe(0);
    expect(result.declaredFileCount).toBe(5);
    expect(result.autopilotReliabilityRequirementCount).toBe(40);
    expect(result.autopilotReliabilityFieldCount).toBe(64);
    expect(result.autopilotControlFolderCount).toBe(14);
    expect(result.autopilotRunCardCount).toBe(2);
    expect(result.roadmapTrackCount).toBe(13);
    expect(result.multiLanguageProductionTargetCount).toBe(18);
    expect(result.safetyGateCount).toBe(2280);
    expect(result.autopilotPolicyReadAllowed).toBe(true);
    expect(result.runCardReadAllowed).toBe(true);
    expect(result.pauseDetectionAllowed).toBe(true);
    expect(result.needsAttentionPacketAllowed).toBe(true);
    expect(result.rollbackPacketAllowed).toBe(true);
    expect(result.evidencePacketAllowed).toBe(true);
    expect(result.completionRecoveryPlanAllowed).toBe(true);
    expect(result.milestoneReviewShellAllowed).toBe(true);
    expect(result.proofOfUseGateRequired).toBe(true);
    expect(result.secretScanRequired).toBe(true);
    expect(result.riskScanRequired).toBe(true);
    expect(result.rollbackPacketRequired).toBe(true);
    expect(result.safeAutoMergePolicyAllowed).toBe(true);
    expect(result.safeAutoMergeExecutionAllowed).toBe(false);
    expect(result.repairAttemptCounterAllowed).toBe(true);
    expect(result.bridgeOutboxWriteAllowed).toBe(true);
    expect(result.chatGptBrowserExecutionAllowed).toBe(false);
    expect(result.chatGptPromptSubmissionAllowed).toBe(false);
    expect(result.projectRepoSourceMutationAllowed).toBe(false);
    expect(result.realProjectBranchCreationAllowed).toBe(false);
    expect(result.realProjectMergeExecutionAllowed).toBe(false);
    expect(result.gitPushAllowed).toBe(false);
    expect(result.tagCreationAllowed).toBe(false);
    expect(result.remoteBranchDeletionAllowed).toBe(false);
    expect(result.arbitraryCommandAllowed).toBe(false);
    expect(result.shellExecutionAllowed).toBe(false);
    expect(result.globalToolInstallAllowed).toBe(false);
    expect(result.dependencyInstallAllowed).toBe(false);
    expect(result.githubSecuritySettingsMutationAllowed).toBe(false);
    expect(result.paidServiceActivationAllowed).toBe(false);
    expect(result.tokenExposureAllowed).toBe(false);
    expect(result.selfApprovalAllowed).toBe(false);
    expect(result.selfMergeAllowed).toBe(false);
    expect(result.selfDeployAllowed).toBe(false);
    expect(result.productionDeploymentAllowed).toBe(false);
    expect(result.phase108Id).toBe('phase108-demo-autopilot-reliability-scaffold');
    expect(result.autopilotPolicyLoaded).toBe(true);
    expect(result.runCardParsed).toBe(true);
    expect(result.pauseFileDetected).toBe(true);
    expect(result.needsAttentionPacketProduced).toBe(true);
    expect(result.rollbackPacketProduced).toBe(true);
    expect(result.evidencePacketProduced).toBe(true);
    expect(result.completionRecoveryPlanProduced).toBe(true);
    expect(result.milestoneReviewShellProduced).toBe(true);
    expect(result.ownerControlCenterPreserved).toBe(true);
    expect(result.projectRepoSourceMutated).toBe(false);
    expect(result.realMergePerformed).toBe(false);
    expect(result.gitPushPerformed).toBe(false);
    expect(result.tagCreated).toBe(false);
    expect(result.remoteBranchDeleted).toBe(false);
    expect(result.multiLanguageProductionDoctrineIncluded).toBe(true);
    expect(result.readyForPhase109ProofHarness).toBe(true);
    expect(result.readyForPhase110BridgeDryRun).toBe(true);
  });

  it('parses owner run cards and detects phone-controlled pause state without starting new work', () => {
    const parsed = parseAutopilotRunCard({
      type: 'SERA_AUTOPILOT_RUN_CARD',
      name: 'Run phases 108 to 110',
      phaseRange: { from: 108, to: 110 },
      mode: 'safe',
      maxPhases: 3,
    });

    expect(parsed.valid).toBe(true);
    expect(parsed.phaseCount).toBe(3);
    expect(parsed.mode).toBe('safe');

    const pauseState = detectPauseState('C:/SERA-AutoOps/00_control_center', {
      existsSync: (target: string) => target.endsWith('PAUSE_AUTOPILOT.txt'),
    });

    expect(pauseState.paused).toBe(true);
    expect(pauseState.pauseFilePath).toContain('PAUSE_AUTOPILOT.txt');
  });

  it('classifies recoverable merge-finalization states so partial closes can finish idempotently', () => {
    const state = classifyMergeCompletionState({
      cleanWorktree: true,
      mainCurrent: true,
      mainPushed: true,
      tagExists: true,
      remoteBranchDeleted: true,
      mergeApprovalPacketPresent: true,
      closedHandoffExists: false,
    });

    expect(state.status).toBe('recoverable');
    expect(state.action).toBe('write-closed-handoff-and-complete-approval-packet');
    expect(state.missing).toContain('closedHandoffExists');
  });

  it('fails closed for unsafe autopilot, Git, browser, token, credential, paid-service, and self-governance powers', () => {
    const result = buildAutopilotReliabilityScaffold();

    expect(result.safeAutoMergeExecutionAllowed).toBe(false);
    expect(result.chatGptBrowserExecutionAllowed).toBe(false);
    expect(result.chatGptPromptSubmissionAllowed).toBe(false);
    expect(result.realProjectMergeExecutionAllowed).toBe(false);
    expect(result.gitPushAllowed).toBe(false);
    expect(result.tagCreationAllowed).toBe(false);
    expect(result.remoteBranchDeletionAllowed).toBe(false);
    expect(result.globalToolInstallAllowed).toBe(false);
    expect(result.dependencyInstallAllowed).toBe(false);
    expect(result.githubSecuritySettingsMutationAllowed).toBe(false);
    expect(result.paidServiceActivationAllowed).toBe(false);
    expect(result.tokenExposureAllowed).toBe(false);
    expect(result.selfApprovalAllowed).toBe(false);
    expect(result.selfMergeAllowed).toBe(false);
    expect(result.selfDeployAllowed).toBe(false);
  });

  it('records validation failure evidence when scaffold counts or safety gates do not match expectations', () => {
    const result = buildAutopilotReliabilityScaffold();
    const validation = validateAutopilotReliabilityScaffold({
      ...result,
      safetyGateCount: 999,
      declaredFileCount: 4,
    });
    const needsAttention = buildNeedsAttentionPacket({
      phaseToken: 'phase108',
      reason: 'autopilot-reliability-count-mismatch',
      summary: 'Phase 108 scaffold counts did not match expected safety evidence.',
    });

    expect(validation.valid).toBe(false);
    expect(validation.failures).toContain('declared-file-count-mismatch');
    expect(validation.failures).toContain('safety-gate-count-mismatch');
    expect(needsAttention.type).toBe('SERA_NEEDS_ATTENTION_PACKET');
    expect(needsAttention.reason).toBe('autopilot-reliability-count-mismatch');
  });
});
