import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { createControlPlaneRuntimeService, type RuntimeService, type RuntimeServiceContext } from "@sera/runtime-host";

export const RUNTIME_STATE_VERSION = "runtime-state-v1";
export const RUNTIME_STATE_SCHEMA_VERSION = 5;
export const RUNTIME_STATE_EXPORT_SCHEMA = "sera.runtime-state-export.v1";

export type RuntimeStateStatus = "healthy" | "blocked";
export type AttemptState = "PENDING" | "READY" | "RUNNING" | "BLOCKED" | "FAILED" | "CANCELLED" | "COMPLETED" | "COMPLETED_WITH_WARNINGS";
export type GateOutcome = "PASS" | "FAIL" | "BLOCKED" | "PENDING" | "NOT_APPLICABLE";
export type LeaseStatus = "active" | "released" | "expired";

export interface RuntimeStateClock {
  now(): Date;
}

export interface RuntimeStateConfig {
  stateRoot: string;
  databasePath: string;
  backupRoot: string;
  exportRoot: string;
  busyTimeoutMs: number;
  journalMode: "wal";
  synchronous: "full";
  runtimeVersion: string;
  installationId: string;
  runtimeInstanceId: string;
}

export interface RuntimeStateConfigInput {
  projectRoot?: string;
  stateRoot?: string;
  databasePath?: string;
  backupRoot?: string;
  exportRoot?: string;
  busyTimeoutMs?: number;
  installationId?: string;
  runtimeInstanceId?: string;
  runtimeVersion?: string;
}

export interface RuntimeStateInspection {
  ok: boolean;
  status: RuntimeStateStatus;
  databasePath: string;
  schemaVersion: number;
  sqlite: Record<string, unknown>;
  counts: Record<string, number>;
  leases: Array<Record<string, unknown>>;
  lastEvent: Record<string, unknown> | null;
  message: string;
  modelUse: false;
  networkUse: false;
}

export interface AcceptedCommand {
  ok: boolean;
  status: "ACCEPTED" | "DUPLICATE" | "BLOCKED";
  commandId?: string;
  attemptId?: string;
  message: string;
}

export interface RuntimeStateProofResult {
  ok: boolean;
  status: RuntimeStateStatus;
  proofRoot: string;
  stateRoot: string;
  databasePath: string;
  command: AcceptedCommand;
  duplicate: AcceptedCommand;
  terminalImmutable: boolean;
  conflictingIdempotencyBlocked: boolean;
  invalidTransitionBlocked: boolean;
  gateEnforced: boolean;
  exportStable: boolean;
  backupOk: boolean;
  leaseFencingOk: boolean;
  restartPersists: boolean;
  inspection: RuntimeStateInspection;
  modelUse: false;
  networkUse: false;
}

export interface Migration {
  version: number;
  name: string;
  sql: string;
}

export class RuntimeStateBlockedError extends Error {
  constructor(message: string, readonly code: string) {
    super(message);
  }
}

const TABLES = [
  "schema_migrations",
  "idempotency_records",
  "commands",
  "attempts",
  "attempt_transitions",
  "gate_outcomes",
  "evidence_references",
  "runtime_leases",
  "state_events",
  "recovery_checkpoints",
  "recovery_sessions",
  "recovery_decisions",
  "recovery_events",
  "attempt_lineage",
  "executions",
  "execution_events",
  "execution_inputs",
  "execution_outputs",
  "execution_authorizations",
  "evaluation_specs",
  "evaluations",
  "evaluation_assertions",
  "evaluation_events",
  "evaluation_profiles",
  "model_providers",
  "model_catalog",
  "model_authorizations",
  "model_invocations",
  "model_events",
  "model_artifacts"
] as const;

const TERMINAL_STATES = new Set<AttemptState>(["BLOCKED", "FAILED", "CANCELLED", "COMPLETED", "COMPLETED_WITH_WARNINGS"]);

const VALID_TRANSITIONS: Record<AttemptState, AttemptState[]> = {
  PENDING: ["READY", "RUNNING", "BLOCKED", "FAILED", "CANCELLED"],
  READY: ["RUNNING", "BLOCKED", "FAILED", "CANCELLED"],
  RUNNING: ["BLOCKED", "FAILED", "CANCELLED", "COMPLETED", "COMPLETED_WITH_WARNINGS"],
  BLOCKED: [],
  FAILED: [],
  CANCELLED: [],
  COMPLETED: [],
  COMPLETED_WITH_WARNINGS: []
};

