import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const DEFAULT_REGISTRY_DIR = ".sera-tools";
const REGISTRY_FILE = "registry.json";
const EVENTS_FILE = "events.jsonl";
const REPORT_DIR = "reports";
const SCHEMA_VERSION = 1;

const VALID_KINDS = new Set(["core_tool", "plugin", "adapter", "worker", "script", "connector"]);
const VALID_STATUSES = new Set(["enabled", "disabled", "proposed", "deprecated", "blocked"]);
const VALID_MUTATION_AUTHORITY = new Set(["none", "proposal_only", "validation_gated_apply", "direct_apply"]);
const RISK_ORDER = ["low", "medium", "high", "blocked"];
const GUARDED_PERMISSIONS = new Set(["network", "external_service", "paid_provider", "cloud_storage", "hosted_model"]);
const SOURCE_MUTATION_PERMISSIONS = new Set(["write_source", "delete_source", "direct_patch"]);

export class ToolPluginRegistry {
  constructor(options = {}) {
    this.rootDir = path.resolve(options.rootDir ?? process.cwd());
    this.registryRelativeDir = options.registryRelativeDir ?? DEFAULT_REGISTRY_DIR;
    this.registryDir = resolveInsideRoot(this.rootDir, this.registryRelativeDir);
    this.registryPath = path.join(this.registryDir, REGISTRY_FILE);
    this.eventsPath = path.join(this.registryDir, EVENTS_FILE);
    this.reportDir = path.join(this.registryDir, REPORT_DIR);
  }

  initialize() {
    fs.mkdirSync(this.registryDir, { recursive: true });
    fs.mkdirSync(this.reportDir, { recursive: true });
    if (!fs.existsSync(this.registryPath)) {
      this.writeRegistry({
        schema: "sera-tool-plugin-registry-v1",
        schemaVersion: SCHEMA_VERSION,
        createdAt: nowIso(),
        updatedAt: nowIso(),
        localOnly: true,
        paidProviderRequired: false,
        cloudRequired: false,
        tools: []
      });
    }
    if (!fs.existsSync(this.eventsPath)) fs.writeFileSync(this.eventsPath, "", "utf8");
    const registry = this.readRegistry();
    return {
      ok: true,
      status: "completed",
      schemaVersion: registry.schemaVersion,
      registryPath: this.registryPath,
      eventPath: this.eventsPath,
      toolCount: registry.tools.length
    };
  }

  registerTool(manifestInput) {
    const registry = this.readRegistry();
    const existing = registry.tools.find((tool) => tool.id === manifestInput.id);
    const manifest = normalizeManifest(manifestInput, existing);
    const index = registry.tools.findIndex((tool) => tool.id === manifest.id);
    if (index >= 0) registry.tools[index] = manifest;
    else registry.tools.push(manifest);
    registry.tools.sort((a, b) => a.id.localeCompare(b.id));
    registry.updatedAt = nowIso();
    this.writeRegistry(registry);
    this.recordEvent({
      kind: index >= 0 ? "tool_updated" : "tool_registered",
      status: "recorded",
      toolId: manifest.id,
      payload: {
        kind: manifest.kind,
        status: manifest.status,
        riskLevel: manifest.riskLevel,
        freeCoreSafe: manifest.freeCoreSafe,
        approvalRequired: manifest.approvalRequired
      }
    });
    return manifest;
  }

  getTool(id) {
    assertToolId(id);
    return this.readRegistry().tools.find((tool) => tool.id === id);
  }

  listTools(filter = {}) {
    let tools = [...this.readRegistry().tools];
    if (filter.status) tools = tools.filter((tool) => tool.status === filter.status);
    if (filter.kind) tools = tools.filter((tool) => tool.kind === filter.kind);
    if (filter.freeCoreSafe !== undefined) tools = tools.filter((tool) => tool.freeCoreSafe === Boolean(filter.freeCoreSafe));
    if (filter.localOnly !== undefined) tools = tools.filter((tool) => tool.localOnly === Boolean(filter.localOnly));
    return tools;
  }

