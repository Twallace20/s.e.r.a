import { describe, expect, it } from "vitest";
import {
  InvalidAttemptTransitionError,
  transitionAttempt,
  type AttemptRecord
} from "../../packages/contracts/src";

describe("control-plane terminal state contract", () => {
  it("makes BLOCKED terminal and prevents false completion", () => {
    const attempt: AttemptRecord = {
      commandId: "phase201-recovery",
      attemptId: "attempt-1",
      state: "EXECUTING",
      updatedAt: "2026-07-10T14:35:17.000Z"
    };

    const blocked = transitionAttempt(attempt, "BLOCKED", {
      reason: "Child recovery exited 1: ArgumentList property unavailable",
      now: "2026-07-10T14:35:18.000Z"
    });

    expect(blocked.state).toBe("BLOCKED");
    expect(() => transitionAttempt(blocked, "VALIDATING_CHANGES")).toThrow(
      InvalidAttemptTransitionError
    );
    expect(() => transitionAttempt(blocked, "CERTIFYING")).toThrow(
      InvalidAttemptTransitionError
    );
    expect(() => transitionAttempt(blocked, "COMPLETED")).toThrow(
      InvalidAttemptTransitionError
    );
  });

  it("only permits completion after certification", () => {
    const attempt: AttemptRecord = {
      commandId: "safe-command",
      attemptId: "attempt-1",
      state: "CERTIFYING",
      updatedAt: "2026-07-10T14:35:17.000Z"
    };

    const completed = transitionAttempt(attempt, "COMPLETED", {
      now: "2026-07-10T14:35:18.000Z"
    });

    expect(completed.state).toBe("COMPLETED");
  });

  it("blocks line-by-line continuation after failure", () => {
    const attempt: AttemptRecord = {
      commandId: "failed-command",
      attemptId: "attempt-1",
      state: "VALIDATING",
      updatedAt: "2026-07-10T14:35:17.000Z"
    };

    const failed = transitionAttempt(attempt, "FAILED", {
      reason: "Validation process exited non-zero"
    });

    expect(() => transitionAttempt(failed, "BASELINE_VERIFIED")).toThrow(
      "Invalid attempt transition: FAILED -> BASELINE_VERIFIED"
    );
  });
});
