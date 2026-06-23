import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createDefaultLocalWorkerDependencyAllowlistV1, inspectLocalWorkerDependencyAllowlistV1 } from "../../scripts/lib/local-worker-dependency-allowlist-v1.mjs";

function writeFile(rootDir: string, relativePath: string, content: string) {
  const fullPath = path.join(rootDir, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, "utf8");
}

function writeFixture(rootDir: string) {
  const app = `
import { localWorkerDependencyAllowlistPacket, localWorkerDependencyAllowlistSafetyGates } from "./local-worker-dependency-allowlist";

const gates = [
  ...localWorkerDependencyAllowlistSafetyGates,
];

export function App() {
  return <section>
    <h2>Local Worker Dependency Allowlist</h2>
    <span>{localWorkerDependencyAllowlistPacket.dependencyAllowlistSummary.owner}</span>
    <span>{localWorkerDependencyAllowlistPacket.dependencyAllowlistRequirements.length}</span>
    <span>{localWorkerDependencyAllowlistPacket.evidenceRequirements.length}</span>
    <span>{localWorkerDependencyAllowlistPacket.boundaries.workerInstallAllowed ? "allowed" : "blocked"}</span>
    <span>{localWorkerDependencyAllowlistPacket.dependencyAllowlistSummary.dependencyAllowlistLocked ? "yes" : "no"}</span>
  </section>;
}
`;
  const packageJson = JSON.stringify({ scripts: { "phase67:demo": "node scripts/run-local-worker-dependency-allowlist-v1.mjs", "phase67:verify": "npm run free-core:verify && npm run knowledge:verify && npm run phase66:demo && npm run phase67:demo" } }, null, 2);
  writeFile(rootDir, "apps/operator-console/src/App.tsx", app);
  writeFile(rootDir, "package.json", packageJson);
  writeFile(rootDir, "docs/phases/PHASE_67_LOCAL_WORKER_DEPENDENCY_ALLOWLIST_V1.md", "# Phase 67");
  writeFile(rootDir, "scripts/lib/local-worker-dependency-allowlist-v1.mjs", "export {};");
  writeFile(rootDir, "scripts/run-local-worker-dependency-allowlist-v1.mjs", "import './lib/local-worker-dependency-allowlist-v1.mjs';");
  writeFile(rootDir, "tests/integration/local-worker-dependency-allowlist-v1.test.ts", "// test fixture");
  writeFile(rootDir, "apps/operator-console/src/local-worker-dependency-allowlist.ts", "export {};");
}

