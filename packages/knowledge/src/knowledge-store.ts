import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createSeraId, isPathInside, isoNow, normalizePath } from "@sera/shared";

export type KnowledgeStatus = "completed" | "blocked";
export type KnowledgeSourceType = "file" | "directory";

export interface KnowledgeDocumentRecord {
  id: string;
  title: string;
  sourceType: KnowledgeSourceType;
  relativePath: string;
  absolutePath: string;
  ingestedAt: string;
  sizeBytes: number;
  lineCount: number;
  sha256: string;
  chunkCount: number;
  status: "indexed";
}

export interface KnowledgeChunkRecord {
  id: string;
  documentId: string;
  title: string;
  relativePath: string;
  chunkIndex: number;
  lineStart: number;
  lineEnd: number;
  text: string;
  keywords: string[];
  charCount: number;
  createdAt: string;
}

export interface KnowledgeSearchHit {
  chunkId: string;
  documentId: string;
  title: string;
  relativePath: string;
  chunkIndex: number;
  lineStart: number;
  lineEnd: number;
  score: number;
  matchedTerms: string[];
  snippet: string;
}

export interface KnowledgeSearchRecord {
  id: string;
  query: string;
  normalizedTerms: string[];
  createdAt: string;
  resultCount: number;
  topResultDocumentId?: string;
}

export interface KnowledgeSummary {
  createdAt: string;
  knowledgeDir: string;
  documentCount: number;
  chunkCount: number;
  searchCount: number;
}

export interface KnowledgeIngestResult {
  ok: boolean;
  status: KnowledgeStatus;
  message: string;
  knowledgeDir: string;
  document?: KnowledgeDocumentRecord;
  chunks?: KnowledgeChunkRecord[];
  documentPath?: string;
  chunkPath?: string;
  summaryPath?: string;
}

export interface KnowledgeDirectoryIngestResult {
  ok: boolean;
  status: KnowledgeStatus;
  message: string;
  knowledgeDir: string;
  documents: KnowledgeDocumentRecord[];
  blocked: string[];
  skipped: string[];
  documentPath?: string;
  chunkPath?: string;
  summaryPath?: string;
}

export interface KnowledgeListResult {
  ok: true;
  status: "completed";
  knowledgeDir: string;
  documents?: KnowledgeDocumentRecord[];
  chunks?: KnowledgeChunkRecord[];
}

export interface KnowledgeInspectResult {
  ok: boolean;
  status: KnowledgeStatus;
  message: string;
  knowledgeDir: string;
  document?: KnowledgeDocumentRecord;
  chunks?: KnowledgeChunkRecord[];
}

export interface KnowledgeSearchResult {
  ok: boolean;
  status: KnowledgeStatus;
  message: string;
  knowledgeDir: string;
  query: string;
  hits: KnowledgeSearchHit[];
  searchRecord?: KnowledgeSearchRecord;
  searchPath?: string;
}

export interface KnowledgeSummaryResult {
  ok: true;
  status: "completed";
  knowledgeDir: string;
  summary: KnowledgeSummary;
  summaryPath: string;
}

export interface IngestDirectoryOptions {
  extensions?: string[];
  limit?: number;
}

const DEFAULT_EXTENSIONS = new Set([".md", ".txt", ".ts", ".tsx", ".js", ".json"]);
const IGNORED_DIRS = new Set([".git", "node_modules", "dist", ".sera-runs", ".sera-cert", ".sera-memory", ".sera-tasks", ".sera-knowledge"]);
const MAX_FILE_BYTES = 512 * 1024;
const CHUNK_LINE_COUNT = 40;

export class KnowledgeStore {
  readonly rootDir: string;
  readonly knowledgeDir: string;

  constructor(rootDir: string) {
    this.rootDir = path.resolve(rootDir);
    this.knowledgeDir = path.join(this.rootDir, ".sera-knowledge");
    fs.mkdirSync(this.knowledgeDir, { recursive: true });
  }

