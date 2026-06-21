import { inspectSelfHostedRunnerAdapterV1, createDefaultSelfHostedRunnerAdapterV1 } from "./lib/self-hosted-runner-adapter-v1.mjs";

const result = inspectSelfHostedRunnerAdapterV1(createDefaultSelfHostedRunnerAdapterV1(), {
  rootDir: process.cwd(),
});

if (!result.ok) {
  console.error("S.E.R.A. phase37 self-hosted runner adapter v1: FAIL");
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

console.log("S.E.R.A. phase37 self-hosted runner adapter v1: PASS");
console.log(JSON.stringify(result, null, 2));
