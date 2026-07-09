import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const contractPath = path.join(repoRoot, 'scripts', 'phase196-closeout-integrity-remote-truth-gate-v1.contract.json');
const fixturesPath = path.join(repoRoot, 'tests', 'fixtures', 'phase196-closeout-integrity', 'cases.json');

describe('Phase196 closeout integrity remote truth contract', () => {
  it('requires all closeout and remote truth gates before CLOSED_CLEANLY', () => {
    const contract = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
    expect(contract.phase).toBe(196);
    expect(contract.phaseSlug).toBe('phase196_closeout_integrity_remote_truth_gate_v1');
    expect(contract.requiredGatesInOrder).toContain('remote_main_verified');
    expect(contract.requiredGatesInOrder).toContain('remote_tag_verified');
    expect(contract.blockedInvariants).toContain('wrong_phase_handoff_identity_must_block');
  });

  it('contains Phase197 readiness fixtures for failed and valid closeout paths', () => {
    const fixtures = JSON.parse(fs.readFileSync(fixturesPath, 'utf8'));
    const names = fixtures.cases.map((c: { name: string }) => c.name);
    expect(names).toContain('valid_all_gates_pass');
    expect(names).toContain('block_verifier_failure');
    expect(names).toContain('block_qa_failure');
    expect(names).toContain('block_remote_main_mismatch');
    expect(names).toContain('block_remote_tag_mismatch');
    expect(names).toContain('block_wrong_phase_handoff');
  });
});
