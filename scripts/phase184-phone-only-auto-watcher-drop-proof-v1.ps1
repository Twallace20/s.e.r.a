param(
  [string]$RepoRoot = ".",
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps"
)

$ErrorActionPreference = "Stop"

$PhaseName = "s.e.r.a_phase184_phone_only_auto_watcher_drop_proof_v1_overlay"
$Handoff = Join-Path $AutoOpsRoot "06_handoff"
New-Item -ItemType Directory -Force $Handoff | Out-Null

function Block-Qa {
  param([string]$Reason)

  $Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
  $Path = Join-Path $Handoff "$PhaseName-$Stamp-QA_BLOCKED.md"

  @"
Status: BLOCKED
Phase: $PhaseName
Timestamp: $Stamp
Reason: $Reason

Gate result:
PASS_GUARANTEED was not written.
Merge must not run.
"@ | Set-Content $Path -Encoding UTF8

  Write-Host "PHASE184_QA BLOCKED"
  Write-Host $Reason
  exit 1
}

$LatestVerify = Get-ChildItem $Handoff -File -Filter "$PhaseName-*VERIFY_PASS.md" -ErrorAction SilentlyContinue |
  Where-Object { $_.LastWriteTime -ge (Get-Date).AddMinutes(-15) } |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1

if (!$LatestVerify) {
  Block-Qa "Fresh current-phase VERIFY_PASS not found."
}

$RequiredFiles = @(
  "SERA_AUTO_WATCHER_RUNNER.ps1",
  "SERA_ENABLE_AUTO_WATCHER.ps1",
  "SERA_DISABLE_AUTO_WATCHER.ps1",
  "SERA_AUTO_WATCHER_STATUS.ps1",
  "SERA_START_WATCHER_NOW.ps1",
  "scripts\sera-auto-watcher-scheduled-task-v1.ps1",
  "scripts\verify-phase184-phone-only-auto-watcher-drop-proof-v1.ps1"
)

foreach ($File in $RequiredFiles) {
  $Path = Join-Path $RepoRoot $File
  if (!(Test-Path $Path)) {
    Block-Qa "Missing required file: $File"
  }
}

$BridgeOutbox = Join-Path $AutoOpsRoot "15_bridge_outbox"
$Prompt = Get-ChildItem $BridgeOutbox -File -Filter "phase184-*.md" -ErrorAction SilentlyContinue |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1

if (!$Prompt) {
  Block-Qa "Phase184 bridge prompt not found."
}

$Targets = Join-Path $AutoOpsRoot "00_control_center\chatgpt_targets"
$Target = Get-ChildItem $Targets -File -Filter "phase184_phone_only_auto_watcher_drop_proof_v1-saved-chatgpt-target.json" -ErrorAction SilentlyContinue |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1

if (!$Target) {
  Block-Qa "Phase184 saved ChatGPT target not found."
}

$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$PassPath = Join-Path $Handoff "$PhaseName-$Stamp-PASS_GUARANTEED.md"

@"
Status: PASS_GUARANTEED
Phase: $PhaseName
Timestamp: $Stamp

Proof:
- Fresh current-phase VERIFY_PASS exists: $($LatestVerify.FullName)
- Phase184 prompt exists: $($Prompt.FullName)
- Phase184 saved ChatGPT target exists: $($Target.FullName)
- Phase183 auto watcher artifacts are present.
- This PASS_GUARANTEED is current-phase only.
- Merge remains gated by PASTEBACK_POSTED_TEXT_MATCH.
"@ | Set-Content $PassPath -Encoding UTF8

Write-Host "PHASE184_QA PASS_GUARANTEED"
Write-Host $PassPath
exit 0