export const DEFAULT_RUNTIME_STATE_MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: "runtime_state_v1",
    sql: `
CREATE TABLE idempotency_records (
  idempotency_key TEXT PRIMARY KEY,
  request_hash TEXT NOT NULL,
  command_id TEXT NOT NULL,
  attempt_id TEXT,
  created_at TEXT NOT NULL,
  response_json TEXT NOT NULL
);

CREATE TABLE commands (
  command_id TEXT PRIMARY KEY,
  idempotency_key TEXT NOT NULL UNIQUE,
  command_type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  submitted_at TEXT NOT NULL,
  originating_installation_id TEXT NOT NULL,
  originating_runtime_instance_id TEXT NOT NULL,
  status TEXT NOT NULL,
  attempt_id TEXT,
  version INTEGER NOT NULL,
  FOREIGN KEY(attempt_id) REFERENCES attempts(attempt_id)
);

CREATE TABLE attempts (
  attempt_id TEXT PRIMARY KEY,
  command_id TEXT NOT NULL UNIQUE,
  capability TEXT NOT NULL,
  current_state TEXT NOT NULL,
  terminal INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT,
  reason TEXT,
  optimistic_version INTEGER NOT NULL,
  prior_attempt_id TEXT,
  FOREIGN KEY(command_id) REFERENCES commands(command_id),
  FOREIGN KEY(prior_attempt_id) REFERENCES attempts(attempt_id)
);

CREATE TABLE attempt_transitions (
  transition_id TEXT PRIMARY KEY,
  attempt_id TEXT NOT NULL,
  from_state TEXT NOT NULL,
  to_state TEXT NOT NULL,
  transitioned_at TEXT NOT NULL,
  actor TEXT NOT NULL,
  reason TEXT,
  runtime_instance_id TEXT NOT NULL,
  sequence_number INTEGER NOT NULL,
  correlation_json TEXT NOT NULL,
  UNIQUE(attempt_id, sequence_number),
  FOREIGN KEY(attempt_id) REFERENCES attempts(attempt_id)
);

CREATE TABLE gate_outcomes (
  gate_outcome_id TEXT PRIMARY KEY,
  attempt_id TEXT NOT NULL,
  gate_name TEXT NOT NULL,
  required INTEGER NOT NULL,
  outcome TEXT NOT NULL,
  evaluated_at TEXT NOT NULL,
  evidence_json TEXT NOT NULL,
  message TEXT,
  evaluator TEXT NOT NULL,
  UNIQUE(attempt_id, gate_name),
  FOREIGN KEY(attempt_id) REFERENCES attempts(attempt_id)
);

CREATE TABLE evidence_references (
  evidence_reference_id TEXT PRIMARY KEY,
  attempt_id TEXT NOT NULL,
  evidence_type TEXT NOT NULL,
  location TEXT NOT NULL,
  integrity_hash TEXT,
  created_at TEXT NOT NULL,
  producer TEXT NOT NULL,
  metadata_json TEXT NOT NULL,
  FOREIGN KEY(attempt_id) REFERENCES attempts(attempt_id)
);

CREATE TABLE runtime_leases (
  lease_name TEXT PRIMARY KEY,
  owning_runtime_instance_id TEXT NOT NULL,
  acquired_at TEXT NOT NULL,
  renewed_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  fencing_token INTEGER NOT NULL,
  released_at TEXT,
  status TEXT NOT NULL
);

CREATE TABLE state_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  installation_id TEXT NOT NULL,
  runtime_instance_id TEXT NOT NULL,
  related_command_id TEXT,
  related_attempt_id TEXT,
  outcome TEXT NOT NULL,
  message TEXT,
  details_json TEXT NOT NULL
);

CREATE INDEX idx_commands_status ON commands(status, submitted_at);
CREATE INDEX idx_attempts_state ON attempts(current_state, updated_at);
CREATE INDEX idx_transitions_attempt ON attempt_transitions(attempt_id, sequence_number);
CREATE INDEX idx_gates_attempt ON gate_outcomes(attempt_id, gate_name);
CREATE INDEX idx_evidence_attempt ON evidence_references(attempt_id, created_at);
CREATE INDEX idx_events_time ON state_events(timestamp, event_id);
`
  },
  {
    version: 2,
    name: "persistent_runtime_recovery_v1",
    sql: `
CREATE TABLE recovery_checkpoints (
  checkpoint_id TEXT PRIMARY KEY,
  attempt_id TEXT NOT NULL,
  stage_id TEXT NOT NULL,
  checkpoint_type TEXT NOT NULL,
  created_at TEXT NOT NULL,
  runtime_instance_id TEXT NOT NULL,
  stage_sequence INTEGER NOT NULL,
  operation_idempotency_key TEXT NOT NULL,
  restart_safe INTEGER NOT NULL,
  side_effect_state TEXT NOT NULL,
  evidence_json TEXT NOT NULL,
  input_fingerprint TEXT,
  output_fingerprint TEXT,
  status TEXT NOT NULL,
  capability_version TEXT NOT NULL,
  policy_version TEXT NOT NULL,
  metadata_json TEXT NOT NULL,
  FOREIGN KEY(attempt_id) REFERENCES attempts(attempt_id)
);

CREATE TABLE recovery_sessions (
  recovery_session_id TEXT PRIMARY KEY,
  installation_id TEXT NOT NULL,
  recovery_runtime_instance_id TEXT NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  status TEXT NOT NULL,
  scan_count INTEGER NOT NULL,
  recoverable_count INTEGER NOT NULL,
  blocked_count INTEGER NOT NULL,
  resumed_count INTEGER NOT NULL,
  new_attempt_count INTEGER NOT NULL,
  error_summary TEXT
);

CREATE TABLE recovery_decisions (
  recovery_decision_id TEXT PRIMARY KEY,
  recovery_session_id TEXT NOT NULL,
  attempt_id TEXT NOT NULL,
  classification TEXT NOT NULL,
  decision TEXT NOT NULL,
  reason TEXT NOT NULL,
  policy_version TEXT NOT NULL,
  control_plane_authorization_ref TEXT NOT NULL,
  checkpoint_id TEXT,
  created_at TEXT NOT NULL,
  decided_by TEXT NOT NULL,
  operator_review_required INTEGER NOT NULL,
  fencing_token INTEGER NOT NULL,
  FOREIGN KEY(recovery_session_id) REFERENCES recovery_sessions(recovery_session_id),
  FOREIGN KEY(attempt_id) REFERENCES attempts(attempt_id),
  FOREIGN KEY(checkpoint_id) REFERENCES recovery_checkpoints(checkpoint_id)
);

CREATE TABLE recovery_events (
  event_id TEXT PRIMARY KEY,
  recovery_session_id TEXT NOT NULL,
  attempt_id TEXT,
  event_type TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  runtime_instance_id TEXT NOT NULL,
  outcome TEXT NOT NULL,
  message TEXT NOT NULL,
  details_json TEXT NOT NULL,
  FOREIGN KEY(recovery_session_id) REFERENCES recovery_sessions(recovery_session_id)
);

CREATE TABLE attempt_lineage (
  lineage_id TEXT PRIMARY KEY,
  current_attempt_id TEXT NOT NULL,
  prior_attempt_id TEXT NOT NULL,
  relationship TEXT NOT NULL,
  created_at TEXT NOT NULL,
  reason TEXT NOT NULL,
  FOREIGN KEY(current_attempt_id) REFERENCES attempts(attempt_id),
  FOREIGN KEY(prior_attempt_id) REFERENCES attempts(attempt_id)
);

CREATE INDEX idx_recovery_checkpoints_attempt ON recovery_checkpoints(attempt_id, stage_sequence, created_at);
CREATE INDEX idx_recovery_sessions_time ON recovery_sessions(started_at, recovery_session_id);
CREATE INDEX idx_recovery_decisions_session ON recovery_decisions(recovery_session_id, attempt_id);
CREATE INDEX idx_recovery_decisions_attempt ON recovery_decisions(attempt_id, created_at);
CREATE INDEX idx_recovery_events_session ON recovery_events(recovery_session_id, timestamp, event_id);
CREATE INDEX idx_attempt_lineage_prior ON attempt_lineage(prior_attempt_id, current_attempt_id);
`
  },
  {
    version: 3,
    name: "isolated_execution_engine_v1",
    sql: `
CREATE TABLE executions (
  execution_id TEXT PRIMARY KEY,
  attempt_id TEXT NOT NULL,
  authorization_id TEXT NOT NULL,
  executable_id TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  policy_version TEXT NOT NULL,
  workspace_identity TEXT NOT NULL,
  state TEXT NOT NULL,
  process_exit_code INTEGER,
  created_at TEXT NOT NULL,
  started_at TEXT,
  completed_at TEXT,
  timeout_ms INTEGER NOT NULL,
  cancellation_reason TEXT,
  output_summary_json TEXT NOT NULL,
  optimistic_version INTEGER NOT NULL,
  evidence_root TEXT,
  FOREIGN KEY(attempt_id) REFERENCES attempts(attempt_id)
);

CREATE TABLE execution_events (
  event_id TEXT PRIMARY KEY,
  execution_id TEXT NOT NULL,
  sequence INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  runtime_instance_id TEXT NOT NULL,
  outcome TEXT NOT NULL,
  message TEXT NOT NULL,
  details_json TEXT NOT NULL,
  UNIQUE(execution_id, sequence),
  FOREIGN KEY(execution_id) REFERENCES executions(execution_id)
);

CREATE TABLE execution_inputs (
  execution_id TEXT NOT NULL,
  input_identity TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_reference TEXT NOT NULL,
  workspace_path TEXT NOT NULL,
  hash TEXT NOT NULL,
  size INTEGER NOT NULL,
  metadata_json TEXT NOT NULL,
  PRIMARY KEY(execution_id, input_identity),
  FOREIGN KEY(execution_id) REFERENCES executions(execution_id)
);

CREATE TABLE execution_outputs (
  execution_id TEXT NOT NULL,
  declared_output_identity TEXT NOT NULL,
  workspace_path TEXT NOT NULL,
  hash TEXT,
  size INTEGER NOT NULL,
  status TEXT NOT NULL,
  evidence_reference TEXT,
  metadata_json TEXT NOT NULL,
  PRIMARY KEY(execution_id, declared_output_identity),
  FOREIGN KEY(execution_id) REFERENCES executions(execution_id)
);

CREATE TABLE execution_authorizations (
  authorization_id TEXT PRIMARY KEY,
  execution_id TEXT NOT NULL,
  attempt_id TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  executable_id TEXT NOT NULL,
  policy_version TEXT NOT NULL,
  issued_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  required_gates_json TEXT NOT NULL,
  integrity_hash TEXT NOT NULL,
  metadata_json TEXT NOT NULL,
  FOREIGN KEY(execution_id) REFERENCES executions(execution_id),
  FOREIGN KEY(attempt_id) REFERENCES attempts(attempt_id)
);

CREATE INDEX idx_executions_attempt ON executions(attempt_id, created_at);
CREATE INDEX idx_executions_state ON executions(state, created_at);
CREATE INDEX idx_execution_events_execution ON execution_events(execution_id, sequence);
CREATE INDEX idx_execution_authorizations_attempt ON execution_authorizations(attempt_id, issued_at);
`
  },
  {
    version: 4,
    name: "evaluation_engine_v1",
    sql: `
CREATE TABLE evaluation_specs (
  specification_id TEXT PRIMARY KEY,
  attempt_id TEXT NOT NULL,
  execution_id TEXT NOT NULL,
  profile_id TEXT NOT NULL,
  profile_version TEXT NOT NULL,
  policy_version TEXT NOT NULL,
  specification_hash TEXT NOT NULL,
  approval_reference TEXT,
  created_at TEXT NOT NULL,
  expires_at TEXT,
  normalized_specification_json TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  request_hash TEXT NOT NULL,
  evaluation_id TEXT NOT NULL UNIQUE
);

CREATE TABLE evaluations (
  evaluation_id TEXT PRIMARY KEY,
  specification_id TEXT NOT NULL UNIQUE,
  attempt_id TEXT NOT NULL,
  execution_id TEXT NOT NULL,
  state TEXT NOT NULL,
  aggregate_outcome TEXT,
  required_pass_count INTEGER NOT NULL,
  required_fail_count INTEGER NOT NULL,
  blocked_count INTEGER NOT NULL,
  warning_count INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  started_at TEXT,
  completed_at TEXT,
  optimistic_version INTEGER NOT NULL,
  failure_or_block_reason TEXT,
  evidence_root TEXT,
  FOREIGN KEY(specification_id) REFERENCES evaluation_specs(specification_id)
);

CREATE TABLE evaluation_assertions (
  evaluation_id TEXT NOT NULL,
  assertion_id TEXT NOT NULL,
  evaluator_id TEXT NOT NULL,
  evaluator_version TEXT NOT NULL,
  required INTEGER NOT NULL,
  outcome TEXT NOT NULL,
  expected_summary TEXT NOT NULL,
  actual_summary TEXT NOT NULL,
  message TEXT NOT NULL,
  evidence_references_json TEXT NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT NOT NULL,
  duration_ms INTEGER NOT NULL,
  sequence INTEGER NOT NULL,
  PRIMARY KEY(evaluation_id, assertion_id),
  UNIQUE(evaluation_id, sequence),
  FOREIGN KEY(evaluation_id) REFERENCES evaluations(evaluation_id)
);

CREATE TABLE evaluation_events (
  event_id TEXT PRIMARY KEY,
  evaluation_id TEXT NOT NULL,
  sequence INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  runtime_instance_id TEXT NOT NULL,
  outcome TEXT NOT NULL,
  message TEXT NOT NULL,
  details_json TEXT NOT NULL,
  UNIQUE(evaluation_id, sequence),
  FOREIGN KEY(evaluation_id) REFERENCES evaluations(evaluation_id)
);

CREATE TABLE evaluation_profiles (
  profile_id TEXT NOT NULL,
  profile_version TEXT NOT NULL,
  policy_version TEXT NOT NULL,
  integrity_hash TEXT NOT NULL,
  registered_at TEXT NOT NULL,
  metadata_json TEXT NOT NULL,
  PRIMARY KEY(profile_id, profile_version)
);

CREATE INDEX idx_evaluation_specs_attempt ON evaluation_specs(attempt_id, created_at);
CREATE INDEX idx_evaluations_attempt ON evaluations(attempt_id, created_at);
CREATE INDEX idx_evaluations_state ON evaluations(state, created_at);
CREATE INDEX idx_evaluation_assertions_eval ON evaluation_assertions(evaluation_id, sequence);
CREATE INDEX idx_evaluation_events_eval ON evaluation_events(evaluation_id, sequence);
`
  },
  {
    version: 5,
    name: "local_model_runtime_v1",
    sql: `
CREATE TABLE model_providers (
  provider_id TEXT PRIMARY KEY,
  provider_version TEXT NOT NULL,
  provider_type TEXT NOT NULL,
  enabled INTEGER NOT NULL,
  local_only INTEGER NOT NULL,
  offline_compatible INTEGER NOT NULL,
  network_capability TEXT NOT NULL,
  configuration_hash TEXT NOT NULL,
  provider_fingerprint TEXT NOT NULL,
  health_state TEXT NOT NULL,
  last_health_timestamp TEXT NOT NULL,
  metadata_json TEXT NOT NULL
);

CREATE TABLE model_catalog (
  provider_id TEXT NOT NULL,
  model_id TEXT NOT NULL,
  model_version TEXT,
  model_fingerprint TEXT NOT NULL,
  display_name TEXT NOT NULL,
  model_family TEXT NOT NULL,
  capabilities_json TEXT NOT NULL,
  availability TEXT NOT NULL,
  context_limit INTEGER,
  output_limit INTEGER,
  tool_use_support INTEGER NOT NULL,
  structured_output_support INTEGER NOT NULL,
  embedding_support INTEGER NOT NULL,
  local_storage_reference TEXT,
  metadata_sources_json TEXT NOT NULL,
  observed_at TEXT NOT NULL,
  metadata_json TEXT NOT NULL,
  PRIMARY KEY(provider_id, model_id),
  FOREIGN KEY(provider_id) REFERENCES model_providers(provider_id)
);

CREATE TABLE model_authorizations (
  authorization_id TEXT PRIMARY KEY,
  attempt_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  model_id TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  invocation_profile TEXT NOT NULL,
  limits_json TEXT NOT NULL,
  allowed_capabilities_json TEXT NOT NULL,
  offline_policy TEXT NOT NULL,
  local_only_required INTEGER NOT NULL,
  tool_use_policy TEXT NOT NULL,
  policy_version TEXT NOT NULL,
  issued_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  integrity_hash TEXT NOT NULL,
  metadata_json TEXT NOT NULL,
  FOREIGN KEY(attempt_id) REFERENCES attempts(attempt_id)
);

CREATE TABLE model_invocations (
  invocation_id TEXT PRIMARY KEY,
  attempt_id TEXT NOT NULL,
  authorization_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  model_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  request_hash TEXT NOT NULL,
  state TEXT NOT NULL,
  response_hash TEXT,
  input_byte_count INTEGER NOT NULL,
  output_byte_count INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  started_at TEXT,
  completed_at TEXT,
  timeout_ms INTEGER NOT NULL,
  failure_or_block_reason TEXT,
  optimistic_version INTEGER NOT NULL,
  evidence_root TEXT,
  FOREIGN KEY(attempt_id) REFERENCES attempts(attempt_id)
);

CREATE TABLE model_events (
  event_id TEXT PRIMARY KEY,
  invocation_id TEXT NOT NULL,
  sequence INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  runtime_instance_id TEXT NOT NULL,
  outcome TEXT NOT NULL,
  message TEXT NOT NULL,
  details_json TEXT NOT NULL,
  UNIQUE(invocation_id, sequence),
  FOREIGN KEY(invocation_id) REFERENCES model_invocations(invocation_id)
);

CREATE TABLE model_artifacts (
  invocation_id TEXT NOT NULL,
  artifact_type TEXT NOT NULL,
  evidence_location TEXT NOT NULL,
  integrity_hash TEXT NOT NULL,
  size INTEGER NOT NULL,
  redaction_state TEXT NOT NULL,
  metadata_json TEXT NOT NULL,
  PRIMARY KEY(invocation_id, artifact_type),
  FOREIGN KEY(invocation_id) REFERENCES model_invocations(invocation_id)
);

CREATE INDEX idx_model_invocations_attempt ON model_invocations(attempt_id, created_at);
CREATE INDEX idx_model_invocations_state ON model_invocations(state, created_at);
CREATE INDEX idx_model_events_invocation ON model_events(invocation_id, sequence);
CREATE INDEX idx_model_catalog_provider ON model_catalog(provider_id, model_id);
`
  }
];

