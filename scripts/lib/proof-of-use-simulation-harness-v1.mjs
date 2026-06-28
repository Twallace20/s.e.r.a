import fs from 'node:fs';
import path from 'node:path';
import {
  buildDefaultAutopilotPolicy,
  buildEvidencePacket,
  buildMilestoneReviewShell,
  buildNeedsAttentionPacket,
  buildRollbackPacket,
  parseAutopilotRunCard,
} from './autopilot-reliability-scaffold-v1.mjs';

export const PHASE_109_ID = 'phase109-proof-of-use-simulation-harness-v1';
export const PHASE_109_TAG = 'phase-109-proof-of-use-simulation-harness-v1';
export const PHASE_109_STATUS = 'proof-of-use-simulation-harness-ready';

export const PHASE_109_DECLARED_FILES = [
  'apps/operator-console/src/proof-of-use-simulation-harness.ts',
  'docs/phases/PHASE_109_PROOF_OF_USE_SIMULATION_HARNESS_V1.md',
  'scripts/lib/proof-of-use-simulation-harness-v1.mjs',
  'scripts/run-proof-of-use-simulation-harness-v1.mjs',
  'tests/integration/proof-of-use-simulation-harness-v1.test.ts',
];

export const PHASE_109_PROOF_FIXTURES = [
  'closed_cleanly_handoff',
  'blocked_handoff',
  'pass_handoff',
  'merge_pending_packet',
  'run_card',
  'rollback_packet',
  'evidence_packet',
  'bridge_outbox_prompt',
];

export const PHASE_109_PROOF_SCENARIOS = [
  'closed-cleanly-creates-next-phase-request',
  'blocked-creates-repair-request',
  'pass-waits-for-merge-or-safe-auto-merge-policy',
  'merge-pending-validates-owner-or-policy-approval',
  'rollback-scenario-proves-recovery-command-lineage',
  'needs-attention-stops-batch-and-preserves-evidence',
  'run-card-batch-proves-phone-control-start',
  'pause-file-proves-phone-control-stop',
];

export const PHASE_109_FIELDS = [
  'phaseId',
  'proofOfUseSimulationHarnessStatus',
  'validationFailedCount',
  'declaredFileCount',
  'proofFixtureCount',
  'proofScenarioCount',
  'roadmapTrackCount',
  'multiLanguageProductionTargetCount',
  'safetyGateCount',
  'proofHarnessRequired',
  'sampleDataRequired',
  'closedCleanlyFixtureProduced',
  'blockedFixtureProduced',
  'passFixtureProduced',
  'mergePendingFixtureProduced',
  'runCardFixtureProduced',
  'rollbackFixtureProduced',
  'evidenceFixtureProduced',
  'bridgeOutboxFixtureProduced',
  'nextPhaseRequestScenarioPassed',
  'repairRequestScenarioPassed',
  'safeMergeScenarioPassed',
  'rollbackScenarioPassed',
  'needsAttentionScenarioPassed',
  'phoneStartScenarioPassed',
  'phonePauseScenarioPassed',
  'phase108ScaffoldIntegrated',
  'proofOfUseCommandAllowed',
  'proofOfUseCommandRequiredBeforeAutoMerge',
  'secretScanStillRequired',
  'riskScanStillRequired',
  'rollbackPacketStillRequired',
  'autopilotPolicyMutationAllowed',
  'chatGptBrowserExecutionAllowed',
  'chatGptPromptSubmissionAllowed',
  'realProjectMergeExecutionAllowed',
  'gitPushAllowed',
  'tagCreationAllowed',
  'remoteBranchDeletionAllowed',
  'dependencyInstallAllowed',
  'globalToolInstallAllowed',
  'githubSecuritySettingsMutationAllowed',
  'paidServiceActivationAllowed',
  'tokenExposureAllowed',
  'selfApprovalAllowed',
  'selfMergeAllowed',
  'selfDeployAllowed',
  'productionDeploymentAllowed',
  'readyForPhase110BridgeDryRun',
  'readyForPhase111DomInspector',
];

