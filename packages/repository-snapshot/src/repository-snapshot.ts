import childProcess from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { type ExecutionResult } from "@sera/contracts";
import { isPathInside, normalizePath, redactSecrets } from "@sera/shared";

export const REPOSITORY_SNAPSHOT_SCHEMA_VERSION = "sera.repository-snapshot.v1";
export const REPOSITORY_SNAPSHOT_SCANNER_VERSION = "repository-snapshot-v1";

export type RepositorySnapshotStatus = "COMPLETED" | "BLOCKED" | "FAILED";
export type RepositorySnapshotSeverity = "warning" | "error";

export interface RepositorySnapshotClock {
  now(): Date;
}

export interface RepositorySnapshotOptions {
  repositoryRoot: string;
  outputRoot?: string;
  clock?: RepositorySnapshotClock;
  exclusions?: string[];
  simulateFailureAfterStaging?: boolean;
}

export interface RepositorySnapshotIssue {
  id: string;
  severity: RepositorySnapshotSeverity;
  message: string;
  evidencePaths: string[];
  facts: Record<string, unknown>;
}

export interface RepositorySnapshotOutputFile {
  kind: string;
  path: string;
  bytes: number;
  sha256: string;
}

export interface RepositorySnapshotResult {
  ok: boolean;
  status: RepositorySnapshotStatus;
  message: string;
  snapshotId?: string;
  repositoryRoot: string;
  outputRoot: string;
  manifest: RepositorySnapshotOutputFile[];
  warnings: RepositorySnapshotIssue[];
  errors: RepositorySnapshotIssue[];
  summary?: RepositorySnapshotSummary;
  execution: ExecutionResult;
}

export interface PortableRepositoryIdentity {
  rootName: string;
  packageName?: string;
  packageVersion?: string;
  hasPackageLock: boolean;
  hasTsconfig: boolean;
}

export interface GitBaseline {
  available: boolean;
  repository: boolean;
  branch?: string;
  detached: boolean;
  headCommit?: string;
  clean?: boolean;
  changedFileCount?: number;
  stagedFileCount?: number;
  unstagedFileCount?: number;
  untrackedFileCount?: number;
  upstreamMetadataAvailable?: boolean;
  unavailableReason?: string;
}

export interface FileObservation {
  path: string;
  extension: string;
  sizeBytes: number;
  sha256?: string;
}

export interface DirectoryExclusion {
  path: string;
  reason: string;
}

export interface RepositorySnapshotSummary {
  schemaVersion: string;
  scannerVersion: string;
  snapshotId: string;
  createdAt: string;
  totalFilesObserved: number;
  workspaceCount: number;
  packageCount: number;
  applicationCount: number;
  sourceFileCounts: Record<string, number>;
  testFileCounts: Record<string, number>;
  documentCounts: Record<string, number>;
  projectReferenceCount: number;
  localDependencyCount: number;
  warningCount: number;
  errorCount: number;
  exclusions: DirectoryExclusion[];
  scanDurationMs: number;
  finalStatus: RepositorySnapshotStatus;
  generatedOutputPaths: string[];
  knownLimitations: string[];
}

interface PackageManifest {
  name?: string;
  version?: string;
  private?: boolean;
  workspaces?: string[] | { packages?: string[] };
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  exports?: unknown;
  main?: string;
  module?: string;
  types?: string;
}

interface TsconfigReference {
  path?: unknown;
}

interface ScanState {
  repositoryRoot: string;
  outputRoot: string;
  createdAt: string;
  snapshotId: string;
  startedMs: number;
  warnings: RepositorySnapshotIssue[];
  errors: RepositorySnapshotIssue[];
  exclusions: DirectoryExclusion[];
  files: FileObservation[];
}

const REQUIRED_OUTPUTS = [
  "snapshot.json",
  "workspaces.json",
  "packages.json",
  "scripts.json",
  "tests.json",
  "references.json",
  "documents.json",
  "summary.json"
] as const;

const DEFAULT_EXCLUSIONS = [
  ".git",
  "node_modules",
  "dist",
  "build",
  "coverage",
  ".tmp",
  "tmp",
  "temp",
  ".overlay",
  ".sera/repository",
  ".sera/repository-truth",
  ".sera/control-plane",
  ".sera/runtime-host",
  ".sera/recovery",
  ".sera/state",
  ".sera/executions",
  ".sera/evaluations",
  ".sera/model-runtime",
  ".sera/intake",
  ".sera/knowledge",
  ".sera/capability-engine",
  ".sera/capabilities",
  ".sera/operator",
  ".sera/desktop",
  ".sera/operator-gateway",
  ".sera/studios",
  ".sera/studio-runtime",
  ".sera/integrated-loop",
  ".sera/learning-governance",
  ".sera-runs",
  ".sera-cert",
  ".sera-local",
  ".sera-memory",
  ".sera-tasks",
  ".sera-knowledge",
  ".sera-console",
  ".sera-models",
  ".sera-autonomy",
  ".sera-proof"
];

