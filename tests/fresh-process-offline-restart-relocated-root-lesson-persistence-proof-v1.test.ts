import fs from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import {
  RESTART_PERSISTENCE_PROOF_PACKAGE,
  RESTART_PERSISTENCE_PROOF_VERSION,
  RestartPersistenceProofError,
  inspectRestartPersistenceProof,
  restartPersistencePolicy,
  restartPersistenceStatus,
  runRestartPersistenceProof,
  verifyRestartPersistenceProof,
  type RestartPersistenceProofResult
} from "@sera/restart-persistence-proof";

let firstProof: RestartPersistenceProofResult;
let secondProof: RestartPersistenceProofResult;

describe("Fresh-process offline restart relocated-root lesson persistence proof v1", () => {
  beforeAll(async () => {
    firstProof = await runRestartPersistenceProof();
    secondProof = await runRestartPersistenceProof();
  }, 120_000);

  it("publishes the proof package identity without claiming Runtime authority", () => {
    expect(RESTART_PERSISTENCE_PROOF_VERSION).toBe("fresh-process-offline-restart-relocated-root-lesson-persistence-proof-v1");
    expect(RESTART_PERSISTENCE_PROOF_PACKAGE).toBe("@sera/restart-persistence-proof");
    expect(restartPersistenceStatus()).toMatchObject({
      ok: true,
      classification: "certification-proof-infrastructure",
      authorityOwningRuntimeService: false,
      proofBoundary: "fresh-process restart and relocated operational-state recovery on the supported development machine",
      milestone16Boundary: "portable packaged clean-machine proof remains Milestone 16",
      modelUse: false,
      publicNetworkUse: false
    });
  });

  it("publishes a policy that keeps the proof offline and outside installer authority", () => {
    expect(restartPersistencePolicy()).toMatchObject({
      processSeparationRequired: true,
      processAChildRequired: true,
      processAExitCodeRequired: true,
      processBIndependentRecoveryRequired: true,
      relocatedRootRecoveryRequired: true,
      cleanRootRelocationRequired: true,
      noSeparateMachineClaim: true,
      noInstallerClaim: true,
      noControlPlaneAuthority: true,
      noLearningAuthority: true,
      noProviderAuthority: true,
      noGitDependency: true,
      noRealModel: true,
      activePublicNetworkDenialRequired: true,
      publicNetworkUse: false,
      modelUse: false
    });
  });

  it("succeeds and writes a content-addressed evidence package", () => {
    expect(firstProof.ok).toBe(true);
    expect(fs.existsSync(firstProof.evidencePackagePath)).toBe(true);
    expect(firstProof.evidencePackageDigest).toMatch(/^[a-f0-9]{64}$/);
    expect(fs.existsSync(path.join(firstProof.evidencePackagePath, "normalized-summary.json"))).toBe(true);
    expect(fs.existsSync(path.join(firstProof.evidencePackagePath, "proof-manifest.json"))).toBe(true);
    for (const file of [
      "orchestrator-report.json",
      "process-a-report.json",
      "process-b-report.json",
      "process-c-report.json",
      "process-boundary.json",
      "state-before-shutdown.json",
      "state-after-restart.json",
      "relocation-transfer-manifest.json",
      "relocation-verification.json",
      "offline-denial-report.json",
      "exact-context-proof.json",
      "equivalent-context-proof.json",
      "related-context-proof.json",
      "out-of-scope-proof.json",
      "negative-proof-report.json",
      "claim-to-proof-matrix.json",
      "lifecycle-events.jsonl",
      "final-proof-report.json"
    ]) {
      expect(fs.existsSync(path.join(firstProof.evidencePackagePath, file))).toBe(true);
    }
  });

  it("runs a second independent proof root and database", () => {
    expect(secondProof.ok).toBe(true);
    expect(secondProof.proofRoot).not.toBe(firstProof.proofRoot);
    expect(secondProof.databasePath).not.toBe(firstProof.databasePath);
    expect(secondProof.destinationDatabasePath).not.toBe(firstProof.destinationDatabasePath);
  });

  it("uses separate operating-system process identities for restart boundaries", () => {
    expect(new Set([firstProof.orchestrator.pid, firstProof.processA.pid, firstProof.processB.pid, firstProof.processC.pid]).size).toBe(4);
    expect(firstProof.processA.pid).not.toBe(firstProof.orchestrator.pid);
    expect(firstProof.processA.exitCode).toBe(0);
    expect(firstProof.processB.exitCode).toBe(0);
    expect(firstProof.processC.exitCode).toBe(0);
    expect(firstProof.processBoundary.processAExitedBeforeProcessBStarted).toBe(true);
    expect(firstProof.checks.processAChildProcess).toBe(true);
    expect(firstProof.checks.processAExitCodeVerified).toBe(true);
    expect(firstProof.checks.processAExitedBeforeProcessBStarted).toBe(true);
    expect(firstProof.checks.processBReopenedSqlite).toBe(true);
    expect(firstProof.processB.reconstructedFromDurableState).toBe(true);
    expect(firstProof.processC.reconstructedFromDurableState).toBe(true);
    expect(firstProof.noInMemoryStateCrossedBoundary).toBe(true);
    expect(firstProof.processBoundary.noLiveObjectsPassed).toBe(true);
  });

  it("keeps installation identity stable while Runtime instance identities change", () => {
    expect(firstProof.installationIdentityStable).toBe(true);
    expect(firstProof.runtimeInstanceIdentitiesDistinct).toBe(true);
    expect(firstProof.processA.installationId).toBe(firstProof.processB.installationId);
    expect(firstProof.processB.installationId).toBe(firstProof.processC.installationId);
    expect(firstProof.processA.runtimeInstanceId).not.toBe(firstProof.processB.runtimeInstanceId);
    expect(firstProof.processB.runtimeInstanceId).not.toBe(firstProof.processC.runtimeInstanceId);
  });

  it("preserves Runtime State schema version and all migration checksums", () => {
    expect(firstProof.schemaVersion).toBe(11);
    expect(firstProof.migrationChecksumSummary).toHaveLength(11);
    expect(firstProof.migrationChecksumSummary.map((row) => row.version)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    expect(firstProof.checks.schemaPosture).toBe(true);
  });

  it("recovers the active durable lesson and prevention rule after restart", () => {
    expect(firstProof.lesson.state).toBe("ACTIVE");
    expect(firstProof.lesson.version).toBe("2");
    expect(firstProof.lesson.supersededHistory).toHaveLength(1);
    expect(firstProof.preventionRule.active).toBe(true);
    expect(firstProof.preventionRule.lessonVersion).toBe("2");
    expect(firstProof.rejectedLesson.inactive).toBe(true);
    expect(firstProof.override.governed).toBe(true);
    expect(firstProof.innovation.inactive).toBe(true);
    expect(firstProof.checks.durableLessonRetrieved).toBe(true);
    expect(firstProof.checks.durablePreventionRuleRetrieved).toBe(true);
  });

  it("keeps semantic learning identities stable across restart and relocation", () => {
    expect(firstProof.semanticIdentitiesStable).toBe(true);
    expect(firstProof.restartedCounts.learning_governance_lessons).toBe(firstProof.originalCounts.learning_governance_lessons);
    expect(firstProof.secondRestartCounts.learning_governance_lesson_activations).toBe(firstProof.originalCounts.learning_governance_lesson_activations);
    expect(firstProof.relocatedCounts.learning_governance_prevention_rules).toBe(firstProof.originalCounts.learning_governance_prevention_rules);
  });

  it("prevents exact known failures before restart and after all restarts", () => {
    expect(firstProof.decisions.exact).toEqual({
      before: "APPLY_CERTIFIED_ALTERNATIVE",
      afterRestart: "APPLY_CERTIFIED_ALTERNATIVE",
      afterSecondRestart: "APPLY_CERTIFIED_ALTERNATIVE",
      afterRelocation: "APPLY_CERTIFIED_ALTERNATIVE"
    });
  });

  it("prevents materially equivalent failures without over-recreating records", () => {
    expect(firstProof.decisions.equivalent.afterRestart).toBe("APPLY_CERTIFIED_ALTERNATIVE");
    expect(firstProof.decisions.equivalent.afterSecondRestart).toBe("APPLY_CERTIFIED_ALTERNATIVE");
    expect(firstProof.scenarios.equivalent.matchClass).toBe("MATERIALLY_EQUIVALENT");
    expect(firstProof.checks.equivalentPrevention).toBe(true);
    expect(firstProof.checks.restartIdempotency).toBe(true);
  });

  it("keeps related context warning-scoped instead of blocked", () => {
    expect(firstProof.decisions.related.afterRestart).toBe("WARN_RELATED_CONTEXT");
    expect(firstProof.decisions.related.afterRelocation).toBe("WARN_RELATED_CONTEXT");
    expect(firstProof.checks.relatedScoped).toBe(true);
  });

  it("keeps out-of-scope context clear after restart and relocation", () => {
    expect(firstProof.decisions.outOfScope.afterRestart).toBe("CLEAR_OUT_OF_SCOPE");
    expect(firstProof.decisions.outOfScope.afterRelocation).toBe("CLEAR_OUT_OF_SCOPE");
    expect(firstProof.checks.outOfScopeClear).toBe(true);
  });

  it("performs learning preflight before selection and generation and avoids the bad path", () => {
    expect(firstProof.preflightBeforeSelectionGenerationExecution).toBe(true);
    expect(firstProof.scenarios.exact.preflightId).toMatch(/^preflight_/);
    expect(firstProof.knownBadPathExecuted).toBe(false);
    expect(firstProof.checks.knownBadPathAvoided).toBe(true);
    expect(firstProof.selectedCertifiedAlternative).toBe("repair-candidate-digest-v1");
  });

  it("proves relocated fresh-process repeatability", () => {
    expect(firstProof.secondRestartResult).toBe("relocated-fresh-process-repeatable");
    expect(firstProof.checks.secondRestartRepeatable).toBe(true);
  });

  it("relocates to a distinct clean root without Git dependency", () => {
    expect(path.resolve(firstProof.sourceRoot)).not.toBe(path.resolve(firstProof.destinationRoot));
    expect(firstProof.transfer.rootsDistinct).toBe(true);
    expect(firstProof.transfer.destinationHasGit).toBe(false);
    expect(firstProof.transfer.noGitDependency).toBe(true);
    expect(firstProof.transfer.formerOperationalStateRootUnavailable).toBe(true);
    expect(fs.existsSync(firstProof.transfer.formerOperationalStateRoot)).toBe(false);
    expect(firstProof.checks.processCReopenedRelocatedSqlite).toBe(true);
    expect(firstProof.checks.relocatedRootOperation).toBe(true);
  });

  it("uses safe backup/export transfer with checksums and WAL posture", () => {
    expect(firstProof.transfer.copiedFromSafeBackup).toBe(true);
    expect(firstProof.transfer.walCheckpointed).toBe(true);
    expect(firstProof.transfer.manifestDigest).toMatch(/^[a-f0-9]{64}$/);
    expect(firstProof.transfer.fileCount).toBe(3);
    expect(firstProof.transfer.items.map((item) => item.path)).toEqual([
      ".sera/runtime-host/state/identity.json",
      ".sera/state/sera-operational-export.json",
      ".sera/state/sera-operational.db"
    ]);
    for (const item of firstProof.transfer.items) {
      expect(item.byteSize).toBeGreaterThan(0);
      expect(item.sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(item.sourceInstallationIdentity).toBe(firstProof.processA.installationId);
    }
    expect(firstProof.checks.transferBoundary).toBe(true);
  });

  it("rejects corrupted, incomplete, modified, missing, traversal, and escape transfer material", () => {
    expect(firstProof.transfer.corruptedBackupRejected).toBe(true);
    expect(firstProof.transfer.incompleteTransferRejected).toBe(true);
    expect(firstProof.transfer.modifiedChecksumRejected).toBe(true);
    expect(firstProof.transfer.missingEvidenceRejected).toBe(true);
    expect(firstProof.transfer.pathTraversalRejected).toBe(true);
    expect(firstProof.transfer.symlinkEscapeRejected).toBe(true);
  });

  it("rejects unsafe destination promotion and schema-transfer cases", () => {
    expect(firstProof.transfer.sourceDestinationOverlapRejected).toBe(true);
    expect(firstProof.transfer.openDatabaseCopyRejected).toBe(true);
    expect(firstProof.transfer.interruptedPromotionRejected).toBe(true);
    expect(firstProof.transfer.staleTemporaryDestinationRejected).toBe(true);
    expect(firstProof.transfer.schemaMismatchRejected).toBe(true);
    expect(firstProof.transfer.futureSchemaRejected).toBe(true);
  });

  it("preserves recovery, duplicate prevention, terminal immutability, and lease fencing", () => {
    expect(firstProof.recoveryConservative).toBe(true);
    expect(firstProof.idempotencyAndDuplicatePrevention).toBe(true);
    expect(firstProof.terminalImmutability).toBe(true);
    expect(firstProof.runtimeLeaseFencing).toBe(true);
  });

  it("actively denies public network and stays model-free/source-mutation-free", () => {
    expect(firstProof.modelUse).toBe(false);
    expect(firstProof.publicNetworkUse).toBe(false);
    expect(firstProof.publicNetworkActivelyDenied).toBe(true);
    expect(firstProof.offlineDenial.active).toBe(true);
    expect(firstProof.offlineDenial.publicNetworkPrevented).toBe(true);
    expect(firstProof.offlineDenial.events.length).toBeGreaterThanOrEqual(27);
    expect(firstProof.offlineDenial.events.map((event) => event.operationType)).toEqual(expect.arrayContaining(["dns-lookup", "dns-resolve", "http-request", "https-request", "tcp-socket", "tls-socket", "global-fetch", "model-download", "public-url-intake"]));
    expect(firstProof.offlineDenial.events.every((event) => event.networkConnectionCreated === false)).toBe(true);
    expect(firstProof.repositorySourceMutation).toBe(false);
    expect(firstProof.checks.noRealModel).toBe(true);
    expect(firstProof.checks.offlineOperation).toBe(true);
    expect(firstProof.checks.activeOfflineDenial).toBe(true);
    expect(firstProof.checks.noSourceMutation).toBe(true);
  });

  it("records stable negative proof classifications", () => {
    expect(Object.keys(firstProof.negativeProofs)).toEqual(expect.arrayContaining([
      "missingTransferredDatabase",
      "transferSizeMismatch",
      "transferHashMismatch",
      "corruptedDatabaseOrEvidence",
      "alteredLessonIntegrityHash",
      "supersededLessonPresentedActive",
      "rejectedLessonPresentedActive",
      "expiredOverride",
      "overrideScopeMismatch",
      "duplicateIdempotentRecovery",
      "conflictingIdempotencyReuse",
      "staleLease",
      "invalidFencingToken",
      "terminalRecordMutation",
      "formerOperationalRootAccess",
      "nonLoopbackNetworkUse"
    ]));
    expect(Object.values(firstProof.negativeProofs).every((result) => ["blocked", "failed-safe", "review-required"].includes(result.status))).toBe(true);
  });

  it("maps claims to concrete proof files", () => {
    expect(firstProof.claimToProofMatrix).toHaveLength(23);
    expect(firstProof.claimToProofMatrix.every((claim) => claim.status === "PASS")).toBe(true);
    expect(firstProof.claimToProofMatrix.map((claim) => claim.claimId)).toContain("claim-21");
    expect(firstProof.claimToProofMatrix.every((claim) => typeof claim.evidenceDigest === "string" && /^[a-f0-9]{64}$/.test(String(claim.evidenceDigest)))).toBe(true);
  });

  it("inspects and verifies an existing proof package without mutation", () => {
    const before = fs.statSync(path.join(firstProof.proofRoot, "normalized-summary.json")).mtimeMs;
    const inspected = inspectRestartPersistenceProof(firstProof.proofRoot);
    const verified = verifyRestartPersistenceProof(firstProof.proofRoot);
    const after = fs.statSync(path.join(firstProof.proofRoot, "normalized-summary.json")).mtimeMs;

    expect(inspected.ok).toBe(true);
    expect(verified.ok).toBe(true);
    expect(after).toBe(before);
  });

  it("fails safely for unknown or malformed proof identifiers", () => {
    expect(() => inspectRestartPersistenceProof("missing-proof")).toThrow(RestartPersistenceProofError);
    expect(() => inspectRestartPersistenceProof("..\\malformed-proof")).toThrow(RestartPersistenceProofError);
  });

  it("records a normalized summary with portable proof identity and Milestone 16 boundary", () => {
    expect(firstProof.normalizedSummary.proofId).toBe(firstProof.proofId);
    expect(firstProof.normalizedSummary.version).toBe(RESTART_PERSISTENCE_PROOF_VERSION);
    expect(firstProof.normalizedSummary.modelUse).toBe(false);
    expect(firstProof.normalizedSummary.publicNetworkUse).toBe(false);
    expect(firstProof.normalizedSummary.publicNetworkActivelyDenied).toBe(true);
    expect(firstProof.normalizedSummary.milestone16Boundary).toBe("not-a-packaged-separate-clean-machine-proof");
  });
});
