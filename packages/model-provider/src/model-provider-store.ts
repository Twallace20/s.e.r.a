import fs from "node:fs";
import http from "node:http";
import https from "node:https";
import path from "node:path";
import { URL } from "node:url";
import { createSeraId, isoNow, redactSecrets } from "@sera/shared";

export type ModelProviderStatus = "completed" | "blocked";
export type ModelProviderKind = "mock" | "local-http" | "external";
export type ModelProviderEventType = "list" | "readiness" | "request" | "response" | "blocked";

export interface ModelProviderRecord {
  id: string;
  label: string;
  kind: ModelProviderKind;
  available: boolean;
  localOnly: boolean;
  networkAllowed: boolean;
  description: string;
}

export interface ModelRequestRecord {
  id: string;
  providerId: string;
  purpose: string;
  promptRedacted: string;
  createdAt: string;
  maxOutputTokens?: number;
}

export interface ModelResponseRecord {
  id: string;
  requestId: string;
  providerId: string;
  output: string;
  createdAt: string;
  finishReason: "completed" | "blocked";
  tokenEstimate: number;
}

export interface ModelProviderEventRecord {
  id: string;
  providerId: string;
  eventType: ModelProviderEventType;
  status: ModelProviderStatus;
  message: string;
  createdAt: string;
  requestId?: string;
}

export interface ModelProviderSummary {
  createdAt: string;
  modelDir: string;
  providerCount: number;
  requestCount: number;
  responseCount: number;
  blockedEventCount: number;
  localProviderCount: number;
  paidProviderRequired: false;
}

export interface ModelProviderListResult {
  ok: true;
  status: "completed";
  modelDir: string;
  providers: ModelProviderRecord[];
}

export interface ModelInvocationInput {
  providerId: string;
  prompt: string;
  purpose?: string;
  maxOutputTokens?: number;
}

export interface LocalModelInvocationInput {
  providerId?: string;
  model?: string;
  prompt: string;
  purpose?: string;
  maxOutputTokens?: number;
}

export interface LocalModelProviderConfig {
  providerId: string;
  enabled: boolean;
  endpoint: string;
  endpointIsLocal: boolean;
  model?: string;
  configured: boolean;
  subscriptionRequired: false;
  paidApiKeyRequired: false;
  reasons: string[];
  source: "local-model-provider-v1";
}

export interface LocalModelProviderReadinessResult {
  ok: boolean;
  status: ModelProviderStatus;
  message: string;
  modelDir: string;
  provider?: ModelProviderRecord;
  config?: LocalModelProviderConfig;
  canInvoke: boolean;
  localOnly: boolean;
  subscriptionRequired: false;
  paidApiKeyRequired: false;
  reportPath?: string;
  eventPath?: string;
  summaryPath?: string;
  source: "local-model-provider-v1";
}

export interface ModelInvocationResult {
  ok: boolean;
  status: ModelProviderStatus;
  message: string;
  modelDir: string;
  provider?: ModelProviderRecord;
  request?: ModelRequestRecord;
  response?: ModelResponseRecord;
  requestPath?: string;
  responsePath?: string;
  eventPath?: string;
  summaryPath?: string;
}

export interface ModelProviderHistoryResult {
  ok: true;
  status: "completed";
  modelDir: string;
  requests?: ModelRequestRecord[];
  responses?: ModelResponseRecord[];
  events?: ModelProviderEventRecord[];
}

export interface ModelProviderSummaryResult {
  ok: true;
  status: "completed";
  modelDir: string;
  summary: ModelProviderSummary;
  summaryPath: string;
}

const DEFAULT_OLLAMA_ENDPOINT = "http://127.0.0.1:11434";

