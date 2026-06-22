import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createDefaultLocalDesktopWorkerBlueprintV1, inspectLocalDesktopWorkerBlueprintV1 } from "../../scripts/lib/local-desktop-worker-blueprint-v1.mjs";

function writeFixture(rootDir: string) {
  const files = new Map<string, string>([
    ["docs/phases/PHASE_55_LOCAL_DESKTOP_WORKER_BLUEPRINT_V1.md", "# Phase 55 Local Desktop Worker Blueprint v1"],
    [
      "apps/operator-console/src/local-desktop-worker-blueprint.ts",
      [
        "export const localDesktopWorkerBlueprintPacket = {",
        "  phase: { label: 'Phase 55 · Local Desktop Worker Blueprint v1' },",
        "  workerBlueprintStatus: 'blueprint-ready',",
        "  workerSummary: { owner: 'Tyler Wallace' },",
        "  workerContract: { workerId: 'sera-local-desktop-worker-blueprint', owner: 'Tyler Wallace', runtimeMode: 'blueprint_only_not_installed', startupMethod: 'future manual start', allowedInputs: [], forbiddenAuthorities: [], healthSignals: [], evidenceRequirements: [] },",
        "  workerRoles: [",
        "    { id: 'worker-contract-host', label: 'Worker contract host' },",
        "    { id: 'workspace-boundary-guardian', label: 'Workspace boundary guardian' },",
        "    { id: 'validation-runner-blueprint', label: 'Validation runner blueprint' },",
        "    { id: 'evidence-collector-blueprint', label: 'Evidence collector blueprint' },",
        "    { id: 'health-reporter-blueprint', label: 'Health reporter blueprint' },",
        "  ],",
        "  workerContractFields: ['workerId', 'owner', 'runtimeMode', 'startupMethod', 'allowedInputs', 'forbiddenAuthorities', 'healthSignals', 'evidenceRequirements'],",
        "  workerCapabilitySignals: ['worker process boundary', 'command allowlist boundary', 'workspace root boundary', 'task intake boundary', 'validation command boundary', 'evidence output boundary', 'owner decision dependency', 'emergency stop dependency'],",
        "  routing: { suggestedQueue: 'Tyler local desktop worker readiness review' },",
        "  boundaries: { commandExecutionAllowed: false, workerSpawnAllowed: false },",
        "};",
        "export const localDesktopWorkerBlueprintSafetyGates = [",
        "  'Local desktop worker blueprint only',",
        "  'Tyler remains the worker contract owner',",
        "  'Blueprint does not install a worker',",
        "  'Blueprint does not start a worker',",
        "  'Blueprint cannot execute commands',",
        "  'Blueprint cannot connect to a runner',",
        "  'Future worker requires owner decision record',",
        "  'Future worker requires command allowlist',",
        "  'Future worker requires workspace boundary guard',",
        "  'Future worker requires evidence capture',",
        "  'Future worker requires validation before completion',",
        "  'Future worker requires emergency stop compatibility',",
        "  'Health status is declarative only',",
        "  'No backend worker service',",
        "  'No authentication changes',",
        "  'No worker spawn',",
        "  'No task execution',",
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
    ["scripts/lib/local-desktop-worker-blueprint-v1.mjs", "export const marker = true;"],
    ["scripts/run-local-desktop-worker-blueprint-v1.mjs", "console.log('local desktop worker blueprint');"],
    ["tests/integration/local-desktop-worker-blueprint-v1.test.ts", "// fixture"],
    [
      "apps/operator-console/src/App.tsx",
      [
        "localDesktopWorkerBlueprintPacket.workerSummary.owner",
        "localDesktopWorkerBlueprintPacket.workerRoles.length",
        "localDesktopWorkerBlueprintPacket.routing.suggestedQueue",
        "localDesktopWorkerBlueprintPacket.boundaries.commandExecutionAllowed",
        "localDesktopWorkerBlueprintPacket.boundaries.workerSpawnAllowed",
        "Local Desktop Worker Blueprint",
      ].join("\n"),
    ],
    [
      "package.json",
      JSON.stringify({ scripts: { "phase55:demo": "node scripts/run-local-desktop-worker-blueprint-v1.mjs", "phase55:verify": "npm run phase55:demo" } }),
    ],
  ]);

  for (const [relativePath, content] of files) {
    const fullPath = path.join(rootDir, relativePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, `${content}\n`, "utf8");
  }
}

describe("local-desktop-worker-blueprint-v1", () => {
  it("passes when local desktop worker blueprint is contract-only and app-bound", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-local-worker-blueprint-cert-"));
    writeFixture(rootDir);

    const result = inspectLocalDesktopWorkerBlueprintV1(createDefaultLocalDesktopWorkerBlueprintV1(), { rootDir, writeArtifacts: false });

    expect(result.ok).toBe(true);
    expect(result.localDesktopWorkerBlueprintStatus).toBe("ready");
    expect(result.blueprintOnly).toBe(true);
    expect(result.workerContractOnly).toBe(true);
    expect(result.commandExecutionAllowed).toBe(false);
    expect(result.workerSpawnAllowed).toBe(false);
    expect(result.taskExecutionAllowed).toBe(false);
    expect(result.selfApprovalAllowed).toBe(false);
  });

  it("writes local desktop worker blueprint reports without mutating source", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-local-worker-blueprint-report-cert-"));
    writeFixture(rootDir);

    const result = inspectLocalDesktopWorkerBlueprintV1(createDefaultLocalDesktopWorkerBlueprintV1(), { rootDir, writeArtifacts: true });

    expect(result.ok).toBe(true);
    expect(fs.existsSync(path.join(rootDir, ".sera-local-desktop-worker-blueprint", "phase55-local-desktop-worker-blueprint-status.json"))).toBe(true);
    expect(fs.existsSync(path.join(rootDir, ".sera-local-desktop-worker-blueprint", "phase55-local-desktop-worker-blueprint-status.md"))).toBe(true);
    expect(fs.existsSync(path.join(rootDir, "apps/operator-console/src/local-desktop-worker-blueprint.ts"))).toBe(true);
  });

  it("blocks unsafe local desktop worker blueprint boundaries", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-local-worker-blueprint-block-cert-"));
    writeFixture(rootDir);

    const config = createDefaultLocalDesktopWorkerBlueprintV1();
    config.boundaries.commandExecutionAllowed = true;
    config.boundaries.runnerConnectivityAllowed = true;
    config.boundaries.workerSpawnAllowed = true;
    config.boundaries.taskExecutionAllowed = true;
    config.boundaries.fileMutationAllowed = true;
    config.boundaries.recordPersistenceAllowed = true;
    config.boundaries.finalApprovalAllowed = true;
    config.boundaries.autoApprovalAllowed = true;
    config.boundaries.autoRouteAllowed = true;
    config.boundaries.selfApprovalAllowed = true;

    const result = inspectLocalDesktopWorkerBlueprintV1(config, { rootDir, writeArtifacts: false });

    expect(result.ok).toBe(false);
    expect(result.blockers).toContain("commandExecutionAllowed must remain false");
    expect(result.blockers).toContain("runnerConnectivityAllowed must remain false");
    expect(result.blockers).toContain("workerSpawnAllowed must remain false");
    expect(result.blockers).toContain("taskExecutionAllowed must remain false");
    expect(result.blockers).toContain("fileMutationAllowed must remain false");
    expect(result.blockers).toContain("recordPersistenceAllowed must remain false");
    expect(result.blockers).toContain("finalApprovalAllowed must remain false");
    expect(result.blockers).toContain("autoApprovalAllowed must remain false");
    expect(result.blockers).toContain("autoRouteAllowed must remain false");
    expect(result.blockers).toContain("selfApprovalAllowed must remain false");
  });

  it("blocks unsafe declared paths", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-local-worker-blueprint-path-cert-"));
    writeFixture(rootDir);

    const config = createDefaultLocalDesktopWorkerBlueprintV1();
    config.declaredPaths.push("../outside.md");

    const result = inspectLocalDesktopWorkerBlueprintV1(config, { rootDir, writeArtifacts: false });

    expect(result.ok).toBe(false);
    expect(result.blockers).toContain("Declared path must be safe and relative: ../outside.md");
  });
});
