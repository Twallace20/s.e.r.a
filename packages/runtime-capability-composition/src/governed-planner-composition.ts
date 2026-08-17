import type {
  RuntimeCapabilityControlPlanePort
} from "./control-plane-port";

export interface GovernedPlannerInput {
  idempotencyKey: string;
  capability: string;
  prompt: string;
  payload?: Record<string, unknown>;
}

export interface GovernedPlannerResult {
  command: ReturnType<RuntimeCapabilityControlPlanePort["acceptCommand"]>;
  executionUsed: false;
}

export class GovernedPlannerComposition {
  constructor(
    private readonly controlPlane: RuntimeCapabilityControlPlanePort
  ) {}

  createTask(
    input: GovernedPlannerInput
  ): GovernedPlannerResult {
    const command = this.controlPlane.acceptCommand({
      idempotencyKey: input.idempotencyKey,
      commandType: "planner.create-task",
      capability: input.capability,
      payload: {
        prompt: input.prompt,
        ...(input.payload ?? {})
      }
    });

    return {
      command,
      executionUsed: false
    };
  }
}