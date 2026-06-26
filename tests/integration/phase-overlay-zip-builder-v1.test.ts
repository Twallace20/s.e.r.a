import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  createDefaultPhaseOverlayZipBuilderV1,
  inspectPhaseOverlayZipBuilderV1,
  runPhaseOverlayZipBuilderV1,
} from "../../scripts/lib/phase-overlay-zip-builder-v1.mjs";

function tempRoot(name: string) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `sera-${name}-`));
}

describe("Phase 100C Phase Overlay ZIP Builder v1", () => {
  it("produces owner-reviewable overlay package manifests without mutating the project repo", () => {
    const artifactRoot = tempRoot("phase100c-phase-overlay-zip-builder");
    const result = runPhaseOverlayZipBuilderV1(createDefaultPhaseOverlayZipBuilderV1(), { artifactRoot });
    expect(result.ok).toBe(true);
    expect(result.phaseOverlayZipBuilderStatus).toBe("phase-overlay-zip-builder-ready");
    expect(result.validationFailedCount).toBe(0);
    expect(result.declaredFileCount).toBe(5);
    expect(result.phaseOverlayZipRequirementCount).toBe(28);
    expect(result.phaseOverlayZipFieldCount).toBe(46);
    expect(result.phaseFactoryStageCount).toBe(8);
    expect(result.phaseOverlayPackageCount).toBe(8);
    expect(result.roadmapTrackCount).toBe(13);
    expect(result.multiLanguageProductionTargetCount).toBe(18);
    expect(result.safetyGateCount).toBe(1500);
    expect(result.phaseOverlayZipBuildAllowed).toBe(true);
    expect(result.phaseSpecPacketReadAllowed).toBe(true);
    expect(result.ownerReviewOverlayPackageAllowed).toBe(true);
    expect(result.overlayPackageManifestAllowed).toBe(true);
    expect(result.patchExecutionAllowed).toBe(false);
    expect(result.projectRepoSourceMutationAllowed).toBe(false);
    expect(result.realProjectBranchCreationAllowed).toBe(false);
    expect(result.realProjectMergeExecutionAllowed).toBe(false);
    expect(result.gitPushAllowed).toBe(false);
    expect(result.tagCreationAllowed).toBe(false);
    expect(result.shellExecutionAllowed).toBe(false);
    expect(result.selfApprovalAllowed).toBe(false);
    expect(result.selfMergeAllowed).toBe(false);
    expect(result.selfDeployAllowed).toBe(false);
    expect(result.productionDeploymentAllowed).toBe(false);
    expect(result.phaseOverlayZipId).toBe("phase100c-demo-phase-overlay-zip");
    expect(result.sourceSpecId).toBe("phase100b-demo-phase-spec");
    expect(result.overlayZipBuilt).toBe(true);
    expect(result.overlayPackageManifestProduced).toBe(true);
    expect(result.projectRepoSourceMutated).toBe(false);
    expect(result.realProjectBranchCreated).toBe(false);
    expect(result.realProjectMergePerformed).toBe(false);
    expect(fs.existsSync(result.packetPath)).toBe(true);
    expect(fs.existsSync(result.manifestPath)).toBe(true);
    const manifest = JSON.parse(fs.readFileSync(result.manifestPath, "utf8"));
    expect(manifest.packageCount).toBe(8);
    expect(manifest.overlayZipBuilt).toBe(true);
  });

  it("requires Phase 100B spec readiness, source spec linkage, and owner approval", () => {
    const config = createDefaultPhaseOverlayZipBuilderV1({
      phase100BPhaseSpecGeneratorReady: false,
      sourceSpecId: "unknown-spec",
      approvalRecord: { owner: "S.E.R.A.", operatorAuthorityOwner: "Driana Smith-Wallace", approved: false, selfApproved: true },
    });
    const result = inspectPhaseOverlayZipBuilderV1(config);
    expect(result.ok).toBe(false);
    expect(result.blockers).toContain("Phase 100B phase spec generator must be ready before Phase 100C overlay ZIP building.");
    expect(result.blockers).toContain("Phase 100C must link to the Phase 100B source spec packet.");
    expect(result.blockers).toContain("Tyler Wallace approval record is required for Phase 100C overlay ZIP building.");
    expect(result.blockers).toContain("Self-approval is blocked for Phase 100C overlay ZIP building.");
  });

  it("fails closed when unsafe or incomplete overlay package definitions are introduced", () => {
    const config = createDefaultPhaseOverlayZipBuilderV1();
    config.overlayPackages[0] = {
      ...config.overlayPackages[0],
      phaseId: "100C/escape",
      sourceSpecPhaseId: "100A",
      sequence: 99,
      roadmapTrack: "unknown-track",
      packageName: "unsafe.txt",
      overlayFiles: ["../escape.ts", "repo/docs/phases/x.md"],
      packageManifestRequired: false,
      ownerReviewRequired: false,
      validationRequired: false,
      binaryPayloadAllowed: true,
      patchExecutionAllowed: true,
      sourceMutationAllowed: true,
      acceptanceCriteria: [],
      evidenceExpectations: [],
      validationExpectations: [],
      rollbackPlan: "",
    };
    const result = inspectPhaseOverlayZipBuilderV1(config);
    expect(result.ok).toBe(false);
    expect(result.blockers).toContain("Overlay package phaseId must be exact and 100A-100H scoped: 100C/escape");
    expect(result.blockers).toContain("Overlay package must preserve source spec phase id: 100C/escape");
    expect(result.blockers).toContain("Overlay package sequence must be 1 through 8: 100C/escape");
    expect(result.blockers).toContain("Overlay package must use an approved roadmap track: 100C/escape");
    expect(result.blockers).toContain("Overlay package name must be a non-empty *_overlay.zip file: 100C/escape");
    expect(result.blockers).toContain("Overlay package must include at least 6 files: 100C/escape");
    expect(result.blockers).toContain("Overlay package file path must stay under repo/ or tools/: 100C/escape");
    expect(result.blockers).toContain("Overlay package must include a script library file: 100C/escape");
    expect(result.blockers).toContain("Overlay package manifest is required: 100C/escape");
    expect(result.blockers).toContain("Overlay package ownerReviewRequired must be true: 100C/escape");
    expect(result.blockers).toContain("Overlay package validationRequired must be true: 100C/escape");
    expect(result.blockers).toContain("Overlay package binaryPayloadAllowed must remain false: 100C/escape");
    expect(result.blockers).toContain("Overlay package patchExecutionAllowed must remain false: 100C/escape");
    expect(result.blockers).toContain("Overlay package sourceMutationAllowed must remain false: 100C/escape");
    expect(result.blockers).toContain("Overlay package rollback plan is required: 100C/escape");
  });

  it("blocks unsafe Phase Factory powers while preserving roadmap and multi-language coverage", () => {
    const config = createDefaultPhaseOverlayZipBuilderV1();
    config.owner = "S.E.R.A.";
    config.phaseFactoryStages = config.phaseFactoryStages.filter((stage) => stage.phaseId !== "100H");
    config.roadmapTracks = config.roadmapTracks.filter((track) => track !== "phase-factory");
    config.multiLanguageProductionTargets = config.multiLanguageProductionTargets.filter((language) => language !== "Go");
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
    config.boundaries.productionDeploymentAllowed = true;
    const result = inspectPhaseOverlayZipBuilderV1(config);
    expect(result.ok).toBe(false);
    expect(result.blockers).toContain("Owner must be Tyler Wallace for Phase 100C phase overlay ZIP builder.");
    expect(result.blockers).toContain("Phase Factory stage is missing: 100H");
    expect(result.blockers).toContain("Roadmap track count must be 13.");
    expect(result.blockers).toContain("Multi-language production target is missing: Go");
    expect(result.blockers).toContain("patchExecutionAllowed must remain false");
    expect(result.blockers).toContain("projectRepoSourceMutationAllowed must remain false");
    expect(result.blockers).toContain("realProjectBranchCreationAllowed must remain false");
    expect(result.blockers).toContain("realProjectMergeExecutionAllowed must remain false");
    expect(result.blockers).toContain("gitPushAllowed must remain false");
    expect(result.blockers).toContain("tagCreationAllowed must remain false");
    expect(result.blockers).toContain("arbitraryCommandAllowed must remain false");
    expect(result.blockers).toContain("shellExecutionAllowed must remain false");
    expect(result.blockers).toContain("selfApprovalAllowed must remain false");
    expect(result.blockers).toContain("selfMergeAllowed must remain false");
    expect(result.blockers).toContain("selfDeployAllowed must remain false");
    expect(result.blockers).toContain("productionDeploymentAllowed must remain false");
  });

  it("records validation failure evidence when overlay package counts do not match expectations", () => {
    const artifactRoot = tempRoot("phase100c-phase-overlay-zip-builder-failure");
    const config = createDefaultPhaseOverlayZipBuilderV1({ expectedPhaseOverlayPackageCount: 99 });
    const result = runPhaseOverlayZipBuilderV1(config, { artifactRoot });
    expect(result.ok).toBe(false);
    expect(result.validationFailedCount).toBe(1);
    expect(result.overlayZipBuilt).toBe(false);
    expect(result.projectRepoSourceMutated).toBe(false);
    expect(result.realProjectBranchCreated).toBe(false);
    expect(result.realProjectMergePerformed).toBe(false);
    expect(result.gitPushPerformed).toBe(false);
    expect(result.tagCreated).toBe(false);
    const packet = JSON.parse(fs.readFileSync(result.packetPath, "utf8"));
    expect(packet.status).toBe("phase-overlay-zip-builder-validation-failed");
    expect(packet.overlayZipBuilt).toBe(false);
    expect(packet.checks.filter((check: { passed: boolean }) => !check.passed).length).toBe(0);
  });
});
