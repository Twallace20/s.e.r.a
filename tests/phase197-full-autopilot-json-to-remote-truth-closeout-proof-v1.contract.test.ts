import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Phase197 full autopilot closeout proof contract', () => {
  const root = process.cwd();
  const contractPath = path.join(root, 'scripts', 'phase197-full-autopilot-json-to-remote-truth-closeout-proof-v1.contract.json');
  const contract = JSON.parse(fs.readFileSync(contractPath, 'utf8'));

  it('requires all gates before CLOSED_CLEANLY', () => {
    expect(contract.phase).toBe(197);
    expect(contract.phaseSlug).toBe('phase197_full_autopilot_json_to_remote_truth_closeout_proof_v1');
    expect(contract.closedCleanlyAllowedOnlyAfterAllRequiredGates).toBe(true);
    expect(contract.manualRescueAllowed).toBe(false);
    expect(contract.requiredGatesInOrder).toEqual([
      'fresh_command_json',
      'saved_chatgpt_target',
      'prompt_submitted',
      'exact_zip_downloaded',
      'exact_zip_sha_verified',
      'verifier_passed',
      'qa_passed_after_verifier',
      'merge_succeeded',
      'push_main_succeeded',
      'push_tag_succeeded',
      'remote_main_verified',
      'remote_tag_verified',
      'final_handoff_identity_verified',
      'no_manual_rescue'
    ]);
  });
});
