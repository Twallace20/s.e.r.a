import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(__dirname, "../..");
const scriptPath = path.join(repoRoot, "scripts", "autoops-r146-phone-command-intake-handoff-stale-running-guard-v1.ps1");
const manifestPath = path.join(repoRoot, ".overlay", "autoops_r146_phone_command_intake_handoff_stale_running_guard_v1.json");
const proofPath = path.join(repoRoot, ".sera-proof", "autoops_r146_phone_command_intake_handoff_stale_running_guard_v1.json");

describe("AutoOps R146 phone command intake handoff stale running guard", () => {
  it("ships the required overlay manifest and proof", () => {
    expect(fs.existsSync(manifestPath)).toBe(true);
    expect(fs.existsSync(proofPath)).toBe(true);
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    expect(manifest.phaseSlug).toBe("autoops_r146_phone_command_intake_handoff_stale_running_guard_v1");
    expect(manifest.safety.allowNewChatFallback).toBe(false);
    expect(manifest.safety.allowRandomRecentChatFallback).toBe(false);
  });

  it("requires stable command intake by size and hash", () => {
    const text = fs.readFileSync(scriptPath, "utf8");
    expect(text).toContain("Test-StableFile");
    expect(text).toContain("size_and_hash_stable");
    expect(text).toContain("file_not_readable_or_not_local");
  });

  it("detects stale running commands without progress", () => {
    const text = fs.readFileSync(scriptPath, "utf8");
    expect(text).toContain("staleRunning");
    expect(text).toContain("Accepted command is stuck in running state");
    expect(text).toContain("generationLeasePresent");
  });

  it("wraps SERA Phone Control Watcher while preserving the original action", () => {
    const text = fs.readFileSync(scriptPath, "utf8");
    expect(text).toContain("SERA Phone Control Watcher");
    expect(text).toContain("original-SERA_Phone_Control_Watcher-action.json");
    expect(text).toContain("SERA_Phone_Control_Watcher_R146_Guard.vbs");
  });

  it("preserves core safety gates", () => {
    const text = fs.readFileSync(scriptPath, "utf8");
    expect(text).toContain("allowRandomRecentChatFallback = $false");
    expect(text).toContain("allowNewChatFallback = $false");
    expect(text).toContain("savedChatGptTargetOnly = $true");
  });
});
