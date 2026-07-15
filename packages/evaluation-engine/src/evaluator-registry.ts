import fs from "node:fs";
import path from "node:path";
import { EvidenceLoader, EvaluationEvidenceError } from "./evidence-loader";
import type { AssertionOutcome, EvaluationAssertionSpec } from "./evaluation-spec";
import { stableJson } from "./evaluation-spec";
import type { EvaluationPolicy } from "./evaluation-policy";

export interface EvaluationProfile {
  profileId: string;
  version: string;
  emptyRequiredAllowed: boolean;
  evaluatorIds: string[];
}

export interface EvaluatorContext {
  execution: Record<string, unknown>;
  outputs: Array<Record<string, unknown>>;
  inputs: Array<Record<string, unknown>>;
  evidenceRoot: string;
  loader: EvidenceLoader;
  policy: EvaluationPolicy;
}

export interface EvaluatorResult {
  outcome: AssertionOutcome;
  expectedSummary: string;
  actualSummary: string;
  message: string;
  evidenceReferences: string[];
}

export interface EvaluatorDefinition {
  evaluatorId: string;
  version: "v1";
  supportedInputType: string;
  deterministic: true;
  requiredEvidence: string[];
  maximumInputSize: number;
  comparisonBehavior: string;
  failureBehavior: string;
  evaluate(assertion: EvaluationAssertionSpec, context: EvaluatorContext): EvaluatorResult;
}

export const DEFAULT_EVALUATION_PROFILE: EvaluationProfile = {
  profileId: "deterministic-default",
  version: "evaluation-profile-v1",
  emptyRequiredAllowed: false,
  evaluatorIds: [
    "execution_state_equals",
    "process_exit_code_in",
    "stdout_contains",
    "stdout_equals",
    "stderr_contains",
    "stderr_empty",
    "output_exists",
    "output_hash_equals",
    "output_size_within",
    "output_text_contains",
    "output_text_equals",
    "output_json_pointer_equals",
    "source_unchanged",
    "evidence_file_exists",
    "evidence_hash_matches",
    "cleanup_status_equals",
    "output_not_truncated",
    "execution_completed_within_timeout"
  ]
};

export class EvaluatorRegistry {
  private readonly evaluators = new Map<string, EvaluatorDefinition>();
  private readonly profiles = new Map<string, EvaluationProfile>();

  constructor(definitions: EvaluatorDefinition[] = defaultEvaluators(), profiles: EvaluationProfile[] = [DEFAULT_EVALUATION_PROFILE]) {
    for (const definition of definitions) this.evaluators.set(definition.evaluatorId, definition);
    for (const profile of profiles) this.profiles.set(profile.profileId, profile);
  }

  list(): EvaluatorDefinition[] {
    return [...this.evaluators.values()].sort((a, b) => a.evaluatorId.localeCompare(b.evaluatorId));
  }

  listProfiles(): EvaluationProfile[] {
    return [...this.profiles.values()].sort((a, b) => a.profileId.localeCompare(b.profileId));
  }

  get(id: string): EvaluatorDefinition | undefined {
    return this.evaluators.get(id);
  }

  getProfile(id: string): EvaluationProfile | undefined {
    return this.profiles.get(id);
  }

  validate(): boolean {
    return this.list().length === DEFAULT_EVALUATION_PROFILE.evaluatorIds.length && this.list().every((item) => item.deterministic && item.version === "v1");
  }
}

