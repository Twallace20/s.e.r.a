param(
  [string]$RepoRoot = (Get-Location).Path,
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps",
  [string]$PhaseSlug = "phase195_full_autopilot_cold_run_v1",
  [string]$ExpectedZipFilename = "s.e.r.a_phase195_full_autopilot_cold_run_v1_overlay.zip"
)

$ErrorActionPreference = "Stop"
$PhaseName = "s.e.r.a_${PhaseSlug}_overlay"
$PhaseNumber = 195
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$HandoffDir = Join-Path $AutoOpsRoot "06_handoff"
$DownloadsDir = Join-Path $AutoOpsRoot "13_chatgpt_downloads"
$LogDir = Join-Path $AutoOpsRoot "00_control_center\logs"
New-Item -ItemType Directory -Force $HandoffDir | Out-Null

function Write-Phase195Handoff {
  param(
    [Parameter(Mandatory=$true)][string]$Status,
    [Parameter(Mandatory=$true)][string]$Reason,
    [string[]]$ProofLines = @()
  )

  $SafeStatus = $Status.ToUpperInvariant()
  $Path = Join-Path $HandoffDir ("{0}-{1}-{2}.md" -f $PhaseName, $Timestamp, $SafeStatus)
  $Lines = @(
    "Status: $SafeStatus",
    "Phase: $PhaseName",
    "Branch: work/phase195-full-autopilot-cold-run-v1",
    "Timestamp: $Timestamp",
    "Reason: $Reason",
    ""
  )
  if ($ProofLines.Count -gt 0) {
    $Lines += "Proof:"
    foreach ($Line in $ProofLines) { $Lines += "- $Line" }
    $Lines += ""
  }
  $Lines += "Gate result: Verifier completed with status $SafeStatus. QA/merge/closeout may continue only after VERIFY_PASS."
  Set-Content -LiteralPath $Path -Value ($Lines -join "`r`n") -Encoding UTF8
  Write-Host "PHASE195_HANDOFF_WRITTEN=$Path"
  return $Path
}

function Get-Sha256Hex {
  param([Parameter(Mandatory=$true)][string]$Path)
  return (Get-FileHash -Algorithm SHA256 -LiteralPath $Path).Hash.ToLowerInvariant()
}

