import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createDefaultFileIntakeV1, inspectFileIntakeV1 } from "../../scripts/lib/file-intake-v1.mjs";

function writeFixture(rootDir: string) {
  const files = new Map<string, string>([
    ["docs/phases/PHASE_49_FILE_INTAKE_V1.md", "# Phase 49 File Intake v1"],
    [
      "apps/operator-console/src/file-intake.ts",
      [
        "export const fileIntakePacket = {",
        "  phase: { label: 'Phase 49 · File Intake v1' },",
        "  fileIntakeStatus: 'metadata-ready',",
        "  primaryFile: { name: 'brief.md', extension: '.md', category: 'planning document', sizeLabel: 'metadata only', source: 'local', classification: 'review-only', reviewState: 'pending' },",
        "  routing: { suggestedQueue: 'Owner file review queue' },",
        "  boundaries: { fileExecutionAllowed: false },",
        "};",
        "export const fileIntakeSafetyGates = [",
        "  'Capture file metadata only',",
        "  'Owner review required before file processing',",
        "  'No arbitrary file access',",
        "  'No file execution',",
        "  'No file mutation',",
        "  'No source mutation',",
        "  'No runner connectivity',",
        "  'No backend file service',",
        "  'No authentication changes',",
        "  'No auto-processing',",
        "  'No auto-routing',",
        "  'No auto-merge',",
        "  'No self-approval',",
        "];",
      ].join("\n"),
    ],
    ["scripts/lib/file-intake-v1.mjs", "export const marker = true;"],
    ["scripts/run-file-intake-v1.mjs", "console.log('file intake');"],
    ["tests/integration/file-intake-v1.test.ts", "// fixture"],
    [
      "apps/operator-console/src/App.tsx",
      [
        "fileIntakePacket.primaryFile.name",
        "fileIntakePacket.primaryFile.classification",
        "fileIntakePacket.routing.suggestedQueue",
        "fileIntakePacket.boundaries.fileExecutionAllowed",
        "File Intake Review",
      ].join("\n"),
    ],
    [
      "package.json",
      JSON.stringify({ scripts: { "phase49:demo": "node scripts/run-file-intake-v1.mjs", "phase49:verify": "npm run phase49:demo" } }),
    ],
  ]);

  for (const [relativePath, content] of files) {
    const fullPath = path.join(rootDir, relativePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, `${content}\n`, "utf8");
  }
}

describe("file-intake-v1", () => {
  it("passes when file intake is metadata-only and app-bound", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-file-intake-cert-"));
    writeFixture(rootDir);

    const result = inspectFileIntakeV1(createDefaultFileIntakeV1(), { rootDir, writeArtifacts: false });

    expect(result.ok).toBe(true);
    expect(result.fileIntakeStatus).toBe("ready");
    expect(result.metadataCaptureOnly).toBe(true);
    expect(result.fileExecutionAllowed).toBe(false);
    expect(result.fileMutationAllowed).toBe(false);
    expect(result.selfApprovalAllowed).toBe(false);
  });

  it("writes file intake reports without mutating source", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-file-intake-report-cert-"));
    writeFixture(rootDir);

    const result = inspectFileIntakeV1(createDefaultFileIntakeV1(), { rootDir, writeArtifacts: true });

    expect(result.ok).toBe(true);
    expect(fs.existsSync(path.join(rootDir, ".sera-file-intake", "phase49-file-intake-status.json"))).toBe(true);
    expect(fs.existsSync(path.join(rootDir, ".sera-file-intake", "phase49-file-intake-status.md"))).toBe(true);
    expect(fs.existsSync(path.join(rootDir, "apps/operator-console/src/file-intake.ts"))).toBe(true);
  });

  it("blocks unsafe file intake boundaries", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-file-intake-block-cert-"));
    writeFixture(rootDir);

    const config = createDefaultFileIntakeV1();
    config.boundaries.fileExecutionAllowed = true;
    config.boundaries.fileMutationAllowed = true;
    config.boundaries.autoProcessingAllowed = true;
    config.boundaries.selfApprovalAllowed = true;

    const result = inspectFileIntakeV1(config, { rootDir, writeArtifacts: false });

    expect(result.ok).toBe(false);
    expect(result.blockers).toContain("fileExecutionAllowed must remain false");
    expect(result.blockers).toContain("fileMutationAllowed must remain false");
    expect(result.blockers).toContain("autoProcessingAllowed must remain false");
    expect(result.blockers).toContain("selfApprovalAllowed must remain false");
  });

  it("blocks unsafe declared paths", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-file-intake-path-cert-"));
    writeFixture(rootDir);

    const config = createDefaultFileIntakeV1();
    config.declaredPaths.push("../outside.md");

    const result = inspectFileIntakeV1(config, { rootDir, writeArtifacts: false });

    expect(result.ok).toBe(false);
    expect(result.blockers).toContain("Declared path must be safe and relative: ../outside.md");
  });
});
