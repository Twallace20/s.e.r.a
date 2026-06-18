import fs from "node:fs";
import path from "node:path";
import { createSeraId, isoNow, redactSecrets } from "@sera/shared";

export type ModelProviderStatus = "completed" | "blocked";
export type ModelProviderKind = "mock" | "external";

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
  eventType: "list" | "request" | "response" | "blocked";
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
    return { ok: true, status: "completed", modelDir: this.modelDir, providers: PROVIDERS.map((provider) => ({ ...provider })) };
  }

  invoke(input: ModelInvocationInput): ModelInvocationResult {
    const provider = PROVIDERS.find((item) => item.id === input.providerId);
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
    return {
      createdAt: isoNow(),
      modelDir: this.modelDir,
      providerCount: PROVIDERS.length,
      requestCount: this.listRequests().length,
      responseCount: this.listResponses().length,
      blockedEventCount: events.filter((event) => event.status === "blocked").length
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

  private path(fileName: string): string {
    return path.join(this.modelDir, fileName);
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

function readJsonl<T>(filePath: string): T[] {
  if (!fs.existsSync(filePath)) return [];
  const text = fs.readFileSync(filePath, "utf8").trim();
  if (!text) return [];
  return text.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line) as T);
}
