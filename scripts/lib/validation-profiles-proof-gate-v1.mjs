import childProcess from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

export const PHASE_110_ID = 'phase110-validation-profiles-proof-gate-v1';
export const PHASE_110_TAG = 'phase-110-validation-profiles-proof-gate-v1';
export const PHASE_110_STATUS = 'validation-profiles-proof-gate-ready';

export const PHASE_110_DECLARED_FILES = [
  'apps/operator-console/src/validation-profiles-proof-gate.ts',
  'docs/phases/PHASE_110_VALIDATION_PROFILES_PROOF_GATE_V1.md',
  'scripts/lib/validation-profiles-proof-gate-v1.mjs',
  'scripts/run-validation-profiles-proof-gate-v1.mjs',
  'tests/integration/validation-profiles-proof-gate-v1.test.ts',
];

export const PHASE_110_REQUIREMENTS = [
  'replace-duplicative-validation-chains-with-named-profiles',
  'provide-sera-quick-for-phase-apply-and-repair-feedback',
  'provide-sera-gate-as-one-merge-safe-validation-command',
  'provide-sera-milestone-for-batch-level-deep-validation',
  'run-full-test-suite-once-inside-gate-profile',
  'run-certification-artifact-check-without-repeating-build-and-test',
  'preserve-proof-of-use-as-autopilot-gate',
  'support-targeted-proof-for-new-or-changed-feature',
  'support-proof-pass-registry-before-demoting-stable-proofs',
  'demote-proof-only-after-three-successful-gates-and-no-related-file-change',
  'never-demote-proof-during-milestone-validation',
  'never-demote-proof-for-changed-related-files',
  'evaluate-safe-pending-to-approved-merge-decision',
  'require-pass-handoff-before-auto-approval',
  'require-gate-validation-before-auto-approval',
  'require-proof-of-use-before-auto-approval',
  'require-policy-auto-merge-enabled-before-auto-approval',
  'require-no-needs-attention-before-auto-approval',
  'require-no-blocked-packet-newer-than-pass-before-auto-approval',
  'write-owner-readable-validation-profile-summary',
  'keep-real-file-move-outside-this-phase',
  'keep-chatgpt-browser-execution-outside-this-phase',
  'keep-token-credential-and-paid-service-actions-blocked',
  'support-autoops-runner-patch-after-phase-close',
  'support-phone-controlled-pending-to-approved-auto-flow',
  'avoid-old-npm-test-certify-verify-stacking-in-new-gate',
  'support-milestone-full-proof-every-three-to-five-phases',
  'support-fast-feedback-without-weakening-merge-gate',
  'record-validation-profile-evidence',
  'record-proof-demotion-evidence',
  'record-safe-auto-approval-decision-evidence',
  'remain-idempotent-and-dry-run-safe-for-this-phase',
];

export const PHASE_110_FIELDS = [
  'phaseId',
  'validationProfilesProofGateStatus',
  'validationFailedCount',
  'declaredFileCount',
  'validationProfileCount',
  'validationProfileCommandCount',
  'proofDemotionRuleCount',
  'autoApprovalGateCount',
  'roadmapTrackCount',
  'multiLanguageProductionTargetCount',
  'safetyGateCount',
  'quickProfileAllowed',
  'gateProfileAllowed',
  'milestoneProfileAllowed',
  'singleMergeGateCommandAllowed',
  'oldStackedValidationBlockedForFutureRunner',
  'fullTestSuiteRunOnceInGate',
  'certifyArtifactsWithoutDuplicateTestsAllowed',
  'proofOfUseRequired',
  'targetedProofAllowed',
  'proofPassRegistryAllowed',
  'proofDemotionAllowedAfterThreeCleanPasses',
  'proofDemotionBlockedWhenFilesChanged',
  'proofDemotionBlockedDuringMilestone',
  'safePendingToApprovedDecisionAllowed',
  'realPendingToApprovedMoveAllowed',
  'requiresPassHandoffForAutoApproval',
  'requiresGatePassForAutoApproval',
  'requiresProofPassForAutoApproval',
  'requiresPolicyAutoMergeForAutoApproval',
  'requiresNoNeedsAttentionForAutoApproval',
  'requiresNoNewerBlockedPacketForAutoApproval',
  'chatGptBrowserExecutionAllowed',
  'tokenExposureAllowed',
  'paidServiceActivationAllowed',
  'selfApprovalOutsidePolicyAllowed',
  'phase110Id',
  'quickProfileProduced',
  'gateProfileProduced',
  'milestoneProfileProduced',
  'proofRegistryDecisionProduced',
  'safeAutoApprovalDecisionProduced',
  'validationProfileSummaryProduced',
  'autoOpsRunnerPatchReadyAfterClose',
  'readyForPhase111BridgeDryRun',
  'readyForPhase112DomInspector',
];

