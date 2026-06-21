#!/usr/bin/env node
import { ToolPluginRegistry } from "./lib/tool-plugin-registry-v1.mjs";

const registry = new ToolPluginRegistry({ rootDir: process.cwd() });

const init = registry.initialize();

const tools = [
  registry.registerTool({
    id: "operator-console-v2",
    name: "Operator Console v2 Terminal Dashboard",
    version: "0.1.0",
    kind: "script",
    status: "enabled",
    description: "Read-only local terminal dashboard over S.E.R.A. runtime evidence.",
    entrypoint: "scripts/run-operator-console-v2.mjs",
    localOnly: true,
    requiresPaidProvider: false,
    requiresCloud: false,
    permissions: ["read_runtime", "write_runtime"],
    mutationAuthority: "none",
    metadata: { phase: 22 }
  }),
  registry.registerTool({
    id: "sqlite-persistence-v1",
    name: "SQLite Persistence v1",
    version: "0.1.0",
    kind: "script",
    status: "enabled",
    description: "Local SQLite persistence evidence store for events, key/value records, evidence records, and phase snapshots.",
    entrypoint: "scripts/run-sqlite-persistence-v1.mjs",
    localOnly: true,
    requiresPaidProvider: false,
    requiresCloud: false,
    permissions: ["read_runtime", "write_runtime"],
    mutationAuthority: "none",
    metadata: { phase: 23 }
  }),
  registry.registerTool({
    id: "research-knowledge-worker-v1",
    name: "Research Knowledge Worker v1",
    version: "0.1.0",
    kind: "worker",
    status: "enabled",
    description: "Answers, compares, and summarizes from local indexed knowledge with citations.",
    entrypoint: "packages/research/src/research-knowledge-worker.ts",
    localOnly: true,
    requiresPaidProvider: false,
    requiresCloud: false,
    permissions: ["read_runtime", "write_runtime", "read_source"],
    mutationAuthority: "none",
    metadata: { phase: 21 }
  }),
  registry.registerTool({
    id: "developer-worker-v2",
    name: "Developer Worker v2",
    version: "0.1.0",
    kind: "worker",
    status: "enabled",
    description: "Validation-gated local developer worker with rollback and artifact evidence.",
    entrypoint: "packages/developer-worker-v2/src/index.ts",
    localOnly: true,
    requiresPaidProvider: false,
    requiresCloud: false,
    permissions: ["read_source", "write_source", "execute_process", "write_runtime"],
    mutationAuthority: "validation_gated_apply",
    metadata: { phase: 3, guardrail: "validation_required" }
  }),
  registry.registerTool({
    id: "optional-web-research-adapter",
    name: "Optional Web Research Adapter Placeholder",
    version: "0.0.0",
    kind: "adapter",
    status: "disabled",
    description: "Future optional external research adapter placeholder. It is disabled and excluded from the free/local core.",
    entrypoint: null,
    localOnly: false,
    requiresPaidProvider: false,
    requiresCloud: true,
    permissions: ["network", "external_service"],
    mutationAuthority: "none",
    metadata: { phase: "future_optional", freeCore: "excluded" }
  })
];

const summaryArtifacts = registry.writeSummaryArtifacts();
const summary = summaryArtifacts.summary;

if (init.ok !== true) throw new Error("Tool registry did not initialize.");
if (summary.toolCount < 5) throw new Error("Expected at least five registered tools.");
if (summary.freeCoreSafeCount < 4) throw new Error("Expected free-core safe local tools to be registered.");
if (summary.externalOrCloudCount < 1) throw new Error("Expected optional external adapter to be tracked separately.");
if (registry.assessTool("developer-worker-v2").approvalRequired !== true) throw new Error("Developer worker must require approval.");
if (registry.assessTool("optional-web-research-adapter").freeCoreSafe !== false) throw new Error("Optional web adapter must not be marked free-core safe.");

const output = {
  ok: true,
  status: "completed",
  init,
  registryPath: summary.registryPath,
  toolCount: summary.toolCount,
  enabledCount: summary.enabledCount,
  disabledCount: summary.disabledCount,
  freeCoreSafeCount: summary.freeCoreSafeCount,
  guardedCount: summary.guardedCount,
  externalOrCloudCount: summary.externalOrCloudCount,
  jsonPath: summaryArtifacts.jsonPath,
  markdownPath: summaryArtifacts.markdownPath,
  historyPath: summaryArtifacts.historyPath,
  localOnly: summary.localOnly,
  paidProviderRequired: summary.paidProviderRequired,
  cloudRequired: summary.cloudRequired,
  registeredToolIds: tools.map((tool) => tool.id)
};

console.log("S.E.R.A. phase24 tool plugin registry v1: PASS");
console.log(JSON.stringify(output, null, 2));
