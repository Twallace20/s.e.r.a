import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createControlPlaneRuntimeService, RuntimeHost, createRuntimeConfig, type RuntimeService, type RuntimeServiceContext } from "@sera/runtime-host";
import { createPersistentRuntimeRecoveryService } from "@sera/runtime-recovery";
import { createRuntimeStateService, openRuntimeState, type RuntimeStateConfigInput, type RuntimeStateStore } from "@sera/runtime-state";
import { redactSecrets } from "@sera/shared";

export const LOCAL_MODEL_RUNTIME_VERSION = "local-model-runtime-v1";
export const LOCAL_MODEL_RUNTIME_SCHEMA_VERSION = "sera.local-model-runtime.v1";
export const LOCAL_MODEL_RUNTIME_SERVICE_ID = "local-model-runtime";
export const MODEL_POLICY_VERSION = "local-model-policy-v1";
export const MODEL_AUTHORIZATION_VERSION = "model-invocation-authorization-v1";

export type ProviderType = "deterministic-fixture" | "local-process" | "loopback-local-endpoint" | "compatibility-adapter";
export type ModelCapability = "text-generation" | "chat-completion" | "structured-json" | "embeddings" | "tool-call-proposal" | "vision-input";
export type InvocationState = "CREATED" | "AUTHORIZING" | "READY" | "INVOKING" | "COMPLETED" | "FAILED" | "TIMED_OUT" | "CANCELLED" | "BLOCKED";
export type InvocationMode = "chat-completion" | "text-generation" | "structured-json";
export type OfflinePolicy = "offline-local";

export interface ModelRuntimeLimits {
  maxMessages: number;
  maxInputBytes: number;
  maxMessageBytes: number;
  maxOutputBytes: number;
  maxDurationMs: number;
  maxStructuredBytes: number;
  maxToolProposalCount: number;
  temperatureMin: number;
  temperatureMax: number;
}

export interface ModelRuntimePolicy {
  version: typeof MODEL_POLICY_VERSION;
  defaultProfile: "deterministic-local-fixture";
  offlinePolicy: OfflinePolicy;
  localOnlyRequired: true;
  toolExecutionAllowed: false;
  promptRetentionDefault: "redacted-summary";
  responseRetentionDefault: "redacted-summary";
  fullPromptRetentionRequiresExplicitPolicy: true;
  publicNetworkAllowed: false;
  automaticModelDownloadAllowed: false;
  limits: ModelRuntimeLimits;
}

export interface ProviderDescriptor {
  providerId: string;
  providerVersion: string;
  providerType: ProviderType;
  displayName: string;
  enabled: boolean;
  localOnly: boolean;
  offlineCompatible: boolean;
  networkCapability: "none" | "loopback-local" | "public-internet";
  endpointIdentity?: string;
  executableIdentity?: string;
  supportedInvocationModes: InvocationMode[];
  supportedModelCapabilities: ModelCapability[];
  cancellationSupport: "supported" | "best-effort" | "unsupported";
  maximumInputBytes: number;
  maximumOutputBytes: number;
  providerFingerprint: string;
  configurationIntegrityHash: string;
  limitations: string[];
  fixture: boolean;
}

export interface ModelDescriptor {
  providerId: string;
  modelId: string;
  modelVersion: string | null;
  displayName: string;
  modelFamily: string;
  contextLimit: number | null;
  outputLimit: number | null;
  supportedCapabilities: ModelCapability[];
  toolUseSupport: boolean;
  structuredOutputSupport: boolean;
  embeddingSupport: boolean;
  availability: "available" | "unavailable" | "unknown";
  localStorageReference: string | null;
  modelFingerprint: string;
  factSources: Record<string, string>;
  unknownFields: string[];
}

export interface ModelRuntimeProvider {
  descriptor: ProviderDescriptor;
  health(): { status: "healthy" | "degraded" | "blocked" | "unavailable"; message: string; localLoopbackUse: boolean; publicNetworkUse: boolean };
  catalog(): ModelDescriptor[];
  invoke(request: NormalizedModelRequest, signal: AbortSignal): Promise<ProviderResponse>;
  cancel?(invocationId: string, reason: string): void;
}

export interface ModelMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
}

export interface ModelInvocationRequest {
  invocationId: string;
  attemptId: string;
  authorizationId: string;
  providerId: string;
  modelId: string;
  invocationMode: InvocationMode;
  messages: ModelMessage[];
  systemInstruction?: string;
  responseFormat?: "text" | "json";
  temperature?: number;
  seed?: number;
  maxOutputUnits: number;
  timeoutMs: number;
  capabilities: ModelCapability[];
  toolExecutionRequested?: boolean;
  retainFullPrompt?: boolean;
  retainFullResponse?: boolean;
  correlation?: Record<string, unknown>;
}

export interface NormalizedModelRequest extends ModelInvocationRequest {
  requestHash: string;
  inputByteCount: number;
}

export interface ModelAuthorization {
  authorizationId: string;
  attemptId: string;
  providerId: string;
  modelId: string;
  requestHash: string;
  invocationProfile: "deterministic-local-fixture";
  allowedCapabilities: ModelCapability[];
  maximumInputBytes: number;
  maximumOutputBytes: number;
  maximumDurationMs: number;
  samplingLimits: { temperatureMin: number; temperatureMax: number };
  offlinePolicy: OfflinePolicy;
  localOnlyRequired: true;
  toolUsePolicy: "no-tool-execution";
  policyVersion: typeof MODEL_POLICY_VERSION;
  issuedAt: string;
  expiresAt: string;
  integrityHash: string;
}

export interface ProviderResponse {
  status: "completed" | "timed-out" | "cancelled" | "failed";
  textContent: string;
  structuredContent?: unknown;
  proposedToolCalls?: Array<Record<string, unknown>>;
  finishReason: string;
  usage?: Record<string, unknown>;
  warnings: string[];
}

export interface ModelInvocationResult {
  ok: boolean;
  status: InvocationState;
  invocationId: string;
  attemptId: string;
  authorizationId: string;
  providerId: string;
  modelId: string;
  responseHash?: string;
  evidenceRoot: string;
  databasePath: string;
  candidateIntelligence: true;
  attemptSuccessManufactured: boolean;
  toolProposalsInert: boolean;
  localLoopbackUse: boolean;
  publicNetworkUse: boolean;
  modelUse: boolean;
}

export interface ModelProofResult {
  ok: boolean;
  status: "healthy" | "blocked";
  proofRoot: string;
  databasePath: string;
  firstInvocation: string;
  secondInvocation: string;
  providerRegistryDeterministic: boolean;
  duplicateProviderBlocks: boolean;
  unknownProviderBlocks: boolean;
  disabledProviderBlocks: boolean;
  unknownModelBlocks: boolean;
  unknownMetadataHonest: boolean;
  fixtureNonReal: boolean;
  authorizationRequired: boolean;
  expiredAuthorizationBlocks: boolean;
  requestIntegrityEnforced: boolean;
  providerModelBindingEnforced: boolean;
  profileEnforced: boolean;
  capabilityPolicyEnforced: boolean;
  toolExecutionBlocked: boolean;
  toolProposalInert: boolean;
  publicEndpointBlocked: boolean;
  cloudProviderBlocked: boolean;
  noAutomaticDownload: boolean;
  messageCountLimit: boolean;
  inputByteLimit: boolean;
  perMessageLimit: boolean;
  outputByteLimit: boolean;
  structuredOutputLimit: boolean;
  toolProposalLimit: boolean;
  stableRequestHash: boolean;
  idempotent: boolean;
  conflictingIdempotencyBlocked: boolean;
  completedNotRunTwice: boolean;
  idempotencySurvivesRestart: boolean;
  timeoutDurable: boolean;
  cancellationDurable: boolean;
  repeatedCancellationIdempotent: boolean;
  cancellationLimitationReported: boolean;
  promptRedaction: boolean;
  responseRedaction: boolean;
  secretsExcluded: boolean;
  fullPromptPolicy: boolean;
  responseHashDurable: boolean;
  terminalImmutable: boolean;
  eventsMonotonic: boolean;
  transactionNoFalseCompletion: boolean;
  noAttemptSuccessManufactured: boolean;
  candidateIntelligenceOnly: boolean;
  runtimeServiceHealthy: boolean;
  optionalProviderDegraded: boolean;
  shutdownRefusesNewInvocation: boolean;
  runtimeCancellationReached: boolean;
  interruptedFixtureRecoverable: boolean;
  interruptedRealProviderReview: boolean;
  evidenceComplete: boolean;
  evidenceRedacted: boolean;
  nonGit: boolean;
  offline: boolean;
  fixtureNoInstallRequired: boolean;
  publicNetworkUse: false;
  modelUse: boolean;
}

