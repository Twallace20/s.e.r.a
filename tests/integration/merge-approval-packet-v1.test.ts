import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  createDefaultMergeApprovalPacketV1,
  inspectMergeApprovalPacketV1,
  runMergeApprovalPacketV1,
} from "../../scripts/lib/merge-approval-packet-v1.mjs";

function tempRoot(name: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `sera-${name}-`));
}

describe("Phase 98 — Merge Approval Packet v1", () => {
  it("passes when owner-approved merge packet generation is app-bound", () => {
    const result = inspectMergeApprovalPacketV1(createDefaultMergeApprovalPacketV1());
    expect(result.ok).toBe(true);
    expect(result.mergeApprovalPacketStatus).toBe("merge-approval-packet-ready");
    expect(result.declaredFileCount).toBe(5);
    expect(result.mergeApprovalPacketRequirementCount).toBe(28);
    expect(result.mergeApprovalPacketFieldCount).toBe(44);
    expect(result.approvedMergeApprovalPacketCount).toBe(4);
    expect(result.multiLanguageProductionTargetCount).toBe(18);
    expect(result.safetyGateCount).toBe(1200);
    expect(result.mergeApprovalPacketAllowed).toBe(true);
    expect(result.branchValidationEvidenceReadAllowed).toBe(true);
    expect(result.evidenceWritingAllowed).toBe(true);
    expect(result.mergeReadinessChecklistAllowed).toBe(true);
    expect(result.projectRepoSourceMutationAllowed).toBe(false);
    expect(result.gitPushAllowed).toBe(false);
    expect(result.mergeExecutionAllowed).toBe(false);
    expect(result.tagCreationAllowed).toBe(false);
    expect(result.selfApprovalAllowed).toBe(false);
  });

  it("writes a merge approval packet from approved Phase 97 validation evidence", () => {
    const artifactRoot = tempRoot("phase98-merge-approval-packet");
    const result = runMergeApprovalPacketV1(createDefaultMergeApprovalPacketV1(), { artifactRoot });
    expect(result.ok).toBe(true);
    expect(result.mergeReady).toBe(true);
    expect(result.validationFailedCount).toBe(0);
    expect(result.mergeApprovalPacketId).toBe("phase98-demo-merge-approval-packet");
    expect(result.targetBranch).toBe("work/phase-96-demo-branch-edit-executor");
    expect(result.targetFile).toBe("src/phase96-demo.ts");
    expect(result.mergeExecutionPerformed).toBe(false);
    expect(result.projectRepoSourceMutated).toBe(false);
    expect(fs.existsSync(result.packetPath)).toBe(true);
    const packet = JSON.parse(fs.readFileSync(result.packetPath, "utf8"));
    expect(packet.mergeReady).toBe(true);
    expect(packet.finalOwnerMergeApprovalRequired).toBe(true);
    expect(packet.mergeExecutionPerformed).toBe(false);
    expect(packet.gitPushUsed).toBe(false);
    expect(packet.evidenceManifest.priorPhaseChain).toContain("Phase 97");
  });

  it("blocks missing owner approval and self approval", () => {
    const missingApproval = createDefaultMergeApprovalPacketV1({ approvalRecord: { approved: false } });
    const missingResult = inspectMergeApprovalPacketV1(missingApproval);
    expect(missingResult.ok).toBe(false);
    expect(missingResult.blockers).toContain("Owner approval record must be approved.");

    const selfApproval = createDefaultMergeApprovalPacketV1({ approvalRecord: { selfApproved: true } });
    const selfResult = inspectMergeApprovalPacketV1(selfApproval);
    expect(selfResult.ok).toBe(false);
    expect(selfResult.blockers).toContain("Self-approval is blocked for merge approval packets.");
  });

  it("does not mark merge ready when validation evidence has not passed", () => {
    const artifactRoot = tempRoot("phase98-merge-approval-packet-failure");
    const config = createDefaultMergeApprovalPacketV1();
    config.approvedMergeApprovalPackets[0].validationPassed = false;
    const result = runMergeApprovalPacketV1(config, { artifactRoot });
    expect(result.ok).toBe(false);
    expect(result.mergeReady).toBe(false);
    expect(result.validationFailedCount).toBe(1);
    const packet = JSON.parse(fs.readFileSync(result.packetPath, "utf8"));
    expect(packet.status).toBe("merge-approval-packet-not-ready");
    expect(packet.mergeReadinessChecklist.filter((check: { passed: boolean }) => !check.passed).length).toBe(1);
    expect(packet.mergeExecutionPerformed).toBe(false);
  });

  it("fails closed when unsafe merge powers or packet definitions are introduced", () => {
    const config = createDefaultMergeApprovalPacketV1();
    config.owner = "S.E.R.A.";
    config.approvalRecord.selfApproved = true;
    config.approvedMergeApprovalPackets[0].targetBranch = "main";
    config.approvedMergeApprovalPackets[0].baseRef = "develop";
    config.approvedMergeApprovalPackets[0].sourceBranchPlanId = "";
    config.approvedMergeApprovalPackets[0].sourceBranchCreationPlanId = "";
    config.approvedMergeApprovalPackets[0].sourceBranchEditPlanId = "";
    config.approvedMergeApprovalPackets[0].sourceValidationSuiteId = "";
    config.approvedMergeApprovalPackets[0].targetFile = "../escape.ts";
    config.approvedMergeApprovalPackets[0].requiredChecks = [];
    config.approvedMergeApprovalPackets[0].mergeStrategy = "self-merge";
    config.multiLanguageProductionTargets = config.multiLanguageProductionTargets.filter((language) => language !== "Rust");
    config.boundaries.projectRepoSourceMutationAllowed = true;
    config.boundaries.branchWorkspaceMutationAllowed = true;
    config.boundaries.localGitBranchCreationAllowed = true;
    config.boundaries.remoteGitBranchCreationAllowed = true;
    config.boundaries.gitPushAllowed = true;
    config.boundaries.mergeExecutionAllowed = true;
    config.boundaries.tagCreationAllowed = true;
    config.boundaries.arbitraryCommandAllowed = true;
    config.boundaries.shellExecutionAllowed = true;
    config.boundaries.selfApprovalAllowed = true;
    config.boundaries.selfMergeAllowed = true;
    const result = inspectMergeApprovalPacketV1(config);
    expect(result.ok).toBe(false);
    expect(result.blockers).toContain("Owner must be Tyler Wallace for Phase 98 merge approval packet generation.");
    expect(result.blockers).toContain("Self-approval is blocked for merge approval packets.");
    expect(result.blockers).toContain("Merge approval packet target branch must be safe and work/ scoped: phase98-demo-merge-approval-packet");
    expect(result.blockers).toContain("Merge approval packet base ref must be main: phase98-demo-merge-approval-packet");
    expect(result.blockers).toContain("Merge approval packet must name sourceBranchPlanId: phase98-demo-merge-approval-packet");
    expect(result.blockers).toContain("Merge approval packet must name sourceValidationSuiteId: phase98-demo-merge-approval-packet");
    expect(result.blockers).toContain("Merge approval packet target file must be safe and relative: phase98-demo-merge-approval-packet");
    expect(result.blockers).toContain("Merge approval packet must include required checks: phase98-demo-merge-approval-packet");
    expect(result.blockers).toContain("Enabled merge packet strategy must be no-ff-owner-reviewed: phase98-demo-merge-approval-packet");
    expect(result.blockers).toContain("Multi-language production doctrine must include 18 useful language targets.");
    expect(result.blockers).toContain("Multi-language production target is missing: Rust");
    expect(result.blockers).toContain("projectRepoSourceMutationAllowed must remain false");
    expect(result.blockers).toContain("gitPushAllowed must remain false");
    expect(result.blockers).toContain("mergeExecutionAllowed must remain false");
    expect(result.blockers).toContain("tagCreationAllowed must remain false");
    expect(result.blockers).toContain("arbitraryCommandAllowed must remain false");
    expect(result.blockers).toContain("shellExecutionAllowed must remain false");
    expect(result.blockers).toContain("selfApprovalAllowed must remain false");
    expect(result.blockers).toContain("selfMergeAllowed must remain false");
  });
});
