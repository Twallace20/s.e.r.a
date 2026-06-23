import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createDefaultLocalWorkerInstallDryRunV1, inspectLocalWorkerInstallDryRunV1 } from "../../scripts/lib/local-worker-install-dry-run-v1.mjs";

function writeFile(rootDir: string, relativePath: string, content: string) {
  const fullPath = path.join(rootDir, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, "utf8");
}

function writeFixture(rootDir: string) {
  const app = `
import { localWorkerInstallDryRunPacket, localWorkerInstallDryRunSafetyGates } from "./local-worker-install-dry-run";

const gates = [
  ...localWorkerInstallDryRunSafetyGates,
];

export function App() {
  return <section>
    <h2>Local Worker Install Dry-Run</h2>
    <span>{localWorkerInstallDryRunPacket.installDryRunSummary.owner}</span>
    <span>{localWorkerInstallDryRunPacket.installDryRunRequirements.length}</span>
    <span>{localWorkerInstallDryRunPacket.evidenceRequirements.length}</span>
    <span>{localWorkerInstallDryRunPacket.boundaries.workerInstallAllowed ? "allowed" : "blocked"}</span>
    <span>{localWorkerInstallDryRunPacket.installDryRunSummary.installDryRunLocked ? "yes" : "no"}</span>
  </section>;
}
`;
  const packageJson = JSON.stringify({ scripts: { "phase68:demo": "node scripts/run-local-worker-install-dry-run-v1.mjs", "phase68:verify": "npm run free-core:verify && npm run knowledge:verify && npm run phase67:demo && npm run phase68:demo" } }, null, 2);
  writeFile(rootDir, "apps/operator-console/src/App.tsx", app);
  writeFile(rootDir, "package.json", packageJson);
  writeFile(rootDir, "docs/phases/PHASE_68_LOCAL_WORKER_INSTALL_DRY_RUN_V1.md", "# Phase 68");
  writeFile(rootDir, "scripts/lib/local-worker-install-dry-run-v1.mjs", "export {};");
  writeFile(rootDir, "scripts/run-local-worker-install-dry-run-v1.mjs", "import './lib/local-worker-install-dry-run-v1.mjs';");
  writeFile(rootDir, "tests/integration/local-worker-install-dry-run-v1.test.ts", "// test fixture");
  writeFile(rootDir, "apps/operator-console/src/local-worker-install-dry-run.ts", "export {};");
}

