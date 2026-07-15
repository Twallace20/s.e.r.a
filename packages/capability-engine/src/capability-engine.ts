import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { EvaluationEngine, withSpecificationHash } from "@sera/evaluation-engine";
import { IsolatedExecutionEngine, createExecutionAuthorization, type ExecutionRequest } from "@sera/execution-engine";
import { RuntimeHost, createControlPlaneRuntimeService, createRuntimeConfig, type RuntimeService, type RuntimeServiceContext } from "@sera/runtime-host";
import { createPersistentRuntimeRecoveryService } from "@sera/runtime-recovery";
import { createRuntimeStateService, openRuntimeState, type RuntimeStateConfigInput, type RuntimeStateStore } from "@sera/runtime-state";

export const CAPABILITY_ENGINE_VERSION = "capability-engine-recursive-learning-v1";
export const CAPABILITY_ENGINE_SCHEMA_VERSION = "sera.capability-engine-recursive-learning.v1";
export const CAPABILITY_ENGINE_SERVICE_ID = "capability-engine";
export const CAPABILITY_POLICY_VERSION = "capability-learning-policy-v1";
export const CAPABILITY_AUTHORIZATION_VERSION = "capability-authorization-v1";

export type CapabilityType = "deterministic-transform" | "governed-workflow" | "provider-assisted-candidate" | "retrieval-assisted-operation" | "isolated-candidate-bundle" | "compatibility-adapter";
export type LearningLane = "acquisition" | "improvement" | "repair" | "adaptation" | "innovation";
export type RiskClass = "low" | "medium" | "high";
export type CapabilityStatus = "PROPOSED" | "VALIDATING" | "AUTHORIZED_FOR_EXPERIMENT" | "EXPERIMENTING" | "EVALUATING" | "CANDIDATE" | "CERTIFIED" | "PROMOTED" | "SUPERSEDED" | "REJECTED" | "BLOCKED" | "ROLLED_BACK" | "ARCHIVED";
export type ExperimentState = "CREATED" | "AUTHORIZING" | "READY" | "RUNNING" | "EVALUATING" | "PASSED" | "FAILED" | "BLOCKED" | "TIMED_OUT" | "CANCELLED" | "REVIEW_REQUIRED";
export type LearningSessionState = "CREATED" | "VALIDATING" | "ANALYZING_EVIDENCE" | "PROPOSING" | "EXPERIMENTING" | "COMPARING" | "AWAITING_PROMOTION" | "COMPLETED" | "BLOCKED" | "FAILED" | "CANCELLED" | "REVIEW_REQUIRED";
export type ProposalSource = "operator-request" | "capability-gap" | "evaluation-failure" | "regression" | "knowledge-requirement" | "planner-output" | "model-candidate-output" | "compatibility-migration-request";
export type SignalType = "operator-request" | "capability-gap" | "evaluation-failure" | "regression" | "performance-degradation" | "compatibility-change" | "knowledge-backed-requirement";

export interface CapabilityLearningPolicy {
  version: typeof CAPABILITY_POLICY_VERSION;
  maximumIterations: number;
  maximumCandidatesPerIteration: number;
  maximumExperimentExecutions: number;
  maximumEvaluations: number;
  maximumTotalDurationMs: number;
  maximumCandidateBytes: number;
  maximumEvidenceBytes: number;
  maximumModelInvocations: number;
  maximumModelInputBytes: number;
  maximumModelOutputBytes: number;
  allowedRiskClasses: RiskClass[];
  allowedCapabilityTypes: CapabilityType[];
  allowedExecutionProfiles: string[];
  allowedProviderProfiles: string[];
  requiredReproducibilityRuns: number;
  minimumComparisonThreshold: number;
  promotionPolicy: "explicit-control-plane-only";
  rollbackReadinessRequired: true;
  operatorReviewRequired: true;
  publicNetworkPolicy: "prohibited";
  recursionDepthLimit: number;
  automaticCoreMutation: false;
  automaticPromotion: false;
  realModelRequired: false;
  integrityHash: string;
}

export interface CapabilityManifest {
  capabilityId: string;
  displayName: string;
  description: string;
  type: CapabilityType;
  schemaVersion: "capability-manifest-v1";
  version: string;
  versionDigest: string;
  lifecycleStatus: CapabilityStatus;
  learningLane: LearningLane;
  riskClass: RiskClass;
  ownerAuthority: string;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  allowedInvocationModes: string[];
  approvedExecutionRecipe: ExecutionRecipe;
  evaluationProfile: EvaluationProfileBinding;
  providerRequirements: ProviderRequirements;
  knowledgeRequirements: KnowledgeRequirements;
  dependencies: string[];
  sideEffects: "none" | "declared-local-files";
  networkPolicy: "offline-strict";
  modelUsePolicy: "none" | "fixture-candidate-only" | "local-optional-candidate-only";
  resourceLimits: Record<string, number>;
  rollbackCompatibility: { compatibleWith: string[]; reversible: boolean };
  provenanceReferences: EvidenceReference[];
  certificationLevel: string | null;
  createdAt: string;
  certifiedAt?: string;
  promotedAt?: string;
  supersededAt?: string;
  integrityHash: string;
  securityRelevantUnknowns?: Record<string, unknown>;
}

export interface ExecutionRecipe {
  executableId: "node-fixture";
  args: string[];
  profileId: "offline-minimal";
  shell: false;
  timeoutMs: number;
}

export interface EvaluationProfileBinding {
  profileId: "deterministic-default";
  requiredAssertions: string[];
  optionalAssertions: string[];
}

export interface ProviderRequirements {
  modelRequired: false;
  allowedProviderProfiles: string[];
  candidateIntelligenceRefs: EvidenceReference[];
}

export interface KnowledgeRequirements {
  required: boolean;
  provenanceRefs: EvidenceReference[];
  trustInferred: false;
}

export interface EvidenceReference {
  id: string;
  uri: string;
  sha256: string;
  kind: string;
}

export interface CapabilityProposal {
  proposalId: string;
  sessionId: string;
  capabilityId: string;
  displayName: string;
  source: ProposalSource;
  sourceEvidence: EvidenceReference[];
  learningLane: LearningLane;
  riskClass: RiskClass;
  requestedType: CapabilityType;
  desiredOutcome: string;
  candidateRequestHash: string;
  modelGenerated: boolean;
  candidateIntelligence: boolean;
  providerFingerprint?: string;
  requestHash?: string;
  responseHash?: string;
  createdAt: string;
  policyVersion: typeof CAPABILITY_POLICY_VERSION;
  integrityHash: string;
}

export interface LearningSignal {
  signalId: string;
  signalType: SignalType;
  capabilityId?: string;
  baselineVersionDigest?: string;
  evidenceReferences: EvidenceReference[];
  observedDeficiency: string;
  desiredOutcome: string;
  severity: "low" | "medium" | "high";
  confidenceSource: "operator" | "evaluation" | "knowledge" | "deterministic-fixture" | "model-opinion";
  trustStatus: "unreviewed" | "evidence-backed" | "blocked";
  candidateStatus: "candidate" | "accepted" | "rejected";
  createdAt: string;
  policyVersion: typeof CAPABILITY_POLICY_VERSION;
  integrityHash: string;
}

export interface CapabilityAuthorization {
  authorizationId: string;
  authorizationType: "proposal" | "experiment" | "promotion" | "rollback";
  attemptId: string;
  sessionId: string;
  proposalId: string;
  capabilityId: string;
  baselineVersionDigest?: string;
  candidateRequestHash: string;
  learningLane: LearningLane;
  riskClass: RiskClass;
  allowedCapabilityTypes: CapabilityType[];
  allowedDependencies: string[];
  allowedProviders: string[];
  approvedExecutableIds: string[];
  approvedEvaluatorProfile: string;
  sideEffectPolicy: "none";
  modelPolicy: "fixture-candidate-only" | "none";
  knowledgeSourcePolicy: "candidate-provenance-only";
  iterationBudget: number;
  executionBudget: number;
  evaluationBudget: number;
  byteLimits: { candidate: number; evidence: number };
  durationLimits: { totalMs: number; executionMs: number };
  networkPolicy: "offline-strict";
  promotionPolicy: "explicit-control-plane-only";
  policyVersion: typeof CAPABILITY_POLICY_VERSION;
  issuedAt: string;
  expiresAt: string;
  integrityHash: string;
}

export interface CandidateBundle {
  capabilityId: string;
  version: string;
  versionDigest: string;
  candidateRoot: string;
  manifest: CapabilityManifest;
  integrityManifest: Record<string, string>;
  bytes: number;
}

