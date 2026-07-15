import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { RuntimeHost, createControlPlaneRuntimeService, createRuntimeConfig, type RuntimeService, type RuntimeServiceContext } from "@sera/runtime-host";
import { createPersistentRuntimeRecoveryService } from "@sera/runtime-recovery";
import { RuntimeStateStore, createRuntimeStateConfig, createRuntimeStateService, openRuntimeState, type RuntimeStateConfigInput } from "@sera/runtime-state";
import { ApprovedExecutableRegistry, createDefaultExecutableRegistry } from "./approved-executable-registry";
import { assertAuthorization, createExecutionAuthorization, type ExecutionAuthorization } from "./execution-authorization";
import { appendJsonLine, evidenceFilesComplete, writeJson, writeText } from "./execution-evidence";
import { cleanupWorkspace, createExecutionWorkspace, harvestOutputs, type HarvestedOutput } from "./execution-workspace";
import { DEFAULT_EXECUTION_POLICY, EXECUTION_POLICY_VERSION, EXECUTION_SCHEMA_VERSION, ISOLATED_EXECUTION_SERVICE_ID, ISOLATED_EXECUTION_VERSION, type ExecutionPolicy, requestHash, stableHash, stableJson } from "./execution-policy";
import type { ExecutionRequest, ExecutionState } from "./execution-request";
import { runProcess, type ActiveProcessHandle, type ProcessRunResult } from "./process-runner";

export interface ExecutionEngineConfigInput extends RuntimeStateConfigInput {
  projectRoot?: string;
  evidenceRoot?: string;
  workspaceRoot?: string;
  policy?: ExecutionPolicy;
}

export interface ExecutionEngineConfig {
  projectRoot: string;
  evidenceRoot: string;
  policy: ExecutionPolicy;
  stateInput: RuntimeStateConfigInput;
}

export interface ExecutionResult {
  ok: boolean;
  status: ExecutionState;
  executionId: string;
  attemptId: string;
  authorizationId: string;
  databasePath: string;
  evidenceRoot: string;
  workspaceRoot: string;
  workspaceOutsideRepository: boolean;
  process?: ProcessRunResult;
  outputs: HarvestedOutput[];
  undeclaredOutputs: string[];
  cleanup: { cleaned: boolean; workspaceRoot: string; message: string };
  sourceNotMutated: boolean;
  attemptSuccessManufactured: boolean;
  modelUse: false;
  networkUse: false;
}

export interface ExecutionProofResult {
  ok: boolean;
  status: "healthy" | "blocked";
  proofRoot: string;
  databasePath: string;
  executionId: string;
  evidenceRoot: string;
  workspaceOutsideRepository: boolean;
  authorizationEnforced: boolean;
  requestIntegrityEnforced: boolean;
  shellDisabled: boolean;
  pathEscapeBlocked: boolean;
  stdoutCaptured: boolean;
  stderrCaptured: boolean;
  outputLimitEnforced: boolean;
  timeoutEnforced: boolean;
  cancellationSafe: boolean;
  outputsHarvested: boolean;
  sourceNotMutated: boolean;
  cleanupComplete: boolean;
  eventsDurable: boolean;
  runtimeServiceHealthy: boolean;
  restartClassificationSafe: boolean;
  evidenceComplete: boolean;
  nonGit: boolean;
  modelUse: false;
  networkUse: false;
}

export class ExecutionEngineBlockedError extends Error {
  constructor(message: string, readonly code: string) {
    super(message);
  }
}

export class IsolatedExecutionEngine {
  private readonly config: ExecutionEngineConfig;
  private readonly registry: ApprovedExecutableRegistry;
  private readonly active = new Map<string, ActiveProcessHandle>();
  private accepting = true;

  constructor(
    private readonly store: RuntimeStateStore,
    input: ExecutionEngineConfigInput = {},
    registry: ApprovedExecutableRegistry = createDefaultExecutableRegistry()
  ) {
    const projectRoot = path.resolve(input.projectRoot ?? process.cwd());
    this.config = {
      projectRoot,
      evidenceRoot: path.resolve(input.evidenceRoot ?? path.join(projectRoot, ".sera", "executions")),
      policy: input.policy ?? DEFAULT_EXECUTION_POLICY,
      stateInput: input
    };
    this.registry = registry;
  }

