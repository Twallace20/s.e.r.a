
[CmdletBinding()]
param([string]$RepoRoot = (Get-Location).Path)
$ErrorActionPreference = "Stop"
$files = @(
  ".overlay\autoops_r148_command_source_immutability_stale_handoff_filter_v1.json",
  ".sera-proof\autoops_r148_command_source_immutability_stale_handoff_filter_v1.json",
  "docs\autoops-r148-command-source-immutability-stale-handoff-filter-v1.md",
  "scripts\autoops-r148-command-source-immutability-stale-handoff-filter-v1.ps1",
  "scripts\verify-autoops-r148-command-source-immutability-stale-handoff-filter-v1.ps1",
  "tests\integration\autoops-r148-command-source-immutability-stale-handoff-filter-v1.test.ts"
)
$issues = @()
foreach ($f in $files) { if (!(Test-Path (Join-Path $RepoRoot $f))) { $issues += "Missing $f" } }
$script = Join-Path $RepoRoot "scripts\autoops-r148-command-source-immutability-stale-handoff-filter-v1.ps1"
if (Test-Path $script) {
  $content = Get-Content $script -Raw
  foreach ($token in @("Protect-CommandInbox", "Clear-StaleLastResult", "SERA Phone Control Watcher", "r148-quarantined-command-results")) {
    if ($content -notmatch [regex]::Escape($token)) { $issues += "Missing token $token" }
  }
}
$result = [ordered]@{ ok = ($issues.Count -eq 0); phase = "AutoOps R148"; phaseSlug = "autoops_r148_command_source_immutability_stale_handoff_filter_v1"; repoRoot = $RepoRoot; checkedFiles = $files; issues = $issues }
$result | ConvertTo-Json -Depth 8
if ($issues.Count -gt 0) { exit 1 }
