import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { SeraKernel } from "@sera/kernel";
import { ModelProviderStore } from "@sera/model-provider";

function tempRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "sera-model-provider-test-"));
}

describe("Model Provider Adapter v1", () => {
  it("lists the local mock provider and disabled external provider", () => {
    const kernel = new SeraKernel({ rootDir: tempRoot() });
    const result = kernel.listModelProviders();

    expect(result.ok).toBe(true);
    expect(result.providers.find((provider) => provider.id === "mock-local")?.available).toBe(true);
    expect(result.providers.find((provider) => provider.id === "mock-local")?.localOnly).toBe(true);
    expect(result.providers.find((provider) => provider.id === "external-disabled")?.available).toBe(false);
  });

  it("invokes the mock provider and records request and response evidence", () => {
    const root = tempRoot();
    const kernel = new SeraKernel({ rootDir: root });
    const result = kernel.invokeModelProvider({
      providerId: "mock-local",
      prompt: "Explain the planner task queue safely.",
      purpose: "test mock response"
    });
    const store = new ModelProviderStore(root);

    expect(result.ok).toBe(true);
    expect(result.response?.output).toContain("mock-local response");
    expect(store.listRequests()).toHaveLength(1);
    expect(store.listResponses()).toHaveLength(1);
    expect(store.listEvents().some((event) => event.eventType === "response")).toBe(true);
  });

  it("redacts secrets before persisting prompt records", () => {
    const root = tempRoot();
    const kernel = new SeraKernel({ rootDir: root });
    const result = kernel.invokeModelProvider({
      providerId: "mock-local",
      prompt: "Use api_key=sk-1234567890abcdef and password=hunter2 but redact them."
    });
    const requestText = fs.readFileSync(path.join(root, ".sera-models", "model-requests.jsonl"), "utf8");

    expect(result.ok).toBe(true);
    expect(requestText).toContain("[REDACTED]");
    expect(requestText).not.toContain("sk-1234567890abcdef");
    expect(requestText).not.toContain("hunter2");
  });

  it("blocks unknown and disabled external providers", () => {
    const kernel = new SeraKernel({ rootDir: tempRoot() });
    const missing = kernel.invokeModelProvider({ providerId: "missing", prompt: "hello" });
    const external = kernel.invokeModelProvider({ providerId: "external-disabled", prompt: "hello" });

    expect(missing.ok).toBe(false);
    expect(missing.status).toBe("blocked");
    expect(external.ok).toBe(false);
    expect(external.status).toBe("blocked");
  });

  it("summarizes model provider requests, responses, and blocked events", () => {
    const root = tempRoot();
    const kernel = new SeraKernel({ rootDir: root });
    kernel.invokeModelProvider({ providerId: "mock-local", prompt: "hello" });
    kernel.invokeModelProvider({ providerId: "missing", prompt: "blocked" });
    const summary = kernel.getModelProviderSummary().summary;

    expect(summary.requestCount).toBe(1);
    expect(summary.responseCount).toBe(1);
    expect(summary.blockedEventCount).toBe(1);
  });
});
