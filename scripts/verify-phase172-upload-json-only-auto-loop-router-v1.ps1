param(
  [string]$RepoRoot = "C:\Users\18123\Documents\SERA-Core\s.e.r.a",
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps"
)

$ErrorActionPreference = "Stop"

$Required = @(
  "SERA_RUN_UPLOADED_JSON_LOOP.ps1",
  "scripts\sera-full-auto-json-loop-router-v1.ps1",
  "scripts\sera-chatgpt-browser-bridge-v1.ps1",
  "scripts\sera-direct-zip-to-closed-cleanly-v1.ps1",
  "scripts\phase172-upload-json-only-auto-loop-status-v1.ps1",
  "scripts\phase172-upload-json-only-auto-loop-router-v1.ps1",
  "docs\phase172-upload-json-only-auto-loop-router-v1.md",
  ".overlay\phase172_upload_json_only_auto_loop_router_v1.json",
  ".sera-proof\phase172_upload_json_only_auto_loop_router_v1.json"
)

foreach ($Rel in $Required) {
  $Path = Join-Path $RepoRoot $Rel
  if (!(Test-Path $Path)) {
    throw "Missing required Phase172 file: $Rel"
  }

  if ($Rel -like "*.ps1") {
    $Tokens = $null
    $Errors = $null
    [System.Management.Automation.Language.Parser]::ParseFile($Path, [ref]$Tokens, [ref]$Errors) | Out-Null
    if ($Errors -and $Errors.Count -gt 0) {
      throw "Parse failed for $Rel :: $($Errors[0].Message)"
    }
  }
}

$Bridge = Get-Content (Join-Path $RepoRoot "scripts\sera-chatgpt-browser-bridge-v1.ps1") -Raw
foreach ($Marker in @("CHATGPT_BROWSER_BRIDGE_CONNECTED","ARTIFACT_CLICK_RESULT",".zip",".ps1","role='button'","data-testid","aria-label","download")) {
  if ($Bridge -notlike "*$Marker*") {
    throw "Browser bridge missing marker: $Marker"
  }
}

$Router = Get-Content (Join-Path $RepoRoot "scripts\sera-full-auto-json-loop-router-v1.ps1") -Raw
foreach ($Marker in @("FULL_AUTO_LOOP_START","REQUEST_READY","ExpectedZip","ZIP_READY","FINAL_HANDOFF_COPIED")) {
  if ($Router -notlike "*$Marker*") {
    throw "Router missing marker: $Marker"
  }
}

$AllText = ""
foreach ($Rel in $Required) {
  $AllText += "`n--- $Rel ---`n"
  $AllText += Get-Content (Join-Path $RepoRoot $Rel) -Raw
}

foreach ($Bad in @("Register-ScheduledTask","schtasks.exe","New-Service","Set-Service","Set-ExecutionPolicy","Add-MpPreference","OPENAI_API_KEY","api_key =","secret =")) {
  if ($AllText -like "*$Bad*") {
    throw "Forbidden operation marker found: $Bad"
  }
}

Write-Host "PHASE172_VERIFY PASS"
