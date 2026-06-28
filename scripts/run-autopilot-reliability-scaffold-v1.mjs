#!/usr/bin/env node
import {
  buildAutopilotReliabilityScaffold,
  formatAutopilotReliabilityScaffoldSummary,
  validateAutopilotReliabilityScaffold,
} from './lib/autopilot-reliability-scaffold-v1.mjs';

const mode = process.argv.includes('--verify') ? 'verify' : 'demo';
const result = buildAutopilotReliabilityScaffold();
const validation = validateAutopilotReliabilityScaffold(result);

console.log(formatAutopilotReliabilityScaffoldSummary(result));

if (!validation.valid) {
  console.error(`Phase 108 ${mode} failed: ${validation.failures.join(', ')}`);
  process.exit(1);
}

if (result.validationFailedCount !== 0) {
  console.error(`Phase 108 ${mode} failed: result.validationFailedCount=${result.validationFailedCount}`);
  process.exit(1);
}
