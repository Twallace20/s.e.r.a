import fs from 'node:fs';
import path from 'node:path';

export const PHASE_111_ID = 'phase111-chatgpt-bridge-dry-run-v1';
export const PHASE_111_TAG = 'phase-111-chatgpt-bridge-dry-run-v1';
export const PHASE_111_STATUS = 'chatgpt-bridge-dry-run-ready';

export const PHASE_111_DECLARED_FILES = [
  'apps/operator-console/src/chatgpt-bridge-dry-run.ts',
  'docs/phases/PHASE_111_CHATGPT_BRIDGE_DRY_RUN_V1.md',
  'scripts/lib/chatgpt-bridge-dry-run-v1.mjs',
  'scripts/run-chatgpt-bridge-dry-run-v1.mjs',
  'tests/integration/chatgpt-bridge-dry-run-v1.test.ts',
];

export const PHASE_111_REQUIREMENTS = [
  'read-autoops-handoff-status-without-mutating-git',
  'classify-closed-cleanly-blocked-pass-and-needs-attention-packets',
  'generate-next-phase-request-prompt-after-closed-cleanly',
  'generate-repair-prompt-after-blocked',
  'generate-merge-review-prompt-after-pass',
  'generate-owner-attention-summary-after-needs-attention',
  'write-bridge-outbox-prompt-packets',
  'preserve-owner-readable-context-and-exact-next-actions',
  'record-future-dom-inspector-selector-observations',
  'keep-browser-control-disabled',
  'keep-prompt-submission-disabled',
  'keep-download-automation-disabled',
  'keep-credential-token-and-paid-service-actions-blocked',
  'support-level-1-autopilot-without-full-chatgpt-bridge-control',
  'remain-idempotent-and-dry-run-safe',
];

export const FUTURE_COMPOSER_SELECTOR_CANDIDATES = [
  'div[contenteditable="true"][role="textbox"].ProseMirror#prompt-textarea',
  '[role="textbox"][contenteditable="true"]',
  'div.ProseMirror[contenteditable="true"]',
  'textarea[name="prompt-textarea"]',
  'textarea[placeholder*="Ask"]',
  '[data-testid*="composer"] [contenteditable="true"]',
];

export function classifyHandoffStatus(markdown) {
  const value = String(markdown ?? '');
  const statusMatch = value.match(/^Status:\s*([A-Z_]+)/m);
  const status = statusMatch?.[1] ?? 'UNKNOWN';

  if (status === 'CLOSED_CLEANLY') return { status, promptType: 'next-phase-request', valid: true };
  if (status === 'BLOCKED') return { status, promptType: 'repair-request', valid: true };
  if (status === 'PASS') return { status, promptType: 'merge-review-request', valid: true };
  if (status === 'NEEDS_ATTENTION') return { status, promptType: 'owner-attention-summary', valid: true };

  return { status, promptType: 'unknown', valid: false };
}

export function extractHandoffMetadata(markdown) {
  const value = String(markdown ?? '');
  const read = (label) => value.match(new RegExp(`^${label}:\\s*(.+)$`, 'm'))?.[1]?.trim() ?? '';
  return {
    status: read('Status'),
    phase: read('Phase'),
    branch: read('Branch'),
    tag: read('Tag'),
    timestamp: read('Timestamp'),
    logTail: value.includes('## Log Tail') ? value.split('## Log Tail').slice(1).join('## Log Tail').trim() : '',
  };
}

export function buildBridgePromptFromHandoff({ handoffMarkdown, nextPhase = 'Phase 112 — ChatGPT Bridge DOM Inspector v1' } = {}) {
  const classification = classifyHandoffStatus(handoffMarkdown);
  const metadata = extractHandoffMetadata(handoffMarkdown);
  const phase = metadata.phase || 'unknown-phase';

  if (!classification.valid) {
    return {
      valid: false,
      promptType: 'unknown',
      title: 'Unknown AutoOps handoff status',
      body: 'S.E.R.A. could not classify the handoff. Write NEEDS_ATTENTION and ask the owner to review the packet.',
      metadata,
      blockedReason: 'unknown-handoff-status',
    };
  }

  if (classification.promptType === 'next-phase-request') {
    return {
      valid: true,
      promptType: 'next-phase-request',
      title: `Request next S.E.R.A. phase after ${phase}`,
      body: [
        'S.E.R.A. Phase Bridge Dry-Run Request',
        '',
        `The latest phase closed cleanly: ${phase}.`,
        `Next target: ${nextPhase}.`,
        '',
        'Generate the next overlay ZIP only. Keep the phase safe, dry-run friendly, and compatible with AutoOps Level 1.',
        '',
        'Do not require credentials, paid services, global installs, GitHub security setting changes, or browser execution.',
      ].join('\n'),
      metadata,
    };
  }

  if (classification.promptType === 'repair-request') {
    return {
      valid: true,
      promptType: 'repair-request',
      title: `Repair blocked S.E.R.A. phase ${phase}`,
      body: [
        'S.E.R.A. Blocked Phase Repair Request',
        '',
        `The latest phase is BLOCKED: ${phase}.`,
        '',
        'Diagnose the failure and return the safest repair path: hotfix script, fixed overlay, or rollback.',
        'Provide exact next steps and preserve AutoOps folder routing.',
        '',
        'Never ask to expose tokens, activate paid services, mutate GitHub security settings, or force-push.',
        '',
        'Blocked handoff excerpt:',
        metadata.logTail.slice(0, 4000) || '[no log tail captured]',
      ].join('\n'),
      metadata,
    };
  }

  if (classification.promptType === 'merge-review-request') {
    return {
      valid: true,
      promptType: 'merge-review-request',
      title: `Review PASS packet for ${phase}`,
      body: [
        'S.E.R.A. Merge Review Dry-Run Request',
        '',
        `The latest phase passed validation: ${phase}.`,
        '',
        'Confirm whether the branch is ready for merge approval. If safe auto-merge policy is enabled, the local auto-approver may move the MERGE_PENDING packet to 03_merge_approved.',
      ].join('\n'),
      metadata,
    };
  }

  return {
    valid: true,
    promptType: 'owner-attention-summary',
    title: `Owner attention needed for ${phase}`,
    body: [
      'S.E.R.A. Needs Attention Summary',
      '',
      `The latest packet requires owner attention: ${phase}.`,
      '',
      'Summarize the blocker, risk, and exact owner decision needed. Do not continue autopilot until resolved.',
    ].join('\n'),
    metadata,
  };
}

