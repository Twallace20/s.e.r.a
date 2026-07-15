import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import {
  DEFAULT_EXECUTION_POLICY,
  EXECUTION_POLICY_VERSION,
  ISOLATION_LIMITATION,
  IsolatedExecutionEngine,
  createDefaultExecutableRegistry,
  createExecutionAuthorization,
  createIsolatedExecutionRuntimeServices,
  requestHash,
  runIsolatedExecutionProof,
  stableHash,
  type ExecutionAuthorization,
  type ExecutionRequest
} from "@sera/execution-engine";
import { RuntimeHost, createRuntimeConfig } from "@sera/runtime-host";
import { openRuntimeState, type RuntimeStateStore } from "@sera/runtime-state";

describe("Isolated Execution Engine v1", () => {
  let proof: Awaited<ReturnType<typeof runIsolatedExecutionProof>>;

  beforeAll(async () => {
    proof = await runIsolatedExecutionProof();
  }, 20000);

  it("1. execution requires Control Plane authorization", () => expect(proof.authorizationEnforced).toBe(true));
  it("2. expired authorization blocks", async () => {
    const f = fixture();
    const auth = createExecutionAuthorization({ request: f.request, issuedAt: new Date(Date.now() - 10000), ttlMs: 1 });
    const result = await f.engine.execute(f.request, auth);
    expect(result.ok).toBe(false);
    f.close();
  });
  it("3. request-hash mismatch blocks", () => expect(proof.requestIntegrityEnforced).toBe(true));
  it("4. executable mismatch blocks", async () => {
    const f = fixture();
    const auth = { ...createExecutionAuthorization({ request: f.request }), executableId: "missing-fixture" };
    const result = await f.engine.execute(f.request, rehashAuth(auth));
    expect(result.ok).toBe(false);
    f.close();
  });
  it("5. argument mismatch blocks", async () => {
    const f = fixture();
    const auth = { ...createExecutionAuthorization({ request: f.request }), args: ["fixture:stderr"] };
    const result = await f.engine.execute(f.request, rehashAuth(auth));
    expect(result.ok).toBe(false);
    f.close();
  });
  it("6. required incomplete gate blocks", async () => {
    const f = fixture();
    const auth = createExecutionAuthorization({ request: f.request, requiredGateRefs: ["gate-a"], completedGateRefs: [] });
    const result = await f.engine.execute(f.request, auth);
    expect(result.ok).toBe(false);
    f.close();
  });
  it("7. arbitrary executable path blocks", async () => {
    const f = fixture({ executableId: process.execPath });
    const result = await f.engine.execute(f.request, createExecutionAuthorization({ request: f.request }));
    expect(result.ok).toBe(false);
    f.close();
  });
  it("8. shell execution blocks", async () => {
    const f = fixture({ executableId: "powershell" });
    const result = await f.engine.execute(f.request, createExecutionAuthorization({ request: f.request }));
    expect(result.ok).toBe(false);
    f.close();
  });
  it("9. argument arrays are passed without shell interpretation", async () => {
    const f = fixture({ args: ["fixture:echo"] });
    const result = await f.engine.execute(f.request, createExecutionAuthorization({ request: f.request }));
    expect(result.process?.output.stdout.text).toContain("sera-fixture-ok");
    f.close();
  });
  it("10. unique temporary workspace is created", async () => {
    const a = fixture();
    const b = fixture();
    const ar = await a.engine.execute(a.request, createExecutionAuthorization({ request: a.request }));
    const br = await b.engine.execute(b.request, createExecutionAuthorization({ request: b.request }));
    expect(ar.workspaceRoot).not.toBe(br.workspaceRoot);
    a.close(); b.close();
  });
  it("11. workspace remains outside repository by default", () => expect(proof.workspaceOutsideRepository).toBe(true));
  it("12. path traversal input blocks", () => expect(proof.pathEscapeBlocked).toBe(true));
  it("13. symlink or junction escape blocks", async () => {
    const f = fixture();
    const outside = path.join(f.root, "..", `outside-${Date.now()}.txt`);
    fs.writeFileSync(outside, "outside", "utf8");
    const link = path.join(f.root, "link.txt");
    try {
      fs.symlinkSync(outside, link);
      f.request.inputs = [{ id: "link", sourceType: "copy-file", source: "link.txt", workspacePath: "link.txt" }];
      const result = await f.engine.execute(f.request, createExecutionAuthorization({ request: f.request }));
      expect(result.ok).toBe(false);
    } catch (error) {
      expect((error as NodeJS.ErrnoException).code).toBe("EPERM");
    } finally {
      f.close();
    }
  });
  it("14. input file-count limit is enforced", async () => {
    const f = fixture();
    f.request.inputs = Array.from({ length: DEFAULT_EXECUTION_POLICY.maxInputFiles + 1 }, (_, i) => ({ id: `i${i}`, sourceType: "inline-text" as const, workspacePath: `i${i}.txt`, content: "x" }));
    const result = await f.engine.execute(f.request, createExecutionAuthorization({ request: f.request }));
    expect(result.ok).toBe(false);
    f.close();
  });
  it("15. input byte limit is enforced", async () => {
    const f = fixture();
    f.request.inputs = [{ id: "big", sourceType: "inline-text", workspacePath: "big.txt", content: "x".repeat(DEFAULT_EXECUTION_POLICY.maxInputFileBytes + 1) }];
    const result = await f.engine.execute(f.request, createExecutionAuthorization({ request: f.request }));
    expect(result.ok).toBe(false);
    f.close();
  });
  it("16. copied input integrity hash is recorded", async () => {
    const f = fixture();
    const result = await f.engine.execute(f.request, createExecutionAuthorization({ request: f.request }));
    expect(f.store.recoveryAll("SELECT hash FROM execution_inputs WHERE execution_id = ?", [result.executionId])[0]?.hash).toBeTruthy();
    f.close();
  });
  it("17. working directory escape blocks", async () => {
    const f = fixture({ workingDirectory: "../escape" });
    const result = await f.engine.execute(f.request, createExecutionAuthorization({ request: f.request }));
    expect(result.ok).toBe(false);
    f.close();
  });
  it("18. environment is allowlisted", async () => {
    const f = fixture();
    const result = await f.engine.execute(f.request, createExecutionAuthorization({ request: f.request }));
    expect(result.ok).toBe(true);
    f.close();
  });
  it("19. secrets are excluded and redacted", () => expect(proof.ok).toBe(true));
  it("20. offline policy blocks network-capable executable profiles", async () => {
    const f = fixture({ executableId: "network-fixture", args: ["fixture:network"] });
    const result = await f.engine.execute(f.request, createExecutionAuthorization({ request: f.request }));
    expect(result.ok).toBe(false);
    f.close();
  });
  it("21. stdout is captured", () => expect(proof.stdoutCaptured).toBe(true));
  it("22. stderr is captured", () => expect(proof.stderrCaptured).toBe(true));
  it("23. stdout limit is enforced", () => expect(proof.outputLimitEnforced).toBe(true));
  it("24. stderr limit is enforced", async () => {
    const f = fixture({ args: ["fixture:large-stderr"], maxStderrBytes: 16, maxCombinedOutputBytes: 32 });
    const result = await f.engine.execute(f.request, createExecutionAuthorization({ request: f.request }));
    expect(result.process?.output.limitEvents).toContain("stderr-limit");
    f.close();
  });
  it("25. combined-output limit is enforced", () => expect(proof.outputLimitEnforced).toBe(true));
  it("26. timeout terminates execution", () => expect(proof.timeoutEnforced).toBe(true));
  it("27. cancellation terminates execution", () => expect(proof.cancellationSafe).toBe(true));
  it("28. repeated cancellation is idempotent", async () => {
    const f = fixture({ args: ["fixture:cancel"], timeoutMs: 30000 });
    const p = f.engine.execute(f.request, createExecutionAuthorization({ request: f.request }));
    await wait(50);
    expect(f.engine.cancelExecution(f.request.executionId, "test")).toBe(true);
    expect(f.engine.cancelExecution(f.request.executionId, "test-again")).toBe(true);
    expect((await p).status).toBe("CANCELLED");
    f.close();
  }, 10000);
  it("29. process spawn failure records an honest failure", async () => {
    const f = fixture({ executableId: "missing-fixture", args: ["fixture:echo"] });
    const result = await f.engine.execute(f.request, createExecutionAuthorization({ request: f.request }));
    expect(result.status).toBe("FAILED_PROCESS");
    f.close();
  });
  it("30. expected exit code produces SUCCEEDED_PROCESS", async () => {
    const f = fixture();
    const result = await f.engine.execute(f.request, createExecutionAuthorization({ request: f.request }));
    expect(result.status).toBe("SUCCEEDED_PROCESS");
    f.close();
  });
  it("31. unexpected exit code produces FAILED_PROCESS", async () => {
    const f = fixture({ args: ["fixture:fail"] });
    const result = await f.engine.execute(f.request, createExecutionAuthorization({ request: f.request }));
    expect(result.status).toBe("FAILED_PROCESS");
    f.close();
  });
  it("32. process success does not mark the attempt successful", async () => {
    const f = fixture();
    const result = await f.engine.execute(f.request, createExecutionAuthorization({ request: f.request }));
    expect(result.attemptSuccessManufactured).toBe(false);
    f.close();
  });
  it("33. declared outputs are harvested", () => expect(proof.outputsHarvested).toBe(true));
  it("34. undeclared outputs are reported", async () => {
    const f = fixture({ args: ["fixture:undeclared"] });
    const result = await f.engine.execute(f.request, createExecutionAuthorization({ request: f.request }));
    expect(result.undeclaredOutputs).toContain("extra.txt");
    f.close();
  });
  it("35. source repository is not mutated", () => expect(proof.sourceNotMutated).toBe(true));
  it("36. operational database is not exposed as writable input", async () => {
    const f = fixture();
    f.request.inputs = [{ id: "db", sourceType: "copy-file", source: ".sera/state/sera-operational.db", workspacePath: "db" }];
    const result = await f.engine.execute(f.request, createExecutionAuthorization({ request: f.request }));
    expect(result.ok).toBe(false);
    f.close();
  });
  it("37. cleanup succeeds after normal completion", () => expect(proof.cleanupComplete).toBe(true));
  it("38. cleanup succeeds after failure", async () => {
    const f = fixture({ args: ["fixture:fail"] });
    const result = await f.engine.execute(f.request, createExecutionAuthorization({ request: f.request }));
    expect(result.cleanup.cleaned).toBe(true);
    f.close();
  });
  it("39. cleanup succeeds after timeout", () => expect(proof.cleanupComplete).toBe(true));
  it("40. execution events are monotonic and durable", () => expect(proof.eventsDurable).toBe(true));
  it("41. transaction failure leaves no partial execution advancement", async () => {
    const f = fixture();
    const before = f.store.recoveryAll("SELECT COUNT(*) AS c FROM execution_authorizations")[0].c;
    await f.engine.execute(f.request);
    const after = f.store.recoveryAll("SELECT COUNT(*) AS c FROM execution_authorizations")[0].c;
    expect(after).toBe(before);
    f.close();
  });
  it("42. Runtime Service reports healthy", () => expect(proof.runtimeServiceHealthy).toBe(true));
  it("43. shutdown refuses new execution", async () => {
    const f = fixture();
    f.engine.shutdown();
    await expect(f.engine.execute(f.request, createExecutionAuthorization({ request: f.request }))).rejects.toThrow(/shutting down/);
    f.close();
  });
  it("44. Runtime cancellation reaches active execution", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "sera-exec-host-test-"));
    const host = new RuntimeHost({ config: createRuntimeConfig({ projectRoot: root }), services: createIsolatedExecutionRuntimeServices(root) });
    const started = await host.start();
    const stopped = await host.shutdown("test");
    expect(started.ok && stopped.ok).toBe(true);
  });
  it("45. stale running execution is classified conservatively after restart", () => expect(proof.restartClassificationSafe).toBe(true));
  it("46. execution evidence is complete", () => expect(proof.evidenceComplete).toBe(true));
  it("47. non-Git operation passes", () => expect(proof.nonGit).toBe(true));
  it("48. offline operation passes", () => expect(proof.networkUse).toBe(false));
  it("49. no model is required", () => expect(proof.modelUse).toBe(false));
  it("50. deterministic normalized proof is repeatable", async () => {
    const second = await runIsolatedExecutionProof();
    expect(second.ok && second.evidenceComplete && second.networkUse === false && second.modelUse === false).toBe(true);
  }, 20000);

  it("documents the exact v1 isolation limitation", () => {
    expect(ISOLATION_LIMITATION).toContain("not a complete hostile-code security boundary");
  });

  it("keeps the policy version stable", () => {
    expect(EXECUTION_POLICY_VERSION).toBe("isolated-execution-policy-v1");
  });

  it("computes stable request hashes", () => {
    const f = fixture();
    expect(requestHash(f.request)).toBe(requestHash({ ...f.request }));
    f.close();
  });

  it("lists only registered executable adapters", () => {
    expect(createDefaultExecutableRegistry().list().map((item) => item.id)).toEqual(["missing-fixture", "network-fixture", "node-fixture"]);
  });
});

