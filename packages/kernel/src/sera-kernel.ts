import path from "node:path";
import { AutonomousDevLoopInput, AutonomousDevLoopListResult, AutonomousDevLoopResult, AutonomousDevLoopSummaryResult, AutonomousDevLoopWorker } from "@sera/autonomy";
import { ArtifactStore } from "@sera/artifacts";
import { SafetyPolicy } from "@sera/safety";
import {
  ActiveLessonRecord,
  ApprovedLessonRecord,
  LessonActivationDecisionRecord,
  LessonActivationResult,
  LessonCandidateRecord,
  LessonDecisionRecord,
  LessonReviewDecision,
  LessonReviewResult,
  MemoryFailureRecord,
  MemoryRunRecord,
  MemoryStore,
  MemorySummary,
  RejectedLessonRecord,
  RegressionRuleCheckResult,
  RegressionRuleRecord,
  LessonReviewWorkbenchResult,
  RecursiveLearningResult,
  RecursiveLearningHistoryResult
} from "@sera/memory";
import {
  KnowledgeDirectoryIngestResult,
  KnowledgeIngestResult,
  KnowledgeInspectResult,
  KnowledgeListResult,
  KnowledgeSearchResult,
  KnowledgeStore,
  KnowledgeSummaryResult
} from "@sera/knowledge";
import {
  ResearchHistoryKind,
  ResearchKnowledgeAnswerResult,
  ResearchKnowledgeComparisonResult,
  ResearchKnowledgeHistoryResult,
  ResearchKnowledgeStoreSummaryResult,
  ResearchKnowledgeSummaryResult,
  ResearchKnowledgeWorker
} from "@sera/research";
import {
  ModelInvocationInput,
  ModelInvocationResult,
  ModelProviderHistoryResult,
  ModelProviderListResult,
  ModelProviderStore,
  ModelProviderSummaryResult,
  LocalModelInvocationInput,
  LocalModelProviderReadinessResult
} from "@sera/model-provider";
import {
  OperatorConsoleHealthResult,
  OperatorConsoleHistoryResult,
  OperatorConsoleReportResult,
  OperatorConsoleStatusResult,
  OperatorConsoleStore,
  OperatorConsoleSummaryResult
} from "@sera/operator-console";
import {
  CreateQueuedTaskInput,
  QueuedTaskRecord,
  QueuedTaskStatus,
  TaskQueueEventRecord,
  TaskQueueEventsResult,
  TaskQueueListResult,
  TaskQueueResult,
  TaskQueueStore,
  TaskQueueSummary,
  TaskQueueSummaryResult
} from "@sera/planner";
import { FileTool, ShellTool } from "@sera/tools";
import { SelfImprovementMode, SelfImprovementResult, SelfImprovementWorker } from "@sera/self-improvement";
import {
  DeveloperEditMode,
  DeveloperEditResult,
  DeveloperInspectResult,
  DeveloperPatchMode,
  DeveloperPatchOperation,
  DeveloperPatchResult,
  DeveloperValidationResult,
  DeveloperWorker,
  DeveloperMultiPatchMode,
  DeveloperMultiPatchResult,
  DeveloperMultiPatchTarget,
  DeveloperMultiValidationContext,
  MultiFileDeveloperWorker
} from "@sera/workers";
import { WorkspaceManager } from "@sera/workspace";
import { createSeraId, isoNow, SeraFinalReport, SeraPlan, SeraResult, SeraRun, SeraStatus, SeraTask } from "@sera/shared";

export interface KernelOptions {
  rootDir: string;
}

export interface DeveloperEditTaskInput {
  relativePath: string;
  find: string;
  replaceWith: string;
  mode: DeveloperEditMode;
  validate?: (context: {
    projectRoot: string;
    absolutePath: string;
    relativePath: string;
    before: string;
    after: string;
  }) => DeveloperValidationResult;
}

export interface DeveloperInspectTaskInput {
  relativePath: string;
}

export interface DeveloperPatchValidationCommand {
  command: string;
  args: string[];
}

export interface DeveloperMultiPatchTaskInput {
  targets: DeveloperMultiPatchTarget[];
  mode: DeveloperMultiPatchMode;
  validate?: (context: DeveloperMultiValidationContext) => DeveloperValidationResult;
  validationCommand?: DeveloperPatchValidationCommand;
}

export interface DeveloperPatchTaskInput {
  relativePath: string;
  operations: DeveloperPatchOperation[];
  mode: DeveloperPatchMode;
  validate?: (context: {
    projectRoot: string;
    absolutePath: string;
    relativePath: string;
    before: string;
    after: string;
  }) => DeveloperValidationResult;
  validationCommand?: DeveloperPatchValidationCommand;
}

export interface SelfImprovementTaskInput {
  goal: string;
  relativePath: string;
  operations: DeveloperPatchOperation[];
  mode: SelfImprovementMode;
  validate?: (context: {
    projectRoot: string;
    absolutePath: string;
    relativePath: string;
    before: string;
    after: string;
  }) => DeveloperValidationResult;
  validationCommand?: DeveloperPatchValidationCommand;
}

export interface DeveloperEditTaskResult extends SeraResult {
  developer: DeveloperEditResult;
}

export interface DeveloperInspectTaskResult extends SeraResult {
  inspection: DeveloperInspectResult;
}

export interface DeveloperPatchTaskResult extends SeraResult {
  patch: DeveloperPatchResult;
}

export interface DeveloperMultiPatchTaskResult extends SeraResult {
  multiPatch: DeveloperMultiPatchResult;
}

export interface SelfImprovementTaskResult extends SeraResult {
  selfImprovement: SelfImprovementResult;
}

export interface MemorySummaryTaskResult {
  ok: true;
  status: "completed";
  summary: MemorySummary;
  memoryDir: string;
}

export interface MemoryListTaskResult {
  ok: true;
  status: "completed";
  memoryDir: string;
  runs?: MemoryRunRecord[];
  failures?: MemoryFailureRecord[];
  lessons?: LessonCandidateRecord[];
}

