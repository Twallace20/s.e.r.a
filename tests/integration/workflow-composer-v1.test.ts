import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createDefaultWorkflowComposerV1, inspectWorkflowComposerV1 } from "../../scripts/lib/workflow-composer-v1.mjs";

function writeFixture(rootDir: string) {
  const files = new Map<string, string>([
    ["docs/phases/PHASE_51_WORKFLOW_COMPOSER_V1.md", "# Phase 51 Workflow Composer v1"],
    [
      "apps/operator-console/src/workflow-composer.ts",
      [
        "export const workflowComposerPacket = {",
        "  phase: { label: 'Phase 51 · Workflow Composer v1' },",
        "  workflowComposerStatus: 'composition-ready',",
        "  requestSignal: { label: 'Phase build request' },",
        "  fileSignal: { label: 'Metadata-only file context' },",
        "  workflowSignal: { label: 'Phase Build' },",
        "  composedPlan: { title: 'Owner-reviewed phase build plan preview', steps: [{ id: 'review-request-signal' }, { id: 'review-file-signal' }, { id: 'select-workflow-signal' }, { id: 'compose-plan-preview' }], evidenceRequirements: ['request intake evidence', 'file metadata evidence', 'workflow catalog evidence', 'owner approval checkpoint', 'validation proof before any future execution'] },",
        "  routing: { suggestedQueue: 'Tyler workflow composition review queue' },",
        "  ownerGate: { label: 'Tyler owner review required', required: true },",
        "  boundaries: { commandExecutionAllowed: false },",
        "};",
        "export const workflowComposerSafetyGates = [",
        "  'Composition preview only',",
        "  'Request signal remains capture-only',",
        "  'File signal remains metadata-only',",
        "  'Workflow signal remains catalog-only',",
        "  'Owner review required before task creation',",
        "  'No command execution',",
        "  'No runner connectivity',",
        "  'No backend workflow service',",
        "  'No authentication changes',",
        "  'No source mutation',",
        "  'No file mutation',",
        "  'No auto-processing',",
        "  'No auto-routing',",
        "  'No auto-merge',",
        "  'No self-approval',",
        "];",
        "export const workflowComposerSignals = ['request title', 'request details', 'file metadata', 'workflow selection', 'suggested queue', 'owner gate', 'evidence requirements', 'plan preview'];",
      ].join("\n"),
    ],
    ["scripts/lib/workflow-composer-v1.mjs", "export const marker = true;"],
    ["scripts/run-workflow-composer-v1.mjs", "console.log('workflow composer');"],
    ["tests/integration/workflow-composer-v1.test.ts", "// fixture"],
    [
      "apps/operator-console/src/App.tsx",
      [
        "workflowComposerPacket.composedPlan.title",
        "workflowComposerPacket.workflowSignal.label",
        "workflowComposerPacket.routing.suggestedQueue",
        "workflowComposerPacket.boundaries.commandExecutionAllowed",
        "Workflow Composer Review",
      ].join("\n"),
    ],
    [
      "package.json",
      JSON.stringify({ scripts: { "phase51:demo": "node scripts/run-workflow-composer-v1.mjs", "phase51:verify": "npm run phase51:demo" } }),
    ],
  ]);

  for (const [relativePath, content] of files) {
    const fullPath = path.join(rootDir, relativePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, `${content}\n`, "utf8");
  }
}

describe("workflow-composer-v1", () => {
  it("passes when workflow composer is preview-only and app-bound", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-workflow-composer-cert-"));
    writeFixture(rootDir);

    const result = inspectWorkflowComposerV1(createDefaultWorkflowComposerV1(), { rootDir, writeArtifacts: false });

    expect(result.ok).toBe(true);
    expect(result.workflowComposerStatus).toBe("ready");
    expect(result.compositionOnly).toBe(true);
    expect(result.planPreviewOnly).toBe(true);
    expect(result.commandExecutionAllowed).toBe(false);
    expect(result.selfApprovalAllowed).toBe(false);
  });

  it("writes workflow composer reports without mutating source", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-workflow-composer-report-cert-"));
    writeFixture(rootDir);

    const result = inspectWorkflowComposerV1(createDefaultWorkflowComposerV1(), { rootDir, writeArtifacts: true });

    expect(result.ok).toBe(true);
    expect(fs.existsSync(path.join(rootDir, ".sera-workflow-composer", "phase51-workflow-composer-status.json"))).toBe(true);
    expect(fs.existsSync(path.join(rootDir, ".sera-workflow-composer", "phase51-workflow-composer-status.md"))).toBe(true);
    expect(fs.existsSync(path.join(rootDir, "apps/operator-console/src/workflow-composer.ts"))).toBe(true);
  });

  it("blocks unsafe workflow composer boundaries", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-workflow-composer-block-cert-"));
    writeFixture(rootDir);

    const config = createDefaultWorkflowComposerV1();
    config.boundaries.commandExecutionAllowed = true;
    config.boundaries.runnerConnectivityAllowed = true;
    config.boundaries.fileMutationAllowed = true;
    config.boundaries.autoProcessingAllowed = true;
    config.boundaries.selfApprovalAllowed = true;

    const result = inspectWorkflowComposerV1(config, { rootDir, writeArtifacts: false });

    expect(result.ok).toBe(false);
    expect(result.blockers).toContain("commandExecutionAllowed must remain false");
    expect(result.blockers).toContain("runnerConnectivityAllowed must remain false");
    expect(result.blockers).toContain("fileMutationAllowed must remain false");
    expect(result.blockers).toContain("autoProcessingAllowed must remain false");
    expect(result.blockers).toContain("selfApprovalAllowed must remain false");
  });

  it("blocks unsafe declared paths", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-workflow-composer-path-cert-"));
    writeFixture(rootDir);

    const config = createDefaultWorkflowComposerV1();
    config.declaredPaths.push("../outside.md");

    const result = inspectWorkflowComposerV1(config, { rootDir, writeArtifacts: false });

    expect(result.ok).toBe(false);
    expect(result.blockers).toContain("Declared path must be safe and relative: ../outside.md");
  });
});
