param(
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps"
)

$ErrorActionPreference = "Stop"

$PhaseSlug = "phase167_full_autopilot_loop_proof_v1"
$ExpectedZip = "s.e.r.a_phase167_full_autopilot_loop_proof_v1_overlay.zip"
$Control = Join-Path $AutoOpsRoot "00_control_center"
$CommandInbox = Join-Path $Control "command_inbox"
$BridgeOutbox = Join-Path $AutoOpsRoot "15_bridge_outbox"
$Downloads13 = Join-Path $AutoOpsRoot "13_chatgpt_downloads"
$Handoff = Join-Path $AutoOpsRoot "06_handoff"
$MergePending = Join-Path $AutoOpsRoot "09_merge_pending"
$MergeApproved = Join-Path $AutoOpsRoot "03_merge_approved"

function Get-LatestFile {
  param([string]$Path,[string]$Filter)
  Get-ChildItem $Path -File -Filter $Filter -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1
}

$RequestPath = Join-Path $Control "artifact-watch-request.json"
$LeasePath = Join-Path $Control "artifact-generation-lease.json"
$ZipPath = Join-Path $Downloads13 $ExpectedZip
$Command = Get-LatestFile -Path $CommandInbox -Filter "*phase167*.json"
$Prompt = Get-LatestFile -Path $BridgeOutbox -Filter "*phase167*.md"
$PassGuaranteed = Get-LatestFile -Path $Handoff -Filter "*phase167*PASS_GUARANTEED.md"
$ClosedCleanly = Get-LatestFile -Path $Handoff -Filter "*phase167*CLOSED_CLEANLY.md"
$WaitingForZip = Get-LatestFile -Path $Handoff -Filter "*phase167*WAITING_FOR_ZIP.md"
$Pending = Get-LatestFile -Path $MergePending -Filter "*phase167*.json"
$Approved = Get-LatestFile -Path $MergeApproved -Filter "*phase167*.json"

Write-Host "PHASE167 FULL LOOP STATUS"
Write-Host "Phase slug: $PhaseSlug"
Write-Host "Expected ZIP: $ExpectedZip"
Write-Host ""
Write-Host "Command JSON: $($Command.FullName)"
Write-Host "Artifact request exists: $(Test-Path -LiteralPath $RequestPath)"
Write-Host "Artifact lease exists: $(Test-Path -LiteralPath $LeasePath)"
Write-Host "Prompt: $($Prompt.FullName)"
Write-Host "Exact ZIP present: $(Test-Path -LiteralPath $ZipPath)"
Write-Host "Waiting for ZIP packet: $($WaitingForZip.FullName)"
Write-Host "PASS_GUARANTEED: $($PassGuaranteed.FullName)"
Write-Host "MERGE_PENDING: $($Pending.FullName)"
Write-Host "MERGE_APPROVED: $($Approved.FullName)"
Write-Host "CLOSED_CLEANLY: $($ClosedCleanly.FullName)"

if (Test-Path -LiteralPath $RequestPath) {
  $Request = Get-Content -LiteralPath $RequestPath -Raw | ConvertFrom-Json
  Write-Host ""
  Write-Host "REQUEST_READY artifact:"
  Write-Host "- phase: $($Request.phase)"
  Write-Host "- expectedZipName: $($Request.expectedZipName)"
  Write-Host "- promptFile: $($Request.promptFile)"
}
