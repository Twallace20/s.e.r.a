import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createDefaultLocalWorkerCommandWorkingDirectoryBoundaryDraftV1, inspectLocalWorkerCommandWorkingDirectoryBoundaryDraftV1 } from "../../scripts/lib/local-worker-command-working-directory-boundary-draft-v1.mjs";

describe("local worker command working directory boundary draft v1", () => {
  it("passes when the command working directory boundary draft is declarative and app-bound", () => {
    const result = inspectLocalWorkerCommandWorkingDirectoryBoundaryDraftV1();
    expect(result.ok).toBe(true);
    expect(result.localWorkerCommandWorkingDirectoryBoundaryDraftStatus).toBe("command-working-directory-boundary-draft-ready");
    expect(result.validationFailedCount).toBe(0);
    expect(result.declaredFileCount).toBe(5);
    expect(result.commandWorkingDirectoryBoundaryDraftRequirementCount).toBe(6);
    expect(result.commandWorkingDirectoryBoundaryDraftFieldCount).toBe(8);
    expect(result.commandWorkingDirectoryBoundaryDraftEvidenceCount).toBe(6);
    expect(result.commandWorkingDirectoryBoundaryDraftSignalCount).toBe(8);
    expect(result.safetyGateCount).toBe(540);
    expect(result.appBindingCount).toBe(5);
    expect(result.phase76CommandArgumentBoundaryDraftReady).toBe(true);
    expect(result.phase75CommandAllowlistDraftReady).toBe(true);
    expect(result.commandWorkingDirectoryPatternInventoryRequired).toBe(true);
    expect(result.blockedWorkingDirectoryPatternBoundaryRequired).toBe(true);
    expect(result.commandWorkingDirectoryBoundaryRemainsDraftRequired).toBe(true);
    expect(result.commandExecutionAllowed).toBe(false);
    expect(result.powershellExecutionAllowed).toBe(false);
    expect(result.schtasksExecutionAllowed).toBe(false);
    expect(result.shellExecutionAllowed).toBe(false);
    expect(result.selfApprovalAllowed).toBe(false);
  });

  it("writes local command working directory boundary draft reports without mutating source", () => {
    const result = inspectLocalWorkerCommandWorkingDirectoryBoundaryDraftV1(createDefaultLocalWorkerCommandWorkingDirectoryBoundaryDraftV1(), { writeArtifacts: true });
    expect(result.ok).toBe(true);
    expect(fs.existsSync(path.join(process.cwd(), ".sera-local-worker-command-working-directory-boundary-draft", "phase77-local-worker-command-working-directory-boundary-draft-status.json"))).toBe(true);
    expect(result.mutatesSource).toBe(false);
    expect(result.fileMutationAllowed).toBe(false);
    expect(result.recordPersistenceAllowed).toBe(false);
  });

  it("blocks unsafe declared paths", () => {
    const config = createDefaultLocalWorkerCommandWorkingDirectoryBoundaryDraftV1();
    config.declaredPaths = ["../outside.txt"];
    const result = inspectLocalWorkerCommandWorkingDirectoryBoundaryDraftV1(config);
    expect(result.ok).toBe(false);
    expect(result.blockers.some((blocker) => blocker.includes("safe and relative"))).toBe(true);
  });

  it("blocks any command or working-directory execution unlock", () => {
    const config = createDefaultLocalWorkerCommandWorkingDirectoryBoundaryDraftV1();
    config.boundaries.commandExecutionAllowed = true;
    config.boundaries.powershellExecutionAllowed = true;
    const result = inspectLocalWorkerCommandWorkingDirectoryBoundaryDraftV1(config);
    expect(result.ok).toBe(false);
    expect(result.blockers).toContain("commandExecutionAllowed must remain false");
    expect(result.blockers).toContain("powershellExecutionAllowed must remain false");
  });
});
