import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

async function loadGenerator() {
  return await import("../../scripts/lib/phase-packet-generator-v1.mjs");
}

function tempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "sera-phase-packet-generator-test-"));
}

describe("Phase Packet Generator v1", () => {
  it("initializes local packet generator runtime artifacts", async () => {
    const root = tempRoot();
    const { PhasePacketGeneratorV1 } = await loadGenerator();
    const generator = new PhasePacketGeneratorV1({ rootDir: root });
    const init = generator.initialize();

    expect(init.ok).toBe(true);
    expect(fs.existsSync(init.eventPath)).toBe(true);
    expect(fs.existsSync(init.packetDir)).toBe(true);
    expect(fs.existsSync(init.reportDir)).toBe(true);
  });

  it("creates a default phase packet blueprint from planner and artifact-packet context", async () => {
    const root = tempRoot();
    const { PhasePacketGeneratorV1 } = await loadGenerator();
    const generator = new PhasePacketGeneratorV1({ rootDir: root });
    generator.initialize();
    const packet = generator.createDefaultPacket();

    expect(packet.packetVersion).toBe(1);
    expect(packet.phaseId).toBe("phase-32-phase-packet-generator-v1");
    expect(packet.objective.sourcePhaseInputs).toContain("phase-31-planner-task-decomposer-v2");
    expect(packet.declaredFiles.length).toBeGreaterThanOrEqual(4);
    expect(fs.existsSync(generator.defaultPacketPath)).toBe(true);
  });

  it("validates declared files, commands, evidence, rollback notes, and approval gates", async () => {
    const root = tempRoot();
    const { PhasePacketGeneratorV1 } = await loadGenerator();
    const generator = new PhasePacketGeneratorV1({ rootDir: root });
    generator.initialize();
    const packet = generator.createDefaultPacket();
    const validation = generator.validatePacket(packet);

    expect(validation.ok).toBe(true);
    expect(validation.failedCount).toBe(0);
    expect(packet.validationCommands).toContain("npm run phase32:verify");
    expect(packet.evidenceRequirements.length).toBeGreaterThanOrEqual(10);
    expect(packet.rollbackNotes.length).toBeGreaterThanOrEqual(3);
    expect(packet.ownerApprovalGates.length).toBeGreaterThanOrEqual(3);
  });

  it("summarizes packet readiness without granting activation or execution authority", async () => {
    const root = tempRoot();
    const { PhasePacketGeneratorV1 } = await loadGenerator();
    const generator = new PhasePacketGeneratorV1({ rootDir: root });
    generator.initialize();
    const packet = generator.createDefaultPacket();
    const validation = generator.validatePacket(packet);
    const summary = generator.summarizePacket(packet, validation);

    expect(summary.ok).toBe(true);
    expect(summary.declaredFileCount).toBeGreaterThanOrEqual(4);
    expect(summary.packetActivationAllowed).toBe(false);
    expect(summary.executesPacket).toBe(false);
    expect(summary.selfApprovesPacket).toBe(false);
    expect(summary.ownerApprovalRequiredForPacketActivation).toBe(true);
  });

  it("writes packet evidence reports without paid providers, cloud, secrets, branches, patches, packet execution, or source mutation", async () => {
    const root = tempRoot();
    const { PhasePacketGeneratorV1 } = await loadGenerator();
    const generator = new PhasePacketGeneratorV1({ rootDir: root });
    const summary = generator.writeSummaryArtifacts();

    expect(summary.ok).toBe(true);
    expect(summary.paidProviderRequired).toBe(false);
    expect(summary.cloudRequired).toBe(false);
    expect(summary.requiresSecrets).toBe(false);
    expect(summary.mutatesSource).toBe(false);
    expect(summary.executesArbitraryCode).toBe(false);
    expect(summary.performsNetworkRefresh).toBe(false);
    expect(summary.createsBranches).toBe(false);
    expect(summary.appliesPatches).toBe(false);
    expect(summary.executesPacket).toBe(false);
    expect(fs.existsSync(summary.jsonPath)).toBe(true);
    expect(fs.existsSync(summary.markdownPath)).toBe(true);
    expect(fs.existsSync(summary.historyPath)).toBe(true);
  });
});
