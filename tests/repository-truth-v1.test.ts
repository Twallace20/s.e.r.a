import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { runRepositorySnapshot } from "@sera/repository-snapshot";
import { runRepositoryTruth } from "@sera/repository-truth";

const clock = { now: () => new Date("2026-07-14T12:00:00.000Z") };

describe("Repository Truth v1", () => {
  it("writes required deterministic truth outputs from refreshed Repository Snapshot evidence", () => {
    const root = createTruthFixture();
    const result = runRepositoryTruth({ repositoryRoot: root, clock });
    expect(result.ok).toBe(true);
    expect(result.sourceSnapshotId).toBeTruthy();
    const required = ["truth.json", "components.json", "dependency-graph.json", "test-ownership.json", "findings.json", "classifications.json", "summary.json"];
    for (const name of required) {
      const outputPath = path.join(root, ".sera", "repository-truth", name);
      expect(fs.existsSync(outputPath)).toBe(true);
      const parsed = JSON.parse(fs.readFileSync(outputPath, "utf8"));
      expect(parsed.schemaVersion).toBe("sera.repository-truth.v1");
      expect(JSON.stringify(parsed)).not.toContain(root);
      expect(parsed.modelUse ?? false).toBe(false);
      expect(parsed.networkUse ?? false).toBe(false);
    }
    const summary = read(root, "summary.json");
    expect(summary.refreshedSnapshotFirst).toBe(true);
    expect(summary.generatedPaths).toContain(".sera/repository-truth/truth.json");
    expect(summary.componentCountsByLayer.runtime).toBeGreaterThan(0);
  });

  it("can consume an existing validated snapshot without refreshing it", () => {
    const root = createTruthFixture();
    const snapshot = runRepositorySnapshot({ repositoryRoot: root, clock });
    expect(snapshot.ok).toBe(true);
    const before = fs.readFileSync(path.join(root, ".sera", "repository", "summary.json"), "utf8");
    const result = runRepositoryTruth({ repositoryRoot: root, refreshSnapshot: false, clock });
    const after = fs.readFileSync(path.join(root, ".sera", "repository", "summary.json"), "utf8");
    expect(result.ok).toBe(true);
    expect(before).toBe(after);
    expect(read(root, "summary.json").refreshedSnapshotFirst).toBe(false);
  });

  it("blocks incomplete, mixed, or hash-mismatched snapshot sources honestly", () => {
    const root = createTruthFixture();
    runRepositorySnapshot({ repositoryRoot: root, clock });
    fs.unlinkSync(path.join(root, ".sera", "repository", "packages.json"));
    expect(runRepositoryTruth({ repositoryRoot: root, refreshSnapshot: false, clock }).status).toBe("BLOCKED");

    runRepositorySnapshot({ repositoryRoot: root, clock });
    const summaryPath = path.join(root, ".sera", "repository", "summary.json");
    const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
    summary.snapshotId = "mixed";
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2), "utf8");
    expect(runRepositoryTruth({ repositoryRoot: root, refreshSnapshot: false, clock }).status).toBe("BLOCKED");

    runRepositorySnapshot({ repositoryRoot: root, clock });
    const snapshotPathForMembership = path.join(root, ".sera", "repository", "snapshot.json");
    const snapshotForMembership = JSON.parse(fs.readFileSync(snapshotPathForMembership, "utf8"));
    snapshotForMembership.outputFileManifest = snapshotForMembership.outputFileManifest.filter((entry: string) => !entry.endsWith("tests.json"));
    fs.writeFileSync(snapshotPathForMembership, JSON.stringify(snapshotForMembership, null, 2), "utf8");
    const missingMember = runRepositoryTruth({ repositoryRoot: root, refreshSnapshot: false, clock });
    expect(missingMember.status).toBe("BLOCKED");
    expect(missingMember.message).toContain("manifest is missing required member");

    runRepositorySnapshot({ repositoryRoot: root, clock });
    const snapshotPath = path.join(root, ".sera", "repository", "snapshot.json");
    const snapshot = JSON.parse(fs.readFileSync(snapshotPath, "utf8"));
    snapshot.outputFileManifest = ["snapshot.json", "workspaces.json", "packages.json", "scripts.json", "tests.json", "references.json", "documents.json", "summary.json"].map((name) => ({
      path: `.sera/repository/${name}`,
      sha256: name === "summary.json" ? "not-real" : sha256File(path.join(root, ".sera", "repository", name))
    }));
    fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2), "utf8");
    const badHash = runRepositoryTruth({ repositoryRoot: root, refreshSnapshot: false, clock });
    expect(badHash.status).toBe("BLOCKED");
    expect(badHash.message).toContain("hash mismatch");
  });

  it("records dependency graph facts, cycles, unresolved refs, and upward layer findings", () => {
    const root = createTruthFixture();
    const result = runRepositoryTruth({ repositoryRoot: root, clock });
    expect(result.ok).toBe(true);
    const graph = read(root, "dependency-graph.json");
    expect(graph.edges.some((edge: any) => edge.edgeType === "workspace dependency" && edge.certainty === "FACT" && edge.confidence === 1)).toBe(true);
    expect(graph.cycles.length).toBeGreaterThan(0);
    expect(graph.unresolvedRefs.some((ref: any) => ref.value === "@sera/missing")).toBe(true);
    expect(graph.upwardLayerDependencyFindings.length).toBeGreaterThan(0);
    expect(graph.importCallerBoundary.certainty).toBe("UNKNOWN");
  });

  it("distinguishes facts, heuristics, unknowns, evidence, and non-automatic findings", () => {
    const root = createTruthFixture({ conflictingInventory: true, unsupportedClaim: true });
    runRepositoryTruth({ repositoryRoot: root, clock });
    const findings = read(root, "findings.json").findings;
    const components = read(root, "components.json").components;
    const graph = read(root, "dependency-graph.json");
    expect(findings.some((finding: any) => finding.certainty === "FACT" && finding.confidence === 1)).toBe(true);
    expect(components.some((component: any) => component.classificationCertainty === "DERIVED")).toBe(true);
    expect(findings.some((finding: any) => finding.certainty === "HEURISTIC" && finding.confidence < 1)).toBe(true);
    expect(findings.some((finding: any) => finding.certainty === "CONFLICT")).toBe(true);
    expect(graph.importCallerBoundary.certainty).toBe("UNKNOWN");
    expect(findings.every((finding: any) => finding.automaticRemediationAllowed === false && finding.ruleId && finding.ruleVersion && finding.basis && Array.isArray(finding.evidencePaths))).toBe(true);
    expect(components.filter((component: any) => component.classificationCertainty === "HEURISTIC").every((component: any) => component.confidence < 1 && component.basis && component.evidencePaths.length > 0)).toBe(true);
    const classifications = read(root, "classifications.json");
    expect(classifications.inventoryReconciliation.unsupportedMaturityOrCertificationClaims).toContain("unsupported-certified-claim");
  });

  it("assigns heuristic test ownership and reports unowned alternatives when needed", () => {
    const root = createTruthFixture();
    fs.writeFileSync(path.join(root, "loose.test.ts"), "test('loose', () => undefined);\n", "utf8");
    runRepositoryTruth({ repositoryRoot: root, clock });
    const ownership = read(root, "test-ownership.json");
    expect(ownership.tests.some((test: any) => test.path === "packages/runtime-alpha/src/alpha.test.ts" && test.candidateComponent)).toBe(true);
    expect(ownership.tests.some((test: any) => test.ownershipClassification === "HEURISTIC" && test.confidence < 1)).toBe(true);
    expect(ownership.unownedTests).toContain("loose.test.ts");
  });

  it("reconciles capability inventory and flags legacy authority risk without deleting anything", () => {
    const root = createTruthFixture({ legacyAuthority: true });
    runRepositoryTruth({ repositoryRoot: root, clock });
    const classifications = read(root, "classifications.json");
    expect(classifications.inventoryReconciliation.inventoryEntries.some((entry: any) => entry.inventoryId === "repository-truth")).toBe(true);
    expect(classifications.inventoryReconciliation.inventoryEntriesWithNoImplementation).toContain("website-studio");
    expect(classifications.legacyAuthorityAnalysis.constitutionalRule).toContain("Legacy");
    expect(classifications.legacyAuthorityAnalysis.riskCount).toBeGreaterThan(0);
    expect(read(root, "findings.json").findings.some((finding: any) => finding.id === "repository_truth_legacy_authority_risk")).toBe(true);
    expect(fs.existsSync(path.join(root, "scripts", "run-phase-overlay-zip-builder-v1.mjs"))).toBe(true);
  });

  it("classifies certified runtime packages, reconciles evaluation-engine, and preserves honest conflicts", () => {
    const root = createTruthFixture({ conflictingInventory: true });
    runRepositoryTruth({ repositoryRoot: root, clock });
    const components = read(root, "components.json").components;
    const classifications = read(root, "classifications.json");
    const findings = read(root, "findings.json").findings;

    const layerFor = (componentId: string) => components.find((component: any) => component.id === componentId)?.architecturalClassification;
    expect(layerFor("component:sera-evaluation-engine")).toBe("runtime");
    expect(layerFor("component:sera-runtime-state")).toBe("runtime");
    expect(layerFor("component:sera-runtime-recovery")).toBe("runtime");
    expect(layerFor("component:sera-execution-engine")).toBe("runtime");
    expect(layerFor("component:sera-mystery-box")).toBe("review-required");

    const evaluationEntry = classifications.inventoryReconciliation.inventoryEntries.find((entry: any) => entry.inventoryId === "evaluation-engine");
    expect(evaluationEntry.matchingImplementationCandidates).toContain("component:sera-evaluation-engine");
    expect(classifications.inventoryReconciliation.dependencyConflicts.some((conflict: any) => conflict.inventoryId === "evaluation-engine")).toBe(false);
    expect(findings.some((finding: any) => finding.id === "repository_truth_conflicting_arch_mapping" && finding.affectedComponents.includes("inventory:evaluation-engine"))).toBe(false);

    expect(classifications.inventoryReconciliation.dependencyConflicts.some((conflict: any) => conflict.inventoryId === "repository-truth" && conflict.expectedLayer === "desktop" && conflict.observedLayer === "runtime")).toBe(true);
    expect(findings.some((finding: any) => finding.id === "repository_truth_conflicting_arch_mapping" && finding.affectedComponents.includes("inventory:repository-truth"))).toBe(true);
    expect(classifications.legacyAuthorityAnalysis.riskCount).toBe(0);
  });

  it("does not report legacy authority risk when legacy has no active declared authority", () => {
    const root = createTruthFixture({ legacyAuthority: false });
    runRepositoryTruth({ repositoryRoot: root, clock });
    const classifications = read(root, "classifications.json");
    expect(classifications.legacyAuthorityAnalysis.riskCount).toBe(0);
    expect(read(root, "findings.json").findings.some((finding: any) => finding.id === "repository_truth_legacy_authority_risk")).toBe(false);
  });

  it("records source snapshot identity and does not mutate repository source or existing snapshot interpretation inputs", () => {
    const root = createTruthFixture();
    const sourcePath = path.join(root, "packages", "runtime-alpha", "src", "index.ts");
    runRepositorySnapshot({ repositoryRoot: root, clock });
    const sourceBefore = fs.readFileSync(sourcePath, "utf8");
    const snapshotHashesBefore = snapshotHashes(root);
    const result = runRepositoryTruth({ repositoryRoot: root, refreshSnapshot: false, clock });
    const snapshotHashesAfter = snapshotHashes(root);
    expect(result.ok).toBe(true);
    expect(fs.readFileSync(sourcePath, "utf8")).toBe(sourceBefore);
    expect(snapshotHashesAfter).toEqual(snapshotHashesBefore);
    const truth = read(root, "truth.json");
    const summary = read(root, "summary.json");
    expect(truth.sourceSnapshotId).toBe(result.sourceSnapshotId);
    expect(summary.sourceSnapshotId).toBe(result.sourceSnapshotId);
    expect(truth.sourceSnapshotManifest).toHaveLength(8);
  });

  it("does not promote partial truth output after simulated failure", () => {
    const root = createTruthFixture();
    const first = runRepositoryTruth({ repositoryRoot: root, clock });
    expect(first.ok).toBe(true);
    const before = fs.readFileSync(path.join(root, ".sera", "repository-truth", "summary.json"), "utf8");
    const failed = runRepositoryTruth({ repositoryRoot: root, refreshSnapshot: false, clock, simulateFailureAfterStaging: true });
    const after = fs.readFileSync(path.join(root, ".sera", "repository-truth", "summary.json"), "utf8");
    expect(failed.status).toBe("FAILED");
    expect(after).toBe(before);
  });

  it("is repeatable after normalizing duration and source hash details", () => {
    const root = createTruthFixture();
    runRepositoryTruth({ repositoryRoot: root, clock });
    const first = normalizedTruthOutput(root);
    runRepositoryTruth({ repositoryRoot: root, clock });
    const second = normalizedTruthOutput(root);
    expect(second).toBe(first);
  });
});

