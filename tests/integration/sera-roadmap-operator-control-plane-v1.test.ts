import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createDefaultSeraRoadmapOperatorControlPlaneV1, inspectSeraRoadmapOperatorControlPlaneV1 } from "../../scripts/lib/sera-roadmap-operator-control-plane-v1.mjs";

describe("S.E.R.A. roadmap + operator control plane v1", () => {
  it("passes when the roadmap and control plane are declarative and app-bound", () => {
    const result = inspectSeraRoadmapOperatorControlPlaneV1();
    expect(result.ok).toBe(true);
    expect(result.roadmapOperatorControlPlaneStatus).toBe("roadmap-operator-control-plane-ready");
    expect(result.validationFailedCount).toBe(0);
    expect(result.declaredFileCount).toBe(7);
    expect(result.roadmapOperatorControlPlaneRequirementCount).toBe(11);
    expect(result.roadmapOperatorControlPlaneFieldCount).toBe(14);
    expect(result.roadmapOperatorControlPlaneEvidenceCount).toBe(11);
    expect(result.roadmapOperatorControlPlaneSignalCount).toBe(12);
    expect(result.safetyGateCount).toBe(740);
    expect(result.appBindingCount).toBe(7);
    expect(result.phase81CommandResultRecordBoundaryReady).toBe(true);
    expect(result.roadmapV2Required).toBe(true);
    expect(result.operatorControlPlaneRequired).toBe(true);
    expect(result.executionSpinePreserved).toBe(true);
    expect(result.approvedBranchDevelopmentPreserved).toBe(true);
    expect(result.universalIngestPulledEarlier).toBe(true);
    expect(result.universalDeliverableEnginePulledEarlier).toBe(true);
    expect(result.websitePathIncluded).toBe(true);
    expect(result.mobilePwaPathIncluded).toBe(true);
    expect(result.nativeAppPathIncluded).toBe(true);
    expect(result.awayModeBoundedAutonomyIncluded).toBe(true);
    expect(result.commandExecutionAllowed).toBe(false);
    expect(result.selfApprovalAllowed).toBe(false);
    expect(result.selfMergeAllowed).toBe(false);
    expect(result.selfDeployAllowed).toBe(false);
  });

  it("writes roadmap/control-plane reports without mutating source", () => {
    const result = inspectSeraRoadmapOperatorControlPlaneV1(createDefaultSeraRoadmapOperatorControlPlaneV1(), { writeArtifacts: true });
    expect(result.ok).toBe(true);
    expect(fs.existsSync(path.join(process.cwd(), ".sera-roadmap-operator-control-plane", "phase82-roadmap-operator-control-plane-status.json"))).toBe(true);
    expect(result.mutatesSource).toBe(false);
    expect(result.fileMutationAllowed).toBe(false);
    expect(result.recordPersistenceAllowed).toBe(false);
  });

  it("blocks unsafe declared paths", () => {
    const config = createDefaultSeraRoadmapOperatorControlPlaneV1();
    config.declaredPaths = ["../outside.txt"];
    const result = inspectSeraRoadmapOperatorControlPlaneV1(config);
    expect(result.ok).toBe(false);
    expect(result.blockers.some((blocker) => blocker.includes("safe and relative"))).toBe(true);
  });

  it("blocks command execution, away-mode execution, and self-development escalation", () => {
    const config = createDefaultSeraRoadmapOperatorControlPlaneV1();
    config.boundaries.commandExecutionAllowed = true;
    config.boundaries.awayModeExecutionAllowed = true;
    config.boundaries.selfApprovalAllowed = true;
    config.boundaries.selfMergeAllowed = true;
    config.boundaries.selfDeployAllowed = true;
    const result = inspectSeraRoadmapOperatorControlPlaneV1(config);
    expect(result.ok).toBe(false);
    expect(result.blockers).toContain("commandExecutionAllowed must remain false");
    expect(result.blockers).toContain("awayModeExecutionAllowed must remain false");
    expect(result.blockers).toContain("selfApprovalAllowed must remain false");
    expect(result.blockers).toContain("selfMergeAllowed must remain false");
    expect(result.blockers).toContain("selfDeployAllowed must remain false");
  });
});
