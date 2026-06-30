param(
  [string]$AutoOps = "$env:USERPROFILE\OneDrive\SERA-AutoOps",
  [string]$ExpectedZip = "s.e.r.a_phase138_phase_138_safe_autopilot_continuation_v1_overlay.zip",
  [string]$BlockedEvidence = "C:\Users\18123\OneDrive\SERA-AutoOps\17_needs_attention\CHATGPT_ARTIFACT_WATCHER_NEEDS_ATTENTION-20260630_150656Z.md",
  [int]$LeaseMinutes = 15,
  [switch]$Apply
)

$ErrorActionPreference = "Stop"

function Write-JsonNoBom {
  param(
    [Parameter(Mandatory=$true)][string]$Path,
    [Parameter(Mandatory=$true)]$Value
  )
  $Utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  $Json = $Value | ConvertTo-Json -Depth 20
  [System.IO.File]::WriteAllText($Path, $Json + [Environment]::NewLine, $Utf8NoBom)
}

$Control = Join-Path $AutoOps "00_control_center"
$TargetPath = Join-Path $Control "chatgpt-target.json"

if (!(Test-Path $TargetPath)) {
  throw "Saved ChatGPT target config missing: $TargetPath"
}

$Target = Get-Content $TargetPath -Raw | ConvertFrom-Json

if ([string]::IsNullOrWhiteSpace([string]$Target.targetUrl)) {
  throw "Saved ChatGPT targetUrl is missing. Stop before retry."
}

if ($Target.allowRandomRecentChatFallback -ne $false) {
  throw "Random recent chat fallback must remain false."
}

if ($Target.allowNewChatFallback -ne $false) {
  throw "New chat fallback must remain false."
}

$Now = (Get-Date).ToUniversalTime()
$LeaseUntil = $Now.AddMinutes($LeaseMinutes)

$LeaseDir = Join-Path $Control "generation_leases"
$RetryDir = Join-Path $Control "retry_markers"
$EvidenceDir = Join-Path $Control "evidence"

New-Item -ItemType Directory -Force $LeaseDir | Out-Null
New-Item -ItemType Directory -Force $RetryDir | Out-Null
New-Item -ItemType Directory -Force $EvidenceDir | Out-Null

$LeasePath = Join-Path $LeaseDir "phase138-generation-lease.json"
$RetryPath = Join-Path $RetryDir "phase138-hotfix-attempt1-retry-ready.json"
$EvidencePath = Join-Path $EvidenceDir ("phase138-hotfix-attempt1-" + (Get-Date -Format "yyyyMMdd_HHmmss") + ".json")

$Payload = [ordered]@{
  ok = $true
  mode = if ($Apply) { "apply" } else { "dry_run" }
  phase = 138
  hotfixAttempt = 1
  expectedZipFilename = $ExpectedZip
  reason = "Recoverable artifact watcher max-attempt condition; prepare safe retry lease."
  generationLease = [ordered]@{
    active = $true
    phase = 138
    expectedZipFilename = $ExpectedZip
    startedAt = $Now.ToString("o")
    leaseUntil = $LeaseUntil.ToString("o")
    doNotRefresh = $true
    doNotResubmit = $true
    doNotEscalateBeforeLeaseExpires = $true
  }
  safety = [ordered]@{
    savedChatGptTargetOnly = $true
    targetUrlPresent = -not [string]::IsNullOrWhiteSpace([string]$Target.targetUrl)
    allowRandomRecentChatFallback = $false
    allowNewChatFallback = $false
    externalAccountsChanged = $false
    credentialsOrTokensChanged = $false
    paidServicesChanged = $false
    githubSettingsChanged = $false
    ownerControlBoundariesChanged = $false
  }
  blockedEvidence = $BlockedEvidence
  createdAt = $Now.ToString("o")
}

if ($Apply) {
  Write-JsonNoBom -Path $LeasePath -Value $Payload.generationLease
  Write-JsonNoBom -Path $RetryPath -Value $Payload

  if (Test-Path $BlockedEvidence) {
    $ArchiveDir = Join-Path (Split-Path $BlockedEvidence -Parent) "archive_phase138_hotfix_attempt1"
    New-Item -ItemType Directory -Force $ArchiveDir | Out-Null
    $ArchivedPath = Join-Path $ArchiveDir (Split-Path $BlockedEvidence -Leaf)
    Copy-Item $BlockedEvidence $ArchivedPath -Force
    $Payload.archivedBlockedEvidence = $ArchivedPath
  }
}

Write-JsonNoBom -Path $EvidencePath -Value $Payload

$Payload | ConvertTo-Json -Depth 20
