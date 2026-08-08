import {
  type ExecutionAuthority
} from "@sera/execution-engine";

import {
  type RuntimeStateStore
} from "@sera/runtime-state";

export interface ProductControlPlaneConfig {
  store: RuntimeStateStore;
  executionAuthority?: ExecutionAuthority;
}

export interface ProductCommandInput {
  idempotencyKey: string;
  commandType: string;
  payload: Record<string, unknown>;
  capability: string;
}

export class ProductControlPlane {
  constructor(
    private readonly store: RuntimeStateStore,
    private readonly executionAuthority?: ExecutionAuthority
  ) {}

  acceptCommand(input: ProductCommandInput) {
    return this.store.acceptCommand(input);
  }

  transitionAttempt(
    input: Parameters<RuntimeStateStore["transitionAttempt"]>[0]
  ) {
    return this.store.transitionAttempt(input);
  }

  recordEvidenceReference(
    input: Parameters<RuntimeStateStore["recordEvidenceReference"]>[0]
  ) {
    return this.store.recordEvidenceReference(input);
  }

  recordGateOutcome(
    input: Parameters<RuntimeStateStore["recordGateOutcome"]>[0]
  ) {
    return this.store.recordGateOutcome(input);
  }

  recoveryGet(
    sql: string,
    params: unknown[] = []
  ) {
    return this.store.recoveryGet(
      sql,
      params as any
    );
  }

  requireExecutionAuthority(): ExecutionAuthority {
    if (!this.executionAuthority) {
      throw new Error(
        "Product Control Plane execution authority is unavailable."
      );
    }

    return this.executionAuthority;
  }

  getExecutionAuthority():
    | ExecutionAuthority
    | undefined {
    return this.executionAuthority;
  }

  runtimeStateAuthority(): RuntimeStateStore {
    return this.store;
  }
}