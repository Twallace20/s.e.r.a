#!/usr/bin/env node
import { PhasePacketGeneratorV1 } from "./lib/phase-packet-generator-v1.mjs";

const generator = new PhasePacketGeneratorV1();
const summary = generator.writeSummaryArtifacts();

if (!summary.ok) {
  console.error("S.E.R.A. phase32 phase packet generator v1: FAIL");
  console.error(JSON.stringify(summary, null, 2));
  process.exit(1);
}

console.log("S.E.R.A. phase32 phase packet generator v1: PASS");
console.log(JSON.stringify(summary, null, 2));
