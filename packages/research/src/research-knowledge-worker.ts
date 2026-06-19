import fs from "node:fs";
import path from "node:path";
import { KnowledgeSearchHit, KnowledgeStore } from "@sera/knowledge";
import { createSeraId, isoNow } from "@sera/shared";

export type ResearchKnowledgeStatus = "completed" | "insufficient_evidence" | "blocked";
export type ResearchConfidence = "high" | "medium" | "low" | "none";
export type ResearchHistoryKind = "answers" | "comparisons" | "summaries";

export interface ResearchEvidenceCitation {
  chunkId: string;
  documentId: string;
  title: string;
  relativePath: string;
  lineStart: number;
  lineEnd: number;
  score: number;
  matchedTerms: string[];
  snippet: string;
}

export interface ResearchKnowledgeAnswerRecord {
  id: string;
  createdAt: string;
  query: string;
  status: ResearchKnowledgeStatus;
  confidence: ResearchConfidence;
  answer: string;
  limitation: string;
  citations: ResearchEvidenceCitation[];
  source: "research-knowledge-worker-v1";
}

export interface ResearchKnowledgeAnswerResult {
  ok: boolean;
  status: ResearchKnowledgeStatus;
  message: string;
  researchDir: string;
  knowledgeDir: string;
  query: string;
  answer: string;
  confidence: ResearchConfidence;
  citations: ResearchEvidenceCitation[];
  limitation: string;
  record?: ResearchKnowledgeAnswerRecord;
  recordPath?: string;
  reportPath?: string;
  summaryPath?: string;
}

export interface ResearchComparisonDocument {
  relativePath: string;
  title: string;
  citationCount: number;
  matchedTerms: string[];
  evidence: ResearchEvidenceCitation[];
}

export interface ResearchKnowledgeComparisonRecord {
  id: string;
  createdAt: string;
  topic: string;
  status: ResearchKnowledgeStatus;
  confidence: ResearchConfidence;
  comparedDocumentCount: number;
  commonTerms: string[];
  documents: ResearchComparisonDocument[];
  synthesis: string;
  limitation: string;
  source: "research-knowledge-worker-v1";
}

export interface ResearchKnowledgeComparisonResult {
  ok: boolean;
  status: ResearchKnowledgeStatus;
  message: string;
  researchDir: string;
  knowledgeDir: string;
  topic: string;
  confidence: ResearchConfidence;
  documents: ResearchComparisonDocument[];
  commonTerms: string[];
  synthesis: string;
  limitation: string;
  record?: ResearchKnowledgeComparisonRecord;
  recordPath?: string;
  reportPath?: string;
  summaryPath?: string;
}

export interface ResearchKnowledgeSummaryRecord {
  id: string;
  createdAt: string;
  query: string;
  status: ResearchKnowledgeStatus;
  confidence: ResearchConfidence;
  documentCount: number;
  citationCount: number;
  summary: string;
  limitations: string[];
  citations: ResearchEvidenceCitation[];
  source: "research-knowledge-worker-v1";
}

export interface ResearchKnowledgeSummaryResult {
  ok: boolean;
  status: ResearchKnowledgeStatus;
  message: string;
  researchDir: string;
  knowledgeDir: string;
  query: string;
  confidence: ResearchConfidence;
  summary: string;
  limitations: string[];
  citations: ResearchEvidenceCitation[];
  record?: ResearchKnowledgeSummaryRecord;
  recordPath?: string;
  reportPath?: string;
  summaryPath?: string;
}

export interface ResearchKnowledgeStoreSummary {
  createdAt: string;
  researchDir: string;
  answerCount: number;
  comparisonCount: number;
  summaryCount: number;
  source: "research-knowledge-worker-v1";
}

export interface ResearchKnowledgeHistoryResult {
  ok: true;
  status: "completed";
  researchDir: string;
  answers?: ResearchKnowledgeAnswerRecord[];
  comparisons?: ResearchKnowledgeComparisonRecord[];
  summaries?: ResearchKnowledgeSummaryRecord[];
}

export interface ResearchKnowledgeStoreSummaryResult {
  ok: true;
  status: "completed";
  researchDir: string;
  summary: ResearchKnowledgeStoreSummary;
  summaryPath: string;
}

export class ResearchKnowledgeWorker {
  readonly rootDir: string;
  readonly researchDir: string;
  readonly knowledge: KnowledgeStore;

  constructor(rootDir: string) {
    this.rootDir = path.resolve(rootDir);
    this.researchDir = path.join(this.rootDir, ".sera-research");
    this.knowledge = new KnowledgeStore(this.rootDir);
    fs.mkdirSync(this.researchDir, { recursive: true });
  }

  answer(query: string, limit = 5): ResearchKnowledgeAnswerResult {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) {
      return this.blockedAnswer(query, "Research query must not be empty.");
    }

