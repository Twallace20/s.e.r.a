#!/usr/bin/env node
import { EvaluationHarness } from "./lib/evaluation-harness-v1.mjs";

const harness = new EvaluationHarness({ rootDir: process.cwd() });
const init = harness.initialize();
if (!init.ok) {
  console.error("S.E.R.A. phase26 evaluation harness v1: FAIL");
  console.error(JSON.stringify(init, null, 2));
  process.exit(1);
}

harness.createSuite();
const summary = harness.writeSummaryArtifacts({ init });

const output = {
  ok: summary.ok,
  status: summary.status,
  init,
  suitePath: summary.suitePath,
  suiteId: summary.suiteId,
  suiteHash: summary.suiteHash,
  caseCount: summary.caseCount,
  passCount: summary.passCount,
  failCount: summary.failCount,
  assertionCount: summary.assertionCount,
  passedAssertionCount: summary.passedAssertionCount,
  failedAssertionCount: summary.failedAssertionCount,
  averageScore: summary.averageScore,
  categoryCount: summary.categoryCount,
  categories: summary.categories,
  categoryScores: summary.categoryScores,
  blockers: summary.blockers,
  jsonPath: summary.jsonPath,
  markdownPath: summary.markdownPath,
  historyPath: summary.historyPath,
  localOnly: summary.localOnly,
  paidProviderRequired: summary.paidProviderRequired,
  cloudRequired: summary.cloudRequired,
  freeCoreDependency: summary.freeCoreDependency,
  mutatesSource: summary.mutatesSource,
  requiresSecrets: summary.requiresSecrets,
  executesArbitraryCode: summary.executesArbitraryCode,
  ownerApprovalRequiredForRegressionChanges: summary.ownerApprovalRequiredForRegressionChanges
};

console.log("S.E.R.A. phase26 evaluation harness v1: " + (summary.ok ? "PASS" : "FAIL"));
console.log(JSON.stringify(output, null, 2));

if (!summary.ok) process.exit(1);
