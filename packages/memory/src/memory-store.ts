import fs from "node:fs";
import path from "node:path";
import { createSeraId, isoNow, redactSecrets, SeraStatus } from "@sera/shared";

export type LessonCandidateStatus = "candidate" | "approved" | "rejected" | "archived";
export type LessonReviewDecision = "approved" | "rejected";
export type LessonActivationDecision = "activated" | "deactivated";
export type RegressionRuleStatus = "active" | "inactive";

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
  source: "kernel-finalize" | "planner-task-queue-v1";
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
  source: "kernel-finalize" | "planner-task-queue-v1";
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
  active: boolean;
  activation: "manual-activation-required" | "activated-as-regression-rule" | "deactivated";
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

export interface ActiveLessonRecord {
  id: string;
  createdAt: string;
  approvedLessonId: string;
  candidateId: string;
  sourceFailureId: string;
  runId: string;
  taskId: string;
  title: string;
  hypothesis: string;
  evidence: string[];
  proposedAction: string;
  activatedBy: string;
  rationale: string;
  active: boolean;
  status: RegressionRuleStatus;
  regressionRuleId: string;
  source: "active-lessons-v1";
  deactivatedAt?: string;
  deactivatedBy?: string;
  deactivationRationale?: string;
}

export interface RegressionRuleRecord {
  id: string;
  createdAt: string;
  approvedLessonId: string;
  activeLessonId: string;
  candidateId: string;
  title: string;
  assertion: string;
  evidence: string[];
  status: RegressionRuleStatus;
  source: "active-lessons-v1";
  deactivatedAt?: string;
  deactivationRationale?: string;
}

export interface LessonActivationDecisionRecord {
  id: string;
  createdAt: string;
  approvedLessonId: string;
  activeLessonId?: string;
  regressionRuleId?: string;
  decision: LessonActivationDecision;
  reviewer: string;
  rationale: string;
  beforeStatus: "inactive" | "active";
  afterStatus: "inactive" | "active";
  source: "active-lessons-v1";
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

export interface LessonActivationResult {
  ok: boolean;
  status: "completed" | "blocked";
  message: string;
  memoryDir: string;
  approvedLesson?: ApprovedLessonRecord;
  activeLesson?: ActiveLessonRecord;
  regressionRule?: RegressionRuleRecord;
  decision?: LessonActivationDecisionRecord;
  approvedLessonPath?: string;
  activeLessonPath?: string;
  regressionRulePath?: string;
  activationDecisionPath?: string;
}

export interface RegressionRuleCheck {
  id: string;
  name: string;
  pass: boolean;
  detail: string;
}

export interface RegressionRuleCheckResult {
  ok: boolean;
  status: "completed" | "blocked";
  message: string;
  memoryDir: string;
  checks: RegressionRuleCheck[];
  activeRuleCount: number;
  inactiveRuleCount: number;
}

export type LessonWorkbenchRecommendation = "review-required" | "approved-inactive" | "active-regression-rule" | "rejected-reviewed";

export interface LessonWorkbenchCandidateItem {
  candidateId: string;
  createdAt: string;
  status: LessonCandidateStatus;
  sourceFailureId: string;
  runId: string;
  taskId: string;
  title: string;
  hypothesis: string;
  evidence: string[];
  evidenceCount: number;
  proposedAction: string;
  recommendation: LessonWorkbenchRecommendation;
}

export interface LessonReviewWorkbenchSummary {
  createdAt: string;
  memoryDir: string;
  pendingCandidateCount: number;
  reviewedCandidateCount: number;
  approvedLessonCount: number;
  rejectedLessonCount: number;
  approvedInactiveCount: number;
  activeLessonCount: number;
  regressionRuleCount: number;
  decisionCount: number;
  activationDecisionCount: number;
  needsReview: boolean;
  source: "lesson-review-workbench-v1";
}

export interface LessonReviewWorkbenchReport {
  createdAt: string;
  memoryDir: string;
  summary: LessonReviewWorkbenchSummary;
  pendingCandidates: LessonWorkbenchCandidateItem[];
  approvedInactive: ApprovedLessonRecord[];
  rejectedLessons: RejectedLessonRecord[];
  activeLessons: ActiveLessonRecord[];
  regressionRules: RegressionRuleRecord[];
  recentDecisions: LessonDecisionRecord[];
  activationDecisions: LessonActivationDecisionRecord[];
  guardrails: string[];
  nextActions: string[];
  source: "lesson-review-workbench-v1";
}

export interface LessonReviewWorkbenchResult {
  ok: true;
  status: "completed";
  message: string;
  memoryDir: string;
  report: LessonReviewWorkbenchReport;
  jsonPath?: string;
  markdownPath?: string;
}

export type RecursiveLearningCycleStatus = "stable" | "needs_human_review" | "ready_for_manual_activation" | "insufficient_evidence";

export interface RecursiveLearningRecommendation {
  action: string;
  reason: string;
  requiredHumanDecision: boolean;
  blockedAutomation: boolean;
}

export interface RecursiveLearningCycleRecord {
  id: string;
  createdAt: string;
  status: RecursiveLearningCycleStatus;
  memoryDir: string;
  runCount: number;
  failureCount: number;
  pendingCandidateCount: number;
  reviewedLessonCount: number;
  approvedInactiveCount: number;
  activeLessonCount: number;
  regressionRuleCount: number;
  recommendations: RecursiveLearningRecommendation[];
  guardrails: string[];
  source: "recursive-learning-v1";
}

export interface RecursiveLearningResult {
  ok: true;
  status: "completed";
  message: string;
  memoryDir: string;
  cycle: RecursiveLearningCycleRecord;
  cyclePath: string;
  summaryPath: string;
}

export interface RecursiveLearningHistoryResult {
  ok: true;
  status: "completed";
  memoryDir: string;
  cycles: RecursiveLearningCycleRecord[];
}

export interface MemorySummary {
  createdAt: string;
  memoryDir: string;
  runCount: number;
  failureCount: number;
  lessonCandidateCount: number;
  approvedLessonCount: number;
  rejectedLessonCount: number;
  activeLessonCount: number;
  regressionRuleCount: number;
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
  source?: "kernel-finalize" | "planner-task-queue-v1";
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
      source: input.source ?? "kernel-finalize"
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
      source: input.source ?? "kernel-finalize"
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

