# Fresh-Process Offline Restart Relocated-Root Lesson Persistence Proof v1

Certification target: `fresh-process-offline-restart-relocated-root-lesson-persistence-proof-v1`.

Milestone 15 proves that certified and activated learning created by the existing Learning Governance Runtime survives a complete child-process writer shutdown, a separate fresh-process recovery, and a third fresh-process relocated-root recovery without public network access, model invocation, package installation, browser use, cloud storage, or Git dependency.

Milestone 15 proves fresh-process restart, relocated operational-state recovery, and process-level offline denial on the supported development machine. It does not prove installation of a packaged product on a separate clean machine. Milestone 16 owns the packaged portable clean-machine proof.

## Boundary

`@sera/restart-persistence-proof` is certification/proof infrastructure. It orchestrates existing Runtime components for a deterministic proof, but it does not own Runtime lifecycle authority, Control Plane authority, Learning Governance policy, recurrence-prevention decisions, provider behavior, Studio behavior, or permanent production service authority.

Authority remains with the established layers:

- Runtime Host owns process lifecycle and identity.
- Runtime State owns durable SQLite records, migration posture, backup, export, and leases.
- Persistent Runtime Recovery classifies interrupted state conservatively.
- Learning Governance owns durable lesson and prevention-rule state.
- Integrated Loop consumes read-only learning preflight before selection or generation.
- Control Plane remains the authority boundary for certification, activation, promotion, overrides, and terminal attempt state.

## Process Separation

The proof uses an isolated temporary installation root.

Process A starts Runtime Host, creates durable learning evidence, certifies and activates a lesson, activates a prevention rule, closes SQLite handles, and shuts down Runtime Host.

Process B is a fresh operating-system process identity against the same durable state. It reconstructs active learning from SQLite, performs learning preflight before selection and generation, selects the certified alternative, avoids the known bad path, and terminates cleanly.

Process C is another fresh process identity against a distinct relocated operational root. It verifies the transfer manifest, byte sizes, hashes, stable installation identity, fresh Runtime instance identity, recurrence decisions, terminal immutability, and lease fencing while the former source operational-state path is unavailable.

No live object, open database handle, module singleton, cached lesson object, or in-memory registry is transferred across the process boundary.

## Durable Learning Reconstruction

The proof preserves and reopens durable records for:

- learning sessions, failures, hypotheses, repair evidence, lesson versions, certifications, activations, supersession history, prevention rules, Integrated Loop preflight rows, preflight matches, selected alternatives, lifecycle transitions, events, migration rows, and lease/fencing evidence.
- exact known-failure, materially equivalent, related-but-not-equivalent, and out-of-scope classifications.

Expected decisions:

- Exact known failure: `APPLY_CERTIFIED_ALTERNATIVE`.
- Materially equivalent failure: `APPLY_CERTIFIED_ALTERNATIVE`.
- Related but not equivalent: `WARN_RELATED_CONTEXT`.
- Out of scope: `CLEAR_OUT_OF_SCOPE`.

## Relocated Root

The relocated-root proof creates a different isolated destination root with no `.git` directory. It transfers only explicitly allowed Milestone 15 operational state: the SQLite backup, bounded JSON export, and Runtime Host installation identity record. The deterministic transfer manifest records normalized relative path, file type, byte size, SHA-256 digest, transfer timestamp, source installation identity, destination installation policy, required status, and manifest digest. The source operational-state directory is renamed after transfer so the former path is unavailable before Process C starts.

The relocated root opens Runtime State from the destination database, recovers the active lesson and prevention rule, repeats recurrence-prevention decisions, and proves unrelated work remains unblocked.

## Evidence

`sera restart-persistence prove` creates a content-addressed evidence package under the isolated proof root with:

- process reports;
- Runtime and installation identities;
- schema version and migration checksums;
- row-count comparisons;
- semantic identity comparisons;
- preflight decisions;
- transfer manifest with byte sizes and hashes;
- relocated-root verification report;
- offline denial report;
- claim-to-proof matrix;
- normalized proof summary;
- model and network use flags.

`sera restart-persistence inspect <proof-root-or-id>` reads an existing proof package without mutating Runtime state.

## Offline Policy

The proof is offline and model-free. Each worker activates a process-level certification guard before Runtime initialization. The guard denies controlled attempts for DNS lookup/resolve, HTTP/HTTPS requests, TCP and TLS sockets, global fetch, model-download requests, and public-URL intake. The proof distinguishes `publicNetworkUse=false` from active public-network denial by recording every denied negative probe.

## Limitations

This milestone is not the final portable Base MVP. It does not implement a downloadable ZIP, installer, update channel, release signing, nontechnical onboarding, machine-wide install, final portable directory, production uninstall, or post-Base behavior. Those remain Milestone 16 or later work.
