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

const PRIORITY_WEIGHT = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1
};

export const DEFAULT_CAPABILITY_GAPS = [
  {
    gapId: "gap_validation_depth",
    category: "coding",
    capabilityId: "validation-gated-code-change",
    currentState: "Validation gates exist, but future work needs richer regression-driven scoring before more autonomy is trusted.",
    targetState: "S.E.R.A. can design work that preserves validation gates, rollback expectations, and baseline checks.",
    priority: "high",
    currentScore: 0.74,
    targetScore: 0.95,
    requiredOutcomes: ["validation plan", "rollback awareness", "baseline preservation"]
  },
  {
    gapId: "gap_retrieval_grounding",
    category: "retrieval",
    capabilityId: "research-answers-with-citations",
    currentState: "Local retrieval and citation behaviors exist, but domain learning needs stronger source trust separation.",
    targetState: "S.E.R.A. separates source-of-truth knowledge from stale, weak, or unverified knowledge before answering.",
    priority: "high",
    currentScore: 0.72,
    targetScore: 0.94,
    requiredOutcomes: ["source trust", "citation discipline", "uncertainty handling"]
  },
  {
    gapId: "gap_tool_boundary_reasoning",
    category: "tool_governance",
    capabilityId: "tool-governance",
    currentState: "Tools can be registered and classified, but learning plans should reinforce safe use and adapter boundaries.",
    targetState: "S.E.R.A. can reason about which tools are local, guarded, external, optional, blocked, or owner-approved.",
    priority: "medium",
    currentScore: 0.78,
    targetScore: 0.95,
    requiredOutcomes: ["tool classification", "approval boundary", "secret avoidance"]
  },
  {
    gapId: "gap_phase_execution_planning",
    category: "phase_execution",
    capabilityId: "phase-artifact-packet",
    currentState: "Phase packets exist, but future phase generation needs a curriculum for planning, sequencing, and evidence expectations.",
    targetState: "S.E.R.A. can plan phase work with manifests, expected files, validation commands, and owner approval boundaries.",
    priority: "high",
    currentScore: 0.76,
    targetScore: 0.96,
    requiredOutcomes: ["manifest discipline", "validation sequence", "evidence reporting"]
  },
  {
    gapId: "gap_remote_safety_protocols",
    category: "safety",
    capabilityId: "remote-owner-operations",
    currentState: "Remote acceleration direction exists, but S.E.R.A. needs explicit training objectives for approval, locks, and emergency stop behavior.",
    targetState: "S.E.R.A. treats remote and overnight work as evidence-first preparation that pauses before risky actions.",
    priority: "critical",
    currentScore: 0.7,
    targetScore: 0.98,
    requiredOutcomes: ["approval pause", "emergency stop", "session lock", "no auto-merge"]
  }
];

export const DEFAULT_BASELINE_REGISTRY_SUMMARY = {
  registryId: "phase27_regression_baseline_registry",
  baselineCount: 5,
  categoryCount: 5,
  baselineIds: [
    "baseline_coding_validation_gate",
    "baseline_retrieval_citations",
    "baseline_tool_governance",
    "baseline_phase_execution",
    "baseline_remote_safety"
  ],
  categories: ["coding", "retrieval", "tool_governance", "phase_execution", "safety"],
  ownerApprovalRequiredForBaselineChanges: true
};

function moduleForGap(gap, index) {
  return {
    moduleId: "module_" + gap.category + "_" + String(index + 1).padStart(2, "0"),
    gapId: gap.gapId,
    category: gap.category,
    capabilityId: gap.capabilityId,
    priority: gap.priority,
    objective: gap.targetState,
    learningActivities: [
      "study current S.E.R.A. docs and evidence for " + gap.capabilityId,
      "identify failure modes and owner-approval boundaries for " + gap.category,
      "produce a local evidence note before changing any expectation"
    ],
    completionCriteria: gap.requiredOutcomes.map((outcome) => "demonstrates " + outcome),
    evaluationHooks: [
      "phase26_default_evaluation_suite:" + gap.category,
      "phase27_regression_baseline_registry:" + gap.capabilityId
    ],
    ownerApprovalRequiredForCompletionChange: true,
    sourceMutationAllowed: false
  };
}

