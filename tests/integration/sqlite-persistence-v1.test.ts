import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

async function loadPersistence() {
  return await import("../../scripts/lib/sqlite-persistence-v1.mjs");
}

function tempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "sera-sqlite-persistence-test-"));
}

describe("SQLite Persistence v1", () => {
  it("initializes a local SQLite database with required tables", async () => {
    const root = tempRoot();
    const { SQLitePersistenceStore } = await loadPersistence();
    const store = new SQLitePersistenceStore({ rootDir: root });

    try {
      const init = store.initialize();
      const tables = store.listTables();

      expect(init.ok).toBe(true);
      expect(fs.existsSync(init.dbPath)).toBe(true);
      expect(tables).toContain("migrations");
      expect(tables).toContain("events");
      expect(tables).toContain("key_values");
      expect(tables).toContain("evidence_records");
      expect(tables).toContain("phase_snapshots");
    } finally {
      store.close();
    }
  });

  it("round-trips key values, events, evidence records, and phase snapshots", async () => {
    const root = tempRoot();
    const { SQLitePersistenceStore } = await loadPersistence();
    const store = new SQLitePersistenceStore({ rootDir: root });

    try {
      store.initialize();
      store.putValue("phase", { current: 23 });
      const event = store.recordEvent({ kind: "demo", source: "test", status: "completed", payload: { ok: true } });
      const evidence = store.recordEvidence({ sourcePath: "docs/example.md", category: "doc", status: "recorded", payload: { lines: 3 } });
      const snapshot = store.recordPhaseSnapshot({ phase: 23, status: "completed", certifiedLevel: "operator-console-v1", freeCoreThroughPhase: 45 });

      expect(store.getValue("phase")?.value.current).toBe(23);
      expect(store.listEvents(5).some((item) => item.id === event.id)).toBe(true);
      expect(store.listEvidence(5).some((item) => item.id === evidence.id)).toBe(true);
      expect(store.listPhaseSnapshots(5).some((item) => item.id === snapshot.id)).toBe(true);
    } finally {
      store.close();
    }
  });

  it("writes local summary artifacts without requiring cloud or paid providers", async () => {
    const root = tempRoot();
    const { SQLitePersistenceStore } = await loadPersistence();
    const store = new SQLitePersistenceStore({ rootDir: root });

    try {
      store.initialize();
      store.recordEvent({ kind: "summary_test", source: "test", status: "completed" });
      store.recordPhaseSnapshot({ phase: 23, status: "completed" });
      const artifacts = store.writeSummaryArtifacts();

      expect(artifacts.ok).toBe(true);
      expect(artifacts.summary.localOnly).toBe(true);
      expect(artifacts.summary.paidProviderRequired).toBe(false);
      expect(artifacts.summary.cloudRequired).toBe(false);
      expect(fs.existsSync(artifacts.jsonPath)).toBe(true);
      expect(fs.existsSync(artifacts.markdownPath)).toBe(true);
      expect(fs.existsSync(artifacts.historyPath)).toBe(true);
      expect(fs.readFileSync(artifacts.markdownPath, "utf8")).toContain("SQLite Persistence v1 Summary");
    } finally {
      store.close();
    }
  });

  it("blocks SQLite database paths outside the project root", async () => {
    const root = tempRoot();
    const { SQLitePersistenceStore } = await loadPersistence();

    expect(() => new SQLitePersistenceStore({ rootDir: root, dbRelativePath: "../outside.sqlite" })).toThrow(/inside the project root/);
  });
});
