import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { RuntimeHost, createRuntimeConfig } from "@sera/runtime-host";
import {
  DEFAULT_MODEL_POLICY,
  LocalModelRuntime,
  ModelRuntimeBlockedError,
  ProviderRegistry,
  createDeterministicFixtureProvider,
  createDisabledLoopbackProvider,
  createModelAuthorization,
  createModelRuntimeServices,
  normalizeRequest,
  runLocalModelRuntimeProof,
  type ModelRuntimeProvider,
  type ProviderResponse
} from "@sera/model-runtime";
import { openRuntimeState } from "@sera/runtime-state";

let sequence = 0;

describe("Local Model Runtime v1", () => {
  let firstProof: Awaited<ReturnType<typeof runLocalModelRuntimeProof>>;
  let secondProof: Awaited<ReturnType<typeof runLocalModelRuntimeProof>>;

  beforeAll(async () => {
    firstProof = await runLocalModelRuntimeProof();
    secondProof = await runLocalModelRuntimeProof();
  }, 30_000);

  it("provider IDs are unique", () => {
    const ids = new ProviderRegistry().list().map((provider) => provider.providerId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("duplicate provider registration blocks", () => {
    expect(() => new ProviderRegistry([createDeterministicFixtureProvider(), createDeterministicFixtureProvider()])).toThrow(ModelRuntimeBlockedError);
  });

  it("unknown provider blocks", async () => {
    const result = await invokeBlocked({ providerId: "missing-provider" });
    expect(result.status).toBe("BLOCKED");
    expect(blockReason(result)).toContain("Unknown provider");
  });

  it("disabled provider blocks", async () => {
    const result = await invokeBlocked({ providerId: "ollama-loopback-disabled", modelId: "unknown-local-model" });
    expect(result.status).toBe("BLOCKED");
    expect(blockReason(result)).toContain("Provider is disabled");
  });

  it("unknown model blocks", async () => {
    const result = await invokeBlocked({ modelId: "missing-model" });
    expect(result.status).toBe("BLOCKED");
    expect(blockReason(result)).toContain("Unknown model");
  });

  it("provider ordering is deterministic", () => {
    const a = new ProviderRegistry().list().map((provider) => provider.providerId);
    const b = new ProviderRegistry().list().map((provider) => provider.providerId);
    expect(a).toEqual([...a].sort());
    expect(a).toEqual(b);
  });

  it("unknown model metadata remains explicitly unknown", () => {
    const unknown = new ProviderRegistry().catalog().find((model) => model.modelId === "unknown-local-model");
    expect(unknown?.availability).toBe("unknown");
    expect(unknown?.unknownFields).toEqual(["modelVersion", "contextLimit", "outputLimit", "localStorageReference"]);
  });

  it("deterministic fixture identifies itself as a fixture and not a real model", () => {
    const fixture = new ProviderRegistry().list().find((provider) => provider.providerId === "fixture-deterministic-local");
    expect(fixture?.fixture).toBe(true);
    expect(fixture?.providerType).toBe("deterministic-fixture");
  });

  it("invocation authorization is required", async () => {
    const result = await invokeBlocked({}, { omitAuthorization: true });
    expect(result.status).toBe("BLOCKED");
    expect(blockReason(result)).toContain("authorization is required");
  });

  it("expired authorization blocks", async () => {
    const result = await invokeBlocked({}, { authorization: { expiresAt: "2000-01-01T00:00:00.000Z" } });
    expect(result.status).toBe("BLOCKED");
    expect(blockReason(result)).toContain("expired");
  });

  it("request-hash mismatch blocks", async () => {
    const result = await invokeBlocked({}, { authorization: { requestHash: "wrong-hash" } });
    expect(result.status).toBe("BLOCKED");
    expect(blockReason(result)).toContain("request hash mismatch");
  });

  it("provider mismatch blocks", async () => {
    const result = await invokeBlocked({}, { authorization: { providerId: "other-provider" } });
    expect(result.status).toBe("BLOCKED");
    expect(blockReason(result)).toContain("provider mismatch");
  });

  it("model mismatch blocks", async () => {
    const result = await invokeBlocked({}, { authorization: { modelId: "other-model" } });
    expect(result.status).toBe("BLOCKED");
    expect(blockReason(result)).toContain("model mismatch");
  });

  it("invocation-profile mismatch blocks", async () => {
    const result = await invokeBlocked({}, { authorization: { invocationProfile: "other-profile" as any } });
    expect(result.status).toBe("BLOCKED");
    expect(blockReason(result)).toContain("Invocation profile mismatch");
  });

  it("unsupported policy version blocks", async () => {
    const result = await invokeBlocked({}, { authorization: { policyVersion: "future-policy" as any } });
    expect(result.status).toBe("BLOCKED");
    expect(blockReason(result)).toContain("Unsupported model policy version");
  });

  it("unauthorized capability blocks", async () => {
    const result = await invokeBlocked({}, { authorization: { allowedCapabilities: ["text-generation"] } });
    expect(result.status).toBe("BLOCKED");
    expect(blockReason(result)).toContain("not authorized");
  });

  it("direct tool execution request blocks", () => {
    expect(() => normalizeRequest(request("attempt_tool", "invocation_tool", { toolExecutionRequested: true }))).toThrow(ModelRuntimeBlockedError);
  });

  it("tool-call proposals remain inert structured data", async () => {
    const run = await invokeCompleted({ capabilities: ["text-generation", "chat-completion", "structured-json", "tool-call-proposal"] });
    try {
      const response = readJson(path.join(run.result.evidenceRoot, "response-summary.json"));
      expect(response.proposedToolCalls[0].inert).toBe(true);
      expect(response.proposedToolCalls[0].executed).toBe(false);
      expect(response.proposedToolCalls[0].requiresControlPlaneAuthorization).toBe(true);
    } finally {
      run.close();
    }
  });

  it("public endpoint configuration blocks", () => {
    expect(() => new ProviderRegistry([createDisabledLoopbackProvider("https://example.com")])).toThrow(ModelRuntimeBlockedError);
  });

  it("cloud-provider configuration blocks", () => {
    expect(() => new ProviderRegistry([providerWithDescriptor({ providerId: "cloud-provider", localOnly: false })])).toThrow(ModelRuntimeBlockedError);
  });

  it("automatic model download never occurs", () => {
    expect(DEFAULT_MODEL_POLICY.automaticModelDownloadAllowed).toBe(false);
  });

  it("message-count limit is enforced", () => {
    const messages = Array.from({ length: DEFAULT_MODEL_POLICY.limits.maxMessages + 1 }, (_, index) => ({ role: "user" as const, content: `message ${index}` }));
    expect(() => normalizeRequest(request("attempt_messages", "invocation_messages", { messages }))).toThrow(ModelRuntimeBlockedError);
  });

  it("total input-byte limit is enforced", () => {
    const smallPolicy = { ...DEFAULT_MODEL_POLICY, limits: { ...DEFAULT_MODEL_POLICY.limits, maxInputBytes: 64 } };
    expect(() => normalizeRequest(request("attempt_input", "invocation_input", { content: "x".repeat(256) }), smallPolicy)).toThrow(ModelRuntimeBlockedError);
  });

  it("per-message byte limit is enforced", () => {
    const smallPolicy = { ...DEFAULT_MODEL_POLICY, limits: { ...DEFAULT_MODEL_POLICY.limits, maxMessageBytes: 8 } };
    expect(() => normalizeRequest(request("attempt_message", "invocation_message", { content: "x".repeat(32) }), smallPolicy)).toThrow(ModelRuntimeBlockedError);
  });

  it("output-byte limit is enforced by retention truncation", async () => {
    const provider = respondingProvider("output-limit-provider", { textContent: "x".repeat(DEFAULT_MODEL_POLICY.limits.maxOutputBytes + 200) });
    const run = await invokeWithRegistry(new ProviderRegistry([provider]), { providerId: "output-limit-provider" });
    try {
      const response = readJson(path.join(run.result.evidenceRoot, "response-summary.json"));
      expect(response.observedByteCounts.retainedBytes).toBeLessThanOrEqual(DEFAULT_MODEL_POLICY.limits.maxOutputBytes);
      expect(response.observedByteCounts.outputBytes).toBeGreaterThanOrEqual(response.observedByteCounts.retainedBytes);
    } finally {
      run.close();
    }
  });

  it("structured-output-size limit is enforced", async () => {
    const provider = respondingProvider("large-structured", { structuredContent: { data: "x".repeat(DEFAULT_MODEL_POLICY.limits.maxStructuredBytes + 100) } });
    const result = await invokeWithRegistry(new ProviderRegistry([provider]), { providerId: "large-structured", modelId: "fixture-candidate-v1" });
    try {
      expect(result.result.status).toBe("FAILED");
      expect(blockReason(result)).toContain("Structured response size limit exceeded");
    } finally {
      result.close();
    }
  });

  it("tool-proposal-count limit is enforced", async () => {
    const proposedToolCalls = Array.from({ length: DEFAULT_MODEL_POLICY.limits.maxToolProposalCount + 1 }, (_, index) => ({ name: `tool_${index}` }));
    const provider = respondingProvider("too-many-tools", { proposedToolCalls });
    const result = await invokeWithRegistry(new ProviderRegistry([provider]), { providerId: "too-many-tools", modelId: "fixture-candidate-v1" });
    try {
      expect(result.result.status).toBe("FAILED");
      expect(blockReason(result)).toContain("Tool proposal count limit exceeded");
    } finally {
      result.close();
    }
  });

  it("request normalization is deterministic", () => {
    const a = normalizeRequest(request("attempt_norm", "invocation_norm", { content: "line\r\nend" }));
    const b = normalizeRequest(request("attempt_norm", "invocation_norm", { content: "line\nend" }));
    expect(a.messages).toEqual(b.messages);
  });

  it("normalized request hashing is stable", () => {
    const a = normalizeRequest(request("attempt_hash", "invocation_hash"));
    const b = normalizeRequest(request("attempt_hash", "invocation_hash"));
    expect(a.requestHash).toBe(b.requestHash);
  });

  it("equivalent idempotent invocation returns the durable existing result", async () => {
    const run = await invokeCompleted();
    try {
      const duplicate = await run.runtime.invoke(run.request, createModelAuthorization(run.request), run.key);
      expect(duplicate.invocationId).toBe(run.result.invocationId);
      expect(duplicate.responseHash).toBe(run.result.responseHash);
    } finally {
      run.close();
    }
  });

  it("conflicting idempotency-key reuse blocks", async () => {
    const run = await invokeCompleted();
    try {
      const changed = normalizeRequest(request(run.attemptId, nextId("conflict")));
      await expect(run.runtime.invoke(changed, createModelAuthorization(changed), run.key)).rejects.toThrow(ModelRuntimeBlockedError);
    } finally {
      run.close();
    }
  });

  it("completed invocation is not executed twice", async () => {
    let calls = 0;
    const provider = respondingProvider("counting-provider", {}, () => { calls += 1; });
    const run = await invokeWithRegistry(new ProviderRegistry([provider]), { providerId: "counting-provider" });
    try {
      await run.runtime.invoke(run.request, createModelAuthorization(run.request), run.key);
      expect(calls).toBe(1);
    } finally {
      run.close();
    }
  });

  it("idempotency survives database restart", async () => {
    const run = await invokeCompleted();
    const root = run.root;
    const requestSnapshot = run.request;
    const key = run.key;
    const invocationId = run.result.invocationId;
    run.close();
    const reopened = openRuntimeState({ projectRoot: root });
    try {
      const runtime = new LocalModelRuntime(reopened, { projectRoot: root });
      const duplicate = await runtime.invoke(requestSnapshot, createModelAuthorization(requestSnapshot), key);
      expect(duplicate.invocationId).toBe(invocationId);
    } finally {
      reopened.close();
    }
  });

  it("timeout produces durable TIMED_OUT", async () => {
    const run = await invokeWithRegistry(new ProviderRegistry(), { content: "fixture-timeout", timeoutMs: 10 }, undefined, "timeout");
    try {
      expect(run.result.status).toBe("TIMED_OUT");
      expect(run.row().state).toBe("TIMED_OUT");
    } finally {
      run.close();
    }
  });

  it("cancellation produces durable CANCELLED", () => {
    const harness = createHarness();
    try {
      const invocationId = harness.runtime.createInterruptedForRecovery(harness.attemptId, "fixture-deterministic-local");
      const cancelled = harness.runtime.cancelInvocation(invocationId, "focused-cancel");
      expect(cancelled.status).toBe("CANCELLED");
      expect(harness.store.recoveryGet("SELECT state FROM model_invocations WHERE invocation_id = ?", [invocationId])?.state).toBe("CANCELLED");
    } finally {
      harness.close();
    }
  });

  it("repeated cancellation is idempotent", () => {
    const harness = createHarness();
    try {
      const invocationId = harness.runtime.createInterruptedForRecovery(harness.attemptId, "fixture-deterministic-local");
      const first = harness.runtime.cancelInvocation(invocationId, "focused-cancel");
      const second = harness.runtime.cancelInvocation(invocationId, "focused-cancel-again");
      expect(second.invocationId).toBe(first.invocationId);
      expect(second.status).toBe("CANCELLED");
    } finally {
      harness.close();
    }
  });

  it("unsupported provider cancellation is reported honestly", () => {
    const provider = new ProviderRegistry().list().find((entry) => entry.providerId === "ollama-loopback-disabled");
    expect(provider?.cancellationSupport).toBe("unsupported");
  });

  it("prompts are redacted from default evidence", async () => {
    const run = await invokeCompleted({ content: "SECRET_TOKEN=hidden" });
    try {
      const summary = readJson(path.join(run.result.evidenceRoot, "request-summary.json"));
      expect(JSON.stringify(summary.messages)).not.toContain("SECRET_TOKEN");
      expect(JSON.stringify(summary.messages)).not.toContain("=hidden");
    } finally {
      run.close();
    }
  });

  it("responses follow configured redaction policy", async () => {
    const run = await invokeCompleted({ content: "SECRET_TOKEN=hidden" });
    try {
      const response = fs.readFileSync(path.join(run.result.evidenceRoot, "response-summary.json"), "utf8");
      expect(response).not.toContain("SECRET_TOKEN");
      expect(response).not.toContain("hidden");
    } finally {
      run.close();
    }
  });

  it("known secrets are excluded from inspection output", async () => {
    const run = await invokeCompleted({ content: "SECRET_TOKEN=hidden" });
    try {
      const inspected = JSON.stringify(run.runtime.inspectInvocation(run.result.invocationId));
      expect(inspected).not.toContain("SECRET_TOKEN");
      expect(inspected).not.toContain("hidden");
    } finally {
      run.close();
    }
  });

  it("full prompt retention requires explicit policy", async () => {
    const run = await invokeCompleted();
    try {
      const summary = readJson(path.join(run.result.evidenceRoot, "request-summary.json"));
      const redaction = readJson(path.join(run.result.evidenceRoot, "redaction-report.json"));
      expect(summary.fullPromptRetained).toBe(false);
      expect(redaction.fullPromptRetentionRequiresExplicitPolicy).toBe(true);
    } finally {
      run.close();
    }
  });

  it("response hash is stored durably", async () => {
    const run = await invokeCompleted();
    try {
      expect(run.result.responseHash).toBeTruthy();
      expect(run.row().response_hash).toBe(run.result.responseHash);
    } finally {
      run.close();
    }
  });

  it("terminal invocation state is immutable", async () => {
    const run = await invokeCompleted();
    try {
      expect(() => run.runtime.forceTransitionForTest(run.result.invocationId, "FAILED")).toThrow(ModelRuntimeBlockedError);
    } finally {
      run.close();
    }
  });

  it("model event sequence is monotonic", async () => {
    const run = await invokeCompleted();
    try {
      const events = run.events();
      expect(events.map((event) => Number(event.sequence))).toEqual(events.map((_, index) => index + 1));
    } finally {
      run.close();
    }
  });

  it("transaction failure leaves no false COMPLETED invocation", async () => {
    const provider = respondingProvider("failing-normalization", { structuredContent: { data: "x".repeat(DEFAULT_MODEL_POLICY.limits.maxStructuredBytes + 100) } });
    const run = await invokeWithRegistry(new ProviderRegistry([provider]), { providerId: "failing-normalization" });
    try {
      expect(run.result.status).toBe("FAILED");
      expect(run.row().state).not.toBe("COMPLETED");
    } finally {
      run.close();
    }
  });

  it("model completion does not complete the parent attempt", async () => {
    const run = await invokeCompleted();
    try {
      const attempt = run.store.recoveryGet("SELECT current_state FROM attempts WHERE attempt_id = ?", [run.attemptId]);
      expect(attempt?.current_state).toBe("RUNNING");
      expect(run.result.attemptSuccessManufactured).toBe(false);
    } finally {
      run.close();
    }
  });

  it("model output is explicitly marked candidate intelligence", async () => {
    const run = await invokeCompleted();
    try {
      const final = readJson(path.join(run.result.evidenceRoot, "final-invocation-report.json"));
      expect(run.result.candidateIntelligence).toBe(true);
      expect(final.candidateIntelligence).toBe(true);
    } finally {
      run.close();
    }
  });

  it("Runtime Host service reports healthy", async () => {
    const root = makeRoot("host");
    const host = new RuntimeHost({ config: createRuntimeConfig({ projectRoot: root }), services: createModelRuntimeServices(root) });
    const started = await host.start();
    const health = await host.health();
    await host.shutdown("focused test complete");
    expect(started.ok).toBe(true);
    expect(health.services.some((service) => service.serviceId === "local-model-runtime" && service.status === "healthy")).toBe(true);
  });

  it("optional unavailable provider produces honest degraded availability", () => {
    const provider = new ProviderRegistry().list().find((entry) => entry.providerId === "ollama-loopback-disabled");
    const model = new ProviderRegistry().catalog().find((entry) => entry.providerId === "ollama-loopback-disabled");
    expect(provider?.enabled).toBe(false);
    expect(model?.availability).toBe("unknown");
  });

  it("shutdown refuses new invocations", async () => {
    const harness = createHarness();
    try {
      harness.runtime.shutdown();
      const req = normalizeRequest(request(harness.attemptId, nextId("shutdown")));
      await expect(harness.runtime.invoke(req, createModelAuthorization(req), nextId("key"))).rejects.toThrow(ModelRuntimeBlockedError);
    } finally {
      harness.close();
    }
  });

  it("Runtime cancellation reaches active invocation", () => {
    expect(firstProof.runtimeCancellationReached).toBe(true);
  });

  it("interrupted deterministic fixture invocation is recoverable idempotently", () => {
    expect(firstProof.interruptedFixtureRecoverable).toBe(true);
  });

  it("interrupted real-provider invocation requires review", () => {
    expect(firstProof.interruptedRealProviderReview).toBe(true);
  });

  it("evidence file set is complete", async () => {
    const run = await invokeCompleted();
    try {
      expect(fs.readdirSync(run.result.evidenceRoot).sort()).toEqual([
        "authorization.json",
        "final-invocation-report.json",
        "lifecycle-events.jsonl",
        "model.json",
        "policy.json",
        "provider.json",
        "redaction-report.json",
        "request-summary.json",
        "response-summary.json",
        "usage.json"
      ]);
    } finally {
      run.close();
    }
  });

  it("default evidence excludes unredacted prompts", async () => {
    const run = await invokeCompleted({ content: "do not retain this exact prompt SECRET_TOKEN=hidden" });
    try {
      const allEvidence = fs.readdirSync(run.result.evidenceRoot).map((file) => fs.readFileSync(path.join(run.result.evidenceRoot, file), "utf8")).join("\n");
      expect(allEvidence).not.toContain("do not retain this exact prompt SECRET_TOKEN=hidden");
    } finally {
      run.close();
    }
  });

  it("non-Git operation passes", () => {
    expect(firstProof.nonGit).toBe(true);
  });

  it("offline operation passes", () => {
    expect(firstProof.offline).toBe(true);
  });

  it("deterministic fixture requires no model installation", () => {
    expect(firstProof.fixtureNoInstallRequired).toBe(true);
  });

  it("no public-network use occurs", () => {
    expect(firstProof.publicNetworkUse).toBe(false);
  });

  it("first model proof succeeds", () => {
    expect(firstProof.ok).toBe(true);
  });

  it("second consecutive model proof succeeds independently", () => {
    expect(secondProof.ok).toBe(true);
    expect(secondProof.proofRoot).not.toBe(firstProof.proofRoot);
    expect(secondProof.databasePath).not.toBe(firstProof.databasePath);
  });

  it("normalized proof output is repeatable after approved volatile fields are removed", () => {
    expect(normalizedProof(firstProof)).toEqual(normalizedProof(secondProof));
  });

  it("provider fingerprint is stable and inspectable", () => {
    const a = new ProviderRegistry().list().find((provider) => provider.providerId === "fixture-deterministic-local");
    const b = new ProviderRegistry().list().find((provider) => provider.providerId === "fixture-deterministic-local");
    expect(a?.providerFingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(a?.providerFingerprint).toBe(b?.providerFingerprint);
  });

  it("model fingerprint is stable and inspectable", () => {
    const a = new ProviderRegistry().catalog().find((model) => model.modelId === "fixture-candidate-v1");
    const b = new ProviderRegistry().catalog().find((model) => model.modelId === "fixture-candidate-v1");
    expect(a?.modelFingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(a?.modelFingerprint).toBe(b?.modelFingerprint);
  });

  it("disabled loopback provider is not contacted during startup", () => {
    let invoked = false;
    const disabled = providerWithDescriptor({ providerId: "disabled-no-contact", enabled: false, fixture: false, providerType: "loopback-local-endpoint", networkCapability: "loopback-local" }, async () => {
      invoked = true;
      throw new Error("disabled provider was contacted");
    });
    const harness = createHarness(new ProviderRegistry([createDeterministicFixtureProvider(), disabled]));
    try {
      expect(invoked).toBe(false);
    } finally {
      harness.close();
    }
  });

  it("provider health cannot silently enable a disabled provider", () => {
    const harness = createHarness();
    try {
      const provider = (harness.runtime.providers().providers as any[]).find((entry) => entry.providerId === "ollama-loopback-disabled");
      expect(provider.enabled).toBe(false);
      expect(provider.health.status).toBe("degraded");
    } finally {
      harness.close();
    }
  });

  it("invocation inspection is non-mutating", async () => {
    const run = await invokeCompleted();
    try {
      const before = run.store.inspect().counts;
      run.runtime.inspectInvocation(run.result.invocationId);
      run.runtime.inspectInvocation(run.result.invocationId);
      const after = run.store.inspect().counts;
      expect(after).toEqual(before);
    } finally {
      run.close();
    }
  });

  it("oversized retained response is truncated with observed and retained byte counts", async () => {
    const provider = respondingProvider("long-response", { textContent: "x".repeat(DEFAULT_MODEL_POLICY.limits.maxOutputBytes + 100) });
    const run = await invokeWithRegistry(new ProviderRegistry([provider]), { providerId: "long-response" });
    try {
      const response = readJson(path.join(run.result.evidenceRoot, "response-summary.json"));
      expect(response.truncation).toBe(true);
      expect(response.observedByteCounts.outputBytes).toBeGreaterThan(response.observedByteCounts.retainedBytes);
      expect(response.observedByteCounts.retainedBytes).toBe(DEFAULT_MODEL_POLICY.limits.maxOutputBytes);
    } finally {
      run.close();
    }
  });

  it("authorization expiration timestamp is enforced", async () => {
    const issuedAt = "2026-01-01T00:00:00.000Z";
    const result = await invokeBlocked({}, { authorization: { issuedAt, expiresAt: "2026-01-01T00:00:01.000Z" } });
    expect(result.status).toBe("BLOCKED");
    expect(blockReason(result)).toContain("expired");
  });

  it("unsupported invocation mode blocks", () => {
    expect(() => normalizeRequest(request("attempt_mode", "invocation_mode", { invocationMode: "unsupported-mode" as any }))).toThrow(ModelRuntimeBlockedError);
  });

  it("migration checksums are present and stable for migrations 1 through 5", () => {
    const root = makeRoot("migrations");
    const store = openRuntimeState({ projectRoot: root });
    try {
      const migrations = store.recoveryAll("SELECT version, checksum FROM schema_migrations ORDER BY version") as Array<{ version: number; checksum: string }>;
      expect(migrations.slice(0, 5).map((migration) => migration.version)).toEqual([1, 2, 3, 4, 5]);
      expect(migrations.map((migration) => migration.version)).toContain(6);
      expect(migrations.every((migration) => /^[a-f0-9]{64}$/.test(migration.checksum))).toBe(true);
      expect(store.recoveryAll("SELECT version, checksum FROM schema_migrations ORDER BY version")).toEqual(migrations);
    } finally {
      store.close();
    }
  });
});

function makeRoot(label: string): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), `sera-local-model-runtime-${label}-`));
  fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ name: `model-runtime-${label}`, private: true }), "utf8");
  return root;
}

