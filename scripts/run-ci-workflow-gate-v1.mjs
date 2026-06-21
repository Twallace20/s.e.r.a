#!/usr/bin/env node
import { CiWorkflowGate } from "./lib/ci-workflow-gate-v1.mjs";

const gate = new CiWorkflowGate({ rootDir: process.cwd() });
const init = gate.initialize();
const summary = gate.writeSummaryArtifacts();

const output = {
  ok: summary.ok,
  status: summary.status,
  init,
  workflowPath: summary.workflowPath,
  workflowHash: summary.workflowHash,
  checkCount: summary.checkCount,
  passedCount: summary.passedCount,
  failedCount: summary.failedCount,
  warningCount: summary.warningCount,
  blockers: summary.blockers,
  warnings: summary.warnings,
  jsonPath: summary.jsonPath,
  markdownPath: summary.markdownPath,
  historyPath: summary.historyPath,
  localOnly: summary.localOnly,
  paidProviderRequired: summary.paidProviderRequired,
  cloudRequired: summary.cloudRequired,
  freeCoreDependency: summary.freeCoreDependency,
  mutatesSource: summary.mutatesSource,
  requiresSecrets: summary.requiresSecrets,
  ownerApprovalRequiredForMerge: summary.ownerApprovalRequiredForMerge
};

if (!output.ok) {
  console.error("S.E.R.A. phase25B CI workflow gate v1: FAIL");
  console.error(JSON.stringify(output, null, 2));
  process.exit(1);
}

console.log("S.E.R.A. phase25B CI workflow gate v1: PASS");
console.log(JSON.stringify(output, null, 2));
