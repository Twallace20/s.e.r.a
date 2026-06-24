#!/usr/bin/env node
import { inspectLocalWorkerCommandApprovalPacketV1 } from "./lib/local-worker-command-approval-packet-v1.mjs";

const result = inspectLocalWorkerCommandApprovalPacketV1(undefined, { writeArtifacts: true });
console.log("S.E.R.A. phase86 local worker command approval packet v1: " + (result.ok ? "PASS" : "FAIL"));
console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exit(1);
