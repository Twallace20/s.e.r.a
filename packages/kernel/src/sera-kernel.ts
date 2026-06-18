import path from "node:path";
import { ArtifactStore } from "@sera/artifacts";
import { SafetyPolicy } from "@sera/safety";
import { FileTool } from "@sera/tools";
import { WorkspaceManager } from "@sera/workspace";
import { createSeraId, isoNow, SeraFinalReport, SeraPlan, SeraResult, SeraTask } from "@sera/shared";

export interface KernelOptions {
  rootDir: string;
}

export class SeraKernel {
  private readonly workspaceManager = new WorkspaceManager();

  constructor(private readonly options: KernelOptions) {}

  runTask(prompt: string): SeraResult {
    const task: SeraTask = {
      id: createSeraId("task"),
      prompt,
      createdAt: isoNow(),
      requestedBy: "local-user"
    };

    const run = this.workspaceManager.createRun({ rootDir: this.options.rootDir, taskId: task.id });
    const artifacts = new ArtifactStore(run.runDir);
    const safety = new SafetyPolicy({ workspaceDir: run.workspaceDir, allowedCommands: ["node", "npm"] });
    const fileTool = new FileTool(run.id, safety, artifacts);

    const plan = this.createStarterPlan(task.id, prompt);
    artifacts.writeJson("task.json", task);
    artifacts.writeJson("plan.json", plan);
    artifacts.writeJson("run.json", run);
    artifacts.appendJsonl("steps.jsonl", { ts: isoNow(), runId: run.id, step: "start", status: "completed", prompt });

    const normalized = prompt.toLowerCase();
    let resultPath: string | undefined;
    let status: SeraResult["status"] = "completed";
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

    run.status = status;
    run.finishedAt = isoNow();
    artifacts.writeJson("run.json", run);

    const finalReport: SeraFinalReport = {
      runId: run.id,
      taskId: task.id,
      status,
      summary,
      artifacts: ["task.json", "plan.json", "run.json", "steps.jsonl", "tool-events.jsonl", "safety-events.jsonl", "final-report.md"],
      createdAt: isoNow()
    };
    artifacts.writeJson("final-report.json", finalReport);
    artifacts.writeMarkdown("final-report.md", [
      `# S.E.R.A. Run Report`,
      ``,
      `Run: ${run.id}`,
      `Task: ${task.prompt}`,
      `Status: ${status}`,
      ``,
      `## Summary`,
      summary,
      ``,
      `## Workspace`,
      run.workspaceDir,
      ``
    ].join("\n"));

    return {
      ok: status !== "blocked",
      status,
      run,
      message: summary,
      artifacts: finalReport.artifacts
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
}
