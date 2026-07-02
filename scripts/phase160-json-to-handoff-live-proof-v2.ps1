param(
  [string]$RepoRoot = (Get-Location).Path,
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps",
  [switch]$CheckRuntime
)

$ErrorActionPreference = "Stop"

$Phase = 160
$PhaseSlug = "phase160_json_to_handoff_live_proof_v2"
$ExpectedZip = "s.e.r.a_phase160_json_to_handoff_live_proof_v2_overlay.zip"

$Required = @(
  ".overlay\$PhaseSlug.json",
  ".sera-proof\$PhaseSlug.json",
  "docs\phase160-json-to-handoff-live-proof-v2.md",
  "scripts\phase160-json-to-handoff-live-proof-v2.ps1",
  "scripts\verify-phase160-json-to-handoff-live-proof-v2.ps1"
)

$Missing = @()
foreach ($Relative in $Required) {
  $Path = Join-Path $RepoRoot $Relative
  if (!(Test-Path $Path)) { $Missing += $Relative }
}

$Control = Join-Path $AutoOpsRoot "00_control_center"
$RequestPath = Join-Path $Control "artifact-watch-request.json"
$Downloads = Join-Path $AutoOpsRoot "13_chatgpt_downloads"
$ApplyApproved = Join-Path $AutoOpsRoot "01_apply_approved"
$Handoff = Join-Path $AutoOpsRoot "06_handoff"

$Zip13 = Join-Path $Downloads $ExpectedZip
$ZipApply = Join-Path $ApplyApproved $ExpectedZip

$Runtime = [ordered]@{
  checked = [bool]$CheckRuntime
  requestPath = $RequestPath
  requestExists = Test-Path $RequestPath
  requestMatchesExpectedZip = $false
  zip13 = $Zip13
  zipExistsIn13 = Test-Path $Zip13
  zipApply = $ZipApply
  zipExistsInApplyApproved = Test-Path $ZipApply
  latestPhase160Handoff = $null
}

if ($Runtime.requestExists) {
  $RequestRaw = Get-Content $RequestPath -Raw
  $Runtime.requestMatchesExpectedZip = ($RequestRaw -like "*$ExpectedZip*")
}

if (Test-Path $Handoff) {
  $Latest = Get-ChildItem $Handoff -File -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -like "*phase160*" -or $_.Name -like "*json_to_handoff_live_proof_v2*" } |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1
  if ($Latest) { $Runtime.latestPhase160Handoff = $Latest.FullName }
}

$Ok = ($Missing.Count -eq 0)
if ($CheckRuntime) {
  $Ok = $Ok -and (
    $Runtime.requestMatchesExpectedZip -or
    $Runtime.zipExistsIn13 -or
    [bool]$Runtime.latestPhase160Handoff
  )
}

[ordered]@{
  ok = $Ok
  phase = $Phase
  phaseSlug = $PhaseSlug
  expectedZip = $ExpectedZip
  repoRoot = $RepoRoot
  missing = $Missing
  runtime = $Runtime
  noStandaloneNpmTestRequired = $true
} | ConvertTo-Json -Depth 12

if (!$Ok) { exit 1 }
exit 0
