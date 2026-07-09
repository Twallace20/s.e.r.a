import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  assertNoPreseed,
  assertPhase195Contract,
  assertSavedChatGptConversationUrl,
  buildCommandPayload,
  readSavedChatGptTarget,
  snapshotDownloadDir,
  verifyExactZip,
} from "../src/chatgpt/phase195FullAutopilotColdRun";

const command = {
  commandId: "phase195-full-autopilot-cold-run-v1-fresh-url-20260709065602",
  runNonce: "phase195-fresh-url-cold-run-20260709065602",
  phaseSlug: "phase195_full_autopilot_cold_run_v1",
  expectedZipFilename: "s.e.r.a_phase195_full_autopilot_cold_run_v1_overlay.zip",
  savedChatGptTargetOnly: true,
  allowRandomRecentChatFallback: false,
  allowNewChatFallback: false,
};

describe("Phase 195 full autopilot cold-run contract", () => {
  it("accepts only the exact command contract", () => {
    expect(() => assertPhase195Contract(command)).not.toThrow();
    expect(() => assertPhase195Contract({ ...command, allowNewChatFallback: true })).toThrow(/contract mismatch/i);
    expect(() => assertPhase195Contract({ ...command, allowRandomRecentChatFallback: true })).toThrow(/contract mismatch/i);
    expect(() => assertPhase195Contract({ ...command, savedChatGptTargetOnly: false })).toThrow(/contract mismatch/i);
  });

  it("requires an existing saved ChatGPT conversation URL", () => {
    expect(() => assertSavedChatGptConversationUrl("https://chatgpt.com/c/abc123")).not.toThrow();
    expect(() => assertSavedChatGptConversationUrl("https://chat.openai.com/c/abc123")).not.toThrow();
    expect(() => assertSavedChatGptConversationUrl("https://chatgpt.com/")).toThrow(/existing conversation/i);
    expect(() => assertSavedChatGptConversationUrl("https://example.com/c/abc123")).toThrow(/host is not allowed/i);
  });

  it("reads a saved URL file and blocks empty target files", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-phase195-target-"));
    const good = path.join(dir, "saved-chatgpt-target.json");
    const bad = path.join(dir, "bad.json");
    fs.writeFileSync(good, JSON.stringify({ url: "https://chatgpt.com/c/fresh-sera-target" }));
    fs.writeFileSync(bad, JSON.stringify({ url: "https://chatgpt.com/" }));
    expect(readSavedChatGptTarget(good).url).toContain("/c/fresh-sera-target");
    expect(() => readSavedChatGptTarget(bad)).toThrow(/existing conversation/i);
  });

  it("detects preseeded expected ZIP files before a cold run", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-phase195-downloads-"));
    const snapshot = snapshotDownloadDir(dir, command.expectedZipFilename);
    expect(() => assertNoPreseed(snapshot)).not.toThrow();
    fs.writeFileSync(path.join(dir, command.expectedZipFilename), "preseed");
    const preseeded = snapshotDownloadDir(dir, command.expectedZipFilename);
    expect(() => assertNoPreseed(preseeded)).toThrow(/cold-run violation/i);
  });

  it("verifies exact ZIP filename and computes sha256", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-phase195-verify-"));
    const zipPath = path.join(dir, command.expectedZipFilename);
    fs.writeFileSync(zipPath, "phase195 zip bytes");
    const verified = verifyExactZip(dir, command.expectedZipFilename);
    expect(verified.zipPath).toBe(zipPath);
    expect(verified.sha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it("builds the command payload from the command JSON only", () => {
    const payload = buildCommandPayload(command);
    expect(payload).toContain(command.commandId);
    expect(payload).toContain(command.expectedZipFilename);
    expect(payload).toContain('"allowNewChatFallback": false');
  });
});
