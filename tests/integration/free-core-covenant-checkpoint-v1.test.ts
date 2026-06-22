import { describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  createDefaultFreeCoreCovenantCheckpointV1,
  inspectFreeCoreCovenantCheckpointV1,
} from "../../scripts/lib/free-core-covenant-checkpoint-v1.mjs";

function createTempRoot() {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-phase45-"));
  for (const declaredPath of createDefaultFreeCoreCovenantCheckpointV1().declaredPaths) {
    const fullPath = path.join(rootDir, declaredPath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, "phase45 fixture\n", "utf8");
  }
  return rootDir;
}

describe("Phase 45 Free Core Covenant Checkpoint v1", () => {
  it("passes the default Phase 45 free core covenant checkpoint", () => {
    const rootDir = createTempRoot();
    const result = inspectFreeCoreCovenantCheckpointV1(createDefaultFreeCoreCovenantCheckpointV1(), { rootDir });

    expect(result.ok).toBe(true);
    expect(result.status).toBe("passed");
    expect(result.freeCoreCovenantCheckpointStatus).toBe("ready");
    expect(result.freeCoreThroughPhase).toBe(45);
    expect(result.validationFailedCount).toBe(0);
    expect(result.blockers).toEqual([]);
    expect(result.declaredFileCount).toBe(4);
    expect(result.validationCommandCount).toBe(7);
    expect(result.covenantItemCount).toBeGreaterThanOrEqual(12);
    expect(result.safeCovenantItemCount).toBe(result.covenantItemCount);
    expect(result.unsafeCovenantItemCount).toBe(0);
    expect(result.evidenceRequirementCount).toBeGreaterThanOrEqual(12);
    expect(result.riskCheckCount).toBeGreaterThanOrEqual(12);
    expect(result.ownerApprovalGateCount).toBeGreaterThanOrEqual(8);
    expect(result.localOnly).toBe(true);
    expect(result.freeCoreCovenantCheckpointOnly).toBe(true);
    expect(result.freeCoreCovenantRequired).toBe(true);
    expect(result.freeCoreThroughPhase45).toBe(true);
    expect(result.paidProviderProhibited).toBe(true);
    expect(result.cloudRunnerProhibited).toBe(true);
    expect(result.secretUseProhibited).toBe(true);
    expect(result.localRuntimeOnly).toBe(true);
    expect(result.commercialActivationDeferred).toBe(true);
    expect(result.paidProviderRequired).toBe(false);
    expect(result.cloudRequired).toBe(false);
    expect(result.requiresSecrets).toBe(false);
    expect(result.commandExecutionAllowed).toBe(false);
    expect(result.remoteExecutionAllowed).toBe(false);
    expect(result.runnerConnectivityAllowed).toBe(false);
    expect(result.mutatesSource).toBe(false);
    expect(result.selfApprovesPlan).toBe(false);
    expect(result.selfApprovalAllowed).toBe(false);
  });

  it("writes local free-core covenant reports without activating paid or execution paths", () => {
    const rootDir = createTempRoot();
    const result = inspectFreeCoreCovenantCheckpointV1(createDefaultFreeCoreCovenantCheckpointV1(), { rootDir });

    expect(fs.existsSync(result.jsonPath)).toBe(true);
    expect(fs.existsSync(result.markdownPath)).toBe(true);
    expect(fs.existsSync(result.historyPath)).toBe(true);
    expect(result.jsonPath).toContain(".sera-free-core-covenant-checkpoint");
    expect(result.markdownPath).toContain(".sera-free-core-covenant-checkpoint");
    expect(result.paidProviderRequired).toBe(false);
    expect(result.cloudRequired).toBe(false);
    expect(result.requiresSecrets).toBe(false);
    expect(result.commandExecutionAllowed).toBe(false);
    expect(result.commercialActivationAllowed).toBe(false);
  });

  it("blocks unsafe covenant items that require paid providers, secrets, or execution", () => {
    const rootDir = createTempRoot();
    const checkpoint = createDefaultFreeCoreCovenantCheckpointV1();
    checkpoint.covenantItems = [
      {
        ...checkpoint.covenantItems[0],
        ownerReviewRequired: false,
        localOnly: false,
        freeCoreCompatible: false,
        paidProviderRequired: true,
        cloudRequired: true,
        requiresSecrets: true,
        commandExecutionAllowed: true,
        mutatesSource: true,
        selfApproved: true,
      },
    ];
    const result = inspectFreeCoreCovenantCheckpointV1(checkpoint, { rootDir });

    expect(result.ok).toBe(false);
    expect(result.validationFailedCount).toBeGreaterThan(0);
    expect(result.unsafeCovenantItemCount).toBe(1);
    expect(result.blockers.join(" ")).toContain("owner review must be required");
    expect(result.blockers.join(" ")).toContain("paid providers must remain prohibited");
    expect(result.blockers.join(" ")).toContain("secret use must remain disabled");
    expect(result.blockers.join(" ")).toContain("command execution must remain disabled");
    expect(result.blockers.join(" ")).toContain("self approval must be blocked");
  });

  it("blocks boundaries that try to activate paid, cloud, runner, or source mutation paths", () => {
    const rootDir = createTempRoot();
    const base = createDefaultFreeCoreCovenantCheckpointV1();
    const checkpoint = {
      ...base,
      boundaries: {
        ...base.boundaries,
        paidProviderRequired: true,
        cloudRequired: true,
        requiresSecrets: true,
        usesCloudRunner: true,
        runnerConnectivityAllowed: true,
        commandExecutionAllowed: true,
        remoteExecutionAllowed: true,
        mutatesSource: true,
        commercialActivationAllowed: true,
        selfApprovalAllowed: true,
      },
    };
    const result = inspectFreeCoreCovenantCheckpointV1(checkpoint, { rootDir });

    expect(result.ok).toBe(false);
    expect(result.validationFailedCount).toBeGreaterThan(0);
    expect(result.paidProviderRequired).toBe(true);
    expect(result.cloudRequired).toBe(true);
    expect(result.requiresSecrets).toBe(true);
    expect(result.usesCloudRunner).toBe(true);
    expect(result.runnerConnectivityAllowed).toBe(true);
    expect(result.commandExecutionAllowed).toBe(true);
    expect(result.remoteExecutionAllowed).toBe(true);
    expect(result.mutatesSource).toBe(true);
    expect(result.commercialActivationAllowed).toBe(true);
    expect(result.selfApprovalAllowed).toBe(true);
    expect(result.blockers.join(" ")).toContain("paidProviderRequired must remain false");
    expect(result.blockers.join(" ")).toContain("cloudRequired must remain false");
    expect(result.blockers.join(" ")).toContain("requiresSecrets must remain false");
    expect(result.blockers.join(" ")).toContain("runnerConnectivityAllowed must remain false");
    expect(result.blockers.join(" ")).toContain("commandExecutionAllowed must remain false");
    expect(result.blockers.join(" ")).toContain("mutatesSource must remain false");
    expect(result.blockers.join(" ")).toContain("selfApprovalAllowed must remain false");
  });

  it("blocks incomplete validation command sets and unsafe paths", () => {
    const rootDir = createTempRoot();
    const checkpoint = {
      ...createDefaultFreeCoreCovenantCheckpointV1(),
      declaredPaths: [
        ...createDefaultFreeCoreCovenantCheckpointV1().declaredPaths,
        "../outside.txt",
      ],
      validationCommands: ["npm run phase45:demo"],
    };
    const result = inspectFreeCoreCovenantCheckpointV1(checkpoint, { rootDir });

    expect(result.ok).toBe(false);
    expect(result.validationFailedCount).toBeGreaterThan(0);
    expect(result.blockers.join(" ")).toContain("safe and relative");
    expect(result.blockers.join(" ")).toContain("npm run verify");
  });
});