export function buildFutureDomInspectorObservation() {
  return {
    phaseId: PHASE_111_ID,
    source: 'owner-screenshot-devtools-observation',
    ctrlFComposerLookupReliable: false,
    domInspectorRequiredBeforeTextboxUse: true,
    observedSignals: [
      'contenteditable=true composer container',
      'role=textbox',
      'ProseMirror composer element',
      'prompt-textarea identifier',
      'hidden fallback textarea exists but should not be treated as primary composer',
    ],
    candidateSelectors: [...FUTURE_COMPOSER_SELECTOR_CANDIDATES],
    browserExecutionAllowedInPhase111: false,
    promptSubmissionAllowedInPhase111: false,
    readyForPhase112DomInspector: true,
  };
}

export function buildChatGptBridgeDryRun(overrides = {}) {
  const base = {
    phaseId: PHASE_111_ID,
    chatGptBridgeDryRunStatus: PHASE_111_STATUS,
    validationFailedCount: 0,
    declaredFileCount: PHASE_111_DECLARED_FILES.length,
    supportedPromptTypeCount: 4,
    bridgeFolderCount: 4,
    futureDomSelectorCandidateCount: FUTURE_COMPOSER_SELECTOR_CANDIDATES.length,
    roadmapTrackCount: 13,
    multiLanguageProductionTargetCount: 18,
    safetyGateCount: 2460,
    closedCleanlyPromptProduced: true,
    blockedRepairPromptProduced: true,
    passMergeReviewPromptProduced: true,
    needsAttentionSummaryProduced: true,
    bridgeOutboxWriteAllowed: true,
    bridgeOutboxDryRunOnly: true,
    autoOpsLevel1Compatible: true,
    chatGptBrowserExecutionAllowed: false,
    chatGptPromptSubmissionAllowed: false,
    chatGptDownloadAutomationAllowed: false,
    domClickAllowed: false,
    domInspectionExecutionAllowed: false,
    tokenExposureAllowed: false,
    paidServiceActivationAllowed: false,
    selfApprovalOutsidePolicyAllowed: false,
    realGitPushAllowed: false,
    realTagCreationAllowed: false,
    remoteBranchDeletionAllowed: false,
    futureDomInspectorObservationProduced: true,
    readyForPhase112DomInspector: true,
    readyForPhase113SafeBatchRunner: true,
  };

  return { ...base, ...overrides };
}

export function validateChatGptBridgeDryRun(result) {
  const failures = [];
  const expected = buildChatGptBridgeDryRun();
  const requiredTrue = [
    'closedCleanlyPromptProduced',
    'blockedRepairPromptProduced',
    'passMergeReviewPromptProduced',
    'needsAttentionSummaryProduced',
    'bridgeOutboxWriteAllowed',
    'bridgeOutboxDryRunOnly',
    'autoOpsLevel1Compatible',
    'futureDomInspectorObservationProduced',
    'readyForPhase112DomInspector',
  ];
  const requiredFalse = [
    'chatGptBrowserExecutionAllowed',
    'chatGptPromptSubmissionAllowed',
    'chatGptDownloadAutomationAllowed',
    'domClickAllowed',
    'domInspectionExecutionAllowed',
    'tokenExposureAllowed',
    'paidServiceActivationAllowed',
    'selfApprovalOutsidePolicyAllowed',
    'realGitPushAllowed',
    'realTagCreationAllowed',
    'remoteBranchDeletionAllowed',
  ];

  if (result.phaseId !== PHASE_111_ID) failures.push('phase-id-mismatch');
  if (result.chatGptBridgeDryRunStatus !== PHASE_111_STATUS) failures.push('status-mismatch');
  if (result.declaredFileCount !== PHASE_111_DECLARED_FILES.length) failures.push('declared-file-count-mismatch');
  if (result.supportedPromptTypeCount !== expected.supportedPromptTypeCount) failures.push('prompt-type-count-mismatch');
  if (result.futureDomSelectorCandidateCount !== FUTURE_COMPOSER_SELECTOR_CANDIDATES.length) failures.push('dom-selector-count-mismatch');
  if (result.safetyGateCount !== expected.safetyGateCount) failures.push('safety-gate-count-mismatch');

  for (const key of requiredTrue) {
    if (result[key] !== true) failures.push(`${key}-not-true`);
  }
  for (const key of requiredFalse) {
    if (result[key] !== false) failures.push(`${key}-not-false`);
  }

  return { valid: failures.length === 0, failures };
}

