import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";

export const VALIDATION_LEDGER_SCHEMA = "sera.validation-ledger.v1";
export const CLEAN_TREE_REQUIRED_CODE = "validation_evidence_requires_clean_tree";
export const TEST_EVIDENCE_UNRESOLVED_CODE = "validation_test_evidence_unresolved";
export const VALIDATION_EVIDENCE_INCONSISTENT_CODE = "validation_evidence_inconsistent";
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
  const combined = stripAnsi(`${commandResult.stdoutTail ?? ""}\n${commandResult.stderrTail ?? ""}`).replace(/\r\n?/g, "\n");
  const fileMatch = combined.match(/Test Files\s+(\d+)\s+passed\s+\((\d+)\)/);
  const testMatch = combined.match(/Tests\s+(\d+)\s+passed\s+\((\d+)\)/);
  const testFileCountParsed = Boolean(fileMatch);
  const testCountParsed = Boolean(testMatch);
  const testFileCount = fileMatch ? Number(fileMatch[2]) : 0;
  const testCount = testMatch ? Number(testMatch[2]) : 0;
  return {
    testFileCount,
    testCount,
    testFileCountParsed,
    testCountParsed,
    summaryParsed: testFileCountParsed && testCountParsed,
    passed: commandResult.exitCode === 0 && testFileCountParsed && testCountParsed && Number.isInteger(testFileCount) && testFileCount > 0 && Number.isInteger(testCount) && testCount > 0,
    failureReason: !testFileCountParsed || !testCountParsed || testFileCount <= 0 || testCount <= 0 ? TEST_EVIDENCE_UNRESOLVED_CODE : commandResult.exitCode !== 0 ? "validation_test_command_failed" : null
  };
}

export function stripAnsi(text) {
  return String(text).replace(/[\u001B\u009B][[\]()#;?]*(?:(?:(?:[a-zA-Z\d]*(?:;[-a-zA-Z\d\/#&.:=?%@~_]+)*)?\u0007)|(?:(?:\d{1,4}(?:[;:]\d{0,4})*)?[\dA-PR-TZcf-nq-uy=><~]))/g, "");
}

export function validationEvidenceOutcome(evidence) {
  const commands = Array.isArray(evidence.commands) ? evidence.commands : [];
  const vitestCommand = commands.find((result) => result.component === "vitest");
  const parsingResolved = evidence.testParsing
    ? evidence.testParsing.testFileCountParsed === true && evidence.testParsing.testCountParsed === true && evidence.testParsing.summaryParsed === true
    : evidence.testResult === "PASS" && Number(evidence.testFileCount) > 0 && Number(evidence.testCount) > 0;
  const checks = {
    everyRequiredComponentRan: REQUIRED_COMPONENTS.every((component) => commands.some((result) => result.component === component)),
    everyRequiredComponentPassed: REQUIRED_COMPONENTS.every((component) => commands.some((result) => result.component === component && result.exitCode === 0)),
    buildPassed: evidence.buildResult === "PASS",
    testCommandPassed: vitestCommand?.exitCode === 0,
    testParsingResolved: parsingResolved,
    positiveTestFileCount: Number.isInteger(evidence.testFileCount) && evidence.testFileCount > 0,
    positiveTestCount: Number.isInteger(evidence.testCount) && evidence.testCount > 0,
    testResultPassed: evidence.testResult === "PASS"
  };
  const failureReasons = [];
  if (!checks.everyRequiredComponentRan) failureReasons.push("validation_required_component_missing");
  if (!checks.everyRequiredComponentPassed) failureReasons.push("validation_required_component_failed");
  if (!checks.buildPassed) failureReasons.push("validation_build_failed");
  if (!checks.testCommandPassed) failureReasons.push("validation_test_command_failed");
  if (!checks.testParsingResolved || !checks.positiveTestFileCount || !checks.positiveTestCount) failureReasons.push(TEST_EVIDENCE_UNRESOLVED_CODE);
  if (!checks.testResultPassed) failureReasons.push("validation_tests_failed");
  return { ok: Object.values(checks).every(Boolean), checks, failureReasons: [...new Set(failureReasons)] };
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
    testParsing: vitest,
    environmentProfile: environmentProfile(),
    requiredComponents: REQUIRED_COMPONENTS,
    modelUse: false,
    publicNetworkUse: false
  };
  const validationResult = validationEvidenceOutcome(evidence);
  const complete = { ...evidence, validationResult };
  return { ...complete, finalEvidenceDigest: finalEvidenceDigest(complete) };
}

export function latestEvidencePath(root = process.cwd()) {
  const latestPath = path.join(root, ".sera", "validation-ledger", "latest.json");
  if (!fs.existsSync(latestPath)) throw new Error("Missing validation ledger latest pointer.");
  const pointer = JSON.parse(fs.readFileSync(latestPath, "utf8"));
  return path.resolve(root, pointer.path);
}

export function verifyValidationEvidence(evidence, expected, options = {}) {
  const requireCleanTree = options.requireCleanTree === true;
  const outcome = validationEvidenceOutcome(evidence);
  const recordedOutcomeConsistent = evidence.validationResult === undefined || stableJson(evidence.validationResult) === stableJson(outcome);
  const checks = {
    schema: evidence.schemaVersion === VALIDATION_LEDGER_SCHEMA,
    digest: evidence.finalEvidenceDigest === finalEvidenceDigest(evidence),
    commit: evidence.currentGitCommitFull === expected.currentGitCommitFull,
    branch: evidence.currentBranch === expected.currentBranch,
    sourceTreeDigest: evidence.sourceTreeDigest === expected.sourceTreeDigest,
    packageLockDigest: evidence.packageLockDigest === expected.packageLockDigest,
    dirtyTreeState: stableJson(evidence.dirtyTreeState) === stableJson(expected.dirtyTreeState),
    requiredComponentsPassed: outcome.checks.everyRequiredComponentRan && outcome.checks.everyRequiredComponentPassed,
    buildPassed: outcome.checks.buildPassed,
    testParsingResolved: outcome.checks.testParsingResolved,
    testsPassed: outcome.checks.testCommandPassed && outcome.checks.positiveTestFileCount && outcome.checks.positiveTestCount && outcome.checks.testResultPassed,
    validationConsistency: outcome.ok && recordedOutcomeConsistent,
    ...(requireCleanTree ? {
      evidenceCreatedFromCleanTree: evidence.cleanTree === true && evidence.dirtyTreeState?.dirty === false && evidence.dirtyTreeState?.statusShort === "",
      currentTreeClean: expected.cleanTree === true && expected.dirtyTreeState?.dirty === false && expected.dirtyTreeState?.statusShort === ""
    } : {})
  };
  const ok = Object.values(checks).every(Boolean);
  const failureCode = !ok && requireCleanTree && (!checks.evidenceCreatedFromCleanTree || !checks.currentTreeClean)
    ? CLEAN_TREE_REQUIRED_CODE
    : !checks.validationConsistency ? VALIDATION_EVIDENCE_INCONSISTENT_CODE
      : !checks.testParsingResolved || !checks.testsPassed ? TEST_EVIDENCE_UNRESOLVED_CODE : undefined;
  return { ok, checks, failureCode };
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
