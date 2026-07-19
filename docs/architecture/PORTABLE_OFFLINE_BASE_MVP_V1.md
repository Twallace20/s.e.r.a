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

The default proof uses isolated temporary runtime state and does not depend on the live repository operational database. It builds `s.e.r.a_base_mvp_v1_windows_x64.zip`, verifies release evidence, ingests bounded fixture knowledge, and can invoke an installed local Ollama model through the governed Local Model Runtime.

The proof remains blocked until separate clean-environment evidence exists. That external proof must show the packaged candidate launching offline on Windows without Git, npm, Codex, ChatGPT, source checkout, or manually typed development commands.

Reserved release tag name: `base-mvp-v1`. Do not create the tag before the clean-environment proof and final owner review.
