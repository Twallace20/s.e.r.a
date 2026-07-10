[CmdletBinding()]
param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\")).Path,
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps",
  [string]$ExpectedZipFilename = "s.e.r.a_phase200_repeat_full_autopilot_clean_baseline_proof_v1_overlay.zip"
)
$ErrorActionPreference = "Stop"
$Phase = "200"
$PhaseSlug = "phase200_repeat_full_autopilot_clean_baseline_proof_v1"
$PhaseName = "s.e.r.a_phase200_repeat_full_autopilot_clean_baseline_proof_v1_overlay"
$CommandId = "phase200-clean-baseline-repeat-full-autopilot-proof-20260710090000"
$RunNonce = "phase200-clean-baseline-repeat-full-autopilot-proof-20260710090000"
$Phase199Commit = "51128d59aadb81a11aa0001e58778530295b4454"
$Phase199Tag = "phase-199-post-closeout-clean-repo-endurance-autopilot-v1"
$Phase199ArtifactSha = "b6c8a320b12583cfbcf04c167ed74010d16e0cd093c10bc6f183bbf8c3b77a2d"
$PromptTextCompatCommit = "2404acb035e061857856f664eba4a4c76254020b"
$HandoffDir = Join-Path $AutoOpsRoot "06_handoff"
$DownloadsDir = Join-Path $AutoOpsRoot "13_chatgpt_downloads"
$LogDir = Join-Path $AutoOpsRoot "00_control_center\logs"
$StateDir = Join-Path $AutoOpsRoot "00_control_center\state"
New-Item -ItemType Directory -Force $HandoffDir | Out-Null
function Invoke-Git {
  param([Parameter(ValueFromRemainingArguments=$true)][string[]]$Args)
  Push-Location $RepoRoot
  try { return @(git @Args) } finally { Pop-Location }
}
function Get-Sha256Hex([string]$Path) { return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant() }
function Assert-File([string]$Rel) {
  $P = Join-Path $RepoRoot $Rel
  if (!(Test-Path -LiteralPath $P)) { throw "Missing required file: $Rel" }
  return $P
}
function Assert-ContainsText([string]$Path, [string]$Needle, [string]$Label) {
  $Text = Get-Content -LiteralPath $Path -Raw
  if ($Text -notlike "*$Needle*") { throw "$Label missing marker: $Needle" }
}
function Write-Phase200Handoff([string]$Status, [string]$Reason, [string]$Proof) {
  $Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
  $Out = Join-Path $HandoffDir ("{0}-{1}-{2}.md" -f $PhaseName,$Stamp,$Status)
  @"
Status: $Status
Phase: $PhaseName
PhaseNumber: $Phase
PhaseSlug: $PhaseSlug
Branch: $(Invoke-Git branch --show-current)
Timestamp: $Stamp

Reason:
$Reason

Proof:
$Proof
"@ | Set-Content -LiteralPath $Out -Encoding UTF8
  return $Out
}
try {
  $ManifestPath = Assert-File ".overlay\manifest.json"
  $ProofPath = Assert-File ".sera-proof\phase200_repeat_full_autopilot_clean_baseline_proof_v1_overlay_proof.json"
  $CommandPath = Assert-File "commands\phase200-repeat-full-autopilot-clean-baseline-proof-v1.command.json"
  $Repeatability = Assert-File "scripts\sera-phase200-repeatability-proof-v1.ps1"
  $PointerProof = Assert-File "scripts\sera-phase200-current-phase-pointer-clean-repo-proof-v1.ps1"
  $Fixture = Assert-File "scripts\phase200-repeat-full-autopilot-clean-baseline-proof-v1-fixtures-v1.ps1"
  Assert-File "tests\fixtures\phase200-repeat-full-autopilot\cases.json" | Out-Null
  Assert-File "scripts\qa-phase200-repeat-full-autopilot-clean-baseline-proof-v1.ps1" | Out-Null
  Assert-File "scripts\sera-phase200-direct-closeout-gate-v1.ps1" | Out-Null

  $Manifest = Get-Content -LiteralPath $ManifestPath -Raw | ConvertFrom-Json
  $ProofJson = Get-Content -LiteralPath $ProofPath -Raw | ConvertFrom-Json
  $Command = Get-Content -LiteralPath $CommandPath -Raw | ConvertFrom-Json
  if ($Manifest.phase -ne 200) { throw "Manifest phase mismatch: $($Manifest.phase)" }
  if ($Manifest.phaseSlug -ne $PhaseSlug) { throw "Manifest phaseSlug mismatch: $($Manifest.phaseSlug)" }
  if ($Manifest.expectedZipFilename -ne $ExpectedZipFilename) { throw "Manifest expectedZipFilename mismatch: $($Manifest.expectedZipFilename)" }
  if ($ProofJson.phaseSlug -ne $PhaseSlug) { throw "Proof phaseSlug mismatch: $($ProofJson.phaseSlug)" }
  if ($ProofJson.commandContract.commandId -ne $CommandId) { throw "Proof commandId mismatch: $($ProofJson.commandContract.commandId)" }
  if ($ProofJson.commandContract.runNonce -ne $RunNonce) { throw "Proof runNonce mismatch: $($ProofJson.commandContract.runNonce)" }
  if ($ProofJson.trustedBaselines.phase199Commit -ne $Phase199Commit) { throw "Phase199 proof baseline mismatch: $($ProofJson.trustedBaselines.phase199Commit)" }
  if ($ProofJson.trustedBaselines.phase199ArtifactSha256 -ne $Phase199ArtifactSha) { throw "Phase199 artifact SHA baseline mismatch: $($ProofJson.trustedBaselines.phase199ArtifactSha256)" }
  if ($ProofJson.trustedBaselines.promptTextCompatibilityRepairCommit -ne $PromptTextCompatCommit) { throw "PromptText compatibility baseline mismatch: $($ProofJson.trustedBaselines.promptTextCompatibilityRepairCommit)" }
  foreach ($Prop in @('commandId','runNonce','phaseSlug','expectedZipFilename')) {
    $Expected = @{ commandId=$CommandId; runNonce=$RunNonce; phaseSlug=$PhaseSlug; expectedZipFilename=$ExpectedZipFilename }[$Prop]
    if ([string]$Command.$Prop -ne [string]$Expected) { throw "Command $Prop mismatch: $($Command.$Prop)" }
  }
  if ($Command.savedChatGptTargetOnly -ne $true) { throw "savedChatGptTargetOnly must be true" }
  if ($Command.allowRandomRecentChatFallback -ne $false) { throw "allowRandomRecentChatFallback must be false" }
  if ($Command.allowNewChatFallback -ne $false) { throw "allowNewChatFallback must be false" }
  if ($Command.manualZipDownloadAllowed -ne $false) { throw "manualZipDownloadAllowed must be false" }
  if ($Command.forceFreshDownload -ne $true) { throw "forceFreshDownload must be true" }

  foreach ($Entry in @($Manifest.files)) {
    $Rel = ([string]$Entry.path) -replace '^[Rr][Ee][Pp][Oo][\\/]', ''
    if (($Rel -replace '\\','/') -eq '.overlay/manifest.json') { continue }
    $Abs = Join-Path $RepoRoot $Rel
    if (!(Test-Path -LiteralPath $Abs)) { throw "Manifest entry path missing: $($Entry.path)" }
    if ($Entry.PSObject.Properties.Name -contains 'bytes') {
      $ActualBytes = (Get-Item -LiteralPath $Abs).Length
      if ([int64]$Entry.bytes -ne [int64]$ActualBytes) { throw "Manifest byte mismatch for $($Entry.path): expected $($Entry.bytes) actual $ActualBytes" }
    }
    if ($Entry.sha256) {
      $ActualHash = Get-Sha256Hex $Abs
      if ([string]$Entry.sha256 -ne $ActualHash) { throw "Manifest hash validation failed: $($Entry.path): expected $($Entry.sha256) actual $ActualHash" }
    }
  }

  Push-Location $RepoRoot
  try {
    $Status = @(git status --short --untracked-files=all)
    if ($Status.Count -gt 0) { throw "Repo dirty during Phase200 verifier: $($Status -join '; ')" }
    git merge-base --is-ancestor $Phase199Commit HEAD | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Phase199 certified commit is not in HEAD ancestry: $Phase199Commit" }
    git merge-base --is-ancestor $PromptTextCompatCommit HEAD | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "PromptText compatibility commit is not in HEAD ancestry: $PromptTextCompatCommit" }
    $LocalPhase199Tag = (git rev-parse "$Phase199Tag^{commit}").Trim()
    if ($LocalPhase199Tag -ne $Phase199Commit) { throw "Local Phase199 tag mismatch: $LocalPhase199Tag" }
  } finally { Pop-Location }
  $RemotePhase199Tag = (git ls-remote --tags origin "refs/tags/$Phase199Tag" | ForEach-Object { ($_ -split "\s+")[0] } | Select-Object -First 1)
  if ([string]$RemotePhase199Tag -ne $Phase199Commit) { throw "Remote Phase199 tag mismatch: $RemotePhase199Tag" }
  $RemoteMain = (Invoke-Git rev-parse origin/main | Select-Object -First 1).Trim()
  if ($RemoteMain -ne $Phase199Commit) { throw "Phase200 did not start from Phase199 clean remote main. origin/main=$RemoteMain expected=$Phase199Commit" }

  $Bridge = Assert-File "scripts\sera-chatgpt-browser-bridge-v1.ps1"
  foreach ($Needle in @("PROMPT_INPUT_COMPAT_MODE","Input.insertText","PROMPT_FOCUS_RESULT","PROMPT_INSERT_VERIFY_RESULT","PROMPT_SEND_BUTTON_RESULT","PROMPT_SUBMIT_CONFIRM_ATTEMPT","prompt_submitted_by_native_cdp_verified","prompt_submitted_by_native_enter_verified")) {
    Assert-ContainsText $Bridge $Needle "Browser bridge"
  }

  $CommandIdentityOk = $false
  $StatePath = Join-Path $StateDir "autopilot-sequential-phase-queue-v1.json"
  if (Test-Path -LiteralPath $StatePath) {
    $State = Get-Content -LiteralPath $StatePath -Raw | ConvertFrom-Json
    if ([string]$State.commandId -eq $CommandId -and [string]$State.runNonce -eq $RunNonce -and [string]$State.phaseSlug -eq $PhaseSlug) { $CommandIdentityOk = $true }
  }
  $InboxCommand = Get-ChildItem (Join-Path $AutoOpsRoot "00_control_center\command_inbox") -File -Filter "*phase200*.json" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
  if ($InboxCommand) {
    $LiveCommand = Get-Content -LiteralPath $InboxCommand.FullName -Raw | ConvertFrom-Json
    if ([string]$LiveCommand.commandId -eq $CommandId -and [string]$LiveCommand.runNonce -eq $RunNonce -and [string]$LiveCommand.phaseSlug -eq $PhaseSlug) { $CommandIdentityOk = $true }
  }
  if (-not $CommandIdentityOk) { throw "Could not prove active Phase200 command identity from queue state or command inbox." }

  $ZipPath = Join-Path $DownloadsDir $ExpectedZipFilename
  if (!(Test-Path -LiteralPath $ZipPath)) { throw "Exact expected Phase200 ZIP is missing from downloads: $ZipPath" }
  $ZipHash = Get-Sha256Hex $ZipPath

  $LatestLog = Get-ChildItem $LogDir -File -Filter "*.log" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
  if (!$LatestLog) { throw "Latest watcher log unavailable; cannot prove browser-submitted Phase200 autopilot." }
  $LogText = Get-Content -LiteralPath $LatestLog.FullName -Raw -ErrorAction SilentlyContinue
  $MissingMarkers = @()
  foreach ($Marker in @("COMMAND_JSON_FOUND phase=200","REQUEST_READY phase=200","PROMPT_INPUT_COMPAT_MODE","PROMPT_SUBMIT_RESULT","ARTIFACT_DOWNLOAD_V6_CLICK_RESULT","ARTIFACT_DOWNLOAD_V6_DOWNLOADED","ARTIFACT_DOWNLOAD_V6_PROOF_PASS","ZIP_READY","RUN_DIRECT_ZIP_CLOSEOUT phase=200")) {
    if ($LogText -notmatch [regex]::Escape($Marker)) { $MissingMarkers += $Marker }
  }
  if ($MissingMarkers.Count -gt 0) { throw "Phase200 latest log missing required autopilot markers: $($MissingMarkers -join ', ')" }
  if ($LogText -match "phase200.*repair|repair.*phase200|PHASE200_.*REPAIR") { throw "Phase200 log indicates a repair marker; this repeatability proof requires no mid-run repair." }

  & powershell -NoProfile -ExecutionPolicy Bypass -File $Fixture -RepoRoot $RepoRoot -AutoOpsRoot $AutoOpsRoot
  if ($LASTEXITCODE -ne 0) { throw "Phase200 fixture proof failed." }
  & powershell -NoProfile -ExecutionPolicy Bypass -File $PointerProof -RepoRoot $RepoRoot -AutoOpsRoot $AutoOpsRoot
  if ($LASTEXITCODE -ne 0) { throw "Phase200 pointer clean-repo proof failed." }
  & powershell -NoProfile -ExecutionPolicy Bypass -File $Repeatability -ConfirmedPromptSubmit:$true -ExactDomDownload:$true -Verified:$true -Qa:$true -Merged:$true -PushMain:$true -PushTag:$true -RemoteMain:$true -RemoteTag:$true -HandoffIdentity:$true -ZipSha:$true -PostCloseoutCleanRepo:$true -NoMidRunRepair:$true
  if ($LASTEXITCODE -ne 0) { throw "Phase200 repeatability gate contract failed." }

  $FinalStatus = @(Invoke-Git status --short --untracked-files=all)
  if ($FinalStatus.Count -gt 0) { throw "Repo dirty after Phase200 verifier proofs: $($FinalStatus -join '; ')" }

  $Proof = @"
