import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getDesktopVisualContract } from "@sera/desktop-operator";
import { DEFAULT_RUNTIME_STATE_MIGRATIONS } from "@sera/runtime-state";

const root = process.cwd();
const planPath = path.join(root, "architecture", "recurrence-prevention-innovation-plan-v1.json");
const manifestPath = path.join(root, "architecture", "base-mvp-manifest.json");
const planDocPath = path.join(root, "docs", "architecture", "EVIDENCE_DRIVEN_RECURRENCE_PREVENTION_AND_INNOVATION_V1.md");
const roadmapPath = path.join(root, "docs", "architecture", "SERA_EVOLUTION_ROADMAP_V1.md");
const desktopDocPath = path.join(root, "docs", "architecture", "DESKTOP_OPERATOR_V1.md");
const capabilityDocPath = path.join(root, "docs", "architecture", "CAPABILITY_ENGINE_RECURSIVE_LEARNING_V1.md");
const inventoryPath = path.join(root, "architecture", "capability-inventory.json");

function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(file, "utf8")) as T;
}

describe("Evidence-driven recurrence prevention and innovation plan v1", () => {
  it("plan schema is correct", () => {
    const plan = readJson<Record<string, unknown>>(planPath);
    expect(plan.schemaVersion).toBe("sera.recurrence-prevention-innovation-plan.v1");
    expect(plan.invariantId).toBe("evidence-driven-recurrence-prevention-and-innovation-v1");
  });

  it("invariant is active as an architecture lock", () => {
    const plan = readJson<{ status: string; effectiveMilestone: number }>(planPath);
    expect(plan.status).toBe("architecture-locked-learning-proof-certified");
    expect(plan.effectiveMilestone).toBe(11);
  });

  it("milestone total remains 16", () => {
    const manifest = readJson<{ totalMilestones: number; completedMilestones: number; remainingMilestones: number; currentMilestone: number; currentCertification: string }>(manifestPath);
    expect(manifest.totalMilestones).toBe(16);
    expect(manifest.completedMilestones).toBe(14);
    expect(manifest.remainingMilestones).toBe(2);
    expect(manifest.currentMilestone).toBe(15);
    expect(manifest.currentCertification).toBe("learning-generalization-recurrence-prevention-innovation-proof-v1");
  });

  it("Milestone 14 canonical name is exact", () => {
    const plan = readJson<{ milestone14CanonicalName: string }>(planPath);
    expect(plan.milestone14CanonicalName).toBe("Milestone 14 - Learning Generalization, Recurrence Prevention, and Innovation Proof");
    expect(fs.readFileSync(roadmapPath, "utf8")).toContain("Milestone 14 - Learning Generalization, Recurrence Prevention, and Innovation Proof");
  });

  it("Milestone 11 UI surfaces are declared", () => {
    const plan = readJson<{ milestoneAcceptanceGates: Record<string, { gates: string[] }> }>(planPath);
    const gates = plan.milestoneAcceptanceGates["11"].gates.join("\n");
    const visualContract = getDesktopVisualContract();
    expect(gates).toContain("known failure patterns");
    expect(gates).toContain("applicable lessons");
    expect(gates).toContain("innovation proposals");
    expect(visualContract.reservedGovernedSurfaces).toEqual([
      "known-failure-patterns",
      "applicable-lessons",
      "prevention-warnings",
      "certified-alternatives",
      "operator-overrides",
      "superseded-lessons",
      "improvement-proposals",
      "innovation-proposals",
      "supporting-evidence",
      "applicability-explanations",
      "non-applicability-explanations",
      "learning-sessions",
      "failure-records",
      "evidence-chains",
      "context-fingerprints",
      "hypotheses",
      "repair-candidates",
      "reproductions",
      "lesson-versions",
      "scope-and-non-applicability",
      "certification-status",
      "activation-status",
      "prevention-rules",
      "related-context-warnings",
      "out-of-scope-explanations",
      "superseded-versions",
      "overrides",
      "improvement-comparisons",
      "innovation-status",
      "promotion-and-rollback-evidence",
      "lifecycle-events"
    ]);
  });

  it("Milestone 12 correction-signal gate is declared", () => {
    const plan = readJson<{ milestoneAcceptanceGates: Record<string, { gates: string[] }> }>(planPath);
    expect(plan.milestoneAcceptanceGates["12"].gates.join("\n")).toContain("operator corrections");
    expect(plan.milestoneAcceptanceGates["12"].gates.join("\n")).toContain("does not automatically promote interaction history");
  });

  it("Milestone 13 learning-preflight gate is declared", () => {
    const plan = readJson<{ milestoneAcceptanceGates: Record<string, { gates: string[] }> }>(planPath);
    expect(plan.milestoneAcceptanceGates["13"].gates.join("\n")).toContain("learning preflight");
    expect(plan.milestoneAcceptanceGates["13"].gates.join("\n")).toContain("certified alternatives");
  });

  it("Milestone 14 controlled-failure proof is declared", () => {
    const plan = readJson<{ milestoneAcceptanceGates: Record<string, { acceptanceProof: string[] }> }>(planPath);
    expect(plan.milestoneAcceptanceGates["14"].acceptanceProof).toContain("controlled failure");
    expect(plan.milestoneAcceptanceGates["14"].acceptanceProof).toContain("proof that model output does not automatically become a lesson");
  });

  it("equivalent-context recurrence prevention is required", () => {
    const plan = readJson<{ contextMatchingPolicy: Record<string, string> }>(planPath);
    expect(plan.contextMatchingPolicy.exactOrMateriallyEquivalent).toContain("prevention behavior required");
  });

  it("related-context generalization is required", () => {
    const plan = readJson<{ contextMatchingPolicy: Record<string, string> }>(planPath);
    expect(plan.contextMatchingPolicy.relatedButDifferent).toContain("scoped application");
  });

  it("out-of-scope non-application is required", () => {
    const plan = readJson<{ contextMatchingPolicy: Record<string, string> }>(planPath);
    expect(plan.contextMatchingPolicy.outOfScope).toContain("must not be incorrectly blocked");
  });

  it("model output cannot automatically become a lesson", () => {
    const plan = readJson<{ prohibitedShortcuts: string[]; architecturalPrinciples: string[] }>(planPath);
    expect(plan.architecturalPrinciples.join("\n")).toContain("Model output is candidate intelligence only");
    expect(plan.prohibitedShortcuts.join("\n")).toContain("model-generated statement cannot become an active lesson");
  });

  it("operator override requires governance", () => {
    const plan = readJson<{ operatorOverridePolicy: { requiresGovernance: boolean; authority: string; requires: string[] } }>(planPath);
    expect(plan.operatorOverridePolicy.requiresGovernance).toBe(true);
    expect(plan.operatorOverridePolicy.authority).toBe("Control Plane");
    expect(plan.operatorOverridePolicy.requires).toContain("evidence");
  });

  it("lesson supersession preserves history", () => {
    const plan = readJson<{ lessonLifecycle: { historyPolicy: string } }>(planPath);
    expect(plan.lessonLifecycle.historyPolicy).toContain("not silently erased");
    expect(plan.lessonLifecycle.historyPolicy).toContain("rejected lessons remain inspectable");
  });

  it("innovation remains distinct from learning", () => {
    const plan = readJson<{ innovationLifecycle: { distinctFromLearning: boolean } }>(planPath);
    expect(plan.innovationLifecycle.distinctFromLearning).toBe(true);
  });

  it("innovation requires certification and promotion", () => {
    const plan = readJson<{ innovationLifecycle: { requires: string[]; activationPolicy: string } }>(planPath);
    expect(plan.innovationLifecycle.requires).toContain("certification");
    expect(plan.innovationLifecycle.requires).toContain("explicit promotion");
    expect(plan.innovationLifecycle.activationPolicy).toContain("cannot activate itself");
  });

  it("Milestone 15 restart persistence is required", () => {
    const plan = readJson<{ milestoneAcceptanceGates: Record<string, { gates: string[] }> }>(planPath);
    expect(plan.milestoneAcceptanceGates["15"].gates.join("\n")).toContain("persist after restart");
    expect(plan.milestoneAcceptanceGates["15"].gates.join("\n")).toContain("no public internet");
  });

  it("Milestone 16 user-visible recurrence-prevention proof is required", () => {
    const plan = readJson<{ milestone16PortableAcceptanceScenario: string[] }>(planPath);
    expect(plan.milestone16PortableAcceptanceScenario).toContain("certified-lesson retrieval");
    expect(plan.milestone16PortableAcceptanceScenario).toContain("visible explanation and evidence in Desktop Operator");
  });

  it("Control Plane authority is preserved", () => {
    const plan = readJson<{ operatorOverridePolicy: { authority: string }; architecturalPrinciples: string[]; postBaseMvpContinuationPolicy: { requires: string[] } }>(planPath);
    expect(plan.operatorOverridePolicy.authority).toBe("Control Plane");
    expect(plan.architecturalPrinciples.join("\n")).toContain("Control Plane retains promotion and override authority");
    expect(plan.postBaseMvpContinuationPolicy.requires.join("\n")).toContain("Control Plane remains promotion and override authority");
  });

  it("no milestone count expansion occurred and Milestone 14 migration was added", () => {
    const manifest = readJson<{ totalMilestones: number }>(manifestPath);
    expect(manifest.totalMilestones).toBe(16);
    expect(DEFAULT_RUNTIME_STATE_MIGRATIONS).toHaveLength(11);
    expect(DEFAULT_RUNTIME_STATE_MIGRATIONS[7]?.name).toBe("desktop_operator_v1");
    expect(DEFAULT_RUNTIME_STATE_MIGRATIONS[8]?.name).toBe("first_certified_studio_v1");
    expect(DEFAULT_RUNTIME_STATE_MIGRATIONS[9]?.name).toBe("integrated_offline_loop_v1");
    expect(DEFAULT_RUNTIME_STATE_MIGRATIONS.at(-1)?.name).toBe("learning_governance_runtime_v1");
  });

  it("documentation and inventory mark Milestone 14 learning governance as implemented without Milestone 15 activation", () => {
    const combined = [
      fs.readFileSync(planPath, "utf8"),
      fs.readFileSync(planDocPath, "utf8"),
      fs.readFileSync(desktopDocPath, "utf8"),
      fs.readFileSync(capabilityDocPath, "utf8"),
      fs.readFileSync(inventoryPath, "utf8")
    ].join("\n");

    expect(combined).toContain("Integrated Offline Loop");
    expect(combined).toContain("Learning Generalization, Recurrence Prevention, and Innovation Proof");
    expect(combined).toContain("ui-contract-reserved-runtime-pending");
    expect(combined).toContain("future-acceptance-locked");
    const inventory = readJson<{ targetSubsystems: Array<{ id: string; targetLayer: string; currentMaturity: string; status: string }> }>(inventoryPath);
    expect(inventory.targetSubsystems.some((item) => item.id === "recurrence-prevention" && item.targetLayer === "Runtime" && item.currentMaturity === "implemented" && item.status === "certified")).toBe(true);
  });
});
