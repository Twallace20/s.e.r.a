#!/usr/bin/env node
import path from 'node:path';
import {
  buildProofOfUseSimulationHarness,
  formatProofOfUseSimulationHarnessSummary,
  validateProofOfUseSimulationHarness,
  writeProofFixtureSet,
} from './lib/proof-of-use-simulation-harness-v1.mjs';

const mode = process.argv.includes('--verify') ? 'verify' : 'demo';
const shouldWriteFixtures = process.argv.includes('--write-fixtures');
const result = buildProofOfUseSimulationHarness();
const validation = validateProofOfUseSimulationHarness(result);

console.log(formatProofOfUseSimulationHarnessSummary(result));

if (shouldWriteFixtures) {
  const outputDir = path.join(process.cwd(), '.sera-proof-fixtures', 'phase109');
  const outputPath = writeProofFixtureSet(outputDir, result.fixtures);
  console.log(`phase109ProofFixtureSet: ${outputPath}`);
}

if (!validation.valid) {
  console.error(`Phase 109 ${mode} failed: ${validation.failures.join(', ')}`);
  process.exit(1);
}

if (result.validationFailedCount !== 0) {
  console.error(`Phase 109 ${mode} failed: result.validationFailedCount=${result.validationFailedCount}`);
  process.exit(1);
}
