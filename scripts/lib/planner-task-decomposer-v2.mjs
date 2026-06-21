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

export const DEFAULT_SOURCE_TRUST_SUMMARY = {
  registryId: "phase30_knowledge_refresh_source_trust_registry",
  sourceCount: 8,
  trustedSourceCount: 7,
  reviewRequiredSourceCount: 1,
  performsNetworkRefresh: false,
  staleSourceUseAllowedWithoutReview: false,
  ownerApprovalRequiredForExternalSources: true
};

export const DEFAULT_PHASE_OBJECTIVE = {
  phaseId: "phase-31-planner-task-decomposer-v2",
  title: "Planner / Task Decomposer v2",
  objective: "Convert trusted phase objectives into ordered tasks, dependencies, validation gates, evidence requirements, and owner approval checkpoints.",
  priority: "high",
  trustedSourceIds: [
    "truth_phase_docs",
    "truth_source_map",
    "truth_build_validation",
    "implementation_scripts",
    "integration_tests",
    "roadmap_docs"
  ]
};

export const DEFAULT_DECOMPOSED_TASKS = [
  {
    taskId: "task_source_review",
    title: "Review trusted phase inputs",
    order: 1,
    category: "source_trust",
    dependsOn: [],
    requiredSources: ["truth_phase_docs", "truth_source_map", "truth_build_validation"],
    validationGates: ["npm run knowledge:verify"],
    evidenceRequired: ["trusted source list", "expected validation proof"],
    ownerApprovalRequired: false,
    actionAuthority: "read_only"
  },
  {
    taskId: "task_phase_packet_review",
    title: "Review phase packet and declared files",
    order: 2,
    category: "phase_execution",
    dependsOn: ["task_source_review"],
    requiredSources: ["truth_phase_docs", "roadmap_docs"],
    validationGates: ["npm run hygiene"],
    evidenceRequired: ["declared file list", "package boundary review"],
    ownerApprovalRequired: false,
    actionAuthority: "plan_only"
  },
  {
    taskId: "task_implementation_review",
    title: "Inspect implementation scope",
    order: 3,
    category: "coding",
    dependsOn: ["task_phase_packet_review"],
    requiredSources: ["implementation_scripts", "integration_tests"],
    validationGates: ["npm run build", "npm test"],
    evidenceRequired: ["changed file summary", "test coverage summary"],
    ownerApprovalRequired: false,
    actionAuthority: "inspection_only"
  },
  {
    taskId: "task_validation_gate",
    title: "Run validation gates",
    order: 4,
    category: "validation",
    dependsOn: ["task_implementation_review"],
    requiredSources: ["truth_build_validation", "integration_tests"],
    validationGates: ["npm run phase31:verify", "npm run certify", "npm run verify"],
    evidenceRequired: ["phase verify output", "certification output", "full verify output"],
    ownerApprovalRequired: false,
    actionAuthority: "operator_runs_commands"
  },
  {
    taskId: "task_evidence_review",
    title: "Review generated evidence reports",
    order: 5,
    category: "evidence",
    dependsOn: ["task_validation_gate"],
    requiredSources: ["runtime_reports"],
    validationGates: ["git status"],
    evidenceRequired: ["planner summary JSON", "planner summary Markdown", "history JSONL"],
    ownerApprovalRequired: false,
    actionAuthority: "read_only"
  },
  {
    taskId: "task_owner_closeout",
    title: "Owner-approved closeout",
    order: 6,
    category: "approval",
    dependsOn: ["task_evidence_review"],
    requiredSources: ["truth_build_validation", "runtime_reports"],
    validationGates: ["git push origin main", "git tag", "git branch --delete"],
    evidenceRequired: ["clean working tree", "tag proof", "branch cleanup proof"],
    ownerApprovalRequired: true,
    actionAuthority: "owner_approved_only"
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
  executesTasks: false,
  selfApprovesPlan: false,
  ownerApprovalRequiredForPlanChanges: true,
  ownerApprovalRequiredForExecution: true,
  ownerApprovalRequiredForCloseout: true
};

export class PlannerTaskDecomposerV2 {
  constructor(options = {}) {
    this.rootDir = options.rootDir || process.cwd();
    this.runtimeDir = options.runtimeDir || path.join(this.rootDir, ".sera-planner-v2");
    this.planDir = path.join(this.runtimeDir, "plans");
    this.reportDir = path.join(this.runtimeDir, "reports");
    this.eventPath = path.join(this.runtimeDir, "events.jsonl");
    this.defaultPlanPath = path.join(this.planDir, "phase31-planner-task-decomposition.json");
    this.summaryPath = path.join(this.reportDir, "planner-task-decomposer-summary.json");
    this.markdownPath = path.join(this.reportDir, "planner-task-decomposer-summary.md");
    this.historyPath = path.join(this.reportDir, "planner-task-decomposer-history.jsonl");
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
    appendJsonl(this.eventPath, { type, createdAt: new Date().toISOString(), ...data });
  }

  createDefaultPlan(overrides = {}) {
    const objective = overrides.objective || DEFAULT_PHASE_OBJECTIVE;
    const tasks = (overrides.tasks || DEFAULT_DECOMPOSED_TASKS).map((task) => ({
      ...task,
      taskMutationAllowed: false,
      sourceMutationAllowed: false,
      cloudRequired: false,
      paidProviderRequired: false,
      secretsRequired: false,
      arbitraryExecutionAllowed: false,
      status: "planned"
    }));
    const plan = {
      planVersion: 2,
      planId: overrides.planId || "phase31_planner_task_decomposition",
      name: overrides.name || "S.E.R.A. Phase 31 Planner / Task Decomposer v2 Plan",
      purpose: "Decompose trusted phase objectives into ordered tasks with dependencies, validation gates, evidence requirements, and owner approval checkpoints.",
      createdAt: new Date().toISOString(),
      sourceTrust: overrides.sourceTrust || DEFAULT_SOURCE_TRUST_SUMMARY,
      objective,
      boundaries: { ...REQUIRED_BOUNDARIES, ...(overrides.boundaries || {}) },
      tasks,
      closeoutPolicy: {
        ownerApprovalRequired: true,
        requireCleanWorkingTree: true,
        requireFullVerify: true,
        requireTagProof: true,
        requireBranchCleanupProof: true,
        plannerMayClosePhase: false
      }
    };
    plan.planHash = sha256(JSON.stringify({
      planId: plan.planId,
      objective: plan.objective,
      boundaries: plan.boundaries,
      tasks: plan.tasks,
      closeoutPolicy: plan.closeoutPolicy
    }));
    writeJson(this.defaultPlanPath, plan);
    this.recordEvent("plan_created", { planId: plan.planId, taskCount: plan.tasks.length });
    return plan;
  }

  validatePlan(plan) {
    const checks = [];
    const taskIds = plan.tasks.map((task) => task.taskId);
    const taskIdSet = new Set(taskIds);
    const sortedOrders = [...plan.tasks].map((task) => task.order).sort((a, b) => a - b);

    checks.push({ name: "plan_version_v2", passed: plan.planVersion === 2 });
    checks.push({ name: "objective_present", passed: Boolean(plan.objective?.phaseId && plan.objective?.objective) });
    checks.push({ name: "source_trust_attached", passed: plan.sourceTrust?.trustedSourceCount >= 1 });
    checks.push({ name: "task_count_minimum", passed: plan.tasks.length >= 6 });
    checks.push({ name: "task_ids_unique", passed: unique(taskIds).length === taskIds.length });
    checks.push({ name: "task_order_sequential", passed: sortedOrders.every((order, index) => order === index + 1) });
    checks.push({ name: "closeout_requires_owner", passed: plan.closeoutPolicy?.ownerApprovalRequired === true });
    checks.push({ name: "planner_may_not_close_phase", passed: plan.closeoutPolicy?.plannerMayClosePhase === false });

    for (const [key, value] of Object.entries(REQUIRED_BOUNDARIES)) {
      checks.push({ name: "boundary_" + key, passed: plan.boundaries?.[key] === value });
    }

    for (const task of plan.tasks) {
      checks.push({ name: task.taskId + "_has_title", passed: Boolean(task.title) });
      checks.push({ name: task.taskId + "_has_category", passed: Boolean(task.category) });
      checks.push({ name: task.taskId + "_has_evidence", passed: Array.isArray(task.evidenceRequired) && task.evidenceRequired.length > 0 });
      checks.push({ name: task.taskId + "_has_validation_gate", passed: Array.isArray(task.validationGates) && task.validationGates.length > 0 });
      checks.push({ name: task.taskId + "_no_task_mutation", passed: task.taskMutationAllowed === false });
      checks.push({ name: task.taskId + "_no_source_mutation", passed: task.sourceMutationAllowed === false });
      checks.push({ name: task.taskId + "_no_arbitrary_execution", passed: task.arbitraryExecutionAllowed === false });
      checks.push({ name: task.taskId + "_dependencies_exist", passed: task.dependsOn.every((dependency) => taskIdSet.has(dependency)) });
    }

    const blockers = checks.filter((check) => !check.passed).map((check) => check.name);
    return {
      ok: blockers.length === 0,
      status: blockers.length === 0 ? "passed" : "blocked",
      checkCount: checks.length,
      passedCount: checks.length - blockers.length,
      failedCount: blockers.length,
      blockers,
      checks
    };
  }

  decomposePlan(plan) {
    const tasks = [...plan.tasks].sort((a, b) => a.order - b.order);
    return {
      ok: true,
      status: "completed",
      planId: plan.planId,
      phaseId: plan.objective.phaseId,
      taskCount: tasks.length,
      categories: unique(tasks.map((task) => task.category)),
      ownerApprovalTaskIds: tasks.filter((task) => task.ownerApprovalRequired).map((task) => task.taskId),
      validationCommands: unique(tasks.flatMap((task) => task.validationGates)),
      evidenceRequirements: unique(tasks.flatMap((task) => task.evidenceRequired)),
      orderedTaskIds: tasks.map((task) => task.taskId)
    };
  }

  summarizePlan(plan) {
    const validation = this.validatePlan(plan);
    const decomposition = this.decomposePlan(plan);
    const tasks = plan.tasks;
    const summaryChecks = [
      { name: "has_ordered_tasks", passed: decomposition.orderedTaskIds.length >= 6 },
      { name: "has_owner_approval", passed: decomposition.ownerApprovalTaskIds.length >= 1 },
      { name: "has_validation_commands", passed: decomposition.validationCommands.length >= 6 },
      { name: "has_evidence_requirements", passed: decomposition.evidenceRequirements.length >= 6 },
      { name: "no_execution_authority", passed: plan.boundaries.executesTasks === false },
      { name: "no_self_approval", passed: plan.boundaries.selfApprovesPlan === false }
    ];
    const summaryBlockers = summaryChecks.filter((check) => !check.passed).map((check) => check.name);
    return {
      ok: validation.ok && summaryBlockers.length === 0,
      status: validation.ok && summaryBlockers.length === 0 ? "passed" : "blocked",
      planId: plan.planId,
      planHash: plan.planHash,
      phaseId: plan.objective.phaseId,
      taskCount: tasks.length,
      categoryCount: decomposition.categories.length,
      dependencyCount: tasks.reduce((count, task) => count + task.dependsOn.length, 0),
      validationCommandCount: decomposition.validationCommands.length,
      evidenceRequirementCount: decomposition.evidenceRequirements.length,
      ownerApprovalTaskCount: decomposition.ownerApprovalTaskIds.length,
      validationCheckCount: validation.checkCount,
      validationPassedCount: validation.passedCount,
      validationFailedCount: validation.failedCount,
      summaryCheckCount: summaryChecks.length,
      passedSummaryCheckCount: summaryChecks.length - summaryBlockers.length,
      failedSummaryCheckCount: summaryBlockers.length,
      blockers: [...validation.blockers, ...summaryBlockers],
      taskIds: decomposition.orderedTaskIds,
      categories: decomposition.categories,
      ownerApprovalTaskIds: decomposition.ownerApprovalTaskIds,
      validationCommands: decomposition.validationCommands,
      ...plan.boundaries
    };
  }

  writeSummaryArtifacts(overrides = {}) {
    const init = this.initialize();
    const plan = this.createDefaultPlan(overrides);
    const summary = this.summarizePlan(plan);
    const output = {
      ...summary,
      init,
      planPath: this.defaultPlanPath,
      jsonPath: this.summaryPath,
      markdownPath: this.markdownPath,
      historyPath: this.historyPath
    };
    writeJson(this.summaryPath, output);
    fs.writeFileSync(this.markdownPath, this.renderMarkdown(output), "utf8");
    appendJsonl(this.historyPath, { createdAt: new Date().toISOString(), ...output });
    this.recordEvent("summary_written", { planId: output.planId, status: output.status, blockerCount: output.blockers.length });
    return output;
  }

  renderMarkdown(summary) {
    return [
      "# S.E.R.A. Phase 31 Planner / Task Decomposer v2 Summary",
      "",
      `- Status: ${summary.status}`,
      `- Plan ID: ${summary.planId}`,
      `- Phase ID: ${summary.phaseId}`,
      `- Task count: ${summary.taskCount}`,
      `- Category count: ${summary.categoryCount}`,
      `- Dependency count: ${summary.dependencyCount}`,
      `- Validation commands: ${summary.validationCommandCount}`,
      `- Evidence requirements: ${summary.evidenceRequirementCount}`,
      `- Owner approval tasks: ${summary.ownerApprovalTaskCount}`,
      `- Local only: ${summary.localOnly}`,
      `- Executes tasks: ${summary.executesTasks}`,
      `- Mutates source: ${summary.mutatesSource}`,
      `- Requires secrets: ${summary.requiresSecrets}`,
      `- Cloud required: ${summary.cloudRequired}`,
      `- Paid provider required: ${summary.paidProviderRequired}`,
      `- Blockers: ${summary.blockers.length ? summary.blockers.join(", ") : "none"}`,
      "",
      "## Ordered tasks",
      "",
      ...summary.taskIds.map((taskId, index) => `${index + 1}. ${taskId}`),
      ""
    ].join("\n");
  }
}
