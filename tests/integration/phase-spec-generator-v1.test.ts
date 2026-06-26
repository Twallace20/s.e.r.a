import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  createDefaultPhaseSpecGeneratorV1,
  inspectPhaseSpecGeneratorV1,
  runPhaseSpecGeneratorV1,
} from "../../scripts/lib/phase-spec-generator-v1.mjs";

function tempRoot(name: string) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `sera-${name}-`));
}

describe("Phase 100B phase spec generator v1", () => {
  it("produces owner-reviewable Phase Factory specs without mutating the project repo", () => {
    const artifactRoot = tempRoot("phase100b-phase-spec-generator");
    const result = runPhaseSpecGeneratorV1(createDefaultPhaseSpecGeneratorV1(), { artifactRoot });
    expect(result.ok).toBe(true);
    expect(result.validationFailedCount).toBe(0);
    expect(result.declaredFileCount).toBe(5);
    expect(result.phaseSpecRequirementCount).toBe(26);
    expect(result.phaseSpecFieldCount).toBe(42);
    expect(result.phaseFactoryStageCount).toBe(8);
    expect(result.phaseSpecCount).toBe(8);
    expect(result.roadmapTrackCount).toBe(13);
    expect(result.multiLanguageProductionTargetCount).toBe(18);
    expect(result.safetyGateCount).toBe(1440);
    expect(result.phaseSpecGenerationAllowed).toBe(true);
    expect(result.phaseBacklogPacketReadAllowed).toBe(true);
    expect(result.ownerReviewSpecPacketAllowed).toBe(true);
    expect(result.overlayZipBuildAllowed).toBe(false);
    expect(result.patchExecutionAllowed).toBe(false);
    expect(result.projectRepoSourceMutationAllowed).toBe(false);
    expect(result.realProjectBranchCreationAllowed).toBe(false);
    expect(result.realProjectMergeExecutionAllowed).toBe(false);
    expect(result.gitPushAllowed).toBe(false);
    expect(result.tagCreationAllowed).toBe(false);
    expect(result.arbitraryCommandAllowed).toBe(false);
    expect(result.shellExecutionAllowed).toBe(false);
    expect(result.selfApprovalAllowed).toBe(false);
    expect(result.selfMergeAllowed).toBe(false);
    expect(result.selfDeployAllowed).toBe(false);
    expect(result.specPacketProduced).toBe(true);
    expect(result.projectRepoSourceMutated).toBe(false);
    expect(result.realProjectBranchCreated).toBe(false);
    expect(result.realProjectMergePerformed).toBe(false);
    expect(result.overlayZipBuilt).toBe(false);
    expect(result.multiLanguageProductionDoctrineIncluded).toBe(true);
    expect(fs.existsSync(result.packetPath)).toBe(true);
    expect(fs.existsSync(result.manifestPath)).toBe(true);
    const packet = JSON.parse(fs.readFileSync(result.packetPath, "utf8"));
    expect(packet.status).toBe("phase-spec-generator-ready");
    expect(packet.phaseSpecs).toHaveLength(8);
    expect(packet.requiredSpecSections).toContain("owner-review");
  });

  it("requires Phase 100A backlog readiness and owner approval before spec generation", () => {
    const config = createDefaultPhaseSpecGeneratorV1();
    config.phase100APhaseBacklogGeneratorReady = false;
    config.sourceBacklogId = "";
    config.approvalRecord.approved = false;
    config.approvalRecord.selfApproved = true;
    const result = inspectPhaseSpecGeneratorV1(config);
    expect(result.ok).toBe(false);
    expect(result.blockers).toContain("Phase 100A phase backlog generator must be ready before Phase 100B.");
    expect(result.blockers).toContain("Phase 100B requires a source backlog id from Phase 100A.");
    expect(result.blockers).toContain("Owner approval must be granted before Phase 100B spec generation.");
    expect(result.blockers).toContain("Self-approval is blocked for Phase 100B spec generation.");
  });

  it("fails closed when unsafe or incomplete phase specs are introduced", () => {
    const config = createDefaultPhaseSpecGeneratorV1();
    config.phaseSpecs[0] = {
      ...config.phaseSpecs[0],
      phaseId: "101/escape",
      sourceBacklogPhaseId: "100A",
      sequence: 99,
      roadmapTrack: "unknown-track",
      purpose: "",
      scope: [],
      specSections: ["purpose"],
      acceptanceCriteria: [],
      safetyBoundaries: [],
      evidenceExpectations: [],
      validationExpectations: [],
      plannedFiles: [],
      rollbackPlan: "",
      ownerReviewRequired: false,
      implementationAllowed: true,
      overlayBuildAllowed: true,
      unlocksExecution: true,
    };
    const result = inspectPhaseSpecGeneratorV1(config);
    expect(result.ok).toBe(false);
    expect(result.blockers).toContain("Phase spec phaseId must be exact and 100A-100H scoped: 101/escape");
    expect(result.blockers).toContain("Phase spec must preserve source backlog phase id: 101/escape");
    expect(result.blockers).toContain("Phase spec sequence must be 1 through 8: 101/escape");
    expect(result.blockers).toContain("Phase spec must use an approved roadmap track: 101/escape");
    expect(result.blockers).toContain("Phase spec purpose is required: 101/escape");
    expect(result.blockers).toContain("Phase spec must include at least 5 scope items: 101/escape");
    expect(result.blockers).toContain("Phase spec is missing required section owner-review: 101/escape");
    expect(result.blockers).toContain("Phase spec must include at least 5 acceptance criteria: 101/escape");
    expect(result.blockers).toContain("Phase spec must include at least 5 planned files: 101/escape");
    expect(result.blockers).toContain("Phase spec ownerReviewRequired must be true: 101/escape");
    expect(result.blockers).toContain("Phase spec implementationAllowed must remain false: 101/escape");
    expect(result.blockers).toContain("Phase spec overlayBuildAllowed must remain false: 101/escape");
    expect(result.blockers).toContain("Phase spec unlocksExecution must remain false: 101/escape");
  });

  it("blocks unsafe Phase Factory powers while preserving roadmap and multi-language coverage", () => {
    const config = createDefaultPhaseSpecGeneratorV1();
    config.owner = "S.E.R.A.";
    config.phaseFactoryStages = config.phaseFactoryStages.filter((stage) => stage.phaseId !== "100H");
    config.roadmapTracks = config.roadmapTracks.filter((track) => track !== "creator-commercial-media-engine");
    config.multiLanguageProductionTargets = config.multiLanguageProductionTargets.filter((language) => language !== "Rust");
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
    const result = inspectPhaseSpecGeneratorV1(config);
    expect(result.ok).toBe(false);
    expect(result.blockers).toContain("Owner must be Tyler Wallace for Phase 100B phase spec generator.");
    expect(result.blockers).toContain("Phase Factory stage is missing: 100H");
    expect(result.blockers).toContain("Roadmap track count must be 13.");
    expect(result.blockers).toContain("Multi-language production target is missing: Rust");
    expect(result.blockers).toContain("overlayZipBuildAllowed must remain false");
    expect(result.blockers).toContain("patchExecutionAllowed must remain false");
    expect(result.blockers).toContain("projectRepoSourceMutationAllowed must remain false");
    expect(result.blockers).toContain("realProjectMergeExecutionAllowed must remain false");
    expect(result.blockers).toContain("gitPushAllowed must remain false");
    expect(result.blockers).toContain("tagCreationAllowed must remain false");
    expect(result.blockers).toContain("shellExecutionAllowed must remain false");
    expect(result.blockers).toContain("selfApprovalAllowed must remain false");
    expect(result.blockers).toContain("selfMergeAllowed must remain false");
    expect(result.blockers).toContain("selfDeployAllowed must remain false");
  });

  it("records validation failure evidence when generated specs do not match expectations", () => {
    const artifactRoot = tempRoot("phase100b-phase-spec-generator-failure");
    const config = createDefaultPhaseSpecGeneratorV1({ expectedPhaseSpecCount: 99 });
    const result = runPhaseSpecGeneratorV1(config, { artifactRoot });
    expect(result.ok).toBe(false);
    expect(result.validationFailedCount).toBe(1);
    expect(result.specPacketProduced).toBe(false);
    expect(result.projectRepoSourceMutated).toBe(false);
    expect(result.realProjectBranchCreated).toBe(false);
    expect(result.realProjectMergePerformed).toBe(false);
    expect(result.overlayZipBuilt).toBe(false);
    const packet = JSON.parse(fs.readFileSync(result.packetPath, "utf8"));
    expect(packet.status).toBe("phase-spec-generator-validation-failed");
    expect(packet.checks.filter((check: { passed: boolean }) => !check.passed).length).toBe(1);
  });
});
