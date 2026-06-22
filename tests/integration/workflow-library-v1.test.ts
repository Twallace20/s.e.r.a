import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createDefaultWorkflowLibraryV1, inspectWorkflowLibraryV1 } from "../../scripts/lib/workflow-library-v1.mjs";

function writeFixture(rootDir: string) {
  const files = new Map<string, string>([
    ["docs/phases/PHASE_50_WORKFLOW_LIBRARY_V1.md", "# Phase 50 Workflow Library v1"],
    [
      "apps/operator-console/src/workflow-library.ts",
      [
        "export const workflowLibraryPacket = {",
        "  phase: { label: 'Phase 50 · Workflow Library v1' },",
        "  workflowLibraryStatus: 'catalog-ready',",
        "  primaryWorkflow: { id: 'phase-build', name: 'Phase Build', category: 'development', description: 'phase', inputSignals: [], outputMode: 'plan', ownerGate: 'owner', executionAuthority: 'planning only' },",
        "  workflows: [{ id: 'phase-build' }, { id: 'validation-review' }, { id: 'evidence-packet' }, { id: 'file-review' }, { id: 'research-brief' }, { id: 'app-improvement' }],",
        "  routing: { suggestedQueue: 'Owner workflow review queue' },",
        "  boundaries: { commandExecutionAllowed: false },",
        "};",
        "export const workflowLibrarySafetyGates = [",
        "  'Catalog workflow definitions only',",
        "  'Owner review required before workflow routing',",
        "  'No command execution',",
        "  'No runner connectivity',",
        "  'No backend workflow service',",
        "  'No authentication changes',",
        "  'No source mutation',",
        "  'No file processing',",
        "  'No auto-processing',",
        "  'No auto-routing',",
        "  'No auto-merge',",
        "  'No self-approval',",
        "];",
      ].join("\n"),
    ],
    ["scripts/lib/workflow-library-v1.mjs", "export const marker = true;"],
    ["scripts/run-workflow-library-v1.mjs", "console.log('workflow library');"],
    ["tests/integration/workflow-library-v1.test.ts", "// fixture"],
    [
      "apps/operator-console/src/App.tsx",
      [
        "workflowLibraryPacket.primaryWorkflow.name",
        "workflowLibraryPacket.primaryWorkflow.category",
        "workflowLibraryPacket.routing.suggestedQueue",
        "workflowLibraryPacket.boundaries.commandExecutionAllowed",
        "Workflow Library Review",
      ].join("\n"),
    ],
    [
      "package.json",
      JSON.stringify({ scripts: { "phase50:demo": "node scripts/run-workflow-library-v1.mjs", "phase50:verify": "npm run phase50:demo" } }),
    ],
  ]);

  for (const [relativePath, content] of files) {
    const fullPath = path.join(rootDir, relativePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, `${content}\n`, "utf8");
  }
}

describe("workflow-library-v1", () => {
  it("passes when workflow library is catalog-only and app-bound", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-workflow-library-cert-"));
    writeFixture(rootDir);

    const result = inspectWorkflowLibraryV1(createDefaultWorkflowLibraryV1(), { rootDir, writeArtifacts: false });

    expect(result.ok).toBe(true);
    expect(result.workflowLibraryStatus).toBe("ready");
    expect(result.workflowCount).toBe(6);
    expect(result.catalogOnly).toBe(true);
    expect(result.commandExecutionAllowed).toBe(false);
    expect(result.selfApprovalAllowed).toBe(false);
  });

  it("writes workflow library reports without mutating source", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-workflow-library-report-cert-"));
    writeFixture(rootDir);

    const result = inspectWorkflowLibraryV1(createDefaultWorkflowLibraryV1(), { rootDir, writeArtifacts: true });

    expect(result.ok).toBe(true);
    expect(fs.existsSync(path.join(rootDir, ".sera-workflow-library", "phase50-workflow-library-status.json"))).toBe(true);
    expect(fs.existsSync(path.join(rootDir, ".sera-workflow-library", "phase50-workflow-library-status.md"))).toBe(true);
    expect(fs.existsSync(path.join(rootDir, "apps/operator-console/src/workflow-library.ts"))).toBe(true);
  });

  it("blocks unsafe workflow library boundaries", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-workflow-library-block-cert-"));
    writeFixture(rootDir);

    const config = createDefaultWorkflowLibraryV1();
    config.boundaries.commandExecutionAllowed = true;
    config.boundaries.runnerConnectivityAllowed = true;
    config.boundaries.autoProcessingAllowed = true;
    config.boundaries.selfApprovalAllowed = true;

    const result = inspectWorkflowLibraryV1(config, { rootDir, writeArtifacts: false });

    expect(result.ok).toBe(false);
    expect(result.blockers).toContain("commandExecutionAllowed must remain false");
    expect(result.blockers).toContain("runnerConnectivityAllowed must remain false");
    expect(result.blockers).toContain("autoProcessingAllowed must remain false");
    expect(result.blockers).toContain("selfApprovalAllowed must remain false");
  });

  it("blocks unsafe declared paths", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-workflow-library-path-cert-"));
    writeFixture(rootDir);

    const config = createDefaultWorkflowLibraryV1();
    config.declaredPaths.push("../outside.md");

    const result = inspectWorkflowLibraryV1(config, { rootDir, writeArtifacts: false });

    expect(result.ok).toBe(false);
    expect(result.blockers).toContain("Declared path must be safe and relative: ../outside.md");
  });
});
