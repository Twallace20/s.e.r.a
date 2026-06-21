import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const DEFAULT_CAPABILITY_DIR = ".sera-capabilities";
const CAPABILITIES_FILE = "capabilities.json";
const SKILL_GRAPH_FILE = "skill-graph.json";
const EVENTS_FILE = "events.jsonl";
const REPORT_DIR = "reports";
const SCHEMA_VERSION = 1;

const VALID_STATUSES = new Set(["available", "learning", "planned", "blocked", "deprecated"]);
const VALID_LEVELS = new Set(["none", "foundation", "working", "certified", "advanced"]);
const VALID_CERTIFICATION = new Set(["uncertified", "evidence_backed", "certified", "blocked"]);
const VALID_RELATIONSHIPS = new Set(["requires", "supports", "improves", "blocks", "related_to"]);
const GUARDED_TOOLS = new Set(["optional-web-research-adapter", "external-model-provider", "cloud-storage-adapter"]);

export class CapabilityRegistrySkillGraph {
  constructor(options = {}) {
    this.rootDir = path.resolve(options.rootDir ?? process.cwd());
    this.capabilityRelativeDir = options.capabilityRelativeDir ?? DEFAULT_CAPABILITY_DIR;
    this.capabilityDir = resolveInsideRoot(this.rootDir, this.capabilityRelativeDir);
    this.capabilitiesPath = path.join(this.capabilityDir, CAPABILITIES_FILE);
    this.skillGraphPath = path.join(this.capabilityDir, SKILL_GRAPH_FILE);
    this.eventsPath = path.join(this.capabilityDir, EVENTS_FILE);
    this.reportDir = path.join(this.capabilityDir, REPORT_DIR);
  }

  initialize() {
    fs.mkdirSync(this.capabilityDir, { recursive: true });
    fs.mkdirSync(this.reportDir, { recursive: true });
    if (!fs.existsSync(this.capabilitiesPath)) {
      this.writeCapabilities({
        schema: "sera-capability-registry-v1",
        schemaVersion: SCHEMA_VERSION,
        createdAt: nowIso(),
        updatedAt: nowIso(),
        localOnly: true,
        paidProviderRequired: false,
        cloudRequired: false,
        capabilities: []
      });
    }
    if (!fs.existsSync(this.skillGraphPath)) {
      this.writeSkillGraph({
        schema: "sera-skill-graph-v1",
        schemaVersion: SCHEMA_VERSION,
        createdAt: nowIso(),
        updatedAt: nowIso(),
        nodes: [],
        edges: []
      });
    }
    if (!fs.existsSync(this.eventsPath)) fs.writeFileSync(this.eventsPath, "", "utf8");
    const capabilities = this.readCapabilities();
    const graph = this.readSkillGraph();
    return {
      ok: true,
      status: "completed",
      schemaVersion: capabilities.schemaVersion,
      capabilityPath: this.capabilitiesPath,
      skillGraphPath: this.skillGraphPath,
      eventPath: this.eventsPath,
      capabilityCount: capabilities.capabilities.length,
      graphNodeCount: graph.nodes.length,
      graphEdgeCount: graph.edges.length
    };
  }

  registerCapability(input) {
    const registry = this.readCapabilities();
    const existing = registry.capabilities.find((capability) => capability.id === input.id);
    const capability = normalizeCapability(input, existing);
    const index = registry.capabilities.findIndex((item) => item.id === capability.id);
    if (index >= 0) registry.capabilities[index] = capability;
    else registry.capabilities.push(capability);
    registry.capabilities.sort((a, b) => a.id.localeCompare(b.id));
    registry.updatedAt = nowIso();
    this.writeCapabilities(registry);
    this.upsertSkillNode(capability);
    this.recordEvent({
      kind: index >= 0 ? "capability_updated" : "capability_registered",
      status: "recorded",
      capabilityId: capability.id,
      payload: {
        status: capability.status,
        currentLevel: capability.currentLevel,
        certificationStatus: capability.certificationStatus,
        evidenceCount: capability.evidence.length,
        limitationCount: capability.knownLimitations.length
      }
    });
    return capability;
  }

  getCapability(id) {
    const registry = this.readCapabilities();
    return registry.capabilities.find((capability) => capability.id === id) ?? null;
  }

