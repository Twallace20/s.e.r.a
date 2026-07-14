import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ControlPlane, ControlPlaneAttemptSpec, refreshControlPlaneRepositoryBaseline } from "@sera/control-plane";
import { runRepositorySnapshot } from "@sera/repository-snapshot";
import { runRepositoryTruth } from "@sera/repository-truth";

function fixture(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "sera-control-plane-test-"));
  fs.mkdirSync(path.join(root, "packages", "alpha", "src"), { recursive: true });
  fs.mkdirSync(path.join(root, "architecture"), { recursive: true });
  fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ name: "cp-test", private: true, workspaces: ["packages/*"] }, null, 2), "utf8");
  fs.writeFileSync(path.join(root, "tsconfig.json"), JSON.stringify({ files: [], references: [{ path: "packages/alpha" }] }, null, 2), "utf8");
  fs.writeFileSync(path.join(root, "packages", "alpha", "package.json"), JSON.stringify({ name: "@sera/alpha", private: true }, null, 2), "utf8");
  fs.writeFileSync(path.join(root, "packages", "alpha", "src", "index.ts"), "export const alpha = true;\n", "utf8");
  fs.writeFileSync(path.join(root, "architecture", "capability-inventory.json"), JSON.stringify({
    schemaVersion: "sera.capability-inventory.v1",
    targetSubsystems: [{ id: "runtime-control-plane", targetLayer: "Runtime", currentMaturity: "implemented", status: "certification-pending", dependencies: ["repository-snapshot", "repository-truth"] }]
  }, null, 2), "utf8");
  return root;
}

function baseline(root: string): void {
  const clock = { now: () => new Date("2026-07-14T14:00:00.000Z") };
  const snapshot = runRepositorySnapshot({ repositoryRoot: root, clock });
  expect(snapshot.ok).toBe(true);
  const truth = runRepositoryTruth({ repositoryRoot: root, refreshSnapshot: true, clock });
  expect(truth.ok).toBe(true);
}

function successSpec(): ControlPlaneAttemptSpec {
  return {
    title: "Test success",
    stages: [
      { id: "emit", executionMode: "emit-evidence", evidence: [{ id: "emitted", required: true }], input: { evidenceId: "emitted", value: { ok: true } } },
      { id: "file", executionMode: "validate-file", dependsOn: ["emit"], evidence: [{ id: "source-file", required: true }], input: { evidenceId: "source-file", relativePath: "packages/alpha/src/index.ts" } }
    ],
    gates: [
      { id: "snapshot", gateType: "precondition", evaluationTiming: "before", passCriteria: { kind: "snapshot-valid" } },
      { id: "truth", gateType: "precondition", evaluationTiming: "before", passCriteria: { kind: "truth-valid", blockSeverities: ["critical"] } },
      { id: "evidence", gateType: "verification", passCriteria: { kind: "evidence-valid", evidenceIds: ["emitted", "source-file"] } }
    ],
    requiredEvidence: [{ id: "emitted" }, { id: "source-file" }]
  };
}

