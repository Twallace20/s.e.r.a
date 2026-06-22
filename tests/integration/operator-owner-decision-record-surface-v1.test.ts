import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createDefaultOperatorOwnerDecisionRecordSurfaceV1, inspectOperatorOwnerDecisionRecordSurfaceV1 } from "../../scripts/lib/operator-owner-decision-record-surface-v1.mjs";

function writeFixture(rootDir: string) {
  const files = new Map<string, string>([
    ["docs/phases/PHASE_54_OPERATOR_OWNER_DECISION_RECORD_SURFACE_V1.md", "# Phase 54 Operator Owner Decision Record Surface v1"],
    [
      "apps/operator-console/src/owner-decision-record-surface.ts",
      [
        "export const ownerDecisionRecordSurfacePacket = {",
        "  phase: { label: 'Phase 54 · Operator Owner Decision Record Surface v1' },",
        "  recordSurfaceStatus: 'record-surface-ready',",
        "  recordSummary: { owner: 'Tyler Wallace' },",
        "  selectedDecision: { decisionOptionId: 'approve-for-planning', sourceReviewItemId: 'review-phase-build-plan' },",
        "  recordDraft: { recordId: 'record-preview-phase-build-plan', owner: 'Tyler Wallace', rationaleStatus: 'placeholder_only', timestampStatus: 'not_persisted', recordAuthority: 'display_only', finalApprovalBoundary: 'recorded decision is not execution approval' },",
        "  recordActions: [",
        "    { id: 'record-approve-for-planning', label: 'Record approve for planning preview' },",
        "    { id: 'record-needs-changes', label: 'Record needs changes preview' },",
        "    { id: 'record-reject', label: 'Record reject preview' },",
        "    { id: 'record-hold-for-context', label: 'Record hold for context preview' },",
        "  ],",
        "  recordFields: ['recordId', 'owner', 'decisionOptionId', 'sourceReviewItemId', 'rationaleStatus', 'timestampStatus', 'recordAuthority', 'finalApprovalBoundary'],",
        "  recordSignals: ['source decision draft', 'selected decision option', 'owner rationale', 'record id', 'decision timestamp', 'evidence references', 'persistence boundary', 'execution approval boundary'],",
        "  routing: { suggestedQueue: 'Tyler owner decision record review' },",
        "  boundaries: { commandExecutionAllowed: false, recordPersistenceAllowed: false },",
        "};",
        "export const ownerDecisionRecordSurfaceSafetyGates = [",
        "  'Owner decision record surface only',",
        "  'Tyler remains the record owner',",
        "  'Record preview does not persist a decision',",
        "  'Recorded intent does not equal execution approval',",
        "  'Approve for planning remains non-executable',",
        "  'Needs changes remains review-only',",
        "  'Reject does not delete artifacts',",
        "  'Hold for context cannot auto-route',",
        "  'Owner rationale required before future persistence',",
        "  'No command execution',",
        "  'No runner connectivity',",
        "  'No backend record service',",
        "  'No authentication changes',",
        "  'No record persistence',",
        "  'No task creation',",
        "  'No source mutation',",
        "  'No file mutation',",
        "  'No final approval',",
        "  'No auto-approval',",
        "  'No self-approval',",
        "];",
      ].join("\n"),
    ],
    ["scripts/lib/operator-owner-decision-record-surface-v1.mjs", "export const marker = true;"],
    ["scripts/run-operator-owner-decision-record-surface-v1.mjs", "console.log('owner decision record surface');"],
    ["tests/integration/operator-owner-decision-record-surface-v1.test.ts", "// fixture"],
    [
      "apps/operator-console/src/App.tsx",
      [
        "ownerDecisionRecordSurfacePacket.recordSummary.owner",
        "ownerDecisionRecordSurfacePacket.recordActions.length",
        "ownerDecisionRecordSurfacePacket.routing.suggestedQueue",
        "ownerDecisionRecordSurfacePacket.boundaries.commandExecutionAllowed",
        "ownerDecisionRecordSurfacePacket.boundaries.recordPersistenceAllowed",
        "Owner Decision Record Surface",
      ].join("\n"),
    ],
    [
      "package.json",
      JSON.stringify({ scripts: { "phase54:demo": "node scripts/run-operator-owner-decision-record-surface-v1.mjs", "phase54:verify": "npm run phase54:demo" } }),
    ],
  ]);

  for (const [relativePath, content] of files) {
    const fullPath = path.join(rootDir, relativePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, `${content}\n`, "utf8");
  }
}

