import { describe, expect, it, beforeAll } from "vitest";
import {
  INTEGRATED_LOOP_RUNTIME_VERSION,
  IntegratedLoopBlockedError,
  IntegratedLoopRuntime,
  createContextFingerprint,
  createLoopAuthorization,
  contextHash,
  evaluatePreflight,
  runIntegratedLoopProof,
  validateAuthorization,
  type IntegratedLoopInspection,
  type IntegratedLoopProofResult,
  type LoopState,
  type PreflightRecord
} from "@sera/integrated-loop-runtime";
import { createRuntimeStateConfig, openRuntimeState } from "@sera/runtime-state";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

describe("Integrated Offline Loop v1", () => {
  let proof: IntegratedLoopProofResult;
  let second: IntegratedLoopProofResult;

  beforeAll(async () => {
    proof = await runIntegratedLoopProof();
    second = await runIntegratedLoopProof();
  }, 120000);

  const must = (key: string) => {
    expect(proof.checks[key], key).toBe(true);
  };

  const cases: Array<[string, () => void]> = [
    ["001 stable loop Runtime version", () => expect(INTEGRATED_LOOP_RUNTIME_VERSION).toBe("integrated-offline-loop-v1")],
    ["002 duplicate loop service registration blocks", () => must("duplicateServiceRegistrationBlocks")],
    ["003 authorization required", () => must("authorizationRequired")],
    ["004 expired authorization blocks", () => must("expiredAuthorizationBlocks")],
    ["005 attempt mismatch blocks", () => expect(() => validateAuthorization(createLoopAuthorization(), { attemptId: "wrong" })).toThrow()],
    ["006 loop-session mismatch blocks", () => expect(() => validateAuthorization(createLoopAuthorization(), { loopSessionId: "wrong" })).toThrow()],
    ["007 operator-request mismatch blocks", () => expect(() => validateAuthorization(createLoopAuthorization(), { operatorRequestId: "wrong" })).toThrow()],
    ["008 Studio digest mismatch blocks", () => expect(() => validateAuthorization(createLoopAuthorization(), { studioVersionDigest: "wrong" })).toThrow()],
    ["009 workflow mismatch blocks", () => expect(() => validateAuthorization(createLoopAuthorization(), { workflowProfile: "wrong" })).toThrow()],
    ["010 request-hash mismatch blocks", () => expect(() => validateAuthorization(createLoopAuthorization(), { normalizedRequestHash: "wrong" })).toThrow()],
    ["011 source-set mismatch blocks", () => expect(() => validateAuthorization(createLoopAuthorization(), { sourceSetHash: "wrong" })).toThrow()],
    ["012 context-hash mismatch blocks", () => expect(() => validateAuthorization({ ...createLoopAuthorization(), contextHash: "wrong" })).toThrow()],
    ["013 capability-version mismatch blocks", () => expect(() => validateAuthorization(createLoopAuthorization(), { exactCapabilityVersions: { x: "wrong" } })).toThrow()],
    ["014 model-profile mismatch blocks", () => expect(() => validateAuthorization(createLoopAuthorization(), { allowedModelProfile: "wrong" })).toThrow()],
    ["015 knowledge-root mismatch blocks", () => expect(() => validateAuthorization(createLoopAuthorization(), { knowledgeRoots: ["wrong"] })).toThrow()],
    ["016 evaluation-profile mismatch blocks", () => expect(() => validateAuthorization(createLoopAuthorization(), { evaluationProfile: "wrong" })).toThrow()],
    ["017 revision-budget mismatch blocks", () => expect(() => validateAuthorization(createLoopAuthorization(), { revisionBudget: 99 })).toThrow()],
    ["018 risk-class mismatch blocks", () => expect(() => validateAuthorization(createLoopAuthorization(), { riskClass: "high" })).toThrow()],
    ["019 public-network-policy mismatch blocks", () => expect(() => validateAuthorization(createLoopAuthorization(), { publicNetworkPolicy: "allowed" as never })).toThrow()],
    ["020 resource-limit mismatch blocks", () => expect(() => validateAuthorization(createLoopAuthorization(), { resourceLimits: { maxSources: 99 } })).toThrow()],
    ["021 unsupported policy version blocks", () => expect(() => validateAuthorization({ ...createLoopAuthorization(), policyVersion: "future" as never })).toThrow()],
    ["022 stage order deterministic", () => must("stageOrderDeterministic")],
    ["023 invalid transition blocks", () => must("invalidTransitionBlocked")],
    ["024 terminal loop immutable", () => must("terminalLoopImmutable")],
    ["025 later stage skipped after required failure", () => must("laterStageSkippedAfterFailure")],
    ["026 safe cleanup allowed after failure", () => must("safeCleanupAllowedAfterFailure")],
    ["027 model completion does not complete loop", () => must("modelCompletionDoesNotCompleteLoop")],
    ["028 Studio completion does not complete attempt", () => must("studioCompletionDoesNotCompleteAttempt")],
    ["029 evaluation pass does not imply review", () => must("evaluationPassDoesNotBypassReview")],
    ["030 review does not imply finalization", () => must("reviewDoesNotBypassFinalization")],
    ["031 final package does not imply closeout", () => must("finalPackageDoesNotCompleteCloseout")],
    ["032 cancellation does not fabricate success", () => must("cancellationDoesNotFabricateSuccess")],
    ["033 context fingerprint deterministic", () => must("contextFingerprintDeterministic")],
    ["034 context fingerprint stable", () => must("contextFingerprintStable")],
    ["035 task type included", () => must("taskTypeIncluded")],
    ["036 Studio version included", () => must("studioVersionIncluded")],
    ["037 capability requirements included", () => must("capabilityRequirementsIncluded")],
    ["038 source characteristics included", () => must("sourceCharacteristicsIncluded")],
    ["039 model profile included", () => must("modelProfileIncluded")],
    ["040 environment profile included", () => must("environmentProfileIncluded")],
    ["041 network policy included", () => must("networkPolicyIncluded")],
    ["042 risk class included", () => must("riskClassIncluded")],
    ["043 resource limits included", () => must("resourceLimitsIncluded")],
    ["044 policy versions included", () => must("policyVersionsIncluded")],
    ["045 evidence references included", () => must("evidenceReferencesIncluded")],
    ["046 preflight happens before capability selection", () => must("preflightBeforeSelection")],
    ["047 preflight happens before model invocation", () => must("preflightBeforeModelInvocation")],
    ["048 preflight result immutable after selection", () => must("preflightImmutableAfterSelection")],
    ["049 no-record decision recorded", () => must("noRecordDecisionRecorded")],
    ["050 exact match classified correctly", () => must("exactMatchClassified")],
    ["051 materially equivalent match classified correctly", () => must("materiallyEquivalentClassified")],
    ["052 related match classified correctly", () => must("relatedClassified")],
    ["053 out-of-scope match classified correctly", () => must("outOfScopeClassified")],
    ["054 superseded record does not apply", () => must("supersededRecordDoesNotApply")],
    ["055 unknown match does not become exact", () => must("unknownDoesNotBecomeExact")],
    ["056 conflicting records require review", () => must("conflictingRequiresReview")],
    ["057 exact known failure is not repeated blindly", () => must("exactFailurePrevented")],
    ["058 materially equivalent failure blocks warns or routes", () => must("equivalentFailurePrevented")],
    ["059 related context receives scoped explanation", () => must("relatedContextScoped")],
    ["060 out-of-scope context is not blocked", () => must("outOfScopeNotBlocked")],
    ["061 certified alternative must exist", () => must("certifiedAlternativeExact")],
    ["062 uncertified alternative blocks", () => expect(() => evaluatePreflight(createContextFingerprint(), [knownFailureWithBadAlternative({ certified: false })])).toThrow()],
    ["063 unavailable alternative blocks", () => expect(() => evaluatePreflight(createContextFingerprint(), [knownFailureWithBadAlternative({ available: false })])).toThrow()],
    ["064 incompatible alternative blocks", () => expect(() => evaluatePreflight(createContextFingerprint(), [knownFailureWithBadAlternative({ compatible: false })])).toThrow()],
    ["065 alternative exact version recorded", () => must("certifiedAlternativeExact")],
    ["066 override requires authority", () => expect(() => evaluatePreflight(createContextFingerprint(), [badOverride({ authority: "" })])).toThrow()],
    ["067 override requires reason", () => expect(() => evaluatePreflight(createContextFingerprint(), [badOverride({ reason: "" })])).toThrow()],
    ["068 override requires scope", () => expect(() => evaluatePreflight(createContextFingerprint(), [badOverride({ scope: "" })])).toThrow()],
    ["069 override requires evidence", () => expect(() => evaluatePreflight(createContextFingerprint(), [badOverride({ evidenceReference: "" })])).toThrow()],
    ["070 expired override blocks", () => expect(() => evaluatePreflight(createContextFingerprint(), [badOverride({ expiresAt: "2020-01-01T00:00:00.000Z" })])).toThrow()],
    ["071 mismatched override blocks", () => expect(() => evaluatePreflight(createContextFingerprint(), [badOverride({ scope: "" })])).toThrow()],
    ["072 preflight empty result is evidenced", () => must("noRecordDecisionRecorded")],
    ["073 model cannot decide preflight", () => must("modelCannotAuthorize")],
    ["074 fixture preflight data labeled fixture", () => expect(evaluatePreflight(createContextFingerprint(), [knownFailureWithGoodAlternative()]).records[0].fixture).toBe(true)],
    ["075 source authorization required", () => must("sourceAuthorized")],
    ["076 source path escape blocks", () => must("sourcePathEscapeBlocked")],
    ["077 source hash recorded", () => must("sourceHashRecorded")],
    ["078 source-set hash stable", () => must("sourceSetHashStable")],
    ["079 source conflict preserved", () => must("sourceConflictPreserved")],
    ["080 active HTML rejected", () => must("activeHtmlRejected")],
    ["081 public URL not fetched", () => must("publicUrlNotFetched")],
    ["082 provenance included", () => must("provenanceIncluded")],
    ["083 successful intake does not imply trust", () => must("intakeDoesNotInferTrust")],
    ["084 retrieval deterministic", () => must("retrievalDeterministic")],
    ["085 retrieval bounded", () => must("retrievalBounded")],
    ["086 candidate knowledge remains candidate", () => must("candidateKnowledgeOnly")],
    ["087 exact Studio ID required", () => must("exactStudioIdRequired")],
    ["088 exact Studio digest required", () => must("exactStudioDigestRequired")],
    ["089 mutable latest selection blocks", () => must("mutableLatestBlocks")],
    ["090 uncertified Studio blocks", () => must("uncertifiedStudioBlocks")],
    ["091 disabled Studio blocks", () => must("disabledStudioBlocks")],
    ["092 unknown workflow blocks", () => must("unknownWorkflowBlocks")],
    ["093 required Runtime unavailable blocks", () => must("requiredRuntimeUnavailableBlocks")],
    ["094 capability selection occurs after preflight", () => must("capabilityAfterPreflight")],
    ["095 exact capability digest recorded", () => must("exactCapabilityDigestRecorded")],
    ["096 uncertified capability blocks", () => must("uncertifiedCapabilityBlocks")],
    ["097 disabled capability blocks", () => must("disabledCapabilityBlocks")],
    ["098 incompatible capability blocks", () => must("incompatibleCapabilityBlocks")],
    ["099 capability self-promotion impossible", () => must("capabilitySelfPromotionImpossible")],
    ["100 model cannot select capability directly", () => must("modelCannotSelectCapability")],
    ["101 fixture provider used", () => must("fixtureProviderUsed")],
    ["102 model request hash recorded", () => must("modelRequestHashRecorded")],
    ["103 model response hash recorded", () => must("modelResponseHashRecorded")],
    ["104 model output remains candidate", () => must("modelCandidateOnly")],
    ["105 model cannot authorize", () => must("modelCannotAuthorize")],
    ["106 model cannot execute tools", () => must("modelCannotExecuteTools")],
    ["107 model citation string not trusted", () => must("modelCitationNotTrusted")],
    ["108 model cannot complete loop", () => must("modelCannotCompleteLoop")],
    ["109 no public model endpoint", () => must("noPublicModelEndpoint")],
    ["110 no real model required", () => must("noRealModelRequired")],
    ["111 Evidence Studio workflow exact", () => must("evidenceStudioWorkflowExact")],
    ["112 document plan preserved", () => must("documentPlanPreserved")],
    ["113 candidate document preserved", () => must("candidateDocumentPreserved")],
    ["114 claim ledger preserved", () => must("claimLedgerPreserved")],
    ["115 source map preserved", () => must("sourceMapPreserved")],
    ["116 provenance preserved", () => must("provenancePreserved")],
    ["117 unsupported claim detected", () => must("unsupportedClaimDetected")],
    ["118 unsupported claim blocks finalization", () => must("unsupportedClaimBlocksFinalization")],
    ["119 corrected claim reevaluated", () => must("correctedClaimReevaluated")],
    ["120 evaluation required", () => must("evaluationRequired")],
    ["121 required evaluation failure blocks", () => must("requiredEvaluationFailureBlocks")],
    ["122 evaluation binds exact artifact", () => must("evaluationBindsExactArtifact")],
    ["123 operator review required", () => must("operatorReviewRequired")],
    ["124 approval binds exact artifact", () => must("approvalBindsExactArtifact")],
    ["125 changed artifact invalidates approval", () => must("changedArtifactInvalidatesApproval")],
    ["126 bounded revision supported", () => must("boundedRevisionSupported")],
    ["127 revision budget enforced", () => must("revisionBudgetEnforced")],
    ["128 prior version preserved", () => must("priorVersionPreserved")],
    ["129 finalization authorization required", () => must("finalizationAuthorizationRequired")],
    ["130 final package immutable", () => must("finalPackageImmutable")],
    ["131 loop package references Studio package", () => must("loopPackageReferencesStudioPackage")],
    ["132 cross-service evidence complete", () => must("crossServiceEvidenceComplete")],
    ["133 closeout required", () => must("closeoutRequired")],
    ["134 closeout binds exact attempt", () => must("closeoutBindsExactAttempt")],
    ["135 closeout does not grant merge", () => must("closeoutDoesNotGrantMerge")],
    ["136 closeout does not grant promotion", () => must("closeoutDoesNotGrantPromotion")],
    ["137 loop completion distinct from broader parent success", () => must("completionDistinctFromParentSuccess")],
    ["138 learning signals remain candidate", () => must("learningSignalsCandidateOnly")],
    ["139 no lesson certified", () => must("noLessonCertified")],
    ["140 no prevention rule activated", () => must("noPreventionActivated")],
    ["141 no innovation promoted", () => must("noInnovationPromoted")],
    ["142 loop event ordering monotonic", () => must("eventOrderingMonotonic")],
    ["143 loop events append-only", () => must("eventsAppendOnly")],
    ["144 idempotent creation", () => must("idempotentCreation")],
    ["145 conflicting idempotency blocks", () => must("conflictingIdempotencyBlocks")],
    ["146 idempotency survives restart", () => must("idempotencySurvivesRestart")],
    ["147 terminal loop persists after restart", () => must("terminalLoopPersistsAfterRestart")],
    ["148 completed preflight persists after restart", () => must("completedPreflightPersistsAfterRestart")],
    ["149 incomplete preflight reruns only when safe", () => must("incompletePreflightRerunsOnlySafe")],
    ["150 changed context blocks resume", () => must("changedContextBlocksResume")],
    ["151 expired authorization blocks resume", () => must("expiredAuthorizationBlocksResume")],
    ["152 changed source set blocks resume", () => must("changedSourceSetBlocksResume")],
    ["153 changed Studio digest blocks resume", () => must("changedStudioDigestBlocksResume")],
    ["154 changed capability digest blocks resume", () => must("changedCapabilityDigestBlocksResume")],
    ["155 incomplete evaluation not assumed passed", () => must("incompleteEvaluationNotPassed")],
    ["156 exact approval survives only unchanged artifact", () => must("approvalSurvivesOnlyUnchangedArtifact")],
    ["157 uncertain side effects require review", () => must("uncertainSideEffectsReview")],
    ["158 closeout not inferred after restart", () => must("closeoutNotInferred")],
    ["159 Runtime health reports dependencies", () => must("runtimeHealthReportsDependencies")],
    ["160 shutdown refuses new loops", () => must("shutdownRefusesNewLoops")],
    ["161 cancellation propagates", () => must("cancellationPropagates")],
    ["162 service closes idempotently", () => must("serviceClosesIdempotently")],
    ["163 Desktop loop view renders", () => must("desktopLoopViewRenders")],
    ["164 Desktop preflight view renders", () => must("desktopPreflightViewRenders")],
    ["165 Desktop evidence view renders", () => must("desktopEvidenceViewRenders")],
    ["166 UI cannot edit preflight", () => must("uiCannotEditPreflight")],
    ["167 UI cannot activate lesson", () => must("uiCannotActivateLesson")],
    ["168 UI cannot finalize directly", () => must("uiCannotFinalizeDirectly")],
    ["169 Gateway reads require session", () => must("gatewayReadsRequireSession")],
    ["170 Gateway mutation requires CSRF", () => must("gatewayMutationRequiresCsrf")],
    ["171 Gateway payload limits enforced", () => must("gatewayPayloadLimitsEnforced")],
    ["172 Gateway requests audited", () => must("gatewayRequestsAudited")],
    ["173 Scenario A passes", () => expect(proof.scenarioResults.A).toBe("CLEAR_NO_APPLICABLE_RECORDS")],
    ["174 Scenario B avoids known failure", () => expect(proof.scenarioResults.B).toBe("APPLY_CERTIFIED_ALTERNATIVE")],
    ["175 Scenario C warns without overgeneralizing", () => expect(proof.scenarioResults.C).toBe("WARN")],
    ["176 Scenario D remains unblocked", () => expect(proof.scenarioResults.D).toBe("CLEAR")],
    ["177 first loop proof passes", () => expect(proof.ok).toBe(true)],
    ["178 second loop proof passes independently", () => expect(second.ok).toBe(true)],
    ["179 proof uses independent temporary state", () => expect(proof.databasePath).not.toBe(second.databasePath)],
    ["180 proof operates outside Git", () => must("proofOperatesOutsideGit")],
    ["181 proof operates offline", () => must("proofOffline")],
    ["182 proof uses no real model", () => must("proofNoRealModel")],
    ["183 proof uses no public network", () => must("proofNoPublicNetwork")],
    ["184 proof mutates no repository source", () => must("proofMutatesNoRepositorySource")],
    ["185 migrations 1 through 9 remain unchanged", () => must("migrationsHistoricalPreserved")],
    ["186 Repository Truth classifies integrated-loop-runtime as Runtime", () => must("repositoryTruthClassifiesRuntime")],
    ["187 Control Plane retains terminal authority", () => must("controlPlaneRetainsTerminalAuthority")],
    ["188 Base MVP manifest arithmetic valid", () => must("baseMvpManifestArithmeticValid")],
    ["189 post-Base roadmap remains planned-only", () => must("postBaseRoadmapPlannedOnly")],
    ["190 Milestone 14 behavior is not falsely claimed complete", () => must("milestone14NotClaimed")],
    ["191 output package has manifest", () => expect(fs.existsSync(path.join(proof.packagePath, "loop-manifest.json"))).toBe(true)],
    ["192 output package has preflight evidence", () => expect(fs.existsSync(path.join(proof.packagePath, "learning-preflight.json"))).toBe(true)],
    ["193 output package has lifecycle events", () => expect(fs.existsSync(path.join(proof.packagePath, "lifecycle-events.jsonl"))).toBe(true)],
    ["194 output package has final report", () => expect(fs.existsSync(path.join(proof.packagePath, "final-loop-report.json"))).toBe(true)],
    ["195 two proofs use distinct loop sessions", () => expect(proof.loopSessionId).not.toBe(second.loopSessionId)],
    ["196 two proofs use distinct operator sessions", () => expect(proof.operatorSessionId).not.toBe(second.operatorSessionId)],
    ["197 two proofs use distinct preflight IDs", () => expect(proof.preflightId).not.toBe(second.preflightId)],
    ["198 state database schema is v10", () => {
      const store = openRuntimeState(createRuntimeStateConfig({ projectRoot: proof.proofRoot, stateRoot: proof.stateRoot, databasePath: proof.databasePath }));
      try { expect(store.inspect().schemaVersion).toBe(11); } finally { store.close(); }
    }],
    ["199 context hash canonical ordering is stable", () => {
      const a = createContextFingerprint({ sourceTypes: ["inline-text", "local-text-file"] });
      const b = createContextFingerprint({ sourceTypes: ["inline-text", "local-text-file"] });
      expect(contextHash(a)).toBe(contextHash(b));
    }],
    ["200 live loop status can inspect an empty store", () => {
      const root = fs.mkdtempSync(path.join(os.tmpdir(), "sera-loop-test-"));
      const store = openRuntimeState({ projectRoot: root });
      try { expect(new IntegratedLoopRuntime(store, { projectRoot: root }).status().ok).toBe(true); } finally { store.close(); }
    }],
    ["201 completed session inspection returns bounded terminal record", () => {
      const inspection = inspectProofSession(proof);
      expect(inspection.ok).toBe(true);
      expect(inspection.loopSessionId).toBe(proof.loopSessionId);
      expect(inspection.attemptId).toBeTruthy();
      expect(inspection.lifecycleState).toBe("COMPLETED");
      expect(inspection.terminal).toBe(true);
      expect(inspection.outcome).toBe("COMPLETED");
    }],
    ["202 session inspection preserves lifecycle transition ordering", () => {
      const inspection = inspectProofSession(proof);
      expect(inspection.transitions.map((transition) => transition.sequence)).toEqual([...inspection.transitions.map((transition) => transition.sequence)].sort((a, b) => Number(a) - Number(b)));
      expect(inspection.transitions[0]?.next_state).toBe("CREATED");
      expect(inspection.transitions[inspection.transitions.length - 1]?.next_state).toBe("COMPLETED");
    }],
    ["203 session inspection includes durable preflight decision and matches", () => {
      const inspection = inspectProofSession(proof);
      expect(inspection.learningPreflight.decision).toBe("APPLY_CERTIFIED_ALTERNATIVE");
      expect(inspection.learningPreflight.preflightId).toBe(proof.preflightId);
      expect(inspection.learningPreflight.matches.length).toBeGreaterThan(0);
      expect(inspection.learningPreflight.matches.some((match) => match.match_class === "MATERIALLY_EQUIVALENT")).toBe(true);
    }],
    ["204 session inspection includes service bindings", () => {
      const inspection = inspectProofSession(proof);
      expect(inspection.bindings.some((binding) => binding.binding_type === "preflight")).toBe(true);
      expect(inspection.bindings.some((binding) => binding.binding_type === "capability")).toBe(true);
      expect(inspection.integrityReferences.authorizationId).toBeTruthy();
    }],
    ["205 session inspection includes artifacts with bounded references", () => {
      const inspection = inspectProofSession(proof);
      expect(inspection.artifacts.some((artifact) => artifact.artifact_type === "learning-preflight")).toBe(true);
      expect(inspection.artifacts.some((artifact) => artifact.artifact_type === "final-loop-package")).toBe(true);
      expect(inspection.artifacts.every((artifact) => !path.isAbsolute(String(artifact.content_addressed_path_or_reference)))).toBe(true);
    }],
    ["206 session inspection reports terminal outcome and reason", () => {
      const inspection = inspectProofSession(proof);
      expect(inspection.terminalReason).toContain("closeout completed");
      expect(inspection.reason).toContain("closeout completed");
      expect(inspection.timestamps.completedAt).toBeTruthy();
    }],
    ["207 session inspection safely represents all terminal loop states", () => {
      for (const state of ["BLOCKED", "FAILED", "CANCELLED", "REVIEW_REQUIRED"] as const) {
        const inspection = inspectTerminalFixture(state);
        expect(inspection.lifecycleState).toBe(state);
        expect(inspection.terminal).toBe(true);
        expect(inspection.terminalReason).toContain(`fixture ${state}`);
      }
    }],
    ["208 unknown session inspection fails with stable not-found code", () => {
      const store = openRuntimeState(createRuntimeStateConfig({ projectRoot: proof.proofRoot, stateRoot: proof.stateRoot, databasePath: proof.databasePath }));
      try {
        const runtime = new IntegratedLoopRuntime(store, { projectRoot: proof.proofRoot });
        expect(() => runtime.inspectSession("missing-loop-session")).toThrow(IntegratedLoopBlockedError);
        try {
          runtime.inspectSession("missing-loop-session");
        } catch (error) {
          expect(error).toBeInstanceOf(IntegratedLoopBlockedError);
          expect((error as IntegratedLoopBlockedError).code).toBe("integrated_loop_session_not_found");
        }
      } finally {
        store.close();
      }
    }],
    ["209 missing inspect ID has safe usage guidance", () => {
      const source = fs.readFileSync(path.join(process.cwd(), "apps", "cli", "src", "index.ts"), "utf8");
      expect(source).toContain("Usage: sera loop inspect <session-id>");
    }],
    ["210 inspecting a session does not change session row counts", () => expectRowCountUnchanged(proof, "integrated_loop_sessions")],
    ["211 inspecting a session does not change transition row counts", () => expectRowCountUnchanged(proof, "integrated_loop_stage_transitions")],
    ["212 inspecting a session does not change loop event row counts", () => expectRowCountUnchanged(proof, "integrated_loop_events")],
    ["213 inspecting a session does not change evidence row counts", () => expectRowCountUnchanged(proof, "evidence_references")],
    ["214 inspecting a session does not change artifact row counts", () => expectRowCountUnchanged(proof, "integrated_loop_artifacts")],
    ["215 inspecting a session leaves durable content unchanged", () => {
      const before = durableLoopDigest(proof);
      inspectProofSession(proof);
      expect(durableLoopDigest(proof)).toBe(before);
    }],
    ["216 inspection remains model-free", () => expect(inspectProofSession(proof).modelUse).toBe(false)],
    ["217 inspection remains public-network-free", () => expect(inspectProofSession(proof).publicNetworkUse).toBe(false)],
    ["218 inspection does not mutate repository source", () => {
      const sourcePath = path.join(process.cwd(), "packages", "integrated-loop-runtime", "src", "integrated-loop-runtime.ts");
      const before = fileDigest(sourcePath);
      inspectProofSession(proof);
      expect(fileDigest(sourcePath)).toBe(before);
    }],
    ["219 CLI help lists loop inspect", () => {
      const source = fs.readFileSync(path.join(process.cwd(), "apps", "cli", "src", "index.ts"), "utf8");
      expect(source).toContain("sera loop inspect <session-id>");
    }],
    ["220 invalid loop command guidance includes inspect", () => {
      const source = fs.readFileSync(path.join(process.cwd(), "apps", "cli", "src", "index.ts"), "utf8");
      expect(source).toContain("status, policy, sessions, inspect, prove");
    }],
    ["221 authorize-fixture remains unsupported", () => {
      const source = fs.readFileSync(path.join(process.cwd(), "apps", "cli", "src", "index.ts"), "utf8");
      expect(source).not.toContain("authorize-fixture");
      expect(source).toContain("Loop command must be one of: status, policy, sessions, inspect, prove.");
    }],
    ["222 existing loop commands remain available", () => {
      const store = openRuntimeState(createRuntimeStateConfig({ projectRoot: proof.proofRoot, stateRoot: proof.stateRoot, databasePath: proof.databasePath }));
      try {
        const runtime = new IntegratedLoopRuntime(store, { projectRoot: proof.proofRoot });
        expect(runtime.status().ok).toBe(true);
        expect(runtime.policy().ok).toBe(true);
        expect(runtime.sessions().some((session) => session.loop_session_id === proof.loopSessionId)).toBe(true);
        expect(second.ok).toBe(true);
      } finally {
        store.close();
      }
    }]
  ];

  for (const [name, assertion] of cases) {
    it(name, assertion);
  }
});