  listCapabilities(filter = {}) {
    const registry = this.readCapabilities();
    return registry.capabilities.filter((capability) => {
      if (filter.status && capability.status !== filter.status) return false;
      if (filter.currentLevel && capability.currentLevel !== filter.currentLevel) return false;
      if (filter.certificationStatus && capability.certificationStatus !== filter.certificationStatus) return false;
      if (filter.domain && capability.domain !== filter.domain) return false;
      return true;
    });
  }

  linkCapabilities(sourceId, targetId, relationship, evidence = []) {
    const source = this.getCapability(sourceId);
    const target = this.getCapability(targetId);
    if (!source) throw new Error("Source capability not found: " + sourceId);
    if (!target) throw new Error("Target capability not found: " + targetId);
    if (!VALID_RELATIONSHIPS.has(relationship)) throw new Error("Invalid skill graph relationship: " + relationship);

    const graph = this.readSkillGraph();
    const edgeId = stableId([sourceId, relationship, targetId].join("|"));
    const edge = {
      id: edgeId,
      sourceId,
      targetId,
      relationship,
      evidence: normalizeStringArray(evidence),
      createdAt: nowIso(),
      updatedAt: nowIso(),
      localOnly: true
    };
    const index = graph.edges.findIndex((item) => item.id === edge.id);
    if (index >= 0) graph.edges[index] = { ...graph.edges[index], ...edge, createdAt: graph.edges[index].createdAt };
    else graph.edges.push(edge);
    graph.edges.sort((a, b) => a.id.localeCompare(b.id));
    graph.updatedAt = nowIso();
    this.writeSkillGraph(graph);
    this.recordEvent({
      kind: index >= 0 ? "skill_edge_updated" : "skill_edge_registered",
      status: "recorded",
      capabilityId: sourceId,
      payload: { sourceId, targetId, relationship }
    });
    return edge;
  }

  assessCapability(id) {
    const capability = this.getCapability(id);
    if (!capability) throw new Error("Capability not found: " + id);
    const blockers = [];
    const warnings = [];
    if (capability.status === "blocked") blockers.push("capability_status_blocked");
    if (capability.certificationStatus === "blocked") blockers.push("certification_status_blocked");
    if (capability.requiresCloud) blockers.push("requires_cloud");
    if (capability.requiresPaidProvider) blockers.push("requires_paid_provider");
    if (!capability.localOnly) blockers.push("not_local_only");
    if (capability.evidence.length === 0) warnings.push("missing_evidence");
    if (capability.knownLimitations.length > 0) warnings.push("known_limitations_present");
    if (capability.lastFailure) warnings.push("last_failure_present");
    if (capability.requiredTools.some((toolId) => GUARDED_TOOLS.has(toolId))) warnings.push("guarded_tool_dependency_present");
    const ready = blockers.length === 0 && capability.certificationStatus === "certified" && capability.evidence.length > 0;
    const attentionRequired = blockers.length > 0 || warnings.length > 0 || capability.status === "learning" || capability.status === "planned";
    return {
      ok: blockers.length === 0,
      status: ready ? "ready" : attentionRequired ? "review_needed" : "available",
      capabilityId: capability.id,
      currentLevel: capability.currentLevel,
      certificationStatus: capability.certificationStatus,
      freeCoreSafe: capability.freeCoreSafe,
      localOnly: capability.localOnly,
      blockers,
      warnings,
      attentionRequired,
      nextImprovementTarget: capability.nextImprovementTarget
    };
  }

