import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createDefaultLocalWorkerInstallApprovalRecordV1, inspectLocalWorkerInstallApprovalRecordV1 } from "../../scripts/lib/local-worker-install-approval-record-v1.mjs";

function writeFixture(rootDir: string) {
  const files = new Map<string, string>([
    ["docs/phases/PHASE_63_LOCAL_WORKER_INSTALL_APPROVAL_RECORD_V1.md", "# Phase 63 Local Worker Install Approval Record v1"],
    ["apps/operator-console/src/local-worker-install-approval-record.ts", "export const localWorkerInstallApprovalRecordPacket = { phase: { label: 'Phase 63' }, installApprovalRecordSummary: { owner: 'Tyler Wallace', installApprovalRecordApproved: false }, installApprovalRecordRequirements: [], evidenceRequirements: [], boundaries: { workerInstallAllowed: false } };"] ,
    ["scripts/lib/local-worker-install-approval-record-v1.mjs", "export const marker = true;"],
    ["scripts/run-local-worker-install-approval-record-v1.mjs", "console.log('Local worker install approval record');"],
    ["tests/integration/local-worker-install-approval-record-v1.test.ts", "// fixture"],
    ["apps/operator-console/src/App.tsx", `localWorkerInstallApprovalRecordPacket.installApprovalRecordSummary.owner
localWorkerInstallApprovalRecordPacket.installApprovalRecordRequirements.length
localWorkerInstallApprovalRecordPacket.evidenceRequirements.length
localWorkerInstallApprovalRecordPacket.boundaries.workerInstallAllowed
localWorkerInstallApprovalRecordPacket.installApprovalRecordSummary.installApprovalRecordApproved
Local Worker Install Approval Record`],
    ["package.json", `{"scripts": {"phase63:demo": "node scripts/run-local-worker-install-approval-record-v1.mjs", "phase63:verify": "npm run phase63:demo"}}`],
  ]);

  for (const [relativePath, content] of files) {
    const fullPath = path.join(rootDir, relativePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, `${content}\n`, "utf8");
  }
}

