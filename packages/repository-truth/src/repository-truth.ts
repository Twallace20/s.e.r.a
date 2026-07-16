import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { type ExecutionResult } from "@sera/contracts";
import { runRepositorySnapshot } from "@sera/repository-snapshot";
import { isPathInside, normalizePath, redactSecrets } from "@sera/shared";

export const REPOSITORY_TRUTH_SCHEMA_VERSION = "sera.repository-truth.v1";
export const REPOSITORY_TRUTH_ENGINE_VERSION = "repository-truth-v1";

export type RepositoryTruthStatus = "COMPLETED" | "BLOCKED" | "FAILED";
export type TruthCertainty = "FACT" | "DERIVED" | "HEURISTIC" | "CONFLICT" | "UNKNOWN";
export type TruthSeverity = "info" | "warning" | "error" | "critical";
export type ArchitectureLayer = "kernel" | "runtime" | "provider" | "capability" | "studio" | "desktop" | "legacy" | "unclassified" | "review-required";
export type ComponentKind = "root" | "app" | "package" | "test-collection" | "doc-collection" | "runtime-output-family" | "generated-output-family" | "legacy-artifact-family" | "capability-inventory-entry";
export type ComponentArea = "active candidate" | "platform candidate" | "provider candidate" | "capability candidate" | "legacy candidate" | "generated artifact" | "test-only" | "documentation-only" | "unclassified" | "review-required";
export type DependencyEdgeType = "workspace dependency" | "dev dependency" | "peer dependency" | "optional dependency" | "TS project reference" | "root workspace membership" | "documented architectural relationship" | "uncertain inferred relationship";

export interface RepositoryTruthClock {
  now(): Date;
}

export interface ProvidedRepositorySnapshot {
  root: string;
  files?: Partial<Record<RepositorySnapshotFileName, unknown>>;
}

export interface RepositoryTruthOptions {
  repositoryRoot: string;
  outputRoot?: string;
  snapshotRoot?: string;
  refreshSnapshot?: boolean;
  providedSnapshot?: ProvidedRepositorySnapshot;
  clock?: RepositoryTruthClock;
  selectedRuleSet?: string[];
  simulateFailureAfterStaging?: boolean;
}

export interface RepositoryTruthOutputFile {
  kind: string;
  path: string;
  bytes: number;
  sha256: string;
}

export interface RepositoryTruthIssue {
  id: string;
  severity: TruthSeverity;
  certainty: TruthCertainty;
  confidence: number;
  title: string;
  explanation: string;
  basis: string;
  affectedComponents: string[];
  evidencePaths: string[];
  counterEvidencePaths: string[];
  remediationCategory: string;
  automaticRemediationAllowed: false;
  ruleId: string;
  ruleVersion: string;
  limitations: string[];
}

export interface RepositoryTruthResult {
  ok: boolean;
  status: RepositoryTruthStatus;
  message: string;
  truthId?: string;
  sourceSnapshotId?: string;
  repositoryRoot: string;
  outputRoot: string;
  manifest: RepositoryTruthOutputFile[];
  warningCount: number;
  errorCount: number;
  summary?: Record<string, unknown>;
  execution: ExecutionResult;
}

type RepositorySnapshotFileName = "snapshot.json" | "workspaces.json" | "packages.json" | "scripts.json" | "tests.json" | "references.json" | "documents.json" | "summary.json";

interface PackageRecord {
  name?: string;
  relativePath: string;
  kind: string;
  packageManifestPath: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  declaredProjectReferenceParticipation?: boolean;
}

interface TruthComponent {
  id: string;
  name: string;
  kind: ComponentKind;
  path: string;
  area: ComponentArea;
  sourceFacts: string[];
  declaredRelationships: string[];
  inferredRelationships: string[];
  architecturalClassification: ArchitectureLayer;
  classificationCertainty: TruthCertainty;
  confidence: number;
  basis: string;
  evidencePaths: string[];
  contradictions: string[];
  limitations: string[];
}

interface TruthEdge {
  source: string;
  target: string;
  edgeType: DependencyEdgeType;
  certainty: TruthCertainty;
  confidence: number;
  evidencePaths: string[];
  basis: string;
}

interface TruthState {
  repositoryRoot: string;
  outputRoot: string;
  snapshotRoot: string;
  createdAt: string;
  truthId: string;
  startedMs: number;
  warnings: RepositoryTruthIssue[];
  errors: RepositoryTruthIssue[];
}

const REQUIRED_OUTPUTS = [
  "truth.json",
  "components.json",
  "dependency-graph.json",
  "test-ownership.json",
  "findings.json",
  "classifications.json",
  "summary.json"
] as const;

const SNAPSHOT_FILES: RepositorySnapshotFileName[] = [
  "snapshot.json",
  "workspaces.json",
  "packages.json",
  "scripts.json",
  "tests.json",
  "references.json",
  "documents.json",
  "summary.json"
];

const RUNTIME_PACKAGE_NAME_HINTS = [
  "repository-snapshot",
  "repository-truth",
  "runtime-host",
  "runtime-state",
  "runtime-recovery",
  "model-runtime",
  "knowledge-runtime",
  "control-plane",
  "execution-engine",
  "evaluation-engine",
  "workspace",
  "artifacts",
  "planner",
  "memory"
];

const RULES = {
  snapshotValidation: { id: "repository_truth.snapshot_validation", version: "1.0.0" },
  componentClassification: { id: "repository_truth.component_classification", version: "1.0.0" },
  dependencyGraph: { id: "repository_truth.dependency_graph", version: "1.0.0" },
  testOwnership: { id: "repository_truth.test_ownership", version: "1.0.0" },
  inventory: { id: "repository_truth.inventory_reconciliation", version: "1.0.0" },
  legacyAuthority: { id: "repository_truth.legacy_authority", version: "1.0.0" }
} as const;

export function runRepositoryTruth(options: RepositoryTruthOptions): RepositoryTruthResult {
  return new RepositoryTruthEngine().run(options);
}

