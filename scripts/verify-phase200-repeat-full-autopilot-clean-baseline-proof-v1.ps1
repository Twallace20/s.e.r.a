[CmdletBinding()]
param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps"
)

$ErrorActionPreference = "Stop"

$Phase = "200"
$PhaseSlug = "phase200_repeat_full_autopilot_clean_baseline_proof_v1"
$PhaseName = "s.e.r.a_phase200_repeat_full_autopilot_clean_baseline_proof_v1_overlay"
$ExpectedZip = "s.e.r.a_phase200_repeat_full_autopilot_clean_baseline_proof_v1_overlay.zip"
$ExpectedSha = "13989effaab5331fb0066b69c2e815731a1b6301289457b8819942700776656a"
$Phase199Commit = "51128d59aadb81a11aa0001e58778530295b4454"
$Phase199Tag = "phase-199-post-closeout-clean-repo-endurance-autopilot-v1"
$PromptTextCompatCommit = "2404acb035e061857856f664eba4a4c76254020b"

$HandoffDir = Join-Path $AutoOpsRoot "06_handoff"
$DownloadsDir = Join-Path $AutoOpsRoot "13_chatgpt_downloads"
$LogDir = Join-Path $AutoOpsRoot "00_control_center\logs"
$StateDir = Join-Path $AutoOpsRoot "00_control_center\state"

New-Item -ItemType Directory -Force $HandoffDir | Out-Null

function Invoke-Git {
  param([Parameter(ValueFromRemainingArguments=$true)][string[]]$Args)
  Push-Location $RepoRoot
  try {
    return @(git @Args)
  } finally {
    Pop-Location
  }
}

function Write-PhaseHandoff {
  param(
    [string]$Status,
    [string]$Reason,
    [string]$Proof
  )

  $Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
  $Path = Join-Path $HandoffDir "$PhaseName-$Stamp-$Status.md"
  $Branch = ""
  try { $Branch = (Invoke-Git branch --show-current | Select-Object -First 1).Trim() } catch { $Branch = "unknown" }

  @"
Status: $Status
Phase: $PhaseName
PhaseNumber: $Phase
PhaseSlug: $PhaseSlug
Branch: $Branch
Timestamp: $Stamp

Reason:
$Reason

Proof:
$Proof
"@ | Set-Content -LiteralPath $Path -Encoding UTF8

  return $Path
}

function Fail-Phase {
  param(
    [string]$Reason,
    [string]$Proof
  )
  $Out = Write-PhaseHandoff -Status "BLOCKED" -Reason $Reason -Proof $Proof
  Write-Host "BLOCKED phase=200 reason=$Reason handoff=$Out"
  exit 1
}

function Assert-File {
  param([string]$Path)
  if (!(Test-Path -LiteralPath $Path)) {
    throw "Missing required file: $Path"
  }
}

function Assert-Contains {
  param(
    [string]$Text,
    [string]$Needle,
    [string]$Label
  )
  if ($Text -notlike "*$Needle*") {
    throw "$Label missing required marker: $Needle"
  }
}

function Validate-Manifest {
  $ManifestPath = Join-Path $RepoRoot ".overlay\manifest.json"
  Assert-File $ManifestPath

  $Manifest = Get-Content -LiteralPath $ManifestPath -Raw | ConvertFrom-Json
  foreach ($Entry in @($Manifest.files)) {
    $EntryPath = [string]$Entry.path
    $Rel = $EntryPath -replace '^[Rr][Ee][Pp][Oo][\\/]', ''

    if (($Rel -replace '\\','/') -eq ".overlay/manifest.json") {
      continue
    }

    $Abs = Join-Path $RepoRoot $Rel
    Assert-File $Abs

    if ($Entry.PSObject.Properties.Name -contains "bytes") {
      $ActualBytes = (Get-Item -LiteralPath $Abs).Length
      if ([int64]$Entry.bytes -ne [int64]$ActualBytes) {
        throw "Manifest byte mismatch for $EntryPath expected=$($Entry.bytes) actual=$ActualBytes"
      }
    }

    if ($Entry.PSObject.Properties.Name -contains "sha256" -and $Entry.sha256) {
      $ActualSha = (Get-FileHash -LiteralPath $Abs -Algorithm SHA256).Hash.ToLowerInvariant()
      if ([string]$Entry.sha256 -ne $ActualSha) {
        throw "Manifest hash validation failed for $EntryPath expected=$($Entry.sha256) actual=$ActualSha"
      }
    }
  }
}

