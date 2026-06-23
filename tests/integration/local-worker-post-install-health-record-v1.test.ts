import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createDefaultLocalWorkerPostInstallHealthRecordV1, inspectLocalWorkerPostInstallHealthRecordV1 } from "../../scripts/lib/local-worker-post-install-health-record-v1.mjs";

function writeFile(rootDir: string, relativePath: string, content: string) {
  const fullPath = path.join(rootDir, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, "utf8");
}

function writeFixture(rootDir: string) {
  const app = `
import { localWorkerPostInstallHealthRecord, localWorkerPostInstallHealthRecordSafetyGates } from "./local-worker-post-install-health-record";

const gates = [
  ...localWorkerPostInstallHealthRecordSafetyGates,
];

export function App() {
  return <section>
    <h2>Local Worker Post-Install Health Record</h2>
    <span>{localWorkerPostInstallHealthRecord.postInstallHealthRecordSummary.owner}</span>
    <span>{localWorkerPostInstallHealthRecord.postInstallHealthRecordRequirements.length}</span>
    <span>{localWorkerPostInstallHealthRecord.evidenceRequirements.length}</span>
    <span>{localWorkerPostInstallHealthRecord.boundaries.workerInstallAllowed ? "allowed" : "blocked"}</span>
    <span>{localWorkerPostInstallHealthRecord.postInstallHealthRecordSummary.postInstallHealthRecordLocked ? "yes" : "no"}</span>
  </section>;
}
`;
  const packageJson = JSON.stringify({ scripts: { "phase71:demo": "node scripts/run-local-worker-post-install-health-record-v1.mjs", "phase71:verify": "npm run free-core:verify && npm run knowledge:verify && npm run phase70:demo && npm run phase71:demo" } }, null, 2);
  writeFile(rootDir, "apps/operator-console/src/App.tsx", app);
  writeFile(rootDir, "package.json", packageJson);
  for (const file of [
    "docs/phases/PHASE_71_LOCAL_WORKER_POST_INSTALL_HEALTH_RECORD_V1.md",
    "scripts/lib/local-worker-post-install-health-record-v1.mjs",
    "scripts/run-local-worker-post-install-health-record-v1.mjs",
    "tests/integration/local-worker-post-install-health-record-v1.test.ts",
    "apps/operator-console/src/local-worker-post-install-health-record.ts",
  ]) writeFile(rootDir, file, "// fixture");
}

describe("local-worker-post-install-health-record-v1", () => {
  it("passes when the local worker post-install health record is declarative and app-bound", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-local-worker-post-install-health-record-cert-"));
    writeFixture(rootDir);
    const result = inspectLocalWorkerPostInstallHealthRecordV1(createDefaultLocalWorkerPostInstallHealthRecordV1(), { rootDir, writeArtifacts: false });
    expect(result.ok).toBe(true);
    expect(result.localWorkerPostInstallHealthRecordStatus).toBe("post-install-health-record-ready");
    expect(result.postInstallHealthRecordOnly).toBe(true);
    expect(result.ownerReviewOnly).toBe(true);
    expect(result.declarativeOnly).toBe(true);
    expect(result.declaredFileCount).toBe(5);
    expect(result.postInstallHealthRecordRequirementCount).toBe(6);
    expect(result.postInstallHealthRecordFieldCount).toBe(8);
    expect(result.postInstallHealthRecordEvidenceCount).toBe(6);
    expect(result.postInstallHealthRecordSignalCount).toBe(8);
    expect(result.safetyGateCount).toBe(300);
    expect(result.appBindingCount).toBe(5);
    expect(result.phase70ManualInstallGateReady).toBe(true);
    expect(result.phase69InstallEvidencePacketReady).toBe(true);
    expect(result.ownerApprovalRequired).toBe(true);
    expect(result.explicitPostInstallHealthRecordRequired).toBe(true);
    expect(result.ownerHealthRecordReviewRequired).toBe(true);
    expect(result.healthSignalInventoryRequired).toBe(true);
    expect(result.postInstallHealthChecklistRequired).toBe(true);
    expect(result.healthRecordRemainsPlannedRequired).toBe(true);
    expect(result.localWorkerReadyForInstall).toBe(false);
    expect(result.postInstallHealthRecordLocked).toBe(false);
    expect(result.workerInstallApproved).toBe(false);
    expect(result.workerInstalled).toBe(false);
    expect(result.postInstallHealthRecordSigningAllowed).toBe(false);
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

  it("writes local worker post-install health record reports without mutating source", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-local-worker-post-install-health-record-report-cert-"));
    writeFixture(rootDir);
    const result = inspectLocalWorkerPostInstallHealthRecordV1(createDefaultLocalWorkerPostInstallHealthRecordV1(), { rootDir, writeArtifacts: true });
    expect(result.ok).toBe(true);
    expect(fs.existsSync(path.join(rootDir, ".sera-local-worker-post-install-health-record", "phase71-local-worker-post-install-health-record-status.json"))).toBe(true);
    expect(fs.existsSync(path.join(rootDir, ".sera-local-worker-post-install-health-record", "phase71-local-worker-post-install-health-record-status.md"))).toBe(true);
    expect(fs.existsSync(path.join(rootDir, "apps/operator-console/src/local-worker-post-install-health-record.ts"))).toBe(true);
  });

  it("blocks unsafe local worker post-install health record boundaries", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-local-worker-post-install-health-record-block-cert-"));
    writeFixture(rootDir);
    const config = createDefaultLocalWorkerPostInstallHealthRecordV1();
    config.summary.localWorkerReadyForInstall = true;
    config.summary.postInstallHealthRecordLocked = true;
    config.summary.installEvidencePacketLocked = true;
    config.summary.workerInstallApproved = true;
    config.summary.workerInstalled = true;
    config.summary.workerConnected = true;
    config.summary.scheduledExecutionAllowed = true;
    config.summary.executableScheduleCount = 1;
    config.boundaries.postInstallHealthRecordSigningAllowed = true;
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
    config.boundaries.postInstallHealthRecordPersistenceAllowed = true;
    config.boundaries.finalApprovalAllowed = true;
    config.boundaries.autoRouteAllowed = true;
    config.boundaries.selfApprovalAllowed = true;
    const result = inspectLocalWorkerPostInstallHealthRecordV1(config, { rootDir, writeArtifacts: false });
    expect(result.ok).toBe(false);
    expect(result.blockers).toContain("localWorkerReadyForInstall must remain false");
    expect(result.blockers).toContain("postInstallHealthRecordLocked must remain false");
    expect(result.blockers).toContain("workerInstallApproved must remain false");
    expect(result.blockers).toContain("workerInstalled must remain false");
    expect(result.blockers).toContain("scheduledExecutionAllowed must remain false");
    expect(result.blockers).toContain("executableScheduleCount must remain zero");
    expect(result.blockers).toContain("postInstallHealthRecordSigningAllowed must remain false");
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
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-local-worker-post-install-health-record-path-cert-"));
    writeFixture(rootDir);
    const config = createDefaultLocalWorkerPostInstallHealthRecordV1();
    config.declaredPaths.push("../outside.md");
    const result = inspectLocalWorkerPostInstallHealthRecordV1(config, { rootDir, writeArtifacts: false });
    expect(result.ok).toBe(false);
    expect(result.blockers).toContain("Declared path must be safe and relative: ../outside.md");
  });
});
