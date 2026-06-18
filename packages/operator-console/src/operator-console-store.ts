import fs from "node:fs";
import path from "node:path";
import { AutonomousDevLoopSummary, AutonomousDevLoopWorker } from "@sera/autonomy";
import { KnowledgeStore, KnowledgeSummary } from "@sera/knowledge";
import { MemoryStore, MemorySummary } from "@sera/memory";
import { ModelProviderRecord, ModelProviderStore, ModelProviderSummary } from "@sera/model-provider";
import { TaskQueueStore, TaskQueueSummary } from "@sera/planner";
import { createSeraId, isoNow } from "@sera/shared";

export type OperatorConsoleStatus = "completed" | "degraded" | "blocked";
export type OperatorConsoleEventType = "status_snapshot" | "health_check" | "report_written";

export interface OperatorConsoleSubsystemSnapshot {
  name: "memory" | "tasks" | "knowledge" | "models" | "autonomy";
  status: OperatorConsoleStatus;
  dir: string;
  counts: Record<string, number>;
  message: string;
}

export interface OperatorConsoleSnapshot {
  id: string;
  createdAt: string;
  rootDir: string;
  consoleDir: string;
  status: OperatorConsoleStatus;
  certificationLevel: "operator-console-v1";
  subsystems: OperatorConsoleSubsystemSnapshot[];
  riskNotes: string[];
  source: "operator-console-v1";
}

export interface OperatorConsoleHealthCheck {
  id: string;
  name: string;
  pass: boolean;
  severity: "info" | "warn" | "error";
  detail: string;
}

export interface OperatorConsoleHealthRecord {
  id: string;
  createdAt: string;
  status: OperatorConsoleStatus;
  checks: OperatorConsoleHealthCheck[];
  source: "operator-console-v1";
}

export interface OperatorConsoleEventRecord {
  id: string;
  createdAt: string;
  eventType: OperatorConsoleEventType;
  status: OperatorConsoleStatus;
  message: string;
  artifactPath?: string;
  source: "operator-console-v1";
}

export interface OperatorConsoleReportRecord {
  id: string;
  createdAt: string;
  status: OperatorConsoleStatus;
  snapshotId: string;
  healthId: string;
  markdownPath: string;
  jsonPath: string;
  source: "operator-console-v1";
}

export interface OperatorConsoleSummary {
  createdAt: string;
  consoleDir: string;
  snapshotCount: number;
  eventCount: number;
  reportCount: number;
  lastStatus: OperatorConsoleStatus | "none";
}

export interface OperatorConsoleStatusResult {
  ok: true;
  status: "completed";
  consoleDir: string;
  snapshot: OperatorConsoleSnapshot;
  snapshotPath: string;
  eventPath: string;
  summaryPath: string;
}

export interface OperatorConsoleHealthResult {
  ok: boolean;
  status: OperatorConsoleStatus;
  consoleDir: string;
  health: OperatorConsoleHealthRecord;
  healthPath: string;
  eventPath: string;
  summaryPath: string;
}

export interface OperatorConsoleReportResult {
  ok: boolean;
  status: OperatorConsoleStatus;
  consoleDir: string;
  snapshot: OperatorConsoleSnapshot;
  health: OperatorConsoleHealthRecord;
  report: OperatorConsoleReportRecord;
  markdownPath: string;
  jsonPath: string;
  eventPath: string;
  summaryPath: string;
}

export interface OperatorConsoleHistoryResult {
  ok: true;
  status: "completed";
  consoleDir: string;
  snapshots: OperatorConsoleSnapshot[];
  events: OperatorConsoleEventRecord[];
  reports: OperatorConsoleReportRecord[];
}

export interface OperatorConsoleSummaryResult {
  ok: true;
  status: "completed";
  consoleDir: string;
  summary: OperatorConsoleSummary;
  summaryPath: string;
}

export class OperatorConsoleStore {
  readonly consoleDir: string;
  private readonly rootDir: string;

  constructor(rootDir: string) {
    this.rootDir = path.resolve(rootDir);
    this.consoleDir = path.join(this.rootDir, ".sera-console");
  }

  getStatus(): OperatorConsoleStatusResult {
    this.ensureConsoleDir();
    const snapshot = this.createSnapshot();
    const snapshotPath = this.appendJsonl("snapshots.jsonl", snapshot);
    const eventPath = this.appendEvent("status_snapshot", snapshot.status, `Operator console snapshot recorded: ${snapshot.status}.`, snapshotPath);
    const summaryPath = this.writeSummary();
    return { ok: true, status: "completed", consoleDir: this.consoleDir, snapshot, snapshotPath, eventPath, summaryPath };
  }