try {
  Set-Location $RepoRoot

  $RequiredFiles = @(
    ".overlay\manifest.json",
    ".sera-proof\phase195_full_autopilot_cold_run_v1_overlay_proof.json",
    "commands\phase195-full-autopilot-cold-run-v1.command.json",
    "docs\phases\PHASE_195_FULL_AUTOPILOT_COLD_RUN_V1.md",
    "src\chatgpt\phase195FullAutopilotColdRun.ts",
    "scripts\phase195-full-autopilot-cold-run.ts",
    "scripts\phase195-verify-overlay.mjs",
    "scripts\verify-phase195-full-autopilot-cold-run-v1.ps1",
    "scripts\qa-phase195-full-autopilot-cold-run-v1.ps1",
    "tests\phase195-full-autopilot-cold-run.contract.test.ts"
  )

  $Missing = @()
  foreach ($Rel in $RequiredFiles) {
    if (!(Test-Path -LiteralPath (Join-Path $RepoRoot $Rel))) { $Missing += $Rel }
  }
  if ($Missing.Count -gt 0) {
    throw "Missing required Phase195 overlay files: $($Missing -join ', ')"
  }

  $ManifestPath = Join-Path $RepoRoot ".overlay\manifest.json"
  $ProofPath = Join-Path $RepoRoot ".sera-proof\phase195_full_autopilot_cold_run_v1_overlay_proof.json"
  $CommandPath = Join-Path $RepoRoot "commands\phase195-full-autopilot-cold-run-v1.command.json"

  $Manifest = Get-Content -LiteralPath $ManifestPath -Raw | ConvertFrom-Json
  $Proof = Get-Content -LiteralPath $ProofPath -Raw | ConvertFrom-Json
  $Command = Get-Content -LiteralPath $CommandPath -Raw | ConvertFrom-Json

  if ($Manifest.phaseSlug -ne $PhaseSlug) { throw "Manifest phaseSlug mismatch: $($Manifest.phaseSlug)" }
  if ($Manifest.expectedZipFilename -ne $ExpectedZipFilename) { throw "Manifest expectedZipFilename mismatch: $($Manifest.expectedZipFilename)" }
  if ($Proof.commandContract.commandId -ne "phase195-full-autopilot-cold-run-v1-fresh-url-20260709065602") { throw "Proof commandId mismatch: $($Proof.commandContract.commandId)" }
  if ($Proof.commandContract.runNonce -ne "phase195-fresh-url-cold-run-20260709065602") { throw "Proof runNonce mismatch: $($Proof.commandContract.runNonce)" }
  if ($Proof.commandContract.expectedZipFilename -ne $ExpectedZipFilename) { throw "Proof expectedZipFilename mismatch: $($Proof.commandContract.expectedZipFilename)" }

  if ($Command.commandId -ne "phase195-full-autopilot-cold-run-v1-fresh-url-20260709065602") { throw "Command commandId mismatch: $($Command.commandId)" }
  if ($Command.runNonce -ne "phase195-fresh-url-cold-run-20260709065602") { throw "Command runNonce mismatch: $($Command.runNonce)" }
  if ($Command.phaseSlug -ne $PhaseSlug) { throw "Command phaseSlug mismatch: $($Command.phaseSlug)" }
  if ($Command.expectedZipFilename -ne $ExpectedZipFilename) { throw "Command expectedZipFilename mismatch: $($Command.expectedZipFilename)" }
  if ($Command.savedChatGptTargetOnly -ne $true) { throw "savedChatGptTargetOnly must be true" }
  if ($Command.allowRandomRecentChatFallback -ne $false) { throw "allowRandomRecentChatFallback must be false" }
  if ($Command.allowNewChatFallback -ne $false) { throw "allowNewChatFallback must be false" }

  $BadHashes = @()
  foreach ($Entry in @($Manifest.files)) {
    $Rel = ([string]$Entry.path) -replace '^repo/', ''
    $Abs = Join-Path $RepoRoot $Rel
    if (!(Test-Path -LiteralPath $Abs)) {
      $BadHashes += "$($Entry.path): missing"
      continue
    }
    $Actual = Get-Sha256Hex -Path $Abs
    if ($Entry.sha256 -and $Actual -ne ([string]$Entry.sha256).ToLowerInvariant()) {
      $BadHashes += "$($Entry.path): expected $($Entry.sha256) actual $Actual"
    }
  }
  if ($BadHashes.Count -gt 0) { throw "Manifest hash validation failed: $($BadHashes -join '; ')" }

  $ZipPath = Join-Path $DownloadsDir $ExpectedZipFilename
  if (!(Test-Path -LiteralPath $ZipPath)) {
    throw "Exact expected Phase195 ZIP is missing from downloads: $ZipPath"
  }
  $ZipHash = Get-Sha256Hex -Path $ZipPath

  $LatestLog = $null
  if (Test-Path -LiteralPath $LogDir) {
    $LatestLog = Get-ChildItem $LogDir -File -Filter "*.log" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
  }

  $LogProof = @()
  if ($LatestLog) {
    $LogText = Get-Content -LiteralPath $LatestLog.FullName -Raw -ErrorAction SilentlyContinue
    $RequiredMarkers = @(
      "COMMAND_JSON_FOUND phase=195",
      "REQUEST_READY phase=195",
      "PROMPT_SUBMIT_RESULT",
      "ZIP_READY",
      "RUN_DIRECT_ZIP_CLOSEOUT phase=195"
    )
    foreach ($Marker in $RequiredMarkers) {
      if ($LogText -match [regex]::Escape($Marker)) {
        $LogProof += "marker present: $Marker"
      } else {
        $LogProof += "marker not observed in latest log: $Marker"
      }
    }
    $LogProof += "latest log: $($LatestLog.FullName)"
  } else {
    $LogProof += "latest log unavailable; overlay/file/hash gates passed"
  }

  $VerifierProof = @(
    "VERIFY_PASS phase=195",
    "expected zip: $ZipPath",
    "sha256: $ZipHash",
    "manifest/proof/command contracts matched Phase195 cold-run requirements",
    "required PowerShell verifier script present"
  ) + $LogProof

  $HandoffPath = Write-Phase195Handoff -Status "VERIFY_PASS" -Reason "Phase195 verifier passed for exact expected ZIP and overlay contract." -ProofLines $VerifierProof
  Write-Host "VERIFY_PASS phase=195 zip=$ZipPath sha256=$ZipHash handoff=$HandoffPath"
  exit 0
} catch {
  $Reason = $_.Exception.Message
  $HandoffPath = Write-Phase195Handoff -Status "BLOCKED" -Reason $Reason -ProofLines @(
    "VERIFY_BLOCKED phase=195",
    "RepoRoot=$RepoRoot",
    "AutoOpsRoot=$AutoOpsRoot",
    "ExpectedZipFilename=$ExpectedZipFilename"
  )
  Write-Host "BLOCKED phase=195 reason=$Reason handoff=$HandoffPath"
  exit 1
}
