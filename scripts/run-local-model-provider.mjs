#!/usr/bin/env node
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { SeraKernel } = require("../packages/kernel/dist/index.js");

const rootDir = process.cwd();
const kernelDist = path.join(rootDir, "packages", "kernel", "dist", "index.js");

function fail(message, detail) {
  console.error(`S.E.R.A. phase18 local model provider: FAIL ${message}`);
  if (detail) console.error(JSON.stringify(detail, null, 2));
  process.exit(1);
}

if (!kernelDist) {
  fail("kernel dist path could not be resolved");
}

const originalEnable = process.env.SERA_ENABLE_OLLAMA;
const originalModel = process.env.SERA_OLLAMA_MODEL;
const originalEndpoint = process.env.SERA_OLLAMA_ENDPOINT;

delete process.env.SERA_ENABLE_OLLAMA;
delete process.env.SERA_OLLAMA_MODEL;
delete process.env.SERA_OLLAMA_ENDPOINT;

try {
  const kernel = new SeraKernel({ rootDir });
  const providers = kernel.listModelProviders();
  const mock = providers.providers.find((provider) => provider.id === "mock-local");
  const ollama = providers.providers.find((provider) => provider.id === "ollama-local");
  const external = providers.providers.find((provider) => provider.id === "external-disabled");

  if (!mock?.available || !mock.localOnly) fail("mock-local provider is not available and local-only", providers);
  if (!ollama || ollama.kind !== "local-http" || !ollama.localOnly || ollama.networkAllowed !== false) fail("ollama-local provider is not registered as local-only optional provider", providers);
  if (ollama.available) fail("ollama-local must be disabled by default for subscription-free certification", providers);
  if (!external || external.available) fail("external provider slot must remain disabled", providers);

  const mockResponse = kernel.invokeModelProvider({ providerId: "mock-local", prompt: "Summarize local evidence only.", purpose: "phase18-default-free-path" });
  if (!mockResponse.ok || !mockResponse.response?.output.includes("mock-local response")) fail("mock-local invocation did not complete", mockResponse);

  const readiness = kernel.getLocalModelProviderReadiness("ollama-local");
  if (!readiness.ok || readiness.canInvoke || readiness.subscriptionRequired || readiness.paidApiKeyRequired) fail("local provider readiness must be optional and subscription-free", readiness);
  if (!readiness.reportPath) fail("local model readiness report was not written", readiness);

  const blocked = await kernel.invokeLocalModelProvider({ providerId: "ollama-local", model: "phase18-local-placeholder", prompt: "This must block unless explicitly enabled.", purpose: "phase18-disabled-local-provider-proof" });
  if (blocked.ok || blocked.status !== "blocked") fail("ollama-local invocation must block when not explicitly enabled", blocked);

  console.log("S.E.R.A. phase18 local model provider: PASS");
  console.log(JSON.stringify({
    ok: true,
    status: "completed",
    providerCount: providers.providers.length,
    localProviderIds: providers.providers.filter((provider) => provider.localOnly).map((provider) => provider.id),
    mockResponseId: mockResponse.response?.id,
    ollamaDefaultAvailable: ollama.available,
    readiness: {
      canInvoke: readiness.canInvoke,
      subscriptionRequired: readiness.subscriptionRequired,
      paidApiKeyRequired: readiness.paidApiKeyRequired,
      reportPath: readiness.reportPath
    },
    blockedLocalInvocation: {
      ok: blocked.ok,
      status: blocked.status,
      message: blocked.message
    }
  }, null, 2));
} finally {
  if (originalEnable === undefined) delete process.env.SERA_ENABLE_OLLAMA; else process.env.SERA_ENABLE_OLLAMA = originalEnable;
  if (originalModel === undefined) delete process.env.SERA_OLLAMA_MODEL; else process.env.SERA_OLLAMA_MODEL = originalModel;
  if (originalEndpoint === undefined) delete process.env.SERA_OLLAMA_ENDPOINT; else process.env.SERA_OLLAMA_ENDPOINT = originalEndpoint;
}
