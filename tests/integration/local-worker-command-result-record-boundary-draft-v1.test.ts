import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createDefaultLocalWorkerCommandResultRecordBoundaryDraftV1, inspectLocalWorkerCommandResultRecordBoundaryDraftV1 } from "../../scripts/lib/local-worker-command-result-record-boundary-draft-v1.mjs";

describe("local worker command result-record boundary draft v1", () => {
  it("passes when the command result-record boundary draft is declarative and app-bound", () => {
    const result = inspectLocalWorkerCommandResultRecordBoundaryDraftV1();
    expect(result.ok).toBe(true);
    expect(result.localWorkerCommandResultRecordBoundaryDraftStatus).toBe("command-result-record-boundary-draft-ready");
    expect(result.validationFailedCount).toBe(0);
    expect(result.declaredFileCount).toBe(5);
    expect(result.commandResultRecordBoundaryDraftRequirementCount).toBe(8);
    expect(result.commandResultRecordBoundaryDraftFieldCount).toBe(10);
    expect(result.commandResultRecordBoundaryDraftEvidenceCount).toBe(8);
    expect(result.commandResultRecordBoundaryDraftSignalCount).toBe(10);
    expect(result.safetyGateCount).toBe(700);
    expect(result.appBindingCount).toBe(5);
    expect(result.phase80CommandExitCodeBoundaryDraftReady).toBe(true);
    expect(result.phase79CommandOutputBoundaryDraftReady).toBe(true);
    expect(result.commandIdentityRecordRequired).toBe(true);
    expect(result.commandOutcomeRecordRequired).toBe(true);
    expect(result.commandOutputReferenceRecordRequired).toBe(true);
    expect(result.ownerReviewStateRecordRequired).toBe(true);
    expect(result.commandResultRecordBoundaryRemainsDraftRequired).toBe(true);
    expect(result.commandExecutionAllowed).toBe(false);
    expect(result.commandResultRecordPersistenceAllowed).toBe(false);
    expect(result.liveCommandResultPersistenceAllowed).toBe(false);
    expect(result.rawOutputPersistenceAllowed).toBe(false);
    expect(result.stdoutCaptureAllowed).toBe(false);
    expect(result.stderrCaptureAllowed).toBe(false);
    expect(result.powershellExecutionAllowed).toBe(false);
    expect(result.schtasksExecutionAllowed).toBe(false);
    expect(result.shellExecutionAllowed).toBe(false);
    expect(result.selfApprovalAllowed).toBe(false);
  });

  it("writes local command result-record boundary draft reports without mutating source", () => {
    const result = inspectLocalWorkerCommandResultRecordBoundaryDraftV1(createDefaultLocalWorkerCommandResultRecordBoundaryDraftV1(), { writeArtifacts: true });
    expect(result.ok).toBe(true);
    expect(fs.existsSync(path.join(process.cwd(), ".sera-local-worker-command-result-record-boundary-draft", "phase81-local-worker-command-result-record-boundary-draft-status.json"))).toBe(true);
    expect(result.mutatesSource).toBe(false);
    expect(result.fileMutationAllowed).toBe(false);
    expect(result.recordPersistenceAllowed).toBe(false);
  });

  it("blocks unsafe declared paths", () => {
    const config = createDefaultLocalWorkerCommandResultRecordBoundaryDraftV1();
    config.declaredPaths = ["../outside.txt"];
    const result = inspectLocalWorkerCommandResultRecordBoundaryDraftV1(config);
    expect(result.ok).toBe(false);
    expect(result.blockers.some((blocker) => blocker.includes("safe and relative"))).toBe(true);
  });

  it("blocks any command execution, capture, or result persistence unlock", () => {
    const config = createDefaultLocalWorkerCommandResultRecordBoundaryDraftV1();
    config.boundaries.commandExecutionAllowed = true;
    config.boundaries.stdoutCaptureAllowed = true;
    config.boundaries.stderrCaptureAllowed = true;
    config.boundaries.liveCommandResultPersistenceAllowed = true;
    config.boundaries.commandResultRecordPersistenceAllowed = true;
    const result = inspectLocalWorkerCommandResultRecordBoundaryDraftV1(config);
    expect(result.ok).toBe(false);
    expect(result.blockers).toContain("commandExecutionAllowed must remain false");
    expect(result.blockers).toContain("stdoutCaptureAllowed must remain false");
    expect(result.blockers).toContain("stderrCaptureAllowed must remain false");
    expect(result.blockers).toContain("liveCommandResultPersistenceAllowed must remain false");
    expect(result.blockers).toContain("commandResultRecordPersistenceAllowed must remain false");
  });
});