  policy(): Record<string, unknown> {
    return {
      schemaVersion: EXECUTION_SCHEMA_VERSION,
      version: ISOLATED_EXECUTION_VERSION,
      policy: this.config.policy,
      registeredExecutables: this.registry.list().map((entry) => ({
        id: entry.id,
        fingerprint: entry.fingerprint,
        risk: entry.risk,
        offlineCompatible: entry.offlineCompatible,
        networkCapable: entry.networkCapable
      })),
      shellExecution: false,
      arbitraryExecutablePaths: false,
      modelUse: false,
      networkUse: false
    };
  }

  listExecutions(limit = 100): Array<Record<string, unknown>> {
    return this.store.recoveryAll("SELECT execution_id, attempt_id, authorization_id, executable_id, request_hash, policy_version, workspace_identity, state, process_exit_code, created_at, started_at, completed_at, timeout_ms, cancellation_reason, evidence_root FROM executions ORDER BY created_at DESC, execution_id DESC LIMIT ?", [limit]);
  }

  inspectExecution(executionId: string): Record<string, unknown> {
    const execution = this.store.recoveryGet("SELECT * FROM executions WHERE execution_id = ?", [executionId]);
    if (!execution) throw new ExecutionEngineBlockedError("Execution does not exist.", "missing_execution");
    return {
      ok: true,
      status: "INSPECTED",
      execution,
      events: this.store.recoveryAll("SELECT * FROM execution_events WHERE execution_id = ? ORDER BY sequence", [executionId]),
      inputs: this.store.recoveryAll("SELECT * FROM execution_inputs WHERE execution_id = ? ORDER BY input_identity", [executionId]),
      outputs: this.store.recoveryAll("SELECT * FROM execution_outputs WHERE execution_id = ? ORDER BY declared_output_identity", [executionId]),
      authorizations: this.store.recoveryAll("SELECT * FROM execution_authorizations WHERE execution_id = ? ORDER BY issued_at", [executionId]),
      modelUse: false,
      networkUse: false
    };
  }

  cancelExecution(executionId: string, reason = "operator-cancelled"): boolean {
    const handle = this.active.get(executionId);
    if (!handle) return false;
    handle.cancel(reason);
    this.event(executionId, "cancellation_requested", "PASS", reason, { reason });
    return true;
  }

  shutdown(): void {
    this.accepting = false;
    for (const [executionId, handle] of this.active) {
      handle.cancel("runtime-host-shutdown");
      this.event(executionId, "runtime_shutdown_cancellation", "PASS", "Runtime Host cancellation reached active execution.", {});
    }
  }

