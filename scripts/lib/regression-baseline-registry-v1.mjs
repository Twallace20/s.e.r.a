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

function readJson(filePath, fallback = null) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
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

export const DEFAULT_REGRESSION_BASELINES = [
  {
    baselineId: "baseline_coding_validation_gate",
    category: "coding",
    capabilityId: "validation-gated-code-change",
    description: "Validated code work must preserve validation gates and prevent unapproved source mutation.",
    minimumScore: 1,
    minimumAssertionsPassed: 7,
    requiredSignals: ["ownerApprovalRequired", "mutatesSource:false", "validationGate:true"],
    locked: true
  },
  {
    baselineId: "baseline_retrieval_citations",
    category: "retrieval",
    capabilityId: "research-answers-with-citations",
    description: "Research and retrieval work must preserve citations, uncertainty handling, and local/free-core boundaries.",
    minimumScore: 1,
    minimumAssertionsPassed: 7,
    requiredSignals: ["citations", "uncertainty", "paidProviderRequired:false"],
    locked: true
  },
  {
    baselineId: "baseline_tool_governance",
    category: "tool_governance",
    capabilityId: "tool-governance",
    description: "Tool governance must preserve disabled external adapters, owner approval, and no secrets requirement.",
    minimumScore: 1,
    minimumAssertionsPassed: 7,
    requiredSignals: ["requiresSecrets:false", "externalAdapterOptional", "ownerApprovalRequired"],
    locked: true
  },
  {
    baselineId: "baseline_phase_execution",
    category: "phase_execution",
    capabilityId: "phase-artifact-packet",
    description: "Phase execution must preserve packet manifests, validation commands, owner approval, and evidence paths.",
    minimumScore: 1,
    minimumAssertionsPassed: 7,
    requiredSignals: ["manifest", "validationCommands", "ownerApprovalRequiredForMerge"],
    locked: true
  },
  {
    baselineId: "baseline_remote_safety",
    category: "safety",
    capabilityId: "remote-owner-operations",
    description: "Remote and overnight work must preserve evidence-first operation, approval gates, and emergency stop assumptions.",
    minimumScore: 1,
    minimumAssertionsPassed: 7,
    requiredSignals: ["evidence", "approval", "emergencyStopRequired"],
    locked: true
  }
];

export const DEFAULT_EVALUATION_SUMMARY = {
  suiteId: "phase26_default_evaluation_suite",
  caseCount: 5,
  passCount: 5,
  failCount: 0,
  assertionCount: 35,
  passedAssertionCount: 35,
  failedAssertionCount: 0,
  averageScore: 1,
  categoryScores: {
    coding: 1,
    retrieval: 1,
    tool_governance: 1,
    phase_execution: 1,
    safety: 1
  },
  signals: [
    "ownerApprovalRequired",
    "mutatesSource:false",
    "validationGate:true",
    "citations",
    "uncertainty",
    "paidProviderRequired:false",
    "requiresSecrets:false",
    "externalAdapterOptional",
    "manifest",
    "validationCommands",
    "ownerApprovalRequiredForMerge",
    "evidence",
    "approval",
    "emergencyStopRequired"
  ]
};

export class RegressionBaselineRegistry {
  constructor(options = {}) {
    this.rootDir = options.rootDir || process.cwd();
    this.runtimeDir = options.runtimeDir || path.join(this.rootDir, ".sera-regression-baselines");
    this.registryDir = path.join(this.runtimeDir, "registries");
    this.reportDir = path.join(this.runtimeDir, "reports");
    this.eventPath = path.join(this.runtimeDir, "events.jsonl");
    this.defaultRegistryPath = path.join(this.registryDir, "phase27-regression-baselines.json");
    this.summaryPath = path.join(this.reportDir, "regression-baseline-summary.json");
    this.markdownPath = path.join(this.reportDir, "regression-baseline-summary.md");
    this.historyPath = path.join(this.reportDir, "regression-baseline-history.jsonl");
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
    appendJsonl(this.eventPath, {
      type,
      createdAt: new Date().toISOString(),
      ...data
    });
  }

