import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const rootDir = path.resolve(__dirname, "../..");
const sourceMapPath = path.join(rootDir, "docs", "knowledge", "SOURCE_MAP.md");

describe("Knowledge Seeding + Source Map v1", () => {
  it("verifies the tracked repo source map", () => {
    const output = execFileSync(process.execPath, ["scripts/check-knowledge-source-map.mjs"], {
      cwd: rootDir,
      encoding: "utf8"
    });

    expect(output).toContain("S.E.R.A. knowledge source map: PASS");
  });

  it("maps core repo evidence sources without relying on runtime knowledge artifacts", () => {
    const sourceMap = fs.readFileSync(sourceMapPath, "utf8");

    expect(sourceMap).toContain("`README.md`");
    expect(sourceMap).toContain("`docs/BUILD_VALIDATION.md`");
    expect(sourceMap).toContain("`packages/knowledge/src/knowledge-store.ts`");
    expect(sourceMap).toContain("`packages/certs/src/certify.ts`");
    expect(sourceMap).toContain("Runtime knowledge artifacts generated under `.sera-knowledge/` remain ignored");
  });
});