function defaultEvaluators(): EvaluatorDefinition[] {
  const def = (evaluatorId: string, requiredEvidence: string[], comparisonBehavior: string, evaluate: EvaluatorDefinition["evaluate"]): EvaluatorDefinition => ({
    evaluatorId,
    version: "v1",
    supportedInputType: "declared-json",
    deterministic: true,
    requiredEvidence,
    maximumInputSize: 200_000,
    comparisonBehavior,
    failureBehavior: "returns FAIL for mismatch and BLOCKED for unavailable or invalid evidence",
    evaluate
  });
  return [
    def("execution_state_equals", ["sqlite.executions"], "strict string equality", (assertion, context) => compare(String(context.execution.state), String(assertion.expected), assertion, [])),
    def("process_exit_code_in", ["sqlite.executions"], "integer membership", (assertion, context) => {
      const expected = Array.isArray(assertion.expected) ? assertion.expected.map(Number) : [];
      const actual = Number(context.execution.process_exit_code);
      return expected.includes(actual) ? pass(assertion, expected, actual, []) : fail(assertion, expected, actual, []);
    }),
    def("stdout_contains", ["stdout.txt"], "bounded substring contains", (assertion, context) => contains(readText(context, "stdout.txt"), String(assertion.expected ?? ""), assertion, ["stdout.txt"])),
    def("stdout_equals", ["stdout.txt"], "bounded normalized newline equality", (assertion, context) => compare(readText(context, "stdout.txt"), String(assertion.expected ?? "").replace(/\r\n/g, "\n"), assertion, ["stdout.txt"])),
    def("stderr_contains", ["stderr.txt"], "bounded substring contains", (assertion, context) => contains(readText(context, "stderr.txt"), String(assertion.expected ?? ""), assertion, ["stderr.txt"])),
    def("stderr_empty", ["stderr.txt"], "bounded empty string check", (assertion, context) => compare(readText(context, "stderr.txt"), "", assertion, ["stderr.txt"])),
    def("output_exists", ["sqlite.execution_outputs"], "declared output harvested status", (assertion, context) => {
      const output = outputById(context, String(assertion.input.outputId ?? ""));
      return output && String(output.status) === "harvested" ? pass(assertion, "harvested", output.status, [String(output.evidence_reference ?? "")]) : fail(assertion, "harvested", output?.status ?? "missing", []);
    }),
    def("output_hash_equals", ["sqlite.execution_outputs"], "sha256 equality", (assertion, context) => {
      const output = outputById(context, String(assertion.input.outputId ?? ""));
      return output && String(output.hash) === String(assertion.expected) ? pass(assertion, assertion.expected, output.hash, [String(output.evidence_reference ?? "")]) : fail(assertion, assertion.expected, output?.hash ?? "missing", []);
    }),
    def("output_size_within", ["sqlite.execution_outputs"], "inclusive numeric range", (assertion, context) => {
      const output = outputById(context, String(assertion.input.outputId ?? ""));
      const min = Number((assertion.expected as Record<string, unknown> | undefined)?.min ?? 0);
      const max = Number((assertion.expected as Record<string, unknown> | undefined)?.max ?? Number.MAX_SAFE_INTEGER);
      const actual = Number(output?.size ?? -1);
      return actual >= min && actual <= max ? pass(assertion, { min, max }, actual, [String(output?.evidence_reference ?? "")]) : fail(assertion, { min, max }, actual, []);
    }),
    def("output_text_contains", ["execution output file"], "bounded substring contains", (assertion, context) => contains(readOutputText(context, assertion), String(assertion.expected ?? ""), assertion, [String(assertion.input.path ?? assertion.input.outputPath ?? "")])),
    def("output_text_equals", ["execution output file"], "bounded normalized newline equality", (assertion, context) => compare(readOutputText(context, assertion), String(assertion.expected ?? "").replace(/\r\n/g, "\n"), assertion, [String(assertion.input.path ?? assertion.input.outputPath ?? "")])),
    def("output_json_pointer_equals", ["execution output JSON file"], "bounded JSON Pointer normalized equality", (assertion, context) => {
      const raw = readOutputText(context, assertion, context.policy.maxJsonBytes);
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        return blocked(assertion, "Malformed JSON blocks output_json_pointer_equals.", [String(assertion.input.path ?? "")]);
      }
      const pointer = String(assertion.input.pointer ?? "");
      const actual = jsonPointer(parsed, pointer);
      if (actual.missing) return fail(assertion, assertion.expected, "missing pointer", [String(assertion.input.path ?? "")]);
      return stableJson(actual.value) === stableJson(assertion.expected) ? pass(assertion, assertion.expected, actual.value, [String(assertion.input.path ?? "")]) : fail(assertion, assertion.expected, actual.value, [String(assertion.input.path ?? "")]);
    }),
    def("source_unchanged", ["final-execution-report.json"], "source mutation boolean must be false", (assertion, context) => {
      const report = JSON.parse(readText(context, "final-execution-report.json"));
      const actual = Boolean((report.result as Record<string, unknown> | undefined)?.sourceNotMutated);
      return actual ? pass(assertion, true, actual, ["final-execution-report.json"]) : fail(assertion, true, actual, ["final-execution-report.json"]);
    }),
    def("evidence_file_exists", ["declared evidence file"], "declared evidence existence", (assertion, context) => {
      const p = String(assertion.input.path ?? assertion.expected ?? "");
      try {
        const loaded = context.loader.load(p, p);
        return pass(assertion, "exists", loaded.path, [p]);
      } catch (error) {
        return error instanceof EvaluationEvidenceError ? blocked(assertion, error.message, [p]) : blocked(assertion, "Evidence file check failed.", [p]);
      }
    }),
    def("evidence_hash_matches", ["declared evidence file"], "sha256 equality against declared hash", (assertion, context) => {
      const p = String(assertion.input.path ?? "");
      try {
        const loaded = context.loader.load(p, p, String(assertion.expected ?? ""));
        return pass(assertion, assertion.expected, loaded.sha256, [p]);
      } catch (error) {
        return blocked(assertion, error instanceof Error ? error.message : "Evidence hash check failed.", [p]);
      }
    }),
    def("cleanup_status_equals", ["cleanup-report.json"], "cleanup cleaned equality", (assertion, context) => {
      const cleanup = JSON.parse(readText(context, "cleanup-report.json"));
      return compare(Boolean(cleanup.cleaned), Boolean(assertion.expected), assertion, ["cleanup-report.json"]);
    }),
    def("output_not_truncated", ["process-result.json"], "no output limit events", (assertion, context) => {
      const processResult = JSON.parse(readText(context, "process-result.json"));
      const limitEvents = (processResult.output?.limitEvents ?? []) as unknown[];
      return limitEvents.length === 0 ? pass(assertion, 0, limitEvents.length, ["process-result.json"]) : fail(assertion, 0, limitEvents.length, ["process-result.json"]);
    }),
    def("execution_completed_within_timeout", ["sqlite.executions"], "completed-started duration <= timeout", (assertion, context) => {
      const startedAt = Date.parse(String(context.execution.started_at ?? ""));
      const completedAt = Date.parse(String(context.execution.completed_at ?? ""));
      const timeoutMs = Number(assertion.expected ?? context.execution.timeout_ms ?? 0);
      const actual = completedAt - startedAt;
      return Number.isFinite(actual) && actual >= 0 && actual <= timeoutMs ? pass(assertion, timeoutMs, actual, []) : fail(assertion, timeoutMs, actual, []);
    })
  ];
}