const DOCUMENT_EXTENSIONS = new Set([".md", ".mdx", ".txt", ".adoc", ".rst"]);
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json", ".ps1"]);
const TEST_PATTERN = /(^|[./\\_-])(test|spec)s?([./\\_-]|$)|\.(test|spec)\.[cm]?[tj]sx?$/i;
const HASH_MAX_BYTES = 2_000_000;

export class RepositorySnapshotScanner {
  run(options: RepositorySnapshotOptions): RepositorySnapshotResult {
    const startedMs = Date.now();
    const clock = options.clock ?? { now: () => new Date() };
    const repositoryRoot = path.resolve(options.repositoryRoot);
    const outputRoot = path.resolve(options.outputRoot ?? path.join(repositoryRoot, ".sera", "repository"));
    const createdAt = clock.now().toISOString();
    const snapshotId = createSnapshotId(repositoryRoot, createdAt);
    const state: ScanState = {
      repositoryRoot,
      outputRoot,
      createdAt,
      snapshotId,
      startedMs,
      warnings: [],
      errors: [],
      exclusions: [],
      files: []
    };

    try {
      const boundary = this.validateBoundaries(repositoryRoot, outputRoot, state);
      if (!boundary.ok) {
        return this.blockedResult(state, boundary.message);
      }

      const exclusions = normalizeExclusions(options.exclusions ?? DEFAULT_EXCLUSIONS);
      this.walkRepository(state, exclusions);

      const rootManifest = readJsonFile<PackageManifest>(repositoryRoot, "package.json", state, true);
      const rootTsconfig = readJsonFile<{ references?: TsconfigReference[] }>(repositoryRoot, "tsconfig.json", state, false);
      const git = observeGit(repositoryRoot);
      const workspaces = buildWorkspaces(state, rootManifest.value);
      const packages = buildPackages(state, workspaces, rootTsconfig.value);
      const scripts = buildScripts(rootManifest.value, packages);
      const references = buildReferences(state, rootManifest.value, rootTsconfig.value, packages);
      const tests = buildTests(state, packages, scripts);
      const documents = buildDocuments(state);
      const summary = buildSummary(state, workspaces, packages, references, tests, documents, startedMs, "COMPLETED");
      const snapshot = buildSnapshot(state, rootManifest.value, git, summary);

      const outputs: Record<string, unknown> = {
        "snapshot.json": snapshot,
        "workspaces.json": workspaces,
        "packages.json": packages,
        "scripts.json": scripts,
        "tests.json": tests,
        "references.json": references,
        "documents.json": documents,
        "summary.json": summary
      };

      const manifest = this.atomicWriteOutputs(state, outputs, options.simulateFailureAfterStaging ?? false);
      const execution: ExecutionResult = {
        commandId: "repository-snapshot-v1",
        attemptId: snapshotId,
        status: "COMPLETED",
        evidenceDirectory: ".sera/repository"
      };
      return {
        ok: true,
        status: "COMPLETED",
        message: "Repository Snapshot v1 completed.",
        snapshotId,
        repositoryRoot,
        outputRoot,
        manifest,
        warnings: state.warnings,
        errors: state.errors,
        summary,
        execution
      };
    } catch (error) {
      const message = redactSecrets(error instanceof Error ? error.message : String(error));
      state.errors.push(issue("repository_snapshot_failed", "error", message, [], {}));
      return {
        ok: false,
        status: "FAILED",
        message,
        snapshotId,
        repositoryRoot,
        outputRoot,
        manifest: [],
        warnings: state.warnings,
        errors: state.errors,
        execution: {
          commandId: "repository-snapshot-v1",
          attemptId: snapshotId,
          status: "FAILED",
          reason: message
        }
      };
    }
  }

  private validateBoundaries(repositoryRoot: string, outputRoot: string, state: ScanState): { ok: boolean; message: string } {
    if (!fs.existsSync(repositoryRoot)) {
      return { ok: false, message: "Repository root does not exist." };
    }
    const rootStat = fs.statSync(repositoryRoot);
    if (!rootStat.isDirectory()) {
      return { ok: false, message: "Repository root is not a directory." };
    }
    if (!isPathInside(repositoryRoot, outputRoot)) {
      return { ok: false, message: "Repository Snapshot output root must be inside the repository root." };
    }
    if (!normalizeRelativePath(repositoryRoot, outputRoot).startsWith(".sera/repository")) {
      state.warnings.push(issue("custom_output_root", "warning", "Output root override is not the default .sera/repository path.", [normalizeRelativePath(repositoryRoot, outputRoot)], {}));
    }
    return { ok: true, message: "Repository root and output root are valid." };
  }

