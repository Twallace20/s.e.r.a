param(
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps"
)

$ErrorActionPreference = "Stop"

$PhaseSlug = "phase168_true_end_to_end_json_closeout_orchestrator_v1"
$ExpectedZip = "s.e.r.a_phase168_true_end_to_end_json_closeout_orchestrator_v1_overlay.zip"
$Control = Join-Path $AutoOpsRoot "00_control_center"
$CommandInbox = Join-Path $Control "command_inbox"
$BridgeOutbox = Join-Path $AutoOpsRoot "15_bridge_outbox"
$Downloads13 = Join-Path $AutoOpsRoot "13_chatgpt_downloads"
$ApplyApproved = Join-Path $AutoOpsRoot "01_apply_approved"
$Handoff = Join-Path $AutoOpsRoot "06_handoff"
$MergePending = Join-Path $AutoOpsRoot "09_merge_pending"
$MergeApproved = Join-Path $AutoOpsRoot "03_merge_approved"

function Get-LatestFile { param([string]$Path,[string]$Filter) Get-ChildItem $Path -File -Filter $Filter -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1 }

$RequestPath = Join-Path $Control "artifact-watch-request.json"
$ZipPath = Join-Path $Downloads13 $ExpectedZip
$ApplyZipPath = Join-Path $ApplyApproved $ExpectedZip
$Command = Get-LatestFile -Path $CommandInbox -Filter "*phase168*.json"
$Prompt = Get-LatestFile -Path $BridgeOutbox -Filter "*phase168*.md"
$PassGuaranteed = Get-LatestFile -Path $Handoff -Filter "*phase168*PASS_GUARANTEED.md"
$ClosedCleanly = Get-LatestFile -Path $Handoff -Filter "*phase168*CLOSED_CLEANLY.md"
$WaitingForZip = Get-LatestFile -Path $Handoff -Filter "*phase168*WAITING_FOR_ZIP.md"
$Pending = Get-LatestFile -Path $MergePending -Filter "*phase168*.json"
$Approved = Get-LatestFile -Path $MergeApproved -Filter "*phase168*.json"

Write-Host "PHASE168 TRUE END-TO-END STATUS"
Write-Host "Phase slug: $PhaseSlug"
Write-Host "Expected ZIP: $ExpectedZip"
Write-Host "REQUEST_READY artifact exists: $(Test-Path -LiteralPath $RequestPath)"
Write-Host "Command JSON: $($Command.FullName)"
Write-Host "Prompt: $($Prompt.FullName)"
Write-Host "Downloaded ZIP present: $(Test-Path -LiteralPath $ZipPath)"
Write-Host "01_apply_approved ZIP present: $(Test-Path -LiteralPath $ApplyZipPath)"
Write-Host "WAITING_FOR_ZIP: $($WaitingForZip.FullName)"
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
