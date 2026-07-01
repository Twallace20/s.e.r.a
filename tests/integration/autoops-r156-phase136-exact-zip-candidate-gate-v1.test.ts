import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("AutoOps R156 Phase 136 exact ZIP candidate gate", () => {
  const repoRoot = process.cwd();
  const bridgePath = path.join(repoRoot, "scripts", "chatgpt-bridge-submit-download.mjs");
  const bridge = fs.readFileSync(bridgePath, "utf8");

  it("requires exact artifact matching when an expected ZIP is supplied", () => {
    expect(bridge).toContain("requireExactArtifact");
    expect(bridge).toContain("mentionsExactArtifact");
    expect(bridge).toContain("if (requireExactArtifact && !mentionsExactArtifact) return;");
    expect(bridge).toContain("if (!requireExactArtifact && !mentionsExpected");
  });

  it("does not allow generic high-score download buttons as existing artifacts", () => {
    expect(bridge).toContain("candidate.mentionsExactArtifact || candidate.mentionsStandardLink || candidate.mentionsExpected");
    expect(bridge).not.toContain("candidate.score >= 180");
  });
});