function createTruthFixture(options: { legacyAuthority?: boolean; conflictingInventory?: boolean; unsupportedClaim?: boolean } = {}): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "sera-repository-truth-test-"));
  fs.mkdirSync(path.join(root, "packages", "runtime-alpha", "src"), { recursive: true });
  fs.mkdirSync(path.join(root, "packages", "capability-beta", "src"), { recursive: true });
  fs.mkdirSync(path.join(root, "packages", "runtime-state", "src"), { recursive: true });
  fs.mkdirSync(path.join(root, "packages", "runtime-recovery", "src"), { recursive: true });
  fs.mkdirSync(path.join(root, "packages", "execution-engine", "src"), { recursive: true });
  fs.mkdirSync(path.join(root, "packages", "evaluation-engine", "src"), { recursive: true });
  fs.mkdirSync(path.join(root, "packages", "mystery-box", "src"), { recursive: true });
  fs.mkdirSync(path.join(root, "packages", "legacy-adapter"), { recursive: true });
  fs.mkdirSync(path.join(root, "apps", "desktop-shell", "src"), { recursive: true });
  fs.mkdirSync(path.join(root, "scripts"), { recursive: true });
  fs.mkdirSync(path.join(root, "docs", "architecture"), { recursive: true });
  fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({
    name: "truth-fixture",
    private: true,
    workspaces: ["packages/*", "apps/*", "missing/*"],
    scripts: {
      build: "tsc -b",
      test: "vitest run",
      "phase100c:demo": "node scripts/run-phase-overlay-zip-builder-v1.mjs"
    },
    dependencies: {
      "@sera/capability-beta": "0.1.0",
      ...(options.legacyAuthority ? { "@sera/legacy-adapter": "0.1.0" } : {})
    }
  }, null, 2), "utf8");
  fs.writeFileSync(path.join(root, "tsconfig.json"), JSON.stringify({
    files: [],
    references: [{ path: "packages/runtime-alpha" }, { path: "missing-ref" }]
  }, null, 2), "utf8");
  fs.writeFileSync(path.join(root, "packages", "runtime-alpha", "package.json"), JSON.stringify({
    name: "@sera/repository-truth",
    private: true,
    scripts: { build: "tsc -b", test: "vitest run" },
    dependencies: { "@sera/capability-beta": "0.1.0", "@sera/missing": "0.1.0" }
  }, null, 2), "utf8");
  fs.writeFileSync(path.join(root, "packages", "runtime-alpha", "tsconfig.json"), "{}", "utf8");
  fs.writeFileSync(path.join(root, "packages", "runtime-alpha", "src", "index.ts"), "export const alpha = 1;\n", "utf8");
  fs.writeFileSync(path.join(root, "packages", "runtime-alpha", "src", "alpha.test.ts"), "test('alpha', () => undefined);\n", "utf8");
  fs.writeFileSync(path.join(root, "packages", "capability-beta", "package.json"), JSON.stringify({
    name: "@sera/capability-beta",
    private: true,
    dependencies: { "@sera/repository-truth": "0.1.0" }
  }, null, 2), "utf8");
  fs.writeFileSync(path.join(root, "packages", "capability-beta", "src", "index.ts"), "export const beta = 1;\n", "utf8");
  fs.writeFileSync(path.join(root, "packages", "runtime-state", "package.json"), JSON.stringify({
    name: "@sera/runtime-state",
    private: true
  }, null, 2), "utf8");
  fs.writeFileSync(path.join(root, "packages", "runtime-state", "src", "index.ts"), "export const runtimeState = 1;\n", "utf8");
  fs.writeFileSync(path.join(root, "packages", "runtime-recovery", "package.json"), JSON.stringify({
    name: "@sera/runtime-recovery",
    private: true
  }, null, 2), "utf8");
  fs.writeFileSync(path.join(root, "packages", "runtime-recovery", "src", "index.ts"), "export const runtimeRecovery = 1;\n", "utf8");
  fs.writeFileSync(path.join(root, "packages", "execution-engine", "package.json"), JSON.stringify({
    name: "@sera/execution-engine",
    private: true
  }, null, 2), "utf8");
  fs.writeFileSync(path.join(root, "packages", "execution-engine", "src", "index.ts"), "export const executionEngine = 1;\n", "utf8");
  fs.writeFileSync(path.join(root, "packages", "evaluation-engine", "package.json"), JSON.stringify({
    name: "@sera/evaluation-engine",
    private: true
  }, null, 2), "utf8");
  fs.writeFileSync(path.join(root, "packages", "evaluation-engine", "src", "index.ts"), "export const evaluationEngine = 1;\n", "utf8");
  fs.writeFileSync(path.join(root, "packages", "mystery-box", "package.json"), JSON.stringify({
    name: "@sera/mystery-box",
    private: true
  }, null, 2), "utf8");
  fs.writeFileSync(path.join(root, "packages", "mystery-box", "src", "index.ts"), "export const mysteryBox = 1;\n", "utf8");
  fs.writeFileSync(path.join(root, "packages", "legacy-adapter", "package.json"), JSON.stringify({
    name: "@sera/legacy-adapter",
    private: true
  }, null, 2), "utf8");
  fs.writeFileSync(path.join(root, "apps", "desktop-shell", "package.json"), JSON.stringify({
    name: "@sera/desktop-shell",
    private: true,
    dependencies: { "@sera/repository-truth": "0.1.0" }
  }, null, 2), "utf8");
  fs.writeFileSync(path.join(root, "apps", "desktop-shell", "src", "main.ts"), "console.log('desktop');\n", "utf8");
  fs.writeFileSync(path.join(root, "scripts", "run-phase-overlay-zip-builder-v1.mjs"), "console.log('legacy overlay zip');\n", "utf8");
  fs.writeFileSync(path.join(root, "docs", "architecture", "legacy-phase-overlay.md"), "# Legacy overlay\n", "utf8");
  fs.writeFileSync(path.join(root, "architecture-capability-temp.json"), "{}", "utf8");
  fs.mkdirSync(path.join(root, "architecture"), { recursive: true });
  fs.writeFileSync(path.join(root, "architecture", "capability-inventory.json"), JSON.stringify({
    schemaVersion: "sera.capability-inventory.v1",
    targetSubsystems: [
      { id: "repository-truth", targetLayer: options.conflictingInventory ? "Desktop" : "Runtime", currentMaturity: "starter", status: "proposed", dependencies: ["repository-snapshot"] },
      { id: "evaluation-engine", targetLayer: "Runtime", currentMaturity: "implemented", status: "certification-pending", dependencies: ["packages/evaluation-engine"] },
      { id: "website-studio", targetLayer: "Studio", currentMaturity: "not-implemented", status: "proposed", dependencies: [] },
      ...(options.unsupportedClaim ? [{ id: "unsupported-certified-claim", targetLayer: "Runtime", currentMaturity: "certified-alpha", status: "proposed", dependencies: [] }] : [])
    ]
  }, null, 2), "utf8");
  return root;
}

function sha256File(filePath: string): string {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function snapshotHashes(root: string): Record<string, string> {
  return Object.fromEntries(["snapshot.json", "workspaces.json", "packages.json", "scripts.json", "tests.json", "references.json", "documents.json", "summary.json"].map((name) => [name, sha256File(path.join(root, ".sera", "repository", name))]));
}

function read(root: string, name: string): any {
  return JSON.parse(fs.readFileSync(path.join(root, ".sera", "repository-truth", name), "utf8"));
}

function normalizedTruthOutput(root: string): string {
  const payload = Object.fromEntries(["truth.json", "components.json", "dependency-graph.json", "test-ownership.json", "findings.json", "classifications.json", "summary.json"].map((name) => {
    const value = read(root, name);
    delete value.durationMs;
    if (value.sourceSnapshotManifest) {
      value.sourceSnapshotManifest = value.sourceSnapshotManifest.map((item: any) => ({ ...item, bytes: 0, sha256: "normalized" }));
    }
    return [name, value];
  }));
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}
