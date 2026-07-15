import type { ExecutionRequest } from "./execution-request";
import { EXECUTION_POLICY_VERSION, requestHash, stableHash } from "./execution-policy";

export interface ExecutionAuthorization {
  authorizationId: string;
  attemptId: string;
  executionId: string;
  requestHash: string;
  executableId: string;
  args: string[];
  allowedInputIds: string[];
  allowedOutputIds: string[];
  environmentProfile: string;
  timeoutMs: number;
  maxStdoutBytes: number;
  maxStderrBytes: number;
  maxCombinedOutputBytes: number;
  networkPolicy: string;
  permissionProfile: "local-process-bounded";
  policyVersion: typeof EXECUTION_POLICY_VERSION;
  issuedAt: string;
  expiresAt: string;
  requiredGateRefs: string[];
  completedGateRefs: string[];
  integrityHash: string;
}

export function createExecutionAuthorization(input: {
  request: ExecutionRequest;
  issuedAt?: Date;
  ttlMs?: number;
  requiredGateRefs?: string[];
  completedGateRefs?: string[];
}): ExecutionAuthorization {
  const issued = input.issuedAt ?? new Date();
  const expires = new Date(issued.getTime() + (input.ttlMs ?? 60000));
  const base: Omit<ExecutionAuthorization, "integrityHash"> = {
    authorizationId: input.request.authorizationId,
    attemptId: input.request.attemptId,
    executionId: input.request.executionId,
    requestHash: requestHash(input.request),
    executableId: input.request.executableId,
    args: input.request.args,
    allowedInputIds: input.request.inputs.map((item) => item.id).sort(),
    allowedOutputIds: input.request.outputs.map((item) => item.id).sort(),
    environmentProfile: input.request.environmentProfile,
    timeoutMs: input.request.timeoutMs,
    maxStdoutBytes: input.request.maxStdoutBytes,
    maxStderrBytes: input.request.maxStderrBytes,
    maxCombinedOutputBytes: input.request.maxCombinedOutputBytes,
    networkPolicy: input.request.networkPolicy,
    permissionProfile: "local-process-bounded",
    policyVersion: EXECUTION_POLICY_VERSION,
    issuedAt: issued.toISOString(),
    expiresAt: expires.toISOString(),
    requiredGateRefs: input.requiredGateRefs ?? ["control-plane-execution-gate"],
    completedGateRefs: input.completedGateRefs ?? ["control-plane-execution-gate"]
  };
  return { ...base, integrityHash: stableHash(base) };
}

export function assertAuthorization(request: ExecutionRequest, authorization: ExecutionAuthorization | undefined, now = new Date()): void {
  if (!authorization) throw new Error("Execution authorization is required.");
  const expectedHash = requestHash(request);
  if (authorization.policyVersion !== EXECUTION_POLICY_VERSION) throw new Error("Execution authorization policy version is unsupported.");
  if (new Date(authorization.expiresAt).getTime() <= now.getTime()) throw new Error("Execution authorization has expired.");
  if (authorization.requestHash !== expectedHash) throw new Error("Execution request hash does not match authorization.");
  if (authorization.executableId !== request.executableId) throw new Error("Execution executable does not match authorization.");
  if (JSON.stringify(authorization.args) !== JSON.stringify(request.args)) throw new Error("Execution arguments do not match authorization.");
  if (JSON.stringify(authorization.allowedInputIds) !== JSON.stringify(request.inputs.map((item) => item.id).sort())) throw new Error("Execution inputs do not match authorization.");
  if (JSON.stringify(authorization.allowedOutputIds) !== JSON.stringify(request.outputs.map((item) => item.id).sort())) throw new Error("Execution outputs do not match authorization.");
  if (authorization.timeoutMs !== request.timeoutMs || authorization.maxStdoutBytes !== request.maxStdoutBytes || authorization.maxStderrBytes !== request.maxStderrBytes || authorization.maxCombinedOutputBytes !== request.maxCombinedOutputBytes) throw new Error("Execution limits do not match authorization.");
  if (authorization.networkPolicy !== request.networkPolicy || authorization.environmentProfile !== request.environmentProfile) throw new Error("Execution policy scope does not match authorization.");
  if (!authorization.requiredGateRefs.every((gate) => authorization.completedGateRefs.includes(gate))) throw new Error("Execution authorization required gates are incomplete.");
  const { integrityHash, ...base } = authorization;
  if (integrityHash !== stableHash(base)) throw new Error("Execution authorization integrity hash is invalid.");
}
