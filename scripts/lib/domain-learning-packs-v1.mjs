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

export const DEFAULT_CURRICULUM_SUMMARY = {
  curriculumId: "phase28_curriculum_builder_plan",
  moduleCount: 5,
  gapCount: 5,
  moduleIds: [
    "module_safety_01",
    "module_retrieval_02",
    "module_coding_03",
    "module_phase_execution_04",
    "module_tool_governance_05"
  ],
  categories: ["safety", "retrieval", "coding", "phase_execution", "tool_governance"],
  ownerApprovalRequiredForCurriculumChanges: true,
  ownerApprovalRequiredForLearningActivation: true
};

export const DEFAULT_REGRESSION_BASELINE_SUMMARY = {
  registryId: "phase27_regression_baseline_registry",
  baselineCount: 5,
  baselineIds: [
    "baseline_coding_validation_gate",
    "baseline_retrieval_citations",
    "baseline_tool_governance",
    "baseline_phase_execution",
    "baseline_remote_safety"
  ],
  ownerApprovalRequiredForBaselineChanges: true
};

export const DEFAULT_DOMAIN_PACKS = [
  {
    packId: "domain_local_agent_engineering",
    category: "coding",
    priority: "high",
    title: "Local Agent Engineering",
    purpose: "Improve S.E.R.A.'s ability to design local-first agent code with validation gates, rollback expectations, and evidence artifacts.",
    curriculumModuleId: "module_coding_03",
    baselineId: "baseline_coding_validation_gate",
    prerequisites: ["phase packet discipline", "validation gate awareness", "rollback safety"],
    sourceRequirements: ["phase documentation", "integration tests", "source map coverage"],
    learningObjectives: ["preserve local-first boundaries", "write validation-first plans", "avoid source mutation without approval"],
    evaluationHooks: ["phase26_default_evaluation_suite:coding", "phase27_regression_baseline_registry:baseline_coding_validation_gate"]
  },
  {
    packId: "domain_retrieval_source_trust",
    category: "retrieval",
    priority: "high",
    title: "Retrieval and Source Trust",
    purpose: "Improve source-of-truth separation, citation discipline, uncertainty handling, and knowledge freshness reasoning.",
    curriculumModuleId: "module_retrieval_02",
    baselineId: "baseline_retrieval_citations",
    prerequisites: ["local knowledge ingestion", "source map coverage", "citation discipline"],
    sourceRequirements: ["trusted docs", "source map", "evidence reports"],
    learningObjectives: ["distinguish trusted sources", "surface uncertainty", "avoid unsupported claims"],
    evaluationHooks: ["phase26_default_evaluation_suite:retrieval", "phase27_regression_baseline_registry:baseline_retrieval_citations"]
  },
  {
    packId: "domain_tool_governance",
    category: "tool_governance",
    priority: "medium",
    title: "Tool Governance",
    purpose: "Improve safe tool classification, optional adapter reasoning, secret avoidance, and owner approval boundaries.",
    curriculumModuleId: "module_tool_governance_05",
    baselineId: "baseline_tool_governance",
    prerequisites: ["tool registry", "capability graph", "approval boundaries"],
    sourceRequirements: ["tool registry evidence", "capability registry evidence", "package boundaries"],
    learningObjectives: ["classify local and guarded tools", "block unsafe adapters", "preserve free-core rules"],
    evaluationHooks: ["phase26_default_evaluation_suite:tool_governance", "phase27_regression_baseline_registry:baseline_tool_governance"]
  },
  {
    packId: "domain_client_service_delivery",
    category: "business_operations",
    priority: "high",
    title: "Client Service Delivery",
    purpose: "Prepare S.E.R.A. to support revenue workflows such as website audits, automation maps, CRM plans, research briefs, and proposal packets.",
    curriculumModuleId: "module_phase_execution_04",
    baselineId: "baseline_phase_execution",
    prerequisites: ["phase execution planning", "evidence reports", "client-safe boundaries"],
    sourceRequirements: ["project templates", "service workflow docs", "validation evidence"],
    learningObjectives: ["structure deliverables", "separate drafts from approved outputs", "preserve client confidentiality"],
    evaluationHooks: ["phase26_default_evaluation_suite:phase_execution", "phase27_regression_baseline_registry:baseline_phase_execution"]
  },
  {
    packId: "domain_creative_studio_worldbuilding",
    category: "creative_studio",
    priority: "high",
    title: "Creative Studio and Worldbuilding",
    purpose: "Prepare S.E.R.A. to support brand systems, worldbuilding, creative strategy, experience concepts, and emotionally coherent pitch materials.",
    curriculumModuleId: "module_safety_01",
    baselineId: "baseline_remote_safety",
    prerequisites: ["owner approval", "brand source-of-truth separation", "evidence-first planning"],
    sourceRequirements: ["approved brand docs", "world thesis docs", "creative constraints"],
    learningObjectives: ["preserve source truth", "avoid invented brand facts", "prepare creative work for owner review"],
    evaluationHooks: ["phase26_default_evaluation_suite:safety", "phase27_regression_baseline_registry:baseline_remote_safety"]
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
  ownerApprovalRequiredForPackChanges: true,
  ownerApprovalRequiredForPackActivation: true,
  packActivationAllowed: false
};

export class DomainLearningPacks {
  constructor(options = {}) {
    this.rootDir = options.rootDir || process.cwd();
    this.runtimeDir = options.runtimeDir || path.join(this.rootDir, ".sera-domain-packs");
    this.packDir = path.join(this.runtimeDir, "packs");
    this.reportDir = path.join(this.runtimeDir, "reports");
    this.eventPath = path.join(this.runtimeDir, "events.jsonl");
    this.defaultRegistryPath = path.join(this.packDir, "phase29-domain-learning-packs.json");
    this.summaryPath = path.join(this.reportDir, "domain-learning-packs-summary.json");
    this.markdownPath = path.join(this.reportDir, "domain-learning-packs-summary.md");
    this.historyPath = path.join(this.reportDir, "domain-learning-packs-history.jsonl");
  }

  initialize() {
    ensureDir(this.runtimeDir);
    ensureDir(this.packDir);
    ensureDir(this.reportDir);
    if (!fs.existsSync(this.eventPath)) fs.writeFileSync(this.eventPath, "", "utf8");
    const result = {
      ok: true,
      status: "completed",
      schemaVersion: 1,
      runtimeDir: this.runtimeDir,
      packDir: this.packDir,
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
    const packs = (overrides.packs || DEFAULT_DOMAIN_PACKS).map((pack) => ({
      ...pack,
      activationStatus: "planned",
      ownerApprovalRequiredForActivation: true,
      sourceMutationAllowed: false,
      secretsRequired: false,
      cloudRequired: false,
      paidProviderRequired: false
    }));
    const registry = {
      registryVersion: 1,
      registryId: overrides.registryId || "phase29_domain_learning_pack_registry",
      name: overrides.name || "S.E.R.A. Phase 29 Domain Learning Pack Registry",
      purpose: "Package curriculum learning paths into domain-specific packs that remain local, evidence-first, and owner-approved before activation.",
      createdAt: new Date().toISOString(),
      curriculum: overrides.curriculum || DEFAULT_CURRICULUM_SUMMARY,
      regressionBaselines: overrides.regressionBaselines || DEFAULT_REGRESSION_BASELINE_SUMMARY,
      boundaries: { ...REQUIRED_BOUNDARIES, ...(overrides.boundaries || {}) },
      packs
    };
    registry.registryHash = sha256(JSON.stringify({
      registryVersion: registry.registryVersion,
      registryId: registry.registryId,
      packs: registry.packs.map((pack) => ({ packId: pack.packId, category: pack.category, baselineId: pack.baselineId, curriculumModuleId: pack.curriculumModuleId })),
      boundaries: registry.boundaries
    }));
    writeJson(this.defaultRegistryPath, registry);
    this.recordEvent("registry_created", { registryId: registry.registryId, packCount: registry.packs.length });
    return registry;
  }

  validateRegistry(registry) {
    const checks = [];
    const add = (id, passed, detail) => checks.push({ id, passed, detail });
    add("registry_version", registry.registryVersion === 1, "Registry version is 1.");
    add("minimum_packs", Array.isArray(registry.packs) && registry.packs.length >= 5, "At least five domain packs exist.");
    add("curriculum_connected", !!registry.curriculum && registry.curriculum.moduleCount >= 5, "Registry connects to Phase 28 curriculum.");
    add("baselines_connected", !!registry.regressionBaselines && registry.regressionBaselines.baselineCount >= 5, "Registry connects to Phase 27 baselines.");
    add("local_only", registry.boundaries.localOnly === true, "Registry is local-only.");
    add("no_paid_provider", registry.boundaries.paidProviderRequired === false, "No paid provider required.");
    add("no_cloud", registry.boundaries.cloudRequired === false, "No cloud required.");
    add("no_free_core_dependency", registry.boundaries.freeCoreDependency === false, "No free-core dependency added.");
    add("no_source_mutation", registry.boundaries.mutatesSource === false, "No source mutation allowed.");
    add("no_secrets", registry.boundaries.requiresSecrets === false, "No secrets required.");
    add("no_arbitrary_execution", registry.boundaries.executesArbitraryCode === false, "No arbitrary code execution.");
    add("owner_approval_for_pack_changes", registry.boundaries.ownerApprovalRequiredForPackChanges === true, "Owner approval required for pack changes.");
    add("owner_approval_for_activation", registry.boundaries.ownerApprovalRequiredForPackActivation === true, "Owner approval required for pack activation.");
    add("activation_disabled_by_default", registry.boundaries.packActivationAllowed === false, "Pack activation is disabled by default.");

    for (const pack of registry.packs || []) {
      add(pack.packId + ":has_objectives", Array.isArray(pack.learningObjectives) && pack.learningObjectives.length >= 3, "Pack has at least three learning objectives.");
      add(pack.packId + ":has_sources", Array.isArray(pack.sourceRequirements) && pack.sourceRequirements.length >= 3, "Pack has source requirements.");
      add(pack.packId + ":has_hooks", Array.isArray(pack.evaluationHooks) && pack.evaluationHooks.length >= 2, "Pack has evaluation hooks.");
      add(pack.packId + ":owner_approval", pack.ownerApprovalRequiredForActivation === true, "Pack requires owner approval before activation.");
      add(pack.packId + ":safe_boundary", pack.sourceMutationAllowed === false && pack.requiresSecrets !== true && pack.cloudRequired === false && pack.paidProviderRequired === false, "Pack preserves safe boundary.");
    }

    const failed = checks.filter((check) => !check.passed);
    return {
      ok: failed.length === 0,
      status: failed.length === 0 ? "passed" : "attention_required",
      checkCount: checks.length,
      passedCount: checks.length - failed.length,
      failedCount: failed.length,
      checks,
      blockers: failed.map((check) => check.id)
    };
  }

  summarizeRegistry(registry) {
    const categories = unique(registry.packs.map((pack) => pack.category));
    const sourceRequirements = registry.packs.flatMap((pack) => pack.sourceRequirements || []);
    const plannedPacks = registry.packs.filter((pack) => pack.activationStatus === "planned");
    const missingCurriculum = registry.packs.filter((pack) => !pack.curriculumModuleId);
    const missingBaseline = registry.packs.filter((pack) => !pack.baselineId);
    const summaryChecks = [
      { id: "category_breadth", passed: categories.length >= 5, detail: "Domain packs cover at least five categories." },
      { id: "planned_not_active", passed: plannedPacks.length === registry.packs.length, detail: "All packs are planned, not activated." },
      { id: "curriculum_links", passed: missingCurriculum.length === 0, detail: "All packs link to curriculum modules." },
      { id: "baseline_links", passed: missingBaseline.length === 0, detail: "All packs link to regression baselines." }
    ];
    const blockers = summaryChecks.filter((check) => !check.passed).map((check) => check.id);
    return {
      ok: blockers.length === 0,
      status: blockers.length === 0 ? "ready" : "attention_required",
      summaryCheckCount: summaryChecks.length,
      passedSummaryCheckCount: summaryChecks.filter((check) => check.passed).length,
      failedSummaryCheckCount: blockers.length,
      summaryChecks,
      blockers,
      categories,
      sourceRequirementCount: sourceRequirements.length,
      plannedPackCount: plannedPacks.length,
      missingCurriculumPackIds: missingCurriculum.map((pack) => pack.packId),
      missingBaselinePackIds: missingBaseline.map((pack) => pack.packId)
    };
  }

  writeSummaryArtifacts(options = {}) {
    this.initialize();
    const registry = options.registry || this.createDefaultRegistry(options.registryOptions || {});
    const validation = this.validateRegistry(registry);
    const registrySummary = this.summarizeRegistry(registry);
    const allBlockers = [...validation.blockers, ...registrySummary.blockers];
    const summary = {
      ok: allBlockers.length === 0,
      status: allBlockers.length === 0 ? "passed" : "attention_required",
      init: {
        ok: true,
        status: "completed",
        schemaVersion: 1,
        runtimeDir: this.runtimeDir,
        packDir: this.packDir,
        eventPath: this.eventPath,
        reportDir: this.reportDir,
        defaultRegistryPath: this.defaultRegistryPath
      },
      registryPath: this.defaultRegistryPath,
      registryId: registry.registryId,
      registryHash: registry.registryHash,
      packCount: registry.packs.length,
      categoryCount: registrySummary.categories.length,
      sourceRequirementCount: registrySummary.sourceRequirementCount,
      validationCheckCount: validation.checkCount,
      validationPassedCount: validation.passedCount,
      validationFailedCount: validation.failedCount,
      summaryCheckCount: registrySummary.summaryCheckCount,
      passedSummaryCheckCount: registrySummary.passedSummaryCheckCount,
      failedSummaryCheckCount: registrySummary.failedSummaryCheckCount,
      plannedPackCount: registrySummary.plannedPackCount,
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
      ownerApprovalRequiredForPackChanges: registry.boundaries.ownerApprovalRequiredForPackChanges,
      ownerApprovalRequiredForPackActivation: registry.boundaries.ownerApprovalRequiredForPackActivation,
      packActivationAllowed: registry.boundaries.packActivationAllowed,
      packIds: registry.packs.map((pack) => pack.packId),
      categories: registrySummary.categories
    };
    writeJson(this.summaryPath, summary);
    fs.writeFileSync(this.markdownPath, renderMarkdown(summary), "utf8");
    appendJsonl(this.historyPath, { createdAt: new Date().toISOString(), ...summary });
    this.recordEvent("summary_written", { status: summary.status, packCount: summary.packCount, blockers: summary.blockers });
    return summary;
  }
}

function renderMarkdown(summary) {
  return [
    "# S.E.R.A. Domain Learning Packs Summary",
    "",
    "- Status: " + summary.status,
    "- Registry: " + summary.registryId,
    "- Packs: " + summary.packCount,
    "- Categories: " + summary.categories.join(", "),
    "- Source requirements: " + summary.sourceRequirementCount,
    "- Planned packs: " + summary.plannedPackCount,
    "- Blockers: " + (summary.blockers.length ? summary.blockers.join(", ") : "none"),
    "- Local only: " + summary.localOnly,
    "- Paid provider required: " + summary.paidProviderRequired,
    "- Cloud required: " + summary.cloudRequired,
    "- Mutates source: " + summary.mutatesSource,
    "- Requires secrets: " + summary.requiresSecrets,
    "- Executes arbitrary code: " + summary.executesArbitraryCode,
    "- Pack activation allowed: " + summary.packActivationAllowed,
    "- Owner approval required for pack changes: " + summary.ownerApprovalRequiredForPackChanges,
    "- Owner approval required for pack activation: " + summary.ownerApprovalRequiredForPackActivation,
    ""
  ].join("\n");
}
