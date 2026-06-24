import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createDefaultLocalWorkerCommandExitCodeBoundaryDraftV1, inspectLocalWorkerCommandExitCodeBoundaryDraftV1 } from "../../scripts/lib/local-worker-command-exit-code-boundary-draft-v1.mjs";

describe("local worker command exit-code boundary draft v1", () => {
  it("passes when the command exit-code boundary draft is declarative and app-bound", () => {
    const result = inspectLocalWorkerCommandExitCodeBoundaryDraftV1();
    expect(result.ok).toBe(true);
    expect(result.localWorkerCommandExitCodeBoundaryDraftStatus).toBe("command-exit-code-boundary-draft-ready");
    expect(result.validationFailedCount).toBe(0);
    expect(result.declaredFileCount).toBe(5);
    expect(result.commandExitCodeBoundaryDraftRequirementCount).toBe(7);
    expect(result.commandExitCodeBoundaryDraftFieldCount).toBe(9);
    expect(result.commandExitCodeBoundaryDraftEvidenceCount).toBe(7);
    expect(result.commandExitCodeBoundaryDraftSignalCount).toBe(9);
    expect(result.safetyGateCount).toBe(660);
    expect(result.appBindingCount).toBe(5);
    expect(result.phase79CommandOutputBoundaryDraftReady).toBe(true);
    expect(result.phase78CommandEnvironmentBoundaryDraftReady).toBe(true);
    expect(result.commandExitCodeMeaningInventoryRequired).toBe(true);
    expect(result.commandTimeoutBoundaryRequired).toBe(true);
    expect(result.commandFailureRetryBoundaryRequired).toBe(true);
    expect(result.commandExitCodeBoundaryRemainsDraftRequired).toBe(true);
    expect(result.commandExecutionAllowed).toBe(false);
    expect(result.retryExecutionAllowed).toBe(false);
    expect(result.timeoutHandlerAllowed).toBe(false);
    expect(result.exitCodeEvaluationAllowed).toBe(false);
    expect(result.powershellExecutionAllowed).toBe(false);
    expect(result.schtasksExecutionAllowed).toBe(false);
    expect(result.shellExecutionAllowed).toBe(false);
    expect(result.selfApprovalAllowed).toBe(false);
  });

  it("writes local command exit-code boundary draft reports without mutating source", () => {
    const result = inspectLocalWorkerCommandExitCodeBoundaryDraftV1(createDefaultLocalWorkerCommandExitCodeBoundaryDraftV1(), { writeArtifacts: true });
    expect(result.ok).toBe(true);
    expect(fs.existsSync(path.join(process.cwd(), ".sera-local-worker-command-exit-code-boundary-draft", "phase80-local-worker-command-exit-code-boundary-draft-status.json"))).toBe(true);
    expect(result.mutatesSource).toBe(false);
    expect(result.fileMutationAllowed).toBe(false);
    expect(result.recordPersistenceAllowed).toBe(false);
  });

  it("blocks unsafe declared paths", () => {
    const config = createDefaultLocalWorkerCommandExitCodeBoundaryDraftV1();
    config.declaredPaths = ["../outside.txt"];
    const result = inspectLocalWorkerCommandExitCodeBoundaryDraftV1(config);
    expect(result.ok).toBe(false);
    expect(result.blockers.some((blocker) => blocker.includes("safe and relative"))).toBe(true);
  });

  it("blocks any command, retry, timeout, or exit-code execution unlock", () => {
    const config = createDefaultLocalWorkerCommandExitCodeBoundaryDraftV1();
    config.boundaries.commandExecutionAllowed = true;
    config.boundaries.retryExecutionAllowed = true;
    config.boundaries.timeoutHandlerAllowed = true;
    config.boundaries.exitCodeEvaluationAllowed = true;
    const result = inspectLocalWorkerCommandExitCodeBoundaryDraftV1(config);
    expect(result.ok).toBe(false);
    expect(result.blockers).toContain("commandExecutionAllowed must remain false");
    expect(result.blockers).toContain("retryExecutionAllowed must remain false");
    expect(result.blockers).toContain("timeoutHandlerAllowed must remain false");
    expect(result.blockers).toContain("exitCodeEvaluationAllowed must remain false");
  });
});
