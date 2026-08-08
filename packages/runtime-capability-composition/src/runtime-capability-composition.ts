import type {
  ProductControlPlane
} from "@sera/operator-gateway";

import {
  GovernedExecutionBoundary
} from "./governed-execution-boundary";

import {
  GovernedPlannerComposition
} from "./governed-planner-composition";

import {
  GovernedToolComposition
} from "./governed-tool-composition";

import {
  GovernedWorkerComposition
} from "./governed-worker-composition";

export class RuntimeCapabilityComposition {
  readonly planner: GovernedPlannerComposition;
  readonly worker: GovernedWorkerComposition;
  readonly tool: GovernedToolComposition;

  constructor(
    readonly controlPlane: ProductControlPlane
  ) {
    const execution =
      new GovernedExecutionBoundary(
        controlPlane
      );

    this.planner =
      new GovernedPlannerComposition(
        controlPlane
      );

    this.worker =
      new GovernedWorkerComposition(
        execution
      );

    this.tool =
      new GovernedToolComposition(
        execution
      );
  }
}