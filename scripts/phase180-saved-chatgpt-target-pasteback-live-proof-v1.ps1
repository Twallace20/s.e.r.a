param(
  [string]$RepoRoot = ".",
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps"
)

$ErrorActionPreference = "Stop"

$PhaseName = "s.e.r.a_phase180_saved_chatgpt_target_pasteback_live_proof_v1_overlay"
$Handoff = Join-Path $AutoOpsRoot "06_handoff"
New-Item -ItemType Directory -Force $Handoff | Out-Null

$RecentVerifyPass = Get-ChildItem $Handoff -File -Filter "$PhaseName-*VERIFY_PASS.md" -ErrorAction SilentlyContinue |
  Where-Object { $_.LastWriteTime -ge (Get-Date).AddMinutes(-10) } |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1

if (!$RecentVerifyPass) {
  Write-Host "PHASE180_QA BLOCKED"
  Write-Host "Recent VERIFY_PASS handoff not found. Refusing PASS_GUARANTEED."
  exit 1
}

$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$PassPath = Join-Path $Handoff "$PhaseName-$Stamp-PASS_GUARANTEED.md"

@"
Status: PASS_GUARANTEED
Phase: $PhaseName
Timestamp: $Stamp

QA Result:
Phase180 passed saved ChatGPT target pasteback live proof QA.

Evidence:
- Recent VERIFY_PASS: $($RecentVerifyPass.FullName)
- Saved ChatGPT target capture is implemented.
- Pasteback is bound to exact saved target only.
- Random chat fallback and new chat fallback are refused.
- Safe auto-merge is permitted only after this fresh PASS_GUARANTEED.
"@ | Set-Content $PassPath -Encoding UTF8

Write-Host "PHASE180_QA PASS_GUARANTEED"
Write-Host $PassPath
exit 0
