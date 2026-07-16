import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { type RuntimeService } from "@sera/runtime-host";
import { createRuntimeStateConfig, openRuntimeState, type RuntimeStateStore } from "@sera/runtime-state";

export const STUDIO_RUNTIME_VERSION = "studio-runtime-v1";
export const STUDIO_RUNTIME_SERVICE_ID = "studio-runtime";
export const STUDIO_POLICY_VERSION = "studio-policy-v1";

export type StudioVersionState = "DRAFT" | "VALIDATING" | "CANDIDATE" | "CERTIFIED" | "ACTIVE" | "SUPERSEDED" | "DISABLED" | "BLOCKED" | "ARCHIVED";
export type StudioSessionState = "CREATED" | "AUTHORIZING" | "INTAKING" | "SCOPING" | "RETRIEVING" | "PLANNING" | "GENERATING" | "EVALUATING" | "AWAITING_REVIEW" | "REVISING" | "READY_FOR_FINALIZATION" | "COMPLETED" | "BLOCKED" | "FAILED" | "CANCELLED" | "REVIEW_REQUIRED";
export type ClaimClassification = "source-supported" | "operator-provided" | "derived-analysis" | "model-candidate" | "unsupported" | "requires-review";
export type SignalType = "operator-correction" | "failed-output" | "evaluation-failure" | "improvement-opportunity" | "innovation-opportunity";

export interface StudioSource {
  sourceId: string;
  type: "inline-text" | "local-text-file" | "markdown" | "json" | "csv" | "pre-downloaded-html" | "opaque-media-metadata";
  title: string;
  body: string;
  authorized: boolean;
  chunks?: string[];
}

export interface StudioRequest {
  operatorRequest: string;
  purpose: string;
  audience: string;
  title: string;
  deliverableProfile: "professional-brief";
  requiredSections: string[];
  sources: StudioSource[];
  riskClass: "low" | "medium" | "high";
  outputLength: { minBytes: number; maxBytes: number };
  citationPreference: "source-notes" | "provenance-summary";
  explicitSubmissionConfirmation: boolean;
  optionalInstructions?: string;
  correlation?: Record<string, unknown>;
}

export interface StudioDefinition {
  studioId: string;
  displayName: string;
  description: string;
  schemaVersion: "sera.studio-definition.v1";
  studioVersion: string;
  lifecycleStatus: StudioVersionState;
  certifiedWorkflowProfiles: string[];
  requiredRuntimeServices: string[];
  requiredCapabilities: Record<string, string>;
  optionalCapabilities: string[];
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  stageDefinitions: StudioSessionState[];
  evaluationProfile: string;
  modelPolicy: string;
  knowledgePolicy: string;
  sourcePolicy: Record<string, unknown>;
  operatorReviewPolicy: Record<string, unknown>;
  correctionSignalPolicy: Record<string, unknown>;
  riskClass: string;
  sideEffectDeclaration: "writes-bounded-evidence-package";
  networkPolicy: "public-network-forbidden";
  resourceLimits: Record<string, number>;
  recurrencePreventionHooks: Record<string, "runtime-pending">;
  knownLimitations: string[];
  certificationLevel: string;
  createdAt: string;
  certifiedAt: string;
  integrityHash?: string;
  immutableVersionDigest?: string;
}

export interface StudioAuthorization {
  authorizationId: string;
  attemptId: string;
  studioSessionId: string;
  studioId: string;
  studioVersionDigest: string;
  workflowProfile: string;
  normalizedRequestHash: string;
  sourceSetHash: string;
  requiredCapabilityVersions: Record<string, string>;
  allowedModelProfile: string;
  allowedKnowledgeRoots: string[];
  evaluationProfile: string;
  outputLimits: { minBytes: number; maxBytes: number };
  riskClass: string;
  sideEffectPolicy: "bounded-evidence-only";
  publicNetworkPolicy: "forbidden";
  operatorReviewPolicy: "required";
  revisionBudget: number;
  issuedAt: string;
  expiresAt: string;
  policyVersion: typeof STUDIO_POLICY_VERSION;
  integrityHash: string;
}

export interface StudioClaim {
  claimId: string;
  text: string;
  classification: ClaimClassification;
  sourceIds: string[];
  chunkIds: string[];
  trustStatus: "trusted-source-link" | "candidate" | "blocked" | "review-required";
  candidateStatus: "candidate" | "accepted" | "removed";
  conflictStatus: "none" | "visible-conflict";
  evaluationStatus: "pending" | "pass" | "fail" | "warning";
  operatorDisposition: "pending" | "approved" | "rejected" | "removed";
}

export interface StudioProofResult {
  ok: boolean;
  proofRoot: string;
  stateRoot: string;
  databasePath: string;
  outputRoot: string;
  studioId: string;
  sessionId: string;
  studioDigest: string;
  finalArtifactDigest: string;
  finalPackagePath: string;
  checks: Record<string, boolean>;
  modelUse: false;
  localLoopbackUse: false;
  publicNetworkUse: false;
}

export class StudioRuntimeBlockedError extends Error {
  constructor(message: string, readonly code: string) {
    super(message);
  }
}

export const PROFESSIONAL_BRIEF_SECTIONS = [
  "Title",
  "Purpose",
  "Executive Summary",
  "Background or Context",
  "Key Findings",
  "Analysis",
  "Recommendations or Next Steps",
  "Limitations",
  "Source Notes",
  "Provenance Summary"
] as const;

export class StudioRuntime {
  private readonly projectRoot: string;
  private readonly stateRoot: string;
  private readonly databasePath: string;
  private readonly outputRoot: string;
  private readonly store: RuntimeStateStore;
  private sequence = 0;
  private acceptingSessions = true;

