import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeJson(filePath, data) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
}

function appendJsonl(filePath, data) {
  ensureDir(path.dirname(filePath));
  fs.appendFileSync(filePath, JSON.stringify(data) + "\n", "utf8");
}

function sha256(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

function unique(values) {
  return [...new Set(values)];
}

const DEFAULT_PHASE_OBJECTIVE = {
  phaseId: "phase-32-phase-packet-generator-v1",
  phaseName: "Phase Packet Generator v1",
  objective: "Generate a local phase packet blueprint from a trusted phase objective, decomposed task plan, validation gates, evidence requirements, rollback notes, and owner approval checkpoints.",
  sourcePhaseInputs: [
    "phase-25c-phase-artifact-packet-v1",
    "phase-30-knowledge-refresh-source-trust-v1",
    "phase-31-planner-task-decomposer-v2"
  ]
};

const DEFAULT_TASK_PLAN_SUMMARY = {
  planId: "phase31_planner_task_decomposition",
  taskCount: 6,
  categoryCount: 6,
  dependencyCount: 5,
  validationCommandCount: 11,
  evidenceRequirementCount: 15,
  ownerApprovalTaskCount: 1,
  trustedSourceRequired: true
};

const DEFAULT_DECLARED_FILES = [
  {
    path: "docs/phases/PHASE_32_PHASE_PACKET_GENERATOR_V1.md",
    type: "documentation",
    required: true,
    purpose: "Define Phase 32 objective, boundaries, validation, and completion criteria."
  },
  {
    path: "scripts/lib/phase-packet-generator-v1.mjs",
    type: "implementation",
    required: true,
    purpose: "Create, validate, and report local phase packet blueprints."
  },
  {
    path: "scripts/run-phase-packet-generator-v1.mjs",
    type: "demo_runner",
    required: true,
    purpose: "Run the Phase 32 packet generator demo and emit proof."
  },
  {
    path: "tests/integration/phase-packet-generator-v1.test.ts",
    type: "integration_tests",
    required: true,
    purpose: "Verify packet generation, validation, readiness, reporting, and safety boundaries."
  }
];

const DEFAULT_VALIDATION_COMMANDS = [
  "npm run phase32:demo",
  "npm run phase32:verify",
  "npm run hygiene",
  "npm run build",
  "npm test",
  "npm run certify",
  "npm run verify"
];

const DEFAULT_EVIDENCE_REQUIREMENTS = [
  "phase packet summary JSON",
  "phase packet summary Markdown",
  "phase packet history JSONL",
  "phase32 demo output",
  "phase32 verify output",
  "hygiene output",
  "build output",
  "test output",
  "certify output",
  "full verify output",
  "git status proof",
  "tag proof after closeout"
];

const DEFAULT_ROLLBACK_NOTES = [
  "Restore modified documentation files from git if validation fails.",
  "Remove Phase 32 runtime directory if local evidence needs to be regenerated.",
  "Delete unmerged phase branch if owner rejects packet closeout.",
  "Do not tag or merge unless full validation and owner approval pass."
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
  createsBranches: false,
  appliesPatches: false,
  executesPacket: false,
  selfApprovesPacket: false,
  ownerApprovalRequiredForPacketChanges: true,
  ownerApprovalRequiredForPacketActivation: true,
  ownerApprovalRequiredForMerge: true
};

export class PhasePacketGeneratorV1 {
  constructor(options = {}) {
    this.rootDir = options.rootDir || process.cwd();
    this.runtimeDir = options.runtimeDir || path.join(this.rootDir, ".sera-phase-packet-generator");
    this.packetDir = path.join(this.runtimeDir, "packets");
    this.reportDir = path.join(this.runtimeDir, "reports");
    this.eventPath = path.join(this.runtimeDir, "events.jsonl");
    this.defaultPacketPath = path.join(this.packetDir, "phase32-generated-packet.json");
    this.summaryPath = path.join(this.reportDir, "phase-packet-generator-summary.json");
    this.markdownPath = path.join(this.reportDir, "phase-packet-generator-summary.md");
    this.historyPath = path.join(this.reportDir, "phase-packet-generator-history.jsonl");
  }

  initialize() {
    ensureDir(this.runtimeDir);
    ensureDir(this.packetDir);
    ensureDir(this.reportDir);
    if (!fs.existsSync(this.eventPath)) fs.writeFileSync(this.eventPath, "", "utf8");
    const result = {
      ok: true,
      status: "completed",
      schemaVersion: 1,
      runtimeDir: this.runtimeDir,
      packetDir: this.packetDir,
      eventPath: this.eventPath,
      reportDir: this.reportDir,
      defaultPacketPath: this.defaultPacketPath
    };
    this.recordEvent("initialized", result);
    return result;
  }

  recordEvent(type, data = {}) {
    appendJsonl(this.eventPath, { type, createdAt: new Date().toISOString(), ...data });
  }

  createDefaultPacket(overrides = {}) {
    const packet = {
      packetVersion: 1,
      packetId: overrides.packetId || "phase32_generated_phase_packet",
      phaseId: overrides.phaseId || DEFAULT_PHASE_OBJECTIVE.phaseId,
      phaseName: overrides.phaseName || DEFAULT_PHASE_OBJECTIVE.phaseName,
      purpose: "Standardize future phase work into a declared, reviewable, validation-gated packet before implementation or execution.",
      createdAt: new Date().toISOString(),
      objective: overrides.objective || DEFAULT_PHASE_OBJECTIVE,
      taskPlanSummary: overrides.taskPlanSummary || DEFAULT_TASK_PLAN_SUMMARY,
      declaredFiles: overrides.declaredFiles || DEFAULT_DECLARED_FILES,
      validationCommands: overrides.validationCommands || DEFAULT_VALIDATION_COMMANDS,
      evidenceRequirements: overrides.evidenceRequirements || DEFAULT_EVIDENCE_REQUIREMENTS,
      rollbackNotes: overrides.rollbackNotes || DEFAULT_ROLLBACK_NOTES,
      ownerApprovalGates: overrides.ownerApprovalGates || [
        "approve packet contents before implementation",
        "approve packet activation before applying generated work",
        "approve merge/tag/branch cleanup after validation"
      ],
      boundaries: { ...REQUIRED_BOUNDARIES, ...(overrides.boundaries || {}) },
      activationPolicy: {
        packetMayBeGenerated: true,
        packetMayBeActivatedByGenerator: false,
        packetMayMutateSource: false,
        packetMayCreateBranches: false,
        packetMayRunCommands: false,
        ownerApprovalRequired: true
      }
    };
    packet.packetHash = sha256(JSON.stringify({
      packetVersion: packet.packetVersion,
      packetId: packet.packetId,
      phaseId: packet.phaseId,
      objective: packet.objective,
      taskPlanSummary: packet.taskPlanSummary,
      declaredFiles: packet.declaredFiles,
      validationCommands: packet.validationCommands,
      evidenceRequirements: packet.evidenceRequirements,
      rollbackNotes: packet.rollbackNotes,
      ownerApprovalGates: packet.ownerApprovalGates,
      boundaries: packet.boundaries,
      activationPolicy: packet.activationPolicy
    }));
    writeJson(this.defaultPacketPath, packet);
    this.recordEvent("packet_created", { packetId: packet.packetId, declaredFileCount: packet.declaredFiles.length });
    return packet;
  }

  validatePacket(packet) {
    const checks = [];
    const declaredPaths = packet.declaredFiles.map((file) => file.path);

    checks.push({ name: "packet_version_v1", passed: packet.packetVersion === 1 });
    checks.push({ name: "packet_id_present", passed: Boolean(packet.packetId) });
    checks.push({ name: "phase_id_present", passed: Boolean(packet.phaseId) });
    checks.push({ name: "objective_present", passed: Boolean(packet.objective?.objective) });
    checks.push({ name: "task_plan_attached", passed: packet.taskPlanSummary?.taskCount >= 1 });
    checks.push({ name: "declared_file_count_minimum", passed: packet.declaredFiles.length >= 4 });
    checks.push({ name: "declared_paths_unique", passed: unique(declaredPaths).length === declaredPaths.length });
    checks.push({ name: "validation_command_count_minimum", passed: packet.validationCommands.length >= 7 });
    checks.push({ name: "evidence_requirement_count_minimum", passed: packet.evidenceRequirements.length >= 10 });
    checks.push({ name: "rollback_notes_present", passed: packet.rollbackNotes.length >= 3 });
    checks.push({ name: "owner_gates_present", passed: packet.ownerApprovalGates.length >= 3 });
    checks.push({ name: "packet_hash_present", passed: Boolean(packet.packetHash && packet.packetHash.length === 64) });

    for (const file of packet.declaredFiles) {
      checks.push({ name: "declared_file_path_" + file.type, passed: Boolean(file.path) });
      checks.push({ name: "declared_file_required_" + file.type, passed: file.required === true });
      checks.push({ name: "declared_file_purpose_" + file.type, passed: Boolean(file.purpose) });
    }

    for (const command of DEFAULT_VALIDATION_COMMANDS) {
      checks.push({ name: "validation_command_" + command.replaceAll(" ", "_"), passed: packet.validationCommands.includes(command) });
    }

    for (const [key, value] of Object.entries(REQUIRED_BOUNDARIES)) {
      checks.push({ name: "boundary_" + key, passed: packet.boundaries?.[key] === value });
    }

    checks.push({ name: "activation_owner_required", passed: packet.activationPolicy?.ownerApprovalRequired === true });
    checks.push({ name: "generator_cannot_activate", passed: packet.activationPolicy?.packetMayBeActivatedByGenerator === false });
    checks.push({ name: "packet_cannot_mutate_source", passed: packet.activationPolicy?.packetMayMutateSource === false });
    checks.push({ name: "packet_cannot_create_branches", passed: packet.activationPolicy?.packetMayCreateBranches === false });
    checks.push({ name: "packet_cannot_run_commands", passed: packet.activationPolicy?.packetMayRunCommands === false });

    const failed = checks.filter((check) => !check.passed);
    return {
      ok: failed.length === 0,
      status: failed.length === 0 ? "passed" : "failed",
      checkCount: checks.length,
      passedCount: checks.length - failed.length,
      failedCount: failed.length,
      checks,
      blockers: failed.map((check) => check.name)
    };
  }

  summarizePacket(packet, validation) {
    const typeCount = unique(packet.declaredFiles.map((file) => file.type)).length;
    return {
      ok: validation.ok,
      status: validation.status,
      packetId: packet.packetId,
      packetHash: packet.packetHash,
      phaseId: packet.phaseId,
      declaredFileCount: packet.declaredFiles.length,
      declaredFileTypeCount: typeCount,
      validationCommandCount: packet.validationCommands.length,
      evidenceRequirementCount: packet.evidenceRequirements.length,
      rollbackNoteCount: packet.rollbackNotes.length,
      ownerApprovalGateCount: packet.ownerApprovalGates.length,
      taskPlanTaskCount: packet.taskPlanSummary.taskCount,
      validationCheckCount: validation.checkCount,
      validationPassedCount: validation.passedCount,
      validationFailedCount: validation.failedCount,
      blockers: validation.blockers,
      localOnly: packet.boundaries.localOnly,
      paidProviderRequired: packet.boundaries.paidProviderRequired,
      cloudRequired: packet.boundaries.cloudRequired,
      freeCoreDependency: packet.boundaries.freeCoreDependency,
      mutatesSource: packet.boundaries.mutatesSource,
      requiresSecrets: packet.boundaries.requiresSecrets,
      executesArbitraryCode: packet.boundaries.executesArbitraryCode,
      performsNetworkRefresh: packet.boundaries.performsNetworkRefresh,
      createsBranches: packet.boundaries.createsBranches,
      appliesPatches: packet.boundaries.appliesPatches,
      executesPacket: packet.boundaries.executesPacket,
      selfApprovesPacket: packet.boundaries.selfApprovesPacket,
      ownerApprovalRequiredForPacketChanges: packet.boundaries.ownerApprovalRequiredForPacketChanges,
      ownerApprovalRequiredForPacketActivation: packet.boundaries.ownerApprovalRequiredForPacketActivation,
      ownerApprovalRequiredForMerge: packet.boundaries.ownerApprovalRequiredForMerge,
      packetActivationAllowed: packet.activationPolicy.packetMayBeActivatedByGenerator,
      declaredPaths: packet.declaredFiles.map((file) => file.path),
      validationCommands: packet.validationCommands
    };
  }

  writeMarkdown(summary) {
    const lines = [
      "# S.E.R.A. Phase 32 — Phase Packet Generator v1 Summary",
      "",
      "- Status: " + summary.status,
      "- Packet ID: " + summary.packetId,
      "- Packet hash: " + summary.packetHash,
      "- Phase ID: " + summary.phaseId,
      "- Declared files: " + summary.declaredFileCount,
      "- Validation commands: " + summary.validationCommandCount,
      "- Evidence requirements: " + summary.evidenceRequirementCount,
      "- Rollback notes: " + summary.rollbackNoteCount,
      "- Owner approval gates: " + summary.ownerApprovalGateCount,
      "- Validation checks: " + summary.validationPassedCount + "/" + summary.validationCheckCount,
      "- Blockers: " + (summary.blockers.length ? summary.blockers.join(", ") : "none"),
      "",
      "## Boundaries",
      "",
      "- localOnly: " + summary.localOnly,
      "- paidProviderRequired: " + summary.paidProviderRequired,
      "- cloudRequired: " + summary.cloudRequired,
      "- mutatesSource: " + summary.mutatesSource,
      "- createsBranches: " + summary.createsBranches,
      "- appliesPatches: " + summary.appliesPatches,
      "- executesPacket: " + summary.executesPacket,
      "- selfApprovesPacket: " + summary.selfApprovesPacket,
      "- ownerApprovalRequiredForPacketActivation: " + summary.ownerApprovalRequiredForPacketActivation,
      "",
      "## Declared paths",
      "",
      ...summary.declaredPaths.map((declaredPath) => "- `" + declaredPath + "`")
    ];
    fs.writeFileSync(this.markdownPath, lines.join("\n") + "\n", "utf8");
  }

  writeSummaryArtifacts() {
    const init = this.initialize();
    const packet = this.createDefaultPacket();
    const validation = this.validatePacket(packet);
    const summary = {
      ...this.summarizePacket(packet, validation),
      init,
      packetPath: this.defaultPacketPath,
      jsonPath: this.summaryPath,
      markdownPath: this.markdownPath,
      historyPath: this.historyPath
    };
    writeJson(this.summaryPath, summary);
    this.writeMarkdown(summary);
    appendJsonl(this.historyPath, { createdAt: new Date().toISOString(), ...summary });
    this.recordEvent("summary_written", { packetId: summary.packetId, status: summary.status });
    return summary;
  }
}

export default PhasePacketGeneratorV1;
