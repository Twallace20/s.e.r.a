import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ProductControlPlane } from "@sera/operator-gateway";
import { openRuntimeState } from "@sera/runtime-state";
import { GovernedMemoryComposition, createGovernedMemoryAuthorization } from "@sera/runtime-capability-composition";

describe("Governed Memory Composition v1", () => {
  it("binds a durable memory record to Runtime State evidence and blocks mismatched authorization before writing", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "sera-governed-memory-"));
    const store = openRuntimeState({ projectRoot: root });
    try {
      const plane = new ProductControlPlane(store);
      const composition = new GovernedMemoryComposition(plane, root);
      const command = plane.acceptCommand({ idempotencyKey: "memory-proof", commandType: "record-memory", payload: { bounded: true }, capability: "memory" });
      const attemptId = command.attemptId!;
      plane.transitionAttempt({ attemptId, fromState: "PENDING", toState: "RUNNING", actor: "control-plane" });
      const authorization = createGovernedMemoryAuthorization(attemptId);
      const record = { runId: "m5-08-real-run", taskId: "m5-08-real-task", prompt: "Retain governed completion evidence", status: "completed" as const, summary: "Governed durable memory record retained.", startedAt: new Date().toISOString(), finishedAt: new Date().toISOString(), runDir: "<PROOF_ROOT>/run", artifacts: ["evidence/milestone-5/memory-governed-proof.json"] };
      expect(() => composition.record({ attemptId, authorization: { ...authorization, attemptId: "tampered" }, record })).toThrow();
      expect(fs.existsSync(path.join(root, ".sera-memory"))).toBe(false);
      const result = composition.record({ attemptId, authorization, record });
      expect(fs.existsSync(result.result.runRecordPath)).toBe(true);
      expect(fs.existsSync(result.evidencePath)).toBe(true);
      expect(crypto.createHash("sha256").update(fs.readFileSync(result.evidencePath)).digest("hex")).toBe(result.recordHash);
      expect(plane.recoveryGet("SELECT current_state FROM attempts WHERE attempt_id = ?", [attemptId])?.current_state).toBe("RUNNING");
      expect(plane.recoveryGet("SELECT integrity_hash FROM evidence_references WHERE evidence_reference_id = ?", [result.evidenceReferenceId])?.integrity_hash).toBe(result.recordHash);
    } finally {
      store.close();
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