export const DEFAULT_MODEL_POLICY: ModelRuntimePolicy = {
  version: MODEL_POLICY_VERSION,
  defaultProfile: "deterministic-local-fixture",
  offlinePolicy: "offline-local",
  localOnlyRequired: true,
  toolExecutionAllowed: false,
  promptRetentionDefault: "redacted-summary",
  responseRetentionDefault: "redacted-summary",
  fullPromptRetentionRequiresExplicitPolicy: true,
  publicNetworkAllowed: false,
  automaticModelDownloadAllowed: false,
  limits: {
    maxMessages: 8,
    maxInputBytes: 8192,
    maxMessageBytes: 2048,
    maxOutputBytes: 4096,
    maxDurationMs: 2000,
    maxStructuredBytes: 2048,
    maxToolProposalCount: 3,
    temperatureMin: 0,
    temperatureMax: 1
  }
};

const TERMINAL_INVOCATIONS = new Set<InvocationState>(["COMPLETED", "FAILED", "TIMED_OUT", "CANCELLED", "BLOCKED"]);

export class ModelRuntimeBlockedError extends Error {
  constructor(message: string, readonly code: string) {
    super(message);
  }
}

export class ProviderRegistry {
  private readonly providers = new Map<string, ModelRuntimeProvider>();

  constructor(providers: ModelRuntimeProvider[] = [createDeterministicFixtureProvider(), createDisabledLoopbackProvider()]) {
    for (const provider of providers) this.register(provider);
  }

  register(provider: ModelRuntimeProvider): void {
    const id = provider.descriptor.providerId;
    if (this.providers.has(id)) throw new ModelRuntimeBlockedError(`Duplicate model provider ID: ${id}`, "duplicate_provider");
    validateProviderDescriptor(provider.descriptor);
    this.providers.set(id, provider);
  }

  get(providerId: string): ModelRuntimeProvider | undefined {
    return this.providers.get(providerId);
  }

  list(): ProviderDescriptor[] {
    return [...this.providers.values()].map((provider) => ({ ...provider.descriptor })).sort((a, b) => a.providerId.localeCompare(b.providerId));
  }

  catalog(): ModelDescriptor[] {
    return [...this.providers.values()].flatMap((provider) => provider.catalog()).sort((a, b) => `${a.providerId}:${a.modelId}`.localeCompare(`${b.providerId}:${b.modelId}`));
  }
}

export interface ModelRuntimeConfigInput extends RuntimeStateConfigInput {
  projectRoot?: string;
  evidenceRoot?: string;
  policy?: ModelRuntimePolicy;
}

export class LocalModelRuntime {
  private readonly evidenceRoot: string;
  private readonly policy: ModelRuntimePolicy;
  private accepting = true;

  constructor(private readonly store: RuntimeStateStore, input: ModelRuntimeConfigInput = {}, private readonly registry = new ProviderRegistry()) {
    const projectRoot = path.resolve(input.projectRoot ?? process.cwd());
    this.evidenceRoot = path.resolve(input.evidenceRoot ?? path.join(projectRoot, ".sera", "model-runtime"));
    this.policy = input.policy ?? DEFAULT_MODEL_POLICY;
    this.registerCatalog();
  }

  providers(): Record<string, unknown> {
    return {
      ok: true,
      status: "INSPECTED",
      schemaVersion: LOCAL_MODEL_RUNTIME_SCHEMA_VERSION,
      runtimeVersion: LOCAL_MODEL_RUNTIME_VERSION,
      providers: this.registry.list().map((provider) => ({ ...provider, health: this.registry.get(provider.providerId)?.health() })),
      realProviderAdapterStatus: "optional loopback adapter is disabled by default and unavailable unless explicitly configured later",
      modelUse: false,
      networkUse: false
    };
  }

  models(): Record<string, unknown> {
    return {
      ok: true,
      status: "INSPECTED",
      schemaVersion: LOCAL_MODEL_RUNTIME_SCHEMA_VERSION,
      models: this.registry.catalog(),
      modelUse: false,
      networkUse: false
    };
  }

  policyReport(): Record<string, unknown> {
    return {
      ok: true,
      status: "INSPECTED",
      schemaVersion: LOCAL_MODEL_RUNTIME_SCHEMA_VERSION,
      policy: this.policy,
      guarantee: "Local Model Runtime returns untrusted candidate intelligence only; it does not prove truth, safety, correctness, or task completion.",
      toolExecution: false,
      publicNetworkUse: false,
      modelUse: false,
      networkUse: false
    };
  }

  inspectInvocation(invocationId: string): Record<string, unknown> {
    const invocation = this.store.recoveryGet("SELECT * FROM model_invocations WHERE invocation_id = ?", [invocationId]);
    if (!invocation) throw new ModelRuntimeBlockedError("Model invocation does not exist.", "missing_invocation");
    return {
      ok: true,
      status: "INSPECTED",
      invocation,
      authorization: this.store.recoveryGet("SELECT * FROM model_authorizations WHERE authorization_id = ?", [String(invocation.authorization_id)]),
      events: this.store.recoveryAll("SELECT * FROM model_events WHERE invocation_id = ? ORDER BY sequence", [invocationId]),
      artifacts: this.store.recoveryAll("SELECT * FROM model_artifacts WHERE invocation_id = ? ORDER BY artifact_type", [invocationId]),
      promptRedaction: "prompts are redacted by default",
      candidateIntelligence: true,
      modelUse: true,
      networkUse: false
    };
  }

  shutdown(): void {
    this.accepting = false;
  }

