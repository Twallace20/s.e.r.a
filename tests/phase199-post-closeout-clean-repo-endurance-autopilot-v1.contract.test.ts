import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("phase199 clean repo endurance autopilot contract", () => {
  const root = process.cwd();
  it("ships the Phase199 verifier, QA, fixture, clean-repo proof, and contract", () => {
    for (const rel of [
      "scripts/verify-phase199-post-closeout-clean-repo-endurance-autopilot-v1.ps1",
      "scripts/qa-phase199-post-closeout-clean-repo-endurance-autopilot-v1.ps1",
      "scripts/phase199-post-closeout-clean-repo-endurance-autopilot-fixtures-v1.ps1",
      "scripts/sera-phase199-current-phase-pointer-clean-repo-proof-v1.ps1",
      "scripts/sera-post-closeout-clean-repo-endurance-autopilot-v1.ps1",
      "tests/fixtures/phase199-clean-repo-endurance/cases.json"
    ]) {
      expect(fs.existsSync(path.join(root, rel))).toBe(true);
    }
  });

  it("requires clean git status and browser-submit hotfix baseline before CLOSED_CLEANLY", () => {
    const contract = JSON.parse(fs.readFileSync(path.join(root, "scripts/phase199-post-closeout-clean-repo-endurance-autopilot-v1.contract.json"), "utf8"));
    expect(contract.requires).toContain("post-closeout clean git status");
    expect(contract.requires).toContain("browser-submit hotfix baseline");
    expect(contract.forbids).toContain("CLOSED_CLEANLY with dirty pointer files");
  });
});
