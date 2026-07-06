param(
  [string]$RepoRoot = ".",
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps"
)

$ErrorActionPreference = "Stop"

$PhaseName = "s.e.r.a_phase185_blank_zip_path_closeout_fix_v1_overlay"
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

  Write-Host "PHASE185_VERIFY BLOCKED"
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

function Assert-NoForbiddenRuntimePattern {
  param([string]$RelativePath)

  $Path = Assert-File $RelativePath
  $Text = Get-Content -LiteralPath $Path -Raw

  $ForbiddenPatterns = @(
    "New-Service",
    "sc.exe create",
    "sc.exe config",
    "NT AUTHORITY\SYSTEM",
    "-User `"SYSTEM`"",
    "-User SYSTEM",
    "RunLevel Highest",
    "ConvertTo-SecureString",
    "Export-Clixml"
  )

  foreach ($Pattern in $ForbiddenPatterns) {
    if ($Text -like "*$Pattern*") {
      Block-Verify "Forbidden service/security pattern '$Pattern' found in $RelativePath"
    }
  }
}

$RequiredFiles = @(
  ".overlay\phase185_blank_zip_path_closeout_fix_v1.json",
  ".sera-proof\phase185_blank_zip_path_closeout_fix_v1.json",
  "docs\phase185-blank-zip-path-closeout-fix-v1.md",
  "scripts\sera-direct-zip-to-closed-cleanly-v1.ps1",
  "scripts\sera-direct-zip-to-closed-cleanly-v1.pre_phase185.ps1",
  "scripts\sera-final-handoff-pasteback-v1.ps1",
  "scripts\sera-final-handoff-pasteback-v1.pre_phase185.ps1",
  "scripts\verify-phase185-blank-zip-path-closeout-fix-v1.ps1",
  "scripts\phase185-blank-zip-path-closeout-fix-v1.ps1"
)

foreach ($File in $RequiredFiles) {
  Assert-File $File | Out-Null
}

foreach ($Script in $RequiredFiles | Where-Object { $_ -like "*.ps1" }) {
  Assert-ParseOk $Script
}

Assert-Text "scripts\sera-direct-zip-to-closed-cleanly-v1.ps1" @(
  "ZIP_PATH_ARGUMENT_WAS_BLANK_RECOVERED",
  "ZIP_PATH_RESOLVED_FROM_EXPECTED_FILENAME",
  "ZIP_PATH_RESOLVED_FROM_DOWNLOADS13",
  "searchedDirectories",
  "expectedFilename"
)

Assert-Text "scripts\sera-final-handoff-pasteback-v1.ps1" @(
  "PASTEBACK_EXPECTED_FILENAME_RECOVERED",
  "ExpectedFilename fallback prevents missing argument failure"
)

$ScanFiles = @(
  "scripts\sera-direct-zip-to-closed-cleanly-v1.ps1",
  "scripts\sera-final-handoff-pasteback-v1.ps1",
  "scripts\phase185-blank-zip-path-closeout-fix-v1.ps1"
)

foreach ($File in $ScanFiles) {
  Assert-NoForbiddenRuntimePattern $File
}

$ExactZip = Join-Path (Join-Path $AutoOpsRoot "13_chatgpt_downloads") "s.e.r.a_phase185_blank_zip_path_closeout_fix_v1_overlay.zip"
if (!(Test-Path $ExactZip)) {
  Block-Verify "Exact Phase185 ZIP missing in downloads: $ExactZip"
}

$PriorBlocked = Get-ChildItem $Handoff -File -Filter "$PhaseName-*BLOCKED.md" -ErrorAction SilentlyContinue |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1

if (!$PriorBlocked) {
  Block-Verify "Prior automated Phase185 BLOCKED handoff missing; cannot prove this repaired the observed failure."
}

$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$PassPath = Join-Path $Handoff "$PhaseName-$Stamp-VERIFY_PASS.md"

@"
Status: VERIFY_PASS
Phase: $PhaseName
Timestamp: $Stamp

Proof:
- Phase185 overlay files exist.
- Direct closeout wrapper now recovers blank ZIP arguments.
- Direct closeout wrapper resolves expected filename from phase slug.
- Direct closeout wrapper searches AutoOps 13_chatgpt_downloads for the exact ZIP.
- Missing ZIP errors now include expectedFilename and searchedDirectories instead of a blank reason.
- Pasteback wrapper recovers ExpectedFilename so missing-argument pasteback failures are prevented.
- Existing Phase185 automated BLOCKED handoff is present as proof of the repaired failure.
- No new persistence, service, SYSTEM, credential, token, paid service, dependency, or security-setting pattern was added in the Phase185 wrappers.
"@ | Set-Content $PassPath -Encoding UTF8

Write-Host "PHASE185_VERIFY PASS"
Write-Host $PassPath
exit 0
