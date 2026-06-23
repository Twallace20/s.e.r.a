import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createDefaultLocalWorkerHealthPollingApprovalPlanV1, inspectLocalWorkerHealthPollingApprovalPlanV1 } from "../../scripts/lib/local-worker-health-polling-approval-plan-v1.mjs";

function writeFile(rootDir: string, relativePath: string, content: string) {
  const fullPath = path.join(rootDir, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, "utf8");
}

function writeFixture(rootDir: string) {
  const app = `
import { localWorkerHealthPollingApprovalPlan, localWorkerHealthPollingApprovalPlanSafetyGates } from "./local-worker-health-polling-approval-plan";

const gates = [
  ...localWorkerHealthPollingApprovalPlanSafetyGates,
];

export function App() {
  return <section>
    <h2>Local Worker Health Polling Approval Plan</h2>
    <span>{localWorkerHealthPollingApprovalPlan.healthPollingApprovalPlanSummary.owner}</span>
    <span>{localWorkerHealthPollingApprovalPlan.healthPollingApprovalPlanRequirements.length}</span>
    <span>{localWorkerHealthPollingApprovalPlan.evidenceRequirements.length}</span>
    <span>{localWorkerHealthPollingApprovalPlan.boundaries.workerInstallAllowed ? "allowed" : "blocked"}</span>
    <span>{localWorkerHealthPollingApprovalPlan.healthPollingApprovalPlanSummary.healthPollingApprovalPlanLocked ? "yes" : "no"}</span>
  </section>;
}
`;
  const packageJson = JSON.stringify({ scripts: { "phase72:demo": "node scripts/run-local-worker-health-polling-approval-plan-v1.mjs", "phase72:verify": "npm run free-core:verify && npm run knowledge:verify && npm run phase71:demo && npm run phase72:demo" } }, null, 2);
  writeFile(rootDir, "apps/operator-console/src/App.tsx", app);
  writeFile(rootDir, "package.json", packageJson);
  for (const file of [
    "docs/phases/PHASE_72_LOCAL_WORKER_HEALTH_POLLING_APPROVAL_PLAN_V1.md",
    "scripts/lib/local-worker-health-polling-approval-plan-v1.mjs",
    "scripts/run-local-worker-health-polling-approval-plan-v1.mjs",
    "tests/integration/local-worker-health-polling-approval-plan-v1.test.ts",
    "apps/operator-console/src/local-worker-health-polling-approval-plan.ts",
  ]) writeFile(rootDir, file, "// fixture");
}

