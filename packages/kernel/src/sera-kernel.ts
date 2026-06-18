import path from "node:path";
import { ArtifactStore } from "@sera/artifacts";
import { SafetyPolicy } from "@sera/safety";
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
  DeveloperWorker
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

export interface SelfImprovementTaskResult extends SeraResult {
  selfImprovement: SelfImprovementResult;
}

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
      "final-report.md"
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

    return {
      ok: input.status !== "blocked" && input.status !== "failed",
      status: input.status,
      run: input.run,
      message: input.summary,
      artifacts
    };
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
