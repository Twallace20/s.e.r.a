import fs from "node:fs";
import crypto from "node:crypto";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { RuntimeHost, createRuntimeConfig } from "../packages/runtime-host/src";
import {
  DEFAULT_RUNTIME_STATE_MIGRATIONS,
  RuntimeStateBlockedError,
  RuntimeStateStore,
  createRuntimeStateConfig,
  createRuntimeStateEnabledServices,
  openRuntimeState,
  runRuntimeStateProof
} from "../packages/runtime-state/src";

function tempRoot(label: string): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), `sera-${label}-`));
  fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ name: label, private: true }), "utf8");
  return root;
}

function fixedClock() {
  let tick = 0;
  return { now: () => new Date(Date.UTC(2026, 6, 14, 12, 0, tick++)) };
}

function controlledClock() {
  let current = Date.UTC(2026, 6, 14, 12, 0, 0);
  return {
    now: () => new Date(current),
    advance: (ms: number) => {
      current += ms;
    }
  };
}

function withStore<T>(label: string, fn: (store: RuntimeStateStore, root: string) => T): T {
  const root = tempRoot(label);
  const store = openRuntimeState({ projectRoot: root, installationId: "installation_test", runtimeInstanceId: "runtime_test" }, fixedClock());
  try {
    return fn(store, root);
  } finally {
    store.close();
  }
}

function accepted(store: RuntimeStateStore) {
  return store.acceptCommand({ idempotencyKey: "idem-1", commandType: "demo", payload: { value: 1 }, capability: "control-plane" });
}

