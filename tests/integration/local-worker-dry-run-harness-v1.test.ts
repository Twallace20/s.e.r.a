import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createDefaultLocalWorkerDryRunHarnessV1, inspectLocalWorkerDryRunHarnessV1 } from "../../scripts/lib/local-worker-dry-run-harness-v1.mjs";

function writeFixture(rootDir: string) {
  const files = new Map<string, string>([
    ["docs/phases/PHASE_57_LOCAL_WORKER_DRY_RUN_HARNESS_V1.md", "# Phase 57 Local Worker Dry-Run Harness v1"],
    [
      "apps/operator-console/src/local-worker-dry-run-harness.ts",
      [
        "export const localWorkerDryRunHarnessPacket = {",
        "  phase: { label: 'Phase 57 · Local Worker Dry-Run Harness v1' },",
        "  dryRunHarnessStatus: 'dry-run-ready',",
        "  dryRunSummary: { owner: 'Tyler Wallace', safeState: 'simulated-only', workerInstalled: false, workerConnected: false, dryRunOnly: true, simulatedTaskCount: 1, executableTaskCount: 0, evidenceBundleRequired: true },",
        "  dryRunFields: ['owner', 'sourcePhase', 'safeState', 'workerInstalled', 'workerConnected', 'dryRunOnly', 'simulatedTaskCount', 'executableTaskCount'],",
        "  workerDryRunSignals: ['dry-run input review', 'worker boundary simulation', 'preflight simulation', 'task handshake simulation', 'evidence bundle preview', 'command allowlist check preview', 'emergency stop check preview', 'owner gate check preview'],",
        "  dryRunSteps: [",
        "    { id: 'accept-plan-preview', label: 'Accept plan preview' },",
        "    { id: 'validate-worker-boundaries', label: 'Validate worker boundaries' },",
        "    { id: 'simulate-worker-preflight', label: 'Simulate worker preflight' },",
        "    { id: 'simulate-task-handshake', label: 'Simulate task handshake' },",
        "    { id: 'generate-dry-run-evidence', label: 'Generate dry-run evidence' },",
        "  ],",
        "  evidenceRequirements: ['dry-run input summary', 'boundary check summary', 'simulated preflight result', 'simulated task handshake result', 'blocked authority summary', 'owner review reminder'],",
        "  routing: { suggestedQueue: 'Tyler local worker dry-run review' },",
        "  boundaries: { taskExecutionAllowed: false, commandExecutionAllowed: false },",
        "};",
        "export const localWorkerDryRunHarnessSafetyGates = [",
        "  'Local worker dry-run harness only',",
        "  'Tyler remains the dry-run owner',",
        "  'Dry run is simulated only',",
        "  'Dry run produces evidence only',",
        "  'Dry run does not install a worker',",
        "  'Dry run does not connect to a worker',",
        "  'Dry run does not start a worker',",
        "  'Dry run does not poll worker health',",
        "  'Dry run does not inspect running processes',",
        "  'Dry run does not execute commands',",
        "  'Dry run does not execute shell commands',",
        "  'Dry run does not execute tasks',",
        "  'Dry run does not create completed task state',",
        "  'Dry run does not persist task records',",
        "  'Dry run does not persist owner records',",
        "  'Dry run does not mutate files',",
        "  'Dry run does not mutate source',",
        "  'Dry run does not connect to runner infrastructure',",
        "  'Dry run does not approve execution',",
        "  'Dry run does not route work',",
        "  'Dry run does not process work automatically',",
        "  'Dry run does not merge branches',",
        "  'Dry run cannot self-approve',",
        "  'Worker installed remains false by design',",
        "  'Worker connected remains false by design',",
        "  'Executable task count remains zero',",
        "  'Future execution requires owner approval',",
        "  'Future execution requires command allowlist',",
        "  'Future execution requires workspace boundary guard',",
        "  'Future execution requires emergency stop compatibility',",
        "  'Future execution requires evidence capture',",
        "  'Future execution requires rollback policy',",
        "  'Future execution requires validation gate',",
        "  'Future execution requires branch readiness inspection',",
        "  'No backend worker service',",
        "  'No authentication changes',",
        "  'No worker spawn',",
        "  'No task execution',",
        "  'No command execution',",
        "  'No runner connectivity',",
        "  'No filesystem mutation',",
        "  'No self-approval',",
        "];",
      ].join("\n"),
    ],
    ["scripts/lib/local-worker-dry-run-harness-v1.mjs", "export const marker = true;"],
    ["scripts/run-local-worker-dry-run-harness-v1.mjs", "console.log('local worker dry-run harness');"],
    ["tests/integration/local-worker-dry-run-harness-v1.test.ts", "// fixture"],
    [
      "apps/operator-console/src/App.tsx",
      [
        "localWorkerDryRunHarnessPacket.dryRunSummary.owner",
        "localWorkerDryRunHarnessPacket.dryRunSteps.length",
        "localWorkerDryRunHarnessPacket.evidenceRequirements.length",
        "localWorkerDryRunHarnessPacket.boundaries.taskExecutionAllowed",
        "localWorkerDryRunHarnessPacket.boundaries.commandExecutionAllowed",
        "Local Worker Dry-Run Harness",
      ].join("\n"),
    ],
    [
      "package.json",
      JSON.stringify({ scripts: { "phase57:demo": "node scripts/run-local-worker-dry-run-harness-v1.mjs", "phase57:verify": "npm run phase57:demo" } }),
    ],
  ]);

  for (const [relativePath, content] of files) {
    const fullPath = path.join(rootDir, relativePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, `${content}\n`, "utf8");
  }
}

