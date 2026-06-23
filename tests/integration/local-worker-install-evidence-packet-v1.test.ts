import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createDefaultLocalWorkerInstallEvidencePacketV1, inspectLocalWorkerInstallEvidencePacketV1 } from "../../scripts/lib/local-worker-install-evidence-packet-v1.mjs";

function writeFile(rootDir: string, relativePath: string, content: string) {
  const fullPath = path.join(rootDir, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, "utf8");
}

function writeFixture(rootDir: string) {
  const app = `
import { localWorkerInstallEvidencePacket, localWorkerInstallEvidencePacketSafetyGates } from "./local-worker-install-evidence-packet";

const gates = [
  ...localWorkerInstallEvidencePacketSafetyGates,
];

export function App() {
  return <section>
    <h2>Local Worker Install Evidence Packet</h2>
    <span>{localWorkerInstallEvidencePacket.installEvidencePacketSummary.owner}</span>
    <span>{localWorkerInstallEvidencePacket.installEvidencePacketRequirements.length}</span>
    <span>{localWorkerInstallEvidencePacket.evidenceRequirements.length}</span>
    <span>{localWorkerInstallEvidencePacket.boundaries.workerInstallAllowed ? "allowed" : "blocked"}</span>
    <span>{localWorkerInstallEvidencePacket.installEvidencePacketSummary.installEvidencePacketLocked ? "yes" : "no"}</span>
  </section>;
}
`;
  const packageJson = JSON.stringify({ scripts: { "phase69:demo": "node scripts/run-local-worker-install-evidence-packet-v1.mjs", "phase69:verify": "npm run free-core:verify && npm run knowledge:verify && npm run phase68:demo && npm run phase69:demo" } }, null, 2);
  writeFile(rootDir, "apps/operator-console/src/App.tsx", app);
  writeFile(rootDir, "package.json", packageJson);
  writeFile(rootDir, "docs/phases/PHASE_69_LOCAL_WORKER_INSTALL_EVIDENCE_PACKET_V1.md", "# Phase 69");
  writeFile(rootDir, "scripts/lib/local-worker-install-evidence-packet-v1.mjs", "export {};");
  writeFile(rootDir, "scripts/run-local-worker-install-evidence-packet-v1.mjs", "import './lib/local-worker-install-evidence-packet-v1.mjs';");
  writeFile(rootDir, "tests/integration/local-worker-install-evidence-packet-v1.test.ts", "// test fixture");
  writeFile(rootDir, "apps/operator-console/src/local-worker-install-evidence-packet.ts", "export {};");
}

