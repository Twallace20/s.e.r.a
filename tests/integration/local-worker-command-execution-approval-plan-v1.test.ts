import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createDefaultLocalWorkerCommandExecutionApprovalPlanV1, inspectLocalWorkerCommandExecutionApprovalPlanV1 } from "../../scripts/lib/local-worker-command-execution-approval-plan-v1.mjs";

function writeFile(rootDir: string, relativePath: string, content: string) {
  const fullPath = path.join(rootDir, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, "utf8");
}

function writeFixture(rootDir: string) {
  const app = `
import { localWorkerCommandExecutionApprovalPlan, localWorkerCommandExecutionApprovalPlanSafetyGates } from "./local-worker-command-execution-approval-plan";

const gates = [
  ...localWorkerCommandExecutionApprovalPlanSafetyGates,
];

export function App() {
  return <section>
    <h2>Local Worker Command Execution Approval Plan</h2>
    <span>{localWorkerCommandExecutionApprovalPlan.commandExecutionApprovalPlanSummary.owner}</span>
    <span>{localWorkerCommandExecutionApprovalPlan.commandExecutionApprovalPlanRequirements.length}</span>
    <span>{localWorkerCommandExecutionApprovalPlan.evidenceRequirements.length}</span>
    <span>{localWorkerCommandExecutionApprovalPlan.boundaries.commandExecutionAllowed ? "allowed" : "blocked"}</span>
    <span>{localWorkerCommandExecutionApprovalPlan.commandExecutionApprovalPlanSummary.commandExecutionApprovalPlanLocked ? "yes" : "no"}</span>
  </section>;
}
`;
  const packageJson = JSON.stringify({ scripts: { "phase74:demo": "node scripts/run-local-worker-command-execution-approval-plan-v1.mjs", "phase74:verify": "npm run free-core:verify && npm run knowledge:verify && npm run phase73:demo && npm run phase74:demo" } }, null, 2);
  writeFile(rootDir, "apps/operator-console/src/App.tsx", app);
  writeFile(rootDir, "package.json", packageJson);
  for (const file of [
    "docs/phases/PHASE_74_LOCAL_WORKER_COMMAND_EXECUTION_APPROVAL_PLAN_V1.md",
    "scripts/lib/local-worker-command-execution-approval-plan-v1.mjs",
    "scripts/run-local-worker-command-execution-approval-plan-v1.mjs",
    "tests/integration/local-worker-command-execution-approval-plan-v1.test.ts",
    "apps/operator-console/src/local-worker-command-execution-approval-plan.ts",
  ]) writeFile(rootDir, file, "// fixture");
}

