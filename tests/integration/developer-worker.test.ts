import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { SeraKernel } from "@sera/kernel";

function tmpRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "sera-dev-worker-test-"));
}

describe("S.E.R.A. Developer Worker v1", () => {
  it("creates a suggested edit artifact without mutating the source file", () => {
    const root = tmpRoot();
    const target = path.join(root, "notes.txt");
    fs.writeFileSync(target, "old value\n", "utf8");
    const kernel = new SeraKernel({ rootDir: root });

    const result = kernel.runDeveloperEditTask({
      mode: "suggested",
      relativePath: "notes.txt",
      find: "old",
      replaceWith: "new"
    });

    expect(result.ok).toBe(true);
    expect(result.status).toBe("completed");
    expect(result.developer.changed).toBe(false);
    expect(fs.readFileSync(target, "utf8")).toBe("old value\n");
    expect(result.developer.suggestionPath).toBeTruthy();
    expect(fs.readFileSync(result.developer.suggestionPath!, "utf8")).toBe("new value\n");
  });

  it("applies a direct edit with a backup artifact", () => {
    const root = tmpRoot();
    const target = path.join(root, "src", "message.txt");
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, "hello legacy\n", "utf8");
    const kernel = new SeraKernel({ rootDir: root });

    const result = kernel.runDeveloperEditTask({
      mode: "direct",
      relativePath: "src/message.txt",
      find: "legacy",
      replaceWith: "clean core"
    });

    expect(result.ok).toBe(true);
    expect(result.status).toBe("completed_with_changes");
    expect(result.developer.changed).toBe(true);
    expect(fs.readFileSync(target, "utf8")).toBe("hello clean core\n");
    expect(result.developer.backupPath).toBeTruthy();
    expect(fs.readFileSync(result.developer.backupPath!, "utf8")).toBe("hello legacy\n");
  });

  it("reports an honest no_op when the requested text is missing", () => {
    const root = tmpRoot();
    const target = path.join(root, "notes.txt");
    fs.writeFileSync(target, "alpha\n", "utf8");
    const kernel = new SeraKernel({ rootDir: root });

    const result = kernel.runDeveloperEditTask({
      mode: "direct",
      relativePath: "notes.txt",
      find: "beta",
      replaceWith: "gamma"
    });

    expect(result.ok).toBe(true);
    expect(result.status).toBe("no_op");
    expect(result.developer.changed).toBe(false);
    expect(fs.readFileSync(target, "utf8")).toBe("alpha\n");
  });

  it("blocks path traversal outside the project root", () => {
    const root = tmpRoot();
    const outside = path.join(path.dirname(root), "outside-sera.txt");
    fs.writeFileSync(path.join(root, "inside.txt"), "inside\n", "utf8");
    const kernel = new SeraKernel({ rootDir: root });

    const result = kernel.runDeveloperEditTask({
      mode: "direct",
      relativePath: "../outside-sera.txt",
      find: "inside",
      replaceWith: "outside"
    });

    expect(result.ok).toBe(false);
    expect(result.status).toBe("blocked");
    expect(fs.existsSync(outside)).toBe(false);
  });

  it("blocks protected project paths", () => {
    const root = tmpRoot();
    const protectedFile = path.join(root, ".env");
    fs.writeFileSync(protectedFile, "TOKEN=secret\n", "utf8");
    const kernel = new SeraKernel({ rootDir: root });

    const result = kernel.runDeveloperEditTask({
      mode: "direct",
      relativePath: ".env",
      find: "secret",
      replaceWith: "changed"
    });

    expect(result.ok).toBe(false);
    expect(result.status).toBe("blocked");
    expect(fs.readFileSync(protectedFile, "utf8")).toBe("TOKEN=secret\n");
  });

  it("rolls back direct edits when validation fails", () => {
    const root = tmpRoot();
    const target = path.join(root, "src", "validate.txt");
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, "safe content\n", "utf8");
    const kernel = new SeraKernel({ rootDir: root });

    const result = kernel.runDeveloperEditTask({
      mode: "direct",
      relativePath: "src/validate.txt",
      find: "safe",
      replaceWith: "unsafe",
      validate: () => ({ ok: false, message: "simulated validation failure" })
    });

    expect(result.ok).toBe(false);
    expect(result.status).toBe("failed");
    expect(result.developer.restored).toBe(true);
    expect(fs.readFileSync(target, "utf8")).toBe("safe content\n");
  });
});