const PROVIDERS: ModelProviderRecord[] = [
  {
    id: "mock-local",
    label: "Mock Local Provider",
    kind: "mock",
    available: true,
    localOnly: true,
    networkAllowed: false,
    description: "Deterministic local mock provider for certification and adapter testing."
  },
  {
    id: "ollama-local",
    label: "Ollama Local Provider",
    kind: "local-http",
    available: false,
    localOnly: true,
    networkAllowed: false,
    description: "Optional local-only Ollama adapter. Disabled by default and never required for certification."
  },
  {
    id: "external-disabled",
    label: "External Provider Adapter Slot",
    kind: "external",
    available: false,
    localOnly: false,
    networkAllowed: false,
    description: "Placeholder for future model adapters. Blocked until explicit provider configuration and safety gates exist."
  }
];

export class ModelProviderStore {
  readonly rootDir: string;
  readonly modelDir: string;

  constructor(rootDir: string) {
    this.rootDir = path.resolve(rootDir);
    this.modelDir = path.join(this.rootDir, ".sera-models");
    fs.mkdirSync(this.modelDir, { recursive: true });
  }

  listProviders(): ModelProviderListResult {
    const eventPath = this.appendEvent({
      providerId: "registry",
      eventType: "list",
      status: "completed",
      message: "Listed registered model providers."
    });
    this.writeSummary();
    void eventPath;
    return { ok: true, status: "completed", modelDir: this.modelDir, providers: this.providers() };
  }

  invoke(input: ModelInvocationInput): ModelInvocationResult {
    const provider = this.providers().find((item) => item.id === input.providerId);
    if (!provider) {
      const eventPath = this.appendEvent({
        providerId: input.providerId,
        eventType: "blocked",
        status: "blocked",
        message: `Model provider not found: ${input.providerId}`
      });
      const summaryPath = this.writeSummary();
      return { ok: false, status: "blocked", message: `Model provider not found: ${input.providerId}`, modelDir: this.modelDir, eventPath, summaryPath };
    }

    if (!provider.available || provider.kind !== "mock") {
      const eventPath = this.appendEvent({
        providerId: provider.id,
        eventType: "blocked",
        status: "blocked",
        message: `Model provider is not enabled: ${provider.id}`
      });
      const summaryPath = this.writeSummary();
      return { ok: false, status: "blocked", message: `Model provider is not enabled: ${provider.id}`, modelDir: this.modelDir, provider, eventPath, summaryPath };
    }

    const trimmedPrompt = input.prompt.trim();
    if (!trimmedPrompt) {
      const eventPath = this.appendEvent({
        providerId: provider.id,
        eventType: "blocked",
        status: "blocked",
        message: "Model prompt is required."
      });
      const summaryPath = this.writeSummary();
      return { ok: false, status: "blocked", message: "Model prompt is required.", modelDir: this.modelDir, provider, eventPath, summaryPath };
    }

    const request: ModelRequestRecord = {
      id: createSeraId("model_request"),
      providerId: provider.id,
      purpose: input.purpose?.trim() || "local-model-adapter-test",
      promptRedacted: redactSecrets(trimmedPrompt),
      createdAt: isoNow(),
      maxOutputTokens: input.maxOutputTokens
    };
    const requestPath = this.appendJsonl("model-requests.jsonl", request);
    const requestEventPath = this.appendEvent({
      providerId: provider.id,
      eventType: "request",
      status: "completed",
      message: "Model request recorded with redacted prompt.",
      requestId: request.id
    });

    const responseText = createMockResponse(request.promptRedacted, input.maxOutputTokens);
    const response: ModelResponseRecord = {
      id: createSeraId("model_response"),
      requestId: request.id,
      providerId: provider.id,
      output: responseText,
      createdAt: isoNow(),
      finishReason: "completed",
      tokenEstimate: estimateTokens(responseText)
    };
    const responsePath = this.appendJsonl("model-responses.jsonl", response);
    const responseEventPath = this.appendEvent({
      providerId: provider.id,
      eventType: "response",
      status: "completed",
      message: "Mock local provider returned deterministic response.",
      requestId: request.id
    });
    const summaryPath = this.writeSummary();

    return {
      ok: true,
      status: "completed",
      message: "Mock local model provider completed deterministic response.",
      modelDir: this.modelDir,
      provider,
      request,
      response,
      requestPath,
      responsePath,
      eventPath: responseEventPath || requestEventPath,
      summaryPath
    };
  }

