# Phase 18 — Local Model Provider v1

## Purpose

Phase 18 turns the Free Core Covenant into an enforceable roadmap rule and adds the first optional local model provider adapter boundary.

The certified path remains subscription-free and local-first. Ollama support is introduced as an optional local adapter slot, but S.E.R.A. does not require Ollama, a downloaded model, an API key, a cloud account, or a paid provider to pass certification.

## What Phase 18 adds

- Free Core Covenant documentation and verification.
- A registered `ollama-local` provider slot beside the deterministic `mock-local` provider.
- Local model readiness evidence under `.sera-models/`.
- CLI commands for local model status and optional local invocation.
- A Phase 18 demo proving the default path works without paid subscriptions or required local model setup.
- Integration tests proving that local model support is optional, local-only, and blocked safely when not configured.

## What Phase 18 does not add

- No required OpenAI, Anthropic, Copilot, Cursor, Replit, hosted vector database, hosted model provider, or paid SaaS dependency.
- No required Ollama install for certification.
- No required local model download for certification.
- No external model calls.
- No automatic model-driven self-modification.
- No change to certified runtime level.

## Certified behavior

The default certified behavior is:

```txt
mock-local provider: available
ollama-local provider: registered, local-only, optional, disabled unless explicitly configured
external-disabled provider: blocked
free-core covenant: enforced
```

## Optional Ollama configuration

Operators may opt into local Ollama manually:

```powershell
$env:SERA_ENABLE_OLLAMA="1"
$env:SERA_OLLAMA_MODEL="gemma4"
$env:SERA_OLLAMA_ENDPOINT="http://127.0.0.1:11434"
npm run sera -- models invoke-ollama gemma4 "Summarize local evidence only."
```

The endpoint must remain localhost or loopback. This opt-in path is not required for certification.

## Validation contract

```bash
npm run free-core:verify
npm run knowledge:verify
npm run phase18:demo
npm run phase18:verify
npm run hygiene
npm run build
npm test
npm run certify
npm run verify
```

Expected results:

```txt
S.E.R.A. free core covenant: PASS through_phase=45
S.E.R.A. knowledge source map: PASS mapped=26
S.E.R.A. phase18 local model provider: PASS
16 test files passed
69 tests passed
S.E.R.A. certify: PASS level=operator-console-v1
```