export interface LessonListTaskResult {
  ok: true;
  status: "completed";
  memoryDir: string;
  candidates?: LessonCandidateRecord[];
  approved?: ApprovedLessonRecord[];
  rejected?: RejectedLessonRecord[];
  decisions?: LessonDecisionRecord[];
  active?: ActiveLessonRecord[];
  rules?: RegressionRuleRecord[];
  activations?: LessonActivationDecisionRecord[];
}

export interface LessonInspectTaskResult extends LessonReviewResult {}

export interface LessonReviewTaskInput {
  candidateId: string;
  decision: LessonReviewDecision;
  reviewer?: string;
  rationale: string;
}

export interface LessonReviewTaskResult extends LessonReviewResult {}

export interface LessonActivationTaskInput {
  approvedLessonId?: string;
  activeLessonId?: string;
  reviewer?: string;
  rationale: string;
}

export interface LessonActivationTaskResult extends LessonActivationResult {}

export interface RegressionRuleCheckTaskResult extends RegressionRuleCheckResult {}
export interface LessonReviewWorkbenchTaskResult extends LessonReviewWorkbenchResult {}
export interface RecursiveLearningTaskResult extends RecursiveLearningResult {}
export interface RecursiveLearningHistoryTaskResult extends RecursiveLearningHistoryResult {}

export interface CreateQueuedTaskTaskInput extends CreateQueuedTaskInput {}

export interface TaskQueueTaskResult extends TaskQueueResult {}

export interface TaskQueueListTaskResult extends TaskQueueListResult {}

export interface TaskQueueEventsTaskResult extends TaskQueueEventsResult {}

export interface TaskQueueSummaryTaskResult extends TaskQueueSummaryResult {}

export interface KnowledgeIngestFileTaskInput {
  relativePath: string;
  title?: string;
}

export interface KnowledgeIngestDirectoryTaskInput {
  relativeDir: string;
  extensions?: string[];
  limit?: number;
}

export interface KnowledgeIngestFileTaskResult extends KnowledgeIngestResult {}

export interface KnowledgeIngestDirectoryTaskResult extends KnowledgeDirectoryIngestResult {}

export interface KnowledgeListTaskResult extends KnowledgeListResult {}

export interface KnowledgeInspectTaskResult extends KnowledgeInspectResult {}

export interface KnowledgeSearchTaskResult extends KnowledgeSearchResult {}

export interface KnowledgeSummaryTaskResult extends KnowledgeSummaryResult {}

export interface ResearchKnowledgeAnswerTaskResult extends ResearchKnowledgeAnswerResult {}
export interface ResearchKnowledgeComparisonTaskResult extends ResearchKnowledgeComparisonResult {}
export interface ResearchKnowledgeSummaryTaskResult extends ResearchKnowledgeSummaryResult {}
export interface ResearchKnowledgeHistoryTaskResult extends ResearchKnowledgeHistoryResult {}
export interface ResearchKnowledgeStoreSummaryTaskResult extends ResearchKnowledgeStoreSummaryResult {}
export interface ModelProviderListTaskResult extends ModelProviderListResult {}

export interface ModelInvocationTaskInput extends ModelInvocationInput {}

export interface ModelInvocationTaskResult extends ModelInvocationResult {}

export interface ModelProviderHistoryTaskResult extends ModelProviderHistoryResult {}

export interface ModelProviderSummaryTaskResult extends ModelProviderSummaryResult {}
export interface LocalModelProviderReadinessTaskResult extends LocalModelProviderReadinessResult {}
export interface LocalModelInvocationTaskInput extends LocalModelInvocationInput {}

export interface AutonomousDevLoopTaskInput extends AutonomousDevLoopInput {
  validationCommand?: DeveloperPatchValidationCommand;
}
export interface AutonomousDevLoopTaskResult extends SeraResult { autonomy: AutonomousDevLoopResult; }
export interface AutonomousDevLoopListTaskResult extends AutonomousDevLoopListResult {}
export interface AutonomousDevLoopSummaryTaskResult extends AutonomousDevLoopSummaryResult {}
export interface OperatorConsoleStatusTaskResult extends OperatorConsoleStatusResult {}
export interface OperatorConsoleHealthTaskResult extends OperatorConsoleHealthResult {}
export interface OperatorConsoleReportTaskResult extends OperatorConsoleReportResult {}
export interface OperatorConsoleHistoryTaskResult extends OperatorConsoleHistoryResult {}
export interface OperatorConsoleSummaryTaskResult extends OperatorConsoleSummaryResult {}

export class SeraKernel {
  private readonly workspaceManager = new WorkspaceManager();

  constructor(private readonly options: KernelOptions) {}

  runTask(prompt: string): SeraResult {
    const task = this.createTask(prompt);
    const run = this.workspaceManager.createRun({ rootDir: this.options.rootDir, taskId: task.id });
    const artifacts = new ArtifactStore(run.runDir);
    const safety = new SafetyPolicy({ workspaceDir: run.workspaceDir, allowedCommands: ["node", "npm"] });
    const fileTool = new FileTool(run.id, safety, artifacts);

    const plan = this.createStarterPlan(task.id, prompt);
    this.writeRunStartArtifacts(artifacts, task, plan, run, prompt);

    const normalized = prompt.toLowerCase();
    let resultPath: string | undefined;
    let status: SeraStatus = "completed";
    let summary = "S.E.R.A. completed the starter deterministic task.";

    if (normalized.includes("create hello file") || normalized.includes("hello file")) {
      const write = fileTool.writeText(path.join(run.workspaceDir, "hello.txt"), "Hello from S.E.R.A.\n");
      if (!write.ok) {
        status = "blocked";
        summary = write.message;
      } else {
        status = "completed_with_changes";
        resultPath = write.path;
        summary = "Created hello.txt inside the isolated workspace.";
      }
      artifacts.appendJsonl("steps.jsonl", { ts: isoNow(), runId: run.id, step: "write_hello_file", status, resultPath });
    } else {
      const write = fileTool.writeText(path.join(run.workspaceDir, "task-note.txt"), `Task recorded for future worker support:\n${prompt}\n`);
      if (!write.ok) {
        status = "blocked";
        summary = write.message;
      } else {
        status = "completed_with_changes";
        resultPath = write.path;
        summary = "Task recorded in task-note.txt. No advanced worker is enabled yet.";
      }
      artifacts.appendJsonl("steps.jsonl", { ts: isoNow(), runId: run.id, step: "write_task_note", status, resultPath });
    }

    return this.finalizeRun({ artifacts, run, task, status, summary });
  }