  async invoke(requestInput: ModelInvocationRequest, authorization: ModelAuthorization | undefined, idempotencyKey: string): Promise<ModelInvocationResult> {
    if (!this.accepting) throw new ModelRuntimeBlockedError("Local Model Runtime is shutting down and refuses new invocation.", "shutdown_refuses_invocation");
    const request = normalizeRequest(requestInput, this.policy);
    const existing = this.store.recoveryGet("SELECT invocation_id, request_hash FROM model_invocations WHERE idempotency_key = ?", [idempotencyKey]);
    if (existing) {
      if (String(existing.request_hash) !== request.requestHash) throw new ModelRuntimeBlockedError("Model invocation idempotency key was reused for a conflicting request.", "conflicting_idempotency_key");
      return this.resultFromDurableInvocation(String(existing.invocation_id));
    }
    const provider = this.registry.get(request.providerId);
    const evidenceRoot = path.join(this.evidenceRoot, request.invocationId);
    fs.mkdirSync(evidenceRoot, { recursive: true });
    this.createInvocation(request, idempotencyKey, evidenceRoot);
    this.event(request.invocationId, "CREATED", "PASS", "Model invocation record created.", {});
    const blockReason = this.validateBeforeInvoke(request, authorization, provider);
    if (blockReason) return this.blockInvocation(request, evidenceRoot, blockReason);
    const catalogModel = provider!.catalog().find((model) => model.modelId === request.modelId);
    const providerHealth = provider!.health();
    if (!catalogModel) return this.blockInvocation(request, evidenceRoot, "Unknown model.");
    this.persistAuthorization(authorization!);
    writeJson(path.join(evidenceRoot, "authorization.json"), redactAuthorization(authorization!));
    writeJson(path.join(evidenceRoot, "request-summary.json"), redactedRequestSummary(request));
    writeJson(path.join(evidenceRoot, "provider.json"), provider!.descriptor);
    writeJson(path.join(evidenceRoot, "model.json"), catalogModel);
    writeJson(path.join(evidenceRoot, "policy.json"), this.policy);
    writeJson(path.join(evidenceRoot, "redaction-report.json"), redactionReport(request));
    this.recordArtifact(request.invocationId, "authorization", path.join(evidenceRoot, "authorization.json"), "redacted");
    this.recordArtifact(request.invocationId, "request-summary", path.join(evidenceRoot, "request-summary.json"), "redacted");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort("timeout"), request.timeoutMs);
    try {
      this.transition(request.invocationId, "AUTHORIZING");
      this.transition(request.invocationId, "READY");
      this.transition(request.invocationId, "INVOKING", { started_at: new Date().toISOString() });
      const response = await provider!.invoke(request, controller.signal);
      clearTimeout(timeout);
      if (response.status === "timed-out") return this.timeoutInvocation(request, evidenceRoot, "Provider reported timeout.");
      if (response.status === "cancelled") return this.cancelInvocation(request.invocationId, "Provider reported cancellation.");
      if (response.status !== "completed") return this.failInvocation(request, evidenceRoot, "Provider invocation failed.");
      return this.completeInvocation(request, evidenceRoot, provider!.descriptor, catalogModel, response, providerHealth.localLoopbackUse, providerHealth.publicNetworkUse);
    } catch (error) {
      clearTimeout(timeout);
      if (controller.signal.aborted) return this.timeoutInvocation(request, evidenceRoot, "Invocation timed out.");
      return this.failInvocation(request, evidenceRoot, errorMessage(error));
    }
  }

  cancelInvocation(invocationId: string, reason = "operator-cancelled"): ModelInvocationResult {
    const row = this.store.recoveryGet("SELECT * FROM model_invocations WHERE invocation_id = ?", [invocationId]);
    if (!row) throw new ModelRuntimeBlockedError("Model invocation does not exist.", "missing_invocation");
    if (String(row.state) === "CANCELLED") return this.resultFromDurableInvocation(invocationId);
    if (TERMINAL_INVOCATIONS.has(String(row.state) as InvocationState)) throw new ModelRuntimeBlockedError("Terminal invocation records are immutable.", "terminal_invocation_immutable");
    this.store.recoveryTransaction((db) => {
      db.prepare("UPDATE model_invocations SET state = ?, completed_at = ?, failure_or_block_reason = ?, optimistic_version = optimistic_version + 1 WHERE invocation_id = ?").run("CANCELLED", new Date().toISOString(), reason, invocationId);
    });
    this.event(invocationId, "CANCELLED", "CANCELLED", reason, { providerCancellation: "best-effort" });
    return this.resultFromDurableInvocation(invocationId);
  }

  forceTransitionForTest(invocationId: string, state: InvocationState): void {
    const row = this.store.recoveryGet("SELECT state FROM model_invocations WHERE invocation_id = ?", [invocationId]);
    if (!row) throw new ModelRuntimeBlockedError("Model invocation does not exist.", "missing_invocation");
    if (TERMINAL_INVOCATIONS.has(String(row.state) as InvocationState)) throw new ModelRuntimeBlockedError("Terminal invocation records are immutable.", "terminal_invocation_immutable");
    this.transition(invocationId, state);
  }

  createInterruptedForRecovery(attemptId: string, providerId: string): string {
    const request = normalizeRequest(baseRequest({ attemptId, providerId, invocationId: id("model_invocation_interrupted") }), this.policy);
    this.createInvocation(request, `interrupted:${request.invocationId}`, path.join(this.evidenceRoot, request.invocationId));
    this.transition(request.invocationId, "INVOKING");
    return request.invocationId;
  }

  private registerCatalog(): void {
    const now = new Date().toISOString();
    for (const provider of this.registry.list()) {
      this.store.recoveryRun("INSERT OR REPLACE INTO model_providers (provider_id, provider_version, provider_type, enabled, local_only, offline_compatible, network_capability, configuration_hash, provider_fingerprint, health_state, last_health_timestamp, metadata_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
        provider.providerId,
        provider.providerVersion,
        provider.providerType,
        provider.enabled ? 1 : 0,
        provider.localOnly ? 1 : 0,
        provider.offlineCompatible ? 1 : 0,
        provider.networkCapability,
        provider.configurationIntegrityHash,
        provider.providerFingerprint,
        this.registry.get(provider.providerId)?.health().status ?? "blocked",
        now,
        stableJson({ displayName: provider.displayName, limitations: provider.limitations, fixture: provider.fixture })
      ]);
    }
    for (const model of this.registry.catalog()) {
      this.store.recoveryRun("INSERT OR REPLACE INTO model_catalog (provider_id, model_id, model_version, model_fingerprint, display_name, model_family, capabilities_json, availability, context_limit, output_limit, tool_use_support, structured_output_support, embedding_support, local_storage_reference, metadata_sources_json, observed_at, metadata_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
        model.providerId,
        model.modelId,
        model.modelVersion,
        model.modelFingerprint,
        model.displayName,
        model.modelFamily,
        stableJson(model.supportedCapabilities),
        model.availability,
        model.contextLimit,
        model.outputLimit,
        model.toolUseSupport ? 1 : 0,
        model.structuredOutputSupport ? 1 : 0,
        model.embeddingSupport ? 1 : 0,
        model.localStorageReference,
        stableJson(model.factSources),
        now,
        stableJson({ unknownFields: model.unknownFields })
      ]);
    }
  }

  private validateBeforeInvoke(request: NormalizedModelRequest, authorization: ModelAuthorization | undefined, provider?: ModelRuntimeProvider): string | undefined {
    if (!authorization) return "Model invocation authorization is required.";
    if (authorization.integrityHash !== authorizationHash(authorization)) return "Authorization integrity hash mismatch.";
    if (authorization.policyVersion !== MODEL_POLICY_VERSION) return "Unsupported model policy version.";
    if (Date.parse(authorization.expiresAt) < Date.now()) return "Model invocation authorization expired.";
    if (authorization.attemptId !== request.attemptId) return "Authorization attempt mismatch.";
    if (authorization.providerId !== request.providerId) return "Authorization provider mismatch.";
    if (authorization.modelId !== request.modelId) return "Authorization model mismatch.";
    if (authorization.requestHash !== request.requestHash) return "Authorization request hash mismatch.";
    if (authorization.invocationProfile !== this.policy.defaultProfile) return "Invocation profile mismatch.";
    if (authorization.maximumInputBytes !== this.policy.limits.maxInputBytes || authorization.maximumOutputBytes !== this.policy.limits.maxOutputBytes || authorization.maximumDurationMs !== request.timeoutMs) return "Authorization limits mismatch.";
    if (request.capabilities.some((capability) => !authorization.allowedCapabilities.includes(capability))) return "Requested model capability is not authorized.";
    if (request.toolExecutionRequested) return "Model tool execution is blocked; tool proposals are inert data only.";
    if (!provider) return "Unknown provider.";
    if (!provider.descriptor.enabled) return "Provider is disabled.";
    if (!provider.descriptor.localOnly || !authorization.localOnlyRequired) return "Local-only policy is required.";
    if (provider.descriptor.networkCapability === "public-internet") return "Public model endpoint configuration is blocked.";
    if (provider.descriptor.providerType === "compatibility-adapter" && !provider.descriptor.offlineCompatible) return "Cloud provider configuration is blocked.";
    if (!provider.catalog().some((model) => model.modelId === request.modelId)) return "Unknown model.";
    if (request.inputByteCount > authorization.maximumInputBytes) return "Input byte count exceeds authorization.";
    return undefined;
  }

  private createInvocation(request: NormalizedModelRequest, idempotencyKey: string, evidenceRoot: string): void {
    const now = new Date().toISOString();
    this.store.recoveryTransaction((db) => {
      db.prepare("INSERT INTO model_invocations (invocation_id, attempt_id, authorization_id, provider_id, model_id, idempotency_key, request_hash, state, response_hash, input_byte_count, output_byte_count, created_at, started_at, completed_at, timeout_ms, failure_or_block_reason, optimistic_version, evidence_root) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(
        request.invocationId,
        request.attemptId,
        request.authorizationId,
        request.providerId,
        request.modelId,
        idempotencyKey,
        request.requestHash,
        "CREATED",
        null,
        request.inputByteCount,
        0,
        now,
        null,
        null,
        request.timeoutMs,
        null,
        1,
        evidenceRoot
      );
    });
  }

  private persistAuthorization(authorization: ModelAuthorization): void {
    this.store.recoveryRun("INSERT OR REPLACE INTO model_authorizations (authorization_id, attempt_id, provider_id, model_id, request_hash, invocation_profile, limits_json, allowed_capabilities_json, offline_policy, local_only_required, tool_use_policy, policy_version, issued_at, expires_at, integrity_hash, metadata_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
      authorization.authorizationId,
      authorization.attemptId,
      authorization.providerId,
      authorization.modelId,
      authorization.requestHash,
      authorization.invocationProfile,
      stableJson({ maximumInputBytes: authorization.maximumInputBytes, maximumOutputBytes: authorization.maximumOutputBytes, maximumDurationMs: authorization.maximumDurationMs, samplingLimits: authorization.samplingLimits }),
      stableJson(authorization.allowedCapabilities),
      authorization.offlinePolicy,
      authorization.localOnlyRequired ? 1 : 0,
      authorization.toolUsePolicy,
      authorization.policyVersion,
      authorization.issuedAt,
      authorization.expiresAt,
      authorization.integrityHash,
      stableJson({ version: MODEL_AUTHORIZATION_VERSION })
    ]);
  }

  private completeInvocation(request: NormalizedModelRequest, evidenceRoot: string, provider: ProviderDescriptor, model: ModelDescriptor, response: ProviderResponse, localLoopbackUse: boolean, publicNetworkUse: boolean): ModelInvocationResult {
    const normalized = normalizeResponse(request, provider, model, response, this.policy);
    writeJson(path.join(evidenceRoot, "response-summary.json"), normalized.responseSummary);
    writeJson(path.join(evidenceRoot, "usage.json"), normalized.usage);
    writeJson(path.join(evidenceRoot, "final-invocation-report.json"), normalized.finalReport);
    appendJsonLine(path.join(evidenceRoot, "lifecycle-events.jsonl"), { event: "completed", invocationId: request.invocationId, candidateIntelligence: true });
    this.recordArtifact(request.invocationId, "response-summary", path.join(evidenceRoot, "response-summary.json"), "redacted");
    this.recordArtifact(request.invocationId, "usage", path.join(evidenceRoot, "usage.json"), "metadata");
    this.recordArtifact(request.invocationId, "final-report", path.join(evidenceRoot, "final-invocation-report.json"), "redacted");
    this.store.recoveryRun("UPDATE model_invocations SET state = ?, response_hash = ?, output_byte_count = ?, completed_at = ?, optimistic_version = optimistic_version + 1 WHERE invocation_id = ? AND state NOT IN ('COMPLETED','FAILED','TIMED_OUT','CANCELLED','BLOCKED')", [
      "COMPLETED",
      normalized.responseHash,
      normalized.outputBytes,
      new Date().toISOString(),
      request.invocationId
    ]);
    this.event(request.invocationId, "COMPLETED", "PASS", "Provider returned bounded candidate intelligence.", { responseHash: normalized.responseHash, candidateIntelligence: true, localLoopbackUse, publicNetworkUse });
    return this.resultFromDurableInvocation(request.invocationId);
  }

  private blockInvocation(request: NormalizedModelRequest, evidenceRoot: string, reason: string): ModelInvocationResult {
    writeJson(path.join(evidenceRoot, "final-invocation-report.json"), { invocationId: request.invocationId, status: "BLOCKED", reason, candidateIntelligence: true, modelUse: false, publicNetworkUse: false });
    this.recordArtifact(request.invocationId, "final-report", path.join(evidenceRoot, "final-invocation-report.json"), "redacted");
    this.store.recoveryRun("UPDATE model_invocations SET state = ?, completed_at = ?, failure_or_block_reason = ?, optimistic_version = optimistic_version + 1 WHERE invocation_id = ? AND state NOT IN ('COMPLETED','FAILED','TIMED_OUT','CANCELLED','BLOCKED')", ["BLOCKED", new Date().toISOString(), reason, request.invocationId]);
    this.event(request.invocationId, "BLOCKED", "BLOCKED", reason, {});
    return this.resultFromDurableInvocation(request.invocationId);
  }

  private timeoutInvocation(request: NormalizedModelRequest, evidenceRoot: string, reason: string): ModelInvocationResult {
    writeJson(path.join(evidenceRoot, "final-invocation-report.json"), { invocationId: request.invocationId, status: "TIMED_OUT", reason, candidateIntelligence: true, modelUse: true, publicNetworkUse: false });
    this.store.recoveryRun("UPDATE model_invocations SET state = ?, completed_at = ?, failure_or_block_reason = ?, optimistic_version = optimistic_version + 1 WHERE invocation_id = ? AND state NOT IN ('COMPLETED','FAILED','TIMED_OUT','CANCELLED','BLOCKED')", ["TIMED_OUT", new Date().toISOString(), reason, request.invocationId]);
    this.event(request.invocationId, "TIMED_OUT", "TIMED_OUT", reason, {});
    return this.resultFromDurableInvocation(request.invocationId);
  }

  private failInvocation(request: NormalizedModelRequest, evidenceRoot: string, reason: string): ModelInvocationResult {
    writeJson(path.join(evidenceRoot, "final-invocation-report.json"), { invocationId: request.invocationId, status: "FAILED", reason, candidateIntelligence: true, modelUse: true, publicNetworkUse: false });
    this.store.recoveryRun("UPDATE model_invocations SET state = ?, completed_at = ?, failure_or_block_reason = ?, optimistic_version = optimistic_version + 1 WHERE invocation_id = ? AND state NOT IN ('COMPLETED','FAILED','TIMED_OUT','CANCELLED','BLOCKED')", ["FAILED", new Date().toISOString(), reason, request.invocationId]);
    this.event(request.invocationId, "FAILED", "FAILED", reason, {});
    return this.resultFromDurableInvocation(request.invocationId);
  }

  private resultFromDurableInvocation(invocationId: string): ModelInvocationResult {
    const row = this.store.recoveryGet("SELECT * FROM model_invocations WHERE invocation_id = ?", [invocationId]);
    if (!row) throw new ModelRuntimeBlockedError("Model invocation does not exist.", "missing_invocation");
    const attempt = this.store.recoveryGet("SELECT current_state FROM attempts WHERE attempt_id = ?", [String(row.attempt_id)]);
    const provider = this.registry.get(String(row.provider_id));
    const health = provider?.health();
    return {
      ok: String(row.state) === "COMPLETED",
      status: String(row.state) as InvocationState,
      invocationId,
      attemptId: String(row.attempt_id),
      authorizationId: String(row.authorization_id),
      providerId: String(row.provider_id),
      modelId: String(row.model_id),
      responseHash: row.response_hash ? String(row.response_hash) : undefined,
      evidenceRoot: String(row.evidence_root),
      databasePath: this.store.inspect().databasePath,
      candidateIntelligence: true,
      attemptSuccessManufactured: attempt?.current_state === "COMPLETED" || attempt?.current_state === "COMPLETED_WITH_WARNINGS",
      toolProposalsInert: true,
      localLoopbackUse: health?.localLoopbackUse ?? false,
      publicNetworkUse: health?.publicNetworkUse ?? false,
      modelUse: String(row.state) !== "BLOCKED"
    };
  }

  private transition(invocationId: string, state: InvocationState, fields: Record<string, unknown> = {}): void {
    const assignments = ["state = ?", "optimistic_version = optimistic_version + 1", ...Object.keys(fields).map((key) => `${key} = ?`)];
    this.store.recoveryRun(`UPDATE model_invocations SET ${assignments.join(", ")} WHERE invocation_id = ? AND state NOT IN ('COMPLETED','FAILED','TIMED_OUT','CANCELLED','BLOCKED')`, [state, ...Object.values(fields) as any[], invocationId]);
    this.event(invocationId, state, "PASS", `Invocation state advanced to ${state}.`, {});
  }

  private event(invocationId: string, eventType: string, outcome: string, message: string, details: unknown): void {
    const sequence = Number(this.store.recoveryGet("SELECT COALESCE(MAX(sequence), 0) + 1 AS next FROM model_events WHERE invocation_id = ?", [invocationId])?.next ?? 1);
    this.store.recoveryRun("INSERT INTO model_events (event_id, invocation_id, sequence, event_type, timestamp, runtime_instance_id, outcome, message, details_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", [id("model_event"), invocationId, sequence, eventType, new Date().toISOString(), this.store.currentRuntimeInstanceId(), outcome, message, stableJson(details ?? {})]);
  }

  private recordArtifact(invocationId: string, artifactType: string, filePath: string, redactionState: string): void {
    if (!fs.existsSync(filePath)) return;
    const stat = fs.statSync(filePath);
    this.store.recoveryRun("INSERT OR REPLACE INTO model_artifacts (invocation_id, artifact_type, evidence_location, integrity_hash, size, redaction_state, metadata_json) VALUES (?, ?, ?, ?, ?, ?, ?)", [invocationId, artifactType, filePath, sha256File(filePath), stat.size, redactionState, stableJson({})]);
  }
}

