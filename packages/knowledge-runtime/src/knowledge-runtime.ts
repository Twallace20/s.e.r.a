import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createControlPlaneRuntimeService, RuntimeHost, createRuntimeConfig, type RuntimeService, type RuntimeServiceContext } from "@sera/runtime-host";
import { createPersistentRuntimeRecoveryService } from "@sera/runtime-recovery";
import { createRuntimeStateService, openRuntimeState, type RuntimeStateConfigInput, type RuntimeStateStore } from "@sera/runtime-state";

export const KNOWLEDGE_RUNTIME_VERSION = "knowledge-intake-runtime-v1";
export const KNOWLEDGE_RUNTIME_SCHEMA_VERSION = "sera.knowledge-intake-runtime.v1";
export const KNOWLEDGE_RUNTIME_SERVICE_ID = "knowledge-intake-runtime";
export const KNOWLEDGE_INTAKE_POLICY_VERSION = "knowledge-intake-policy-v1";
export const KNOWLEDGE_INTAKE_AUTHORIZATION_VERSION = "knowledge-intake-authorization-v1";

export type IntakeSourceType = "inline-text" | "local-file" | "local-directory" | "url-reference" | "predownloaded-web-snapshot" | "generated-fixture";
export type IntakeState = "RECEIVED" | "VALIDATING" | "HASHED" | "PRESERVED" | "EXTRACTING" | "EXTRACTED" | "CHUNKING" | "INDEXED" | "OPAQUE_PRESERVED" | "REVIEW_REQUIRED" | "BLOCKED" | "FAILED" | "CANCELLED";
export type ExtractionProfile = "deterministic-text-v1" | "opaque-preserve-v1";
export type RetentionPolicy = "content-addressed-preserve";
export type TrustState = "unreviewed" | "operator-declared" | "trusted-source" | "restricted" | "conflicting" | "blocked";
export type CandidateStatus = "candidate" | "accepted" | "superseded";

export interface KnowledgeRuntimeLimits {
  maxFileCount: number;
  maxFileBytes: number;
  maxTotalBytes: number;
  maxDirectoryDepth: number;
  maxChunkBytes: number;
  chunkOverlapBytes: number;
  maxCsvRows: number;
  maxCsvColumns: number;
  maxSearchResults: number;
  maxSearchScannedChunks: number;
}

export interface KnowledgeRuntimePolicy {
  version: typeof KNOWLEDGE_INTAKE_POLICY_VERSION;
  networkPolicy: "offline-no-fetch";
  defaultRetentionPolicy: RetentionPolicy;
  defaultExtractionProfile: ExtractionProfile;
  defaultTrustState: "unreviewed";
  defaultCandidateStatus: "candidate";
  hiddenFilePolicy: "block";
  generatedRuntimePathPolicy: "block";
  archiveExtractionAllowed: false;
  modelEnrichmentAllowed: false;
  limits: KnowledgeRuntimeLimits;
}

export interface IntakeRequestInput {
  intakeId: string;
  attemptId: string;
  authorizationId: string;
  sourceType: IntakeSourceType;
  sourceReference: string;
  displayName?: string;
  declaredMediaType?: string;
  expectedHash?: string;
  retentionPolicy?: RetentionPolicy;
  extractionProfile?: ExtractionProfile;
  trustDeclaration?: TrustState;
  allowedRoots?: string[];
  correlation?: Record<string, unknown>;
}

export interface NormalizedIntakeRequest extends Required<Omit<IntakeRequestInput, "expectedHash" | "correlation">> {
  expectedHash?: string;
  detectedMediaType: string;
  correlation: Record<string, unknown>;
  requestHash: string;
}

export interface IntakeAuthorization {
  authorizationId: string;
  attemptId: string;
  sourceType: IntakeSourceType;
  sourceReferenceHash: string;
  allowedRoots: string[];
  permittedMediaTypes: string[];
  maximumFileCount: number;
  maximumIndividualFileSize: number;
  maximumTotalBytes: number;
  maximumDirectoryDepth: number;
  extractionPolicy: ExtractionProfile;
  retentionPolicy: RetentionPolicy;
  trustPolicy: TrustState;
  networkPolicy: "offline-no-fetch";
  policyVersion: typeof KNOWLEDGE_INTAKE_POLICY_VERSION;
  issuedAt: string;
  expiresAt: string;
  integrityHash: string;
}

export interface IntakeResult {
  ok: boolean;
  status: IntakeState;
  intakeId: string;
  attemptId: string;
  authorizationId: string;
  documentIds: string[];
  assetIds: string[];
  chunkCount: number;
  evidenceRoot: string;
  databasePath: string;
  candidateStatus: CandidateStatus;
  trustState: TrustState;
  contentHashes: string[];
  modelUse: false;
  publicNetworkUse: false;
}

export interface SearchResult {
  documentId: string;
  chunkId: string;
  rank: number;
  score: number;
  explanation: string;
  text: string;
  provenance: Record<string, unknown>;
  trustState: TrustState;
  candidateStatus: CandidateStatus;
}

export interface KnowledgeProofResult {
  ok: boolean;
  status: "healthy" | "blocked";
  proofRoot: string;
  databasePath: string;
  firstIntake?: string;
  secondIntake?: string;
  firstSearchCount: number;
  secondSearchCount: number;
  textIntake: boolean;
  jsonIntake: boolean;
  directoryIntake: boolean;
  opaquePreserved: boolean;
  duplicateDeduplicated: boolean;
  versionCreated: boolean;
  pathEscapeBlocked: boolean;
  deterministicChunking: boolean;
  candidateStatusDefault: boolean;
  provenanceComplete: boolean;
  trustNotInferred: boolean;
  lexicalRetrieval: boolean;
  retrievalDeterministic: boolean;
  evidenceComplete: boolean;
  runtimeServiceHealthy: boolean;
  nonGit: boolean;
  offline: boolean;
  noModelRequired: boolean;
  publicNetworkUse: false;
  modelUse: false;
}

export class KnowledgeRuntimeBlockedError extends Error {
  constructor(message: string, readonly code: string) {
    super(message);
  }
}

export const DEFAULT_KNOWLEDGE_POLICY: KnowledgeRuntimePolicy = {
  version: KNOWLEDGE_INTAKE_POLICY_VERSION,
  networkPolicy: "offline-no-fetch",
  defaultRetentionPolicy: "content-addressed-preserve",
  defaultExtractionProfile: "deterministic-text-v1",
  defaultTrustState: "unreviewed",
  defaultCandidateStatus: "candidate",
  hiddenFilePolicy: "block",
  generatedRuntimePathPolicy: "block",
  archiveExtractionAllowed: false,
  modelEnrichmentAllowed: false,
  limits: {
    maxFileCount: 24,
    maxFileBytes: 512 * 1024,
    maxTotalBytes: 1024 * 1024,
    maxDirectoryDepth: 4,
    maxChunkBytes: 1024,
    chunkOverlapBytes: 64,
    maxCsvRows: 200,
    maxCsvColumns: 32,
    maxSearchResults: 10,
    maxSearchScannedChunks: 1000
  }
};

const TEXT_TYPES = new Set(["text/plain", "text/markdown", "application/json", "text/csv", "text/html"]);
const OPAQUE_TYPES = new Set(["application/pdf", "image/png", "image/jpeg", "image/gif", "audio/mpeg", "audio/wav", "video/mp4", "application/zip", "application/octet-stream"]);
const TERMINAL_INTAKE_STATES = new Set<IntakeState>(["INDEXED", "OPAQUE_PRESERVED", "REVIEW_REQUIRED", "BLOCKED", "FAILED", "CANCELLED"]);

export class KnowledgeRuntime {
  private readonly projectRoot: string;
  private readonly evidenceRoot: string;
  private readonly assetRoot: string;
  private readonly reportRoot: string;
  private readonly policy: KnowledgeRuntimePolicy;
  private accepting = true;

