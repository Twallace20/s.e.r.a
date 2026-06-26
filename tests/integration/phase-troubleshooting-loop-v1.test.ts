import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  createDefaultPhaseTroubleshootingLoopV1,
  inspectPhaseTroubleshootingLoopV1,
  runPhaseTroubleshootingLoopV1,
} from "../../scripts/lib/phase-troubleshooting-loop-v1.mjs";

function tempRoot(name: string) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `${name}-`));
}

describe("Phase 100F — Phase Troubleshooting Loop v1", () => {
  it("produces diagnostic and repair guidance evidence without autofixing, applying, patching, mutating, branching, merging, pushing, or tagging", () => {
    const artifactRoot = tempRoot("phase100f-phase-troubleshooting-loop");
    const result = runPhaseTroubleshootingLoopV1(createDefaultPhaseTroubleshootingLoopV1(), { artifactRoot });
    expect(result.ok).toBe(true);
    expect(result.phaseTroubleshootingStatus).toBe("phase-troubleshooting-loop-ready");
    expect(result.validationFailedCount).toBe(0);
    expect(result.phaseTroubleshootingAllowed).toBe(true);
    expect(result.phaseApplyQueueReadAllowed).toBe(true);
    expect(result.diagnosticEvidencePacketAllowed).toBe(true);
    expect(result.repairGuidanceAllowed).toBe(true);
    expect(result.autoFixAllowed).toBe(false);
    expect(result.applyExecutionAllowed).toBe(false);
    expect(result.patchExecutionAllowed).toBe(false);
    expect(result.projectRepoSourceMutationAllowed).toBe(false);
    expect(result.realProjectBranchCreationAllowed).toBe(false);
    expect(result.realProjectMergeExecutionAllowed).toBe(false);
    expect(result.gitPushAllowed).toBe(false);
    expect(result.tagCreationAllowed).toBe(false);
    expect(result.shellExecutionAllowed).toBe(false);
    expect(result.schedulerWorkflowMutationAllowed).toBe(false);
    expect(result.iPhoneAutomationMutationAllowed).toBe(false);
    expect(result.fleetExecutionAllowed).toBe(false);
    expect(result.awayModeExecutionAllowed).toBe(false);
    expect(result.selfApprovalAllowed).toBe(false);
    expect(result.selfMergeAllowed).toBe(false);
    expect(result.selfDeployAllowed).toBe(false);
    expect(result.productionDeploymentAllowed).toBe(false);
    expect(result.projectRepoSourceMutated).toBe(false);
    expect(result.autoFixExecuted).toBe(false);
    expect(result.applyExecuted).toBe(false);
    expect(result.patchExecuted).toBe(false);
    expect(result.troubleshootingPacketProduced).toBe(true);
    expect(result.diagnosticManifestProduced).toBe(true);
    expect(result.repairGuidanceManifestProduced).toBe(true);
    expect(result.readyForOwnerReview).toBe(true);
    expect(fs.existsSync(result.packetPath)).toBe(true);
    expect(fs.existsSync(result.diagnosticManifestPath)).toBe(true);
    expect(fs.existsSync(result.repairGuidanceManifestPath)).toBe(true);
  });

  it("requires Phase 100E lineage, owner approval, exact Phase Factory coverage, and multi-language doctrine", () => {
    const result = inspectPhaseTroubleshootingLoopV1(createDefaultPhaseTroubleshootingLoopV1());
    expect(result.ok).toBe(true);
    expect(result.declaredFileCount).toBe(5);
    expect(result.phaseTroubleshootingRequirementCount).toBe(34);
    expect(result.phaseTroubleshootingFieldCount).toBe(60);
    expect(result.phaseFactoryStageCount).toBe(8);
    expect(result.troubleshootingCaseCount).toBe(8);
    expect(result.roadmapTrackCount).toBe(13);
    expect(result.multiLanguageProductionTargetCount).toBe(18);
    expect(result.safetyGateCount).toBe(1680);
  });

  it("fails closed when unsafe troubleshooting case definitions are introduced", () => {
    const config = createDefaultPhaseTroubleshootingLoopV1();
    config.troubleshootingCases[0].phaseId = "101";
    config.troubleshootingCases[0].sourceApplyQueueId = "missing";
    config.troubleshootingCases[0].caseStatus = "fixed";
    config.troubleshootingCases[0].ownerReviewRequired = false;
    config.troubleshootingCases[0].autoFixAllowed = true;
    config.troubleshootingCases[0].applyExecutionAllowed = true;
    config.troubleshootingCases[0].sourceMutationAllowed = true;
    config.troubleshootingCases[0].evidenceLinks = ["../unsafe.txt"];
    const result = inspectPhaseTroubleshootingLoopV1(config);
    expect(result.ok).toBe(false);
    expect(result.blockers.some((blocker: string) => blocker.includes("phaseId"))).toBe(true);
    expect(result.blockers.some((blocker: string) => blocker.includes("source apply queue"))).toBe(true);
    expect(result.blockers.some((blocker: string) => blocker.includes("diagnostic-owner-review"))).toBe(true);
    expect(result.blockers.some((blocker: string) => blocker.includes("ownerReviewRequired"))).toBe(true);
    expect(result.blockers.some((blocker: string) => blocker.includes("autoFixAllowed"))).toBe(true);
    expect(result.blockers.some((blocker: string) => blocker.includes("applyExecutionAllowed"))).toBe(true);
    expect(result.blockers.some((blocker: string) => blocker.includes("sourceMutationAllowed"))).toBe(true);
    expect(result.blockers.some((blocker: string) => blocker.includes("safe relative path"))).toBe(true);
  });

  it("blocks unsafe autofix, apply, project, Git, shell, scheduler, fleet, and self-governance powers", () => {
    const config = createDefaultPhaseTroubleshootingLoopV1();
    config.boundaries.autoFixAllowed = true;
    config.boundaries.applyExecutionAllowed = true;
    config.boundaries.patchExecutionAllowed = true;
    config.boundaries.projectRepoSourceMutationAllowed = true;
    config.boundaries.realProjectBranchCreationAllowed = true;
    config.boundaries.realProjectMergeExecutionAllowed = true;
    config.boundaries.gitPushAllowed = true;
    config.boundaries.tagCreationAllowed = true;
    config.boundaries.arbitraryCommandAllowed = true;
    config.boundaries.shellExecutionAllowed = true;
    config.boundaries.schedulerWorkflowMutationAllowed = true;
    config.boundaries.iPhoneAutomationMutationAllowed = true;
    config.boundaries.fleetExecutionAllowed = true;
    config.boundaries.awayModeExecutionAllowed = true;
    config.boundaries.selfApprovalAllowed = true;
    config.boundaries.selfMergeAllowed = true;
    config.boundaries.selfDeployAllowed = true;
    config.boundaries.productionDeploymentAllowed = true;
    config.projectRepoSourceMutated = true;
    config.autoFixExecuted = true;
    config.applyExecuted = true;
    config.patchExecuted = true;
    const result = inspectPhaseTroubleshootingLoopV1(config);
    expect(result.ok).toBe(false);
    expect(result.blockers).toContain("autoFixAllowed must remain false");
    expect(result.blockers).toContain("applyExecutionAllowed must remain false");
    expect(result.blockers).toContain("patchExecutionAllowed must remain false");
    expect(result.blockers).toContain("projectRepoSourceMutationAllowed must remain false");
    expect(result.blockers).toContain("realProjectBranchCreationAllowed must remain false");
    expect(result.blockers).toContain("realProjectMergeExecutionAllowed must remain false");
    expect(result.blockers).toContain("gitPushAllowed must remain false");
    expect(result.blockers).toContain("tagCreationAllowed must remain false");
    expect(result.blockers).toContain("arbitraryCommandAllowed must remain false");
    expect(result.blockers).toContain("shellExecutionAllowed must remain false");
    expect(result.blockers).toContain("schedulerWorkflowMutationAllowed must remain false");
    expect(result.blockers).toContain("iPhoneAutomationMutationAllowed must remain false");
    expect(result.blockers).toContain("fleetExecutionAllowed must remain false");
    expect(result.blockers).toContain("awayModeExecutionAllowed must remain false");
    expect(result.blockers).toContain("selfApprovalAllowed must remain false");
    expect(result.blockers).toContain("selfMergeAllowed must remain false");
    expect(result.blockers).toContain("selfDeployAllowed must remain false");
    expect(result.blockers).toContain("productionDeploymentAllowed must remain false");
    expect(result.blockers).toContain("projectRepoSourceMutated must remain false");
    expect(result.blockers).toContain("autoFixExecuted must remain false");
    expect(result.blockers).toContain("applyExecuted must remain false");
    expect(result.blockers).toContain("patchExecuted must remain false");
  });

  it("records validation failure evidence when troubleshooting case counts do not match expectations", () => {
    const artifactRoot = tempRoot("phase100f-phase-troubleshooting-loop-failure");
    const config = createDefaultPhaseTroubleshootingLoopV1({ expectedTroubleshootingCaseCount: 99 });
    const result = runPhaseTroubleshootingLoopV1(config, { artifactRoot });
    expect(result.ok).toBe(false);
    expect(result.validationFailedCount).toBe(1);
    expect(result.troubleshootingPacketProduced).toBe(false);
    expect(result.readyForOwnerReview).toBe(false);
    expect(result.projectRepoSourceMutated).toBe(false);
    expect(result.autoFixExecuted).toBe(false);
    expect(result.applyExecuted).toBe(false);
    expect(result.patchExecuted).toBe(false);
    const packet = JSON.parse(fs.readFileSync(result.packetPath, "utf8"));
    expect(packet.status).toBe("phase-troubleshooting-loop-validation-failed");
    expect(packet.troubleshootingPacketProduced).toBe(false);
    expect(packet.repairGuidanceManifest.readyForOwnerReview).toBe(false);
    expect(packet.checks.filter((check: { passed: boolean }) => !check.passed).length).toBe(0);
  });
});
