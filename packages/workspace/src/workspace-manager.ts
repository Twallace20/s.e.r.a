import fs from "node:fs";
import path from "node:path";
import { createSeraId, isoNow, SeraRun } from "@sera/shared";

export interface CreateRunOptions {
  rootDir: string;
  taskId: string;
}

export class WorkspaceManager {
  createRun(options: CreateRunOptions): SeraRun {
    const rootDir = path.resolve(options.rootDir);
    const runId = createSeraId("run");
    const runDir = path.join(rootDir, ".sera-runs", runId);
    const workspaceDir = path.join(runDir, "workspace");
    fs.mkdirSync(workspaceDir, { recursive: true });

    return {
      id: runId,
      taskId: options.taskId,
      rootDir,
      runDir,
      workspaceDir,
      startedAt: isoNow(),
      status: "completed"
    };
  }
}
