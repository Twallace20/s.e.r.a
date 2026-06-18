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
  level: "none" | "secure-base";
  pass: boolean;
  checks: CertCheck[];
}

export function runSecureBaseCert(rootDir = process.cwd()): CertReport {
  const certRoot = path.join(rootDir, ".sera-cert");
  fs.mkdirSync(certRoot, { recursive: true });
  const sandboxRoot = fs.mkdtempSync(path.join(os.tmpdir(), "sera-cert-"));
  const kernel = new SeraKernel({ rootDir: sandboxRoot });
  const result = kernel.runTask("create hello file");
  const runDir = result.run.runDir;
  const helloPath = path.join(result.run.workspaceDir, "hello.txt");

  const requiredArtifacts = ["task.json", "plan.json", "run.json", "steps.jsonl", "tool-events.jsonl", "safety-events.jsonl", "final-report.md"];
  const checks: CertCheck[] = [
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

  const pass = checks.every((c) => c.pass);
  const report: CertReport = {
    createdAt: new Date().toISOString(),
    level: pass ? "secure-base" : "none",
    pass,
    checks
  };
  fs.writeFileSync(path.join(certRoot, "secure-base-cert.json"), JSON.stringify(report, null, 2) + "\n", "utf8");
  return report;
}

if (require.main === module) {
  const report = runSecureBaseCert(process.cwd());
  console.log(`S.E.R.A. certify: ${report.pass ? "PASS" : "FAIL"} level=${report.level}`);
  for (const check of report.checks) {
    console.log(`${check.pass ? "✓" : "✗"} ${check.id} — ${check.detail}`);
  }
  process.exit(report.pass ? 0 : 1);
}