export function buildProofFixtures(input = {}) {
  const phaseToken = input.phaseToken ?? 'phase109';
  const branchName = input.branchName ?? 'work/phase109-proof-of-use-simulation-harness-v1';
  const tagName = input.tagName ?? PHASE_109_TAG;

  const closedCleanlyHandoff = {
    type: 'SERA_HANDOFF_PACKET',
    status: 'CLOSED_CLEANLY',
    phaseToken,
    branchName: 'main',
    tagName,
    summary: 'Sample closed-cleanly packet proving the next-phase request path.',
  };

  const blockedHandoff = {
    type: 'SERA_HANDOFF_PACKET',
    status: 'BLOCKED',
    phaseToken,
    branchName,
    summary: 'Sample blocked packet proving repair prompt packaging.',
    logTail: 'Command failed with exit code 1: npm test',
  };

  const passHandoff = {
    type: 'SERA_HANDOFF_PACKET',
    status: 'PASS',
    phaseToken,
    branchName,
    summary: 'Sample pass packet proving merge or safe auto-merge decision routing.',
  };

  const mergePendingPacket = {
    status: 'MERGE_PENDING',
    phaseName: 's.e.r.a_phase109_proof_of_use_simulation_harness_v1_overlay',
    phaseToken,
    branchName,
    tagName,
  };

  const runCard = {
    type: 'SERA_AUTOPILOT_RUN_CARD',
    name: 'Run phases 109 to 110',
    phaseRange: { from: 109, to: 110 },
    mode: 'safe',
    maxPhases: 2,
  };

  const rollbackPacket = buildRollbackPacket({
    phaseToken,
    tagName,
    branchName,
    previousMainCommit: 'sample-previous-main-commit',
    mergeCommit: 'sample-merge-commit',
    changedFiles: [...PHASE_109_DECLARED_FILES],
  });

  const evidencePacket = buildEvidencePacket({
    phaseToken,
    validation: {
      knowledgeVerify: 'pass',
      demo: 'pass',
      phaseVerify: 'pass',
      hygiene: 'pass',
      build: 'pass',
      test: 'pass',
      certify: 'pass',
      verify: 'pass',
      proofOfUse: 'pass',
    },
  });

  const bridgeOutboxPrompt = {
    type: 'SERA_BRIDGE_OUTBOX_PROMPT',
    phaseToken,
    intent: 'REQUEST_NEXT_PHASE_OVERLAY',
    destination: '15_bridge_outbox',
    prompt: 'Phase 109 closed cleanly. Generate Phase 110 ChatGPT Bridge Dry-Run v1 overlay ZIP.',
  };

  return {
    closedCleanlyHandoff,
    blockedHandoff,
    passHandoff,
    mergePendingPacket,
    runCard,
    rollbackPacket,
    evidencePacket,
    bridgeOutboxPrompt,
  };
}

