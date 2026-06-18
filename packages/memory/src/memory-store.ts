import fs from "node:fs";
import path from "node:path";
import { createSeraId, isoNow, redactSecrets, SeraStatus } from "@sera/shared";

export type LessonCandidateStatus = "candidate" | "approved" | "rejected" | "archived";
export type LessonReviewDecision = "approved" | "rejected";

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
  reviewedAt?: string;
  reviewedBy?: string;
  reviewDecision?: LessonReviewDecision;
  reviewRationale?: string;
}

export interface ApprovedLessonRecord {
  id: string;
  createdAt: string;
  candidateId: string;
  sourceFailureId: string;
  runId: string;
  taskId: string;
  title: string;
  hypothesis: string;
  evidence: string[];
  approvedBy: string;
  rationale: string;
  proposedAction: string;
  active: false;
  activation: "manual-activation-required";
  source: "lesson-review-v1";
}

export interface RejectedLessonRecord {
  id: string;
  createdAt: string;
  candidateId: string;
  sourceFailureId: string;
  runId: string;
  taskId: string;
  title: string;
  rejectedBy: string;
  rationale: string;
  evidence: string[];
  active: false;
  source: "lesson-review-v1";
}

export interface LessonDecisionRecord {
  id: string;
  createdAt: string;
  candidateId: string;
  decision: LessonReviewDecision;
  reviewer: string;
  rationale: string;
  beforeStatus: LessonCandidateStatus;
  afterStatus: LessonCandidateStatus;
  source: "lesson-review-v1";
}

export interface LessonReviewResult {
  ok: boolean;
  status: "completed" | "blocked";
  message: string;
  memoryDir: string;
  candidate?: LessonCandidateRecord;
  approvedLesson?: ApprovedLessonRecord;
  rejectedLesson?: RejectedLessonRecord;
  decision?: LessonDecisionRecord;
  candidatePath?: string;
  approvedLessonPath?: string;
  rejectedLessonPath?: string;
  decisionPath?: string;
}

export interface MemorySummary {
  createdAt: string;
  memoryDir: string;
  runCount: number;
  failureCount: number;
  lessonCandidateCount: number;
  approvedLessonCount: number;
  rejectedLessonCount: number;
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

  listApprovedLessons(): ApprovedLessonRecord[] {
    return this.readJsonl<ApprovedLessonRecord>("approved-lessons.jsonl");
  }

  listRejectedLessons(): RejectedLessonRecord[] {
    return this.readJsonl<RejectedLessonRecord>("rejected-lessons.jsonl");
  }

  listLessonDecisions(): LessonDecisionRecord[] {
    return this.readJsonl<LessonDecisionRecord>("lesson-decisions.jsonl");
  }

  inspectLessonCandidate(candidateId: string): LessonReviewResult {
    const candidate = this.findLessonCandidate(candidateId);
    if (!candidate) {
      return {
        ok: false,
        status: "blocked",
        message: `Lesson candidate not found: ${candidateId}`,
        memoryDir: this.memoryDir
      };
    }

    return {
      ok: true,
      status: "completed",
      message: `Lesson candidate found: ${candidate.id}`,
      memoryDir: this.memoryDir,
      candidate,
      candidatePath: this.path("lesson-candidates.jsonl")
    };
  }

  approveLessonCandidate(candidateId: string, reviewer: string, rationale: string): LessonReviewResult {
    return this.reviewLessonCandidate(candidateId, "approved", reviewer, rationale);
  }

  rejectLessonCandidate(candidateId: string, reviewer: string, rationale: string): LessonReviewResult {
    return this.reviewLessonCandidate(candidateId, "rejected", reviewer, rationale);
  }

  summarize(): MemorySummary {
    const lessons = this.listLessonCandidates();
    return {
      createdAt: isoNow(),
      memoryDir: this.memoryDir,
      runCount: this.listRuns().length,
      failureCount: this.listFailures().length,
      lessonCandidateCount: lessons.filter((l) => l.status === "candidate").length,
      approvedLessonCount: this.listApprovedLessons().length,
      rejectedLessonCount: this.listRejectedLessons().length
    };
  }

  writeSummary(): string {
    this.ensureMemoryDir();
    return this.writeJson("summary.json", this.summarize());
  }

  path(...segments: string[]): string {
    return path.join(this.memoryDir, ...segments);
  }

