import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const scriptPath = path.join(root, "scripts", "autoops-r152-direct-bridge-invocation-heartbeat-v1.ps1");
const manifestPath = path.join(root, ".overlay", "autoops_r152_direct_bridge_invocation_heartbeat_v1.json");

describe("AutoOps R152 direct bridge invocation heartbeat", () => {
  it("includes the overlay manifest", () => {
    expect(fs.existsSync(manifestPath)).toBe(true);
  });

  it("does not depend on scheduled task launching", () => {
    const script = fs.readFileSync(scriptPath, "utf8");
    expect(script).not.toContain("Start-ScheduledTask");
    expect(script).toContain("direct-bridge-invocation");
  });

  it("invokes the resolved phase138 bridge wrapper with the current expected ZIP", () => {
    const script = fs.readFileSync(scriptPath, "utf8");
    expect(script).toContain("phase138-artifact-watcher-safe-wrapper.ps1");
    expect(script).toContain("DefaultExpectedZipFilename");
    expect(script).toContain("expectedZipFilename");
  });

  it("writes heartbeat and stage timeout proof", () => {
    const script = fs.readFileSync(scriptPath, "utf8");
    expect(script).toContain("Write-Heartbeat");
    expect(script).toContain("StageTimeoutMinutes");
  });

  it("blocks honestly when exact ZIP or handoff is missing", () => {
    const script = fs.readFileSync(scriptPath, "utf8");
    expect(script).toContain("zip_download_or_route_failed");
    expect(script).toContain("phase143_handoff_missing_after_route");
    expect(script).toContain("Write-BlockedHandoff");
  });
});
