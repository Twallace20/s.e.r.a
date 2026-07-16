import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const manifestPath = path.join(root, "architecture", "base-mvp-manifest.json");
const roadmapPath = path.join(root, "docs", "architecture", "SERA_EVOLUTION_ROADMAP_V1.md");

describe("Base MVP manifest v1", () => {
  it("exists, parses, and records canonical Milestone 13 closeout values", () => {
    expect(fs.existsSync(manifestPath)).toBe(true);
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

    expect(manifest).toEqual({
      schemaVersion: "sera.base-mvp-manifest.v1",
      totalMilestones: 16,
      completedMilestones: 13,
      remainingMilestones: 3,
      currentMilestone: 14,
      baseMvpCompletionMilestone: 16,
      currentCertification: "integrated-offline-loop-v1",
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
    expect(roadmap).toContain("completedMilestones: 13");
    expect(roadmap).toContain("remainingMilestones: 3");
    expect(roadmap).toContain("currentMilestone: 14");
    expect(roadmap).toContain("baseMvpCompletionMilestone: 16");
    expect(roadmap).toContain("Milestone 7 - Evaluation Engine: COMPLETE");
    expect(roadmap).toContain("Milestone 8 - Local Model Runtime: COMPLETE");
    expect(roadmap).toContain("Milestone 9 - Knowledge and Multimodal Intake: COMPLETE");
    expect(roadmap).toContain("Milestone 10 - Capability Engine and Recursive Learning: COMPLETE");
    expect(roadmap).toContain("Milestone 11 - Desktop Operator: COMPLETE");
    expect(roadmap).toContain("Milestone 12 - First Certified Studio: COMPLETE");
    expect(roadmap).toContain("Milestone 13 - Integrated Offline Loop: COMPLETE");

    expect(manifest.completedMilestones).toBe(13);
    expect(manifest.currentMilestone).toBe(14);
    expect(manifest.currentCertification).toBe("integrated-offline-loop-v1");
  });
});