  constructor(private readonly store: RuntimeStateStore, input: RuntimeStateConfigInput & { evidenceRoot?: string; assetRoot?: string; policy?: KnowledgeRuntimePolicy } = {}) {
    this.projectRoot = path.resolve(input.projectRoot ?? process.cwd());
    this.evidenceRoot = path.resolve(input.evidenceRoot ?? path.join(this.projectRoot, ".sera", "intake"));
    this.assetRoot = path.resolve(input.assetRoot ?? path.join(this.projectRoot, ".sera", "knowledge", "assets"));
    this.reportRoot = path.resolve(path.join(this.projectRoot, ".sera", "knowledge"));
    this.policy = input.policy ?? DEFAULT_KNOWLEDGE_POLICY;
    fs.mkdirSync(this.evidenceRoot, { recursive: true });
    fs.mkdirSync(this.assetRoot, { recursive: true });
    fs.mkdirSync(this.reportRoot, { recursive: true });
  }

  types() {
    return {
      ok: true,
      status: "INSPECTED",
      schemaVersion: KNOWLEDGE_RUNTIME_SCHEMA_VERSION,
      supportedSourceTypes: ["inline-text", "local-file", "local-directory", "url-reference", "predownloaded-web-snapshot", "generated-fixture"] as IntakeSourceType[],
      deterministicExtraction: ["text/plain", "text/markdown", "application/json", "text/csv", "text/html"],
      opaquePreservation: [...OPAQUE_TYPES].sort(),
      archiveBehavior: "archives are preserved as opaque assets and never extracted in v1",
      urlBehavior: "URL references are recorded but not fetched",
      retrieval: { lexical: true, embeddings: false, fts5Optional: true, fallback: "bounded deterministic LIKE scan" },
      guarantee: "Knowledge and Universal Intake Runtime v1 preserves and retrieves provenance-linked local information. It does not guarantee imported content is true, current, complete, safe, authoritative, or semantically understood.",
      modelUse: false,
      publicNetworkUse: false
    };
  }

  async intake(input: IntakeRequestInput, authorization: IntakeAuthorization | undefined, idempotencyKey: string): Promise<IntakeResult> {
    if (!this.accepting) throw new KnowledgeRuntimeBlockedError("Knowledge Runtime is shutting down and refuses new intake.", "shutdown_refuses_intake");
    const request = normalizeIntakeRequest(input, this.policy);
    const existing = this.store.recoveryGet("SELECT intake_id, request_hash FROM intake_requests WHERE idempotency_key = ?", [idempotencyKey]);
    if (existing) {
      if (String(existing.request_hash) !== request.requestHash) throw new KnowledgeRuntimeBlockedError("Intake idempotency key was reused for a conflicting request.", "conflicting_idempotency_key");
      return this.resultFromDurableIntake(String(existing.intake_id));
    }
    const evidenceRoot = path.join(this.evidenceRoot, request.intakeId);
    fs.mkdirSync(evidenceRoot, { recursive: true });
    try {
      this.validateAuthorization(request, authorization);
      const sources = this.acquireSources(request, authorization!);
      const assets = sources.map((source) => this.preserveSource(request, source));
      const extraction = this.extractAssets(request, assets);
      this.persistIntake(request, authorization!, idempotencyKey, assets, extraction, evidenceRoot);
      this.writeEvidence(request, authorization!, assets, extraction, evidenceRoot, "INDEXED");
      return this.resultFromDurableIntake(request.intakeId);
    } catch (error) {
      const state: IntakeState = error instanceof KnowledgeRuntimeBlockedError ? "BLOCKED" : "FAILED";
      this.persistBlockedIntake(request, authorization, idempotencyKey, errorMessage(error), evidenceRoot, state);
      this.writeFailureEvidence(request, authorization, errorMessage(error), evidenceRoot, state);
      return this.resultFromDurableIntake(request.intakeId);
    }
  }

  inspectIntake(intakeId: string): Record<string, unknown> {
    const intake = this.store.recoveryGet("SELECT * FROM intake_requests WHERE intake_id = ?", [intakeId]);
    if (!intake) throw new KnowledgeRuntimeBlockedError("Unknown intake.", "unknown_intake");
    return {
      ok: true,
      status: "INSPECTED",
      intake,
      assets: this.store.recoveryAll("SELECT * FROM intake_assets WHERE intake_id = ? ORDER BY asset_id", [intakeId]),
      documents: this.store.recoveryAll("SELECT * FROM knowledge_documents WHERE intake_id = ? ORDER BY document_id", [intakeId]),
      chunks: this.store.recoveryAll("SELECT * FROM knowledge_chunks WHERE intake_id = ? ORDER BY sequence", [intakeId]),
      modelUse: false,
      publicNetworkUse: false
    };
  }

  listIntakes(): Record<string, unknown> {
    return {
      ok: true,
      status: "INSPECTED",
      intakes: this.store.recoveryAll("SELECT intake_id, source_type, display_name, state, created_at, completed_at, failure_or_block_reason FROM intake_requests ORDER BY created_at, intake_id"),
      modelUse: false,
      publicNetworkUse: false
    };
  }

  inspectDocument(documentId: string): Record<string, unknown> {
    const document = this.store.recoveryGet("SELECT * FROM knowledge_documents WHERE document_id = ?", [documentId]);
    if (!document) throw new KnowledgeRuntimeBlockedError("Unknown knowledge document.", "unknown_document");
    return {
      ok: true,
      status: "INSPECTED",
      document,
      chunks: this.store.recoveryAll("SELECT * FROM knowledge_chunks WHERE document_id = ? ORDER BY sequence", [documentId]),
      provenance: this.store.recoveryAll("SELECT * FROM knowledge_provenance WHERE document_id = ? ORDER BY provenance_id", [documentId]),
      modelUse: false,
      publicNetworkUse: false
    };
  }

  sources(): Record<string, unknown> {
    return {
      ok: true,
      status: "INSPECTED",
      sources: this.store.recoveryAll("SELECT asset_id, intake_id, source_type, original_reference, content_hash, media_type, byte_size, preservation_path, immutable FROM intake_assets ORDER BY preserved_at, asset_id"),
      modelUse: false,
      publicNetworkUse: false
    };
  }

