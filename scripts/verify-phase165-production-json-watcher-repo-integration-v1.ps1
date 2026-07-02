param(
  [string]$RepoRoot = (Get-Location).Path,
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps"
)

$ErrorActionPreference = "Stop"

$Required = @(
  "docs\phase165-production-json-watcher-repo-integration-v1.md",
  "scripts\phase165-production-json-watcher-repo-integration-v1.ps1",
  "scripts\verify-phase165-production-json-watcher-repo-integration-v1.ps1",
  "scripts\sera-command-inbox-hygiene-v1.ps1",
  "scripts\sera-json-to-closeout-watcher-v1.ps1"
)

foreach ($Rel in $Required) {
  $Path = Join-Path $RepoRoot $Rel
  if (!(Test-Path $Path)) {
    throw "Missing required file: $Rel"
  }
}

$Watcher = Get-Content (Join-Path $RepoRoot "scripts\sera-json-to-closeout-watcher-v1.ps1") -Raw
$Hygiene = Get-Content (Join-Path $RepoRoot "scripts\sera-command-inbox-hygiene-v1.ps1") -Raw
$Doc = Get-Content (Join-Path $RepoRoot "docs\phase165-production-json-watcher-repo-integration-v1.md") -Raw

foreach ($Needle in @("REQUEST_READY","13_chatgpt_downloads","artifact-watch-request.json","artifact-generation-lease.json","SelfTest")) {
  if ($Watcher -notlike "*$Needle*") {
    throw "Watcher missing marker: $Needle"
  }
}

foreach ($Needle in @("Move-Item","archive","stale_or_already_closed","invalid_json")) {
  if ($Hygiene -notlike "*$Needle*") {
    throw "Hygiene missing marker: $Needle"
  }
}

foreach ($Needle in @("JSON upload","REQUEST_READY","ChatGPT ZIP","13_chatgpt_downloads","QA Hard Stop")) {
  if ($Doc -notlike "*$Needle*") {
    throw "Docs missing marker: $Needle"
  }
}

$SelfTest = & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $RepoRoot "scripts\sera-json-to-closeout-watcher-v1.ps1") -Mode SelfTest -RepoRoot $RepoRoot -AutoOpsRoot $AutoOpsRoot 2>&1
$SelfText = ($SelfTest | Out-String)

if ($LASTEXITCODE -ne 0 -or $SelfText -notlike "*SELFTEST_PASS*") {
  throw "Watcher self-test failed: $SelfText"
}

Write-Host "VERIFIER PASS phase165 production JSON watcher repo integration"
exit 0