  listActiveLessons(): ActiveLessonRecord[] {
    return this.readJsonl<ActiveLessonRecord>("active-lessons.jsonl");
  }

  listRegressionRules(): RegressionRuleRecord[] {
    return this.readJsonl<RegressionRuleRecord>("regression-rules.jsonl");
  }

  listLessonActivationDecisions(): LessonActivationDecisionRecord[] {
    return this.readJsonl<LessonActivationDecisionRecord>("lesson-activation-decisions.jsonl");
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

  activateApprovedLesson(approvedLessonId: string, reviewer: string, rationale: string): LessonActivationResult {
    this.ensureMemoryDir();
    const cleanReviewer = reviewer.trim() || "local-user";
    const cleanRationale = rationale.trim();
    if (!cleanRationale) {
      return {
        ok: false,
        status: "blocked",
        message: "Lesson activation requires a rationale.",
        memoryDir: this.memoryDir
      };
    }

    const approvedLessons = this.listApprovedLessons();
    const approvedIndex = approvedLessons.findIndex((lesson) => lesson.id === approvedLessonId);
    if (approvedIndex < 0) {
      return {
        ok: false,
        status: "blocked",
        message: `Approved lesson not found: ${approvedLessonId}`,
        memoryDir: this.memoryDir
      };
    }

    const approvedLesson = approvedLessons[approvedIndex];
    if (approvedLesson.active) {
      return {
        ok: false,
        status: "blocked",
        message: `Approved lesson is already active: ${approvedLessonId}`,
        memoryDir: this.memoryDir,
        approvedLesson
      };
    }

    const activeRecords = this.listActiveLessons();
    if (activeRecords.some((lesson) => lesson.approvedLessonId === approvedLessonId && lesson.active && lesson.status === "active")) {
      return {
        ok: false,
        status: "blocked",
        message: `Approved lesson already has an active regression rule: ${approvedLessonId}`,
        memoryDir: this.memoryDir,
        approvedLesson
      };
    }

    const createdAt = isoNow();
    const activeLessonId = createSeraId("active_lesson");
    const regressionRuleId = createSeraId("regression_rule");
    const activeLesson: ActiveLessonRecord = {
      id: activeLessonId,
      createdAt,
      approvedLessonId: approvedLesson.id,
      candidateId: approvedLesson.candidateId,
      sourceFailureId: approvedLesson.sourceFailureId,
      runId: approvedLesson.runId,
      taskId: approvedLesson.taskId,
      title: approvedLesson.title,
      hypothesis: approvedLesson.hypothesis,
      evidence: approvedLesson.evidence,
      proposedAction: approvedLesson.proposedAction,
      activatedBy: cleanReviewer,
      rationale: cleanRationale,
      active: true,
      status: "active",
      regressionRuleId,
      source: "active-lessons-v1"
    };
    const regressionRule: RegressionRuleRecord = {
      id: regressionRuleId,
      createdAt,
      approvedLessonId: approvedLesson.id,
      activeLessonId: activeLesson.id,
      candidateId: approvedLesson.candidateId,
      title: approvedLesson.title,
      assertion: `Approved lesson ${approvedLesson.id} must remain traceable to evidence and must not mutate behavior without an explicit phase-certified implementation.`,
      evidence: approvedLesson.evidence,
      status: "active",
      source: "active-lessons-v1"
    };
    const updatedApproved: ApprovedLessonRecord = {
      ...approvedLesson,
      active: true,
      activation: "activated-as-regression-rule"
    };
    approvedLessons[approvedIndex] = updatedApproved;
    const approvedLessonPath = this.writeJsonl("approved-lessons.jsonl", approvedLessons);
    const activeLessonPath = this.appendJsonl("active-lessons.jsonl", activeLesson);
    const regressionRulePath = this.appendJsonl("regression-rules.jsonl", regressionRule);
    const decision: LessonActivationDecisionRecord = {
      id: createSeraId("activation_decision"),
      createdAt,
      approvedLessonId: approvedLesson.id,
      activeLessonId: activeLesson.id,
      regressionRuleId: regressionRule.id,
      decision: "activated",
      reviewer: cleanReviewer,
      rationale: cleanRationale,
      beforeStatus: "inactive",
      afterStatus: "active",
      source: "active-lessons-v1"
    };
    const activationDecisionPath = this.appendJsonl("lesson-activation-decisions.jsonl", decision);
    this.writeSummary();
    return {
      ok: true,
      status: "completed",
      message: "Approved lesson activated as an auditable regression rule. No runtime behavior was changed.",
      memoryDir: this.memoryDir,
      approvedLesson: updatedApproved,
      activeLesson,
      regressionRule,
      decision,
      approvedLessonPath,
      activeLessonPath,
      regressionRulePath,
      activationDecisionPath
    };
  }

  deactivateActiveLesson(activeLessonId: string, reviewer: string, rationale: string): LessonActivationResult {
    this.ensureMemoryDir();
    const cleanReviewer = reviewer.trim() || "local-user";
    const cleanRationale = rationale.trim();
    if (!cleanRationale) {
      return {
        ok: false,
        status: "blocked",
        message: "Lesson deactivation requires a rationale.",
        memoryDir: this.memoryDir
      };
    }

    const activeLessons = this.listActiveLessons();
    const activeIndex = activeLessons.findIndex((lesson) => lesson.id === activeLessonId);
    if (activeIndex < 0) {
      return {
        ok: false,
        status: "blocked",
        message: `Active lesson not found: ${activeLessonId}`,
        memoryDir: this.memoryDir
      };
    }

    const activeLesson = activeLessons[activeIndex];
    if (!activeLesson.active || activeLesson.status !== "active") {
      return {
        ok: false,
        status: "blocked",
        message: `Active lesson is already inactive: ${activeLessonId}`,
        memoryDir: this.memoryDir,
        activeLesson
      };
    }

    const deactivatedAt = isoNow();
    const updatedActiveLesson: ActiveLessonRecord = {
      ...activeLesson,
      active: false,
      status: "inactive",
      deactivatedAt,
      deactivatedBy: cleanReviewer,
      deactivationRationale: cleanRationale
    };
    activeLessons[activeIndex] = updatedActiveLesson;
    const activeLessonPath = this.writeJsonl("active-lessons.jsonl", activeLessons);

    const rules = this.listRegressionRules();
    const ruleIndex = rules.findIndex((rule) => rule.id === activeLesson.regressionRuleId);
    let regressionRule: RegressionRuleRecord | undefined;
    let regressionRulePath: string | undefined;
    if (ruleIndex >= 0) {
      regressionRule = {
        ...rules[ruleIndex],
        status: "inactive",
        deactivatedAt,
        deactivationRationale: cleanRationale
      };
      rules[ruleIndex] = regressionRule;
      regressionRulePath = this.writeJsonl("regression-rules.jsonl", rules);
    }

    const approvedLessons = this.listApprovedLessons();
    const approvedIndex = approvedLessons.findIndex((lesson) => lesson.id === activeLesson.approvedLessonId);
    let approvedLesson: ApprovedLessonRecord | undefined;
    let approvedLessonPath: string | undefined;
    if (approvedIndex >= 0) {
      approvedLesson = {
        ...approvedLessons[approvedIndex],
        active: false,
        activation: "deactivated"
      };
      approvedLessons[approvedIndex] = approvedLesson;
      approvedLessonPath = this.writeJsonl("approved-lessons.jsonl", approvedLessons);
    }

    const decision: LessonActivationDecisionRecord = {
      id: createSeraId("activation_decision"),
      createdAt: deactivatedAt,
      approvedLessonId: activeLesson.approvedLessonId,
      activeLessonId: activeLesson.id,
      regressionRuleId: activeLesson.regressionRuleId,
      decision: "deactivated",
      reviewer: cleanReviewer,
      rationale: cleanRationale,
      beforeStatus: "active",
      afterStatus: "inactive",
      source: "active-lessons-v1"
    };
    const activationDecisionPath = this.appendJsonl("lesson-activation-decisions.jsonl", decision);
    this.writeSummary();
    return {
      ok: true,
      status: "completed",
      message: "Active lesson deactivated and its regression rule marked inactive.",
      memoryDir: this.memoryDir,
      approvedLesson,
      activeLesson: updatedActiveLesson,
      regressionRule,
      decision,
      approvedLessonPath,
      activeLessonPath,
      regressionRulePath,
      activationDecisionPath
    };
  }

  checkRegressionRules(): RegressionRuleCheckResult {
    const activeLessons = this.listActiveLessons();
    const rules = this.listRegressionRules();
    const activeRules = rules.filter((rule) => rule.status === "active");
    const inactiveRules = rules.filter((rule) => rule.status === "inactive");
    const checks: RegressionRuleCheck[] = activeRules.map((rule) => {
      const activeLesson = activeLessons.find((lesson) => lesson.id === rule.activeLessonId);
      const pass = Boolean(activeLesson && activeLesson.active && activeLesson.status === "active" && activeLesson.regressionRuleId === rule.id && rule.evidence.length > 0);
      return {
        id: `regression_${rule.id}`,
        name: `Regression rule is traceable and active: ${rule.title}`,
        pass,
        detail: pass ? `Traceable to active lesson ${rule.activeLessonId}` : `Missing active lesson or evidence for rule ${rule.id}`
      };
    });
    return {
      ok: checks.every((check) => check.pass),
      status: "completed",
      message: activeRules.length === 0 ? "No active regression rules to check." : `Checked ${activeRules.length} active regression rule(s).`,
      memoryDir: this.memoryDir,
      checks,
      activeRuleCount: activeRules.length,
      inactiveRuleCount: inactiveRules.length
    };
  }

  getLessonReviewWorkbench(): LessonReviewWorkbenchResult {
    const report = this.createLessonReviewWorkbenchReport();
    return {
      ok: true,
      status: "completed",
      message: report.summary.needsReview ? "Lesson review workbench has pending human review items." : "Lesson review workbench has no pending lesson candidates.",
      memoryDir: this.memoryDir,
      report
    };
  }

  writeLessonReviewWorkbench(): LessonReviewWorkbenchResult {
    const report = this.createLessonReviewWorkbenchReport();
    const jsonPath = this.writeJson("lesson-review-workbench.json", report);
    const markdownPath = this.path("lesson-review-workbench.md");
    fs.mkdirSync(path.dirname(markdownPath), { recursive: true });
    fs.writeFileSync(markdownPath, redactSecrets(this.renderLessonReviewWorkbenchMarkdown(report)) + "\n", "utf8");
    return {
      ok: true,
      status: "completed",
      message: report.summary.needsReview ? "Lesson review workbench written with pending human review items." : "Lesson review workbench written with no pending lesson candidates.",
      memoryDir: this.memoryDir,
      report,
      jsonPath,
      markdownPath
    };
  }

  runRecursiveLearningCycle(): RecursiveLearningResult {
    const cycle = this.createRecursiveLearningCycle();
    const cyclePath = this.appendJsonl("recursive-learning-cycles.jsonl", cycle);
    const cycles = this.listRecursiveLearningCycles();
    const summaryPath = this.writeJson("recursive-learning-summary.json", {
      createdAt: isoNow(),
      memoryDir: this.memoryDir,
      cycleCount: cycles.length,
      latestCycle: cycle,
      source: "recursive-learning-v1"
    });
    this.writeSummary();
    return {
      ok: true,
      status: "completed",
      message: "Recursive learning cycle recorded from local evidence without changing lesson state.",
      memoryDir: this.memoryDir,
      cycle,
      cyclePath,
      summaryPath
    };
  }

  listRecursiveLearningCycles(): RecursiveLearningCycleRecord[] {
    return this.readJsonl<RecursiveLearningCycleRecord>("recursive-learning-cycles.jsonl");
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
      rejectedLessonCount: this.listRejectedLessons().length,
      activeLessonCount: this.listActiveLessons().filter((lesson) => lesson.active && lesson.status === "active").length,
      regressionRuleCount: this.listRegressionRules().filter((rule) => rule.status === "active").length
    };
  }

