import { describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  createDefaultPrivateOperatorAppShellV1,
  inspectPrivateOperatorAppShellV1,
} from "../../scripts/lib/private-operator-app-shell-v1.mjs";

function createTempRoot() {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-phase46-"));
  const config = createDefaultPrivateOperatorAppShellV1();
  for (const declaredPath of config.declaredPaths) {
    const fullPath = path.join(rootDir, declaredPath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, "phase46 fixture\n", "utf8");
  }

  fs.writeFileSync(
    path.join(rootDir, "apps/operator-console/package.json"),
    JSON.stringify({ dependencies: { vite: "x", react: "x", typescript: "x" } }, null, 2),
    "utf8",
  );
  fs.writeFileSync(
    path.join(rootDir, "apps/operator-console/src/App.tsx"),
    [
      ...config.appSurfaces,
      "Desktop worker",
      "Local runtime",
      "GitHub bridge",
      "Tailscale access",
      "Attach files",
      "Submit to queue",
      "Approve",
      "Reject",
      "Request changes",
      "No auto-merge",
    ].join("\n"),
    "utf8",
  );
  fs.writeFileSync(path.join(rootDir, "apps/operator-console/src/styles.css"), ".operator-shell{} .dashboard-grid{}", "utf8");
  fs.writeFileSync(
    path.join(rootDir, "docs/phases/PHASE_46_PRIVATE_OPERATOR_APP_SHELL_V1.md"),
    "How to build Phase 46\nPhase 46 intentionally does not add backend logic\nPhase 47\nPhase 48\nPhase 49\nPhase 50\n",
    "utf8",
  );

  return rootDir;
}

describe("Phase 46 Private Operator App Shell v1", () => {
  it("passes the default Phase 46 private app shell contract", () => {
    const rootDir = createTempRoot();
    const result = inspectPrivateOperatorAppShellV1(createDefaultPrivateOperatorAppShellV1(), { rootDir });

    expect(result.ok).toBe(true);
    expect(result.status).toBe("passed");
    expect(result.privateOperatorAppShellStatus).toBe("ready");
    expect(result.validationFailedCount).toBe(0);
    expect(result.blockers).toEqual([]);
    expect(result.declaredFileCount).toBe(12);
    expect(result.layoutSectionCount).toBe(4);
    expect(result.dashboardModuleCount).toBe(10);
    expect(result.appSurfaceCount).toBe(9);
    expect(result.safetyGateCount).toBe(8);
    expect(result.localOnly).toBe(true);
    expect(result.privateAppOnly).toBe(true);
    expect(result.appShellOnly).toBe(true);
    expect(result.designAssistedShell).toBe(true);
    expect(result.frontendOnly).toBe(true);
    expect(result.noBackendLogic).toBe(true);
    expect(result.noAuthentication).toBe(true);
    expect(result.freeCoreCompatible).toBe(true);
    expect(result.commandExecutionAllowed).toBe(false);
    expect(result.remoteExecutionAllowed).toBe(false);
    expect(result.runnerConnectivityAllowed).toBe(false);
    expect(result.mutatesSource).toBe(false);
    expect(result.autoMergeAllowed).toBe(false);
    expect(result.selfApprovesPlan).toBe(false);
    expect(result.selfApprovalAllowed).toBe(false);
  });

  it("writes local Phase 46 evidence without enabling runtime authority", () => {
    const rootDir = createTempRoot();
    const result = inspectPrivateOperatorAppShellV1(createDefaultPrivateOperatorAppShellV1(), { rootDir });

    expect(fs.existsSync(result.jsonPath)).toBe(true);
    expect(fs.existsSync(result.markdownPath)).toBe(true);
    expect(fs.existsSync(result.historyPath)).toBe(true);
    expect(result.jsonPath).toContain(".sera-private-operator-app-shell");
    expect(result.commandExecutionAllowed).toBe(false);
    expect(result.runnerConnectivityAllowed).toBe(false);
    expect(result.mutatesSource).toBe(false);
  });

  it("blocks missing app surfaces and missing build documentation", () => {
    const rootDir = createTempRoot();
    fs.writeFileSync(path.join(rootDir, "apps/operator-console/src/App.tsx"), "Command Center only", "utf8");
    fs.writeFileSync(path.join(rootDir, "docs/phases/PHASE_46_PRIVATE_OPERATOR_APP_SHELL_V1.md"), "thin doc", "utf8");

    const result = inspectPrivateOperatorAppShellV1(createDefaultPrivateOperatorAppShellV1(), { rootDir });

    expect(result.ok).toBe(false);
    expect(result.validationFailedCount).toBeGreaterThan(0);
    expect(result.blockers.join(" ")).toContain("missing app surface");
    expect(result.blockers.join(" ")).toContain("build/roadmap detail");
  });

  it("blocks attempts to turn the shell into execution, backend, mutation, or self-approval authority", () => {
    const rootDir = createTempRoot();
    const config = createDefaultPrivateOperatorAppShellV1();
    config.boundaries = {
      ...config.boundaries,
      noBackendLogic: false,
      noAuthentication: false,
      commandExecutionAllowed: true,
      runnerConnectivityAllowed: true,
      mutatesSource: true,
      autoMergeAllowed: true,
      selfApprovalAllowed: true,
    };

    const result = inspectPrivateOperatorAppShellV1(config, { rootDir });

    expect(result.ok).toBe(false);
    expect(result.validationFailedCount).toBeGreaterThan(0);
    expect(result.blockers.join(" ")).toContain("noBackendLogic must be true");
    expect(result.blockers.join(" ")).toContain("commandExecutionAllowed must be false");
    expect(result.blockers.join(" ")).toContain("runnerConnectivityAllowed must be false");
    expect(result.blockers.join(" ")).toContain("mutatesSource must be false");
    expect(result.blockers.join(" ")).toContain("autoMergeAllowed must be false");
    expect(result.blockers.join(" ")).toContain("selfApprovalAllowed must be false");
  });
});