  assessTool(id) {
    const tool = this.getTool(id);
    if (!tool) return { ok: false, status: "missing", toolId: id, reasons: ["Tool is not registered."] };
    const reasons = explainTool(tool);
    return {
      ok: true,
      status: tool.status,
      toolId: tool.id,
      name: tool.name,
      kind: tool.kind,
      riskLevel: tool.riskLevel,
      freeCoreSafe: tool.freeCoreSafe,
      localOnly: tool.localOnly,
      approvalRequired: tool.approvalRequired,
      mutationAuthority: tool.mutationAuthority,
      reasons
    };
  }

  recordEvent(eventInput) {
    fs.mkdirSync(this.registryDir, { recursive: true });
    const event = {
      id: eventInput.id ?? makeId("tool_event"),
      createdAt: eventInput.createdAt ?? nowIso(),
      kind: required(eventInput.kind, "event.kind"),
      status: eventInput.status ?? "recorded",
      toolId: eventInput.toolId ?? null,
      payload: eventInput.payload ?? {}
    };
    fs.appendFileSync(this.eventsPath, JSON.stringify(event) + "\n", "utf8");
    return event;
  }

  listEvents(limit = 20) {
    if (!fs.existsSync(this.eventsPath)) return [];
    return fs.readFileSync(this.eventsPath, "utf8")
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => parseJson(line))
      .slice(-normalizeLimit(limit))
      .reverse();
  }

  getSummary() {
    const registry = this.readRegistry();
    const tools = registry.tools;
    const summary = {
      schema: registry.schema,
      schemaVersion: registry.schemaVersion,
      createdAt: nowIso(),
      registryPath: this.registryPath,
      localOnly: true,
      paidProviderRequired: false,
      cloudRequired: false,
      toolCount: tools.length,
      enabledCount: tools.filter((tool) => tool.status === "enabled").length,
      disabledCount: tools.filter((tool) => tool.status === "disabled").length,
      proposedCount: tools.filter((tool) => tool.status === "proposed").length,
      freeCoreSafeCount: tools.filter((tool) => tool.freeCoreSafe).length,
      guardedCount: tools.filter((tool) => tool.riskLevel === "high" || tool.riskLevel === "blocked" || tool.approvalRequired).length,
      externalOrCloudCount: tools.filter((tool) => !tool.localOnly || tool.requiresCloud || tool.requiresPaidProvider).length,
      riskCounts: countBy(tools, "riskLevel"),
      kindCounts: countBy(tools, "kind"),
      latestEvents: this.listEvents(8),
      tools: tools.map((tool) => ({
        id: tool.id,
        name: tool.name,
        kind: tool.kind,
        status: tool.status,
        riskLevel: tool.riskLevel,
        freeCoreSafe: tool.freeCoreSafe,
        localOnly: tool.localOnly,
        approvalRequired: tool.approvalRequired,
        mutationAuthority: tool.mutationAuthority
      }))
    };
    return summary;
  }

  writeSummaryArtifacts() {
    fs.mkdirSync(this.reportDir, { recursive: true });
    const summary = this.getSummary();
    const jsonPath = path.join(this.reportDir, "tool-plugin-registry-summary.json");
    const markdownPath = path.join(this.reportDir, "tool-plugin-registry-summary.md");
    const historyPath = path.join(this.reportDir, "tool-plugin-registry-history.jsonl");
    fs.writeFileSync(jsonPath, JSON.stringify(summary, null, 2) + "\n", "utf8");
    fs.writeFileSync(markdownPath, renderToolRegistryMarkdown(summary), "utf8");
    fs.appendFileSync(historyPath, JSON.stringify({
      createdAt: summary.createdAt,
      toolCount: summary.toolCount,
      freeCoreSafeCount: summary.freeCoreSafeCount,
      guardedCount: summary.guardedCount,
      externalOrCloudCount: summary.externalOrCloudCount
    }) + "\n", "utf8");
    return { ok: true, status: "completed", jsonPath, markdownPath, historyPath, summary };
  }

  readRegistry() {
    if (!fs.existsSync(this.registryPath)) this.initialize();
    const data = parseJson(fs.readFileSync(this.registryPath, "utf8"));
    if (!Array.isArray(data.tools)) data.tools = [];
    return data;
  }

  writeRegistry(registry) {
    fs.mkdirSync(this.registryDir, { recursive: true });
    fs.writeFileSync(this.registryPath, JSON.stringify(registry, null, 2) + "\n", "utf8");
  }
}

