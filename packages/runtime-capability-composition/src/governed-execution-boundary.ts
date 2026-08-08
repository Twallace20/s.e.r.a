import {
  createExecutionAuthorization,
  type ExecutionAuthorization,
  type ExecutionRequest
} from "@sera/execution-engine";

import type {
  ProductControlPlane
} from "@sera/operator-gateway";

export interface GovernedExecutionResult {
  request: ExecutionRequest;
  authorization: ExecutionAuthorization;
  result: Awaited<
    ReturnType<
      ReturnType<
        ProductControlPlane["requireExecutionAuthority"]
      >["execute"]
    >
  >;
}

export class GovernedExecutionBoundary {
  constructor(
    private readonly controlPlane: ProductControlPlane
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