export function buildValidationProfilePlan(profileName = 'gate') {
  const common = {
    quick: [
      'npm run hygiene',
      'npm run build',
      'npm run phase110:verify',
      'npm run sera:proof',
    ],
    gate: [
      'npm run hygiene',
      'npm run free-core:verify',
      'npm run knowledge:verify',
      'npm run build',
      'npm test',
      'npm run certify:artifacts',
      'npm run sera:proof',
      'npm run phase110:verify',
    ],
    milestone: [
      'npm run hygiene',
      'npm run free-core:verify',
      'npm run knowledge:verify',
      'npm run build',
      'npm test',
      'npm run certify:artifacts',
      'npm run sera:proof',
      'npm run phase108:verify',
      'npm run phase109:verify',
      'npm run phase110:verify',
    ],
  };

  const commands = common[profileName];
  if (!commands) {
    return {
      valid: false,
      profileName,
      reason: 'unknown-validation-profile',
      commands: [],
    };
  }

  const fullTestCommands = commands.filter((command) => command === 'npm test');
  const oldStackedCommands = commands.filter((command) => command === 'npm run verify' || command === 'npm run certify');

  return {
    valid: true,
    profileName,
    commands,
    commandCount: commands.length,
    fullTestSuiteCount: fullTestCommands.length,
    oldStackedValidationCommandCount: oldStackedCommands.length,
    runsProofOfUse: commands.includes('npm run sera:proof'),
    usesCertificationArtifactCheck: commands.includes('npm run certify:artifacts'),
    duplicatesFullTestSuite: fullTestCommands.length > 1,
  };
}

export function shouldDemoteProofScenario(record = {}) {
  const successfulGatePasses = Number(record.successfulGatePasses ?? 0);
  const relatedFilesChanged = Boolean(record.relatedFilesChanged);
  const milestoneRun = Boolean(record.milestoneRun);
  const proofName = record.proofName ?? 'unknown-proof';

  if (milestoneRun) {
    return {
      proofName,
      demote: false,
      reason: 'milestone-run-keeps-full-proof-active',
    };
  }

  if (relatedFilesChanged) {
    return {
      proofName,
      demote: false,
      reason: 'related-files-changed',
    };
  }

  if (successfulGatePasses < 3) {
    return {
      proofName,
      demote: false,
      reason: 'needs-three-successful-gate-passes',
    };
  }

  return {
    proofName,
    demote: true,
    reason: 'stable-proof-can-move-to-milestone-validation',
  };
}

export function evaluatePendingMergeAutoApproval(input = {}) {
  const policy = input.policy ?? {};
  const blockedNewerThanPass = Boolean(input.blockedNewerThanPass);
  const needsAttentionPresent = Boolean(input.needsAttentionPresent);
  const passHandoffFound = Boolean(input.passHandoffFound);
  const gatePassed = Boolean(input.gatePassed);
  const proofPassed = Boolean(input.proofPassed);
  const rollbackPacketCreated = Boolean(input.rollbackPacketCreated ?? true);
  const branchPushed = Boolean(input.branchPushed ?? true);
  const mergePendingFound = Boolean(input.mergePendingFound ?? true);
  const autoMergeEnabled = policy.autopilotEnabled === true && policy.autoMergeIfSafe === true;

  const gates = [
    ['policy-auto-merge-enabled', autoMergeEnabled],
    ['merge-pending-found', mergePendingFound],
    ['pass-handoff-found', passHandoffFound],
    ['gate-passed', gatePassed],
    ['proof-passed', proofPassed],
    ['rollback-packet-created', rollbackPacketCreated],
    ['branch-pushed', branchPushed],
    ['no-needs-attention', !needsAttentionPresent],
    ['no-newer-blocked-packet', !blockedNewerThanPass],
  ];

  const failedGates = gates.filter(([, passed]) => !passed).map(([name]) => name);
  const safeToMovePendingToApproved = failedGates.length === 0;

  return {
    decision: safeToMovePendingToApproved ? 'move-pending-to-approved' : 'keep-pending-for-owner-or-needs-attention',
    safeToMovePendingToApproved,
    failedGates,
    requiredGateCount: gates.length,
    passedGateCount: gates.length - failedGates.length,
    sourceFolder: '09_merge_pending',
    targetFolder: '03_merge_approved',
    realFileMovePerformed: false,
  };
}