export function normalizeManifest(input, existing) {
  if (!input || typeof input !== "object") throw new Error("Tool manifest must be an object.");
  const id = assertToolId(input.id);
  const kind = input.kind ?? "tool";
  if (!VALID_KINDS.has(kind)) throw new Error("Invalid tool kind: " + kind);
  const status = input.status ?? "enabled";
  if (!VALID_STATUSES.has(status)) throw new Error("Invalid tool status: " + status);
  const mutationAuthority = input.mutationAuthority ?? "none";
  if (!VALID_MUTATION_AUTHORITY.has(mutationAuthority)) throw new Error("Invalid mutation authority: " + mutationAuthority);
  const permissions = normalizePermissions(input.permissions ?? []);
  const localOnly = input.localOnly ?? true;
  const requiresPaidProvider = Boolean(input.requiresPaidProvider);
  const requiresCloud = Boolean(input.requiresCloud);
  const freeCoreSafe = input.freeCoreSafe ?? computeFreeCoreSafe({ localOnly, requiresPaidProvider, requiresCloud, permissions });
  const riskLevel = input.riskLevel ?? computeRiskLevel({ permissions, mutationAuthority, requiresPaidProvider, requiresCloud, localOnly, status });
  const approvalRequired = input.approvalRequired ?? computeApprovalRequired({ permissions, mutationAuthority, riskLevel, status });

  return {
    id,
    name: required(input.name, "manifest.name"),
    version: required(input.version, "manifest.version"),
    kind,
    status,
    description: required(input.description, "manifest.description"),
    owner: input.owner ?? "local",
    entrypoint: input.entrypoint ?? null,
    localOnly: Boolean(localOnly),
    requiresPaidProvider,
    requiresCloud,
    freeCoreSafe: Boolean(freeCoreSafe),
    permissions,
    mutationAuthority,
    riskLevel,
    approvalRequired: Boolean(approvalRequired),
    createdAt: existing?.createdAt ?? nowIso(),
    updatedAt: nowIso(),
    metadata: input.metadata ?? {}
  };
}

export function computeFreeCoreSafe(tool) {
  if (!tool.localOnly) return false;
  if (tool.requiresPaidProvider || tool.requiresCloud) return false;
  return !tool.permissions.some((permission) => GUARDED_PERMISSIONS.has(permission));
}

export function computeRiskLevel(tool) {
  if (tool.status === "blocked") return "blocked";
  if (!tool.localOnly || tool.requiresPaidProvider || tool.requiresCloud) return "blocked";
  if (tool.permissions.some((permission) => GUARDED_PERMISSIONS.has(permission))) return "blocked";
  if (tool.mutationAuthority === "direct_apply") return "blocked";
  if (tool.mutationAuthority === "validation_gated_apply") return "high";
  if (tool.permissions.some((permission) => SOURCE_MUTATION_PERMISSIONS.has(permission))) return "high";
  if (tool.mutationAuthority === "proposal_only") return "medium";
  if (tool.permissions.some((permission) => ["execute_process", "write_runtime", "read_secret_names"].includes(permission))) return "medium";
  return "low";
}

export function computeApprovalRequired(tool) {
  if (tool.status === "disabled" || tool.status === "blocked") return true;
  if (tool.riskLevel === "high" || tool.riskLevel === "blocked") return true;
  if (tool.mutationAuthority !== "none") return true;
  return tool.permissions.some((permission) => SOURCE_MUTATION_PERMISSIONS.has(permission) || GUARDED_PERMISSIONS.has(permission));
}