  runDeveloperInspectTask(input: DeveloperInspectTaskInput): DeveloperInspectTaskResult {
    const prompt = `developer inspect ${input.relativePath}`;
    const task = this.createTask(prompt);
    const run = this.workspaceManager.createRun({ rootDir: this.options.rootDir, taskId: task.id });
    const artifacts = new ArtifactStore(run.runDir);
    const projectRoot = path.resolve(this.options.rootDir);
    const safety = new SafetyPolicy({ workspaceDir: projectRoot, allowedCommands: ["node", "npm"] });
    const plan = this.createDeveloperInspectPlan(task.id, input);
    this.writeRunStartArtifacts(artifacts, task, plan, run, prompt);

    const worker = new DeveloperWorker();
    const inspection = worker.inspect({
      runId: run.id,
      projectRoot,
      relativePath: input.relativePath,
      artifacts,
      safety
    });

    artifacts.appendJsonl("steps.jsonl", {
      ts: isoNow(),
      runId: run.id,
      step: "developer_inspect_file",
      status: inspection.status,
      relativePath: inspection.relativePath,
      artifactPath: inspection.artifactPath
    });

    const base = this.finalizeRun({
      artifacts,
      run,
      task,
      status: inspection.status,
      summary: inspection.message,
      extraArtifacts: ["artifacts/inspections"]
    });
    return { ...base, inspection };
  }

  runDeveloperEditTask(input: DeveloperEditTaskInput): DeveloperEditTaskResult {
    const prompt = `developer ${input.mode} edit ${input.relativePath}`;
    const task = this.createTask(prompt);
    const run = this.workspaceManager.createRun({ rootDir: this.options.rootDir, taskId: task.id });
    const artifacts = new ArtifactStore(run.runDir);
    const projectRoot = path.resolve(this.options.rootDir);
    const safety = new SafetyPolicy({ workspaceDir: projectRoot, allowedCommands: ["node", "npm"] });
    const plan = this.createDeveloperEditPlan(task.id, input);
    this.writeRunStartArtifacts(artifacts, task, plan, run, prompt);

    const worker = new DeveloperWorker();
    const developer = worker.edit({
      runId: run.id,
      projectRoot,
      relativePath: input.relativePath,
      find: input.find,
      replaceWith: input.replaceWith,
      mode: input.mode,
      artifacts,
      safety,
      validate: input.validate
    });

    artifacts.appendJsonl("steps.jsonl", {
      ts: isoNow(),
      runId: run.id,
      step: input.mode === "suggested" ? "developer_suggest_edit" : "developer_direct_edit",
      status: developer.status,
      relativePath: developer.relativePath,
      changed: developer.changed,
      occurrences: developer.occurrences
    });

    const base = this.finalizeRun({
      artifacts,
      run,
      task,
      status: developer.status,
      summary: developer.message,
      extraArtifacts: ["artifacts/developer-edit-suggestion.json", "artifacts/developer-edit-direct.json", "artifacts/developer-edit-rollback.json"]
    });
    return { ...base, developer };
  }

  runDeveloperMultiPatchTask(input: DeveloperMultiPatchTaskInput): DeveloperMultiPatchTaskResult {
    const prompt = `developer multi-patch ${input.mode} ${input.targets.length} file(s)`;
    const task = this.createTask(prompt);
    const run = this.workspaceManager.createRun({ rootDir: this.options.rootDir, taskId: task.id });
    const artifacts = new ArtifactStore(run.runDir);
    const projectRoot = path.resolve(this.options.rootDir);
    const safety = new SafetyPolicy({ workspaceDir: projectRoot, allowedCommands: ["node", "npm"] });
    const shellTool = new ShellTool(run.id, safety, artifacts);
    const plan = this.createDeveloperMultiPatchPlan(task.id, input);
    this.writeRunStartArtifacts(artifacts, task, plan, run, prompt);

    const validate = input.validationCommand
      ? (context: DeveloperMultiValidationContext) => {
          void context;
          const commandResult = shellTool.run(input.validationCommand!.command, input.validationCommand!.args, projectRoot);
          artifacts.writeJson(path.join("artifacts", "multi-file-validation-command.json"), {
            command: input.validationCommand!.command,
            args: input.validationCommand!.args,
            ok: commandResult.ok,
            exitCode: commandResult.exitCode,
            stdout: commandResult.stdout,
            stderr: commandResult.stderr,
            message: commandResult.message
          });
          return {
            ok: commandResult.ok,
            message: commandResult.ok
              ? `Validation command passed: ${input.validationCommand!.command} ${input.validationCommand!.args.join(" ")}`.trim()
              : `Validation command failed: ${input.validationCommand!.command} ${input.validationCommand!.args.join(" ")}`.trim()
          };
        }
      : input.validate;

    const worker = new MultiFileDeveloperWorker();
    const multiPatch = worker.multiPatch({
      runId: run.id,
      projectRoot,
      targets: input.targets,
      mode: input.mode,
      artifacts,
      safety,
      validate
    });

    artifacts.appendJsonl("steps.jsonl", {
      ts: isoNow(),
      runId: run.id,
      step: input.mode === "suggested" ? "developer_suggest_multi_patch" : "developer_direct_multi_patch",
      status: multiPatch.status,
      changed: multiPatch.changed,
      fileCount: multiPatch.fileCount,
      changedFileCount: multiPatch.changedFileCount,
      totalOccurrences: multiPatch.totalOccurrences,
      restored: multiPatch.restored ?? false
    });

    const base = this.finalizeRun({
      artifacts,
      run,
      task,
      status: multiPatch.status,
      summary: multiPatch.message,
      extraArtifacts: [
        "artifacts/developer-multi-patch-suggestion.json",
        "artifacts/developer-multi-patch-direct.json",
        "artifacts/developer-multi-patch-rollback.json",
        "artifacts/multi-file-validation-command.json",
        "artifacts/multi-file-patches",
        "artifacts/multi-file-backups"
      ]
    });
    return { ...base, multiPatch };
  }

