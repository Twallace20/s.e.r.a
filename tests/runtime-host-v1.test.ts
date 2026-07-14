import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  RuntimeHost,
  RuntimeService,
  createDefaultRuntimeServices,
  createRuntimeConfig,
  loadOrCreateRuntimeIdentity,
  normalizeRuntimeServices,
  runRuntimeHostProof
} from "../packages/runtime-host/src";

function tempRoot(prefix = "sera-runtime-host-test-") {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ name: "runtime-host-test", private: true }), "utf8");
  return root;
}

function service(id: string, options: Partial<RuntimeService> & { log?: string[] } = {}): RuntimeService {
  const log = options.log ?? [];
  return {
    id,
    version: "test-v1",
    required: options.required ?? true,
    dependencies: options.dependencies ?? [],
    start: options.start ?? ((context) => {
      log.push(`start:${id}`);
      if (context.signal.aborted) throw new Error("cancelled");
    }),
    health: options.health ?? (() => ({ serviceId: id, status: "healthy", checkedAt: new Date().toISOString() })),
    stop: options.stop ?? (() => {
      log.push(`stop:${id}`);
    }),
    startupTimeoutMs: options.startupTimeoutMs,
    shutdownTimeoutMs: options.shutdownTimeoutMs
  };
}

describe("Runtime Host v1", () => {
  it("persists installationId across restarts and changes runtimeInstanceId", () => {
    const root = tempRoot();
    const config = createRuntimeConfig({ projectRoot: root });
    const first = loadOrCreateRuntimeIdentity(config);
    const second = loadOrCreateRuntimeIdentity(config);

    expect(second.installationId).toBe(first.installationId);
    expect(second.runtimeInstanceId).not.toBe(first.runtimeInstanceId);
  });

  it("starts services in dependency order and stops in reverse dependency order", async () => {
    const root = tempRoot();
    const log: string[] = [];
    const host = new RuntimeHost({
      config: { projectRoot: root },
      services: [
        service("app", { dependencies: ["runtime"], log }),
        service("kernel", { log }),
        service("runtime", { dependencies: ["kernel"], log })
      ]
    });

    const start = await host.start();
    const shutdown = await host.shutdown();

    expect(start.ok).toBe(true);
    expect(start.serviceOrder).toEqual(["kernel", "runtime", "app"]);
    expect(log).toEqual(["start:kernel", "start:runtime", "start:app", "stop:app", "stop:runtime", "stop:kernel"]);
    expect(shutdown.stoppedServices).toEqual(["app", "runtime", "kernel"]);
  });

  it("rejects duplicate service IDs, missing dependencies, cycles, and invalid services", () => {
    expect(() => normalizeRuntimeServices([service("a"), service("a")])).toThrow(/Duplicate/);
    expect(() => normalizeRuntimeServices([service("a", { dependencies: ["missing"] })])).toThrow(/missing/);
    expect(() => normalizeRuntimeServices([service("a", { dependencies: ["b"] }), service("b", { dependencies: ["a"] })])).toThrow(/cycle/);
    expect(() => normalizeRuntimeServices([{ ...service("bad"), start: undefined as unknown as RuntimeService["start"] }])).toThrow(/missing lifecycle/);
  });

  it("rejects unsafe local runtime configuration", () => {
    const root = tempRoot();

    expect(() => createRuntimeConfig({ projectRoot: root, stateRoot: "relative-state" })).toThrow(/stateRoot/);
    expect(() => createRuntimeConfig({ projectRoot: root, evidenceRoot: "relative-evidence" })).toThrow(/evidenceRoot/);
    expect(() => createRuntimeConfig({ projectRoot: root, networkPolicy: "online" as "offline-strict" })).toThrow(/network policy/);
    expect(() => createRuntimeConfig({ projectRoot: root, defaultStartupTimeoutMs: 0 })).toThrow(/defaultStartupTimeoutMs/);
  });

  it("blocks required startup failure and cleans up already-started services", async () => {
    const root = tempRoot();
    const log: string[] = [];
    const host = new RuntimeHost({
      config: { projectRoot: root },
      services: [
        service("first", { log }),
        service("second", {
          log,
          start: () => {
            log.push("start:second");
            throw new Error("required failure");
          }
        }),
        service("third", { log })
      ]
    });

    const result = await host.start();

    expect(result.ok).toBe(false);
    expect(result.status).toBe("blocked");
    expect(result.failedServiceId).toBe("second");
    expect(log).toEqual(["start:first", "start:second", "stop:first"]);
    expect(result.startedServices).toEqual([]);
  });

  it("continues after optional startup failure with degraded health", async () => {
    const root = tempRoot();
    const log: string[] = [];
    const host = new RuntimeHost({
      config: { projectRoot: root },
      services: [
        service("required-a", { log }),
        service("optional-b", {
          required: false,
          log,
          start: () => {
            log.push("start:optional-b");
            throw new Error("optional failure");
          }
        }),
        service("required-c", { log })
      ]
    });

    const result = await host.start();
    const health = await host.health();
    await host.shutdown();

    expect(result.ok).toBe(true);
    expect(health.status).toBe("degraded");
    expect(log).toContain("start:required-c");
  });

  it("does not dishonestly start dependents of a failed optional service", async () => {
    const root = tempRoot();
    const log: string[] = [];
    const host = new RuntimeHost({
      config: { projectRoot: root },
      services: [
        service("optional-b", {
          required: false,
          log,
          start: () => {
            log.push("start:optional-b");
            throw new Error("optional failure");
          }
        }),
        service("dependent", { required: false, dependencies: ["optional-b"], log })
      ]
    });

    const result = await host.start();
    await host.shutdown();

    expect(result.ok).toBe(true);
    expect(log).toEqual(["start:optional-b"]);
  });

  it("makes repeated shutdown idempotent", async () => {
    const root = tempRoot();
    const log: string[] = [];
    const host = new RuntimeHost({ config: { projectRoot: root }, services: [service("a", { log })] });
    await host.start();

    const first = await host.shutdown();
    const second = await host.shutdown();

    expect(first.ok).toBe(true);
    expect(second).toEqual(first);
    expect(log).toEqual(["start:a", "stop:a"]);
  });

  it("records shutdown timeout handling without hanging", async () => {
    const root = tempRoot();
    const host = new RuntimeHost({
      config: { projectRoot: root, defaultShutdownTimeoutMs: 1 },
      services: [service("slow-stop", { stop: () => new Promise<void>(() => undefined) })]
    });
    await host.start();

    const shutdown = await host.shutdown();
    const evidenceRoot = path.join(root, ".sera", "runtime-host", host.getIdentity()?.runtimeInstanceId ?? "");
    const events = fs.readFileSync(path.join(evidenceRoot, "lifecycle-events.jsonl"), "utf8");

    expect(shutdown.ok).toBe(true);
    expect(events).toContain("Shutdown timeout for slow-stop");
  });

  it("propagates cancellation through AbortSignal", async () => {
    const root = tempRoot();
    let observedAbort = false;
    const host = new RuntimeHost({
      config: { projectRoot: root },
      services: [
        service("a", {
          stop: (context) => {
            observedAbort = context.signal.aborted;
          }
        })
      ]
    });

    await host.start();
    await host.shutdown();

    expect(observedAbort).toBe(true);
  });

  it("writes lifecycle evidence, health, identity, configuration, and final report", async () => {
    const root = tempRoot();
    const proof = await runRuntimeHostProof({ projectRoot: root });
    const evidenceRoot = proof.evidenceRoot ?? "";

    expect(proof.ok).toBe(true);
    expect(fs.existsSync(path.join(evidenceRoot, "identity.json"))).toBe(true);
    expect(fs.existsSync(path.join(evidenceRoot, "configuration.json"))).toBe(true);
    expect(fs.existsSync(path.join(evidenceRoot, "lifecycle-events.jsonl"))).toBe(true);
    expect(fs.existsSync(path.join(evidenceRoot, "service-health.json"))).toBe(true);
    expect(fs.existsSync(path.join(evidenceRoot, "final-runtime-report.json"))).toBe(true);
  });

  it("blocks corrupt installation identity", () => {
    const root = tempRoot();
    const config = createRuntimeConfig({ projectRoot: root });
    fs.mkdirSync(config.stateRoot, { recursive: true });
    fs.writeFileSync(path.join(config.stateRoot, "identity.json"), "{ bad json", "utf8");

    expect(() => loadOrCreateRuntimeIdentity(config)).toThrow();
  });

  it("runs in a temporary non-Git directory without model, network, GitHub, ChatGPT, Codex, or database", async () => {
    const root = tempRoot("sera-runtime-host-non-git-");
    expect(fs.existsSync(path.join(root, ".git"))).toBe(false);

    const proof = await runRuntimeHostProof({ projectRoot: root });

    expect(proof.ok).toBe(true);
    expect(proof.modelUse).toBe(false);
    expect(proof.networkUse).toBe(false);
    expect(JSON.stringify(proof)).not.toMatch(/GitHub|ChatGPT|Codex|SQLite/i);
  });

  it("hosts Unified Control Plane as a required service without moving authority", async () => {
    const root = tempRoot();
    const proof = await runRuntimeHostProof({ projectRoot: root }, createDefaultRuntimeServices(root));
    const controlPlaneHealth = proof.health?.services.find((item) => item.serviceId === "unified-control-plane");

    expect(proof.ok).toBe(true);
    expect(controlPlaneHealth?.status).toBe("healthy");
    expect(controlPlaneHealth?.details?.authority).toBe("attempts-terminal-decisions-validation-evidence-closeout");
  });

  it("produces deterministic normalized order for equivalent registrations", () => {
    const first = normalizeRuntimeServices([
      service("c", { dependencies: ["a", "b"] }),
      service("b", { dependencies: ["a"] }),
      service("a")
    ]).map((item) => item.id);
    const second = normalizeRuntimeServices([
      service("b", { dependencies: ["a"] }),
      service("a"),
      service("c", { dependencies: ["b", "a"] })
    ]).map((item) => item.id);

    expect(second).toEqual(first);
    expect(first).toEqual(["a", "b", "c"]);
  });
});