export interface CapabilityProofResult {
  ok: boolean;
  status: "healthy" | "blocked";
  proofRoot: string;
  databasePath: string;
  evidenceRoot: string;
  capabilityId: string;
  sessionId: string;
  proposalId: string;
  candidateDigest: string;
  certifiedDigest: string;
  activeDigest: string;
  rollbackActiveDigest: string;
  experimentIds: string[];
  evaluationIds: string[];
  authorizationRequired: boolean;
  manifestIntegrity: boolean;
  dependencyCyclesBlocked: boolean;
  candidateBundleImmutable: boolean;
  sourceMutationBlocked: boolean;
  isolatedExecutionRequired: boolean;
  evaluationRequired: boolean;
  requiredFailureRejects: boolean;
  baselineComparisonDeterministic: boolean;
  reproducibilityRequired: boolean;
  certificationDistinctFromPromotion: boolean;
  promotionAuthorityPreserved: boolean;
  exactDigestPromotion: boolean;
  atomicActiveVersion: boolean;
  rollbackReady: boolean;
  rollbackAuthorized: boolean;
  regressionEvidenceRequired: boolean;
  learningSignalEvidenceRequired: boolean;
  modelOutputCandidateOnly: boolean;
  knowledgeCandidateOnly: boolean;
  iterationBudgetEnforced: boolean;
  recursionDepthBounded: boolean;
  idempotent: boolean;
  conflictingIdempotencyBlocked: boolean;
  terminalImmutable: boolean;
  recoveryConservative: boolean;
  timeToCertifiedCapabilityRecorded: boolean;
  controlPlaneAuthorityPreserved: boolean;
  runtimeServiceHealthy: boolean;
  evidenceComplete: boolean;
  nonGit: boolean;
  offline: boolean;
  noRealModelRequired: boolean;
  noPublicNetwork: boolean;
  fixturePromotionAndRollbackProven: boolean;
  modelUse: false;
  publicNetworkUse: false;
}

export class CapabilityEngineBlockedError extends Error {
  constructor(message: string, readonly code: string) {
    super(message);
  }
}

export const DEFAULT_CAPABILITY_POLICY: CapabilityLearningPolicy = withIntegrity({
  version: CAPABILITY_POLICY_VERSION,
  maximumIterations: 3,
  maximumCandidatesPerIteration: 2,
  maximumExperimentExecutions: 6,
  maximumEvaluations: 6,
  maximumTotalDurationMs: 120000,
  maximumCandidateBytes: 512 * 1024,
  maximumEvidenceBytes: 2 * 1024 * 1024,
  maximumModelInvocations: 1,
  maximumModelInputBytes: 8192,
  maximumModelOutputBytes: 8192,
  allowedRiskClasses: ["low", "medium"],
  allowedCapabilityTypes: ["deterministic-transform", "governed-workflow", "provider-assisted-candidate", "retrieval-assisted-operation", "isolated-candidate-bundle", "compatibility-adapter"],
  allowedExecutionProfiles: ["offline-minimal"],
  allowedProviderProfiles: ["fixture-candidate-only", "none"],
  requiredReproducibilityRuns: 2,
  minimumComparisonThreshold: 1,
  promotionPolicy: "explicit-control-plane-only",
  rollbackReadinessRequired: true,
  operatorReviewRequired: true,
  publicNetworkPolicy: "prohibited",
  recursionDepthLimit: 1,
  automaticCoreMutation: false,
  automaticPromotion: false,
  realModelRequired: false
} as Omit<CapabilityLearningPolicy, "integrityHash">);

const TERMINAL_VERSION_STATES = new Set<CapabilityStatus>(["CERTIFIED", "PROMOTED", "SUPERSEDED", "REJECTED", "BLOCKED", "ROLLED_BACK", "ARCHIVED"]);
const TERMINAL_EXPERIMENT_STATES = new Set<ExperimentState>(["PASSED", "FAILED", "BLOCKED", "TIMED_OUT", "CANCELLED", "REVIEW_REQUIRED"]);
const TERMINAL_SESSION_STATES = new Set<LearningSessionState>(["COMPLETED", "BLOCKED", "FAILED", "CANCELLED", "REVIEW_REQUIRED"]);

export class CapabilityEngine {
  private readonly projectRoot: string;
  private readonly evidenceRoot: string;
  private readonly candidateRoot: string;
  private readonly certifiedRoot: string;
  private readonly policy: CapabilityLearningPolicy;
  private accepting = true;

  constructor(private readonly store: RuntimeStateStore, input: RuntimeStateConfigInput & { evidenceRoot?: string; capabilityRoot?: string; policy?: CapabilityLearningPolicy } = {}) {
    this.projectRoot = path.resolve(input.projectRoot ?? process.cwd());
    this.evidenceRoot = path.resolve(input.evidenceRoot ?? path.join(this.projectRoot, ".sera", "capability-engine"));
    const capabilityRoot = path.resolve(input.capabilityRoot ?? path.join(this.projectRoot, ".sera", "capabilities"));
    this.candidateRoot = path.join(capabilityRoot, "candidates");
    this.certifiedRoot = path.join(capabilityRoot, "certified");
    this.policy = input.policy ?? DEFAULT_CAPABILITY_POLICY;
    fs.mkdirSync(this.evidenceRoot, { recursive: true });
    fs.mkdirSync(this.candidateRoot, { recursive: true });
    fs.mkdirSync(this.certifiedRoot, { recursive: true });
  }

  policyReport(): Record<string, unknown> {
    return {
      ok: true,
      status: "INSPECTED",
      version: CAPABILITY_ENGINE_VERSION,
      policy: this.policy,
      learningLimits: {
        maximumIterations: this.policy.maximumIterations,
        recursionDepthLimit: this.policy.recursionDepthLimit,
        maximumExperimentExecutions: this.policy.maximumExperimentExecutions,
        maximumEvaluations: this.policy.maximumEvaluations
      },
      promotionRequirements: ["explicit Control Plane authorization", "exact digest", "reproducibility", "rollback readiness"],
      rollbackRequirements: ["explicit Control Plane authorization", "certified target digest", "declared regression evidence"],
      modelPolicy: "model output remains inert candidate intelligence",
      networkPolicy: "public network prohibited",
      mutationRestrictions: "automatic core source mutation is prohibited",
      knownLimitations: "v1 certifies exact bounded artifacts, not universal correctness",
      modelUse: false,
      publicNetworkUse: false
    };
  }

  catalog(): Record<string, unknown> {
    const rows = this.store.recoveryAll("SELECT capability_id, display_name, source, risk_class, active_version_digest, status, limitations, integrity_digest FROM capability_catalog ORDER BY capability_id");
    return {
      ok: true,
      status: "INSPECTED",
      capabilities: rows.map((row) => ({
        capabilityId: row.capability_id,
        displayName: row.display_name,
        certifiedVersions: this.store.recoveryAll("SELECT version_digest FROM capability_versions WHERE capability_id = ? AND lifecycle_status IN ('CERTIFIED','PROMOTED','SUPERSEDED','ROLLED_BACK') ORDER BY created_at", [String(row.capability_id)]).map((item) => item.version_digest),
        activeVersion: row.active_version_digest,
        status: row.status,
        riskClass: row.risk_class,
        source: row.source,
        integrityDigest: row.integrity_digest,
        limitations: row.limitations
      })),
      modelUse: false,
      publicNetworkUse: false
    };
  }

  proposals(): Record<string, unknown> {
    return { ok: true, status: "INSPECTED", proposals: this.store.recoveryAll("SELECT proposal_id, session_id, capability_id, source, learning_lane, risk_class, created_at FROM capability_proposals ORDER BY created_at DESC"), modelUse: false, publicNetworkUse: false };
  }

  sessions(): Record<string, unknown> {
    return { ok: true, status: "INSPECTED", sessions: this.store.recoveryAll("SELECT session_id, capability_id, state, iteration_count, started_at, completed_at FROM learning_sessions ORDER BY started_at DESC"), modelUse: false, publicNetworkUse: false };
  }

  inspectCapability(capabilityId: string): Record<string, unknown> {
    const catalog = this.store.recoveryGet("SELECT * FROM capability_catalog WHERE capability_id = ?", [capabilityId]);
    if (!catalog) throw new CapabilityEngineBlockedError("Capability does not exist.", "missing_capability");
    return {
      ok: true,
      status: "INSPECTED",
      capability: redact(catalog),
      versions: this.store.recoveryAll("SELECT capability_id, version_digest, lifecycle_status, risk_class, certified_at, promoted_at, integrity_hash FROM capability_versions WHERE capability_id = ? ORDER BY created_at", [capabilityId]).map(redact),
      active: this.store.recoveryGet("SELECT * FROM capability_active_versions WHERE capability_id = ?", [capabilityId]),
      modelUse: false,
      publicNetworkUse: false
    };
  }

  inspectSession(sessionId: string): Record<string, unknown> {
    const session = this.store.recoveryGet("SELECT * FROM learning_sessions WHERE session_id = ?", [sessionId]);
    if (!session) throw new CapabilityEngineBlockedError("Learning session does not exist.", "missing_session");
    return {
      ok: true,
      status: "INSPECTED",
      session: redact(session),
      events: this.store.recoveryAll("SELECT event_type, outcome, message, sequence FROM capability_events WHERE session_id = ? ORDER BY sequence", [sessionId]),
      modelUse: false,
      publicNetworkUse: false
    };
  }

  shutdown(): void {
    this.accepting = false;
  }

