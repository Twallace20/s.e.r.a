import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ArtifactStore } from "@sera/artifacts";
import { SeraKernel } from "@sera/kernel";
import { SafetyPolicy } from "@sera/safety";
import { MultiFileDeveloperWorker } from "@sera/workers";

function tempRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "sera-multi-file-dev-test-"));
}

function context(root: string) {
  const runDir = path.join(root, ".sera-runs", "run_test");
  return {
    runId: "run_test",
    projectRoot: root,
    artifacts: new ArtifactStore(runDir),
    safety: new SafetyPolicy({ workspaceDir: root, allowedCommands: ["node", "npm"] })
  };
}

describe("Multi-File Developer Worker v3", () => {
  it("creates multi-file patch suggestions without mutating source files", () => {
    const root = tempRoot();
    fs.mkdirSync(path.join(root, "src"), { recursive: true });
    fs.writeFileSync(path.join(root, "src", "alpha.ts"), "export const alpha = 'old';\n", "utf8");
    fs.writeFileSync(path.join(root, "src", "beta.ts"), "export const beta = 'old';\n", "utf8");

    const worker = new MultiFileDeveloperWorker();
    const result = worker.multiPatch({
      ...context(root),
      mode: "suggested",
      targets: [
        { relativePath: "src/alpha.ts", operations: [{ kind: "replace", find: "'old'", replaceWith: "'new-alpha'", expectedOccurrences: 1 }] },
        { relativePath: "src/beta.ts", operations: [{ kind: "replace", find: "'old'", replaceWith: "'new-beta'", expectedOccurrences: 1 }] }
      ]
    });

    expect(result.ok).toBe(true);
    expect(result.changed).toBe(false);
    expect(result.fileCount).toBe(2);
    expect(result.files.every((file) => file.patchArtifactPath && fs.existsSync(file.patchArtifactPath))).toBe(true);
    expect(fs.readFileSync(path.join(root, "src", "alpha.ts"), "utf8")).toContain("'old'");
    expect(fs.readFileSync(path.join(root, "src", "beta.ts"), "utf8")).toContain("'old'");
  });

  it("applies multi-file patches atomically through the kernel when validation passes", () => {
    const root = tempRoot();
    fs.mkdirSync(path.join(root, "src"), { recursive: true });
    fs.writeFileSync(path.join(root, "src", "alpha.ts"), "export const alpha = 'old';\n", "utf8");
    fs.writeFileSync(path.join(root, "src", "beta.ts"), "export const beta = 'old';\n", "utf8");
    const kernel = new SeraKernel({ rootDir: root });

    const result = kernel.runDeveloperMultiPatchTask({
      mode: "direct",
      targets: [
        { relativePath: "src/alpha.ts", operations: [{ kind: "replace", find: "'old'", replaceWith: "'new-alpha'", expectedOccurrences: 1 }] },
        { relativePath: "src/beta.ts", operations: [{ kind: "replace", find: "'old'", replaceWith: "'new-beta'", expectedOccurrences: 1 }] }
      ],
      validate: ({ files }) => ({ ok: files.length === 2 && files.every((file) => file.after.includes("new-")), message: "both files changed" })
    });

    expect(result.ok).toBe(true);
    expect(result.multiPatch.changed).toBe(true);
    expect(result.multiPatch.files.every((file) => file.backupPath && fs.existsSync(file.backupPath))).toBe(true);
    expect(fs.readFileSync(path.join(root, "src", "alpha.ts"), "utf8")).toContain("new-alpha");
    expect(fs.readFileSync(path.join(root, "src", "beta.ts"), "utf8")).toContain("new-beta");
  });

  it("rolls back every touched file when validation fails", () => {
    const root = tempRoot();
    fs.mkdirSync(path.join(root, "src"), { recursive: true });
    fs.writeFileSync(path.join(root, "src", "alpha.ts"), "export const alpha = 'old';\n", "utf8");
    fs.writeFileSync(path.join(root, "src", "beta.ts"), "export const beta = 'old';\n", "utf8");
    const kernel = new SeraKernel({ rootDir: root });

    const result = kernel.runDeveloperMultiPatchTask({
      mode: "direct",
      targets: [
        { relativePath: "src/alpha.ts", operations: [{ kind: "replace", find: "'old'", replaceWith: "'bad-alpha'", expectedOccurrences: 1 }] },
        { relativePath: "src/beta.ts", operations: [{ kind: "replace", find: "'old'", replaceWith: "'bad-beta'", expectedOccurrences: 1 }] }
      ],
      validate: () => ({ ok: false, message: "simulated multi-file validation failure" })
    });

    expect(result.ok).toBe(false);
    expect(result.multiPatch.restored).toBe(true);
    expect(result.multiPatch.files.every((file) => file.restored)).toBe(true);
    expect(fs.readFileSync(path.join(root, "src", "alpha.ts"), "utf8")).toContain("'old'");
    expect(fs.readFileSync(path.join(root, "src", "beta.ts"), "utf8")).toContain("'old'");
  });
});
