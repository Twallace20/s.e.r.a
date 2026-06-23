import { runLocalWorkerUnlockProposalPacketV1 } from "./lib/local-worker-unlock-proposal-packet-v1.mjs";

const result = runLocalWorkerUnlockProposalPacketV1();
console.log("S.E.R.A. phase61 local worker unlock proposal packet v1: PASS");
console.log(JSON.stringify(result, null, 2));