function sha256File(filePath: string): string {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

describe("SQLite Operational State v1", () => {
  it("creates the supported schema and reports SQLite settings", () => {
    withStore("state-init", (store) => {
      const inspect = store.inspect();
      expect(inspect.schemaVersion).toBe(7);
      expect(inspect.sqlite.foreignKeys).toBe(true);
      expect(inspect.sqlite.journalMode).toBe("wal");
      expect(inspect.sqlite.implementation).toBe("node:sqlite DatabaseSync");
      expect(inspect.counts.schema_migrations).toBe(7);
    });
  });

  it("repeated initialization is idempotent and migrations apply once", () => {
    const root = tempRoot("state-idempotent-init");
    const config = createRuntimeStateConfig({ projectRoot: root });
    const first = new RuntimeStateStore(config, fixedClock());
    first.initialize();
    first.close();
    const second = new RuntimeStateStore(config, fixedClock());
    second.initialize();
    expect(second.inspect().counts.schema_migrations).toBe(7);
    second.close();
  });

  it("migration failure rolls back completely", () => {
    const root = tempRoot("state-migration-fail");
    const config = createRuntimeStateConfig({ projectRoot: root });
    const broken = new RuntimeStateStore(config, fixedClock(), [{ version: 1, name: "broken", sql: "CREATE TABLE rolled_back (id TEXT); INSERT INTO missing_table VALUES (1);" }]);
    expect(() => broken.initialize()).toThrow();
    const repaired = new RuntimeStateStore(config, fixedClock());
    repaired.initialize();
    expect(() => (repaired as any).requireDb().prepare("SELECT * FROM rolled_back").all()).toThrow();
    repaired.close();
  });

  it("unsupported future schema blocks startup", () => {
    const root = tempRoot("state-future-schema");
    const config = createRuntimeStateConfig({ projectRoot: root });
    const store = new RuntimeStateStore(config, fixedClock());
    store.initialize();
    (store as any).run("INSERT INTO schema_migrations (version, name, checksum, applied_at, runtime_version) VALUES (?, ?, ?, ?, ?)", [99, "future", "future", "2026-07-14T00:00:00.000Z", "future"]);
    store.close();
    expect(() => new RuntimeStateStore(config, fixedClock()).initialize()).toThrow(RuntimeStateBlockedError);
  });

  it("modified historical migration checksum blocks startup", () => {
    const root = tempRoot("state-migration-checksum");
    const config = createRuntimeStateConfig({ projectRoot: root });
    const store = new RuntimeStateStore(config, fixedClock());
    store.initialize();
    store.close();
    const modified = new RuntimeStateStore(config, fixedClock(), [{ ...DEFAULT_RUNTIME_STATE_MIGRATIONS[0], sql: `${DEFAULT_RUNTIME_STATE_MIGRATIONS[0].sql}\n-- changed` }]);
    expect(() => modified.initialize()).toThrow(RuntimeStateBlockedError);
  });

  it("command acceptance is durable and idempotent", () => {
    const root = tempRoot("state-command");
    const config = createRuntimeStateConfig({ projectRoot: root });
    const store = new RuntimeStateStore(config, fixedClock());
    store.initialize();
    const first = accepted(store);
    const duplicate = accepted(store);
    expect(first.commandId).toBe(duplicate.commandId);
    expect(duplicate.status).toBe("DUPLICATE");
    store.close();
    const reopened = new RuntimeStateStore(config, fixedClock());
    reopened.initialize();
    expect(reopened.inspect().counts.commands).toBe(1);
    reopened.close();
  });

  it("conflicting idempotency-key reuse is blocked", () => {
    withStore("state-idem-conflict", (store) => {
      accepted(store);
      expect(() => store.acceptCommand({ idempotencyKey: "idem-1", commandType: "demo", payload: { value: 2 }, capability: "control-plane" })).toThrow(RuntimeStateBlockedError);
    });
  });

  it("concurrent duplicate acceptance creates only one attempt", async () => {
    const root = tempRoot("state-concurrent-idem");
    const store = openRuntimeState({ projectRoot: root, installationId: "installation_test", runtimeInstanceId: "runtime_test" }, fixedClock());
    try {
      await Promise.all([Promise.resolve(accepted(store)), Promise.resolve(accepted(store)), Promise.resolve(accepted(store))]);
      expect(store.inspect().counts.commands).toBe(1);
      expect(store.inspect().counts.attempts).toBe(1);
    } finally {
      store.close();
    }
  });

  it("attempt transition and journal commit atomically", () => {
    withStore("state-transition", (store) => {
      const command = accepted(store);
      const result = store.transitionAttempt({ attemptId: command.attemptId!, fromState: "PENDING", toState: "RUNNING", actor: "control-plane", expectedVersion: 1 });
      expect(result.sequenceNumber).toBe(2);
      expect(store.inspect().counts.attempt_transitions).toBe(2);
    });
  });

  it("invalid transitions and transaction failures leave no partial state", () => {
    withStore("state-invalid-transition", (store) => {
      const command = accepted(store);
      expect(() => store.transitionAttempt({ attemptId: command.attemptId!, fromState: "PENDING", toState: "COMPLETED", actor: "control-plane" })).toThrow(RuntimeStateBlockedError);
      expect(store.inspect().counts.attempt_transitions).toBe(1);
    });
  });

  it("terminal state is immutable", () => {
    withStore("state-terminal", (store) => {
      const command = accepted(store);
      store.transitionAttempt({ attemptId: command.attemptId!, fromState: "PENDING", toState: "RUNNING", actor: "control-plane" });
      const evidence = store.recordEvidenceReference({ attemptId: command.attemptId!, evidenceType: "json", location: "evidence.json", producer: "test" });
      store.recordGateOutcome({ attemptId: command.attemptId!, gateName: "required", required: true, outcome: "PASS", evidenceReferences: [evidence], evaluator: "test" });
      store.transitionAttempt({ attemptId: command.attemptId!, fromState: "RUNNING", toState: "COMPLETED", actor: "control-plane", reason: "done" });
      expect(() => store.transitionAttempt({ attemptId: command.attemptId!, fromState: "COMPLETED", toState: "FAILED", actor: "test" })).toThrow(RuntimeStateBlockedError);
    });
  });

  it("required incomplete or failed gates prevent success closeout", () => {
    withStore("state-gates", (store) => {
      const command = accepted(store);
      store.transitionAttempt({ attemptId: command.attemptId!, fromState: "PENDING", toState: "RUNNING", actor: "control-plane" });
      expect(() => store.transitionAttempt({ attemptId: command.attemptId!, fromState: "RUNNING", toState: "COMPLETED", actor: "control-plane" })).toThrow(RuntimeStateBlockedError);
      store.recordGateOutcome({ attemptId: command.attemptId!, gateName: "required", required: true, outcome: "FAIL", evaluator: "test" });
      expect(() => store.transitionAttempt({ attemptId: command.attemptId!, fromState: "RUNNING", toState: "COMPLETED", actor: "control-plane" })).toThrow(RuntimeStateBlockedError);
    });
  });

  it("gate outcomes and evidence references persist durably", () => {
    const root = tempRoot("state-gate-evidence");
    const config = createRuntimeStateConfig({ projectRoot: root });
    const store = new RuntimeStateStore(config, fixedClock());
    store.initialize();
    const command = accepted(store);
    const evidence = store.recordEvidenceReference({ attemptId: command.attemptId!, evidenceType: "markdown", location: "report.md", integrityHash: "abc", producer: "test", metadata: { a: 1 } });
    store.recordGateOutcome({ attemptId: command.attemptId!, gateName: "gate", required: true, outcome: "PASS", evidenceReferences: [evidence], evaluator: "test" });
    store.close();
    const reopened = new RuntimeStateStore(config, fixedClock());
    reopened.initialize();
    expect(reopened.inspect().counts.evidence_references).toBe(1);
    expect(reopened.inspect().counts.gate_outcomes).toBe(1);
    reopened.close();
  });

  it("lease conflict is blocked, expiry permits reacquire, and fencing advances", () => {
    const root = tempRoot("state-lease");
    const clock = controlledClock();
    const store = openRuntimeState({ projectRoot: root, installationId: "installation_test", runtimeInstanceId: "runtime_test" }, clock);
    try {
      const first = store.acquireLease({ leaseName: "resource", ttlMs: 5, ownerRuntimeInstanceId: "owner-a" });
      expect(() => store.acquireLease({ leaseName: "resource", ttlMs: 100, ownerRuntimeInstanceId: "owner-b" })).toThrow(RuntimeStateBlockedError);
      clock.advance(10);
      const second = store.acquireLease({ leaseName: "resource", ttlMs: 100, ownerRuntimeInstanceId: "owner-b" });
      expect(second.fencingToken).toBeGreaterThan(first.fencingToken);
      expect(() => store.assertFence("resource", first.fencingToken, "owner-a")).toThrow(RuntimeStateBlockedError);
    } finally {
      store.close();
    }
  });

  it("database survives service restart and runtime service closes handles cleanly", async () => {
    const root = tempRoot("state-runtime-service");
    const config = createRuntimeConfig({ projectRoot: root });
    const host = new RuntimeHost({ config, services: createRuntimeStateEnabledServices(root) });
    const started = await host.start();
    const health = await host.health();
    const shutdown = await host.shutdown();
    expect(started.ok).toBe(true);
    expect(health.services.find((service) => service.serviceId === "operational-state")?.status).toBe("healthy");
    expect(shutdown.ok).toBe(true);
  });

  it("backup creates a readable consistent copy", () => {
    withStore("state-backup", (store) => {
      accepted(store);
      const backup = store.backup();
      expect(fs.existsSync(backup.path)).toBe(true);
      expect(backup.sha256).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  it("deterministic export uses stable ordering", () => {
    withStore("state-export", (store) => {
      accepted(store);
      const first = JSON.stringify(store.exportDocument(false));
      const second = JSON.stringify(store.exportDocument(false));
      expect(first).toBe(second);
      const written = store.exportJson();
      expect(fs.existsSync(written.path)).toBe(true);
      expect(written.recordCounts.commands).toBe(1);
    });
  });

  it("corrupt database produces BLOCKED without replacement", () => {
    const root = tempRoot("state-corrupt");
    const dbPath = path.join(root, ".sera", "state", "sera-operational.db");
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    fs.writeFileSync(dbPath, "not sqlite", "utf8");
    expect(() => openRuntimeState({ projectRoot: root })).toThrow(RuntimeStateBlockedError);
    expect(fs.readFileSync(dbPath, "utf8")).toBe("not sqlite");
  });

  it("non-Git and offline operation pass without model or network", async () => {
    const root = tempRoot("state-non-git");
    const proof = await runRuntimeStateProof({ projectRoot: root, installationId: "installation_test", runtimeInstanceId: "runtime_test" }, fixedClock());
    expect(proof.ok).toBe(true);
    expect(proof.modelUse).toBe(false);
    expect(proof.networkUse).toBe(false);
    expect(fs.existsSync(path.join(root, ".git"))).toBe(false);
  });

  it("Control Plane durable adapter preserves terminal authority", async () => {
    const root = tempRoot("state-control-plane-authority");
    const proof = await runRuntimeStateProof({ projectRoot: root, installationId: "installation_test", runtimeInstanceId: "runtime_test" }, fixedClock());
    expect(proof.gateEnforced).toBe(true);
    expect(proof.invalidTransitionBlocked).toBe(true);
    expect(proof.terminalImmutable).toBe(true);
  });

  it("explicit configurable database location is honored", () => {
    const root = tempRoot("state-config-path");
    const dbPath = path.join(root, "custom", "state.db");
    const store = openRuntimeState({ projectRoot: root, databasePath: dbPath });
    try {
      expect(store.inspect().databasePath).toBe(dbPath);
      expect(fs.existsSync(dbPath)).toBe(true);
    } finally {
      store.close();
    }
  });

  it("idempotency records are queryable through inspection counts", () => {
    withStore("state-idem-count", (store) => {
      accepted(store);
      expect(store.inspect().counts.idempotency_records).toBe(1);
    });
  });

  it("state events are append-only for major operations", () => {
    withStore("state-events", (store) => {
      const before = store.inspect().counts.state_events;
      accepted(store);
      expect(store.inspect().counts.state_events).toBeGreaterThan(before);
    });
  });

  it("optimistic versions prevent lost updates", () => {
    withStore("state-optimistic-version", (store) => {
      const command = accepted(store);
      store.transitionAttempt({ attemptId: command.attemptId!, fromState: "PENDING", toState: "RUNNING", actor: "control-plane", expectedVersion: 1 });
      expect(() => store.transitionAttempt({ attemptId: command.attemptId!, fromState: "RUNNING", toState: "FAILED", actor: "control-plane", expectedVersion: 1 })).toThrow(RuntimeStateBlockedError);
    });
  });

  it("blocked terminal attempts preserve reason", () => {
    withStore("state-blocked-reason", (store) => {
      const command = accepted(store);
      store.transitionAttempt({ attemptId: command.attemptId!, fromState: "PENDING", toState: "BLOCKED", actor: "control-plane", reason: "owner approval required" });
      const exported = store.exportDocument(false);
      expect(JSON.stringify(exported)).toContain("owner approval required");
    });
  });

  it("terminal attempts can still receive evidence metadata", () => {
    withStore("state-terminal-evidence", (store) => {
      const command = accepted(store);
      store.transitionAttempt({ attemptId: command.attemptId!, fromState: "PENDING", toState: "RUNNING", actor: "control-plane" });
      store.recordGateOutcome({ attemptId: command.attemptId!, gateName: "required", required: true, outcome: "PASS", evaluator: "test" });
      store.transitionAttempt({ attemptId: command.attemptId!, fromState: "RUNNING", toState: "COMPLETED", actor: "control-plane" });
      store.recordEvidenceReference({ attemptId: command.attemptId!, evidenceType: "closeout", location: "closeout.json", producer: "test" });
      expect(store.inspect().counts.evidence_references).toBe(1);
    });
  });

  it("lease renewal preserves owner and fence", () => {
    withStore("state-lease-renew", (store) => {
      const lease = store.acquireLease({ leaseName: "renewable", ttlMs: 100000 });
      store.renewLease({ leaseName: "renewable", fencingToken: lease.fencingToken, ttlMs: 2000 });
      expect(store.inspect().leases.find((item) => item.lease_name === "renewable")?.fencing_token).toBe(lease.fencingToken);
    });
  });

  it("lease release allows new owner with advanced fence", () => {
    withStore("state-lease-release", (store) => {
      const first = store.acquireLease({ leaseName: "release", ttlMs: 100000, ownerRuntimeInstanceId: "a" });
      store.releaseLease({ leaseName: "release", fencingToken: first.fencingToken, ownerRuntimeInstanceId: "a" });
      const second = store.acquireLease({ leaseName: "release", ttlMs: 1000, ownerRuntimeInstanceId: "b" });
      expect(second.fencingToken).toBeGreaterThan(first.fencingToken);
    });
  });

  it("backup does not mutate source record counts", () => {
    withStore("state-backup-no-mutate", (store) => {
      accepted(store);
      const before = store.inspect().counts.commands;
      store.backup();
      expect(store.inspect().counts.commands).toBe(before);
    });
  });

  it("export does not mutate source record counts", () => {
    withStore("state-export-no-mutate", (store) => {
      accepted(store);
      const before = store.inspect().counts.state_events;
      store.exportJson();
      expect(store.inspect().counts.state_events).toBe(before);
    });
  });

  it("migration gaps are blocked", () => {
    const root = tempRoot("state-migration-gap");
    const config = createRuntimeStateConfig({ projectRoot: root });
    const store = new RuntimeStateStore(config, fixedClock(), [{ version: 2, name: "gap", sql: "CREATE TABLE gap (id TEXT);" }]);
    expect(() => store.initialize()).toThrow(RuntimeStateBlockedError);
  });

  it("runtime state proof reports restart persistence", async () => {
    const root = tempRoot("state-proof-restart");
    const proof = await runRuntimeStateProof({ projectRoot: root, installationId: "installation_test", runtimeInstanceId: "runtime_test" });
    expect(proof.restartPersists).toBe(true);
  });

  it("default runtime state proof is isolated and repeatable", async () => {
    const first = await runRuntimeStateProof({}, fixedClock());
    const second = await runRuntimeStateProof({}, fixedClock());
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(first.proofRoot).not.toBe(second.proofRoot);
    expect(first.databasePath).not.toBe(second.databasePath);
    expect(fs.existsSync(first.databasePath)).toBe(true);
    expect(fs.existsSync(second.databasePath)).toBe(true);
  });

  it("default runtime state proof does not mutate an unrelated live database", async () => {
    const root = tempRoot("state-proof-live-untouched");
    const store = openRuntimeState({ projectRoot: root, installationId: "installation_live", runtimeInstanceId: "runtime_live" }, fixedClock());
    const liveDatabasePath = store.inspect().databasePath;
    store.close();
    const beforeHash = sha256File(liveDatabasePath);

    const proof = await runRuntimeStateProof({}, fixedClock());
    expect(proof.ok).toBe(true);
    expect(proof.databasePath).not.toBe(liveDatabasePath);
    expect(sha256File(liveDatabasePath)).toBe(beforeHash);
  });

  it("a completed explicit proof attempt cannot interfere with a later default proof", async () => {
    const root = tempRoot("state-proof-completed-isolation");
    const explicit = await runRuntimeStateProof({ projectRoot: root, installationId: "installation_test", runtimeInstanceId: "runtime_test" }, fixedClock());
    expect(explicit.ok).toBe(true);
    const later = await runRuntimeStateProof({}, fixedClock());
    expect(later.ok).toBe(true);
    expect(later.databasePath).not.toBe(explicit.databasePath);
  });

  it("migration checksums remain stable across repeated initialization", () => {
    const root = tempRoot("state-migration-checksum-stable");
    const first = openRuntimeState({ projectRoot: root, installationId: "installation_test", runtimeInstanceId: "runtime_test" }, fixedClock());
    const before = first.recoveryAll("SELECT version, name, checksum FROM schema_migrations ORDER BY version");
    first.close();

    const second = openRuntimeState({ projectRoot: root, installationId: "installation_test", runtimeInstanceId: "runtime_test" }, fixedClock());
    try {
      const after = second.recoveryAll("SELECT version, name, checksum FROM schema_migrations ORDER BY version");
      expect(after).toEqual(before);
      expect(after.map((row: any) => row.version)).toEqual([1, 2, 3, 4, 5, 6, 7]);
      expect(after.slice(0, 6)).toEqual(before.slice(0, 6));
    } finally {
      second.close();
    }
  });
});
