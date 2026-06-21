import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

async function loadCiGate() {
  return await import("../../scripts/lib/ci-workflow-gate-v1.mjs");
}

function tempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "sera-ci-gate-test-"));
}

function writeWorkflow(root, text) {
  const workflowPath = path.join(root, ".github", "workflows", "verify.yml");
  fs.mkdirSync(path.dirname(workflowPath), { recursive: true });
  fs.writeFileSync(workflowPath, text, "utf8");
  return workflowPath;
}

const safeWorkflow = `name: S.E.R.A. Verify Gate

on:
  workflow_dispatch:
  pull_request:
  push:

permissions:
  contents: read

concurrency:
  group: test
  cancel-in-progress: false

jobs:
  verify:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run phase25:verify && npm run verify
      - uses: actions/upload-artifact@v4
`;

describe("CI Workflow Gate v1", () => {
  it("initializes local CI gate runtime artifacts", async () => {
    const root = tempRoot();
    writeWorkflow(root, safeWorkflow);
    const { CiWorkflowGate } = await loadCiGate();
    const gate = new CiWorkflowGate({ rootDir: root });
    const init = gate.initialize();

    expect(init.ok).toBe(true);
    expect(fs.existsSync(init.eventPath)).toBe(true);
    expect(fs.existsSync(init.reportDir)).toBe(true);
  });

  it("passes a read-only verify workflow", async () => {
    const root = tempRoot();
    writeWorkflow(root, safeWorkflow);
    const { CiWorkflowGate } = await loadCiGate();
    const gate = new CiWorkflowGate({ rootDir: root });
    gate.initialize();
    const inspection = gate.inspectWorkflow();

    expect(inspection.ok).toBe(true);
    expect(inspection.blockers).toHaveLength(0);
    expect(inspection.warningCount).toBe(0);
    expect(inspection.mutatesSource).toBe(false);
    expect(inspection.requiresSecrets).toBe(false);
  });

  it("blocks workflows that can mutate repository history", async () => {
    const root = tempRoot();
    writeWorkflow(root, safeWorkflow + "\n      - run: git push origin main\n");
    const { CiWorkflowGate } = await loadCiGate();
    const gate = new CiWorkflowGate({ rootDir: root });
    gate.initialize();
    const inspection = gate.inspectWorkflow();

    expect(inspection.ok).toBe(false);
    expect(inspection.blockers).toContain("does_not_push_or_commit");
  });

  it("warns on dangerous workflow permissions", async () => {
    const root = tempRoot();
    writeWorkflow(root, safeWorkflow.replace("contents: read", "contents: write"));
    const { CiWorkflowGate } = await loadCiGate();
    const gate = new CiWorkflowGate({ rootDir: root });
    gate.initialize();
    const inspection = gate.inspectWorkflow();

    expect(inspection.ok).toBe(false);
    expect(inspection.warnings).toContain("contents_write_permission_detected");
  });

  it("writes evidence reports without requiring paid providers or secrets", async () => {
    const root = tempRoot();
    writeWorkflow(root, safeWorkflow);
    const { CiWorkflowGate } = await loadCiGate();
    const gate = new CiWorkflowGate({ rootDir: root });
    gate.initialize();
    const summary = gate.writeSummaryArtifacts();

    expect(summary.ok).toBe(true);
    expect(summary.paidProviderRequired).toBe(false);
    expect(summary.requiresSecrets).toBe(false);
    expect(summary.freeCoreDependency).toBe(false);
    expect(fs.existsSync(summary.jsonPath)).toBe(true);
    expect(fs.existsSync(summary.markdownPath)).toBe(true);
    expect(fs.existsSync(summary.historyPath)).toBe(true);
  });
});
