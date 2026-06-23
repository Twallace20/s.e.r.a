import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createDefaultLocalWorkerRollbackPlanV1, inspectLocalWorkerRollbackPlanV1 } from "../../scripts/lib/local-worker-rollback-plan-v1.mjs";

function writeFixture(rootDir: string) {
  const files = new Map<string, string>([
    ["docs/phases/PHASE_66_LOCAL_WORKER_ROLLBACK_PLAN_V1.md", "# Phase 66 Local Worker Rollback Plan v1"],
    ["apps/operator-console/src/local-worker-rollback-plan.ts", "export const localWorkerRollbackPlanPacket = { phase: { label: 'Phase 66' }, rollbackPlanSummary: { owner: 'Tyler Wallace' }, rollbackPlanRequirements: [], evidenceRequirements: [], boundaries: { workerInstallAllowed: false } };"],
    ["scripts/lib/local-worker-rollback-plan-v1.mjs", "export const marker = true;"],
    ["scripts/run-local-worker-rollback-plan-v1.mjs", "console.log('Local worker rollback plan');"],
    ["tests/integration/local-worker-rollback-plan-v1.test.ts", "// fixture"],
    ["apps/operator-console/src/App.tsx", `localWorkerRollbackPlanPacket.rollbackPlanSummary.owner
localWorkerRollbackPlanPacket.rollbackPlanRequirements.length
localWorkerRollbackPlanPacket.evidenceRequirements.length
localWorkerRollbackPlanPacket.boundaries.workerInstallAllowed
localWorkerRollbackPlanPacket.rollbackPlanSummary.rollbackPlanLocked
Local Worker Rollback Plan`],
    ["package.json", `{"scripts": {"phase66:demo": "node scripts/run-local-worker-rollback-plan-v1.mjs", "phase66:verify": "npm run phase66:demo"}}`],
  ]);

  for (const [relativePath, content] of files) {
    const fullPath = path.join(rootDir, relativePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, `${content}
`, "utf8");
  }
}

