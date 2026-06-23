import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createDefaultLocalWorkerUnlockProposalPacketV1, inspectLocalWorkerUnlockProposalPacketV1 } from "../../scripts/lib/local-worker-unlock-proposal-packet-v1.mjs";

function writeFixture(rootDir: string) {
  const files = new Map<string, string>([
    ["docs/phases/PHASE_61_LOCAL_WORKER_UNLOCK_PROPOSAL_PACKET_V1.md", "# Phase 61 Local Worker Unlock Proposal Packet v1"],
    ["apps/operator-console/src/local-worker-unlock-proposal-packet.ts", "export const localWorkerUnlockProposalPacket = { phase: { label: 'Phase 61' }, proposalSummary: { owner: 'Tyler Wallace' }, unlockProposalRequirements: [], evidenceRequirements: [], boundaries: { executionUnlockAllowed: false } };"],
    ["scripts/lib/local-worker-unlock-proposal-packet-v1.mjs", "export const marker = true;"],
    ["scripts/run-local-worker-unlock-proposal-packet-v1.mjs", "console.log('Local worker unlock proposal packet');"],
    ["tests/integration/local-worker-unlock-proposal-packet-v1.test.ts", "// fixture"],
    ["apps/operator-console/src/App.tsx", `localWorkerUnlockProposalPacket.proposalSummary.owner
localWorkerUnlockProposalPacket.unlockProposalRequirements.length
localWorkerUnlockProposalPacket.evidenceRequirements.length
localWorkerUnlockProposalPacket.boundaries.executionUnlockAllowed
localWorkerUnlockProposalPacket.proposalSummary.unlockProposalApproved
Local Worker Unlock Proposal Packet`],
    ["package.json", `{"scripts": {"phase61:demo": "node scripts/run-local-worker-unlock-proposal-packet-v1.mjs", "phase61:verify": "npm run phase61:demo"}}`],
  ]);

  for (const [relativePath, content] of files) {
    const fullPath = path.join(rootDir, relativePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, `${content}\n`, "utf8");
  }
}

describe("local-worker-unlock-proposal-packet-v1", () => {
  it("passes when the local worker unlock proposal packet is declarative and app-bound", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-local-worker-unlock-proposal-cert-"));
    writeFixture(rootDir);

    const result = inspectLocalWorkerUnlockProposalPacketV1(createDefaultLocalWorkerUnlockProposalPacketV1(), { rootDir, writeArtifacts: false });

    expect(result.ok).toBe(true);
    expect(result.localWorkerUnlockProposalPacketStatus).toBe("ready");
    expect(result.unlockProposalOnly).toBe(true);
    expect(result.ownerReviewOnly).toBe(true);
    expect(result.declarativeOnly).toBe(true);
    expect(result.phase60ReadinessGateReady).toBe(true);
    expect(result.ownerApprovalRequired).toBe(true);
    expect(result.localWorkerReadyForUnlock).toBe(false);
    expect(result.unlockProposalApproved).toBe(false);
    expect(result.executionUnlockApproved).toBe(false);
    expect(result.workerInstallApproved).toBe(false);
    expect(result.workerInstalled).toBe(false);
    expect(result.workerConnected).toBe(false);
    expect(result.scheduledExecutionAllowed).toBe(false);
    expect(result.executionUnlockAllowed).toBe(false);
    expect(result.workerInstallAllowed).toBe(false);
    expect(result.commandExecutionAllowed).toBe(false);
    expect(result.shellExecutionAllowed).toBe(false);
    expect(result.runnerConnectivityAllowed).toBe(false);
    expect(result.selfApprovalAllowed).toBe(false);
  });

  it("writes local worker unlock proposal packet reports without mutating source", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-local-worker-unlock-proposal-report-cert-"));
    writeFixture(rootDir);

    const result = inspectLocalWorkerUnlockProposalPacketV1(createDefaultLocalWorkerUnlockProposalPacketV1(), { rootDir, writeArtifacts: true });

    expect(result.ok).toBe(true);
    expect(fs.existsSync(path.join(rootDir, ".sera-local-worker-unlock-proposal-packet", "phase61-local-worker-unlock-proposal-packet-status.json"))).toBe(true);
    expect(fs.existsSync(path.join(rootDir, ".sera-local-worker-unlock-proposal-packet", "phase61-local-worker-unlock-proposal-packet-status.md"))).toBe(true);
    expect(fs.existsSync(path.join(rootDir, "apps/operator-console/src/local-worker-unlock-proposal-packet.ts"))).toBe(true);
  });

  it("blocks unsafe local worker unlock proposal boundaries", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-local-worker-unlock-proposal-block-cert-"));
    writeFixture(rootDir);

    const config = createDefaultLocalWorkerUnlockProposalPacketV1();
    config.summary.localWorkerReadyForUnlock = true;
    config.summary.unlockProposalApproved = true;
    config.summary.executionUnlockApproved = true;
    config.summary.overnightWorkAuthorized = true;
    config.summary.workerInstallApproved = true;
    config.summary.workerInstalled = true;
    config.summary.workerConnected = true;
    config.summary.windowsSchedulerConfigured = true;
    config.summary.scheduledExecutionAllowed = true;
    config.summary.executableScheduleCount = 1;
    config.boundaries.executionUnlockAllowed = true;
    config.boundaries.overnightExecutionAllowed = true;
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
    config.boundaries.unlockProposalPersistenceAllowed = true;
    config.boundaries.finalApprovalAllowed = true;
    config.boundaries.autoRouteAllowed = true;
    config.boundaries.selfApprovalAllowed = true;

    const result = inspectLocalWorkerUnlockProposalPacketV1(config, { rootDir, writeArtifacts: false });

    expect(result.ok).toBe(false);
    expect(result.blockers).toContain("localWorkerReadyForUnlock must remain false");
    expect(result.blockers).toContain("unlockProposalApproved must remain false");
    expect(result.blockers).toContain("executionUnlockApproved must remain false");
    expect(result.blockers).toContain("overnightWorkAuthorized must remain false");
    expect(result.blockers).toContain("workerInstallApproved must remain false");
    expect(result.blockers).toContain("workerInstalled must remain false");
    expect(result.blockers).toContain("workerConnected must remain false");
    expect(result.blockers).toContain("executableScheduleCount must remain zero");
    expect(result.blockers).toContain("executionUnlockAllowed must remain false");
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
    expect(result.blockers).toContain("unlockProposalPersistenceAllowed must remain false");
    expect(result.blockers).toContain("finalApprovalAllowed must remain false");
    expect(result.blockers).toContain("autoRouteAllowed must remain false");
    expect(result.blockers).toContain("selfApprovalAllowed must remain false");
  });

  it("blocks unsafe declared paths", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-local-worker-unlock-proposal-path-cert-"));
    writeFixture(rootDir);

    const config = createDefaultLocalWorkerUnlockProposalPacketV1();
    config.declaredPaths.push("../outside.md");

    const result = inspectLocalWorkerUnlockProposalPacketV1(config, { rootDir, writeArtifacts: false });

    expect(result.ok).toBe(false);
    expect(result.blockers).toContain("Declared path must be safe and relative: ../outside.md");
  });
});
