import { spawnSync } from "node:child_process";
import { ArtifactStore } from "@sera/artifacts";
import { SafetyPolicy } from "@sera/safety";
import { isoNow, SeraToolEvent } from "@sera/shared";

export class ShellTool {
  constructor(
    private readonly runId: string,
    private readonly safety: SafetyPolicy,
    private readonly artifacts: ArtifactStore
  ) {}

  run(command: string, args: string[], cwd: string): { ok: boolean; exitCode?: number; stdout: string; stderr: string; message: string } {
    const decision = this.safety.canRunCommand(command);
    this.artifacts.appendJsonl("safety-events.jsonl", this.safety.toSafetyEvent(this.runId, decision));

    if (decision.decision !== "allow") {
      const event: SeraToolEvent = {
        ts: isoNow(),
        runId: this.runId,
        tool: "ShellTool",
        action: "run",
        ok: false,
        message: decision.reason,
        target: command,
        metadata: { args }
      };
      this.artifacts.appendJsonl("tool-events.jsonl", event);
      return { ok: false, stdout: "", stderr: "", message: decision.reason };
    }

    const res = spawnSync(command, args, {
      cwd,
      encoding: "utf8",
      shell: false,
      timeout: 30_000,
      windowsHide: true
    });
    const exitCode = typeof res.status === "number" ? res.status : 1;
    const stdout = this.safety.redact(res.stdout ?? "");
    const stderr = this.safety.redact(res.stderr ?? "");
    const ok = exitCode === 0;
    const event: SeraToolEvent = {
      ts: isoNow(),
      runId: this.runId,
      tool: "ShellTool",
      action: "run",
      ok,
      message: ok ? "Command completed." : "Command failed.",
      target: command,
      metadata: { args, exitCode }
    };
    this.artifacts.appendJsonl("tool-events.jsonl", event);
    return { ok, exitCode, stdout, stderr, message: event.message };
  }
}
