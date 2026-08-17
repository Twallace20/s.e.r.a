import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { MemoryStore, type RecordRunInput } from "@sera/memory";
import type { RuntimeCapabilityControlPlanePort } from "./control-plane-port";

export interface GovernedMemoryAuthorization {
  attemptId: string;
  capabilityId: "memory";
  issuedAt: string;
  expiresAt: string;
  integrityHash: string;
}

export interface GovernedMemoryInput {
  attemptId: string;
  authorization: GovernedMemoryAuthorization;
  record: RecordRunInput;
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`).join(",")}}`;
  return JSON.stringify(value);
}

function digest(value: unknown): string {
  return crypto.createHash("sha256").update(stable(value)).digest("hex");
}

export function createGovernedMemoryAuthorization(attemptId: string, now = new Date()): GovernedMemoryAuthorization {
  const unsigned = { attemptId, capabilityId: "memory" as const, issuedAt: now.toISOString(), expiresAt: new Date(now.getTime() + 60_000).toISOString() };
  return { ...unsigned, integrityHash: digest(unsigned) };
}

export class GovernedMemoryComposition {
  constructor(private readonly controlPlane: RuntimeCapabilityControlPlanePort, private readonly projectRoot: string) {}

  record(input: GovernedMemoryInput) {
    const { integrityHash, ...unsigned } = input.authorization;
    if (input.authorization.attemptId !== input.attemptId || input.authorization.capabilityId !== "memory" || digest(unsigned) !== integrityHash || Date.parse(input.authorization.expiresAt) <= Date.now()) {
      throw new Error("Governed memory authorization is missing, expired, mismatched, or tampered.");
    }
    const attempt = this.controlPlane.recoveryGet("SELECT capability, current_state FROM attempts WHERE attempt_id = ?", [input.attemptId]);
    if (!attempt || attempt.capability !== "memory" || attempt.current_state !== "RUNNING") {
      throw new Error("Governed memory requires an authoritative RUNNING memory attempt.");
    }
    const memory = new MemoryStore(this.projectRoot);
    const result = memory.recordRun(input.record);
    const evidencePath = path.join(this.projectRoot, ".sera", "memory-composition", input.attemptId, "memory-record.json");
    fs.mkdirSync(path.dirname(evidencePath), { recursive: true });
    fs.writeFileSync(evidencePath, `${JSON.stringify({ attemptId: input.attemptId, authorizationIntegrityHash: integrityHash, memoryRecord: result.runRecord }, null, 2)}\n`, "utf8");
    const bytes = fs.readFileSync(evidencePath);
    const recordHash = crypto.createHash("sha256").update(bytes).digest("hex");
    const evidenceReferenceId = this.controlPlane.recordEvidenceReference({
      attemptId: input.attemptId,
      evidenceType: "durable-memory-record",
      location: path.relative(this.projectRoot, evidencePath).replaceAll(path.sep, "/"),
      integrityHash: recordHash,
      producer: "governed-memory-composition",
      metadata: { memoryRecordId: result.runRecord.id, terminalAuthorityRetained: true }
    });
    return { result, evidencePath, recordHash, evidenceReferenceId, attemptTerminalStateChanged: false, publicNetworkUse: false, modelUse: false };
  }
}