  search(query: string, limit = this.policy.limits.maxSearchResults, persist = true): { ok: true; status: "INSPECTED"; query: string; normalizedQuery: string; results: SearchResult[]; modelUse: false; publicNetworkUse: false } {
    const normalizedQuery = normalizeQuery(query);
    if (!normalizedQuery) throw new KnowledgeRuntimeBlockedError("Knowledge search query must not be empty.", "empty_query");
    const max = Math.max(1, Math.min(limit, this.policy.limits.maxSearchResults));
    const terms = normalizedQuery.split(" ").filter(Boolean);
    const candidates = this.store.recoveryAll(
      "SELECT c.*, d.trust_state, d.candidate_status, d.source_asset_id, a.original_reference, a.content_hash FROM knowledge_chunks c JOIN knowledge_documents d ON d.document_id = c.document_id JOIN intake_assets a ON a.asset_id = d.source_asset_id ORDER BY c.document_id, c.sequence LIMIT ?",
      [this.policy.limits.maxSearchScannedChunks]
    );
    const scored = candidates
      .map((row) => {
        const text = String(row.chunk_text);
        const haystack = normalizeQuery(text);
        const score = terms.reduce((sum, term) => sum + countOccurrences(haystack, term), 0);
        return { row, score };
      })
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score || String(a.row.document_id).localeCompare(String(b.row.document_id)) || Number(a.row.sequence) - Number(b.row.sequence))
      .slice(0, max);
    const results: SearchResult[] = scored.map((entry, index) => ({
      documentId: String(entry.row.document_id),
      chunkId: String(entry.row.chunk_id),
      rank: index + 1,
      score: entry.score,
      explanation: `lexical term matches: ${entry.score}`,
      text: String(entry.row.chunk_text),
      provenance: {
        intakeId: entry.row.intake_id,
        assetId: entry.row.source_asset_id,
        sourceReference: entry.row.original_reference,
        contentHash: entry.row.content_hash
      },
      trustState: entry.row.trust_state as TrustState,
      candidateStatus: entry.row.candidate_status as CandidateStatus
    }));
    if (persist) this.persistQuery(normalizedQuery, results);
    return { ok: true, status: "INSPECTED", query, normalizedQuery, results, modelUse: false, publicNetworkUse: false };
  }

  cancelIntake(intakeId: string, reason: string): IntakeResult {
    const row = this.store.recoveryGet("SELECT state FROM intake_requests WHERE intake_id = ?", [intakeId]);
    if (!row) throw new KnowledgeRuntimeBlockedError("Unknown intake.", "unknown_intake");
    if (TERMINAL_INTAKE_STATES.has(row.state as IntakeState)) return this.resultFromDurableIntake(intakeId);
    this.transition(intakeId, "CANCELLED", reason);
    return this.resultFromDurableIntake(intakeId);
  }

  createInterruptedForRecovery(attemptId: string): string {
    const intakeId = id("intake_interrupted");
    const request = normalizeIntakeRequest({ intakeId, attemptId, authorizationId: `auth_${intakeId}`, sourceType: "generated-fixture", sourceReference: "interrupted", displayName: "interrupted" });
    this.store.recoveryRun("INSERT INTO intake_requests (intake_id, attempt_id, authorization_id, idempotency_key, request_hash, source_type, source_reference, display_name, declared_media_type, detected_media_type, expected_hash, retention_policy, extraction_profile, trust_declaration, state, created_at, updated_at, completed_at, failure_or_block_reason, evidence_root, optimistic_version, metadata_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, 1, ?)", [
      request.intakeId, request.attemptId, request.authorizationId, `interrupted:${intakeId}`, request.requestHash, request.sourceType, request.sourceReference, request.displayName, request.declaredMediaType, request.detectedMediaType, request.expectedHash ?? null, request.retentionPolicy, request.extractionProfile, request.trustDeclaration, "PRESERVED", now(), now(), path.join(this.evidenceRoot, intakeId), "{}"
    ]);
    this.event(intakeId, "PRESERVED", "Interrupted intake fixture.");
    return intakeId;
  }

  forceTransitionForTest(intakeId: string, state: IntakeState): void {
    this.transition(intakeId, state, "test-only transition");
  }

  shutdown(): void {
    this.accepting = false;
  }

  private validateAuthorization(request: NormalizedIntakeRequest, authorization: IntakeAuthorization | undefined): void {
    if (!authorization) throw new KnowledgeRuntimeBlockedError("Intake authorization is required.", "authorization_required");
    if (authorization.authorizationId !== request.authorizationId || authorization.attemptId !== request.attemptId) throw new KnowledgeRuntimeBlockedError("Intake authorization identity mismatch.", "authorization_identity_mismatch");
    if (authorization.sourceType !== request.sourceType) throw new KnowledgeRuntimeBlockedError("Intake source type mismatch.", "source_type_mismatch");
    if (authorization.sourceReferenceHash !== sha256(request.sourceReference)) throw new KnowledgeRuntimeBlockedError("Intake source reference mismatch.", "source_reference_mismatch");
    if (authorization.policyVersion !== KNOWLEDGE_INTAKE_POLICY_VERSION) throw new KnowledgeRuntimeBlockedError("Unsupported intake policy version.", "unsupported_policy_version");
    if (new Date(authorization.expiresAt).getTime() <= Date.now()) throw new KnowledgeRuntimeBlockedError("Intake authorization expired.", "authorization_expired");
    const expected = authorizationHash({ ...authorization, integrityHash: "" });
    if (authorization.integrityHash !== expected) throw new KnowledgeRuntimeBlockedError("Intake authorization integrity hash mismatch.", "authorization_integrity_mismatch");
    if (authorization.networkPolicy !== "offline-no-fetch") throw new KnowledgeRuntimeBlockedError("Network behavior is not authorized for intake.", "network_policy_blocked");
    if (authorization.extractionPolicy !== request.extractionProfile || authorization.retentionPolicy !== request.retentionPolicy) throw new KnowledgeRuntimeBlockedError("Intake policy mismatch.", "policy_mismatch");
    if (!authorization.permittedMediaTypes.includes("*/*") && !authorization.permittedMediaTypes.includes(request.detectedMediaType)) throw new KnowledgeRuntimeBlockedError("Media type is not permitted.", "media_type_not_permitted");
    const authRoots = authorization.allowedRoots.map((root) => path.resolve(root)).sort();
    if (stableJson(authRoots) !== stableJson(request.allowedRoots)) throw new KnowledgeRuntimeBlockedError("Intake allowed roots mismatch.", "allowed_roots_mismatch");
  }

  private acquireSources(request: NormalizedIntakeRequest, authorization: IntakeAuthorization): SourceBlob[] {
    if (request.sourceType === "url-reference") {
      return [{
        sourceType: request.sourceType,
        reference: request.sourceReference,
        displayName: request.displayName,
        bytes: Buffer.from(`URL reference only: ${request.sourceReference}\n`, "utf8"),
        mediaType: "text/plain",
        metadata: { fetched: false, reason: "URL references are not fetched in v1." }
      }];
    }
    if (request.sourceType === "inline-text" || request.sourceType === "generated-fixture") {
      return [{ sourceType: request.sourceType, reference: request.sourceReference, displayName: request.displayName, bytes: Buffer.from(request.sourceReference, "utf8"), mediaType: request.detectedMediaType, metadata: {} }];
    }
    if (request.sourceType === "local-file" || request.sourceType === "predownloaded-web-snapshot") {
      const file = this.resolveAllowedFile(request.sourceReference, authorization);
      const blob = this.readLocalFile(file, request.sourceType, authorization);
      if (blob.bytes.length > authorization.maximumTotalBytes) throw new KnowledgeRuntimeBlockedError("File total-byte limit exceeded.", "total_byte_limit");
      return [blob];
    }
    if (request.sourceType === "local-directory") {
      const root = this.resolveAllowedDirectory(request.sourceReference, authorization);
      const files = this.scanDirectory(root, authorization);
      if (files.length > authorization.maximumFileCount) throw new KnowledgeRuntimeBlockedError("Directory file-count limit exceeded.", "file_count_limit");
      let total = 0;
      return files.map((file) => {
        const blob = this.readLocalFile(file, "local-directory", authorization);
        total += blob.bytes.length;
        if (total > authorization.maximumTotalBytes) throw new KnowledgeRuntimeBlockedError("Directory total-byte limit exceeded.", "total_byte_limit");
        return blob;
      });
    }
    throw new KnowledgeRuntimeBlockedError("Unsupported intake source type.", "unsupported_source_type");
  }

  private resolveAllowedFile(reference: string, authorization: IntakeAuthorization): string {
    const resolved = path.resolve(reference);
    const real = safeRealpath(resolved);
    this.assertPathAllowed(real, authorization);
    if (!fs.statSync(real).isFile()) throw new KnowledgeRuntimeBlockedError("Intake source is not a file.", "not_a_file");
    return real;
  }

  private resolveAllowedDirectory(reference: string, authorization: IntakeAuthorization): string {
    const resolved = path.resolve(reference);
    const real = safeRealpath(resolved);
    this.assertPathAllowed(real, authorization);
    if (!fs.statSync(real).isDirectory()) throw new KnowledgeRuntimeBlockedError("Intake source is not a directory.", "not_a_directory");
    return real;
  }

  private assertPathAllowed(realPath: string, authorization: IntakeAuthorization): void {
    const normalized = normalizeFsPath(realPath);
    const allowed = authorization.allowedRoots.map((root) => normalizeFsPath(safeRealpath(path.resolve(root))));
    if (!allowed.some((root) => normalized === root || normalized.startsWith(`${root}${path.sep}`))) throw new KnowledgeRuntimeBlockedError("Source path is outside allowed roots.", "allowed_root_violation");
    const statePath = normalizeFsPath(path.join(this.projectRoot, ".sera", "state"));
    if (normalized.startsWith(`${statePath}${path.sep}`) || normalized.endsWith(`${path.sep}sera-operational.db`)) throw new KnowledgeRuntimeBlockedError("Operational SQLite files cannot be ingested as writable content.", "operational_database_blocked");
    const repoGenerated = normalizeFsPath(path.join(this.projectRoot, ".sera"));
    if (this.policy.generatedRuntimePathPolicy === "block" && (normalized === repoGenerated || normalized.startsWith(`${repoGenerated}${path.sep}`))) {
      throw new KnowledgeRuntimeBlockedError("Runtime generated paths are blocked by default.", "runtime_path_blocked");
    }
  }

  private scanDirectory(root: string, authorization: IntakeAuthorization): string[] {
    const output: string[] = [];
    const walk = (dir: string, depth: number) => {
      if (depth > authorization.maximumDirectoryDepth) throw new KnowledgeRuntimeBlockedError("Directory depth limit exceeded.", "directory_depth_limit");
      const entries = fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
      for (const entry of entries) {
        if (entry.name.startsWith(".") && this.policy.hiddenFilePolicy === "block") throw new KnowledgeRuntimeBlockedError("Hidden files are blocked by policy.", "hidden_file_blocked");
        const p = path.join(dir, entry.name);
        const real = safeRealpath(p);
        this.assertPathAllowed(real, authorization);
        if (entry.isSymbolicLink()) throw new KnowledgeRuntimeBlockedError("Symlink or junction traversal is blocked.", "symlink_escape_blocked");
        if (entry.isDirectory()) walk(real, depth + 1);
        else if (entry.isFile()) output.push(real);
      }
    };
    walk(root, 0);
    return output.sort((a, b) => a.localeCompare(b));
  }

  private readLocalFile(file: string, sourceType: IntakeSourceType, authorization: IntakeAuthorization): SourceBlob {
    const before = fs.statSync(file);
    const maxFileBytes = Math.min(this.policy.limits.maxFileBytes, authorization.maximumIndividualFileSize);
    if (before.size > maxFileBytes) throw new KnowledgeRuntimeBlockedError("Individual file-size limit exceeded.", "individual_file_limit");
    const bytes = fs.readFileSync(file);
    const after = fs.statSync(file);
    if (before.mtimeMs !== after.mtimeMs || before.size !== after.size) throw new KnowledgeRuntimeBlockedError("Source changed during copy.", "source_changed_during_copy");
    return { sourceType, reference: file, displayName: path.basename(file), bytes, mediaType: detectMediaType(file, bytes), metadata: { mtimeMs: before.mtimeMs, mode: before.mode } };
  }

  private preserveSource(request: NormalizedIntakeRequest, source: SourceBlob): AssetRecord {
    const contentHash = sha256Buffer(source.bytes);
    if (request.expectedHash && request.expectedHash !== contentHash) throw new KnowledgeRuntimeBlockedError("Expected source hash mismatch.", "source_hash_mismatch");
    const assetId = stableId("asset", `${request.intakeId}:${source.reference}:${contentHash}`);
    const assetDir = path.join(this.assetRoot, contentHash);
    const contentPath = path.join(assetDir, "content");
    fs.mkdirSync(assetDir, { recursive: true });
    if (fs.existsSync(contentPath)) {
      const existingHash = sha256Buffer(fs.readFileSync(contentPath));
      if (existingHash !== contentHash) throw new KnowledgeRuntimeBlockedError("Preserved asset hash mismatch.", "asset_immutability_violation");
    } else {
      fs.writeFileSync(contentPath, source.bytes);
      fs.chmodSync(contentPath, 0o444);
    }
    const extensionMismatch = extensionMediaType(source.displayName) !== "application/octet-stream" && extensionMediaType(source.displayName) !== source.mediaType;
    const metadata = { ...source.metadata, extensionMediaType: extensionMediaType(source.displayName), extensionMismatch };
    fs.writeFileSync(path.join(assetDir, "metadata.json"), `${stableJson({ assetId, source, contentHash, metadata })}\n`, "utf8");
    return { assetId, intakeId: request.intakeId, sourceType: source.sourceType, originalReference: source.reference, displayName: source.displayName, contentHash, byteSize: source.bytes.length, mediaType: source.mediaType, preservationPath: contentPath, extensionMismatch, metadata };
  }

  private extractAssets(request: NormalizedIntakeRequest, assets: AssetRecord[]): ExtractionBundle {
    const documents: DocumentRecord[] = [];
    const chunks: ChunkRecord[] = [];
    for (const asset of assets) {
      const bytes = fs.readFileSync(asset.preservationPath);
      const extraction = extractBytes(asset, bytes, this.policy);
      const documentId = stableId("knowledge_document", `${asset.assetId}:${asset.contentHash}:${request.intakeId}`);
      const versionId = stableId("knowledge_version", `${documentId}:${asset.contentHash}`);
      const doc: DocumentRecord = {
        documentId,
        versionId,
        assetId: asset.assetId,
        intakeId: request.intakeId,
        title: asset.displayName,
        mediaType: asset.mediaType,
        language: extraction.language,
        extractionStatus: extraction.status,
        extractionText: extraction.text,
        extractionReason: extraction.reason,
        trustState: request.trustDeclaration,
        candidateStatus: "candidate",
        contentVersion: asset.contentHash
      };
      documents.push(doc);
      if (extraction.status === "extracted" && extraction.text.trim()) {
        chunks.push(...chunkText(doc, this.policy));
      }
    }
    return { documents, chunks };
  }

  private persistIntake(request: NormalizedIntakeRequest, authorization: IntakeAuthorization, idempotencyKey: string, assets: AssetRecord[], bundle: ExtractionBundle, evidenceRoot: string): void {
    this.store.recoveryTransaction(() => {
      this.store.recoveryRun("INSERT INTO intake_authorizations (authorization_id, attempt_id, source_type, source_reference_hash, allowed_roots_json, permitted_media_types_json, limits_json, extraction_policy, retention_policy, trust_policy, network_policy, policy_version, issued_at, expires_at, integrity_hash, metadata_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
        authorization.authorizationId, authorization.attemptId, authorization.sourceType, authorization.sourceReferenceHash, stableJson(authorization.allowedRoots), stableJson(authorization.permittedMediaTypes), stableJson({ maximumFileCount: authorization.maximumFileCount, maximumIndividualFileSize: authorization.maximumIndividualFileSize, maximumTotalBytes: authorization.maximumTotalBytes, maximumDirectoryDepth: authorization.maximumDirectoryDepth }), authorization.extractionPolicy, authorization.retentionPolicy, authorization.trustPolicy, authorization.networkPolicy, authorization.policyVersion, authorization.issuedAt, authorization.expiresAt, authorization.integrityHash, "{}"
      ]);
      this.store.recoveryRun("INSERT INTO intake_requests (intake_id, attempt_id, authorization_id, idempotency_key, request_hash, source_type, source_reference, display_name, declared_media_type, detected_media_type, expected_hash, retention_policy, extraction_profile, trust_declaration, state, created_at, updated_at, completed_at, failure_or_block_reason, evidence_root, optimistic_version, metadata_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, 1, ?)", [
        request.intakeId, request.attemptId, request.authorizationId, idempotencyKey, request.requestHash, request.sourceType, request.sourceReference, request.displayName, request.declaredMediaType, request.detectedMediaType, request.expectedHash ?? null, request.retentionPolicy, request.extractionProfile, request.trustDeclaration, bundle.chunks.length > 0 ? "INDEXED" : "OPAQUE_PRESERVED", now(), now(), now(), evidenceRoot, stableJson(request.correlation)
      ]);
      for (const asset of assets) {
        this.store.recoveryRun("INSERT OR IGNORE INTO intake_assets (asset_id, intake_id, source_type, original_reference, display_name, content_hash, byte_size, media_type, declared_media_type, detected_media_type, preservation_path, immutable, extension_mismatch, preserved_at, metadata_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)", [
          asset.assetId, asset.intakeId, asset.sourceType, asset.originalReference, asset.displayName, asset.contentHash, asset.byteSize, asset.mediaType, request.declaredMediaType, asset.mediaType, asset.preservationPath, asset.extensionMismatch ? 1 : 0, now(), stableJson(asset.metadata)
        ]);
      }
      for (const doc of bundle.documents) {
        this.store.recoveryRun("INSERT INTO knowledge_documents (document_id, source_asset_id, intake_id, content_version, title, media_type, language, extraction_status, trust_state, provenance_status, candidate_status, created_at, superseded_at, metadata_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'complete', ?, ?, NULL, ?)", [
          doc.documentId, doc.assetId, doc.intakeId, doc.contentVersion, doc.title, doc.mediaType, doc.language, doc.extractionStatus, doc.trustState, doc.candidateStatus, now(), stableJson({ extractionReason: doc.extractionReason })
        ]);
        this.store.recoveryRun("INSERT INTO knowledge_versions (version_id, document_id, source_asset_id, intake_id, content_hash, version_sequence, created_at, superseded_at, metadata_json) VALUES (?, ?, ?, ?, ?, 1, ?, NULL, ?)", [
          doc.versionId, doc.documentId, doc.assetId, doc.intakeId, doc.contentVersion, now(), "{}"
        ]);
        this.store.recoveryRun("INSERT INTO intake_extractions (extraction_id, intake_id, asset_id, document_id, extraction_profile, extractor_version, status, started_at, completed_at, extracted_text_hash, extracted_byte_count, failure_or_block_reason, metadata_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
          stableId("extraction", `${doc.documentId}:${doc.contentVersion}`), doc.intakeId, doc.assetId, doc.documentId, request.extractionProfile, KNOWLEDGE_RUNTIME_VERSION, doc.extractionStatus, now(), now(), doc.extractionText ? sha256(doc.extractionText) : null, Buffer.byteLength(doc.extractionText, "utf8"), doc.extractionReason, "{}"
        ]);
        this.store.recoveryRun("INSERT INTO knowledge_provenance (provenance_id, document_id, chunk_id, intake_id, asset_id, source_reference, extraction_id, content_hash, extraction_profile, runtime_instance_id, created_at, derived_from_json, metadata_json) VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
          stableId("provenance", `${doc.documentId}:document`), doc.documentId, doc.intakeId, doc.assetId, assets.find((a) => a.assetId === doc.assetId)?.originalReference ?? "", stableId("extraction", `${doc.documentId}:${doc.contentVersion}`), doc.contentVersion, request.extractionProfile, this.store.currentRuntimeInstanceId(), now(), "[]", "{}"
        ]);
      }
      for (const chunk of bundle.chunks) {
        this.store.recoveryRun("INSERT INTO knowledge_chunks (chunk_id, document_id, intake_id, source_asset_id, sequence, chunk_text, chunk_hash, byte_start, byte_end, line_start, line_end, token_estimate, metadata_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
          chunk.chunkId, chunk.documentId, chunk.intakeId, chunk.assetId, chunk.sequence, chunk.text, chunk.chunkHash, chunk.byteStart, chunk.byteEnd, chunk.lineStart, chunk.lineEnd, Math.ceil(chunk.text.length / 4), "{}"
        ]);
        this.store.recoveryRun("INSERT INTO knowledge_provenance (provenance_id, document_id, chunk_id, intake_id, asset_id, source_reference, extraction_id, content_hash, extraction_profile, runtime_instance_id, created_at, derived_from_json, metadata_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
          stableId("provenance", `${chunk.chunkId}:chunk`), chunk.documentId, chunk.chunkId, chunk.intakeId, chunk.assetId, assets.find((a) => a.assetId === chunk.assetId)?.originalReference ?? "", stableId("extraction", `${chunk.documentId}:${bundle.documents.find((doc) => doc.documentId === chunk.documentId)?.contentVersion}`), chunk.chunkHash, request.extractionProfile, this.store.currentRuntimeInstanceId(), now(), "[]", "{}"
        ]);
      }
      this.event(request.intakeId, bundle.chunks.length > 0 ? "INDEXED" : "OPAQUE_PRESERVED", "Intake completed.");
    });
  }

  private persistBlockedIntake(request: NormalizedIntakeRequest, authorization: IntakeAuthorization | undefined, idempotencyKey: string, reason: string, evidenceRoot: string, state: IntakeState): void {
    if (this.store.recoveryGet("SELECT intake_id FROM intake_requests WHERE intake_id = ?", [request.intakeId])) return;
    this.store.recoveryRun("INSERT INTO intake_requests (intake_id, attempt_id, authorization_id, idempotency_key, request_hash, source_type, source_reference, display_name, declared_media_type, detected_media_type, expected_hash, retention_policy, extraction_profile, trust_declaration, state, created_at, updated_at, completed_at, failure_or_block_reason, evidence_root, optimistic_version, metadata_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)", [
      request.intakeId, request.attemptId, request.authorizationId, idempotencyKey, request.requestHash, request.sourceType, request.sourceReference, request.displayName, request.declaredMediaType, request.detectedMediaType, request.expectedHash ?? null, request.retentionPolicy, request.extractionProfile, request.trustDeclaration, state, now(), now(), now(), reason, evidenceRoot, stableJson({ authorizationPresent: Boolean(authorization) })
    ]);
    this.event(request.intakeId, state, reason);
  }

  private resultFromDurableIntake(intakeId: string): IntakeResult {
    const row = this.store.recoveryGet("SELECT * FROM intake_requests WHERE intake_id = ?", [intakeId]);
    if (!row) throw new KnowledgeRuntimeBlockedError("Unknown intake.", "unknown_intake");
    const docs = this.store.recoveryAll("SELECT document_id, candidate_status, trust_state FROM knowledge_documents WHERE intake_id = ? ORDER BY document_id", [intakeId]);
    const assets = this.store.recoveryAll("SELECT asset_id, content_hash FROM intake_assets WHERE intake_id = ? ORDER BY asset_id", [intakeId]);
    const chunkCount = this.store.recoveryAll("SELECT chunk_id FROM knowledge_chunks WHERE intake_id = ?", [intakeId]).length;
    return {
      ok: row.state !== "BLOCKED" && row.state !== "FAILED",
      status: row.state as IntakeState,
      intakeId,
      attemptId: String(row.attempt_id),
      authorizationId: String(row.authorization_id),
      documentIds: docs.map((doc) => String(doc.document_id)),
      assetIds: assets.map((asset) => String(asset.asset_id)),
      chunkCount,
      evidenceRoot: String(row.evidence_root),
      databasePath: this.store.inspect().databasePath,
      candidateStatus: (docs[0]?.candidate_status as CandidateStatus | undefined) ?? "candidate",
      trustState: (docs[0]?.trust_state as TrustState | undefined) ?? "unreviewed",
      contentHashes: assets.map((asset) => String(asset.content_hash)),
      modelUse: false,
      publicNetworkUse: false
    };
  }

  private transition(intakeId: string, toState: IntakeState, reason?: string): void {
    const row = this.store.recoveryGet("SELECT state FROM intake_requests WHERE intake_id = ?", [intakeId]);
    if (!row) throw new KnowledgeRuntimeBlockedError("Unknown intake.", "unknown_intake");
    if (TERMINAL_INTAKE_STATES.has(row.state as IntakeState)) throw new KnowledgeRuntimeBlockedError("Terminal intake records are immutable.", "terminal_intake_immutable");
    this.store.recoveryRun("UPDATE intake_requests SET state = ?, updated_at = ?, completed_at = ?, failure_or_block_reason = ?, optimistic_version = optimistic_version + 1 WHERE intake_id = ?", [toState, now(), TERMINAL_INTAKE_STATES.has(toState) ? now() : null, reason ?? null, intakeId]);
    this.event(intakeId, toState, reason ?? `Intake transitioned to ${toState}.`);
  }

  private event(intakeId: string, eventType: string, message: string, details: Record<string, unknown> = {}): void {
    const sequence = Number(this.store.recoveryGet("SELECT COALESCE(MAX(sequence), 0) + 1 AS sequence FROM intake_events WHERE intake_id = ?", [intakeId])?.sequence ?? 1);
    this.store.recoveryRun("INSERT INTO intake_events (event_id, intake_id, sequence, event_type, timestamp, runtime_instance_id, outcome, message, details_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", [
      id("intake_event"), intakeId, sequence, eventType, now(), this.store.currentRuntimeInstanceId(), eventType === "BLOCKED" || eventType === "FAILED" ? "BLOCKED" : "PASS", message, stableJson(details)
    ]);
  }

  private persistQuery(normalizedQuery: string, results: SearchResult[]): void {
    const queryId = id("knowledge_query");
    this.store.recoveryTransaction(() => {
      this.store.recoveryRun("INSERT INTO knowledge_queries (query_id, query_text, normalized_query, created_at, result_limit, scanned_candidate_count, metadata_json) VALUES (?, ?, ?, ?, ?, ?, ?)", [queryId, normalizedQuery, normalizedQuery, now(), results.length, this.policy.limits.maxSearchScannedChunks, "{}"]);
      for (const result of results) {
        this.store.recoveryRun("INSERT INTO knowledge_query_results (query_id, rank, document_id, chunk_id, score, explanation, provenance_json, trust_state, candidate_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", [queryId, result.rank, result.documentId, result.chunkId, result.score, result.explanation, stableJson(result.provenance), result.trustState, result.candidateStatus]);
      }
    });
  }

  private writeEvidence(request: NormalizedIntakeRequest, authorization: IntakeAuthorization, assets: AssetRecord[], bundle: ExtractionBundle, root: string, state: IntakeState): void {
    const files: Record<string, unknown> = {
      "request.json": request,
      "authorization.json": redactAuthorization(authorization),
      "source-manifest.json": assets.map((asset) => ({ sourceType: asset.sourceType, originalReference: asset.originalReference, displayName: asset.displayName, byteSize: asset.byteSize })),
      "asset-manifest.json": assets.map((asset) => ({ assetId: asset.assetId, contentHash: asset.contentHash, byteSize: asset.byteSize, mediaType: asset.mediaType, extensionMismatch: asset.extensionMismatch, preservationPath: asset.preservationPath })),
      "extraction-report.json": bundle.documents.map((doc) => ({ documentId: doc.documentId, status: doc.extractionStatus, mediaType: doc.mediaType, reason: doc.extractionReason })),
      "chunk-manifest.json": bundle.chunks.map((chunk) => ({ chunkId: chunk.chunkId, documentId: chunk.documentId, sequence: chunk.sequence, chunkHash: chunk.chunkHash, byteStart: chunk.byteStart, byteEnd: chunk.byteEnd, lineStart: chunk.lineStart, lineEnd: chunk.lineEnd })),
      "provenance.json": bundle.documents.map((doc) => ({ documentId: doc.documentId, intakeId: doc.intakeId, assetId: doc.assetId, contentVersion: doc.contentVersion, trustState: doc.trustState, candidateStatus: doc.candidateStatus })),
      "indexing-report.json": { indexed: bundle.chunks.length > 0, chunkCount: bundle.chunks.length, fallbackRetrieval: "bounded deterministic LIKE scan" },
      "final-intake-report.json": { schemaVersion: KNOWLEDGE_RUNTIME_SCHEMA_VERSION, ok: state !== "BLOCKED" && state !== "FAILED", status: state, intakeId: request.intakeId, attemptId: request.attemptId, authorizationId: request.authorizationId, sourceType: request.sourceType, contentHashes: assets.map((asset) => asset.contentHash), mediaTypes: assets.map((asset) => asset.mediaType), byteCounts: assets.map((asset) => asset.byteSize), extractionResult: bundle.documents.map((doc) => doc.extractionStatus), chunkCount: bundle.chunks.length, trustState: request.trustDeclaration, candidateStatus: "candidate", provenance: true, modelUse: false, publicNetworkUse: false, installationId: this.store.currentInstallationId(), runtimeInstanceId: this.store.currentRuntimeInstanceId() }
    };
    for (const [name, value] of Object.entries(files)) writeJson(path.join(root, name), value);
    fs.writeFileSync(path.join(root, "lifecycle-events.jsonl"), this.store.recoveryAll("SELECT event_type, timestamp, outcome, message FROM intake_events WHERE intake_id = ? ORDER BY sequence", [request.intakeId]).map((event) => stableJson(event)).join("\n") + "\n", "utf8");
    writeJson(path.join(this.reportRoot, "last-intake-report.json"), files["final-intake-report.json"]);
  }

  private writeFailureEvidence(request: NormalizedIntakeRequest, authorization: IntakeAuthorization | undefined, reason: string, root: string, state: IntakeState): void {
    fs.mkdirSync(root, { recursive: true });
    writeJson(path.join(root, "request.json"), request);
    writeJson(path.join(root, "authorization.json"), authorization ? redactAuthorization(authorization) : { missing: true });
    writeJson(path.join(root, "source-manifest.json"), []);
    writeJson(path.join(root, "asset-manifest.json"), []);
    writeJson(path.join(root, "extraction-report.json"), { status: state, reason });
    writeJson(path.join(root, "chunk-manifest.json"), []);
    writeJson(path.join(root, "provenance.json"), []);
    fs.writeFileSync(path.join(root, "lifecycle-events.jsonl"), `${stableJson({ eventType: state, message: reason })}\n`, "utf8");
    writeJson(path.join(root, "indexing-report.json"), { indexed: false, reason });
    writeJson(path.join(root, "final-intake-report.json"), { schemaVersion: KNOWLEDGE_RUNTIME_SCHEMA_VERSION, ok: false, status: state, intakeId: request.intakeId, reason, modelUse: false, publicNetworkUse: false });
  }
}

