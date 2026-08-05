import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const REQUIRED_MANIFEST_FIELDS = [
  "schemaVersion",
  "taskId",
  "title",
  "created",
  "manager",
  "status",
  "operatingMode",
  "allowedPaths",
  "allowedActions",
  "networkPolicy",
  "forbiddenActions",
  "acceptanceCriteria",
  "requiredEvidence",
  "managerApproval",
  "humanDecisionPoint",
];

const READ_ONLY_ACTIONS = new Set([
  "git_status_short",
  "git_log_head",
  "git_ls_files",
  "git_grep",
  "read_approved_files",
  "npm_build",
  "npm_test",
  "base_mvp_verify_existing_release",
]);

const REQUIRED_DA001_ACTIONS = [
  "git_status_short",
  "git_log_head",
  "git_ls_files",
  "git_grep",
  "read_approved_files",
];

const AUDIT_TARGETS = [
  { lifecycle: "Package build", paths: ["package.json"], match: "\"build\"" },
  { lifecycle: "Launcher", paths: ["apps/cli/src/index.ts"], match: "S.E.R.A. CLI" },
  { lifecycle: "Runtime host", paths: ["packages/runtime-host/src/index.ts", "packages/runtime-host/src/runtime-host.ts"], match: "RuntimeHost" },
  { lifecycle: "Desktop Operator surface", paths: ["apps/desktop-operator/src/index.ts", "apps/operator-console/src/App.tsx"], match: "Desktop" },
  { lifecycle: "Source-grounded local workflow", paths: ["packages/kernel/src/sera-kernel.ts", "packages/portable-base-mvp/src/index.ts"], match: "runTask" },
  { lifecycle: "Evidence and review state", paths: ["packages/certs/src/certify.ts", "contracts/development-tasks/evidence-report-template-v1.md"], match: "evidence" },
  { lifecycle: "Restart and retrieval", paths: ["packages/runtime-recovery/src/index.ts", "packages/memory/src/memory-store.ts"], match: "restart" },
  { lifecycle: "Restricted-user Windows proof", paths: ["packages/portable-base-mvp/src/restricted-user-network.ts"], match: "restricted" },
];

function normalizePath(value) {
  return String(value ?? "").replaceAll("\\", "/");
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function isInside(rootDir, candidate) {
  const relative = path.relative(path.resolve(rootDir), path.resolve(candidate));
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
}

function isAllowedPath(relativePath, allowedPaths) {
  const normalized = normalizePath(relativePath);
  return allowedPaths.some((pattern) => {
    const normalizedPattern = normalizePath(pattern);
    if (normalizedPattern.endsWith("/**")) {
      return normalized.startsWith(normalizedPattern.slice(0, -2));
    }
    return normalized === normalizedPattern;
  });
}

function allowedGitGrepPaths(allowedPaths) {
  const paths = new Set();
  for (const allowedPath of allowedPaths) {
    const normalized = normalizePath(allowedPath).replace(/\/+$/, "");
    const candidate = normalized.endsWith("/**") ? normalized.slice(0, -3) : normalized;
    if (!candidate || candidate === "." || candidate === ".." || candidate.startsWith("../") || path.isAbsolute(candidate)) {
      continue;
    }
    paths.add(candidate);
  }
  return [...paths].sort();
}

function redact(value) {
  return String(value ?? "")
    .replace(/(api[_-]?key|token|secret|password)\s*[:=]\s*[^\s]+/gi, "$1=[REDACTED]")
    .replace(/sk-[A-Za-z0-9_-]{12,}/g, "sk-[REDACTED]");
}

function bounded(value, limit = 12_000) {
  const safe = redact(value);
  const bytes = Buffer.from(safe, "utf8");
  return bytes.length <= limit ? safe : `${bytes.subarray(0, limit).toString("utf8")}\n[TRUNCATED]`;
}

function runGit(repoRoot, args) {
  const result = spawnSync("git", args, {
    cwd: repoRoot,
    shell: false,
    encoding: "utf8",
    timeout: 15_000,
    windowsHide: true,
  });
  return {
    command: `git ${args.join(" ")}`,
    exitCode: typeof result.status === "number" ? result.status : null,
    timedOut: result.error?.code === "ETIMEDOUT",
    stdout: bounded(result.stdout),
    stderr: bounded(result.stderr),
    error: result.error ? bounded(result.error.message) : null,
  };
}

function statusForCommand(record) {
  return record.exitCode === 0 && !record.timedOut && !record.error ? "PASSED" : "FAILED";
}

function branchFromStatus(record) {
  const line = String(record.stdout ?? "").split(/\r?\n/, 1)[0] ?? "";
  return line.startsWith("## ") ? line.slice(3) : "UNKNOWN";
}

export function validateReadOnlyManifest(manifest) {
  const errors = [];
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) return ["Manifest must be a JSON object."];

  for (const field of REQUIRED_MANIFEST_FIELDS) {
    if (!(field in manifest)) errors.push(`Missing required field: ${field}`);
  }
  if (manifest.schemaVersion !== "1.0") errors.push("schemaVersion must be 1.0.");
  if (manifest.taskId !== "DA-001") errors.push("This runner accepts only taskId DA-001.");
  if (manifest.manager !== "Tyler Wallace") errors.push("manager must be Tyler Wallace.");
  if (manifest.status !== "APPROVED") errors.push("status must be APPROVED.");
  if (manifest.operatingMode !== "read_only") errors.push("operatingMode must be read_only.");
  if (manifest.networkPolicy?.mode !== "denied") errors.push("networkPolicy.mode must be denied.");
  if (manifest.managerApproval?.approvedBy !== "Tyler Wallace") errors.push("managerApproval.approvedBy must be Tyler Wallace.");
  if (manifest.managerApproval?.approvedMode !== "read_only") errors.push("managerApproval.approvedMode must be read_only.");
  if (!Array.isArray(manifest.allowedPaths) || manifest.allowedPaths.length === 0) errors.push("allowedPaths must be a non-empty array.");
  if (!Array.isArray(manifest.allowedActions) || manifest.allowedActions.length === 0) errors.push("allowedActions must be a non-empty array.");

  for (const action of manifest.allowedActions ?? []) {
    if (!READ_ONLY_ACTIONS.has(action)) errors.push(`Unrecognized or non-read-only action: ${action}`);
  }
  for (const action of REQUIRED_DA001_ACTIONS) {
    if (!(manifest.allowedActions ?? []).includes(action)) errors.push(`DA-001 requires allowed action: ${action}`);
  }
  return errors;
}

