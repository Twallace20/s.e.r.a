import fs from "node:fs";
import path from "node:path";

const DASHBOARD_DIR = ".sera-operator-tui";

export function buildOperatorTerminalDashboard(rootDir = process.cwd()) {
  const root = path.resolve(rootDir);
  const generatedAt = new Date().toISOString();
  const packageJson = readJson(path.join(root, "package.json"), { scripts: {} });
  const scripts = packageJson.scripts ?? {};
  const phaseScripts = Object.keys(scripts)
    .filter((name) => /^phase\d+:(demo|verify)$/.test(name))
    .sort(comparePhaseScriptNames);
  const completedPhaseNumbers = uniqueNumbers(phaseScripts.map((name) => Number(name.match(/^phase(\d+):/)?.[1] ?? 0))).filter((value) => value > 0);
  const currentPhase = completedPhaseNumbers.length > 0 ? Math.max(...completedPhaseNumbers) : 0;
  const nextPhase = currentPhase > 0 ? currentPhase + 1 : 1;
  const certifiedLevel = readCertifiedLevel(root) ?? "unknown";
  const freeCoreThroughPhase = readFreeCoreThroughPhase(root) ?? 45;

  const counts = {
    memoryRuns: countJsonl(root, ".sera-memory/run-history.jsonl"),
    memoryFailures: countJsonl(root, ".sera-memory/failure-journal.jsonl"),
    lessonCandidates: countJsonl(root, ".sera-memory/lesson-candidates.jsonl"),
    approvedLessons: countJsonl(root, ".sera-memory/approved-lessons.jsonl"),
    activeLessons: countActiveLessons(root),
    tasks: countJsonl(root, ".sera-tasks/tasks.jsonl"),
    taskEvents: countJsonl(root, ".sera-tasks/events.jsonl"),
    knowledgeDocuments: readJson(path.join(root, ".sera-knowledge/summary.json"), {}).documentCount ?? countJsonl(root, ".sera-knowledge/documents.jsonl"),
    knowledgeChunks: readJson(path.join(root, ".sera-knowledge/summary.json"), {}).chunkCount ?? countJsonl(root, ".sera-knowledge/chunks.jsonl"),
    knowledgeSearches: readJson(path.join(root, ".sera-knowledge/summary.json"), {}).searchCount ?? countJsonl(root, ".sera-knowledge/search-history.jsonl"),
    researchAnswers: countJsonl(root, ".sera-research/answers.jsonl"),
    researchComparisons: countJsonl(root, ".sera-research/comparisons.jsonl"),
    researchSummaries: countJsonl(root, ".sera-research/summaries.jsonl"),
    autonomyLoops: countJsonl(root, ".sera-autonomy/loops.jsonl"),
    autonomyEvents: countJsonl(root, ".sera-autonomy/events.jsonl"),
    modelRequests: countJsonl(root, ".sera-models/model-requests.jsonl"),
    modelResponses: countJsonl(root, ".sera-models/model-responses.jsonl"),
    consoleSnapshots: countJsonl(root, ".sera-console/snapshots.jsonl"),
    consoleReports: countFiles(root, ".sera-console/reports", ".md")
  };

  const scriptStatus = {
    phase21Verify: Boolean(scripts["phase21:verify"]),
    phase22Demo: Boolean(scripts["phase22:demo"]),
    phase22Verify: Boolean(scripts["phase22:verify"]),
    verify: Boolean(scripts.verify),
    certify: Boolean(scripts.certify)
  };

  const panels = [
    panel("certification", "Certification", scriptStatus.verify && scriptStatus.certify && certifiedLevel !== "unknown" ? "ready" : "needs_attention", [
      `certified_level=${certifiedLevel}`,
      `free_core_through_phase=${freeCoreThroughPhase}`,
      `verify_script=${scriptStatus.verify ? "present" : "missing"}`,
      `certify_script=${scriptStatus.certify ? "present" : "missing"}`
    ]),
    panel("phase", "Phase Progress", scriptStatus.phase22Verify ? "ready" : "needs_attention", [
      `current_phase=${currentPhase || "unknown"}`,
      `next_phase=${nextPhase}`,
      `phase21_verify=${scriptStatus.phase21Verify ? "present" : "missing"}`,
      `phase22_demo=${scriptStatus.phase22Demo ? "present" : "missing"}`,
      `phase22_verify=${scriptStatus.phase22Verify ? "present" : "missing"}`
    ]),
    panel("tasks", "Tasks", counts.tasks > 0 ? "active" : "quiet", [
      `tasks=${counts.tasks}`,
      `task_events=${counts.taskEvents}`
    ]),
    panel("memory_lessons", "Memory + Lessons", counts.lessonCandidates > 0 ? "review_needed" : "ready", [
      `memory_runs=${counts.memoryRuns}`,
      `memory_failures=${counts.memoryFailures}`,
      `lesson_candidates=${counts.lessonCandidates}`,
      `approved_lessons=${counts.approvedLessons}`,
      `active_lessons=${counts.activeLessons}`
    ]),
    panel("knowledge", "Knowledge", counts.knowledgeDocuments > 0 ? "ready" : "needs_seeding", [
      `documents=${counts.knowledgeDocuments}`,
      `chunks=${counts.knowledgeChunks}`,
      `searches=${counts.knowledgeSearches}`
    ]),
    panel("research", "Research", counts.researchAnswers + counts.researchComparisons + counts.researchSummaries > 0 ? "ready" : "quiet", [
      `answers=${counts.researchAnswers}`,
      `comparisons=${counts.researchComparisons}`,
      `summaries=${counts.researchSummaries}`,
      "boundary=local_evidence_only"
    ]),
    panel("autonomy", "Autonomy", counts.autonomyLoops > 0 ? "active" : "quiet", [
      `loops=${counts.autonomyLoops}`,
      `events=${counts.autonomyEvents}`,
      "boundary=validation_gated"
    ]),
    panel("models", "Models", "guarded", [
      `requests=${counts.modelRequests}`,
      `responses=${counts.modelResponses}`,
      "external_providers=blocked_by_default"
    ]),
    panel("operator_console", "Operator Evidence", counts.consoleSnapshots + counts.consoleReports > 0 ? "ready" : "quiet", [
      `snapshots=${counts.consoleSnapshots}`,
      `reports=${counts.consoleReports}`,
      `dashboard_dir=${DASHBOARD_DIR}`
    ])
  ];

  const attention = panels.filter((item) => ["needs_attention", "needs_seeding", "review_needed"].includes(item.status));
  const nextActions = [
    scriptStatus.phase22Verify ? "Run npm run phase22:verify before closing Phase 22." : "Add phase22:verify before closing Phase 22.",
    "Review .sera-operator-tui/dashboard.md for the local operator packet.",
    `Prepare Phase ${nextPhase} only after build, tests, certify, and verify pass.`
  ];
  if (attention.length > 0) {
    nextActions.unshift(`Review attention panels: ${attention.map((item) => item.id).join(", ")}.`);
  }

  return {
    ok: true,
    status: "completed",
    message: "Operator Console v2 dashboard generated from local evidence.",
    dashboard: {
      schema: "operator-console-v2-terminal-dashboard",
      generatedAt,
      rootDir: root,
      phase: {
        current: currentPhase || undefined,
        next: nextPhase,
        scripts: phaseScripts
      },
      certification: {
        certifiedLevel,
        freeCoreThroughPhase
      },
      counts,
      panels,
      guardrails: [
        "Operator Console v2 is read/report oriented and does not add mutation authority.",
        "It does not approve, reject, activate, or deactivate lessons.",
        "It does not run autonomous apply operations.",
        "It does not call paid APIs, hosted model providers, SaaS, or cloud-only services.",
        "It summarizes local runtime evidence and writes local dashboard artifacts only."
      ],
      nextActions
    }
  };
}