  buildSummary() {
    const registry = this.readCapabilities();
    const graph = this.readSkillGraph();
    const assessments = registry.capabilities.map((capability) => this.assessCapability(capability.id));
    const certifiedCount = registry.capabilities.filter((capability) => capability.certificationStatus === "certified").length;
    const learningCount = registry.capabilities.filter((capability) => capability.status === "learning").length;
    const plannedCount = registry.capabilities.filter((capability) => capability.status === "planned").length;
    const blockedCount = registry.capabilities.filter((capability) => capability.status === "blocked").length;
    const freeCoreSafeCount = registry.capabilities.filter((capability) => capability.freeCoreSafe).length;
    const localOnlyCount = registry.capabilities.filter((capability) => capability.localOnly).length;
    const attentionRequiredCount = assessments.filter((assessment) => assessment.attentionRequired).length;
    const capabilityIds = registry.capabilities.map((capability) => capability.id);
    return {
      ok: blockedCount === 0,
      status: blockedCount === 0 ? "completed" : "blocked",
      createdAt: nowIso(),
      capabilityDir: this.capabilityDir,
      capabilityPath: this.capabilitiesPath,
      skillGraphPath: this.skillGraphPath,
      capabilityCount: registry.capabilities.length,
      graphNodeCount: graph.nodes.length,
      graphEdgeCount: graph.edges.length,
      certifiedCount,
      learningCount,
      plannedCount,
      blockedCount,
      freeCoreSafeCount,
      localOnlyCount,
      attentionRequiredCount,
      localOnly: true,
      paidProviderRequired: false,
      cloudRequired: false,
      capabilityIds,
      attentionCapabilityIds: assessments.filter((assessment) => assessment.attentionRequired).map((assessment) => assessment.capabilityId)
    };
  }

  writeSummaryArtifacts() {
    const summary = this.buildSummary();
    const jsonPath = path.join(this.reportDir, "capability-registry-summary.json");
    const markdownPath = path.join(this.reportDir, "capability-registry-summary.md");
    const historyPath = path.join(this.reportDir, "capability-registry-history.jsonl");
    fs.mkdirSync(this.reportDir, { recursive: true });
    fs.writeFileSync(jsonPath, JSON.stringify(summary, null, 2) + "\n", "utf8");
    fs.writeFileSync(markdownPath, renderSummaryMarkdown(summary), "utf8");
    fs.appendFileSync(historyPath, JSON.stringify(summary) + "\n", "utf8");
    this.recordEvent({
      kind: "capability_summary_written",
      status: "completed",
      capabilityId: null,
      payload: {
        capabilityCount: summary.capabilityCount,
        graphEdgeCount: summary.graphEdgeCount,
        attentionRequiredCount: summary.attentionRequiredCount
      }
    });
    return { ...summary, jsonPath, markdownPath, historyPath };
  }

  readCapabilities() {
    return JSON.parse(fs.readFileSync(this.capabilitiesPath, "utf8"));
  }

  writeCapabilities(data) {
    fs.writeFileSync(this.capabilitiesPath, JSON.stringify(data, null, 2) + "\n", "utf8");
  }

  readSkillGraph() {
    return JSON.parse(fs.readFileSync(this.skillGraphPath, "utf8"));
  }

  writeSkillGraph(data) {
    fs.writeFileSync(this.skillGraphPath, JSON.stringify(data, null, 2) + "\n", "utf8");
  }

  upsertSkillNode(capability) {
    const graph = this.readSkillGraph();
    const node = {
      id: capability.id,
      name: capability.name,
      domain: capability.domain,
      status: capability.status,
      currentLevel: capability.currentLevel,
      certificationStatus: capability.certificationStatus,
      updatedAt: nowIso()
    };
    const index = graph.nodes.findIndex((item) => item.id === node.id);
    if (index >= 0) graph.nodes[index] = { ...graph.nodes[index], ...node };
    else graph.nodes.push({ ...node, createdAt: nowIso() });
    graph.nodes.sort((a, b) => a.id.localeCompare(b.id));
    graph.updatedAt = nowIso();
    this.writeSkillGraph(graph);
  }

  recordEvent(input) {
    const event = {
      id: stableId(JSON.stringify(input) + nowIso()),
      createdAt: nowIso(),
      ...input
    };
    fs.appendFileSync(this.eventsPath, JSON.stringify(event) + "\n", "utf8");
    return event;
  }
}

