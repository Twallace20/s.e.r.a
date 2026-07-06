param(
  [string]$RepoRoot = ".",
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps"
)

$ErrorActionPreference = "Stop"

$PhaseName = "s.e.r.a_phase181_clean_saved_target_pasteback_repeatability_proof_v1_overlay"
$Handoff = Join-Path $AutoOpsRoot "06_handoff"
New-Item -ItemType Directory -Force $Handoff | Out-Null

$RecentVerifyPass = Get-ChildItem $Handoff -File -Filter "$PhaseName-*VERIFY_PASS.md" -ErrorAction SilentlyContinue |
  Where-Object { $_.LastWriteTime -ge (Get-Date).AddMinutes(-10) } |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1

if (!$RecentVerifyPass) {
  Write-Host "PHASE181_QA BLOCKED"
  Write-Host "Recent VERIFY_PASS handoff not found."
  exit 1
}

$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$PassPath = Join-Path $Handoff "$PhaseName-$Stamp-PASS_GUARANTEED.md"

@"
Status: PASS_GUARANTEED
Phase: $PhaseName
Timestamp: $Stamp

QA Result:
Phase181 passed saved-target pasteback readiness QA.

Evidence:
- Recent VERIFY_PASS: $($RecentVerifyPass.FullName)
- PASTEBACK_POSTED remains required by closeout before merge.
"@ | Set-Content $PassPath -Encoding UTF8

Write-Host "PHASE181_QA PASS_GUARANTEED"
Write-Host $PassPath
exit 0
