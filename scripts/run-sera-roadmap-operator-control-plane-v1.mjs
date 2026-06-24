import { createDefaultSeraRoadmapOperatorControlPlaneV1, inspectSeraRoadmapOperatorControlPlaneV1 } from "./lib/sera-roadmap-operator-control-plane-v1.mjs";

const result = inspectSeraRoadmapOperatorControlPlaneV1(createDefaultSeraRoadmapOperatorControlPlaneV1(), { writeArtifacts: true });
console.log("S.E.R.A. phase82 roadmap + operator control plane v1: " + (result.ok ? "PASS" : "FAIL"));
console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exit(1);