describe("local-worker-health-polling-approval-plan-v1", () => {
  it("passes when the local worker health polling approval plan is declarative and app-bound", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-local-worker-health-polling-approval-plan-cert-"));
    writeFixture(rootDir);
    const result = inspectLocalWorkerHealthPollingApprovalPlanV1(createDefaultLocalWorkerHealthPollingApprovalPlanV1(), { rootDir, writeArtifacts: false });
    expect(result.ok).toBe(true);
    expect(result.localWorkerHealthPollingApprovalPlanStatus).toBe("health-polling-approval-plan-ready");
    expect(result.healthPollingApprovalPlanOnly).toBe(true);
    expect(result.ownerReviewOnly).toBe(true);
    expect(result.declarativeOnly).toBe(true);
    expect(result.declaredFileCount).toBe(5);
    expect(result.healthPollingApprovalPlanRequirementCount).toBe(6);
    expect(result.healthPollingApprovalPlanFieldCount).toBe(8);
    expect(result.healthPollingApprovalPlanEvidenceCount).toBe(6);
    expect(result.healthPollingApprovalPlanSignalCount).toBe(8);
    expect(result.safetyGateCount).toBe(340);
    expect(result.appBindingCount).toBe(5);
    expect(result.phase71PostInstallHealthRecordReady).toBe(true);
    expect(result.phase70ManualInstallGateReady).toBe(true);
    expect(result.ownerApprovalRequired).toBe(true);
    expect(result.explicitHealthPollingApprovalPlanRequired).toBe(true);
    expect(result.ownerHealthPollingApprovalRequired).toBe(true);
    expect(result.healthPollingCommandBoundaryRequired).toBe(true);
    expect(result.pollingCadenceBoundaryRequired).toBe(true);
    expect(result.pollingRemainsBlockedRequired).toBe(true);
    expect(result.localWorkerReadyForInstall).toBe(false);
    expect(result.healthPollingApprovalPlanLocked).toBe(false);
    expect(result.workerInstallApproved).toBe(false);
    expect(result.workerInstalled).toBe(false);
    expect(result.healthPollingApprovalPlanSigningAllowed).toBe(false);
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

  it("writes local worker health polling approval plan reports without mutating source", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-local-worker-health-polling-approval-plan-report-cert-"));
    writeFixture(rootDir);
    const result = inspectLocalWorkerHealthPollingApprovalPlanV1(createDefaultLocalWorkerHealthPollingApprovalPlanV1(), { rootDir, writeArtifacts: true });
    expect(result.ok).toBe(true);
    expect(fs.existsSync(path.join(rootDir, ".sera-local-worker-health-polling-approval-plan", "phase72-local-worker-health-polling-approval-plan-status.json"))).toBe(true);
    expect(fs.existsSync(path.join(rootDir, ".sera-local-worker-health-polling-approval-plan", "phase72-local-worker-health-polling-approval-plan-status.md"))).toBe(true);
    expect(fs.existsSync(path.join(rootDir, "apps/operator-console/src/local-worker-health-polling-approval-plan.ts"))).toBe(true);
  });

  it("blocks unsafe local worker health polling approval plan boundaries", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-local-worker-health-polling-approval-plan-block-cert-"));
    writeFixture(rootDir);
    const config = createDefaultLocalWorkerHealthPollingApprovalPlanV1();
    config.summary.localWorkerReadyForInstall = true;
    config.summary.healthPollingApprovalPlanLocked = true;
    config.summary.installEvidencePacketLocked = true;
    config.summary.workerInstallApproved = true;
    config.summary.workerInstalled = true;
    config.summary.workerConnected = true;
    config.summary.scheduledExecutionAllowed = true;
    config.summary.executableScheduleCount = 1;
    config.boundaries.healthPollingApprovalPlanSigningAllowed = true;
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
    config.boundaries.healthPollingApprovalPlanPersistenceAllowed = true;
    config.boundaries.finalApprovalAllowed = true;
    config.boundaries.autoRouteAllowed = true;
    config.boundaries.selfApprovalAllowed = true;
    const result = inspectLocalWorkerHealthPollingApprovalPlanV1(config, { rootDir, writeArtifacts: false });
    expect(result.ok).toBe(false);
    expect(result.blockers).toContain("localWorkerReadyForInstall must remain false");
    expect(result.blockers).toContain("healthPollingApprovalPlanLocked must remain false");
    expect(result.blockers).toContain("workerInstallApproved must remain false");
    expect(result.blockers).toContain("workerInstalled must remain false");
    expect(result.blockers).toContain("scheduledExecutionAllowed must remain false");
    expect(result.blockers).toContain("executableScheduleCount must remain zero");
    expect(result.blockers).toContain("healthPollingApprovalPlanSigningAllowed must remain false");
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
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-local-worker-health-polling-approval-plan-path-cert-"));
    writeFixture(rootDir);
    const config = createDefaultLocalWorkerHealthPollingApprovalPlanV1();
    config.declaredPaths.push("../outside.md");
    const result = inspectLocalWorkerHealthPollingApprovalPlanV1(config, { rootDir, writeArtifacts: false });
    expect(result.ok).toBe(false);
    expect(result.blockers).toContain("Declared path must be safe and relative: ../outside.md");
  });
});