  runDeveloperPatchTask(input: DeveloperPatchTaskInput): DeveloperPatchTaskResult {
    const prompt = `developer ${input.mode} patch ${input.relativePath}`;
    const task = this.createTask(prompt);
    const run = this.workspaceManager.createRun({ rootDir: this.options.rootDir, taskId: task.id });
    const artifacts = new ArtifactStore(run.runDir);
    const projectRoot = path.resolve(this.options.rootDir);
    const safety = new SafetyPolicy({ workspaceDir: projectRoot, allowedCommands: ["node", "npm"] });
    const shellTool = new ShellTool(run.id, safety, artifacts);
    const plan = this.createDeveloperPatchPlan(task.id, input);
    this.writeRunStartArtifacts(artifacts, task, plan, run, prompt);

    const validate = input.validationCommand
      ? () => {
          const commandResult = shellTool.run(input.validationCommand!.command, input.validationCommand!.args, projectRoot);
          artifacts.writeJson(path.join("artifacts", "validation-command.json"), {
            command: input.validationCommand!.command,
            args: input.validationCommand!.args,
            ok: commandResult.ok,
            exitCode: commandResult.exitCode,
            stdout: commandResult.stdout,
            stderr: commandResult.stderr,
            message: commandResult.message
          });
          return {
            ok: commandResult.ok,
            message: commandResult.ok
              ? `Validation command passed: ${input.validationCommand!.command} ${input.validationCommand!.args.join(" ")}`.trim()
              : `Validation command failed: ${input.validationCommand!.command} ${input.validationCommand!.args.join(" ")}`.trim()
          };
        }
      : input.validate;

    const worker = new DeveloperWorker();
    const patch = worker.patch({
      runId: run.id,
      projectRoot,
      relativePath: input.relativePath,
      operations: input.operations,
      mode: input.mode,
      artifacts,
      safety,
      validate
    });

    artifacts.appendJsonl("steps.jsonl", {
      ts: isoNow(),
      runId: run.id,
      step: input.mode === "suggested" ? "developer_suggest_patch" : "developer_direct_patch",
      status: patch.status,
      relativePath: patch.relativePath,
      changed: patch.changed,
      totalOccurrences: patch.totalOccurrences,
      operationCount: patch.operationCount
    });

    const base = this.finalizeRun({
      artifacts,
      run,
      task,
      status: patch.status,
      summary: patch.message,
      extraArtifacts: [
        "artifacts/developer-patch-suggestion.json",
        "artifacts/developer-patch-direct.json",
        "artifacts/developer-patch-rollback.json",
        "artifacts/validation-command.json",
        "artifacts/patches",
        "artifacts/backups"
      ]
    });
    return { ...base, patch };
  }

  runSelfImprovementTask(input: SelfImprovementTaskInput): SelfImprovementTaskResult {
    const prompt = `self-improvement ${input.mode} ${input.relativePath}: ${input.goal}`;
    const task = this.createTask(prompt);
    const run = this.workspaceManager.createRun({ rootDir: this.options.rootDir, taskId: task.id });
    const artifacts = new ArtifactStore(run.runDir);
    const projectRoot = path.resolve(this.options.rootDir);
    const safety = new SafetyPolicy({ workspaceDir: projectRoot, allowedCommands: ["node", "npm"] });
    const shellTool = new ShellTool(run.id, safety, artifacts);
    const plan = this.createSelfImprovementPlan(task.id, input);
    this.writeRunStartArtifacts(artifacts, task, plan, run, prompt);

    const validate = input.validationCommand
      ? () => {
          const commandResult = shellTool.run(input.validationCommand!.command, input.validationCommand!.args, projectRoot);
          artifacts.writeJson(path.join("artifacts", "self-improvement", "validation-command.json"), {
            command: input.validationCommand!.command,
            args: input.validationCommand!.args,
            ok: commandResult.ok,
            exitCode: commandResult.exitCode,
            stdout: commandResult.stdout,
            stderr: commandResult.stderr,
            message: commandResult.message
          });
          return {
            ok: commandResult.ok,
            message: commandResult.ok
              ? `Validation command passed: ${input.validationCommand!.command} ${input.validationCommand!.args.join(" ")}`.trim()
              : `Validation command failed: ${input.validationCommand!.command} ${input.validationCommand!.args.join(" ")}`.trim()
          };
        }
      : input.validate;

    const worker = new SelfImprovementWorker();
    const selfImprovement = worker.run({
      runId: run.id,
      projectRoot,
      goal: input.goal,
      relativePath: input.relativePath,
      operations: input.operations,
      mode: input.mode,
      artifacts,
      safety,
      validate,
      validationDescription: input.validationCommand
        ? `${input.validationCommand.command} ${input.validationCommand.args.join(" ")}`.trim()
        : input.validate
          ? "custom validation callback"
          : undefined
    });

    const base = this.finalizeRun({
      artifacts,
      run,
      task,
      status: selfImprovement.status,
      summary: selfImprovement.message,
      extraArtifacts: [
        "artifacts/self-improvement/record.json",
        "artifacts/self-improvement/validation-command.json",
        "artifacts/inspections",
        "artifacts/patches",
        "artifacts/backups"
      ]
    });
    return { ...base, selfImprovement };
  }

  getMemorySummary(): MemorySummaryTaskResult {
    const memory = new MemoryStore(this.options.rootDir);
    const summaryPath = memory.writeSummary();
    const summary = memory.summarize();
    return { ok: true, status: "completed", summary: { ...summary, memoryDir: memory.memoryDir }, memoryDir: path.dirname(summaryPath) };
  }

  listMemory(kind: "runs" | "failures" | "lessons"): MemoryListTaskResult {
    const memory = new MemoryStore(this.options.rootDir);
    if (kind === "runs") {
      return { ok: true, status: "completed", memoryDir: memory.memoryDir, runs: memory.listRuns() };
    }
    if (kind === "failures") {
      return { ok: true, status: "completed", memoryDir: memory.memoryDir, failures: memory.listFailures() };
    }
    return { ok: true, status: "completed", memoryDir: memory.memoryDir, lessons: memory.listLessonCandidates() };
  }


