import { describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  createDefaultOwnerApprovalQueueV1,
  inspectOwnerApprovalQueueV1,
} from "../../scripts/lib/owner-approval-queue-v1.mjs";

function createTempRoot() {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-phase36-"));
  for (const declaredPath of createDefaultOwnerApprovalQueueV1().declaredPaths) {
    const fullPath = path.join(rootDir, declaredPath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, "phase36 fixture\n", "utf8");
  }
  return rootDir;
}

describe("Phase 36 Owner Approval Queue v1", () => {
  it("passes the default Phase 36 owner approval queue", () => {
    const rootDir = createTempRoot();
    const result = inspectOwnerApprovalQueueV1(createDefaultOwnerApprovalQueueV1(), { rootDir });

    expect(result.ok).toBe(true);
    expect(result.status).toBe("passed");
    expect(result.queueStatus).toBe("ready");
    expect(result.validationFailedCount).toBe(0);
    expect(result.blockers).toEqual([]);
    expect(result.declaredFileCount).toBe(4);
    expect(result.validationCommandCount).toBe(7);
    expect(result.approvalStageCount).toBeGreaterThanOrEqual(9);
    expect(result.approvalRequestCount).toBeGreaterThanOrEqual(5);
    expect(result.pendingApprovalCount).toBeGreaterThanOrEqual(5);
    expect(result.evidenceRequirementCount).toBeGreaterThanOrEqual(12);
    expect(result.riskCheckCount).toBeGreaterThanOrEqual(10);
    expect(result.ownerApprovalGateCount).toBeGreaterThanOrEqual(6);
  });

  it("writes local approval queue reports while keeping execution disabled", () => {
    const rootDir = createTempRoot();
    const result = inspectOwnerApprovalQueueV1(createDefaultOwnerApprovalQueueV1(), { rootDir });

    expect(fs.existsSync(result.jsonPath)).toBe(true);
    expect(fs.existsSync(result.markdownPath)).toBe(true);
    expect(fs.existsSync(result.historyPath)).toBe(true);
    expect(result.localOnly).toBe(true);
    expect(result.queueOnly).toBe(true);
    expect(result.approvalQueueOnly).toBe(true);
    expect(result.remoteExecutionAllowed).toBe(false);
    expect(result.executionAllowedAfterApproval).toBe(false);
    expect(result.recordsOwnerDecision).toBe(false);
    expect(result.selfApprovalAllowed).toBe(false);
    expect(result.requiresSecrets).toBe(false);
  });

  it("blocks queues that try to self-approve or record owner decisions", () => {
    const rootDir = createTempRoot();
    const queue = {
      ...createDefaultOwnerApprovalQueueV1(),
      selfApprovesPlan: true,
      selfApprovalAllowed: true,
      recordsOwnerDecision: true,
      approvalRequests: createDefaultOwnerApprovalQueueV1().approvalRequests.map((request) => ({
        ...request,
        selfApprovalAllowed: true,
      })),
    };
    const result = inspectOwnerApprovalQueueV1(queue, { rootDir });

    expect(result.ok).toBe(false);
    expect(result.status).toBe("blocked");
    expect(result.queueStatus).toBe("blocked");
    expect(result.blockers.join(" ")).toContain("selfApprovesPlan must remain false");
    expect(result.blockers.join(" ")).toContain("selfApprovalAllowed must remain false");
    expect(result.blockers.join(" ")).toContain("recordsOwnerDecision must remain false");
    expect(result.blockers.join(" ")).toContain("Self approval must be blocked");
  });

  it("blocks queues that try to execute after approval or skip pending owner approval", () => {
    const rootDir = createTempRoot();
    const queue = {
      ...createDefaultOwnerApprovalQueueV1(),
      remoteExecutionAllowed: true,
      executionAllowedAfterApproval: true,
      approvalRequests: createDefaultOwnerApprovalQueueV1().approvalRequests.map((request) => ({
        ...request,
        status: "approved",
        executionAllowedAfterApproval: true,
      })),
    };
    const result = inspectOwnerApprovalQueueV1(queue, { rootDir });

    expect(result.ok).toBe(false);
    expect(result.blockers.join(" ")).toContain("remoteExecutionAllowed must remain false");
    expect(result.blockers.join(" ")).toContain("executionAllowedAfterApproval must remain false");
    expect(result.blockers.join(" ")).toContain("pending owner approval");
  });

  it("blocks incomplete validation command sets and unsafe paths", () => {
    const rootDir = createTempRoot();
    const queue = {
      ...createDefaultOwnerApprovalQueueV1(),
      declaredPaths: [
        ...createDefaultOwnerApprovalQueueV1().declaredPaths,
        "../outside.txt",
      ],
      validationCommands: ["npm run phase36:demo"],
    };
    const result = inspectOwnerApprovalQueueV1(queue, { rootDir });

    expect(result.ok).toBe(false);
    expect(result.validationFailedCount).toBeGreaterThan(0);
    expect(result.blockers.join(" ")).toContain("safe and relative");
    expect(result.blockers.join(" ")).toContain("npm run verify");
  });
});