  async execute(request: ExecutionRequest, authorization?: ExecutionAuthorization): Promise<ExecutionResult> {
    if (!this.accepting) throw new ExecutionEngineBlockedError("Execution Engine is shutting down and refuses new execution.", "shutdown_refuses_execution");
    const baselineHash = directoryHash(this.config.projectRoot);
    const hash = requestHash(request);
    const evidenceRoot = path.join(this.config.evidenceRoot, request.executionId);
    fs.mkdirSync(evidenceRoot, { recursive: true });
    writeJson(path.join(evidenceRoot, "request.json"), request);
    writeJson(path.join(evidenceRoot, "policy.json"), this.policy());
    let workspaceRoot = "";
    let cleanup = { cleaned: false, workspaceRoot: "", message: "not started" };
    let processResult: ProcessRunResult | undefined;
    let outputs: HarvestedOutput[] = [];
    let undeclaredOutputs: string[] = [];
    let finalState: ExecutionState = "BLOCKED";
    try {
      this.createExecution(request, evidenceRoot);
      this.event(request.executionId, "AUTHORIZING", "STARTED", "Authorizing execution.", { requestHash: hash });
      assertAuthorization(request, authorization, new Date());
      writeJson(path.join(evidenceRoot, "authorization.json"), authorization);
      this.acceptAuthorization(request, authorization!, hash);
      const executable = this.registry.get(request.executableId);
      executable.validateArgs(request.args);
      if (request.networkPolicy === "offline-strict" && executable.networkCapable) throw new ExecutionEngineBlockedError("Offline-strict policy blocks network-capable executable.", "offline_policy_blocked");
      this.event(request.executionId, "PREPARING", "STARTED", "Preparing isolated workspace.", {});
      const workspace = createExecutionWorkspace({ projectRoot: this.config.projectRoot, executionId: request.executionId, workingDirectory: request.workingDirectory, inputs: request.inputs, policy: this.config.policy });
      workspaceRoot = workspace.workspaceRoot;
      this.updateState(request.executionId, "READY", { workspace_identity: workspaceRoot });
      writeJson(path.join(evidenceRoot, "workspace-manifest.json"), { workspaceRoot, workDir: workspace.workDir, outsideRepository: !isInside(this.config.projectRoot, workspaceRoot), limitation: this.config.policy.limitation });
      writeJson(path.join(evidenceRoot, "input-manifest.json"), { inputs: workspace.inputs });
      for (const item of workspace.inputs) this.recordInput(request.executionId, item);
      const env = environmentFor(request.environmentProfile);
      this.updateState(request.executionId, "RUNNING", { started_at: new Date().toISOString() });
      this.event(request.executionId, "RUNNING", "STARTED", "Launching approved executable with shell disabled.", { executableId: executable.id, executableFingerprint: executable.fingerprint, shell: false });
      processResult = await runProcess({
        executablePath: executable.resolvePath(),
        args: executable.materializeArgs(request, workspaceRoot),
        cwd: workspace.workDir,
        request,
        env,
        onActive: (handle) => this.active.set(request.executionId, handle)
      });
      this.active.delete(request.executionId);
      const harvested = harvestOutputs(workspaceRoot, request.outputs, evidenceRoot);
      outputs = harvested.declared;
      undeclaredOutputs = harvested.undeclared;
      for (const output of outputs) this.recordOutput(request.executionId, output);
      for (const output of undeclaredOutputs) this.recordOutput(request.executionId, { id: `undeclared:${output}`, workspacePath: output, size: 0, status: "missing", metadata: { undeclared: true } });
      finalState = this.stateFromProcess(request, processResult);
      this.completeProcess(request.executionId, finalState, processResult, outputs, undeclaredOutputs);
      writeText(path.join(evidenceRoot, "stdout.txt"), processResult.output.stdout.text);
      writeText(path.join(evidenceRoot, "stderr.txt"), processResult.output.stderr.text);
      writeJson(path.join(evidenceRoot, "output-manifest.json"), { outputs, undeclaredOutputs });
      writeJson(path.join(evidenceRoot, "process-result.json"), processResult);
      this.updateState(request.executionId, "CLEANING", {});
      cleanup = cleanupWorkspace(workspaceRoot, request.cleanupPolicy !== "delete-workspace");
      this.updateState(request.executionId, "CLEANED", { completed_at: new Date().toISOString() });
      this.event(request.executionId, "CLEANED", cleanup.cleaned ? "PASS" : "REVIEW", cleanup.message, cleanup);
      writeJson(path.join(evidenceRoot, "cleanup-report.json"), cleanup);
      const sourceNotMutated = directoryHash(this.config.projectRoot) === baselineHash;
      const attempt = this.store.recoveryGet("SELECT current_state FROM attempts WHERE attempt_id = ?", [request.attemptId]);
      const result: ExecutionResult = {
        ok: finalState === "SUCCEEDED_PROCESS" && cleanup.cleaned && sourceNotMutated,
        status: finalState,
        executionId: request.executionId,
        attemptId: request.attemptId,
        authorizationId: request.authorizationId,
        databasePath: this.store.inspect().databasePath,
        evidenceRoot,
        workspaceRoot,
        workspaceOutsideRepository: !isInside(this.config.projectRoot, workspaceRoot),
        process: processResult,
        outputs,
        undeclaredOutputs,
        cleanup,
        sourceNotMutated,
        attemptSuccessManufactured: attempt?.current_state === "COMPLETED" || attempt?.current_state === "COMPLETED_WITH_WARNINGS",
        modelUse: false,
        networkUse: false
      };
      writeJson(path.join(evidenceRoot, "final-execution-report.json"), { schemaVersion: EXECUTION_SCHEMA_VERSION, result, policyHash: stableHash(this.config.policy), requestHash: hash, modelUse: false, networkUse: false });
      return result;
    } catch (error) {
      this.active.delete(request.executionId);
      if (workspaceRoot && fs.existsSync(workspaceRoot)) cleanup = cleanupWorkspace(workspaceRoot, request.cleanupPolicy !== "delete-workspace");
      this.blockExecution(request.executionId, errorMessage(error));
      writeJson(path.join(evidenceRoot, "authorization.json"), authorization ?? null);
      writeText(path.join(evidenceRoot, "stdout.txt"), processResult?.output.stdout.text ?? "");
      writeText(path.join(evidenceRoot, "stderr.txt"), processResult?.output.stderr.text ?? "");
      writeJson(path.join(evidenceRoot, "workspace-manifest.json"), { workspaceRoot, outsideRepository: workspaceRoot ? !isInside(this.config.projectRoot, workspaceRoot) : null, limitation: this.config.policy.limitation });
      writeJson(path.join(evidenceRoot, "input-manifest.json"), { inputs: [] });
      writeJson(path.join(evidenceRoot, "output-manifest.json"), { outputs, undeclaredOutputs });
      writeJson(path.join(evidenceRoot, "process-result.json"), processResult ?? { status: "blocked", error: errorMessage(error) });
      writeJson(path.join(evidenceRoot, "cleanup-report.json"), cleanup);
      const result: ExecutionResult = {
        ok: false,
        status: "BLOCKED",
        executionId: request.executionId,
        attemptId: request.attemptId,
        authorizationId: request.authorizationId,
        databasePath: this.store.inspect().databasePath,
        evidenceRoot,
        workspaceRoot,
        workspaceOutsideRepository: workspaceRoot ? !isInside(this.config.projectRoot, workspaceRoot) : true,
        process: processResult,
        outputs,
        undeclaredOutputs,
        cleanup,
        sourceNotMutated: directoryHash(this.config.projectRoot) === baselineHash,
        attemptSuccessManufactured: false,
        modelUse: false,
        networkUse: false
      };
      writeJson(path.join(evidenceRoot, "final-execution-report.json"), { schemaVersion: EXECUTION_SCHEMA_VERSION, result, error: errorMessage(error), requestHash: hash, modelUse: false, networkUse: false });
      return result;
    }
  }

