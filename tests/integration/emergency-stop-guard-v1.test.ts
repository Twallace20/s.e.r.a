import { describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  createDefaultEmergencyStopGuardV1,
  inspectEmergencyStopGuardV1,
} from "../../scripts/lib/emergency-stop-guard-v1.mjs";

function createTempRoot() {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-phase44-"));
  for (const declaredPath of createDefaultEmergencyStopGuardV1().declaredPaths) {
    const fullPath = path.join(rootDir, declaredPath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, "phase44 fixture\n", "utf8");
  }
  return rootDir;
}

describe("Phase 44 Emergency Stop Guard v1", () => {
  it("passes the default Phase 44 emergency stop guard", () => {
    const rootDir = createTempRoot();
    const result = inspectEmergencyStopGuardV1(createDefaultEmergencyStopGuardV1(), { rootDir });

    expect(result.ok).toBe(true);
    expect(result.status).toBe("passed");
    expect(result.emergencyStopGuardStatus).toBe("ready");
    expect(result.validationFailedCount).toBe(0);
    expect(result.blockers).toEqual([]);
    expect(result.declaredFileCount).toBe(4);
    expect(result.validationCommandCount).toBe(7);
    expect(result.stopStepCount).toBeGreaterThanOrEqual(10);
    expect(result.safeStopStepCount).toBe(result.stopStepCount);
    expect(result.unsafeStopStepCount).toBe(0);
    expect(result.evidenceRequirementCount).toBeGreaterThanOrEqual(12);
    expect(result.riskCheckCount).toBeGreaterThanOrEqual(12);
    expect(result.ownerApprovalGateCount).toBeGreaterThanOrEqual(8);
    expect(result.localOnly).toBe(true);
    expect(result.emergencyStopGuardOnly).toBe(true);
    expect(result.planningOnly).toBe(true);
    expect(result.dryRunOnly).toBe(true);
    expect(result.emergencyStopRequired).toBe(true);
    expect(result.emergencyStopMustBlock).toBe(true);
    expect(result.emergencyStopReleaseRequiresOwner).toBe(true);
    expect(result.sessionLockGuardBindingRequired).toBe(true);
    expect(result.emergencyStopCanAuthorizeExecution).toBe(false);
    expect(result.emergencyStopActivationAllowed).toBe(false);
    expect(result.emergencyStopReleaseAllowed).toBe(false);
    expect(result.executionAllowedAfterApproval).toBe(false);
    expect(result.commandExecutionAllowed).toBe(false);
    expect(result.remoteExecutionAllowed).toBe(false);
    expect(result.runnerConnectivityAllowed).toBe(false);
    expect(result.requiresSecrets).toBe(false);
    expect(result.mutatesSource).toBe(false);
    expect(result.recordsOwnerDecision).toBe(false);
    expect(result.selfApprovesPlan).toBe(false);
    expect(result.selfApprovalAllowed).toBe(false);
  });

  it("writes local emergency stop reports without activating execution", () => {
    const rootDir = createTempRoot();
    const result = inspectEmergencyStopGuardV1(createDefaultEmergencyStopGuardV1(), { rootDir });

    expect(fs.existsSync(result.jsonPath)).toBe(true);
    expect(fs.existsSync(result.markdownPath)).toBe(true);
    expect(fs.existsSync(result.historyPath)).toBe(true);
    expect(result.jsonPath).toContain(".sera-emergency-stop-guard");
    expect(result.markdownPath).toContain(".sera-emergency-stop-guard");
    expect(result.emergencyStopCanAuthorizeExecution).toBe(false);
    expect(result.commandExecutionAllowed).toBe(false);
  });

  it("blocks unsafe stop steps that try to execute or bypass owner release", () => {
    const rootDir = createTempRoot();
    const guard = createDefaultEmergencyStopGuardV1();
    guard.stopSteps = [
      {
        ...guard.stopSteps[0],
        ownerReleaseRequired: false,
        stopSignalCheckRequired: false,
        stopStateLatchRequired: false,
        commandExecutionAllowed: true,
        mutatesSource: true,
        createsBranches: true,
        selfApproved: true,
      },
    ];
    const result = inspectEmergencyStopGuardV1(guard, { rootDir });

    expect(result.ok).toBe(false);
    expect(result.validationFailedCount).toBeGreaterThan(0);
    expect(result.unsafeStopStepCount).toBe(1);
    expect(result.blockers.join(" ")).toContain("owner release must be required");
    expect(result.blockers.join(" ")).toContain("stop signal check must be required");
    expect(result.blockers.join(" ")).toContain("command execution must remain disabled");
    expect(result.blockers.join(" ")).toContain("self approval must be blocked");
  });

  it("blocks boundaries that try to make emergency stop executable", () => {
    const rootDir = createTempRoot();
    const base = createDefaultEmergencyStopGuardV1();
    const guard = {
      ...base,
      boundaries: {
        ...base.boundaries,
        emergencyStopCanAuthorizeExecution: true,
        emergencyStopActivationAllowed: true,
        emergencyStopReleaseAllowed: true,
        commandExecutionAllowed: true,
        runnerConnectivityAllowed: true,
        mutatesSource: true,
        selfApprovalAllowed: true,
      },
    };
    const result = inspectEmergencyStopGuardV1(guard, { rootDir });

    expect(result.ok).toBe(false);
    expect(result.validationFailedCount).toBeGreaterThan(0);
    expect(result.emergencyStopCanAuthorizeExecution).toBe(true);
    expect(result.emergencyStopActivationAllowed).toBe(true);
    expect(result.emergencyStopReleaseAllowed).toBe(true);
    expect(result.commandExecutionAllowed).toBe(true);
    expect(result.runnerConnectivityAllowed).toBe(true);
    expect(result.mutatesSource).toBe(true);
    expect(result.selfApprovalAllowed).toBe(true);
    expect(result.blockers.join(" ")).toContain("emergencyStopCanAuthorizeExecution must remain false");
    expect(result.blockers.join(" ")).toContain("emergencyStopActivationAllowed must remain false");
    expect(result.blockers.join(" ")).toContain("emergencyStopReleaseAllowed must remain false");
    expect(result.blockers.join(" ")).toContain("commandExecutionAllowed must remain false");
    expect(result.blockers.join(" ")).toContain("runnerConnectivityAllowed must remain false");
    expect(result.blockers.join(" ")).toContain("mutatesSource must remain false");
    expect(result.blockers.join(" ")).toContain("selfApprovalAllowed must remain false");
  });

  it("blocks incomplete validation command sets and unsafe paths", () => {
    const rootDir = createTempRoot();
    const guard = {
      ...createDefaultEmergencyStopGuardV1(),
      declaredPaths: [
        ...createDefaultEmergencyStopGuardV1().declaredPaths,
        "../outside.txt",
      ],
      validationCommands: ["npm run phase44:demo"],
    };
    const result = inspectEmergencyStopGuardV1(guard, { rootDir });

    expect(result.ok).toBe(false);
    expect(result.validationFailedCount).toBeGreaterThan(0);
    expect(result.blockers.join(" ")).toContain("safe and relative");
    expect(result.blockers.join(" ")).toContain("npm run verify");
  });
});
