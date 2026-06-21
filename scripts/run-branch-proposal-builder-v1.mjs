#!/usr/bin/env node
import { BranchProposalBuilderV1 } from "./lib/branch-proposal-builder-v1.mjs";

const builder = new BranchProposalBuilderV1();
const summary = builder.writeSummaryArtifacts();

if (!summary.ok) {
  console.error("S.E.R.A. phase33 branch proposal builder v1: FAIL");
  console.error(JSON.stringify(summary, null, 2));
  process.exit(1);
}

console.log("S.E.R.A. phase33 branch proposal builder v1: PASS");
console.log(JSON.stringify(summary, null, 2));
