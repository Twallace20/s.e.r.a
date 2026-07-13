import {
  type AttemptRecord,
  type AttemptState,
  isTerminalAttemptState
} from "./execution-contract";

const ALLOWED_TRANSITIONS: Readonly<Record<AttemptState, readonly AttemptState[]>> = {
  RECEIVED: ["VALIDATING", "BLOCKED", "FAILED", "CANCELLED"],
  VALIDATING: ["BASELINE_VERIFIED", "BLOCKED", "FAILED", "CANCELLED"],
  BASELINE_VERIFIED: ["PLANNING", "BLOCKED", "FAILED", "CANCELLED"],
  PLANNING: ["EXECUTING", "BLOCKED", "FAILED", "CANCELLED"],
  EXECUTING: ["VALIDATING_CHANGES", "BLOCKED", "FAILED", "CANCELLED"],
  VALIDATING_CHANGES: ["CERTIFYING", "BLOCKED", "FAILED", "CANCELLED"],
  CERTIFYING: ["COMPLETED", "BLOCKED", "FAILED", "CANCELLED"],
  COMPLETED: [],
  BLOCKED: [],
  FAILED: [],
  CANCELLED: []
};

export class InvalidAttemptTransitionError extends Error {
  constructor(from: AttemptState, to: AttemptState) {
    super(`Invalid attempt transition: ${from} -> ${to}`);
    this.name = "InvalidAttemptTransitionError";
  }
}

export function canTransition(from: AttemptState, to: AttemptState): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function transitionAttempt(
  attempt: AttemptRecord,
  nextState: AttemptState,
  options: { reason?: string; now?: string } = {}
): AttemptRecord {
  if (isTerminalAttemptState(attempt.state) || !canTransition(attempt.state, nextState)) {
    throw new InvalidAttemptTransitionError(attempt.state, nextState);
  }

  return {
    ...attempt,
    state: nextState,
    updatedAt: options.now ?? new Date().toISOString(),
    ...(options.reason ? { reason: options.reason } : {})
  };
}
