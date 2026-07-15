# Knowledge and Universal Intake Runtime v1

Milestone 9 adds the first Runtime-owned knowledge and universal intake boundary.

`@sera/knowledge-runtime` ingests authorized local information into durable candidate knowledge records. It is not a truth engine, crawler, browser, OCR system, transcription system, model enrichment system, archive extractor, or autonomous learning loop.

## Contract

- Accept explicitly authorized intake requests.
- Normalize inline text, local files, local directories, predownloaded snapshots, URL references, and generated fixtures.
- Preserve original bytes with content hashes and immutable evidence paths.
- Extract deterministic text from bounded text, Markdown, JSON, CSV, and inert HTML.
- Preserve PDFs, images, audio, video, archives, and unknown binary files as opaque assets.
- Chunk extracted text deterministically.
- Persist intake, asset, extraction, document, chunk, provenance, version, query, and query-result records in SQLite Operational State migration v6.
- Return deterministic lexical retrieval results with provenance, candidate status, and trust state.

## Safety Boundaries

- Default operation is local and offline.
- URL references are recorded but not fetched.
- Public network access is not used.
- Real model invocation is not used.
- Imported content is never executed.
- Active HTML is not rendered and scripts/resources are not loaded.
- Archives are not extracted.
- Imported content is never promoted to canonical truth.
- Trust is not inferred from content.
- Runtime-generated paths and live operational database files are blocked as intake sources.
- Control Plane terminal authority remains outside this runtime.

## Existing Component Disposition

- `packages/knowledge` remains a compatibility surface for legacy `.sera-knowledge/` document and chunk records. It does not retain competing Runtime authority.
- `packages/research` remains a capability-layer reader over indexed local evidence and does not own intake, preservation, trust, or promotion.
- `docs/knowledge/SOURCE_MAP.md` and the knowledge seed scripts remain evidence-governance helpers for curated repo sources.
- File-intake and request-intake phase artifacts remain legacy/evidence-only until a later adapter deliberately routes them through `@sera/knowledge-runtime`.
- Memory, lesson, and active-rule systems may cite knowledge evidence, but they do not promote imported content to truth.

## Authorization

Every intake requires a signed authorization record containing source type, source reference hash, allowed roots, permitted media types, file and byte limits, extraction and retention policies, trust policy, offline network policy, expiration, and integrity hash.

Mismatched authorizations are blocked before source preservation. Conflicting idempotency reuse is blocked. Terminal intake states are immutable.

## Evidence

Each successful or blocked intake writes evidence under `.sera/intake/<intake-id>/`, including request, authorization when present, source manifest, asset manifest, extraction report, chunk manifest, provenance, lifecycle events, indexing report, and final intake report.

Content-addressed assets are stored under `.sera/knowledge/assets/<content-hash>/`. Repository Snapshot excludes `.sera/intake/` and `.sera/knowledge/` as generated Runtime evidence.

## Retrieval

Retrieval is deterministic lexical search over indexed chunks. Results include rank, score explanation, chunk text, document identity, chunk identity, provenance, trust state, and candidate status. Retrieval does not claim semantic understanding or factual correctness.

SQLite FTS5 is not required for v1 certification. The certified implementation uses a bounded deterministic scan and lexical scoring fallback so behavior does not depend on undocumented SQLite extension availability.

## Runtime Host Integration

The required Runtime Service ID is `knowledge-intake-runtime`. It depends on `operational-state`, `unified-control-plane`, and `persistent-runtime-recovery`; it reports supported source and opaque media types, validates its extractor and storage roots during startup, refuses new intake after shutdown, and closes idempotently.

## Control Plane Integration

Control Plane owns intake authorization, trust/promotion gates, terminal attempt authority, and closeout. The Knowledge Runtime records intake outcomes and evidence only. A successful intake leaves the parent attempt under Control Plane authority and does not establish source truth.

## Local Model Runtime Relationship

Local Model Runtime is a sibling Runtime boundary. Milestone 9 does not invoke real models and does not generate automatic summaries. Future enrichment must require separate Control Plane authorization, remain candidate content, and retain provenance back to original source evidence.

## Persistent Recovery

Interrupted intake handling is conservative. Terminal intake records remain immutable, partially copied or partially indexed records are not promoted to knowledge, completed preserved assets may be reused by content hash, and uncertain source changes block for review.

## Non-Git And Offline Operation

Proofs use temporary non-Git roots and isolated SQLite state. They do not require public internet access, public URL fetching, OCR, transcription, archive extraction, or real model invocation.

## Milestone 10 Boundary

Milestone 10 is Capability Engine and Recursive Learning. Milestone 9 does not implement capability learning, recursive promotion, autonomous web research, Desktop Operator behavior, distributed intake, or Hive Mode.

## Certification

The certification target is `knowledge-intake-runtime-v1`.

Focused tests cover authorization, source boundaries, symlink and junction safety where supported, limits, deduplication, versioning, text extraction, opaque preservation, deterministic chunking, provenance, trust semantics, retrieval determinism, idempotency, terminal immutability, recovery safety, Runtime Host health, CLI proofs, migration checksums, Repository Snapshot/Truth alignment, offline behavior, and model-free operation.
