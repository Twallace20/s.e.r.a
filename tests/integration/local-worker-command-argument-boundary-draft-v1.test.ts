import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createDefaultLocalWorkerCommandArgumentBoundaryDraftV1, inspectLocalWorkerCommandArgumentBoundaryDraftV1 } from "../../scripts/lib/local-worker-command-argument-boundary-draft-v1.mjs";

describe("local worker command argument boundary draft v1", () => {
  it("passes when the command argument boundary draft is declarative and app-bound", () => {
    const result = inspectLocalWorkerCommandArgumentBoundaryDraftV1();
    expect(result.ok).toBe(true);
    expect(result.localWorkerCommandArgumentBoundaryDraftStatus).toBe("command-argument-boundary-draft-ready");
    expect(result.validationFailedCount).toBe(0);
    expect(result.declaredFileCount).toBe(5);
    expect(result.commandArgumentBoundaryDraftRequirementCount).toBe(6);
    expect(result.commandArgumentBoundaryDraftFieldCount).toBe(8);
    expect(result.commandArgumentBoundaryDraftEvidenceCount).toBe(6);
    expect(result.commandArgumentBoundaryDraftSignalCount).toBe(8);
    expect(result.safetyGateCount).toBe(500);
    expect(result.appBindingCount).toBe(5);
    expect(result.phase75CommandAllowlistDraftReady).toBe(true);
    expect(result.phase74CommandExecutionApprovalPlanReady).toBe(true);
    expect(result.commandArgumentPatternInventoryRequired).toBe(true);
    expect(result.blockedArgumentPatternBoundaryRequired).toBe(true);
    expect(result.commandArgumentBoundaryRemainsDraftRequired).toBe(true);
    expect(result.commandExecutionAllowed).toBe(false);
    expect(result.powershellExecutionAllowed).toBe(false);
    expect(result.schtasksExecutionAllowed).toBe(false);
    expect(result.shellExecutionAllowed).toBe(false);
    expect(result.selfApprovalAllowed).toBe(false);
  });

  it("writes local command argument boundary draft reports without mutating source", () => {
    const result = inspectLocalWorkerCommandArgumentBoundaryDraftV1(createDefaultLocalWorkerCommandArgumentBoundaryDraftV1(), { writeArtifacts: true });
    expect(result.ok).toBe(true);
    expect(fs.existsSync(path.join(process.cwd(), ".sera-local-worker-command-argument-boundary-draft", "phase76-local-worker-command-argument-boundary-draft-status.json"))).toBe(true);
    expect(result.mutatesSource).toBe(false);
    expect(result.fileMutationAllowed).toBe(false);
    expect(result.recordPersistenceAllowed).toBe(false);
  });

  it("blocks unsafe declared paths", () => {
    const config = createDefaultLocalWorkerCommandArgumentBoundaryDraftV1();
    config.declaredPaths = ["../outside.txt"];
    const result = inspectLocalWorkerCommandArgumentBoundaryDraftV1(config);
    expect(result.ok).toBe(false);
    expect(result.blockers.some((blocker) => blocker.includes("safe and relative"))).toBe(true);
  });

  it("blocks any command or argument execution unlock", () => {
    const config = createDefaultLocalWorkerCommandArgumentBoundaryDraftV1();
    config.boundaries.commandExecutionAllowed = true;
    config.boundaries.powershellExecutionAllowed = true;
    const result = inspectLocalWorkerCommandArgumentBoundaryDraftV1(config);
    expect(result.ok).toBe(false);
    expect(result.blockers).toContain("commandExecutionAllowed must remain false");
    expect(result.blockers).toContain("powershellExecutionAllowed must remain false");
  });
});