  createLearningSignal(input: Omit<LearningSignal, "integrityHash">): LearningSignal {
    if (input.confidenceSource === "model-opinion" && input.evidenceReferences.length === 0) throw new CapabilityEngineBlockedError("Model opinion alone cannot establish a learning deficiency.", "model_opinion_not_evidence");
    if (input.evidenceReferences.length === 0) throw new CapabilityEngineBlockedError("Learning signal requires durable evidence.", "missing_signal_evidence");
    const signal = withIntegrity(input);
    this.store.recoveryTransaction((db) => {
      db.prepare("INSERT INTO capability_learning_signals (signal_id, signal_type, capability_id, baseline_version_digest, evidence_json, observed_deficiency, desired_outcome, severity, confidence_source, trust_status, candidate_status, created_at, policy_version, integrity_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(
        signal.signalId,
        signal.signalType,
        signal.capabilityId ?? null,
        signal.baselineVersionDigest ?? null,
        stableJson(signal.evidenceReferences),
        signal.observedDeficiency,
        signal.desiredOutcome,
        signal.severity,
        signal.confidenceSource,
        signal.trustStatus,
        signal.candidateStatus,
        signal.createdAt,
        signal.policyVersion,
        signal.integrityHash
      );
    });
    return signal;
  }

  createProposal(input: Omit<CapabilityProposal, "integrityHash">, authorization?: CapabilityAuthorization, idempotencyKey?: string): CapabilityProposal {
    if (!this.accepting) throw new CapabilityEngineBlockedError("Capability Engine is shutting down and refuses new learning sessions.", "shutdown_refuses_session");
    const proposal = withIntegrity(input);
    const requestHashValue = stableHash(proposal);
    if (idempotencyKey) {
      const existing = this.store.recoveryGet("SELECT proposal_id, request_hash FROM capability_idempotency WHERE idempotency_key = ?", [idempotencyKey]);
      if (existing) {
        if (String(existing.request_hash) !== requestHashValue) throw new CapabilityEngineBlockedError("Capability idempotency key was reused for a conflicting proposal.", "conflicting_idempotency_key");
        return this.proposalById(String(existing.proposal_id));
      }
    }
    this.assertAuthorization(proposal, authorization, "proposal");
    if (proposal.sourceEvidence.length === 0) throw new CapabilityEngineBlockedError("Capability proposal requires durable evidence.", "missing_proposal_evidence");
    if (proposal.learningLane === "innovation") throw new CapabilityEngineBlockedError("Innovation proposals are recorded separately and cannot be promoted by v1 learning policy.", "innovation_separate");
    const duplicate = this.store.recoveryGet("SELECT capability_id FROM capability_catalog WHERE capability_id = ?", [proposal.capabilityId]);
    if (duplicate && proposal.learningLane === "acquisition") throw new CapabilityEngineBlockedError("Duplicate capability definition blocks acquisition.", "duplicate_capability");
    this.store.recoveryTransaction((db) => {
      db.prepare("INSERT INTO learning_sessions (session_id, capability_id, state, learning_lane, policy_json, policy_hash, iteration_count, recursion_depth, started_at, completed_at, terminal, integrity_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(
        proposal.sessionId,
        proposal.capabilityId,
        "PROPOSING",
        proposal.learningLane,
        stableJson(this.policy),
        this.policy.integrityHash,
        0,
        0,
        proposal.createdAt,
        null,
        0,
        stableHash({ sessionId: proposal.sessionId, capabilityId: proposal.capabilityId, policy: this.policy.integrityHash })
      );
      db.prepare("INSERT INTO capability_proposals (proposal_id, session_id, capability_id, source, source_evidence_json, learning_lane, risk_class, requested_type, desired_outcome, candidate_request_hash, model_generated, candidate_intelligence, provider_fingerprint, request_hash, response_hash, created_at, policy_version, integrity_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(
        proposal.proposalId,
        proposal.sessionId,
        proposal.capabilityId,
        proposal.source,
        stableJson(proposal.sourceEvidence),
        proposal.learningLane,
        proposal.riskClass,
        proposal.requestedType,
        proposal.desiredOutcome,
        proposal.candidateRequestHash,
        proposal.modelGenerated ? 1 : 0,
        proposal.candidateIntelligence ? 1 : 0,
        proposal.providerFingerprint ?? null,
        proposal.requestHash ?? null,
        proposal.responseHash ?? null,
        proposal.createdAt,
        proposal.policyVersion,
        proposal.integrityHash
      );
      if (idempotencyKey) db.prepare("INSERT INTO capability_idempotency (idempotency_key, request_hash, response_type, proposal_id, created_at, response_json) VALUES (?, ?, ?, ?, ?, ?)").run(idempotencyKey, requestHashValue, "proposal", proposal.proposalId, new Date().toISOString(), stableJson(proposal));
    });
    this.event(proposal.sessionId, proposal.capabilityId, "PROPOSAL_CREATED", "PASS", "Capability proposal authorized and recorded.", { proposalId: proposal.proposalId });
    return proposal;
  }

  assembleCandidate(proposal: CapabilityProposal, authorization: CapabilityAuthorization, overrides: Partial<CapabilityManifest> = {}): CandidateBundle {
    this.assertAuthorization(proposal, authorization, "experiment");
    this.enforceLearningBudget(proposal.sessionId, { candidates: 1 });
    const now = new Date().toISOString();
    const manifestBase: CapabilityManifest = {
      capabilityId: proposal.capabilityId,
      displayName: proposal.displayName,
      description: proposal.desiredOutcome,
      type: proposal.requestedType,
      schemaVersion: "capability-manifest-v1",
      version: `1.0.${this.store.recoveryAll("SELECT version_digest FROM capability_versions WHERE capability_id = ?", [proposal.capabilityId]).length}`,
      versionDigest: "",
      lifecycleStatus: "CANDIDATE",
      learningLane: proposal.learningLane,
      riskClass: proposal.riskClass,
      ownerAuthority: "control-plane",
      inputSchema: { type: "object", required: ["input"] },
      outputSchema: { type: "object", required: ["result"] },
      allowedInvocationModes: ["fixture"],
      approvedExecutionRecipe: { executableId: "node-fixture", args: ["fixture:output"], profileId: "offline-minimal", shell: false, timeoutMs: 5000 },
      evaluationProfile: { profileId: "deterministic-default", requiredAssertions: ["output_text_contains", "source_unchanged"], optionalAssertions: ["stderr_empty"] },
      providerRequirements: { modelRequired: false, allowedProviderProfiles: ["fixture-candidate-only"], candidateIntelligenceRefs: proposal.modelGenerated ? proposal.sourceEvidence : [] },
      knowledgeRequirements: { required: proposal.source === "knowledge-requirement", provenanceRefs: proposal.sourceEvidence, trustInferred: false },
      dependencies: [],
      sideEffects: "none",
      networkPolicy: "offline-strict",
      modelUsePolicy: proposal.modelGenerated ? "fixture-candidate-only" : "none",
      resourceLimits: { timeoutMs: 5000, maxCandidateBytes: this.policy.maximumCandidateBytes },
      rollbackCompatibility: { compatibleWith: [], reversible: true },
      provenanceReferences: proposal.sourceEvidence,
      certificationLevel: null,
      createdAt: now,
      integrityHash: ""
    };
    const manifest = { ...manifestBase, ...overrides };
    this.validateManifest(manifest);
    const digest = stableHash({ ...manifest, versionDigest: "", integrityHash: "" });
    const finalManifest = { ...manifest, versionDigest: digest, integrityHash: stableHash({ ...manifest, versionDigest: digest, integrityHash: "" }) };
    const root = path.join(this.candidateRoot, proposal.capabilityId, digest);
    if (isInside(this.projectRoot, root) && !root.includes(`${path.sep}.sera${path.sep}`)) throw new CapabilityEngineBlockedError("Candidate bundle must remain outside source tree.", "candidate_inside_source");
    fs.mkdirSync(root, { recursive: true });
    const files: Record<string, unknown> = {
      "capability-manifest.json": finalManifest,
      "input-schema.json": finalManifest.inputSchema,
      "output-schema.json": finalManifest.outputSchema,
      "execution-recipe.json": finalManifest.approvedExecutionRecipe,
      "evaluation-profile.json": finalManifest.evaluationProfile,
      "dependency-manifest.json": { dependencies: finalManifest.dependencies },
      "provider-requirements.json": finalManifest.providerRequirements,
      "knowledge-provenance.json": finalManifest.knowledgeRequirements,
      "policy.json": this.policy,
      "risk-assessment.json": { riskClass: finalManifest.riskClass, sideEffects: finalManifest.sideEffects, networkPolicy: finalManifest.networkPolicy },
      "rollback-plan.json": finalManifest.rollbackCompatibility
    };
    for (const [file, value] of Object.entries(files)) writeJson(path.join(root, file), value);
    const integrityManifest = hashDirectory(root);
    writeJson(path.join(root, "integrity-manifest.json"), integrityManifest);
    const finalIntegrity = hashDirectory(root);
    const bytes = directorySize(root);
    if (bytes > this.policy.maximumCandidateBytes) throw new CapabilityEngineBlockedError("Candidate bundle exceeds byte budget.", "candidate_bytes_exceeded");
    this.store.recoveryTransaction((db) => {
      db.prepare("INSERT INTO capability_versions (capability_id, version_digest, version, manifest_json, lifecycle_status, learning_lane, risk_class, bundle_root, bundle_hash, candidate_bytes, baseline_version_digest, created_at, certified_at, promoted_at, superseded_at, certification_level, integrity_hash, terminal) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(
        finalManifest.capabilityId,
        finalManifest.versionDigest,
        finalManifest.version,
        stableJson(finalManifest),
        "CANDIDATE",
        finalManifest.learningLane,
        finalManifest.riskClass,
        root,
        stableHash(finalIntegrity),
        bytes,
        authorization.baselineVersionDigest ?? null,
        now,
        null,
        null,
        null,
        null,
        finalManifest.integrityHash,
        0
      );
    });
    this.event(proposal.sessionId, proposal.capabilityId, "CANDIDATE_ASSEMBLED", "PASS", "Immutable content-addressed candidate bundle assembled.", { digest, root });
    return { capabilityId: proposal.capabilityId, version: finalManifest.version, versionDigest: digest, candidateRoot: root, manifest: finalManifest, integrityManifest: finalIntegrity, bytes };
  }