function readText(context: EvaluatorContext, relativePath: string, limit = context.policy.maxTextBytes): string {
  return context.loader.readText(relativePath, relativePath, limit).text ?? "";
}

function readOutputText(context: EvaluatorContext, assertion: EvaluationAssertionSpec, limit = context.policy.maxTextBytes): string {
  const explicit = assertion.input.path ?? assertion.input.outputPath;
  if (explicit) return context.loader.readText(String(explicit), String(explicit), limit).text ?? "";
  const output = outputById(context, String(assertion.input.outputId ?? ""));
  const ref = String(output?.evidence_reference ?? "");
  if (!ref) throw new EvaluationEvidenceError("Declared output has no evidence reference.", "missing_output_evidence");
  const relative = path.basename(ref);
  return context.loader.readText(relative, relative, limit, output?.hash ? String(output.hash) : undefined, output?.size !== undefined ? Number(output.size) : undefined).text ?? "";
}

function outputById(context: EvaluatorContext, outputId: string): Record<string, unknown> | undefined {
  return context.outputs.find((item) => String(item.declared_output_identity) === outputId);
}

function contains(actual: string, expected: string, assertion: EvaluationAssertionSpec, refs: string[]): EvaluatorResult {
  return actual.includes(expected) ? pass(assertion, expected, summarize(actual), refs) : fail(assertion, expected, summarize(actual), refs);
}

function compare(actual: unknown, expected: unknown, assertion: EvaluationAssertionSpec, refs: string[]): EvaluatorResult {
  return stableJson(actual) === stableJson(expected) ? pass(assertion, expected, actual, refs) : fail(assertion, expected, actual, refs);
}

function pass(assertion: EvaluationAssertionSpec, expected: unknown, actual: unknown, refs: string[]): EvaluatorResult {
  return { outcome: "PASS", expectedSummary: summarize(expected), actualSummary: summarize(actual), message: assertion.message || "Assertion passed.", evidenceReferences: refs.filter(Boolean) };
}

function fail(assertion: EvaluationAssertionSpec, expected: unknown, actual: unknown, refs: string[]): EvaluatorResult {
  return { outcome: "FAIL", expectedSummary: summarize(expected), actualSummary: summarize(actual), message: assertion.message || "Assertion failed.", evidenceReferences: refs.filter(Boolean) };
}

function blocked(assertion: EvaluationAssertionSpec, message: string, refs: string[]): EvaluatorResult {
  return { outcome: "BLOCKED", expectedSummary: summarize(assertion.expected), actualSummary: "blocked", message, evidenceReferences: refs.filter(Boolean) };
}

function summarize(value: unknown): string {
  const text = typeof value === "string" ? value : stableJson(value);
  return text.length > 200 ? `${text.slice(0, 197)}...` : text;
}

function jsonPointer(value: unknown, pointer: string): { missing: boolean; value?: unknown } {
  if (pointer === "") return { missing: false, value };
  if (!pointer.startsWith("/")) return { missing: true };
  let current = value;
  for (const part of pointer.slice(1).split("/").map((item) => item.replace(/~1/g, "/").replace(/~0/g, "~"))) {
    if (Array.isArray(current)) {
      const index = Number(part);
      if (!Number.isInteger(index) || index < 0 || index >= current.length) return { missing: true };
      current = current[index];
    } else if (current && typeof current === "object" && Object.prototype.hasOwnProperty.call(current, part)) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return { missing: true };
    }
  }
  return { missing: false, value: current };
}
