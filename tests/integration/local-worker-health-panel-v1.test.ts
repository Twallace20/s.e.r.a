import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createDefaultLocalWorkerHealthPanelV1, inspectLocalWorkerHealthPanelV1 } from "../../scripts/lib/local-worker-health-panel-v1.mjs";

function writeFixture(rootDir: string) {
  const files = new Map<string, string>([
    ["docs/phases/PHASE_56_LOCAL_WORKER_HEALTH_PANEL_V1.md", "# Phase 56 Local Worker Health Panel v1"],
    [
      "apps/operator-console/src/local-worker-health-panel.ts",
      [
        "export const localWorkerHealthPanelPacket = {",
        "  phase: { label: 'Phase 56 · Local Worker Health Panel v1' },",
        "  healthPanelStatus: 'health-panel-ready',",
        "  healthSummary: { owner: 'Tyler Wallace', safeState: 'offline-by-design', workerInstalled: false, workerConnected: false, heartbeatStatus: 'not available', healthPollingAllowed: false, liveHeartbeatAllowed: false, executableTaskCount: 0 },",
        "  healthPanelFields: ['owner', 'sourcePhase', 'safeState', 'workerInstalled', 'workerConnected', 'heartbeatStatus', 'healthPollingAllowed', 'executableTaskCount'],",
        "  workerHealthSignals: ['worker installation status', 'worker connection status', 'heartbeat status', 'workspace readiness status', 'command allowlist readiness', 'emergency stop readiness', 'evidence capture readiness', 'owner gate readiness'],",
        "  healthSignals: [",
        "    { id: 'worker-installation-status', label: 'Worker installation' },",
        "    { id: 'worker-connection-status', label: 'Worker connection' },",
        "    { id: 'worker-heartbeat-status', label: 'Worker heartbeat' },",
        "    { id: 'workspace-readiness-status', label: 'Workspace boundary' },",
        "    { id: 'command-allowlist-status', label: 'Command allowlist' },",
        "    { id: 'emergency-stop-status', label: 'Emergency stop' },",
        "  ],",
        "  routing: { suggestedQueue: 'Tyler local worker health readiness review' },",
        "  boundaries: { healthPollingAllowed: false, workerSpawnAllowed: false },",
        "};",
        "export const localWorkerHealthPanelSafetyGates = [",
        "  'Local worker health panel only',",
        "  'Tyler remains the worker health owner',",
        "  'Health panel is declarative only',",
        "  'Health panel does not poll a process',",
        "  'Health panel does not inspect running processes',",
        "  'Health panel does not start a worker',",
        "  'Health panel cannot execute commands',",
        "  'Health panel cannot connect to a runner',",
        "  'Health panel cannot create tasks',",
        "  'Health panel cannot approve execution',",
        "  'Worker installed remains false by design',",
        "  'Worker connected remains false by design',",
        "  'Live heartbeat remains blocked',",
        "  'Future health polling requires owner approval',",
        "  'Future worker connection requires command allowlist',",
        "  'Future worker connection requires workspace boundary guard',",
        "  'Future worker connection requires emergency stop compatibility',",
        "  'Future worker connection requires evidence capture',",
        "  'No backend worker service',",
        "  'No authentication changes',",
        "  'No worker spawn',",
        "  'No task execution',",
        "  'No health polling',",
        "  'No live heartbeat',",
        "  'No process inspection',",
        "  'No command execution',",
        "  'No runner connectivity',",
        "  'No source mutation',",
        "  'No file mutation',",
        "  'No record persistence',",
        "  'No final approval',",
        "  'No auto-routing',",
        "  'No auto-merge',",
        "  'No self-approval',",
        "];",
      ].join("\n"),
    ],
    ["scripts/lib/local-worker-health-panel-v1.mjs", "export const marker = true;"],
    ["scripts/run-local-worker-health-panel-v1.mjs", "console.log('local worker health panel');"],
    ["tests/integration/local-worker-health-panel-v1.test.ts", "// fixture"],
    [
      "apps/operator-console/src/App.tsx",
      [
        "localWorkerHealthPanelPacket.healthSummary.owner",
        "localWorkerHealthPanelPacket.healthSignals.length",
        "localWorkerHealthPanelPacket.routing.suggestedQueue",
        "localWorkerHealthPanelPacket.boundaries.healthPollingAllowed",
        "localWorkerHealthPanelPacket.boundaries.workerSpawnAllowed",
        "Local Worker Health Panel",
      ].join("\n"),
    ],
    [
      "package.json",
      JSON.stringify({ scripts: { "phase56:demo": "node scripts/run-local-worker-health-panel-v1.mjs", "phase56:verify": "npm run phase56:demo" } }),
    ],
  ]);

  for (const [relativePath, content] of files) {
    const fullPath = path.join(rootDir, relativePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, `${content}\n`, "utf8");
  }
}