export function createRuntimeStateConfig(input: RuntimeStateConfigInput = {}): RuntimeStateConfig {
  const projectRoot = path.resolve(input.projectRoot ?? process.cwd());
  const stateRoot = path.resolve(input.stateRoot ?? path.join(projectRoot, ".sera", "state"));
  const databasePath = path.resolve(input.databasePath ?? path.join(stateRoot, "sera-operational.db"));
  const backupRoot = path.resolve(input.backupRoot ?? path.join(stateRoot, "backups"));
  const exportRoot = path.resolve(input.exportRoot ?? path.join(stateRoot, "exports"));
  for (const [name, value] of [["stateRoot", stateRoot], ["databasePath", databasePath], ["backupRoot", backupRoot], ["exportRoot", exportRoot]] as const) {
    if (!path.isAbsolute(value)) throw new RuntimeStateBlockedError(`${name} must be absolute.`, "invalid_path");
  }
  return {
    stateRoot,
    databasePath,
    backupRoot,
    exportRoot,
    busyTimeoutMs: input.busyTimeoutMs ?? 5000,
    journalMode: "wal",
    synchronous: "full",
    runtimeVersion: input.runtimeVersion ?? RUNTIME_STATE_VERSION,
    installationId: input.installationId ?? "installation_local_state",
    runtimeInstanceId: input.runtimeInstanceId ?? `runtime_state_${process.pid}`
  };
}

