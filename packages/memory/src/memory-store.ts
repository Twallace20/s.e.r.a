import fs from "node:fs";
import path from "node:path";
import { createSeraId, isoNow, redactSecrets, SeraStatus } from "@sera/shared";

export type LessonCandidateStatus = "candidate" | "approved" | "rejected" | "archived";

export interface MemoryRunRecord {
  id: string;
  createdAt: string;
  runId: string;
  taskId: string;
  prompt: string;
  status: SeraStatus;
  summary: string;
  startedAt: string;
  finishedAt?: string;
  runDir: string;
  artifacts: string[];
  source: "kernel-finalize";
}

export interface MemoryFailureRecord {
  id: string;
  createdAt: string;
  runId: string;
  taskId: string;
  prompt: string;
  status: Extract<SeraStatus, "blocked" | "failed">;
  summary: string;
  reason: string;
  runDir: string;
  source: "kernel-finalize";
}

export interface LessonCandidateRecord {
  id: string;
  createdAt: string;
  status: LessonCandidateStatus;
  sourceFailureId: string;
  runId: string;
  taskId: string;
  title: string;
  hypothesis: string;
  evidence: string[];
  proposedAction: string;
  activation: "manual-approval-required";
}

export interface MemorySummary {
  createdAt: string;
  memoryDir: string;
  runCount: number;
  failureCount: number;
  lessonCandidateCount: number;
  approvedLessonCount: number;
}

export interface RecordRunInput {
  runId: string;
  taskId: string;
  prompt: string;
  status: SeraStatus;
  summary: string;
  startedAt: string;
  finishedAt?: string;
  runDir: string;
  artifacts: string[];
}

export interface RecordRunResult {
  runRecord: MemoryRunRecord;
  runRecordPath: string;
  failureRecord?: MemoryFailureRecord;
  failureRecordPath?: string;
  lessonCandidate?: LessonCandidateRecord;
  lessonCandidatePath?: string;
}

export class MemoryStore {
  readonly memoryDir: string;

  constructor(rootDir: string) {
    this.memoryDir = path.join(path.resolve(rootDir), ".sera-memory");
  }

  recordRun(input: RecordRunInput): RecordRunResult {
    this.ensureMemoryDir();
    const runRecord: MemoryRunRecord = {
      id: createSeraId("memory_run"),
      createdAt: isoNow(),
      runId: input.runId,
      taskId: input.taskId,
      prompt: input.prompt,
      status: input.status,
      summary: input.summary,
      startedAt: input.startedAt,
      finishedAt: input.finishedAt,
      runDir: input.runDir,
      artifacts: input.artifacts,
      source: "kernel-finalize"
    };
    const runRecordPath = this.appendJsonl("run-history.jsonl", runRecord);

    if (input.status !== "blocked" && input.status !== "failed") {
      return { runRecord, runRecordPath };
    }

    const failureRecord: MemoryFailureRecord = {
      id: createSeraId("failure"),
      createdAt: isoNow(),
      runId: input.runId,
      taskId: input.taskId,
      prompt: input.prompt,
      status: input.status,
      summary: input.summary,
      reason: input.summary,
      runDir: input.runDir,
      source: "kernel-finalize"
    };
    const failureRecordPath = this.appendJsonl("failure-journal.jsonl", failureRecord);
    const lessonCandidate = this.createLessonCandidate(failureRecord);
    const lessonCandidatePath = this.appendJsonl("lesson-candidates.jsonl", lessonCandidate);
    return { runRecord, runRecordPath, failureRecord, failureRecordPath, lessonCandidate, lessonCandidatePath };
  }

  createLessonCandidate(failure: MemoryFailureRecord): LessonCandidateRecord {
    return {
      id: createSeraId("lesson_candidate"),
      createdAt: isoNow(),
      status: "candidate",
      sourceFailureId: failure.id,
      runId: failure.runId,
      taskId: failure.taskId,
      title: `Review ${failure.status} run ${failure.runId}`,
      hypothesis: "A repeated blocked or failed run may reveal a missing guardrail, unclear task contract, validation gap, or unsupported capability.",
      evidence: [failure.summary, failure.runDir],
      proposedAction: "Human review required. Convert this candidate into a regression test or design rule only after confirming the lesson is valid.",
      activation: "manual-approval-required"
    };
  }

  listRuns(): MemoryRunRecord[] {
    return this.readJsonl<MemoryRunRecord>("run-history.jsonl");
  }

  listFailures(): MemoryFailureRecord[] {
    return this.readJsonl<MemoryFailureRecord>("failure-journal.jsonl");
  }

  listLessonCandidates(): LessonCandidateRecord[] {
    return this.readJsonl<LessonCandidateRecord>("lesson-candidates.jsonl");
  }

  summarize(): MemorySummary {
    const lessons = this.listLessonCandidates();
    return {
      createdAt: isoNow(),
      memoryDir: this.memoryDir,
      runCount: this.listRuns().length,
      failureCount: this.listFailures().length,
      lessonCandidateCount: lessons.filter((l) => l.status === "candidate").length,
      approvedLessonCount: lessons.filter((l) => l.status === "approved").length
    };
  }

  writeSummary(): string {
    this.ensureMemoryDir();
    return this.writeJson("summary.json", this.summarize());
  }

  path(...segments: string[]): string {
    return path.join(this.memoryDir, ...segments);
  }

  private ensureMemoryDir(): void {
    fs.mkdirSync(this.memoryDir, { recursive: true });
  }

  private appendJsonl(relativePath: string, value: unknown): string {
    this.ensureMemoryDir();
    const target = this.path(relativePath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.appendFileSync(target, redactSecrets(JSON.stringify(value)) + "\n", "utf8");
    return target;
  }

  private writeJson(relativePath: string, value: unknown): string {
    this.ensureMemoryDir();
    const target = this.path(relativePath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, redactSecrets(JSON.stringify(value, null, 2)) + "\n", "utf8");
    return target;
  }

  private readJsonl<T>(relativePath: string): T[] {
    const target = this.path(relativePath);
    if (!fs.existsSync(target)) return [];
    const raw = fs.readFileSync(target, "utf8").trim();
    if (!raw) return [];
    return raw.split(/\r?\n/).map((line) => JSON.parse(line) as T);
  }
}
