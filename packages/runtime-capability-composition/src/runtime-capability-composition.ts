import type {
  RuntimeCapabilityControlPlanePort
} from "./control-plane-port";
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
import { GovernedMemoryComposition } from "./governed-memory-composition";
import { GovernedCapabilityEngineComposition } from "./governed-capability-engine-composition";
import type { RuntimeStateStore } from "@sera/runtime-state";

export class RuntimeCapabilityComposition {
  readonly planner: GovernedPlannerComposition;
  readonly worker: GovernedWorkerComposition;
  readonly tool: GovernedToolComposition;
  readonly memory: GovernedMemoryComposition;
  readonly capabilityEngine?: GovernedCapabilityEngineComposition;

  constructor(
    readonly controlPlane: RuntimeCapabilityControlPlanePort,
    projectRoot = process.cwd(),
    store?: RuntimeStateStore
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

    this.memory = new GovernedMemoryComposition(controlPlane, projectRoot);
    this.capabilityEngine = store
      ? new GovernedCapabilityEngineComposition(controlPlane, store, projectRoot)
      : undefined;
  }
}
