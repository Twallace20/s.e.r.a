import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { SeraKernel } from "@sera/kernel";
import { ArtifactStore } from "@sera/artifacts";
import { SafetyPolicy } from "@sera/safety";
import { FileTool, ShellTool } from "@sera/tools";

function tmpRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "sera-test-"));
}

describe("S.E.R.A. secure base", () => {
  it("runs a deterministic hello task and writes evidence artifacts", () => {
    const root = tmpRoot();
    const kernel = new SeraKernel({ rootDir: root });
    const result = kernel.runTask("create hello file");

    expect(result.ok).toBe(true);
    expect(result.status).toBe("completed_with_changes");
    expect(fs.existsSync(path.join(result.run.workspaceDir, "hello.txt"))).toBe(true);
    expect(fs.existsSync(path.join(result.run.runDir, "task.json"))).toBe(true);
    expect(fs.existsSync(path.join(result.run.runDir, "plan.json"))).toBe(true);
    expect(fs.existsSync(path.join(result.run.runDir, "tool-events.jsonl"))).toBe(true);
    expect(fs.existsSync(path.join(result.run.runDir, "safety-events.jsonl"))).toBe(true);
    expect(fs.existsSync(path.join(result.run.runDir, "final-report.md"))).toBe(true);
  });

  it("blocks file writes outside the active workspace", () => {
    const root = tmpRoot();
    const runDir = path.join(root, ".sera-runs", "run_test");
    const workspaceDir = path.join(runDir, "workspace");
    fs.mkdirSync(workspaceDir, { recursive: true });
    const artifacts = new ArtifactStore(runDir);
    const safety = new SafetyPolicy({ workspaceDir });
    const fileTool = new FileTool("run_test", safety, artifacts);

    const outsidePath = path.join(root, "outside.txt");
    const result = fileTool.writeText(outsidePath, "should not write");

    expect(result.ok).toBe(false);
    expect(fs.existsSync(outsidePath)).toBe(false);
  });

  it("blocks non-allowlisted shell commands", () => {
    const root = tmpRoot();
    const runDir = path.join(root, ".sera-runs", "run_shell");
    const workspaceDir = path.join(runDir, "workspace");
    fs.mkdirSync(workspaceDir, { recursive: true });
    const artifacts = new ArtifactStore(runDir);
    const safety = new SafetyPolicy({ workspaceDir, allowedCommands: ["node"] });
    const shell = new ShellTool("run_shell", safety, artifacts);

    const result = shell.run("git", ["status"], workspaceDir);
    expect(result.ok).toBe(false);
    expect(result.message).toContain("not in the allowlist");
  });

  it("redacts obvious secrets from artifacts", () => {
    const root = tmpRoot();
    const runDir = path.join(root, ".sera-runs", "run_redact");
    const workspaceDir = path.join(runDir, "workspace");
    fs.mkdirSync(workspaceDir, { recursive: true });
    const artifacts = new ArtifactStore(runDir);
    const safety = new SafetyPolicy({ workspaceDir });
    const fileTool = new FileTool("run_redact", safety, artifacts);

    const target = path.join(workspaceDir, "secret.txt");
    const result = fileTool.writeText(target, "api_key=sk-1234567890abcdef1234567890abcdef");
    expect(result.ok).toBe(true);
    const text = fs.readFileSync(target, "utf8");
    expect(text).toContain("[REDACTED]");
    expect(text).not.toContain("sk-1234567890abcdef");
  });
});