  writeSummary(): string {
    this.ensureMemoryDir();
    return this.writeJson("summary.json", this.summarize());
  }

  path(...segments: string[]): string {
    return path.join(this.memoryDir, ...segments);
  }

  private createRecursiveLearningCycle(): RecursiveLearningCycleRecord {
    const createdAt = isoNow();
    const memorySummary = this.summarize();
    const workbench = this.createLessonReviewWorkbenchReport();
    const recommendations = this.createRecursiveLearningRecommendations(memorySummary, workbench);
    return {
      id: createSeraId("recursive_cycle"),
      createdAt,
      status: this.resolveRecursiveLearningCycleStatus(memorySummary, workbench),
      memoryDir: this.memoryDir,
      runCount: memorySummary.runCount,
      failureCount: memorySummary.failureCount,
      pendingCandidateCount: workbench.summary.pendingCandidateCount,
      reviewedLessonCount: workbench.summary.reviewedCandidateCount,
      approvedInactiveCount: workbench.summary.approvedInactiveCount,
      activeLessonCount: workbench.summary.activeLessonCount,
      regressionRuleCount: workbench.summary.regressionRuleCount,
      recommendations,
      guardrails: [
        "Recursive learning is report-only: it does not approve, reject, activate, deactivate, execute tasks, or mutate source files.",
        "Every lesson approval, rejection, activation, or deactivation still requires an explicit human rationale.",
        "The certified recursive learning path must run without paid APIs, paid subscriptions, hosted databases, hosted model providers, or cloud-only services.",
        "Local evidence may inform next actions, but authority remains with the operator until a future phase explicitly certifies more automation."
      ],
      source: "recursive-learning-v1"
    };
  }

