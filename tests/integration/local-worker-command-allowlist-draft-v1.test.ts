import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createDefaultLocalWorkerCommandAllowlistDraftV1, inspectLocalWorkerCommandAllowlistDraftV1 } from "../../scripts/lib/local-worker-command-allowlist-draft-v1.mjs";

describe("local worker command allowlist draft v1", () => {
  it("passes when the command allowlist draft is declarative and app-bound", () => {
    const result = inspectLocalWorkerCommandAllowlistDraftV1();
    expect(result.ok).toBe(true);
    expect(result.localWorkerCommandAllowlistDraftStatus).toBe("command-allowlist-draft-ready");
    expect(result.validationFailedCount).toBe(0);
    expect(result.declaredFileCount).toBe(5);
    expect(result.commandAllowlistDraftRequirementCount).toBe(6);
    expect(result.commandAllowlistDraftFieldCount).toBe(8);
    expect(result.commandAllowlistDraftEvidenceCount).toBe(6);
    expect(result.commandAllowlistDraftSignalCount).toBe(8);
    expect(result.safetyGateCount).toBe(460);
    expect(result.appBindingCount).toBe(5);
    expect(result.phase74CommandExecutionApprovalPlanReady).toBe(true);
    expect(result.phase73SchedulerApprovalPlanReady).toBe(true);
    expect(result.commandAllowlistInventoryRequired).toBe(true);
    expect(result.commandDenylistBoundaryRequired).toBe(true);
    expect(result.commandAllowlistRemainsDraftRequired).toBe(true);
    expect(result.commandExecutionAllowed).toBe(false);
    expect(result.powershellExecutionAllowed).toBe(false);
    expect(result.schtasksExecutionAllowed).toBe(false);
    expect(result.shellExecutionAllowed).toBe(false);
    expect(result.selfApprovalAllowed).toBe(false);
  });

  it("writes local command allowlist draft reports without mutating source", () => {
    const result = inspectLocalWorkerCommandAllowlistDraftV1(createDefaultLocalWorkerCommandAllowlistDraftV1(), { writeArtifacts: true });
    expect(result.ok).toBe(true);
    expect(fs.existsSync(path.join(process.cwd(), ".sera-local-worker-command-allowlist-draft", "phase75-local-worker-command-allowlist-draft-status.json"))).toBe(true);
    expect(result.mutatesSource).toBe(false);
    expect(result.fileMutationAllowed).toBe(false);
    expect(result.recordPersistenceAllowed).toBe(false);
  });

  it("blocks unsafe declared paths", () => {
    const config = createDefaultLocalWorkerCommandAllowlistDraftV1();
    config.declaredPaths = ["../outside.txt"];
    const result = inspectLocalWorkerCommandAllowlistDraftV1(config);
    expect(result.ok).toBe(false);
    expect(result.blockers.some((blocker) => blocker.includes("safe and relative"))).toBe(true);
  });

  it("blocks any command execution unlock", () => {
    const config = createDefaultLocalWorkerCommandAllowlistDraftV1();
    config.boundaries.commandExecutionAllowed = true;
    config.boundaries.powershellExecutionAllowed = true;
    const result = inspectLocalWorkerCommandAllowlistDraftV1(config);
    expect(result.ok).toBe(false);
    expect(result.blockers).toContain("commandExecutionAllowed must remain false");
    expect(result.blockers).toContain("powershellExecutionAllowed must remain false");
  });
});
