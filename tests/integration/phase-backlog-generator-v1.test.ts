import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  createDefaultPhaseBacklogGeneratorV1,
  inspectPhaseBacklogGeneratorV1,
  runPhaseBacklogGeneratorV1,
} from "../../scripts/lib/phase-backlog-generator-v1.mjs";

function tempRoot(name: string) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `sera-${name}-`));
}

describe("Phase 100A phase backlog generator v1", () => {
  it("produces an owner-reviewable Phase Factory backlog packet without mutating the project repo", () => {
    const artifactRoot = tempRoot("phase100a-phase-backlog-generator");
    const result = runPhaseBacklogGeneratorV1(createDefaultPhaseBacklogGeneratorV1(), { artifactRoot });
    expect(result.ok).toBe(true);
    expect(result.validationFailedCount).toBe(0);
    expect(result.declaredFileCount).toBe(5);
    expect(result.phaseBacklogRequirementCount).toBe(24);
    expect(result.phaseBacklogFieldCount).toBe(38);
    expect(result.phaseFactoryStageCount).toBe(8);
    expect(result.phaseBacklogItemCount).toBe(8);
    expect(result.roadmapTrackCount).toBe(13);
    expect(result.multiLanguageProductionTargetCount).toBe(18);
    expect(result.safetyGateCount).toBe(1380);
    expect(result.phaseBacklogId).toBe("phase100a-demo-phase-backlog");
    expect(result.backlogPacketProduced).toBe(true);
    expect(result.projectRepoSourceMutated).toBe(false);
    expect(result.realProjectBranchCreated).toBe(false);
    expect(result.realProjectMergePerformed).toBe(false);
    const packet = JSON.parse(fs.readFileSync(result.packetPath, "utf8"));
    expect(packet.status).toBe("phase-backlog-generator-ready");
    expect(packet.phaseBacklogItems.map((item: { phaseId: string }) => item.phaseId)).toEqual(["100A", "100B", "100C", "100D", "100E", "100F", "100G", "100H"]);
    expect(packet.checks.every((check: { passed: boolean }) => check.passed)).toBe(true);
  });

  it("requires Phase 100 readiness, Tyler approval, and Driana operator authority", () => {
    const missingPhase100 = createDefaultPhaseBacklogGeneratorV1({ phase100ApprovedBranchDeveloperAlphaReady: false });
    const missingPhase100Result = inspectPhaseBacklogGeneratorV1(missingPhase100);
    expect(missingPhase100Result.ok).toBe(false);
    expect(missingPhase100Result.blockers).toContain("Phase 100 approved branch developer Alpha must be ready before Phase 100A.");

    const missingApproval = createDefaultPhaseBacklogGeneratorV1({ approvalRecord: { approved: false } });
    const missingApprovalResult = inspectPhaseBacklogGeneratorV1(missingApproval);
    expect(missingApprovalResult.ok).toBe(false);
    expect(missingApprovalResult.blockers).toContain("Owner approval must be granted before Phase 100A backlog generation.");

    const wrongOperator = createDefaultPhaseBacklogGeneratorV1({ operatorAuthorityOwner: "S.E.R.A." });
    const wrongOperatorResult = inspectPhaseBacklogGeneratorV1(wrongOperator);
    expect(wrongOperatorResult.ok).toBe(false);
    expect(wrongOperatorResult.blockers).toContain("Operator authority owner must remain Driana Smith-Wallace.");
  });

  it("fails closed when unsafe backlog item definitions are introduced", () => {
    const config = createDefaultPhaseBacklogGeneratorV1();
    config.phaseBacklogItems[0].phaseId = "101/escape";
    config.phaseBacklogItems[0].sequence = 99;
    config.phaseBacklogItems[0].title = "";
    config.phaseBacklogItems[0].roadmapTrack = "unknown-track";
    config.phaseBacklogItems[0].purpose = "";
    config.phaseBacklogItems[0].ownerReviewRequired = false;
    config.phaseBacklogItems[0].safetyBoundaries = [];
    config.phaseBacklogItems[0].evidenceExpectations = [];
    config.phaseBacklogItems[0].validationExpectations = [];
    config.phaseBacklogItems[0].rollbackPlan = "";
    config.phaseBacklogItems[0].outputMode = "";
    config.phaseBacklogItems[0].unlocksExecution = true;
    const result = inspectPhaseBacklogGeneratorV1(config);
    expect(result.ok).toBe(false);
    expect(result.blockers).toContain("Phase backlog item phaseId must be exact and 100A-100H scoped: 101/escape");
    expect(result.blockers).toContain("Phase backlog item sequence must be 1 through 8: 101/escape");
    expect(result.blockers).toContain("Phase backlog item title is required: 101/escape");
    expect(result.blockers).toContain("Phase backlog item must use an approved roadmap track: 101/escape");
    expect(result.blockers).toContain("Phase backlog item ownerReviewRequired must be true: 101/escape");
    expect(result.blockers).toContain("Phase backlog item unlocksExecution must remain false: 101/escape");
  });

  it("blocks unsafe Phase Factory powers while preserving roadmap and multi-language coverage", () => {
    const config = createDefaultPhaseBacklogGeneratorV1();
    config.owner = "S.E.R.A.";
    config.phaseFactoryStages = config.phaseFactoryStages.filter((stage) => stage.phaseId !== "100H");
    config.roadmapTracks = config.roadmapTracks.filter((track) => track !== "creator-commercial-media-engine");
    config.multiLanguageProductionTargets = config.multiLanguageProductionTargets.filter((language) => language !== "Go");
    config.boundaries.phaseSpecGenerationAllowed = true;
    config.boundaries.overlayZipBuildAllowed = true;
    config.boundaries.patchExecutionAllowed = true;
    config.boundaries.projectRepoSourceMutationAllowed = true;
    config.boundaries.realProjectBranchCreationAllowed = true;
    config.boundaries.realProjectMergeExecutionAllowed = true;
    config.boundaries.gitPushAllowed = true;
    config.boundaries.tagCreationAllowed = true;
    config.boundaries.arbitraryCommandAllowed = true;
    config.boundaries.shellExecutionAllowed = true;
    config.boundaries.selfApprovalAllowed = true;
    config.boundaries.selfMergeAllowed = true;
    config.boundaries.selfDeployAllowed = true;
    const result = inspectPhaseBacklogGeneratorV1(config);
    expect(result.ok).toBe(false);
    expect(result.blockers).toContain("Owner must be Tyler Wallace for Phase 100A phase backlog generator.");
    expect(result.blockers).toContain("Phase Factory stage is missing: 100H");
    expect(result.blockers).toContain("Roadmap track count must be 13.");
    expect(result.blockers).toContain("Multi-language production target is missing: Go");
    expect(result.blockers).toContain("phaseSpecGenerationAllowed must remain false");
    expect(result.blockers).toContain("overlayZipBuildAllowed must remain false");
    expect(result.blockers).toContain("projectRepoSourceMutationAllowed must remain false");
    expect(result.blockers).toContain("realProjectMergeExecutionAllowed must remain false");
    expect(result.blockers).toContain("gitPushAllowed must remain false");
    expect(result.blockers).toContain("tagCreationAllowed must remain false");
    expect(result.blockers).toContain("shellExecutionAllowed must remain false");
    expect(result.blockers).toContain("selfApprovalAllowed must remain false");
    expect(result.blockers).toContain("selfMergeAllowed must remain false");
    expect(result.blockers).toContain("selfDeployAllowed must remain false");
  });

  it("records validation failure evidence when the generated backlog does not match expectations", () => {
    const artifactRoot = tempRoot("phase100a-phase-backlog-generator-failure");
    const config = createDefaultPhaseBacklogGeneratorV1({ expectedPhaseBacklogItemCount: 99 });
    const result = runPhaseBacklogGeneratorV1(config, { artifactRoot });
    expect(result.ok).toBe(false);
    expect(result.validationFailedCount).toBe(1);
    expect(result.backlogPacketProduced).toBe(false);
    expect(result.projectRepoSourceMutated).toBe(false);
    expect(result.realProjectBranchCreated).toBe(false);
    expect(result.realProjectMergePerformed).toBe(false);
    const packet = JSON.parse(fs.readFileSync(result.packetPath, "utf8"));
    expect(packet.status).toBe("phase-backlog-generator-validation-failed");
    expect(packet.checks.filter((check: { passed: boolean }) => !check.passed).length).toBe(1);
  });
});