export class RepositoryTruthEngine {
  run(options: RepositoryTruthOptions): RepositoryTruthResult {
    const startedMs = Date.now();
    const clock = options.clock ?? { now: () => new Date() };
    const repositoryRoot = path.resolve(options.repositoryRoot);
    const outputRoot = path.resolve(options.outputRoot ?? path.join(repositoryRoot, ".sera", "repository-truth"));
    const snapshotRoot = path.resolve(options.snapshotRoot ?? path.join(repositoryRoot, ".sera", "repository"));
    const createdAt = clock.now().toISOString();
    const truthId = createTruthId(repositoryRoot, createdAt);
    const state: TruthState = { repositoryRoot, outputRoot, snapshotRoot, createdAt, truthId, startedMs, warnings: [], errors: [] };

    try {
      const boundary = validateBoundaries(repositoryRoot, outputRoot);
      if (!boundary.ok) return blockedResult(state, boundary.message);

      let refreshedSnapshotId: string | undefined;
      if (options.refreshSnapshot !== false && !options.providedSnapshot) {
        const snapshot = runRepositorySnapshot({ repositoryRoot, outputRoot: snapshotRoot, clock });
        refreshedSnapshotId = snapshot.snapshotId;
        if (!snapshot.ok) return blockedResult(state, `Repository Truth blocked because Snapshot refresh did not complete: ${snapshot.message}`);
      }

      const source = options.providedSnapshot
        ? validateProvidedSnapshot(options.providedSnapshot, state)
        : validateSnapshotOutput(snapshotRoot, repositoryRoot, state);
      if (!source.ok) return blockedResult(state, source.message);

      const snapshotId = source.snapshotId;
      const sourceManifest = buildSourceManifest(repositoryRoot, source.root, source.files);
      const inventory = readInventory(repositoryRoot, state);
      const components = buildComponents(source.files, inventory, sourceManifest);
      const graph = buildDependencyGraph(source.files, components);
      const testOwnership = buildTestOwnership(source.files, components);
      const classifications = buildClassifications(source.files, components, inventory, graph);
      const findings = buildFindings(source.files, components, graph, testOwnership, classifications, inventory);
      const summary = buildSummary(state, snapshotId, refreshedSnapshotId, sourceManifest, components, graph, testOwnership, classifications, findings);
      const generatedFindings = findings.findings as RepositoryTruthIssue[];
      const truth = buildTruth(state, snapshotId, sourceManifest, refreshedSnapshotId, summary);

      const outputs: Record<string, unknown> = {
        "truth.json": truth,
        "components.json": components,
        "dependency-graph.json": graph,
        "test-ownership.json": testOwnership,
        "findings.json": findings,
        "classifications.json": classifications,
        "summary.json": summary
      };
      const manifest = atomicWriteOutputs(state, outputs, options.simulateFailureAfterStaging ?? false);
      const execution: ExecutionResult = {
        commandId: REPOSITORY_TRUTH_ENGINE_VERSION,
        attemptId: truthId,
        status: "COMPLETED",
        evidenceDirectory: ".sera/repository-truth"
      };
      return {
        ok: true,
        status: "COMPLETED",
        message: "Repository Truth v1 completed.",
        truthId,
        sourceSnapshotId: snapshotId,
        repositoryRoot,
        outputRoot,
        manifest,
        warningCount: state.warnings.length + generatedFindings.filter((finding) => finding.severity === "warning").length,
        errorCount: state.errors.length + generatedFindings.filter((finding) => finding.severity === "error" || finding.severity === "critical").length,
        summary,
        execution
      };
    } catch (error) {
      const message = redactSecrets(error instanceof Error ? error.message : String(error));
      return {
        ok: false,
        status: "FAILED",
        message,
        truthId,
        repositoryRoot,
        outputRoot,
        manifest: [],
        warningCount: state.warnings.length,
        errorCount: state.errors.length + 1,
        execution: {
          commandId: REPOSITORY_TRUTH_ENGINE_VERSION,
          attemptId: truthId,
          status: "FAILED",
          reason: message
        }
      };
    }
  }
}

function validateSnapshotOutput(snapshotRoot: string, repositoryRoot: string, state: TruthState): { ok: boolean; message: string; root: string; files: Record<RepositorySnapshotFileName, any>; snapshotId: string } {
  if (!isPathInside(repositoryRoot, snapshotRoot)) {
    return { ok: false, message: "Repository Snapshot root must be inside repository root.", root: snapshotRoot, files: {} as any, snapshotId: "" };
  }
  const files = {} as Record<RepositorySnapshotFileName, any>;
  for (const name of SNAPSHOT_FILES) {
    const absolutePath = path.join(snapshotRoot, name);
    if (!fs.existsSync(absolutePath)) return { ok: false, message: `Repository Snapshot output is incomplete: missing ${name}.`, root: snapshotRoot, files, snapshotId: "" };
    try {
      files[name] = JSON.parse(fs.readFileSync(absolutePath, "utf8"));
    } catch (error) {
      return { ok: false, message: `Repository Snapshot output is malformed: ${name}: ${redactSecrets(error instanceof Error ? error.message : String(error))}`, root: snapshotRoot, files, snapshotId: "" };
    }
  }
  return validateSnapshotFiles(snapshotRoot, files, state);
}

function validateProvidedSnapshot(snapshot: ProvidedRepositorySnapshot, state: TruthState): { ok: boolean; message: string; root: string; files: Record<RepositorySnapshotFileName, any>; snapshotId: string } {
  const root = path.resolve(snapshot.root);
  const files = {} as Record<RepositorySnapshotFileName, any>;
  for (const name of SNAPSHOT_FILES) {
    const provided = snapshot.files?.[name];
    if (provided) {
      files[name] = provided;
      continue;
    }
    const absolutePath = path.join(root, name);
    if (!fs.existsSync(absolutePath)) return { ok: false, message: `Provided Repository Snapshot is incomplete: missing ${name}.`, root, files, snapshotId: "" };
    files[name] = JSON.parse(fs.readFileSync(absolutePath, "utf8"));
  }
  return validateSnapshotFiles(root, files, state);
}

function validateSnapshotFiles(root: string, files: Record<RepositorySnapshotFileName, any>, state: TruthState): { ok: boolean; message: string; root: string; files: Record<RepositorySnapshotFileName, any>; snapshotId: string } {
  for (const name of SNAPSHOT_FILES) {
    if (files[name]?.schemaVersion !== "sera.repository-snapshot.v1") {
      return { ok: false, message: `Repository Snapshot ${name} has unsupported or missing schemaVersion.`, root, files, snapshotId: "" };
    }
  }
  const ids = [files["snapshot.json"].snapshotId, files["summary.json"].snapshotId].filter(Boolean);
  if (ids.length < 2 || new Set(ids).size !== 1) {
    return { ok: false, message: "Repository Snapshot outputs do not agree on snapshotId.", root, files, snapshotId: "" };
  }
  const manifest = files["snapshot.json"].outputFileManifest;
  if (Array.isArray(manifest)) {
    const manifestPaths = manifest.map((entry) => typeof entry === "string" ? normalizeSlash(entry) : typeof entry === "object" && entry && "path" in entry ? normalizeSlash(String((entry as { path: unknown }).path)) : "").filter(Boolean).sort();
    const requiredManifestPaths = SNAPSHOT_FILES.map((name) => `.sera/repository/${name}`).sort();
    for (const required of requiredManifestPaths) {
      if (!manifestPaths.includes(required)) {
        return { ok: false, message: `Repository Snapshot manifest is missing required member ${required}.`, root, files, snapshotId: "" };
      }
    }
    for (const entry of manifest) {
      if (typeof entry === "object" && entry && "path" in entry && "sha256" in entry) {
        const rel = String((entry as { path: unknown }).path);
        const expected = String((entry as { sha256: unknown }).sha256);
        const absolute = path.join(state.repositoryRoot, normalizeSlash(rel));
        if (!fs.existsSync(absolute) || sha256File(absolute) !== expected) {
          return { ok: false, message: `Repository Snapshot manifest hash mismatch for ${rel}.`, root, files, snapshotId: "" };
        }
      }
    }
  }
  return { ok: true, message: "Repository Snapshot output validated.", root, files, snapshotId: String(ids[0]) };
}