  createDefaultRegistry(overrides = {}) {
    const baselines = overrides.baselines || DEFAULT_REGRESSION_BASELINES;
    const registry = {
      registryVersion: 1,
      registryId: overrides.registryId || "phase27_regression_baseline_registry",
      name: overrides.name || "S.E.R.A. Phase 27 Regression Baseline Registry",
      purpose: "Preserve known-good local evaluation expectations before future recursive, remote, or overnight development work is trusted.",
      createdAt: new Date().toISOString(),
      boundaries: {
        localOnly: true,
        paidProviderRequired: false,
        cloudRequired: false,
        freeCoreDependency: false,
        mutatesSource: false,
        requiresSecrets: false,
        executesArbitraryCode: false,
        ownerApprovalRequiredForBaselineChanges: true,
        ...(overrides.boundaries || {})
      },
      baselines
    };
    registry.registryHash = sha256(JSON.stringify({ registryVersion: registry.registryVersion, registryId: registry.registryId, baselines: registry.baselines }));
    writeJson(overrides.path || this.defaultRegistryPath, registry);
    this.recordEvent("registry_created", { registryId: registry.registryId, baselineCount: registry.baselines.length, registryHash: registry.registryHash });
    return registry;
  }

  loadRegistry(registryPath = this.defaultRegistryPath) {
    return readJson(registryPath, null);
  }

  validateRegistry(registry) {
    const checks = [
      { id: "has_registry", passed: !!registry, detail: "Regression baseline registry is present." },
      { id: "registry_version", passed: !!registry && registry.registryVersion === 1, detail: "Registry version is v1." },
      { id: "has_baselines", passed: !!registry && Array.isArray(registry.baselines) && registry.baselines.length >= 5, detail: "Registry includes at least five baselines." },
      { id: "baseline_ids_unique", passed: !!registry && Array.isArray(registry.baselines) && unique(registry.baselines.map((item) => item.baselineId)).length === registry.baselines.length, detail: "Baseline ids are unique." },
      { id: "covers_categories", passed: !!registry && Array.isArray(registry.baselines) && unique(registry.baselines.map((item) => item.category)).length >= 5, detail: "Registry covers at least five categories." },
      { id: "baselines_locked", passed: !!registry && Array.isArray(registry.baselines) && registry.baselines.every((item) => item.locked === true), detail: "Default baselines are locked." },
      { id: "local_only", passed: !!registry && registry.boundaries && registry.boundaries.localOnly === true, detail: "Registry is local-only." },
      { id: "no_paid_provider", passed: !!registry && registry.boundaries && registry.boundaries.paidProviderRequired === false, detail: "No paid provider is required." },
      { id: "no_cloud_required", passed: !!registry && registry.boundaries && registry.boundaries.cloudRequired === false, detail: "No cloud dependency is required." },
      { id: "no_source_mutation", passed: !!registry && registry.boundaries && registry.boundaries.mutatesSource === false, detail: "Registry does not mutate source." },
      { id: "no_secrets", passed: !!registry && registry.boundaries && registry.boundaries.requiresSecrets === false, detail: "Registry does not require secrets." },
      { id: "no_arbitrary_code", passed: !!registry && registry.boundaries && registry.boundaries.executesArbitraryCode === false, detail: "Registry does not execute arbitrary code." },
      { id: "owner_baseline_approval", passed: !!registry && registry.boundaries && registry.boundaries.ownerApprovalRequiredForBaselineChanges === true, detail: "Baseline changes require owner approval." }
    ];
    const blockers = checks.filter((check) => !check.passed).map((check) => check.id);
    return {
      ok: blockers.length === 0,
      status: blockers.length === 0 ? "ready" : "attention_required",
      checkCount: checks.length,
      passedCount: checks.filter((check) => check.passed).length,
      failedCount: blockers.length,
      checks,
      blockers
    };
  }

