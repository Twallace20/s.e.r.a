$ErrorActionPreference = "Stop"

$AutoOps = if ($env:SERA_AUTOOPS_DIR) { $env:SERA_AUTOOPS_DIR } else { "$env:USERPROFILE\OneDrive\SERA-AutoOps" }
$Outbox = Join-Path $AutoOps "15_bridge_outbox"
New-Item -ItemType Directory -Force -Path $Outbox | Out-Null

$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$PromptPath = Join-Path $Outbox "phase116_continuation_loop_smoke_test_request-$Timestamp.md"

@"
You are continuing the S.E.R.A. AutoOps build in this same project conversation.

Create Phase 116 as a minimal continuation-loop smoke-test overlay.

Phase name:
Phase 116 — Continuation Loop Smoke Test v1

Purpose:
Prove that the laptop can use the grounded prompt contract, submit this request into the saved ChatGPT thread, find the expected ZIP in the latest assistant response DOM, download it, and route it into AutoOps.

Strict package requirements:
- ZIP root must be repo/
- Include repo/.overlay/phase116-manifest.json
- Include repo/.sera-proof/phase116/phase116-verify.json
- Include repo/docs/phases/PHASE_116_CONTINUATION_LOOP_SMOKE_TEST_V1.md
- Include repo/scripts/phase116-verify.mjs
- Include repo/s.e.r.a_phase116_continuation_loop_smoke_test_v1_overlay.patch

Implementation requirements:
- Keep Phase 116 safe and minimal.
- It may add documentation and a static verifier only.
- It must not add new browser automation behavior.
- It must not use credentials, tokens, paid services, dependency installs, or GitHub/security settings.
- The patch should add only Phase 116 proof/docs/verify files.

Return a downloadable ZIP named exactly:
s.e.r.a_phase116_continuation_loop_smoke_test_v1_overlay.zip

Also include the SHA256 checksum.
"@ | Set-Content -Path $PromptPath -Encoding UTF8

Write-Host "Wrote Phase 116 continuation-loop smoke-test prompt: $PromptPath"
Get-Content $PromptPath
