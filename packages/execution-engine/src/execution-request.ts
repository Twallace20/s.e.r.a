export type ExecutionEnvironmentProfile = "offline-minimal";
export type ExecutionNetworkPolicy = "offline-strict";
export type ExecutionPermissionProfile = "local-process-bounded";
export type ExecutionCleanupPolicy = "delete-workspace" | "preserve-workspace";
export type ExecutionInputSourceType = "inline-text" | "copy-file" | "copy-directory" | "generated-fixture";
export type ExecutionOutputStatus = "harvested" | "missing" | "undeclared";
export type ExecutionState = "CREATED" | "AUTHORIZING" | "PREPARING" | "READY" | "RUNNING" | "SUCCEEDED_PROCESS" | "FAILED_PROCESS" | "TIMED_OUT" | "CANCELLED" | "BLOCKED" | "CLEANING" | "CLEANED";

export interface ExecutionInputDeclaration {
  id: string;
  sourceType: ExecutionInputSourceType;
  source?: string;
  workspacePath: string;
  content?: string;
  fixtureName?: string;
}

export interface ExecutionOutputDeclaration {
  id: string;
  workspacePath: string;
  required?: boolean;
}

export interface ExecutionRequest {
  executionId: string;
  attemptId: string;
  authorizationId: string;
  executableId: string;
  args: string[];
  inputs: ExecutionInputDeclaration[];
  outputs: ExecutionOutputDeclaration[];
  workingDirectory: string;
  environmentProfile: ExecutionEnvironmentProfile;
  timeoutMs: number;
  gracefulCancellationMs: number;
  maxStdoutBytes: number;
  maxStderrBytes: number;
  maxCombinedOutputBytes: number;
  expectedExitCodes: number[];
  networkPolicy: ExecutionNetworkPolicy;
  cleanupPolicy: ExecutionCleanupPolicy;
  correlation?: Record<string, unknown>;
}