  getLocalModelProviderReadiness(providerId = "ollama-local", model?: string): LocalModelProviderReadinessResult {
    const provider = this.providers(model).find((item) => item.id === providerId);
    if (!provider || provider.kind !== "local-http") {
      const eventPath = this.appendEvent({
        providerId,
        eventType: "blocked",
        status: "blocked",
        message: `Local model provider not found or not local-only: ${providerId}`
      });
      const summaryPath = this.writeSummary();
      return {
        ok: false,
        status: "blocked",
        message: `Local model provider not found or not local-only: ${providerId}`,
        modelDir: this.modelDir,
        provider,
        canInvoke: false,
        localOnly: false,
        subscriptionRequired: false,
        paidApiKeyRequired: false,
        eventPath,
        summaryPath,
        source: "local-model-provider-v1"
      };
    }

    const config = this.createLocalModelProviderConfig(provider.id, model);
    const message = config.configured
      ? `Local model provider is configured: ${provider.id}`
      : `Local model provider is optional and not configured: ${provider.id}`;
    const eventPath = this.appendEvent({
      providerId: provider.id,
      eventType: "readiness",
      status: "completed",
      message
    });
    const report: LocalModelProviderReadinessResult = {
      ok: true,
      status: "completed",
      message,
      modelDir: this.modelDir,
      provider,
      config,
      canInvoke: config.configured,
      localOnly: true,
      subscriptionRequired: false,
      paidApiKeyRequired: false,
      eventPath,
      source: "local-model-provider-v1"
    };
    const reportPath = this.writeJson("local-model-provider-readiness.json", report);
    const summaryPath = this.writeSummary();
    return { ...report, reportPath, summaryPath };
  }

  async invokeLocalModelProvider(input: LocalModelInvocationInput): Promise<ModelInvocationResult> {
    const providerId = input.providerId ?? "ollama-local";
    const provider = this.providers(input.model).find((item) => item.id === providerId);
    if (!provider || provider.kind !== "local-http") {
      const eventPath = this.appendEvent({ providerId, eventType: "blocked", status: "blocked", message: `Local model provider not found or not local-only: ${providerId}` });
      const summaryPath = this.writeSummary();
      return { ok: false, status: "blocked", message: `Local model provider not found or not local-only: ${providerId}`, modelDir: this.modelDir, provider, eventPath, summaryPath };
    }

    const trimmedPrompt = input.prompt.trim();
    if (!trimmedPrompt) {
      const eventPath = this.appendEvent({ providerId: provider.id, eventType: "blocked", status: "blocked", message: "Local model prompt is required." });
      const summaryPath = this.writeSummary();
      return { ok: false, status: "blocked", message: "Local model prompt is required.", modelDir: this.modelDir, provider, eventPath, summaryPath };
    }

    const config = this.createLocalModelProviderConfig(provider.id, input.model);
    if (!config.configured || !config.model) {
      const eventPath = this.appendEvent({
        providerId: provider.id,
        eventType: "blocked",
        status: "blocked",
        message: `Local model provider is disabled or incomplete: ${config.reasons.join(" ")}`.trim()
      });
      const summaryPath = this.writeSummary();
      return {
        ok: false,
        status: "blocked",
        message: `Local model provider is disabled or incomplete: ${config.reasons.join(" ")}`.trim(),
        modelDir: this.modelDir,
        provider,
        eventPath,
        summaryPath
      };
    }

    const request: ModelRequestRecord = {
      id: createSeraId("model_request"),
      providerId: provider.id,
      purpose: input.purpose?.trim() || "local-ollama-invocation",
      promptRedacted: redactSecrets(trimmedPrompt),
      createdAt: isoNow(),
      maxOutputTokens: input.maxOutputTokens
    };
    const requestPath = this.appendJsonl("model-requests.jsonl", request);
    const requestEventPath = this.appendEvent({ providerId: provider.id, eventType: "request", status: "completed", message: "Local Ollama request recorded with redacted prompt.", requestId: request.id });

    try {
      const responseJson = await postJsonToLocalEndpoint(`${config.endpoint}/api/chat`, {
        model: config.model,
        messages: [{ role: "user", content: trimmedPrompt }],
        stream: false
      });
      const output = extractLocalModelOutput(responseJson);
      const response: ModelResponseRecord = {
        id: createSeraId("model_response"),
        requestId: request.id,
        providerId: provider.id,
        output: redactSecrets(output),
        createdAt: isoNow(),
        finishReason: "completed",
        tokenEstimate: estimateTokens(output)
      };
      const responsePath = this.appendJsonl("model-responses.jsonl", response);
      const responseEventPath = this.appendEvent({ providerId: provider.id, eventType: "response", status: "completed", message: "Local Ollama provider returned a response.", requestId: request.id });
      const summaryPath = this.writeSummary();
      return { ok: true, status: "completed", message: "Local Ollama model provider completed response.", modelDir: this.modelDir, provider, request, response, requestPath, responsePath, eventPath: responseEventPath || requestEventPath, summaryPath };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const eventPath = this.appendEvent({ providerId: provider.id, eventType: "blocked", status: "blocked", message: `Local Ollama invocation failed: ${message}`, requestId: request.id });
      const summaryPath = this.writeSummary();
      return { ok: false, status: "blocked", message: `Local Ollama invocation failed: ${message}`, modelDir: this.modelDir, provider, request, requestPath, eventPath, summaryPath };
    }
  }