describe("local-worker-dependency-allowlist-v1", () => {
  it("passes when the local worker dependency allowlist is declarative and app-bound", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-local-worker-dependency-allowlist-cert-"));
    writeFixture(rootDir);

    const result = inspectLocalWorkerDependencyAllowlistV1(createDefaultLocalWorkerDependencyAllowlistV1(), { rootDir, writeArtifacts: false });

    expect(result.ok).toBe(true);
    expect(result.localWorkerDependencyAllowlistStatus).toBe("dependency-allowlist-ready");
    expect(result.dependencyAllowlistOnly).toBe(true);
    expect(result.ownerReviewOnly).toBe(true);
    expect(result.declarativeOnly).toBe(true);
    expect(result.declaredFileCount).toBe(5);
    expect(result.dependencyAllowlistRequirementCount).toBe(6);
    expect(result.dependencyAllowlistFieldCount).toBe(8);
    expect(result.dependencyAllowlistEvidenceCount).toBe(6);
    expect(result.dependencyAllowlistSignalCount).toBe(8);
    expect(result.safetyGateCount).toBe(145);
    expect(result.appBindingCount).toBe(5);
    expect(result.phase66RollbackPlanReady).toBe(true);
    expect(result.phase65WorkspaceBoundaryReady).toBe(true);
    expect(result.ownerApprovalRequired).toBe(true);
    expect(result.explicitDependencyAllowlistRequired).toBe(true);
    expect(result.dependencyInventoryRequired).toBe(true);
    expect(result.packageManagerBoundaryRequired).toBe(true);
    expect(result.versionPinningRequired).toBe(true);
    expect(result.provenanceEvidenceRequired).toBe(true);
    expect(result.localWorkerReadyForInstall).toBe(false);
    expect(result.dependencyAllowlistLocked).toBe(false);
    expect(result.workerInstallApproved).toBe(false);
    expect(result.workerInstalled).toBe(false);
    expect(result.dependencyAllowlistSigningAllowed).toBe(false);
    expect(result.dependencyDownloadAllowed).toBe(false);
    expect(result.packageInstallAllowed).toBe(false);
    expect(result.packageManagerExecutionAllowed).toBe(false);
    expect(result.dependencyManifestMutationAllowed).toBe(false);
    expect(result.lockfileMutationAllowed).toBe(false);
    expect(result.workerInstallAllowed).toBe(false);
    expect(result.commandExecutionAllowed).toBe(false);
    expect(result.shellExecutionAllowed).toBe(false);
    expect(result.runnerConnectivityAllowed).toBe(false);
    expect(result.selfApprovalAllowed).toBe(false);
  });

  it("writes local worker dependency allowlist reports without mutating source", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-local-worker-dependency-allowlist-report-cert-"));
    writeFixture(rootDir);

    const result = inspectLocalWorkerDependencyAllowlistV1(createDefaultLocalWorkerDependencyAllowlistV1(), { rootDir, writeArtifacts: true });

    expect(result.ok).toBe(true);
    expect(fs.existsSync(path.join(rootDir, ".sera-local-worker-dependency-allowlist", "phase67-local-worker-dependency-allowlist-status.json"))).toBe(true);
    expect(fs.existsSync(path.join(rootDir, ".sera-local-worker-dependency-allowlist", "phase67-local-worker-dependency-allowlist-status.md"))).toBe(true);
    expect(fs.existsSync(path.join(rootDir, "apps/operator-console/src/local-worker-dependency-allowlist.ts"))).toBe(true);
  });

  it("blocks unsafe local worker dependency allowlist boundaries", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-local-worker-dependency-allowlist-block-cert-"));
    writeFixture(rootDir);

    const config = createDefaultLocalWorkerDependencyAllowlistV1();
    config.summary.localWorkerReadyForInstall = true;
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
    config.boundaries.dependencyAllowlistSigningAllowed = true;
    config.boundaries.dependencyDownloadAllowed = true;
    config.boundaries.packageInstallAllowed = true;
    config.boundaries.packageManagerExecutionAllowed = true;
    config.boundaries.dependencyManifestMutationAllowed = true;
    config.boundaries.lockfileMutationAllowed = true;
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
    config.boundaries.dependencyAllowlistPersistenceAllowed = true;
    config.boundaries.finalApprovalAllowed = true;
    config.boundaries.autoRouteAllowed = true;
    config.boundaries.selfApprovalAllowed = true;

    const result = inspectLocalWorkerDependencyAllowlistV1(config, { rootDir, writeArtifacts: false });

    expect(result.ok).toBe(false);
    expect(result.blockers).toContain("localWorkerReadyForInstall must remain false");
    expect(result.blockers).toContain("dependencyAllowlistLocked must remain false");
    expect(result.blockers).toContain("workerInstallApproved must remain false");
    expect(result.blockers).toContain("workerInstalled must remain false");
    expect(result.blockers).toContain("scheduledExecutionAllowed must remain false");
    expect(result.blockers).toContain("executableScheduleCount must remain zero");
    expect(result.blockers).toContain("dependencyAllowlistSigningAllowed must remain false");
    expect(result.blockers).toContain("dependencyDownloadAllowed must remain false");
    expect(result.blockers).toContain("packageInstallAllowed must remain false");
    expect(result.blockers).toContain("packageManagerExecutionAllowed must remain false");
    expect(result.blockers).toContain("dependencyManifestMutationAllowed must remain false");
    expect(result.blockers).toContain("lockfileMutationAllowed must remain false");
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
    expect(result.blockers).toContain("dependencyAllowlistPersistenceAllowed must remain false");
    expect(result.blockers).toContain("finalApprovalAllowed must remain false");
    expect(result.blockers).toContain("autoRouteAllowed must remain false");
    expect(result.blockers).toContain("selfApprovalAllowed must remain false");
  });

  it("blocks unsafe declared paths", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-local-worker-dependency-allowlist-path-cert-"));
    writeFixture(rootDir);

    const config = createDefaultLocalWorkerDependencyAllowlistV1();
    config.declaredPaths.push("../outside.md");

    const result = inspectLocalWorkerDependencyAllowlistV1(config, { rootDir, writeArtifacts: false });

    expect(result.ok).toBe(false);
    expect(result.blockers).toContain("Declared path must be safe and relative: ../outside.md");
  });
});
