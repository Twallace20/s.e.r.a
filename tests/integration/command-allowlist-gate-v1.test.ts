import { describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  createDefaultCommandAllowlistGateV1,
  inspectCommandAllowlistGateV1,
} from "../../scripts/lib/command-allowlist-gate-v1.mjs";

function createTempRoot() {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-phase38-"));
  for (const declaredPath of createDefaultCommandAllowlistGateV1().declaredPaths) {
    const fullPath = path.join(rootDir, declaredPath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, "phase38 fixture\n", "utf8");
  }
  return rootDir;
}

describe("Phase 38 Command Allowlist Gate v1", () => {
  it("passes the default Phase 38 command allowlist gate", () => {
    const rootDir = createTempRoot();
    const result = inspectCommandAllowlistGateV1(createDefaultCommandAllowlistGateV1(), { rootDir });

    expect(result.ok).toBe(true);
    expect(result.status).toBe("passed");
    expect(result.allowlistStatus).toBe("ready");
    expect(result.validationFailedCount).toBe(0);
    expect(result.blockers).toEqual([]);
    expect(result.declaredFileCount).toBe(4);
    expect(result.validationCommandCount).toBe(7);
    expect(result.allowlistCommandCount).toBeGreaterThanOrEqual(9);
    expect(result.approvedCommandCount).toBe(result.allowlistCommandCount);
    expect(result.rejectedCommandCount).toBe(0);
    expect(result.evidenceRequirementCount).toBeGreaterThanOrEqual(12);
    expect(result.riskCheckCount).toBeGreaterThanOrEqual(12);
    expect(result.ownerApprovalGateCount).toBeGreaterThanOrEqual(6);
  });

  it("writes local allowlist reports while keeping execution disabled", () => {
    const rootDir = createTempRoot();
    const result = inspectCommandAllowlistGateV1(createDefaultCommandAllowlistGateV1(), { rootDir });

    expect(fs.existsSync(result.jsonPath)).toBe(true);
    expect(fs.existsSync(result.markdownPath)).toBe(true);
    expect(fs.existsSync(result.historyPath)).toBe(true);
    expect(result.localOnly).toBe(true);
    expect(result.allowlistOnly).toBe(true);
    expect(result.commandAllowlistGateOnly).toBe(true);
    expect(result.exactMatchOnly).toBe(true);
    expect(result.commandExecutionAllowed).toBe(false);
    expect(result.arbitraryCommandExecutionAllowed).toBe(false);
    expect(result.shellExpansionAllowed).toBe(false);
    expect(result.shellChainingAllowed).toBe(false);
    expect(result.remoteExecutionAllowed).toBe(false);
    expect(result.usesSelfHostedRunner).toBe(false);
    expect(result.requiresSecrets).toBe(false);
  });

  it("blocks unsafe shell, VCS, network, interpreter, and chained commands", () => {
    const rootDir = createTempRoot();
    const gate = {
      ...createDefaultCommandAllowlistGateV1(),
      allowedExactCommands: [
        ...createDefaultCommandAllowlistGateV1().allowedExactCommands,
        "git push origin main",
        "node -e console.log(1)",
        "npm run build && npm test",
        "curl https://example.com",
      ],
      commandAllowlist: [
        ...createDefaultCommandAllowlistGateV1().commandAllowlist,
        "git push origin main",
        "node -e console.log(1)",
        "npm run build && npm test",
        "curl https://example.com",
      ],
    };
    const result = inspectCommandAllowlistGateV1(gate, { rootDir });

    expect(result.ok).toBe(false);
    expect(result.status).toBe("blocked");
    expect(result.allowlistStatus).toBe("blocked");
    expect(result.rejectedCommandCount).toBeGreaterThanOrEqual(4);
    expect(result.blockers.join(" ")).toContain("direct shell, network, script, or VCS commands");
    expect(result.blockers.join(" ")).toContain("shell control characters are not allowed");
  });

  it("blocks gates missing required lineage or safety bindings", () => {
    const rootDir = createTempRoot();
    const gate = {
      ...createDefaultCommandAllowlistGateV1(),
      sourcePhaseIds: ["phase-35-remote-phase-runner-blueprint-v1", "phase-36-owner-approval-queue-v1"],
      commandExecutionAllowed: true,
      arbitraryCommandExecutionAllowed: true,
      shellExpansionAllowed: true,
      shellChainingAllowed: true,
      commandAllowlistRequired: false,
      approvalQueueBindingRequired: false,
      evidenceCaptureRequired: false,
    };
    const result = inspectCommandAllowlistGateV1(gate, { rootDir });

    expect(result.ok).toBe(false);
    expect(result.blockers.join(" ")).toContain("Phase 37 self-hosted runner adapter lineage");
    expect(result.blockers.join(" ")).toContain("commandExecutionAllowed must remain false");
    expect(result.blockers.join(" ")).toContain("arbitraryCommandExecutionAllowed must remain false");
    expect(result.blockers.join(" ")).toContain("commandAllowlistRequired must remain true");
    expect(result.blockers.join(" ")).toContain("approvalQueueBindingRequired must remain true");
  });

  it("blocks incomplete validation command sets and unsafe paths", () => {
    const rootDir = createTempRoot();
    const gate = {
      ...createDefaultCommandAllowlistGateV1(),
      declaredPaths: [
        ...createDefaultCommandAllowlistGateV1().declaredPaths,
        "../outside.txt",
      ],
      validationCommands: ["npm run phase38:demo"],
    };
    const result = inspectCommandAllowlistGateV1(gate, { rootDir });

    expect(result.ok).toBe(false);
    expect(result.validationFailedCount).toBeGreaterThan(0);
    expect(result.blockers.join(" ")).toContain("safe and relative");
    expect(result.blockers.join(" ")).toContain("npm run verify");
  });
});