    const search = this.knowledge.search(normalizedQuery, limit);
    const citations = search.hits.map(toCitation);
    const confidence = confidenceFromCitations(citations);
    const limitation = citations.length > 0
      ? "Answer is limited to indexed local S.E.R.A. knowledge and deterministic lexical matches."
      : "No local indexed evidence matched this query. S.E.R.A. must not answer from memory or unstated assumptions.";
    const answer = citations.length > 0 ? renderAnswer(normalizedQuery, citations) : "Insufficient local evidence to answer this question.";
    const status: ResearchKnowledgeStatus = citations.length > 0 ? "completed" : "insufficient_evidence";
    const record: ResearchKnowledgeAnswerRecord = {
      id: createSeraId("research_answer"),
      createdAt: isoNow(),
      query: normalizedQuery,
      status,
      confidence,
      answer,
      limitation,
      citations,
      source: "research-knowledge-worker-v1"
    };
    const recordPath = this.appendJsonl("answers.jsonl", record);
    const reportPath = this.writeMarkdownReport(path.join("reports", `${record.id}.md`), renderAnswerMarkdown(record));
    const summaryPath = this.writeSummary();
    return {
      ok: status === "completed",
      status,
      message: status === "completed" ? `Answered from ${citations.length} local citation(s).` : "Insufficient local evidence for an answer.",
      researchDir: this.researchDir,
      knowledgeDir: this.knowledge.knowledgeDir,
      query: normalizedQuery,
      answer,
      confidence,
      citations,
      limitation,
      record,
      recordPath,
      reportPath,
      summaryPath
    };
  }

  compare(topic: string, limit = 8): ResearchKnowledgeComparisonResult {
    const normalizedTopic = topic.trim();
    if (!normalizedTopic) {
      return this.blockedComparison(topic, "Research comparison topic must not be empty.");
    }
    const search = this.knowledge.search(normalizedTopic, limit);
    const citations = search.hits.map(toCitation);
    const documents = groupByDocument(citations);
    const status: ResearchKnowledgeStatus = documents.length >= 2 ? "completed" : "insufficient_evidence";
    const confidence = status === "completed" ? confidenceFromCitations(citations) : "none";
    const commonTerms = commonMatchedTerms(documents);
    const limitation = status === "completed"
      ? "Comparison is limited to local indexed evidence and lexical overlap across retrieved documents."
      : "Need at least two local indexed source documents with matching evidence before comparing.";
    const synthesis = status === "completed"
      ? renderComparison(normalizedTopic, documents, commonTerms)
      : "Insufficient local evidence to compare sources.";
    const record: ResearchKnowledgeComparisonRecord = {
      id: createSeraId("research_compare"),
      createdAt: isoNow(),
      topic: normalizedTopic,
      status,
      confidence,
      comparedDocumentCount: documents.length,
      commonTerms,
      documents,
      synthesis,
      limitation,
      source: "research-knowledge-worker-v1"
    };
    const recordPath = this.appendJsonl("comparisons.jsonl", record);
    const reportPath = this.writeMarkdownReport(path.join("reports", `${record.id}.md`), renderComparisonMarkdown(record));
    const summaryPath = this.writeSummary();
    return {
      ok: status === "completed",
      status,
      message: status === "completed" ? `Compared ${documents.length} local source document(s).` : "Insufficient local evidence for comparison.",
      researchDir: this.researchDir,
      knowledgeDir: this.knowledge.knowledgeDir,
      topic: normalizedTopic,
      confidence,
      documents,
      commonTerms,
      synthesis,
      limitation,
      record,
      recordPath,
      reportPath,
      summaryPath
    };
  }

  summarize(query: string, limit = 8): ResearchKnowledgeSummaryResult {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) {
      return this.blockedSummary(query, "Research summary query must not be empty.");
    }
    const search = this.knowledge.search(normalizedQuery, limit);
    const citations = search.hits.map(toCitation);
    const documentCount = new Set(citations.map((citation) => citation.relativePath)).size;
    const status: ResearchKnowledgeStatus = citations.length > 0 ? "completed" : "insufficient_evidence";
    const confidence = confidenceFromCitations(citations);
    const limitations = citations.length > 0
      ? ["Summary is extractive and limited to indexed local knowledge.", "No external web, paid API, or unstated model knowledge was used."]
      : ["No local indexed evidence matched the query.", "S.E.R.A. must ingest relevant local sources before summarizing this area."];
    const summary = citations.length > 0 ? renderSummary(normalizedQuery, citations) : "Insufficient local evidence to summarize this topic.";
    const record: ResearchKnowledgeSummaryRecord = {
      id: createSeraId("research_summary"),
      createdAt: isoNow(),
      query: normalizedQuery,
      status,
      confidence,
      documentCount,
      citationCount: citations.length,
      summary,
      limitations,
      citations,
      source: "research-knowledge-worker-v1"
    };
    const recordPath = this.appendJsonl("summaries.jsonl", record);
    const reportPath = this.writeMarkdownReport(path.join("reports", `${record.id}.md`), renderSummaryMarkdown(record));
    const summaryPath = this.writeSummary();
    return {
      ok: status === "completed",
      status,
      message: status === "completed" ? `Summarized ${citations.length} local citation(s).` : "Insufficient local evidence for summary.",
      researchDir: this.researchDir,
      knowledgeDir: this.knowledge.knowledgeDir,
      query: normalizedQuery,
      confidence,
      summary,
      limitations,
      citations,
      record,
      recordPath,
      reportPath,
      summaryPath
    };
  }

  listHistory(kind: ResearchHistoryKind): ResearchKnowledgeHistoryResult {
    if (kind === "answers") return { ok: true, status: "completed", researchDir: this.researchDir, answers: this.listAnswers() };
    if (kind === "comparisons") return { ok: true, status: "completed", researchDir: this.researchDir, comparisons: this.listComparisons() };
    return { ok: true, status: "completed", researchDir: this.researchDir, summaries: this.listSummaries() };
  }

  getSummary(): ResearchKnowledgeStoreSummaryResult {
    const summaryPath = this.writeSummary();
    return { ok: true, status: "completed", researchDir: this.researchDir, summary: this.summarizeStore(), summaryPath };
  }

  listAnswers(): ResearchKnowledgeAnswerRecord[] {
    return readJsonl<ResearchKnowledgeAnswerRecord>(this.path("answers.jsonl"));
  }

  listComparisons(): ResearchKnowledgeComparisonRecord[] {
    return readJsonl<ResearchKnowledgeComparisonRecord>(this.path("comparisons.jsonl"));
  }

  listSummaries(): ResearchKnowledgeSummaryRecord[] {
    return readJsonl<ResearchKnowledgeSummaryRecord>(this.path("summaries.jsonl"));
  }

  summarizeStore(): ResearchKnowledgeStoreSummary {
    return {
      createdAt: isoNow(),
      researchDir: this.researchDir,
      answerCount: this.listAnswers().length,
      comparisonCount: this.listComparisons().length,
      summaryCount: this.listSummaries().length,
      source: "research-knowledge-worker-v1"
    };
  }

  writeSummary(): string {
    const target = this.path("summary.json");
    fs.writeFileSync(target, JSON.stringify(this.summarizeStore(), null, 2) + "\n", "utf8");
    return target;
  }

  path(...segments: string[]): string {
    return path.join(this.researchDir, ...segments);
  }

  private appendJsonl(relativePath: string, value: unknown): string {
    const target = this.path(relativePath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.appendFileSync(target, JSON.stringify(value) + "\n", "utf8");
    return target;
  }

  private writeMarkdownReport(relativePath: string, markdown: string): string {
    const target = this.path(relativePath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, markdown.trimEnd() + "\n", "utf8");
    return target;
  }

  private blockedAnswer(query: string, message: string): ResearchKnowledgeAnswerResult {
    return { ok: false, status: "blocked", message, researchDir: this.researchDir, knowledgeDir: this.knowledge.knowledgeDir, query, answer: "", confidence: "none", citations: [], limitation: message };
  }

  private blockedComparison(topic: string, message: string): ResearchKnowledgeComparisonResult {
    return { ok: false, status: "blocked", message, researchDir: this.researchDir, knowledgeDir: this.knowledge.knowledgeDir, topic, confidence: "none", documents: [], commonTerms: [], synthesis: "", limitation: message };
  }

  private blockedSummary(query: string, message: string): ResearchKnowledgeSummaryResult {
    return { ok: false, status: "blocked", message, researchDir: this.researchDir, knowledgeDir: this.knowledge.knowledgeDir, query, confidence: "none", summary: "", limitations: [message], citations: [] };
  }
}

