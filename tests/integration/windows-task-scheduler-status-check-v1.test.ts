import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { createDefaultWindowsTaskSchedulerStatusCheckV1, inspectWindowsTaskSchedulerStatusCheckV1 } from "../../scripts/lib/windows-task-scheduler-status-check-v1.mjs";

function writeFixture(rootDir: string) {
  const files = new Map<string, string>([
    ["docs/phases/PHASE_58_WINDOWS_TASK_SCHEDULER_STATUS_CHECK_V1.md", "# Phase 58 Windows Task Scheduler Status Check v1"],
    ["apps/operator-console/src/windows-task-scheduler-status-check.ts", "export type WindowsTaskSchedulerStatusCheckStatus = \"scheduler-status-ready\" | \"blocked\";\n\nexport type WindowsTaskSchedulerIndicatorId =\n  | \"scheduler-not-configured\"\n  | \"scheduled-execution-blocked\"\n  | \"worker-offline\"\n  | \"dry-run-evidence-required\"\n  | \"owner-schedule-gate-required\"\n  | \"emergency-stop-required\";\n\nexport type WindowsTaskSchedulerIndicator = {\n  id: WindowsTaskSchedulerIndicatorId;\n  label: string;\n  state: \"not-configured\" | \"blocked\" | \"offline\" | \"required\";\n  evidence: string;\n  authority: \"status_surface_only\";\n};\n\nexport type WindowsTaskSchedulerStatusCheckPacket = {\n  phase: {\n    number: 58;\n    label: string;\n    milestone: string;\n  };\n  schedulerStatusCheckStatus: WindowsTaskSchedulerStatusCheckStatus;\n  schedulerStatusCheckMode: string;\n  schedulerSummary: {\n    schedulerStatusCheckId: string;\n    owner: string;\n    sourcePhase: string;\n    safeState: string;\n    windowsSchedulerConfigured: boolean;\n    scheduledExecutionAllowed: boolean;\n    workerInstalled: boolean;\n    workerConnected: boolean;\n    executableScheduleCount: number;\n    dryRunEvidenceRequired: boolean;\n    emergencyStopRequired: boolean;\n  };\n  schedulerCheckFields: string[];\n  schedulerStatusSignals: string[];\n  schedulerReadinessIndicators: WindowsTaskSchedulerIndicator[];\n  evidenceRequirements: string[];\n  routing: {\n    suggestedQueue: string;\n    reviewRequired: boolean;\n    ownerDecisionRequired: boolean;\n    schedulerCreationAllowed: boolean;\n    schedulerQueryAllowed: boolean;\n    scheduledExecutionAllowed: boolean;\n    workerConnectionAllowed: boolean;\n    workerSpawnAllowed: boolean;\n    taskExecutionAllowed: boolean;\n    commandExecutionAllowed: boolean;\n    shellExecutionAllowed: boolean;\n    autoRouteAllowed: boolean;\n    autoProcessingAllowed: boolean;\n  };\n  boundaries: {\n    localOnly: boolean;\n    privateAppOnly: boolean;\n    schedulerStatusCheckOnly: boolean;\n    schedulerSurfaceOnly: boolean;\n    declarativeOnly: boolean;\n    readOnly: boolean;\n    frontendOnly: boolean;\n    noBackendLogic: boolean;\n    noAuthentication: boolean;\n    schedulerCreationAllowed: boolean;\n    schedulerMutationAllowed: boolean;\n    schedulerDeletionAllowed: boolean;\n    schedulerEnableDisableAllowed: boolean;\n    scheduledExecutionAllowed: boolean;\n    schedulerQueryAllowed: boolean;\n    powershellExecutionAllowed: boolean;\n    schtasksExecutionAllowed: boolean;\n    commandExecutionAllowed: boolean;\n    shellExecutionAllowed: boolean;\n    runnerConnectivityAllowed: boolean;\n    workerSpawnAllowed: boolean;\n    taskExecutionAllowed: boolean;\n    healthPollingAllowed: boolean;\n    liveHeartbeatAllowed: boolean;\n    processInspectionAllowed: boolean;\n    mutatesSource: boolean;\n    fileMutationAllowed: boolean;\n    filesystemMutationAllowed: boolean;\n    recordPersistenceAllowed: boolean;\n    taskPersistenceAllowed: boolean;\n    finalApprovalAllowed: boolean;\n    autoApprovalAllowed: boolean;\n    autoProcessingAllowed: boolean;\n    autoRouteAllowed: boolean;\n    autoMergeAllowed: boolean;\n    selfApprovalAllowed: boolean;\n  };\n};\n\nexport const windowsTaskSchedulerStatusCheckSafetyGates = [\n  \"Windows Task Scheduler status check only\",\n  \"Tyler remains the scheduling readiness owner\",\n  \"Scheduler state is declarative only\",\n  \"Scheduler readiness is represented without querying the operating system\",\n  \"Scheduler status check does not create scheduled tasks\",\n  \"Scheduler status check does not modify scheduled tasks\",\n  \"Scheduler status check does not delete scheduled tasks\",\n  \"Scheduler status check does not enable scheduled tasks\",\n  \"Scheduler status check does not disable scheduled tasks\",\n  \"Scheduler status check does not run scheduled tasks\",\n  \"Scheduler status check does not register Windows services\",\n  \"Scheduler status check does not install a worker\",\n  \"Scheduler status check does not start a worker\",\n  \"Scheduler status check does not connect to a worker\",\n  \"Scheduler status check does not poll worker health\",\n  \"Scheduler status check does not inspect running processes\",\n  \"Scheduler status check does not read Windows Task Scheduler live state\",\n  \"Scheduler status check does not query PowerShell\",\n  \"Scheduler status check does not execute schtasks\",\n  \"Scheduler status check does not execute commands\",\n  \"Scheduler status check does not execute shell commands\",\n  \"Scheduler status check does not execute tasks\",\n  \"Scheduler status check does not persist task records\",\n  \"Scheduler status check does not persist owner records\",\n  \"Scheduler status check does not mutate files\",\n  \"Scheduler status check does not mutate source\",\n  \"Scheduler status check does not mutate the filesystem\",\n  \"Scheduler status check does not connect to runner infrastructure\",\n  \"Scheduler status check does not approve execution\",\n  \"Scheduler status check does not route work\",\n  \"Scheduler status check does not process work automatically\",\n  \"Scheduler status check does not merge branches\",\n  \"Scheduler status check cannot self-approve\",\n  \"Windows scheduler configured remains false by design\",\n  \"Scheduled execution remains false by design\",\n  \"Worker installed remains false by design\",\n  \"Worker connected remains false by design\",\n  \"Executable schedule count remains zero\",\n  \"Future scheduling requires owner approval\",\n  \"Future scheduling requires command allowlist\",\n  \"Future scheduling requires workspace boundary guard\",\n  \"Future scheduling requires emergency stop compatibility\",\n  \"Future scheduling requires dry-run evidence\",\n  \"Future scheduling requires health panel evidence\",\n  \"Future scheduling requires validation gate\",\n  \"Future scheduling requires rollback policy\",\n  \"No backend scheduler service\",\n  \"No authentication changes\",\n  \"No scheduled execution\",\n  \"No self-approval\"\n] as const;\n\nexport const windowsTaskSchedulerStatusSignals = [\n  \"scheduler readiness surface\",\n  \"Windows scheduler configured flag\",\n  \"scheduled execution blocked flag\",\n  \"worker offline flag\",\n  \"manual owner schedule gate\",\n  \"dry-run evidence dependency\",\n  \"emergency stop dependency\",\n  \"command allowlist dependency\"\n] as const;\n\nexport const windowsTaskSchedulerStatusCheckPacket: WindowsTaskSchedulerStatusCheckPacket = {\n  phase: {\n    number: 58,\n    label: \"Phase 58 \u00b7 Windows Task Scheduler Status Check v1\",\n    milestone: \"Declarative scheduler-readiness surface for future local worker scheduling\",\n  },\n  schedulerStatusCheckStatus: \"scheduler-status-ready\",\n  schedulerStatusCheckMode: \"declarative-only Windows Task Scheduler readiness surface\",\n  schedulerSummary: {\n    schedulerStatusCheckId: \"phase58_windows_task_scheduler_status_check\",\n    owner: \"Tyler Wallace\",\n    sourcePhase: \"Phase 57 local worker dry-run harness\",\n    safeState: \"scheduler-readiness-only\",\n    windowsSchedulerConfigured: false,\n    scheduledExecutionAllowed: false,\n    workerInstalled: false,\n    workerConnected: false,\n    executableScheduleCount: 0,\n    dryRunEvidenceRequired: true,\n    emergencyStopRequired: true,\n  },\n  schedulerCheckFields: [\n    \"owner\",\n    \"sourcePhase\",\n    \"safeState\",\n    \"windowsSchedulerConfigured\",\n    \"scheduledExecutionAllowed\",\n    \"workerInstalled\",\n    \"workerConnected\",\n    \"executableScheduleCount\"\n  ],\n  schedulerStatusSignals: [...windowsTaskSchedulerStatusSignals],\n  schedulerReadinessIndicators: [\n{\n  id: \"scheduler-not-configured\",\n  label: \"Windows scheduler not configured\",\n  state: \"not-configured\",\n  evidence: \"Windows scheduling remains represented only, with no live Task Scheduler read.\",\n  authority: \"status_surface_only\",\n},\n{\n  id: \"scheduled-execution-blocked\",\n  label: \"Scheduled execution blocked\",\n  state: \"blocked\",\n  evidence: \"No scheduled action can run from Phase 58.\",\n  authority: \"status_surface_only\",\n},\n{\n  id: \"worker-offline\",\n  label: \"Worker offline by design\",\n  state: \"offline\",\n  evidence: \"Worker installed and connected values remain false.\",\n  authority: \"status_surface_only\",\n},\n{\n  id: \"dry-run-evidence-required\",\n  label: \"Dry-run evidence required\",\n  state: \"required\",\n  evidence: \"Phase 57 dry-run proof remains a prerequisite before any scheduling capability.\",\n  authority: \"status_surface_only\",\n},\n{\n  id: \"owner-schedule-gate-required\",\n  label: \"Owner schedule gate required\",\n  state: \"required\",\n  evidence: \"Tyler must explicitly approve any future scheduled run path.\",\n  authority: \"status_surface_only\",\n},\n{\n  id: \"emergency-stop-required\",\n  label: \"Emergency stop required\",\n  state: \"required\",\n  evidence: \"Future scheduling must remain compatible with emergency stop controls.\",\n  authority: \"status_surface_only\",\n}\n  ],\n  evidenceRequirements: [\n    \"scheduler readiness summary\",\n    \"blocked scheduled execution summary\",\n    \"worker offline summary\",\n    \"dry-run dependency summary\",\n    \"owner schedule gate summary\",\n    \"emergency stop dependency summary\",\n  ],\n  routing: {\n    suggestedQueue: \"Tyler Windows scheduler readiness review\",\n    reviewRequired: true,\n    ownerDecisionRequired: true,\n    schedulerCreationAllowed: false,\n    schedulerQueryAllowed: false,\n    scheduledExecutionAllowed: false,\n    workerConnectionAllowed: false,\n    workerSpawnAllowed: false,\n    taskExecutionAllowed: false,\n    commandExecutionAllowed: false,\n    shellExecutionAllowed: false,\n    autoRouteAllowed: false,\n    autoProcessingAllowed: false,\n  },\n  boundaries: {\n    localOnly: true,\n    privateAppOnly: true,\n    schedulerStatusCheckOnly: true,\n    schedulerSurfaceOnly: true,\n    declarativeOnly: true,\n    readOnly: true,\n    frontendOnly: true,\n    noBackendLogic: true,\n    noAuthentication: true,\n    schedulerCreationAllowed: false,\n    schedulerMutationAllowed: false,\n    schedulerDeletionAllowed: false,\n    schedulerEnableDisableAllowed: false,\n    scheduledExecutionAllowed: false,\n    schedulerQueryAllowed: false,\n    powershellExecutionAllowed: false,\n    schtasksExecutionAllowed: false,\n    commandExecutionAllowed: false,\n    shellExecutionAllowed: false,\n    runnerConnectivityAllowed: false,\n    workerSpawnAllowed: false,\n    taskExecutionAllowed: false,\n    healthPollingAllowed: false,\n    liveHeartbeatAllowed: false,\n    processInspectionAllowed: false,\n    mutatesSource: false,\n    fileMutationAllowed: false,\n    filesystemMutationAllowed: false,\n    recordPersistenceAllowed: false,\n    taskPersistenceAllowed: false,\n    finalApprovalAllowed: false,\n    autoApprovalAllowed: false,\n    autoProcessingAllowed: false,\n    autoRouteAllowed: false,\n    autoMergeAllowed: false,\n    selfApprovalAllowed: false,\n  },\n};\n"],
    ["scripts/lib/windows-task-scheduler-status-check-v1.mjs", "export const marker = true;"],
    ["scripts/run-windows-task-scheduler-status-check-v1.mjs", "console.log('Windows Task Scheduler status check');"],
    ["tests/integration/windows-task-scheduler-status-check-v1.test.ts", "// fixture"],
    ["apps/operator-console/src/App.tsx", "windowsTaskSchedulerStatusCheckPacket.schedulerSummary.owner\nwindowsTaskSchedulerStatusCheckPacket.schedulerReadinessIndicators.length\nwindowsTaskSchedulerStatusCheckPacket.evidenceRequirements.length\nwindowsTaskSchedulerStatusCheckPacket.boundaries.scheduledExecutionAllowed\nwindowsTaskSchedulerStatusCheckPacket.boundaries.schedulerCreationAllowed\nWindows Task Scheduler Status Check"],
    ["package.json", "{\"scripts\": {\"phase58:demo\": \"node scripts/run-windows-task-scheduler-status-check-v1.mjs\", \"phase58:verify\": \"npm run phase58:demo\"}}"],
  ]);

  for (const [relativePath, content] of files) {
    const fullPath = path.join(rootDir, relativePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, `${content}
`, "utf8");
  }
}