export class RuntimeStateStore {
  private db?: DatabaseSync;
  private readonly migrations: Migration[];

  constructor(
    private readonly config: RuntimeStateConfig,
    private readonly clock: RuntimeStateClock = { now: () => new Date() },
    migrations: Migration[] = DEFAULT_RUNTIME_STATE_MIGRATIONS
  ) {
    this.migrations = [...migrations].sort((a, b) => a.version - b.version);
  }

  initialize(): RuntimeStateInspection {
    fs.mkdirSync(this.config.stateRoot, { recursive: true });
    fs.mkdirSync(path.dirname(this.config.databasePath), { recursive: true });
    this.db = new DatabaseSync(this.config.databasePath);
    try {
      this.configureDatabase();
      this.assertIntegrity();
      this.applyMigrations();
      this.assertIntegrity();
      this.recordEvent("runtime_state_initialized", "PASS", "Runtime State initialized.", { schemaVersion: RUNTIME_STATE_SCHEMA_VERSION });
      return this.inspect();
    } catch (error) {
      this.close();
      if (error instanceof RuntimeStateBlockedError) throw error;
      throw new RuntimeStateBlockedError(errorMessage(error), "state_initialization_failed");
    }
  }

  close(): void {
    this.db?.close();
    this.db = undefined;
  }

  inspect(): RuntimeStateInspection {
    const db = this.requireDb();
    const schemaVersion = this.currentSchemaVersion();
    const counts = Object.fromEntries(TABLES.map((table) => [table, numberValue(db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get(), "count")]));
    const leases = db.prepare("SELECT lease_name, owning_runtime_instance_id, acquired_at, renewed_at, expires_at, fencing_token, released_at, status FROM runtime_leases ORDER BY lease_name").all() as Array<Record<string, unknown>>;
    const lastEvent = (db.prepare("SELECT event_id, event_type, timestamp, outcome, message FROM state_events ORDER BY timestamp DESC, event_id DESC LIMIT 1").get() as Record<string, unknown> | undefined) ?? null;
    return {
      ok: true,
      status: "healthy",
      databasePath: this.config.databasePath,
      schemaVersion,
      sqlite: this.effectiveSqliteConfiguration(),
      counts,
      leases,
      lastEvent,
      message: "SQLite Operational State is healthy.",
      modelUse: false,
      networkUse: false
    };
  }

  integrity(): RuntimeStateInspection {
    this.assertIntegrity();
    return this.inspect();
  }