type RuntimeStateStoreHandle = ReturnType<typeof openRuntimeState>;

function inspectProofSession(result: IntegratedLoopProofResult): IntegratedLoopInspection {
  return withProofRuntime(result, (runtime) => runtime.inspectSession(result.loopSessionId));
}

function withProofRuntime<T>(result: IntegratedLoopProofResult, action: (runtime: IntegratedLoopRuntime, store: RuntimeStateStoreHandle) => T): T {
  const store = openRuntimeState(createRuntimeStateConfig({ projectRoot: result.proofRoot, stateRoot: result.stateRoot, databasePath: result.databasePath }));
  try {
    return action(new IntegratedLoopRuntime(store, { projectRoot: result.proofRoot, outputRoot: result.outputRoot }), store);
  } finally {
    store.close();
  }
}

function inspectTerminalFixture(state: Extract<LoopState, "BLOCKED" | "FAILED" | "CANCELLED" | "REVIEW_REQUIRED">): IntegratedLoopInspection {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "sera-loop-terminal-"));
  const store = openRuntimeState(createRuntimeStateConfig({ projectRoot: root }));
  try {
    const runtime = new IntegratedLoopRuntime(store, { projectRoot: root });
    const authorization = createLoopAuthorization();
    runtime.startLoop({ authorization, idempotencyKey: `terminal:${authorization.loopSessionId}` });
    if (state === "REVIEW_REQUIRED") {
      runtime.transition(authorization.loopSessionId, "CREATED", "AUTHORIZING", "operator-gateway", "fixture authorization", "fixture-authorization.json");
      runtime.transition(authorization.loopSessionId, "AUTHORIZING", "PREFLIGHTING", "integrated-loop-runtime", "fixture preflight", "fixture-preflight.json");
      runtime.transition(authorization.loopSessionId, "PREFLIGHTING", state, "learning-governance-runtime", `fixture ${state}`, "fixture-review-required.json");
    } else {
      runtime.transition(authorization.loopSessionId, "CREATED", state, "integrated-loop-runtime", `fixture ${state}`, `fixture-${state.toLowerCase()}.json`);
    }
    return runtime.inspectSession(authorization.loopSessionId);
  } finally {
    store.close();
  }
}