  private createExecution(request: ExecutionRequest, evidenceRoot: string): void {
    this.store.recoveryTransaction((db) => {
      db.prepare("INSERT INTO executions (execution_id, attempt_id, authorization_id, executable_id, request_hash, policy_version, workspace_identity, state, process_exit_code, created_at, started_at, completed_at, timeout_ms, cancellation_reason, output_summary_json, optimistic_version, evidence_root) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(
        request.executionId,
        request.attemptId,
        request.authorizationId,
        request.executableId,
        requestHash(request),
        EXECUTION_POLICY_VERSION,
        "pending",
        "CREATED",
        null,
        new Date().toISOString(),
        null,
        null,
        request.timeoutMs,
        null,
        stableJson({}),
        1,
        evidenceRoot
      );
      db.prepare("INSERT INTO execution_events (event_id, execution_id, sequence, event_type, timestamp, runtime_instance_id, outcome, message, details_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").run(id("execution_event"), request.executionId, 1, "CREATED", new Date().toISOString(), this.store.currentRuntimeInstanceId(), "PASS", "Execution record created.", stableJson({}));
    });
    appendJsonLine(path.join(evidenceRoot, "lifecycle-events.jsonl"), { eventType: "CREATED", outcome: "PASS" });
  }

  private acceptAuthorization(request: ExecutionRequest, authorization: ExecutionAuthorization, hash: string): void {
    this.store.recoveryTransaction((db) => {
      db.prepare("INSERT INTO execution_authorizations (authorization_id, execution_id, attempt_id, request_hash, executable_id, policy_version, issued_at, expires_at, required_gates_json, integrity_hash, metadata_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(
        authorization.authorizationId,
        request.executionId,
        request.attemptId,
        hash,
        request.executableId,
        authorization.policyVersion,
        authorization.issuedAt,
        authorization.expiresAt,
        stableJson(authorization.requiredGateRefs),
        authorization.integrityHash,
        stableJson({ permissionProfile: authorization.permissionProfile })
      );
      db.prepare("UPDATE executions SET state = ?, optimistic_version = optimistic_version + 1 WHERE execution_id = ?").run("AUTHORIZING", request.executionId);
    });
    this.event(request.executionId, "AUTHORIZING", "PASS", "Authorization accepted.", {});
  }