  acceptCommand(input: {
    idempotencyKey: string;
    commandType: string;
    payload: unknown;
    capability: string;
    priorAttemptId?: string;
  }): AcceptedCommand {
    return this.transaction(() => {
      const requestHash = stableHash({ commandType: input.commandType, payload: input.payload, capability: input.capability, priorAttemptId: input.priorAttemptId ?? null });
      const existing = this.get<{ request_hash: string; response_json: string }>("SELECT request_hash, response_json FROM idempotency_records WHERE idempotency_key = ?", [input.idempotencyKey]);
      if (existing) {
        if (existing.request_hash !== requestHash) throw new RuntimeStateBlockedError("Idempotency key was reused for a conflicting command.", "conflicting_idempotency_key");
        return { ...(JSON.parse(existing.response_json) as AcceptedCommand), status: "DUPLICATE", message: "Duplicate idempotency key returned original durable command." };
      }
      const now = this.now();
      const commandId = id("command");
      const attemptId = id("attempt");
      this.run("INSERT INTO commands (command_id, idempotency_key, command_type, payload_json, submitted_at, originating_installation_id, originating_runtime_instance_id, status, attempt_id, version) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
        commandId,
        input.idempotencyKey,
        input.commandType,
        stableJson(input.payload),
        now,
        this.config.installationId,
        this.config.runtimeInstanceId,
        "ACCEPTED",
        null,
        1
      ]);
      this.run("INSERT INTO attempts (attempt_id, command_id, capability, current_state, terminal, created_at, updated_at, completed_at, reason, optimistic_version, prior_attempt_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
        attemptId,
        commandId,
        input.capability,
        "PENDING",
        0,
        now,
        now,
        null,
        null,
        1,
        input.priorAttemptId ?? null
      ]);
      this.insertTransition(attemptId, "PENDING", "PENDING", "control-plane-adapter", "attempt-created", { commandId }, now);
      this.run("UPDATE commands SET status = ?, attempt_id = ?, version = version + 1 WHERE command_id = ?", ["ATTEMPT_ASSIGNED", attemptId, commandId]);
      const response: AcceptedCommand = { ok: true, status: "ACCEPTED", commandId, attemptId, message: "Command accepted and attempt created durably." };
      this.run("INSERT INTO idempotency_records (idempotency_key, request_hash, command_id, attempt_id, created_at, response_json) VALUES (?, ?, ?, ?, ?, ?)", [
        input.idempotencyKey,
        requestHash,
        commandId,
        attemptId,
        now,
        stableJson(response)
      ]);
      this.recordEvent("command_accepted", "PASS", "Command accepted.", { commandId, attemptId }, commandId, attemptId);
      return response;
    });
  }

  transitionAttempt(input: {
    attemptId: string;
    fromState: AttemptState;
    toState: AttemptState;
    actor: string;
    reason?: string;
    expectedVersion?: number;
    correlation?: unknown;
  }): { ok: true; sequenceNumber: number; optimisticVersion: number } {
    return this.transaction(() => {
      const attempt = this.requireAttempt(input.attemptId);
      if (attempt.current_state !== input.fromState) throw new RuntimeStateBlockedError(`Attempt is in ${attempt.current_state}, not ${input.fromState}.`, "attempt_state_mismatch");
      if (input.expectedVersion !== undefined && attempt.optimistic_version !== input.expectedVersion) throw new RuntimeStateBlockedError("Attempt optimistic version mismatch.", "optimistic_version_mismatch");
      if (attempt.terminal === 1) throw new RuntimeStateBlockedError("Terminal attempts are immutable.", "terminal_attempt_immutable");
      if (!VALID_TRANSITIONS[input.fromState]?.includes(input.toState)) throw new RuntimeStateBlockedError(`Invalid transition ${input.fromState} -> ${input.toState}.`, "invalid_attempt_transition");
      if ((input.toState === "COMPLETED" || input.toState === "COMPLETED_WITH_WARNINGS") && !this.requiredGatesPassed(input.attemptId)) {
        throw new RuntimeStateBlockedError("Required gates are incomplete or failed.", "required_gate_incomplete");
      }
      const now = this.now();
      const terminal = TERMINAL_STATES.has(input.toState) ? 1 : 0;
      const reason = TERMINAL_STATES.has(input.toState) ? input.reason ?? attempt.reason : input.reason ?? attempt.reason;
      const completedAt = terminal ? now : attempt.completed_at ?? null;
      const nextVersion = attempt.optimistic_version + 1;
      this.run("UPDATE attempts SET current_state = ?, terminal = ?, updated_at = ?, completed_at = ?, reason = ?, optimistic_version = ? WHERE attempt_id = ? AND optimistic_version = ?", [
        input.toState,
        terminal,
        now,
        completedAt,
        reason ?? null,
        nextVersion,
        input.attemptId,
        attempt.optimistic_version
      ]);
      const sequenceNumber = this.insertTransition(input.attemptId, input.fromState, input.toState, input.actor, input.reason, input.correlation ?? {}, now);
      this.recordEvent("attempt_transition", "PASS", `${input.fromState} -> ${input.toState}`, { sequenceNumber }, attempt.command_id, input.attemptId);
      return { ok: true, sequenceNumber, optimisticVersion: nextVersion };
    });
  }

  recordGateOutcome(input: {
    attemptId: string;
    gateName: string;
    required: boolean;
    outcome: GateOutcome;
    evidenceReferences?: string[];
    message?: string;
    evaluator: string;
  }): void {
    this.transaction(() => {
      this.requireAttempt(input.attemptId);
      const existing = this.get<{ gate_outcome_id: string }>("SELECT gate_outcome_id FROM gate_outcomes WHERE attempt_id = ? AND gate_name = ?", [input.attemptId, input.gateName]);
      const now = this.now();
      if (existing) {
        this.run("UPDATE gate_outcomes SET required = ?, outcome = ?, evaluated_at = ?, evidence_json = ?, message = ?, evaluator = ? WHERE gate_outcome_id = ?", [
          input.required ? 1 : 0,
          input.outcome,
          now,
          stableJson(input.evidenceReferences ?? []),
          input.message ?? null,
          input.evaluator,
          existing.gate_outcome_id
        ]);
      } else {
        this.run("INSERT INTO gate_outcomes (gate_outcome_id, attempt_id, gate_name, required, outcome, evaluated_at, evidence_json, message, evaluator) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", [
          id("gate"),
          input.attemptId,
          input.gateName,
          input.required ? 1 : 0,
          input.outcome,
          now,
          stableJson(input.evidenceReferences ?? []),
          input.message ?? null,
          input.evaluator
        ]);
      }
      this.recordEvent("gate_outcome_recorded", input.outcome, input.message ?? "Gate outcome recorded.", { gateName: input.gateName, required: input.required }, undefined, input.attemptId);
    });
  }

  recordEvidenceReference(input: {
    attemptId: string;
    evidenceType: string;
    location: string;
    integrityHash?: string;
    producer: string;
    metadata?: unknown;
  }): string {
    return this.transaction(() => {
      this.requireAttempt(input.attemptId);
      const evidenceReferenceId = id("evidence");
      this.run("INSERT INTO evidence_references (evidence_reference_id, attempt_id, evidence_type, location, integrity_hash, created_at, producer, metadata_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [
        evidenceReferenceId,
        input.attemptId,
        input.evidenceType,
        input.location,
        input.integrityHash ?? null,
        this.now(),
        input.producer,
        stableJson(input.metadata ?? {})
      ]);
      this.recordEvent("evidence_reference_recorded", "PASS", "Evidence reference recorded.", { evidenceReferenceId }, undefined, input.attemptId);
      return evidenceReferenceId;
    });
  }

  acquireLease(input: { leaseName: string; ttlMs: number; ownerRuntimeInstanceId?: string }): { ok: true; fencingToken: number; status: "acquired" | "reacquired" } {
    return this.transaction(() => {
      const now = this.now();
      const owner = input.ownerRuntimeInstanceId ?? this.config.runtimeInstanceId;
      const expiresAt = new Date(Date.parse(now) + input.ttlMs).toISOString();
      const existing = this.get<{ owning_runtime_instance_id: string; expires_at: string; fencing_token: number; status: string }>("SELECT owning_runtime_instance_id, expires_at, fencing_token, status FROM runtime_leases WHERE lease_name = ?", [input.leaseName]);
      if (existing && existing.status === "active" && Date.parse(existing.expires_at) > Date.parse(now) && existing.owning_runtime_instance_id !== owner) {
        throw new RuntimeStateBlockedError("Lease is held by a live owner.", "lease_conflict");
      }
      const nextFence = existing ? Number(existing.fencing_token) + (existing.owning_runtime_instance_id === owner && existing.status === "active" ? 0 : 1) : 1;
      if (existing) {
        this.run("UPDATE runtime_leases SET owning_runtime_instance_id = ?, acquired_at = ?, renewed_at = ?, expires_at = ?, fencing_token = ?, released_at = NULL, status = 'active' WHERE lease_name = ?", [owner, now, now, expiresAt, nextFence, input.leaseName]);
      } else {
        this.run("INSERT INTO runtime_leases (lease_name, owning_runtime_instance_id, acquired_at, renewed_at, expires_at, fencing_token, released_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [input.leaseName, owner, now, now, expiresAt, nextFence, null, "active"]);
      }
      this.recordEvent("lease_acquired", "PASS", "Lease acquired.", { leaseName: input.leaseName, fencingToken: nextFence });
      return { ok: true, fencingToken: nextFence, status: existing ? "reacquired" : "acquired" };
    });
  }

  renewLease(input: { leaseName: string; fencingToken: number; ttlMs: number; ownerRuntimeInstanceId?: string }): void {
    this.transaction(() => {
      this.assertFence(input.leaseName, input.fencingToken, input.ownerRuntimeInstanceId);
      const now = this.now();
      this.run("UPDATE runtime_leases SET renewed_at = ?, expires_at = ? WHERE lease_name = ?", [now, new Date(Date.parse(now) + input.ttlMs).toISOString(), input.leaseName]);
      this.recordEvent("lease_renewed", "PASS", "Lease renewed.", { leaseName: input.leaseName, fencingToken: input.fencingToken });
    });
  }

  releaseLease(input: { leaseName: string; fencingToken: number; ownerRuntimeInstanceId?: string }): void {
    this.transaction(() => {
      this.assertFence(input.leaseName, input.fencingToken, input.ownerRuntimeInstanceId);
      this.run("UPDATE runtime_leases SET released_at = ?, status = 'released' WHERE lease_name = ?", [this.now(), input.leaseName]);
      this.recordEvent("lease_released", "PASS", "Lease released.", { leaseName: input.leaseName, fencingToken: input.fencingToken });
    });
  }

  assertFence(leaseName: string, fencingToken: number, ownerRuntimeInstanceId = this.config.runtimeInstanceId): void {
    const lease = this.get<{ owning_runtime_instance_id: string; fencing_token: number; status: string; expires_at: string }>("SELECT owning_runtime_instance_id, fencing_token, status, expires_at FROM runtime_leases WHERE lease_name = ?", [leaseName]);
    if (!lease) throw new RuntimeStateBlockedError("Lease does not exist.", "missing_lease");
    if (lease.status !== "active") throw new RuntimeStateBlockedError("Lease is not active.", "inactive_lease");
    if (lease.owning_runtime_instance_id !== ownerRuntimeInstanceId) throw new RuntimeStateBlockedError("Lease owner mismatch.", "lease_owner_mismatch");
    if (Number(lease.fencing_token) !== fencingToken) throw new RuntimeStateBlockedError("Stale fencing token rejected.", "stale_fencing_token");
    if (Date.parse(String(lease.expires_at)) <= Date.parse(this.now())) throw new RuntimeStateBlockedError("Lease is expired.", "expired_lease");
  }

  backup(destination?: string): { ok: true; path: string; sha256: string; bytes: number; integrity: RuntimeStateInspection } {
    this.assertIntegrity();
    const backupPath = path.resolve(destination ?? path.join(this.config.backupRoot, `sera-operational-${timestampForFile(this.now())}.db`));
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    this.requireDb().exec(`VACUUM INTO ${sqlString(backupPath)}`);
    const copied = new DatabaseSync(backupPath, { readOnly: true });
    try {
      const result = String((copied.prepare("PRAGMA integrity_check").get() as { integrity_check: string }).integrity_check);
      if (result !== "ok") throw new RuntimeStateBlockedError(`Backup integrity check failed: ${result}`, "backup_integrity_failed");
    } finally {
      copied.close();
    }
    const stat = fs.statSync(backupPath);
    return { ok: true, path: backupPath, sha256: sha256File(backupPath), bytes: stat.size, integrity: this.inspect() };
  }

  exportJson(destination?: string, includeVolatile = true): { ok: true; path: string; sha256: string; recordCounts: Record<string, number>; export: Record<string, unknown> } {
    const exportPath = path.resolve(destination ?? path.join(this.config.exportRoot, `sera-operational-export-${timestampForFile(this.now())}.json`));
    fs.mkdirSync(path.dirname(exportPath), { recursive: true });
    const doc = this.exportDocument(includeVolatile);
    fs.writeFileSync(exportPath, `${stableJson(doc)}\n`, "utf8");
    const recordCounts = {
      commands: (doc.commands as unknown[]).length,
      attempts: (doc.attempts as unknown[]).length,
      transitions: (doc.transitions as unknown[]).length,
      gateOutcomes: (doc.gateOutcomes as unknown[]).length,
      evidenceReferences: (doc.evidenceReferences as unknown[]).length,
      runtimeLeases: (doc.runtimeLeases as unknown[]).length,
      stateEvents: (doc.stateEvents as unknown[]).length
    };
    return { ok: true, path: exportPath, sha256: sha256File(exportPath), recordCounts, export: doc };
  }

  exportDocument(includeVolatile = true): Record<string, unknown> {
    const db = this.requireDb();
    return normalizeForJson({
      schemaVersion: RUNTIME_STATE_EXPORT_SCHEMA,
      stateSchemaVersion: this.currentSchemaVersion(),
      exportTimestamp: includeVolatile ? this.now() : "<normalized>",
      installationId: includeVolatile ? this.config.installationId : "<installation>",
      runtimeInstanceId: includeVolatile ? this.config.runtimeInstanceId : "<runtime>",
      commands: all(db, "SELECT command_id, idempotency_key, command_type, payload_json, submitted_at, originating_installation_id, originating_runtime_instance_id, status, attempt_id, version FROM commands ORDER BY command_id"),
      attempts: all(db, "SELECT attempt_id, command_id, capability, current_state, terminal, created_at, updated_at, completed_at, reason, optimistic_version, prior_attempt_id FROM attempts ORDER BY attempt_id"),
      transitions: all(db, "SELECT transition_id, attempt_id, from_state, to_state, transitioned_at, actor, reason, runtime_instance_id, sequence_number, correlation_json FROM attempt_transitions ORDER BY attempt_id, sequence_number, transition_id"),
      gateOutcomes: all(db, "SELECT gate_outcome_id, attempt_id, gate_name, required, outcome, evaluated_at, evidence_json, message, evaluator FROM gate_outcomes ORDER BY attempt_id, gate_name"),
      evidenceReferences: all(db, "SELECT evidence_reference_id, attempt_id, evidence_type, location, integrity_hash, created_at, producer, metadata_json FROM evidence_references ORDER BY attempt_id, evidence_reference_id"),
      runtimeLeases: all(db, "SELECT lease_name, owning_runtime_instance_id, acquired_at, renewed_at, expires_at, fencing_token, released_at, status FROM runtime_leases ORDER BY lease_name"),
      stateEvents: all(db, "SELECT event_id, event_type, timestamp, installation_id, runtime_instance_id, related_command_id, related_attempt_id, outcome, message, details_json FROM state_events ORDER BY timestamp, event_id"),
      recoveryCheckpoints: this.tableExists("recovery_checkpoints") ? all(db, "SELECT checkpoint_id, attempt_id, stage_id, checkpoint_type, created_at, runtime_instance_id, stage_sequence, operation_idempotency_key, restart_safe, side_effect_state, evidence_json, input_fingerprint, output_fingerprint, status, capability_version, policy_version, metadata_json FROM recovery_checkpoints ORDER BY attempt_id, stage_sequence, checkpoint_id") : [],
      recoverySessions: this.tableExists("recovery_sessions") ? all(db, "SELECT recovery_session_id, installation_id, recovery_runtime_instance_id, started_at, completed_at, status, scan_count, recoverable_count, blocked_count, resumed_count, new_attempt_count, error_summary FROM recovery_sessions ORDER BY started_at, recovery_session_id") : [],
      recoveryDecisions: this.tableExists("recovery_decisions") ? all(db, "SELECT recovery_decision_id, recovery_session_id, attempt_id, classification, decision, reason, policy_version, control_plane_authorization_ref, checkpoint_id, created_at, decided_by, operator_review_required, fencing_token FROM recovery_decisions ORDER BY recovery_session_id, created_at, recovery_decision_id") : [],
      recoveryEvents: this.tableExists("recovery_events") ? all(db, "SELECT event_id, recovery_session_id, attempt_id, event_type, timestamp, runtime_instance_id, outcome, message, details_json FROM recovery_events ORDER BY recovery_session_id, timestamp, event_id") : [],
      attemptLineage: this.tableExists("attempt_lineage") ? all(db, "SELECT lineage_id, current_attempt_id, prior_attempt_id, relationship, created_at, reason FROM attempt_lineage ORDER BY prior_attempt_id, current_attempt_id") : [],
      executions: this.tableExists("executions") ? all(db, "SELECT execution_id, attempt_id, authorization_id, executable_id, request_hash, policy_version, workspace_identity, state, process_exit_code, created_at, started_at, completed_at, timeout_ms, cancellation_reason, output_summary_json, optimistic_version, evidence_root FROM executions ORDER BY created_at, execution_id") : [],
      executionEvents: this.tableExists("execution_events") ? all(db, "SELECT event_id, execution_id, sequence, event_type, timestamp, runtime_instance_id, outcome, message, details_json FROM execution_events ORDER BY execution_id, sequence") : [],
      executionInputs: this.tableExists("execution_inputs") ? all(db, "SELECT execution_id, input_identity, source_type, source_reference, workspace_path, hash, size, metadata_json FROM execution_inputs ORDER BY execution_id, input_identity") : [],
      executionOutputs: this.tableExists("execution_outputs") ? all(db, "SELECT execution_id, declared_output_identity, workspace_path, hash, size, status, evidence_reference, metadata_json FROM execution_outputs ORDER BY execution_id, declared_output_identity") : [],
      executionAuthorizations: this.tableExists("execution_authorizations") ? all(db, "SELECT authorization_id, execution_id, attempt_id, request_hash, executable_id, policy_version, issued_at, expires_at, required_gates_json, integrity_hash, metadata_json FROM execution_authorizations ORDER BY issued_at, authorization_id") : [],
      evaluationSpecs: this.tableExists("evaluation_specs") ? all(db, "SELECT specification_id, attempt_id, execution_id, profile_id, profile_version, policy_version, specification_hash, approval_reference, created_at, expires_at, normalized_specification_json, idempotency_key, request_hash, evaluation_id FROM evaluation_specs ORDER BY created_at, specification_id") : [],
      evaluations: this.tableExists("evaluations") ? all(db, "SELECT evaluation_id, specification_id, attempt_id, execution_id, state, aggregate_outcome, required_pass_count, required_fail_count, blocked_count, warning_count, created_at, started_at, completed_at, optimistic_version, failure_or_block_reason, evidence_root FROM evaluations ORDER BY created_at, evaluation_id") : [],
      evaluationAssertions: this.tableExists("evaluation_assertions") ? all(db, "SELECT evaluation_id, assertion_id, evaluator_id, evaluator_version, required, outcome, expected_summary, actual_summary, message, evidence_references_json, started_at, completed_at, duration_ms, sequence FROM evaluation_assertions ORDER BY evaluation_id, sequence") : [],
      evaluationEvents: this.tableExists("evaluation_events") ? all(db, "SELECT event_id, evaluation_id, sequence, event_type, timestamp, runtime_instance_id, outcome, message, details_json FROM evaluation_events ORDER BY evaluation_id, sequence") : [],
      evaluationProfiles: this.tableExists("evaluation_profiles") ? all(db, "SELECT profile_id, profile_version, policy_version, integrity_hash, registered_at, metadata_json FROM evaluation_profiles ORDER BY profile_id, profile_version") : [],
      modelProviders: this.tableExists("model_providers") ? all(db, "SELECT provider_id, provider_version, provider_type, enabled, local_only, offline_compatible, network_capability, configuration_hash, provider_fingerprint, health_state, last_health_timestamp, metadata_json FROM model_providers ORDER BY provider_id") : [],
      modelCatalog: this.tableExists("model_catalog") ? all(db, "SELECT provider_id, model_id, model_version, model_fingerprint, display_name, model_family, capabilities_json, availability, context_limit, output_limit, tool_use_support, structured_output_support, embedding_support, local_storage_reference, metadata_sources_json, observed_at, metadata_json FROM model_catalog ORDER BY provider_id, model_id") : [],
      modelAuthorizations: this.tableExists("model_authorizations") ? all(db, "SELECT authorization_id, attempt_id, provider_id, model_id, request_hash, invocation_profile, limits_json, allowed_capabilities_json, offline_policy, local_only_required, tool_use_policy, policy_version, issued_at, expires_at, integrity_hash, metadata_json FROM model_authorizations ORDER BY issued_at, authorization_id") : [],
      modelInvocations: this.tableExists("model_invocations") ? all(db, "SELECT invocation_id, attempt_id, authorization_id, provider_id, model_id, idempotency_key, request_hash, state, response_hash, input_byte_count, output_byte_count, created_at, started_at, completed_at, timeout_ms, failure_or_block_reason, optimistic_version, evidence_root FROM model_invocations ORDER BY created_at, invocation_id") : [],
      modelEvents: this.tableExists("model_events") ? all(db, "SELECT event_id, invocation_id, sequence, event_type, timestamp, runtime_instance_id, outcome, message, details_json FROM model_events ORDER BY invocation_id, sequence") : [],
      modelArtifacts: this.tableExists("model_artifacts") ? all(db, "SELECT invocation_id, artifact_type, evidence_location, integrity_hash, size, redaction_state, metadata_json FROM model_artifacts ORDER BY invocation_id, artifact_type") : []
    }) as Record<string, unknown>;
  }

  recoveryTransaction<T>(fn: (db: DatabaseSync) => T): T {
    return this.transaction(() => fn(this.requireDb()));
  }

  recoveryAll(sql: string, params: SQLInputValue[] = []): Array<Record<string, unknown>> {
    return this.requireDb().prepare(sql).all(...params) as Array<Record<string, unknown>>;
  }

  recoveryGet(sql: string, params: SQLInputValue[] = []): Record<string, unknown> | undefined {
    return this.requireDb().prepare(sql).get(...params) as Record<string, unknown> | undefined;
  }

  recoveryRun(sql: string, params: SQLInputValue[] = []): void {
    this.run(sql, params);
  }

  currentRuntimeInstanceId(): string {
    return this.config.runtimeInstanceId;
  }

  currentInstallationId(): string {
    return this.config.installationId;
  }

  private configureDatabase(): void {
    const db = this.requireDb();
    const journal = String((db.prepare("PRAGMA journal_mode = WAL").get() as { journal_mode: string }).journal_mode).toLowerCase();
    if (journal !== "wal") throw new RuntimeStateBlockedError(`SQLite journal mode is ${journal}, expected wal.`, "sqlite_journal_mode_unsupported");
    db.exec(`PRAGMA foreign_keys = ON`);
    db.exec(`PRAGMA busy_timeout = ${this.config.busyTimeoutMs}`);
    db.exec(`PRAGMA synchronous = FULL`);
  }

  private applyMigrations(): void {
    const db = this.requireDb();
    ensureContiguousMigrations(this.migrations);
    db.exec("CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, name TEXT NOT NULL, checksum TEXT NOT NULL, applied_at TEXT NOT NULL, runtime_version TEXT NOT NULL)");
    const applied = db.prepare("SELECT version, name, checksum FROM schema_migrations ORDER BY version").all() as Array<{ version: number; name: string; checksum: string }>;
    const maxApplied = applied.reduce((max, row) => Math.max(max, Number(row.version)), 0);
    if (maxApplied > RUNTIME_STATE_SCHEMA_VERSION) throw new RuntimeStateBlockedError("Database schema is newer than this runtime supports.", "unsupported_future_schema");
    for (const row of applied) {
      const expected = this.migrations.find((migration) => migration.version === Number(row.version));
      if (!expected) throw new RuntimeStateBlockedError(`Applied migration ${row.version} is unsupported.`, "unknown_migration");
      if (row.name !== expected.name || row.checksum !== migrationChecksum(expected)) throw new RuntimeStateBlockedError(`Applied migration ${row.version} identity changed.`, "migration_checksum_mismatch");
    }
    const appliedVersions = new Set(applied.map((row) => Number(row.version)));
    for (const migration of this.migrations) {
      if (appliedVersions.has(migration.version)) continue;
      this.transaction(() => {
        this.requireDb().exec(migration.sql);
        this.run("INSERT INTO schema_migrations (version, name, checksum, applied_at, runtime_version) VALUES (?, ?, ?, ?, ?)", [
          migration.version,
          migration.name,
          migrationChecksum(migration),
          this.now(),
          this.config.runtimeVersion
        ]);
      });
    }
  }

  private currentSchemaVersion(): number {
    const db = this.requireDb();
    const row = db.prepare("SELECT COALESCE(MAX(version), 0) AS version FROM schema_migrations").get() as { version: number };
    return Number(row.version);
  }

  private tableExists(tableName: string): boolean {
    return Boolean(this.get<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?", [tableName]));
  }

  private assertIntegrity(): void {
    const result = String((this.requireDb().prepare("PRAGMA integrity_check").get() as { integrity_check: string }).integrity_check);
    if (result !== "ok") throw new RuntimeStateBlockedError(`SQLite integrity check failed: ${result}`, "sqlite_integrity_failed");
  }

  private effectiveSqliteConfiguration(): Record<string, unknown> {
    const db = this.requireDb();
    return {
      foreignKeys: numberValue(db.prepare("PRAGMA foreign_keys").get(), "foreign_keys") === 1,
      busyTimeoutMs: numberValue(db.prepare("PRAGMA busy_timeout").get(), "timeout"),
      synchronous: numberValue(db.prepare("PRAGMA synchronous").get(), "synchronous"),
      journalMode: String((db.prepare("PRAGMA journal_mode").get() as { journal_mode: string }).journal_mode).toLowerCase(),
      sqliteVersion: process.versions.sqlite ?? "unknown",
      nodeVersion: process.version,
      implementation: "node:sqlite DatabaseSync"
    };
  }

  private requiredGatesPassed(attemptId: string): boolean {
    const rows = this.requireDb().prepare("SELECT required, outcome FROM gate_outcomes WHERE attempt_id = ?").all(attemptId) as Array<{ required: number; outcome: string }>;
    return rows.some((row) => row.required === 1) && rows.filter((row) => row.required === 1).every((row) => row.outcome === "PASS");
  }

  private insertTransition(attemptId: string, fromState: AttemptState, toState: AttemptState, actor: string, reason: string | undefined, correlation: unknown, transitionedAt: string): number {
    const sequenceNumber = numberValue(this.requireDb().prepare("SELECT COALESCE(MAX(sequence_number), 0) + 1 AS sequenceNumber FROM attempt_transitions WHERE attempt_id = ?").get(attemptId), "sequenceNumber");
    this.run("INSERT INTO attempt_transitions (transition_id, attempt_id, from_state, to_state, transitioned_at, actor, reason, runtime_instance_id, sequence_number, correlation_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
      id("transition"),
      attemptId,
      fromState,
      toState,
      transitionedAt,
      actor,
      reason ?? null,
      this.config.runtimeInstanceId,
      sequenceNumber,
      stableJson(correlation ?? {})
    ]);
    return sequenceNumber;
  }

  private recordEvent(eventType: string, outcome: string, message: string, details: unknown, commandId?: string, attemptId?: string): void {
    this.run("INSERT INTO state_events (event_id, event_type, timestamp, installation_id, runtime_instance_id, related_command_id, related_attempt_id, outcome, message, details_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
      id("event"),
      eventType,
      this.now(),
      this.config.installationId,
      this.config.runtimeInstanceId,
      commandId ?? null,
      attemptId ?? null,
      outcome,
      message,
      stableJson(details ?? {})
    ]);
  }

  private transaction<T>(fn: () => T): T {
    const db = this.requireDb();
    db.exec("BEGIN IMMEDIATE");
    try {
      const result = fn();
      db.exec("COMMIT");
      return result;
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }

  private requireAttempt(attemptId: string): { attempt_id: string; command_id: string; current_state: AttemptState; terminal: number; optimistic_version: number; reason?: string; completed_at?: string } {
    const attempt = this.get<{ attempt_id: string; command_id: string; current_state: AttemptState; terminal: number; optimistic_version: number; reason?: string; completed_at?: string }>("SELECT attempt_id, command_id, current_state, terminal, optimistic_version, reason, completed_at FROM attempts WHERE attempt_id = ?", [attemptId]);
    if (!attempt) throw new RuntimeStateBlockedError("Attempt does not exist.", "missing_attempt");
    return attempt;
  }

  private run(sql: string, params: SQLInputValue[] = []): void {
    this.requireDb().prepare(sql).run(...params);
  }

  private get<T>(sql: string, params: SQLInputValue[] = []): T | undefined {
    return this.requireDb().prepare(sql).get(...params) as T | undefined;
  }

  private requireDb(): DatabaseSync {
    if (!this.db) throw new RuntimeStateBlockedError("Runtime State database is not open.", "database_not_open");
    return this.db;
  }

  private now(): string {
    return this.clock.now().toISOString();
  }
}