  listRequests(): ModelRequestRecord[] {
    return readJsonl<ModelRequestRecord>(this.path("model-requests.jsonl"));
  }

  listResponses(): ModelResponseRecord[] {
    return readJsonl<ModelResponseRecord>(this.path("model-responses.jsonl"));
  }

  listEvents(): ModelProviderEventRecord[] {
    return readJsonl<ModelProviderEventRecord>(this.path("model-events.jsonl"));
  }

  summarize(): ModelProviderSummary {
    const events = this.listEvents();
    const providers = this.providers();
    return {
      createdAt: isoNow(),
      modelDir: this.modelDir,
      providerCount: providers.length,
      requestCount: this.listRequests().length,
      responseCount: this.listResponses().length,
      blockedEventCount: events.filter((event) => event.status === "blocked").length,
      localProviderCount: providers.filter((provider) => provider.localOnly).length,
      paidProviderRequired: false
    };
  }

  writeSummary(): string {
    const summary = this.summarize();
    const summaryPath = this.path("summary.json");
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2) + "\n", "utf8");
    return summaryPath;
  }

  private appendEvent(input: Omit<ModelProviderEventRecord, "id" | "createdAt">): string {
    const event: ModelProviderEventRecord = {
      id: createSeraId("model_event"),
      createdAt: isoNow(),
      ...input
    };
    return this.appendJsonl("model-events.jsonl", event);
  }

  private appendJsonl(fileName: string, record: unknown): string {
    const filePath = this.path(fileName);
    fs.appendFileSync(filePath, JSON.stringify(record) + "\n", "utf8");
    return filePath;
  }

  private writeJson(fileName: string, record: unknown): string {
    const filePath = this.path(fileName);
    fs.writeFileSync(filePath, JSON.stringify(record, null, 2) + "\n", "utf8");
    return filePath;
  }

  private path(fileName: string): string {
    return path.join(this.modelDir, fileName);
  }

  private providers(model?: string): ModelProviderRecord[] {
    const config = this.createLocalModelProviderConfig("ollama-local", model);
    return PROVIDERS.map((provider) => {
      if (provider.id !== "ollama-local") return { ...provider };
      return { ...provider, available: config.configured };
    });
  }

  private createLocalModelProviderConfig(providerId: string, model?: string): LocalModelProviderConfig {
    const enabled = process.env.SERA_ENABLE_OLLAMA === "1";
    const endpoint = normalizeEndpoint(process.env.SERA_OLLAMA_ENDPOINT || DEFAULT_OLLAMA_ENDPOINT);
    const selectedModel = model?.trim() || process.env.SERA_OLLAMA_MODEL?.trim() || undefined;
    const endpointIsLocal = isLocalEndpoint(endpoint);
    const reasons: string[] = [];
    if (!enabled) reasons.push("SERA_ENABLE_OLLAMA is not set to 1; the optional local provider remains disabled for certification.");
    if (!endpointIsLocal) reasons.push("SERA_OLLAMA_ENDPOINT must be localhost or loopback only.");
    if (!selectedModel) reasons.push("No local model selected; set SERA_OLLAMA_MODEL or pass a model to invoke-ollama.");
    return {
      providerId,
      enabled,
      endpoint,
      endpointIsLocal,
      model: selectedModel,
      configured: enabled && endpointIsLocal && Boolean(selectedModel),
      subscriptionRequired: false,
      paidApiKeyRequired: false,
      reasons,
      source: "local-model-provider-v1"
    };
  }
}

