import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createDefaultMorningStatusPacketV1, inspectMorningStatusPacketV1 } from "../../scripts/lib/morning-status-packet-v1.mjs";

function writeFixture(rootDir: string) {
  const files = new Map<string, string>([
    ["docs/phases/PHASE_59_MORNING_STATUS_PACKET_V1.md", "# Phase 59 Morning Status Packet v1"],
    ["apps/operator-console/src/morning-status-packet.ts", "export const morningStatusPacket = { phase: { label: 'Phase 59' }, packetSummary: { owner: 'Tyler Wallace' } };"],
    ["scripts/lib/morning-status-packet-v1.mjs", "export const marker = true;"],
    ["scripts/run-morning-status-packet-v1.mjs", "console.log('Morning status packet');"],
    ["tests/integration/morning-status-packet-v1.test.ts", "// fixture"],
    ["apps/operator-console/src/App.tsx", "morningStatusPacket.packetSummary.owner\nmorningStatusPacket.packetSections.length\nmorningStatusPacket.evidenceRequirements.length\nmorningStatusPacket.boundaries.overnightExecutionAllowed\nmorningStatusPacket.packetSummary.reportGeneratedFromLiveRun\nMorning Status Packet"],
    ["package.json", "{\"scripts\": {\"phase59:demo\": \"node scripts/run-morning-status-packet-v1.mjs\", \"phase59:verify\": \"npm run phase59:demo\"}}"],
  ]);

  for (const [relativePath, content] of files) {
    const fullPath = path.join(rootDir, relativePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, `${content}\n`, "utf8");
  }
}

describe("morning-status-packet-v1", () => {
  it("passes when the morning status packet is declarative and app-bound", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-morning-status-packet-cert-"));
    writeFixture(rootDir);

    const result = inspectMorningStatusPacketV1(createDefaultMorningStatusPacketV1(), { rootDir, writeArtifacts: false });

    expect(result.ok).toBe(true);
    expect(result.morningStatusPacketStatus).toBe("ready");
    expect(result.morningStatusPacketOnly).toBe(true);
    expect(result.morningReviewSurfaceOnly).toBe(true);
    expect(result.declarativeOnly).toBe(true);
    expect(result.overnightWorkExecuted).toBe(false);
    expect(result.reportGeneratedFromLiveRun).toBe(false);
    expect(result.windowsSchedulerConfigured).toBe(false);
    expect(result.scheduledExecutionAllowed).toBe(false);
    expect(result.workerInstalled).toBe(false);
    expect(result.workerConnected).toBe(false);
    expect(result.overnightExecutionAllowed).toBe(false);
    expect(result.commandExecutionAllowed).toBe(false);
    expect(result.shellExecutionAllowed).toBe(false);
    expect(result.runnerConnectivityAllowed).toBe(false);
    expect(result.selfApprovalAllowed).toBe(false);
  });

  it("writes morning status packet reports without mutating source", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-morning-status-packet-report-cert-"));
    writeFixture(rootDir);

    const result = inspectMorningStatusPacketV1(createDefaultMorningStatusPacketV1(), { rootDir, writeArtifacts: true });

    expect(result.ok).toBe(true);
    expect(fs.existsSync(path.join(rootDir, ".sera-morning-status-packet", "phase59-morning-status-packet-status.json"))).toBe(true);
    expect(fs.existsSync(path.join(rootDir, ".sera-morning-status-packet", "phase59-morning-status-packet-status.md"))).toBe(true);
    expect(fs.existsSync(path.join(rootDir, "apps/operator-console/src/morning-status-packet.ts"))).toBe(true);
  });

  it("blocks unsafe morning status packet boundaries", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-morning-status-packet-block-cert-"));
    writeFixture(rootDir);

    const config = createDefaultMorningStatusPacketV1();
    config.summary.overnightWorkExecuted = true;
    config.summary.reportGeneratedFromLiveRun = true;
    config.summary.windowsSchedulerConfigured = true;
    config.summary.workerConnected = true;
    config.summary.executableScheduleCount = 1;
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
    config.boundaries.workerSpawnAllowed = true;
    config.boundaries.taskExecutionAllowed = true;
    config.boundaries.healthPollingAllowed = true;
    config.boundaries.processInspectionAllowed = true;
    config.boundaries.fileMutationAllowed = true;
    config.boundaries.filesystemMutationAllowed = true;
    config.boundaries.recordPersistenceAllowed = true;
    config.boundaries.taskPersistenceAllowed = true;
    config.boundaries.morningPacketPersistenceAllowed = true;
    config.boundaries.finalApprovalAllowed = true;
    config.boundaries.autoRouteAllowed = true;
    config.boundaries.selfApprovalAllowed = true;

    const result = inspectMorningStatusPacketV1(config, { rootDir, writeArtifacts: false });

    expect(result.ok).toBe(false);
    expect(result.blockers).toContain("overnightWorkExecuted must remain false");
    expect(result.blockers).toContain("reportGeneratedFromLiveRun must remain false");
    expect(result.blockers).toContain("executableScheduleCount must remain zero");
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
    expect(result.blockers).toContain("workerSpawnAllowed must remain false");
    expect(result.blockers).toContain("taskExecutionAllowed must remain false");
    expect(result.blockers).toContain("healthPollingAllowed must remain false");
    expect(result.blockers).toContain("processInspectionAllowed must remain false");
    expect(result.blockers).toContain("filesystemMutationAllowed must remain false");
    expect(result.blockers).toContain("morningPacketPersistenceAllowed must remain false");
    expect(result.blockers).toContain("finalApprovalAllowed must remain false");
    expect(result.blockers).toContain("autoRouteAllowed must remain false");
    expect(result.blockers).toContain("selfApprovalAllowed must remain false");
  });

  it("blocks unsafe declared paths", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-morning-status-packet-path-cert-"));
    writeFixture(rootDir);

    const config = createDefaultMorningStatusPacketV1();
    config.declaredPaths.push("../outside.md");

    const result = inspectMorningStatusPacketV1(config, { rootDir, writeArtifacts: false });

    expect(result.ok).toBe(false);
    expect(result.blockers).toContain("Declared path must be safe and relative: ../outside.md");
  });
});
