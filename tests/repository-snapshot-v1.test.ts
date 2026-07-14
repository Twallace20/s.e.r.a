import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import childProcess from "node:child_process";
import { describe, expect, it } from "vitest";
import { SeraKernel } from "@sera/kernel";
import { runRepositorySnapshot } from "@sera/repository-snapshot";

const fixedClock = { now: () => new Date("2026-07-14T00:00:00.000Z") };

function makeFixture(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "sera-repository-snapshot-fixture-"));
  fs.mkdirSync(path.join(root, "packages", "alpha", "src"), { recursive: true });
  fs.mkdirSync(path.join(root, "apps", "web", "src"), { recursive: true });
  fs.mkdirSync(path.join(root, "tests"), { recursive: true });
  fs.mkdirSync(path.join(root, "docs", "architecture", "adr"), { recursive: true });
  fs.mkdirSync(path.join(root, "node_modules", "ignored"), { recursive: true });
  fs.mkdirSync(path.join(root, "dist"), { recursive: true });
  fs.mkdirSync(path.join(root, ".git"), { recursive: true });
  fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({
    name: "fixture-root",
    version: "1.0.0",
    private: true,
    workspaces: ["packages/*", "apps/*", "missing/*"],
    scripts: {
      test: "vitest run",
      build: "tsc -b",
      danger: "node scripts/should-not-run.js"
    },
    dependencies: {
      "@sera/alpha": "0.1.0"
    }
  }, null, 2), "utf8");
  fs.writeFileSync(path.join(root, "tsconfig.json"), JSON.stringify({
    files: [],
    references: [{ path: "packages/alpha" }, { path: "missing-ref" }, { bad: true }]
  }, null, 2), "utf8");
  fs.writeFileSync(path.join(root, "packages", "alpha", "package.json"), JSON.stringify({
    name: "@sera/alpha",
    version: "0.1.0",
    private: true,
    main: "dist/index.js",
    types: "dist/index.d.ts",
    scripts: { test: "vitest run alpha" },
    dependencies: { "@sera/missing": "0.1.0" }
  }, null, 2), "utf8");
  fs.writeFileSync(path.join(root, "packages", "alpha", "tsconfig.json"), JSON.stringify({ extends: "../../tsconfig.base.json" }), "utf8");
  fs.writeFileSync(path.join(root, "packages", "alpha", "src", "index.ts"), "export const alpha = 1;\n", "utf8");
  fs.writeFileSync(path.join(root, "apps", "web", "package.json"), JSON.stringify({
    name: "@sera/web",
    version: "0.1.0",
    private: true,
    scripts: { dev: "vite --host 127.0.0.1" },
    devDependencies: { vite: "^7.0.0" }
  }, null, 2), "utf8");
  fs.writeFileSync(path.join(root, "apps", "web", "src", "main.ts"), "console.log('web');\n", "utf8");
  fs.writeFileSync(path.join(root, "tests", "alpha.test.ts"), "import { describe } from 'vitest';\n", "utf8");
  fs.writeFileSync(path.join(root, "README.md"), "# Fixture\n", "utf8");
  fs.writeFileSync(path.join(root, "docs", "architecture", "ROADMAP.md"), "# Roadmap\n", "utf8");
  fs.writeFileSync(path.join(root, "docs", "architecture", "adr", "ADR-001.md"), "# ADR\n", "utf8");
  fs.writeFileSync(path.join(root, "node_modules", "ignored", "package.json"), JSON.stringify({ name: "ignored" }), "utf8");
  fs.writeFileSync(path.join(root, "dist", "generated.test.ts"), "throw new Error('ignored');\n", "utf8");
  return root;
}