  ingestFile(relativePath: string, title?: string, sourceType: KnowledgeSourceType = "file"): KnowledgeIngestResult {
    const resolved = this.resolveRelativePath(relativePath);
    if (!resolved.ok) {
      return { ok: false, status: "blocked", message: resolved.message, knowledgeDir: this.knowledgeDir };
    }
    if (!fs.existsSync(resolved.absolutePath) || !fs.statSync(resolved.absolutePath).isFile()) {
      return { ok: false, status: "blocked", message: `Knowledge source file not found: ${relativePath}`, knowledgeDir: this.knowledgeDir };
    }
    const ext = path.extname(resolved.absolutePath).toLowerCase();
    if (!DEFAULT_EXTENSIONS.has(ext)) {
      return { ok: false, status: "blocked", message: `Unsupported knowledge file type: ${ext || "<none>"}`, knowledgeDir: this.knowledgeDir };
    }
    const stat = fs.statSync(resolved.absolutePath);
    if (stat.size > MAX_FILE_BYTES) {
      return { ok: false, status: "blocked", message: `Knowledge source file is too large: ${stat.size} bytes`, knowledgeDir: this.knowledgeDir };
    }

    const text = fs.readFileSync(resolved.absolutePath, "utf8");
    const lines = text.split(/\r?\n/);
    const documentId = createSeraId("knowledge_doc");
    const chunks = this.chunkText({
      documentId,
      title: title?.trim() || path.basename(resolved.relativePath),
      relativePath: resolved.relativePath,
      text,
      lines
    });
    const document: KnowledgeDocumentRecord = {
      id: documentId,
      title: title?.trim() || path.basename(resolved.relativePath),
      sourceType,
      relativePath: resolved.relativePath,
      absolutePath: resolved.absolutePath,
      ingestedAt: isoNow(),
      sizeBytes: stat.size,
      lineCount: lines.length,
      sha256: sha256(text),
      chunkCount: chunks.length,
      status: "indexed"
    };

    const documentPath = this.appendJsonl("documents.jsonl", document);
    const chunkPath = this.appendJsonlMany("chunks.jsonl", chunks);
    const summaryPath = this.writeSummary();
    return {
      ok: true,
      status: "completed",
      message: `Indexed ${resolved.relativePath} into ${chunks.length} chunk(s).`,
      knowledgeDir: this.knowledgeDir,
      document,
      chunks,
      documentPath,
      chunkPath,
      summaryPath
    };
  }

  ingestDirectory(relativeDir: string, options: IngestDirectoryOptions = {}): KnowledgeDirectoryIngestResult {
    const resolved = this.resolveRelativePath(relativeDir);
    if (!resolved.ok) {
      return { ok: false, status: "blocked", message: resolved.message, knowledgeDir: this.knowledgeDir, documents: [], blocked: [relativeDir], skipped: [] };
    }
    if (!fs.existsSync(resolved.absolutePath) || !fs.statSync(resolved.absolutePath).isDirectory()) {
      return { ok: false, status: "blocked", message: `Knowledge source directory not found: ${relativeDir}`, knowledgeDir: this.knowledgeDir, documents: [], blocked: [relativeDir], skipped: [] };
    }

    const allowedExtensions = new Set((options.extensions ?? [...DEFAULT_EXTENSIONS]).map((ext) => ext.startsWith(".") ? ext.toLowerCase() : `.${ext.toLowerCase()}`));
    const limit = options.limit ?? 50;
    const files = this.walkFiles(resolved.absolutePath, allowedExtensions, limit);
    const documents: KnowledgeDocumentRecord[] = [];
    const blocked: string[] = [];
    const skipped: string[] = [];

    for (const file of files) {
      const relativePath = normalizePath(path.relative(this.rootDir, file));
      const result = this.ingestFile(relativePath, undefined, "directory");
      if (result.ok && result.document) {
        documents.push(result.document);
      } else {
        blocked.push(relativePath);
      }
    }

    if (files.length === 0) {
      skipped.push("No supported files found.");
    }

    const summaryPath = this.writeSummary();
    return {
      ok: true,
      status: "completed",
      message: `Indexed ${documents.length} file(s) from ${resolved.relativePath}.`,
      knowledgeDir: this.knowledgeDir,
      documents,
      blocked,
      skipped,
      documentPath: this.path("documents.jsonl"),
      chunkPath: this.path("chunks.jsonl"),
      summaryPath
    };
  }

