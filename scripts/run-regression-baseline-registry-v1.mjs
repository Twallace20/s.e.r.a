#!/usr/bin/env node
import { RegressionBaselineRegistry } from "./lib/regression-baseline-registry-v1.mjs";

const registry = new RegressionBaselineRegistry();
const summary = registry.writeSummaryArtifacts();

if (!summary.ok) {
  console.error("S.E.R.A. phase27 regression baseline registry v1: FAIL");
  console.error(JSON.stringify(summary, null, 2));
  process.exit(1);
}

console.log("S.E.R.A. phase27 regression baseline registry v1: PASS");
console.log(JSON.stringify(summary, null, 2));
