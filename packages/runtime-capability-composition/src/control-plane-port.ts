import type {
  ExecutionAuthority
} from "@sera/execution-engine";

import type {
  RuntimeStateStore
} from "@sera/runtime-state";

export interface RuntimeCapabilityControlPlanePort {
  acceptCommand(
    input: Parameters<RuntimeStateStore["acceptCommand"]>[0]
  ): ReturnType<RuntimeStateStore["acceptCommand"]>;

  transitionAttempt(
    input: Parameters<RuntimeStateStore["transitionAttempt"]>[0]
  ): ReturnType<RuntimeStateStore["transitionAttempt"]>;

  recordEvidenceReference(
    input: Parameters<RuntimeStateStore["recordEvidenceReference"]>[0]
  ): ReturnType<RuntimeStateStore["recordEvidenceReference"]>;

  recordGateOutcome(
    input: Parameters<RuntimeStateStore["recordGateOutcome"]>[0]
  ): ReturnType<RuntimeStateStore["recordGateOutcome"]>;

  recoveryGet(
    sql: string,
    params?: unknown[]
  ): ReturnType<RuntimeStateStore["recoveryGet"]>;

  requireExecutionAuthority(): ExecutionAuthority;

  getExecutionAuthority(): ExecutionAuthority | undefined;

  runtimeStateAuthority(): RuntimeStateStore;
}