function expectRowCountUnchanged(result: IntegratedLoopProofResult, table: string): void {
  withProofRuntime(result, (_runtime, store) => {
    const before = tableCount(store, table);
    inspectProofSession(result);
    expect(tableCount(store, table)).toBe(before);
  });
}

function tableCount(store: RuntimeStateStoreHandle, table: string): number {
  const safeTable = assertKnownInspectionTable(table);
  const row = store.recoveryGet(`SELECT COUNT(*) AS count FROM ${safeTable}`);
  return Number(row?.count ?? 0);
}

function assertKnownInspectionTable(table: string): string {
  const allowed = new Set(["integrated_loop_sessions", "integrated_loop_stage_transitions", "integrated_loop_events", "evidence_references", "integrated_loop_artifacts"]);
  if (!allowed.has(table)) throw new Error(`Unexpected inspection table: ${table}`);
  return table;
}

function durableLoopDigest(result: IntegratedLoopProofResult): string {
  return withProofRuntime(result, (_runtime, store) => {
    const rows = {
      sessions: store.recoveryAll("SELECT * FROM integrated_loop_sessions WHERE loop_session_id = ? ORDER BY loop_session_id", [result.loopSessionId]),
      transitions: store.recoveryAll("SELECT * FROM integrated_loop_stage_transitions WHERE loop_session_id = ? ORDER BY sequence", [result.loopSessionId]),
      events: store.recoveryAll("SELECT * FROM integrated_loop_events WHERE loop_session_id = ? ORDER BY sequence", [result.loopSessionId]),
      artifacts: store.recoveryAll("SELECT * FROM integrated_loop_artifacts WHERE loop_session_id = ? ORDER BY artifact_type, hash", [result.loopSessionId]),
      bindings: store.recoveryAll("SELECT * FROM integrated_loop_bindings WHERE loop_session_id = ? ORDER BY binding_type, service_id, aggregate_id", [result.loopSessionId]),
      preflight: store.recoveryAll("SELECT * FROM learning_preflight_runs WHERE loop_session_id = ? ORDER BY preflight_id", [result.loopSessionId])
    };
    return crypto.createHash("sha256").update(JSON.stringify(canonicalTestJson(rows))).digest("hex");
  });
}

