import { describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  createDefaultOwnerDecisionRecorderV1,
  inspectOwnerDecisionRecorderV1,
} from "../../scripts/lib/owner-decision-recorder-v1.mjs";

function createTempRoot() {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-phase41-"));
  for (const declaredPath of createDefaultOwnerDecisionRecorderV1().declaredPaths) {
    const fullPath = path.join(rootDir, declaredPath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, "phase41 fixture\n", "utf8");
  }
  return rootDir;
}

describe("Phase 41 Owner Decision Recorder v1", () => {
  it("passes the default Phase 41 owner decision recorder", () => {
    const rootDir = createTempRoot();
    const result = inspectOwnerDecisionRecorderV1(createDefaultOwnerDecisionRecorderV1(), { rootDir });

    expect(result.ok).toBe(true);
    expect(result.status).toBe("passed");
    expect(result.ownerDecisionRecorderStatus).toBe("ready");
    expect(result.validationFailedCount).toBe(0);
    expect(result.blockers).toEqual([]);
    expect(result.declaredFileCount).toBe(4);
    expect(result.validationCommandCount).toBe(7);
    expect(result.ownerDecisionEntryCount).toBeGreaterThanOrEqual(8);
    expect(result.acceptedOwnerDecisionEntryCount).toBe(result.ownerDecisionEntryCount);
    expect(result.rejectedOwnerDecisionEntryCount).toBe(0);
    expect(result.evidenceRequirementCount).toBeGreaterThanOrEqual(12);
    expect(result.riskCheckCount).toBeGreaterThanOrEqual(12);
    expect(result.ownerApprovalGateCount).toBeGreaterThanOrEqual(8);
    expect(result.recordsOwnerDecision).toBe(true);
    expect(result.decisionRecordingAllowed).toBe(true);
    expect(result.decisionCanAuthorizeExecution).toBe(false);
    expect(result.executionAllowedAfterApproval).toBe(false);
    expect(result.commandExecutionAllowed).toBe(false);
    expect(result.remoteExecutionAllowed).toBe(false);
    expect(result.runnerConnectivityAllowed).toBe(false);
    expect(result.requiresSecrets).toBe(false);
    expect(result.mutatesSource).toBe(false);
    expect(result.acceptsEvidenceAsOwnerApproved).toBe(false);
    expect(result.selfApprovesPlan).toBe(false);
    expect(result.selfApprovalAllowed).toBe(false);
    expect(result.ownerIdentityRequired).toBe(true);
    expect(result.explicitOwnerDecisionPhraseRequired).toBe(true);
    expect(result.approvalQueueBindingRequired).toBe(true);
    expect(result.evidenceBundleBindingRequired).toBe(true);
    expect(result.immutableAuditTrailRequired).toBe(true);
  });

  it("writes local owner decision recorder reports without activating execution", () => {
    const rootDir = createTempRoot();
    const result = inspectOwnerDecisionRecorderV1(createDefaultOwnerDecisionRecorderV1(), { rootDir });

    expect(fs.existsSync(result.jsonPath)).toBe(true);
    expect(fs.existsSync(result.markdownPath)).toBe(true);
    expect(fs.existsSync(result.historyPath)).toBe(true);
    expect(result.jsonPath).toContain(".sera-owner-decision-recorder");
    expect(result.markdownPath).toContain(".sera-owner-decision-recorder");
    expect(result.recordsOwnerDecision).toBe(true);
    expect(result.decisionCanAuthorizeExecution).toBe(false);
    expect(result.commandExecutionAllowed).toBe(false);
  });

  it("blocks self-approved decisions and execution after decision", () => {
    const rootDir = createTempRoot();
    const recorder = createDefaultOwnerDecisionRecorderV1();
    recorder.ownerDecisionEntries = [
      {
        ...recorder.ownerDecisionEntries[0],
        ownerIdentity: "",
        selfApproved: true,
        executesAfterDecision: true,
        mutatesSourceAfterDecision: true,
        evidenceReferences: [],
      },
    ];
    const result = inspectOwnerDecisionRecorderV1(recorder, { rootDir });

    expect(result.ok).toBe(false);
    expect(result.ownerDecisionRecorderStatus).toBe("blocked");
    expect(result.rejectedOwnerDecisionEntryCount).toBe(1);
    expect(result.blockers.join(" ")).toContain("owner identity");
    expect(result.blockers.join(" ")).toContain("Self approval");
    expect(result.blockers.join(" ")).toContain("Execution after decision");
    expect(result.blockers.join(" ")).toContain("Evidence reference");
  });

  it("blocks unsafe boundaries that try to turn decisions into execution authority", () => {
    const rootDir = createTempRoot();
    const recorder = createDefaultOwnerDecisionRecorderV1();
    recorder.boundaries = {
      ...recorder.boundaries,
      recordsOwnerDecision: false,
      decisionCanAuthorizeExecution: true,
      executionAllowedAfterApproval: true,
      commandExecutionAllowed: true,
      remoteExecutionAllowed: true,
      mutatesSource: true,
      selfApprovalAllowed: true,
    };
    const result = inspectOwnerDecisionRecorderV1(recorder, { rootDir });

    expect(result.ok).toBe(false);
    expect(result.validationFailedCount).toBeGreaterThan(0);
    expect(result.blockers.join(" ")).toContain("recordsOwnerDecision must remain true");
    expect(result.blockers.join(" ")).toContain("decisionCanAuthorizeExecution must remain false");
    expect(result.blockers.join(" ")).toContain("executionAllowedAfterApproval must remain false");
    expect(result.blockers.join(" ")).toContain("commandExecutionAllowed must remain false");
    expect(result.blockers.join(" ")).toContain("selfApprovalAllowed must remain false");
  });

  it("blocks incomplete validation command sets and unsafe paths", () => {
    const rootDir = createTempRoot();
    const recorder = {
      ...createDefaultOwnerDecisionRecorderV1(),
      declaredPaths: [
        ...createDefaultOwnerDecisionRecorderV1().declaredPaths,
        "../outside.txt",
      ],
      validationCommands: ["npm run phase41:demo"],
    };
    const result = inspectOwnerDecisionRecorderV1(recorder, { rootDir });

    expect(result.ok).toBe(false);
    expect(result.validationFailedCount).toBeGreaterThan(0);
    expect(result.blockers.join(" ")).toContain("safe and relative");
    expect(result.blockers.join(" ")).toContain("npm run verify");
  });
});