export class CurriculumBuilder {
  constructor(options = {}) {
    this.rootDir = options.rootDir || process.cwd();
    this.runtimeDir = options.runtimeDir || path.join(this.rootDir, ".sera-curriculum");
    this.planDir = path.join(this.runtimeDir, "plans");
    this.reportDir = path.join(this.runtimeDir, "reports");
    this.eventPath = path.join(this.runtimeDir, "events.jsonl");
    this.defaultPlanPath = path.join(this.planDir, "phase28-curriculum-plan.json");
    this.summaryPath = path.join(this.reportDir, "curriculum-builder-summary.json");
    this.markdownPath = path.join(this.reportDir, "curriculum-builder-summary.md");
    this.historyPath = path.join(this.reportDir, "curriculum-builder-history.jsonl");
  }

  initialize() {
    ensureDir(this.runtimeDir);
    ensureDir(this.planDir);
    ensureDir(this.reportDir);
    if (!fs.existsSync(this.eventPath)) fs.writeFileSync(this.eventPath, "", "utf8");
    const result = {
      ok: true,
      status: "completed",
      schemaVersion: 1,
      runtimeDir: this.runtimeDir,
      planDir: this.planDir,
      eventPath: this.eventPath,
      reportDir: this.reportDir,
      defaultPlanPath: this.defaultPlanPath
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

  rankGaps(gaps = DEFAULT_CAPABILITY_GAPS) {
    return [...gaps]
      .map((gap) => ({
        ...gap,
        scoreGap: Number((gap.targetScore - gap.currentScore).toFixed(3)),
        priorityScore: (PRIORITY_WEIGHT[gap.priority] || 0) * 100 + Math.round((gap.targetScore - gap.currentScore) * 100)
      }))
      .sort((a, b) => b.priorityScore - a.priorityScore || a.gapId.localeCompare(b.gapId));
  }

  createDefaultCurriculum(overrides = {}) {
    const gaps = this.rankGaps(overrides.gaps || DEFAULT_CAPABILITY_GAPS);
    const modules = (overrides.modules || gaps.map(moduleForGap));
    const plan = {
      curriculumVersion: 1,
      curriculumId: overrides.curriculumId || "phase28_curriculum_builder_plan",
      name: overrides.name || "S.E.R.A. Phase 28 Curriculum Builder Plan",
      purpose: "Turn capability gaps, regression baselines, and roadmap goals into a local learning sequence before granting S.E.R.A. more autonomy.",
      createdAt: new Date().toISOString(),
      baselineRegistry: overrides.baselineRegistry || DEFAULT_BASELINE_REGISTRY_SUMMARY,
      boundaries: {
        localOnly: true,
        paidProviderRequired: false,
        cloudRequired: false,
        freeCoreDependency: false,
        mutatesSource: false,
        requiresSecrets: false,
        executesArbitraryCode: false,
        ownerApprovalRequiredForCurriculumChanges: true,
        ownerApprovalRequiredForLearningActivation: true,
        ...(overrides.boundaries || {})
      },
      gaps,
      modules
    };
    plan.curriculumHash = sha256(JSON.stringify({ curriculumVersion: plan.curriculumVersion, curriculumId: plan.curriculumId, gaps: plan.gaps, modules: plan.modules }));
    writeJson(overrides.path || this.defaultPlanPath, plan);
    this.recordEvent("curriculum_created", { curriculumId: plan.curriculumId, moduleCount: plan.modules.length, gapCount: plan.gaps.length, curriculumHash: plan.curriculumHash });
    return plan;
  }

  loadCurriculum(planPath = this.defaultPlanPath) {
    return readJson(planPath, null);
  }

  validateCurriculum(plan) {
    const modules = plan && Array.isArray(plan.modules) ? plan.modules : [];
    const gaps = plan && Array.isArray(plan.gaps) ? plan.gaps : [];
    const checks = [
      { id: "has_curriculum", passed: !!plan, detail: "Curriculum plan is present." },
      { id: "curriculum_version", passed: !!plan && plan.curriculumVersion === 1, detail: "Curriculum version is v1." },
      { id: "has_gaps", passed: gaps.length >= 5, detail: "Curriculum includes at least five capability gaps." },
      { id: "has_modules", passed: modules.length >= 5, detail: "Curriculum includes at least five modules." },
      { id: "module_ids_unique", passed: unique(modules.map((item) => item.moduleId)).length === modules.length, detail: "Module ids are unique." },
      { id: "covers_categories", passed: unique(modules.map((item) => item.category)).length >= 5, detail: "Curriculum covers at least five categories." },
      { id: "module_objectives", passed: modules.every((item) => typeof item.objective === "string" && item.objective.length > 20), detail: "Every module has a meaningful objective." },
      { id: "learning_activities", passed: modules.every((item) => Array.isArray(item.learningActivities) && item.learningActivities.length >= 3), detail: "Every module has learning activities." },
      { id: "completion_criteria", passed: modules.every((item) => Array.isArray(item.completionCriteria) && item.completionCriteria.length >= 3), detail: "Every module has completion criteria." },
      { id: "evaluation_hooks", passed: modules.every((item) => Array.isArray(item.evaluationHooks) && item.evaluationHooks.length >= 2), detail: "Every module has evaluation hooks." },
      { id: "owner_curriculum_approval", passed: !!plan && plan.boundaries && plan.boundaries.ownerApprovalRequiredForCurriculumChanges === true, detail: "Curriculum changes require owner approval." },
      { id: "owner_learning_activation_approval", passed: !!plan && plan.boundaries && plan.boundaries.ownerApprovalRequiredForLearningActivation === true, detail: "Learning activation requires owner approval." },
      { id: "local_only", passed: !!plan && plan.boundaries && plan.boundaries.localOnly === true, detail: "Curriculum is local-only." },
      { id: "no_paid_provider", passed: !!plan && plan.boundaries && plan.boundaries.paidProviderRequired === false, detail: "No paid provider is required." },
      { id: "no_cloud_required", passed: !!plan && plan.boundaries && plan.boundaries.cloudRequired === false, detail: "No cloud dependency is required." },
      { id: "no_source_mutation", passed: !!plan && plan.boundaries && plan.boundaries.mutatesSource === false, detail: "Curriculum does not mutate source." },
      { id: "no_secrets", passed: !!plan && plan.boundaries && plan.boundaries.requiresSecrets === false, detail: "Curriculum does not require secrets." },
      { id: "no_arbitrary_code", passed: !!plan && plan.boundaries && plan.boundaries.executesArbitraryCode === false, detail: "Curriculum does not execute arbitrary code." }
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

  summarizeCurriculum(plan) {
    const modules = plan.modules || [];
    const gaps = plan.gaps || [];
    const criticalOrHigh = gaps.filter((gap) => ["critical", "high"].includes(gap.priority));
    const coveredGapIds = new Set(modules.map((module) => module.gapId));
    const uncoveredCriticalOrHigh = criticalOrHigh.filter((gap) => !coveredGapIds.has(gap.gapId));
    const categories = unique(modules.map((item) => item.category));
    const summaryChecks = [
      { id: "critical_high_covered", passed: uncoveredCriticalOrHigh.length === 0, detail: "Critical and high-priority gaps are covered." },
      { id: "baseline_connected", passed: !!plan.baselineRegistry && plan.baselineRegistry.baselineCount >= 5, detail: "Curriculum is connected to baseline registry evidence." },
      { id: "category_breadth", passed: categories.length >= 5, detail: "Curriculum covers core S.E.R.A. categories." }
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
      criticalOrHighGapCount: criticalOrHigh.length,
      uncoveredCriticalOrHighGapIds: uncoveredCriticalOrHigh.map((gap) => gap.gapId)
    };
  }

  writeSummaryArtifacts(options = {}) {
    this.initialize();
    const plan = options.plan || this.createDefaultCurriculum(options.curriculumOptions || {});
    const validation = this.validateCurriculum(plan);
    const curriculumSummary = this.summarizeCurriculum(plan);
    const allBlockers = [...validation.blockers, ...curriculumSummary.blockers];
    const summary = {
      ok: allBlockers.length === 0,
      status: allBlockers.length === 0 ? "passed" : "attention_required",
      init: {
        ok: true,
        status: "completed",
        schemaVersion: 1,
        runtimeDir: this.runtimeDir,
        planDir: this.planDir,
        eventPath: this.eventPath,
        reportDir: this.reportDir,
        defaultPlanPath: this.defaultPlanPath
      },
      planPath: this.defaultPlanPath,
      curriculumId: plan.curriculumId,
      curriculumHash: plan.curriculumHash,
      gapCount: plan.gaps.length,
      moduleCount: plan.modules.length,
      categoryCount: curriculumSummary.categories.length,
      validationCheckCount: validation.checkCount,
      validationPassedCount: validation.passedCount,
      validationFailedCount: validation.failedCount,
      summaryCheckCount: curriculumSummary.summaryCheckCount,
      passedSummaryCheckCount: curriculumSummary.passedSummaryCheckCount,
      failedSummaryCheckCount: curriculumSummary.failedSummaryCheckCount,
      criticalOrHighGapCount: curriculumSummary.criticalOrHighGapCount,
      blockers: allBlockers,
      jsonPath: this.summaryPath,
      markdownPath: this.markdownPath,
      historyPath: this.historyPath,
      localOnly: plan.boundaries.localOnly,
      paidProviderRequired: plan.boundaries.paidProviderRequired,
      cloudRequired: plan.boundaries.cloudRequired,
      freeCoreDependency: plan.boundaries.freeCoreDependency,
      mutatesSource: plan.boundaries.mutatesSource,
      requiresSecrets: plan.boundaries.requiresSecrets,
      executesArbitraryCode: plan.boundaries.executesArbitraryCode,
      ownerApprovalRequiredForCurriculumChanges: plan.boundaries.ownerApprovalRequiredForCurriculumChanges,
      ownerApprovalRequiredForLearningActivation: plan.boundaries.ownerApprovalRequiredForLearningActivation,
      moduleIds: plan.modules.map((item) => item.moduleId),
      categories: curriculumSummary.categories
    };
    writeJson(this.summaryPath, summary);
    fs.writeFileSync(this.markdownPath, renderMarkdown(summary), "utf8");
    appendJsonl(this.historyPath, { createdAt: new Date().toISOString(), ...summary });
    this.recordEvent("summary_written", { status: summary.status, moduleCount: summary.moduleCount, blockers: summary.blockers });
    return summary;
  }
}

function renderMarkdown(summary) {
  return [
    "# S.E.R.A. Curriculum Builder Summary",
    "",
    "- Status: " + summary.status,
    "- Curriculum: " + summary.curriculumId,
    "- Gaps: " + summary.gapCount,
    "- Modules: " + summary.moduleCount,
    "- Categories: " + summary.categories.join(", "),
    "- Critical/high gaps: " + summary.criticalOrHighGapCount,
    "- Blockers: " + (summary.blockers.length ? summary.blockers.join(", ") : "none"),
    "- Local only: " + summary.localOnly,
    "- Paid provider required: " + summary.paidProviderRequired,
    "- Cloud required: " + summary.cloudRequired,
    "- Mutates source: " + summary.mutatesSource,
    "- Requires secrets: " + summary.requiresSecrets,
    "- Executes arbitrary code: " + summary.executesArbitraryCode,
    "- Owner approval required for curriculum changes: " + summary.ownerApprovalRequiredForCurriculumChanges,
    "- Owner approval required for learning activation: " + summary.ownerApprovalRequiredForLearningActivation,
    ""
  ].join("\n");
}
