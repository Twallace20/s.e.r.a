import { describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  createDefaultEvidenceCaptureBundleV1,
  inspectEvidenceCaptureBundleV1,
} from "../../scripts/lib/evidence-capture-bundle-v1.mjs";

function createTempRoot() {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-phase39-"));
  for (const declaredPath of createDefaultEvidenceCaptureBundleV1().declaredPaths) {
    const fullPath = path.join(rootDir, declaredPath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, "phase39 fixture\n", "utf8");
  }
  return rootDir;
}

describe("Phase 39 Evidence Capture Bundle v1", () => {
  it("passes the default Phase 39 evidence capture bundle", () => {
    const rootDir = createTempRoot();
    const result = inspectEvidenceCaptureBundleV1(createDefaultEvidenceCaptureBundleV1(), { rootDir });

    expect(result.ok).toBe(true);
    expect(result.status).toBe("passed");
    expect(result.evidenceBundleStatus).toBe("ready");
    expect(result.validationFailedCount).toBe(0);
    expect(result.blockers).toEqual([]);
    expect(result.declaredFileCount).toBe(4);
    expect(result.validationCommandCount).toBe(7);
    expect(result.evidenceItemCount).toBeGreaterThanOrEqual(16);
    expect(result.acceptedEvidenceItemCount).toBe(result.evidenceItemCount);
    expect(result.rejectedEvidenceItemCount).toBe(0);
    expect(result.evidenceRequirementCount).toBeGreaterThanOrEqual(12);
    expect(result.riskCheckCount).toBeGreaterThanOrEqual(12);
    expect(result.ownerApprovalGateCount).toBeGreaterThanOrEqual(6);
  });

  it("writes local evidence reports while keeping execution disabled", () => {
    const rootDir = createTempRoot();
    const result = inspectEvidenceCaptureBundleV1(createDefaultEvidenceCaptureBundleV1(), { rootDir });

    expect(fs.existsSync(result.jsonPath)).toBe(true);
    expect(fs.existsSync(result.markdownPath)).toBe(true);
    expect(fs.existsSync(result.historyPath)).toBe(true);
    expect(result.localOnly).toBe(true);
    expect(result.bundleOnly).toBe(true);
    expect(result.evidenceCaptureBundleOnly).toBe(true);
    expect(result.evidenceCaptureOnly).toBe(true);
    expect(result.evidenceItemRedactionRequired).toBe(true);
    expect(result.commandExecutionAllowed).toBe(false);
    expect(result.remoteExecutionAllowed).toBe(false);
    expect(result.runnerConnectivityAllowed).toBe(false);
    expect(result.usesSelfHostedRunner).toBe(false);
    expect(result.requiresSecrets).toBe(false);
  });

  it("blocks evidence items that allow execution, mutation, remote execution, or secret storage", () => {
    const rootDir = createTempRoot();
    const gate = createDefaultEvidenceCaptureBundleV1();
    const bundle = {
      ...gate,
      evidenceItems: [
        ...gate.evidenceItems,
        {
          id: "unsafe-evidence-item",
          label: "Unsafe evidence item",
          required: true,
          ownerReviewRequired: true,
          commandExecutionAllowed: true,
          sourceMutationAllowed: true,
          remoteExecutionAllowed: true,
          storesSecrets: true,
          redactionRequired: false,
        },
      ],
    };
    const result = inspectEvidenceCaptureBundleV1(bundle, { rootDir });

    expect(result.ok).toBe(false);
    expect(result.status).toBe("blocked");
    expect(result.evidenceBundleStatus).toBe("blocked");
    expect(result.rejectedEvidenceItemCount).toBeGreaterThanOrEqual(1);
    expect(result.blockers.join(" ")).toContain("must not allow command execution");
    expect(result.blockers.join(" ")).toContain("must not store secrets");
    expect(result.blockers.join(" ")).toContain("Redaction review must be required");
  });

  it("blocks bundles missing required lineage or safety bindings", () => {
    const rootDir = createTempRoot();
    const bundle = {
      ...createDefaultEvidenceCaptureBundleV1(),
      sourcePhaseIds: [
        "phase-35-remote-phase-runner-blueprint-v1",
        "phase-36-owner-approval-queue-v1",
        "phase-37-self-hosted-runner-adapter-v1",
      ],
      commandExecutionAllowed: true,
      remoteExecutionAllowed: true,
      evidenceCaptureRequired: false,
      commandAllowlistRequired: false,
      approvalQueueBindingRequired: false,
      acceptsEvidenceAsOwnerApproved: true,
    };
    const result = inspectEvidenceCaptureBundleV1(bundle, { rootDir });

    expect(result.ok).toBe(false);
    expect(result.blockers.join(" ")).toContain("Phase 38 command allowlist gate lineage");
    expect(result.blockers.join(" ")).toContain("commandExecutionAllowed must remain false");
    expect(result.blockers.join(" ")).toContain("remoteExecutionAllowed must remain false");
    expect(result.blockers.join(" ")).toContain("evidenceCaptureRequired must remain true");
    expect(result.blockers.join(" ")).toContain("acceptsEvidenceAsOwnerApproved must remain false");
  });

  it("blocks incomplete validation command sets and unsafe paths", () => {
    const rootDir = createTempRoot();
    const bundle = {
      ...createDefaultEvidenceCaptureBundleV1(),
      declaredPaths: [
        ...createDefaultEvidenceCaptureBundleV1().declaredPaths,
        "../outside.txt",
      ],
      validationCommands: ["npm run phase39:demo"],
    };
    const result = inspectEvidenceCaptureBundleV1(bundle, { rootDir });

    expect(result.ok).toBe(false);
    expect(result.validationFailedCount).toBeGreaterThan(0);
    expect(result.blockers.join(" ")).toContain("safe and relative");
    expect(result.blockers.join(" ")).toContain("npm run verify");
  });
});