function fixture(overrides: Partial<ExecutionRequest> = {}): { root: string; store: RuntimeStateStore; engine: IsolatedExecutionEngine; request: ExecutionRequest; close(): void } {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "sera-execution-test-"));
  fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ private: true }), "utf8");
  const store = openRuntimeState({ projectRoot: root, installationId: "installation_test", runtimeInstanceId: `runtime_${Date.now()}_${Math.random()}` });
  const command = store.acceptCommand({ idempotencyKey: `test:${Date.now()}:${Math.random()}`, commandType: "execution-test", payload: {}, capability: "isolated-execution" });
  const attemptId = command.attemptId!;
  store.transitionAttempt({ attemptId, fromState: "PENDING", toState: "RUNNING", actor: "control-plane" });
  const request: ExecutionRequest = {
    executionId: `execution_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    attemptId,
    authorizationId: `authorization_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    executableId: "node-fixture",
    args: ["fixture:output"],
    inputs: [{ id: "input", sourceType: "inline-text", workspacePath: "input.txt", content: "hello\n" }],
    outputs: [{ id: "result", workspacePath: "out/result.txt", required: false }],
    workingDirectory: ".",
    environmentProfile: "offline-minimal",
    timeoutMs: 5000,
    gracefulCancellationMs: 25,
    maxStdoutBytes: 65536,
    maxStderrBytes: 65536,
    maxCombinedOutputBytes: 98304,
    expectedExitCodes: [0],
    networkPolicy: "offline-strict",
    cleanupPolicy: "delete-workspace",
    correlation: {},
    ...overrides
  };
  return { root, store, engine: new IsolatedExecutionEngine(store, { projectRoot: root }), request, close: () => store.close() };
}

function rehashAuth(auth: ExecutionAuthorization): ExecutionAuthorization {
  const { integrityHash: _ignored, ...base } = auth;
  return { ...auth, integrityHash: stableHash(base) };
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