function inspectAuditTargets(repoRoot, manifest) {
  return AUDIT_TARGETS.map((target) => {
    const allowedPaths = target.paths.filter((item) => isAllowedPath(item, manifest.allowedPaths));
    const deniedPaths = target.paths.filter((item) => !isAllowedPath(item, manifest.allowedPaths));
    const files = allowedPaths.map((relativePath) => {
      const absolutePath = path.join(repoRoot, relativePath);
      if (!fs.existsSync(absolutePath)) return { relativePath, exists: false, sha256: null, sizeBytes: null };
      const content = fs.readFileSync(absolutePath, "utf8");
      return { relativePath, exists: true, sha256: sha256(content), sizeBytes: Buffer.byteLength(content) };
    });
    const existing = files.filter((item) => item.exists);
    return {
      lifecycle: target.lifecycle,
      status: existing.length > 0 ? "HYPOTHESIS" : "BLOCKED",
      files,
      deniedPaths,
      proofLimitation: existing.length > 0
        ? "Source presence is not execution proof; this runner did not claim the capability works."
        : "No approved target path was present in this checkout.",
    };
  });
}

function reportMarkdown(report) {
  const lines = [
    `# S.E.R.A. Development Agent Evidence Report — ${report.manifest.taskId}`,
    "",
    "## 1. Executive Summary",
    "",
    `- Result: ${report.result}`,
    `- Repository: ${report.repository.root}`,
    `- Baseline branch: ${report.repository.branch}`,
    `- Baseline HEAD: ${report.repository.head}`,
    `- Manifest SHA-256: ${report.manifest.sha256}`,
    `- Runner version: ${report.runnerVersion}`,
    "",
    "## 2. Scope and Authority",
    "",
    `- Manager: ${report.manifest.manager}`,
    `- Operating mode: ${report.manifest.operatingMode}`,
    `- Network policy: ${report.manifest.networkPolicy}`,
    `- Source changes authorized: No`,
    `- Source changes observed: ${report.noChangeVerification.changedDuringRun ? "Yes" : "No"}`,
    "",
    "## 3. Commands Executed",
    "",
    "| Command | Result | Evidence classification |",
    "|---|---|---|",
    ...report.commands.map((command) => `| ${command.command} | ${statusForCommand(command)} | DEMONSTRATED |`),
    "",
    "## 4. Findings",
    "",
    "| ID | Finding | Classification | Exact supporting paths or artifacts | Why this classification is correct |",
    "|---|---|---|---|---|",
    ...report.capabilityMap.map((item, index) => {
      const paths = item.files.filter((file) => file.exists).map((file) => file.relativePath).join("<br>") || "None found";
      return `| F-${String(index + 1).padStart(3, "0")} | ${item.lifecycle} | ${item.status} | ${paths} | ${item.proofLimitation} |`;
    }),
    "",
    "## 5. Current Capability Map",
    "",
    "| Lifecycle requirement | Current repository evidence | Status | Proof limitation or gap |",
    "|---|---|---|---|",
    ...report.capabilityMap.map((item) => {
      const paths = item.files.filter((file) => file.exists).map((file) => file.relativePath).join(", ") || "No approved path found";
      return `| ${item.lifecycle} | ${paths} | ${item.status} | ${item.proofLimitation} |`;
    }),
    "",
    "## 6. Required Condition Results",
    "",
    "| Contract condition | Result | Supporting evidence |",
    "|---|---|---|",
    `| Approved read-only, network-denied manifest | ${report.manifest.valid ? "PASSED" : "FAILED"} | manifest validation |`,
    `| No repository changes during runner execution | ${report.noChangeVerification.changedDuringRun ? "FAILED" : "PASSED"} | pre/post git status --short |`,
    "",
    "## 7. No-Change Verification",
    "",
    `- Changed files before run: ${report.noChangeVerification.before || "None"}`,
    `- Changed files after run: ${report.noChangeVerification.after || "None"}`,
    `- Confirmation: ${report.noChangeVerification.changedDuringRun ? "Repository state changed during the audit; review is required." : "The runner observed no repository-state change during the audit."}`,
    "",
    "## 8. Proposed Next Task Contract",
    "",
    "- Proposed task ID: DA-002",
    "- Title: Repository Truth Worker capability reconciliation",
    "- Suggested operating mode: propose_patch",
    "- Business reason: reconcile source-backed runtime components with the audit findings before enabling broader development authority.",
    "- Risks and required Manager decision: Tyler Wallace must approve or revise the exact file scope before implementation.",
    "",
    "## 9. Manager Decision Request",
    "",
    "Requested decision: `REJECT | REVISE | APPROVE_NEXT_TASK | CLOSE_AS_BLOCKED`",
    "",
    "Manager notes:",
    "```",
    "",
    "```",
    "",
  ];
  return lines.join("\n");
}