  private blockedResult(state: ScanState, message: string): RepositorySnapshotResult {
    const blocked = issue("repository_snapshot_blocked", "error", message, [], {});
    return {
      ok: false,
      status: "BLOCKED",
      message,
      snapshotId: state.snapshotId,
      repositoryRoot: state.repositoryRoot,
      outputRoot: state.outputRoot,
      manifest: [],
      warnings: state.warnings,
      errors: [blocked],
      execution: {
        commandId: "repository-snapshot-v1",
        attemptId: state.snapshotId,
        status: "BLOCKED",
        reason: message
      }
    };
  }

  private walkRepository(state: ScanState, exclusions: Set<string>): void {
    const visit = (absoluteDir: string): void => {
      let entries: fs.Dirent[];
      try {
        entries = fs.readdirSync(absoluteDir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
      } catch (error) {
        state.warnings.push(issue("inaccessible_directory", "warning", "Directory could not be read.", [normalizeRelativePath(state.repositoryRoot, absoluteDir)], { error: redactSecrets(error instanceof Error ? error.message : String(error)) }));
        return;
      }

      for (const entry of entries) {
        const absolutePath = path.join(absoluteDir, entry.name);
        const relativePath = normalizeRelativePath(state.repositoryRoot, absolutePath);
        if (relativePath === ".") continue;
        if (isExcluded(relativePath, exclusions)) {
          state.exclusions.push({ path: relativePath, reason: "default exclusion" });
          continue;
        }

        let lstat: fs.Stats;
        try {
          lstat = fs.lstatSync(absolutePath);
        } catch (error) {
          state.warnings.push(issue("inaccessible_path", "warning", "Path could not be inspected.", [relativePath], { error: redactSecrets(error instanceof Error ? error.message : String(error)) }));
          continue;
        }

        if (lstat.isSymbolicLink()) {
          state.exclusions.push({ path: relativePath, reason: "symbolic link or junction not followed" });
          continue;
        }
        if (lstat.isDirectory()) {
          visit(absolutePath);
          continue;
        }
        if (lstat.isFile()) {
          state.files.push({
            path: relativePath,
            extension: path.extname(entry.name).toLowerCase(),
            sizeBytes: lstat.size,
            sha256: lstat.size <= HASH_MAX_BYTES ? sha256File(absolutePath) : undefined
          });
        }
      }
    };
    visit(state.repositoryRoot);
    if (exclusions.has(".sera/repository")) {
      state.exclusions.push({ path: ".sera/repository", reason: "default exclusion" });
    }
    state.files.sort((a, b) => a.path.localeCompare(b.path));
    state.exclusions = uniqueSorted(state.exclusions, (item) => `${item.path}:${item.reason}`);
  }

  private atomicWriteOutputs(state: ScanState, outputs: Record<string, unknown>, simulateFailureAfterStaging: boolean): RepositorySnapshotOutputFile[] {
    const parent = path.dirname(state.outputRoot);
    fs.mkdirSync(parent, { recursive: true });
    const staging = path.join(parent, `.repository-staging-${state.snapshotId}`);
    const previous = path.join(parent, `.repository-previous-${state.snapshotId}`);
    safeRemoveOwnedPath(staging, parent);
    safeRemoveOwnedPath(previous, parent);
    fs.mkdirSync(staging, { recursive: true });

    for (const name of REQUIRED_OUTPUTS) {
      const target = path.join(staging, name);
      fs.writeFileSync(target, JSON.stringify(outputs[name], null, 2) + "\n", "utf8");
    }
    for (const name of REQUIRED_OUTPUTS) {
      JSON.parse(fs.readFileSync(path.join(staging, name), "utf8"));
    }
    if (simulateFailureAfterStaging) {
      safeRemoveOwnedPath(staging, parent);
      throw new Error("Simulated Repository Snapshot failure after staging.");
    }

    if (fs.existsSync(state.outputRoot)) {
      fs.renameSync(state.outputRoot, previous);
    }
    fs.renameSync(staging, state.outputRoot);
    safeRemoveOwnedPath(previous, parent);

    return REQUIRED_OUTPUTS.map((name) => {
      const absolutePath = path.join(state.outputRoot, name);
      const stat = fs.statSync(absolutePath);
      return {
        kind: name.replace(".json", ""),
        path: normalizeRelativePath(state.repositoryRoot, absolutePath),
        bytes: stat.size,
        sha256: sha256File(absolutePath)
      };
    }).sort((a, b) => a.path.localeCompare(b.path));
  }
}

export function runRepositorySnapshot(options: RepositorySnapshotOptions): RepositorySnapshotResult {
  return new RepositorySnapshotScanner().run(options);
}

function buildSnapshot(state: ScanState, rootManifest: PackageManifest | undefined, git: GitBaseline, summary: RepositorySnapshotSummary): Record<string, unknown> {
  return {
    schemaVersion: REPOSITORY_SNAPSHOT_SCHEMA_VERSION,
    snapshotId: state.snapshotId,
    scannerVersion: REPOSITORY_SNAPSHOT_SCANNER_VERSION,
    createdAt: state.createdAt,
    repository: {
      identity: portableRepositoryIdentity(state.repositoryRoot, rootManifest),
      git
    },
    sourceBaseline: {
      git,
      fileCount: state.files.length
    },
    requestedOperation: {
      command: "repository snapshot",
      outputRoot: ".sera/repository"
    },
    finalStatus: "COMPLETED",
    outputFileManifest: REQUIRED_OUTPUTS.map((name) => `.sera/repository/${name}`).sort(),
    warningCount: state.warnings.length,
    errorCount: state.errors.length,
    warnings: state.warnings,
    errors: state.errors,
    modelUse: false,
    networkUse: false,
    observedToolProviderUse: [
      {
        provider: "node-fs",
        purpose: "deterministic local filesystem metadata scan",
        networkUse: false
      },
      {
        provider: "git-cli",
        purpose: "optional local repository baseline observation",
        networkUse: false,
        available: git.available
      }
    ],
    summaryPath: ".sera/repository/summary.json",
    knownLimitations: summary.knownLimitations
  };
}

function buildWorkspaces(state: ScanState, rootManifest: PackageManifest | undefined): Record<string, unknown> {
  const declared = workspacePatterns(rootManifest).sort();
  const packageManifestLocations = state.files.filter((file) => file.path.endsWith("package.json")).map((file) => file.path).sort();
  const packageManifests = packageManifestLocations.map((manifestPath) => {
    const dir = path.posix.dirname(manifestPath);
    const parsed = readJsonFile<PackageManifest>(state.repositoryRoot, manifestPath, state, manifestPath === "package.json");
    return {
      manifestPath,
      relativePath: dir === "." ? "." : dir,
      name: parsed.value?.name,
      kind: dir === "." ? "root" : dir.startsWith("apps/") ? "application" : dir.startsWith("packages/") ? "package" : "unknown"
    };
  }).sort(compareBy("manifestPath"));
  const missingDeclaredWorkspacePaths = declared.filter((pattern) => {
    const prefix = pattern.replace(/\/\*$/, "");
    return !fs.existsSync(path.join(state.repositoryRoot, prefix));
  }).sort();
  const names = packageManifests.map((item) => item.name).filter((name): name is string => Boolean(name)).sort();
  const duplicateDeclaredWorkspaceNames = duplicates(names);
  return {
    schemaVersion: REPOSITORY_SNAPSHOT_SCHEMA_VERSION,
    scannerVersion: REPOSITORY_SNAPSHOT_SCANNER_VERSION,
    rootWorkspace: packageManifests.find((item) => item.relativePath === ".") ?? null,
    declaredWorkspacePaths: declared,
    packageManifestLocations,
    workspaces: packageManifests,
    workspaceCount: packageManifests.length,
    packageWorkspaceCount: packageManifests.filter((item) => item.kind === "package").length,
    applicationWorkspaceCount: packageManifests.filter((item) => item.kind === "application").length,
    missingDeclaredWorkspacePaths,
    duplicateDeclaredWorkspaceNames,
    warnings: state.warnings.filter((warning) => warning.id.includes("package_manifest") || warning.id.includes("workspace"))
  };
}

function buildPackages(state: ScanState, workspaces: Record<string, unknown>, rootTsconfig: { references?: TsconfigReference[] } | undefined): Record<string, unknown> {
  void workspaces;
  const rootReferences = new Set((rootTsconfig?.references ?? []).map((ref) => typeof ref.path === "string" ? normalizeSlash(ref.path) : "").filter(Boolean));
  const packages = state.files.filter((file) => file.path.endsWith("package.json")).map((file) => {
    const relativePath = path.posix.dirname(file.path) === "." ? "." : path.posix.dirname(file.path);
    const parsed = readJsonFile<PackageManifest>(state.repositoryRoot, file.path, state, file.path === "package.json");
    const tsconfigPath = relativePath === "." ? "tsconfig.json" : `${relativePath}/tsconfig.json`;
    return {
      name: parsed.value?.name,
      version: parsed.value?.version,
      private: parsed.value?.private,
      relativePath,
      kind: relativePath === "." ? "root" : relativePath.startsWith("apps/") ? "application" : relativePath.startsWith("packages/") ? "package" : "unknown",
      packageManifestPath: file.path,
      scripts: sortedRecord(parsed.value?.scripts),
      dependencies: sortedRecord(parsed.value?.dependencies),
      devDependencies: sortedRecord(parsed.value?.devDependencies),
      peerDependencies: sortedRecord(parsed.value?.peerDependencies),
      optionalDependencies: sortedRecord(parsed.value?.optionalDependencies),
      exports: parsed.value?.exports,
      main: parsed.value?.main,
      module: parsed.value?.module,
      types: parsed.value?.types,
      associatedTsconfigPath: state.files.some((candidate) => candidate.path === tsconfigPath) ? tsconfigPath : undefined,
      declaredProjectReferenceParticipation: rootReferences.has(relativePath)
    };
  }).sort(compareBy("packageManifestPath"));
  return {
    schemaVersion: REPOSITORY_SNAPSHOT_SCHEMA_VERSION,
    scannerVersion: REPOSITORY_SNAPSHOT_SCANNER_VERSION,
    packages,
    packageCount: packages.filter((pkg) => pkg.kind === "package").length,
    applicationCount: packages.filter((pkg) => pkg.kind === "application").length,
    malformedPackageManifests: state.errors.filter((error) => error.id === "malformed_package_manifest")
  };
}

function buildScripts(rootManifest: PackageManifest | undefined, packagesDoc: Record<string, unknown>): Record<string, unknown> {
  const packages = packagesDoc.packages as Array<{ name?: string; relativePath: string; packageManifestPath: string; scripts?: Record<string, string> }>;
  const rootScripts = Object.entries(sortedRecord(rootManifest?.scripts)).map(([name, command]) => ({ name, command, owningWorkspace: "root", packageManifestPath: "package.json" }));
  const workspaceScripts = packages.flatMap((pkg) => Object.entries(sortedRecord(pkg.scripts)).map(([name, command]) => ({
    name,
    command,
    owningWorkspace: pkg.name ?? pkg.relativePath,
    packageManifestPath: pkg.packageManifestPath
  }))).sort(compareBy("owningWorkspace", "name"));
  const allScriptNames = [...rootScripts, ...workspaceScripts].map((script) => script.name).sort();
  return {
    schemaVersion: REPOSITORY_SNAPSHOT_SCHEMA_VERSION,
    scannerVersion: REPOSITORY_SNAPSHOT_SCANNER_VERSION,
    rootScripts,
    workspaceScripts,
    duplicateScriptNames: duplicates(allScriptNames),
    counts: {
      rootScriptCount: rootScripts.length,
      workspaceScriptCount: workspaceScripts.length,
      totalScriptDeclarationCount: rootScripts.length + workspaceScripts.length
    },
    executionPolicy: {
      discoveredScriptsExecuted: false
    }
  };
}

function buildReferences(state: ScanState, rootManifest: PackageManifest | undefined, rootTsconfig: { references?: TsconfigReference[] } | undefined, packagesDoc: Record<string, unknown>): Record<string, unknown> {
  const packages = packagesDoc.packages as Array<{ name?: string; relativePath: string; dependencies?: Record<string, string>; devDependencies?: Record<string, string>; peerDependencies?: Record<string, string>; optionalDependencies?: Record<string, string> }>;
  const workspaceNames = new Set(packages.map((pkg) => pkg.name).filter((name): name is string => Boolean(name)));
  const tsReferences = (rootTsconfig?.references ?? []).map((ref, index) => {
    if (typeof ref.path !== "string") {
      return {
        index,
        path: null,
        exists: false,
        malformed: true
      };
    }
    const normalized = normalizeSlash(ref.path);
    return {
      index,
      path: normalized,
      exists: fs.existsSync(path.join(state.repositoryRoot, normalized)),
      malformed: false
    };
  }).sort(compareBy("index"));
  const localRelationships = packages.flatMap((pkg) => {
    const deps = {
      dependencies: pkg.dependencies ?? {},
      devDependencies: pkg.devDependencies ?? {},
      peerDependencies: pkg.peerDependencies ?? {},
      optionalDependencies: pkg.optionalDependencies ?? {}
    };
    return Object.entries(deps).flatMap(([kind, values]) => Object.keys(values).filter((name) => workspaceNames.has(name)).map((name) => ({
      from: pkg.name ?? pkg.relativePath,
      to: name,
      kind
    })));
  }).sort(compareBy("from", "to", "kind"));
  const unresolvedDeclaredLocalWorkspaceNames = packages.flatMap((pkg) => {
    const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}), ...(pkg.peerDependencies ?? {}), ...(pkg.optionalDependencies ?? {}) };
    return Object.keys(deps).filter((name) => name.startsWith("@sera/") && !workspaceNames.has(name)).map((name) => ({ from: pkg.name ?? pkg.relativePath, dependency: name }));
  }).sort(compareBy("from", "dependency"));
  return {
    schemaVersion: REPOSITORY_SNAPSHOT_SCHEMA_VERSION,
    scannerVersion: REPOSITORY_SNAPSHOT_SCANNER_VERSION,
    typescriptProjectReferences: tsReferences,
    rootWorkspaceDeclarations: workspacePatterns(rootManifest).sort(),
    workspacePackageDependencies: localRelationships,
    declaredLocalPackageRelationships: localRelationships,
    missingReferencedPaths: tsReferences.filter((ref) => !ref.malformed && !ref.exists).map((ref) => ref.path).sort(),
    malformedReferenceEntries: tsReferences.filter((ref) => ref.malformed),
    unresolvedDeclaredLocalWorkspaceNames,
    counts: {
      projectReferenceCount: tsReferences.length,
      localDependencyCount: localRelationships.length
    }
  };
}