  getHealth(): OperatorConsoleHealthResult {
    this.ensureConsoleDir();
    const health = this.createHealthRecord();
    const healthPath = this.appendJsonl("health.jsonl", health);
    const eventPath = this.appendEvent("health_check", health.status, `Operator console health check completed: ${health.status}.`, healthPath);
    const summaryPath = this.writeSummary();
    return { ok: health.status !== "blocked", status: health.status, consoleDir: this.consoleDir, health, healthPath, eventPath, summaryPath };
  }

  writeReport(): OperatorConsoleReportResult {
    this.ensureConsoleDir();
    const snapshotResult = this.getStatus();
    const healthResult = this.getHealth();
    const reportId = createSeraId("operator_report");
    const markdownPath = this.path("reports", `${reportId}.md`);
    const jsonPath = this.path("reports", `${reportId}.json`);
    fs.mkdirSync(path.dirname(markdownPath), { recursive: true });

    const status = this.maxStatus(snapshotResult.snapshot.status, healthResult.health.status);
    const report: OperatorConsoleReportRecord = {
      id: reportId,
      createdAt: isoNow(),
      status,
      snapshotId: snapshotResult.snapshot.id,
      healthId: healthResult.health.id,
      markdownPath,
      jsonPath,
      source: "operator-console-v1"
    };

    fs.writeFileSync(jsonPath, JSON.stringify({ report, snapshot: snapshotResult.snapshot, health: healthResult.health }, null, 2) + "\n", "utf8");
    fs.writeFileSync(markdownPath, this.renderMarkdownReport(report, snapshotResult.snapshot, healthResult.health), "utf8");
    this.appendJsonl("reports.jsonl", report);
    const eventPath = this.appendEvent("report_written", status, `Operator console report written: ${reportId}.`, markdownPath);
    const summaryPath = this.writeSummary();
    return { ok: status !== "blocked", status, consoleDir: this.consoleDir, snapshot: snapshotResult.snapshot, health: healthResult.health, report, markdownPath, jsonPath, eventPath, summaryPath };
  }

  listHistory(): OperatorConsoleHistoryResult {
    return { ok: true, status: "completed", consoleDir: this.consoleDir, snapshots: this.listSnapshots(), events: this.listEvents(), reports: this.listReports() };
  }

  getSummary(): OperatorConsoleSummaryResult {
    const summaryPath = this.writeSummary();
    return { ok: true, status: "completed", consoleDir: this.consoleDir, summary: this.summarize(), summaryPath };
  }

  listSnapshots(): OperatorConsoleSnapshot[] {
    return this.readJsonl<OperatorConsoleSnapshot>("snapshots.jsonl");
  }

  listEvents(): OperatorConsoleEventRecord[] {
    return this.readJsonl<OperatorConsoleEventRecord>("events.jsonl");
  }

  listReports(): OperatorConsoleReportRecord[] {
    return this.readJsonl<OperatorConsoleReportRecord>("reports.jsonl");
  }

  summarize(): OperatorConsoleSummary {
    const snapshots = this.listSnapshots();
    const events = this.listEvents();
    const reports = this.listReports();
    return {
      createdAt: isoNow(),
      consoleDir: this.consoleDir,
      snapshotCount: snapshots.length,
      eventCount: events.length,
      reportCount: reports.length,
      lastStatus: snapshots.at(-1)?.status ?? "none"
    };
  }

  writeSummary(): string {
    this.ensureConsoleDir();
    return this.writeJson("summary.json", this.summarize());
  }

  path(...segments: string[]): string {
    return path.join(this.consoleDir, ...segments);
  }

  private createSnapshot(): OperatorConsoleSnapshot {
    const memory = new MemoryStore(this.rootDir);
    const tasks = new TaskQueueStore(this.rootDir);
    const knowledge = new KnowledgeStore(this.rootDir);
    const models = new ModelProviderStore(this.rootDir);
    const autonomy = new AutonomousDevLoopWorker(this.rootDir);

    const memorySummary = memory.summarize();
    const taskSummary = tasks.summarize();
    const knowledgeSummary = knowledge.summarize();
    const modelSummary = models.summarize();
    const autonomySummary = autonomy.summarize();

    const subsystems: OperatorConsoleSubsystemSnapshot[] = [
      this.memorySnapshot(memory.memoryDir, memorySummary),
      this.taskSnapshot(tasks.taskDir, taskSummary),
      this.knowledgeSnapshot(knowledge.knowledgeDir, knowledgeSummary),
      this.modelSnapshot(models.modelDir, modelSummary),
      this.autonomySnapshot(autonomy.autonomyDir, autonomySummary)
    ];
    const status = this.maxStatus(...subsystems.map((subsystem) => subsystem.status));
    return {
      id: createSeraId("operator_snapshot"),
      createdAt: isoNow(),
      rootDir: this.rootDir,
      consoleDir: this.consoleDir,
      status,
      certificationLevel: "operator-console-v1",
      subsystems,
      riskNotes: this.createRiskNotes(subsystems, models.listProviders().providers),
      source: "operator-console-v1"
    };
  }

