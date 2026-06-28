import { describe, expect, it } from 'vitest';
import {
  buildBridgePromptFromHandoff,
  buildChatGptBridgeDryRun,
  buildFutureDomInspectorObservation,
  buildSampleHandoffs,
  classifyHandoffStatus,
  runChatGptBridgeDryRun,
  validateChatGptBridgeDryRun,
  writeBridgeOutboxPrompt,
} from '../../scripts/lib/chatgpt-bridge-dry-run-v1.mjs';

describe('Phase 111 — ChatGPT Bridge Dry-Run v1', () => {
  it('produces the dry-run bridge contract while keeping browser execution disabled', () => {
    const result = buildChatGptBridgeDryRun();
    const validation = validateChatGptBridgeDryRun(result);

    expect(validation.valid).toBe(true);
    expect(result.chatGptBridgeDryRunStatus).toBe('chatgpt-bridge-dry-run-ready');
    expect(result.declaredFileCount).toBe(5);
    expect(result.supportedPromptTypeCount).toBe(4);
    expect(result.bridgeFolderCount).toBe(4);
    expect(result.futureDomSelectorCandidateCount).toBe(6);
    expect(result.safetyGateCount).toBe(2460);
    expect(result.closedCleanlyPromptProduced).toBe(true);
    expect(result.blockedRepairPromptProduced).toBe(true);
    expect(result.passMergeReviewPromptProduced).toBe(true);
    expect(result.needsAttentionSummaryProduced).toBe(true);
    expect(result.bridgeOutboxWriteAllowed).toBe(true);
    expect(result.bridgeOutboxDryRunOnly).toBe(true);
    expect(result.autoOpsLevel1Compatible).toBe(true);
    expect(result.chatGptBrowserExecutionAllowed).toBe(false);
    expect(result.chatGptPromptSubmissionAllowed).toBe(false);
    expect(result.chatGptDownloadAutomationAllowed).toBe(false);
    expect(result.domClickAllowed).toBe(false);
    expect(result.tokenExposureAllowed).toBe(false);
    expect(result.paidServiceActivationAllowed).toBe(false);
    expect(result.readyForPhase112DomInspector).toBe(true);
  });

  it('maps handoff statuses to the correct bridge prompt type', () => {
    const samples = buildSampleHandoffs();

    expect(classifyHandoffStatus(samples.closedCleanly)).toMatchObject({ status: 'CLOSED_CLEANLY', promptType: 'next-phase-request', valid: true });
    expect(classifyHandoffStatus(samples.blocked)).toMatchObject({ status: 'BLOCKED', promptType: 'repair-request', valid: true });
    expect(classifyHandoffStatus(samples.pass)).toMatchObject({ status: 'PASS', promptType: 'merge-review-request', valid: true });
    expect(classifyHandoffStatus(samples.needsAttention)).toMatchObject({ status: 'NEEDS_ATTENTION', promptType: 'owner-attention-summary', valid: true });
    expect(classifyHandoffStatus('Status: CONFUSED')).toMatchObject({ status: 'CONFUSED', promptType: 'unknown', valid: false });
  });

  it('builds a next-phase prompt from CLOSED_CLEANLY without browser submission', () => {
    const samples = buildSampleHandoffs();
    const prompt = buildBridgePromptFromHandoff({ handoffMarkdown: samples.closedCleanly, nextPhase: 'Phase 112 — ChatGPT Bridge DOM Inspector v1' });

    expect(prompt.valid).toBe(true);
    expect(prompt.promptType).toBe('next-phase-request');
    expect(prompt.title).toContain('phase110');
    expect(prompt.body).toContain('Generate the next overlay ZIP only');
    expect(prompt.body).toContain('Do not require credentials');
  });

  it('builds a repair prompt from BLOCKED with log context and safe routing language', () => {
    const samples = buildSampleHandoffs();
    const prompt = buildBridgePromptFromHandoff({ handoffMarkdown: samples.blocked });

    expect(prompt.valid).toBe(true);
    expect(prompt.promptType).toBe('repair-request');
    expect(prompt.body).toContain('Diagnose the failure');
    expect(prompt.body).toContain('hotfix script, fixed overlay, or rollback');
    expect(prompt.body).toContain('sample fixture was missing');
    expect(prompt.body).toContain('Never ask to expose tokens');
  });

  it('writes a bridge outbox packet through an injectable filesystem', () => {
    const samples = buildSampleHandoffs();
    const prompt = buildBridgePromptFromHandoff({ handoffMarkdown: samples.closedCleanly });
    const writes: Record<string, string> = {};
    const fsApi = {
      mkdirSync: (_target: string) => undefined,
      writeFileSync: (target: string, value: string) => {
        writes[target] = value;
      },
    };

    const output = writeBridgeOutboxPrompt('C:/SERA-AutoOps/15_bridge_outbox', prompt, fsApi as any);

    expect(output).toContain('next-phase-request');
    expect(Object.keys(writes)).toHaveLength(1);
    expect(Object.values(writes)[0]).toContain('S.E.R.A. ChatGPT Bridge Dry-Run Packet');
    expect(Object.values(writes)[0]).toContain('Browser execution: disabled in Phase 111');
  });

  it('records future DOM selector observations but blocks live DOM execution until Phase 112', () => {
    const observation = buildFutureDomInspectorObservation();

    expect(observation.ctrlFComposerLookupReliable).toBe(false);
    expect(observation.domInspectorRequiredBeforeTextboxUse).toBe(true);
    expect(observation.candidateSelectors).toContain('div[contenteditable="true"][role="textbox"].ProseMirror#prompt-textarea');
    expect(observation.candidateSelectors).toContain('[role="textbox"][contenteditable="true"]');
    expect(observation.browserExecutionAllowedInPhase111).toBe(false);
    expect(observation.promptSubmissionAllowedInPhase111).toBe(false);
    expect(observation.readyForPhase112DomInspector).toBe(true);
  });

  it('runs the complete dry-run simulation and emits four prompt packets', () => {
    const result = runChatGptBridgeDryRun();

    expect(result.samplePromptCount).toBe(4);
    expect(result.prompts.closedCleanly.promptType).toBe('next-phase-request');
    expect(result.prompts.blocked.promptType).toBe('repair-request');
    expect(result.prompts.pass.promptType).toBe('merge-review-request');
    expect(result.prompts.needsAttention.promptType).toBe('owner-attention-summary');
    expect(result.domObservation.readyForPhase112DomInspector).toBe(true);
  });
});
