import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("AutoOps R157 Phase 136 exact ChatGPT artifact button click", () => {
  const repoRoot = process.cwd();
  const bridgePath = path.join(repoRoot, "scripts", "chatgpt-bridge-submit-download.mjs");
  const bridge = fs.readFileSync(bridgePath, "utf8");

  it("prioritizes exact visible ChatGPT artifact buttons", () => {
    expect(bridge).toContain("directExactClickables");
    expect(bridge).toContain("exactArtifactButton");
    expect(bridge).toContain('source === "exactArtifactButton"');
    expect(bridge).toContain("score += 500");
  });

  it("waits for exact artifact candidates when an expected ZIP is supplied", () => {
    expect(bridge).toContain("last.candidate.mentionsExactArtifact || last.candidate.mentionsExpected || last.candidate.mentionsStandardLink");
    expect(bridge).toContain("requireExactArtifact");
    expect(bridge).toContain("mentionsExactArtifact");
  });
});
