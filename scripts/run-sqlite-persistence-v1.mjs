#!/usr/bin/env node
import { SQLitePersistenceStore } from "./lib/sqlite-persistence-v1.mjs";

const store = new SQLitePersistenceStore({ rootDir: process.cwd() });

try {
  const init = store.initialize();
  store.putValue("phase23.current", {
    phase: 23,
    name: "SQLite Persistence v1",
    localOnly: true,
    jsonlStillAuthoritative: true
  });
  store.recordEvent({
    kind: "phase23_demo",
    source: "scripts/run-sqlite-persistence-v1.mjs",
    status: "completed",
    payload: {
      boundary: "local_sqlite_only",
      mutationAuthority: "none",
      paidProviderRequired: false,
      cloudRequired: false
    }
  });
  store.recordEvidence({
    sourcePath: "docs/phases/PHASE_23_SQLITE_PERSISTENCE_V1.md",
    category: "phase_documentation",
    status: "recorded",
    payload: {
      phase: 23,
      purpose: "Add local SQLite persistence foundation without replacing existing JSONL runtime evidence."
    }
  });
  store.recordPhaseSnapshot({
    phase: 23,
    status: "completed",
    certifiedLevel: "operator-console-v1",
    freeCoreThroughPhase: 45,
    payload: {
      sqlitePersistence: "v1",
      jsonlCompatibility: "preserved",
      nextPhase: 24
    }
  });

  const current = store.getValue("phase23.current");
  const artifacts = store.writeSummaryArtifacts();
  const summary = artifacts.summary;
  const expectedTables = ["events", "evidence_records", "key_values", "migrations", "phase_snapshots"];
  const tables = store.listTables();

  if (!current || current.value.phase !== 23) throw new Error("Phase 23 key/value record was not persisted.");
  for (const table of expectedTables) {
    if (!tables.includes(table)) throw new Error(`Missing SQLite table: ${table}`);
  }
  if (summary.eventCount < 1) throw new Error("Expected at least one persisted event.");
  if (summary.evidenceCount < 1) throw new Error("Expected at least one persisted evidence record.");
  if (summary.phaseSnapshotCount < 1) throw new Error("Expected at least one persisted phase snapshot.");

  const output = {
    ok: true,
    status: "completed",
    init,
    dbPath: summary.dbPath,
    tableCount: summary.tableCount,
    eventCount: summary.eventCount,
    keyValueCount: summary.keyValueCount,
    evidenceCount: summary.evidenceCount,
    phaseSnapshotCount: summary.phaseSnapshotCount,
    jsonPath: artifacts.jsonPath,
    markdownPath: artifacts.markdownPath,
    historyPath: artifacts.historyPath,
    localOnly: summary.localOnly,
    paidProviderRequired: summary.paidProviderRequired,
    cloudRequired: summary.cloudRequired
  };

  console.log("S.E.R.A. phase23 sqlite persistence v1: PASS");
  console.log(JSON.stringify(output, null, 2));
} finally {
  store.close();
}