export function createRuntimeStateService(configInput: RuntimeStateConfigInput = {}): RuntimeService {
  let store: RuntimeStateStore | undefined;
  return {
    id: "operational-state",
    version: RUNTIME_STATE_VERSION,
    required: true,
    dependencies: [],
    start(context: RuntimeServiceContext) {
      const config = createRuntimeStateConfig({
        projectRoot: context.config.projectRoot,
        stateRoot: configInput.stateRoot,
        databasePath: configInput.databasePath,
        backupRoot: configInput.backupRoot,
        exportRoot: configInput.exportRoot,
        busyTimeoutMs: configInput.busyTimeoutMs,
        installationId: context.identity.installationId,
        runtimeInstanceId: context.identity.runtimeInstanceId,
        runtimeVersion: RUNTIME_STATE_VERSION
      });
      store = new RuntimeStateStore(config);
      store.initialize();
    },
    health(context) {
      const inspection = store?.inspect();
      return {
        serviceId: "operational-state",
        status: inspection?.ok ? "healthy" : "blocked",
        checkedAt: new Date().toISOString(),
        message: inspection?.ok ? "SQLite Operational State is healthy." : "SQLite Operational State is unavailable.",
        details: {
          databasePath: inspection?.databasePath,
          schemaVersion: inspection?.schemaVersion,
          sqlite: inspection?.sqlite,
          runtimeInstanceId: context.identity.runtimeInstanceId
        }
      };
    },
    stop() {
      store?.close();
      store = undefined;
    }
  };
}

