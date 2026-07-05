param(
  [string]$RepoRoot = "C:\Users\18123\Documents\SERA-Core\s.e.r.a",
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps"
)

$ErrorActionPreference = "Stop"

$Required = @(
  "SERA_RUN_UPLOADED_JSON_LOOP.ps1",
  "scripts\sera-full-auto-json-loop-router-v1.ps1",
  "scripts\sera-chatgpt-browser-bridge-v1.ps1",
  "scripts\verify-phase173-json-only-full-loop-proof-v1.ps1",
  "scripts\phase173-json-only-full-loop-proof-v1.ps1",
  "docs\phase173-json-only-full-loop-proof-v1.md",
  ".overlay\phase173_json_only_full_loop_proof_v1.json",
  ".sera-proof\phase173_json_only_full_loop_proof_v1.json"
)

foreach ($Rel in $Required) {
  $Path = Join-Path $RepoRoot $Rel
  if (!(Test-Path $Path)) {
    throw "Missing required Phase173 file: $Rel"
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
foreach ($Marker in @("EXACT_ARTIFACT_MATCH_REQUIRED","exact ChatGPT artifact","ExpectedFilename","ARTIFACT_CLICK_RESULT",".zip",".ps1","role='button'","data-testid","aria-label","download")) {
  if ($Bridge -notlike "*$Marker*") {
    throw "Browser bridge missing Phase173 marker: $Marker"
  }
}

$Proof = Get-Content (Join-Path $RepoRoot ".sera-proof\phase173_json_only_full_loop_proof_v1.json") -Raw | ConvertFrom-Json
if ($Proof.mergeGate -ne "PASS_GUARANTEED") {
  throw "Phase173 proof mergeGate must be PASS_GUARANTEED."
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

Write-Host "PHASE173_VERIFY PASS"
