import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const DEFAULT_DB_RELATIVE_PATH = ".sera-sqlite/sera.sqlite";
const SUMMARY_RELATIVE_DIR = ".sera-sqlite/reports";
const SCHEMA_VERSION = 1;

export class SQLitePersistenceStore {
  constructor(options = {}) {
    this.rootDir = path.resolve(options.rootDir ?? process.cwd());
    this.dbRelativePath = options.dbRelativePath ?? DEFAULT_DB_RELATIVE_PATH;
    this.dbPath = resolveInsideRoot(this.rootDir, this.dbRelativePath);
    this.db = undefined;
  }

  initialize() {
    fs.mkdirSync(path.dirname(this.dbPath), { recursive: true });
    this.db = new DatabaseSync(this.dbPath);
    this.db.exec("PRAGMA foreign_keys = ON;");
    this.db.exec("PRAGMA journal_mode = WAL;");
    this.db.exec("PRAGMA synchronous = NORMAL;");
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS migrations (
        id TEXT PRIMARY KEY,
        applied_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        created_at TEXT NOT NULL,
        kind TEXT NOT NULL,
        source TEXT NOT NULL,
        status TEXT NOT NULL,
        payload_json TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS key_values (
        key TEXT PRIMARY KEY,
        value_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS evidence_records (
        id TEXT PRIMARY KEY,
        created_at TEXT NOT NULL,
        source_path TEXT NOT NULL,
        category TEXT NOT NULL,
        status TEXT NOT NULL,
        payload_json TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS phase_snapshots (
        id TEXT PRIMARY KEY,
        created_at TEXT NOT NULL,
        phase INTEGER NOT NULL,
        status TEXT NOT NULL,
        certified_level TEXT,
        free_core_through_phase INTEGER,
        payload_json TEXT NOT NULL
      );
    `);
    this.db.prepare("INSERT OR IGNORE INTO migrations (id, applied_at) VALUES (?, ?)").run("phase23_schema_v1", nowIso());
    return {
      ok: true,
      status: "completed",
      schemaVersion: SCHEMA_VERSION,
      dbPath: this.dbPath,
      tableCount: this.listTables().length
    };
  }

  close() {
    if (this.db) {
      this.db.close();
      this.db = undefined;
    }
  }

  putValue(key, value) {
    assertNonEmptyString(key, "key");
    const db = this.requireDb();
    db.prepare("INSERT INTO key_values (key, value_json, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at")
      .run(key, JSON.stringify(value), nowIso());
    return { ok: true, key };
  }

  getValue(key) {
    assertNonEmptyString(key, "key");
    const row = this.requireDb().prepare("SELECT key, value_json, updated_at FROM key_values WHERE key = ?").get(key);
    if (!row) return undefined;
    return {
      key: row.key,
      value: parseJson(row.value_json),
      updatedAt: row.updated_at
    };
  }

  recordEvent(event) {
    const record = {
      id: event.id ?? makeId("event"),
      createdAt: event.createdAt ?? nowIso(),
      kind: required(event.kind, "event.kind"),
      source: required(event.source, "event.source"),
      status: event.status ?? "recorded",
      payload: event.payload ?? {}
    };
    this.requireDb().prepare("INSERT INTO events (id, created_at, kind, source, status, payload_json) VALUES (?, ?, ?, ?, ?, ?)")
      .run(record.id, record.createdAt, record.kind, record.source, record.status, JSON.stringify(record.payload));
    return record;
  }

  listEvents(limit = 20) {
    return this.requireDb().prepare("SELECT id, created_at, kind, source, status, payload_json FROM events ORDER BY created_at DESC LIMIT ?")
      .all(normalizeLimit(limit))
      .map((row) => ({
        id: row.id,
        createdAt: row.created_at,
        kind: row.kind,
        source: row.source,
        status: row.status,
        payload: parseJson(row.payload_json)
      }));
  }

  recordEvidence(recordInput) {
    const record = {
      id: recordInput.id ?? makeId("evidence"),
      createdAt: recordInput.createdAt ?? nowIso(),
      sourcePath: required(recordInput.sourcePath, "record.sourcePath"),
      category: required(recordInput.category, "record.category"),
      status: recordInput.status ?? "recorded",
      payload: recordInput.payload ?? {}
    };
    this.requireDb().prepare("INSERT INTO evidence_records (id, created_at, source_path, category, status, payload_json) VALUES (?, ?, ?, ?, ?, ?)")
      .run(record.id, record.createdAt, record.sourcePath, record.category, record.status, JSON.stringify(record.payload));
    return record;
  }

  listEvidence(limit = 20) {
    return this.requireDb().prepare("SELECT id, created_at, source_path, category, status, payload_json FROM evidence_records ORDER BY created_at DESC LIMIT ?")
      .all(normalizeLimit(limit))
      .map((row) => ({
        id: row.id,
        createdAt: row.created_at,
        sourcePath: row.source_path,
        category: row.category,
        status: row.status,
        payload: parseJson(row.payload_json)
      }));
  }

  recordPhaseSnapshot(snapshot) {
    const record = {
      id: snapshot.id ?? makeId("phase_snapshot"),
      createdAt: snapshot.createdAt ?? nowIso(),
      phase: Number(snapshot.phase),
      status: snapshot.status ?? "recorded",
      certifiedLevel: snapshot.certifiedLevel ?? null,
      freeCoreThroughPhase: snapshot.freeCoreThroughPhase ?? null,
      payload: snapshot.payload ?? {}
    };
    if (!Number.isInteger(record.phase) || record.phase < 1) throw new Error("snapshot.phase must be a positive integer.");
    this.requireDb().prepare("INSERT INTO phase_snapshots (id, created_at, phase, status, certified_level, free_core_through_phase, payload_json) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run(record.id, record.createdAt, record.phase, record.status, record.certifiedLevel, record.freeCoreThroughPhase, JSON.stringify(record.payload));
    return record;
  }

  listPhaseSnapshots(limit = 20) {
    return this.requireDb().prepare("SELECT id, created_at, phase, status, certified_level, free_core_through_phase, payload_json FROM phase_snapshots ORDER BY created_at DESC LIMIT ?")
      .all(normalizeLimit(limit))
      .map((row) => ({
        id: row.id,
        createdAt: row.created_at,
        phase: row.phase,
        status: row.status,
        certifiedLevel: row.certified_level,
        freeCoreThroughPhase: row.free_core_through_phase,
        payload: parseJson(row.payload_json)
      }));
  }

  listTables() {
    return this.requireDb().prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all().map((row) => row.name);
  }

  getSummary() {
    const db = this.requireDb();
    return {
      schema: "sera-sqlite-persistence-v1",
      schemaVersion: SCHEMA_VERSION,
      createdAt: nowIso(),
      dbPath: this.dbPath,
      localOnly: true,
      paidProviderRequired: false,
      cloudRequired: false,
      tableCount: this.listTables().length,
      migrationCount: countRows(db, "migrations"),
      eventCount: countRows(db, "events"),
      keyValueCount: countRows(db, "key_values"),
      evidenceCount: countRows(db, "evidence_records"),
      phaseSnapshotCount: countRows(db, "phase_snapshots"),
      latestEvents: this.listEvents(5),
      latestPhaseSnapshots: this.listPhaseSnapshots(5)
    };
  }

  writeSummaryArtifacts() {
    const reportDir = resolveInsideRoot(this.rootDir, SUMMARY_RELATIVE_DIR);
    fs.mkdirSync(reportDir, { recursive: true });
    const summary = this.getSummary();
    const jsonPath = path.join(reportDir, "sqlite-persistence-summary.json");
    const markdownPath = path.join(reportDir, "sqlite-persistence-summary.md");
    const historyPath = path.join(reportDir, "sqlite-persistence-history.jsonl");

    fs.writeFileSync(jsonPath, JSON.stringify(summary, null, 2) + "\n", "utf8");
    fs.writeFileSync(markdownPath, renderSQLitePersistenceMarkdown(summary), "utf8");
    fs.appendFileSync(historyPath, JSON.stringify({ createdAt: summary.createdAt, eventCount: summary.eventCount, evidenceCount: summary.evidenceCount, phaseSnapshotCount: summary.phaseSnapshotCount }) + "\n", "utf8");

    return { ok: true, status: "completed", jsonPath, markdownPath, historyPath, summary };
  }

  requireDb() {
    if (!this.db) throw new Error("SQLitePersistenceStore has not been initialized.");
    return this.db;
  }
}

export function renderSQLitePersistenceMarkdown(summary) {
  const rows = [
    "# S.E.R.A. SQLite Persistence v1 Summary",
    "",
    `Created: ${summary.createdAt}`,
    "",
    "## Boundary",
    "",
    "- Local only: true",
    "- Paid provider required: false",
    "- Cloud required: false",
    "- Source mutation authority: none",
    "",
    "## Counts",
    "",
    `- Tables: ${summary.tableCount}`,
    `- Migrations: ${summary.migrationCount}`,
    `- Events: ${summary.eventCount}`,
    `- Key/value records: ${summary.keyValueCount}`,
    `- Evidence records: ${summary.evidenceCount}`,
    `- Phase snapshots: ${summary.phaseSnapshotCount}`,
    "",
    "## Latest Events",
    ""
  ];
  if (summary.latestEvents.length === 0) rows.push("- None recorded.");
  for (const event of summary.latestEvents) rows.push(`- ${event.createdAt} — ${event.kind} — ${event.status}`);
  rows.push("", "## Latest Phase Snapshots", "");
  if (summary.latestPhaseSnapshots.length === 0) rows.push("- None recorded.");
  for (const snapshot of summary.latestPhaseSnapshots) rows.push(`- Phase ${snapshot.phase} — ${snapshot.status} — ${snapshot.createdAt}`);
  rows.push("");
  return rows.join("\n");
}

export function resolveInsideRoot(rootDir, relativePath) {
  if (typeof relativePath !== "string" || relativePath.trim() === "") throw new Error("Path must be a non-empty relative path.");
  if (path.isAbsolute(relativePath)) throw new Error("SQLite persistence paths must be relative and cannot be absolute.");
  const root = path.resolve(rootDir);
  const target = path.resolve(root, relativePath);
  if (target !== root && !target.startsWith(root + path.sep)) throw new Error("SQLite persistence paths must stay inside the project root.");
  return target;
}

function countRows(db, table) {
  return Number(db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count ?? 0);
}

function required(value, name) {
  assertNonEmptyString(value, name);
  return value;
}

function assertNonEmptyString(value, name) {
  if (typeof value !== "string" || value.trim() === "") throw new Error(`${name} must be a non-empty string.`);
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return { parseError: true, raw: text };
  }
}

function normalizeLimit(limit) {
  const number = Number(limit);
  if (!Number.isFinite(number) || number < 1) return 20;
  return Math.min(Math.floor(number), 100);
}

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix) {
  return `${prefix}_${crypto.randomBytes(6).toString("hex")}`;
}
