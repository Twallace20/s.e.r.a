param(
  [string]$RepoRoot = (Get-Location).Path,
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps"
)
$ErrorActionPreference = "Stop"
$Required = @(
  "SERA_RUN_UPLOADED_JSON_LOOP.ps1",
  "scripts\sera-full-auto-json-loop-router-v1.ps1",
  "scripts\sera-chatgpt-browser-bridge-v1.ps1",
  "scripts\sera-direct-zip-to-closed-cleanly-v1.ps1",
  "scripts\phase172-upload-json-only-auto-loop-router-v1.ps1",
  "scripts\phase172-upload-json-only-auto-loop-status-v1.ps1",
  "docs\phase172-upload-json-only-auto-loop-router-v1.md",
  ".overlay\phase172_upload_json_only_auto_loop_router_v1.json",
  ".sera-proof\phase172_upload_json_only_auto_loop_router_v1.json"
)
foreach ($Rel in $Required) {
  $Path = Join-Path $RepoRoot $Rel
  if (!(Test-Path $Path)) { throw "Phase172 required file missing: $Rel" }
}
$Router = Get-Content (Join-Path $RepoRoot "scripts\sera-full-auto-json-loop-router-v1.ps1") -Raw
$Bridge = Get-Content (Join-Path $RepoRoot "scripts\sera-chatgpt-browser-bridge-v1.ps1") -Raw
$Direct = Get-Content (Join-Path $RepoRoot "scripts\sera-direct-zip-to-closed-cleanly-v1.ps1") -Raw
$Doc = Get-Content (Join-Path $RepoRoot "docs\phase172-upload-json-only-auto-loop-router-v1.md") -Raw
foreach ($Marker in @("USER_UPLOADS_JSON_TO_COMMAND_INBOX","REQUEST_READY","CHATGPT_BROWSER_BRIDGE","ZIP_DOWNLOADED","DIRECT_ZIP_TO_CLOSED_CLEANLY","CLOSED_CLEANLY")) {
  if ($Doc -notlike "*$Marker*") { throw "Phase172 doc missing marker: $Marker" }
}
foreach ($Marker in @("savedChatGptTargetOnly","allowRandomRecentChatFallback","allowNewChatFallback","artifact-watch-request","sera-production-json-pickup-runner-v1.ps1","sera-chatgpt-browser-bridge-v1.ps1","sera-direct-zip-to-closed-cleanly-v1.ps1")) {
  if ($Router -notlike "*$Marker*") { throw "Phase172 router missing marker: $Marker" }
}
foreach ($Marker in @("Download","expectedZipName","button","role=`"button`"","aria-label","Runtime.evaluate","Input.insertText","Page.setDownloadBehavior")) {
  if ($Bridge -notlike "*$Marker*") { throw "Phase172 browser bridge missing marker: $Marker" }
}
foreach ($Marker in @("PASS_GUARANTEED","SAFE_AUTO_MERGE_AFTER_PASS_GUARANTEED","CLOSED_CLEANLY","git merge --no-ff","git tag")) {
  if ($Direct -notlike "*$Marker*") { throw "Phase172 direct closeout missing marker: $Marker" }
}
$Forbidden = @("Enable-ScheduledTask","Start-ScheduledTask","Register-ScheduledTask","schtasks /create","Startup")
foreach ($Word in $Forbidden) {
  if ($Router -like "*$Word*" -or $Bridge -like "*$Word*" -or $Direct -like "*$Word*") { throw "Phase172 contains forbidden persistence marker: $Word" }
}
Write-Host "VERIFIER PASS phase172 upload json only auto loop router"

