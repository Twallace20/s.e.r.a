import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { createControlPlaneRuntimeService, type RuntimeService, type RuntimeServiceContext } from "@sera/runtime-host";

export const RUNTIME_STATE_VERSION = "runtime-state-v1";
export const RUNTIME_STATE_SCHEMA_VERSION = 11;
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
  "model_artifacts",
  "intake_authorizations",
  "intake_requests",
  "intake_assets",
  "intake_extractions",
  "intake_events",
  "knowledge_documents",
  "knowledge_chunks",
  "knowledge_provenance",
  "knowledge_versions",
  "knowledge_queries",
  "knowledge_query_results",
  "capability_idempotency",
  "capability_catalog",
  "capability_learning_signals",
  "capability_proposals",
  "capability_versions",
  "capability_experiments",
  "capability_evaluation_links",
  "capability_comparisons",
  "capability_certifications",
  "capability_promotions",
  "capability_active_versions",
  "capability_rollbacks",
  "learning_sessions",
  "learning_iterations",
  "capability_events",
  "operator_sessions",
  "operator_requests",
  "operator_approvals",
  "operator_approval_decisions",
  "operator_audit_events",
  "operator_notifications",
  "operator_events",
  "operator_preferences",
  "studio_definitions",
  "studio_versions",
  "studio_sessions",
  "studio_stage_transitions",
  "studio_artifacts",
  "studio_claims",
  "studio_claim_sources",
  "studio_reviews",
  "studio_learning_signals",
  "studio_events",
  "studio_idempotency",
  "integrated_loop_sessions",
  "integrated_loop_stage_transitions",
  "learning_preflight_runs",
  "learning_preflight_matches",
  "integrated_loop_bindings",
  "integrated_loop_artifacts",
  "integrated_loop_events",
  "integrated_loop_idempotency",
  "learning_governance_sessions",
  "learning_governance_transitions",
  "learning_governance_failures",
  "learning_governance_contexts",
  "learning_governance_hypotheses",
  "learning_governance_repair_candidates",
  "learning_governance_reproductions",
  "learning_governance_repair_proofs",
  "learning_governance_lessons",
  "learning_governance_lesson_scopes",
  "learning_governance_prevention_rules",
  "learning_governance_overrides",
  "learning_governance_improvements",
  "learning_governance_innovations",
  "learning_governance_evidence_links",
  "learning_governance_lesson_certifications",
  "learning_governance_lesson_activations",
  "learning_governance_lesson_supersessions",
  "learning_governance_innovation_evidence_links",
  "learning_governance_events",
  "learning_governance_idempotency"
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
  },
  {
    version: 6,
    name: "knowledge_intake_runtime_v1",
    sql: `
CREATE TABLE intake_authorizations (
  authorization_id TEXT PRIMARY KEY,
  attempt_id TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_reference_hash TEXT NOT NULL,
  allowed_roots_json TEXT NOT NULL,
  permitted_media_types_json TEXT NOT NULL,
  limits_json TEXT NOT NULL,
  extraction_policy TEXT NOT NULL,
  retention_policy TEXT NOT NULL,
  trust_policy TEXT NOT NULL,
  network_policy TEXT NOT NULL,
  policy_version TEXT NOT NULL,
  issued_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  integrity_hash TEXT NOT NULL,
  metadata_json TEXT NOT NULL,
  FOREIGN KEY(attempt_id) REFERENCES attempts(attempt_id)
);

CREATE TABLE intake_requests (
  intake_id TEXT PRIMARY KEY,
  attempt_id TEXT NOT NULL,
  authorization_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  request_hash TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_reference TEXT NOT NULL,
  display_name TEXT NOT NULL,
  declared_media_type TEXT NOT NULL,
  detected_media_type TEXT NOT NULL,
  expected_hash TEXT,
  retention_policy TEXT NOT NULL,
  extraction_profile TEXT NOT NULL,
  trust_declaration TEXT NOT NULL,
  state TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT,
  failure_or_block_reason TEXT,
  evidence_root TEXT NOT NULL,
  optimistic_version INTEGER NOT NULL,
  metadata_json TEXT NOT NULL,
  FOREIGN KEY(attempt_id) REFERENCES attempts(attempt_id)
);

CREATE TABLE intake_assets (
  asset_id TEXT PRIMARY KEY,
  intake_id TEXT NOT NULL,
  source_type TEXT NOT NULL,
  original_reference TEXT NOT NULL,
  display_name TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  byte_size INTEGER NOT NULL,
  media_type TEXT NOT NULL,
  declared_media_type TEXT NOT NULL,
  detected_media_type TEXT NOT NULL,
  preservation_path TEXT NOT NULL,
  immutable INTEGER NOT NULL,
  extension_mismatch INTEGER NOT NULL,
  preserved_at TEXT NOT NULL,
  metadata_json TEXT NOT NULL,
  FOREIGN KEY(intake_id) REFERENCES intake_requests(intake_id)
);

CREATE TABLE intake_extractions (
  extraction_id TEXT PRIMARY KEY,
  intake_id TEXT NOT NULL,
  asset_id TEXT NOT NULL,
  document_id TEXT,
  extraction_profile TEXT NOT NULL,
  extractor_version TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  extracted_text_hash TEXT,
  extracted_byte_count INTEGER NOT NULL,
  failure_or_block_reason TEXT,
  metadata_json TEXT NOT NULL,
  FOREIGN KEY(intake_id) REFERENCES intake_requests(intake_id),
  FOREIGN KEY(asset_id) REFERENCES intake_assets(asset_id)
);

CREATE TABLE intake_events (
  event_id TEXT PRIMARY KEY,
  intake_id TEXT NOT NULL,
  sequence INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  runtime_instance_id TEXT NOT NULL,
  outcome TEXT NOT NULL,
  message TEXT NOT NULL,
  details_json TEXT NOT NULL,
  UNIQUE(intake_id, sequence),
  FOREIGN KEY(intake_id) REFERENCES intake_requests(intake_id)
);

CREATE TABLE knowledge_documents (
  document_id TEXT PRIMARY KEY,
  source_asset_id TEXT NOT NULL,
  intake_id TEXT NOT NULL,
  content_version TEXT NOT NULL,
  title TEXT NOT NULL,
  media_type TEXT NOT NULL,
  language TEXT,
  extraction_status TEXT NOT NULL,
  trust_state TEXT NOT NULL,
  provenance_status TEXT NOT NULL,
  candidate_status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  superseded_at TEXT,
  metadata_json TEXT NOT NULL,
  FOREIGN KEY(source_asset_id) REFERENCES intake_assets(asset_id),
  FOREIGN KEY(intake_id) REFERENCES intake_requests(intake_id)
);

CREATE TABLE knowledge_chunks (
  chunk_id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  intake_id TEXT NOT NULL,
  source_asset_id TEXT NOT NULL,
  sequence INTEGER NOT NULL,
  chunk_text TEXT NOT NULL,
  chunk_hash TEXT NOT NULL,
  byte_start INTEGER NOT NULL,
  byte_end INTEGER NOT NULL,
  line_start INTEGER,
  line_end INTEGER,
  token_estimate INTEGER NOT NULL,
  metadata_json TEXT NOT NULL,
  UNIQUE(document_id, sequence),
  FOREIGN KEY(document_id) REFERENCES knowledge_documents(document_id),
  FOREIGN KEY(intake_id) REFERENCES intake_requests(intake_id),
  FOREIGN KEY(source_asset_id) REFERENCES intake_assets(asset_id)
);

CREATE TABLE knowledge_provenance (
  provenance_id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  chunk_id TEXT,
  intake_id TEXT NOT NULL,
  asset_id TEXT NOT NULL,
  source_reference TEXT NOT NULL,
  extraction_id TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  extraction_profile TEXT NOT NULL,
  runtime_instance_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  derived_from_json TEXT NOT NULL,
  metadata_json TEXT NOT NULL,
  FOREIGN KEY(document_id) REFERENCES knowledge_documents(document_id),
  FOREIGN KEY(chunk_id) REFERENCES knowledge_chunks(chunk_id),
  FOREIGN KEY(intake_id) REFERENCES intake_requests(intake_id),
  FOREIGN KEY(asset_id) REFERENCES intake_assets(asset_id)
);

CREATE TABLE knowledge_versions (
  version_id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  source_asset_id TEXT NOT NULL,
  intake_id TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  version_sequence INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  superseded_at TEXT,
  metadata_json TEXT NOT NULL,
  FOREIGN KEY(document_id) REFERENCES knowledge_documents(document_id),
  FOREIGN KEY(source_asset_id) REFERENCES intake_assets(asset_id),
  FOREIGN KEY(intake_id) REFERENCES intake_requests(intake_id)
);

CREATE TABLE knowledge_queries (
  query_id TEXT PRIMARY KEY,
  query_text TEXT NOT NULL,
  normalized_query TEXT NOT NULL,
  created_at TEXT NOT NULL,
  result_limit INTEGER NOT NULL,
  scanned_candidate_count INTEGER NOT NULL,
  metadata_json TEXT NOT NULL
);

CREATE TABLE knowledge_query_results (
  query_id TEXT NOT NULL,
  rank INTEGER NOT NULL,
  document_id TEXT NOT NULL,
  chunk_id TEXT NOT NULL,
  score REAL NOT NULL,
  explanation TEXT NOT NULL,
  provenance_json TEXT NOT NULL,
  trust_state TEXT NOT NULL,
  candidate_status TEXT NOT NULL,
  PRIMARY KEY(query_id, rank),
  FOREIGN KEY(query_id) REFERENCES knowledge_queries(query_id),
  FOREIGN KEY(document_id) REFERENCES knowledge_documents(document_id),
  FOREIGN KEY(chunk_id) REFERENCES knowledge_chunks(chunk_id)
);

CREATE INDEX idx_intake_requests_state ON intake_requests(state, created_at);
CREATE INDEX idx_intake_assets_hash ON intake_assets(content_hash);
CREATE INDEX idx_intake_assets_source ON intake_assets(original_reference, preserved_at);
CREATE INDEX idx_knowledge_documents_trust ON knowledge_documents(trust_state, candidate_status);
CREATE INDEX idx_knowledge_documents_source_version ON knowledge_documents(source_asset_id, content_version);
CREATE INDEX idx_knowledge_chunks_order ON knowledge_chunks(document_id, sequence);
CREATE INDEX idx_knowledge_chunks_text ON knowledge_chunks(chunk_text);
CREATE INDEX idx_knowledge_queries_normalized ON knowledge_queries(normalized_query, created_at);
`
  },
  {
    version: 7,
    name: "capability_engine_recursive_learning_v1",
    sql: `
CREATE TABLE capability_idempotency (
  idempotency_key TEXT PRIMARY KEY,
  request_hash TEXT NOT NULL,
  response_type TEXT NOT NULL,
  proposal_id TEXT,
  created_at TEXT NOT NULL,
  response_json TEXT NOT NULL
);

CREATE TABLE capability_catalog (
  capability_id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  source TEXT NOT NULL,
  risk_class TEXT NOT NULL,
  active_version_digest TEXT,
  status TEXT NOT NULL,
  limitations TEXT NOT NULL,
  integrity_digest TEXT NOT NULL
);

CREATE TABLE capability_learning_signals (
  signal_id TEXT PRIMARY KEY,
  signal_type TEXT NOT NULL,
  capability_id TEXT,
  baseline_version_digest TEXT,
  evidence_json TEXT NOT NULL,
  observed_deficiency TEXT NOT NULL,
  desired_outcome TEXT NOT NULL,
  severity TEXT NOT NULL,
  confidence_source TEXT NOT NULL,
  trust_status TEXT NOT NULL,
  candidate_status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  policy_version TEXT NOT NULL,
  integrity_hash TEXT NOT NULL
);

CREATE TABLE capability_proposals (
  proposal_id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  capability_id TEXT NOT NULL,
  source TEXT NOT NULL,
  source_evidence_json TEXT NOT NULL,
  learning_lane TEXT NOT NULL,
  risk_class TEXT NOT NULL,
  requested_type TEXT NOT NULL,
  desired_outcome TEXT NOT NULL,
  candidate_request_hash TEXT NOT NULL,
  model_generated INTEGER NOT NULL,
  candidate_intelligence INTEGER NOT NULL,
  provider_fingerprint TEXT,
  request_hash TEXT,
  response_hash TEXT,
  created_at TEXT NOT NULL,
  policy_version TEXT NOT NULL,
  integrity_hash TEXT NOT NULL
);

CREATE TABLE capability_versions (
  capability_id TEXT NOT NULL,
  version_digest TEXT NOT NULL,
  version TEXT NOT NULL,
  manifest_json TEXT NOT NULL,
  lifecycle_status TEXT NOT NULL,
  learning_lane TEXT NOT NULL,
  risk_class TEXT NOT NULL,
  bundle_root TEXT NOT NULL,
  bundle_hash TEXT NOT NULL,
  candidate_bytes INTEGER NOT NULL,
  baseline_version_digest TEXT,
  created_at TEXT NOT NULL,
  certified_at TEXT,
  promoted_at TEXT,
  superseded_at TEXT,
  certification_level TEXT,
  integrity_hash TEXT NOT NULL,
  terminal INTEGER NOT NULL,
  PRIMARY KEY(capability_id, version_digest)
);

CREATE TABLE capability_experiments (
  experiment_id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  capability_id TEXT NOT NULL,
  version_digest TEXT NOT NULL,
  authorization_id TEXT NOT NULL,
  execution_id TEXT,
  state TEXT NOT NULL,
  workspace_root TEXT,
  started_at TEXT,
  completed_at TEXT,
  evidence_json TEXT NOT NULL,
  integrity_hash TEXT NOT NULL
);

CREATE TABLE capability_evaluation_links (
  evaluation_link_id TEXT PRIMARY KEY,
  experiment_id TEXT NOT NULL,
  evaluation_id TEXT NOT NULL,
  capability_id TEXT NOT NULL,
  version_digest TEXT NOT NULL,
  state TEXT NOT NULL,
  evidence_json TEXT NOT NULL,
  integrity_hash TEXT NOT NULL
);

CREATE TABLE capability_comparisons (
  comparison_id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  capability_id TEXT NOT NULL,
  baseline_version_digest TEXT,
  challenger_version_digest TEXT NOT NULL,
  result TEXT NOT NULL,
  normalized_result_json TEXT NOT NULL,
  threshold REAL NOT NULL,
  created_at TEXT NOT NULL,
  integrity_hash TEXT NOT NULL
);

CREATE TABLE capability_certifications (
  certification_id TEXT PRIMARY KEY,
  capability_id TEXT NOT NULL,
  version_digest TEXT NOT NULL,
  experiment_ids_json TEXT NOT NULL,
  evaluation_ids_json TEXT NOT NULL,
  reproducibility_json TEXT NOT NULL,
  comparison_json TEXT NOT NULL,
  rollback_ready INTEGER NOT NULL,
  certified_at TEXT NOT NULL,
  integrity_hash TEXT NOT NULL
);

CREATE TABLE capability_promotions (
  promotion_id TEXT PRIMARY KEY,
  capability_id TEXT NOT NULL,
  version_digest TEXT NOT NULL,
  authorization_id TEXT NOT NULL,
  certification_id TEXT NOT NULL,
  promoted_at TEXT NOT NULL,
  rollback_target_digest TEXT,
  idempotency_key TEXT NOT NULL UNIQUE,
  request_hash TEXT NOT NULL,
  integrity_hash TEXT NOT NULL
);

CREATE TABLE capability_active_versions (
  capability_id TEXT NOT NULL,
  activation_scope TEXT NOT NULL,
  active_version_digest TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  authority_identity TEXT NOT NULL,
  integrity_hash TEXT NOT NULL,
  PRIMARY KEY(capability_id, activation_scope)
);

CREATE TABLE capability_rollbacks (
  rollback_id TEXT PRIMARY KEY,
  capability_id TEXT NOT NULL,
  current_version_digest TEXT NOT NULL,
  target_version_digest TEXT NOT NULL,
  authorization_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  regression_evidence_json TEXT NOT NULL,
  rolled_back_at TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  request_hash TEXT NOT NULL,
  integrity_hash TEXT NOT NULL
);

CREATE TABLE learning_sessions (
  session_id TEXT PRIMARY KEY,
  capability_id TEXT NOT NULL,
  state TEXT NOT NULL,
  learning_lane TEXT NOT NULL,
  policy_json TEXT NOT NULL,
  policy_hash TEXT NOT NULL,
  iteration_count INTEGER NOT NULL,
  recursion_depth INTEGER NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  terminal INTEGER NOT NULL,
  integrity_hash TEXT NOT NULL
);

CREATE TABLE learning_iterations (
  iteration_id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  iteration_number INTEGER NOT NULL,
  candidate_version_digest TEXT,
  authorization_id TEXT NOT NULL,
  state TEXT NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  evidence_json TEXT NOT NULL,
  integrity_hash TEXT NOT NULL,
  UNIQUE(session_id, iteration_number)
);

CREATE TABLE capability_events (
  event_id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  capability_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  outcome TEXT NOT NULL,
  message TEXT NOT NULL,
  details_json TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  sequence INTEGER NOT NULL,
  UNIQUE(session_id, sequence)
);

CREATE INDEX idx_capability_versions_status ON capability_versions(capability_id, lifecycle_status, created_at);
CREATE INDEX idx_capability_proposals_session ON capability_proposals(session_id, capability_id);
CREATE INDEX idx_learning_sessions_state ON learning_sessions(state, started_at);
CREATE INDEX idx_capability_events_order ON capability_events(session_id, sequence);
CREATE INDEX idx_capability_active_scope ON capability_active_versions(activation_scope, capability_id);
`
  },
  {
    version: 8,
    name: "desktop_operator_v1",
    sql: `
CREATE TABLE operator_sessions (
  session_id TEXT PRIMARY KEY,
  idempotency_key TEXT NOT NULL UNIQUE,
  request_hash TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  csrf_hash TEXT NOT NULL,
  operator_identity TEXT NOT NULL,
  state TEXT NOT NULL,
  issued_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  last_activity_at TEXT NOT NULL,
  idle_timeout_ms INTEGER NOT NULL,
  revoked_at TEXT,
  integrity_hash TEXT NOT NULL,
  response_json TEXT NOT NULL
);

CREATE TABLE operator_requests (
  request_id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  category TEXT NOT NULL,
  normalized_text TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  status TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  completed_at TEXT,
  response_json TEXT NOT NULL,
  governed_reference TEXT NOT NULL,
  FOREIGN KEY(session_id) REFERENCES operator_sessions(session_id)
);

CREATE TABLE operator_approvals (
  approval_id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL,
  status TEXT NOT NULL,
  risk_class TEXT NOT NULL,
  summary TEXT NOT NULL,
  integrity_hash TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  request_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  decided_at TEXT,
  decision_idempotency_key TEXT,
  response_json TEXT NOT NULL,
  FOREIGN KEY(request_id) REFERENCES operator_requests(request_id)
);

CREATE TABLE operator_approval_decisions (
  idempotency_key TEXT PRIMARY KEY,
  approval_id TEXT NOT NULL,
  decision TEXT NOT NULL,
  decided_at TEXT NOT NULL,
  response_json TEXT NOT NULL,
  FOREIGN KEY(approval_id) REFERENCES operator_approvals(approval_id)
);

CREATE TABLE operator_audit_events (
  event_id TEXT PRIMARY KEY,
  sequence INTEGER NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  outcome TEXT NOT NULL,
  message TEXT NOT NULL,
  details_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE operator_notifications (
  notification_id TEXT PRIMARY KEY,
  notification_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  read_at TEXT
);

CREATE TABLE operator_events (
  event_id TEXT PRIMARY KEY,
  sequence INTEGER NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  created_at TEXT NOT NULL,
  payload_json TEXT NOT NULL
);

CREATE TABLE operator_preferences (
  preference_key TEXT PRIMARY KEY,
  preference_value_json TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  mutable_security_policy INTEGER NOT NULL
);

CREATE INDEX idx_operator_sessions_state ON operator_sessions(state, expires_at);
CREATE INDEX idx_operator_requests_status ON operator_requests(status, created_at);
CREATE INDEX idx_operator_approvals_status ON operator_approvals(status, created_at);
CREATE INDEX idx_operator_audit_events_sequence ON operator_audit_events(sequence);
CREATE INDEX idx_operator_notifications_status ON operator_notifications(status, created_at);
CREATE INDEX idx_operator_events_sequence ON operator_events(sequence);
`
  },
  {
    version: 9,
    name: "first_certified_studio_v1",
    sql: `
CREATE TABLE studio_definitions (
  studio_id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TEXT NOT NULL,
  metadata_json TEXT NOT NULL
);

CREATE TABLE studio_versions (
  studio_id TEXT NOT NULL,
  version TEXT NOT NULL,
  immutable_digest TEXT NOT NULL,
  status TEXT NOT NULL,
  manifest_hash TEXT NOT NULL,
  certification_level TEXT NOT NULL,
  workflow_profiles_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  certified_at TEXT,
  superseded_at TEXT,
  optimistic_version INTEGER NOT NULL,
  manifest_json TEXT NOT NULL,
  PRIMARY KEY(studio_id, version),
  UNIQUE(studio_id, immutable_digest),
  FOREIGN KEY(studio_id) REFERENCES studio_definitions(studio_id)
);

CREATE TABLE studio_sessions (
  session_id TEXT PRIMARY KEY,
  studio_id TEXT NOT NULL,
  studio_version_digest TEXT NOT NULL,
  workflow_profile TEXT NOT NULL,
  attempt_id TEXT NOT NULL,
  authorization_id TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  source_set_hash TEXT NOT NULL,
  state TEXT NOT NULL,
  risk_class TEXT NOT NULL,
  revision_budget INTEGER NOT NULL,
  current_revision INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT,
  outcome TEXT,
  reason TEXT,
  optimistic_version INTEGER NOT NULL,
  FOREIGN KEY(studio_id) REFERENCES studio_definitions(studio_id)
);

CREATE TABLE studio_stage_transitions (
  transition_id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  sequence INTEGER NOT NULL,
  prior_state TEXT,
  next_state TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  actor TEXT NOT NULL,
  reason TEXT NOT NULL,
  evidence_reference TEXT NOT NULL,
  UNIQUE(session_id, sequence),
  FOREIGN KEY(session_id) REFERENCES studio_sessions(session_id)
);

CREATE TABLE studio_artifacts (
  artifact_id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  artifact_version INTEGER NOT NULL,
  artifact_type TEXT NOT NULL,
  content_addressed_path TEXT NOT NULL,
  hash TEXT NOT NULL,
  byte_size INTEGER NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  metadata_json TEXT NOT NULL,
  FOREIGN KEY(session_id) REFERENCES studio_sessions(session_id)
);

CREATE TABLE studio_claims (
  claim_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  artifact_version INTEGER NOT NULL,
  normalized_claim TEXT NOT NULL,
  classification TEXT NOT NULL,
  trust_status TEXT NOT NULL,
  candidate_status TEXT NOT NULL,
  conflict_status TEXT NOT NULL,
  evaluation_status TEXT NOT NULL,
  operator_disposition TEXT NOT NULL,
  integrity_hash TEXT NOT NULL,
  PRIMARY KEY(claim_id, artifact_version),
  FOREIGN KEY(session_id) REFERENCES studio_sessions(session_id)
);

CREATE TABLE studio_claim_sources (
  claim_id TEXT NOT NULL,
  source_asset_id TEXT NOT NULL,
  knowledge_document_id TEXT,
  chunk_id TEXT,
  support_type TEXT NOT NULL,
  ordering INTEGER NOT NULL,
  metadata_json TEXT NOT NULL
);

CREATE TABLE studio_reviews (
  review_id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  artifact_version INTEGER NOT NULL,
  operator_identity TEXT NOT NULL,
  decision TEXT NOT NULL,
  correction_json TEXT NOT NULL,
  reviewed_artifact_hash TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  integrity_hash TEXT NOT NULL,
  FOREIGN KEY(session_id) REFERENCES studio_sessions(session_id)
);

CREATE TABLE studio_learning_signals (
  signal_id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  artifact_version INTEGER NOT NULL,
  signal_type TEXT NOT NULL,
  evidence_references_json TEXT NOT NULL,
  applicability_context TEXT NOT NULL,
  non_applicability_context TEXT,
  candidate_status TEXT NOT NULL,
  trust_status TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  integrity_hash TEXT NOT NULL,
  capability_signal_reference TEXT,
  FOREIGN KEY(session_id) REFERENCES studio_sessions(session_id)
);

CREATE TABLE studio_events (
  event_id TEXT PRIMARY KEY,
  aggregate_type TEXT NOT NULL,
  aggregate_id TEXT NOT NULL,
  sequence INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  runtime_instance_id TEXT NOT NULL,
  outcome TEXT NOT NULL,
  safe_message TEXT NOT NULL,
  structured_details_json TEXT NOT NULL,
  UNIQUE(aggregate_id, sequence)
);

CREATE TABLE studio_idempotency (
  operation_type TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  normalized_request_hash TEXT NOT NULL,
  resulting_aggregate TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  conflict_status TEXT NOT NULL,
  PRIMARY KEY(operation_type, idempotency_key)
);

CREATE INDEX idx_studio_versions_status ON studio_versions(status, certified_at);
CREATE INDEX idx_studio_sessions_state ON studio_sessions(state, updated_at);
CREATE INDEX idx_studio_stage_session ON studio_stage_transitions(session_id, sequence);
CREATE INDEX idx_studio_artifacts_session ON studio_artifacts(session_id, artifact_version);
CREATE INDEX idx_studio_claims_session ON studio_claims(session_id, artifact_version);
CREATE INDEX idx_studio_reviews_session ON studio_reviews(session_id, timestamp);
CREATE INDEX idx_studio_learning_signals_session ON studio_learning_signals(session_id, signal_type);
CREATE INDEX idx_studio_events_aggregate ON studio_events(aggregate_id, sequence);
`
  },
  {
    version: 10,
    name: "integrated_offline_loop_v1",
    sql: `
CREATE TABLE integrated_loop_sessions (
  loop_session_id TEXT PRIMARY KEY,
  attempt_id TEXT NOT NULL,
  operator_request_id TEXT NOT NULL,
  authorization_id TEXT NOT NULL,
  studio_id TEXT NOT NULL,
  studio_version_digest TEXT NOT NULL,
  workflow_profile TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  source_set_hash TEXT NOT NULL,
  context_hash TEXT NOT NULL,
  state TEXT NOT NULL,
  risk_class TEXT NOT NULL,
  revision_budget INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT,
  outcome TEXT,
  reason TEXT,
  optimistic_version INTEGER NOT NULL
);

CREATE TABLE integrated_loop_stage_transitions (
  transition_id TEXT PRIMARY KEY,
  loop_session_id TEXT NOT NULL,
  sequence INTEGER NOT NULL,
  prior_state TEXT,
  next_state TEXT NOT NULL,
  owning_service TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  reason TEXT NOT NULL,
  evidence_reference TEXT NOT NULL,
  UNIQUE(loop_session_id, sequence),
  FOREIGN KEY(loop_session_id) REFERENCES integrated_loop_sessions(loop_session_id)
);

CREATE TABLE learning_preflight_runs (
  preflight_id TEXT PRIMARY KEY,
  loop_session_id TEXT NOT NULL,
  context_hash TEXT NOT NULL,
  source_versions_json TEXT NOT NULL,
  decision TEXT NOT NULL,
  selected_alternative_json TEXT,
  override_reference_json TEXT,
  warning_or_block_reason TEXT,
  timestamp TEXT NOT NULL,
  integrity_hash TEXT NOT NULL,
  immutable INTEGER NOT NULL,
  FOREIGN KEY(loop_session_id) REFERENCES integrated_loop_sessions(loop_session_id)
);

CREATE TABLE learning_preflight_matches (
  preflight_id TEXT NOT NULL,
  ordering INTEGER NOT NULL,
  record_type TEXT NOT NULL,
  record_id TEXT NOT NULL,
  record_version TEXT NOT NULL,
  match_class TEXT NOT NULL,
  applicability TEXT NOT NULL,
  non_applicability TEXT,
  active_status TEXT NOT NULL,
  certification_reference TEXT,
  evidence_reference TEXT NOT NULL,
  PRIMARY KEY(preflight_id, ordering),
  FOREIGN KEY(preflight_id) REFERENCES learning_preflight_runs(preflight_id)
);

CREATE TABLE integrated_loop_bindings (
  loop_session_id TEXT NOT NULL,
  binding_type TEXT NOT NULL,
  service_id TEXT NOT NULL,
  aggregate_id TEXT NOT NULL,
  exact_version_or_digest TEXT NOT NULL,
  evidence_reference TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  PRIMARY KEY(loop_session_id, binding_type, service_id, aggregate_id),
  FOREIGN KEY(loop_session_id) REFERENCES integrated_loop_sessions(loop_session_id)
);

CREATE TABLE integrated_loop_artifacts (
  loop_session_id TEXT NOT NULL,
  artifact_type TEXT NOT NULL,
  owned_by_service TEXT NOT NULL,
  content_addressed_path_or_reference TEXT NOT NULL,
  hash TEXT NOT NULL,
  status TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  metadata_json TEXT NOT NULL,
  PRIMARY KEY(loop_session_id, artifact_type),
  FOREIGN KEY(loop_session_id) REFERENCES integrated_loop_sessions(loop_session_id)
);

CREATE TABLE integrated_loop_events (
  event_id TEXT PRIMARY KEY,
  loop_session_id TEXT NOT NULL,
  sequence INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  owning_service TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  runtime_instance_id TEXT NOT NULL,
  outcome TEXT NOT NULL,
  safe_message TEXT NOT NULL,
  structured_details_json TEXT NOT NULL,
  UNIQUE(loop_session_id, sequence),
  FOREIGN KEY(loop_session_id) REFERENCES integrated_loop_sessions(loop_session_id)
);

CREATE TABLE integrated_loop_idempotency (
  operation_type TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  normalized_request_hash TEXT NOT NULL,
  resulting_aggregate TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  conflict_status TEXT NOT NULL,
  PRIMARY KEY(operation_type, idempotency_key)
);

CREATE INDEX idx_integrated_loop_sessions_state ON integrated_loop_sessions(state, updated_at);
CREATE INDEX idx_integrated_loop_stage_session ON integrated_loop_stage_transitions(loop_session_id, sequence);
CREATE INDEX idx_learning_preflight_loop ON learning_preflight_runs(loop_session_id, timestamp);
CREATE INDEX idx_integrated_loop_events_session ON integrated_loop_events(loop_session_id, sequence);
`
  },
  {
    version: 11,
    name: "learning_governance_runtime_v1",
    sql: `
CREATE TABLE learning_governance_sessions (
  session_id TEXT PRIMARY KEY,
  attempt_id TEXT NOT NULL,
  context_hash TEXT NOT NULL,
  state TEXT NOT NULL,
  lane TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT,
  outcome TEXT,
  reason TEXT,
  optimistic_version INTEGER NOT NULL
);

CREATE TABLE learning_governance_transitions (
  transition_id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  sequence INTEGER NOT NULL,
  prior_state TEXT,
  next_state TEXT NOT NULL,
  actor TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  reason TEXT NOT NULL,
  evidence_reference TEXT NOT NULL,
  UNIQUE(session_id, sequence),
  FOREIGN KEY(session_id) REFERENCES learning_governance_sessions(session_id)
);

CREATE TABLE learning_governance_failures (
  failure_id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  originating_attempt_id TEXT NOT NULL,
  originating_loop_session_id TEXT,
  studio_session_reference TEXT,
  capability_version_reference TEXT NOT NULL,
  source_set_hash TEXT NOT NULL,
  context_hash TEXT NOT NULL,
  failure_classification TEXT NOT NULL,
  observed_behavior TEXT NOT NULL,
  expected_behavior TEXT NOT NULL,
  evidence_json TEXT NOT NULL,
  reproduction_status TEXT NOT NULL,
  severity TEXT NOT NULL,
  risk_class TEXT NOT NULL,
  side_effect_class TEXT NOT NULL,
  operator_impact TEXT NOT NULL,
  first_observed_at TEXT NOT NULL,
  last_reproduced_at TEXT,
  integrity_hash TEXT NOT NULL,
  FOREIGN KEY(session_id) REFERENCES learning_governance_sessions(session_id)
);

CREATE TABLE learning_governance_contexts (
  context_id TEXT NOT NULL UNIQUE,
  context_hash TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  canonical_context_json TEXT NOT NULL,
  scope_dimensions_json TEXT NOT NULL,
  excluded_dimensions_json TEXT NOT NULL,
  policy_version TEXT NOT NULL,
  integrity_hash TEXT NOT NULL,
  FOREIGN KEY(session_id) REFERENCES learning_governance_sessions(session_id)
);

CREATE TABLE learning_governance_hypotheses (
  hypothesis_id TEXT PRIMARY KEY,
  failure_id TEXT NOT NULL,
  version TEXT NOT NULL,
  statement TEXT NOT NULL,
  causal_mechanism TEXT NOT NULL,
  supporting_evidence_json TEXT NOT NULL,
  contradicting_evidence_json TEXT NOT NULL,
  confidence REAL NOT NULL,
  scope_json TEXT NOT NULL,
  non_applicability_json TEXT NOT NULL,
  operator_author TEXT NOT NULL,
  review_status TEXT NOT NULL,
  evaluation_references_json TEXT NOT NULL,
  integrity_hash TEXT NOT NULL,
  FOREIGN KEY(failure_id) REFERENCES learning_governance_failures(failure_id)
);

CREATE TABLE learning_governance_repair_candidates (
  repair_id TEXT PRIMARY KEY,
  hypothesis_id TEXT NOT NULL,
  repair_version TEXT NOT NULL,
  lane TEXT NOT NULL,
  candidate_digest TEXT NOT NULL,
  changed_behavior TEXT NOT NULL,
  unchanged_behavior TEXT NOT NULL,
  expected_effect TEXT NOT NULL,
  risk TEXT NOT NULL,
  side_effects_json TEXT NOT NULL,
  rollback_plan TEXT NOT NULL,
  execution_profile TEXT NOT NULL,
  evaluation_profile TEXT NOT NULL,
  authorization_reference TEXT NOT NULL,
  evidence_json TEXT NOT NULL,
  integrity_hash TEXT NOT NULL,
  FOREIGN KEY(hypothesis_id) REFERENCES learning_governance_hypotheses(hypothesis_id)
);

CREATE TABLE learning_governance_reproductions (
  reproduction_id TEXT PRIMARY KEY,
  failure_id TEXT NOT NULL,
  execution_id TEXT NOT NULL,
  evaluation_id TEXT NOT NULL,
  workspace_identity TEXT NOT NULL,
  input_hash TEXT NOT NULL,
  environment_profile TEXT NOT NULL,
  observed_classification TEXT NOT NULL,
  stdout_ref TEXT NOT NULL,
  stderr_ref TEXT NOT NULL,
  outputs_ref TEXT NOT NULL,
  evidence_ref TEXT NOT NULL,
  public_network_used INTEGER NOT NULL,
  real_model_used INTEGER NOT NULL,
  status TEXT NOT NULL,
  integrity_hash TEXT NOT NULL,
  FOREIGN KEY(failure_id) REFERENCES learning_governance_failures(failure_id)
);

CREATE TABLE learning_governance_repair_proofs (
  proof_id TEXT PRIMARY KEY,
  repair_id TEXT NOT NULL,
  execution_id TEXT NOT NULL,
  evaluation_id TEXT NOT NULL,
  regression_evaluation_id TEXT NOT NULL,
  normalized_outcome_hash TEXT NOT NULL,
  original_failure_prevented INTEGER NOT NULL,
  regression_passed INTEGER NOT NULL,
  baseline_behavior_preserved INTEGER NOT NULL,
  side_effects_declared INTEGER NOT NULL,
  evidence_json TEXT NOT NULL,
  integrity_hash TEXT NOT NULL,
  FOREIGN KEY(repair_id) REFERENCES learning_governance_repair_candidates(repair_id)
);

CREATE TABLE learning_governance_lessons (
  lesson_id TEXT NOT NULL,
  version TEXT NOT NULL,
  state TEXT NOT NULL,
  failure_ids_json TEXT NOT NULL,
  hypothesis_id TEXT NOT NULL,
  repair_id TEXT NOT NULL,
  statement TEXT NOT NULL,
  actionable_guidance TEXT NOT NULL,
  prohibited_path TEXT NOT NULL,
  certified_alternative_json TEXT NOT NULL,
  scope_json TEXT NOT NULL,
  non_applicability_json TEXT NOT NULL,
  match_policy_json TEXT NOT NULL,
  evidence_threshold_json TEXT NOT NULL,
  evaluation_refs_json TEXT NOT NULL,
  reproduction_refs_json TEXT NOT NULL,
  certification_ref TEXT,
  activation_ref TEXT,
  supersession_ref TEXT,
  rollback_ref TEXT,
  digest TEXT NOT NULL,
  integrity_hash TEXT NOT NULL,
  certified_at TEXT,
  activated_at TEXT,
  supersedes_lesson_id TEXT,
  PRIMARY KEY(lesson_id, version)
);

CREATE TABLE learning_governance_lesson_scopes (
  scope_id TEXT PRIMARY KEY,
  lesson_id TEXT NOT NULL,
  lesson_version TEXT NOT NULL,
  scope_json TEXT NOT NULL,
  non_applicability_json TEXT NOT NULL,
  context_id TEXT NOT NULL,
  context_hash TEXT NOT NULL,
  effective_at TEXT NOT NULL,
  superseded_at TEXT,
  integrity_hash TEXT NOT NULL,
  FOREIGN KEY(lesson_id, lesson_version) REFERENCES learning_governance_lessons(lesson_id, version)
);

CREATE TABLE learning_governance_prevention_rules (
  rule_id TEXT NOT NULL,
  version TEXT NOT NULL,
  lesson_id TEXT NOT NULL,
  lesson_version TEXT NOT NULL,
  active INTEGER NOT NULL,
  exact_behavior TEXT NOT NULL,
  materially_equivalent_behavior TEXT NOT NULL,
  related_context_behavior TEXT NOT NULL,
  out_of_scope_behavior TEXT NOT NULL,
  certified_alternative_json TEXT NOT NULL,
  warning_policy TEXT NOT NULL,
  review_policy TEXT NOT NULL,
  override_policy TEXT NOT NULL,
  activation_authorization TEXT NOT NULL,
  effective_at TEXT NOT NULL,
  expires_at TEXT,
  supersession_ref TEXT,
  rollback_ref TEXT,
  integrity_hash TEXT NOT NULL,
  PRIMARY KEY(rule_id, version),
  FOREIGN KEY(lesson_id, lesson_version) REFERENCES learning_governance_lessons(lesson_id, version)
);

CREATE TABLE learning_governance_overrides (
  override_id TEXT PRIMARY KEY,
  rule_id TEXT NOT NULL,
  rule_version TEXT NOT NULL,
  authority_ref TEXT NOT NULL,
  operator_identity TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  scope_json TEXT NOT NULL,
  reason TEXT NOT NULL,
  evidence_json TEXT NOT NULL,
  risk_acceptance TEXT NOT NULL,
  issued_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  use_limit INTEGER NOT NULL,
  used_count INTEGER NOT NULL,
  resulting_decision TEXT NOT NULL,
  audit_ref TEXT NOT NULL,
  integrity_hash TEXT NOT NULL
);

CREATE TABLE learning_governance_improvements (
  comparison_id TEXT PRIMARY KEY,
  baseline_id TEXT NOT NULL,
  baseline_version TEXT NOT NULL,
  candidate_id TEXT NOT NULL,
  candidate_version TEXT NOT NULL,
  comparison_profile TEXT NOT NULL,
  metrics_json TEXT NOT NULL,
  quality_gates_json TEXT NOT NULL,
  safety_gates_json TEXT NOT NULL,
  regression_gates_json TEXT NOT NULL,
  resource_measurements_json TEXT NOT NULL,
  result TEXT NOT NULL,
  evidence_json TEXT NOT NULL,
  integrity_hash TEXT NOT NULL
);

CREATE TABLE learning_governance_innovations (
  innovation_id TEXT NOT NULL,
  version TEXT NOT NULL,
  state TEXT NOT NULL,
  proposal_json TEXT NOT NULL,
  experiment_refs_json TEXT NOT NULL,
  certification_ref TEXT,
  promotion_ref TEXT,
  rollback_ref TEXT,
  capability_reference TEXT NOT NULL,
  baseline_digest TEXT NOT NULL,
  candidate_digest TEXT NOT NULL,
  active_digest TEXT,
  prior_active_digest TEXT,
  integrity_hash TEXT NOT NULL,
  PRIMARY KEY(innovation_id, version)
);

CREATE TABLE learning_governance_evidence_links (
  link_id TEXT PRIMARY KEY,
  parent_type TEXT NOT NULL,
  parent_id TEXT NOT NULL,
  evidence_type TEXT NOT NULL,
  evidence_reference TEXT NOT NULL,
  evidence_hash TEXT NOT NULL,
  owning_service TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  integrity_hash TEXT NOT NULL
);

CREATE TABLE learning_governance_lesson_certifications (
  certification_id TEXT PRIMARY KEY,
  lesson_id TEXT NOT NULL,
  lesson_version TEXT NOT NULL,
  exact_lesson_digest TEXT NOT NULL,
  control_plane_authorization TEXT NOT NULL,
  operator_review_reference TEXT NOT NULL,
  reproduction_references_json TEXT NOT NULL,
  repair_evaluation_references_json TEXT NOT NULL,
  regression_references_json TEXT NOT NULL,
  decision TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  evidence_package TEXT NOT NULL,
  integrity_hash TEXT NOT NULL,
  FOREIGN KEY(lesson_id, lesson_version) REFERENCES learning_governance_lessons(lesson_id, version)
);

CREATE TABLE learning_governance_lesson_activations (
  activation_id TEXT PRIMARY KEY,
  lesson_id TEXT NOT NULL,
  lesson_version TEXT NOT NULL,
  exact_lesson_digest TEXT NOT NULL,
  authorization TEXT NOT NULL,
  operator_identity TEXT NOT NULL,
  scope TEXT NOT NULL,
  reason TEXT NOT NULL,
  effective_timestamp TEXT NOT NULL,
  expiration_or_review_timestamp TEXT,
  prevention_rule_reference TEXT NOT NULL,
  rollback_policy TEXT NOT NULL,
  status TEXT NOT NULL,
  evidence_reference TEXT NOT NULL,
  integrity_hash TEXT NOT NULL,
  FOREIGN KEY(lesson_id, lesson_version) REFERENCES learning_governance_lessons(lesson_id, version)
);

CREATE TABLE learning_governance_lesson_supersessions (
  supersession_id TEXT PRIMARY KEY,
  prior_lesson_id TEXT NOT NULL,
  prior_lesson_version TEXT NOT NULL,
  successor_lesson_id TEXT NOT NULL,
  successor_lesson_version TEXT NOT NULL,
  authorization TEXT NOT NULL,
  operator_approval TEXT NOT NULL,
  reason TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  evidence_reference TEXT NOT NULL,
  integrity_hash TEXT NOT NULL
);

CREATE TABLE learning_governance_innovation_evidence_links (
  link_id TEXT PRIMARY KEY,
  innovation_id TEXT NOT NULL,
  innovation_version TEXT NOT NULL,
  experiment_reference TEXT NOT NULL,
  evaluation_reference TEXT NOT NULL,
  comparison_reference TEXT NOT NULL,
  capability_engine_certification_reference TEXT NOT NULL,
  capability_engine_promotion_reference TEXT NOT NULL,
  rollback_reference TEXT NOT NULL,
  evidence_hash TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  integrity_hash TEXT NOT NULL,
  FOREIGN KEY(innovation_id, innovation_version) REFERENCES learning_governance_innovations(innovation_id, version)
);

CREATE TABLE learning_governance_events (
  event_id TEXT PRIMARY KEY,
  aggregate_type TEXT NOT NULL,
  aggregate_id TEXT NOT NULL,
  sequence INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  actor TEXT NOT NULL,
  owning_service TEXT NOT NULL,
  runtime_instance_id TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  outcome TEXT NOT NULL,
  safe_message TEXT NOT NULL,
  details_json TEXT NOT NULL,
  UNIQUE(aggregate_id, sequence)
);

CREATE TABLE learning_governance_idempotency (
  operation_type TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  aggregate_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  conflict_status TEXT NOT NULL,
  PRIMARY KEY(operation_type, idempotency_key)
);

CREATE INDEX idx_learning_governance_sessions_state ON learning_governance_sessions(state, updated_at);
CREATE INDEX idx_learning_governance_failures_context ON learning_governance_failures(context_hash, failure_classification);
CREATE INDEX idx_learning_governance_lessons_state ON learning_governance_lessons(state, certified_at);
CREATE INDEX idx_learning_governance_rules_active ON learning_governance_prevention_rules(active, lesson_id, lesson_version);
CREATE INDEX idx_learning_governance_evidence_parent ON learning_governance_evidence_links(parent_type, parent_id);
CREATE INDEX idx_learning_governance_certifications_lesson ON learning_governance_lesson_certifications(lesson_id, lesson_version);
CREATE INDEX idx_learning_governance_activations_lesson ON learning_governance_lesson_activations(lesson_id, lesson_version, status);
CREATE INDEX idx_learning_governance_supersessions_prior ON learning_governance_lesson_supersessions(prior_lesson_id, prior_lesson_version);
CREATE INDEX idx_learning_governance_innovation_evidence ON learning_governance_innovation_evidence_links(innovation_id, innovation_version);
CREATE INDEX idx_learning_governance_events_aggregate ON learning_governance_events(aggregate_id, sequence);
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
      modelArtifacts: this.tableExists("model_artifacts") ? all(db, "SELECT invocation_id, artifact_type, evidence_location, integrity_hash, size, redaction_state, metadata_json FROM model_artifacts ORDER BY invocation_id, artifact_type") : [],
      intakeAuthorizations: this.tableExists("intake_authorizations") ? all(db, "SELECT authorization_id, attempt_id, source_type, source_reference_hash, allowed_roots_json, permitted_media_types_json, limits_json, extraction_policy, retention_policy, trust_policy, network_policy, policy_version, issued_at, expires_at, integrity_hash, metadata_json FROM intake_authorizations ORDER BY issued_at, authorization_id") : [],
      intakeRequests: this.tableExists("intake_requests") ? all(db, "SELECT intake_id, attempt_id, authorization_id, idempotency_key, request_hash, source_type, source_reference, display_name, declared_media_type, detected_media_type, expected_hash, retention_policy, extraction_profile, trust_declaration, state, created_at, updated_at, completed_at, failure_or_block_reason, evidence_root, optimistic_version, metadata_json FROM intake_requests ORDER BY created_at, intake_id") : [],
      intakeAssets: this.tableExists("intake_assets") ? all(db, "SELECT asset_id, intake_id, source_type, original_reference, display_name, content_hash, byte_size, media_type, declared_media_type, detected_media_type, preservation_path, immutable, extension_mismatch, preserved_at, metadata_json FROM intake_assets ORDER BY preserved_at, asset_id") : [],
      intakeExtractions: this.tableExists("intake_extractions") ? all(db, "SELECT extraction_id, intake_id, asset_id, document_id, extraction_profile, extractor_version, status, started_at, completed_at, extracted_text_hash, extracted_byte_count, failure_or_block_reason, metadata_json FROM intake_extractions ORDER BY started_at, extraction_id") : [],
      intakeEvents: this.tableExists("intake_events") ? all(db, "SELECT event_id, intake_id, sequence, event_type, timestamp, runtime_instance_id, outcome, message, details_json FROM intake_events ORDER BY intake_id, sequence") : [],
      knowledgeDocuments: this.tableExists("knowledge_documents") ? all(db, "SELECT document_id, source_asset_id, intake_id, content_version, title, media_type, language, extraction_status, trust_state, provenance_status, candidate_status, created_at, superseded_at, metadata_json FROM knowledge_documents ORDER BY created_at, document_id") : [],
      knowledgeChunks: this.tableExists("knowledge_chunks") ? all(db, "SELECT chunk_id, document_id, intake_id, source_asset_id, sequence, chunk_text, chunk_hash, byte_start, byte_end, line_start, line_end, token_estimate, metadata_json FROM knowledge_chunks ORDER BY document_id, sequence") : [],
      knowledgeProvenance: this.tableExists("knowledge_provenance") ? all(db, "SELECT provenance_id, document_id, chunk_id, intake_id, asset_id, source_reference, extraction_id, content_hash, extraction_profile, runtime_instance_id, created_at, derived_from_json, metadata_json FROM knowledge_provenance ORDER BY document_id, chunk_id, provenance_id") : [],
      knowledgeVersions: this.tableExists("knowledge_versions") ? all(db, "SELECT version_id, document_id, source_asset_id, intake_id, content_hash, version_sequence, created_at, superseded_at, metadata_json FROM knowledge_versions ORDER BY document_id, version_sequence") : [],
      knowledgeQueries: this.tableExists("knowledge_queries") ? all(db, "SELECT query_id, query_text, normalized_query, created_at, result_limit, scanned_candidate_count, metadata_json FROM knowledge_queries ORDER BY created_at, query_id") : [],
      knowledgeQueryResults: this.tableExists("knowledge_query_results") ? all(db, "SELECT query_id, rank, document_id, chunk_id, score, explanation, provenance_json, trust_state, candidate_status FROM knowledge_query_results ORDER BY query_id, rank") : []
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
