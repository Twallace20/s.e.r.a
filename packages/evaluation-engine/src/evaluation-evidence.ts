import fs from "node:fs";
import path from "node:path";
import type { AggregateResult, AssertionResult, EvaluationSpecification } from "./evaluation-spec";
import { EVALUATION_SCHEMA_VERSION, EVALUATION_ENGINE_VERSION, stableHash } from "./evaluation-spec";
import type { EvaluationPolicy } from "./evaluation-policy";
import type { EvaluationProfile } from "./evaluator-registry";

export function ensureEvaluationEvidence(input: {
  evidenceRoot: string;
  specification: EvaluationSpecification;
  policy: EvaluationPolicy;
  profile: EvaluationProfile;
  assertionResults: AssertionResult[];
  aggregate: AggregateResult;
  gateReference?: string;
  installationId: string;
  runtimeInstanceId: string;
}): Record<string, unknown> {
  fs.mkdirSync(input.evidenceRoot, { recursive: true });
  writeJson(path.join(input.evidenceRoot, "specification.json"), input.specification);
  writeJson(path.join(input.evidenceRoot, "policy.json"), input.policy);
  writeJson(path.join(input.evidenceRoot, "profile.json"), input.profile);
  writeJson(path.join(input.evidenceRoot, "evidence-manifest.json"), {
    schemaVersion: EVALUATION_SCHEMA_VERSION,
    evaluationId: path.basename(input.evidenceRoot),
    evidenceRoot: input.evidenceRoot,
    specificationHash: input.specification.specificationHash,
    references: input.specification.evidenceReferences
  });
  fs.writeFileSync(path.join(input.evidenceRoot, "assertion-results.jsonl"), input.assertionResults.map((result) => JSON.stringify(result)).join("\n") + "\n", "utf8");
  fs.writeFileSync(path.join(input.evidenceRoot, "lifecycle-events.jsonl"), [
    { eventType: "CREATED", outcome: "PASS" },
    { eventType: "VALIDATING", outcome: "PASS" },
    { eventType: "EVALUATING", outcome: "PASS" },
    { eventType: input.aggregate.outcome, outcome: input.aggregate.outcome }
  ].map((event) => JSON.stringify({ schemaVersion: EVALUATION_SCHEMA_VERSION, timestamp: new Date().toISOString(), ...event })).join("\n") + "\n", "utf8");
  writeJson(path.join(input.evidenceRoot, "aggregate-result.json"), input.aggregate);
  writeJson(path.join(input.evidenceRoot, "control-plane-gate-reference.json"), { evidenceReferenceId: input.gateReference ?? null, gateName: `evaluation:${input.specification.specificationId}` });
  const report = {
    schemaVersion: EVALUATION_SCHEMA_VERSION,
    engineVersion: EVALUATION_ENGINE_VERSION,
    installationId: input.installationId,
    runtimeInstanceId: input.runtimeInstanceId,
    evaluationId: path.basename(input.evidenceRoot),
    specificationId: input.specification.specificationId,
    attemptId: input.specification.attemptId,
    executionId: input.specification.executionId,
    profile: { id: input.profile.profileId, version: input.profile.version },
    specificationHash: input.specification.specificationHash,
    policyHash: stableHash(input.policy),
    evaluatorVersions: input.profile.evaluatorIds,
    assertionOutcomes: input.assertionResults,
    aggregate: input.aggregate,
    modelUse: false,
    networkUse: false
  };
  writeJson(path.join(input.evidenceRoot, "final-evaluation-report.json"), report);
  return report;
}

function writeJson(filePath: string, value: unknown): void {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + "\n", "utf8");
}