function toCitation(hit: KnowledgeSearchHit): ResearchEvidenceCitation {
  return {
    chunkId: hit.chunkId,
    documentId: hit.documentId,
    title: hit.title,
    relativePath: hit.relativePath,
    lineStart: hit.lineStart,
    lineEnd: hit.lineEnd,
    score: hit.score,
    matchedTerms: hit.matchedTerms,
    snippet: hit.snippet
  };
}

function confidenceFromCitations(citations: ResearchEvidenceCitation[]): ResearchConfidence {
  if (citations.length >= 4) return "high";
  if (citations.length >= 2) return "medium";
  if (citations.length === 1) return "low";
  return "none";
}

function renderAnswer(query: string, citations: ResearchEvidenceCitation[]): string {
  const lead = `Local indexed evidence for "${query}" appears in ${new Set(citations.map((item) => item.relativePath)).size} source document(s).`;
  const bullets = citations.slice(0, 5).map((citation) => `- ${citation.relativePath}:${citation.lineStart}-${citation.lineEnd} — ${citation.snippet}`);
  return [lead, ...bullets].join("\n");
}

function renderComparison(topic: string, documents: ResearchComparisonDocument[], commonTerms: string[]): string {
  const lines = [`Local comparison for "${topic}" found ${documents.length} source document(s).`];
  if (commonTerms.length > 0) lines.push(`Common matched terms: ${commonTerms.join(", ")}.`);
  for (const doc of documents.slice(0, 4)) {
    lines.push(`- ${doc.relativePath}: ${doc.citationCount} citation(s); terms: ${doc.matchedTerms.join(", ") || "none"}.`);
  }
  return lines.join("\n");
}