  private resolveRecursiveLearningCycleStatus(memorySummary: MemorySummary, workbench: LessonReviewWorkbenchReport): RecursiveLearningCycleStatus {
    if (workbench.summary.pendingCandidateCount > 0) return "needs_human_review";
    if (workbench.summary.approvedInactiveCount > 0) return "ready_for_manual_activation";
    return "stable";
  }

  private createRecursiveLearningRecommendations(memorySummary: MemorySummary, workbench: LessonReviewWorkbenchReport): RecursiveLearningRecommendation[] {
    const recommendations: RecursiveLearningRecommendation[] = [];
    if (workbench.summary.pendingCandidateCount > 0) {
      recommendations.push({
        action: "review_pending_candidates",
        reason: "There are " + workbench.summary.pendingCandidateCount + " pending lesson candidate(s) requiring explicit human approval or rejection.",
        requiredHumanDecision: true,
        blockedAutomation: true
      });
    }
    if (workbench.summary.approvedInactiveCount > 0) {
      recommendations.push({
        action: "consider_manual_activation",
        reason: "There are " + workbench.summary.approvedInactiveCount + " approved inactive lesson(s) that may be manually activated as regression rules.",
        requiredHumanDecision: true,
        blockedAutomation: true
      });
    }
    if (workbench.summary.activeLessonCount > 0) {
      recommendations.push({
        action: "check_active_regression_rules",
        reason: "There are active lesson regression rules; keep them auditable through the existing rule checker.",
        requiredHumanDecision: false,
        blockedAutomation: true
      });
    }
    if (memorySummary.failureCount > 0 && workbench.summary.pendingCandidateCount === 0 && workbench.summary.reviewedCandidateCount === 0) {
      recommendations.push({
        action: "inspect_failure_coverage",
        reason: "Failures exist, but no pending or reviewed lessons are visible. Inspect memory coverage before trusting the learning loop.",
        requiredHumanDecision: true,
        blockedAutomation: true
      });
    }
    if (recommendations.length === 0) {
      recommendations.push({
        action: "continue_monitoring",
        reason: "No pending lesson review or manual activation action is required right now.",
        requiredHumanDecision: false,
        blockedAutomation: true
      });
    }
    recommendations.push({
      action: "preserve_free_local_core",
      reason: "Recursive learning must remain subscription-free and local-first through Phase 45.",
      requiredHumanDecision: false,
      blockedAutomation: true
    });
    return recommendations;
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

  private createLessonReviewWorkbenchReport(): LessonReviewWorkbenchReport {
    const createdAt = isoNow();
    const candidates = this.listLessonCandidates();
    const pendingCandidates = candidates
      .filter((candidate) => candidate.status === "candidate")
      .map((candidate) => this.toLessonWorkbenchCandidateItem(candidate, "review-required"));
    const approved = this.listApprovedLessons();
    const rejectedLessons = this.listRejectedLessons();
    const activeLessons = this.listActiveLessons().filter((lesson) => lesson.active && lesson.status === "active");
    const regressionRules = this.listRegressionRules().filter((rule) => rule.status === "active");
    const decisions = this.listLessonDecisions();
    const activationDecisions = this.listLessonActivationDecisions();
    const approvedInactive = approved.filter((lesson) => !lesson.active || lesson.activation === "manual-activation-required" || lesson.activation === "deactivated");
    const summary: LessonReviewWorkbenchSummary = {
      createdAt,
      memoryDir: this.memoryDir,
      pendingCandidateCount: pendingCandidates.length,
      reviewedCandidateCount: candidates.filter((candidate) => candidate.status === "approved" || candidate.status === "rejected").length,
      approvedLessonCount: approved.length,
      rejectedLessonCount: rejectedLessons.length,
      approvedInactiveCount: approvedInactive.length,
      activeLessonCount: activeLessons.length,
      regressionRuleCount: regressionRules.length,
      decisionCount: decisions.length,
      activationDecisionCount: activationDecisions.length,
      needsReview: pendingCandidates.length > 0,
      source: "lesson-review-workbench-v1"
    };
    return {
      createdAt,
      memoryDir: this.memoryDir,
      summary,
      pendingCandidates,
      approvedInactive,
      rejectedLessons,
      activeLessons,
      regressionRules,
      recentDecisions: decisions.slice(-10).reverse(),
      activationDecisions: activationDecisions.slice(-10).reverse(),
      guardrails: [
        "The workbench is review-only: it does not approve, reject, activate, or deactivate lessons.",
        "Every approval or rejection still requires an explicit reviewer and rationale.",
        "Approved lessons remain inactive until an explicit activation command creates an auditable regression rule.",
        "Active lesson records document guardrails; they do not silently mutate runtime behavior."
      ],
      nextActions: this.createLessonWorkbenchNextActions(summary),
      source: "lesson-review-workbench-v1"
    };
  }

  private toLessonWorkbenchCandidateItem(candidate: LessonCandidateRecord, recommendation: LessonWorkbenchRecommendation): LessonWorkbenchCandidateItem {
    return {
      candidateId: candidate.id,
      createdAt: candidate.createdAt,
      status: candidate.status,
      sourceFailureId: candidate.sourceFailureId,
      runId: candidate.runId,
      taskId: candidate.taskId,
      title: candidate.title,
      hypothesis: candidate.hypothesis,
      evidence: candidate.evidence,
      evidenceCount: candidate.evidence.length,
      proposedAction: candidate.proposedAction,
      recommendation
    };
  }

  private createLessonWorkbenchNextActions(summary: LessonReviewWorkbenchSummary): string[] {
    const actions: string[] = [];
    if (summary.pendingCandidateCount > 0) {
      actions.push(`Review ${summary.pendingCandidateCount} pending lesson candidate(s) with a human rationale before approval or rejection.`);
    }
    if (summary.approvedInactiveCount > 0) {
      actions.push(`Consider whether ${summary.approvedInactiveCount} approved inactive lesson(s) should receive explicit manual activation as regression rules.`);
    }
    if (summary.pendingCandidateCount === 0 && summary.approvedInactiveCount === 0) {
      actions.push("No pending lesson review or manual activation action is required right now.");
    }
    actions.push("Keep automatic lesson activation disabled unless a future phase explicitly certifies that authority.");
    return actions;
  }

  private renderLessonReviewWorkbenchMarkdown(report: LessonReviewWorkbenchReport): string {
    const pending = report.pendingCandidates.length === 0
      ? "- None"
      : report.pendingCandidates.map((candidate) => [
          `- ${candidate.candidateId}: ${candidate.title}`,
          `  - hypothesis: ${candidate.hypothesis}`,
          `  - evidence count: ${candidate.evidenceCount}`,
          `  - proposed action: ${candidate.proposedAction}`
        ].join("\n")).join("\n");
    const approvedInactive = report.approvedInactive.length === 0
      ? "- None"
      : report.approvedInactive.map((lesson) => `- ${lesson.id}: ${lesson.title} (${lesson.activation})`).join("\n");
    const active = report.activeLessons.length === 0
      ? "- None"
      : report.activeLessons.map((lesson) => `- ${lesson.id}: ${lesson.title} -> ${lesson.regressionRuleId}`).join("\n");
    return [
      "# S.E.R.A. Lesson Review Workbench",
      "",
      `Generated: ${report.createdAt}`,
      `Memory Directory: ${report.memoryDir}`,
      "",
      "## Summary",
      "",
      `- Pending candidates: ${report.summary.pendingCandidateCount}`,
      `- Reviewed candidates: ${report.summary.reviewedCandidateCount}`,
      `- Approved lessons: ${report.summary.approvedLessonCount}`,
      `- Approved inactive lessons: ${report.summary.approvedInactiveCount}`,
      `- Rejected lessons: ${report.summary.rejectedLessonCount}`,
      `- Active lessons: ${report.summary.activeLessonCount}`,
      `- Active regression rules: ${report.summary.regressionRuleCount}`,
      `- Review decisions: ${report.summary.decisionCount}`,
      `- Activation decisions: ${report.summary.activationDecisionCount}`,
      "",
      "## Pending Lesson Candidates",
      "",
      pending,
      "",
      "## Approved but Inactive Lessons",
      "",
      approvedInactive,
      "",
      "## Active Lesson Regression Rules",
      "",
      active,
      "",
      "## Manual Review Guardrails",
      "",
      ...report.guardrails.map((guardrail) => `- ${guardrail}`),
      "",
      "## Recommended Next Actions",
      "",
      ...report.nextActions.map((action) => `- ${action}`)
    ].join("\n");
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
