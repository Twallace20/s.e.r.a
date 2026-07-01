import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(__dirname, "../..");
const scriptPath = path.join(repoRoot, "scripts", "autoops-r147-bridge-prompt-expected-zip-lease-handoff-guard-v1.ps1");
const manifestPath = path.join(repoRoot, ".overlay", "autoops_r147_bridge_prompt_expected_zip_lease_handoff_guard_v1.json");
const proofPath = path.join(repoRoot, ".sera-proof", "autoops_r147_bridge_prompt_expected_zip_lease_handoff_guard_v1.json");

describe("AutoOps R147 bridge prompt expected ZIP lease handoff guard", () => {
  it("ships the required overlay manifest and proof", () => {
    expect(fs.existsSync(manifestPath)).toBe(true);
    expect(fs.existsSync(proofPath)).toBe(true);
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    expect(manifest.phaseSlug).toBe("autoops_r147_bridge_prompt_expected_zip_lease_handoff_guard_v1");
    expect(manifest.safety.allowNewChatFallback).toBe(false);
    expect(manifest.safety.allowRandomRecentChatFallback).toBe(false);
  });

  it("makes the active command expected ZIP authoritative", () => {
    const text = fs.readFileSync(scriptPath, "utf8");
    expect(text).toContain("expectedZipFilename");
    expect(text).toContain("Bridge prompt expected ZIP mismatch");
    expect(text).toContain("New-CorrectedBridgePrompt");
  });

  it("creates a generation lease from the bridge prompt handoff", () => {
    const text = fs.readFileSync(scriptPath, "utf8");
    expect(text).toContain("generation-lease.json");
    expect(text).toContain("Ensure-GenerationLease");
    expect(text).toContain("expectedZipName");
    expect(text).toContain("promptFile");
  });

  it("wraps the ChatGPT Artifact Watcher while preserving the original action", () => {
    const text = fs.readFileSync(scriptPath, "utf8");
    expect(text).toContain("SERA ChatGPT Artifact Watcher");
    expect(text).toContain("original-SERA_ChatGPT_Artifact_Watcher-action.json");
    expect(text).toContain("SERA_ChatGPT_Artifact_Watcher_R147_Guard.vbs");
  });

  it("preserves browser safety gates", () => {
    const text = fs.readFileSync(scriptPath, "utf8");
    expect(text).toContain("allowRandomRecentChatFallback = $false");
    expect(text).toContain("allowNewChatFallback = $false");
    expect(text).toContain("savedChatGptTargetOnly = $true");
  });
});
