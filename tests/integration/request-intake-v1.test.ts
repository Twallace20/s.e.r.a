import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createDefaultRequestIntakeV1, inspectRequestIntakeV1 } from "../../scripts/lib/request-intake-v1.mjs";

function writeFixture(rootDir: string) {
  const files = new Map<string, string>([
    ["docs/phases/PHASE_48_REQUEST_INTAKE_V1.md", "# Phase 48 Request Intake v1"],
    [
      "apps/operator-console/src/request-intake.ts",
      [
        "export const requestIntakeDraft = {",
        "  phase: { label: 'Phase 48 · Request Intake v1' },",
        "  title: 'Prepare Phase 49 file intake',",
        "  details: 'Capture-only draft',",
        "  requestedBy: 'Tyler',",
        "  priority: 'High',",
        "  workflowType: 'Phase build',",
        "  intakeStatus: 'Captured for owner review',",
        "  safetyClassification: 'planning-only',",
        "  routing: { suggestedQueue: 'Owner review queue', executionAllowed: false },",
        "  boundaries: { commandExecutionAllowed: false },",
        "};",
        "export const requestIntakeSafetyGates = [",
        "  'Capture request drafts only',",
        "  'Owner review required before routing',",
        "  'No autonomous submission',",
        "  'No command execution',",
        "  'No runner connectivity',",
        "  'No backend intake service',",
        "  'No authentication changes',",
        "  'No source mutation',",
        "  'No auto-merge',",
        "  'No self-approval',",
        "];",
      ].join("\n"),
    ],
    ["scripts/lib/request-intake-v1.mjs", "export const marker = true;"],
    ["scripts/run-request-intake-v1.mjs", "console.log('request intake');"],
    ["tests/integration/request-intake-v1.test.ts", "// fixture"],
    [
      "apps/operator-console/src/App.tsx",
      [
        "requestIntakeDraft.title",
        "requestIntakeDraft.details",
        "requestIntakeDraft.routing.suggestedQueue",
        "requestIntakeDraft.boundaries.commandExecutionAllowed",
        "Request Intake Review",
      ].join("\n"),
    ],
    [
      "package.json",
      JSON.stringify({ scripts: { "phase48:demo": "node scripts/run-request-intake-v1.mjs", "phase48:verify": "npm run phase48:demo" } }),
    ],
  ]);

  for (const [relativePath, content] of files) {
    const fullPath = path.join(rootDir, relativePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, `${content}\n`, "utf8");
  }
}

describe("request-intake-v1", () => {
  it("passes when request intake is capture-only and app-bound", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-request-intake-cert-"));
    writeFixture(rootDir);

    const result = inspectRequestIntakeV1(createDefaultRequestIntakeV1(), { rootDir, writeArtifacts: false });

    expect(result.ok).toBe(true);
    expect(result.requestIntakeStatus).toBe("ready");
    expect(result.captureOnly).toBe(true);
    expect(result.commandExecutionAllowed).toBe(false);
    expect(result.autoSubmitAllowed).toBe(false);
    expect(result.selfApprovalAllowed).toBe(false);
  });

  it("writes request intake reports without mutating source", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-request-intake-report-cert-"));
    writeFixture(rootDir);

    const result = inspectRequestIntakeV1(createDefaultRequestIntakeV1(), { rootDir, writeArtifacts: true });

    expect(result.ok).toBe(true);
    expect(fs.existsSync(path.join(rootDir, ".sera-request-intake", "phase48-request-intake-status.json"))).toBe(true);
    expect(fs.existsSync(path.join(rootDir, ".sera-request-intake", "phase48-request-intake-status.md"))).toBe(true);
    expect(fs.existsSync(path.join(rootDir, "apps/operator-console/src/request-intake.ts"))).toBe(true);
  });

  it("blocks unsafe request intake boundaries", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-request-intake-block-cert-"));
    writeFixture(rootDir);

    const config = createDefaultRequestIntakeV1();
    config.boundaries.commandExecutionAllowed = true;
    config.boundaries.autoSubmitAllowed = true;
    config.boundaries.selfApprovalAllowed = true;

    const result = inspectRequestIntakeV1(config, { rootDir, writeArtifacts: false });

    expect(result.ok).toBe(false);
    expect(result.blockers).toContain("commandExecutionAllowed must remain false");
    expect(result.blockers).toContain("autoSubmitAllowed must remain false");
    expect(result.blockers).toContain("selfApprovalAllowed must remain false");
  });

  it("blocks unsafe declared paths", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-request-intake-path-cert-"));
    writeFixture(rootDir);

    const config = createDefaultRequestIntakeV1();
    config.declaredPaths.push("../outside.md");

    const result = inspectRequestIntakeV1(config, { rootDir, writeArtifacts: false });

    expect(result.ok).toBe(false);
    expect(result.blockers).toContain("Declared path must be safe and relative: ../outside.md");
  });
});
