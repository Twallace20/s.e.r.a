import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createDefaultLocalWorkerManualInstallGateV1, inspectLocalWorkerManualInstallGateV1 } from "../../scripts/lib/local-worker-manual-install-gate-v1.mjs";

function writeFile(rootDir: string, relativePath: string, content: string) {
  const fullPath = path.join(rootDir, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, "utf8");
}

function writeFixture(rootDir: string) {
  const app = `
import { localWorkerManualInstallGate, localWorkerManualInstallGateSafetyGates } from "./local-worker-manual-install-gate";

const gates = [
  ...localWorkerManualInstallGateSafetyGates,
];

export function App() {
  return <section>
    <h2>Local Worker Manual Install Gate</h2>
    <span>{localWorkerManualInstallGate.manualInstallGateSummary.owner}</span>
    <span>{localWorkerManualInstallGate.manualInstallGateRequirements.length}</span>
    <span>{localWorkerManualInstallGate.evidenceRequirements.length}</span>
    <span>{localWorkerManualInstallGate.boundaries.workerInstallAllowed ? "allowed" : "blocked"}</span>
    <span>{localWorkerManualInstallGate.manualInstallGateSummary.manualInstallGateLocked ? "yes" : "no"}</span>
  </section>;
}
`;
  const packageJson = JSON.stringify({ scripts: { "phase70:demo": "node scripts/run-local-worker-manual-install-gate-v1.mjs", "phase70:verify": "npm run free-core:verify && npm run knowledge:verify && npm run phase69:demo && npm run phase70:demo" } }, null, 2);
  writeFile(rootDir, "apps/operator-console/src/App.tsx", app);
  writeFile(rootDir, "package.json", packageJson);
  for (const file of [
    "docs/phases/PHASE_70_LOCAL_WORKER_MANUAL_INSTALL_GATE_V1.md",
    "scripts/lib/local-worker-manual-install-gate-v1.mjs",
    "scripts/run-local-worker-manual-install-gate-v1.mjs",
    "tests/integration/local-worker-manual-install-gate-v1.test.ts",
    "apps/operator-console/src/local-worker-manual-install-gate.ts",
  ]) writeFile(rootDir, file, "// fixture");
}