describe("local-worker-install-evidence-packet-v1", () => {
  it("passes when the local worker install evidence packet is declarative and app-bound", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-local-worker-install-evidence-packet-cert-"));
    writeFixture(rootDir);

    const result = inspectLocalWorkerInstallEvidencePacketV1(createDefaultLocalWorkerInstallEvidencePacketV1(), { rootDir, writeArtifacts: false });

    expect(result.ok).toBe(true);
    expect(result.localWorkerInstallEvidencePacketStatus).toBe("install-evidence-packet-ready");
    expect(result.installEvidencePacketOnly).toBe(true);
    expect(result.ownerReviewOnly).toBe(true);
    expect(result.declarativeOnly).toBe(true);
    expect(result.declaredFileCount).toBe(5);
    expect(result.installEvidencePacketRequirementCount).toBe(6);
    expect(result.installEvidencePacketFieldCount).toBe(8);
    expect(result.installEvidencePacketEvidenceCount).toBe(6);
    expect(result.installEvidencePacketSignalCount).toBe(8);
    expect(result.safetyGateCount).toBe(220);
    expect(result.appBindingCount).toBe(5);
    expect(result.phase68InstallDryRunReady).toBe(true);
    expect(result.phase67DependencyAllowlistReady).toBe(true);
    expect(result.ownerApprovalRequired).toBe(true);
    expect(result.explicitInstallEvidencePacketRequired).toBe(true);
    expect(result.evidenceSourceInventoryRequired).toBe(true);
    expect(result.evidenceBundleManifestRequired).toBe(true);
    expect(result.validationEvidenceRequired).toBe(true);
    expect(result.noInstallMutationProofRequired).toBe(true);
    expect(result.localWorkerReadyForInstall).toBe(false);
    expect(result.installEvidencePacketLocked).toBe(false);
    expect(result.workerInstallApproved).toBe(false);
    expect(result.workerInstalled).toBe(false);
    expect(result.installEvidencePacketSigningAllowed).toBe(false);
    expect(result.evidencePacketExecutionAllowed).toBe(false);
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

  it("writes local worker install evidence packet reports without mutating source", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-local-worker-install-evidence-packet-report-cert-"));
    writeFixture(rootDir);

    const result = inspectLocalWorkerInstallEvidencePacketV1(createDefaultLocalWorkerInstallEvidencePacketV1(), { rootDir, writeArtifacts: true });

    expect(result.ok).toBe(true);
    expect(fs.existsSync(path.join(rootDir, ".sera-local-worker-install-evidence-packet", "phase69-local-worker-install-evidence-packet-status.json"))).toBe(true);
    expect(fs.existsSync(path.join(rootDir, ".sera-local-worker-install-evidence-packet", "phase69-local-worker-install-evidence-packet-status.md"))).toBe(true);
    expect(fs.existsSync(path.join(rootDir, "apps/operator-console/src/local-worker-install-evidence-packet.ts"))).toBe(true);
  });

  it("blocks unsafe local worker install evidence packet boundaries", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-local-worker-install-evidence-packet-block-cert-"));
    writeFixture(rootDir);

    const config = createDefaultLocalWorkerInstallEvidencePacketV1();
    config.summary.localWorkerReadyForInstall = true;
    config.summary.installEvidencePacketLocked = true;
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
    config.boundaries.installEvidencePacketSigningAllowed = true;
    config.boundaries.evidencePacketExecutionAllowed = true;
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
    config.boundaries.installEvidencePacketPersistenceAllowed = true;
    config.boundaries.finalApprovalAllowed = true;
    config.boundaries.autoRouteAllowed = true;
    config.boundaries.selfApprovalAllowed = true;

    const result = inspectLocalWorkerInstallEvidencePacketV1(config, { rootDir, writeArtifacts: false });

    expect(result.ok).toBe(false);
    expect(result.blockers).toContain("localWorkerReadyForInstall must remain false");
    expect(result.blockers).toContain("installEvidencePacketLocked must remain false");
    expect(result.blockers).toContain("workerInstallApproved must remain false");
    expect(result.blockers).toContain("workerInstalled must remain false");
    expect(result.blockers).toContain("scheduledExecutionAllowed must remain false");
    expect(result.blockers).toContain("executableScheduleCount must remain zero");
    expect(result.blockers).toContain("installEvidencePacketSigningAllowed must remain false");
    expect(result.blockers).toContain("evidencePacketExecutionAllowed must remain false");
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
    expect(result.blockers).toContain("installEvidencePacketPersistenceAllowed must remain false");
    expect(result.blockers).toContain("finalApprovalAllowed must remain false");
    expect(result.blockers).toContain("autoRouteAllowed must remain false");
    expect(result.blockers).toContain("selfApprovalAllowed must remain false");
  });

  it("blocks unsafe declared paths", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-local-worker-install-evidence-packet-path-cert-"));
    writeFixture(rootDir);

    const config = createDefaultLocalWorkerInstallEvidencePacketV1();
    config.declaredPaths.push("../outside.md");

    const result = inspectLocalWorkerInstallEvidencePacketV1(config, { rootDir, writeArtifacts: false });

    expect(result.ok).toBe(false);
    expect(result.blockers).toContain("Declared path must be safe and relative: ../outside.md");
  });
});
