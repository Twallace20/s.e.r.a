import fs from "node:fs";
import path from "node:path";
import { MemoryStore } from "@sera/memory";
import { createSeraId, isoNow, redactSecrets } from "@sera/shared";

export type QueuedTaskStatus = "queued" | "in_progress" | "completed" | "blocked" | "cancelled";
export type QueuedTaskPriority = "low" | "normal" | "high";
export type TaskQueueEventType = "created" | "started" | "completed" | "blocked" | "cancelled";

export interface QueuedTaskRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
  title: string;
  prompt: string;
  status: QueuedTaskStatus;
  priority: QueuedTaskPriority;
  requestedBy: string;
  tags: string[];
  source: "planner-task-queue-v1";
  startedAt?: string;
  completedAt?: string;
  blockedAt?: string;
  cancelledAt?: string;
  summary?: string;
  reason?: string;
}

export interface TaskQueueEventRecord {
  id: string;
  createdAt: string;
  taskId: string;
  type: TaskQueueEventType;
  actor: string;
  beforeStatus?: QueuedTaskStatus;
  afterStatus: QueuedTaskStatus;
  rationale?: string;
  summary?: string;
  source: "planner-task-queue-v1";
}

export interface TaskQueueSummary {
  createdAt: string;
  taskDir: string;
  totalCount: number;
  queuedCount: number;
  inProgressCount: number;
  completedCount: number;
  blockedCount: number;
  cancelledCount: number;
}

export interface CreateQueuedTaskInput {
  title: string;
  prompt: string;
  priority?: QueuedTaskPriority;
  requestedBy?: string;
  tags?: string[];
}

export interface TaskQueueResult {
  ok: boolean;
  status: "completed" | "blocked";
  message: string;
  taskDir: string;
  task?: QueuedTaskRecord;
  event?: TaskQueueEventRecord;
  taskPath?: string;
  eventPath?: string;
  summaryPath?: string;
  memoryRunRecordPath?: string;
  memoryFailureRecordPath?: string;
  lessonCandidatePath?: string;
}

export interface TaskQueueListResult {
  ok: true;
  status: "completed";
  taskDir: string;
  tasks: QueuedTaskRecord[];
}

export interface TaskQueueEventsResult {
  ok: true;
  status: "completed";
  taskDir: string;
  events: TaskQueueEventRecord[];
}

export interface TaskQueueSummaryResult {
  ok: true;
  status: "completed";
  taskDir: string;
  summary: TaskQueueSummary;
}

export class TaskQueueStore {
  readonly taskDir: string;
  private readonly rootDir: string;

  constructor(rootDir: string) {
    this.rootDir = path.resolve(rootDir);
    this.taskDir = path.join(this.rootDir, ".sera-tasks");
  }

  createTask(input: CreateQueuedTaskInput): TaskQueueResult {
    this.ensureTaskDir();
    const title = input.title.trim();
    const prompt = input.prompt.trim();
    if (!title || !prompt) {
      return this.blocked("Task creation requires a title and prompt.");
    }

    const createdAt = isoNow();
    const task: QueuedTaskRecord = {
      id: createSeraId("queued_task"),
      createdAt,
      updatedAt: createdAt,
      title,
      prompt,
      status: "queued",
      priority: input.priority ?? "normal",
      requestedBy: input.requestedBy?.trim() || "local-user",
      tags: input.tags ?? [],
      source: "planner-task-queue-v1"
    };
    const event = this.createEvent(task.id, "created", task.requestedBy, undefined, "queued", "Task created and queued.");
    const tasks = [...this.listTasks(), task];
    const taskPath = this.writeJsonl("tasks.jsonl", tasks);
    const eventPath = this.appendJsonl("task-events.jsonl", event);
    const summaryPath = this.writeSummary();
    return {
      ok: true,
      status: "completed",
      message: `Task queued: ${task.id}`,
      taskDir: this.taskDir,
      task,
      event,
      taskPath,
      eventPath,
      summaryPath
    };
  }

  listTasks(status?: QueuedTaskStatus): QueuedTaskRecord[] {
    const tasks = this.readJsonl<QueuedTaskRecord>("tasks.jsonl");
    return status ? tasks.filter((task) => task.status === status) : tasks;
  }

