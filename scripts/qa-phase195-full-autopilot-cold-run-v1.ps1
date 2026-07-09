param(
  [string]$RepoRoot = (Get-Location).Path,
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps",
  [string]$PhaseSlug = "phase195_full_autopilot_cold_run_v1",
  [string]$ExpectedZipFilename = "s.e.r.a_phase195_full_autopilot_cold_run_v1_overlay.zip"
)

$ErrorActionPreference = "Stop"
$PhaseName = "s.e.r.a_${PhaseSlug}_overlay"
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$HandoffDir = Join-Path $AutoOpsRoot "06_handoff"
$DownloadsDir = Join-Path $AutoOpsRoot "13_chatgpt_downloads"
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
  $Lines += "Gate result: QA completed with status $SafeStatus. Merge/tag/push/cleanup may continue only after PASS_GUARANTEED."
  Set-Content -LiteralPath $Path -Value ($Lines -join "`r`n") -Encoding UTF8
  Write-Host "PHASE195_QA_HANDOFF_WRITTEN=$Path"
  return $Path
}

function Get-Sha256Hex {
  param([Parameter(Mandatory=$true)][string]$Path)
  return (Get-FileHash -Algorithm SHA256 -LiteralPath $Path).Hash.ToLowerInvariant()
}

try {
  Set-Location $RepoRoot

  $VerifyHandoff = Get-ChildItem $HandoffDir -File -Filter "*phase195*VERIFY_PASS*.md" -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1
  if (!$VerifyHandoff) {
    throw "QA requires a fresh Phase195 VERIFY_PASS handoff before PASS_GUARANTEED."
  }

  $ZipPath = Join-Path $DownloadsDir $ExpectedZipFilename
  if (!(Test-Path -LiteralPath $ZipPath)) {
    throw "QA could not find exact expected Phase195 ZIP: $ZipPath"
  }
  $ZipHash = Get-Sha256Hex -Path $ZipPath

  $RequiredFiles = @(
    ".overlay\manifest.json",
    ".sera-proof\phase195_full_autopilot_cold_run_v1_overlay_proof.json",
    "commands\phase195-full-autopilot-cold-run-v1.command.json",
    "scripts\verify-phase195-full-autopilot-cold-run-v1.ps1",
    "scripts\qa-phase195-full-autopilot-cold-run-v1.ps1"
  )
  $Missing = @()
  foreach ($Rel in $RequiredFiles) {
    if (!(Test-Path -LiteralPath (Join-Path $RepoRoot $Rel))) { $Missing += $Rel }
  }
  if ($Missing.Count -gt 0) { throw "QA missing required files: $($Missing -join ', ')" }

  $Manifest = Get-Content -LiteralPath (Join-Path $RepoRoot ".overlay\manifest.json") -Raw | ConvertFrom-Json
  if ($Manifest.phaseSlug -ne $PhaseSlug) { throw "QA manifest phaseSlug mismatch: $($Manifest.phaseSlug)" }
  if ($Manifest.expectedZipFilename -ne $ExpectedZipFilename) { throw "QA expected ZIP mismatch: $($Manifest.expectedZipFilename)" }

  $ProofLines = @(
    "PASS_GUARANTEED phase=195",
    "verify handoff: $($VerifyHandoff.FullName)",
    "expected zip: $ZipPath",
    "sha256: $ZipHash",
    "manifest phaseSlug and expected ZIP validated",
    "verifier and QA scripts present"
  )

  $HandoffPath = Write-Phase195Handoff -Status "PASS_GUARANTEED" -Reason "Phase195 QA passed after VERIFY_PASS." -ProofLines $ProofLines
  Write-Host "PASS_GUARANTEED phase=195 zip=$ZipPath sha256=$ZipHash handoff=$HandoffPath"
  exit 0
} catch {
  $Reason = $_.Exception.Message
  $HandoffPath = Write-Phase195Handoff -Status "BLOCKED" -Reason $Reason -ProofLines @(
    "QA_BLOCKED phase=195",
    "RepoRoot=$RepoRoot",
    "AutoOpsRoot=$AutoOpsRoot",
    "ExpectedZipFilename=$ExpectedZipFilename"
  )
  Write-Host "BLOCKED phase=195 reason=$Reason handoff=$HandoffPath"
  exit 1
}
