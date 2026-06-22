import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createDefaultOwnerReviewDecisionDraftV1, inspectOwnerReviewDecisionDraftV1 } from "../../scripts/lib/owner-review-decision-draft-v1.mjs";

function writeFixture(rootDir: string) {
  const files = new Map<string, string>([
    ["docs/phases/PHASE_53_OWNER_REVIEW_DECISION_DRAFT_V1.md", "# Phase 53 Owner Review Decision Draft v1"],
    [
      "apps/operator-console/src/owner-review-decision-draft.ts",
      [
        "export const ownerReviewDecisionPacket = {",
        "  phase: { label: 'Phase 53 · Owner Review Decision Draft v1' },",
        "  decisionDraftStatus: 'decision-draft-ready',",
        "  decisionSummary: { owner: 'Tyler Wallace' },",
        "  decisionOptions: [",
        "    { id: 'approve-for-planning', label: 'Approve for planning', meaning: 'move to planning candidate', allowedNextState: 'planning_candidate_only', requiresRationale: true, requiresOwnerConfirmation: true, blockedAuthority: ['no task creation'], finalApprovalBoundary: 'draft only' },",
        "    { id: 'needs-changes', label: 'Needs changes', meaning: 'revise first', allowedNextState: 'revision_needed_only', requiresRationale: true, requiresOwnerConfirmation: true, blockedAuthority: ['no auto-revision'], finalApprovalBoundary: 'draft only' },",
        "    { id: 'reject', label: 'Reject', meaning: 'do not proceed', allowedNextState: 'rejected_intent_only', requiresRationale: true, requiresOwnerConfirmation: true, blockedAuthority: ['no deletion'], finalApprovalBoundary: 'draft only' },",
        "    { id: 'hold-for-context', label: 'Hold for more context', meaning: 'more information needed', allowedNextState: 'context_needed_only', requiresRationale: true, requiresOwnerConfirmation: true, blockedAuthority: ['no auto-route'], finalApprovalBoundary: 'draft only' },",
        "  ],",
        "  decisionSignals: ['review item id', 'decision option id', 'owner rationale requirement', 'allowed next state', 'blocked authority', 'source queue', 'decision owner', 'final approval boundary'],",
        "  routing: { suggestedQueue: 'Tyler owner decision draft queue' },",
        "  boundaries: { commandExecutionAllowed: false, finalApprovalAllowed: false },",
        "};",
        "export const ownerReviewDecisionSafetyGates = [",
        "  'Owner review decision drafts only',",
        "  'Tyler remains the decision owner',",
        "  'Draft decisions do not equal final approval',",
        "  'Approve for planning does not create tasks',",
        "  'Needs changes remains review-only',",
        "  'Reject records intent only',",
        "  'Hold for context cannot auto-route',",
        "  'Owner rationale required before future recording',",
        "  'No command execution',",
        "  'No runner connectivity',",
        "  'No backend decision service',",
        "  'No authentication changes',",
        "  'No task creation',",
        "  'No source mutation',",
        "  'No file mutation',",
        "  'No final approval',",
        "  'No auto-approval',",
        "  'No self-approval',",
        "];",
      ].join("\n"),
    ],
    ["scripts/lib/owner-review-decision-draft-v1.mjs", "export const marker = true;"],
    ["scripts/run-owner-review-decision-draft-v1.mjs", "console.log('owner review decision draft');"],
    ["tests/integration/owner-review-decision-draft-v1.test.ts", "// fixture"],
    [
      "apps/operator-console/src/App.tsx",
      [
        "ownerReviewDecisionPacket.decisionSummary.owner",
        "ownerReviewDecisionPacket.decisionOptions.length",
        "ownerReviewDecisionPacket.routing.suggestedQueue",
        "ownerReviewDecisionPacket.boundaries.commandExecutionAllowed",
        "ownerReviewDecisionPacket.boundaries.finalApprovalAllowed",
        "Owner Review Decision Draft",
      ].join("\n"),
    ],
    [
      "package.json",
      JSON.stringify({ scripts: { "phase53:demo": "node scripts/run-owner-review-decision-draft-v1.mjs", "phase53:verify": "npm run phase53:demo" } }),
    ],
  ]);

  for (const [relativePath, content] of files) {
    const fullPath = path.join(rootDir, relativePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, `${content}\n`, "utf8");
  }
}

describe("owner-review-decision-draft-v1", () => {
  it("passes when owner review decisions are draft-only and app-bound", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-owner-decision-cert-"));
    writeFixture(rootDir);

    const result = inspectOwnerReviewDecisionDraftV1(createDefaultOwnerReviewDecisionDraftV1(), { rootDir, writeArtifacts: false });

    expect(result.ok).toBe(true);
    expect(result.ownerReviewDecisionDraftStatus).toBe("ready");
    expect(result.decisionDraftOnly).toBe(true);
    expect(result.commandExecutionAllowed).toBe(false);
    expect(result.taskCreationAllowed).toBe(false);
    expect(result.finalApprovalAllowed).toBe(false);
    expect(result.selfApprovalAllowed).toBe(false);
  });

  it("writes owner review decision draft reports without mutating source", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-owner-decision-report-cert-"));
    writeFixture(rootDir);

    const result = inspectOwnerReviewDecisionDraftV1(createDefaultOwnerReviewDecisionDraftV1(), { rootDir, writeArtifacts: true });

    expect(result.ok).toBe(true);
    expect(fs.existsSync(path.join(rootDir, ".sera-owner-review-decision-draft", "phase53-owner-review-decision-draft-status.json"))).toBe(true);
    expect(fs.existsSync(path.join(rootDir, ".sera-owner-review-decision-draft", "phase53-owner-review-decision-draft-status.md"))).toBe(true);
    expect(fs.existsSync(path.join(rootDir, "apps/operator-console/src/owner-review-decision-draft.ts"))).toBe(true);
  });

  it("blocks unsafe owner decision draft boundaries", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-owner-decision-block-cert-"));
    writeFixture(rootDir);

    const config = createDefaultOwnerReviewDecisionDraftV1();
    config.boundaries.commandExecutionAllowed = true;
    config.boundaries.runnerConnectivityAllowed = true;
    config.boundaries.taskCreationAllowed = true;
    config.boundaries.fileMutationAllowed = true;
    config.boundaries.finalApprovalAllowed = true;
    config.boundaries.autoApprovalAllowed = true;
    config.boundaries.selfApprovalAllowed = true;

    const result = inspectOwnerReviewDecisionDraftV1(config, { rootDir, writeArtifacts: false });

    expect(result.ok).toBe(false);
    expect(result.blockers).toContain("commandExecutionAllowed must remain false");
    expect(result.blockers).toContain("runnerConnectivityAllowed must remain false");
    expect(result.blockers).toContain("taskCreationAllowed must remain false");
    expect(result.blockers).toContain("fileMutationAllowed must remain false");
    expect(result.blockers).toContain("finalApprovalAllowed must remain false");
    expect(result.blockers).toContain("autoApprovalAllowed must remain false");
    expect(result.blockers).toContain("selfApprovalAllowed must remain false");
  });

  it("blocks unsafe declared paths", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-owner-decision-path-cert-"));
    writeFixture(rootDir);

    const config = createDefaultOwnerReviewDecisionDraftV1();
    config.declaredPaths.push("../outside.md");

    const result = inspectOwnerReviewDecisionDraftV1(config, { rootDir, writeArtifacts: false });

    expect(result.ok).toBe(false);
    expect(result.blockers).toContain("Declared path must be safe and relative: ../outside.md");
  });
});
