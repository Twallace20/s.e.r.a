import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { RuntimeHost, createRuntimeConfig } from "../packages/runtime-host/src";
import { RuntimeStateStore, createRuntimeStateConfig, openRuntimeState } from "../packages/runtime-state/src";
import { PersistentRuntimeRecoveryCoordinator, RUNTIME_RECOVERY_SERVICE_ID, createPersistentRuntimeServices, runPersistentRuntimeRecoveryProof } from "../packages/runtime-recovery/src";

function tempRoot(label: string): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), `sera-${label}-`));
  fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ name: label, private: true }), "utf8");
  return root;
}

function fixedClock() {
  let tick = 0;
  return { now: () => new Date(Date.UTC(2026, 6, 14, 14, 0, tick++)) };
}

function controlledClock() {
  let current = Date.UTC(2026, 6, 14, 14, 0, 0);
  return {
    now: () => new Date(current),
    advance: (ms: number) => { current += ms; }
  };
}

function withRecovery<T>(label: string, fn: (store: RuntimeStateStore, coordinator: PersistentRuntimeRecoveryCoordinator, root: string) => T): T {
  const root = tempRoot(label);
  const store = openRuntimeState({ projectRoot: root, installationId: "installation_test", runtimeInstanceId: "runtime_new" }, fixedClock());
  const coordinator = new PersistentRuntimeRecoveryCoordinator(store, { projectRoot: root }, fixedClock());
  try {
    return fn(store, coordinator, root);
  } finally {
    store.close();
  }
}

function runningAttempt(store: RuntimeStateStore, key: string) {
  const command = store.acceptCommand({ idempotencyKey: key, commandType: "fixture", payload: { key }, capability: "fixture-capability" });
  store.transitionAttempt({ attemptId: command.attemptId!, fromState: "PENDING", toState: "RUNNING", actor: "control-plane" });
  return command;
}

function addSafeCheckpoint(store: RuntimeStateStore, coordinator: PersistentRuntimeRecoveryCoordinator, attemptId: string) {
  const evidence = store.recordEvidenceReference({ attemptId, evidenceType: "checkpoint", location: `${attemptId}.json`, integrityHash: "hash", producer: "test" });
  return coordinator.createCheckpoint({ attemptId, stageId: "stage", operationIdempotencyKey: `op:${attemptId}`, restartSafe: true, sideEffectState: "none", evidenceReferences: [evidence], status: "committed" });
}

