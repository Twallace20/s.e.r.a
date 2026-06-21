import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + "\n", "utf8");
}

function appendJsonl(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.appendFileSync(filePath, JSON.stringify(value) + "\n", "utf8");
}

function sha256(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

function hasAny(text, needles) {
  return needles.some((needle) => text.includes(needle));
}

export class CiWorkflowGate {
  constructor(options = {}) {
    this.rootDir = options.rootDir || process.cwd();
    this.runtimeDir = options.runtimeDir || path.join(this.rootDir, ".sera-ci-gate");
    this.workflowRelativePath = options.workflowRelativePath || ".github/workflows/verify.yml";
    this.workflowPath = path.join(this.rootDir, this.workflowRelativePath);
    this.eventPath = path.join(this.runtimeDir, "events.jsonl");
    this.reportDir = path.join(this.runtimeDir, "reports");
    this.summaryPath = path.join(this.reportDir, "ci-workflow-gate-summary.json");
    this.markdownPath = path.join(this.reportDir, "ci-workflow-gate-summary.md");
    this.historyPath = path.join(this.reportDir, "ci-workflow-gate-history.jsonl");
  }

  initialize() {
    ensureDir(this.runtimeDir);
    ensureDir(this.reportDir);
    if (!fs.existsSync(this.eventPath)) fs.writeFileSync(this.eventPath, "", "utf8");
    const init = {
      ok: true,
      status: "completed",
      schemaVersion: 1,
      workflowPath: this.workflowPath,
      eventPath: this.eventPath,
      reportDir: this.reportDir
    };
    this.recordEvent("initialized", init);
    return init;
  }

  recordEvent(type, data = {}) {
    const event = {
      id: "ci_evt_" + crypto.randomBytes(8).toString("hex"),
      type,
      createdAt: new Date().toISOString(),
      data
    };
    appendJsonl(this.eventPath, event);
    return event;
  }

  readWorkflow() {
    if (!fs.existsSync(this.workflowPath)) {
      return {
        ok: false,
        status: "missing_workflow",
        workflowPath: this.workflowPath,
        text: ""
      };
    }
    const text = fs.readFileSync(this.workflowPath, "utf8");
    return {
      ok: true,
      status: "loaded",
      workflowPath: this.workflowPath,
      text,
      hash: sha256(text)
    };
  }

  inspectWorkflow() {
    const loaded = this.readWorkflow();
    if (!loaded.ok) {
      return {
        ok: false,
        status: loaded.status,
        workflowPath: loaded.workflowPath,
        checks: [],
        blockers: ["missing_workflow"],
        warnings: []
      };
    }

    const text = loaded.text;
    const checks = [
      { id: "has_workflow_dispatch", passed: text.includes("workflow_dispatch:"), detail: "Manual owner-triggered validation exists." },
      { id: "has_push_trigger", passed: text.includes("push:"), detail: "Push validation exists." },
      { id: "has_pull_request_trigger", passed: text.includes("pull_request:"), detail: "Pull request validation exists." },
      { id: "read_only_contents_permission", passed: text.includes("permissions:") && text.includes("contents: read"), detail: "GITHUB_TOKEN is limited to read-only content access." },
      { id: "runs_verify", passed: text.includes("npm run verify"), detail: "Full local verification gate is executed." },
      { id: "runs_phase25_verify", passed: text.includes("npm run phase25:verify"), detail: "Phase 25 verification remains manually available." },
      { id: "uploads_artifacts", passed: text.includes("actions/upload-artifact"), detail: "Validation evidence can be preserved as workflow artifacts." },
      { id: "does_not_push_or_commit", passed: !hasAny(text, ["git push", "git commit", "gh pr merge", "gh pr create"]), detail: "Workflow does not mutate repository history." },
      { id: "does_not_use_secrets", passed: !text.includes("secrets."), detail: "Workflow does not require repository secrets." },
      { id: "has_timeout", passed: text.includes("timeout-minutes"), detail: "Workflow has an execution timeout." },
      { id: "has_concurrency", passed: text.includes("concurrency:"), detail: "Workflow controls duplicate concurrent runs." }
    ];

    const blockers = checks.filter((check) => !check.passed).map((check) => check.id);
    const warnings = [];
    if (text.includes("pull_request_target:")) warnings.push("pull_request_target_not_allowed_for_ci_gate");
    if (text.includes("contents: write")) warnings.push("contents_write_permission_detected");
    if (text.includes("id-token: write")) warnings.push("oidc_write_permission_detected");

    const result = {
      ok: blockers.length === 0 && warnings.length === 0,
      status: blockers.length === 0 && warnings.length === 0 ? "ready" : "attention_required",
      workflowPath: loaded.workflowPath,
      workflowHash: loaded.hash,
      checkCount: checks.length,
      passedCount: checks.filter((check) => check.passed).length,
      failedCount: blockers.length,
      warningCount: warnings.length,
      checks,
      blockers,
      warnings,
      localOnly: false,
      paidProviderRequired: false,
      cloudRequired: true,
      mutatesSource: false,
      requiresSecrets: false,
      ownerApprovalRequiredForMerge: true
    };
    this.recordEvent("workflow_inspected", result);
    return result;
  }

  writeSummaryArtifacts(extra = {}) {
    const inspection = this.inspectWorkflow();
    const summary = {
      ok: inspection.ok,
      status: inspection.status,
      phase: "25B",
      name: "CI Workflow Gate v1",
      createdAt: new Date().toISOString(),
      workflowPath: inspection.workflowPath,
      workflowHash: inspection.workflowHash,
      checkCount: inspection.checkCount || 0,
      passedCount: inspection.passedCount || 0,
      failedCount: inspection.failedCount || 0,
      warningCount: inspection.warningCount || 0,
      blockers: inspection.blockers || [],
      warnings: inspection.warnings || [],
      localCoreFallback: "npm run verify",
      localOnly: false,
      paidProviderRequired: false,
      cloudRequired: true,
      freeCoreDependency: false,
      mutatesSource: false,
      requiresSecrets: false,
      ownerApprovalRequiredForMerge: true,
      jsonPath: this.summaryPath,
      markdownPath: this.markdownPath,
      historyPath: this.historyPath,
      ...extra
    };

    writeJson(this.summaryPath, summary);
    fs.writeFileSync(this.markdownPath, this.renderMarkdown(summary, inspection.checks || []), "utf8");
    appendJsonl(this.historyPath, summary);
    this.recordEvent("summary_written", summary);
    return summary;
  }

  renderMarkdown(summary, checks) {
    const lines = [
      "# S.E.R.A. Phase 25B — CI Workflow Gate v1",
      "",
      "## Summary",
      "",
      "- Status: " + summary.status,
      "- Workflow: " + summary.workflowPath,
      "- Checks: " + summary.passedCount + "/" + summary.checkCount + " passed",
      "- Warnings: " + summary.warningCount,
      "- Mutates source: " + String(summary.mutatesSource),
      "- Requires secrets: " + String(summary.requiresSecrets),
      "- Paid provider required: " + String(summary.paidProviderRequired),
      "- Cloud required: " + String(summary.cloudRequired),
      "- Free-core dependency: " + String(summary.freeCoreDependency),
      "",
      "## Boundary",
      "",
      "This phase adds remote validation proof through GitHub Actions. It does not give S.E.R.A. autonomous merge authority, source mutation authority, secret access, billing access, or deployment authority.",
      "",
      "## Checks",
      ""
    ];
    for (const check of checks) {
      lines.push("- " + (check.passed ? "PASS" : "FAIL") + " — " + check.id + ": " + check.detail);
    }
    lines.push("", "## Blockers", "", ...(summary.blockers.length ? summary.blockers.map((b) => "- " + b) : ["- none"]));
    lines.push("", "## Warnings", "", ...(summary.warnings.length ? summary.warnings.map((w) => "- " + w) : ["- none"]));
    return lines.join("\n") + "\n";
  }
}