describe("local-worker-install-approval-record-v1", () => {
  it("passes when the local worker install approval record is declarative and app-bound", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-local-worker-install-approval-record-cert-"));
    writeFixture(rootDir);

    const result = inspectLocalWorkerInstallApprovalRecordV1(createDefaultLocalWorkerInstallApprovalRecordV1(), { rootDir, writeArtifacts: false });

    expect(result.ok).toBe(true);
    expect(result.localWorkerInstallApprovalRecordStatus).toBe("approval-record-ready");
    expect(result.installApprovalRecordOnly).toBe(true);
    expect(result.ownerReviewOnly).toBe(true);
    expect(result.declarativeOnly).toBe(true);
    expect(result.phase62InstallPlanReady).toBe(true);
    expect(result.ownerApprovalRequired).toBe(true);
    expect(result.explicitApprovalRecordRequired).toBe(true);
    expect(result.localWorkerReadyForInstall).toBe(false);
    expect(result.installApprovalRecordApproved).toBe(false);
    expect(result.installPlanApproved).toBe(false);
    expect(result.workerInstallApproved).toBe(false);
    expect(result.workerInstalled).toBe(false);
    expect(result.workerConnected).toBe(false);
    expect(result.scheduledExecutionAllowed).toBe(false);
    expect(result.approvalRecordSigningAllowed).toBe(false);
    expect(result.dependencyDownloadAllowed).toBe(false);
    expect(result.installerExecutionAllowed).toBe(false);
    expect(result.workerInstallAllowed).toBe(false);
    expect(result.commandExecutionAllowed).toBe(false);
    expect(result.shellExecutionAllowed).toBe(false);
    expect(result.runnerConnectivityAllowed).toBe(false);
    expect(result.selfApprovalAllowed).toBe(false);
  });

  it("writes local worker install approval record reports without mutating source", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-local-worker-install-approval-record-report-cert-"));
    writeFixture(rootDir);

    const result = inspectLocalWorkerInstallApprovalRecordV1(createDefaultLocalWorkerInstallApprovalRecordV1(), { rootDir, writeArtifacts: true });

    expect(result.ok).toBe(true);
    expect(fs.existsSync(path.join(rootDir, ".sera-local-worker-install-approval-record", "phase63-local-worker-install-approval-record-status.json"))).toBe(true);
    expect(fs.existsSync(path.join(rootDir, ".sera-local-worker-install-approval-record", "phase63-local-worker-install-approval-record-status.md"))).toBe(true);
    expect(fs.existsSync(path.join(rootDir, "apps/operator-console/src/local-worker-install-approval-record.ts"))).toBe(true);
  });

  it("blocks unsafe local worker install approval record boundaries", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-local-worker-install-approval-record-block-cert-"));
    writeFixture(rootDir);

    const config = createDefaultLocalWorkerInstallApprovalRecordV1();
    config.summary.localWorkerReadyForInstall = true;
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
    config.boundaries.approvalRecordSigningAllowed = true;
    config.boundaries.executionUnlockAllowed = true;
    config.boundaries.overnightExecutionAllowed = true;
    config.boundaries.dependencyDownloadAllowed = true;
    config.boundaries.installerExecutionAllowed = true;
    config.boundaries.schedulerCreationAllowed = true;
    config.boundaries.schedulerQueryAllowed = true;
    config.boundaries.powershellExecutionAllowed = true;
    config.boundaries.schtasksExecutionAllowed = true;
    config.boundaries.commandExecutionAllowed = true;
    config.boundaries.shellExecutionAllowed = true;
    config.boundaries.runnerConnectivityAllowed = true;
    config.boundaries.liveWorkerConnectionAllowed = true;
    config.boundaries.workerInstallAllowed = true;
    config.boundaries.workerConnectionAllowed = true;
    config.boundaries.workerSpawnAllowed = true;
    config.boundaries.taskExecutionAllowed = true;
    config.boundaries.healthPollingAllowed = true;
    config.boundaries.processInspectionAllowed = true;
    config.boundaries.fileMutationAllowed = true;
    config.boundaries.filesystemMutationAllowed = true;
    config.boundaries.recordPersistenceAllowed = true;
    config.boundaries.taskPersistenceAllowed = true;
    config.boundaries.installApprovalRecordPersistenceAllowed = true;
    config.boundaries.finalApprovalAllowed = true;
    config.boundaries.autoRouteAllowed = true;
    config.boundaries.selfApprovalAllowed = true;

    const result = inspectLocalWorkerInstallApprovalRecordV1(config, { rootDir, writeArtifacts: false });

    expect(result.ok).toBe(false);
    expect(result.blockers).toContain("localWorkerReadyForInstall must remain false");
    expect(result.blockers).toContain("installApprovalRecordApproved must remain false");
    expect(result.blockers).toContain("installPlanApproved must remain false");
    expect(result.blockers).toContain("executionUnlockApproved must remain false");
    expect(result.blockers).toContain("overnightWorkAuthorized must remain false");
    expect(result.blockers).toContain("workerInstallApproved must remain false");
    expect(result.blockers).toContain("workerInstalled must remain false");
    expect(result.blockers).toContain("workerConnected must remain false");
    expect(result.blockers).toContain("executableScheduleCount must remain zero");
    expect(result.blockers).toContain("approvalRecordSigningAllowed must remain false");
    expect(result.blockers).toContain("executionUnlockAllowed must remain false");
    expect(result.blockers).toContain("dependencyDownloadAllowed must remain false");
    expect(result.blockers).toContain("installerExecutionAllowed must remain false");
    expect(result.blockers).toContain("schedulerCreationAllowed must remain false");
    expect(result.blockers).toContain("schedulerQueryAllowed must remain false");
    expect(result.blockers).toContain("powershellExecutionAllowed must remain false");
    expect(result.blockers).toContain("schtasksExecutionAllowed must remain false");
    expect(result.blockers).toContain("commandExecutionAllowed must remain false");
    expect(result.blockers).toContain("shellExecutionAllowed must remain false");
    expect(result.blockers).toContain("runnerConnectivityAllowed must remain false");
    expect(result.blockers).toContain("workerInstallAllowed must remain false");
    expect(result.blockers).toContain("workerConnectionAllowed must remain false");
    expect(result.blockers).toContain("workerSpawnAllowed must remain false");
    expect(result.blockers).toContain("taskExecutionAllowed must remain false");
    expect(result.blockers).toContain("processInspectionAllowed must remain false");
    expect(result.blockers).toContain("filesystemMutationAllowed must remain false");
    expect(result.blockers).toContain("installApprovalRecordPersistenceAllowed must remain false");
    expect(result.blockers).toContain("finalApprovalAllowed must remain false");
    expect(result.blockers).toContain("autoRouteAllowed must remain false");
    expect(result.blockers).toContain("selfApprovalAllowed must remain false");
  });

  it("blocks unsafe declared paths", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-local-worker-install-approval-record-path-cert-"));
    writeFixture(rootDir);

    const config = createDefaultLocalWorkerInstallApprovalRecordV1();
    config.declaredPaths.push("../outside.md");

    const result = inspectLocalWorkerInstallApprovalRecordV1(config, { rootDir, writeArtifacts: false });

    expect(result.ok).toBe(false);
    expect(result.blockers).toContain("Declared path must be safe and relative: ../outside.md");
  });
});