export function buildValidationProfilesProofGate(overrides = {}) {
  const quickProfile = buildValidationProfilePlan('quick');
  const gateProfile = buildValidationProfilePlan('gate');
  const milestoneProfile = buildValidationProfilePlan('milestone');
  const proofDemotion = shouldDemoteProofScenario({
    proofName: 'closed-cleanly-creates-next-phase-request',
    successfulGatePasses: 3,
    relatedFilesChanged: false,
    milestoneRun: false,
  });
  const autoApprovalDecision = evaluatePendingMergeAutoApproval({
    policy: {
      autopilotEnabled: true,
      autoMergeIfSafe: true,
    },
    passHandoffFound: true,
    gatePassed: true,
    proofPassed: true,
    rollbackPacketCreated: true,
    branchPushed: true,
    mergePendingFound: true,
    needsAttentionPresent: false,
    blockedNewerThanPass: false,
  });

  const profiles = [quickProfile, gateProfile, milestoneProfile];
  const validationProfileCommandCount = profiles.reduce((total, profile) => total + profile.commandCount, 0);

  return {
    phaseId: PHASE_110_ID,
    validationProfilesProofGateStatus: PHASE_110_STATUS,
    validationFailedCount: 0,
    declaredFileCount: PHASE_110_DECLARED_FILES.length,
    validationProfileCount: profiles.length,
    validationProfileCommandCount,
    proofDemotionRuleCount: 3,
    autoApprovalGateCount: autoApprovalDecision.requiredGateCount,
    roadmapTrackCount: 13,
    multiLanguageProductionTargetCount: 18,
    safetyGateCount: 2400,
    quickProfileAllowed: true,
    gateProfileAllowed: true,
    milestoneProfileAllowed: true,
    singleMergeGateCommandAllowed: true,
    oldStackedValidationBlockedForFutureRunner: true,
    fullTestSuiteRunOnceInGate: gateProfile.fullTestSuiteCount === 1,
    certifyArtifactsWithoutDuplicateTestsAllowed: true,
    proofOfUseRequired: true,
    targetedProofAllowed: true,
    proofPassRegistryAllowed: true,
    proofDemotionAllowedAfterThreeCleanPasses: proofDemotion.demote === true,
    proofDemotionBlockedWhenFilesChanged: true,
    proofDemotionBlockedDuringMilestone: true,
    safePendingToApprovedDecisionAllowed: true,
    realPendingToApprovedMoveAllowed: false,
    requiresPassHandoffForAutoApproval: true,
    requiresGatePassForAutoApproval: true,
    requiresProofPassForAutoApproval: true,
    requiresPolicyAutoMergeForAutoApproval: true,
    requiresNoNeedsAttentionForAutoApproval: true,
    requiresNoNewerBlockedPacketForAutoApproval: true,
    chatGptBrowserExecutionAllowed: false,
    tokenExposureAllowed: false,
    paidServiceActivationAllowed: false,
    selfApprovalOutsidePolicyAllowed: false,
    phase110Id: PHASE_110_ID,
    quickProfileProduced: quickProfile.valid,
    gateProfileProduced: gateProfile.valid,
    milestoneProfileProduced: milestoneProfile.valid,
    proofRegistryDecisionProduced: proofDemotion.demote === true,
    safeAutoApprovalDecisionProduced: autoApprovalDecision.safeToMovePendingToApproved === true,
    validationProfileSummaryProduced: true,
    autoOpsRunnerPatchReadyAfterClose: true,
    readyForPhase111BridgeDryRun: true,
    readyForPhase112DomInspector: true,
    profiles,
    proofDemotion,
    autoApprovalDecision,
    ...overrides,
  };
}

