param(
  [string]$RepoRoot = (Get-Location).Path,
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps",
  [switch]$Apply
)

$ErrorActionPreference = "Stop"

$Phase = 143
$PhaseSlug = "phase143_phone_batch_autopilot_smoke_test_v1"
$ExpectedFiles = @(
  ".overlay\$PhaseSlug.json",
  ".sera-proof\$PhaseSlug.json",
  "docs\phase143-phone-batch-autopilot-smoke-test-v1.md",
  "scripts\phase143-phone-batch-autopilot-smoke-test-v1.ps1",
  "scripts\verify-phase143-phone-batch-autopilot-smoke-test-v1.ps1"
)

$Missing = @()
foreach ($Relative in $ExpectedFiles) {
  $Path = Join-Path $RepoRoot $Relative
  if (!(Test-Path $Path)) {
    $Missing += $Relative
  }
}

$CommandInbox = Join-Path $AutoOpsRoot "00_control_center\command_inbox"
$ActiveCommands = @()
if (Test-Path $CommandInbox) {
  $ActiveCommands = Get-ChildItem $CommandInbox -File -Filter "*.json" -ErrorAction SilentlyContinue |
    Where-Object {
      try {
        $Json = Get-Content $_.FullName -Raw | ConvertFrom-Json
        ($Json.enabled -eq $true) -and ($Json.commandStatus -in @("new","running","accepted","processing")) -and ($Json.status -notin @("completed","closed","disabled"))
      } catch {
        $false
      }
    }
}

$Result = [ordered]@{
  ok = ($Missing.Count -eq 0)
  phase = $Phase
  phaseSlug = $PhaseSlug
  repoRoot = $RepoRoot
  checkedFiles = $ExpectedFiles
  missing = $Missing
  smokeTestExpectations = [ordered]@{
    oneActiveCommandOnly = $true
    stopOnBlocked = $true
    requireClosedCleanlyBeforeNext = $true
    allowRandomRecentChatFallback = $false
    allowNewChatFallback = $false
    savedChatGptTargetOnly = $true
  }
  activeCommandCountObserved = $ActiveCommands.Count
  activeCommandFilesObserved = @($ActiveCommands | ForEach-Object { $_.FullName })
  applyMode = [bool]$Apply
}

if ($Missing.Count -gt 0) {
  $Result.ok = $false
}

$Result | ConvertTo-Json -Depth 12

if ($Missing.Count -gt 0) {
  exit 1
}

exit 0
