import type {
  ProductControlPlane
} from "@sera/operator-gateway";

export interface GovernedPlannerInput {
  idempotencyKey: string;
  capability: string;
  prompt: string;
  payload?: Record<string, unknown>;
}

export interface GovernedPlannerResult {
  command: ReturnType<ProductControlPlane["acceptCommand"]>;
  executionUsed: false;
}

export class GovernedPlannerComposition {
  constructor(
    private readonly controlPlane: ProductControlPlane
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