export function writeOperatorTerminalDashboard(rootDir = process.cwd()) {
  const result = buildOperatorTerminalDashboard(rootDir);
  const dashboard = result.dashboard;
  const consoleDir = path.join(path.resolve(rootDir), DASHBOARD_DIR);
  fs.mkdirSync(consoleDir, { recursive: true });
  const jsonPath = path.join(consoleDir, "dashboard.json");
  const markdownPath = path.join(consoleDir, "dashboard.md");
  const historyPath = path.join(consoleDir, "dashboard-history.jsonl");
  const terminalText = renderOperatorTerminalDashboard(dashboard);

  fs.writeFileSync(jsonPath, JSON.stringify(dashboard, null, 2) + "\n", "utf8");
  fs.writeFileSync(markdownPath, renderOperatorTerminalMarkdown(dashboard), "utf8");
  fs.appendFileSync(historyPath, JSON.stringify({ generatedAt: dashboard.generatedAt, phase: dashboard.phase, certification: dashboard.certification, counts: dashboard.counts }) + "\n", "utf8");

  return {
    ...result,
    consoleDir,
    jsonPath,
    markdownPath,
    historyPath,
    terminalText
  };
}

export function renderOperatorTerminalDashboard(dashboard) {
  const line = "=".repeat(72);
  const rows = [
    line,
    "S.E.R.A. Operator Console v2",
    line,
    `Generated: ${dashboard.generatedAt}`,
    `Certified Level: ${dashboard.certification.certifiedLevel}`,
    `Free Core Through Phase: ${dashboard.certification.freeCoreThroughPhase}`,
    `Current Phase: ${dashboard.phase.current ?? "unknown"}`,
    `Next Phase: ${dashboard.phase.next}`,
    "",
    "Panels"
  ];

  for (const panel of dashboard.panels) {
    rows.push(`- [${panel.status}] ${panel.title}`);
    for (const item of panel.lines) rows.push(`  ${item}`);
  }

  rows.push("", "Guardrails");
  for (const guardrail of dashboard.guardrails) rows.push(`- ${guardrail}`);

  rows.push("", "Next Actions");
  for (const action of dashboard.nextActions) rows.push(`- ${action}`);
  rows.push(line);
  return rows.join("\n") + "\n";
}