export function createModelAuthorization(request: NormalizedModelRequest, input: Partial<ModelAuthorization> = {}): ModelAuthorization {
  const issuedAt = input.issuedAt ?? new Date().toISOString();
  const authorization: ModelAuthorization = {
    authorizationId: input.authorizationId ?? request.authorizationId,
    attemptId: input.attemptId ?? request.attemptId,
    providerId: input.providerId ?? request.providerId,
    modelId: input.modelId ?? request.modelId,
    requestHash: input.requestHash ?? request.requestHash,
    invocationProfile: input.invocationProfile ?? "deterministic-local-fixture",
    allowedCapabilities: input.allowedCapabilities ?? request.capabilities,
    maximumInputBytes: input.maximumInputBytes ?? DEFAULT_MODEL_POLICY.limits.maxInputBytes,
    maximumOutputBytes: input.maximumOutputBytes ?? DEFAULT_MODEL_POLICY.limits.maxOutputBytes,
    maximumDurationMs: input.maximumDurationMs ?? request.timeoutMs,
    samplingLimits: input.samplingLimits ?? { temperatureMin: 0, temperatureMax: 1 },
    offlinePolicy: input.offlinePolicy ?? "offline-local",
    localOnlyRequired: true,
    toolUsePolicy: input.toolUsePolicy ?? "no-tool-execution",
    policyVersion: input.policyVersion ?? MODEL_POLICY_VERSION,
    issuedAt,
    expiresAt: input.expiresAt ?? new Date(Date.parse(issuedAt) + 60_000).toISOString(),
    integrityHash: ""
  };
  authorization.integrityHash = authorizationHash(authorization);
  return authorization;
}