function buildTests(state: ScanState, packagesDoc: Record<string, unknown>, scriptsDoc: Record<string, unknown>): Record<string, unknown> {
  const packages = packagesDoc.packages as Array<{ name?: string; relativePath: string }>;
  const testFiles = state.files.filter((file) => TEST_PATTERN.test(file.path)).map((file) => {
    const owner = nearestWorkspace(file.path, packages);
    return {
      path: file.path,
      extension: file.extension,
      frameworkHints: frameworkHints(file.path, scriptsDoc),
      nearestOwningWorkspace: owner?.workspace,
      ownership: owner ? { confidence: owner.confidence, basis: owner.basis, evidencePaths: owner.evidencePaths } : { confidence: "none", basis: "no workspace path prefix matched", evidencePaths: [file.path] }
    };
  }).sort(compareBy("path"));
  const byWorkspace = countBy(testFiles, (file) => file.nearestOwningWorkspace ?? "unowned");
  const byExtension = countBy(testFiles, (file) => file.extension || "(none)");
  const rootScripts = scriptsDoc.rootScripts as Array<{ name: string; command: string }>;
  const workspaceScripts = scriptsDoc.workspaceScripts as Array<{ name: string; command: string; owningWorkspace: string }>;
  return {
    schemaVersion: REPOSITORY_SNAPSHOT_SCHEMA_VERSION,
    scannerVersion: REPOSITORY_SNAPSHOT_SCANNER_VERSION,
    testFiles,
    countsByWorkspace: byWorkspace,
    countsByFileType: byExtension,
    configuredTestCommands: [...rootScripts, ...workspaceScripts].filter((script) => /test|vitest|jest|node --test/i.test(`${script.name} ${script.command}`)).sort(compareBy("owningWorkspace", "name")),
    unownedTestFiles: testFiles.filter((file) => !file.nearestOwningWorkspace).map((file) => file.path)
  };
}