export function renderOperatorTerminalMarkdown(dashboard) {
  const rows = [
    "# S.E.R.A. Operator Console v2 Dashboard",
    "",
    `Generated: ${dashboard.generatedAt}`,
    "",
    "## Runtime Posture",
    "",
    `- Certified level: ${dashboard.certification.certifiedLevel}`,
    `- Free Core through Phase: ${dashboard.certification.freeCoreThroughPhase}`,
    `- Current phase: ${dashboard.phase.current ?? "unknown"}`,
    `- Next phase: ${dashboard.phase.next}`,
    "",
    "## Panels",
    ""
  ];

  for (const panel of dashboard.panels) {
    rows.push(`### ${panel.title}`);
    rows.push("");
    rows.push(`Status: ${panel.status}`);
    rows.push("");
    for (const item of panel.lines) rows.push(`- ${item}`);
    rows.push("");
  }

  rows.push("## Guardrails", "");
  for (const guardrail of dashboard.guardrails) rows.push(`- ${guardrail}`);
  rows.push("", "## Next Actions", "");
  for (const action of dashboard.nextActions) rows.push(`- ${action}`);
  rows.push("");
  return rows.join("\n");
}

function panel(id, title, status, lines) {
  return { id, title, status, lines };
}

function countJsonl(root, relativePath) {
  const target = path.join(root, relativePath);
  if (!fs.existsSync(target)) return 0;
  return fs.readFileSync(target, "utf8").split(/\r?\n/).map((line) => line.trim()).filter(Boolean).length;
}

function countFiles(root, relativeDir, ext) {
  const target = path.join(root, relativeDir);
  if (!fs.existsSync(target) || !fs.statSync(target).isDirectory()) return 0;
  return fs.readdirSync(target).filter((name) => name.endsWith(ext)).length;
}

function countActiveLessons(root) {
  const target = path.join(root, ".sera-memory/active-lessons.jsonl");
  if (!fs.existsSync(target)) return 0;
  return fs.readFileSync(target, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => safeJsonParse(line))
    .filter((record) => record && record.active !== false && record.status !== "inactive")
    .length;
}

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function readCertifiedLevel(root) {
  const target = path.join(root, "docs/roadmap/CERTIFICATION_LADDER.md");
  if (!fs.existsSync(target)) return undefined;
  const text = fs.readFileSync(target, "utf8");
  const blockMatch = text.match(/## Current runtime certification[\s\S]*?```text\s*([\s\S]*?)```/i);
  const raw = blockMatch?.[1]?.trim();
  return raw || undefined;
}

function readFreeCoreThroughPhase(root) {
  const targets = [
    path.join(root, "docs/governance/FREE_CORE_COVENANT.md"),
    path.join(root, "docs/roadmap/NEXT_EVOLUTION_ROADMAP.md")
  ];
  for (const target of targets) {
    if (!fs.existsSync(target)) continue;
    const text = fs.readFileSync(target, "utf8");
    const match = text.match(/through\s+Phase\s+(\d+)/i) ?? text.match(/through_phase=(\d+)/i);
    if (match) return Number(match[1]);
  }
  return undefined;
}

function comparePhaseScriptNames(a, b) {
  const [aPhase, aKind] = phaseScriptParts(a);
  const [bPhase, bKind] = phaseScriptParts(b);
  return aPhase - bPhase || aKind.localeCompare(bKind);
}

function phaseScriptParts(name) {
  const match = name.match(/^phase(\d+):(demo|verify)$/);
  return [Number(match?.[1] ?? 0), match?.[2] ?? ""];
}

function uniqueNumbers(values) {
  return [...new Set(values)];
}
