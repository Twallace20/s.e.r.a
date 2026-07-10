import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const repoRoot = process.cwd();
function read(rel: string): string { return fs.readFileSync(path.join(repoRoot, rel), 'utf8'); }
function exists(rel: string): boolean { return fs.existsSync(path.join(repoRoot, rel)); }

describe('Phase201 Autopilot Control Plane contract', () => {
  const contract = JSON.parse(read('scripts/phase-contracts/phase201.contract.json'));

  it('ships the shared contract and required deliverables', () => {
    expect(contract.phaseNumber).toBe(201);
    expect(contract.phaseSlug).toBe('phase201_autopilot_control_plane_capability_architecture_v1');
    for (const rel of contract.deliverables.requiredFiles) {
      expect(exists(rel)).toBe(true);
    }
  });

  it('exports required shared gate functions', () => {
    const moduleText = read('scripts/lib/SeraPhaseGate.psm1');
    for (const fn of contract.requiredFunctions) {
      expect(moduleText).toContain(`function ${fn}`);
    }
  });

  it('does not use Phase200-style parameter soup in phase201 gate scripts', () => {
    const scripts = [
      'scripts/verify-phase201-autopilot-control-plane-capability-architecture-v1.ps1',
      'scripts/qa-phase201-autopilot-control-plane-capability-architecture-v1.ps1',
      'scripts/sera-autopilot-control-plane-v1.ps1'
    ];
    const forbidden = contract.forbiddenParameterSuffixes.map((x: string) => `-${x}`);
    for (const rel of scripts) {
      const text = read(rel);
      for (const token of forbidden) {
        expect(text.includes(token), `${rel} contains ${token}`).toBe(false);
      }
      expect(text).toContain('SeraPhaseGate.psm1');
    }
  });

  it('documents required handoff diagnostics and pass evidence fields', () => {
    const doc = read('docs/autopilot/AUTOPILOT_FAILURE_HANDOFF_STANDARD_V1.md');
    for (const field of contract.handoffRequiredFields.blocked) expect(doc).toContain(field);
    for (const field of contract.handoffRequiredFields.pass) expect(doc).toContain(field.replace('ZipPath', 'ZIP path').replace('ZipSha256', 'ZIP SHA'));
  });
});