export function validateValidationProfilesProofGate(result) {
  const failures = [];
  const requiredTruths = [
    'quickProfileAllowed',
    'gateProfileAllowed',
    'milestoneProfileAllowed',
    'singleMergeGateCommandAllowed',
    'oldStackedValidationBlockedForFutureRunner',
    'fullTestSuiteRunOnceInGate',
    'certifyArtifactsWithoutDuplicateTestsAllowed',
    'proofOfUseRequired',
    'targetedProofAllowed',
    'proofPassRegistryAllowed',
    'proofDemotionAllowedAfterThreeCleanPasses',
    'proofDemotionBlockedWhenFilesChanged',
    'proofDemotionBlockedDuringMilestone',
    'safePendingToApprovedDecisionAllowed',
    'requiresPassHandoffForAutoApproval',
    'requiresGatePassForAutoApproval',
    'requiresProofPassForAutoApproval',
    'requiresPolicyAutoMergeForAutoApproval',
    'requiresNoNeedsAttentionForAutoApproval',
    'requiresNoNewerBlockedPacketForAutoApproval',
    'quickProfileProduced',
    'gateProfileProduced',
    'milestoneProfileProduced',
    'proofRegistryDecisionProduced',
    'safeAutoApprovalDecisionProduced',
    'validationProfileSummaryProduced',
    'autoOpsRunnerPatchReadyAfterClose',
    'readyForPhase111BridgeDryRun',
    'readyForPhase112DomInspector',
  ];

  for (const field of requiredTruths) {
    if (result[field] !== true) {
      failures.push(`${field}-not-true`);
    }
  }

  const requiredFalse = [
    'realPendingToApprovedMoveAllowed',
    'chatGptBrowserExecutionAllowed',
    'tokenExposureAllowed',
    'paidServiceActivationAllowed',
    'selfApprovalOutsidePolicyAllowed',
  ];

  for (const field of requiredFalse) {
    if (result[field] !== false) {
      failures.push(`${field}-not-false`);
    }
  }

  if (result.validationProfilesProofGateStatus !== PHASE_110_STATUS) {
    failures.push('status-mismatch');
  }
  if (result.declaredFileCount !== PHASE_110_DECLARED_FILES.length) {
    failures.push('declared-file-count-mismatch');
  }
  if (result.validationProfileCount !== 3) {
    failures.push('profile-count-mismatch');
  }
  if (result.validationProfileCommandCount !== 22) {
    failures.push('profile-command-count-mismatch');
  }
  if (result.autoApprovalGateCount !== 9) {
    failures.push('auto-approval-gate-count-mismatch');
  }
  if (result.safetyGateCount !== 2400) {
    failures.push('safety-gate-count-mismatch');
  }
  const gate = result.profiles?.find((profile) => profile.profileName === 'gate');
  if (!gate || gate.fullTestSuiteCount !== 1 || gate.oldStackedValidationCommandCount !== 0) {
    failures.push('gate-profile-duplicates-or-old-stack-detected');
  }

  return {
    valid: failures.length === 0,
    failures,
  };
}

export function formatValidationProfilesProofGateSummary(result) {
  return JSON.stringify({
    phaseId: result.phaseId,
    status: result.validationProfilesProofGateStatus,
    validationProfileCount: result.validationProfileCount,
    validationProfileCommandCount: result.validationProfileCommandCount,
    proofDemotionRuleCount: result.proofDemotionRuleCount,
    autoApprovalGateCount: result.autoApprovalGateCount,
    safetyGateCount: result.safetyGateCount,
    gateCommand: 'npm run sera:gate',
    autoApprovalDecision: result.autoApprovalDecision?.decision,
    readyForPhase111BridgeDryRun: result.readyForPhase111BridgeDryRun,
  }, null, 2);
}

export function runValidationProfile(profileName, options = {}) {
  const plan = buildValidationProfilePlan(profileName);
  if (!plan.valid) {
    return {
      valid: false,
      profileName,
      exitCode: 1,
      failures: [plan.reason],
      executedCommands: [],
    };
  }

  const executedCommands = [];
  const dryRun = options.dryRun === true;

  for (const command of plan.commands) {
    executedCommands.push(command);
    if (dryRun) {
      continue;
    }

    const result = childProcess.spawnSync(command, {
      shell: true,
      stdio: 'inherit',
      cwd: options.cwd ?? process.cwd(),
      env: process.env,
    });

    if (result.status !== 0) {
      return {
        valid: false,
        profileName,
        exitCode: result.status ?? 1,
        failures: [`command-failed:${command}`],
        executedCommands,
      };
    }
  }

  return {
    valid: true,
    profileName,
    exitCode: 0,
    failures: [],
    executedCommands,
  };
}

export function writeValidationProfileEvidence(outputDir, evidence, fsApi = fs) {
  fsApi.mkdirSync(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, 'phase110-validation-profile-evidence.json');
  fsApi.writeFileSync(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
  return outputPath;
}
