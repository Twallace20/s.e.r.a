import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("AutoOps R155 Phase 136 null preexisting candidate fix", () => {
  const repoRoot = process.cwd();
  const bridgePath = path.join(repoRoot, "scripts", "chatgpt-bridge-submit-download.mjs");
  const bridge = fs.readFileSync(bridgePath, "utf8");

  it("normalizes missing preexisting artifact candidates before reading fields", () => {
    expect(bridge).toContain("preexistingCandidateRaw");
    expect(bridge).toContain("preexistingCandidateRaw || { candidate: null, candidates: [], snapshot: null }");
    expect(bridge).toContain("evidence.preexistingCandidate = preexistingCandidate.candidate || null");
  });

  it("keeps dry-run checkpoints out of execute success paths", () => {
    const dryRunCheckpoint = 'checkpoint(evidence, "DRY_RUN_PASS", { stage: "dry_run_pass" });';
    const count = bridge.split(dryRunCheckpoint).length - 1;
    expect(count).toBe(1);
    expect(bridge).toContain("EXECUTE_PASS_EXISTING_ARTIFACT");
    expect(bridge).toContain("EXECUTE_PASS");
  });
});