function readJson(root: string, relativePath: string): any {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function normalize(value: any): any {
  const copy = JSON.parse(JSON.stringify(value));
  const scrub = (node: any): any => {
    if (Array.isArray(node)) return node.map(scrub);
    if (node && typeof node === "object") {
      for (const key of Object.keys(node)) {
        if (["createdAt", "snapshotId", "scanDurationMs", "sha256", "bytes"].includes(key)) {
          node[key] = "<normalized>";
        } else {
          node[key] = scrub(node[key]);
        }
      }
    }
    return node;
  };
  return scrub(copy);
}

describe("Repository Snapshot v1", () => {
  it("produces all required files for a valid fixture with sorted portable paths", () => {
    const root = makeFixture();
    const result = runRepositorySnapshot({ repositoryRoot: root, clock: fixedClock });
    expect(result.ok).toBe(true);
    const required = ["snapshot.json", "workspaces.json", "packages.json", "scripts.json", "tests.json", "references.json", "documents.json", "summary.json"];
    for (const file of required) {
      expect(fs.existsSync(path.join(root, ".sera", "repository", file))).toBe(true);
      expect(readJson(root, path.join(".sera", "repository", file))).toHaveProperty("schemaVersion");
    }
    const summary = readJson(root, ".sera/repository/summary.json");
    expect(summary.generatedOutputPaths).toEqual([...summary.generatedOutputPaths].sort());
    expect(JSON.stringify(summary)).not.toContain(root);
  });

  it("repeated scans produce equal normalized factual content", () => {
    const root = makeFixture();
    runRepositorySnapshot({ repositoryRoot: root, clock: fixedClock });
    const first = readJson(root, ".sera/repository/summary.json");
    runRepositorySnapshot({ repositoryRoot: root, clock: fixedClock });
    const second = readJson(root, ".sera/repository/summary.json");
    expect(normalize(first)).toEqual(normalize(second));
  });

  it("excludes generated directories and does not execute package scripts", () => {
    const root = makeFixture();
    const marker = path.join(root, "script-executed.txt");
    runRepositorySnapshot({ repositoryRoot: root, clock: fixedClock });
    const summary = readJson(root, ".sera/repository/summary.json");
    const tests = readJson(root, ".sera/repository/tests.json");
    expect(summary.exclusions.map((item: any) => item.path)).toContain("node_modules");
    expect(summary.exclusions.map((item: any) => item.path)).toContain("dist");
    expect(summary.exclusions.map((item: any) => item.path)).toContain(".git");
    expect(summary.exclusions.map((item: any) => item.path)).toContain(".sera/repository");
    expect(tests.testFiles.some((file: any) => file.path.includes("dist/"))).toBe(false);
    expect(fs.existsSync(marker)).toBe(false);
  });

  it("does not follow a symlink or junction that escapes the repository root", () => {
    const root = makeFixture();
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), "sera-snapshot-outside-"));
    fs.writeFileSync(path.join(outside, "outside.test.ts"), "throw new Error('outside');\n", "utf8");
    try {
      fs.symlinkSync(outside, path.join(root, "outside-link"), "junction");
    } catch {
      return;
    }
    runRepositorySnapshot({ repositoryRoot: root, clock: fixedClock });
    const tests = readJson(root, ".sera/repository/tests.json");
    const summary = readJson(root, ".sera/repository/summary.json");
    expect(tests.testFiles.some((file: any) => file.path.includes("outside-link"))).toBe(false);
    expect(summary.exclusions.some((item: any) => item.path === "outside-link" && item.reason.includes("not followed"))).toBe(true);
  });

  it("completes for a non-Git fixture and records Git as optional", () => {
    const root = makeFixture();
    fs.rmSync(path.join(root, ".git"), { recursive: true, force: true });
    runRepositorySnapshot({ repositoryRoot: root, clock: fixedClock });
    const snapshot = readJson(root, ".sera/repository/snapshot.json");
    expect(snapshot.repository.git.available).toBe(true);
    expect(snapshot.repository.git.repository).toBe(false);
    expect(snapshot.finalStatus).toBe("COMPLETED");
  });

  it("records local Git baseline metadata without contacting a remote", () => {
    const root = makeFixture();
    fs.rmSync(path.join(root, ".git"), { recursive: true, force: true });
    childProcess.spawnSync("git", ["init"], { cwd: root, encoding: "utf8", windowsHide: true });
    childProcess.spawnSync("git", ["config", "user.email", "sera@example.invalid"], { cwd: root, encoding: "utf8", windowsHide: true });
    childProcess.spawnSync("git", ["config", "user.name", "SERA Test"], { cwd: root, encoding: "utf8", windowsHide: true });
    childProcess.spawnSync("git", ["add", "."], { cwd: root, encoding: "utf8", windowsHide: true });
    childProcess.spawnSync("git", ["commit", "-m", "fixture"], { cwd: root, encoding: "utf8", windowsHide: true });
    runRepositorySnapshot({ repositoryRoot: root, clock: fixedClock });
    const snapshot = readJson(root, ".sera/repository/snapshot.json");
    expect(snapshot.repository.git.repository).toBe(true);
    expect(snapshot.repository.git.headCommit).toMatch(/^[a-f0-9]{40}$/);
    expect(snapshot.repository.git.upstreamMetadataAvailable).toBe(false);
  });

  it("records missing declared workspaces and TypeScript references honestly", () => {
    const root = makeFixture();
    runRepositorySnapshot({ repositoryRoot: root, clock: fixedClock });
    const workspaces = readJson(root, ".sera/repository/workspaces.json");
    const references = readJson(root, ".sera/repository/references.json");
    expect(workspaces.missingDeclaredWorkspacePaths).toContain("missing/*");
    expect(references.missingReferencedPaths).toContain("missing-ref");
    expect(references.malformedReferenceEntries.length).toBe(1);
  });

  it("captures malformed non-root manifests as evidence", () => {
    const root = makeFixture();
    fs.mkdirSync(path.join(root, "packages", "broken"), { recursive: true });
    fs.writeFileSync(path.join(root, "packages", "broken", "package.json"), "{ bad json", "utf8");
    const result = runRepositorySnapshot({ repositoryRoot: root, clock: fixedClock });
    expect(result.ok).toBe(true);
    const packages = readJson(root, ".sera/repository/packages.json");
    expect(packages.malformedPackageManifests.length).toBeGreaterThanOrEqual(1);
  });

  it("writes nothing outside its owned output directory and does not promote partial output on failure", () => {
    const root = makeFixture();
    const outsideMarker = path.join(root, "outside-output.json");
    runRepositorySnapshot({ repositoryRoot: root, clock: fixedClock });
    const firstSummary = fs.readFileSync(path.join(root, ".sera", "repository", "summary.json"), "utf8");
    const failed = runRepositorySnapshot({ repositoryRoot: root, clock: fixedClock, simulateFailureAfterStaging: true });
    expect(failed.status).toBe("FAILED");
    expect(fs.existsSync(outsideMarker)).toBe(false);
    expect(fs.readFileSync(path.join(root, ".sera", "repository", "summary.json"), "utf8")).toBe(firstSummary);
  });

  it("keeps model and network use false and exposes CLI/kernel structured completion", () => {
    const root = makeFixture();
    const kernel = new SeraKernel({ rootDir: root });
    const result = kernel.runRepositorySnapshot({ clock: fixedClock });
    expect(result.ok).toBe(true);
    const snapshot = readJson(root, ".sera/repository/snapshot.json");
    expect(snapshot.modelUse).toBe(false);
    expect(snapshot.networkUse).toBe(false);
    expect(result.manifest.map((item) => item.path)).toContain(".sera/repository/snapshot.json");
  });
});