describe("Unified Control Plane v1", () => {
  it("writes the required artifact trail with portable paths and baseline identity", () => {
    const root = fixture();
    baseline(root);
    const result = new ControlPlane({ repositoryRoot: root, clock: { now: () => new Date("2026-07-14T14:05:00.000Z") } }).run(successSpec());
    expect(result.ok).toBe(true);
    expect(result.terminalDecision).toBe("COMPLETE");
    const attemptRoot = path.join(root, result.attemptPath!);
    for (const file of ["attempt.json", "specification.json", "stage-results.json", "evidence-index.json", "gate-results.json", "terminal-decision.json", "closeout.json", "events.jsonl", "final-report.md"]) {
      expect(fs.existsSync(path.join(attemptRoot, file))).toBe(true);
    }
    const attempt = JSON.parse(fs.readFileSync(path.join(attemptRoot, "attempt.json"), "utf8"));
    expect(attempt.schemaVersion).toBe("sera.control-plane.v1");
    expect(attempt.sourceSnapshotId).toMatch(/^snapshot_/);
    expect(attempt.sourceTruthId).toMatch(/^truth_/);
    expect(JSON.stringify(attempt)).not.toContain(root);
  });

  it("inspects active state and known stage and gate surfaces", () => {
    const root = fixture();
    baseline(root);
    const cp = new ControlPlane({ repositoryRoot: root });
    cp.run(successSpec());
    const inspect = cp.inspect();
    expect(inspect.ok).toBe(true);
    expect((inspect.summary as any).stageTypes).toContain("emit-evidence");
    expect((inspect.summary as any).gateTypes).toContain("owner-approval");
    expect((inspect.summary as any).modelUse).toBe(false);
    expect((inspect.summary as any).networkUse).toBe(false);
  });

  it("blocks precondition gates when Snapshot and Truth are missing", () => {
    const root = fixture();
    const result = new ControlPlane({ repositoryRoot: root }).run(successSpec());
    expect(result.ok).toBe(false);
    expect(result.status).toBe("BLOCKED");
    expect(result.terminalDecision).toBe("BLOCK");
  });

  it("fails required stages and skips dependent stages", () => {
    const root = fixture();
    baseline(root);
    const result = new ControlPlane({ repositoryRoot: root }).run({
      title: "Failure",
      stages: [
        { id: "fail", executionMode: "fail", input: { message: "expected failure" } },
        { id: "dependent", executionMode: "emit-evidence", dependsOn: ["fail"], evidence: [{ id: "never" }] }
      ]
    });
    expect(result.ok).toBe(false);
    expect(result.terminalDecision).toBe("FAIL");
    const stages = JSON.parse(fs.readFileSync(path.join(root, result.attemptPath!, "stage-results.json"), "utf8")).stages;
    expect(stages.find((stage: any) => stage.stageId === "dependent").status).toBe("SKIPPED");
  });

  it("allows explicit safe-after-failure finalization stages", () => {
    const root = fixture();
    baseline(root);
    const result = new ControlPlane({ repositoryRoot: root }).run({
      title: "Safe finalization",
      stages: [
        { id: "fail", executionMode: "fail" },
        { id: "finalize", executionMode: "emit-evidence", dependsOn: ["fail"], safeAfterFailure: true, evidence: [{ id: "finalized" }], input: { evidenceId: "finalized" } }
      ]
    });
    const stages = JSON.parse(fs.readFileSync(path.join(root, result.attemptPath!, "stage-results.json"), "utf8")).stages;
    expect(stages.find((stage: any) => stage.stageId === "finalize").status).toBe("COMPLETED");
    expect(result.terminalDecision).toBe("FAIL");
  });

  it("creates rich blocked handoff records", () => {
    const root = fixture();
    baseline(root);
    const result = new ControlPlane({ repositoryRoot: root }).run({ title: "Blocked", stages: [{ id: "block", executionMode: "block", input: { message: "needs approval" } }] });
    const attempt = JSON.parse(fs.readFileSync(path.join(root, result.attemptPath!, "attempt.json"), "utf8"));
    expect(result.status).toBe("BLOCKED");
    expect(attempt.blockedHandoff.requiredDecision).toContain("Owner");
    expect(attempt.blockedHandoff.safeResumePolicy).toContain("Snapshot then Truth");
  });

  it("treats warnings as completed with warnings", () => {
    const root = fixture();
    baseline(root);
    const result = new ControlPlane({ repositoryRoot: root }).run({ title: "Warning", stages: [{ id: "warn", executionMode: "warning", input: { message: "watch this" } }] });
    expect(result.status).toBe("COMPLETED_WITH_WARNINGS");
    expect(result.terminalDecision).toBe("COMPLETE_WITH_WARNINGS");
  });

  it("validates required evidence and rejects missing evidence completion", () => {
    const root = fixture();
    baseline(root);
    const result = new ControlPlane({ repositoryRoot: root }).run({ title: "Missing evidence", stages: [{ id: "noop", executionMode: "noop" }], requiredEvidence: [{ id: "missing" }] });
    expect(result.ok).toBe(false);
    expect(result.terminalDecision).toBe("FAIL");
  });

  it("checks evidence hashes during verification", () => {
    const root = fixture();
    baseline(root);
    const cp = new ControlPlane({ repositoryRoot: root });
    const result = cp.run(successSpec());
    expect(cp.verify(result.attemptId!).ok).toBe(true);
    const evidencePath = path.join(root, result.attemptPath!, "evidence", "emitted.json");
    fs.writeFileSync(evidencePath, "tampered\n", "utf8");
    expect(cp.verify(result.attemptId!).ok).toBe(false);
  });

  it("keeps closeout separate and disables merge and promotion", () => {
    const root = fixture();
    baseline(root);
    const cp = new ControlPlane({ repositoryRoot: root });
    const result = cp.run(successSpec());
    const closeout = cp.closeout(result.attemptId!);
    expect(closeout.ok).toBe(true);
    const record = (closeout.summary as any).closeout;
    expect(record.mergeAllowed).toBe(false);
    expect(record.promotionAllowed).toBe(false);
  });

  it("blocks closeout for blocked attempts", () => {
    const root = fixture();
    baseline(root);
    const cp = new ControlPlane({ repositoryRoot: root });
    const result = cp.run({ title: "Blocked", stages: [{ id: "block", executionMode: "block" }] });
    const closeout = cp.closeout(result.attemptId!);
    expect(closeout.ok).toBe(false);
    expect(closeout.status).toBe("CLOSEOUT_BLOCKED");
  });

  it("normalizes stderr and exit code as evidence rather than sole authority", () => {
    const root = fixture();
    baseline(root);
    const result = new ControlPlane({ repositoryRoot: root }).run({ title: "stderr evidence", stages: [{ id: "stderr", executionMode: "noop", input: { stderr: "text", exitCode: 42 } }] });
    expect(result.ok).toBe(true);
    const stages = JSON.parse(fs.readFileSync(path.join(root, result.attemptPath!, "stage-results.json"), "utf8")).stages;
    expect(stages[0].normalizedOutcome.stderrPresent).toBe(true);
    expect(stages[0].normalizedOutcome.exitCode).toBe(42);
    expect(stages[0].normalizedOutcome.objectiveSuccess).toBe(true);
  });

  it("blocks invalid specs with cycles and forbidden closeout merge policy", () => {
    const root = fixture();
    const cp = new ControlPlane({ repositoryRoot: root });
    const cyclic = cp.run({ title: "Cycle", stages: [{ id: "a", executionMode: "noop", dependsOn: ["b"] }, { id: "b", executionMode: "noop", dependsOn: ["a"] }] });
    const merge = cp.run({ title: "Merge", stages: [{ id: "a", executionMode: "noop" }], closeoutPolicy: { mergeAllowed: true } });
    expect(cyclic.status).toBe("BLOCKED");
    expect(merge.status).toBe("BLOCKED");
  });

  it("preserves previous current state after simulated staging failure", () => {
    const root = fixture();
    baseline(root);
    const cp = new ControlPlane({ repositoryRoot: root });
    const first = cp.run(successSpec());
    const before = fs.readFileSync(path.join(root, ".sera", "control-plane", "current.json"), "utf8");
    const failed = new ControlPlane({ repositoryRoot: root, simulateFailureAfterStaging: true }).run({ title: "Staging failure", stages: [{ id: "emit", executionMode: "emit-evidence", input: { evidenceId: "e" } }] });
    const after = fs.readFileSync(path.join(root, ".sera", "control-plane", "current.json"), "utf8");
    expect(first.ok).toBe(true);
    expect(failed.ok).toBe(false);
    expect(after).toBe(before);
  });

  it("exposes a helper that refreshes Snapshot then Truth sequentially", () => {
    const root = fixture();
    const result = refreshControlPlaneRepositoryBaseline({ repositoryRoot: root, clock: { now: () => new Date("2026-07-14T15:00:00.000Z") } });
    expect(result.ok).toBe(true);
    expect(result.snapshotId).toMatch(/^snapshot_/);
    expect(result.truthId).toMatch(/^truth_/);
  });
});
