import { describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  createDefaultSessionLockGuardV1,
  inspectSessionLockGuardV1,
} from "../../scripts/lib/session-lock-guard-v1.mjs";

function createTempRoot() {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-phase43-"));
  for (const declaredPath of createDefaultSessionLockGuardV1().declaredPaths) {
    const fullPath = path.join(rootDir, declaredPath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, "phase43 fixture\n", "utf8");
  }
  return rootDir;
}

describe("Phase 43 Session Lock Guard v1", () => {
  it("passes the default Phase 43 session lock guard", () => {
    const rootDir = createTempRoot();
    const result = inspectSessionLockGuardV1(createDefaultSessionLockGuardV1(), { rootDir });

    expect(result.ok).toBe(true);
    expect(result.status).toBe("passed");
    expect(result.sessionLockGuardStatus).toBe("ready");
    expect(result.validationFailedCount).toBe(0);
    expect(result.blockers).toEqual([]);
    expect(result.declaredFileCount).toBe(4);
    expect(result.validationCommandCount).toBe(7);
    expect(result.lockStepCount).toBeGreaterThanOrEqual(10);
    expect(result.safeLockStepCount).toBe(result.lockStepCount);
    expect(result.unsafeLockStepCount).toBe(0);
    expect(result.evidenceRequirementCount).toBeGreaterThanOrEqual(12);
    expect(result.riskCheckCount).toBeGreaterThanOrEqual(12);
    expect(result.ownerApprovalGateCount).toBeGreaterThanOrEqual(8);
    expect(result.localOnly).toBe(true);
    expect(result.sessionLockGuardOnly).toBe(true);
    expect(result.planningOnly).toBe(true);
    expect(result.dryRunOnly).toBe(true);
    expect(result.sessionLockRequired).toBe(true);
    expect(result.overlappingSessionMustBlock).toBe(true);
    expect(result.staleLockMustBlock).toBe(true);
    expect(result.ownerReleaseRequired).toBe(true);
    expect(result.sessionLockCanAuthorizeExecution).toBe(false);
    expect(result.sessionLockAcquisitionAllowed).toBe(false);
    expect(result.sessionLockReleaseAllowed).toBe(false);
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

  it("writes local session lock reports without activating execution", () => {
    const rootDir = createTempRoot();
    const result = inspectSessionLockGuardV1(createDefaultSessionLockGuardV1(), { rootDir });

    expect(fs.existsSync(result.jsonPath)).toBe(true);
    expect(fs.existsSync(result.markdownPath)).toBe(true);
    expect(fs.existsSync(result.historyPath)).toBe(true);
    expect(result.jsonPath).toContain(".sera-session-lock-guard");
    expect(result.markdownPath).toContain(".sera-session-lock-guard");
    expect(result.sessionLockCanAuthorizeExecution).toBe(false);
    expect(result.commandExecutionAllowed).toBe(false);
  });

  it("blocks unsafe lock steps that try to execute or bypass owner release", () => {
    const rootDir = createTempRoot();
    const guard = createDefaultSessionLockGuardV1();
    guard.lockSteps = [
      {
        ...guard.lockSteps[0],
        ownerReleaseRequired: false,
        staleLockCheckRequired: false,
        overlappingSessionCheckRequired: false,
        commandExecutionAllowed: true,
        mutatesSource: true,
        createsBranches: true,
        selfApproved: true,
      },
    ];
    const result = inspectSessionLockGuardV1(guard, { rootDir });

    expect(result.ok).toBe(false);
    expect(result.validationFailedCount).toBeGreaterThan(0);
    expect(result.unsafeLockStepCount).toBe(1);
    expect(result.blockers.join(" ")).toContain("owner release must be required");
    expect(result.blockers.join(" ")).toContain("stale lock check must be required");
    expect(result.blockers.join(" ")).toContain("command execution must remain disabled");
    expect(result.blockers.join(" ")).toContain("self approval must be blocked");
  });

  it("blocks boundaries that try to make session locks executable", () => {
    const rootDir = createTempRoot();
    const base = createDefaultSessionLockGuardV1();
    const guard = {
      ...base,
      boundaries: {
        ...base.boundaries,
        sessionLockCanAuthorizeExecution: true,
        sessionLockAcquisitionAllowed: true,
        commandExecutionAllowed: true,
        runnerConnectivityAllowed: true,
        mutatesSource: true,
        selfApprovalAllowed: true,
      },
    };
    const result = inspectSessionLockGuardV1(guard, { rootDir });

    expect(result.ok).toBe(false);
    expect(result.validationFailedCount).toBeGreaterThan(0);
    expect(result.sessionLockCanAuthorizeExecution).toBe(true);
    expect(result.sessionLockAcquisitionAllowed).toBe(true);
    expect(result.commandExecutionAllowed).toBe(true);
    expect(result.runnerConnectivityAllowed).toBe(true);
    expect(result.mutatesSource).toBe(true);
    expect(result.selfApprovalAllowed).toBe(true);
    expect(result.blockers.join(" ")).toContain("sessionLockCanAuthorizeExecution must remain false");
    expect(result.blockers.join(" ")).toContain("sessionLockAcquisitionAllowed must remain false");
    expect(result.blockers.join(" ")).toContain("commandExecutionAllowed must remain false");
    expect(result.blockers.join(" ")).toContain("runnerConnectivityAllowed must remain false");
    expect(result.blockers.join(" ")).toContain("mutatesSource must remain false");
    expect(result.blockers.join(" ")).toContain("selfApprovalAllowed must remain false");
  });

  it("blocks incomplete validation command sets and unsafe paths", () => {
    const rootDir = createTempRoot();
    const guard = {
      ...createDefaultSessionLockGuardV1(),
      declaredPaths: [
        ...createDefaultSessionLockGuardV1().declaredPaths,
        "../outside.txt",
      ],
      validationCommands: ["npm run phase43:demo"],
    };
    const result = inspectSessionLockGuardV1(guard, { rootDir });

    expect(result.ok).toBe(false);
    expect(result.validationFailedCount).toBeGreaterThan(0);
    expect(result.blockers.join(" ")).toContain("safe and relative");
    expect(result.blockers.join(" ")).toContain("npm run verify");
  });
});