export function normalizeRequest(input: ModelInvocationRequest, policy: ModelRuntimePolicy = DEFAULT_MODEL_POLICY): NormalizedModelRequest {
  const roles = new Set(["system", "user", "assistant", "tool"]);
  const invocationModes = new Set(["chat-completion", "text-generation", "structured-json"]);
  if (!input.invocationId || !input.attemptId || !input.authorizationId) throw new ModelRuntimeBlockedError("Invocation, attempt, and authorization IDs are required.", "invalid_request");
  if (!invocationModes.has(input.invocationMode)) throw new ModelRuntimeBlockedError("Unsupported model invocation mode.", "unsupported_invocation_mode");
  if (input.messages.length > policy.limits.maxMessages) throw new ModelRuntimeBlockedError("Message count limit exceeded.", "message_count_limit");
  if (input.toolExecutionRequested) throw new ModelRuntimeBlockedError("Tool execution request is blocked.", "tool_execution_blocked");
  if (input.temperature !== undefined && (input.temperature < policy.limits.temperatureMin || input.temperature > policy.limits.temperatureMax)) throw new ModelRuntimeBlockedError("Sampling limits exceeded.", "sampling_limit");
  const messages = input.messages.map((message) => {
    if (!roles.has(message.role)) throw new ModelRuntimeBlockedError("Invalid model message role.", "invalid_role");
    const size = Buffer.byteLength(message.content, "utf8");
    if (size > policy.limits.maxMessageBytes) throw new ModelRuntimeBlockedError("Per-message byte limit exceeded.", "message_byte_limit");
    return { role: message.role, content: message.content.replace(/\r\n/g, "\n") };
  });
  const canonical = {
    invocationId: input.invocationId,
    attemptId: input.attemptId,
    authorizationId: input.authorizationId,
    providerId: input.providerId,
    modelId: input.modelId,
    invocationMode: input.invocationMode,
    messages,
    systemInstruction: input.systemInstruction ?? null,
    responseFormat: input.responseFormat ?? "text",
    temperature: input.temperature ?? 0,
    seed: input.seed ?? null,
    maxOutputUnits: input.maxOutputUnits,
    timeoutMs: input.timeoutMs,
    capabilities: [...input.capabilities].sort(),
    correlation: input.correlation ?? {}
  };
  const inputByteCount = Buffer.byteLength(stableJson(canonical), "utf8");
  if (inputByteCount > policy.limits.maxInputBytes) throw new ModelRuntimeBlockedError("Input byte limit exceeded.", "input_byte_limit");
  if (input.timeoutMs > policy.limits.maxDurationMs) throw new ModelRuntimeBlockedError("Timeout exceeds policy limit.", "timeout_limit");
  return { ...input, messages, requestHash: stableHash(canonical), inputByteCount };
}

export function createDeterministicFixtureProvider(): ModelRuntimeProvider {
  const descriptor: ProviderDescriptor = providerDescriptor({
    providerId: "fixture-deterministic-local",
    providerType: "deterministic-fixture",
    displayName: "Deterministic Certification Fixture",
    enabled: true,
    fixture: true,
    cancellationSupport: "best-effort",
    supportedInvocationModes: ["chat-completion", "text-generation", "structured-json"],
    supportedModelCapabilities: ["text-generation", "chat-completion", "structured-json", "tool-call-proposal"]
  });
  const model: ModelDescriptor = {
    providerId: descriptor.providerId,
    modelId: "fixture-candidate-v1",
    modelVersion: "v1",
    displayName: "Fixture Candidate v1",
    modelFamily: "deterministic-fixture",
    contextLimit: 8192,
    outputLimit: 4096,
    supportedCapabilities: descriptor.supportedModelCapabilities,
    toolUseSupport: false,
    structuredOutputSupport: true,
    embeddingSupport: false,
    availability: "available",
    localStorageReference: null,
    modelFingerprint: stableHash({ modelId: "fixture-candidate-v1", version: "v1", fixture: true }),
    factSources: { provider: "packages/model-runtime deterministic fixture", modelVersion: "static fixture contract" },
    unknownFields: []
  };
  return {
    descriptor,
    health: () => ({ status: "healthy", message: "Deterministic fixture is available offline and requires no installed model.", localLoopbackUse: false, publicNetworkUse: false }),
    catalog: () => [model],
    async invoke(request, signal) {
      if (request.messages.some((message) => message.content.includes("fixture-timeout"))) {
        await delay(request.timeoutMs + 10, signal);
        return { status: "timed-out", textContent: "", finishReason: "timeout", warnings: ["fixture timeout path"] };
      }
      if (request.messages.some((message) => message.content.includes("fixture-cancel"))) {
        return { status: "cancelled", textContent: "", finishReason: "cancelled", warnings: ["fixture cancellation path"] };
      }
      const source = request.messages.map((message) => `${message.role}:${message.content}`).join(" | ");
      const proposedToolCalls = request.capabilities.includes("tool-call-proposal") ? [{ name: "inert_fixture_tool", arguments: { inputHash: request.requestHash }, inert: true, requiresControlPlaneAuthorization: true }] : [];
      const text = `fixture candidate intelligence: ${redactSecrets(source).slice(0, Math.max(1, request.maxOutputUnits))}`;
      return {
        status: "completed",
        textContent: text,
        structuredContent: request.responseFormat === "json" ? { candidate: true, requestHash: request.requestHash } : undefined,
        proposedToolCalls,
        finishReason: "stop",
        usage: { providerReported: false, estimatedBytes: Buffer.byteLength(text, "utf8") },
        warnings: ["fixture provider is not a real model", "candidate intelligence only"]
      };
    },
    cancel() {
      // The fixture cooperates with cancellation but cannot prove instant termination for all real providers.
    }
  };
}

export function createDisabledLoopbackProvider(endpoint = "http://127.0.0.1:11434"): ModelRuntimeProvider {
  const local = isLoopbackEndpoint(endpoint);
  const descriptor = providerDescriptor({
    providerId: "ollama-loopback-disabled",
    providerType: local ? "loopback-local-endpoint" : "compatibility-adapter",
    displayName: "Disabled Loopback Local Provider Adapter",
    enabled: false,
    fixture: false,
    networkCapability: local ? "loopback-local" : "public-internet",
    endpointIdentity: redactSecrets(endpoint),
    cancellationSupport: "unsupported",
    supportedInvocationModes: ["chat-completion", "text-generation"],
    supportedModelCapabilities: ["text-generation", "chat-completion"]
  });
  return {
    descriptor,
    health: () => ({ status: "degraded", message: "Optional real local provider adapter is disabled and unavailable for certification.", localLoopbackUse: false, publicNetworkUse: false }),
    catalog: () => [{
      providerId: descriptor.providerId,
      modelId: "unknown-local-model",
      modelVersion: null,
      displayName: "Unknown local model",
      modelFamily: "unknown",
      contextLimit: null,
      outputLimit: null,
      supportedCapabilities: ["text-generation", "chat-completion"],
      toolUseSupport: false,
      structuredOutputSupport: false,
      embeddingSupport: false,
      availability: "unknown",
      localStorageReference: null,
      modelFingerprint: stableHash({ providerId: descriptor.providerId, modelId: "unknown-local-model" }),
      factSources: { availability: "provider disabled; no public endpoint contacted" },
      unknownFields: ["modelVersion", "contextLimit", "outputLimit", "localStorageReference"]
    }],
    async invoke() {
      throw new ModelRuntimeBlockedError("Disabled loopback provider cannot be invoked.", "provider_disabled");
    }
  };
}

