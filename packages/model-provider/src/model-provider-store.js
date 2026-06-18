"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModelProviderStore = void 0;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const shared_1 = require("@sera/shared");
const PROVIDERS = [
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
class ModelProviderStore {
    rootDir;
    modelDir;
    constructor(rootDir) {
        this.rootDir = node_path_1.default.resolve(rootDir);
        this.modelDir = node_path_1.default.join(this.rootDir, ".sera-models");
        node_fs_1.default.mkdirSync(this.modelDir, { recursive: true });
    }
    listProviders() {
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
    invoke(input) {
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
        const request = {
            id: (0, shared_1.createSeraId)("model_request"),
            providerId: provider.id,
            purpose: input.purpose?.trim() || "local-model-adapter-test",
            promptRedacted: (0, shared_1.redactSecrets)(trimmedPrompt),
            createdAt: (0, shared_1.isoNow)(),
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
        const response = {
            id: (0, shared_1.createSeraId)("model_response"),
            requestId: request.id,
            providerId: provider.id,
            output: responseText,
            createdAt: (0, shared_1.isoNow)(),
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
    listRequests() {
        return readJsonl(this.path("model-requests.jsonl"));
    }
    listResponses() {
        return readJsonl(this.path("model-responses.jsonl"));
    }
    listEvents() {
        return readJsonl(this.path("model-events.jsonl"));
    }
    summarize() {
        const events = this.listEvents();
        return {
            createdAt: (0, shared_1.isoNow)(),
            modelDir: this.modelDir,
            providerCount: PROVIDERS.length,
            requestCount: this.listRequests().length,
            responseCount: this.listResponses().length,
            blockedEventCount: events.filter((event) => event.status === "blocked").length
        };
    }
    writeSummary() {
        const summary = this.summarize();
        const summaryPath = this.path("summary.json");
        node_fs_1.default.writeFileSync(summaryPath, JSON.stringify(summary, null, 2) + "\n", "utf8");
        return summaryPath;
    }
    appendEvent(input) {
        const event = {
            id: (0, shared_1.createSeraId)("model_event"),
            createdAt: (0, shared_1.isoNow)(),
            ...input
        };
        return this.appendJsonl("model-events.jsonl", event);
    }
    appendJsonl(fileName, record) {
        const filePath = this.path(fileName);
        node_fs_1.default.appendFileSync(filePath, JSON.stringify(record) + "\n", "utf8");
        return filePath;
    }
    path(fileName) {
        return node_path_1.default.join(this.modelDir, fileName);
    }
}
exports.ModelProviderStore = ModelProviderStore;
function createMockResponse(promptRedacted, maxOutputTokens) {
    const normalized = promptRedacted.replace(/\s+/g, " ").trim();
    const limited = maxOutputTokens ? normalized.slice(0, Math.max(1, maxOutputTokens) * 4) : normalized.slice(0, 240);
    return `mock-local response: ${limited}`;
}
function estimateTokens(text) {
    return Math.max(1, Math.ceil(text.length / 4));
}
function readJsonl(filePath) {
    if (!node_fs_1.default.existsSync(filePath))
        return [];
    const text = node_fs_1.default.readFileSync(filePath, "utf8").trim();
    if (!text)
        return [];
    return text.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
}
//# sourceMappingURL=model-provider-store.js.map