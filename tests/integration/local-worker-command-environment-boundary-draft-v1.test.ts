import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createDefaultLocalWorkerCommandEnvironmentBoundaryDraftV1, inspectLocalWorkerCommandEnvironmentBoundaryDraftV1 } from "../../scripts/lib/local-worker-command-environment-boundary-draft-v1.mjs";

describe("local worker command environment boundary draft v1", () => {
  it("passes when the command environment boundary draft is declarative and app-bound", () => {
    const result = inspectLocalWorkerCommandEnvironmentBoundaryDraftV1();
    expect(result.ok).toBe(true);
    expect(result.localWorkerCommandEnvironmentBoundaryDraftStatus).toBe("command-environment-boundary-draft-ready");
    expect(result.validationFailedCount).toBe(0);
    expect(result.declaredFileCount).toBe(5);
    expect(result.commandEnvironmentBoundaryDraftRequirementCount).toBe(6);
    expect(result.commandEnvironmentBoundaryDraftFieldCount).toBe(8);
    expect(result.commandEnvironmentBoundaryDraftEvidenceCount).toBe(6);
    expect(result.commandEnvironmentBoundaryDraftSignalCount).toBe(8);
    expect(result.safetyGateCount).toBe(580);
    expect(result.appBindingCount).toBe(5);
    expect(result.phase77CommandWorkingDirectoryBoundaryDraftReady).toBe(true);
    expect(result.phase76CommandArgumentBoundaryDraftReady).toBe(true);
    expect(result.commandEnvironmentVariableInventoryRequired).toBe(true);
    expect(result.blockedEnvironmentVariableBoundaryRequired).toBe(true);
    expect(result.commandEnvironmentBoundaryRemainsDraftRequired).toBe(true);
    expect(result.commandExecutionAllowed).toBe(false);
    expect(result.powershellExecutionAllowed).toBe(false);
    expect(result.schtasksExecutionAllowed).toBe(false);
    expect(result.shellExecutionAllowed).toBe(false);
    expect(result.selfApprovalAllowed).toBe(false);
  });

  it("writes local command environment boundary draft reports without mutating source", () => {
    const result = inspectLocalWorkerCommandEnvironmentBoundaryDraftV1(createDefaultLocalWorkerCommandEnvironmentBoundaryDraftV1(), { writeArtifacts: true });
    expect(result.ok).toBe(true);
    expect(fs.existsSync(path.join(process.cwd(), ".sera-local-worker-command-environment-boundary-draft", "phase78-local-worker-command-environment-boundary-draft-status.json"))).toBe(true);
    expect(result.mutatesSource).toBe(false);
    expect(result.fileMutationAllowed).toBe(false);
    expect(result.recordPersistenceAllowed).toBe(false);
  });

  it("blocks unsafe declared paths", () => {
    const config = createDefaultLocalWorkerCommandEnvironmentBoundaryDraftV1();
    config.declaredPaths = ["../outside.txt"];
    const result = inspectLocalWorkerCommandEnvironmentBoundaryDraftV1(config);
    expect(result.ok).toBe(false);
    expect(result.blockers.some((blocker) => blocker.includes("safe and relative"))).toBe(true);
  });

  it("blocks any command or environment execution unlock", () => {
    const config = createDefaultLocalWorkerCommandEnvironmentBoundaryDraftV1();
    config.boundaries.commandExecutionAllowed = true;
    config.boundaries.powershellExecutionAllowed = true;
    const result = inspectLocalWorkerCommandEnvironmentBoundaryDraftV1(config);
    expect(result.ok).toBe(false);
    expect(result.blockers).toContain("commandExecutionAllowed must remain false");
    expect(result.blockers).toContain("powershellExecutionAllowed must remain false");
  });
});