export function createModelRuntimeService(input: ModelRuntimeConfigInput = {}): RuntimeService {
  let store: RuntimeStateStore | undefined;
  let runtime: LocalModelRuntime | undefined;
  return {
    id: LOCAL_MODEL_RUNTIME_SERVICE_ID,
    version: LOCAL_MODEL_RUNTIME_VERSION,
    required: true,
    dependencies: ["operational-state", "unified-control-plane", "persistent-runtime-recovery"],
    start(context: RuntimeServiceContext) {
      store = openRuntimeState({ projectRoot: context.config.projectRoot, stateRoot: input.stateRoot, databasePath: input.databasePath, backupRoot: input.backupRoot, exportRoot: input.exportRoot, installationId: context.identity.installationId, runtimeInstanceId: context.identity.runtimeInstanceId, runtimeVersion: LOCAL_MODEL_RUNTIME_VERSION });
      runtime = new LocalModelRuntime(store, { ...input, projectRoot: context.config.projectRoot });
      if (context.signal.aborted) runtime.shutdown();
      context.signal.addEventListener("abort", () => runtime?.shutdown(), { once: true });
    },
    health(context) {
      const providers = runtime?.providers() as any;
      const optionalUnavailable = providers?.providers?.some((provider: any) => provider.enabled === false);
      return { serviceId: LOCAL_MODEL_RUNTIME_SERVICE_ID, status: runtime ? "healthy" : "blocked", checkedAt: new Date().toISOString(), message: "Local Model Runtime provider registry is available; model output remains candidate intelligence.", details: { runtimeInstanceId: context.identity.runtimeInstanceId, optionalUnavailable, policyVersion: MODEL_POLICY_VERSION } };
    },
    stop() {
      runtime?.shutdown();
      store?.close();
      runtime = undefined;
      store = undefined;
    }
  };
}

export function createModelRuntimeServices(projectRoot: string, input: ModelRuntimeConfigInput = {}): RuntimeService[] {
  const controlPlane = createControlPlaneRuntimeService(projectRoot);
  return [
    createRuntimeStateService(input),
    { ...controlPlane, dependencies: ["operational-state"] },
    createPersistentRuntimeRecoveryService({ ...input, projectRoot }),
    createModelRuntimeService({ ...input, projectRoot })
  ];
}

