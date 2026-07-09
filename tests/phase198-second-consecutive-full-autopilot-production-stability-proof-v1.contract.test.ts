import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';
describe('Phase198 second consecutive full autopilot production stability contract', () => {
  const root = process.cwd();
  const contractPath = path.join(root, 'scripts', 'phase198-second-consecutive-full-autopilot-production-stability-proof-v1.contract.json');
  const contract = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
  it('requires all production gates before CLOSED_CLEANLY', () => {
    expect(contract.phase).toBe(198);
    expect(contract.phaseSlug).toBe('phase198_second_consecutive_full_autopilot_production_stability_proof_v1');
    expect(contract.closedCleanlyAllowedOnlyAfterAllRequiredGates).toBe(true);
    expect(contract.manualRescueAllowed).toBe(false);
    expect(contract.pointerDiffCleanupRequired).toBe(true);
    expect(contract.requiredGatesInOrder).toContain('pointer_diff_cleanup_verified');
    expect(contract.requiredGatesInOrder).toContain('no_manual_rescue');
    expect(contract.phase197TrustedBaseline.commit).toBe('8fb5e0d160f953a518ac1d3757d9fec66a35afc2');
  });
});