describe("local-worker-dry-run-harness-v1", () => {
  it("passes when local worker dry-run harness is simulated and app-bound", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-local-worker-dry-run-harness-cert-"));
    writeFixture(rootDir);

    const result = inspectLocalWorkerDryRunHarnessV1(createDefaultLocalWorkerDryRunHarnessV1(), { rootDir, writeArtifacts: false });

    expect(result.ok).toBe(true);
    expect(result.localWorkerDryRunHarnessStatus).toBe("ready");
    expect(result.dryRunHarnessOnly).toBe(true);
    expect(result.simulatedOnly).toBe(true);
    expect(result.evidenceOnly).toBe(true);
    expect(result.workerInstalled).toBe(false);
    expect(result.workerConnected).toBe(false);
    expect(result.dryRunOnly).toBe(true);
    expect(result.taskExecutionAllowed).toBe(false);
    expect(result.commandExecutionAllowed).toBe(false);
    expect(result.shellExecutionAllowed).toBe(false);
    expect(result.runnerConnectivityAllowed).toBe(false);
    expect(result.selfApprovalAllowed).toBe(false);
  });

  it("writes local worker dry-run reports without mutating source", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-local-worker-dry-run-harness-report-cert-"));
    writeFixture(rootDir);

    const result = inspectLocalWorkerDryRunHarnessV1(createDefaultLocalWorkerDryRunHarnessV1(), { rootDir, writeArtifacts: true });

    expect(result.ok).toBe(true);
    expect(fs.existsSync(path.join(rootDir, ".sera-local-worker-dry-run-harness", "phase57-local-worker-dry-run-harness-status.json"))).toBe(true);
    expect(fs.existsSync(path.join(rootDir, ".sera-local-worker-dry-run-harness", "phase57-local-worker-dry-run-harness-status.md"))).toBe(true);
    expect(fs.existsSync(path.join(rootDir, "apps/operator-console/src/local-worker-dry-run-harness.ts"))).toBe(true);
  });

  it("blocks unsafe local worker dry-run boundaries", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-local-worker-dry-run-harness-block-cert-"));
    writeFixture(rootDir);

    const config = createDefaultLocalWorkerDryRunHarnessV1();
    config.boundaries.commandExecutionAllowed = true;
    config.boundaries.shellExecutionAllowed = true;
    config.boundaries.runnerConnectivityAllowed = true;
    config.boundaries.workerSpawnAllowed = true;
    config.boundaries.taskExecutionAllowed = true;
    config.boundaries.healthPollingAllowed = true;
    config.boundaries.liveHeartbeatAllowed = true;
    config.boundaries.processInspectionAllowed = true;
    config.boundaries.fileMutationAllowed = true;
    config.boundaries.filesystemMutationAllowed = true;
    config.boundaries.recordPersistenceAllowed = true;
    config.boundaries.taskPersistenceAllowed = true;
    config.boundaries.finalApprovalAllowed = true;
    config.boundaries.autoApprovalAllowed = true;
    config.boundaries.autoRouteAllowed = true;
    config.boundaries.selfApprovalAllowed = true;

    const result = inspectLocalWorkerDryRunHarnessV1(config, { rootDir, writeArtifacts: false });

    expect(result.ok).toBe(false);
    expect(result.blockers).toContain("commandExecutionAllowed must remain false");
    expect(result.blockers).toContain("shellExecutionAllowed must remain false");
    expect(result.blockers).toContain("runnerConnectivityAllowed must remain false");
    expect(result.blockers).toContain("workerSpawnAllowed must remain false");
    expect(result.blockers).toContain("taskExecutionAllowed must remain false");
    expect(result.blockers).toContain("healthPollingAllowed must remain false");
    expect(result.blockers).toContain("liveHeartbeatAllowed must remain false");
    expect(result.blockers).toContain("processInspectionAllowed must remain false");
    expect(result.blockers).toContain("fileMutationAllowed must remain false");
    expect(result.blockers).toContain("filesystemMutationAllowed must remain false");
    expect(result.blockers).toContain("recordPersistenceAllowed must remain false");
    expect(result.blockers).toContain("taskPersistenceAllowed must remain false");
    expect(result.blockers).toContain("finalApprovalAllowed must remain false");
    expect(result.blockers).toContain("autoApprovalAllowed must remain false");
    expect(result.blockers).toContain("autoRouteAllowed must remain false");
    expect(result.blockers).toContain("selfApprovalAllowed must remain false");
  });

  it("blocks unsafe declared paths", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-local-worker-dry-run-harness-path-cert-"));
    writeFixture(rootDir);

    const config = createDefaultLocalWorkerDryRunHarnessV1();
    config.declaredPaths.push("../outside.md");

    const result = inspectLocalWorkerDryRunHarnessV1(config, { rootDir, writeArtifacts: false });

    expect(result.ok).toBe(false);
    expect(result.blockers).toContain("Declared path must be safe and relative: ../outside.md");
  });
});
