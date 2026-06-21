import { describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  createDefaultSelfHostedRunnerAdapterV1,
  inspectSelfHostedRunnerAdapterV1,
} from "../../scripts/lib/self-hosted-runner-adapter-v1.mjs";

function createTempRoot() {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-phase37-"));
  for (const declaredPath of createDefaultSelfHostedRunnerAdapterV1().declaredPaths) {
    const fullPath = path.join(rootDir, declaredPath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, "phase37 fixture\n", "utf8");
  }
  return rootDir;
}

describe("Phase 37 Self-Hosted Runner Adapter v1", () => {
  it("passes the default Phase 37 self-hosted runner adapter contract", () => {
    const rootDir = createTempRoot();
    const result = inspectSelfHostedRunnerAdapterV1(createDefaultSelfHostedRunnerAdapterV1(), { rootDir });

    expect(result.ok).toBe(true);
    expect(result.status).toBe("passed");
    expect(result.adapterStatus).toBe("ready");
    expect(result.validationFailedCount).toBe(0);
    expect(result.blockers).toEqual([]);
    expect(result.declaredFileCount).toBe(4);
    expect(result.validationCommandCount).toBe(7);
    expect(result.adapterStageCount).toBeGreaterThanOrEqual(8);
    expect(result.evidenceRequirementCount).toBeGreaterThanOrEqual(12);
    expect(result.riskCheckCount).toBeGreaterThanOrEqual(12);
    expect(result.ownerApprovalGateCount).toBeGreaterThanOrEqual(6);
  });

  it("writes local adapter reports while keeping runner connectivity disabled", () => {
    const rootDir = createTempRoot();
    const result = inspectSelfHostedRunnerAdapterV1(createDefaultSelfHostedRunnerAdapterV1(), { rootDir });

    expect(fs.existsSync(result.jsonPath)).toBe(true);
    expect(fs.existsSync(result.markdownPath)).toBe(true);
    expect(fs.existsSync(result.historyPath)).toBe(true);
    expect(result.localOnly).toBe(true);
    expect(result.adapterOnly).toBe(true);
    expect(result.adapterContractOnly).toBe(true);
    expect(result.adapterEnabled).toBe(false);
    expect(result.runnerConnectivityAllowed).toBe(false);
    expect(result.commandExecutionAllowed).toBe(false);
    expect(result.usesSelfHostedRunner).toBe(false);
    expect(result.selfHostedRunnerActivated).toBe(false);
    expect(result.requiresSecrets).toBe(false);
  });

  it("blocks adapters that try to enable runner connectivity or command execution", () => {
    const rootDir = createTempRoot();
    const adapter = {
      ...createDefaultSelfHostedRunnerAdapterV1(),
      adapterEnabled: true,
      adapterActivationAllowed: true,
      runnerConnectivityAllowed: true,
      commandExecutionAllowed: true,
      usesSelfHostedRunner: true,
      selfHostedRunnerActivated: true,
      executesRemoteCommands: true,
    };
    const result = inspectSelfHostedRunnerAdapterV1(adapter, { rootDir });

    expect(result.ok).toBe(false);
    expect(result.status).toBe("blocked");
    expect(result.adapterStatus).toBe("blocked");
    expect(result.blockers.join(" ")).toContain("adapterEnabled must remain false");
    expect(result.blockers.join(" ")).toContain("runnerConnectivityAllowed must remain false");
    expect(result.blockers.join(" ")).toContain("commandExecutionAllowed must remain false");
    expect(result.blockers.join(" ")).toContain("usesSelfHostedRunner must remain false");
  });

  it("blocks adapters missing approval queue lineage or required bindings", () => {
    const rootDir = createTempRoot();
    const adapter = {
      ...createDefaultSelfHostedRunnerAdapterV1(),
      sourcePhaseIds: ["phase-35-remote-phase-runner-blueprint-v1"],
      approvalQueueBindingRequired: false,
      emergencyStopRequired: false,
      sessionLockRequired: false,
      commandAllowlistRequired: false,
    };
    const result = inspectSelfHostedRunnerAdapterV1(adapter, { rootDir });

    expect(result.ok).toBe(false);
    expect(result.blockers.join(" ")).toContain("Phase 36 owner approval queue lineage");
    expect(result.blockers.join(" ")).toContain("approvalQueueBindingRequired must remain true");
    expect(result.blockers.join(" ")).toContain("emergencyStopRequired must remain true");
    expect(result.blockers.join(" ")).toContain("sessionLockRequired must remain true");
    expect(result.blockers.join(" ")).toContain("commandAllowlistRequired must remain true");
  });

  it("blocks incomplete validation command sets and unsafe paths", () => {
    const rootDir = createTempRoot();
    const adapter = {
      ...createDefaultSelfHostedRunnerAdapterV1(),
      declaredPaths: [
        ...createDefaultSelfHostedRunnerAdapterV1().declaredPaths,
        "../outside.txt",
      ],
      validationCommands: ["npm run phase37:demo"],
    };
    const result = inspectSelfHostedRunnerAdapterV1(adapter, { rootDir });

    expect(result.ok).toBe(false);
    expect(result.validationFailedCount).toBeGreaterThan(0);
    expect(result.blockers.join(" ")).toContain("safe and relative");
    expect(result.blockers.join(" ")).toContain("npm run verify");
  });
});
