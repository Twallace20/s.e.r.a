#!/usr/bin/env node
import {
  buildBridgePromptFromHandoff,
  buildSampleHandoffs,
  buildChatGptBridgeDryRun,
  formatChatGptBridgeDryRunSummary,
  runChatGptBridgeDryRun,
  validateChatGptBridgeDryRun,
  writeBridgeOutboxPrompt,
} from './lib/chatgpt-bridge-dry-run-v1.mjs';

const args = new Set(process.argv.slice(2));

if (args.has('--demo')) {
  const result = runChatGptBridgeDryRun();
  console.log(JSON.stringify(formatChatGptBridgeDryRunSummary(result), null, 2));
  process.exit(0);
}

if (args.has('--write-sample-outbox')) {
  const outboxArg = process.argv.find((arg) => arg.startsWith('--outbox='));
  const outbox = outboxArg ? outboxArg.slice('--outbox='.length) : '15_bridge_outbox';
  const samples = buildSampleHandoffs();
  const prompt = buildBridgePromptFromHandoff({ handoffMarkdown: samples.closedCleanly });
  const written = writeBridgeOutboxPrompt(outbox, prompt);
  console.log(JSON.stringify({ written }, null, 2));
  process.exit(0);
}

if (args.has('--verify')) {
  const result = buildChatGptBridgeDryRun();
  const validation = validateChatGptBridgeDryRun(result);

  if (!validation.valid) {
    console.error(JSON.stringify({ ...result, failures: validation.failures }, null, 2));
    process.exit(1);
  }

  const dryRun = runChatGptBridgeDryRun();
  console.log('S.E.R.A. phase111 ChatGPT Bridge Dry-Run v1: PASS');
  for (const [key, value] of Object.entries(formatChatGptBridgeDryRunSummary(dryRun))) {
    console.log(`${key}: ${Array.isArray(value) ? value.join(', ') : value}`);
  }
  process.exit(0);
}

console.log(JSON.stringify(formatChatGptBridgeDryRunSummary(runChatGptBridgeDryRun()), null, 2));
