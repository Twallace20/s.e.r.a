import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { SeraKernel } from "@sera/kernel";

function tmpRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "sera-self-improvement-test-"));
}

describe("S.E.R.A. Self-Improvement Loop v1", () => {
  it("creates a self-improvement proposal without mutating source", () => {
    const root = tmpRoot();
    const target = path.join(root, "src", "identity.ts");
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, "export const phase = 'phase3';\n", "utf8");
    const kernel = new SeraKernel({ rootDir: root });

    const result = kernel.runSelfImprovementTask({
      mode: "propose",
      goal: "Advance phase marker safely.",
      relativePath: "src/identity.ts",
      operations: [{ kind: "replace", find: "phase3", replaceWith: "phase4", expectedOccurrences: 1 }]
    });

    expect(result.ok).toBe(true);
    expect(result.status).toBe("completed");
    expect(result.selfImprovement.changed).toBe(false);
    expect(result.selfImprovement.recordPath).toBeTruthy();
    expect(result.selfImprovement.patchArtifactPath).toBeTruthy();
    expect(result.selfImprovement.inspectionArtifactPath).toBeTruthy();
    expect(fs.readFileSync(target, "utf8")).toBe("export const phase = 'phase3';\n");
    const record = JSON.parse(fs.readFileSync(result.selfImprovement.recordPath!, "utf8"));
    expect(record.decision).toBe("proposed");
    expect(record.validationGate.status).toBe("not_run");
  });

  it("refuses apply mode without a validation gate", () => {
    const root = tmpRoot();
    const target = path.join(root, "src", "guard.ts");
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, "export const guard = 'safe';\n", "utf8");
    const kernel = new SeraKernel({ rootDir: root });

    const result = kernel.runSelfImprovementTask({
      mode: "apply",
      goal: "Try to apply without validation.",
      relativePath: "src/guard.ts",
      operations: [{ kind: "replace", find: "safe", replaceWith: "unsafe", expectedOccurrences: 1 }]
    });

    expect(result.ok).toBe(false);
    expect(result.status).toBe("blocked");
    expect(result.selfImprovement.validationGate.status).toBe("blocked");
    expect(fs.readFileSync(target, "utf8")).toBe("export const guard = 'safe';\n");
  });

  it("applies self-improvement when validation passes", () => {
    const root = tmpRoot();
    const target = path.join(root, "src", "phase.ts");
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, "export const phase = 'phase3';\n", "utf8");
    const kernel = new SeraKernel({ rootDir: root });

    const result = kernel.runSelfImprovementTask({
      mode: "apply",
      goal: "Advance certified phase marker.",
      relativePath: "src/phase.ts",
      operations: [{ kind: "replace", find: "phase3", replaceWith: "phase4", expectedOccurrences: 1 }],
      validate: ({ after }) => ({ ok: after.includes("phase4"), message: "phase4 marker exists" })
    });

    expect(result.ok).toBe(true);
    expect(result.status).toBe("completed_with_changes");
    expect(result.selfImprovement.changed).toBe(true);
    expect(result.selfImprovement.backupPath).toBeTruthy();
    expect(result.selfImprovement.validationGate.status).toBe("passed");
    expect(fs.readFileSync(target, "utf8")).toBe("export const phase = 'phase4';\n");
    const record = JSON.parse(fs.readFileSync(result.selfImprovement.recordPath!, "utf8"));
    expect(record.decision).toBe("applied");
  });

  it("rolls back self-improvement when validation fails", () => {
    const root = tmpRoot();
    const target = path.join(root, "src", "rollback.ts");
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, "export const value = 'safe';\n", "utf8");
    const kernel = new SeraKernel({ rootDir: root });

    const result = kernel.runSelfImprovementTask({
      mode: "apply",
      goal: "Reject unsafe change.",
      relativePath: "src/rollback.ts",
      operations: [{ kind: "replace", find: "safe", replaceWith: "unsafe", expectedOccurrences: 1 }],
      validate: () => ({ ok: false, message: "simulated cert failure" })
    });

    expect(result.ok).toBe(false);
    expect(result.status).toBe("failed");
    expect(result.selfImprovement.restored).toBe(true);
    expect(result.selfImprovement.validationGate.status).toBe("failed");
    expect(fs.readFileSync(target, "utf8")).toBe("export const value = 'safe';\n");
  });

  it("blocks self-improvement when occurrence expectations do not match", () => {
    const root = tmpRoot();
    const target = path.join(root, "src", "mismatch.ts");
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, "export const value = 'one';\n", "utf8");
    const kernel = new SeraKernel({ rootDir: root });

    const result = kernel.runSelfImprovementTask({
      mode: "apply",
      goal: "Refuse ambiguous patch.",
      relativePath: "src/mismatch.ts",
      operations: [{ kind: "replace", find: "one", replaceWith: "two", expectedOccurrences: 2 }],
      validate: ({ after }) => ({ ok: after.includes("two"), message: "two marker exists" })
    });

    expect(result.ok).toBe(false);
    expect(result.status).toBe("blocked");
    expect(result.selfImprovement.changed).toBe(false);
    expect(fs.readFileSync(target, "utf8")).toBe("export const value = 'one';\n");
  });
});
