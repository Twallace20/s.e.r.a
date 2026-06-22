import { inspectEvidenceCaptureBundleV1, createDefaultEvidenceCaptureBundleV1 } from "./lib/evidence-capture-bundle-v1.mjs";

const result = inspectEvidenceCaptureBundleV1(createDefaultEvidenceCaptureBundleV1(), {
  rootDir: process.cwd(),
});

if (!result.ok) {
  console.error("S.E.R.A. phase39 evidence capture bundle v1: FAIL");
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

console.log("S.E.R.A. phase39 evidence capture bundle v1: PASS");
console.log(JSON.stringify(result, null, 2));
