import { describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  createDefaultRemotePhaseRunnerBlueprintV1,
  inspectRemotePhaseRunnerBlueprintV1,
} from "../../scripts/lib/remote-phase-runner-blueprint-v1.mjs";

function createTempRoot() {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-phase35-"));
  for (const declaredPath of createDefaultRemotePhaseRunnerBlueprintV1().declaredPaths) {
    const fullPath = path.join(rootDir, declaredPath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, "phase35 fixture\n", "utf8");
  }
  return rootDir;
}

describe("Phase 35 Remote Phase Runner Blueprint v1", () => {
  it("passes the default Phase 35 remote runner blueprint", () => {
    const rootDir = createTempRoot();
    const result = inspectRemotePhaseRunnerBlueprintV1(createDefaultRemotePhaseRunnerBlueprintV1(), { rootDir });

    expect(result.ok).toBe(true);
    expect(result.status).toBe("passed");
    expect(result.blueprintStatus).toBe("ready");
    expect(result.validationFailedCount).toBe(0);
    expect(result.blockers).toEqual([]);
    expect(result.declaredFileCount).toBe(4);
    expect(result.validationCommandCount).toBe(7);
    expect(result.runnerStageCount).toBeGreaterThanOrEqual(10);
    expect(result.evidenceRequirementCount).toBeGreaterThanOrEqual(12);
    expect(result.riskCheckCount).toBeGreaterThanOrEqual(10);
    expect(result.ownerApprovalGateCount).toBeGreaterThanOrEqual(5);
  });

  it("writes local blueprint reports while keeping remote execution disabled", () => {
    const rootDir = createTempRoot();
    const result = inspectRemotePhaseRunnerBlueprintV1(createDefaultRemotePhaseRunnerBlueprintV1(), { rootDir });

    expect(fs.existsSync(result.jsonPath)).toBe(true);
    expect(fs.existsSync(result.markdownPath)).toBe(true);
    expect(fs.existsSync(result.historyPath)).toBe(true);
    expect(result.localOnly).toBe(true);
    expect(result.blueprintOnly).toBe(true);
    expect(result.remoteExecutionAllowed).toBe(false);
    expect(result.usesCloudRunner).toBe(false);
    expect(result.usesSelfHostedRunner).toBe(false);
    expect(result.requiresSecrets).toBe(false);
  });

  it("blocks blueprints that try to enable remote execution or self-approval", () => {
    const rootDir = createTempRoot();
    const blueprint = {
      ...createDefaultRemotePhaseRunnerBlueprintV1(),
      remoteExecutionAllowed: true,
      executesRemoteCommands: true,
      selfApprovesPlan: true,
    };
    const result = inspectRemotePhaseRunnerBlueprintV1(blueprint, { rootDir });

    expect(result.ok).toBe(false);
    expect(result.status).toBe("blocked");
    expect(result.blueprintStatus).toBe("blocked");
    expect(result.blockers.join(" ")).toContain("remoteExecutionAllowed must remain false");
    expect(result.blockers.join(" ")).toContain("executesRemoteCommands must remain false");
    expect(result.blockers.join(" ")).toContain("selfApprovesPlan must remain false");
  });

  it("blocks blueprints without emergency stop and session lock requirements", () => {
    const rootDir = createTempRoot();
    const blueprint = {
      ...createDefaultRemotePhaseRunnerBlueprintV1(),
      emergencyStopRequired: false,
      sessionLockRequired: false,
      runnerStages: ["owner approval intake", "validation command sequence"],
    };
    const result = inspectRemotePhaseRunnerBlueprintV1(blueprint, { rootDir });

    expect(result.ok).toBe(false);
    expect(result.blockers.join(" ")).toContain("emergencyStopRequired must remain true");
    expect(result.blockers.join(" ")).toContain("sessionLockRequired must remain true");
    expect(result.blockers.join(" ")).toContain("emergency stop path");
    expect(result.blockers.join(" ")).toContain("session lock boundary");
  });

  it("blocks incomplete validation command sets and unsafe paths", () => {
    const rootDir = createTempRoot();
    const blueprint = {
      ...createDefaultRemotePhaseRunnerBlueprintV1(),
      declaredPaths: [
        ...createDefaultRemotePhaseRunnerBlueprintV1().declaredPaths,
        "../outside.txt",
      ],
      validationCommands: ["npm run phase35:demo"],
    };
    const result = inspectRemotePhaseRunnerBlueprintV1(blueprint, { rootDir });

    expect(result.ok).toBe(false);
    expect(result.validationFailedCount).toBeGreaterThan(0);
    expect(result.blockers.join(" ")).toContain("safe and relative");
    expect(result.blockers.join(" ")).toContain("npm run verify");
  });
});
