import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { ControlPlane } from "@sera/control-plane";

export const RUNTIME_HOST_VERSION = "runtime-host-v1";
export const RUNTIME_IDENTITY_SCHEMA_VERSION = "sera.runtime-identity.v1";
export const RUNTIME_EVENT_SCHEMA_VERSION = "sera.runtime-host-event.v1";

export type RuntimeHealthStatus = "starting" | "healthy" | "degraded" | "stopping" | "stopped" | "blocked";
export type PermissionProfile = "offline-local";
export type NetworkPolicy = "offline-strict";

export interface RuntimeHostClock {
  now(): Date;
}

export interface RuntimeIdentity {
  schemaVersion: typeof RUNTIME_IDENTITY_SCHEMA_VERSION;
  installationId: string;
  runtimeInstanceId: string;
  runtimeVersion: string;
  startedAt: string;
  permissionProfile: PermissionProfile;
  networkPolicy: NetworkPolicy;
}

export interface RuntimeHostConfigInput {
  projectRoot: string;
  stateRoot?: string;
  evidenceRoot?: string;
  runtimeVersion?: string;
  permissionProfile?: PermissionProfile;
  networkPolicy?: NetworkPolicy;
  defaultStartupTimeoutMs?: number;
  defaultShutdownTimeoutMs?: number;
}

export interface RuntimeHostConfig {
  projectRoot: string;
  stateRoot: string;
  evidenceRoot: string;
  runtimeVersion: string;
  permissionProfile: PermissionProfile;
  networkPolicy: NetworkPolicy;
  defaultStartupTimeoutMs: number;
  defaultShutdownTimeoutMs: number;
}

export interface RuntimeServiceContext {
  config: RuntimeHostConfig;
  identity: RuntimeIdentity;
  signal: AbortSignal;
  evidenceRoot: string;
  runtimeInstanceRoot: string;
}

export interface RuntimeServiceHealth {
  serviceId: string;
  status: RuntimeHealthStatus;
  checkedAt: string;
  message?: string;
  details?: Record<string, unknown>;
}

export interface RuntimeService {
  id: string;
  version: string;
  required: boolean;
  dependencies: string[];
  startupTimeoutMs?: number;
  shutdownTimeoutMs?: number;
  start(context: RuntimeServiceContext): void | Promise<void>;
  health(context: RuntimeServiceContext): RuntimeServiceHealth | Promise<RuntimeServiceHealth>;
  stop(context: RuntimeServiceContext): void | Promise<void>;
}

export interface RuntimeLifecycleEvent {
  schemaVersion: typeof RUNTIME_EVENT_SCHEMA_VERSION;
  runtimeInstanceId: string;
  installationId: string;
  serviceId?: string;
  eventType: string;
  timestamp: string;
  outcome: "STARTED" | "COMPLETED" | "DEGRADED" | "BLOCKED" | "FAILED" | "SKIPPED";
  message?: string;
  details?: Record<string, unknown>;
}

export interface RuntimeHostStartResult {
  ok: boolean;
  status: RuntimeHealthStatus;
  identity?: RuntimeIdentity;
  serviceOrder: string[];
  startedServices: string[];
  failedServiceId?: string;
  message: string;
  health?: RuntimeAggregateHealth;
  evidenceRoot?: string;
}

export interface RuntimeShutdownResult {
  ok: boolean;
  status: RuntimeHealthStatus;
  stoppedServices: string[];
  message: string;
}

export interface RuntimeAggregateHealth {
  schemaVersion: "sera.runtime-health.v1";
  runtimeInstanceId: string;
  installationId: string;
  status: RuntimeHealthStatus;
  checkedAt: string;
  services: RuntimeServiceHealth[];
}

export interface RuntimeProofResult {
  ok: boolean;
  status: RuntimeHealthStatus;
  identity?: RuntimeIdentity;
  health?: RuntimeAggregateHealth;
  shutdown?: RuntimeShutdownResult;
  evidenceRoot?: string;
  message: string;
  modelUse: false;
  networkUse: false;
}