  listLessons(kind: "candidates" | "approved" | "rejected" | "decisions" | "active" | "rules" | "activations"): LessonListTaskResult {
    const memory = new MemoryStore(this.options.rootDir);
    if (kind === "candidates") {
      return { ok: true, status: "completed", memoryDir: memory.memoryDir, candidates: memory.listLessonCandidates() };
    }
    if (kind === "approved") {
      return { ok: true, status: "completed", memoryDir: memory.memoryDir, approved: memory.listApprovedLessons() };
    }
    if (kind === "rejected") {
      return { ok: true, status: "completed", memoryDir: memory.memoryDir, rejected: memory.listRejectedLessons() };
    }
    if (kind === "active") {
      return { ok: true, status: "completed", memoryDir: memory.memoryDir, active: memory.listActiveLessons() };
    }
    if (kind === "rules") {
      return { ok: true, status: "completed", memoryDir: memory.memoryDir, rules: memory.listRegressionRules() };
    }
    if (kind === "activations") {
      return { ok: true, status: "completed", memoryDir: memory.memoryDir, activations: memory.listLessonActivationDecisions() };
    }
    return { ok: true, status: "completed", memoryDir: memory.memoryDir, decisions: memory.listLessonDecisions() };
  }

  inspectLessonCandidate(candidateId: string): LessonInspectTaskResult {
    const memory = new MemoryStore(this.options.rootDir);
    return memory.inspectLessonCandidate(candidateId);
  }

  reviewLessonCandidate(input: LessonReviewTaskInput): LessonReviewTaskResult {
    const memory = new MemoryStore(this.options.rootDir);
    if (input.decision === "approved") {
      return memory.approveLessonCandidate(input.candidateId, input.reviewer ?? "local-user", input.rationale);
    }
    return memory.rejectLessonCandidate(input.candidateId, input.reviewer ?? "local-user", input.rationale);
  }

  activateApprovedLesson(input: LessonActivationTaskInput): LessonActivationTaskResult {
    const memory = new MemoryStore(this.options.rootDir);
    return memory.activateApprovedLesson(
      input.approvedLessonId ?? "",
      input.reviewer ?? "local-user",
      input.rationale
    );
  }

  deactivateActiveLesson(input: LessonActivationTaskInput): LessonActivationTaskResult {
    const memory = new MemoryStore(this.options.rootDir);
    return memory.deactivateActiveLesson(
      input.activeLessonId ?? "",
      input.reviewer ?? "local-user",
      input.rationale
    );
  }

  checkLessonRegressionRules(): RegressionRuleCheckTaskResult {
    const memory = new MemoryStore(this.options.rootDir);
    return memory.checkRegressionRules();
  }


  getLessonReviewWorkbench(): LessonReviewWorkbenchTaskResult {
    const memory = new MemoryStore(this.options.rootDir);
    return memory.getLessonReviewWorkbench();
  }

  writeLessonReviewWorkbench(): LessonReviewWorkbenchTaskResult {
    const memory = new MemoryStore(this.options.rootDir);
    return memory.writeLessonReviewWorkbench();
  }

  runRecursiveLearningCycle(): RecursiveLearningTaskResult {
    const memory = new MemoryStore(this.options.rootDir);
    return memory.runRecursiveLearningCycle();
  }

  listRecursiveLearningCycles(): RecursiveLearningHistoryTaskResult {
    const memory = new MemoryStore(this.options.rootDir);
    return { ok: true, status: "completed", memoryDir: memory.memoryDir, cycles: memory.listRecursiveLearningCycles() };
  }

  createQueuedTask(input: CreateQueuedTaskTaskInput): TaskQueueTaskResult {
    const queue = new TaskQueueStore(this.options.rootDir);
    return queue.createTask(input);
  }

  listQueuedTasks(status?: QueuedTaskStatus): TaskQueueListTaskResult {
    const queue = new TaskQueueStore(this.options.rootDir);
    return { ok: true, status: "completed", taskDir: queue.taskDir, tasks: queue.listTasks(status) };
  }

  inspectQueuedTask(taskId: string): TaskQueueTaskResult {
    const queue = new TaskQueueStore(this.options.rootDir);
    return queue.inspectTask(taskId);
  }

  startQueuedTask(taskId: string, rationale: string, actor = "local-user"): TaskQueueTaskResult {
    const queue = new TaskQueueStore(this.options.rootDir);
    return queue.startTask(taskId, actor, rationale);
  }

  completeQueuedTask(taskId: string, summary: string, actor = "local-user"): TaskQueueTaskResult {
    const queue = new TaskQueueStore(this.options.rootDir);
    return queue.completeTask(taskId, actor, summary);
  }

  blockQueuedTask(taskId: string, reason: string, actor = "local-user"): TaskQueueTaskResult {
    const queue = new TaskQueueStore(this.options.rootDir);
    return queue.blockTask(taskId, actor, reason);
  }

  cancelQueuedTask(taskId: string, reason: string, actor = "local-user"): TaskQueueTaskResult {
    const queue = new TaskQueueStore(this.options.rootDir);
    return queue.cancelTask(taskId, actor, reason);
  }

  listTaskQueueEvents(): TaskQueueEventsTaskResult {
    const queue = new TaskQueueStore(this.options.rootDir);
    return { ok: true, status: "completed", taskDir: queue.taskDir, events: queue.listEvents() };
  }

  getTaskQueueSummary(): TaskQueueSummaryTaskResult {
    const queue = new TaskQueueStore(this.options.rootDir);
    const summaryPath = queue.writeSummary();
    const summary = queue.summarize();
    return { ok: true, status: "completed", taskDir: queue.taskDir, summary: { ...summary, taskDir: queue.taskDir } };
  }

  ingestKnowledgeFile(input: KnowledgeIngestFileTaskInput): KnowledgeIngestFileTaskResult {
    const knowledge = new KnowledgeStore(this.options.rootDir);
    return knowledge.ingestFile(input.relativePath, input.title);
  }

  ingestKnowledgeDirectory(input: KnowledgeIngestDirectoryTaskInput): KnowledgeIngestDirectoryTaskResult {
    const knowledge = new KnowledgeStore(this.options.rootDir);
    return knowledge.ingestDirectory(input.relativeDir, { extensions: input.extensions, limit: input.limit });
  }