function createMockResponse(promptRedacted: string, maxOutputTokens?: number): string {
  const normalized = promptRedacted.replace(/\s+/g, " ").trim();
  const limited = maxOutputTokens ? normalized.slice(0, Math.max(1, maxOutputTokens) * 4) : normalized.slice(0, 240);
  return `mock-local response: ${limited}`;
}

function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

function normalizeEndpoint(endpoint: string): string {
  return endpoint.trim().replace(/\/+$/, "");
}

function isLocalEndpoint(endpoint: string): boolean {
  try {
    const url = new URL(endpoint);
    const host = url.hostname.toLowerCase();
    return (url.protocol === "http:" || url.protocol === "https:") && (host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "[::1]");
  } catch {
    return false;
  }
}

function extractLocalModelOutput(value: unknown): string {
  const response = value as { message?: { content?: unknown }; response?: unknown; error?: unknown };
  if (typeof response.error === "string") return response.error;
  if (typeof response.message?.content === "string") return response.message.content;
  if (typeof response.response === "string") return response.response;
  return JSON.stringify(value);
}

function postJsonToLocalEndpoint(endpoint: string, body: unknown): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint);
    if (!isLocalEndpoint(`${url.protocol}//${url.host}`)) {
      reject(new Error("Refusing non-local model endpoint."));
      return;
    }
    const payload = JSON.stringify(body);
    const options: http.RequestOptions = {
      method: "POST",
      hostname: url.hostname,
      port: url.port,
      path: `${url.pathname}${url.search}`,
      headers: {
        "content-type": "application/json",
        "content-length": Buffer.byteLength(payload)
      },
      timeout: 5000
    };
    const client = url.protocol === "https:" ? https : http;
    const req = client.request(options, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk: Buffer) => chunks.push(chunk));
      res.on("end", () => {
        const raw = Buffer.concat(chunks).toString("utf8");
        if ((res.statusCode ?? 500) >= 400) {
          reject(new Error(`Local model endpoint returned HTTP ${res.statusCode}: ${raw.slice(0, 300)}`));
          return;
        }
        try {
          resolve(raw ? JSON.parse(raw) : {});
        } catch (error) {
          reject(error);
        }
      });
    });
    req.on("timeout", () => req.destroy(new Error("Local model endpoint timed out.")));
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

function readJsonl<T>(filePath: string): T[] {
  if (!fs.existsSync(filePath)) return [];
  const text = fs.readFileSync(filePath, "utf8").trim();
  if (!text) return [];
  return text.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line) as T);
}
