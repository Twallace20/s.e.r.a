param(
  [Parameter(Mandatory=$true)][string]$ExpectedZip,
  [Parameter(Mandatory=$true)][string]$PhaseName,
  [Parameter(Mandatory=$true)][string]$RequestPath,
  [Parameter(Mandatory=$true)][string]$PromptFile,
  [string]$CommandJson = ""
)

$ErrorActionPreference = "Stop"

$AutoOps = "$env:USERPROFILE\OneDrive\SERA-AutoOps"
$Control = "$AutoOps\00_control_center"
$Handoff = "$AutoOps\06_handoff"
$NeedsAttention = "$AutoOps\17_needs_attention"
$Evidence = "$Control\evidence"

New-Item -ItemType Directory -Force $Handoff,$NeedsAttention,$Evidence | Out-Null

$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$StampUtc = (Get-Date).ToUniversalTime().ToString("yyyyMMdd_HHmmssZ")
$EvidencePath = Join-Path $Evidence "$PhaseName-request-freshness-BLOCKED-$StampUtc.json"
$BlockedPath = Join-Path $Handoff "$PhaseName-$Stamp-BLOCKED.md"
$NeedsPath = Join-Path $NeedsAttention "AUTOPILOT_STOPPED-$PhaseName-$StampUtc.md"

function Write-Blocked {
  param([string]$Reason)

  [ordered]@{
    ok = $false
    status = "BLOCKED"
    phaseName = $PhaseName
    expectedZip = $ExpectedZip
    reason = $Reason
    requestPath = $RequestPath
    requestExists = Test-Path $RequestPath
    promptFile = $PromptFile
    promptFileExists = Test-Path $PromptFile
    commandJson = $CommandJson
    noStandaloneNpmTestCommandRun = $true
    createdAt = (Get-Date).ToUniversalTime().ToString("o")
  } | ConvertTo-Json -Depth 20 | Set-Content -Path $EvidencePath -Encoding UTF8

  $Lines = @(
    "# S.E.R.A. AutoOps Packet",
    "",
    "Status: BLOCKED",
    "Phase: $PhaseName",
    "Branch: main",
    "Timestamp: $Stamp",
    "",
    "## Summary",
    "",
    $Reason,
    "",
    "Expected ZIP:",
    "",
    $ExpectedZip,
    "",
    "## Diagnosis",
    "",
    "Blocked at: artifact_request_freshness_guard",
    "",
    "The bridge was not allowed to run because the active artifact request or prompt file did not match the current expected ZIP.",
    "",
    "## Evidence",
    "",
    "Runtime evidence:",
    "",
    $EvidencePath,
    "",
    "Request path:",
    "",
    $RequestPath,
    "",
    "Prompt file:",
    "",
    $PromptFile,
    "",
    "## Next Instruction For ChatGPT",
    "",
    "Review this S.E.R.A. AutoOps packet.",
    "",
    "If Status is BLOCKED:",
    "- Diagnose the failure.",
    "- Tell me whether to use a hotfix script, a fixed overlay, or rollback.",
    "- Provide exact next steps."
  )

  $Lines | Set-Content -Path $BlockedPath -Encoding UTF8
  Copy-Item $BlockedPath $NeedsPath -Force

  $Prompt = @(
    "Review this S.E.R.A. AutoOps packet.",
    "",
    "If Status is BLOCKED:",
    "- Diagnose the failure.",
    "- Tell me whether to use a hotfix script, a fixed overlay, or rollback.",
    "- Provide exact next steps.",
    "",
    (Get-Content $BlockedPath -Raw)
  ) -join "`r`n"

  Set-Clipboard $Prompt

  Write-Host "`n=== BLOCKED HANDOFF CREATED ==="
  Write-Host $BlockedPath
  Get-Content $BlockedPath -Raw

  exit 2
}

if (!(Test-Path $RequestPath)) {
  Write-Blocked "Missing artifact-watch-request.json. The JSON command did not create a bridge request."
}

$RequestRaw = Get-Content $RequestPath -Raw
if ($RequestRaw -notlike "*$ExpectedZip*") {
  Write-Blocked "Stale or wrong artifact request rejected. The active request does not contain the current expected ZIP."
}

if (!(Test-Path $PromptFile)) {
  Write-Blocked "The request prompt file is missing."
}

$PromptRaw = Get-Content $PromptFile -Raw
if ($PromptRaw -notlike "*$ExpectedZip*") {
  Write-Blocked "Stale or wrong prompt file rejected. The prompt file does not contain the current expected ZIP."
}

Write-Host "REQUEST_FRESHNESS_OK"