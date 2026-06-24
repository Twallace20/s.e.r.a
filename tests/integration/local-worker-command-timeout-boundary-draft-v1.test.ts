import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createDefaultLocalWorkerCommandTimeoutBoundaryDraftV1, inspectLocalWorkerCommandTimeoutBoundaryDraftV1 } from "../../scripts/lib/local-worker-command-timeout-boundary-draft-v1.mjs";

describe("local worker command timeout boundary draft v1", () => {
  it("passes when the command timeout boundary draft is declarative and app-bound", () => {
    const result = inspectLocalWorkerCommandTimeoutBoundaryDraftV1();
    expect(result.ok).toBe(true);
    expect(result.localWorkerCommandTimeoutBoundaryDraftStatus).toBe("command-timeout-boundary-draft-ready");
    expect(result.validationFailedCount).toBe(0);
    expect(result.declaredFileCount).toBe(5);
    expect(result.commandTimeoutBoundaryDraftRequirementCount).toBe(9);
    expect(result.commandTimeoutBoundaryDraftFieldCount).toBe(11);
    expect(result.commandTimeoutBoundaryDraftEvidenceCount).toBe(8);
    expect(result.commandTimeoutBoundaryDraftSignalCount).toBe(12);
    expect(result.safetyGateCount).toBe(760);
    expect(result.appBindingCount).toBe(5);
    expect(result.phase82RoadmapOperatorControlPlaneReady).toBe(true);
    expect(result.phase81CommandResultRecordBoundaryReady).toBe(true);
    expect(result.commandTimeoutInventoryRequired).toBe(true);
    expect(result.defaultTimeoutLimitRequired).toBe(true);
    expect(result.maximumRuntimeBoundaryRequired).toBe(true);
    expect(result.forcedStopBehaviorBoundaryRequired).toBe(true);
    expect(result.timeoutBoundaryRemainsDraftRequired).toBe(true);
    expect(result.commandExecutionAllowed).toBe(false);
    expect(result.timeoutHandlerAllowed).toBe(false);
    expect(result.liveTimeoutEvaluationAllowed).toBe(false);
    expect(result.forcedStopExecutionAllowed).toBe(false);
    expect(result.processTerminationAllowed).toBe(false);
    expect(result.retryExecutionAllowed).toBe(false);
    expect(result.stdoutCaptureAllowed).toBe(false);
    expect(result.stderrCaptureAllowed).toBe(false);
    expect(result.timeoutRecordPersistenceAllowed).toBe(false);
    expect(result.powershellExecutionAllowed).toBe(false);
    expect(result.schtasksExecutionAllowed).toBe(false);
    expect(result.shellExecutionAllowed).toBe(false);
    expect(result.awayModeExecutionAllowed).toBe(false);
    expect(result.selfApprovalAllowed).toBe(false);
  });

  it("writes local command timeout boundary draft reports without mutating source", () => {
    const result = inspectLocalWorkerCommandTimeoutBoundaryDraftV1(createDefaultLocalWorkerCommandTimeoutBoundaryDraftV1(), { writeArtifacts: true });
    expect(result.ok).toBe(true);
    expect(fs.existsSync(path.join(process.cwd(), ".sera-local-worker-command-timeout-boundary-draft", "phase83-local-worker-command-timeout-boundary-draft-status.json"))).toBe(true);
    expect(result.mutatesSource).toBe(false);
    expect(result.fileMutationAllowed).toBe(false);
    expect(result.recordPersistenceAllowed).toBe(false);
  });

  it("blocks unsafe declared paths", () => {
    const config = createDefaultLocalWorkerCommandTimeoutBoundaryDraftV1();
    config.declaredPaths = ["../outside.txt"];
    const result = inspectLocalWorkerCommandTimeoutBoundaryDraftV1(config);
    expect(result.ok).toBe(false);
    expect(result.blockers.some((blocker) => blocker.includes("safe and relative"))).toBe(true);
  });

  it("blocks any command execution, timeout handling, process control, or away-mode unlock", () => {
    const config = createDefaultLocalWorkerCommandTimeoutBoundaryDraftV1();
    config.boundaries.commandExecutionAllowed = true;
    config.boundaries.timeoutHandlerAllowed = true;
    config.boundaries.liveTimeoutEvaluationAllowed = true;
    config.boundaries.processTerminationAllowed = true;
    config.boundaries.awayModeExecutionAllowed = true;
    const result = inspectLocalWorkerCommandTimeoutBoundaryDraftV1(config);
    expect(result.ok).toBe(false);
    expect(result.blockers).toContain("commandExecutionAllowed must remain false");
    expect(result.blockers).toContain("timeoutHandlerAllowed must remain false");
    expect(result.blockers).toContain("liveTimeoutEvaluationAllowed must remain false");
    expect(result.blockers).toContain("processTerminationAllowed must remain false");
    expect(result.blockers).toContain("awayModeExecutionAllowed must remain false");
  });
});