describe("operator-owner-decision-record-surface-v1", () => {
  it("passes when owner decision record surface is preview-only and app-bound", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-owner-record-surface-cert-"));
    writeFixture(rootDir);

    const result = inspectOperatorOwnerDecisionRecordSurfaceV1(createDefaultOperatorOwnerDecisionRecordSurfaceV1(), { rootDir, writeArtifacts: false });

    expect(result.ok).toBe(true);
    expect(result.ownerDecisionRecordSurfaceStatus).toBe("ready");
    expect(result.recordSurfaceOnly).toBe(true);
    expect(result.commandExecutionAllowed).toBe(false);
    expect(result.recordPersistenceAllowed).toBe(false);
    expect(result.taskCreationAllowed).toBe(false);
    expect(result.finalApprovalAllowed).toBe(false);
    expect(result.selfApprovalAllowed).toBe(false);
  });

  it("writes owner decision record surface reports without mutating source", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-owner-record-surface-report-cert-"));
    writeFixture(rootDir);

    const result = inspectOperatorOwnerDecisionRecordSurfaceV1(createDefaultOperatorOwnerDecisionRecordSurfaceV1(), { rootDir, writeArtifacts: true });

    expect(result.ok).toBe(true);
    expect(fs.existsSync(path.join(rootDir, ".sera-owner-decision-record-surface", "phase54-owner-decision-record-surface-status.json"))).toBe(true);
    expect(fs.existsSync(path.join(rootDir, ".sera-owner-decision-record-surface", "phase54-owner-decision-record-surface-status.md"))).toBe(true);
    expect(fs.existsSync(path.join(rootDir, "apps/operator-console/src/owner-decision-record-surface.ts"))).toBe(true);
  });

  it("blocks unsafe owner decision record surface boundaries", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-owner-record-surface-block-cert-"));
    writeFixture(rootDir);

    const config = createDefaultOperatorOwnerDecisionRecordSurfaceV1();
    config.boundaries.commandExecutionAllowed = true;
    config.boundaries.runnerConnectivityAllowed = true;
    config.boundaries.recordPersistenceAllowed = true;
    config.boundaries.taskCreationAllowed = true;
    config.boundaries.fileMutationAllowed = true;
    config.boundaries.finalApprovalAllowed = true;
    config.boundaries.autoApprovalAllowed = true;
    config.boundaries.selfApprovalAllowed = true;

    const result = inspectOperatorOwnerDecisionRecordSurfaceV1(config, { rootDir, writeArtifacts: false });

    expect(result.ok).toBe(false);
    expect(result.blockers).toContain("commandExecutionAllowed must remain false");
    expect(result.blockers).toContain("runnerConnectivityAllowed must remain false");
    expect(result.blockers).toContain("recordPersistenceAllowed must remain false");
    expect(result.blockers).toContain("taskCreationAllowed must remain false");
    expect(result.blockers).toContain("fileMutationAllowed must remain false");
    expect(result.blockers).toContain("finalApprovalAllowed must remain false");
    expect(result.blockers).toContain("autoApprovalAllowed must remain false");
    expect(result.blockers).toContain("selfApprovalAllowed must remain false");
  });

  it("blocks unsafe declared paths", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-owner-record-surface-path-cert-"));
    writeFixture(rootDir);

    const config = createDefaultOperatorOwnerDecisionRecordSurfaceV1();
    config.declaredPaths.push("../outside.md");

    const result = inspectOperatorOwnerDecisionRecordSurfaceV1(config, { rootDir, writeArtifacts: false });

    expect(result.ok).toBe(false);
    expect(result.blockers).toContain("Declared path must be safe and relative: ../outside.md");
  });
});
