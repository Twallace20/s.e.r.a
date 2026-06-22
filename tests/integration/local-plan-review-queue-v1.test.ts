import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createDefaultLocalPlanReviewQueueV1, inspectLocalPlanReviewQueueV1 } from "../../scripts/lib/local-plan-review-queue-v1.mjs";

function writeFixture(rootDir: string) {
  const files = new Map<string, string>([
    ["docs/phases/PHASE_52_LOCAL_PLAN_REVIEW_QUEUE_V1.md", "# Phase 52 Local Plan Review Queue v1"],
    [
      "apps/operator-console/src/plan-review-queue.ts",
      [
        "export const planReviewQueuePacket = {",
        "  phase: { label: 'Phase 52 · Local Plan Review Queue v1' },",
        "  planReviewQueueStatus: 'review-queue-ready',",
        "  queueSummary: { queueName: 'Tyler local plan review queue' },",
        "  reviewItems: [",
        "    { id: 'review-phase-build-plan', title: 'Review phase build plan preview', status: 'pending_owner_review', priority: 'high', workflow: 'Phase Build', reviewGate: 'Tyler confirms scope before task creation', ownerDecisionState: 'pending', allowedNextAction: 'review_only' },",
        "    { id: 'review-file-context-plan', title: 'Review metadata-only file context', status: 'pending_owner_review', priority: 'standard', workflow: 'File Review', reviewGate: 'Tyler confirms file context before processing', ownerDecisionState: 'pending', allowedNextAction: 'review_only' },",
        "    { id: 'review-validation-plan', title: 'Review validation plan preview', status: 'approved_preview_only', priority: 'standard', workflow: 'Validation Review', reviewGate: 'Tyler confirms validation expectations before any worker handoff', ownerDecisionState: 'preview accepted, not executable', allowedNextAction: 'prepare_review_notes_only' },",
        "    { id: 'review-evidence-plan', title: 'Review evidence requirements', status: 'pending_owner_review', priority: 'standard', workflow: 'Evidence Packet', reviewGate: 'Tyler confirms evidence requirements before task queue conversion', ownerDecisionState: 'pending', allowedNextAction: 'review_only' },",
        "  ],",
        "  routing: { suggestedQueue: 'Tyler local plan review queue' },",
        "  boundaries: { commandExecutionAllowed: false },",
        "};",
        "export const planReviewQueueSafetyGates = [",
        "  'Local plan review queue only',",
        "  'Plans remain preview-only',",
        "  'Owner decision required before task creation',",
        "  'Owner decision required before execution',",
        "  'Review queue cannot record final approval',",
        "  'No command execution',",
        "  'No runner connectivity',",
        "  'No backend workflow service',",
        "  'No authentication changes',",
        "  'No source mutation',",
        "  'No file mutation',",
        "  'No auto-approval',",
        "  'No auto-processing',",
        "  'No auto-routing',",
        "  'No auto-merge',",
        "  'No self-approval',",
        "];",
        "export const planReviewQueueSignals = ['composed plan id', 'source request', 'source file metadata', 'workflow selection', 'review status', 'owner decision state', 'evidence references', 'allowed next action'];",
      ].join("\n"),
    ],
    ["scripts/lib/local-plan-review-queue-v1.mjs", "export const marker = true;"],
    ["scripts/run-local-plan-review-queue-v1.mjs", "console.log('local plan review queue');"],
    ["tests/integration/local-plan-review-queue-v1.test.ts", "// fixture"],
    [
      "apps/operator-console/src/App.tsx",
      [
        "planReviewQueuePacket.queueSummary.queueName",
        "planReviewQueuePacket.reviewItems.length",
        "planReviewQueuePacket.routing.suggestedQueue",
        "planReviewQueuePacket.boundaries.commandExecutionAllowed",
        "Local Plan Review Queue",
      ].join("\n"),
    ],
    [
      "package.json",
      JSON.stringify({ scripts: { "phase52:demo": "node scripts/run-local-plan-review-queue-v1.mjs", "phase52:verify": "npm run phase52:demo" } }),
    ],
  ]);

  for (const [relativePath, content] of files) {
    const fullPath = path.join(rootDir, relativePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, `${content}\n`, "utf8");
  }
}

describe("local-plan-review-queue-v1", () => {
  it("passes when local plan review queue is review-only and app-bound", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-plan-review-queue-cert-"));
    writeFixture(rootDir);

    const result = inspectLocalPlanReviewQueueV1(createDefaultLocalPlanReviewQueueV1(), { rootDir, writeArtifacts: false });

    expect(result.ok).toBe(true);
    expect(result.planReviewQueueStatus).toBe("ready");
    expect(result.reviewQueueOnly).toBe(true);
    expect(result.planIntakeOnly).toBe(true);
    expect(result.commandExecutionAllowed).toBe(false);
    expect(result.autoApprovalAllowed).toBe(false);
    expect(result.selfApprovalAllowed).toBe(false);
  });

  it("writes local plan review queue reports without mutating source", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-plan-review-queue-report-cert-"));
    writeFixture(rootDir);

    const result = inspectLocalPlanReviewQueueV1(createDefaultLocalPlanReviewQueueV1(), { rootDir, writeArtifacts: true });

    expect(result.ok).toBe(true);
    expect(fs.existsSync(path.join(rootDir, ".sera-plan-review-queue", "phase52-local-plan-review-queue-status.json"))).toBe(true);
    expect(fs.existsSync(path.join(rootDir, ".sera-plan-review-queue", "phase52-local-plan-review-queue-status.md"))).toBe(true);
    expect(fs.existsSync(path.join(rootDir, "apps/operator-console/src/plan-review-queue.ts"))).toBe(true);
  });

  it("blocks unsafe local plan review queue boundaries", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-plan-review-queue-block-cert-"));
    writeFixture(rootDir);

    const config = createDefaultLocalPlanReviewQueueV1();
    config.boundaries.commandExecutionAllowed = true;
    config.boundaries.runnerConnectivityAllowed = true;
    config.boundaries.fileMutationAllowed = true;
    config.boundaries.autoApprovalAllowed = true;
    config.boundaries.autoProcessingAllowed = true;
    config.boundaries.selfApprovalAllowed = true;

    const result = inspectLocalPlanReviewQueueV1(config, { rootDir, writeArtifacts: false });

    expect(result.ok).toBe(false);
    expect(result.blockers).toContain("commandExecutionAllowed must remain false");
    expect(result.blockers).toContain("runnerConnectivityAllowed must remain false");
    expect(result.blockers).toContain("fileMutationAllowed must remain false");
    expect(result.blockers).toContain("autoApprovalAllowed must remain false");
    expect(result.blockers).toContain("autoProcessingAllowed must remain false");
    expect(result.blockers).toContain("selfApprovalAllowed must remain false");
  });

  it("blocks unsafe declared paths", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-plan-review-queue-path-cert-"));
    writeFixture(rootDir);

    const config = createDefaultLocalPlanReviewQueueV1();
    config.declaredPaths.push("../outside.md");

    const result = inspectLocalPlanReviewQueueV1(config, { rootDir, writeArtifacts: false });

    expect(result.ok).toBe(false);
    expect(result.blockers).toContain("Declared path must be safe and relative: ../outside.md");
  });
});