export function createRuntimeStateEnabledServices(projectRoot: string, configInput: RuntimeStateConfigInput = {}): RuntimeService[] {
  const controlPlane = createControlPlaneRuntimeService(projectRoot);
  return [
    createRuntimeStateService(configInput),
    {
      ...controlPlane,
      dependencies: ["operational-state"]
    }
  ];
}

export function openRuntimeState(input: RuntimeStateConfigInput = {}, clock?: RuntimeStateClock, migrations?: Migration[]): RuntimeStateStore {
  const store = new RuntimeStateStore(createRuntimeStateConfig(input), clock, migrations);
  store.initialize();
  return store;
}

export async function runRuntimeStateProof(input: RuntimeStateConfigInput = {}, clock: RuntimeStateClock = { now: () => new Date() }): Promise<RuntimeStateProofResult> {
  const usesExplicitState =
    input.projectRoot !== undefined ||
    input.stateRoot !== undefined ||
    input.databasePath !== undefined;
  const proofRoot = usesExplicitState ? path.resolve(input.projectRoot ?? process.cwd()) : fs.mkdtempSync(path.join(os.tmpdir(), "sera-runtime-state-proof-"));
  const config = createRuntimeStateConfig(usesExplicitState ? input : { ...input, projectRoot: proofRoot });
  const store = new RuntimeStateStore(config, clock);
  store.initialize();
  try {
    const command = store.acceptCommand({ idempotencyKey: "proof-command", commandType: "control-plane-proof", payload: { task: "prove" }, capability: "unified-control-plane" });
    const duplicate = store.acceptCommand({ idempotencyKey: "proof-command", commandType: "control-plane-proof", payload: { task: "prove" }, capability: "unified-control-plane" });
    let conflictingIdempotencyBlocked = false;
    try {
      store.acceptCommand({ idempotencyKey: "proof-command", commandType: "control-plane-proof", payload: { task: "different" }, capability: "unified-control-plane" });
    } catch {
      conflictingIdempotencyBlocked = true;
    }
    const attemptId = command.attemptId ?? "";
    let invalidTransitionBlocked = false;
    try {
      store.transitionAttempt({ attemptId, fromState: "PENDING", toState: "COMPLETED", actor: "control-plane" });
    } catch {
      invalidTransitionBlocked = true;
    }
    store.transitionAttempt({ attemptId, fromState: "PENDING", toState: "RUNNING", actor: "control-plane", reason: "proof-running" });
    let gateEnforced = false;
    try {
      store.transitionAttempt({ attemptId, fromState: "RUNNING", toState: "COMPLETED", actor: "control-plane", reason: "premature-success" });
    } catch {
      gateEnforced = true;
    }
    const evidenceId = store.recordEvidenceReference({ attemptId, evidenceType: "proof", location: "proof/evidence.json", integrityHash: stableHash({ proof: true }), producer: "runtime-state-proof", metadata: { bounded: true } });
    store.recordGateOutcome({ attemptId, gateName: "required-proof-gate", required: true, outcome: "PASS", evidenceReferences: [evidenceId], message: "Proof gate passed.", evaluator: "control-plane" });
    store.transitionAttempt({ attemptId, fromState: "RUNNING", toState: "COMPLETED", actor: "control-plane", reason: "proof-complete", correlation: { evidenceId } });
    let terminalImmutable = false;
    try {
      store.transitionAttempt({ attemptId, fromState: "COMPLETED", toState: "FAILED", actor: "direct-store" });
    } catch {
      terminalImmutable = true;
    }
    const lease = store.acquireLease({ leaseName: "proof-resource", ttlMs: 100000 });
    let conflictBlocked = false;
    try {
      store.acquireLease({ leaseName: "proof-resource", ttlMs: 10, ownerRuntimeInstanceId: "other-runtime" });
    } catch {
      conflictBlocked = true;
    }
    const staleToken = lease.fencingToken;
    store.releaseLease({ leaseName: "proof-resource", fencingToken: lease.fencingToken });
    const reacquired = store.acquireLease({ leaseName: "proof-resource", ttlMs: 1000, ownerRuntimeInstanceId: "other-runtime" });
    let staleFenceBlocked = false;
    try {
      store.assertFence("proof-resource", staleToken);
    } catch {
      staleFenceBlocked = true;
    }
    const exportA = stableJson(store.exportDocument(false));
    const exportB = stableJson(store.exportDocument(false));
    const backup = store.backup();
    const inspection = store.inspect();
    store.close();
    const reopened = new RuntimeStateStore(config, clock);
    reopened.initialize();
    const restartPersists = reopened.inspect().counts.commands >= 1;
    reopened.close();
    return {
      ok: command.ok && duplicate.ok && conflictingIdempotencyBlocked && invalidTransitionBlocked && gateEnforced && terminalImmutable && conflictBlocked && staleFenceBlocked && reacquired.fencingToken > staleToken && exportA === exportB && backup.ok && restartPersists,
      status: "healthy",
      proofRoot,
      stateRoot: config.stateRoot,
      databasePath: config.databasePath,
      command,
      duplicate,
      terminalImmutable,
      conflictingIdempotencyBlocked,
      invalidTransitionBlocked,
      gateEnforced,
      exportStable: exportA === exportB,
      backupOk: backup.ok,
      leaseFencingOk: conflictBlocked && staleFenceBlocked && reacquired.fencingToken > staleToken,
      restartPersists,
      inspection,
      modelUse: false,
      networkUse: false
    };
  } finally {
    store.close();
  }
}

