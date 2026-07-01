
param(
  [string]$RepoRoot = (Get-Location).Path
)

$ErrorActionPreference = "Stop"

$PhaseSlug = "autoops_r146_phone_command_intake_handoff_stale_running_guard_v1"
$Required = @(
  ".overlay\autoops_r146_phone_command_intake_handoff_stale_running_guard_v1.json",
  ".sera-proof\autoops_r146_phone_command_intake_handoff_stale_running_guard_v1.json",
  "docs\autoops-r146-phone-command-intake-handoff-stale-running-guard-v1.md",
  "scripts\autoops-r146-phone-command-intake-handoff-stale-running-guard-v1.ps1",
  "scripts\verify-autoops-r146-phone-command-intake-handoff-stale-running-guard-v1.ps1",
  "tests\integration\autoops-r146-phone-command-intake-handoff-stale-running-guard-v1.test.ts"
)

$Issues = New-Object System.Collections.Generic.List[string]

foreach ($Rel in $Required) {
  $Path = Join-Path $RepoRoot $Rel
  if (!(Test-Path $Path)) {
    $Issues.Add("Missing required file: $Rel")
  }
}

$Script = Join-Path $RepoRoot "scripts\autoops-r146-phone-command-intake-handoff-stale-running-guard-v1.ps1"
if (Test-Path $Script) {
  $Text = Get-Content $Script -Raw
  foreach ($Needle in @(
    "Test-StableFile",
    "staleRunning",
    "SERA Phone Control Watcher",
    "PHONE_CONTROL_WATCHER_NEEDS_ATTENTION-R146",
    "allowRandomRecentChatFallback = `$false",
    "allowNewChatFallback = `$false",
    "original-SERA_Phone_Control_Watcher-action.json"
  )) {
    if ($Text -notlike "*$Needle*") {
      $Issues.Add("Runtime script missing expected guard text: $Needle")
    }
  }
}

if ($Issues.Count -gt 0) {
  [pscustomobject]@{
    ok = $false
    phase = "AutoOps R146"
    phaseSlug = $PhaseSlug
    issues = $Issues
  } | ConvertTo-Json -Depth 10
  exit 1
}

[pscustomobject]@{
  ok = $true
  phase = "AutoOps R146"
  phaseSlug = $PhaseSlug
  repoRoot = $RepoRoot
  checkedFiles = $Required
  issues = @()
} | ConvertTo-Json -Depth 10
