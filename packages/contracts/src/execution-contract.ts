export const ATTEMPT_STATES = [
  "RECEIVED",
  "VALIDATING",
  "BASELINE_VERIFIED",
  "PLANNING",
  "EXECUTING",
  "VALIDATING_CHANGES",
  "CERTIFYING",
  "COMPLETED",
  "BLOCKED",
  "FAILED",
  "CANCELLED"
] as const;

export type AttemptState = (typeof ATTEMPT_STATES)[number];

export interface AttemptRecord {
  commandId: string;
  attemptId: string;
  state: AttemptState;
  updatedAt: string;
  reason?: string;
}

export interface ExecutionResult {
  commandId: string;
  attemptId: string;
  status: "COMPLETED" | "BLOCKED" | "FAILED" | "CANCELLED";
  evidenceDirectory?: string;
  reason?: string;
}

export const TERMINAL_ATTEMPT_STATES: ReadonlySet<AttemptState> = new Set([
  "COMPLETED",
  "BLOCKED",
  "FAILED",
  "CANCELLED"
]);

export function isTerminalAttemptState(state: AttemptState): boolean {
  return TERMINAL_ATTEMPT_STATES.has(state);
}
