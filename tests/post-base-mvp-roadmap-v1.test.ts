import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const roadmapPath = path.join(root, "architecture", "post-base-mvp-roadmap-v1.json");
const manifestPath = path.join(root, "architecture", "base-mvp-manifest.json");
const docPath = path.join(root, "docs", "architecture", "SERA_PERSONAL_PROFESSIONAL_V1_ROADMAP.md");

type Roadmap = {
  schemaVersion: string;
  status: string;
  baseMvpCompletionMilestone: number;
  personalProfessionalV1CompletionMilestone: number;
  milestoneRange: { start: number; end: number; status: string };
  milestones: Array<{ number: number; name: string; status: string; requires: string[]; boundary?: string; nonGuarantees?: string[] }>;
  milestoneNonGuarantees: string[];
  completionDefinitions: {
    afterMilestone24: { continuationStatement: string };
  };
  futureExpansionCategories: string[];
  integrityRequirements: string[];
};

function readRoadmap(): Roadmap {
  return JSON.parse(fs.readFileSync(roadmapPath, "utf8")) as Roadmap;
}

function readManifest(): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(manifestPath, "utf8")) as Record<string, unknown>;
}

function milestone(number: number) {
  const found = readRoadmap().milestones.find((item) => item.number === number);
  expect(found).toBeTruthy();
  return found!;
}

function requires(number: number, text: string) {
  expect(milestone(number).requires).toContain(text);
}

describe("Post-Base MVP roadmap v1", () => {
  it("uses the canonical post-Base roadmap schema", () => {
    expect(readRoadmap().schemaVersion).toBe("sera.post-base-mvp-roadmap.v1");
  });

  it("preserves the 16-milestone Base MVP and Milestone 16 completion", () => {
    const manifest = readManifest();
    const roadmap = readRoadmap();
    expect(manifest.totalMilestones).toBe(16);
    expect(manifest.baseMvpCompletionMilestone).toBe(16);
    expect(roadmap.baseMvpCompletionMilestone).toBe(16);
  });

  it("sets Personal and Professional V1 completion at Milestone 24", () => {
    expect(readRoadmap().personalProfessionalV1CompletionMilestone).toBe(24);
  });

  it("declares exactly planned milestones 17 through 24", () => {
    const roadmap = readRoadmap();
    expect(roadmap.milestoneRange).toEqual({ start: 17, end: 24, status: "planned-only" });
    expect(roadmap.milestones.map((item) => item.number)).toEqual([17, 18, 19, 20, 21, 22, 23, 24]);
    expect(roadmap.milestones.every((item) => item.status === "planned")).toBe(true);
  });

  it("requires real-world pilot evidence in Milestone 17", () => {
    requires(17, "real operator projects");
    requires(17, "actual local models");
    requires(17, "failure and improvement evidence");
    requires(17, "release-blocking defect resolution");
  });

  it("requires nontechnical operation, updates, rollback, backup, and restore in Milestone 18", () => {
    requires(18, "no terminal requirement for ordinary use");
    requires(18, "application updates");
    requires(18, "release rollback");
    requires(18, "backup");
    requires(18, "restore");
  });

  it("requires actual local models and multimodal processing in Milestone 19", () => {
    requires(19, "real local general model");
    requires(19, "reasoning model");
    requires(19, "vision-capable model");
    requires(19, "PDF extraction");
    requires(19, "OCR");
    requires(19, "audio transcription");
  });

  it("requires multiple professional Studios in Milestone 20", () => {
    requires(20, "Evidence and Research Studio");
    requires(20, "Website Studio");
    requires(20, "Business Documentation Studio");
    requires(20, "Data and Reporting Studio");
    requires(20, "one additional selected professional Studio");
  });

  it("requires Fiverr-style workflows and preserves human approval in Milestone 21", () => {
    requires(21, "client intake");
    requires(21, "professional export packages");
    requires(21, "client-data separation");
    requires(21, "human approval before external communication or delivery");
  });

  it("requires governed web access and forbids silent browsing in Milestone 22", () => {
    requires(22, "per-task network authorization");
    requires(22, "browser isolation");
    requires(22, "domain approval");
    requires(22, "no silent browsing");
  });

  it("requires secure iOS companion without claiming complete Runtime on iPhone", () => {
    requires(23, "secure device pairing");
    requires(23, "revocable device credentials");
    requires(23, "lost-device revocation");
    expect(milestone(23).boundary).toContain("complete Runtime remains on the desktop");
    expect(milestone(23).nonGuarantees).toContain("does not promise the complete S.E.R.A. Runtime running entirely on iPhone");
  });

  it("requires nontechnical installation and real professional project proof in Milestone 24", () => {
    requires(24, "nontechnical installation without Git or Codex");
    requires(24, "one real Fiverr-style project from intake to delivery package");
    requires(24, "distributable versioned Personal and Professional V1 release");
  });

  it("requires recurrence, mobile supervision, update, backup, clean uninstall, and release proof in Milestone 24", () => {
    requires(24, "recurrence-prevention demonstration");
    requires(24, "iPhone request and supervision");
    requires(24, "update and rollback");
    requires(24, "backup and restore");
    requires(24, "clean installation and uninstall");
    requires(24, "distributable versioned Personal and Professional V1 release");
  });

  it("records explicit non-guarantees", () => {
    const nonGuarantees = readRoadmap().milestoneNonGuarantees;
    expect(nonGuarantees).toContain("universal expertise");
    expect(nonGuarantees).toContain("zero mistakes");
    expect(nonGuarantees).toContain("unattended business authority");
    expect(nonGuarantees).toContain("enterprise multi-user deployment");
    expect(nonGuarantees).toContain("distributed Hive Mode");
    expect(nonGuarantees).toContain("robotics");
  });

  it("tracks the current Base MVP manifest without changing total milestones", () => {
    expect(readManifest()).toEqual({
      schemaVersion: "sera.base-mvp-manifest.v1",
      totalMilestones: 16,
      completedMilestones: 15,
      remainingMilestones: 1,
      currentMilestone: 16,
      baseMvpCompletionMilestone: 16,
      currentCertification: "fresh-process-offline-restart-relocated-root-lesson-persistence-proof-v1",
      architectureBranch: "architecture/local-autonomous-runtime-v1"
    });
  });

  it("states that additional Milestone 13 and post-Base Runtime behavior are not implemented by this lock", () => {
    const requirements = readRoadmap().integrityRequirements;
    expect(requirements).toContain("No additional Milestone 13 behavior is implemented by this post-Base roadmap lock.");
    expect(requirements).toContain("No post-Base Runtime behavior is implemented by this roadmap lock.");
    expect(requirements).toContain("No SQLite migration is added by this roadmap lock.");
  });

  it("permits post-Milestone-24 expansion and preserves the continuation statement", () => {
    const roadmap = readRoadmap();
    expect(roadmap.futureExpansionCategories).toEqual([
      "capability expansion",
      "device expansion",
      "domain expansion",
      "enterprise expansion",
      "robotics expansion",
      "distributed-system expansion",
      "autonomy expansion"
    ]);
    expect(roadmap.completionDefinitions.afterMilestone24.continuationStatement).toBe("After Milestone 24, we choose what S.E.R.A. learns next.");
  });

  it("documents the same completion statement for human review", () => {
    const doc = fs.readFileSync(docPath, "utf8");
    expect(doc).toContain("Base MVP completion remains Milestone 16");
    expect(doc).toContain("Personal and Professional V1 completion is Milestone 24");
    expect(doc).toContain("After Milestone 24, we choose what S.E.R.A. learns next.");
  });
});
