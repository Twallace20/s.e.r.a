import { describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  createDefaultOvernightBranchWorkerV1,
  inspectOvernightBranchWorkerV1,
} from "../../scripts/lib/overnight-branch-worker-v1.mjs";

function createTempRoot() {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-phase40-"));
  for (const declaredPath of createDefaultOvernightBranchWorkerV1().declaredPaths) {
    const fullPath = path.join(rootDir, declaredPath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, "phase40 fixture\n", "utf8");
  }
  return rootDir;
}

describe("Phase 40 Overnight Branch Worker v1", () => {
  it("passes the default Phase 40 overnight branch worker", () => {
    const rootDir = createTempRoot();
    const result = inspectOvernightBranchWorkerV1(createDefaultOvernightBranchWorkerV1(), { rootDir });

    expect(result.ok).toBe(true);
    expect(result.status).toBe("passed");
    expect(result.overnightWorkerStatus).toBe("ready");
    expect(result.validationFailedCount).toBe(0);
    expect(result.blockers).toEqual([]);
    expect(result.declaredFileCount).toBe(4);
    expect(result.validationCommandCount).toBe(7);
    expect(result.workerStepCount).toBeGreaterThanOrEqual(15);
    expect(result.acceptedWorkerStepCount).toBe(result.workerStepCount);
    expect(result.rejectedWorkerStepCount).toBe(0);
    expect(result.evidenceRequirementCount).toBeGreaterThanOrEqual(12);
    expect(result.riskCheckCount).toBeGreaterThanOrEqual(12);
    expect(result.ownerApprovalGateCount).toBeGreaterThanOrEqual(8);
  });

  it("writes local worker reports while keeping execution disabled", () => {
    const rootDir = createTempRoot();
    const result = inspectOvernightBranchWorkerV1(createDefaultOvernightBranchWorkerV1(), { rootDir });

    expect(fs.existsSync(result.jsonPath)).toBe(true);
    expect(fs.existsSync(result.markdownPath)).toBe(true);
    expect(fs.existsSync(result.historyPath)).toBe(true);
    expect(result.localOnly).toBe(true);
    expect(result.workerOnly).toBe(true);
    expect(result.overnightBranchWorkerOnly).toBe(true);
    expect(result.dryRunOnly).toBe(true);
    expect(result.planningOnly).toBe(true);
    expect(result.overnightExecutionAllowed).toBe(false);
    expect(result.commandExecutionAllowed).toBe(false);
    expect(result.remoteExecutionAllowed).toBe(false);
    expect(result.runnerConnectivityAllowed).toBe(false);
    expect(result.usesSelfHostedRunner).toBe(false);
    expect(result.requiresSecrets).toBe(false);
  });

  it("blocks worker steps that allow execution, mutation, remote execution, branch mutation, or secret storage", () => {
    const rootDir = createTempRoot();
    const defaultWorker = createDefaultOvernightBranchWorkerV1();
    const worker = {
      ...defaultWorker,
      workerSteps: [
        ...defaultWorker.workerSteps,
        {
          id: "unsafe-worker-step",
          label: "Unsafe worker step",
          required: true,
          ownerReviewRequired: true,
          commandExecutionAllowed: true,
          sourceMutationAllowed: true,
          remoteExecutionAllowed: true,
          branchMutationAllowed: true,
          storesSecrets: true,
          evidenceRequired: false,
          redactionRequired: false,
        },
      ],
    };
    const result = inspectOvernightBranchWorkerV1(worker, { rootDir });

    expect(result.ok).toBe(false);
    expect(result.status).toBe("blocked");
    expect(result.overnightWorkerStatus).toBe("blocked");
    expect(result.rejectedWorkerStepCount).toBeGreaterThanOrEqual(1);
    expect(result.blockers.join(" ")).toContain("must not allow command execution");
    expect(result.blockers.join(" ")).toContain("must not store secrets");
    expect(result.blockers.join(" ")).toContain("Evidence capture must be required");
  });

  it("blocks workers missing required lineage or safety bindings", () => {
    const rootDir = createTempRoot();
    const worker = {
      ...createDefaultOvernightBranchWorkerV1(),
      sourcePhaseIds: [
        "phase-32-phase-packet-generator-v1",
        "phase-33-branch-proposal-builder-v1",
        "phase-34-branch-readiness-inspector-v1",
        "phase-35-remote-phase-runner-blueprint-v1",
      ],
      overnightExecutionAllowed: true,
      commandExecutionAllowed: true,
      remoteExecutionAllowed: true,
      evidenceCaptureRequired: false,
      commandAllowlistRequired: false,
      approvalQueueBindingRequired: false,
      branchReadinessRequired: false,
    };
    const result = inspectOvernightBranchWorkerV1(worker, { rootDir });

    expect(result.ok).toBe(false);
    expect(result.blockers.join(" ")).toContain("phase-39-evidence-capture-bundle-v1");
    expect(result.blockers.join(" ")).toContain("overnightExecutionAllowed must remain false");
    expect(result.blockers.join(" ")).toContain("commandExecutionAllowed must remain false");
    expect(result.blockers.join(" ")).toContain("remoteExecutionAllowed must remain false");
    expect(result.blockers.join(" ")).toContain("evidenceCaptureRequired must remain true");
  });

  it("blocks incomplete validation command sets and unsafe paths", () => {
    const rootDir = createTempRoot();
    const worker = {
      ...createDefaultOvernightBranchWorkerV1(),
      declaredPaths: [
        ...createDefaultOvernightBranchWorkerV1().declaredPaths,
        "../outside.txt",
      ],
      validationCommands: ["npm run phase40:demo"],
    };
    const result = inspectOvernightBranchWorkerV1(worker, { rootDir });

    expect(result.ok).toBe(false);
    expect(result.validationFailedCount).toBeGreaterThan(0);
    expect(result.blockers.join(" ")).toContain("safe and relative");
    expect(result.blockers.join(" ")).toContain("npm run verify");
  });
});
