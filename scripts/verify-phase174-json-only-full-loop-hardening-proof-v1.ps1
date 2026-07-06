param(
  [string]$RepoRoot = "C:\Users\18123\Documents\SERA-Core\s.e.r.a",
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps"
)

$ErrorActionPreference = "Stop"

Set-Location $RepoRoot

$Repair = Join-Path $RepoRoot "scripts\sera-repair-nested-overlay-paths-v1.ps1"
if (!(Test-Path $Repair)) {
  throw "Nested path repair script missing."
}

& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $Repair -RepoRoot $RepoRoot -CommitIfChanged -CommitMessage "fix: flatten nested overlay paths before phase174 verification"
if ($LASTEXITCODE -ne 0) {
  throw "Nested path repair failed before Phase174 verification."
}

$Required = @(
  ".overlay\phase174_json_only_full_loop_hardening_proof_v1.json",
  ".sera-proof\phase174_json_only_full_loop_hardening_proof_v1.json",
  "docs\phase174-json-only-full-loop-hardening-proof-v1.md",
  "scripts\sera-repair-nested-overlay-paths-v1.ps1",
  "scripts\sera-direct-zip-to-closed-cleanly-v1.ps1",
  "scripts\sera-full-auto-json-loop-router-v1.ps1",
  "scripts\sera-chatgpt-browser-bridge-v1.ps1",
  "scripts\verify-phase174-json-only-full-loop-hardening-proof-v1.ps1",
  "scripts\phase174-json-only-full-loop-hardening-proof-v1.ps1"
)

foreach ($Rel in $Required) {
  $Path = Join-Path $RepoRoot $Rel
  if (!(Test-Path $Path)) {
    throw "Missing required Phase174 file: $Rel"
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

foreach ($Nested in @(".overlay\.overlay",".sera-proof\.sera-proof","docs\docs","scripts\scripts")) {
  if (Test-Path (Join-Path $RepoRoot $Nested)) {
    throw "Nested overlay path still exists: $Nested"
  }
}

$Direct = Get-Content (Join-Path $RepoRoot "scripts\sera-direct-zip-to-closed-cleanly-v1.ps1") -Raw
foreach ($Marker in @("Invoke-RequiredScript","PASS_GUARANTEED handoff not found after verifier and QA","Refusing merge","sera-repair-nested-overlay-paths-v1.ps1","DIRECT_ZIP_CLOSEOUT_START")) {
  if ($Direct -notlike "*$Marker*") {
    throw "Direct closeout missing hardening marker: $Marker"
  }
}

$VerifierIndex = $Direct.IndexOf('Invoke-RequiredScript -RelativePath $Verifier')
$QaIndex = $Direct.IndexOf('Invoke-RequiredScript -RelativePath $QaScript')
$PassIndex = $Direct.IndexOf('$LatestPass = Get-ChildItem')
$MergeIndex = $Direct.IndexOf('git merge branch')

if ($VerifierIndex -lt 0 -or $QaIndex -lt 0 -or $PassIndex -lt 0 -or $MergeIndex -lt 0) {
  throw "Direct closeout gate sequence markers missing."
}

if (!($VerifierIndex -lt $QaIndex -and $QaIndex -lt $PassIndex -and $PassIndex -lt $MergeIndex)) {
  throw "Direct closeout gate sequence is invalid. Verifier and QA must run before PASS_GUARANTEED check and merge."
}

$Router = Get-Content (Join-Path $RepoRoot "scripts\sera-full-auto-json-loop-router-v1.ps1") -Raw
foreach ($Marker in @("RUN_DIRECT_ZIP_CLOSEOUT","sera-direct-zip-to-closed-cleanly-v1.ps1","ExpectedSha256","FINAL_HANDOFF_COPIED")) {
  if ($Router -notlike "*$Marker*") {
    throw "Full loop router missing marker: $Marker"
  }
}

if ($Router -like "*sera-json-to-closed-cleanly-orchestrator-v1.ps1*") {
  throw "Full loop router still references old JSON-to-closeout orchestrator."
}

$Bridge = Get-Content (Join-Path $RepoRoot "scripts\sera-chatgpt-browser-bridge-v1.ps1") -Raw
foreach ($Marker in @("TextDecoder","ARTIFACT_CLICK_RESULT","Find-DownloadedArtifact","if (`$Name)","continue","data-testid",".zip",".ps1")) {
  if ($Bridge -notlike "*$Marker*") {
    throw "Browser bridge missing marker: $Marker"
  }
}

$AllText = ""
foreach ($Rel in $Required) {
  $AllText += "`n--- $Rel ---`n"
  $AllText += Get-Content (Join-Path $RepoRoot $Rel) -Raw
}

foreach ($Bad in @("Register-ScheduledTask","schtasks.exe","New-Service","Set-Service","Set-ExecutionPolicy","Add-MpPreference","OPENAI_API_KEY","api_key =","secret =","password =","token =")) {
  if ($AllText -like "*$Bad*") {
    throw "Forbidden operation marker found: $Bad"
  }
}

Write-Host "PHASE174_VERIFY PASS"
