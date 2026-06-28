import { describe, expect, it } from 'vitest';
import {
  buildProofFixtures,
  buildProofOfUseSimulationHarness,
  simulateProofOfUseScenario,
  validateProofOfUseSimulationHarness,
  writeProofFixtureSet,
} from '../../scripts/lib/proof-of-use-simulation-harness-v1.mjs';

describe('Phase 109 — Proof-of-Use Simulation Harness v1', () => {
  it('produces proof-of-use fixtures and scenarios without executing browser, Git, token, credential, or paid-service actions', () => {
    const result = buildProofOfUseSimulationHarness();

    expect(result.proofOfUseSimulationHarnessStatus).toBe('proof-of-use-simulation-harness-ready');
    expect(result.validationFailedCount).toBe(0);
    expect(result.declaredFileCount).toBe(5);
    expect(result.proofFixtureCount).toBe(8);
    expect(result.proofScenarioCount).toBe(8);
    expect(result.roadmapTrackCount).toBe(13);
    expect(result.multiLanguageProductionTargetCount).toBe(18);
    expect(result.safetyGateCount).toBe(2340);
    expect(result.proofHarnessRequired).toBe(true);
    expect(result.sampleDataRequired).toBe(true);
    expect(result.closedCleanlyFixtureProduced).toBe(true);
    expect(result.blockedFixtureProduced).toBe(true);
    expect(result.passFixtureProduced).toBe(true);
    expect(result.mergePendingFixtureProduced).toBe(true);
    expect(result.runCardFixtureProduced).toBe(true);
    expect(result.rollbackFixtureProduced).toBe(true);
    expect(result.evidenceFixtureProduced).toBe(true);
    expect(result.bridgeOutboxFixtureProduced).toBe(true);
    expect(result.nextPhaseRequestScenarioPassed).toBe(true);
    expect(result.repairRequestScenarioPassed).toBe(true);
    expect(result.safeMergeScenarioPassed).toBe(true);
    expect(result.rollbackScenarioPassed).toBe(true);
    expect(result.needsAttentionScenarioPassed).toBe(true);
    expect(result.phoneStartScenarioPassed).toBe(true);
    expect(result.phonePauseScenarioPassed).toBe(true);
    expect(result.phase108ScaffoldIntegrated).toBe(true);
    expect(result.proofOfUseCommandAllowed).toBe(true);
    expect(result.proofOfUseCommandRequiredBeforeAutoMerge).toBe(true);
    expect(result.secretScanStillRequired).toBe(true);
    expect(result.riskScanStillRequired).toBe(true);
    expect(result.rollbackPacketStillRequired).toBe(true);
    expect(result.autopilotPolicyMutationAllowed).toBe(false);
    expect(result.chatGptBrowserExecutionAllowed).toBe(false);
    expect(result.chatGptPromptSubmissionAllowed).toBe(false);
    expect(result.realProjectMergeExecutionAllowed).toBe(false);
    expect(result.gitPushAllowed).toBe(false);
    expect(result.tagCreationAllowed).toBe(false);
    expect(result.remoteBranchDeletionAllowed).toBe(false);
    expect(result.dependencyInstallAllowed).toBe(false);
    expect(result.globalToolInstallAllowed).toBe(false);
    expect(result.githubSecuritySettingsMutationAllowed).toBe(false);
    expect(result.paidServiceActivationAllowed).toBe(false);
    expect(result.tokenExposureAllowed).toBe(false);
    expect(result.selfApprovalAllowed).toBe(false);
    expect(result.selfMergeAllowed).toBe(false);
    expect(result.selfDeployAllowed).toBe(false);
    expect(result.productionDeploymentAllowed).toBe(false);
    expect(result.readyForPhase110BridgeDryRun).toBe(true);
    expect(result.readyForPhase111DomInspector).toBe(true);
  });

  it('simulates closed-cleanly and blocked workflows with sample handoff data', () => {
    const fixtures = buildProofFixtures();
    const nextPhase = simulateProofOfUseScenario('closed-cleanly-creates-next-phase-request', fixtures);
    const repair = simulateProofOfUseScenario('blocked-creates-repair-request', fixtures);

    expect(nextPhase.passed).toBe(true);
    expect(nextPhase.produced.intent).toBe('REQUEST_NEXT_PHASE_OVERLAY');
    expect(nextPhase.produced.prompt).toContain('Phase 110');
    expect(repair.passed).toBe(true);
    expect(repair.produced.intent).toBe('REQUEST_REPAIR_OVERLAY');
    expect(repair.produced.prompt).toContain('npm test');
  });

  it('simulates safe merge, rollback, phone start, and phone pause paths before auto-merge is allowed', () => {
    const fixtures = buildProofFixtures();
    const safeMerge = simulateProofOfUseScenario('pass-waits-for-merge-or-safe-auto-merge-policy', fixtures, {
      policyOverrides: { autoMergeIfSafe: true },
    });
    const rollback = simulateProofOfUseScenario('rollback-scenario-proves-recovery-command-lineage', fixtures);
    const phoneStart = simulateProofOfUseScenario('run-card-batch-proves-phone-control-start', fixtures);
    const phonePause = simulateProofOfUseScenario('pause-file-proves-phone-control-stop', fixtures);

    expect(safeMerge.passed).toBe(true);
    expect(safeMerge.produced.decision).toBe('evaluate-safe-auto-merge-gates');
    expect(rollback.passed).toBe(true);
    expect(rollback.produced.rollbackCommand).toContain('sample-merge-commit');
    expect(phoneStart.passed).toBe(true);
    expect(phoneStart.produced.phaseCount).toBe(2);
    expect(phonePause.passed).toBe(true);
    expect(phonePause.produced.pauseFilePath).toContain('PAUSE_AUTOPILOT.txt');
  });

  it('writes reusable proof fixture sets for later autopilot dry-run checks', () => {
    const writes: Record<string, string> = {};
    const fsApi = {
      mkdirSync: (_target: string) => undefined,
      writeFileSync: (target: string, value: string) => {
        writes[target] = value;
      },
    };

    const outputPath = writeProofFixtureSet('C:/SERA-AutoOps/18_simulation_fixtures/phase109', buildProofFixtures(), fsApi as any);

    expect(outputPath).toContain('phase109-proof-fixtures.json');
    expect(Object.keys(writes)).toHaveLength(1);
    expect(Object.values(writes)[0]).toContain('SERA_AUTOPILOT_RUN_CARD');
    expect(Object.values(writes)[0]).toContain('SERA_BRIDGE_OUTBOX_PROMPT');
  });

  it('records validation failure evidence when proof counts, safety gates, or scenarios do not match expectations', () => {
    const result = buildProofOfUseSimulationHarness();
    const validation = validateProofOfUseSimulationHarness({
      ...result,
      safetyGateCount: 999,
      declaredFileCount: 4,
      failedScenarios: ['closed-cleanly-creates-next-phase-request'],
    });

    expect(validation.valid).toBe(false);
    expect(validation.failures).toContain('declared-file-count-mismatch');
    expect(validation.failures).toContain('safety-gate-count-mismatch');
    expect(validation.failures).toContain('proof-scenario-failure');
  });
});
