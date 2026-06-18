import fs from "node:fs";
import path from "node:path";
import { ArtifactStore } from "@sera/artifacts";
import { KnowledgeSearchResult, KnowledgeStore } from "@sera/knowledge";
import { ModelInvocationResult, ModelProviderStore } from "@sera/model-provider";
import { QueuedTaskRecord, TaskQueueResult, TaskQueueStore } from "@sera/planner";
import { SafetyPolicy } from "@sera/safety";
import { createSeraId, isoNow, redactSecrets, SeraStatus } from "@sera/shared";
import { DeveloperPatchOperation, DeveloperPatchResult, DeveloperValidationContext, DeveloperValidationResult, DeveloperWorker } from "@sera/workers";

export type AutonomousDevLoopMode = "propose" | "apply";
export type AutonomousDevLoopEventType = "started" | "task_inspected" | "task_started" | "knowledge_searched" | "model_invoked" | "patch_proposed" | "patch_applied" | "task_completed" | "task_blocked" | "blocked";

export interface AutonomousDevLoopInput {
  goal: string;
  relativePath: string;
  operations: DeveloperPatchOperation[];
  mode: AutonomousDevLoopMode;
  taskId?: string;
  validate?: (context: DeveloperValidationContext) => DeveloperValidationResult;
  validationDescription?: string;
}

export interface AutonomousDevLoopEventRecord {
  id: string;
  createdAt: string;
  loopId: string;
  eventType: AutonomousDevLoopEventType;
  status: SeraStatus;
  message: string;
  taskId?: string;
  artifactPath?: string;
  source: "autonomous-dev-loop-v1";
}

export interface AutonomousDevLoopRecord {
  id: string;
  createdAt: string;
  finishedAt: string;
  mode: AutonomousDevLoopMode;
  status: SeraStatus;
  goal: string;
  relativePath: string;
  taskId?: string;
  taskStatusBefore?: string;
  taskStatusAfter?: string;
  knowledgeSearchId?: string;
  knowledgeHitCount: number;
  modelRequestId?: string;
  modelResponseId?: string;
  patchChanged: boolean;
  patchOccurrences: number;
  mutationAttempted: boolean;
  restored: boolean;
  validationGate?: string;
  message: string;
  source: "autonomous-dev-loop-v1";
}

export interface AutonomousDevLoopSummary {
  createdAt: string;
  autonomyDir: string;
  loopCount: number;
  proposedCount: number;
  appliedCount: number;
  blockedCount: number;
  eventCount: number;
}

export interface AutonomousDevLoopResult {
  ok: boolean;
  status: SeraStatus;
  message: string;
  autonomyDir: string;
  loop: AutonomousDevLoopRecord;
  events: AutonomousDevLoopEventRecord[];
  task?: QueuedTaskRecord;
  taskResult?: TaskQueueResult;
  knowledge?: KnowledgeSearchResult;
  model?: ModelInvocationResult;
  patch?: DeveloperPatchResult;
  loopPath: string;
  eventPath: string;
  summaryPath: string;
}

export interface AutonomousDevLoopListResult {
  ok: true;
  status: "completed";
  autonomyDir: string;
  loops?: AutonomousDevLoopRecord[];
  events?: AutonomousDevLoopEventRecord[];
}

export interface AutonomousDevLoopSummaryResult {
  ok: true;
  status: "completed";
  autonomyDir: string;
  summary: AutonomousDevLoopSummary;
  summaryPath: string;
}

export class AutonomousDevLoopWorker {
  readonly autonomyDir: string;
  private readonly rootDir: string;

  constructor(rootDir: string) {
    this.rootDir = path.resolve(rootDir);
    this.autonomyDir = path.join(this.rootDir, ".sera-autonomy");
  }

