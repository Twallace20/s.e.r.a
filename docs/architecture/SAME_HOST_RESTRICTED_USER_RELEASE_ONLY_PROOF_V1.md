# Same-host restricted-user release-only proof v1

`same-host-restricted-user-release-only-v1` is a governed real-proof profile for one Windows installation and physical host. It separates the development and proof identities with distinct SIDs and requires an active standard-user token that is neither administrator nor a member of Administrators. A new profile, no copied developer profile, and no saved developer credentials are mandatory.

The release lives outside the repository in a path containing spaces. Evidence binds the ZIP, extracted content, bundled runtime, and observed executable with SHA-256 digests. The launcher must explicitly invoke the release-relative runtime. Bare Node, PATH Node, system fallback, development paths, and reparse-point escapes block proof.

Actual denial probes cover the repository root, `.git`, `node_modules`, `.sera`, development SQLite data, the development account's `.codex`, `C:\SERA-SANDBOX`, `C:\dev`, and configured private roots. Every normalized target records expected and actual denial, proof SID, error class, and timestamp. Any read, enumeration, execution, or escape blocks.

The proof environment is constructed from an allowlist and records redacted presence/absence only. Git, npm, npx, system Node, Codex, IDEs, compilers, installs, and restores must not execute. Provider evidence is limited to pre-provisioned loopback Ollama and `llama3.2:1b`; request, response, model, and provider identity are digest-bound. Output remains candidate-only.

Network evidence requires disabled Wi-Fi, Ethernet and relevant VPN adapters (or recorded absence), failed public DNS/TCP/HTTP/HTTPS, and working localhost, Ollama, and Desktop Operator loopback. An adapter restoration manifest is mandatory. Repository implementation and tests never change adapters; real changes require explicit operator approval.

Desktop evidence covers packaged launch, health, text/Markdown, JSON, CSV, opaque PNG preservation, provenance, candidate generation and evaluation, digest-bound operator approval, closeout, evidence, and history. It makes no semantic image or unsupported-media claim. Restart evidence binds shutdown, Windows restart, proof-account sign-in, packaged relaunch, stable installation identity, a new process identity, recovered state/history/artifacts/rules, exact and equivalent prevention, related warnings, and non-blocking out-of-scope behavior.

Evidence is deterministically ordered, path-normalized, sized, SHA-256-bound, and ends in a manifest digest. Synthetic fixtures exercise parsing and negative gates only and grant no claim. Real passing evidence may grant only `RELEASE_INDEPENDENCE_PROVEN` and `CERTIFIED_HOST_PROFILE_PROVEN`. `CROSS_HOST_PORTABILITY_PROVEN` is always denied.

Current certification remains `fresh-process-offline-restart-relocated-root-lesson-persistence-proof-v1`, and Milestone 16 remains incomplete pending real proof.

## Observation-backed evidence v2

Claims are derived only from a closed evidence-bundle directory. The five governed layers are: a development-account preparation manifest with a random session nonce and approved-governance digest; pre-restart Windows observation artifacts; post-restart observation artifacts bound to a different boot identity; an immutable manifest containing collector identity, collector digest, stage, SID, session, nonce, byte size, and SHA-256 for every artifact; and an independent verifier that rereads every file and derives deterministic reason codes. Arbitrary JSON objects are not accepted by the production entrypoint.

The preparation manifest records the canonical repository identity, development SID and state paths, expected proof account, release ZIP and manifest digests, extraction root, bundled collector digests, provider/model identity, network restoration state, host profile, nonce, and governance decision. It explicitly records that restricted-user observations have not yet occurred.

Collection uses explicit trusted Windows executable paths, separate argument arrays, and `shell: false`. Pre/post collection and capture commands refuse unless their required real restricted-account or active-operator environment exists. They make no Windows account, ACL, adapter, or restart change. Process non-use is bounded to: no prohibited development tool observed within the complete monitored proof session and packaged process tree.

Synthetic evidence uses the distinct `synthetic-test-v2` provenance mode. The production verifier requires governed Windows collector identities plus collector files whose SHA-256 values match the preparation/release boundary, the real release ZIP, release manifest, extraction root and runtime on disk, and the exact approved governance-decision digest. Relabeling a fixture cannot grant a claim.

## Threat model