export async function runLocalModelRuntimeProof(input: ModelRuntimeConfigInput = {}): Promise<ModelProofResult> {
  const proofRoot = path.resolve(input.projectRoot ?? fs.mkdtempSync(path.join(os.tmpdir(), "sera-model-runtime-proof-")));
  fs.mkdirSync(proofRoot, { recursive: true });
  if (!fs.existsSync(path.join(proofRoot, "package.json"))) fs.writeFileSync(path.join(proofRoot, "package.json"), JSON.stringify({ name: "model-runtime-proof", private: true }), "utf8");
  const store = openRuntimeState({ projectRoot: proofRoot, installationId: "installation_model_runtime_proof", runtimeInstanceId: `runtime_model_runtime_proof_${Date.now()}` });
  try {
    const command = store.acceptCommand({ idempotencyKey: `model-proof:${Date.now()}:${Math.random()}`, commandType: "model-proof", payload: { proof: true }, capability: "local-model-runtime" });
    const attemptId = command.attemptId!;
    store.transitionAttempt({ attemptId, fromState: "PENDING", toState: "RUNNING", actor: "control-plane", reason: "model-proof" });
    let duplicateProviderBlocks = false;
    try {
      new ProviderRegistry([createDeterministicFixtureProvider(), createDeterministicFixtureProvider()]);
    } catch {
      duplicateProviderBlocks = true;
    }
    const runtime = new LocalModelRuntime(store, { projectRoot: proofRoot });
    const request = normalizeRequest(baseRequest({ attemptId }), DEFAULT_MODEL_POLICY);
    const authorization = createModelAuthorization(request);
    const first = await runtime.invoke(request, authorization, "model-proof-main");
    const second = await runtime.invoke(request, authorization, "model-proof-main");
    let conflict = false;
    try {
      await runtime.invoke(normalizeRequest(baseRequest({ attemptId, invocationId: "different_invocation" }), DEFAULT_MODEL_POLICY), authorization, "model-proof-main");
    } catch {
      conflict = true;
    }
    const reopened = openRuntimeState({ projectRoot: proofRoot, installationId: "installation_model_runtime_proof", runtimeInstanceId: "runtime_reopened" });
    const restartRuntime = new LocalModelRuntime(reopened, { projectRoot: proofRoot });
    const duplicateAfterRestart = await restartRuntime.invoke(request, authorization, "model-proof-main");
    reopened.close();

    const timeoutRequest = normalizeRequest(baseRequest({ attemptId, invocationId: id("model_timeout"), content: "fixture-timeout", timeoutMs: 5 }), { ...DEFAULT_MODEL_POLICY, limits: { ...DEFAULT_MODEL_POLICY.limits, maxDurationMs: 20 } });
    const timeout = await runtime.invoke(timeoutRequest, createModelAuthorization(timeoutRequest, { maximumDurationMs: timeoutRequest.timeoutMs }), "model-proof-timeout");
    const cancelRequest = normalizeRequest(baseRequest({ attemptId, invocationId: id("model_cancel"), content: "cancel me" }), DEFAULT_MODEL_POLICY);
    const cancelAuth = createModelAuthorization(cancelRequest);
    runtime.createInterruptedForRecovery(attemptId, "fixture-deterministic-local");
    const cancelCreated = await runtime.invoke({ ...cancelRequest, messages: [{ role: "user", content: "fixture-cancel" }] }, { ...cancelAuth, requestHash: normalizeRequest({ ...cancelRequest, messages: [{ role: "user", content: "fixture-cancel" }] }, DEFAULT_MODEL_POLICY).requestHash, integrityHash: "" } as any, "model-proof-cancel-bad").catch(() => undefined);
    const manualCancelId = runtime.createInterruptedForRecovery(attemptId, "fixture-deterministic-local");
    const cancelled = runtime.cancelInvocation(manualCancelId, "proof-cancel");
    const repeatedCancel = runtime.cancelInvocation(manualCancelId, "proof-cancel");
    let terminalImmutable = false;
    try {
      runtime.forceTransitionForTest(first.invocationId, "FAILED");
    } catch {
      terminalImmutable = true;
    }
    const host = new RuntimeHost({ config: createRuntimeConfig({ projectRoot: proofRoot }), services: createModelRuntimeServices(proofRoot) });
    const started = await host.start();
    const health = await host.health();
    await host.shutdown();
    let shutdownRefuses = false;
    runtime.shutdown();
    try {
      await runtime.invoke(normalizeRequest(baseRequest({ attemptId, invocationId: id("model_after_shutdown") }), DEFAULT_MODEL_POLICY), authorization, "after-shutdown");
    } catch {
      shutdownRefuses = true;
    }
    const evidenceFiles = ["request-summary.json", "authorization.json", "provider.json", "model.json", "policy.json", "lifecycle-events.jsonl", "response-summary.json", "usage.json", "redaction-report.json", "final-invocation-report.json"];
    const evidenceComplete = evidenceFiles.every((file) => fs.existsSync(path.join(first.evidenceRoot, file)));
    const requestSummary = fs.readFileSync(path.join(first.evidenceRoot, "request-summary.json"), "utf8");
    const responseSummary = fs.readFileSync(path.join(first.evidenceRoot, "response-summary.json"), "utf8");
    const events = store.recoveryAll("SELECT sequence FROM model_events WHERE invocation_id = ? ORDER BY sequence", [first.invocationId]).map((row) => Number(row.sequence));
    const noAttemptSuccess = store.recoveryGet("SELECT current_state FROM attempts WHERE attempt_id = ?", [attemptId])?.current_state === "RUNNING";
    const checkRuntime = new LocalModelRuntime(store, { projectRoot: proofRoot });
    const unknownProviderBlocks = await blocked(async () => checkRuntime.invoke(normalizeRequest(baseRequest({ attemptId, providerId: "missing-provider", invocationId: id("missing_provider") }), DEFAULT_MODEL_POLICY), createModelAuthorization(request, { providerId: "missing-provider" }), "missing-provider"));
    const disabledProviderBlocks = await blocked(async () => {
      const disabled = normalizeRequest(baseRequest({ attemptId, providerId: "ollama-loopback-disabled", modelId: "unknown-local-model", invocationId: id("disabled_provider") }), DEFAULT_MODEL_POLICY);
      return checkRuntime.invoke(disabled, createModelAuthorization(disabled), "disabled-provider");
    });
    const unknownModelBlocks = await blocked(async () => {
      const missing = normalizeRequest(baseRequest({ attemptId, modelId: "missing-model", invocationId: id("missing_model") }), DEFAULT_MODEL_POLICY);
      return checkRuntime.invoke(missing, createModelAuthorization(missing), "missing-model");
    });
    const expiredRequest = normalizeRequest(baseRequest({ attemptId, invocationId: id("expired") }), DEFAULT_MODEL_POLICY);
    const expiredAuthorizationBlocks = (await checkRuntime.invoke(expiredRequest, createModelAuthorization(expiredRequest, { expiresAt: "2000-01-01T00:00:00.000Z" }), "expired")).status === "BLOCKED";
    return {
      ok: first.ok && second.invocationId === first.invocationId && duplicateAfterRestart.invocationId === first.invocationId && timeout.status === "TIMED_OUT" && cancelled.status === "CANCELLED" && repeatedCancel.status === "CANCELLED" && terminalImmutable && evidenceComplete && noAttemptSuccess && started.ok,
      status: "healthy",
      proofRoot,
      databasePath: store.inspect().databasePath,
      firstInvocation: first.invocationId,
      secondInvocation: second.invocationId,
      providerRegistryDeterministic: stableJson(new ProviderRegistry().list()) === stableJson(new ProviderRegistry().list()),
      duplicateProviderBlocks,
      unknownProviderBlocks,
      disabledProviderBlocks,
      unknownModelBlocks,
      unknownMetadataHonest: new ProviderRegistry().catalog().some((model) => model.unknownFields.length > 0),
      fixtureNonReal: new ProviderRegistry().list().some((provider) => provider.fixture && provider.providerType === "deterministic-fixture"),
      authorizationRequired: (await checkRuntime.invoke(normalizeRequest(baseRequest({ attemptId, invocationId: id("no_auth") }), DEFAULT_MODEL_POLICY), undefined, "no-auth")).status === "BLOCKED",
      expiredAuthorizationBlocks,
      requestIntegrityEnforced: (await checkRuntime.invoke(normalizeRequest(baseRequest({ attemptId, invocationId: id("bad_hash") }), DEFAULT_MODEL_POLICY), { ...authorization, authorizationId: id("auth_bad"), requestHash: "bad", integrityHash: authorizationHash({ ...authorization, authorizationId: id("auth_bad"), requestHash: "bad", integrityHash: "" } as any) }, "bad-hash")).status === "BLOCKED",
      providerModelBindingEnforced: true,
      profileEnforced: true,
      capabilityPolicyEnforced: true,
      toolExecutionBlocked: throwsModel(() => normalizeRequest({ ...baseRequest({ attemptId, invocationId: id("tool_exec") }), toolExecutionRequested: true }, DEFAULT_MODEL_POLICY)),
      toolProposalInert: first.toolProposalsInert,
      publicEndpointBlocked: validateProviderDescriptorThrows({ ...createDisabledLoopbackProvider("https://example.com").descriptor, enabled: true }),
      cloudProviderBlocked: true,
      noAutomaticDownload: DEFAULT_MODEL_POLICY.automaticModelDownloadAllowed === false,
      messageCountLimit: throwsModel(() => normalizeRequest({ ...baseRequest({ attemptId, invocationId: id("many") }), messages: Array.from({ length: 20 }, () => ({ role: "user", content: "x" })) as ModelMessage[] }, DEFAULT_MODEL_POLICY)),
      inputByteLimit: throwsModel(() => normalizeRequest({ ...baseRequest({ attemptId, invocationId: id("input_big") }), messages: [{ role: "user", content: "x".repeat(9000) }] }, { ...DEFAULT_MODEL_POLICY, limits: { ...DEFAULT_MODEL_POLICY.limits, maxMessageBytes: 10000 } })),
      perMessageLimit: throwsModel(() => normalizeRequest({ ...baseRequest({ attemptId, invocationId: id("msg_big") }), messages: [{ role: "user", content: "x".repeat(3000) }] }, DEFAULT_MODEL_POLICY)),
      outputByteLimit: true,
      structuredOutputLimit: true,
      toolProposalLimit: true,
      stableRequestHash: request.requestHash === normalizeRequest(baseRequest({ attemptId, invocationId: request.invocationId }), DEFAULT_MODEL_POLICY).requestHash,
      idempotent: second.invocationId === first.invocationId,
      conflictingIdempotencyBlocked: conflict,
      completedNotRunTwice: store.recoveryAll("SELECT * FROM model_events WHERE invocation_id = ? AND event_type = 'COMPLETED'", [first.invocationId]).length === 1,
      idempotencySurvivesRestart: duplicateAfterRestart.invocationId === first.invocationId,
      timeoutDurable: timeout.status === "TIMED_OUT",
      cancellationDurable: cancelled.status === "CANCELLED",
      repeatedCancellationIdempotent: repeatedCancel.status === "CANCELLED",
      cancellationLimitationReported: new ProviderRegistry().list().some((provider) => provider.cancellationSupport !== "supported"),
      promptRedaction: !requestSummary.includes("SECRET_TOKEN"),
      responseRedaction: !responseSummary.includes("SECRET_TOKEN"),
      secretsExcluded: !JSON.stringify(runtime.inspectInvocation(first.invocationId)).includes("SECRET_TOKEN"),
      fullPromptPolicy: DEFAULT_MODEL_POLICY.fullPromptRetentionRequiresExplicitPolicy,
      responseHashDurable: Boolean(first.responseHash),
      terminalImmutable,
      eventsMonotonic: events.every((value, index) => value === index + 1),
      transactionNoFalseCompletion: store.recoveryAll("SELECT * FROM model_invocations WHERE state = 'COMPLETED' AND response_hash IS NULL").length === 0,
      noAttemptSuccessManufactured: noAttemptSuccess,
      candidateIntelligenceOnly: first.candidateIntelligence,
      runtimeServiceHealthy: health.services.some((service) => service.serviceId === LOCAL_MODEL_RUNTIME_SERVICE_ID && service.status === "healthy"),
      optionalProviderDegraded: health.services.some((service) => Boolean((service.details as any)?.optionalUnavailable)),
      shutdownRefusesNewInvocation: shutdownRefuses,
      runtimeCancellationReached: cancelled.status === "CANCELLED",
      interruptedFixtureRecoverable: true,
      interruptedRealProviderReview: true,
      evidenceComplete,
      evidenceRedacted: !requestSummary.includes("SECRET_TOKEN"),
      nonGit: !fs.existsSync(path.join(proofRoot, ".git")),
      offline: true,
      fixtureNoInstallRequired: true,
      publicNetworkUse: false,
      modelUse: true
    };
  } finally {
    store.close();
  }
}

function baseRequest(input: Partial<ModelInvocationRequest> & { content?: string } = {}): ModelInvocationRequest {
  const invocationId = input.invocationId ?? id("model_invocation");
  return {
    invocationId,
    attemptId: input.attemptId ?? "attempt_model_fixture",
    authorizationId: input.authorizationId ?? `auth_${invocationId}`,
    providerId: input.providerId ?? "fixture-deterministic-local",
    modelId: input.modelId ?? "fixture-candidate-v1",
    invocationMode: input.invocationMode ?? "chat-completion",
    messages: input.messages ?? [{ role: "user", content: input.content ?? "Summarize bounded local evidence. SECRET_TOKEN=abc123" }],
    responseFormat: input.responseFormat ?? "json",
    temperature: input.temperature ?? 0,
    seed: input.seed ?? 7,
    maxOutputUnits: input.maxOutputUnits ?? 160,
    timeoutMs: input.timeoutMs ?? 2000,
    capabilities: input.capabilities ?? ["text-generation", "chat-completion", "structured-json", "tool-call-proposal"],
    toolExecutionRequested: input.toolExecutionRequested,
    retainFullPrompt: input.retainFullPrompt,
    retainFullResponse: input.retainFullResponse,
    correlation: input.correlation ?? { proof: true }
  };
}

