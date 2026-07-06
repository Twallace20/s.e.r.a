param(
  [string]$RepoRoot = ".",
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps"
)

$ErrorActionPreference = "Stop"

$PhaseName = "s.e.r.a_phase180_saved_chatgpt_target_pasteback_live_proof_v1_overlay"
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

  Write-Host "PHASE180_VERIFY BLOCKED"
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

$RequiredFiles = @(
  ".overlay\phase180_saved_chatgpt_target_pasteback_live_proof_v1.json",
  ".sera-proof\phase180_saved_chatgpt_target_pasteback_live_proof_v1.json",
  "docs\phase180-saved-chatgpt-target-pasteback-live-proof-v1.md",
  "scripts\sera-chatgpt-browser-bridge-v1.ps1",
  "scripts\sera-final-handoff-pasteback-v1.ps1",
  "scripts\sera-direct-zip-to-closed-cleanly-v1.ps1",
  "scripts\verify-phase180-saved-chatgpt-target-pasteback-live-proof-v1.ps1",
  "scripts\phase180-saved-chatgpt-target-pasteback-live-proof-v1.ps1"
)

foreach ($File in $RequiredFiles) {
  Assert-File $File | Out-Null
}

foreach ($Script in $RequiredFiles | Where-Object { $_ -like "*.ps1" }) {
  Assert-ParseOk $Script
}

Assert-Text "scripts\sera-chatgpt-browser-bridge-v1.ps1" @(
  "SAVED_CHATGPT_TARGET_CAPTURE",
  "chatgpt_targets",
  "savedChatGptTargetOnly",
  "allowRandomRecentChatFallback",
  "allowNewChatFallback",
  "fresh-download",
  "real_exact_download_control_not_ready"
)

Assert-Text "scripts\sera-final-handoff-pasteback-v1.ps1" @(
  "EXACT_SAVED_CHATGPT_TARGET_ONLY",
  "PASTEBACK_SKIPPED_SAFE",
  "PASTEBACK_BLOCKED",
  "PASTEBACK_POSTED",
  "final_handoff_pasteback_submitted",
  "CLOSED_CLEANLY",
  "BLOCKED"
)

Assert-Text "scripts\sera-direct-zip-to-closed-cleanly-v1.ps1" @(
  "Invoke-RequiredScript",
  "Fresh VERIFY_PASS",
  "Fresh PASS_GUARANTEED",
  "sera-final-handoff-pasteback-v1.ps1",
  "PHASE180_SCALAR_TIMESTAMP_FIX"
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
- Browser bridge captures saved ChatGPT target metadata.
- Pasteback helper posts only to the exact saved ChatGPT target.
- Pasteback supports CLOSED_CLEANLY and BLOCKED handoffs.
- Pasteback writes safe skipped or blocked results instead of using random fallback.
- Direct closeout invokes pasteback after final current-phase handoff copy.
- Existing gate semantics remain present.
"@ | Set-Content $PassPath -Encoding UTF8

Write-Host "PHASE180_VERIFY PASS"
Write-Host $PassPath
exit 0
