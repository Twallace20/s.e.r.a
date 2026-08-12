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
Later gate meanings must be added only when their acceptance boundaries are
made explicit.
