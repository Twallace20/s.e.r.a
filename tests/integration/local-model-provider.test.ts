import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { SeraKernel } from "@sera/kernel";
import { ModelProviderStore } from "@sera/model-provider";

function tempRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "sera-local-model-provider-test-"));
}

function withOllamaDisabled<T>(fn: () => T): T {
  const previousEnable = process.env.SERA_ENABLE_OLLAMA;
  const previousModel = process.env.SERA_OLLAMA_MODEL;
  const previousEndpoint = process.env.SERA_OLLAMA_ENDPOINT;
  delete process.env.SERA_ENABLE_OLLAMA;
  delete process.env.SERA_OLLAMA_MODEL;
  delete process.env.SERA_OLLAMA_ENDPOINT;
  try {
    return fn();
  } finally {
    if (previousEnable === undefined) delete process.env.SERA_ENABLE_OLLAMA; else process.env.SERA_ENABLE_OLLAMA = previousEnable;
    if (previousModel === undefined) delete process.env.SERA_OLLAMA_MODEL; else process.env.SERA_OLLAMA_MODEL = previousModel;
    if (previousEndpoint === undefined) delete process.env.SERA_OLLAMA_ENDPOINT; else process.env.SERA_OLLAMA_ENDPOINT = previousEndpoint;
  }
}

describe("Local Model Provider v1", () => {
  it("registers ollama-local as optional, local-only, and disabled by default", () => withOllamaDisabled(() => {
    const kernel = new SeraKernel({ rootDir: tempRoot() });
    const result = kernel.listModelProviders();
    const ollama = result.providers.find((provider) => provider.id === "ollama-local");

    expect(result.ok).toBe(true);
    expect(ollama?.kind).toBe("local-http");
    expect(ollama?.localOnly).toBe(true);
    expect(ollama?.networkAllowed).toBe(false);
    expect(ollama?.available).toBe(false);
  }));

  it("writes local provider readiness without requiring subscriptions or API keys", () => withOllamaDisabled(() => {
    const root = tempRoot();
    const kernel = new SeraKernel({ rootDir: root });
    const readiness = kernel.getLocalModelProviderReadiness("ollama-local");
    const store = new ModelProviderStore(root);

    expect(readiness.ok).toBe(true);
    expect(readiness.canInvoke).toBe(false);
    expect(readiness.subscriptionRequired).toBe(false);
    expect(readiness.paidApiKeyRequired).toBe(false);
    expect(readiness.reportPath && fs.existsSync(readiness.reportPath)).toBe(true);
    expect(store.listEvents().some((event) => event.eventType === "readiness")).toBe(true);
  }));

  it("blocks optional local invocation when Ollama is not explicitly enabled", async () => {
    await withOllamaDisabled(async () => {
      const root = tempRoot();
      const kernel = new SeraKernel({ rootDir: root });
      const result = await kernel.invokeLocalModelProvider({
        providerId: "ollama-local",
        model: "phase18-placeholder",
        prompt: "This should block without opt-in."
      });
      const store = new ModelProviderStore(root);

      expect(result.ok).toBe(false);
      expect(result.status).toBe("blocked");
      expect(result.message).toContain("disabled or incomplete");
      expect(store.listRequests()).toHaveLength(0);
      expect(store.listEvents().some((event) => event.status === "blocked")).toBe(true);
    });
  });
});