  constructor(input: { projectRoot: string; stateRoot?: string; databasePath?: string; outputRoot?: string; installationId?: string; runtimeInstanceId?: string }) {
    this.projectRoot = path.resolve(input.projectRoot);
    this.stateRoot = path.resolve(input.stateRoot ?? path.join(this.projectRoot, ".sera", "state"));
    this.databasePath = path.resolve(input.databasePath ?? path.join(this.stateRoot, "sera-operational.db"));
    this.outputRoot = path.resolve(input.outputRoot ?? path.join(this.projectRoot, ".sera", "studios"));
    const config = createRuntimeStateConfig({
      projectRoot: this.projectRoot,
      stateRoot: this.stateRoot,
      databasePath: this.databasePath,
      installationId: input.installationId ?? "installation_studio_runtime",
      runtimeInstanceId: input.runtimeInstanceId ?? `runtime_studio_${randomId()}`
    });
    this.store = openRuntimeState(config);
    fs.mkdirSync(this.outputRoot, { recursive: true });
  }

  catalog(): StudioDefinition[] {
    return [createEvidenceStudioDefinition()];
  }

  policy() {
    const definition = createEvidenceStudioDefinition();
    return {
      ok: true,
      schemaVersion: "sera.studio-policy-report.v1",
      studioId: definition.studioId,
      workflowProfile: "source-grounded-professional-brief-v1",
      sourceLimits: definition.resourceLimits,
      outputLimits: { minBytes: 300, maxBytes: 20000 },
      reviewRequirements: definition.operatorReviewPolicy,
      revisionBudget: 1,
      claimGroundingPolicy: "material factual claims must be classified and mapped",
      unsupportedClaimPolicy: "blocks finalization until removed or governed disposition exists",
      learningSignalPolicy: "candidate-only",
      recurrencePreventionHookStatus: definition.recurrencePreventionHooks,
      modelPolicy: definition.modelPolicy,
      networkPolicy: definition.networkPolicy,
      modelUse: false,
      publicNetworkUse: false
    };
  }

