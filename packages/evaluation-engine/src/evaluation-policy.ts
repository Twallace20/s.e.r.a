import { EVALUATION_POLICY_VERSION } from "./evaluation-spec";

export interface EvaluationPolicy {
  version: string;
  maxEvidenceBytes: number;
  maxTextBytes: number;
  maxJsonBytes: number;
  requireApprovalReference: boolean;
  requireRequiredAssertions: boolean;
  allowArbitraryCode: false;
  allowModelUse: false;
  allowNetworkUse: false;
}

export const DEFAULT_EVALUATION_POLICY: EvaluationPolicy = {
  version: EVALUATION_POLICY_VERSION,
  maxEvidenceBytes: 2_000_000,
  maxTextBytes: 200_000,
  maxJsonBytes: 200_000,
  requireApprovalReference: true,
  requireRequiredAssertions: true,
  allowArbitraryCode: false,
  allowModelUse: false,
  allowNetworkUse: false
};