export class RuntimeHostBlockedError extends Error {
  constructor(message: string, readonly code: string) {
    super(message);
  }
}

export function createRuntimeConfig(input: RuntimeHostConfigInput): RuntimeHostConfig {
  const projectRoot = path.resolve(input.projectRoot);
  if (input.stateRoot && !isExplicitAbsolutePath(input.stateRoot)) throw new RuntimeHostBlockedError("stateRoot must be absolute when supplied.", "invalid_state_root");
  if (input.evidenceRoot && !isExplicitAbsolutePath(input.evidenceRoot)) throw new RuntimeHostBlockedError("evidenceRoot must be absolute when supplied.", "invalid_evidence_root");
  const stateRoot = input.stateRoot ? path.resolve(input.stateRoot) : path.join(projectRoot, ".sera", "runtime-host", "state");
  const evidenceRoot = input.evidenceRoot ? path.resolve(input.evidenceRoot) : path.join(projectRoot, ".sera", "runtime-host");
  const config: RuntimeHostConfig = {
    projectRoot,
    stateRoot,
    evidenceRoot,
    runtimeVersion: input.runtimeVersion ?? "0.1.0",
    permissionProfile: input.permissionProfile ?? "offline-local",
    networkPolicy: input.networkPolicy ?? "offline-strict",
    defaultStartupTimeoutMs: input.defaultStartupTimeoutMs ?? 5000,
    defaultShutdownTimeoutMs: input.defaultShutdownTimeoutMs ?? 5000
  };
  validateRuntimeConfig(config);
  return config;
}

export function validateRuntimeConfig(config: RuntimeHostConfig): void {
  if (!path.isAbsolute(config.projectRoot)) throw new RuntimeHostBlockedError("projectRoot must be absolute.", "invalid_project_root");
  if (!path.isAbsolute(config.stateRoot)) throw new RuntimeHostBlockedError("stateRoot must be absolute.", "invalid_state_root");
  if (!path.isAbsolute(config.evidenceRoot)) throw new RuntimeHostBlockedError("evidenceRoot must be absolute.", "invalid_evidence_root");
  if (config.permissionProfile !== "offline-local") throw new RuntimeHostBlockedError("Unsupported permission profile.", "unsupported_permission_profile");
  if (config.networkPolicy !== "offline-strict") throw new RuntimeHostBlockedError("Unsupported network policy.", "unsupported_network_policy");
  for (const [name, value] of [["defaultStartupTimeoutMs", config.defaultStartupTimeoutMs], ["defaultShutdownTimeoutMs", config.defaultShutdownTimeoutMs]] as const) {
    if (!Number.isInteger(value) || value < 1 || value > 300000) {
      throw new RuntimeHostBlockedError(`${name} must be an integer between 1 and 300000.`, "invalid_timeout");
    }
  }
}

export function loadOrCreateRuntimeIdentity(config: RuntimeHostConfig, clock: RuntimeHostClock = systemClock()): RuntimeIdentity {
  fs.mkdirSync(config.stateRoot, { recursive: true });
  const identityPath = path.join(config.stateRoot, "identity.json");
  let installationId: string;
  if (fs.existsSync(identityPath)) {
    const parsed = JSON.parse(fs.readFileSync(identityPath, "utf8")) as Partial<RuntimeIdentity>;
    if (parsed.schemaVersion !== RUNTIME_IDENTITY_SCHEMA_VERSION || typeof parsed.installationId !== "string" || !parsed.installationId.startsWith("installation_")) {
      throw new RuntimeHostBlockedError("Runtime installation identity is corrupt or unsupported.", "corrupt_identity");
    }
    installationId = parsed.installationId;
  } else {
    installationId = `installation_${crypto.randomBytes(8).toString("hex")}`;
    atomicWriteJson(identityPath, {
      schemaVersion: RUNTIME_IDENTITY_SCHEMA_VERSION,
      installationId,
      createdAt: clock.now().toISOString(),
      permissionProfile: config.permissionProfile,
      networkPolicy: config.networkPolicy
    });
  }
  return {
    schemaVersion: RUNTIME_IDENTITY_SCHEMA_VERSION,
    installationId,
    runtimeInstanceId: `runtime_${crypto.randomBytes(8).toString("hex")}`,
    runtimeVersion: config.runtimeVersion,
    startedAt: clock.now().toISOString(),
    permissionProfile: config.permissionProfile,
    networkPolicy: config.networkPolicy
  };
}

