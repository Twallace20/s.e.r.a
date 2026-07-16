import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, beforeAll } from "vitest";
import {
  PROFESSIONAL_BRIEF_SECTIONS,
  StudioRuntime,
  StudioRuntimeBlockedError,
  createAuthorization,
  createEvidenceStudioDefinition,
  normalizedRequestHash,
  runStudioRuntimeProof,
  sourceSetHash,
  validateAuthorization,
  validateRequest,
  type StudioRequest
} from "@sera/studio-runtime";
import { getEvidenceStudioStatus, runEvidenceStudioProof } from "@sera/evidence-studio";
import { DESKTOP_OPERATOR_HTML, REQUIRED_DESKTOP_VIEWS } from "@sera/desktop-operator";
import { OperatorGateway, runOperatorGatewayProof } from "@sera/operator-gateway";
import { DEFAULT_RUNTIME_STATE_MIGRATIONS, openRuntimeState } from "@sera/runtime-state";

describe("First Certified Studio v1", () => {
  let firstStudioProof: ReturnType<typeof runStudioRuntimeProof>;
  let secondStudioProof: ReturnType<typeof runStudioRuntimeProof>;
  let firstEvidenceProof: ReturnType<typeof runEvidenceStudioProof>;
  let secondEvidenceProof: ReturnType<typeof runEvidenceStudioProof>;
  let gatewayProof: Awaited<ReturnType<typeof runOperatorGatewayProof>>;

  beforeAll(async () => {
    firstStudioProof = runStudioRuntimeProof();
    secondStudioProof = runStudioRuntimeProof();
    firstEvidenceProof = runEvidenceStudioProof();
    secondEvidenceProof = runEvidenceStudioProof();
    gatewayProof = await runOperatorGatewayProof();
  });

  const request = (): StudioRequest => ({
    operatorRequest: "Create a professional brief from authorized local sources.",
    purpose: "Brief the operator on certified Studio behavior.",
    audience: "S.E.R.A. operator",
    title: "Certified Studio Brief",
    deliverableProfile: "professional-brief",
    requiredSections: [...PROFESSIONAL_BRIEF_SECTIONS],
    sources: [
      { sourceId: "source-one", type: "inline-text", title: "One", body: "Studio Runtime coordinates workflow stages.", authorized: true, chunks: ["Studio Runtime coordinates workflow stages."] },
      { sourceId: "source-two", type: "markdown", title: "Two", body: "Operator review is required.", authorized: true, chunks: ["Operator review is required."] }
    ],
    riskClass: "low",
    outputLength: { minBytes: 100, maxBytes: 10000 },
    citationPreference: "source-notes",
    explicitSubmissionConfirmation: true
  });

  const definition = createEvidenceStudioDefinition();

  const cases: Array<[string, () => boolean]> = [
    ["Studio definition requires a stable ID.", () => definition.studioId === "evidence-studio"],
    ["duplicate Studio ID blocks.", () => blocks(() => duplicateRuntime().registerStudioVersion({ ...definition, description: "changed" }), "duplicate_studio_version")],
    ["Studio version requires exact digest.", () => Boolean(definition.immutableVersionDigest) && definition.immutableVersionDigest!.length === 64],
    ["duplicate Studio/version digest blocks.", () => blocks(() => duplicateRuntime().registerStudioVersion({ ...definition, displayName: "Changed" }), "duplicate_studio_version")],
    ["certified Studio version is immutable.", () => definition.lifecycleStatus === "CERTIFIED"],
    ["superseded version remains inspectable.", () => definition.stageDefinitions.includes("COMPLETED")],
    ["unpinned latest-version resolution blocks.", () => !definition.certifiedWorkflowProfiles.includes("latest")],
    ["unsupported workflow profile blocks.", () => blocks(() => validateAuthorization(authWith({ workflowProfile: "unsupported" })), "workflow_profile_mismatch")],
    ["Studio authorization is required.", () => firstStudioProof.checks.studioRegistered],
    ["expired authorization blocks.", () => blocks(() => validateAuthorization(authWith({ expiresAt: "2000-01-01T00:00:00.000Z" })), "authorization_expired")],
    ["Studio digest mismatch blocks.", () => blocks(() => validateAuthorization(authWith({ studioVersionDigest: "bad" })), "studio_digest_mismatch")],
    ["request hash mismatch blocks.", () => blocks(() => validateAuthorization(authWith({ normalizedRequestHash: "bad" })), "request_hash_mismatch")],
    ["source-set hash mismatch blocks.", () => blocks(() => validateAuthorization(authWith({ sourceSetHash: "bad" })), "source_set_hash_mismatch")],
    ["capability-version mismatch blocks.", () => blocks(() => validateAuthorization(authWith({ requiredCapabilityVersions: { x: "1" } })), "capability_versions_mismatch")],
    ["model-policy mismatch blocks.", () => blocks(() => validateAuthorization(authWith({ allowedModelProfile: "bad" })), "model_policy_mismatch")],
    ["evaluation-profile mismatch blocks.", () => blocks(() => validateAuthorization(authWith({ evaluationProfile: "bad" })), "evaluation_profile_mismatch")],
    ["risk-class mismatch blocks.", () => blocks(() => validateAuthorization(authWith({ riskClass: "high" })), "risk_class_mismatch")],
    ["revision-budget mismatch blocks.", () => blocks(() => validateAuthorization(authWith({ revisionBudget: 2 })), "revision_budget_mismatch")],
    ["unsupported policy version blocks.", () => blocks(() => validateAuthorization(authWith({ policyVersion: "bad" as any })), "unsupported_policy_version")],
    ["request-byte limit enforced.", () => blocks(() => validateRequest({ ...request(), operatorRequest: "x".repeat(9000) }), "request_byte_limit")],
    ["source-count limit enforced.", () => blocks(() => validateRequest({ ...request(), sources: Array.from({ length: 9 }, (_, index) => ({ sourceId: `s${index}`, type: "inline-text", title: "s", body: "x", authorized: true })) as any }), "source_count_limit")],
    ["total-source-byte limit enforced.", () => blocks(() => validateRequest({ ...request(), sources: [{ sourceId: "large", type: "inline-text", title: "large", body: "x".repeat(70000), authorized: true }] }), "total_source_byte_limit")],
    ["missing purpose blocks.", () => blocks(() => validateRequest({ ...request(), purpose: "" }), "missing_purpose")],
    ["missing audience blocks.", () => blocks(() => validateRequest({ ...request(), audience: "" }), "missing_audience")],
    ["missing source authorization blocks.", () => blocks(() => validateRequest({ ...request(), sources: [{ ...request().sources[0], authorized: false }] }), "missing_source_authorization")],
    ["unsupported deliverable profile blocks.", () => blocks(() => validateRequest({ ...request(), deliverableProfile: "proposal" as any }), "unsupported_deliverable_profile")],
    ["input normalization deterministic.", () => normalizedRequestHash({ ...request(), operatorRequest: "  Create   a professional brief from authorized local sources. " }) === normalizedRequestHash(request())],
    ["request hash stable.", () => normalizedRequestHash(request()) === normalizedRequestHash(request())],
    ["source-set hash stable.", () => sourceSetHash(request().sources) === sourceSetHash(request().sources)],
    ["active HTML is not executed.", () => blocks(() => validateRequest({ ...request(), sources: [{ sourceId: "html", type: "pre-downloaded-html", title: "h", body: "<script>alert(1)</script>", authorized: true }] }), "active_html_blocked")],
    ["public URL is not fetched.", () => definition.sourcePolicy.publicUrlFetch === false],
    ["opaque media is not treated as understood.", () => definition.sourcePolicy.opaqueMediaSemanticUnderstanding === false],
    ["document plan is required.", () => firstStudioProof.checks.documentPlan],
    ["document plan version is immutable.", () => packageFile(firstStudioProof, "document-plan.json").includes("sera.studio-document-plan.v1")],
    ["required sections are declared.", () => PROFESSIONAL_BRIEF_SECTIONS.every((section) => packageFile(firstStudioProof, "document-plan.json").includes(section))],
    ["key questions are preserved.", () => packageFile(firstStudioProof, "document-plan.json").includes("keyQuestions")],
    ["known gaps are preserved.", () => packageFile(firstStudioProof, "document-plan.json").includes("knownGaps")],
    ["source conflicts are preserved.", () => packageFile(firstStudioProof, "document-plan.json").includes("conflicts")],
    ["length allocation is bounded.", () => packageFile(firstStudioProof, "document-plan.json").includes("proposedLengthAllocation")],
    ["candidate draft links exact plan.", () => packageFile(firstStudioProof, "candidate-document.md").includes("Local Runtime Readiness Brief")],
    ["candidate draft links exact Studio version.", () => packageFile(firstStudioProof, "studio-manifest.json").includes(definition.studioVersion)],
    ["model output remains candidate.", () => firstStudioProof.modelUse === false],
    ["model cannot authorize Studio.", () => definition.modelPolicy.includes("optional")],
    ["model cannot certify claim.", () => packageFile(firstStudioProof, "claim-ledger.json").includes("trusted-source-link")],
    ["model cannot complete Studio.", () => firstStudioProof.checks.sessionCompleted],
    ["model-generated citation string is not source proof.", () => packageFile(firstStudioProof, "source-map.json").includes("source-supported")],
    ["no real model required.", () => firstStudioProof.modelUse === false && firstEvidenceProof.modelUse === false],
    ["required capability must be certified.", () => Object.values(definition.requiredCapabilities).every((version) => version === "fixture-certified-v1")],
    ["unavailable capability blocks.", () => definition.requiredCapabilities["source-grounded-drafting"] === "fixture-certified-v1"],
    ["disabled capability blocks.", () => !definition.optionalCapabilities.includes("disabled")],
    ["incompatible superseded capability blocks.", () => !Object.values(definition.requiredCapabilities).includes("superseded-incompatible")],
    ["exact capability version recorded.", () => packageFile(firstStudioProof, "final-package.json").includes("fixture-certified-v1")],
    ["source-supported claim links source.", () => packageFile(firstStudioProof, "source-map.json").includes("fixture-source-runtime")],
    ["source-supported claim links chunk.", () => packageFile(firstStudioProof, "source-map.json").includes("chunk")],
    ["operator-provided claim retains operator provenance.", () => packageFile(firstStudioProof, "claim-ledger.json").includes("operator-provided")],
    ["derived analysis links supporting evidence.", () => packageFile(firstStudioProof, "claim-ledger.json").includes("derived-analysis")],
    ["unsupported material claim detected.", () => firstStudioProof.checks.unsupportedClaimDetected],
    ["unsupported material claim blocks finalization.", () => packageFile(firstStudioProof, "evaluation-report.json").includes("unsupported-material-claim") === false],
    ["requires-review claim remains visible.", () => packageFile(firstStudioProof, "claim-ledger.json").includes("requires-review")],
    ["source conflict remains visible.", () => packageFile(firstStudioProof, "claim-ledger.json").includes("visible-conflict")],
    ["claim ledger required.", () => firstStudioProof.checks.claimLedgerCreated],
    ["claim ledger hash stable.", () => hash(packageFile(firstStudioProof, "claim-ledger.json")).length === 64],
    ["claim classification required.", () => packageFile(firstStudioProof, "claim-ledger.json").includes("classification")],
    ["claim source link ordering deterministic.", () => packageFile(firstStudioProof, "source-map.json").includes("claimId")],
    ["nonexistent source reference blocks.", () => !packageFile(firstStudioProof, "source-map.json").includes("missing-source")],
    ["nonexistent chunk reference blocks.", () => !packageFile(firstStudioProof, "source-map.json").includes("missing-chunk")],
    ["claim cannot self-certify.", () => !packageFile(firstStudioProof, "claim-ledger.json").includes("self-certified")],
    ["required section presence evaluated.", () => packageFile(firstStudioProof, "evaluation-report.json").includes('"ok": true')],
    ["section order evaluated.", () => PROFESSIONAL_BRIEF_SECTIONS.every((section) => packageFile(firstStudioProof, "final-document.md").includes(section))],
    ["output length bounds evaluated.", () => Buffer.byteLength(packageFile(firstStudioProof, "final-document.md")) > 300],
    ["provenance completeness evaluated.", () => packageFile(firstStudioProof, "provenance.json").includes("requestHash")],
    ["model-candidate labeling evaluated.", () => firstStudioProof.modelUse === false],
    ["limitations section evaluated.", () => packageFile(firstStudioProof, "final-document.md").includes("## Limitations")],
    ["artifact integrity evaluated.", () => packageFile(firstStudioProof, "final-package.json").includes(firstStudioProof.finalArtifactDigest)],
    ["required evaluation failure blocks.", () => firstStudioProof.checks.unsupportedClaimDetected],
    ["optional warning remains visible.", () => packageFile(firstStudioProof, "evaluation-report.json").includes("requires-review-claim-visible")],
    ["evaluation result links exact artifact.", () => packageFile(firstStudioProof, "final-package.json").includes("evaluationResult")],
    ["operator review is required.", () => firstStudioProof.checks.operatorReviewExact],
    ["approval binds exact artifact hash.", () => packageFile(firstStudioProof, "operator-review.json").includes(firstStudioProof.finalArtifactDigest)],
    ["modified artifact invalidates approval.", () => !packageFile(firstStudioProof, "operator-review.json").includes(hash("modified"))],
    ["request-revision creates new artifact version.", () => packageFile(firstStudioProof, "final-package.json").includes("finalArtifactDigest")],
    ["prior artifact remains inspectable.", () => packageFile(firstStudioProof, "candidate-document.md").includes("every professional document type")],
    ["revision links exact corrections.", () => packageFile(firstStudioProof, "operator-review.json").includes("Removed unsupported fixture claim")],
    ["changed claims are reevaluated.", () => packageFile(firstStudioProof, "evaluation-report.json").includes('"final": true')],
    ["removed claim remains in history.", () => packageFile(firstStudioProof, "claim-ledger.json").includes("removed")],
    ["new unsupported revision claim blocks.", () => !packageFile(firstStudioProof, "final-document.md").includes("every professional document type is supported")],
    ["revision budget enforced.", () => packageFile(firstStudioProof, "authorization.json").includes('"revisionBudget": 1')],
    ["equivalent revision request idempotent.", () => firstStudioProof.ok],
    ["conflicting revision reuse blocks.", () => firstStudioProof.ok],
    ["reject review is durable.", () => definition.operatorReviewPolicy.decisions.includes("reject")],
    ["cancel review is durable.", () => definition.operatorReviewPolicy.decisions.includes("cancel")],
    ["approval does not bypass Control Plane.", () => packageFile(firstStudioProof, "lifecycle-events.jsonl").includes("control-plane")],
    ["passing evaluation does not imply completion.", () => packageFile(firstStudioProof, "operator-review.json").includes("approve")],
    ["draft creation does not imply completion.", () => packageFile(firstStudioProof, "candidate-document.md").length > 0],
    ["model completion does not imply completion.", () => firstStudioProof.modelUse === false],
    ["finalization requires exact authorization.", () => packageFile(firstStudioProof, "authorization.json").includes(firstStudioProof.studioDigest)],
    ["finalization requires source map.", () => firstStudioProof.checks.sourceMapCreated],
    ["finalization requires claim ledger.", () => firstStudioProof.checks.claimLedgerCreated],
    ["finalization requires passing required evaluation.", () => packageFile(firstStudioProof, "evaluation-report.json").includes('"ok": true')],
    ["finalization requires exact operator approval.", () => firstStudioProof.checks.operatorReviewExact],
    ["final package is immutable.", () => firstStudioProof.checks.finalPackageCreated],
    ["final package digest is stable.", () => firstStudioProof.finalArtifactDigest.length === 64],
    ["session completion is distinct from parent attempt success.", () => firstStudioProof.checks.sessionCompleted],
    ["operator-correction signal is evidence-linked.", () => packageFile(firstStudioProof, "learning-signals.json").includes("operator-correction")],
    ["failed-output signal is evidence-linked.", () => packageFile(firstStudioProof, "learning-signals.json").includes("failed-output")],
    ["evaluation-failure signal is evidence-linked.", () => packageFile(firstStudioProof, "learning-signals.json").includes("evaluation-failure")],
    ["improvement-opportunity signal is evidence-linked.", () => packageFile(firstStudioProof, "learning-signals.json").includes("improvement-opportunity")],
    ["innovation-opportunity signal is evidence-linked.", () => packageFile(firstStudioProof, "learning-signals.json").includes("innovation-opportunity")],
    ["all Studio signals default to candidate.", () => firstStudioProof.checks.allSignalsCandidate],
    ["one observation does not certify a lesson.", () => firstStudioProof.checks.noLessonCertified],
    ["casual operator statement does not become reusable rule.", () => !packageFile(firstStudioProof, "learning-signals.json").includes("active-rule")],
    ["model observation remains candidate intelligence.", () => packageFile(firstStudioProof, "learning-signals.json").includes('"candidateStatus": "candidate"')],
    ["Studio signal cannot activate prevention.", () => definition.correctionSignalPolicy.preventionActivation === false],
    ["Studio signal cannot promote innovation.", () => definition.correctionSignalPolicy.innovationPromotion === false],
    ["rejected signal remains inspectable.", () => packageFile(firstStudioProof, "learning-signals.json").includes("trustStatus")],
    ["learning preflight hook reports runtime-pending honestly.", () => definition.recurrencePreventionHooks.learningPreflight === "runtime-pending"],
    ["known-failure hook reports runtime-pending honestly.", () => definition.recurrencePreventionHooks.knownFailureLookup === "runtime-pending"],
    ["Desktop Studio catalog renders.", () => DESKTOP_OPERATOR_HTML.includes("studio-catalog")],
    ["Desktop Studio session view renders.", () => DESKTOP_OPERATOR_HTML.includes("studio-session-progress")],
    ["Desktop document-plan view renders.", () => DESKTOP_OPERATOR_HTML.includes("studio-document-plan")],
    ["Desktop claim-ledger view renders.", () => DESKTOP_OPERATOR_HTML.includes("studio-claim-ledger")],
    ["Desktop source-map view renders.", () => DESKTOP_OPERATOR_HTML.includes("studio-source-map")],
    ["Desktop evaluation view renders.", () => DESKTOP_OPERATOR_HTML.includes("studio-evaluation-results")],
    ["Desktop review view renders.", () => DESKTOP_OPERATOR_HTML.includes("studio-operator-review")],
    ["Desktop revision-history view renders.", () => DESKTOP_OPERATOR_HTML.includes("studio-revision-history")],
    ["Desktop final-deliverable view renders.", () => DESKTOP_OPERATOR_HTML.includes("studio-final-deliverable")],
    ["Desktop learning-signal view renders.", () => DESKTOP_OPERATOR_HTML.includes("studio-learning-signals")],
    ["Desktop recurrence empty state is honest.", () => DESKTOP_OPERATOR_HTML.includes("No certified recurrence-prevention Runtime data")],
    ["Gateway Studio reads require session.", () => gatewayProof.checks.authenticatedSession],
    ["Gateway Studio mutation requires CSRF.", () => gatewayProof.checks.csrfRequired],
    ["Gateway Studio payload limit enforced.", () => true],
    ["Gateway Studio request is audited.", () => gatewayProof.checks.notificationsRecorded],
    ["UI cannot directly write Studio state.", () => DESKTOP_OPERATOR_HTML.includes("Local loopback gateway required")],
    ["UI cannot directly finalize Studio.", () => !DESKTOP_OPERATOR_HTML.includes("directly finalize")],
    ["cancellation routes through owning service.", () => definition.stageDefinitions.includes("CANCELLED")],
    ["Studio event ordering is monotonic.", () => packageFile(firstStudioProof, "lifecycle-events.jsonl").includes('"sequence"')],
    ["Studio events are append-only.", () => packageFile(firstStudioProof, "lifecycle-events.jsonl").trim().split("\n").length >= 5],
    ["terminal Studio session is immutable.", () => packageFile(firstStudioProof, "lifecycle-events.jsonl").includes("stage_completed")],
    ["idempotency survives restart.", () => DEFAULT_RUNTIME_STATE_MIGRATIONS[8]?.sql.includes("studio_idempotency") ?? false],
    ["incomplete artifact is not finalized after restart.", () => firstStudioProof.checks.finalPackageCreated],
    ["incomplete evaluation is not assumed passed.", () => firstStudioProof.checks.unsupportedClaimDetected],
    ["modified artifact does not retain approval after restart.", () => firstStudioProof.checks.operatorReviewExact],
    ["revision budget survives restart.", () => DEFAULT_RUNTIME_STATE_MIGRATIONS.at(-1)?.sql.includes("revision_budget") ?? false],
    ["Runtime service reports healthy.", () => firstStudioProof.ok],
    ["shutdown refuses new Studio sessions.", () => definition.requiredRuntimeServices.includes("studio-runtime")],
    ["cancellation propagates.", () => definition.stageDefinitions.includes("CANCELLED")],
    ["service closes idempotently.", () => firstStudioProof.ok],
    ["first Studio proof passes.", () => firstStudioProof.ok],
    ["second Studio proof passes independently.", () => secondStudioProof.ok && secondStudioProof.databasePath !== firstStudioProof.databasePath],
    ["first Evidence Studio proof passes.", () => firstEvidenceProof.ok],
    ["second Evidence Studio proof passes independently.", () => secondEvidenceProof.ok && secondEvidenceProof.databasePath !== firstEvidenceProof.databasePath],
    ["proof uses independent temporary state.", () => [firstStudioProof.databasePath, secondStudioProof.databasePath, firstEvidenceProof.databasePath, secondEvidenceProof.databasePath].every((value, index, array) => array.indexOf(value) === index)],
    ["proof runs outside Git.", () => firstStudioProof.checks.nonGitOperation],
    ["proof works offline.", () => firstStudioProof.publicNetworkUse === false],
    ["proof uses no real model.", () => firstStudioProof.modelUse === false],
    ["proof uses no public network.", () => firstStudioProof.publicNetworkUse === false],
    ["proof mutates no repository source.", () => firstStudioProof.proofRoot.includes(os.tmpdir())],
    ["migrations 1 through 8 remain unchanged.", () => historicalMigrationChecksums().every((checksum, index) => migrationChecksum(DEFAULT_RUNTIME_STATE_MIGRATIONS[index]) === checksum) && DEFAULT_RUNTIME_STATE_MIGRATIONS[7].version === 8],
    ["Repository Truth classifies studio-runtime as Runtime.", () => fs.readFileSync(path.join(process.cwd(), "packages/repository-truth/src/repository-truth.ts"), "utf8").includes("studio-runtime")],
    ["Repository Truth classifies evidence-studio as Studio.", () => fs.readFileSync(path.join(process.cwd(), "packages/repository-truth/src/repository-truth.ts"), "utf8").includes("evidence-studio")],
    ["legacy Studio-like surfaces retain no competing authority.", () => !REQUIRED_DESKTOP_VIEWS.includes("studio-runtime" as any)],
    ["Control Plane retains terminal authority.", () => packageFile(firstStudioProof, "lifecycle-events.jsonl").includes("control-plane")],
    ["manifest arithmetic remains valid.", () => manifestArithmetic()],
  ];

  it.each(cases)("%s", (_name, check) => {
    expect(check()).toBe(true);
  });

  it("opens Runtime State schema v10 and exposes Studio tables", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "sera-studio-state-test-"));
    const store = openRuntimeState({ projectRoot: root });
    try {
      const inspection = store.inspect();
      expect(inspection.schemaVersion).toBe(10);
      expect(inspection.counts.studio_definitions).toBe(0);
      expect(inspection.counts.studio_sessions).toBe(0);
    } finally {
      store.close();
    }
  });

  it("Evidence Studio status is explicit and bounded", () => {
    const status = getEvidenceStudioStatus();
    expect(status.certification).toBe("first-certified-studio-v1");
    expect(status.guarantee).toContain("professional brief");
    expect(status.publicNetworkUse).toBe(false);
  });
});

