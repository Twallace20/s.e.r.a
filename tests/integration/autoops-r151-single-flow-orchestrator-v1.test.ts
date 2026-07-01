import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const scriptPath = path.join(root, "scripts", "autoops-r151-single-flow-orchestrator-v1.ps1");
const manifestPath = path.join(root, ".overlay", "autoops_r151_single_flow_orchestrator_v1.json");

describe("AutoOps R151 single flow orchestrator", () => {
  it("includes the overlay manifest", () => {
    expect(fs.existsSync(manifestPath)).toBe(true);
  });

  it("creates a single flow runner instead of another scheduled task dependency", () => {
    const script = fs.readFileSync(scriptPath, "utf8");
    expect(script).toContain("single-flow-orchestrator");
    expect(script).not.toContain("Start-ScheduledTask");
  });

  it("requires browser execution proof before claiming submission", () => {
    const script = fs.readFileSync(scriptPath, "utf8");
    expect(script).toContain("SERA_CHATGPT_BRIDGE_ALLOW_EXECUTE");
    expect(script).toContain("localhost:9222");
    expect(script).toContain("Test-ExecutionGate");
  });

  it("writes request and lease artifacts in one controlled run", () => {
    const script = fs.readFileSync(scriptPath, "utf8");
    expect(script).toContain("artifact-watch-request.json");
    expect(script).toContain("generation-lease.json");
    expect(script).toContain("Write-RequestAndLease");
  });

  it("blocks honestly if download or handoff proof is missing", () => {
    const script = fs.readFileSync(scriptPath, "utf8");
    expect(script).toContain("Write-BlockedHandoff");
    expect(script).toContain("Wait-ForZipAndRoute");
    expect(script).toContain("Wait-ForPhaseHandoff");
  });
});
