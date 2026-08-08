import type {
  ExecutionRequest
} from "@sera/execution-engine";

import {
  GovernedExecutionBoundary,
  type GovernedExecutionResult
} from "./governed-execution-boundary";

export class GovernedWorkerComposition {
  constructor(
    private readonly execution:
      GovernedExecutionBoundary
  ) {}

  run(
    request: ExecutionRequest
  ): Promise<GovernedExecutionResult> {
    return this.execution.execute(request);
  }
}