VERIFY_PASS phase=200
RepoRoot=$RepoRoot
AutoOpsRoot=$AutoOpsRoot
ExpectedZipFilename=$ExpectedZipFilename
ZipPath=$ZipPath
ZipSha256=$ZipHash
CommandId=$CommandId
RunNonce=$RunNonce
Phase199Tag=$Phase199Tag
Phase199Commit=$Phase199Commit
Phase199ArtifactSha256=$Phase199ArtifactSha
PromptTextCompatibilityRepairCommit=$PromptTextCompatCommit
LatestWatcherLog=$($LatestLog.FullName)
RuntimeMarkers=PASS
ManifestHashes=PASS
ActiveCommandIdentity=PASS
BrowserSubmitMarkers=PASS
Phase199RemoteTagTruth=PASS
NoMidRunRepairProof=PASS
CleanBaselineState=PASS
"@
  $Out = Write-Phase200Handoff "VERIFY_PASS" "All Phase200 verifier gates passed." $Proof
  Write-Host "VERIFY_PASS phase=200 zip=$ZipPath sha256=$ZipHash handoff=$Out"
  exit 0
} catch {
  $Reason = $_.Exception.Message
  $Out = Write-Phase200Handoff "BLOCKED" $Reason "VERIFY_BLOCKED phase=200"
  Write-Host "BLOCKED phase=200 reason=$Reason handoff=$Out"
  exit 1
}