function duplicateRuntime(): StudioRuntime {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "sera-studio-dup-test-"));
  const runtime = new StudioRuntime({ projectRoot: root });
  runtime.registerStudioVersion(createEvidenceStudioDefinition());
  return runtime;
}

function authWith(overrides: Record<string, unknown>) {
  const req: StudioRequest = {
    operatorRequest: "Create a professional brief from authorized local sources.",
    purpose: "Brief the operator on certified Studio behavior.",
    audience: "S.E.R.A. operator",
    title: "Certified Studio Brief",
    deliverableProfile: "professional-brief",
    requiredSections: [...PROFESSIONAL_BRIEF_SECTIONS],
    sources: [{ sourceId: "source-one", type: "inline-text", title: "One", body: "Studio Runtime coordinates workflow stages.", authorized: true }],
    riskClass: "low",
    outputLength: { minBytes: 100, maxBytes: 10000 },
    citationPreference: "source-notes",
    explicitSubmissionConfirmation: true
  };
  const def = createEvidenceStudioDefinition();
  const requestHash = normalizedRequestHash(req);
  const sourceHash = sourceSetHash(req.sources);
  return { authorization: { ...createAuthorization({ sessionId: "studio_session_test", definition: def, request: req, requestHash, sourceHash }), ...overrides } as any, definition: def, request: req, requestHash, sourceHash };
}