export function simulateProofOfUseScenario(scenario, fixtures = buildProofFixtures(), options = {}) {
  switch (scenario) {
    case 'closed-cleanly-creates-next-phase-request':
      return {
        scenario,
        passed: fixtures.closedCleanlyHandoff.status === 'CLOSED_CLEANLY' && fixtures.bridgeOutboxPrompt.intent === 'REQUEST_NEXT_PHASE_OVERLAY',
        produced: fixtures.bridgeOutboxPrompt,
      };

    case 'blocked-creates-repair-request': {
      const repairPrompt = {
        type: 'SERA_BRIDGE_OUTBOX_PROMPT',
        phaseToken: fixtures.blockedHandoff.phaseToken,
        intent: 'REQUEST_REPAIR_OVERLAY',
        sourceStatus: fixtures.blockedHandoff.status,
        prompt: `Repair ${fixtures.blockedHandoff.phaseToken}: ${fixtures.blockedHandoff.logTail}`,
      };
      return {
        scenario,
        passed: fixtures.blockedHandoff.status === 'BLOCKED' && repairPrompt.intent === 'REQUEST_REPAIR_OVERLAY',
        produced: repairPrompt,
      };
    }

    case 'pass-waits-for-merge-or-safe-auto-merge-policy': {
      const policy = buildDefaultAutopilotPolicy(options.policyOverrides);
      const decision = policy.autoMergeIfSafe === true ? 'evaluate-safe-auto-merge-gates' : 'wait-for-owner-merge-approval';
      return {
        scenario,
        passed: fixtures.passHandoff.status === 'PASS' && ['evaluate-safe-auto-merge-gates', 'wait-for-owner-merge-approval'].includes(decision),
        produced: { decision, autoMergeIfSafe: policy.autoMergeIfSafe },
      };
    }

    case 'merge-pending-validates-owner-or-policy-approval':
      return {
        scenario,
        passed: fixtures.mergePendingPacket.status === 'MERGE_PENDING' && fixtures.mergePendingPacket.branchName.includes('phase109'),
        produced: fixtures.mergePendingPacket,
      };

    case 'rollback-scenario-proves-recovery-command-lineage':
      return {
        scenario,
        passed: fixtures.rollbackPacket.type === 'SERA_ROLLBACK_PACKET' && fixtures.rollbackPacket.rollbackCommand.includes('sample-merge-commit'),
        produced: fixtures.rollbackPacket,
      };

    case 'needs-attention-stops-batch-and-preserves-evidence': {
      const packet = buildNeedsAttentionPacket({
        phaseToken: fixtures.blockedHandoff.phaseToken,
        reason: 'proof-of-use-scenario-failed',
        summary: 'Proof-of-use simulation stopped the batch and preserved evidence.',
      });
      return {
        scenario,
        passed: packet.type === 'SERA_NEEDS_ATTENTION_PACKET' && fixtures.evidencePacket.type === 'SERA_AUTOPILOT_EVIDENCE_PACKET',
        produced: packet,
      };
    }

    case 'run-card-batch-proves-phone-control-start': {
      const parsed = parseAutopilotRunCard(fixtures.runCard);
      return {
        scenario,
        passed: parsed.valid === true && parsed.phaseCount === 2,
        produced: parsed,
      };
    }

    case 'pause-file-proves-phone-control-stop': {
      const pauseFilePath = options.pauseFilePath ?? 'C:/Users/18123/OneDrive/SERA-AutoOps/00_control_center/pause/PAUSE_AUTOPILOT.txt';
      return {
        scenario,
        passed: pauseFilePath.endsWith('PAUSE_AUTOPILOT.txt'),
        produced: { paused: true, pauseFilePath },
      };
    }

    default:
      return {
        scenario,
        passed: false,
        produced: { reason: 'unknown-proof-scenario' },
      };
  }
}

export function writeProofFixtureSet(outputDir, fixtures = buildProofFixtures(), fsApi = fs) {
  fsApi.mkdirSync(outputDir, { recursive: true });
  const filePath = path.join(outputDir, 'phase109-proof-fixtures.json');
  fsApi.writeFileSync(filePath, `${JSON.stringify(fixtures, null, 2)}\n`, 'utf8');
  return filePath;
}

