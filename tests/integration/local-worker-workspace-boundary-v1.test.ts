import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createDefaultLocalWorkerWorkspaceBoundaryV1, inspectLocalWorkerWorkspaceBoundaryV1 } from "../../scripts/lib/local-worker-workspace-boundary-v1.mjs";

function writeFixture(rootDir: string) {
  const files = new Map<string, string>([
    ["docs/phases/PHASE_65_LOCAL_WORKER_WORKSPACE_BOUNDARY_V1.md", "# Phase 65 Local Worker Workspace Boundary v1"],
    ["apps/operator-console/src/local-worker-workspace-boundary.ts", "export const localWorkerWorkspaceBoundaryPacket = { phase: { label: 'Phase 65' }, workspaceBoundarySummary: { owner: 'Tyler Wallace' }, workspaceBoundaryRequirements: [], evidenceRequirements: [], boundaries: { workerInstallAllowed: false } };"],
    ["scripts/lib/local-worker-workspace-boundary-v1.mjs", "export const marker = true;"],
    ["scripts/run-local-worker-workspace-boundary-v1.mjs", "console.log('Local worker workspace boundary');"],
    ["tests/integration/local-worker-workspace-boundary-v1.test.ts", "// fixture"],
    ["apps/operator-console/src/App.tsx", `localWorkerWorkspaceBoundaryPacket.workspaceBoundarySummary.owner
localWorkerWorkspaceBoundaryPacket.workspaceBoundaryRequirements.length
localWorkerWorkspaceBoundaryPacket.evidenceRequirements.length
localWorkerWorkspaceBoundaryPacket.boundaries.workerInstallAllowed
localWorkerWorkspaceBoundaryPacket.workspaceBoundarySummary.workspaceBoundaryLocked
Local Worker Workspace Boundary`],
    ["package.json", `{"scripts": {"phase65:demo": "node scripts/run-local-worker-workspace-boundary-v1.mjs", "phase65:verify": "npm run phase65:demo"}}`],
  ]);

  for (const [relativePath, content] of files) {
    const fullPath = path.join(rootDir, relativePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, `${content}
`, "utf8");
  }
}

describe("local-worker-workspace-boundary-v1", () => {
  it("passes when the local worker workspace boundary is declarative and app-bound", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-local-worker-workspace-boundary-cert-"));
    writeFixture(rootDir);

    const result = inspectLocalWorkerWorkspaceBoundaryV1(createDefaultLocalWorkerWorkspaceBoundaryV1(), { rootDir, writeArtifacts: false });

    expect(result.ok).toBe(true);
    expect(result.localWorkerWorkspaceBoundaryStatus).toBe("workspace-boundary-ready");
    expect(result.workspaceBoundaryOnly).toBe(true);
    expect(result.ownerReviewOnly).toBe(true);
    expect(result.declarativeOnly).toBe(true);
    expect(result.phase64ScopeLockReady).toBe(true);
    expect(result.ownerApprovalRequired).toBe(true);
    expect(result.exactWorkspaceRootRequired).toBe(true);
    expect(result.localWorkerReadyForInstall).toBe(false);
    expect(result.workspaceBoundaryLocked).toBe(false);
    expect(result.installScopeLocked).toBe(false);
    expect(result.installApprovalRecordApproved).toBe(false);
    expect(result.installPlanApproved).toBe(false);
    expect(result.workerInstallApproved).toBe(false);
    expect(result.workerInstalled).toBe(false);
    expect(result.workerConnected).toBe(false);
    expect(result.scheduledExecutionAllowed).toBe(false);
    expect(result.workspaceBoundarySigningAllowed).toBe(false);
    expect(result.workspaceProbeAllowed).toBe(false);
    expect(result.filesystemScanAllowed).toBe(false);
    expect(result.workerInstallAllowed).toBe(false);
    expect(result.commandExecutionAllowed).toBe(false);
    expect(result.shellExecutionAllowed).toBe(false);
    expect(result.runnerConnectivityAllowed).toBe(false);
    expect(result.selfApprovalAllowed).toBe(false);
  });

  it("writes local worker workspace boundary reports without mutating source", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-local-worker-workspace-boundary-report-cert-"));
    writeFixture(rootDir);

    const result = inspectLocalWorkerWorkspaceBoundaryV1(createDefaultLocalWorkerWorkspaceBoundaryV1(), { rootDir, writeArtifacts: true });

    expect(result.ok).toBe(true);
    expect(fs.existsSync(path.join(rootDir, ".sera-local-worker-workspace-boundary", "phase65-local-worker-workspace-boundary-status.json"))).toBe(true);
    expect(fs.existsSync(path.join(rootDir, ".sera-local-worker-workspace-boundary", "phase65-local-worker-workspace-boundary-status.md"))).toBe(true);
    expect(fs.existsSync(path.join(rootDir, "apps/operator-console/src/local-worker-workspace-boundary.ts"))).toBe(true);
  });

  it("blocks unsafe local worker workspace boundary boundaries", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-local-worker-workspace-boundary-block-cert-"));
    writeFixture(rootDir);

    const config = createDefaultLocalWorkerWorkspaceBoundaryV1();
    config.summary.localWorkerReadyForInstall = true;
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
    config.boundaries.workspaceBoundarySigningAllowed = true;
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
    config.boundaries.workspaceProbeAllowed = true;
    config.boundaries.filesystemScanAllowed = true;
    config.boundaries.filesystemMutationAllowed = true;
    config.boundaries.pathCreationAllowed = true;
    config.boundaries.pathDeletionAllowed = true;
    config.boundaries.workspaceBoundaryPersistenceAllowed = true;
    config.boundaries.finalApprovalAllowed = true;
    config.boundaries.autoRouteAllowed = true;
    config.boundaries.selfApprovalAllowed = true;

    const result = inspectLocalWorkerWorkspaceBoundaryV1(config, { rootDir, writeArtifacts: false });

    expect(result.ok).toBe(false);
    expect(result.blockers).toContain("localWorkerReadyForInstall must remain false");
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
    expect(result.blockers).toContain("workspaceBoundarySigningAllowed must remain false");
    expect(result.blockers).toContain("scopeLockSigningAllowed must remain false");
    expect(result.blockers).toContain("approvalRecordSigningAllowed must remain false");
    expect(result.blockers).toContain("executionUnlockAllowed must remain false");
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
    expect(result.blockers).toContain("workspaceBoundaryPersistenceAllowed must remain false");
    expect(result.blockers).toContain("finalApprovalAllowed must remain false");
    expect(result.blockers).toContain("autoRouteAllowed must remain false");
    expect(result.blockers).toContain("selfApprovalAllowed must remain false");
  });

  it("blocks unsafe declared paths", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-local-worker-workspace-boundary-path-cert-"));
    writeFixture(rootDir);

    const config = createDefaultLocalWorkerWorkspaceBoundaryV1();
    config.declaredPaths.push("../outside.md");

    const result = inspectLocalWorkerWorkspaceBoundaryV1(config, { rootDir, writeArtifacts: false });

    expect(result.ok).toBe(false);
    expect(result.blockers).toContain("Declared path must be safe and relative: ../outside.md");
  });
});