  private createHealthRecord(): OperatorConsoleHealthRecord {
    const models = new ModelProviderStore(this.rootDir);
    const providers = models.listProviders().providers;
    const memory = new MemoryStore(this.rootDir);
    const tasks = new TaskQueueStore(this.rootDir);
    const knowledge = new KnowledgeStore(this.rootDir);
    const autonomy = new AutonomousDevLoopWorker(this.rootDir);

    const checks: OperatorConsoleHealthCheck[] = [
      {
        id: "console_root_inside_project",
        name: "Console directory is scoped inside the project",
        pass: this.isInsideRoot(this.consoleDir),
        severity: "error",
        detail: this.consoleDir
      },
      {
        id: "console_memory_available",
        name: "Memory store can be summarized",
        pass: Number.isFinite(memory.summarize().runCount),
        severity: "error",
        detail: memory.memoryDir
      },
      {
        id: "console_task_queue_available",
        name: "Task queue can be summarized",
        pass: Number.isFinite(tasks.summarize().totalCount),
        severity: "error",
        detail: tasks.taskDir
      },
      {
        id: "console_knowledge_available",
        name: "Knowledge store can be summarized",
        pass: Number.isFinite(knowledge.summarize().documentCount),
        severity: "warn",
        detail: knowledge.knowledgeDir
      },
      {
        id: "console_external_models_disabled",
        name: "External model provider remains disabled by default",
        pass: providers.some((provider) => provider.id === "external-disabled" && !provider.available),
        severity: "error",
        detail: JSON.stringify(providers.map((provider) => ({ id: provider.id, enabled: provider.available })))
      },
      {
        id: "console_mock_model_available",
        name: "Deterministic local mock provider is available",
        pass: providers.some((provider) => provider.id === "mock-local" && provider.available),
        severity: "error",
        detail: JSON.stringify(providers.map((provider) => ({ id: provider.id, enabled: provider.available })))
      },
      {
        id: "console_autonomy_available",
        name: "Autonomy loop history can be summarized",
        pass: Number.isFinite(autonomy.summarize().loopCount),
        severity: "warn",
        detail: autonomy.autonomyDir
      }
    ];
    const status = checks.some((check) => !check.pass && check.severity === "error")
      ? "blocked"
      : checks.some((check) => !check.pass)
        ? "degraded"
        : "completed";
    return { id: createSeraId("operator_health"), createdAt: isoNow(), status, checks, source: "operator-console-v1" };
  }

  private memorySnapshot(dir: string, summary: MemorySummary): OperatorConsoleSubsystemSnapshot {
    const hasOpenLessons = summary.lessonCandidateCount > 0;
    return { name: "memory", status: hasOpenLessons ? "degraded" : "completed", dir, counts: { runs: summary.runCount, failures: summary.failureCount, lessonCandidates: summary.lessonCandidateCount, approvedLessons: summary.approvedLessonCount, activeLessons: summary.activeLessonCount, regressionRules: summary.regressionRuleCount }, message: hasOpenLessons ? "Lesson candidates are waiting for review." : "Memory store is available." };
  }

  private taskSnapshot(dir: string, summary: TaskQueueSummary): OperatorConsoleSubsystemSnapshot {
    const hasBlocked = summary.blockedCount > 0;
    return { name: "tasks", status: hasBlocked ? "degraded" : "completed", dir, counts: { total: summary.totalCount, queued: summary.queuedCount, inProgress: summary.inProgressCount, completed: summary.completedCount, blocked: summary.blockedCount, cancelled: summary.cancelledCount }, message: hasBlocked ? "Blocked tasks need operator attention." : "Task queue is available." };
  }

  private knowledgeSnapshot(dir: string, summary: KnowledgeSummary): OperatorConsoleSubsystemSnapshot {
    return { name: "knowledge", status: "completed", dir, counts: { documents: summary.documentCount, chunks: summary.chunkCount, searches: summary.searchCount }, message: summary.documentCount > 0 ? "Knowledge index has local evidence." : "Knowledge index is available but empty." };
  }

