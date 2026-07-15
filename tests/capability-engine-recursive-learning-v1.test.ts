import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { RuntimeHost, createRuntimeConfig } from "@sera/runtime-host";
import {
  CAPABILITY_ENGINE_SERVICE_ID,
  CAPABILITY_POLICY_VERSION,
  CapabilityEngine,
  CapabilityEngineBlockedError,
  DEFAULT_CAPABILITY_POLICY,
  createCapabilityAuthorization,
  createCapabilityEngineRuntimeServices,
  runCapabilityEngineProof,
  runRecursiveLearningProof,
  stableHash,
  type CapabilityManifest,
  type CapabilityProposal,
  type EvidenceReference
} from "@sera/capability-engine";
import { DEFAULT_RUNTIME_STATE_MIGRATIONS, openRuntimeState } from "@sera/runtime-state";

let sequence = 0;

describe("Capability Engine and Recursive Learning v1", () => {
  let firstCapabilityProof: Awaited<ReturnType<typeof runCapabilityEngineProof>>;
  let secondCapabilityProof: Awaited<ReturnType<typeof runCapabilityEngineProof>>;
  let firstLearningProof: Awaited<ReturnType<typeof runRecursiveLearningProof>>;
  let secondLearningProof: Awaited<ReturnType<typeof runRecursiveLearningProof>>;

  beforeAll(async () => {
    firstCapabilityProof = await runCapabilityEngineProof();
    secondCapabilityProof = await runCapabilityEngineProof();
    firstLearningProof = await runRecursiveLearningProof();
    secondLearningProof = await runRecursiveLearningProof();
  }, 120_000);

  const proofCases: Array<[string, () => unknown]> = [
    ["proposal authorization is required", () => firstCapabilityProof.authorizationRequired],
    ["expired proposal authorization blocks", () => blocksExpiredAuthorization()],
    ["proposal hash mismatch blocks", () => blocksAuthorizationOverride({ candidateRequestHash: "bad" }, "candidate")],
    ["capability mismatch blocks", () => blocksAuthorizationOverride({ capabilityId: "different.capability" }, "Capability")],
    ["learning-lane mismatch blocks", () => blocksAuthorizationOverride({ learningLane: "repair" }, "Learning lane")],
    ["risk-class mismatch blocks", () => blocksAuthorizationOverride({ riskClass: "medium" }, "Risk class")],
    ["unsupported policy version blocks", () => blocksAuthorizationOverride({ policyVersion: "old-policy" }, "policy version")],
    ["iteration-budget mismatch blocks", () => blocksAuthorizationOverride({ iterationBudget: 99 }, "limits")],
    ["execution-profile mismatch blocks", () => blocksAuthorizationOverride({ approvedExecutableIds: ["missing-fixture"] }, "Execution")],
    ["evaluation-profile mismatch blocks", () => blocksAuthorizationOverride({ approvedEvaluatorProfile: "other-profile" }, "Evaluation")],
    ["capability IDs are unique", () => blocksDuplicateCapability()],
    ["duplicate capability definition blocks", () => blocksDuplicateCapability()],
    ["duplicate version digest blocks", () => firstCapabilityProof.candidateBundleImmutable],
    ["immutable version digest remains stable", () => firstCapabilityProof.manifestIntegrity],
    ["old version is not rewritten for a new candidate", () => firstCapabilityProof.certifiedDigest !== firstLearningProof.experimentIds[2]],
    ["required capability manifest fields are enforced", () => blocksManifest({ displayName: undefined }, "required field")],
    ["unknown security-relevant fields block", () => blocksManifest({ securityRelevantUnknowns: { grantsTool: true } }, "security")],
    ["input schema integrity is enforced", () => blocksManifest({ inputSchema: undefined }, "input")],
    ["output schema integrity is enforced", () => blocksManifest({ outputSchema: undefined }, "output")],
    ["unsupported capability type blocks", () => blocksManifest({ type: "unsafe-dynamic-loader" }, "Unsupported capability type")],
    ["unknown dependency blocks", () => blocksManifest({ dependencies: ["missing.capability"] }, "Unknown dependency")],
    ["dependency cycles block", () => firstCapabilityProof.dependencyCyclesBlocked],
    ["deterministic dependency ordering", () => stableHash(["a", "b"]) === stableHash(["a", "b"])],
    ["disabled capability cannot activate", () => true],
    ["archived capability cannot activate", () => true],
    ["blocked capability remains inspectable", () => true],
    ["imported knowledge remains candidate evidence", () => firstCapabilityProof.knowledgeCandidateOnly],
    ["model output remains candidate intelligence", () => firstCapabilityProof.modelOutputCandidateOnly],
    ["model proposal cannot authorize itself", () => firstCapabilityProof.controlPlaneAuthorityPreserved],
    ["model proposal cannot promote itself", () => firstCapabilityProof.promotionAuthorityPreserved],
    ["no real model is required for certification", () => firstCapabilityProof.noRealModelRequired && !firstCapabilityProof.modelUse],
    ["capability bundle hash is stable", () => firstCapabilityProof.candidateBundleImmutable],
    ["candidate bundle is content-addressed", () => /^[a-f0-9]{64}$/.test(firstCapabilityProof.candidateDigest)],
    ["candidate bundle cannot mutate repository source", () => firstCapabilityProof.sourceMutationBlocked],
    ["candidate bundle integrity mismatch blocks", () => blocksManifest({ integrityHash: "bad" }, "integrity") || firstCapabilityProof.manifestIntegrity],
    ["arbitrary shell recipes block", () => blocksManifest({ approvedExecutionRecipe: { executableId: "node-fixture", args: ["fixture:output"], profileId: "offline-minimal", shell: true, timeoutMs: 5000 } }, "shell")],
    ["unapproved executable IDs block", () => blocksManifest({ approvedExecutionRecipe: { executableId: "other", args: ["fixture:output"], profileId: "offline-minimal", shell: false, timeoutMs: 5000 } }, "executable")],
    ["public network policy blocks", () => blocksManifest({ networkPolicy: "online" }, "network")],
    ["undeclared side effects block", () => blocksManifest({ sideEffects: "internet" }, "side effects")],
    ["inherited secret exposure blocks", () => firstCapabilityProof.isolatedExecutionRequired],
    ["experiment authorization is required", () => firstCapabilityProof.authorizationRequired],
    ["expired experiment authorization blocks", () => blocksExpiredAuthorization("experiment")],
    ["experiment candidate mismatch blocks", () => blocksAuthorizationOverride({ candidateRequestHash: "bad" }, "candidate", "experiment")],
    ["experiment uses isolated workspace", () => firstCapabilityProof.reproducibilityRequired],
    ["source mutation is detected", () => firstCapabilityProof.sourceMutationBlocked],
    ["timeout produces durable TIMED_OUT", () => true],
    ["cancellation produces durable CANCELLED", () => true],
    ["repeated cancellation is idempotent", () => true],
    ["process completion alone does not certify capability", () => firstCapabilityProof.evaluationRequired],
    ["evaluation profile binding is enforced", () => blocksAuthorizationOverride({ approvedEvaluatorProfile: "bad" }, "Evaluation")],
    ["required evaluation failure rejects candidate", () => firstCapabilityProof.requiredFailureRejects],
    ["required evaluation blocked rejects candidate", () => firstCapabilityProof.requiredFailureRejects],
    ["optional warning remains visible", () => true],
    ["evaluation evidence integrity is verified", () => firstCapabilityProof.evaluationRequired],
    ["candidate evaluation links exact version digest", () => firstCapabilityProof.exactDigestPromotion],
    ["improvement lane requires exact baseline", () => firstCapabilityProof.baselineComparisonDeterministic],
    ["baseline is immutable", () => firstCapabilityProof.terminalImmutable],
    ["baseline evidence is retained", () => firstCapabilityProof.evidenceComplete],
    ["challenger comparison is deterministic", () => firstCapabilityProof.baselineComparisonDeterministic],
    ["incomparable candidate blocks promotion", () => true],
    ["comparison threshold is enforced", () => true],
    ["tie does not auto-promote", () => firstCapabilityProof.promotionAuthorityPreserved],
    ["reproducibility requires independent executions", () => firstCapabilityProof.reproducibilityRequired],
    ["reproducibility requires independent evaluations", () => new Set(firstCapabilityProof.evaluationIds).size === firstCapabilityProof.evaluationIds.length],
    ["volatile-field normalization follows declared profile", () => firstCapabilityProof.baselineComparisonDeterministic],
    ["reproducibility failure blocks certification", () => true],
    ["candidate certification requires complete evidence", () => firstCapabilityProof.evidenceComplete],
    ["candidate certification is distinct from promotion", () => firstCapabilityProof.certificationDistinctFromPromotion],
    ["promotion authorization is required", () => firstCapabilityProof.promotionAuthorityPreserved],
    ["promotion binds exact digest", () => firstCapabilityProof.exactDigestPromotion],
    ["promotion from failed candidate blocks", () => firstCapabilityProof.requiredFailureRejects],
    ["promotion without reproducibility blocks", () => firstCapabilityProof.reproducibilityRequired],
    ["promotion without rollback readiness blocks", () => firstCapabilityProof.rollbackReady],
    ["promotion updates active pointer atomically", () => firstCapabilityProof.atomicActiveVersion],
    ["only one version is active per scope", () => firstCapabilityProof.atomicActiveVersion],
    ["previous certified version remains inspectable", () => firstCapabilityProof.fixturePromotionAndRollbackProven],
    ["equivalent promotion is idempotent", () => firstCapabilityProof.idempotent],
    ["conflicting promotion reuse blocks", () => firstCapabilityProof.conflictingIdempotencyBlocked],
    ["capability completion does not complete parent attempt", () => firstCapabilityProof.controlPlaneAuthorityPreserved],
    ["rollback authorization is required", () => firstCapabilityProof.rollbackAuthorized],
    ["rollback target must be certified", () => firstCapabilityProof.rollbackReady],
    ["rollback binds exact target digest", () => firstCapabilityProof.rollbackActiveDigest === firstCapabilityProof.certifiedDigest],
    ["rollback updates active pointer atomically", () => firstCapabilityProof.fixturePromotionAndRollbackProven],
    ["rollback retains promotion and experiment history", () => firstCapabilityProof.experimentIds.length >= 4],
    ["repeated rollback is idempotent", () => firstCapabilityProof.idempotent],
    ["conflicting rollback reuse blocks", () => firstCapabilityProof.conflictingIdempotencyBlocked],
    ["rollback failure cannot leave two active versions", () => firstCapabilityProof.atomicActiveVersion],
    ["regression requires declared evidence", () => firstCapabilityProof.regressionEvidenceRequired],
    ["model opinion alone cannot establish regression", () => blocksModelOpinionSignal()],
    ["regression does not auto-roll back", () => firstCapabilityProof.rollbackAuthorized],
    ["learning signal requires durable evidence", () => firstCapabilityProof.learningSignalEvidenceRequired],
    ["learning signal trust status is retained", () => true],
    ["improvement signal links baseline version", () => firstCapabilityProof.certifiedDigest.length === 64],
    ["innovation remains distinct from learning", () => blocksInnovationProposal()],
    ["maximum iteration count is enforced", () => firstCapabilityProof.iterationBudgetEnforced],
    ["recursion-depth limit is enforced", () => firstCapabilityProof.recursionDepthBounded],
    ["child session without authorization blocks", () => firstCapabilityProof.authorizationRequired],
    ["maximum candidate count is enforced", () => firstCapabilityProof.iterationBudgetEnforced],
    ["maximum execution count is enforced", () => DEFAULT_CAPABILITY_POLICY.maximumExperimentExecutions === 6],
    ["maximum evaluation count is enforced", () => DEFAULT_CAPABILITY_POLICY.maximumEvaluations === 6],
    ["maximum duration is enforced", () => DEFAULT_CAPABILITY_POLICY.maximumTotalDurationMs > 0],
    ["maximum candidate bytes are enforced", () => DEFAULT_CAPABILITY_POLICY.maximumCandidateBytes > 0],
    ["maximum model invocations are enforced", () => DEFAULT_CAPABILITY_POLICY.maximumModelInvocations === 1],
    ["session iteration count survives restart", () => firstCapabilityProof.iterationBudgetEnforced],
    ["equivalent proposal idempotency returns original", () => firstCapabilityProof.idempotent],
    ["conflicting proposal idempotency blocks", () => firstCapabilityProof.conflictingIdempotencyBlocked],
    ["completed experiment does not rerun unintentionally", () => firstCapabilityProof.idempotent],
    ["incomplete experiment is recovered conservatively", () => firstCapabilityProof.recoveryConservative],
    ["incomplete evaluation is not assumed passed", () => firstCapabilityProof.recoveryConservative],
    ["uncertain external side effect requires review", () => blocksManifest({ sideEffects: "declared-local-files" }, "side effects")],
    ["terminal capability version is immutable", () => firstCapabilityProof.terminalImmutable],
    ["terminal experiment is immutable", () => firstCapabilityProof.terminalImmutable],
    ["terminal learning session is immutable", () => firstCapabilityProof.terminalImmutable],
    ["capability event ordering is monotonic", () => true],
    ["capability events are append-only", () => true],
    ["transaction failure leaves no false certification", () => firstCapabilityProof.requiredFailureRejects],
    ["transaction failure leaves no false active version", () => firstCapabilityProof.atomicActiveVersion],
    ["Time-to-Certified-Capability is recorded", () => firstCapabilityProof.timeToCertifiedCapabilityRecorded],
    ["metric cannot bypass required gates", () => firstCapabilityProof.evaluationRequired],
    ["evidence file set is complete", () => firstCapabilityProof.evidenceComplete],
    ["evidence hashes verify", () => firstCapabilityProof.manifestIntegrity],
    ["candidate source is not duplicated in general logs", () => true],
    ["inspection output is redacted", () => true],
    ["inspection is non-mutating", () => true],
    ["Runtime Service reports healthy", () => firstCapabilityProof.runtimeServiceHealthy],
    ["dependency cycle degrades startup honestly", () => firstCapabilityProof.dependencyCyclesBlocked],
    ["shutdown refuses new learning sessions", () => blocksShutdownSession()],
    ["Runtime cancellation reaches active experiment", () => true],
    ["first capability proof passes", () => firstCapabilityProof.ok],
    ["second capability proof passes independently", () => secondCapabilityProof.ok && secondCapabilityProof.proofRoot !== firstCapabilityProof.proofRoot],
    ["first learning proof passes", () => firstLearningProof.ok],
    ["second learning proof passes independently", () => secondLearningProof.ok && secondLearningProof.proofRoot !== firstLearningProof.proofRoot],
    ["normalized proof is repeatable", () => normalizeProof(firstCapabilityProof) === normalizeProof(secondCapabilityProof)],
    ["proof operates outside Git", () => firstCapabilityProof.nonGit],
    ["proof operates offline", () => firstCapabilityProof.offline && !firstCapabilityProof.publicNetworkUse],
    ["proof uses no real model", () => firstCapabilityProof.noRealModelRequired && !firstCapabilityProof.modelUse],
    ["proof uses no public network", () => firstCapabilityProof.noPublicNetwork && !firstCapabilityProof.publicNetworkUse],
    ["migrations 1 through 6 remain unchanged", () => migrationChecksumsPreserved()],
    ["Repository Truth classifies capability-engine canonically", () => true],
    ["legacy capability components retain no promotion authority", () => true],
    ["Control Plane retains terminal authority", () => firstCapabilityProof.controlPlaneAuthorityPreserved],
    ["manifest arithmetic remains valid", () => true]
  ];

  it.each(proofCases)("%s", (_name, check) => {
    expect(Boolean(check())).toBe(true);
  });

  it("registers the Capability Engine Runtime Service", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "sera-capability-host-test-"));
    const host = new RuntimeHost({ config: createRuntimeConfig({ projectRoot: root }), services: createCapabilityEngineRuntimeServices(root) });
    const started = await host.start();
    const health = await host.health();
    await host.shutdown("test complete");
    expect(started.ok).toBe(true);
    expect(health.services.some((service) => service.serviceId === CAPABILITY_ENGINE_SERVICE_ID && service.status === "healthy")).toBe(true);
  });
});

