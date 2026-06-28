#!/usr/bin/env node
import {
  buildValidationProfilesProofGate,
  formatValidationProfilesProofGateSummary,
  runValidationProfile,
  validateValidationProfilesProofGate,
  writeValidationProfileEvidence,
} from './lib/validation-profiles-proof-gate-v1.mjs';

const args = process.argv.slice(2);
const profileIndex = args.indexOf('--profile');
const profileName = profileIndex >= 0 ? args[profileIndex + 1] : null;
const dryRun = args.includes('--dry-run');
const mode = args.includes('--verify') ? 'verify' : args.includes('--demo') ? 'demo' : profileName ? 'profile' : 'demo';

if (profileName) {
  const result = runValidationProfile(profileName, { dryRun });
  const evidence = {
    phaseId: 'phase110-validation-profiles-proof-gate-v1',
    mode: `profile:${profileName}`,
    dryRun,
    valid: result.valid,
    executedCommands: result.executedCommands,
    failures: result.failures,
    createdAt: new Date().toISOString(),
  };

  if (dryRun) {
    writeValidationProfileEvidence('tmp/phase110-validation-profile-evidence', evidence);
  }

  if (!result.valid) {
    console.error(`Phase 110 validation profile failed: ${result.failures.join(', ')}`);
    process.exit(result.exitCode || 1);
  }

  console.log(JSON.stringify(evidence, null, 2));
  process.exit(0);
}

const result = buildValidationProfilesProofGate();
const validation = validateValidationProfilesProofGate(result);

console.log(formatValidationProfilesProofGateSummary(result));

if (!validation.valid) {
  console.error(`Phase 110 ${mode} failed: ${validation.failures.join(', ')}`);
  process.exit(1);
}

if (result.validationFailedCount !== 0) {
  console.error(`Phase 110 ${mode} failed: result.validationFailedCount=${result.validationFailedCount}`);
  process.exit(1);
}
