import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { SeraKernel } from "@sera/kernel";
import { KnowledgeStore } from "@sera/knowledge";

function makeRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "sera-knowledge-test-"));
}

describe("Knowledge Ingestion + Local Retrieval v1", () => {
  it("ingests a local file and writes document/chunk records", () => {
    const root = makeRoot();
    fs.mkdirSync(path.join(root, "docs"), { recursive: true });
    fs.writeFileSync(path.join(root, "docs", "guide.md"), "# Guide\nSERA planner queues work.\nLocal retrieval provides evidence.\n", "utf8");

    const kernel = new SeraKernel({ rootDir: root });
    const result = kernel.ingestKnowledgeFile({ relativePath: "docs/guide.md", title: "Guide" });

    expect(result.ok).toBe(true);
    expect(result.document?.relativePath).toBe("docs/guide.md");
    expect(result.document?.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(result.chunks?.length).toBeGreaterThanOrEqual(1);
    expect(fs.existsSync(path.join(root, ".sera-knowledge", "documents.jsonl"))).toBe(true);
    expect(fs.existsSync(path.join(root, ".sera-knowledge", "chunks.jsonl"))).toBe(true);
  });

  it("blocks path traversal outside the project root", () => {
    const kernel = new SeraKernel({ rootDir: makeRoot() });
    const result = kernel.ingestKnowledgeFile({ relativePath: "../outside.md" });

    expect(result.ok).toBe(false);
    expect(result.status).toBe("blocked");
    expect(result.message).toContain("cannot escape");
  });

  it("searches indexed chunks without requiring an LLM", () => {
    const root = makeRoot();
    fs.mkdirSync(path.join(root, "docs"), { recursive: true });
    fs.writeFileSync(path.join(root, "docs", "retrieval.md"), "Knowledge retrieval should find local evidence for planner tasks.\n", "utf8");

    const kernel = new SeraKernel({ rootDir: root });
    kernel.ingestKnowledgeFile({ relativePath: "docs/retrieval.md" });
    const search = kernel.searchKnowledge("local evidence", 3);

    expect(search.ok).toBe(true);
    expect(search.hits.length).toBe(1);
    expect(search.hits[0].matchedTerms).toContain("local");
    expect(search.hits[0].snippet).toContain("local evidence");
    expect(fs.existsSync(path.join(root, ".sera-knowledge", "search-history.jsonl"))).toBe(true);
  });

  it("ingests directories while ignoring runtime folders", () => {
    const root = makeRoot();
    fs.mkdirSync(path.join(root, "docs"), { recursive: true });
    fs.mkdirSync(path.join(root, ".sera-memory"), { recursive: true });
    fs.writeFileSync(path.join(root, "docs", "one.md"), "One approved lesson can become a rule.\n", "utf8");
    fs.writeFileSync(path.join(root, ".sera-memory", "ignored.txt"), "Do not ingest runtime memory.\n", "utf8");

    const kernel = new SeraKernel({ rootDir: root });
    const result = kernel.ingestKnowledgeDirectory({ relativeDir: ".", extensions: [".md", ".txt"], limit: 10 });
    const docs = new KnowledgeStore(root).listDocuments();

    expect(result.ok).toBe(true);
    expect(docs.some((doc) => doc.relativePath === "docs/one.md")).toBe(true);
    expect(docs.every((doc) => !doc.relativePath.startsWith(".sera-memory/"))).toBe(true);
  });

  it("summarizes document, chunk, and search counts", () => {
    const root = makeRoot();
    fs.mkdirSync(path.join(root, "docs"), { recursive: true });
    fs.writeFileSync(path.join(root, "docs", "summary.md"), "Summary records search count and chunk count.\n", "utf8");

    const kernel = new SeraKernel({ rootDir: root });
    kernel.ingestKnowledgeFile({ relativePath: "docs/summary.md" });
    kernel.searchKnowledge("summary chunk", 5);
    const result = kernel.getKnowledgeSummary();

    expect(result.ok).toBe(true);
    expect(result.summary.documentCount).toBe(1);
    expect(result.summary.chunkCount).toBeGreaterThanOrEqual(1);
    expect(result.summary.searchCount).toBe(1);
    expect(fs.existsSync(result.summaryPath)).toBe(true);
  });
});