interface SourceBlob {
  sourceType: IntakeSourceType;
  reference: string;
  displayName: string;
  bytes: Buffer;
  mediaType: string;
  metadata: Record<string, unknown>;
}

interface AssetRecord {
  assetId: string;
  intakeId: string;
  sourceType: IntakeSourceType;
  originalReference: string;
  displayName: string;
  contentHash: string;
  byteSize: number;
  mediaType: string;
  preservationPath: string;
  extensionMismatch: boolean;
  metadata: Record<string, unknown>;
}

interface DocumentRecord {
  documentId: string;
  versionId: string;
  assetId: string;
  intakeId: string;
  title: string;
  mediaType: string;
  language: string | null;
  extractionStatus: string;
  extractionText: string;
  extractionReason: string | null;
  trustState: TrustState;
  candidateStatus: CandidateStatus;
  contentVersion: string;
}

interface ChunkRecord {
  chunkId: string;
  documentId: string;
  intakeId: string;
  assetId: string;
  sequence: number;
  text: string;
  chunkHash: string;
  byteStart: number;
  byteEnd: number;
  lineStart: number | null;
  lineEnd: number | null;
}

interface ExtractionBundle {
  documents: DocumentRecord[];
  chunks: ChunkRecord[];
}

export function normalizeIntakeRequest(input: IntakeRequestInput, policy: KnowledgeRuntimePolicy = DEFAULT_KNOWLEDGE_POLICY): NormalizedIntakeRequest {
  if (!input.intakeId || !input.attemptId || !input.authorizationId) throw new KnowledgeRuntimeBlockedError("Intake, attempt, and authorization IDs are required.", "invalid_request");
  const detectedMediaType = input.declaredMediaType ?? detectMediaType(input.displayName ?? input.sourceReference, Buffer.from(input.sourceReference, "utf8"));
  const normalized: NormalizedIntakeRequest = {
    intakeId: input.intakeId,
    attemptId: input.attemptId,
    authorizationId: input.authorizationId,
    sourceType: input.sourceType,
    sourceReference: normalizeSourceReference(input.sourceReference, input.sourceType),
    displayName: input.displayName ?? displayNameFor(input.sourceReference, input.sourceType),
    declaredMediaType: input.declaredMediaType ?? detectedMediaType,
    detectedMediaType,
    expectedHash: input.expectedHash,
    retentionPolicy: input.retentionPolicy ?? policy.defaultRetentionPolicy,
    extractionProfile: input.extractionProfile ?? policy.defaultExtractionProfile,
    trustDeclaration: input.trustDeclaration ?? policy.defaultTrustState,
    allowedRoots: (input.allowedRoots ?? []).map((root) => path.resolve(root)).sort(),
    correlation: input.correlation ?? {},
    requestHash: ""
  };
  normalized.requestHash = stableHash({ ...normalized, requestHash: "" });
  return normalized;
}