export function normalizeRuntimeServices(services: RuntimeService[]): RuntimeService[] {
  const byId = new Map<string, RuntimeService>();
  for (const service of services) {
    validateServiceDefinition(service);
    if (byId.has(service.id)) throw new RuntimeHostBlockedError(`Duplicate Runtime Service ID: ${service.id}`, "duplicate_service_id");
    byId.set(service.id, service);
  }
  for (const service of services) {
    for (const dependency of service.dependencies) {
      if (!byId.has(dependency)) throw new RuntimeHostBlockedError(`Runtime Service ${service.id} depends on missing service ${dependency}.`, "missing_dependency");
    }
  }
  const sortedIds = [...byId.keys()].sort();
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const order: RuntimeService[] = [];
  const visit = (id: string, chain: string[]) => {
    if (visited.has(id)) return;
    if (visiting.has(id)) throw new RuntimeHostBlockedError(`Runtime Service dependency cycle: ${[...chain, id].join(" -> ")}.`, "dependency_cycle");
    visiting.add(id);
    const service = byId.get(id);
    if (!service) throw new RuntimeHostBlockedError(`Missing Runtime Service: ${id}`, "missing_dependency");
    for (const dependency of [...service.dependencies].sort()) visit(dependency, [...chain, id]);
    visiting.delete(id);
    visited.add(id);
    order.push(service);
  };
  for (const id of sortedIds) visit(id, []);
  return order;
}

export class RuntimeHost {
  private readonly config: RuntimeHostConfig;
  private readonly services: RuntimeService[];
  private readonly clock: RuntimeHostClock;
  private identity?: RuntimeIdentity;
  private abortController = new AbortController();
  private started: RuntimeService[] = [];
  private status: RuntimeHealthStatus = "stopped";
  private shutdownStarted = false;
  private shutdownResult?: RuntimeShutdownResult;
  private runtimeInstanceRoot?: string;

  constructor(input: { config: RuntimeHostConfigInput | RuntimeHostConfig; services: RuntimeService[]; clock?: RuntimeHostClock }) {
    this.config = isRuntimeHostConfig(input.config) ? input.config : createRuntimeConfig(input.config);
    this.services = normalizeRuntimeServices(input.services);
    this.clock = input.clock ?? systemClock();
  }

  getServiceOrder(): string[] {
    return this.services.map((service) => service.id);
  }

  getIdentity(): RuntimeIdentity | undefined {
    return this.identity;
  }

