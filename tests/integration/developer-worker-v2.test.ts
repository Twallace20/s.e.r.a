import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { SeraKernel } from "@sera/kernel";

function tmpRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "sera-dev-worker-v2-test-"));
}

describe("S.E.R.A. Developer Worker v2", () => {
  it("inspects a file and writes a fingerprint artifact without mutating source", () => {
    const root = tmpRoot();
    const target = path.join(root, "src", "module.ts");
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, "export const value = 1;\n", "utf8");
    const kernel = new SeraKernel({ rootDir: root });

    const result = kernel.runDeveloperInspectTask({ relativePath: "src/module.ts" });

    expect(result.ok).toBe(true);
    expect(result.status).toBe("completed");
    expect(result.inspection.exists).toBe(true);
    expect(result.inspection.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(result.inspection.artifactPath).toBeTruthy();
    expect(fs.existsSync(result.inspection.artifactPath!)).toBe(true);
    expect(fs.readFileSync(target, "utf8")).toBe("export const value = 1;\n");
  });

  it("creates a patch suggestion artifact without mutating the source file", () => {
    const root = tmpRoot();
    const target = path.join(root, "src", "message.ts");
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, "export const message = 'old';\n", "utf8");
    const kernel = new SeraKernel({ rootDir: root });

    const result = kernel.runDeveloperPatchTask({
      mode: "suggested",
      relativePath: "src/message.ts",
      operations: [{ kind: "replace", find: "old", replaceWith: "new", expectedOccurrences: 1 }]
    });

    expect(result.ok).toBe(true);
    expect(result.status).toBe("completed");
    expect(result.patch.changed).toBe(false);
    expect(result.patch.patchArtifactPath).toBeTruthy();
    expect(fs.readFileSync(target, "utf8")).toBe("export const message = 'old';\n");
    expect(fs.readFileSync(result.patch.patchArtifactPath!, "utf8")).toBe("export const message = 'new';\n");
  });

  it("blocks direct patches when expected occurrence counts do not match", () => {
    const root = tmpRoot();
    const target = path.join(root, "config.txt");
    fs.writeFileSync(target, "mode=legacy\n", "utf8");
    const kernel = new SeraKernel({ rootDir: root });

    const result = kernel.runDeveloperPatchTask({
      mode: "direct",
      relativePath: "config.txt",
      operations: [{ kind: "replace", find: "legacy", replaceWith: "clean", expectedOccurrences: 2 }]
    });

    expect(result.ok).toBe(false);
    expect(result.status).toBe("blocked");
    expect(result.patch.changed).toBe(false);
    expect(fs.readFileSync(target, "utf8")).toBe("mode=legacy\n");
  });

  it("applies a direct patch with backup when validation passes", () => {
    const root = tmpRoot();
    const target = path.join(root, "src", "status.ts");
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, "export const status = 'legacy';\n", "utf8");
    const kernel = new SeraKernel({ rootDir: root });

    const result = kernel.runDeveloperPatchTask({
      mode: "direct",
      relativePath: "src/status.ts",
      operations: [{ kind: "replace", find: "legacy", replaceWith: "phase3", expectedOccurrences: 1 }],
      validate: ({ after }) => ({ ok: after.includes("phase3"), message: "phase3 marker found" })
    });

    expect(result.ok).toBe(true);
    expect(result.status).toBe("completed_with_changes");
    expect(result.patch.changed).toBe(true);
    expect(result.patch.validation?.ok).toBe(true);
    expect(result.patch.backupPath).toBeTruthy();
    expect(fs.readFileSync(target, "utf8")).toBe("export const status = 'phase3';\n");
    expect(fs.readFileSync(result.patch.backupPath!, "utf8")).toBe("export const status = 'legacy';\n");
  });

  it("rolls back a direct patch when validation command fails", () => {
    const root = tmpRoot();
    const target = path.join(root, "src", "validation.ts");
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, "export const value = 'safe';\n", "utf8");
    const kernel = new SeraKernel({ rootDir: root });

    const result = kernel.runDeveloperPatchTask({
      mode: "direct",
      relativePath: "src/validation.ts",
      operations: [{ kind: "replace", find: "safe", replaceWith: "unsafe", expectedOccurrences: 1 }],
      validationCommand: { command: process.execPath, args: ["-e", "process.exit(1)"] }
    });

    expect(result.ok).toBe(false);
    expect(result.status).toBe("failed");
    expect(result.patch.restored).toBe(true);
    expect(fs.readFileSync(target, "utf8")).toBe("export const value = 'safe';\n");
    expect(fs.existsSync(path.join(result.run.runDir, "artifacts", "validation-command.json"))).toBe(true);
  });

  it("rolls back a direct patch when validation command is not allowlisted", () => {
    const root = tmpRoot();
    const target = path.join(root, "src", "allowlist.ts");
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, "export const value = 'safe';\n", "utf8");
    const kernel = new SeraKernel({ rootDir: root });

    const result = kernel.runDeveloperPatchTask({
      mode: "direct",
      relativePath: "src/allowlist.ts",
      operations: [{ kind: "replace", find: "safe", replaceWith: "changed", expectedOccurrences: 1 }],
      validationCommand: { command: "git", args: ["--version"] }
    });

    expect(result.ok).toBe(false);
    expect(result.status).toBe("failed");
    expect(result.patch.restored).toBe(true);
    expect(fs.readFileSync(target, "utf8")).toBe("export const value = 'safe';\n");
  });
});
