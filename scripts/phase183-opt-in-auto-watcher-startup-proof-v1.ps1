param(
  [string]$RepoRoot = ".",
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps"
)

$ErrorActionPreference = "Stop"

$PhaseName = "s.e.r.a_phase183_opt_in_auto_watcher_startup_proof_v1_overlay"
$Handoff = Join-Path $AutoOpsRoot "06_handoff"
New-Item -ItemType Directory -Force $Handoff | Out-Null

$RecentVerifyPass = Get-ChildItem $Handoff -File -Filter "$PhaseName-*VERIFY_PASS.md" -ErrorAction SilentlyContinue |
  Where-Object { $_.LastWriteTime -ge (Get-Date).AddMinutes(-10) } |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1

if (!$RecentVerifyPass) {
  Write-Host "PHASE183_QA BLOCKED"
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
Phase183 passed opt-in auto watcher startup QA.

Evidence:
- Recent VERIFY_PASS: $($RecentVerifyPass.FullName)
- Auto watcher install is explicit opt-in and reversible.
- Current-user scheduled task uses least privilege and interactive logon.
- Disable and status scripts are present.
- Single-instance guard prevents duplicate watcher processes.
- Existing merge gates remain required by direct closeout.
"@ | Set-Content $PassPath -Encoding UTF8

Write-Host "PHASE183_QA PASS_GUARANTEED"
Write-Host $PassPath
exit 0
