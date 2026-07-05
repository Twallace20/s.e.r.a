param(
  [string]$RepoRoot = "C:\Users\18123\Documents\SERA-Core\s.e.r.a",
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps"
)

$ErrorActionPreference = "Stop"

$Verifier = Join-Path $RepoRoot "scripts\verify-phase173-json-only-full-loop-proof-v1.ps1"
if (!(Test-Path $Verifier)) {
  throw "Phase173 verifier missing: $Verifier"
}

& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $Verifier -RepoRoot $RepoRoot -AutoOpsRoot $AutoOpsRoot
if ($LASTEXITCODE -ne 0) {
  throw "Phase173 verifier failed during QA."
}

$Handoff = Join-Path $AutoOpsRoot "06_handoff"
$MergePending = Join-Path $AutoOpsRoot "09_merge_pending"
New-Item -ItemType Directory -Force $Handoff,$MergePending | Out-Null

$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$PhaseName = "s.e.r.a_phase173_json_only_full_loop_proof_v1_overlay"
$Branch = "work/phase173-json-only-full-loop-proof-v1"

$PassPath = Join-Path $Handoff "$PhaseName-$Stamp-PASS_GUARANTEED.md"
@"
Status: PASS_GUARANTEED
Phase: $PhaseName
Branch: $Branch
Timestamp: $Stamp

Guarantee:
Phase173 proves the JSON-only full loop path and patches the browser artifact hunter so exact expected ZIP matching wins over stale .ps1 fallback artifacts.

Observed pre-fix blocker:
The first Phase173 full-loop attempt returned a stale Phase172 repair script instead of waiting for s.e.r.a_phase173_json_only_full_loop_proof_v1_overlay.zip.

Safety:
- No credentials are read.
- No tokens are requested.
- No paid services are configured.
- No dependency installs are performed.
- No security settings are changed.
- No scheduled task is enabled.
- No login boot persistence is added.

Merge rule:
SAFE_AUTO_MERGE_AFTER_PASS_GUARANTEED.
WAIT_ONLY_CLOSED.
"@ | Set-Content $PassPath -Encoding UTF8

$MergePath = Join-Path $MergePending "$PhaseName-$Stamp-MERGE_APPROVED.md"
@"
Status: MERGE_APPROVED
Phase: $PhaseName
Branch: $Branch
Timestamp: $Stamp
Rule: SAFE_AUTO_MERGE_AFTER_PASS_GUARANTEED
"@ | Set-Content $MergePath -Encoding UTF8

Write-Host "PHASE173_QA PASS_GUARANTEED"
Write-Host $PassPath
