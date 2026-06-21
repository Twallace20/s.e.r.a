import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

async function loadBuilder() {
  return await import("../../scripts/lib/branch-proposal-builder-v1.mjs");
}

function tempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "sera-branch-proposal-builder-test-"));
}

describe("Branch Proposal Builder v1", () => {
  it("initializes local branch proposal runtime artifacts", async () => {
    const root = tempRoot();
    const { BranchProposalBuilderV1 } = await loadBuilder();
    const builder = new BranchProposalBuilderV1({ rootDir: root });
    const init = builder.initialize();

    expect(init.ok).toBe(true);
    expect(fs.existsSync(init.eventPath)).toBe(true);
    expect(fs.existsSync(init.proposalDir)).toBe(true);
    expect(fs.existsSync(init.reportDir)).toBe(true);
  });

  it("creates a default branch proposal from a generated phase packet", async () => {
    const root = tempRoot();
    const { BranchProposalBuilderV1 } = await loadBuilder();
    const builder = new BranchProposalBuilderV1({ rootDir: root });
    builder.initialize();
    const proposal = builder.createDefaultProposal();

    expect(proposal.proposalVersion).toBe(1);
    expect(proposal.phaseId).toBe("phase-33-branch-proposal-builder-v1");
    expect(proposal.branchName).toBe("phase-33-branch-proposal-builder-v1");
    expect(proposal.packetInput.sourcePhase).toBe("phase-32-phase-packet-generator-v1");
    expect(proposal.declaredFiles.length).toBeGreaterThanOrEqual(4);
    expect(fs.existsSync(builder.defaultProposalPath)).toBe(true);
  });

  it("validates branch name, declared files, commands, risks, and owner gates", async () => {
    const root = tempRoot();
    const { BranchProposalBuilderV1 } = await loadBuilder();
    const builder = new BranchProposalBuilderV1({ rootDir: root });
    builder.initialize();
    const proposal = builder.createDefaultProposal();
    const validation = builder.validateProposal(proposal);

    expect(validation.ok).toBe(true);
    expect(validation.failedCount).toBe(0);
    expect(proposal.validationCommands).toContain("npm run phase33:verify");
    expect(proposal.evidenceRequirements.length).toBeGreaterThanOrEqual(10);
    expect(proposal.riskChecks).toContain("proposal does not create a branch");
    expect(proposal.ownerApprovalGates.length).toBeGreaterThanOrEqual(3);
  });

  it("summarizes proposal readiness without granting branch, pull request, execution, or self-approval authority", async () => {
    const root = tempRoot();
    const { BranchProposalBuilderV1 } = await loadBuilder();
    const builder = new BranchProposalBuilderV1({ rootDir: root });
    builder.initialize();
    const proposal = builder.createDefaultProposal();
    const validation = builder.validateProposal(proposal);
    const summary = builder.summarizeProposal(proposal, validation);

    expect(summary.ok).toBe(true);
    expect(summary.proposalActivationAllowed).toBe(false);
    expect(summary.createsBranches).toBe(false);
    expect(summary.pushesBranches).toBe(false);
    expect(summary.opensPullRequests).toBe(false);
    expect(summary.executesProposal).toBe(false);
    expect(summary.selfApprovesProposal).toBe(false);
    expect(summary.ownerApprovalRequiredForBranchCreation).toBe(true);
  });

  it("writes branch proposal evidence reports without paid providers, cloud, secrets, branch mutation, pull requests, patches, execution, or source mutation", async () => {
    const root = tempRoot();
    const { BranchProposalBuilderV1 } = await loadBuilder();
    const builder = new BranchProposalBuilderV1({ rootDir: root });
    const summary = builder.writeSummaryArtifacts();

    expect(summary.ok).toBe(true);
    expect(summary.paidProviderRequired).toBe(false);
    expect(summary.cloudRequired).toBe(false);
    expect(summary.requiresSecrets).toBe(false);
    expect(summary.mutatesSource).toBe(false);
    expect(summary.executesArbitraryCode).toBe(false);
    expect(summary.performsNetworkRefresh).toBe(false);
    expect(summary.createsBranches).toBe(false);
    expect(summary.switchesBranches).toBe(false);
    expect(summary.pushesBranches).toBe(false);
    expect(summary.opensPullRequests).toBe(false);
    expect(summary.appliesPatches).toBe(false);
    expect(fs.existsSync(summary.jsonPath)).toBe(true);
    expect(fs.existsSync(summary.markdownPath)).toBe(true);
    expect(fs.existsSync(summary.historyPath)).toBe(true);
  });
});
