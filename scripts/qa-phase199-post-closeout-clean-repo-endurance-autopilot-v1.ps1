[CmdletBinding()]
param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps"
)

$ErrorActionPreference = "Stop"

$Phase = "199"
$PhaseSlug = "phase199_post_closeout_clean_repo_endurance_autopilot_v1"
$ExpectedZipFilename = "s.e.r.a_phase199_post_closeout_clean_repo_endurance_autopilot_v1_overlay.zip"
$HandoffDir = Join-Path $AutoOpsRoot "06_handoff"
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

function Write-Phase199Handoff {
  param(
    [string]$Status,
    [string]$Reason,
    [string]$Proof
  )

  $Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
  $Out = Join-Path $HandoffDir "s.e.r.a_phase199_post_closeout_clean_repo_endurance_autopilot_v1_overlay-$Stamp-$Status.md"

  @"
Status: $Status
Phase: s.e.r.a_phase199_post_closeout_clean_repo_endurance_autopilot_v1_overlay
Branch: $(Invoke-Git branch --show-current)
Timestamp: $Stamp

Reason:
$Reason

Proof:
$Proof
"@ | Set-Content -LiteralPath $Out -Encoding UTF8

  return $Out
}

function Assert-File {
  param([string]$Path)

  if (!(Test-Path -LiteralPath $Path)) {
    throw "Missing required file: $Path"
  }
}

function Assert-ContainsText {
  param(
    [string]$Path,
    [string]$Needle,
    [string]$Label
  )

  Assert-File $Path
  $Text = Get-Content -LiteralPath $Path -Raw

  if ($Text -notlike "*$Needle*") {
    throw "$Label missing QA marker: $Needle"
  }
}

try {
  $ZipPath = Join-Path $AutoOpsRoot "13_chatgpt_downloads\$ExpectedZipFilename"
  Assert-File $ZipPath

  $ZipSha = (Get-FileHash -LiteralPath $ZipPath -Algorithm SHA256).Hash.ToLowerInvariant()

  $Bridge = Join-Path $RepoRoot "scripts\sera-chatgpt-browser-bridge-v1.ps1"
  foreach ($Needle in @(
    "PROMPT_INPUT_COMPAT_MODE",
    "Input.insertText",
    "PROMPT_FOCUS_RESULT",
    "PROMPT_INSERT_VERIFY_RESULT",
    "PROMPT_SEND_BUTTON_RESULT",
    "PROMPT_SUBMIT_CONFIRM_ATTEMPT",
    "prompt_submitted_by_native_cdp_verified",
    "prompt_submitted_by_native_enter_verified"
  )) {
    Assert-ContainsText -Path $Bridge -Needle $Needle -Label "Bridge"
  }

  $CompatCommit = "2404acb035e061857856f664eba4a4c76254020b"
  Invoke-Git merge-base --is-ancestor $CompatCommit HEAD | Out-Null
  if ($LASTEXITCODE -ne 0) {
    throw "PromptText compatibility repair commit is not in HEAD ancestry: $CompatCommit"
  }

  $Fixture = Join-Path $RepoRoot "scripts\phase199-post-closeout-clean-repo-endurance-autopilot-fixtures-v1.ps1"
  Assert-File $Fixture
  & powershell -NoProfile -ExecutionPolicy Bypass -File $Fixture
  if ($LASTEXITCODE -ne 0) {
    throw "Phase199 fixture proof failed during QA."
  }

  $PointerProof = Join-Path $RepoRoot "scripts\sera-phase199-current-phase-pointer-clean-repo-proof-v1.ps1"
  Assert-File $PointerProof
  & powershell -NoProfile -ExecutionPolicy Bypass -File $PointerProof -RepoRoot $RepoRoot -AutoOpsRoot $AutoOpsRoot
  if ($LASTEXITCODE -ne 0) {
    throw "Clean repo proof failed during QA."
  }

  $VerifyPass = Get-ChildItem $HandoffDir -File -Filter "*phase199*VERIFY_PASS.md" -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

  if (!$VerifyPass) {
    throw "No Phase199 VERIFY_PASS handoff found before QA PASS."
  }

  $RepoStatus = @(Invoke-Git status --short --untracked-files=all)
  if ($RepoStatus.Count -gt 0) {
    throw "Repo dirty after QA proof: $($RepoStatus -join '; ')"
  }

  $Proof = @"
QA_PASS_GUARANTEED phase=199
ZipPath=$ZipPath
ZipSha256=$ZipSha
VerifierHandoff=$($VerifyPass.FullName)
PromptTextCompatCommit=$CompatCommit
NativeSubmitMarkers=PASS
FixtureProof=PASS
PointerCleanRepoProof=PASS
RepoStatus=clean
"@

  $Out = Write-Phase199Handoff -Status "PASS_GUARANTEED" -Reason "All Phase199 QA gates passed." -Proof $Proof
  Write-Host "PASS_GUARANTEED phase=199 zip=$ZipPath sha256=$ZipSha handoff=$Out"
  exit 0
} catch {
  $Reason = $_.Exception.Message
  $Out = Write-Phase199Handoff -Status "BLOCKED" -Reason $Reason -Proof "QA_BLOCKED phase=199"
  Write-Host "BLOCKED phase=199 reason=$Reason handoff=$Out"
  exit 1
}
