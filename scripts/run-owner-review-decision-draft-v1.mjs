#!/usr/bin/env node
import { inspectOwnerReviewDecisionDraftV1 } from "./lib/owner-review-decision-draft-v1.mjs";

const result = inspectOwnerReviewDecisionDraftV1();
console.log(`S.E.R.A. phase53 owner review decision draft v1: ${result.ok ? "PASS" : "FAIL"}`);
console.log(JSON.stringify(result, null, 2));

if (!result.ok) process.exit(1);
