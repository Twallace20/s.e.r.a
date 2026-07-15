import crypto from "node:crypto";

export const EVALUATION_ENGINE_VERSION = "evaluation-engine-v1";
export const EVALUATION_POLICY_VERSION = "evaluation-policy-v1";
export const EVALUATION_PROFILE_VERSION = "evaluation-profile-v1";
export const EVALUATION_SCHEMA_VERSION = "sera.evaluation-engine.v1";
export const EVALUATION_SERVICE_ID = "evaluation-engine";

export type EvaluationState = "CREATED" | "VALIDATING" | "READY" | "EVALUATING" | "PASSED" | "PASSED_WITH_WARNINGS" | "FAILED" | "BLOCKED" | "CANCELLED";
export type AssertionOutcome = "PASS" | "FAIL" | "BLOCKED" | "NOT_APPLICABLE";
export type AggregateOutcome = "PASSED" | "PASSED_WITH_WARNINGS" | "FAILED" | "BLOCKED" | "CANCELLED";
export type AssertionKind = "required" | "optional";

export interface EvaluationAssertionSpec {
  assertionId: string;
  evaluatorId: string;
  evaluatorVersion: string;
  kind: AssertionKind;
  input: Record<string, unknown>;
  expected?: unknown;
  comparison?: Record<string, unknown>;
  message: string;
  metadata?: Record<string, unknown>;
}

export interface EvaluationEvidenceReference {
  id: string;
  path: string;
  sha256?: string;
  size?: number;
}

export interface EvaluationSpecification {
  specificationId: string;
  specificationVersion: "evaluation-spec-v1";
  attemptId: string;
  executionId: string;
  profileId: string;
  profileVersion: string;
  policyVersion: string;
  requiredAssertions: EvaluationAssertionSpec[];
  optionalAssertions: EvaluationAssertionSpec[];
  evidenceReferences: EvaluationEvidenceReference[];
  aggregationPolicy: {
    emptyRequiredAllowed: boolean;
    optionalFailureOutcome: "warning";
  };
  createdAt: string;
  expiresAt?: string;
  specificationHash: string;
  approvalReference?: string;
  correlation: Record<string, unknown>;
}

export interface AssertionResult {
  assertionId: string;
  evaluatorId: string;
  evaluatorVersion: string;
  required: boolean;
  outcome: AssertionOutcome;
  expectedSummary: string;
  actualSummary: string;
  message: string;
  evidenceReferences: string[];
  startedAt: string;
  completedAt: string;
  durationMs: number;
  sequence: number;
}

export interface AggregateResult {
  outcome: AggregateOutcome;
  requiredPassCount: number;
  requiredFailCount: number;
  blockedCount: number;
  warningCount: number;
  reasons: string[];
}

export function normalizeForJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalizeForJson);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, normalizeForJson(item)]));
  }
  return value;
}

export function stableJson(value: unknown): string {
  return JSON.stringify(normalizeForJson(value));
}

export function stableHash(value: unknown): string {
  return crypto.createHash("sha256").update(stableJson(value)).digest("hex");
}

export function specificationHash(spec: Omit<EvaluationSpecification, "specificationHash"> | EvaluationSpecification): string {
  const copy = { ...(spec as Record<string, unknown>) };
  delete copy.specificationHash;
  return stableHash(copy);
}

export function withSpecificationHash(spec: Omit<EvaluationSpecification, "specificationHash">): EvaluationSpecification {
  return { ...spec, specificationHash: specificationHash(spec) };
}
