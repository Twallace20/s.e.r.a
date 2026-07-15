import type { AggregateResult, AssertionResult } from "./evaluation-spec";

export function aggregateAssertionResults(results: AssertionResult[]): AggregateResult {
  const required = results.filter((item) => item.required);
  const requiredFail = required.filter((item) => item.outcome === "FAIL");
  const requiredBlocked = required.filter((item) => item.outcome === "BLOCKED");
  const optionalWarnings = results.filter((item) => !item.required && (item.outcome === "FAIL" || item.outcome === "BLOCKED"));
  const reasons = [
    ...requiredBlocked.map((item) => `${item.assertionId}: ${item.message}`),
    ...requiredFail.map((item) => `${item.assertionId}: ${item.message}`),
    ...optionalWarnings.map((item) => `${item.assertionId}: optional ${item.outcome.toLowerCase()}`)
  ];
  if (requiredBlocked.length > 0) {
    return { outcome: "BLOCKED", requiredPassCount: required.filter((item) => item.outcome === "PASS").length, requiredFailCount: requiredFail.length, blockedCount: requiredBlocked.length, warningCount: optionalWarnings.length, reasons };
  }
  if (requiredFail.length > 0) {
    return { outcome: "FAILED", requiredPassCount: required.filter((item) => item.outcome === "PASS").length, requiredFailCount: requiredFail.length, blockedCount: 0, warningCount: optionalWarnings.length, reasons };
  }
  if (optionalWarnings.length > 0) {
    return { outcome: "PASSED_WITH_WARNINGS", requiredPassCount: required.filter((item) => item.outcome === "PASS").length, requiredFailCount: 0, blockedCount: 0, warningCount: optionalWarnings.length, reasons };
  }
  return { outcome: "PASSED", requiredPassCount: required.filter((item) => item.outcome === "PASS").length, requiredFailCount: 0, blockedCount: 0, warningCount: 0, reasons };
}
