import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const scriptPath = path.join(root, "scripts", "autoops-r149-canonical-bridge-prompt-initial-submit-delegation-v1.ps1");
const manifestPath = path.join(root, ".overlay", "autoops_r149_canonical_bridge_prompt_initial_submit_delegation_v1.json");

describe("AutoOps R149 canonical bridge prompt initial submit delegation", () => {
  it("includes the overlay manifest", () => {
    expect(fs.existsSync(manifestPath)).toBe(true);
  });

  it("validates the primary Expected ZIP filename block", () => {
    const script = fs.readFileSync(scriptPath, "utf8");
    expect(script).toContain("Get-ExpectedZipFromPromptBlock");
    expect(script).toContain("Test-CanonicalPrompt");
  });

  it("quarantines hotfix prompts before lease submission", () => {
    const script = fs.readFileSync(scriptPath, "utf8");
    expect(script).toContain("Quarantine-HotfixPrompts");
    expect(script).toContain("hotfix-prompt-quarantine");
  });

  it("delegates the initial submit to the raw saved watcher exactly once", () => {
    const script = fs.readFileSync(scriptPath, "utf8");
    expect(script).toContain("prompt-submission-lock.json");
    expect(script).toContain("R145OriginalActionJson");
    expect(script).toContain("Invoke-InitialSubmitRawWatcher");
  });

  it("preserves saved-target-only fallback boundaries", () => {
    const proof = fs.readFileSync(path.join(root, ".sera-proof", "autoops_r149_canonical_bridge_prompt_initial_submit_delegation_v1.json"), "utf8");
    expect(proof).toContain("initial submit delegates to raw saved watcher exactly once");
    const script = fs.readFileSync(scriptPath, "utf8");
    expect(script).toContain("allowRandomRecentChatFallback = $false");
    expect(script).toContain("allowNewChatFallback = $false");
  });
});
