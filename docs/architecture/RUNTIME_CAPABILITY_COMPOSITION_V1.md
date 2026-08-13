# Runtime Capability Composition v1

Milestone 5 establishes one canonical runtime composition boundary for
S.E.R.A. capabilities.

A package existing in the repository does not by itself mean that the
capability is operational in the product Runtime.

A runtime capability is certifiable only when it is:

1. registered,
2. composed through the governed Runtime,
3. subject to the Unified Control Plane authority boundary,
4. prevented from self-authorizing execution or certification,
5. tied to authoritative Runtime State and evidence,
6. behaviorally exercised,
7. tested on representative real resources for every advertised
   external resource or format claim,
8. validated against expected and actual results,
9. proven on a failure path, and
10. closed without residual scratch or unauthorized state.

## Real-resource rule

Synthetic fixtures remain useful for deterministic unit and failure tests.
They do not certify externally observable resource-format claims.

If S.E.R.A. advertises support for a PDF, DOCX, image, audio resource,
video resource, archive, URL fetch, installed local model, filesystem
resource, or another concrete resource class, certification requires a
representative real resource of that exact class.

Each resource proof must retain:

- resource identity or provenance,
- expected result,
- actual result,
- validation assertions,
- evidence references,
- applicable hashes or digests,
- failure behavior, and
- clean closeout evidence.

Multi-format capabilities are certified per advertised format. Passing one
format does not imply that another format works.

A URL reference is not the same capability claim as fetching a URL.
A preserved opaque media object is not the same capability claim as OCR,
transcription, decoding, or semantic understanding.

## Existing truth systems

`architecture/capability-inventory.json` remains repository and architecture
inventory.

`architecture/capability-claim-proof-registry-v1.json` remains the portable
Base MVP claim/proof registry.

`architecture/runtime-capability-registry-v1.json` is the Milestone 5
runtime-operability and composition registry.

These registries must not silently overwrite one another's meaning.

## Milestone 5 fixed certification denominator

Milestone 5 contains exactly twelve gates: M5-01 through M5-12.
Additional discoveries do not silently expand the milestone.

M5-06 certifies Local Model Runtime (`local-model`) against the universal
requirements above and the `real-local-ollama-candidate` claim requirements.
M5-07 certifies Knowledge and Universal Intake Runtime (`knowledge-intake`)
against the universal requirements above for real local text, local directory,
predownloaded snapshot, opaque media, archive, and URL-reference resources.
The URL-reference boundary records metadata without fetching, and opaque media
and archives are preserved without semantic extraction.
M5-08 certifies Memory Capability (`memory`) against the universal requirements
above. A real durable memory record must be bound to an authoritative Runtime
attempt and immutable evidence hash, invalid authorization must block before
writing, and only the Control Plane may complete the attempt.
M5-09 certifies Capability Engine (`capability-engine`) composition against the
universal requirements above. The real `docs/BUILD_VALIDATION.md` resource must
be hash-bound as proposal provenance for an immutable, content-addressed
capability candidate bundle. Invalid authorization must block before candidate
writes, the bundle must remain candidate-only without active-catalog promotion,
and only the Control Plane may complete the attempt.
M5-10 certifies Planner / Task Capability (`planner`) against the universal
requirements above. A real governed task request must retain its exact durable
payload, replay idempotently, block conflicting idempotency reuse without
creating duplicate durable state, perform no execution, retain immutable
Runtime State evidence, and close only through Control Plane authority.
M5-11 certifies Worker Capability (`worker`) against the universal requirements
above. The real `docs/BUILD_VALIDATION.md` resource must traverse the governed
Worker composition as a bounded `workspace-task`, retain exact source and
output hashes plus authoritative execution evidence, preserve the source and
clean its isolated workspace, and use neither a model nor public networking.
Missing authorization must block before workspace preparation or process
launch, and only the Control Plane may complete the authoritative attempt.
M5-12 certifies Governed Tool Capability (`tool`) against the universal
requirements above. The real `docs/BUILD_VALIDATION.md` local-file resource
must traverse the governed Tool composition with exact source and output
hashes, authoritative execution evidence, isolated-workspace cleanup, no source
mutation, and no model or public-network use. Missing authorization, request
mutation, incomplete gates, and corrupted authorization integrity must each
block before workspace preparation or process launch. Only the Control Plane
may complete the authoritative attempt after the certification gate passes.
Later gate meanings must be added only when their acceptance boundaries are
made explicit.
