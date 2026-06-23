import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createDefaultLocalWorkerReadinessGateV1, inspectLocalWorkerReadinessGateV1 } from "../../scripts/lib/local-worker-readiness-gate-v1.mjs";

function writeFixture(rootDir: string) {
  const files = new Map<string, string>([
    ["docs/phases/PHASE_60_LOCAL_WORKER_READINESS_GATE_V1.md", "# Phase 60 Local Worker Readiness Gate v1"],
    ["apps/operator-console/src/local-worker-readiness-gate.ts", "export const localWorkerReadinessGatePacket = { phase: { label: 'Phase 60' }, readinessSummary: { owner: 'Tyler Wallace' } };"],
    ["scripts/lib/local-worker-readiness-gate-v1.mjs", "export const marker = true;"],
    ["scripts/run-local-worker-readiness-gate-v1.mjs", "console.log('Local worker readiness gate');"],
    ["tests/integration/local-worker-readiness-gate-v1.test.ts", "// fixture"],
    ["apps/operator-console/src/App.tsx", "localWorkerReadinessGatePacket.readinessSummary.owner\nlocalWorkerReadinessGatePacket.readinessGateChecks.length\nlocalWorkerReadinessGatePacket.evidenceRequirements.length\nlocalWorkerReadinessGatePacket.boundaries.executionUnlockAllowed\nlocalWorkerReadinessGatePacket.readinessSummary.localWorkerReadyForUnlock\nLocal Worker Readiness Gate"],
    ["package.json", "{\"scripts\": {\"phase60:demo\": \"node scripts/run-local-worker-readiness-gate-v1.mjs\", \"phase60:verify\": \"npm run phase60:demo\"}}"],
  ]);

  for (const [relativePath, content] of files) {
    const fullPath = path.join(rootDir, relativePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, `${content}\n`, "utf8");
  }
}

describe("local-worker-readiness-gate-v1", () => {
  it("passes when the local worker readiness gate is declarative and app-bound", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-local-worker-readiness-gate-cert-"));
    writeFixture(rootDir);

    const result = inspectLocalWorkerReadinessGateV1(createDefaultLocalWorkerReadinessGateV1(), { rootDir, writeArtifacts: false });

    expect(result.ok).toBe(true);
    expect(result.localWorkerReadinessGateStatus).toBe("ready");
    expect(result.readinessGateOnly).toBe(true);
    expect(result.readinessAssessmentOnly).toBe(true);
    expect(result.declarativeOnly).toBe(true);
    expect(result.allPrerequisitesRepresented).toBe(true);
    expect(result.localWorkerReadyForUnlock).toBe(false);
    expect(result.executionUnlockApproved).toBe(false);
    expect(result.overnightWorkAuthorized).toBe(false);
    expect(result.workerInstalled).toBe(false);
    expect(result.workerConnected).toBe(false);
    expect(result.scheduledExecutionAllowed).toBe(false);
    expect(result.executionUnlockAllowed).toBe(false);
    expect(result.commandExecutionAllowed).toBe(false);
    expect(result.shellExecutionAllowed).toBe(false);
    expect(result.runnerConnectivityAllowed).toBe(false);
    expect(result.selfApprovalAllowed).toBe(false);
  });

  it("writes local worker readiness gate reports without mutating source", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-local-worker-readiness-gate-report-cert-"));
    writeFixture(rootDir);

    const result = inspectLocalWorkerReadinessGateV1(createDefaultLocalWorkerReadinessGateV1(), { rootDir, writeArtifacts: true });

    expect(result.ok).toBe(true);
    expect(fs.existsSync(path.join(rootDir, ".sera-local-worker-readiness-gate", "phase60-local-worker-readiness-gate-status.json"))).toBe(true);
    expect(fs.existsSync(path.join(rootDir, ".sera-local-worker-readiness-gate", "phase60-local-worker-readiness-gate-status.md"))).toBe(true);
    expect(fs.existsSync(path.join(rootDir, "apps/operator-console/src/local-worker-readiness-gate.ts"))).toBe(true);
  });

  it("blocks unsafe local worker readiness gate boundaries", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-local-worker-readiness-gate-block-cert-"));
    writeFixture(rootDir);

    const config = createDefaultLocalWorkerReadinessGateV1();
    config.summary.localWorkerReadyForUnlock = true;
    config.summary.executionUnlockApproved = true;
    config.summary.overnightWorkAuthorized = true;
    config.summary.workerInstalled = true;
    config.summary.workerConnected = true;
    config.summary.windowsSchedulerConfigured = true;
    config.summary.scheduledExecutionAllowed = true;
    config.summary.executableScheduleCount = 1;
    config.boundaries.executionUnlockAllowed = true;
    config.boundaries.overnightExecutionAllowed = true;
    config.boundaries.liveRunReportAllowed = true;
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
    config.boundaries.readinessGatePersistenceAllowed = true;
    config.boundaries.finalApprovalAllowed = true;
    config.boundaries.autoRouteAllowed = true;
    config.boundaries.selfApprovalAllowed = true;

    const result = inspectLocalWorkerReadinessGateV1(config, { rootDir, writeArtifacts: false });

    expect(result.ok).toBe(false);
    expect(result.blockers).toContain("localWorkerReadyForUnlock must remain false");
    expect(result.blockers).toContain("executionUnlockApproved must remain false");
    expect(result.blockers).toContain("overnightWorkAuthorized must remain false");
    expect(result.blockers).toContain("workerInstalled must remain false");
    expect(result.blockers).toContain("workerConnected must remain false");
    expect(result.blockers).toContain("executableScheduleCount must remain zero");
    expect(result.blockers).toContain("executionUnlockAllowed must remain false");
    expect(result.blockers).toContain("overnightExecutionAllowed must remain false");
    expect(result.blockers).toContain("liveRunReportAllowed must remain false");
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
    expect(result.blockers).toContain("readinessGatePersistenceAllowed must remain false");
    expect(result.blockers).toContain("finalApprovalAllowed must remain false");
    expect(result.blockers).toContain("autoRouteAllowed must remain false");
    expect(result.blockers).toContain("selfApprovalAllowed must remain false");
  });

  it("blocks unsafe declared paths", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-local-worker-readiness-gate-path-cert-"));
    writeFixture(rootDir);

    const config = createDefaultLocalWorkerReadinessGateV1();
    config.declaredPaths.push("../outside.md");

    const result = inspectLocalWorkerReadinessGateV1(config, { rootDir, writeArtifacts: false });

    expect(result.ok).toBe(false);
    expect(result.blockers).toContain("Declared path must be safe and relative: ../outside.md");
  });
});