function ensureContiguousMigrations(migrations: Migration[]): void {
  migrations.forEach((migration, index) => {
    if (migration.version !== index + 1) throw new RuntimeStateBlockedError("Runtime State migrations must be contiguous from version 1.", "migration_gap");
  });
}

function migrationChecksum(migration: Migration): string {
  return stableHash({ version: migration.version, name: migration.name, sql: migration.sql.replace(/\r\n/g, "\n").trim() });
}

function stableHash(value: unknown): string {
  return crypto.createHash("sha256").update(stableJson(value)).digest("hex");
}

function stableJson(value: unknown): string {
  return JSON.stringify(normalizeForJson(value));
}

function normalizeForJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalizeForJson);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, normalizeForJson(item)]));
  }
  return value;
}

function all(db: DatabaseSync, sql: string): Array<Record<string, unknown>> {
  return db.prepare(sql).all() as Array<Record<string, unknown>>;
}

function numberValue(row: unknown, key: string): number {
  return Number((row as Record<string, unknown> | undefined)?.[key] ?? 0);
}

function id(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(8).toString("hex")}`;
}

function timestampForFile(iso: string): string {
  return iso.replace(/[^0-9A-Za-z]+/g, "-").replace(/-$/g, "");
}

function sha256File(filePath: string): string {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function sqlString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
