import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createDefaultLocalWorkerCommandRetryBoundaryDraftV1, inspectLocalWorkerCommandRetryBoundaryDraftV1 } from "../../scripts/lib/local-worker-command-retry-boundary-draft-v1.mjs";

describe("local worker command retry boundary draft v1", () => {
  it("passes when the command retry boundary draft is declarative and app-bound", () => {
    const result = inspectLocalWorkerCommandRetryBoundaryDraftV1();
    expect(result.ok).toBe(true);
    expect(result.localWorkerCommandRetryBoundaryDraftStatus).toBe("command-retry-boundary-draft-ready");
    expect(result.validationFailedCount).toBe(0);
    expect(result.declaredFileCount).toBe(5);
    expect(result.commandRetryBoundaryDraftRequirementCount).toBe(10);
    expect(result.commandRetryBoundaryDraftFieldCount).toBe(12);
    expect(result.commandRetryBoundaryDraftEvidenceCount).toBe(9);
    expect(result.commandRetryBoundaryDraftSignalCount).toBe(13);
    expect(result.safetyGateCount).toBe(780);
    expect(result.appBindingCount).toBe(5);
    expect(result.phase83CommandTimeoutBoundaryReady).toBe(true);
    expect(result.phase82RoadmapOperatorControlPlaneReady).toBe(true);
    expect(result.phase81CommandResultRecordBoundaryReady).toBe(true);
    expect(result.commandRetryInventoryRequired).toBe(true);
    expect(result.retryAttemptLimitRequired).toBe(true);
    expect(result.retryBackoffBoundaryRequired).toBe(true);
    expect(result.retryFailureEscalationBoundaryRequired).toBe(true);
    expect(result.retryBoundaryRemainsDraftRequired).toBe(true);
    expect(result.commandExecutionAllowed).toBe(false);
    expect(result.retryExecutionAllowed).toBe(false);
    expect(result.automaticRetryAllowed).toBe(false);
    expect(result.retrySchedulerAllowed).toBe(false);
    expect(result.retryBackoffTimerAllowed).toBe(false);
    expect(result.failureClassifierExecutionAllowed).toBe(false);
    expect(result.timeoutHandlerAllowed).toBe(false);
    expect(result.processTerminationAllowed).toBe(false);
    expect(result.liveExitCodeEvaluationAllowed).toBe(false);
    expect(result.stdoutCaptureAllowed).toBe(false);
    expect(result.stderrCaptureAllowed).toBe(false);
    expect(result.retryRecordPersistenceAllowed).toBe(false);
    expect(result.powershellExecutionAllowed).toBe(false);
    expect(result.schtasksExecutionAllowed).toBe(false);
    expect(result.shellExecutionAllowed).toBe(false);
    expect(result.awayModeExecutionAllowed).toBe(false);
    expect(result.selfApprovalAllowed).toBe(false);
  });

  it("writes local command retry boundary draft reports without mutating source", () => {
    const result = inspectLocalWorkerCommandRetryBoundaryDraftV1(createDefaultLocalWorkerCommandRetryBoundaryDraftV1(), { writeArtifacts: true });
    expect(result.ok).toBe(true);
    expect(fs.existsSync(path.join(process.cwd(), ".sera-local-worker-command-retry-boundary-draft", "phase84-local-worker-command-retry-boundary-draft-status.json"))).toBe(true);
    expect(result.mutatesSource).toBe(false);
    expect(result.fileMutationAllowed).toBe(false);
    expect(result.recordPersistenceAllowed).toBe(false);
  });

  it("blocks unsafe declared paths", () => {
    const config = createDefaultLocalWorkerCommandRetryBoundaryDraftV1();
    config.declaredPaths = ["../outside.txt"];
    const result = inspectLocalWorkerCommandRetryBoundaryDraftV1(config);
    expect(result.ok).toBe(false);
    expect(result.blockers.some((blocker) => blocker.includes("safe and relative"))).toBe(true);
  });

  it("blocks any command execution, retry, automatic retry, or away-mode unlock", () => {
    const config = createDefaultLocalWorkerCommandRetryBoundaryDraftV1();
    config.boundaries.commandExecutionAllowed = true;
    config.boundaries.retryExecutionAllowed = true;
    config.boundaries.automaticRetryAllowed = true;
    config.boundaries.retrySchedulerAllowed = true;
    config.boundaries.awayModeExecutionAllowed = true;
    const result = inspectLocalWorkerCommandRetryBoundaryDraftV1(config);
    expect(result.ok).toBe(false);
    expect(result.blockers).toContain("commandExecutionAllowed must remain false");
    expect(result.blockers).toContain("retryExecutionAllowed must remain false");
    expect(result.blockers).toContain("automaticRetryAllowed must remain false");
    expect(result.blockers).toContain("retrySchedulerAllowed must remain false");
    expect(result.blockers).toContain("awayModeExecutionAllowed must remain false");
  });
});