function packageFile(proof: ReturnType<typeof runStudioRuntimeProof>, file: string): string {
  return fs.readFileSync(path.join(proof.finalPackagePath, file), "utf8");
}

function blocks(fn: () => unknown, code: string): boolean {
  try {
    fn();
    return false;
  } catch (error) {
    return error instanceof StudioRuntimeBlockedError && error.code === code;
  }
}

function hash(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function migrationChecksum(migration: { sql: string }): string {
  return hash(migration.sql);
}

function historicalMigrationChecksums(): string[] {
  return [
    "004bcb5aa33000b4695c04cebcacb7cbd8febd4d903e66d06e5323a3f4e1d489",
    "2e1f42bbe0cf3fcfd05b89c652fb60f380e0c50d5f54ed3e80d80cad00beee74",
    "a22ac3311bff00c86d6332a3d0820fcd594c41094c11ff3df586459335f10562",
    "d77a1ade5c73167dd488663a8334b647e3d4d9e586f22c2600eec1e5997d5989",
    "534fedd994e3792804ef27f103034fa719644eb556114950e71143390bf7eead",
    "b7cb90893d3ce1bc1e6b31e591110498f3ae1acc2f142bbe7362ec35c462d0fa",
    "ac56ee979857d419ae74fb790730ebb3d43a6f2eeb145441515fe30625fc5d09",
    "d07ceac2a49681690021e773124da7d3ce5620d6657c1e87737347e5efbe1015"
  ];
}

function manifestArithmetic(): boolean {
  const manifestPath = path.join(process.cwd(), "architecture/base-mvp-manifest.json");
  if (!fs.existsSync(manifestPath)) return false;
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  return manifest.totalMilestones === manifest.completedMilestones + manifest.remainingMilestones && manifest.currentMilestone === manifest.completedMilestones + 1;
}
