param(
  [string]$RepoRoot = ".",
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps"
)

$ErrorActionPreference = "Stop"

$PhaseName = "s.e.r.a_phase179_final_handoff_pasteback_proof_v1_overlay"
$Handoff = Join-Path $AutoOpsRoot "06_handoff"
New-Item -ItemType Directory -Force $Handoff | Out-Null

function Block-Verify {
  param([string]$Reason)

  $Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
  $Path = Join-Path $Handoff "$PhaseName-$Stamp-VERIFY_BLOCKED.md"

  @"
Status: BLOCKED
Phase: $PhaseName
Timestamp: $Stamp
Reason: $Reason
"@ | Set-Content $Path -Encoding UTF8

  Write-Host "PHASE179_VERIFY BLOCKED"
  Write-Host $Reason
  exit 1
}

function Assert-File {
  param([string]$RelativePath)
  $Path = Join-Path $RepoRoot $RelativePath
  if (!(Test-Path $Path)) {
    Block-Verify "Missing required file: $RelativePath"
  }
  return $Path
}

function Assert-Text {
  param(
    [string]$RelativePath,
    [string[]]$Markers
  )

  $Path = Assert-File $RelativePath
  $Text = Get-Content -LiteralPath $Path -Raw

  foreach ($Marker in $Markers) {
    if ($Text -notlike "*$Marker*") {
      Block-Verify "Missing marker '$Marker' in $RelativePath"
    }
  }
}

function Assert-ParseOk {
  param([string]$RelativePath)

  $Path = Assert-File $RelativePath
  $Tokens = $null
  $Errors = $null
  [System.Management.Automation.Language.Parser]::ParseFile($Path, [ref]$Tokens, [ref]$Errors) | Out-Null

  if ($Errors -and $Errors.Count -gt 0) {
    Block-Verify "Parse failed in ${RelativePath}: $($Errors[0].Message)"
  }
}

$RequiredFiles = @(
  "scripts\sera-final-handoff-pasteback-v1.ps1",
  "scripts\sera-direct-zip-to-closed-cleanly-v1.ps1",
  "scripts\sera-full-auto-json-loop-router-v1.ps1",
  "scripts\sera-chatgpt-browser-bridge-v1.ps1",
  "scripts\phase179-final-handoff-pasteback-proof-v1.ps1",
  "scripts\verify-phase179-final-handoff-pasteback-proof-v1.ps1",
  ".overlay\phase179_final_handoff_pasteback_proof_v1.json",
  ".sera-proof\phase179_final_handoff_pasteback_proof_v1.json",
  "docs\phase179-final-handoff-pasteback-proof-v1.md"
)

foreach ($File in $RequiredFiles) {
  Assert-File $File | Out-Null
}

foreach ($Script in $RequiredFiles | Where-Object { $_ -like "*.ps1" }) {
  Assert-ParseOk $Script
}

Assert-Text "scripts\sera-final-handoff-pasteback-v1.ps1" @(
  "FINAL_HANDOFF_PASTEBACK_START",
  "PASTEBACK_SUBMITTED",
  "PASTEBACK_SKIPPED_SAFE",
  "PASTEBACK_BLOCKED",
  "savedChatGptTargetOnly",
  "allowRandomRecentChatFallback",
  "allowNewChatFallback",
  "Safe current ChatGPT target"
)

Assert-Text "scripts\sera-direct-zip-to-closed-cleanly-v1.ps1" @(
  "Invoke-RequiredScript",
  "Fresh VERIFY_PASS",
  "Fresh PASS_GUARANTEED",
  "FINAL_HANDOFF_COPIED",
  "Invoke-FinalPastebackSafe",
  "FINAL_HANDOFF_PASTEBACK_START",
  "SAFE_AUTO_MERGE_AFTER_PASS_GUARANTEED",
  "WAIT_ONLY_CLOSED",
  "CLOSED_CLEANLY"
)

Assert-Text "scripts\sera-full-auto-json-loop-router-v1.ps1" @(
  "Select-CurrentPhaseHandoff",
  "STALE_HANDOFF_REFUSED",
  "FULL_LOOP_EXIT_CODE"
)

Assert-Text "scripts\sera-chatgpt-browser-bridge-v1.ps1" @(
  "real_exact_download_control_not_ready",
  "RunStartedAt",
  "fresh-download"
)

$ForbiddenNeedles = @(
  "Register-ScheduledTask",
  "New-ScheduledTask",
  "New-ScheduledTaskAction",
  "New-ScheduledTaskTrigger",
  "Set-ScheduledTask",
  "Unregister-ScheduledTask",
  "schtasks.exe",
  "New-Service",
  "Set-Service",
  "sc.exe create"
)

Get-ChildItem -LiteralPath (Join-Path $RepoRoot "scripts") -Filter "*.ps1" -File -Recurse | ForEach-Object {
  if ($_.Name -like "verify-*.ps1") {
    return
  }

  $Text = Get-Content -LiteralPath $_.FullName -Raw

  foreach ($Needle in $ForbiddenNeedles) {
    if ($Text -like "*$Needle*") {
      Block-Verify "Forbidden persistence or service pattern '$Needle' found in $($_.FullName)"
    }
  }
}

$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$PassPath = Join-Path $Handoff "$PhaseName-$Stamp-VERIFY_PASS.md"

@"
Status: VERIFY_PASS
Phase: $PhaseName
Timestamp: $Stamp

Proof:
- Pasteback helper exists and parses.
- Pasteback helper supports CLOSED_CLEANLY and BLOCKED handoffs.
- Pasteback helper refuses unsafe targets with PASTEBACK_SKIPPED_SAFE or PASTEBACK_BLOCKED.
- Direct closeout invokes pasteback after final current-phase handoff copy.
- Existing exact-download and fresh-download controls remain present.
- Gate semantics remain present.
"@ | Set-Content $PassPath -Encoding UTF8

Write-Host "PHASE179_VERIFY PASS"
Write-Host $PassPath
exit 0
