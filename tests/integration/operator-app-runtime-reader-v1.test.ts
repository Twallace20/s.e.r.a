import { describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  createDefaultOperatorAppRuntimeReaderV1,
  inspectOperatorAppRuntimeReaderV1,
} from "../../scripts/lib/operator-app-runtime-reader-v1.mjs";

function writeFixture(rootDir: string, relativePath: string, content: string) {
  const fullPath = path.join(rootDir, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, "utf8");
}

function createTempRoot() {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-phase47-"));
  const config = createDefaultOperatorAppRuntimeReaderV1();

  for (const declaredPath of config.declaredPaths) {
    writeFixture(rootDir, declaredPath, "phase47 fixture\n");
  }

  writeFixture(
    rootDir,
    "package.json",
    JSON.stringify({ scripts: { "phase47:demo": "node scripts/run-operator-app-runtime-reader-v1.mjs", "phase47:verify": "npm run phase47:demo" } }),
  );

  writeFixture(
    rootDir,
    "apps/operator-console/src/App.tsx",
    config.requiredAppBindings.join("\n"),
  );

  writeFixture(
    rootDir,
    "apps/operator-console/src/runtime-status.ts",
    [
      "export const operatorRuntimeStatus = {};",
      "Phase 47 · Operator App Runtime Reader v1",
      "operator-console-v1",
      ...config.requiredSafetyGates,
    ].join("\n"),
  );

  return rootDir;
}

describe("Phase 47 Operator App Runtime Reader v1", () => {
  it("passes the default Phase 47 runtime-reader contract", () => {
    const result = inspectOperatorAppRuntimeReaderV1(createDefaultOperatorAppRuntimeReaderV1(), { rootDir: createTempRoot() });

    expect(result.ok).toBe(true);
    expect(result.status).toBe("passed");
    expect(result.operatorAppRuntimeReaderStatus).toBe("ready");
    expect(result.validationFailedCount).toBe(0);
    expect(result.blockers).toEqual([]);
    expect(result.declaredFileCount).toBe(5);
    expect(result.runtimeSignalCount).toBe(5);
    expect(result.safetyGateCount).toBe(9);
    expect(result.appStatusBindingCount).toBe(4);
    expect(result.localOnly).toBe(true);
    expect(result.privateAppOnly).toBe(true);
    expect(result.readOnly).toBe(true);
    expect(result.frontendConsumableStatus).toBe(true);
    expect(result.noBackendLogic).toBe(true);
    expect(result.noAuthentication).toBe(true);
    expect(result.commandExecutionAllowed).toBe(false);
    expect(result.runnerConnectivityAllowed).toBe(false);
    expect(result.mutatesSource).toBe(false);
    expect(result.autoMergeAllowed).toBe(false);
    expect(result.selfApprovalAllowed).toBe(false);
  });

  it("writes local runtime-reader reports without adding execution authority", () => {
    const result = inspectOperatorAppRuntimeReaderV1(createDefaultOperatorAppRuntimeReaderV1(), { rootDir: createTempRoot() });

    expect(fs.existsSync(result.jsonPath)).toBe(true);
    expect(fs.existsSync(result.markdownPath)).toBe(true);
    expect(result.jsonPath).toContain(".sera-operator-runtime-reader");
    expect(result.markdownPath).toContain(".sera-operator-runtime-reader");
    expect(result.commandExecutionAllowed).toBe(false);
    expect(result.runnerConnectivityAllowed).toBe(false);
    expect(result.autoMergeAllowed).toBe(false);
  });

  it("blocks unsafe runtime-reader boundaries", () => {
    const config = createDefaultOperatorAppRuntimeReaderV1();
    const result = inspectOperatorAppRuntimeReaderV1(
      {
        ...config,
        boundaries: {
          ...config.boundaries,
          commandExecutionAllowed: true,
          runnerConnectivityAllowed: true,
          mutatesSource: true,
          autoMergeAllowed: true,
          selfApprovalAllowed: true,
        },
      },
      { rootDir: createTempRoot(), writeArtifacts: false },
    );

    expect(result.ok).toBe(false);
    expect(result.validationFailedCount).toBeGreaterThan(0);
    expect(result.blockers.join(" ")).toContain("commandExecutionAllowed must remain false");
    expect(result.blockers.join(" ")).toContain("runnerConnectivityAllowed must remain false");
    expect(result.blockers.join(" ")).toContain("mutatesSource must remain false");
    expect(result.blockers.join(" ")).toContain("autoMergeAllowed must remain false");
    expect(result.blockers.join(" ")).toContain("selfApprovalAllowed must remain false");
  });
});
