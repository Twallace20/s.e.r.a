import crypto from "node:crypto";
import type { ExecutionRequest } from "./execution-request";

export const ISOLATED_EXECUTION_VERSION = "isolated-execution-v1";
export const ISOLATED_EXECUTION_SERVICE_ID = "isolated-execution";
export const EXECUTION_POLICY_VERSION = "isolated-execution-policy-v1";
export const EXECUTION_SCHEMA_VERSION = "sera.isolated-execution.v1";
export const ISOLATION_LIMITATION = "Isolated Execution Engine v1 is a governed process and workspace boundary for approved local workloads. It is not a complete hostile-code security boundary, container sandbox, virtual machine, kernel sandbox, or network namespace.";

export interface ExecutionPolicy {
  policyVersion: typeof EXECUTION_POLICY_VERSION;
  environmentProfiles: string[];
  networkPolicies: string[];
  permissionProfiles: string[];
  defaultTimeoutMs: number;
  defaultGracefulCancellationMs: number;
  defaultMaxStdoutBytes: number;
  defaultMaxStderrBytes: number;
  defaultMaxCombinedOutputBytes: number;
  maxInputFiles: number;
  maxInputBytes: number;
  maxInputFileBytes: number;
  limitation: typeof ISOLATION_LIMITATION;
}

export const DEFAULT_EXECUTION_POLICY: ExecutionPolicy = {
  policyVersion: EXECUTION_POLICY_VERSION,
  environmentProfiles: ["offline-minimal"],
  networkPolicies: ["offline-strict"],
  permissionProfiles: ["local-process-bounded"],
  defaultTimeoutMs: 5000,
  defaultGracefulCancellationMs: 250,
  defaultMaxStdoutBytes: 64 * 1024,
  defaultMaxStderrBytes: 64 * 1024,
  defaultMaxCombinedOutputBytes: 96 * 1024,
  maxInputFiles: 64,
  maxInputBytes: 1024 * 1024,
  maxInputFileBytes: 512 * 1024,
  limitation: ISOLATION_LIMITATION
};

export function stableJson(value: unknown): string {
  return JSON.stringify(normalize(value));
}

export function stableHash(value: unknown): string {
  return crypto.createHash("sha256").update(stableJson(value)).digest("hex");
}

export function requestHash(request: ExecutionRequest): string {
  return stableHash({
    executionId: request.executionId,
    attemptId: request.attemptId,
    authorizationId: request.authorizationId,
    executableId: request.executableId,
    args: request.args,
    inputs: request.inputs,
    outputs: request.outputs,
    workingDirectory: request.workingDirectory,
    environmentProfile: request.environmentProfile,
    timeoutMs: request.timeoutMs,
    gracefulCancellationMs: request.gracefulCancellationMs,
    maxStdoutBytes: request.maxStdoutBytes,
    maxStderrBytes: request.maxStderrBytes,
    maxCombinedOutputBytes: request.maxCombinedOutputBytes,
    expectedExitCodes: request.expectedExitCodes,
    networkPolicy: request.networkPolicy,
    cleanupPolicy: request.cleanupPolicy,
    correlation: request.correlation ?? {}
  });
}

function normalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, normalize(item)]));
  }
  return value;
}