  listKnowledge(kind: "documents" | "chunks", documentId?: string): KnowledgeListTaskResult {
    const knowledge = new KnowledgeStore(this.options.rootDir);
    if (kind === "documents") {
      return { ok: true, status: "completed", knowledgeDir: knowledge.knowledgeDir, documents: knowledge.listDocuments() };
    }
    return { ok: true, status: "completed", knowledgeDir: knowledge.knowledgeDir, chunks: knowledge.listChunks(documentId) };
  }

  inspectKnowledgeDocument(documentId: string): KnowledgeInspectTaskResult {
    const knowledge = new KnowledgeStore(this.options.rootDir);
    return knowledge.inspectDocument(documentId);
  }

  searchKnowledge(query: string, limit?: number): KnowledgeSearchTaskResult {
    const knowledge = new KnowledgeStore(this.options.rootDir);
    return knowledge.search(query, limit);
  }

  getKnowledgeSummary(): KnowledgeSummaryTaskResult {
    const knowledge = new KnowledgeStore(this.options.rootDir);
    const summaryPath = knowledge.writeSummary();
    const summary = knowledge.summarize();
    return { ok: true, status: "completed", knowledgeDir: knowledge.knowledgeDir, summary: { ...summary, knowledgeDir: knowledge.knowledgeDir }, summaryPath };
  }
  answerResearchQuestion(query: string, limit?: number): ResearchKnowledgeAnswerTaskResult {
    const research = new ResearchKnowledgeWorker(this.options.rootDir);
    return research.answer(query, limit);
  }

  compareResearchKnowledge(topic: string, limit?: number): ResearchKnowledgeComparisonTaskResult {
    const research = new ResearchKnowledgeWorker(this.options.rootDir);
    return research.compare(topic, limit);
  }

  summarizeResearchKnowledge(query: string, limit?: number): ResearchKnowledgeSummaryTaskResult {
    const research = new ResearchKnowledgeWorker(this.options.rootDir);
    return research.summarize(query, limit);
  }

  listResearchKnowledgeHistory(kind: ResearchHistoryKind): ResearchKnowledgeHistoryTaskResult {
    const research = new ResearchKnowledgeWorker(this.options.rootDir);
    return research.listHistory(kind);
  }

  getResearchKnowledgeSummary(): ResearchKnowledgeStoreSummaryTaskResult {
    const research = new ResearchKnowledgeWorker(this.options.rootDir);
    return research.getSummary();
  }



  listModelProviders(): ModelProviderListTaskResult {
    const models = new ModelProviderStore(this.options.rootDir);
    return models.listProviders();
  }

  invokeModelProvider(input: ModelInvocationTaskInput): ModelInvocationTaskResult {
    const models = new ModelProviderStore(this.options.rootDir);
    return models.invoke(input);
  }

  listModelProviderHistory(kind: "requests" | "responses" | "events"): ModelProviderHistoryTaskResult {
    const models = new ModelProviderStore(this.options.rootDir);
    if (kind === "requests") {
      return { ok: true, status: "completed", modelDir: models.modelDir, requests: models.listRequests() };
    }
    if (kind === "responses") {
      return { ok: true, status: "completed", modelDir: models.modelDir, responses: models.listResponses() };
    }
    return { ok: true, status: "completed", modelDir: models.modelDir, events: models.listEvents() };
  }

  getModelProviderSummary(): ModelProviderSummaryTaskResult {
    const models = new ModelProviderStore(this.options.rootDir);
    const summaryPath = models.writeSummary();
    const summary = models.summarize();
    return { ok: true, status: "completed", modelDir: models.modelDir, summary: { ...summary, modelDir: models.modelDir }, summaryPath };
  }

  getLocalModelProviderReadiness(providerId = "ollama-local", model?: string): LocalModelProviderReadinessTaskResult {
    const models = new ModelProviderStore(this.options.rootDir);
    return models.getLocalModelProviderReadiness(providerId, model);
  }

  async invokeLocalModelProvider(input: LocalModelInvocationTaskInput): Promise<ModelInvocationTaskResult> {
    const models = new ModelProviderStore(this.options.rootDir);
    return models.invokeLocalModelProvider(input);
  }

  runAutonomousDevLoop(input: AutonomousDevLoopTaskInput): AutonomousDevLoopTaskResult {
    const prompt = `autonomous-dev-loop ${input.mode} ${input.relativePath}: ${input.goal}`;
    const task = this.createTask(prompt);
    const run = this.workspaceManager.createRun({ rootDir: this.options.rootDir, taskId: task.id });
    const artifacts = new ArtifactStore(run.runDir);
    const projectRoot = path.resolve(this.options.rootDir);
    const safety = new SafetyPolicy({ workspaceDir: projectRoot, allowedCommands: ["node", "npm"] });
    const shellTool = new ShellTool(run.id, safety, artifacts);
    const plan = this.createAutonomousDevLoopPlan(task.id, input);
    this.writeRunStartArtifacts(artifacts, task, plan, run, prompt);
    const validate = input.validationCommand ? () => {
      const commandResult = shellTool.run(input.validationCommand!.command, input.validationCommand!.args, projectRoot);
      artifacts.writeJson(path.join("artifacts", "autonomy", "validation-command.json"), { command: input.validationCommand!.command, args: input.validationCommand!.args, ok: commandResult.ok, exitCode: commandResult.exitCode, stdout: commandResult.stdout, stderr: commandResult.stderr, message: commandResult.message });
      return { ok: commandResult.ok, message: commandResult.ok ? `Validation command passed: ${input.validationCommand!.command} ${input.validationCommand!.args.join(" ")}`.trim() : `Validation command failed: ${input.validationCommand!.command} ${input.validationCommand!.args.join(" ")}`.trim() };
    } : input.validate;
    const worker = new AutonomousDevLoopWorker(projectRoot);
    const autonomy = worker.run({ ...input, validate, validationDescription: input.validationCommand ? `${input.validationCommand.command} ${input.validationCommand.args.join(" ")}`.trim() : input.validate ? "custom validation callback" : input.validationDescription }, { runId: run.id, artifacts, safety });
    artifacts.appendJsonl("steps.jsonl", { ts: isoNow(), runId: run.id, step: input.mode === "propose" ? "autonomy_propose_dev_loop" : "autonomy_apply_dev_loop", status: autonomy.status, loopId: autonomy.loop.id, taskId: autonomy.loop.taskId, changed: autonomy.patch?.changed ?? false, restored: autonomy.patch?.restored ?? false });
    const base = this.finalizeRun({ artifacts, run, task, status: autonomy.status, summary: autonomy.message, extraArtifacts: ["artifacts/autonomy/validation-command.json", "artifacts/patches", "artifacts/backups", ".sera-autonomy/loops.jsonl", ".sera-autonomy/events.jsonl", ".sera-autonomy/summary.json"] });
    return { ...base, autonomy };
  }

