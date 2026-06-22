#!/usr/bin/env node
import { inspectOperatorOwnerDecisionRecordSurfaceV1 } from "./lib/operator-owner-decision-record-surface-v1.mjs";

const result = inspectOperatorOwnerDecisionRecordSurfaceV1();
console.log(`S.E.R.A. phase54 operator owner decision record surface v1: ${result.ok ? "PASS" : "FAIL"}`);
console.log(JSON.stringify(result, null, 2));

if (!result.ok) process.exit(1);
