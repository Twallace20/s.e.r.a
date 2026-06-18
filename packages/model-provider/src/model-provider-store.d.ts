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
export declare class ModelProviderStore {
    readonly rootDir: string;
    readonly modelDir: string;
    constructor(rootDir: string);
    listProviders(): ModelProviderListResult;
    invoke(input: ModelInvocationInput): ModelInvocationResult;
    listRequests(): ModelRequestRecord[];
    listResponses(): ModelResponseRecord[];
    listEvents(): ModelProviderEventRecord[];
    summarize(): ModelProviderSummary;
    writeSummary(): string;
    private appendEvent;
    private appendJsonl;
    private path;
}