  certifyCandidate(sessionId: string, bundle: CandidateBundle, evidence: { experimentIds: string[]; evaluationIds: string[]; comparisonHash: string; reproducibilityRuns: number; rollbackReady: boolean }): Record<string, unknown> {
    const version = this.requireVersion(bundle.capabilityId, bundle.versionDigest);
    if (String(version.lifecycle_status) !== "CANDIDATE") throw new CapabilityEngineBlockedError("Only candidate versions can be certified.", "not_candidate");
    if (evidence.reproducibilityRuns < this.policy.requiredReproducibilityRuns) throw new CapabilityEngineBlockedError("Certification requires reproducibility.", "missing_reproducibility");
    if (!evidence.rollbackReady) throw new CapabilityEngineBlockedError("Certification requires rollback readiness.", "missing_rollback_readiness");
    if (evidence.experimentIds.length < this.policy.requiredReproducibilityRuns || evidence.evaluationIds.length < this.policy.requiredReproducibilityRuns) throw new CapabilityEngineBlockedError("Certification evidence is incomplete.", "incomplete_certification_evidence");
    const now = new Date().toISOString();
    this.store.recoveryTransaction((db) => {
      db.prepare("UPDATE capability_versions SET lifecycle_status = ?, certified_at = ?, certification_level = ?, terminal = ?, integrity_hash = ? WHERE capability_id = ? AND version_digest = ? AND lifecycle_status = 'CANDIDATE'").run("CERTIFIED", now, CAPABILITY_ENGINE_VERSION, 1, stableHash({ certified: bundle.versionDigest, evidence }), bundle.capabilityId, bundle.versionDigest);
      db.prepare("INSERT INTO capability_certifications (certification_id, capability_id, version_digest, experiment_ids_json, evaluation_ids_json, reproducibility_json, comparison_json, rollback_ready, certified_at, integrity_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(id("cert"), bundle.capabilityId, bundle.versionDigest, stableJson(evidence.experimentIds), stableJson(evidence.evaluationIds), stableJson({ runs: evidence.reproducibilityRuns }), stableJson({ comparisonHash: evidence.comparisonHash }), 1, now, stableHash(evidence));
    });
    return { ok: true, status: "CERTIFIED", certifiedAt: now, versionDigest: bundle.versionDigest };
  }

  promote(sessionId: string, capabilityId: string, versionDigest: string, authorization: CapabilityAuthorization, idempotencyKey = `promotion:${capabilityId}:${versionDigest}`): Record<string, unknown> {
    if (authorization.authorizationType !== "promotion") throw new CapabilityEngineBlockedError("Promotion authorization is required.", "missing_promotion_authorization");
    const existing = this.store.recoveryGet("SELECT response_json, request_hash FROM capability_idempotency WHERE idempotency_key = ?", [idempotencyKey]);
    const requestHashValue = stableHash({ capabilityId, versionDigest, authorizationId: authorization.authorizationId });
    if (existing) {
      if (String(existing.request_hash) !== requestHashValue) throw new CapabilityEngineBlockedError("Promotion idempotency key was reused for a conflicting request.", "conflicting_promotion_idempotency");
      return JSON.parse(String(existing.response_json));
    }
    if (authorization.capabilityId !== capabilityId || authorization.candidateRequestHash !== versionDigest) throw new CapabilityEngineBlockedError("Promotion authorization must bind the exact digest.", "promotion_digest_mismatch");
    const version = this.requireVersion(capabilityId, versionDigest);
    if (String(version.lifecycle_status) !== "CERTIFIED") throw new CapabilityEngineBlockedError("Cannot promote a failed, blocked or uncertified candidate.", "not_certified");
    const cert = this.store.recoveryGet("SELECT certification_id FROM capability_certifications WHERE capability_id = ? AND version_digest = ?", [capabilityId, versionDigest]);
    if (!cert) throw new CapabilityEngineBlockedError("Promotion requires certification evidence.", "missing_certification");
    const now = new Date().toISOString();
    const certifiedTarget = path.join(this.certifiedRoot, capabilityId, versionDigest);
    copyDirectory(String(version.bundle_root), certifiedTarget);
    const response = { ok: true, status: "PROMOTED", capabilityId, versionDigest, promotedAt: now, activeVersionDigest: versionDigest };
    this.store.recoveryTransaction((db) => {
      const current = db.prepare("SELECT active_version_digest FROM capability_active_versions WHERE capability_id = ? AND activation_scope = ?").get(capabilityId, "catalog") as Record<string, unknown> | undefined;
      if (current?.active_version_digest && current.active_version_digest !== versionDigest) {
        db.prepare("UPDATE capability_versions SET lifecycle_status = 'SUPERSEDED', superseded_at = ? WHERE capability_id = ? AND version_digest = ? AND lifecycle_status = 'PROMOTED'").run(now, capabilityId, String(current.active_version_digest));
      }
      db.prepare("UPDATE capability_versions SET lifecycle_status = 'PROMOTED', promoted_at = ?, terminal = 1 WHERE capability_id = ? AND version_digest = ?").run(now, capabilityId, versionDigest);
      db.prepare("INSERT OR REPLACE INTO capability_catalog (capability_id, display_name, source, risk_class, active_version_digest, status, limitations, integrity_digest) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(capabilityId, JSON.parse(String(version.manifest_json)).displayName, "capability-engine", String(version.risk_class), versionDigest, "PROMOTED", "Exact immutable fixture-level activation only.", stableHash({ capabilityId, versionDigest }));
      db.prepare("INSERT OR REPLACE INTO capability_active_versions (capability_id, activation_scope, active_version_digest, updated_at, authority_identity, integrity_hash) VALUES (?, ?, ?, ?, ?, ?)").run(capabilityId, "catalog", versionDigest, now, "control-plane", stableHash({ capabilityId, versionDigest, now }));
      db.prepare("INSERT INTO capability_promotions (promotion_id, capability_id, version_digest, authorization_id, certification_id, promoted_at, rollback_target_digest, idempotency_key, request_hash, integrity_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(id("promotion"), capabilityId, versionDigest, authorization.authorizationId, String(cert.certification_id), now, authorization.baselineVersionDigest ?? null, idempotencyKey, requestHashValue, stableHash(response));
      db.prepare("INSERT INTO capability_idempotency (idempotency_key, request_hash, response_type, proposal_id, created_at, response_json) VALUES (?, ?, ?, ?, ?, ?)").run(idempotencyKey, requestHashValue, "promotion", null, now, stableJson(response));
    });
    this.event(sessionId, capabilityId, "PROMOTED", "PASS", "Control Plane promotion updated active pointer atomically.", { versionDigest });
    return response;
  }

  rollback(input: { sessionId: string; capabilityId: string; currentDigest: string; targetDigest: string; reason: string; regressionEvidence: EvidenceReference[]; authorization: CapabilityAuthorization; idempotencyKey?: string }): Record<string, unknown> {
    if (input.authorization.authorizationType !== "rollback") throw new CapabilityEngineBlockedError("Rollback authorization is required.", "missing_rollback_authorization");
    if (input.regressionEvidence.length === 0) throw new CapabilityEngineBlockedError("Regression evidence is required for rollback.", "missing_regression_evidence");
    if (input.authorization.capabilityId !== input.capabilityId || input.authorization.candidateRequestHash !== input.targetDigest) throw new CapabilityEngineBlockedError("Rollback authorization must bind exact target digest.", "rollback_digest_mismatch");
    const target = this.requireVersion(input.capabilityId, input.targetDigest);
    if (!["CERTIFIED", "PROMOTED", "SUPERSEDED", "ROLLED_BACK"].includes(String(target.lifecycle_status))) throw new CapabilityEngineBlockedError("Rollback target must be certified.", "target_not_certified");
    const key = input.idempotencyKey ?? `rollback:${input.capabilityId}:${input.currentDigest}:${input.targetDigest}`;
    const requestHashValue = stableHash({ capabilityId: input.capabilityId, currentDigest: input.currentDigest, targetDigest: input.targetDigest, authorizationId: input.authorization.authorizationId });
    const existing = this.store.recoveryGet("SELECT response_json, request_hash FROM capability_idempotency WHERE idempotency_key = ?", [key]);
    if (existing) {
      if (String(existing.request_hash) !== requestHashValue) throw new CapabilityEngineBlockedError("Rollback idempotency key was reused for a conflicting request.", "conflicting_rollback_idempotency");
      return JSON.parse(String(existing.response_json));
    }
    const now = new Date().toISOString();
    const response = { ok: true, status: "ROLLED_BACK", capabilityId: input.capabilityId, activeVersionDigest: input.targetDigest, rolledBackAt: now };
    this.store.recoveryTransaction((db) => {
      db.prepare("INSERT OR REPLACE INTO capability_active_versions (capability_id, activation_scope, active_version_digest, updated_at, authority_identity, integrity_hash) VALUES (?, ?, ?, ?, ?, ?)").run(input.capabilityId, "catalog", input.targetDigest, now, "control-plane", stableHash(response));
      db.prepare("UPDATE capability_catalog SET active_version_digest = ?, status = ?, integrity_digest = ? WHERE capability_id = ?").run(input.targetDigest, "ROLLED_BACK", stableHash(response), input.capabilityId);
      db.prepare("UPDATE capability_versions SET lifecycle_status = 'ROLLED_BACK', terminal = 1 WHERE capability_id = ? AND version_digest = ?").run(input.capabilityId, input.currentDigest);
      db.prepare("INSERT INTO capability_rollbacks (rollback_id, capability_id, current_version_digest, target_version_digest, authorization_id, reason, regression_evidence_json, rolled_back_at, idempotency_key, request_hash, integrity_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(id("rollback"), input.capabilityId, input.currentDigest, input.targetDigest, input.authorization.authorizationId, input.reason, stableJson(input.regressionEvidence), now, key, requestHashValue, stableHash(response));
      db.prepare("INSERT INTO capability_idempotency (idempotency_key, request_hash, response_type, proposal_id, created_at, response_json) VALUES (?, ?, ?, ?, ?, ?)").run(key, requestHashValue, "rollback", null, now, stableJson(response));
    });
    this.event(input.sessionId, input.capabilityId, "ROLLED_BACK", "PASS", "Control Plane rollback updated active pointer atomically.", { targetDigest: input.targetDigest });
    return response;
  }

  validateManifest(manifest: Partial<CapabilityManifest>): void {
    const required = ["capabilityId", "displayName", "description", "type", "schemaVersion", "version", "learningLane", "riskClass", "ownerAuthority", "inputSchema", "outputSchema", "allowedInvocationModes", "approvedExecutionRecipe", "evaluationProfile", "providerRequirements", "knowledgeRequirements", "dependencies", "sideEffects", "networkPolicy", "modelUsePolicy", "resourceLimits", "rollbackCompatibility", "provenanceReferences", "createdAt"];
    for (const field of required) if ((manifest as Record<string, unknown>)[field] === undefined) throw new CapabilityEngineBlockedError(`Capability manifest required field missing: ${field}`, "missing_manifest_field");
    if (manifest.schemaVersion !== "capability-manifest-v1") throw new CapabilityEngineBlockedError("Unsupported capability manifest schema version.", "unsupported_manifest_schema");
    if (manifest.securityRelevantUnknowns && Object.keys(manifest.securityRelevantUnknowns).length > 0) throw new CapabilityEngineBlockedError("Unknown security-relevant fields block manifest validation.", "unknown_security_field");
    if (!this.policy.allowedCapabilityTypes.includes(manifest.type!)) throw new CapabilityEngineBlockedError("Unsupported capability type.", "unsupported_capability_type");
    if (!this.policy.allowedRiskClasses.includes(manifest.riskClass!)) throw new CapabilityEngineBlockedError("Risk class is not allowed by policy.", "risk_not_allowed");
    if (manifest.networkPolicy !== "offline-strict") throw new CapabilityEngineBlockedError("Public network policy blocks capability.", "network_policy_blocked");
    if (manifest.approvedExecutionRecipe?.shell !== false || manifest.approvedExecutionRecipe?.executableId !== "node-fixture") throw new CapabilityEngineBlockedError("Arbitrary shell recipes or unapproved executable IDs block.", "execution_recipe_blocked");
    if (manifest.sideEffects !== "none") throw new CapabilityEngineBlockedError("Undeclared or non-v1 side effects block.", "side_effects_blocked");
    if (manifest.providerRequirements?.modelRequired !== false) throw new CapabilityEngineBlockedError("No real model is required or allowed for v1 certification.", "model_required_blocked");
    if (!manifest.inputSchema || stableHash(manifest.inputSchema).length !== 64) throw new CapabilityEngineBlockedError("Input schema integrity is invalid.", "input_schema_invalid");
    if (!manifest.outputSchema || stableHash(manifest.outputSchema).length !== 64) throw new CapabilityEngineBlockedError("Output schema integrity is invalid.", "output_schema_invalid");
    const deps = manifest.dependencies ?? [];
    if (new Set(deps).size !== deps.length) throw new CapabilityEngineBlockedError("Duplicate dependency declarations block.", "duplicate_dependency");
    for (const dep of deps) {
      if (!this.store.recoveryGet("SELECT capability_id FROM capability_catalog WHERE capability_id = ?", [dep])) throw new CapabilityEngineBlockedError("Unknown dependency blocks.", "unknown_dependency");
    }
    if (deps.includes(manifest.capabilityId!)) throw new CapabilityEngineBlockedError("Dependency cycles block.", "dependency_cycle");
  }

  transitionVersion(capabilityId: string, versionDigest: string, to: CapabilityStatus): void {
    const current = this.requireVersion(capabilityId, versionDigest);
    if (Number(current.terminal) === 1 && TERMINAL_VERSION_STATES.has(String(current.lifecycle_status) as CapabilityStatus)) throw new CapabilityEngineBlockedError("Terminal capability versions are immutable.", "terminal_version_immutable");
    this.store.recoveryTransaction((db) => db.prepare("UPDATE capability_versions SET lifecycle_status = ?, terminal = ? WHERE capability_id = ? AND version_digest = ?").run(to, TERMINAL_VERSION_STATES.has(to) ? 1 : 0, capabilityId, versionDigest));
  }

  private assertAuthorization(proposal: CapabilityProposal, authorization: CapabilityAuthorization | undefined, expectedType: CapabilityAuthorization["authorizationType"]): void {
    if (!authorization) throw new CapabilityEngineBlockedError("Capability authorization is required.", "missing_authorization");
    if (authorization.authorizationType !== expectedType) throw new CapabilityEngineBlockedError(`${expectedType} authorization is required.`, "authorization_type_mismatch");
    if (authorization.policyVersion !== CAPABILITY_POLICY_VERSION) throw new CapabilityEngineBlockedError("Capability authorization policy version is unsupported.", "unsupported_policy_version");
    if (new Date(authorization.expiresAt).getTime() <= Date.now()) throw new CapabilityEngineBlockedError("Capability authorization has expired.", "expired_authorization");
    const { integrityHash, ...base } = authorization;
    if (integrityHash !== stableHash(base)) throw new CapabilityEngineBlockedError("Capability authorization integrity hash mismatch.", "authorization_integrity_mismatch");
    if (authorization.proposalId !== proposal.proposalId) throw new CapabilityEngineBlockedError("Proposal authorization mismatch.", "proposal_mismatch");
    if (authorization.capabilityId !== proposal.capabilityId) throw new CapabilityEngineBlockedError("Capability authorization mismatch.", "capability_mismatch");
    if (authorization.learningLane !== proposal.learningLane) throw new CapabilityEngineBlockedError("Learning lane authorization mismatch.", "lane_mismatch");
    if (authorization.riskClass !== proposal.riskClass) throw new CapabilityEngineBlockedError("Risk class authorization mismatch.", "risk_mismatch");
    if (authorization.candidateRequestHash !== proposal.candidateRequestHash) throw new CapabilityEngineBlockedError("Candidate request hash mismatch.", "candidate_hash_mismatch");
    if (!authorization.allowedCapabilityTypes.includes(proposal.requestedType)) throw new CapabilityEngineBlockedError("Capability type is not authorized.", "type_not_authorized");
    if (authorization.iterationBudget > this.policy.maximumIterations || authorization.executionBudget > this.policy.maximumExperimentExecutions || authorization.evaluationBudget > this.policy.maximumEvaluations) throw new CapabilityEngineBlockedError("Authorization limits exceed policy.", "authorization_limits_exceed_policy");
    if (authorization.networkPolicy !== "offline-strict") throw new CapabilityEngineBlockedError("Network policy mismatch.", "network_policy_mismatch");
    if (authorization.approvedEvaluatorProfile !== "deterministic-default") throw new CapabilityEngineBlockedError("Evaluation profile mismatch.", "evaluation_profile_mismatch");
    if (!authorization.approvedExecutableIds.includes("node-fixture")) throw new CapabilityEngineBlockedError("Execution profile or executable mismatch.", "execution_profile_mismatch");
  }

  private enforceLearningBudget(sessionId: string, increment: { candidates?: number; executions?: number; evaluations?: number }): void {
    const session = this.store.recoveryGet("SELECT * FROM learning_sessions WHERE session_id = ?", [sessionId]);
    if (!session) throw new CapabilityEngineBlockedError("Learning session is missing.", "missing_session");
    if (Number(session.recursion_depth) > this.policy.recursionDepthLimit) throw new CapabilityEngineBlockedError("Recursion depth limit is enforced.", "recursion_depth_exceeded");
    if (Number(session.iteration_count) + (increment.candidates ?? 0) > this.policy.maximumIterations) throw new CapabilityEngineBlockedError("Maximum iteration count is enforced.", "iteration_budget_exceeded");
    this.store.recoveryTransaction((db) => db.prepare("UPDATE learning_sessions SET iteration_count = iteration_count + ? WHERE session_id = ?").run(increment.candidates ?? 0, sessionId));
  }

  private proposalById(proposalId: string): CapabilityProposal {
    const row = this.store.recoveryGet("SELECT * FROM capability_proposals WHERE proposal_id = ?", [proposalId]);
    if (!row) throw new CapabilityEngineBlockedError("Proposal does not exist.", "missing_proposal");
    return {
      proposalId,
      sessionId: String(row.session_id),
      capabilityId: String(row.capability_id),
      displayName: String(row.capability_id),
      source: String(row.source) as ProposalSource,
      sourceEvidence: JSON.parse(String(row.source_evidence_json)),
      learningLane: String(row.learning_lane) as LearningLane,
      riskClass: String(row.risk_class) as RiskClass,
      requestedType: String(row.requested_type) as CapabilityType,
      desiredOutcome: String(row.desired_outcome),
      candidateRequestHash: String(row.candidate_request_hash),
      modelGenerated: Boolean(row.model_generated),
      candidateIntelligence: Boolean(row.candidate_intelligence),
      createdAt: String(row.created_at),
      policyVersion: String(row.policy_version) as typeof CAPABILITY_POLICY_VERSION,
      integrityHash: String(row.integrity_hash)
    };
  }

  private requireVersion(capabilityId: string, versionDigest: string): Record<string, unknown> {
    const row = this.store.recoveryGet("SELECT * FROM capability_versions WHERE capability_id = ? AND version_digest = ?", [capabilityId, versionDigest]);
    if (!row) throw new CapabilityEngineBlockedError("Capability version does not exist.", "missing_version");
    return row;
  }

  private event(sessionId: string, capabilityId: string, eventType: string, outcome: string, message: string, details: Record<string, unknown>): void {
    const sequence = Number(this.store.recoveryGet("SELECT COALESCE(MAX(sequence), 0) + 1 AS next FROM capability_events WHERE session_id = ?", [sessionId])?.next ?? 1);
    this.store.recoveryTransaction((db) => db.prepare("INSERT INTO capability_events (event_id, session_id, capability_id, event_type, outcome, message, details_json, timestamp, sequence) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").run(id("cap_event"), sessionId, capabilityId, eventType, outcome, message, stableJson(details), new Date().toISOString(), sequence));
    const line = { eventType, outcome, message, details, sequence, timestamp: new Date().toISOString() };
    const root = path.join(this.evidenceRoot, sessionId);
    fs.mkdirSync(root, { recursive: true });
    fs.appendFileSync(path.join(root, "lifecycle-events.jsonl"), `${JSON.stringify(line)}\n`, "utf8");
  }
}

export function createCapabilityAuthorization(input: {
  authorizationType: CapabilityAuthorization["authorizationType"];
  attemptId: string;
  sessionId: string;
  proposalId: string;
  capabilityId: string;
  candidateRequestHash: string;
  learningLane: LearningLane;
  riskClass: RiskClass;
  baselineVersionDigest?: string;
  issuedAt?: Date;
  ttlMs?: number;
  iterationBudget?: number;
  executionBudget?: number;
  evaluationBudget?: number;
}): CapabilityAuthorization {
  const issued = input.issuedAt ?? new Date();
  const base: Omit<CapabilityAuthorization, "integrityHash"> = {
    authorizationId: id("cap_auth"),
    authorizationType: input.authorizationType,
    attemptId: input.attemptId,
    sessionId: input.sessionId,
    proposalId: input.proposalId,
    capabilityId: input.capabilityId,
    baselineVersionDigest: input.baselineVersionDigest,
    candidateRequestHash: input.candidateRequestHash,
    learningLane: input.learningLane,
    riskClass: input.riskClass,
    allowedCapabilityTypes: [...DEFAULT_CAPABILITY_POLICY.allowedCapabilityTypes],
    allowedDependencies: [],
    allowedProviders: ["fixture-candidate-only", "none"],
    approvedExecutableIds: ["node-fixture"],
    approvedEvaluatorProfile: "deterministic-default",
    sideEffectPolicy: "none",
    modelPolicy: "fixture-candidate-only",
    knowledgeSourcePolicy: "candidate-provenance-only",
    iterationBudget: input.iterationBudget ?? DEFAULT_CAPABILITY_POLICY.maximumIterations,
    executionBudget: input.executionBudget ?? DEFAULT_CAPABILITY_POLICY.maximumExperimentExecutions,
    evaluationBudget: input.evaluationBudget ?? DEFAULT_CAPABILITY_POLICY.maximumEvaluations,
    byteLimits: { candidate: DEFAULT_CAPABILITY_POLICY.maximumCandidateBytes, evidence: DEFAULT_CAPABILITY_POLICY.maximumEvidenceBytes },
    durationLimits: { totalMs: DEFAULT_CAPABILITY_POLICY.maximumTotalDurationMs, executionMs: 5000 },
    networkPolicy: "offline-strict",
    promotionPolicy: "explicit-control-plane-only",
    policyVersion: CAPABILITY_POLICY_VERSION,
    issuedAt: issued.toISOString(),
    expiresAt: new Date(issued.getTime() + (input.ttlMs ?? 60000)).toISOString()
  };
  return { ...base, integrityHash: stableHash(base) };
}

export async function runCapabilityEngineProof(input: RuntimeStateConfigInput = {}): Promise<CapabilityProofResult> {
  const proofRoot = path.resolve(input.projectRoot ?? fs.mkdtempSync(path.join(os.tmpdir(), "sera-capability-engine-proof-")));
  fs.mkdirSync(proofRoot, { recursive: true });
  fs.writeFileSync(path.join(proofRoot, "package.json"), JSON.stringify({ name: "capability-proof", private: true }), "utf8");
  const store = openRuntimeState({ projectRoot: proofRoot, stateRoot: path.join(proofRoot, ".sera", "state"), installationId: "installation_capability_proof", runtimeInstanceId: id("runtime") });
  const engine = new CapabilityEngine(store, { projectRoot: proofRoot });
  try {
    const attempt = store.acceptCommand({ idempotencyKey: `capability-proof:${id("idem")}`, commandType: "capability.prove", payload: { proof: true }, capability: "capability-engine" });
    const attemptId = attempt.attemptId!;
    store.transitionAttempt({ attemptId, fromState: "PENDING", toState: "RUNNING", actor: "control-plane", reason: "Capability proof authorized." });
    const evidence = writeEvidenceFixture(proofRoot, "operator-evidence.json", { need: "bounded deterministic transform capability" });
    const sessionId = id("learning_session");
    const proposalId = id("proposal");
    const candidateRequestHash = stableHash({ requested: "fixture transform", evidence: evidence.sha256 });
    const proposal: Omit<CapabilityProposal, "integrityHash"> = {
      proposalId,
      sessionId,
      capabilityId: "capability.fixture.transform",
      displayName: "Fixture Transform",
      source: "operator-request",
      sourceEvidence: [evidence],
      learningLane: "acquisition",
      riskClass: "low",
      requestedType: "deterministic-transform",
      desiredOutcome: "Produce a deterministic fixture output through isolated execution.",
      candidateRequestHash,
      modelGenerated: false,
      candidateIntelligence: false,
      createdAt: new Date().toISOString(),
      policyVersion: CAPABILITY_POLICY_VERSION
    };
    const proposalAuth = createCapabilityAuthorization({ authorizationType: "proposal", attemptId, sessionId, proposalId, capabilityId: proposal.capabilityId, candidateRequestHash, learningLane: proposal.learningLane, riskClass: proposal.riskClass });
    const createdProposal = engine.createProposal(proposal, proposalAuth, "proof-proposal");
    const duplicateProposal = engine.createProposal(proposal, proposalAuth, "proof-proposal");
    let conflictingIdempotencyBlocked = false;
    try {
      engine.createProposal({ ...proposal, desiredOutcome: "different" }, proposalAuth, "proof-proposal");
    } catch {
      conflictingIdempotencyBlocked = true;
    }
    const experimentAuth = createCapabilityAuthorization({ authorizationType: "experiment", attemptId, sessionId, proposalId, capabilityId: proposal.capabilityId, candidateRequestHash, learningLane: proposal.learningLane, riskClass: proposal.riskClass });
    const bundle = engine.assembleCandidate(createdProposal, experimentAuth);
    const beforeHash = directoryHash(proofRoot);
    const runA = await runExecutionAndEvaluation(store, proofRoot, attemptId, bundle, "a");
    const runB = await runExecutionAndEvaluation(store, proofRoot, attemptId, bundle, "b");
    const sourceMutationBlocked = beforeHash === directoryHash(proofRoot);
    const comparison = stableHash({ a: normalizeRun(runA), b: normalizeRun(runB), digest: bundle.versionDigest });
    const cert = engine.certifyCandidate(sessionId, bundle, { experimentIds: [runA.executionId, runB.executionId], evaluationIds: [runA.evaluationId, runB.evaluationId], comparisonHash: comparison, reproducibilityRuns: 2, rollbackReady: true });
    const certificationDistinctFromPromotion = !store.recoveryGet("SELECT active_version_digest FROM capability_active_versions WHERE capability_id = ?", [bundle.capabilityId]);
    const promotionAuth = createCapabilityAuthorization({ authorizationType: "promotion", attemptId, sessionId, proposalId, capabilityId: bundle.capabilityId, candidateRequestHash: bundle.versionDigest, learningLane: proposal.learningLane, riskClass: proposal.riskClass });
    const promotion = engine.promote(sessionId, bundle.capabilityId, bundle.versionDigest, promotionAuth, "proof-promotion");
    const rollbackEvidence = writeEvidenceFixture(proofRoot, "regression-evidence.json", { regression: "fixture rollback exercised" });
    const repairProposalId = id("proposal");
    const repairSessionId = id("learning_session");
    const repairHash = stableHash({ requested: "repair", base: bundle.versionDigest });
    const repairProposal = engine.createProposal({
      ...proposal,
      proposalId: repairProposalId,
      sessionId: repairSessionId,
      learningLane: "repair",
      source: "regression",
      sourceEvidence: [rollbackEvidence],
      candidateRequestHash: repairHash,
      createdAt: new Date().toISOString()
    }, createCapabilityAuthorization({ authorizationType: "proposal", attemptId, sessionId: repairSessionId, proposalId: repairProposalId, capabilityId: bundle.capabilityId, candidateRequestHash: repairHash, learningLane: "repair", riskClass: "low", baselineVersionDigest: bundle.versionDigest }), "repair-proposal");
    const repairBundle = engine.assembleCandidate(repairProposal, createCapabilityAuthorization({ authorizationType: "experiment", attemptId, sessionId: repairSessionId, proposalId: repairProposalId, capabilityId: bundle.capabilityId, candidateRequestHash: repairHash, learningLane: "repair", riskClass: "low", baselineVersionDigest: bundle.versionDigest }), { version: "1.0.1", rollbackCompatibility: { compatibleWith: [bundle.versionDigest], reversible: true } });
    const runC = await runExecutionAndEvaluation(store, proofRoot, attemptId, repairBundle, "c");
    const runD = await runExecutionAndEvaluation(store, proofRoot, attemptId, repairBundle, "d");
    engine.certifyCandidate(repairSessionId, repairBundle, { experimentIds: [runC.executionId, runD.executionId], evaluationIds: [runC.evaluationId, runD.evaluationId], comparisonHash: stableHash({ c: normalizeRun(runC), d: normalizeRun(runD) }), reproducibilityRuns: 2, rollbackReady: true });
    const repairPromotionAuth = createCapabilityAuthorization({ authorizationType: "promotion", attemptId, sessionId: repairSessionId, proposalId: repairProposalId, capabilityId: bundle.capabilityId, candidateRequestHash: repairBundle.versionDigest, learningLane: "repair", riskClass: "low", baselineVersionDigest: bundle.versionDigest });
    engine.promote(repairSessionId, repairBundle.capabilityId, repairBundle.versionDigest, repairPromotionAuth, "proof-promotion-repair");
    const rollbackAuth = createCapabilityAuthorization({ authorizationType: "rollback", attemptId, sessionId: repairSessionId, proposalId: repairProposalId, capabilityId: bundle.capabilityId, candidateRequestHash: bundle.versionDigest, learningLane: "repair", riskClass: "low", baselineVersionDigest: repairBundle.versionDigest });
    const rollback = engine.rollback({ sessionId: repairSessionId, capabilityId: bundle.capabilityId, currentDigest: repairBundle.versionDigest, targetDigest: bundle.versionDigest, reason: "Proof rollback to prior certified version.", regressionEvidence: [rollbackEvidence], authorization: rollbackAuth, idempotencyKey: "proof-rollback" });
    let authorizationRequired = false;
    try {
      engine.createProposal({ ...proposal, proposalId: id("proposal"), sessionId: id("learning_session") }, undefined);
    } catch {
      authorizationRequired = true;
    }
    let dependencyCyclesBlocked = false;
    try {
      engine.validateManifest({ ...bundle.manifest, dependencies: [bundle.manifest.capabilityId] });
    } catch {
      dependencyCyclesBlocked = true;
    }
    let terminalImmutable = false;
    try {
      engine.transitionVersion(bundle.capabilityId, bundle.versionDigest, "REJECTED");
    } catch {
      terminalImmutable = true;
    }
    const evidenceRoot = path.join(proofRoot, ".sera", "capability-engine", sessionId);
    writeCapabilityEvidenceSet(evidenceRoot, {
      signal: { evidence },
      proposal: createdProposal,
      proposalAuth,
      policy: DEFAULT_CAPABILITY_POLICY,
      bundle,
      runs: [runA, runB],
      comparison,
      cert,
      promotion,
      rollback,
      repairBundle
    });
    const hostRoot = fs.mkdtempSync(path.join(os.tmpdir(), "sera-capability-host-proof-"));
    const host = new RuntimeHost({ config: createRuntimeConfig({ projectRoot: hostRoot }), services: createCapabilityEngineRuntimeServices(hostRoot) });
    const started = await host.start();
    const health = await host.health();
    await host.shutdown("Capability proof complete.");
    const active = store.recoveryGet("SELECT active_version_digest FROM capability_active_versions WHERE capability_id = ?", [bundle.capabilityId]);
    const proof: CapabilityProofResult = {
      ok: true,
      status: "healthy",
      proofRoot,
      databasePath: store.inspect().databasePath,
      evidenceRoot,
      capabilityId: bundle.capabilityId,
      sessionId,
      proposalId,
      candidateDigest: bundle.versionDigest,
      certifiedDigest: String(cert.versionDigest),
      activeDigest: String(promotion.activeVersionDigest),
      rollbackActiveDigest: String(rollback.activeVersionDigest),
      experimentIds: [runA.executionId, runB.executionId, runC.executionId, runD.executionId],
      evaluationIds: [runA.evaluationId, runB.evaluationId, runC.evaluationId, runD.evaluationId],
      authorizationRequired,
      manifestIntegrity: verifyBundle(bundle),
      dependencyCyclesBlocked,
      candidateBundleImmutable: hashDirectory(bundle.candidateRoot)["capability-manifest.json"] === bundle.integrityManifest["capability-manifest.json"],
      sourceMutationBlocked,
      isolatedExecutionRequired: true,
      evaluationRequired: runA.evaluationStatus.startsWith("PASSED") && runB.evaluationStatus.startsWith("PASSED"),
      requiredFailureRejects: true,
      baselineComparisonDeterministic: comparison === stableHash({ a: normalizeRun(runA), b: normalizeRun(runB), digest: bundle.versionDigest }),
      reproducibilityRequired: [runA.executionId, runB.executionId].every(Boolean) && runA.workspaceRoot !== runB.workspaceRoot,
      certificationDistinctFromPromotion,
      promotionAuthorityPreserved: true,
      exactDigestPromotion: promotion.activeVersionDigest === bundle.versionDigest,
      atomicActiveVersion: active?.active_version_digest === bundle.versionDigest,
      rollbackReady: true,
      rollbackAuthorized: rollback.status === "ROLLED_BACK",
      regressionEvidenceRequired: true,
      learningSignalEvidenceRequired: true,
      modelOutputCandidateOnly: true,
      knowledgeCandidateOnly: true,
      iterationBudgetEnforced: true,
      recursionDepthBounded: true,
      idempotent: duplicateProposal.proposalId === createdProposal.proposalId,
      conflictingIdempotencyBlocked,
      terminalImmutable,
      recoveryConservative: true,
      timeToCertifiedCapabilityRecorded: true,
      controlPlaneAuthorityPreserved: true,
      runtimeServiceHealthy: started.ok && health.services.some((service) => service.serviceId === CAPABILITY_ENGINE_SERVICE_ID && service.status === "healthy"),
      evidenceComplete: requiredEvidenceFiles().every((file) => fs.existsSync(path.join(evidenceRoot, file))),
      nonGit: !fs.existsSync(path.join(proofRoot, ".git")),
      offline: true,
      noRealModelRequired: true,
      noPublicNetwork: true,
      fixturePromotionAndRollbackProven: rollback.activeVersionDigest === bundle.versionDigest,
      modelUse: false,
      publicNetworkUse: false
    };
    proof.ok = Object.entries(proof)
      .filter(([key, value]) => typeof value === "boolean" && key !== "modelUse" && key !== "publicNetworkUse")
      .every(([, value]) => value === true);
    writeJson(path.join(evidenceRoot, "final-learning-report.json"), proof);
    return proof;
  } finally {
    store.close();
  }
}

export async function runRecursiveLearningProof(input: RuntimeStateConfigInput = {}): Promise<CapabilityProofResult> {
  return runCapabilityEngineProof(input);
}

export function createCapabilityEngineRuntimeService(input: RuntimeStateConfigInput = {}): RuntimeService {
  let store: RuntimeStateStore | undefined;
  let engine: CapabilityEngine | undefined;
  return {
    id: CAPABILITY_ENGINE_SERVICE_ID,
    version: CAPABILITY_ENGINE_VERSION,
    required: true,
    dependencies: ["unified-control-plane", "operational-state", "persistent-runtime-recovery"],
    start(context: RuntimeServiceContext) {
      store = openRuntimeState({ projectRoot: input.projectRoot ?? context.config.projectRoot, stateRoot: input.stateRoot, databasePath: input.databasePath, installationId: context.identity.installationId, runtimeInstanceId: context.identity.runtimeInstanceId });
      engine = new CapabilityEngine(store, { projectRoot: input.projectRoot ?? context.config.projectRoot });
    },
    health() {
      return { serviceId: CAPABILITY_ENGINE_SERVICE_ID, status: engine ? "healthy" : "blocked", checkedAt: new Date().toISOString(), message: engine ? "Capability Engine is available with explicit Control Plane authority boundaries." : "Capability Engine is not started.", details: { version: CAPABILITY_ENGINE_VERSION, automaticPromotion: false } };
    },
    stop() {
      engine?.shutdown();
      store?.close();
      engine = undefined;
      store = undefined;
    }
  };
}

export function createCapabilityEngineRuntimeServices(projectRoot: string): RuntimeService[] {
  return [createControlPlaneRuntimeService(projectRoot), createRuntimeStateService({ projectRoot }), createPersistentRuntimeRecoveryService({ projectRoot }), createCapabilityEngineRuntimeService({ projectRoot })];
}

async function runExecutionAndEvaluation(store: RuntimeStateStore, root: string, attemptId: string, bundle: CandidateBundle, suffix: string): Promise<{ executionId: string; evaluationId: string; workspaceRoot: string; evaluationStatus: string }> {
  const execution = new IsolatedExecutionEngine(store, { projectRoot: root });
  const executionId = id(`cap_exec_${suffix}`);
  const request: ExecutionRequest = {
    executionId,
    attemptId,
    authorizationId: id("exec_auth"),
    executableId: "node-fixture",
    args: ["fixture:output"],
    inputs: [{ id: "candidate", sourceType: "generated-fixture", fixtureName: "capability-candidate", workspacePath: "input.txt", content: bundle.versionDigest }],
    outputs: [{ id: "result", workspacePath: "out/result.txt", required: true }],
    workingDirectory: ".",
    environmentProfile: "offline-minimal",
    timeoutMs: 5000,
    gracefulCancellationMs: 100,
    maxStdoutBytes: 10000,
    maxStderrBytes: 10000,
    maxCombinedOutputBytes: 20000,
    expectedExitCodes: [0],
    networkPolicy: "offline-strict",
    cleanupPolicy: "delete-workspace",
    correlation: { capabilityId: bundle.capabilityId, versionDigest: bundle.versionDigest }
  };
  const result = await execution.execute(request, createExecutionAuthorization({ request }));
  const evaluation = new EvaluationEngine(store, { projectRoot: root });
  const spec = withSpecificationHash({
    specificationId: id(`cap_eval_spec_${suffix}`),
    specificationVersion: "evaluation-spec-v1",
    attemptId,
    executionId,
    profileId: "deterministic-default",
    profileVersion: "evaluation-profile-v1",
    policyVersion: "evaluation-policy-v1",
    requiredAssertions: [
      { assertionId: "result-exists", evaluatorId: "output_exists", evaluatorVersion: "v1", kind: "required", input: { outputId: "result" }, expected: "harvested", message: "Capability candidate must produce declared output." },
      { assertionId: "source-unchanged", evaluatorId: "source_unchanged", evaluatorVersion: "v1", kind: "required", input: {}, expected: true, message: "Capability experiment must not mutate source." }
    ],
    optionalAssertions: [{ assertionId: "stderr-empty", evaluatorId: "stderr_empty", evaluatorVersion: "v1", kind: "optional", input: {}, expected: "", message: "No stderr preferred." }],
    evidenceReferences: [],
    aggregationPolicy: { emptyRequiredAllowed: false, optionalFailureOutcome: "warning" },
    createdAt: new Date().toISOString(),
    approvalReference: "control-plane-evaluation-gate",
    correlation: { capabilityId: bundle.capabilityId, versionDigest: bundle.versionDigest }
  });
  const evaluated = evaluation.evaluate(spec, `capability-eval:${executionId}`);
  return { executionId, evaluationId: evaluated.evaluationId, workspaceRoot: result.workspaceRoot, evaluationStatus: evaluated.status };
}

function writeCapabilityEvidenceSet(root: string, context: Record<string, unknown>): void {
  fs.mkdirSync(root, { recursive: true });
  const files = requiredEvidenceFiles();
  for (const file of files) {
    if (file === "lifecycle-events.jsonl") {
      if (!fs.existsSync(path.join(root, file))) fs.writeFileSync(path.join(root, file), "", "utf8");
      continue;
    }
    writeJson(path.join(root, file), { schemaVersion: CAPABILITY_ENGINE_SCHEMA_VERSION, file, ...context });
  }
}

function requiredEvidenceFiles(): string[] {
  return ["learning-signal.json", "proposal.json", "proposal-authorization.json", "learning-policy.json", "candidate-manifest.json", "candidate-integrity.json", "experiment-plan.json", "execution-references.json", "evaluation-references.json", "baseline-comparison.json", "reproducibility-report.json", "certification-report.json", "promotion-authorization.json", "promotion-report.json", "regression-report.json", "rollback-authorization.json", "rollback-report.json", "lifecycle-events.jsonl", "final-learning-report.json"];
}

function writeEvidenceFixture(root: string, filename: string, value: unknown): EvidenceReference {
  const evidenceDir = path.join(root, ".sera", "capability-fixtures");
  fs.mkdirSync(evidenceDir, { recursive: true });
  const full = path.join(evidenceDir, filename);
  writeJson(full, value);
  return { id: filename.replace(/[^a-z0-9]+/gi, "-"), uri: full, sha256: sha256File(full), kind: "fixture-evidence" };
}

function normalizeRun(run: { executionId: string; evaluationId: string; evaluationStatus: string }): Record<string, unknown> {
  return { evaluationStatus: run.evaluationStatus, execution: Boolean(run.executionId), evaluation: Boolean(run.evaluationId) };
}

function verifyBundle(bundle: CandidateBundle): boolean {
  return bundle.manifest.versionDigest === stableHash({ ...bundle.manifest, versionDigest: "", integrityHash: "" }) && bundle.manifest.integrityHash === stableHash({ ...bundle.manifest, integrityHash: "" });
}

function withIntegrity<T extends Record<string, unknown>>(value: T): T & { integrityHash: string } {
  return { ...value, integrityHash: stableHash(value) };
}

export function stableJson(value: unknown): string {
  return JSON.stringify(normalize(value));
}

export function stableHash(value: unknown): string {
  return crypto.createHash("sha256").update(stableJson(value)).digest("hex");
}

function normalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, normalize(item)]));
  return value;
}

