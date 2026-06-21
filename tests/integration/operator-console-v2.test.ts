import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

function tempRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "sera-operator-console-v2-test-"));
}

function writeJsonl(filePath: string, records: unknown[]): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, records.map((record) => JSON.stringify(record)).join("\n") + "\n", "utf8");
}

async function loadConsoleV2() {
  const moduleUrl = pathToFileURL(path.join(process.cwd(), "scripts", "lib", "operator-console-v2.mjs")).href;
  return import(moduleUrl) as Promise<{
    buildOperatorTerminalDashboard: (rootDir: string) => { ok: boolean; dashboard: any };
    renderOperatorTerminalDashboard: (dashboard: any) => string;
    writeOperatorTerminalDashboard: (rootDir: string) => { ok: boolean; dashboard: any; jsonPath: string; markdownPath: string; historyPath: string; terminalText: string };
  }>;
}

function seedRoot(root: string): void {
  fs.mkdirSync(path.join(root, "docs", "roadmap"), { recursive: true });
  fs.writeFileSync(path.join(root, "docs", "roadmap", "CERTIFICATION_LADDER.md"), `# S.E.R.A. Certification Ladder\n\n## Current runtime certification\n\n\`\`\`text\noperator-console-v1\n\`\`\`\n`, "utf8");
  fs.mkdirSync(path.join(root, "docs", "governance"), { recursive: true });
  fs.writeFileSync(path.join(root, "docs", "governance", "FREE_CORE_COVENANT.md"), "Free Core Covenant through Phase 45.\n", "utf8");
  fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ scripts: { verify: "x", certify: "x", "phase21:verify": "x", "phase22:demo": "x", "phase22:verify": "x" } }, null, 2), "utf8");

  fs.mkdirSync(path.join(root, ".sera-knowledge"), { recursive: true });
  fs.writeFileSync(path.join(root, ".sera-knowledge", "summary.json"), JSON.stringify({ documentCount: 2, chunkCount: 4, searchCount: 1 }, null, 2), "utf8");
  writeJsonl(path.join(root, ".sera-research", "answers.jsonl"), [{ id: "answer_1" }]);
  writeJsonl(path.join(root, ".sera-research", "comparisons.jsonl"), [{ id: "comparison_1" }]);
  writeJsonl(path.join(root, ".sera-memory", "lesson-candidates.jsonl"), [{ id: "lesson_1" }]);
  writeJsonl(path.join(root, ".sera-autonomy", "loops.jsonl"), [{ id: "loop_1" }]);
}

describe("Operator Console v2 / Terminal UI", () => {
  it("builds a dashboard from local evidence without requiring external services", async () => {
    const root = tempRoot();
    seedRoot(root);
    const { buildOperatorTerminalDashboard } = await loadConsoleV2();

    const result = buildOperatorTerminalDashboard(root);

    expect(result.ok).toBe(true);
    expect(result.dashboard.certification.certifiedLevel).toBe("operator-console-v1");
    expect(result.dashboard.certification.freeCoreThroughPhase).toBe(45);
    expect(result.dashboard.panels.map((panel: any) => panel.id)).toContain("research");
    expect(result.dashboard.panels.map((panel: any) => panel.id)).toContain("certification");
    expect(result.dashboard.guardrails.some((item: string) => item.includes("does not add mutation authority"))).toBe(true);
  });

  it("renders terminal text with panels, guardrails, and next actions", async () => {
    const root = tempRoot();
    seedRoot(root);
    const { buildOperatorTerminalDashboard, renderOperatorTerminalDashboard } = await loadConsoleV2();
    const result = buildOperatorTerminalDashboard(root);

    const text = renderOperatorTerminalDashboard(result.dashboard);

    expect(text).toContain("S.E.R.A. Operator Console v2");
    expect(text).toContain("Certified Level: operator-console-v1");
    expect(text).toContain("Research");
    expect(text).toContain("Next Actions");
  });

  it("writes dashboard JSON, Markdown, and history artifacts locally", async () => {
    const root = tempRoot();
    seedRoot(root);
    const { writeOperatorTerminalDashboard } = await loadConsoleV2();

    const result = writeOperatorTerminalDashboard(root);

    expect(result.ok).toBe(true);
    expect(fs.existsSync(result.jsonPath)).toBe(true);
    expect(fs.existsSync(result.markdownPath)).toBe(true);
    expect(fs.existsSync(result.historyPath)).toBe(true);
    expect(fs.readFileSync(result.markdownPath, "utf8")).toContain("S.E.R.A. Operator Console v2 Dashboard");
  });
});
