import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createDefaultLocalWorkerCommandOutputBoundaryDraftV1, inspectLocalWorkerCommandOutputBoundaryDraftV1 } from "../../scripts/lib/local-worker-command-output-boundary-draft-v1.mjs";

describe("local worker command output boundary draft v1", () => {
  it("passes when the command output boundary draft is declarative and app-bound", () => {
    const result = inspectLocalWorkerCommandOutputBoundaryDraftV1();
    expect(result.ok).toBe(true);
    expect(result.localWorkerCommandOutputBoundaryDraftStatus).toBe("command-output-boundary-draft-ready");
    expect(result.validationFailedCount).toBe(0);
    expect(result.declaredFileCount).toBe(5);
    expect(result.commandOutputBoundaryDraftRequirementCount).toBe(6);
    expect(result.commandOutputBoundaryDraftFieldCount).toBe(8);
    expect(result.commandOutputBoundaryDraftEvidenceCount).toBe(6);
    expect(result.commandOutputBoundaryDraftSignalCount).toBe(8);
    expect(result.safetyGateCount).toBe(620);
    expect(result.appBindingCount).toBe(5);
    expect(result.phase78CommandEnvironmentBoundaryDraftReady).toBe(true);
    expect(result.phase77CommandWorkingDirectoryBoundaryDraftReady).toBe(true);
    expect(result.commandOutputCaptureInventoryRequired).toBe(true);
    expect(result.blockedOutputCaptureBoundaryRequired).toBe(true);
    expect(result.commandOutputBoundaryRemainsDraftRequired).toBe(true);
    expect(result.commandExecutionAllowed).toBe(false);
    expect(result.powershellExecutionAllowed).toBe(false);
    expect(result.schtasksExecutionAllowed).toBe(false);
    expect(result.shellExecutionAllowed).toBe(false);
    expect(result.selfApprovalAllowed).toBe(false);
  });

  it("writes local command output boundary draft reports without mutating source", () => {
    const result = inspectLocalWorkerCommandOutputBoundaryDraftV1(createDefaultLocalWorkerCommandOutputBoundaryDraftV1(), { writeArtifacts: true });
    expect(result.ok).toBe(true);
    expect(fs.existsSync(path.join(process.cwd(), ".sera-local-worker-command-output-boundary-draft", "phase79-local-worker-command-output-boundary-draft-status.json"))).toBe(true);
    expect(result.mutatesSource).toBe(false);
    expect(result.fileMutationAllowed).toBe(false);
    expect(result.recordPersistenceAllowed).toBe(false);
  });

  it("blocks unsafe declared paths", () => {
    const config = createDefaultLocalWorkerCommandOutputBoundaryDraftV1();
    config.declaredPaths = ["../outside.txt"];
    const result = inspectLocalWorkerCommandOutputBoundaryDraftV1(config);
    expect(result.ok).toBe(false);
    expect(result.blockers.some((blocker) => blocker.includes("safe and relative"))).toBe(true);
  });

  it("blocks any command or output execution unlock", () => {
    const config = createDefaultLocalWorkerCommandOutputBoundaryDraftV1();
    config.boundaries.commandExecutionAllowed = true;
    config.boundaries.powershellExecutionAllowed = true;
    const result = inspectLocalWorkerCommandOutputBoundaryDraftV1(config);
    expect(result.ok).toBe(false);
    expect(result.blockers).toContain("commandExecutionAllowed must remain false");
    expect(result.blockers).toContain("powershellExecutionAllowed must remain false");
  });
});