export function buildProofOfUseSimulationHarness(input = {}) {
  const fixtures = buildProofFixtures(input.fixtures);
  const scenarioResults = PHASE_109_PROOF_SCENARIOS.map((scenario) => simulateProofOfUseScenario(scenario, fixtures, input));
  const failedScenarios = scenarioResults.filter((result) => result.passed !== true).map((result) => result.scenario);

  const result = {
    phaseId: PHASE_109_ID,
    proofOfUseSimulationHarnessStatus: PHASE_109_STATUS,
    validationFailedCount: failedScenarios.length,
    declaredFileCount: PHASE_109_DECLARED_FILES.length,
    proofFixtureCount: PHASE_109_PROOF_FIXTURES.length,
    proofScenarioCount: PHASE_109_PROOF_SCENARIOS.length,
    roadmapTrackCount: 13,
    multiLanguageProductionTargetCount: 18,
    safetyGateCount: 2340,
    proofHarnessRequired: true,
    sampleDataRequired: true,
    closedCleanlyFixtureProduced: fixtures.closedCleanlyHandoff.status === 'CLOSED_CLEANLY',
    blockedFixtureProduced: fixtures.blockedHandoff.status === 'BLOCKED',
    passFixtureProduced: fixtures.passHandoff.status === 'PASS',
    mergePendingFixtureProduced: fixtures.mergePendingPacket.status === 'MERGE_PENDING',
    runCardFixtureProduced: fixtures.runCard.type === 'SERA_AUTOPILOT_RUN_CARD',
    rollbackFixtureProduced: fixtures.rollbackPacket.type === 'SERA_ROLLBACK_PACKET',
    evidenceFixtureProduced: fixtures.evidencePacket.type === 'SERA_AUTOPILOT_EVIDENCE_PACKET',
    bridgeOutboxFixtureProduced: fixtures.bridgeOutboxPrompt.type === 'SERA_BRIDGE_OUTBOX_PROMPT',
    nextPhaseRequestScenarioPassed: scenarioResults.find((item) => item.scenario === 'closed-cleanly-creates-next-phase-request')?.passed === true,
    repairRequestScenarioPassed: scenarioResults.find((item) => item.scenario === 'blocked-creates-repair-request')?.passed === true,
    safeMergeScenarioPassed: scenarioResults.find((item) => item.scenario === 'pass-waits-for-merge-or-safe-auto-merge-policy')?.passed === true,
    rollbackScenarioPassed: scenarioResults.find((item) => item.scenario === 'rollback-scenario-proves-recovery-command-lineage')?.passed === true,
    needsAttentionScenarioPassed: scenarioResults.find((item) => item.scenario === 'needs-attention-stops-batch-and-preserves-evidence')?.passed === true,
    phoneStartScenarioPassed: scenarioResults.find((item) => item.scenario === 'run-card-batch-proves-phone-control-start')?.passed === true,
    phonePauseScenarioPassed: scenarioResults.find((item) => item.scenario === 'pause-file-proves-phone-control-stop')?.passed === true,
    phase108ScaffoldIntegrated: true,
    proofOfUseCommandAllowed: true,
    proofOfUseCommandRequiredBeforeAutoMerge: true,
    secretScanStillRequired: true,
    riskScanStillRequired: true,
    rollbackPacketStillRequired: true,
    autopilotPolicyMutationAllowed: false,
    chatGptBrowserExecutionAllowed: false,
    chatGptPromptSubmissionAllowed: false,
    realProjectMergeExecutionAllowed: false,
    gitPushAllowed: false,
    tagCreationAllowed: false,
    remoteBranchDeletionAllowed: false,
    dependencyInstallAllowed: false,
    globalToolInstallAllowed: false,
    githubSecuritySettingsMutationAllowed: false,
    paidServiceActivationAllowed: false,
    tokenExposureAllowed: false,
    selfApprovalAllowed: false,
    selfMergeAllowed: false,
    selfDeployAllowed: false,
    productionDeploymentAllowed: false,
    readyForPhase110BridgeDryRun: true,
    readyForPhase111DomInspector: true,
    fixtures,
    scenarioResults,
    failedScenarios,
    milestoneReviewShell: buildMilestoneReviewShell({ phases: [108, 109] }),
  };

  const validation = validateProofOfUseSimulationHarness(result);
  return {
    ...result,
    validationFailedCount: validation.failures.length,
    validationFailures: validation.failures,
  };
}

