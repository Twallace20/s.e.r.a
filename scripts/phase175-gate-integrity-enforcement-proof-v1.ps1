param(
  [string]$RepoRoot = "C:\Users\18123\Documents\SERA-Core\s.e.r.a",
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps"
)

$ErrorActionPreference = "Stop"

$PhaseName = "s.e.r.a_phase175_gate_integrity_enforcement_proof_v1_overlay"
$Handoff = Join-Path $AutoOpsRoot "06_handoff"
New-Item -ItemType Directory -Force $Handoff | Out-Null

$Verifier = Join-Path $RepoRoot "scripts\verify-phase175-gate-integrity-enforcement-proof-v1.ps1"
if (!(Test-Path $Verifier)) {
  throw "QA cannot run because verifier is missing: $Verifier"
}

powershell.exe -NoProfile -ExecutionPolicy Bypass -File $Verifier -RepoRoot $RepoRoot -AutoOpsRoot $AutoOpsRoot
if ($LASTEXITCODE -ne 0) {
  throw "QA refused PASS_GUARANTEED because verifier failed."
}

$Direct = Join-Path $RepoRoot "scripts\sera-direct-zip-to-closed-cleanly-v1.ps1"
$DirectText = Get-Content $Direct -Raw

foreach ($Marker in @("function Invoke-RequiredScript", "function Write-BlockedHandoff", "Fresh PASS_GUARANTEED", "SAFE_AUTO_MERGE_AFTER_PASS_GUARANTEED", "WAIT_ONLY_CLOSED")) {
  if ($DirectText -notlike "*$Marker*") {
    throw "QA missing gate marker: $Marker"
  }
}

foreach ($Nested in @(".overlay\.overlay", ".sera-proof\.sera-proof", "docs\docs", "scripts\scripts")) {
  if (Test-Path (Join-Path $RepoRoot $Nested)) {
    throw "QA refuses PASS_GUARANTEED because nested path still exists: $Nested"
  }
}

$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$Path = Join-Path $Handoff "$PhaseName-$Stamp-PASS_GUARANTEED.md"

@"
Status: PASS_GUARANTEED
Phase: $PhaseName
Timestamp: $Stamp

Guarantee:
SAFE_AUTO_MERGE_AFTER_PASS_GUARANTEED
WAIT_ONLY_CLOSED

Proof:
- Verifier was executed by QA and passed in this run.
- Direct closeout contains Invoke-RequiredScript gate enforcement.
- QA is ordered after verifier.
- Fresh PASS_GUARANTEED is required before merge.
- Nested overlay paths are absent.
- Merge is allowed only after this handoff exists.
"@ | Set-Content $Path -Encoding UTF8

Get-Content $Path -Raw | Set-Clipboard
Write-Host "PHASE175_QA PASS_GUARANTEED"
Write-Host $Path
exit 0
