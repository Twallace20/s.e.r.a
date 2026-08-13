import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ProductControlPlane } from "@sera/operator-gateway";
import { openRuntimeState } from "@sera/runtime-state";
import {
  GovernedCapabilityEngineComposition,
  createGovernedCapabilityEngineAuthorization
} from "@sera/runtime-capability-composition";

describe("Governed Capability Engine Composition v1", () => {
  it("assembles a real-resource immutable candidate bundle and blocks mismatched authorization before candidate writes", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "sera-governed-capability-engine-"));
    const sourcePath = path.join(process.cwd(), "docs", "BUILD_VALIDATION.md");
    const store = openRuntimeState({ projectRoot: root });
    try {
      const plane = new ProductControlPlane(store);
      const composition = new GovernedCapabilityEngineComposition(plane, store, root);
      const command = plane.acceptCommand({
        idempotencyKey: "m5-09-capability-engine",
        commandType: "assemble-real-resource-candidate",
        payload: { source: "docs/BUILD_VALIDATION.md" },
        capability: "capability-engine"
      });
      const attemptId = command.attemptId!;
      plane.transitionAttempt({
        attemptId,
        fromState: "PENDING",
        toState: "RUNNING",
        actor: "control-plane"
      });
      const authorization = createGovernedCapabilityEngineAuthorization({ attemptId, sourcePath });
      expect(() => composition.assembleRealResource({
        attemptId,
        sourcePath,
        authorization: { ...authorization, sourceSha256: "0".repeat(64) }
      })).toThrow();
      expect(fs.existsSync(path.join(root, ".sera", "capabilities", "candidates"))).toBe(false);

      const result = composition.assembleRealResource({ attemptId, sourcePath, authorization });
      expect(result.bundle.manifest.lifecycleStatus).toBe("CANDIDATE");
      expect(result.bundle.manifest.provenanceReferences[0].sha256).toBe(
        crypto.createHash("sha256").update(fs.readFileSync(sourcePath)).digest("hex")
      );
      expect(fs.existsSync(path.join(result.bundle.candidateRoot, "capability-manifest.json"))).toBe(true);
      expect(fs.existsSync(path.join(result.bundle.candidateRoot, "integrity-manifest.json"))).toBe(true);
      expect(crypto.createHash("sha256").update(fs.readFileSync(result.evidencePath)).digest("hex")).toBe(result.evidenceHash);
      expect(plane.recoveryGet(
        "SELECT active_version_digest FROM capability_active_versions WHERE capability_id = ?",
        [result.bundle.capabilityId]
      )).toBeUndefined();
      expect(plane.recoveryGet(
        "SELECT current_state FROM attempts WHERE attempt_id = ?",
        [attemptId]
      )?.current_state).toBe("RUNNING");
      expect(plane.recoveryGet(
        "SELECT integrity_hash FROM evidence_references WHERE evidence_reference_id = ?",
        [result.evidenceReferenceId]
      )?.integrity_hash).toBe(result.evidenceHash);
    } finally {
      store.close();
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
