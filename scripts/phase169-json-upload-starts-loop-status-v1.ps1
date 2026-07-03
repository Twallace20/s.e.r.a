param(
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps"
)

$ErrorActionPreference = "Stop"

$PhaseSlug = "phase169_json_upload_starts_loop_proof_v1"
$ExpectedZip = "s.e.r.a_phase169_json_upload_starts_loop_proof_v1_overlay.zip"
$Control = Join-Path $AutoOpsRoot "00_control_center"
$CommandInbox = Join-Path $Control "command_inbox"
$BridgeOutbox = Join-Path $AutoOpsRoot "15_bridge_outbox"
$Downloads13 = Join-Path $AutoOpsRoot "13_chatgpt_downloads"
$ApplyApproved = Join-Path $AutoOpsRoot "01_apply_approved"
$Handoff = Join-Path $AutoOpsRoot "06_handoff"
$Processing = Join-Path $AutoOpsRoot "08_processing"
$MergePending = Join-Path $AutoOpsRoot "09_merge_pending"
$MergeApproved = Join-Path $AutoOpsRoot "03_merge_approved"

function Get-LatestFile { param([string]$Path,[string]$Filter) Get-ChildItem $Path -File -Filter $Filter -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1 }

$RequestPath = Join-Path $Control "artifact-watch-request.json"
$ZipPath = Join-Path $Downloads13 $ExpectedZip
$ApplyZipPath = Join-Path $ApplyApproved $ExpectedZip
$Command = Get-LatestFile -Path $CommandInbox -Filter "*phase169*.json"
$Prompt = Get-LatestFile -Path $BridgeOutbox -Filter "*phase169*.md"
$WaitingForZip = Get-LatestFile -Path $Handoff -Filter "*phase169*WAITING_FOR_ZIP.md"
$Pass = Get-LatestFile -Path $Handoff -Filter "*phase169*-PASS.md"
$PassGuaranteed = Get-LatestFile -Path $Handoff -Filter "*phase169*PASS_GUARANTEED.md"
$ClosedCleanly = Get-LatestFile -Path $Handoff -Filter "*phase169*CLOSED_CLEANLY.md"
$Pending = Get-LatestFile -Path $MergePending -Filter "*phase169*.json"
$Approved = Get-LatestFile -Path $MergeApproved -Filter "*phase169*.json"
$ProcessingHit = Get-ChildItem $Processing -Recurse -File -ErrorAction SilentlyContinue | Where-Object { $_.FullName -like "*phase169*" } | Sort-Object LastWriteTime -Descending | Select-Object -First 1

Write-Host "PHASE169 JSON UPLOAD STARTS LOOP STATUS"
Write-Host "Phase slug: $PhaseSlug"
Write-Host "Expected ZIP: $ExpectedZip"
Write-Host "REQUEST_READY artifact exists: $(Test-Path -LiteralPath $RequestPath)"
Write-Host "User JSON: $($Command.FullName)"
Write-Host "Prompt: $($Prompt.FullName)"
Write-Host "Downloaded ZIP present: $(Test-Path -LiteralPath $ZipPath)"
Write-Host "01_apply_approved ZIP present: $(Test-Path -LiteralPath $ApplyZipPath)"
Write-Host "WAITING_FOR_ZIP: $($WaitingForZip.FullName)"
Write-Host "PASS: $($Pass.FullName)"
Write-Host "Processing evidence: $($ProcessingHit.FullName)"
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