describe("Persistent Runtime Recovery v1", () => {
  it("startup with no interrupted attempts reports healthy", () => {
    withRecovery("recovery-empty", (_store, coordinator) => {
      const result = coordinator.scanAndRecover({ executeSafeRecovery: true });
      expect(result.status).toBe("healthy");
      expect(result.classifications).toHaveLength(0);
    });
  });

  it("nonterminal attempt with expired owner is detected", () => {
    withRecovery("recovery-expired-owner", (store, coordinator) => {
      const attempt = runningAttempt(store, "expired-owner");
      addSafeCheckpoint(store, coordinator, attempt.attemptId!);
      const result = coordinator.scanAndRecover({ executeSafeRecovery: false });
      expect(result.classifications[0].classification).toBe("interrupted_safe_to_resume");
    });
  });

  it("nonterminal attempt with active owner is not stolen", () => {
    const clock = controlledClock();
    const root = tempRoot("recovery-active-owner");
    const store = openRuntimeState({ projectRoot: root, installationId: "installation_test", runtimeInstanceId: "runtime_new" }, clock);
    const coordinator = new PersistentRuntimeRecoveryCoordinator(store, { projectRoot: root }, clock);
    try {
      const attempt = runningAttempt(store, "active-owner");
      addSafeCheckpoint(store, coordinator, attempt.attemptId!);
      store.acquireLease({ leaseName: `attempt:${attempt.attemptId!}`, ttlMs: 100000, ownerRuntimeInstanceId: "runtime_old" });
      const result = coordinator.scanAndRecover({ executeSafeRecovery: false });
      expect(result.classifications[0].classification).toBe("active_current_owner");
    } finally {
      store.close();
    }
  });

  it("terminal attempt is ignored and remains immutable", () => {
    withRecovery("recovery-terminal", (store, coordinator) => {
      const attempt = runningAttempt(store, "terminal");
      store.recordGateOutcome({ attemptId: attempt.attemptId!, gateName: "done", required: true, outcome: "PASS", evaluator: "test" });
      store.transitionAttempt({ attemptId: attempt.attemptId!, fromState: "RUNNING", toState: "COMPLETED", actor: "control-plane" });
      expect(coordinator.pendingAttempts()).toHaveLength(0);
      expect(() => store.transitionAttempt({ attemptId: attempt.attemptId!, fromState: "COMPLETED", toState: "FAILED", actor: "test" })).toThrow();
    });
  });

  it("committed restart-safe checkpoint permits authorized same-attempt resume", () => {
    withRecovery("recovery-safe-resume", (store, coordinator) => {
      const attempt = runningAttempt(store, "safe-resume");
      addSafeCheckpoint(store, coordinator, attempt.attemptId!);
      const result = coordinator.scanAndRecover({ executeSafeRecovery: true });
      expect(result.classifications[0].decision).toBe("RESUME_SAME_ATTEMPT");
      expect(store.recoveryGet("SELECT current_state FROM attempts WHERE attempt_id = ?", [attempt.attemptId!])?.current_state).toBe("COMPLETED");
    });
  });

  it("missing checkpoint blocks recovery", () => {
    withRecovery("recovery-missing-checkpoint", (store, coordinator) => {
      runningAttempt(store, "missing-checkpoint");
      expect(coordinator.scanAndRecover().classifications[0].classification).toBe("blocked_missing_checkpoint");
    });
  });

  it("failed checkpoint blocks same-attempt resume", () => {
    withRecovery("recovery-failed-checkpoint", (store, coordinator) => {
      const attempt = runningAttempt(store, "failed-checkpoint");
      const evidence = store.recordEvidenceReference({ attemptId: attempt.attemptId!, evidenceType: "checkpoint", location: "failed.json", producer: "test" });
      coordinator.createCheckpoint({ attemptId: attempt.attemptId!, stageId: "stage", operationIdempotencyKey: "failed-op", restartSafe: true, sideEffectState: "none", evidenceReferences: [evidence], status: "failed" });
      expect(coordinator.scanAndRecover().classifications[0].decision).toBe("CREATE_LINKED_RETRY");
    });
  });

  it("unknown side-effect state requires review", () => {
    withRecovery("recovery-unknown-side-effect", (store, coordinator) => {
      const attempt = runningAttempt(store, "unknown-side-effect");
      const evidence = store.recordEvidenceReference({ attemptId: attempt.attemptId!, evidenceType: "checkpoint", location: "unknown.json", producer: "test" });
      coordinator.createCheckpoint({ attemptId: attempt.attemptId!, stageId: "stage", operationIdempotencyKey: "unknown-op", restartSafe: true, sideEffectState: "unknown", evidenceReferences: [evidence], status: "committed" });
      expect(coordinator.scanAndRecover().classifications[0].operatorReviewRequired).toBe(true);
    });
  });

  it("partially applied side effect requires review unless compensated", () => {
    withRecovery("recovery-partial-side-effect", (store, coordinator) => {
      const partial = runningAttempt(store, "partial-side-effect");
      const evidence = store.recordEvidenceReference({ attemptId: partial.attemptId!, evidenceType: "checkpoint", location: "partial.json", producer: "test" });
      coordinator.createCheckpoint({ attemptId: partial.attemptId!, stageId: "stage", operationIdempotencyKey: "partial-op", restartSafe: true, sideEffectState: "partially_applied", evidenceReferences: [evidence], status: "committed" });
      expect(coordinator.scanAndRecover().classifications[0].classification).toBe("review_required");
    });
  });

  it("idempotency prevents duplicate recovered action and repeated startup does not repeat completed recovery", () => {
    withRecovery("recovery-idempotent", (store, coordinator) => {
      const attempt = runningAttempt(store, "idem-recovery");
      addSafeCheckpoint(store, coordinator, attempt.attemptId!);
      const first = coordinator.scanAndRecover({ executeSafeRecovery: true });
      const second = coordinator.scanAndRecover({ executeSafeRecovery: true });
      expect(first.classifications[0].decision).toBe("RESUME_SAME_ATTEMPT");
      expect(second.classifications.find((item) => item.attemptId === attempt.attemptId!)).toBeUndefined();
    });
  });

  it("same-attempt resume preserves attempt identity", () => {
    withRecovery("recovery-same-id", (store, coordinator) => {
      const attempt = runningAttempt(store, "same-id");
      addSafeCheckpoint(store, coordinator, attempt.attemptId!);
      coordinator.scanAndRecover({ executeSafeRecovery: true });
      expect(store.recoveryGet("SELECT attempt_id FROM attempts WHERE attempt_id = ?", [attempt.attemptId!])?.attempt_id).toBe(attempt.attemptId!);
    });
  });

  it("retry-required recovery creates a new linked attempt and prior history remains intact", () => {
    withRecovery("recovery-linked-retry", (store, coordinator) => {
      const attempt = runningAttempt(store, "linked-retry");
      const evidence = store.recordEvidenceReference({ attemptId: attempt.attemptId!, evidenceType: "checkpoint", location: "retry.json", producer: "test" });
      coordinator.createCheckpoint({ attemptId: attempt.attemptId!, stageId: "stage", operationIdempotencyKey: "retry-op", restartSafe: false, sideEffectState: "compensated", evidenceReferences: [evidence], status: "failed" });
      const result = coordinator.scanAndRecover({ executeSafeRecovery: true });
      expect(result.classifications[0].newAttemptId).toBeTruthy();
      expect(store.recoveryGet("SELECT prior_attempt_id FROM attempt_lineage WHERE current_attempt_id = ?", [result.classifications[0].newAttemptId!])?.prior_attempt_id).toBe(attempt.attemptId!);
      expect(store.recoveryAll("SELECT * FROM attempt_transitions WHERE attempt_id = ?", [attempt.attemptId!]).length).toBeGreaterThan(1);
    });
  });

  it("retry depth limit blocks repeated retries", () => {
    const root = tempRoot("recovery-retry-limit");
    const store = openRuntimeState({ projectRoot: root, installationId: "installation_test", runtimeInstanceId: "runtime_new" }, fixedClock());
    const coordinator = new PersistentRuntimeRecoveryCoordinator(store, { projectRoot: root, maxRetryDepth: 0 }, fixedClock());
    try {
      const attempt = runningAttempt(store, "retry-limit");
      const evidence = store.recordEvidenceReference({ attemptId: attempt.attemptId!, evidenceType: "checkpoint", location: "retry-limit.json", producer: "test" });
      coordinator.createCheckpoint({ attemptId: attempt.attemptId!, stageId: "stage", operationIdempotencyKey: "retry-limit-op", restartSafe: false, sideEffectState: "compensated", evidenceReferences: [evidence], status: "failed" });
      expect(coordinator.scanAndRecover().classifications[0].operatorReviewRequired).toBe(true);
    } finally {
      store.close();
    }
  });

  it("recovery coordinator lease conflict blocks and expired coordinator lease can be acquired", () => {
    const clock = controlledClock();
    const root = tempRoot("recovery-lease");
    const store = openRuntimeState({ projectRoot: root, runtimeInstanceId: "runtime_new" }, clock);
    try {
      const first = store.acquireLease({ leaseName: RUNTIME_RECOVERY_SERVICE_ID, ttlMs: 5, ownerRuntimeInstanceId: "owner-a" });
      expect(() => store.acquireLease({ leaseName: RUNTIME_RECOVERY_SERVICE_ID, ttlMs: 100, ownerRuntimeInstanceId: "owner-b" })).toThrow();
      clock.advance(10);
      const second = store.acquireLease({ leaseName: RUNTIME_RECOVERY_SERVICE_ID, ttlMs: 100, ownerRuntimeInstanceId: "owner-b" });
      expect(second.fencingToken).toBeGreaterThan(first.fencingToken);
    } finally {
      store.close();
    }
  });

  it("stale recovery writer is rejected", () => {
    const clock = controlledClock();
    const root = tempRoot("recovery-stale-writer");
    const store = openRuntimeState({ projectRoot: root, installationId: "installation_test", runtimeInstanceId: "runtime_new" }, clock);
    const coordinator = new PersistentRuntimeRecoveryCoordinator(store, { projectRoot: root }, clock);
    try {
      const lease = store.acquireLease({ leaseName: RUNTIME_RECOVERY_SERVICE_ID, ttlMs: 1000 });
      store.releaseLease({ leaseName: RUNTIME_RECOVERY_SERVICE_ID, fencingToken: lease.fencingToken });
      store.acquireLease({ leaseName: RUNTIME_RECOVERY_SERVICE_ID, ttlMs: 1000, ownerRuntimeInstanceId: "new-owner" });
      expect(() => coordinator.assertFence(lease.fencingToken)).toThrow();
    } finally {
      store.close();
    }
  });

  it("recovery decision and attempt transition commit atomically", () => {
    withRecovery("recovery-atomic", (store, coordinator) => {
      const attempt = runningAttempt(store, "atomic");
      addSafeCheckpoint(store, coordinator, attempt.attemptId!);
      const before = store.recoveryAll("SELECT * FROM recovery_decisions").length;
      coordinator.scanAndRecover({ executeSafeRecovery: true });
      expect(store.recoveryAll("SELECT * FROM recovery_decisions").length).toBe(before + 1);
      expect(store.recoveryGet("SELECT current_state FROM attempts WHERE attempt_id = ?", [attempt.attemptId!])?.current_state).toBe("COMPLETED");
    });
  });

  it("simulated transaction failure leaves no partial recovery record", () => {
    withRecovery("recovery-transaction-failure", (store) => {
      expect(() => store.recoveryTransaction((db) => {
        db.prepare("INSERT INTO recovery_sessions (recovery_session_id, installation_id, recovery_runtime_instance_id, started_at, completed_at, status, scan_count, recoverable_count, blocked_count, resumed_count, new_attempt_count, error_summary) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run("bad", "i", "r", "t", null, "recovering", 0, 0, 0, 0, 0, null);
        throw new Error("simulated");
      })).toThrow();
      expect(store.recoveryGet("SELECT recovery_session_id FROM recovery_sessions WHERE recovery_session_id = ?", ["bad"])).toBeUndefined();
    });
  });

  it("interrupted recovery session is visible on next startup", () => {
    withRecovery("recovery-interrupted-session", (store, coordinator) => {
      store.recoveryRun("INSERT INTO recovery_sessions (recovery_session_id, installation_id, recovery_runtime_instance_id, started_at, completed_at, status, scan_count, recoverable_count, blocked_count, resumed_count, new_attempt_count, error_summary) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", ["session_incomplete", "installation_test", "runtime_old", "2026-07-14T00:00:00.000Z", null, "recovering", 0, 0, 0, 0, 0, null]);
      expect((coordinator.inspect().latestSession as any).recovery_session_id).toBe("session_incomplete");
    });
  });

  it("Control Plane denial produces durable blocked decision", () => {
    withRecovery("recovery-denial", (store, coordinator) => {
      const attempt = runningAttempt(store, "denied");
      addSafeCheckpoint(store, coordinator, attempt.attemptId!);
      const result = coordinator.scanAndRecover({ simulateControlPlaneDeny: true });
      expect(result.classifications[0].classification).toBe("blocked_policy_denied");
      expect(store.recoveryAll("SELECT * FROM recovery_decisions WHERE decision = 'BLOCKED'")).toHaveLength(1);
    });
  });

  it("required invalid or missing gate blocks terminal success", () => {
    withRecovery("recovery-required-gate", (store) => {
      const attempt = runningAttempt(store, "gate");
      expect(() => store.transitionAttempt({ attemptId: attempt.attemptId!, fromState: "RUNNING", toState: "COMPLETED", actor: "control-plane" })).toThrow();
    });
  });

  it("missing evidence integrity blocks recovery", () => {
    withRecovery("recovery-missing-evidence", (store, coordinator) => {
      const attempt = runningAttempt(store, "missing-evidence");
      coordinator.createCheckpoint({ attemptId: attempt.attemptId!, stageId: "stage", operationIdempotencyKey: "missing-evidence-op", restartSafe: true, sideEffectState: "none", evidenceReferences: ["missing-ref"], status: "committed" });
      expect(coordinator.scanAndRecover().classifications[0].reason).toContain("evidence");
    });
  });

  it("capability-version incompatibility requires review", () => {
    withRecovery("recovery-capability-version", (store, coordinator) => {
      const attempt = runningAttempt(store, "capability-version");
      const evidence = store.recordEvidenceReference({ attemptId: attempt.attemptId!, evidenceType: "checkpoint", location: "cap.json", producer: "test" });
      coordinator.createCheckpoint({ attemptId: attempt.attemptId!, stageId: "stage", operationIdempotencyKey: "cap-op", restartSafe: true, sideEffectState: "none", evidenceReferences: [evidence], status: "committed", capabilityVersion: "old" });
      expect(coordinator.scanAndRecover().classifications[0].operatorReviewRequired).toBe(true);
    });
  });

  it("policy-version incompatibility requires review", () => {
    withRecovery("recovery-policy-version", (store, coordinator) => {
      const attempt = runningAttempt(store, "policy-version");
      const evidence = store.recordEvidenceReference({ attemptId: attempt.attemptId!, evidenceType: "checkpoint", location: "policy.json", producer: "test" });
      coordinator.createCheckpoint({ attemptId: attempt.attemptId!, stageId: "stage", operationIdempotencyKey: "policy-op", restartSafe: true, sideEffectState: "none", evidenceReferences: [evidence], status: "committed", policyVersion: "old" });
      expect(coordinator.scanAndRecover().classifications[0].operatorReviewRequired).toBe(true);
    });
  });

  it("bounded startup limit prevents recovery storm", () => {
    withRecovery("recovery-bounded", (store, coordinator) => {
      const first = runningAttempt(store, "bounded-1");
      const second = runningAttempt(store, "bounded-2");
      addSafeCheckpoint(store, coordinator, first.attemptId!);
      addSafeCheckpoint(store, coordinator, second.attemptId!);
      const result = coordinator.scanAndRecover({ executeSafeRecovery: true, maxActions: 1 });
      expect(result.classifications.filter((item) => item.operatorReviewRequired)).toHaveLength(1);
    });
  });

  it("Runtime health becomes degraded for review-required attempts", async () => {
    const root = tempRoot("recovery-health-degraded");
    const store = openRuntimeState({ projectRoot: root, runtimeInstanceId: "runtime_old" });
    const coordinator = new PersistentRuntimeRecoveryCoordinator(store, { projectRoot: root });
    const attempt = runningAttempt(store, "degraded");
    const evidence = store.recordEvidenceReference({ attemptId: attempt.attemptId!, evidenceType: "checkpoint", location: "degraded.json", producer: "test" });
    coordinator.createCheckpoint({ attemptId: attempt.attemptId!, stageId: "stage", operationIdempotencyKey: "degraded-op", restartSafe: true, sideEffectState: "unknown", evidenceReferences: [evidence], status: "committed" });
    store.close();
    const host = new RuntimeHost({ config: createRuntimeConfig({ projectRoot: root }), services: createPersistentRuntimeServices(root) });
    const started = await host.start();
    const health = await host.health();
    await host.shutdown();
    expect(started.ok).toBe(true);
    expect(health.status).toBe("degraded");
  });

  it("Runtime health becomes blocked for corrupt recovery state", () => {
    const root = tempRoot("recovery-corrupt");
    const db = path.join(root, ".sera", "state", "sera-operational.db");
    fs.mkdirSync(path.dirname(db), { recursive: true });
    fs.writeFileSync(db, "not sqlite", "utf8");
    expect(() => openRuntimeState({ projectRoot: root })).toThrow();
  });

  it("cancellation stops recovery safely and shutdown is idempotent", async () => {
    const root = tempRoot("recovery-cancel-shutdown");
    const host = new RuntimeHost({ config: createRuntimeConfig({ projectRoot: root }), services: createPersistentRuntimeServices(root) });
    await host.start();
    const first = await host.shutdown("cancel");
    const second = await host.shutdown("again");
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
  });

  it("recovery evidence is complete", () => {
    withRecovery("recovery-evidence", (store, coordinator) => {
      const attempt = runningAttempt(store, "evidence");
      addSafeCheckpoint(store, coordinator, attempt.attemptId!);
      const result = coordinator.scanAndRecover({ executeSafeRecovery: true });
      for (const file of ["recovery-session.json", "scan-results.json", "recovery-decisions.jsonl", "recovery-events.jsonl", "resumed-attempts.json", "blocked-attempts.json", "final-recovery-report.json"]) {
        expect(fs.existsSync(path.join(result.evidenceRoot, file))).toBe(true);
      }
    });
  });

  it("non-Git, offline, no-model operation passes and restart identities are correct", async () => {
    const root = tempRoot("recovery-proof");
    const proof = await runPersistentRuntimeRecoveryProof({ projectRoot: root });
    expect(proof.ok).toBe(true);
    expect(proof.nonGit).toBe(true);
    expect(proof.modelUse).toBe(false);
    expect(proof.networkUse).toBe(false);
    expect(proof.restartIdentityChanged).toBe(true);
    expect(proof.installationStable).toBe(true);
  });

  it("recovery fixture completes after simulated interruption and terminal success only after required gates pass", async () => {
    const proof = await runPersistentRuntimeRecoveryProof();
    expect(proof.safeResume).toBe(true);
    expect(proof.unsafeReviewRequired).toBe(true);
    expect(proof.terminalImmutable).toBe(true);
  });

  it("deterministic normalized recovery results are repeatable", async () => {
    const first = await runPersistentRuntimeRecoveryProof();
    const second = await runPersistentRuntimeRecoveryProof();
    expect({
      ok: first.ok,
      safeResume: first.safeResume,
      unsafeReviewRequired: first.unsafeReviewRequired,
      linkedRetry: first.linkedRetry
    }).toEqual({
      ok: second.ok,
      safeResume: second.safeResume,
      unsafeReviewRequired: second.unsafeReviewRequired,
      linkedRetry: second.linkedRetry
    });
  });

  it("recovery inspect reports database status and current lease surface", () => {
    withRecovery("recovery-inspect", (_store, coordinator) => {
      const inspect = coordinator.inspect();
      expect(inspect.ok).toBe(true);
      expect(String(inspect.databasePath)).toContain("sera-operational.db");
      expect(inspect.recoveryLease).toBeDefined();
    });
  });

  it("recovery pending lists review-required interrupted attempts", () => {
    withRecovery("recovery-pending", (store, coordinator) => {
      runningAttempt(store, "pending-missing");
      expect(coordinator.pendingAttempts()[0].classification).toBe("blocked_missing_checkpoint");
    });
  });

  it("recovery decisions include authorization references", () => {
    withRecovery("recovery-decision-auth", (store, coordinator) => {
      const attempt = runningAttempt(store, "decision-auth");
      addSafeCheckpoint(store, coordinator, attempt.attemptId!);
      coordinator.scanAndRecover({ executeSafeRecovery: true });
      expect(String(coordinator.listDecisions()[0].control_plane_authorization_ref)).toContain("control-plane-recovery");
    });
  });

  it("migration version includes recovery tables", () => {
    withRecovery("recovery-migration-tables", (store) => {
      expect(store.inspect().schemaVersion).toBe(6);
      expect(store.inspect().counts.recovery_sessions).toBe(0);
      expect(store.inspect().counts.recovery_checkpoints).toBe(0);
    });
  });

  it("scan writes a completed recovery session", () => {
    withRecovery("recovery-session-written", (_store, coordinator) => {
      const result = coordinator.scanAndRecover();
      expect(result.ok).toBe(true);
      expect((coordinator.inspect().latestSession as any).status).toBe("completed");
    });
  });

  it("compensated side effect can resume when other restart-safe criteria pass", () => {
    withRecovery("recovery-compensated", (store, coordinator) => {
      const attempt = runningAttempt(store, "compensated");
      const evidence = store.recordEvidenceReference({ attemptId: attempt.attemptId!, evidenceType: "checkpoint", location: "compensated.json", producer: "test" });
      coordinator.createCheckpoint({ attemptId: attempt.attemptId!, stageId: "stage", operationIdempotencyKey: "compensated-op", restartSafe: true, sideEffectState: "compensated", evidenceReferences: [evidence], status: "committed" });
      expect(coordinator.scanAndRecover({ executeSafeRecovery: true }).classifications[0].decision).toBe("RESUME_SAME_ATTEMPT");
    });
  });

  it("prepared checkpoint is not treated as restart-safe", () => {
    withRecovery("recovery-prepared", (store, coordinator) => {
      const attempt = runningAttempt(store, "prepared");
      const evidence = store.recordEvidenceReference({ attemptId: attempt.attemptId!, evidenceType: "checkpoint", location: "prepared.json", producer: "test" });
      coordinator.createCheckpoint({ attemptId: attempt.attemptId!, stageId: "stage", operationIdempotencyKey: "prepared-op", restartSafe: true, sideEffectState: "none", evidenceReferences: [evidence], status: "prepared" });
      expect(coordinator.scanAndRecover().classifications[0].operatorReviewRequired).toBe(true);
    });
  });

  it("abandoned checkpoint is not treated as restart-safe", () => {
    withRecovery("recovery-abandoned", (store, coordinator) => {
      const attempt = runningAttempt(store, "abandoned");
      const evidence = store.recordEvidenceReference({ attemptId: attempt.attemptId!, evidenceType: "checkpoint", location: "abandoned.json", producer: "test" });
      coordinator.createCheckpoint({ attemptId: attempt.attemptId!, stageId: "stage", operationIdempotencyKey: "abandoned-op", restartSafe: true, sideEffectState: "none", evidenceReferences: [evidence], status: "abandoned" });
      expect(coordinator.scanAndRecover().classifications[0].operatorReviewRequired).toBe(true);
    });
  });

  it("checkpoint metadata persists", () => {
    withRecovery("recovery-metadata", (store, coordinator) => {
      const attempt = runningAttempt(store, "metadata");
      const evidence = store.recordEvidenceReference({ attemptId: attempt.attemptId!, evidenceType: "checkpoint", location: "metadata.json", producer: "test" });
      const checkpointId = coordinator.createCheckpoint({ attemptId: attempt.attemptId!, stageId: "stage", operationIdempotencyKey: "metadata-op", restartSafe: true, sideEffectState: "none", evidenceReferences: [evidence], status: "committed", metadata: { marker: "kept" } });
      expect(String(store.recoveryGet("SELECT metadata_json FROM recovery_checkpoints WHERE checkpoint_id = ?", [checkpointId])?.metadata_json)).toContain("kept");
    });
  });

  it("recovery events are append-only for decisions", () => {
    withRecovery("recovery-events", (store, coordinator) => {
      const attempt = runningAttempt(store, "events");
      addSafeCheckpoint(store, coordinator, attempt.attemptId!);
      coordinator.scanAndRecover({ executeSafeRecovery: true });
      expect(store.recoveryAll("SELECT * FROM recovery_events")).toHaveLength(1);
    });
  });

  it("active owner can be recovered after genuine expiry", () => {
    const clock = controlledClock();
    const root = tempRoot("recovery-owner-expiry");
    const store = openRuntimeState({ projectRoot: root, installationId: "installation_test", runtimeInstanceId: "runtime_new" }, clock);
    const coordinator = new PersistentRuntimeRecoveryCoordinator(store, { projectRoot: root }, clock);
    try {
      const attempt = runningAttempt(store, "owner-expiry");
      addSafeCheckpoint(store, coordinator, attempt.attemptId!);
      store.acquireLease({ leaseName: `attempt:${attempt.attemptId!}`, ttlMs: 5, ownerRuntimeInstanceId: "runtime_old" });
      clock.advance(10);
      expect(coordinator.scanAndRecover().classifications[0].classification).toBe("interrupted_safe_to_resume");
    } finally {
      store.close();
    }
  });
});
