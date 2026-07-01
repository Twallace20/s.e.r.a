import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("AutoOps R154 Phase 136 progressive bridge evidence", () => {
  const repoRoot = process.cwd();
  const bridgePath = path.join(repoRoot, "scripts", "chatgpt-bridge-submit-download.mjs");
  const bridge = fs.readFileSync(bridgePath, "utf8");

  it("records bridge progress before download wait failures", () => {
    expect(bridge).toContain("const checkpoint = (evidence, status");
    expect(bridge).toContain("DOWNLOAD_BEHAVIOR_SET");
    expect(bridge).toContain("PREEXISTING_ARTIFACT_CHECKED");
    expect(bridge).toContain("PROMPT_INSERTED");
    expect(bridge).toContain("PROMPT_SENT_WAITING_FOR_ZIP_CANDIDATE");
    expect(bridge).toContain("ZIP_CANDIDATE_FOUND");
    expect(bridge).toContain("ZIP_CANDIDATE_CLICKED_WAITING_FOR_DOWNLOAD");
    expect(bridge).toContain("failedAfterStage");
  });
});