describe("windows-task-scheduler-status-check-v1", () => {
  it("passes when Windows scheduler status check is declarative and app-bound", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-windows-task-scheduler-status-check-cert-"));
    writeFixture(rootDir);

    const result = inspectWindowsTaskSchedulerStatusCheckV1(createDefaultWindowsTaskSchedulerStatusCheckV1(), { rootDir, writeArtifacts: false });

    expect(result.ok).toBe(true);
    expect(result.windowsTaskSchedulerStatusCheckStatus).toBe("ready");
    expect(result.schedulerStatusCheckOnly).toBe(true);
    expect(result.schedulerSurfaceOnly).toBe(true);
    expect(result.declarativeOnly).toBe(true);
    expect(result.windowsSchedulerConfigured).toBe(false);
    expect(result.workerInstalled).toBe(false);
    expect(result.workerConnected).toBe(false);
    expect(result.scheduledExecutionAllowed).toBe(false);
    expect(result.schedulerCreationAllowed).toBe(false);
    expect(result.schedulerQueryAllowed).toBe(false);
    expect(result.powershellExecutionAllowed).toBe(false);
    expect(result.schtasksExecutionAllowed).toBe(false);
    expect(result.commandExecutionAllowed).toBe(false);
    expect(result.shellExecutionAllowed).toBe(false);
    expect(result.runnerConnectivityAllowed).toBe(false);
    expect(result.selfApprovalAllowed).toBe(false);
  });

  it("writes Windows scheduler status reports without mutating source", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-windows-task-scheduler-status-check-report-cert-"));
    writeFixture(rootDir);

    const result = inspectWindowsTaskSchedulerStatusCheckV1(createDefaultWindowsTaskSchedulerStatusCheckV1(), { rootDir, writeArtifacts: true });

    expect(result.ok).toBe(true);
    expect(fs.existsSync(path.join(rootDir, ".sera-windows-task-scheduler-status-check", "phase58-windows-task-scheduler-status-check-status.json"))).toBe(true);
    expect(fs.existsSync(path.join(rootDir, ".sera-windows-task-scheduler-status-check", "phase58-windows-task-scheduler-status-check-status.md"))).toBe(true);
    expect(fs.existsSync(path.join(rootDir, "apps/operator-console/src/windows-task-scheduler-status-check.ts"))).toBe(true);
  });

  it("blocks unsafe Windows scheduler status boundaries", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-windows-task-scheduler-status-check-block-cert-"));
    writeFixture(rootDir);

    const config = createDefaultWindowsTaskSchedulerStatusCheckV1();
    config.boundaries.schedulerCreationAllowed = true;
    config.boundaries.schedulerMutationAllowed = true;
    config.boundaries.schedulerDeletionAllowed = true;
    config.boundaries.schedulerEnableDisableAllowed = true;
    config.boundaries.scheduledExecutionAllowed = true;
    config.boundaries.schedulerQueryAllowed = true;
    config.boundaries.powershellExecutionAllowed = true;
    config.boundaries.schtasksExecutionAllowed = true;
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

    const result = inspectWindowsTaskSchedulerStatusCheckV1(config, { rootDir, writeArtifacts: false });

    expect(result.ok).toBe(false);
    expect(result.blockers).toContain("schedulerCreationAllowed must remain false");
    expect(result.blockers).toContain("schedulerMutationAllowed must remain false");
    expect(result.blockers).toContain("scheduledExecutionAllowed must remain false");
    expect(result.blockers).toContain("schedulerQueryAllowed must remain false");
    expect(result.blockers).toContain("powershellExecutionAllowed must remain false");
    expect(result.blockers).toContain("schtasksExecutionAllowed must remain false");
    expect(result.blockers).toContain("commandExecutionAllowed must remain false");
    expect(result.blockers).toContain("shellExecutionAllowed must remain false");
    expect(result.blockers).toContain("runnerConnectivityAllowed must remain false");
    expect(result.blockers).toContain("workerSpawnAllowed must remain false");
    expect(result.blockers).toContain("taskExecutionAllowed must remain false");
    expect(result.blockers).toContain("healthPollingAllowed must remain false");
    expect(result.blockers).toContain("processInspectionAllowed must remain false");
    expect(result.blockers).toContain("filesystemMutationAllowed must remain false");
    expect(result.blockers).toContain("finalApprovalAllowed must remain false");
    expect(result.blockers).toContain("autoRouteAllowed must remain false");
    expect(result.blockers).toContain("selfApprovalAllowed must remain false");
  });

  it("blocks unsafe declared paths", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-windows-task-scheduler-status-check-path-cert-"));
    writeFixture(rootDir);

    const config = createDefaultWindowsTaskSchedulerStatusCheckV1();
    config.declaredPaths.push("../outside.md");

    const result = inspectWindowsTaskSchedulerStatusCheckV1(config, { rootDir, writeArtifacts: false });

    expect(result.ok).toBe(false);
    expect(result.blockers).toContain("Declared path must be safe and relative: ../outside.md");
  });
});
