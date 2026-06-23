import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createDefaultLocalWorkerInstallScopeLockV1, inspectLocalWorkerInstallScopeLockV1 } from "../../scripts/lib/local-worker-install-scope-lock-v1.mjs";

function writeFixture(rootDir: string) {
  const files = new Map<string, string>([
    ["docs/phases/PHASE_64_LOCAL_WORKER_INSTALL_SCOPE_LOCK_V1.md", "# Phase 64 Local Worker Install Scope Lock v1"],
    ["apps/operator-console/src/local-worker-install-scope-lock.ts", "export const localWorkerInstallScopeLockPacket = { phase: { label: 'Phase 64' }, installScopeLockSummary: { owner: 'Tyler Wallace' }, installScopeLockRequirements: [], evidenceRequirements: [], boundaries: { workerInstallAllowed: false } };"],
    ["scripts/lib/local-worker-install-scope-lock-v1.mjs", "export const marker = true;"],
    ["scripts/run-local-worker-install-scope-lock-v1.mjs", "console.log('Local worker install scope lock');"],
    ["tests/integration/local-worker-install-scope-lock-v1.test.ts", "// fixture"],
    ["apps/operator-console/src/App.tsx", `localWorkerInstallScopeLockPacket.installScopeLockSummary.owner
localWorkerInstallScopeLockPacket.installScopeLockRequirements.length
localWorkerInstallScopeLockPacket.evidenceRequirements.length
localWorkerInstallScopeLockPacket.boundaries.workerInstallAllowed
localWorkerInstallScopeLockPacket.installScopeLockSummary.installScopeLocked
Local Worker Install Scope Lock`],
    ["package.json", `{"scripts": {"phase64:demo": "node scripts/run-local-worker-install-scope-lock-v1.mjs", "phase64:verify": "npm run phase64:demo"}}`],
  ]);

  for (const [relativePath, content] of files) {
    const fullPath = path.join(rootDir, relativePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, `${content}
`, "utf8");
  }
}