export function runDevelopmentAgentAuditV1({ repoRoot = process.cwd(), manifestPath, outputDir } = {}) {
  const resolvedRepoRoot = path.resolve(repoRoot);
  if (!manifestPath) throw new Error("manifestPath is required.");
  const resolvedManifestPath = path.resolve(manifestPath);
  if (!isInside(resolvedRepoRoot, resolvedManifestPath)) throw new Error("Manifest must be inside the repository root.");
  if (!fs.existsSync(resolvedManifestPath)) throw new Error(`Manifest does not exist: ${resolvedManifestPath}`);

  const manifestRelativePath = normalizePath(path.relative(resolvedRepoRoot, resolvedManifestPath));
  const manifest = JSON.parse(fs.readFileSync(resolvedManifestPath, "utf8"));
  const manifestErrors = validateReadOnlyManifest(manifest);
  if (!isAllowedPath(manifestRelativePath, manifest.allowedPaths ?? [])) {
    manifestErrors.push(`Manifest path is outside its allowedPaths: ${manifestRelativePath}`);
  }
  if (manifestErrors.length > 0) {
    return { ok: false, result: "BLOCKED", errors: manifestErrors, executed: false };
  }

  const resolvedOutputDir = path.resolve(outputDir ?? path.join(os.tmpdir(), "sera-development-agent", manifest.taskId, new Date().toISOString().replaceAll(":", "-")));
  if (isInside(resolvedRepoRoot, resolvedOutputDir)) throw new Error("outputDir must be outside the repository root.");

  const before = runGit(resolvedRepoRoot, ["status", "--short"]);
  const baseline = runGit(resolvedRepoRoot, ["status", "--short", "--branch"]);
  const head = runGit(resolvedRepoRoot, ["log", "-1", "--format=%H %s"]);
  const grepPaths = allowedGitGrepPaths(manifest.allowedPaths);
  const commands = [
    before,
    baseline,
    head,
    runGit(resolvedRepoRoot, ["ls-files"]),
    grepPaths.length > 0
      ? runGit(resolvedRepoRoot, ["grep", "-n", "-I", "-e", "OperatorGateway", "-e", "RuntimeHost", "-e", "restricted", "--", ...grepPaths])
      : {
        command: "git grep [no approved paths]",
        exitCode: 1,
        timedOut: false,
        stdout: "",
        stderr: "No approved paths were available for git grep.",
        error: null,
      },
  ];
  const capabilityMap = inspectAuditTargets(resolvedRepoRoot, manifest);
  const after = runGit(resolvedRepoRoot, ["status", "--short"]);
  commands.push(after);

  const report = {
    runnerVersion: "development-agent-runner-v1",
    result: "REVIEW_REQUIRED",
    manifest: {
      taskId: manifest.taskId,
      manager: manifest.manager,
      operatingMode: manifest.operatingMode,
      networkPolicy: manifest.networkPolicy.mode,
      sha256: sha256(fs.readFileSync(resolvedManifestPath, "utf8")),
      valid: true,
    },
    repository: {
      root: resolvedRepoRoot,
      branch: branchFromStatus(baseline),
      head: head.stdout.trim() || "UNKNOWN",
    },
    commands,
    capabilityMap,
    noChangeVerification: {
      before: before.stdout.trim(),
      after: after.stdout.trim(),
      changedDuringRun: before.stdout !== after.stdout || before.stderr !== after.stderr || before.exitCode !== after.exitCode,
    },
  };

  fs.mkdirSync(resolvedOutputDir, { recursive: true });
  const jsonPath = path.join(resolvedOutputDir, `${manifest.taskId}-evidence.json`);
  const markdownPath = path.join(resolvedOutputDir, `${manifest.taskId}-evidence-report.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  fs.writeFileSync(markdownPath, reportMarkdown(report), "utf8");
  return { ok: true, result: report.result, executed: true, outputDir: resolvedOutputDir, jsonPath, markdownPath, report };
}