function nextId(prefix: string): string {
  sequence += 1;
  return `${prefix}_${sequence}`;
}

function createHarness(registry = new ProviderRegistry()) {
  const root = makeRoot("focused");
  const store = openRuntimeState({ projectRoot: root });
  const command = store.acceptCommand({ idempotencyKey: nextId("command"), commandType: "model", payload: {}, capability: "local-model-runtime" });
  const attemptId = command.attemptId!;
  store.transitionAttempt({ attemptId, fromState: "PENDING", toState: "RUNNING", actor: "local-model-runtime-focused-test" });
  const runtime = new LocalModelRuntime(store, { projectRoot: root }, registry);
  return {
    root,
    store,
    runtime,
    attemptId,
    close: () => store.close()
  };
}

async function invokeCompleted(overrides: Record<string, unknown> = {}, authorizationOverrides?: Record<string, unknown>, registry?: ProviderRegistry, keyPrefix = "invoke") {
  const run = await invokeWithRegistry(registry ?? new ProviderRegistry(), overrides, authorizationOverrides, keyPrefix);
  expect(run.result.status).toBe("COMPLETED");
  return run;
}

async function invokeBlocked(overrides: Record<string, unknown> = {}, options: { authorization?: Record<string, unknown>; omitAuthorization?: boolean } = {}) {
  const run = await invokeWithRegistry(new ProviderRegistry(), overrides, options.authorization, "blocked", options.omitAuthorization);
  run.close();
  return run.result;
}