function buildComponents(files: Record<RepositorySnapshotFileName, any>, inventory: any, sourceManifest: RepositoryTruthOutputFile[]): Record<string, unknown> {
  const packages = packageRecords(files);
  const components: TruthComponent[] = [];
  for (const pkg of packages) {
    const layer = classifyLayer(pkg.relativePath, pkg.name);
    components.push({
      id: componentId(pkg.relativePath, pkg.name),
      name: pkg.name ?? pkg.relativePath,
      kind: pkg.relativePath === "." ? "root" : pkg.kind === "application" ? "app" : "package",
      path: pkg.relativePath,
      area: areaForLayer(layer, pkg.relativePath),
      sourceFacts: [`package manifest observed at ${pkg.packageManifestPath}`],
      declaredRelationships: declaredPackageRelationships(pkg),
      inferredRelationships: [],
      architecturalClassification: layer,
      classificationCertainty: layer === "unclassified" || layer === "review-required" ? "UNKNOWN" : "HEURISTIC",
      confidence: layer === "unclassified" ? 0.2 : layer === "review-required" ? 0.45 : 0.8,
      basis: "Workspace package manifest path and deterministic SERA OS layer-name mapping.",
      evidencePaths: [pkg.packageManifestPath],
      contradictions: [],
      limitations: ["Layer classification is deterministic governance mapping, not semantic runtime proof."]
    });
  }
  const tests = files["tests.json"].testFiles ?? [];
  if (tests.length > 0) components.push(collection("test-collection:root", "Root tests", "test-collection", "tests", "test-only", "runtime", ["tests.json"], 0.7));
  const documents = files["documents.json"].documents ?? [];
  if (documents.length > 0) components.push(collection("doc-collection:docs", "Repository documents", "doc-collection", "docs", "documentation-only", "review-required", ["documents.json"], 0.6));
  components.push(collection("runtime-output:.sera-repository", "Repository Snapshot output", "runtime-output-family", ".sera/repository", "generated artifact", "runtime", [".sera/repository/summary.json"], 0.9));
  components.push(collection("generated-output:.sera-repository-truth", "Repository Truth output", "generated-output-family", ".sera/repository-truth", "generated artifact", "runtime", [".sera/repository-truth/summary.json"], 0.9));
  for (const family of legacyFamilies(files)) {
    components.push(collection(`legacy:${family.path}`, family.name, "legacy-artifact-family", family.path, "legacy candidate", "legacy", family.evidencePaths, 0.74));
  }
  for (const item of inventoryEntries(inventory)) {
    components.push(collection(`inventory:${item.id}`, item.id, "capability-inventory-entry", "architecture/capability-inventory.json", "review-required", normalizeLayer(item.targetLayer), ["architecture/capability-inventory.json"], 0.62));
  }
  return {
    schemaVersion: REPOSITORY_TRUTH_SCHEMA_VERSION,
    truthEngineVersion: REPOSITORY_TRUTH_ENGINE_VERSION,
    sourceSnapshotId: files["summary.json"].snapshotId,
    components: sortBy(components, "id"),
    counts: countBy(components, (component) => component.kind),
    sourceSnapshotManifest: sourceManifest,
    modelUse: false,
    networkUse: false
  };
}

function buildDependencyGraph(files: Record<RepositorySnapshotFileName, any>, componentsDoc: Record<string, unknown>): Record<string, unknown> {
  const components = componentsDoc.components as TruthComponent[];
  const packages = packageRecords(files);
  const packageNames = new Map(packages.filter((pkg) => pkg.name).map((pkg) => [pkg.name!, componentId(pkg.relativePath, pkg.name)]));
  const pathIds = new Map(packages.map((pkg) => [pkg.relativePath, componentId(pkg.relativePath, pkg.name)]));
  const edges: TruthEdge[] = [];
  for (const pattern of files["references.json"].rootWorkspaceDeclarations ?? []) {
    for (const pkg of packages.filter((candidate) => candidate.relativePath !== "." && matchesWorkspacePattern(candidate.relativePath, pattern))) {
      edges.push(edge("component:root", componentId(pkg.relativePath, pkg.name), "root workspace membership", "FACT", 1, ["package.json"], `Root workspace pattern ${pattern}`));
    }
  }
  for (const pkg of packages) {
    addDependencyEdges(edges, pkg, pkg.dependencies, "workspace dependency", packageNames);
    addDependencyEdges(edges, pkg, pkg.devDependencies, "dev dependency", packageNames);
    addDependencyEdges(edges, pkg, pkg.peerDependencies, "peer dependency", packageNames);
    addDependencyEdges(edges, pkg, pkg.optionalDependencies, "optional dependency", packageNames);
  }
  for (const ref of files["references.json"].typescriptProjectReferences ?? []) {
    if (ref.path && pathIds.has(ref.path)) {
      edges.push(edge("component:root", pathIds.get(ref.path)!, "TS project reference", "FACT", 1, ["tsconfig.json"], `Root tsconfig reference ${ref.path}`));
    }
  }
  const unresolvedRefs = [
    ...(files["references.json"].missingReferencedPaths ?? []).map((ref: string) => ({ kind: "TS project reference", value: ref, evidencePaths: ["tsconfig.json"] })),
    ...(files["references.json"].unresolvedDeclaredLocalWorkspaceNames ?? []).map((ref: { from: string; dependency: string }) => ({ kind: "local dependency", value: ref.dependency, from: ref.from, evidencePaths: ["packages.json"] }))
  ].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  const cycles = detectCycles(edges);
  const upwardLayerDependencyFindings = edges.filter((item) => isUpwardLayerEdge(item, components)).map((item) => ({
    source: item.source,
    target: item.target,
    edgeType: item.edgeType,
    evidencePaths: item.evidencePaths,
    certainty: "HEURISTIC",
    confidence: 0.65
  }));
  const incoming = new Set(edges.map((item) => item.target));
  const outgoing = new Set(edges.map((item) => item.source));
  const disconnectedComponents = components.filter((component) => !incoming.has(component.id) && !outgoing.has(component.id)).map((component) => component.id).sort();
  return {
    schemaVersion: REPOSITORY_TRUTH_SCHEMA_VERSION,
    truthEngineVersion: REPOSITORY_TRUTH_ENGINE_VERSION,
    sourceSnapshotId: files["summary.json"].snapshotId,
    nodes: components.map((component) => ({ id: component.id, name: component.name, kind: component.kind, layer: component.architecturalClassification, path: component.path })).sort((a, b) => a.id.localeCompare(b.id)),
    edges: sortBy(edges, "source", "target", "edgeType"),
    unresolvedRefs,
    missingDependencies: unresolvedRefs.filter((item) => item.kind === "local dependency"),
    cycles,
    upwardLayerDependencyFindings,
    disconnectedComponents,
    duplicateRelationships: duplicates(edges.map((item) => `${item.source}|${item.target}|${item.edgeType}`)),
    importCallerBoundary: {
      callerGraphComputed: false,
      certainty: "UNKNOWN",
      limitation: "Repository Truth v1 does not claim runtime callers from static imports."
    },
    edgeCountsByType: countBy(edges, (item) => item.edgeType),
    modelUse: false,
    networkUse: false
  };
}

