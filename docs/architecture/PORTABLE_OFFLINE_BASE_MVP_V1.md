# Portable Offline Base MVP v1

Milestone 16 owns the final Base MVP claim gate.

Implemented repository-side contract:

- `sera base-mvp status`
- `sera base-mvp policy`
- `sera base-mvp claims`
- `sera base-mvp build`
- `sera base-mvp verify <release-root-or-zip>`
- `sera base-mvp prove [--clean-evidence <path>] [--model <model-id>]`
- `sera base-mvp inspect <proof-root>`
- `sera base-mvp restricted-user policy|prepare|inspect|prove|verify|restore-network|cleanup`
- `sera base-mvp restricted-user collect-pre-restart|capture|collect-post-restart`

The default proof uses isolated temporary runtime state and does not depend on the live repository operational database. It builds `s.e.r.a_base_mvp_v1_windows_x64.zip`, verifies release evidence, ingests bounded fixture knowledge, and can invoke an installed local Ollama model through the governed Local Model Runtime.

The proof remains blocked until separate clean-environment evidence exists. That external proof must show the packaged candidate launching offline on Windows without Git, npm, Codex, ChatGPT, source checkout, or manually typed development commands.

Reserved release tag name: `base-mvp-v1`. Do not create the tag before the clean-environment proof and final owner review.

The governed `same-host-restricted-user-release-only-v1` profile supports a real proof on the development PC under a fresh standard local user with a distinct SID, denied development-root access, a sanitized environment, release-contained Node, pre-provisioned loopback Ollama `llama3.2:1b`, environment-level public-network denial, Desktop Operator visual evidence, and Windows restart evidence. Preparation and restoration surfaces emit guarded plans; they do not create accounts, change ACLs, or alter adapters.

Passing real evidence can establish `RELEASE_INDEPENDENCE_PROVEN` and `CERTIFIED_HOST_PROFILE_PROVEN` for that host profile. It cannot establish `CROSS_HOST_PORTABILITY_PROVEN`, a different physical computer, a separate Windows installation, universal Windows compatibility, or an external clean-machine tier. PDF, DOCX, XLSX, PPTX, semantic-image, audio, and video claims remain unsupported. The stronger external clean-machine tier remains future work.

Current certification remains `fresh-process-offline-restart-relocated-root-lesson-persistence-proof-v1`. Milestone 16 remains incomplete until real, non-fixture restricted-user evidence passes operator review.

Restricted-user v2 consumes a closed on-disk observation bundle; it does not accept a caller-constructed proof object. A verified restricted-user bundle may be supplied to `base-mvp prove --restricted-evidence <root>`. Synthetic mode is structurally testable but non-promotable.