  listAutonomousDevLoops(kind: "loops" | "events"): AutonomousDevLoopListTaskResult {
    return new AutonomousDevLoopWorker(this.options.rootDir).list(kind);
  }

  getAutonomousDevLoopSummary(): AutonomousDevLoopSummaryTaskResult {
    return new AutonomousDevLoopWorker(this.options.rootDir).getSummary();
  }

  getOperatorConsoleStatus(): OperatorConsoleStatusTaskResult {
    return new OperatorConsoleStore(this.options.rootDir).getStatus();
  }

  getOperatorConsoleHealth(): OperatorConsoleHealthTaskResult {
    return new OperatorConsoleStore(this.options.rootDir).getHealth();
  }

  writeOperatorConsoleReport(): OperatorConsoleReportTaskResult {
    return new OperatorConsoleStore(this.options.rootDir).writeReport();
  }

  listOperatorConsoleHistory(): OperatorConsoleHistoryTaskResult {
    return new OperatorConsoleStore(this.options.rootDir).listHistory();
  }

  getOperatorConsoleSummary(): OperatorConsoleSummaryTaskResult {
    return new OperatorConsoleStore(this.options.rootDir).getSummary();
  }

  private createTask(prompt: string): SeraTask {
    return {
      id: createSeraId("task"),
      prompt,
      createdAt: isoNow(),
      requestedBy: "local-user"
    };
  }

  private writeRunStartArtifacts(artifacts: ArtifactStore, task: SeraTask, plan: SeraPlan, run: SeraRun, prompt: string): void {
    artifacts.writeJson("task.json", task);
    artifacts.writeJson("plan.json", plan);
    artifacts.writeJson("run.json", run);
    artifacts.appendJsonl("steps.jsonl", { ts: isoNow(), runId: run.id, step: "start", status: "completed", prompt });
  }

  private finalizeRun(input: {
    artifacts: ArtifactStore;
    run: SeraRun;
    task: SeraTask;
    status: SeraStatus;
    summary: string;
    extraArtifacts?: string[];
  }): SeraResult {
    const artifacts = [
      "task.json",
      "plan.json",
      "run.json",
      "steps.jsonl",
      "tool-events.jsonl",
      "safety-events.jsonl",
      "final-report.md",
      "artifacts/memory/record.json"
    ];
    for (const extra of input.extraArtifacts ?? []) {
      artifacts.push(extra);
    }

    input.run.status = input.status;
    input.run.finishedAt = isoNow();
    input.artifacts.writeJson("run.json", input.run);

    const finalReport: SeraFinalReport = {
      runId: input.run.id,
      taskId: input.task.id,
      status: input.status,
      summary: input.summary,
      artifacts,
      createdAt: isoNow()
    };
    input.artifacts.writeJson("final-report.json", finalReport);
    input.artifacts.writeMarkdown("final-report.md", [
      `# S.E.R.A. Run Report`,
      ``,
      `Run: ${input.run.id}`,
      `Task: ${input.task.prompt}`,
      `Status: ${input.status}`,
      ``,
      `## Summary`,
      input.summary,
      ``,
      `## Workspace`,
      input.run.workspaceDir,
      ``
    ].join("\n"));

    const memory = new MemoryStore(this.options.rootDir);
    const memoryResult = memory.recordRun({
      runId: input.run.id,
      taskId: input.task.id,
      prompt: input.task.prompt,
      status: input.status,
      summary: input.summary,
      startedAt: input.run.startedAt,
      finishedAt: input.run.finishedAt,
      runDir: input.run.runDir,
      artifacts
    });
    memory.writeSummary();
    input.artifacts.writeJson(path.join("artifacts", "memory", "record.json"), {
      runRecordPath: memoryResult.runRecordPath,
      failureRecordPath: memoryResult.failureRecordPath,
      lessonCandidatePath: memoryResult.lessonCandidatePath
    });

    return {
      ok: input.status !== "blocked" && input.status !== "failed",
      status: input.status,
      run: input.run,
      message: input.summary,
      artifacts
    };
  }

  private createAutonomousDevLoopPlan(taskId: string, input: AutonomousDevLoopTaskInput): SeraPlan {
    return { id: createSeraId("plan"), taskId, createdAt: isoNow(), steps: [
      { id: createSeraId("step"), title: "Inspect queued task and target file before autonomous action", tool: "TaskQueueStore + DeveloperWorker", risk: "low", expectedArtifact: ".sera-autonomy/events.jsonl" },
      { id: createSeraId("step"), title: "Search local knowledge and invoke deterministic mock provider", tool: "KnowledgeStore + ModelProviderStore", risk: "low", expectedArtifact: ".sera-knowledge/search-history.jsonl and .sera-models/model-responses.jsonl" },
      { id: createSeraId("step"), title: input.mode === "propose" ? "Create autonomous patch proposal without source mutation" : "Apply bounded patch only behind validation gate", tool: "DeveloperWorker", risk: input.mode === "propose" ? "low" : "medium", expectedArtifact: input.mode === "propose" ? "artifacts/patches" : "artifacts/backups" },
      { id: createSeraId("step"), title: "Record autonomy loop, task transition, and final evidence", tool: "AutonomousDevLoopWorker", risk: "low", expectedArtifact: ".sera-autonomy/loops.jsonl" }
    ] };
  }

  private createStarterPlan(taskId: string, prompt: string): SeraPlan {
    return {
      id: createSeraId("plan"),
      taskId,
      createdAt: isoNow(),
      steps: [
        {
          id: createSeraId("step"),
          title: prompt.toLowerCase().includes("hello") ? "Create hello.txt in workspace" : "Record task note in workspace",
          tool: "FileTool",
          risk: "low",
          expectedArtifact: "workspace file"
        },
        {
          id: createSeraId("step"),
          title: "Write final report and evidence trail",
          tool: "ArtifactStore",
          risk: "low",
          expectedArtifact: "final-report.md"
        }
      ]
    };
  }

