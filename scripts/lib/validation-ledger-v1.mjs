import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";

export const VALIDATION_LEDGER_SCHEMA = "sera.validation-ledger.v1";
export const CLEAN_TREE_REQUIRED_CODE = "validation_evidence_requires_clean_tree";
export const REQUIRED_COMPONENTS = ["hygiene", "free-core", "knowledge", "build", "vitest"];

export function sha256Buffer(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

export function sha256Text(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

export function sha256File(file) {
  return sha256Buffer(fs.readFileSync(file));
}

export function stableJson(value) {
  return JSON.stringify(normalize(value));
}

export function normalize(value) {
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, normalize(item)]));
  }
  return value;
}

export function finalEvidenceDigest(evidence) {
  const copy = JSON.parse(JSON.stringify(evidence));
  delete copy.finalEvidenceDigest;
  return sha256Text(stableJson(copy));
}

export function gitText(args, root) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

export function currentGitState(root = process.cwd()) {
  const statusShort = gitText(["status", "--short", "--untracked-files=all"], root);
  return {
    head: gitText(["rev-parse", "--short", "HEAD"], root),
    headFull: gitText(["rev-parse", "HEAD"], root),
    branch: gitText(["branch", "--show-current"], root),
    statusShort,
    dirty: statusShort.length > 0,
    cleanTree: statusShort.length === 0
  };
}

export function sourceTreeDigest(root = process.cwd()) {
  const output = execFileSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], { cwd: root, encoding: "buffer", stdio: ["ignore", "pipe", "pipe"] });
  const files = output.toString("utf8").split("\0").filter(Boolean).map((file) => file.replace(/\\/g, "/")).filter((file) => relevantSourceInput(file)).sort((a, b) => a.localeCompare(b));
  const entries = files.map((file) => {
    const full = path.join(root, file);
    return { path: file, size: fs.statSync(full).size, sha256: sha256File(full) };
  });
  return { digest: sha256Text(stableJson(entries)), entries };
}

export function relevantSourceInput(file) {
  const normalized = file.replace(/\\/g, "/");
  const excludedPrefixes = [
    ".git/",
    ".sera/",
    ".sera-",
    "node_modules/",
    "dist/",
    "coverage/",
    "apps/desktop-operator/dist/"
  ];
  if (excludedPrefixes.some((prefix) => normalized.startsWith(prefix))) return false;
  if (normalized.endsWith(".tsbuildinfo")) return false;
  if (normalized.includes("/dist/")) return false;
  return /\.(ts|tsx|js|mjs|cjs|json|md|txt|cmd|ps1|csv|yml|yaml|html|css|lock)$/.test(normalized) || normalized === "package-lock.json" || normalized === "package.json" || normalized === ".gitignore";
}

export function environmentProfile() {
  return {
    nodeVersion: process.version,
    npmUserAgent: process.env.npm_config_user_agent ?? null,
    platform: process.platform,
    architecture: process.arch,
    osRelease: os.release(),
    cpuCount: os.cpus().length
  };
}

export function runCommand(root, component, command, args) {
  const startedAt = new Date().toISOString();
  const result = spawnSync(command, args, { cwd: root, encoding: "utf8", shell: process.platform === "win32" });
  const completedAt = new Date().toISOString();
  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";
  return {
    component,
    command: [command, ...args],
    startedAt,
    completedAt,
    exitCode: result.status ?? 1,
    signal: result.signal ?? null,
    stdoutSha256: sha256Text(stdout),
    stderrSha256: sha256Text(stderr),
    stdoutTail: stdout.slice(-4000),
    stderrTail: stderr.slice(-4000)
  };
}

export function parseVitest(commandResult) {
  const combined = `${commandResult.stdoutTail}\n${commandResult.stderrTail}`;
  const fileMatch = combined.match(/Test Files\s+(\d+)\s+passed\s+\((\d+)\)/);
  const testMatch = combined.match(/Tests\s+(\d+)\s+passed\s+\((\d+)\)/);
  return {
    testFileCount: fileMatch ? Number(fileMatch[2]) : 0,
    testCount: testMatch ? Number(testMatch[2]) : 0,
    passed: commandResult.exitCode === 0 && Boolean(fileMatch) && Boolean(testMatch)
  };
}

