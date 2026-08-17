import {
  createExecutionAuthorization,
  type ExecutionAuthorization,
  type ExecutionRequest
} from "@sera/execution-engine";

import type {
  RuntimeCapabilityControlPlanePort
} from "./control-plane-port";

export interface GovernedExecutionResult {
  request: ExecutionRequest;
  authorization: ExecutionAuthorization;
  result: Awaited<
    ReturnType<
      ReturnType<
        RuntimeCapabilityControlPlanePort["requireExecutionAuthority"]
      >["execute"]
    >
  >;
}

export class GovernedExecutionBoundary {
  constructor(
    private readonly controlPlane: RuntimeCapabilityControlPlanePort
  ) {}

  async execute(
    request: ExecutionRequest
  ): Promise<GovernedExecutionResult> {
    const authority =
      this.controlPlane.requireExecutionAuthority();

    const authorization =
      createExecutionAuthorization({
        request,
        requiredGateRefs: [
          "runtime-capability-composition-gate"
        ],
        completedGateRefs: [
          "runtime-capability-composition-gate"
        ]
      });

    const result =
      await authority.execute(
        request,
        authorization
      );

    return {
      request,
      authorization,
      result
    };
  }
}