describe("local-worker-rollback-plan-v1", () => {
  it("passes when the local worker rollback plan is declarative and app-bound", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-local-worker-rollback-plan-cert-"));
    writeFixture(rootDir);

    const result = inspectLocalWorkerRollbackPlanV1(createDefaultLocalWorkerRollbackPlanV1(), { rootDir, writeArtifacts: false });

    expect(result.ok).toBe(true);
    expect(result.localWorkerRollbackPlanStatus).toBe("rollback-plan-ready");
    expect(result.rollbackPlanOnly).toBe(true);
    expect(result.ownerReviewOnly).toBe(true);
    expect(result.declarativeOnly).toBe(true);
    expect(result.phase65WorkspaceBoundaryReady).toBe(true);
    expect(result.ownerApprovalRequired).toBe(true);
    expect(result.rollbackTargetRequired).toBe(true);
    expect(result.localWorkerReadyForInstall).toBe(false);
    expect(result.rollbackPlanLocked).toBe(false);
    expect(result.workspaceBoundaryLocked).toBe(false);
    expect(result.installScopeLocked).toBe(false);
    expect(result.installApprovalRecordApproved).toBe(false);
    expect(result.installPlanApproved).toBe(false);
    expect(result.workerInstallApproved).toBe(false);
    expect(result.workerInstalled).toBe(false);
    expect(result.workerConnected).toBe(false);
    expect(result.scheduledExecutionAllowed).toBe(false);
    expect(result.rollbackPlanSigningAllowed).toBe(false);
    expect(result.rollbackExecutionAllowed).toBe(false);
    expect(result.stateRestoreAllowed).toBe(false);
    expect(result.backupCreationAllowed).toBe(false);
    expect(result.workerInstallAllowed).toBe(false);
    expect(result.commandExecutionAllowed).toBe(false);
    expect(result.shellExecutionAllowed).toBe(false);
    expect(result.runnerConnectivityAllowed).toBe(false);
    expect(result.selfApprovalAllowed).toBe(false);
  });

  it("writes local worker rollback plan reports without mutating source", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-local-worker-rollback-plan-report-cert-"));
    writeFixture(rootDir);

    const result = inspectLocalWorkerRollbackPlanV1(createDefaultLocalWorkerRollbackPlanV1(), { rootDir, writeArtifacts: true });

    expect(result.ok).toBe(true);
    expect(fs.existsSync(path.join(rootDir, ".sera-local-worker-rollback-plan", "phase66-local-worker-rollback-plan-status.json"))).toBe(true);
    expect(fs.existsSync(path.join(rootDir, ".sera-local-worker-rollback-plan", "phase66-local-worker-rollback-plan-status.md"))).toBe(true);
    expect(fs.existsSync(path.join(rootDir, "apps/operator-console/src/local-worker-rollback-plan.ts"))).toBe(true);
  });

  it("blocks unsafe local worker rollback plan boundaries", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-local-worker-rollback-plan-block-cert-"));
    writeFixture(rootDir);

    const config = createDefaultLocalWorkerRollbackPlanV1();
    config.summary.localWorkerReadyForInstall = true;
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
    config.boundaries.rollbackPlanSigningAllowed = true;
    config.boundaries.workspaceBoundarySigningAllowed = true;
    config.boundaries.scopeLockSigningAllowed = true;
    config.boundaries.approvalRecordSigningAllowed = true;
    config.boundaries.rollbackExecutionAllowed = true;
    config.boundaries.stateRestoreAllowed = true;
    config.boundaries.backupCreationAllowed = true;
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
    config.boundaries.workspaceProbeAllowed = true;
    config.boundaries.filesystemScanAllowed = true;
    config.boundaries.filesystemMutationAllowed = true;
    config.boundaries.pathCreationAllowed = true;
    config.boundaries.pathDeletionAllowed = true;
    config.boundaries.rollbackPlanPersistenceAllowed = true;
    config.boundaries.finalApprovalAllowed = true;
    config.boundaries.autoRouteAllowed = true;
    config.boundaries.selfApprovalAllowed = true;

    const result = inspectLocalWorkerRollbackPlanV1(config, { rootDir, writeArtifacts: false });

    expect(result.ok).toBe(false);
    expect(result.blockers).toContain("localWorkerReadyForInstall must remain false");
    expect(result.blockers).toContain("rollbackPlanLocked must remain false");
    expect(result.blockers).toContain("workspaceBoundaryLocked must remain false");
    expect(result.blockers).toContain("installScopeLocked must remain false");
    expect(result.blockers).toContain("installApprovalRecordApproved must remain false");
    expect(result.blockers).toContain("installPlanApproved must remain false");
    expect(result.blockers).toContain("executionUnlockApproved must remain false");
    expect(result.blockers).toContain("overnightWorkAuthorized must remain false");
    expect(result.blockers).toContain("workerInstallApproved must remain false");
    expect(result.blockers).toContain("workerInstalled must remain false");
    expect(result.blockers).toContain("workerConnected must remain false");
    expect(result.blockers).toContain("scheduledExecutionAllowed must remain false");
    expect(result.blockers).toContain("executableScheduleCount must remain zero");
    expect(result.blockers).toContain("rollbackPlanSigningAllowed must remain false");
    expect(result.blockers).toContain("rollbackExecutionAllowed must remain false");
    expect(result.blockers).toContain("stateRestoreAllowed must remain false");
    expect(result.blockers).toContain("backupCreationAllowed must remain false");
    expect(result.blockers).toContain("dependencyDownloadAllowed must remain false");
    expect(result.blockers).toContain("installerExecutionAllowed must remain false");
    expect(result.blockers).toContain("schedulerCreationAllowed must remain false");
    expect(result.blockers).toContain("schedulerQueryAllowed must remain false");
    expect(result.blockers).toContain("commandExecutionAllowed must remain false");
    expect(result.blockers).toContain("shellExecutionAllowed must remain false");
    expect(result.blockers).toContain("runnerConnectivityAllowed must remain false");
    expect(result.blockers).toContain("workerInstallAllowed must remain false");
    expect(result.blockers).toContain("workerConnectionAllowed must remain false");
    expect(result.blockers).toContain("workerSpawnAllowed must remain false");
    expect(result.blockers).toContain("taskExecutionAllowed must remain false");
    expect(result.blockers).toContain("processInspectionAllowed must remain false");
    expect(result.blockers).toContain("workspaceProbeAllowed must remain false");
    expect(result.blockers).toContain("filesystemScanAllowed must remain false");
    expect(result.blockers).toContain("filesystemMutationAllowed must remain false");
    expect(result.blockers).toContain("pathCreationAllowed must remain false");
    expect(result.blockers).toContain("pathDeletionAllowed must remain false");
    expect(result.blockers).toContain("rollbackPlanPersistenceAllowed must remain false");
    expect(result.blockers).toContain("finalApprovalAllowed must remain false");
    expect(result.blockers).toContain("autoRouteAllowed must remain false");
    expect(result.blockers).toContain("selfApprovalAllowed must remain false");
  });

  it("blocks unsafe declared paths", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-local-worker-rollback-plan-path-cert-"));
    writeFixture(rootDir);

    const config = createDefaultLocalWorkerRollbackPlanV1();
    config.declaredPaths.push("../outside.md");

    const result = inspectLocalWorkerRollbackPlanV1(config, { rootDir, writeArtifacts: false });

    expect(result.ok).toBe(false);
    expect(result.blockers).toContain("Declared path must be safe and relative: ../outside.md");
  });
});