try {
  $Branch = (Invoke-Git branch --show-current | Select-Object -First 1).Trim()
  if ($Branch -ne "work/phase200-repeat-full-autopilot-clean-baseline-proof-v1") {
    throw "Wrong branch for Phase200 verifier: $Branch"
  }

  $ZipPath = Join-Path $DownloadsDir $ExpectedZip
  Assert-File $ZipPath
  $ZipSha = (Get-FileHash -LiteralPath $ZipPath -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($ZipSha -ne $ExpectedSha) {
    throw "Exact ZIP SHA mismatch. expected=$ExpectedSha actual=$ZipSha"
  }

  Validate-Manifest

  $ProofPath = Join-Path $RepoRoot ".sera-proof\phase200_repeat_full_autopilot_clean_baseline_proof_v1_overlay_proof.json"
  Assert-File $ProofPath
  $ProofText = Get-Content -LiteralPath $ProofPath -Raw
  Assert-Contains $ProofText $PhaseSlug ".sera-proof"
  Assert-Contains $ProofText $ExpectedZip ".sera-proof"

  $CommandPath = Join-Path $RepoRoot "commands\phase200-repeat-full-autopilot-clean-baseline-proof-v1.command.json"
  Assert-File $CommandPath
  $CommandText = Get-Content -LiteralPath $CommandPath -Raw
  Assert-Contains $CommandText "phase200-clean-baseline-repeat-full-autopilot-proof-20260710090000" "Phase200 command"
  Assert-Contains $CommandText $ExpectedZip "Phase200 command"

  $QueuePath = Join-Path $StateDir "autopilot-sequential-phase-queue-v1.json"
  if (Test-Path -LiteralPath $QueuePath) {
    $QueueText = Get-Content -LiteralPath $QueuePath -Raw
    Assert-Contains $QueueText $PhaseSlug "AutoOps queue"
    Assert-Contains $QueueText $ExpectedZip "AutoOps queue"
  }

  git fetch origin main --tags | Out-Null
  $OriginMain = (Invoke-Git rev-parse origin/main | Select-Object -First 1).Trim()
  $LocalPhase199Tag = (Invoke-Git rev-parse "$Phase199Tag^{commit}" | Select-Object -First 1).Trim()

  if ($OriginMain -ne $Phase199Commit) {
    throw "Phase199 remote main truth failed. origin/main=$OriginMain expected=$Phase199Commit"
  }
  if ($LocalPhase199Tag -ne $Phase199Commit) {
    throw "Phase199 local tag truth failed. tag=$LocalPhase199Tag expected=$Phase199Commit"
  }

  Invoke-Git merge-base --is-ancestor $PromptTextCompatCommit HEAD | Out-Null
  if ($LASTEXITCODE -ne 0) {
    throw "PromptText compatibility commit missing from Phase200 ancestry: $PromptTextCompatCommit"
  }

  $Bridge = Join-Path $RepoRoot "scripts\sera-chatgpt-browser-bridge-v1.ps1"
  Assert-File $Bridge
  $BridgeText = Get-Content -LiteralPath $Bridge -Raw
  foreach ($Needle in @(
    "PROMPT_INPUT_COMPAT_MODE",
    "Input.insertText",
    "PROMPT_FOCUS_RESULT",
    "PROMPT_INSERT_VERIFY_RESULT",
    "PROMPT_SEND_BUTTON_RESULT",
    "PROMPT_SUBMIT_CONFIRM_ATTEMPT",
    "prompt_submitted_by_native"
  )) {
    Assert-Contains $BridgeText $Needle "Bridge"
  }

  $RecentLogs = @(Get-ChildItem $LogDir -File -Filter "*.log" -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 10)

  $LogText = ""
  foreach ($Log in $RecentLogs) {
    $LogText += "`n--- LOG: $($Log.FullName) ---`n"
    $LogText += Get-Content -LiteralPath $Log.FullName -Raw
  }

  foreach ($Needle in @(
    "PROMPT_SUBMIT_RESULT",
    "ARTIFACT_DOWNLOAD_V6_CLICK_RESULT",
    "ARTIFACT_DOWNLOAD_V6_DOWNLOADED",
    "ARTIFACT_DOWNLOAD_V6_PROOF_PASS",
    "ZIP_READY",
    "RUN_DIRECT_ZIP_CLOSEOUT phase=200"
  )) {
    Assert-Contains $LogText $Needle "Phase200 logs"
  }

  Assert-Contains $LogText $ExpectedZip "Phase200 logs"

  $Fixture = Join-Path $RepoRoot "scripts\phase200-repeat-full-autopilot-clean-baseline-proof-fixtures-v1.ps1"
  Assert-File $Fixture
  $FixtureOut = & powershell -NoProfile -ExecutionPolicy Bypass `
    -File $Fixture `
    -RepoRoot $RepoRoot `
    -AutoOpsRoot $AutoOpsRoot 2>&1
  $FixtureText = ($FixtureOut | Out-String)
  if ($LASTEXITCODE -ne 0) {
    throw "Phase200 fixture proof failed.`nPHASE200_FIXTURE_STDOUT_BEGIN`n$FixtureText`nPHASE200_FIXTURE_STDOUT_END"
  }

  $PointerProof = Join-Path $RepoRoot "scripts\sera-phase200-current-phase-pointer-clean-repo-proof-v1.ps1"
  Assert-File $PointerProof
  $PointerOut = & powershell -NoProfile -ExecutionPolicy Bypass -File $PointerProof -RepoRoot $RepoRoot -AutoOpsRoot $AutoOpsRoot 2>&1
  $PointerText = ($PointerOut | Out-String)
  if ($LASTEXITCODE -ne 0) {
    throw "Phase200 pointer clean-repo proof failed.`nPHASE200_POINTER_STDOUT_BEGIN`n$PointerText`nPHASE200_POINTER_STDOUT_END"
  }

  $Repeatability = Join-Path $RepoRoot "scripts\sera-phase200-repeatability-proof-v1.ps1"
  Assert-File $Repeatability
  $RepeatabilityOut = & powershell -NoProfile -ExecutionPolicy Bypass `
    -File $Repeatability `
    -RepoRoot $RepoRoot `
    -AutoOpsRoot $AutoOpsRoot `
    -ConfirmedPromptSubmit "true" `
    -ExactDomDownload "true" `
    -ExactDomArtifactClick "true" `
    -ExactZipDownloaded "true" `
    -ExactZipShaVerified "true" `
    -ZipShaVerified "true" `
    -VerifierGateReady "true" `
    -CleanBaselineVerified "true" `
    -Phase199RemoteTruthVerified "true" `
    -PromptTextCompatVerified "true" 2>&1

  $RepeatabilityText = ($RepeatabilityOut | Out-String)
  if ($LASTEXITCODE -ne 0) {
    throw "Phase200 repeatability gate contract failed.`nPHASE200_REPEATABILITY_STDOUT_BEGIN`n$RepeatabilityText`nPHASE200_REPEATABILITY_STDOUT_END"
  }

  $RepoStatus = @(Invoke-Git status --short --untracked-files=all)
  if ($RepoStatus.Count -gt 0) {
    throw "Repo dirty after Phase200 verifier: $($RepoStatus -join '; ')"
  }

  $Head = (Invoke-Git rev-parse HEAD | Select-Object -First 1).Trim()

  $Proof = @"
