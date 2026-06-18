import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { SeraKernel } from "@sera/kernel";

export interface CertCheck {
  id: string;
  name: string;
  pass: boolean;
  detail: string;
}

export interface CertReport {
  createdAt: string;
  level: "none" | "secure-base" | "developer-worker-v1";
  pass: boolean;
  checks: CertCheck[];
}

export function runSecureBaseCert(rootDir = process.cwd()): CertReport {
  const certRoot = path.join(rootDir, ".sera-cert");
  fs.mkdirSync(certRoot, { recursive: true });
  const sandboxRoot = fs.mkdtempSync(path.join(os.tmpdir(), "sera-cert-"));
  const checks: CertCheck[] = [];

  checks.push(...runSecureBaseChecks(sandboxRoot));
  checks.push(...runDeveloperWorkerV1Checks());

  const pass = checks.every((c) => c.pass);
  const developerChecksPass = checks.filter((c) => c.id.startsWith("developer_")).every((c) => c.pass);
  const secureChecksPass = checks.filter((c) => !c.id.startsWith("developer_")).every((c) => c.pass);
  const level = pass && developerChecksPass ? "developer-worker-v1" : secureChecksPass ? "secure-base" : "none";

  const report: CertReport = {
    createdAt: new Date().toISOString(),
    level,
    pass,
    checks
  };
  fs.writeFileSync(path.join(certRoot, "secure-base-cert.json"), JSON.stringify(report, null, 2) + "\n", "utf8");
  return report;
}

function runSecureBaseChecks(sandboxRoot: string): CertCheck[] {
  const kernel = new SeraKernel({ rootDir: sandboxRoot });
  const result = kernel.runTask("create hello file");
  const runDir = result.run.runDir;
  const helloPath = path.join(result.run.workspaceDir, "hello.txt");

  const requiredArtifacts = ["task.json", "plan.json", "run.json", "steps.jsonl", "tool-events.jsonl", "safety-events.jsonl", "final-report.md"];
  return [
    { id: "kernel_run_ok", name: "Kernel can complete starter run", pass: result.ok, detail: result.message },
    { id: "workspace_created", name: "Workspace created", pass: fs.existsSync(result.run.workspaceDir), detail: result.run.workspaceDir },
    { id: "hello_written", name: "FileTool wrote hello.txt inside workspace", pass: fs.existsSync(helloPath), detail: helloPath },
    ...requiredArtifacts.map((rel) => ({
      id: `artifact_${rel.replace(/[^a-z0-9]+/gi, "_").toLowerCase()}`,
      name: `Artifact exists: ${rel}`,
      pass: fs.existsSync(path.join(runDir, rel)),
      detail: path.join(runDir, rel)
    }))
  ];
}

function runDeveloperWorkerV1Checks(): CertCheck[] {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "sera-dev-cert-"));
  const kernel = new SeraKernel({ rootDir: root });
  const filePath = path.join(root, "demo.txt");
  fs.writeFileSync(filePath, "alpha beta gamma\n", "utf8");

  const suggested = kernel.runDeveloperEditTask({
    mode: "suggested",
    relativePath: "demo.txt",
    find: "beta",
    replaceWith: "delta"
  });
  const sourceAfterSuggestion = fs.readFileSync(filePath, "utf8");

  const direct = kernel.runDeveloperEditTask({
    mode: "direct",
    relativePath: "demo.txt",
    find: "beta",
    replaceWith: "delta"
  });
  const sourceAfterDirect = fs.readFileSync(filePath, "utf8");

  const noOp = kernel.runDeveloperEditTask({
    mode: "direct",
    relativePath: "demo.txt",
    find: "does-not-exist",
    replaceWith: "unused"
  });

  const outsideBlocked = kernel.runDeveloperEditTask({
    mode: "direct",
    relativePath: "../outside.txt",
    find: "x",
    replaceWith: "y"
  });

  fs.mkdirSync(path.join(root, "src"), { recursive: true });
  const rollbackPath = path.join(root, "src", "rollback.txt");
  fs.writeFileSync(rollbackPath, "before\n", "utf8");
  const rollback = kernel.runDeveloperEditTask({
    mode: "direct",
    relativePath: "src/rollback.txt",
    find: "before",
    replaceWith: "after",
    validate: () => ({ ok: false, message: "simulated validation failure" })
  });
  const rollbackText = fs.readFileSync(rollbackPath, "utf8");

  return [
    {
      id: "developer_suggested_no_source_mutation",
      name: "Developer Worker suggested edit does not change source",
      pass: suggested.ok && suggested.developer.status === "completed" && sourceAfterSuggestion === "alpha beta gamma\n" && Boolean(suggested.developer.suggestionPath),
      detail: suggested.developer.suggestionPath ?? suggested.message
    },
    {
      id: "developer_direct_edit_applies_with_backup",
      name: "Developer Worker direct edit changes source and captures backup",
      pass: direct.ok && direct.developer.changed && sourceAfterDirect === "alpha delta gamma\n" && Boolean(direct.developer.backupPath),
      detail: direct.developer.backupPath ?? direct.message
    },
    {
      id: "developer_no_op_is_honest",
      name: "Developer Worker reports no_op when find text is missing",
      pass: noOp.ok && noOp.status === "no_op" && !noOp.developer.changed,
      detail: noOp.message
    },
    {
      id: "developer_outside_path_blocked",
      name: "Developer Worker blocks path traversal outside project root",
      pass: !outsideBlocked.ok && outsideBlocked.status === "blocked",
      detail: outsideBlocked.message
    },
    {
      id: "developer_validation_failure_rolls_back",
      name: "Developer Worker restores source when validation fails",
      pass: !rollback.ok && rollback.status === "failed" && rollback.developer.restored === true && rollbackText === "before\n",
      detail: rollback.message
    }
  ];
}

if (require.main === module) {
  const report = runSecureBaseCert(process.cwd());
  console.log(`S.E.R.A. certify: ${report.pass ? "PASS" : "FAIL"} level=${report.level}`);
  for (const check of report.checks) {
    console.log(`${check.pass ? "✓" : "✗"} ${check.id} — ${check.detail}`);
  }
  process.exit(report.pass ? 0 : 1);
}
