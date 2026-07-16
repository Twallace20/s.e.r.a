import { createEvidenceStudioDefinition, runStudioRuntimeProof } from "@sera/studio-runtime";

export const EVIDENCE_STUDIO_VERSION = "evidence-studio-v1";
export const EVIDENCE_STUDIO_WORKFLOW_PROFILE = "source-grounded-professional-brief-v1";

export function getEvidenceStudioStatus() {
  const definition = createEvidenceStudioDefinition();
  return {
    ok: true,
    studioId: definition.studioId,
    displayName: definition.displayName,
    version: definition.studioVersion,
    digest: definition.immutableVersionDigest,
    workflowProfiles: definition.certifiedWorkflowProfiles,
    certification: definition.certificationLevel,
    status: definition.lifecycleStatus,
    guarantee: "bounded source-grounded professional brief from explicit operator request and authorized local sources",
    limitations: definition.knownLimitations,
    modelUse: false,
    publicNetworkUse: false
  };
}

export function runEvidenceStudioProof() {
  return runStudioRuntimeProof();
}