  listDocuments(): KnowledgeDocumentRecord[] {
    return readJsonl<KnowledgeDocumentRecord>(this.path("documents.jsonl"));
  }

  listChunks(documentId?: string): KnowledgeChunkRecord[] {
    const chunks = readJsonl<KnowledgeChunkRecord>(this.path("chunks.jsonl"));
    return documentId ? chunks.filter((chunk) => chunk.documentId === documentId) : chunks;
  }

  inspectDocument(documentId: string): KnowledgeInspectResult {
    const document = this.listDocuments().find((item) => item.id === documentId);
    if (!document) {
      return { ok: false, status: "blocked", message: `Knowledge document not found: ${documentId}`, knowledgeDir: this.knowledgeDir };
    }
    return {
      ok: true,
      status: "completed",
      message: `Knowledge document found: ${document.title}`,
      knowledgeDir: this.knowledgeDir,
      document,
      chunks: this.listChunks(document.id)
    };
  }

  search(query: string, limit = 5): KnowledgeSearchResult {
    const terms = tokenize(query);
    if (terms.length === 0) {
      return { ok: false, status: "blocked", message: "Knowledge search query must include searchable terms.", knowledgeDir: this.knowledgeDir, query, hits: [] };
    }

    const hits = this.listChunks()
      .map((chunk) => scoreChunk(chunk, terms))
      .filter((hit): hit is KnowledgeSearchHit => hit !== undefined)
      .sort((a, b) => b.score - a.score || a.relativePath.localeCompare(b.relativePath))
      .slice(0, Math.max(1, limit));

    const record: KnowledgeSearchRecord = {
      id: createSeraId("knowledge_search"),
      query,
      normalizedTerms: terms,
      createdAt: isoNow(),
      resultCount: hits.length,
      topResultDocumentId: hits[0]?.documentId
    };
    const searchPath = this.appendJsonl("search-history.jsonl", record);
    this.writeSummary();

    return {
      ok: true,
      status: "completed",
      message: hits.length > 0 ? `Found ${hits.length} local knowledge result(s).` : "No local knowledge results found.",
      knowledgeDir: this.knowledgeDir,
      query,
      hits,
      searchRecord: record,
      searchPath
    };
  }

  summarize(): KnowledgeSummary {
    return {
      createdAt: isoNow(),
      knowledgeDir: this.knowledgeDir,
      documentCount: this.listDocuments().length,
      chunkCount: this.listChunks().length,
      searchCount: readJsonl<KnowledgeSearchRecord>(this.path("search-history.jsonl")).length
    };
  }

  writeSummary(): string {
    const summary = this.summarize();
    const target = this.path("summary.json");
    fs.writeFileSync(target, JSON.stringify(summary, null, 2) + "\n", "utf8");
    return target;
  }

  path(...segments: string[]): string {
    return path.join(this.knowledgeDir, ...segments);
  }

  private resolveRelativePath(relativePath: string): { ok: true; relativePath: string; absolutePath: string } | { ok: false; message: string } {
    if (!relativePath || path.isAbsolute(relativePath)) {
      return { ok: false, message: "Knowledge paths must be relative to the project root." };
    }
    const absolutePath = path.resolve(this.rootDir, relativePath);
    if (!isPathInside(this.rootDir, absolutePath)) {
      return { ok: false, message: "Knowledge paths must be relative and cannot escape the project root." };
    }
    const normalized = normalizePath(path.relative(this.rootDir, absolutePath));
    const firstSegment = normalized.split("/")[0];
    if (IGNORED_DIRS.has(firstSegment)) {
      return { ok: false, message: `Knowledge path is inside an ignored runtime directory: ${firstSegment}` };
    }
    return { ok: true, relativePath: normalized || ".", absolutePath };
  }