function buildDocuments(state: ScanState): Record<string, unknown> {
  const documents = state.files.filter((file) => DOCUMENT_EXTENSIONS.has(file.extension)).map((file) => ({
    path: file.path,
    extension: file.extension,
    sizeBytes: file.sizeBytes,
    sha256: file.sha256,
    categories: documentCategories(file.path)
  })).sort(compareBy("path"));
  return {
    schemaVersion: REPOSITORY_SNAPSHOT_SCHEMA_VERSION,
    scannerVersion: REPOSITORY_SNAPSHOT_SCANNER_VERSION,
    documents,
    architectureDocuments: documents.filter((doc) => doc.categories.includes("architecture")).map((doc) => doc.path),
    adrPaths: documents.filter((doc) => doc.categories.includes("adr")).map((doc) => doc.path),
    roadmapPaths: documents.filter((doc) => doc.categories.includes("roadmap")).map((doc) => doc.path),
    readmePaths: documents.filter((doc) => doc.categories.includes("readme")).map((doc) => doc.path),
    phaseDocumentPaths: documents.filter((doc) => doc.categories.includes("phase")).map((doc) => doc.path),
    legacyDocumentPaths: documents.filter((doc) => doc.categories.includes("legacy")).map((doc) => doc.path),
    counts: {
      totalDocumentCount: documents.length,
      architectureDocumentCount: documents.filter((doc) => doc.categories.includes("architecture")).length,
      adrCount: documents.filter((doc) => doc.categories.includes("adr")).length,
      roadmapCount: documents.filter((doc) => doc.categories.includes("roadmap")).length,
      readmeCount: documents.filter((doc) => doc.categories.includes("readme")).length,
      phaseDocumentCount: documents.filter((doc) => doc.categories.includes("phase")).length,
      legacyDocumentCount: documents.filter((doc) => doc.categories.includes("legacy")).length
    },
    interpretationPolicy: {
      contentInterpretedOrSummarized: false
    }
  };
}

