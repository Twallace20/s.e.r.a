import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { KnowledgeStore } from "@sera/knowledge";
import { SeraKernel } from "@sera/kernel";
import { ResearchKnowledgeWorker } from "@sera/research";

function tempRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "sera-research-worker-test-"));
}

function writeSource(root: string, relativePath: string, text: string): void {
  const target = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, text, "utf8");
}

describe("Research + Knowledge Worker v1", () => {
  it("answers only from indexed local knowledge with citations", () => {
    const root = tempRoot();
    writeSource(root, "docs/local.md", "S.E.R.A. research knowledge worker answers from local indexed evidence and citations.\nIt refuses unstated assumptions.\n");
    const knowledge = new KnowledgeStore(root);
    const ingest = knowledge.ingestFile("docs/local.md", "Local Research Doc");
    expect(ingest.ok).toBe(true);

    const worker = new ResearchKnowledgeWorker(root);
    const result = worker.answer("research knowledge worker citations", 5);

    expect(result.ok).toBe(true);
    expect(result.status).toBe("completed");
    expect(result.citations.length).toBeGreaterThan(0);
    expect(result.answer).toContain("docs/local.md");
    expect(result.recordPath && fs.existsSync(result.recordPath)).toBe(true);
    expect(result.reportPath && fs.existsSync(result.reportPath)).toBe(true);
    expect(result.limitation).toContain("indexed local");
  });

  it("reports insufficient evidence instead of fabricating an answer", () => {
    const root = tempRoot();
    writeSource(root, "docs/local.md", "S.E.R.A. has local knowledge about task queues.\n");
    new KnowledgeStore(root).ingestFile("docs/local.md", "Local Doc");

    const result = new ResearchKnowledgeWorker(root).answer("zzzz unmatched missing evidence", 3);

    expect(result.ok).toBe(false);
    expect(result.status).toBe("insufficient_evidence");
    expect(result.citations).toEqual([]);
    expect(result.answer).toContain("Insufficient local evidence");
  });

  it("compares multiple local source documents through the kernel", () => {
    const root = tempRoot();
    writeSource(root, "docs/a.md", "Phase 21 research knowledge worker uses local evidence citations.\n");
    writeSource(root, "docs/b.md", "The research knowledge worker compares local evidence citations across documents.\n");
    const kernel = new SeraKernel({ rootDir: root });
    expect(kernel.ingestKnowledgeFile({ relativePath: "docs/a.md", title: "A" }).ok).toBe(true);
    expect(kernel.ingestKnowledgeFile({ relativePath: "docs/b.md", title: "B" }).ok).toBe(true);

    const result = kernel.compareResearchKnowledge("research knowledge worker citations", 8);

    expect(result.ok).toBe(true);
    expect(result.documents.length).toBe(2);
    expect(result.synthesis).toContain("Local comparison");
    expect(result.recordPath && fs.existsSync(result.recordPath)).toBe(true);
  });

  it("summarizes local knowledge and records history", () => {
    const root = tempRoot();
    writeSource(root, "docs/summary.md", "Local research summaries must cite indexed evidence and preserve limitations.\n");
    const kernel = new SeraKernel({ rootDir: root });
    expect(kernel.ingestKnowledgeFile({ relativePath: "docs/summary.md", title: "Summary Doc" }).ok).toBe(true);

    const result = kernel.summarizeResearchKnowledge("local research summaries evidence", 5);
    const history = kernel.listResearchKnowledgeHistory("summaries");
    const summary = kernel.getResearchKnowledgeSummary();

    expect(result.ok).toBe(true);
    expect(result.citations.length).toBeGreaterThan(0);
    expect(history.summaries?.length).toBe(1);
    expect(summary.summary.summaryCount).toBe(1);
    expect(summary.summaryPath && fs.existsSync(summary.summaryPath)).toBe(true);
  });
});
