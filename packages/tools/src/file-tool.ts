import fs from "node:fs";
import path from "node:path";
import { ArtifactStore } from "@sera/artifacts";
import { SafetyPolicy } from "@sera/safety";
import { isoNow, SeraToolEvent } from "@sera/shared";

export class FileTool {
  constructor(
    private readonly runId: string,
    private readonly safety: SafetyPolicy,
    private readonly artifacts: ArtifactStore
  ) {}

  writeText(targetPath: string, content: string): { ok: boolean; path?: string; message: string } {
    const resolved = path.resolve(targetPath);
    const decision = this.safety.canWritePath(resolved);
    this.artifacts.appendJsonl("safety-events.jsonl", this.safety.toSafetyEvent(this.runId, decision));

    if (decision.decision !== "allow") {
      const event: SeraToolEvent = {
        ts: isoNow(),
        runId: this.runId,
        tool: "FileTool",
        action: "writeText",
        ok: false,
        message: decision.reason,
        target: resolved
      };
      this.artifacts.appendJsonl("tool-events.jsonl", event);
      return { ok: false, message: decision.reason };
    }

    fs.mkdirSync(path.dirname(resolved), { recursive: true });
    fs.writeFileSync(resolved, this.safety.redact(content), "utf8");
    const event: SeraToolEvent = {
      ts: isoNow(),
      runId: this.runId,
      tool: "FileTool",
      action: "writeText",
      ok: true,
      message: "File written inside workspace.",
      target: resolved
    };
    this.artifacts.appendJsonl("tool-events.jsonl", event);
    return { ok: true, path: resolved, message: "File written." };
  }

  readText(targetPath: string): string {
    return fs.readFileSync(path.resolve(targetPath), "utf8");
  }
}
