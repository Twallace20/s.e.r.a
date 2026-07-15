import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const manifestPath = path.join(root, "architecture", "base-mvp-manifest.json");
const roadmapPath = path.join(root, "docs", "architecture", "SERA_EVOLUTION_ROADMAP_V1.md");

describe("Base MVP manifest v1", () => {
  it("exists, parses, and records canonical Milestone 6 closeout values", () => {
    expect(fs.existsSync(manifestPath)).toBe(true);
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

    expect(manifest).toEqual({
      schemaVersion: "sera.base-mvp-manifest.v1",
      totalMilestones: 16,
      completedMilestones: 6,
      remainingMilestones: 10,
      currentMilestone: 7,
      baseMvpCompletionMilestone: 16,
      currentCertification: "isolated-execution-v1",
      architectureBranch: "architecture/local-autonomous-runtime-v1"
    });
  });

  it("keeps milestone arithmetic internally consistent", () => {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

    expect(manifest.completedMilestones + manifest.remainingMilestones).toBe(manifest.totalMilestones);
    expect(manifest.currentMilestone).toBe(manifest.completedMilestones + 1);
    expect(manifest.baseMvpCompletionMilestone).toBe(manifest.totalMilestones);
  });

  it("matches the roadmap milestone status", () => {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    const roadmap = fs.readFileSync(roadmapPath, "utf8");

    expect(roadmap).toContain("totalMilestones: 16");
    expect(roadmap).toContain("completedMilestones: 6");
    expect(roadmap).toContain("remainingMilestones: 10");
    expect(roadmap).toContain("currentMilestone: 7");
    expect(roadmap).toContain("baseMvpCompletionMilestone: 16");
    expect(roadmap).toContain("Milestone 6 - Isolated Execution Engine: COMPLETE");
    expect(roadmap).toContain("Milestone 7 - Evaluation Engine: NEXT");

    expect(manifest.completedMilestones).toBe(6);
    expect(manifest.currentMilestone).toBe(7);
    expect(manifest.currentCertification).toBe("isolated-execution-v1");
  });
});