This profile can establish operational release independence, restricted-user separation, source inaccessibility, bundled-runtime use, monitored proof-session behavior, offline execution, local-provider use, restart persistence, and tamper evidence after collection. It does not establish resistance to a malicious administrator controlling the host, kernel, firmware, collectors, or Windows logging; hardware-backed remote attestation; a different physical host; a separate Windows installation; an external clean machine; universal compatibility; or cross-host portability. Those limitations do not weaken the two approved same-host claims.

## Real collector checkpoint v3

Collector code is divided across governed command execution, account/token parsing, filesystem probes, release/runtime observation, process-window recording, allowlisted environment construction, Ollama API observation, adapter/connectivity observation, PNG capture, boot comparison, artifact writing, and manifest finalization. Windows commands use explicit allowlisted executable paths, argument arrays, bounded timeouts, and `shell: false`. Screenshot tests inject PNG bytes; real desktop capture occurs only through an explicit capture command in a valid proof session.

The collection lifecycle is fail-closed. Pre-restart collection observes the active local token before accessing proof resources and refuses the development account, elevation, SID mismatch, enabled Administrators membership, readable development targets, altered runtime, remote Ollama, enabled public adapters, or reachable public endpoints. Post-restart collection refuses unchanged boot identity or missing persisted application evidence. Neither collector changes accounts, ACLs, groups, adapters, models, or restart state.

This collector checkpoint does not itself complete Milestone 16. A checkpoint review must still confirm that the monitored process-event source spans the entire packaged workflow and that the exact executing collector is the release-contained collector whose digest is recorded in the preparation and final manifests before a real proof is authorized.
## V4 live monitor and release-contained collector binding

The portable release now contains `collectors/restricted-user-collector.cjs` and
`collectors/process-start-monitor.ps1`; both are size/digest records in the release
manifest and are pinned again by preparation evidence. The collector refuses a
repository path, verifies real-path containment and digests, and runs only through
the bundled `runtime/node.exe`.

Real proof mode starts `Win32_ProcessStartTrace` before the workflow-ready marker,
records the subscription handshake, enriches each process-start event, and flushes
before the completion marker. Subscription denial, interruption, incomplete flush,
identity mismatch, prohibited development tooling, or any release/provenance mismatch
is blocking. The development smoke may use a clearly labelled polling fallback, but
that source has `liveSubscription=false`, grants no claims, and can never satisfy the
real-proof verifier.

The current development host denied the WMI process-start subscription. This is an
observed environmental blocker, so no production readiness or Milestone 16 completion
is claimed from the smoke run.

## V5 privileged observer sidecar

The certified profile remains `same-host-restricted-user-release-only-v1`, with the
`privileged-observer-sidecar-v1` observation boundary. The standard subject runs the
packaged workflow without elevation or Performance Log Users membership. A different
operator SID manually launches the digest-pinned `privileged-observer.cjs` through the
bundled runtime from an already-elevated console. The repository emits a launch plan;
it never elevates, accepts credentials, or writes promotable observer evidence.

The observer verifies runtime, observer, monitor, release, preparation, session, nonce,
host profile, and subject SID before subscribing. It records token identity and starts
the static `Win32_ProcessStartTrace` monitor. Subscription errors produce a failure
record containing classification, exception type, HRESULT, subscription/handshake
state, stderr location, exit status when available, and timestamps. Polling and injected
events are prohibited in real mode.

Observer raw spool, normalized observer records, subject evidence, and verifier output
are separate. The generated ACL plan grants the subject release read and subject-root
write access, restricts observer-spool mutation to Administrators, explicitly denies
subject writes, and includes rollback commands. It is plan-only in this milestone.

### Manual restart sequence

1. Finish the pre-restart subject workflow and stop packaged S.E.R.A.
2. Stop, flush, and finalize the pre-restart observer.
3. Restart Windows manually.
4. Sign into the operator account and manually launch the same observer elevated.
5. Confirm its new ready record, then switch to the standard subject account.
6. Run packaged post-restart recovery and recurrence checks.
7. Stop and finalize the post-restart observer, then independently verify both roots.

The two observer records require one session, nonce, release, host profile, and subject
SID; different boot identities and observer PIDs; and correctly ordered stop/readiness
timestamps. The observer is not expected to survive restart and has no application,
approval, promotion, certification, closeout, merge, or tag authority.