  run(input: AutonomousDevLoopInput, context: { runId: string; artifacts: ArtifactStore; safety: SafetyPolicy }): AutonomousDevLoopResult {
    this.ensureAutonomyDir();
    const loopId = createSeraId("autonomy_loop");
    const events: AutonomousDevLoopEventRecord[] = [];
    const createdAt = isoNow();
    const cleanGoal = input.goal.trim();
    const addEvent = (eventType: AutonomousDevLoopEventType, status: SeraStatus, message: string, artifactPath?: string) => {
      const event: AutonomousDevLoopEventRecord = { id: createSeraId("autonomy_event"), createdAt: isoNow(), loopId, eventType, status, message, taskId: input.taskId, artifactPath, source: "autonomous-dev-loop-v1" };
      events.push(event);
      return event;
    };
    addEvent("started", "completed", `Autonomous dev loop started in ${input.mode} mode.`);

    const blocked = (message: string, task?: QueuedTaskRecord, taskResult?: TaskQueueResult): AutonomousDevLoopResult => {
      addEvent("blocked", "blocked", message);
      return this.finalize({ input, loopId, createdAt, events, status: "blocked", message, task, taskResult });
    };

    if (!cleanGoal) return blocked("Autonomous dev loop requires a goal.");
    if (input.mode === "apply" && !input.validate) return blocked("Autonomous apply mode requires a validation gate. Refusing autonomous mutation.");

    const queue = new TaskQueueStore(this.rootDir);
    let task: QueuedTaskRecord | undefined;
    let taskResult: TaskQueueResult | undefined;
    if (input.taskId) {
      taskResult = queue.inspectTask(input.taskId);
      task = taskResult.task;
      addEvent("task_inspected", taskResult.status, taskResult.message, taskResult.taskPath);
      if (!taskResult.ok || !task) return this.finalize({ input, loopId, createdAt, events, status: "blocked", message: taskResult.message, task, taskResult });
    }

    if (input.mode === "apply") {
      if (!input.taskId || !task) return blocked("Autonomous apply mode requires a queued task id.", task, taskResult);
      taskResult = queue.startTask(input.taskId, "sera-autonomous-dev-loop", "Begin bounded autonomous apply-cert loop.");
      task = taskResult.task ?? task;
      addEvent("task_started", taskResult.status, taskResult.message, taskResult.eventPath);
      if (!taskResult.ok) return this.finalize({ input, loopId, createdAt, events, status: "blocked", message: taskResult.message, task, taskResult });
    }

    const knowledge = new KnowledgeStore(this.rootDir).search(cleanGoal, 5);
    addEvent("knowledge_searched", knowledge.status, knowledge.message, knowledge.searchPath);
    const model = new ModelProviderStore(this.rootDir).invoke({
      providerId: "mock-local",
      purpose: "autonomous-dev-loop-v1-plan",
      prompt: ["Create a bounded local-only development plan from available evidence.", `Goal: ${cleanGoal}`, `Target: ${input.relativePath}`, `Mode: ${input.mode}`, `Knowledge hits: ${knowledge.hits.length}`].join("\n")
    });
    addEvent("model_invoked", model.status, model.message, model.responsePath ?? model.eventPath);

    const patch = new DeveloperWorker().patch({ runId: context.runId, projectRoot: this.rootDir, relativePath: input.relativePath, operations: input.operations, mode: input.mode === "propose" ? "suggested" : "direct", artifacts: context.artifacts, safety: context.safety, validate: input.validate });
    addEvent(input.mode === "propose" ? "patch_proposed" : "patch_applied", patch.status, patch.message, patch.patchArtifactPath ?? patch.backupPath);

    let status: SeraStatus = patch.status;
    let message = patch.message;
    if (input.mode === "apply" && input.taskId) {
      if (patch.ok) {
        taskResult = queue.completeTask(input.taskId, "sera-autonomous-dev-loop", `Autonomous dev loop completed: ${patch.message}`);
        task = taskResult.task ?? task;
        addEvent("task_completed", taskResult.status, taskResult.message, taskResult.eventPath);
        status = taskResult.ok ? "completed_with_changes" : "blocked";
        message = taskResult.ok ? "Autonomous dev loop applied changes and completed the queued task." : taskResult.message;
      } else {
        taskResult = queue.blockTask(input.taskId, "sera-autonomous-dev-loop", `Autonomous dev loop blocked: ${patch.message}`);
        task = taskResult.task ?? task;
        addEvent("task_blocked", taskResult.status, taskResult.message, taskResult.eventPath);
        status = "blocked";
        message = patch.message;
      }
    }
    return this.finalize({ input, loopId, createdAt, events, status, message, patch, knowledge, model, task, taskResult });
  }

