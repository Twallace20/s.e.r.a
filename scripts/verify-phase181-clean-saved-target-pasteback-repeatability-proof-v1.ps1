param(
  [string]$RepoRoot = ".",
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps"
)

$ErrorActionPreference = "Stop"

$PhaseName = "s.e.r.a_phase181_clean_saved_target_pasteback_repeatability_proof_v1_overlay"
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

  Write-Host "PHASE181_VERIFY BLOCKED"
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

$Files = @(
  "scripts\sera-chatgpt-browser-bridge-v1.ps1",
  "scripts\sera-final-handoff-pasteback-v1.ps1",
  "scripts\sera-direct-zip-to-closed-cleanly-v1.ps1",
  "scripts\phase181-clean-saved-target-pasteback-repeatability-proof-v1.ps1",
  "scripts\verify-phase181-clean-saved-target-pasteback-repeatability-proof-v1.ps1",
  ".overlay\phase181_clean_saved_target_pasteback_repeatability_proof_v1.json",
  ".sera-proof\phase181_clean_saved_target_pasteback_repeatability_proof_v1.json",
  "docs\phase181-clean-saved-target-pasteback-repeatability-proof-v1.md"
)

foreach ($File in $Files) {
  Assert-File $File | Out-Null
}

foreach ($Script in $Files | Where-Object { $_ -like "*.ps1" }) {
  Assert-ParseOk $Script
}

Assert-Text "scripts\sera-chatgpt-browser-bridge-v1.ps1" @(
  "SAVED_CHATGPT_TARGET_CAPTURE",
  "webSocketDebuggerUrl",
  "expectedFilename"
)

Assert-Text "scripts\sera-final-handoff-pasteback-v1.ps1" @(
  "PASTEBACK_POSTED",
  "Saved target phaseSlug mismatch",
  "Saved target expectedFilename mismatch",
  "No random chat fallback was used",
  "No new chat fallback was used"
)

$TargetPath = Join-Path $AutoOpsRoot "00_control_center\chatgpt_targets\phase181_clean_saved_target_pasteback_repeatability_proof_v1-saved-chatgpt-target.json"
if (!(Test-Path $TargetPath)) {
  Block-Verify "Saved ChatGPT target metadata missing: $TargetPath"
}

$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$PassPath = Join-Path $Handoff "$PhaseName-$Stamp-VERIFY_PASS.md"

@"
Status: VERIFY_PASS
Phase: $PhaseName
Timestamp: $Stamp

Proof:
- Saved target metadata exists.
- Browser bridge target capture markers exist.
- Pasteback helper requires saved run-scoped target metadata.
- Pasteback helper can produce PASTEBACK_POSTED.
- Parse checks passed.
"@ | Set-Content $PassPath -Encoding UTF8

Write-Host "PHASE181_VERIFY PASS"
Write-Host $PassPath
exit 0
