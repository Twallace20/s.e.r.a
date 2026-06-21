import { inspectRemotePhaseRunnerBlueprintV1, createDefaultRemotePhaseRunnerBlueprintV1 } from "./lib/remote-phase-runner-blueprint-v1.mjs";

const result = inspectRemotePhaseRunnerBlueprintV1(createDefaultRemotePhaseRunnerBlueprintV1(), {
  rootDir: process.cwd(),
});

if (!result.ok) {
  console.error("S.E.R.A. phase35 remote phase runner blueprint v1: FAIL");
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

console.log("S.E.R.A. phase35 remote phase runner blueprint v1: PASS");
console.log(JSON.stringify(result, null, 2));