  listLoops(): AutonomousDevLoopRecord[] { return this.readJsonl<AutonomousDevLoopRecord>("loops.jsonl"); }
  listEvents(): AutonomousDevLoopEventRecord[] { return this.readJsonl<AutonomousDevLoopEventRecord>("events.jsonl"); }
  list(kind: "loops" | "events"): AutonomousDevLoopListResult { return kind === "loops" ? { ok: true, status: "completed", autonomyDir: this.autonomyDir, loops: this.listLoops() } : { ok: true, status: "completed", autonomyDir: this.autonomyDir, events: this.listEvents() }; }
  summarize(): AutonomousDevLoopSummary {
    const loops = this.listLoops();
    const events = this.listEvents();
    return { createdAt: isoNow(), autonomyDir: this.autonomyDir, loopCount: loops.length, proposedCount: loops.filter((loop) => loop.mode === "propose").length, appliedCount: loops.filter((loop) => loop.mode === "apply" && loop.status !== "blocked").length, blockedCount: loops.filter((loop) => loop.status === "blocked" || loop.status === "failed").length, eventCount: events.length };
  }
  writeSummary(): string { return this.writeJson("summary.json", this.summarize()); }
  getSummary(): AutonomousDevLoopSummaryResult { const summaryPath = this.writeSummary(); return { ok: true, status: "completed", autonomyDir: this.autonomyDir, summary: this.summarize(), summaryPath }; }

  private finalize(input: { input: AutonomousDevLoopInput; loopId: string; createdAt: string; events: AutonomousDevLoopEventRecord[]; status: SeraStatus; message: string; patch?: DeveloperPatchResult; knowledge?: KnowledgeSearchResult; model?: ModelInvocationResult; task?: QueuedTaskRecord; taskResult?: TaskQueueResult }): AutonomousDevLoopResult {
    const loop: AutonomousDevLoopRecord = { id: input.loopId, createdAt: input.createdAt, finishedAt: isoNow(), mode: input.input.mode, status: input.status, goal: redactSecrets(input.input.goal), relativePath: input.input.relativePath, taskId: input.input.taskId, taskStatusBefore: input.task?.status, taskStatusAfter: input.taskResult?.task?.status ?? input.task?.status, knowledgeSearchId: input.knowledge?.searchRecord?.id, knowledgeHitCount: input.knowledge?.hits.length ?? 0, modelRequestId: input.model?.request?.id, modelResponseId: input.model?.response?.id, patchChanged: input.patch?.changed ?? false, patchOccurrences: input.patch?.totalOccurrences ?? 0, mutationAttempted: input.input.mode === "apply", restored: input.patch?.restored ?? false, validationGate: input.input.validationDescription, message: input.message, source: "autonomous-dev-loop-v1" };
    const loopPath = this.appendJsonl("loops.jsonl", loop);
    let eventPath = this.path("events.jsonl");
    for (const event of input.events) eventPath = this.appendJsonl("events.jsonl", event);
    const summaryPath = this.writeSummary();
    return { ok: input.status !== "blocked" && input.status !== "failed", status: input.status, message: input.message, autonomyDir: this.autonomyDir, loop, events: input.events, task: input.taskResult?.task ?? input.task, taskResult: input.taskResult, knowledge: input.knowledge, model: input.model, patch: input.patch, loopPath, eventPath, summaryPath };
  }
  private ensureAutonomyDir(): void { fs.mkdirSync(this.autonomyDir, { recursive: true }); }
  private path(...segments: string[]): string { return path.join(this.autonomyDir, ...segments); }
  private appendJsonl(relativePath: string, value: unknown): string { this.ensureAutonomyDir(); const target = this.path(relativePath); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.appendFileSync(target, redactSecrets(JSON.stringify(value)) + "\n", "utf8"); return target; }
  private writeJson(relativePath: string, value: unknown): string { this.ensureAutonomyDir(); const target = this.path(relativePath); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, redactSecrets(JSON.stringify(value, null, 2)) + "\n", "utf8"); return target; }
  private readJsonl<T>(relativePath: string): T[] { const target = this.path(relativePath); if (!fs.existsSync(target)) return []; const raw = fs.readFileSync(target, "utf8").trim(); return raw ? raw.split(/\r?\n/).map((line) => JSON.parse(line) as T) : []; }
}
