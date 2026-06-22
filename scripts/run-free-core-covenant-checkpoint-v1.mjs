import {
  createDefaultFreeCoreCovenantCheckpointV1,
  inspectFreeCoreCovenantCheckpointV1,
} from "./lib/free-core-covenant-checkpoint-v1.mjs";

const result = inspectFreeCoreCovenantCheckpointV1(createDefaultFreeCoreCovenantCheckpointV1(), {
  rootDir: process.cwd(),
});

console.log(`S.E.R.A. phase45 free core covenant checkpoint v1: ${result.ok ? "PASS" : "FAIL"}`);
console.log(JSON.stringify(result, null, 2));

if (!result.ok) {
  process.exitCode = 1;
}