  listEvents(): TaskQueueEventRecord[] {
    return this.readJsonl<TaskQueueEventRecord>("task-events.jsonl");
  }

  inspectTask(taskId: string): TaskQueueResult {
    const task = this.findTask(taskId);
    if (!task) {
      return this.blocked(`Task not found: ${taskId}`);
    }
    return {
      ok: true,
      status: "completed",
      message: `Task found: ${task.id}`,
      taskDir: this.taskDir,
      task,
      taskPath: this.path("tasks.jsonl")
    };
  }

  startTask(taskId: string, actor = "local-user", rationale = "Start queued task."): TaskQueueResult {
    return this.transitionTask(taskId, "started", "in_progress", actor, rationale);
  }

  completeTask(taskId: string, actor = "local-user", summary = "Task completed."): TaskQueueResult {
    return this.transitionTask(taskId, "completed", "completed", actor, summary);
  }

  blockTask(taskId: string, actor = "local-user", reason = "Task blocked."): TaskQueueResult {
    return this.transitionTask(taskId, "blocked", "blocked", actor, reason);
  }

  cancelTask(taskId: string, actor = "local-user", reason = "Task cancelled."): TaskQueueResult {
    return this.transitionTask(taskId, "cancelled", "cancelled", actor, reason);
  }

  summarize(): TaskQueueSummary {
    const tasks = this.listTasks();
    return {
      createdAt: isoNow(),
      taskDir: this.taskDir,
      totalCount: tasks.length,
      queuedCount: tasks.filter((task) => task.status === "queued").length,
      inProgressCount: tasks.filter((task) => task.status === "in_progress").length,
      completedCount: tasks.filter((task) => task.status === "completed").length,
      blockedCount: tasks.filter((task) => task.status === "blocked").length,
      cancelledCount: tasks.filter((task) => task.status === "cancelled").length
    };
  }

  writeSummary(): string {
    this.ensureTaskDir();
    return this.writeJson("summary.json", this.summarize());
  }

  path(...segments: string[]): string {
    return path.join(this.taskDir, ...segments);
  }

  private transitionTask(
    taskId: string,
    eventType: Exclude<TaskQueueEventType, "created">,
    nextStatus: Exclude<QueuedTaskStatus, "queued">,
    actor: string,
    rationale: string
  ): TaskQueueResult {
    this.ensureTaskDir();
    const cleanActor = actor.trim() || "local-user";
    const cleanRationale = rationale.trim();
    if (!cleanRationale) {
      return this.blocked("Task transition requires a rationale or summary.");
    }

    const tasks = this.listTasks();
    const index = tasks.findIndex((task) => task.id === taskId);
    if (index < 0) {
      return this.blocked(`Task not found: ${taskId}`);
    }

    const task = tasks[index];
    const allowed = this.isTransitionAllowed(task.status, nextStatus);
    if (!allowed.ok) {
      return this.blocked(allowed.message, task);
    }

    const now = isoNow();
    const updatedTask: QueuedTaskRecord = {
      ...task,
      updatedAt: now,
      status: nextStatus,
      startedAt: nextStatus === "in_progress" ? now : task.startedAt,
      completedAt: nextStatus === "completed" ? now : task.completedAt,
      blockedAt: nextStatus === "blocked" ? now : task.blockedAt,
      cancelledAt: nextStatus === "cancelled" ? now : task.cancelledAt,
      summary: nextStatus === "completed" ? cleanRationale : task.summary,
      reason: nextStatus === "blocked" || nextStatus === "cancelled" ? cleanRationale : task.reason
    };
    tasks[index] = updatedTask;

    const event = this.createEvent(task.id, eventType, cleanActor, task.status, nextStatus, cleanRationale, nextStatus === "completed" ? cleanRationale : undefined);
    const taskPath = this.writeJsonl("tasks.jsonl", tasks);
    const eventPath = this.appendJsonl("task-events.jsonl", event);
    const summaryPath = this.writeSummary();

    const memory = this.recordTransitionInMemory(updatedTask, cleanRationale);
    return {
      ok: true,
      status: "completed",
      message: `Task ${eventType}: ${updatedTask.id}`,
      taskDir: this.taskDir,
      task: updatedTask,
      event,
      taskPath,
      eventPath,
      summaryPath,
      memoryRunRecordPath: memory?.runRecordPath,
      memoryFailureRecordPath: memory?.failureRecordPath,
      lessonCandidatePath: memory?.lessonCandidatePath
    };
  }