function buildTestOwnership(files: Record<RepositorySnapshotFileName, any>, componentsDoc: Record<string, unknown>): Record<string, unknown> {
  const components = componentsDoc.components as TruthComponent[];
  const packageComponents = components.filter((component) => component.kind === "package" || component.kind === "app" || component.kind === "root");
  const ownership = (files["tests.json"].testFiles ?? []).map((test: any) => {
    const owner = packageComponents
      .filter((component) => component.path !== "." && test.path.startsWith(`${component.path}/`))
      .sort((a, b) => b.path.length - a.path.length)[0]
      ?? (test.path.startsWith("tests/") ? packageComponents.find((component) => component.id === "component:root") : undefined);
    return {
      path: test.path,
      candidateComponent: owner?.id ?? null,
      ownershipClassification: owner ? "HEURISTIC" : "UNKNOWN",
      confidence: owner ? (test.path.startsWith(`${owner.path}/`) ? 0.8 : 0.55) : 0.1,
      basis: owner ? "Nearest workspace or root tests directory from Repository Snapshot evidence." : "No workspace containment rule matched.",
      evidencePaths: [test.path, ...(owner ? [owner.path === "." ? "package.json" : `${owner.path}/package.json`] : [])].sort(),
      alternatives: packageComponents.filter((component) => component.id !== owner?.id && component.path !== ".").map((component) => component.id).slice(0, 5).sort(),
      limitations: ["Test ownership is a deterministic heuristic and does not prove semantic coverage."]
    };
  }).sort((a: any, b: any) => a.path.localeCompare(b.path));
  return {
    schemaVersion: REPOSITORY_TRUTH_SCHEMA_VERSION,
    truthEngineVersion: REPOSITORY_TRUTH_ENGINE_VERSION,
    sourceSnapshotId: files["summary.json"].snapshotId,
    tests: ownership,
    unownedTests: ownership.filter((item: any) => !item.candidateComponent).map((item: any) => item.path),
    modelUse: false,
    networkUse: false
  };
}

function buildClassifications(files: Record<RepositorySnapshotFileName, any>, componentsDoc: Record<string, unknown>, inventory: any, graph: Record<string, unknown>): Record<string, unknown> {
  const components = componentsDoc.components as TruthComponent[];
  const inventoryItems = inventoryEntries(inventory);
  const implementationCandidates = components.filter((component) => component.kind === "package" || component.kind === "app" || component.kind === "root");
  const implementedInventory = inventoryItems.map((item) => {
    const evidence = implementationCandidates.filter((component) => component.name.includes(item.id) || component.path.includes(item.id) || JSON.stringify(item.dependencies ?? []).includes(component.path));
    return {
      inventoryId: item.id,
      targetLayer: item.targetLayer ?? "unclassified",
      matchingImplementationCandidates: evidence.map((component) => component.id).sort(),
      classification: evidence.length ? "HEURISTIC" : "UNKNOWN",
      confidence: evidence.length ? 0.62 : 0.15,
      evidencePaths: ["architecture/capability-inventory.json", ...evidence.flatMap((component) => component.evidencePaths)].sort(),
      limitations: ["Inventory reconciliation uses IDs, paths, and declared dependencies only."]
    };
  }).sort((a, b) => a.inventoryId.localeCompare(b.inventoryId));
  const componentPackageIds = new Set(components.filter((component) => component.kind === "package" || component.kind === "app").map((component) => component.id));
  const inventoryMatched = new Set(implementedInventory.flatMap((item) => item.matchingImplementationCandidates));
  const observedCandidatesNoInventory = [...componentPackageIds].filter((id) => !inventoryMatched.has(id)).sort();
  const legacyAuthorityRisks = (graph.upwardLayerDependencyFindings as any[]).filter((item) => {
    const source = components.find((component) => component.id === item.source);
    const target = components.find((component) => component.id === item.target);
    return source?.architecturalClassification === "legacy" || target?.architecturalClassification === "legacy";
  });
  const directImplementationByInventory = new Map(inventoryItems.map((item) => [
    item.id,
    implementationCandidates.filter((component) => component.name.includes(item.id) || component.path.includes(item.id)).map((component) => component.id)
  ]));
  const dependencyConflicts = implementedInventory.flatMap((item) => {
    const inventoryItem = inventoryItems.find((candidate) => candidate.id === item.inventoryId);
    const expectedLayer = normalizeLayer(inventoryItem?.targetLayer);
    const directCandidateIds = directImplementationByInventory.get(item.inventoryId) ?? [];
    return directCandidateIds.flatMap((componentId) => {
      const component = components.find((candidate) => candidate.id === componentId);
      if (!component || expectedLayer === "review-required" || component.architecturalClassification === expectedLayer) return [];
      return [{
        inventoryId: item.inventoryId,
        componentId,
        expectedLayer,
        observedLayer: component.architecturalClassification,
        evidencePaths: ["architecture/capability-inventory.json", ...component.evidencePaths].sort()
      }];
    });
  }).sort((a, b) => `${a.inventoryId}:${a.componentId}`.localeCompare(`${b.inventoryId}:${b.componentId}`));
  return {
    schemaVersion: REPOSITORY_TRUTH_SCHEMA_VERSION,
    truthEngineVersion: REPOSITORY_TRUTH_ENGINE_VERSION,
    sourceSnapshotId: files["summary.json"].snapshotId,
    classifications: components.map((component) => ({
      componentId: component.id,
      area: component.area,
      layer: component.architecturalClassification,
      certainty: component.classificationCertainty,
      confidence: component.confidence,
      evidencePaths: component.evidencePaths,
      limitations: component.limitations
    })).sort((a, b) => a.componentId.localeCompare(b.componentId)),
    inventoryReconciliation: {
      inventoryEntries: implementedInventory,
      inventoryEntriesWithNoImplementation: implementedInventory.filter((item) => item.matchingImplementationCandidates.length === 0).map((item) => item.inventoryId),
      observedCandidatesNoInventory,
      unsupportedMaturityOrCertificationClaims: inventoryItems.filter((item) => typeof item.currentMaturity === "string" && item.currentMaturity.includes("certified") && !String(item.status ?? "").includes("cert")).map((item) => item.id).sort(),
      dependencyConflicts
    },
    legacyAuthorityAnalysis: {
      risks: legacyAuthorityRisks,
      riskCount: legacyAuthorityRisks.length,
      constitutionalRule: "Legacy evidence may be preserved, but must not own active runtime authority without explicit governance approval."
    },
    modelUse: false,
    networkUse: false
  };
}

