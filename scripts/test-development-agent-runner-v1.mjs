import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { runDevelopmentAgentAuditV1, validateReadOnlyManifest } from "./lib/development-agent-runner-v1.mjs";

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "sera-development-agent-test-"));
const repoRoot = path.join(tempRoot, "repo");
const outputDir = path.join(tempRoot, "evidence");

function write(relativePath, value) {
  const target = path.join(repoRoot, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, value, "utf8");
}

function git(args) {
  const result = spawnSync("git", args, { cwd: repoRoot, shell: false, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
}

try {
  fs.mkdirSync(repoRoot, { recursive: true });
  git(["init"]);
  write("package.json", JSON.stringify({ scripts: { build: "tsc -b", test: "vitest run" } }, null, 2));
  write("apps/cli/src/index.ts", "console.log('S.E.R.A. CLI');\n");
  write("packages/kernel/src/sera-kernel.ts", "export function runTask() {}\n");
  write("packages/unapproved/src/runtime-host.ts", "export const RuntimeHost = true;\n");
  write("packages/certs/src/certify.ts", "export const evidence = true;\n");
  write("contracts/development-tasks/evidence-report-template-v1.md", "# Evidence\n");
  const manifest = {
    schemaVersion: "1.0",
    taskId: "DA-001",
    title: "Packaged Runtime Truth Audit",
    created: "2026-08-05",
    manager: "Tyler Wallace",
    status: "APPROVED",
    operatingMode: "read_only",
    allowedPaths: ["apps/cli/**", "packages/kernel/**", "packages/certs/**", "contracts/**", "package.json"],
    allowedActions: ["git_status_short", "git_log_head", "git_ls_files", "git_grep", "read_approved_files"],
    networkPolicy: { mode: "denied", permittedEndpoints: [] },
    forbiddenActions: ["Edit any file"],
    acceptanceCriteria: [{ id: "AC-001", condition: "Audit repository truth." }],
    requiredEvidence: ["Evidence report"],
    managerApproval: { approvedBy: "Tyler Wallace", approvalDate: "2026-08-05", approvedMode: "read_only" },
    humanDecisionPoint: "Tyler Wallace reviews the result.",
  };
  write("contracts/development-tasks/DA-001-packaged-runtime-truth-audit-v1.json", `${JSON.stringify(manifest, null, 2)}\n`);
  git(["add", "."]);
  git(["-c", "user.name=S.E.R.A. Test", "-c", "user.email=sera-test@example.invalid", "commit", "-m", "fixture"]);

  assert.deepEqual(validateReadOnlyManifest({ ...manifest, manager: "Wrong Manager" }), ["manager must be Tyler Wallace."]);
  const result = runDevelopmentAgentAuditV1({
    repoRoot,
    manifestPath: path.join(repoRoot, "contracts/development-tasks/DA-001-packaged-runtime-truth-audit-v1.json"),
    outputDir,
  });
  assert.equal(result.ok, true);
  assert.equal(result.result, "REVIEW_REQUIRED");
  assert.equal(result.report.noChangeVerification.changedDuringRun, false);
  assert.notEqual(result.report.repository.branch, "UNKNOWN");
  assert.ok(fs.existsSync(result.jsonPath));
  assert.ok(fs.existsSync(result.markdownPath));
  assert.match(fs.readFileSync(result.markdownPath, "utf8"), /## 7\. No-Change Verification/);
  assert.doesNotMatch(result.report.commands.find((command) => command.command.startsWith("git grep")).stdout, /packages\/unapproved/);
  console.log("Development Agent runner v1: PASS");
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
