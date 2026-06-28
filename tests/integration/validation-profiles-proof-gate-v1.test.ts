import { describe, expect, it } from 'vitest';
import {
  buildValidationProfilePlan,
  buildValidationProfilesProofGate,
  evaluatePendingMergeAutoApproval,
  runValidationProfile,
  shouldDemoteProofScenario,
  validateValidationProfilesProofGate,
  writeValidationProfileEvidence,
} from '../../scripts/lib/validation-profiles-proof-gate-v1.mjs';

describe('Phase 110 — Validation Profiles + Proof Gate v1', () => {
  it('produces validation profiles, proof demotion rules, and pending-to-approved decision logic without real file moves', () => {
    const result = buildValidationProfilesProofGate();

    expect(result.validationProfilesProofGateStatus).toBe('validation-profiles-proof-gate-ready');
    expect(result.validationFailedCount).toBe(0);
    expect(result.declaredFileCount).toBe(5);
    expect(result.validationProfileCount).toBe(3);
    expect(result.validationProfileCommandCount).toBe(22);
    expect(result.proofDemotionRuleCount).toBe(3);
    expect(result.autoApprovalGateCount).toBe(9);
    expect(result.roadmapTrackCount).toBe(13);
    expect(result.multiLanguageProductionTargetCount).toBe(18);
    expect(result.safetyGateCount).toBe(2400);
    expect(result.quickProfileAllowed).toBe(true);
    expect(result.gateProfileAllowed).toBe(true);
    expect(result.milestoneProfileAllowed).toBe(true);
    expect(result.singleMergeGateCommandAllowed).toBe(true);
    expect(result.oldStackedValidationBlockedForFutureRunner).toBe(true);
    expect(result.fullTestSuiteRunOnceInGate).toBe(true);
    expect(result.certifyArtifactsWithoutDuplicateTestsAllowed).toBe(true);
    expect(result.proofOfUseRequired).toBe(true);
    expect(result.targetedProofAllowed).toBe(true);
    expect(result.proofPassRegistryAllowed).toBe(true);
    expect(result.proofDemotionAllowedAfterThreeCleanPasses).toBe(true);
    expect(result.proofDemotionBlockedWhenFilesChanged).toBe(true);
    expect(result.proofDemotionBlockedDuringMilestone).toBe(true);
    expect(result.safePendingToApprovedDecisionAllowed).toBe(true);
    expect(result.realPendingToApprovedMoveAllowed).toBe(false);
    expect(result.requiresPassHandoffForAutoApproval).toBe(true);
    expect(result.requiresGatePassForAutoApproval).toBe(true);
    expect(result.requiresProofPassForAutoApproval).toBe(true);
    expect(result.requiresPolicyAutoMergeForAutoApproval).toBe(true);
    expect(result.requiresNoNeedsAttentionForAutoApproval).toBe(true);
    expect(result.requiresNoNewerBlockedPacketForAutoApproval).toBe(true);
    expect(result.chatGptBrowserExecutionAllowed).toBe(false);
    expect(result.tokenExposureAllowed).toBe(false);
    expect(result.paidServiceActivationAllowed).toBe(false);
    expect(result.selfApprovalOutsidePolicyAllowed).toBe(false);
    expect(result.quickProfileProduced).toBe(true);
    expect(result.gateProfileProduced).toBe(true);
    expect(result.milestoneProfileProduced).toBe(true);
    expect(result.proofRegistryDecisionProduced).toBe(true);
    expect(result.safeAutoApprovalDecisionProduced).toBe(true);
    expect(result.validationProfileSummaryProduced).toBe(true);
    expect(result.autoOpsRunnerPatchReadyAfterClose).toBe(true);
    expect(result.readyForPhase111BridgeDryRun).toBe(true);
    expect(result.readyForPhase112DomInspector).toBe(true);
  });

  it('builds a non-duplicative merge gate that runs tests once and avoids old stacked validation commands', () => {
    const quick = buildValidationProfilePlan('quick');
    const gate = buildValidationProfilePlan('gate');
    const milestone = buildValidationProfilePlan('milestone');

    expect(quick.valid).toBe(true);
    expect(quick.commands).toContain('npm run sera:proof');
    expect(gate.valid).toBe(true);
    expect(gate.commands).toContain('npm test');
    expect(gate.commands).toContain('npm run certify:artifacts');
    expect(gate.commands).not.toContain('npm run certify');
    expect(gate.commands).not.toContain('npm run verify');
    expect(gate.fullTestSuiteCount).toBe(1);
    expect(gate.oldStackedValidationCommandCount).toBe(0);
    expect(gate.duplicatesFullTestSuite).toBe(false);
    expect(milestone.valid).toBe(true);
    expect(milestone.commands).toContain('npm run phase108:verify');
    expect(milestone.commands).toContain('npm run phase109:verify');
    expect(milestone.commands).toContain('npm run phase110:verify');
  });

  it('keeps proof-of-use active unless a proof has three clean gate passes and no related file changes', () => {
    const stable = shouldDemoteProofScenario({ proofName: 'stable-proof', successfulGatePasses: 3, relatedFilesChanged: false, milestoneRun: false });
    const tooEarly = shouldDemoteProofScenario({ proofName: 'new-proof', successfulGatePasses: 2, relatedFilesChanged: false, milestoneRun: false });
    const changed = shouldDemoteProofScenario({ proofName: 'changed-proof', successfulGatePasses: 5, relatedFilesChanged: true, milestoneRun: false });
    const milestone = shouldDemoteProofScenario({ proofName: 'milestone-proof', successfulGatePasses: 5, relatedFilesChanged: false, milestoneRun: true });

    expect(stable.demote).toBe(true);
    expect(stable.reason).toBe('stable-proof-can-move-to-milestone-validation');
    expect(tooEarly.demote).toBe(false);
    expect(changed.demote).toBe(false);
    expect(milestone.demote).toBe(false);
  });

  it('only allows pending-to-approved auto flow when pass, gate, proof, rollback, policy, branch, and safety gates all pass', () => {
    const allowed = evaluatePendingMergeAutoApproval({
      policy: { autopilotEnabled: true, autoMergeIfSafe: true },
      mergePendingFound: true,
      passHandoffFound: true,
      gatePassed: true,
      proofPassed: true,
      rollbackPacketCreated: true,
      branchPushed: true,
      needsAttentionPresent: false,
      blockedNewerThanPass: false,
    });

    const blocked = evaluatePendingMergeAutoApproval({
      policy: { autopilotEnabled: true, autoMergeIfSafe: true },
      mergePendingFound: true,
      passHandoffFound: true,
      gatePassed: true,
      proofPassed: false,
      rollbackPacketCreated: true,
      branchPushed: true,
      needsAttentionPresent: false,
      blockedNewerThanPass: false,
    });

    expect(allowed.safeToMovePendingToApproved).toBe(true);
    expect(allowed.decision).toBe('move-pending-to-approved');
    expect(allowed.sourceFolder).toBe('09_merge_pending');
    expect(allowed.targetFolder).toBe('03_merge_approved');
    expect(allowed.realFileMovePerformed).toBe(false);
    expect(blocked.safeToMovePendingToApproved).toBe(false);
    expect(blocked.failedGates).toContain('proof-passed');
  });

  it('supports dry-run validation profile evidence without executing external commands', () => {
    const dryRun = runValidationProfile('gate', { dryRun: true });
    const writes: Record<string, string> = {};
    const fsApi = {
      mkdirSync: (_target: string) => undefined,
      writeFileSync: (target: string, value: string) => {
        writes[target] = value;
      },
    };

    const outputPath = writeValidationProfileEvidence('C:/SERA-AutoOps/20_evidence_packets/phase110', dryRun, fsApi as any);

    expect(dryRun.valid).toBe(true);
    expect(dryRun.executedCommands).toContain('npm run sera:proof');
    expect(dryRun.executedCommands).toContain('npm test');
    expect(outputPath).toContain('phase110-validation-profile-evidence.json');
    expect(Object.values(writes)[0]).toContain('npm run sera:proof');
  });

  it('records validation failure evidence when profile counts, safety gates, or old validation stacking regress', () => {
    const result = buildValidationProfilesProofGate({
      validationProfileCommandCount: 999,
      safetyGateCount: 0,
      fullTestSuiteRunOnceInGate: false,
    });

    const validation = validateValidationProfilesProofGate(result);

    expect(validation.valid).toBe(false);
    expect(validation.failures).toContain('profile-command-count-mismatch');
    expect(validation.failures).toContain('safety-gate-count-mismatch');
    expect(validation.failures).toContain('fullTestSuiteRunOnceInGate-not-true');
  });
});