function normalizeCapability(input, existing) {
  if (!input || typeof input !== "object") throw new Error("Capability manifest must be an object.");
  const id = normalizeId(input.id);
  const status = input.status ?? existing?.status ?? "planned";
  const currentLevel = input.currentLevel ?? existing?.currentLevel ?? "none";
  const certificationStatus = input.certificationStatus ?? existing?.certificationStatus ?? "uncertified";
  if (!VALID_STATUSES.has(status)) throw new Error("Invalid capability status: " + status);
  if (!VALID_LEVELS.has(currentLevel)) throw new Error("Invalid capability level: " + currentLevel);
  if (!VALID_CERTIFICATION.has(certificationStatus)) throw new Error("Invalid capability certification status: " + certificationStatus);
  const requiredTools = normalizeStringArray(input.requiredTools ?? existing?.requiredTools ?? []);
  const requiresPaidProvider = Boolean(input.requiresPaidProvider ?? existing?.requiresPaidProvider ?? false);
  const requiresCloud = Boolean(input.requiresCloud ?? existing?.requiresCloud ?? false);
  const localOnly = Boolean(input.localOnly ?? existing?.localOnly ?? !requiresCloud);
  const freeCoreSafe = Boolean(input.freeCoreSafe ?? existing?.freeCoreSafe ?? (localOnly && !requiresPaidProvider && !requiresCloud));
  return {
    id,
    name: requireString(input.name ?? existing?.name, "Capability name"),
    version: input.version ?? existing?.version ?? "0.1.0",
    domain: input.domain ?? existing?.domain ?? "general",
    status,
    currentLevel,
    certificationStatus,
    description: input.description ?? existing?.description ?? "",
    evidence: normalizeEvidence(input.evidence ?? existing?.evidence ?? []),
    knownLimitations: normalizeStringArray(input.knownLimitations ?? existing?.knownLimitations ?? []),
    requiredTools,
    requiredKnowledge: normalizeStringArray(input.requiredKnowledge ?? existing?.requiredKnowledge ?? []),
    lastSuccessfulRun: input.lastSuccessfulRun ?? existing?.lastSuccessfulRun ?? null,
    lastFailure: input.lastFailure ?? existing?.lastFailure ?? null,
    nextImprovementTarget: input.nextImprovementTarget ?? existing?.nextImprovementTarget ?? null,
    freeCoreSafe,
    localOnly,
    requiresPaidProvider,
    requiresCloud,
    confidence: Number(input.confidence ?? existing?.confidence ?? 0),
    metadata: input.metadata ?? existing?.metadata ?? {},
    createdAt: existing?.createdAt ?? nowIso(),
    updatedAt: nowIso()
  };
}

function normalizeEvidence(values) {
  return normalizeStringArray(values).map((value) => ({ id: stableId(value), reference: value }));
}

function normalizeStringArray(values) {
  if (!Array.isArray(values)) return [];
  return values.map((value) => String(value).trim()).filter(Boolean);
}

function normalizeId(value) {
  const id = requireString(value, "Capability id").toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  if (!id) throw new Error("Capability id cannot be empty.");
  return id;
}

function requireString(value, label) {
  if (typeof value !== "string" || value.trim().length === 0) throw new Error(label + " is required.");
  return value.trim();
}

function stableId(value) {
  return crypto.createHash("sha256").update(value).digest("hex").slice(0, 16);
}

function nowIso() {
  return new Date().toISOString();
}

function resolveInsideRoot(rootDir, relativePath) {
  const resolved = path.resolve(rootDir, relativePath);
  if (resolved !== rootDir && !resolved.startsWith(rootDir + path.sep)) throw new Error("Capability registry paths must stay inside the project root.");
  return resolved;
}

function renderSummaryMarkdown(summary) {
  const lines = [
    "# S.E.R.A. Capability Registry + Skill Graph v1",
    "",
    "- Status: " + summary.status,
    "- Capability count: " + summary.capabilityCount,
    "- Skill graph nodes: " + summary.graphNodeCount,
    "- Skill graph edges: " + summary.graphEdgeCount,
    "- Certified capabilities: " + summary.certifiedCount,
    "- Learning capabilities: " + summary.learningCount,
    "- Planned capabilities: " + summary.plannedCount,
    "- Free-core-safe capabilities: " + summary.freeCoreSafeCount,
    "- Local-only capabilities: " + summary.localOnlyCount,
    "- Attention required: " + summary.attentionRequiredCount,
    "- Local only: " + summary.localOnly,
    "- Paid provider required: " + summary.paidProviderRequired,
    "- Cloud required: " + summary.cloudRequired,
    "",
    "## Capabilities",
    ""
  ];
  for (const id of summary.capabilityIds) lines.push("- " + id);
  if (summary.attentionCapabilityIds.length > 0) {
    lines.push("", "## Attention", "");
    for (const id of summary.attentionCapabilityIds) lines.push("- " + id);
  }
  lines.push("", "This report is generated locally and does not call paid APIs, hosted model providers, SaaS, or cloud services.", "");
  return lines.join("\n");
}