  async start(): Promise<RuntimeHostStartResult> {
    if (this.status === "healthy" || this.status === "degraded") {
      return { ok: true, status: this.status, identity: this.identity, serviceOrder: this.getServiceOrder(), startedServices: this.started.map((s) => s.id), message: "Runtime Host is already started.", health: await this.health(), evidenceRoot: this.runtimeInstanceRoot };
    }
    try {
      this.status = "starting";
      this.identity = loadOrCreateRuntimeIdentity(this.config, this.clock);
      this.runtimeInstanceRoot = path.join(this.config.evidenceRoot, this.identity.runtimeInstanceId);
      fs.mkdirSync(this.runtimeInstanceRoot, { recursive: true });
      atomicWriteJson(path.join(this.runtimeInstanceRoot, "identity.json"), this.identity);
      atomicWriteJson(path.join(this.runtimeInstanceRoot, "configuration.json"), serializableConfig(this.config));
      this.event("runtime-start", "STARTED", undefined, "Runtime Host starting.");

      let degraded = false;
      const skipped = new Set<string>();
      for (const service of this.services) {
        const skippedDependency = service.dependencies.find((dependency) => skipped.has(dependency));
        if (skippedDependency) {
          skipped.add(service.id);
          this.event("service-start", service.required ? "BLOCKED" : "SKIPPED", service.id, `Dependency ${skippedDependency} did not start.`);
          if (service.required) throw new RuntimeHostBlockedError(`Required service ${service.id} could not start because dependency ${skippedDependency} did not start.`, "required_dependency_skipped");
          degraded = true;
          continue;
        }
        try {
          this.event("service-start", "STARTED", service.id, "Starting service.");
          await withTimeout(Promise.resolve(service.start(this.context())), service.startupTimeoutMs ?? this.config.defaultStartupTimeoutMs, `Startup timeout for ${service.id}.`);
          this.started.push(service);
          this.event("service-start", "COMPLETED", service.id, "Service started.");
        } catch (error) {
          const message = errorMessage(error);
          this.event("service-start", service.required ? "BLOCKED" : "DEGRADED", service.id, message);
          if (service.required) {
            await this.cleanupAfterFailedStart(service.id, message);
            return { ok: false, status: "blocked", identity: this.identity, serviceOrder: this.getServiceOrder(), startedServices: this.started.map((s) => s.id), failedServiceId: service.id, message, health: await this.health(), evidenceRoot: this.runtimeInstanceRoot };
          }
          skipped.add(service.id);
          degraded = true;
        }
      }
      const health = await this.health();
      this.status = degraded || health.status === "degraded" ? "degraded" : "healthy";
      const finalHealth = await this.health();
      this.writeFinalReport(finalHealth, "Runtime Host started.");
      return { ok: true, status: this.status, identity: this.identity, serviceOrder: this.getServiceOrder(), startedServices: this.started.map((s) => s.id), message: "Runtime Host started.", health: finalHealth, evidenceRoot: this.runtimeInstanceRoot };
    } catch (error) {
      const message = errorMessage(error);
      this.status = "blocked";
      return { ok: false, status: "blocked", identity: this.identity, serviceOrder: this.getServiceOrder(), startedServices: this.started.map((s) => s.id), message, evidenceRoot: this.runtimeInstanceRoot };
    }
  }

  async health(): Promise<RuntimeAggregateHealth> {
    const identity = this.requireIdentity();
    const services: RuntimeServiceHealth[] = [];
    for (const service of this.services) {
      if (!this.started.includes(service)) {
        services.push({ serviceId: service.id, status: this.status === "blocked" && service.required ? "blocked" : "stopped", checkedAt: this.clock.now().toISOString(), message: "Service is not started." });
        continue;
      }
      try {
        const health = await service.health(this.context());
        services.push({ ...health, serviceId: service.id, checkedAt: health.checkedAt || this.clock.now().toISOString() });
      } catch (error) {
        services.push({ serviceId: service.id, status: service.required ? "blocked" : "degraded", checkedAt: this.clock.now().toISOString(), message: errorMessage(error) });
      }
    }
    const status = aggregateHealthStatus(this.status, services, this.services);
    const result: RuntimeAggregateHealth = {
      schemaVersion: "sera.runtime-health.v1",
      runtimeInstanceId: identity.runtimeInstanceId,
      installationId: identity.installationId,
      status,
      checkedAt: this.clock.now().toISOString(),
      services
    };
    if (this.runtimeInstanceRoot) atomicWriteJson(path.join(this.runtimeInstanceRoot, "service-health.json"), result);
    return result;
  }

