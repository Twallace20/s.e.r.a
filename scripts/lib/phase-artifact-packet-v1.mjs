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

function sha256(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

function stableId(prefix, text) {
  return prefix + "_" + sha256(text).slice(0, 12);
}

function arrayHasValue(values, predicate) {
  return Array.isArray(values) && values.some(predicate);
}

export class PhaseArtifactPacket {
  constructor(options = {}) {
    this.rootDir = options.rootDir || process.cwd();
    this.runtimeDir = options.runtimeDir || path.join(this.rootDir, ".sera-phase-packets");
    this.eventPath = path.join(this.runtimeDir, "events.jsonl");
    this.reportDir = path.join(this.runtimeDir, "reports");
    this.summaryPath = path.join(this.reportDir, "phase-artifact-packet-summary.json");
    this.markdownPath = path.join(this.reportDir, "phase-artifact-packet-summary.md");
    this.historyPath = path.join(this.reportDir, "phase-artifact-packet-history.jsonl");
    this.packetDir = options.packetDir || path.join(this.runtimeDir, "sample-phase-packet");
    this.manifestPath = options.manifestPath || path.join(this.packetDir, "phase-packet-manifest.json");
  }

  initialize() {
    ensureDir(this.runtimeDir);
    ensureDir(this.reportDir);
    ensureDir(this.packetDir);
    if (!fs.existsSync(this.eventPath)) fs.writeFileSync(this.eventPath, "", "utf8");
    const init = {
      ok: true,
      status: "completed",
      schemaVersion: 1,
      runtimeDir: this.runtimeDir,
      eventPath: this.eventPath,
      reportDir: this.reportDir,
      packetDir: this.packetDir,
      manifestPath: this.manifestPath
    };
    this.recordEvent("initialized", init);
    return init;
  }

  recordEvent(type, data = {}) {
    const event = {
      id: "phase_packet_evt_" + crypto.randomBytes(8).toString("hex"),
      type,
      createdAt: new Date().toISOString(),
      data
    };
    appendJsonl(this.eventPath, event);
    return event;
  }

  createManifest(input = {}) {
    const phaseId = input.phaseId || "25C";
    const phaseTitle = input.phaseTitle || "Phase Artifact Packet v1";
    const branchName = input.branchName || "phase-25c-phase-artifact-packet-v1";
    const files = input.files || [
      "docs/phases/PHASE_25C_PHASE_ARTIFACT_PACKET_V1.md",
      "scripts/lib/phase-artifact-packet-v1.mjs",
      "scripts/run-phase-artifact-packet-v1.mjs",
      "tests/integration/phase-artifact-packet-v1.test.ts"
    ];
    const validationCommands = input.validationCommands || [
      "npm run phase25c:demo",
      "npm run phase25c:verify",
      "npm run hygiene",
      "npm run build",
      "npm test",
      "npm run certify",
      "npm run verify"
    ];
    const boundaries = {
      localFirst: true,
      freeCoreSafe: true,
      paidProviderRequired: false,
      cloudRequired: false,
      mutatesSourceDuringInspection: false,
      requiresSecrets: false,
      ownerApprovalRequiredForApply: true,
      ownerApprovalRequiredForMerge: true,
      noAutonomousMerge: true,
      ...(input.boundaries || {})
    };
    const manifest = {
      packetVersion: 1,
      packetId: stableId("phase_packet", phaseId + "|" + phaseTitle + "|" + branchName),
      createdAt: new Date().toISOString(),
      phaseId,
      phaseTitle,
      branchName,
      files,
      validationCommands,
      boundaries,
      rollbackPlan: input.rollbackPlan || "Use git status, git restore for uncommitted edits, and branch reset before merge. Do not delete source or tags without owner approval.",
      ownerReviewRequired: true,
      evidence: {
        expectedSummaryReport: this.summaryPath,
        expectedMarkdownReport: this.markdownPath,
        expectedHistory: this.historyPath
      }
    };
    ensureDir(this.packetDir);
    writeJson(this.manifestPath, manifest);
    this.recordEvent("manifest_created", { manifestPath: this.manifestPath, packetId: manifest.packetId });
    return manifest;
  }

  loadManifest() {
    return readJson(this.manifestPath, null);
  }

  validateManifest(manifest = this.loadManifest()) {
    const checks = [
      { id: "has_manifest", passed: !!manifest, detail: "Packet manifest exists and can be parsed." },
      { id: "packet_version_1", passed: !!manifest && manifest.packetVersion === 1, detail: "Packet version is explicit and supported." },
      { id: "has_phase_id", passed: !!manifest && typeof manifest.phaseId === "string" && manifest.phaseId.length > 0, detail: "Phase id is present." },
      { id: "has_phase_title", passed: !!manifest && typeof manifest.phaseTitle === "string" && manifest.phaseTitle.length > 0, detail: "Phase title is present." },
      { id: "has_branch_name", passed: !!manifest && typeof manifest.branchName === "string" && manifest.branchName.startsWith("phase-"), detail: "Branch name is phase-scoped." },
      { id: "declares_files", passed: !!manifest && Array.isArray(manifest.files) && manifest.files.length > 0, detail: "Packet declares expected files." },
      { id: "declares_verify_command", passed: !!manifest && arrayHasValue(manifest.validationCommands, (cmd) => cmd === "npm run verify"), detail: "Packet requires full verification." },
      { id: "declares_phase_verify_command", passed: !!manifest && arrayHasValue(manifest.validationCommands, (cmd) => cmd.includes(":verify")), detail: "Packet requires a phase-specific verification command." },
      { id: "free_core_safe", passed: !!manifest && manifest.boundaries && manifest.boundaries.freeCoreSafe === true, detail: "Packet declares free-core-safe boundary." },
      { id: "no_paid_provider_required", passed: !!manifest && manifest.boundaries && manifest.boundaries.paidProviderRequired === false, detail: "Packet does not require paid providers." },
      { id: "no_secret_requirement", passed: !!manifest && manifest.boundaries && manifest.boundaries.requiresSecrets === false, detail: "Packet does not require secrets." },
      { id: "owner_apply_approval", passed: !!manifest && manifest.boundaries && manifest.boundaries.ownerApprovalRequiredForApply === true, detail: "Owner approval is required before apply." },
      { id: "owner_merge_approval", passed: !!manifest && manifest.boundaries && manifest.boundaries.ownerApprovalRequiredForMerge === true, detail: "Owner approval is required before merge." },
      { id: "no_autonomous_merge", passed: !!manifest && manifest.boundaries && manifest.boundaries.noAutonomousMerge === true, detail: "Autonomous merge is forbidden." },
      { id: "has_rollback_plan", passed: !!manifest && typeof manifest.rollbackPlan === "string" && manifest.rollbackPlan.length > 20, detail: "Rollback plan is present." }
    ];
    const blockers = checks.filter((check) => !check.passed).map((check) => check.id);
    const result = {
      ok: blockers.length === 0,
      status: blockers.length === 0 ? "ready" : "attention_required",
      manifestPath: this.manifestPath,
      checkCount: checks.length,
      passedCount: checks.filter((check) => check.passed).length,
      failedCount: blockers.length,
      checks,
      blockers,
      localOnly: true,
      paidProviderRequired: false,
      cloudRequired: false,
      freeCoreDependency: false,
      mutatesSource: false,
      requiresSecrets: false,
      ownerApprovalRequiredForApply: true,
      ownerApprovalRequiredForMerge: true
    };
    this.recordEvent("manifest_validated", result);
    return result;
  }

  writeSummaryArtifacts(extra = {}) {
    if (!fs.existsSync(this.manifestPath)) this.createManifest();
    const manifest = this.loadManifest();
    const validation = this.validateManifest(manifest);
    const summary = {
      ok: validation.ok,
      status: validation.status,
      phase: "25C",
      name: "Phase Artifact Packet v1",
      createdAt: new Date().toISOString(),
      manifestPath: this.manifestPath,
      packetId: manifest ? manifest.packetId : null,
      branchName: manifest ? manifest.branchName : null,
      fileCount: manifest && Array.isArray(manifest.files) ? manifest.files.length : 0,
      validationCommandCount: manifest && Array.isArray(manifest.validationCommands) ? manifest.validationCommands.length : 0,
      checkCount: validation.checkCount,
      passedCount: validation.passedCount,
      failedCount: validation.failedCount,
      blockers: validation.blockers,
      localOnly: true,
      paidProviderRequired: false,
      cloudRequired: false,
      freeCoreDependency: false,
      mutatesSource: false,
      requiresSecrets: false,
      ownerApprovalRequiredForApply: true,
      ownerApprovalRequiredForMerge: true,
      jsonPath: this.summaryPath,
      markdownPath: this.markdownPath,
      historyPath: this.historyPath,
      ...extra
    };
    writeJson(this.summaryPath, summary);
    fs.writeFileSync(this.markdownPath, this.renderMarkdown(summary, validation.checks), "utf8");
    appendJsonl(this.historyPath, summary);
    this.recordEvent("summary_written", summary);
    return summary;
  }

  renderMarkdown(summary, checks) {
    const lines = [
      "# S.E.R.A. Phase 25C — Phase Artifact Packet v1",
      "",
      "## Summary",
      "",
      "- Status: " + summary.status,
      "- Packet id: " + summary.packetId,
      "- Branch: " + summary.branchName,
      "- Files declared: " + summary.fileCount,
      "- Validation commands: " + summary.validationCommandCount,
      "- Checks: " + summary.passedCount + "/" + summary.checkCount + " passed",
      "- Mutates source during inspection: " + String(summary.mutatesSource),
      "- Requires secrets: " + String(summary.requiresSecrets),
      "- Paid provider required: " + String(summary.paidProviderRequired),
      "- Cloud required: " + String(summary.cloudRequired),
      "- Free-core dependency: " + String(summary.freeCoreDependency),
      "",
      "## Boundary",
      "",
      "This phase defines packet standards only. It does not execute arbitrary tools, commit, push, merge, delete branches, use secrets, or replace owner approval.",
      "",
      "## Checks",
      ""
    ];
    for (const check of checks) {
      lines.push("- " + (check.passed ? "PASS" : "FAIL") + " — " + check.id + ": " + check.detail);
    }
    lines.push("", "## Blockers", "", ...(summary.blockers.length ? summary.blockers.map((b) => "- " + b) : ["- none"]));
    return lines.join("\n") + "\n";
  }
}