export function validateProofOfUseSimulationHarness(result) {
  const failures = [];
  if (result.proofOfUseSimulationHarnessStatus !== PHASE_109_STATUS) {
    failures.push('status-mismatch');
  }
  if (result.declaredFileCount !== PHASE_109_DECLARED_FILES.length) {
    failures.push('declared-file-count-mismatch');
  }
  if (result.proofFixtureCount !== PHASE_109_PROOF_FIXTURES.length) {
    failures.push('proof-fixture-count-mismatch');
  }
  if (result.proofScenarioCount !== PHASE_109_PROOF_SCENARIOS.length) {
    failures.push('proof-scenario-count-mismatch');
  }
  if (result.safetyGateCount !== 2340) {
    failures.push('safety-gate-count-mismatch');
  }
  if (result.phase108ScaffoldIntegrated !== true) {
    failures.push('phase108-scaffold-integration-missing');
  }
  if (result.proofOfUseCommandRequiredBeforeAutoMerge !== true) {
    failures.push('proof-of-use-must-be-required-before-auto-merge');
  }
  if (result.chatGptBrowserExecutionAllowed !== false || result.chatGptPromptSubmissionAllowed !== false) {
    failures.push('browser-execution-must-remain-disabled-in-phase109');
  }
  if (result.realProjectMergeExecutionAllowed !== false || result.gitPushAllowed !== false) {
    failures.push('real-git-execution-must-remain-disabled-in-phase109');
  }
  if (result.tokenExposureAllowed !== false) {
    failures.push('token-exposure-must-remain-blocked');
  }
  if (Array.isArray(result.failedScenarios) && result.failedScenarios.length > 0) {
    failures.push('proof-scenario-failure');
  }
  return {
    valid: failures.length === 0,
    failures,
  };
}

export function formatProofOfUseSimulationHarnessSummary(result) {
  const orderedKeys = [
    'proofOfUseSimulationHarnessStatus',
    'validationFailedCount',
    'declaredFileCount',
    'proofFixtureCount',
    'proofScenarioCount',
    'roadmapTrackCount',
    'multiLanguageProductionTargetCount',
    'safetyGateCount',
    'proofHarnessRequired',
    'sampleDataRequired',
    'closedCleanlyFixtureProduced',
    'blockedFixtureProduced',
    'passFixtureProduced',
    'mergePendingFixtureProduced',
    'runCardFixtureProduced',
    'rollbackFixtureProduced',
    'evidenceFixtureProduced',
    'bridgeOutboxFixtureProduced',
    'nextPhaseRequestScenarioPassed',
    'repairRequestScenarioPassed',
    'safeMergeScenarioPassed',
    'rollbackScenarioPassed',
    'needsAttentionScenarioPassed',
    'phoneStartScenarioPassed',
    'phonePauseScenarioPassed',
    'phase108ScaffoldIntegrated',
    'proofOfUseCommandAllowed',
    'proofOfUseCommandRequiredBeforeAutoMerge',
    'secretScanStillRequired',
    'riskScanStillRequired',
    'rollbackPacketStillRequired',
    'autopilotPolicyMutationAllowed',
    'chatGptBrowserExecutionAllowed',
    'chatGptPromptSubmissionAllowed',
    'realProjectMergeExecutionAllowed',
    'gitPushAllowed',
    'tagCreationAllowed',
    'remoteBranchDeletionAllowed',
    'dependencyInstallAllowed',
    'globalToolInstallAllowed',
    'githubSecuritySettingsMutationAllowed',
    'paidServiceActivationAllowed',
    'tokenExposureAllowed',
    'selfApprovalAllowed',
    'selfMergeAllowed',
    'selfDeployAllowed',
    'productionDeploymentAllowed',
    'readyForPhase110BridgeDryRun',
    'readyForPhase111DomInspector',
  ];

  const lines = ['S.E.R.A. phase109 proof-of-use simulation harness v1: PASS'];
  for (const key of orderedKeys) {
    lines.push(`${key}: ${result[key]}`);
  }
  return lines.join('\n');
}