async function invokeWithRegistry(registry: ProviderRegistry, overrides: Record<string, unknown> = {}, authorizationOverrides?: Record<string, unknown>, keyPrefix = "invoke", omitAuthorization = false) {
  const harness = createHarness(registry);
  const invocationId = String(overrides.invocationId ?? nextId("invocation"));
  const req = normalizeRequest(request(harness.attemptId, invocationId, overrides));
  const key = `${keyPrefix}:${invocationId}`;
  const authorization = omitAuthorization ? undefined : createModelAuthorization(req, authorizationOverrides as any);
  const result = await harness.runtime.invoke(req, authorization, key);
  return {
    ...harness,
    request: req,
    key,
    result,
    row: () => harness.store.recoveryGet("SELECT * FROM model_invocations WHERE invocation_id = ?", [result.invocationId])!,
    events: () => harness.store.recoveryAll("SELECT * FROM model_events WHERE invocation_id = ? ORDER BY sequence", [result.invocationId])
  };
}

function request(attemptId: string, invocationId: string, overrides: Record<string, unknown> = {}) {
  return {
    invocationId,
    attemptId,
    authorizationId: `auth_${invocationId}`,
    providerId: "fixture-deterministic-local",
    modelId: "fixture-candidate-v1",
    invocationMode: "chat-completion" as const,
    messages: [{ role: "user" as const, content: "Summarize local evidence. SECRET_TOKEN=hidden" }],
    responseFormat: "json" as const,
    temperature: 0,
    seed: 1,
    maxOutputUnits: 120,
    timeoutMs: DEFAULT_MODEL_POLICY.limits.maxDurationMs,
    capabilities: ["text-generation", "chat-completion", "structured-json", "tool-call-proposal"] as const,
    correlation: { test: true },
    ...overrides,
    messages: overrides.content ? [{ role: "user" as const, content: String(overrides.content) }] : overrides.messages ?? [{ role: "user" as const, content: "Summarize local evidence. SECRET_TOKEN=hidden" }]
  } as any;
}

