import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const scriptPath = path.join(root, "scripts", "autoops-r150-submission-request-download-proof-guard-v1.ps1");
const manifestPath = path.join(root, ".overlay", "autoops_r150_submission_request_download_proof_guard_v1.json");

describe("AutoOps R150 submission request download proof guard", () => {
  it("includes the overlay manifest", () => {
    expect(fs.existsSync(manifestPath)).toBe(true);
  });

  it("writes artifact watch requests before raw watcher launch", () => {
    const script = fs.readFileSync(scriptPath, "utf8");
    expect(script).toContain("artifact-watch-request.json");
    expect(script).toContain("Write-ArtifactWatchRequest");
  });

  it("launches the raw saved watcher behind an exactly-once lock", () => {
    const script = fs.readFileSync(scriptPath, "utf8");
    expect(script).toContain("prompt-submission-lock-r150.json");
    expect(script).toContain("Invoke-RawWatcherOnce");
    expect(script).toContain("R145RawOriginalActionJson");
  });

  it("routes only the exact expected ZIP with proof", () => {
    const script = fs.readFileSync(scriptPath, "utf8");
    expect(script).toContain("Find-ExpectedZip");
    expect(script).toContain("Route-ExpectedZip");
    expect(script).toContain("autoops-r150-exact-zip-routed");
  });

  it("preserves saved-target-only fallback boundaries", () => {
    const script = fs.readFileSync(scriptPath, "utf8");
    expect(script).toContain("allowRandomRecentChatFallback = $false");
    expect(script).toContain("allowNewChatFallback = $false");
    expect(script).toContain("savedChatGptTargetOnly");
  });
});
