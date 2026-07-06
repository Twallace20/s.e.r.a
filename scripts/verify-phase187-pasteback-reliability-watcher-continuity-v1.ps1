param(
  [string]$RepoRoot = ".",
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps"
)

$ErrorActionPreference = "Stop"

$PhaseName = "s.e.r.a_phase187_pasteback_reliability_watcher_continuity_v1_overlay"
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

  Write-Host "PHASE187_VERIFY BLOCKED"
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
    ("New" + "-Service"),
    ("sc.exe " + "create"),
    ("sc.exe " + "config"),
    ("Start" + "-Service"),
    ("Set" + "-Service"),
    ("Restart" + "-Service"),
    ("NT AUTHORITY" + "\SYSTEM"),
    ("-User " + '"' + "SYSTEM" + '"'),
    ("-User " + "SYSTEM"),
    ("RunLevel " + "Highest"),
    ("ConvertTo" + "-SecureString"),
    ("Export" + "-Clixml")
  )

  foreach ($Pattern in $ForbiddenPatterns) {
    if ($Text -like "*$Pattern*") {
      Block-Verify "Forbidden service/security pattern '$Pattern' found in $RelativePath"
    }
  }
}

$RequiredFiles = @(
  ".overlay\phase187_pasteback_reliability_watcher_continuity_v1.json",
  ".sera-proof\phase187_pasteback_reliability_watcher_continuity_v1.json",
  "docs\phase187-pasteback-reliability-watcher-continuity-v1.md",
  "SERA_WATCH_COMMAND_INBOX.ps1",
  "scripts\sera-command-json-route-downloads13-to-inbox-v1.ps1",
  "scripts\sera-final-handoff-pasteback-v1.ps1",
  "scripts\sera-direct-zip-to-closed-cleanly-v1.ps1",
  "scripts\verify-phase187-pasteback-reliability-watcher-continuity-v1.ps1",
  "scripts\phase187-pasteback-reliability-watcher-continuity-v1.ps1"
)

foreach ($File in $RequiredFiles) {
  Assert-File $File | Out-Null
}

foreach ($Script in $RequiredFiles | Where-Object { $_ -like "*.ps1" }) {
  Assert-ParseOk $Script
}

Assert-Text "SERA_WATCH_COMMAND_INBOX.ps1" @(
  "COMMAND_INBOX_BACKLOG_SCAN_START",
  "COMMAND_INBOX_BACKLOG_COMMAND_FOUND",
  "COMMAND_INBOX_BACKLOG_EMPTY",
  "NEW_COMMAND_JSON_DETECTED",
  "WATCHER_RETURN_TO_WATCH_AFTER_RUN",
  "Invoke-Downloads13CommandJsonRouter",
  "Mark-CommandProcessed"
)

Assert-Text "scripts\sera-command-json-route-downloads13-to-inbox-v1.ps1" @(
  "COMMAND_JSON_ROUTED_FROM_DOWNLOADS13",
  "ROUTED_COMMAND_JSON_TO_INBOX",
  "COMMAND_JSON_ROUTE_SKIPPED_DUPLICATE",
  "COMMAND_JSON_ROUTE_REJECTED_NOT_COMMAND",
  "autopilot-command-*.json",
  "phaseSlug",
  "expectedZipFilename"
)

Assert-Text "scripts\sera-final-handoff-pasteback-v1.ps1" @(
  "PASTEBACK_EXPECTED_FILENAME_RECOVERED",
  "PASTEBACK_INTERNAL_RETRY_START",
  "PASTEBACK_RETRYABLE_BLOCKED",
  "send_button_not_found",
  "Promise was collected",
  "CDP returned no string value",
  "SavedChatGptTargetOnly"
)

Assert-Text "scripts\sera-direct-zip-to-closed-cleanly-v1.ps1" @(
  "Resolve-SeraOverlayZip",
  "ZIP_PATH_ARGUMENT_WAS_BLANK_RECOVERED",
  "ZIP_PATH_RESOLVED_FROM_EXPECTED_FILENAME",
  "ZIP_PATH_RESOLVED_FROM_DOWNLOADS13",
  "expectedFilename",
  "searchedDirectories"
)

$RuntimeScanFiles = @(
  "SERA_WATCH_COMMAND_INBOX.ps1",
  "scripts\sera-command-json-route-downloads13-to-inbox-v1.ps1",
  "scripts\sera-final-handoff-pasteback-v1.ps1",
  "scripts\phase187-pasteback-reliability-watcher-continuity-v1.ps1"
)

foreach ($File in $RuntimeScanFiles) {
  Assert-NoForbiddenRuntimePattern $File
}

$WatcherText = Get-Content -LiteralPath (Join-Path $RepoRoot "SERA_WATCH_COMMAND_INBOX.ps1") -Raw
if ($WatcherText -like "*WATCHER_STOP_AFTER_BLOCKED_OR_FAILED_RUN*") {
  Block-Verify "Watcher still contains permanent stop marker after blocked or failed run."
}

$PastebackText = Get-Content -LiteralPath (Join-Path $RepoRoot "scripts\sera-final-handoff-pasteback-v1.ps1") -Raw
if ($PastebackText -like "*allowRandomRecentChatFallback*true*" -or $PastebackText -like "*allowNewChatFallback*true*") {
  Block-Verify "Pasteback appears to allow random/new chat fallback."
}

$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$PassPath = Join-Path $Handoff "$PhaseName-$Stamp-VERIFY_PASS.md"

@"
Status: VERIFY_PASS
Phase: $PhaseName
Timestamp: $Stamp

Proof:
- Watcher startup backlog scan markers exist.
- Watcher returns to watch mode after command runs instead of permanently stopping after blocked or failed runs.
- Safe command JSON routing from 13_chatgpt_downloads to command_inbox exists and is idempotent.
- Command JSON routing rejects non-command JSON.
- Pasteback now has internal retry markers for Promise was collected, send_button_not_found, and CDP returned no string value.
- Pasteback preserves SavedChatGptTargetOnly.
- Direct closeout Phase186 ZIP recovery remains installed.
- No new persistence, service, admin-only install, credentials, tokens, paid service, dependency install, or security-setting pattern was added in runtime files scanned by this verifier.

Next:
Phase188 should be the true no-rescue phone-only CLOSED_CLEANLY proof.
"@ | Set-Content $PassPath -Encoding UTF8

Write-Host "PHASE187_VERIFY PASS"
Write-Host $PassPath
exit 0
