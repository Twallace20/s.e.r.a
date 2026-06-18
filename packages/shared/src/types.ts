export type SeraStatus =
  | "completed"
  | "completed_with_changes"
  | "no_op"
  | "blocked"
  | "failed"
  | "needs_approval";

export type SeraSeverity = "debug" | "info" | "warn" | "error";

export interface SeraTask {
  id: string;
  prompt: string;
  createdAt: string;
  requestedBy: "local-user" | string;
}

export interface SeraPlanStep {
  id: string;
  title: string;
  tool?: string;
  risk: "low" | "medium" | "high";
  expectedArtifact?: string;
}

export interface SeraPlan {
  id: string;
  taskId: string;
  createdAt: string;
  steps: SeraPlanStep[];
}

export interface SeraRun {
  id: string;
  taskId: string;
  rootDir: string;
  runDir: string;
  workspaceDir: string;
  startedAt: string;
  finishedAt?: string;
  status: SeraStatus;
}

export interface SeraToolEvent {
  ts: string;
  runId: string;
  tool: string;
  action: string;
  ok: boolean;
  message: string;
  target?: string;
  metadata?: Record<string, unknown>;
}

export interface SeraSafetyEvent {
  ts: string;
  runId: string;
  decision: "allow" | "block" | "approval_required";
  reason: string;
  target?: string;
  policy: string;
}

export interface SeraFinalReport {
  runId: string;
  taskId: string;
  status: SeraStatus;
  summary: string;
  artifacts: string[];
  createdAt: string;
}

export interface SeraResult {
  ok: boolean;
  status: SeraStatus;
  run: SeraRun;
  message: string;
  artifacts: string[];
}