  private recordTransitionInMemory(task: QueuedTaskRecord, detail: string) {
    if (task.status !== "completed" && task.status !== "blocked") {
      return undefined;
    }
    const memory = new MemoryStore(this.rootDir);
    const memoryResult = memory.recordRun({
      runId: `task_queue_${task.id}`,
      taskId: task.id,
      prompt: task.prompt,
      status: task.status === "completed" ? "completed" : "blocked",
      summary: detail,
      startedAt: task.startedAt ?? task.createdAt,
      finishedAt: task.updatedAt,
      runDir: this.taskDir,
      artifacts: [".sera-tasks/tasks.jsonl", ".sera-tasks/task-events.jsonl", ".sera-tasks/summary.json"],
      source: "planner-task-queue-v1"
    });
    memory.writeSummary();
    return memoryResult;
  }

  private isTransitionAllowed(current: QueuedTaskStatus, next: QueuedTaskStatus): { ok: boolean; message: string } {
    if (current === "queued" && next === "in_progress") {
      return { ok: true, message: "queued -> in_progress" };
    }
    if (current === "in_progress" && next === "completed") {
      return { ok: true, message: "in_progress -> completed" };
    }
    if ((current === "queued" || current === "in_progress") && next === "blocked") {
      return { ok: true, message: `${current} -> blocked` };
    }
    if (current === "queued" && next === "cancelled") {
      return { ok: true, message: "queued -> cancelled" };
    }
    return { ok: false, message: `Invalid task transition: ${current} -> ${next}.` };
  }

  private createEvent(
    taskId: string,
    type: TaskQueueEventType,
    actor: string,
    beforeStatus: QueuedTaskStatus | undefined,
    afterStatus: QueuedTaskStatus,
    rationale?: string,
    summary?: string
  ): TaskQueueEventRecord {
    return {
      id: createSeraId("task_event"),
      createdAt: isoNow(),
      taskId,
      type,
      actor,
      beforeStatus,
      afterStatus,
      rationale,
      summary,
      source: "planner-task-queue-v1"
    };
  }

  private findTask(taskId: string): QueuedTaskRecord | undefined {
    return this.listTasks().find((task) => task.id === taskId);
  }

  private blocked(message: string, task?: QueuedTaskRecord): TaskQueueResult {
    return {
      ok: false,
      status: "blocked",
      message,
      taskDir: this.taskDir,
      task
    };
  }

  private ensureTaskDir(): void {
    fs.mkdirSync(this.taskDir, { recursive: true });
  }

  private appendJsonl(relativePath: string, value: unknown): string {
    this.ensureTaskDir();
    const target = this.path(relativePath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.appendFileSync(target, redactSecrets(JSON.stringify(value)) + "\n", "utf8");
    return target;
  }

  private writeJson(relativePath: string, value: unknown): string {
    this.ensureTaskDir();
    const target = this.path(relativePath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, redactSecrets(JSON.stringify(value, null, 2)) + "\n", "utf8");
    return target;
  }

  private writeJsonl(relativePath: string, values: unknown[]): string {
    this.ensureTaskDir();
    const target = this.path(relativePath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    const raw = values.map((value) => redactSecrets(JSON.stringify(value))).join("\n");
    fs.writeFileSync(target, raw ? `${raw}\n` : "", "utf8");
    return target;
  }

  private readJsonl<T>(relativePath: string): T[] {
    const target = this.path(relativePath);
    if (!fs.existsSync(target)) {
      return [];
    }
    const raw = fs.readFileSync(target, "utf8").trim();
    if (!raw) {
      return [];
    }
    return raw.split(/\r?\n/).map((line) => JSON.parse(line) as T);
  }
}