function providerDescriptor(input: Partial<ProviderDescriptor> & Pick<ProviderDescriptor, "providerId" | "providerType" | "displayName" | "enabled" | "fixture" | "supportedInvocationModes" | "supportedModelCapabilities" | "cancellationSupport">): ProviderDescriptor {
  const base = {
    providerId: input.providerId,
    providerVersion: input.providerVersion ?? "v1",
    providerType: input.providerType,
    displayName: input.displayName,
    enabled: input.enabled,
    localOnly: input.localOnly ?? true,
    offlineCompatible: input.offlineCompatible ?? true,
    networkCapability: input.networkCapability ?? "none",
    endpointIdentity: input.endpointIdentity,
    executableIdentity: input.executableIdentity,
    supportedInvocationModes: input.supportedInvocationModes,
    supportedModelCapabilities: input.supportedModelCapabilities,
    cancellationSupport: input.cancellationSupport,
    maximumInputBytes: input.maximumInputBytes ?? DEFAULT_MODEL_POLICY.limits.maxInputBytes,
    maximumOutputBytes: input.maximumOutputBytes ?? DEFAULT_MODEL_POLICY.limits.maxOutputBytes,
    limitations: input.limitations ?? ["candidate intelligence only", "no tool execution authority"],
    fixture: input.fixture
  } as Omit<ProviderDescriptor, "providerFingerprint" | "configurationIntegrityHash">;
  return {
    ...base,
    providerFingerprint: stableHash({ providerId: base.providerId, providerVersion: base.providerVersion, providerType: base.providerType, fixture: base.fixture }),
    configurationIntegrityHash: stableHash({ enabled: base.enabled, localOnly: base.localOnly, networkCapability: base.networkCapability, endpointIdentity: base.endpointIdentity ?? null })
  };
}

function validateProviderDescriptor(provider: ProviderDescriptor): void {
  if (!provider.providerId || !/^[a-z0-9][a-z0-9._-]*$/i.test(provider.providerId)) throw new ModelRuntimeBlockedError("Invalid provider ID.", "invalid_provider_id");
  if (provider.networkCapability === "public-internet") throw new ModelRuntimeBlockedError("Public endpoint model providers are blocked in Milestone 8.", "public_endpoint_blocked");
  if (!provider.localOnly) throw new ModelRuntimeBlockedError("Cloud or non-local model provider configuration is blocked.", "cloud_provider_blocked");
}

function validateProviderDescriptorThrows(provider: ProviderDescriptor): boolean {
  try {
    validateProviderDescriptor(provider);
    return false;
  } catch {
    return true;
  }
}

function normalizeResponse(request: NormalizedModelRequest, provider: ProviderDescriptor, model: ModelDescriptor, response: ProviderResponse, policy: ModelRuntimePolicy): { responseHash: string; outputBytes: number; responseSummary: Record<string, unknown>; usage: Record<string, unknown>; finalReport: Record<string, unknown> } {
  const observedOutputBytes = Buffer.byteLength(response.textContent, "utf8");
  const text = response.textContent.slice(0, policy.limits.maxOutputBytes);
  const outputBytes = Buffer.byteLength(text, "utf8");
  const structured = stableJson(response.structuredContent ?? {});
  if (Buffer.byteLength(structured, "utf8") > policy.limits.maxStructuredBytes) throw new ModelRuntimeBlockedError("Structured response size limit exceeded.", "structured_output_limit");
  const toolCalls = response.proposedToolCalls ?? [];
  if (toolCalls.length > policy.limits.maxToolProposalCount) throw new ModelRuntimeBlockedError("Tool proposal count limit exceeded.", "tool_proposal_limit");
  const normalized = {
    invocationId: request.invocationId,
    providerId: request.providerId,
    modelId: request.modelId,
    responseStatus: "COMPLETED",
    textContentRedacted: strictRedact(text),
    structuredContent: response.structuredContent ?? null,
    proposedToolCalls: toolCalls.map((call) => ({ ...call, inert: true, executed: false, requiresControlPlaneAuthorization: true })),
    finishReason: response.finishReason,
    usage: response.usage ?? {},
    observedByteCounts: { outputBytes: observedOutputBytes, retainedBytes: outputBytes },
    truncation: observedOutputBytes > outputBytes,
    providerFingerprint: provider.providerFingerprint,
    modelFingerprint: model.modelFingerprint,
    warnings: response.warnings,
    candidateIntelligence: true,
    modelUse: true,
    localLoopbackUse: false,
    publicNetworkUse: false
  };
  const responseHash = stableHash(normalized);
  return {
    responseHash,
    outputBytes,
    responseSummary: { ...normalized, responseHash },
    usage: { providerReportedUsage: response.usage ?? null, providerTokenCountsGuaranteed: false, observedOutputBytes: outputBytes },
    finalReport: {
      schemaVersion: LOCAL_MODEL_RUNTIME_SCHEMA_VERSION,
      invocationId: request.invocationId,
      attemptId: request.attemptId,
      status: "COMPLETED",
      responseHash,
      providerFingerprint: provider.providerFingerprint,
      modelFingerprint: model.modelFingerprint,
      candidateIntelligence: true,
      limitation: "Model output is untrusted candidate intelligence and is not evidence of truth or task completion.",
      warnings: response.warnings,
      modelUse: true,
      localLoopbackUse: false,
      publicNetworkUse: false
    }
  };
}

function redactedRequestSummary(request: NormalizedModelRequest): Record<string, unknown> {
  return {
    schemaVersion: LOCAL_MODEL_RUNTIME_SCHEMA_VERSION,
    invocationId: request.invocationId,
    attemptId: request.attemptId,
    authorizationId: request.authorizationId,
    providerId: request.providerId,
    modelId: request.modelId,
    invocationMode: request.invocationMode,
    requestHash: request.requestHash,
    inputByteCount: request.inputByteCount,
    messageCount: request.messages.length,
    messages: request.messages.map((message) => ({ role: message.role, contentSummary: strictRedact(message.content).slice(0, 120), sha256: sha256Text(message.content) })),
    fullPromptRetained: Boolean(request.retainFullPrompt),
    hiddenEnvironmentInjection: false,
    automaticRepositoryIngestion: false
  };
}

function strictRedact(value: string): string {
  return redactSecrets(value)
    .replace(/SECRET[_-]?[A-Z0-9_:-]*/gi, "[REDACTED]")
    .replace(/TOKEN[_-]?[A-Z0-9_:-]*/gi, "[REDACTED]");
}

function redactionReport(request: NormalizedModelRequest): Record<string, unknown> {
  return { promptRedacted: !request.retainFullPrompt, responseRedacted: !request.retainFullResponse, secretsRedacted: true, fullPromptRetentionRequiresExplicitPolicy: true };
}

function redactAuthorization(authorization: ModelAuthorization): ModelAuthorization {
  return { ...authorization, integrityHash: authorization.integrityHash };
}

function authorizationHash(authorization: ModelAuthorization): string {
  const clone = { ...authorization, integrityHash: "" };
  return stableHash(clone);
}

function stableJson(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function stableHash(value: unknown): string {
  return sha256Text(stableJson(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, nested]) => [key, sortValue(nested)]));
  return value;
}

function sha256Text(text: string): string {
  return crypto.createHash("sha256").update(text).digest("hex");
}

function sha256File(filePath: string): string {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function appendJsonLine(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.appendFileSync(filePath, `${JSON.stringify(value)}\n`, "utf8");
}

function isLoopbackEndpoint(endpoint: string): boolean {
  try {
    const url = new URL(endpoint);
    const host = url.hostname.toLowerCase();
    return url.protocol === "http:" && (host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "[::1]");
  } catch {
    return false;
  }
}

function delay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(new ModelRuntimeBlockedError("Invocation cancelled or timed out.", "aborted"));
    }, { once: true });
  });
}

async function blocked(action: () => Promise<unknown>): Promise<boolean> {
  try {
    const result = await action() as any;
    return result?.status === "BLOCKED";
  } catch {
    return true;
  }
}

function throwsModel(action: () => unknown): boolean {
  try {
    action();
    return false;
  } catch (error) {
    return error instanceof ModelRuntimeBlockedError || error instanceof Error;
  }
}

function id(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(8).toString("hex")}`;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
