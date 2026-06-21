import { describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  createDefaultBranchReadinessProposalV1,
  inspectBranchReadinessV1,
} from "../../scripts/lib/branch-readiness-inspector-v1.mjs";

function createTempRoot() {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-phase34-"));
  for (const declaredPath of createDefaultBranchReadinessProposalV1().declaredPaths) {
    const fullPath = path.join(rootDir, declaredPath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, "phase34 fixture\n", "utf8");
  }
  return rootDir;
}

describe("Phase 34 Branch Readiness Inspector v1", () => {
  it("passes the default Phase 34 branch readiness proposal", () => {
    const rootDir = createTempRoot();
    const result = inspectBranchReadinessV1(createDefaultBranchReadinessProposalV1(), { rootDir });

    expect(result.ok).toBe(true);
    expect(result.status).toBe("passed");
    expect(result.readinessStatus).toBe("ready");
    expect(result.validationFailedCount).toBe(0);
    expect(result.blockers).toEqual([]);
    expect(result.declaredFileCount).toBe(4);
    expect(result.validationCommandCount).toBe(7);
    expect(result.evidenceRequirementCount).toBeGreaterThanOrEqual(12);
    expect(result.riskCheckCount).toBeGreaterThanOrEqual(9);
    expect(result.ownerApprovalGateCount).toBeGreaterThanOrEqual(4);
  });

  it("writes local readiness reports without paid providers or cloud", () => {
    const rootDir = createTempRoot();
    const result = inspectBranchReadinessV1(createDefaultBranchReadinessProposalV1(), { rootDir });

    expect(fs.existsSync(result.jsonPath)).toBe(true);
    expect(fs.existsSync(result.markdownPath)).toBe(true);
    expect(fs.existsSync(result.historyPath)).toBe(true);
    expect(result.localOnly).toBe(true);
    expect(result.paidProviderRequired).toBe(false);
    expect(result.cloudRequired).toBe(false);
    expect(result.freeCoreDependency).toBe(false);
  });

  it("blocks proposals that try to mutate source or self-approve", () => {
    const rootDir = createTempRoot();
    const proposal = {
      ...createDefaultBranchReadinessProposalV1(),
      mutatesSource: true,
      selfApprovesProposal: true,
    };
    const result = inspectBranchReadinessV1(proposal, { rootDir });

    expect(result.ok).toBe(false);
    expect(result.status).toBe("blocked");
    expect(result.readinessStatus).toBe("blocked");
    expect(result.blockers.join(" ")).toContain("mutatesSource must remain false");
    expect(result.blockers.join(" ")).toContain("selfApprovesProposal must remain false");
  });

  it("blocks unsafe branch names and unsafe declared paths", () => {
    const rootDir = createTempRoot();
    const proposal = {
      ...createDefaultBranchReadinessProposalV1(),
      branchName: "main",
      declaredPaths: [
        ...createDefaultBranchReadinessProposalV1().declaredPaths,
        "../outside.txt",
      ],
    };
    const result = inspectBranchReadinessV1(proposal, { rootDir });

    expect(result.ok).toBe(false);
    expect(result.blockers.join(" ")).toContain("protected base branch names");
    expect(result.blockers.join(" ")).toContain("safe and relative");
  });

  it("blocks incomplete validation command sets", () => {
    const rootDir = createTempRoot();
    const proposal = {
      ...createDefaultBranchReadinessProposalV1(),
      validationCommands: ["npm run phase34:demo"],
    };
    const result = inspectBranchReadinessV1(proposal, { rootDir });

    expect(result.ok).toBe(false);
    expect(result.validationFailedCount).toBeGreaterThan(0);
    expect(result.blockers.join(" ")).toContain("npm run verify");
  });
});