  private createDeveloperInspectPlan(taskId: string, input: DeveloperInspectTaskInput): SeraPlan {
    return {
      id: createSeraId("plan"),
      taskId,
      createdAt: isoNow(),
      steps: [
        {
          id: createSeraId("step"),
          title: `Inspect target file ${input.relativePath}`,
          tool: "DeveloperWorker",
          risk: "low",
          expectedArtifact: "artifacts/inspections"
        },
        {
          id: createSeraId("step"),
          title: "Write final report and evidence trail",
          tool: "ArtifactStore",
          risk: "low",
          expectedArtifact: "final-report.md"
        }
      ]
    };
  }

  private createDeveloperEditPlan(taskId: string, input: DeveloperEditTaskInput): SeraPlan {
    return {
      id: createSeraId("plan"),
      taskId,
      createdAt: isoNow(),
      steps: [
        {
          id: createSeraId("step"),
          title: `Inspect target file ${input.relativePath}`,
          tool: "DeveloperWorker",
          risk: "low",
          expectedArtifact: "tool-events.jsonl"
        },
        {
          id: createSeraId("step"),
          title: input.mode === "suggested" ? "Create suggested edit artifact" : "Apply direct edit with backup",
          tool: "DeveloperWorker",
          risk: input.mode === "suggested" ? "low" : "medium",
          expectedArtifact: input.mode === "suggested" ? "artifacts/suggestions" : "artifacts/backups"
        },
        {
          id: createSeraId("step"),
          title: "Write final report and evidence trail",
          tool: "ArtifactStore",
          risk: "low",
          expectedArtifact: "final-report.md"
        }
      ]
    };
  }

  private createDeveloperMultiPatchPlan(taskId: string, input: DeveloperMultiPatchTaskInput): SeraPlan {
    return {
      id: createSeraId("plan"),
      taskId,
      createdAt: isoNow(),
      steps: [
        {
          id: createSeraId("step"),
          title: `Validate ${input.targets.length} multi-file patch target(s) against path safety and protected-file rules`,
          tool: "MultiFileDeveloperWorker",
          risk: "low",
          expectedArtifact: "safety-events.jsonl"
        },
        {
          id: createSeraId("step"),
          title: input.mode === "suggested" ? "Create multi-file patch artifacts without source mutation" : "Apply multi-file patch with backups for every touched file",
          tool: "MultiFileDeveloperWorker",
          risk: input.mode === "suggested" ? "low" : "high",
          expectedArtifact: input.mode === "suggested" ? "artifacts/multi-file-patches" : "artifacts/multi-file-backups"
        },
        {
          id: createSeraId("step"),
          title: input.mode === "direct" ? "Run validation and rollback all files if validation fails" : "Record suggestion manifest",
          tool: input.mode === "direct" ? "ShellTool + MultiFileDeveloperWorker" : "ArtifactStore",
          risk: input.mode === "direct" ? "high" : "low",
          expectedArtifact: input.mode === "direct" ? "artifacts/developer-multi-patch-direct.json or rollback.json" : "artifacts/developer-multi-patch-suggestion.json"
        }
      ]
    };
  }

  private createDeveloperPatchPlan(taskId: string, input: DeveloperPatchTaskInput): SeraPlan {
    return {
      id: createSeraId("plan"),
      taskId,
      createdAt: isoNow(),
      steps: [
        {
          id: createSeraId("step"),
          title: `Inspect target file ${input.relativePath}`,
          tool: "DeveloperWorker",
          risk: "low",
          expectedArtifact: "tool-events.jsonl"
        },
        {
          id: createSeraId("step"),
          title: input.mode === "suggested" ? "Render patch proposal artifact" : "Apply patch with backup and rollback path",
          tool: "DeveloperWorker",
          risk: input.mode === "suggested" ? "low" : "medium",
          expectedArtifact: input.mode === "suggested" ? "artifacts/patches" : "artifacts/backups"
        },
        {
          id: createSeraId("step"),
          title: input.validationCommand ? "Run validation command through ShellTool" : "Evaluate validation callback when supplied",
          tool: input.validationCommand ? "ShellTool" : "DeveloperWorker",
          risk: input.validationCommand ? "medium" : "low",
          expectedArtifact: input.validationCommand ? "artifacts/validation-command.json" : "developer-patch-direct.json"
        },
        {
          id: createSeraId("step"),
          title: "Write final report and evidence trail",
          tool: "ArtifactStore",
          risk: "low",
          expectedArtifact: "final-report.md"
        }
      ]
    };
  }

  private createSelfImprovementPlan(taskId: string, input: SelfImprovementTaskInput): SeraPlan {
    return {
      id: createSeraId("plan"),
      taskId,
      createdAt: isoNow(),
      steps: [
        {
          id: createSeraId("step"),
          title: `Inspect self-improvement target ${input.relativePath}`,
          tool: "SelfImprovementWorker",
          risk: "low",
          expectedArtifact: "artifacts/inspections"
        },
        {
          id: createSeraId("step"),
          title: input.mode === "propose" ? "Create self-improvement proposal artifact" : "Apply self-improvement through DeveloperWorker with backup",
          tool: "SelfImprovementWorker",
          risk: input.mode === "propose" ? "low" : "high",
          expectedArtifact: "artifacts/self-improvement/record.json"
        },
        {
          id: createSeraId("step"),
          title: input.mode === "apply" ? "Require validation gate before completion" : "Record proposal without source mutation",
          tool: input.mode === "apply" ? "ShellTool" : "ArtifactStore",
          risk: input.mode === "apply" ? "high" : "low",
          expectedArtifact: input.mode === "apply" ? "artifacts/self-improvement/validation-command.json" : "artifacts/patches"
        },
        {
          id: createSeraId("step"),
          title: "Write final report and evidence trail",
          tool: "ArtifactStore",
          risk: "low",
          expectedArtifact: "final-report.md"
        }
      ]
    };
  }

}