describe("local-worker-install-dry-run-v1", () => {
  it("passes when the local worker install dry-run is declarative and app-bound", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-local-worker-install-dry-run-cert-"));
    writeFixture(rootDir);

    const result = inspectLocalWorkerInstallDryRunV1(createDefaultLocalWorkerInstallDryRunV1(), { rootDir, writeArtifacts: false });

    expect(result.ok).toBe(true);
    expect(result.localWorkerInstallDryRunStatus).toBe("install-dry-run-ready");
    expect(result.installDryRunOnly).toBe(true);
    expect(result.ownerReviewOnly).toBe(true);
    expect(result.declarativeOnly).toBe(true);
    expect(result.declaredFileCount).toBe(5);
    expect(result.installDryRunRequirementCount).toBe(6);
    expect(result.installDryRunFieldCount).toBe(8);
    expect(result.installDryRunEvidenceCount).toBe(6);
    expect(result.installDryRunSignalCount).toBe(8);
    expect(result.safetyGateCount).toBe(180);
    expect(result.appBindingCount).toBe(5);
    expect(result.phase67DependencyAllowlistReady).toBe(true);
    expect(result.phase66RollbackPlanReady).toBe(true);
    expect(result.ownerApprovalRequired).toBe(true);
    expect(result.explicitInstallDryRunRequired).toBe(true);
    expect(result.dryRunScriptRequired).toBe(true);
    expect(result.dryRunInputsRequired).toBe(true);
    expect(result.dryRunOutputEvidenceRequired).toBe(true);
    expect(result.noInstallMutationRequired).toBe(true);
    expect(result.localWorkerReadyForInstall).toBe(false);
    expect(result.installDryRunLocked).toBe(false);
    expect(result.workerInstallApproved).toBe(false);
    expect(result.workerInstalled).toBe(false);
    expect(result.installDryRunSigningAllowed).toBe(false);
    expect(result.dryRunExecutionAllowed).toBe(false);
    expect(result.smokeTestExecutionAllowed).toBe(false);
    expect(result.networkAccessAllowed).toBe(false);
    expect(result.dependencyDownloadAllowed).toBe(false);
    expect(result.packageInstallAllowed).toBe(false);
    expect(result.packageManagerExecutionAllowed).toBe(false);
    expect(result.workerInstallAllowed).toBe(false);
    expect(result.commandExecutionAllowed).toBe(false);
    expect(result.shellExecutionAllowed).toBe(false);
    expect(result.runnerConnectivityAllowed).toBe(false);
    expect(result.selfApprovalAllowed).toBe(false);
  });

  it("writes local worker install dry-run reports without mutating source", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-local-worker-install-dry-run-report-cert-"));
    writeFixture(rootDir);

    const result = inspectLocalWorkerInstallDryRunV1(createDefaultLocalWorkerInstallDryRunV1(), { rootDir, writeArtifacts: true });

    expect(result.ok).toBe(true);
    expect(fs.existsSync(path.join(rootDir, ".sera-local-worker-install-dry-run", "phase68-local-worker-install-dry-run-status.json"))).toBe(true);
    expect(fs.existsSync(path.join(rootDir, ".sera-local-worker-install-dry-run", "phase68-local-worker-install-dry-run-status.md"))).toBe(true);
    expect(fs.existsSync(path.join(rootDir, "apps/operator-console/src/local-worker-install-dry-run.ts"))).toBe(true);
  });

  it("blocks unsafe local worker install dry-run boundaries", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-local-worker-install-dry-run-block-cert-"));
    writeFixture(rootDir);

    const config = createDefaultLocalWorkerInstallDryRunV1();
    config.summary.localWorkerReadyForInstall = true;
    config.summary.installDryRunLocked = true;
    config.summary.dependencyAllowlistLocked = true;
    config.summary.rollbackPlanLocked = true;
    config.summary.workspaceBoundaryLocked = true;
    config.summary.installScopeLocked = true;
    config.summary.installApprovalRecordApproved = true;
    config.summary.installPlanApproved = true;
    config.summary.executionUnlockApproved = true;
    config.summary.overnightWorkAuthorized = true;
    config.summary.workerInstallApproved = true;
    config.summary.workerInstalled = true;
    config.summary.workerConnected = true;
    config.summary.windowsSchedulerConfigured = true;
    config.summary.scheduledExecutionAllowed = true;
    config.summary.executableScheduleCount = 1;
    config.boundaries.installDryRunSigningAllowed = true;
    config.boundaries.dryRunExecutionAllowed = true;
    config.boundaries.smokeTestExecutionAllowed = true;
    config.boundaries.networkAccessAllowed = true;
    config.boundaries.artifactMutationAllowed = true;
    config.boundaries.dependencyDownloadAllowed = true;
    config.boundaries.packageInstallAllowed = true;
    config.boundaries.packageManagerExecutionAllowed = true;
    config.boundaries.installerExecutionAllowed = true;
    config.boundaries.commandExecutionAllowed = true;
    config.boundaries.shellExecutionAllowed = true;
    config.boundaries.runnerConnectivityAllowed = true;
    config.boundaries.workerInstallAllowed = true;
    config.boundaries.workerConnectionAllowed = true;
    config.boundaries.workerSpawnAllowed = true;
    config.boundaries.taskExecutionAllowed = true;
    config.boundaries.workspaceProbeAllowed = true;
    config.boundaries.filesystemScanAllowed = true;
    config.boundaries.filesystemMutationAllowed = true;
    config.boundaries.pathCreationAllowed = true;
    config.boundaries.pathDeletionAllowed = true;
    config.boundaries.installDryRunPersistenceAllowed = true;
    config.boundaries.finalApprovalAllowed = true;
    config.boundaries.autoRouteAllowed = true;
    config.boundaries.selfApprovalAllowed = true;

    const result = inspectLocalWorkerInstallDryRunV1(config, { rootDir, writeArtifacts: false });

    expect(result.ok).toBe(false);
    expect(result.blockers).toContain("localWorkerReadyForInstall must remain false");
    expect(result.blockers).toContain("installDryRunLocked must remain false");
    expect(result.blockers).toContain("workerInstallApproved must remain false");
    expect(result.blockers).toContain("workerInstalled must remain false");
    expect(result.blockers).toContain("scheduledExecutionAllowed must remain false");
    expect(result.blockers).toContain("executableScheduleCount must remain zero");
    expect(result.blockers).toContain("installDryRunSigningAllowed must remain false");
    expect(result.blockers).toContain("dryRunExecutionAllowed must remain false");
    expect(result.blockers).toContain("smokeTestExecutionAllowed must remain false");
    expect(result.blockers).toContain("networkAccessAllowed must remain false");
    expect(result.blockers).toContain("artifactMutationAllowed must remain false");
    expect(result.blockers).toContain("dependencyDownloadAllowed must remain false");
    expect(result.blockers).toContain("packageInstallAllowed must remain false");
    expect(result.blockers).toContain("packageManagerExecutionAllowed must remain false");
    expect(result.blockers).toContain("installerExecutionAllowed must remain false");
    expect(result.blockers).toContain("commandExecutionAllowed must remain false");
    expect(result.blockers).toContain("shellExecutionAllowed must remain false");
    expect(result.blockers).toContain("runnerConnectivityAllowed must remain false");
    expect(result.blockers).toContain("workerInstallAllowed must remain false");
    expect(result.blockers).toContain("workerConnectionAllowed must remain false");
    expect(result.blockers).toContain("workerSpawnAllowed must remain false");
    expect(result.blockers).toContain("taskExecutionAllowed must remain false");
    expect(result.blockers).toContain("workspaceProbeAllowed must remain false");
    expect(result.blockers).toContain("filesystemScanAllowed must remain false");
    expect(result.blockers).toContain("filesystemMutationAllowed must remain false");
    expect(result.blockers).toContain("pathCreationAllowed must remain false");
    expect(result.blockers).toContain("pathDeletionAllowed must remain false");
    expect(result.blockers).toContain("installDryRunPersistenceAllowed must remain false");
    expect(result.blockers).toContain("finalApprovalAllowed must remain false");
    expect(result.blockers).toContain("autoRouteAllowed must remain false");
    expect(result.blockers).toContain("selfApprovalAllowed must remain false");
  });

  it("blocks unsafe declared paths", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-local-worker-install-dry-run-path-cert-"));
    writeFixture(rootDir);

    const config = createDefaultLocalWorkerInstallDryRunV1();
    config.declaredPaths.push("../outside.md");

    const result = inspectLocalWorkerInstallDryRunV1(config, { rootDir, writeArtifacts: false });

    expect(result.ok).toBe(false);
    expect(result.blockers).toContain("Declared path must be safe and relative: ../outside.md");
  });
});