describe("local-worker-install-scope-lock-v1", () => {
  it("passes when the local worker install scope lock is declarative and app-bound", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-local-worker-install-scope-lock-cert-"));
    writeFixture(rootDir);

    const result = inspectLocalWorkerInstallScopeLockV1(createDefaultLocalWorkerInstallScopeLockV1(), { rootDir, writeArtifacts: false });

    expect(result.ok).toBe(true);
    expect(result.localWorkerInstallScopeLockStatus).toBe("scope-lock-ready");
    expect(result.installScopeLockOnly).toBe(true);
    expect(result.ownerReviewOnly).toBe(true);
    expect(result.declarativeOnly).toBe(true);
    expect(result.phase63ApprovalRecordReady).toBe(true);
    expect(result.ownerApprovalRequired).toBe(true);
    expect(result.explicitScopeLockRequired).toBe(true);
    expect(result.localWorkerReadyForInstall).toBe(false);
    expect(result.installScopeLocked).toBe(false);
    expect(result.installApprovalRecordApproved).toBe(false);
    expect(result.installPlanApproved).toBe(false);
    expect(result.workerInstallApproved).toBe(false);
    expect(result.workerInstalled).toBe(false);
    expect(result.workerConnected).toBe(false);
    expect(result.scheduledExecutionAllowed).toBe(false);
    expect(result.scopeLockSigningAllowed).toBe(false);
    expect(result.workerInstallAllowed).toBe(false);
    expect(result.commandExecutionAllowed).toBe(false);
    expect(result.shellExecutionAllowed).toBe(false);
    expect(result.runnerConnectivityAllowed).toBe(false);
    expect(result.selfApprovalAllowed).toBe(false);
  });

  it("writes local worker install scope lock reports without mutating source", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-local-worker-install-scope-lock-report-cert-"));
    writeFixture(rootDir);

    const result = inspectLocalWorkerInstallScopeLockV1(createDefaultLocalWorkerInstallScopeLockV1(), { rootDir, writeArtifacts: true });

    expect(result.ok).toBe(true);
    expect(fs.existsSync(path.join(rootDir, ".sera-local-worker-install-scope-lock", "phase64-local-worker-install-scope-lock-status.json"))).toBe(true);
    expect(fs.existsSync(path.join(rootDir, ".sera-local-worker-install-scope-lock", "phase64-local-worker-install-scope-lock-status.md"))).toBe(true);
    expect(fs.existsSync(path.join(rootDir, "apps/operator-console/src/local-worker-install-scope-lock.ts"))).toBe(true);
  });

  it("blocks unsafe local worker install scope lock boundaries", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-local-worker-install-scope-lock-block-cert-"));
    writeFixture(rootDir);

    const config = createDefaultLocalWorkerInstallScopeLockV1();
    config.summary.localWorkerReadyForInstall = true;
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
    config.boundaries.scopeLockSigningAllowed = true;
    config.boundaries.approvalRecordSigningAllowed = true;
    config.boundaries.executionUnlockAllowed = true;
    config.boundaries.overnightExecutionAllowed = true;
    config.boundaries.liveRunReportAllowed = true;
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
    config.boundaries.filesystemMutationAllowed = true;
    config.boundaries.installScopeLockPersistenceAllowed = true;
    config.boundaries.finalApprovalAllowed = true;
    config.boundaries.autoRouteAllowed = true;
    config.boundaries.selfApprovalAllowed = true;

    const result = inspectLocalWorkerInstallScopeLockV1(config, { rootDir, writeArtifacts: false });

    expect(result.ok).toBe(false);
    expect(result.blockers).toContain("localWorkerReadyForInstall must remain false");
    expect(result.blockers).toContain("installScopeLocked must remain false");
    expect(result.blockers).toContain("installApprovalRecordApproved must remain false");
    expect(result.blockers).toContain("installPlanApproved must remain false");
    expect(result.blockers).toContain("executionUnlockApproved must remain false");
    expect(result.blockers).toContain("overnightWorkAuthorized must remain false");
    expect(result.blockers).toContain("workerInstallApproved must remain false");
    expect(result.blockers).toContain("workerInstalled must remain false");
    expect(result.blockers).toContain("workerConnected must remain false");
    expect(result.blockers).toContain("windowsSchedulerConfigured must remain false");
    expect(result.blockers).toContain("scheduledExecutionAllowed must remain false");
    expect(result.blockers).toContain("executableScheduleCount must remain zero");
    expect(result.blockers).toContain("scopeLockSigningAllowed must remain false");
    expect(result.blockers).toContain("approvalRecordSigningAllowed must remain false");
    expect(result.blockers).toContain("executionUnlockAllowed must remain false");
    expect(result.blockers).toContain("overnightExecutionAllowed must remain false");
    expect(result.blockers).toContain("liveRunReportAllowed must remain false");
    expect(result.blockers).toContain("dependencyDownloadAllowed must remain false");
    expect(result.blockers).toContain("installerExecutionAllowed must remain false");
    expect(result.blockers).toContain("schedulerCreationAllowed must remain false");
    expect(result.blockers).toContain("schedulerQueryAllowed must remain false");
    expect(result.blockers).toContain("powershellExecutionAllowed must remain false");
    expect(result.blockers).toContain("schtasksExecutionAllowed must remain false");
    expect(result.blockers).toContain("commandExecutionAllowed must remain false");
    expect(result.blockers).toContain("shellExecutionAllowed must remain false");
    expect(result.blockers).toContain("runnerConnectivityAllowed must remain false");
    expect(result.blockers).toContain("liveWorkerConnectionAllowed must remain false");
    expect(result.blockers).toContain("workerInstallAllowed must remain false");
    expect(result.blockers).toContain("workerConnectionAllowed must remain false");
    expect(result.blockers).toContain("workerSpawnAllowed must remain false");
    expect(result.blockers).toContain("taskExecutionAllowed must remain false");
    expect(result.blockers).toContain("healthPollingAllowed must remain false");
    expect(result.blockers).toContain("processInspectionAllowed must remain false");
    expect(result.blockers).toContain("filesystemMutationAllowed must remain false");
    expect(result.blockers).toContain("installScopeLockPersistenceAllowed must remain false");
    expect(result.blockers).toContain("finalApprovalAllowed must remain false");
    expect(result.blockers).toContain("autoRouteAllowed must remain false");
    expect(result.blockers).toContain("selfApprovalAllowed must remain false");
  });

  it("blocks unsafe declared paths", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-local-worker-install-scope-lock-path-cert-"));
    writeFixture(rootDir);

    const config = createDefaultLocalWorkerInstallScopeLockV1();
    config.declaredPaths.push("../outside.md");

    const result = inspectLocalWorkerInstallScopeLockV1(config, { rootDir, writeArtifacts: false });

    expect(result.ok).toBe(false);
    expect(result.blockers).toContain("Declared path must be safe and relative: ../outside.md");
  });
});
