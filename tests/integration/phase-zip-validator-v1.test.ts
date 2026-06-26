import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  createDefaultPhaseZipValidatorV1,
  inspectPhaseZipValidatorV1,
  runPhaseZipValidatorV1,
} from "../../scripts/lib/phase-zip-validator-v1.mjs";

function tempRoot(name: string) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `${name}-`));
}

describe("Phase 100D — Phase ZIP Validator v1", () => {
  it("produces validation evidence without mutating, building, merging, pushing, or tagging", () => {
    const artifactRoot = tempRoot("phase100d-phase-zip-validator");
    const result = runPhaseZipValidatorV1(createDefaultPhaseZipValidatorV1(), { artifactRoot });
    expect(result.ok).toBe(true);
    expect(result.phaseZipValidatorStatus).toBe("phase-zip-validator-ready");
    expect(result.validationFailedCount).toBe(0);
    expect(result.phaseZipValidationAllowed).toBe(true);
    expect(result.phaseOverlayPackageManifestReadAllowed).toBe(true);
    expect(result.validationEvidencePacketAllowed).toBe(true);
    expect(result.checksumManifestAllowed).toBe(true);
    expect(result.overlayZipBuildAllowed).toBe(false);
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
    expect(result.projectRepoSourceMutated).toBe(false);
    expect(result.overlayZipBuilt).toBe(false);
    expect(result.realProjectBranchCreated).toBe(false);
    expect(result.realProjectMergePerformed).toBe(false);
    expect(result.validationEvidencePacketProduced).toBe(true);
    expect(result.checksumManifestProduced).toBe(true);
    expect(fs.existsSync(result.packetPath)).toBe(true);
    expect(fs.existsSync(result.validationManifestPath)).toBe(true);
    expect(fs.existsSync(result.checksumManifestPath)).toBe(true);
  });

  it("requires Phase 100C lineage, owner approval, exact Phase Factory coverage, and multi-language doctrine", () => {
    const result = inspectPhaseZipValidatorV1(createDefaultPhaseZipValidatorV1());
    expect(result.ok).toBe(true);
    expect(result.declaredFileCount).toBe(5);
    expect(result.phaseZipValidatorRequirementCount).toBe(30);
    expect(result.phaseZipValidatorFieldCount).toBe(50);
    expect(result.phaseFactoryStageCount).toBe(8);
    expect(result.phaseZipValidationPackageCount).toBe(8);
    expect(result.roadmapTrackCount).toBe(13);
    expect(result.multiLanguageProductionTargetCount).toBe(18);
    expect(result.safetyGateCount).toBe(1560);
  });

  it("fails closed when unsafe ZIP validation package definitions are introduced", () => {
    const config = createDefaultPhaseZipValidatorV1();
    config.zipValidationPackages[0].phaseId = "101";
    config.zipValidationPackages[0].packageName = "bad.zip";
    config.zipValidationPackages[0].checksumAlgorithm = "md5";
    config.zipValidationPackages[0].checksumManifestPresent = false;
    config.zipValidationPackages[0].overlayPackageManifestPresent = false;
    config.zipValidationPackages[0].binaryPayloadAllowed = true;
    config.zipValidationPackages[0].pathTraversalDetected = true;
    config.zipValidationPackages[0].unsafeAbsolutePathDetected = true;
    config.zipValidationPackages[0].unsignedPayloadAllowed = true;
    config.zipValidationPackages[0].overlayFiles = ["../escape.txt", "/absolute/file.txt", "repo/docs/phases/ONLY.md"];
    const result = inspectPhaseZipValidatorV1(config);
    expect(result.ok).toBe(false);
    expect(result.blockers.some((blocker) => blocker.includes("100A-100H scoped"))).toBe(true);
    expect(result.blockers.some((blocker) => blocker.includes("*_overlay.zip"))).toBe(true);
    expect(result.blockers.some((blocker) => blocker.includes("sha256"))).toBe(true);
    expect(result.blockers.some((blocker) => blocker.includes("checksum manifest"))).toBe(true);
    expect(result.blockers.some((blocker) => blocker.includes("overlay package manifest"))).toBe(true);
    expect(result.blockers.some((blocker) => blocker.includes("binaryPayloadAllowed"))).toBe(true);
    expect(result.blockers.some((blocker) => blocker.includes("pathTraversalDetected"))).toBe(true);
    expect(result.blockers.some((blocker) => blocker.includes("unsafeAbsolutePathDetected"))).toBe(true);
    expect(result.blockers.some((blocker) => blocker.includes("repo/ or tools/"))).toBe(true);
  });

  it("blocks unsafe build, project, Git, shell, fleet, production, and self-governance powers", () => {
    const config = createDefaultPhaseZipValidatorV1();
    config.owner = "S.E.R.A.";
    config.phase100CPhaseOverlayZipBuilderReady = false;
    config.sourceOverlayZipId = "wrong-source";
    config.approvalRecord.selfApproved = true;
    config.phaseFactoryStages = config.phaseFactoryStages.filter((stage) => stage.phaseId !== "100H");
    config.roadmapTracks = config.roadmapTracks.filter((track) => track !== "phase-factory");
    config.multiLanguageProductionTargets = config.multiLanguageProductionTargets.filter((language) => language !== "Go");
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
    config.boundaries.productionDeploymentAllowed = true;
    const result = inspectPhaseZipValidatorV1(config);
    expect(result.ok).toBe(false);
    expect(result.blockers).toContain("Owner must be Tyler Wallace for Phase 100D phase ZIP validator.");
    expect(result.blockers).toContain("Phase 100C phase overlay ZIP builder must be ready before Phase 100D ZIP validation.");
    expect(result.blockers).toContain("Phase 100D must link to the Phase 100C source overlay package manifest.");
    expect(result.blockers).toContain("Self-approval is blocked for Phase 100D ZIP validation.");
    expect(result.blockers).toContain("Phase Factory stage is missing: 100H");
    expect(result.blockers).toContain("Roadmap track count must be 13.");
    expect(result.blockers).toContain("Multi-language production target is missing: Go");
    expect(result.blockers).toContain("overlayZipBuildAllowed must remain false");
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

  it("records validation failure evidence when ZIP validation package counts do not match expectations", () => {
    const artifactRoot = tempRoot("phase100d-phase-zip-validator-failure");
    const config = createDefaultPhaseZipValidatorV1({ expectedPhaseZipValidationPackageCount: 99 });
    const result = runPhaseZipValidatorV1(config, { artifactRoot });
    expect(result.ok).toBe(false);
    expect(result.validationFailedCount).toBe(1);
    expect(result.validationEvidencePacketProduced).toBe(false);
    expect(result.invalidPackageQuarantined).toBe(true);
    expect(result.projectRepoSourceMutated).toBe(false);
    expect(result.overlayZipBuilt).toBe(false);
    const packet = JSON.parse(fs.readFileSync(result.packetPath, "utf8"));
    expect(packet.status).toBe("phase-zip-validator-validation-failed");
    expect(packet.validationEvidencePacketProduced).toBe(false);
    expect(packet.validationManifest.invalidPackageQuarantined).toBe(true);
    expect(packet.checks.filter((check: { passed: boolean }) => !check.passed).length).toBe(0);
  });
});
