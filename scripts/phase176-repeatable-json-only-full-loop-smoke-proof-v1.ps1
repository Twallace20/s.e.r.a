param(
  [string]$RepoRoot = "C:\Users\18123\Documents\SERA-Core\s.e.r.a",
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps"
)

$ErrorActionPreference = "Stop"

$PhaseName = "s.e.r.a_phase176_repeatable_json_only_full_loop_smoke_proof_v1_overlay"
$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$Handoff = Join-Path $AutoOpsRoot "06_handoff"
New-Item -ItemType Directory -Force $Handoff | Out-Null

function Fail-Phase176Qa {
  param([string]$Reason)

  $Path = Join-Path $Handoff "$PhaseName-$Stamp-QA_BLOCKED.md"
  @"
Status: QA_BLOCKED
Phase: $PhaseName
Timestamp: $Stamp
Reason: $Reason

Result:
QA failed. Merge must not run.
"@ | Set-Content $Path -Encoding UTF8

  Write-Host "PHASE176_QA BLOCKED"
  Write-Host $Reason
  exit 1
}

$RecentVerify = Get-ChildItem $Handoff -File -Filter "$PhaseName-*VERIFY_PASS.md" -ErrorAction SilentlyContinue |
  Where-Object { $_.LastWriteTime -ge (Get-Date).AddMinutes(-10) } |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1

if (!$RecentVerify) {
  Fail-Phase176Qa "Recent VERIFY_PASS handoff not found. Refusing PASS_GUARANTEED."
}

$DirectCloseout = Join-Path $RepoRoot "scripts\sera-direct-zip-to-closed-cleanly-v1.ps1"
$Router = Join-Path $RepoRoot "scripts\sera-full-auto-json-loop-router-v1.ps1"
$Bridge = Join-Path $RepoRoot "scripts\sera-chatgpt-browser-bridge-v1.ps1"

foreach ($Path in @($DirectCloseout, $Router, $Bridge)) {
  if (!(Test-Path $Path)) {
    Fail-Phase176Qa "Required core script missing: $Path"
  }
}

$DirectText = Get-Content $DirectCloseout -Raw
$RouterText = Get-Content $Router -Raw
$BridgeText = Get-Content $Bridge -Raw

foreach ($Marker in @("Invoke-RequiredScript", "Fresh PASS_GUARANTEED", "Repair-NestedOverlayPaths")) {
  if ($DirectText -notlike "*$Marker*") {
    Fail-Phase176Qa "Direct closeout marker missing: $Marker"
  }
}

if ($RouterText -notlike "*RUN_DIRECT_ZIP_CLOSEOUT*") {
  Fail-Phase176Qa "Router is missing RUN_DIRECT_ZIP_CLOSEOUT marker."
}

if ($BridgeText -notlike "*real_exact_download_control_not_ready*" -or $BridgeText -notlike "*RunStartedAt*") {
  Fail-Phase176Qa "Bridge is missing exact real download control or fresh-download fence markers."
}

$PassPath = Join-Path $Handoff "$PhaseName-$Stamp-PASS_GUARANTEED.md"
@"
Status: PASS_GUARANTEED
Phase: $PhaseName
Timestamp: $Stamp
Verifier: $($RecentVerify.FullName)

Result:
PHASE176_QA PASS_GUARANTEED

Guarantee:
- Verifier passed before QA.
- QA checked core full-loop gate markers.
- Fresh PASS_GUARANTEED was generated in this run.
- SAFE_AUTO_MERGE_AFTER_PASS_GUARANTEED.
- WAIT_ONLY_CLOSED.
- CLOSED_CLEANLY may be written only after safe merge/tag/push/cleanup.
"@ | Set-Content $PassPath -Encoding UTF8

Write-Host "PHASE176_QA PASS_GUARANTEED"
Write-Host $PassPath
exit 0