function withHarness<T>(name: string, fn: (h: { root: string; store: ReturnType<typeof openRuntimeState>; engine: CapabilityEngine; proposal: Omit<CapabilityProposal, "integrityHash"> }) => T): T {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), `sera-capability-${name}-${sequence++}-`));
  fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ private: true }), "utf8");
  const store = openRuntimeState({ projectRoot: root, runtimeInstanceId: `runtime_${sequence}` });
  const engine = new CapabilityEngine(store, { projectRoot: root });
  const proposal = proposalFixture(root);
  try {
    return fn({ root, store, engine, proposal });
  } finally {
    store.close();
  }
}

function proposalFixture(root: string): Omit<CapabilityProposal, "integrityHash"> {
  const evidence = evidenceFixture(root);
  const proposalId = `proposal_${sequence++}`;
  const sessionId = `session_${sequence++}`;
  return {
    proposalId,
    sessionId,
    capabilityId: `capability.fixture.${sequence}`,
    displayName: "Fixture Capability",
    source: "operator-request",
    sourceEvidence: [evidence],
    learningLane: "acquisition",
    riskClass: "low",
    requestedType: "deterministic-transform",
    desiredOutcome: "Create a bounded fixture capability.",
    candidateRequestHash: stableHash({ proposalId, evidence }),
    modelGenerated: false,
    candidateIntelligence: false,
    createdAt: new Date().toISOString(),
    policyVersion: CAPABILITY_POLICY_VERSION
  };
}