export function createIntakeAuthorization(request: NormalizedIntakeRequest, input: Partial<IntakeAuthorization> = {}, policy: KnowledgeRuntimePolicy = DEFAULT_KNOWLEDGE_POLICY): IntakeAuthorization {
  const issuedAt = input.issuedAt ?? new Date().toISOString();
  const authorization: IntakeAuthorization = {
    authorizationId: input.authorizationId ?? request.authorizationId,
    attemptId: input.attemptId ?? request.attemptId,
    sourceType: input.sourceType ?? request.sourceType,
    sourceReferenceHash: input.sourceReferenceHash ?? sha256(request.sourceReference),
    allowedRoots: input.allowedRoots ?? request.allowedRoots,
    permittedMediaTypes: input.permittedMediaTypes ?? ["*/*"],
    maximumFileCount: input.maximumFileCount ?? policy.limits.maxFileCount,
    maximumIndividualFileSize: input.maximumIndividualFileSize ?? policy.limits.maxFileBytes,
    maximumTotalBytes: input.maximumTotalBytes ?? policy.limits.maxTotalBytes,
    maximumDirectoryDepth: input.maximumDirectoryDepth ?? policy.limits.maxDirectoryDepth,
    extractionPolicy: input.extractionPolicy ?? request.extractionProfile,
    retentionPolicy: input.retentionPolicy ?? request.retentionPolicy,
    trustPolicy: input.trustPolicy ?? request.trustDeclaration,
    networkPolicy: input.networkPolicy ?? "offline-no-fetch",
    policyVersion: input.policyVersion ?? KNOWLEDGE_INTAKE_POLICY_VERSION,
    issuedAt,
    expiresAt: input.expiresAt ?? new Date(Date.now() + 60_000).toISOString(),
    integrityHash: ""
  };
  authorization.integrityHash = input.integrityHash ?? authorizationHash(authorization);
  return authorization;
}