function buildFindings(files: Record<RepositorySnapshotFileName, any>, componentsDoc: Record<string, unknown>, graph: Record<string, unknown>, testOwnership: Record<string, unknown>, classifications: Record<string, unknown>, inventory: any): Record<string, unknown> {
  const findings: RepositoryTruthIssue[] = [];
  for (const missing of files["workspaces.json"].missingDeclaredWorkspacePaths ?? []) {
    findings.push(finding("repository_truth_missing_workspace_path", "warning", "FACT", 1, "Missing declared workspace path", `Root package.json declares ${missing}, but Snapshot did not observe that path.`, ["component:root"], ["package.json"], "review-workspace-declarations", RULES.dependencyGraph));
  }
  for (const missing of files["references.json"].missingReferencedPaths ?? []) {
    findings.push(finding("repository_truth_missing_ts_reference", "warning", "FACT", 1, "Missing TypeScript project reference", `Root tsconfig references ${missing}, but Snapshot did not observe it.`, ["component:root"], ["tsconfig.json"], "review-tsconfig-references", RULES.dependencyGraph));
  }
  for (const unresolved of graph.unresolvedRefs as any[]) {
    findings.push(finding("repository_truth_unresolved_local_dependency", "warning", "FACT", 1, "Unresolved local dependency", `Declared local reference could not be resolved: ${unresolved.value}.`, unresolved.from ? [componentIdFromName(unresolved.from, files)] : ["component:root"], unresolved.evidencePaths, "review-package-manifests", RULES.dependencyGraph));
  }
  for (const cycle of graph.cycles as string[][]) {
    findings.push(finding("repository_truth_dependency_cycle", "error", "FACT", 1, "Declared dependency cycle", `Declared local dependency cycle observed: ${cycle.join(" -> ")}.`, cycle, ["packages.json"], "review-dependency-boundaries", RULES.dependencyGraph));
  }
  for (const upward of graph.upwardLayerDependencyFindings as any[]) {
    findings.push(finding("repository_truth_upward_layer_dependency", "warning", "HEURISTIC", 0.65, "Possible upward layer dependency", `${upward.source} depends on ${upward.target} across tentative layer order.`, [upward.source, upward.target], upward.evidencePaths, "review-layer-boundaries", RULES.dependencyGraph, ["Layer mappings are provisional governance evidence."]));
  }
  for (const test of testOwnership.unownedTests as string[]) {
    findings.push(finding("repository_truth_unowned_test", "warning", "UNKNOWN", 0.2, "Unowned test file", `${test} could not be assigned to a component with confidence.`, [], [test], "review-test-ownership", RULES.testOwnership));
  }
  const reconciliation = classifications.inventoryReconciliation as {
    inventoryEntriesWithNoImplementation: string[];
    observedCandidatesNoInventory: string[];
  };
  const legacyAuthority = classifications.legacyAuthorityAnalysis as { risks: any[] };
  const reconciliationDetails = classifications.inventoryReconciliation as {
    dependencyConflicts: Array<{ inventoryId: string; componentId: string; expectedLayer: string; observedLayer: string; evidencePaths: string[] }>;
  };
  for (const item of reconciliation.inventoryEntriesWithNoImplementation) {
    findings.push(finding("repository_truth_inventory_no_implementation", "info", "HEURISTIC", 0.55, "Inventory entry has no implementation candidate", `${item} appears in capability inventory without a matching observed implementation candidate.`, [`inventory:${item}`], ["architecture/capability-inventory.json"], "review-capability-inventory", RULES.inventory));
  }
  for (const item of reconciliation.observedCandidatesNoInventory) {
    findings.push(finding("repository_truth_observed_candidate_no_inventory", "info", "HEURISTIC", 0.55, "Observed component lacks inventory entry", `${item} is observed but not reconciled to capability inventory.`, [item], ["packages.json"], "review-capability-inventory", RULES.inventory));
  }
  for (const risk of legacyAuthority.risks) {
    findings.push(finding("repository_truth_legacy_authority_risk", "warning", "HEURISTIC", 0.62, "Legacy authority risk", `Legacy-classified component participates in active declared relationship ${risk.source} -> ${risk.target}.`, [risk.source, risk.target], risk.evidencePaths, "review-legacy-authority", RULES.legacyAuthority));
  }
  for (const conflict of reconciliationDetails.dependencyConflicts) {
    findings.push(finding("repository_truth_conflicting_arch_mapping", "warning", "CONFLICT", 0.82, "Conflicting architectural mapping", `${conflict.inventoryId} inventory target layer ${conflict.expectedLayer} conflicts with observed component layer ${conflict.observedLayer}.`, [conflict.componentId, `inventory:${conflict.inventoryId}`], conflict.evidencePaths, "review-layer-mapping", RULES.inventory, ["Inventory and implementation mapping conflict; no automatic remediation is allowed."]));
  }
  const packages = packageRecords(files);
  for (const pkg of packages.filter((pkg) => pkg.relativePath !== "." && !pkg.scripts?.test && !pkg.scripts?.build)) {
    findings.push(finding("repository_truth_package_lacks_test_build_scripts", "info", "FACT", 1, "Package lacks test/build scripts", `${pkg.name ?? pkg.relativePath} does not declare package-local test or build scripts.`, [componentId(pkg.relativePath, pkg.name)], [pkg.packageManifestPath], "review-package-scripts", RULES.componentClassification));
  }
  const duplicateNames = files["workspaces.json"].duplicateDeclaredWorkspaceNames ?? [];
  for (const name of duplicateNames) {
    findings.push(finding("repository_truth_duplicate_workspace_name", "error", "FACT", 1, "Duplicate workspace package name", `${name} is declared by more than one package manifest.`, [], ["workspaces.json"], "review-package-manifests", RULES.snapshotValidation));
  }
  void componentsDoc;
  void inventory;
  return {
    schemaVersion: REPOSITORY_TRUTH_SCHEMA_VERSION,
    truthEngineVersion: REPOSITORY_TRUTH_ENGINE_VERSION,
    sourceSnapshotId: files["summary.json"].snapshotId,
    findings: sortBy(findings, "id", "title", "explanation"),
    countsBySeverity: countBy(findings, (item) => item.severity),
    countsByCertainty: countBy(findings, (item) => item.certainty),
    modelUse: false,
    networkUse: false
  };
}