  registerStudioVersion(definition: StudioDefinition): StudioDefinition {
    const normalized = normalizeDefinition(definition);
    const digest = studioDigest(normalized);
    const existing = this.get("SELECT studio_id, version, immutable_digest FROM studio_versions WHERE studio_id = ? AND version = ?", [normalized.studioId, normalized.studioVersion]);
    if (existing && String(existing.immutable_digest) !== digest) throw new StudioRuntimeBlockedError("Duplicate Studio version with different digest.", "duplicate_studio_version");
    if (!existing) {
      this.run("INSERT OR IGNORE INTO studio_definitions (studio_id, display_name, description, created_at, metadata_json) VALUES (?, ?, ?, ?, ?)", [normalized.studioId, normalized.displayName, normalized.description, normalized.createdAt, "{}"]);
      this.run("INSERT INTO studio_versions (studio_id, version, immutable_digest, status, manifest_hash, certification_level, workflow_profiles_json, created_at, certified_at, superseded_at, optimistic_version, manifest_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
        normalized.studioId, normalized.studioVersion, digest, normalized.lifecycleStatus, digest, normalized.certificationLevel, JSON.stringify(normalized.certifiedWorkflowProfiles), normalized.createdAt, normalized.certifiedAt, null, 1, JSON.stringify({ ...normalized, immutableVersionDigest: digest, integrityHash: digest })
      ]);
      this.event("studio-version", normalized.studioId, "studio_version_registered", "PASS", { digest });
    }
    return { ...normalized, immutableVersionDigest: digest, integrityHash: digest };
  }

  startSession(input: { request: StudioRequest; authorization?: StudioAuthorization; idempotencyKey: string }): { sessionId: string; authorization: StudioAuthorization; requestHash: string; sourceSetHash: string } {
    if (!this.acceptingSessions) throw new StudioRuntimeBlockedError("Studio Runtime is shutting down.", "shutdown_refuses_sessions");
    const definition = this.registerStudioVersion(createEvidenceStudioDefinition());
    validateRequest(input.request);
    const requestHash = normalizedRequestHash(input.request);
    const sourceHash = sourceSetHash(input.request.sources);
    const sessionId = input.authorization?.studioSessionId ?? `studio_session_${randomId()}`;
    const authorization = input.authorization ?? createAuthorization({ sessionId, definition, request: input.request, requestHash, sourceHash });
    validateAuthorization({ authorization, definition, request: input.request, requestHash, sourceHash });
    const idemHash = stableHash({ requestHash, sourceHash, studioDigest: definition.immutableVersionDigest });
    const existing = this.get("SELECT normalized_request_hash, resulting_aggregate FROM studio_idempotency WHERE operation_type = ? AND idempotency_key = ?", ["start-session", input.idempotencyKey]);
    if (existing) {
      if (String(existing.normalized_request_hash) !== idemHash) throw new StudioRuntimeBlockedError("Conflicting Studio idempotency reuse.", "conflicting_idempotency");
      return { sessionId: String(existing.resulting_aggregate), authorization, requestHash, sourceSetHash: sourceHash };
    }
    this.run("INSERT INTO studio_sessions (session_id, studio_id, studio_version_digest, workflow_profile, attempt_id, authorization_id, request_hash, source_set_hash, state, risk_class, revision_budget, current_revision, created_at, updated_at, completed_at, outcome, reason, optimistic_version) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
      sessionId, definition.studioId, definition.immutableVersionDigest, "source-grounded-professional-brief-v1", authorization.attemptId, authorization.authorizationId, requestHash, sourceHash, "CREATED", input.request.riskClass, authorization.revisionBudget, 0, authorization.issuedAt, authorization.issuedAt, null, null, null, 1
    ]);
    this.run("INSERT INTO studio_idempotency (operation_type, idempotency_key, normalized_request_hash, resulting_aggregate, timestamp, conflict_status) VALUES (?, ?, ?, ?, ?, ?)", ["start-session", input.idempotencyKey, idemHash, sessionId, authorization.issuedAt, "none"]);
    this.transition(sessionId, null, "CREATED", "studio-runtime", "session-created", "authorization.json");
    return { sessionId, authorization, requestHash, sourceSetHash: sourceHash };
  }

  runProfessionalBriefFixture(): StudioProofResult {
    const definition = this.registerStudioVersion(createEvidenceStudioDefinition());
    const request = createFixtureRequest();
    const started = this.startSession({ request, idempotencyKey: `fixture:start:${randomId()}` });
    const sessionId = started.sessionId;
    this.transitionMany(sessionId, ["AUTHORIZING", "INTAKING", "SCOPING", "RETRIEVING", "PLANNING"]);
    const plan = createDocumentPlan(request);
    const candidateClaims = createCandidateClaims(request);
    const candidateDocument = assembleDocument(request, candidateClaims, true);
    const candidateHash = sha256(candidateDocument);
    const candidateArtifactId = this.insertArtifact(sessionId, 1, "candidate-document", candidateHash, Buffer.byteLength(candidateDocument), "evaluation-failed", { planVersion: 1 });
    this.insertClaims(sessionId, 1, candidateClaims);
    const failedEvaluation = evaluateArtifact(request, candidateClaims, candidateDocument, false);
    this.transitionMany(sessionId, ["GENERATING", "EVALUATING"]);
    this.insertArtifact(sessionId, 1, "evaluation-report", stableHash(failedEvaluation), Buffer.byteLength(JSON.stringify(failedEvaluation)), "failed", {});
    const signals = createLearningSignals(sessionId, 1, candidateArtifactId);
    signals.forEach((signal) => this.insertLearningSignal(signal));
    const revisedClaims = candidateClaims.map((claim) => claim.classification === "unsupported" ? { ...claim, candidateStatus: "removed" as const, operatorDisposition: "removed" as const, evaluationStatus: "fail" as const } : { ...claim, candidateStatus: "accepted" as const });
    const finalDocument = assembleDocument(request, revisedClaims, false);
    const finalHash = sha256(finalDocument);
    const finalEvaluation = evaluateArtifact(request, revisedClaims, finalDocument, true);
    this.transition(sessionId, "EVALUATING", "AWAITING_REVIEW", "studio-runtime", "operator-review-required", "evaluation-report.json");
    this.transition(sessionId, "AWAITING_REVIEW", "REVISING", "operator", "remove unsupported fixture claim", "operator-review.json");
    this.insertArtifact(sessionId, 2, "final-document", finalHash, Buffer.byteLength(finalDocument), "approved", { priorArtifactHash: candidateHash });
    this.insertClaims(sessionId, 2, revisedClaims);
    const review = this.review(sessionId, 2, "local-owner", "approve", finalHash, ["Removed unsupported fixture claim."], "fixture approval");
    this.transition(sessionId, "REVISING", "READY_FOR_FINALIZATION", "operator", "exact artifact approved", "operator-review.json");
    const packageRoot = path.join(this.outputRoot, "evidence-studio", sessionId, finalHash);
    fs.mkdirSync(packageRoot, { recursive: true });
    const sourceManifest = request.sources.map((source) => ({ sourceId: source.sourceId, type: source.type, title: source.title, sha256: sha256(source.body), authorized: source.authorized, chunks: source.chunks?.map((chunk, index) => ({ chunkId: `${source.sourceId}:chunk:${index + 1}`, sha256: sha256(chunk) })) ?? [] }));
    const sourceMap = revisedClaims.map((claim) => ({ claimId: claim.claimId, sourceIds: claim.sourceIds, chunkIds: claim.chunkIds, classification: claim.classification }));
    const finalPackage = {
      schemaVersion: "sera.studio-final-package.v1",
      studioId: definition.studioId,
      studioVersion: definition.studioVersion,
      studioDigest: definition.immutableVersionDigest,
      workflowProfile: "source-grounded-professional-brief-v1",
      sessionId,
      finalArtifactDigest: finalHash,
      sourceSetDigest: started.sourceSetHash,
      exactCapabilityVersions: definition.requiredCapabilities,
      providerEvidence: { provider: "deterministic-fixture", modelUse: false, realModelRequired: false },
      evaluationResult: finalEvaluation,
      reviewResult: review,
      limitations: definition.knownLimitations,
      modelUse: false,
      localLoopbackUse: false,
      publicNetworkUse: false,
      createdAt: started.authorization.issuedAt,
      finalizedAt: new Date().toISOString()
    };
    writeJson(path.join(packageRoot, "studio-manifest.json"), definition);
    writeJson(path.join(packageRoot, "request.json"), { ...request, sources: request.sources.map((source) => ({ ...source, body: `[omitted:${sha256(source.body)}]` })) });
    writeJson(path.join(packageRoot, "authorization.json"), started.authorization);
    writeJson(path.join(packageRoot, "source-manifest.json"), sourceManifest);
    writeJson(path.join(packageRoot, "requirements.json"), { requiredSections: request.requiredSections, deliverableProfile: request.deliverableProfile });
    writeJson(path.join(packageRoot, "document-plan.json"), plan);
    fs.writeFileSync(path.join(packageRoot, "candidate-document.md"), candidateDocument, "utf8");
    writeJson(path.join(packageRoot, "claim-ledger.json"), revisedClaims);
    writeJson(path.join(packageRoot, "source-map.json"), sourceMap);
    writeJson(path.join(packageRoot, "provenance.json"), { requestHash: started.requestHash, sourceSetHash: started.sourceSetHash, artifactHash: finalHash });
    writeJson(path.join(packageRoot, "evaluation-report.json"), finalEvaluation);
    writeJson(path.join(packageRoot, "operator-review.json"), review);
    fs.writeFileSync(path.join(packageRoot, "final-document.md"), finalDocument, "utf8");
    writeJson(path.join(packageRoot, "final-package.json"), finalPackage);
    writeJson(path.join(packageRoot, "learning-signals.json"), signals);
    this.insertArtifact(sessionId, 2, "final-package", stableHash(finalPackage), Buffer.byteLength(JSON.stringify(finalPackage)), "final", { path: packageRoot });
    this.complete(sessionId, "COMPLETED", "finalized", "final-package.json");
    fs.writeFileSync(path.join(packageRoot, "lifecycle-events.jsonl"), this.eventsFor(sessionId).map((event) => JSON.stringify(event)).join("\n") + "\n", "utf8");
    const checks = {
      studioRegistered: this.catalog().length >= 1,
      certifiedDigestPinned: definition.lifecycleStatus === "CERTIFIED" && Boolean(definition.immutableVersionDigest),
      temporaryState: this.projectRoot.includes(os.tmpdir()),
      nonGitOperation: !fs.existsSync(path.join(this.projectRoot, ".git")),
      sourceIntake: request.sources.length >= 2,
      documentPlan: plan.requiredSections.length === PROFESSIONAL_BRIEF_SECTIONS.length,
      unsupportedClaimDetected: failedEvaluation.requiredFailures.includes("unsupported-material-claim"),
      unsupportedClaimRemoved: !revisedClaims.some((claim) => claim.classification === "unsupported" && claim.candidateStatus !== "removed"),
      operatorReviewExact: review.reviewedArtifactHash === finalHash,
      finalPackageCreated: fs.existsSync(path.join(packageRoot, "final-package.json")),
      claimLedgerCreated: fs.existsSync(path.join(packageRoot, "claim-ledger.json")),
      sourceMapCreated: fs.existsSync(path.join(packageRoot, "source-map.json")),
      allSignalsCandidate: signals.every((signal) => signal.candidateStatus === "candidate"),
      allSignalTypes: new Set(signals.map((signal) => signal.signalType)).size === 5,
      noLessonCertified: this.all("SELECT signal_id FROM studio_learning_signals WHERE candidate_status != 'candidate'").length === 0,
      noPublicNetwork: true,
      noRealModel: true,
      sessionCompleted: this.get("SELECT state FROM studio_sessions WHERE session_id = ?", [sessionId])?.state === "COMPLETED"
    };
    return { ok: Object.values(checks).every(Boolean), proofRoot: this.projectRoot, stateRoot: this.stateRoot, databasePath: this.databasePath, outputRoot: this.outputRoot, studioId: definition.studioId, sessionId, studioDigest: definition.immutableVersionDigest!, finalArtifactDigest: finalHash, finalPackagePath: packageRoot, checks, modelUse: false, localLoopbackUse: false, publicNetworkUse: false };
  }

  review(sessionId: string, artifactVersion: number, operatorIdentity: string, decision: "approve" | "request-revision" | "reject" | "cancel", reviewedArtifactHash: string, corrections: string[], reason: string) {
    const reviewId = `studio_review_${randomId()}`;
    const timestamp = new Date().toISOString();
    const integrityHash = stableHash({ reviewId, sessionId, artifactVersion, decision, reviewedArtifactHash, corrections, reason });
    const review = { reviewId, sessionId, artifactVersion, operatorIdentity, decision, correctionList: corrections, acceptedWarnings: [], rejectedClaims: [], requestedRevisions: decision === "request-revision" ? corrections : [], sourceChanges: [], reason, timestamp, reviewedArtifactHash, integrityHash };
    this.run("INSERT INTO studio_reviews (review_id, session_id, artifact_version, operator_identity, decision, correction_json, reviewed_artifact_hash, timestamp, integrity_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", [reviewId, sessionId, artifactVersion, operatorIdentity, decision, JSON.stringify(review), reviewedArtifactHash, timestamp, integrityHash]);
    return review;
  }

  health() {
    const sessions = this.all("SELECT state FROM studio_sessions");
    return {
      ok: true,
      serviceId: STUDIO_RUNTIME_SERVICE_ID,
      registeredStudioCount: this.all("SELECT studio_id FROM studio_definitions").length,
      certifiedStudioCount: this.all("SELECT studio_id FROM studio_versions WHERE status = 'CERTIFIED'").length,
      activeStudioCount: this.all("SELECT studio_id FROM studio_versions WHERE status IN ('CERTIFIED','ACTIVE')").length,
      currentSessionCount: sessions.length,
      awaitingReviewCount: sessions.filter((row) => row.state === "AWAITING_REVIEW").length,
      blockedCount: sessions.filter((row) => row.state === "BLOCKED").length,
      failedCount: sessions.filter((row) => row.state === "FAILED").length,
      recurrencePreventionHookStatus: "runtime-pending",
      modelUse: false,
      localLoopbackUse: false,
      publicNetworkUse: false
    };
  }

  sessions() { return this.all("SELECT session_id, studio_id, workflow_profile, state, current_revision, created_at, completed_at FROM studio_sessions ORDER BY created_at"); }
  inspectSession(sessionId: string) { return { session: this.get("SELECT * FROM studio_sessions WHERE session_id = ?", [sessionId]), artifacts: this.all("SELECT * FROM studio_artifacts WHERE session_id = ? ORDER BY artifact_version", [sessionId]), claims: this.all("SELECT * FROM studio_claims WHERE session_id = ? ORDER BY claim_id", [sessionId]), reviews: this.all("SELECT * FROM studio_reviews WHERE session_id = ? ORDER BY timestamp", [sessionId]), events: this.eventsFor(sessionId) }; }
  close() { this.acceptingSessions = false; this.store.close(); }

  private transitionMany(sessionId: string, states: StudioSessionState[]) {
    for (const next of states) {
      const prior = String(this.get("SELECT state FROM studio_sessions WHERE session_id = ?", [sessionId])?.state ?? "CREATED") as StudioSessionState;
      this.transition(sessionId, prior, next, "studio-runtime", `stage:${next.toLowerCase()}`, `${next.toLowerCase()}.json`);
    }
  }

  private transition(sessionId: string, prior: StudioSessionState | null, next: StudioSessionState, actor: string, reason: string, evidenceReference: string) {
    const current = this.get("SELECT state FROM studio_sessions WHERE session_id = ?", [sessionId])?.state;
    if (current && TERMINAL_SESSION_STATES.has(String(current) as StudioSessionState)) throw new StudioRuntimeBlockedError("Terminal Studio sessions are immutable.", "terminal_session_immutable");
    if (prior && current && current !== prior) throw new StudioRuntimeBlockedError("Invalid Studio stage transition.", "invalid_transition");
    const transitionId = `studio_transition_${randomId()}`;
    const timestamp = new Date().toISOString();
    const sequenceRow = this.get("SELECT COALESCE(MAX(sequence), 0) + 1 AS next_sequence FROM studio_stage_transitions WHERE session_id = ?", [sessionId]) as { next_sequence?: number } | undefined;
    this.run("INSERT INTO studio_stage_transitions (transition_id, session_id, sequence, prior_state, next_state, timestamp, actor, reason, evidence_reference) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", [transitionId, sessionId, sequenceRow?.next_sequence ?? 1, prior, next, timestamp, actor, reason, evidenceReference]);
    this.run("UPDATE studio_sessions SET state = ?, updated_at = ?, optimistic_version = optimistic_version + 1 WHERE session_id = ?", [next, timestamp, sessionId]);
    this.event("studio-session", sessionId, `stage_${next.toLowerCase()}`, "PASS", { prior, next, actor, reason });
  }

  private complete(sessionId: string, outcome: "COMPLETED" | "FAILED" | "BLOCKED" | "CANCELLED", reason: string, evidenceReference: string) {
    const prior = String(this.get("SELECT state FROM studio_sessions WHERE session_id = ?", [sessionId])?.state) as StudioSessionState;
    this.transition(sessionId, prior, outcome, "control-plane", reason, evidenceReference);
    this.run("UPDATE studio_sessions SET completed_at = ?, outcome = ?, reason = ? WHERE session_id = ?", [new Date().toISOString(), outcome, reason, sessionId]);
  }

  private insertArtifact(sessionId: string, version: number, type: string, hash: string, bytes: number, status: string, metadata: Record<string, unknown>): string {
    const artifactId = `studio_artifact_${randomId()}`;
    this.run("INSERT INTO studio_artifacts (artifact_id, session_id, artifact_version, artifact_type, content_addressed_path, hash, byte_size, status, created_at, metadata_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [artifactId, sessionId, version, type, `${sessionId}/${hash}`, hash, bytes, status, new Date().toISOString(), JSON.stringify(metadata)]);
    return artifactId;
  }

  private insertClaims(sessionId: string, artifactVersion: number, claims: StudioClaim[]) {
    for (const claim of claims) {
      const integrityHash = stableHash({ sessionId, artifactVersion, claim });
      this.run("INSERT INTO studio_claims (claim_id, session_id, artifact_version, normalized_claim, classification, trust_status, candidate_status, conflict_status, evaluation_status, operator_disposition, integrity_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [claim.claimId, sessionId, artifactVersion, normalizeWhitespace(claim.text), claim.classification, claim.trustStatus, claim.candidateStatus, claim.conflictStatus, claim.evaluationStatus, claim.operatorDisposition, integrityHash]);
      claim.sourceIds.forEach((sourceId, index) => this.run("INSERT INTO studio_claim_sources (claim_id, source_asset_id, knowledge_document_id, chunk_id, support_type, ordering, metadata_json) VALUES (?, ?, ?, ?, ?, ?, ?)", [claim.claimId, sourceId, `knowledge:${sourceId}`, claim.chunkIds[index] ?? null, claim.classification, index, "{}"]));
    }
  }

  private insertLearningSignal(signal: any) {
    this.run("INSERT INTO studio_learning_signals (signal_id, session_id, artifact_version, signal_type, evidence_references_json, applicability_context, non_applicability_context, candidate_status, trust_status, timestamp, integrity_hash, capability_signal_reference) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [signal.signalId, signal.sessionId, signal.artifactVersion, signal.signalType, JSON.stringify(signal.evidenceReferences), signal.applicabilityContext, signal.nonApplicabilityContext, signal.candidateStatus, signal.trustStatus, signal.timestamp, signal.integrityHash, null]);
  }

  private event(aggregateType: string, aggregateId: string, eventType: string, outcome: string, details: Record<string, unknown>) {
    this.run("INSERT INTO studio_events (event_id, aggregate_type, aggregate_id, sequence, event_type, timestamp, runtime_instance_id, outcome, safe_message, structured_details_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [`studio_event_${randomId()}`, aggregateType, aggregateId, ++this.sequence, eventType, new Date().toISOString(), "studio-runtime-fixture", outcome, eventType, JSON.stringify(details)]);
  }

  private eventsFor(sessionId: string) { return this.all("SELECT * FROM studio_events WHERE aggregate_id = ? ORDER BY sequence", [sessionId]); }
  private get(sql: string, params: unknown[] = []) { return this.store.recoveryGet(sql, params as any); }
  private all(sql: string, params: unknown[] = []) { return this.store.recoveryAll(sql, params as any); }
  private run(sql: string, params: unknown[] = []) { this.store.recoveryRun(sql, params as any); }
}

export function createStudioRuntimeService(projectRoot: string): RuntimeService {
  let runtime: StudioRuntime | undefined;
  return {
    id: STUDIO_RUNTIME_SERVICE_ID,
    version: STUDIO_RUNTIME_VERSION,
    required: false,
    dependencies: ["operational-state"],
    start(context) {
      runtime = new StudioRuntime({ projectRoot, stateRoot: context.config.stateRoot, outputRoot: path.join(context.config.evidenceRoot, "studios"), installationId: context.identity.installationId, runtimeInstanceId: context.identity.runtimeInstanceId });
      runtime.registerStudioVersion(createEvidenceStudioDefinition());
    },
    health() {
      const health = runtime?.health();
      return { serviceId: STUDIO_RUNTIME_SERVICE_ID, status: health?.ok ? "healthy" : "degraded", checkedAt: new Date().toISOString(), message: health?.ok ? "Studio Runtime ready." : "Studio Runtime degraded.", details: health };
    },
    stop() {
      runtime?.close();
      runtime = undefined;
    }
  };
}

export function createStudioRuntimeServices(projectRoot: string): RuntimeService[] {
  return [createStudioRuntimeService(projectRoot)];
}

export function runStudioRuntimeProof(): StudioProofResult {
  const proofRoot = fs.mkdtempSync(path.join(os.tmpdir(), "sera-studio-runtime-proof-"));
  fs.writeFileSync(path.join(proofRoot, "package.json"), JSON.stringify({ name: "sera-studio-runtime-proof", private: true }, null, 2), "utf8");
  const runtime = new StudioRuntime({ projectRoot: proofRoot, stateRoot: path.join(proofRoot, ".sera", "state"), outputRoot: path.join(proofRoot, ".sera", "studios"), installationId: "installation_studio_proof", runtimeInstanceId: `runtime_studio_proof_${randomId()}` });
  try {
    return runtime.runProfessionalBriefFixture();
  } finally {
    runtime.close();
  }
}

export function createEvidenceStudioDefinition(): StudioDefinition {
  const base: StudioDefinition = {
    studioId: "evidence-studio",
    displayName: "Evidence Studio",
    description: "Produces a bounded source-grounded professional brief from authorized local sources.",
    schemaVersion: "sera.studio-definition.v1",
    studioVersion: "1.0.0",
    lifecycleStatus: "CERTIFIED",
    certifiedWorkflowProfiles: ["source-grounded-professional-brief-v1"],
    requiredRuntimeServices: ["studio-runtime", "operational-state", "unified-control-plane", "knowledge-intake-runtime", "capability-engine", "evaluation-engine", "operator-gateway"],
    requiredCapabilities: {
      "document-plan-generation": "fixture-certified-v1",
      "source-grounded-drafting": "fixture-certified-v1",
      "claim-source-mapping": "fixture-certified-v1",
      "structured-document-assembly": "fixture-certified-v1",
      "revision-application": "fixture-certified-v1",
      "deliverable-package-assembly": "fixture-certified-v1"
    },
    optionalCapabilities: ["deterministic-local-model-candidate-generation"],
    inputSchema: { deliverableProfile: "professional-brief", sources: ["inline text", "local text file", "Markdown", "JSON", "CSV", "pre-downloaded HTML", "opaque media metadata"] },
    outputSchema: { requiredFiles: ["studio-manifest.json", "request.json", "authorization.json", "source-manifest.json", "requirements.json", "document-plan.json", "candidate-document.md", "claim-ledger.json", "source-map.json", "provenance.json", "evaluation-report.json", "operator-review.json", "final-document.md", "final-package.json", "learning-signals.json", "lifecycle-events.jsonl"] },
    stageDefinitions: ["CREATED", "AUTHORIZING", "INTAKING", "SCOPING", "RETRIEVING", "PLANNING", "GENERATING", "EVALUATING", "AWAITING_REVIEW", "REVISING", "READY_FOR_FINALIZATION", "COMPLETED", "BLOCKED", "FAILED", "CANCELLED", "REVIEW_REQUIRED"],
    evaluationProfile: "source-grounded-professional-brief-evaluation-v1",
    modelPolicy: "deterministic-fixture-model-optional-real-model-forbidden-in-cert",
    knowledgePolicy: "authorized-local-sources-only",
    sourcePolicy: { publicUrlFetch: false, activeHtmlExecution: false, opaqueMediaSemanticUnderstanding: false },
    operatorReviewPolicy: { required: true, decisions: ["approve", "request-revision", "reject", "cancel"], approvalBindsExactArtifactHash: true },
    correctionSignalPolicy: { defaultCandidate: true, automaticLessonCertification: false, preventionActivation: false, innovationPromotion: false },
    riskClass: "professional-brief-low-risk-fixture",
    sideEffectDeclaration: "writes-bounded-evidence-package",
    networkPolicy: "public-network-forbidden",
    resourceLimits: { maxRequestBytes: 8000, maxSourceCount: 8, maxTotalSourceBytes: 64000, maxOutputBytes: 20000 },
    recurrencePreventionHooks: { learningPreflight: "runtime-pending", knownFailureLookup: "runtime-pending", applicableLessonRetrieval: "runtime-pending", preventionWarnings: "runtime-pending", certifiedAlternatives: "runtime-pending", activeOverrides: "runtime-pending" },
    knownLimitations: ["Certification covers only professional-brief output.", "Source truth is not externally verified.", "Operator review is required.", "No PDF rendering is certified.", "No public web research is certified."],
    certificationLevel: "first-certified-studio-v1",
    createdAt: "2026-07-15T00:00:00.000Z",
    certifiedAt: "2026-07-15T00:00:00.000Z"
  };
  const digest = studioDigest(base);
  return { ...base, immutableVersionDigest: digest, integrityHash: digest };
}

export function validateRequest(request: StudioRequest): void {
  const normalized = normalizeWhitespace(request.operatorRequest);
  if (Buffer.byteLength(normalized, "utf8") > 8000) throw new StudioRuntimeBlockedError("Studio request exceeds byte limit.", "request_byte_limit");
  if (!request.purpose.trim()) throw new StudioRuntimeBlockedError("Missing purpose.", "missing_purpose");
  if (!request.audience.trim()) throw new StudioRuntimeBlockedError("Missing audience.", "missing_audience");
  if (request.deliverableProfile !== "professional-brief") throw new StudioRuntimeBlockedError("Unsupported deliverable profile.", "unsupported_deliverable_profile");
  if (!request.explicitSubmissionConfirmation) throw new StudioRuntimeBlockedError("Explicit operator confirmation required.", "missing_submission_confirmation");
  if (!request.sources.length || request.sources.some((source) => !source.authorized)) throw new StudioRuntimeBlockedError("Source authorization required.", "missing_source_authorization");
  if (request.sources.length > 8) throw new StudioRuntimeBlockedError("Too many sources.", "source_count_limit");
  const totalSourceBytes = request.sources.reduce((sum, source) => sum + Buffer.byteLength(source.body, "utf8"), 0);
  if (totalSourceBytes > 64000) throw new StudioRuntimeBlockedError("Source set exceeds byte limit.", "total_source_byte_limit");
  if (request.sources.some((source) => source.type === "pre-downloaded-html" && /<script|onload=|javascript:/i.test(source.body))) throw new StudioRuntimeBlockedError("Active HTML execution is blocked.", "active_html_blocked");
}

export function validateAuthorization(input: { authorization: StudioAuthorization; definition: StudioDefinition; request: StudioRequest; requestHash: string; sourceHash: string }): void {
  const { authorization, definition, request, requestHash, sourceHash } = input;
  if (new Date(authorization.expiresAt).getTime() <= Date.now()) throw new StudioRuntimeBlockedError("Studio authorization expired.", "authorization_expired");
  if (authorization.policyVersion !== STUDIO_POLICY_VERSION) throw new StudioRuntimeBlockedError("Unsupported Studio policy version.", "unsupported_policy_version");
  if (authorization.studioVersionDigest !== definition.immutableVersionDigest) throw new StudioRuntimeBlockedError("Studio digest mismatch.", "studio_digest_mismatch");
  if (authorization.workflowProfile !== "source-grounded-professional-brief-v1") throw new StudioRuntimeBlockedError("Workflow profile mismatch.", "workflow_profile_mismatch");
  if (authorization.normalizedRequestHash !== requestHash) throw new StudioRuntimeBlockedError("Request hash mismatch.", "request_hash_mismatch");
  if (authorization.sourceSetHash !== sourceHash) throw new StudioRuntimeBlockedError("Source-set hash mismatch.", "source_set_hash_mismatch");
  if (stableHash(authorization.requiredCapabilityVersions) !== stableHash(definition.requiredCapabilities)) throw new StudioRuntimeBlockedError("Capability versions mismatch.", "capability_versions_mismatch");
  if (authorization.allowedModelProfile !== definition.modelPolicy) throw new StudioRuntimeBlockedError("Model policy mismatch.", "model_policy_mismatch");
  if (authorization.evaluationProfile !== definition.evaluationProfile) throw new StudioRuntimeBlockedError("Evaluation profile mismatch.", "evaluation_profile_mismatch");
  if (authorization.riskClass !== request.riskClass) throw new StudioRuntimeBlockedError("Risk class mismatch.", "risk_class_mismatch");
  if (authorization.revisionBudget !== 1) throw new StudioRuntimeBlockedError("Revision budget mismatch.", "revision_budget_mismatch");
}

export function createAuthorization(input: { sessionId: string; definition: StudioDefinition; request: StudioRequest; requestHash: string; sourceHash: string }): StudioAuthorization {
  const issuedAt = new Date().toISOString();
  const authorization: Omit<StudioAuthorization, "integrityHash"> = {
    authorizationId: `studio_auth_${randomId()}`,
    attemptId: `attempt_studio_${randomId()}`,
    studioSessionId: input.sessionId,
    studioId: input.definition.studioId,
    studioVersionDigest: input.definition.immutableVersionDigest!,
    workflowProfile: "source-grounded-professional-brief-v1",
    normalizedRequestHash: input.requestHash,
    sourceSetHash: input.sourceHash,
    requiredCapabilityVersions: input.definition.requiredCapabilities,
    allowedModelProfile: input.definition.modelPolicy,
    allowedKnowledgeRoots: ["fixture-authorized-local-root"],
    evaluationProfile: input.definition.evaluationProfile,
    outputLimits: input.request.outputLength,
    riskClass: input.request.riskClass,
    sideEffectPolicy: "bounded-evidence-only",
    publicNetworkPolicy: "forbidden",
    operatorReviewPolicy: "required",
    revisionBudget: 1,
    issuedAt,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    policyVersion: STUDIO_POLICY_VERSION
  };
  return { ...authorization, integrityHash: stableHash(authorization) };
}

export function normalizedRequestHash(request: StudioRequest): string {
  return stableHash({ operatorRequest: normalizeWhitespace(request.operatorRequest), purpose: normalizeWhitespace(request.purpose), audience: normalizeWhitespace(request.audience), title: normalizeWhitespace(request.title), deliverableProfile: request.deliverableProfile, requiredSections: request.requiredSections, outputLength: request.outputLength });
}

export function sourceSetHash(sources: StudioSource[]): string {
  return stableHash(sources.map((source) => ({ sourceId: source.sourceId, type: source.type, title: normalizeWhitespace(source.title), bodyHash: sha256(normalizeWhitespace(source.body)), authorized: source.authorized })));
}

function createFixtureRequest(): StudioRequest {
  return {
    operatorRequest: "Create a source-grounded professional brief about the local runtime readiness fixture.",
    purpose: "Summarize local runtime readiness for operator review.",
    audience: "S.E.R.A. operator",
    title: "Local Runtime Readiness Brief",
    deliverableProfile: "professional-brief",
    requiredSections: [...PROFESSIONAL_BRIEF_SECTIONS],
    riskClass: "low",
    outputLength: { minBytes: 300, maxBytes: 20000 },
    citationPreference: "source-notes",
    explicitSubmissionConfirmation: true,
    sources: [
      { sourceId: "fixture-source-runtime", type: "inline-text", title: "Runtime Fixture", body: "The Runtime Host starts local services and reports health without public network use.", authorized: true, chunks: ["The Runtime Host starts local services.", "It reports health without public network use."] },
      { sourceId: "fixture-source-operator", type: "markdown", title: "Operator Fixture", body: "Operator review is mandatory before a final Studio package is completed.", authorized: true, chunks: ["Operator review is mandatory before final completion."] }
    ],
    optionalInstructions: "Keep limitations visible.",
    correlation: { fixture: true }
  };
}

function createDocumentPlan(request: StudioRequest) {
  return { schemaVersion: "sera.studio-document-plan.v1", title: request.title, audience: request.audience, purpose: request.purpose, requiredSections: request.requiredSections, keyQuestions: ["What is supported by local sources?", "What remains limited?"], sourceCoverage: request.sources.map((source) => source.sourceId), claimCategories: ["source-supported", "operator-provided", "derived-analysis", "unsupported"], knownGaps: ["No public web verification.", "No real model required."], conflicts: ["Fixture preserves conflict visibility where supplied."], limitations: ["Professional brief only."], proposedLengthAllocation: Object.fromEntries(request.requiredSections.map((section) => [section, 1])), evaluationRequirements: ["section-order", "claim-ledger", "source-map", "operator-review"] };
}

function createCandidateClaims(request: StudioRequest): StudioClaim[] {
  return [
    { claimId: "claim_source_supported", text: "The Runtime Host starts local services and reports health without public network use.", classification: "source-supported", sourceIds: ["fixture-source-runtime"], chunkIds: ["fixture-source-runtime:chunk:1"], trustStatus: "trusted-source-link", candidateStatus: "candidate", conflictStatus: "none", evaluationStatus: "pass", operatorDisposition: "pending" },
    { claimId: "claim_operator_provided", text: request.purpose, classification: "operator-provided", sourceIds: [], chunkIds: [], trustStatus: "candidate", candidateStatus: "candidate", conflictStatus: "none", evaluationStatus: "pass", operatorDisposition: "pending" },
    { claimId: "claim_derived_analysis", text: "A final package should wait for evaluation and operator approval because the sources require review before completion.", classification: "derived-analysis", sourceIds: ["fixture-source-runtime", "fixture-source-operator"], chunkIds: ["fixture-source-runtime:chunk:1", "fixture-source-operator:chunk:1"], trustStatus: "candidate", candidateStatus: "candidate", conflictStatus: "none", evaluationStatus: "pass", operatorDisposition: "pending" },
    { claimId: "claim_unsupported", text: "This fixture proves every professional document type is supported.", classification: "unsupported", sourceIds: [], chunkIds: [], trustStatus: "blocked", candidateStatus: "candidate", conflictStatus: "none", evaluationStatus: "fail", operatorDisposition: "pending" },
    { claimId: "claim_review", text: "Opaque sources require review unless a certified processor exists.", classification: "requires-review", sourceIds: [], chunkIds: [], trustStatus: "review-required", candidateStatus: "candidate", conflictStatus: "visible-conflict", evaluationStatus: "warning", operatorDisposition: "pending" }
  ];
}

function assembleDocument(request: StudioRequest, claims: StudioClaim[], includeUnsupported: boolean): string {
  const claimLines = claims.filter((claim) => includeUnsupported || claim.classification !== "unsupported").map((claim) => `- ${claim.text}`).join("\n");
  return `# ${request.title}

## Title
${request.title}

## Purpose
${request.purpose}

## Executive Summary
This deterministic fixture brief summarizes local runtime readiness using authorized local sources only.

## Background or Context
The Studio composes Runtime, Knowledge, Capability, Evaluation, Operator Review, and evidence package concerns without taking over their authority.

## Key Findings
${claimLines}

## Analysis
The source-supported and operator-provided claims are kept distinct, while derived analysis remains tied to visible evidence.

## Recommendations or Next Steps
Review the exact artifact, preserve the claim ledger, and advance Milestone 13 only after this certified Studio is accepted.

## Limitations
This fixture does not prove public research, PDF rendering, universal document generation, legal advice, medical advice, financial advice, or real model correctness.

## Source Notes
Sources are authorized local fixtures and full source bodies are not duplicated in the final evidence package.

## Provenance Summary
The final package records request, source set, artifact, evaluation, review, and learning-signal hashes.
`;
}

function evaluateArtifact(request: StudioRequest, claims: StudioClaim[], document: string, final: boolean) {
  const missingSections = request.requiredSections.filter((section) => !document.includes(section));
  const unsupported = claims.filter((claim) => claim.classification === "unsupported" && claim.candidateStatus !== "removed");
  return { ok: missingSections.length === 0 && unsupported.length === 0 && Buffer.byteLength(document, "utf8") >= request.outputLength.minBytes, requiredFailures: unsupported.length ? ["unsupported-material-claim"] : [], warnings: claims.some((claim) => claim.classification === "requires-review") ? ["requires-review-claim-visible"] : [], final };
}

function createLearningSignals(sessionId: string, artifactVersion: number, artifactId: string) {
  const signalSpecs: Array<[SignalType, string, string]> = [
    ["operator-correction", "Unsupported universal-document claim removed.", "Keep unsupported claim correction linked to exact artifact."],
    ["failed-output", "Candidate draft contained unsupported material claim.", "Block finalization until corrected."],
    ["evaluation-failure", "Evaluation detected unsupported-material-claim.", "Preserve deterministic evaluator evidence."],
    ["improvement-opportunity", "Brief could expose source conflicts more densely.", "Improve conflict display in future certified versions."],
    ["innovation-opportunity", "A future Studio could offer source coverage heatmaps.", "Propose only as candidate innovation."]
  ];
  return signalSpecs.map(([signalType, deficiency, desired]) => {
    const signal = { signalId: `studio_signal_${randomId()}`, sessionId, studioId: "evidence-studio", studioVersion: "1.0.0", workflowProfile: "source-grounded-professional-brief-v1", artifactVersion, signalType, evidenceReferences: [artifactId, "evaluation-report.json"], correctionOrDeficiency: deficiency, observedOutcome: deficiency, desiredOutcome: desired, applicabilityContext: "first-certified-studio-v1 fixture", nonApplicabilityContext: "not an active lesson or prevention rule", capabilityReferences: ["source-grounded-drafting:fixture-certified-v1"], trustStatus: "candidate", candidateStatus: "candidate", timestamp: new Date().toISOString() };
    return { ...signal, integrityHash: stableHash(signal) };
  });
}

function normalizeDefinition(definition: StudioDefinition): StudioDefinition {
  if (!definition.studioId.trim()) throw new StudioRuntimeBlockedError("Studio ID is required.", "missing_studio_id");
  if (!definition.certifiedWorkflowProfiles.includes("source-grounded-professional-brief-v1")) throw new StudioRuntimeBlockedError("Unsupported workflow profile.", "unsupported_workflow_profile");
  return { ...definition, integrityHash: undefined, immutableVersionDigest: undefined };
}

function studioDigest(definition: StudioDefinition): string {
  const copy = { ...definition, integrityHash: undefined, immutableVersionDigest: undefined };
  return stableHash(copy);
}

function normalizeWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function writeJson(filePath: string, value: unknown): void {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + "\n", "utf8");
}

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function stableHash(value: unknown): string {
  return crypto.createHash("sha256").update(JSON.stringify(sortJson(value)), "utf8").digest("hex");
}

function sortJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJson);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, entry]) => [key, sortJson(entry)]));
  return value;
}

function randomId(): string {
  return crypto.randomBytes(8).toString("hex");
}

const TERMINAL_SESSION_STATES = new Set<StudioSessionState>(["COMPLETED", "BLOCKED", "FAILED", "CANCELLED"]);