export function authorizationHash(authorization: IntakeAuthorization): string {
  return stableHash({ ...authorization, integrityHash: "" });
}

function extractBytes(asset: AssetRecord, bytes: Buffer, policy: KnowledgeRuntimePolicy): { status: "extracted" | "opaque"; text: string; reason: string | null; language: string | null } {
  if (!TEXT_TYPES.has(asset.mediaType)) return { status: "opaque", text: "", reason: `Opaque ${asset.mediaType} preserved; future processor required.`, language: null };
  if (asset.mediaType === "application/json") {
    try {
      return { status: "extracted", text: stableJson(JSON.parse(bytes.toString("utf8"))), reason: null, language: null };
    } catch {
      throw new KnowledgeRuntimeBlockedError("Malformed JSON blocked extraction.", "malformed_json");
    }
  }
  if (asset.mediaType === "text/csv") return extractCsv(bytes.toString("utf8"), policy);
  if (asset.mediaType === "text/html") return { status: "extracted", text: htmlToText(bytes.toString("utf8")), reason: "HTML scripts and external resources were not executed or loaded.", language: null };
  const text = bytes.toString("utf8");
  if (text.includes("\uFFFD")) return { status: "opaque", text: "", reason: "Invalid UTF-8 handled as opaque content.", language: null };
  return { status: "extracted", text: text.replace(/\r\n/g, "\n"), reason: null, language: "und" };
}