  private walkFiles(startDir: string, extensions: Set<string>, limit: number): string[] {
    const results: string[] = [];
    const visit = (dir: string): void => {
      if (results.length >= limit) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
      for (const entry of entries) {
        if (results.length >= limit) break;
        if (entry.isDirectory()) {
          if (!IGNORED_DIRS.has(entry.name)) {
            visit(path.join(dir, entry.name));
          }
          continue;
        }
        if (entry.isFile() && extensions.has(path.extname(entry.name).toLowerCase())) {
          const fullPath = path.join(dir, entry.name);
          const stat = fs.statSync(fullPath);
          if (stat.size <= MAX_FILE_BYTES) {
            results.push(fullPath);
          }
        }
      }
    };
    visit(startDir);
    return results;
  }

  private chunkText(input: { documentId: string; title: string; relativePath: string; text: string; lines: string[] }): KnowledgeChunkRecord[] {
    const chunks: KnowledgeChunkRecord[] = [];
    for (let i = 0; i < input.lines.length; i += CHUNK_LINE_COUNT) {
      const selected = input.lines.slice(i, i + CHUNK_LINE_COUNT);
      const text = selected.join("\n").trim();
      if (!text) continue;
      chunks.push({
        id: createSeraId("knowledge_chunk"),
        documentId: input.documentId,
        title: input.title,
        relativePath: input.relativePath,
        chunkIndex: chunks.length,
        lineStart: i + 1,
        lineEnd: i + selected.length,
        text,
        keywords: unique(tokenize(text)).slice(0, 25),
        charCount: text.length,
        createdAt: isoNow()
      });
    }
    if (chunks.length === 0) {
      chunks.push({
        id: createSeraId("knowledge_chunk"),
        documentId: input.documentId,
        title: input.title,
        relativePath: input.relativePath,
        chunkIndex: 0,
        lineStart: 1,
        lineEnd: 1,
        text: "",
        keywords: [],
        charCount: 0,
        createdAt: isoNow()
      });
    }
    return chunks;
  }

  private appendJsonl(relativePath: string, value: unknown): string {
    const target = this.path(relativePath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.appendFileSync(target, JSON.stringify(value) + "\n", "utf8");
    return target;
  }

  private appendJsonlMany(relativePath: string, values: unknown[]): string {
    const target = this.path(relativePath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    for (const value of values) {
      fs.appendFileSync(target, JSON.stringify(value) + "\n", "utf8");
    }
    return target;
  }
}

function readJsonl<T>(filePath: string): T[] {
  if (!fs.existsSync(filePath)) return [];
  return fs.readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as T);
}

function sha256(text: string): string {
  return crypto.createHash("sha256").update(text).digest("hex");
}

function tokenize(text: string): string[] {
  return unique(text.toLowerCase().match(/[a-z0-9][a-z0-9_-]{2,}/g) ?? []);
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function scoreChunk(chunk: KnowledgeChunkRecord, terms: string[]): KnowledgeSearchHit | undefined {
  const text = chunk.text.toLowerCase();
  const matchedTerms = terms.filter((term) => text.includes(term));
  if (matchedTerms.length === 0) return undefined;
  let score = matchedTerms.length * 5;
  for (const term of matchedTerms) {
    score += countOccurrences(text, term);
  }
  return {
    chunkId: chunk.id,
    documentId: chunk.documentId,
    title: chunk.title,
    relativePath: chunk.relativePath,
    chunkIndex: chunk.chunkIndex,
    lineStart: chunk.lineStart,
    lineEnd: chunk.lineEnd,
    score,
    matchedTerms,
    snippet: createSnippet(chunk.text, matchedTerms[0])
  };
}

function countOccurrences(text: string, term: string): number {
  return text.split(term).length - 1;
}

function createSnippet(text: string, term: string): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  const idx = normalized.toLowerCase().indexOf(term.toLowerCase());
  if (idx < 0) return normalized.slice(0, 220);
  const start = Math.max(0, idx - 80);
  const end = Math.min(normalized.length, idx + term.length + 140);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < normalized.length ? "…" : "";
  return `${prefix}${normalized.slice(start, end)}${suffix}`;
}
