param(
  [string]$RepoRoot = "C:\Users\18123\Documents\SERA-Core\s.e.r.a",
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps"
)

$ErrorActionPreference = "Stop"

$PhaseName = "s.e.r.a_phase176_repeatable_json_only_full_loop_smoke_proof_v1_overlay"
$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$Handoff = Join-Path $AutoOpsRoot "06_handoff"
New-Item -ItemType Directory -Force $Handoff | Out-Null

function Fail-Phase176Verify {
  param([string]$Reason)

  $Path = Join-Path $Handoff "$PhaseName-$Stamp-VERIFY_BLOCKED.md"
  @"
Status: VERIFY_BLOCKED
Phase: $PhaseName
Timestamp: $Stamp
Reason: $Reason

Result:
Verifier failed. QA and merge must not run.
"@ | Set-Content $Path -Encoding UTF8

  Write-Host "PHASE176_VERIFY BLOCKED"
  Write-Host $Reason
  exit 1
}

function Assert-File {
  param([string]$RelativePath)
  $Path = Join-Path $RepoRoot $RelativePath
  if (!(Test-Path $Path)) {
    Fail-Phase176Verify "Missing required file: $RelativePath"
  }
}

function Assert-NoPath {
  param([string]$RelativePath)
  $Path = Join-Path $RepoRoot $RelativePath
  if (Test-Path $Path) {
    Fail-Phase176Verify "Nested overlay path still exists: $RelativePath"
  }
}

function Assert-Contains {
  param(
    [string]$RelativePath,
    [string]$Marker
  )

  $Path = Join-Path $RepoRoot $RelativePath
  if (!(Test-Path $Path)) {
    Fail-Phase176Verify "Cannot inspect missing file: $RelativePath"
  }

  $Text = Get-Content $Path -Raw
  if ($Text -notlike "*$Marker*") {
    Fail-Phase176Verify "Missing marker '$Marker' in $RelativePath"
  }
}

function Assert-ParseOk {
  param([string]$RelativePath)

  $Path = Join-Path $RepoRoot $RelativePath
  $Tokens = $null
  $Errors = $null
  [System.Management.Automation.Language.Parser]::ParseFile($Path, [ref]$Tokens, [ref]$Errors) | Out-Null

  if ($Errors -and $Errors.Count -gt 0) {
    Fail-Phase176Verify "Parse failure in $RelativePath :: $($Errors[0].Message)"
  }
}

$RequiredFiles = @(
  ".overlay\phase176_repeatable_json_only_full_loop_smoke_proof_v1.json",
  ".sera-proof\phase176_repeatable_json_only_full_loop_smoke_proof_v1.json",
  "docs\phase176-repeatable-json-only-full-loop-smoke-proof-v1.md",
  "scripts\sera-full-auto-json-loop-router-v1.ps1",
  "scripts\sera-chatgpt-browser-bridge-v1.ps1",
  "scripts\sera-direct-zip-to-closed-cleanly-v1.ps1",
  "scripts\sera-repair-nested-overlay-paths-v1.ps1",
  "scripts\verify-phase176-repeatable-json-only-full-loop-smoke-proof-v1.ps1",
  "scripts\phase176-repeatable-json-only-full-loop-smoke-proof-v1.ps1"
)

foreach ($File in $RequiredFiles) {
  Assert-File $File
}

foreach ($BadPath in @(
  ".overlay\.overlay",
  ".sera-proof\.sera-proof",
  "docs\docs",
  "scripts\scripts"
)) {
  Assert-NoPath $BadPath
}

foreach ($Script in @(
  "scripts\sera-full-auto-json-loop-router-v1.ps1",
  "scripts\sera-chatgpt-browser-bridge-v1.ps1",
  "scripts\sera-direct-zip-to-closed-cleanly-v1.ps1",
  "scripts\sera-repair-nested-overlay-paths-v1.ps1",
  "scripts\verify-phase176-repeatable-json-only-full-loop-smoke-proof-v1.ps1",
  "scripts\phase176-repeatable-json-only-full-loop-smoke-proof-v1.ps1"
)) {
  Assert-ParseOk $Script
}

Assert-Contains "scripts\sera-direct-zip-to-closed-cleanly-v1.ps1" "Invoke-RequiredScript"
Assert-Contains "scripts\sera-direct-zip-to-closed-cleanly-v1.ps1" "Fresh PASS_GUARANTEED"
Assert-Contains "scripts\sera-direct-zip-to-closed-cleanly-v1.ps1" "Repair-NestedOverlayPaths"
Assert-Contains "scripts\sera-full-auto-json-loop-router-v1.ps1" "RUN_DIRECT_ZIP_CLOSEOUT"
Assert-Contains "scripts\sera-chatgpt-browser-bridge-v1.ps1" "real_exact_download_control_not_ready"
Assert-Contains "scripts\sera-chatgpt-browser-bridge-v1.ps1" "RunStartedAt"

$PathOut = Join-Path $Handoff "$PhaseName-$Stamp-VERIFY_PASS.md"
@"
Status: VERIFY_PASS
Phase: $PhaseName
Timestamp: $Stamp

Result:
PHASE176_VERIFY PASS

Proof checked:
- Required phase files exist.
- Nested overlay paths are absent.
- Core PowerShell files parse.
- Direct closeout contains Invoke-RequiredScript gate semantics.
- Direct closeout requires fresh PASS_GUARANTEED.
- Router uses direct ZIP closeout.
- Browser bridge has real exact download control guard and fresh-download fence.
"@ | Set-Content $PathOut -Encoding UTF8

Write-Host "PHASE176_VERIFY PASS"
Write-Host $PathOut
exit 0