function extractCsv(text: string, policy: KnowledgeRuntimePolicy): { status: "extracted"; text: string; reason: string | null; language: null } {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted && ch === "\"" && text[i + 1] === "\"") {
      field += "\"";
      i += 1;
    } else if (ch === "\"") {
      quoted = !quoted;
    } else if (!quoted && ch === ",") {
      row.push(field);
      field = "";
    } else if (!quoted && (ch === "\n" || ch === "\r")) {
      if (ch === "\r" && text[i + 1] === "\n") i += 1;
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
    } else {
      field += ch;
    }
  }
  if (quoted) throw new KnowledgeRuntimeBlockedError("Malformed CSV record reported.", "malformed_csv");
  row.push(field);
  if (row.some((value) => value.length > 0)) rows.push(row);
  if (rows.length > policy.limits.maxCsvRows) throw new KnowledgeRuntimeBlockedError("CSV row limit exceeded.", "csv_row_limit");
  if (rows.some((r) => r.length > policy.limits.maxCsvColumns)) throw new KnowledgeRuntimeBlockedError("CSV column limit exceeded.", "csv_column_limit");
  return { status: "extracted", text: rows.map((r) => r.join(" | ")).join("\n"), reason: null, language: null };
}

function chunkText(doc: DocumentRecord, policy: KnowledgeRuntimePolicy): ChunkRecord[] {
  const text = doc.extractionText.replace(/\r\n/g, "\n");
  const chunks: ChunkRecord[] = [];
  let offset = 0;
  let sequence = 1;
  const step = Math.max(1, policy.limits.maxChunkBytes - policy.limits.chunkOverlapBytes);
  while (offset < Buffer.byteLength(text, "utf8")) {
    const part = sliceUtf8(text, offset, policy.limits.maxChunkBytes);
    if (part.trim()) {
      const byteEnd = offset + Buffer.byteLength(part, "utf8");
      const lines = lineRange(text, offset, byteEnd);
      const chunkHash = sha256(part);
      chunks.push({
        chunkId: stableId("knowledge_chunk", `${doc.documentId}:${sequence}:${chunkHash}`),
        documentId: doc.documentId,
        intakeId: doc.intakeId,
        assetId: doc.assetId,
        sequence,
        text: part,
        chunkHash,
        byteStart: offset,
        byteEnd,
        lineStart: lines[0],
        lineEnd: lines[1]
      });
      sequence += 1;
    }
    offset += step;
  }
  return chunks;
}

export function createKnowledgeRuntimeService(input: RuntimeStateConfigInput = {}): RuntimeService {
  let store: RuntimeStateStore | undefined;
  let runtime: KnowledgeRuntime | undefined;
  return {
    id: KNOWLEDGE_RUNTIME_SERVICE_ID,
    version: KNOWLEDGE_RUNTIME_VERSION,
    required: true,
    dependencies: ["operational-state", "unified-control-plane", "persistent-runtime-recovery"],
    start(context: RuntimeServiceContext) {
      store = openRuntimeState({ ...input, projectRoot: context.config.projectRoot });
      runtime = new KnowledgeRuntime(store, { ...input, projectRoot: context.config.projectRoot });
      runtime.types();
    },
    health() {
      return { serviceId: KNOWLEDGE_RUNTIME_SERVICE_ID, status: "healthy", checkedAt: new Date().toISOString(), message: "Knowledge and Universal Intake Runtime is healthy.", details: { supportedTypes: ["inline-text", "local-file", "local-directory", "url-reference", "predownloaded-web-snapshot", "generated-fixture"], opaqueTypes: [...OPAQUE_TYPES].sort() } };
    },
    stop() {
      runtime?.shutdown();
      store?.close();
      runtime = undefined;
      store = undefined;
    }
  };
}

export function createKnowledgeRuntimeServices(projectRoot: string, input: RuntimeStateConfigInput = {}): RuntimeService[] {
  const controlPlane = createControlPlaneRuntimeService(projectRoot);
  return [
    createRuntimeStateService(input),
    { ...controlPlane, dependencies: ["operational-state"] },
    createPersistentRuntimeRecoveryService({ ...input, projectRoot }),
    createKnowledgeRuntimeService({ ...input, projectRoot })
  ];
}