function buildSummary(state: ScanState, workspaces: Record<string, unknown>, packagesDoc: Record<string, unknown>, references: Record<string, unknown>, tests: Record<string, unknown>, documents: Record<string, unknown>, startedMs: number, status: RepositorySnapshotStatus): RepositorySnapshotSummary {
  const packages = packagesDoc.packages as Array<{ kind: string }>;
  const sourceFileCounts = countBy(state.files.filter((file) => SOURCE_EXTENSIONS.has(file.extension)), (file) => file.extension || "(none)");
  const testFiles = tests.testFiles as Array<{ extension: string }>;
  return {
    schemaVersion: REPOSITORY_SNAPSHOT_SCHEMA_VERSION,
    scannerVersion: REPOSITORY_SNAPSHOT_SCANNER_VERSION,
    snapshotId: state.snapshotId,
    createdAt: state.createdAt,
    totalFilesObserved: state.files.length,
    workspaceCount: Number(workspaces.workspaceCount ?? 0),
    packageCount: packages.filter((pkg) => pkg.kind === "package").length,
    applicationCount: packages.filter((pkg) => pkg.kind === "application").length,
    sourceFileCounts,
    testFileCounts: countBy(testFiles, (file) => file.extension || "(none)"),
    documentCounts: (documents.counts ?? {}) as Record<string, number>,
    projectReferenceCount: Number((references.counts as Record<string, number>).projectReferenceCount ?? 0),
    localDependencyCount: Number((references.counts as Record<string, number>).localDependencyCount ?? 0),
    warningCount: state.warnings.length,
    errorCount: state.errors.length,
    exclusions: state.exclusions,
    scanDurationMs: Math.max(0, Date.now() - startedMs),
    finalStatus: status,
    generatedOutputPaths: REQUIRED_OUTPUTS.map((name) => `.sera/repository/${name}`).sort(),
    knownLimitations: [
      "Repository Snapshot v1 records observable facts only and does not classify architecture.",
      "Package activity, caller graphs, dead code, and semantic dependency inference are intentionally out of scope.",
      "Test framework hints are based only on filenames and declared scripts.",
      "Git metadata is optional and collected only from local commands when available."
    ]
  };
}

