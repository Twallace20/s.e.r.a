import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

async function loadPacket() {
  return await import("../../scripts/lib/phase-artifact-packet-v1.mjs");
}

function tempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "sera-phase-packet-test-"));
}

describe("Phase Artifact Packet v1", () => {
  it("initializes local packet runtime artifacts", async () => {
    const root = tempRoot();
    const { PhaseArtifactPacket } = await loadPacket();
    const packet = new PhaseArtifactPacket({ rootDir: root });
    const init = packet.initialize();

    expect(init.ok).toBe(true);
    expect(fs.existsSync(init.eventPath)).toBe(true);
    expect(fs.existsSync(init.reportDir)).toBe(true);
    expect(fs.existsSync(init.packetDir)).toBe(true);
  });

  it("creates a packet manifest with required handoff fields", async () => {
    const root = tempRoot();
    const { PhaseArtifactPacket } = await loadPacket();
    const packet = new PhaseArtifactPacket({ rootDir: root });
    packet.initialize();
    const manifest = packet.createManifest();

    expect(manifest.packetVersion).toBe(1);
    expect(manifest.phaseId).toBe("25C");
    expect(manifest.branchName).toBe("phase-25c-phase-artifact-packet-v1");
    expect(manifest.files.length).toBeGreaterThan(0);
    expect(manifest.validationCommands).toContain("npm run verify");
    expect(manifest.ownerReviewRequired).toBe(true);
    expect(fs.existsSync(packet.manifestPath)).toBe(true);
  });

  it("validates a complete free-core-safe packet", async () => {
    const root = tempRoot();
    const { PhaseArtifactPacket } = await loadPacket();
    const packet = new PhaseArtifactPacket({ rootDir: root });
    packet.initialize();
    const manifest = packet.createManifest();
    const validation = packet.validateManifest(manifest);

    expect(validation.ok).toBe(true);
    expect(validation.blockers).toHaveLength(0);
    expect(validation.paidProviderRequired).toBe(false);
    expect(validation.cloudRequired).toBe(false);
    expect(validation.requiresSecrets).toBe(false);
  });

  it("blocks packet manifests that allow unsafe unattended merge", async () => {
    const root = tempRoot();
    const { PhaseArtifactPacket } = await loadPacket();
    const packet = new PhaseArtifactPacket({ rootDir: root });
    packet.initialize();
    const manifest = packet.createManifest({ boundaries: { ownerApprovalRequiredForMerge: false, noAutonomousMerge: false } });
    const validation = packet.validateManifest(manifest);

    expect(validation.ok).toBe(false);
    expect(validation.blockers).toContain("owner_merge_approval");
    expect(validation.blockers).toContain("no_autonomous_merge");
  });

  it("writes packet evidence reports without paid providers, cloud, or secrets", async () => {
    const root = tempRoot();
    const { PhaseArtifactPacket } = await loadPacket();
    const packet = new PhaseArtifactPacket({ rootDir: root });
    packet.initialize();
    const summary = packet.writeSummaryArtifacts();

    expect(summary.ok).toBe(true);
    expect(summary.localOnly).toBe(true);
    expect(summary.paidProviderRequired).toBe(false);
    expect(summary.cloudRequired).toBe(false);
    expect(summary.requiresSecrets).toBe(false);
    expect(fs.existsSync(summary.jsonPath)).toBe(true);
    expect(fs.existsSync(summary.markdownPath)).toBe(true);
    expect(fs.existsSync(summary.historyPath)).toBe(true);
  });
});