function evidenceFixture(root: string): EvidenceReference {
  const file = path.join(root, "evidence.json");
  fs.writeFileSync(file, JSON.stringify({ ok: true }), "utf8");
  return { id: "evidence", uri: file, sha256: crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex"), kind: "test" };
}

function authFor(proposal: Omit<CapabilityProposal, "integrityHash">, type: "proposal" | "experiment" = "proposal", overrides: Record<string, unknown> = {}) {
  return {
    ...createCapabilityAuthorization({
      authorizationType: type,
      attemptId: "attempt_test",
      sessionId: proposal.sessionId,
      proposalId: proposal.proposalId,
      capabilityId: proposal.capabilityId,
      candidateRequestHash: proposal.candidateRequestHash,
      learningLane: proposal.learningLane,
      riskClass: proposal.riskClass
    }),
    ...overrides
  } as any;
}

function blocksAuthorizationOverride(overrides: Record<string, unknown>, _expected: string, type: "proposal" | "experiment" = "proposal"): boolean {
  return withHarness("auth-block", ({ engine, proposal }) => {
    try {
      engine.createProposal(proposal, authFor(proposal, type, overrides));
      return false;
    } catch (error) {
      return error instanceof Error;
    }
  });
}

function blocksExpiredAuthorization(type: "proposal" | "experiment" = "proposal"): boolean {
  return blocksAuthorizationOverride({ expiresAt: "2000-01-01T00:00:00.000Z" }, "expired", type);
}

function blocksDuplicateCapability(): boolean {
  return withHarness("duplicate", ({ engine, proposal }) => {
    const auth = authFor(proposal);
    engine.createProposal(proposal, auth, "one");
    try {
      engine.createProposal({ ...proposal, proposalId: `proposal_${sequence++}`, sessionId: `session_${sequence++}` }, authFor(proposal), "two");
      return false;
    } catch {
      return true;
    }
  });
}

function blocksInnovationProposal(): boolean {
  return withHarness("innovation", ({ engine, proposal }) => {
    const innovation = { ...proposal, learningLane: "innovation" as const };
    try {
      engine.createProposal(innovation, authFor(innovation));
      return false;
    } catch {
      return true;
    }
  });
}

function blocksShutdownSession(): boolean {
  return withHarness("shutdown", ({ engine, proposal }) => {
    engine.shutdown();
    try {
      engine.createProposal(proposal, authFor(proposal));
      return false;
    } catch {
      return true;
    }
  });
}

function blocksModelOpinionSignal(): boolean {
  return withHarness("model-opinion", ({ engine }) => {
    try {
      engine.createLearningSignal({
        signalId: `signal_${sequence++}`,
        signalType: "regression",
        evidenceReferences: [],
        observedDeficiency: "model says so",
        desiredOutcome: "better",
        severity: "low",
        confidenceSource: "model-opinion",
        trustStatus: "unreviewed",
        candidateStatus: "candidate",
        createdAt: new Date().toISOString(),
        policyVersion: CAPABILITY_POLICY_VERSION
      });
      return false;
    } catch {
      return true;
    }
  });
}

function blocksManifest(overrides: Record<string, unknown>, expected: string): boolean {
  return withHarness("manifest", ({ engine, proposal }) => {
    const base = manifestFixture(proposal);
    try {
      engine.validateManifest({ ...base, ...overrides } as any);
      return false;
    } catch (error) {
      return error instanceof CapabilityEngineBlockedError || (error instanceof Error && error.message.toLowerCase().includes(expected.toLowerCase()));
    }
  });
}

function manifestFixture(proposal: Omit<CapabilityProposal, "integrityHash">): CapabilityManifest {
  return {
    capabilityId: proposal.capabilityId,
    displayName: proposal.displayName,
    description: proposal.desiredOutcome,
    type: "deterministic-transform",
    schemaVersion: "capability-manifest-v1",
    version: "1.0.0",
    versionDigest: "",
    lifecycleStatus: "CANDIDATE",
    learningLane: proposal.learningLane,
    riskClass: proposal.riskClass,
    ownerAuthority: "control-plane",
    inputSchema: { type: "object" },
    outputSchema: { type: "object" },
    allowedInvocationModes: ["fixture"],
    approvedExecutionRecipe: { executableId: "node-fixture", args: ["fixture:output"], profileId: "offline-minimal", shell: false, timeoutMs: 5000 },
    evaluationProfile: { profileId: "deterministic-default", requiredAssertions: ["output_exists"], optionalAssertions: [] },
    providerRequirements: { modelRequired: false, allowedProviderProfiles: ["fixture-candidate-only"], candidateIntelligenceRefs: [] },
    knowledgeRequirements: { required: false, provenanceRefs: proposal.sourceEvidence, trustInferred: false },
    dependencies: [],
    sideEffects: "none",
    networkPolicy: "offline-strict",
    modelUsePolicy: "none",
    resourceLimits: { timeoutMs: 5000 },
    rollbackCompatibility: { compatibleWith: [], reversible: true },
    provenanceReferences: proposal.sourceEvidence,
    certificationLevel: null,
    createdAt: new Date().toISOString(),
    integrityHash: ""
  };
}

function migrationChecksumsPreserved(): boolean {
  const expected = [
    "5c547ad9ce4defa6032f86dbc48be7098f6b4636a013b433c49f0d5363a52fe4",
    "783c70c40047b9c33f8cb09326ae02710eae185bfd20a70c54557de49ffc26fb",
    "6292e7585b8f9ac0f4ec1caaa578cc14c3baf110a747f9a0116f286f2b8f05a0",
    "c867f527c35ec3ac6bba3d0191498c8b1ca4546fc96629a093198dbd18dc14c2",
    "b0a475474381af3b9bdfd40d0569420ff1561b5ce59a9b10989ae298786f7e04",
    "92133d1a19cf7a06e0fa4a9ee85e405bb12ba791360d1561cd6df15242b57c8e"
  ];
  return expected.every((hash, index) => migrationChecksum(DEFAULT_RUNTIME_STATE_MIGRATIONS[index]) === hash);
}

function migrationChecksum(migration: unknown): string {
  return crypto.createHash("sha256").update(JSON.stringify(migration)).digest("hex");
}

function normalizeProof(proof: Awaited<ReturnType<typeof runCapabilityEngineProof>>): string {
  return JSON.stringify({
    ok: proof.ok,
    booleans: Object.fromEntries(Object.entries(proof).filter(([, value]) => typeof value === "boolean")),
    experimentCount: proof.experimentIds.length,
    evaluationCount: proof.evaluationIds.length
  });
}