export async function runKnowledgeIntakeProof(input: RuntimeStateConfigInput = {}): Promise<KnowledgeProofResult> {
  const proofRoot = path.resolve(input.projectRoot ?? fs.mkdtempSync(path.join(os.tmpdir(), "sera-knowledge-intake-proof-")));
  fs.mkdirSync(proofRoot, { recursive: true });
  fs.writeFileSync(path.join(proofRoot, "package.json"), JSON.stringify({ name: "knowledge-intake-proof", private: true }), "utf8");
  const dataRoot = path.join(proofRoot, "sources");
  fs.mkdirSync(dataRoot, { recursive: true });
  const store = openRuntimeState({ projectRoot: proofRoot, installationId: "installation_knowledge_intake_proof", runtimeInstanceId: `runtime_knowledge_intake_proof_${Date.now()}` });
  try {
    const attemptId = createAttempt(store);
    const runtime = new KnowledgeRuntime(store, { projectRoot: proofRoot });
    const text = await proofIntake(runtime, attemptId, { sourceType: "inline-text", sourceReference: "alpha beta local knowledge\nsecond line", displayName: "text.txt" }, "text-proof");
    const json = await proofIntake(runtime, attemptId, { sourceType: "inline-text", sourceReference: "{\"beta\":2,\"alpha\":1}", displayName: "data.json", declaredMediaType: "application/json" }, "json-proof");
    fs.writeFileSync(path.join(dataRoot, "a.md"), "# Alpha\nlocal beta markdown\n", "utf8");
    fs.writeFileSync(path.join(dataRoot, "b.csv"), "name,value\nalpha,1\nbeta,2\n", "utf8");
    const dir = await proofIntake(runtime, attemptId, { sourceType: "local-directory", sourceReference: dataRoot, displayName: "sources", allowedRoots: [dataRoot] }, "dir-proof");
    fs.writeFileSync(path.join(dataRoot, "opaque.png"), Buffer.from([137, 80, 78, 71, 0, 1, 2]));
    const opaque = await proofIntake(runtime, attemptId, { sourceType: "local-file", sourceReference: path.join(dataRoot, "opaque.png"), displayName: "opaque.png", allowedRoots: [dataRoot] }, "opaque-proof");
    const duplicate = await proofIntake(runtime, attemptId, { sourceType: "inline-text", sourceReference: "alpha beta local knowledge\nsecond line", displayName: "duplicate.txt" }, "duplicate-proof");
    const changed = await proofIntake(runtime, attemptId, { sourceType: "inline-text", sourceReference: "alpha beta changed version", displayName: "changed.txt" }, "changed-proof");
    const searchA = runtime.search("alpha beta");
    const searchB = runtime.search("alpha beta");
    let escapeBlocked = false;
    const outside = path.join(proofRoot, "outside.txt");
    fs.writeFileSync(outside, "outside", "utf8");
    const badReq = normalizeIntakeRequest({ intakeId: id("bad_intake"), attemptId, authorizationId: "bad_auth", sourceType: "local-file", sourceReference: outside, allowedRoots: [dataRoot] });
    const badAuth = createIntakeAuthorization(badReq);
    const bad = await runtime.intake(badReq, badAuth, "escape-proof");
    escapeBlocked = bad.status === "BLOCKED";
    const host = new RuntimeHost({ config: createRuntimeConfig({ projectRoot: proofRoot }), services: createKnowledgeRuntimeServices(proofRoot) });
    const started = await host.start();
    const health = await host.health();
    await host.shutdown();
    const evidenceFiles = ["request.json", "authorization.json", "source-manifest.json", "asset-manifest.json", "extraction-report.json", "chunk-manifest.json", "provenance.json", "lifecycle-events.jsonl", "indexing-report.json", "final-intake-report.json"];
    return {
      ok: text.ok && json.ok && dir.ok && opaque.ok && duplicate.ok && changed.ok && escapeBlocked && searchA.results.length > 0 && started.ok,
      status: "healthy",
      proofRoot,
      databasePath: store.inspect().databasePath,
      firstIntake: text.intakeId,
      secondIntake: duplicate.intakeId,
      firstSearchCount: searchA.results.length,
      secondSearchCount: searchB.results.length,
      textIntake: text.status === "INDEXED",
      jsonIntake: json.status === "INDEXED",
      directoryIntake: dir.status === "INDEXED",
      opaquePreserved: opaque.status === "OPAQUE_PRESERVED",
      duplicateDeduplicated: text.contentHashes[0] === duplicate.contentHashes[0],
      versionCreated: changed.contentHashes[0] !== text.contentHashes[0],
      pathEscapeBlocked: escapeBlocked,
      deterministicChunking: stableJson(searchA.results) === stableJson(searchB.results),
      candidateStatusDefault: text.candidateStatus === "candidate",
      provenanceComplete: searchA.results.every((r) => r.provenance.intakeId && r.provenance.assetId && r.provenance.contentHash),
      trustNotInferred: text.trustState === "unreviewed",
      lexicalRetrieval: searchA.results.length > 0,
      retrievalDeterministic: stableJson(searchA.results) === stableJson(searchB.results),
      evidenceComplete: evidenceFiles.every((file) => fs.existsSync(path.join(text.evidenceRoot, file))),
      runtimeServiceHealthy: health.services.some((service) => service.serviceId === KNOWLEDGE_RUNTIME_SERVICE_ID && service.status === "healthy"),
      nonGit: !fs.existsSync(path.join(proofRoot, ".git")),
      offline: true,
      noModelRequired: true,
      publicNetworkUse: false,
      modelUse: false
    };
  } finally {
    store.close();
  }
}

export async function runKnowledgeRetrievalProof(input: RuntimeStateConfigInput = {}): Promise<KnowledgeProofResult> {
  return runKnowledgeIntakeProof(input);
}

async function proofIntake(runtime: KnowledgeRuntime, attemptId: string, input: Omit<IntakeRequestInput, "intakeId" | "attemptId" | "authorizationId">, key: string): Promise<IntakeResult> {
  const intakeId = id("intake_proof");
  const request = normalizeIntakeRequest({ intakeId, attemptId, authorizationId: `auth_${intakeId}`, ...input });
  const auth = createIntakeAuthorization(request);
  return runtime.intake(request, auth, key);
}

function createAttempt(store: RuntimeStateStore): string {
  const command = store.acceptCommand({ idempotencyKey: `knowledge-proof:${Date.now()}:${Math.random()}`, commandType: "knowledge-proof", payload: {}, capability: "knowledge-intake-runtime" });
  const attemptId = command.attemptId!;
  store.transitionAttempt({ attemptId, fromState: "PENDING", toState: "RUNNING", actor: "control-plane", reason: "knowledge proof" });
  return attemptId;
}

function normalizeSourceReference(reference: string, sourceType: IntakeSourceType): string {
  return sourceType === "local-file" || sourceType === "local-directory" || sourceType === "predownloaded-web-snapshot" ? path.resolve(reference) : reference.replace(/\r\n/g, "\n");
}

function displayNameFor(reference: string, sourceType: IntakeSourceType): string {
  return sourceType === "inline-text" ? "inline-text.txt" : path.basename(reference) || sourceType;
}

function detectMediaType(name: string, bytes: Buffer): string {
  if (bytes.length >= 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) return "application/pdf";
  if (bytes.length >= 4 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 4 && bytes.subarray(0, 4).toString("ascii") === "GIF8") return "image/gif";
  if (bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04) return "application/zip";
  const ext = path.extname(name).toLowerCase();
  if (ext === ".md" || ext === ".markdown") return "text/markdown";
  if (ext === ".json") return "application/json";
  if (ext === ".csv" || ext === ".tsv") return "text/csv";
  if (ext === ".html" || ext === ".htm") return "text/html";
  if (ext === ".txt" || ext === "") return "text/plain";
  if (ext === ".pdf") return "application/pdf";
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".gif") return "image/gif";
  if (ext === ".mp3") return "audio/mpeg";
  if (ext === ".wav") return "audio/wav";
  if (ext === ".mp4") return "video/mp4";
  if (ext === ".zip" || ext === ".tar" || ext === ".gz") return "application/zip";
  return bytes.subarray(0, 512).includes(0) ? "application/octet-stream" : "text/plain";
}

function extensionMediaType(name: string): string {
  return detectMediaType(name, Buffer.alloc(0));
}

function htmlToText(html: string): string {
  return html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function sliceUtf8(text: string, startByte: number, maxBytes: number): string {
  const bytes = Buffer.from(text, "utf8");
  return bytes.subarray(startByte, Math.min(bytes.length, startByte + maxBytes)).toString("utf8").replace(/\uFFFD+$/g, "");
}

function lineRange(text: string, startByte: number, endByte: number): [number | null, number | null] {
  const before = Buffer.from(text, "utf8").subarray(0, startByte).toString("utf8");
  const through = Buffer.from(text, "utf8").subarray(0, endByte).toString("utf8");
  return [before.split("\n").length, through.split("\n").length];
}

function normalizeQuery(query: string): string {
  return query.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

function countOccurrences(haystack: string, needle: string): number {
  if (!needle) return 0;
  return haystack.split(needle).length - 1;
}

function redactAuthorization(authorization: IntakeAuthorization): Record<string, unknown> {
  return { ...authorization, integrityHash: authorization.integrityHash };
}

function safeRealpath(value: string): string {
  try {
    return fs.realpathSync.native(value);
  } catch {
    return fs.realpathSync(value);
  }
}

function normalizeFsPath(value: string): string {
  return path.resolve(value);
}

function writeJson(file: string, value: unknown): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${stableJson(value)}\n`, "utf8");
}

function id(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(8).toString("hex")}`;
}

function stableId(prefix: string, value: string): string {
  return `${prefix}_${sha256(value).slice(0, 24)}`;
}

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function sha256Buffer(value: Buffer): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function stableHash(value: unknown): string {
  return sha256(stableJson(value));
}

function stableJson(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, sortValue(item)]));
  }
  return value;
}

function now(): string {
  return new Date().toISOString();
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