function observeGit(repositoryRoot: string): GitBaseline {
  const version = runGit(repositoryRoot, ["--version"]);
  if (!version.ok) {
    return { available: false, repository: false, detached: false, unavailableReason: version.error };
  }
  const inside = runGit(repositoryRoot, ["rev-parse", "--is-inside-work-tree"]);
  if (!inside.ok || inside.stdout.trim() !== "true") {
    return { available: true, repository: false, detached: false, unavailableReason: "not a git work tree" };
  }
  const branch = runGit(repositoryRoot, ["branch", "--show-current"]);
  const head = runGit(repositoryRoot, ["rev-parse", "HEAD"]);
  const status = runGit(repositoryRoot, ["status", "--short"]);
  const upstream = runGit(repositoryRoot, ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"]);
  const statusLines = status.ok ? status.stdout.split(/\r?\n/).filter(Boolean) : [];
  return {
    available: true,
    repository: true,
    branch: branch.stdout.trim() || undefined,
    detached: !branch.stdout.trim(),
    headCommit: head.ok ? head.stdout.trim() : undefined,
    clean: statusLines.length === 0,
    changedFileCount: statusLines.length,
    stagedFileCount: statusLines.filter((line) => line[0] !== " " && line[0] !== "?").length,
    unstagedFileCount: statusLines.filter((line) => line[1] !== " " && line[0] !== "?").length,
    untrackedFileCount: statusLines.filter((line) => line.startsWith("??")).length,
    upstreamMetadataAvailable: upstream.ok && upstream.stdout.trim().length > 0
  };
}

function runGit(cwd: string, args: string[]): { ok: boolean; stdout: string; error?: string } {
  try {
    const result = childProcess.spawnSync("git", args, { cwd, encoding: "utf8", windowsHide: true });
    return {
      ok: result.status === 0,
      stdout: result.stdout ?? "",
      error: redactSecrets(result.stderr || result.error?.message || `git ${args.join(" ")} failed`)
    };
  } catch (error) {
    return { ok: false, stdout: "", error: redactSecrets(error instanceof Error ? error.message : String(error)) };
  }
}

function readJsonFile<T>(repositoryRoot: string, relativePath: string, state: ScanState, required: boolean): { value?: T } {
  const absolutePath = path.join(repositoryRoot, relativePath);
  if (!fs.existsSync(absolutePath)) {
    if (required) {
      state.errors.push(issue("missing_required_json", "error", "Required JSON file is missing.", [relativePath], {}));
    }
    return {};
  }
  try {
    return { value: JSON.parse(stripBom(fs.readFileSync(absolutePath, "utf8"))) as T };
  } catch (error) {
    state.errors.push(issue(relativePath.endsWith("package.json") ? "malformed_package_manifest" : "malformed_json", "error", "JSON file could not be parsed.", [relativePath], { error: redactSecrets(error instanceof Error ? error.message : String(error)) }));
    return {};
  }
}

function portableRepositoryIdentity(repositoryRoot: string, rootManifest: PackageManifest | undefined): PortableRepositoryIdentity {
  return {
    rootName: path.basename(repositoryRoot),
    packageName: rootManifest?.name,
    packageVersion: rootManifest?.version,
    hasPackageLock: fs.existsSync(path.join(repositoryRoot, "package-lock.json")),
    hasTsconfig: fs.existsSync(path.join(repositoryRoot, "tsconfig.json"))
  };
}

function workspacePatterns(rootManifest: PackageManifest | undefined): string[] {
  const workspaces = rootManifest?.workspaces;
  if (Array.isArray(workspaces)) return workspaces.map(normalizeSlash).sort();
  if (workspaces?.packages && Array.isArray(workspaces.packages)) return workspaces.packages.map(normalizeSlash).sort();
  return [];
}

function nearestWorkspace(filePath: string, packages: Array<{ name?: string; relativePath: string }>): { workspace: string; confidence: string; basis: string; evidencePaths: string[] } | undefined {
  const candidates = packages
    .filter((pkg) => pkg.relativePath !== "." && (filePath === pkg.relativePath || filePath.startsWith(`${pkg.relativePath}/`)))
    .sort((a, b) => b.relativePath.length - a.relativePath.length);
  if (candidates[0]) {
    return {
      workspace: candidates[0].name ?? candidates[0].relativePath,
      confidence: "high",
      basis: "test path is inside workspace directory",
      evidencePaths: [filePath, `${candidates[0].relativePath}/package.json`]
    };
  }
  if (filePath.startsWith("tests/")) {
    return {
      workspace: "root",
      confidence: "medium",
      basis: "test path is under root tests directory",
      evidencePaths: [filePath, "package.json"]
    };
  }
  return undefined;
}

function frameworkHints(filePath: string, scriptsDoc: Record<string, unknown>): string[] {
  const hints = new Set<string>();
  if (filePath.includes(".test.") || filePath.includes(".spec.")) hints.add("filename:test-or-spec");
  const scriptText = JSON.stringify(scriptsDoc);
  if (/vitest/i.test(scriptText)) hints.add("declared-script:vitest");
  if (/jest/i.test(scriptText)) hints.add("declared-script:jest");
  if (/node --test/i.test(scriptText)) hints.add("declared-script:node-test");
  return [...hints].sort();
}

function documentCategories(filePath: string): string[] {
  const lower = filePath.toLowerCase();
  const categories = new Set<string>();
  if (lower.includes("/architecture/") || lower.startsWith("architecture/") || lower.startsWith("docs/architecture/")) categories.add("architecture");
  if (lower.includes("/adr/") || path.posix.basename(lower).startsWith("adr-")) categories.add("adr");
  if (lower.includes("roadmap")) categories.add("roadmap");
  if (path.posix.basename(lower).startsWith("readme")) categories.add("readme");
  if (lower.includes("phase")) categories.add("phase");
  if (lower.includes("legacy")) categories.add("legacy");
  return [...categories].sort();
}

function createSnapshotId(repositoryRoot: string, createdAt: string): string {
  return `snapshot_${crypto.createHash("sha256").update(`${normalizeSlash(path.basename(repositoryRoot))}:${createdAt}`).digest("hex").slice(0, 12)}`;
}

function sha256File(filePath: string): string {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function issue(id: string, severity: RepositorySnapshotSeverity, message: string, evidencePaths: string[], facts: Record<string, unknown>): RepositorySnapshotIssue {
  return { id, severity, message: redactSecrets(message), evidencePaths: evidencePaths.map(normalizeSlash).sort(), facts };
}

function normalizeRelativePath(root: string, target: string): string {
  const rel = path.relative(root, target);
  return rel ? normalizeSlash(rel) : ".";
}

function normalizeSlash(value: string): string {
  return normalizePath(value).replace(/\/+$/g, "");
}

function normalizeExclusions(exclusions: string[]): Set<string> {
  return new Set(exclusions.map(normalizeSlash));
}

function isExcluded(relativePath: string, exclusions: Set<string>): boolean {
  const firstSegment = relativePath.split("/")[0];
  if (firstSegment.startsWith(".sera-")) return true;
  return [...exclusions].some((excluded) => relativePath === excluded || relativePath.startsWith(`${excluded}/`));
}

function stripBom(value: string): string {
  return value.charCodeAt(0) === 0xfeff ? value.slice(1) : value;
}

function sortedRecord(input: Record<string, string> | undefined): Record<string, string> {
  return Object.fromEntries(Object.entries(input ?? {}).sort(([a], [b]) => a.localeCompare(b)));
}

function compareBy<T extends Record<string, any>>(...keys: string[]): (a: T, b: T) => number {
  return (a, b) => {
    for (const key of keys) {
      const result = String(a[key] ?? "").localeCompare(String(b[key] ?? ""));
      if (result !== 0) return result;
    }
    return 0;
  };
}

function countBy<T>(items: T[], selector: (item: T) => string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of items) {
    const key = selector(item);
    counts[key] = (counts[key] ?? 0) + 1;
  }
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

function uniqueSorted<T>(items: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const item of items) {
    const itemKey = key(item);
    if (!seen.has(itemKey)) {
      seen.add(itemKey);
      result.push(item);
    }
  }
  return result.sort((a, b) => key(a).localeCompare(key(b)));
}

function safeRemoveOwnedPath(target: string, ownerRoot: string): void {
  if (!fs.existsSync(target)) return;
  if (!isPathInside(ownerRoot, target)) {
    throw new Error("Refusing to remove path outside Repository Snapshot-owned output area.");
  }
  fs.rmSync(target, { recursive: true, force: true });
}