function buildSummary(state: TruthState, snapshotId: string, refreshedSnapshotId: string | undefined, sourceManifest: RepositoryTruthOutputFile[], componentsDoc: Record<string, unknown>, graph: Record<string, unknown>, testOwnership: Record<string, unknown>, classifications: Record<string, unknown>, findingsDoc: Record<string, unknown>): Record<string, unknown> {
  const components = componentsDoc.components as TruthComponent[];
  const findings = findingsDoc.findings as RepositoryTruthIssue[];
  return {
    schemaVersion: REPOSITORY_TRUTH_SCHEMA_VERSION,
    sourceSnapshotId: snapshotId,
    refreshedSnapshotFirst: Boolean(refreshedSnapshotId),
    refreshedSnapshotId,
    truthEngineVersion: REPOSITORY_TRUTH_ENGINE_VERSION,
    componentCountsByKind: countBy(components, (component) => component.kind),
    componentCountsByLayer: countBy(components, (component) => component.architecturalClassification),
    dependencyEdgeCountsByType: graph.edgeCountsByType,
    unresolvedRefCount: (graph.unresolvedRefs as unknown[]).length,
    cycleCount: (graph.cycles as unknown[]).length,
    findingCountsBySeverity: findingsDoc.countsBySeverity,
    findingCountsByCertainty: findingsDoc.countsByCertainty,
    unownedTestCount: (testOwnership.unownedTests as unknown[]).length,
    legacyCandidateCount: components.filter((component) => component.architecturalClassification === "legacy").length,
    legacyAuthorityRiskCount: (classifications.legacyAuthorityAnalysis as { riskCount: number }).riskCount,
    inventoryReconciliationCounts: {
      entries: (classifications.inventoryReconciliation as { inventoryEntries: unknown[] }).inventoryEntries.length,
      noImplementation: (classifications.inventoryReconciliation as { inventoryEntriesWithNoImplementation: unknown[] }).inventoryEntriesWithNoImplementation.length,
      observedNoInventory: (classifications.inventoryReconciliation as { observedCandidatesNoInventory: unknown[] }).observedCandidatesNoInventory.length,
      unsupportedClaims: (classifications.inventoryReconciliation as { unsupportedMaturityOrCertificationClaims: unknown[] }).unsupportedMaturityOrCertificationClaims.length
    },
    conflictCount: findings.filter((finding) => finding.certainty === "CONFLICT").length,
    unknownCount: findings.filter((finding) => finding.certainty === "UNKNOWN").length,
    warningCount: findings.filter((finding) => finding.severity === "warning").length,
    errorCount: findings.filter((finding) => finding.severity === "error" || finding.severity === "critical").length,
    sourceSnapshotManifest: sourceManifest,
    modelUse: false,
    networkUse: false,
    durationMs: Math.max(0, Date.now() - state.startedMs),
    finalStatus: "COMPLETED",
    generatedPaths: REQUIRED_OUTPUTS.map((name) => `.sera/repository-truth/${name}`).sort(),
    limitations: [
      "Repository Truth v1 consumes Snapshot evidence and does not run arbitrary repository scripts.",
      "Layer and ownership conclusions are confidence-scored and preserve FACT versus HEURISTIC distinctions.",
      "Static import/caller graph analysis is not claimed in v1.",
      "No files are deleted, migrated, or remediated automatically."
    ]
  };
}

function buildTruth(state: TruthState, snapshotId: string, sourceManifest: RepositoryTruthOutputFile[], refreshedSnapshotId: string | undefined, summary: Record<string, unknown>): Record<string, unknown> {
  return {
    schemaVersion: REPOSITORY_TRUTH_SCHEMA_VERSION,
    truthId: state.truthId,
    sourceSnapshotId: snapshotId,
    sourceSnapshotManifest: sourceManifest,
    createdAt: state.createdAt,
    truthEngineVersion: REPOSITORY_TRUTH_ENGINE_VERSION,
    operation: "repository truth",
    status: "COMPLETED",
    refreshedSnapshotFirst: Boolean(refreshedSnapshotId),
    refreshedSnapshotId,
    outputManifest: REQUIRED_OUTPUTS.map((name) => `.sera/repository-truth/${name}`).sort(),
    warningCount: summary.warningCount,
    errorCount: summary.errorCount,
    modelUse: false,
    networkUse: false,
    sourceBaseline: { snapshotId },
    ruleSetVersions: Object.fromEntries(Object.values(RULES).map((rule) => [rule.id, rule.version])),
    finalStatus: "COMPLETED",
    limitations: summary.limitations
  };
}

function buildSourceManifest(repositoryRoot: string, root: string, files: Record<RepositorySnapshotFileName, any>): RepositoryTruthOutputFile[] {
  return SNAPSHOT_FILES.map((name) => {
    const absolute = path.join(root, name);
    if (fs.existsSync(absolute) && isPathInside(repositoryRoot, absolute)) {
      const stat = fs.statSync(absolute);
      return { kind: name.replace(".json", ""), path: relative(repositoryRoot, absolute), bytes: stat.size, sha256: sha256File(absolute) };
    }
    const text = JSON.stringify(files[name]);
    return { kind: name.replace(".json", ""), path: `.provided-snapshot/${name}`, bytes: Buffer.byteLength(text), sha256: sha256Text(text) };
  }).sort((a, b) => a.path.localeCompare(b.path));
}

