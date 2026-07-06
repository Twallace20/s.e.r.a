param(
  [string]$RepoRoot = (Get-Location).Path,
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps"
)

$ErrorActionPreference = "Stop"

$PhaseName = "s.e.r.a_phase178_foreground_watcher_json_drop_proof_v1_overlay"
$Handoff = Join-Path $AutoOpsRoot "06_handoff"
New-Item -ItemType Directory -Force $Handoff | Out-Null

function Fail-Verify {
  param([string]$Reason)

  $Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
  $Path = Join-Path $Handoff "$PhaseName-$Stamp-VERIFY_BLOCKED.md"

  @"
Status: BLOCKED
Phase: $PhaseName
Timestamp: $Stamp
Reason: $Reason

Gate result:
Verifier refused the phase. QA and merge must not run.
"@ | Set-Content -LiteralPath $Path -Encoding UTF8

  Write-Host "PHASE178_VERIFY BLOCKED"
  Write-Host $Reason
  exit 1
}

function Assert-Exists {
  param([string]$Relative)

  $Path = Join-Path $RepoRoot $Relative
  if (!(Test-Path $Path)) {
    Fail-Verify "Missing required file: $Relative"
  }
  return $Path
}

function Assert-ParseOk {
  param([string]$Path)

  $Tokens = $null
  $Errors = $null
  [System.Management.Automation.Language.Parser]::ParseFile($Path, [ref]$Tokens, [ref]$Errors) | Out-Null

  if ($Errors -and $Errors.Count -gt 0) {
    Fail-Verify "Parse failed: $Path :: $($Errors[0].Message)"
  }
}

function Assert-Contains {
  param(
    [string]$Relative,
    [string[]]$Markers
  )

  $Path = Assert-Exists $Relative
  $Text = Get-Content -LiteralPath $Path -Raw

  foreach ($Marker in $Markers) {
    if ($Text -notlike "*$Marker*") {
      Fail-Verify "Missing marker '$Marker' in $Relative"
    }
  }
}

$ScriptsToParse = @(
  "SERA_WATCH_COMMAND_INBOX.ps1",
  "SERA_RUN_UPLOADED_JSON_LOOP.ps1",
  "scripts\sera-command-inbox-foreground-watcher-v1.ps1",
  "scripts\sera-chatgpt-browser-bridge-v1.ps1",
  "scripts\sera-direct-zip-to-closed-cleanly-v1.ps1",
  "scripts\sera-full-auto-json-loop-router-v1.ps1",
  "scripts\sera-repair-nested-overlay-paths-v1.ps1",
  "scripts\verify-phase178-foreground-watcher-json-drop-proof-v1.ps1",
  "scripts\phase178-foreground-watcher-json-drop-proof-v1.ps1"
)

foreach ($Relative in $ScriptsToParse) {
  $Path = Assert-Exists $Relative
  Assert-ParseOk $Path
}

Assert-Contains "SERA_WATCH_COMMAND_INBOX.ps1" @(
  "sera-command-inbox-foreground-watcher-v1.ps1",
  "RepoRoot",
  "AutoOpsRoot"
)

Assert-Contains "scripts\sera-command-inbox-foreground-watcher-v1.ps1" @(
  "command_inbox",
  "SERA_RUN_UPLOADED_JSON_LOOP.ps1",
  "LaunchBrowserIfNeeded",
  "foreground"
)

Assert-Contains "scripts\sera-chatgpt-browser-bridge-v1.ps1" @(
  "ExpectedFilename",
  "Find-DownloadedArtifact",
  "RunStartedAt"
)

Assert-Contains "scripts\sera-direct-zip-to-closed-cleanly-v1.ps1" @(
  "Invoke-RequiredScript",
  "Fresh VERIFY_PASS",
  "Fresh PASS_GUARANTEED",
  "BLOCKED_HANDOFF",
  "Required verifier script failed",
  "Required QA script failed"
)

Assert-Contains "scripts\sera-full-auto-json-loop-router-v1.ps1" @(
  "Select-CurrentPhaseHandoff",
  "STALE_HANDOFF_REFUSED",
  "current-phase handoff"
)

$ForbiddenScriptPatterns = @(
  "Register-ScheduledTask",
  "New-Service",
  "sc.exe create",
  "schtasks /create",
  "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run",
  "HKLM:\Software\Microsoft\Windows\CurrentVersion\Run"
)

$Scripts = Get-ChildItem -LiteralPath (Join-Path $RepoRoot "scripts") -File -Filter "*.ps1" -ErrorAction SilentlyContinue
$Scripts += Get-Item -LiteralPath (Join-Path $RepoRoot "SERA_WATCH_COMMAND_INBOX.ps1") -ErrorAction SilentlyContinue

foreach ($Script in $Scripts) {
  $Text = Get-Content -LiteralPath $Script.FullName -Raw
  foreach ($Pattern in $ForbiddenScriptPatterns) {
    if ($Text -like "*$Pattern*") {
      Fail-Verify "Forbidden persistence or service pattern '$Pattern' found in $($Script.FullName)"
    }
  }
}

$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$Path = Join-Path $Handoff "$PhaseName-$Stamp-VERIFY_PASS.md"

@"
Status: VERIFY_PASS
Phase: $PhaseName
Timestamp: $Stamp

Proof:
- Foreground watcher launcher exists.
- Foreground watcher invokes the full JSON loop.
- Browser bridge keeps exact expected artifact behavior and fresh-download timing data.
- Direct closeout keeps required-script gate semantics.
- Router keeps current-phase handoff selection guard.
- No scheduled task, service, or login persistence pattern was detected in scripts.
"@ | Set-Content -LiteralPath $Path -Encoding UTF8

Write-Host "PHASE178_VERIFY PASS"
Write-Host $Path
exit 0
