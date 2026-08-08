export const RUNTIME_CAPABILITY_CONTRACT_VERSION =
  "sera.runtime-capability.v1" as const;

export type RuntimeCapabilityLayer =
  | "Runtime"
  | "Capability"
  | "Provider"
  | "Worker"
  | "Tool"
  | "Knowledge"
  | "Memory";

export type RuntimeCapabilityCompositionState =
  | "registered"
  | "composition-pending"
  | "composed"
  | "certification-pending"
  | "certified"
  | "blocked";

export type ResourceProofState =
  | "not-required"
  | "required"
  | "candidate"
  | "certified"
  | "blocked";

export interface RuntimeResourceTypeClaim {
  id: string;
  description: string;
  proofState: ResourceProofState;

  /**
   * Real-resource certification requires an actual representative
   * resource of this type. Synthetic/in-memory substitutes cannot
   * certify an externally observable resource-format claim.
   */
  requiresRealResource: boolean;

  expectedResultContract?: string;
  knownLimitations?: readonly string[];
}

export interface RuntimeCapabilityAuthorityContract {
  requestAuthority: string;
  executionAuthority: string;
  stateAuthority: string;
  evidenceAuthority: string;

  /**
   * A capability cannot independently approve its own execution,
   * certification, terminal state, or promotion.
   */
  selfAuthorizationAllowed: false;
}

export interface RuntimeCapabilityProofContract {
  required: boolean;

  /**
   * Each claimed real resource type must retain the resource identity
   * or provenance, expected result, actual result, assertions, and
   * evidence references before becoming certified.
   */
  realResourceRequired: boolean;

  expectedResultRequired: boolean;
  actualResultRequired: boolean;
  validationAssertionsRequired: boolean;
  provenanceRequired: boolean;
  evidenceRequired: boolean;
  failurePathRequired: boolean;
  cleanCloseoutRequired: boolean;
}

export interface RuntimeCapabilityDefinition {
  capabilityId: string;
  name: string;
  layer: RuntimeCapabilityLayer;
  productionEntryPoint: string;

  compositionState: RuntimeCapabilityCompositionState;

  authority: RuntimeCapabilityAuthorityContract;
  proof: RuntimeCapabilityProofContract;

  resourceTypes: readonly RuntimeResourceTypeClaim[];

  existingEvidence: readonly string[];
  knownLimitations: readonly string[];

  legacyOrCompatibilitySurfaces?: readonly string[];
}

export function validateRuntimeCapabilityDefinition(
  capability: RuntimeCapabilityDefinition
): readonly string[] {
  const errors: string[] = [];

  if (!capability.capabilityId.trim()) {
    errors.push("capabilityId is required");
  }

  if (!capability.name.trim()) {
    errors.push("name is required");
  }

  if (!capability.productionEntryPoint.trim()) {
    errors.push("productionEntryPoint is required");
  }

  if (capability.authority.selfAuthorizationAllowed !== false) {
    errors.push("self authorization must remain disabled");
  }

  for (const resource of capability.resourceTypes) {
    if (!resource.id.trim()) {
      errors.push("resource type id is required");
    }

    if (
      resource.proofState === "certified" &&
      resource.requiresRealResource !== true
    ) {
      errors.push(
        `certified resource ${resource.id} must require real-resource proof`
      );
    }
  }

  return errors;
}