function atomicWriteOutputs(state: TruthState, outputs: Record<string, unknown>, simulateFailureAfterStaging: boolean): RepositoryTruthOutputFile[] {
  const parent = path.dirname(state.outputRoot);
  fs.mkdirSync(parent, { recursive: true });
  const staging = path.join(parent, `.repository-truth-staging-${state.truthId}`);
  const previous = path.join(parent, `.repository-truth-previous-${state.truthId}`);
  safeRemoveOwnedPath(staging, parent);
  safeRemoveOwnedPath(previous, parent);
  fs.mkdirSync(staging, { recursive: true });
  for (const name of REQUIRED_OUTPUTS) {
    fs.writeFileSync(path.join(staging, name), JSON.stringify(outputs[name], null, 2) + "\n", "utf8");
  }
  for (const name of REQUIRED_OUTPUTS) {
    JSON.parse(fs.readFileSync(path.join(staging, name), "utf8"));
  }
  if (simulateFailureAfterStaging) {
    safeRemoveOwnedPath(staging, parent);
    throw new Error("Simulated Repository Truth failure after staging.");
  }
  if (fs.existsSync(state.outputRoot)) fs.renameSync(state.outputRoot, previous);
  fs.renameSync(staging, state.outputRoot);
  safeRemoveOwnedPath(previous, parent);
  return REQUIRED_OUTPUTS.map((name) => {
    const absolute = path.join(state.outputRoot, name);
    const stat = fs.statSync(absolute);
    return { kind: name.replace(".json", ""), path: relative(state.repositoryRoot, absolute), bytes: stat.size, sha256: sha256File(absolute) };
  }).sort((a, b) => a.path.localeCompare(b.path));
}

function validateBoundaries(repositoryRoot: string, outputRoot: string): { ok: boolean; message: string } {
  if (!fs.existsSync(repositoryRoot) || !fs.statSync(repositoryRoot).isDirectory()) return { ok: false, message: "Repository root does not exist or is not a directory." };
  if (!isPathInside(repositoryRoot, outputRoot)) return { ok: false, message: "Repository Truth output root must be inside repository root." };
  return { ok: true, message: "Repository Truth boundaries are valid." };
}

function blockedResult(state: TruthState, message: string): RepositoryTruthResult {
  return {
    ok: false,
    status: "BLOCKED",
    message,
    truthId: state.truthId,
    repositoryRoot: state.repositoryRoot,
    outputRoot: state.outputRoot,
    manifest: [],
    warningCount: state.warnings.length,
    errorCount: state.errors.length + 1,
    execution: {
      commandId: REPOSITORY_TRUTH_ENGINE_VERSION,
      attemptId: state.truthId,
      status: "BLOCKED",
      reason: message
    }
  };
}

function packageRecords(files: Record<RepositorySnapshotFileName, any>): PackageRecord[] {
  return [...(files["packages.json"].packages ?? [])].sort((a, b) => String(a.packageManifestPath).localeCompare(String(b.packageManifestPath)));
}

function declaredPackageRelationships(pkg: PackageRecord): string[] {
  return [
    ...Object.keys(pkg.dependencies ?? {}).map((name) => `dependency:${name}`),
    ...Object.keys(pkg.devDependencies ?? {}).map((name) => `devDependency:${name}`),
    ...Object.keys(pkg.peerDependencies ?? {}).map((name) => `peerDependency:${name}`),
    ...Object.keys(pkg.optionalDependencies ?? {}).map((name) => `optionalDependency:${name}`)
  ].sort();
}

function addDependencyEdges(edges: TruthEdge[], pkg: PackageRecord, deps: Record<string, string> | undefined, edgeType: DependencyEdgeType, packageNames: Map<string, string>): void {
  for (const name of Object.keys(deps ?? {}).sort()) {
    const target = packageNames.get(name);
    if (!target) continue;
    edges.push(edge(componentId(pkg.relativePath, pkg.name), target, edgeType, "FACT", 1, [pkg.packageManifestPath], `${edgeType} declared in package manifest`));
  }
}

function edge(source: string, target: string, edgeType: DependencyEdgeType, certainty: TruthCertainty, confidence: number, evidencePaths: string[], basis: string): TruthEdge {
  return { source, target, edgeType, certainty, confidence, evidencePaths: evidencePaths.map(normalizeSlash).sort(), basis };
}

function finding(id: string, severity: TruthSeverity, certainty: TruthCertainty, confidence: number, title: string, explanation: string, affectedComponents: string[], evidencePaths: string[], remediationCategory: string, rule: { id: string; version: string }, limitations: string[] = []): RepositoryTruthIssue {
  return {
    id,
    severity,
    certainty,
    confidence: certainty === "HEURISTIC" && confidence >= 1 ? 0.99 : confidence,
    title,
    explanation: redactSecrets(explanation),
    basis: redactSecrets(explanation),
    affectedComponents: affectedComponents.sort(),
    evidencePaths: evidencePaths.map(normalizeSlash).sort(),
    counterEvidencePaths: [],
    remediationCategory,
    automaticRemediationAllowed: false,
    ruleId: rule.id,
    ruleVersion: rule.version,
    limitations
  };
}

function collection(id: string, name: string, kind: ComponentKind, componentPath: string, area: ComponentArea, layer: ArchitectureLayer, evidencePaths: string[], confidence: number): TruthComponent {
  return {
    id,
    name,
    kind,
    path: componentPath,
    area,
    sourceFacts: [`Observed evidence family ${componentPath}`],
    declaredRelationships: [],
    inferredRelationships: [],
    architecturalClassification: layer,
    classificationCertainty: confidence >= 0.9 ? "DERIVED" : "HEURISTIC",
    confidence,
    basis: "Path-family classification from deterministic generated/runtime/legacy evidence rules.",
    evidencePaths: evidencePaths.map(normalizeSlash).sort(),
    contradictions: [],
    limitations: ["Family classification is based on deterministic path and inventory evidence."]
  };
}

function classifyLayer(relativePath: string, name?: string): ArchitectureLayer {
  if (relativePath === ".") return "kernel";
  if (name?.includes("operator-gateway")) return "runtime";
  if (name?.includes("desktop-operator")) return "desktop";
  if (relativePath.startsWith("apps/operator") || name?.includes("operator-console")) return "desktop";
  if (relativePath.startsWith("apps/")) return "desktop";
  if (name?.includes("model-provider")) return "provider";
  if (name?.includes("capability-engine")) return "capability";
  if (name?.includes("kernel") || name?.includes("contracts") || name?.includes("shared") || name?.includes("safety")) return "kernel";
  if (name && RUNTIME_PACKAGE_NAME_HINTS.some((hint) => name.includes(hint))) return "runtime";
  if (name?.includes("worker") || name?.includes("knowledge") || name?.includes("research") || name?.includes("autonomy") || name?.includes("self-improvement") || name?.includes("tools")) return "capability";
  if (relativePath.includes("legacy") || name?.includes("legacy")) return "legacy";
  return "review-required";
}