function providerWithDescriptor(overrides: Record<string, unknown>, invoke?: ModelRuntimeProvider["invoke"]): ModelRuntimeProvider {
  const fixture = createDeterministicFixtureProvider();
  const descriptor = { ...fixture.descriptor, ...overrides } as ModelRuntimeProvider["descriptor"];
  const catalog = fixture.catalog().map((model) => ({ ...model, providerId: descriptor.providerId }));
  return {
    descriptor,
    health: () => ({ status: descriptor.enabled ? "healthy" : "degraded", message: "focused provider", localLoopbackUse: false, publicNetworkUse: false }),
    catalog: () => catalog,
    invoke: invoke ?? fixture.invoke
  };
}

function respondingProvider(providerId: string, response: Partial<ProviderResponse> = {}, beforeInvoke?: () => void): ModelRuntimeProvider {
  return providerWithDescriptor({ providerId }, async () => {
    beforeInvoke?.();
    return {
      status: "completed",
      textContent: "focused candidate intelligence",
      finishReason: "stop",
      warnings: ["focused provider"],
      ...response
    };
  });
}

function blockReason(input: { evidenceRoot: string } | { result: { evidenceRoot: string } }): string {
  const evidenceRoot = "result" in input ? input.result.evidenceRoot : input.evidenceRoot;
  const report = readJson(path.join(evidenceRoot, "final-invocation-report.json"));
  return String(report.reason ?? "");
}

function readJson(filePath: string): any {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function normalizedProof(proof: Awaited<ReturnType<typeof runLocalModelRuntimeProof>>) {
  const clone = { ...proof } as Record<string, unknown>;
  for (const key of ["proofRoot", "databasePath", "firstInvocation", "secondInvocation"]) delete clone[key];
  return clone;
}