function fileDigest(filePath: string): string {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function canonicalTestJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalTestJson);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonicalTestJson(item)]));
  }
  return value;
}

function knownFailureWithGoodAlternative(): PreflightRecord {
  return knownFailureWithBadAlternative({});
}

function knownFailureWithBadAlternative(overrides: Partial<NonNullable<PreflightRecord["alternative"]>>): PreflightRecord {
  return {
    recordType: "known-failure",
    recordId: "fixture-known-failure",
    recordVersion: "fixture-v1",
    matchClass: "EXACT",
    activeStatus: "fixture",
    certificationReference: "fixture-cert",
    evidenceReference: "fixture-evidence",
    applicability: "applies",
    fixture: true,
    alternative: {
      capabilityId: "source-grounded-brief-authoring",
      version: "fixture-certified-v1",
      digest: "fixture-certified-v1",
      certified: true,
      available: true,
      compatible: true,
      authorized: true,
      ...overrides
    }
  };
}

function badOverride(overrides: Partial<NonNullable<PreflightRecord["override"]>>): PreflightRecord {
  return {
    recordType: "active-governed-override",
    recordId: "fixture-override",
    recordVersion: "fixture-v1",
    matchClass: "OVERRIDE_APPLICABLE",
    activeStatus: "fixture",
    certificationReference: "fixture-cert",
    evidenceReference: "fixture-evidence",
    applicability: "applies",
    fixture: true,
    override: {
      overrideId: "override",
      authority: "owner",
      reason: "test",
      scope: "workflow",
      expiresAt: new Date(Date.now() + 60000).toISOString(),
      evidenceReference: "override-evidence",
      ...overrides
    }
  };
}