describe("local-worker-command-execution-approval-plan-v1", () => {
  it("passes when the local worker command execution approval plan is declarative and app-bound", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-local-worker-command-execution-approval-plan-cert-"));
    writeFixture(rootDir);
    const result = inspectLocalWorkerCommandExecutionApprovalPlanV1(createDefaultLocalWorkerCommandExecutionApprovalPlanV1(), { rootDir, writeArtifacts: false });
    expect(result.ok).toBe(true);
    expect(result.localWorkerCommandExecutionApprovalPlanStatus).toBe("command-execution-approval-plan-ready");
    expect(result.commandExecutionApprovalPlanOnly).toBe(true);
    expect(result.ownerReviewOnly).toBe(true);
    expect(result.declarativeOnly).toBe(true);
    expect(result.declaredFileCount).toBe(5);
    expect(result.commandExecutionApprovalPlanRequirementCount).toBe(6);
    expect(result.commandExecutionApprovalPlanFieldCount).toBe(8);
    expect(result.commandExecutionApprovalPlanEvidenceCount).toBe(6);
    expect(result.commandExecutionApprovalPlanSignalCount).toBe(8);
    expect(result.safetyGateCount).toBe(420);
    expect(result.appBindingCount).toBe(5);
    expect(result.phase73SchedulerApprovalPlanReady).toBe(true);
    expect(result.phase72HealthPollingApprovalPlanReady).toBe(true);
    expect(result.ownerApprovalRequired).toBe(true);
    expect(result.explicitCommandExecutionApprovalPlanRequired).toBe(true);
    expect(result.ownerCommandExecutionApprovalRequired).toBe(true);
    expect(result.commandExecutionBoundaryRequired).toBe(true);
    expect(result.commandExecutionActionInventoryRequired).toBe(true);
    expect(result.commandExecutionRemainsBlockedRequired).toBe(true);
    expect(result.localWorkerReadyForInstall).toBe(false);
    expect(result.commandExecutionApprovalPlanLocked).toBe(false);
    expect(result.workerInstallApproved).toBe(false);
    expect(result.workerInstalled).toBe(false);
    expect(result.commandExecutionApprovalPlanSigningAllowed).toBe(false);
    expect(result.manualInstallExecutionAllowed).toBe(false);
    expect(result.installerExecutionAllowed).toBe(false);
    expect(result.dependencyDownloadAllowed).toBe(false);
    expect(result.packageInstallAllowed).toBe(false);
    expect(result.workerInstallAllowed).toBe(false);
    expect(result.commandExecutionAllowed).toBe(false);
    expect(result.shellExecutionAllowed).toBe(false);
    expect(result.runnerConnectivityAllowed).toBe(false);
    expect(result.selfApprovalAllowed).toBe(false);
  });

  it("writes local worker command execution approval plan reports without mutating source", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-local-worker-command-execution-approval-plan-report-cert-"));
    writeFixture(rootDir);
    const result = inspectLocalWorkerCommandExecutionApprovalPlanV1(createDefaultLocalWorkerCommandExecutionApprovalPlanV1(), { rootDir, writeArtifacts: true });
    expect(result.ok).toBe(true);
    expect(fs.existsSync(path.join(rootDir, ".sera-local-worker-command-execution-approval-plan", "phase74-local-worker-command-execution-approval-plan-status.json"))).toBe(true);
    expect(fs.existsSync(path.join(rootDir, ".sera-local-worker-command-execution-approval-plan", "phase74-local-worker-command-execution-approval-plan-status.md"))).toBe(true);
    expect(fs.existsSync(path.join(rootDir, "apps/operator-console/src/local-worker-command-execution-approval-plan.ts"))).toBe(true);
  });

  it("blocks unsafe local worker command execution approval plan boundaries", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-local-worker-command-execution-approval-plan-block-cert-"));
    writeFixture(rootDir);
    const config = createDefaultLocalWorkerCommandExecutionApprovalPlanV1();
    config.summary.localWorkerReadyForInstall = true;
    config.summary.commandExecutionApprovalPlanLocked = true;
    config.summary.installEvidencePacketLocked = true;
    config.summary.workerInstallApproved = true;
    config.summary.workerInstalled = true;
    config.summary.workerConnected = true;
    config.summary.scheduledExecutionAllowed = true;
    config.summary.executableScheduleCount = 1;
    config.boundaries.commandExecutionApprovalPlanSigningAllowed = true;
    config.boundaries.manualInstallExecutionAllowed = true;
    config.boundaries.installerExecutionAllowed = true;
    config.boundaries.dependencyDownloadAllowed = true;
    config.boundaries.packageInstallAllowed = true;
    config.boundaries.packageManagerExecutionAllowed = true;
    config.boundaries.commandExecutionAllowed = true;
    config.boundaries.shellExecutionAllowed = true;
    config.boundaries.runnerConnectivityAllowed = true;
    config.boundaries.workerInstallAllowed = true;
    config.boundaries.workerConnectionAllowed = true;
    config.boundaries.workerSpawnAllowed = true;
    config.boundaries.taskExecutionAllowed = true;
    config.boundaries.workspaceProbeAllowed = true;
    config.boundaries.filesystemScanAllowed = true;
    config.boundaries.filesystemMutationAllowed = true;
    config.boundaries.pathCreationAllowed = true;
    config.boundaries.pathDeletionAllowed = true;
    config.boundaries.commandExecutionApprovalPlanPersistenceAllowed = true;
    config.boundaries.finalApprovalAllowed = true;
    config.boundaries.autoRouteAllowed = true;
    config.boundaries.selfApprovalAllowed = true;
    const result = inspectLocalWorkerCommandExecutionApprovalPlanV1(config, { rootDir, writeArtifacts: false });
    expect(result.ok).toBe(false);
    expect(result.blockers).toContain("localWorkerReadyForInstall must remain false");
    expect(result.blockers).toContain("commandExecutionApprovalPlanLocked must remain false");
    expect(result.blockers).toContain("workerInstallApproved must remain false");
    expect(result.blockers).toContain("workerInstalled must remain false");
    expect(result.blockers).toContain("scheduledExecutionAllowed must remain false");
    expect(result.blockers).toContain("executableScheduleCount must remain zero");
    expect(result.blockers).toContain("commandExecutionApprovalPlanSigningAllowed must remain false");
    expect(result.blockers).toContain("manualInstallExecutionAllowed must remain false");
    expect(result.blockers).toContain("installerExecutionAllowed must remain false");
    expect(result.blockers).toContain("dependencyDownloadAllowed must remain false");
    expect(result.blockers).toContain("packageInstallAllowed must remain false");
    expect(result.blockers).toContain("packageManagerExecutionAllowed must remain false");
    expect(result.blockers).toContain("commandExecutionAllowed must remain false");
    expect(result.blockers).toContain("shellExecutionAllowed must remain false");
    expect(result.blockers).toContain("runnerConnectivityAllowed must remain false");
    expect(result.blockers).toContain("workerInstallAllowed must remain false");
    expect(result.blockers).toContain("selfApprovalAllowed must remain false");
  });

  it("blocks unsafe declared paths", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-local-worker-command-execution-approval-plan-path-cert-"));
    writeFixture(rootDir);
    const config = createDefaultLocalWorkerCommandExecutionApprovalPlanV1();
    config.declaredPaths.push("../outside.md");
    const result = inspectLocalWorkerCommandExecutionApprovalPlanV1(config, { rootDir, writeArtifacts: false });
    expect(result.ok).toBe(false);
    expect(result.blockers).toContain("Declared path must be safe and relative: ../outside.md");
  });
});
