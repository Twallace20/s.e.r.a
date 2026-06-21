import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeJson(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + "\n", "utf8");
}

function appendJsonl(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.appendFileSync(filePath, JSON.stringify(value) + "\n", "utf8");
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function unique(values) {
  return Array.from(new Set(values));
}

export const DEFAULT_DOMAIN_PACK_SUMMARY = {
  registryId: "phase29_domain_learning_pack_registry",
  packCount: 5,
  packActivationAllowed: false,
  ownerApprovalRequiredForPackChanges: true,
  ownerApprovalRequiredForPackActivation: true,
  packIds: [
    "domain_local_agent_engineering",
    "domain_retrieval_source_trust",
    "domain_tool_governance",
    "domain_client_service_delivery",
    "domain_creative_studio_worldbuilding"
  ]
};

export const DEFAULT_SOURCE_TRUST_ENTRIES = [
  {
    sourceId: "truth_phase_docs",
    title: "Phase Documentation",
    domain: "repo_truth",
    relativePath: "docs/phases",
    trustLevel: "source_of_truth",
    freshnessState: "current",
    refreshCadence: "per_phase",
    evidenceRequired: true,
    allowedUse: ["phase planning", "completion proof", "roadmap alignment"],
    ownerApprovalRequiredForDemotion: true
  },
  {
    sourceId: "truth_source_map",
    title: "Knowledge Source Map",
    domain: "knowledge_governance",
    relativePath: "docs/knowledge/SOURCE_MAP.md",
    trustLevel: "source_of_truth",
    freshnessState: "current",
    refreshCadence: "per_phase",
    evidenceRequired: true,
    allowedUse: ["knowledge coverage", "trusted source listing", "ingestion proof"],
    ownerApprovalRequiredForDemotion: true
  },
  {
    sourceId: "truth_build_validation",
    title: "Build Validation Guide",
    domain: "validation",
    relativePath: "docs/BUILD_VALIDATION.md",
    trustLevel: "source_of_truth",
    freshnessState: "current",
    refreshCadence: "per_phase",
    evidenceRequired: true,
    allowedUse: ["validation commands", "expected proof", "certification expectations"],
    ownerApprovalRequiredForDemotion: true
  },
  {
    sourceId: "implementation_scripts",
    title: "Implementation Scripts",
    domain: "implementation",
    relativePath: "scripts/lib",
    trustLevel: "implementation_evidence",
    freshnessState: "current",
    refreshCadence: "per_phase",
    evidenceRequired: true,
    allowedUse: ["code behavior", "boundary validation", "runtime reports"],
    ownerApprovalRequiredForDemotion: true
  },
  {
    sourceId: "integration_tests",
    title: "Integration Tests",
    domain: "validation",
    relativePath: "tests/integration",
    trustLevel: "test_evidence",
    freshnessState: "current",
    refreshCadence: "per_phase",
    evidenceRequired: true,
    allowedUse: ["regression checks", "behavior proof", "safety proof"],
    ownerApprovalRequiredForDemotion: true
  },
  {
    sourceId: "roadmap_docs",
    title: "Roadmap Documents",
    domain: "planning",
    relativePath: "docs/roadmap",
    trustLevel: "planning_evidence",
    freshnessState: "current",
    refreshCadence: "per_phase",
    evidenceRequired: true,
    allowedUse: ["sequence planning", "milestone visibility", "future phase alignment"],
    ownerApprovalRequiredForDemotion: true
  },
  {
    sourceId: "runtime_reports",
    title: "Local Runtime Reports",
    domain: "evidence",
    relativePath: ".sera-*/reports",
    trustLevel: "runtime_evidence",
    freshnessState: "generated",
    refreshCadence: "per_run",
    evidenceRequired: true,
    allowedUse: ["local evidence", "run summaries", "blocker discovery"],
    ownerApprovalRequiredForDemotion: true
  },
  {
    sourceId: "external_references_placeholder",
    title: "External References Placeholder",
    domain: "external_research",
    relativePath: "none-local-placeholder",
    trustLevel: "requires_review",
    freshnessState: "unverified",
    refreshCadence: "owner_requested",
    evidenceRequired: true,
    allowedUse: ["future cited research only after review"],
    ownerApprovalRequiredForDemotion: true
  }
];

const REQUIRED_BOUNDARIES = {
  localOnly: true,
  paidProviderRequired: false,
  cloudRequired: false,
  freeCoreDependency: false,
  mutatesSource: false,
  requiresSecrets: false,
  executesArbitraryCode: false,
  performsNetworkRefresh: false,
  ownerApprovalRequiredForTrustChanges: true,
  ownerApprovalRequiredForExternalSources: true,
  staleSourceUseAllowedWithoutReview: false
};

export class KnowledgeRefreshSourceTrust {
  constructor(options = {}) {
    this.rootDir = options.rootDir || process.cwd();
    this.runtimeDir = options.runtimeDir || path.join(this.rootDir, ".sera-source-trust");
    this.registryDir = path.join(this.runtimeDir, "registries");
    this.reportDir = path.join(this.runtimeDir, "reports");
    this.eventPath = path.join(this.runtimeDir, "events.jsonl");
    this.defaultRegistryPath = path.join(this.registryDir, "phase30-source-trust-registry.json");
    this.summaryPath = path.join(this.reportDir, "knowledge-refresh-source-trust-summary.json");
    this.markdownPath = path.join(this.reportDir, "knowledge-refresh-source-trust-summary.md");
    this.historyPath = path.join(this.reportDir, "knowledge-refresh-source-trust-history.jsonl");
  }

  initialize() {
    ensureDir(this.runtimeDir);
    ensureDir(this.registryDir);
    ensureDir(this.reportDir);
    if (!fs.existsSync(this.eventPath)) fs.writeFileSync(this.eventPath, "", "utf8");
    const result = {
      ok: true,
      status: "completed",
      schemaVersion: 1,
      runtimeDir: this.runtimeDir,
      registryDir: this.registryDir,
      eventPath: this.eventPath,
      reportDir: this.reportDir,
      defaultRegistryPath: this.defaultRegistryPath
    };
    this.recordEvent("initialized", result);
    return result;
  }

  recordEvent(type, data = {}) {
    appendJsonl(this.eventPath, { type, createdAt: new Date().toISOString(), ...data });
  }

  createDefaultRegistry(overrides = {}) {
    const sources = (overrides.sources || DEFAULT_SOURCE_TRUST_ENTRIES).map((source) => ({
      ...source,
      activationStatus: source.trustLevel === "requires_review" ? "review_required" : "trusted",
      sourceMutationAllowed: false,
      secretsRequired: false,
      cloudRequired: false,
      paidProviderRequired: false,
      networkRefreshAllowed: false
    }));
    const registry = {
      registryVersion: 1,
      registryId: overrides.registryId || "phase30_knowledge_refresh_source_trust_registry",
      name: overrides.name || "S.E.R.A. Phase 30 Knowledge Refresh + Source Trust Registry",
      purpose: "Separate trusted, current, generated, and review-required knowledge sources before learning packs or future remote work rely on them.",
      createdAt: new Date().toISOString(),
      domainLearningPacks: overrides.domainLearningPacks || DEFAULT_DOMAIN_PACK_SUMMARY,
      boundaries: { ...REQUIRED_BOUNDARIES, ...(overrides.boundaries || {}) },
      sources,
      refreshPolicy: {
        defaultCadence: "per_phase",
        allowNetworkRefresh: false,
        ownerApprovalRequiredForExternalRefresh: true,
        staleSourceReviewRequired: true,
        requireEvidenceBeforeTrustUpgrade: true
      }
    };
    registry.registryHash = sha256(JSON.stringify({
      registryVersion: registry.registryVersion,
      registryId: registry.registryId,
      sources: registry.sources.map((source) => ({ sourceId: source.sourceId, trustLevel: source.trustLevel, freshnessState: source.freshnessState, refreshCadence: source.refreshCadence })),
      boundaries: registry.boundaries,
      refreshPolicy: registry.refreshPolicy
    }));
    writeJson(this.defaultRegistryPath, registry);
    this.recordEvent("registry_created", { registryId: registry.registryId, sourceCount: registry.sources.length });
    return registry;
  }

  validateRegistry(registry) {
    const checks = [];
    const add = (id, passed, detail) => checks.push({ id, passed, detail });
    add("registry_version", registry.registryVersion === 1, "Registry version is 1.");
    add("minimum_sources", Array.isArray(registry.sources) && registry.sources.length >= 8, "At least eight source trust entries exist.");
    add("domain_packs_connected", !!registry.domainLearningPacks && registry.domainLearningPacks.packCount >= 5, "Registry connects to Phase 29 domain packs.");
    add("local_only", registry.boundaries.localOnly === true, "Registry is local-only.");
    add("no_paid_provider", registry.boundaries.paidProviderRequired === false, "No paid provider required.");
    add("no_cloud", registry.boundaries.cloudRequired === false, "No cloud required.");
    add("no_free_core_dependency", registry.boundaries.freeCoreDependency === false, "No free-core dependency added.");
    add("no_source_mutation", registry.boundaries.mutatesSource === false, "No source mutation allowed.");
    add("no_secrets", registry.boundaries.requiresSecrets === false, "No secrets required.");
    add("no_arbitrary_execution", registry.boundaries.executesArbitraryCode === false, "No arbitrary code execution.");
    add("no_network_refresh", registry.boundaries.performsNetworkRefresh === false, "No network refresh is performed.");
    add("owner_approval_for_trust_changes", registry.boundaries.ownerApprovalRequiredForTrustChanges === true, "Owner approval required for source trust changes.");
    add("owner_approval_for_external_sources", registry.boundaries.ownerApprovalRequiredForExternalSources === true, "Owner approval required for external sources.");
    add("stale_source_review_required", registry.boundaries.staleSourceUseAllowedWithoutReview === false, "Stale source use without review is blocked.");
    add("refresh_policy_blocks_network", registry.refreshPolicy.allowNetworkRefresh === false, "Refresh policy blocks network refresh.");
    add("refresh_policy_requires_evidence", registry.refreshPolicy.requireEvidenceBeforeTrustUpgrade === true, "Evidence required before trust upgrades.");

    const sourceIds = registry.sources.map((source) => source.sourceId);
    add("unique_source_ids", unique(sourceIds).length === sourceIds.length, "Source IDs are unique.");

    for (const source of registry.sources) {
      add(source.sourceId + "_has_relative_path", typeof source.relativePath === "string" && source.relativePath.length > 0, source.sourceId + " has a relative path or explicit placeholder.");
      add(source.sourceId + "_has_allowed_use", Array.isArray(source.allowedUse) && source.allowedUse.length >= 1, source.sourceId + " has allowed-use guidance.");
      add(source.sourceId + "_requires_evidence", source.evidenceRequired === true, source.sourceId + " requires evidence.");
      add(source.sourceId + "_no_mutation", source.sourceMutationAllowed === false, source.sourceId + " does not allow source mutation.");
      add(source.sourceId + "_no_secret_dependency", source.secretsRequired === false, source.sourceId + " does not require secrets.");
      add(source.sourceId + "_no_network_refresh", source.networkRefreshAllowed === false, source.sourceId + " does not perform network refresh.");
    }

    const failed = checks.filter((check) => !check.passed);
    const result = {
      ok: failed.length === 0,
      status: failed.length === 0 ? "passed" : "failed",
      checkCount: checks.length,
      passedCount: checks.length - failed.length,
      failedCount: failed.length,
      checks,
      blockers: failed.map((check) => check.id)
    };
    this.recordEvent("registry_validated", { status: result.status, failedCount: result.failedCount });
    return result;
  }

  summarizeRegistry(registry) {
    const trustLevels = unique(registry.sources.map((source) => source.trustLevel));
    const freshnessStates = unique(registry.sources.map((source) => source.freshnessState));
    const trustedSourceCount = registry.sources.filter((source) => ["source_of_truth", "implementation_evidence", "test_evidence", "planning_evidence", "runtime_evidence"].includes(source.trustLevel)).length;
    const reviewRequiredSourceCount = registry.sources.filter((source) => source.trustLevel === "requires_review" || source.freshnessState === "unverified").length;
    const currentSourceCount = registry.sources.filter((source) => source.freshnessState === "current").length;
    const generatedSourceCount = registry.sources.filter((source) => source.freshnessState === "generated").length;
    const networkRefreshAllowedCount = registry.sources.filter((source) => source.networkRefreshAllowed === true).length;
    const sourceMutationAllowedCount = registry.sources.filter((source) => source.sourceMutationAllowed === true).length;
    const missingEvidenceSourceIds = registry.sources.filter((source) => source.evidenceRequired !== true).map((source) => source.sourceId);
    const staleWithoutReviewSourceIds = registry.sources.filter((source) => source.freshnessState === "stale" && source.trustLevel !== "requires_review").map((source) => source.sourceId);

    const summaryChecks = [];
    const add = (id, passed, detail) => summaryChecks.push({ id, passed, detail });
    add("trusted_sources_present", trustedSourceCount >= 6, "At least six trusted or evidence-backed sources are present.");
    add("review_sources_identified", reviewRequiredSourceCount >= 1, "Review-required sources are identified.");
    add("no_network_refresh_sources", networkRefreshAllowedCount === 0, "No source performs network refresh.");
    add("no_mutating_sources", sourceMutationAllowedCount === 0, "No source allows mutation.");
    add("all_sources_require_evidence", missingEvidenceSourceIds.length === 0, "All sources require evidence.");
    add("no_stale_sources_without_review", staleWithoutReviewSourceIds.length === 0, "No stale source is trusted without review.");

    const failed = summaryChecks.filter((check) => !check.passed);
    return {
      ok: failed.length === 0,
      status: failed.length === 0 ? "passed" : "failed",
      trustLevels,
      freshnessStates,
      trustedSourceCount,
      reviewRequiredSourceCount,
      currentSourceCount,
      generatedSourceCount,
      networkRefreshAllowedCount,
      sourceMutationAllowedCount,
      missingEvidenceSourceIds,
      staleWithoutReviewSourceIds,
      summaryCheckCount: summaryChecks.length,
      passedSummaryCheckCount: summaryChecks.length - failed.length,
      failedSummaryCheckCount: failed.length,
      summaryChecks,
      blockers: failed.map((check) => check.id)
    };
  }

  writeSummaryArtifacts(overrides = {}) {
    const init = this.initialize();
    const registry = this.createDefaultRegistry(overrides);
    const validation = this.validateRegistry(registry);
    const registrySummary = this.summarizeRegistry(registry);
    const allBlockers = [...validation.blockers, ...registrySummary.blockers];
    const summary = {
      ok: allBlockers.length === 0,
      status: allBlockers.length === 0 ? "passed" : "failed",
      init,
      registryPath: this.defaultRegistryPath,
      registryId: registry.registryId,
      registryHash: registry.registryHash,
      sourceCount: registry.sources.length,
      trustLevelCount: registrySummary.trustLevels.length,
      freshnessStateCount: registrySummary.freshnessStates.length,
      validationCheckCount: validation.checkCount,
      validationPassedCount: validation.passedCount,
      validationFailedCount: validation.failedCount,
      summaryCheckCount: registrySummary.summaryCheckCount,
      passedSummaryCheckCount: registrySummary.passedSummaryCheckCount,
      failedSummaryCheckCount: registrySummary.failedSummaryCheckCount,
      trustedSourceCount: registrySummary.trustedSourceCount,
      reviewRequiredSourceCount: registrySummary.reviewRequiredSourceCount,
      currentSourceCount: registrySummary.currentSourceCount,
      generatedSourceCount: registrySummary.generatedSourceCount,
      blockers: allBlockers,
      jsonPath: this.summaryPath,
      markdownPath: this.markdownPath,
      historyPath: this.historyPath,
      localOnly: registry.boundaries.localOnly,
      paidProviderRequired: registry.boundaries.paidProviderRequired,
      cloudRequired: registry.boundaries.cloudRequired,
      freeCoreDependency: registry.boundaries.freeCoreDependency,
      mutatesSource: registry.boundaries.mutatesSource,
      requiresSecrets: registry.boundaries.requiresSecrets,
      executesArbitraryCode: registry.boundaries.executesArbitraryCode,
      performsNetworkRefresh: registry.boundaries.performsNetworkRefresh,
      ownerApprovalRequiredForTrustChanges: registry.boundaries.ownerApprovalRequiredForTrustChanges,
      ownerApprovalRequiredForExternalSources: registry.boundaries.ownerApprovalRequiredForExternalSources,
      staleSourceUseAllowedWithoutReview: registry.boundaries.staleSourceUseAllowedWithoutReview,
      sourceIds: registry.sources.map((source) => source.sourceId),
      trustLevels: registrySummary.trustLevels,
      freshnessStates: registrySummary.freshnessStates
    };
    writeJson(this.summaryPath, summary);
    fs.writeFileSync(this.markdownPath, renderMarkdown(summary), "utf8");
    appendJsonl(this.historyPath, { createdAt: new Date().toISOString(), ...summary });
    this.recordEvent("summary_written", { status: summary.status, sourceCount: summary.sourceCount, blockers: summary.blockers });
    return summary;
  }
}

function renderMarkdown(summary) {
  return [
    "# S.E.R.A. Knowledge Refresh + Source Trust Summary",
    "",
    "- Status: " + summary.status,
    "- Registry: " + summary.registryId,
    "- Sources: " + summary.sourceCount,
    "- Trust levels: " + summary.trustLevels.join(", "),
    "- Freshness states: " + summary.freshnessStates.join(", "),
    "- Trusted sources: " + summary.trustedSourceCount,
    "- Review-required sources: " + summary.reviewRequiredSourceCount,
    "- Current sources: " + summary.currentSourceCount,
    "- Generated sources: " + summary.generatedSourceCount,
    "- Blockers: " + (summary.blockers.length ? summary.blockers.join(", ") : "none"),
    "- Local only: " + summary.localOnly,
    "- Paid provider required: " + summary.paidProviderRequired,
    "- Cloud required: " + summary.cloudRequired,
    "- Mutates source: " + summary.mutatesSource,
    "- Requires secrets: " + summary.requiresSecrets,
    "- Executes arbitrary code: " + summary.executesArbitraryCode,
    "- Performs network refresh: " + summary.performsNetworkRefresh,
    "- Owner approval required for trust changes: " + summary.ownerApprovalRequiredForTrustChanges,
    "- Owner approval required for external sources: " + summary.ownerApprovalRequiredForExternalSources,
    "- Stale source use allowed without review: " + summary.staleSourceUseAllowedWithoutReview,
    ""
  ].join("\n");
}