export function createValidationEvidence(root, commandResults) {
  const git = currentGitState(root);
  const tree = sourceTreeDigest(root);
  const vitest = parseVitest(commandResults.find((result) => result.component === "vitest") ?? {});
  const evidence = {
    schemaVersion: VALIDATION_LEDGER_SCHEMA,
    validationId: `validation_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
    createdAt: new Date().toISOString(),
    currentGitCommit: git.head,
    currentGitCommitFull: git.headFull,
    currentBranch: git.branch,
    sourceTreeDigest: tree.digest,
    sourceTreeEntryCount: tree.entries.length,
    packageLockDigest: sha256File(path.join(root, "package-lock.json")),
    dirtyTreeState: { dirty: git.dirty, statusShort: git.statusShort },
    cleanTree: git.cleanTree,
    commands: commandResults,
    buildResult: commandResults.find((result) => result.component === "build")?.exitCode === 0 ? "PASS" : "FAIL",
    testFileCount: vitest.testFileCount,
    testCount: vitest.testCount,
    testResult: vitest.passed ? "PASS" : "FAIL",
    environmentProfile: environmentProfile(),
    requiredComponents: REQUIRED_COMPONENTS,
    modelUse: false,
    publicNetworkUse: false
  };
  return { ...evidence, finalEvidenceDigest: finalEvidenceDigest(evidence) };
}

export function latestEvidencePath(root = process.cwd()) {
  const latestPath = path.join(root, ".sera", "validation-ledger", "latest.json");
  if (!fs.existsSync(latestPath)) throw new Error("Missing validation ledger latest pointer.");
  const pointer = JSON.parse(fs.readFileSync(latestPath, "utf8"));
  return path.resolve(root, pointer.path);
}

export function verifyValidationEvidence(evidence, expected, options = {}) {
  const requireCleanTree = options.requireCleanTree === true;
  const checks = {
    schema: evidence.schemaVersion === VALIDATION_LEDGER_SCHEMA,
    digest: evidence.finalEvidenceDigest === finalEvidenceDigest(evidence),
    commit: evidence.currentGitCommitFull === expected.currentGitCommitFull,
    branch: evidence.currentBranch === expected.currentBranch,
    sourceTreeDigest: evidence.sourceTreeDigest === expected.sourceTreeDigest,
    packageLockDigest: evidence.packageLockDigest === expected.packageLockDigest,
    dirtyTreeState: stableJson(evidence.dirtyTreeState) === stableJson(expected.dirtyTreeState),
    requiredComponentsPassed: REQUIRED_COMPONENTS.every((component) => evidence.commands?.some((command) => command.component === component && command.exitCode === 0)),
    buildPassed: evidence.buildResult === "PASS",
    testsPassed: evidence.testResult === "PASS" && Number(evidence.testFileCount) > 0 && Number(evidence.testCount) > 0,
    ...(requireCleanTree ? {
      evidenceCreatedFromCleanTree: evidence.cleanTree === true && evidence.dirtyTreeState?.dirty === false && evidence.dirtyTreeState?.statusShort === "",
      currentTreeClean: expected.cleanTree === true && expected.dirtyTreeState?.dirty === false && expected.dirtyTreeState?.statusShort === ""
    } : {})
  };
  const ok = Object.values(checks).every(Boolean);
  return { ok, checks, failureCode: !ok && requireCleanTree && (!checks.evidenceCreatedFromCleanTree || !checks.currentTreeClean) ? CLEAN_TREE_REQUIRED_CODE : undefined };
}

export function currentEvidenceExpectations(root = process.cwd()) {
  const git = currentGitState(root);
  return {
    currentGitCommitFull: git.headFull,
    currentBranch: git.branch,
    sourceTreeDigest: sourceTreeDigest(root).digest,
    packageLockDigest: sha256File(path.join(root, "package-lock.json")),
    dirtyTreeState: { dirty: git.dirty, statusShort: git.statusShort },
    cleanTree: git.cleanTree
  };
}
