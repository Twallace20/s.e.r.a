#!/usr/bin/env node
import { runMorningStatusPacketV1 } from "./lib/morning-status-packet-v1.mjs";

try {
  const result = runMorningStatusPacketV1();
  console.log("S.E.R.A. phase59 morning status packet v1: PASS");
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error("S.E.R.A. phase59 morning status packet v1: FAIL");
  if (error.result) console.error(JSON.stringify(error.result, null, 2));
  else console.error(error.message);
  process.exit(1);
}