function renderSummary(query: string, citations: ResearchEvidenceCitation[]): string {
  const grouped = groupByDocument(citations);
  const lines = [`Local summary for "${query}" is based on ${citations.length} citation(s) across ${grouped.length} document(s).`];
  for (const doc of grouped.slice(0, 5)) {
    const first = doc.evidence[0];
    lines.push(`- ${doc.relativePath}: ${first?.snippet ?? "No snippet available."}`);
  }
  return lines.join("\n");
}

function groupByDocument(citations: ResearchEvidenceCitation[]): ResearchComparisonDocument[] {
  const map = new Map<string, ResearchComparisonDocument>();
  for (const citation of citations) {
    const current = map.get(citation.relativePath) ?? {
      relativePath: citation.relativePath,
      title: citation.title,
      citationCount: 0,
      matchedTerms: [],
      evidence: []
    };
    current.citationCount += 1;
    current.evidence.push(citation);
    current.matchedTerms = unique([...current.matchedTerms, ...citation.matchedTerms]).sort();
    map.set(citation.relativePath, current);
  }
  return [...map.values()].sort((a, b) => b.citationCount - a.citationCount || a.relativePath.localeCompare(b.relativePath));
}

function commonMatchedTerms(documents: ResearchComparisonDocument[]): string[] {
  if (documents.length < 2) return [];
  const documentTermSets = documents.map((doc) => new Set(doc.matchedTerms));
  const first = documentTermSets[0];
  if (!first) return [];
  const rest = documentTermSets.slice(1);
  return [...first].filter((term) => rest.every((set) => set.has(term))).sort();
}

function renderAnswerMarkdown(record: ResearchKnowledgeAnswerRecord): string {
  return [
    "# S.E.R.A. Research Answer",
    "",
    `Generated: ${record.createdAt}`,
    `Query: ${record.query}`,
    `Status: ${record.status}`,
    `Confidence: ${record.confidence}`,
    "",
    "## Answer",
    "",
    record.answer,
    "",
    "## Citations",
    "",
    ...renderCitationLines(record.citations),
    "",
    "## Limitation",
    "",
    record.limitation
  ].join("\n");
}

function renderComparisonMarkdown(record: ResearchKnowledgeComparisonRecord): string {
  return [
    "# S.E.R.A. Research Comparison",
    "",
    `Generated: ${record.createdAt}`,
    `Topic: ${record.topic}`,
    `Status: ${record.status}`,
    `Confidence: ${record.confidence}`,
    "",
    "## Synthesis",
    "",
    record.synthesis,
    "",
    "## Documents",
    "",
    ...record.documents.map((doc) => `- ${doc.relativePath}: ${doc.citationCount} citation(s); terms: ${doc.matchedTerms.join(", ") || "none"}`),
    "",
    "## Limitation",
    "",
    record.limitation
  ].join("\n");
}

function renderSummaryMarkdown(record: ResearchKnowledgeSummaryRecord): string {
  return [
    "# S.E.R.A. Research Summary",
    "",
    `Generated: ${record.createdAt}`,
    `Query: ${record.query}`,
    `Status: ${record.status}`,
    `Confidence: ${record.confidence}`,
    "",
    "## Summary",
    "",
    record.summary,
    "",
    "## Citations",
    "",
    ...renderCitationLines(record.citations),
    "",
    "## Limitations",
    "",
    ...record.limitations.map((item) => `- ${item}`)
  ].join("\n");
}

function renderCitationLines(citations: ResearchEvidenceCitation[]): string[] {
  if (citations.length === 0) return ["- None"];
  return citations.map((citation) => `- ${citation.relativePath}:${citation.lineStart}-${citation.lineEnd} (${citation.chunkId}) — ${citation.snippet}`);
}

function readJsonl<T>(filePath: string): T[] {
  if (!fs.existsSync(filePath)) return [];
  return fs.readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as T);
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}