  async shutdown(message = "Runtime Host shutdown requested."): Promise<RuntimeShutdownResult> {
    if (this.shutdownResult) return this.shutdownResult;
    if (this.shutdownStarted) return { ok: true, status: "stopping", stoppedServices: [], message: "Runtime Host shutdown already in progress." };
    this.shutdownStarted = true;
    this.status = "stopping";
    this.abortController.abort(message);
    this.event("runtime-stop", "STARTED", undefined, message);
    const stoppedServices: string[] = [];
    for (const service of [...this.started].reverse()) {
      try {
        this.event("service-stop", "STARTED", service.id, "Stopping service.");
        await withTimeout(Promise.resolve(service.stop(this.context())), service.shutdownTimeoutMs ?? this.config.defaultShutdownTimeoutMs, `Shutdown timeout for ${service.id}.`);
        stoppedServices.push(service.id);
        this.event("service-stop", "COMPLETED", service.id, "Service stopped.");
      } catch (error) {
        this.event("service-stop", "FAILED", service.id, errorMessage(error));
      }
    }
    this.started = [];
    this.status = "stopped";
    const health = await this.health();
    this.event("runtime-stop", "COMPLETED", undefined, "Runtime Host stopped.");
    this.writeFinalReport(health, "Runtime Host stopped.");
    this.shutdownResult = { ok: true, status: "stopped", stoppedServices, message: "Runtime Host stopped." };
    return this.shutdownResult;
  }

  bindProcessSignals(processLike: Pick<NodeJS.Process, "once"> = process): () => void {
    const onSignal = () => { void this.shutdown("Runtime Host received shutdown signal."); };
    processLike.once("SIGINT", onSignal);
    processLike.once("SIGTERM", onSignal);
    return () => undefined;
  }

  private async cleanupAfterFailedStart(serviceId: string, message: string): Promise<void> {
    this.status = "blocked";
    this.event("runtime-start", "BLOCKED", serviceId, message);
    await this.shutdown("Runtime Host startup blocked; cleaning up started services.");
    this.status = "blocked";
    const health = await this.health();
    this.writeFinalReport(health, message);
  }

  private context(): RuntimeServiceContext {
    return {
      config: this.config,
      identity: this.requireIdentity(),
      signal: this.abortController.signal,
      evidenceRoot: this.config.evidenceRoot,
      runtimeInstanceRoot: this.runtimeInstanceRoot ?? this.config.evidenceRoot
    };
  }

  private requireIdentity(): RuntimeIdentity {
    if (!this.identity) throw new RuntimeHostBlockedError("Runtime identity has not been initialized.", "missing_identity");
    return this.identity;
  }

  private event(eventType: string, outcome: RuntimeLifecycleEvent["outcome"], serviceId?: string, message?: string, details?: Record<string, unknown>): void {
    if (!this.identity || !this.runtimeInstanceRoot) return;
    const event: RuntimeLifecycleEvent = {
      schemaVersion: RUNTIME_EVENT_SCHEMA_VERSION,
      runtimeInstanceId: this.identity.runtimeInstanceId,
      installationId: this.identity.installationId,
      serviceId,
      eventType,
      timestamp: this.clock.now().toISOString(),
      outcome,
      message,
      details
    };
    appendJsonLine(path.join(this.runtimeInstanceRoot, "lifecycle-events.jsonl"), event);
  }

  private writeFinalReport(health: RuntimeAggregateHealth, message: string): void {
    if (!this.runtimeInstanceRoot || !this.identity) return;
    atomicWriteJson(path.join(this.runtimeInstanceRoot, "final-runtime-report.json"), {
      schemaVersion: "sera.runtime-host-report.v1",
      runtimeInstanceId: this.identity.runtimeInstanceId,
      installationId: this.identity.installationId,
      status: health.status,
      message,
      serviceOrder: this.getServiceOrder(),
      health,
      modelUse: false,
      networkUse: false
    });
  }
}

export function createControlPlaneRuntimeService(projectRoot: string): RuntimeService {
  let controlPlane: ControlPlane | undefined;
  return {
    id: "unified-control-plane",
    version: "control-plane-v1",
    required: true,
    dependencies: [],
    start() {
      controlPlane = new ControlPlane({ repositoryRoot: projectRoot });
    },
    health(context) {
      const inspect = controlPlane?.inspect();
      return {
        serviceId: "unified-control-plane",
        status: inspect?.ok ? "healthy" : "blocked",
        checkedAt: new Date().toISOString(),
        message: inspect?.ok ? "Unified Control Plane service is available; attempt authority remains in Control Plane." : "Unified Control Plane is unavailable.",
        details: { authority: "attempts-terminal-decisions-validation-evidence-closeout", runtimeInstanceId: context.identity.runtimeInstanceId }
      };
    },
    stop() {
      controlPlane = undefined;
    }
  };
}