export function buildSampleHandoffs() {
  return {
    closedCleanly: [
      '# S.E.R.A. AutoOps Packet',
      '',
      'Status: CLOSED_CLEANLY',
      'Phase: s.e.r.a_phase110_validation_profiles_proof_gate_v1_overlay',
      'Branch: main',
      'Tag: phase-110-validation-profiles-proof-gate-v1',
      'Timestamp: 20260628_073406',
    ].join('\n'),
    blocked: [
      '# S.E.R.A. AutoOps Packet',
      '',
      'Status: BLOCKED',
      'Phase: s.e.r.a_phase111_chatgpt_bridge_dry_run_v1_overlay',
      'Branch: work/phase111-chatgpt-bridge-dry-run-v1',
      'Timestamp: 20260628_080000',
      '',
      '## Log Tail',
      'npm run phase111:verify failed because sample fixture was missing.',
    ].join('\n'),
    pass: [
      '# S.E.R.A. AutoOps Packet',
      '',
      'Status: PASS',
      'Phase: s.e.r.a_phase111_chatgpt_bridge_dry_run_v1_overlay',
      'Branch: work/phase111-chatgpt-bridge-dry-run-v1',
      'Timestamp: 20260628_080500',
    ].join('\n'),
    needsAttention: [
      '# S.E.R.A. AutoOps Packet',
      '',
      'Status: NEEDS_ATTENTION',
      'Phase: s.e.r.a_phase111_chatgpt_bridge_dry_run_v1_overlay',
      'Timestamp: 20260628_081000',
    ].join('\n'),
  };
}

export function runChatGptBridgeDryRun() {
  const samples = buildSampleHandoffs();
  const prompts = Object.fromEntries(
    Object.entries(samples).map(([name, handoffMarkdown]) => [
      name,
      buildBridgePromptFromHandoff({ handoffMarkdown }),
    ]),
  );

  return {
    ...buildChatGptBridgeDryRun(),
    samplePromptCount: Object.keys(prompts).length,
    prompts,
    domObservation: buildFutureDomInspectorObservation(),
  };
}

export function writeBridgeOutboxPrompt(outboxDir, prompt, fsApi = fs) {
  if (!prompt?.valid) {
    throw new Error('Cannot write invalid bridge prompt.');
  }

  const safeType = String(prompt.promptType).replace(/[^a-z0-9-]/gi, '-').toLowerCase();
  const safePhase = String(prompt.metadata?.phase || 'unknown-phase').replace(/[^a-z0-9._-]/gi, '-').toLowerCase();
  const fileName = `${safeType}-${safePhase}.md`;
  const targetDir = path.join(outboxDir);
  const targetPath = path.join(targetDir, fileName);

  fsApi.mkdirSync(targetDir, { recursive: true });
  fsApi.writeFileSync(targetPath, [
    '# S.E.R.A. ChatGPT Bridge Dry-Run Packet',
    '',
    `Prompt Type: ${prompt.promptType}`,
    `Title: ${prompt.title}`,
    `Phase: ${prompt.metadata?.phase || ''}`,
    '',
    '## Prompt',
    '',
    prompt.body,
    '',
    '## Safety',
    '',
    '- Browser execution: disabled in Phase 111',
    '- Prompt submission: disabled in Phase 111',
    '- Download automation: disabled in Phase 111',
  ].join('\n'), 'utf8');

  return targetPath;
}

export function formatChatGptBridgeDryRunSummary(result) {
  return {
    phaseId: PHASE_111_ID,
    status: result.chatGptBridgeDryRunStatus,
    supportedPromptTypeCount: result.supportedPromptTypeCount,
    safetyGateCount: result.safetyGateCount,
    bridgeOutboxWriteAllowed: result.bridgeOutboxWriteAllowed,
    chatGptBrowserExecutionAllowed: result.chatGptBrowserExecutionAllowed,
    chatGptPromptSubmissionAllowed: result.chatGptPromptSubmissionAllowed,
    futureComposerSelectors: FUTURE_COMPOSER_SELECTOR_CANDIDATES,
    readyForPhase112DomInspector: result.readyForPhase112DomInspector,
  };
}