  private reviewLessonCandidate(candidateId: string, decisionType: LessonReviewDecision, reviewer: string, rationale: string): LessonReviewResult {
    this.ensureMemoryDir();
    const cleanReviewer = reviewer.trim() || "local-user";
    const cleanRationale = rationale.trim();
    if (!cleanRationale) {
      return {
        ok: false,
        status: "blocked",
        message: "Lesson review requires a rationale.",
        memoryDir: this.memoryDir
      };
    }

    const lessons = this.listLessonCandidates();
    const index = lessons.findIndex((lesson) => lesson.id === candidateId);
    if (index < 0) {
      return {
        ok: false,
        status: "blocked",
        message: `Lesson candidate not found: ${candidateId}`,
        memoryDir: this.memoryDir
      };
    }

    const candidate = lessons[index];
    if (candidate.status !== "candidate") {
      return {
        ok: false,
        status: "blocked",
        message: `Lesson candidate is not pending review. Current status: ${candidate.status}.`,
        memoryDir: this.memoryDir,
        candidate
      };
    }

    const reviewedAt = isoNow();
    const updatedCandidate: LessonCandidateRecord = {
      ...candidate,
      status: decisionType,
      reviewedAt,
      reviewedBy: cleanReviewer,
      reviewDecision: decisionType,
      reviewRationale: cleanRationale
    };
    lessons[index] = updatedCandidate;
    this.writeJsonl("lesson-candidates.jsonl", lessons);

    const decision: LessonDecisionRecord = {
      id: createSeraId("lesson_decision"),
      createdAt: reviewedAt,
      candidateId: candidate.id,
      decision: decisionType,
      reviewer: cleanReviewer,
      rationale: cleanRationale,
      beforeStatus: candidate.status,
      afterStatus: decisionType,
      source: "lesson-review-v1"
    };
    const decisionPath = this.appendJsonl("lesson-decisions.jsonl", decision);

    if (decisionType === "approved") {
      const approvedLesson: ApprovedLessonRecord = {
        id: createSeraId("approved_lesson"),
        createdAt: reviewedAt,
        candidateId: candidate.id,
        sourceFailureId: candidate.sourceFailureId,
        runId: candidate.runId,
        taskId: candidate.taskId,
        title: candidate.title,
        hypothesis: candidate.hypothesis,
        evidence: candidate.evidence,
        approvedBy: cleanReviewer,
        rationale: cleanRationale,
        proposedAction: candidate.proposedAction,
        active: false,
        activation: "manual-activation-required",
        source: "lesson-review-v1"
      };
      const approvedLessonPath = this.appendJsonl("approved-lessons.jsonl", approvedLesson);
      this.writeSummary();
      return {
        ok: true,
        status: "completed",
        message: "Lesson candidate approved and stored as an inactive approved lesson.",
        memoryDir: this.memoryDir,
        candidate: updatedCandidate,
        approvedLesson,
        decision,
        candidatePath: this.path("lesson-candidates.jsonl"),
        approvedLessonPath,
        decisionPath
      };
    }

    const rejectedLesson: RejectedLessonRecord = {
      id: createSeraId("rejected_lesson"),
      createdAt: reviewedAt,
      candidateId: candidate.id,
      sourceFailureId: candidate.sourceFailureId,
      runId: candidate.runId,
      taskId: candidate.taskId,
      title: candidate.title,
      rejectedBy: cleanReviewer,
      rationale: cleanRationale,
      evidence: candidate.evidence,
      active: false,
      source: "lesson-review-v1"
    };
    const rejectedLessonPath = this.appendJsonl("rejected-lessons.jsonl", rejectedLesson);
    this.writeSummary();
    return {
      ok: true,
      status: "completed",
      message: "Lesson candidate rejected and stored in the rejected lesson record.",
      memoryDir: this.memoryDir,
      candidate: updatedCandidate,
      rejectedLesson,
      decision,
      candidatePath: this.path("lesson-candidates.jsonl"),
      rejectedLessonPath,
      decisionPath
    };
  }

  private findLessonCandidate(candidateId: string): LessonCandidateRecord | undefined {
    return this.listLessonCandidates().find((lesson) => lesson.id === candidateId);
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

  private writeJsonl(relativePath: string, values: unknown[]): string {
    this.ensureMemoryDir();
    const target = this.path(relativePath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    const raw = values.map((value) => redactSecrets(JSON.stringify(value))).join("\n");
    fs.writeFileSync(target, raw ? `${raw}\n` : "", "utf8");
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