export function createDefaultRuntimeServices(projectRoot: string): RuntimeService[] {
  return [createControlPlaneRuntimeService(projectRoot)];
}

export async function runRuntimeHostProof(input: RuntimeHostConfigInput, services = createDefaultRuntimeServices(path.resolve(input.projectRoot))): Promise<RuntimeProofResult> {
  try {
    const host = new RuntimeHost({ config: input, services });
    const started = await host.start();
    const health = started.identity ? await host.health() : undefined;
    const shutdown = await host.shutdown("Runtime Host proof complete.");
    return { ok: started.ok && shutdown.ok, status: health?.status ?? started.status, identity: started.identity, health, shutdown, evidenceRoot: started.evidenceRoot, message: started.message, modelUse: false, networkUse: false };
  } catch (error) {
    return { ok: false, status: "blocked", message: errorMessage(error), modelUse: false, networkUse: false };
  }
}

function validateServiceDefinition(service: RuntimeService): void {
  if (!service || typeof service.id !== "string" || !/^[a-z0-9][a-z0-9._-]*$/i.test(service.id)) throw new RuntimeHostBlockedError("Invalid Runtime Service ID.", "invalid_service");
  if (typeof service.version !== "string" || service.version.length === 0) throw new RuntimeHostBlockedError(`Runtime Service ${service.id} has an invalid version.`, "invalid_service");
  if (typeof service.required !== "boolean") throw new RuntimeHostBlockedError(`Runtime Service ${service.id} must declare required.`, "invalid_service");
  if (!Array.isArray(service.dependencies)) throw new RuntimeHostBlockedError(`Runtime Service ${service.id} must declare dependencies.`, "invalid_service");
  if (typeof service.start !== "function" || typeof service.health !== "function" || typeof service.stop !== "function") throw new RuntimeHostBlockedError(`Runtime Service ${service.id} is missing lifecycle functions.`, "invalid_service");
}

function isRuntimeHostConfig(config: RuntimeHostConfigInput | RuntimeHostConfig): config is RuntimeHostConfig {
  return typeof config.stateRoot === "string"
    && typeof config.evidenceRoot === "string"
    && typeof config.defaultStartupTimeoutMs === "number"
    && typeof config.defaultShutdownTimeoutMs === "number";
}

function aggregateHealthStatus(current: RuntimeHealthStatus, services: RuntimeServiceHealth[], registered: RuntimeService[]): RuntimeHealthStatus {
  if (current === "blocked") return "blocked";
  if (current === "starting" || current === "stopping" || current === "stopped") return current;
  const requiredById = new Map(registered.map((service) => [service.id, service.required]));
  if (services.some((service) => requiredById.get(service.serviceId) && (service.status === "blocked" || service.status === "stopped"))) return "blocked";
  if (services.some((service) => service.status === "degraded" || service.status === "blocked" || service.status === "stopped")) return "degraded";
  return "healthy";
}

function serializableConfig(config: RuntimeHostConfig): RuntimeHostConfig {
  return { ...config };
}

function atomicWriteJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmpPath = `${filePath}.tmp-${process.pid}-${crypto.randomBytes(4).toString("hex")}`;
  fs.writeFileSync(tmpPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  fs.renameSync(tmpPath, filePath);
}

function appendJsonLine(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.appendFileSync(filePath, `${JSON.stringify(value)}\n`, "utf8");
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new RuntimeHostBlockedError(message, "timeout")), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  }) as Promise<T>;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function systemClock(): RuntimeHostClock {
  return { now: () => new Date() };
}

function isExplicitAbsolutePath(value: string): boolean {
  return (path.isAbsolute(value) || /^[A-Za-z]:[\\/]/.test(value)) && path.resolve(value) === value;
}