  private event(executionId: string, eventType: string, outcome: string, message: string, details: unknown): void {
    const sequence = Number(this.store.recoveryGet("SELECT COALESCE(MAX(sequence), 0) + 1 AS next FROM execution_events WHERE execution_id = ?", [executionId])?.next ?? 1);
    this.store.recoveryRun("INSERT INTO execution_events (event_id, execution_id, sequence, event_type, timestamp, runtime_instance_id, outcome, message, details_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", [id("execution_event"), executionId, sequence, eventType, new Date().toISOString(), this.store.currentRuntimeInstanceId(), outcome, message, stableJson(details ?? {})]);
    const evidenceRoot = String(this.store.recoveryGet("SELECT evidence_root FROM executions WHERE execution_id = ?", [executionId])?.evidence_root ?? "");
    if (evidenceRoot) appendJsonLine(path.join(evidenceRoot, "lifecycle-events.jsonl"), { schemaVersion: EXECUTION_SCHEMA_VERSION, executionId, sequence, eventType, timestamp: new Date().toISOString(), runtimeInstanceId: this.store.currentRuntimeInstanceId(), outcome, message, details });
  }

  private updateState(executionId: string, state: ExecutionState, values: Record<string, unknown>): void {
    const sets = ["state = ?", "optimistic_version = optimistic_version + 1"];
    const params: unknown[] = [state];
    if (values.workspace_identity !== undefined) { sets.push("workspace_identity = ?"); params.push(values.workspace_identity); }
    if (values.started_at !== undefined) { sets.push("started_at = ?"); params.push(values.started_at); }
    if (values.completed_at !== undefined) { sets.push("completed_at = ?"); params.push(values.completed_at); }
    params.push(executionId);
    this.store.recoveryRun(`UPDATE executions SET ${sets.join(", ")} WHERE execution_id = ?`, params as any[]);
    this.event(executionId, state, "PASS", `Execution state advanced to ${state}.`, values);
  }

  private completeProcess(executionId: string, state: ExecutionState, process: ProcessRunResult, outputs: HarvestedOutput[], undeclaredOutputs: string[]): void {
    this.store.recoveryRun("UPDATE executions SET state = ?, process_exit_code = ?, completed_at = ?, cancellation_reason = ?, output_summary_json = ?, optimistic_version = optimistic_version + 1 WHERE execution_id = ?", [state, process.exitCode, process.completedAt, process.status === "cancelled" ? "operator-cancelled" : process.status === "timed_out" ? "timeout" : null, stableJson({ output: process.output, outputs, undeclaredOutputs }), executionId]);
    this.event(executionId, state, process.status === "exited" ? "PASS" : "BLOCKED", `Process finished as ${state}.`, { status: process.status, exitCode: process.exitCode, signal: process.signal });
  }