  compareEvaluationSummary(registry, evaluationSummary = DEFAULT_EVALUATION_SUMMARY) {
    const baselineResults = [];
    const signals = new Set(evaluationSummary.signals || []);
    const categoryScores = evaluationSummary.categoryScores || {};
    const categoryAssertionTarget = Math.floor((evaluationSummary.assertionCount || 0) / Math.max((registry.baselines || []).length, 1));

    for (const baseline of registry.baselines || []) {
      const score = categoryScores[baseline.category] ?? 0;
      const missingSignals = (baseline.requiredSignals || []).filter((signal) => !signals.has(signal));
      const assertionsSatisfied = categoryAssertionTarget >= baseline.minimumAssertionsPassed;
      const passed = score >= baseline.minimumScore && missingSignals.length === 0 && assertionsSatisfied;
      baselineResults.push({
        baselineId: baseline.baselineId,
        category: baseline.category,
        capabilityId: baseline.capabilityId,
        passed,
        score,
        minimumScore: baseline.minimumScore,
        missingSignals,
        assertionsSatisfied
      });
    }

    const blockers = baselineResults.filter((result) => !result.passed).map((result) => result.baselineId);
    const summaryLevelChecks = [
      { id: "all_cases_passed", passed: evaluationSummary.passCount === evaluationSummary.caseCount && evaluationSummary.failCount === 0 },
      { id: "assertions_passed", passed: evaluationSummary.passedAssertionCount === evaluationSummary.assertionCount && evaluationSummary.failedAssertionCount === 0 },
      { id: "average_score_preserved", passed: evaluationSummary.averageScore >= 1 }
    ];
    const summaryBlockers = summaryLevelChecks.filter((check) => !check.passed).map((check) => check.id);
    const allBlockers = [...blockers, ...summaryBlockers];

    return {
      ok: allBlockers.length === 0,
      status: allBlockers.length === 0 ? "passed" : "regression_detected",
      registryId: registry.registryId,
      baselineCount: (registry.baselines || []).length,
      passedBaselineCount: baselineResults.filter((result) => result.passed).length,
      failedBaselineCount: blockers.length,
      summaryCheckCount: summaryLevelChecks.length,
      passedSummaryCheckCount: summaryLevelChecks.filter((check) => check.passed).length,
      failedSummaryCheckCount: summaryBlockers.length,
      blockers: allBlockers,
      baselineResults,
      summaryLevelChecks,
      evaluationSummary
    };
  }

  writeSummaryArtifacts(options = {}) {
    this.initialize();
    const registry = options.registry || this.createDefaultRegistry();
    const validation = this.validateRegistry(registry);
    const comparison = this.compareEvaluationSummary(registry, options.evaluationSummary || DEFAULT_EVALUATION_SUMMARY);
    const summary = {
      ok: validation.ok && comparison.ok,
      status: validation.ok && comparison.ok ? "passed" : "attention_required",
      init: {
        ok: true,
        status: "completed",
        schemaVersion: 1,
        runtimeDir: this.runtimeDir,
        registryDir: this.registryDir,
        eventPath: this.eventPath,
        reportDir: this.reportDir,
        defaultRegistryPath: this.defaultRegistryPath
      },
      registryPath: this.defaultRegistryPath,
      registryId: registry.registryId,
      registryHash: registry.registryHash,
      baselineCount: registry.baselines.length,
      categoryCount: unique(registry.baselines.map((item) => item.category)).length,
      validationCheckCount: validation.checkCount,
      validationPassedCount: validation.passedCount,
      validationFailedCount: validation.failedCount,
      passedBaselineCount: comparison.passedBaselineCount,
      failedBaselineCount: comparison.failedBaselineCount,
      summaryCheckCount: comparison.summaryCheckCount,
      passedSummaryCheckCount: comparison.passedSummaryCheckCount,
      failedSummaryCheckCount: comparison.failedSummaryCheckCount,
      blockers: [...validation.blockers, ...comparison.blockers],
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
      ownerApprovalRequiredForBaselineChanges: registry.boundaries.ownerApprovalRequiredForBaselineChanges,
      baselineIds: registry.baselines.map((item) => item.baselineId),
      categories: unique(registry.baselines.map((item) => item.category))
    };
    writeJson(this.summaryPath, summary);
    fs.writeFileSync(this.markdownPath, renderMarkdown(summary), "utf8");
    appendJsonl(this.historyPath, { createdAt: new Date().toISOString(), ...summary });
    this.recordEvent("summary_written", { status: summary.status, baselineCount: summary.baselineCount, blockers: summary.blockers });
    return summary;
  }
}

function renderMarkdown(summary) {
  return [
    "# S.E.R.A. Regression Baseline Registry Summary",
    "",
    "- Status: " + summary.status,
    "- Registry: " + summary.registryId,
    "- Baselines: " + summary.baselineCount,
    "- Categories: " + summary.categories.join(", "),
    "- Passed baselines: " + summary.passedBaselineCount,
    "- Failed baselines: " + summary.failedBaselineCount,
    "- Blockers: " + (summary.blockers.length ? summary.blockers.join(", ") : "none"),
    "- Local only: " + summary.localOnly,
    "- Paid provider required: " + summary.paidProviderRequired,
    "- Cloud required: " + summary.cloudRequired,
    "- Mutates source: " + summary.mutatesSource,
    "- Requires secrets: " + summary.requiresSecrets,
    "- Executes arbitrary code: " + summary.executesArbitraryCode,
    "- Owner approval required for baseline changes: " + summary.ownerApprovalRequiredForBaselineChanges,
    ""
  ].join("\n");
}