function areaForLayer(layer: ArchitectureLayer, relativePath: string): ComponentArea {
  if (relativePath === ".") return "platform candidate";
  if (layer === "legacy") return "legacy candidate";
  if (layer === "provider") return "provider candidate";
  if (layer === "capability") return "capability candidate";
  if (layer === "unclassified" || layer === "review-required") return "review-required";
  return "active candidate";
}

function legacyFamilies(files: Record<RepositorySnapshotFileName, any>): Array<{ name: string; path: string; evidencePaths: string[] }> {
  const scripts = files["scripts.json"].rootScripts ?? [];
  const docs = files["documents.json"].documents ?? [];
  const families: Array<{ name: string; path: string; evidencePaths: string[] }> = [];
  if (scripts.some((script: any) => /phase|overlay|zip|watcher|onedrive|browser/i.test(`${script.name} ${script.command}`))) {
    families.push({ name: "Phase/browser/ZIP/OneDrive orchestration scripts", path: "scripts", evidencePaths: ["package.json"] });
  }
  if (docs.some((doc: any) => /phase|legacy|overlay|zip|onedrive|browser/i.test(doc.path))) {
    families.push({ name: "Legacy phase and overlay documents", path: "docs", evidencePaths: ["documents.json"] });
  }
  return families.sort((a, b) => a.path.localeCompare(b.path));
}

function inventoryEntries(inventory: any): any[] {
  return Array.isArray(inventory?.targetSubsystems) ? [...inventory.targetSubsystems].sort((a, b) => String(a.id).localeCompare(String(b.id))) : [];
}

function readInventory(repositoryRoot: string, state: TruthState): any {
  const inventoryPath = path.join(repositoryRoot, "architecture", "capability-inventory.json");
  if (!fs.existsSync(inventoryPath)) {
    state.warnings.push(finding("repository_truth_inventory_missing", "warning", "FACT", 1, "Capability inventory missing", "architecture/capability-inventory.json was not observed.", [], ["architecture/capability-inventory.json"], "review-capability-inventory", RULES.inventory));
    return {};
  }
  try {
    return JSON.parse(fs.readFileSync(inventoryPath, "utf8"));
  } catch (error) {
    state.errors.push(finding("repository_truth_inventory_malformed", "error", "FACT", 1, "Capability inventory malformed", redactSecrets(error instanceof Error ? error.message : String(error)), [], ["architecture/capability-inventory.json"], "review-capability-inventory", RULES.inventory));
    return {};
  }
}

function detectCycles(edges: TruthEdge[]): string[][] {
  const graph = new Map<string, string[]>();
  for (const item of edges.filter((edge) => edge.edgeType.includes("dependency"))) {
    graph.set(item.source, [...(graph.get(item.source) ?? []), item.target].sort());
  }
  const cycles = new Set<string>();
  const visit = (node: string, stack: string[]): void => {
    if (stack.includes(node)) {
      const cycle = stack.slice(stack.indexOf(node)).concat(node);
      cycles.add(cycle.join(" -> "));
      return;
    }
    for (const next of graph.get(node) ?? []) visit(next, [...stack, node]);
  };
  for (const node of [...graph.keys()].sort()) visit(node, []);
  return [...cycles].sort().map((cycle) => cycle.split(" -> "));
}

function isUpwardLayerEdge(item: TruthEdge, components: TruthComponent[]): boolean {
  const source = components.find((component) => component.id === item.source);
  const target = components.find((component) => component.id === item.target);
  if (!source || !target) return false;
  const order: Record<ArchitectureLayer, number> = { kernel: 0, runtime: 1, provider: 2, capability: 3, studio: 4, desktop: 5, legacy: 6, "review-required": 7, unclassified: 7 };
  return order[source.architecturalClassification] < order[target.architecturalClassification] && item.edgeType !== "root workspace membership";
}

function componentId(relativePath: string, name?: string): string {
  return relativePath === "." ? "component:root" : `component:${normalizeSlash(name ?? relativePath).replace(/^@/, "").replace(/[^\w.-]+/g, "-")}`;
}

function componentIdFromName(name: string, files: Record<RepositorySnapshotFileName, any>): string {
  const pkg = packageRecords(files).find((candidate) => candidate.name === name || candidate.relativePath === name);
  return pkg ? componentId(pkg.relativePath, pkg.name) : `component:${normalizeSlash(name).replace(/^@/, "").replace(/[^\w.-]+/g, "-")}`;
}

function normalizeLayer(value: unknown): ArchitectureLayer {
  const normalized = String(value ?? "").toLowerCase();
  if (["kernel", "runtime", "provider", "capability", "studio", "desktop", "legacy"].includes(normalized)) return normalized as ArchitectureLayer;
  return "review-required";
}

function matchesWorkspacePattern(relativePath: string, pattern: string): boolean {
  const normalized = normalizeSlash(pattern);
  if (normalized.endsWith("/*")) return path.posix.dirname(relativePath) === normalized.slice(0, -2);
  return relativePath === normalized;
}

function countBy<T>(items: T[], selector: (item: T) => string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of items) counts[selector(item)] = (counts[selector(item)] ?? 0) + 1;
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
}

function duplicates(values: string[]): string[] {
  const seen = new Set<string>();
  const dupes = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) dupes.add(value);
    seen.add(value);
  }
  return [...dupes].sort();
}

function sortBy<T extends Record<string, any>>(items: T[], ...keys: string[]): T[] {
  return [...items].sort((a, b) => {
    for (const key of keys) {
      const result = String(a[key] ?? "").localeCompare(String(b[key] ?? ""));
      if (result !== 0) return result;
    }
    return 0;
  });
}

function createTruthId(repositoryRoot: string, createdAt: string): string {
  return `truth_${crypto.createHash("sha256").update(`${path.basename(repositoryRoot)}:${createdAt}`).digest("hex").slice(0, 12)}`;
}

function sha256File(filePath: string): string {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function sha256Text(text: string): string {
  return crypto.createHash("sha256").update(text).digest("hex");
}

function normalizeSlash(value: string): string {
  return normalizePath(value).replace(/\/+$/g, "");
}

function relative(root: string, target: string): string {
  return normalizeSlash(path.relative(root, target) || ".");
}

function safeRemoveOwnedPath(target: string, ownerRoot: string): void {
  if (!fs.existsSync(target)) return;
  if (!isPathInside(ownerRoot, target)) throw new Error("Refusing to remove path outside Repository Truth-owned output area.");
  fs.rmSync(target, { recursive: true, force: true });
}