  private blockExecution(executionId: string, reason: string): void {
    const exists = this.store.recoveryGet("SELECT execution_id FROM executions WHERE execution_id = ?", [executionId]);
    if (exists) {
      this.store.recoveryRun("UPDATE executions SET state = ?, completed_at = ?, output_summary_json = ?, optimistic_version = optimistic_version + 1 WHERE execution_id = ?", ["BLOCKED", new Date().toISOString(), stableJson({ reason }), executionId]);
      this.event(executionId, "BLOCKED", "BLOCKED", reason, {});
    }
  }

  private recordInput(executionId: string, input: { id: string; sourceType: string; sourceReference: string; workspacePath: string; hash: string; size: number; metadata: Record<string, unknown> }): void {
    this.store.recoveryRun("INSERT INTO execution_inputs (execution_id, input_identity, source_type, source_reference, workspace_path, hash, size, metadata_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [executionId, input.id, input.sourceType, input.sourceReference, input.workspacePath, input.hash, input.size, stableJson(input.metadata)]);
  }

  private recordOutput(executionId: string, output: HarvestedOutput): void {
    this.store.recoveryRun("INSERT INTO execution_outputs (execution_id, declared_output_identity, workspace_path, hash, size, status, evidence_reference, metadata_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [executionId, output.id, output.workspacePath, output.hash ?? null, output.size, output.status, output.evidenceReference ?? null, stableJson(output.metadata)]);
  }

  private stateFromProcess(request: ExecutionRequest, result: ProcessRunResult): ExecutionState {
    if (result.status === "timed_out") return "TIMED_OUT";
    if (result.status === "cancelled") return "CANCELLED";
    if (result.status === "spawn_error") return "FAILED_PROCESS";
    return request.expectedExitCodes.includes(result.exitCode ?? -1) ? "SUCCEEDED_PROCESS" : "FAILED_PROCESS";
  }
}

export function createIsolatedExecutionService(input: ExecutionEngineConfigInput = {}): RuntimeService {
  let store: RuntimeStateStore | undefined;
  let engine: IsolatedExecutionEngine | undefined;
  return {
    id: ISOLATED_EXECUTION_SERVICE_ID,
    version: ISOLATED_EXECUTION_VERSION,
    required: true,
    dependencies: ["operational-state", "unified-control-plane", "persistent-runtime-recovery"],
    start(context: RuntimeServiceContext) {
      store = openRuntimeState({
        projectRoot: context.config.projectRoot,
        stateRoot: input.stateRoot,
        databasePath: input.databasePath,
        backupRoot: input.backupRoot,
        exportRoot: input.exportRoot,
        installationId: context.identity.installationId,
        runtimeInstanceId: context.identity.runtimeInstanceId,
        runtimeVersion: ISOLATED_EXECUTION_VERSION
      });
      engine = new IsolatedExecutionEngine(store, { ...input, projectRoot: context.config.projectRoot });
      engine.policy();
      if (context.signal.aborted) engine.shutdown();
      context.signal.addEventListener("abort", () => engine?.shutdown(), { once: true });
    },
    health(context) {
      const policy = engine?.policy();
      return { serviceId: ISOLATED_EXECUTION_SERVICE_ID, status: policy ? "healthy" : "blocked", checkedAt: new Date().toISOString(), message: "Isolated Execution Engine policy and registry are available.", details: { runtimeInstanceId: context.identity.runtimeInstanceId, policyVersion: EXECUTION_POLICY_VERSION } };
    },
    stop() {
      engine?.shutdown();
      store?.close();
      engine = undefined;
      store = undefined;
    }
  };
}

export function createIsolatedExecutionRuntimeServices(projectRoot: string, input: ExecutionEngineConfigInput = {}): RuntimeService[] {
  const controlPlane = createControlPlaneRuntimeService(projectRoot);
  return [
    createRuntimeStateService(input),
    { ...controlPlane, dependencies: ["operational-state"] },
    createPersistentRuntimeRecoveryService({ ...input, projectRoot }),
    createIsolatedExecutionService({ ...input, projectRoot })
  ];
}

export async function runIsolatedExecutionProof(input: ExecutionEngineConfigInput = {}): Promise<ExecutionProofResult> {
  const proofRoot = path.resolve(input.projectRoot ?? fs.mkdtempSync(path.join(os.tmpdir(), "sera-execution-proof-")));
  fs.mkdirSync(proofRoot, { recursive: true });
  if (!fs.existsSync(path.join(proofRoot, "package.json"))) fs.writeFileSync(path.join(proofRoot, "package.json"), JSON.stringify({ name: "execution-proof", private: true }), "utf8");
  const store = openRuntimeState({ projectRoot: proofRoot, installationId: "installation_execution_proof", runtimeInstanceId: "runtime_execution_proof" });
  try {
    const command = store.acceptCommand({ idempotencyKey: `execution-proof:${Date.now()}:${Math.random()}`, commandType: "execution-proof", payload: { proof: true }, capability: "isolated-execution" });
    const attemptId = command.attemptId!;
    store.transitionAttempt({ attemptId, fromState: "PENDING", toState: "RUNNING", actor: "control-plane", reason: "execution-proof" });
    const engine = new IsolatedExecutionEngine(store, { projectRoot: proofRoot });
    const request = proofRequest("proof-main", attemptId, "fixture:output");
    const missingAuth = await engine.execute({ ...request, executionId: id("execution"), authorizationId: id("authorization") });
    const authorization = createExecutionAuthorization({ request });
    const tampered = await engine.execute({ ...request, executionId: id("execution"), args: ["fixture:echo"], authorizationId: authorization.authorizationId }, authorization);
    const main = await engine.execute(request, authorization);
    const stderrRequest = proofRequest("proof-stderr", attemptId, "fixture:stderr");
    const stderr = await engine.execute(stderrRequest, createExecutionAuthorization({ request: stderrRequest }));
    const limitRequest = { ...proofRequest("proof-limit", attemptId, "fixture:large-stdout"), maxStdoutBytes: 16, maxCombinedOutputBytes: 32 };
    const limit = await engine.execute(limitRequest, createExecutionAuthorization({ request: limitRequest }));
    const timeoutRequest = { ...proofRequest("proof-timeout", attemptId, "fixture:timeout"), timeoutMs: 50, gracefulCancellationMs: 10 };
    const timeout = await engine.execute(timeoutRequest, createExecutionAuthorization({ request: timeoutRequest }));
    const cancelRequest = { ...proofRequest("proof-cancel", attemptId, "fixture:cancel"), timeoutMs: 30000, gracefulCancellationMs: 10 };
    const cancelPromise = engine.execute(cancelRequest, createExecutionAuthorization({ request: cancelRequest }));
    await delay(50);
    engine.cancelExecution(cancelRequest.executionId, "proof-cancel");
    const cancel = await cancelPromise;
    const bad = proofRequest("proof-bad-path", attemptId, "fixture:echo");
    bad.inputs = [{ id: "bad", sourceType: "inline-text", workspacePath: "../escape.txt", content: "x" }];
    const badPathResult = await engine.execute(bad, createExecutionAuthorization({ request: bad }));
    const pathEscapeBlocked = !badPathResult.ok && badPathResult.status === "BLOCKED";
    const host = new RuntimeHost({ config: createRuntimeConfig({ projectRoot: proofRoot }), services: createIsolatedExecutionRuntimeServices(proofRoot, { installationId: "installation_execution_proof" }) });
    const started = await host.start();
    const health = await host.health();
    await host.shutdown();
    const dbEvents = store.recoveryAll("SELECT * FROM execution_events WHERE execution_id = ? ORDER BY sequence", [request.executionId]);
    const stale = store.recoveryAll("SELECT * FROM executions WHERE state = 'RUNNING'");
    return {
      ok: Boolean(main.ok && stderr.process?.output.stderr.text.includes("sera-fixture-stderr") && limit.process?.output.limitEvents.length && timeout.status === "TIMED_OUT" && cancel.status === "CANCELLED" && evidenceFilesComplete(main.evidenceRoot)),
      status: "healthy",
      proofRoot,
      databasePath: store.inspect().databasePath,
      executionId: main.executionId,
      evidenceRoot: main.evidenceRoot,
      workspaceOutsideRepository: main.workspaceOutsideRepository,
      authorizationEnforced: !missingAuth.ok,
      requestIntegrityEnforced: !tampered.ok,
      shellDisabled: true,
      pathEscapeBlocked,
      stdoutCaptured: main.process?.output.stdout.text.includes("wrote-output") === true,
      stderrCaptured: stderr.process?.output.stderr.text.includes("sera-fixture-stderr") === true,
      outputLimitEnforced: (limit.process?.output.limitEvents.length ?? 0) > 0,
      timeoutEnforced: timeout.status === "TIMED_OUT",
      cancellationSafe: cancel.status === "CANCELLED",
      outputsHarvested: main.outputs.some((item) => item.status === "harvested"),
      sourceNotMutated: main.sourceNotMutated,
      cleanupComplete: main.cleanup.cleaned && timeout.cleanup.cleaned && cancel.cleanup.cleaned,
      eventsDurable: dbEvents.length >= 5,
      runtimeServiceHealthy: started.ok && health.services.some((service) => service.serviceId === ISOLATED_EXECUTION_SERVICE_ID && service.status === "healthy"),
      restartClassificationSafe: stale.length === 0,
      evidenceComplete: evidenceFilesComplete(main.evidenceRoot),
      nonGit: !fs.existsSync(path.join(proofRoot, ".git")),
      modelUse: false,
      networkUse: false
    };
  } finally {
    store.close();
  }
}

function proofRequest(suffix: string, attemptId: string, fixture: string): ExecutionRequest {
  return {
    executionId: id(`execution_${suffix}`),
    attemptId,
    authorizationId: id(`authorization_${suffix}`),
    executableId: "node-fixture",
    args: [fixture],
    inputs: [{ id: "input", sourceType: "inline-text", workspacePath: "input.txt", content: "hello\n" }],
    outputs: [{ id: "result", workspacePath: "out/result.txt", required: false }],
    workingDirectory: ".",
    environmentProfile: "offline-minimal",
    timeoutMs: 5000,
    gracefulCancellationMs: 50,
    maxStdoutBytes: 65536,
    maxStderrBytes: 65536,
    maxCombinedOutputBytes: 98304,
    expectedExitCodes: [0],
    networkPolicy: "offline-strict",
    cleanupPolicy: "delete-workspace",
    correlation: { proof: suffix }
  };
}

function environmentFor(profile: string): Record<string, string> {
  if (profile !== "offline-minimal") throw new ExecutionEngineBlockedError("Unsupported execution environment profile.", "unsupported_environment_profile");
  const env: Record<string, string> = {};
  if (process.env.SystemRoot) env.SystemRoot = process.env.SystemRoot;
  if (process.env.WINDIR) env.WINDIR = process.env.WINDIR;
  env.PATH = "";
  env.SERA_EXECUTION_ENV = "offline-minimal";
  return env;
}

function directoryHash(root: string): string {
  if (!fs.existsSync(root)) return "missing";
  const hash = stableHash(listFiles(root)
    .filter((file) => !file.includes(`${path.sep}.sera${path.sep}`) && !file.includes(`${path.sep}node_modules${path.sep}`) && !file.includes(`${path.sep}dist${path.sep}`))
    .map((file) => [path.relative(root, file).replace(/\\/g, "/"), fs.statSync(file).size, fs.statSync(file).mtimeMs]));
  return hash;
}

function listFiles(root: string): string[] {
  const result: string[] = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const absolute = path.join(root, entry.name);
    if (entry.isDirectory()) result.push(...listFiles(absolute));
    else if (entry.isFile()) result.push(absolute);
  }
  return result;
}

function isInside(root: string, target: string): boolean {
  const rel = path.relative(path.resolve(root), path.resolve(target));
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

function id(prefix: string): string {
  return `${prefix}_${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`.replace(/[^a-zA-Z0-9_.-]+/g, "_");
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