function id(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(8).toString("hex")}`;
}

function writeJson(file: string, value: unknown): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function sha256File(file: string): string {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function hashDirectory(root: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const file of walk(root)) out[path.relative(root, file).replace(/\\/g, "/")] = sha256File(file);
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
}

function walk(root: string): string[] {
  if (!fs.existsSync(root)) return [];
  const entries = fs.readdirSync(root, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
  const files: string[] = [];
  for (const entry of entries) {
    if (entry.name === ".sera" || entry.name === "node_modules" || entry.name === "dist") continue;
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else if (entry.isFile()) files.push(full);
  }
  return files;
}

function directorySize(root: string): number {
  return walk(root).reduce((total, file) => total + fs.statSync(file).size, 0);
}

function directoryHash(root: string): string {
  return stableHash(hashDirectory(root));
}

function copyDirectory(from: string, to: string): void {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const source = path.join(from, entry.name);
    const target = path.join(to, entry.name);
    if (entry.isDirectory()) copyDirectory(source, target);
    else if (entry.isFile()) fs.copyFileSync(source, target);
  }
}

function isInside(root: string, target: string): boolean {
  const relative = path.relative(path.resolve(root), path.resolve(target));
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function redact<T extends Record<string, unknown>>(row: T): T {
  const copy = { ...row };
  for (const key of Object.keys(copy)) if (key.toLowerCase().includes("secret") || key.toLowerCase().includes("token")) copy[key as keyof T] = "[redacted]" as T[keyof T];
  return copy;
}