describe("local-worker-manual-install-gate-v1", () => {
  it("passes when the local worker manual install gate is declarative and app-bound", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-local-worker-manual-install-gate-cert-"));
    writeFixture(rootDir);
    const result = inspectLocalWorkerManualInstallGateV1(createDefaultLocalWorkerManualInstallGateV1(), { rootDir, writeArtifacts: false });
    expect(result.ok).toBe(true);
    expect(result.localWorkerManualInstallGateStatus).toBe("manual-install-gate-ready");
    expect(result.manualInstallGateOnly).toBe(true);
    expect(result.ownerReviewOnly).toBe(true);
    expect(result.declarativeOnly).toBe(true);
    expect(result.declaredFileCount).toBe(5);
    expect(result.manualInstallGateRequirementCount).toBe(6);
    expect(result.manualInstallGateFieldCount).toBe(8);
    expect(result.manualInstallGateEvidenceCount).toBe(6);
    expect(result.manualInstallGateSignalCount).toBe(8);
    expect(result.safetyGateCount).toBe(260);
    expect(result.appBindingCount).toBe(5);
    expect(result.phase69InstallEvidencePacketReady).toBe(true);
    expect(result.phase68InstallDryRunReady).toBe(true);
    expect(result.ownerApprovalRequired).toBe(true);
    expect(result.explicitManualInstallGateRequired).toBe(true);
    expect(result.ownerInstallReviewRequired).toBe(true);
    expect(result.manualInstallCommandPlanRequired).toBe(true);
    expect(result.finalPreinstallChecklistRequired).toBe(true);
    expect(result.installRemainsBlockedRequired).toBe(true);
    expect(result.localWorkerReadyForInstall).toBe(false);
    expect(result.manualInstallGateLocked).toBe(false);
    expect(result.workerInstallApproved).toBe(false);
    expect(result.workerInstalled).toBe(false);
    expect(result.manualInstallGateSigningAllowed).toBe(false);
    expect(result.manualInstallExecutionAllowed).toBe(false);
    expect(result.installerExecutionAllowed).toBe(false);
    expect(result.dependencyDownloadAllowed).toBe(false);
    expect(result.packageInstallAllowed).toBe(false);
    expect(result.workerInstallAllowed).toBe(false);
    expect(result.commandExecutionAllowed).toBe(false);
    expect(result.shellExecutionAllowed).toBe(false);
    expect(result.runnerConnectivityAllowed).toBe(false);
    expect(result.selfApprovalAllowed).toBe(false);
  });

  it("writes local worker manual install gate reports without mutating source", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-local-worker-manual-install-gate-report-cert-"));
    writeFixture(rootDir);
    const result = inspectLocalWorkerManualInstallGateV1(createDefaultLocalWorkerManualInstallGateV1(), { rootDir, writeArtifacts: true });
    expect(result.ok).toBe(true);
    expect(fs.existsSync(path.join(rootDir, ".sera-local-worker-manual-install-gate", "phase70-local-worker-manual-install-gate-status.json"))).toBe(true);
    expect(fs.existsSync(path.join(rootDir, ".sera-local-worker-manual-install-gate", "phase70-local-worker-manual-install-gate-status.md"))).toBe(true);
    expect(fs.existsSync(path.join(rootDir, "apps/operator-console/src/local-worker-manual-install-gate.ts"))).toBe(true);
  });

  it("blocks unsafe local worker manual install gate boundaries", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-local-worker-manual-install-gate-block-cert-"));
    writeFixture(rootDir);
    const config = createDefaultLocalWorkerManualInstallGateV1();
    config.summary.localWorkerReadyForInstall = true;
    config.summary.manualInstallGateLocked = true;
    config.summary.installEvidencePacketLocked = true;
    config.summary.workerInstallApproved = true;
    config.summary.workerInstalled = true;
    config.summary.workerConnected = true;
    config.summary.scheduledExecutionAllowed = true;
    config.summary.executableScheduleCount = 1;
    config.boundaries.manualInstallGateSigningAllowed = true;
    config.boundaries.manualInstallExecutionAllowed = true;
    config.boundaries.installerExecutionAllowed = true;
    config.boundaries.dependencyDownloadAllowed = true;
    config.boundaries.packageInstallAllowed = true;
    config.boundaries.packageManagerExecutionAllowed = true;
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
    config.boundaries.manualInstallGatePersistenceAllowed = true;
    config.boundaries.finalApprovalAllowed = true;
    config.boundaries.autoRouteAllowed = true;
    config.boundaries.selfApprovalAllowed = true;
    const result = inspectLocalWorkerManualInstallGateV1(config, { rootDir, writeArtifacts: false });
    expect(result.ok).toBe(false);
    expect(result.blockers).toContain("localWorkerReadyForInstall must remain false");
    expect(result.blockers).toContain("manualInstallGateLocked must remain false");
    expect(result.blockers).toContain("workerInstallApproved must remain false");
    expect(result.blockers).toContain("workerInstalled must remain false");
    expect(result.blockers).toContain("scheduledExecutionAllowed must remain false");
    expect(result.blockers).toContain("executableScheduleCount must remain zero");
    expect(result.blockers).toContain("manualInstallGateSigningAllowed must remain false");
    expect(result.blockers).toContain("manualInstallExecutionAllowed must remain false");
    expect(result.blockers).toContain("installerExecutionAllowed must remain false");
    expect(result.blockers).toContain("dependencyDownloadAllowed must remain false");
    expect(result.blockers).toContain("packageInstallAllowed must remain false");
    expect(result.blockers).toContain("packageManagerExecutionAllowed must remain false");
    expect(result.blockers).toContain("commandExecutionAllowed must remain false");
    expect(result.blockers).toContain("shellExecutionAllowed must remain false");
    expect(result.blockers).toContain("runnerConnectivityAllowed must remain false");
    expect(result.blockers).toContain("workerInstallAllowed must remain false");
    expect(result.blockers).toContain("selfApprovalAllowed must remain false");
  });

  it("blocks unsafe declared paths", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-local-worker-manual-install-gate-path-cert-"));
    writeFixture(rootDir);
    const config = createDefaultLocalWorkerManualInstallGateV1();
    config.declaredPaths.push("../outside.md");
    const result = inspectLocalWorkerManualInstallGateV1(config, { rootDir, writeArtifacts: false });
    expect(result.ok).toBe(false);
    expect(result.blockers).toContain("Declared path must be safe and relative: ../outside.md");
  });
});
