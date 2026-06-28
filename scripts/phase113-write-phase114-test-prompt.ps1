$ErrorActionPreference = "Stop"

$AutoOps = if ($env:SERA_AUTOOPS_DIR) { $env:SERA_AUTOOPS_DIR } else { "$env:USERPROFILE\OneDrive\SERA-AutoOps" }
$Outbox = Join-Path $AutoOps "15_bridge_outbox"
New-Item -ItemType Directory -Force -Path $Outbox | Out-Null

$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$PromptPath = Join-Path $Outbox "phase114_bridge_smoke_test_request-$Timestamp.md"

@"
You are continuing the S.E.R.A. AutoOps build in this same project conversation.

Create Phase 114 as a minimal bridge smoke-test overlay.

Phase name:
Phase 114 — ChatGPT Bridge End-to-End Smoke Test v1

Purpose:
Prove Phase 113 can submit this prompt, receive a generated overlay ZIP, download it, and route it into AutoOps.

Strict package requirements:
- The ZIP root must be repo/
- Include repo/.overlay/phase114-manifest.json
- Include repo/.sera-proof/phase114/phase114-verify.json
- Include repo/docs/phases/PHASE_114_CHATGPT_BRIDGE_END_TO_END_SMOKE_TEST_V1.md
- Include repo/scripts/phase114-verify.mjs
- Include repo/s.e.r.a_phase114_chatgpt_bridge_end_to_end_smoke_test_v1_overlay.patch

Implementation requirements:
- Keep Phase 114 safe and minimal.
- It may add documentation and a static verifier only.
- It must not add new browser automation behavior.
- It must not use credentials, tokens, paid services, dependency installs, or GitHub/security settings.
- The patch should add only Phase 114 proof/docs/verify files.

Return a downloadable ZIP named exactly:
s.e.r.a_phase114_chatgpt_bridge_end_to_end_smoke_test_v1_overlay.zip

Also include the SHA256 checksum.
"@ | Set-Content -Path $PromptPath -Encoding UTF8

Write-Host "Wrote Phase 114 bridge smoke-test prompt: $PromptPath"
Get-Content $PromptPath