  private modelSnapshot(dir: string, summary: ModelProviderSummary): OperatorConsoleSubsystemSnapshot {
    return { name: "models", status: summary.blockedEventCount > 0 ? "degraded" : "completed", dir, counts: { providers: summary.providerCount, requests: summary.requestCount, responses: summary.responseCount, blockedEvents: summary.blockedEventCount }, message: summary.blockedEventCount > 0 ? "Model provider has blocked events recorded." : "Model provider boundary is available." };
  }

  private autonomySnapshot(dir: string, summary: AutonomousDevLoopSummary): OperatorConsoleSubsystemSnapshot {
    return { name: "autonomy", status: summary.blockedCount > 0 ? "degraded" : "completed", dir, counts: { loops: summary.loopCount, proposed: summary.proposedCount, applied: summary.appliedCount, blocked: summary.blockedCount, events: summary.eventCount }, message: summary.blockedCount > 0 ? "Autonomy loop has blocked attempts recorded." : "Autonomy loop is available." };
  }

  private createRiskNotes(subsystems: OperatorConsoleSubsystemSnapshot[], providers: ModelProviderRecord[]): string[] {
    const notes: string[] = ["External model providers are disabled unless explicitly enabled in a future certified phase."];
    for (const subsystem of subsystems) {
      if (subsystem.status !== "completed") notes.push(`${subsystem.name}: ${subsystem.message}`);
    }
    if (!providers.some((provider) => provider.id === "mock-local" && provider.available)) notes.push("Mock model provider is unavailable.");
    return notes;
  }

  private renderMarkdownReport(report: OperatorConsoleReportRecord, snapshot: OperatorConsoleSnapshot, health: OperatorConsoleHealthRecord): string {
    const subsystemLines = snapshot.subsystems.map((subsystem) => `| ${subsystem.name} | ${subsystem.status} | ${Object.entries(subsystem.counts).map(([key, value]) => `${key}: ${value}`).join(", ")} | ${subsystem.message} |`);
    const healthLines = health.checks.map((check) => `| ${check.id} | ${check.pass ? "pass" : "fail"} | ${check.severity} | ${check.detail.replace(/\|/g, "\\|")} |`);
    return [
      "# S.E.R.A. Operator Console Report",
      "",
      `Report: ${report.id}`,
      `Status: ${report.status}`,
      `Created: ${report.createdAt}`,
      "",
      "## Subsystems",
      "",
      "| Subsystem | Status | Counts | Message |",
      "| --- | --- | --- | --- |",
      ...subsystemLines,
      "",
      "## Health Checks",
      "",
      "| Check | Result | Severity | Detail |",
      "| --- | --- | --- | --- |",
      ...healthLines,
      "",
      "## Risk Notes",
      "",
      ...snapshot.riskNotes.map((note) => `- ${note}`),
      ""
    ].join("\n");
  }

  private maxStatus(...statuses: OperatorConsoleStatus[]): OperatorConsoleStatus {
    if (statuses.includes("blocked")) return "blocked";
    if (statuses.includes("degraded")) return "degraded";
    return "completed";
  }

  private appendEvent(eventType: OperatorConsoleEventType, status: OperatorConsoleStatus, message: string, artifactPath?: string): string {
    const event: OperatorConsoleEventRecord = { id: createSeraId("operator_event"), createdAt: isoNow(), eventType, status, message, artifactPath, source: "operator-console-v1" };
    return this.appendJsonl("events.jsonl", event);
  }

  private isInsideRoot(target: string): boolean {
    const relative = path.relative(this.rootDir, path.resolve(target));
    return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
  }

  private ensureConsoleDir(): void {
    fs.mkdirSync(this.consoleDir, { recursive: true });
  }

  private readJsonl<T>(fileName: string): T[] {
    const filePath = this.path(fileName);
    if (!fs.existsSync(filePath)) return [];
    return fs.readFileSync(filePath, "utf8").split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line) as T);
  }

  private appendJsonl(fileName: string, value: unknown): string {
    this.ensureConsoleDir();
    const filePath = this.path(fileName);
    fs.appendFileSync(filePath, JSON.stringify(value) + "\n", "utf8");
    return filePath;
  }

  private writeJson(fileName: string, value: unknown): string {
    this.ensureConsoleDir();
    const filePath = this.path(fileName);
    fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + "\n", "utf8");
    return filePath;
  }
}
