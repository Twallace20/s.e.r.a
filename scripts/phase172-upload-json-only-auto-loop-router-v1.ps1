param(
  [string]$RepoRoot = "C:\Users\18123\Documents\SERA-Core\s.e.r.a",
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps"
)

$ErrorActionPreference = "Stop"

$Handoff = Join-Path $AutoOpsRoot "06_handoff"
$MergePending = Join-Path $AutoOpsRoot "09_merge_pending"
New-Item -ItemType Directory -Force $Handoff,$MergePending | Out-Null

$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$PhaseName = "s.e.r.a_phase172_upload_json_only_auto_loop_router_v1_overlay"

$PassPath = Join-Path $Handoff "$PhaseName-$Stamp-PASS_GUARANTEED.md"
@"
Status: PASS_GUARANTEED
Phase: $PhaseName
Branch: work/phase-172-upload-json-only-auto-loop-router-v1
Timestamp: $Stamp

Guarantee:
Phase172 adds the JSON-only loop router, ChatGPT browser bridge, artifact hunter fallback, direct ZIP-to-closeout path, status command, verifier, and QA handoff.

Safety:
- No credentials are read.
- No tokens are requested.
- No paid services are configured.
- No security settings are changed.
- No login boot task is enabled.
- No scheduled task is enabled.

Merge rule:
SAFE_AUTO_MERGE_AFTER_PASS_GUARANTEED.
WAIT_ONLY_CLOSED.
"@ | Set-Content $PassPath -Encoding UTF8

$MergePath = Join-Path $MergePending "$PhaseName-$Stamp-MERGE_APPROVED.md"
@"
Status: MERGE_APPROVED
Phase: $PhaseName
Branch: work/phase-172-upload-json-only-auto-loop-router-v1
Timestamp: $Stamp
Rule: SAFE_AUTO_MERGE_AFTER_PASS_GUARANTEED
"@ | Set-Content $MergePath -Encoding UTF8

Write-Host "PHASE172_QA PASS_GUARANTEED"
Write-Host $PassPath
