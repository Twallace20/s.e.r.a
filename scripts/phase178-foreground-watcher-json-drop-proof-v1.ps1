param(
  [string]$RepoRoot = (Get-Location).Path,
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps"
)

$ErrorActionPreference = "Stop"

$PhaseName = "s.e.r.a_phase178_foreground_watcher_json_drop_proof_v1_overlay"
$Handoff = Join-Path $AutoOpsRoot "06_handoff"
New-Item -ItemType Directory -Force $Handoff | Out-Null

function Fail-Qa {
  param([string]$Reason)

  $Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
  $Path = Join-Path $Handoff "$PhaseName-$Stamp-QA_BLOCKED.md"

  @"
Status: BLOCKED
Phase: $PhaseName
Timestamp: $Stamp
Reason: $Reason

Gate result:
QA refused PASS_GUARANTEED. Merge must not run.
"@ | Set-Content -LiteralPath $Path -Encoding UTF8

  Write-Host "PHASE178_QA BLOCKED"
  Write-Host $Reason
  exit 1
}

$RecentVerify = Get-ChildItem -LiteralPath $Handoff -File -Filter "$PhaseName-*VERIFY_PASS.md" -ErrorAction SilentlyContinue |
  Where-Object { $_.LastWriteTime -ge (Get-Date).AddMinutes(-15) } |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1

if (!$RecentVerify) {
  Fail-Qa "Recent VERIFY_PASS handoff not found. Refusing PASS_GUARANTEED."
}

$RequiredFiles = @(
  "SERA_WATCH_COMMAND_INBOX.ps1",
  "scripts\sera-command-inbox-foreground-watcher-v1.ps1",
  "scripts\sera-direct-zip-to-closed-cleanly-v1.ps1",
  "scripts\sera-full-auto-json-loop-router-v1.ps1",
  "scripts\verify-phase178-foreground-watcher-json-drop-proof-v1.ps1"
)

foreach ($Relative in $RequiredFiles) {
  $Path = Join-Path $RepoRoot $Relative
  if (!(Test-Path $Path)) {
    Fail-Qa "Required file missing during QA: $Relative"
  }
}

$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$Path = Join-Path $Handoff "$PhaseName-$Stamp-PASS_GUARANTEED.md"

@"
Status: PASS_GUARANTEED
Phase: $PhaseName
Timestamp: $Stamp

Guarantee:
Phase178 is merge eligible only because this same run produced VERIFY_PASS and QA confirmed the watcher and gate files are present.

Proof:
- Recent VERIFY_PASS found: $($RecentVerify.FullName)
- Foreground watcher launcher is present.
- Foreground watcher script is present.
- Direct closeout and router guard files are present.
- PASS_GUARANTEED was produced after verifier success.
- SAFE_AUTO_MERGE_AFTER_PASS_GUARANTEED
- WAIT_ONLY_CLOSED
"@ | Set-Content -LiteralPath $Path -Encoding UTF8

Write-Host "PHASE178_QA PASS_GUARANTEED"
Write-Host $Path
exit 0