VERIFY_PASS phase=200
ZipPath=$ZipPath
ZipSha256=$ZipSha
Head=$Head
OriginMain=$OriginMain
Phase199TagCommit=$LocalPhase199Tag
PromptTextCompatCommit=$PromptTextCompatCommit
FixtureProof=PASS
PointerCleanRepoProof=PASS
RepeatabilityProof=PASS

RepeatabilityOutput:
$RepeatabilityText

ImportantQualification:
Phase200 verifier passed only after repair. Phase200 is not the clean no-rescue certification. Phase201 must prove no-rescue repeatability.
"@

  $Out = Write-PhaseHandoff -Status "VERIFY_PASS" -Reason "All Phase200 verifier gates passed after repair." -Proof $Proof
  Write-Host "VERIFY_PASS phase=200 zip=$ZipPath sha256=$ZipSha handoff=$Out"
  exit 0

} catch {
  $Err = $_
  $Reason = $Err.Exception.Message

  $FullErrorRecord = ($Err | Format-List * -Force | Out-String)
  $Invocation = ""
  $Position = ""
  $ScriptStack = ""

  try { $Invocation = ($Err.InvocationInfo | Format-List * -Force | Out-String) } catch {}
  try { $Position = [string]$Err.InvocationInfo.PositionMessage } catch {}
  try { $ScriptStack = [string]$Err.ScriptStackTrace } catch {}

  if ([string]::IsNullOrWhiteSpace($Reason)) {
    $Reason = "Phase200 verifier failed with empty exception message. See Proof full error record."
  }

  $Proof = @"
VERIFY_BLOCKED phase=200

InnerFailure:
$Reason

FullErrorRecord:
$FullErrorRecord

InvocationInfo:
$Invocation

PositionMessage:
$Position

ScriptStackTrace:
$ScriptStack

DiagnosticContract:
Blocked handoffs must include inner failing subcommand output, full error record, invocation info, position message, and script stack trace.
"@
  Fail-Phase -Reason $Reason -Proof $Proof
}