export function renderToolRegistryMarkdown(summary) {
  const lines = [
    "# S.E.R.A. Tool / Plugin Registry v1 Summary",
    "",
    "Created: " + summary.createdAt,
    "",
    "## Boundary",
    "",
    "- Local only registry: true",
    "- Paid provider required: false",
    "- Cloud required: false",
    "- Source mutation authority added by registry: none",
    "",
    "## Counts",
    "",
    "- Tools: " + summary.toolCount,
    "- Enabled: " + summary.enabledCount,
    "- Disabled: " + summary.disabledCount,
    "- Proposed: " + summary.proposedCount,
    "- Free-core safe: " + summary.freeCoreSafeCount,
    "- Guarded / approval required: " + summary.guardedCount,
    "- External or cloud: " + summary.externalOrCloudCount,
    "",
    "## Tools",
    ""
  ];
  if (summary.tools.length === 0) lines.push("- None registered.");
  for (const tool of summary.tools) {
    lines.push("- " + tool.id + " — " + tool.status + " — " + tool.riskLevel + " — freeCoreSafe=" + tool.freeCoreSafe);
  }
  lines.push("", "## Latest Events", "");
  if (summary.latestEvents.length === 0) lines.push("- None recorded.");
  for (const event of summary.latestEvents) {
    lines.push("- " + event.createdAt + " — " + event.kind + " — " + (event.toolId ?? "registry"));
  }
  lines.push("");
  return lines.join("\n");
}

export function resolveInsideRoot(rootDir, relativePath) {
  if (path.isAbsolute(relativePath)) throw new Error("Registry paths must be relative and inside the project root.");
  const resolved = path.resolve(rootDir, relativePath);
  const relative = path.relative(rootDir, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Registry paths must stay inside the project root.");
  }
  return resolved;
}

function normalizePermissions(permissions) {
  if (!Array.isArray(permissions)) throw new Error("manifest.permissions must be an array.");
  const normalized = [...new Set(permissions.map((permission) => required(permission, "permission").trim()).filter(Boolean))];
  normalized.sort();
  return normalized;
}

function explainTool(tool) {
  const reasons = [];
  if (tool.freeCoreSafe) reasons.push("Tool is eligible for the free/local core boundary.");
  else reasons.push("Tool is not free-core safe under current manifest flags or permissions.");
  if (!tool.localOnly) reasons.push("Tool is not local-only.");
  if (tool.requiresPaidProvider) reasons.push("Tool requires a paid provider.");
  if (tool.requiresCloud) reasons.push("Tool requires cloud service access.");
  if (tool.approvalRequired) reasons.push("Tool requires explicit approval before operational use.");
  if (tool.mutationAuthority !== "none") reasons.push("Tool declares mutation authority: " + tool.mutationAuthority + ".");
  if (tool.permissions.length > 0) reasons.push("Permissions: " + tool.permissions.join(", ") + ".");
  return reasons;
}

function countBy(items, key) {
  const output = {};
  for (const item of items) output[item[key]] = (output[item[key]] ?? 0) + 1;
  for (const risk of RISK_ORDER) output[risk] = output[risk] ?? 0;
  return output;
}

function assertToolId(value) {
  const id = required(value, "manifest.id");
  if (!/^[a-z0-9][a-z0-9._-]{2,80}$/.test(id)) throw new Error("Invalid tool id: " + id);
  return id;
}

function required(value, name) {
  if (typeof value !== "string" || value.trim().length === 0) throw new Error(name + " is required.");
  return value.trim();
}

function normalizeLimit(limit) {
  const value = Number(limit);
  if (!Number.isInteger(value) || value < 1) return 20;
  return Math.min(value, 100);
}

function parseJson(text) {
  return JSON.parse(text);
}

function makeId(prefix) {
  return prefix + "_" + crypto.randomBytes(6).toString("hex");
}

function nowIso() {
  return new Date().toISOString();
}