describe("local-worker-health-panel-v1", () => {
  it("passes when local worker health panel is declarative and app-bound", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-local-worker-health-panel-cert-"));
    writeFixture(rootDir);

    const result = inspectLocalWorkerHealthPanelV1(createDefaultLocalWorkerHealthPanelV1(), { rootDir, writeArtifacts: false });

    expect(result.ok).toBe(true);
    expect(result.localWorkerHealthPanelStatus).toBe("ready");
    expect(result.healthPanelOnly).toBe(true);
    expect(result.declarativeOnly).toBe(true);
    expect(result.workerInstalled).toBe(false);
    expect(result.workerConnected).toBe(false);
    expect(result.healthPollingAllowed).toBe(false);
    expect(result.liveHeartbeatAllowed).toBe(false);
    expect(result.processInspectionAllowed).toBe(false);
    expect(result.workerSpawnAllowed).toBe(false);
    expect(result.taskExecutionAllowed).toBe(false);
    expect(result.selfApprovalAllowed).toBe(false);
  });

  it("writes local worker health panel reports without mutating source", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-local-worker-health-panel-report-cert-"));
    writeFixture(rootDir);

    const result = inspectLocalWorkerHealthPanelV1(createDefaultLocalWorkerHealthPanelV1(), { rootDir, writeArtifacts: true });

    expect(result.ok).toBe(true);
    expect(fs.existsSync(path.join(rootDir, ".sera-local-worker-health-panel", "phase56-local-worker-health-panel-status.json"))).toBe(true);
    expect(fs.existsSync(path.join(rootDir, ".sera-local-worker-health-panel", "phase56-local-worker-health-panel-status.md"))).toBe(true);
    expect(fs.existsSync(path.join(rootDir, "apps/operator-console/src/local-worker-health-panel.ts"))).toBe(true);
  });

  it("blocks unsafe local worker health panel boundaries", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-local-worker-health-panel-block-cert-"));
    writeFixture(rootDir);

    const config = createDefaultLocalWorkerHealthPanelV1();
    config.boundaries.commandExecutionAllowed = true;
    config.boundaries.runnerConnectivityAllowed = true;
    config.boundaries.workerSpawnAllowed = true;
    config.boundaries.taskExecutionAllowed = true;
    config.boundaries.healthPollingAllowed = true;
    config.boundaries.liveHeartbeatAllowed = true;
    config.boundaries.processInspectionAllowed = true;
    config.boundaries.fileMutationAllowed = true;
    config.boundaries.recordPersistenceAllowed = true;
    config.boundaries.finalApprovalAllowed = true;
    config.boundaries.autoApprovalAllowed = true;
    config.boundaries.autoRouteAllowed = true;
    config.boundaries.selfApprovalAllowed = true;

    const result = inspectLocalWorkerHealthPanelV1(config, { rootDir, writeArtifacts: false });

    expect(result.ok).toBe(false);
    expect(result.blockers).toContain("commandExecutionAllowed must remain false");
    expect(result.blockers).toContain("runnerConnectivityAllowed must remain false");
    expect(result.blockers).toContain("workerSpawnAllowed must remain false");
    expect(result.blockers).toContain("taskExecutionAllowed must remain false");
    expect(result.blockers).toContain("healthPollingAllowed must remain false");
    expect(result.blockers).toContain("liveHeartbeatAllowed must remain false");
    expect(result.blockers).toContain("processInspectionAllowed must remain false");
    expect(result.blockers).toContain("fileMutationAllowed must remain false");
    expect(result.blockers).toContain("recordPersistenceAllowed must remain false");
    expect(result.blockers).toContain("finalApprovalAllowed must remain false");
    expect(result.blockers).toContain("autoApprovalAllowed must remain false");
    expect(result.blockers).toContain("autoRouteAllowed must remain false");
    expect(result.blockers).toContain("selfApprovalAllowed must remain false");
  });

  it("blocks unsafe declared paths", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-local-worker-health-panel-path-cert-"));
    writeFixture(rootDir);

    const config = createDefaultLocalWorkerHealthPanelV1();
    config.declaredPaths.push("../outside.md");

    const result = inspectLocalWorkerHealthPanelV1(config, { rootDir, writeArtifacts: false });

    expect(result.ok).toBe(false);
    expect(result.blockers).toContain("Declared path must be safe and relative: ../outside.md");
  });
});
