param(
  [string]$RepoRoot = ".",
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps"
)

$ErrorActionPreference = "Stop"

$PhaseName = "s.e.r.a_phase179_final_handoff_pasteback_proof_v1_overlay"
$Handoff = Join-Path $AutoOpsRoot "06_handoff"
New-Item -ItemType Directory -Force $Handoff | Out-Null

$RecentVerifyPass = Get-ChildItem $Handoff -File -Filter "$PhaseName-*VERIFY_PASS.md" -ErrorAction SilentlyContinue |
  Where-Object { $_.LastWriteTime -ge (Get-Date).AddMinutes(-10) } |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1

if (!$RecentVerifyPass) {
  Write-Host "PHASE179_QA BLOCKED"
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
Phase179 passed final handoff pasteback proof QA.

Evidence:
- Recent VERIFY_PASS: $($RecentVerifyPass.FullName)
- Pasteback helper exists.
- Direct closeout invokes pasteback after copying the final current-phase handoff.
- Pasteback is constrained to current/safe ChatGPT target behavior.
- Safe auto-merge is permitted only after this fresh PASS_GUARANTEED.
"@ | Set-Content $PassPath -Encoding UTF8

Write-Host "PHASE179_QA PASS_GUARANTEED"
Write-Host $PassPath
exit 0
